# SPEC110MANSTOSTU-001: Backend schema — pressure/turn enums + 7 required BeatTemplate fields + backend fixture migration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` schema (`src/schema/beat-template.ts`) + 9 backend test-fixture files
**Deps**: None

## Problem

`BeatTemplate` is rich on classification/constraint axes but thin on pressure semantics. SPEC-110 §2 items 1-3 add two closed enums (`BeatTemplatePressureType`, `BeatTemplateTurnType`) and 7 author-facing fields (`pressure_type`, `turn_type`, `preconditions_text`, `do_not_resolve`, `expected_state_review`, `stop_after`, `anti_patterns`). The fields are **required** at the schema level, so every inline `BeatTemplate` literal across the backend test suite must be migrated. Per SPEC-110 §2 item 5 / §8, there is no on-disk beat-template YAML anywhere in the repo, so there is no migration script — the inline TS fixtures are the entire migration surface.

## Assumption Reassessment (2026-06-02)

1. `src/schema/beat-template.ts:137-148` defines the `BeatTemplate` interface (verified). `MANUAL_RECORD_CLASSES` at `src/schema/manual-story.ts:204` includes `beat-templates`. Nine backend test files build inline `BeatTemplate` literals (verified by `grep -rln move_family: test/`): `test/templates/{beat-template-schema,filter,why-suggested}.test.ts`, `test/prompt/{beat-template-lint,section-6-template-guidance}.test.ts`, `test/server/{beat-templates-routes,prompts-routes}.test.ts`, `test/validate/schema.test.ts`, `test/capstone-spec104.test.ts` — all fail `tsc` (`build:backend`) when the 7 fields become required.
2. SPEC-110 §2 items 1, 2, 3, 5; §3 key decisions (closed enums; `reversal_turn`/`discovery_turn` rename for type-system clarity; all 7 fields required); §8 (no on-disk YAML; inline TS fixtures are the migration surface).
3. Cross-artifact boundary: `BeatTemplate` is consumed by the validator (ticket 002), the filter + why-suggested trace (ticket 003), the frontend type mirror (ticket 005), and the candidate route (ticket 004). This ticket changes the shared schema all of them track; the downstream tickets adapt to the new shape.
4. FOUNDATIONS Rule 2 (No Pure Cosmetics): each new field has a concrete consumer — `pressure_type` → the filter tie-breaker + why-suggested line (003); `expected_state_review` → the post-prose state-review checklist; `do_not_resolve` / `stop_after` / `anti_patterns` → the candidate card (006). No field is documentation-only.
5. (was template item 6 — schema extension): this extends the `BeatTemplate` output schema with 7 required fields + 2 enums. **Breaking, not additive-only** — every existing `BeatTemplate` literal must supply the fields (consumers enumerated in item 1). No on-disk records exist, so there is no runtime migration; the inline TS fixtures are migrated here with pragmatic `move_family → pressure_type/turn_type` defaults.

## Architecture Check

1. Closed enums for `pressure_type`/`turn_type` force a vocabulary and keep the filter scoring tractable; required-not-optional avoids the silent-skip "consumer handles the missing case" family SPEC-105 fixed.
2. No backwards-compatibility shims: the fields are required from this commit. Fixtures carry pragmatic defaults rather than the fields being optional with runtime fallbacks.

## Verification Layers

1. Each enum has exactly 11 values → codebase grep-proof on the const arrays.
2. `BeatTemplate` carries all 7 fields, all required → `tsc` (`build:backend`) compiles only when every literal supplies them.
3. Backend suite green after fixture migration → `node --test dist/test`.

## What to Change

### 1. Add enums to `src/schema/beat-template.ts`

Add `BeatTemplatePressureType` (`threat | temptation | misunderstanding | deadline | debt | intimacy | exposure | reversal | choice | loss | discovery`) + a `BEAT_TEMPLATE_PRESSURE_TYPES` const array; `BeatTemplateTurnType` (`reveal | refusal | concession | escalation | reversal_turn | commitment | misread | sacrifice | boundary_crossing | discovery_turn | consequence_arrives`) + a `BEAT_TEMPLATE_TURN_TYPES` const array. Note the `reversal_turn`/`discovery_turn` rename in the type comment (disambiguates from the pressure-type enum).

### 2. Extend the `BeatTemplate` interface

Add the 7 required fields: `pressure_type: BeatTemplatePressureType`, `turn_type: BeatTemplateTurnType`, `preconditions_text: string`, `do_not_resolve: string[]`, `expected_state_review: ManualRecordClass[]`, `stop_after: string`, `anti_patterns: string[]`.

### 3. Migrate the 9 backend inline fixtures

In each backend test file, add the 7 fields to every `BeatTemplate` literal using a `move_family → pressure_type/turn_type` default (e.g. `confrontation → escalation`, `negotiation → debt`, `seduction → intimacy`, `reveal → reveal` pressure / `reveal` turn, `observation → discovery`/`discovery_turn`); empty string for `preconditions_text`/`stop_after`; empty array for `do_not_resolve`/`expected_state_review`/`anti_patterns` (or a representative state class such as `relationships` where the fixture exercises the field). Keep every fixture schema-valid.

## Files to Touch

- `tools/manual-story-studio/src/schema/beat-template.ts` (modify)
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (modify)
- `tools/manual-story-studio/test/templates/filter.test.ts` (modify)
- `tools/manual-story-studio/test/templates/why-suggested.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-6-template-guidance.test.ts` (modify)
- `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec104.test.ts` (modify)

## Out of Scope

- Validator enforcement of the new fields (ticket 002).
- Filter scoring / why-suggested rendering (ticket 003).
- Candidate route pin plumbing (ticket 004).
- Frontend type mirror + form (ticket 005) and candidate card (ticket 006).
- `compose.ts` prompt wiring of `do_not_resolve` / `stop_after` (deferred per SPEC-110 §4).

## Acceptance Criteria

### Tests That Must Pass

1. `BEAT_TEMPLATE_PRESSURE_TYPES.length === 11` and `BEAT_TEMPLATE_TURN_TYPES.length === 11`.
2. `cd tools/manual-story-studio && npm run build:backend` compiles (every migrated literal supplies the 7 fields).
3. `cd tools/manual-story-studio && npm test` — backend suite passes with the migrated fixtures.

### Invariants

1. Every `BeatTemplate` literal in the repo supplies all 7 new fields (enforced by `tsc`).
2. No optional/fallback shim for the new fields — they are required at the type level.

## Test Plan

### New/Modified Tests

1. The 9 backend fixture files listed in Files to Touch — modified to supply the 7 new fields. No new test file here; focused new-field tests are ticket 007.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run build:backend` — narrower check that `tsc` accepts the migrated literals before the full suite runs.
