# VALENH-035: resolve `has_affordance` scope-rule drift between story-state contract and predicate runtime

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes - `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`, `tools/validators/src/schemas/story-storylet.schema.json`, `tools/validators/tests/predicate-dsl-grammar-parity.test.ts`, and `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts`.
**Deps**: `archive/tickets/VALENH-034.md`

## Problem

At intake, post-ticket review of VALENH-034 confirmed a remaining predicate-DSL contract drift that VALENH-034 intentionally excluded: `.claude/skills/_shared-templates/story-state-contract.md` said `has_affordance(<action_family>)` and the `any_*` existential predicates were valid only for `global_author_pool` and `branch_prefix_scoped` prefiltering when an actor is not yet bound, but runtime did not enforce that rule for `has_affordance`. `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` called `requireExistentialScope(...)` for the 11 `any_*` predicates, but the `has_affordance` case did not call it.

Before this ticket, the result was a discoverability/runtime ambiguity: either `has_affordance` was truly actor-unbound and should share the `global_author_pool` / `branch_prefix_scoped` restriction, or the contract prose over-grouped it with the existential predicates and should be narrowed. The landed change resolves that ambiguity by making runtime and schema-discovery match the existing story-skill prose.

## Assumption Reassessment (2026-05-23)

1. **Codebase verification**: at intake, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` invoked `requireExistentialScope(state, value.pred, path)` for 11 `any_*` predicates and did not invoke it in the `has_affordance` case. The landed runtime now invokes `requireExistentialScope(...)` for `has_affordance`, and `tools/validators/src/schemas/story-storylet.schema.json` includes `has_affordance` in the `$defs.scopeRestrictedPrefilterPredicate` schema-discovery enum.
2. **Spec/doc verification**: `.claude/skills/_shared-templates/story-state-contract.md` groups `has_affordance(<action_family>)` with the `any_*` existential predicates as valid only for `global_author_pool` and `branch_prefix_scoped` prefiltering. The active turn-cycle and commitment-block authoring skills repeat that boundary: branch-scoped blocks should prefer `affordance_available_to(<actor>, <action_family>)`, while `has_affordance` is actor-agnostic author-pool / branch-prefix prefiltering.
3. **Shared boundary under audit**: predicate-DSL scope semantics across the shared story-state contract, `story-storylet.schema.json`, and `rule_storylet_predicate_dsl_parsability.ts`.
4. **FOUNDATIONS principle**: the Tooling Recommendation requires machine-facing discovery surfaces to be current and truthful; contract prose and validator behavior should not disagree on whether a HARD-GATE-facing pre-apply validation signal accepts or rejects a storylet predicate shape.
5. **Adjacent contradiction classification**: this is separate validator/schema contract drift exposed by VALENH-034, not unfinished VALENH-034 work. VALENH-034 correctly aligned the schema to the existing runtime for the 11 `any_*` predicates and left runtime behavior unchanged.
6. **Chosen semantic owner**: the stale surface is runtime/schema parity, not shared prose. `has_affordance` remains an actor-unbound prefilter and must share the `global_author_pool` / `branch_prefix_scoped` restriction. Branch-scoped execution blocks retain the actor-specific `affordance_available_to` predicate for affordance grounding.

## Architecture Check

1. Restrict `has_affordance` in runtime/schema parity because the shared prose and active story skills treat it as actor-unbound author-pool / branch-prefix prefiltering.
2. No backwards-compatibility aliasing or shim layer was introduced. This is a contract/runtime parity repair, not a second predicate spelling.

## Verification Layers

1. `has_affordance` scope semantics match between shared contract prose, runtime parser behavior, and schema-discovery surface -> manual review plus focused grep-proof over the three surfaces.
2. Package-local predicate/schema tests prove accepted and rejected `has_affordance` storylet shapes under the decided scopes -> validators package test.
3. FOUNDATIONS Tooling Recommendation alignment -> manual review confirming discoverable schema/prose no longer advertises a shape contradicted by pre-apply validation.

## Landed Changes

### 1. Reassessed the intended semantics

`has_affordance` is treated as actor-unbound author-pool / branch-prefix prefiltering like the shared prose already said. Branch-scoped execution blocks keep using actor-specific predicates such as `affordance_available_to(<actor>, <action_family>)`.

### 2. Repaired the chosen surface

Added the runtime `requireExistentialScope(...)` call for `has_affordance`, extended schema-discovery parity so branch-scoped storylets reject `has_affordance`, and added tests proving `branch_scoped` rejection plus `global_author_pool` / `branch_prefix_scoped` acceptance.

## Files to Touch

- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify)
- `tools/validators/src/schemas/story-storylet.schema.json` (modify)
- `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` (modify)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify)

## Out of Scope

- Changing the 11 `any_*` predicates already covered by VALENH-034.
- Introducing a new predicate spelling or compatibility alias.
- Migrating existing story-bundle records or world content.
- Rewriting active skill prose that already reserves `has_affordance` for author-pool / branch-prefix prefiltering.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js`
3. `cd tools/validators && node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
4. `cd tools/validators && npm test`

### Invariants

1. The shared story-state contract and runtime parser agree on whether `has_affordance` is valid under `branch_scoped`.
2. The discoverable storylet schema does not accept a `has_affordance` shape that runtime rejects, and does not reject a `has_affordance` shape that runtime accepts.
3. The discoverable schema `$defs.scopeRestrictedPrefilterPredicate` name is semantically truthful now that the set includes non-existential `has_affordance`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` - extended the schema/runtime parity loop to include `has_affordance` in the scope-restricted prefilter set.
2. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` - extended the branch-scoped rejection test to assert a `has_affordance` `predicate.invalid_scope` verdict.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js`
3. `cd tools/validators && node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js`
4. `cd tools/validators && npm test`

## Outcome

Completed. `has_affordance` now follows the same scope rule as the actor-unbound author-pool / branch-prefix prefilter predicates. Runtime parsability rejects `has_affordance` under `scope.visibility: branch_scoped`; the storylet schema-discovery surface rejects the same top-level branch-scoped shape through `$defs.scopeRestrictedPrefilterPredicate`; focused parity and runtime tests cover both the rejected branch-scoped case and the accepted `global_author_pool` / `branch_prefix_scoped` cases.

## Verification Result

1. Pre-edit baseline: `cd tools/validators && npm test` — PASS, 901 tests passed. This baseline included the pre-existing same-seam VALENH-034 schema/parity edits already present in the worktree.
2. `cd tools/validators && npm run build` — PASS.
3. `cd tools/validators && node --test dist/tests/predicate-dsl-grammar-parity.test.js` — PASS, 6 tests passed. The focused schema parity test now includes `has_affordance` in the scope-restricted prefilter set.
4. `cd tools/validators && node --test dist/tests/rules/rule_storylet_predicate_dsl_parsability.test.js` — PASS, 12 tests passed. The focused runtime test now verifies `has_affordance` emits `predicate.invalid_scope` under `branch_scoped`.
5. Final broad proof: `cd tools/validators && npm test` — PASS, 901 tests passed.
6. Manual review / grep proof: `.claude/skills/_shared-templates/story-state-contract.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, `.claude/skills/branching-story-turn-cycle/references/phase-2-3-commitment-and-state-delta.md`, and `.claude/skills/commitment-block-authoring/SKILL.md` already reserve `has_affordance` for author-pool / branch-prefix prefiltering, while the validator runtime/schema/test surfaces now encode the same rule.
7. Package user-facing surface inspection: `tools/validators/README.md` and package-local docs/examples did not contain same-seam `has_affordance` scope guidance requiring edits.
8. Post-review blocker fix: `$defs.scopeRestrictedExistentialPredicate` was renamed to `$defs.scopeRestrictedPrefilterPredicate`; focused and broad validator proofs were rerun after the rename.

## Deviations

- The ticket chose the runtime/schema repair path, so `.claude/skills/_shared-templates/story-state-contract.md` was not edited.
- `tools/validators/src/schemas/story-storylet.schema.json` and `tools/validators/tests/predicate-dsl-grammar-parity.test.ts` already had uncommitted VALENH-034 edits in the worktree before this run. This ticket's owned hunks are the `has_affordance` addition to the restricted schema enum, the parity-test extension from existential-only to scope-restricted prefilter coverage, and the post-review rename from the misleading existential `$defs` name to `scopeRestrictedPrefilterPredicate`.
