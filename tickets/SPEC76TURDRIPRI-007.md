# SPEC76TURDRIPRI-007: Existing-validator updates — `observer_firewall` extension, `chc_slt_*` code rename, `turn_cycle_output_grounding_integrity` extension

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/observer-firewall.ts`, `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts`, `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`
**Deps**: SPEC76TURDRIPRI-001

## Problem

SPEC-76's schema changes (SPEC76TURDRIPRI-001) retire `event_kind = selected_choice | write_in_attempt` in favor of `turn_resolution + turn_driver`. Three existing structural validators need updates per SPEC-76 §3.7:

1. `observer_firewall` (`tools/validators/src/structural/observer-firewall.ts:62-64`) currently filters for the retired enum values; extend its event-kind filter to cover all `turn_resolution` events on the PLAYER side (player_action / player_write_in driver kinds).
2. `chc_slt_selected_commitment_trace` (`tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:216`) emits a verdict code named `selected_choice_unresolvable` that references the retired enum value as a string — no logic change needed (the validator already keys on `SE.commitment.selected_slt_id`), but the code-name must rename to a turn-driver-neutral form (e.g., `turn_resolution_unresolvable`).
3. `turn_cycle_output_grounding_integrity` extends to require `CHC.grounded_in.records[]` to include at least one record from `SE.turn_driver.driver_records[]` when emitted CHC carries `player_response_mode: responds`. The validator already requires grounding records; this adds a topical-grounding constraint when the page is driver-responsive.

## Assumption Reassessment (2026-05-23)

1. **observer_firewall** at `tools/validators/src/structural/observer-firewall.ts:44` exports `name: "observer_firewall"`; line 59-64 filters: `for (const event of maps.byType.get("story_event_record") ?? []) { ... const eventKind = stringValue(parsed.event_kind); if (eventKind !== "selected_choice" && eventKind !== "write_in_attempt") { continue; } }`. **chc_slt_selected_commitment_trace** at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:79-90` keys on `selected_slt_id` (not `event_kind`); line 216 contains the verdict code string `selected_choice_unresolvable`. **turn_cycle_output_grounding_integrity** at `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` currently validates that CNSQ/SF/DA created in a turn have `derived_from` fields pointing to active or same-turn records (lines 52-82); `event_kind === "story_start"` equality check at line 60; does NOT yet reference `turn_driver` or `driver_records` (field does not exist pre-SPEC76TURDRIPRI-001). Verified via reassess-spec Agent 1 in this session.
2. SPEC-76 §3.7 prescribes the three validator updates verbatim. The `chc_slt_selected_commitment_trace` line is dispositive: "no change needed; the validator already keys on `SE.commitment.selected_slt_id` and parent-page active-record predicates, not on the retired `event_kind` enum values. **Rename obligation:** the emitted verdict code `selected_choice_unresolvable` (line 216) references the retired `selected_choice` enum value as a string; rename to a turn-driver-neutral name (e.g., `turn_resolution_unresolvable`) when the new enum lands. Logic and call sites unchanged."
3. **Cross-skill / cross-artifact boundary**: `observer_firewall` is consumed by the framework run-loop and composes with `turn_driver_pov_observer_firewall` (SPEC76TURDRIPRI-004) — together they cover all `turn_resolution` events (this ticket extends `observer_firewall` to player drivers; SPEC76TURDRIPRI-004 covers non-player drivers). `chc_slt_selected_commitment_trace` is consumed by the framework run-loop; the code-name rename is observable in verdict consumers (CI tools, dashboards, audit reports) that surface verdict codes as strings — a downstream concern but not a hard breaking change since the validator's logic is unchanged. `turn_cycle_output_grounding_integrity` is consumed by the framework run-loop; the topical-grounding extension is additive (existing grounding-records checks remain).
4. **FOUNDATIONS principle**: §Story Bundles §6b (Observer Firewall) motivates the `observer_firewall` extension — without the extension, player-driver `turn_resolution` events would not be subject to firewall enforcement (the filter would skip them, replacing the prior behavior that covered `selected_choice` and `write_in_attempt`). FOUNDATIONS Rule 5 (No Consequence Evasion) motivates the `turn_cycle_output_grounding_integrity` extension — when a page is driver-responsive (CHC `player_response_mode: responds`), the response must be grounded in the driver's records; otherwise the response is a free-floating consequence with no causal anchor to what's being responded TO.
5. **HARD-GATE / Canon Safety Check surface**: this ticket modifies 3 structural validators under `tools/validators/src/structural/`. Per the per-ticket-type granularity rule, item 5 fires because the modified surfaces gate story-bundle SE/CHC record writes at engine pre-apply time. The `observer_firewall` extension strengthens the firewall (adds coverage to formerly-retired event kinds' replacement); it does not weaken any existing firewall. The `turn_cycle_output_grounding_integrity` extension adds a topical-grounding constraint without weakening any existing check.
6. **Rename/removal blast radius (validator code-name rename)**: the verdict code `selected_choice_unresolvable` at `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts:216` is the only source-code site referencing the retired `selected_choice` enum value as a code string. Test fixtures referencing this code string in expected-verdict assertions need updating per the rename. Grep pipeline-wide for `selected_choice_unresolvable` across `tools/validators/tests/`, `tools/world-mcp/tests/`, and any verdict-code consumer documentation — all sites need the rename to `turn_resolution_unresolvable` (the recommended new name per SPEC-76 §3.7).

## Architecture Check

1. **Three sub-changes in one ticket — coherent scope**: the three changes share a single concern (post-SPEC76TURDRIPRI-001 reconciliation of existing structural validators that referenced retired event-kind values, directly or as code strings). Per spec-to-tickets §Step 3 "When multiple spec deliverables share the same file set and cannot be implemented independently, merge them into a single ticket" — these three validators all live under `tools/validators/src/structural/` and all depend on SPEC76TURDRIPRI-001's schema landing first. Splitting into three separate tickets would multiply ceremony without adding reviewability. Alternatives considered and rejected: (a) merge the observer-firewall extension into SPEC76TURDRIPRI-004 — rejected, SPEC76TURDRIPRI-004 introduces a new sibling validator (non-player firewall); this ticket modifies the existing player-side firewall, and merging would obscure the orthogonal scopes; (b) defer the chc_slt rename to a separate ticket — rejected, the rename is a 1-line code-string change with corresponding test-fixture updates; deferring would leave a documented retcon obligation un-redeemed.
2. **No backwards-compatibility aliasing**: `observer_firewall`'s filter is extended directly (no fallback for the retired enum values); the verdict code is renamed without an alias path (the old code string is removed from the source AND tests); the grounding-integrity extension is additive (no shim).

## Verification Layers

1. **Invariant**: `observer_firewall` inspects all `turn_resolution` events with `turn_driver.kind ∈ {player_action, player_write_in}` → grep-proof of the updated event-kind filter at `observer-firewall.ts:62-64`.
2. **Invariant**: `observer_firewall` does NOT duplicate `turn_driver_pov_observer_firewall`'s scope (non-player drivers) → integration test confirming the two validators emit verdicts on disjoint event-kind sets.
3. **Invariant**: `chc_slt_selected_commitment_trace`'s verdict code is renamed from `selected_choice_unresolvable` to `turn_resolution_unresolvable` (or equivalent neutral name) → grep-proof of the renamed code string in source + tests + verdict consumers.
4. **Invariant**: `turn_cycle_output_grounding_integrity` emits a verdict when emitted CHC carries `player_response_mode: responds` but `CHC.grounded_in.records[]` shares no record with `SE.turn_driver.driver_records[]` → structural validator test.
5. **Invariant**: existing `turn_cycle_output_grounding_integrity` checks (CNSQ/SF/DA grounding via `derived_from`) continue to pass — the topical-grounding extension is additive.

## What to Change

### 1. Extend `observer_firewall` event-kind filter

In `tools/validators/src/structural/observer-firewall.ts` at lines 59-64, replace the existing filter:

```typescript
const eventKind = stringValue(parsed.event_kind);
if (eventKind !== "selected_choice" && eventKind !== "write_in_attempt") {
  continue;
}
```

With:

```typescript
const eventKind = stringValue(parsed.event_kind);
if (eventKind !== "turn_resolution") {
  continue;
}
const turnDriver = parsed.turn_driver;
const driverKind = turnDriver ? stringValue(turnDriver.kind) : undefined;
if (driverKind !== "player_action" && driverKind !== "player_write_in") {
  continue;
}
```

The validator now inspects only player-driver `turn_resolution` events; non-player drivers are handled by the sibling `turn_driver_pov_observer_firewall` (SPEC76TURDRIPRI-004).

### 2. Rename `selected_choice_unresolvable` verdict code

In `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` at line 216 (and any other site emitting the code string), rename `selected_choice_unresolvable` to `turn_resolution_unresolvable`. Validator logic is unchanged; this is a string-rename only.

### 3. Extend `turn_cycle_output_grounding_integrity` topical-grounding constraint

In `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts`, after the existing grounding-records check (lines 52-82), add a new constraint: when an emitted CHC's `player_response_mode = responds` AND the parent SE event has `turn_driver.driver_records[]` non-empty (non-player driver kind), the CHC's `grounded_in.records[]` must include at least one record from `SE.turn_driver.driver_records[]`. Emit a new verdict code (e.g., `chc_response_topical_grounding_missing`) when the constraint is violated.

### 4. Update test fixtures referencing renamed verdict code

For every test fixture under `tools/validators/tests/` that asserts on the `selected_choice_unresolvable` verdict code string, rename the assertion to `turn_resolution_unresolvable`. Use grep to enumerate: `grep -rn "selected_choice_unresolvable" tools/validators/tests/`.

### 5. Inline-fixture-builder tests for the topical-grounding extension

Add to `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts`:

- **Positive case**: CHC with `player_response_mode: responds` and `grounded_in.records[]` including a record from SE.turn_driver.driver_records[] → passes.
- **Negative case**: CHC with `player_response_mode: responds` and `grounded_in.records[]` not including any SE.turn_driver.driver_records[] record → emits the new verdict code.
- **No-op case**: CHC with `player_response_mode ∈ {initiates, witnesses, chooses_continuation, none}` → topical-grounding constraint not enforced; existing grounding-records check still applies.

### 6. Inline-fixture-builder tests for observer_firewall extension

Add to `tools/validators/tests/structural/observer-firewall.test.ts`:

- **Positive case**: player_action driver with `grounded_in.records[]` accessible via active BEL → passes.
- **Negative case**: player_action driver with `grounded_in.records[]` referencing inaccessible records → emits the existing observer-firewall verdict.
- **Composition test**: non-player driver event short-circuits in observer_firewall (delegated to turn_driver_pov_observer_firewall).

## Files to Touch

- `tools/validators/src/structural/observer-firewall.ts` (modify — extend event-kind filter)
- `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` (modify — rename verdict code at line 216)
- `tools/validators/src/structural/turn-cycle-output-grounding-integrity.ts` (modify — add topical-grounding constraint + new verdict code)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — update event-kind in fixtures + add composition test)
- `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify — rename verdict code in assertions)
- `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` (modify — add topical-grounding cases)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-001.
- New structural validators (`turn_driver_schema_compliance`, `turn_driver_pov_observer_firewall`, `page_plan_turn_driver_consistency`, `active_pressure_handling_discipline`) — ship in SPEC76TURDRIPRI-003 through 006.
- Skill SKILL.md edits — ship in SPEC76TURDRIPRI-008/009/010.
- `page_plan_stchar_packet_integrity` warn → fail behavior change for §16a labels — covered by SPEC76TURDRIPRI-002 contract amendment; the validator source change is outside this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all tests in `tools/validators/tests/structural/observer-firewall.test.ts`, `chc-slt-selected-commitment-trace.test.ts`, and `turn-cycle-output-grounding-integrity.test.ts` pass.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds including the modified validator modules.
3. `grep -rn "selected_choice_unresolvable" tools/validators/` returns zero matches (rename complete).
4. `grep -rn "turn_resolution_unresolvable" tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` returns at least 1 match (renamed code present).
5. Red Kiln Ambush canonical fixture (SPEC76TURDRIPRI-011) exercises the extended validators end-to-end with passing verdicts.

### Invariants

1. `observer_firewall` and `turn_driver_pov_observer_firewall` (SPEC76TURDRIPRI-004) emit verdicts on disjoint event subsets: observer_firewall covers `turn_resolution` with `turn_driver.kind ∈ {player_action, player_write_in}`; turn_driver_pov_observer_firewall covers the non-player kinds.
2. `chc_slt_selected_commitment_trace`'s logic is unchanged; only the verdict code string is renamed (no behavioral change).
3. `turn_cycle_output_grounding_integrity`'s topical-grounding extension fires only when CHC `player_response_mode = responds` AND parent SE has non-player driver records; other CHCs and player-driver pages are unaffected.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` (modify) — update event-kind in existing fixtures from `selected_choice`/`write_in_attempt` to `turn_resolution` + player driver_kind; add composition test confirming non-player drivers short-circuit.
2. `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` (modify) — rename `selected_choice_unresolvable` to `turn_resolution_unresolvable` in expected-verdict assertions.
3. `tools/validators/tests/structural/turn-cycle-output-grounding-integrity.test.ts` (modify) — add positive + negative + no-op cases for the new topical-grounding constraint.

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including the three modified test files.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the three modified validator modules.
3. `grep -rn "selected_choice_unresolvable" tools/validators/` — confirms rename complete (expect zero matches).
