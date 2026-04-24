# SPEC12SKIRELRET-011: Restore truthful package-wide `world-mcp` test lane

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — ticket truthing only; the live `tools/world-mcp` package-wide test lane already passes.
**Deps**: None

## Problem

This ticket was opened to restore the truthfulness of the package-wide `pnpm --filter @worldloom/world-mcp test` lane after `SPEC12SKIRELRET-005` closeout recorded an aggregate-only failure in `dist/tests/integration/server-stdio.test.js`. Reassessment against the live repo shows that failure no longer reproduces: the full package lane now passes, and the direct compiled stdio smoke still passes from `tools/world-mcp`. The remaining work is therefore to truth this ticket to the live seam instead of forcing an unnecessary code change.

## Assumption Reassessment (2026-04-24)

1. `tools/world-mcp/package.json` still defines `"test": "npm run build && node --test"`, so `pnpm --filter @worldloom/world-mcp test` is the live package-wide aggregate runner, not a targeted-file runner.
2. The stale failure record from [archive/tickets/SPEC12SKIRELRET-005.md](/home/joeloverbeck/projects/worldloom/archive/tickets/SPEC12SKIRELRET-005.md) no longer matches the live repo. Re-running `pnpm --filter @worldloom/world-mcp test` now passes end-to-end, including `dist/tests/integration/server-stdio.test.js`.
3. Shared boundary under audit: the `tools/world-mcp` full-suite test contract and the active SPEC-12 ticket family's broad acceptance lane (`tickets/SPEC12SKIRELRET-006.md`, `tickets/SPEC12SKIRELRET-007.md`, `tickets/SPEC12SKIRELRET-008.md`, `tickets/SPEC12SKIRELRET-010.md`) that cite package-wide `@worldloom/world-mcp` test commands.
4. The direct compiled smoke still passes when launched from the package root: `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js` exits zero. The earlier aggregate-only mismatch is not reproducible on the live seam.
5. Mismatch + correction: the ticket was drafted as a tool-fix ticket, but the live repo shows no remaining tool or test failure to repair. The truthful correction is to close this ticket as validation-only contract truthing with no code changes.

## Architecture Check

1. Preserving one truthful package-wide lane is cleaner than weakening sibling SPEC-12 tickets to work around a failure that no longer exists.
2. No alternate scripts, aliases, or runner shims are needed; the existing package-local `test` entrypoint is already truthful.

## Verification Layers

1. The live package-wide aggregate lane exits zero -> targeted tool command.
2. The direct compiled stdio lifecycle smoke still exits zero from `tools/world-mcp` -> targeted tool command.
3. Active sibling SPEC-12 tickets that cite `pnpm --filter @worldloom/world-mcp test` are now truthful as written -> codebase grep-proof.

## What to Change

### 1. Reassess the drafted failure against the live repo

Re-run the drafted failing commands and determine whether the aggregate-only failure still exists on the live `tools/world-mcp` seam.

### 2. Truth the ticket to the real owned boundary

If the aggregate lane already passes, rewrite this ticket from an implementation ticket into a validation-only record and remove stale assumptions about a still-broken test seam.

### 3. Confirm sibling proof surfaces remain truthful

Verify whether active SPEC-12 tickets that cite `pnpm --filter @worldloom/world-mcp test` still need edits. If the lane passes, leave those sibling tickets untouched.

## Files to Touch

- `tickets/SPEC12SKIRELRET-011.md` (modify — truth the ticket to the live validation-only boundary)

## Out of Scope

- Changing the owned implementation boundary of archived `SPEC12SKIRELRET-005`
- Rewriting `world-mcp` tools or tests without a live failing witness
- Editing sibling SPEC-12 tickets whose cited package-wide lane is already truthful

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter @worldloom/world-mcp test` passes.
2. `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js` still passes.
3. Grep review confirms active SPEC-12 tickets that keep a package-wide `@worldloom/world-mcp` test lane cite a truthful, currently passing command.

### Invariants

1. The package-wide `@worldloom/world-mcp` test command is again a truthful aggregate acceptance surface.
2. The stdio lifecycle smoke remains meaningful; validation must not replace it with a weaker or synthetic proof surface.

## Test Plan

### New/Modified Tests

1. `None — validation-only ticket; the live package and compiled stdio smoke already provide the truthful proof surface.`

### Commands

1. `pnpm --filter @worldloom/world-mcp test`
2. `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js`
3. `rg -n "pnpm --filter @worldloom/world-mcp test|@worldloom/world-mcp test" tickets/SPEC12SKIRELRET-006.md tickets/SPEC12SKIRELRET-007.md tickets/SPEC12SKIRELRET-008.md tickets/SPEC12SKIRELRET-010.md`

## Outcome

Completion date: 2026-04-24.

No `world-mcp` code or test changes were required. Reassessment showed the package-wide `pnpm --filter @worldloom/world-mcp test` lane already passes on the live repo, including the previously cited `dist/tests/integration/server-stdio.test.js` subtest. The direct compiled stdio lifecycle smoke also still passes from `tools/world-mcp`.

This ticket therefore closes as truthful validation and ticket-contract repair only. Active sibling SPEC-12 tickets that still cite the broad package-wide lane can keep that acceptance command unchanged because it is currently passing.

## Verification Result

1. Passed: `pnpm --filter @worldloom/world-mcp test`
2. Passed: `cd tools/world-mcp && node dist/tests/integration/server-stdio.test.js`
3. Reviewed: `rg -n "pnpm --filter @worldloom/world-mcp test|@worldloom/world-mcp test" tickets/SPEC12SKIRELRET-006.md tickets/SPEC12SKIRELRET-007.md tickets/SPEC12SKIRELRET-008.md tickets/SPEC12SKIRELRET-010.md`

## Deviations

The drafted ticket assumed an active aggregate-only suite failure that no longer exists in the live repo. Instead of forcing speculative runner or test changes, the ticket was narrowed to validation-only truthing of the already-green package-wide acceptance surface.
