# SPEC110MANSTOSTU-001: Backend schema — pressure/turn enums + 7 required BeatTemplate fields + backend fixture migration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/manual-story-studio` schema (`src/schema/beat-template.ts`), validator top-level allow-list bridge, and typed backend test-fixture builders
**Deps**: None

## Problem

At intake, `BeatTemplate` was rich on classification/constraint axes but thin on pressure semantics. SPEC-110 §2 items 1-3 add two closed enums (`BeatTemplatePressureType`, `BeatTemplateTurnType`) and 7 author-facing fields (`pressure_type`, `turn_type`, `preconditions_text`, `do_not_resolve`, `expected_state_review`, `stop_after`, `anti_patterns`). This ticket landed the backend type-level schema and migrated typed `BeatTemplate` fixture builders; validator presence/enum enforcement remains ticket 002.

## Assumption Reassessment (2026-06-02)

1. `src/schema/beat-template.ts` defined the `BeatTemplate` interface without pressure/turn fields at intake. `MANUAL_RECORD_CLASSES` in `src/schema/manual-story.ts` includes `beat-templates`, so `expected_state_review` can reuse that type while ticket 002 excludes the non-state-bearing `beat-templates` value at validation time. After the type-level change, `npm run build:backend` identified four typed fixture-builder files that had to supply the fields: `test/templates/{beat-template-schema,filter,why-suggested}.test.ts` and `test/prompt/beat-template-lint.test.ts`.
2. SPEC-110 §2 items 1, 2, 3, 5; §3 key decisions (closed enums; `reversal_turn`/`discovery_turn` rename for type-system clarity; all 7 fields required); §8 (no on-disk YAML migration surface for this ticket).
3. Cross-artifact boundary: `BeatTemplate` is consumed by the validator (ticket 002), the filter + why-suggested trace (ticket 003), the frontend type mirror (ticket 005), and the candidate route (ticket 004). This ticket changes the shared backend schema all of them track; downstream tickets adapt to the new shape.
4. FOUNDATIONS Rule 2 (No Pure Cosmetics): each new field has a concrete consumer — `pressure_type` -> the filter tie-breaker + why-suggested line (003); `expected_state_review` -> the post-prose state-review checklist; `do_not_resolve` / `stop_after` / `anti_patterns` -> the candidate card (006). No field is documentation-only.
5. This extends the backend `BeatTemplate` TypeScript schema with 7 required fields + 2 enums. Breaking for typed producers, not additive-only: typed `BeatTemplate` builders must supply the fields. Because the existing validator rejects unknown top-level keys, this ticket also added a minimal `TOP_LEVEL_ALLOWED` bridge for the 7 keys so typed records remain acceptable before ticket 002 makes the fields required and enum-checked at runtime.

## Architecture Check

1. Closed enums for `pressure_type`/`turn_type` force a vocabulary and keep later filter scoring tractable; required TypeScript fields avoid the typed silent-skip "consumer handles the missing case" family SPEC-105 fixed.
2. No backwards-compatibility shims: the fields are required on the backend TypeScript interface. Fixtures carry pragmatic defaults rather than runtime fallback behavior; the validator allow-list bridge only prevents valid typed records from being rejected as unknown before ticket 002 lands enforcement.

## Verification Layers

1. Each enum has exactly 11 values -> codebase grep-proof on the const arrays.
2. `BeatTemplate` carries all 7 fields, all required -> `tsc` (`build:backend`) compiles only when typed `BeatTemplate` builders supply them.
3. Package suite green after fixture migration -> `npm test`.

## Landed Changes

### 1. Added enums to `src/schema/beat-template.ts`

Added `BeatTemplatePressureType` (`threat | temptation | misunderstanding | deadline | debt | intimacy | exposure | reversal | choice | loss | discovery`) + a `BEAT_TEMPLATE_PRESSURE_TYPES` const array; `BeatTemplateTurnType` (`reveal | refusal | concession | escalation | reversal_turn | commitment | misread | sacrifice | boundary_crossing | discovery_turn | consequence_arrives`) + a `BEAT_TEMPLATE_TURN_TYPES` const array. The type comment notes the `reversal_turn`/`discovery_turn` rename to disambiguate from the pressure-type enum.

### 2. Extended the `BeatTemplate` interface

Added the 7 required fields: `pressure_type: BeatTemplatePressureType`, `turn_type: BeatTemplateTurnType`, `preconditions_text: string`, `do_not_resolve: string[]`, `expected_state_review: ManualRecordClass[]`, `stop_after: string`, `anti_patterns: string[]`.

### 3. Migrated typed backend fixture builders

Added the 7 fields to typed `BeatTemplate` builders in `beat-template-schema.test.ts`, `filter.test.ts`, `why-suggested.test.ts`, and `beat-template-lint.test.ts` with pragmatic pressure/turn defaults and blank/representative author-facing fields.

### 4. Added validator top-level allow-list bridge

Added the 7 new keys to `validateBeatTemplate`'s top-level allowed-field set so typed records with the new fields remain accepted. Presence and enum enforcement are intentionally still ticket 002.

## Files to Touch

- `tools/manual-story-studio/src/schema/beat-template.ts` (modify)
- `tools/manual-story-studio/src/validate/beat-template-schema.ts` (modify)
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (modify)
- `tools/manual-story-studio/test/templates/filter.test.ts` (modify)
- `tools/manual-story-studio/test/templates/why-suggested.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/beat-template-lint.test.ts` (modify)

## Out of Scope

- Validator required-field and enum enforcement of the new fields (ticket 002).
- Filter scoring / why-suggested rendering (ticket 003).
- Candidate route pin plumbing (ticket 004).
- Frontend type mirror + form (ticket 005) and candidate card (ticket 006).
- `compose.ts` prompt wiring of `do_not_resolve` / `stop_after` (deferred per SPEC-110 §4).

## Acceptance Criteria

### Tests That Must Pass

1. `BEAT_TEMPLATE_PRESSURE_TYPES.length === 11` and `BEAT_TEMPLATE_TURN_TYPES.length === 11`.
2. `cd tools/manual-story-studio && npm run build:backend` compiles (typed migrated builders supply the 7 fields).
3. `cd tools/manual-story-studio && npm test` — backend suite and web typecheck pass with the migrated fixtures.

### Invariants

1. Every typed `BeatTemplate` builder in the backend tests supplies all 7 new fields (enforced by `tsc`).
2. No optional/fallback shim for the new fields — they are required at the type level; runtime validator enforcement remains ticket 002.

## Test Plan

### New/Modified Tests

1. The typed backend fixture builders listed in Files to Touch — modified to supply the 7 new fields. No new test file here; focused new-field tests are ticket 007.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run build:backend` — narrower check that `tsc` accepts the migrated literals before the full suite runs.

## Outcome

Completed 2026-06-02. Added backend `BeatTemplatePressureType` / `BeatTemplateTurnType` enum constants and types, extended the backend `BeatTemplate` interface with the 7 required SPEC-110 fields, migrated the typed backend fixture builders, and added the minimal validator allowed-key bridge required for typed records to remain accepted before ticket 002.

## Verification Result

- `cd tools/manual-story-studio && npm run build:backend` — PASS before edits as baseline.
- `cd tools/manual-story-studio && npm run build:backend` — PASS after schema + fixture migration.
- `cd tools/manual-story-studio && npm test` — PASS: backend build, 429 backend tests, and `npm --prefix web test` (`tsc --noEmit`).

## Deviations

- The draft claimed nine backend test files would fail `tsc`; live typecheck identified four typed `BeatTemplate` builder files. The other same-family `move_family` fixtures are YAML/object request fixtures not type-enforced by this ticket.
- `validateBeatTemplate` was changed only to allow the new top-level keys. Required-field presence, enum validation, and the `expected_state_review` exclusion of `beat-templates` remain ticket 002.
