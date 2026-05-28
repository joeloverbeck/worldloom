# SPEC93DECSTATUR-004: Remove the page_plan_drafts argument and its validator-framework plumbing

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`server.ts`, `tools/{validate,submit}-patch-plan.ts`, `cli/{validate,submit}-patch-plan.ts`, `PagePlanDraft`/`validatePagePlanDraftsShape`); `tools/validators` (`public/index.ts` `RunOptions.pagePlanDrafts`)
**Deps**: SPEC93DECSTATUR-003

## Problem

The `page_plan_drafts` argument was the channel that fed page-plan markdown drafts into the validator run-loop so the page-plan structural validators could check them at dry-run. With those validators retired (SPEC93DECSTATUR-003), the argument and its plumbing are dead. SPEC-93 §2.1 removes the `page_plan_drafts` argument from `validate_patch_plan` / `submit_patch_plan` (MCP tools + CLIs + server registration), the `PagePlanDraft` type and `validatePagePlanDraftsShape` helper in world-mcp, and the `RunOptions.pagePlanDrafts` plumbing in the validators public API.

## Assumption Reassessment (2026-05-28)

1. `page_plan_drafts` is a live optional argument in `tools/world-mcp/src/tools/{validate,submit}-patch-plan.ts` (declared + `validatePagePlanDraftsShape`-checked + forwarded as `runOpts.pagePlanDrafts`), `cli/{validate,submit}-patch-plan.ts`, and `server.ts`; it is consumed by `tools/validators/src/public/index.ts:43,52` (`RunOptions.pagePlanDrafts`) — confirmed during SPEC-93 reassessment (this session, Improvement M1).
2. SPEC-93 §2.1 + §6 (world-mcp + validators bullets, post-reassessment) enumerate the full removal surface including the validators `public/index.ts` plumbing and the `PagePlanDraft`/`validatePagePlanDraftsShape` helper.
3. Cross-artifact boundary: `page_plan_drafts` crosses `world-mcp` (tool/CLI args) ↔ `tools/validators` (`RunOptions`); `branching-story-turn-cycle` passes it (consumer-side removal in SPEC93DECSTATUR-007). The arg is the shared surface under audit.
4. (was template item 7 — removed-arg blast radius) Grep pipeline-wide for `page_plan_drafts` / `pagePlanDrafts` / `PagePlanDraft` / `validatePagePlanDraftsShape`: world-mcp `server.ts` + 4 tool/CLI files + 3 tests, validators `public/index.ts` + `tests/integration/validate-patch-plan.test.ts`, and `branching-story-turn-cycle` skill (007). Remove every production site; update tests; the skill consumer is reconciled in 007.

## Architecture Check

1. Removing the argument after retiring its consumer validators (Deps 003) leaves no dead plumbing — the optional arg becomes unreferenced, so its removal is non-breaking for existing callers that omit it.
2. No backwards-compatibility shim: the argument, type, helper, and `RunOptions` field are deleted outright, not deprecated-but-accepted.

## Verification Layers

1. Argument removed from MCP tool + CLI surfaces -> codebase grep-proof (`page_plan_drafts` absent from world-mcp `src/`).
2. Validator-framework plumbing removed -> codebase grep-proof (`pagePlanDrafts` absent from `tools/validators/src/public/index.ts`).
3. Type/helper removed -> codebase grep-proof (`PagePlanDraft` / `validatePagePlanDraftsShape` absent from world-mcp `src/`).
4. Patch submission still functions without the arg -> schema/integration test (submit/validate-patch-plan tests pass with no `page_plan_drafts`).

## What to Change

### 1. world-mcp tool + CLI + server

In `tools/world-mcp/src/tools/validate-patch-plan.ts` and `submit-patch-plan.ts`: remove the `page_plan_drafts?` input declaration, the `validatePagePlanDraftsShape` call, the `runOpts.pagePlanDrafts` / `validatorOpts.pagePlanDrafts` forwarding, the `PagePlanDraft` type, and `validatePagePlanDraftsShape`. Remove the corresponding arg handling in `cli/validate-patch-plan.ts`, `cli/submit-patch-plan.ts`, and the `server.ts` tool-input schema.

### 2. validators public API

In `tools/validators/src/public/index.ts`: remove `pagePlanDrafts?` from `RunOptions` (lines 43, 52) and the draft-mapping that fed the retired page-plan validators.

### 3. Tests

Update `tools/world-mcp/tests/{cli/submit-patch-plan,tools/submit-patch-plan,tools/validate-patch-plan}.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` to drop `page_plan_drafts` cases.

## Files to Touch

- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/validators/src/public/index.ts` (modify)
- `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)

## Out of Scope

- The `branching-story-turn-cycle` skill's removal of its `page_plan_drafts` calls (SPEC93DECSTATUR-007).
- `mcp-integration-audit`'s prose reference to `page_plan_drafts` as a required argument (SPEC93DECSTATUR-009).
- The retirement of the page-plan validators themselves (SPEC93DECSTATUR-003).

## Acceptance Criteria

### Tests That Must Pass

1. submit/validate-patch-plan tests pass with no `page_plan_drafts` argument anywhere.
2. `grep -rn "page_plan_drafts\|pagePlanDrafts\|PagePlanDraft\|validatePagePlanDraftsShape" tools/world-mcp/src tools/validators/src` returns zero matches.
3. `(cd tools/world-mcp && npm run build && npm test)` and `(cd tools/validators && npm run build && npm test)` green.

### Invariants

1. Patch validation/submission accepts no `page_plan_drafts`; existing callers that omit it are unaffected.
2. No dead `RunOptions.pagePlanDrafts` plumbing remains in the validators public API.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/{cli/submit-patch-plan,tools/submit-patch-plan,tools/validate-patch-plan}.test.ts` — drop `page_plan_drafts` cases.
2. `tools/validators/tests/integration/validate-patch-plan.test.ts` — drop `page_plan_drafts` cases.

### Commands

1. `(cd tools/world-mcp && npm run build && npm test)`
2. `(cd tools/validators && npm run build && npm test)`
