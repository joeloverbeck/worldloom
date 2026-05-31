# SPEC104BEATEMDET-005: filter.ts — 9-stage deterministic beat-template filter pipeline

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new module `tools/manual-story-studio/src/templates/filter.ts` (composes recent-use + why-suggested; runs 9 ordered filter stages)
**Deps**: 002, 003, 004

## Problem

SPEC-104 §2.2 defines the deterministic 9-stage filter pipeline that takes (current manual story metadata, selected cast, active records, moment directive, optional move_family/tags/location, all beat templates) and returns an ordered list of `{template, why_suggested, advisory_flags}` objects. The filter is the heart of the candidate-card surface — without it, the §2.5 candidate cards have nothing to render. Per the spec §3 key decision, the filter borrows the staging discipline from `select-storylet-candidates` without the engine-grade machinery (no predicate DSL, no scope/visibility branching, no saliency-as-stored-field, no cooldown mechanism); recent-use is computed at filter time from segment sidecars (ticket 003's pure function) rather than stored on the template.

## Assumption Reassessment (2026-05-31)

1. Codebase: ticket 002 lands `BeatTemplate` + the closed-enum types (`BeatTemplateMoveFamily`, `BeatTemplateToneFit`, `BeatTemplateRelationshipAxis`); ticket 003 lands `computeRecentUseMap`; ticket 004 lands `assembleWhySuggested`. The existing `tools/manual-story-studio/src/schema/manual-story.ts` carries `ManualStoryRole`, `ManualStoryContentIntensity`, and `RecordRefs` / `RecordCommonFields` (lines 119, 14, 139-160) that the filter consumes for cast/role/record evaluation. The existing manual-record YAML reader (per SPEC-101 §4) reads `records/<class>/<id>.yaml` files and parses common-field shapes; the filter consumes that read surface.
2. Spec: SPEC-104 §2.2 enumerates 9 ordered stages: (1) Active templates only, (2) Content-intensity compatibility, (3) Role-slot satisfiability, (4) Required record classes present, (5) Required tags present, (6) Location/tone compatibility, (7) Forbidden-secret / forbidden-reveal compatibility, (8) Recent-use advisory, (9) Sort by explicit pin, tag overlap, role fit, tone-fit overlap, recent-use deprioritization, title alphabetical. §3 key decisions enforce the `_any` filter semantics (OR within a stage, AND across stages); the recent-use advisory is NOT a hard block (stage 8 surfaces it as an advisory flag, never excluding the candidate).
3. Cross-skill boundary: the filter composes `computeRecentUseMap` (ticket 003) at stage 8 and `assembleWhySuggested` (ticket 004) for each surviving candidate; the output `{template, why_suggested, advisory_flags}` shape is consumed by `routes/beat-templates.ts POST .../moment-composer/template-candidates` (ticket 006) and ultimately rendered by `BeatTemplateCandidates.tsx` (ticket 012). The filter reads active records, cast members, secrets, locations, and the story contract — all existing SPEC-101 schema surfaces (no new reads added; the filter is a pure composition over the typed input).

## Architecture Check

1. Staged deterministic filtering preserves the spec's §Tooling Recommendation alignment ("Filter is deterministic and traceable — same inputs → same candidate order with same `why_suggested` lines"). Each stage is a pure transformation on the candidate set; stage ordering is fixed (cannot reorder without explicit spec amendment per §8 Risks). Alternative considered and rejected: a single-pass scoring function combining all 9 dimensions into a numeric rank — rejected because it would hide which dimension drove a template's inclusion/exclusion (the spec's §2.3 `why_suggested` trace requires per-dimension visibility), and the spec's §3 key decision explicitly mandates the staged shape from `select-storylet-candidates` precedent.
2. No backwards-compatibility aliasing or shims introduced. Greenfield module; consumes only typed inputs from tickets 002/003/004 and the existing SPEC-101 schema surfaces.

## Verification Layers

1. Each of the 9 stages applies its filter correctly → targeted tests per stage (fixture template excluded at stage N has the expected stage-N reason).
2. `_any` semantics within a stage: OR within a stage (e.g., `requires.record_classes_any: ["beliefs", "emotions"]` is satisfied when either class has active records) → targeted test per stage with `_any` fields.
3. AND across stages: a template passing stages 1-7 but failing stage 4 is excluded (one stage failure → exclusion) → targeted test composing stage failures.
4. Stage 8 is advisory-only: a recently-used template is NOT excluded; it gets an advisory flag and may rank lower at stage 9 → targeted test asserting the recently-used template appears in output with `advisory_flags` populated.
5. Stage 9 sort determinism: same inputs → same candidate order across runs → targeted test asserting byte-identical ordered candidate output across two invocations.
6. Fixture coverage: at least 5 distinct input scenarios produce expected candidate orderings (per §6 acceptance criterion 4): (a) typical case with multiple matching templates; (b) empty input (no active records) → empty output; (c) all templates excluded at stage 7 (forbidden-secret violations) → empty output; (d) recent-use advisory surfaces on the top-ranked template; (e) author explicit pin overrides everything at stage 9.

## What to Change

### 1. Create `tools/manual-story-studio/src/templates/filter.ts`

Export the main filter function:

```
filterBeatTemplates(input: {
  manualStoryRoot: string;
  storyContract: ManualStoryContract;       // existing SPEC-101 schema
  promptPolicy: ManualStoryPromptPolicy;    // includes recent_template_advisory_window (ticket 001)
  selectedCast: ManualCharacterProfile[];   // existing SPEC-101 schema
  activeRecords: ManualRecordSummary[];     // existing SPEC-101 schema; class + tags + key fields
  momentDirective: string;
  optionalAuthorPins: {
    moveFamily?: BeatTemplateMoveFamily;
    tags?: string[];
    location?: string;  // mloc-<integer>
  };
  allTemplates: BeatTemplate[];              // typed per ticket 002
  segmentOrder: string[];                    // for ticket 003's recent-use scan
}): Array<{
  template: BeatTemplate;
  why_suggested: string[];                   // from ticket 004
  advisory_flags: { recently_used: boolean; recently_used_at_segment?: string };
}>
```

### 2. Stage implementations (per spec §2.2)

- **Stage 1 — Active templates only**: filter to `template.active === true`.
- **Stage 2 — Content-intensity compatibility**: filter to templates whose `classification.intensity` ≤ `storyContract.content_intensity` (ordered enum `general < mature < explicit`).
- **Stage 3 — Role-slot satisfiability**: for each template, verify every key in `role_slots` has at least one cast member in `selectedCast` whose `roles[]` intersects `compatible_roles`. Templates failing this stage are excluded.
- **Stage 4 — Required record classes present**: filter to templates where every class in `requires.record_classes_any` (with `_any` OR semantics — at least one of the listed classes has an active record).
- **Stage 5 — Required tags present**: filter to templates where any active record carries any tag in `requires.record_tags_any`.
- **Stage 6 — Location / tone compatibility**: when `requires.location_tags_any` is non-empty, the optional `optionalAuthorPins.location` (an `mloc-<integer>` ID) must resolve to a `mloc` record whose `tags[]` intersects `requires.location_tags_any`. The `storyContract.tone` (free-form string) does NOT block here; it contributes to stage 9 sort via the tone-fit overlap heuristic (case-insensitive substring containment against `classification.tone_fit[]`).
- **Stage 7 — Forbidden-secret / forbidden-reveal compatibility**: exclude templates whose `excludes.forbidden_if_secret_tags` overlaps any active secret's `forbidden_reveal_tags`; exclude templates whose `excludes.record_tags_any` overlaps any active record's tags.
- **Stage 8 — Recent-use advisory**: call `computeRecentUseMap(...)` (ticket 003) using `promptPolicy.recent_template_advisory_window`; for each surviving candidate, set `advisory_flags.recently_used = recentUseMap.has(template.id)` and populate `advisory_flags.recently_used_at_segment`. Stage 8 does NOT exclude candidates.
- **Stage 9 — Sort**: order by: (a) author explicit pin first (when `optionalAuthorPins.moveFamily` matches `template.classification.move_family`, that template ranks first); (b) tag overlap with `optionalAuthorPins.tags ∪ requires.record_tags_any`; (c) role-fit count (how many `role_slots` keys had at least one matching cast member); (d) tone-fit overlap with `storyContract.tone` via case-insensitive substring containment; (e) recent-use advisory (deprioritize recently-used); (f) title alphabetical as tiebreak.

### 3. Per-candidate `why_suggested` assembly

For each candidate surviving stages 1-7, build the `matches` intermediate state (which dimensions matched) and call `assembleWhySuggested(template, matches)` (ticket 004) to produce the trace lines.

### 4. Test fixture coverage

`tools/manual-story-studio/test/templates/filter.test.ts` provides at least 5 distinct test scenarios per §6 acceptance criterion 4, each with fixture manual-story metadata + cast + records + templates + expected ordered candidate output. Determinism is asserted via a per-scenario double-call check (call filter twice on same input; assert byte-identical output).

## Files to Touch

- `tools/manual-story-studio/src/templates/filter.ts` (new)
- `tools/manual-story-studio/test/templates/filter.test.ts` (new)

## Out of Scope

- The frontend candidate cards UI that renders the filter output — ticket 012.
- The HTTP route that exposes the filter — ticket 006.
- The recent-use computation itself — ticket 003.
- The why-suggested trace assembly itself — ticket 004.
- The beat-template CRUD that produces the templates the filter reads — ticket 006.

## Acceptance Criteria

### Tests That Must Pass

1. `filterBeatTemplates` against a fixture with 5 templates + matching cast + matching records returns the expected ordered candidate list (per scenario A — typical case).
2. `filterBeatTemplates` against a fixture with no active records returns an empty array (no candidates can pass stage 4).
3. `filterBeatTemplates` against a fixture where every template hits a forbidden-secret violation at stage 7 returns an empty array.
4. `filterBeatTemplates` against a fixture with one recently-used template returns the template in the output with `advisory_flags.recently_used: true` and the correct `recently_used_at_segment` value.
5. `filterBeatTemplates` against a fixture with `optionalAuthorPins.moveFamily` set returns the matching template ranked first at stage 9.
6. Determinism: each of the 5 scenarios above produces byte-identical output on two consecutive calls with the same input.
7. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/templates/filter.test.js"` succeeds.

### Invariants

1. The 9 stages execute in fixed order; reordering requires an explicit spec amendment (per §8 Risks).
2. `_any` semantics: OR within a stage (the `_any` suffix); AND across stages (one stage failure excludes the candidate).
3. Stage 8 (recent-use) is advisory-only: it never excludes a candidate, only sets `advisory_flags.recently_used`.
4. Stage 9 sort is deterministic: same input → same output, byte-identical.
5. Output shape is `Array<{template, why_suggested, advisory_flags}>` — consumed by ticket 006's routes layer unchanged.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/filter.test.ts` (new) — 5 distinct scenarios + per-scenario determinism check (10+ test cases total). Fixtures live under `test/fixtures/filter/`.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/templates/filter.test.js"` (targeted verification).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification).
3. The targeted command above is the correct verification boundary because the filter is a pure function over typed inputs; HTTP-route integration is exercised by ticket 006's tests, and end-to-end frontend integration is exercised by ticket 014's capstone.
