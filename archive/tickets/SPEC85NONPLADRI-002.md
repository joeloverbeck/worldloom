# SPEC85NONPLADRI-002: Offstage-action bridge-sabotage golden fixture

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None — fixture + integration test only; consumes existing validators
**Deps**: None

## Problem

Per SPEC-85, the `offstage_action` non-player driver kind has schema-level and structural-unit coverage but no rich authored golden fixture exercising end-to-end composition through all 6 driver-primitive validators. Today, a regression in the offstage-driver composition (offstage STPLAN causal packet + DA evidence + page-plan §7a `inferred_from_trace` or `reported` POV visibility + responder CHC referencing the DA, not the hidden actor's interiority) would surface only when a real consumer encountered it in production. This ticket lands the authored fixture + integration test for the offstage kind, whose distinguishing constraint is that `pov_visibility = perceived_directly` is structurally forbidden — the observer firewall (FOUNDATIONS §Story Bundles §6b) requires that the player perceive the offstage actor's move only through accessible records (DA / STSTAT / SF visibility change), never through narrated NPC interiority.

## Assumption Reassessment (2026-05-25)

1. The 6 driver-primitive validators are imported and composed at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts:42-49`; the import block + composition pattern carries over to this ticket's new test file. The `turn_driver_offstage_perceived_directly` code (per SPEC-76 §3.6.1) and `turn_driver_offstage_direct_mind_access` code (per SPEC-76 §3.6.2) are the kind-specific FAIL codes this ticket's mutation suite must exercise.
2. SPEC-85 §3 Non-goals explicitly forbids schema changes, new validators, and new skill prose. The spec §4.3 driver-specific rule for `offstage_action` ("`pov_visibility` is NOT `perceived_directly`; player's emitted CHCs do not assert direct knowledge of NPC interiority; selected SLT's effects produce evidence visible to the player via DA / STSTAT / SF visibility change, not raw hidden-state exposure") is encoded structurally by the existing validators — this ticket proves the composition holds end-to-end via the fixture + mutation suite.
3. **Cross-skill boundary**: the fixture-shape contract (`RedKilnFixture` interface) is the shared boundary with the SPEC-76 capstone test pattern; this ticket's fixture matches that shape so the same materialization pipeline (`mkdtempSync` + per-file write loop + `runValidators`) applies without abstraction debt.
4. **FOUNDATIONS principle**: §Story Bundles §6b "Information / Observer Firewall" — the offstage driver MUST declare `pov_visibility ∈ {inferred_from_trace, reported, discovered_after, withheld}`, never `perceived_directly`. The DA evidence record IS the canonical access route for `reported` visibility; STSTAT visibility-change records are the canonical access route for `inferred_from_trace`. The mutation suite must exercise both the visibility-posture violation (swap to `perceived_directly`) and the access-route absence (drop the supporting DA / BEL while keeping a non-direct posture).
5. Live validator reassessment corrected one drafted fixture detail: `turn_cycle_output_grounding_integrity` requires responder CHCs to ground in at least one `SE.turn_driver.driver_records` entry. To preserve the offstage firewall while satisfying that existing contract, the landed `SE-1.turn_driver.driver_records` cites both `STPLAN-1` and the accessible evidence route `DA-1`, and `CHC-1.grounded_in.records` cites `DA-1` only. This keeps player response grounding on accessible evidence while still selecting the offstage plan.

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent for the same reasons as ticket 001 — the offstage-driver's structural rule (no `perceived_directly`; access route must trace to DA / STSTAT) is kind-specific and best authored against a kind-specific fixture rather than abstracted into a parametrized harness.
2. **No backwards-compatibility shim** — new artifact, no existing fixture or validator import is reshaped.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse at integration-test load time.
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Offstage-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation; the offstage-distinguishing codes are `turn_driver_offstage_perceived_directly` (§3.6.1) and `turn_driver_offstage_direct_mind_access` (§3.6.2).
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass.

## Landed Changes

### 1. Created fixture directory `tools/validators/tests/fixtures/offstage-bridge-sabotage/`

Added two files:

- `README.md`: names the scenario ("Enemy STPLAN offstage sabotages a bridge; the player sees the collapse aftermath through a witness's DA report"), the driver kind (`offstage_action`), the STPLAN + DA driver-record pair, the BEL access route, and the expected PASS / FAIL matrix.
- `fixture.json`: a compact `RedKilnFixture`-shaped JSON bundle with:
  - `records[]`: story-bundle records only: 2 PGs; `STPLAN-1` as the offstage sabotage plan; `DA-1` as the witness report; `BEL-1` as the player access route; `SE-1` as the `offstage_action` turn resolution with `driver_records: ["STPLAN-1", "DA-1"]`; `SLT-bridge-collapse-report` as the selected offstage causal packet; and `CHC-1` grounded in `DA-1`.
  - `files[]`: one entry for the page-plan §7a content with Observer-firewall note explicitly naming the access route ("Player perceives bridge collapse via DA-1 witness report; STPLAN-1 itself is offstage and not directly observed"), and active-pressure disposition table with STPLAN-1 as `selected`.

The landed fixture keeps that intent but uses `turn_driver.driver_records: ["STPLAN-1", "DA-1"]` so the existing responder-grounding validator can prove the CHC is grounded in the accessible DA route rather than the hidden STPLAN.

### 2. Created integration test `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts`

Mirrors `spec76-red-kiln-ambush.test.ts` structure:

- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`.
- **Test 2 — Mutation suite (3 mutations)**:
  - **M-1 — POV visibility forbidden posture**: mutates `event.turn_driver.pov_visibility = "perceived_directly"` and asserts `turn_driver_offstage_perceived_directly`.
  - **M-2 — Access-route absence**: keeps `pov_visibility: reported` but removes active `BEL-1` from parent `PG-1`; asserts `turn_driver_missing_access_route`.
  - **M-3 — Page-plan §7a narrates NPC interiority**: amends the page-plan STCHAR section to include hidden-mind narration; asserts `turn_driver_offstage_direct_mind_access`.

### 3. Acceptance via `npm test`

Same shape as ticket 001.

## Files to Touch

- `tools/validators/tests/fixtures/offstage-bridge-sabotage/README.md` (new)
- `tools/validators/tests/fixtures/offstage-bridge-sabotage/fixture.json` (new)
- `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` (new)

## Out of Scope

- Schema changes to `story-event.schema.json` or any other JSON schema (SPEC-85 §3).
- New validator code or modifications to existing validators (SPEC-85 §3).
- Skill prose changes (SPEC-85 §3).
- The prose-attach hidden-mind-leak validator (SPEC-85 §3; deferred).
- Fixtures for the other three kinds — landed in sibling tickets SPEC85NONPLADRI-001, -003, -004.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js` — both the PASS test and the mutation suite pass.
2. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — Red Kiln regression unchanged.
3. `cd tools/validators && npm test` — full suite passes.

### Invariants

1. The fixture's `event.turn_driver.pov_visibility` value is one of `{inferred_from_trace, reported, discovered_after, withheld}` — never `perceived_directly` on the unmutated fixture.
2. The fixture's emitted CHCs are grounded in `DA-1`, which is visible to the player POV through `BEL-1`; they never ground directly in the offstage `STPLAN-1` or in hidden-mind state.
3. The page-plan §7a Observer-firewall note explicitly names the DA/BEL access route for the offstage driver; adding hidden-mind narration to the page plan triggers the offstage direct-mind-access validator.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `offstage_action`-specific PASS + 3 FAIL mutations covering the kind's distinguishing constraints.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification.
3. The narrower targeted command is the right verification boundary because the test is independent of every other test in the package; the full-suite invocation only adds orthogonal sanity gates.

## Outcome

Completed on 2026-05-25.

Implemented the offstage-action bridge-sabotage golden fixture and integration test. The fixture models an offstage `STPLAN-1` surfaced through accessible `DA-1` evidence and active `BEL-1`; the page-plan §7a section records `reported` POV visibility and a no-interiority observer-firewall note. The integration test composes the same 6 SPEC-76 driver-primitive validators as Red Kiln and covers the PASS case plus three offstage-specific FAIL mutations.

## Verification Result

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js` — PASS after correcting the direct-visibility mutation to expect the live schema-compliance verdict only.
2. `cd tools/validators && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js` — PASS; direct compiled proof after build.
3. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — PASS; targeted offstage proof plus Red Kiln regression.
4. `cd tools/validators && npm test` — PASS, 1017/1017 tests.

## Deviations

1. The fixture is intentionally smaller than the drafted 250-300 line target; it remains rich enough for the owned validator composition because the relevant records, page-plan §7a projection, access route, and mutation cases are present.
2. `DA-1` is included in `SE-1.turn_driver.driver_records` alongside `STPLAN-1` so existing `turn_cycle_output_grounding_integrity` can validate responder CHC grounding through accessible evidence. The CHC itself grounds in `DA-1`, not directly in hidden `STPLAN-1`.
