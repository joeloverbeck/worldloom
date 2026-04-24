import type Database from "better-sqlite3";

import type { ContextPacketNode } from "./shared";
import { loadPacketNodes } from "./shared";

const LOCAL_CONTEXT_EDGE_TYPES = [
  "derived_from",
  "affected_fact",
  "originates_in",
  "applies_to",
  "required_world_update",
  "modified_by",
  "patched_by",
  "clarified_by",
  "mentions_entity",
  "references_scoped_name",
  "references_record"
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
  sourceNodeIds: readonly string[]
): string[] {
  if (sourceNodeIds.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id IN (${sourceNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END AS neighbor_node_id
        FROM edges e
        INNER JOIN nodes n
          ON n.node_id = CASE
            WHEN e.source_node_id IN (${sourceNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END
        WHERE e.edge_type IN (${LOCAL_CONTEXT_EDGE_TYPES.map(() => "?").join(", ")})
          AND (
            e.source_node_id IN (${sourceNodeIds.map(() => "?").join(", ")})
            OR e.target_node_id IN (${sourceNodeIds.map(() => "?").join(", ")})
          )
          AND n.world_slug = ?
          AND neighbor_node_id IS NOT NULL
        ORDER BY neighbor_node_id
      `
    )
    .all(
      ...sourceNodeIds,
      ...sourceNodeIds,
      ...LOCAL_CONTEXT_EDGE_TYPES,
      ...sourceNodeIds,
      ...sourceNodeIds,
      worldSlug
    ) as Array<{ neighbor_node_id: string | null }>;

  return rows
    .map((row) => row.neighbor_node_id)
    .filter((nodeId): nodeId is string => nodeId !== null);
}

function findSiblingNodeIds(
  db: Database.Database,
  worldSlug: string,
  packetNodes: readonly ContextPacketNode[]
): string[] {
  const ordered: string[] = [];

  for (const node of packetNodes) {
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

export function buildScopedLocalContext(
  db: Database.Database,
  worldSlug: string,
  sourceNodeIds: readonly string[],
  baseNodes: readonly ContextPacketNode[]
): {
  nodes: ContextPacketNode[];
  why_included: string[];
} {
  const excluded = new Set(baseNodes.map((node) => node.id));
  const orderedNodeIds: string[] = [];
  const reasons = new Map<string, string>();

  for (const nodeId of findNeighborNodeIds(db, worldSlug, sourceNodeIds)) {
    if (excluded.has(nodeId)) {
      continue;
    }

    addReason(
      orderedNodeIds,
      reasons,
      nodeId,
      "one-hop graph context for seed-local interpretation"
    );
  }

  for (const nodeId of findSiblingNodeIds(db, worldSlug, baseNodes)) {
    if (excluded.has(nodeId)) {
      continue;
    }

    addReason(orderedNodeIds, reasons, nodeId, "adjacent same-file context for the local authority");
  }

  const nodes = loadPacketNodes(db, worldSlug, orderedNodeIds);
  return {
    nodes,
    why_included: nodes.map((node) => reasons.get(node.id) ?? "scoped local context")
  };
}
