import type { NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import type { McpError } from "../errors";

export interface FindNamedEntitiesArgs {
  world_slug: string;
  names: string[];
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
  mentions_by_node_type: MentionNodeTypeGroup[];
}

export interface SurfaceMatch {
  query: string;
  surface_text: string;
  label: "noncanonical";
  node_type: NodeType;
  count: number;
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
  hints?: FindNamedEntityHint[];
}

export interface FindNamedEntityHint {
  query: string;
  descriptor_kind: "region" | "era";
  record_count: number;
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
  record_count: number;
}

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

  const loadCount = (fileClass: "geography" | "timeline"): number => {
    const row = db
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
      .get(worldSlug, normalizedQuery, normalizedQuery, normalizedQuery) as DescriptorHintRow;

    return row.record_count;
  };

  const eraCount = loadCount("timeline");
  const regionCount = loadCount("geography");
  const looksEraLike = /\b(era|age|period|wave|epoch)\b/i.test(query);

  if (eraCount > 0 && (regionCount === 0 || looksEraLike)) {
    return {
      query,
      descriptor_kind: "era",
      record_count: eraCount,
      message: `no exact entity match; '${query}' appears as an era descriptor in ${eraCount} record${
        eraCount === 1 ? "" : "s"
      } - try search_nodes(world_slug, query='${query}') for content lookup`
    };
  }

  if (regionCount > 0) {
    return {
      query,
      descriptor_kind: "region",
      record_count: regionCount,
      message: `no exact entity match; '${query}' appears as a region descriptor in ${regionCount} record${
        regionCount === 1 ? "" : "s"
      } - try search_nodes(world_slug, query='${query}') for content lookup`
    };
  }

  if (eraCount > 0) {
    return {
      query,
      descriptor_kind: "era",
      record_count: eraCount,
      message: `no exact entity match; '${query}' appears as an era descriptor in ${eraCount} record${
        eraCount === 1 ? "" : "s"
      } - try search_nodes(world_slug, query='${query}') for content lookup`
    };
  }

  return undefined;
}

function loadMentionGroups(
  db: import("better-sqlite3").Database,
  worldSlug: string,
  entityId: string
): MentionNodeTypeGroup[] {
  return db
    .prepare(
      `
        SELECT n.node_type, COUNT(*) AS count
        FROM entity_mentions em
        INNER JOIN nodes n ON n.node_id = em.node_id
        WHERE n.world_slug = ?
          AND em.resolved_entity_id = ?
        GROUP BY n.node_type
        ORDER BY n.node_type
      `
    )
    .all(worldSlug, entityId) as MentionNodeTypeGroup[];
}

export async function findNamedEntities(
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
    const hints: FindNamedEntityHint[] = [];

    for (const name of names) {
      let queryHasMatches = false;
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
        queryHasMatches = true;
        canonicalMatches.push({
          query: name,
          entity_id: row.entity_id,
          canonical_name: row.canonical_name,
          entity_kind: row.entity_kind,
          provenance_scope: row.provenance_scope,
          match_kind: "canonical_name",
          matched_text: row.canonical_name,
          mentions_by_node_type: loadMentionGroups(opened.db, args.world_slug, row.entity_id)
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
        queryHasMatches = true;
        canonicalMatches.push({
          query: name,
          entity_id: row.entity_id,
          canonical_name: row.canonical_name,
          entity_kind: row.entity_kind,
          provenance_scope: row.provenance_scope,
          match_kind: "alias",
          matched_text: row.alias_text,
          mentions_by_node_type: loadMentionGroups(opened.db, args.world_slug, row.entity_id)
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

    const response: FindNamedEntitiesResponse = {
      canonical_matches: canonicalMatches,
      scoped_matches: scopedMatches,
      surface_matches: surfaceMatches
    };

    if (hints.length > 0) {
      response.hints = hints;
    }

    return response;
  } finally {
    opened.db.close();
  }
}
