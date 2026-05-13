# SPEC23STOSTACON-008: Retire old-pipeline validators + rebuild predicate-dsl-grammar + rewrite parsability

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/rules/` (delete five validators + rewrite one), `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, validator registry, CLI selector allowlist, validator package tests/README, SPEC-23 implementation note
**Deps**: archive/tickets/SPEC23STOSTACON-001.md, archive/tickets/SPEC23STOSTACON-002.md

## Problem

At intake, five validators under `tools/validators/src/rules/` were tied to the retired `storylet-pool-authoring` pipeline and validated SLT-record fields that the post-SPEC23STOSTACON-001 contract explicitly forbids (FOUNDATIONS §Story Bundles §5b "the contract is authoritative"; contract §4.4 enumerates the forbidden fields):

- `arc_schema_compliance.ts` — validates ARC_BLOCKS = `["arc_contract", "dramatic_unit", "beat_plan", "execution_envelope", "stop_policy", "effect_model", "exit_portfolio"]` — all but `beat_plan` are explicitly forbidden by the new contract.
- `effect_model_legality.ts` — validates the `effect_model` block (forbidden).
- `effect_model_replay_safety.ts` — validates `effect_model` replay semantics (forbidden).
- `stop_policy_parsability.ts` — validates the `stop_policy` block (forbidden).
- `choice_worthiness_completeness.ts` — uses STRONG_AXES from the old vocabulary (`relationship_trajectory`, `obligation_state`, `information_posture`, etc. — none of which exist in the post-SPEC23STOSTACON-001 contract).

After SPEC23STOSTACON-002 rebuilt the SLT schema to the contract §4.4 minimalist shape, these five validators had nothing to validate — they would either silently no-op (if the missing top-level fields caused early-return paths) or hard-fail every contract-shaped SLT record (if their framework expected the fields to exist). Both outcomes were wrong. This ticket retired them.

Concurrently, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` had a 21-entry PRED_TYPES list inherited from the retired pipeline; SPEC23STOSTACON-001's predicate DSL audit determined the live set for the rebuilt skill family and added five new predicates (`record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`). This ticket pruned the grammar to the canonical contract §5 set and updated the file header to the contract path.

Finally, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` referenced top-level `hard_preconds` / `soft_preconds` fields. The post-contract SLT has nested `preconditions.hard | soft`; this ticket rewrote the parsability validator to consume the nested shape, the new predicate set, and the new argument schemas.

## Assumption Reassessment (2026-05-13)

1. Validators-to-retire state verified: `tools/validators/src/rules/arc_schema_compliance.ts` (ARC_BLOCKS at lines 6-13), `effect_model_legality.ts` (EFFECT_TYPES at lines 6-15), `effect_model_replay_safety.ts`, `stop_policy_parsability.ts` (imports STOP_PREDICATES from `_shared/predicate-dsl-grammar.ts`), `choice_worthiness_completeness.ts` (STRONG_AXES at lines 6-14) — all exist as named.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.4 line 201 (post-SPEC23STOSTACON-001) explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, `effect_model`, `stop_policy` — the schema rebuild in SPEC23STOSTACON-002 drops them. Validators reading those fields have nothing to validate.
3. Cross-skill / cross-artifact boundary under audit: validators are consumed by the `world-validate` CLI surface (`tools/validators/package.json` bin entry); via `tools/validators/src/public/registry.ts`; and by CLI rule-selector allowlists, registry/count tests, and `tools/validators/README.md` inventory prose. Retiring a validator means: (a) deleting the source file, (b) deleting its test file, (c) removing it from `registry.ts`, (d) removing it from selector allowlists and same-package tests/docs that enumerate active validators, (e) regenerating the `dist/` build output via `npm run build`.
4. FOUNDATIONS principles motivating this ticket: **Rule 1 (No Floating Facts)** — retired validators validated fields that are no longer in the schema; the validators were no-op surfaces costing CI time without enforcement value. **Rule 7 (Preserve Mystery Deliberately)** — implementation reassessment corrected the stale draft assumption that `forbidden_mystery_resolution_risk` had to survive as a predicate; it belonged to the retired `stop_policy` surface. The surviving MR firewall is `rule7_mystery_reserve_preservation` plus story-skill HARD-GATE plan-time checks and SLT `mystery_policy` schema discipline, so retiring the stop-policy grammar does not weaken the firewall.
5. HARD-GATE / canon-write surface (menu item 5 per `tickets/_TEMPLATE.md`): `docs/HARD-GATE-DISCIPLINE.md` was read because this changes validation signals used around story-pipeline gates. The parser rewrite does not alter write ordering, approval-token semantics, or canon-mutation paths.
6. Skill / tool / hook / validator field rename or removal (menu item 7): blast radius pipeline-wide: `rg -n "(arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness)" tools/ .claude/skills/ docs/ specs/ tickets/ archive/` was checked during implementation reassessment. Current package-owned hits include `tools/validators/src/public/registry.ts`, `tools/validators/src/cli/_helpers.ts`, package tests, and `tools/validators/README.md`; archive/spec/ticket hits are historical or downstream planning context. `docs/MACHINE-FACING-LAYER.md` links to the validator inventory but does not enumerate the retired names.
7. Adjacent contradictions classification: (a) Tests for the retired validators (`tools/validators/tests/rules/arc_schema_compliance.test.ts` and friends) are deleted alongside the validators — required consequence. (b) `tools/validators/src/cli/_helpers.ts`, `tools/validators/tests/cli/rule-filter-pattern.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, `tools/validators/tests/cli/world-validate.story-bundle.test.ts`, and `tools/validators/README.md` enumerate active rule validators; these are same-package required fallout, not sibling scope. (c) The predicate-dsl-grammar.ts file currently includes `STOP_PREDICATES` / `STOP_PREDICATE_ARG_SCHEMAS` consumed by `stop_policy_parsability.ts`. Grep found no other production consumer, so those exports are retired with the stop-policy validator. (d) The grammar's old helper exports (`FACT_MATCHES_PREDICATES`, `ENTITY_STATE_PROPERTIES`, `EPISTEMIC_CLASSES`, `OBLIGATION_STATE_PROPERTIES`, `OBLIGATION_STATUSES`) are only consumed by the old parsability implementation; the rewrite owns removing them or replacing them with contract-shaped helper constants.

## Architecture Check

1. Deleting retired validators is cleaner than rewriting them: each validator is tightly coupled to a forbidden field block (arc_contract / effect_model / stop_policy / etc.). Rewriting to consume the new contract's `move_family` / `action_family` / `beats.function` enums would be a re-litigation of arc-positional framing the contract explicitly rejects. Deletion preserves the contract's intent.
2. The predicate-dsl-grammar prune is cleaner than carrying dead PRED_TYPES: each PRED_TYPE that remains in the grammar but is not consumed produces ambiguity for authors and false-confidence about which predicates are load-bearing. Pruning to the canonical contract §5 set makes the grammar match the spec.
3. The parsability rewrite is cleaner than patching the old parsability validator to also accept nested `preconditions.hard | soft`: the old validator's evaluation tree was designed around top-level `hard_preconds` arrays. Carrying both shapes via branching code would be a back-compat shim the spec rejects. A clean rewrite against the contract's nested shape is the right call.
4. No backwards-compatibility aliasing: dropped predicate names, retired validators, and the renamed field hierarchy (`preconditions.hard` vs `hard_preconds`) are not aliased.

## Verification Layers

1. Five validator files deleted → filesystem absence: `ls tools/validators/src/rules/{arc_schema_compliance,effect_model_legality,effect_model_replay_safety,stop_policy_parsability,choice_worthiness_completeness}.ts 2>&1` returns "No such file" for all five.
2. Their test files deleted → same `ls` against `tools/validators/tests/rules/<name>.test.ts` (if tests at that path).
3. Validator framework registry no longer references the deleted validators → codebase grep-proof: `grep -rnE "arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness" tools/validators/src tools/validators/tests` returns no matches.
4. `predicate-dsl-grammar.ts` PRED_TYPES matches contract §5 canonical set (per SPEC23STOSTACON-001 audit) → codebase grep-proof: `grep -nE "^  \"[a-z_]+\"," tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns the canonical predicate list; cross-reference contract §5 table.
5. `predicate-dsl-grammar.ts` file-header references contract path → codebase grep-proof: `head -2 tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` no longer contains `storylet-pool-authoring/templates/predicate-dsl.md`; references `.claude/skills/_shared-templates/story-state-contract.md` §5 instead.
6. 5 new predicates added to grammar → grep: `grep -cE "(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns ≥5.
7. `rule_storylet_predicate_dsl_parsability.ts` consumes nested `preconditions.hard | soft` → grep: `grep -nE "preconditions\\.(hard|soft)" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns ≥2 matches; `grep -E "hard_preconds|soft_preconds" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns no matches.
8. MR firewall preservation: the retired stop-policy predicate is not retained; Rule 7 remains validated by `rule7_mystery_reserve_preservation` and story-skill HARD-GATE plan-time discipline → grep: `rg -n "future_resolution_safety|rule7_mystery" tools/validators/src/rules tools/validators/tests/rules` returns surviving Rule 7 source and tests.
9. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## Landed Changes

### 1. Delete five retired validators + their tests

Deleted the source files:
- `tools/validators/src/rules/arc_schema_compliance.ts`
- `tools/validators/src/rules/effect_model_legality.ts`
- `tools/validators/src/rules/effect_model_replay_safety.ts`
- `tools/validators/src/rules/stop_policy_parsability.ts`
- `tools/validators/src/rules/choice_worthiness_completeness.ts`

Deleted their corresponding test files:
- `tools/validators/tests/rules/arc_schema_compliance.test.ts`
- `tools/validators/tests/rules/effect_model_legality.test.ts`
- `tools/validators/tests/rules/effect_model_replay_safety.test.ts`
- `tools/validators/tests/rules/stop_policy_parsability.test.ts`
- `tools/validators/tests/rules/choice_worthiness_completeness.test.ts`

### 2. Remove deleted validators from framework registry

The validator framework uses explicit rule registration in `tools/validators/src/public/registry.ts`. Removed the five retired imports/entries, removed their `world-validate --rules` selector names from `tools/validators/src/cli/_helpers.ts`, updated rule-count/list tests, and updated `tools/validators/README.md` to 9 active rule-derived validators.

### 3. Prune `predicate-dsl-grammar.ts` PRED_TYPES + helpers

Updated `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`:
- `PRED_TYPES` now has the 17 contract §5 names: `fact_true`, `belief`, `entity_status`, `relationship_axis`, `obligation_open`, `consequence_pending`, `thread_active`, `location`, `has_affordance`, `record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`, `not`, `all`, `any`.
- Retired stop-policy exports and old helper exports with no surviving consumer.
- Preserved `RELATIONSHIP_AXES` and added shared `ACTION_FAMILIES`, `BELIEF_MODES`, `CONFIDENCE_LEVELS`, and `PREDICATE_ARG_SCHEMAS` constants used by the parser/tests.
- Updated the file header to `.claude/skills/_shared-templates/story-state-contract.md section 5`.

### 4. Rewrite `rule_storylet_predicate_dsl_parsability.ts`

Rewrote `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`:
- Consumes `parsed.preconditions.hard` and `parsed.preconditions.soft`.
- Validates every surviving contract predicate, including the five new predicates' ID and `action_family` argument shapes.
- Removes old top-level precondition, cast/location requirement, choice-template, fact_matches/entity_state/epistemic/time/location-class branches.
- Keeps the validator name `storylet_predicate_dsl_parsability` and its `create_slt_record` pre-apply participation.

### 5. Update / write tests for the rewritten parsability validator

Updated `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` with nested `preconditions.hard | soft` PASS/FAIL coverage, all contract predicate forms, malformed arg coverage, and `create_slt_record` pre-apply participation.

### 6. Cross-pipeline audit: ensure no orphaned references

After deletions, package-local greps show no residual retired validator references in `tools/validators/src` or `tools/validators/tests`. Pipeline-wide hits remain only in active ticket/spec planning prose, archive history, and `SPEC23STOSTACON-009`'s instruction to remove stale skill prose references if found. `docs/MACHINE-FACING-LAYER.md` did not enumerate the retired names.

## Files to Touch

- `tools/validators/src/rules/arc_schema_compliance.ts` (delete)
- `tools/validators/src/rules/effect_model_legality.ts` (delete)
- `tools/validators/src/rules/effect_model_replay_safety.ts` (delete)
- `tools/validators/src/rules/stop_policy_parsability.ts` (delete)
- `tools/validators/src/rules/choice_worthiness_completeness.ts` (delete)
- `tools/validators/tests/rules/arc_schema_compliance.test.ts` (delete)
- `tools/validators/tests/rules/effect_model_legality.test.ts` (delete)
- `tools/validators/tests/rules/effect_model_replay_safety.test.ts` (delete)
- `tools/validators/tests/rules/stop_policy_parsability.test.ts` (delete)
- `tools/validators/tests/rules/choice_worthiness_completeness.test.ts` (delete)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — prune PRED_TYPES, add 5 new predicates' arg schemas, update file-header)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — nested precondition consumption + new predicate arg validation)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — new test coverage)
- `tools/validators/src/public/registry.ts` (modify — remove retired validator imports/entries)
- `tools/validators/src/cli/_helpers.ts` (modify — remove retired named rule selectors)
- `tools/validators/tests/rules/registry.test.ts` (modify — active rule list)
- `tools/validators/tests/cli/rule-filter-pattern.test.ts` (modify — selector allowlist)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify — drop retired-v2 validator CLI scenario)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — validator counts/list)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply execution expectations now exclude retired validators)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify — remove retired effect-model replay cross-check)
- `tools/validators/README.md` (modify — validator inventory/count)
- `specs/SPEC-23-story-state-contract-taxonomies.md` (modify — implementation note marking SPEC23STOSTACON-008 complete)
- `docs/MACHINE-FACING-LAYER.md` (no edit expected — it links to validator inventory but does not enumerate the retired names)

## Out of Scope

- Schema rebuild — archive/tickets/SPEC23STOSTACON-002.md (this ticket's dependency).
- Contract amendment + §5 predicate canonical list — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency; provides the audited PRED_TYPES list).
- Skill prose updates for new predicate guidance — SPEC23STOSTACON-009.
- Adding new validators (e.g., move_family conformance, action_family conformance) — out of scope; the closed enums are enforced at the JSON Schema layer per archive/tickets/SPEC23STOSTACON-002.md.
- Skill prose updates for retired validator references, if any — `tickets/SPEC23STOSTACON-009.md`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript builds clean; deleted validators don't leave dangling imports.
2. `cd tools/validators && npm test` — full validator test suite passes; retired validators' tests are gone; new parsability tests cover nested preconditions + 5 new predicates.
3. `grep -rnE "arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness" tools/validators/src tools/validators/tests` returns no matches.
4. `grep -nE "preconditions\\.(hard|soft)" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns ≥2 matches; `grep -E "hard_preconds|soft_preconds" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns 0 matches.
5. `grep -cE "(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns ≥5.

### Invariants

1. Every predicate name in the rebuilt `PRED_TYPES` constant matches an entry in the contract §5 closed table. The grammar and the contract are pin-aligned; drift between them is a structural validation failure (one of the SPEC-04 structural gates per FOUNDATIONS §SPEC-04).
2. MR firewall (Rule 7) is preserved: the validator pipeline still enforces the data-layer mystery-reserve safety/status coupling through `rule7_mystery_reserve_preservation`, and story-skill HARD-GATE plan-time checks remain the authoritative forbidden-resolution surface. The stop-policy predicate is intentionally retired with the old stop-policy block.
3. The deleted validators have zero surviving consumers anywhere in `tools/validators/` (registry, tests, framework loaders).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — rewrite covers nested `preconditions.hard | soft` parsing, PASS for all contract predicate forms including the 5 new predicates, malformed argument failures, unknown-predicate failure for dropped predicates such as `epistemic`, and Shape B `create_slt_record` pre-apply participation.
2. Delete: `tools/validators/tests/rules/arc_schema_compliance.test.ts`, `effect_model_legality.test.ts`, `effect_model_replay_safety.test.ts`, `stop_policy_parsability.test.ts`, `choice_worthiness_completeness.test.ts` (whichever exist).

### Commands

1. `cd tools/validators && npm run build`; `cd tools/validators && npm test` — full build + test pass. The first `npm test` run before `npm run clean` failed because stale compiled deleted tests remained in pre-existing `dist/`; after `npm run clean`, the fresh suite passed.
2. Five deletions verified: `ls tools/validators/src/rules/{arc_schema_compliance,effect_model_legality,effect_model_replay_safety,stop_policy_parsability,choice_worthiness_completeness}.ts 2>&1 | grep -c "No such file"` returns 5.
3. `grep -rnE "(arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness)" tools/validators/src tools/validators/tests` returns no matches.
4. Predicate set verification: `node -e "const g = require('./tools/validators/dist/src/rules/_shared/predicate-dsl-grammar.js'); console.log(g.PRED_TYPES.length, g.PRED_TYPES.join(','));"` returns the audited canonical count and list.

## Outcome

Completed on 2026-05-13. The retired old-pipeline rule validators and their tests were removed from `tools/validators`, active rule registration/selectors/docs now expose 9 rule-derived validators, and `storylet_predicate_dsl_parsability` now validates the post-contract nested `preconditions.hard | soft` shape against the 17-name contract §5 predicate set. SPEC-23 now has an implementation note marking this slice complete.

## Verification Result

1. `cd tools/validators && npm run build` — PASS.
2. `cd tools/validators && npm test` — PASS after `npm run clean`; 178 tests passed. Earlier `npm test` before cleaning failed only because stale deleted compiled tests under pre-existing `dist/` were still executed.
3. `rg -n "arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness" tools/validators/src tools/validators/tests` — PASS; no matches.
4. Source/test deletion checks for the five retired rule files and five retired rule test files — PASS; all absent.
5. `rg -n "hard_preconds|soft_preconds" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — PASS; no matches.
6. `grep -nE 'preconditions\.(hard|soft)' tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` — PASS; nested shape is consumed.
7. `head -2 tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` — PASS; header references `.claude/skills/_shared-templates/story-state-contract.md section 5`.
8. `node -e "const g = require('./tools/validators/dist/src/rules/_shared/predicate-dsl-grammar.js'); console.log(g.PRED_TYPES.length, g.PRED_TYPES.join(','));"` — PASS; returned `17 fact_true,belief,entity_status,relationship_axis,obligation_open,consequence_pending,thread_active,location,has_affordance,record_active,intention_active,object_accessible,artifact_accessible,affordance_available_to,not,all,any`.
9. `rg -n "forbidden_mystery_resolution|mystery_safety|future_resolution_safety|rule7_mystery" tools/validators/src/rules tools/validators/tests/rules` — PASS; Rule 7 remains represented by `rule7_mystery_reserve_preservation` and its tests.
10. `git diff --check` — PASS; no whitespace errors.

## Deviations

1. The drafted requirement to retain `forbidden_mystery_resolution_risk` was stale. That predicate existed only in the retired `stop_policy` grammar, while the current Rule 7 surface is `rule7_mystery_reserve_preservation` plus story-skill HARD-GATE plan-time checks and SLT `mystery_policy` schema discipline.
2. `tools/validators/tests/fixtures/story-storylet-complete.yaml` and two old JSON patch-plan fixtures still contain `hard_preconds` / `soft_preconds` as legacy fixture data for schema rejection/historical tests. The parser source and active parser tests no longer consume top-level precondition fields.
