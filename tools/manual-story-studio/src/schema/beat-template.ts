// Manual Beat Template schema — closed enums, nested role_slots / requires /
// excludes blocks, and 1-5 beat_guidance entries. Re-uses ManualStoryRole and
// ManualStoryContentIntensity from manual-story.ts as the single source of
// truth for the cast role enum and the story-contract content-intensity enum.

import type {
  ManualStoryContentIntensity,
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
  classification: BeatTemplateClassification;
  role_slots: Record<string, BeatTemplateRoleSlot>;
  requires: BeatTemplateRequires;
  excludes: BeatTemplateExcludes;
  beat_guidance: BeatTemplateBeat[];
  forbidden_inventions: string[];
  author_notes: string;
}

export const BEAT_TEMPLATE_ID_PATTERN = /^mtemplate-\d+$/;
