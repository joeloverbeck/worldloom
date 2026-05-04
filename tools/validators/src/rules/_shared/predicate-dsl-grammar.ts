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
