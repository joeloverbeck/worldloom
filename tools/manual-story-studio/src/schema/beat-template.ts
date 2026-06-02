// Manual Beat Template schema — closed enums, nested role_slots / requires /
// excludes blocks, and 1-5 beat_guidance entries. Re-uses ManualStoryRole and
// ManualStoryContentIntensity from manual-story.ts as the single source of
// truth for the cast role enum and the story-contract content-intensity enum.

import type {
  ManualStoryContentIntensity,
  ManualRecordClass,
  ManualStoryRole,
} from "./manual-story.js";

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

export const BEAT_TEMPLATE_MOVE_FAMILIES: readonly BeatTemplateMoveFamily[] = [
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
] as const;

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

export const BEAT_TEMPLATE_PRESSURE_TYPES: readonly BeatTemplatePressureType[] = [
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
] as const;

// `reversal_turn` and `discovery_turn` intentionally disambiguate these
// turn-type values from the same-named pressure-type values.
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

export const BEAT_TEMPLATE_TURN_TYPES: readonly BeatTemplateTurnType[] = [
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
] as const;

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

export const BEAT_TEMPLATE_TONE_FITS: readonly BeatTemplateToneFit[] = [
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
] as const;

export type BeatTemplateRelationshipAxis =
  | "trust"
  | "fear"
  | "attraction"
  | "power"
  | "respect"
  | "familiarity";

export const BEAT_TEMPLATE_RELATIONSHIP_AXES: readonly BeatTemplateRelationshipAxis[] = [
  "trust",
  "fear",
  "attraction",
  "power",
  "respect",
  "familiarity",
] as const;

export type BeatTemplateBeatFunction =
  | "setup"
  | "pressure"
  | "turn"
  | "exit"
  | "aftermath";

export const BEAT_TEMPLATE_BEAT_FUNCTIONS: readonly BeatTemplateBeatFunction[] = [
  "setup",
  "pressure",
  "turn",
  "exit",
  "aftermath",
] as const;

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

export const BEAT_TEMPLATE_ID_PATTERN = /^mtemplate-\d+$/;
