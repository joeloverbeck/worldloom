# PPSUBMIT-001: Submit path must validate attached page-plan drafts

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — updates `tools/world-mcp` submit-path input schema, handler, CLI, tests, and same-seam submit/validate documentation. No validator logic, schema, or world-content changes.
**Deps**: `archive/tickets/PPENGVOC-001-per-section-policy-engine-vocabulary-cleanliness.md`

## Problem

`validate_patch_plan` accepts `page_plan_drafts` and passes them into the validator runner, so page-plan body validators can inspect the candidate `pages-prose-plans/PG-<integer>.md` bytes before approval. `submit_patch_plan` does not accept the same draft payload. Its pre-apply validator call runs with only the patch-plan envelope, so `pagePlanTargets()` sees no draft files in pre-apply mode and page-plan body validators skip.

That leaves a validation asymmetry at the HARD-GATE boundary: a dry-run can fail on attached page-plan drafts, but submit can succeed without checking the same draft bytes. `PPENGVOC-001` made the body-engine-vocabulary policy precise enough for submit-path enforcement; this ticket wires the submit path to exercise that policy when a page plan is being committed.

## Assumption Reassessment (2026-05-27)

1. `tools/world-mcp/src/server.ts` defines `validatePatchPlanInputSchema` with optional `page_plan_drafts`, while `submitPatchPlanInputSchema` currently includes only `patch_plan` and `approval_token`. The public MCP schema therefore exposes the draft payload only on validation, not submission.
2. `tools/world-mcp/src/tools/validate-patch-plan.ts` validates `page_plan_drafts` shape, converts it to `runOpts.pagePlanDrafts`, and calls `runValidatePatchPlan(envelope, runOpts)`. `tools/world-mcp/src/tools/submit-patch-plan.ts` calls `runPreApplyValidators(envelope, worldRootOpts)` inside the engine `preApplyValidator` callback and has no draft argument to pass through.
3. Shared boundary under audit: `validate_patch_plan` and `submit_patch_plan` should run the same page-plan-content validators over the same attached draft bytes when page-plan direct-write artifacts are part of the HARD-GATE deliverable. This is a `tools/world-mcp` public input/handler/CLI contract, not a validators-package policy change.
4. FOUNDATIONS alignment: FOUNDATIONS §Story Bundles treats the plan as engine-readable and validation-bearing. `docs/HARD-GATE-DISCIPLINE.md` says validation includes structural validators before submit. The submit path must not silently drop a validator input surface that the dry-run path used to approve the deliverable.
5. HARD-GATE / validation signal surface: this ticket strengthens submit-time pre-apply validation by making already-supported page-plan draft inputs available to submit. It must preserve approval-token verification, single-use semantics, and fail-closed behavior; no Mystery Reserve rule or canon-write discipline is weakened.
6. Archived adjacent ticket `archive/tickets/PPCANONINL-001-canonical-prose-sections-inliner-cli.md` explicitly excludes submit-path tightening. That ticket owns an authoring helper for §2/§3/§19 byte equality, not submit/validate parity.

## Architecture Check

1. The cleanest fix is parity: add optional `page_plan_drafts` to `submit_patch_plan` with the same shape and validation rules as `validate_patch_plan`, then pass those drafts into `runPreApplyValidators` inside `handleSubmitPatchPlanTool`. This keeps one validator runner policy and one draft payload shape across dry-run and submit.
2. The alternative — making validators read `pages-prose-plans/PG-*.md` from disk during pre-apply submit — would validate stale committed files or absent files instead of the candidate draft bytes. Rejected.
3. The alternative — embedding page plan markdown in the patch-plan envelope — would expand patch-engine envelope semantics and approval-token hashing for a direct-write artifact. This ticket does not need that larger architectural change; it only preserves validate/submit parity for the existing draft side-channel.
4. No backwards-compatibility shim. `page_plan_drafts` is optional and additive; existing submit callers continue to work, but page-plan-authoring skills should pass the same drafts they validated.

## Verification Layers

1. `submit_patch_plan` input schema and handler accept optional `page_plan_drafts` and pass them to the pre-apply validator runner -> handler test with a synthetic page-plan draft that fails `page_plan_body_engine_vocabulary_cleanliness`.
2. Submit CLI accepts `--page-plan-drafts <json>` with the same semantics as validate CLI -> CLI argument/unit test or direct compiled CLI smoke.
3. Documentation surfaces describe validate/submit parity for page-plan drafts -> grep/manual review of `docs/HARD-GATE-DISCIPLINE.md`, `tools/world-mcp/README.md` if present, and `branching-story-turn-cycle` submit guidance when in scope.
4. Approval-token behavior remains unchanged -> existing submit-path approval-token tests still pass, plus a focused submit handler test proves validation failure happens inside the pre-apply validator callback rather than before token verification is bypassed.

## What to Change

### 1. Add `page_plan_drafts` to submit-path public input

Update `tools/world-mcp/src/server.ts` `submitPatchPlanInputSchema` to accept optional `page_plan_drafts` with the same array-of-`{path, content}` shape as `validatePatchPlanInputSchema`.

Update `tools/world-mcp/src/tools/submit-patch-plan.ts`:

- extend `SubmitPatchPlanArgs` with `page_plan_drafts?: ReadonlyArray<{ path: string; content: string }>`
- reuse or share the validate-path `validatePagePlanDraftsShape` logic instead of duplicating drift-prone validation
- pass `pagePlanDrafts` into `runPreApplyValidators(envelope, ...)` when the array is present and non-empty
- keep `approval_token` validation and engine submission semantics unchanged

### 2. Add submit CLI support

Update `tools/world-mcp/src/cli/submit-patch-plan.ts` to accept `--page-plan-drafts <json-path>` in the same JSON format as `validate-patch-plan`.

The CLI should pass the parsed draft array into `handleSubmitPatchPlanTool` and report malformed draft JSON as a normal CLI input error. Keep existing positional `<plan-path> <token-path>` behavior unchanged.

### 3. Add focused tests

Add or update `tools/world-mcp` tests to prove:

- submit handler returns a validator failure when an attached draft contains a page-plan body validator fail
- submit handler still skips page-plan body validators when no drafts are attached, preserving current non-page-plan behavior
- malformed `page_plan_drafts` shape returns `invalid_input`
- submit CLI forwards `--page-plan-drafts` into the handler path
- existing approval-token malformed/replay/expired tests still exercise the same token behavior

### 4. Truth same-seam docs

Update same-seam docs and guidance that currently describe page-plan drafts only on validate:

- `docs/HARD-GATE-DISCIPLINE.md`
- `tools/world-mcp/README.md` when submit/validate CLI usage is documented there
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` if it describes submit without passing the same drafts

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` or a shared helper module (modify/new, only if needed to share draft-shape validation)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (modify)
- `tools/world-mcp/tests/**` (modify/new focused submit-path tests)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `tools/world-mcp/README.md` (modify if submit/validate CLI docs mention the input surface)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify if submit guidance needs the parity note)

## Out of Scope

- Changing `page_plan_body_engine_vocabulary_cleanliness` or any other validator's policy. `PPENGVOC-001` already owns the per-section policy prerequisite.
- Making page-plan markdown an atomic `_source` patch-engine operation.
- Requiring page-plan drafts for every submit call. Non-page-plan patch plans remain valid without `page_plan_drafts`.
- Retrofitting existing historical envelopes such as `/tmp/red-bunny-pg-6-envelope.json`.
- Implementing the canonical prose-section inliner from `archive/tickets/PPCANONINL-001-canonical-prose-sections-inliner-cli.md`.

## Acceptance Criteria

### Tests That Must Pass

1. New submit handler test: with `page_plan_drafts` containing a §1 body with three record IDs, `handleSubmitPatchPlanTool` returns `validator_failed` and includes `page_plan_body_engine_vocabulary_cleanliness.fail`.
2. New submit handler test: with the same patch envelope and no `page_plan_drafts`, page-plan body validators remain skipped rather than reading disk.
3. New submit handler or server schema test: malformed `page_plan_drafts` returns `invalid_input` with the same path/content shape rules as validate.
4. New submit CLI test or compiled smoke in `tools/world-mcp/tests/cli/submit-patch-plan.test.ts`: `--page-plan-drafts` forwards drafts into submit validation.
5. `cd tools/world-mcp && npm test && npm run build` passes.
6. `cd tools/validators && npm test && npm run build` passes if any shared validator helper/export is touched.

### Invariants

1. Validate and submit use one page-plan-draft payload shape and validation rule.
2. Approval-token validation and patch-engine submit ordering remain unchanged.
3. The submit path stays fail-closed: malformed draft input returns `invalid_input`; validator failures return `validator_failed`; no page-plan markdown is written by the submit handler.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/**/submit-patch-plan*.test.ts` — add focused handler coverage for page-plan draft validator parity and malformed draft input.
2. `tools/world-mcp/tests/cli/**` or existing submit CLI test file — add `--page-plan-drafts` CLI forwarding coverage if a CLI harness exists.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan.test.js` — targeted proof.
2. `cd tools/world-mcp && npm test && npm run build` — full world-mcp package proof.
3. `cd tools/validators && npm test && npm run build` — only required if implementation touches validators shared helper/export code.
