import Database from "better-sqlite3";
import { appendFileSync, existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import type { Root } from "mdast";

import { enumerate } from "../enumerate.js";
import { sha256Hex } from "../hash/content.js";
import { insertEdges, resolveUnresolvedEdges } from "../index/edges.js";
import { rebuildFtsIndex, shouldRebuildFts } from "../index/fts.js";
import {
  deleteNodesByFile,
  insertAnchorChecksums,
  insertEntities,
  insertEntityAliases,
  insertEntityMentions,
  insertNodes,
  insertScopedReferenceAliases,
  insertScopedReferences,
  insertSltProjections,
  insertValidationResults
} from "../index/nodes.js";
import { getFileVersion, listIndexedFiles, removeFileVersion, upsertFileVersion } from "../index/file-versions.js";
import {
  databasePathForWorld,
  hasIndex,
  openIndex,
  openExistingIndex,
  SchemaVersionMismatchError
} from "../index/open.js";
import { parseMarkdown } from "../parse/markdown.js";
import { extractEntities } from "../parse/entities.js";
import { extractProseNodes } from "../parse/prose.js";
import { extractScopedReferences } from "../parse/scoped.js";
import { extractStructuredRecordEdges } from "../parse/structured-edges.js";
import { extractSemanticEdges } from "../parse/semantic.js";
import { extractYamlNodes } from "../parse/yaml.js";
import {
  ATOMIC_LOGICAL_WORLD_FILES,
  createAtomicLogicalFileResults,
  hasAtomicSourceRecords,
  listStoryBundleSourceFiles,
  loadAtomicEntityRegistry,
  parseAtomicSourceFile,
  parseStoryBundleSourceFile
} from "../parse/atomic.js";
import type { AtomicSkippedRecord } from "../parse/atomic.js";
import type { AnchorChecksumRow, EdgeRow, NodeRow, SltProjectionRow, ValidationResultRow } from "../schema/types.js";

export const ENTITY_SOURCE_NODE_TYPES = new Set([
  "ontology_category",
  "character_record",
  "diegetic_artifact_record",
  "character_proposal_card"
]);

export const MENTION_EVIDENCE_SOURCE_NODE_TYPES = new Set([
  ...ENTITY_SOURCE_NODE_TYPES,
  "mystery_reserve_entry",
  "open_question_entry",
  "invariant",
  "section",
  "subsection",
  "bullet_cluster",
  "proposal_card",
  "proposal_batch",
  "character_proposal_batch",
  "retcon_proposal_card",
  "story_entity_record",
  "story_status_record",
  "belief_record",
  "story_fact_record",
  "story_event_record",
  "obligation_record",
  "consequence_record",
  "thread_record",
  "relationship_record_story",
  "intention_record",
  "story_location_record",
  "story_object_record",
  "branch_record",
  "page_record",
  "choice_record",
  "storylet_record",
  "story_diegetic_artifact_record"
]);

export interface ParsedFileResult {
  relativeFilePath: string;
  contentHash: string;
  nodes: NodeRow[];
  edges: EdgeRow[];
  sltProjections: SltProjectionRow[];
  validationResults: ValidationResultRow[];
  skippedRecords: AtomicSkippedRecord[];
  yamlBlockCount: number;
  yamlFailureCount: number;
  tree: Root;
}

export interface BuildLikeResult {
  exitCode: number;
  changedNodeCount: number;
  totalNodeCount: number;
  skippedRecordCount: number;
  skippedRecordLogPath: string | null;
}

export interface IndexCommandOptions {
  quiet?: boolean;
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
    sltProjections: [],
    validationResults: [...yamlIssues, ...normalizedSemanticIssues],
    skippedRecords: [],
    yamlBlockCount: yamlNodes.length,
    yamlFailureCount: yamlIssues.filter((issue) => issue.code === "yaml_syntax_error").length,
    tree
  };
}

export function finalizeEntityState(db: Database.Database, worldRoot: string, worldSlug: string): void {
  const proseNodes = loadPersistedProseNodes(db, worldSlug);
  const worldDirectory = resolveWorldDirectory(worldRoot, worldSlug);
  const registry = loadAtomicEntityRegistry(worldDirectory);
  const { entityNodes, entities, aliases, mentions, edges, validationResults } = extractEntities(
    { type: "root", children: [] },
    proseNodes,
    registry
  );
  const scoped = extractScopedReferences(proseNodes);
  const structured = extractStructuredRecordEdges(proseNodes);

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

  if (scoped.scopedNodes.length > 0) {
    insertNodes(db, scoped.scopedNodes);
    insertAnchorChecksums(
      db,
      scoped.scopedNodes.map((node) => ({
        node_id: node.node_id,
        anchor_form: node.body,
        checksum: node.anchor_checksum
      }))
    );
  }

  if (structured.scopedNodes.length > 0) {
    insertNodes(db, structured.scopedNodes);
    insertAnchorChecksums(
      db,
      structured.scopedNodes.map((node) => ({
        node_id: node.node_id,
        anchor_form: node.body,
        checksum: node.anchor_checksum
      }))
    );
  }

  if (entities.length > 0) {
    insertEntities(db, entities);
  }

  if (aliases.length > 0) {
    insertEntityAliases(db, aliases);
  }

  if (scoped.scopedReferences.length > 0) {
    insertScopedReferences(db, scoped.scopedReferences);
  }

  if (structured.scopedReferences.length > 0) {
    insertScopedReferences(db, structured.scopedReferences);
  }

  if (scoped.scopedReferenceAliases.length > 0) {
    insertScopedReferenceAliases(db, scoped.scopedReferenceAliases);
  }

  if (mentions.length > 0) {
    insertEntityMentions(db, mentions);
  }

  if (edges.length > 0) {
    insertEdges(db, edges);
  }

  if (scoped.edges.length > 0) {
    insertEdges(db, scoped.edges);
  }

  if (structured.edges.length > 0) {
    insertEdges(db, structured.edges);
  }

  if (validationResults.length > 0) {
    insertValidationResults(db, validationResults);
  }

  if (scoped.validationResults.length > 0) {
    insertValidationResults(db, scoped.validationResults);
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

  if (parsed.sltProjections.length > 0) {
    insertSltProjections(db, parsed.sltProjections);
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

export function buildWorldIndex(
  worldRoot: string,
  worldSlug: string,
  options: IndexCommandOptions = {}
): BuildLikeResult {
  if (!worldExists(worldRoot, worldSlug)) {
    console.error(`Unknown world slug '${worldSlug}'.`);
    return emptyBuildResult(2);
  }

  const worldDirectory = resolveWorldDirectory(worldRoot, worldSlug);
  if (!hasAtomicSourceRecords(worldDirectory)) {
    console.error(missingAtomicSourceMessage(worldSlug));
    return emptyBuildResult(3);
  }
  const missingMandatory = findMissingMandatoryFiles(worldDirectory);
  if (missingMandatory.length > 0) {
    console.error(`Missing mandatory world file '${missingMandatory[0]}'.`);
    return emptyBuildResult(3);
  }

  const dbPath = databasePathForWorld(worldRoot, worldSlug);
  if (existsSync(dbPath)) {
    deleteFile(dbPath);
  }
  const skippedRecordLogPath = skippedRecordLogPathForWorld(worldRoot, worldSlug);
  if (existsSync(skippedRecordLogPath)) {
    deleteFile(skippedRecordLogPath);
  }

  const db = openIndex(worldRoot, worldSlug);

  try {
    return reindexAllFiles(db, worldRoot, worldSlug, true, options);
  } finally {
    db.close();
  }
}

export function syncWorldIndex(
  worldRoot: string,
  worldSlug: string,
  options: IndexCommandOptions = {}
): BuildLikeResult {
  if (!worldExists(worldRoot, worldSlug)) {
    console.error(`Unknown world slug '${worldSlug}'.`);
    return emptyBuildResult(2);
  }

  if (!hasIndex(worldRoot, worldSlug)) {
    console.error(`Index missing for '${worldSlug}'. Run 'world-index build ${worldSlug}' first.`);
    return emptyBuildResult(1);
  }

  const opened = openExistingWorldIndex(worldRoot, worldSlug);
  if (opened instanceof SchemaVersionMismatchError) {
    console.error(opened.message);
    return emptyBuildResult(1);
  }

  try {
    const worldDirectory = resolveWorldDirectory(worldRoot, worldSlug);
    if (!hasAtomicSourceRecords(worldDirectory)) {
      console.error(missingAtomicSourceMessage(worldSlug));
      return emptyBuildResult(3);
    }
    const missingMandatory = findMissingMandatoryFiles(worldDirectory);
    if (missingMandatory.length > 0) {
      console.error(`Missing mandatory world file '${missingMandatory[0]}'.`);
      return emptyBuildResult(3);
    }
    return reindexAllFiles(opened, worldRoot, worldSlug, false, options);
  } finally {
    opened.close();
  }
}

function reindexAllFiles(
  db: Database.Database,
  worldRoot: string,
  worldSlug: string,
  fullBuild: boolean,
  options: IndexCommandOptions
): BuildLikeResult {
  const worldDirectory = resolveWorldDirectory(worldRoot, worldSlug);
  const { indexable, unexpected } = enumerate(worldDirectory);
  const atomicMode = hasAtomicSourceRecords(worldDirectory);
  const filesToIndex = atomicMode
    ? indexable.filter(
        (filePath) =>
          !filePath.startsWith("_source/") &&
          !filePath.startsWith("stories/") &&
          !(ATOMIC_LOGICAL_WORLD_FILES as readonly string[]).includes(filePath)
      )
    : indexable;
  const atomicLogicalFiles = atomicMode ? createAtomicLogicalFileResults(worldSlug) : [];
  const atomicFiles = atomicMode ? indexable.filter((filePath) => filePath.startsWith("_source/")) : [];
  const storyFiles = listStoryBundleSourceFiles(worldDirectory);
  const indexedBefore = new Set(listIndexedFiles(db, worldSlug));
  let changedNodeCount = 0;
  let yamlBlockCount = 0;
  let yamlFailureCount = 0;
  let skippedRecordCount = 0;
  const skippedRecordLogPath = skippedRecordLogPathForWorld(worldRoot, worldSlug);

  clearEntityState(db);
  if (fullBuild) {
    clearStoryProvenanceEdges(db);
  }

  for (const relativeFilePath of filesToIndex) {
    const parsed = parseWorldFile(worldRoot, worldSlug, relativeFilePath);
    const previousHash = getFileVersion(db, worldSlug, relativeFilePath);
    const shouldProcess = fullBuild || previousHash !== parsed.contentHash;

    yamlBlockCount += parsed.yamlBlockCount;
    yamlFailureCount += parsed.yamlFailureCount;
    skippedRecordCount += recordSkippedRecords(worldRoot, worldSlug, parsed.skippedRecords, options);
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

  for (const parsed of atomicLogicalFiles) {
    const previousHash = getFileVersion(db, worldSlug, parsed.relativeFilePath);
    const shouldProcess = fullBuild || previousHash !== parsed.contentHash;

    indexedBefore.delete(parsed.relativeFilePath);

    if (!shouldProcess) {
      continue;
    }

    db.transaction(() => {
      insertParsedFile(db, worldSlug, parsed);
      upsertFileVersion(db, worldSlug, parsed.relativeFilePath, parsed.contentHash);
    })();
    changedNodeCount += parsed.nodes.length;
  }

  for (const relativeFilePath of atomicFiles) {
    const parsed = parseAtomicSourceFile(worldRoot, worldSlug, relativeFilePath);
    const previousHash = getFileVersion(db, worldSlug, relativeFilePath);
    const shouldProcess = fullBuild || previousHash !== parsed.contentHash;

    yamlBlockCount += parsed.yamlBlockCount;
    yamlFailureCount += parsed.yamlFailureCount;
    skippedRecordCount += recordSkippedRecords(worldRoot, worldSlug, parsed.skippedRecords, options);
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

  for (const relativeFilePath of storyFiles) {
    const parsed = parseStoryBundleSourceFile(worldRoot, worldSlug, relativeFilePath);
    const previousHash = getFileVersion(db, worldSlug, relativeFilePath);
    const shouldProcess = fullBuild || previousHash !== parsed.contentHash;

    yamlBlockCount += parsed.yamlBlockCount;
    yamlFailureCount += parsed.yamlFailureCount;
    skippedRecordCount += recordSkippedRecords(worldRoot, worldSlug, parsed.skippedRecords, options);
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
    return { exitCode: 4, changedNodeCount, totalNodeCount, skippedRecordCount, skippedRecordLogPath };
  }

  return { exitCode: 0, changedNodeCount, totalNodeCount, skippedRecordCount, skippedRecordLogPath };
}

function emptyBuildResult(exitCode: number): BuildLikeResult {
  return {
    exitCode,
    changedNodeCount: 0,
    totalNodeCount: 0,
    skippedRecordCount: 0,
    skippedRecordLogPath: null
  };
}

function clearStoryProvenanceEdges(db: Database.Database): void {
  db.prepare(
    `
      DELETE FROM edges
      WHERE edge_type IN ('state_delta_create', 'state_delta_supersede', 'creation_evidence')
    `
  ).run();
}

function skippedRecordLogPathForWorld(worldRoot: string, worldSlug: string): string {
  return path.join(resolveWorldDirectory(worldRoot, worldSlug), "_index", "world.db.skipped_records.log");
}

function recordSkippedRecords(
  worldRoot: string,
  worldSlug: string,
  skippedRecords: AtomicSkippedRecord[],
  options: IndexCommandOptions
): number {
  if (skippedRecords.length === 0) {
    return 0;
  }

  const logPath = skippedRecordLogPathForWorld(worldRoot, worldSlug);
  for (const skipped of skippedRecords) {
    appendFileSync(logPath, `${formatSkippedRecordLogLine(skipped)}\n`, "utf8");
    if (!options.quiet) {
      process.stdout.write(`${formatSkippedRecordWarning(skipped, logPath)}\n`);
    }
  }
  return skippedRecords.length;
}

function formatSkippedRecordLogLine(skipped: AtomicSkippedRecord): string {
  return [
    new Date().toISOString(),
    skipped.relativeFilePath,
    skipped.nodeType,
    skipped.extractedId ?? "-",
    skipped.reason,
    skipped.expectedPattern
  ].join("\t");
}

function formatSkippedRecordWarning(skipped: AtomicSkippedRecord, logPath: string): string {
  const idLabel = skipped.extractedId === null ? "<missing>" : skipped.extractedId;
  return [
    `Warning: skipped schema-failed record ${skipped.relativeFilePath}`,
    `node_type=${skipped.nodeType}`,
    `id=${idLabel}`,
    `expected=${skipped.expectedPattern}`,
    `reason=${skipped.reason}`,
    `log=${logPath}`
  ].join(" ");
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
  db.prepare("DELETE FROM entity_aliases").run();
  db.prepare("DELETE FROM entities").run();
  db.prepare("DELETE FROM scoped_reference_aliases").run();
  db.prepare("DELETE FROM scoped_references").run();
  db.prepare("DELETE FROM edges WHERE edge_type = 'mentions_entity'").run();
  db.prepare("DELETE FROM edges WHERE edge_type = 'references_scoped_name'").run();
  db.prepare("DELETE FROM edges WHERE edge_type = 'references_record'").run();
  db.prepare(
      `
      DELETE FROM validation_results
      WHERE validator_name = 'frontmatter_parse'
        AND code = 'malformed_authority_source'
    `
  ).run();
  db.prepare(
    `
      DELETE FROM validation_results
      WHERE validator_name = 'scoped_reference_parse'
        AND code = 'malformed_scoped_reference'
    `
  ).run();
  db.prepare(
    `
      DELETE FROM anchor_checksums
      WHERE node_id IN (
        SELECT node_id
        FROM nodes
        WHERE node_type = 'scoped_reference'
           OR (node_type = 'named_entity' AND node_id LIKE 'entity:%')
      )
    `
  ).run();
  db.prepare(
    "DELETE FROM nodes WHERE node_type = 'scoped_reference' OR (node_type = 'named_entity' AND node_id LIKE 'entity:%')"
  ).run();
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

  return rows.filter((row) => MENTION_EVIDENCE_SOURCE_NODE_TYPES.has(row.node_type));
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
  const requiredFiles = ["ONTOLOGY.md", "WORLD_KERNEL.md"];
  return requiredFiles
    .filter((fileName) => !existsSync(path.join(worldDirectory, fileName)))
    .sort((left, right) => left.localeCompare(right, "en-US"));
}

function missingAtomicSourceMessage(worldSlug: string): string {
  return [
    `World '${worldSlug}' has no recognized SPEC-13 atomic source records under '_source/'.`,
    "Run the SPEC-13 migration for legacy worlds, or create new worlds with the atomic-source create-base-world flow."
  ].join(" ");
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
