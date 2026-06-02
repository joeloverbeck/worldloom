# SPEC110MANSTOSTU-007: Focused acceptance tests for the new field validation, filter tie-breaker, and why-suggested line

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new test file `tools/manual-story-studio/test/templates/beat-template-spec110-fields.test.ts`
**Deps**: archive/tickets/SPEC110MANSTOSTU-002.md, archive/tickets/SPEC110MANSTOSTU-003.md, 004

## Problem

SPEC-110 §2 item 10 / AC#4-7. Add a focused test file covering the new behavior end-to-end at the unit level: validator rejection of bad enums and the `beat-templates` `expected_state_review` entry; the filter's `desired_pressure_type` stage-9 tie-breaker; and the `pressure: <type>` why-suggested line. This complements the fixture migration (ticket 001) and the per-surface assertions in tickets 002 / `archive/tickets/SPEC110MANSTOSTU-003.md` with a single spec-traceable acceptance suite.

## Assumption Reassessment (2026-06-02)

1. `validateBeatTemplate` (`src/validate/beat-template-schema.ts`, ticket 002) emits field-keyed findings; `filterBeatTemplates` (`src/templates/filter.ts`, `archive/tickets/SPEC110MANSTOSTU-003.md`) accepts `FilterOptionalPins.desiredPressureType`; `assembleWhySuggested` (`src/templates/why-suggested.ts`, `archive/tickets/SPEC110MANSTOSTU-003.md`) emits terse lines. The existing `test/templates/*.test.ts` files build inline `BeatTemplate` literals via helper functions (e.g. `validTemplate()` in `beat-template-schema.test.ts`) — the new test reuses that construction style. Tests run via `node --test "dist/test/**/*.test.js"` after `build:backend`.
2. SPEC-110 §2 item 10 + AC#4 (distinct finding codes), AC#5 (fixtures green — covered by ticket 001), AC#6 (tie-breaker), AC#7 (why-suggested pressure line).
3. Cross-artifact boundary: this ticket exercises the contracts of ticket 002 (validator findings), `archive/tickets/SPEC110MANSTOSTU-003.md` (filter ordering + why-suggested line), and ticket 004 (route pin → filter). It must land after all three so the surfaces it asserts exist; it introduces no production code.

## Architecture Check

1. A single focused acceptance file keeps the SPEC-110 §Verification matrix traceable in one place, while the migrated fixtures (ticket 001) keep the broader suite green — the two concerns stay separate (migration vs. new-behavior coverage), so a reviewer reads new-field intent without wading through fixture diffs.
2. No backwards-compatibility shim: pure test addition; no production surface changes.

## Verification Layers

1. Validator rejects unknown `pressure_type`, unknown `turn_type`, and `expected_state_review: ["beat-templates"]` with distinct findings → assertions in the new file.
2. Filter ranks a `desired_pressure_type`-matching template above an otherwise-equal non-match; unpinned ordering is unchanged → ordering assertions.
3. `assembleWhySuggested` includes the `pressure: <type>` line when the pin matches → trace assertion.

## What to Change

### 1. New test file `test/templates/beat-template-spec110-fields.test.ts`

- Validator cases: invalid `pressure_type`, invalid `turn_type`, invalid record-class `expected_state_review` entry, and `beat-templates` `expected_state_review` entry (distinct finding from unknown-record-class).
- Filter cases: build two otherwise-equal templates differing only in `pressure_type`; assert the pin-matching one ranks first when `desiredPressureType` is set, and that ordering is identical to the no-pin case otherwise.
- why-suggested case: assert the candidate's `why_suggested` contains a `pressure: <type>` line when the pin matches and omits it otherwise.

## Files to Touch

- `tools/manual-story-studio/test/templates/beat-template-spec110-fields.test.ts` (new)

## Out of Scope

- Production code (tickets 001-006).
- Manual-verification-only surfaces (form round-trip AC#8, card display AC#9) — those are exercised in tickets 005/006 per SPEC-110 §6.

## Acceptance Criteria

### Tests That Must Pass

1. The new file's validator, filter-ordering, and why-suggested assertions all pass.
2. `cd tools/manual-story-studio && npm test` — the new file runs under `node --test dist/test` alongside the existing suite.

### Invariants

1. The new tests assert behavior only through the public surfaces (`validateBeatTemplate`, `filterBeatTemplates`, `assembleWhySuggested`), not internal helpers.
2. The filter-ordering assertions pin determinism (identical inputs → identical order) rather than asserting a single absolute index.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/templates/beat-template-spec110-fields.test.ts` — the focused SPEC-110 acceptance suite described above.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && npm run build:backend && node --test dist/test/templates/beat-template-spec110-fields.test.js` — narrower run of just the new file after build.
