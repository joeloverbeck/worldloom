import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

import { makeBodyPreview, resolveNodeWorld } from "./_shared";

export interface GetNodeArgs {
  node_id: string;
  world_slug?: string;
}

export interface NodeEdge {
  edge_id: number;
  direction: "outgoing" | "incoming";
  edge_type: EdgeType;
  other_node_id: string | null;
  target_unresolved_ref: string | null;
}

export interface NodeMention {
  mention_id: number;
  surface_text: string;
  resolved_entity_id: string | null;
  resolution_kind: "canonical" | "alias" | "unresolved";
  extraction_method: "exact_canonical" | "exact_alias" | "heuristic_phrase";
  canonical_name: string | null;
  entity_kind: string | null;
}

export interface NodeDetail {
  id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  body: string;
  body_preview: string;
  summary: string | null;
  content_hash: string;
  anchor_checksum: string;
  anchor_form: string | null;
  edges: NodeEdge[];
  entity_mentions: NodeMention[];
}

interface NodeRow {
  node_id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  body: string;
  summary: string | null;
  content_hash: string;
  anchor_checksum: string;
}

export async function getNode(args: GetNodeArgs): Promise<NodeDetail | McpError> {
  const resolved = resolveNodeWorld(args.node_id, args.world_slug);
  if ("code" in resolved) {
    return resolved;
  }

  const opened = openIndexDb(resolved.worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const row = opened.db
      .prepare(
        `
          SELECT
            node_id,
            world_slug,
            node_type,
            file_path,
            heading_path,
            body,
            summary,
            content_hash,
            anchor_checksum
          FROM nodes
          WHERE node_id = ?
          LIMIT 1
        `
      )
      .get(args.node_id) as NodeRow | undefined;

    if (row === undefined) {
      return createMcpError("node_not_found", `Node '${args.node_id}' does not exist.`, {
        node_id: args.node_id,
        world_slug: resolved.worldSlug
      });
    }

    const outgoingEdges = opened.db
      .prepare(
        `
          SELECT edge_id, edge_type, target_node_id, target_unresolved_ref
          FROM edges
          WHERE source_node_id = ?
          ORDER BY edge_id
        `
      )
      .all(args.node_id) as Array<{
      edge_id: number;
      edge_type: EdgeType;
      target_node_id: string | null;
      target_unresolved_ref: string | null;
    }>;

    const incomingEdges = opened.db
      .prepare(
        `
          SELECT edge_id, edge_type, source_node_id, target_unresolved_ref
          FROM edges
          WHERE target_node_id = ?
          ORDER BY edge_id
        `
      )
      .all(args.node_id) as Array<{
      edge_id: number;
      edge_type: EdgeType;
      source_node_id: string | null;
      target_unresolved_ref: string | null;
    }>;

    const entityMentions = opened.db
      .prepare(
        `
          SELECT
            em.mention_id,
            em.surface_text,
            em.resolved_entity_id,
            em.resolution_kind,
            em.extraction_method,
            e.canonical_name,
            e.entity_kind
          FROM entity_mentions em
          LEFT JOIN entities e ON e.entity_id = em.resolved_entity_id
          WHERE em.node_id = ?
          ORDER BY em.mention_id
        `
      )
      .all(args.node_id) as NodeMention[];

    const anchorRow = opened.db
      .prepare(
        `
          SELECT anchor_form
          FROM anchor_checksums
          WHERE node_id = ?
          LIMIT 1
        `
      )
      .get(args.node_id) as { anchor_form: string } | undefined;

    return {
      id: row.node_id,
      world_slug: row.world_slug,
      node_type: row.node_type,
      file_path: row.file_path,
      heading_path: row.heading_path,
      body: row.body,
      body_preview: makeBodyPreview(row.body),
      summary: row.summary ?? null,
      content_hash: row.content_hash,
      anchor_checksum: row.anchor_checksum,
      anchor_form: anchorRow?.anchor_form ?? null,
      edges: [
        ...outgoingEdges.map((edge) => ({
          edge_id: edge.edge_id,
          direction: "outgoing" as const,
          edge_type: edge.edge_type,
          other_node_id: edge.target_node_id,
          target_unresolved_ref: edge.target_unresolved_ref
        })),
        ...incomingEdges.map((edge) => ({
          edge_id: edge.edge_id,
          direction: "incoming" as const,
          edge_type: edge.edge_type,
          other_node_id: edge.source_node_id,
          target_unresolved_ref: edge.target_unresolved_ref
        }))
      ],
      entity_mentions: entityMentions
    };
  } finally {
    opened.db.close();
  }
}
