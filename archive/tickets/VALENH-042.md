# VALENH-042: world-validate CLI tests should surface child-process spawn failures instead of parsing empty output

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — validators package test harness helper plus CLI-backed tests under `tools/validators/tests/cli/` and `tools/validators/tests/integration/`.
**Deps**: None.

## Problem

At intake during post-ticket review of `archive/tickets/VALENH-041.md`, the broad validators package lane `cd tools/validators && npm test` was red before and after the reviewed schema change. The failing compiled files were:

- `dist/tests/cli/world-validate.story-bundle.test.js`
- `dist/tests/cli/world-validate.test.js`
- `dist/tests/integration/spec09-verification.test.js`
- `dist/tests/integration/spec34-integration.test.js`
- `dist/tests/integration/spec43-midstory-introduction.test.js`
- `dist/tests/integration/spec44-append-only-supersession.test.js`
- `dist/tests/integration/spec64-world-compatibility-coverage.test.js`
- `dist/tests/integration/world-compatibility-cli.test.js`

Representative diagnostics show a test-harness child-process failure, not a validator behavior failure. Running `node dist/tests/cli/world-validate.test.js` from `tools/validators` reports `spawnSync /home/joeloverbeck/projects/worldloom/tools/validators/dist/src/cli/world-validate.js EPERM` and `spawnSync git EPERM`. Running a focused reproduction of the story-bundle CLI invocation showed `spawnSync(process.execPath, [cliPath, ...])` returning `{ error: "spawnSync /usr/local/bin/node EPERM", stdout: "", stderr: "" }`, while the test proceeded to `JSON.parse(scoped.stdout)`, producing `Unexpected end of JSON input`.

Before this ticket, those tests obscured the real failure mode: when child-process execution was blocked or unavailable, several tests parsed empty stdout/stderr instead of first asserting that the spawn itself succeeded. This made the package-wide validators proof lane noisy and prevented reviewers from distinguishing sandbox/process restrictions from real `world-validate` regressions.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/tests/cli/world-validate.test.ts` invokes the compiled CLI executable path directly via `execFileSync(cliPath, ...)` and `spawnSync(cliPath, ...)` in multiple tests; the `--since` test also invokes `git` through `execFileSync`. In the current Codex environment, direct module execution of the compiled test reports `EPERM` for both executable and git spawn paths.
2. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` already invokes the CLI as `spawnSync(process.execPath, [cliPath, ...])`, but the review probe still observed `error: "spawnSync /usr/local/bin/node EPERM"` with empty output. The test does not inspect `result.error` before parsing stdout.
3. Shared boundary under audit: CLI-backed validators package tests are the broad proof lane for validator/schema tickets, and they must make child-process launch failures explicit before asserting CLI JSON or diagnostic content.
4. FOUNDATIONS alignment: this ticket supports the Machine-Facing Layer / Validator Framework contract by restoring a truthful package proof surface. It does not change world canon, validator semantics, HARD-GATE approval flow, or Mystery Reserve enforcement.
5. Active-ticket ownership check: no active ticket currently owns the red `tools/validators && npm test` CLI/integration harness failure; the only active tickets at review time were `tickets/FOUNDATIONS-006.md` and this newly drafted ticket.
6. Current-run baseline: on 2026-05-23, `npm test` from `tools/validators` rebuilt the package and passed all 960 tests in this checkout. The ticket remains valid as a harness diagnostic hardening ticket because the listed CLI-backed tests still call `spawnSync` / `execFileSync` and parse stdout/stderr without a shared spawn-error and nonempty-output guard.

## Architecture Check

1. Centralizing CLI process invocation behind a test helper is cleaner than fixing each JSON parse assertion independently. The helper can assert `result.error === undefined`, preserve stdout/stderr on assertion failure, and make environment failures explicit before behavior assertions run.
2. No backwards-compatibility aliasing/shims are introduced. This ticket changes test harness diagnostics and invocation discipline only; it does not add alternate CLI behavior or weaken validators.

## Verification Layers

1. Child-process launch failures are surfaced clearly -> focused CLI test helper proof: representative `world-validate` tests fail with an explicit spawn-error assertion when the environment blocks child processes, rather than `Unexpected end of JSON input`.
2. CLI behavior remains covered when child-process execution is available -> compiled CLI test files under `tools/validators/dist/tests/cli/` and the affected integration files pass or report behavior assertions with nonempty stdout/stderr.
3. Package proof lane restored or truthfully classified -> `cd tools/validators && npm test` no longer fails through empty-output JSON parsing; if local sandbox still blocks child processes, the failure is a clear environment diagnostic rather than an ambiguous validator regression.

## Landed Changes

### 1. Added a CLI test invocation helper

`tools/validators/tests/_helpers/cli.ts` now wraps child-process execution for CLI-backed tests. The helper:

- calls the compiled `world-validate` CLI through `process.execPath`
- fails immediately when `result.error` is present before parsing stdout/stderr
- includes command, cwd, stdout, stderr, status, signal, and `result.error.message` in the failure text
- provides a JSON parse helper that first verifies the selected output stream is nonempty
- wraps `git` child-process calls used by the `--since` test

### 2. Patched CLI-backed tests to use the helper

The listed CLI-backed tests now route `world-validate` child-process calls through the helper before asserting status or parsing JSON. The `--since` test now routes `git` calls through the same spawn-error guard.

## Files to Touch

- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` (modify)
- `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` (modify)
- `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts` (modify)
- `tools/validators/tests/integration/world-compatibility-cli.test.ts` (modify)
- `tools/validators/tests/_helpers/cli.ts` (new).

## Out of Scope

- Changing `world-validate` runtime behavior.
- Changing validator rules, schema contracts, or package public exports.
- Fixing unrelated content/fixture failures if the helper reveals true behavior regressions after spawn succeeds; classify those separately during implementation.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile clean.
2. `cd tools/validators && node dist/tests/cli/world-validate.test.js` — produces explicit child-process diagnostics when spawn is blocked, and passes the CLI behavior assertions when spawn is available.
3. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec43-midstory-introduction.test.js dist/tests/integration/spec44-append-only-supersession.test.js dist/tests/integration/spec64-world-compatibility-coverage.test.js dist/tests/integration/world-compatibility-cli.test.js` — the previously red files no longer fail through empty-output JSON parsing.
4. `cd tools/validators && npm test` — broad package lane passes.

### Invariants

1. Test harness failures must not masquerade as validator behavior failures.
2. CLI tests must not parse stdout/stderr until the spawn result has been checked for `error` and the selected stream is nonempty.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/_helpers/cli.ts` — new shared child-process and JSON-output guard.
2. `tools/validators/tests/cli/world-validate.test.ts` and sibling CLI-backed integration tests — updated harness assertions around child-process results.
3. No separate helper-only test file was added; the affected compiled CLI tests exercise the helper through successful child-process paths and the sandbox-blocked diagnostic path.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node dist/tests/cli/world-validate.test.js`
3. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec43-midstory-introduction.test.js dist/tests/integration/spec44-append-only-supersession.test.js dist/tests/integration/spec64-world-compatibility-coverage.test.js dist/tests/integration/world-compatibility-cli.test.js`
4. `cd tools/validators && npm test`

## Outcome

Implemented the validators CLI test harness diagnostic hardening. CLI-backed tests now check child-process spawn errors before status assertions and before parsing JSON output, and empty stdout/stderr JSON parses are guarded with explicit nonempty-output assertions.

Package README and repo-level `world-validate` command docs were inspected; no user-facing CLI behavior or command syntax changed, so no docs update was needed.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node dist/tests/cli/world-validate.test.js` in the default sandbox — failed as expected with explicit `Child process failed to launch: spawnSync /usr/local/bin/node EPERM` and `Child process failed to launch: spawnSync git EPERM` diagnostics, not `Unexpected end of JSON input`.
3. `cd tools/validators && node dist/tests/cli/world-validate.test.js` with child-process permission — passed 8/8 tests.
4. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec43-midstory-introduction.test.js dist/tests/integration/spec44-append-only-supersession.test.js dist/tests/integration/spec64-world-compatibility-coverage.test.js dist/tests/integration/world-compatibility-cli.test.js` — passed 54/54 tests.
5. `cd tools/validators && npm test` — passed 960/960 tests.

## Deviations

- The current checkout's pre-edit `tools/validators` baseline was already green: `npm test` passed 960/960 tests before source edits. The ticket therefore landed as diagnostic hardening rather than as a local broad-suite red-lane repair.
- `tools/validators/dist/` was refreshed by `npm run build` / `npm test` as an ignored generated artifact; source changes remain in tracked TypeScript test files.
