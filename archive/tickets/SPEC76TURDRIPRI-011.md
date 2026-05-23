# SPEC76TURDRIPRI-011: Golden fixture — Red Kiln Ambush end-to-end integration test

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new fixture directory at `tools/validators/tests/fixtures/red-kiln-ambush/`; new integration test exercising the full SPEC-76 pipeline end-to-end; small same-seam repair to `turn_cycle_output_grounding_integrity`
**Deps**: archive/tickets/SPEC76TURDRIPRI-003.md, archive/tickets/SPEC76TURDRIPRI-004.md, archive/tickets/SPEC76TURDRIPRI-005.md, archive/tickets/SPEC76TURDRIPRI-006.md, archive/tickets/SPEC76TURDRIPRI-007.md, archive/tickets/SPEC76TURDRIPRI-008.md, archive/tickets/SPEC76TURDRIPRI-009.md, archive/tickets/SPEC76TURDRIPRI-010.md

## Problem

SPEC-76's full pipeline — schema, contract, 4 new validators, 3 existing-validator updates, and 3 skill amendments — needs an end-to-end integration fixture that proves the composed behavior matches the spec's intent. SPEC-76 §6.3 prescribes the "Red Kiln Ambush" golden fixture from the source report's §15: an NPC-initiated event (Varro's plan step + clock fire) produces a `turn_resolution` SE with `turn_driver.kind = npc_action`, populated `driver_records`, `pov_visibility = perceived_directly` (Jon sees the shot line through a west window), and `player_response_mode = responds`. Page plan §7a renders the driver and lists Varro's STPLAN-9, STEMO-12, CLK-3, THR-4 in either `selected` or supporting roles in the active-pressure table. Emitted CHCs (Protect Mara / Dive for ledger / Call Varro out / Retreat through ash chute / write-in) all have `player_response_mode = responds`; at least one targets a record in `driver_records`. Observer firewall passes — no hidden mind access.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/tests/fixtures/` exists and currently contains CF-test fixtures, patch-plan fixtures, and a `midstory-introduction/` subdirectory. No existing `red-kiln-ambush` directory (verified via the Pre-flight existence check earlier this session — no collision). Per SPEC-76 §6.3, the fixture path is `tools/validators/tests/fixtures/red-kiln-ambush/`. Inline-fixture-builder pattern (established by `chc-slt-selected-commitment-trace.test.ts` and sibling tests) is used for the per-validator structural tests in SPEC76TURDRIPRI-003 through 006; the golden fixture under `tests/fixtures/` is a separate convention used for end-to-end integration tests that exercise multiple validators against a shared fixture-world copy.
2. SPEC-76 §6.3 prescribes the fixture content verbatim — NPC-initiated event with Varro's plan step + clock fire producing `turn_resolution` SE; page plan §7a renders the driver and the 4 driver_records; emitted CHCs all carry `responds` mode with at least one targeting a record in `driver_records`; observer firewall passes (no `Varro smiled because he knew Jon would choose Mara`-style hidden mind narration). Per SPEC-76 §8 Implementation Slice E: "Red Kiln Ambush + 5 failing variants (no driver, hidden mind leak, missing pressure table, mismatched §7a, wrong response mode)."
3. **Cross-skill / cross-artifact boundary**: this fixture exercises the full SPEC-76 pipeline end-to-end — schema (SPEC76TURDRIPRI-001), contract (SPEC76TURDRIPRI-002), 4 new validators (SPEC76TURDRIPRI-003 through 006), 3 existing-validator updates (archive/tickets/SPEC76TURDRIPRI-007.md), 3 skill amendments (archive/tickets/SPEC76TURDRIPRI-008.md, archive/tickets/SPEC76TURDRIPRI-009.md, archive/tickets/SPEC76TURDRIPRI-010.md). The fixture's content (the SE record, the PG record, the page-plan body, the CHC records) must be coherent across all surfaces; the test asserts each validator's verdict on the fixture matches the expected pass/fail per the spec's verification matrix.
4. **FOUNDATIONS principle**: §FOUNDATIONS Alignment table validation. The fixture demonstrates the composed end-to-end behavior across the spec's named alignment: §Story Bundles §5b (Schema-Minimalism — every field load-bearing), §5c (Present Causal State — driver salience local), §6b (Observer Firewall — Jon's POV via window grants direct observation), §4a (Plan-Authority Boundary — §7a is render-side projection of SE.turn_driver), §5a (Commitment Blocks — narrative-shape-field-rejection backstop preserved), Rule 5 (No Consequence Evasion — active-pressure table accounts for all 4 high-urgency records), Rule 7 (Preserve Mystery — no hidden state leaked through `perceived_directly`).
5. **Same-seam validator repair discovered during capstone proof**: the pre-edit broad baseline `cd tools/validators && npm test` passed 999 tests. The initial Red Kiln Ambush capstone then proved `turn_cycle_output_grounding_integrity` only enforced topical grounding for CHCs already labelled `player_response_mode: responds`; it did not fail emitted CHCs labelled `initiates` under a non-player driver, contrary to SPEC-76 §3.3 Phase 8 and this ticket's wrong-response-mode variant. This ticket absorbs the small validator repair because the missing check is required for the capstone fixture to prove the full SPEC-76 pipeline truthfully. `docs/HARD-GATE-DISCIPLINE.md` was read before changing the validation signal; the change adds a fail-closed structural verdict and does not weaken pre-apply, approval, or canon-write discipline.

## Architecture Check

1. **Capstone integration fixture plus minimal validator repair**: this ticket composes existing validators (4 new + 2 modified) against a single checked fixture to prove the spec's end-to-end intent, and it absorbs the small same-seam `turn_cycle_output_grounding_integrity` repair exposed by the wrong-response-mode variant. The test uses checked JSON fixture records plus explicit page-plan file input and materializes the page-plan body under a temp root to prove the path never targets live canon. Alternatives considered and rejected: (a) skip the integration fixture and rely on per-validator structural tests alone — rejected, the source report's §15 explicitly names "Red Kiln Ambush" as a golden fixture; the composed behavior is what the spec proves; (b) merge with one of the per-validator structural-test files — rejected, the fixture exercises multiple validators; merging would obscure the fixture's role as the capstone integration test.
2. **No backwards-compatibility aliasing**: the fixture is composed entirely against the new contract (post-SPEC-76); no legacy `selected_choice` / `write_in_attempt` fixtures need accommodating per SPEC-76 §7 Migration.

## Verification Layers

1. **Invariant**: SE record carries `event_kind = turn_resolution` + `turn_driver.kind = npc_action` + 4 driver_records → schema validation (SPEC76TURDRIPRI-001's schema accepts the fixture).
2. **Invariant**: `turn_driver_schema_compliance` (SPEC76TURDRIPRI-003) passes — all per-kind constraints satisfied.
3. **Invariant**: `turn_driver_pov_observer_firewall` (archive/tickets/SPEC76TURDRIPRI-004.md) passes — Jon's POV via window grants direct observation; no hidden state cited with `perceived_directly`.
4. **Invariant**: `page_plan_turn_driver_consistency` (archive/tickets/SPEC76TURDRIPRI-005.md) passes — page plan §7a matches SE.turn_driver byte-for-byte.
5. **Invariant**: `active_pressure_handling_discipline` (archive/tickets/SPEC76TURDRIPRI-006.md) passes — all 4 high-urgency records (STPLAN-9, STEMO-12, CLK-3, THR-4) appear in §7a active-pressure table with valid dispositions.
6. **Invariant**: `observer_firewall` (extended in archive/tickets/SPEC76TURDRIPRI-007.md) short-circuits — the event has non-player driver, delegated to `turn_driver_pov_observer_firewall`.
7. **Invariant**: `turn_cycle_output_grounding_integrity` (extended in archive/tickets/SPEC76TURDRIPRI-007.md) passes — at least one CHC carrying `player_response_mode: responds` includes a record from `SE.turn_driver.driver_records[]` in its `grounded_in.records[]`.
8. **Invariant**: 5 failing variants per SPEC-76 §8 Slice E (no driver, hidden mind leak, missing pressure table, mismatched §7a, wrong response mode) each produce the expected verdict from the appropriate validator.

## Landed Changes

### 1. Created the fixture directory

Created `tools/validators/tests/fixtures/red-kiln-ambush/` containing the fixture data:

- `fixture.json` contains indexed-record-shaped data for `SE-2`, parent/child PG records, STENT records for Varro and Jon, BEL access, STPLAN-9, STEMO-12, CLK-3, THR-4, five response CHCs, and the page-plan body file content.
- `README.md` documents the Red Kiln Ambush purpose and names the five failing variants.

### 2. Created the integration test

Created `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts`. The test:

1. Materializes the fixture page-plan file under a temp root and removes the temp root after the canonical pass, so no live canon path is mutated.
2. Loads the fixture records into the validator framework's run context.
3. Runs each of the 6 SPEC-76 validators (4 new + 2 modified-and-relevant — `observer_firewall` extended, `turn_cycle_output_grounding_integrity` extended) against the fixture.
4. Asserts the positive Red Kiln Ambush fixture passes all validators (zero verdicts).

### 3. Added the 5 failing variants

Per SPEC-76 §8 Slice E, the integration test mutates the canonical Red Kiln Ambush fixture and asserts each variant produces the expected verdict:

- **No driver variant**: SE has `event_kind = turn_resolution` but no `turn_driver` object → `turn_driver_schema_compliance.turn_driver_missing`.
- **Hidden mind leak variant**: SE.turn_driver cites Varro's STPLAN-9 (offstage) with `pov_visibility = perceived_directly` → `turn_driver_pov_observer_firewall.turn_driver_hidden_state_leak`.
- **Missing pressure table variant**: page-plan §7a omits the `Active-pressure disposition` table while parent PG has the 4 high-urgency records → `page_plan_turn_driver_consistency.page_plan_active_pressure_table_missing` and/or `active_pressure_handling_discipline.high_urgency_active_record_unhandled` per the validators' enforcement scopes.
- **Mismatched §7a variant**: page-plan §7a's `Driver kind:` says `offstage_action` while SE.turn_driver.kind says `npc_action` → `page_plan_turn_driver_consistency.page_plan_driver_kind_mismatch`.
- **Wrong response mode variant**: emitted CHCs all carry `player_response_mode: initiates` (instead of `responds`) → `turn_cycle_output_grounding_integrity.chc_non_player_driver_response_mode_invalid`.

### 4. Repaired the response-mode validator seam

`turn_cycle_output_grounding_integrity` now fails CHCs emitted by a non-player turn driver when `player_response_mode` is outside `responds | witnesses | chooses_continuation`. The existing topical-grounding check still applies to CHCs marked `responds`.

## Files to Touch

- `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (new — indexed-record fixture data plus page-plan file input)
- `tools/validators/tests/fixtures/red-kiln-ambush/README.md` (new — names the fixture's role + 5 failing variants)
- `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (new — canonical Red Kiln Ambush pass + five failing variants)
- `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (modify — fail CHCs whose response mode is illegal for a non-player driver)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments — ship in SPEC76TURDRIPRI-002.
- Per-validator structural tests (inline-fixture-builder shape) — ship in SPEC76TURDRIPRI-003 through 007.
- Skill SKILL.md edits — shipped in archive/tickets/SPEC76TURDRIPRI-008.md, archive/tickets/SPEC76TURDRIPRI-009.md, and archive/tickets/SPEC76TURDRIPRI-010.md.
- Test-bundle rebuild (e.g., `red-bunny`) — documented in SPEC-76 §7 Migration; mechanical rebuild outside this fixture's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — the new Red Kiln Ambush integration test passes; the 5 failing variants each produce the expected verdict.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds.
3. The fixture data under `tools/validators/tests/fixtures/red-kiln-ambush/` is self-contained (no external file references) and reproduces the source report's §15 scenario as indexed records plus page-plan content.
4. The integration test does not mutate canon — it materializes only temp page-plan file content under `/tmp` and removes the temp root after the canonical pass.

### Invariants

1. The canonical Red Kiln Ambush fixture passes ALL 6 SPEC-76-relevant validators (zero verdicts).
2. Each of the 5 failing variants produces exactly the expected verdict set; the wrong-response-mode variant produces one `chc_non_player_driver_response_mode_invalid` verdict per invalid emitted CHC.
3. The fixture is the capstone integration test for SPEC-76; future spec changes that break the fixture indicate either a deliberate spec amendment (update the fixture) or a regression (fix the code).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` (new) — canonical Red Kiln Ambush passes + 5 failing variants assertions.
2. `tools/validators/tests/fixtures/red-kiln-ambush/` (new) — fixture data reproducing source report §15.

### Commands

1. `cd tools/validators && npm test` — runs the full validator test suite including the new integration test.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new integration test file.
3. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — targeted compiled integration test after `npm run build`.

## Outcome

Completed 2026-05-23.

The Red Kiln Ambush capstone fixture now exists under `tools/validators/tests/fixtures/red-kiln-ambush/`, with a package integration test at `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts`. The canonical fixture passes the six SPEC-76 validator surfaces together. The five variants produce the expected failures: missing driver, hidden/offstage visibility leak, missing pressure table, mismatched §7a driver kind, and illegal response mode under a non-player driver.

The capstone also exposed and repaired a same-seam omission in `turn_cycle_output_grounding_integrity`: non-player drivers now fail emitted CHCs whose `player_response_mode` is not one of `responds`, `witnesses`, or `chooses_continuation`. This is a fail-closed structural validation addition; no canon-write or approval-token behavior changed.

## Verification Result

1. `cd tools/validators && npm test` before edits — PASS, 999 tests. Baseline was green before the Red Kiln Ambush ticket changed anything.
2. `cd tools/validators && npm run build` — PASS after implementation.
3. `cd tools/validators && node --test dist/tests/integration/spec76-red-kiln-ambush.test.js` — PASS, 2 tests. Proved canonical fixture zero verdicts and all five failing variants.
4. `cd tools/validators && npm test` — PASS, 1001 tests. Broad validators package lane passed after the capstone and validator repair.

## Deviations

- The checked fixture is represented as indexed-record JSON plus page-plan file content rather than a full copied `worlds/red-kiln-ambush/` tree. This matches the current structural validator test harness and keeps the fixture self-contained without mutating live canon paths.
- The wrong-response-mode variant required a same-seam validator repair in `turn_cycle_output_grounding_integrity`; the drafted ticket expected fixture-only work, but the capstone proved the existing validator did not yet enforce SPEC-76 §3.3 Phase 8's response-mode constraint.
