# SPEC109MANSTOSTU-003: Validate path + validate tests

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `src/validate/current-context.ts` and `test/current-context/current-context-validate.test.ts` to `@worldloom/manual-story-studio`; no impact on existing validators.
**Deps**: archive/tickets/SPEC109MANSTOSTU-001.md

## Problem

Every ID referenced inside a `current-context.yaml` (`pov_holder`, `current_cast`, `pinned_records`, `active_pressure_clocks`, `active_secrets_questions`, `must_not_reveal`, `last_accepted_segment`, `last_reviewed_after_segment`, `current_location`) must resolve to an extant record-class ID or segment ID; cross-field invariants (`pov_holder ∈ current_cast`) must hold. Without a fail-fast validator, malformed current-contexts would surface as silent prompt-composer bugs or health-pass red findings without actionable repair hints. This ticket lands `validateCurrentContext` plus its acceptance tests, providing the structured `ValidationResult` shape that the PUT route handler (005) and the health-integration pass (006) both consume.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/validate/schema.ts:29` exports `ValidationResult = { ok: true } | { ok: false; errors: ValidationError[] }` — reusable by this ticket. `tools/manual-story-studio/src/validate/refs.ts:131` exports `validateRefs(...)` and `tools/manual-story-studio/src/read/records.ts:87` exports `listAllKnownIds(manualStoryRoot)` returning `KnownIds` keyed by `ManualRecordClass`. `KnownIds` does NOT enumerate segments — segment IDs are surfaced via `metadata.segment_order` (the array tail).
2. **Spec**: SPEC-109 §2 item 5 specifies the dual-source known-IDs lookup explicitly: record-class IDs (mchar-, mloc-, mclock-, msecret-, mq-, mrel-, mobl-, …) resolve against `KnownIds` from `listAllKnownIds`; SEG- IDs in `last_accepted_segment` / `last_reviewed_after_segment` resolve against `metadata.segment_order` (passed as `knownSegmentIds`). Finding codes are fixed by SPEC-109: `current-context-reference-broken` (unknown record ID in any reference field) and `current-context-pov-not-in-cast` (cross-field invariant violation).
3. **Cross-skill boundary**: This validator's `ValidationResult` shape is consumed by two downstream surfaces: (a) the PUT route handler (005) that maps validation failures to HTTP 422 with structured findings; (b) the health-integration pass (006) that surfaces the same findings under SPEC-105's existing `current-context-yaml-parse-failed` / `current-context-reference-broken` health-finding codes (the spec routes the validator's finding codes into the health report directly). The shared contract is the `ValidationResult.errors[].field` + `errors[].message` shape that both consumers parse.
4. **Live error-shape correction (2026-06-02)**: The current `ValidationError` interface had only `field` and `message`, but SPEC-109 downstream consumers require stable current-context finding codes. This ticket adds an optional `code?: string` to the shared shape so existing validators remain compatible while current-context errors carry the two fixed codes.

## Architecture Check

1. Reusing the existing `ValidationResult` shape from `src/validate/schema.ts` avoids inventing a parallel error vocabulary; consumers (005 route handler, 006 health pass) already know how to render the existing shape.
2. The dual-source known-IDs parameter (`knownIds` + `knownSegmentIds`) makes the validator pure — no I/O happens inside the validator itself; callers do the disk reads and pass the result.

## Verification Layers

1. POV-not-in-cast detection → acceptance test (`current-context-validate.test.ts`).
2. Unknown record ID in `pinned_records` → acceptance test.
3. Unknown record ID in `current_cast` / `active_pressure_clocks` / `active_secrets_questions` / `must_not_reveal` → acceptance test (one case per field).
4. Unknown segment ID in `last_accepted_segment` / `last_reviewed_after_segment` → acceptance test.
5. Valid payload returns `{ok: true}` → acceptance test (positive control).

## Landed Changes

### 1. New validator at `src/validate/current-context.ts`

Implemented `validateCurrentContext(ctx: CurrentContext, knownIds: KnownIds, knownSegmentIds: string[]): ValidationResult`:
- Iterate every reference field, resolve each ID's expected class via the ID's prefix (mchar- → "cast", mloc- → "locations", etc.), and check membership in the corresponding `knownIds[class]` set. On miss, append `{field: "<field-name>", message: "<id> not found in <class>"}` keyed under code `current-context-reference-broken`.
- For `last_accepted_segment` / `last_reviewed_after_segment`, check membership in `knownSegmentIds` (the `metadata.segment_order` array). On miss, append a `current-context-reference-broken` finding.
- For `pov_holder`, additionally check it appears in `current_cast`; on miss, append a `current-context-pov-not-in-cast` finding.
- Return `{ok: true}` when all checks pass; `{ok: false, errors}` otherwise.

### 2. Optional validation error code field

Added `code?: string` to `ValidationError` so `validateCurrentContext` can return stable finding codes without forcing existing validators to invent codes.

### 3. New acceptance test at `test/current-context/current-context-validate.test.ts`

Covered each finding-code case plus the positive control with in-memory `KnownIds` and `knownSegmentIds` (no fixture-disk I/O required).

## Files to Touch

- `tools/manual-story-studio/src/validate/current-context.ts` (new)
- `tools/manual-story-studio/src/validate/schema.ts` (modify — add optional validation error code field)
- `tools/manual-story-studio/test/current-context/current-context-validate.test.ts` (new)

## Out of Scope

- Reading the current-context.yaml file or constructing `knownIds` / `knownSegmentIds` — those are caller responsibilities (the PUT route handler in 005, the health pass in 006).
- Writing the current-context.yaml file — owned by 004.
- HTTP error-code mapping — owned by 005.
- Health-pass integration wiring — owned by 006.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes.
2. AC #2 (validateCurrentContext rejects `pov_holder` not in `current_cast` with finding code `current-context-pov-not-in-cast`).
3. AC #3 (validateCurrentContext rejects unknown record IDs in any reference field with finding code `current-context-reference-broken`).

### Invariants

1. The validator is pure: no disk I/O, no thrown exceptions; all outcomes route through `ValidationResult`.
2. Finding-code vocabulary is fixed: `current-context-reference-broken` for unknown-IDs; `current-context-pov-not-in-cast` for the cross-field invariant. No additional codes are introduced.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/current-context-validate.test.ts` — covers every finding-code path and the positive control.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`

## Outcome

Completed on 2026-06-02. Added the pure current-context validator, stable finding-code constants, and acceptance tests for the valid payload, POV/cast invariant, every record-reference field, and both segment fields. Added an optional `ValidationError.code` field to support the SPEC-109 route and health consumers without changing existing validator callers.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — PASS; 66 compiled backend test files passed, including `dist/test/current-context/current-context-validate.test.js`.
2. `cd tools/manual-story-studio && npm test` — PASS; 411 backend tests passed and `web` `tsc --noEmit` passed.

## Deviations

- The live validation shape needed an optional `code` field for the two SPEC-109 current-context finding codes. Existing validators are not required to populate it.
