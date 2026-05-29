# WMCP-017: Truth plan_story_state_maintenance page-plan public docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/server.ts`, `docs/MACHINE-FACING-LAYER.md`, and focused world-mcp docs/capability proof.
**Deps**: `archive/tickets/SPEC93DECSTATUR-005.md`, `archive/tickets/WMCP-016.md`

## Problem

Post-ticket review of `archive/tickets/WMCP-016.md` found a separate public-surface drift in `plan_story_state_maintenance`: at intake, the live handler/test surface was planless, but two user-facing surfaces still told operators to expect or write a maintenance page plan.

`tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` asserts `"maintenance_page_plan" in result` is false and `"write_page_plan" in result.next_steps` is false. `archive/tickets/SPEC93DECSTATUR-005.md` records the behavior change: `plan_story_state_maintenance` emits a planless maintenance `PG` and no maintenance page-plan payload. Before this ticket, `tools/world-mcp/src/server.ts` still said the tool "returns the matching maintenance page-plan body" and instructed operators to "write the returned page plan exactly"; `docs/MACHINE-FACING-LAYER.md` still said operators must write `maintenance_page_plan.body` to `maintenance_page_plan.target_file`.

This is not unfinished WMCP-016 active-record parity work. It is a same-tool public contract cleanup so operators and `describe_capabilities` consumers are not directed to use a response field that the handler intentionally does not return.

## Assumption Reassessment (2026-05-29)

1. **Live behavior check.** `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` proves the current response omits `maintenance_page_plan` and omits `next_steps.write_page_plan`; the helper emits maintenance records plus audit/system repair `SE` and planless `PG`.
2. **Archived authority check.** `archive/tickets/SPEC93DECSTATUR-005.md` landed the planless behavior and explicitly states that the old maintenance page-plan renderer was deleted and no maintenance page-plan payload is returned.
3. **Shared boundary under audit.** The `plan_story_state_maintenance` public operator contract across live handler behavior, registered MCP description/capability metadata, package README, and repo-level machine-facing docs.
4. **FOUNDATIONS principle under audit.** FOUNDATIONS §Story Bundles records story state at committed `PG`/`SE` records; after SPEC93DECSTATUR-005, maintenance state repair does not create or require a page-plan artifact. Public docs must not reintroduce a second page-plan handoff for this tool.
5. **Intake stale surfaces.** Before this ticket, `tools/world-mcp/src/server.ts` advertised a returned maintenance page-plan body and page-plan write step; `docs/MACHINE-FACING-LAYER.md` instructed operators to write `maintenance_page_plan.body` exactly to `maintenance_page_plan.target_file`.
6. **Aligned surfaces inspected.** `tools/world-mcp/README.md` and `docs/WORKFLOWS.md` already described the tool as returning a review-only patch-plan envelope with no page-plan write requirement, so no edits were needed there.
7. **Post-review provenance.** `archive/tickets/WMCP-016.md` completed the active-record tuple parity cleanup and exposed this separate stale public-surface concern during review; it does not own the page-plan wording repair.
8. **Proof-surface correction.** The direct registered-metadata proof belongs in `tools/world-mcp/tests/server/capability-parity.test.ts`, which calls the in-memory server's real `describe_capabilities` tool, rather than in the helper-only `tools/world-mcp/tests/tools/describe-capabilities.test.ts` fixture.

## Architecture Check

1. The clean repair is to truth the public descriptions to the existing planless handler contract rather than reintroducing `maintenance_page_plan` as a compatibility alias or shim.
2. No backwards-compatibility aliasing/shims were introduced. The handler response shape remains planless.

## Verification Layers

1. Stale page-plan instructions removed from current public surfaces -> grep-proof over `tools/world-mcp/src/server.ts`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `docs/WORKFLOWS.md`.
2. Registered capability metadata matches the handler contract -> focused `describe_capabilities` or server/capability test proof for the updated `plan_story_state_maintenance` description.
3. Handler behavior remains unchanged -> focused `node --test dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.

## Historical Change Plan

### 1. Truth registered metadata

Update the `plan_story_state_maintenance` registration description in `tools/world-mcp/src/server.ts` so it says the tool returns a patch-plan envelope only, emits a planless maintenance `PG`, and does not return or require a page-plan write.

### 2. Truth machine-facing docs

Update the `plan_story_state_maintenance` row in `docs/MACHINE-FACING-LAYER.md` to remove `maintenance_page_plan.body` / `maintenance_page_plan.target_file` instructions and align it with the existing README/WORKFLOWS planless description.

### 3. Prove no stale operator instruction remains

Add focused proof so future public metadata or docs do not drift back to a returned page-plan instruction for this tool.

## Landed Changes

### 1. Truthed registered metadata

`tools/world-mcp/src/server.ts` now describes `plan_story_state_maintenance` as a review-only patch-plan producer that appends a planless forkable maintenance `PG`, never asks the operator to write a page plan, and requires validation, explicit approval, signing, and `submit_patch_plan`.

### 2. Truthed machine-facing docs

`docs/MACHINE-FACING-LAYER.md` now matches the planless operator contract and removes the obsolete `maintenance_page_plan.body` / `maintenance_page_plan.target_file` write step.

### 3. Added capability proof

`tools/world-mcp/tests/server/capability-parity.test.ts` now exercises the in-memory server's real `describe_capabilities` response and asserts that the registered metadata is planless and does not mention `maintenance_page_plan`, returned page plans, or returned page-plan bodies.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify registered tool description)
- `docs/MACHINE-FACING-LAYER.md` (modify tool row)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modify registered metadata assertion)
- `tools/world-mcp/README.md` (inspected; no edit needed)
- `docs/WORKFLOWS.md` (inspected; no edit needed)
- `archive/tickets/WMCP-017.md` (modify closeout/reassessment)

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

1. `tools/world-mcp/tests/server/capability-parity.test.ts` — add focused assertion so registered `describe_capabilities` metadata cannot keep stale page-plan wording.
2. `None` for handler behavior; existing `plan-story-state-maintenance.test.ts` already proves the response remains planless.

### Commands

1. `npm run build` from `tools/world-mcp`.
2. `node --test dist/tests/server/capability-parity.test.js dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp`.
3. `rg -n 'maintenance_page_plan|write_page_plan|returned page plan|returns the matching maintenance page-plan|write the returned page plan|page-plan body' tools/world-mcp/src/server.ts docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md docs/WORKFLOWS.md` — expected to return no matches over current public surfaces.

## Outcome

Completed: 2026-05-29.

The registered `plan_story_state_maintenance` metadata and repo-level machine-facing docs now describe the existing planless patch-plan response. The handler behavior remains unchanged: it returns a review-only `patch_plan`, appends a maintenance `SE` plus planless `PG`, and does not return `maintenance_page_plan` or `next_steps.write_page_plan`.

## Verification Result

1. Baseline before edits: `npm run build` from `tools/world-mcp` — PASS.
2. Baseline before edits: `node --test dist/tests/tools/describe-capabilities.test.js dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp` — PASS (`6` tests passed).
3. Final: `npm run build` from `tools/world-mcp` — PASS.
4. Final focused proof: `node --test dist/tests/server/capability-parity.test.js dist/tests/tools/plan-story-state-maintenance.test.js` from `tools/world-mcp` — PASS (`10` tests passed).
5. Final public-surface stale-anchor proof: `rg -n 'maintenance_page_plan|write_page_plan|returned page plan|returns the matching maintenance page-plan|write the returned page plan|page-plan body' tools/world-mcp/src/server.ts docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md docs/WORKFLOWS.md` — PASS as expected no-match exit (`1`), proving no current public instruction remains.
6. Broader source/test stale-anchor discovery over `tools/world-mcp/src`, `tools/world-mcp/tests`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `docs/WORKFLOWS.md` found only intentional negative assertions in `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` and `tools/world-mcp/tests/server/capability-parity.test.ts`.

## Deviations

- The registered metadata proof moved from the drafted helper-only `tools/world-mcp/tests/tools/describe-capabilities.test.ts` to `tools/world-mcp/tests/server/capability-parity.test.ts` so the assertion exercises the actual server registration surfaced through `describe_capabilities`.
