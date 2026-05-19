# SPEC49STPSTEINT-005: Add if/then constraints to story-plan.schema.json for current_step + belief_basis status-conditioning

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/schemas/story-plan.schema.json` (modify)
**Deps**: None

## Problem

Two contract-vs-schema drifts in STPLAN's JSON schema, both surfaced by SPEC-49 §B.2 and §B.3:

**B.2 — `current_step` required unconditionally**: `tools/validators/src/schemas/story-plan.schema.json:5-16` lists `current_step` in the unconditional `required` array. The shared contract (`.claude/skills/_shared-templates/story-record-schemas.md:786`) says `current_step` is required ONLY when `plan_status` is in the active-lifecycle set (`active`, `blocked`, `suspended`, `revised`); terminal-status plans (`fulfilled`, `failed`, `abandoned`) may omit it. The schema's unconditional requirement creates spurious validation failures for legitimate terminal-status records.

**B.3 — `belief_basis` allowed empty unconditionally**: `tools/validators/src/schemas/story-plan.schema.json:31-35` declares `belief_basis` as an array of BEL references with `default: []`. The shared contract says non-empty when the plan is active. The schema's permissive empty-allowance lets actively-claimed plans float without any belief grounding — a Rule 1 enforcement gap.

Both gaps share the same status-conditioned shape and the same fix mechanism (JSON Schema draft-07 `if/then`). Merge them into one ticket because they modify the same file with parallel constructs.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-plan.schema.json:5-16` confirmed via codebase grep — `current_step` is at position 10 in the unconditional `required` array. Lines 31-35 confirmed — `belief_basis` declared as array of `^BEL-[0-9]+$` items with `default: []` and no `minItems` constraint. Verified during reassess-spec session.
2. `.claude/skills/_shared-templates/story-record-schemas.md:786` confirms `current_step` contract: *"composite; required when plan_status: active"*. Line 777 confirms `belief_basis` contract: *"default []; non-empty when plan_status: active"*. The "active" status in both contract clauses is short for the active-lifecycle set `{active, blocked, suspended, revised}` per the SPEC-49 §A.3 + §B.2 status-set definition.
3. Cross-skill boundary under audit: `story-plan.schema.json` is the contract between STPLAN-emitting skills (`branching-story-bootstrap` Phase 4, `branching-story-turn-cycle` Phase 5) and the schema validator (AJV pre-apply gate). The schema is the authority; the contract markdown documents intent. The schema-vs-contract drift is the bug.
4. FOUNDATIONS §Story Bundles §5 Rule 1 No Floating Facts: an active plan without any belief grounding violates Rule 1 (the tactical claim floats free of the actor's belief state); a terminal-status plan required to have `current_step` violates the *intent* of Rule 1 (the field has no live meaning after closure, so requiring it is meaningless ceremony). Both fixes restore Rule 1 enforcement to match the contract.
5. Schema extension is purely additive: `allOf` clauses with `if/then` are added to the schema; existing `required` array entries are unchanged except `current_step` which moves OUT of the unconditional `required` and INTO a conditional `if/then` clause. Existing active STPLAN records with non-empty `belief_basis` and `current_step` remain valid; terminal-status records that previously failed schema validation for missing `current_step` now pass; active records with empty `belief_basis` that previously passed now FAIL (the intended new behavior).

## Architecture Check

1. JSON Schema draft-07 `if/then` is the canonical mechanism for status-conditioned requirements. AJV 8.20.0 in `tools/validators/package.json` supports the construct natively without special configuration (verified during reassess-spec session — R-49-1 RESOLVED). Alternative approaches (move the check to a custom TypeScript validator) would scatter status-conditioning across two layers (schema for some fields, code for others), reducing maintainability.
2. No backwards-compatibility aliasing introduced. Migration posture for legacy bundles containing active STPLAN records with empty `belief_basis` (per SPEC-49 D-CX.1 distributed contract): compatibility-mode WARN for pre-SPEC-49 bundles, FAIL for current-contract bundles. Health-audit's `bootstrap-drift` Phase 2k check (existing) can identify legacy records needing repair.

## Verification Layers

1. JSON schema validation: AJV 8.20.0 must apply the `if/then` clauses correctly — active-lifecycle plans require `current_step` (and non-empty `belief_basis`); terminal-status plans do not. Validator surface: AJV pre-apply gate, exercised via test fixtures.
2. Contract conformance: `story-plan.schema.json`'s status-conditioning matches the shared contract's *"when plan_status: active"* clauses at `story-record-schemas.md:777` (belief_basis) and `:786` (current_step). Validator surface: schema-vs-contract grep at health-audit time.
3. Legacy-compatibility behavior: pre-SPEC-49 bundles with empty `belief_basis` on active plans emit WARN, not FAIL. Validator surface: integration-test fixture with legacy revision_marker.

## What to Change

### 1. Restructure `tools/validators/src/schemas/story-plan.schema.json` required array

Remove `current_step` from the unconditional `required` array at lines 5-16. The 9 other required fields remain.

### 2. Add `allOf` block with two `if/then` clauses

After the existing top-level schema properties, add an `allOf` array containing two clauses:

```json
"allOf": [
  {
    "if": {
      "properties": {
        "plan_status": { "enum": ["active", "blocked", "suspended", "revised"] }
      }
    },
    "then": {
      "required": ["current_step"]
    }
  },
  {
    "if": {
      "properties": {
        "plan_status": { "enum": ["active", "blocked", "suspended", "revised"] }
      }
    },
    "then": {
      "properties": {
        "belief_basis": { "minItems": 1 }
      }
    }
  }
]
```

The two clauses may be consolidated into a single `if/then` with both `required` and `properties.belief_basis.minItems` in the `then` branch — equivalent semantically. Choose the form that matches the schema's surrounding style.

### 3. D-CX.1 migration-posture handling

Per the SPEC-49 D-CX.1 distributed contract, this ticket carries the WARN-then-FAIL discipline for the `belief_basis` empty-on-active gap (B.3). The schema change alone would FAIL all legacy bundles immediately; the migration posture downgrades pre-SPEC-49 bundles to WARN via a validator-side compatibility check. The existing `stplan-belief-basis-grounded.ts` validator (which checks accessibility — not modified by this ticket) can be the surface where the legacy-vs-current-contract distinction is detected and the severity adjusted. The schema's `minItems: 1` enforcement fires unconditionally; the WARN-mode downgrade happens at the validator-error-reporting layer, not at the schema level.

## Files to Touch

- `tools/validators/src/schemas/story-plan.schema.json` (modify)

## Out of Scope

- Modifying `stplan-belief-basis-grounded.ts` validator logic beyond the migration-posture severity downgrade. The accessibility check remains unchanged.
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
6. A legacy-marker bundle (pre-SPEC-49 revision_marker) containing an active STPLAN with empty `belief_basis` emits a WARN (not FAIL) at the validator-error-reporting layer.

### Invariants

1. The `current_step` and `belief_basis` requirements on STPLAN records are status-conditioned: active-lifecycle plans (`active|blocked|suspended|revised`) require both; terminal-status plans (`fulfilled|failed|abandoned`) require neither.
2. The schema's `if/then` constraints match the contract clauses at `story-record-schemas.md:777` (belief_basis) and `:786` (current_step) verbatim — no drift between schema and contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/fixtures/stplan-active-with-current-step-and-belief-basis.yaml` — new fixture (PASS case for active-lifecycle status with full fields).
2. `tools/validators/tests/fixtures/stplan-fulfilled-without-current-step.yaml` — new fixture (PASS case for terminal-status without current_step).
3. `tools/validators/tests/fixtures/stplan-active-without-current-step.yaml` — new fixture (FAIL case for active without current_step).
4. `tools/validators/tests/fixtures/stplan-active-with-empty-belief-basis.yaml` — new fixture (FAIL case for active with empty belief_basis).
5. `tools/validators/tests/fixtures/stplan-fulfilled-with-empty-belief-basis.yaml` — new fixture (PASS case for terminal with empty belief_basis).
6. `tools/validators/tests/structural/stplan-schema-compliance.test.ts` (or equivalent STPLAN schema test) — modify to add the 5 new test cases above. The FAIL cases are the critical regression-prevention tests for the schema's new conditional enforcement.

### Commands

1. `npm test --prefix tools/validators` (full validator suite)
2. Targeted: `npm run build --prefix tools/validators && node --test tools/validators/dist/tests/structural/stplan-schema-compliance.test.js`
3. Schema-vs-contract grep: `grep -n "current_step" .claude/skills/_shared-templates/story-record-schemas.md` should show line 786 with the *"required when plan_status: active"* clause; `grep -n "belief_basis" .claude/skills/_shared-templates/story-record-schemas.md` should show line 777 with the *"non-empty when plan_status: active"* clause. The schema's `if/then` clauses must match these contract clauses verbatim.
