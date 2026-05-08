# SPEC22SCECOM-003: Add `arc_schema_compliance` + `choice_worthiness_completeness` + `stop_policy_parsability` validators + predicate-DSL grammar extension

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 3 new validator files under `tools/validators/src/rules/` and extends `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`. Validators auto-register via `tools/validators/src/public/registry.ts`.
**Deps**: archive/tickets/SPEC22SCECOM-002.md

## Problem

SPEC-22 §Track 2 names 8 new validators that enforce v2 record semantics beyond JSON-Schema structural shape. This ticket lands the first three: `arc_schema_compliance` (v2 SLT structural-block presence + sub-field non-emptiness), `choice_worthiness_completeness` (v2 CHC `likely_effects` + populated `choice_worthiness`), and `stop_policy_parsability` (every `stop_policy.normal_exits[].predicate` and `interrupt_before[].predicate` parses against the extended DSL grammar). The DSL grammar extension itself is a shared file with the existing `storylet_predicate_dsl_parsability` validator — both consume the extended grammar.

## Assumption Reassessment (2026-05-08)

1. `tools/validators/src/rules/` ships existing rule validators (`rule1-no-floating-facts.ts` through `rule7-mystery-reserve-preservation.ts`, `rule11-action-space.ts`, `rule12-redundancy.ts`, `rule_storylet_predicate_dsl_parsability.ts`) and `_shared/predicate-dsl-grammar.ts` (1.8KB). The new validators land alongside as parallel rule files.
2. Rule validators register through `tools/validators/src/public/registry.ts` via `ruleValidators` array — adding new files is an additive registry change.
3. **Cross-skill boundary under audit**: `_shared/predicate-dsl-grammar.ts` is shared between `storylet_predicate_dsl_parsability` (existing) and `stop_policy_parsability` (new). The grammar extension adds 19 stop-predicate forms (11 normal_exits + 8 interrupt_before per SPEC-22 §Track 3). Both validators consume the extended grammar; no version split.
4. **FOUNDATIONS Rule 1 (No Floating Facts)** restated: a v2 SLT must declare scope (arc_contract.commitment_scope) / prerequisites (existing storylet preconditions) / limits (execution_envelope) / consequences (effect_model). Each of the 7 structural blocks corresponds to one or more of these dimensions; absence is HARD-REJECT.
5. (HARD-GATE / canon-write ordering): N/A — validator framework is meta-tooling.
6. **Schema extension**: validators consume v2 schemas added in archive/tickets/SPEC22SCECOM-002.md. Without that archived schema-infrastructure owner, the validators have nothing to dispatch against for record_schema_compliance shape verification — but the rule-level checks operate on parsed YAML records directly and do not require record_schema_compliance to have run first. The archived ticket is a soft dep (not strict).
7. (Rename/removal blast radius): grammar file extension is additive (new predicate forms appended to existing token list). The existing `storylet_predicate_dsl_parsability` continues to work unchanged on storylet preconditions.

## Architecture Check

1. Each new validator follows the existing rule-validator structural shape: a deterministic check function over a parsed record set returning a `ValidatorResult`. Shared helpers live in `_shared/`. The auto-registration pattern via `registry.ts` avoids hand-wiring CLI surfaces.
2. No backwards-compatibility aliasing/shims — all three validators are net-new; no v1-to-v2 fallback path. Grammar extension preserves all v1 predicates; `storylet_predicate_dsl_parsability` continues to accept the legacy set unchanged.

## Verification Layers

1. `arc_schema_compliance` accepts/rejects per 7-block presence — unit test with mutated fixtures.
2. `choice_worthiness_completeness` accepts/rejects per `likely_effects` non-empty + `choice_worthiness` sub-field presence — unit test.
3. `stop_policy_parsability` accepts every documented predicate form; rejects unknown predicate; rejects malformed args — unit test against DSL grammar's 19 stop-predicate forms.
4. Grammar shared between siblings — grep `predicate-dsl-grammar` imports across `rules/` to confirm both validators import the same module.
5. Registry registration — grep `arc_schema_compliance|choice_worthiness_completeness|stop_policy_parsability` in `tools/validators/src/public/registry.ts`.
6. FOUNDATIONS Rule 1 alignment: HARD-REJECT failure mode preserves canon discipline (no floating fields admitted).

## What to Change

### 1. Add `tools/validators/src/rules/arc_schema_compliance.ts`

Deterministic check function over storylet records with `shape: scene_commitment_arc`:

- For each such SLT, verify all 7 structural blocks are present and non-empty: `arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`, `stop_policy`, `effect_model`, `exit_portfolio`.
- For each block, verify required sub-fields per SPEC-19 §A (e.g., `arc_contract.commitment_class`, `arc_contract.arc_archetype`, `arc_contract.allowed_outcome_band` non-empty; `dramatic_unit.central_dramatic_question` non-empty; `beat_plan.beats[]` non-empty; etc.).
- Failure mode: HARD-REJECT with reason naming the offending SLT id + missing block / empty sub-field.

### 2. Add `tools/validators/src/rules/choice_worthiness_completeness.ts`

Deterministic check function over CHC records with `choice_kind: scene_commitment`:

- For each such CHC, verify `likely_effects` is a non-empty array.
- Verify `choice_worthiness` block is populated: `strategic_question_answered` non-empty, `strong_axes[]` has ≥1 entry from the canonical enum, `expected_state_delta` non-empty, `why_not_microbeat` non-empty, `foreseeable_difference` non-empty.
- Failure mode: HARD-REJECT.

### 3. Add `tools/validators/src/rules/stop_policy_parsability.ts`

Deterministic check function over storylet records with `shape: scene_commitment_arc`:

- For each entry in `stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate`, parse against the extended DSL grammar.
- Verify predicate args match the per-predicate args schema (e.g., `commitment_satisfied` takes a commitment id; `npc_makes_demand` takes an NPC reference).
- Failure mode: HARD-REJECT with offending predicate text + parse-error reason.

### 4. Extend `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`

Add 19 stop-predicate forms (11 normal_exits + 8 interrupt_before) per SPEC-22 §Track 3:

- normal_exits: `commitment_satisfied`, `commitment_blocked`, `commitment_overturned`, `npc_makes_demand`, `npc_makes_disclosure`, `participant_exits`, `scene_goal_resolves`, `scene_goal_changes`, `new_obligation_created`, `open_thread_reprioritized`, `time_or_location_changes`
- interrupt_before: `irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change`

Each predicate's args-schema is documented in the grammar file. Existing storylet preconditions remain valid (additive grammar extension).

### 5. Register validators in `tools/validators/src/public/registry.ts`

Add the three new validator imports + entries to `ruleValidators` array.

## Files to Touch

- `tools/validators/src/rules/arc_schema_compliance.ts` (new)
- `tools/validators/src/rules/choice_worthiness_completeness.ts` (new)
- `tools/validators/src/rules/stop_policy_parsability.ts` (new)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — add stop-predicate forms)
- `tools/validators/src/public/registry.ts` (modify — register new validators)
- `tools/validators/tests/rules/arc_schema_compliance.test.ts` (new)
- `tools/validators/tests/rules/choice_worthiness_completeness.test.ts` (new)
- `tools/validators/tests/rules/stop_policy_parsability.test.ts` (new)

## Out of Scope

- Effect-model validators (in 004)
- Trace + envelope-conformance validators (in 005)
- Schema infrastructure (in archive/tickets/SPEC22SCECOM-002.md — record_schema_compliance + JSON schemas)
- Grammar extension for non-stop predicates (existing `storylet_predicate_dsl_parsability` covers these)
- v1 SLT/CHC backward-compatibility paths (forward-only per SPEC-22 §Track 5)
- Same downstream Out of Scope as 001/002 (JIT promotion, render-packet caching, etc.)

## Acceptance Criteria

### Tests That Must Pass

1. `arc_schema_compliance` accepts a fixture v2 SLT with all 7 blocks; rejects each of 7 mutated fixtures missing one block.
2. `choice_worthiness_completeness` accepts a fixture v2 CHC; rejects with `likely_effects: []`; rejects with `choice_worthiness.strong_axes: []`.
3. `stop_policy_parsability` accepts a fixture SLT with stop_policy citing all 19 documented predicates (one per predicate); rejects an SLT with `stop_policy.normal_exits[].predicate: "unknown_predicate"`; rejects with malformed args.
4. `world-validate` CLI runs against a v2 fixture bundle and emits PASS for all three validators.

### Invariants

1. Every `shape: scene_commitment_arc` SLT has all 7 structural blocks populated (per arc_schema_compliance).
2. Every `choice_kind: scene_commitment` CHC has non-empty `likely_effects` and populated `choice_worthiness` block (per choice_worthiness_completeness).
3. Every stop_policy predicate parses against the extended DSL grammar (per stop_policy_parsability).
4. `_shared/predicate-dsl-grammar.ts` is the single source-of-truth for both storylet and stop predicates — no parallel grammar files.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/arc_schema_compliance.test.ts` (new) — passing + 7 failing fixtures.
2. `tools/validators/tests/rules/choice_worthiness_completeness.test.ts` (new).
3. `tools/validators/tests/rules/stop_policy_parsability.test.ts` (new) — covers all 19 predicate forms.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm run test`
3. `cd tools/validators && node dist/src/cli/world-validate.js --world <test-fixture-world> --story <test-fixture-story>` — full-pipeline verification on v2 fixture bundle.
