# SPEC110MANSTOSTU-002: Validator enforcement of the new BeatTemplate fields

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio/src/validate/beat-template-schema.ts` plus positive beat-template fixture updates
**Deps**: archive/tickets/SPEC110MANSTOSTU-001.md

## Problem

At intake, `validateBeatTemplate` allowed the 7 SPEC-110 keys only as a bridge from ticket 001. This ticket makes them real validator contract: closed-enum checks for `pressure_type` and `turn_type`; `ManualRecordClass` membership for `expected_state_review` excluding `beat-templates`; required presence for `preconditions_text` / `stop_after` / `do_not_resolve` / `anti_patterns`.

## Assumption Reassessment (2026-06-02)

1. `src/validate/beat-template-schema.ts` defines `validateBeatTemplate`; `TOP_LEVEL_REQUIRED` / `TOP_LEVEL_ALLOWED` already included the original 10 fields plus the 7 bridge-allowed fields from archived ticket 001. The helper validators `validateEnumString`, `validateEnumStringArray`, `validateStringArray`, and `validateString` already existed.
2. SPEC-110 §2 item 4 + §3 key decision (`expected_state_review` excludes `beat-templates`) + AC#4 require distinct findings for invalid `pressure_type`, invalid `turn_type`, invalid `expected_state_review` entry, and forbidden `beat-templates`.
3. Cross-artifact boundary: the validator consumes the backend `BeatTemplate` schema from archived ticket 001. This ticket enforces those fields at runtime and therefore also owns positive test fixtures that create beat-template YAML/object bodies through the validator.
4. FOUNDATIONS §Soft Canon / Local Truth (must be explicit): enforcing the new fields as required makes each template's pressure/turn semantics explicit at authoring time rather than inferred from `move_family` heuristics.
5. Same-seam proof fallout: after the first validator edit, `npm test` failed in capstone and schema tests because untyped positive beat-template fixtures still omitted the new required fields. Those fixtures are current-contract positive examples, not historical rejection cases, so this ticket widened to update them.

## Architecture Check

1. Reuses existing validator helpers plus closed sets from `BEAT_TEMPLATE_PRESSURE_TYPES`, `BEAT_TEMPLATE_TURN_TYPES`, and `MANUAL_RECORD_CLASSES`; no new validation framework is introduced.
2. No backwards-compatibility aliasing: the required-field set is extended in place to 17 top-level fields, and absence of any of the 7 new fields is a validation failure.

## Verification Layers

1. Unknown `pressure_type` / `turn_type` rejected with field-keyed findings -> unit assertions in `beat-template-schema.test.ts`.
2. `expected_state_review: ["beat-templates"]` rejected with a finding distinct from the unknown-record-class finding -> unit assertion.
3. Fully populated positive fixtures are accepted across direct validator tests, route tests, prompt tests, capstone tests, and aggregate `validateRecord` class tests -> `npm test`.

## Landed Changes

### 1. Required/allowed set + enum sets

Added the 7 SPEC-110 fields to `TOP_LEVEL_REQUIRED`, collapsed `TOP_LEVEL_ALLOWED` back to the required-field set, and added `PRESSURE_TYPE_SET`, `TURN_TYPE_SET`, and `MANUAL_RECORD_CLASS_SET`.

### 2. Per-field validation

- `pressure_type` / `turn_type` use `validateEnumString`.
- `preconditions_text` / `stop_after` use `validateString`.
- `do_not_resolve` / `anti_patterns` use `validateStringArray`.
- `expected_state_review` uses a dedicated helper so unknown record classes and the forbidden `beat-templates` value produce distinct messages.

### 3. Fixture updates

Updated current-contract positive beat-template fixtures in direct validator tests, capstone tests, prompt tests, route tests, and aggregate schema validation tests so the broad package suite exercises the new required fields instead of failing on stale fixture bodies.

## Files to Touch

- `tools/manual-story-studio/src/validate/beat-template-schema.ts` (modify)
- `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec104.test.ts` (modify)
- `tools/manual-story-studio/test/prompt/section-6-template-guidance.test.ts` (modify)
- `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` (modify)
- `tools/manual-story-studio/test/server/prompts-routes.test.ts` (modify)
- `tools/manual-story-studio/test/validate/schema.test.ts` (modify)

## Out of Scope

- The schema/interface definition and enums (archived ticket 001).
- The dedicated focused SPEC-110 acceptance file (ticket 007).
- Filter, route pin, frontend form, and candidate-card behavior (tickets 003-006).

## Acceptance Criteria

### Tests That Must Pass

1. `validateBeatTemplate` rejects an unknown `pressure_type` and an unknown `turn_type`, each with a finding keyed to that field.
2. `validateBeatTemplate` rejects `expected_state_review: ["beat-templates"]` with a finding distinct from the unknown-record-class finding.
3. `cd tools/manual-story-studio && npm test`.

### Invariants

1. A template missing any of the 7 new fields is rejected.
2. `expected_state_review` accepts only state-bearing `ManualRecordClass` values, never `beat-templates`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` — added missing-field, bad-enum, unknown-record-class, and forbidden-`beat-templates` assertions.
2. Positive beat-template fixtures in capstone, prompt, route, and aggregate schema tests — updated to satisfy the new required validator contract.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && npm test`

## Outcome

Completed 2026-06-02. `validateBeatTemplate` now requires and validates all 7 SPEC-110 fields, rejects invalid pressure/turn enum values, rejects unknown state-review classes, and gives `beat-templates` a distinct non-state-review-class finding. Positive beat-template fixtures now carry the new fields wherever they pass through the validator.

## Verification Result

- `cd tools/manual-story-studio && npm run build:backend` — PASS before validator edits as baseline.
- `cd tools/manual-story-studio && npm run build:backend` — PASS after validator/test edits.
- `cd tools/manual-story-studio && npm test` — first run FAILED after the validator edit because current-contract positive fixtures in `capstone-spec104.test.ts` and `validate/schema.test.ts` still omitted the 7 new fields. This was same-seam proof fallout and was fixed by migrating all positive beat-template fixtures found by `rg -n "move_family:" tools/manual-story-studio/test`.
- `cd tools/manual-story-studio && npm test` — PASS after fixture migration: 434 backend tests and `npm --prefix web test` (`tsc --noEmit`).

## Deviations

- The ticket draft named only `beat-template-schema.test.ts`; implementation widened to positive capstone/prompt/route/schema fixtures because runtime validator enforcement made those fixtures same-seam current-contract witnesses.
