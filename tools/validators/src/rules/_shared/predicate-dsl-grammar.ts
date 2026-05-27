// Structural constants derived from .claude/skills/_shared-templates/story-state-contract.md section 5.
// Keep this helper limited to closed runtime grammar; story/world-local labels stay open typed strings.

export const PRED_TYPES = [
  "fact_true",
  "belief_record",
  "entity_status",
  "relationship_axis",
  "obligation_open",
  "consequence_pending",
  "thread_active",
  "clock_at_least",
  "clock_below",
  "clock_full",
  "secret_unrevealed",
  "secret_revealed",
  "revelation_ready",
  "story_question_open",
  "story_question_status",
  "promise_due",
  "plan_active",
  "plan_blocked",
  "any_plan_active",
  "emotion_active",
  "any_emotion_active",
  "emotion_pressure",
  "any_obligation_open",
  "any_consequence_pending",
  "any_thread_active",
  "any_clock_active",
  "any_secret_unrevealed",
  "any_story_question_open",
  "any_relationship_axis",
  "any_belief",
  "any_intention",
  "location",
  "has_affordance",
  "record_active",
  "record_age",
  "intention_active",
  "object_accessible",
  "artifact_accessible",
  "affordance_available_to",
  "not",
  "all",
  "any"
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

export const ACTION_FAMILIES = [
  "move",
  "evade",
  "pursue",
  "perceive",
  "investigate",
  "communicate",
  "persuade",
  "negotiate",
  "bond",
  "oppose",
  "harm",
  "protect",
  "control",
  "transfer",
  "use",
  "make_change",
  "ritual_protocol",
  "recover",
  "wait",
  "decide"
] as const;

export const BELIEF_MODES = [
  "knows",
  "believes",
  "suspects",
  "doubts",
  "denies",
  "reports",
  "claims",
  "deceives",
  "misremembers",
  "interprets"
] as const;

export const CONFIDENCE_LEVELS = ["certain", "high", "medium", "low", "uncommitted"] as const;

export const AFFECT_KINDS = [
  "fear",
  "anxiety",
  "anger",
  "disgust",
  "grief",
  "shame",
  "guilt",
  "humiliation",
  "hope",
  "relief",
  "joy",
  "awe",
  "tenderness",
  "desire",
  "envy",
  "contempt",
  "confusion",
  "dread"
] as const;

export const EMOTION_INTENSITIES = ["low", "medium", "high", "extreme"] as const;

export const BEHAVIORAL_PRESSURES = [
  "approach",
  "flee",
  "freeze",
  "attack",
  "reject",
  "dominate",
  "submit",
  "seek_contact",
  "protect_other",
  "seek_help",
  "confess",
  "conceal",
  "withdraw_socially",
  "plan",
  "accommodate",
  "self_soothe",
  "ruminate",
  "collapse"
] as const;

export const PREDICATE_ARG_SCHEMAS = {
  fact_true: { required: ["fact"] },
  belief_record: { required: ["holder", "belief_id"] },
  entity_status: { required: ["entity", "field", "value"] },
  relationship_axis: { required: ["from", "to", "axis"] },
  obligation_open: { required: ["obligation"] },
  consequence_pending: { required: ["consequence"] },
  thread_active: { required: ["thread"] },
  clock_at_least: { required: ["clock", "value"] },
  clock_below: { required: ["clock", "value"] },
  clock_full: { required: ["clock"] },
  secret_unrevealed: { required: ["secret"] },
  secret_revealed: { required: ["secret"] },
  revelation_ready: { required: ["secret"] },
  story_question_open: { required: ["question"] },
  story_question_status: { required: ["question", "status"] },
  promise_due: { required: ["question", "age_pages"] },
  plan_active: { required: ["holder"] },
  plan_blocked: { required: ["holder"] },
  any_plan_active: { required: ["alias"] },
  emotion_active: { required: ["holder"] },
  any_emotion_active: { required: ["alias"] },
  emotion_pressure: { required: ["holder", "pressure"] },
  any_obligation_open: { required: ["alias"] },
  any_consequence_pending: { required: ["alias"] },
  any_thread_active: { required: ["alias"] },
  any_clock_active: { required: ["alias"] },
  any_secret_unrevealed: { required: ["alias"] },
  any_story_question_open: { required: ["alias"] },
  any_relationship_axis: { required: ["alias", "axis", "comparator", "value"] },
  any_belief: { required: ["alias"] },
  any_intention: { required: ["alias"] },
  location: { required: ["entity", "location"] },
  has_affordance: { required: ["action_family"] },
  record_active: { required: ["record"] },
  record_age: { required: ["record", "comparator", "pages"] },
  intention_active: { required: ["intention"] },
  object_accessible: { required: ["entity", "object"] },
  artifact_accessible: { required: ["entity", "artifact"] },
  affordance_available_to: { required: ["entity", "action_family"] },
  not: { required: ["predicate"] },
  all: { required: ["predicates"] },
  any: { required: ["predicates"] }
} as const satisfies Record<(typeof PRED_TYPES)[number], { required: readonly string[] }>;

export type PredicateName = (typeof PRED_TYPES)[number];

export const PREDICATE_RECORD_PREFIX_TO_CLASS = {
  BEL: "belief_record",
  CLK: "pressure_clock_record",
  CNSQ: "consequence_record",
  DA: "story_diegetic_artifact_record",
  OBL: "obligation_record",
  SF: "story_fact_record",
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
} as const;

export type PredicateReferencedClass =
  (typeof PREDICATE_RECORD_PREFIX_TO_CLASS)[keyof typeof PREDICATE_RECORD_PREFIX_TO_CLASS];

export const PREDICATE_REFERENCED_CLASSES = {
  fact_true: ["story_fact_record"],
  belief_record: ["story_entity_record", "belief_record"],
  entity_status: ["story_entity_record", "story_status_record"],
  relationship_axis: ["relationship_record_story"],
  obligation_open: ["obligation_record"],
  consequence_pending: ["consequence_record"],
  thread_active: ["thread_record"],
  clock_at_least: ["pressure_clock_record"],
  clock_below: ["pressure_clock_record"],
  clock_full: ["pressure_clock_record"],
  secret_unrevealed: ["story_secret_record"],
  secret_revealed: ["story_secret_record"],
  revelation_ready: ["story_secret_record"],
  story_question_open: ["story_question_record"],
  story_question_status: ["story_question_record"],
  promise_due: ["story_question_record"],
  plan_active: ["story_entity_record", "story_plan_record"],
  plan_blocked: ["story_entity_record", "story_plan_record"],
  any_plan_active: ["story_plan_record"],
  emotion_active: ["story_entity_record", "story_emotion_record"],
  any_emotion_active: ["story_emotion_record"],
  emotion_pressure: ["story_entity_record", "story_emotion_record"],
  any_obligation_open: ["obligation_record"],
  any_consequence_pending: ["consequence_record"],
  any_thread_active: ["thread_record"],
  any_clock_active: ["pressure_clock_record"],
  any_secret_unrevealed: ["story_secret_record"],
  any_story_question_open: ["story_question_record"],
  any_relationship_axis: ["relationship_record_story"],
  any_belief: ["belief_record"],
  any_intention: ["intention_record"],
  location: ["story_entity_record", "story_location_record"],
  has_affordance: [],
  record_active: [],
  record_age: [],
  intention_active: ["intention_record"],
  object_accessible: ["story_entity_record", "story_object_record"],
  artifact_accessible: ["story_entity_record", "story_diegetic_artifact_record"],
  affordance_available_to: ["story_entity_record"],
  not: [],
  all: [],
  any: []
} as const satisfies Record<PredicateName, readonly PredicateReferencedClass[]>;

export function predicateRecordClassForRecordId(recordId: string): PredicateReferencedClass | null {
  const match = /^([A-Z]+)-\d+$/.exec(recordId);
  if (match === null) {
    return null;
  }

  return PREDICATE_RECORD_PREFIX_TO_CLASS[match[1] as keyof typeof PREDICATE_RECORD_PREFIX_TO_CLASS] ?? null;
}
