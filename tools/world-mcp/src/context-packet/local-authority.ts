import type Database from "better-sqlite3";

import { createMcpError, type McpError } from "../errors";

import { loadPacketNodes, uniqueStrings, type ContextPacketNode } from "./shared";

interface SeedNodeRow {
  node_id: string;
  file_path: string;
  heading_path: string | null;
  node_type: string;
}

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

function loadSeedRows(
  db: Database.Database,
  worldSlug: string,
  seedNodeIds: readonly string[]
): SeedNodeRow[] {
  if (seedNodeIds.length === 0) {
    return [];
  }

  return db
    .prepare(
      `
        SELECT node_id, file_path, heading_path, node_type
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${seedNodeIds.map(() => "?").join(", ")})
      `
    )
    .all(worldSlug, ...seedNodeIds) as SeedNodeRow[];
}

function findMissingSeedNodeId(
  db: Database.Database,
  worldSlug: string,
  seedNodeIds: readonly string[]
): string | null {
  const rows = loadSeedRows(db, worldSlug, seedNodeIds);
  const present = new Set(rows.map((row) => row.node_id));
  return seedNodeIds.find((nodeId) => !present.has(nodeId)) ?? null;
}

function findAuthorityParentIds(
  db: Database.Database,
  worldSlug: string,
  seedRows: readonly SeedNodeRow[]
): string[] {
  const parentIds: string[] = [];

  for (const seedRow of seedRows) {
    if (seedRow.node_type === "scoped_reference") {
      const row = db
        .prepare(
          `
            SELECT source_node_id
            FROM scoped_references
            WHERE world_slug = ?
              AND reference_id = ?
            LIMIT 1
          `
        )
        .get(worldSlug, seedRow.node_id) as { source_node_id: string } | undefined;

      if (row !== undefined && !parentIds.includes(row.source_node_id)) {
        parentIds.push(row.source_node_id);
      }
      continue;
    }

    if (
      seedRow.heading_path === null &&
      !["section", "subsection", "bullet_cluster"].includes(seedRow.node_type)
    ) {
      continue;
    }

    const row = db
      .prepare(
        `
          SELECT node_id
          FROM nodes
          WHERE world_slug = ?
            AND file_path = ?
            AND heading_path IS NULL
            AND node_id <> ?
            AND node_type NOT IN ('named_entity', 'scoped_reference')
          ORDER BY line_start, node_id
          LIMIT 1
        `
      )
      .get(worldSlug, seedRow.file_path, seedRow.node_id) as { node_id: string } | undefined;

    if (row !== undefined && !parentIds.includes(row.node_id)) {
      parentIds.push(row.node_id);
    }
  }

  return parentIds;
}

function findExplicitScopedReferenceIds(
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
        SELECT reference_id
        FROM scoped_references
        WHERE world_slug = ?
          AND authority_level = 'explicit_scoped_reference'
          AND source_node_id IN (${sourceNodeIds.map(() => "?").join(", ")})
        ORDER BY reference_id
      `
    )
    .all(worldSlug, ...sourceNodeIds) as Array<{ reference_id: string }>;

  return rows.map((row) => row.reference_id);
}

export async function findLocalAuthoritySourceNodeIds(
  db: Database.Database,
  worldSlug: string,
  seedNodeIds: readonly string[]
): Promise<string[] | McpError> {
  const uniqueSeedNodeIds = uniqueStrings(seedNodeIds);
  const missingSeedNodeId = findMissingSeedNodeId(db, worldSlug, uniqueSeedNodeIds);
  if (missingSeedNodeId !== null) {
    return createMcpError("node_not_found", `Node '${missingSeedNodeId}' does not exist.`, {
      node_id: missingSeedNodeId,
      world_slug: worldSlug
    });
  }

  const seedRows = loadSeedRows(db, worldSlug, uniqueSeedNodeIds);
  return uniqueStrings([...uniqueSeedNodeIds, ...findAuthorityParentIds(db, worldSlug, seedRows)]);
}

export function buildLocalAuthority(
  db: Database.Database,
  worldSlug: string,
  sourceNodeIds: readonly string[]
): {
  nodes: ContextPacketNode[];
  why_included: string[];
} {
  const orderedNodeIds: string[] = [];
  const reasons = new Map<string, string>();

  for (const nodeId of uniqueStrings(sourceNodeIds)) {
    addReason(
      orderedNodeIds,
      reasons,
      nodeId,
      nodeId === sourceNodeIds[0] ? "seed node supplied by caller" : "immediate authority for seed-local context"
    );
  }

  for (const referenceId of findExplicitScopedReferenceIds(db, worldSlug, sourceNodeIds)) {
    addReason(
      orderedNodeIds,
      reasons,
      referenceId,
      "explicit scoped reference declared by the authority-bearing source"
    );
  }

  const nodes = loadPacketNodes(db, worldSlug, orderedNodeIds);
  return {
    nodes,
    why_included: nodes.map((node) => reasons.get(node.id) ?? "seed-local authority")
  };
}
