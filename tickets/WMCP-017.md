# WMCP-017: Truth plan_story_state_maintenance page-plan public docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/server.ts`, `docs/MACHINE-FACING-LAYER.md`, and focused world-mcp docs/capability proof.
**Deps**: `archive/tickets/SPEC93DECSTATUR-005.md`, `archive/tickets/WMCP-016.md`

## Problem

Post-ticket review of `archive/tickets/WMCP-016.md` found a separate public-surface drift in `plan_story_state_maintenance`: the live handler/test surface is planless, but two user-facing surfaces still tell operators to expect or write a maintenance page plan.

`tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` asserts `"maintenance_page_plan" in result` is false and `"write_page_plan" in result.next_steps` is false. `archive/tickets/SPEC93DECSTATUR-005.md` records the behavior change: `plan_story_state_maintenance` emits a planless maintenance `PG` and no maintenance page-plan payload. However, `tools/world-mcp/src/server.ts` still says the tool "returns the matching maintenance page-plan body" and instructs operators to "write the returned page plan exactly"; `docs/MACHINE-FACING-LAYER.md` still says operators must write `maintenance_page_plan.body` to `maintenance_page_plan.target_file`.

This is not unfinished WMCP-016 active-record parity work. It is a same-tool public contract cleanup so operators and `describe_capabilities` consumers are not directed to use a response field that the handler intentionally does not return.

## Assumption Reassessment (2026-05-29)

1. **Live behavior check.** `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` proves the current response omits `maintenance_page_plan` and omits `next_steps.write_page_plan`; the helper emits maintenance records plus audit/system repair `SE` and planless `PG`.
2. **Archived authority check.** `archive/tickets/SPEC93DECSTATUR-005.md` landed the planless behavior and explicitly states that the old maintenance page-plan renderer was deleted and no maintenance page-plan payload is returned.
3. **Shared boundary under audit.** The `plan_story_state_maintenance` public operator contract across live handler behavior, registered MCP description/capability metadata, package README, and repo-level machine-facing docs.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles records story state at committed `PG`/`SE` records; after SPEC93DECSTATUR-005, maintenance state repair does not create or require a page-plan artifact. Public docs must not reintroduce a second page-plan handoff for this tool.
5. **Current stale surfaces.** `tools/world-mcp/src/server.ts` still advertises a returned maintenance page-plan body and page-plan write step; `docs/MACHINE-FACING-LAYER.md` still instructs operators to write `maintenance_page_plan.body` exactly to `maintenance_page_plan.target_file`.
6. **Current aligned surfaces.** `tools/world-mcp/README.md` and `docs/WORKFLOWS.md` already describe the tool as returning a review-only patch-plan envelope with no page-plan write requirement, so they should be inspected but likely do not need edits.
7. **Post-review provenance.** `archive/tickets/WMCP-016.md` completed the active-record tuple parity cleanup and exposed this separate stale public-surface concern during review; it does not own the page-plan wording repair.

## Architecture Check

1. The clean repair is to truth the public descriptions to the existing planless handler contract rather than reintroducing `maintenance_page_plan` as a compatibility alias or shim.
2. No backwards-compatibility aliasing/shims should be introduced. The handler response shape remains planless.

## Verification Layers

1. Stale page-plan instructions removed from current public surfaces -> grep-proof over `tools/world-mcp/src/server.ts`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `docs/WORKFLOWS.md`.
2. Registered capability metadata matches the handler contract -> focused `describe_capabilities` or server/capability test proof for the updated `plan_story_state_maintenance` description.
3. Handler behavior remains unchanged -> focused `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.

## What to Change

### 1. Truth registered metadata

Update the `plan_story_state_maintenance` registration description in `tools/world-mcp/src/server.ts` so it says the tool returns a patch-plan envelope only, emits a planless maintenance `PG`, and does not return or require a page-plan write.

### 2. Truth machine-facing docs

Update the `plan_story_state_maintenance` row in `docs/MACHINE-FACING-LAYER.md` to remove `maintenance_page_plan.body` / `maintenance_page_plan.target_file` instructions and align it with the existing README/WORKFLOWS planless description.

### 3. Prove no stale operator instruction remains

Add or adjust focused proof so future public metadata or docs do not drift back to a returned page-plan instruction for this tool.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify registered tool description)
- `docs/MACHINE-FACING-LAYER.md` (modify tool row)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify if adding metadata assertion)
- `tools/world-mcp/README.md` (inspect; modify only if reassessment finds stale wording)
- `docs/WORKFLOWS.md` (inspect; modify only if reassessment finds stale wording)
- `tickets/WMCP-017.md` (modify closeout/reassessment)

## Out of Scope

- Changing `plan_story_state_maintenance` handler behavior or response shape.
- Reintroducing maintenance page-plan rendering.
- Changing story-bundle schemas, patch-plan ops, or active-record replay.

## Acceptance Criteria

### Tests That Must Pass

1. A stale-anchor proof finds no current public instruction that `plan_story_state_maintenance` returns or requires `maintenance_page_plan`.
2. Focused world-mcp proof confirms the registered/capability metadata matches the planless helper contract.
3. Existing maintenance-helper tests still pass and still prove no `maintenance_page_plan` / `write_page_plan` response fields are returned.

### Invariants

1. `plan_story_state_maintenance` remains a review-only patch-plan producer; it never signs, submits, writes, or asks for a page-plan artifact write.
2. Public docs and capability metadata describe the same planless response contract as the handler and focused test.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — add/update focused assertion if needed so registered metadata cannot keep stale page-plan wording.
2. `None` for handler behavior unless implementation changes unexpectedly; existing `plan-story-state-maintenance.test.ts` already proves the response remains planless.

### Commands

1. `npm run build` from `tools/world-mcp`.
2. `node --test dist/tests/tools/describe-capabilities.test.js dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.
3. `rg -n 'maintenance_page_plan|write_page_plan|returned page plan|returns the matching maintenance page-plan|write the returned page plan' tools/world-mcp/src/server.ts docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md docs/WORKFLOWS.md` — classify expected test/source mentions versus stale public instructions, or use a stricter no-hit command over current public surfaces if tests no longer need the old literals.
