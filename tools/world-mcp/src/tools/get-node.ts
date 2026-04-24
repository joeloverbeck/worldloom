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

export interface StructuredLink {
  edge_id: number;
  edge_type: "references_record";
  target_node_id: string | null;
  target_unresolved_ref: string | null;
  source_field: string;
}

export interface NodeScopedReference {
  reference_id: string;
  display_name: string;
  reference_kind: string | null;
  relation: string;
  authority_level: "explicit_scoped_reference" | "exact_structured_edge";
  target_node_id: string | null;
  aliases: string[];
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
  structured_links: StructuredLink[];
  scoped_references: NodeScopedReference[];
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

    const structuredLinks = opened.db
      .prepare(
        `
          SELECT
            e.edge_id,
            e.edge_type,
            e.target_node_id,
            e.target_unresolved_ref,
            sr.source_field
          FROM edges e
          INNER JOIN scoped_references sr
            ON sr.source_node_id = e.source_node_id
           AND sr.authority_level = 'exact_structured_edge'
           AND sr.target_node_id = e.target_node_id
          WHERE e.source_node_id = ?
            AND e.edge_type = 'references_record'
          ORDER BY e.edge_id, sr.reference_id
        `
      )
      .all(args.node_id) as StructuredLink[];

    const scopedReferences = opened.db
      .prepare(
        `
          SELECT
            reference_id,
            display_name,
            reference_kind,
            relation,
            authority_level,
            target_node_id
          FROM scoped_references
          WHERE source_node_id = ?
          ORDER BY reference_id
        `
      )
      .all(args.node_id) as Array<Omit<NodeScopedReference, "aliases">>;

    const aliasesByReferenceId = new Map<string, string[]>();

    if (scopedReferences.length > 0) {
      const placeholders = scopedReferences.map(() => "?").join(", ");
      const aliasRows = opened.db
        .prepare(
          `
            SELECT reference_id, alias_text
            FROM scoped_reference_aliases
            WHERE reference_id IN (${placeholders})
            ORDER BY alias_id
          `
        )
        .all(...scopedReferences.map((reference) => reference.reference_id)) as Array<{
        reference_id: string;
        alias_text: string;
      }>;

      for (const aliasRow of aliasRows) {
        const aliases = aliasesByReferenceId.get(aliasRow.reference_id);
        if (aliases === undefined) {
          aliasesByReferenceId.set(aliasRow.reference_id, [aliasRow.alias_text]);
        } else {
          aliases.push(aliasRow.alias_text);
        }
      }
    }

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
      entity_mentions: entityMentions,
      structured_links: structuredLinks,
      scoped_references: scopedReferences.map((reference) => ({
        ...reference,
        aliases: aliasesByReferenceId.get(reference.reference_id) ?? []
      }))
    };
  } finally {
    opened.db.close();
  }
}
