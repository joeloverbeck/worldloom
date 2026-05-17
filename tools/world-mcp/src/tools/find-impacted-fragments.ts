import type { NodeType } from "@worldloom/world-index/public/types";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { openIndexDb } from "../db/index.js";
import { createMcpError, type McpError } from "../errors.js";
import { isStoryBundleRecordId, toStoryScopedNodeId } from "./_shared.js";

export interface FindImpactedFragmentsArgs {
  world_slug: string;
  node_ids: string[];
  story_slug?: string;
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

function resolveInputNodeId(nodeId: string, storySlug: string | undefined): string | McpError {
  if (!isStoryBundleRecordId(nodeId)) {
    return nodeId;
  }

  if (storySlug === undefined) {
    return createMcpError(
      "invalid_input",
      `story_slug required for node_id=${nodeId}; bundle-scoped IDs are not unique across bundles within a world.`,
      { field: "story_slug", node_id: nodeId }
    );
  }

  return toStoryScopedNodeId(nodeId, storySlug);
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

async function findImpactedFragmentsImpl(
  args: FindImpactedFragmentsArgs
): Promise<FindImpactedFragmentsResponse | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const resolvedNodeIds: string[] = [];
    for (const nodeId of args.node_ids) {
      const resolvedNodeId = resolveInputNodeId(nodeId, args.story_slug);
      if (typeof resolvedNodeId !== "string") {
        return resolvedNodeId;
      }
      resolvedNodeIds.push(resolvedNodeId);
    }

    const nodeIds = unique(resolvedNodeIds);
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

export const findImpactedFragments = withIndexFreshnessGuard(findImpactedFragmentsImpl);
