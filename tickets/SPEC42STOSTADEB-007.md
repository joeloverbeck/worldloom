# SPEC42STOSTADEB-007: STQ validators + predicates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 4 new STQ-specific structural validators under `tools/validators/src/structural/`, 4 new STQ-specific predicates to the closed predicate DSL, and registers all 4 validators in the validator registry; reinforces the §5c discipline at the validator layer (the schema-level `additionalProperties: false` from SPEC42STOSTADEB-003 catches authoring-time mistakes; the validators catch state-evolution mistakes like a payoff that predates its setup); no existing validators or predicates altered
**Deps**: SPEC42STOSTADEB-003

## Problem

SPEC42STOSTADEB-003 landed the STQ class foundation including the `record_schema_compliance` HARD-REJECT extension for §5c prohibited fields, but STQ records have no domain-specific validator coverage yet — payoff_of links can predate their setups, status transitions can land without grounding events, and high-salience open STQs at terminal pages can silently violate Rule 5. Storylets also cannot precondition on STQ state because the predicate DSL has no `story_question_*` predicates yet. This ticket lands the STQ-specific validator + predicate layer as one cohesive PR, completing the per-class validator + predicate trio (-005 CLK, -006 STSEC, -007 STQ).

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `tools/validators/src/structural/` exists; predicate-DSL grammar file and registry file are shared with -005 / -006 (mechanical merge coordination needed; no semantic conflict — each ticket adds non-overlapping entries). Existing structural validators are pattern baselines for new STQ validators.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (STQ validators 4 listed) + §Deliverables Predicate DSL extensions (STQ predicates 4 listed) + §Verification Validator-level section; §C STQ schema (13 fields with `payoff_of: STQ-<integer> | null` link); SPEC-42 §Risks "STQ §5c slippage temptation" notes that "the §5c discipline statement and `record_schema_compliance` HARD-REJECT on prohibited fields prevent the schema from drifting; the risk is in skill prose and authoring patterns" — this ticket's validators are the runtime-state-evolution defense complementary to the schema-level structural defense.
3. Cross-skill / cross-tool shared boundary: same as -005 / -006 — `predicate-dsl-grammar.ts` and `registry.ts` shared. The `story_question_setup_predates_payoff` validator walks the branch path ancestor-ward to verify payoff_of links resolve to earlier STQs (parallel to STSEC's `critical_secret_clue_coverage_when_revealed` branch-walk pattern from -006).
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) + §Story Bundles §5c (Present Causal State, Not Narrative Shape) motivate this ticket. Rule 5: `story_question_terminal_debt` validator enforces that high-salience open STQs at terminal pages must be answered, paid off, abandoned with rationale, inherited, or explicitly left open with terminal-proof rationale — silent abandonment fails the validator. §5c: the validators enforce STQ as PRESENT open-setup state (status transitions are grounded in events; payoff links resolve to earlier STQs; terminal debts are explicitly accounted for) — not as future dramatic obligation. The validators complement the schema-level §5c discipline by enforcing it at state-evolution time.
5. HARD-GATE validator surface: each of the 4 new validators registers in `tools/validators/src/public/registry.ts` and runs at engine pre-apply on every story-bundle commit involving STQ records. The `story_question_terminal_debt` validator gates terminal-page commits — strengthening the Canon Safety surface for §5c discipline. Mystery Reserve firewall: not directly touched by STQ validators (STQ does not interact with `M-*` records). Hook 3 path-pattern coverage: unchanged.

## Architecture Check

1. **Per-class validator cohesion**: STQ's 4 validators all enforce STQ-specific invariants. Bundling them keeps STQ-specific structural-defense logic reviewable as a unit.
2. **Validators complement schema-level §5c discipline**: SPEC42STOSTADEB-003's schema-level `additionalProperties: false` + `record_schema_compliance` HARD-REJECT catch *authoring-time* mistakes (someone trying to add a prohibited field). This ticket's validators catch *state-evolution* mistakes (someone trying to link a payoff to a setup that doesn't precede it in the branch path, or trying to terminal-commit with high-salience open STQs). Two-layer defense parallels SPEC42STOSTADEB-003 §3.
3. **`story_question_terminal_debt` mirrors `clock_terminal_debt_integrity` from -005**: both enforce Rule 5 at terminal-page commits; same branch-walk pattern, same high-salience-required threshold; reviewer can cross-reference for consistency.
4. **Predicates ship alongside their validators**: the 4 STQ predicates are consumed at storylet-eligibility time; `promise_due(STQ-<int>, age_pages)` in particular is consumed by `branching-story-health-audit`'s dropped-setup detection (owned by SPEC42STOSTADEB-012).

## Verification Layers

1. `story_question_payoff_integrity` FAILS for STQ with `status: answered | paid_off` and `answer_event: null`; FAILS for `payoff_of` link to STQ whose `created_at_page` is later than this STQ's; PASSES otherwise → validator test
2. `story_question_setup_predates_payoff` FAILS for STQ with `payoff_of` reference resolving to an STQ NOT in the ancestor branch path of this STQ's `created_at_page`; PASSES otherwise → validator test
3. `story_question_grounding_integrity` FAILS for STQ with `source_records[]` entries not active in the branch path at `created_at_page`; PASSES otherwise → validator test
4. `story_question_terminal_debt` FAILS at terminal branch leaf snapshot with high-salience open STQ and no terminal_rationale; PASSES with explicit answer / payoff / abandonment / inheritance / terminal-rationale → validator test
5. `story_question_open(STQ-<int>)` predicate returns true iff `STQ.status ∈ {open, complicated}` → predicate-DSL parser test
6. `story_question_status(STQ-<int>, status)` returns true iff `STQ.status == status` → predicate-DSL parser test
7. `any_story_question_open(alias, salience?, setup_kind?)` actor-unbound existential → predicate-DSL parser test
8. `promise_due(STQ-<int>, age_pages)` returns true iff the STQ's `created_at_page` is at least `age_pages` pages prior to the current page in the branch path → predicate-DSL parser test

## What to Change

### 1. `story_question_payoff_integrity` validator (new file)

Create `tools/validators/src/structural/story-question-payoff-integrity.ts`. Validates: (a) `STQ.status: answered | paid_off` requires non-null `answer_event`; (b) `STQ.payoff_of` must reference an STQ whose `created_at_page` precedes this STQ's `created_at_page` in the branch path. HARD-REJECT on violation.

### 2. `story_question_setup_predates_payoff` validator (new file)

Create `tools/validators/src/structural/story-question-setup-predates-payoff.ts`. Validates: every `STQ.payoff_of` reference resolves to an STQ that is in the ancestor branch path of this STQ's `created_at_page` (not merely earlier by timestamp — actually reachable ancestor-ward via PG.parent_page links). Branch-walk pattern parallels SPEC42STOSTADEB-006's `critical_secret_clue_coverage_when_revealed`. HARD-REJECT on out-of-branch payoff_of references.

### 3. `story_question_grounding_integrity` validator (new file)

Create `tools/validators/src/structural/story-question-grounding-integrity.ts`. Validates: every `STQ.source_records[]` entry references a record that is active in the branch path at `STQ.created_at_page` (per the `PG.state_snapshot.active_records[]` snapshot at that page). HARD-REJECT on dangling references.

### 4. `story_question_terminal_debt` validator (new file)

Create `tools/validators/src/structural/story-question-terminal-debt.ts`. Validates: at terminal branch leaf snapshots, high-salience (`STQ.salience: high`) open (`STQ.status ∈ {open, complicated}`) STQs must be answered, paid off, abandoned (with `abandonment_rationale`), inherited (status: inherited), or explicitly left open with `terminal_rationale`. HARD-REJECT (or WARNING per existing terminal-debt validator conventions, matching the pattern in `clock_terminal_debt_integrity` from -005) on violation.

### 5. Predicate DSL grammar extension (modify — shared file)

Modify `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` to add 4 new STQ predicates:
- `story_question_open(STQ-<int>)` — true iff `STQ.status ∈ {open, complicated}`
- `story_question_status(STQ-<int>, status)` — true iff `STQ.status == status` (status is one of the 7 enum values)
- `any_story_question_open(alias, salience?, setup_kind?)` — actor-unbound existential; binds the matching STQ to `alias`
- `promise_due(STQ-<int>, age_pages)` — true iff the STQ's `created_at_page` is at least `age_pages` pages prior to the current page in the branch path (age-comparator pattern for time-sensitive setup detection)

**Shared-file coordination**: SPEC42STOSTADEB-005 / -006 also extend this file.

### 6. Validator registry extension (modify — shared file)

Modify `tools/validators/src/public/registry.ts` to register the 4 new STQ validators in the structural-validators registry block.

**Shared-file coordination**: SPEC42STOSTADEB-005 / -006 / -008 also extend this file.

## Files to Touch

- `tools/validators/src/structural/story-question-payoff-integrity.ts` (new)
- `tools/validators/src/structural/story-question-setup-predates-payoff.ts` (new)
- `tools/validators/src/structural/story-question-grounding-integrity.ts` (new)
- `tools/validators/src/structural/story-question-terminal-debt.ts` (new)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 STQ predicates; shared file with SPEC42STOSTADEB-005 / -006)
- `tools/validators/src/public/registry.ts` (modify — registers 4 new STQ validators; shared file with SPEC42STOSTADEB-005 / -006 / -008)

## Out of Scope

- STQ class foundation (schema, machine-layer wiring, §5c HARD-REJECT extension to `record_schema_compliance`) — owned by SPEC42STOSTADEB-003
- CLK and STSEC validators + predicates — owned by SPEC42STOSTADEB-005 / -006
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Storylet authoring extensions consuming new STQ predicates — owned by SPEC42STOSTADEB-011
- Turn-cycle integration consuming new STQ predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit "dropped high-salience setup" check (uses `story_question_terminal_debt` validator output) — owned by SPEC42STOSTADEB-012

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 4 new STQ validators PASS on positive fixtures and FAIL with correct error messages on negative fixtures; all 4 new STQ predicates parse and evaluate correctly
2. `npm test --prefix tools/validators` (regression) — existing structural validators (including `record_schema_compliance` with STQ §5c HARD-REJECT from -003) still pass; new STQ validators compose correctly with the schema-level §5c discipline

### Invariants

1. The closed predicate DSL grows by 4 entries (30 → 34 cumulative with -005 / -006)
2. The structural validator registry grows by 4 entries
3. All 4 STQ validators run at engine pre-apply on every story-bundle commit involving STQ records
4. §5c discipline is enforced at TWO layers: schema-level (from -003) for authoring-time prohibited fields; validator-level (this ticket) for state-evolution discipline (payoff predates setup; high-salience open STQ at terminal accounted for)
5. No existing validator's logic is altered

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-question-payoff-integrity.test.ts` (new) — positive + negative cases for answer_event presence and payoff_of timing
2. `tools/validators/tests/structural/story-question-setup-predates-payoff.test.ts` (new) — positive + negative cases for branch-path ancestor-walk
3. `tools/validators/tests/structural/story-question-grounding-integrity.test.ts` (new) — positive + negative cases for source_records active-at-creation validation
4. `tools/validators/tests/structural/story-question-terminal-debt.test.ts` (new) — positive + negative cases for terminal-rationale + high-salience open STQs
5. `tools/validators/tests/rules/_shared/predicate-dsl-grammar.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -006) — extend grammar-parser tests with the 4 new STQ predicates
6. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -006 / -008) — extend registry-registration tests with the 4 new STQ validators

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new STQ coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone
