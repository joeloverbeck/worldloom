# SPEC03PATENG-011: Validate world-mcp stdio lifecycle aggregate test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — validation-only closeout; the live `tools/world-mcp` stdio lifecycle and package aggregate proof surfaces are already green.
**Deps**: archive/tickets/SPEC03PATENG-007.md

## Problem

At intake, post-ticket review of SPEC03PATENG-007 confirmed the rewire-owned build and targeted compiled tests passed, but the broader `tools/world-mcp` aggregate lane was red in `dist/tests/integration/server-stdio.test.js`. The historical failure was `child.exitCode === null` after `SIGTERM` when the test expected `0`. Reassessment on 2026-04-25 shows the failure no longer reproduces: the direct stdio lifecycle proof and the package aggregate lane both pass. This ticket is therefore closed as validation-only proof that the package-wide lane is truthful again.

## Assumption Reassessment (2026-04-25)

1. Classification: primary `archive / rejection / no-op validation` after live reassessment; the ticket began as `tool or script implementation`, but the cited failure no longer reproduces.
2. The stdio test source is still `tools/world-mcp/tests/integration/server-stdio.test.ts`. It spawns the built `dist/src/server.js`, waits 250ms, asserts the child is alive and stderr is empty, sends `SIGTERM`, waits for `close`, then asserts `child.exitCode === 0`.
3. Shared boundary under audit: `tools/world-mcp` package-wide verification. `tools/world-mcp/package.json` defines `"test": "npm run build && node --test"`, so the truthful aggregate proof is package-local `npm run test`.
4. Live proof correction: after a fresh `npm run build`, `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js` exits 0. The historical `child.exitCode === null` failure is not current.
5. Live aggregate correction: `cd tools/world-mcp && npm run test` exits 0, including the stdio lifecycle subtest and the SPEC-03 `submit_patch_plan` delegation subtest.
6. SPEC-03 reference check: `specs/SPEC-03-patch-engine.md` treats `submit_patch_plan` delegation as delivered by SPEC03PATENG-007 and does not require a stdio subprocess proof for the SPEC-03 capstone.
7. Existing active SPEC03PATENG tickets 008 and 009 do not own this concern. Ticket 009 explicitly uses in-process MCP dispatch for the patch-engine capstone and says no stdio subprocess is required.
8. FOUNDATIONS and HARD-GATE discipline are not weakened by this validation-only closeout. No canon-writing behavior, approval-token semantics, or Mystery Reserve firewall behavior changed.

## Architecture Check

1. The cleanest repair is no code change: the live server lifecycle and test already satisfy the intended package proof surface.
2. No backwards-compatibility aliasing/shims introduced. No alternate entrypoint, server mode, or test-only lifecycle branch was added.

## Verification Layers

1. Stdio lifecycle proof is truthful -> targeted compiled test: `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js`.
2. Package aggregate lane is restored -> package command: `cd tools/world-mcp && npm run test`.
3. SPEC03PATENG-007 rewire remains unaffected -> targeted compiled test: `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`.

## What to Change

### 1. Validate the child-process lifecycle contract

Run the compiled stdio test directly after a fresh package build. It exits 0, so preserve the existing test assertion and server shutdown path.

### 2. Validate the package aggregate lane

Run `npm run test` from `tools/world-mcp` to confirm the aggregate package proof lane is restored.

### 3. Preserve submit-patch-plan rewire proof

Rerun the direct `submit-patch-plan` compiled test so this package-level validation does not mask a regression in the SPEC03PATENG-007 delegation seam.

## Files to Touch

- `archive/tickets/SPEC03PATENG-011.md` (modify)

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
4. `cd tools/world-mcp && npm run test` exits 0.

### Invariants

1. The built stdio entrypoint remains `tools/world-mcp/dist/src/server.js`.
2. The stdio server still stays alive until stdin closes or a shutdown signal is received.
3. The test still fails on startup stderr.
4. The SPEC03PATENG-007 `submit_patch_plan` engine delegation remains unchanged.

## Test Plan

### New/Modified Tests

1. `None — validation-only ticket; the live package and compiled stdio smoke already provide the truthful proof surface.`

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js`
3. `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`
4. `cd tools/world-mcp && npm run test`

## Outcome

Completed: 2026-04-25.

No `tools/world-mcp` code or test changes were required. The historical stdio lifecycle failure no longer reproduces on the live repo, and the package aggregate `npm run test` lane is green. The ticket was truthed to validation-only completion.

## Verification Result

1. Passed: `cd tools/world-mcp && npm run build`
2. Passed: `cd tools/world-mcp && node --test dist/tests/integration/server-stdio.test.js`
3. Passed: `cd tools/world-mcp && npm run test` — aggregate lane completed with 116 passing tests across 112 top-level TAP subtests.
4. Passed: `cd tools/world-mcp && node --test dist/tests/tools/submit-patch-plan.test.js`
5. Flake check passed: `cd tools/world-mcp && for i in 1 2 3 4 5; do node --test dist/tests/integration/server-stdio.test.js || exit $?; done`
6. Aggregate repeat passed: `cd tools/world-mcp && for i in 1 2 3; do npm run test || exit $?; done`

## Deviations

The original ticket expected a narrow repair to `tools/world-mcp/tests/integration/server-stdio.test.ts` or `tools/world-mcp/src/server.ts`. Reassessment proved the live failure was stale, so this ticket changed only its own closeout text.
