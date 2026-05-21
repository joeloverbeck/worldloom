# SPEC65STOSCHCON-003: Schema↔contract parity snapshot test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (new parity test plus non-behavioral export of an existing validator constant)
**Deps**: archive/tickets/SPEC65STOSCHCON-001.md, archive/tickets/SPEC65STOSCHCON-002.md

## Problem

After archive/tickets/SPEC65STOSCHCON-001.md narrows `SE.state_delta` (in both `story-event.schema.json` and `STATE_DELTA_CLASSES`) and archive/tickets/SPEC65STOSCHCON-002.md closes `PG.state_snapshot.active_records`, three surfaces must enumerate the same 18 active-state classes: the `story-page.schema.json` `active_records` property-key set, the `story-event.schema.json` `state_delta` pattern, and the `state-delta-class-integrity.ts` `STATE_DELTA_CLASSES` set. At intake, nothing failed loudly if a future edit re-widened one surface without the others. The landed parity test now guards the lockstep — without standing up the rejected registry module (SPEC-65 §3).

## Assumption Reassessment (2026-05-21)

1. The three parity sources exist and are edited by Deps 001/002: `tools/validators/src/schemas/story-page.schema.json` (`active_records` keys), `tools/validators/src/schemas/story-event.schema.json` (`state_delta` pattern), `tools/validators/src/structural/state-delta-class-integrity.ts` (`STATE_DELTA_CLASSES`). `tools/validators/tests/` already hosts story-schema tests (e.g. `tests/structural/record-schema-compliance-story-page.test.ts`) — verified this session — so the parity test co-locates naturally.
2. The authoritative 18-class set is `story-record-schemas.md` §4.2/§4.3; this test asserts the three implementation surfaces agree with each other (and therefore with the contract, which 001/002 aligned them to). The test deliberately does NOT introduce a shared `ACTIVE_STATE_CLASSES` constant — that would be the registry SPEC-65 §3 rejected.
3. **Cross-artifact boundary under audit**: the test reads the schema files and the validator constant directly and compares the three derived sets for equality. It is the guard that makes the archive/tickets/SPEC65STOSCHCON-001.md / archive/tickets/SPEC65STOSCHCON-002.md lockstep durable.
4. **FOUNDATIONS §5b Schema-Minimalism**: the contract is the single source of truth; this test enforces that the three enforcement surfaces do not drift from it without a registry — the minimal mechanism that satisfies §5b's intent.
5. Live reassessment found `STATE_DELTA_CLASSES` was private. Exporting the existing constant from `tools/validators/src/structural/state-delta-class-integrity.ts` is non-behavioral and preserves the ticket's direct-constant proof without introducing a new shared registry.

## Architecture Check

1. A snapshot/equality test that parses each surface and compares sets is strictly cheaper than a registry module + generator, and fails loudly on divergence — exactly the SPEC-65 §3 design intent ("minimal parity guard, not a new package").
2. No backwards-compatibility shim; the test reads current artifacts and asserts equality, introducing no production surface.

## Verification Layers

1. Three-surface set equality → schema validation + codebase grep-proof (the test parses `story-page.schema.json` keys, the `story-event.schema.json` `state_delta` alternation, and `STATE_DELTA_CLASSES`, asserting all three equal the same 18-member set).
2. Drift detection → test behavior (mutating any one surface to add/remove a class makes the test fail).
3. Single-production-layer note: this ticket adds only a test; its proof surface is the test's own pass/fail, so no further layer mapping applies.

## Landed Changes

### 1. Add the parity test

Added `tools/validators/tests/structural/story-active-state-parity.test.ts`, which loads `story-page.schema.json`, extracts the `active_records` property-key set, loads `story-event.schema.json`, extracts the `state_delta` create/supersede/close pattern class alternations, imports `STATE_DELTA_CLASSES` from `state-delta-class-integrity.ts`, and asserts all three are the identical 18-member set. The test reads constants/schemas directly — no registry module.

### 2. Export the existing validator class set

Exported `STATE_DELTA_CLASSES` from `tools/validators/src/structural/state-delta-class-integrity.ts` so the parity test can read the live validator allow-list directly. The set contents and validator behavior were not changed.

## Files to Touch

- `tools/validators/tests/structural/story-active-state-parity.test.ts` (new)
- `tools/validators/src/structural/state-delta-class-integrity.ts` (modify — export existing constant only)

## Out of Scope

- Introducing any shared `ACTIVE_STATE_CLASSES` / registry module (rejected at SPEC-65 §3).
- Adding an `alias_bindings` parity dimension (alias-class restriction is schema-only — no second list to cross-check; per archive/tickets/SPEC65STOSCHCON-001.md).
- Any production schema or validator behavior edit (those land in 001/002).

## Acceptance Criteria

### Tests That Must Pass

1. The parity test passes on the post-001/002 state (all three surfaces enumerate the same 18 classes).
2. The parity test fails if any one surface is edited to add or drop a class relative to the others.
3. The `tools/validators` package test lane is green.

### Invariants

1. The three enforcement surfaces (page schema keys, event-delta pattern, validator set) remain mutually equal.
2. No shared registry constant is introduced.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-active-state-parity.test.ts` — new parity test, rationale: fails loudly when a future edit re-widens one surface without the others, replacing the rejected registry with a minimal guard.

### Commands

1. From `tools/validators`: `node --test dist/tests/structural/story-active-state-parity.test.js`
2. From `tools/validators`: `npm test`
3. From `tools/validators`: `npm run build`

## Outcome

Completed 2026-05-21.

- Added the active-state parity test for the page schema `active_records` keys, all three event `state_delta` regexes, and the validator `STATE_DELTA_CLASSES` set.
- Exported the existing `STATE_DELTA_CLASSES` constant so the test reads the live validator allow-list directly.
- Kept the rejected registry/generator out of scope; no schema values or validator behavior changed.

## Verification Result

- `npm run build` from `tools/validators` — PASS after fixing strict TypeScript typing in the new test.
- `node --test dist/tests/structural/story-active-state-parity.test.js` from `tools/validators` — PASS, 1 test.
- `npm test` from `tools/validators` — PASS, 826 tests.

## Deviations

- The drafted file list named only a new test, but direct import of `STATE_DELTA_CLASSES` required exporting the existing constant. This is a non-behavioral source edit, not a new shared registry or schema/validator behavior change.
