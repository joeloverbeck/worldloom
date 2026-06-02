// Per-candidate `why_suggested` trace assembly. Pure function over the
// filter's per-template match intermediate state. Produces at most 4
// human-readable lines, prioritized by informativeness so a card
// renderer can show the most useful matches first without truncation
// surprises. Consumed by filter.ts (ticket 005); rendered by
// BeatTemplateCandidates.tsx (ticket 012).

import type {
  BeatTemplate,
  BeatTemplatePressureType,
  BeatTemplateRelationshipAxis,
  BeatTemplateToneFit,
} from "../schema/beat-template.js";

export interface WhySuggestedMatches {
  tagOverlap: string[];
  roleSlotFit: string[];
  locationMatch: string[];
  relationshipAxesMatch: BeatTemplateRelationshipAxis[];
  requiredClassesPresent: string[];
  intensityFit: boolean;
  intensityValue?: string;
  pressureTypeMatch: boolean;
  pressureTypeValue?: BeatTemplatePressureType;
  toneFitOverlap: BeatTemplateToneFit[];
}

export interface AssembleWhySuggestedInput {
  template: BeatTemplate;
  matches: WhySuggestedMatches;
}

const MAX_LINES = 4;

// Priority order matches the spec §2.3 informativeness ranking:
// tag overlap > role-slot fit > location match > relationship axes >
// required classes > desired pressure type > intensity > tone fit.
export function assembleWhySuggested(input: AssembleWhySuggestedInput): string[] {
  const { matches } = input;
  const lines: string[] = [];

  if (matches.tagOverlap.length > 0) {
    lines.push(matches.tagOverlap.join(" + "));
  }
  if (matches.roleSlotFit.length > 0) {
    lines.push(`selected cast fits ${matches.roleSlotFit.join("/")}`);
  }
  if (matches.locationMatch.length > 0) {
    lines.push(`location: ${matches.locationMatch.join(", ")}`);
  }
  if (matches.relationshipAxesMatch.length > 0) {
    lines.push(`axes: ${matches.relationshipAxesMatch.join(", ")}`);
  }
  if (matches.requiredClassesPresent.length > 0) {
    lines.push(`requires: ${matches.requiredClassesPresent.join(", ")}`);
  }
  if (matches.pressureTypeMatch && matches.pressureTypeValue) {
    lines.push(`pressure: ${matches.pressureTypeValue}`);
  }
  if (matches.intensityFit && matches.intensityValue) {
    lines.push(`intensity: ${matches.intensityValue}`);
  }
  if (matches.toneFitOverlap.length > 0) {
    lines.push(`tone: ${matches.toneFitOverlap.join(", ")}`);
  }

  return lines.slice(0, MAX_LINES);
}
