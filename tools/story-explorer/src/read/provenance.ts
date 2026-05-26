import { openExistingIndex } from "@worldloom/world-index/index/open";

import { resolveRepoRoot } from "../config/repo-root.js";

export interface RecordProvenance {
  creatingSeId: string | null;
  modifyingSeIds: string[];
  evidenceRecords: string[];
}

interface EdgeSourceRow {
  source_node_id: string;
}

interface EdgeTargetRow {
  target_node_id: string;
}

function indexNodeId(storySlug: string, recordId: string): string {
  return `${storySlug}:${recordId}`;
}

function displayNodeId(nodeId: string, storySlug: string): string {
  const prefix = `${storySlug}:`;
  return nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
}

export async function getRecordProvenance(
  worldSlug: string,
  storySlug: string,
  recordId: string,
  repoRoot = resolveRepoRoot()
): Promise<RecordProvenance> {
  const db = openExistingIndex(repoRoot, worldSlug);
  const targetNodeIds = [recordId, indexNodeId(storySlug, recordId)];

  try {
    const creatingRows = db
      .prepare(
        `
          SELECT source_node_id
          FROM edges
          WHERE target_node_id IN (?, ?)
            AND edge_type = 'state_delta_create'
          ORDER BY source_node_id
        `
      )
      .all(...targetNodeIds) as EdgeSourceRow[];
    const modifyingRows = db
      .prepare(
        `
          SELECT source_node_id
          FROM edges
          WHERE target_node_id IN (?, ?)
            AND edge_type = 'state_delta_supersede'
          ORDER BY source_node_id
        `
      )
      .all(...targetNodeIds) as EdgeSourceRow[];
    const evidenceRows = db
      .prepare(
        `
          SELECT target_node_id
          FROM edges
          WHERE source_node_id IN (?, ?)
            AND edge_type = 'creation_evidence'
            AND target_node_id IS NOT NULL
          ORDER BY target_node_id
        `
      )
      .all(...targetNodeIds) as EdgeTargetRow[];

    return {
      creatingSeId:
        creatingRows.length > 0 ? displayNodeId(creatingRows[0]!.source_node_id, storySlug) : null,
      modifyingSeIds: modifyingRows.map((row) => displayNodeId(row.source_node_id, storySlug)),
      evidenceRecords: evidenceRows.map((row) => displayNodeId(row.target_node_id, storySlug)),
    };
  } finally {
    db.close();
  }
}
