# WMCP-009: Surface per-validator status in `validate_patch_plan` response

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/validate-patch-plan.ts`, `tools/world-mcp/src/cli/validate-patch-plan.ts`, `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, `tools/world-mcp/tests/cli/validate-patch-plan.test.ts`, `tools/world-mcp/tests/integration/spec02-verification.test.ts`, `.claude/skills/canon-addition/SKILL.md`, `.claude/skills/canon-addition/references/counterfactual-and-verdict.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`
**Deps**: `archive/tickets/WMCP-001.md` (validate/schema tool family exists), `archive/tickets/PATCHENG-001-converge-inv-ids-verifier-and-per-op-check.md` (engine validator framework and HARD-GATE proof discipline)

## Problem

At intake, when `mcp__worldloom__validate_patch_plan` succeeded, the response shape was `{ status: "pass", verdicts: [] }` — an empty `verdicts[]` array confirmed no failures but provided no per-validator confirmation. Skills that produce a Phase 14a Validation Checklist (canon-addition's 14-test framework, parallel to create-base-world's genesis validation) need to map their numbered tests to the validators that ran. The mapping lives in skill prose (e.g., "Test 1: rule2_no_pure_cosmetics", "Test 5: rule6_no_silent_retcons + modification_history_retrofit"); without per-validator confirmation in the response, the operator had to trust the skill prose rather than confirming each validator actually ran.

The internal validator framework already tracked per-validator data: `tools/validators/src/framework/run.ts` keeps the legacy `summary.validators_run: string[]`, and `summary.executions[]` exposes the richer execution shape used by the submit path. The `submit_patch_plan` response already surfaced `validators_run: Array<{validator_name, status, duration_ms, detail?}>` per the engine response. The data existed; `validate_patch_plan` simply did not propagate it through the MCP boundary.

This was information loss across the validate / submit asymmetry: the same engine framework runs in both paths, but only submit's response surfaced per-validator status. Skills authoring a Validation Checklist were forced to either (a) trust the skill-prose mapping without runtime confirmation, or (b) re-run validation via submit just to read its response. PA-0002's Phase 14a Validation Checklist used path (a); this ticket makes the checklist deterministic on the validate path.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/validate-patch-plan.ts` currently declares `{ status: "pass" | "fail"; verdicts: Verdict[] } | { status: "skipped"; reason: string; verdicts: []; details? }` and returns only `result.verdicts`. The dropped data is already available as rich validator executions from `@worldloom/validators.validatePatchPlan(...)`.
2. `tools/validators/src/framework/run.ts` still keeps `summary.validators_run: string[]` for existing validator CLI/report consumers, but also records `summary.executions: ValidatorExecution[]` with `name`, `status`, `duration_ms`, and optional `detail`. `tools/validators/src/public/index.ts` already returns `{ verdicts, executions }`. The live correction is therefore to project `executions[]` at the world-mcp validate boundary; no validators framework return-shape migration is required.
3. Cross-artifact boundary: the validate / submit response shapes are paired surfaces consumed by the same skill flows (canon-addition Phase 14a checklist, create-base-world genesis validation). At intake they diverged. Shared invariant: both paths run the same engine validators; both now report the same per-validator data shape.
4. FOUNDATIONS principle under audit: §Validation Rules (lines 378-440 in `docs/FOUNDATIONS.md`) enumerates Rules 1-7, 11, 12 each with their own enforcement responsibility. Per-rule traceability — knowing which rule a verdict came from, AND knowing each rule was exercised even when no verdict fires — is a foundational expectation. At intake, PASS-with-empty-verdicts responses erased that trace.
5. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: the response is a discriminated union with `status` as the discriminator. Adding required `validators_run` to the `pass` and `fail` variants and `validators_run: []` to `skipped` is additive for consumers reading `status` and `verdicts`. The CLI `tools/world-mcp/src/cli/validate-patch-plan.ts` prints the MCP response unchanged, so source changes in the handler and existing CLI pass-through tests cover the CLI output.
6. Pipeline-wide blast radius: skill/doc consumers of `validate_patch_plan` response are canon-addition (`SKILL.md` Procedure step 8, `references/counterfactual-and-verdict.md` §Phase 14a Tests detailed criteria), `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md`. All currently describe the validate status object without per-validator run telemetry and are same-seam documentation fallout.
7. Package command correction: the drafted `pnpm --filter ...` commands are not truthful in this checkout; there is no root `package.json`, `pnpm-workspace.yaml`, or lockfile. Verification uses package-local `npm test` from `tools/validators/` and `tools/world-mcp/`.
8. Direct external `mcp__worldloom__validate_patch_plan(...)` is not exposed as a callable Codex tool in this session. Package-local handler tests and CLI tests are the truthful proof surface; direct MCP invocation remains post-restart operational smoke outside this implementation run.
9. Post-ticket review on 2026-05-02 found same-seam closure gaps: `tools/world-mcp/tests/integration/spec02-verification.test.ts` still asserted the old exact pass response `{ status: "pass", verdicts: [] }`, `.claude/skills/canon-addition/references/engine-envelope-shape.md` still described the validate status object without naming `validators_run[]`, and the ticket's prior `## Deviations` incorrectly classified the full `tools/world-mcp` package failure as unrelated. Final implementation absorbed those blockers before archival.

## Architecture Check

1. Surfacing the per-validator data through the MCP boundary closes a real information-asymmetry between validate and submit paths. The data is already tracked by the same framework that submit's path uses; this ticket exposes it without adding new tracking infrastructure or duplicating logic.
2. No backwards-compatibility aliasing/shims introduced. The validate response gains an additive `validators_run` field; existing consumers that read only `status` and `verdicts` continue to work. No deprecated field is left behind.

## Verification Layers

1. Validate response includes `validators_run` per execution -> codebase grep-proof: `validators_run` appears in `tools/world-mcp/src/tools/validate-patch-plan.ts` response shape AND in `tools/world-mcp/src/cli/validate-patch-plan.ts` CLI output.
2. Per-validator status data round-trips from framework to response -> schema validation: response payload from `validate_patch_plan` against a representative envelope shows the same `validators_run` array shape that `submit_patch_plan` produces (per-validator objects with `validator_name`, `status`, `duration_ms`).
3. Skill operator can reconcile Phase 14a Validation Checklist -> compiled handler/CLI tests plus skill-prose manual review: the representative validate response's `validators_run[]` includes the validator entries that actually ran, each with `validator_name`, `status`, `duration_ms`, and optional `detail`; canon-addition now points operators at that response field for mechanical-layer checklist confirmation.
4. FOUNDATIONS alignment check: §Validation Rules per-rule traceability is preserved on PASS as well as on FAIL.

## Landed Changes

### 1. Extended validate response type

`tools/world-mcp/src/tools/validate-patch-plan.ts` now returns `validators_run: ValidatorRunReceipt[]` on `pass` and `fail`, and `validators_run: []` on `skipped`. The shape matches `submit_patch_plan`'s existing receipt entries: `validator_name`, `status`, `duration_ms`, and optional `detail`.

### 2. Populate `validators_run` from framework result

The handler projects `@worldloom/validators.validatePatchPlan(...).executions` into the submit-compatible `validators_run` entry shape. `tools/validators` framework `summary.validators_run: string[]` remains intact because its rich `executions[]` path already existed and existing CLI/report consumers still use the string summary.

### 3. Mirror in CLI

`tools/world-mcp/src/cli/validate-patch-plan.ts` help/output prose names the new `validators_run` field. The CLI still re-prints the handler JSON unchanged.

### 4. Rebuild dist

Package-local verification rebuilt fresh `dist/` output for `tools/validators` and `tools/world-mcp`.

### 5. Skill prose update

`.claude/skills/canon-addition/SKILL.md` Procedure step 8 now points operators at `validators_run[]` as the per-test pass/fail/skipped confirmation source for Phase 14a Validation Checklist construction. `.claude/skills/canon-addition/references/counterfactual-and-verdict.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` now describe the same response shape.

## Files to Touch

- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — extend response shape, populate from framework)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — update help/output prose)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — pass/fail/skipped `validators_run` assertions)
- `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (modify — CLI pass-through `validators_run` assertions)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify — MCP dispatch/integration expectation must accept/assert `validators_run[]`)
- `tools/world-mcp/dist/**` (rebuilt ignored artifact)
- `tools/validators/dist/**` (rebuilt ignored artifact)
- `.claude/skills/canon-addition/SKILL.md` (modify — Procedure step 8 hint)
- `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (modify — §Phase 14a Tests detailed criteria preamble)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — validate/submit path response prose must name `validators_run[]`)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — validate status object prose)
- `docs/MACHINE-FACING-LAYER.md` (modify — validate status object prose)
- `tools/world-mcp/README.md` (modify — validate tool/CLI prose)

## Out of Scope

- Changing validator semantics or order of execution.
- Changing the `verdicts[]` shape on FAIL responses.
- Adding new validators.
- Surfacing per-validator data in tools other than `validate_patch_plan` and `submit_patch_plan`.
- FOUNDATIONS amendments — Rule traceability is already implicit; this ticket realizes it at the MCP boundary.

## Acceptance Criteria

### Tests That Must Pass

1. `validatePatchPlan({ patch_plan: envelope })` on a passing envelope returns `{ status: "pass", verdicts: [], validators_run: ValidatorRunEntry[] }` with at least one entry per executed validator.
2. The shape of each `ValidatorRunEntry` matches the shape that `submit_patch_plan` already returns (`validator_name`, `status`, `duration_ms`) — bytewise-identical schema.
3. On a FAIL envelope, `validators_run` still includes ALL executed validators (the failing ones with `status: fail`, the passing ones with `status: pass`, the skipped ones with `status: skipped`); `verdicts[]` continues to enumerate the failure verdicts.
4. On a `skipped` (envelope-shape rejected) response, `validators_run: []` and `verdicts: []` both empty (envelope didn't reach validation).
5. CLI `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` prints the new `validators_run` field in its JSON output.
6. Canon-addition Phase 14a guidance names `validators_run[]` as the mechanical-layer confirmation source for checklist mapping.

### Invariants

1. The validate and submit MCP tools produce identical `validators_run` shape (paired-surface symmetry).
2. Per-validator data is the framework's responsibility; both tool wrappers consume it.
3. Additive-only change: existing consumers reading `status` and `verdicts` continue to work.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modified test cases) — assert `validators_run` is populated on `pass` and `fail`, and empty on `skipped`; assert per-entry shape matches submit's.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` (existing) — confirms `@worldloom/validators.validatePatchPlan(...)` already returns rich `executions[]`; no framework migration test is needed.
3. `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (modified) — assert CLI output contains the field via unchanged handler pass-through.

### Commands

1. `cd tools/validators && npm test` — confirms framework/public validate execution telemetry and validator semantics still pass.
2. `cd tools/world-mcp && node dist/tests/tools/validate-patch-plan.test.js` — validates the compiled handler pass/fail/skipped response shape.
3. `cd tools/world-mcp && node dist/tests/cli/validate-patch-plan.test.js` — validates the compiled CLI entrypoint function pass-through and help/error behavior.

## Outcome

Implementation is complete. `validate_patch_plan` now surfaces per-validator telemetry on successful and failing validation responses, using the same `ValidatorRunReceipt` shape as `submit_patch_plan`. Skipped envelope-shape responses now explicitly carry `validators_run: []`.

The canon-addition skill and same-seam operator docs now tell operators to use `validators_run[]` as the mechanical-layer confirmation source for Phase 14a checklist entries. No validator order, validator semantics, verdict shape, approval-token behavior, submit ordering, or world content changed.

Post-ticket review blockers were resolved by updating the MCP integration test expectation in `tools/world-mcp/tests/integration/spec02-verification.test.ts`, truthing `.claude/skills/canon-addition/references/engine-envelope-shape.md`, and rerunning the full `tools/world-mcp` package proof.

## Verification Result

Completed in this implementation pass:

1. `cd tools/validators && npm test` — passed; 84 tests passed and the package rebuilt `dist/`.
2. `cd tools/world-mcp && node dist/tests/tools/validate-patch-plan.test.js` — passed; 5 tests passed against fresh compiled output.
3. `cd tools/world-mcp && node dist/tests/cli/validate-patch-plan.test.js` — passed; 7 tests passed against fresh compiled output.
4. `rg -n 'validate_patch_plan.*\{ status: "pass"|status: "pass" \| "fail" \| "skipped", verdicts|validators_run' archive/tickets/WMCP-009.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md .claude/skills/canon-addition tools/world-mcp/src tools/world-mcp/tests` — reviewed same-seam status-shape references.

Post-ticket review resolution:

1. `tools/world-mcp/tests/integration/spec02-verification.test.ts` now asserts `validators_run[]` on pass and fail responses through the MCP dispatch path without exact-duration matching.
2. `.claude/skills/canon-addition/references/engine-envelope-shape.md` now names `validators_run[]` for validate pass/fail responses and `validators_run: []` for skipped responses.
3. `cd tools/validators && npm test` — passed after the final same-seam edits; 84 tests passed.
4. `cd tools/world-mcp && npm test` — passed after rebuilding; 253 tests passed.

Ignored artifact state after verification is expected package state under `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

The drafted `pnpm --filter ...` proof commands were replaced with package-local `npm test` / compiled-test commands because this checkout has no root package workspace.

An earlier `cd tools/world-mcp && npm test` failure was same-seam fallout from the stale SPEC-02/SPEC-04 integration expectation. After updating that assertion, the full package lane passed.

Direct external `mcp__worldloom__validate_patch_plan(...)` was not used because the current Codex toolset does not expose that MCP tool. The package-local compiled handler and CLI tests are the truthful proof surface for this implementation run.
