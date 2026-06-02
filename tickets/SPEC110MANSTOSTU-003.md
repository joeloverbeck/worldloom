# SPEC110MANSTOSTU-003: Filter desired_pressure_type pin + stage-9 tie-breaker + why-suggested pressure line

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio/src/templates/filter.ts`, `tools/manual-story-studio/src/templates/why-suggested.ts`
**Deps**: 001

## Problem

SPEC-110 §2 items 6 + 9 (filter portion). Add an optional author directive pin `desired_pressure_type` to `FilterOptionalPins`; when the author supplies it, add a deterministic stage-9 tie-breaker ranking a template whose `pressure_type` equals the pin above an otherwise-equal template whose does not, and surface the match as a terse `pressure: <type>` line in the per-candidate why-suggested trace. The pin is **author-supplied**, not derived from SPEC-109's current-context (SPEC-110 I1: `CurrentContext` carries no relationship-axis or pressure-type field, and `filter.ts` does not consume `CurrentContext`).

## Assumption Reassessment (2026-06-02)

1. `src/templates/filter.ts` — `FilterOptionalPins` (lines 44-48: `moveFamily` / `tags` / `location`), `buildMatchState` (lines 104-200), the stage-9 sort (lines 289-325, criteria (a) pinned move_family → (f) title). `src/templates/why-suggested.ts` — `WhySuggestedMatches` (lines 14-23), `assembleWhySuggested` (lines 35-62, `MAX_LINES = 4` terse token lines, NOT English sentences). The candidate route builds `optionalAuthorPins` from the request body at `src/server/routes/beat-templates.ts:380-404`.
2. SPEC-110 §2 items 6, 9; §3 key decisions (one additional tie-breaker, not a re-ranking; author-supplied not context-derived; determinism preserved via string-equality on an enum field); AC#6, AC#7.
3. Cross-artifact boundary: filter ↔ why-suggested (the trace consumes the new match field computed in `buildMatchState`) ↔ candidate route (ticket 004 sets the pin via `optionalAuthorPins.desiredPressureType`). The new `desiredPressureType` field on `FilterOptionalPins` is the contract ticket 004 plumbs.
4. FOUNDATIONS Rule 2 + determinism (SPEC-110 §5 / §3): this tie-breaker is `pressure_type`'s concrete consumer (proves the field non-cosmetic); it is string-equality on a pre-existing enum-valued field, so identical inputs yield identical ordering — the determinism the report praises is preserved, and ties are only broken when the pin is set.

## Architecture Check

1. Adds exactly one ordering criterion as a new tie-breaker; the 9-stage filter structure and the existing (a)-(f) ordering are untouched (SPEC-110 §4 "No modification to" the 9-stage structure). The tie-breaker only contributes when the pin is set, so unpinned ordering is byte-identical to the current output.
2. No backwards-compatibility shim: `desiredPressureType` is a new optional field on `FilterOptionalPins`; its absence is the natural "no pin supplied" case, not a fallback alias.

## Verification Layers

1. A pin-matching template ranks above an otherwise-equal non-matching template → ordering unit test (ticket 007).
2. Determinism preserved (no pin → identical order to the pre-change filter) → unit test asserting stable order.
3. `assembleWhySuggested` emits `pressure: <type>` when the match fires → why-suggested unit test.

## What to Change

### 1. FilterOptionalPins + scoring (`filter.ts`)

Add `desiredPressureType?: BeatTemplatePressureType` to `FilterOptionalPins`. In `buildMatchState`, compute `pressureTypeMatch = input.optionalAuthorPins.desiredPressureType !== undefined && template.pressure_type === input.optionalAuthorPins.desiredPressureType`. Add a stage-9 tie-breaker comparing `pressureTypeMatch` (matching template ranks first); place it so it only fires when the pin is set, preserving byte-identical unpinned ordering.

### 2. why-suggested trace (`why-suggested.ts`)

Add `pressureTypeMatch: boolean` (and the matched value, e.g. via `intensityValue`-style optional string) to `WhySuggestedMatches`; in `assembleWhySuggested`, push a terse `pressure: <type>` line when the match is true, within the `MAX_LINES = 4` priority order.

## Files to Touch

- `tools/manual-story-studio/src/templates/filter.ts` (modify)
- `tools/manual-story-studio/src/templates/why-suggested.ts` (modify)

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

1. The focused filter + why-suggested assertions land in ticket 007; this ticket may extend `test/templates/filter.test.ts` / `test/templates/why-suggested.test.ts` to keep the suite green.

### Commands

1. `cd tools/manual-story-studio && npm test`
