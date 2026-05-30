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
}

export interface ManualStoryManuscriptPolicy {
  compile_on_segment_save: boolean;
  include_segment_titles: boolean;
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
};

export interface ManualRecordSummary {
  id: string;
  title: string;
  active: boolean;
  importance: RecordImportance;
  tags: string[];
  summary: string;
  prompt_visibility: PromptVisibility;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface RefViolation {
  field: string;
  missingId: string;
  recordId: string;
  recordClass: ManualRecordClass;
}

export type ManualRecord = RecordCommonFields & Record<string, unknown>;
