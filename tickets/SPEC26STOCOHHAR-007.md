# SPEC26STOCOHHAR-007: Add record_age predicate to the closed predicate DSL

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §5, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` + test, `commitment-block-authoring` and `branching-story-turn-cycle` skill prose.
**Deps**: None

## Problem

`branching-story-health-audit` hard-codes debt-aging thresholds (`ignored_debt_beyond_urgency`), but an `SLT` precondition cannot express "this debt has been open ≥ N pages" — so storylet eligibility cannot respond to *how long* a pressure has been ignored without re-introducing act timers. SPEC-26 D6 adds one predicate, `record_age`, that lets causal pressure mature without act timing.

## Assumption Reassessment (2026-05-14)

1. Verified against the current codebase at SPEC-26 Step 2: `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` defines `PRED_TYPES` (line 4) and `PREDICATE_ARG_SCHEMAS` (line 85), closed by `as const satisfies Record<(typeof PRED_TYPES)[number], { required: readonly string[] }>` (line 109) — so adding a `PRED_TYPES` member structurally *requires* a matching `PREDICATE_ARG_SCHEMAS` entry. `rule_storylet_predicate_dsl_parsability.ts` parses and validates the closed DSL (and gained alias-binding + author-pool/branch-prefix scope checks in SPEC-25 D4). `commitment-block-authoring/SKILL.md:206` is the predicate-DSL discipline list. No `record_age` predicate exists today.
2. Verified against `specs/SPEC-26-story-coherence-hardening-ii.md` D6 and `story-state-contract.md` §5 (closed predicate DSL, line 598): `record_age(<record_id | bound:<alias>>, >= | <= | == | !=, <integer_pages>)` is derived from the record's `created_at_page` and the evaluating page's position in `branch_path` — the `>= | <= | == | !=` comparator set matches the existing `any_relationship_axis` comparator vocabulary (contract §5, line 614). The `bound:<alias>` first-argument form reuses the alias-binding infrastructure landed by SPEC-25 D4. `urgency_at_least` is explicitly NOT added (SPEC-26 §Out of Scope — redundant with the existential predicates' `urgency?` filter).
3. Cross-skill / cross-artifact boundary under audit: the closed predicate DSL grammar, owned jointly by `story-state-contract.md` §5 (the human-facing grammar) and `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` + `rule_storylet_predicate_dsl_parsability.ts` (the executable grammar + parser). Consumers: `commitment-block-authoring` (authors `preconditions.hard`/`preconditions.soft`) and `branching-story-turn-cycle` Phase 2 (evaluates `SLT` eligibility). All four surfaces must carry `record_age` consistently.
4. FOUNDATIONS principle under audit: §Story Bundles §5a / §5c (Commitment Blocks Are Causal Moves / Present Causal State, Not Narrative Shape) — `record_age` is a *present-causal-state* predicate: "how long has this record been open" is a fact about the current state, derivable from `created_at_page` + `branch_path`, not a future dramatic obligation. It lets pressure escalate *because it has been ignored*, not *because the story reached Act II* — the distinction §5c protects. It adds no `arc_contract` / `dramatic_unit` / act-timer surface.

## Architecture Check

1. Adding one derived predicate is cleaner than the rejected alternative (`urgency_at_least`): the existential predicates already accept an `urgency?` filter, so `urgency_at_least` would be a redundant second spelling — whereas `record_age` is genuinely inexpressible today. Deriving it from `created_at_page` + `branch_path` means no schema field is added; the `bound:<alias>` form reuses SPEC-25 D4's binding infrastructure rather than inventing a parallel mechanism.
2. No backwards-compatibility aliasing or shims — `record_age` is net-new; the closed `PRED_TYPES` set is extended, not aliased.

## Verification Layers

1. The grammar carries `record_age` -> codebase grep-proof + schema validation: `record_age` appears in `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS` in `predicate-dsl-grammar.ts`, and the `as const satisfies Record<...>` constraint still type-checks (a missing `PREDICATE_ARG_SCHEMAS` entry would fail the build).
2. The parser validates `record_age` -> schema validation: `rule_storylet_predicate_dsl_parsability` accepts an `SLT` with `record_age(bound:pending_fallout, >=, 3)` in `preconditions.hard` and rejects `record_age` with a malformed comparator or a non-integer page argument.
3. The contract and both skills carry the predicate -> codebase grep-proof: `record_age` appears in `story-state-contract.md` §5, `commitment-block-authoring/SKILL.md` (predicate-DSL discipline list), and `branching-story-turn-cycle/SKILL.md` Phase 2 (eligibility evaluation).
4. (Single-layer not applicable — this is a cross-skill + cross-artifact ticket; the three layers map the grammar invariant, the parser invariant, and the human-facing-consistency invariant to distinct proof surfaces.)

## What to Change

### 1. Contract §5 — add the predicate

In `.claude/skills/_shared-templates/story-state-contract.md` §5 (closed predicate DSL), add `record_age(<record_id | bound:<alias>>, >= | <= | == | !=, <integer_pages>)` with its consumer note (storylet preconditions; debt-pressure maturation). Document that it is derived from `created_at_page` and the evaluating page's position in `branch_path`.

### 2. Grammar — add to PRED_TYPES and PREDICATE_ARG_SCHEMAS

In `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, add `record_age` to `PRED_TYPES` and a matching entry to `PREDICATE_ARG_SCHEMAS` (the `as const satisfies Record<...>` constraint makes the matching entry mandatory), following the SPEC-25 D4 pattern for the existential predicates.

### 3. Parser — parse and validate record_age

In `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, parse and validate `record_age`: a record-id or `bound:<alias>` first argument (alias-binding resolution per SPEC-25 D4), a comparator from `>= | <= | == | !=`, and an integer-pages third argument. Reject malformed comparators and non-integer page arguments.

### 4. commitment-block-authoring — add to the discipline list

In `commitment-block-authoring/SKILL.md:206`, add `record_age` to the predicate-DSL discipline list; both `direct_batch` and `audit_repair` modes may use it in `preconditions.hard` / `preconditions.soft`.

### 5. turn-cycle — evaluate record_age

In `branching-story-turn-cycle/SKILL.md` Phase 2, `SLT` eligibility evaluates `record_age` against the current branch state (the record's `created_at_page` position within the evaluating page's `branch_path`).

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)

## Out of Scope

- The `urgency_at_least` predicate — explicitly rejected (SPEC-26 §Out of Scope; redundant with the existential predicates' `urgency?` filter).
- Any `story-storylet.schema.json` change — predicates are free-text strings validated by the parsability rule, not by JSON Schema enum.
- Re-evaluating or changing the existing closed-DSL predicates or the alias-binding mechanism (SPEC-25 D4).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` passes — the `as const satisfies Record<...>` constraint type-checks (proving `PREDICATE_ARG_SCHEMAS` has the `record_age` entry), and `rule_storylet_predicate_dsl_parsability` accepts a valid `record_age` precondition and rejects malformed forms.
2. `grep -n 'record_age' tools/validators/src/rules/_shared/predicate-dsl-grammar.ts tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` returns a match in every file.
3. `grep -rn 'urgency_at_least' tools/ .claude/skills/` returns no matches (the rejected predicate was not added).

### Invariants

1. `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS` stay in lockstep — every `PRED_TYPES` member has a `PREDICATE_ARG_SCHEMAS` entry (enforced by the `as const satisfies Record<...>` type constraint).
2. `record_age` is a derived predicate — it adds no story-bundle schema field; it reads `created_at_page` + `branch_path` only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — add cases proving `record_age(bound:pending_fallout, >=, 3)` parses and validates, and that a malformed comparator or non-integer page argument is rejected.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. `grep -rn 'record_age' tools/validators/src/ .claude/skills/_shared-templates/story-state-contract.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md`
3. The validator build/test in command 1 is the machine-layer verification boundary (it exercises both the grammar's type constraint and the parser); command 2 confirms the human-facing contract + skill prose carry the predicate consistently.
