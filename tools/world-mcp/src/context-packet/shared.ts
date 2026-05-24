import type Database from "better-sqlite3";
import YAML from "yaml";
import type { NodeType } from "@worldloom/world-index/public/types";

import type { TaskType } from "../ranking/profiles/index.js";

export const DELIVERY_MODES = ["full", "summary_only"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];
export const DEFAULT_DELIVERY_MODE: DeliveryMode = "full";

export interface ContextPacketArgs {
  task_type: TaskType;
  world_slug: string;
  story_slug?: string;
  seed_nodes: string[];
  token_budget: number;
  delivery_mode?: DeliveryMode;
  node_classes?: NodeType[];
  parent_page_id?: string;
}

export interface ContextPacketNode {
  id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  summary: string | null;
  body_preview?: string;
  full_body?: string;
  record?: Record<string, unknown>;
}

export interface ContextPacketRisk {
  severity: string;
  code: string;
  message: string;
  node_id: string | null;
  file_path: string | null;
}

export interface ContextPacketTruncationSummary {
  dropped_layers: string[];
  dropped_node_ids_by_layer: Record<string, string[]>;
  fallback_advice: string;
  full_body_downgrades?: Array<{
    layer: string;
    node_id: string;
    node_type: NodeType;
    reason: "high_value_full_body_budget_exceeded";
  }>;
}

export type ContextPacketDeliveryStatus = "inline" | "persisted_with_summary";

export interface ContextPacketGoverningSummary {
  active_rules: string[];
  protected_surfaces: string[];
  prohibited_moves: string[];
  required_output_schema: string[];
  open_risk_ids: string[];
  invariant_ids: string[];
  seed_relevant_cf_ids: string[];
  story_bundle_context_summary?: ContextPacketStoryBundleContextSummary;
  dropped_node_ids_by_class: Record<string, string[]>;
}

export interface ContextPacketStoryBundleContextSummary {
  story_slug: string;
  storylet_total: number;
  visibility_filtered_storylet_count: number;
  open_obligation_ids: string[];
  active_intention_ids: string[];
  active_status_entities: string[];
  active_belief_holders: string[];
  active_relationship_participants: string[][];
  active_location_ids: string[];
  active_object_ids: string[];
  active_story_da_ids: string[];
  active_story_character_ids: string[];
  active_plan_ids: string[];
  active_plan_holders: string[];
  active_emotion_ids: string[];
  active_emotion_holders: string[];
  active_thread_ids: string[];
  active_clock_ids: string[];
  hidden_secret_ids: string[];
  open_story_question_ids: string[];
  longest_active_branch_path: string[];
  recent_page_ids: string[];
  mystery_ids: string[];
  cast_stent_ids: string[];
  invariant_ids: string[];
}

export type RoleInStory =
  | "viewpoint"
  | "player_proxy"
  | "primary_actor"
  | "opposing_actor"
  | "allied_actor"
  | "authority"
  | "dependent"
  | "witness"
  | "information_source"
  | "pressure_source"
  | "social_bridge"
  | "background";

export interface ContextPacketStoryBundleContext {
  story_slug: string;
  selection_shortlist: {
    label: string;
    parent_page_id: string;
    turn_driver_kind: string;
    max_candidates: number;
    candidate_projection_hash: string;
    filter_trace: {
      pool_total: number;
      after_scope: number;
      after_driver_kind: number;
      after_action_family: number;
      after_predicate_shape: number;
      after_predicate_class: number;
      after_source_record_id: number;
      after_mystery_policy: number;
      after_cooldown: number;
    };
    shortlisted_candidate_ids: string[];
    shortlisted_projection_records: Array<{
      id: string;
      move_family: string | null;
      scope_visibility: string | null;
      saliency_urgency: string | null;
      compatible_turn_drivers: string[];
      predicate_classes: string[];
      action_families: string[];
    }>;
    requires_full_body_ids: string[];
  } | null;
  storylet_pool_summary: {
    total: number;
    visibility_filtered_count: number;
    by_move_family: Record<string, number>;
    by_urgency: Record<string, number>;
    visible_records: Array<{
      id: string;
      title: string;
      move_family: string;
      urgency: string;
      visibility_scope: string;
    }>;
  };
  open_obligations: Array<{
    id: string;
    obligation_kind: string;
    description: string;
    owed_by: string;
    owed_to: string;
    urgency: "low" | "medium" | "high";
    trigger_to_close: string;
    status: string;
  }>;
  active_intentions: Array<{
    id: string;
    holder: string;
    intent: string;
    urgency: "low" | "medium" | "high";
    expires_when: string;
  }>;
  active_statuses: Array<{
    entity: string;
    life: string;
    agency: string;
    location: string;
  }>;
  active_beliefs_by_holder: Array<{
    holder: string;
    beliefs: Array<{
      id: string;
      claim: string;
      belief_mode: string;
      truth_relation:
        | "true"
        | "false"
        | "partly_true"
        | "unknown"
        | "contested"
        | "branch_counterfactual"
        | "future_contingent";
      confidence: string;
      visibility:
        | "private"
        | "shared"
        | "factional"
        | "public"
        | "rumored"
        | "concealed"
        | "suppressed";
    }>;
  }>;
  active_relationships_by_participant: Array<{
    participants: string[];
    axes: Array<{
      axis: string;
      value: string;
    }>;
  }>;
  active_locations_in_scope: Array<{
    id: string;
    label: string;
    description: string;
    bound_ent: string | null;
  }>;
  active_objects_in_scope: Array<{
    id: string;
    label: string;
    description: string;
    owner: string | null;
    current_location: string;
  }>;
  active_story_diegetic_artifacts: Array<{
    id: string;
    title: string;
    author: string;
    genre: string;
    intended_audience: string;
    circulation: string;
    truth_relation: string;
    derived_from: string[];
  }>;
  active_story_characters: Array<{
    id: string;
    status: string;
    bound_stent_ids: string[];
    source_kind: string;
    source_char_id: string | null;
    profile_revision: number;
    packet_preview: string;
  }>;
  active_actor_plans: Array<{
    id: string;
    holder: string;
    root_intention: string;
    objective: string;
    plan_status: string;
    current_step_action_family: string;
  }>;
  active_emotional_states: Array<{
    id: string;
    holder: string;
    status: string;
    affect_kind: string | null;
    intensity: string | null;
    behavioral_pressure: string[];
    agency_effect: string;
  }>;
  active_threads: Array<{
    id: string;
    type: string;
    status: string;
    current_pressure: number;
    desired_cadence: number;
    obligations: string[];
  }>;
  active_clocks: Array<{
    id: string;
    title: string;
    clock_kind: string;
    driver: string;
    value: number;
    max: number;
    salience: string;
    visibility: string;
    status: string;
  }>;
  hidden_secrets: Array<{
    id: string;
    secret_kind: string;
    salience: string;
    status: string;
    holders: string[];
    clue_carrier_count: number;
    discovered_clue_count: number;
    protected_mystery_refs: string[];
  }>;
  open_story_questions: Array<{
    id: string;
    setup_kind: string;
    question_or_setup: string;
    salience: string;
    audience_visibility: string;
    status: string;
    source_event: string | null;
  }>;
  longest_active_branch_path: string[];
  recent_pages_along_longest_active_branch: Array<{
    id: string;
    storylet_realized: string;
    chosen_choice_id: string | null;
    content_intensity: string;
    created_at: string;
    summary?: string;
  }>;
  mysteries_in_play: Array<{
    m_id: string;
    status: string;
    future_resolution_safety: string;
    domain_overlap: string;
  }>;
  mystery_evidence_chains: Array<{
    mystery_id: string;
    claims: Array<{
      page_id: string;
      authority: string;
      status: string;
      evidence_records: string[];
    }>;
  }>;
  cast_bind_list: Array<{
    stchar_id: string | null;
    source_char_id: string | null;
    stent_id: string;
    role_in_story: RoleInStory[];
  }>;
  invariants_acknowledged: string[];
}

export interface ContextPacket {
  task_header: {
    task_type: TaskType;
    world_slug: string;
    story_slug: string | null;
    generated_at: string;
    token_budget: {
      requested: number;
      allocated: number;
    };
    seed_nodes: string[];
    warnings: string[];
    full_body_classes_delivered: NodeType[];
    harness_ceiling_chars: number;
    envelope_overhead_reserve_chars: number;
    governing_full_body_priority: GoverningFullBodyPriority;
    estimator_version: string;
    packet_version: 2;
    delivery_status: ContextPacketDeliveryStatus;
    persisted_output_path?: string;
  };
  local_authority: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  exact_record_links: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  scoped_local_context: {
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  governing_world_context: {
    active_rules: string[];
    protected_surfaces: string[];
    required_output_schema: string[];
    prohibited_moves: string[];
    open_risks: ContextPacketRisk[];
    nodes: ContextPacketNode[];
    why_included: string[];
  };
  story_bundle_context: ContextPacketStoryBundleContext | null;
  impact_surfaces: {
    nodes: ContextPacketNode[];
    rationale: string[];
  };
  governing_summary?: ContextPacketGoverningSummary;
  truncation_summary: ContextPacketTruncationSummary;
}

export const TRUNCATION_FALLBACK_ADVICE =
  "Retrieve dropped nodes via mcp__worldloom__get_record(record_id), mcp__worldloom__get_records(record_ids), or mcp__worldloom__get_record_field(record_id, field_path) as needed.";

export const DEFAULT_PACKET_VERSION = 2 as const;
export const DEFAULT_HARNESS_CEILING_CHARS = 60000;
export const ENVELOPE_OVERHEAD_RESERVE_CHARS = 4000;
export const CONTEXT_PACKET_ESTIMATOR_VERSION = "chars-per-token-v1";

export type GoverningFullBodyPriorityMode = "opportunistic" | "reserve";

export interface GoverningFullBodyPriority {
  invariants: GoverningFullBodyPriorityMode;
  mystery_reserve: GoverningFullBodyPriorityMode;
}

export const OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY: GoverningFullBodyPriority = {
  invariants: "opportunistic",
  mystery_reserve: "opportunistic"
};

export const GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE: Record<
  TaskType,
  GoverningFullBodyPriority
> = {
  canon_addition: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  character_generation: { invariants: "reserve", mystery_reserve: "reserve" },
  diegetic_artifact_generation: { invariants: "reserve", mystery_reserve: "reserve" },
  continuity_audit: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  propose_new_canon_facts: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  propose_new_characters: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  propose_new_worlds_from_preferences: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  canon_facts_from_diegetic_artifacts: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  emergent_pressure_events: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY,
  story_bootstrap: { invariants: "reserve", mystery_reserve: "reserve" },
  story_character_profile: { invariants: "reserve", mystery_reserve: "reserve" },
  story_turn_cycle: { invariants: "reserve", mystery_reserve: "reserve" },
  commitment_block_authoring: { invariants: "reserve", mystery_reserve: "reserve" },
  branching_story_health_audit: { invariants: "reserve", mystery_reserve: "reserve" },
  story_fact_promotion_to_canon: { invariants: "reserve", mystery_reserve: "reserve" },
  other: OPPORTUNISTIC_GOVERNING_FULL_BODY_PRIORITY
};

export const DEFAULT_BUDGET_SPLIT = {
  local_authority: 0.25,
  exact_record_links: 0.15,
  scoped_local_context: 0.2,
  governing_world_context: 0.2,
  story_bundle_context: 0,
  impact_surfaces: 0.1,
  overhead: 0.1
} as const;

export const STORY_PIPELINE_TASK_TYPES = [
  "story_bootstrap",
  "story_character_profile",
  "story_turn_cycle",
  "commitment_block_authoring",
  "branching_story_health_audit",
  "story_fact_promotion_to_canon"
] as const satisfies readonly TaskType[];

export function isStoryPipelineTaskType(taskType: TaskType): boolean {
  return (STORY_PIPELINE_TASK_TYPES as readonly string[]).includes(taskType);
}

export interface PacketNodeRow {
  node_id: string;
  world_slug: string;
  node_type: NodeType;
  file_path: string;
  heading_path: string | null;
  body: string;
  summary: string | null;
}

export type PacketRecordProjection = (row: PacketNodeRow) => Record<string, unknown> | undefined;

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function makeBodyPreview(body: string, maxLength = 280): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
}

export const SUMMARY_MAX_LENGTH = 100;

export function deriveNodeSummary(body: string, dbSummary: string | null): string {
  if (dbSummary !== null && dbSummary.trim().length > 0) {
    return clipToSummaryLength(dbSummary);
  }

  const fromNotes = extractYamlNotesFirstLine(body);
  if (fromNotes !== null) {
    return clipToSummaryLength(fromNotes);
  }

  return clipToSummaryLength(extractFirstSentence(body));
}

function clipToSummaryLength(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= SUMMARY_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, SUMMARY_MAX_LENGTH - 3)}...`;
}

function extractYamlNotesFirstLine(body: string): string | null {
  let parsed: unknown;
  try {
    parsed = YAML.parse(body);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const notes = (parsed as Record<string, unknown>).notes;
  if (typeof notes !== "string") {
    return null;
  }

  const firstLine = notes.split("\n").find((line) => line.trim().length > 0);
  return firstLine?.trim() ?? null;
}

function extractFirstSentence(body: string): string {
  const normalized = body.replace(/\s+/g, " ").trim();
  const match = normalized.match(/^[^.!?]*[.!?]/);
  return match?.[0]?.trim() ?? normalized;
}

export function estimateTextTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function estimateNodeTokens(node: ContextPacketNode): number {
  return estimateTextTokens(
    [
      node.id,
      node.world_slug,
      node.node_type,
      node.file_path,
      node.heading_path ?? "",
      node.summary ?? "",
      node.body_preview ?? "",
      node.full_body ?? "",
      node.record === undefined ? "" : JSON.stringify(node.record)
    ].join(" ")
  );
}

export function estimatePacketTokens(packet: ContextPacket): number {
  let total = 0;

  total += estimateTextTokens(JSON.stringify(packet.task_header));
  total += packet.local_authority.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.local_authority.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.exact_record_links.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.exact_record_links.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.scoped_local_context.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.scoped_local_context.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  total += packet.governing_world_context.active_rules.reduce(
    (sum, rule) => sum + estimateTextTokens(rule),
    0
  );
  total += packet.governing_world_context.protected_surfaces.reduce(
    (sum, surface) => sum + estimateTextTokens(surface),
    0
  );
  total += packet.governing_world_context.required_output_schema.reduce(
    (sum, entry) => sum + estimateTextTokens(entry),
    0
  );
  total += packet.governing_world_context.prohibited_moves.reduce(
    (sum, move) => sum + estimateTextTokens(move),
    0
  );
  total += packet.governing_world_context.open_risks.reduce(
    (sum, risk) => sum + estimateTextTokens(JSON.stringify(risk)),
    0
  );
  total += packet.governing_world_context.nodes.reduce((sum, node) => sum + estimateNodeTokens(node), 0);
  total += packet.governing_world_context.why_included.reduce(
    (sum, reason) => sum + estimateTextTokens(reason),
    0
  );
  if (packet.story_bundle_context !== null) {
    total += estimateTextTokens(JSON.stringify(packet.story_bundle_context));
  }
  total += packet.impact_surfaces.nodes.reduce(
    (sum, node) => sum + estimateNodeTokens(node),
    0
  );
  total += packet.impact_surfaces.rationale.reduce(
    (sum, rationale) => sum + estimateTextTokens(rationale),
    0
  );
  total += estimateTextTokens(JSON.stringify(packet.truncation_summary));

  return total;
}

export function estimatePacketChars(packet: ContextPacket): number {
  return JSON.stringify(packet).length;
}

export function estimateStablePacketSize(packet: ContextPacket): number {
  const originalAllocated = packet.task_header.token_budget.allocated;
  const originalRequested = packet.task_header.token_budget.requested;
  try {
    let candidate = estimatePacketTokens(packet);
    for (;;) {
      packet.task_header.token_budget.allocated = candidate;
      packet.task_header.token_budget.requested = Math.max(originalRequested, candidate);
      const adjusted = estimatePacketTokens(packet);
      if (adjusted <= candidate) {
        return candidate;
      }
      candidate = adjusted;
    }
  } finally {
    packet.task_header.token_budget.allocated = originalAllocated;
    packet.task_header.token_budget.requested = originalRequested;
  }
}

export function estimateStablePacketChars(packet: ContextPacket): number {
  const originalAllocated = packet.task_header.token_budget.allocated;
  try {
    let candidate = estimatePacketChars(packet);
    for (;;) {
      packet.task_header.token_budget.allocated = candidate;
      const adjusted = estimatePacketChars(packet);
      if (adjusted <= candidate) {
        return candidate;
      }
      candidate = adjusted;
    }
  } finally {
    packet.task_header.token_budget.allocated = originalAllocated;
  }
}

export function resolveHarnessCeilingChars(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = env.WORLDLOOM_MCP_HARNESS_CEILING_CHARS;
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_HARNESS_CEILING_CHARS;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_HARNESS_CEILING_CHARS;
}

export function loadPacketNodes(
  db: Database.Database,
  worldSlug: string,
  nodeIds: readonly string[],
  options: {
    recordProjection?: PacketRecordProjection;
    deliveryMode?: DeliveryMode;
  } = {}
): ContextPacketNode[] {
  const uniqueNodeIds = uniqueStrings(nodeIds);
  if (uniqueNodeIds.length === 0) {
    return [];
  }

  const deliveryMode: DeliveryMode = options.deliveryMode ?? DEFAULT_DELIVERY_MODE;

  const rows = db
    .prepare(
      `
        SELECT node_id, world_slug, node_type, file_path, heading_path, body, summary
        FROM nodes
        WHERE world_slug = ?
          AND node_id IN (${uniqueNodeIds.map(() => "?").join(", ")})
      `
    )
    .all(worldSlug, ...uniqueNodeIds) as PacketNodeRow[];

  const byId = new Map(
    rows.map((row) => {
      const node: ContextPacketNode = {
        id: row.node_id,
        world_slug: row.world_slug,
        node_type: row.node_type,
        file_path: row.file_path,
        heading_path: row.heading_path,
        summary:
          deliveryMode === "summary_only"
            ? deriveNodeSummary(row.body, row.summary ?? null)
            : (row.summary ?? null)
      };
      if (deliveryMode === "full") {
        node.body_preview = makeBodyPreview(row.body);
      }
      const projectedRecord = options.recordProjection?.(row);
      if (projectedRecord !== undefined) {
        node.record = projectedRecord;
      }

      return [row.node_id, node] as const;
    })
  );

  return uniqueNodeIds
    .map((nodeId) => byId.get(nodeId))
    .filter((node): node is ContextPacketNode => node !== undefined);
}

export function parsePacketNodeRecord(row: PacketNodeRow): Record<string, unknown> | undefined {
  let parsed: unknown;
  try {
    parsed = YAML.parse(row.body);
  } catch {
    return undefined;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return undefined;
  }

  return parsed as Record<string, unknown>;
}
