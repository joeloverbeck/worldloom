import type Database from "better-sqlite3";

import type { McpError } from "../errors";
import type { TaskType } from "../ranking/profiles";
import { createMcpError } from "../errors";

import { loadPacketNodes, type ContextPacketNode, uniqueStrings } from "./shared";

const GOVERNING_FILE_PATHS: Record<TaskType, string[]> = {
  canon_addition: ["WORLD_KERNEL.md", "INVARIANTS.md"],
  character_generation: ["WORLD_KERNEL.md", "INVARIANTS.md", "PEOPLES_AND_SPECIES.md", "INSTITUTIONS.md"],
  diegetic_artifact_generation: ["WORLD_KERNEL.md", "INVARIANTS.md", "EVERYDAY_LIFE.md"],
  continuity_audit: ["WORLD_KERNEL.md", "INVARIANTS.md", "CANON_LEDGER.md"],
  other: ["WORLD_KERNEL.md", "INVARIANTS.md"]
};

const RELATED_EDGE_TYPES: Record<TaskType, string[]> = {
  canon_addition: [
    "derived_from",
    "affected_fact",
    "originates_in",
    "applies_to",
    "required_world_update",
    "mentions_entity",
    "modified_by",
    "patched_by",
    "clarified_by"
  ],
  character_generation: ["mentions_entity", "applies_to", "required_world_update"],
  diegetic_artifact_generation: ["mentions_entity", "applies_to", "required_world_update"],
  continuity_audit: ["affected_fact", "modified_by", "patched_by", "clarified_by", "required_world_update"],
  other: ["required_world_update", "mentions_entity"]
};

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

function findMissingSeedNodeId(
  db: Database.Database,
  worldSlug: string,
  seedNodeIds: readonly string[]
): string | null {
  if (seedNodeIds.length === 0) {
    return null;
  }

  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${seedNodeIds.map(() => "?").join(", ")})
      `
    )
    .all(worldSlug, ...seedNodeIds) as Array<{ node_id: string }>;

  const present = new Set(rows.map((row) => row.node_id));
  return seedNodeIds.find((nodeId) => !present.has(nodeId)) ?? null;
}

function findNodeIdsByFiles(
  db: Database.Database,
  worldSlug: string,
  filePaths: readonly string[]
): string[] {
  if (filePaths.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT node_id
        FROM nodes
        WHERE world_slug = ?
          AND file_path IN (${filePaths.map(() => "?").join(", ")})
        ORDER BY file_path, COALESCE(heading_path, ''), node_id
      `
    )
    .all(worldSlug, ...filePaths) as Array<{ node_id: string }>;

  return rows.map((row) => row.node_id);
}

function findRelatedNodeIds(
  db: Database.Database,
  worldSlug: string,
  seedNodeIds: readonly string[],
  taskType: TaskType
): string[] {
  const edgeTypes = RELATED_EDGE_TYPES[taskType];
  if (seedNodeIds.length === 0 || edgeTypes.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id IN (${seedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END AS related_node_id
        FROM edges e
        INNER JOIN nodes n
          ON n.node_id = CASE
            WHEN e.source_node_id IN (${seedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END
        WHERE e.edge_type IN (${edgeTypes.map(() => "?").join(", ")})
          AND (
            e.source_node_id IN (${seedNodeIds.map(() => "?").join(", ")})
            OR e.target_node_id IN (${seedNodeIds.map(() => "?").join(", ")})
          )
          AND n.world_slug = ?
          AND related_node_id IS NOT NULL
        ORDER BY related_node_id
      `
    )
    .all(
      ...seedNodeIds,
      ...seedNodeIds,
      ...edgeTypes,
      ...seedNodeIds,
      ...seedNodeIds,
      worldSlug
    ) as Array<{ related_node_id: string | null }>;

  return rows
    .map((row) => row.related_node_id)
    .filter((nodeId): nodeId is string => nodeId !== null);
}

function findFirewallNodeIds(
  db: Database.Database,
  worldSlug: string,
  protectedNodeIds: readonly string[]
): string[] {
  if (protectedNodeIds.length === 0) {
    return [];
  }

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          CASE
            WHEN e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END AS firewall_node_id
        FROM edges e
        INNER JOIN nodes n
          ON n.node_id = CASE
            WHEN e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")}) THEN e.target_node_id
            ELSE e.source_node_id
          END
        WHERE e.edge_type = 'firewall_for'
          AND (
            e.source_node_id IN (${protectedNodeIds.map(() => "?").join(", ")})
            OR e.target_node_id IN (${protectedNodeIds.map(() => "?").join(", ")})
          )
          AND n.world_slug = ?
          AND firewall_node_id IS NOT NULL
        ORDER BY firewall_node_id
      `
    )
    .all(
      ...protectedNodeIds,
      ...protectedNodeIds,
      ...protectedNodeIds,
      ...protectedNodeIds,
      worldSlug
    ) as Array<{ firewall_node_id: string | null }>;

  return rows
    .map((row) => row.firewall_node_id)
    .filter((nodeId): nodeId is string => nodeId !== null);
}

export async function buildNucleus(
  db: Database.Database,
  worldSlug: string,
  taskType: TaskType,
  seedNodeIds: string[]
): Promise<
  | {
      nodes: ContextPacketNode[];
      why_included: string[];
    }
  | McpError
> {
  const uniqueSeedNodeIds = uniqueStrings(seedNodeIds);
  const missingSeedNodeId = findMissingSeedNodeId(db, worldSlug, uniqueSeedNodeIds);
  if (missingSeedNodeId !== null) {
    return createMcpError("node_not_found", `Node '${missingSeedNodeId}' does not exist.`, {
      node_id: missingSeedNodeId,
      world_slug: worldSlug
    });
  }

  const orderedNodeIds: string[] = [];
  const reasons = new Map<string, string>();

  for (const seedNodeId of uniqueSeedNodeIds) {
    addReason(orderedNodeIds, reasons, seedNodeId, "seed node supplied by caller");
  }

  const governingNodeIds = findNodeIdsByFiles(db, worldSlug, GOVERNING_FILE_PATHS[taskType]);
  for (const nodeId of governingNodeIds) {
    const filePathRow = db
      .prepare("SELECT file_path FROM nodes WHERE node_id = ? LIMIT 1")
      .get(nodeId) as { file_path: string } | undefined;
    addReason(
      orderedNodeIds,
      reasons,
      nodeId,
      `${filePathRow?.file_path ?? "governing file"} required by ${taskType} profile`
    );
  }

  const relatedNodeIds = findRelatedNodeIds(db, worldSlug, uniqueSeedNodeIds, taskType);
  for (const nodeId of relatedNodeIds) {
    if (uniqueSeedNodeIds.includes(nodeId)) {
      continue;
    }

    addReason(orderedNodeIds, reasons, nodeId, `${taskType} profile dependency or impact edge`);
  }

  const firewallNodeIds = findFirewallNodeIds(
    db,
    worldSlug,
    uniqueStrings([...uniqueSeedNodeIds, ...relatedNodeIds])
  );
  for (const nodeId of firewallNodeIds) {
    addReason(orderedNodeIds, reasons, nodeId, "Mystery Reserve firewall for nucleus node");
  }

  const nodes = loadPacketNodes(db, worldSlug, orderedNodeIds);
  return {
    nodes,
    why_included: nodes.map((node) => reasons.get(node.id) ?? "required nucleus context")
  };
}
