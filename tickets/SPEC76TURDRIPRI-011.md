# SPEC76TURDRIPRI-011: Golden fixture — Red Kiln Ambush end-to-end integration test

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new fixture directory at `tools/validators/tests/fixtures/red-kiln-ambush/`; new integration test exercising the full SPEC-76 pipeline end-to-end
**Deps**: archive/tickets/SPEC76TURDRIPRI-003.md, archive/tickets/SPEC76TURDRIPRI-004.md, archive/tickets/SPEC76TURDRIPRI-005.md, archive/tickets/SPEC76TURDRIPRI-006.md, archive/tickets/SPEC76TURDRIPRI-007.md, archive/tickets/SPEC76TURDRIPRI-008.md, archive/tickets/SPEC76TURDRIPRI-009.md, SPEC76TURDRIPRI-010

## Problem

SPEC-76's full pipeline — schema, contract, 4 new validators, 3 existing-validator updates, and 3 skill amendments — needs an end-to-end integration fixture that proves the composed behavior matches the spec's intent. SPEC-76 §6.3 prescribes the "Red Kiln Ambush" golden fixture from the source report's §15: an NPC-initiated event (Varro's plan step + clock fire) produces a `turn_resolution` SE with `turn_driver.kind = npc_action`, populated `driver_records`, `pov_visibility = perceived_directly` (Jon sees the shot line through a west window), and `player_response_mode = responds`. Page plan §7a renders the driver and lists Varro's STPLAN-9, STEMO-12, CLK-3, THR-4 in either `selected` or supporting roles in the active-pressure table. Emitted CHCs (Protect Mara / Dive for ledger / Call Varro out / Retreat through ash chute / write-in) all have `player_response_mode = responds`; at least one targets a record in `driver_records`. Observer firewall passes — no hidden mind access.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/tests/fixtures/` exists and currently contains CF-test fixtures, patch-plan fixtures, and a `midstory-introduction/` subdirectory. No existing `red-kiln-ambush` directory (verified via the Pre-flight existence check earlier this session — no collision). Per SPEC-76 §6.3, the fixture path is `tools/validators/tests/fixtures/red-kiln-ambush/`. Inline-fixture-builder pattern (established by `chc-slt-selected-commitment-trace.test.ts` and sibling tests) is used for the per-validator structural tests in SPEC76TURDRIPRI-003 through 006; the golden fixture under `tests/fixtures/` is a separate convention used for end-to-end integration tests that exercise multiple validators against a shared fixture-world copy.
2. SPEC-76 §6.3 prescribes the fixture content verbatim — NPC-initiated event with Varro's plan step + clock fire producing `turn_resolution` SE; page plan §7a renders the driver and the 4 driver_records; emitted CHCs all carry `responds` mode with at least one targeting a record in `driver_records`; observer firewall passes (no `Varro smiled because he knew Jon would choose Mara`-style hidden mind narration). Per SPEC-76 §8 Implementation Slice E: "Red Kiln Ambush + 5 failing variants (no driver, hidden mind leak, missing pressure table, mismatched §7a, wrong response mode)."
3. **Cross-skill / cross-artifact boundary**: this fixture exercises the full SPEC-76 pipeline end-to-end — schema (SPEC76TURDRIPRI-001), contract (SPEC76TURDRIPRI-002), 4 new validators (SPEC76TURDRIPRI-003 through 006), 3 existing-validator updates (archive/tickets/SPEC76TURDRIPRI-007.md), 3 skill amendments (archive/tickets/SPEC76TURDRIPRI-008.md, archive/tickets/SPEC76TURDRIPRI-009.md, SPEC76TURDRIPRI-010). The fixture's content (the SE record, the PG record, the page-plan body, the CHC records) must be coherent across all surfaces; the test asserts each validator's verdict on the fixture matches the expected pass/fail per the spec's verification matrix.
4. **FOUNDATIONS principle**: §FOUNDATIONS Alignment table validation. The fixture demonstrates the composed end-to-end behavior across the spec's named alignment: §Story Bundles §5b (Schema-Minimalism — every field load-bearing), §5c (Present Causal State — driver salience local), §6b (Observer Firewall — Jon's POV via window grants direct observation), §4a (Plan-Authority Boundary — §7a is render-side projection of SE.turn_driver), §5a (Commitment Blocks — narrative-shape-field-rejection backstop preserved), Rule 5 (No Consequence Evasion — active-pressure table accounts for all 4 high-urgency records), Rule 7 (Preserve Mystery — no hidden state leaked through `perceived_directly`).

## Architecture Check

1. **Capstone integration fixture, no new production code**: this ticket introduces no new production code; it composes existing validators (4 new + 3 modified) against a single fixture-world to prove the spec's end-to-end intent. Per the §Spec-Integration Ticket Shape from spec-to-tickets, the fixture-world copy strategy must use `fs.cpSync` to a temp root (or equivalent) so the test never mutates canon; expected counts must be re-enumerated at test start (not hardcoded) — though for this fixture the validator verdicts are the assertions, not counts; the spec §6.3 verification matrix is the test matrix. Alternatives considered and rejected: (a) skip the integration fixture and rely on per-validator structural tests alone — rejected, the source report's §15 explicitly names "Red Kiln Ambush" as a golden fixture; the composed behavior is what the spec proves; (b) merge with one of the per-validator structural-test files — rejected, the fixture exercises multiple validators; merging would obscure the fixture's role as the capstone integration test.
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

## What to Change

### 1. Create the fixture directory

Create `tools/validators/tests/fixtures/red-kiln-ambush/` containing the fixture-world structure:

- A minimal world directory tree (`worlds/red-kiln-ambush/`) with the SE-X (turn_resolution event with npc_action driver), parent PG snapshot (containing STPLAN-9, STEMO-12, CLK-3, THR-4 as high-urgency active records), STENT records for Varro and Jon, BEL records granting Jon access to the shot trace, page-plan body file with §7a section listing the driver records, CHC records with `player_response_mode: responds` and at least one CHC whose `grounded_in.records[]` includes a driver_record.
- The fixture content reproduces the source report's §15 Red Kiln Ambush scenario verbatim.

### 2. Create the integration test

Create `tools/validators/tests/structural/red-kiln-ambush-integration.test.ts` (or under `tools/validators/tests/integration/` if the package's convention prefers a separate integration subdirectory). The test:

1. Copies the fixture-world to a temp root via `fs.cpSync` (or equivalent) to avoid canon mutation.
2. Loads the fixture-world's records into the validator framework's run context.
3. Runs each of the 6 SPEC-76 validators (4 new + 2 modified-and-relevant — `observer_firewall` extended, `turn_cycle_output_grounding_integrity` extended) against the fixture.
4. Asserts the positive Red Kiln Ambush fixture passes all validators (zero verdicts).

### 3. Add the 5 failing variants

Per SPEC-76 §8 Slice E, add 5 failing-variant fixtures (each a small mutation of the canonical Red Kiln Ambush fixture) and assert each produces the expected verdict:

- **No driver variant**: SE has `event_kind = turn_resolution` but no `turn_driver` object → `turn_driver_schema_compliance.turn_driver_missing`.
- **Hidden mind leak variant**: SE.turn_driver cites Varro's STPLAN-9 (offstage) with `pov_visibility = perceived_directly` → `turn_driver_pov_observer_firewall.turn_driver_hidden_state_leak`.
- **Missing pressure table variant**: page-plan §7a omits the `Active-pressure disposition` table while parent PG has the 4 high-urgency records → `page_plan_turn_driver_consistency.page_plan_active_pressure_table_missing` and/or `active_pressure_handling_discipline.high_urgency_active_record_unhandled` per the validators' enforcement scopes.
- **Mismatched §7a variant**: page-plan §7a's `Driver kind:` says `offstage_action` while SE.turn_driver.kind says `npc_action` → `page_plan_turn_driver_consistency.page_plan_driver_kind_mismatch`.
- **Wrong response mode variant**: emitted CHCs all carry `player_response_mode: initiates` (instead of `responds`) → the Phase 8 amendment's response-mode requirement fails (enforced by `turn_cycle_output_grounding_integrity` or a related grounding check per the topical-grounding extension in archive/tickets/SPEC76TURDRIPRI-007.md).

### 4. Document the fixture's role

Add a brief README or top-of-fixture-directory comment naming the fixture's purpose (Red Kiln Ambush, source report §15, SPEC-76 §6.3 + §8 Slice E) and the 5 failing variants' expected verdicts.

## Files to Touch

- `tools/validators/tests/fixtures/red-kiln-ambush/` (new directory tree with fixture-world records)
- `tools/validators/tests/structural/red-kiln-ambush-integration.test.ts` (new — or `tools/validators/tests/integration/red-kiln-ambush.test.ts` per the package's convention)
- `tools/validators/tests/fixtures/red-kiln-ambush/README.md` (new — names the fixture's role + 5 failing variants)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- Contract amendments — ship in SPEC76TURDRIPRI-002.
- Per-validator structural tests (inline-fixture-builder shape) — ship in SPEC76TURDRIPRI-003 through 007.
- Skill SKILL.md edits — shipped in archive/tickets/SPEC76TURDRIPRI-008.md and archive/tickets/SPEC76TURDRIPRI-009.md; SPEC76TURDRIPRI-010 still owns the health-audit skill edit.
- Test-bundle rebuild (e.g., `red-bunny`) — documented in SPEC-76 §7 Migration; mechanical rebuild outside this fixture's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — the new Red Kiln Ambush integration test passes; the 5 failing variants each produce the expected verdict.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds.
3. The fixture-world directory tree under `tools/validators/tests/fixtures/red-kiln-ambush/` is self-contained (no external file references) and reproduces the source report's §15 scenario verbatim.
4. The integration test does not mutate canon — `fs.cpSync` (or equivalent) copies the fixture to a temp root before validator runs.

### Invariants

1. The canonical Red Kiln Ambush fixture passes ALL 6 SPEC-76-relevant validators (zero verdicts).
2. Each of the 5 failing variants produces EXACTLY the expected verdict (per the §3.6.x error codes); no incidental false positives from other validators.
3. The fixture is the capstone integration test for SPEC-76; future spec changes that break the fixture indicate either a deliberate spec amendment (update the fixture) or a regression (fix the code).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/red-kiln-ambush-integration.test.ts` (new) — canonical Red Kiln Ambush passes + 5 failing variants assertions.
2. `tools/validators/tests/fixtures/red-kiln-ambush/` (new) — fixture-world directory tree reproducing source report §15.

### Commands

1. `cd tools/validators && npm test` — runs the full validator test suite including the new integration test.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new integration test file.
3. `cd tools/validators && npm test -- --test-name-pattern="red-kiln-ambush"` — targeted run of the integration test (or equivalent test-name filter per node:test runner conventions).
