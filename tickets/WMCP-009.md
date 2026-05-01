# WMCP-009: Surface per-validator status in `validate_patch_plan` response

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/validate-patch-plan.ts`, `tools/world-mcp/src/cli/validate-patch-plan.ts`
**Deps**: WMCP-001 (validate tool exists), PATCHENG-001 (engine-validators framework)

## Problem

When `mcp__worldloom__validate_patch_plan` succeeds, the response shape is `{ status: "pass", verdicts: [] }` — an empty `verdicts[]` array confirms no failures but provides no per-validator confirmation. Skills that produce a Phase 14a Validation Checklist (canon-addition's 14-test framework, parallel to create-base-world's genesis validation) need to map their numbered tests to the validators that ran. The mapping lives in skill prose (e.g., "Test 1: rule2_no_pure_cosmetics", "Test 5: rule6_no_silent_retcons + modification_history_retrofit"); without per-validator confirmation in the response, the operator must trust the skill prose rather than confirming each validator actually ran.

The internal validator framework already tracks per-validator data: `tools/validators/src/framework/run.ts` line 90 returns `validators_run: string[]`, and `tools/validators/src/framework/types.ts` line 50 exposes it as part of the framework `RunResult`. The `submit_patch_plan` response already surfaces a richer shape — `validators_run: Array<{validator_name, status, duration_ms}>` per the engine response (observed during the GazteluFit canon-addition session, PA-0002, 2026-05-01). The data exists; `validate_patch_plan` simply doesn't propagate it through the MCP boundary.

This is an information loss across the validate / submit asymmetry: the same engine framework runs in both paths, but only submit's response surfaces per-validator status. Skills authoring a Validation Checklist are forced to either (a) trust the skill-prose mapping without runtime confirmation, or (b) re-run validation via submit just to read its response — neither is acceptable. PA-0002's Phase 14a Validation Checklist used path (a); a per-validator response would have made the checklist deterministic.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/validate-patch-plan.ts` lines 15-17 declare the response union: `{ status: "pass" | "fail"; verdicts: Verdict[] } | { status: "skipped"; reason: string; verdicts: []; details? }`. Lines 46-50 produce the response from `result.verdicts` only — `result.validators_run` is available on the framework result type but not propagated into the MCP response.
2. `tools/validators/src/framework/run.ts` line 11 declares `const validators_run: string[] = []`; line 18 pushes `validator.name` per executed validator; line 90 returns `validators_run` as part of the `RunResult`. This is the data that needs to surface in the MCP response. The submit-path response shape (observed at session-time) goes further: `validators_run: Array<{ validator_name: string; status: "pass" | "fail" | "skipped"; duration_ms: number }>` — a per-validator object array, not a bare name list. Implementation must surface the richer shape.
3. Cross-artifact boundary: the validate / submit response shapes are paired surfaces consumed by the same skill flows (canon-addition Phase 14a checklist, create-base-world genesis validation). Today they diverge. Shared invariant: both paths run the same engine validators; both should report the same per-validator data.
4. FOUNDATIONS principle under audit: §Validation Rules (lines 378-440 in `docs/FOUNDATIONS.md`) enumerates Rules 1-7, 11, 12 each with their own enforcement responsibility. Per-rule traceability — knowing which rule a verdict came from, AND knowing each rule was exercised even when no verdict fires — is a foundational expectation. Today's PASS-with-empty-verdicts response erases the trace.
5. Schema extension audit per `tickets/README.md` Pre-Implementation Check 10: the response is a discriminated union with `status` as the discriminator. Adding `validators_run` as an additional optional field (or required field on the `pass` and `fail` variants) is additive — existing consumers reading `status` and `verdicts` are unaffected. The CLI `tools/world-mcp/src/cli/validate-patch-plan.ts` mirrors the MCP response shape; both surfaces update together.
6. Pipeline-wide blast radius: skill consumers of `validate_patch_plan` response are canon-addition (`SKILL.md` Procedure step 8, `references/counterfactual-and-verdict.md` §Phase 14a Tests detailed criteria) and create-base-world (genesis validation step). Both currently parse `status` and `verdicts` only; surfacing `validators_run` is opt-in for them.

## Architecture Check

1. Surfacing the per-validator data through the MCP boundary closes a real information-asymmetry between validate and submit paths. The data is already tracked by the same framework that submit's path uses; this ticket exposes it without adding new tracking infrastructure or duplicating logic.
2. No backwards-compatibility aliasing/shims introduced. The validate response gains an additive `validators_run` field; existing consumers that read only `status` and `verdicts` continue to work. No deprecated field is left behind.

## Verification Layers

1. Validate response includes `validators_run` per execution -> codebase grep-proof: `validators_run` appears in `tools/world-mcp/src/tools/validate-patch-plan.ts` response shape AND in `tools/world-mcp/src/cli/validate-patch-plan.ts` CLI output.
2. Per-validator status data round-trips from framework to response -> schema validation: response payload from `validate_patch_plan` against a representative envelope shows the same `validators_run` array shape that `submit_patch_plan` produces (per-validator objects with `validator_name`, `status`, `duration_ms`).
3. Skill operator can reconcile Phase 14a Validation Checklist -> skill dry-run: invoke canon-addition with the GazteluFit fixture (or any accept-branch fixture); the validate response's `validators_run[]` includes `record_schema_compliance`, `id_uniqueness`, `cross_file_reference`, `touched_by_cf_completeness`, `modification_history_retrofit`, `yaml_parse_integrity`, `rule1_no_floating_facts`, `rule2_no_pure_cosmetics`, `rule4_no_globalization_by_accident`, `rule5_no_consequence_evasion`, `rule6_no_silent_retcons`, `rule7_mystery_reserve_preservation`, `rule11_action_space`, `rule12_redundancy` — each with `status: pass` and a `duration_ms`.
4. FOUNDATIONS alignment check: §Validation Rules per-rule traceability is preserved on PASS as well as on FAIL.

## What to Change

### 1. Extend response type

In `tools/world-mcp/src/tools/validate-patch-plan.ts`, update the response type at lines 15-17:

```ts
export type ValidatePatchPlanResponse =
  | { status: "pass"; verdicts: Verdict[]; validators_run: ValidatorRunEntry[] }
  | { status: "fail"; verdicts: Verdict[]; validators_run: ValidatorRunEntry[] }
  | { status: "skipped"; reason: string; verdicts: []; validators_run: []; details?: Record<string, unknown> };

export interface ValidatorRunEntry {
  validator_name: string;
  status: "pass" | "fail" | "skipped";
  duration_ms: number;
}
```

The `ValidatorRunEntry` shape MUST match `submit_patch_plan`'s existing entry shape exactly — paired surfaces should be schema-identical.

### 2. Populate `validators_run` from framework result

In the same file at lines 46-50, after computing `hasFailures`, populate `validators_run` from `result.validators_run` (the framework's per-validator tracking). If the framework currently returns `string[]` (per `run.ts:90`), upgrade the framework return shape to the richer per-entry object array used by submit; this is a single-source change in `tools/validators/src/framework/run.ts` lines 32-50 (`timedRuns` already tracks `name` and `duration_ms` per validator; the per-validator `status` is computed from per-validator verdicts).

### 3. Mirror in CLI

In `tools/world-mcp/src/cli/validate-patch-plan.ts`, ensure CLI output emits the same `validators_run` field. The CLI is a thin wrapper around the MCP tool; it should re-print the JSON unchanged.

### 4. Rebuild dist

Rebuild `tools/world-mcp/dist/` and `tools/validators/dist/` per existing build flow.

### 5. Skill prose update

In `.claude/skills/canon-addition/SKILL.md` Procedure step 8, add a sentence pointing operators at the new `validators_run` field as the per-test pass-confirmation source for Phase 14a Validation Checklist construction. Mirror in `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` §Phase 14a Tests detailed criteria.

## Files to Touch

- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — extend response shape, populate from framework)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — surface field in CLI output)
- `tools/validators/src/framework/run.ts` (modify — upgrade `validators_run` return shape from `string[]` to `ValidatorRunEntry[]` if not already)
- `tools/validators/src/framework/types.ts` (modify — type the upgraded shape)
- `tools/world-mcp/dist/**` (rebuilt)
- `tools/validators/dist/**` (rebuilt)
- `.claude/skills/canon-addition/SKILL.md` (modify — Procedure step 8 hint)
- `.claude/skills/canon-addition/references/counterfactual-and-verdict.md` (modify — §Phase 14a Tests detailed criteria preamble)

## Out of Scope

- Changing validator semantics or order of execution.
- Changing the `verdicts[]` shape on FAIL responses.
- Adding new validators.
- Surfacing per-validator data in tools other than `validate_patch_plan` and `submit_patch_plan`.
- FOUNDATIONS amendments — Rule traceability is already implicit; this ticket realizes it at the MCP boundary.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__validate_patch_plan(envelope)` on a passing envelope returns `{ status: "pass", verdicts: [], validators_run: ValidatorRunEntry[] }` with at least one entry per executed validator.
2. The shape of each `ValidatorRunEntry` matches the shape that `submit_patch_plan` already returns (`validator_name`, `status`, `duration_ms`) — bytewise-identical schema.
3. On a FAIL envelope, `validators_run` still includes ALL executed validators (the failing ones with `status: fail`, the passing ones with `status: pass`, the skipped ones with `status: skipped`); `verdicts[]` continues to enumerate the failure verdicts.
4. On a `skipped` (envelope-shape rejected) response, `validators_run: []` and `verdicts: []` both empty (envelope didn't reach validation).
5. CLI `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` prints the new `validators_run` field in its JSON output.
6. A canon-addition dry-run mapping the 14 Phase 14a tests against the response's `validators_run` confirms each mechanical-layer test has a corresponding validator entry with `status: pass`.

### Invariants

1. The validate and submit MCP tools produce identical `validators_run` shape (paired-surface symmetry).
2. Per-validator data is the framework's responsibility; both tool wrappers consume it.
3. Additive-only change: existing consumers reading `status` and `verdicts` continue to work.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/validate-patch-plan.test.ts` (new test cases) — assert `validators_run` is populated on `pass`, `fail`, and `skipped` paths; assert per-entry shape matches submit's.
2. `tools/validators/test/framework/run.test.ts` (existing tests updated) — assert `validators_run` return shape is now `ValidatorRunEntry[]` not `string[]`.
3. `tools/world-mcp/test/cli/validate-patch-plan.test.ts` — assert CLI output contains the field.

### Commands

1. `pnpm --filter @worldloom/world-mcp test` — runs new and existing MCP-tool tests.
2. `pnpm --filter @worldloom/validators test` — confirms framework return-shape upgrade doesn't regress validator semantics.
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/<existing-fixture>.json` — smoke test: response includes `validators_run` array with all expected validator names.
