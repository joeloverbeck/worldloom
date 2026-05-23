# SPEC76TURDRIPRI-001: Schema — `event_kind` collapse + `turn_driver` object + `selection_source` extension

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/schemas/story-event.schema.json` (breaking schema change to existing SE record shape)
**Deps**: None

## Problem

The `SE` (story-event) schema lacks a first-class way to encode non-player turn initiative. `event_kind` enum at `tools/validators/src/schemas/story-event.schema.json:26-36` enumerates only `story_start | selected_choice | write_in_attempt | system_repair | audit_repair | prose_attach | promotion_closeout`; there is no `npc_action`, `offstage_action`, `clock_fire`, or `world_pressure` kind. `selection_source` at lines 48-50 lacks non-player initiative sources. Active high-urgency STPLAN / STEMO / CLK / THR records can persist across pages without ever being selected as a turn driver — the structural inertness that makes the system feel reactive.

Per SPEC-76 §3.1: collapse `event_kind` to `story_start | turn_resolution | system_repair | audit_repair | prose_attach | promotion_closeout`; introduce a required `turn_driver` object on `turn_resolution` events with `kind`, `initiator`, `driver_records[]`, `player_response_mode`, `pov_visibility`; extend `selection_source` to include `npc_initiative | offstage_initiative | clock_fire | world_pressure | secret_reveal` alongside the existing player sources.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/src/schemas/story-event.schema.json` currently lists `event_kind` at lines 26-36 with the 7-value enum named above; `selection_source` at lines 48-50 with `emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none`; `world_logic_rationale` is required at line 17 (string, minLength 1); commitment object spans lines 43-75 with conditional `if/then/else` at lines 337-365 keying on `event_kind` value (not on the specific retired enum names) — verified via reassess-spec Agent 1 in this session.
2. SPEC-76 §3.1 prescribes the exact enum + field shapes; the breaking change is acknowledged by §7 Migration which states no in-flight world carries SE records under the new contract and test bundles (e.g., `red-bunny`) must rebuild before this spec's validators turn on; document this in this ticket's Assumption Reassessment per §7's explicit instruction.
3. **Cross-skill / cross-artifact boundary**: this schema is consumed by every validator that filters SE events by kind, every skill that emits SE records (`branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `story-promotion-closeout`), the patch-engine's SE record op handlers, and the world-index parser. The shape under audit is the SE record schema; all downstream consumers must be coherent with the new shape before validators turn on. SPEC-76 §3.7 names the source-validator consumers (`observer_firewall`, `chc_slt_selected_commitment_trace`, `turn_cycle_output_grounding_integrity`) — these land in SPEC76TURDRIPRI-007. Test fixture rebuild is documented in §7 Migration; not in scope for this ticket.
4. **FOUNDATIONS principle**: §Story Bundles §5b (Schema-Minimalism At Story Scope) governs this ticket. Every new field in `turn_driver` is load-bearing: `kind` drives the `turn_driver_schema_compliance` validator and is consumed by replay; `initiator` constrains per-kind driver-record patterns; `driver_records[]` is the audit-trace and validator input; `player_response_mode` constrains downstream CHC emission per SPEC76TURDRIPRI-008's Phase 8 amendment; `pov_visibility` drives observer-firewall checks (SPEC76TURDRIPRI-004). Free-text `why_now` from the source report is intentionally NOT added; per SPEC-76 §3.1 it folds into existing `world_logic_rationale`.
5. **Existing output schema extended**: this ticket extends `story-event.schema.json` — the schema is consumed by the patch-engine validator pipeline, the structural-validator framework, and every story-pipeline skill that emits SE records. The extension is BREAKING by design (collapses `selected_choice | write_in_attempt` into `turn_resolution` + `turn_driver.kind`); per SPEC-76 §7 Migration, no backwards-compatibility shims are introduced and test bundles must rebuild from `branching-story-bootstrap`.
6. **Rename/removal blast radius**: retired `event_kind` enum values are `selected_choice` and `write_in_attempt`. Grep pipeline-wide (per reassess-spec Agent 1 in this session): source code blast radius is `tools/validators/src/structural/observer-firewall.ts:62-64` (1 site — handled in SPEC76TURDRIPRI-007); other source validators (`audit-only-se-shape.ts`, `turn-cycle-output-grounding-integrity.ts`, `midstory-record-introduction-grounding.ts`, `expected-witness-coverage.ts`, `state-snapshot-integrity.ts`) reference preserved enum values (`story_start`, `prose_attach`, `promotion_closeout`) and continue to work unchanged. Test fixtures (~30+ sites across `tools/validators/tests/`, `tools/world-index/tests/`, `tools/world-mcp/tests/`) carrying the retired values need rebuild per §7 Migration.
7. **Implementation-time fixture partition**: package proof exposed three same-package current-contract fixtures that had to move with the schema (`tools/validators/tests/integration/spec34-integration.test.ts`, `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts`, and schema-compliance roundtrip/event tests). The broader story-bundle rebuild remains out of scope and owned by later SPEC-76 slices.

## Architecture Check

1. **Schema as authoritative contract**: extending the SE schema with a structured `turn_driver` object plus `if/then` constraints encodes per-kind invariants directly in JSON Schema where the existing pipeline reads them — no validator code is required to enforce the schema-level constraints, only the cross-record-boundary constraints (those land in SPEC76TURDRIPRI-003's `turn_driver_schema_compliance` validator). Alternatives considered and rejected: (a) keep the old enum and infer driver from prose — rejected, contradicts SPEC-76 §3.1's first-class causality goal and per FOUNDATIONS §Story Bundles §5b "no field exists unless it is consumed by a validator"; (b) introduce backwards-compat shims — explicitly rejected per SPEC-76 §7 Migration and per source-report §16 Non-goals.
2. **No backwards-compatibility aliasing**: the retired `selected_choice` and `write_in_attempt` enum values are removed outright. Per SPEC-76 §7, no aliasing or `$schema-version` discriminator is added; the breaking schema change is acceptable because no in-flight world carries SE records under the new contract.

## Verification Layers

1. **Invariant**: `event_kind = turn_resolution` requires `turn_driver` object → JSON Schema `if/then` validation at the schema level (no validator code).
2. **Invariant**: `event_kind = story_start | prose_attach | promotion_closeout | system_repair | audit_repair` forbids `turn_driver` → JSON Schema `if/then/else` validation.
3. **Invariant**: per-`kind` constraints on `initiator`, `driver_records[]`, `player_response_mode`, `pov_visibility` (per SPEC-76 §3.1's 8 constraint bullets) → JSON Schema `oneOf` discriminated by `turn_driver.kind`.
4. **Invariant**: retired enum values produce schema-validation failures → schema-test fixtures under `tools/validators/tests/schemas/`.
5. **Invariant**: `selection_source` enum extension is additive over preserved player sources → schema enum membership grep + existing-fixture pass-through.

## What to Change

### 1. Collapse `event_kind` enum

In `tools/validators/src/schemas/story-event.schema.json` at lines 26-36, replace the existing enum members `selected_choice` and `write_in_attempt` with the single `turn_resolution` value. Final enum: `story_start | turn_resolution | system_repair | audit_repair | prose_attach | promotion_closeout`.

### 2. Add required `turn_driver` object

Add a new top-level property `turn_driver` with the following structure:

```yaml
turn_driver:
  type: object
  additionalProperties: false
  required: [kind, initiator, driver_records, player_response_mode, pov_visibility]
  properties:
    kind:
      type: string
      enum: [player_action, player_write_in, npc_action, offstage_action, world_pressure, clock_fire, secret_reveal, multi_actor_collision]
    initiator:
      type: string
      pattern: "^(STENT-[0-9]+|player|world|system|unknown)$"
    driver_records:
      type: array
      items:
        type: string
        pattern: "^(STPLAN|STEMO|CLK|THR|STSEC|STQ|OBL|CNSQ|SREL|STCHAR)-[0-9]+$"
    player_response_mode:
      type: string
      enum: [initiates, responds, witnesses, chooses_continuation, none]
    pov_visibility:
      type: string
      enum: [perceived_directly, inferred_from_trace, reported, discovered_after, withheld]
```

### 3. Encode per-`kind` constraints

Add an `allOf` block with `if/then` rules per SPEC-76 §3.1 bullets:

- `kind = player_action` requires `initiator = player`, `player_response_mode = initiates`, `driver_records: []`, `pov_visibility = perceived_directly`.
- `kind = player_write_in` requires `initiator = player`, `player_response_mode = initiates`, `driver_records: []`, `pov_visibility = perceived_directly`.
- `kind = npc_action` requires `initiator` matches `^STENT-\d+$`, `driver_records` non-empty including at least one STPLAN / STEMO / CLK / THR / STCHAR.
- `kind = offstage_action` requires `initiator` matches `^STENT-\d+$`, `driver_records` non-empty, `pov_visibility ∈ {inferred_from_trace, reported, discovered_after, withheld}` (never `perceived_directly`).
- `kind = clock_fire` requires `initiator = world` (or `system` for synthetic ticks), `driver_records` non-empty including at least one CLK.
- `kind = world_pressure` requires `initiator = world`, `driver_records` non-empty.
- `kind = secret_reveal` requires `driver_records` non-empty including at least one STSEC.
- `kind = multi_actor_collision` requires `initiator = unknown`, `driver_records` non-empty with records from at least two distinct STENTs.

### 4. Conditional `turn_driver` requirement

Modify the existing top-level `allOf` block (currently at lines 337-365) so that:
- When `event_kind = turn_resolution`, `turn_driver` is required.
- When `event_kind ∈ {story_start, prose_attach, promotion_closeout, system_repair, audit_repair}`, `turn_driver` is forbidden.

### 5. Extend `selection_source` enum

At lines 48-50, extend the enum from `emitted_choice | author_pool | runtime_jit | system_repair | audit_repair | none` to `emitted_choice | author_pool | runtime_jit | npc_initiative | offstage_initiative | clock_fire | world_pressure | secret_reveal | system_repair | audit_repair | none`.

### 6. Adjust existing commitment conditional

Update the existing conditional at lines 337-365 so the `non-null commitment` branch's `selection_source` enum membership lists the new 8-value player+non-player set (excluding `none`) rather than the prior 5-value set.

### 7. Schema unit tests

Per SPEC-76 §6.1, add fixtures under `tools/validators/tests/schemas/` for each of:
- `event_kind = turn_resolution` requires `turn_driver` — invalid fixture without `turn_driver` fails.
- `event_kind = story_start` forbids `turn_driver` — invalid fixture with `story_start` + `turn_driver` fails.
- `kind = player_action` with non-empty `driver_records` fails.
- `kind = offstage_action` with `pov_visibility = perceived_directly` fails.
- `kind = npc_action` with `initiator = player` fails.
- Each non-player `kind` accepts a representative valid fixture.

## Files to Touch

- `tools/validators/src/schemas/story-event.schema.json` (modify)
- `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance-story-event.test.ts` (modify — current-contract story-event schema fixtures)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify — schema field-set and representative SE fixture)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify — current-contract SE event fixture; observer-firewall event-kind extension remains SPEC76TURDRIPRI-007)
- `tools/validators/tests/integration/spec48-se-structured-introduction-fields.test.ts` (modify — current-contract SE event fixture)

## Out of Scope

- New structural validators (`turn_driver_schema_compliance`, etc.) — ship in SPEC76TURDRIPRI-003 through SPEC76TURDRIPRI-006.
- Existing-validator updates (`observer_firewall`, `chc_slt_selected_commitment_trace`, `turn_cycle_output_grounding_integrity`) — ship in SPEC76TURDRIPRI-007.
- Contract amendments (`story-state-contract.md` §4/§7/§8/§16a) — ship in SPEC76TURDRIPRI-002.
- Skill changes (turn-cycle / bootstrap / health-audit) — ship in SPEC76TURDRIPRI-008/009/010.
- Test-bundle rebuild (e.g., `red-bunny`) — documented in §7 Migration; mechanical rebuild outside this ticket's scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — all schema unit tests in `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` pass.
2. Schema fixtures asserting `event_kind = turn_resolution` requires `turn_driver` pass; fixtures asserting the inverse (`story_start` + `turn_driver`) fail.
3. Existing schema fixtures for `prose_attach`, `promotion_closeout`, `system_repair`, `audit_repair`, `story_start` (without `turn_driver`) continue to pass — the preserved event kinds are unaffected.
4. `cd tools/validators && npm run build` — TypeScript compilation succeeds.

### Invariants

1. `story-event.schema.json` is the sole source of truth for SE record shape; per-kind invariants are encoded as JSON Schema `if/then` rules rather than smuggled through validator code.
2. Retired enum values `selected_choice` and `write_in_attempt` produce schema-validation failures with no aliasing or fallback.
3. The new `turn_driver` object's fields are all load-bearing per FOUNDATIONS §Story Bundles §5b (each consumed by a validator or replay primitive).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` (new) — schema-level fixture suite per SPEC-76 §6.1's 5 named cases plus per-kind positive fixtures.

### Commands

1. `cd tools/validators && npm test` — runs the validator package's full test suite including new schema tests.
2. `cd tools/validators && npm run build` — verifies TypeScript compilation of the updated schema-fixture suite.

## Outcome

Completed: 2026-05-23

Implemented the breaking `SE` schema change in `tools/validators/src/schemas/story-event.schema.json`: `event_kind` now uses `turn_resolution` instead of `selected_choice | write_in_attempt`; `turn_driver` is required only on `turn_resolution` and forbidden on the preserved non-turn event kinds; `selection_source` now includes the non-player initiative sources from SPEC-76.

Added `tools/validators/tests/schemas/story-event-turn-driver-schema.test.ts` with strict Ajv2020 schema coverage for required/forbidden `turn_driver`, player/offstage/NPC rejection cases, representative valid driver kinds, and retired event-kind rejection. Updated current-contract schema-compliance and integration fixtures that are package proof surfaces to emit `turn_resolution` plus `turn_driver`.

Deviation: JSON Schema enforces the multi-actor collision schema-level shape as `initiator = unknown` plus at least two driver records. It cannot prove that those records come from two distinct `STENT` actors because `driver_records[]` contains record ids, not actor attribution; that cross-record semantic check remains in the structural-validator slice.

Deviation: `tools/validators/tests/integration/spec34-integration.test.ts` no longer expects the old `observer_firewall_violation_private_belief_leak` from a `selected_choice` fixture, because the old event kind is now invalid and the observer-firewall turn-resolution extension is explicitly owned by SPEC76TURDRIPRI-007.

## Verification Result

- `cd tools/validators && npm run build` — PASS; TypeScript compilation and CLI chmod completed.
- `cd tools/validators && node --test dist/tests/schemas/story-event-turn-driver-schema.test.js dist/tests/structural/record-schema-compliance-story-event.test.js dist/tests/structural/contract-schema-roundtrip.test.js` — PASS; 30 focused schema/schema-compliance tests passed.
- `cd tools/validators && node --test dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec48-se-structured-introduction-fields.test.js` — PASS; 5 integration tests passed after current-contract fixture updates.
- `cd tools/validators && npm test` — PASS; 972 package tests passed.
