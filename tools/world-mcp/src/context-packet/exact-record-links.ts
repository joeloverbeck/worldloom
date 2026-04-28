import type Database from "better-sqlite3";

import {
  loadPacketNodes,
  uniqueStrings,
  type ContextPacketNode,
  type DeliveryMode
} from "./shared";

export function buildExactRecordLinks(
  db: Database.Database,
  worldSlug: string,
  sourceNodeIds: readonly string[],
  excludedNodeIds: readonly string[],
  deliveryMode: DeliveryMode
): {
  nodes: ContextPacketNode[];
  why_included: string[];
} {
  if (sourceNodeIds.length === 0) {
    return { nodes: [], why_included: [] };
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT target_node_id
        FROM edges
        WHERE edge_type = 'references_record'
          AND source_node_id IN (${sourceNodeIds.map(() => "?").join(", ")})
          AND target_node_id IS NOT NULL
        ORDER BY target_node_id
      `
    )
    .all(...sourceNodeIds) as Array<{ target_node_id: string }>;

  const excluded = new Set(excludedNodeIds);
  const orderedNodeIds = uniqueStrings(
    rows.map((row) => row.target_node_id).filter((nodeId) => !excluded.has(nodeId))
  );
  const nodes = loadPacketNodes(db, worldSlug, orderedNodeIds, { deliveryMode });

  return {
    nodes,
    why_included: nodes.map(() => "exact structured record link from the seed-local authority surface")
  };
}
