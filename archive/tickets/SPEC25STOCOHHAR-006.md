# SPEC25STOCOHHAR-006: Predicate DSL v2 — grammar, schema, validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; amends `.claude/skills/_shared-templates/story-state-contract.md` (§4.4 / §5), validator tests, and `archive/specs/SPEC-25-story-coherence-hardening.md`.
**Deps**: archive/tickets/SPEC25STOCOHHAR-002.md, archive/tickets/SPEC25STOCOHHAR-005.md

## Problem

At intake, the closed predicate DSL's only actor-unbound predicate was `has_affordance`; every other predicate was exact-ID. Gate 4 / Rule 4 forbid global-author-pool storylets from referencing branch-local IDs, so global-pool blocks could prefilter only on affordances — not on the first-class social state (`OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT`) the architecture makes load-bearing. This ticket added six actor-unbound existential predicates plus alias binding so `SLT.effects` can target what a precondition matched.

## Assumption Reassessment (2026-05-14)

1. At intake, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` exposed `PRED_TYPES` with `entity_status` / `has_affordance` but no existential `any_*` predicates, and `PREDICATE_ARG_SCHEMAS` carried required-argument lists for the existing grammar. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` imported `PRED_TYPES`, validated predicate arguments, and carried `RECORD_ACTIVE_PATTERN` for exact-ID record refs. `tools/validators/src/schemas/story-storylet.schema.json` defined `effects.{create|supersede|close}` and `exit_options[].likely_effects` as arbitrary non-empty strings.
2. SPEC-25 D4 prescribes six predicates — `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, `any_intention(alias, holder_role?, urgency?)` — plus alias binding (`bound:<alias>` usable in `effects.{create|supersede|close}` and `exit_options[].likely_effects`). Role arguments reference `STENT.role_in_story` values (contract §4.4b). The predicates are valid for `global_author_pool` / `branch_prefix_scoped` scopes only; branch-execution eligibility still uses exact-ID predicates.
3. Cross-artifact boundary under audit: the predicate DSL grammar — `predicate-dsl-grammar.ts` (`PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`) ↔ `rule_storylet_predicate_dsl_parsability.ts` (parser) ↔ contract §5 — plus the `story-storylet.schema.json` `effects` surface. `predicate-dsl-grammar.ts` is also touched by archive/tickets/SPEC25STOCOHHAR-002.md (the `entity_status` `axis`→`field` reconcile), hence the Dep on archive/tickets/SPEC25STOCOHHAR-002.md to serialize the shared-file edits.
4. FOUNDATIONS Rule 4 (No Globalization by Accident) + §Story Bundles §5 branch-isolation: restated before trusting the spec — the six predicates are actor-unbound and reference no branch-local record IDs whose `created_at_page` is non-null. `bound:<alias>` is resolved at block-selection time against current branch state, so a global-pool block stays branch-isolated. Gate 4 still rejects exact branch-local IDs in global-pool blocks; this ticket broadens expressive reach without weakening that firewall.
5. Schema extension: `story-storylet.schema.json` is extended — `effects.{create|supersede|close}` items and `exit_options[].likely_effects` items may now be a `bound:<alias>` token in addition to a record id. Consumers — `rule_storylet_predicate_dsl_parsability.ts`, `commitment-block-authoring`, `branching-story-turn-cycle` (the latter two in SPEC25STOCOHHAR-007). Reassessment correction: live schema previously accepted arbitrary non-empty strings and the shared contract described `likely_effects` as labels; the landed schema now narrows those items to record ids or `bound:<alias>`. This is acceptable because SPEC-25 is greenfield for production story bundles, but current skill authoring prose remains SPEC25STOCOHHAR-007 scope.
6. Dependency: the `urgency?` argument on `any_obligation_open` / `any_consequence_pending` is only meaningful once `OBL` / `CNSQ` carry an `urgency` field — hence the Dep on archive/tickets/SPEC25STOCOHHAR-005.md.
7. HARD-GATE read: required and completed because `story-storylet.schema.json` is exercised by `record_schema_compliance` in validation lanes. The change tightens storylet shape and predicate parsability; it does not relax patch-engine approval, write ordering, approval tokens, or Mystery Reserve firewall behavior.

## Architecture Check

1. Six existential predicates plus alias binding — rather than the full seven-predicate DSL v2 including `any_accessible_object` — is the minimal load-bearing set: `STOBJ` access overlaps `has_affordance` grounding, while `OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT` are the first-class social state with no actor-unbound predicate today. `bound:<alias>` is the minimal mechanism letting effects target a matched record without naming a branch-local ID.
2. No shims: the new predicates extend the closed DSL in place — no parallel "v1 / v2" grammar, no legacy-predicate aliasing. `bound:<alias>` is a new token form within the existing `effects` string arrays, not a new schema shape.

## Verification Layers

1. `rule_storylet_predicate_dsl_parsability` accepts a `global_author_pool` `SLT` using `any_obligation_open` + `bound:<alias>` effects -> validator test.
2. The validator rejects a `bound:<alias>` effect with no binding precondition -> validator test.
3. The validator rejects an existential predicate used in a branch-execution (exact-ID) eligibility context where SPEC-25 D4 restricts it to author-pool / branch-prefix-scoped scopes -> validator test.
4. Contract §5 ↔ grammar parity -> grep-proof: all six predicates appear in `PRED_TYPES`, in `PREDICATE_ARG_SCHEMAS`, and in the contract §5 predicate table.

## Landed Changes

### 1. Contract §5

Added the six existential predicates with their argument signatures to the §5 closed-predicate-DSL table. Defined alias binding: an existential predicate binds `alias` to the matched record, and `SLT.effects.{create|supersede|close}` and `exit_options[].likely_effects` may reference `bound:<alias>`. Stated that these predicates are valid for `global_author_pool` / `branch_prefix_scoped` scopes only (actor-unbound prefiltering); branch-execution eligibility still uses exact-ID predicates where an actor is bound.

### 2. predicate-dsl-grammar.ts

Added the six predicates to `PRED_TYPES` and to `PREDICATE_ARG_SCHEMAS`; optional arguments remain parser-validated rather than represented in the required-only grammar map.

### 3. story-storylet.schema.json

Changed `effects.{create|supersede|close}` items and `exit_options[].likely_effects` items to accept record ids or `bound:<alias>` tokens via a shared schema definition.

### 4. rule_storylet_predicate_dsl_parsability.ts

Parsed and validated the six new predicates (argument enums: `urgency` against `low|medium|high`, role args against the `STENT.role_in_story` taxonomy, `axis` / `comparator` for `any_relationship_axis`, `mode` / `truth_relation` / `visibility` for `any_belief`). Validated `bound:<alias>` effect references — every `bound:<alias>` in `effects` or `likely_effects` must resolve to an `alias` bound by a `preconditions` predicate on the same block. Enforced the scope restriction — existential predicates are accepted only in `global_author_pool` / `branch_prefix_scoped` scopes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §4.4, §5)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — `effects.*` and `exit_options[].likely_effects` item form)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — new-predicate parse + `bound:<alias>` resolution + scope restriction)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — new predicates, binding, scope restriction)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify — storylet effect-reference schema coverage)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — current-contract storylet fixture)
- `archive/specs/SPEC-25-story-coherence-hardening.md` (modify — implementation note)

## Out of Scope

- `any_accessible_object` (the seventh predicate) — deferred by SPEC-25 §Key design decisions (`STOBJ` access overlaps `has_affordance` grounding).
- Skill authoring / resolution of the new predicates (`commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-health-audit`) — SPEC25STOCOHHAR-007.
- `engine_jargon_leak` literal-list completeness in `branching-story-prose-attach` — not in SPEC-25 D4's skill scope; the new predicate names are author-pool-prefilter terms unlikely to surface in rendered prose, and the existing `obligation_open(` / `consequence_pending(` / `thread_active(` literals substring-match the `any_*` forms. Classified as future cleanup, not a required consequence of this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run test` — `rule_storylet_predicate_dsl_parsability` accepts a `global_author_pool` `SLT` using `any_obligation_open` + `bound:<alias>` effects, and rejects a `bound:<alias>` effect with no binding precondition.
2. `cd tools/validators && npm run test` — the parser rejects an existential predicate used in a branch-execution exact-ID eligibility context.
3. `grep -nE "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` lists all six.

### Invariants

1. The six existential predicates are actor-unbound and reference no branch-local record IDs — Rule 4 / Gate 4 branch-isolation holds for `global_author_pool` blocks.
2. Every `bound:<alias>` in `effects` / `likely_effects` resolves to an `alias` bound by a `preconditions` predicate on the same block.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify) — add accept cases for each of the six predicates, bound / unbound `bound:<alias>` effect cases, and a scope-restriction reject case.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify) — add schema coverage for `bound:<alias>` / record-id effect references and rejection of prose labels.

### Commands

1. `cd tools/validators && npm run test`
2. `grep -nE "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`
3. A `tools/validators`-scoped `npm run test` is the correct boundary — the package script builds first, then runs the grammar, storylet schema, parser, and pre-apply tests that exercise the new predicates.

## Outcome

Completed on 2026-05-14.

Implemented D4's grammar/schema/validator slice. The closed predicate DSL now includes all six actor-unbound existential social-state predicates; parser validation checks optional argument enums/roles, `bound:<alias>` references, and the `global_author_pool` / `branch_prefix_scoped` scope restriction. Storylet `effects` and `exit_options[].likely_effects` now accept only record ids or `bound:<alias>` references, and the shared story-state contract documents that shape.

Updated SPEC-25's implementation note to mark this slice landed and preserve SPEC25STOCOHHAR-007 as the skill authoring/runtime-resolution owner.

## Verification Result

1. `cd tools/validators && npm run test` — PASS; package build completed and all 204 compiled tests passed.
2. `grep -nE "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — PASS; all six predicates appear in `PRED_TYPES` and `PREDICATE_ARG_SCHEMAS`.
3. Focused parser tests — PASS within the package suite; accepted all six existential predicates in a `global_author_pool` storylet, rejected unbound `bound:<alias>` effects, and rejected an existential predicate in `branch_scoped` scope.
4. Schema tests — PASS within the package suite; `record_schema_compliance` accepts record-id / `bound:<alias>` storylet effects and rejects prose-label `likely_effects`.
5. `docs/HARD-GATE-DISCIPLINE.md` reviewed — PASS; this validation-signal tightening does not relax approval, submit, pre-apply, or Mystery Reserve firewall behavior.

## Deviations

- The drafted command `cd tools/validators && npm run build && npm run test` was collapsed to `cd tools/validators && npm run test` because the package test script already runs `npm run build` first.
- `story-storylet.schema.json` was tightened from arbitrary non-empty effect strings to record ids / `bound:<alias>` tokens. This corrects the live schema to the intended D4 contract and is greenfield for production story bundles, but current operational skill authoring prose that still uses prose-label `likely_effects` remains SPEC25STOCOHHAR-007 scope.
- `cd tools/validators && npm run test` emits Git's default-branch-name hint from a temp git fixture; it is non-fatal and unrelated to this ticket.
