# SPEC42STOSTADEB-007: STQ validators + predicates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds 4 new STQ-specific structural validators under `tools/validators/src/structural/`, 4 new STQ-specific predicates to the closed predicate DSL, registers all 4 validators in the validator registry, and extends the validators pre-apply overlay for STQ create/supersede/answer/abandon operations; reinforces the §5c discipline at the validator layer (the schema-level `additionalProperties: false` from archive/tickets/SPEC42STOSTADEB-003.md catches authoring-time mistakes; the validators catch state-evolution mistakes like a payoff that predates its setup); existing unrelated validators are unchanged
**Deps**: archive/tickets/SPEC42STOSTADEB-003.md

## Problem

At intake, archive/tickets/SPEC42STOSTADEB-003.md had landed the STQ class foundation including the `record_schema_compliance` HARD-REJECT extension for §5c prohibited fields, but STQ records had no domain-specific validator coverage yet — payoff_of links could predate their setups, status transitions could land without grounding events, and high-salience open STQs at terminal pages could silently violate Rule 5. Storylets also could not precondition on STQ state because the predicate DSL had no `story_question_*` predicates yet. This ticket lands the STQ-specific validator + predicate layer as one cohesive PR, completing the per-class validator + predicate trio (-005 CLK, -006 STSEC, -007 STQ).

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): `tools/validators/src/structural/` exists; predicate-DSL grammar file and registry file are shared with -005 / -006 (mechanical merge coordination needed; no semantic conflict — each ticket adds non-overlapping entries). Existing structural validators are pattern baselines for new STQ validators.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables Validators section (STQ validators 4 listed) + §Deliverables Predicate DSL extensions (STQ predicates 4 listed) + §Verification Validator-level section; §C STQ schema (13 fields with `payoff_of: STQ-<integer> | null` link); SPEC-42 §Risks "STQ §5c slippage temptation" notes that "the §5c discipline statement and `record_schema_compliance` HARD-REJECT on prohibited fields prevent the schema from drifting; the risk is in skill prose and authoring patterns" — this ticket's validators are the runtime-state-evolution defense complementary to the schema-level structural defense.
3. Cross-skill / cross-tool shared boundary: same as -005 / -006 — `predicate-dsl-grammar.ts` and `registry.ts` shared. The `story_question_setup_predates_payoff` validator walks the branch path ancestor-ward to verify payoff_of links resolve to earlier STQs (parallel to STSEC's `critical_secret_clue_coverage_when_revealed` branch-walk pattern from -006).
4. FOUNDATIONS §Rule 5 (No Consequence Evasion) + §Story Bundles §5c (Present Causal State, Not Narrative Shape) motivate this ticket. Rule 5: `story_question_terminal_debt` warns when high-salience open STQs at terminal pages lack terminal rationale, matching the existing `clock_terminal_debt_integrity` convention. §5c: the fail-level validators enforce STQ as PRESENT open-setup state (status transitions are grounded in events; payoff links resolve to earlier STQs; source records are active at creation) — not as future dramatic obligation. The validators complement the schema-level §5c discipline by enforcing it at state-evolution time.
5. HARD-GATE validator surface: each of the 4 new validators registers in `tools/validators/src/public/registry.ts` and runs at engine pre-apply on every story-bundle commit involving STQ records. The fail-level STQ validators block invalid payoff, setup-order, and grounding states; `story_question_terminal_debt` emits the established warning-level terminal-debt signal. Mystery Reserve firewall: not directly touched by STQ validators (STQ does not interact with `M-*` records). Hook 3 path-pattern coverage: unchanged.
6. Reassessment update (2026-05-18): live `tools/validators/src/_helpers/index-access.ts` materialized CLK create/supersede operations for pre-apply overlay but not STQ create/supersede/answer/abandon operations. Because this ticket's registered validators must run against same-envelope STQ records during pre-apply, the overlay extension is same-seam required fallout and is included in this ticket.
7. Reassessment update (2026-05-18): `clock_terminal_debt_integrity` emits a warning, not a fail, for terminal debt rationale omissions. `story_question_terminal_debt` follows that established terminal-debt convention and emits `warn` for high-salience open STQs omitted from terminal rationale; the fail-closed schema/state-evolution checks remain in the other STQ validators and in `record_schema_compliance`.
8. Reassessment update (2026-05-18): package inventory and exact-count tests are same-package public surfaces for registered validator additions. `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`, and the storylet schema enum are included so the new predicates and validators are visible through source, schema, registry, and pre-apply proof surfaces.

## Architecture Check

1. **Per-class validator cohesion**: STQ's 4 validators all enforce STQ-specific invariants. Bundling them keeps STQ-specific structural-defense logic reviewable as a unit.
2. **Validators complement schema-level §5c discipline**: archive/tickets/SPEC42STOSTADEB-003.md's schema-level `additionalProperties: false` + `record_schema_compliance` HARD-REJECT catch *authoring-time* mistakes (someone trying to add a prohibited field). This ticket's validators catch *state-evolution* mistakes (someone trying to link a payoff to a setup that doesn't precede it in the branch path, or trying to terminal-commit with high-salience open STQs). Two-layer defense parallels archive/tickets/SPEC42STOSTADEB-003.md §3.
3. **`story_question_terminal_debt` mirrors `clock_terminal_debt_integrity` from -005**: both enforce Rule 5 at terminal-page commits; same branch-walk pattern, same high-salience-required threshold; reviewer can cross-reference for consistency.
4. **Predicates ship alongside their validators**: the 4 STQ predicates are consumed at storylet-eligibility time; `promise_due(STQ-<int>, age_pages)` in particular is consumed by `branching-story-health-audit`'s dropped-setup detection (landed in `archive/tickets/SPEC42STOSTADEB-012.md`).

## Verification Layers

1. `story_question_payoff_integrity` FAILS for STQ with `status: answered | paid_off` and `answer_event: null`; FAILS for `payoff_of` link to STQ whose `created_at_page` is later than this STQ's; PASSES otherwise → validator test
2. `story_question_setup_predates_payoff` FAILS for STQ with `payoff_of` reference resolving to an STQ NOT in the ancestor branch path of this STQ's `created_at_page`; PASSES otherwise → validator test
3. `story_question_grounding_integrity` FAILS for STQ with `source_records[]` entries not active in the branch path at `created_at_page`; PASSES otherwise → validator test
4. `story_question_terminal_debt` WARNS at terminal branch leaf snapshot with high-salience open STQ and no terminal_rationale; PASSES with explicit answer / payoff / abandonment / inheritance / terminal-rationale → validator test
5. `story_question_open(STQ-<int>)` predicate returns true iff `STQ.status ∈ {open, complicated}` → predicate-DSL parser test
6. `story_question_status(STQ-<int>, status)` returns true iff `STQ.status == status` → predicate-DSL parser test
7. `any_story_question_open(alias, salience?, setup_kind?)` actor-unbound existential → predicate-DSL parser test
8. `promise_due(STQ-<int>, age_pages)` returns true iff the STQ's `created_at_page` is at least `age_pages` pages prior to the current page in the branch path → predicate-DSL parser test

## Landed Changes

### 1. `story_question_payoff_integrity` validator (new file)

Created `tools/validators/src/structural/story-question-payoff-integrity.ts`. It validates: (a) `STQ.status: answered | paid_off` requires non-null `answer_event`; (b) non-null `answer_event` resolves to a same-story SE; (c) `STQ.payoff_of` references an STQ whose `created_at_page` precedes this STQ's `created_at_page` in the branch path. Violations emit fail verdicts.

### 2. `story_question_setup_predates_payoff` validator (new file)

Created `tools/validators/src/structural/story-question-setup-predates-payoff.ts`. It validates that every `STQ.payoff_of` reference resolves to an STQ in the ancestor branch path of this STQ's `created_at_page`, using the page `branch_path` surface. Out-of-branch payoff links emit fail verdicts.

### 3. `story_question_grounding_integrity` validator (new file)

Created `tools/validators/src/structural/story-question-grounding-integrity.ts`. It validates that every `STQ.source_records[]` entry has an allowed source class, resolves in the same story, and is active in `PG.state_snapshot.active_records[]` at `STQ.created_at_page`. Missing, invalid, or inactive source records emit fail verdicts.

### 4. `story_question_terminal_debt` validator (new file)

Created `tools/validators/src/structural/story-question-terminal-debt.ts`. It validates terminal branch snapshots for high-salience open STQs and warns when terminal rationale omits the STQ id or setup text, matching the established `clock_terminal_debt_integrity` warning convention.

### 5. Predicate DSL grammar extension (modify — shared file)

Modified `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, `tools/validators/src/schemas/predicate-dsl-grammar.schema.json`, and `tools/validators/src/schemas/story-storylet.schema.json` to add 4 new STQ predicates:
- `story_question_open(STQ-<int>)` — true iff `STQ.status ∈ {open, complicated}`
- `story_question_status(STQ-<int>, status)` — true iff `STQ.status == status` (status is one of the 7 enum values)
- `any_story_question_open(alias, salience?, setup_kind?)` — actor-unbound existential; binds the matching STQ to `alias`
- `promise_due(STQ-<int>, age_pages)` — true iff the STQ's `created_at_page` is at least `age_pages` pages prior to the current page in the branch path (age-comparator pattern for time-sensitive setup detection)

**Shared-file coordination**: SPEC42STOSTADEB-005 / -006 also extend this file.

### 6. Validator registry extension (modify — shared file)

Modified `tools/validators/src/public/registry.ts` to register the 4 new STQ validators in the structural-validators registry block.

**Shared-file coordination**: SPEC42STOSTADEB-005 / -006 / -008 also extend this file.

### 7. Pre-apply overlay and inventory/test fallout (modify)

Modified `tools/validators/src/_helpers/index-access.ts` so pre-apply validation materializes same-envelope `create_stq_record` / `supersede_stq_record` records and overlays `answer_story_question` / `abandon_story_question` mutations before validators run. Updated package README inventory and registry/pre-apply/schema parity tests to reflect the four new registered validators and four new predicate forms.

## Files to Touch

- `tools/validators/src/structural/story-question-payoff-integrity.ts` (new)
- `tools/validators/src/structural/story-question-setup-predates-payoff.ts` (new)
- `tools/validators/src/structural/story-question-grounding-integrity.ts` (new)
- `tools/validators/src/structural/story-question-terminal-debt.ts` (new)
- `tools/validators/src/structural/story-question-utils.ts` (new)
- `tools/validators/src/_helpers/index-access.ts` (modify — materializes STQ pre-apply records and answer/abandon mutations for validator reads)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — adds 4 STQ predicates; shared file with SPEC42STOSTADEB-005 / -006)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — validates STQ predicate arguments and references)
- `tools/validators/src/schemas/predicate-dsl-grammar.schema.json` (modify — mirrors new predicate argument schemas)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — exposes new predicate names in the storylet schema enum)
- `tools/validators/src/public/registry.ts` (modify — registers 4 new STQ validators; shared file with SPEC42STOSTADEB-005 / -006 / -008)
- `tools/validators/README.md` (modify — package validator inventory)
- `tools/validators/tests/structural/story-question-payoff-integrity.test.ts` (new)
- `tools/validators/tests/structural/story-question-setup-predates-payoff.test.ts` (new)
- `tools/validators/tests/structural/story-question-grounding-integrity.test.ts` (new)
- `tools/validators/tests/structural/story-question-terminal-debt.test.ts` (new)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)

## Out of Scope

- STQ class foundation (schema, machine-layer wiring, §5c HARD-REJECT extension to `record_schema_compliance`) — owned by archive/tickets/SPEC42STOSTADEB-003.md
- CLK and STSEC validators + predicates — owned by SPEC42STOSTADEB-005 / -006
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Storylet authoring extensions consuming new STQ predicates — owned by archive/tickets/SPEC42STOSTADEB-011.md
- Turn-cycle integration consuming new STQ predicates at runtime — owned by SPEC42STOSTADEB-009
- Health-audit "dropped high-salience setup" check (uses `story_question_terminal_debt` validator output) — landed in `archive/tickets/SPEC42STOSTADEB-012.md`

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — all 4 new STQ validators PASS on positive fixtures and FAIL with correct error messages on negative fixtures; all 4 new STQ predicates parse and evaluate correctly
2. `npm test --prefix tools/validators` (regression) — existing structural validators (including `record_schema_compliance` with STQ §5c HARD-REJECT from -003) still pass; new STQ validators compose correctly with the schema-level §5c discipline

### Invariants

1. The closed predicate DSL grows by 4 entries over the live pre-ticket grammar.
2. The structural validator registry grows by 4 entries
3. All 4 STQ validators run at engine pre-apply on every story-bundle commit involving STQ records
4. §5c discipline is enforced at TWO layers: schema-level (from -003) for authoring-time prohibited fields; validator-level (this ticket) for state-evolution discipline (payoff predates setup; high-salience open STQ at terminal accounted for)
5. Existing unrelated validator logic is not altered; the existing storylet predicate validator is extended additively to accept and validate the four new STQ predicates

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-question-payoff-integrity.test.ts` (new) — positive + negative cases for answer_event presence and payoff_of timing
2. `tools/validators/tests/structural/story-question-setup-predates-payoff.test.ts` (new) — positive + negative cases for branch-path ancestor-walk
3. `tools/validators/tests/structural/story-question-grounding-integrity.test.ts` (new) — positive + negative cases for source_records active-at-creation validation
4. `tools/validators/tests/structural/story-question-terminal-debt.test.ts` (new) — positive + negative cases for terminal-rationale + high-salience open STQs
5. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -006) — extend grammar-parser tests with the 4 new STQ predicates
6. `tools/validators/tests/structural/registry.test.ts` (modify — co-edit with SPEC42STOSTADEB-005 / -006 / -008) — extend registry-registration tests with the 4 new STQ validators
7. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — proves STQ validators run over same-envelope pre-apply records
8. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify) — keeps static schema and runtime predicate table in sync

### Commands

1. `npm test --prefix tools/validators` — full validator test pass with new STQ coverage
2. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed: 2026-05-18

Implemented the STQ validator + predicate layer in `tools/validators`: four registered STQ structural validators, STQ predicate DSL entries in runtime and JSON Schema surfaces, focused validator/predicate/registry tests, package README inventory updates, and same-envelope pre-apply overlay support for STQ create/supersede/answer/abandon operations.

## Verification Result

- `npm test --prefix tools/validators` — PASS on 2026-05-18. The command rebuilt the validators package and ran `411` node:test tests with `0` failures.

## Deviations

- `story_question_terminal_debt` follows the existing `clock_terminal_debt_integrity` terminal-debt convention and emits a `warn` verdict for terminal rationale omissions rather than a `fail` verdict.
- Same-seam pre-apply overlay support in `tools/validators/src/_helpers/index-access.ts` was added because registered STQ validators need to inspect same-envelope STQ records and answer/abandon mutations during `validatePatchPlan`.
