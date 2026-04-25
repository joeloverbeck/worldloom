# SPEC03PATENG-011: Repair world-mcp stdio lifecycle aggregate test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — updates the `tools/world-mcp` stdio lifecycle proof surface so the package aggregate `npm run test` lane can be truthful again.
**Deps**: archive/tickets/SPEC03PATENG-007.md

## Problem

Post-ticket review of SPEC03PATENG-007 confirmed the rewire-owned build and targeted compiled tests pass, but the broader `tools/world-mcp` aggregate lane remains red in `dist/tests/integration/server-stdio.test.js`. The test sends `SIGTERM` to the built stdio server child process, waits for `close`, and asserts `child.exitCode === 0`; the observed closeout failure is `child.exitCode === null` after the signal. That keeps `cd tools/world-mcp && npm run test` unusable as a package-wide proof lane even though the SPEC03PATENG-007 rewire itself is green.

## Assumption Reassessment (2026-04-25)

1. The failing test source is `tools/world-mcp/tests/integration/server-stdio.test.ts`. It spawns `dist/src/server.js`, waits 250ms, asserts the process is alive and stderr is empty, sends `SIGTERM`, waits for `close`, then asserts `child.exitCode === 0`.
2. The live failure observed during SPEC03PATENG-007 verification is isolated to the compiled `dist/tests/integration/server-stdio.test.js` subtest: after `SIGTERM`, Node reports `child.exitCode === null` instead of `0`.
3. Shared boundary under audit: `tools/world-mcp` package-wide verification. The stdio lifecycle test is not part of the SPEC-03 `submit_patch_plan` rewire contract, but it blocks the package aggregate `npm run test` lane used by future world-mcp tickets.
4. Existing active SPEC03PATENG tickets 008 and 009 do not own this concern. Ticket 009 explicitly uses in-process MCP dispatch for the patch-engine capstone and says no stdio subprocess is required.
5. FOUNDATIONS and HARD-GATE discipline are not weakened by this ticket. The ticket only repairs a test harness/lifecycle assertion around the MCP server process and does not change canon-writing behavior or approval-token semantics unless live reassessment proves the server shutdown path itself is defective.

## Architecture Check

1. The clean repair is to make the stdio lifecycle proof match Node child-process semantics and the server's intended signal handling: either fix the server so a handled `SIGTERM` produces a normal exit code, or update the test to assert the correct signal/exit surface if Node reports signal termination despite orderly cleanup.
2. No backwards-compatibility aliasing/shims introduced. This is a proof-surface repair for the existing stdio entrypoint, not a second entrypoint or alternate server mode.

## Verification Layers

1. Stdio lifecycle proof is truthful -> targeted compiled test: `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js`.
2. Package aggregate lane restored -> package command: `cd tools/world-mcp && npm run test`.
3. SPEC03PATENG-007 rewire remains unaffected -> targeted compiled test: `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`.

## What to Change

### 1. Reassess the child-process lifecycle contract

Run the failing compiled stdio test directly and inspect whether the child exits by code, by signal, or hangs until forced. Use that evidence to decide whether the defect is in `tools/world-mcp/src/server.ts` signal handling or in `tools/world-mcp/tests/integration/server-stdio.test.ts` asserting the wrong Node child-process field.

### 2. Repair the narrow stdio lifecycle seam

Patch the smallest truthful surface:

- If the server's `SIGTERM` handler should close and call `process.exit(0)`, fix the server lifecycle path and keep the test's normal-exit assertion.
- If Node correctly reports signal termination even after orderly cleanup, update the test to assert the signal field while preserving the existing checks that the process starts, stays alive, and emits no stderr.

### 3. Preserve submit-patch-plan rewire proof

Rerun the direct `submit-patch-plan` compiled test so this package-level proof repair does not regress the SPEC03PATENG-007 delegation seam.

## Files to Touch

- `tools/world-mcp/tests/integration/server-stdio.test.ts` (modify, likely)
- `tools/world-mcp/src/server.ts` (modify only if live reassessment proves the shutdown path is defective)

## Out of Scope

- Changing `submit_patch_plan` behavior.
- Changing patch-engine apply orchestration.
- Adding new MCP tools or transport modes.
- End-to-end SPEC-03 apply acceptance; ticket 009 owns that capstone.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` exits 0.
2. `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js` exits 0.
3. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js` exits 0.
4. `cd tools/world-mcp && npm run test` exits 0, unless reassessment proves a separate unrelated aggregate failure; if so, narrow this ticket to the stdio repair and record the new blocker explicitly.

### Invariants

1. The built stdio entrypoint remains `tools/world-mcp/dist/src/server.js`.
2. The stdio server still stays alive until stdin closes or a shutdown signal is received.
3. The test still fails on startup stderr.
4. The SPEC03PATENG-007 `submit_patch_plan` engine delegation remains unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/server-stdio.test.ts` — repair the lifecycle assertion or the shutdown path it covers.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js`
3. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`
4. `cd tools/world-mcp && npm run test`
