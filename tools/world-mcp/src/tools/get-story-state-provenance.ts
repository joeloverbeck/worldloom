import type { NodeType } from "@worldloom/world-index/public/types";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { openIndexDb } from "../db/index.js";
import { createMcpError, type McpError } from "../errors.js";

import {
  isMcpError,
  resolveRecordRow,
  validateRecordId
} from "./get-record.js";
import { isStoryBundleRecordId } from "./_shared.js";

export interface GetStoryStateProvenanceArgs {
  record_id: string;
  world_slug?: string;
  story_slug?: string;
}

export interface GetStoryStateProvenanceResponse {
  record_id: string;
  record_class: string;
  creating_se_id: string | null;
  modifying_se_ids: string[];
  evidence_records: string[];
}

interface EdgeSourceRow {
  source_node_id: string;
}

interface EdgeTargetRow {
  target_node_id: string;
}

function displayNodeId(nodeId: string, storySlug?: string | null): string {
  if (storySlug !== undefined && storySlug !== null && nodeId.startsWith(`${storySlug}:`)) {
    return nodeId.slice(storySlug.length + 1);
  }

  return nodeId;
}

function recordClass(recordId: string, nodeType: NodeType): string {
  const separator = recordId.indexOf("-");
  if (separator > 0) {
    return recordId.slice(0, separator);
  }

  return nodeType;
}

async function getStoryStateProvenanceImpl(
  args: GetStoryStateProvenanceArgs
): Promise<GetStoryStateProvenanceResponse | McpError> {
  const idError = validateRecordId(args.record_id);
  if (idError !== null) {
    return idError;
  }

  if (!isStoryBundleRecordId(args.record_id)) {
    return createMcpError(
      "invalid_input",
      "get_story_state_provenance requires a story-bundle record id.",
      {
        field: "record_id",
        record_id: args.record_id
      }
    );
  }

  const resolved = resolveRecordRow(args);
  if (isMcpError(resolved)) {
    return resolved;
  }

  const opened = openIndexDb(resolved.worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const creatingRows = opened.db
      .prepare(
        `
          SELECT source_node_id
          FROM edges
          WHERE target_node_id = ?
            AND edge_type = 'state_delta_create'
          ORDER BY source_node_id
        `
      )
      .all(resolved.row.node_id) as EdgeSourceRow[];

    const modifyingRows = opened.db
      .prepare(
        `
          SELECT source_node_id
          FROM edges
          WHERE target_node_id = ?
            AND edge_type = 'state_delta_supersede'
          ORDER BY source_node_id
        `
      )
      .all(resolved.row.node_id) as EdgeSourceRow[];

    const evidenceRows = opened.db
      .prepare(
        `
          SELECT target_node_id
          FROM edges
          WHERE source_node_id = ?
            AND edge_type = 'creation_evidence'
            AND target_node_id IS NOT NULL
          ORDER BY target_node_id
        `
      )
      .all(resolved.row.node_id) as EdgeTargetRow[];

    return {
      record_id: args.record_id,
      record_class: recordClass(args.record_id, resolved.row.node_type),
      creating_se_id:
        creatingRows.length > 0
          ? displayNodeId(creatingRows[0]!.source_node_id, resolved.row.story_slug)
          : null,
      modifying_se_ids: modifyingRows.map((row) =>
        displayNodeId(row.source_node_id, resolved.row.story_slug)
      ),
      evidence_records: evidenceRows.map((row) =>
        displayNodeId(row.target_node_id, resolved.row.story_slug)
      )
    };
  } finally {
    opened.db.close();
  }
}

export const getStoryStateProvenance = withIndexFreshnessGuard(getStoryStateProvenanceImpl);
