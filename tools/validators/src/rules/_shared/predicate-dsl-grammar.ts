// Structural constants derived from .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md.
// Keep this helper limited to closed runtime grammar; story/world-local labels stay open typed strings.

export const PRED_TYPES = [
  "fact_true",
  "fact_matches",
  "entity_state",
  "relationship",
  "consequence_pending",
  "obligation_open",
  "location",
  "epistemic",
  "not",
  "all",
  "any",
  "relationship_state",
  "time_of_day",
  "time_of_week",
  "time_in_story",
  "time_since_event",
  "world_property",
  "obligation_state",
  "location_kind",
  "location_id",
  "location_class"
] as const;

export const RELATIONAL_OPERATORS = ["==", "!=", ">", "<", ">=", "<="] as const;
export const SET_OPERATORS = ["in"] as const;
export const EQUALITY_OPERATORS = ["==", "!="] as const;
export const EQUALITY_OR_SET_OPERATORS = ["==", "in"] as const;

export const FACT_MATCHES_PREDICATES = [
  "alive",
  "present",
  "has_object",
  "knows",
  "believes",
  "relationship_axis",
  "location"
] as const;

export const ENTITY_STATE_PROPERTIES = [
  "alive",
  "conscious",
  "present",
  "willing",
  "armed",
  "injured",
  "mobile",
  "restrained",
  "mode",
  "visible",
  "visible_to_protagonist",
  "present_count"
] as const;

export const RELATIONSHIP_AXES = [
  "trust",
  "fear",
  "desire",
  "debt",
  "intimacy",
  "loyalty",
  "resentment",
  "power_imbalance",
  "attention",
  "familiarity",
  "approval",
  "respect",
  "obligation",
  "hostility"
] as const;

export const EPISTEMIC_CLASSES = [
  "objective",
  "belief",
  "rumor",
  "reader_inference",
  "apparent",
  "disputed"
] as const;

export const OBLIGATION_STATE_PROPERTIES = ["status", "salience", "urgency"] as const;
export const OBLIGATION_STATUSES = ["open", "paid_off", "complicated", "abandoned"] as const;

export const STOP_PREDICATES = [
  "commitment_satisfied",
  "commitment_blocked",
  "commitment_overturned",
  "npc_makes_demand",
  "npc_makes_disclosure",
  "participant_exits",
  "scene_goal_resolves",
  "scene_goal_changes",
  "new_obligation_created",
  "open_thread_reprioritized",
  "time_or_location_changes",
  "irreversible_cost_imminent",
  "consent_boundary_imminent",
  "violence_or_harm_imminent",
  "forbidden_mystery_resolution_risk",
  "protagonist_goal_change_required",
  "selected_commitment_would_be_violated",
  "user_write_in_conflicts_with_envelope",
  "only_next_action_would_create_major_state_change"
] as const;

export const NORMAL_EXIT_STOP_PREDICATES = [
  "commitment_satisfied",
  "commitment_blocked",
  "commitment_overturned",
  "npc_makes_demand",
  "npc_makes_disclosure",
  "participant_exits",
  "scene_goal_resolves",
  "scene_goal_changes",
  "new_obligation_created",
  "open_thread_reprioritized",
  "time_or_location_changes"
] as const;

export const INTERRUPT_BEFORE_STOP_PREDICATES = [
  "irreversible_cost_imminent",
  "consent_boundary_imminent",
  "violence_or_harm_imminent",
  "forbidden_mystery_resolution_risk",
  "protagonist_goal_change_required",
  "selected_commitment_would_be_violated",
  "user_write_in_conflicts_with_envelope",
  "only_next_action_would_create_major_state_change"
] as const;

// Stop-policy predicates use `predicate: <name>` plus an `args` object on
// stop_policy.normal_exits[] / interrupt_before[] entries.
export const STOP_PREDICATE_ARG_SCHEMAS = {
  commitment_satisfied: { required: ["commitment_class"] },
  commitment_blocked: { required: ["commitment_class"] },
  commitment_overturned: { required: ["commitment_class"] },
  npc_makes_demand: { required: ["npc"] },
  npc_makes_disclosure: { required: ["npc"] },
  participant_exits: { required: ["participant"] },
  scene_goal_resolves: { required: ["goal"] },
  scene_goal_changes: { required: ["goal"] },
  new_obligation_created: { required: ["obligation_type"] },
  open_thread_reprioritized: { required: ["thread_id"] },
  time_or_location_changes: { required: ["change_kind"] },
  irreversible_cost_imminent: { required: ["cost_axis"] },
  consent_boundary_imminent: { required: [] },
  violence_or_harm_imminent: { required: [] },
  forbidden_mystery_resolution_risk: { required: ["mystery_id"] },
  protagonist_goal_change_required: { required: ["goal"] },
  selected_commitment_would_be_violated: { required: ["commitment_class"] },
  user_write_in_conflicts_with_envelope: { required: ["envelope_field"] },
  only_next_action_would_create_major_state_change: { required: ["state_axis"] }
} as const satisfies Record<(typeof STOP_PREDICATES)[number], { required: readonly string[] }>;
