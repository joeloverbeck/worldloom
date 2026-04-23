# SPEC02RETMCPSER-010: Phase 1 stubs — validate_patch_plan + submit_patch_plan

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/validate-patch-plan.ts` and `src/tools/submit-patch-plan.ts` as Phase 1 sentinel stubs.
**Deps**: SPEC02RETMCPSER-003

## Problem

The MCP server must expose `validate_patch_plan` and `submit_patch_plan` tools in Phase 1 so skills and the machine-layer-enabled read path treat the tool surface as already complete. But the engine (SPEC-03) and validator framework (SPEC-04) are Phase 2 deliverables — they aren't built yet. Phase 1 stubs return structured sentinel errors (`validator_unavailable`, `phase1_stub`) so skills attempting to use these tools get actionable feedback, not undefined behavior, and the Phase 2 wiring (`submit_patch_plan` → SPEC-03 engine; `validate_patch_plan` → SPEC-04 validators) is a drop-in replacement that does not change the tool's name or shape.

## Assumption Reassessment (2026-04-23)

1. `tools/world-mcp/src/errors.ts` (landed in -003) already declares the `validator_unavailable` and `phase1_stub` error codes. `tools/world-mcp/src/tools/` directory exists as placeholder from -001.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Tool surface Tool 8 (lines 155–161) and Tool 9 (lines 163–172) are authoritative. Phase 1 behavior for tool 9 is explicit: `{code: 'phase1_stub', message: 'Engine integration activates in Phase 2 per SPEC-08.'}`. For tool 8, the Phase 1 behavior is `validator_unavailable` when the validators package is not yet built. `specs/IMPLEMENTATION-ORDER.md:47` confirms "SPEC-02 MCP Retrieval Server — full tool surface with `submit_patch_plan` stubbed".
3. Cross-artifact boundary under audit: the stub output shape must match the production shape exactly in every field except the return value. Callers that later see a non-stub response must get the expected patch receipt or validator verdict shape, not a stub shape masquerading as success.

## Architecture Check

1. Returning structured error codes is cleaner than throwing, because MCP tools already return discriminated-union `Result | McpError` shapes; a throw would break the convention.
2. Phase 1 stubs with well-named error codes (`phase1_stub`, `validator_unavailable`) are cleaner than silent no-ops or fake-success returns — they make the Phase 1 state visible to callers.
3. No backwards-compatibility shims.

## Verification Layers

1. Phase 1 stub semantics → unit test: `submit_patch_plan({plan_id, target_world, approval_token, patches})` returns `{code: 'phase1_stub', message: ...}` without attempting engine import.
2. `validate_patch_plan` Phase 1 behavior → unit test: with no `tools/validators/dist/` present, `validate_patch_plan(plan)` returns `{code: 'validator_unavailable'}`; with the package present, delegates (Phase 1.5 behavior stubbed until SPEC-04 lands — for now, both states fall through to `validator_unavailable`).
3. Input shape validation still occurs before the stub return → unit test: `submit_patch_plan({})` (missing required fields) returns an input-validation error, not `phase1_stub`. The stub is only reached on well-formed input.

## What to Change

### 1. `tools/world-mcp/src/tools/validate-patch-plan.ts`

Export async `validatePatchPlan(args: {patch_plan: PatchPlanEnvelope}): Promise<{verdicts: Verdict[]} | McpError>`:

1. Validate input shape (plan has required fields per spec §Tool surface Tool 8 line 156 and SPEC-03 Edit Contract envelope).
2. In Phase 1, return `{code: 'validator_unavailable', message: 'SPEC-04 validator framework not yet built; activates in Phase 2 per SPEC-08.'}`.
3. Scaffold the Phase 2 branch: a TODO comment + `import('@worldloom/validators')` stub so the Phase 2 replacement is a minimal PR.

### 2. `tools/world-mcp/src/tools/submit-patch-plan.ts`

Export async `submitPatchPlan(args: {patch_plan: PatchPlanEnvelope, approval_token: string}): Promise<PatchReceipt | McpError>`:

1. Validate input shape (plan + token both non-empty, plan has at least one patch).
2. In Phase 1, return `{code: 'phase1_stub', message: 'Engine integration activates in Phase 2 per SPEC-08.'}`.
3. Scaffold the Phase 2 branch: a TODO comment + `import('@worldloom/patch-engine')` stub.

### 3. Shared input-validation helpers

A minimal `validatePatchPlanEnvelopeShape(plan): McpError | null` helper in `src/tools/_shared.ts` (extended from -005) that confirms required envelope fields (plan_id, target_world, approval_token, patches array, each patch has op + target_file). Per spec §Tool surface Tool 8/9 and SPEC-03 Edit Contract envelope (lines 103–140 of specs/SPEC-03-patch-engine.md).

### 4. Tests

- `tests/tools/validate-patch-plan.test.ts`
- `tests/tools/submit-patch-plan.test.ts`

## Files to Touch

- `tools/world-mcp/src/tools/validate-patch-plan.ts` (new)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (new)
- `tools/world-mcp/src/tools/_shared.ts` (modify — add envelope-shape validator)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new)
- `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` (new)

## Out of Scope

- Actually calling `tools/validators/` — Phase 2 wiring; this ticket's Phase 1 branch stops before the delegate.
- Actually calling `tools/patch-engine/` — Phase 2 wiring; same boundary.
- Verifying approval_token — verification lives in the engine (SPEC-03); this ticket's stub does not verify.
- Writing to `approval_tokens_consumed` table — engine-owned.
- Wiring tools into `src/server.ts` — lands in -011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — both stub tests pass.
2. `submit_patch_plan({plan_id: 'test', target_world: 'seeded', approval_token: 'unused', verdict: 'ACCEPT', originating_skill: 'canon-addition', expected_id_allocations: {}, patches: [{op: 'insert_before_node', target_world: 'seeded', target_file: 'x.md', payload: {body: 'x'}}]})` returns `{code: 'phase1_stub'}`.
3. `validate_patch_plan(samePlan)` returns `{code: 'validator_unavailable'}` in Phase 1.
4. Missing required fields in the plan envelope return an input-validation error, not a stub code — shape check runs first.

### Invariants

1. Stub return values use the exact error codes from spec §Error taxonomy: `phase1_stub` for submit, `validator_unavailable` for validate. No ad-hoc alternative codes.
2. Stub output shape does not leak placeholder fields that could be mistaken for Phase 2 success (e.g., no partial `PatchReceipt` with a `stub: true` flag). Error or nothing.
3. Both tools accept the exact same `patch_plan` envelope shape as Phase 2 will — the shape is stable from Phase 1; only the return path changes.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — 3 scenarios: valid input → `validator_unavailable`; malformed plan → input-validation error; empty patches array → input-validation error.
2. `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` — 3 scenarios: valid input → `phase1_stub`; malformed plan → input-validation error; missing approval_token → input-validation error.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/validate-patch-plan.test.js dist/tests/tools/submit-patch-plan.test.js`
2. Stub-code grep-proof: `grep -nE "phase1_stub" tools/world-mcp/src/tools/submit-patch-plan.ts` returns ≥ 1 match; `grep -nE "validator_unavailable" tools/world-mcp/src/tools/validate-patch-plan.ts` returns ≥ 1 match.
