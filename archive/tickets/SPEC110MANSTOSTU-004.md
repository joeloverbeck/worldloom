# SPEC110MANSTOSTU-004: Candidate route plumbing for the desired_pressure_type pin

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio/src/server/routes/beat-templates.ts`, `tools/manual-story-studio/test/server/beat-templates-routes.test.ts`
**Deps**: archive/tickets/SPEC110MANSTOSTU-003.md

## Problem

Before this ticket, the candidate route did not accept the optional `desired_pressure_type` directive in its request body, so the `FilterOptionalPins.desiredPressureType` field from `archive/tickets/SPEC110MANSTOSTU-003.md` had no backend producer. This ticket added the backend request type and mapping so the filter's stage-9 pressure tie-breaker can fire through the HTTP route.

## Assumption Reassessment (2026-06-02)

1. `src/server/routes/beat-templates.ts` builds `optionalAuthorPins` from `body.optional_move_family` / `optional_tags` / `optional_location` and passes it to `filterBeatTemplates`. This is the single backend site where the candidate request maps to `FilterOptionalPins`.
2. SPEC-110 §2 item 9 + §4 Files to Touch ("the candidate route handler + `CandidateRequestBody` type — thread the new `optional_desired_pressure_type` directive pin … through to `FilterOptionalPins`").
3. Cross-artifact boundary: route ↔ filter (`FilterOptionalPins.desiredPressureType` defined by `archive/tickets/SPEC110MANSTOSTU-003.md`) ↔ frontend send (ticket 006 sends `optional_desired_pressure_type`). This ticket is the backend half of that wire; it must land after `archive/tickets/SPEC110MANSTOSTU-003.md` (the `desiredPressureType` field must exist on `FilterOptionalPins`).

## Architecture Check

1. Mirrors the existing `optional_move_family → optionalAuthorPins.moveFamily` mapping exactly — one additional guarded assignment, no new request-handling shape.
2. No backwards-compatibility shim: the new request field is optional; its absence means no `desiredPressureType` is set, which the filter already treats as "no pin" (`archive/tickets/SPEC110MANSTOSTU-003.md`).

## Verification Layers

1. A candidate request carrying `optional_desired_pressure_type` produces `FilterOptionalPins.desiredPressureType` set → route unit test (`test/server/beat-templates-routes.test.ts`) asserting the filtered ordering reflects the pin.
2. A request omitting the field leaves `desiredPressureType` undefined → route unit test asserting unchanged ordering.

## Landed Changes

### 1. Request-body type

Added `optional_desired_pressure_type?: BeatTemplatePressureType` to the candidate request-body type alongside `optional_move_family`.

### 2. Map into optionalAuthorPins

The route handler now assigns `optionalAuthorPins.desiredPressureType` only when `body.optional_desired_pressure_type !== undefined`, mirroring the existing optional move-family mapping.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify)
- `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` (modify)

## Out of Scope

- The `FilterOptionalPins.desiredPressureType` field and the tie-breaker logic (`archive/tickets/SPEC110MANSTOSTU-003.md`).
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

1. `tools/manual-story-studio/test/server/beat-templates-routes.test.ts` — added a candidate-request case asserting no-pin title ordering and pinned pressure ordering through the route.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && node --test dist/test/server/beat-templates-routes.test.js`
3. `cd tools/manual-story-studio && npm test`

## Outcome

Completed 2026-06-02. The backend candidate route now accepts `optional_desired_pressure_type` and maps it into `FilterOptionalPins.desiredPressureType` when explicitly supplied. Route-level coverage proves omitted requests preserve base ordering and pinned requests produce pressure-match ordering plus the `pressure: intimacy` trace line.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS.
2. `cd tools/manual-story-studio && node --test dist/test/server/beat-templates-routes.test.js` — PASS, 6 tests.
3. `cd tools/manual-story-studio && npm test` — PASS, 438 backend tests plus `web` TypeScript check.

## Deviations

None.
