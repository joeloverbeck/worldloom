# CHARGENMCP-003: `validate_patch_plan` must return explicit status, not opaque empty `verdicts`

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/validate-patch-plan.ts`; `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`; `docs/MACHINE-FACING-LAYER.md`
**Deps**: none

## Problem

During the Namahan character-generation run (2026-04-27), I called `mcp__worldloom__validate_patch_plan` with a stub patch plan envelope (correct shape but truncated `body_markdown` and placeholder `approval_token`) before signing the real token. The response was `{"verdicts":[]}`. An empty `verdicts` array is ambiguous: it could mean "all checks passed cleanly," "no checks ran because the envelope is incomplete," or "the validator skipped this envelope shape." There is no `status` field, no `reason` field, and no machine-distinguishable signal between a clean pass and a no-op skip. The skill workflow has to guess, and "validate before submit" loses its informational value when the validator can't say whether it actually validated.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/tools/validate-patch-plan.ts:15` defines `verdicts: Verdict[]` as the response shape. There is no top-level `status` discriminator. The handler runs the pre-apply validators (the same code path used by `submit_patch_plan` per `tools/world-mcp/src/tools/submit-patch-plan.ts:47`), collects verdicts, and returns. An empty list means "no validator emitted a verdict" — which can occur when no validator is applicable to the envelope as written, or when the envelope is malformed in a way the validators do not recognize.
2. `tools/world-mcp/src/tools/submit-patch-plan.ts:47-54` filters `verdicts` for `severity === 'fail'` and constructs a `validation_failed` error if any are present. The existing failure path is well-defined; the missing piece is a positive "validation ran cleanly" signal.
3. Cross-tool boundary under audit: the contract between `validate_patch_plan` (deliverer) and skill workflows (consumer). Today the skill cannot distinguish "validator ran and approved" from "validator did not run." This is a small but real API gap.
4. FOUNDATIONS principle under audit: HARD-GATE discipline depends on validate → present → approve → submit. If the validator's response is opaque, the "validate before HARD-GATE present" step in skill workflows produces no useful signal, and skills end up trusting structural shape alone — which weakens the validate-then-submit chain documented in `docs/HARD-GATE-DISCIPLINE.md` §Approval token discipline indirectly. This ticket strengthens that chain by making the validator's signal honest.
5. HARD-GATE / canon-write ordering: not touched. This ticket modifies a read-only validation endpoint. The submit path (`submit_patch_plan`) and its pre-apply validators are unchanged in semantics.
6. Schema extension: the response gains a top-level `status` enum (`'pass' | 'fail' | 'skipped'`) and an optional `reason` string. The existing `verdicts` field is retained verbatim for backward shape compatibility. Skills that read only `verdicts.length === 0` continue to work but can be progressively migrated to read `status`.
7. Adjacent contradictions exposed by reassessment: none. The change is local to the validate endpoint's response shape.

## Architecture Check

1. A discriminated `status` field is the standard pattern for "did this run." Empty-array as proxy for status is brittle and fails the "explicit over implicit" principle. Adding an explicit field is cleaner than asking every caller to interpret silence.
2. No backwards-compatibility aliasing/shims introduced. The existing `verdicts` field stays in the response unchanged; the new `status` field is additive.

## Verification Layers

1. A well-formed envelope with all fields present and no validator failures returns `status: 'pass'` with `verdicts: []` — schema validation.
2. A well-formed envelope with at least one failing validator returns `status: 'fail'` with `verdicts: [...]` non-empty — schema validation.
3. A malformed or stub envelope (missing required fields the validators require to even run) returns `status: 'skipped'` with `reason: '<short description>'` and `verdicts: []` — schema validation.
4. The submit path (`submit_patch_plan`) continues to work unchanged — codebase grep-proof + existing submit tests pass.
5. FOUNDATIONS alignment — strengthens HARD-GATE discipline's validate-before-present step — FOUNDATIONS alignment check.

## What to Change

### 1. Extend the validate response shape

Edit `tools/world-mcp/src/tools/validate-patch-plan.ts`:

```ts
export type ValidatePatchPlanResponse =
  | { status: "pass"; verdicts: [] }
  | { status: "fail"; verdicts: Verdict[] }
  | { status: "skipped"; reason: string; verdicts: [] };
```

Implementation:
- run the pre-apply validators
- if any verdict has `severity === 'fail'`, return `status: 'fail'` with the full verdicts array
- if validators ran and produced no fail-severity verdicts, return `status: 'pass'` with `verdicts: []`
- if the envelope is malformed in a way that prevents any validator from running (missing `plan_id`, missing `target_world`, missing `patches[]`, etc.), return `status: 'skipped'` with `reason` describing the structural reason

### 2. Update tool description

In `tools/world-mcp/src/server.ts`, update the registered description to: "Validate a patch plan envelope without mutating world content. Returns `status: 'pass' | 'fail' | 'skipped'` with verdicts and an optional skip reason."

### 3. Document

Update `docs/MACHINE-FACING-LAYER.md` `validate_patch_plan` row to describe the three-state response.

### 4. Tests

Update `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (or create if absent) covering:
- well-formed envelope, no failures → `status: 'pass'`
- well-formed envelope, at least one fail-severity verdict → `status: 'fail'` with verdicts
- malformed envelope (missing `plan_id`) → `status: 'skipped'` with reason mentioning the missing field
- malformed envelope (empty `patches`) → `status: 'skipped'` with reason

## Files to Touch

- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — description string)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (new or extend)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval table row)

## Out of Scope

- Changes to the pre-apply validator framework itself (`tools/validators/`) — the validator semantics are unchanged; only the wrapper response shape is extended.
- Changes to `submit_patch_plan` — the submit path's existing fail-collection logic continues unchanged.
- Adding new validators.

## Acceptance Criteria

### Tests That Must Pass

1. New / extended `validate-patch-plan.test.ts` covers all three status outcomes.
2. `pnpm --filter world-mcp test` passes.
3. Existing `tools/world-mcp/tests/integration/*` tests pass without modification (no consumer reads the response shape strictly today; the change is additive).
4. `pnpm turbo test` passes (full pipeline gate).

### Invariants

1. The validate response is always discriminated by `status`. Callers can rely on a positive signal for "validation ran cleanly," not on empty-array inference.
2. The `verdicts` field is always present (possibly empty) — back-compat for callers reading only `verdicts`.
3. `status: 'skipped'` always carries a non-empty `reason` string.
4. The submit path's failure semantics are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — three-state coverage (pass / fail / skipped) plus existing structural-validation cases.

### Commands

1. `pnpm --filter world-mcp test --testPathPattern=tools/validate-patch-plan`
2. `pnpm --filter world-mcp test`
3. `pnpm turbo test`
