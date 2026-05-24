import type Database from "better-sqlite3";

import { withIndexFreshnessGuard } from "../context-packet/freshness-guard.js";
import { openIndexDb } from "../db/index.js";
import { createMcpError, type McpError } from "../errors.js";

import { isMcpError, parseRecordBody, type RecordRow } from "./get-record.js";
import { toStoryScopedNodeId } from "./_shared.js";

export const TURN_DRIVER_KINDS = [
  "player_action",
  "player_write_in",
  "npc_action",
  "offstage_action",
  "world_pressure",
  "clock_fire",
  "secret_reveal",
  "multi_actor_collision"
] as const;

export type TurnDriverKind = (typeof TURN_DRIVER_KINDS)[number];

export interface SelectStoryletCandidatesArgs {
  world_slug: string;
  story_slug: string;
  parent_page_id: string;
  turn_driver: {
    kind: TurnDriverKind;
    initiator?: string | null;
    driver_records: string[];
  };
  intent_signature?: {
    action_families?: string[];
    grounding_record_classes?: string[];
    grounding_record_ids?: string[];
  };
  max_candidates?: number;
  include_rejection_summary?: boolean;
}

export interface StoryletCandidateFilterTrace {
  pool_total: number;
  after_scope: number;
  after_driver_kind: number;
  after_action_family: number;
  after_predicate_shape: number;
  after_predicate_class: number;
  after_source_record_id: number;
  after_mystery_policy: number;
  after_cooldown: number;
}

export interface StoryletCandidateProjectionRecord {
  id: string;
  move_family: string | null;
  scope_visibility: string | null;
  saliency_urgency: string | null;
  compatible_turn_drivers: string[];
  predicate_classes: string[];
  action_families: string[];
}

export interface SelectStoryletCandidatesResponse {
  candidate_projection_hash: string;
  filter_trace: StoryletCandidateFilterTrace;
  shortlisted_candidate_ids: string[];
  shortlisted_projection_records: StoryletCandidateProjectionRecord[];
  requires_full_body_ids: string[];
}

interface SltProjectionDbRow {
  node_id: string;
  world_slug: string;
  story_slug: string;
  slt_scope_visibility: string | null;
  slt_scope_branch_id: string | null;
  slt_scope_branch_path_prefix: string | null;
  slt_provenance_origin: string | null;
  slt_move_family: string | null;
  slt_saliency_urgency: string | null;
  slt_saliency_cooldown_pages: number | null;
  slt_mystery_policy_allowed_authority: string | null;
  candidate_projection_hash: string;
}

interface PageState {
  branchId: string | null;
  branchPath: string[];
  activeRecordClasses: Set<string>;
  unresolvedMysteryAuthorities: Set<string>;
}

interface Candidate {
  row: SltProjectionDbRow;
  compatibleDrivers: string[];
  predicatePreds: string[];
  predicateClasses: string[];
  actionFamilies: string[];
  sourceRecordIds: string[];
}

const RECORD_PREFIX_TO_CLASS: Record<string, string> = {
  BEL: "belief_record",
  BR: "branch_record",
  CHC: "choice_record",
  CLK: "pressure_clock_record",
  CNSQ: "consequence_record",
  DA: "story_diegetic_artifact_record",
  OBL: "obligation_record",
  PG: "page_record",
  SE: "story_event_record",
  SF: "story_fact_record",
  SLB: "storylet_batch_manifest",
  SLT: "storylet_record",
  SP: "promotion_record",
  RSP: "remediation_storylet_proposal_card",
  SAU: "audit_record_story",
  SREL: "relationship_record_story",
  STCHAR: "story_character_authority_record",
  STENT: "story_entity_record",
  STEMO: "story_emotion_record",
  STINT: "intention_record",
  STLOC: "story_location_record",
  STOBJ: "story_object_record",
  STPLAN: "story_plan_record",
  STQ: "story_question_record",
  STSEC: "story_secret_record",
  STSTAT: "story_status_record",
  THR: "thread_record"
};

const URGENCY_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1
};

function displayStoryRecordId(nodeId: string, storySlug: string): string {
  return nodeId.startsWith(`${storySlug}:`) ? nodeId.slice(storySlug.length + 1) : nodeId;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function recordClassForId(recordId: string): string | null {
  const match = /^([A-Z]+)-\d+$/.exec(recordId);
  if (match === null) {
    return null;
  }

  return RECORD_PREFIX_TO_CLASS[match[1] ?? ""] ?? null;
}

function isStoryLocalRecordId(recordId: string): boolean {
  return recordClassForId(recordId) !== null;
}

function activeClassesFromSnapshot(snapshot: Record<string, unknown>): Set<string> {
  const activeRecords = snapshot.active_records;
  const classes = new Set<string>();

  if (activeRecords === null || typeof activeRecords !== "object" || Array.isArray(activeRecords)) {
    return classes;
  }

  for (const [prefix, ids] of Object.entries(activeRecords)) {
    if (Array.isArray(ids) && ids.length > 0) {
      const recordClass = RECORD_PREFIX_TO_CLASS[prefix];
      if (recordClass !== undefined) {
        classes.add(recordClass);
      }
    }
  }

  return classes;
}

function mysteryAuthoritiesFromSnapshot(snapshot: Record<string, unknown>): Set<string> {
  const authorities = new Set<string>();
  const claims = snapshot.unresolved_mystery_claims;

  if (!Array.isArray(claims)) {
    return authorities;
  }

  for (const claim of claims) {
    if (claim !== null && typeof claim === "object" && !Array.isArray(claim)) {
      const authority = (claim as Record<string, unknown>).authority;
      if (typeof authority === "string") {
        authorities.add(authority);
      }
    }
  }

  return authorities;
}

function loadParentPage(db: Database.Database, args: SelectStoryletCandidatesArgs): PageState | McpError {
  const internalPageId = toStoryScopedNodeId(args.parent_page_id, args.story_slug);
  const row = db
    .prepare(
      `
        SELECT node_id, story_slug, node_type, file_path, body, content_hash
        FROM nodes
        WHERE world_slug = ?
          AND story_slug = ?
          AND node_id = ?
          AND node_type = 'page_record'
        LIMIT 1
      `
    )
    .get(args.world_slug, args.story_slug, internalPageId) as RecordRow | undefined;

  if (row === undefined) {
    return createMcpError("record_not_found", `Parent page '${args.parent_page_id}' was not found.`, {
      field: "parent_page_id",
      parent_page_id: args.parent_page_id,
      world_slug: args.world_slug,
      story_slug: args.story_slug
    });
  }

  const parsed = parseRecordBody(row);
  if (isMcpError(parsed)) {
    return parsed;
  }

  const stateSnapshot = parsed.state_snapshot;
  const snapshot =
    stateSnapshot !== null && typeof stateSnapshot === "object" && !Array.isArray(stateSnapshot)
      ? (stateSnapshot as Record<string, unknown>)
      : {};

  return {
    branchId: typeof parsed.branch_id === "string" ? parsed.branch_id : null,
    branchPath: stringArray(parsed.branch_path),
    activeRecordClasses: activeClassesFromSnapshot(snapshot),
    unresolvedMysteryAuthorities: mysteryAuthoritiesFromSnapshot(snapshot)
  };
}

function loadProjectionRows(
  db: Database.Database,
  worldSlug: string,
  storySlug: string
): SltProjectionDbRow[] {
  return db
    .prepare(
      `
        SELECT *
        FROM slt_projections
        WHERE world_slug = ?
          AND story_slug = ?
        ORDER BY node_id
      `
    )
    .all(worldSlug, storySlug) as SltProjectionDbRow[];
}

function loadEdgeTargets(
  db: Database.Database,
  storySlug: string,
  edgeType: string
): Map<string, string[]> {
  const rows = db
    .prepare(
      `
        SELECT source_node_id, target_node_id, target_unresolved_ref
        FROM edges
        WHERE story_slug = ?
          AND edge_type = ?
        ORDER BY source_node_id, target_unresolved_ref, target_node_id
      `
    )
    .all(storySlug, edgeType) as Array<{
    source_node_id: string;
    target_node_id: string | null;
    target_unresolved_ref: string | null;
  }>;
  const targets = new Map<string, string[]>();

  for (const row of rows) {
    const target =
      row.target_unresolved_ref ??
      (row.target_node_id === null ? null : displayStoryRecordId(row.target_node_id, storySlug));
    if (target === null) {
      continue;
    }
    const existing = targets.get(row.source_node_id) ?? [];
    if (!existing.includes(target)) {
      existing.push(target);
    }
    targets.set(row.source_node_id, existing);
  }

  return targets;
}

function buildCandidates(db: Database.Database, worldSlug: string, storySlug: string): Candidate[] {
  const projections = loadProjectionRows(db, worldSlug, storySlug);
  const drivers = loadEdgeTargets(db, storySlug, "storylet_compatible_driver");
  const preds = loadEdgeTargets(db, storySlug, "storylet_predicate_pred");
  const classes = loadEdgeTargets(db, storySlug, "storylet_predicate_class");
  const actions = loadEdgeTargets(db, storySlug, "storylet_action_family");
  const sourceRefs = loadEdgeTargets(db, storySlug, "storylet_predicate_ref");

  return projections.map((row) => ({
    row,
    compatibleDrivers: drivers.get(row.node_id) ?? [],
    predicatePreds: preds.get(row.node_id) ?? [],
    predicateClasses: classes.get(row.node_id) ?? [],
    actionFamilies: actions.get(row.node_id) ?? [],
    sourceRecordIds: sourceRefs.get(row.node_id) ?? []
  }));
}

function matchesScope(candidate: Candidate, page: PageState): boolean {
  switch (candidate.row.slt_scope_visibility) {
    case "global_author_pool":
      return true;
    case "branch_scoped":
      return page.branchId !== null && candidate.row.slt_scope_branch_id === page.branchId;
    case "branch_prefix_scoped": {
      if (candidate.row.slt_scope_branch_path_prefix === null) {
        return false;
      }
      let prefix: unknown;
      try {
        prefix = JSON.parse(candidate.row.slt_scope_branch_path_prefix);
      } catch {
        return false;
      }
      const prefixPath = stringArray(prefix);
      return (
        prefixPath.length > 0 &&
        prefixPath.length <= page.branchPath.length &&
        prefixPath.every((pageId, index) => page.branchPath[index] === pageId)
      );
    }
    default:
      return false;
  }
}

function intersects(left: readonly string[], right: ReadonlySet<string> | readonly string[]): boolean {
  const rightSet: ReadonlySet<string> = right instanceof Set ? right : new Set(right);
  return left.some((value) => rightSet.has(value));
}

function matchesActionFamily(candidate: Candidate, actionFamilies: readonly string[] | undefined): boolean {
  return actionFamilies === undefined || actionFamilies.length === 0 || intersects(candidate.actionFamilies, actionFamilies);
}

function matchesPredicateClass(
  candidate: Candidate,
  page: PageState,
  groundingRecordClasses: readonly string[] | undefined
): boolean {
  const requestedClasses = groundingRecordClasses ?? [];
  const activeOrRequested =
    requestedClasses.length > 0 ? new Set(requestedClasses) : page.activeRecordClasses;

  return candidate.predicateClasses.length === 0 || intersects(candidate.predicateClasses, activeOrRequested);
}

function sourceRefExists(db: Database.Database, args: SelectStoryletCandidatesArgs, recordId: string): boolean {
  const storyNode = toStoryScopedNodeId(recordId, args.story_slug);
  const row = db
    .prepare(
      `
        SELECT 1
        FROM nodes
        WHERE world_slug = ?
          AND (node_id = ? OR node_id = ?)
        LIMIT 1
      `
    )
    .get(args.world_slug, storyNode, recordId);
  return row !== undefined;
}

function matchesSourceRecordIds(
  db: Database.Database,
  args: SelectStoryletCandidatesArgs,
  candidate: Candidate
): boolean {
  if (!candidate.sourceRecordIds.every((recordId) => sourceRefExists(db, args, recordId))) {
    return false;
  }

  if (
    candidate.row.slt_scope_visibility === "global_author_pool" &&
    candidate.sourceRecordIds.some((recordId) => isStoryLocalRecordId(recordId))
  ) {
    return false;
  }

  const groundingRecordIds = args.intent_signature?.grounding_record_ids ?? [];
  return groundingRecordIds.length === 0 || intersects(candidate.sourceRecordIds, groundingRecordIds);
}

function matchesMysteryPolicy(candidate: Candidate, page: PageState): boolean {
  const authority = candidate.row.slt_mystery_policy_allowed_authority;
  return authority === null || authority === "none" || page.unresolvedMysteryAuthorities.has(authority);
}

function loadSelectedStoryletIds(db: Database.Database, worldSlug: string, storySlug: string): Set<string> {
  const rows = db
    .prepare(
      `
        SELECT node_id, story_slug, node_type, file_path, body, content_hash
        FROM nodes
        WHERE world_slug = ?
          AND story_slug = ?
          AND node_type = 'story_event_record'
      `
    )
    .all(worldSlug, storySlug) as RecordRow[];
  const selected = new Set<string>();

  for (const row of rows) {
    const parsed = parseRecordBody(row);
    if (isMcpError(parsed)) {
      continue;
    }
    const commitment = parsed.commitment;
    if (commitment !== null && typeof commitment === "object" && !Array.isArray(commitment)) {
      const selectedSltId = (commitment as Record<string, unknown>).selected_slt_id;
      if (typeof selectedSltId === "string") {
        selected.add(selectedSltId);
      }
    }
  }

  return selected;
}

function matchesCooldown(candidate: Candidate, selectedStoryletIds: ReadonlySet<string>, storySlug: string): boolean {
  const cooldown = candidate.row.slt_saliency_cooldown_pages ?? 0;
  if (cooldown <= 0) {
    return true;
  }

  return !selectedStoryletIds.has(displayStoryRecordId(candidate.row.node_id, storySlug));
}

function rankCandidates(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort((left, right) => {
    const urgency =
      (URGENCY_RANK[right.row.slt_saliency_urgency ?? ""] ?? 0) -
      (URGENCY_RANK[left.row.slt_saliency_urgency ?? ""] ?? 0);
    if (urgency !== 0) {
      return urgency;
    }

    return left.row.node_id.localeCompare(right.row.node_id);
  });
  const byUrgency = new Map<number, Candidate[]>();

  for (const candidate of sorted) {
    const urgency = URGENCY_RANK[candidate.row.slt_saliency_urgency ?? ""] ?? 0;
    const group = byUrgency.get(urgency) ?? [];
    group.push(candidate);
    byUrgency.set(urgency, group);
  }

  const output: Candidate[] = [];
  for (const urgency of [...byUrgency.keys()].sort((left, right) => right - left)) {
    const byFamily = new Map<string, Candidate[]>();
    for (const candidate of byUrgency.get(urgency) ?? []) {
      const family = candidate.row.slt_move_family ?? "";
      const group = byFamily.get(family) ?? [];
      group.push(candidate);
      byFamily.set(family, group);
    }

    const urgencyOutputTarget = output.length + (byUrgency.get(urgency)?.length ?? 0);
    while (output.length < urgencyOutputTarget) {
      for (const family of [...byFamily.keys()].sort()) {
        const next = byFamily.get(family)?.shift();
        if (next !== undefined) {
          output.push(next);
        }
      }
    }
  }

  return output;
}

function projectionRecord(candidate: Candidate, storySlug: string): StoryletCandidateProjectionRecord {
  return {
    id: displayStoryRecordId(candidate.row.node_id, storySlug),
    move_family: candidate.row.slt_move_family,
    scope_visibility: candidate.row.slt_scope_visibility,
    saliency_urgency: candidate.row.slt_saliency_urgency,
    compatible_turn_drivers: candidate.compatibleDrivers,
    predicate_classes: candidate.predicateClasses,
    action_families: candidate.actionFamilies
  };
}

async function selectStoryletCandidatesImpl(
  args: SelectStoryletCandidatesArgs
): Promise<SelectStoryletCandidatesResponse | McpError> {
  const maxCandidates = args.max_candidates ?? 24;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) {
    return createMcpError("invalid_input", "max_candidates must be an integer >= 1.", {
      field: "max_candidates"
    });
  }

  const opened = openIndexDb(args.world_slug);
  if (!("db" in opened)) {
    return opened;
  }

  try {
    const page = loadParentPage(opened.db, args);
    if ("code" in page) {
      return page;
    }

    const trace: StoryletCandidateFilterTrace = {
      pool_total: 0,
      after_scope: 0,
      after_driver_kind: 0,
      after_action_family: 0,
      after_predicate_shape: 0,
      after_predicate_class: 0,
      after_source_record_id: 0,
      after_mystery_policy: 0,
      after_cooldown: 0
    };

    const allCandidates = buildCandidates(opened.db, args.world_slug, args.story_slug);
    trace.pool_total = allCandidates.length;

    const afterScope = allCandidates.filter((candidate) => matchesScope(candidate, page));
    trace.after_scope = afterScope.length;

    const afterDriverKind = afterScope.filter((candidate) =>
      candidate.compatibleDrivers.includes(args.turn_driver.kind)
    );
    trace.after_driver_kind = afterDriverKind.length;

    const afterActionFamily = afterDriverKind.filter((candidate) =>
      matchesActionFamily(candidate, args.intent_signature?.action_families)
    );
    trace.after_action_family = afterActionFamily.length;

    const afterPredicateShape = afterActionFamily.filter(
      (candidate) => candidate.predicatePreds.length === 0 || candidate.predicatePreds.some((pred) => pred.length > 0)
    );
    trace.after_predicate_shape = afterPredicateShape.length;

    const afterPredicateClass = afterPredicateShape.filter((candidate) =>
      matchesPredicateClass(candidate, page, args.intent_signature?.grounding_record_classes)
    );
    trace.after_predicate_class = afterPredicateClass.length;

    const afterSourceRecordId = afterPredicateClass.filter((candidate) =>
      matchesSourceRecordIds(opened.db, args, candidate)
    );
    trace.after_source_record_id = afterSourceRecordId.length;

    const afterMysteryPolicy = afterSourceRecordId.filter((candidate) =>
      matchesMysteryPolicy(candidate, page)
    );
    trace.after_mystery_policy = afterMysteryPolicy.length;

    const selectedStoryletIds = loadSelectedStoryletIds(opened.db, args.world_slug, args.story_slug);
    const afterCooldown = afterMysteryPolicy.filter((candidate) =>
      matchesCooldown(candidate, selectedStoryletIds, args.story_slug)
    );
    trace.after_cooldown = afterCooldown.length;

    const shortlist = rankCandidates(afterCooldown).slice(0, maxCandidates);
    const shortlistedCandidateIds = shortlist.map((candidate) =>
      displayStoryRecordId(candidate.row.node_id, args.story_slug)
    );

    return {
      candidate_projection_hash: shortlist
        .map((candidate) => candidate.row.candidate_projection_hash)
        .join(":"),
      filter_trace: trace,
      shortlisted_candidate_ids: shortlistedCandidateIds,
      shortlisted_projection_records: shortlist.map((candidate) =>
        projectionRecord(candidate, args.story_slug)
      ),
      requires_full_body_ids: shortlistedCandidateIds
    };
  } finally {
    opened.db.close();
  }
}

export const selectStoryletCandidates = withIndexFreshnessGuard(selectStoryletCandidatesImpl);
