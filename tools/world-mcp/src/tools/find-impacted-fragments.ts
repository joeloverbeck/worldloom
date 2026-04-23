import type { NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

export interface FindImpactedFragmentsArgs {
  world_slug: string;
  node_ids: string[];
}

export interface ImpactedFragment {
  id: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  fallback: "canonical" | "noncanonical_fallback";
}

export interface FindImpactedFragmentsResponse {
  impacted: ImpactedFragment[];
}

interface NodeSummaryRow {
  node_id: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function findMissingNodeId(
  db: import("better-sqlite3").Database,
  worldSlug: string,
  nodeIds: readonly string[]
): string | null {
  if (nodeIds.length === 0) {
    return null;
  }

  const placeholders = nodeIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${placeholders})
      `
    )
    .all(worldSlug, ...nodeIds) as Array<{ node_id: string }>;

  const present = new Set(rows.map((row) => row.node_id));
  return nodeIds.find((nodeId) => !present.has(nodeId)) ?? null;
}

export async function findImpactedFragments(
  args: FindImpactedFragmentsArgs
): Promise<FindImpactedFragmentsResponse | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const nodeIds = unique(args.node_ids);
    if (nodeIds.length === 0) {
      return { impacted: [] };
    }

    const missingNodeId = findMissingNodeId(opened.db, args.world_slug, nodeIds);
    if (missingNodeId !== null) {
      return createMcpError("node_not_found", `Node '${missingNodeId}' does not exist.`, {
        node_id: missingNodeId,
        world_slug: args.world_slug
      });
    }

    const placeholders = nodeIds.map(() => "?").join(", ");

    const requiredRows = opened.db
      .prepare(
        `
          SELECT DISTINCT target_node_id AS node_id
          FROM edges
          WHERE source_node_id IN (${placeholders})
            AND edge_type = 'required_world_update'
            AND target_node_id IS NOT NULL
        `
      )
      .all(...nodeIds) as Array<{ node_id: string }>;

    const entityRows = opened.db
      .prepare(
        `
          SELECT DISTINCT target_node_id AS entity_id
          FROM edges
          WHERE source_node_id IN (${placeholders})
            AND edge_type = 'mentions_entity'
            AND target_node_id IS NOT NULL
        `
      )
      .all(...nodeIds) as Array<{ entity_id: string }>;

    const entityIds = entityRows.map((row) => row.entity_id);

    const mentionRows =
      entityIds.length === 0
        ? []
        : (opened.db
            .prepare(
              `
                SELECT DISTINCT source_node_id AS node_id
                FROM edges
                WHERE target_node_id IN (${entityIds.map(() => "?").join(", ")})
                  AND edge_type = 'mentions_entity'
                  AND source_node_id NOT IN (${placeholders})
              `
            )
            .all(...entityIds, ...nodeIds) as Array<{ node_id: string }>);

    const impactedIds = unique([
      ...requiredRows.map((row) => row.node_id),
      ...mentionRows.map((row) => row.node_id)
    ]);

    if (impactedIds.length === 0) {
      return { impacted: [] };
    }

    const impactedRows = opened.db
      .prepare(
        `
          SELECT node_id, node_type, file_path, heading_path
          FROM nodes
          WHERE world_slug = ?
            AND node_id IN (${impactedIds.map(() => "?").join(", ")})
          ORDER BY node_id
        `
      )
      .all(args.world_slug, ...impactedIds) as NodeSummaryRow[];

    return {
      impacted: impactedRows.map((row) => ({
        id: row.node_id,
        node_type: row.node_type,
        file_path: row.file_path,
        heading_path: row.heading_path,
        fallback: "canonical"
      }))
    };
  } finally {
    opened.db.close();
  }
}
