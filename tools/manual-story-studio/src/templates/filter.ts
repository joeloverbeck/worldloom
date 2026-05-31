// 9-stage deterministic beat-template filter pipeline. Composes
// `computeRecentUseMap` (recent-use.ts) and `assembleWhySuggested`
// (why-suggested.ts) over the user-supplied composer inputs and the
// per-manual-story beat template library. Same inputs → same ordered
// candidate output (byte-identical). Stage ordering matches SPEC-104
// §2.2; reordering requires explicit spec amendment.

import type {
  BeatTemplate,
  BeatTemplateMoveFamily,
  BeatTemplateRelationshipAxis,
} from "../schema/beat-template.js";
import type {
  ManualCharacterProfile,
  ManualRecordSummary,
  ManualSecretRecord,
  ManualStoryContract,
  ManualStoryPromptPolicy,
} from "../schema/manual-story.js";
import { computeRecentUseMap } from "./recent-use.js";
import {
  assembleWhySuggested,
  type WhySuggestedMatches,
} from "./why-suggested.js";

const INTENSITY_RANK = { general: 0, mature: 1, explicit: 2 } as const;

export interface FilterRecordEntry {
  id: string;
  recordClass: string;
  tags: string[];
}

export interface FilterLocationEntry {
  id: string;
  tags: string[];
}

export interface FilterSecretEntry {
  id: string;
  forbidden_reveal_tags: string[];
}

export interface FilterOptionalPins {
  moveFamily?: BeatTemplateMoveFamily;
  tags?: string[];
  location?: string;
}

export interface FilterInput {
  manualStoryRoot: string;
  storyContract: ManualStoryContract;
  promptPolicy: ManualStoryPromptPolicy;
  selectedCast: ManualCharacterProfile[];
  activeRecords: FilterRecordEntry[];
  activeSecrets: FilterSecretEntry[];
  activeLocations: FilterLocationEntry[];
  segmentOrder: string[];
  optionalAuthorPins: FilterOptionalPins;
  allTemplates: BeatTemplate[];
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

interface StageMatchState {
  template: BeatTemplate;
  matches: WhySuggestedMatches;
  roleFitCount: number;
}

function intersect<T>(a: T[], b: Iterable<T>): T[] {
  const bSet = new Set(b);
  return a.filter((x) => bSet.has(x));
}

function any<T>(a: T[], b: T[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const bSet = new Set(b);
  return a.some((x) => bSet.has(x));
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function rankIntensity(value: string): number {
  return (INTENSITY_RANK as Record<string, number>)[value] ?? 0;
}

// Build per-template match intermediate state for stages 4-6 plus the
// stage-2 intensity fit, used by both stage 9 sort and the why-suggested
// trace. The state is built fresh per template (no shared mutation).
function buildMatchState(
  template: BeatTemplate,
  input: FilterInput,
): StageMatchState {
  const activeRecordsByClass = new Map<string, FilterRecordEntry[]>();
  for (const rec of input.activeRecords) {
    const list = activeRecordsByClass.get(rec.recordClass) ?? [];
    list.push(rec);
    activeRecordsByClass.set(rec.recordClass, list);
  }
  const allActiveTags = new Set<string>();
  for (const rec of input.activeRecords) {
    for (const tag of rec.tags) allActiveTags.add(tag);
  }

  // Stage 3 — role-slot fit count
  let roleFitCount = 0;
  const roleSlotFit: string[] = [];
  for (const [slotName, slot] of Object.entries(template.role_slots)) {
    const allowed = new Set(slot.compatible_roles);
    const anyCastFits = input.selectedCast.some((c) =>
      c.roles.some((r) => allowed.has(r)),
    );
    if (anyCastFits) {
      roleFitCount += 1;
      roleSlotFit.push(slotName);
    }
  }

  // Stage 4 — required record classes (`_any`: at least one present)
  const requiredClassesPresent: string[] = [];
  for (const cls of template.requires.record_classes_any) {
    const present = (activeRecordsByClass.get(cls) ?? []).length > 0;
    if (present) requiredClassesPresent.push(cls);
  }

  // Stage 5 — required tags (`_any`: at least one active record carries any)
  const tagOverlap = template.requires.record_tags_any.filter((tag) =>
    allActiveTags.has(tag),
  );

  // Stage 6 — location compatibility
  const locationMatch: string[] = [];
  if (template.requires.location_tags_any.length > 0) {
    const locId = input.optionalAuthorPins.location;
    if (locId) {
      const loc = input.activeLocations.find((l) => l.id === locId);
      if (loc) {
        for (const t of intersect(template.requires.location_tags_any, loc.tags)) {
          locationMatch.push(t);
        }
      }
    }
  }

  // Stage 6b — tone-fit overlap with story-contract tone (case-insensitive
  // substring containment per spec §3 key decision)
  const tone = (input.storyContract.tone ?? "").toLowerCase();
  const toneFitOverlap: WhySuggestedMatches["toneFitOverlap"] = [];
  if (tone.length > 0) {
    for (const tf of template.classification.tone_fit) {
      if (tone.includes(tf.toLowerCase())) toneFitOverlap.push(tf);
    }
  }

  // Stage 2 — intensity fit (ordered enum: general < mature < explicit)
  const intensityFit =
    rankIntensity(template.classification.intensity) <=
    rankIntensity(input.storyContract.content_intensity);

  // Relationship axes — informational for the trace; spec §2.2 stage 6
  // covers location/tone explicitly. relationship_axes_any does not have
  // its own gate stage; surface as trace dimension only when the template
  // declares any axis (interpretation: matched iff at least one axis is
  // declared and the cast contains ≥2 members so axis-style records are
  // meaningful — kept lightweight per spec §3 key decision).
  const relationshipAxesMatch: BeatTemplateRelationshipAxis[] =
    template.requires.relationship_axes_any.length > 0 &&
    input.selectedCast.length >= 2
      ? [...template.requires.relationship_axes_any]
      : [];

  return {
    template,
    roleFitCount,
    matches: {
      tagOverlap,
      roleSlotFit,
      locationMatch,
      relationshipAxesMatch,
      requiredClassesPresent,
      intensityFit,
      intensityValue: template.classification.intensity,
      toneFitOverlap,
    },
  };
}

export function filterBeatTemplates(input: FilterInput): BeatTemplateCandidate[] {
  const allActiveTagsByRecord = input.activeRecords.flatMap((r) => r.tags);
  const allActiveTagsSet = new Set(allActiveTagsByRecord);

  // Stage 1 — active templates only
  let pool: BeatTemplate[] = input.allTemplates.filter((t) => t.active);

  // Stage 2 — content-intensity compatibility
  pool = pool.filter(
    (t) =>
      rankIntensity(t.classification.intensity) <=
      rankIntensity(input.storyContract.content_intensity),
  );

  // Stage 3 — role-slot satisfiability: every slot must have ≥1 matching cast
  pool = pool.filter((t) => {
    const slotKeys = Object.keys(t.role_slots);
    if (slotKeys.length === 0) return true;
    return slotKeys.every((slotName) => {
      const allowed = new Set(t.role_slots[slotName]!.compatible_roles);
      return input.selectedCast.some((c) =>
        c.roles.some((r) => allowed.has(r)),
      );
    });
  });

  // Stage 4 — required record classes present (`_any` semantics)
  const activeClassSet = new Set(input.activeRecords.map((r) => r.recordClass));
  pool = pool.filter((t) => {
    const list = t.requires.record_classes_any;
    if (list.length === 0) return true;
    return list.some((cls) => activeClassSet.has(cls));
  });

  // Stage 5 — required tags present (`_any` semantics)
  pool = pool.filter((t) => {
    const list = t.requires.record_tags_any;
    if (list.length === 0) return true;
    return list.some((tag) => allActiveTagsSet.has(tag));
  });

  // Stage 6 — location/tone compatibility
  pool = pool.filter((t) => {
    const list = t.requires.location_tags_any;
    if (list.length === 0) return true;
    const locId = input.optionalAuthorPins.location;
    if (!locId) return false;
    const loc = input.activeLocations.find((l) => l.id === locId);
    if (!loc) return false;
    return any(list, loc.tags);
  });

  // Stage 7 — forbidden-secret / forbidden-reveal compatibility
  pool = pool.filter((t) => {
    if (
      t.excludes.forbidden_if_secret_tags.length > 0 &&
      input.activeSecrets.some((s) =>
        any(t.excludes.forbidden_if_secret_tags, s.forbidden_reveal_tags),
      )
    ) {
      return false;
    }
    if (
      t.excludes.record_tags_any.length > 0 &&
      input.activeRecords.some((r) =>
        any(t.excludes.record_tags_any, r.tags),
      )
    ) {
      return false;
    }
    return true;
  });

  // Stage 8 — recent-use advisory (does NOT exclude)
  const recentUse = computeRecentUseMap({
    manualStoryRoot: input.manualStoryRoot,
    segmentOrder: input.segmentOrder,
    recentWindow: input.promptPolicy.recent_template_advisory_window,
  });

  // Build per-survivor match state (for stage 9 sort + why-suggested)
  const states: StageMatchState[] = pool.map((t) => buildMatchState(t, input));

  // Stage 9 — sort
  const pinnedTags = new Set<string>([
    ...(input.optionalAuthorPins.tags ?? []),
  ]);
  states.sort((a, b) => {
    // (a) author explicit pin first — pinned move_family ranks highest
    const aPinned =
      input.optionalAuthorPins.moveFamily &&
      input.optionalAuthorPins.moveFamily ===
        a.template.classification.move_family;
    const bPinned =
      input.optionalAuthorPins.moveFamily &&
      input.optionalAuthorPins.moveFamily ===
        b.template.classification.move_family;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    // (b) tag overlap with author-pinned tags ∪ requires.record_tags_any
    const aTagScore =
      a.matches.tagOverlap.length +
      a.template.classification.tags.filter((t) => pinnedTags.has(t)).length;
    const bTagScore =
      b.matches.tagOverlap.length +
      b.template.classification.tags.filter((t) => pinnedTags.has(t)).length;
    if (aTagScore !== bTagScore) return bTagScore - aTagScore;

    // (c) role-fit count
    if (a.roleFitCount !== b.roleFitCount) return b.roleFitCount - a.roleFitCount;

    // (d) tone-fit overlap
    if (a.matches.toneFitOverlap.length !== b.matches.toneFitOverlap.length) {
      return b.matches.toneFitOverlap.length - a.matches.toneFitOverlap.length;
    }

    // (e) recent-use advisory (deprioritize recently-used)
    const aRecent = recentUse.recentTemplates.has(a.template.id) ? 1 : 0;
    const bRecent = recentUse.recentTemplates.has(b.template.id) ? 1 : 0;
    if (aRecent !== bRecent) return aRecent - bRecent;

    // (f) title alphabetical
    return compareStrings(a.template.title, b.template.title);
  });

  return states.map((s) => {
    const recentlyUsedAt = recentUse.recentTemplates.get(s.template.id);
    const flags: BeatTemplateCandidateAdvisoryFlags = {
      recently_used: recentlyUsedAt !== undefined,
    };
    if (recentlyUsedAt !== undefined) {
      flags.recently_used_at_segment = recentlyUsedAt;
    }
    return {
      template: s.template,
      why_suggested: assembleWhySuggested({
        template: s.template,
        matches: s.matches,
      }),
      advisory_flags: flags,
    };
  });
}

// Helper used by routes (ticket 006) to project the active record list
// from the read-layer ManualRecordSummary plus the per-class context.
export function toFilterRecordEntries(
  records: Array<{ summary: ManualRecordSummary; recordClass: string }>,
): FilterRecordEntry[] {
  return records.map((r) => ({
    id: r.summary.id,
    recordClass: r.recordClass,
    tags: [...r.summary.tags],
  }));
}

export function toFilterSecretEntries(
  records: ManualSecretRecord[],
): FilterSecretEntry[] {
  return records.map((s) => ({
    id: s.id,
    forbidden_reveal_tags: [...(s.forbidden_reveal_tags ?? [])],
  }));
}
