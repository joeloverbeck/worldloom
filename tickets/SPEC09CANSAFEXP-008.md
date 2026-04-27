# SPEC09CANSAFEXP-008: SPEC-09 verification capstone — exercise §Verification 12 scenarios end-to-end

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/integration/spec09-verification.test.ts` (new) — exercises SPEC-09 §Verification scenarios 1-11 via fixture-driven assertions; no production code changes.
**Deps**: `archive/tickets/SPEC09CANSAFEXP-004.md`, `archive/tickets/SPEC09CANSAFEXP-005.md`, `tickets/SPEC09CANSAFEXP-007.md`

## Problem

SPEC-09 §Verification enumerates 12 numbered scenarios spanning structural, functional, regression, and measurement layers. Individual implementation tickets (-001 through -007) cover their own scope's acceptance criteria, but several §Verification scenarios cross ticket boundaries: scenario 4 exercises -002 + -004 together (canon-addition refusing to advance to Phase 15a when block missing); scenario 9 is the full animalia regression (-002 + -003 + grandfather clause); scenario 10 is end-to-end canon-addition on animalia (-001 + -002 + -003 + -004); scenario 11 is create-base-world genesis (-007). A spec-integration capstone ticket exercises these cross-ticket scenarios as a single integration test, catching regressions that per-ticket acceptance can miss. Per /spec-to-tickets §Spec-Integration Ticket Shape, this ticket introduces no new production code — it composes the pipeline assembled by the prior tickets.

## Assumption Reassessment (2026-04-27)

1. SPEC-09 §Verification has 12 numbered scenarios. Scenarios 1-3 are structural (FOUNDATIONS edits parse, schema parses, animalia regression for validators 11/12). Scenarios 4-7 are functional dry-runs of canon-addition. Scenario 8 is continuity-audit dry-run. Scenarios 9-10 are regression / end-to-end. Scenario 11 is create-base-world genesis. Scenario 12 is measurement (no token-budget regression target).
2. Animalia currently has 48 CFs at `worlds/animalia/_source/canon/` (confirmed at spot-check via `ls | wc -l`). The capstone test must re-enumerate the count at runtime (not hardcode 48) per /spec-to-tickets §Spec-Integration Ticket Shape — `Re-enumerated expected counts (not hardcoded), computed from the fixture at test start. Hardcoded counts become stale as canon grows`.
3. **Cross-skill / cross-artifact boundary under audit**: this ticket exercises every prior ticket's surface end-to-end. Animalia regression (scenario 9): `world-validate animalia --json` must report zero new failures on the 48 historical CFs. End-to-end canon-addition (scenario 10): a synthetic next-in-sequence CF proposal exercises Phases 0-14a + the new Tests 11-12. create-base-world genesis (scenario 11): synthetic new world emits CF-0001 with both blocks correctly populated or n_a'd.
4. **FOUNDATIONS principle motivating this ticket**: this ticket directly maps spec §Verification to executable assertions. Per FOUNDATIONS §Tooling Recommendation (`LLM agents should never operate on prose alone`), the spec's verification scenarios deserve executable proof, not only documentation-side enumeration.
5. **Fixture-world copy strategy** (per /spec-to-tickets §Spec-Integration Ticket Shape): `fs.cpSync` to a temp root so the test never mutates the real `worlds/animalia/`. Equivalent to the pattern used by SPEC-13's atomic-source migration test fixtures and by the validators package's existing animalia-touching tests.
6. **No measurable target for §Verification 12** (token-budget regression). Scenario 12 is informational measurement, not a CI gate. Capstone test does NOT include a wall-clock or token-budget assertion (per /spec-to-tickets §Spec-Integration Ticket Shape: `wall-clock perf assertion when the spec names a performance gate; leave the spec's aspirational target as a dev-loop expectation rather than a CI gate` — SPEC-09 §Verification 12 is aspirational, no specific threshold named).
7. **Dependency selection**: this ticket lists archived -004 + active -005 + active -007 as Deps. Per /spec-to-tickets §Spec-Integration Ticket Shape: `prefer the transitive-head convention (single Deps: <transitive-head-ticket>) over enumerating every upstream ticket`. Here three terminal nodes exist: -004 transitively covers -001/-002/-003; -005 covers -001 only (not on the canon-addition chain); -007 covers -001/-002. Three terminals = three Deps. -006 is not listed because no §Verification scenario tests diegetic-artifact-generation cleanup.

## Architecture Check

1. A single integration-test file exercising every §Verification scenario as test sub-cases keeps the capstone surface coherent. The alternative — splitting into per-scenario test files — fragments the spec→test mapping and makes scope-of-the-capstone harder to audit.
2. Fixture-world copy via `fs.cpSync` preserves the real animalia tree. The test never mutates `worlds/animalia/`; mutations happen in a temp copy that is cleaned up post-test. This matches the canonical pattern for tests that exercise a real world's structural validity.
3. Re-enumerated counts (CF count, hard-canon count, capability-type CF count) prevent staleness as animalia grows. Hardcoding `expect(count).toBe(48)` would break the test the moment animalia adds a 49th CF; computing the count from the fixture at test start stays valid.
4. No backwards-compatibility shims introduced — capstone is net-new test infrastructure under `tools/validators/tests/integration/`.

## Verification Layers

1. §Verification 1 (FOUNDATIONS edits land + valid markdown + YAML extracts parse) — manual review + ajv compile assertion.
2. §Verification 2 (canon-fact-record.schema.json parses both populated and n_a variants) — schema validation: load schema, compile via ajv, validate fixture artifacts.
3. §Verification 3 (validators ship + exit 0 on animalia 48 CFs) — `world-validate <fixture-animalia> --rules=11,12 --json` exits 0; CF count is re-enumerated at test start.
4. §Verification 4 (capability CF without exception_governance fails record_schema_compliance) — assertion against fixture.
5. §Verification 5 (rule-11-action-space FAILS when leverage missing) — assertion against fixture.
6. §Verification 6 (geography CF with n_a passes both layers) — assertion against fixture.
7. §Verification 7 (bare n_a fails regex) — assertion against fixture.
8. §Verification 8 (continuity-audit on synthetic world emits retcon-proposal candidate) — assertion against synthetic world fixture.
9. §Verification 9 (animalia regression: zero new failures, grandfather holds structurally) — `world-validate <fixture-animalia> --json` exits 0.
10. §Verification 10 (end-to-end canon-addition on animalia produces a new CF without regression) — skill dry-run via integration harness.
11. §Verification 11 (create-base-world genesis on synthetic new world produces CF-0001 with both blocks correctly populated or n_a'd per fact-type) — skill dry-run via integration harness; synthetic world has both a capability CF and a geography CF to exercise both populated and n_a paths.

## What to Change

### 1. `tools/validators/tests/integration/spec09-verification.test.ts` (new)

Create the integration test file. Structure:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Helper: clone real animalia to a temp root for safe fixture-driven testing
function cloneAnimaliaToTemp(): string { /* fs.cpSync animalia → temp root */ }

// §Verification 1
test("SPEC-09 §V1: FOUNDATIONS edits land + YAML example parses", async () => { /* ... */ });

// §Verification 2
test("SPEC-09 §V2: canon-fact-record.schema.json validates populated + n_a variants", async () => { /* ... */ });

// §Verification 3 (re-enumerated count)
test("SPEC-09 §V3: validators ship + exit 0 on animalia historical CFs", async () => {
  const fixtureRoot = cloneAnimaliaToTemp();
  const cfCount = countAnimaliaCFs(fixtureRoot); // computed at test start
  assert.ok(cfCount >= 48, `expected animalia CF count >= 48 (will grow over time), got ${cfCount}`);
  const result = await runWorldValidate(fixtureRoot, { rules: "11,12", json: true });
  assert.equal(result.exitCode, 0);
  rmSync(fixtureRoot, { recursive: true, force: true });
});

// §Verifications 4-7: schema and rule-validator fixtures
// §Verification 8: continuity-audit synthetic world
// §Verifications 9-10: animalia regression + end-to-end canon-addition
// §Verification 11: create-base-world genesis on synthetic new world
```

Each test sub-case asserts the spec's exact verification claim using either schema-validation calls, CLI invocations against a temp fixture, or skill dry-run harnesses (where harness invocation infrastructure exists).

### 2. Synthetic test fixtures

Add fixtures under `tools/validators/tests/integration/fixtures/spec09/`:
- `cf-capability-without-exception-governance.yaml` (§V4)
- `cf-capability-with-leverage-shortfall.yaml` (§V5)
- `cf-geography-with-na-blocks.yaml` (§V6)
- `cf-with-bare-na-rationale.yaml` (§V7)
- `synthetic-world-silent-area-canonization/` (§V8 — minimal `_source/` tree with a CF canonizing a previously-silent domain without acknowledgment)
- `synthetic-new-world-create-base/` (§V11 — minimal config for a synthetic world with both capability and geography CFs)

### 3. Integration harness extensions (if needed)

If `tools/validators/tests/` lacks a test harness for invoking skills end-to-end (the validators package may only test validators directly), this ticket may require minor harness additions — e.g., a helper to invoke `canon-addition` or `create-base-world` skill flows in dry-run mode against the temp fixture. If existing harness coverage is insufficient, add the helper to `tools/validators/tests/_helpers/skill-dry-run.ts` (new) with a clear "this is integration-test infrastructure, not production code" comment in the file header.

## Files to Touch

- `tools/validators/tests/integration/spec09-verification.test.ts` (new)
- `tools/validators/tests/integration/fixtures/spec09/cf-capability-without-exception-governance.yaml` (new)
- `tools/validators/tests/integration/fixtures/spec09/cf-capability-with-leverage-shortfall.yaml` (new)
- `tools/validators/tests/integration/fixtures/spec09/cf-geography-with-na-blocks.yaml` (new)
- `tools/validators/tests/integration/fixtures/spec09/cf-with-bare-na-rationale.yaml` (new)
- `tools/validators/tests/integration/fixtures/spec09/synthetic-world-silent-area-canonization/` (new directory tree)
- `tools/validators/tests/integration/fixtures/spec09/synthetic-new-world-create-base/` (new directory tree)
- `tools/validators/tests/_helpers/skill-dry-run.ts` (new, only if existing harness lacks skill-invocation surface)

## Out of Scope

- Production code changes — capstone introduces no new validators, no new skill prose, no new schema fields. All production work is delivered by SPEC09CANSAFEXP-001 through -007.
- §Verification 12 (token-budget regression measurement) — informational, not a CI gate. Spec names no specific threshold; capstone does not assert a wall-clock or token-budget bound.
- Performance tuning of validators or skills — out of scope for SPEC-09 entirely.
- Diegetic-artifact-generation template-cleanup verification — SPEC-09 §Verification names no scenario for SPEC09CANSAFEXP-006; that ticket's acceptance criteria cover its own scope.
- Modifying the real `worlds/animalia/` tree — capstone uses `fs.cpSync` to a temp root and never mutates animalia.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test` — full validator test suite passes including the new integration test file.
2. `cd tools/validators && npm run build` — TypeScript compilation succeeds.
3. `node tools/validators/dist/tests/integration/spec09-verification.test.js` — integration test exits 0 with all §Verification 1-11 sub-cases passing.
4. CF count assertion in §V3 sub-case is computed from the fixture at runtime (re-enumerated), not hardcoded — codebase grep-proof: `grep -n "cfCount\|countAnimaliaCFs" tools/validators/tests/integration/spec09-verification.test.ts` returns the runtime-counting helper, NOT a literal `48` constant in an assertion context.
5. Animalia regression (§V9) passes: `world-validate <temp-animalia-copy> --json` exits 0 — confirms grandfather clause holds for historical CFs.
6. The temp fixture cleanup runs in `after` / `afterEach` hooks; no temp directories leak after test completion (verified by `find /tmp -name 'spec09-*' -mmin -5` returning empty after a test run).

### Invariants

1. The real `worlds/animalia/` tree is never mutated by this test. Every assertion runs against a `cpSync`'d temp copy that is cleaned up post-test.
2. Re-enumerated counts (CF count, hard-canon-CF count, capability-type-CF count) are computed at test start, not hardcoded. Animalia growing to 49 or 60 CFs does not break the test.
3. Test sub-case names map 1:1 to SPEC-09 §Verification numbered scenarios — the scenario number is part of the test name (`§V1`, `§V2`, ...) so a reader can reconstruct spec-to-test coverage from test output alone.
4. No production code is touched — SPEC09CANSAFEXP-008's diff is integration-test-only.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec09-verification.test.ts` (new) — 11 test sub-cases covering §Verification 1-11.
2. `tools/validators/tests/integration/fixtures/spec09/*.yaml` and `*/` (new) — 6 fixtures covering scenarios 4-8 and 11.
3. `tools/validators/tests/_helpers/skill-dry-run.ts` (new, conditional) — skill-invocation harness if not already present.

### Commands

1. `cd tools/validators && npm test` — package-local test suite including the integration test.
2. `cd tools/validators && npm run build` — TypeScript compile.
3. `node tools/validators/dist/tests/integration/spec09-verification.test.js` — direct invocation of the integration test for focused dev-loop iteration.
4. `find /tmp -maxdepth 1 -name 'spec09-*' -mmin -5` after a test run — should return empty (temp-fixture cleanup verification).
