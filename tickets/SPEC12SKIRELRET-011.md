# SPEC12SKIRELRET-011: Restore truthful package-wide `world-mcp` test lane

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — narrows the failing aggregate `tools/world-mcp` test seam and repairs the package-wide `pnpm --filter @worldloom/world-mcp test` acceptance surface.
**Deps**: None

## Problem

The package-wide `pnpm --filter @worldloom/world-mcp test` lane is currently not a truthful family-level acceptance surface. During closeout and post-ticket review for `SPEC12SKIRELRET-005`, the owned `get-node` proof passed (`pnpm --filter @worldloom/world-mcp build` and `pnpm --filter @worldloom/world-mcp exec node --test dist/tests/tools/get-node.test.js`), but the aggregate package lane still failed only at `dist/tests/integration/server-stdio.test.js`. Running that same compiled test directly from `tools/world-mcp` via `node dist/tests/integration/server-stdio.test.js` passed. Until this aggregate-only failure is understood and fixed, active SPEC-12 tickets that cite `pnpm --filter @worldloom/world-mcp test` as a broad acceptance lane are relying on a flaky or misleading proof surface.

## Assumption Reassessment (2026-04-24)

1. `tools/world-mcp/package.json` defines `"test": "npm run build && node --test"`, so `pnpm --filter @worldloom/world-mcp test` is the package-wide aggregate runner, not a targeted-file runner.
2. Post-ticket review evidence from `tickets/SPEC12SKIRELRET-005.md` shows `pnpm --filter @worldloom/world-mcp test` fails at `dist/tests/integration/server-stdio.test.js`, while `node dist/tests/integration/server-stdio.test.js` passes when launched directly from `tools/world-mcp`.
3. Shared boundary under audit: the `tools/world-mcp` full-suite test contract and the active SPEC-12 ticket family's broad acceptance lane (`tickets/SPEC12SKIRELRET-006.md`, `tickets/SPEC12SKIRELRET-007.md`, `tickets/SPEC12SKIRELRET-008.md`, `tickets/SPEC12SKIRELRET-010.md`) that currently treats package-wide test success as a meaningful proof surface.
4. This concern is separate from `SPEC12SKIRELRET-005`'s owned `get_node` projection seam. The reviewed ticket closed truthfully at its narrow boundary, so the aggregate test-lane defect must live in a follow-up ticket rather than blocking archival of 005.

## Architecture Check

1. Restoring one truthful package-wide lane is cleaner than teaching each family ticket to treat a broken aggregate suite as contextual noise forever.
2. The fix should preserve the existing package-local test entrypoint rather than introducing alias scripts or parallel acceptance commands.

## Verification Layers

1. The aggregate package lane failure is reproduced and isolated to the real failing seam -> targeted tool command.
2. The repaired package-wide lane exits zero without regressing the existing direct stdio lifecycle smoke -> targeted tool command.
3. Active ticket-family proof surfaces no longer rely on a misleading broad lane -> codebase grep-proof.

## What to Change

### 1. Reproduce and isolate the aggregate-only failure

Determine why `pnpm --filter @worldloom/world-mcp test` fails at `dist/tests/integration/server-stdio.test.js` while direct execution of `node dist/tests/integration/server-stdio.test.js` passes from the same package root. Narrow whether the cause is test ordering, child-process lifecycle, shared global state, reporter interaction, or aggregate-runner behavior.

### 2. Repair the failing seam

Make the minimal change needed so the package-wide `npm run build && node --test` lane becomes truthful again without weakening the existing stdio smoke's intent.

### 3. Truth the family proof surface

Update any active SPEC-12 tickets whose `Test Plan` or `Acceptance Criteria` still treat the broken aggregate `pnpm --filter @worldloom/world-mcp test` lane as a current acceptance command.

## Files to Touch

- `tools/world-mcp/tests/integration/server-stdio.test.ts` (modify, if the failure is test-local)
- `tools/world-mcp/src/` (modify only if the failure is implementation-local)
- `tickets/SPEC12SKIRELRET-006.md` (modify if its broad proof lane remains stale after the fix)
- `tickets/SPEC12SKIRELRET-007.md` (modify if its broad proof lane remains stale after the fix)
- `tickets/SPEC12SKIRELRET-008.md` (modify if its broad proof lane remains stale after the fix)
- `tickets/SPEC12SKIRELRET-010.md` (modify if its broad proof lane remains stale after the fix)

## Out of Scope

- Changing the owned implementation boundary of archived `SPEC12SKIRELRET-005`
- Rewriting unrelated `world-mcp` tools or retrieval behavior
- Introducing alternate package scripts just to work around the broken suite

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter @worldloom/world-mcp test` passes.
2. `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js` still passes.
3. Any active SPEC-12 ticket that keeps a package-wide `@worldloom/world-mcp` test lane cites a truthful, currently passing command.

### Invariants

1. The package-wide `@worldloom/world-mcp` test command is again a truthful aggregate acceptance surface.
2. The stdio lifecycle smoke remains meaningful; the fix must not reduce it to a no-op.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/server-stdio.test.ts` — only if the aggregate-only failure is rooted in the test itself.
2. `None — if the failure is implementation- or runner-local and existing suite coverage is sufficient after the fix.`

### Commands

1. `pnpm --filter @worldloom/world-mcp build`
2. `pnpm --filter @worldloom/world-mcp test`
3. `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js`
