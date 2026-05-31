// Single typed source of truth for Manual Story Studio record shapes,
// common fields, per-class additions, and closed enum vocabularies.
// Consumed by validators, read/write layers, CRUD routes, and the frontend
// API client. Add a common field or a new enum value here, not elsewhere.

export type ManualStoryPov =
  | "first"
  | "close third"
  | "distant third"
  | "omniscient";

export type ManualStoryTense = "past" | "present";

export type ManualStoryContentIntensity = "general" | "mature" | "explicit";

export type ManualStoryLanguageRegister =
  | "casual"
  | "literary"
  | "formal"
  | "period_voice"
  | "colloquial"
  | "mixed";

export type ManualStoryPsychicDistance =
  | "deep_close"
  | "close"
  | "mid"
  | "distant"
  | "variable";

export type ManualStoryDialogueDensity =
  | "dense"
  | "moment_led"
  | "sparse"
  | "mixed";

export type ManualStoryInteriority =
  | "free_indirect"
  | "filtered"
  | "minimal"
  | "mixed";

export type ManualStoryParagraphing =
  | "literary"
  | "journalistic"
  | "dialogue_led"
  | "mixed";

export interface ManualStoryProsePreferences {
  psychic_distance: ManualStoryPsychicDistance;
  dialogue_density: ManualStoryDialogueDensity;
  interiority: ManualStoryInteriority;
  paragraphing: ManualStoryParagraphing;
}

export interface ManualStoryContract {
  premise: string;
  tone: string;
  pov: ManualStoryPov;
  tense: ManualStoryTense;
  content_intensity: ManualStoryContentIntensity;
  explicitness: string;
  language_register: ManualStoryLanguageRegister;
  prose_preferences: ManualStoryProsePreferences;
}

export interface ManualStoryPromptPolicy {
  save_prompts: boolean;
  require_moment_directive: boolean;
  default_beat_count: string;
  include_recent_segments: number;
}

export interface ManualStoryManuscriptPolicy {
  compile_on_segment_save: boolean;
  include_segment_titles: boolean;
  allow_reorder: boolean;
}

export interface ManualStorySource {
  world_commit: string | null;
  notes: string;
}

export interface ManualStoryMetadata {
  schema_version: "manual-story.v1";
  world_slug: string;
  manual_story_slug: string;
  title: string;
  created_at: string;
  updated_at: string;
  source: ManualStorySource;
  story_contract: ManualStoryContract;
  cast_order: string[];
  segment_order: string[];
  prompt_policy: ManualStoryPromptPolicy;
  manuscript: ManualStoryManuscriptPolicy;
}

export interface SegmentSidecarIncludedRecordSummary {
  characters: string[];
  records: string[];
}

export interface SegmentSidecar {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  prompt_id: string | null;
  prompt_sha256: string | null;
  moment_directive: string;
  selected_template: string | null;
  included_record_summary: SegmentSidecarIncludedRecordSummary;
  author_note: string;
  word_count: number;
}

export type ManualStoryRole =
  | "viewpoint"
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

export type RecordImportance = "low" | "medium" | "high" | "central";

export type PromptVisibility =
  | "always"
  | "include_when_relevant"
  | "only_if_pinned";

export interface RecordRefs {
  characters: string[];
  locations: string[];
  related_records: string[];
}

export interface RecordCommonFields {
  id: string;
  title: string;
  active: boolean;
  importance: RecordImportance;
  tags: string[];
  summary: string;
  details: string;
  refs: RecordRefs;
  prompt_visibility: PromptVisibility;
  last_reviewed_after_segment: string | null;
  notes: string;
  retired_reason?: string;
}

export type ManualRecordClass =
  | "cast"
  | "entities"
  | "statuses"
  | "locations"
  | "objects"
  | "facts"
  | "beliefs"
  | "intentions"
  | "plans"
  | "emotions"
  | "relationships"
  | "threads"
  | "obligations"
  | "consequences"
  | "clocks"
  | "secrets"
  | "questions"
  | "artifacts";

export const MANUAL_RECORD_CLASS_PREFIXES: Record<ManualRecordClass, string> = {
  cast: "mchar",
  entities: "ment",
  statuses: "mstat",
  locations: "mloc",
  objects: "mobj",
  facts: "mfact",
  beliefs: "mbel",
  intentions: "mint",
  plans: "mplan",
  emotions: "memo",
  relationships: "mrel",
  threads: "mthr",
  obligations: "mobl",
  consequences: "mcnsq",
  clocks: "mclock",
  secrets: "msecret",
  questions: "mq",
  artifacts: "martifact",
};

export const MANUAL_RECORD_CLASSES: readonly ManualRecordClass[] = [
  "cast",
  "entities",
  "statuses",
  "locations",
  "objects",
  "facts",
  "beliefs",
  "intentions",
  "plans",
  "emotions",
  "relationships",
  "threads",
  "obligations",
  "consequences",
  "clocks",
  "secrets",
  "questions",
  "artifacts",
] as const;

export interface ManualCharacterProfileIdentity {
  one_line: string;
  public_face: string;
  private_pressure: string;
}

export interface ManualCharacterWorldPressureCore {
  world_produced_wound: string;
  active_appetite: string;
  self_mythology: string;
  irreconcilable_contradiction: string;
  relational_charge: string;
  moral_psychological_edge: string;
  cannot_be_swapped_out_because: string;
}

export interface ManualCharacterBodyAndPresence {
  physicality: string;
  body_limits: string;
  habitual_gestures: string;
  clothing_or_presentation: string;
  social_presentation: string;
}

export interface ManualCharacterVoice {
  baseline: string;
  under_pressure: string;
  intimacy: string;
  evasion: string;
  anger: string;
  lying: string;
  anti_generic_warnings: string[];
}

export interface ManualCharacterPressureBehavior {
  cornered: string;
  tempted: string;
  humiliated: string;
  protecting_attachment: string;
  offered_power: string;
}

export interface ManualCharacterPerceptionAndEmbodiment {
  notices: string;
  misses: string;
  misreads: string;
  sensory_bias: string;
}

export interface ManualCharacterAgencyAndPlanning {
  default_strategy: string;
  risk_style: string;
  fallback_style: string;
  planning_blind_spots: string;
}

export interface ManualCharacterProseConstraints {
  prose_must_not_imply: string[];
  forbidden_inventions: string[];
  voice_do_not_do: string[];
}

export interface ManualCharacterRecord extends RecordCommonFields {
  display_name: string;
  roles: ManualStoryRole[];
  source_world_character?: string;
  identity: ManualCharacterProfileIdentity;
  world_pressure_core: ManualCharacterWorldPressureCore;
  body_and_presence: ManualCharacterBodyAndPresence;
  voice: ManualCharacterVoice;
  pressure_behavior: ManualCharacterPressureBehavior;
  perception_and_embodiment: ManualCharacterPerceptionAndEmbodiment;
  agency_and_planning: ManualCharacterAgencyAndPlanning;
  relationship_behavior: Record<string, string>;
  prose_constraints: ManualCharacterProseConstraints;
}

export type ManualCharacterProfile = ManualCharacterRecord;

export type ManualEntityKind =
  | "institution"
  | "faction"
  | "force"
  | "population"
  | "animal"
  | "other";

export interface ManualEntityRecord extends RecordCommonFields {
  kind: ManualEntityKind;
}

export type ManualStatusKind =
  | "life"
  | "agency"
  | "location"
  | "bodily"
  | "social"
  | "other";

export interface ManualStatusRecord extends RecordCommonFields {
  subject: string;
  kind: ManualStatusKind;
}

export type ManualLocationRecord = RecordCommonFields;

export interface ManualObjectRecord extends RecordCommonFields {
  current_location: string | null;
  current_holder: string | null;
}

export type ManualFactRecord = RecordCommonFields;

export type ManualBeliefTruthRelation =
  | "true"
  | "false"
  | "partly_true"
  | "unknown"
  | "contested";

export type ManualBeliefConfidence = "low" | "medium" | "high" | "certain";

export interface ManualBeliefRecord extends RecordCommonFields {
  holder: string;
  truth_relation: ManualBeliefTruthRelation;
  confidence: ManualBeliefConfidence;
}

export interface ManualIntentionRecord extends RecordCommonFields {
  holder: string;
  target: string;
}

export type ManualPlanVisibility = "private" | "shared" | "factional" | "public";

export interface ManualPlanRecord extends RecordCommonFields {
  holder: string;
  target: string;
  visibility: ManualPlanVisibility;
}

export type ManualEmotionValence = "positive" | "mixed" | "negative";

export type ManualEmotionIntensity =
  | "mild"
  | "moderate"
  | "strong"
  | "overwhelming";

export interface ManualEmotionRecord extends RecordCommonFields {
  holder: string;
  valence: ManualEmotionValence;
  intensity: ManualEmotionIntensity;
}

export type ManualRelationshipAxisLevel =
  | "low"
  | "medium"
  | "high"
  | "volatile"
  | "unset";

export interface ManualRelationshipAxes {
  trust: ManualRelationshipAxisLevel;
  fear: ManualRelationshipAxisLevel;
  attraction: ManualRelationshipAxisLevel;
  power: ManualRelationshipAxisLevel;
  respect: ManualRelationshipAxisLevel;
  familiarity: ManualRelationshipAxisLevel;
}

export interface ManualRelationshipRecord extends RecordCommonFields {
  between: [string, string];
  axes: ManualRelationshipAxes;
  dominant_axis?: string;
}

export type ManualThreadStatus =
  | "open"
  | "building"
  | "climaxing"
  | "resolving"
  | "closed"
  | "dormant";

export interface ManualThreadRecord extends RecordCommonFields {
  subject: string;
  status: ManualThreadStatus;
}

export type ManualObligationUrgency =
  | "latent"
  | "low"
  | "medium"
  | "high"
  | "overdue";

export interface ManualObligationRecord extends RecordCommonFields {
  owed_by: string;
  owed_to: string;
  urgency: ManualObligationUrgency;
}

export interface ManualConsequenceRecord extends RecordCommonFields {
  caused_by_segment: string | null;
  pending: boolean;
  urgency: ManualObligationUrgency;
}

export type ManualClockDirection =
  | "rising"
  | "falling"
  | "stalled"
  | "unset";

export interface ManualClockRecord extends RecordCommonFields {
  axis: string;
  value: number | string;
  direction: ManualClockDirection;
}

export type ManualSecretAudienceVisibility =
  | "hidden"
  | "known_to_holders"
  | "rumored"
  | "partially_revealed"
  | "revealed";

export interface ManualSecretRecord extends RecordCommonFields {
  held_by: string[];
  audience_visibility: ManualSecretAudienceVisibility;
  forbidden_reveal_tags: string[];
}

export type ManualQuestionKind = "open" | "mystery" | "forbidden_reveal";

export interface ManualQuestionRecord extends RecordCommonFields {
  kind: ManualQuestionKind;
  answer_known: boolean;
  must_not_resolve_unless: string[];
}

export type ManualArtifactKind = "physical" | "text" | "symbolic" | "digital";

export interface ManualArtifactRecord extends RecordCommonFields {
  kind: ManualArtifactKind;
  current_holder: string | null;
  provenance: string;
}

export type ManualRecord =
  | ManualCharacterRecord
  | ManualEntityRecord
  | ManualStatusRecord
  | ManualLocationRecord
  | ManualObjectRecord
  | ManualFactRecord
  | ManualBeliefRecord
  | ManualIntentionRecord
  | ManualPlanRecord
  | ManualEmotionRecord
  | ManualRelationshipRecord
  | ManualThreadRecord
  | ManualObligationRecord
  | ManualConsequenceRecord
  | ManualClockRecord
  | ManualSecretRecord
  | ManualQuestionRecord
  | ManualArtifactRecord;

export interface ManualRecordSummary {
  id: string;
  title: string;
  active: boolean;
  importance: RecordImportance;
  tags: string[];
  summary: string;
  prompt_visibility: PromptVisibility;
}

export type ManualRecordOfClass<C extends ManualRecordClass> = C extends "cast"
  ? ManualCharacterRecord
  : C extends "entities"
    ? ManualEntityRecord
    : C extends "statuses"
      ? ManualStatusRecord
      : C extends "locations"
        ? ManualLocationRecord
        : C extends "objects"
          ? ManualObjectRecord
          : C extends "facts"
            ? ManualFactRecord
            : C extends "beliefs"
              ? ManualBeliefRecord
              : C extends "intentions"
                ? ManualIntentionRecord
                : C extends "plans"
                  ? ManualPlanRecord
                  : C extends "emotions"
                    ? ManualEmotionRecord
                    : C extends "relationships"
                      ? ManualRelationshipRecord
                      : C extends "threads"
                        ? ManualThreadRecord
                        : C extends "obligations"
                          ? ManualObligationRecord
                          : C extends "consequences"
                            ? ManualConsequenceRecord
                            : C extends "clocks"
                              ? ManualClockRecord
                              : C extends "secrets"
                                ? ManualSecretRecord
                                : C extends "questions"
                                  ? ManualQuestionRecord
                                  : C extends "artifacts"
                                    ? ManualArtifactRecord
                                    : never;
