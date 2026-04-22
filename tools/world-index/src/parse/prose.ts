import path from "node:path";
import type { Content, Heading, List, Parent, Root, RootContent, Root as MdastRoot } from "mdast";
import YAML from "yaml";

import { anchorChecksum, contentHashForProse } from "./canonical";
import { MANDATORY_WORLD_FILES } from "../enumerate";
import { CURRENT_INDEX_VERSION } from "../schema/version";
import type { NodeRow, NodeType } from "../schema/types";

const STRUCTURED_ID_REGEX = /\b(CF|CH|PA|M|DA|CHAR|PR|BATCH|NCP|NCB|AU|RP)-\d+\b/;
const FILE_RECORD_TYPES = new Map<string, NodeType>([
  ["adjudications", "adjudication_record"],
  ["characters", "character_record"],
  ["diegetic-artifacts", "diegetic_artifact_record"],
  ["proposals", "proposal_card"],
  ["character-proposals", "character_proposal_card"],
  ["audits", "audit_record"]
]);

const WHOLE_FILE_ID_FIELDS = new Map<string, string>([
  ["characters", "character_id"],
  ["diegetic-artifacts", "artifact_id"],
  ["proposals", "proposal_id"],
  ["character-proposals", "proposal_id"],
  ["audits", "audit_id"]
]);

const CANONICAL_ID_REGEX = /^(DA|CHAR|PR|NCP|AU)-\d+$/;

interface HeadingNode {
  depth: number;
  text: string;
  lineStart: number;
  lineEnd: number;
}

interface SpanDefinition {
  lineStart: number;
  lineEnd: number;
  headingPath: string[];
  nodeType: NodeType;
  body: string;
}

export function extractProseNodes(
  tree: Root,
  lines: string[],
  relativeFilePath: string,
  worldSlug: string
): NodeRow[] {
  const domainFileRecord = createDomainFileRecord(lines, relativeFilePath, worldSlug);
  const fileRecord = createWholeFileRecord(lines, relativeFilePath, worldSlug);
  if (fileRecord) {
    return [fileRecord];
  }

  const headings = collectHeadings(tree);
  const spans = createHeadingSpans(headings, lines, relativeFilePath);
  const bulletClusters = createBulletClusterSpans(tree, lines, spans);
  const allSpans = [...spans, ...bulletClusters];
  const occurrences = new Map<string, number>();

  const proseNodes = allSpans.map((span) =>
    createNodeRow({
      worldSlug,
      relativeFilePath,
      nodeType: span.nodeType,
      headingPath: span.headingPath,
      lineStart: span.lineStart,
      lineEnd: span.lineEnd,
      body: span.body,
      lines,
      occurrenceIndex: nextOccurrenceIndex(occurrences, span.headingPath)
    })
  );

  return domainFileRecord ? [domainFileRecord, ...proseNodes] : proseNodes;
}

function createDomainFileRecord(
  lines: string[],
  relativeFilePath: string,
  worldSlug: string
): NodeRow | null {
  if (!MANDATORY_WORLD_FILES.has(relativeFilePath)) {
    return null;
  }

  return createNodeRow({
    worldSlug,
    relativeFilePath,
    nodeType: "domain_file",
    headingPath: [relativeFilePath],
    lineStart: 1,
    lineEnd: lines.length,
    body: lines.join("\n"),
    lines,
    occurrenceIndex: 0,
    preferredNodeId: domainFileNodeId(worldSlug, relativeFilePath)
  });
}

function createWholeFileRecord(
  lines: string[],
  relativeFilePath: string,
  worldSlug: string
): NodeRow | null {
  const segments = relativeFilePath.split("/");
  const firstSegment = segments[0];

  if (!firstSegment || !FILE_RECORD_TYPES.has(firstSegment)) {
    return null;
  }

  if (segments.length === 3 && (segments[1] === "batches" || segments[1] === "retcon-proposals")) {
    const batchType =
      firstSegment === "proposals"
        ? "proposal_batch"
        : firstSegment === "character-proposals"
          ? "character_proposal_batch"
          : "retcon_proposal_card";

    return createNodeRow({
      worldSlug,
      relativeFilePath,
      nodeType: batchType,
      headingPath: [path.basename(relativeFilePath, ".md")],
      lineStart: 1,
      lineEnd: lines.length,
      body: lines.join("\n"),
      lines,
      occurrenceIndex: 0
    });
  }

  if (segments.length === 4 && firstSegment === "audits" && segments[2] === "retcon-proposals") {
    return createNodeRow({
      worldSlug,
      relativeFilePath,
      nodeType: "retcon_proposal_card",
      headingPath: [path.basename(relativeFilePath, ".md")],
      lineStart: 1,
      lineEnd: lines.length,
      body: lines.join("\n"),
      lines,
      occurrenceIndex: 0
    });
  }

  if (segments.length !== 2) {
    return null;
  }

  const canonicalNodeId = canonicalWholeFileNodeId(lines, firstSegment);

  return createNodeRow({
    worldSlug,
    relativeFilePath,
    nodeType: FILE_RECORD_TYPES.get(firstSegment) ?? "section",
    headingPath: [path.basename(relativeFilePath, ".md")],
    lineStart: 1,
    lineEnd: lines.length,
    body: lines.join("\n"),
    lines,
    occurrenceIndex: 0,
    preferredNodeId: canonicalNodeId
  });
}

function createHeadingSpans(
  headings: HeadingNode[],
  lines: string[],
  relativeFilePath: string
): SpanDefinition[] {
  const spans: SpanDefinition[] = [];
  const activePath: string[] = [];

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    if (!heading || heading.depth < 2 || heading.depth > 3) {
      continue;
    }

    activePath.length = heading.depth - 2;
    activePath.push(heading.text);

    const nextBoundary = findNextBoundary(headings, index, heading.depth, lines.length);
    const body = lines.slice(heading.lineStart - 1, nextBoundary).join("\n");
    const nodeType = nodeTypeForHeading(relativeFilePath, heading.depth, heading.text);

    if (!nodeType) {
      continue;
    }

    spans.push({
      lineStart: heading.lineStart,
      lineEnd: nextBoundary,
      headingPath: [...activePath],
      nodeType,
      body
    });
  }

  return spans;
}

function createBulletClusterSpans(
  tree: Root,
  lines: string[],
  headingSpans: SpanDefinition[]
): SpanDefinition[] {
  const clusters: SpanDefinition[] = [];
  const occurrences = new Map<string, number>();

  visitWithAncestors(tree, [], (node, ancestors) => {
    if (node.type !== "list") {
      return;
    }

    if (ancestors.some((ancestor) => ancestor.type === "listItem")) {
      return;
    }

    const lineStart = node.position?.start.line;
    const lineEnd = node.position?.end.line;
    if (!lineStart || !lineEnd) {
      return;
    }

    const container = findContainingHeadingSpan(headingSpans, lineStart, lineEnd);
    if (!container) {
      return;
    }

    const basePath = [...container.headingPath, "bullet-cluster"];
    const occurrenceIndex = nextOccurrenceIndex(occurrences, basePath);
    clusters.push({
      lineStart,
      lineEnd,
      headingPath: [...basePath, String(occurrenceIndex)],
      nodeType: "bullet_cluster",
      body: lines.slice(lineStart - 1, lineEnd).join("\n")
    });
  });

  return clusters;
}

function findContainingHeadingSpan(
  spans: SpanDefinition[],
  lineStart: number,
  lineEnd: number
): SpanDefinition | null {
  const candidates = spans.filter(
    (span) =>
      (span.nodeType === "section" || span.nodeType === "subsection") &&
      span.lineStart <= lineStart &&
      span.lineEnd >= lineEnd
  );

  candidates.sort((left, right) => {
    const leftDepth = left.headingPath.length;
    const rightDepth = right.headingPath.length;
    if (leftDepth !== rightDepth) {
      return rightDepth - leftDepth;
    }
    return left.lineEnd - left.lineStart - (right.lineEnd - right.lineStart);
  });

  return candidates[0] ?? null;
}

function nodeTypeForHeading(
  relativeFilePath: string,
  depth: number,
  headingText: string
): NodeType | null {
  if (relativeFilePath === "MYSTERY_RESERVE.md" && depth === 2) {
    return "mystery_reserve_entry";
  }

  if (relativeFilePath === "OPEN_QUESTIONS.md" && depth === 2) {
    return "open_question_entry";
  }

  if (relativeFilePath === "INVARIANTS.md" && depth === 2) {
    return "invariant";
  }

  if (relativeFilePath === "ONTOLOGY.md" && depth === 2) {
    return "ontology_category";
  }

  if (depth === 2) {
    return "section";
  }

  if (depth === 3) {
    return "subsection";
  }

  if (STRUCTURED_ID_REGEX.test(headingText)) {
    STRUCTURED_ID_REGEX.lastIndex = 0;
    return "section";
  }

  return null;
}

function collectHeadings(tree: MdastRoot): HeadingNode[] {
  const headings: HeadingNode[] = [];

  visitWithAncestors(tree, [], (node) => {
    if (node.type !== "heading") {
      return;
    }

    headings.push({
      depth: node.depth,
      text: headingText(node),
      lineStart: node.position?.start.line ?? 1,
      lineEnd: node.position?.end.line ?? node.position?.start.line ?? 1
    });
  });

  headings.sort((left, right) => left.lineStart - right.lineStart);
  return headings;
}

function findNextBoundary(
  headings: HeadingNode[],
  currentIndex: number,
  currentDepth: number,
  totalLines: number
): number {
  for (let index = currentIndex + 1; index < headings.length; index += 1) {
    const candidate = headings[index];
    if (candidate && candidate.depth <= currentDepth) {
      return candidate.lineStart - 1;
    }
  }

  return totalLines;
}

function createNodeRow(args: {
  worldSlug: string;
  relativeFilePath: string;
  nodeType: NodeType;
  headingPath: string[];
  lineStart: number;
  lineEnd: number;
  body: string;
  lines: string[];
  occurrenceIndex: number;
  preferredNodeId?: string | null;
}): NodeRow {
  const nodeId =
    args.preferredNodeId ??
    structuredIdForPath(args.relativeFilePath) ??
    syntheticNodeId(args.worldSlug, args.relativeFilePath, args.headingPath, args.occurrenceIndex);

  return {
    node_id: nodeId,
    world_slug: args.worldSlug,
    file_path: args.relativeFilePath,
    heading_path: args.headingPath.join(" > "),
    byte_start: 0,
    byte_end: 0,
    line_start: args.lineStart,
    line_end: args.lineEnd,
    node_type: args.nodeType,
    body: args.body,
    content_hash: contentHashForProse(args.body),
    anchor_checksum: anchorChecksum(args.lines, args.lineStart, args.lineEnd),
    summary: null,
    created_at_index_version: CURRENT_INDEX_VERSION
  };
}

function structuredIdForPath(relativeFilePath: string): string | null {
  const match = path.basename(relativeFilePath).match(STRUCTURED_ID_REGEX);
  return match?.[0] ?? null;
}

export function domainFileNodeId(worldSlug: string, relativeFilePath: string): string {
  return `${worldSlug}:${relativeFilePath}:__file__`;
}

function canonicalWholeFileNodeId(lines: string[], firstSegment: string): string | null {
  const idField = WHOLE_FILE_ID_FIELDS.get(firstSegment);
  if (!idField) {
    return null;
  }

  const frontmatter = parseOpeningFrontmatter(lines);
  if (!frontmatter || typeof frontmatter !== "object") {
    return null;
  }

  const candidate = frontmatter[idField];
  if (typeof candidate !== "string") {
    return null;
  }

  const trimmed = candidate.trim();
  return CANONICAL_ID_REGEX.test(trimmed) ? trimmed : null;
}

function parseOpeningFrontmatter(lines: string[]): Record<string, unknown> | null {
  if (lines[0] !== "---") {
    return null;
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex <= 0) {
    return null;
  }

  try {
    const parsed = YAML.parse(lines.slice(1, closingIndex).join("\n"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function syntheticNodeId(
  worldSlug: string,
  relativeFilePath: string,
  headingPath: string[],
  occurrenceIndex: number
): string {
  const label = path.basename(relativeFilePath);
  const heading = headingPath.length > 0 ? headingPath.join(":") : "__root__";
  return `${worldSlug}:${label}:${heading}:${occurrenceIndex}`;
}

function nextOccurrenceIndex(occurrences: Map<string, number>, headingPath: string[]): number {
  const key = headingPath.join("\u0000");
  const current = occurrences.get(key) ?? 0;
  occurrences.set(key, current + 1);
  return current;
}

function headingText(node: Heading): string {
  return node.children.map(textFromContent).join("").trim();
}

function textFromContent(node: Content): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }

  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map((child) => textFromContent(child as Content)).join("");
  }

  return "";
}

function visitWithAncestors(
  node: Root | RootContent,
  ancestors: Array<Parent | Root>,
  callback: (node: RootContent, ancestors: Array<Parent | Root>) => void
): void {
  if (node.type !== "root") {
    callback(node, ancestors);
  }

  if (!("children" in node) || !Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    visitWithAncestors(child as RootContent, [...ancestors, node], callback);
  }
}
