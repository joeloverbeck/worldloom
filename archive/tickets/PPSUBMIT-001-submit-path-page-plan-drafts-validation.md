# PPSUBMIT-001: Submit path must validate attached page-plan drafts

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — updated `tools/world-mcp` submit-path input schema, handler, CLI, tests, and same-seam submit/validate documentation. No validator-package logic, JSON Schema, or world-content changes.
**Deps**: `archive/tickets/PPENGVOC-001-per-section-policy-engine-vocabulary-cleanliness.md`

## Problem

Before this ticket, `validate_patch_plan` accepted `page_plan_drafts` and passed them into the validator runner, so page-plan body validators could inspect the candidate `pages-prose-plans/PG-<integer>.md` bytes before approval. `submit_patch_plan` did not accept the same draft payload. Its pre-apply validator call ran with only the patch-plan envelope, so `pagePlanTargets()` saw no draft file inputs in pre-apply mode and page-plan body validators produced no draft-body verdicts.

That left a validation asymmetry at the HARD-GATE boundary: a dry-run could fail on attached page-plan drafts, but submit could succeed without checking the same draft bytes. `PPENGVOC-001` made the body-engine-vocabulary policy precise enough for submit-path enforcement; this ticket wires the submit path to exercise that policy when a page plan is being committed.

## Assumption Reassessment (2026-05-27)

1. At intake, `tools/world-mcp/src/server.ts` defined `validatePatchPlanInputSchema` with optional `page_plan_drafts`, while `submitPatchPlanInputSchema` included only `patch_plan` and `approval_token`. The landed public MCP schema now exposes optional `page_plan_drafts` on both validation and submission.
2. At intake, `tools/world-mcp/src/tools/validate-patch-plan.ts` validated `page_plan_drafts` shape, converted it to `runOpts.pagePlanDrafts`, and called `runValidatePatchPlan(envelope, runOpts)`. `tools/world-mcp/src/tools/submit-patch-plan.ts` called `runPreApplyValidators(envelope, worldRootOpts)` inside the engine `preApplyValidator` callback and had no draft argument to pass through. The landed submit handler reuses the validate-path shape check and passes `pagePlanDrafts` into the pre-apply runner.
3. Shared boundary under audit: `validate_patch_plan` and `submit_patch_plan` should run the same page-plan-content validators over the same attached draft bytes when page-plan direct-write artifacts are part of the HARD-GATE deliverable. This is a `tools/world-mcp` public input/handler/CLI contract, not a validators-package policy change.
4. FOUNDATIONS alignment: FOUNDATIONS §Story Bundles treats the plan as engine-readable and validation-bearing. `docs/HARD-GATE-DISCIPLINE.md` says validation includes structural validators before submit. The submit path must not silently drop a validator input surface that the dry-run path used to approve the deliverable.
5. HARD-GATE / validation signal surface: this ticket strengthens submit-time pre-apply validation by making already-supported page-plan draft inputs available to submit. It must preserve approval-token verification, single-use semantics, and fail-closed behavior; no Mystery Reserve rule or canon-write discipline is weakened.
6. Archived adjacent ticket `archive/tickets/PPCANONINL-001-canonical-prose-sections-inliner-cli.md` explicitly excludes submit-path tightening. That ticket owns an authoring helper for §2/§3/§19 byte equality, not submit/validate parity.
7. Same-seam public documentation was broader than the draft's initial list: `docs/MACHINE-FACING-LAYER.md` documents validate/submit CLI command shapes and stale-validator-bundle escape-valve usage, and `.claude/skills/branching-story-turn-cycle/SKILL.md` contains the operational submit incantation. Both moved with the submit API.
8. Reassessment correction from proof: when a `create_pg_record` patch is submitted without `page_plan_drafts`, `page_plan_body_engine_vocabulary_cleanliness` reports `pass` with zero page-plan targets rather than `skipped`. The invariant is unchanged: no draft-body verdict is produced because no draft bytes are available.

## Architecture Check

1. The cleanest fix is parity: add optional `page_plan_drafts` to `submit_patch_plan` with the same shape and validation rules as `validate_patch_plan`, then pass those drafts into `runPreApplyValidators` inside `handleSubmitPatchPlanTool`. This keeps one validator runner policy and one draft payload shape across dry-run and submit.
2. The alternative — making validators read `pages-prose-plans/PG-*.md` from disk during pre-apply submit — would validate stale committed files or absent files instead of the candidate draft bytes. Rejected.
3. The alternative — embedding page plan markdown in the patch-plan envelope — would expand patch-engine envelope semantics and approval-token hashing for a direct-write artifact. This ticket does not need that larger architectural change; it only preserves validate/submit parity for the existing draft side-channel.
4. No backwards-compatibility shim. `page_plan_drafts` is optional and additive; existing submit callers continue to work, but page-plan-authoring skills should pass the same drafts they validated.

## Verification Layers

1. `submit_patch_plan` input schema and handler accept optional `page_plan_drafts` and pass them to the pre-apply validator runner -> handler test with a synthetic page-plan draft that fails `page_plan_body_engine_vocabulary_cleanliness`.
2. Submit CLI accepts `--page-plan-drafts <json>` with the same semantics as validate CLI -> CLI argument/unit test or direct compiled CLI smoke.
3. Documentation surfaces describe validate/submit parity for page-plan drafts -> manual review of `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, and `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`.
4. Approval-token behavior remains unchanged -> existing submit-path approval-token tests still pass, plus a focused submit handler test proves validation failure happens inside the pre-apply validator callback rather than before token verification is bypassed.

## Landed Changes

### 1. Added `page_plan_drafts` to submit-path public input

Updated `tools/world-mcp/src/server.ts` `submitPatchPlanInputSchema` to accept optional `page_plan_drafts` with the same array-of-`{path, content}` shape as `validatePatchPlanInputSchema`.

Updated `tools/world-mcp/src/tools/submit-patch-plan.ts`:

- extended `SubmitPatchPlanArgs` with `page_plan_drafts?: ReadonlyArray<PagePlanDraft>`
- exported and reused the validate-path `validatePagePlanDraftsShape` / `PagePlanDraft` contract
- passed `pagePlanDrafts` into `runPreApplyValidators(envelope, ...)` when the array is present and non-empty
- kept `approval_token` validation and engine submission semantics unchanged

### 2. Added submit CLI support

Updated `tools/world-mcp/src/cli/submit-patch-plan.ts` to accept `--page-plan-drafts <json-path>` in the same JSON format as `validate-patch-plan`.

The CLI passes the parsed draft array into `handleSubmitPatchPlanTool` and reports malformed/non-array draft JSON as a normal CLI input error. Existing positional `<plan-path> <token-path>` behavior is unchanged.

### 3. Added focused tests

Added `tools/world-mcp` tests proving:

- submit handler returns a validator failure when an attached draft contains a page-plan body validator fail
- submit handler does not produce page-plan body verdicts when no drafts are attached
- malformed `page_plan_drafts` shape returns `invalid_input`
- submit CLI forwards `--page-plan-drafts` into the handler path
- existing approval-token/malformed-submit tests still exercise the same token/input behavior

### 4. Truth same-seam docs

Updated same-seam docs and guidance that described page-plan drafts only on validate:

- `docs/HARD-GATE-DISCIPLINE.md`
- `docs/MACHINE-FACING-LAYER.md`
- `tools/world-mcp/README.md`
- `.claude/skills/branching-story-turn-cycle/SKILL.md`
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md`

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (modify)
- `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify)
- `.claude/skills/branching-story-turn-cycle/references/phase-9-validation-gates.md` (modify)

## Out of Scope

- Changing `page_plan_body_engine_vocabulary_cleanliness` or any other validator's policy. `PPENGVOC-001` already owns the per-section policy prerequisite.
- Making page-plan markdown an atomic `_source` patch-engine operation.
- Requiring page-plan drafts for every submit call. Non-page-plan patch plans remain valid without `page_plan_drafts`.
- Retrofitting existing historical envelopes such as `/tmp/red-bunny-pg-6-envelope.json`.
- Implementing the canonical prose-section inliner from `archive/tickets/PPCANONINL-001-canonical-prose-sections-inliner-cli.md`.

## Acceptance Criteria

### Tests That Must Pass

1. New submit handler test: with `page_plan_drafts` containing a §1 body with three record IDs, `handleSubmitPatchPlanTool` returns `validator_failed` and includes `page_plan_body_engine_vocabulary_cleanliness.fail`.
2. New submit handler test: with the same patch envelope and no `page_plan_drafts`, page-plan body validators produce no body-cleanliness verdicts rather than reading disk.
3. New submit handler or server schema test: malformed `page_plan_drafts` returns `invalid_input` with the same path/content shape rules as validate.
4. New submit CLI test or compiled smoke in `tools/world-mcp/tests/cli/submit-patch-plan.test.ts`: `--page-plan-drafts` forwards drafts into submit validation.
5. `cd tools/world-mcp && npm test` passes after rebuilding.
6. `cd tools/validators && npm test && npm run build` was not required because no validators package source, schema, or export was touched.

### Invariants

1. Validate and submit use one page-plan-draft payload shape and validation rule.
2. Approval-token validation and patch-engine submit ordering remain unchanged.
3. The submit path stays fail-closed: malformed draft input returns `invalid_input`; validator failures return `validator_failed`; no page-plan markdown is written by the submit handler.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` — added focused handler coverage for page-plan draft validator parity, malformed draft input, and absent-drafts behavior.
2. `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` — added `--page-plan-drafts` CLI forwarding and non-array draft JSON coverage.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/tools/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan.test.js` — targeted proof.
2. `cd tools/world-mcp && npm test` — full world-mcp package proof, including build.
3. Validators package proof not required; the shared draft helper lives in `tools/world-mcp/src/tools/validate-patch-plan.ts`, not in `tools/validators`.

## Outcome

Implemented submit-path page-plan draft parity in `tools/world-mcp`. `submit_patch_plan` now accepts optional `page_plan_drafts` through the MCP input schema, the handler validates the draft array with the same shape rules as `validate_patch_plan`, and submit-time pre-apply validation receives those draft bytes before any patch-engine write. The submit CLI now accepts `--page-plan-drafts <json-path>` and forwards parsed drafts into the same handler path.

Same-seam documentation now tells operators to pass the same page-plan draft bytes to validate and submit, including MCP and CLI forms in HARD-GATE discipline, machine-facing docs, package README, and turn-cycle submit guidance.

## Verification Result

1. Baseline before edits: `cd tools/world-mcp && npm test` passed with 490 tests passing.
2. `cd tools/world-mcp && npm run build` passed after implementation.
3. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan-args.test.js` passed after implementation.
4. Final `cd tools/world-mcp && npm test` passed with 495 tests passing.
5. Manual review confirmed docs now describe `page_plan_drafts` / `--page-plan-drafts` on both validate and submit paths.

## Deviations

1. The drafted no-drafts assertion said the page-plan body validator would be `skipped`. Live validator behavior for a `create_pg_record` patch with no attached drafts is `pass` with zero targets and no body-cleanliness verdicts. The test and acceptance text were corrected to the behavior that matters: submit does not read disk or fabricate page-plan body input when drafts are absent.
2. `docs/MACHINE-FACING-LAYER.md` and `.claude/skills/branching-story-turn-cycle/SKILL.md` were added to the landed file set during reassessment because they document the same public submit command/API surface.
3. The validators package proof was not run because no `tools/validators` source, schema, or export changed.
