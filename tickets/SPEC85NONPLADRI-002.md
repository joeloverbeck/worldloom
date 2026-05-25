# SPEC85NONPLADRI-002: Offstage-action bridge-sabotage golden fixture

**Status**: PENDING
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

## Architecture Check

1. **Per-kind fixture-and-test pairing** mirrors the Red Kiln Ambush precedent for the same reasons as ticket 001 — the offstage-driver's structural rule (no `perceived_directly`; access route must trace to DA / STSTAT) is kind-specific and best authored against a kind-specific fixture rather than abstracted into a parametrized harness.
2. **No backwards-compatibility shim** — new artifact, no existing fixture or validator import is reshaped.

## Verification Layers

1. **Fixture parse-correctness** → codebase grep-proof + Node JSON parse at integration-test load time.
2. **6-validator composition PASS on unmutated fixture** → integration test assertion (`assert.deepEqual(run.verdicts, [])`).
3. **Offstage-specific FAIL mutations produce expected SPEC-76 codes** → integration test assertion per mutation; the offstage-distinguishing codes are `turn_driver_offstage_perceived_directly` (§3.6.1) and `turn_driver_offstage_direct_mind_access` (§3.6.2).
4. **Red Kiln Ambush regression** → existing `spec76-red-kiln-ambush.test.ts` continues to pass.

## What to Change

### 1. Create fixture directory `tools/validators/tests/fixtures/offstage-bridge-sabotage/`

Add two files:

- `README.md` (~20 lines): name the scenario ("Enemy STPLAN offstage sabotages a bridge; the player sees the collapse aftermath through a witness's DA report"), the driver kind (`offstage_action`), the leading STPLAN record (the offstage sabotage plan), the DA evidence record carrying the report, and the expected PASS / FAIL matrix.
- `fixture.json` (~250-300 lines): a `RedKilnFixture`-shaped JSON bundle with:
  - `records[]`: minimal world canon (1-2 CFs naming the bridge + the enemy faction's capacity for sabotage, 1-2 ENTs for the enemy operative + the bridge, 1 INV anchor — typically Distribution Invariant naming "only the enemy faction has demolition expertise"), plus story-bundle records (1 STORY, 1 BR, 2 PGs — PG-1's `active_records.STPLAN: [STPLAN-1]` is the offstage sabotage plan, `active_records.DA: [DA-1]` is the witness report; PG-2 is the post-driver page, 1 SE with `event_kind: turn_resolution` + `turn_driver: {kind: offstage_action, initiator: "STENT-2" (the enemy operative), driver_records: ["STPLAN-1"], player_response_mode: responds, pov_visibility: reported}`, 1 SLT representing the offstage causal packet (a `bound: bridge_destroyed` effect or equivalent state change) with grounded `compatible_turn_drivers: [offstage_action]` and a non-generic `reason_to_exist`, 1+ BEL active on the player POV granting access to DA-1 — this is the canonical access route, 1+ CHC in `responds` register grounded in DA-1 (NOT in STPLAN-1 — the player can't directly cite the hidden plan)).
  - `files[]`: one entry for the page-plan §7a content with Observer-firewall note explicitly naming the access route ("Player perceives bridge collapse via DA-1 witness report; STPLAN-1 itself is offstage and not directly observed"), and active-pressure disposition table with STPLAN-1 as `selected`.

### 2. Create integration test `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts`

Mirror `spec76-red-kiln-ambush.test.ts` structure:

- **Test 1 — PASS case**: `runValidators` on the unmutated fixture returns `verdicts: []`.
- **Test 2 — Mutation suite (≥3 mutations)**:
  - **M-1 — POV visibility forbidden posture**: mutate `event.turn_driver.pov_visibility = "perceived_directly"`; assert verdict code `turn_driver_offstage_perceived_directly`.
  - **M-2 — Access-route absence**: keep `pov_visibility: reported` but drop the BEL granting access to DA-1 from `active_records.BEL` (and the BEL record itself); assert verdict code `turn_driver_missing_access_route`.
  - **M-3 — Page-plan §7a narrates NPC interiority**: amend the page-plan content to include a hidden-mind narration (e.g., "STENT-2 smiled because they knew the bridge would fall during the player's escape"); assert verdict code `turn_driver_offstage_direct_mind_access`.

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
2. The fixture's emitted CHCs are grounded in DA / STSTAT / SF records visible to the player POV, never directly in the offstage STPLAN or in hidden-mind state.
3. The page-plan §7a Observer-firewall note explicitly names the access route (DA / BEL / STSTAT chain) for the offstage driver; absence of this note triggers the page-plan structural validator.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec85-offstage-bridge-sabotage.test.ts` — new; mirrors `spec76-red-kiln-ambush.test.ts` structure with `offstage_action`-specific PASS + ≥3 FAIL mutations covering the kind's distinguishing constraints.

### Commands

1. `cd tools/validators && npm run build && node --test dist/tests/integration/spec85-offstage-bridge-sabotage.test.js` — targeted per-fixture verification.
2. `cd tools/validators && npm test` — full-package verification.
3. The narrower targeted command is the right verification boundary because the test is independent of every other test in the package; the full-suite invocation only adds orthogonal sanity gates.
