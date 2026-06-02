# SPEC110MANSTOSTU-002: Validator enforcement of the new BeatTemplate fields

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio/src/validate/beat-template-schema.ts`
**Deps**: 001

## Problem

`validateBeatTemplate` must enforce the 7 new fields per SPEC-110 §2 item 4: closed-enum checks for `pressure_type` and `turn_type`; `ManualRecordClass` membership for `expected_state_review` **excluding `beat-templates`** (a post-prose state-review checklist names state-bearing classes, never the template library); presence (empty allowed, but the field must exist) for `preconditions_text`/`stop_after`/`do_not_resolve`/`anti_patterns`.

## Assumption Reassessment (2026-06-02)

1. `src/validate/beat-template-schema.ts:284` defines `validateBeatTemplate`; `TOP_LEVEL_REQUIRED`/`TOP_LEVEL_ALLOWED` (lines 269-282) currently enumerate the 10 existing top-level fields; the helpers `validateEnumString`, `validateEnumStringArray`, `validateStringArray`, `validateString` already exist. `MANUAL_RECORD_CLASSES` at `src/schema/manual-story.ts:204` includes `beat-templates`, so a naive `validateEnumStringArray` against `MANUAL_RECORD_CLASSES` would wrongly accept it.
2. SPEC-110 §2 item 4 + §3 key decision (`expected_state_review` excludes `beat-templates`) + AC#4 (distinct finding codes for invalid `pressure_type`, invalid `turn_type`, invalid/`beat-templates` `expected_state_review` entry).
3. Cross-artifact boundary: the validator ↔ the `BeatTemplate` schema (ticket 001). The 7 fields and 2 enums this ticket enforces are defined by 001; this ticket must land after 001.
4. FOUNDATIONS §Soft Canon / Local Truth (must be explicit): enforcing the new fields as required is what makes each template's pressure/turn semantics explicit at authoring time rather than inferred from `move_family` heuristics — the validator holds the explicitness contract SPEC-110 §5 names.

## Architecture Check

1. Reuses the existing `validateEnumString` / `validateEnumStringArray` / `validateStringArray` / `validateString` helpers plus two new closed sets (`PRESSURE_TYPE_SET`, `TURN_TYPE_SET`) and an exclusion guard for `beat-templates`; no new validation framework is introduced.
2. No backwards-compatibility aliasing: the required-field set is extended in place (10 → 17); there is no optional-field handling for the new fields.

## Verification Layers

1. Unknown `pressure_type` / `turn_type` rejected with a field-keyed finding → unit assertions (this ticket extends `beat-template-schema.test.ts`; focused coverage in ticket 007).
2. `expected_state_review: ["beat-templates"]` rejected with a finding distinct from the unknown-record-class finding → unit assertion.
3. A fully-populated valid template is accepted → existing `beat-template-schema.test.ts` happy-path assertion.

## What to Change

### 1. Extend the required/allowed set + enum sets

Add the 7 fields to `TOP_LEVEL_REQUIRED` and `TOP_LEVEL_ALLOWED`. Add `PRESSURE_TYPE_SET` / `TURN_TYPE_SET` built from `BEAT_TEMPLATE_PRESSURE_TYPES` / `BEAT_TEMPLATE_TURN_TYPES` (ticket 001).

### 2. Per-field validation

- `pressure_type` / `turn_type` → `validateEnumString` against the new sets.
- `expected_state_review` → `validateEnumStringArray` against `MANUAL_RECORD_CLASSES`, plus an explicit guard emitting a distinct finding (e.g. `expected_state_review[i]` "beat-templates is not a state-review class") when an entry equals `beat-templates`.
- `preconditions_text` / `stop_after` → `validateString` (presence; empty string allowed).
- `do_not_resolve` / `anti_patterns` → `validateStringArray` (presence; empty array allowed).

## Files to Touch

- `tools/manual-story-studio/src/validate/beat-template-schema.ts` (modify)

## Out of Scope

- The schema/interface definition and enums (ticket 001).
- The dedicated focused test file (ticket 007); this ticket may add minimal assertions to the existing `beat-template-schema.test.ts` to keep the suite green.

## Acceptance Criteria

### Tests That Must Pass

1. `validateBeatTemplate` rejects an unknown `pressure_type` and an unknown `turn_type`, each with a finding keyed to that field.
2. `validateBeatTemplate` rejects `expected_state_review: ["beat-templates"]` with a finding distinct from the unknown-record-class finding.
3. `cd tools/manual-story-studio && npm test`.

### Invariants

1. A template missing any of the 7 new fields is rejected (required-field enforcement).
2. `expected_state_review` accepts only state-bearing `ManualRecordClass` values, never `beat-templates`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/beat-template-schema.test.ts` — extend with the rejection assertions above (focused enum/exclusion coverage also lands in ticket 007).

### Commands

1. `cd tools/manual-story-studio && npm test`
