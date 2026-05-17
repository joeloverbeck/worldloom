# SPEC42STOSTADEB-005: CLK validators + predicates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 5 new CLK-specific structural validators under `tools/validators/src/structural/`, 4 new CLK-specific predicates to the closed predicate DSL at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, and registers all 5 validators in the validator registry at `tools/validators/src/public/registry.ts`; no existing validators or predicates altered
**Deps**: SPEC42STOSTADEB-001

## Problem

SPEC42STOSTADEB-001 landed the CLK class foundation (schema, machine-layer wiring, custom ops), but CLK records have no validator coverage yet — their structural correctness depends on per-class validators that enforce value-in-range, threshold ordering, tick provenance, firing-threshold integrity, and terminal-debt accountability. Without these, malformed CLK records can persist, and high-salience active clocks at terminal pages can silently violate Rule 5 (No Consequence Evasion). Storylets also cannot precondition on clock state because the predicate DSL has no `clock_*` predicates yet — SPEC42STOSTADEB-011's `commitment-block-authoring` 14-target coverage extension depends on these predicates being available. This ticket lands the CLK-specific validator + predicate layer as one cohesive PR.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `tools/validators/src/structural/` exists with the documented validator-file layout; `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` exists at line 4-29 with 22 closed predicates (verified by SPEC-42 brainstorm agent reports); `tools/validators/src/public/registry.ts` is the canonical validator-registration site (verified at agent reports). Existing structural validators (e.g., `state-snapshot-integrity.ts`, `snapshot-replay-equality.ts`) confirmed as pattern baselines for new CLK validators.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (CLK validators 5 listed) + §Deliverables Predicate DSL extensions (CLK predicates 4 listed) + §Verification Validator-level section (per-validator acceptance bullets); SPEC-42 §Risks "Author abuse — clock proliferation" notes that `branching-story-health-audit` should warn (not block) when CLK count exceeds a threshold — that warning logic is owned by SPEC42STOSTADEB-012, not this ticket.
3. Cross-skill / cross-tool shared boundary: the **closed predicate DSL** at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is consumed by `branching-story-turn-cycle`'s runtime SLT eligibility checks AND `commitment-block-authoring`'s precondition authoring. Adding the 4 CLK predicates here makes them available to BOTH consumers; the consumers' integration is owned by SPEC42STOSTADEB-009 (turn-cycle) and -011 (commitment-block-authoring). Shared file: `predicate-dsl-grammar.ts` is also modified by SPEC42STOSTADEB-006 (STSEC predicates) and -007 (STQ predicates) — three tickets all edit the same grammar file with non-overlapping additions; mechanical merge coordination needed but no semantic conflict. Shared file: `registry.ts` is modified by SPEC42STOSTADEB-006 / -007 / -008 in the same way.
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) motivates this ticket. CLK explicitly tracks delayed-consequence maturation (`value` ticks toward `max`, threshold effects fire at named values). Rule 5 requires that "If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest" — the `clock_terminal_debt_integrity` validator enforces this at the story-bundle scope: high-salience active clocks at terminal pages must be resolved, fired, inherited, or explicitly abandoned with rationale; silent abandonment fails the validator.
5. HARD-GATE validator surface: each of the 5 new validators registers as a structural validator in `tools/validators/src/public/registry.ts` and runs at engine pre-apply on every story-bundle commit involving CLK records. The validators gate CLK record writes at the engine boundary; malformed records cannot persist. Mystery Reserve firewall: not directly touched by CLK validators (CLK does not interact with `M-*` records). Hook 3 path-pattern coverage: unchanged.

## Architecture Check

1. **Per-class validator cohesion**: CLK's 5 validators all enforce CLK-specific invariants (value bounds, threshold ordering, tick provenance, firing integrity, terminal debt). Bundling them in one ticket keeps CLK-specific structural-defense logic reviewable as a unit.
2. **Predicates ship alongside their validators**: the 4 CLK predicates are consumed at storylet-eligibility time; their semantics are tightly coupled to the validators (e.g., `clock_at_least(CLK-<int>, value)` returns true iff the CLK record's `value` field passes the validator's range check). Co-locating them in one ticket keeps the predicate-DSL extension and validator extension semantically aligned.
3. **No new shared infrastructure**: this ticket reuses the existing validator-registry pattern and the existing predicate-DSL grammar pattern. No new categories or schemas introduced — just additive entries.
4. **Mirrors existing per-class validator pattern**: existing structural validators like `slt-created-at-page-origin-consistency.ts` enforce SLT-specific invariants; the 5 new CLK validators follow the same per-class pattern.

## Verification Layers

1. `clock_value_in_range` FAILS for CLK with `value > max` or `value < 0`; PASSES otherwise → validator test via `npm test --prefix tools/validators`
2. `clock_threshold_ordering` FAILS for CLK with non-ascending `thresholds[].at` or `at > max`; PASSES otherwise → validator test
3. `clock_tick_provenance` FAILS for CLK with `tick_history[]` entry lacking valid `SE` reference or empty `cause` string; PASSES otherwise → validator test
4. `clock_firing_threshold_integrity` FAILS for CLK with `status: fired` but `value < max` (per spec §Verification: status: fired requires the value to have crossed the highest threshold via the tick history); PASSES otherwise → validator test
5. `clock_terminal_debt_integrity` FAILS for terminal branch leaf snapshot with a high-salience `CLK.status: active` and no terminal rationale; PASSES with explicit abandonment in `terminal_rationale` → validator test
6. `clock_at_least(CLK-<int>, value)` predicate returns true iff `CLK.value >= value` → predicate-DSL parser test
7. `clock_below(CLK-<int>, value)` returns true iff `CLK.value < value` → predicate-DSL parser test
8. `clock_full(CLK-<int>)` returns true iff `CLK.value == CLK.max` → predicate-DSL parser test
9. `any_clock_active(alias, kind?, salience?)` is an actor-unbound existential predicate returning true iff any active CLK matches the optional filters → predicate-DSL parser test

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
- `clock_at_least(CLK-<int>, value)` — true iff `CLK.value >= value`
- `clock_below(CLK-<int>, value)` — true iff `CLK.value < value`
- `clock_full(CLK-<int>)` — true iff `CLK.value == CLK.max`
- `any_clock_active(alias, kind?, salience?)` — actor-unbound existential; true iff any active CLK matches optional `kind` and/or `salience` filters; binds the matching CLK to `alias` for later predicate composition

Each predicate's parser entry mirrors the existing predicate format (e.g., `obligation_open`, `any_obligation_open` at line 4-29). The grammar extension is purely additive; existing 22 predicates are unchanged. **Shared-file coordination**: SPEC42STOSTADEB-006 (STSEC predicates) and SPEC42STOSTADEB-007 (STQ predicates) also extend this file with their own non-overlapping predicates — mechanical merge coordination needed.

### 7. Validator registry extension (modify — shared file)

Modify `tools/validators/src/public/registry.ts` to register the 5 new CLK validators in the structural-validators registry block (per `registry.ts:39-64` as documented in brainstorm agent reports). The registration entries follow the existing pattern (validator name → validator function reference). **Shared-file coordination**: SPEC42STOSTADEB-006 / -007 / -008 also extend this file with their own non-overlapping registrations.

## Files to Touch

- `tools/validators/src/structural/clock-value-in-range.ts` (new)
- `tools/validators/src/structural/clock-threshold-ordering.ts` (new)
- `tools/validators/src/structural/clock-tick-provenance.ts` (new)
- `tools/validators/src/structural/clock-firing-threshold-integrity.ts` (new)
- `tools/validators/src/structural/clock-terminal-debt-integrity.ts` (new)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 CLK predicates; shared file with SPEC42STOSTADEB-006 / -007)
- `tools/validators/src/public/registry.ts` (modify — registers 5 new CLK validators; shared file with SPEC42STOSTADEB-006 / -007 / -008)

## Out of Scope

- CLK class foundation (schema, machine-layer wiring, custom ops) — owned by SPEC42STOSTADEB-001
- STSEC and STQ validators + predicates — owned by SPEC42STOSTADEB-006 / -007
- Shared validator extensions (`state_snapshot_integrity` / `snapshot_replay_equality` / `branch_isolation` / `observer_firewall`) — owned by SPEC42STOSTADEB-008
- Storylet authoring extensions consuming new CLK predicates — owned by SPEC42STOSTADEB-011
- Turn-cycle integration consuming new CLK predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit warnings for CLK proliferation (per SPEC-42 §Risks "Author abuse") — owned by SPEC42STOSTADEB-012

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 5 new CLK validators PASS on positive fixtures and FAIL with correct error messages on negative fixtures; all 4 new CLK predicates parse and evaluate correctly against representative CLK records
2. `npm test --prefix tools/validators` (regression) — existing 22 structural validators and 22 predicates still pass; no regression in the registry's existing entries

### Invariants

1. The closed predicate DSL grows by 4 entries (22 → 26 after this ticket; will reach 30 after SPEC42STOSTADEB-006 and 34 after -007) — purely additive
2. The structural validator registry grows by 5 entries — purely additive
3. All 5 CLK validators run at engine pre-apply on every story-bundle commit involving CLK records
4. No existing validator's logic is altered

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/clock-value-in-range.test.ts` (new) — positive + negative test cases for value bounds
2. `tools/validators/tests/structural/clock-threshold-ordering.test.ts` (new) — positive + negative test cases for ordering and bounds
3. `tools/validators/tests/structural/clock-tick-provenance.test.ts` (new) — positive + negative test cases for SE reference + cause + delta validity
4. `tools/validators/tests/structural/clock-firing-threshold-integrity.test.ts` (new) — positive + negative test cases for fired status + threshold-crossing
5. `tools/validators/tests/structural/clock-terminal-debt-integrity.test.ts` (new) — positive + negative test cases for terminal-rationale + high-salience active CLKs
6. `tools/validators/tests/rules/_shared/predicate-dsl-grammar.test.ts` (modify — co-edit with SPEC42STOSTADEB-006 / -007) — extend grammar-parser tests with the 4 new CLK predicates
7. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-006 / -007 / -008) — extend registry-registration tests with the 5 new CLK validators

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new CLK coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
