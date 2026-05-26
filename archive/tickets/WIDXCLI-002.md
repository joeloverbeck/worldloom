# WIDXCLI-002: Stabilize world-index CLI tests under the broad package runner

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/package.json`, `tools/world-index/scripts/run-tests.mjs`, and `tools/world-index/src/cli.ts`.
**Deps**: None

## Problem

At intake, `bash scripts/check-all.sh` was repeatedly red before it reached downstream packages because `tools/world-index npm test` reported the compiled CLI test files as failed under the broad runner:

- `dist/tests/cli-init.test.js`
- `dist/tests/cli-smoke.test.js`

At intake, the same two compiled files passed when run directly together:

```bash
cd tools/world-index && node --test dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js
```

That made the repo-level verification lane unreliable: unrelated package tickets could not honestly claim `scripts/check-all.sh` green even when their focused package proofs passed. The failure had been observed in multiple completed-ticket closeouts, including `archive/tickets/PGHASHCLI-001.md`, `archive/tickets/MNTSNAPDRIFT-001.md`, and the post-ticket review for `archive/tickets/REPLAYSTATUSFILT-001.md`.

## Assumption Reassessment (2026-05-26)

1. Intake failure reproduced: `bash scripts/check-all.sh` failed in `tools/world-index` after `world-index: build`, with `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js` reported as failing under `node --test "dist/tests/**/*.test.js"`; 30 other world-index files passed before the wrapper exited.
2. Direct diagnostic proof: `cd tools/world-index && node --test dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js` passed, 9 tests. This suggests the defect is broad-runner interaction, process/env/temp isolation, test concurrency, or package-script orchestration rather than the individual CLI assertions being inherently red.
3. Shared boundary under audit: the `tools/world-index` package test contract consumed by `scripts/check-all.sh`. The implementation must make the broad package suite reliable without weakening the CLI behavior asserted by `archive/tickets/WIDXCLI-001.md` and `archive/tickets/WMINIT-001-world-index-init-cli-command.md`.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` treats `worlds/<slug>/_index/world.db` as a derived artifact and the machine-facing layer depends on deterministic index tooling. A repo-level proof lane that intermittently fails before validators/world-mcp run weakens handoff discipline even though it does not mutate canon.
5. HARD-GATE classification: this ticket does not change approval tokens, patch-plan submission, or validator semantics directly. If implementation changes `scripts/check-all.sh` or package test ordering only, HARD-GATE behavior is not affected. If implementation changes world-index CLI semantics used by HARD-GATE recovery docs, reassess docs and proof scope before source edits.
6. Adjacent ownership check: no active ticket currently owns the repeated `tools/world-index` broad-runner failure. Archived `WIDXCLI-001` and `WMINIT-001` own the CLI/root/init behavior that the focused tests assert, but not the new broad-runner instability.
7. Scope boundary: do not change validators, world-mcp, patch-engine, or the reviewed `REPLAYSTATUSFILT-001` implementation to mask this failure. The owned seam is world-index test reliability and any necessary CLI-test helper isolation.
8. Implementation reassessment: package-local `npm run build` followed by direct `npm test` passed once at current HEAD, but `bash scripts/check-all.sh` immediately reproduced the broad-runner failure after the same package build, reporting only `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js` as failed. Rerunning `npm test` package-locally then passed again. The live defect is intermittent full-suite file-level concurrency around the child-process CLI test files, so the narrowest truthful fix is a package-local runner that preserves broad non-CLI coverage and runs CLI files in serial `node --test` processes.
9. Implementation reassessment after sandbox diagnostics: Codex sandbox runs could still surface `spawnSync /usr/local/bin/node EPERM` after the heavy non-CLI batch. The same `bash scripts/check-all.sh` command passed outside the sandbox with approval, so those EPERM failures are environment restrictions rather than repo failures.

## Architecture Check

1. Fixing the broad package lane is cleaner than continuing to record per-ticket deviations because `scripts/check-all.sh` is the shared repo verification contract and should not fail before downstream packages for a known world-index runner issue.
2. No backwards-compatibility aliasing/shims should be introduced; preserve current world-index CLI behavior while making tests isolated and deterministic.

## Verification Layers

1. Direct failing surface reproduced and stabilized -> targeted package verification (`cd tools/world-index && npm run build && npm test`) passes.
2. Individual CLI behavior preserved -> focused compiled CLI proof (`node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js`) passes.
3. Repo-level handoff restored -> `bash scripts/check-all.sh` passes far enough to include `tools/world-index` cleanly; if a later package fails, classify separately rather than treating this ticket as owning it.
4. No stale docs or command contracts -> codebase grep/manual review over `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` if command or runner invocation semantics change.

## Landed Changes

### 1. Diagnose the broad-runner interaction

The package-local broad suite and `scripts/check-all.sh` reproduced the historical wrapper failure before implementation. Direct package reruns could pass, which confirmed the failure was intermittent and tied to full-suite execution around CLI child-process tests.

### 2. Make CLI tests isolated under broad execution

Added `tools/world-index/scripts/run-tests.mjs` and changed `npm test` to call it. The runner discovers compiled `dist/tests/**/*.test.js`, runs non-CLI tests together through `node --test`, then runs `cli-world-root`, `cli-init`, and `cli-smoke` as explicit serial `node --test <file>` processes. The CLI assertions remain unchanged; only package test orchestration changed.

### 3. Preserve CLI output capture and docs boundary

Updated `tools/world-index/src/cli.ts` so the CLI entrypoint waits for stdout/stderr flush completion before setting the final process exit code. This preserves command-function tests that intercept `process.stdout.write` while making spawned CLI output capture reliable under the serialized runner. Package/repo CLI docs remain unchanged because no user-facing command semantics changed.

## Files to Touch

- `tools/world-index/package.json` (modify — point `npm test` at the package-local runner)
- `tools/world-index/scripts/run-tests.mjs` (new — broad non-CLI compiled tests plus serial CLI compiled tests)
- `tools/world-index/src/cli.ts` (modify — flush stdout/stderr before CLI process exit)

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

1. `tools/world-index/scripts/run-tests.mjs` — new package-local runner that preserves broad non-CLI compiled coverage and serializes the child-process CLI compiled tests.
2. Existing `tools/world-index/tests/cli-init.test.ts`, `tools/world-index/tests/cli-smoke.test.ts`, and `tools/world-index/tests/cli-world-root.test.ts` — unchanged assertions, run as focused regression proof for CLI/root-resolution semantics.
3. `tools/world-index/src/cli.ts` — entrypoint flush behavior changed; covered by existing spawned CLI tests.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js`
3. `cd tools/world-index && npm test`
4. `bash scripts/check-all.sh`

## Outcome

Completed on 2026-05-26.

`tools/world-index npm test` no longer runs every compiled test file, including child-process CLI tests, in one full-suite file-level batch. The package test script now uses `scripts/run-tests.mjs` to preserve broad non-CLI compiled coverage while isolating the three CLI-focused compiled files in serial `node --test` runs.

The CLI entrypoint now waits for stdout/stderr flush completion before assigning the final exit code, which keeps spawned CLI output reliable without changing command behavior or breaking in-process command tests.

## Verification Result

1. Pre-edit `cd tools/world-index && npm run build` — passed.
2. Pre-edit `cd tools/world-index && npm test` — passed once, 139 tests.
3. Pre-edit `bash scripts/check-all.sh` — reproduced the ticket failure in `tools/world-index`, reporting `dist/tests/cli-init.test.js` and `dist/tests/cli-smoke.test.js` failed under the broad wrapper.
4. Final `cd tools/world-index && npm run build` — passed.
5. Final `cd tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-init.test.js dist/tests/cli-smoke.test.js` — passed, 14 tests.
6. Final `cd tools/world-index && npm test` — passed through `scripts/run-tests.mjs`: 125 non-CLI tests, 4 `cli-init` tests, 5 `cli-smoke` tests, and 5 `cli-world-root` tests.
7. Final `bash scripts/check-all.sh` — passed outside the Codex sandbox after the sandboxed run produced child-process `EPERM`; all packages green, including `world-index`, `patch-engine`, `validators`, `hooks`, and `world-mcp`.
8. Package user-facing surface review: `tools/world-index/README.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` were inspected and left unchanged because the landed change only affects test orchestration plus CLI stream flushing, not operator command syntax or behavior.
9. `git diff --check` — passed.

## Deviations

- The drafted likely test-file/helper edits were not needed. Existing CLI assertions stayed unchanged; the fix landed in package test orchestration plus CLI stream-flush behavior.
- The final broad wrapper proof required escalation outside the Codex sandbox because sandboxed post-non-CLI child process spawns reported `spawnSync /usr/local/bin/node EPERM`. The same command passed outside the sandbox, so the EPERM result is recorded as an environment restriction rather than an owned repo failure.
