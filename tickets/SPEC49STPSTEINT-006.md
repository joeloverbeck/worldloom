# SPEC49STPSTEINT-006: Add stplan-predicate-references validator with DSL parse + record resolution

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/stplan-predicate-references.ts`, `tools/validators/src/structural/stplan-utils.ts` (modify — add helper), `tools/validators/src/public/registry.ts` (modify — register validator), new `tools/validators/tests/structural/stplan-predicate-references.test.ts`
**Deps**: None

## Problem

`tools/validators/src/schemas/story-plan.schema.json:133-140` defines the `predicateObject` schema as `{ pred: string, minLength: 1, additionalProperties: true }` — predicate objects are accepted as opaque maps with no DSL parseability check and no record-reference resolution. Two locations on STPLAN records use these predicate objects:

- `STPLAN.current_step.success_condition.predicates[]` — declares when the current tactical step is fulfilled
- `STPLAN.fallback_steps[].trigger_condition.predicates[]` — declares when each fallback path activates

A STPLAN authored with malformed predicates (e.g., `pred: "plan_active(STPLAN-999)"` where STPLAN-999 doesn't exist on the branch) survives schema validation today because no validator parses the DSL grammar or resolves named records. SPEC-49 §B.4 closes this opaque-predicate gap by adding a new structural validator that (1) parses each predicate against the closed DSL grammar at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, and (2) resolves named record IDs against the bundle's record set.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-plan.schema.json:133-140` confirmed via codebase grep — `predicateObject` is opaque per the schema. The DSL grammar lives at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (exports `PRED_TYPES`, `AFFECT_KINDS`, `RELATIONSHIP_AXES`, `BEHAVIORAL_PRESSURES`, `BELIEF_MODES`, `CONFIDENCE_LEVELS`, `EMOTION_INTENSITIES`, `ACTION_FAMILIES`). The SLT parsability validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` demonstrates the parse-and-validate pattern. The dormant helper `successConditionRecordIds()` at `tools/validators/src/structural/stplan-utils.ts:159` extracts record IDs from `current_step.success_condition` but is never called by any validator.
2. SPEC-49 §Approach §B.4 (per the reassess-spec-updated spec) cites the corrected predicate-parser location after the reassess-spec session resolved R-49-2 (the original spec referenced a non-existent `_helpers/predicate-parser.ts`; the correct surfaces are `rules/_shared/predicate-dsl-grammar.ts` for constants + `rule_storylet_predicate_dsl_parsability.ts` for the parse pattern).
3. Cross-skill boundary under audit: the new validator gates `create_stplan_record` patch-plan ops at engine pre-apply time. Predicate-DSL grammar is shared with SLT precondition validation (the closed grammar is the inter-skill contract); reusing the same grammar constants ensures STPLAN predicates stay in sync with SLT predicates as the grammar evolves. The validator registry at `tools/validators/src/public/registry.ts:41-55` is the dispatch surface (alphabetized imports + exports; new validator must be inserted in alphabetical position).
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: a predicate that names a non-existent record or that doesn't parse against the closed DSL grammar is a floating fact — the plan claims a condition without a checkable grounding. The new validator enforces the grounding contract. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: the new validator file lives at `tools/validators/src/structural/stplan-predicate-references.ts` — under the structural validators directory per the per-ticket-type granularity rule. The validator gates story-bundle record writes at engine pre-apply; the predicate-grammar check does not weaken the Mystery Reserve firewall (predicates over Mystery Reserve entries can still be authored, the validator only checks that they reference real records and parse against the canonical grammar).

## Architecture Check

1. Reusing the existing grammar constants from `rules/_shared/predicate-dsl-grammar.ts` and the parse pattern from `rule_storylet_predicate_dsl_parsability.ts` is the minimal-blast-radius approach. Alternative (writing a separate predicate parser for STPLAN) would duplicate grammar logic and risk drift between STPLAN and SLT predicate semantics — the closed grammar is meant to be one source of truth across both surfaces.
2. No backwards-compatibility aliasing introduced. Migration posture for legacy bundles containing STPLAN records with unparseable predicates (per SPEC-49 D-CX.1 distributed contract): WARN-mode rollout for one revision cycle, then FAIL. The WARN-vs-FAIL distinction is detected at the validator-error-reporting layer via the page's revision_marker (pre-SPEC-49 vs post-SPEC-49), matching the pattern used in tickets 001/003/005.
3. The new helper `fallbackTriggerRecordIds()` at `stplan-utils.ts` parallels the existing `successConditionRecordIds()` at line 159 — same shape, different field path. Wiring both into the new validator is the symmetric extension.

## Verification Layers

1. DSL parseability: each predicate string in `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]` parses against the closed grammar at `rules/_shared/predicate-dsl-grammar.ts`. Validator surface: unit tests against parseable + unparseable fixtures.
2. Record-reference resolution: each predicate that names a record ID (e.g., `plan_active(STPLAN-3)`, `belief_held(BEL-5, ...)`) resolves to an actual record in the bundle. Validator surface: integration tests against fixtures with resolvable + unresolvable IDs.
3. Validator registration: `tools/validators/src/public/registry.ts` imports and exports the new validator alongside the existing structural validators. Validator surface: codebase grep-proof on the import + export lines.

## What to Change

### 1. Create `tools/validators/src/structural/stplan-predicate-references.ts`

Implement a new structural validator `stplanPredicateReferences` paralleling the structure of `stplan-belief-basis-grounded.ts` (use `defineStplanValidator` from `stplan-utils.ts`). For each STPLAN record:

- Walk `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`.
- For each predicate:
  - Parse the `pred` string against the grammar constants imported from `rules/_shared/predicate-dsl-grammar.js` (`PRED_TYPES`, `RELATIONSHIP_AXES`, etc.). Reuse the parse logic pattern from `rule_storylet_predicate_dsl_parsability.ts`.
  - If unparseable, emit `stplan_predicate_references.predicate_unparseable` with the offending predicate and position.
  - If the predicate names a record ID (matches `^(STENT|STINT|SF|BEL|...|STPLAN|STEMO)-[0-9]+$`), resolve the ID against the bundle's record set via the maps passed into the validator.
  - If unresolvable, emit `stplan_predicate_references.predicate_record_unresolved` with the offending ID and position.

### 2. Extend `tools/validators/src/structural/stplan-utils.ts` with `fallbackTriggerRecordIds()` helper

Add a new helper paralleling the existing `successConditionRecordIds()` at line 159:

```typescript
export function fallbackTriggerRecordIds(plan: IndexedRecord): string[] {
  // Walk plan.fallback_steps[].trigger_condition.predicates[]
  // Extract record IDs from predicates that name records (e.g., "plan_active(STPLAN-3)")
  // Return the deduplicated list of IDs
}
```

Wire both `successConditionRecordIds` and `fallbackTriggerRecordIds` into the new validator's predicate-reference walk.

### 3. Register the validator at `tools/validators/src/public/registry.ts`

Insert the new validator's import and export alongside the existing STPLAN validators (alphabetical position):

```typescript
import { stplanPredicateReferences } from "../structural/stplan-predicate-references.js";
```

And add `stplanPredicateReferences` to the appropriate export list (the existing pattern in `registry.ts` lines 41-55 shows the convention).

### 4. D-CX.1 migration-posture handling

Per the SPEC-49 D-CX.1 distributed contract, this ticket carries the WARN-mode rollout for predicate parse failures during one revision cycle, then FAIL. The WARN-vs-FAIL determination is made at the validator-error-reporting layer based on the page's revision_marker.

## Files to Touch

- `tools/validators/src/structural/stplan-predicate-references.ts` (new)
- `tools/validators/src/structural/stplan-utils.ts` (modify — add `fallbackTriggerRecordIds` helper)
- `tools/validators/src/public/registry.ts` (modify — register the new validator)
- `tools/validators/tests/structural/stplan-predicate-references.test.ts` (new)

## Out of Scope

- Modifying the DSL grammar constants at `rules/_shared/predicate-dsl-grammar.ts`. The new validator consumes the grammar as-is.
- Modifying SLT's predicate-DSL parsability validator at `rules/rule_storylet_predicate_dsl_parsability.ts`. SLT predicates are validated separately by their own validator; STPLAN predicates by the new one.
- Adding predicate-reference validation to any STPLAN field other than `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`.
- Refactoring the existing `successConditionRecordIds()` helper at `stplan-utils.ts:159` beyond wiring it into the new validator.
- Adding predicate-reference validation to STEMO records (STEMO has no predicate-bearing fields in the current schema).

## Acceptance Criteria

### Tests That Must Pass

1. A STPLAN with parseable predicates in `current_step.success_condition` referencing only resolvable record IDs PASSES the new validator.
2. A STPLAN with an unparseable predicate (e.g., `pred: "INVALID_GRAMMAR"`) FAILS with `stplan_predicate_references.predicate_unparseable`.
3. A STPLAN with a parseable predicate referencing a nonexistent record ID (e.g., `pred: "plan_active(STPLAN-9999)"` where STPLAN-9999 doesn't exist on the branch) FAILS with `stplan_predicate_references.predicate_record_unresolved`.
4. A STPLAN with parseable predicates in `fallback_steps[0].trigger_condition` referencing only resolvable IDs PASSES.
5. A STPLAN with both an unparseable success-condition predicate AND an unresolvable fallback-trigger predicate FAILS with BOTH finding codes, not just one.
6. A legacy-marker bundle (pre-SPEC-49 revision_marker) containing a STPLAN with an unparseable predicate emits WARN (not FAIL) at the validator-error-reporting layer.

### Invariants

1. Every predicate in `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]` parses against the closed DSL grammar at `rules/_shared/predicate-dsl-grammar.ts` — no opaque predicates.
2. Every named record ID inside a predicate resolves to an actual record in the bundle — no dangling references.
3. STPLAN and SLT share the same DSL grammar source-of-truth — `rules/_shared/predicate-dsl-grammar.ts`. No grammar drift between the two predicate-bearing surfaces.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/stplan-predicates-parseable-resolvable.yaml` — PASS fixture.
2. `tools/validators/tests/fixtures/stplan-predicates-unparseable.yaml` — FAIL with predicate_unparseable.
3. `tools/validators/tests/fixtures/stplan-predicates-unresolvable-id.yaml` — FAIL with predicate_record_unresolved.
4. `tools/validators/tests/fixtures/stplan-predicates-fallback-unparseable.yaml` — FAIL with predicate_unparseable (fallback_steps path).
5. `tools/validators/tests/fixtures/stplan-predicates-both-failures.yaml` — FAIL with both codes.
6. `tools/validators/tests/fixtures/stplan-predicates-legacy-warn.yaml` — WARN at legacy-marker bundle.
7. `tools/validators/tests/structural/stplan-predicate-references.test.ts` (new) — 6 test cases consuming the fixtures above.
8. `tools/validators/tests/structural/registry.test.ts` (or equivalent registry test) — modify to assert `stplanPredicateReferences` is exported from `registry.ts`.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stplan-predicate-references.test.js`
3. Registry grep-proof: `grep -n "stplanPredicateReferences" tools/validators/src/public/registry.ts` should return 2 matches (import + export).
