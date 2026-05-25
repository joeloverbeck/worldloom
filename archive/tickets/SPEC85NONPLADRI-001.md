# SPEC85NONPLADRI-001: Clock-fire route-closes golden fixture

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

At intake, the `clock_fire` non-player driver kind had schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. This ticket landed the authored fixture + integration test for the simplest of the four remaining kinds (single CLK record as the leading driver; player perceives the threshold consequence directly).

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`, `observer_firewall`, `turn_cycle_output_grounding_integrity`) are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`; the same import block + composition pattern carries over to this ticket's new test file. The fixture-load + materialization helper functions (`materializeFixture`, `JSON.parse(readFileSync(FIXTURE_PATH))`, `mkdtempSync` + per-file write loop, `runValidators(SPEC76_VALIDATORS, input(), testContext())`) are the canonical Red Kiln pattern — the new test file mirrors this shape rather than abstracting a shared helper, matching the established sibling-test convention.
2. SPEC-85 §3 Non-goals explicitly forbids schema changes, new validators, and new skill prose — this ticket lands only fixtures + tests and stays within that scope. The `turn_driver` schema at `tools/validators/src/schemas/story-event.schema.json:88-122` (the 8-kind enum + per-kind constraints) is consumed as-is; AC #4 (Red Kiln regression unchanged) requires that no test in this ticket perturbs the existing `spec76-red-kiln-ambush.test.ts` flow.
3. **Cross-skill boundary**: the fixture-shape contract is the shared boundary between this ticket and the SPEC-76 capstone test pattern. The `RedKilnFixture` interface (`world_slug`, `story_slug`, `records[]`, `files[]`) at `spec76-red-kiln-ambush.test.ts:25-35` is the de facto fixture-bundle schema for `tools/validators/tests/fixtures/<kind>-<scenario>/fixture.json` files; this ticket's fixture matches that shape so the same materialization pipeline applies without abstraction debt.
4. **FOUNDATIONS principle**: §Story Bundles §6b "Information / Observer Firewall" governs `pov_visibility` selection. For `clock_fire` with a visible threshold consequence (a route closes, a route becomes hazardous, a tolled gate slams shut), `pov_visibility: perceived_directly` is the canonical setting because the threshold consequence IS the actor's direct observation; no hidden state is referenced. This is consistent with the spec §7 alignment table row ("clock_fire: typically `perceived_directly` for visible threshold consequences").
5. **Live fixture/proof correction**: the Red Kiln precedent is a minimal validator-structural fixture, not a complete schema/full-world bundle: `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` has `world_slug`, `story_slug`, structural `records[]`, and `files[]`, but does not include STORY/BR/world-canon/SLT records because the six driver validators do not consume them. This ticket therefore follows the live fixture contract and keeps any unconsumed full-bundle records out of the implementation.
6. **Mutation-suite correction**: `turn_cycle_output_grounding_integrity` does not fail merely because a non-player driver creates no CHC; it validates topical grounding for created CHCs when `player_response_mode: responds`. The response mutation must therefore keep a created CHC and change its `grounded_in.records` away from the CLK driver record, expecting `chc_response_topical_grounding_missing`.

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent (`spec76-red-kiln-ambush.test.ts` + `red-kiln-ambush/`) rather than introducing a parametrized test harness across kinds. The four kinds have driver-specific structural rules (§4.3 of SPEC-85) that diverge enough — offstage forbids `perceived_directly`, secret_reveal must respect Mystery firewall, multi_actor_collision requires ≥2 driver_records — that a single parametrized table would obscure the per-kind assertions and complicate mutation-suite authoring.
2. **No backwards-compatibility shim** — the fixture is a new artifact; no existing fixture is renamed, no validator import is reshaped. The Red Kiln Ambush capstone test continues to run unchanged.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse (`JSON.parse(readFileSync(...))` at integration-test load time).
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Driver-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation (`assert.ok(verdict.code === "turn_driver_<expected>")`).
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass — verified by running `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js`.

## Landed Changes

### 1. Created fixture directory `tools/validators/tests/fixtures/clock-fire-route-closes/`

Added two files:

- `README.md` (~20 lines, parallel to `red-kiln-ambush/README.md`): name the scenario (e.g., "Toll-gate clock fires; the only crossing route closes for the night"), the driver kind (`clock_fire`), the leading CLK record at threshold, and the expected PASS / FAIL matrix.
- `fixture.json`: a `RedKilnFixture`-shaped structural JSON bundle with:
  - `world_slug`: e.g., `"clock-fire-route-closes-world"`
  - `story_slug`: e.g., `"clock-fire-route-closes"`
  - `records[]`: the minimal story-bundle structural records consumed by the six validators: 2 PGs — PG-1 carries `active_records.CLK: [CLK-1]` at threshold; PG-2 is the post-driver page, 1 SE with `event_kind: turn_resolution` + `turn_driver: {kind: clock_fire, initiator: world, driver_records: ["CLK-1"], player_response_mode: responds, pov_visibility: perceived_directly}`, 1 CLK driver record, 1+ CHC in `responds` register grounded in CLK-1, and supporting active records only when required by the validator surface.
  - `files[]`: one entry for the page-plan §7a content — `path: "stories/clock-fire-route-closes/pages-prose-plans/PG-2.md"`, content includes the §7a block per the SPEC-76 `_shared-templates/story-state-contract.md` §8 specification (Driver kind, Initiator, Driver records, Player response mode, POV visibility, an observer-firewall note for the directly perceived threshold consequence, plus active-pressure disposition table with CLK-1 as `selected`).

### 2. Created integration test `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts`

Mirrors `spec76-red-kiln-ambush.test.ts` for structure:

- Import the 6 validators (`turnDriverSchemaCompliance`, `turnDriverPovObserverFirewall`, `pagePlanTurnDriverConsistency`, `activePressureHandlingDiscipline`, `observerFirewall`, `turnCycleOutputGroundingIntegrity`) and the shared `materializeFixture` / `runValidators` / `context` helpers.
- Load fixture via `JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))`.
- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`; `summary.validators_run` contains all 6 validator names.
- **Test 2 — Mutation suite (≥3 mutations)**:
  - **M-1 — Drop CLK from driver_records**: mutate `event.turn_driver.driver_records = []`; assert verdict codes `turn_driver_driver_records_empty_for_non_player` and `turn_driver_initiator_pattern_violation` because the same edit also violates the `clock_fire` requirement that driver records include a CLK.
  - **M-2 — Omit the CLK active-pressure row**: remove CLK-1's row from §7a while leaving the active-pressure table present; assert verdict code `high_urgency_active_record_unhandled`.
  - **M-3 — Break response topical grounding**: keep the response CHC created by the event but mutate its `grounded_in.records` away from CLK-1; assert verdict code `chc_response_topical_grounding_missing`.

### 3. Acceptance via `npm test`

The package's `npm test` script runs `tsc` build + the full `node --test` suite. The new integration test executes alongside the existing integration tests and raises the passing-test count from 1013 to 1015 without perturbing siblings.

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

## Outcome

Completed: 2026-05-25

Landed a new `clock_fire` golden fixture and integration test:

- `tools/validators/tests/fixtures/clock-fire-route-closes/README.md`
- `tools/validators/tests/fixtures/clock-fire-route-closes/fixture.json`
- `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts`

The fixture models a thresholded route-closing clock on parent `PG-1`, a `clock_fire` turn-resolution event on `PG-2`, page-plan §7a projection, and a response CHC grounded in `CLK-1`. The test composes the six SPEC-76 driver primitive validators and verifies the PASS case plus three mutation families.

## Verification Result

Commands run from `tools/validators`:

1. `npm run build && node --test dist/tests/integration/spec85-clock-fire-route-closes.test.js dist/tests/integration/spec76-red-kiln-ambush.test.js` — PASS; both compiled integration files passed.
2. `npm test` — PASS; 1015/1015 tests passed.

## Deviations

- The drafted fixture text expected a complete full-world/story bundle with STORY/BR/world-canon/SLT records. Live Red Kiln precedent is a minimal structural fixture consumed by the six validators, so the landed fixture follows that live contract and includes only records the proof surface consumes.
- The drafted response mutation expected failure from removing a CHC. Live `turn_cycle_output_grounding_integrity` validates topical grounding for created response CHCs rather than requiring a response CHC to exist, so the landed mutation keeps the CHC and grounds it away from `CLK-1`, producing `chc_response_topical_grounding_missing`.
- The empty-driver-record mutation truthfully emits both `turn_driver_driver_records_empty_for_non_player` and `turn_driver_initiator_pattern_violation`; both are asserted because the same edit violates the non-player non-empty rule and the `clock_fire` CLK-record requirement.
