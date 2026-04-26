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

const ATOMIC_DIRS = new Map<string, { nodeType: NodeType; idField: string }>([
  ["canon", { nodeType: "canon_fact_record", idField: "id" }],
  ["change-log", { nodeType: "change_log_entry", idField: "change_id" }],
  ["invariants", { nodeType: "invariant", idField: "id" }],
  ["mystery-reserve", { nodeType: "mystery_reserve_entry", idField: "id" }],
  ["open-questions", { nodeType: "open_question_entry", idField: "id" }],
  ["entities", { nodeType: "named_entity", idField: "id" }],
  ["everyday-life", { nodeType: "section", idField: "id" }],
  ["institutions", { nodeType: "section", idField: "id" }],
  ["magic-or-tech-systems", { nodeType: "section", idField: "id" }],
  ["geography", { nodeType: "section", idField: "id" }],
  ["economy-and-resources", { nodeType: "section", idField: "id" }],
  ["peoples-and-species", { nodeType: "section", idField: "id" }],
  ["timeline", { nodeType: "section", idField: "id" }]
]);

const STRUCTURED_ID_REGEX = /\b(CF|CH|M)-\d+\b/g;

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
  const nodeId = stringField(record, spec.idField) ?? syntheticAtomicNodeId(worldSlug, relativeFilePath);
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

function specForAtomicPath(relativeFilePath: string): { nodeType: NodeType; idField: string } {
  const segments = relativeFilePath.split("/");
  const sourceDirectory = segments[1];
  const spec = sourceDirectory ? ATOMIC_DIRS.get(sourceDirectory) : undefined;
  if (!spec) {
    throw new Error(`Unsupported atomic source path '${relativeFilePath}'.`);
  }
  return spec;
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
