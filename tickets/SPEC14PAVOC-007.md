# SPEC14PAVOC-007: canon-addition Skill Rewrite Acceptance — Validator-Pass on Engine-Emitted PAs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: No code changes — verification ticket. Adds a cross-package integration test asserting the SPEC-06 amended acceptance criterion holds end-to-end.
**Deps**: SPEC-14, `archive/tickets/SPEC14PAVOC-001.md` (validator-side contract), `archive/tickets/SPEC14PAVOC-002.md` (engine-side contract), `archive/tickets/SPEC14PAVOC-003.md` (canonical-vocab MCP), **SPEC14PAVOC-004** (animalia PA migration — provides clean baseline for the test world), and the SPEC-06 canon-addition Phase 2 rewrite (lands separately as part of SPEC-06 implementation; this ticket sequences AFTER that rewrite is in-progress and BEFORE SPEC-06's Phase 2 acceptance gate)

## Problem

Per SPEC-06 §Verification (amended by SPEC-14), the Phase 2 full-migration acceptance criterion now requires: *"Every record emitted by a rewritten skill (PA frontmatter, character frontmatter, DA frontmatter, atomic CF/CH/M/OQ/INV/ENT/SEC YAML) passes `record_schema_compliance` end-to-end. A skill rewrite that emits any artifact failing the schema is incomplete and must not land."*

This acceptance criterion is currently undertested. Engine unit tests verify the `append_*` ops produce well-formed files; validator unit tests verify schemas are correct against synthetic fixtures. **No test verifies that a real canon-addition run (rewritten per SPEC-06) emits a PA that round-trips cleanly through the validator.**

This ticket lands the cross-package end-to-end test that closes the SPEC-14 contract proof.

## Assumption Reassessment (2026-04-25)

1. SPEC-06's canon-addition Phase 2 rewrite produces a skill that, when invoked on a brief, calls `mcp__worldloom__submit_patch_plan` with a patch envelope containing (among other ops) `append_adjudication_record`. Per SPEC-14 §Approach + this ticket's premise, the resulting on-disk PA file must pass `record_schema_compliance`.
2. The cross-package roundtrip test landed in `archive/tickets/SPEC14PAVOC-002.md` (`tools/validators/tests/integration/spec14-engine-roundtrip.test.ts`) verifies the LOWER LEVEL contract: synthetic engine payload → on-disk file → validator passes. This ticket extends that to the HIGHER LEVEL contract: full canon-addition skill run → engine submission → on-disk file → validator passes.
3. Test world setup: copy a snapshot of post-`SPEC14PAVOC-004` animalia (or use a smaller synthetic world) into a temp directory; run a representative canon-addition brief through the rewritten skill; assert the resulting adjudication file passes the validator.
4. The skill itself is rewritten by SPEC-06's per-skill ticket family (not this ticket). This ticket lands the ACCEPTANCE TEST that SPEC-06's canon-addition rewrite must pass before its own ticket can be marked completed.
5. Cross-skill scope: technically the same acceptance criterion applies to all 8 skills (per SPEC-06 amended §Verification). This ticket scopes specifically to canon-addition (the highest-risk skill, the one that emits PAs). Sibling tickets for character-generation, diegetic-artifact-generation, etc., apply the same pattern at their own per-skill rewrite tickets, scoped to their respective output records.
6. The test cannot be a unit test of canon-addition — it requires the engine + validator + index packages all built and a populated test world. Lives at `tests/integration/canon-addition-validator-acceptance.test.ts` at the repo root, OR inside `tools/world-mcp/tests/integration/` (which is the natural cross-package test home). Implementation-time decision based on which package owns the integration harness.
7. This is a validator-pass acceptance test, NOT a content-correctness test. The PA's analysis prose can say anything; only the frontmatter shape and atomic-record outputs need to pass schemas. Content-correctness (Phase 0–11 reasoning quality) is the existing canon-addition prose-review gate, not the SPEC-14 contract gate.

## Architecture Check

1. The cross-package end-to-end test is the load-bearing proof that the SPEC-14 reconciliation worked. Without this test, SPEC-06's Phase 2 acceptance criterion is unfalsifiable in CI.
2. Scoping the test to canon-addition first is right — it's the dominant emission surface for adjudication records and the highest-risk skill for SPEC-14 contract drift. Other skills' equivalent acceptance tests follow the same pattern at their per-skill rewrite tickets.
3. No backwards-compatibility shim. The test asserts the post-SPEC-14 contract; failures are real failures.

## Verification Layers

1. End-to-end roundtrip → `tests/integration/canon-addition-validator-acceptance.test.ts` (new) — runs canon-addition (rewritten per SPEC-06) against a representative brief; asserts every emitted artifact passes its respective schema.
2. Specific PA assertion → the test reads the on-disk `adjudications/PA-NNNN-*.md` file produced by the run; runs `record_schema_compliance` against it; asserts zero verdicts of severity `fail`.
3. Specific atomic-record assertions → the test reads the on-disk `_source/canon/CF-NNNN.yaml`, `_source/change-log/CH-NNNN.yaml`, `_source/mystery-reserve/M-NNNN.yaml`, `_source/open-questions/OQ-NNNN.yaml` files produced by the same run; asserts each passes its respective schema.
4. Bidirectional integrity → asserts engine's `append_touched_by_cf` rejection (or successful resolution via same-plan `update_record_field`) is exercised in the test path.
5. SPEC-06 §Verification gate → this test PASSING is a precondition for marking SPEC-06's canon-addition rewrite ticket completed.

## What to Change

### 1. Author the integration test

New file `tests/integration/canon-addition-validator-acceptance.test.ts` (or under `tools/world-mcp/tests/integration/` — implementer's call):

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { runValidator } from "@worldloom/validators";
import { runCanonAddition } from "<rewritten-skill-harness>";

test("canon-addition emits SPEC-14-compliant PA + atomic records", async (t) => {
  const testWorld = setupTestWorld(t);  // post-SPEC14PAVOC-004 animalia snapshot or a synthetic baseline
  const brief = readFixture("briefs/test-brief-spec14-acceptance.md");

  const result = await runCanonAddition({ world: testWorld, brief });
  assert.equal(result.status, "submitted");

  const validatorRun = await runValidator(testWorld, { mode: "full-world" });
  assert.equal(
    validatorRun.summary.fail_count,
    0,
    `record_schema_compliance must pass on all engine-emitted records; failures: ${JSON.stringify(validatorRun.verdicts.filter(v => v.severity === "fail"), null, 2)}`
  );
  // Also assert specific record types emitted by this run pass:
  const paFile = result.emitted_files.find((f) => f.startsWith("adjudications/"));
  assert.ok(paFile, "canon-addition must emit a PA file");
  const paVerdicts = validatorRun.verdicts.filter((v) => v.location.file === paFile);
  assert.deepEqual(paVerdicts, [], `PA must pass all validators; got: ${JSON.stringify(paVerdicts, null, 2)}`);
});
```

The exact harness (`runCanonAddition`) depends on how SPEC-06's canon-addition rewrite is testable from outside the skill. If skill invocation requires a Claude Code agent loop (unfeasible in CI), an alternative is:

```typescript
// Alternative: use the patch plan that the skill WOULD have submitted, captured as a fixture
const planFixture = readFixture("fixtures/canon-addition-spec14-acceptance-plan.json");
const result = await submitPatchPlan(planFixture);
// then run validator as above
```

Implementation-time judgment: prefer the skill-invocation path if testable; fall back to plan-fixture replay if the skill harness isn't CI-friendly.

### 2. Author the test brief fixture

`tests/integration/fixtures/briefs/test-brief-spec14-acceptance.md`:
- A representative canon-addition brief that, when processed, produces (a) at least one new CF record, (b) at least one section update via `append_touched_by_cf` (exercising the bidirectional check), (c) at least one new OQ allocation (exercising OQ allocation pre-flight), (d) the resulting PA. Keep it small enough that the test runs fast (~5s).

### 3. Wire into CI

Add the test to the project's test runner config (likely `package.json` test script chain or `tools/<pkg>/package.json`'s test script). Test runs as part of `npm test` at the package level.

### 4. Document the acceptance gate

Update `specs/SPEC-06-skill-rewrite-patterns.md` Verification section to point to this test by path (cross-reference, not duplication). The SPEC-06 amendment landed in Tier 1 already added the criterion language; this ticket adds the test artifact that operationalizes it.

## Files to Touch

- `tests/integration/canon-addition-validator-acceptance.test.ts` (new)
- `tests/integration/fixtures/briefs/test-brief-spec14-acceptance.md` (new)
- `tests/integration/fixtures/canon-addition-spec14-acceptance-plan.json` (new — fallback if skill-harness path not CI-friendly)
- `package.json` or `tools/world-mcp/package.json` (modify — add test to runner)
- `specs/SPEC-06-skill-rewrite-patterns.md` (minor modify — Verification section adds path reference to this test, replacing the more general criterion sentence with a path-cited one)

## Out of Scope

- The canon-addition skill rewrite itself (SPEC-06 ticket family).
- Equivalent acceptance tests for the other 7 skills (character-generation, etc.). Those are SPEC-06 per-skill ticket scope; this ticket establishes the pattern.
- Performance benchmarking of canon-addition runtime (separate SPEC-08 acceptance criterion).
- Token-reduction measurement (separate SPEC-08 acceptance criterion).

## Acceptance Criteria

### Tests That Must Pass

1. `node --test tests/integration/canon-addition-validator-acceptance.test.ts` (or equivalent test invocation per implementer's chosen home) passes.
2. Test asserts every emitted record file passes `record_schema_compliance` with zero `fail` verdicts.
3. Test exercises at least one `append_touched_by_cf` op (bidirectional check), one OQ allocation, and one PA emission per the test brief.

### Invariants

1. SPEC-06's canon-addition rewrite cannot land its acceptance gate until this test passes.
2. The test is part of the standard CI test run (not a manual-only invocation).
3. Future regression of the SPEC-14 contract (engine/validator drift, schema rename) is caught by this test before merge.

## Test Plan

### New/Modified Tests

1. `tests/integration/canon-addition-validator-acceptance.test.ts` — the load-bearing acceptance test for SPEC-06 canon-addition rewrite + SPEC-14 contract.

### Commands

1. `npm test` (at repo root or appropriate package) — full test suite including the new integration test.
2. Manual inspection of the test brief fixture to verify it exercises the intended op surface area.
3. After the test passes, run `node tools/validators/dist/src/cli/world-validate.js animalia --json` against the test world post-canon-addition; expect zero findings (the test world's pre-existing state was clean post-Tier-3 migration).
