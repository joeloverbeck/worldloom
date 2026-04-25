# SPEC03PATENG-007: world-mcp rewire — delegate `submit_patch_plan` + supersede PatchReceipt stub

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-mcp/package.json` (adds `@worldloom/patch-engine` dep) and `tools/world-mcp/src/tools/submit-patch-plan.ts` (replaces stub delegation with real import). Removes world-mcp's local `PatchReceipt` declaration.
**Deps**: archive/tickets/SPEC03PATENG-006.md

## Problem

The Phase 1 stub at `tools/world-mcp/src/tools/submit-patch-plan.ts:60-69` currently returns `{code: 'phase1_stub'}` for every apply request. Its TODO comment (lines 61-63) already anticipates this ticket's work: `// const { submitPatchPlan } = await import("@worldloom/patch-engine"); return submitPatchPlan(args.patch_plan, args.approval_token);`. This ticket replaces the stub with the real delegation and aligns world-mcp's local `PatchReceipt` interface (narrow stub with only `cf_ids?`, `ch_ids?`, `pa_ids?`) with the authoritative 10-class shape from `@worldloom/patch-engine` per SPEC-03 Patch Receipt supersession note.

## Assumption Reassessment (2026-04-24)

1. Target file at `tools/world-mcp/src/tools/submit-patch-plan.ts:8-28` declares a local `PatchReceipt` interface with narrow `id_allocations_consumed: { cf_ids?, ch_ids?, pa_ids? }` (confirmed at reassessment). Ticket 001 lands the full 10-class `PatchReceipt` in `tools/patch-engine/src/envelope/schema.ts`; ticket 006 re-exports it from the package-root entrypoint `src/apply.ts`; ticket 007 imports from `@worldloom/patch-engine` and deletes the local declaration.
2. `tools/world-mcp/package.json` currently has one workspace dep: `"@worldloom/world-index": "file:../world-index"`. This ticket adds a second: `"@worldloom/patch-engine": "file:../patch-engine"`. No npm-registry dep changes.
3. Shared boundary: `submit-patch-plan.ts` is the sole world-mcp consumer of the engine's public API — specifically `submitPatchPlan()` and `PatchReceipt`. No other world-mcp tool (`search_nodes`, `get_node`, `allocate_next_id`, etc.) imports from patch-engine, preserving the read-side/write-side separation SPEC-02 established.
4. Schema extension posture: **breaking** at the TypeScript level within world-mcp — the local `PatchReceipt` interface is removed, replaced by the import. Consumers of the stub's return value today are the MCP tool dispatch at `server.ts:226` (passing the result through to the MCP client); no world-mcp-internal code depends on the narrow `id_allocations_consumed` shape. The MCP client (a skill) receives the richer shape via the MCP JSON-RPC serialization; any skill consumer that hardcoded the narrow three-class shape (none exist today — Phase 1 stub always returned an error) would see the widened shape as additive.
5. Rename/removal blast radius: grep-proof at implementation time that no other world-mcp file imports the local `PatchReceipt` from `submit-patch-plan.ts`. Baseline check: `grep -rn "import.*PatchReceipt.*submit-patch-plan" tools/world-mcp/src/` expected 0 matches (Phase 1 stub was not consumed).

## Architecture Check

1. Replacing the stub preserves SPEC-02's MCP tool signature — `submit_patch_plan(patch_plan, approval_token)` — while swapping the implementation from stub-error to engine-delegation. Skills calling via MCP see no tool-signature change; only the return value transitions from error-object to `PatchReceipt | McpError`.
2. Using a static `import` at file top (not the dynamic `await import()` in the current TODO) simplifies the code path and lets TypeScript typecheck the call site at build time. The TODO's `await import()` was a Phase 1 workaround for the engine package not existing; once the file dep lands in package.json, the static import is preferred.
3. Removing the local `PatchReceipt` declaration is strictly additive from the MCP client's perspective (new fields appear; existing fields preserved). The removal is breaking only within world-mcp's internal type graph — and only in the removed declaration's site, since no other world-mcp file imported it.
4. No backwards-compatibility aliasing/shims introduced. The old narrow `PatchReceipt` is deleted, not aliased under a "legacy" name.

## Verification Layers

1. MCP tool still dispatches on `submit_patch_plan` after the rewire -> codebase grep-proof (`grep -n "submit_patch_plan" tools/world-mcp/src/server.ts` returns ≥1 match, unchanged vs. baseline).
2. Apply call path reaches `@worldloom/patch-engine#submitPatchPlan` -> codebase grep-proof (`grep -n 'from "@worldloom/patch-engine"' tools/world-mcp/src/tools/submit-patch-plan.ts` returns ≥1 match).
3. Local `PatchReceipt` declaration removed -> codebase grep-proof (`grep -n "^export interface PatchReceipt\|^interface PatchReceipt" tools/world-mcp/src/tools/submit-patch-plan.ts` returns 0 matches).
4. Phase 1 stub return path (`phase1_stub`) removed -> codebase grep-proof (`grep -n "phase1_stub" tools/world-mcp/src/` returns 0 matches).
5. `tools/world-mcp/package.json` declares the new dep -> file read (JSON parse; verify `dependencies["@worldloom/patch-engine"] === "file:../patch-engine"`).

## What to Change

### 1. Modify `tools/world-mcp/package.json`

Add `"@worldloom/patch-engine": "file:../patch-engine"` to `dependencies`. After editing, run `cd tools/world-mcp && npm install` to populate `node_modules/` with the workspace symlink.

### 2. Modify `tools/world-mcp/src/tools/submit-patch-plan.ts`

- Remove the local `PatchReceipt` interface declaration (currently lines 8-28).
- Add `import { submitPatchPlan, type PatchReceipt } from "@worldloom/patch-engine";` at the top.
- Remove the `patchEngineLooksBuilt()` sentinel (lines 39-42) and the TODO block (lines 60-69).
- In `export async function submitPatchPlan(args)` — the world-mcp wrapper, now renamed to avoid shadowing the imported function:
  - Rename the wrapper to `handleSubmitPatchPlanTool` (or similar) so the imported engine function and the MCP tool handler have distinct names.
  - After envelope shape check (existing code at lines 51-54) and approval-token presence check (lines 56-58): `return submitPatchPlan(args.patch_plan, args.approval_token);` (dispatches to the engine).
  - Update the import and call-site in `server.ts:226` to the renamed handler.

### 3. Update `tools/world-mcp/src/server.ts` call site

`server.ts:226` currently invokes the Phase 1 stub:

```typescript
import { submitPatchPlan } from "./tools/submit-patch-plan";
// ...
server.tool("submit_patch_plan", ..., async (args) => submitPatchPlan(args));
```

After rewire: import the renamed handler (`handleSubmitPatchPlanTool`) and pass it to `server.tool`. No schema changes — the MCP surface is unchanged.

### 4. Verify `tools/patch-engine/README.md` has been updated

Ticket 006's scope includes rewriting the pre-SPEC-13 README. This ticket's implementer should verify that removal landed; if the README still documents retired ops, escalate as a follow-up to 006 rather than silently re-writing here.

## Files to Touch

- `tools/world-mcp/package.json` (modify — add `@worldloom/patch-engine` dep)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify — remove stub, import engine, rename wrapper)
- `tools/world-mcp/src/server.ts` (modify — update call site for renamed wrapper)

## Out of Scope

- Engine package creation — ticket 001.
- Engine apply orchestration — ticket 006.
- Per-op tests — ticket 008.
- Integration / acceptance tests — ticket 009.
- SPEC-02 Phase 2 tooling update (adds `get_record`, `find_sections_touched_by`, extends `allocate_next_id`) — completed separately via archived `archive/specs/SPEC-02-phase2-tooling.md`; required for ticket 009 end-to-end tests but not for this ticket's isolated rewire.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm install` succeeds and populates `node_modules/@worldloom/patch-engine` as a symlink.
2. `cd tools/world-mcp && npm run build` exits 0 (TypeScript typecheck succeeds after the import change).
3. `cd tools/world-mcp && npm run test` exits 0 (existing tests still pass; no test specifically exercises the engine path in this ticket — that's ticket 009).
4. `grep -c "phase1_stub" tools/world-mcp/src/` returns 0 (stub error path eliminated).
5. `grep -c "^import { submitPatchPlan.*from \"@worldloom/patch-engine\"" tools/world-mcp/src/tools/submit-patch-plan.ts` returns 1.
6. `grep -c "^export interface PatchReceipt\|^interface PatchReceipt " tools/world-mcp/src/tools/submit-patch-plan.ts` returns 0 (local declaration deleted; import does not define).
7. `node -e "const p = require('./tools/world-mcp/package.json'); process.exit(p.dependencies['@worldloom/patch-engine'] === 'file:../patch-engine' ? 0 : 1)"` exits 0.
8. After `npm install`, `grep -n "PatchReceipt" tools/world-mcp/node_modules/@worldloom/patch-engine/dist/src/apply.d.ts` returns ≥1, confirming the local `file:` dependency exposes the package-root receipt type that this ticket imports.

### Invariants

1. MCP tool name, argument schema, and response schema are preserved at the JSON-RPC level — only the implementation changes. Skills using `mcp__worldloom__submit_patch_plan` see no tool-signature change.
2. `PatchReceipt` shape at the world-mcp boundary is the authoritative 10-class shape from `@worldloom/patch-engine`, not the narrow 3-class stub.
3. No world-mcp internal code retains a local `PatchReceipt` declaration; single source of truth is the engine package.
4. The `phase1_stub` error return is unreachable — removed entirely rather than kept as a fallback. A real engine error (e.g., `approval_invalid_hmac`, `record_hash_drift`) propagates through unchanged.

## Test Plan

### New/Modified Tests

1. `None — world-mcp-side rewire only; end-to-end validation of the new engine path lives in ticket 009 (integration capstone). The ticket 009 capstone's post-apply sync integration test exercises this exact rewire path.`

### Commands

1. `cd tools/world-mcp && npm install && cd tools/world-mcp && npm run build` (targeted: confirms dep + typecheck).
2. `cd tools/world-mcp && npm run test` (confirms existing MCP-tool unit tests still pass).
3. `grep -n "PatchReceipt" tools/world-mcp/node_modules/@worldloom/patch-engine/dist/src/apply.d.ts` (confirms the refreshed local dependency exposes the package-root type).
4. `node -e "import('./tools/world-mcp/dist/src/tools/submit-patch-plan.js').then(m => console.log(typeof m.handleSubmitPatchPlanTool))"` should print `function` (confirms the handler is exported under its renamed name post-build).
