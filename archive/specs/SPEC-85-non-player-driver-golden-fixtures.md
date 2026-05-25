# SPEC-85: Non-Player Driver Golden Fixtures

**Status:** COMPLETED
**Date:** 2026-05-25
**Source brainstorm:** [`archive/reports/slt-chc-overhaul-third-iteration.md`](../reports/slt-chc-overhaul-third-iteration.md) §17 SPEC-86 (renumbered to SPEC-85 here per sequential continuation from archived SPEC-82).
**Triage:** [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md) §ACCEPT.
**Predecessors:** archived [`SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md`](../archive/specs/SPEC-76-turn-driver-primitive-and-pressure-driven-turn-cycle.md) (introduced the 8-driver-kind enum and per-kind schema constraints); the Red Kiln Ambush fixture at `tools/validators/tests/fixtures/red-kiln-ambush/` (rich `npc_action` proof — the pattern this spec mirrors for the other four non-player kinds).

## 1. Problem

The 8 turn-driver kinds (per `tools/validators/src/schemas/story-event.schema.json:88-122`) all have schema-level and structural-unit-test coverage, but **only `npc_action` has a rich authored golden fixture** (Red Kiln Ambush). The other four non-player kinds — `offstage_action`, `clock_fire`, `secret_reveal`, `multi_actor_collision` — have only:

- Schema validity tests at `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts:68-120` (shape, not behavior).
- Structural-unit tests at `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts:7-23` and `turn-driver-pov-observer-firewall.test.ts:7-20` (minimal records, single-validator behavior).

A "rich golden fixture" in the third-iteration report's sense is a complete authored bundle that exercises end-to-end behavior through:

1. Phase-2 storylet selection against the parent PG snapshot.
2. Phase-7a page-plan trace (driver kind / initiator / driver records / POV visibility / observer-firewall note / active-pressure disposition).
3. Alias binding through `SE.commitment.alias_bindings`.
4. Composition of all 6 driver-primitive validators (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`, `observer_firewall`, `turn_cycle_output_grounding_integrity`) — the exact composition exercised by the Red Kiln Ambush capstone test at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`.
5. The CHC emission discipline for the responder/witness/continuation surface that follows a non-player initiative.

Without authored bundles for the four remaining kinds, regressions in any cross-validator composition would surface only when a real consumer (production story bundle) exercised the kind in the wild.

The iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope deferral on "Non-player driver semantics expansion / prose-attach hidden-mind-leak check" specifically targets the **prose-attach hidden-mind-leak validator** (no rendered-prose consumer), not the fixtures themselves: "The other components of SPEC-84 (NPC / offstage / clock / secret / multi-actor fixtures) are already covered by SPEC-76's per-kind `contains` constraints and the Red Kiln Ambush fixture verifies `npc_action`." This spec contests the second half of that claim: `contains` constraints validate field-shape, not end-to-end composition; only `npc_action` has the latter.

This is a **fixture-and-test spec only**. No schema change, no new validator, no skill prose change, no prose-attach hidden-mind-leak check.

## 2. Goals

Author four compact bundle fixtures — one per remaining non-player driver kind — mirroring the Red Kiln Ambush pattern (single `fixture.json` ~250-300 lines + short `README.md`). Each fixture exercises:

1. The selected SLT representing the driver's causal move (per the report §14 driver mapping).
2. Page-plan §7a recording the driver kind, driver records, POV visibility, and observer-firewall note.
3. CHC emission for the next turn in responder/witness/continuation register (per the existing `player_response_mode` enum on `SE.turn_driver`).
4. Composition through all 6 driver-primitive validators with PASS outcome.

The four fixtures, with the report's recommended scenarios (§18.3) as starting points:

- **`offstage_action`**: an enemy STPLAN offstage sabotages a bridge; player sees delayed report through DA evidence. POV visibility `inferred_from_trace` or `reported`. Selected SLT represents an offstage causal packet whose effect is observable only through accessible records.
- **`clock_fire`**: a CLK threshold reached; consequence closes a route or escalates a threat. Selected SLT represents the threshold consequence. CHCs respond to the new constraint.
- **`secret_reveal`**: STSEC partial reveal through DA clue; player chooses how to handle the new knowledge. Mystery firewall (FOUNDATIONS §Story Bundles §6b) must hold — the SLT does not reveal more than the access route licenses.
- **`multi_actor_collision`**: NPC plan + clock + obligation collide; selected SLT resolves the local collision. ≥2 driver records cited per schema constraint. No global drama-manager pattern.

## 3. Non-goals

- Prose-attach hidden-mind-leak validator (deferred per iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope; lift-condition unchanged: a real renderer must emit non-player-driver prose first).
- Player Agency Modes contract amendment (deferred per triage §DEFER; consumer downstream of the deferred prose-attach pass).
- New driver-kind language validators (deferred per triage §DEFER on report SPEC-88).
- Authored large-pool fixtures (deferred per triage §DEFER on report SPEC-89).
- Cross-driver-kind composition fixtures (multi_actor_collision IS the cross-kind case; further mixtures are speculative).
- Changes to the 8-kind enum or per-kind schema constraints.

## 4. Design

### 4.1 Fixture directory layout

For each of the four kinds, add a fixture at `tools/validators/tests/fixtures/<kind>-<short-scenario>/`:

- `tools/validators/tests/fixtures/offstage-bridge-sabotage/{README.md,fixture.json}`
- `tools/validators/tests/fixtures/clock-fire-route-closes/{README.md,fixture.json}`
- `tools/validators/tests/fixtures/secret-reveal-ledger-clue/{README.md,fixture.json}`
- `tools/validators/tests/fixtures/multi-actor-collision-confrontation/{README.md,fixture.json}`

Each `fixture.json` carries the minimal world canon (1-2 CFs, the needed entities, one INV anchor) and the story-bundle records (1 STORY, 1 BR, 2-3 PG, 1 SE with the driver, 1-2 SLT, ≥1 CHC for next-turn response, the active records the driver cites). Aim for ~250-300 lines per fixture, comparable to Red Kiln's 271-line `fixture.json`.

The fixture's "richness" comes from realistic page-plan §7a content (real driver records, real POV visibility text, real observer-firewall reasoning), not from prose volume or cast size.

### 4.2 Integration tests

Add one test file per kind under `tools/validators/tests/integration/`:

- `spec85-offstage-bridge-sabotage.test.ts`
- `spec85-clock-fire-route-closes.test.ts`
- `spec85-secret-reveal-ledger-clue.test.ts`
- `spec85-multi-actor-collision-confrontation.test.ts`

Each test follows the Red Kiln pattern (`spec76-red-kiln-ambush.test.ts`): load the fixture, run the 6 driver-primitive validators in composition, assert PASS, then mutate the fixture (e.g., remove the driver record, swap POV visibility, drop the response CHC) and assert per-validator FAIL with the expected failure code.

### 4.3 Driver-specific checks

Per the report §14 driver mapping, each fixture also asserts the **driver-specific** structural rule:

- **`offstage_action`**: `pov_visibility` is NOT `perceived_directly`; player's emitted CHCs do not assert direct knowledge of NPC interiority. The selected SLT's effects produce evidence visible to the player (DA / STSTAT / SF visibility change), not raw hidden-state exposure.
- **`clock_fire`**: `driver_records[]` cites the firing CLK; the CLK's threshold has been reached at the parent PG snapshot; the selected SLT's effects produce the threshold consequence (not just additional CLK ticks).
- **`secret_reveal`**: `driver_records[]` cites STSEC; the reveal does not exceed the access route's license (the BEL or DA path is structurally adequate); the parent PG snapshot's `unresolved_mystery_claims` evolves consistently.
- **`multi_actor_collision`**: `driver_records[]` has ≥2 entries (schema-enforced); the collision is between currently-active pressures in the parent PG snapshot (not authored conflict); the selected SLT resolves the local collision (no target-narrative-shape language).

These assertions live in the integration tests, not in new validators. The structural validators already enforce the schema-level constraints; the fixtures + their tests prove the structural composition holds end-to-end.

## 5. Files Touched

- `tools/validators/tests/fixtures/offstage-bridge-sabotage/{README.md,fixture.json}` — new.
- `tools/validators/tests/fixtures/clock-fire-route-closes/{README.md,fixture.json}` — new.
- `tools/validators/tests/fixtures/secret-reveal-ledger-clue/{README.md,fixture.json}` — new.
- `tools/validators/tests/fixtures/multi-actor-collision-confrontation/{README.md,fixture.json}` — new.
- `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` — new.
- `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts` — new.
- `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts` — new.
- `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts` — new.

No source-code changes, no schema changes, no skill prose changes, no validator-registry changes.

## 6. Acceptance Criteria

1. Each of the four `fixture.json` files parses cleanly via `JSON.parse(readFileSync(...))` at integration-test load time, matching the Red Kiln Ambush fixture-load pattern (`tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:35-41`). Fixtures live under `tools/validators/tests/fixtures/`, not under `worlds/<slug>/`; no `world-index build` invocation is required (fixtures are JSON bundles materialized to a temp directory by the test via `mkdtempSync`, not authored world trees).
2. Each of the four integration tests passes with all 6 driver-primitive validators returning PASS for the unmutated fixture.
3. Each integration test demonstrates ≥3 driver-specific FAIL mutations (e.g., dropping a driver record, swapping POV visibility to `perceived_directly` for an offstage driver, removing the response CHC, citing a hidden state without an access route) — each mutation produces the expected validator failure code from the SPEC-76 codes.
4. The Red Kiln Ambush regression test (`spec76-red-kiln-ambush.test.ts`) continues to pass unchanged.
5. `cd tools/validators && npm test` passes (the package's `npm test` script runs `tsc` build + the full `node --test` suite, which serves as both typecheck and test for this package; no `lint` script exists in the repo).

## 7. FOUNDATIONS Alignment

| Principle | Stance | Mechanism @ surface |
|---|---|---|
| §Story Bundles §6b "Information / Observer Firewall" — non-player drivers must declare `pov_visibility` matching the actor's access posture | aligns | Each fixture authors a realistic POV-visibility setting per its kind (offstage: `inferred_from_trace` or `reported`; secret_reveal: matches the access route's license; clock_fire: typically `perceived_directly` for visible threshold consequences). The fixtures provide the end-to-end proof that §6b's per-kind firewall composes correctly with selection and page-plan @ all 6 validators in composition. |
| §Story Bundles §5c "Driver salience is local" | aligns | Each fixture exercises driver selection as a local salience pass over currently-active pressures in the parent PG snapshot. The multi_actor_collision fixture in particular proves collision resolution is local (≥2 active pressures collide), not global (no target-narrative-shape planning) @ runtime selection. |
| §Story Bundles §5b "Schema-minimalism at story scope" | aligns | Zero new fields, zero new records, zero new validators, zero new skill prose. The spec is fixtures + integration tests only @ test-surface. |
| §Story Bundles §5a "Commitment Blocks Are Causal Moves" | aligns | Each fixture's selected SLT is a causal move (an offstage packet, a threshold consequence, a reveal mechanism, a collision resolution) — never an arc beat, a dramatic unit, or a stop-policy carrier. The fixture content is engineered against §5a's forbidden-fields list @ authoring time. |
| §Story Bundles §6.1 "Story-Local Character Authority" | N/A | None of the four fixtures need STCHAR profile changes; their NPC actors use STENT + active pressure records (STPLAN / STEMO / BEL) as driver records, which is the canonical pattern. |

## 8. Verification Test Plan

Run on a worktree containing the new fixtures and tests:

1. **Fixture parse (each)**: each integration test's load step (`JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))` — Red Kiln pattern at `spec76-red-kiln-ambush.test.ts:35-41`) succeeds without throw. A standalone smoke check is `cd tools/validators && node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/<fixture-dir>/fixture.json','utf8'))"` per fixture. *(rationale: a malformed fixture would mask the test's intent and the integration-test load failure would surface as an opaque ENOENT/SyntaxError rather than a structural finding)*
2. **Integration (each)**: `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js dist/tests/integration/spec85-clock-fire-route-closes.test.js dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js dist/tests/integration/spec85-multi-actor-collision-confrontation.test.js` — each passes including the FAIL-mutation cases. *(rationale: the primary acceptance gate is per-kind end-to-end composition; the package uses `node --test` against the built `dist/` tree per `tools/validators/package.json`'s `test` script)*
3. **Regression**: `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — unchanged. *(rationale: the new fixtures must not perturb the existing `npc_action` golden test)*
4. **Typecheck + full suite**: `cd tools/validators && npm test` — clean. *(rationale: pre-completion verification per global CLAUDE.md; the package's `npm test` runs `tsc -p tsconfig.json` build then the full `node --test dist/tests/**/*.test.js` suite, which serves as both typecheck and full-test gate. No `lint` script exists in `tools/*/package.json`; SPEC-84 outcome §Deviations already documented the same drift from the global `pnpm turbo` example)*

## Outcome

Completed: 2026-05-25

SPEC-85 landed the four non-player driver golden fixtures and their per-kind integration tests:

- `clock_fire`: `tools/validators/tests/fixtures/clock-fire-route-closes/` and `tools/validators/tests/integration/spec85-clock-fire-route-closes.test.ts`
- `offstage_action`: `tools/validators/tests/fixtures/offstage-bridge-sabotage/` and `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts`
- `secret_reveal`: `tools/validators/tests/fixtures/secret-reveal-ledger-clue/` and `tools/validators/tests/integration/spec85-secret-reveal-ledger-clue.test.ts`
- `multi_actor_collision`: `tools/validators/tests/fixtures/multi-actor-collision-confrontation/` and `tools/validators/tests/integration/spec85-multi-actor-collision-confrontation.test.ts`

Each fixture follows the compact Red Kiln/SPEC-85 sibling convention: checked-in JSON records plus page-plan content consumed by the existing six driver-primitive validators. No schema, validator, registry, source-code behavior, or skill-prose change was introduced.

Deviations from original design:

- The fixtures use compact structural records rather than full STORY/BR/world-canon bundles. This matches the landed sibling convention and still proves the owned six-validator composition.
- The multi-actor-collision ticket corrected a drafted narrative-shape mutation: `narrative_shape_field_rejection` does not cover SLT records and is not part of the six-driver composition, so the local-salience invariant is asserted directly over the unmutated SLT while mutations stay on live driver-validator surfaces.

Final verification:

1. `cd tools/validators && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js dist/tests/integration/spec85-clock-fire-route-closes.test.js dist/tests/integration/spec85-secret-reveal-ledger-clue.test.js dist/tests/integration/spec85-multi-actor-collision-confrontation.test.js` — PASS, 8/8 SPEC-85 integration subtests.
2. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — PASS, 2/2 Red Kiln regression subtests.
3. `cd tools/validators && npm test` — PASS, 1021/1021 tests.
