# SPEC42STOSTADEB-005: CLK validators + predicates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 5 new CLK-specific structural validators under `tools/validators/src/structural/`, 4 new CLK-specific predicates to the closed predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, mirrors them in predicate schemas, extends `storylet_predicate_dsl_parsability` additively, and registers all 5 validators in the validator registry at `tools/validators/src/public/registry.ts`
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md

## Problem

SPEC42STOSTADEB-001 landed the CLK class foundation (schema, machine-layer wiring, custom ops), but CLK records have no validator coverage yet — their structural correctness depends on per-class validators that enforce value-in-range, threshold ordering, tick provenance, firing-threshold integrity, and terminal-debt accountability. Without these, malformed CLK records can persist, and high-salience active clocks at terminal pages can silently violate Rule 5 (No Consequence Evasion). Storylets also cannot precondition on clock state because the predicate DSL has no `clock_*` predicates yet — archive/tickets/SPEC42STOSTADEB-011.md's `commitment-block-authoring` 14-target coverage extension depends on these predicates being available. This ticket lands the CLK-specific validator + predicate layer as one cohesive PR.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at implementation time (2026-05-17): `tools/validators/src/structural/` exists with the documented validator-file layout; `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` had 24 live closed predicate entries before this ticket and now has 28; `tools/validators/src/public/registry.ts` is the canonical validator-registration site. Existing structural validators (e.g., `state-snapshot-integrity.ts`, `snapshot-replay-equality.ts`) confirmed as pattern baselines for new CLK validators.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (CLK validators 5 listed) + §Deliverables Predicate DSL extensions (CLK predicates 4 listed) + §Verification Validator-level section (per-validator acceptance bullets); SPEC-42 §Risks "Author abuse — clock proliferation" notes that `branching-story-health-audit` should warn (not block) when CLK count exceeds a threshold — that warning logic is owned by SPEC42STOSTADEB-012, not this ticket.
3. Cross-skill / cross-tool shared boundary: the **closed predicate DSL** at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is consumed by `branching-story-turn-cycle`'s runtime SLT eligibility checks AND `commitment-block-authoring`'s precondition authoring. Adding the 4 CLK predicates here makes them available to BOTH consumers; the consumers' integration is owned by SPEC42STOSTADEB-009 (turn-cycle) and -011 (commitment-block-authoring). Shared file: `predicate-dsl-grammar.ts` is also modified by SPEC42STOSTADEB-006 (STSEC predicates) and -007 (STQ predicates) — three tickets all edit the same grammar file with non-overlapping additions; mechanical merge coordination needed but no semantic conflict. Shared file: `registry.ts` is modified by SPEC42STOSTADEB-006 / -007 / -008 in the same way.
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) motivates this ticket. CLK explicitly tracks delayed-consequence maturation (`value` ticks toward `max`, threshold effects fire at named values). Rule 5 requires that "If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest" — the `clock_terminal_debt_integrity` validator enforces this at the story-bundle scope: high-salience active clocks at terminal pages must be resolved, fired, inherited, or explicitly abandoned with rationale; silent abandonment fails the validator.
5. HARD-GATE validator surface: each of the 5 new validators registers as a structural validator in `tools/validators/src/public/registry.ts` and runs at engine pre-apply on every story-bundle commit involving CLK records. The validators gate CLK record writes at the engine boundary; malformed records cannot persist. Mystery Reserve firewall: not directly touched by CLK validators (CLK does not interact with `M-*` records). Hook 3 path-pattern coverage: unchanged.
6. Reassessment correction (2026-05-17): the live predicate layer is a closed grammar/parser/schema surface, not an evaluator for `CLK.value` comparisons. This ticket adds parse/schema support for the 4 CLK predicates and validates their references/arguments through `storylet_predicate_dsl_parsability`; runtime storylet-selection consumption remains owned by SPEC42STOSTADEB-009 / -011. The pre-apply overlay also must learn CLK create/tick/resolve records in `tools/validators/src/_helpers/index-access.ts`; otherwise the new validators would not see same-envelope CLK writes.

## Architecture Check

1. **Per-class validator cohesion**: CLK's 5 validators all enforce CLK-specific invariants (value bounds, threshold ordering, tick provenance, firing integrity, terminal debt). Bundling them in one ticket keeps CLK-specific structural-defense logic reviewable as a unit.
2. **Predicates ship alongside their validators**: the 4 CLK predicate shapes will be consumed at storylet-eligibility time by downstream skills; their argument/reference validity is tightly coupled to the validators' CLK record assumptions. Co-locating the predicate-DSL extension and validator extension keeps the surfaces semantically aligned without implementing runtime predicate evaluation in this package.
3. **No new shared infrastructure**: this ticket reuses the existing validator-registry pattern and the existing predicate-DSL grammar pattern. No new categories or schemas introduced — just additive entries.
4. **Mirrors existing per-class validator pattern**: existing structural validators like `slt-created-at-page-origin-consistency.ts` enforce SLT-specific invariants; the 5 new CLK validators follow the same per-class pattern.

## Verification Layers

1. `clock_value_in_range` FAILS for CLK with `value > max` or `value < 0`; PASSES otherwise → validator test via `npm test --prefix tools/validators`
2. `clock_threshold_ordering` FAILS for CLK with non-ascending `thresholds[].at` or `at > max`; PASSES otherwise → validator test
3. `clock_tick_provenance` FAILS for CLK with `tick_history[]` entry lacking valid `SE` reference or empty `cause` string; PASSES otherwise → validator test
4. `clock_firing_threshold_integrity` FAILS for CLK with `status: fired` but `value < max` (per spec §Verification: status: fired requires the value to have crossed the highest threshold via the tick history); PASSES otherwise → validator test
5. `clock_terminal_debt_integrity` WARNS for terminal branch leaf snapshot with a high-salience `CLK.status: active` and no terminal rationale; PASSES with explicit abandonment/inheritance in `terminal_rationale` → validator test
6. `clock_at_least(CLK-<int>, value)` predicate shape is accepted only for valid CLK references and integer values → predicate-DSL parser/schema test
7. `clock_below(CLK-<int>, value)` predicate shape is accepted only for valid CLK references and integer values → predicate-DSL parser/schema test
8. `clock_full(CLK-<int>)` predicate shape is accepted only for valid CLK references → predicate-DSL parser/schema test
9. `any_clock_active(alias, kind?, salience?)` is an actor-unbound existential predicate whose alias and optional filters validate in author-pool / branch-prefix scope → predicate-DSL parser/schema test

## What to Change

### 1. `clock_value_in_range` validator (new file)

Create `tools/validators/src/structural/clock-value-in-range.ts`. Validates: `CLK.value` is between 0 and `CLK.max` (inclusive). HARD-REJECT on violation with error message naming the CLK ID and the out-of-range value.

### 2. `clock_threshold_ordering` validator (new file)

Create `tools/validators/src/structural/clock-threshold-ordering.ts`. Validates: `CLK.thresholds[].at` is strictly ascending (no duplicates, no out-of-order entries); all `thresholds[].at` values are between 1 and `CLK.max`. HARD-REJECT on violation.

### 3. `clock_tick_provenance` validator (new file)

Create `tools/validators/src/structural/clock-tick-provenance.ts`. Validates: every `CLK.tick_history[]` entry references a real `SE-<integer>` event in the same branch path; `cause` field is non-empty; `delta` is non-zero. HARD-REJECT on violation.

### 4. `clock_firing_threshold_integrity` validator (new file)

Create `tools/validators/src/structural/clock-firing-threshold-integrity.ts`. Validates: `CLK.status: fired` requires the value to have crossed the highest threshold's `at` value via the tick history; if status is fired but no threshold was crossed, HARD-REJECT.

### 5. `clock_terminal_debt_integrity` validator (new file)

Create `tools/validators/src/structural/clock-terminal-debt-integrity.ts`. Validates: at terminal branch leaf snapshots, high-salience (`CLK.salience: high`) active (`CLK.status: active`) clocks must be resolved, fired, inherited, or explicitly abandoned with rationale via `terminal_rationale` (per the existing `branching-story-health-audit` terminal-debt pattern). HARD-REJECT (or WARNING per existing terminal-debt validator conventions — match the existing pattern at `branching-story-health-audit/SKILL.md` Phase 2f for `orphan_debt_at_terminal`) on violation.

### 6. Predicate DSL grammar extension (modify — shared file)

Modify `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` to add 4 new CLK predicates:
- `clock_at_least(CLK-<int>, value)` — exact CLK reference plus non-negative integer value
- `clock_below(CLK-<int>, value)` — exact CLK reference plus non-negative integer value
- `clock_full(CLK-<int>)` — exact CLK reference
- `any_clock_active(alias, kind?, salience?)` — actor-unbound existential shape; validates alias plus optional `kind` and/or `salience` filters for later predicate composition

Each predicate's parser entry mirrors the existing predicate format (e.g., `obligation_open`, `any_obligation_open`). The grammar extension is purely additive; existing 24 predicate entries are unchanged. **Shared-file coordination**: SPEC42STOSTADEB-006 (STSEC predicates) and SPEC42STOSTADEB-007 (STQ predicates) also extend this file with their own non-overlapping predicates — mechanical merge coordination needed.

### 7. Validator registry extension (modify — shared file)

Modify `tools/validators/src/public/registry.ts` to register the 5 new CLK validators in the structural-validators registry block (per `registry.ts:39-64` as documented in brainstorm agent reports). The registration entries follow the existing pattern (validator name → validator function reference). **Shared-file coordination**: SPEC42STOSTADEB-006 / -007 / -008 also extend this file with their own non-overlapping registrations.

## Files to Touch

- `tools/validators/src/structural/clock-value-in-range.ts` (new)
- `tools/validators/src/structural/clock-threshold-ordering.ts` (new)
- `tools/validators/src/structural/clock-tick-provenance.ts` (new)
- `tools/validators/src/structural/clock-firing-threshold-integrity.ts` (new)
- `tools/validators/src/structural/clock-terminal-debt-integrity.ts` (new)
- `tools/validators/src/structural/clock-utils.ts` (new helper shared by the 5 CLK validators)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 CLK predicates; shared file with SPEC42STOSTADEB-006 / -007)
- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify — mirrors the 4 CLK predicate argument schemas)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — mirrors the expanded predicate name enum used by record schema compliance)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — validates CLK predicate arguments and references)
- `tools/validators/src/public/registry.ts` (modify — registers 5 new CLK validators; shared file with SPEC42STOSTADEB-006 / -007 / -008)
- `tools/validators/src/_helpers/index-access.ts` (modify — pre-apply overlay materializes CLK create/supersede/tick/resolve operations for validator reads)
- `tools/validators/README.md` (modify — updates structural validator count and story schema inventory)
- `tools/validators/tests/structural/clock-value-in-range.test.ts` (new)
- `tools/validators/tests/structural/clock-threshold-ordering.test.ts` (new)
- `tools/validators/tests/structural/clock-tick-provenance.test.ts` (new)
- `tools/validators/tests/structural/clock-firing-threshold-integrity.test.ts` (new)
- `tools/validators/tests/structural/clock-terminal-debt-integrity.test.ts` (new)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- CLK class foundation (schema, machine-layer wiring, custom ops) — owned by SPEC42STOSTADEB-001
- STSEC and STQ validators + predicates — owned by SPEC42STOSTADEB-006 / -007
- Shared validator extensions (`state_snapshot_integrity` / `snapshot_replay_equality` / `branch_isolation` / `observer_firewall`) — owned by SPEC42STOSTADEB-008
- Storylet authoring extensions consuming new CLK predicates — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Turn-cycle integration consuming new CLK predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit warnings for CLK proliferation (per SPEC-42 §Risks "Author abuse") — owned by SPEC42STOSTADEB-012

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 5 new CLK validators PASS on positive fixtures and FAIL/WARN with correct diagnostics on negative fixtures; all 4 new CLK predicates parse and schema-validate correctly against representative CLK records
2. `npm test --prefix tools/validators` (regression) — existing 24 structural validators and 24 predicate grammar entries still pass; no regression in the registry's existing entries

### Invariants

1. The closed predicate DSL grows by 4 entries (24 → 28 after this ticket; later STSEC/STQ predicate tickets will extend it further) — purely additive
2. The structural validator registry grows by 5 entries (24 → 29) — purely additive
3. All 5 CLK validators run at engine pre-apply on every story-bundle commit involving CLK records
4. Existing validator behavior is preserved except for the additive CLK predicate cases in `storylet_predicate_dsl_parsability`

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/clock-value-in-range.test.ts` (new) — positive + negative test cases for value bounds
2. `tools/validators/tests/structural/clock-threshold-ordering.test.ts` (new) — positive + negative test cases for ordering and bounds
3. `tools/validators/tests/structural/clock-tick-provenance.test.ts` (new) — positive + negative test cases for SE reference + cause + delta validity
4. `tools/validators/tests/structural/clock-firing-threshold-integrity.test.ts` (new) — positive + negative test cases for fired status + threshold-crossing
5. `tools/validators/tests/structural/clock-terminal-debt-integrity.test.ts` (new) — positive + negative test cases for terminal-rationale + high-salience active CLKs
6. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — co-edit with SPEC42STOSTADEB-006 / -007) — extend grammar-parser tests with the 4 new CLK predicates
7. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-006 / -007 / -008) — extend registry-registration tests with the 5 new CLK validators
8. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify) — schema/runtime mirror covers the 4 new CLK predicates
9. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — pre-apply overlay proof for same-envelope CLK create/tick validation

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new CLK coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed on 2026-05-17.

This ticket landed five registered CLK structural validators:

- `clock_value_in_range`
- `clock_threshold_ordering`
- `clock_tick_provenance`
- `clock_firing_threshold_integrity`
- `clock_terminal_debt_integrity`

It also added the four CLK predicate names to the closed predicate grammar (`clock_at_least`, `clock_below`, `clock_full`, `any_clock_active`), mirrored them in both predicate JSON Schema surfaces, and extended `storylet_predicate_dsl_parsability` to validate CLK references, integer values, alias binding, clock-kind filters, and salience filters. The validators package pre-apply overlay now materializes CLK create/supersede records and tick/resolve mutations so CLK validators can see same-envelope story-bundle writes. Package README inventory and registry/count tests were updated to the new 29-structural-validator state.

## Verification Result

- `npm test --prefix tools/validators` — PASS (391 tests, 0 failures). This includes the new focused CLK validator tests, predicate grammar/schema parity checks, registry count checks, and a `validatePatchPlan` pre-apply proof that a same-envelope `create_clk_record` with `value > max` fails through `clock_value_in_range`.

## Deviations

- Drafted predicate wording said the four CLK predicates would "evaluate" clock state. The live validators package owns grammar/schema/parsability, not runtime storylet selection, so this ticket proves predicate shape and reference validation. Runtime use remains owned by SPEC42STOSTADEB-009 and archive/tickets/SPEC42STOSTADEB-011.md.
- The drafted baseline counts were stale: the live package started this ticket at 24 structural validators and 24 predicate grammar entries, not 22/22. The completed state is 29 structural validators and 28 predicate grammar entries.
- `clock_terminal_debt_integrity` emits a warning for terminal high-salience active clock debt, matching the existing health-audit terminal-debt convention that terminal proof gaps are branch-flag warnings rather than hard structural failures.
