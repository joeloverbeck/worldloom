// Minimal mirror of tools/manual-story-studio/src/schema/manual-story.ts
// for the web bundle. The web frontend uses Vite (bundler) module
// resolution and cannot import from the backend's Node16 module tree;
// keeping the types here means the frontend stays compile-checked
// against the same closed enums without a build coupling.
//
// If a closed-enum value or per-class field is added in the backend
// schema module, mirror it here. Drift between the two is caught at
// runtime by the schema validator's response, which the frontend
// surfaces in the RecordForm inline error UI.

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
  recent_template_advisory_window: number;
}

export interface ManualStoryManuscriptPolicy {
  compile_on_segment_save: boolean;
  include_segment_titles: boolean;
  allow_reorder: boolean;
}

export interface ManualStoryMetadata {
  schema_version: "manual-story.v1";
  world_slug: string;
  manual_story_slug: string;
  title: string;
  created_at: string;
  updated_at: string;
  source: { world_commit: string | null; notes: string };
  story_contract: ManualStoryContract;
  cast_order: string[];
  segment_order: string[];
  prompt_policy: ManualStoryPromptPolicy;
  manuscript: ManualStoryManuscriptPolicy;
}

export interface CurrentContext {
  current_location: string | null;
  current_cast: string[];
  pov_holder: string | null;
  active_pressure_clocks: string[];
  active_secrets_questions: string[];
  pinned_records: string[];
  excluded_records?: string[];
  must_not_reveal: string[];
  current_handoff_summary: string;
  last_accepted_segment: string | null;
  last_reviewed_after_segment: string | null;
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

export interface StateUpdateChecklistEntry {
  record_class: ManualRecordClass;
  total_records: number;
  cast_referencing_count: number;
}

export interface StateUpdateChecklistPayload {
  segment_id: string;
  last_accepted_segment: string | null;
  involved_cast: string[];
  entries: StateUpdateChecklistEntry[];
  disclaimer: string;
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
  | "artifacts"
  | "beat-templates";

export const MANUAL_RECORD_CLASSES: ManualRecordClass[] = [
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
  "beat-templates",
];

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
  "beat-templates": "mtemplate",
};

export interface ManualRecordSummary {
  id: string;
  title: string;
  active: boolean;
  importance: RecordImportance;
  tags: string[];
  summary: string;
  prompt_visibility: PromptVisibility;
  involved_cast?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface RefViolation {
  field: string;
  missingId: string;
  recordId: string;
  recordClass: ManualRecordClass;
}

export type ManualRecord = RecordCommonFields & Record<string, unknown>;

// ---- Prompt composer types (mirror of src/prompt/types.ts) ----

export type PromptLintTier = "hard" | "soft";

export interface PromptLintFinding {
  rule: string;
  tier: PromptLintTier;
  message: string;
  section?: string;
  snippet?: string;
}

export interface PromptLintResult {
  findings: PromptLintFinding[];
  cleanForCopy: boolean;
  blockingForCopy: boolean;
}

export interface PromptRunSidecarDraft {
  manual_story_slug: string;
  included_cast: string[];
  included_records: string[];
  included_template_path: string | null;
  moment_directive: string;
}

export interface PromptRunSidecar extends PromptRunSidecarDraft {
  id: string;
  created_at: string;
  prompt_sha256: string;
  /** @deprecated SPEC-106: write-omitted; read-tolerant for legacy sidecars only. */
  lint_override?: {
    findings: PromptLintFinding[];
    copied_anyway_at: string;
  };
}

export type PromptIncludedReason =
  | "explicitly_selected"
  | "pinned"
  | "active_secret_question"
  | "current_cast";

export type PromptExcludedReason = "inactive" | "working_set_excluded";

export interface PromptIncludedRecord {
  id: string;
  title: string;
  class: ManualRecordClass;
  reason: PromptIncludedReason;
  section: string | null;
}

export interface PromptExcludedRecord {
  id: string;
  title: string;
  class: ManualRecordClass;
  reason: PromptExcludedReason;
}

export interface PromptSuppressedRecord {
  id: string;
  title: string;
  reason: "must_not_reveal";
}

export interface PromptBlockedInput {
  ref: string;
  reason: string;
}

export interface PromptResolution {
  included: PromptIncludedRecord[];
  excluded: PromptExcludedRecord[];
  suppressed: PromptSuppressedRecord[];
  blocked: PromptBlockedInput[];
  section_map: Record<string, string[]>;
}

export interface PromptComposeResult {
  markdown: string;
  lint: PromptLintResult;
  sidecar_draft: PromptRunSidecarDraft;
  resolution: PromptResolution;
}

export interface PromptComposeRequestInput {
  moment_directive: string;
  included_cast: string[];
  included_records: string[];
  // SPEC-104: ID-shaped public API; routes layer resolves to the
  // persisted included_template_path internally.
  selected_template?: string | null;
}

// ---- Beat template types (mirror of src/schema/beat-template.ts) ----

export type BeatTemplateMoveFamily =
  | "negotiation"
  | "confrontation"
  | "seduction"
  | "escape"
  | "reveal"
  | "concealment"
  | "bargaining"
  | "care"
  | "grief"
  | "celebration"
  | "confession"
  | "refusal"
  | "observation"
  | "travel"
  | "preparation"
  | "aftermath"
  | "other";

export const BEAT_TEMPLATE_MOVE_FAMILIES: BeatTemplateMoveFamily[] = [
  "negotiation",
  "confrontation",
  "seduction",
  "escape",
  "reveal",
  "concealment",
  "bargaining",
  "care",
  "grief",
  "celebration",
  "confession",
  "refusal",
  "observation",
  "travel",
  "preparation",
  "aftermath",
  "other",
];

export type BeatTemplatePressureType =
  | "threat"
  | "temptation"
  | "misunderstanding"
  | "deadline"
  | "debt"
  | "intimacy"
  | "exposure"
  | "reversal"
  | "choice"
  | "loss"
  | "discovery";

export const BEAT_TEMPLATE_PRESSURE_TYPES: BeatTemplatePressureType[] = [
  "threat",
  "temptation",
  "misunderstanding",
  "deadline",
  "debt",
  "intimacy",
  "exposure",
  "reversal",
  "choice",
  "loss",
  "discovery",
];

export type BeatTemplateTurnType =
  | "reveal"
  | "refusal"
  | "concession"
  | "escalation"
  | "reversal_turn"
  | "commitment"
  | "misread"
  | "sacrifice"
  | "boundary_crossing"
  | "discovery_turn"
  | "consequence_arrives";

export const BEAT_TEMPLATE_TURN_TYPES: BeatTemplateTurnType[] = [
  "reveal",
  "refusal",
  "concession",
  "escalation",
  "reversal_turn",
  "commitment",
  "misread",
  "sacrifice",
  "boundary_crossing",
  "discovery_turn",
  "consequence_arrives",
];

export type BeatTemplateToneFit =
  | "intimate"
  | "tender"
  | "tense"
  | "comic"
  | "bleak"
  | "wry"
  | "reverent"
  | "clinical"
  | "feverish"
  | "hushed"
  | "ceremonial";

export const BEAT_TEMPLATE_TONE_FITS: BeatTemplateToneFit[] = [
  "intimate",
  "tender",
  "tense",
  "comic",
  "bleak",
  "wry",
  "reverent",
  "clinical",
  "feverish",
  "hushed",
  "ceremonial",
];

export type BeatTemplateRelationshipAxis =
  | "trust"
  | "fear"
  | "attraction"
  | "power"
  | "respect"
  | "familiarity";

export const BEAT_TEMPLATE_RELATIONSHIP_AXES: BeatTemplateRelationshipAxis[] = [
  "trust",
  "fear",
  "attraction",
  "power",
  "respect",
  "familiarity",
];

export type BeatTemplateBeatFunction =
  | "setup"
  | "pressure"
  | "turn"
  | "exit"
  | "aftermath";

export const BEAT_TEMPLATE_BEAT_FUNCTIONS: BeatTemplateBeatFunction[] = [
  "setup",
  "pressure",
  "turn",
  "exit",
  "aftermath",
];

export interface BeatTemplateClassification {
  move_family: BeatTemplateMoveFamily;
  tags: string[];
  intensity: ManualStoryContentIntensity;
  tone_fit: BeatTemplateToneFit[];
}

export interface BeatTemplateRoleSlot {
  compatible_roles: ManualStoryRole[];
}

export interface BeatTemplateRequires {
  record_classes_any: string[];
  record_tags_any: string[];
  relationship_axes_any: BeatTemplateRelationshipAxis[];
  location_tags_any: string[];
}

export interface BeatTemplateExcludes {
  record_tags_any: string[];
  forbidden_if_secret_tags: string[];
}

export interface BeatTemplateBeat {
  function: BeatTemplateBeatFunction;
  instruction: string;
}

export interface BeatTemplate {
  id: string;
  title: string;
  active: boolean;
  pressure_type: BeatTemplatePressureType;
  turn_type: BeatTemplateTurnType;
  preconditions_text: string;
  do_not_resolve: string[];
  expected_state_review: ManualRecordClass[];
  stop_after: string;
  anti_patterns: string[];
  classification: BeatTemplateClassification;
  role_slots: Record<string, BeatTemplateRoleSlot>;
  requires: BeatTemplateRequires;
  excludes: BeatTemplateExcludes;
  beat_guidance: BeatTemplateBeat[];
  forbidden_inventions: string[];
  author_notes: string;
}

export interface BeatTemplateCandidateAdvisoryFlags {
  recently_used: boolean;
  recently_used_at_segment?: string;
}

export interface BeatTemplateCandidate {
  template: BeatTemplate;
  why_suggested: string[];
  advisory_flags: BeatTemplateCandidateAdvisoryFlags;
}

export interface CandidateRequestBody {
  moment_directive: string;
  selected_cast: string[];
  optional_move_family?: BeatTemplateMoveFamily;
  optional_desired_pressure_type?: BeatTemplatePressureType;
  optional_tags?: string[];
  optional_location?: string;
}
