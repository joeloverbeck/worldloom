# SPEC104BEATEMDET-004: why-suggested.ts: trace assembly for filter candidates

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new module `tools/manual-story-studio/src/templates/why-suggested.ts` (pure function over filter intermediate state)
**Deps**: 002

## Problem

SPEC-104 §2.3 introduces the `why_suggested` trace: per-candidate human-readable lines explaining why each beat-template appears in the filtered output ("relationship + hurt + guarded truth", "selected cast fits initiator/guarded_other", "location: park"). The trace is rendered on each candidate card per §2.5 and the lines are capped at 4 per template to keep cards readable. The trace is computed deterministically at filter time and rendered by the frontend `BeatTemplateCandidates.tsx` (ticket 012) per template.

## Assumption Reassessment (2026-05-31)

1. Codebase: ticket 002 defines `BeatTemplate` + `BeatTemplateClassification` + `BeatTemplateRoleSlot` + `BeatTemplateRequires` + `BeatTemplateExcludes` TypeScript types in `tools/manual-story-studio/src/schema/beat-template.ts`. The pure-function pattern for filter-stage helpers is established by the existing `tools/manual-story-studio/src/prompt/translators/index.ts` (per SPEC-102 §3 key decision: per-class translators are pure functions of record → prose fragment); this ticket's `why-suggested.ts` follows the same pattern at one layer deeper (pure function of filter-match → prose fragment list).
2. Spec: SPEC-104 §2.3 declares the trace as "String array of human-readable reasons" with examples (`"relationship + hurt + guarded truth"` for tag overlap, `"selected cast fits initiator/guarded_other"` for role-slot match, `"location: park"` for location-tag match); §2.3 mandates "One line per matched filter dimension; capped at 4 lines per template to keep cards readable"; §2.5 declares the cards display the trace lines per template.
3. Cross-skill boundary: this function takes a `BeatTemplate` (ticket 002's type) plus filter intermediate state (tag/role/location/relationship-axes match data) and returns `string[]`. It is consumed by `filter.ts` (ticket 005); the trace is then rendered by the candidate cards UI (ticket 012). No write side; no I/O — pure function over in-memory state.

## Architecture Check

1. Pure function with deterministic output preserves the spec §Tooling Recommendation alignment ("Filter is deterministic and traceable — same inputs → same candidate order with same `why_suggested` lines"). The 4-line cap is enforced at the function boundary, not at the frontend, so a future renderer cannot accidentally exceed it. Alternative considered and rejected: computing trace lines inside `filter.ts` directly (inline) — rejected because it would couple the filter pipeline's correctness tests to the trace's prose formatting, making either independently testable.
2. No backwards-compatibility aliasing or shims introduced. Greenfield pure-function module.

## Verification Layers

1. Trace lines correctly identify matched dimensions for fixture input → targeted test against a fixture template + filter intermediate state asserting expected trace lines (per the spec §2.3 examples).
2. 4-line cap enforced at the function boundary → targeted test against a fixture template that would produce 6+ trace lines; output asserts exactly 4 lines (the most informative 4 per the documented prioritization order).
3. Determinism: same inputs → same output → targeted test runs the function twice on the same fixture and asserts byte-identical return.
4. Empty-match case: when no filter dimensions matched, the trace returns an empty array (the candidate would not be included in the filter output anyway, but the function handles the edge case gracefully).

## What to Change

### 1. Create `tools/manual-story-studio/src/templates/why-suggested.ts`

Export a pure function:

```
assembleWhySuggested(input: {
  template: BeatTemplate;
  matches: {
    tagOverlap: string[];          // matched tags from requires.record_tags_any
    roleSlotFit: string[];         // matched role-slot names whose compatible_roles intersected selected cast
    locationMatch: string[];       // matched location tags from requires.location_tags_any
    relationshipAxesMatch: BeatTemplateRelationshipAxis[];
    requiredClassesPresent: string[];  // matched classes from requires.record_classes_any
    intensityFit: boolean;          // story-contract intensity matches template intensity
    toneFitOverlap: BeatTemplateToneFit[];  // story-contract tone overlaps template tone_fit
  };
}): string[]
```

Behavior:
- Produce one line per matched dimension that fired, formatted per the spec §2.3 examples.
- Prioritize lines by informativeness (suggested order: tag overlap > role-slot fit > location match > relationship axes > required classes > intensity > tone fit) for the cap decision.
- Cap output at 4 lines (the top 4 by priority).
- Return empty array if no dimensions matched.

### 2. Suggested line format per dimension

- Tag overlap: `<tag1> + <tag2> + <tag3>` (matched tags joined with ` + `).
- Role-slot fit: `selected cast fits <slot1>/<slot2>` (matched role-slot names joined with `/`).
- Location match: `location: <tag1>, <tag2>` (matched location tags joined with `, `).
- Relationship axes: `axes: <axis1>, <axis2>` (matched axis names joined with `, `).
- Required classes: `requires: <class1>, <class2>` (matched class names joined with `, `).
- Intensity fit: `intensity: <intensity>` (the matched intensity value).
- Tone fit overlap: `tone: <tone1>, <tone2>` (matched tone values joined with `, `).

## Files to Touch

- `tools/manual-story-studio/src/templates/why-suggested.ts` (new)
- `tools/manual-story-studio/test/templates/why-suggested.test.ts` (new)

## Out of Scope

- The filter pipeline that produces the `matches` intermediate state — ticket 005.
- The frontend candidate card that renders the trace lines — ticket 012.
- The schema types — ticket 002.

## Acceptance Criteria

### Tests That Must Pass

1. `assembleWhySuggested` against a fixture with all 7 dimensions matched returns 4 lines (the top 4 by priority).
2. `assembleWhySuggested` against a fixture with only tag overlap + role-slot fit returns 2 lines in the documented priority order (tag-overlap line first).
3. `assembleWhySuggested` against a fixture with no matches returns an empty array.
4. `assembleWhySuggested` is deterministic — same inputs called twice return byte-identical arrays.
5. The 4-line cap is hard: a fixture that triggers 7 matches returns exactly 4 lines (the lowest-priority 3 are dropped).

### Invariants

1. Output is at most 4 lines per template.
2. Line ordering is deterministic (priority-based) — not dependent on object enumeration order.
3. Pure function — no I/O, no mutation of inputs.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/why-suggested.test.ts` (new) — covers each acceptance criterion using fixture `BeatTemplate` + `matches` intermediate-state objects.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/templates/why-suggested.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because the function is a pure transform over in-memory state; filter integration is covered by ticket 005's tests.
