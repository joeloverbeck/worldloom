# SPEC85NONPLADRI-004: Multi-actor-collision confrontation golden fixture

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

Per SPEC-85, the `multi_actor_collision` non-player driver kind has schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. Today, a regression in the multi-actor-collision composition (≥2 driver records from distinct STENTs colliding at the parent PG snapshot + page-plan §7a active-pressure disposition table covering every colliding record + local-salience resolution SLT, never a global drama-manager plan) would surface only when a real consumer encountered it in production. This ticket lands the authored fixture + integration test for the most complex of the four remaining kinds: the active-pressure table carries multiple selected / deferred / rejected rows, and the schema requires `driver_records` to span ≥2 distinct STENTs (per SPEC-76 §3.1 `kind = multi_actor_collision requires driver_records non-empty with records from at least two distinct STENTs`).

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`; the import block + composition pattern carries over. The kind-specific schema constraint `multi_actor_collision requires initiator = unknown, driver_records non-empty with records from at least two distinct STENTs` (per SPEC-76 §3.1) is structurally enforced; mutations dropping below 2 driver_records trigger the existing schema-compliance validator.
2. SPEC-85 §3 Non-goals + §4.3 driver-specific rule for `multi_actor_collision` ("`driver_records[]` has ≥2 entries; the collision is between currently-active pressures in the parent PG snapshot (not authored conflict); the selected SLT resolves the local collision — no target-narrative-shape language") forbid schema changes and rely on the existing validator composition. The §3 Non-goals also explicitly excludes cross-driver-kind composition fixtures because "multi_actor_collision IS the cross-kind case; further mixtures are speculative."
3. **Cross-skill boundary**: the fixture-shape contract (`RedKilnFixture` interface) is the shared boundary with the SPEC-76 capstone test pattern; same pipeline applies. The page-plan §7a active-pressure disposition table is the structural surface this kind exercises most heavily — every colliding record AND every uninvolved high-urgency active record must appear in the table per the `active_pressure_handling_discipline` validator (SPEC-76 §3.6.4 codes: `high_urgency_active_record_unhandled`, `active_pressure_rejection_reason_missing`, `active_pressure_deferred_without_expiry`, `active_pressure_disposition_unknown`).
4. **FOUNDATIONS principle**: §Story Bundles §5c "Driver salience is local" — multi-actor collision is the engine-scope expression of local-salience-only resolution. The fixture's SLT must resolve the collision via a local move (e.g., one of the colliding actors prevails, the player is forced to choose sides, the collision tips a clock), never via a global "preserve Act II midpoint" or "advance to climax" pattern. The mutation suite includes at least one mutation that exposes a target-narrative-shape framing (e.g., adding a forbidden `arc_contract` or `dramatic_unit` field to the SLT — schema-rejected by the existing `narrative-shape-field-rejection.ts` structural backstop) so the fixture proves §5c's mechanism IS being exercised, not merely declared.

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent. The multi-actor-collision kind's structural concerns (≥2 STENTs in driver_records, active-pressure table with ≥3 rows including the colliding records, local-salience-only SLT) are heavier than the other three kinds and benefit most from a kind-specific fixture's concrete authoring.
2. **No backwards-compatibility shim** — new artifact; no existing fixture or validator import is reshaped. The `narrative-shape-field-rejection` validator at `tools/validators/src/structural/narrative-shape-field-rejection.ts` is consumed as-is; this ticket adds a mutation that exercises it, not a modification.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse at integration-test load time.
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Multi-actor-collision-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation.
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass.

## What to Change

### 1. Create fixture directory `tools/validators/tests/fixtures/multi-actor-collision-confrontation/`

Add two files:

- `README.md` (~20 lines): name the scenario ("Two rivals' STPLANs collide at the player's location: a creditor demands payment as a smuggler arrives to deliver contraband — the player must choose"), the driver kind (`multi_actor_collision`), the ≥2 colliding STENTs + their respective STPLANs / CLKs / OBLs that collide, the active-pressure disposition table preview, and the expected PASS / FAIL matrix.
- `fixture.json` (~280-320 lines — slightly larger than other kinds due to richer active-records snapshot): a `RedKilnFixture`-shaped JSON bundle with:
  - `records[]`: minimal world canon (1-2 CFs naming the parallel pressures' world-canon basis, 2 ENTs for the two rival actors, 1-2 INV anchors), plus story-bundle records (1 STORY, 1 BR, 2 PGs — PG-1 carries `active_records.STPLAN: [STPLAN-1, STPLAN-2]` (one per rival), `active_records.OBL: [OBL-1]` (the creditor's open debt), `active_records.CLK: [CLK-1]` (the smuggler's arrival countdown at threshold) — at least 3 high-urgency active records spanning both actors; PG-2 is the post-driver page, 1 SE with `event_kind: turn_resolution` + `turn_driver: {kind: multi_actor_collision, initiator: "unknown", driver_records: ["STPLAN-1", "STPLAN-2", "OBL-1"] (or equivalent ≥2-STENT selection), player_response_mode: responds, pov_visibility: perceived_directly}`, 1 SLT representing the local-collision resolution (e.g., a `bound: confrontation_resolved` effect with branches for each rival's outcome) with grounded `compatible_turn_drivers: [multi_actor_collision]` and a non-generic `reason_to_exist` that names the local-pressure resolution explicitly — NEVER target-narrative-shape language, 1+ CHC per response register grounded in one or more of the colliding records (e.g., "Pay the debt" → grounded in OBL-1; "Hide the contraband" → grounded in STPLAN-2 + CLK-1)).
  - `files[]`: page-plan §7a content with Driver records listing all colliding records, Observer-firewall note naming the access route for each driver record (player perceives directly because the confrontation IS the player's scene), and active-pressure disposition table with at least 3 rows — STPLAN-1, STPLAN-2, OBL-1 each as `selected` (or with one `deferred` with explicit expiry); CLK-1 with its disposition explicitly named.

### 2. Create integration test `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts`

Mirror `spec76-red-kiln-ambush.test.ts` structure:

- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`.
- **Test 2 — Mutation suite (≥3 mutations)**:
  - **M-1 — Drop one driver record (drops below ≥2-STENT threshold)**: mutate `event.turn_driver.driver_records = ["STPLAN-1"]` (single-actor, fails the schema `≥2 distinct STENTs` constraint); assert verdict code from `turn_driver_schema_compliance` — specifically `turn_driver_driver_records_empty_for_non_player` (or a schema-violation code surfaced by the structural validator when the constraint is structurally violated).
  - **M-2 — Active-pressure table omits a colliding record**: keep all driver_records but remove OBL-1's row from the §7a active-pressure disposition table content; assert verdict code `high_urgency_active_record_unhandled` (per `active_pressure_handling_discipline`).
  - **M-3 — Local-salience violation via target-narrative-shape framing**: mutate the SLT to include a forbidden field (e.g., add `arc_contract: "midpoint_pivot"` or `dramatic_unit: "climax_setup"` to the SLT body); assert that the existing `narrative-shape-field-rejection.ts` validator emits a rejection code (the SLT-record-level structural backstop catches this even though the field is not part of the schema's `additionalProperties` set).

### 3. Acceptance via `npm test`

Same shape as ticket 001.

## Files to Touch

- `tools/validators/tests/fixtures/multi-actor-collision-confrontation/README.md` (new)
- `tools/validators/tests/fixtures/multi-actor-collision-confrontation/fixture.json` (new)
- `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts` (new)

## Out of Scope

- Schema changes to `story-event.schema.json` or any other JSON schema (SPEC-85 §3).
- New validator code or modifications to existing validators (SPEC-85 §3).
- Skill prose changes (SPEC-85 §3).
- Cross-driver-kind composition fixtures (SPEC-85 §3 — "multi_actor_collision IS the cross-kind case; further mixtures are speculative").
- Fixtures with global drama-manager structure or target-narrative-shape SLT framing — the fixture exclusively exercises the local-salience path; target-shape framing is exercised ONLY in the mutation suite as a rejection target.
- Fixtures for the other three kinds — landed in sibling tickets SPEC85NONPLADRI-001, -002, -003.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-multi-actor-collision-confrontation.test.js` — both the PASS test and the mutation suite pass.
2. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — Red Kiln regression unchanged.
3. `cd tools/validators && npm test` — full suite passes.

### Invariants

1. The fixture's `event.turn_driver.driver_records` carries records from at least 2 distinct STENTs (schema-enforced; the unmutated fixture passes this constraint).
2. The page-plan §7a active-pressure disposition table covers every high-urgency active record on the parent PG snapshot — every colliding record AND every uninvolved high-urgency record — with exactly one disposition (`selected | deferred | rejected`) per row.
3. The selected SLT's `reason_to_exist` and effect labels name the local-pressure resolution; no target-narrative-shape field (`arc_contract`, `dramatic_unit`, `execution_envelope`, `stop_policy`) appears in the unmutated SLT body.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `multi_actor_collision`-specific PASS + ≥3 FAIL mutations covering ≥2-STENT requirement, active-pressure table coverage, and local-salience-vs-narrative-shape backstop.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-multi-actor-collision-confrontation.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification.
3. The narrower targeted command is the right verification boundary because the test is independent of every other test in the package; the full-suite invocation only adds orthogonal sanity gates.
