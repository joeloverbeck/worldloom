# SPEC04VALFRA-007: Integration capstone — bootstrap audit + §Verification matrix

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/validators/tests/integration/spec04-verification.test.ts` (the spec's §Verification bullets as a test matrix against a fixture-copied animalia); no new production code. Bootstrap audit disposition documents any latent defects surfaced in animalia (grandfather as `info` with authored reason, or route to `canon-addition` cleanup). Completes SPEC-04 Phase 2 Tier 1 acceptance.
**Deps**: SPEC04VALFRA-006

## Problem

SPEC-04's §Verification section enumerates 8 acceptance bullets (Unit, Integration, Pre-apply mode, Full-world mode, Incremental mode, Phase 14a migration, False-positive baseline, Engine rewire, Schema conformance) that exercise the validator framework end-to-end. Individual tickets 003–006 cover unit + per-validator + per-surface testing; this capstone composes the full pipeline against a real fixture world (animalia) and asserts each §Verification bullet holds.

Per the reassessed spec's §Bootstrap audit sub-section, this ticket also runs `world-validate animalia` and dispositions any latent defects: resolve via a one-off `canon-addition` cleanup run OR grandfather as `info`-severity in `validation_results` with a human-authored reason. This is the final gate before Phase 2 Tier 2 (SPEC-05 Part B hooks and the engine's now-activated pre-apply gate) begins.

Per the Spec-Integration Ticket Shape guidance from `.claude/skills/spec-to-tickets/SKILL.md`, this ticket:
- Uses `fs.cpSync` to copy animalia to a temp root so the real world tree is never mutated.
- Re-enumerates expected counts (47 CFs, 18 CHs, 17 PAs) from the fixture at test start rather than hardcoding.
- Has one assertion per spec §Verification bullet.
- Lists a wall-clock perf check if the spec names a threshold (spec §Risks mentions "<10s" for full-world validation of a 12,000-line world — this is aspirational, so the assertion is logged as a dev-loop expectation, not a CI gate).
- Uses transitive-head `Deps: SPEC04VALFRA-006` (006 depends on 003/004; 003/004 depend on 001/002; the DAG is reconcilable).

## Assumption Reassessment (2026-04-25)

1. The animalia corpus at Step 1 has 47 CFs, 18 CHs, 17 adjudications (confirmed via reassessment Step 3 grep). The fixture-copy strategy preserves these counts; the test re-enumerates from the fixture at start to catch corpus growth between ticket authoring and execution.
2. The `validation_results` SQL table is populated by the CLI (ticket 005) and by `validatePatchPlan` (ticket 006). This capstone's tests invoke both surfaces and assert row-count / row-shape expectations against the fixture's `_index/world.db`.
3. Shared boundary: this ticket reads the spec's §Verification section to build the test matrix; it reads tickets 003–006 to understand what assertions each surface must satisfy; it reads `worlds/animalia/_source/` to copy the fixture. Nothing outside `tools/validators/` and the fixture is written.
4. FOUNDATIONS principle under audit: **§Tooling Recommendation** — this capstone is the integration proof that the validator framework fulfills the "LLM agents should never operate on prose alone" commitment's validator-framework deliverable from the §Machine-Facing Layer section. Also **Rule 6 No Silent Retcons**: Bootstrap-audit grandfather decisions must surface in `validation_results` with an authored reason so the retcon decision is auditable.
5. Schema extension posture: **additive-only**. New test file; no production code; no schema changes.
6. Grandfathering posture: the Bootstrap audit's grandfathered findings land as `info`-severity rows in `validation_results` with a `message` field whose content is the human-authored reason (e.g., `"[BOOTSTRAP-GRANDFATHER] CF-0012's missing prerequisites field is a pre-SPEC-13 authoring gap; fix deferred to canon-addition cleanup run scheduled for 2026-05-01"`). The `info` severity means the CLI's exit code is still 0 — these findings do not block Phase 2 Tier 2.
7. Rename/removal blast radius: zero. This ticket adds a test file; no production source modifications, no renames.
8. Cross-spec dependency: this capstone completes SPEC-04 Phase 2 Tier 1 and unblocks Phase 2 Tier 2 per `specs/IMPLEMENTATION-ORDER.md` Phase 2 Tier 1 (SPEC-04) → Tier 2 (SPEC-03 fail-closed gate activated; SPEC-02-PHASE2 MCP tooling) → Tier 3 (SPEC-05 Part B hooks). Ticket 006 wires the SPEC-04 → engine integration; this ticket attests the full chain.

## Architecture Check

1. Fixture-copy via `fs.cpSync` is the correct isolation strategy for a capstone test that exercises CLI + MCP + engine paths — all three paths assume a writable world directory (the CLI writes to `_index/world.db`; the MCP path may trigger world-index rebuilds; the engine's pre-apply check reads atomic records). Mutating the real `worlds/animalia/` tree would cross the test/canon boundary.
2. Re-enumerated counts (computed at test start via `fs.readdirSync`) are robust to corpus growth. Hardcoded counts would drift as new CFs / CHs land via ongoing `canon-addition` runs; re-enumeration stays valid.
3. One assertion per §Verification bullet (rather than bundled assertions) keeps the test output legible: a failure surfaces the specific bullet that failed, not a generic "integration failed" message. Matches the SPEC-Integration-Ticket-Shape discipline from `.claude/skills/spec-to-tickets/SKILL.md`.
4. Bootstrap-audit disposition is performed manually by the ticket's implementer, not automated in the test: the test asserts the row count in `validation_results` matches (clean runs + grandfathered info rows = 0 fails); the implementer authors the grandfather rows before committing. This follows the spec's §Bootstrap audit wording precisely: "latent defects surfaced … documented, and either resolved via a one-off cleanup canon-addition run OR accepted as grandfathered (recorded in a `validation_results` row with severity `info` and a human-authored reason)."
5. No backwards-compatibility aliasing/shims introduced. The capstone tests the post-reassessment validator surface end-to-end; no legacy paths exercised.

## Verification Layers

1. Test file exists and runs → build-proof (`cd tools/validators && npm run build && npm run test -- --test-name-pattern "spec04-verification"` exits 0).
2. Fixture-copy isolation → runtime assertion (the test's `before` hook copies animalia to `fs.mkdtempSync()`; `after` hook does `fs.rmSync(..., {recursive: true})`; the real `worlds/animalia/` inode atime matches pre/post-test — no mutations).
3. Each of the 8 §Verification bullets has a named test case → grep-proof (`grep -c "^test\|^suite" tools/validators/tests/integration/spec04-verification.test.ts` returns ≥8 — one per bullet — plus any supporting helper tests).
4. Re-enumerated counts match animalia corpus at test run → runtime assertion (`fs.readdirSync(fixture + '/_source/canon').length === 47` asserted in setup; the number comes from the fixture, not hardcoded).
5. Bootstrap audit: `world-validate animalia` on the fixture exits 0 after grandfathering → command test (`./tools/validators/dist/src/cli/world-validate.js <fixture-slug>; echo $?` prints 0 when all latent defects are either fixed or info-downgraded).
6. Engine rewire: a valid patch plan through `validate_patch_plan` returns `{verdicts: []}` → MCP assertion (reuses ticket 006's test fixtures against the cpSync-copied fixture).
7. Pre-apply mode rejects a deliberate Rule-4 violation → MCP assertion (same pattern).
8. Full-world mode CLI exits 1 on a deliberate violation → command test (the test injects a malformed MR fixture file into the cpSync copy, runs the CLI, asserts exit 1).
9. Incremental-mode filter works → simulated Hook 5 invocation: call `runValidators` with `run_mode: 'incremental'` and `touched_files: ['<fixture>/_source/canon/CF-0001.yaml']`, assert only CF-scoped validators fire (Rule 1, 2, 4, 6 on CF writes per matrix; not Rule 7 which is M-scoped; not `adjudication_discovery_fields` which is PA-scoped).
10. False-positive baseline → runtime assertion (unmodified cpSync copy → zero `fail` verdicts across all 13 mechanized validators; the number of `info`/`warn` verdicts after grandfathering is documented in the test's assertion message for reviewer audit).
11. Schema conformance → runtime assertion (`record_schema_compliance` against every `_source/*.yaml` in the cpSync copy → zero verdicts).
12. Perf wall-clock → runtime log (not a blocking assertion per Spec-Integration-Ticket-Shape guidance; `Date.now()` bracket around the full-world run; log the duration for dev-loop visibility; the spec's "<10s" aspirational target is the dev-loop expectation, not a CI gate).

## What to Change

### 1. Create `tools/validators/tests/integration/spec04-verification.test.ts`

Single integration test file covering the 8 §Verification bullets. Structure:

```typescript
import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

describe("SPEC-04 validator framework — integration capstone", () => {
  let fixtureRoot: string;
  let fixtureSlug: string;
  let expectedCfCount: number;
  let expectedChCount: number;
  let expectedPaCount: number;

  before(() => {
    const realAnimalia = resolve(__dirname, "../../../../worlds/animalia");
    const tmpBase = mkdtempSync(join(tmpdir(), "spec04-verify-"));
    fixtureSlug = "animalia-fixture";
    fixtureRoot = join(tmpBase, "worlds", fixtureSlug);
    cpSync(realAnimalia, fixtureRoot, { recursive: true });

    // Re-enumerate counts from the fixture
    expectedCfCount = readdirSync(join(fixtureRoot, "_source/canon")).filter(f => f.endsWith(".yaml")).length;
    expectedChCount = readdirSync(join(fixtureRoot, "_source/change-log")).filter(f => f.endsWith(".yaml")).length;
    expectedPaCount = readdirSync(join(fixtureRoot, "adjudications")).filter(f => f.endsWith(".md")).length;
  });

  after(() => {
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  test("Fixture counts re-enumerated", () => {
    assert.ok(expectedCfCount >= 47, `CF count ${expectedCfCount} below baseline 47`);
    assert.ok(expectedChCount >= 18, `CH count ${expectedChCount} below baseline 18`);
    assert.ok(expectedPaCount >= 17, `PA count ${expectedPaCount} below baseline 17`);
  });

  test("§Verification bullet 1 — Unit: every mechanized validator has passing fixtures", () => {
    // Delegates to unit-test suites in tickets 003/004; this assertion confirms the registry exports match expectations
    const { structuralValidators, ruleValidators } = require("../../dist/src/public/registry");
    assert.equal(structuralValidators.length, 7, "7 structural validators expected");
    assert.equal(ruleValidators.length, 6, "6 mechanized rule validators expected");
  });

  test("§Verification bullet 2 — Integration: world-validate exits 0 on grandfathered fixture", () => {
    // Invoke CLI against fixture
    const cliPath = resolve(__dirname, "../../dist/src/cli/world-validate.js");
    // Run from fixture's parent directory so relative 'worlds/<slug>' resolves
    const fixtureParent = resolve(fixtureRoot, "../..");
    const result = execFileSync("node", [cliPath, fixtureSlug, "--json"], { cwd: fixtureParent, encoding: "utf8" });
    const run = JSON.parse(result);
    assert.equal(run.summary.fail_count, 0, "Expected zero fails after Bootstrap grandfathering");
  });

  test("§Verification bullet 3 — Pre-apply mode: deliberate Rule-4 violation rejected", async () => {
    const { validatePatchPlan } = require("../../dist/src/public/index");
    const badPlan = buildDeliberateRule4Violation(fixtureSlug);
    const { verdicts } = await validatePatchPlan(badPlan);
    const rule4Fail = verdicts.find(v => v.code === "rule4.missing_why_not_universal");
    assert.ok(rule4Fail, "Rule 4 should fire on non-global CF with empty why_not_universal");
    assert.equal(rule4Fail.severity, "fail");
  });

  test("§Verification bullet 4 — Full-world mode: CLI exit codes correct", () => {
    // Clean run exits 0 (tested above); deliberate-violation run exits 1
    const violationPath = join(fixtureRoot, "_source/mystery-reserve/M-999-broken.yaml");
    writeFileSync(violationPath, "id: M-999\ntitle: Broken\nstatus: active\n"); // missing required fields
    const cliPath = resolve(__dirname, "../../dist/src/cli/world-validate.js");
    const fixtureParent = resolve(fixtureRoot, "../..");
    try {
      execFileSync("node", [cliPath, fixtureSlug], { cwd: fixtureParent });
      assert.fail("Expected non-zero exit");
    } catch (err: any) {
      assert.equal(err.status, 1);
    }
    rmSync(violationPath);
  });

  test("§Verification bullet 5 — Incremental mode: only relevant validators run", async () => {
    const { runValidators } = require("../../dist/src/framework/run");
    const { structuralValidators, ruleValidators } = require("../../dist/src/public/registry");
    const allValidators = [...structuralValidators, ...ruleValidators];
    const ctx = {
      run_mode: "incremental",
      world_slug: fixtureSlug,
      index: /* buildReadSurface(openWorldIndex(fixtureSlug)) */ null,
      touched_files: [join(fixtureRoot, "_source/canon/CF-0001.yaml")],
    };
    const run = await runValidators(allValidators, { world_slug: fixtureSlug }, ctx);
    // Assert: rule7 skipped (no M write), adjudication_discovery_fields skipped (no PA write),
    //         rule5 skipped (not pre-apply), rule1/2/4/6 + yaml_parse_integrity/record_schema_compliance/id_uniqueness/cross_file_reference run
    assert.ok(!run.summary.validators_run.includes("rule7_mystery_reserve_preservation"));
    assert.ok(!run.summary.validators_run.includes("adjudication_discovery_fields"));
    assert.ok(!run.summary.validators_run.includes("rule5_no_consequence_evasion"));
    assert.ok(run.summary.validators_run.includes("rule1_no_floating_facts"));
  });

  test("§Verification bullet 6 — Phase 14a migration: mechanized tests produce verdicts; skill-judgment tests remain skill-owned", () => {
    // Assertion: the 6 mechanized rule validators have names matching rule1/rule2/rule4/rule5/rule6/rule7
    //            (Rule 3 NOT present). This confirms the Phase 14a migration table from spec §Phase 14a migration.
    const { ruleValidators } = require("../../dist/src/public/registry");
    const names = ruleValidators.map((v: any) => v.name);
    assert.deepEqual(names.sort(), [
      "rule1_no_floating_facts",
      "rule2_no_pure_cosmetics",
      "rule4_no_globalization_by_accident",
      "rule5_no_consequence_evasion",
      "rule6_no_silent_retcons",
      "rule7_mystery_reserve_preservation",
    ].sort());
    assert.ok(!names.includes("rule3_no_specialness_inflation"), "Rule 3 must not be mechanized");
  });

  test("§Verification bullet 7 — False-positive baseline: unmodified fixture yields zero fails", () => {
    // Already covered by bullet 2's assertion on clean-run exit 0; this test additionally asserts
    // the info/warn count is documented (non-zero info is acceptable after grandfathering, but
    // the set of info codes must match the grandfather decisions recorded below).
    const cliPath = resolve(__dirname, "../../dist/src/cli/world-validate.js");
    const fixtureParent = resolve(fixtureRoot, "../..");
    const result = execFileSync("node", [cliPath, fixtureSlug, "--json"], { cwd: fixtureParent, encoding: "utf8" });
    const run = JSON.parse(result);
    assert.equal(run.summary.fail_count, 0);
    console.log(`Bootstrap baseline: ${run.summary.warn_count} warns, ${run.summary.info_count} infos`);
  });

  test("§Verification bullet 8 — Engine rewire: validate_patch_plan returns verdicts", async () => {
    // Direct test: @worldloom/validators' validatePatchPlan entry
    const { validatePatchPlan } = require("../../dist/src/public/index");
    const cleanPlan = buildCleanPlan(fixtureSlug);
    const { verdicts } = await validatePatchPlan(cleanPlan);
    assert.equal(verdicts.filter((v: any) => v.severity === "fail").length, 0);
  });

  test("§Verification bullet 9 — Schema conformance: record_schema_compliance against fixture passes", () => {
    // Invoked via structural-only CLI run
    const cliPath = resolve(__dirname, "../../dist/src/cli/world-validate.js");
    const fixtureParent = resolve(fixtureRoot, "../..");
    const result = execFileSync("node", [cliPath, fixtureSlug, "--structural", "--json"], { cwd: fixtureParent, encoding: "utf8" });
    const run = JSON.parse(result);
    const schemaFails = run.verdicts.filter((v: any) => v.validator === "record_schema_compliance" && v.severity === "fail");
    assert.equal(schemaFails.length, 0, `Unexpected schema fails: ${JSON.stringify(schemaFails.map((v: any) => v.message))}`);
  });

  test("Perf wall-clock — dev-loop expectation only, not CI gate", () => {
    const cliPath = resolve(__dirname, "../../dist/src/cli/world-validate.js");
    const fixtureParent = resolve(fixtureRoot, "../..");
    const start = Date.now();
    execFileSync("node", [cliPath, fixtureSlug, "--json"], { cwd: fixtureParent });
    const duration = Date.now() - start;
    console.log(`Full-world validation took ${duration}ms; spec dev-loop target: <10000ms`);
    // No assertion — this is informational
  });
});

function buildDeliberateRule4Violation(worldSlug: string) { /* synthesize a PatchPlanEnvelope with a non-global CF missing why_not_universal */ }
function buildCleanPlan(worldSlug: string) { /* synthesize a minimal valid CF-addition envelope */ }
```

### 2. Bootstrap audit disposition (pre-merge manual step)

Before merging this ticket, the implementer runs `./tools/validators/dist/src/cli/world-validate.js animalia` against the real animalia world and dispositions each surfaced finding:

- **Fix**: author a proposal (via `propose-new-canon-facts` or a direct retcon through `canon-addition`) that resolves the finding. Commit separately, not as part of this ticket.
- **Grandfather**: insert a row into `validation_results` with `severity: 'info'` and `message` containing `[BOOTSTRAP-GRANDFATHER]` prefix + authored rationale. The grandfather SQL is embedded in this ticket's implementation notes (not in the test file); example:

```sql
INSERT INTO validation_results (world_slug, validator_name, severity, code, message, node_id, file_path, created_at)
VALUES ('animalia', 'modification_history_retrofit', 'info', 'bootstrap.grandfather',
  '[BOOTSTRAP-GRANDFATHER] CF-0008 notes field contains 5 pre-SPEC-13 ''Modified by CH-NNNN'' lines but modification_history array has only 2 entries. Retrofit deferred to canon-addition cleanup run PROPOSED-2026-05-XX because back-filling requires author judgment per Rule 6.',
  'CF-0008', 'worlds/animalia/_source/canon/CF-0008.yaml',
  datetime('now'));
```

Document each grandfathered finding in this ticket's Outcome section (added at ticket-close time) so the decisions are auditable.

### 3. Document §Verification coverage in `tools/validators/tests/integration/README.md`

Create a short README mapping each §Verification bullet to its test case name, so a reviewer can trace the assertion matrix against the spec:

```markdown
# SPEC-04 Verification Coverage

| Spec §Verification bullet | Test case name |
|---|---|
| Unit | §Verification bullet 1 — Unit: every mechanized validator has passing fixtures |
| Integration | §Verification bullet 2 — Integration: world-validate exits 0 on grandfathered fixture |
| Pre-apply mode | §Verification bullet 3 — Pre-apply mode: deliberate Rule-4 violation rejected |
| Full-world mode | §Verification bullet 4 — Full-world mode: CLI exit codes correct |
| Incremental mode | §Verification bullet 5 — Incremental mode: only relevant validators run |
| Phase 14a migration | §Verification bullet 6 — Phase 14a migration: mechanized vs skill-judgment |
| False-positive baseline | §Verification bullet 7 — False-positive baseline |
| Engine rewire | §Verification bullet 8 — Engine rewire: validate_patch_plan returns verdicts |
| Schema conformance | §Verification bullet 9 — Schema conformance: record_schema_compliance passes |
```

## Files to Touch

- `tools/validators/tests/integration/spec04-verification.test.ts` (new)
- `tools/validators/tests/integration/README.md` (new; coverage-matrix doc)
- (Bootstrap-audit SQL inserts applied to `worlds/animalia/_index/world.db` at ticket close — documented in this ticket's Outcome section, not in a persisted source file)

## Out of Scope

- Production validator code — all landed in tickets 001–006.
- SPEC-05 Part B hooks integration (Hook 5 PostToolUse auto-validate) — owned by SPEC-05 decomposition.
- SPEC-06 canon-addition rewrite (Phase 14a skill collapse to `validate_patch_plan(plan)` call) — owned by SPEC-06 decomposition.
- Cross-spec doc drift cleanup for `attribution_comment` / `anchor_integrity` references in `docs/FOUNDATIONS.md:439`, `specs/SPEC-05-hooks-discipline.md:174`, `specs/SPEC-07-docs-updates.md:47` — owned by SPEC-07 Part B decomposition.
- Re-padding animalia's MR ids from `M-1` form to `M-0001` form — out-of-scope world-maintenance decision per the reassessed spec's §Risks & Open Questions.
- Phase 2.5 SPEC-09 Rules 11/12 validators — scheduled for SPEC-09 decomposition; not part of SPEC-04.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test -- --test-name-pattern "spec04-verification"` exits 0; all 10+ test cases in the capstone pass.
2. `grep -c "^\s*test(" tools/validators/tests/integration/spec04-verification.test.ts` returns ≥9 (one per spec §Verification bullet + perf log + count check).
3. The animalia Bootstrap audit completes with `world-validate animalia` exit code 0 after grandfather rows are inserted; the Outcome section documents every grandfather decision with an authored reason.
4. The real `worlds/animalia/` tree is NOT modified by the capstone test (verified by diff against pre-test state; the test writes only to the cpSync fixture and to `worlds/animalia/_index/world.db` for the Bootstrap-audit grandfathering step, which is an allowed write surface per `tools/world-index`'s public contract).
5. `tools/validators/tests/integration/README.md` exists and maps each §Verification bullet to a named test case.

### Invariants

1. The test file uses `fs.cpSync` + `fs.mkdtempSync` + `fs.rmSync` for fixture isolation. Any direct read of `worlds/animalia/_source/` that bypasses the fixture is a ticket-review veto — cross-test mutation is the exact failure mode fixture-copy prevents.
2. Expected counts (47 CFs, 18 CHs, 17 PAs) are computed from the fixture at test start via `readdirSync`, not hardcoded. Hardcoding would silently drift as the corpus grows.
3. The Bootstrap audit's grandfather rows have `severity: 'info'` + `code: 'bootstrap.grandfather'` + `[BOOTSTRAP-GRANDFATHER]` prefix in the `message` field. Any grandfather row missing this pattern cannot be grepped by future audits and violates Rule 6 No Silent Retcons.
4. Each spec §Verification bullet has AT LEAST one named test case. Collapsing multiple bullets into a single assertion violates the per-bullet-granularity Spec-Integration-Ticket-Shape discipline.
5. The perf wall-clock check is `console.log` only, not `assert.ok(duration < 10000)`. Per the spec-to-tickets skill's Spec-Integration-Ticket-Shape guidance, aspirational targets are dev-loop expectations, not CI gates.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec04-verification.test.ts` — the capstone itself; one test case per spec §Verification bullet plus supporting count/enumeration tests. Also includes the perf wall-clock informational log.
2. `None` for production code in this ticket — the capstone is test-only and verification-documentation-only.

### Commands

1. `cd tools/validators && npm run build && npm run test` (targeted: runs the capstone suite against the cpSync-fixture).
2. `./tools/validators/dist/src/cli/world-validate.js animalia --json | jq .summary` (end-to-end: Bootstrap-audit step; run from repo root; output feeds the grandfather disposition).
3. `sqlite3 worlds/animalia/_index/world.db "SELECT validator_name, code, message FROM validation_results WHERE world_slug = 'animalia' AND severity = 'info' AND code = 'bootstrap.grandfather'"` (audit-trail verification: every grandfather decision is recoverable via SQL grep).
4. `diff -r worlds/animalia tmp/animalia-pre-test-snapshot` (cross-check: fixture isolation held — zero diff between the real animalia tree and a pre-test snapshot after the capstone runs).
