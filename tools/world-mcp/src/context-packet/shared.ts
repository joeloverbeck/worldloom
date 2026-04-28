import type Database from "better-sqlite3";
import YAML from "yaml";
import type { NodeType } from "@worldloom/world-index/public/types";

import type { TaskType } from "../ranking/profiles";

export const DELIVERY_MODES = ["full", "summary_only"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export const DEFAULT_DELIVERY_MODE: DeliveryMode = "full";

export interface ContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  seed_nodes: string[];
  token_budget: number;
  delivery_mode?: DeliveryMode;
}

export interface ContextPacketNode {
  id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  summary: string | null;
  body_preview?: string;
  record?: Record<string, unknown>;
}

export interface ContextPacketRisk {
  severity: string;
  code: string;
  message: string;
  node_id: string | null;
  file_path: string | null;
}

export interface ContextPacketTruncationSummary {
  dropped_layers: string[];
  dropped_node_ids_by_layer: Record<string, string[]>;
  fallback_advice: string;
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
  truncation_summary: ContextPacketTruncationSummary;
}

export const TRUNCATION_FALLBACK_ADVICE =
  "Retrieve dropped nodes via mcp__worldloom__get_record(record_id) or mcp__worldloom__get_record_field(record_id, field_path) as needed.";

export const DEFAULT_PACKET_VERSION = 2 as const;

export const DEFAULT_BUDGET_SPLIT = {
  local_authority: 0.25,
  exact_record_links: 0.15,
  scoped_local_context: 0.2,
  governing_world_context: 0.2,
  impact_surfaces: 0.1,
  overhead: 0.1
} as const;

export interface PacketNodeRow {
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

export const SUMMARY_MAX_LENGTH = 100;

export function deriveNodeSummary(body: string, dbSummary: string | null): string {
  if (dbSummary !== null && dbSummary.trim().length > 0) {
    return clipToSummaryLength(dbSummary);
  }

  const fromNotes = extractYamlNotesFirstLine(body);
  if (fromNotes !== null) {
    return clipToSummaryLength(fromNotes);
  }

  return clipToSummaryLength(extractFirstSentence(body));
}

function clipToSummaryLength(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= SUMMARY_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, SUMMARY_MAX_LENGTH - 3)}...`;
}

function extractYamlNotesFirstLine(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = YAML.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const notes = (parsed as Record<string, unknown>).notes;
  if (typeof notes !== "string") {
    return null;
  }

  const firstLine = notes.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? null;
}

function extractFirstSentence(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^[^.!?]*[.!?]/);
  return match?.[0]?.trim() ?? normalized;
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
      node.body_preview ?? "",
      node.record === undefined ? "" : JSON.stringify(node.record)
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
  total += estimateTextTokens(JSON.stringify(packet.truncation_summary));

  return total;
}

export function loadPacketNodes(
  db: Database.Database,
  worldSlug: string,
  nodeIds: readonly string[],
  options: {
    recordProjection?: (row: PacketNodeRow) => Record<string, unknown> | undefined;
    deliveryMode?: DeliveryMode;
  } = {}
): ContextPacketNode[] {
  const uniqueNodeIds = uniqueStrings(nodeIds);
  if (uniqueNodeIds.length === 0) {
    return [];
  }

  const deliveryMode: DeliveryMode = options.deliveryMode ?? DEFAULT_DELIVERY_MODE;

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
    rows.map((row) => {
      const node: ContextPacketNode = {
        id: row.node_id,
        world_slug: row.world_slug,
        node_type: row.node_type,
        file_path: row.file_path,
        heading_path: row.heading_path,
        summary:
          deliveryMode === "summary_only"
            ? deriveNodeSummary(row.body, row.summary ?? null)
            : (row.summary ?? null)
      };
      if (deliveryMode === "full") {
        node.body_preview = makeBodyPreview(row.body);
      }
      const projectedRecord = options.recordProjection?.(row);
      if (projectedRecord !== undefined) {
        node.record = projectedRecord;
      }

      return [row.node_id, node] as const;
    })
  );

  return uniqueNodeIds
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is ContextPacketNode => node !== undefined);
}

export function parsePacketNodeRecord(row: PacketNodeRow): Record<string, unknown> | undefined {
  let parsed: unknown;
  try {
    parsed = YAML.parse(row.body);
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }

  return parsed as Record<string, unknown>;
}

