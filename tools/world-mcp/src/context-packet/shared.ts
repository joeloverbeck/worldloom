import type Database from "better-sqlite3";
import type { NodeType } from "@worldloom/world-index/public/types";

import type { TaskType } from "../ranking/profiles";

export interface ContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget: number;
}

export interface ContextPacketNode {
  id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  summary: string | null;
  body_preview: string;
}

export interface ContextPacketRisk {
  severity: string;
  code: string;
  message: string;
  node_id: string | null;
  file_path: string | null;
}

export interface ContextPacket {
  task_header: {
    task_type: TaskType;
    world_slug: string;
    generated_at: string;
    token_budget: {
      requested: number;
      allocated: number;
    };
    seed_nodes: string[];
    packet_version: 2;
  };
  local_authority: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  exact_record_links: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  scoped_local_context: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  governing_world_context: {
    active_rules: string[];
    protected_surfaces: string[];
    required_output_schema: string[];
    prohibited_moves: string[];
    open_risks: ContextPacketRisk[];
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  impact_surfaces: {
    nodes: ContextPacketNode[];
    rationale: string[];
  };
}

export const DEFAULT_PACKET_VERSION = 2 as const;

export const DEFAULT_BUDGET_SPLIT = {
  local_authority: 0.25,
  exact_record_links: 0.15,
  scoped_local_context: 0.2,
  governing_world_context: 0.2,
  impact_surfaces: 0.1,
  overhead: 0.1
} as const;

interface PacketNodeRow {
  node_id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  body: string;
  summary: string | null;
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function makeBodyPreview(body: string, maxLength = 280): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
}

export function estimateTextTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function estimateNodeTokens(node: ContextPacketNode): number {
  return estimateTextTokens(
    [
      node.id,
      node.world_slug,
      node.node_type,
      node.file_path,
      node.heading_path ?? "",
      node.summary ?? "",
      node.body_preview
    ].join(" ")
  );
}

export function estimatePacketTokens(packet: ContextPacket): number {
  let total = 0;

  total += estimateTextTokens(JSON.stringify(packet.task_header));
  total += packet.local_authority.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.local_authority.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.exact_record_links.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.exact_record_links.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.scoped_local_context.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.scoped_local_context.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.governing_world_context.active_rules.reduce(
    (sum, rule) => sum + estimateTextTokens(rule),
    0
  );
  total += packet.governing_world_context.protected_surfaces.reduce(
    (sum, surface) => sum + estimateTextTokens(surface),
    0
  );
  total += packet.governing_world_context.required_output_schema.reduce(
    (sum, entry) => sum + estimateTextTokens(entry),
    0
  );
  total += packet.governing_world_context.prohibited_moves.reduce(
    (sum, move) => sum + estimateTextTokens(move),
    0
  );
  total += packet.governing_world_context.open_risks.reduce(
    (sum, risk) => sum + estimateTextTokens(JSON.stringify(risk)),
    0
  );
  total += packet.governing_world_context.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.governing_world_context.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.impact_surfaces.nodes.reduce(
    (sum, node) => sum + estimateNodeTokens(node),
    0
  );
  total += packet.impact_surfaces.rationale.reduce(
    (sum, rationale) => sum + estimateTextTokens(rationale),
    0
  );

  return total;
}

export function loadPacketNodes(
  db: Database.Database,
  worldSlug: string,
  nodeIds: readonly string[]
): ContextPacketNode[] {
  const uniqueNodeIds = uniqueStrings(nodeIds);
  if (uniqueNodeIds.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT node_id, world_slug, node_type, file_path, heading_path, body, summary
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${uniqueNodeIds.map(() => "?").join(", ")})
      `
    )
    .all(worldSlug, ...uniqueNodeIds) as PacketNodeRow[];

  const byId = new Map(
    rows.map((row) => [
      row.node_id,
      {
        id: row.node_id,
        world_slug: row.world_slug,
        node_type: row.node_type,
        file_path: row.file_path,
        heading_path: row.heading_path,
        summary: row.summary ?? null,
        body_preview: makeBodyPreview(row.body)
      } satisfies ContextPacketNode
    ])
  );

  return uniqueNodeIds
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is ContextPacketNode => node !== undefined);
}

export function trimPairedListToBudget<T>(
  items: T[],
  annotations: string[],
  tokenBudget: number,
  estimateItemTokens: (item: T, annotation: string) => number
): void {
  while (items.length > 0) {
    const total = items.reduce(
      (sum, item, index) => sum + estimateItemTokens(item, annotations[index] ?? ""),
      0
    );
    if (total <= tokenBudget) {
      return;
    }

    items.pop();
    annotations.pop();
  }
}

export function trimRisksToBudget(risks: ContextPacketRisk[], tokenBudget: number): void {
  while (risks.length > 0) {
    const total = risks.reduce((sum, risk) => sum + estimateTextTokens(JSON.stringify(risk)), 0);
    if (total <= tokenBudget) {
      return;
    }

    risks.pop();
  }
}
