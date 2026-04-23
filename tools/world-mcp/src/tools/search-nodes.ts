import { openIndexDb } from "../db";
import type { McpError } from "../errors";

import {
  applyFilters,
  listIndexedWorldSlugs,
  makeBodyPreview,
  rankSearchRows,
  type SearchNodeResult,
  type SearchNodesArgs,
  type SearchNodesResponse,
  type SearchRow
} from "./_shared";

function searchWorld(args: SearchNodesArgs, worldSlug: string): SearchRow[] | McpError {
  const opened = openIndexDb(worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const filterNodeIds = applyFilters(opened.db, worldSlug, args.filters);
    if (filterNodeIds.length === 0) {
      return [];
    }

    const placeholders = filterNodeIds.map(() => "?").join(", ");
    const query = args.query.trim();
    const entityName = args.filters?.entity_name ?? query;
    const rows = opened.db
      .prepare(
        `
          SELECT
            n.node_id,
            n.world_slug,
            n.node_type,
            n.file_path,
            n.heading_path,
            n.body,
            n.summary,
            CASE WHEN ? <> '' AND n.node_id = ? THEN 1 ELSE 0 END AS exact_id_match,
            CASE
              WHEN ? <> '' AND EXISTS (
                SELECT 1
                FROM entity_mentions em
                LEFT JOIN entities e ON e.entity_id = em.resolved_entity_id
                LEFT JOIN entity_aliases ea ON ea.entity_id = em.resolved_entity_id
                WHERE em.node_id = n.node_id
                  AND em.resolved_entity_id IS NOT NULL
                  AND (e.canonical_name = ? OR ea.alias_text = ?)
              ) THEN 1
              ELSE 0
            END AS exact_entity_match_in_target_field,
            COALESCE(-bm25(fts_nodes), 0) AS lexical_score
          FROM fts_nodes
          JOIN nodes n ON n.rowid = fts_nodes.rowid
          WHERE n.world_slug = ?
            AND n.node_id IN (${placeholders})
            AND fts_nodes MATCH ?
        `
      )
      .all(query, query, entityName, entityName, entityName, worldSlug, ...filterNodeIds, query) as SearchRow[];

    return rows;
  } catch (error) {
    if (args.query.trim().length === 0) {
      return [];
    }

    const likeQuery = `%${args.query.trim().toLocaleLowerCase()}%`;
    const filterNodeIds = applyFilters(opened.db, worldSlug, args.filters);
    if (filterNodeIds.length === 0) {
      return [];
    }

    const placeholders = filterNodeIds.map(() => "?").join(", ");
    const entityName = args.filters?.entity_name ?? args.query.trim();

    const rows = opened.db
      .prepare(
        `
          SELECT
            n.node_id,
            n.world_slug,
            n.node_type,
            n.file_path,
            n.heading_path,
            n.body,
            n.summary,
            CASE WHEN ? <> '' AND n.node_id = ? THEN 1 ELSE 0 END AS exact_id_match,
            CASE
              WHEN ? <> '' AND EXISTS (
                SELECT 1
                FROM entity_mentions em
                LEFT JOIN entities e ON e.entity_id = em.resolved_entity_id
                LEFT JOIN entity_aliases ea ON ea.entity_id = em.resolved_entity_id
                WHERE em.node_id = n.node_id
                  AND em.resolved_entity_id IS NOT NULL
                  AND (e.canonical_name = ? OR ea.alias_text = ?)
              ) THEN 1
              ELSE 0
            END AS exact_entity_match_in_target_field,
            0 AS lexical_score
          FROM nodes n
          WHERE n.world_slug = ?
            AND n.node_id IN (${placeholders})
            AND (
              lower(n.node_id) = lower(?)
              OR lower(n.body) LIKE ?
              OR lower(COALESCE(n.heading_path, '')) LIKE ?
            )
        `
      )
      .all(
        args.query.trim(),
        args.query.trim(),
        entityName,
        entityName,
        entityName,
        worldSlug,
        ...filterNodeIds,
        args.query.trim(),
        likeQuery,
        likeQuery
      ) as SearchRow[];

    if ((error as Error).message.length > 0) {
      return rows;
    }

    return rows;
  } finally {
    opened.db.close();
  }
}

export async function searchNodes(args: SearchNodesArgs): Promise<SearchNodesResponse | McpError> {
  const worldSlugs =
    args.filters?.world_slug !== undefined ? [args.filters.world_slug] : listIndexedWorldSlugs();

  const rows: SearchRow[] = [];

  for (const worldSlug of worldSlugs) {
    const worldRows = searchWorld(args, worldSlug);
    if ("code" in worldRows) {
      if (args.filters?.world_slug !== undefined) {
        return worldRows;
      }

      continue;
    }

    rows.push(...worldRows);
  }

  const rankedRows = rankSearchRows(rows, { query: args.query }, args.ranking_profile).slice(0, 20);
  const nodes: SearchNodeResult[] = rankedRows.map((row) => ({
    id: row.node_id,
    world_slug: row.world_slug,
    node_type: row.node_type,
    heading_path: row.heading_path,
    summary: row.summary ?? null,
    body_preview: makeBodyPreview(row.body)
  }));

  return { nodes };
}
