# SPEC44STOSTAAPP-009: SPEC-44 integration test — append-only supersession across 7 lifecycle scenarios + new validator coverage

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: No production code introduced — adds `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` exercising the post-SPEC-44 contract end-to-end. Parallels the existing `spec43-midstory-introduction.test.ts` integration test.
**Deps**: archive/tickets/SPEC44STOSTAAPP-003.md, archive/tickets/SPEC44STOSTAAPP-004.md, archive/tickets/SPEC44STOSTAAPP-006.md, archive/tickets/SPEC44STOSTAAPP-007.md, archive/tickets/SPEC44STOSTAAPP-008.md

## Problem

SPEC-44 introduces three structural changes (Phase 1 schema corrections, Phase 2 append-only enforcement, Phase 3 validator additions/reassessment) that interact at runtime: the schema fix (ticket 001) is backstopped by the `state_delta_class_integrity` validator (ticket 004); the lifecycle op removal (ticket 002) is backstopped by the `no_story_state_in_place_mutation` validator (ticket 003); the Phase 3 surfaces gate page-affordance integrity (ticket 006), preserve the existing `expected_witness_coverage` propagation gate (ticket 007), and add active-records shape completeness (ticket 008).

An integration test covering the 7 lifecycle scenarios via supersession (clock tick, clock resolution, secret clue carrier append, secret clue discovery, secret reveal, question answer, question abandon) plus the new validator firing scenarios end-to-end ensures the runtime contract holds at the pipeline boundary, not just at the per-validator unit-test level. Per SPEC-44 §Verification End-to-end + §Approach Phase 2 step 9: "The five-skill story-pipeline regression suite ... runs against the red-bunny bundle without failures attributable to this spec's changes."

The integration test is the SPEC-44 capstone; it parallels the existing `spec43-midstory-introduction.test.ts` capstone for SPEC-43.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` exists as the SPEC-43 capstone integration test; the new `spec44-*.test.ts` follows the same convention. `tools/validators/dist/tests/integration/` already contains the SPEC-43 `.js` build output (verified via direct ls), so the test-build pipeline supports adding the new file. The integration test runs against synthetic fixture bundles built in-test (the SPEC-43 test pattern); it does NOT depend on the real `worlds/<slug>/` tree.
2. SPEC-44 §Verification covers the test matrix: each of the 7 lifecycle scenarios authored via supersession (new `<class>-<N+1>.yaml` + `supersedes: <class>-<N>` + state_delta references) must validate clean; each SPEC-44 enforcement surface (`no_story_state_in_place_mutation`, `state_delta_class_integrity`, `page_affordance_integrity`, existing `expected_witness_coverage`, `active_records_full_shape`) must fire its expected verdict. Per SPEC-44 §Verification End-to-end the red-bunny bundle CLI run is the smoke test: `fail_count: 0`, `warn_count` may increase (from ticket 008's new warn-level diagnostic), `info_count` unchanged.
3. **Cross-boundary surface under audit**: this integration test spans patch-engine (validates the supersession authoring path lands clean) + validators (the SPEC-44 new validators plus existing `expected_witness_coverage`) + the existing compatibility-drift validator (coexistence with the new warn-level diagnostic). The test exercises the runtime composition that SPEC-44's three phases collectively establish.
4. **FOUNDATIONS principle**: §Story Bundles §8 (atomic YAML records append-only at the filesystem level) — the integration test verifies that the entire SPEC-44 deliverable preserves the rule end-to-end. The 7 supersession scenarios are the operationalization of the rule; the validators are the structural enforcement; the integration test is the runtime proof.

## Architecture Check

1. **Integration test complements per-validator unit tests.** Unit tests (tickets 003 / 004 / 006 / 007 / 008) verify each validator's discrimination logic in isolation; the integration test verifies the validators compose without interference and that the runtime contract holds end-to-end. The two layers are complementary.
2. **Fixture-world isolation per §Spec-Integration Ticket Shape.** The integration test uses `fs.cpSync` to copy a fixture-world tree to a temp root for each scenario; assertions run against the temp tree. The real `worlds/<slug>/` tree is never touched.
3. **Re-enumerated expected counts per §Spec-Integration Ticket Shape.** Verdict counts are computed from the fixture at test start (e.g., "fixture bundle has 3 PG records → active_records_full_shape should fire 3×N warn verdicts where N is the count of missing classes per PG"); no hardcoded counts that go stale as the fixture changes.

## Verification Layers

1. **7 lifecycle scenarios via supersession validate clean** → integration test: for each of (clock tick, clock resolution, secret clue carrier append, secret clue discovery, secret reveal, question answer, question abandon), build a patch plan that authors a new `<class>-<N+1>.yaml` with `supersedes: <class>-<N>` and exercises the SE state_delta references. Assert the plan validates clean (no `fail`-level verdicts from any SPEC-44 validator).
2. **`no_story_state_in_place_mutation` fires on synthetic in-place attempt** → integration test: build a patch plan that (hypothetically) targets an existing `_source/clocks/CLK-2.yaml` file. Assert ticket 003's validator returns `fail`.
3. **`state_delta_class_integrity` fires on synthetic class drift** → integration test: build an SE record with `state_delta.create: [INVALID-1]`. Assert ticket 004's validator returns `fail`.
4. **`page_affordance_integrity` fires on synthetic duplicate ordinal** → integration test: build a PG record with two affordances sharing `ordinal: 2`. Assert ticket 006's validator returns `fail`.
5. **`expected_witness_coverage` fires on synthetic uncovered propagation** → integration test: build an SE/direct-witness fixture where computed direct witnesses receive no same-event BEL coverage and no matching `non_propagation:` tag. Assert the existing validator returns `fail`.
6. **`active_records_full_shape` fires per missing class at warn severity** → integration test: build a PG record missing CLK / STSEC / STQ / DA keys. Assert ticket 008's validator returns 4 `warn` verdicts.
7. **Red-bunny bundle CLI smoke test** → command: `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits 0 with `fail_count: 0`; `warn_count` may increase from ticket 008's new diagnostic (document expected count in test commentary); `info_count` unchanged.

## What to Change

### 1. Author the integration test module

Create `tools/validators/tests/integration/spec44-append-only-supersession.test.ts`. The module follows the SPEC-43 integration test's structure: synthetic fixture bundles built via in-test helpers (or a `tests/fixtures/spec44/` directory if fixture files are needed); per-scenario test cases asserting verdict counts and severities.

Test cases:

- **Scenario 1: Clock tick via supersession** — Author a fixture PG with `CLK-2` (value 2/6, status active). Build a patch plan that creates `CLK-3` (value 3/6, `supersedes: CLK-2`) plus an SE with `state_delta: { create: [CLK-3], supersede: [CLK-2], close: [] }`. Assert plan validates clean.
- **Scenario 2: Clock resolution via supersession** — Author `CLK-3` (value 3/6, status active) → author `CLK-4` (status: "resolved", resolution_event: SE-X, supersedes: CLK-3) + SE with appropriate state_delta. Assert clean.
- **Scenario 3: Secret clue carrier append via supersession** — Author `STSEC-4` with one clue_carrier → author `STSEC-5` with two clue_carriers, supersedes: STSEC-4. Assert clean.
- **Scenario 4: Secret clue discovery via supersession** — Author `STSEC-5` with clue_carrier status "available" → author `STSEC-6` with same carrier status "discovered", supersedes: STSEC-5. Assert clean.
- **Scenario 5: Secret reveal via supersession** — Author `STSEC-6` (status hidden) → author `STSEC-7` (status revealed, reveal_event SE-X, reveal_records [BEL-12, SF-3], supersedes: STSEC-6). Assert clean.
- **Scenario 6: Question answer via supersession** — Author `STQ-3` (status open) → author `STQ-4` (status answered, answer_event SE-X, answer_records [...], supersedes: STQ-3). Assert clean.
- **Scenario 7: Question abandon via supersession** — Author `STQ-4` → author `STQ-5` (status abandoned, abandonment_rationale "...", supersedes: STQ-4). Assert clean.
- **Validator fire 1: in-place mutation attempt** — Hypothetical patch plan staging a write to existing `CLK-2.yaml`. Assert `no_story_state_in_place_mutation` returns `fail`.
- **Validator fire 2: state_delta class drift** — SE with `state_delta.create: [BADCLASS-1]`. Assert `state_delta_class_integrity` returns `fail`.
- **Validator fire 3: page affordance duplicate ordinal** — PG with two affordances sharing `ordinal: 2`. Assert `page_affordance_integrity` returns `fail`.
- **Validator fire 4: expected witness propagation uncovered** — SE/direct-witness fixture with no same-event BEL covering the computed witness group and no matching `non_propagation:` tag. Assert `expected_witness_coverage` returns `fail`.
- **Validator fire 5: active_records shape gap** — PG with `active_records` missing CLK / STSEC / STQ / DA. Assert `active_records_full_shape` returns 4 `warn` verdicts (one per missing class).
- **CLI smoke test**: invoke `world-validate.js` against a fixture-world copy; assert exit code 0 and `fail_count: 0`.

### 2. Add fixture files (if needed)

If the synthetic scenarios require pre-built fixture YAML files (rather than in-test object construction), create them under `tools/validators/tests/fixtures/spec44/`. Follow the SPEC-43 fixture-layout convention.

## Files to Touch

- `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` (new)
- `tools/validators/tests/fixtures/spec44/` (new directory; one fixture file per scenario if in-test object construction is impractical)

## Out of Scope

- Modifying any of the SPEC-44 validators (owned by tickets 003 / 004 / 006 / 007 / 008).
- Modifying the patch-engine (owned by ticket 002).
- Modifying the turn-cycle skill prose (owned by ticket 005).
- End-to-end test of the full story-pipeline (bootstrap → turn → prose-attach → health-audit → promotion-closeout) — spec verification step "the five-skill story-pipeline regression suite runs against the red-bunny bundle without failures" is satisfied by the CLI smoke test (verification layer 7), not by a re-implementation of the five-skill flow in this test.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- spec44-append-only-supersession` passes all 12 test scenarios (7 supersession + 5 enforcement-surface fires).
2. `npm test --prefix tools/validators` exits 0 (full validator suite regression).
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits 0 with `fail_count: 0`.
4. `npm run build --prefix tools/validators` exits 0.

### Invariants

1. All 7 lifecycle transitions (clock tick / clock resolution / secret clue carrier append / secret clue discovery / secret reveal / question answer / question abandon) succeed via supersession (new `<class>-<N+1>.yaml` with `supersedes: <class>-<N>`); the prior records remain on disk unmodified.
2. The SPEC-44 enforcement surfaces (`no_story_state_in_place_mutation` / `state_delta_class_integrity` / `page_affordance_integrity` / `expected_witness_coverage` / `active_records_full_shape`) fire at their expected severity on synthetic failure scenarios.
3. The red-bunny bundle CLI smoke test exits clean — no SPEC-44-attributable regression in the existing-bundle validation surface.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` (new) — 12 test scenarios per §What to Change step 1.
2. `tools/validators/tests/fixtures/spec44/` (new) — fixture files if needed.
3. No modifications to existing tests (parallel to how SPEC-43's integration test landed without touching prior integration tests).

### Commands

1. `npm test --prefix tools/validators -- spec44-append-only-supersession` — targeted integration test.
2. `npm test --prefix tools/validators` — full validator suite regression.
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` — red-bunny CLI smoke test (per SPEC-44 §Verification End-to-end).
4. `npm run build --prefix tools/validators` — compilation check.
