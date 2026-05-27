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
} as const satisfies Record<string, readonly PredicateReferencedClass[]>;

export function predicateRecordClassForRecordId(recordId: string): PredicateReferencedClass | null {
  const match = /^([A-Z]+)-\d+$/.exec(recordId);
  if (match === null) {
    return null;
  }

  return PREDICATE_RECORD_PREFIX_TO_CLASS[match[1] as keyof typeof PREDICATE_RECORD_PREFIX_TO_CLASS] ?? null;
}
