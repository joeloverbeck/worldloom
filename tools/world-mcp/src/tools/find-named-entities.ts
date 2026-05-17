import type { NodeType } from "@worldloom/world-index/public/types";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { openIndexDb } from "../db/index.js";
import type { McpError } from "../errors.js";

export interface FindNamedEntitiesArgs {
  world_slug: string;
  names: string[];
  story_slug?: string;
  node_type_filter?: NodeType[];
}

export interface MentionNodeTypeGroup {
  node_type: NodeType;
  count: number;
}

export interface CanonicalMatch {
  query: string;
  entity_id: string;
  canonical_name: string;
  entity_kind: string | null;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
  match_kind: "canonical_name" | "alias";
  matched_text: string;
  /**
   * When node_type_filter is provided, this array contains only mention groups
   * whose node_type is in the filter. Canonical matches with no remaining
   * mention groups are omitted from the response.
   */
  mentions_by_node_type: MentionNodeTypeGroup[];
}

export interface SurfaceMatch {
  query: string;
  surface_text: string;
  label: "noncanonical";
  node_type: NodeType;
  count: number;
}

export interface StoryLocalMatch {
  query: string;
  story_slug: string;
  node_id: string;
  node_type: NodeType;
  matched_text: string;
  match_kind: "canonical_entity" | "alias" | "surface_text";
}

export interface ScopedMatch {
  query: string;
  reference_id: string;
  display_name: string;
  reference_kind: string | null;
  relation: string;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
  source_node_id: string;
  target_node_id: string | null;
  match_kind: "display_name" | "alias_text";
  matched_text: string;
}

export interface FindNamedEntitiesResponse {
  canonical_matches: CanonicalMatch[];
  scoped_matches: ScopedMatch[];
  surface_matches: SurfaceMatch[];
  story_local_matches?: StoryLocalMatch[];
  hints?: FindNamedEntityHint[];
}

export interface FindNamedEntityHint {
  query: string;
  descriptor_kind: "region" | "era";
  record_count: number;
  matching_record_ids: string[];
  message: string;
}

interface CanonicalEntityRow {
  entity_id: string;
  canonical_name: string;
  entity_kind: string | null;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
}

interface ScopedReferenceRow {
  reference_id: string;
  display_name: string;
  reference_kind: string | null;
  relation: string;
  provenance_scope: "world" | "proposal" | "diegetic" | "audit";
  source_node_id: string;
  target_node_id: string | null;
}

interface DescriptorHintRow {
  node_id: string;
  hit_count: number;
}

interface DescriptorHintCountRow {
  record_count: number;
}

export const HINT_MATCHING_RECORD_IDS_CAP = 10;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function descriptorLikeClause(fileClass: "geography" | "timeline"): string {
  const rootFile = fileClass === "geography" ? "GEOGRAPHY.md" : "TIMELINE.md";
  return `
    (
      file_path = '${rootFile}'
      OR file_path LIKE '_source/${fileClass}/%'
    )
  `;
}

function loadDescriptorHint(
  db: import("better-sqlite3").Database,
  worldSlug: string,
  query: string
): FindNamedEntityHint | undefined {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length === 0) {
    return undefined;
  }

  const loadMatches = (
    fileClass: "geography" | "timeline"
  ): { recordCount: number; matchingRecordIds: string[] } => {
    const countRow = db
      .prepare(
        `
          SELECT COUNT(DISTINCT node_id) AS record_count
          FROM nodes
          WHERE world_slug = ?
            AND ${descriptorLikeClause(fileClass)}
            AND (
              instr(lower(coalesce(heading_path, '')), ?) > 0
              OR instr(lower(coalesce(summary, '')), ?) > 0
              OR instr(lower(body), ?) > 0
            )
        `
      )
      .get(
        worldSlug,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery
      ) as DescriptorHintCountRow;

    const rows = db
      .prepare(
        `
          SELECT
            node_id,
            (
              CASE WHEN instr(lower(coalesce(heading_path, '')), ?) > 0 THEN 1 ELSE 0 END
              + CASE WHEN instr(lower(coalesce(summary, '')), ?) > 0 THEN 1 ELSE 0 END
              + CASE WHEN instr(lower(body), ?) > 0 THEN 1 ELSE 0 END
            ) AS hit_count
          FROM nodes
          WHERE world_slug = ?
            AND ${descriptorLikeClause(fileClass)}
            AND (
              instr(lower(coalesce(heading_path, '')), ?) > 0
              OR instr(lower(coalesce(summary, '')), ?) > 0
              OR instr(lower(body), ?) > 0
            )
          ORDER BY hit_count DESC, node_id
          LIMIT ?
        `
      )
      .all(
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        worldSlug,
        normalizedQuery,
        normalizedQuery,
        normalizedQuery,
        HINT_MATCHING_RECORD_IDS_CAP
      ) as DescriptorHintRow[];

    return {
      recordCount: countRow.record_count,
      matchingRecordIds: rows.map((row) => row.node_id)
    };
  };

  const eraMatches = loadMatches("timeline");
  const regionMatches = loadMatches("geography");
  const looksEraLike = /\b(era|age|period|wave|epoch)\b/i.test(query);

  const buildHint = (
    descriptorKind: "region" | "era",
    matches: { recordCount: number; matchingRecordIds: string[] }
  ): FindNamedEntityHint => {
    const capped = matches.recordCount > HINT_MATCHING_RECORD_IDS_CAP;
    const descriptorArticle = descriptorKind === "era" ? "an" : "a";
    return {
      query,
      descriptor_kind: descriptorKind,
      record_count: matches.recordCount,
      matching_record_ids: matches.matchingRecordIds,
      message: capped
        ? `no exact entity match; '${query}' appears as ${descriptorArticle} ${descriptorKind} descriptor in ${
            matches.recordCount
          } records; matching_record_ids capped at ${HINT_MATCHING_RECORD_IDS_CAP}; use search_nodes(world_slug, query='${query}') for full ranked list`
        : `no exact entity match; '${query}' appears as ${descriptorArticle} ${descriptorKind} descriptor in ${
            matches.recordCount
          } record${matches.recordCount === 1 ? "" : "s"} (see matching_record_ids); use get_record(record_id) for full body`
    };
  };

  if (
    eraMatches.recordCount > 0 &&
    (regionMatches.recordCount === 0 || looksEraLike)
  ) {
    return buildHint("era", eraMatches);
  }

  if (regionMatches.recordCount > 0) {
    return buildHint("region", regionMatches);
  }

  if (eraMatches.recordCount > 0) {
    return buildHint("era", eraMatches);
  }

  return undefined;
}

function loadMentionGroups(
  db: import("better-sqlite3").Database,
  worldSlug: string,
  entityId: string,
  nodeTypeFilter: readonly NodeType[] | undefined
): MentionNodeTypeGroup[] {
  const filteredNodeTypes =
    nodeTypeFilter === undefined ? undefined : unique(nodeTypeFilter);

  if (filteredNodeTypes?.length === 0) {
    return [];
  }

  const filterSql =
    filteredNodeTypes === undefined
      ? ""
      : `AND n.node_type IN (${filteredNodeTypes.map(() => "?").join(", ")})`;

  return db
    .prepare(
      `
        SELECT n.node_type, COUNT(*) AS count
        FROM entity_mentions em
        INNER JOIN nodes n ON n.node_id = em.node_id
        WHERE n.world_slug = ?
          AND em.resolved_entity_id = ?
          AND n.story_slug IS NULL
          ${filterSql}
        GROUP BY n.node_type
        ORDER BY n.node_type
      `
    )
    .all(worldSlug, entityId, ...(filteredNodeTypes ?? [])) as MentionNodeTypeGroup[];
}

function displayStoryNodeId(nodeId: string, storySlug: string): string {
  const prefix = `${storySlug}:`;
  return nodeId.startsWith(prefix) ? nodeId.slice(prefix.length) : nodeId;
}

function loadStoryLocalMatches(
  db: import("better-sqlite3").Database,
  args: FindNamedEntitiesArgs,
  query: string
): StoryLocalMatch[] {
  if (args.story_slug === undefined) {
    return [];
  }

  const filteredNodeTypes =
    args.node_type_filter === undefined ? undefined : unique(args.node_type_filter);

  if (filteredNodeTypes?.length === 0) {
    return [];
  }

  const filterSql =
    filteredNodeTypes === undefined
      ? ""
      : `AND n.node_type IN (${filteredNodeTypes.map(() => "?").join(", ")})`;

  const rows = db
    .prepare(
      `
        SELECT DISTINCT
          n.node_id,
          n.node_type,
          em.surface_text,
          CASE
            WHEN e.canonical_name = ? THEN 'canonical_entity'
            WHEN ea.alias_text = ? THEN 'alias'
            ELSE 'surface_text'
          END AS match_kind
        FROM entity_mentions em
        INNER JOIN nodes n ON n.node_id = em.node_id
        LEFT JOIN entities e ON e.entity_id = em.resolved_entity_id
        LEFT JOIN entity_aliases ea ON ea.entity_id = em.resolved_entity_id
        WHERE n.world_slug = ?
          AND n.story_slug = ?
          ${filterSql}
          AND (
            em.surface_text = ?
            OR e.canonical_name = ?
            OR ea.alias_text = ?
          )
        ORDER BY n.node_id, em.surface_text
      `
    )
    .all(
      query,
      query,
      args.world_slug,
      args.story_slug,
      ...(filteredNodeTypes ?? []),
      query,
      query,
      query
    ) as Array<{
    node_id: string;
    node_type: NodeType;
    surface_text: string;
    match_kind: StoryLocalMatch["match_kind"];
  }>;

  return rows.map((row) => ({
    query,
    story_slug: args.story_slug!,
    node_id: displayStoryNodeId(row.node_id, args.story_slug!),
    node_type: row.node_type,
    matched_text: row.surface_text,
    match_kind: row.match_kind
  }));
}

async function findNamedEntitiesImpl(
  args: FindNamedEntitiesArgs
): Promise<FindNamedEntitiesResponse | McpError> {
  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const names = unique(args.names);
    if (names.length === 0) {
      return { canonical_matches: [], scoped_matches: [], surface_matches: [] };
    }

    const canonicalMatches: CanonicalMatch[] = [];
    const scopedMatches: ScopedMatch[] = [];
    const surfaceMatches: SurfaceMatch[] = [];
    const storyLocalMatches: StoryLocalMatch[] = [];
    const hints: FindNamedEntityHint[] = [];

    for (const name of names) {
      let queryHasMatches = false;
      const localMatches = loadStoryLocalMatches(opened.db, args, name);
      if (localMatches.length > 0) {
        queryHasMatches = true;
        storyLocalMatches.push(...localMatches);
      }

      const canonicalNameRows = opened.db
        .prepare(
          `
            SELECT entity_id, canonical_name, entity_kind, provenance_scope
            FROM entities
            WHERE world_slug = ?
              AND canonical_name = ?
            ORDER BY canonical_name, entity_id
          `
        )
        .all(args.world_slug, name) as CanonicalEntityRow[];

      for (const row of canonicalNameRows) {
        const mentionGroups = loadMentionGroups(
          opened.db,
          args.world_slug,
          row.entity_id,
          args.node_type_filter
        );
        if (args.node_type_filter !== undefined && mentionGroups.length === 0) {
          continue;
        }

        queryHasMatches = true;
        canonicalMatches.push({
          query: name,
          entity_id: row.entity_id,
          canonical_name: row.canonical_name,
          entity_kind: row.entity_kind,
          provenance_scope: row.provenance_scope,
          match_kind: "canonical_name",
          matched_text: row.canonical_name,
          mentions_by_node_type: mentionGroups
        });
      }

      const aliasRows = opened.db
        .prepare(
          `
            SELECT
              e.entity_id,
              e.canonical_name,
              e.entity_kind,
              e.provenance_scope,
              ea.alias_text
            FROM entity_aliases ea
            INNER JOIN entities e ON e.entity_id = ea.entity_id
            WHERE e.world_slug = ?
              AND ea.alias_text = ?
            ORDER BY e.canonical_name, e.entity_id
          `
        )
        .all(args.world_slug, name) as Array<
        CanonicalEntityRow & {
          alias_text: string;
        }
      >;

      for (const row of aliasRows) {
        const mentionGroups = loadMentionGroups(
          opened.db,
          args.world_slug,
          row.entity_id,
          args.node_type_filter
        );
        if (args.node_type_filter !== undefined && mentionGroups.length === 0) {
          continue;
        }

        queryHasMatches = true;
        canonicalMatches.push({
          query: name,
          entity_id: row.entity_id,
          canonical_name: row.canonical_name,
          entity_kind: row.entity_kind,
          provenance_scope: row.provenance_scope,
          match_kind: "alias",
          matched_text: row.alias_text,
          mentions_by_node_type: mentionGroups
        });
      }

      const scopedDisplayNameRows = opened.db
        .prepare(
          `
            SELECT
              reference_id,
              display_name,
              reference_kind,
              relation,
              provenance_scope,
              source_node_id,
              target_node_id
            FROM scoped_references
            WHERE world_slug = ?
              AND display_name = ?
            ORDER BY display_name, reference_id
          `
        )
        .all(args.world_slug, name) as ScopedReferenceRow[];

      for (const row of scopedDisplayNameRows) {
        queryHasMatches = true;
        scopedMatches.push({
          query: name,
          reference_id: row.reference_id,
          display_name: row.display_name,
          reference_kind: row.reference_kind,
          relation: row.relation,
          provenance_scope: row.provenance_scope,
          source_node_id: row.source_node_id,
          target_node_id: row.target_node_id,
          match_kind: "display_name",
          matched_text: row.display_name
        });
      }

      const scopedAliasRows = opened.db
        .prepare(
          `
            SELECT
              sr.reference_id,
              sr.display_name,
              sr.reference_kind,
              sr.relation,
              sr.provenance_scope,
              sr.source_node_id,
              sr.target_node_id,
              sra.alias_text
            FROM scoped_reference_aliases sra
            INNER JOIN scoped_references sr ON sr.reference_id = sra.reference_id
            WHERE sr.world_slug = ?
              AND sra.alias_text = ?
            ORDER BY sr.display_name, sr.reference_id
          `
        )
        .all(args.world_slug, name) as Array<
        ScopedReferenceRow & {
          alias_text: string;
        }
      >;

      for (const row of scopedAliasRows) {
        queryHasMatches = true;
        scopedMatches.push({
          query: name,
          reference_id: row.reference_id,
          display_name: row.display_name,
          reference_kind: row.reference_kind,
          relation: row.relation,
          provenance_scope: row.provenance_scope,
          source_node_id: row.source_node_id,
          target_node_id: row.target_node_id,
          match_kind: "alias_text",
          matched_text: row.alias_text
        });
      }

      const unresolvedRows = opened.db
        .prepare(
          `
            SELECT n.node_type, COUNT(*) AS count
            FROM entity_mentions em
            INNER JOIN nodes n ON n.node_id = em.node_id
            WHERE n.world_slug = ?
              AND n.story_slug IS NULL
              AND em.surface_text = ?
              AND em.resolution_kind = 'unresolved'
            GROUP BY n.node_type
            ORDER BY n.node_type
          `
        )
        .all(args.world_slug, name) as MentionNodeTypeGroup[];

      for (const row of unresolvedRows) {
        queryHasMatches = true;
        surfaceMatches.push({
          query: name,
          surface_text: name,
          label: "noncanonical",
          node_type: row.node_type,
          count: row.count
        });
      }

      if (!queryHasMatches) {
        const hint = loadDescriptorHint(opened.db, args.world_slug, name);
        if (hint !== undefined) {
          hints.push(hint);
        }
      }
    }

    canonicalMatches.sort((left, right) => {
      const leftRank = left.match_kind === "canonical_name" ? 0 : 1;
      const rightRank = right.match_kind === "canonical_name" ? 0 : 1;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (left.query !== right.query) {
        return left.query.localeCompare(right.query);
      }

      if (left.canonical_name !== right.canonical_name) {
        return left.canonical_name.localeCompare(right.canonical_name);
      }

      return left.entity_id.localeCompare(right.entity_id);
    });

    scopedMatches.sort((left, right) => {
      const leftRank = left.match_kind === "display_name" ? 0 : 1;
      const rightRank = right.match_kind === "display_name" ? 0 : 1;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      if (left.query !== right.query) {
        return left.query.localeCompare(right.query);
      }

      if (left.display_name !== right.display_name) {
        return left.display_name.localeCompare(right.display_name);
      }

      return left.reference_id.localeCompare(right.reference_id);
    });

    surfaceMatches.sort((left, right) => {
      if (left.query !== right.query) {
        return left.query.localeCompare(right.query);
      }

      return left.node_type.localeCompare(right.node_type);
    });

    storyLocalMatches.sort((left, right) => {
      if (left.query !== right.query) {
        return left.query.localeCompare(right.query);
      }

      if (left.node_id !== right.node_id) {
        return left.node_id.localeCompare(right.node_id);
      }

      return left.matched_text.localeCompare(right.matched_text);
    });

    const response: FindNamedEntitiesResponse = {
      canonical_matches: canonicalMatches,
      scoped_matches: scopedMatches,
      surface_matches: surfaceMatches
    };

    if (storyLocalMatches.length > 0) {
      response.story_local_matches = storyLocalMatches;
    }

    if (hints.length > 0) {
      response.hints = hints;
    }

    return response;
  } finally {
    opened.db.close();
  }
}

export const findNamedEntities = withIndexFreshnessGuard(findNamedEntitiesImpl);
