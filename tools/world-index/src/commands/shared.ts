import Database from "better-sqlite3";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import type { Root } from "mdast";

import { enumerate, MANDATORY_WORLD_FILES } from "../enumerate";
import { sha256Hex } from "../hash/content";
import { insertEdges, resolveUnresolvedEdges } from "../index/edges";
import { rebuildFtsIndex, shouldRebuildFts } from "../index/fts";
import {
  deleteNodesByFile,
  insertAnchorChecksums,
  insertEntityMentions,
  insertNodes,
  insertValidationResults
} from "../index/nodes";
import { getFileVersion, listIndexedFiles, removeFileVersion, upsertFileVersion } from "../index/file-versions";
import {
  databasePathForWorld,
  hasIndex,
  openIndex,
  openExistingIndex,
  SchemaVersionMismatchError
} from "../index/open";
import { parseMarkdown } from "../parse/markdown";
import { extractEntities, loadOntologyRegistry } from "../parse/entities";
import { extractProseNodes } from "../parse/prose";
import { extractSemanticEdges } from "../parse/semantic";
import { extractYamlNodes } from "../parse/yaml";
import type { AnchorChecksumRow, EdgeRow, NodeRow, ValidationResultRow } from "../schema/types";

const PROSE_NODE_TYPES = new Set([
  "mystery_reserve_entry",
  "open_question_entry",
  "adjudication_record",
  "invariant",
  "ontology_category",
  "section",
  "subsection",
  "bullet_cluster",
  "character_record",
  "diegetic_artifact_record",
  "proposal_card",
  "proposal_batch",
  "character_proposal_card",
  "character_proposal_batch",
  "retcon_proposal_card",
  "audit_record"
]);

export interface ParsedFileResult {
  relativeFilePath: string;
  contentHash: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
  validationResults: ValidationResultRow[];
  yamlBlockCount: number;
  yamlFailureCount: number;
  tree: Root;
}

export interface BuildLikeResult {
  exitCode: number;
  changedNodeCount: number;
  totalNodeCount: number;
}

export function resolveWorldDirectory(worldRoot: string, worldSlug: string): string {
  return path.resolve(worldRoot, "worlds", worldSlug);
}

export function worldExists(worldRoot: string, worldSlug: string): boolean {
  return existsSync(resolveWorldDirectory(worldRoot, worldSlug));
}

export function parseWorldFile(
  worldRoot: string,
  worldSlug: string,
  relativeFilePath: string
): ParsedFileResult {
  const absolutePath = path.join(resolveWorldDirectory(worldRoot, worldSlug), relativeFilePath);
  const source = readFileSync(absolutePath, "utf8");
  const { tree, lines } = parseMarkdown(source);
  const { nodes: rawYamlNodes, parseIssues: rawYamlIssues } = extractYamlNodes(
    tree,
    lines,
    relativeFilePath
  );
  const proseNodes = extractProseNodes(tree, lines, relativeFilePath, worldSlug);
  const yamlNodes = rawYamlNodes.map((node) => ({
    ...node,
    world_slug: worldSlug,
    file_path: relativeFilePath
  }));
  const yamlIssues = rawYamlIssues.map((issue) => ({
    ...issue,
    world_slug: worldSlug,
    file_path: relativeFilePath
  }));
  const { edges, parseIssues: semanticIssues } = extractSemanticEdges(
    tree,
    lines,
    relativeFilePath,
    worldSlug,
    yamlNodes,
    proseNodes
  );
  const normalizedSemanticIssues = semanticIssues.map((issue) => ({
    ...issue,
    world_slug: worldSlug,
    file_path: relativeFilePath
  }));

  return {
    relativeFilePath,
    contentHash: sha256Hex(source),
    nodes: [...yamlNodes, ...proseNodes],
    edges,
    validationResults: [...yamlIssues, ...normalizedSemanticIssues],
    yamlBlockCount: yamlNodes.length,
    yamlFailureCount: yamlIssues.filter((issue) => issue.code === "yaml_syntax_error").length,
    tree
  };
}

export function finalizeEntityState(db: Database.Database, worldRoot: string, worldSlug: string): void {
  const proseNodes = loadPersistedProseNodes(db, worldSlug);
  const ontologyPath = path.join(resolveWorldDirectory(worldRoot, worldSlug), "ONTOLOGY.md");
  const registry = loadOntologyRegistry(ontologyPath);
  const { entityNodes, mentions, edges } = extractEntities(
    { type: "root", children: [] },
    proseNodes,
    registry
  );

  clearEntityState(db);

  if (entityNodes.length > 0) {
    insertNodes(db, entityNodes);
    insertAnchorChecksums(
      db,
      entityNodes.map((node) => ({
        node_id: node.node_id,
        anchor_form: node.body,
        checksum: node.anchor_checksum
      }))
    );
  }

  if (mentions.length > 0) {
    insertEntityMentions(db, mentions);
  }

  if (edges.length > 0) {
    insertEdges(db, edges);
  }
}

export function insertParsedFile(db: Database.Database, worldSlug: string, parsed: ParsedFileResult): void {
  deleteNodesByFile(db, worldSlug, parsed.relativeFilePath);
  db.prepare("DELETE FROM validation_results WHERE world_slug = ? AND file_path = ?").run(
    worldSlug,
    parsed.relativeFilePath
  );

  if (parsed.nodes.length > 0) {
    insertNodes(db, parsed.nodes);
    insertAnchorChecksums(db, buildAnchorRows(parsed.nodes));
  }

  if (parsed.edges.length > 0) {
    insertEdges(db, parsed.edges);
  }

  if (parsed.validationResults.length > 0) {
    insertValidationResults(db, parsed.validationResults);
  }
}

export function openExistingWorldIndex(
  worldRoot: string,
  worldSlug: string
): Database.Database | SchemaVersionMismatchError {
  try {
    return openExistingIndex(worldRoot, worldSlug);
  } catch (error) {
    if (error instanceof SchemaVersionMismatchError) {
      return error;
    }
    throw error;
  }
}

export function buildWorldIndex(worldRoot: string, worldSlug: string): BuildLikeResult {
  if (!worldExists(worldRoot, worldSlug)) {
    console.error(`Unknown world slug '${worldSlug}'.`);
    return { exitCode: 2, changedNodeCount: 0, totalNodeCount: 0 };
  }

  const dbPath = databasePathForWorld(worldRoot, worldSlug);
  if (existsSync(dbPath)) {
    deleteFile(dbPath);
  }

  const db = openIndex(worldRoot, worldSlug);

  try {
    const missingMandatory = findMissingMandatoryFiles(resolveWorldDirectory(worldRoot, worldSlug));
    if (missingMandatory.length > 0) {
      console.error(`Missing mandatory world file '${missingMandatory[0]}'.`);
      return { exitCode: 3, changedNodeCount: 0, totalNodeCount: 0 };
    }
    return reindexAllFiles(db, worldRoot, worldSlug, true);
  } finally {
    db.close();
  }
}

export function syncWorldIndex(worldRoot: string, worldSlug: string): BuildLikeResult {
  if (!worldExists(worldRoot, worldSlug)) {
    console.error(`Unknown world slug '${worldSlug}'.`);
    return { exitCode: 2, changedNodeCount: 0, totalNodeCount: 0 };
  }

  if (!hasIndex(worldRoot, worldSlug)) {
    console.error(`Index missing for '${worldSlug}'. Run 'world-index build ${worldSlug}' first.`);
    return { exitCode: 1, changedNodeCount: 0, totalNodeCount: 0 };
  }

  const opened = openExistingWorldIndex(worldRoot, worldSlug);
  if (opened instanceof SchemaVersionMismatchError) {
    console.error(opened.message);
    return { exitCode: 1, changedNodeCount: 0, totalNodeCount: 0 };
  }

  try {
    const missingMandatory = findMissingMandatoryFiles(resolveWorldDirectory(worldRoot, worldSlug));
    if (missingMandatory.length > 0) {
      console.error(`Missing mandatory world file '${missingMandatory[0]}'.`);
      return { exitCode: 3, changedNodeCount: 0, totalNodeCount: 0 };
    }
    return reindexAllFiles(opened, worldRoot, worldSlug, false);
  } finally {
    opened.close();
  }
}

function reindexAllFiles(
  db: Database.Database,
  worldRoot: string,
  worldSlug: string,
  fullBuild: boolean
): BuildLikeResult {
  const worldDirectory = resolveWorldDirectory(worldRoot, worldSlug);
  const { indexable, unexpected } = enumerate(worldDirectory);
  const indexedBefore = new Set(listIndexedFiles(db, worldSlug));
  let changedNodeCount = 0;
  let yamlBlockCount = 0;
  let yamlFailureCount = 0;

  for (const relativeFilePath of indexable) {
    const parsed = parseWorldFile(worldRoot, worldSlug, relativeFilePath);
    const previousHash = getFileVersion(db, worldSlug, relativeFilePath);
    const shouldProcess = fullBuild || previousHash !== parsed.contentHash;

    yamlBlockCount += parsed.yamlBlockCount;
    yamlFailureCount += parsed.yamlFailureCount;
    indexedBefore.delete(relativeFilePath);

    if (!shouldProcess) {
      continue;
    }

    db.transaction(() => {
      insertParsedFile(db, worldSlug, parsed);
      upsertFileVersion(db, worldSlug, relativeFilePath, parsed.contentHash);
    })();
    changedNodeCount += parsed.nodes.length;
  }

  for (const removedPath of indexedBefore) {
    const removedNodeCount = countNodesForFile(db, worldSlug, removedPath);
    db.transaction(() => {
      deleteNodesByFile(db, worldSlug, removedPath);
      db.prepare("DELETE FROM validation_results WHERE world_slug = ? AND file_path = ?").run(
        worldSlug,
        removedPath
      );
      removeFileVersion(db, worldSlug, removedPath);
    })();
    changedNodeCount += removedNodeCount;
  }

  if (unexpected.length > 0) {
    db.prepare("DELETE FROM validation_results WHERE world_slug = ? AND validator_name = 'enumeration'").run(
      worldSlug
    );
    insertValidationResults(
      db,
      unexpected.map((filePath, index) => ({
        result_id: index + 1,
        world_slug: worldSlug,
        validator_name: "enumeration",
        severity: "warn",
        code: "unexpected_path",
        message: `Unexpected world file '${filePath}' is not part of the index inventory.`,
        node_id: null,
        file_path: filePath,
        line_range_start: null,
        line_range_end: null,
        created_at: new Date().toISOString()
      }))
    );
  }

  finalizeEntityState(db, worldRoot, worldSlug);
  resolveUnresolvedEdges(db);
  refreshUnresolvedAttributionDiagnostics(db, worldSlug);

  const totalNodeCount = countAllNodes(db, worldSlug);
  if (fullBuild || shouldRebuildFts(changedNodeCount, totalNodeCount)) {
    rebuildFtsIndex(db);
  }

  if (yamlBlockCount > 0 && yamlFailureCount / yamlBlockCount > 0.1) {
    return { exitCode: 4, changedNodeCount, totalNodeCount };
  }

  return { exitCode: 0, changedNodeCount, totalNodeCount };
}

function buildAnchorRows(nodes: NodeRow[]): AnchorChecksumRow[] {
  return nodes.map((node) => ({
    node_id: node.node_id,
    anchor_form: node.body,
    checksum: node.anchor_checksum
  }));
}

function clearEntityState(db: Database.Database): void {
  db.prepare("DELETE FROM entity_mentions").run();
  db.prepare("DELETE FROM edges WHERE edge_type = 'mentions_entity'").run();
  db.prepare("DELETE FROM anchor_checksums WHERE node_id IN (SELECT node_id FROM nodes WHERE node_type = 'named_entity')").run();
  db.prepare("DELETE FROM nodes WHERE node_type = 'named_entity'").run();
}

function loadPersistedProseNodes(db: Database.Database, worldSlug: string): NodeRow[] {
  const rows = db
    .prepare(
      `
        SELECT *
        FROM nodes
        WHERE world_slug = ?
          AND node_type != 'canon_fact_record'
          AND node_type != 'change_log_entry'
          AND node_type != 'named_entity'
      `
    )
    .all(worldSlug) as NodeRow[];

  return rows.filter((row) => PROSE_NODE_TYPES.has(row.node_type));
}

function refreshUnresolvedAttributionDiagnostics(
  db: Database.Database,
  worldSlug: string
): void {
  db.prepare(
    `
      DELETE FROM validation_results
      WHERE world_slug = ?
        AND validator_name = 'semantic_edge_extraction'
        AND code = 'unresolved_attribution_target'
    `
  ).run(worldSlug);

  const rows = db
    .prepare(
      `
        SELECT
          source.file_path AS file_path,
          source.line_start AS line_start,
          source.line_end AS line_end,
          source.node_id AS node_id,
          edges.target_unresolved_ref AS target_ref
        FROM edges
        INNER JOIN nodes AS source
          ON source.node_id = edges.source_node_id
        WHERE source.world_slug = ?
          AND edges.edge_type IN ('patched_by', 'clarified_by')
          AND edges.target_unresolved_ref IS NOT NULL
        ORDER BY source.file_path, source.line_start, source.node_id, edges.edge_id
      `
    )
    .all(worldSlug) as Array<{
    file_path: string;
    line_start: number | null;
    line_end: number | null;
    node_id: string;
    target_ref: string;
  }>;

  if (rows.length === 0) {
    return;
  }

  insertValidationResults(
    db,
    rows.map((row, index) => ({
      result_id: index + 1,
      world_slug: worldSlug,
      validator_name: "semantic_edge_extraction",
      severity: "warn",
      code: "unresolved_attribution_target",
      message: `Attribution target '${row.target_ref}' is still unresolved after full-world edge resolution.`,
      node_id: row.node_id,
      file_path: row.file_path,
      line_range_start: row.line_start,
      line_range_end: row.line_end,
      created_at: new Date().toISOString()
    }))
  );
}

function countNodesForFile(db: Database.Database, worldSlug: string, relativeFilePath: string): number {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM nodes
          WHERE world_slug = ? AND file_path = ?
        `
      )
      .get(worldSlug, relativeFilePath) as { count: number }
  ).count;
}

function countAllNodes(db: Database.Database, worldSlug: string): number {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM nodes
          WHERE world_slug = ?
        `
      )
      .get(worldSlug) as { count: number }
  ).count;
}

function deleteFile(filePath: string): void {
  unlinkSync(filePath);
}

function findMissingMandatoryFiles(worldDirectory: string): string[] {
  return [...MANDATORY_WORLD_FILES]
    .filter((fileName) => !existsSync(path.join(worldDirectory, fileName)))
    .sort((left, right) => left.localeCompare(right, "en-US"));
}

export function listWorldSlugs(worldRoot: string): string[] {
  const worldsDirectory = path.resolve(worldRoot, "worlds");
  if (!existsSync(worldsDirectory)) {
    return [];
  }

  return readdirSync(worldsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "en-US"));
}
