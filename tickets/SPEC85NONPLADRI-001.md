# SPEC85NONPLADRI-001: Clock-fire route-closes golden fixture

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

Per SPEC-85, the `clock_fire` non-player driver kind has schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. Today, a regression in the cross-validator composition for a CLK-fired turn (threshold consequence SLT + page-plan §7a + responder CHC + active-pressure handling) would surface only when a real consumer encountered it in production. This ticket lands the authored fixture + integration test for the simplest of the four remaining kinds (single CLK record as the leading driver; player perceives the threshold consequence directly).

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`, `observer_firewall`, `turn_cycle_output_grounding_integrity`) are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`; the same import block + composition pattern carries over to this ticket's new test file. The fixture-load + materialization helper functions (`materializeFixture`, `JSON.parse(readFileSync(FIXTURE_PATH))`, `mkdtempSync` + per-file write loop, `runValidators(SPEC76_VALIDATORS, input(), testContext())`) are the canonical Red Kiln pattern — the new test file mirrors this shape rather than abstracting a shared helper, matching the established sibling-test convention.
2. SPEC-85 §3 Non-goals explicitly forbids schema changes, new validators, and new skill prose — this ticket lands only fixtures + tests and stays within that scope. The `turn_driver` schema at `tools/validators/src/schemas/story-event.schema.json:88-122` (the 8-kind enum + per-kind constraints) is consumed as-is; AC #4 (Red Kiln regression unchanged) requires that no test in this ticket perturbs the existing `spec76-red-kiln-ambush.test.ts` flow.
3. **Cross-skill boundary**: the fixture-shape contract is the shared boundary between this ticket and the SPEC-76 capstone test pattern. The `RedKilnFixture` interface (`world_slug`, `story_slug`, `records[]`, `files[]`) at `spec76-red-kiln-ambush.test.ts:25-35` is the de facto fixture-bundle schema for `tools/validators/tests/fixtures/<kind>-<scenario>/fixture.json` files; this ticket's fixture matches that shape so the same materialization pipeline applies without abstraction debt.
4. **FOUNDATIONS principle**: §Story Bundles §6b "Information / Observer Firewall" governs `pov_visibility` selection. For `clock_fire` with a visible threshold consequence (a route closes, a route becomes hazardous, a tolled gate slams shut), `pov_visibility: perceived_directly` is the canonical setting because the threshold consequence IS the actor's direct observation; no hidden state is referenced. This is consistent with the spec §7 alignment table row ("clock_fire: typically `perceived_directly` for visible threshold consequences").

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent (`spec76-red-kiln-ambush.test.ts` + `red-kiln-ambush/`) rather than introducing a parametrized test harness across kinds. The four kinds have driver-specific structural rules (§4.3 of SPEC-85) that diverge enough — offstage forbids `perceived_directly`, secret_reveal must respect Mystery firewall, multi_actor_collision requires ≥2 driver_records — that a single parametrized table would obscure the per-kind assertions and complicate mutation-suite authoring.
2. **No backwards-compatibility shim** — the fixture is a new artifact; no existing fixture is renamed, no validator import is reshaped. The Red Kiln Ambush capstone test continues to run unchanged.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse (`JSON.parse(readFileSync(...))` at integration-test load time).
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Driver-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation (`assert.ok(verdict.code === "turn_driver_<expected>")`).
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass — verified by running `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js`.

## What to Change

### 1. Create fixture directory `tools/validators/tests/fixtures/clock-fire-route-closes/`

Add two files:

- `README.md` (~20 lines, parallel to `red-kiln-ambush/README.md`): name the scenario (e.g., "Toll-gate clock fires; the only crossing route closes for the night"), the driver kind (`clock_fire`), the leading CLK record at threshold, and the expected PASS / FAIL matrix.
- `fixture.json` (~250-300 lines): a `RedKilnFixture`-shaped JSON bundle with:
  - `world_slug`: e.g., `"clock-fire-route-closes-world"`
  - `story_slug`: e.g., `"clock-fire-route-closes"`
  - `records[]`: minimal world canon (1-2 CFs naming the route + the timed closure mechanism, 1-2 ENTs for the gate + the toll-keeper, 1 INV anchor — typically Causal Invariant naming "the toll gate closes at the threshold tick"), plus story-bundle records (1 STORY, 1 BR, 2 PGs — PG-1 carries `active_records.CLK: [CLK-1]` at threshold; PG-2 is the post-driver page, 1 SE with `event_kind: turn_resolution` + `turn_driver: {kind: clock_fire, initiator: world, driver_records: ["CLK-1"], player_response_mode: responds, pov_visibility: perceived_directly}`, 1 SLT representing the threshold consequence — close-the-route, e.g., a `bound: route_closure` effect — with grounded `compatible_turn_drivers: [clock_fire]` and a non-generic `reason_to_exist`, 1+ CHC in `responds` register grounded in CLK-1).
  - `files[]`: one entry for the page-plan §7a content — `path: "stories/clock-fire-route-closes/_source/pages-prose-plans/PG-2.md"` (or equivalent path matching the test materialization shape), content includes the §7a block per the SPEC-76 `_shared-templates/story-state-contract.md` §8 specification (Driver kind, Initiator, Driver records, Player response mode, POV visibility, Observer-firewall note `n/a — direct threshold consequence`, plus active-pressure disposition table with CLK-1 as `selected`).

### 2. Create integration test `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts`

Mirror `spec76-red-kiln-ambush.test.ts` exactly for structure:

- Import the 6 validators (`turnDriverSchemaCompliance`, `turnDriverPovObserverFirewall`, `pagePlanTurnDriverConsistency`, `activePressureHandlingDiscipline`, `observerFirewall`, `turnCycleOutputGroundingIntegrity`) and the shared `materializeFixture` / `runValidators` / `context` helpers.
- Load fixture via `JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))`.
- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`; `summary.validators_run` contains all 6 validator names.
- **Test 2 — Mutation suite (≥3 mutations)**:
  - **M-1 — Drop CLK from driver_records**: mutate `event.turn_driver.driver_records = []`; assert verdict code `turn_driver_driver_records_empty_for_non_player`.
  - **M-2 — Swap POV visibility to invalid posture**: mutate `event.turn_driver.pov_visibility = "withheld"` AND remove the active-pressure table row for CLK-1 from §7a; assert verdict code `page_plan_active_pressure_table_missing` (or `high_urgency_active_record_unhandled` if the §7a table exists but omits the CLK row).
  - **M-3 — Remove the response CHC**: drop the CHC from `active_records.CHC` AND from the records list; assert verdict code from `turn_cycle_output_grounding_integrity` (the missing response on a non-player-driver page) — specifically, a code indicating no emitted CHC materially responds to the driver.

### 3. Acceptance via `npm test`

The package's `npm test` script runs `tsc` build + the full `node --test` suite — the new integration test executes alongside the existing 5+ integration tests and adds to the validator package's passing-test count without perturbing siblings.

## Files to Touch

- `tools/validators/tests/fixtures/clock-fire-route-closes/README.md` (new)
- `tools/validators/tests/fixtures/clock-fire-route-closes/fixture.json` (new)
- `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts` (new)

## Out of Scope

- Schema changes to `story-event.schema.json` or any other JSON schema (SPEC-85 §3 Non-goals).
- New validator code, new validator codes, or modifications to the 6 driver-primitive validators (SPEC-85 §3).
- Skill prose changes to `branching-story-turn-cycle`, `branching-story-bootstrap`, or `branching-story-health-audit`.
- The prose-attach hidden-mind-leak validator (SPEC-85 §3; deferred until a real renderer emits non-player-driver prose).
- Fixtures for the other three kinds (`offstage_action`, `secret_reveal`, `multi_actor_collision`) — landed in sibling tickets SPEC85NONPLADRI-002, -003, -004.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-clock-fire-route-closes.test.js` — both the PASS test and the mutation suite pass.
2. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — Red Kiln regression unchanged (no perturbation from the new fixture or test file).
3. `cd tools/validators && npm test` — full suite passes (typecheck via `tsc` + full `node --test` run).

### Invariants

1. The `clock-fire-route-closes/fixture.json` matches the `RedKilnFixture` shape (`world_slug`, `story_slug`, `records[]`, `files[]`) consumed by the shared materialization pattern.
2. The 6 driver-primitive validator composition produces zero verdicts on the unmutated fixture and produces exactly the expected SPEC-76 verdict code on each mutation.
3. The fixture's leading driver record is a single CLK at threshold; no SREL or STCHAR appears as the leading record (per SPEC-76 §3.6.4 "SREL / STCHAR scope" rule — supporting only, never leading).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `clock_fire`-specific PASS + ≥3 FAIL mutations.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-clock-fire-route-closes.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification (typecheck + full test suite per `tools/validators/package.json:25-26`).
3. The narrower targeted command is the right verification boundary for this ticket because the test is independent of every other test in the package; the full-suite invocation only adds the Red Kiln regression and the package's existing schema / structural / integration coverage as orthogonal sanity gates.
