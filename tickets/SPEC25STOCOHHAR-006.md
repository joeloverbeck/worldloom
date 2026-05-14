# SPEC25STOCOHHAR-006: Predicate DSL v2 — grammar, schema, validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — modifies `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`; amends `.claude/skills/_shared-templates/story-state-contract.md` (§5).
**Deps**: archive/tickets/SPEC25STOCOHHAR-002.md, archive/tickets/SPEC25STOCOHHAR-005.md

## Problem

The closed predicate DSL's only actor-unbound predicate is `has_affordance`; every other predicate is exact-ID. Gate 4 / Rule 4 forbid global-author-pool storylets from referencing branch-local IDs, so global-pool blocks can prefilter only on affordances — not on the first-class social state (`OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT`) the architecture makes load-bearing. This ticket adds six actor-unbound existential predicates plus alias binding so `SLT.effects` can target what a precondition matched.

## Assumption Reassessment (2026-05-14)

1. `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` exposes `PRED_TYPES` (line 4 — includes `entity_status`, `has_affordance`) and `PREDICATE_ARG_SCHEMAS` (line 79). `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` imports `PRED_TYPES`, validates predicate arguments, and carries `RECORD_ACTIVE_PATTERN` (line ~37) for exact-ID record refs. `tools/validators/src/schemas/story-storylet.schema.json` defines `effects.{create|supersede|close}` as arrays of `minLength: 1` strings (lines 149-151) and `exit_options[].likely_effects` (line 187).
2. SPEC-25 D4 prescribes six predicates — `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, `any_intention(alias, holder_role?, urgency?)` — plus alias binding (`bound:<alias>` usable in `effects.{create|supersede|close}` and `exit_options[].likely_effects`). Role arguments reference `STENT.role_in_story` values (contract §4.4b). The predicates are valid for `global_author_pool` / `branch_prefix_scoped` scopes only; branch-execution eligibility still uses exact-ID predicates.
3. Cross-artifact boundary under audit: the predicate DSL grammar — `predicate-dsl-grammar.ts` (`PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`) ↔ `rule_storylet_predicate_dsl_parsability.ts` (parser) ↔ contract §5 — plus the `story-storylet.schema.json` `effects` surface. `predicate-dsl-grammar.ts` is also touched by archive/tickets/SPEC25STOCOHHAR-002.md (the `entity_status` `axis`→`field` reconcile), hence the Dep on archive/tickets/SPEC25STOCOHHAR-002.md to serialize the shared-file edits.
4. FOUNDATIONS Rule 4 (No Globalization by Accident) + §Story Bundles §5 branch-isolation: restated before trusting the spec — the six predicates are actor-unbound and reference no branch-local record IDs whose `created_at_page` is non-null. `bound:<alias>` is resolved at block-selection time against current branch state, so a global-pool block stays branch-isolated. Gate 4 still rejects exact branch-local IDs in global-pool blocks; this ticket broadens expressive reach without weakening that firewall.
5. Schema extension: `story-storylet.schema.json` is extended — `effects.{create|supersede|close}` items and `exit_options[].likely_effects` items may now be a `bound:<alias>` token in addition to a record id. Consumers — `rule_storylet_predicate_dsl_parsability.ts`, `commitment-block-authoring`, `branching-story-turn-cycle` (the latter two in SPEC25STOCOHHAR-007). The extension is additive: a `bound:<alias>` token is a new accepted string form; existing record-id strings still validate.
6. Dependency: the `urgency?` argument on `any_obligation_open` / `any_consequence_pending` is only meaningful once `OBL` / `CNSQ` carry an `urgency` field — hence the Dep on archive/tickets/SPEC25STOCOHHAR-005.md.

## Architecture Check

1. Six existential predicates plus alias binding — rather than the full seven-predicate DSL v2 including `any_accessible_object` — is the minimal load-bearing set: `STOBJ` access overlaps `has_affordance` grounding, while `OBL` / `CNSQ` / `THR` / `SREL` / `BEL` / `STINT` are the first-class social state with no actor-unbound predicate today. `bound:<alias>` is the minimal mechanism letting effects target a matched record without naming a branch-local ID.
2. No shims: the new predicates extend the closed DSL in place — no parallel "v1 / v2" grammar, no legacy-predicate aliasing. `bound:<alias>` is a new token form within the existing `effects` string arrays, not a new schema shape.

## Verification Layers

1. `rule_storylet_predicate_dsl_parsability` accepts a `global_author_pool` `SLT` using `any_obligation_open` + `bound:<alias>` effects -> validator test.
2. The validator rejects a `bound:<alias>` effect with no binding precondition -> validator test.
3. The validator rejects an existential predicate used in a branch-execution (exact-ID) eligibility context where SPEC-25 D4 restricts it to author-pool / branch-prefix-scoped scopes -> validator test.
4. Contract §5 ↔ grammar parity -> grep-proof: all six predicates appear in `PRED_TYPES`, in `PREDICATE_ARG_SCHEMAS`, and in the contract §5 predicate table.

## What to Change

### 1. Contract §5

Add the six existential predicates with their argument signatures to the §5 closed-predicate-DSL table. Define alias binding: an existential predicate binds `alias` to the matched record, and `SLT.effects.{create|supersede|close}` and `exit_options[].likely_effects` may reference `bound:<alias>`. State that these predicates are valid for `global_author_pool` / `branch_prefix_scoped` scopes only (actor-unbound prefiltering); branch-execution eligibility still uses exact-ID predicates where an actor is bound.

### 2. predicate-dsl-grammar.ts

Add the six predicates to `PRED_TYPES` and to `PREDICATE_ARG_SCHEMAS`, modeling the optional arguments (`kind?`, `urgency?`, `owed_by_role?`, etc.) per the existing arg-schema shape (the current schema records `required` arrays — extend the shape to express optional args, or list only the required args per predicate consistent with how `belief` already models optional `mode?` / `confidence_floor?`).

### 3. story-storylet.schema.json

Allow `effects.{create|supersede|close}` items and `exit_options[].likely_effects` items to be a `bound:<alias>` token in addition to a record id (e.g. a pattern alternation permitting `^bound:[a-z][a-z0-9_-]*$` alongside the existing record-id form).

### 4. rule_storylet_predicate_dsl_parsability.ts

Parse and validate the six new predicates (argument enums: `urgency` against `low|medium|high`, role args against the `STENT.role_in_story` taxonomy, `axis` / `comparator` for `any_relationship_axis`, `mode` / `truth_relation` / `visibility` for `any_belief`). Validate `bound:<alias>` effect references — every `bound:<alias>` in `effects` or `likely_effects` must resolve to an `alias` bound by a `preconditions` predicate on the same block. Enforce the scope restriction — existential predicates are accepted only in `global_author_pool` / `branch_prefix_scoped` scopes.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §5)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — `PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify — `effects.*` and `exit_options[].likely_effects` item form)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — new-predicate parse + `bound:<alias>` resolution + scope restriction)

## Out of Scope

- `any_accessible_object` (the seventh predicate) — deferred by SPEC-25 §Key design decisions (`STOBJ` access overlaps `has_affordance` grounding).
- Skill authoring / resolution of the new predicates (`commitment-block-authoring`, `branching-story-turn-cycle`, `branching-story-health-audit`) — SPEC25STOCOHHAR-007.
- `engine_jargon_leak` literal-list completeness in `branching-story-prose-attach` — not in SPEC-25 D4's skill scope; the new predicate names are author-pool-prefilter terms unlikely to surface in rendered prose, and the existing `obligation_open(` / `consequence_pending(` / `thread_active(` literals substring-match the `any_*` forms. Classified as future cleanup, not a required consequence of this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` — `rule_storylet_predicate_dsl_parsability` accepts a `global_author_pool` `SLT` using `any_obligation_open` + `bound:<alias>` effects, and rejects a `bound:<alias>` effect with no binding precondition.
2. `cd tools/validators && npm run build && npm run test` — the parser rejects an existential predicate used in a branch-execution exact-ID eligibility context.
3. `grep -nE "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` lists all six.

### Invariants

1. The six existential predicates are actor-unbound and reference no branch-local record IDs — Rule 4 / Gate 4 branch-isolation holds for `global_author_pool` blocks.
2. Every `bound:<alias>` in `effects` / `likely_effects` resolves to an `alias` bound by a `preconditions` predicate on the same block.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify) — add accept cases for each of the six predicates, bound / unbound `bound:<alias>` effect cases, and a scope-restriction reject case.

### Commands

1. `cd tools/validators && npm run build && npm run test`
2. `grep -nE "any_obligation_open|any_consequence_pending|any_thread_active|any_relationship_axis|any_belief|any_intention" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`
3. A `tools/validators`-scoped `npm run test` is the correct boundary — the grammar, the storylet schema, and the parser all live in `tools/validators`, and the contract §5 edit is verified by the same suite parsing fixtures that use the new predicates.
