# SPEC79CHCREM-010: Drop `associated_commitment_block` from 4 remaining test fixtures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — four test fixtures: `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`, `tools/validators/tests/structural/stchar-structural-validators.test.ts`, `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`, `tools/validators/tests/integration/spec34-integration.test.ts`.
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

Four test files include CHC fixtures carrying `associated_commitment_block` as a fixture key — used as placeholder data that satisfies the pre-removal schema's required-array, not exercised by any behavioral logic in the tests themselves. Once SPEC79CHCREM-001 drops the field from the schema, every CHC fixture that still carries the field will fail schema validation with the `additionalProperties: false` error. These four fixtures must drop the key to remain schema-conformant.

The other test files that carry the field are handled by sibling tickets: schema-shape assertions (001), validator regression (002), rule fixture (003), and world-index parser tests (004). This ticket covers the remaining four fixture-key drops where the field's value is irrelevant to the test's behavioral assertions.

## Assumption Reassessment (2026-05-24)

1. Confirmed the four test files reference `associated_commitment_block`:
   - `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts:306` — `associated_commitment_block: null,`
   - `tools/validators/tests/structural/stchar-structural-validators.test.ts:236` — `associated_commitment_block: null,`
   - `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts:150` — `associated_commitment_block: "SLT-1",`
   - `tools/validators/tests/integration/spec34-integration.test.ts:412` — `associated_commitment_block: "SLT-1",`
   Verified via grep + reassessment session enumeration.
2. Confirmed SPEC-79 §6.3 prescribes these as fixture-key drops where no behavioral logic depends on the field's value. The tests use the field as placeholder data that satisfied the pre-removal schema's required-array; once the field is removed from required[], the placeholder can be dropped without affecting the tests' behavioral assertions.
3. Cross-skill boundary: these fixtures exercise different validators (rule_chc_grounded_in_artifact_accessible, stchar-structural-validators, spec49 STPLAN/STEMO hardening, spec34 integration). None of these validators read `associated_commitment_block` per the SPEC-79 reassessment's exhaustive consumer grep — only `chc_slt_selected_commitment_trace` (002) and `rule_choice_set_noncollapse` (003) do, and both are handled in their own tickets. The Deps on 001 enforces ordering: the schema rejection at 001 is the upstream trigger that requires the fixture-key drops here.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): these fixtures' behavioral assertions are not weakened by dropping the field; the field was placeholder data only, not a test discriminator. Each test's actual assertions (STPLAN/STEMO hardening, STCHAR structural integrity, choice-grounding artifact accessibility, integration coverage) remain intact.
5. Removal blast radius (was template item 7): this ticket drops one key from each of four fixture files. The tests' other CHC fields, surrounding test logic, and assertions remain unchanged.

## Architecture Check

1. Dropping the placeholder key is the minimal-diff approach — the tests' behavioral logic is unaffected; only the fixture's field set changes. No new abstraction is introduced.
2. No backwards-compatibility aliasing/shims introduced. The tests directly exercise the post-removal schema shape; no migration path is preserved.

## Verification Layers

1. The four fixture files no longer carry `associated_commitment_block` keys → codebase grep-proof: `grep -n "associated_commitment_block" tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.
2. All four test files pass after the fixture-key drops → schema validation: `cd tools/validators && npm test` runs to completion with zero new failures across these tests.
3. The tests' behavioral assertions remain intact → manual review of each test's actual assertions (STPLAN/STEMO hardening logic, STCHAR structural integrity check, choice-grounding artifact accessibility check, spec34 integration coverage).

## What to Change

### 1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`

- At line 306, drop the `associated_commitment_block: null,` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (STPLAN/STEMO hardening assertions) remain unchanged.

### 2. `tools/validators/tests/structural/stchar-structural-validators.test.ts`

- At line 236, drop the `associated_commitment_block: null,` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (STCHAR structural validators) remain unchanged.

### 3. `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`

- At line 150, drop the `associated_commitment_block: "SLT-1",` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (choice-grounding artifact accessibility check) remain unchanged.

### 4. `tools/validators/tests/integration/spec34-integration.test.ts`

- At line 412, drop the `associated_commitment_block: "SLT-1",` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (spec34 integration coverage) remain unchanged.

## Files to Touch

- `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` (modify)
- `tools/validators/tests/structural/stchar-structural-validators.test.ts` (modify)
- `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The validator rewrites (handled in 002, 003).
- World-index changes (handled in 004).
- Skill-side documentation updates (handled in 005, 006, 007).
- Docs update (handled in 008).
- The Red Kiln Ambush fixture (handled in 009 — that fixture has a more complex repair pattern).
- Other test files that the SPEC-79 reassessment identified as having complex repair patterns (schema-shape assertions at 001; validator regression at 002; rule fixture at 003; world-index parser tests at 004).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` runs to completion with zero new failures.
2. `cd tools/validators && npm test -- --test-name-pattern='spec49-stplan-stemo-hardening'` passes.
3. `cd tools/validators && npm test -- --test-name-pattern='stchar-structural-validators'` passes.
4. `cd tools/validators && npm test -- --test-name-pattern='rule_chc_grounded_in_artifact_accessible'` passes.
5. `cd tools/validators && npm test -- --test-name-pattern='spec34-integration'` passes.
6. `grep -n "associated_commitment_block" tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.

### Invariants

1. All four test files pass after the fixture-key drops — the behavioral assertions in each test remain intact.
2. No production code is touched by this ticket; the changes are confined to test fixtures.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` — fixture at line 306 drops the key.
2. `tools/validators/tests/structural/stchar-structural-validators.test.ts` — fixture at line 236 drops the key.
3. `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` — fixture at line 150 drops the key.
4. `tools/validators/tests/integration/spec34-integration.test.ts` — fixture at line 412 drops the key.

### Commands

1. `cd tools/validators && npm test`
2. `grep -nE "associated_commitment_block" tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.
