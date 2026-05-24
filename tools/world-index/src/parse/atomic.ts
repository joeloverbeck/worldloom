import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { Root } from "mdast";

import type { ParsedFileResult } from "../commands/shared.js";
import { contentHashForProse, contentHashForYaml, anchorChecksum } from "./canonical.js";
import { parseYamlWithRecovery } from "./yaml.js";
import { domainFileNodeId } from "./prose.js";
import { STORY_SOURCE_DIRECTORY_SPECS } from "./story-directories.js";
import { CURRENT_INDEX_VERSION } from "../schema/version.js";
import { sha256Hex } from "../hash/content.js";
import type { EdgeRow, NodeRow, NodeType, SltProjectionRow, ValidationResultRow } from "../schema/types.js";
import type { EntityRegistry, EntityRegistryEntry } from "./entities.js";

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
const STORY_DIRS = new Map(
  STORY_SOURCE_DIRECTORY_SPECS.map(({ directory, nodeType, idField, idPatternSource }) => [
    directory,
    recordSpec(nodeType, idField, idPatternSource)
  ])
);
const STORY_DIR_ORDER = new Map(Array.from(STORY_DIRS.keys()).map((directory, index) => [directory, index]));

const STRUCTURED_ID_REGEX = /\b(CF|CH|M)-\d+\b/g;
const STORY_REF_REGEX =
  /\b(STENT|STCHAR|STSTAT|SF|SE|BEL|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|BR|PG|CHC|SLT|CLK|STSEC|STQ|STPLAN|STEMO|DA)-[A-Za-z0-9-]+\b/g;
const CANON_FACT_REF_REGEX = /^CF-\d+$/;
const MYSTERY_RESERVE_REF_REGEX = /^M-\d+$/;

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

  for (const storyEntry of readdirSync(storiesDirectory, { withFileTypes: true })) {
    if (!storyEntry.isDirectory()) {
      continue;
    }
    const stcharDirectory = path.join(storiesDirectory, storyEntry.name, "story-characters");
    if (!existsSync(stcharDirectory)) {
      continue;
    }
    for (const entry of readdirSync(stcharDirectory, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        relativePaths.push(toPosixPath(path.join("stories", storyEntry.name, "story-characters", entry.name)));
      }
    }
  }

  return relativePaths.sort(compareStoryBundleSourcePaths);
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
      sltProjections: [],
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
    sltProjections: [],
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
    parsed = spec.hybrid ? parseHybridFrontmatter(source) : parseYamlWithRecovery(source);
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
      contentHash: spec.hybrid ? sha256Hex(source) : contentHashForProse(source),
      nodes: [],
      edges: [],
      sltProjections: [],
      validationResults,
      skippedRecords: [],
      yamlBlockCount: spec.hybrid ? 0 : 1,
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
      contentHash: spec.hybrid ? sha256Hex(source) : contentHashForProse(source),
      nodes: [],
      edges: [],
      sltProjections: [],
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
    contentHash: spec.hybrid ? contentHashForProse(source) : contentHashForYaml(parsed)
  });

  edges.push(...edgesForStoryRecord(node, record, spec.storySlug));

  return {
    relativeFilePath,
    contentHash: spec.hybrid ? sha256Hex(source) : contentHashForProse(source),
    nodes: [node],
    edges,
    sltProjections:
      spec.nodeType === "storylet_record" ? [sltProjectionForStorylet(node, record, spec.storySlug)] : [],
    validationResults,
    skippedRecords: [],
    yamlBlockCount: spec.hybrid ? 0 : 1,
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
      sltProjections: [],
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
  hybrid: boolean;
} {
  const segments = relativeFilePath.split("/");
  const storySlug = segments[1];
  if (storySlug && segments[2] === "story-characters") {
    return {
      ...recordSpec("story_character_authority_record", "id", "^STCHAR-[0-9]+$"),
      storySlug,
      hybrid: true
    };
  }
  const sourceDirectory = segments[3];
  const spec = sourceDirectory ? STORY_DIRS.get(sourceDirectory) : undefined;
  if (!storySlug || !spec) {
    throw new Error(`Unsupported story-bundle source path '${relativeFilePath}'.`);
  }
  return { ...spec, storySlug, hybrid: false };
}

function parseHybridFrontmatter(source: string): unknown {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error("Hybrid story record is missing opening YAML frontmatter fence.");
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    throw new Error("Hybrid story record is missing closing YAML frontmatter fence.");
  }
  return parseYamlWithRecovery(lines.slice(1, closingIndex).join("\n"));
}

function compareStoryBundleSourcePaths(left: string, right: string): number {
  const leftSegments = left.split("/");
  const rightSegments = right.split("/");
  const leftStory = leftSegments[1] ?? "";
  const rightStory = rightSegments[1] ?? "";
  const storyOrder = leftStory.localeCompare(rightStory, "en-US");
  if (storyOrder !== 0) {
    return storyOrder;
  }

  const leftDirectory = leftSegments[3] ?? "";
  const rightDirectory = rightSegments[3] ?? "";
  const leftOrder = STORY_DIR_ORDER.get(leftDirectory) ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = STORY_DIR_ORDER.get(rightDirectory) ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.localeCompare(right, "en-US");
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
    pushStoryRef("stent_character_authority", stringField(record, "bound_stchar_id"));
  }

  if (node.node_type === "story_fact_record") {
    for (const target of stringArrayField(record, "derived_from")) {
      if (CANON_FACT_REF_REGEX.test(target)) {
        push(createRefEdge(node.node_id, "story_fact_derived_from", target));
      }
    }
  }

  if (node.node_type === "story_event_record") {
    for (const edge of edgesForStoryEvent(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "belief_record") {
    for (const edge of edgesForStoryBelief(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "relationship_record_story") {
    for (const edge of edgesForStoryRelationship(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "intention_record") {
    for (const edge of edgesForStoryIntention(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_status_record") {
    for (const edge of edgesForStoryStatus(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "pressure_clock_record") {
    for (const edge of edgesForStoryClock(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_secret_record") {
    for (const edge of edgesForStorySecret(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_question_record") {
    for (const edge of edgesForStoryQuestion(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_plan_record") {
    for (const edge of edgesForStoryPlan(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_emotion_record") {
    for (const edge of edgesForStoryEmotion(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "story_character_authority_record") {
    for (const edge of edgesForStoryCharacterAuthority(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "choice_record") {
    for (const edge of edgesForChoice(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "storylet_record") {
    for (const edge of edgesForStorylet(node, record, storySlug)) {
      push(edge);
    }
  }

  if (node.node_type === "page_record") {
    for (const edge of edgesForPage(node, record, storySlug)) {
      push(edge);
    }
  }

  pushStoryRef("created_at_page", stringField(record, "created_at_page"));
  pushStoryRef("created_at_page", stringField(record, "created_at_page", ["provenance"]));

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
    pushStoryEdgeIfReference(
      edges,
      node.node_id,
      "obligation_owed_by",
      storySlug,
      stringField(record, "owed_by")
    );
    pushStoryEdgeIfReference(
      edges,
      node.node_id,
      "obligation_owed_to",
      storySlug,
      stringField(record, "owed_to")
    );
  }

  if (node.node_type === "consequence_record") {
    for (const target of stringArrayField(record, "derived_from")) {
      pushStoryEdgeIfReference(edges, node.node_id, "consequence_derived_from", storySlug, target);
    }
  }

  if (node.node_type === "thread_record") {
    for (const target of stringArrayField(record, "obligations")) {
      pushStoryRef("thread_obligation", target);
    }
    for (const target of stringArrayField(record, "derived_from")) {
      pushStoryEdgeIfReference(edges, node.node_id, "thread_derived_from", storySlug, target);
    }
  }

  return edges;
}

function edgesForStoryCharacterAuthority(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const sourceCharId = stringField(record, "source_char_id");
  if (sourceCharId !== null) {
    edges.push(createRefEdge(node.node_id, "stchar_source_character", sourceCharId));
  }

  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "stchar_supersedes",
    storySlug,
    stringField(record, "supersedes")
  );

  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "stchar_superseded_by",
    storySlug,
    stringField(record, "superseded_by")
  );

  for (const target of stringArrayField(record, "bound_stent_ids")) {
    pushStoryEdgeIfReference(edges, node.node_id, "stchar_bound_stent", storySlug, target);
  }

  return edges;
}

function edgesForChoice(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of stringArrayField(record, "records", ["grounded_in"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "choice_grounded_in", storySlug, target);
  }

  const parentPageId = stringField(record, "created_at_page");
  const parentPageNodeId =
    parentPageId && isStoryRecordReference(parentPageId) ? storyNodeId(storySlug, parentPageId) : node.node_id;
  for (const ordinal of numberArrayField(record, "affordance_ordinals", ["grounded_in"])) {
    edges.push(
      createStoryAttributeEdge(
        node.node_id,
        "choice_affordance_ordinal",
        storySlug,
        `${parentPageNodeId}#affordance:${ordinal}`
      )
    );
  }

  return edges;
}

function edgesForStorylet(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of storyRefsInRecordArrayField(record, "hard", ["preconditions"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "storylet_predicate_ref", storySlug, target);
  }

  for (const target of storyRefsInRecordArrayField(record, "soft", ["preconditions"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "storylet_predicate_ref", storySlug, target);
  }

  for (const field of ["create", "supersede", "close"]) {
    for (const target of stringArrayField(record, field, ["effects"])) {
      pushStoryEdgeIfReference(edges, node.node_id, "storylet_effect_ref", storySlug, target);
    }
  }

  for (const exitOption of recordArrayField(record, "exit_options")) {
    for (const target of stringArrayField(exitOption, "likely_effects")) {
      pushStoryEdgeIfReference(edges, node.node_id, "storylet_exit_likely_effect_ref", storySlug, target);
    }
  }

  for (const driver of uniqueSortedStrings(stringArrayField(record, "compatible_turn_drivers", ["grounding"]))) {
    edges.push(createStoryAttributeEdge(node.node_id, "storylet_compatible_driver", storySlug, driver));
  }

  for (const pred of predicatePreds(record)) {
    edges.push(createStoryAttributeEdge(node.node_id, "storylet_predicate_pred", storySlug, pred));
  }

  for (const referencedClass of predicateReferencedClasses(record)) {
    edges.push(createStoryAttributeEdge(node.node_id, "storylet_predicate_class", storySlug, referencedClass));
  }

  for (const actionFamily of uniqueSortedStrings(
    recordArrayField(record, "exit_options").flatMap((exitOption) =>
      stringField(exitOption, "action_family") ? [stringField(exitOption, "action_family") as string] : []
    )
  )) {
    edges.push(createStoryAttributeEdge(node.node_id, "storylet_action_family", storySlug, actionFamily));
  }

  return edges;
}

function sltProjectionForStorylet(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): SltProjectionRow {
  const branchPathPrefix = stringArrayField(record, "visible_branch_path_prefix", ["scope"]);
  const cooldownPages = numberField(record, "cooldown_pages", ["saliency"]);
  const projectionPayload = {
    slt_scope_visibility: stringField(record, "visibility", ["scope"]),
    slt_scope_branch_id: stringField(record, "branch_id", ["scope"]),
    slt_scope_branch_path_prefix: branchPathPrefix,
    slt_provenance_origin: stringField(record, "origin", ["provenance"]),
    slt_move_family: stringField(record, "move_family"),
    slt_saliency_urgency: stringField(record, "urgency", ["saliency"]),
    slt_saliency_cooldown_pages: cooldownPages,
    slt_mystery_policy_allowed_authority: stringField(record, "allowed_authority", ["mystery_policy"])
  };

  return {
    node_id: node.node_id,
    world_slug: node.world_slug,
    story_slug: storySlug,
    slt_scope_visibility: projectionPayload.slt_scope_visibility,
    slt_scope_branch_id: projectionPayload.slt_scope_branch_id,
    slt_scope_branch_path_prefix: branchPathPrefix.length > 0 ? JSON.stringify(branchPathPrefix) : null,
    slt_provenance_origin: projectionPayload.slt_provenance_origin,
    slt_move_family: projectionPayload.slt_move_family,
    slt_saliency_urgency: projectionPayload.slt_saliency_urgency,
    slt_saliency_cooldown_pages: cooldownPages,
    slt_mystery_policy_allowed_authority: projectionPayload.slt_mystery_policy_allowed_authority,
    candidate_projection_hash: sha256Hex(JSON.stringify(projectionPayload))
  };
}

function edgesForPage(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of stringArraysInRecordField(record, "active_records", ["state_snapshot"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "page_active_record", storySlug, target);
  }

  for (const affordance of recordArrayField(record, "visible_affordances", ["state_snapshot"])) {
    for (const target of stringArrayField(affordance, "grounded_in")) {
      pushStoryEdgeIfReference(edges, node.node_id, "page_visible_affordance_record", storySlug, target);
    }
  }

  for (const target of stringArrayField(record, "emitted_choices")) {
    pushStoryEdgeIfReference(edges, node.node_id, "page_emitted_choice", storySlug, target);
  }

  return edges;
}

function edgesForStoryBelief(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const holder = stringField(record, "holder");
  if (holder) {
    edges.push(createStoryRefEdge(node.node_id, "belief_holder", storySlug, holder));
  }

  const sourceEvent = stringField(record, "source_event", ["basis"]);
  if (sourceEvent) {
    edges.push(createStoryRefEdge(node.node_id, "belief_basis_event", storySlug, sourceEvent));
  }

  for (const target of stringArrayField(record, "access_records", ["basis"])) {
    edges.push(createStoryRefEdge(node.node_id, "belief_access_record", storySlug, target));
  }

  for (const target of stringArrayField(record, "opens", ["consequences"])) {
    edges.push(createStoryRefEdge(node.node_id, "belief_opens", storySlug, target));
  }

  return edges;
}

function edgesForStoryRelationship(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of stringArrayField(record, "participants")) {
    edges.push(createStoryRefEdge(node.node_id, "relationship_participant", storySlug, target));
  }

  for (const target of stringArrayField(record, "derived_from")) {
    edges.push(createStoryRefEdge(node.node_id, "relationship_derived_from", storySlug, target));
  }

  return edges;
}

function edgesForStoryIntention(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const holder = stringField(record, "holder");
  if (holder) {
    edges.push(createStoryRefEdge(node.node_id, "intention_holder", storySlug, holder));
  }

  const supersedes = stringField(record, "supersedes");
  if (supersedes) {
    edges.push(createStoryRefEdge(node.node_id, "intention_supersedes", storySlug, supersedes));
  }

  return edges;
}

function edgesForStoryStatus(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const entity = stringField(record, "entity");
  if (entity) {
    edges.push(createStoryRefEdge(node.node_id, "status_entity", storySlug, entity));
  }

  return edges;
}

function edgesForStoryClock(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of stringArrayField(record, "linked_records")) {
    edges.push(createStoryRefEdge(node.node_id, "clock_linked_record", storySlug, target));
  }

  const driver = stringField(record, "driver");
  if (driver && isStoryRecordReference(driver)) {
    edges.push(createStoryRefEdge(node.node_id, "clock_driver", storySlug, driver));
  }

  for (const tick of recordArrayField(record, "tick_history")) {
    const event = stringField(tick, "event");
    if (event) {
      edges.push(createStoryRefEdge(node.node_id, "clock_tick_event", storySlug, event));
    }
  }

  return edges;
}

function edgesForStorySecret(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const truthAnchor = stringField(record, "truth_anchor");
  if (truthAnchor) {
    edges.push(createStoryRefEdge(node.node_id, "secret_truth_anchor", storySlug, truthAnchor));
  }

  for (const holder of stringArrayField(record, "holders")) {
    if (isStoryRecordReference(holder)) {
      edges.push(createStoryRefEdge(node.node_id, "secret_holder", storySlug, holder));
    }
  }

  for (const carrier of recordArrayField(record, "clue_carriers")) {
    const carrierRecord = stringField(carrier, "record");
    if (carrierRecord) {
      edges.push(createStoryRefEdge(node.node_id, "secret_clue_carrier", storySlug, carrierRecord));
    }
  }

  for (const target of stringArrayField(record, "reveal_records")) {
    edges.push(createStoryRefEdge(node.node_id, "secret_reveal_record", storySlug, target));
  }

  for (const target of stringArrayField(record, "protected_mystery_refs")) {
    if (MYSTERY_RESERVE_REF_REGEX.test(target)) {
      edges.push(createRefEdge(node.node_id, "secret_protected_mystery", target));
    }
  }

  for (const target of stringArrayField(record, "source_records")) {
    pushStoryEdgeIfReference(edges, node.node_id, "secret_source_record", storySlug, target);
  }

  return edges;
}

function edgesForStoryQuestion(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  for (const target of stringArrayField(record, "source_records")) {
    edges.push(createStoryRefEdge(node.node_id, "story_question_source", storySlug, target));
  }

  const payoffOf = stringField(record, "payoff_of");
  if (payoffOf) {
    edges.push(createStoryRefEdge(node.node_id, "story_question_payoff_of", storySlug, payoffOf));
  }

  for (const target of stringArrayField(record, "answer_records")) {
    edges.push(createStoryRefEdge(node.node_id, "story_question_answer_record", storySlug, target));
  }

  return edges;
}

function edgesForStoryPlan(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  pushStoryEdgeIfReference(edges, node.node_id, "plan_holder", storySlug, stringField(record, "holder"));
  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "plan_root_intention",
    storySlug,
    stringField(record, "root_intention")
  );

  for (const target of stringArrayField(record, "belief_basis")) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_belief_basis", storySlug, target);
  }

  for (const field of ["facts", "objects", "locations", "artifacts", "relationships", "obligations"]) {
    for (const target of stringArrayField(record, field, ["resource_basis"])) {
      pushStoryEdgeIfReference(edges, node.node_id, "plan_resource_basis", storySlug, target);
    }
  }

  for (const target of stringArrayField(record, "blockers")) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_blocker", storySlug, target);
  }

  for (const target of stringArrayField(record, "target_records", ["current_step"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_current_step_target", storySlug, target);
  }

  for (const target of storyRefsInRecordArrayField(record, "predicates", ["current_step", "success_condition"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_success_predicate_ref", storySlug, target);
  }

  for (const fallbackStep of recordArrayField(record, "fallback_steps")) {
    for (const target of stringArrayField(fallbackStep, "target_records")) {
      pushStoryEdgeIfReference(edges, node.node_id, "plan_fallback_step_target", storySlug, target);
    }
    for (const target of storyRefsInRecordArrayField(fallbackStep, "trigger_predicates")) {
      pushStoryEdgeIfReference(edges, node.node_id, "plan_fallback_predicate_ref", storySlug, target);
    }
  }

  for (const target of stringArrayField(record, "derived_from")) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_derived_from", storySlug, target);
  }

  for (const target of storyRefsInString(stringField(record, "expires_when"))) {
    pushStoryEdgeIfReference(edges, node.node_id, "plan_expires_when_ref", storySlug, target);
  }

  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "plan_created_by_event",
    storySlug,
    stringField(record, "created_by_event")
  );
  pushStoryEdgeIfReference(edges, node.node_id, "plan_supersedes", storySlug, stringField(record, "supersedes"));

  return edges;
}

function edgesForStoryEmotion(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  pushStoryEdgeIfReference(edges, node.node_id, "emotion_holder", storySlug, stringField(record, "holder"));
  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "emotion_trigger_event",
    storySlug,
    stringField(record, "trigger_event")
  );

  for (const target of stringArrayField(record, "appraisal_basis")) {
    pushStoryEdgeIfReference(edges, node.node_id, "emotion_appraisal_basis", storySlug, target);
  }

  for (const target of stringArrayField(record, "toward_records", ["orientation"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "emotion_oriented_toward", storySlug, target);
  }

  pushStoryEdgeIfReference(
    edges,
    node.node_id,
    "emotion_supersedes",
    storySlug,
    stringField(record, "supersedes")
  );

  for (const target of stringArrayField(record, "derived_from")) {
    pushStoryEdgeIfReference(edges, node.node_id, "emotion_derived_from", storySlug, target);
  }

  for (const target of storyRefsInString(stringField(record, "expires_when"))) {
    pushStoryEdgeIfReference(edges, node.node_id, "emotion_expires_when_ref", storySlug, target);
  }

  return edges;
}

function edgesForStoryEvent(
  node: NodeRow,
  record: Record<string, unknown>,
  storySlug: string
): Array<Omit<EdgeRow, "edge_id">> {
  const edges: Array<Omit<EdgeRow, "edge_id">> = [];

  const actor = stringField(record, "actor");
  if (actor && isStoryRecordReference(actor)) {
    edges.push(createStoryRefEdge(node.node_id, "event_actor", storySlug, actor));
  }

  for (const target of stringArrayField(record, "targets")) {
    edges.push(createStoryRefEdge(node.node_id, "event_target", storySlug, target));
  }

  const selectedStorylet = stringField(record, "selected_slt_id", ["commitment"]);
  if (selectedStorylet) {
    edges.push(createStoryRefEdge(node.node_id, "event_selected_storylet", storySlug, selectedStorylet));
  }

  for (const target of stringArrayField(record, "create", ["state_delta"])) {
    edges.push(createStoryRefEdge(node.node_id, "state_delta_create", storySlug, target));
  }

  for (const target of stringArrayField(record, "supersede", ["state_delta"])) {
    edges.push(createStoryRefEdge(node.node_id, "state_delta_supersede", storySlug, target));
  }

  for (const target of stringArrayField(record, "close", ["state_delta"])) {
    edges.push(createStoryRefEdge(node.node_id, "state_delta_close", storySlug, target));
  }

  for (const relation of recordArrayField(record, "state_relations")) {
    pushStoryEdgeIfReference(
      edges,
      node.node_id,
      "event_state_relation_target",
      storySlug,
      stringField(relation, "target_record")
    );
  }

  for (const target of stringValuesInRecordField(record, "alias_bindings", ["commitment"])) {
    pushStoryEdgeIfReference(edges, node.node_id, "event_alias_binding", storySlug, target);
  }

  for (const introduction of recordArrayField(record, "record_introductions")) {
    const introducedRecordId = stringField(introduction, "record_id");
    if (!introducedRecordId) {
      continue;
    }
    edges.push(createStoryRefEdge(node.node_id, "event_introduces_record", storySlug, introducedRecordId));
    const sourceNodeId = storyNodeId(storySlug, introducedRecordId);
    for (const evidenceId of stringArrayField(introduction, "evidence")) {
      edges.push(createStoryRefEdge(sourceNodeId, "creation_evidence", storySlug, evidenceId));
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

function createStoryAttributeEdge(
  sourceNodeId: string,
  edgeType: EdgeRow["edge_type"],
  storySlug: string,
  targetRef: string
): Omit<EdgeRow, "edge_id"> {
  return {
    source_node_id: sourceNodeId,
    target_node_id: null,
    target_unresolved_ref: targetRef,
    edge_type: edgeType,
    story_slug: storySlug
  };
}

function pushStoryEdgeIfReference(
  edges: Array<Omit<EdgeRow, "edge_id">>,
  sourceNodeId: string,
  edgeType: EdgeRow["edge_type"],
  storySlug: string,
  targetRef: string | null
): void {
  if (targetRef && isStoryRecordReference(targetRef)) {
    edges.push(createStoryRefEdge(sourceNodeId, edgeType, storySlug, targetRef));
  }
}

function storyNodeId(storySlug: string, recordId: string): string {
  return `${storySlug}:${recordId}`;
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

function numberField(record: Record<string, unknown>, field: string, nestedPath: string[] = []): number | null {
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
  return typeof value === "number" ? value : null;
}

function numberArrayField(record: Record<string, unknown>, field: string, nestedPath: string[] = []): number[] {
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
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function stringValuesInRecordField(
  record: Record<string, unknown>,
  field: string,
  nestedPath: string[] = []
): string[] {
  let container: unknown = record;
  for (const segment of nestedPath) {
    if (!isRecord(container)) {
      return [];
    }
    container = container[segment];
  }
  if (!isRecord(container) || !isRecord(container[field])) {
    return [];
  }
  return Object.values(container[field]).filter((item): item is string => typeof item === "string");
}

function stringArraysInRecordField(
  record: Record<string, unknown>,
  field: string,
  nestedPath: string[] = []
): string[] {
  let container: unknown = record;
  for (const segment of nestedPath) {
    if (!isRecord(container)) {
      return [];
    }
    container = container[segment];
  }
  if (!isRecord(container) || !isRecord(container[field])) {
    return [];
  }
  return Object.values(container[field]).flatMap((value) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  );
}

function recordArrayField(
  record: Record<string, unknown>,
  field: string,
  nestedPath: string[] = []
): Array<Record<string, unknown>> {
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
  return arrayOfRecords(container[field]);
}

function storyRefsInRecordArrayField(record: Record<string, unknown>, field: string, nestedPath: string[] = []): string[] {
  const refs = new Set<string>();
  for (const item of recordArrayField(record, field, nestedPath)) {
    collectStoryRefsFromPredicateRecord(item, refs);
  }
  return [...refs].sort((left, right) => left.localeCompare(right, "en-US"));
}

function predicatePreds(record: Record<string, unknown>): string[] {
  const preds = new Set<string>();
  for (const predicate of predicateRecords(record)) {
    collectPredicatePreds(predicate, preds);
  }
  return uniqueSortedStrings([...preds]);
}

function collectPredicatePreds(predicate: Record<string, unknown>, preds: Set<string>): void {
  const pred = predicate.pred;
  if (typeof pred === "string") {
    preds.add(predicateName(pred));
  }

  if (isRecord(predicate.predicate)) {
    collectPredicatePreds(predicate.predicate, preds);
  }

  for (const nested of arrayOfRecords(predicate.predicates)) {
    collectPredicatePreds(nested, preds);
  }
}

function predicateReferencedClasses(record: Record<string, unknown>): string[] {
  const classes = new Set<string>();
  for (const predicate of predicateRecords(record)) {
    collectPredicateReferencedClasses(predicate, classes);
  }
  return uniqueSortedStrings([...classes]);
}

function collectPredicateReferencedClasses(predicate: Record<string, unknown>, classes: Set<string>): void {
  for (const field of ["record_class", "holder_role", "kind"]) {
    const value = predicate[field];
    if (typeof value === "string" && value.trim().length > 0) {
      classes.add(value.trim());
    }
  }

  if (isRecord(predicate.predicate)) {
    collectPredicateReferencedClasses(predicate.predicate, classes);
  }

  for (const nested of arrayOfRecords(predicate.predicates)) {
    collectPredicateReferencedClasses(nested, classes);
  }
}

function predicateRecords(record: Record<string, unknown>): Array<Record<string, unknown>> {
  return [
    ...recordArrayField(record, "hard", ["preconditions"]),
    ...recordArrayField(record, "soft", ["preconditions"])
  ];
}

function predicateName(pred: string): string {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(pred.trim());
  return match?.[1] ?? pred.trim();
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0).map((value) => value.trim()))].sort(
    (left, right) => left.localeCompare(right, "en-US")
  );
}

function collectStoryRefsFromPredicateRecord(item: Record<string, unknown>, refs: Set<string>): void {
  for (const value of Object.values(item)) {
    if (typeof value === "string") {
      for (const target of storyRefsInString(value)) {
        refs.add(target);
      }
    }
  }

  if (isRecord(item.predicate)) {
    collectStoryRefsFromPredicateRecord(item.predicate, refs);
  }

  for (const nested of arrayOfRecords(item.predicates)) {
    collectStoryRefsFromPredicateRecord(nested, refs);
  }
}

function storyRefsInString(value: string | null): string[] {
  if (!value) {
    return [];
  }
  const refs = new Set<string>();
  for (const match of value.match(STORY_REF_REGEX) ?? []) {
    refs.add(match);
  }
  STORY_REF_REGEX.lastIndex = 0;
  return [...refs].sort((left, right) => left.localeCompare(right, "en-US"));
}

function isStoryRecordReference(value: string): boolean {
  return /^[A-Z]+-[0-9]+$/.test(value);
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
