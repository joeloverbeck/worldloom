import type Database from "better-sqlite3";

import type { ContextPacketNode } from "./shared";
import { loadPacketNodes } from "./shared";

const ENVELOPE_EDGE_TYPES = [
  "derived_from",
  "affected_fact",
  "originates_in",
  "applies_to",
  "required_world_update",
  "modified_by",
  "patched_by",
  "clarified_by",
  "mentions_entity"
] as const;

function addReason(
  orderedNodeIds: string[],
  reasons: Map<string, string>,
  nodeId: string,
  reason: string
): void {
  if (!reasons.has(nodeId)) {
    orderedNodeIds.push(nodeId);
    reasons.set(nodeId, reason);
    return;
  }

  const existing = reasons.get(nodeId);
  if (existing !== undefined && !existing.includes(reason)) {
    reasons.set(nodeId, `${existing}; ${reason}`);
  }
}

function findNeighborNodeIds(
  db: Database.Database,
  worldSlug: string,
  nucleusNodeIds: readonly string[]
): string[] {
  if (nucleusNodeIds.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id IN (${nucleusNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END AS neighbor_node_id
        FROM edges e
        INNER JOIN nodes n
          ON n.node_id = CASE
            WHEN e.source_node_id IN (${nucleusNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END
        WHERE e.edge_type IN (${ENVELOPE_EDGE_TYPES.map(() => "?").join(", ")})
          AND (
            e.source_node_id IN (${nucleusNodeIds.map(() => "?").join(", ")})
            OR e.target_node_id IN (${nucleusNodeIds.map(() => "?").join(", ")})
          )
          AND n.world_slug = ?
          AND neighbor_node_id IS NOT NULL
        ORDER BY neighbor_node_id
      `
    )
    .all(
      ...nucleusNodeIds,
      ...nucleusNodeIds,
      ...ENVELOPE_EDGE_TYPES,
      ...nucleusNodeIds,
      ...nucleusNodeIds,
      worldSlug
    ) as Array<{ neighbor_node_id: string | null }>;

  return rows
    .map((row) => row.neighbor_node_id)
    .filter((nodeId): nodeId is string => nodeId !== null);
}

function findSiblingNodeIds(
  db: Database.Database,
  worldSlug: string,
  nucleusNodes: readonly ContextPacketNode[]
): string[] {
  const ordered: string[] = [];

  for (const node of nucleusNodes) {
    const rows = db
      .prepare(
        `
          SELECT node_id
          FROM nodes
          WHERE world_slug = ?
            AND file_path = ?
            AND node_id <> ?
          ORDER BY line_start, node_id
          LIMIT 2
        `
      )
      .all(worldSlug, node.file_path, node.id) as Array<{ node_id: string }>;

    for (const row of rows) {
      if (!ordered.includes(row.node_id)) {
        ordered.push(row.node_id);
      }
    }
  }

  return ordered;
}

export async function buildEnvelope(
  db: Database.Database,
  worldSlug: string,
  nucleusNodes: ContextPacketNode[]
): Promise<{
  nodes: ContextPacketNode[];
  why_included: string[];
}> {
  const nucleusNodeIds = nucleusNodes.map((node) => node.id);
  const excluded = new Set(nucleusNodeIds);
  const orderedNodeIds: string[] = [];
  const reasons = new Map<string, string>();

  for (const nodeId of findNeighborNodeIds(db, worldSlug, nucleusNodeIds)) {
    if (excluded.has(nodeId)) {
      continue;
    }

    addReason(orderedNodeIds, reasons, nodeId, "one-hop graph context for nucleus interpretation");
  }

  for (const nodeId of findSiblingNodeIds(db, worldSlug, nucleusNodes)) {
    if (excluded.has(nodeId)) {
      continue;
    }

    addReason(orderedNodeIds, reasons, nodeId, "adjacent same-file context for nucleus node");
  }

  const nodes = loadPacketNodes(db, worldSlug, orderedNodeIds);
  return {
    nodes,
    why_included: nodes.map((node) => reasons.get(node.id) ?? "bounded envelope context")
  };
}
