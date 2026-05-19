# SPEC49STPSTEINT-006: Add stplan-predicate-references validator with DSL parse + record resolution

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `tools/validators/src/structural/stplan-predicate-references.ts`, `tools/validators/src/structural/stplan-utils.ts` (modify — add helper), `tools/validators/src/public/registry.ts` (modify — register validator), new `tools/validators/tests/structural/stplan-predicate-references.test.ts`, STPLAN test helpers and validator-count assertions updated.
**Deps**: None

## Problem

`tools/validators/src/schemas/story-plan.schema.json:133-140` defines the `predicateObject` schema as `{ pred: string, minLength: 1, additionalProperties: true }` — predicate objects are accepted as opaque maps with no DSL parseability check and no record-reference resolution. Two locations on STPLAN records use these predicate objects:

- `STPLAN.current_step.success_condition.predicates[]` — declares when the current tactical step is fulfilled
- `STPLAN.fallback_steps[].trigger_condition.predicates[]` — declares when each fallback path activates

Before this ticket, a STPLAN authored with malformed object-form predicates (for example `{ pred: "record_active", record: "STPLAN-999" }` where STPLAN-999 does not exist on the branch, or `{ pred: "not-a-predicate" }`) survived schema validation because no validator parsed the DSL grammar or resolved named records. SPEC-49 §B.4 closed this opaque-predicate gap by adding a new structural validator that (1) parses each predicate object against the closed DSL grammar at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, and (2) resolves named record IDs against the bundle's record set.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-plan.schema.json:133-140` confirmed via codebase grep — `predicateObject` is opaque per the schema. The live DSL is object-form, not function-call strings: predicate objects use `pred` plus named argument fields. The DSL grammar lives at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` (exports `PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`, `AFFECT_KINDS`, `RELATIONSHIP_AXES`, `BEHAVIORAL_PRESSURES`, `BELIEF_MODES`, `CONFIDENCE_LEVELS`, `EMOTION_INTENSITIES`, `ACTION_FAMILIES`). The SLT parsability validator at `tools/validators/src/rules/rule_storylet_predicate_dsl_parsability.ts` demonstrates the parse-and-validate pattern. The dormant helper `successConditionRecordIds()` at `tools/validators/src/structural/stplan-utils.ts:159` extracts record IDs from `current_step.success_condition` but is never called by any validator.
2. SPEC-49 §Approach §B.4 (per the reassess-spec-updated spec) cites the corrected predicate-parser location after the reassess-spec session resolved R-49-2 (the original spec referenced a non-existent `_helpers/predicate-parser.ts`; the correct surfaces are `rules/_shared/predicate-dsl-grammar.ts` for constants + `rule_storylet_predicate_dsl_parsability.ts` for the parse pattern). Live reassessment for this ticket corrected the drafted example shape from function-call strings to object-form predicate records.
3. Cross-skill boundary under audit: the new validator gates `create_stplan_record` patch-plan ops at engine pre-apply time. Predicate-DSL grammar is shared with SLT precondition validation (the closed grammar is the inter-skill contract); reusing the same grammar constants ensures STPLAN predicates stay in sync with SLT predicates as the grammar evolves. The validator registry at `tools/validators/src/public/registry.ts:41-55` is the dispatch surface (alphabetized imports + exports; new validator must be inserted in alphabetical position).
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: a predicate that names a non-existent record or that doesn't parse against the closed DSL grammar is a floating fact — the plan claims a condition without a checkable grounding. The new validator enforces the grounding contract. SPEC-49 §FOUNDATIONS Alignment confirms this Rule 1 alignment.
5. Canon Safety surface touched: the new validator file lives at `tools/validators/src/structural/stplan-predicate-references.ts` — under the structural validators directory per the per-ticket-type granularity rule. The validator gates story-bundle record writes at engine pre-apply; the predicate-grammar check does not weaken the Mystery Reserve firewall (predicates over Mystery Reserve entries can still be authored, the validator only checks that they reference real records and parse against the canonical grammar).

## Architecture Check

1. Reusing the existing grammar constants from `rules/_shared/predicate-dsl-grammar.ts` and the parse pattern from `rule_storylet_predicate_dsl_parsability.ts` is the minimal-blast-radius approach. Alternative (writing a separate predicate parser for STPLAN) would duplicate grammar logic and risk drift between STPLAN and SLT predicate semantics — the closed grammar is meant to be one source of truth across both surfaces.
2. No backwards-compatibility aliasing introduced. This structural validator is fail-closed in the live validator framework. The WARN-vs-FAIL migration posture named by SPEC-49 D-CX.1 remains a validator-runner/reporting-layer concern outside this ticket's structural validator file.
3. The new helper `fallbackTriggerRecordIds()` at `stplan-utils.ts` parallels the existing `successConditionRecordIds()` — same shape, different field path. Both helpers are wired into the new validator's record-resolution pass.

## Verification Layers

1. DSL parseability: each predicate object in `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]` parses against the closed grammar at `rules/_shared/predicate-dsl-grammar.ts`. Validator surface: `tools/validators/tests/structural/stplan-predicate-references.test.ts`.
2. Record-reference resolution: each predicate object that names a record ID (for example `{ pred: "record_active", record: "STPLAN-3" }`) resolves to an actual record in the bundle. Validator surface: `tools/validators/tests/structural/stplan-predicate-references.test.ts`.
3. Validator registration: `tools/validators/src/public/registry.ts` imports and registers the new validator alongside the existing structural validators. Validator surface: registry test plus grep-proof on the import and array entries.

## Landed Changes

### 1. Create `tools/validators/src/structural/stplan-predicate-references.ts`

Implemented a new structural validator `stplanPredicateReferences` paralleling the structure of `stplan-belief-basis-grounded.ts` (using `defineStplanValidator` from `stplan-utils.ts`). For each STPLAN record, it:

- Walk `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`.
- For each predicate:
  - Parse the predicate object against the grammar constants imported from `rules/_shared/predicate-dsl-grammar.js` (`PRED_TYPES`, `PREDICATE_ARG_SCHEMAS`, `RELATIONSHIP_AXES`, etc.). Reuse the parse logic pattern from `rule_storylet_predicate_dsl_parsability.ts`.
  - If unparseable, emit `stplan_predicate_references.predicate_unparseable` with the offending predicate and position.
  - If the predicate names a record ID in any argument field (matches `^(STENT|STINT|SF|BEL|...|STPLAN|STEMO)-[0-9]+$`), resolve the ID against the bundle's record set via the maps passed into the validator.
  - If unresolvable, emit `stplan_predicate_references.predicate_record_unresolved` with the offending ID and position.

### 2. Extend `tools/validators/src/structural/stplan-utils.ts` with `fallbackTriggerRecordIds()` helper

Added a new helper paralleling the existing `successConditionRecordIds()`:

```typescript
export function fallbackTriggerRecordIds(plan: IndexedRecord): string[] {
  // Walk plan.fallback_steps[].trigger_condition.predicates[]
  // Extract record IDs from predicate argument fields (e.g., { pred: "record_active", record: "STPLAN-3" })
  // Return the deduplicated list of IDs
}
```

Both `successConditionRecordIds` and `fallbackTriggerRecordIds` are wired into the new validator's predicate-reference walk.

### 3. Register the validator at `tools/validators/src/public/registry.ts`

Inserted the new validator's import and registry entry alongside the existing STPLAN validators:

```typescript
import { stplanPredicateReferences } from "../structural/stplan-predicate-references.js";
```

The registry test now asserts the new `stplan_predicate_references` validator name, and STPLAN validator-count assertions now expect 13 validators.

### 4. D-CX.1 migration-posture handling

The live structural validator emits fail verdicts. Per SPEC-49 D-CX.1, WARN-mode rollout remains a validator-runner/reporting-layer concern outside this file-level structural validator ticket.

## Files to Touch

- `tools/validators/src/structural/stplan-predicate-references.ts` (new)
- `tools/validators/src/structural/stplan-utils.ts` (modify — add `fallbackTriggerRecordIds` helper)
- `tools/validators/src/public/registry.ts` (modify — register the new validator)
- `tools/validators/tests/structural/stplan-predicate-references.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — assert registry order includes the new validator)
- `tools/validators/tests/structural/stplan-helpers.ts` (modify — align default `record_active` predicate fixture with the live `record` argument)
- `tools/validators/tests/integration/stplan-full-validation.test.ts` (modify — STPLAN validator count 13)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural/total validator counts 73/85)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — STPLAN pre-apply execution count 13)
- `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` (modify — STPLAN validator count 13)

## Out of Scope

- Modifying the DSL grammar constants at `rules/_shared/predicate-dsl-grammar.ts`. The new validator consumes the grammar as-is.
- Modifying SLT's predicate-DSL parsability validator at `rules/rule_storylet_predicate_dsl_parsability.ts`. SLT predicates are validated separately by their own validator; STPLAN predicates by the new one.
- Adding predicate-reference validation to any STPLAN field other than `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`.
- Refactoring the existing `successConditionRecordIds()` helper at `stplan-utils.ts:159` beyond wiring it into the new validator.
- Adding predicate-reference validation to STEMO records (STEMO has no predicate-bearing fields in the current schema).

## Acceptance Criteria

### Tests That Must Pass

1. A STPLAN with parseable predicates in `current_step.success_condition` referencing only resolvable record IDs PASSES the new validator.
2. A STPLAN with an unparseable predicate object (for example `{ pred: "INVALID_GRAMMAR" }`) FAILS with `stplan_predicate_references.predicate_unparseable`.
3. A STPLAN with a parseable predicate object referencing a nonexistent record ID (for example `{ pred: "record_active", record: "STPLAN-9999" }` where STPLAN-9999 does not exist on the branch) FAILS with `stplan_predicate_references.predicate_record_unresolved`.
4. A STPLAN with parseable predicates in `fallback_steps[0].trigger_condition` referencing only resolvable IDs PASSES.
5. A STPLAN with both an unparseable success-condition predicate AND an unresolvable fallback-trigger predicate FAILS with BOTH finding codes, not just one.
6. Legacy WARN-mode migration remains a validator-runner/reporting-layer concern outside this structural validator file; this ticket proves the new validator fail-closed behavior on the live object-form DSL.

### Invariants

1. Every predicate in `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]` parses against the closed DSL grammar at `rules/_shared/predicate-dsl-grammar.ts` — no opaque predicates.
2. Every named record ID inside a predicate resolves to an actual record in the bundle — no dangling references.
3. STPLAN and SLT share the same DSL grammar source-of-truth — `rules/_shared/predicate-dsl-grammar.ts`. No grammar drift between the two predicate-bearing surfaces.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/stplan-predicate-references.test.ts` (new) — inline representative records covering parseable/resolvable predicates, unparseable predicates, unresolvable IDs, fallback-trigger predicates, and combined failure reporting.
2. `tools/validators/tests/structural/registry.test.ts` — modify to assert `stplan_predicate_references` is registered in `registry.ts`.
3. `tools/validators/tests/integration/stplan-full-validation.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and `tools/validators/tests/integration/spec47-stplan-stemo-integration.test.ts` — update STPLAN validator-count assertions from 12 to 13.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stplan-predicate-references.test.js`
3. Registry grep-proof: `grep -n "stplanPredicateReferences" tools/validators/src/public/registry.ts` should return 2 matches (import + export).

## Outcome

Completed 2026-05-19.

Implemented `stplan_predicate_references` as a registered STPLAN structural validator. The validator walks `current_step.success_condition.predicates[]` and `fallback_steps[].trigger_condition.predicates[]`, checks object-form predicate records against the shared predicate grammar constants, and fails unresolved record IDs found through the existing success-condition extractor plus the new `fallbackTriggerRecordIds()` helper.

The landing also updated registry/count tests and corrected the shared STPLAN test helper's default `record_active` predicate argument from the stale `id` field to the live `record` field.

## Verification Result

- `npm run build --prefix tools/validators` — passed.
- `node --test tools/validators/dist/tests/structural/stplan-predicate-references.test.js` from repo root — passed, 5/5 tests.
- `node --test tools/validators/dist/tests/structural/registry.test.js` from repo root — passed.
- `node --test tools/validators/dist/tests/integration/stplan-full-validation.test.js` from repo root — passed.
- Package-cwd count-sensitive reruns passed:
  - `cd tools/validators && node --test dist/tests/integration/spec04-verification.test.js`
  - `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js`
  - `cd tools/validators && node --test dist/tests/integration/spec47-stplan-stemo-integration.test.js`
- `npm test --prefix tools/validators` — passed, 642/642 tests.

## Deviations

- The drafted examples used function-call-like predicate strings. Live reassessment proved the DSL is object-form, so implementation and tests use object predicate records such as `{ pred: "record_active", record: "STPLAN-9999" }`.
- The drafted fixture files were not created. Existing validator tests in this package use inline representative records for this seam, so the new structural test follows that local pattern.
- Legacy WARN-mode migration was not implemented in this structural validator. The live structural validator fails closed; warning/reporting migration remains outside this ticket at the validator-runner/reporting layer.
- Direct compiled integration test runs for `spec04-verification`, `validate-patch-plan`, and `spec47-stplan-stemo-integration` failed from repo root because those compiled tests derive fixture/source paths from `process.cwd()`. The same files passed from the `tools/validators` package cwd, and the full `npm test --prefix tools/validators` lane passed.
