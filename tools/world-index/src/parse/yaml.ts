import type { Code, Content, Heading, Parent, Root, RootContent } from "mdast";
import YAML from "yaml";

import { anchorChecksum, contentHashForProse, contentHashForYaml } from "./canonical";
import { CURRENT_INDEX_VERSION } from "../schema/version";
import type {
  CanonFactRecord,
  ChangeLogEntry,
  NodeRow,
  NodeType,
  ValidationResultRow
} from "../schema/types";

type SectionKind = "canon_fact_records" | "change_log" | "other";

interface HeadingInfo {
  depth: number;
  line: number;
  text: string;
}

const UNKNOWN_WORLD_SLUG = "__unknown__";

export function extractYamlNodes(
  tree: Root,
  lines: string[],
  filePath: string
): { nodes: NodeRow[]; parseIssues: ValidationResultRow[] } {
  const headings = collectHeadings(tree);
  const codeNodes = collectYamlCodeNodes(tree);
  const worldSlug = deriveWorldSlug(filePath);
  const nodes: NodeRow[] = [];
  const parseIssues: ValidationResultRow[] = [];

  for (const codeNode of codeNodes) {
    const lineStart = codeNode.position?.start.line ?? 1;
    const lineEnd = codeNode.position?.end.line ?? lineStart;
    const section = findContainingSection(codeNode, tree);
    const headingPath = findHeadingPathForLine(lineStart, headings);
    const rawYaml = codeNode.value;

    if (section === "other") {
      parseIssues.push(
        createParseIssue({
          worldSlug,
          filePath,
          lineStart,
          lineEnd,
          severity: "info",
          code: "unexpected_yaml_section",
          message: `YAML block is outside the canonical ledger sections (found under ${
            headingPath ?? "document root"
          }).`
        })
      );
    }

    try {
      const parsed = YAML.parse(rawYaml) as unknown;
      const kindNodeType = nodeTypeForSection(section);

      if (section === "canon_fact_records") {
        const missingFields = missingCanonFactFields(parsed);
        if (missingFields.length > 0) {
          parseIssues.push(
            createParseIssue({
              worldSlug,
              filePath,
              lineStart,
              lineEnd,
              severity: "warn",
              code: `missing_required_field:${missingFields[0]}`,
              message: `Canon Fact Record is missing required field '${missingFields[0]}'.`
            })
          );
        }

        const narrowed = narrowToCanonFactRecord(parsed);
        nodes.push(
          createNodeRow({
            codeNode,
            lines,
            filePath,
            worldSlug,
            headingPath,
            nodeType: kindNodeType,
            nodeId: narrowed?.id ?? syntheticNodeId(worldSlug, filePath, lineStart, lineEnd),
            body: rawYaml,
            contentHash: contentHashForYaml(parsed)
          })
        );
        continue;
      }

      if (section === "change_log") {
        const missingFields = missingChangeLogFields(parsed);
        if (missingFields.length > 0) {
          parseIssues.push(
            createParseIssue({
              worldSlug,
              filePath,
              lineStart,
              lineEnd,
              severity: "warn",
              code: `missing_required_field:${missingFields[0]}`,
              message: `Change Log Entry is missing required field '${missingFields[0]}'.`
            })
          );
        }

        const narrowed = narrowToChangeLogEntry(parsed);
        nodes.push(
          createNodeRow({
            codeNode,
            lines,
            filePath,
            worldSlug,
            headingPath,
            nodeType: kindNodeType,
            nodeId: narrowed?.change_id ?? syntheticNodeId(worldSlug, filePath, lineStart, lineEnd),
            body: rawYaml,
            contentHash: contentHashForYaml(parsed)
          })
        );
        continue;
      }

      nodes.push(
        createNodeRow({
          codeNode,
          lines,
          filePath,
          worldSlug,
          headingPath,
          nodeType: kindNodeType,
          nodeId: syntheticNodeId(worldSlug, filePath, lineStart, lineEnd),
          body: rawYaml,
          contentHash: contentHashForYaml(parsed)
        })
      );
    } catch (error) {
      const nodeType = nodeTypeForSection(section);
      const parseMessage = error instanceof Error ? error.message : String(error);

      parseIssues.push(
        createParseIssue({
          worldSlug,
          filePath,
          lineStart,
          lineEnd,
          severity: "warn",
          code: "yaml_syntax_error",
          message: parseMessage
        })
      );

      nodes.push(
        createNodeRow({
          codeNode,
          lines,
          filePath,
          worldSlug,
          headingPath,
          nodeType,
          nodeId: syntheticNodeId(worldSlug, filePath, lineStart, lineEnd),
          body: rawYaml,
          contentHash: contentHashForProse(rawYaml)
        })
      );
    }
  }

  return { nodes, parseIssues };
}

function findContainingSection(codeNode: Code, tree: Root): SectionKind {
  const headings = collectHeadings(tree);
  const line = codeNode.position?.start.line ?? 1;
  let currentSection: string | null = null;

  for (const heading of headings) {
    if (heading.line > line) {
      break;
    }
    if (heading.depth === 2) {
      currentSection = normalizeHeadingText(heading.text);
    }
  }

  if (currentSection === "canon fact records") {
    return "canon_fact_records";
  }
  if (currentSection === "change log") {
    return "change_log";
  }
  return "other";
}

function narrowToCanonFactRecord(raw: unknown): CanonFactRecord | null {
  if (missingCanonFactFields(raw).length > 0) {
    return null;
  }

  return raw as CanonFactRecord;
}

function narrowToChangeLogEntry(raw: unknown): ChangeLogEntry | null {
  if (missingChangeLogFields(raw).length > 0) {
    return null;
  }

  return raw as ChangeLogEntry;
}

function missingCanonFactFields(raw: unknown): string[] {
  if (!isRecord(raw)) {
    return ["id"];
  }

  const missing: string[] = [];

  requireString(raw, "id", missing);
  requireString(raw, "title", missing);
  requireString(raw, "status", missing);
  requireString(raw, "type", missing);
  requireString(raw, "statement", missing);
  requireNestedStrings(raw, "scope", ["geographic", "temporal", "social"], missing);
  requireCanonTruthScope(raw, missing);
  requireStringArray(raw, "domains_affected", missing);
  requireStringArray(raw, "required_world_updates", missing);
  requireNestedBoolean(raw, "source_basis", "direct_user_approval", missing);

  return missing;
}

function missingChangeLogFields(raw: unknown): string[] {
  if (!isRecord(raw)) {
    return ["change_id"];
  }

  const missing: string[] = [];

  requireString(raw, "change_id", missing);
  requireString(raw, "date", missing);
  requireString(raw, "change_type", missing);
  requireStringArray(raw, "affected_fact_ids", missing);
  requireString(raw, "summary", missing);
  requireStringArray(raw, "reason", missing);
  requireChangeLogScope(raw, missing);
  requireStringArray(raw, "downstream_updates", missing);
  requireStringArray(raw, "impact_on_existing_texts", missing);
  requireNumber(raw, "severity_before_fix", missing);
  requireNumber(raw, "severity_after_fix", missing);
  requireNestedBooleans(
    raw,
    "retcon_policy_checks",
    [
      "no_silent_edit",
      "replacement_noted",
      "no_stealth_diegetic_rewrite",
      "net_contradictions_not_increased",
      "world_identity_preserved"
    ],
    missing
  );

  return missing;
}

function createNodeRow(args: {
  codeNode: Code;
  lines: string[];
  filePath: string;
  worldSlug: string;
  headingPath: string | null;
  nodeType: NodeType;
  nodeId: string;
  body: string;
  contentHash: string;
}): NodeRow {
  const lineStart = args.codeNode.position?.start.line ?? 1;
  const lineEnd = args.codeNode.position?.end.line ?? lineStart;

  return {
    node_id: args.nodeId,
    world_slug: args.worldSlug,
    file_path: args.filePath,
    heading_path: args.headingPath,
    byte_start: args.codeNode.position?.start.offset ?? 0,
    byte_end: args.codeNode.position?.end.offset ?? 0,
    line_start: lineStart,
    line_end: lineEnd,
    node_type: args.nodeType,
    body: args.body,
    content_hash: args.contentHash,
    anchor_checksum: anchorChecksum(args.lines, lineStart, lineEnd),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
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
    validator_name: "yaml_parse_integrity",
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

function collectYamlCodeNodes(tree: Root): Code[] {
  const codeNodes: Code[] = [];

  visit(tree, (node) => {
    if (node.type === "code" && node.lang === "yaml") {
      codeNodes.push(node);
    }
  });

  return codeNodes;
}

function collectHeadings(tree: Root): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  visit(tree, (node) => {
    if (node.type !== "heading") {
      return;
    }

    headings.push({
      depth: node.depth,
      line: node.position?.start.line ?? 1,
      text: headingText(node)
    });
  });

  headings.sort((left, right) => left.line - right.line);
  return headings;
}

function findHeadingPathForLine(line: number, headings: HeadingInfo[]): string | null {
  const active: Array<string | null> = [];

  for (const heading of headings) {
    if (heading.line > line) {
      break;
    }
    active[heading.depth - 1] = heading.text;
    active.length = heading.depth;
  }

  const parts = active.filter((value): value is string => typeof value === "string" && value.length > 0);
  return parts.length > 0 ? parts.join(" > ") : null;
}

function headingText(heading: Heading): string {
  return heading.children.map(textFromNode).join("").trim();
}

function textFromNode(node: RootContent): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }

  if ("children" in node) {
    return node.children.map((child) => textFromNode(child as RootContent)).join("");
  }

  return "";
}

function visit(node: Root | Content, callback: (node: Content) => void): void {
  if (node.type !== "root") {
    callback(node);
  }

  const children = "children" in node ? (node as Parent).children : [];
  for (const child of children) {
    visit(child as Content, callback);
  }
}

function nodeTypeForSection(section: SectionKind): NodeType {
  if (section === "canon_fact_records") {
    return "canon_fact_record";
  }
  if (section === "change_log") {
    return "change_log_entry";
  }
  return "section";
}

function syntheticNodeId(
  worldSlug: string,
  filePath: string,
  lineStart: number,
  lineEnd: number
): string {
  return `${worldSlug}:${filePath}:yaml:${lineStart}-${lineEnd}`;
}

function deriveWorldSlug(filePath: string): string {
  const match = filePath.match(/(?:^|\/)worlds\/([^/]+)\//);
  return match?.[1] ?? UNKNOWN_WORLD_SLUG;
}

function normalizeHeadingText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  missing: string[]
): void {
  if (typeof record[field] !== "string") {
    missing.push(field);
  }
}

function requireNumber(
  record: Record<string, unknown>,
  field: string,
  missing: string[]
): void {
  if (typeof record[field] !== "number") {
    missing.push(field);
  }
}

function requireStringArray(
  record: Record<string, unknown>,
  field: string,
  missing: string[]
): void {
  const value = record[field];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    missing.push(field);
  }
}

function requireNestedStrings(
  record: Record<string, unknown>,
  field: string,
  keys: string[],
  missing: string[]
): void {
  const nested = record[field];
  if (!isRecord(nested)) {
    missing.push(field);
    return;
  }

  for (const key of keys) {
    const value = nested[key];
    if (typeof value !== "string") {
      missing.push(key);
    }
  }
}

function requireNestedBoolean(
  record: Record<string, unknown>,
  field: string,
  key: string,
  missing: string[]
): void {
  const nested = record[field];
  if (!isRecord(nested) || typeof nested[key] !== "boolean") {
    missing.push(key);
  }
}

function requireNestedBooleans(
  record: Record<string, unknown>,
  field: string,
  keys: string[],
  missing: string[]
): void {
  const nested = record[field];
  if (!isRecord(nested)) {
    missing.push(field);
    return;
  }

  for (const key of keys) {
    if (typeof nested[key] !== "boolean") {
      missing.push(key);
    }
  }
}

function requireChangeLogScope(record: Record<string, unknown>, missing: string[]): void {
  const nested = record.scope;
  if (!isRecord(nested)) {
    missing.push("scope");
    return;
  }

  if (typeof nested.local_or_global !== "string") {
    missing.push("local_or_global");
  }
  if (typeof nested.changes_ordinary_life !== "boolean") {
    missing.push("changes_ordinary_life");
  }
  if (typeof nested.creates_new_story_engines !== "boolean") {
    missing.push("creates_new_story_engines");
  }
  if (typeof nested.mystery_reserve_effect !== "string") {
    missing.push("mystery_reserve_effect");
  }
}

function requireCanonTruthScope(record: Record<string, unknown>, missing: string[]): void {
  const nested = record.truth_scope;
  if (!isRecord(nested)) {
    missing.push("truth_scope");
    return;
  }

  const worldLevel = nested.world_level;
  if (worldLevel !== true && worldLevel !== false && worldLevel !== "uncertain") {
    missing.push("world_level");
  }
  if (typeof nested.diegetic_status !== "string") {
    missing.push("diegetic_status");
  }
}
