# SPEC110MANSTOSTU-003: Filter desired_pressure_type pin + stage-9 tie-breaker + why-suggested pressure line

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/src/templates/filter.ts`, `tools/manual-story-studio/src/templates/why-suggested.ts`, focused template tests
**Deps**: archive/tickets/SPEC110MANSTOSTU-001.md

## Problem

Before this ticket, SPEC-110 §2 items 6 + 9 had no filter consumer for the new `pressure_type` field. This ticket added an optional author directive pin `desiredPressureType` to `FilterOptionalPins`; when the author supplies it, stage 9 now ranks a template whose `pressure_type` equals the pin above an otherwise-equal template whose does not, and the per-candidate why-suggested trace can surface the match as `pressure: <type>`. The pin is **author-supplied**, not derived from SPEC-109's current-context (SPEC-110 I1: `CurrentContext` carries no relationship-axis or pressure-type field, and `filter.ts` does not consume `CurrentContext`).

## Assumption Reassessment (2026-06-02)

1. `src/templates/filter.ts` owns `FilterOptionalPins`, `buildMatchState`, and the stage-9 sort; `src/templates/why-suggested.ts` owns `WhySuggestedMatches` and `assembleWhySuggested` with `MAX_LINES = 4` terse token lines, not English sentences. The candidate route builds `optionalAuthorPins` from the request body, but request-body plumbing remains ticket 004.
2. SPEC-110 §2 items 6, 9; §3 key decisions (one additional tie-breaker, not a re-ranking; author-supplied not context-derived; determinism preserved via string-equality on an enum field); AC#6, AC#7.
3. Cross-artifact boundary: filter ↔ why-suggested (the trace consumes the new match field computed in `buildMatchState`) ↔ candidate route (ticket 004 sets the pin via `optionalAuthorPins.desiredPressureType`). The new `desiredPressureType` field on `FilterOptionalPins` is the contract ticket 004 plumbs.
4. FOUNDATIONS Rule 2 + determinism (SPEC-110 §5 / §3): this tie-breaker is `pressure_type`'s concrete consumer (proves the field non-cosmetic); it is string-equality on a pre-existing enum-valued field, so identical inputs yield identical ordering — the determinism the report praises is preserved, and ties are only broken when the pin is set.

## Architecture Check

1. Added exactly one ordering criterion as a new final semantic tie-breaker before the title fallback; the 9-stage filter structure and the existing semantic ordering are preserved. The tie-breaker only contributes when the pin is set, so unpinned ordering is byte-identical to the prior title-fallback output.
2. No backwards-compatibility shim: `desiredPressureType` is a new optional field on `FilterOptionalPins`; its absence is the natural "no pin supplied" case, not a fallback alias.

## Verification Layers

1. A pin-matching template ranks above an otherwise-equal non-matching template → ordering unit test.
2. Determinism preserved (no pin → identical order to the pre-change filter) → unit test asserting stable order.
3. `assembleWhySuggested` emits `pressure: <type>` when the match fires → why-suggested unit test.

## Landed Changes

### 1. FilterOptionalPins + scoring (`filter.ts`)

Added `desiredPressureType?: BeatTemplatePressureType` to `FilterOptionalPins`. `buildMatchState` now computes `pressureTypeMatch` from `optionalAuthorPins.desiredPressureType` and the template's `pressure_type`, carries the matched value for the trace, and stage 9 compares `pressureTypeMatch` as a final semantic tie-breaker before title ordering.

### 2. why-suggested trace (`why-suggested.ts`)

Added `pressureTypeMatch: boolean` and `pressureTypeValue?: BeatTemplatePressureType` to `WhySuggestedMatches`; `assembleWhySuggested` now pushes a terse `pressure: <type>` line when the match is true and a value is present, within the `MAX_LINES = 4` priority order.

## Files to Touch

- `tools/manual-story-studio/src/templates/filter.ts` (modify)
- `tools/manual-story-studio/src/templates/why-suggested.ts` (modify)
- `tools/manual-story-studio/test/templates/filter.test.ts` (modify)
- `tools/manual-story-studio/test/templates/why-suggested.test.ts` (modify)

## Out of Scope

- Candidate route plumbing of the pin from the request body (ticket 004).
- Frontend `desired_pressure_type` input + send (ticket 006).
- Any change to the existing 9-stage filter ordering.

## Acceptance Criteria

### Tests That Must Pass

1. With `desiredPressureType` set, a template whose `pressure_type` matches ranks above an otherwise-equal non-matching template.
2. With no pin, the candidate ordering is identical to the pre-change filter.
3. `assembleWhySuggested` includes a `pressure: <type>` line when the match fires.
4. `cd tools/manual-story-studio && npm test`.

### Invariants

1. The tie-breaker is deterministic (string-equality on an enum field), never stochastic.
2. Unpinned ordering is byte-identical to the existing 9-stage filter output.

## Test Plan

### New/Modified Tests

1. `test/templates/filter.test.ts` now covers `desiredPressureType` ranking and the no-pin title-fallback ordering.
2. `test/templates/why-suggested.test.ts` now covers the terse `pressure: intimacy` trace line.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend`
2. `cd tools/manual-story-studio && node --test dist/test/templates/filter.test.js dist/test/templates/why-suggested.test.js`
3. `cd tools/manual-story-studio && npm test`

## Outcome

`FilterOptionalPins` now accepts the author-supplied `desiredPressureType` directive. The filter computes a per-template pressure match, uses it as a deterministic final semantic stage-9 tie-breaker before title ordering, and passes the match to `assembleWhySuggested`, which can emit `pressure: <type>`.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — PASS.
2. `cd tools/manual-story-studio && node --test dist/test/templates/filter.test.js dist/test/templates/why-suggested.test.js` — PASS, 22 tests.
3. `cd tools/manual-story-studio && npm test` — PASS, 437 backend tests plus `web` TypeScript check.

## Deviations

None.
