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
const ACTIVE_CLOCK_STATUSES = new Set(["active", "paused"]);
const HIDDEN_SECRET_STATUSES = new Set(["hidden", "partially_revealed"]);
const OPEN_STORY_QUESTION_STATUSES = new Set(["open", "complicated", "inherited"]);
const CURRENT_PLAN_STATUSES = new Set(["active", "blocked", "suspended", "revised"]);
const CURRENT_EMOTION_STATUSES = new Set(["active", "suppressed", "dissociated"]);
const MAX_VISIBLE_STORYLETS = 50;
const MAX_RECENT_BRANCH_PAGES = 10;
const STORY_RECORD_ID_REGEX = /\b(?:STENT|STSTAT|SF|SE|OBL|CNSQ|THR|SREL|STINT|STLOC|STOBJ|BR|PG|CHC|SLT|CLK|STSEC|STQ|DA|STPLAN|STEMO)-[A-Za-z0-9-]+\b/g;
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

function rowsForStory(db: Database.Database, worldSlug: string, storySlug: string): StoryNodeRow[] {
  return db
    .prepare(
      `
        SELECT node_id, story_slug, node_type, file_path, body, summary
        FROM nodes
        WHERE world_slug = ?
          AND story_slug = ?
        ORDER BY node_id
      `
    )
    .all(worldSlug, storySlug) as StoryNodeRow[];
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

function asUrgency(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function asTruthRelation(
  value: unknown
): "true" | "false" | "partly_true" | "unknown" | "contested" | "branch_counterfactual" | "future_contingent" {
  return value === "true" ||
    value === "false" ||
    value === "partly_true" ||
    value === "unknown" ||
    value === "contested" ||
    value === "branch_counterfactual" ||
    value === "future_contingent"
    ? value
    : "unknown";
}

function asBeliefVisibility(
  value: unknown
): "private" | "shared" | "factional" | "public" | "rumored" | "concealed" | "suppressed" {
  return value === "private" ||
    value === "shared" ||
    value === "factional" ||
    value === "public" ||
    value === "rumored" ||
    value === "concealed" ||
    value === "suppressed"
    ? value
    : "private";
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
      obligation_kind: asString(record.obligation_kind, "unspecified"),
      description: asString(record.description),
      owed_by: asString(record.owed_by),
      owed_to: asString(record.owed_to),
      urgency: asUrgency(record.urgency),
      trigger_to_close: asString(record.trigger_to_close),
      status: asString(record.status, "open")
    }));
}

function buildActiveIntentions(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_intentions"] {
  return rows.map((row) => {
    const record = parseYamlRecord(row);
    return {
      id: asString(record.id, authoredId(row)),
      holder: asString(record.holder),
      intent: asString(record.intent),
      urgency: asUrgency(record.urgency),
      expires_when: asString(record.expires_when)
    };
  });
}

function buildActiveStatuses(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_statuses"] {
  return rows.map((row) => {
    const record = parseYamlRecord(row);
    return {
      entity: asString(record.entity),
      life: asString(record.life),
      agency: asString(record.agency),
      location: asString(record.location)
    };
  });
}

function buildActiveBeliefsByHolder(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_beliefs_by_holder"] {
  const groups = new Map<string, ContextPacketStoryBundleContext["active_beliefs_by_holder"][number]["beliefs"]>();

  for (const row of rows) {
    const record = parseYamlRecord(row);
    const holder = asString(record.holder, "unspecified");
    const beliefs = groups.get(holder) ?? [];
    beliefs.push({
      id: asString(record.id, authoredId(row)),
      claim: asString(record.claim),
      belief_mode: asString(record.belief_mode, "unspecified"),
      truth_relation: asTruthRelation(record.truth_relation),
      confidence: asString(record.confidence, "unspecified"),
      visibility: asBeliefVisibility(record.visibility)
    });
    groups.set(holder, beliefs);
  }

  return [...groups.entries()].map(([holder, beliefs]) => ({ holder, beliefs }));
}

function participantGroupKey(participants: string[]): string {
  return [...participants].sort((left, right) => left.localeCompare(right)).join("\u0000");
}

function buildActiveRelationshipsByParticipant(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_relationships_by_participant"] {
  const groups = new Map<
    string,
    ContextPacketStoryBundleContext["active_relationships_by_participant"][number]
  >();

  for (const row of rows) {
    const record = parseYamlRecord(row);
    const participants = asStringArray(record.participants).sort((left, right) =>
      left.localeCompare(right)
    );
    if (participants.length === 0) {
      continue;
    }

    const key = participantGroupKey(participants);
    const group = groups.get(key) ?? {
      participants,
      axes: []
    };
    group.axes.push({
      axis: asString(record.axis, "unspecified"),
      value: asString(record.value, "unspecified")
    });
    groups.set(key, group);
  }

  return [...groups.values()];
}

function referencedStoryRecordIds(rows: StoryNodeRow[], excludedNodeId: string): Set<string> {
  const ids = new Set<string>();

  for (const row of rows) {
    if (row.node_id === excludedNodeId) {
      continue;
    }

    for (const match of row.body.matchAll(STORY_RECORD_ID_REGEX)) {
      ids.add(match[0]);
    }
  }

  return ids;
}

function isReferencedByOtherRecord(row: StoryNodeRow, rows: StoryNodeRow[]): boolean {
  return referencedStoryRecordIds(rows, row.node_id).has(authoredId(row));
}

/**
 * Scoped to records referenced by any other active record's body on the current
 * branch path. See SPEC-46 Phase B scope heuristic.
 */
function buildActiveLocationsInScope(
  locationRows: StoryNodeRow[],
  allStoryRows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_locations_in_scope"] {
  return locationRows
    .filter((row) => isReferencedByOtherRecord(row, allStoryRows))
    .map((row) => {
      const record = parseYamlRecord(row);
      return {
        id: asString(record.id, authoredId(row)),
        label: asString(record.label),
        description: asString(record.description),
        bound_ent: asNullableString(record.bound_ent)
      };
    });
}

/**
 * Scoped to records referenced by any other active record's body on the current
 * branch path. See SPEC-46 Phase B scope heuristic.
 */
function buildActiveObjectsInScope(
  objectRows: StoryNodeRow[],
  allStoryRows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_objects_in_scope"] {
  return objectRows
    .filter((row) => isReferencedByOtherRecord(row, allStoryRows))
    .map((row) => {
      const record = parseYamlRecord(row);
      return {
        id: asString(record.id, authoredId(row)),
        label: asString(record.label),
        description: asString(record.description),
        owner:
          typeof record.owner === "string" && record.owner.length > 0
            ? record.owner
            : null,
        current_location: asString(record.current_location)
      };
    });
}

/**
 * Scoped to story-local DA records referenced by any other active record's body
 * on the current branch path. World-level DA still routes through list_records.
 * See SPEC-46 Phase B scope heuristic.
 */
function buildActiveStoryDiegeticArtifacts(
  storyDaRows: StoryNodeRow[],
  allStoryRows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_story_diegetic_artifacts"] {
  return storyDaRows
    .filter((row) => isReferencedByOtherRecord(row, allStoryRows))
    .map((row) => {
      const record = parseYamlRecord(row);
      return {
        id: asString(record.id, authoredId(row)),
        title: asString(record.title),
        author: asString(record.author),
        genre: asString(record.genre),
        intended_audience: asString(record.intended_audience),
        circulation: asString(record.circulation),
        truth_relation: asString(record.truth_relation),
        derived_from: asStringArray(record.derived_from)
      };
    });
}

function supersededRecordIds(rows: StoryNodeRow[]): Set<string> {
  const ids = new Set<string>();

  for (const row of rows) {
    const supersedes = parseYamlRecord(row).supersedes;
    if (typeof supersedes === "string" && supersedes.length > 0) {
      ids.add(supersedes);
    }
  }

  return ids;
}

export function buildActiveActorPlans(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_actor_plans"] {
  const supersededIds = supersededRecordIds(rows);

  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ row, record }) => {
      const id = asString(record.id, authoredId(row));
      return (
        !supersededIds.has(id) &&
        CURRENT_PLAN_STATUSES.has(asString(record.plan_status, "active"))
      );
    })
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      holder: asString(record.holder),
      root_intention: asString(record.root_intention),
      objective: asString(record.objective),
      plan_status: asString(record.plan_status, "active"),
      current_step_action_family:
        readNestedString(record, ["current_step", "action_family"]) ?? "unspecified"
    }));
}

export function buildActiveEmotionalStates(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["active_emotional_states"] {
  const supersededIds = supersededRecordIds(rows);

  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ row, record }) => {
      const id = asString(record.id, authoredId(row));
      return (
        !supersededIds.has(id) &&
        CURRENT_EMOTION_STATUSES.has(asString(record.status, "active"))
      );
    })
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      holder: asString(record.holder),
      status: asString(record.status, "active"),
      affect_kind: asNullableString(record.affect_kind),
      intensity: asNullableString(record.intensity),
      behavioral_pressure: asStringArray(record.behavioral_pressure),
      agency_effect: asString(record.agency_effect, "none")
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

function buildActiveClocks(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["active_clocks"] {
  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ record }) => ACTIVE_CLOCK_STATUSES.has(asString(record.status, "active")))
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      title: asString(record.title, authoredId(row)),
      clock_kind: asString(record.clock_kind, "unspecified"),
      driver: asString(record.driver, "unknown"),
      value: asNumber(record.value),
      max: asNumber(record.max),
      salience: asString(record.salience, "unspecified"),
      visibility: asString(record.visibility, "unspecified"),
      status: asString(record.status, "active")
    }));
}

function buildHiddenSecrets(rows: StoryNodeRow[]): ContextPacketStoryBundleContext["hidden_secrets"] {
  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ record }) => HIDDEN_SECRET_STATUSES.has(asString(record.status, "hidden")))
    .map(({ row, record }) => {
      const clueCarriers = arrayOfObjects(record.clue_carriers);
      return {
        id: asString(record.id, authoredId(row)),
        secret_kind: asString(record.secret_kind, "unspecified"),
        salience: asString(record.salience, "unspecified"),
        status: asString(record.status, "hidden"),
        holders: asStringArray(record.holders),
        clue_carrier_count: clueCarriers.length,
        discovered_clue_count: clueCarriers.filter(
          (carrier) => asString(carrier.status) === "discovered"
        ).length,
        protected_mystery_refs: asStringArray(record.protected_mystery_refs)
      };
    });
}

function buildOpenStoryQuestions(
  rows: StoryNodeRow[]
): ContextPacketStoryBundleContext["open_story_questions"] {
  return rows
    .map((row) => ({ row, record: parseYamlRecord(row) }))
    .filter(({ record }) => OPEN_STORY_QUESTION_STATUSES.has(asString(record.status, "open")))
    .map(({ row, record }) => ({
      id: asString(record.id, authoredId(row)),
      setup_kind: asString(record.setup_kind, "unspecified"),
      question_or_setup: asString(record.question_or_setup),
      salience: asString(record.salience, "unspecified"),
      audience_visibility: asString(record.audience_visibility, "unspecified"),
      status: asString(record.status, "open"),
      source_event: asNullableString(record.source_event)
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
    active_intention_ids: context.active_intentions.map((intention) => intention.id),
    active_status_entities: context.active_statuses.map((status) => status.entity),
    active_belief_holders: context.active_beliefs_by_holder.map((group) => group.holder),
    active_relationship_participants: context.active_relationships_by_participant.map(
      (group) => [...group.participants]
    ),
    active_location_ids: context.active_locations_in_scope.map((location) => location.id),
    active_object_ids: context.active_objects_in_scope.map((object) => object.id),
    active_story_da_ids: context.active_story_diegetic_artifacts.map((artifact) => artifact.id),
    active_plan_ids: context.active_actor_plans.map((plan) => plan.id),
    active_plan_holders: context.active_actor_plans.map((plan) => plan.holder),
    active_emotion_ids: context.active_emotional_states.map((emotion) => emotion.id),
    active_emotion_holders: context.active_emotional_states.map((emotion) => emotion.holder),
    active_thread_ids: context.active_threads.map((thread) => thread.id),
    active_clock_ids: context.active_clocks.map((clock) => clock.id),
    hidden_secret_ids: context.hidden_secrets.map((secret) => secret.id),
    open_story_question_ids: context.open_story_questions.map((question) => question.id),
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
  const intentionRows = rowsForNodeType(db, worldSlug, storySlug, "intention_record");
  const statusRows = rowsForNodeType(db, worldSlug, storySlug, "story_status_record");
  const beliefRows = rowsForNodeType(db, worldSlug, storySlug, "belief_record");
  const relationshipRows = rowsForNodeType(db, worldSlug, storySlug, "relationship_record_story");
  const locationRows = rowsForNodeType(db, worldSlug, storySlug, "story_location_record");
  const objectRows = rowsForNodeType(db, worldSlug, storySlug, "story_object_record");
  const storyDaRows = rowsForNodeType(db, worldSlug, storySlug, "story_diegetic_artifact_record");
  const planRows = rowsForNodeType(db, worldSlug, storySlug, "story_plan_record");
  const emotionRows = rowsForNodeType(db, worldSlug, storySlug, "story_emotion_record");
  const threadRows = rowsForNodeType(db, worldSlug, storySlug, "thread_record");
  const clockRows = rowsForNodeType(db, worldSlug, storySlug, "pressure_clock_record");
  const secretRows = rowsForNodeType(db, worldSlug, storySlug, "story_secret_record");
  const storyQuestionRows = rowsForNodeType(db, worldSlug, storySlug, "story_question_record");
  const pageRows = rowsForNodeType(db, worldSlug, storySlug, "page_record");
  const allStoryRows = rowsForStory(db, worldSlug, storySlug);
  const frontmatter = parseStoryKernelFrontmatter(worldSlug, storySlug);
  const branchContext = buildBranchContext(pageRows);

  return {
    story_slug: storySlug,
    storylet_pool_summary: buildStoryletPoolSummary(storyletRows),
    open_obligations: buildOpenObligations(obligationRows),
    active_intentions: buildActiveIntentions(intentionRows),
    active_statuses: buildActiveStatuses(statusRows),
    active_beliefs_by_holder: buildActiveBeliefsByHolder(beliefRows),
    active_relationships_by_participant:
      buildActiveRelationshipsByParticipant(relationshipRows),
    active_locations_in_scope: buildActiveLocationsInScope(locationRows, allStoryRows),
    active_objects_in_scope: buildActiveObjectsInScope(objectRows, allStoryRows),
    active_story_diegetic_artifacts: buildActiveStoryDiegeticArtifacts(storyDaRows, allStoryRows),
    active_actor_plans: buildActiveActorPlans(planRows),
    active_emotional_states: buildActiveEmotionalStates(emotionRows),
    active_threads: buildActiveThreads(threadRows),
    active_clocks: buildActiveClocks(clockRows),
    hidden_secrets: buildHiddenSecrets(secretRows),
    open_story_questions: buildOpenStoryQuestions(storyQuestionRows),
    longest_active_branch_path: branchContext.longest_active_branch_path,
    recent_pages_along_longest_active_branch:
      branchContext.recent_pages_along_longest_active_branch,
    mysteries_in_play: buildMysteriesInPlay(frontmatter),
    mystery_evidence_chains: buildMysteryEvidenceChains(pageRows),
    cast_bind_list: buildCastBindList(frontmatter),
    invariants_acknowledged: asStringArray(frontmatter.invariants_acknowledged)
  };
}
