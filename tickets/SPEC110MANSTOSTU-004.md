# SPEC110MANSTOSTU-004: Candidate route plumbing for the desired_pressure_type pin

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio/src/server/routes/beat-templates.ts`
**Deps**: 003

## Problem

SPEC-110 §2 item 9 (route portion). The candidate route must accept an optional `desired_pressure_type` directive in its request body and thread it into `FilterOptionalPins.desiredPressureType` so the filter's stage-9 tie-breaker (ticket 003) fires. Without this, the pin field added to `FilterOptionalPins` has no producer.

## Assumption Reassessment (2026-06-02)

1. `src/server/routes/beat-templates.ts:380-404` builds `optionalAuthorPins` (`{ moveFamily?, tags?, location? }`) from `body.optional_move_family` / `optional_tags` / `optional_location` and passes it to `filterBeatTemplates`; the request-body type at line ~122 declares `optional_move_family?: BeatTemplateMoveFamily` (and siblings). This is the single backend site where the candidate request maps to `FilterOptionalPins`.
2. SPEC-110 §2 item 9 + §4 Files to Touch ("the candidate route handler + `CandidateRequestBody` type — thread the new `optional_desired_pressure_type` directive pin … through to `FilterOptionalPins`").
3. Cross-artifact boundary: route ↔ filter (`FilterOptionalPins.desiredPressureType` defined by ticket 003) ↔ frontend send (ticket 006 sends `optional_desired_pressure_type`). This ticket is the backend half of that wire; it must land after 003 (the `desiredPressureType` field must exist on `FilterOptionalPins`).

## Architecture Check

1. Mirrors the existing `optional_move_family → optionalAuthorPins.moveFamily` mapping exactly — one additional guarded assignment, no new request-handling shape.
2. No backwards-compatibility shim: the new request field is optional; its absence means no `desiredPressureType` is set, which the filter already treats as "no pin" (ticket 003).

## Verification Layers

1. A candidate request carrying `optional_desired_pressure_type` produces `FilterOptionalPins.desiredPressureType` set → route unit test (`test/server/beat-templates-routes.test.ts`) asserting the filtered ordering reflects the pin.
2. A request omitting the field leaves `desiredPressureType` undefined → route unit test asserting unchanged ordering.

## What to Change

### 1. Request-body type

Add `optional_desired_pressure_type?: BeatTemplatePressureType` to the candidate request-body type (alongside `optional_move_family` at line ~122).

### 2. Map into optionalAuthorPins

In the route handler (lines ~380-404), after the existing `optional_move_family` guard, add `if (body.optional_desired_pressure_type !== undefined) optionalAuthorPins.desiredPressureType = body.optional_desired_pressure_type;`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify)

## Out of Scope

- The `FilterOptionalPins.desiredPressureType` field and the tie-breaker logic (ticket 003).
- The frontend send of `optional_desired_pressure_type` and the author input control (ticket 006).

## Acceptance Criteria

### Tests That Must Pass

1. A candidate request with `optional_desired_pressure_type` set yields a candidate ordering reflecting the pressure-type tie-breaker.
2. A candidate request without the field yields the unchanged base ordering.
3. `cd tools/manual-story-studio && npm test`.

### Invariants

1. The route never sets `desiredPressureType` unless the request explicitly supplies `optional_desired_pressure_type` (optional-field discipline).
2. The mapping is the only backend site translating the request pin to `FilterOptionalPins`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` — add a candidate-request case asserting the pin reaches the filter; focused filter-ordering coverage is in ticket 007.

### Commands

1. `cd tools/manual-story-studio && npm test`
