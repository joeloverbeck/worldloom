# SPEC23STOSTACON-008: Retire old-pipeline validators + rebuild predicate-dsl-grammar + rewrite parsability

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/validators/src/rules/` (delete five validators + rewrite one), `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, validator registry
**Deps**: archive/tickets/SPEC23STOSTACON-001.md, archive/tickets/SPEC23STOSTACON-002.md

## Problem

Five validators under `tools/validators/src/rules/` are tied to the retired `storylet-pool-authoring` pipeline and validate SLT-record fields that the post-SPEC23STOSTACON-001 contract explicitly forbids (FOUNDATIONS §Story Bundles §5b "the contract is authoritative"; contract §4.4 line 201 enumerates the forbidden fields):

- `arc_schema_compliance.ts` — validates ARC_BLOCKS = `["arc_contract", "dramatic_unit", "beat_plan", "execution_envelope", "stop_policy", "effect_model", "exit_portfolio"]` — all but `beat_plan` are explicitly forbidden by the new contract.
- `effect_model_legality.ts` — validates the `effect_model` block (forbidden).
- `effect_model_replay_safety.ts` — validates `effect_model` replay semantics (forbidden).
- `stop_policy_parsability.ts` — validates the `stop_policy` block (forbidden).
- `choice_worthiness_completeness.ts` — uses STRONG_AXES from the old vocabulary (`relationship_trajectory`, `obligation_state`, `information_posture`, etc. — none of which exist in the post-SPEC23STOSTACON-001 contract).

After SPEC23STOSTACON-002 rebuilds the SLT schema to the contract §4.4 minimalist shape, these five validators have nothing to validate — they will either silently no-op (if the missing top-level fields cause early-return paths) or hard-fail every contract-shaped SLT record (if their framework expects the fields to exist). Both outcomes are wrong. The validators must be retired.

Concurrently, `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` PRED_TYPES list has 21 entries inherited from the retired pipeline; SPEC23STOSTACON-001's predicate DSL audit (step 8) determined the live set for the rebuilt skill family and adds five new predicates (`record_active`, `intention_active`, `object_accessible`, `artifact_accessible`, `affordance_available_to`). The grammar file-header at line 1 still references the dead path `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`. The grammar needs pruning to match the canonical contract §5 set + the new predicates added + the header updated to the contract path.

Finally, `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` references top-level `hard_preconds` / `soft_preconds` fields (lines 71-72, 151) — the post-contract SLT has nested `preconditions.hard | soft` (contract §4.4 lines 175-177). The parsability validator must be rewritten to consume the nested shape + the new predicate set + the new argument schemas.

## Assumption Reassessment (2026-05-13)

1. Validators-to-retire state verified: `tools/validators/src/rules/arc_schema_compliance.ts` (ARC_BLOCKS at lines 6-13), `effect_model_legality.ts` (EFFECT_TYPES at lines 6-15), `effect_model_replay_safety.ts`, `stop_policy_parsability.ts` (imports STOP_PREDICATES from `_shared/predicate-dsl-grammar.ts`), `choice_worthiness_completeness.ts` (STRONG_AXES at lines 6-14) — all exist as named.
2. Contract authority: `.claude/skills/_shared-templates/story-state-contract.md` §4.4 line 201 (post-SPEC23STOSTACON-001) explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, `effect_model`, `stop_policy` — the schema rebuild in SPEC23STOSTACON-002 drops them. Validators reading those fields have nothing to validate.
3. Cross-skill / cross-artifact boundary under audit: validators are consumed by the `world-validate` CLI surface (`tools/validators/package.json` bin entry); via the framework loader that aggregates `tools/validators/src/rules/*.ts` into the validator set. Retiring a validator means: (a) deleting the source file, (b) deleting its test file, (c) removing it from the framework's registry (if a registry exists — verify at implementation), (d) regenerating the `dist/` build output via `npm run build`.
4. FOUNDATIONS principles motivating this ticket: **Rule 1 (No Floating Facts)** — retired validators validate fields that are no longer in the schema; the validators are no-op surfaces costing CI time without enforcement value. **Rule 7 (Preserve Mystery Deliberately)** — the predicate-dsl-grammar prune must NOT weaken the MR firewall: `forbidden_mystery_resolution_risk` stop-predicate (line 102) must remain in the grammar; the new `affordance_available_to` predicate must not bypass mystery-grounding checks. Confirm at implementation that no MR-firewall-relevant predicate is dropped.
5. HARD-GATE / canon-write surface (menu item 5 per `tickets/_TEMPLATE.md`): the predicate DSL parsability validator is one of the SPEC-04 structural gates run by `world-validate`. Its rewrite touches the validator's parser. The MR firewall (Rule 7) lives partly in `forbidden_mystery_resolution_risk` predicate enforcement; that predicate must survive the prune. The rewrite must not silently weaken the firewall — every predicate that names a mystery / canon-safety surface (e.g., `forbidden_mystery_resolution_risk` if it stays in stop-policy) is retained.
6. Skill / tool / hook / validator field rename or removal (menu item 7): blast radius pipeline-wide: `grep -rnE "(arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness)" tools/ .claude/skills/ docs/ specs/` — verify at implementation. Likely matches inside the validator framework's registry, test indexes, and possibly `docs/MACHINE-FACING-LAYER.md` if that doc enumerates the validator surface. Update each match.
7. Adjacent contradictions classification: (a) Tests for the retired validators (`tools/validators/tests/rules/arc_schema_compliance.test.ts` and friends) are deleted alongside the validators — required consequence. (b) The predicate-dsl-grammar.ts file currently includes `STOP_PREDICATES` / `STOP_PREDICATE_ARG_SCHEMAS` consumed by `stop_policy_parsability.ts`. After retiring stop_policy_parsability, the question is whether STOP_PREDICATES has any other consumer. Grep at implementation; if none, drop them from the grammar; if any remain, retain them (the prune is targeted at PRED_TYPES, not all grammar exports). (c) The grammar's `FACT_MATCHES_PREDICATES`, `ENTITY_STATE_PROPERTIES`, `OBLIGATION_STATE_PROPERTIES`, etc. are consumed by `rule_storylet_predicate_dsl_parsability.ts` for predicate-argument-shape validation; after the parsability rewrite, those auxiliary exports may have new shapes or new contents — the rewrite owns those edits.

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
8. MR firewall preservation: `forbidden_mystery_resolution_risk` predicate (or its post-rewrite equivalent) remains a validated surface → grep: `grep -nE "forbidden_mystery_resolution|mystery_safety|M-resolution_safety" tools/validators/src/rules/` returns matches in at least one surviving validator.
9. Validator package builds + tests pass → `cd tools/validators && npm run build && npm test`.

## What to Change

### 1. Delete five retired validators + their tests

Delete the source files:
- `tools/validators/src/rules/arc_schema_compliance.ts`
- `tools/validators/src/rules/effect_model_legality.ts`
- `tools/validators/src/rules/effect_model_replay_safety.ts`
- `tools/validators/src/rules/stop_policy_parsability.ts`
- `tools/validators/src/rules/choice_worthiness_completeness.ts`

Delete their corresponding test files:
- `tools/validators/tests/rules/arc_schema_compliance.test.ts` (if exists)
- `tools/validators/tests/rules/effect_model_legality.test.ts`
- `tools/validators/tests/rules/effect_model_replay_safety.test.ts`
- `tools/validators/tests/rules/stop_policy_parsability.test.ts`
- `tools/validators/tests/rules/choice_worthiness_completeness.test.ts`

Verify each test path at implementation; if a test file does not exist for a given validator, skip its deletion.

### 2. Remove deleted validators from framework registry

The validator framework aggregates rule modules — exact mechanism is at `tools/validators/src/framework/` (verify at implementation). If a registry / index file enumerates the rules, remove the five entries. If the framework auto-discovers via glob, no registry edit is needed but verify the build cleanly excludes the deleted modules.

### 3. Prune `predicate-dsl-grammar.ts` PRED_TYPES + helpers

Update `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`:
- Replace PRED_TYPES at lines 4-26 with the canonical list per SPEC23STOSTACON-001's contract §5 audit. Likely contents (subject to audit confirmation):
  ```ts
  export const PRED_TYPES = [
    "fact_true",
    "belief",
    "entity_status",
    "relationship_axis",
    "obligation_open",
    "consequence_pending",
    "thread_active",
    "location",
    "has_affordance",
    "record_active",
    "intention_active",
    "object_accessible",
    "artifact_accessible",
    "affordance_available_to",
    "not",
    "all",
    "any"
  ] as const;
  ```
- Remove `FACT_MATCHES_PREDICATES`, `ENTITY_STATE_PROPERTIES`, `EPISTEMIC_CLASSES`, `OBLIGATION_STATE_PROPERTIES`, `OBLIGATION_STATUSES` IF they have no surviving consumer. RELATIONSHIP_AXES (lines 58-73) survives — referenced by archive/tickets/SPEC23STOSTACON-006.md's `axis` enum in story-relationship.schema.json.
- Determine STOP_PREDICATES fate: after `stop_policy_parsability.ts` is deleted, is STOP_PREDICATES still consumed? If yes, retain; if no, drop. Drop STOP_PREDICATE_ARG_SCHEMAS / NORMAL_EXIT_STOP_PREDICATES / INTERRUPT_BEFORE_STOP_PREDICATES alongside STOP_PREDICATES.
- Add argument-schema constants for the 5 new predicates following the STOP_PREDICATE_ARG_SCHEMAS pattern (or whatever shape `rule_storylet_predicate_dsl_parsability.ts` consumes after its rewrite):
  - `record_active`: argument 1 is a record-id matching the union pattern for STENT / STINT / SF / BEL / OBL / CNSQ / THR / SREL / STLOC / STOBJ / DA.
  - `intention_active`: argument 1 is `STINT-NNNN`.
  - `object_accessible`: arg 1 is `STENT-NNNN`, arg 2 is `STOBJ-NNNN`.
  - `artifact_accessible`: arg 1 is `STENT-NNNN`, arg 2 is `DA-NNNN`.
  - `affordance_available_to`: arg 1 is `STENT-NNNN`, arg 2 is one of the 20 `action_family` values.
- Update the file-header comment at lines 1-2: replace `// Structural constants derived from .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md.` with `// Structural constants derived from .claude/skills/_shared-templates/story-state-contract.md §5.`. Line 2 ("Keep this helper limited to closed runtime grammar...") can stay or be reworded.

### 4. Rewrite `rule_storylet_predicate_dsl_parsability.ts`

Update `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts`:
- Replace top-level field lookups (`parsed.hard_preconds` at line 71, `parsed.soft_preconds` at line 72, the `["preconditions", "hard_preconds", "soft_preconds"]` triad at line 151) with the nested-shape consumption: `parsed.preconditions?.hard` and `parsed.preconditions?.soft`.
- Add validator branches for the 5 new predicates' argument shapes (record-id class checks against contract's record-id patterns; action_family value check against the 20-value list from SPEC23STOSTACON-001 — re-define the 20-value list locally or import from a shared module; STENT-id pattern check).
- Remove validator branches for predicates that were pruned from PRED_TYPES in step 3.
- The validator name (`rule_storylet_predicate_dsl_parsability`) and CLI surface remain unchanged; the framework registry entry continues to dispatch to this file.

### 5. Update / write tests for the rewritten parsability validator

`tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` already exists (verified at SPEC23STOSTACON-001 Step 2). Update it:
- Drop test cases that exercise old top-level `hard_preconds` / `soft_preconds` shapes.
- Add test cases for nested `preconditions.hard` / `preconditions.soft` PASS / FAIL paths.
- Add test cases for each of the 5 new predicates: PASS with valid argument shapes; FAIL with malformed arguments (wrong record-id class, non-canonical action_family value).

### 6. Cross-pipeline audit: ensure no orphaned references

After deletions, grep pipeline-wide for any residual reference: `grep -rnE "(arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness)" tools/ .claude/skills/ docs/ specs/ tickets/ archive/` — expect matches only in archived specs / tickets / archive/. If a `docs/MACHINE-FACING-LAYER.md` or similar enumerates the active validator surface, update the doc to drop the retired entries.

## Files to Touch

- `tools/validators/src/rules/arc_schema_compliance.ts` (delete)
- `tools/validators/src/rules/effect_model_legality.ts` (delete)
- `tools/validators/src/rules/effect_model_replay_safety.ts` (delete)
- `tools/validators/src/rules/stop_policy_parsability.ts` (delete)
- `tools/validators/src/rules/choice_worthiness_completeness.ts` (delete)
- `tools/validators/tests/rules/<each>.test.ts` (delete, where the test file exists)
- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (modify — prune PRED_TYPES, add 5 new predicates' arg schemas, update file-header)
- `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` (modify — nested precondition consumption + new predicate arg validation)
- `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` (modify — new test coverage)
- Validator framework registry file if it exists (modify — exact path discovered at implementation)
- `docs/MACHINE-FACING-LAYER.md` (modify — drop retired validators from any validator-enumeration table; verify at implementation whether the doc lists these)

## Out of Scope

- Schema rebuild — archive/tickets/SPEC23STOSTACON-002.md (this ticket's dependency).
- Contract amendment + §5 predicate canonical list — `archive/tickets/SPEC23STOSTACON-001.md` (this ticket's dependency; provides the audited PRED_TYPES list).
- Skill prose updates for new predicate guidance — SPEC23STOSTACON-009.
- Adding new validators (e.g., move_family conformance, action_family conformance) — out of scope; the closed enums are enforced at the JSON Schema layer per archive/tickets/SPEC23STOSTACON-002.md.
- world-validate CLI surface changes beyond the validator-set update — the CLI auto-aggregates the validator set; no CLI code changes expected.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript builds clean; deleted validators don't leave dangling imports.
2. `cd tools/validators && npm test` — full validator test suite passes; retired validators' tests are gone; new parsability tests cover nested preconditions + 5 new predicates.
3. `grep -rnE "arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness" tools/validators/src tools/validators/tests` returns no matches.
4. `grep -nE "preconditions\\.(hard|soft)" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns ≥2 matches; `grep -E "hard_preconds|soft_preconds" tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` returns 0 matches.
5. `grep -cE "(record_active|intention_active|object_accessible|artifact_accessible|affordance_available_to)" tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` returns ≥5.

### Invariants

1. Every predicate name in the rebuilt `PRED_TYPES` constant matches an entry in the contract §5 closed table. The grammar and the contract are pin-aligned; drift between them is a structural validation failure (one of the SPEC-04 structural gates per FOUNDATIONS §SPEC-04).
2. MR firewall (Rule 7) is preserved: the validator pipeline still flags forbidden mystery resolution. The exact surface (which predicate / which validator) is named at implementation; the invariant is that the firewall is not silently weakened by this retirement.
3. The deleted validators have zero surviving consumers anywhere in `tools/validators/` (registry, tests, framework loaders).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_storylet_predicate_dsl_parsability.test.ts` — rewrite covers (a) nested `preconditions.hard | soft` parsing, (b) PASS for each of 5 new predicates with valid args, (c) FAIL for each new predicate with malformed args, (d) FAIL for predicates dropped from PRED_TYPES (e.g., if `epistemic` is dropped, ensure a record using `epistemic` predicate FAILs with a clear "unknown predicate" diagnostic), (e) MR firewall preservation case: a precondition citing a forbidden mystery surface is still flagged.
2. Delete: `tools/validators/tests/rules/arc_schema_compliance.test.ts`, `effect_model_legality.test.ts`, `effect_model_replay_safety.test.ts`, `stop_policy_parsability.test.ts`, `choice_worthiness_completeness.test.ts` (whichever exist).

### Commands

1. `cd tools/validators && npm run build && npm test` — full build + test pass.
2. Five deletions verified: `ls tools/validators/src/rules/{arc_schema_compliance,effect_model_legality,effect_model_replay_safety,stop_policy_parsability,choice_worthiness_completeness}.ts 2>&1 | grep -c "No such file"` returns 5.
3. `grep -rnE "(arc_schema_compliance|effect_model_legality|effect_model_replay_safety|stop_policy_parsability|choice_worthiness_completeness)" tools/validators/` returns no matches.
4. Predicate set verification: `node -e "const g = require('./tools/validators/dist/src/rules/_shared/predicate-dsl-grammar.js'); console.log(g.PRED_TYPES.length, g.PRED_TYPES.join(','));"` returns the audited canonical count and list.
