# SPEC76TURDRIPRI-004: Validator — `turn_driver_pov_observer_firewall`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts`; new registry entry at `tools/validators/src/public/registry.ts`
**Deps**: archive/tickets/SPEC76TURDRIPRI-002.md

## Problem

When an SE event declares a non-player turn driver — `npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision` — and its `driver_records[]` cite hidden state (unrevealed `STSEC`, offstage `STPLAN` outside POV observation, active records the POV actor lacks an access route to), the declared `pov_visibility` must match the actor's actual access posture per FOUNDATIONS §Story Bundles §6b (Observer Firewall, extended by SPEC-78 to event-level driver declaration). SPEC-76 §3.6.2 prescribes a new structural validator `turn_driver_pov_observer_firewall` that enforces three observer-firewall constraints on `turn_driver`: no hidden-state leak via `perceived_directly`, no missing access route for inferred/reported visibility, no offstage direct mind access via narrated NPC interiority on `offstage_action` drivers.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/structural/observer-firewall.ts` currently exists at line 44 with `name: "observer_firewall"`; its event-kind filter at lines 59-64 only inspects `selected_choice` and `write_in_attempt` events (the retired enum values from SPEC76TURDRIPRI-001). SPEC76TURDRIPRI-007 extends `observer_firewall` to cover all `turn_resolution` events on the PLAYER side; this ticket adds the SIBLING validator that composes with `observer_firewall` to cover the NON-player driver kinds. (Verified via reassess-spec Agent 1 in this session.)
2. SPEC-76 §3.6.2 prescribes the validator's severity (`fail`), inputs (`SE.turn_driver, BEL records active on parent PG, page-plan §7a`), and 3 error codes verbatim: `turn_driver_hidden_state_leak`, `turn_driver_missing_access_route`, `turn_driver_offstage_direct_mind_access`. The validator composes with the existing `observer_firewall` by adding non-player driver kinds to its inspection set; this ticket's validator targets the cross-record-boundary observer-firewall checks specific to `turn_driver`.
3. **Cross-skill / cross-artifact boundary**: this validator consumes (a) `SE.turn_driver` (output of SPEC76TURDRIPRI-001's schema), (b) BEL records active on parent PG (`PG.state_snapshot.active_records.BEL[]`), (c) page-plan §16a packets (parsed by the shared `page_plan_stchar_packet_integrity` parser established by SPEC-73). The shape under audit is the cross-record correlation: the validator must read SE + parent PG + page-plan §16a body in one pass. Page-plan body inspection follows the existing `page_plan_stchar_packet_integrity` precedent at `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts` (verified via reassess-spec Agent 2 in this session).
4. **FOUNDATIONS principle**: §Story Bundles §6b (Information / Observer Firewall, extended by SPEC-78 to event-level driver declaration at `docs/FOUNDATIONS.md:688-700`) governs this ticket. The firewall's event-level extension states: *"When a causal event (`SE`) declares a non-player turn driver ... and its `driver_records[]` cite hidden state (an unrevealed `STSEC`, an offstage `STPLAN` outside POV observation, an active record the POV actor lacks an access route to), the declared `pov_visibility` must match the actor's actual access posture: `perceived_directly` only when the POV actor has direct observation; otherwise `inferred_from_trace`, `reported`, `discovered_after`, or `withheld`."* This validator is the structural enforcement surface for that extension. Rule 7 (Preserve Mystery Deliberately) is also implicated — a `turn_driver_hidden_state_leak` for an STSEC-citing driver with `perceived_directly` POV would resolve a Mystery Reserve / story-secret claim without proper observation grounding.
5. **HARD-GATE / Canon Safety Check surface**: this is a new structural validator under `tools/validators/src/structural/`. Per the per-ticket-type granularity rule, item 5 fires because the structural validator gates story-bundle SE record writes at engine pre-apply time. The validator strengthens the Mystery Reserve / story-secret firewall by blocking `perceived_directly` POV for drivers citing hidden STSEC; it does not weaken any existing firewall. The deterministic `forbidden_mystery_resolution` check in `branching-story-prose-attach` remains the downstream prose-side guard; this validator is the upstream event-side guard.
6. Implementation-time proof fallout: registering `turn_driver_pov_observer_firewall` required updating the structural registry inventory and the clean canon-only pre-apply plan expectation. The new validator skips in that canon-only plan because no story-event/page surfaces are present; this is same-package proof-surface upkeep, not behavior expansion.

## Architecture Check

1. **Composes with `observer_firewall`, distinct scope**: the existing `observer_firewall` validator inspects player-driver kinds (now `turn_resolution` with `kind ∈ {player_action, player_write_in}` after SPEC76TURDRIPRI-007's extension); this validator inspects non-player driver kinds. The split keeps the validators focused — `observer_firewall` handles "does the player actor have an access route to the records cited in their action?"; `turn_driver_pov_observer_firewall` handles "does the POV-acting actor have an access route to the records cited in a non-player driver's trace?" Merging them would create a single validator with two distinct scopes and obscure the player-vs-non-player distinction. Alternatives considered and rejected: (a) extend `observer_firewall` to cover all driver kinds — rejected, the existing validator's logic is player-focused; (b) defer to runtime page-rendering checks — rejected, the firewall must run at engine pre-apply time before any prose is rendered, per FOUNDATIONS §6b's emphasis on storylet/choice selection-time enforcement.
2. **No backwards-compatibility aliasing**: the validator emits 3 closed error codes per SPEC-76 §3.6.2; no fallback or "permissive POV inference" is introduced.

## Verification Layers

1. **Invariant**: `pov_visibility = perceived_directly` for a driver whose `driver_records[]` cite a hidden STSEC or unobservable offstage STPLAN → `turn_driver_hidden_state_leak` verdict → structural validator test exercising STSEC firewall.
2. **Invariant**: `pov_visibility ∈ {inferred_from_trace, reported}` but no active BEL or affordance grants the POV actor an access route → `turn_driver_missing_access_route` verdict → structural validator test exercising BEL access-route lookup.
3. **Invariant**: page-plan §16a or page-plan body narrates NPC interiority for an `offstage_action` driver → `turn_driver_offstage_direct_mind_access` verdict → structural validator test exercising the §16a parser.
4. **Invariant**: validator composes with `observer_firewall` without duplication (each validator emits its own scope's verdicts) → integration with the framework run-loop registry order.

## Landed Changes

### 1. Created the validator module

Created `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts` exporting `turnDriverPovObserverFirewall: Validator` with:

- `name: "turn_driver_pov_observer_firewall"`
- `severity: "fail"`
- `applies_to` covering full-world, pre-apply story event/page plans, and incremental story event/page/BEL/STSEC/STPLAN/page-plan surfaces.
- `run(...)` implementation iterating SE records by story, filtering for `event_kind = turn_resolution` with `turn_driver.kind` in the non-player set (`npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision`), and emitting verdicts per the 3 error codes.

For each non-player driver event, the landed validator:

1. Classifies hidden driver records:
   - STSEC with `status = hidden` (or equivalent unrevealed status) is hidden state.
   - STPLAN with `scope.visibility = offstage` (or equivalent offstage classification) is hidden state when the POV actor lacks an active BEL granting access.
2. Emits `turn_driver_hidden_state_leak` when `pov_visibility = perceived_directly` cites hidden STSEC or offstage STPLAN state without an access route.
3. Emits `turn_driver_missing_access_route` when `pov_visibility ∈ {inferred_from_trace, reported}` and no active BEL with `basis.access_records[]` grants access to the cited driver record.
4. Reads page-plan input files and emits `turn_driver_offstage_direct_mind_access` for offstage drivers when §7a / §16a / page-plan body text contains direct NPC interiority phrasing.

### 2. Registered the validator

Added to `tools/validators/src/public/registry.ts`:

```typescript
import { turnDriverPovObserverFirewall } from "../structural/turn-driver-pov-observer-firewall.js";
```

Appended to `structuralValidators` after `turnDriverSchemaCompliance`.

### 3. Added inline-fixture-builder tests

Added `tools/validators/tests/structural/turn-driver-pov-observer-firewall.test.ts` with:

- **Positive cases**: all six non-player driver kinds with lawful BEL access route or non-access-route `discovered_after` visibility.
- **Negative cases**:
  - offstage STPLAN cited as `perceived_directly` with no BEL access → `turn_driver_hidden_state_leak`.
  - hidden STSEC cited as `perceived_directly` → `turn_driver_hidden_state_leak`.
  - `inferred_from_trace` POV with no BEL/affordance grant → `turn_driver_missing_access_route`.
  - page-plan §16a narrates NPC interiority for `offstage_action` driver → `turn_driver_offstage_direct_mind_access`.

Updated `tools/validators/tests/structural/registry.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` so the registry inventory and clean canon-only pre-apply execution status include the new validator.

## Files to Touch

- `tools/validators/src/structural/turn-driver-pov-observer-firewall.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — single import + single array append)
- `tools/validators/tests/structural/turn-driver-pov-observer-firewall.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — structural registry inventory includes the new validator)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean canon-only pre-apply plan expects the story-event/page-scoped validator to skip)

## Out of Scope

- Schema-level `turn_driver` shape constraints — ship in SPEC76TURDRIPRI-003.
- Page-plan §7a structured-text parser — ship in SPEC76TURDRIPRI-005.
- Active-pressure handling discipline — ship in SPEC76TURDRIPRI-006.
- Extensions to the existing `observer_firewall` validator (covering player-driver `turn_resolution` events) — ship in SPEC76TURDRIPRI-007.
- §16a STCHAR packet label vocabulary tightening (warn → fail on the `page_plan_stchar_packet_integrity` validator) — covered by the contract amendment in SPEC76TURDRIPRI-002; the validator source change is outside this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all tests in `tools/validators/tests/structural/turn-driver-pov-observer-firewall.test.ts` pass.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds including the new validator module and registry import.
3. Red Kiln Ambush canonical fixture coverage remains downstream in SPEC76TURDRIPRI-011; this ticket proves the validator behavior with inline fixtures because the golden fixture does not exist yet.
4. Existing structural-validator tests continue to pass — the new validator does not interfere with sibling validators.

### Invariants

1. The validator emits exactly one verdict per failure case (no double-reporting, no missing reports).
2. The validator's error codes are closed and exactly match the 3 codes named in SPEC-76 §3.6.2.
3. The validator inspects only `event_kind = turn_resolution` events with non-player `turn_driver.kind`; player-driver kinds and other event kinds short-circuit (those are covered by `observer_firewall`).
4. The validator does not weaken the Mystery Reserve / story-secret firewall — hidden STSEC cites with `perceived_directly` POV produce `turn_driver_hidden_state_leak` without fallback.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/turn-driver-pov-observer-firewall.test.ts` (new) — inline-fixture-builder suite per SPEC-76 §6.2: positive cases for each non-player driver kind with proper access route + negative cases for each of the 3 error codes.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — confirms the registry exposes `turn_driver_pov_observer_firewall`.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — confirms a canon-only clean pre-apply plan treats the story-event/page-scoped validator as skipped.

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including the new structural test file.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new validator module and registry import.
3. `cd tools/validators && node --test dist/tests/structural/turn-driver-pov-observer-firewall.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` — focused validator/registry/pre-apply proof after build.

## Outcome

Completed: 2026-05-23.

Implemented `turn_driver_pov_observer_firewall` as a structural validator registered in `tools/validators/src/public/registry.ts`. The validator runs on full-world, story event/page pre-apply, and incremental story driver surfaces. It filters to non-player `turn_resolution` drivers, rejects hidden STSEC or offstage STPLAN records that claim direct POV visibility, requires active BEL access routes for inferred/reported visibility, and rejects offstage direct mind-access phrasing in page plans.

Added focused inline structural tests for the six non-player driver kinds, all three prescribed error codes, player-driver short-circuit behavior, and applicability scoping. Updated the structural registry inventory and the clean pre-apply integration test so canon-only plans correctly expect this story-event/page-scoped validator to skip.

## Verification Result

1. `cd tools/validators && npm run build` — PASS; TypeScript compiled the new validator module, registry import, and tests.
2. `cd tools/validators && node --test dist/tests/structural/turn-driver-pov-observer-firewall.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` — PASS; focused validator/registry/pre-apply proof passed after build.
3. `cd tools/validators && npm test` — PASS; 980 tests passed, 0 failed.

## Deviations

- The Red Kiln Ambush golden fixture is not present yet; SPEC76TURDRIPRI-011 owns end-to-end golden fixture coverage. This ticket proves the validator behavior with inline structural fixtures and keeps the golden acceptance as downstream coverage.
- The access-route check is intentionally conservative: it recognizes active BEL records whose `basis.access_records[]` cite the driver record and whose holder/visibility grants the POV actor access. Broader affordance inference remains out of scope until a later ticket provides a structured page-plan parser or richer observer-access surface.
