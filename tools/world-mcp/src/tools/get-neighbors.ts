import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

import { resolveNodeWorld } from "./_shared";

export interface GetNeighborsArgs {
  node_id: string;
  world_slug?: string;
  edge_types?: EdgeType[];
  depth: 1 | 2;
}

export interface NeighborNode {
  node_id: string;
  node_type: NodeType;
  heading_path: string | null;
  via_node_id: string;
  edge_types: EdgeType[];
}

export interface NeighborGraph {
  seed: {
    node_id: string;
    node_type: NodeType;
    heading_path: string | null;
  };
  hop1: NeighborNode[];
  hop2?: NeighborNode[];
}

interface NeighborEdgeRow {
  edge_type: EdgeType;
  neighbor_node_id: string;
}

function getSeedNode(
  db: import("better-sqlite3").Database,
  nodeId: string
): { node_id: string; node_type: NodeType; heading_path: string | null } | undefined {
  return db
    .prepare(
      `
        SELECT node_id, node_type, heading_path
        FROM nodes
        WHERE node_id = ?
        LIMIT 1
      `
    )
    .get(nodeId) as { node_id: string; node_type: NodeType; heading_path: string | null } | undefined;
}

function getDirectNeighborEdges(
  db: import("better-sqlite3").Database,
  nodeId: string,
  edgeTypes: readonly EdgeType[]
): NeighborEdgeRow[] {
  const edgeTypeClause =
    edgeTypes.length > 0 ? `AND edge_type IN (${edgeTypes.map(() => "?").join(", ")})` : "";

  return db
    .prepare(
      `
        SELECT edge_type, target_node_id AS neighbor_node_id
        FROM edges
        WHERE source_node_id = ?
          AND target_node_id IS NOT NULL
          ${edgeTypeClause}
        UNION ALL
        SELECT edge_type, source_node_id AS neighbor_node_id
        FROM edges
        WHERE target_node_id = ?
          ${edgeTypeClause}
      `
    )
    .all(nodeId, ...(edgeTypes.length > 0 ? edgeTypes : []), nodeId, ...(edgeTypes.length > 0 ? edgeTypes : [])) as NeighborEdgeRow[];
}

function loadNeighborNodes(
  db: import("better-sqlite3").Database,
  seedNodeId: string,
  viaNodeId: string,
  edgeRows: NeighborEdgeRow[],
  excludedNodeIds: Set<string>
): NeighborNode[] {
  const grouped = new Map<string, EdgeType[]>();

  for (const row of edgeRows) {
    if (excludedNodeIds.has(row.neighbor_node_id) || row.neighbor_node_id === seedNodeId) {
      continue;
    }

    const existing = grouped.get(row.neighbor_node_id) ?? [];
    if (!existing.includes(row.edge_type)) {
      existing.push(row.edge_type);
    }
    grouped.set(row.neighbor_node_id, existing);
  }

  if (grouped.size === 0) {
    return [];
  }

  const nodeIds = [...grouped.keys()];
  const placeholders = nodeIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT node_id, node_type, heading_path
        FROM nodes
        WHERE node_id IN (${placeholders})
      `
    )
    .all(...nodeIds) as Array<{ node_id: string; node_type: NodeType; heading_path: string | null }>;

  return rows
    .map((row) => ({
      node_id: row.node_id,
      node_type: row.node_type,
      heading_path: row.heading_path,
      via_node_id: viaNodeId,
      edge_types: grouped.get(row.node_id) ?? []
    }))
    .sort((left, right) => left.node_id.localeCompare(right.node_id));
}

export async function getNeighbors(args: GetNeighborsArgs): Promise<NeighborGraph | McpError> {
  const resolved = resolveNodeWorld(args.node_id, args.world_slug);
  if ("code" in resolved) {
    return resolved;
  }

  const opened = openIndexDb(resolved.worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const seed = getSeedNode(opened.db, args.node_id);
    if (seed === undefined) {
      return createMcpError("node_not_found", `Node '${args.node_id}' does not exist.`, {
        node_id: args.node_id,
        world_slug: resolved.worldSlug
      });
    }

    const edgeTypes = args.edge_types ?? [];
    const hop1 = loadNeighborNodes(
      opened.db,
      args.node_id,
      args.node_id,
      getDirectNeighborEdges(opened.db, args.node_id, edgeTypes),
      new Set([args.node_id])
    );

    if (args.depth === 1) {
      return { seed, hop1 };
    }

    const seen = new Set<string>([args.node_id, ...hop1.map((neighbor) => neighbor.node_id)]);
    const hop2Map = new Map<string, NeighborNode>();

    for (const neighbor of hop1) {
      const secondHop = loadNeighborNodes(
        opened.db,
        args.node_id,
        neighbor.node_id,
        getDirectNeighborEdges(opened.db, neighbor.node_id, edgeTypes),
        seen
      );

      for (const candidate of secondHop) {
        const existing = hop2Map.get(candidate.node_id);
        if (existing === undefined) {
          hop2Map.set(candidate.node_id, candidate);
          continue;
        }

        const mergedEdgeTypes = [...existing.edge_types];
        for (const edgeType of candidate.edge_types) {
          if (!mergedEdgeTypes.includes(edgeType)) {
            mergedEdgeTypes.push(edgeType);
          }
        }

        hop2Map.set(candidate.node_id, {
          ...existing,
          edge_types: mergedEdgeTypes.sort((left, right) => left.localeCompare(right))
        });
      }
    }

    return {
      seed,
      hop1,
      hop2: [...hop2Map.values()].sort((left, right) => left.node_id.localeCompare(right.node_id))
    };
  } finally {
    opened.db.close();
  }
}
