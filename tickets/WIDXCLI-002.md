# WIDXCLI-002: Stabilize world-index CLI tests under the broad package runner

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — likely `tools/world-index/tests/cli-init.test.ts`, `tools/world-index/tests/cli-smoke.test.ts`, shared world-index CLI test helpers, and possibly `tools/world-index/package.json` if the package runner must serialize or isolate CLI child-process tests.
**Deps**: None

## Problem

`bash scripts/check-all.sh` is repeatedly red before it reaches downstream packages because `tools/world-index npm test` reports the compiled CLI test files as failed under the broad runner:

- `dist/tests/cli-init.test.js`
- `dist/tests/cli-smoke.test.js`

The same two compiled files pass when run directly together:

```bash
cd tools/world-index && node --test dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js
```

This makes the repo-level verification lane unreliable: unrelated package tickets cannot honestly claim `scripts/check-all.sh` green even when their focused package proofs pass. The failure has now been observed in multiple completed-ticket closeouts, including `archive/tickets/PGHASHCLI-001.md`, `archive/tickets/MNTSNAPDRIFT-001.md`, and the post-ticket review for `archive/tickets/REPLAYSTATUSFILT-001.md`.

## Assumption Reassessment (2026-05-26)

1. Live current failure: `bash scripts/check-all.sh` failed in `tools/world-index` after `world-index: build`, with `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js` reported as failing under `node --test "dist/tests/**/*.test.js"`; 30 other world-index files passed before the wrapper exited.
2. Direct diagnostic proof: `cd tools/world-index && node --test dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js` passed, 9 tests. This suggests the defect is broad-runner interaction, process/env/temp isolation, test concurrency, or package-script orchestration rather than the individual CLI assertions being inherently red.
3. Shared boundary under audit: the `tools/world-index` package test contract consumed by `scripts/check-all.sh`. The implementation must make the broad package suite reliable without weakening the CLI behavior asserted by `archive/tickets/WIDXCLI-001.md` and `archive/tickets/WMINIT-001-world-index-init-cli-command.md`.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` treats `worlds/<slug>/_index/world.db` as a derived artifact and the machine-facing layer depends on deterministic index tooling. A repo-level proof lane that intermittently fails before validators/world-mcp run weakens handoff discipline even though it does not mutate canon.
5. HARD-GATE classification: this ticket does not change approval tokens, patch-plan submission, or validator semantics directly. If implementation changes `scripts/check-all.sh` or package test ordering only, HARD-GATE behavior is not affected. If implementation changes world-index CLI semantics used by HARD-GATE recovery docs, reassess docs and proof scope before source edits.
6. Adjacent ownership check: no active ticket currently owns the repeated `tools/world-index` broad-runner failure. Archived `WIDXCLI-001` and `WMINIT-001` own the CLI/root/init behavior that the focused tests assert, but not the new broad-runner instability.
7. Scope boundary: do not change validators, world-mcp, patch-engine, or the reviewed `REPLAYSTATUSFILT-001` implementation to mask this failure. The owned seam is world-index test reliability and any necessary CLI-test helper isolation.

## Architecture Check

1. Fixing the broad package lane is cleaner than continuing to record per-ticket deviations because `scripts/check-all.sh` is the shared repo verification contract and should not fail before downstream packages for a known world-index runner issue.
2. No backwards-compatibility aliasing/shims should be introduced; preserve current world-index CLI behavior while making tests isolated and deterministic.

## Verification Layers

1. Direct failing surface reproduced and stabilized -> targeted package verification (`cd tools/world-index && npm run build && npm test`) passes.
2. Individual CLI behavior preserved -> focused compiled CLI proof (`node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js`) passes.
3. Repo-level handoff restored -> `bash scripts/check-all.sh` passes far enough to include `tools/world-index` cleanly; if a later package fails, classify separately rather than treating this ticket as owning it.
4. No stale docs or command contracts -> codebase grep/manual review over `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` if command or runner invocation semantics change.

## What to Change

### 1. Diagnose the broad-runner interaction

Run the package-local broad suite from `tools/world-index` and isolate why `cli-init.test.ts` / `cli-smoke.test.ts` fail only under `node --test "dist/tests/**/*.test.js"`. Check for shared temp directories, cwd/env mutation, inherited `WORLDLOOM_ROOT`, root marker collisions, generated `_index` collisions, child-process stdio races, or assumptions about serial execution.

### 2. Make CLI tests isolated under broad execution

Patch the narrowest world-index test helper or test files needed so the CLI tests can run concurrently with the rest of the package suite. Prefer per-test temp roots, explicit env cleanup, and deterministic child-process cwd/env setup over serializing the entire package unless concurrency is the true contract break.

### 3. Truth package script or docs only if required

If the correct fix is package-script-level serialization or a documented split between broad and CLI tests, update `tools/world-index/package.json` and package/repo docs accordingly. Do not change docs if the fix stays test-helper-local.

## Files to Touch

- `tools/world-index/tests/cli-init.test.ts` (modify, likely)
- `tools/world-index/tests/cli-smoke.test.ts` (modify, likely)
- `tools/world-index/tests/helpers/*` (modify, if shared temp/env helpers own the issue)
- `tools/world-index/package.json` (modify, only if package runner orchestration must change)
- `tools/world-index/README.md` (modify, only if command/test invocation contract changes)
- `docs/WORKFLOWS.md` / `docs/MACHINE-FACING-LAYER.md` (modify, only if user-facing invocation contract changes)

## Out of Scope

- Changing `snapshot_replay_equality`, `state_snapshot_integrity`, or any validator behavior.
- Changing world content or `_source/` records.
- Weakening or deleting the CLI assertions that prove `world-index --help`, `--version`, `render --story`, `init`, and root-resolution behavior.
- Treating unrelated downstream package failures after world-index as owned by this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js`
3. `cd tools/world-index && npm test`
4. `bash scripts/check-all.sh` at least clears `tools/world-index`; if a later package fails, record the later failure as a separate baseline/deviation.

### Invariants

1. `tools/world-index npm test` must not fail the CLI test files only because they are run inside the broad `dist/tests/**/*.test.js` invocation.
2. CLI tests must keep proving the command behaviors landed by `archive/tickets/WIDXCLI-001.md` and `archive/tickets/WMINIT-001-world-index-init-cli-command.md`.
3. Test isolation must not rely on checked-in or gitignored live `worlds/<slug>/` state.

## Test Plan

### New/Modified Tests

1. Existing `tools/world-index/tests/cli-init.test.ts` — update only if needed to remove broad-runner coupling while preserving behavior coverage.
2. Existing `tools/world-index/tests/cli-smoke.test.ts` — update only if needed to remove broad-runner coupling while preserving behavior coverage.
3. Existing `tools/world-index/tests/cli-world-root.test.ts` — run as focused regression proof for root-resolution semantics.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js`
3. `cd tools/world-index && npm test`
4. `bash scripts/check-all.sh`
