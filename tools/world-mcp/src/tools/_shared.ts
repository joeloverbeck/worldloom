import { readdirSync } from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";
import type { EdgeType, NodeType } from "@worldloom/world-index/public/types";

import { openIndexDb, resolveRepoRoot } from "../db";
import { createMcpError, type McpError } from "../errors";
import type { RankingCandidate, RankingWeights } from "../ranking/policy";
import { rankCandidates } from "../ranking/policy";
import { defaultRankingProfile } from "../ranking/profiles";

export interface SearchNodeFilters {
  world_slug?: string;
  node_type?: NodeType;
  file_path?: string;
  entity_name?: string;
  include_scoped_references?: boolean;
  reference_name?: string;
}

export interface SearchNodesArgs {
  query: string;
  filters?: SearchNodeFilters;
  ranking_profile?: RankingWeights;
}

export interface SearchNodeResult {
  id: string;
  world_slug: string;
  node_type: NodeType;
  heading_path: string | null;
  summary: string | null;
  body_preview: string;
  match_basis:
    | "exact_id"
    | "canonical_entity"
    | "structured_record_edge"
    | "scoped_reference"
    | "lexical_evidence";
}

export interface SearchNodesResponse {
  nodes: SearchNodeResult[];
}

export interface SearchRow {
  node_id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  body: string;
  summary: string | null;
  lexical_score?: number | null;
  exact_entity_match_in_target_field?: number | null;
  exact_id_match?: number | null;
  exact_structured_record_edge_match?: number | null;
  exact_scoped_reference_match?: number | null;
}

export interface QueryContext {
  query: string;
}

export interface ResolvedNodeWorld {
  worldSlug: string;
}

function hasStructuredPrefix(nodeId: string): boolean {
  return /^(?:[A-Z]+-\d+|M-\d+)$/.test(nodeId);
}

export function makeBodyPreview(body: string, maxLength = 200): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

function normalizeQuery(query: string): string {
  return query.trim();
}

export function listIndexedWorldSlugs(): string[] {
  const worldsRoot = path.join(resolveRepoRoot(), "worlds");

  try {
    return readdirSync(worldsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export function resolveWorldSlugFromNodeId(nodeId: string): string | null {
  const separator = nodeId.indexOf(":");
  if (separator <= 0) {
    return null;
  }

  return nodeId.slice(0, separator);
}

export function resolveNodeWorld(
  nodeId: string,
  worldSlugOverride?: string
): ResolvedNodeWorld | McpError {
  if (worldSlugOverride !== undefined && worldSlugOverride.length > 0) {
    return { worldSlug: worldSlugOverride };
  }

  const prefixedWorldSlug = resolveWorldSlugFromNodeId(nodeId);
  if (prefixedWorldSlug !== null) {
    return { worldSlug: prefixedWorldSlug };
  }

  if (!hasStructuredPrefix(nodeId)) {
    return createMcpError("node_not_found", `Node '${nodeId}' could not be resolved to a world.`, {
      node_id: nodeId
    });
  }

  const matchingWorlds: string[] = [];

  for (const worldSlug of listIndexedWorldSlugs()) {
    const opened = openIndexDb(worldSlug);
    if (!("db" in opened)) {
      continue;
    }

    try {
      const row = opened.db
        .prepare("SELECT node_id FROM nodes WHERE node_id = ? LIMIT 1")
        .get(nodeId) as { node_id: string } | undefined;

      if (row !== undefined) {
        matchingWorlds.push(worldSlug);
      }
    } finally {
      opened.db.close();
    }
  }

  if (matchingWorlds.length === 1) {
    return { worldSlug: matchingWorlds[0]! };
  }

  if (matchingWorlds.length > 1) {
    throw new Error(
      `Structured node id '${nodeId}' is ambiguous across indexed worlds: ${matchingWorlds.join(", ")}.`
    );
  }

  return createMcpError("node_not_found", `Node '${nodeId}' was not found in any indexed world.`, {
    node_id: nodeId
  });
}

export function applyFilters(
  db: Database.Database,
  worldSlug: string,
  filters: SearchNodeFilters = {}
): string[] {
  const clauses = ["n.world_slug = ?"];
  const params: unknown[] = [worldSlug];

  if (filters.node_type !== undefined) {
    clauses.push("n.node_type = ?");
    params.push(filters.node_type);
  }

  if (filters.file_path !== undefined) {
    clauses.push("n.file_path = ?");
    params.push(filters.file_path);
  }

  if (filters.entity_name !== undefined) {
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM entity_mentions em
        LEFT JOIN entities e ON e.entity_id = em.resolved_entity_id
        LEFT JOIN entity_aliases ea ON ea.entity_id = em.resolved_entity_id
        WHERE em.node_id = n.node_id
          AND em.resolved_entity_id IS NOT NULL
          AND (e.canonical_name = ? OR ea.alias_text = ?)
      )
    `);
    params.push(filters.entity_name, filters.entity_name);
  }

  if (filters.reference_name !== undefined) {
    clauses.push(`
      EXISTS (
        SELECT 1
        FROM scoped_references sr
        LEFT JOIN scoped_reference_aliases sra ON sra.reference_id = sr.reference_id
        WHERE sr.source_node_id = n.node_id
          AND (sr.display_name = ? OR sra.alias_text = ?)
      )
    `);
    params.push(filters.reference_name, filters.reference_name);
  }

  const sql = `
    SELECT DISTINCT n.node_id
    FROM nodes n
    WHERE ${clauses.join(" AND ")}
    ORDER BY n.node_id
  `;

  return (db.prepare(sql).all(...params) as Array<{ node_id: string }>).map((row) => row.node_id);
}

export function sqlToCandidates(rows: SearchRow[], context: QueryContext): RankingCandidate[] {
  const normalizedQuery = normalizeQuery(context.query);

  return rows.map((row) => ({
    node_id: row.node_id,
    node_type: row.node_type,
    file_path: row.file_path,
    exact_id_match:
      row.exact_id_match === 1 || row.node_id === normalizedQuery ? 1 : 0,
    exact_entity_match_in_target_field:
      row.exact_entity_match_in_target_field === 1 ? 1 : 0,
    exact_structured_record_edge_match:
      row.exact_structured_record_edge_match === 1 ? 1 : 0,
    exact_scoped_reference_match:
      row.exact_scoped_reference_match === 1 ? 1 : 0,
    heading_path_match:
      row.heading_path !== null &&
      row.heading_path.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase())
        ? 1
        : 0,
    graph_distance_from_seed: 4,
    fts5_bm25_score: row.lexical_score ?? 0,
    semantic_similarity: 0,
    recency_of_modification_bonus: 0,
    edge_types_to_candidate: []
  }));
}

export function rankSearchRows(
  rows: SearchRow[],
  context: QueryContext,
  profile: RankingWeights = defaultRankingProfile
): SearchRow[] {
  const rankedIds = new Map(
    rankCandidates(sqlToCandidates(rows, context), profile).map((candidate, index) => [
      candidate.node_id,
      index
    ])
  );

  return [...rows].sort((left, right) => {
    const leftRank = rankedIds.get(left.node_id) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rankedIds.get(right.node_id) ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank;
  });
}

export interface PatchOperationEnvelope {
  op: string;
  target_world: string;
  target_file: string;
  target_node_id?: string;
  expected_content_hash?: string;
  expected_anchor_checksum?: string;
  payload: unknown;
  attribution?: {
    kind: "added" | "clarified" | "modified";
    id: string;
    date?: string;
  };
  failure_mode?: "strict" | "relocate_on_miss";
}

export interface PatchPlanEnvelope {
  plan_id: string;
  target_world: string;
  approval_token: string;
  verdict: string;
  originating_skill: string;
  originating_cf_ids?: string[];
  originating_ch_id?: string;
  originating_pa_id?: string;
  expected_id_allocations: Record<string, unknown>;
  patches: PatchOperationEnvelope[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function invalidInput(message: string, field: string): McpError {
  return createMcpError("invalid_input", message, { field });
}

export function validatePatchPlanEnvelopeShape(plan: unknown): McpError | null {
  if (!isRecord(plan)) {
    return invalidInput("patch_plan must be an object.", "patch_plan");
  }

  if (!isNonEmptyString(plan.plan_id)) {
    return invalidInput("patch_plan.plan_id must be a non-empty string.", "patch_plan.plan_id");
  }

  if (!isNonEmptyString(plan.target_world)) {
    return invalidInput(
      "patch_plan.target_world must be a non-empty string.",
      "patch_plan.target_world"
    );
  }

  if (!isNonEmptyString(plan.approval_token)) {
    return invalidInput(
      "patch_plan.approval_token must be a non-empty string.",
      "patch_plan.approval_token"
    );
  }

  if (!isNonEmptyString(plan.verdict)) {
    return invalidInput("patch_plan.verdict must be a non-empty string.", "patch_plan.verdict");
  }

  if (!isNonEmptyString(plan.originating_skill)) {
    return invalidInput(
      "patch_plan.originating_skill must be a non-empty string.",
      "patch_plan.originating_skill"
    );
  }

  if (!isRecord(plan.expected_id_allocations)) {
    return invalidInput(
      "patch_plan.expected_id_allocations must be an object.",
      "patch_plan.expected_id_allocations"
    );
  }

  if (!Array.isArray(plan.patches) || plan.patches.length === 0) {
    return invalidInput(
      "patch_plan.patches must be a non-empty array.",
      "patch_plan.patches"
    );
  }

  for (const [index, patch] of plan.patches.entries()) {
    if (!isRecord(patch)) {
      return invalidInput(`patch_plan.patches[${index}] must be an object.`, `patch_plan.patches[${index}]`);
    }

    if (!isNonEmptyString(patch.op)) {
      return invalidInput(
        `patch_plan.patches[${index}].op must be a non-empty string.`,
        `patch_plan.patches[${index}].op`
      );
    }

    if (!isNonEmptyString(patch.target_world)) {
      return invalidInput(
        `patch_plan.patches[${index}].target_world must be a non-empty string.`,
        `patch_plan.patches[${index}].target_world`
      );
    }

    if (!isNonEmptyString(patch.target_file)) {
      return invalidInput(
        `patch_plan.patches[${index}].target_file must be a non-empty string.`,
        `patch_plan.patches[${index}].target_file`
      );
    }

    if (!("payload" in patch)) {
      return invalidInput(
        `patch_plan.patches[${index}].payload is required.`,
        `patch_plan.patches[${index}].payload`
      );
    }
  }

  return null;
}
