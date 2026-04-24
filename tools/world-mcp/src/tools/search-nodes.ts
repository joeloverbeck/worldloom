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

function mergeRows(rows: SearchRow[]): SearchRow[] {
  const merged = new Map<string, SearchRow>();

  for (const row of rows) {
    const existing = merged.get(row.node_id);
    if (existing === undefined) {
      merged.set(row.node_id, { ...row });
      continue;
    }

    existing.lexical_score = Math.max(existing.lexical_score ?? 0, row.lexical_score ?? 0);
    existing.exact_id_match = existing.exact_id_match === 1 || row.exact_id_match === 1 ? 1 : 0;
    existing.exact_entity_match_in_target_field =
      existing.exact_entity_match_in_target_field === 1 ||
      row.exact_entity_match_in_target_field === 1
        ? 1
        : 0;
    existing.exact_structured_record_edge_match =
      existing.exact_structured_record_edge_match === 1 ||
      row.exact_structured_record_edge_match === 1
        ? 1
        : 0;
    existing.exact_scoped_reference_match =
      existing.exact_scoped_reference_match === 1 || row.exact_scoped_reference_match === 1
        ? 1
        : 0;
  }

  return [...merged.values()];
}

function buildSignalColumns(): string {
  return `
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
    CASE
      WHEN ? <> '' AND EXISTS (
        SELECT 1
        FROM scoped_references sr
        LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
        WHERE sr.source_node_id = n.node_id
          AND sr.authority_level = 'exact_structured_edge'
          AND (sr.display_name = ? OR sra.alias_text = ?)
      ) THEN 1
      ELSE 0
    END AS exact_structured_record_edge_match,
    CASE
      WHEN ? <> '' AND EXISTS (
        SELECT 1
        FROM scoped_references sr
        LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
        WHERE sr.source_node_id = n.node_id
          AND sr.authority_level = 'explicit_scoped_reference'
          AND (sr.display_name = ? OR sra.alias_text = ?)
      ) THEN 1
      ELSE 0
    END AS exact_scoped_reference_match
  `;
}

function buildSignalParams(query: string, entityName: string, referenceName: string): unknown[] {
  return [
    query,
    query,
    entityName,
    entityName,
    entityName,
    referenceName,
    referenceName,
    referenceName,
    referenceName,
    referenceName,
    referenceName
  ];
}

function includeScopedReferenceNodes(args: SearchNodesArgs): boolean {
  return args.filters?.node_type === "scoped_reference";
}

function loadFilteredRows(
  args: SearchNodesArgs,
  worldSlug: string,
  filterNodeIds: string[]
): SearchRow[] | McpError {
  const opened = openIndexDb(worldSlug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const placeholders = filterNodeIds.map(() => "?").join(", ");
    const query = args.query.trim();
    const entityName = args.filters?.entity_name ?? query;
    const referenceName = args.filters?.reference_name ?? query;
    const allowScopedReferenceNodes = includeScopedReferenceNodes(args);

    return opened.db
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
            ${buildSignalColumns()},
            0 AS lexical_score
          FROM nodes n
          WHERE n.world_slug = ?
            AND n.node_id IN (${placeholders})
            AND (? = 1 OR n.node_type <> 'scoped_reference')
        `
      )
      .all(
        ...buildSignalParams(query, entityName, referenceName),
        worldSlug,
        ...filterNodeIds
        ,
        allowScopedReferenceNodes ? 1 : 0
      ) as SearchRow[];
  } finally {
    opened.db.close();
  }
}

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
    const referenceName = args.filters?.reference_name ?? query;
    const includeScopedReferences =
      args.filters?.include_scoped_references === true || args.filters?.reference_name !== undefined;
    const allowScopedReferenceNodes = includeScopedReferenceNodes(args);

    if (query.length === 0) {
      const rows = loadFilteredRows(args, worldSlug, filterNodeIds);
      return rows;
    }

    const lexicalRows = opened.db
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
            ${buildSignalColumns()},
            COALESCE(-bm25(fts_nodes), 0) AS lexical_score
          FROM fts_nodes
          JOIN nodes n ON n.rowid = fts_nodes.rowid
          WHERE n.world_slug = ?
            AND n.node_id IN (${placeholders})
            AND (? = 1 OR n.node_type <> 'scoped_reference')
            AND fts_nodes MATCH ?
        `
      )
      .all(
        ...buildSignalParams(query, entityName, referenceName),
        worldSlug,
        ...filterNodeIds,
        allowScopedReferenceNodes ? 1 : 0,
        query
      ) as SearchRow[];

    const scopedRows =
      includeScopedReferences === false
        ? []
        : (opened.db
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
                  ${buildSignalColumns()},
                  0 AS lexical_score
                FROM nodes n
                WHERE n.world_slug = ?
                  AND n.node_id IN (${placeholders})
                  AND n.node_type <> 'scoped_reference'
                  AND EXISTS (
                    SELECT 1
                    FROM scoped_references sr
                    LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
                    WHERE sr.source_node_id = n.node_id
                      AND (
                        lower(sr.display_name) LIKE ?
                        OR lower(COALESCE(sra.alias_text, '')) LIKE ?
                      )
                  )
              `
            )
            .all(
              ...buildSignalParams(query, entityName, referenceName),
              worldSlug,
              ...filterNodeIds,
              `%${query.toLocaleLowerCase()}%`,
              `%${query.toLocaleLowerCase()}%`
            ) as SearchRow[]);

    return mergeRows([...lexicalRows, ...scopedRows]);
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
    const referenceName = args.filters?.reference_name ?? args.query.trim();
    const includeScopedReferences =
      args.filters?.include_scoped_references === true || args.filters?.reference_name !== undefined;
    const allowScopedReferenceNodes = includeScopedReferenceNodes(args);

    const lexicalRows = opened.db
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
            ${buildSignalColumns()},
            0 AS lexical_score
          FROM nodes n
          WHERE n.world_slug = ?
            AND n.node_id IN (${placeholders})
            AND (? = 1 OR n.node_type <> 'scoped_reference')
            AND (
              lower(n.node_id) = lower(?)
              OR lower(n.body) LIKE ?
              OR lower(COALESCE(n.heading_path, '')) LIKE ?
          )
        `
      )
      .all(
        ...buildSignalParams(args.query.trim(), entityName, referenceName),
        worldSlug,
        ...filterNodeIds,
        allowScopedReferenceNodes ? 1 : 0,
        args.query.trim(),
        likeQuery,
        likeQuery
      ) as SearchRow[];

    const scopedRows =
      includeScopedReferences === false
        ? []
        : (opened.db
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
                  ${buildSignalColumns()},
                  0 AS lexical_score
                FROM nodes n
                WHERE n.world_slug = ?
                  AND n.node_id IN (${placeholders})
                  AND n.node_type <> 'scoped_reference'
                  AND EXISTS (
                    SELECT 1
                    FROM scoped_references sr
                    LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
                    WHERE sr.source_node_id = n.node_id
                      AND (
                        lower(sr.display_name) LIKE ?
                        OR lower(COALESCE(sra.alias_text, '')) LIKE ?
                      )
                  )
              `
            )
            .all(
              ...buildSignalParams(args.query.trim(), entityName, referenceName),
              worldSlug,
              ...filterNodeIds,
              likeQuery,
              likeQuery
            ) as SearchRow[]);

    if ((error as Error).message.length > 0) {
      return mergeRows([...lexicalRows, ...scopedRows]);
    }

    return mergeRows([...lexicalRows, ...scopedRows]);
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
    body_preview: makeBodyPreview(row.body),
    match_basis:
      row.exact_id_match === 1
        ? "exact_id"
        : row.exact_entity_match_in_target_field === 1
          ? "canonical_entity"
          : row.exact_structured_record_edge_match === 1
            ? "structured_record_edge"
            : row.exact_scoped_reference_match === 1
              ? "scoped_reference"
              : "lexical_evidence"
  }));

  return { nodes };
}
