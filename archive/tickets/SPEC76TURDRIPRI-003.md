# SPEC76TURDRIPRI-003: Validator — `turn_driver_schema_compliance`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new structural validator at `tools/validators/src/structural/turn-driver-schema-compliance.ts`; new registry entry at `tools/validators/src/public/registry.ts`
**Deps**: archive/tickets/SPEC76TURDRIPRI-002.md

## Problem

JSON Schema validation alone cannot express constraints that span SE record + parent PG.state_snapshot boundaries. SPEC-76 §3.6.1 prescribes a new structural validator `turn_driver_schema_compliance` that enforces the cross-record-boundary constraints on `turn_driver`: every record cited in `driver_records[]` must be active on the parent PG's `active_records`; non-player driver kinds require non-empty `driver_records`; offstage_action forbids `perceived_directly` POV; player kinds forbid non-empty `driver_records`. These checks are structural (closed enum + cross-record predicates) rather than JSON Schema expressible because they reference parent-page state.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/public/registry.ts` currently exports `structuralValidators` and `ruleValidators` as `readonly Validator[]` arrays at lines 111-223; the registration pattern is named-import-plus-array-append per the (a) variant convention from SPEC-76 §Pre-Process classification (verified via reassess-spec Agent 1 in this session). Sibling structural validators register at registry.ts lines 123 (`observerFirewall`), 150 (`chcSltSelectedCommitmentTrace`), 167 (`narrativeShapeFieldRejection`), 177 (`turnCycleOutputGroundingIntegrity`).
2. SPEC-76 §3.6.1 prescribes the validator's severity (`fail`), inputs (`SE records, parent PG.state_snapshot.active_records`), and 7 error codes verbatim: `turn_driver_missing`, `turn_driver_kind_invalid`, `turn_driver_initiator_pattern_violation`, `turn_driver_driver_record_inactive`, `turn_driver_driver_records_empty_for_non_player`, `turn_driver_offstage_perceived_directly`, `turn_driver_player_kind_with_driver_records`. The validator is structural — it checks schema-level constraints that JSON Schema cannot express across the SE/PG boundary; it does NOT check observer-firewall semantics (those land in SPEC76TURDRIPRI-004).
3. **Cross-skill / cross-artifact boundary**: this validator is registered in the validator framework's registry (per registry.ts pattern) and consumed by the framework run-loop at `full-world` and `pre-apply` modes — both modes per existing convention. The shape under audit is the `Validator` interface contract (the validator must export a `Validator` object matching the existing sibling validators' shape). No skill consumes this validator directly; it runs as part of the framework's structural pass.
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) motivates this ticket — `turn_driver.kind` drives this validator's per-kind constraint check; `initiator` constrains driver-record patterns; `driver_records[]` is the audit-trace and validator input; `player_response_mode` and `pov_visibility` are enforced for closed-enum membership. Every field this validator inspects is load-bearing per §5b. The validator's existence is what makes the field shapes structurally enforceable across the SE/PG record boundary.
5. **HARD-GATE / Canon Safety Check surface**: this is a new structural validator under `tools/validators/src/structural/`. Per the per-ticket-type granularity rule, item 5 fires because the structural validator gates story-bundle SE record writes at engine pre-apply time. The validator does not weaken any Mystery Reserve firewall — its scope is structural conformance, not Mystery resolution; the Mystery firewall remains the domain of `turn_driver_pov_observer_firewall` (SPEC76TURDRIPRI-004) and the existing `forbidden_mystery_resolution` deterministic check at `branching-story-prose-attach`.
6. Implementation-time proof fallout: `tools/validators/tests/integration/validate-patch-plan.test.ts` has a clean canon-only pre-apply plan that enumerates expected skipped validators. Registering `turn_driver_schema_compliance` required adding that validator to the skipped set for non-story plans; this is same-package proof-surface upkeep, not a behavior expansion.

## Architecture Check

1. **Structural-only validator**: this validator handles schema-level constraints that span SE + parent PG.state_snapshot — JSON Schema cannot encode "every record cited in `driver_records[]` must be active on the parent PG." The structural-validator framework's `Validator` interface is the natural home: receives the world map + commit context, returns an array of `Verdict` objects. Alternatives considered and rejected: (a) encode the cross-record constraints as JSON Schema custom keywords — rejected, the validator framework is the established surface and adding custom-keyword runners would duplicate machinery; (b) merge with `turn_driver_pov_observer_firewall` — rejected, the two validators have orthogonal scopes (this one is structural conformance; the sibling is observer-firewall semantics) and merging them would obscure their distinct failure modes.
2. **No backwards-compatibility aliasing**: the validator emits 7 closed error codes per SPEC-76 §3.6.1; no fallback or "permissive mode" is introduced.

## Verification Layers

1. **Invariant**: `event_kind = turn_resolution` with missing `turn_driver` → `turn_driver_missing` verdict → structural validator test with inline-fixture-builder.
2. **Invariant**: `turn_driver.kind` outside the closed 8-value enum → `turn_driver_kind_invalid` verdict → structural validator test.
3. **Invariant**: per-`kind` initiator pattern violations (e.g., `kind = npc_action` with `initiator = player`) → `turn_driver_initiator_pattern_violation` verdict → structural validator test, 1 case per non-player kind.
4. **Invariant**: a record in `driver_records[]` not in parent PG's `active_records` → `turn_driver_driver_record_inactive` verdict → structural validator test exercising the cross-record boundary.
5. **Invariant**: non-player `kind` with empty `driver_records[]` → `turn_driver_driver_records_empty_for_non_player` verdict → structural validator test.
6. **Invariant**: `kind = offstage_action` with `pov_visibility = perceived_directly` → `turn_driver_offstage_perceived_directly` verdict → structural validator test.
7. **Invariant**: `kind ∈ {player_action, player_write_in}` with non-empty `driver_records[]` → `turn_driver_player_kind_with_driver_records` verdict → structural validator test.
8. **Invariant**: validator runs in `full-world` and `pre-apply` modes per existing convention → framework registry inclusion.

## What to Change

### 1. Create the validator module

Create `tools/validators/src/structural/turn-driver-schema-compliance.ts` exporting `turnDriverSchemaCompliance: Validator` with:

- `name: "turn_driver_schema_compliance"`
- `severity: "fail"`
- `appliesTo: <full-world | pre-apply modes>` per existing sibling-validator pattern.
- `run(...)` implementation iterating SE records, filtering for `event_kind = turn_resolution`, and emitting verdicts per the 7 error codes above.

For each SE event with `event_kind = turn_resolution`:

1. If `turn_driver` is absent → emit `turn_driver_missing`.
2. If `turn_driver.kind` not in the closed 8-value enum → emit `turn_driver_kind_invalid`.
3. Apply per-`kind` constraint checks per SPEC-76 §3.1 bullets:
   - `player_action` / `player_write_in`: require `initiator = player`, `player_response_mode = initiates`, `driver_records: []`, `pov_visibility = perceived_directly` — failures emit `turn_driver_initiator_pattern_violation` or `turn_driver_player_kind_with_driver_records` as appropriate.
   - `npc_action`: require `initiator` matches `^STENT-\d+$`, `driver_records` non-empty with at least one STPLAN/STEMO/CLK/THR/STCHAR.
   - `offstage_action`: require `initiator` matches `^STENT-\d+$`, `driver_records` non-empty, `pov_visibility ≠ perceived_directly` — failures emit `turn_driver_offstage_perceived_directly`.
   - `clock_fire`: require `initiator ∈ {world, system}`, `driver_records` non-empty with at least one CLK.
   - `world_pressure`: require `initiator = world`, `driver_records` non-empty.
   - `secret_reveal`: require `driver_records` non-empty with at least one STSEC.
   - `multi_actor_collision`: require `initiator = unknown`, `driver_records` non-empty with records from at least two distinct STENTs.
4. For each record in `turn_driver.driver_records[]`, verify the record id appears in the parent PG's `state_snapshot.active_records` (cross-record lookup) → emit `turn_driver_driver_record_inactive` for any inactive cite.

### 2. Register the validator

Add to `tools/validators/src/public/registry.ts`:

```typescript
import { turnDriverSchemaCompliance } from "../structural/turn-driver-schema-compliance.js";
```

Append to `structuralValidators` array alongside the existing sibling registrations.

### 3. Inline-fixture-builder tests

Per SPEC-76 §6.2 and the established convention at `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` and `branch-isolation.test.ts`, add `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` with:

- 6 positive cases (one per non-player driver kind: `npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision`) + 2 player-kind positive cases.
- 7 negative cases (one per failure code) demonstrating that the validator emits exactly the expected code with the expected record id.

## Files to Touch

- `tools/validators/src/structural/turn-driver-schema-compliance.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — single import + single array append)
- `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — structural registry inventory includes the new validator)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean canon-only pre-apply plan expects the story-event/page-scoped validator to skip)

## Out of Scope

- Observer-firewall semantics (POV access-route consistency for non-player drivers) — ship in SPEC76TURDRIPRI-004.
- Page-plan §7a parser + consistency check — ship in SPEC76TURDRIPRI-005.
- Active-pressure handling discipline — ship in SPEC76TURDRIPRI-006.
- Schema-level JSON Schema fixtures — ship in SPEC76TURDRIPRI-001.
- Existing-validator updates (`observer_firewall`, `chc_slt_selected_commitment_trace`, `turn_cycle_output_grounding_integrity`) — ship in SPEC76TURDRIPRI-007.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all tests in `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` pass.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds including the new validator module and registry import.
3. `cd tools/validators && npm test -- --test-name-pattern="turn_driver_schema_compliance"` — targeted run passes (or equivalent test-name filter per node:test runner conventions).
4. Existing structural-validator tests continue to pass — the new validator does not interfere with sibling validators.

### Invariants

1. The validator emits exactly one verdict per failure case (no double-reporting, no missing reports).
2. The validator's error codes are closed and exactly match the 7 codes named in SPEC-76 §3.6.1.
3. The validator inspects only `event_kind = turn_resolution` events; other event kinds short-circuit.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/turn-driver-schema-compliance.test.ts` (new) — inline-fixture-builder suite per SPEC-76 §6.2: 6 non-player positive + 2 player positive + 7 negative cases.
2. `tools/validators/tests/structural/registry.test.ts` (modified) — confirms the registry exposes `turn_driver_schema_compliance`.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modified) — confirms a canon-only clean pre-apply plan treats the story-event/page-scoped validator as skipped.

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including the new structural test file.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the new validator module and registry import.

## Outcome

Completed: 2026-05-23.

Implemented `turn_driver_schema_compliance` as a structural validator registered in `tools/validators/src/public/registry.ts`. The validator runs in full-world mode, pre-apply mode for story event/page patch plans, and incremental mode for touched SE/PG files. It filters to `event_kind = turn_resolution`, enforces the closed `turn_driver.kind` set, validates per-kind initiator/driver-record constraints, checks non-player and player driver-record cardinality rules, rejects direct offstage visibility, and verifies every cited `driver_records[]` id appears in the parent page's `state_snapshot.active_records`.

Added inline structural tests covering the eight positive driver shapes, the seven SPEC-76 error codes, non-turn short-circuit behavior, and applicability scoping. Updated the structural registry inventory and the clean pre-apply integration test so canon-only plans correctly expect this story-event/page-scoped validator to skip.

## Verification Result

1. `cd tools/validators && npm run build` — PASS; TypeScript compiled the new validator module, registry import, and tests.
2. `cd tools/validators && node --test dist/tests/structural/turn-driver-schema-compliance.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js` — PASS; 25 focused structural/registry/pre-apply tests passed.
3. `cd tools/validators && npm test` — PASS on rerun; 976 tests passed, 0 failed. Initial broad run exposed the clean pre-apply integration expectation that needed the new validator listed as skipped on canon-only plans; after that same-package proof-surface update, the broad lane passed.

## Deviations

- Acceptance's `npm test -- --test-name-pattern="turn_driver_schema_compliance"` command is not a truthful Node test runner filter for this package. The focused equivalent used the compiled test files directly after `npm run build`.
- `multi_actor_collision` distinct-actor enforcement uses available story-record ownership fields (`holder`, `actor`, `subject`, `entity_id`, `stent_id`, or relationship `direction.from/to`) to determine whether cited driver records represent at least two STENTs. Deeper observer-firewall semantics remain out of scope for SPEC76TURDRIPRI-004.
