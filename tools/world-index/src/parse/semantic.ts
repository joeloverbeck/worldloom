import YAML from "yaml";
import type { Html, Root, RootContent } from "mdast";

import { MANDATORY_WORLD_FILES } from "../enumerate";
import { domainFileNodeId } from "./prose";
import type { CanonFactRecord, ChangeLogEntry, EdgeRow, NodeRow, ValidationResultRow } from "../schema/types";

const STRUCTURED_ID_REGEX = /\b(CF|CH|PA|M|DA|CHAR|PR|BATCH|NCP|NCB|AU|RP)-\d+\b/g;
const ATTRIBUTION_COMMENT_REGEX = /<!--\s*(added|clarified|modified)\s+by\s+([A-Z]+-\d+)\s*-->/i;

export function extractSemanticEdges(
  tree: Root,
  lines: string[],
  filePath: string,
  worldSlug: string,
  yamlNodes: NodeRow[],
  proseNodes: NodeRow[]
): { edges: EdgeRow[]; parseIssues: ValidationResultRow[] } {
  void lines;

  const existingNodeIds = new Set([...yamlNodes, ...proseNodes].map((node) => node.node_id));
  const edges: EdgeRow[] = [];
  const parseIssues: ValidationResultRow[] = [];
  let edgeId = 1;

  const pushEdge = (edge: Omit<EdgeRow, "edge_id">): void => {
    edges.push({ edge_id: edgeId, ...edge });
    edgeId += 1;
  };

  for (const node of yamlNodes) {
    if (node.node_type === "canon_fact_record") {
      const parsed = safeParseYaml<CanonFactRecord>(node.body);
      if (!parsed) {
        continue;
      }

      for (const target of parsed.source_basis?.derived_from ?? []) {
        pushEdge(createRefEdge(node.node_id, "derived_from", target, existingNodeIds));
      }

      for (const target of parsed.required_world_updates ?? []) {
        const resolvedTargetNodeId = resolveWorldUpdateTarget(worldSlug, target);
        pushEdge({
          source_node_id: node.node_id,
          target_node_id: resolvedTargetNodeId,
          target_unresolved_ref: resolvedTargetNodeId ? null : target,
          edge_type: "required_world_update"
        });
      }

      for (const entry of parsed.modification_history ?? []) {
        pushEdge(createRefEdge(node.node_id, "modified_by", entry.change_id, existingNodeIds));
      }

      for (const target of parsed.pre_figured_by ?? []) {
        pushEdge(createRefEdge(node.node_id, "pre_figured_by", target, existingNodeIds));
      }

      for (const target of coerceStringArray((parsed as Record<string, unknown>).applies_to)) {
        pushEdge(createRefEdge(node.node_id, "applies_to", target, existingNodeIds));
      }

      for (const target of coerceStringArray((parsed as Record<string, unknown>).pressures)) {
        pushEdge(createRefEdge(node.node_id, "pressures", target, existingNodeIds));
      }

      for (const target of coerceStringArray((parsed as Record<string, unknown>).resolves)) {
        pushEdge(createRefEdge(node.node_id, "resolves", target, existingNodeIds));
      }

      continue;
    }

    if (node.node_type === "change_log_entry") {
      const parsed = safeParseYaml<ChangeLogEntry>(node.body);
      if (!parsed) {
        continue;
      }

      for (const target of parsed.affected_fact_ids ?? []) {
        pushEdge(createRefEdge(node.node_id, "affected_fact", target, existingNodeIds));
      }

      const originatingCf = coerceOptionalString((parsed as Record<string, unknown>).originating_cf);
      if (originatingCf) {
        pushEdge(createRefEdge(node.node_id, "originates_in", originatingCf, existingNodeIds));
      }

      continue;
    }

    if (node.node_type === "mystery_reserve_entry") {
      for (const target of extractFirewallTargets(node.body)) {
        pushEdge(createRefEdge(node.node_id, "firewall_for", target, existingNodeIds));
      }
    }
  }

  visitWithAncestors(tree, [], (node, ancestors) => {
    if (node.type !== "html") {
      return;
    }
    if (ancestors.some((ancestor) => ancestor.type === "code")) {
      return;
    }

    const match = node.value.match(ATTRIBUTION_COMMENT_REGEX);
    if (!match) {
      return;
    }

    const [, , rawTargetRef] = match;
    if (!rawTargetRef) {
      return;
    }
    const targetRef = rawTargetRef.toUpperCase();
    const sourceNode = resolveAttributionSourceNode(node, proseNodes);
    if (!sourceNode) {
      return;
    }

    const edgeType =
      targetRef.startsWith("CF-")
        ? "patched_by"
        : targetRef.startsWith("CH-")
          ? "clarified_by"
          : null;

    if (!edgeType) {
      parseIssues.push(
        createParseIssue({
          filePath,
          lineStart: node.position?.start.line ?? null,
          lineEnd: node.position?.end.line ?? null,
          code: "malformed_attribution_target",
          message: `Attribution comment target '${targetRef}' must start with CF- or CH-.`
        })
      );
      return;
    }

    pushEdge(createRefEdge(sourceNode.node_id, edgeType, targetRef, existingNodeIds));
  });

  return { edges, parseIssues };
}

function createRefEdge(
  sourceNodeId: string,
  edgeType: EdgeRow["edge_type"],
  targetRef: string,
  existingNodeIds: Set<string>
): Omit<EdgeRow, "edge_id"> {
  return {
    source_node_id: sourceNodeId,
    target_node_id: existingNodeIds.has(targetRef) ? targetRef : null,
    target_unresolved_ref: existingNodeIds.has(targetRef) ? null : targetRef,
    edge_type: edgeType
  };
}

function safeParseYaml<T>(body: string): T | null {
  try {
    return YAML.parse(body) as T;
  } catch {
    return null;
  }
}

function coerceOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function coerceStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function extractFirewallTargets(body: string): string[] {
  const targets = new Set<string>();
  const parsed = safeParseYaml<Record<string, unknown>>(body);

  if (parsed) {
    for (const key of ["firewall", "firewall_for", "forbidden_answers"]) {
      for (const target of coerceStringArray(parsed[key])) {
        if (STRUCTURED_ID_REGEX.test(target)) {
          targets.add(target);
        }
      }
      STRUCTURED_ID_REGEX.lastIndex = 0;
    }
  }

  const lineMatch = body.match(/^\s*firewall(?:_for)?\s*:\s*(.+)$/gim) ?? [];
  for (const line of lineMatch) {
    const matches = line.match(STRUCTURED_ID_REGEX) ?? [];
    for (const target of matches) {
      targets.add(target);
    }
  }

  return [...targets];
}

function resolveWorldUpdateTarget(worldSlug: string, targetPath: string): string | null {
  const normalizedTarget = targetPath.replace(/^.*[\\/]/, "");
  if (!MANDATORY_WORLD_FILES.has(normalizedTarget)) {
    return null;
  }

  return domainFileNodeId(worldSlug, normalizedTarget);
}

function resolveAttributionSourceNode(htmlNode: Html, proseNodes: NodeRow[]): NodeRow | null {
  const line = htmlNode.position?.start.line;
  if (!line) {
    return null;
  }

  const priority = new Map<string, number>([
    ["subsection", 3],
    ["bullet_cluster", 2],
    ["section", 1]
  ]);

  const candidates = proseNodes.filter((node) => {
    const rank = priority.get(node.node_type);
    return rank !== undefined && node.line_start <= line && node.line_end >= line;
  });

  candidates.sort((left, right) => {
    const leftPriority = priority.get(left.node_type) ?? 0;
    const rightPriority = priority.get(right.node_type) ?? 0;
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    const leftSpan = left.line_end - left.line_start;
    const rightSpan = right.line_end - right.line_start;
    return leftSpan - rightSpan;
  });

  return candidates[0] ?? null;
}

function visitWithAncestors(
  node: RootContent | Root,
  ancestors: Array<Root | RootContent>,
  callback: (node: RootContent, ancestors: Array<Root | RootContent>) => void
): void {
  if (node.type !== "root") {
    callback(node, ancestors);
  }

  if (!("children" in node) || !Array.isArray(node.children)) {
    return;
  }

  for (const child of node.children) {
    visitWithAncestors(child, [...ancestors, node], callback);
  }
}

function createParseIssue({
  filePath,
  lineStart,
  lineEnd,
  code,
  message
}: {
  filePath: string;
  lineStart: number | null;
  lineEnd: number | null;
  code: string;
  message: string;
}): ValidationResultRow {
  return {
    result_id: 0,
    world_slug: "__unknown__",
    validator_name: "semantic_edge_extraction",
    severity: "warn",
    code,
    message,
    node_id: null,
    file_path: filePath,
    line_range_start: lineStart,
    line_range_end: lineEnd,
    created_at: new Date(0).toISOString()
  };
}
