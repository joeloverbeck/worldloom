# SPEC03PATENG-007: world-mcp rewire — delegate `submit_patch_plan` + supersede PatchReceipt stub

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/world-mcp/package.json` (adds `@worldloom/patch-engine` dep), `tools/world-mcp/src/tools/submit-patch-plan.ts` (replaces stub delegation with real import), `tools/world-mcp/src/server.ts` (renames handler call site), same-package tests/README (remove Phase 1 stub contract), and `specs/SPEC-03-patch-engine.md` (mark the MCP delegation as landed). Removes world-mcp's local `PatchReceipt` declaration.
**Deps**: archive/tickets/SPEC03PATENG-006.md

## Problem

At intake, the Phase 1 stub at `tools/world-mcp/src/tools/submit-patch-plan.ts:60-69` returned `{code: 'phase1_stub'}` for every apply request. Its TODO comment (lines 61-63) already anticipated this ticket's work: `// const { submitPatchPlan } = await import("@worldloom/patch-engine"); return submitPatchPlan(args.patch_plan, args.approval_token);`. This ticket replaces the stub with the real delegation and aligns world-mcp's local `PatchReceipt` interface (narrow stub with only `cf_ids?`, `ch_ids?`, `pa_ids?`) with the authoritative 10-class shape from `@worldloom/patch-engine` per SPEC-03 Patch Receipt supersession note.

## Assumption Reassessment (2026-04-24)

1. Classification: primary `tool or script implementation`, with cross-artifact contract fallout because the MCP tool return path and package docs/tests expose the same `submit_patch_plan` contract.
2. Target file at `tools/world-mcp/src/tools/submit-patch-plan.ts:8-28` declares a local `PatchReceipt` interface with narrow `id_allocations_consumed: { cf_ids?, ch_ids?, pa_ids? }` (confirmed at reassessment). Ticket 001 lands the full 10-class `PatchReceipt` in `tools/patch-engine/src/envelope/schema.ts`; ticket 006 re-exports it from the package-root entrypoint `src/apply.ts`; ticket 007 imports from `@worldloom/patch-engine` and deletes the local declaration.
3. `tools/world-mcp/package.json` currently has one local file dep: `"@worldloom/world-index": "file:../world-index"`. This ticket adds a second: `"@worldloom/patch-engine": "file:../patch-engine"`. No new npm-registry packages are introduced, but `npm install` must update `package-lock.json` and create the local `node_modules/@worldloom/patch-engine` symlink.
4. Shared boundary: `submit-patch-plan.ts` is the sole world-mcp consumer of the engine's public API — specifically `submitPatchPlan()` and `PatchReceipt`. No other world-mcp tool (`search_nodes`, `get_node`, `allocate_next_id`, etc.) imports from patch-engine, preserving the read-side/write-side separation SPEC-02 established.
5. Schema extension posture: **breaking** at the TypeScript level within world-mcp — the local `PatchReceipt` interface is removed, replaced by the import. Consumers of the stub's return value today are the MCP tool dispatch at `server.ts` (passing the result through to the MCP client); no world-mcp-internal code depends on the narrow `id_allocations_consumed` shape. The MCP client receives the richer engine result or an engine error via the MCP JSON-RPC serialization; any skill consumer that hardcoded the narrow three-class shape would see the widened shape as additive.
6. Rename/removal blast radius: `tools/world-mcp/tests/tools/submit-patch-plan.test.ts`, `tests/server/dispatch.test.ts`, `tests/integration/spec02-verification.test.ts`, `tests/errors.test.ts`, and `tools/world-mcp/README.md` still encode the Phase 1 `phase1_stub` contract. These are required same-seam fallout for this ticket, because `npm run test` would otherwise preserve the retired stub as the documented/package-local behavior.
7. Explicit reference check: `specs/SPEC-03-patch-engine.md` still says the `submit_patch_plan` tool is stubbed and that ticket 007 remains the owner. This ticket owns truthing those SPEC-03 lines after the rewire lands. The supersession note remains useful as historical context but must be updated from future-tense replacement to completed replacement.
8. Verification correction: the existing aggregate `npm run test` lane still has an unrelated `server-stdio.test.ts` lifecycle failure (`child.exitCode` remains `null` after `SIGTERM`). The rewire-owned proof is package build plus the targeted compiled tests touched by this ticket. The aggregate failure is not caused by the patch-engine delegation; the rewire-specific tests pass.

## Architecture Check

1. Replacing the stub preserves SPEC-02's MCP tool signature — `submit_patch_plan(patch_plan, approval_token)` — while swapping the implementation from stub-error to engine-delegation. Skills calling via MCP see no tool-signature change; only the return value transitions from stub error to `PatchReceipt`, engine error, or local MCP validation error.
2. Using a static `import` at file top (not the dynamic `await import()` in the current TODO) simplifies the code path and lets TypeScript typecheck the call site at build time. The TODO's `await import()` was a Phase 1 workaround for the engine package not existing; once the file dep lands in package.json, the static import is preferred.
3. Removing the local `PatchReceipt` declaration is strictly additive from the MCP client's perspective (new fields appear; existing fields preserved). The removal is breaking only within world-mcp's internal type graph — and only in the removed declaration's site, since no other world-mcp file imported it.
4. No backwards-compatibility aliasing/shims introduced. The old narrow `PatchReceipt` is deleted, not aliased under a "legacy" name.

## Verification Layers

1. MCP tool still dispatches on `submit_patch_plan` after the rewire -> codebase grep-proof (`grep -n "submit_patch_plan" tools/world-mcp/src/server.ts` returns ≥1 match, unchanged vs. baseline).
2. Apply call path reaches `@worldloom/patch-engine#submitPatchPlan` -> codebase grep-proof (`grep -n 'from "@worldloom/patch-engine"' tools/world-mcp/src/tools/submit-patch-plan.ts` returns >=1 match).
3. Local `PatchReceipt` declaration removed -> codebase grep-proof (`grep -n "^export interface PatchReceipt\|^interface PatchReceipt" tools/world-mcp/src/tools/submit-patch-plan.ts` returns 0 matches).
4. Phase 1 stub return path (`phase1_stub`) removed from source/docs/tests/spec acceptance surfaces -> codebase grep-proof over `tools/world-mcp/src`, `tools/world-mcp/tests`, `tools/world-mcp/README.md`, and the relevant SPEC-03 lines.
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

### 5. Update same-package proof and documentation fallout

- Update `tools/world-mcp/tests/**` assertions that still expect `phase1_stub` so they prove delegation reaches the engine (`envelope_shape_invalid` from the engine validator for the legacy SPEC-02 test plan shape) rather than the retired stub.
- Update `tools/world-mcp/README.md` so the tool is no longer documented as Phase 1 stubbed.
- Update `specs/SPEC-03-patch-engine.md` lines that still describe ticket 007 as future work.

## Files to Touch

- `tools/world-mcp/package.json` (modify — add `@worldloom/patch-engine` dep)
- `tools/world-mcp/package-lock.json` (modify — lock local `file:` dependency)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify — remove stub, import engine, rename wrapper)
- `tools/world-mcp/src/server.ts` (modify — update call site for renamed wrapper)
- `tools/world-mcp/src/errors.ts` (modify — remove retired `phase1_stub` local error code)
- `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` (modify — prove engine delegation/error)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — update dispatch expectation)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (modify — update capstone expectation)
- `tools/world-mcp/tests/errors.test.ts` (modify — update local error taxonomy)
- `tools/world-mcp/README.md` (modify — document Phase 2 delegation)
- `specs/SPEC-03-patch-engine.md` (modify — mark delegation landed)

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
3. Targeted compiled tests for the owned rewire pass: `node --test dist/tests/tools/submit-patch-plan.test.js`, `node --test dist/tests/server/dispatch.test.js`, `node --test dist/tests/integration/spec02-verification.test.js`, and `node --test dist/tests/errors.test.js`.
4. `grep -R "phase1_stub" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md specs/SPEC-03-patch-engine.md` exits 1 with no matches (stub error path eliminated from local source/test/docs and SPEC-03 active status text).
5. `grep -n 'from "@worldloom/patch-engine"' tools/world-mcp/src/tools/submit-patch-plan.ts` returns at least 1 match.
6. `grep -c "^export interface PatchReceipt\|^interface PatchReceipt " tools/world-mcp/src/tools/submit-patch-plan.ts` returns 0 (local declaration deleted; import does not define).
7. `node -e "const p = require('./tools/world-mcp/package.json'); process.exit(p.dependencies['@worldloom/patch-engine'] === 'file:../patch-engine' ? 0 : 1)"` exits 0.
8. After `npm install`, `grep -n "PatchReceipt" tools/world-mcp/node_modules/@worldloom/patch-engine/dist/src/apply.d.ts` returns >=1, confirming the local `file:` dependency exposes the package-root receipt type that this ticket imports.
9. `npm run test` from `tools/world-mcp` was attempted after the same-package Phase 1 stub expectations were removed; the rewire-owned tests pass, while the existing `server-stdio.test.ts` aggregate failure remains outside this ticket.

### Invariants

1. MCP tool name, argument schema, and response schema are preserved at the JSON-RPC level — only the implementation changes. Skills using `mcp__worldloom__submit_patch_plan` see no tool-signature change.
2. `PatchReceipt` shape at the world-mcp boundary is the authoritative 10-class shape from `@worldloom/patch-engine`, not the narrow 3-class stub.
3. No world-mcp internal code retains a local `PatchReceipt` declaration; single source of truth is the engine package.
4. The `phase1_stub` error return is unreachable — removed entirely rather than kept as a fallback. A real engine error (e.g., `approval_invalid_hmac`, `record_hash_drift`) propagates through unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/submit-patch-plan.test.ts` — updates direct handler proof from Phase 1 stub to engine delegation/error.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — updates MCP dispatch proof to expect engine error propagation instead of the retired stub.
3. `tools/world-mcp/tests/integration/spec02-verification.test.ts` — updates the SPEC-02 capstone expectation now that SPEC-03 owns the apply path.
4. `tools/world-mcp/tests/errors.test.ts` — removes the retired local `phase1_stub` code from the local MCP error-code taxonomy.

### Commands

1. `cd tools/world-mcp && npm install` (refresh local `file:` dependency).
2. `cd tools/patch-engine && npm run build` (producer).
3. `cd tools/world-mcp && npm run build` (consumer typecheck).
4. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`.
5. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`.
6. `cd tools/world-mcp && node --test dist/tests/integration/spec02-verification.test.js`.
7. `cd tools/world-mcp && node --test dist/tests/errors.test.js`.
8. `grep -n "PatchReceipt" tools/world-mcp/node_modules/@worldloom/patch-engine/dist/src/apply.d.ts` (confirms the refreshed local dependency exposes the package-root type).
9. `node -e "import('./tools/world-mcp/dist/src/tools/submit-patch-plan.js').then(m => console.log(typeof m.handleSubmitPatchPlanTool))"` should print `function` (confirms the handler is exported under its renamed name post-build).

## Outcome

Completed: 2026-04-25.

The `submit_patch_plan` MCP handler now delegates to `@worldloom/patch-engine` through `handleSubmitPatchPlanTool`. The local narrow `PatchReceipt` declaration and retired `phase1_stub` local error code are removed. `tools/world-mcp/package.json` and lockfile now include the local `@worldloom/patch-engine` dependency, and the refreshed install exposes the engine's package-root `PatchReceipt` declaration through `node_modules/@worldloom/patch-engine/dist/src/apply.d.ts`.

Same-package tests and docs were updated to remove the Phase 1 stub contract. `tools/world-mcp/README.md` now documents Phase 2 patch-engine delegation, and `specs/SPEC-03-patch-engine.md` now states that SPEC03PATENG-007 delivered the delegation.

## Verification Result

1. `cd tools/world-mcp && npm install` — passed; added the local patch-engine dependency. npm reported 38 funding notices and 0 vulnerabilities.
2. `cd tools/patch-engine && npm run build` — passed.
3. `cd tools/world-mcp && npm run build` — passed.
4. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js` — passed.
5. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed.
6. `cd tools/world-mcp && node --test dist/tests/integration/spec02-verification.test.js` — passed.
7. `cd tools/world-mcp && node --test dist/tests/errors.test.js` — passed.
8. `grep -n 'from "@worldloom/patch-engine"' tools/world-mcp/src/tools/submit-patch-plan.ts` — found the engine import.
9. `grep -n "^export interface PatchReceipt\|^interface PatchReceipt" tools/world-mcp/src/tools/submit-patch-plan.ts || true` — returned no matches.
10. `node -e "const p = require('./tools/world-mcp/package.json'); process.exit(p.dependencies['@worldloom/patch-engine'] === 'file:../patch-engine' ? 0 : 1)"` — passed.
11. `grep -n "PatchReceipt" tools/world-mcp/node_modules/@worldloom/patch-engine/dist/src/apply.d.ts` — found the package-root receipt declaration.
12. `node -e "import('./tools/world-mcp/dist/src/tools/submit-patch-plan.js').then(m => console.log(typeof m.handleSubmitPatchPlanTool))"` — printed `function`.
13. `if grep -R "phase1_stub" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md specs/SPEC-03-patch-engine.md; then exit 1; fi` — passed with no matches.

## Deviations

1. `cd tools/world-mcp && npm run test` was run and failed only in `dist/tests/integration/server-stdio.test.js`: after `SIGTERM`, the child process close event reported `child.exitCode === null` instead of `0`. The rewire-owned direct tests passed, and the failure is in the pre-existing stdio lifecycle lane rather than the patch-engine delegation seam.
2. The delegation tests use the engine's `envelope_shape_invalid` response for the legacy SPEC-02 patch shape to prove the call reaches `@worldloom/patch-engine` without creating world/index side effects. End-to-end successful apply behavior remains ticket 009/SPEC-04 territory because patch-engine still fails closed before source writes until validators exist.
