import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";
import YAML from "yaml";

import { resolveWorldDirectory } from "../db/index.js";

import type {
  ContextPacketStoryBundleContext,
  ContextPacketStoryBundleContextSummary,
  RoleInStory
} from "./shared.js";

interface StoryNodeRow {
  node_id: string;
  story_slug: string;
  node_type: string;
  file_path: string;
  body: string;
  summary: string | null;
}

interface PageRecord {
  id: string;
  branch_path: string[];
  terminal: boolean;
  created_at: string;
  storylet_realized: string;
  chosen_choice_id: string | null;
  content_intensity: string;
  summary?: string;
}

interface MysteryClaimEvidence {
  page_id: string;
  authority: string;
  status: string;
  evidence_records: string[];
}

const ACTIVE_THREAD_STATUSES = new Set(["active", "pressured", "critical", "dormant"]);
const MAX_VISIBLE_STORYLETS = 50;
const MAX_RECENT_BRANCH_PAGES = 10;
const ROLE_IN_STORY_VALUES = new Set<RoleInStory>([
  "viewpoint",
  "player_proxy",
  "primary_actor",
  "opposing_actor",
  "allied_actor",
  "authority",
  "dependent",
  "witness",
  "information_source",
  "pressure_source",
  "social_bridge",
  "background"
]);

function rowsForNodeType(
  db: Database.Database,
  worldSlug: string,
  storySlug: string,
  nodeType: string
): StoryNodeRow[] {
  return db
    .prepare(
      `
        SELECT node_id, story_slug, node_type, file_path, body, summary
        FROM nodes
        WHERE world_slug = ?
          AND story_slug = ?
          AND node_type = ?
        ORDER BY node_id
      `
    )
    .all(worldSlug, storySlug, nodeType) as StoryNodeRow[];
}

function authoredId(row: Pick<StoryNodeRow, "node_id" | "story_slug">): string {
  return row.node_id.startsWith(`${row.story_slug}:`)
    ? row.node_id.slice(row.story_slug.length + 1)
    : row.node_id;
}

function parseYamlRecord(row: StoryNodeRow): Record<string, unknown> {
  try {
    const parsed = YAML.parse(row.body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isRoleInStory(value: string): value is RoleInStory {
  return ROLE_IN_STORY_VALUES.has(value as RoleInStory);
}

function asRoleInStoryList(value: unknown): RoleInStory[] {
  const candidates =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : [];

  return candidates
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry): entry is RoleInStory => isRoleInStory(entry));
}

function incrementCounter(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function readNestedString(record: Record<string, unknown>, pathSegments: string[]): string | null {
  let cursor: unknown = record;
  for (const segment of pathSegments) {
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) {
      return null;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return typeof cursor === "string" && cursor.length > 0 ? cursor : null;
}

function visibilityScope(record: Record<string, unknown>): string {
  const direct = asNullableString(record.visibility_scope);
  if (direct !== null) {
    return direct;
  }

  const nested =
    readNestedString(record, ["visibility", "scope"]) ??
    readNestedString(record, ["visibility", "branch_scope"]) ??
    readNestedString(record, ["visibility", "author_pool"]);
  return nested ?? "unspecified";
}

function buildStoryletPoolSummary(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["storylet_pool_summary"] {
  const byMoveFamily: Record<string, number> = {};
  const byUrgency: Record<string, number> = {};

  const visibleRecords = rows.slice(0, MAX_VISIBLE_STORYLETS).map((row) => {
    const record = parseYamlRecord(row);
    const moveFamily = asString(record.move_family, "unspecified");
    const urgency = readNestedString(record, ["saliency", "urgency"]) ?? "unspecified";
    incrementCounter(byMoveFamily, moveFamily);
    incrementCounter(byUrgency, urgency);

    return {
      id: asString(record.id, authoredId(row)),
      title: asString(record.title, asString(record.summary, authoredId(row))),
      move_family: moveFamily,
      urgency,
      visibility_scope: visibilityScope(record)
    };
  });

  for (const row of rows.slice(MAX_VISIBLE_STORYLETS)) {
    const record = parseYamlRecord(row);
    incrementCounter(byMoveFamily, asString(record.move_family, "unspecified"));
    incrementCounter(byUrgency, readNestedString(record, ["saliency", "urgency"]) ?? "unspecified");
  }

  return {
    total: rows.length,
    visibility_filtered_count: visibleRecords.length,
    by_move_family: byMoveFamily,
    by_urgency: byUrgency,
    visible_records: visibleRecords
  };
}

function buildOpenObligations(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["open_obligations"] {
  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ record }) => asString(record.status, "open") === "open")
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      type: asString(record.type, "unspecified"),
      owner: asNullableString(record.owner),
      subjects: asStringArray(record.subjects),
      salience: asNumber(record.salience),
      urgency: asNumber(record.urgency),
      possible_payoff_modes: asStringArray(record.possible_payoff_modes),
      coverage_cache_compatible_storylets: asStringArray(record.coverage_cache_compatible_storylets)
    }));
}

function buildActiveThreads(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_threads"] {
  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ record }) => ACTIVE_THREAD_STATUSES.has(asString(record.status, "active")))
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      type: asString(record.type, "unspecified"),
      status: asString(record.status, "active"),
      current_pressure: asNumber(record.current_pressure),
      desired_cadence: asNumber(record.desired_cadence),
      obligations: asStringArray(record.obligations)
    }));
}

function pageFromRow(row: StoryNodeRow): PageRecord {
  const record = parseYamlRecord(row);
  const id = asString(record.id, authoredId(row));
  const branchPath = asStringArray(record.branch_path);
  const summary = asString(record.summary, row.summary ?? "");
  return {
    id,
    branch_path: branchPath.length > 0 ? branchPath : [id],
    terminal: record.terminal === true || record.status === "terminal",
    created_at: asString(record.created_at),
    storylet_realized: asString(record.storylet_realized),
    chosen_choice_id: asNullableString(record.chosen_choice_id),
    content_intensity: asString(record.content_intensity, "unspecified"),
    ...(summary.length > 0 ? { summary: summary.slice(0, 200) } : {})
  };
}

function compareBranchCandidates(left: PageRecord, right: PageRecord): number {
  const lengthDelta = right.branch_path.length - left.branch_path.length;
  if (lengthDelta !== 0) {
    return lengthDelta;
  }
  return right.created_at.localeCompare(left.created_at);
}

function buildBranchContext(rows: StoryNodeRow[]): Pick<
  ContextPacketStoryBundleContext,
  "longest_active_branch_path" | "recent_pages_along_longest_active_branch"
> {
  const pages = rows.map(pageFromRow);
  const branchLeaf = [...pages]
    .filter((page) => !page.terminal)
    .sort(compareBranchCandidates)[0];

  if (branchLeaf === undefined) {
    return {
      longest_active_branch_path: [],
      recent_pages_along_longest_active_branch: []
    };
  }

  const pagesById = new Map(pages.map((page) => [page.id, page]));
  const recentPages = branchLeaf.branch_path
    .slice(-MAX_RECENT_BRANCH_PAGES)
    .map((pageId) => pagesById.get(pageId))
    .filter((page): page is PageRecord => page !== undefined)
    .map((page) => ({
      id: page.id,
      storylet_realized: page.storylet_realized,
      chosen_choice_id: page.chosen_choice_id,
      content_intensity: page.content_intensity,
      created_at: page.created_at,
      ...(page.summary === undefined ? {} : { summary: page.summary })
    }));

  return {
    longest_active_branch_path: branchLeaf.branch_path,
    recent_pages_along_longest_active_branch: recentPages
  };
}

function parseStoryKernelFrontmatter(worldSlug: string, storySlug: string): Record<string, unknown> {
  const kernelPath = path.join(resolveWorldDirectory(worldSlug), "stories", storySlug, "STORY_KERNEL.md");
  if (!existsSync(kernelPath)) {
    return {};
  }

  const source = readFileSync(kernelPath, "utf8");
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (match?.[1] === undefined) {
    return {};
  }

  try {
    const parsed = YAML.parse(match[1]);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function arrayOfObjects(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry)
      )
    : [];
}

function buildMysteriesInPlay(frontmatter: Record<string, unknown>): ContextPacketStoryBundleContext["mysteries_in_play"] {
  return arrayOfObjects(frontmatter.mysteries_in_play).map((entry) => ({
    m_id: asString(entry.m_id ?? entry.id),
    status: asString(entry.status),
    future_resolution_safety: asString(entry.future_resolution_safety),
    domain_overlap: asString(entry.domain_overlap)
  }));
}

function buildMysteryEvidenceChains(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["mystery_evidence_chains"] {
  const claimsByMystery = new Map<string, MysteryClaimEvidence[]>();

  for (const row of rows) {
    const record = parseYamlRecord(row);
    const pageId = asString(record.id, authoredId(row));
    const stateSnapshot =
      typeof record.state_snapshot === "object" &&
      record.state_snapshot !== null &&
      !Array.isArray(record.state_snapshot)
        ? (record.state_snapshot as Record<string, unknown>)
        : {};

    for (const claim of arrayOfObjects(stateSnapshot.unresolved_mystery_claims)) {
      const mysteryId = asString(claim.mystery_id);
      if (mysteryId.length === 0) {
        continue;
      }

      const claims = claimsByMystery.get(mysteryId) ?? [];
      claims.push({
        page_id: pageId,
        authority: asString(claim.authority),
        status: asString(claim.status),
        evidence_records: asStringArray(claim.evidence_records)
      });
      claimsByMystery.set(mysteryId, claims);
    }
  }

  return [...claimsByMystery.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mystery_id, claims]) => ({
      mystery_id,
      claims
    }));
}

function buildCastBindList(frontmatter: Record<string, unknown>): ContextPacketStoryBundleContext["cast_bind_list"] {
  return arrayOfObjects(frontmatter.cast_bind_list).map((entry) => ({
    char_id: asNullableString(entry.char_id),
    stent_id: asString(entry.stent_id),
    role_in_story: asRoleInStoryList(entry.role_in_story)
  }));
}

export function summarizeStoryBundleContext(
  context: ContextPacketStoryBundleContext | null
): ContextPacketStoryBundleContextSummary | undefined {
  if (context === null) {
    return undefined;
  }

  return {
    story_slug: context.story_slug,
    storylet_total: context.storylet_pool_summary.total,
    visibility_filtered_storylet_count: context.storylet_pool_summary.visibility_filtered_count,
    open_obligation_ids: context.open_obligations.map((obligation) => obligation.id),
    active_thread_ids: context.active_threads.map((thread) => thread.id),
    longest_active_branch_path: [...context.longest_active_branch_path],
    recent_page_ids: context.recent_pages_along_longest_active_branch.map((page) => page.id),
    mystery_ids: context.mysteries_in_play.map((mystery) => mystery.m_id),
    cast_stent_ids: context.cast_bind_list.map((cast) => cast.stent_id),
    invariant_ids: [...context.invariants_acknowledged]
  };
}

export function buildStoryBundleContext(
  db: Database.Database,
  worldSlug: string,
  storySlug: string
): ContextPacketStoryBundleContext {
  const storyletRows = rowsForNodeType(db, worldSlug, storySlug, "storylet_record");
  const obligationRows = rowsForNodeType(db, worldSlug, storySlug, "obligation_record");
  const threadRows = rowsForNodeType(db, worldSlug, storySlug, "thread_record");
  const pageRows = rowsForNodeType(db, worldSlug, storySlug, "page_record");
  const frontmatter = parseStoryKernelFrontmatter(worldSlug, storySlug);
  const branchContext = buildBranchContext(pageRows);

  return {
    story_slug: storySlug,
    storylet_pool_summary: buildStoryletPoolSummary(storyletRows),
    open_obligations: buildOpenObligations(obligationRows),
    active_threads: buildActiveThreads(threadRows),
    longest_active_branch_path: branchContext.longest_active_branch_path,
    recent_pages_along_longest_active_branch:
      branchContext.recent_pages_along_longest_active_branch,
    mysteries_in_play: buildMysteriesInPlay(frontmatter),
    mystery_evidence_chains: buildMysteryEvidenceChains(pageRows),
    cast_bind_list: buildCastBindList(frontmatter),
    invariants_acknowledged: asStringArray(frontmatter.invariants_acknowledged)
  };
}
