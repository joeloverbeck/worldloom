# SPEC46STOPIPMAC-015: Phase C end-to-end build regression on SPEC-45 fixture pattern

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/tests/types.test.ts` (verify existing registry-completeness assertion already updated by ticket 013), `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (new integration test following SPEC-45 fixture pattern)
**Deps**: archive/tickets/SPEC46STOPIPMAC-014.md

## Problem

After all Phase C implementation tickets 006-013 landed plus the docs ticket 014, the spec's §Test Plan T-6 (registry completeness) and T-8 (end-to-end rebuild) capstone checks needed to pass: `STORY_EDGE_TYPES.length === 36`, `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length` (no duplicates), and `world-index build` on a representative test world producing the 22 new edge rows where expected and zero new edge rows where the source fields are empty. Ticket 013 already updated the live `tools/world-index/tests/types.test.ts` registry assertion to the 36-story-edge / 51-total-edge count because the existing package suite asserted the registry total. This ticket is the §Spec-Integration Ticket Shape capstone for Phase C: it verifies that registry assertion and adds the end-to-end SPEC-46 build regression without introducing production code, with `Deps: archive/tickets/SPEC46STOPIPMAC-014.md` per the transitive-head convention.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts` declares `STORY_EDGE_TYPES`; post-Phase-C it carries 36 entries (14 pre-Phase-C + 22 new from tickets 006-013). `tools/world-index/tests/types.test.ts` is the existing test file for STORY_EDGE_TYPES registry assertions and already asserts the 36 / 51 counts after ticket 013. `tools/world-index/tests/integration/spec45-atomic-integration.test.ts` is the canonical pattern for end-to-end build regression — fixture-world setup in a temp root, build via `build` command from `../../src/commands/build.js`, query the built `world.db` via better-sqlite3, assert edge expectations.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Test Plan T-6 specifies the registry-completeness assertion (`STORY_EDGE_TYPES.length === 36` and `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length`); T-8 specifies the end-to-end rebuild assertion. §Deliverable D-X1 names this ticket as the cross-phase deliverable.
3. Cross-skill boundary: the capstone validates the full Phase C pipeline composed by tickets 006-013. The integration test fixture is a self-contained story-bundle fixture that exercises records of every Phase C class (BEL, SREL, STINT, STSTAT, CLK, STSEC, STQ, SE) with populated and empty source fields per edge type. The `Deps: 014` transitive-head wiring is per spec-to-tickets §Spec-Integration Ticket Shape: 014 depends on 006-013, so transitively reaches the full implementation chain; the linear-chain DAG condition is satisfied (no parallel branches beyond 014 — Phase B is parallel to Phase C, but Phase B is not exercised by D-X1's build regression which is index-only).
4. FOUNDATIONS §Rule 4 (No Globalization by Accident) motivates the capstone's bundle-isolation assertion: every new edge row in the rebuilt `world.db` carries `story_slug` matching the fixture world's story; no cross-bundle edge leakage. FOUNDATIONS §Tooling Recommendation is operationally validated by the test — the new edges ARE queryable via the index after build.

## Architecture Check

1. §Spec-Integration Ticket Shape compliance — single trailing ticket; no new production code; acceptance criteria enumerate spec §Test Plan bullets (T-6 + T-8 here) as test sub-cases; the fixture world is created under a temp root so the real `worlds/<slug>/` tree is untouched; re-enumerated expected counts (not hardcoded) compute the per-edge expected count from the fixture at test start. Alternative considered: bundle each per-class test as part of its per-class ticket — rejected because the end-to-end build regression is intrinsically cross-class (it validates the full registry + extractor + edge-emission pipeline post-Phase-C) and naturally lives in one capstone ticket.
2. No backwards-compatibility aliasing or shims introduced. The capstone is test-only.

## Verification Layers

1. **Registry completeness (T-6)** → schema validation: `tools/world-index/tests/types.test.ts` asserts `STORY_EDGE_TYPES.length === 36` and `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length`.
2. **End-to-end rebuild — positive (T-8 positive half)** → skill dry-run via `world-index build` on a SPEC-46-pattern fixture: for each of the 22 new edge types, the rebuilt `world.db` contains the expected edge rows; expected counts are computed from the fixture at test start, not hardcoded.
3. **End-to-end rebuild — negative (T-8 negative half)** → skill dry-run: for each edge type whose source field is empty in the fixture, zero rows of that type appear in the rebuilt `world.db` (validates the negative cases at end-to-end scope, paralleling the unit-level negative tests in tickets 006-013).
4. **Bundle isolation (FOUNDATIONS §Rule 4 discipline)** → schema validation: every new edge row carries `story_slug` matching the fixture's story slug; no edge row has empty or cross-bundle `story_slug`.
5. **No regression on pre-Phase-C edges** → the capstone fixture asserts every one of the 14 pre-Phase-C story-edge families still emits at least one row after the Phase C expansion.

## What to Change

### 1. Verify the registry-completeness assertion in `tools/world-index/tests/types.test.ts`

Verified `tools/world-index/tests/types.test.ts` asserts `STORY_EDGE_TYPES.length === 36`, `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length`, and the total edge registry count after ticket 013. No additional edit was needed in that file for this ticket.

### 2. Create `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts`

Added `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` following the SPEC-45 integration pattern:
- Creates a temp atomic world through `createAtomicRepoRoot`, then adds a self-contained SPEC-46 story bundle.
- Builds the index via `build` from `../../src/commands/build.js`.
- Opens the resulting `world.db` via better-sqlite3.
- For each of the 22 new edge types, queries the edges table and asserts the expected row count matches the fixture's source-field count computed at test start.
- Asserts zero rows emit from fixture records whose source fields are empty or placeholder-valued.
- Asserts every checked edge row's `story_slug` matches the fixture story slug.
- Asserts every one of the 14 pre-Phase-C story-edge families still emits at least one row from the fixture.

### 3. Build the fixture story-bundle

Inside the new integration test, constructed a temp story-bundle fixture that exercises records of every Phase C class with populated and empty source fields per edge type. It includes:
- BEL records with various combinations of `holder`, `basis.source_event`, `basis.access_records[]`, `consequences.opens[]` populated and empty.
- SREL records with 2-participant arrays and `derived_from[]` populated.
- STINT records with supersession chains.
- STSTAT records with entity bindings.
- CLK records with `linked_records[]`, `driver: STENT-...` AND `driver: system` / `driver: group:<name>`, and `tick_history[]` populated.
- STSEC records with `truth_anchor` populated AND null; `holders: [STENT-..., group:..., narrator]`; `clue_carriers[]` populated; `reveal_records[]` populated and empty.
- STQ records with `source_records[]`, scalar `payoff_of` chains, and `answer_records[]` populated.
- SE records with `actor`, `targets[]`, `commitment.selected_slt_id` populated AND audit-only events with null selected storylets.

## Files to Touch

- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (new — capstone integration test following SPEC-45 fixture pattern)

## Out of Scope

- Production code changes: covered by sibling tickets 006-013.
- Phase A and Phase B regression validation — Phase A's MCP-side fix is validated by ticket 001's own tests; Phase B's MCP-side summary fields are validated by tickets 002/003/004's own tests; only Phase C's index-side edge extraction is in scope for this capstone (D-X1 explicitly targets `world-index build`).
- Performance assertions — spec §T-7 / §T-8 do not name a perf gate; build regression validates correctness, not wall-clock.
- FOUNDATIONS-compliance lint (spec §T-10) — that's a separate orthogonal lint that does not depend on the end-to-end build; track as a follow-up if needed.

## Acceptance Criteria

### Tests That Must Pass

1. T-6 registry completeness: `STORY_EDGE_TYPES.length === 36` and `new Set(STORY_EDGE_TYPES).size === STORY_EDGE_TYPES.length`.
2. T-8 end-to-end rebuild positive: for each of the 22 new edge types, the rebuilt fixture-world `world.db` contains the expected edge rows; expected counts computed from fixture at test start (no hardcoding).
3. T-8 end-to-end rebuild negative: for each edge type with empty source fields in the fixture, zero rows of that type emit for those records.
4. Bundle-isolation: every new edge row carries `story_slug` matching the fixture's story slug; no cross-bundle leakage.
5. Pre-Phase-C edge preservation: each of the 14 pre-Phase-C story-edge families still emits at least one row from the fixture.
6. `npm test` from `tools/world-index` passes for the full world-index test suite including the new integration test.
7. `npm run build` from `tools/world-index` typechecks cleanly.

### Invariants

1. The registry-completeness assertion is the canonical T-6 surface — any future addition to `STORY_EDGE_TYPES` MUST update both the const and this assertion or the test fails (audit-trail discipline for the registry).
2. Per-edge expected counts for the 22 Phase C edge types are computed from the fixture's source-field state at test start; hardcoded counts are forbidden because they become stale as the fixture grows (spec §Spec-Integration Ticket Shape discipline).
3. The fixture world is rooted in a temp directory created by `createAtomicRepoRoot`, so the real `worlds/<slug>/` tree is untouched — parallels SPEC-45's temp-fixture discipline.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` — new capstone integration test following SPEC-45 fixture pattern; exercises every Phase C edge type with populated and empty source fields; asserts T-6 + T-8 + bundle isolation + pre-Phase-C edge preservation.
2. `tools/world-index/tests/types.test.ts` — reviewed as the existing T-6 registry assertion; no current-run edit required because ticket 013 already updated it.

### Commands

1. `npm test` from `tools/world-index` (targeted: full world-index test suite passes including the new T-6 registry assertion AND the new integration test)
2. `npm run build` from `tools/world-index` (typechecks the test file)

## Outcome

Completed: 2026-05-18

The Phase C capstone is landed in `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts`. The new integration test creates a temp atomic world, adds a SPEC-46 story bundle covering BEL, SREL, STINT, STSTAT, CLK, STSEC, STQ, and SE records, runs the real `build` command, and checks the rebuilt SQLite edge rows.

The test computes expected counts for all 22 new Phase C edge types from the fixture source at test start, asserts empty/placeholder source records emit zero matching rows, verifies bundle isolation through `story_slug`, and confirms every pre-Phase-C story-edge family still emits from the fixture.

## Verification Result

- `npm run build` from `tools/world-index` — passed.
- `npm test` from `tools/world-index` — passed, 119 tests.

## Deviations

- The pre-Phase-C preservation check asserts that each of the 14 original story-edge families still emits from the capstone fixture rather than exact old-edge counts. The exact computed-count assertion is retained for the 22 new Phase C edge types, which are this ticket's owned capstone surface.
- The drafted manual CLI smoke was not kept as an active acceptance command. The new integration test invokes the same package `build` command directly against a temp fixture, and the existing package CLI smoke tests continue to cover the operator CLI surface.
