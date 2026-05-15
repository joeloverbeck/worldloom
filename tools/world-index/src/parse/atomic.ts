import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Root } from "mdast";

import type { ParsedFileResult } from "../commands/shared";
import { contentHashForProse, contentHashForYaml, anchorChecksum } from "./canonical";
import { parseYamlWithRecovery } from "./yaml";
import { domainFileNodeId } from "./prose";
import { CURRENT_INDEX_VERSION } from "../schema/version";
import type { EdgeRow, NodeRow, NodeType, ValidationResultRow } from "../schema/types";
import type { EntityRegistry, EntityRegistryEntry } from "./entities";

export const ATOMIC_LOGICAL_WORLD_FILES = [
  "CANON_LEDGER.md",
  "INVARIANTS.md",
  "MYSTERY_RESERVE.md",
  "OPEN_QUESTIONS.md",
  "EVERYDAY_LIFE.md",
  "INSTITUTIONS.md",
  "MAGIC_OR_TECH_SYSTEMS.md",
  "GEOGRAPHY.md",
  "ECONOMY_AND_RESOURCES.md",
  "PEOPLES_AND_SPECIES.md",
  "TIMELINE.md"
] as const;

type AtomicLogicalWorldFile = (typeof ATOMIC_LOGICAL_WORLD_FILES)[number];
const PRIMARY_AUTHORED_LOGICAL_WORLD_FILES = new Set(["ONTOLOGY.md", "WORLD_KERNEL.md"]);

const FILE_CLASS_TO_LOGICAL_FILE = new Map<string, AtomicLogicalWorldFile>([
  ["CANON_LEDGER", "CANON_LEDGER.md"],
  ["INVARIANTS", "INVARIANTS.md"],
  ["MYSTERY_RESERVE", "MYSTERY_RESERVE.md"],
  ["OPEN_QUESTIONS", "OPEN_QUESTIONS.md"],
  ["EVERYDAY_LIFE", "EVERYDAY_LIFE.md"],
  ["INSTITUTIONS", "INSTITUTIONS.md"],
  ["MAGIC_OR_TECH_SYSTEMS", "MAGIC_OR_TECH_SYSTEMS.md"],
  ["GEOGRAPHY", "GEOGRAPHY.md"],
  ["ECONOMY_AND_RESOURCES", "ECONOMY_AND_RESOURCES.md"],
  ["PEOPLES_AND_SPECIES", "PEOPLES_AND_SPECIES.md"],
  ["TIMELINE", "TIMELINE.md"]
]);

type AtomicRecordSpec = {
  nodeType: NodeType;
  idField: string;
  idPattern: RegExp;
  idPatternSource: string;
};

const ATOMIC_DIRS = new Map<string, AtomicRecordSpec>([
  ["canon", recordSpec("canon_fact_record", "id", "^CF-[0-9]+$")],
  ["change-log", recordSpec("change_log_entry", "change_id", "^CH-[0-9]+$")],
  ["invariants", recordSpec("invariant", "id", "^(ONT|CAU|DIS|SOC|AES)-[0-9]+$")],
  ["mystery-reserve", recordSpec("mystery_reserve_entry", "id", "^M-[0-9]+$")],
  ["open-questions", recordSpec("open_question_entry", "id", "^OQ-[0-9]+$")],
  ["entities", recordSpec("named_entity", "id", "^ENT-[0-9]+$")],
  ["everyday-life", recordSpec("section", "id", "^SEC-ELF-[0-9]+$")],
  ["institutions", recordSpec("section", "id", "^SEC-INS-[0-9]+$")],
  ["magic-or-tech-systems", recordSpec("section", "id", "^SEC-MTS-[0-9]+$")],
  ["geography", recordSpec("section", "id", "^SEC-GEO-[0-9]+$")],
  ["economy-and-resources", recordSpec("section", "id", "^SEC-ECR-[0-9]+$")],
  ["peoples-and-species", recordSpec("section", "id", "^SEC-PAS-[0-9]+$")],
  ["timeline", recordSpec("section", "id", "^SEC-TML-[0-9]+$")]
]);
const STORY_DIRS = new Map<string, AtomicRecordSpec>([
  ["entities", recordSpec("story_entity_record", "id", "^STENT-[0-9]+$")],
  ["status", recordSpec("story_status_record", "id", "^STSTAT-[0-9]+$")],
  ["beliefs", recordSpec("belief_record", "id", "^BEL-[0-9]+$")],
  ["facts", recordSpec("story_fact_record", "id", "^SF-[0-9]+$")],
  ["events", recordSpec("story_event_record", "id", "^SE-[0-9]+$")],
  ["obligations", recordSpec("obligation_record", "id", "^OBL-[0-9]+$")],
  ["consequences", recordSpec("consequence_record", "id", "^CNSQ-[0-9]+$")],
  ["threads", recordSpec("thread_record", "id", "^THR-[0-9]+$")],
  ["relationships", recordSpec("relationship_record_story", "id", "^SREL-[0-9]+$")],
  ["intentions", recordSpec("intention_record", "id", "^STINT-[0-9]+$")],
  ["locations", recordSpec("story_location_record", "id", "^STLOC-[0-9]+$")],
  ["objects", recordSpec("story_object_record", "id", "^STOBJ-[0-9]+$")],
  ["branches", recordSpec("branch_record", "id", "^BR-[0-9]+$")],
  ["pages", recordSpec("page_record", "id", "^PG-[0-9]+$")],
  ["choices", recordSpec("choice_record", "id", "^CHC-[0-9]+$")],
  ["storylets", recordSpec("storylet_record", "id", "^SLT-[0-9]+$")],
  ["artifacts", recordSpec("story_diegetic_artifact_record", "id", "^DA-[0-9]+$")]
]);

const STRUCTURED_ID_REGEX = /\b(CF|CH|M)-\d+\b/g;
const STORY_REF_REGEX = /\b(STENT|STSTAT|SF|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|BR|PG|CHC|SLT|DA)-[A-Za-z0-9-]+\b/g;

export type AtomicSkipReason = "missing_id_field" | "schema_pattern_mismatch";

export interface AtomicSkippedRecord {
  relativeFilePath: string;
  nodeType: NodeType;
  extractedId: string | null;
  expectedPattern: string;
  reason: AtomicSkipReason;
}

function recordSpec(nodeType: NodeType, idField: string, idPatternSource: string): AtomicRecordSpec {
  return {
    nodeType,
    idField,
    idPattern: new RegExp(idPatternSource),
    idPatternSource
  };
}

export function hasAtomicSourceRecords(worldDirectory: string): boolean {
  return listAtomicSourceFiles(worldDirectory).length > 0;
}

export function listAtomicSourceFiles(worldDirectory: string): string[] {
  const sourceDirectory = path.join(worldDirectory, "_source");
  if (!existsSync(sourceDirectory)) {
    return [];
  }

  const relativePaths: string[] = [];
  for (const [directoryName] of ATOMIC_DIRS) {
    const absoluteDirectory = path.join(sourceDirectory, directoryName);
    if (!existsSync(absoluteDirectory)) {
      continue;
    }

    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".yaml")) {
        relativePaths.push(toPosixPath(path.join("_source", directoryName, entry.name)));
      }
    }
  }

  return relativePaths.sort((left, right) => left.localeCompare(right, "en-US"));
}

export function listStoryBundleSourceFiles(worldDirectory: string): string[] {
  const storiesDirectory = path.join(worldDirectory, "stories");
  if (!existsSync(storiesDirectory)) {
    return [];
  }

  const relativePaths: string[] = [];
  for (const storyEntry of readdirSync(storiesDirectory, { withFileTypes: true })) {
    if (!storyEntry.isDirectory()) {
      continue;
    }

    const sourceDirectory = path.join(storiesDirectory, storyEntry.name, "_source");
    if (!existsSync(sourceDirectory)) {
      continue;
    }

    for (const [directoryName] of STORY_DIRS) {
      const absoluteDirectory = path.join(sourceDirectory, directoryName);
      if (!existsSync(absoluteDirectory)) {
        continue;
      }

      for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".yaml")) {
          relativePaths.push(
            toPosixPath(path.join("stories", storyEntry.name, "_source", directoryName, entry.name))
          );
        }
      }
    }
  }

  return relativePaths.sort((left, right) => left.localeCompare(right, "en-US"));
}

export function parseAtomicSourceFile(
  worldRoot: string,
  worldSlug: string,
  relativeFilePath: string
): ParsedFileResult {
  const worldDirectory = path.resolve(worldRoot, "worlds", worldSlug);
  const source = readFileSync(path.join(worldDirectory, relativeFilePath), "utf8");
  const lines = source.split(/\r?\n/);
  const spec = specForAtomicPath(relativeFilePath);
  const validationResults: ValidationResultRow[] = [];
  const edges: EdgeRow[] = [];
  let parsed: unknown;
  let yamlFailureCount = 0;

  try {
    parsed = parseYamlWithRecovery(source);
  } catch (error) {
    yamlFailureCount = 1;
    parsed = null;
    validationResults.push(
      createParseIssue({
        worldSlug,
        filePath: relativeFilePath,
        lineStart: 1,
        lineEnd: lines.length,
        severity: "warn",
        code: "yaml_syntax_error",
        message: error instanceof Error ? error.message : String(error)
      })
    );
  }

  const record = isRecord(parsed) ? parsed : {};
  const extractedId = stringField(record, spec.idField);
  const skip = skipForExtractedId(relativeFilePath, spec, extractedId);
  if (skip) {
    return {
      relativeFilePath,
      contentHash: contentHashForProse(source),
      nodes: [],
      edges: [],
      validationResults,
      skippedRecords: [skip],
      yamlBlockCount: 1,
      yamlFailureCount,
      tree: emptyTree()
    };
  }
  if (extractedId === null) {
    throw new Error(`Atomic source parser failed to classify missing id for '${relativeFilePath}'.`);
  }

  const nodeId = extractedId;
  const node = createNodeRow({
    worldSlug,
    relativeFilePath,
    nodeType: spec.nodeType,
    nodeId,
    headingPath: headingPathForRecord(spec.nodeType, record, nodeId),
    lineStart: 1,
    lineEnd: lines.length,
    body: source,
    lines,
    contentHash: parsed === null ? contentHashForProse(source) : contentHashForYaml(parsed)
  });

  edges.push(...edgesForAtomicRecord(node, record, worldSlug));

  return {
    relativeFilePath,
    contentHash: contentHashForProse(source),
    nodes: [node],
    edges,
    validationResults,
    skippedRecords: [],
    yamlBlockCount: 1,
    yamlFailureCount,
    tree: emptyTree()
  };
}

export function parseStoryBundleSourceFile(
  worldRoot: string,
  worldSlug: string,
  relativeFilePath: string
): ParsedFileResult {
  const worldDirectory = path.resolve(worldRoot, "worlds", worldSlug);
  const source = readFileSync(path.join(worldDirectory, relativeFilePath), "utf8");
  const lines = source.split(/\r?\n/);
  const spec = specForStoryPath(relativeFilePath);
  const validationResults: ValidationResultRow[] = [];
  const edges: EdgeRow[] = [];
  let parsed: unknown;
  let yamlFailureCount = 0;

  try {
    parsed = parseYamlWithRecovery(source);
  } catch (error) {
    yamlFailureCount = 1;
    validationResults.push(
      createParseIssue({
        worldSlug,
        filePath: relativeFilePath,
        lineStart: 1,
        lineEnd: lines.length,
        severity: "warn",
        code: "story_yaml_syntax_error",
        message: error instanceof Error ? error.message : String(error)
      })
    );

    return {
      relativeFilePath,
      contentHash: contentHashForProse(source),
      nodes: [],
      edges: [],
      validationResults,
      skippedRecords: [],
      yamlBlockCount: 1,
      yamlFailureCount,
      tree: emptyTree()
    };
  }

  const record = isRecord(parsed) ? parsed : {};
  const authoredId = stringField(record, spec.idField);
  const skip = skipForExtractedId(relativeFilePath, spec, authoredId);
  if (skip) {
    return {
      relativeFilePath,
      contentHash: contentHashForProse(source),
      nodes: [],
      edges: [],
      validationResults,
      skippedRecords: [skip],
      yamlBlockCount: 1,
      yamlFailureCount,
      tree: emptyTree()
    };
  }
  if (authoredId === null) {
    throw new Error(`Story source parser failed to classify missing id for '${relativeFilePath}'.`);
  }

  const nodeId = storyNodeId(spec.storySlug, authoredId);
  const node = createNodeRow({
    worldSlug,
    storySlug: spec.storySlug,
    relativeFilePath,
    nodeType: spec.nodeType,
    nodeId,
    headingPath: headingPathForRecord(spec.nodeType, record, authoredId),
    lineStart: 1,
    lineEnd: lines.length,
    body: source,
    lines,
    contentHash: contentHashForYaml(parsed)
  });

  edges.push(...edgesForStoryRecord(node, record, spec.storySlug));

  return {
    relativeFilePath,
    contentHash: contentHashForProse(source),
    nodes: [node],
    edges,
    validationResults,
    skippedRecords: [],
    yamlBlockCount: 1,
    yamlFailureCount,
    tree: emptyTree()
  };
}

export function createAtomicLogicalFileResults(worldSlug: string): ParsedFileResult[] {
  return ATOMIC_LOGICAL_WORLD_FILES.map((logicalFile) => {
    const body = `Logical atomized world concern: ${logicalFile}`;
    const node = createNodeRow({
      worldSlug,
      relativeFilePath: logicalFile,
      nodeType: "domain_file",
      nodeId: domainFileNodeId(worldSlug, logicalFile),
      headingPath: logicalFile,
      lineStart: 1,
      lineEnd: 1,
      body,
      lines: [body],
      contentHash: contentHashForProse(body)
    });

    return {
      relativeFilePath: logicalFile,
      contentHash: node.content_hash,
      nodes: [node],
      edges: [],
      validationResults: [],
      skippedRecords: [],
      yamlBlockCount: 0,
      yamlFailureCount: 0,
      tree: emptyTree()
    };
  });
}

export function loadAtomicEntityRegistry(worldDirectory: string): EntityRegistry {
  const entries: EntityRegistryEntry[] = [];
  const issues: EntityRegistry["issues"] = [];
  const entityFiles = listAtomicSourceFiles(worldDirectory).filter((filePath) =>
    filePath.startsWith("_source/entities/")
  );

  for (const relativePath of entityFiles) {
    const absolutePath = path.join(worldDirectory, relativePath);
    const source = readFileSync(absolutePath, "utf8");
    try {
      const parsed = YAML.parse(source) as unknown;
      if (!isRecord(parsed)) {
        issues.push({
          code: "malformed_atomic_entity",
          message: `Atomic entity record '${relativePath}' is not a mapping.`,
          lineStart: 1,
          lineEnd: source.split(/\r?\n/).length
        });
        continue;
      }

      const canonicalName = stringField(parsed, "canonical_name");
      if (!canonicalName) {
        issues.push({
          code: "missing_atomic_entity_name",
          message: `Atomic entity record '${relativePath}' is missing canonical_name.`,
          lineStart: 1,
          lineEnd: source.split(/\r?\n/).length
        });
        continue;
      }

      entries.push({
        canonicalName,
        kind: stringField(parsed, "entity_kind"),
        aliases: stringArrayField(parsed, "aliases")
      });
    } catch (error) {
      issues.push({
        code: "malformed_atomic_entity_yaml",
        message: error instanceof Error ? error.message : String(error),
        lineStart: 1,
        lineEnd: source.split(/\r?\n/).length
      });
    }
  }

  return {
    sourcePath: "_source/entities",
    entries,
    issues
  };
}

function specForAtomicPath(relativeFilePath: string): AtomicRecordSpec {
  const segments = relativeFilePath.split("/");
  const sourceDirectory = segments[1];
  const spec = sourceDirectory ? ATOMIC_DIRS.get(sourceDirectory) : undefined;
  if (!spec) {
    throw new Error(`Unsupported atomic source path '${relativeFilePath}'.`);
  }
  return spec;
}

function specForStoryPath(relativeFilePath: string): {
  nodeType: NodeType;
  idField: string;
  idPattern: RegExp;
  idPatternSource: string;
  storySlug: string;
} {
  const segments = relativeFilePath.split("/");
  const storySlug = segments[1];
  const sourceDirectory = segments[3];
  const spec = sourceDirectory ? STORY_DIRS.get(sourceDirectory) : undefined;
  if (!storySlug || !spec) {
    throw new Error(`Unsupported story-bundle source path '${relativeFilePath}'.`);
  }
  return { ...spec, storySlug };
}

function skipForExtractedId(
  relativeFilePath: string,
  spec: AtomicRecordSpec,
  extractedId: string | null
): AtomicSkippedRecord | null {
  if (extractedId === null) {
    return {
      relativeFilePath,
      nodeType: spec.nodeType,
      extractedId: null,
      expectedPattern: spec.idPatternSource,
      reason: "missing_id_field"
    };
  }

  if (!spec.idPattern.test(extractedId)) {
    return {
      relativeFilePath,
      nodeType: spec.nodeType,
      extractedId,
      expectedPattern: spec.idPatternSource,
      reason: "schema_pattern_mismatch"
    };
  }

  return null;
}

function edgesForAtomicRecord(node: NodeRow, record: Record<string, unknown>, worldSlug: string): EdgeRow[] {
  const edges: EdgeRow[] = [];
  const push = (edge: Omit<EdgeRow, "edge_id">): void => {
    edges.push({ edge_id: edges.length + 1, ...edge });
  };

  if (node.node_type === "canon_fact_record") {
    for (const target of stringArrayField(record, "derived_from", ["source_basis"])) {
      push(createRefEdge(node.node_id, "derived_from", target));
    }
    for (const target of stringArrayField(record, "required_world_updates")) {
      const targetNodeId = resolveWorldUpdateTarget(worldSlug, target);
      push({
        source_node_id: node.node_id,
        target_node_id: targetNodeId,
        target_unresolved_ref: targetNodeId ? null : target,
        edge_type: "required_world_update"
      });
    }
    for (const entry of arrayOfRecords(record.modification_history)) {
      const changeId = stringField(entry, "change_id");
      if (changeId) {
        push(createRefEdge(node.node_id, "modified_by", changeId));
      }
    }
  }

  if (node.node_type === "change_log_entry") {
    for (const target of stringArrayField(record, "affected_fact_ids")) {
      push(createRefEdge(node.node_id, "affected_fact", target));
    }
    const originatingCf = stringField(record, "originating_cf");
    if (originatingCf) {
      push(createRefEdge(node.node_id, "originates_in", originatingCf));
    }
  }

  if (node.node_type === "mystery_reserve_entry") {
    for (const target of extractFirewallTargets(record)) {
      push(createRefEdge(node.node_id, "firewall_for", target));
    }
  }

  if (node.node_type === "section") {
    for (const target of stringArrayField(record, "touched_by_cf")) {
      push(createRefEdge(node.node_id, "patched_by", target));
    }
  }

  return edges;
}

function edgesForStoryRecord(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[] {
  const edges: EdgeRow[] = [];
  const push = (edge: Omit<EdgeRow, "edge_id">): void => {
    edges.push({ edge_id: edges.length + 1, story_slug: storySlug, ...edge });
  };
  const pushStoryRef = (edgeType: EdgeRow["edge_type"], target: string | null): void => {
    if (!target) {
      return;
    }
    push(createStoryRefEdge(node.node_id, edgeType, storySlug, target));
  };

  if (node.node_type === "story_entity_record") {
    const worldEntId = stringField(record, "world_ent_id");
    if (worldEntId) {
      push(createRefEdge(node.node_id, "world_entity_binding", worldEntId));
    }
  }

  if (node.node_type === "story_fact_record") {
    const derivedFromCf = stringField(record, "derived_from_cf");
    if (derivedFromCf) {
      push(createRefEdge(node.node_id, "story_fact_derived_from", derivedFromCf));
    }
  }

  pushStoryRef("created_at_page", stringField(record, "created_at_page"));
  pushStoryRef("created_at_page", stringField(record, "created_at_page", ["provenance"]));

  if (node.node_type === "storylet_record") {
    for (const target of storyRefsInField(record, "opens_obligations", "OBL")) {
      pushStoryRef("opens_obligation", target);
    }
    for (const target of storyRefsInField(record, "pays_off_obligations", "OBL")) {
      pushStoryRef("pays_off_obligation", target);
    }
    for (const target of storyRefsInField(record, "complicates_obligations", "OBL")) {
      pushStoryRef("complicates_obligation", target);
    }
    for (const target of storyRefsInField(record, "transfers_obligations", "OBL")) {
      pushStoryRef("transfers_obligation", target);
    }
  }

  if (node.node_type === "page_record" || node.node_type === "choice_record") {
    pushStoryRef("parent_page", stringField(record, "parent_page_id"));
  }

  if (node.node_type === "branch_record") {
    pushStoryRef("parent_page", stringField(record, "forked_from_page_id"));
    pushStoryRef("leaf_page", stringField(record, "current_leaf_page_id"));
  }

  if (node.node_type === "obligation_record") {
    for (const target of stringArrayField(record, "dependent_facts")) {
      pushStoryRef("dependent_fact", target);
    }
  }

  if (node.node_type === "thread_record") {
    for (const target of stringArrayField(record, "obligations")) {
      pushStoryRef("thread_obligation", target);
    }
  }

  return edges;
}

function resolveWorldUpdateTarget(worldSlug: string, target: string): string | null {
  const withoutSuffix = target.replace(/\.md$/i, "");
  const logicalFile = FILE_CLASS_TO_LOGICAL_FILE.get(withoutSuffix);
  if (logicalFile) {
    return domainFileNodeId(worldSlug, logicalFile);
  }

  const basenameWithoutSuffix = target.replace(/^.*[\\/]/, "");
  const basename = basenameWithoutSuffix.endsWith(".md")
    ? basenameWithoutSuffix
    : `${basenameWithoutSuffix}.md`;
  if (PRIMARY_AUTHORED_LOGICAL_WORLD_FILES.has(basename)) {
    return domainFileNodeId(worldSlug, basename);
  }

  if ((ATOMIC_LOGICAL_WORLD_FILES as readonly string[]).includes(basename)) {
    return domainFileNodeId(worldSlug, basename as AtomicLogicalWorldFile);
  }

  return null;
}

function createRefEdge(
  sourceNodeId: string,
  edgeType: EdgeRow["edge_type"],
  targetRef: string
): Omit<EdgeRow, "edge_id"> {
  return {
    source_node_id: sourceNodeId,
    target_node_id: null,
    target_unresolved_ref: targetRef,
    edge_type: edgeType
  };
}

function createStoryRefEdge(
  sourceNodeId: string,
  edgeType: EdgeRow["edge_type"],
  storySlug: string,
  targetRef: string
): Omit<EdgeRow, "edge_id"> {
  return {
    source_node_id: sourceNodeId,
    target_node_id: null,
    target_unresolved_ref: storyNodeId(storySlug, targetRef),
    edge_type: edgeType,
    story_slug: storySlug
  };
}

function storyNodeId(storySlug: string, recordId: string): string {
  return `${storySlug}:${recordId}`;
}

function storyRefsInField(
  record: Record<string, unknown>,
  field: string,
  prefix: string
): string[] {
  const value = record[field];
  const refs = new Set<string>();
  collectStoryRefs(value, refs, prefix);
  return [...refs].sort((left, right) => left.localeCompare(right, "en-US"));
}

function collectStoryRefs(value: unknown, refs: Set<string>, prefix: string): void {
  if (typeof value === "string") {
    for (const match of value.match(STORY_REF_REGEX) ?? []) {
      if (match.startsWith(`${prefix}-`)) {
        refs.add(match);
      }
    }
    STORY_REF_REGEX.lastIndex = 0;
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStoryRefs(item, refs, prefix);
    }
    return;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      collectStoryRefs(item, refs, prefix);
    }
  }
}

function extractFirewallTargets(record: Record<string, unknown>): string[] {
  const targets = new Set<string>();
  for (const key of ["firewall", "firewall_for", "forbidden_answers"]) {
    for (const candidate of stringArrayField(record, key)) {
      for (const match of candidate.match(STRUCTURED_ID_REGEX) ?? []) {
        targets.add(match);
      }
      STRUCTURED_ID_REGEX.lastIndex = 0;
    }
  }
  return [...targets];
}

function createNodeRow(args: {
  worldSlug: string;
  storySlug?: string | null;
  relativeFilePath: string;
  nodeType: NodeType;
  nodeId: string;
  headingPath: string;
  lineStart: number;
  lineEnd: number;
  body: string;
  lines: string[];
  contentHash: string;
}): NodeRow {
  return {
    node_id: args.nodeId,
    world_slug: args.worldSlug,
    story_slug: args.storySlug ?? null,
    file_path: args.relativeFilePath,
    heading_path: args.headingPath,
    byte_start: 0,
    byte_end: Buffer.byteLength(args.body, "utf8"),
    line_start: args.lineStart,
    line_end: args.lineEnd,
    node_type: args.nodeType,
    body: args.body,
    content_hash: args.contentHash,
    anchor_checksum: anchorChecksum(args.lines, args.lineStart, args.lineEnd),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

function headingPathForRecord(nodeType: NodeType, record: Record<string, unknown>, fallback: string): string {
  if (nodeType === "canon_fact_record") {
    return stringField(record, "title") ?? fallback;
  }
  if (nodeType === "open_question_entry") {
    return stringField(record, "topic") ?? fallback;
  }
  if (nodeType === "named_entity") {
    return stringField(record, "canonical_name") ?? fallback;
  }
  if (nodeType === "section") {
    return stringField(record, "heading") ?? fallback;
  }
  return stringField(record, "title") ?? fallback;
}

function syntheticAtomicNodeId(worldSlug: string, relativeFilePath: string): string {
  return `${worldSlug}:${relativeFilePath}`;
}

function stringField(record: Record<string, unknown>, field: string, nestedPath: string[] = []): string | null {
  let container: unknown = record;
  for (const segment of nestedPath) {
    if (!isRecord(container)) {
      return null;
    }
    container = container[segment];
  }
  if (!isRecord(container)) {
    return null;
  }
  const value = container[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringArrayField(record: Record<string, unknown>, field: string, nestedPath: string[] = []): string[] {
  let container: unknown = record;
  for (const segment of nestedPath) {
    if (!isRecord(container)) {
      return [];
    }
    container = container[segment];
  }
  if (!isRecord(container)) {
    return [];
  }
  const value = container[field];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function arrayOfRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createParseIssue(args: {
  worldSlug: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  severity: ValidationResultRow["severity"];
  code: string;
  message: string;
}): ValidationResultRow {
  return {
    result_id: 0,
    world_slug: args.worldSlug,
    validator_name: "atomic_source_parse",
    severity: args.severity,
    code: args.code,
    message: args.message,
    node_id: null,
    file_path: args.filePath,
    line_range_start: args.lineStart,
    line_range_end: args.lineEnd,
    created_at: new Date().toISOString()
  };
}

function emptyTree(): Root {
  return { type: "root", children: [] };
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
