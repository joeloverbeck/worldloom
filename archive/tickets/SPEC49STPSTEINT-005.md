# SPEC49STPSTEINT-005: Add if/then constraints to story-plan.schema.json for current_step + belief_basis status-conditioning

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-plan.schema.json` and focused validators tests
**Deps**: None

## Problem

Two contract-vs-schema drifts in STPLAN's JSON schema, both surfaced by SPEC-49 §B.2 and §B.3:

**B.2 — `current_step` required unconditionally at intake**: before this ticket, `tools/validators/src/schemas/story-plan.schema.json` listed `current_step` in the unconditional `required` array. The shared contract says `current_step` is required ONLY when `plan_status` is in the active-lifecycle set (`active`, `blocked`, `suspended`, `revised`); terminal-status plans (`fulfilled`, `failed`, `abandoned`) may omit it. The schema's unconditional requirement created spurious validation failures for legitimate terminal-status records.

**B.3 — `belief_basis` allowed empty unconditionally at intake**: before this ticket, `tools/validators/src/schemas/story-plan.schema.json` declared `belief_basis` as an array of BEL references with `default: []` and no active-status `minItems` condition. The shared contract says non-empty when the plan is active. The schema's permissive empty-allowance let actively-claimed plans float without any belief grounding — a Rule 1 enforcement gap.

Both gaps share the same status-conditioned shape and the same fix mechanism (JSON Schema draft-07 `if/then`). Merge them into one ticket because they modify the same file with parallel constructs.

## Assumption Reassessment (2026-05-19)

1. At intake, `tools/validators/src/schemas/story-plan.schema.json` had `current_step` in the unconditional `required` array, and `belief_basis` was an array of `^BEL-[0-9]+$` items with `default: []` and no `minItems` constraint.
2. `.claude/skills/_shared-templates/story-record-schemas.md` confirms `belief_basis` as *"default []; non-empty when plan_status: active"* and `current_step` as *"composite; required when plan_status: active"*. The "active" status in both contract clauses is short for the active-lifecycle set `{active, blocked, suspended, revised}` per the SPEC-49 §A.3 + §B.2 status-set definition. Live line numbers have drifted from the draft, so closeout uses the exact contract text instead of brittle line references.
3. Cross-skill boundary under audit: `story-plan.schema.json` is the contract between STPLAN-emitting skills (`branching-story-bootstrap` Phase 4, `branching-story-turn-cycle` Phase 5) and the schema validator (AJV pre-apply gate). The schema is the authority; the contract markdown documents intent. The schema-vs-contract drift is the bug.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: an active plan without any belief grounding violates Rule 1 (the tactical claim floats free of the actor's belief state); a terminal-status plan required to have `current_step` violates the *intent* of Rule 1 (the field has no live meaning after closure, so requiring it is meaningless ceremony). Both fixes restore Rule 1 enforcement to match the contract.
5. Schema extension is narrowly conditional: an `allOf` clause with `if/then` is added to the schema; existing `required` array entries are unchanged except `current_step`, which moved out of the unconditional `required` list and into the active-lifecycle conditional branch. Existing active STPLAN records with non-empty `belief_basis` and `current_step` remain valid; terminal-status records that previously failed schema validation for missing `current_step` now pass; active records with empty `belief_basis` that previously passed now FAIL (the intended new behavior).

## Architecture Check

1. JSON Schema draft-07 `if/then` is the canonical mechanism for status-conditioned requirements. AJV 8.20.0 in `tools/validators/package.json` supports the construct natively without special configuration (verified during reassess-spec session — R-49-1 RESOLVED). Alternative approaches (move the check to a custom TypeScript validator) would scatter status-conditioning across two layers (schema for some fields, code for others), reducing maintainability.
2. No backwards-compatibility aliasing introduced. Live reassessment found no implemented per-STPLAN revision-marker downgrade path in `record_schema_compliance`; this ticket therefore keeps the schema gate fail-closed for active plans with empty `belief_basis`. Broader legacy-WARN migration handling remains outside this ticket's one-file schema boundary.

## Verification Layers

1. JSON schema validation: AJV 8.20.0 must apply the `if/then` clauses correctly — active-lifecycle plans require `current_step` (and non-empty `belief_basis`); terminal-status plans do not. Validator surface: AJV pre-apply gate, exercised via test fixtures.
2. Contract conformance: `story-plan.schema.json`'s status-conditioning matches the shared contract's *"when plan_status: active"* clauses for `belief_basis` and `current_step`. Validator surface: schema-vs-contract grep/manual review.
3. HARD-GATE discipline: active STPLAN records with empty `belief_basis` fail closed through schema compliance until a separate, explicit migration mechanism exists. Validator surface: `stplan_schema_compliance` rejection proof.

## Landed Changes

### 1. Restructured `tools/validators/src/schemas/story-plan.schema.json` required array

Removed `current_step` from the unconditional `required` array. The other required fields remain.

### 2. Added `allOf` block with status-conditioned `if/then` clause

After the existing top-level schema properties, added an `allOf` array that applies when `plan_status` is one of `active`, `blocked`, `suspended`, or `revised`:

```json
"allOf": [
  {
    "if": {
      "properties": {
        "plan_status": { "enum": ["active", "blocked", "suspended", "revised"] }
      }
    },
    "then": {
      "required": ["current_step"],
      "properties": {
        "belief_basis": { "minItems": 1 }
      }
    }
  }
]
```

The landed schema also repeats the strict-mode type/item shape for `belief_basis` and a local `$ref` for `current_step` inside the conditional branch so Ajv strict mode compiles the schema.

### 3. Migration-posture boundary

The drafted ticket claimed this slice could also deliver a legacy WARN downgrade for active STPLAN records with empty `belief_basis`. Live reassessment rejected that as out of scope for this ticket: `record_schema_compliance` is a fail-severity validator used by pre-apply/HARD-GATE paths, and the live compatibility-drift validator only classifies optional active-record map shape. This ticket lands the schema contract fail-closed. Any future legacy-WARN policy for empty active `belief_basis` must be implemented explicitly in a separate validator/reporting seam so it cannot silently weaken pre-apply validation.

## Files to Touch

- `tools/validators/src/schemas/story-plan.schema.json` (modify)
- `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` (modify)
- `tools/validators/tests/structural/stplan-schema-compliance.test.ts` (modify)

## Out of Scope

- Modifying `stplan-belief-basis-grounded.ts` or `record_schema_compliance` to add legacy severity downgrades.
- Adding `if/then` clauses for any STPLAN field other than `current_step` and `belief_basis`. Other status-conditioned fields are not in SPEC-49's scope.
- Modifying STEMO's schema for status-conditioning (STEMO's contract doesn't require parallel `if/then` constraints).
- Refactoring the schema's overall structure — only the `required` array adjustment + `allOf` block addition.

## Acceptance Criteria

### Tests That Must Pass

1. A STPLAN with `plan_status: active` and a populated `current_step` + non-empty `belief_basis: [BEL-1]` PASSES schema validation.
2. A STPLAN with `plan_status: fulfilled` (terminal) and no `current_step` field PASSES schema validation (previously FAILED before this fix).
3. A STPLAN with `plan_status: active` and no `current_step` FAILS schema validation with the `current_step` required-clause-violation error.
4. A STPLAN with `plan_status: active` and `belief_basis: []` (empty array) FAILS schema validation with the `belief_basis.minItems` error.
5. A STPLAN with `plan_status: fulfilled` and `belief_basis: []` PASSES schema validation (terminal-status plans may have empty belief_basis).
6. The structural schema-compliance validator reports active STPLAN records with empty `belief_basis` as `fail` until a separate migration mechanism is explicitly implemented.

### Invariants

1. The `current_step` and `belief_basis` requirements on STPLAN records are status-conditioned: active-lifecycle plans (`active|blocked|suspended|revised`) require both; terminal-status plans (`fulfilled|failed|abandoned`) require neither.
2. The schema's `if/then` constraints match the contract clauses for `belief_basis` and `current_step` in `story-record-schemas.md` — no drift between schema and contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/story-plan-schema-fixtures.test.ts` — extend the existing inline schema fixtures with active/terminal `current_step` and `belief_basis` PASS/FAIL cases.
2. `tools/validators/tests/structural/stplan-schema-compliance.test.ts` — extend the existing structural schema-compliance test with active fail-closed and terminal pass cases.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/structural/stplan-schema-compliance.test.js`
3. From repo root: `rg -n 'belief_basis|current_step' .claude/skills/_shared-templates/story-record-schemas.md tools/validators/src/schemas/story-plan.schema.json archive/tickets/SPEC49STPSTEINT-005.md`

## Outcome

Completed: 2026-05-19.

`tools/validators/src/schemas/story-plan.schema.json` now conditions STPLAN `current_step` and non-empty `belief_basis` on the active lifecycle statuses (`active`, `blocked`, `suspended`, `revised`). Terminal statuses (`fulfilled`, `failed`, `abandoned`) can omit `current_step` and can carry an empty `belief_basis`.

The existing schema fixture tests and structural `stplan_schema_compliance` tests now cover active pass, active missing-`current_step` fail, active empty-`belief_basis` fail, terminal missing-`current_step` pass, and terminal empty-`belief_basis` pass.

## Verification Result

- `npm run build` from `tools/validators` — passed.
- `node --test dist/tests/schemas/story-plan-schema-fixtures.test.js dist/tests/structural/stplan-schema-compliance.test.js` from `tools/validators` — passed, 11 tests.
- `npm test` from `tools/validators` — passed, 637 tests.
- `rg -n 'belief_basis|current_step' .claude/skills/_shared-templates/story-record-schemas.md tools/validators/src/schemas/story-plan.schema.json archive/tickets/SPEC49STPSTEINT-005.md` — confirmed the shared contract clauses and the landed schema/ticket closeout references.

## Deviations

- The draft legacy-marker WARN acceptance was removed from this ticket's active acceptance surface. Live reassessment found no implemented per-STPLAN revision-marker downgrade path in `record_schema_compliance`, and adding one would widen this one-file schema ticket into HARD-GATE-facing validation policy. The landed behavior is intentionally fail-closed for active STPLAN records with empty `belief_basis`.
- The drafted new YAML fixture files were not created. The existing inline schema fixture test and structural schema-compliance test already provide the focused proof surface without adding redundant fixture files.
