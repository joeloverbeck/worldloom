# SPEC79CHCREM-010: Drop `associated_commitment_block` from 4 remaining test fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — four test fixtures: `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`, `tools/validators/tests/structural/stchar-structural-validators.test.ts`, `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`, `tools/validators/tests/integration/spec34-integration.test.ts`.
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

At intake, four test files included CHC fixtures carrying `associated_commitment_block` as a placeholder fixture key. The field was not exercised by these tests' behavioral assertions. After SPEC79CHCREM-001 dropped the field from the schema, those placeholder keys had to be removed so the fixtures remained schema-conformant.

The other test files that carried the field at intake were handled by sibling tickets: schema-shape assertions (001), validator regression (002), rule fixture (003), and world-index parser tests (004). This ticket covers the remaining four fixture-key drops where the field's value was irrelevant to the test's behavioral assertions.

## Assumption Reassessment (2026-05-24)

1. Historical intake grep confirmed the four test files referenced `associated_commitment_block`:
   - `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` — `associated_commitment_block: null,`
   - `tools/validators/tests/structural/stchar-structural-validators.test.ts` — `associated_commitment_block: null,`
   - `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` — `associated_commitment_block: "SLT-1",`
   - `tools/validators/tests/integration/spec34-integration.test.ts` — `associated_commitment_block: "SLT-1",`
   The final focused grep over these four files returns zero matches.
2. Confirmed SPEC-79 §6.3 prescribes these as fixture-key drops where no behavioral logic depends on the field's value. The tests use the field as placeholder data that satisfied the pre-removal schema's required-array; once the field is removed from required[], the placeholder can be dropped without affecting the tests' behavioral assertions.
3. Cross-skill boundary: these fixtures exercise different validators (rule_chc_grounded_in_artifact_accessible, stchar-structural-validators, spec49 STPLAN/STEMO hardening, spec34 integration). None of these validators read `associated_commitment_block` per the SPEC-79 reassessment's exhaustive consumer grep — only `chc_slt_selected_commitment_trace` (002) and `rule_choice_set_noncollapse` (003) do, and both are handled in their own tickets. The Deps on 001 enforces ordering: the schema rejection at 001 is the upstream trigger that requires the fixture-key drops here.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): these fixtures' behavioral assertions are not weakened by dropping the field; the field was placeholder data only, not a test discriminator. Each test's actual assertions (STPLAN/STEMO hardening, STCHAR structural integrity, choice-grounding artifact accessibility, integration coverage) remain intact.
5. Removal blast radius (was template item 7): this ticket drops one key from each of four fixture files. The tests' other CHC fields, surrounding test logic, and assertions remain unchanged.

## Architecture Check

1. Dropping the placeholder key is the minimal-diff approach — the tests' behavioral logic is unaffected; only the fixture's field set changes. No new abstraction is introduced.
2. No backwards-compatibility aliasing/shims introduced. The tests directly exercise the post-removal schema shape; no migration path is preserved.

## Verification Layers

1. The four fixture files no longer carry `associated_commitment_block` keys → codebase grep-proof: `rg -n 'associated_commitment_block' tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.
2. All four test files pass after the fixture-key drops → schema validation: the four compiled test files named in `## Verification Result` pass after `cd tools/validators && npm test` rebuilds `dist/`.
3. The tests' behavioral assertions remain intact → manual review of each test's actual assertions (STPLAN/STEMO hardening logic, STCHAR structural integrity check, choice-grounding artifact accessibility check, spec34 integration coverage).

## Landed Changes

### 1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`

- Dropped the `associated_commitment_block: null,` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (STPLAN/STEMO hardening assertions) remain unchanged.

### 2. `tools/validators/tests/structural/stchar-structural-validators.test.ts`

- Dropped the `associated_commitment_block: null,` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (STCHAR structural validators) remain unchanged.

### 3. `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`

- Dropped the `associated_commitment_block: "SLT-1",` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (choice-grounding artifact accessibility check) remain unchanged.

### 4. `tools/validators/tests/integration/spec34-integration.test.ts`

- Dropped the `associated_commitment_block: "SLT-1",` key from the CHC test fixture. The surrounding CHC fields and the rest of the test (spec34 integration coverage) remain unchanged.

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
- The Red Kiln Ambush fixture (handled in archive/tickets/SPEC79CHCREM-009.md — that fixture has a more complex repair pattern).
- Other test files that the SPEC-79 reassessment identified as having complex repair patterns (schema-shape assertions at 001; validator regression at 002; rule fixture at 003; world-index parser tests at 004).

## Acceptance Criteria

### Tests That Must Pass

1. `node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js` passes after `npm test` rebuilds `dist/`.
2. `node --test dist/tests/structural/stchar-structural-validators.test.js` passes after `npm test` rebuilds `dist/`.
3. `node --test dist/tests/rules/rule_chc_grounded_in_artifact_accessible.test.js` passes after `npm test` rebuilds `dist/`.
4. `node --test dist/tests/integration/spec34-integration.test.js` passes after `npm test` rebuilds `dist/`.
5. `rg -n 'associated_commitment_block' tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.

### Invariants

1. All four test files pass after the fixture-key drops — the behavioral assertions in each test remain intact.
2. No production code is touched by this ticket; the changes are confined to test fixtures.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts` — fixture drops the key.
2. `tools/validators/tests/structural/stchar-structural-validators.test.ts` — fixture drops the key.
3. `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts` — fixture drops the key.
4. `tools/validators/tests/integration/spec34-integration.test.ts` — fixture drops the key.

### Commands

1. `cd tools/validators && npm test` — rebuilds `dist/`; broad lane currently fails on the unrelated SPEC-47 world-index edge-count assertion recorded in `## Deviations`.
2. `cd tools/validators && node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js`
3. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js`
4. `cd tools/validators && node --test dist/tests/rules/rule_chc_grounded_in_artifact_accessible.test.js`
5. `cd tools/validators && node --test dist/tests/integration/spec34-integration.test.js`
6. `rg -n 'associated_commitment_block' tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returns zero matches.

## Outcome

Completed: 2026-05-24

The four remaining placeholder `associated_commitment_block` keys named by this ticket were removed from the validators package test fixtures. No production code changed, and the tests' behavioral assertions stayed intact.

## Verification Result

1. `rg -n 'associated_commitment_block' tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` returned no matches.
2. `git diff --check -- tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts tools/validators/tests/structural/stchar-structural-validators.test.ts tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts tools/validators/tests/integration/spec34-integration.test.ts` passed.
3. `cd tools/validators && npm test` rebuilt the package successfully, then failed in the broad suite on pre-existing/sibling SPEC-47 edge-count drift: `SPEC-47 T-6/T-7: world-index build registers and emits all new STPLAN/STEMO edge types`, expected `76`, actual `75`.
4. `cd tools/validators && node --test dist/tests/integration/spec49-stplan-stemo-hardening.test.js` passed: 5 tests.
5. `cd tools/validators && node --test dist/tests/structural/stchar-structural-validators.test.js` passed: 12 tests.
6. `cd tools/validators && node --test dist/tests/rules/rule_chc_grounded_in_artifact_accessible.test.js` passed: 5 tests.
7. `cd tools/validators && node --test dist/tests/integration/spec34-integration.test.js` passed: 1 test.

## Deviations

- The drafted broad acceptance gate `cd tools/validators && npm test` did not finish green. It rebuilt `dist/` and ran the suite, but the only reported failure was the SPEC-47 edge-count assertion (`75 !== 76`), which is outside this ticket's four fixture-key removal seam. This ticket accepts the focused compiled test files plus zero-hit grep as the truthful proof boundary; the broader atomic-landing verification remains with the queued capstone `tickets/SPEC79CHCREM-011.md`.
