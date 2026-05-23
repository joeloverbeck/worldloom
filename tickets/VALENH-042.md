# VALENH-042: world-validate CLI tests should surface child-process spawn failures instead of parsing empty output

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/tests/cli/world-validate.test.ts`, `tools/validators/tests/cli/world-validate.story-bundle.test.ts`, and CLI-backed integration tests under `tools/validators/tests/integration/`.
**Deps**: None.

## Problem

During post-ticket review of `archive/tickets/VALENH-041.md`, the broad validators package lane `cd tools/validators && npm test` was red before and after the reviewed schema change. The failing compiled files were:

- `dist/tests/cli/world-validate.story-bundle.test.js`
- `dist/tests/cli/world-validate.test.js`
- `dist/tests/integration/spec09-verification.test.js`
- `dist/tests/integration/spec34-integration.test.js`
- `dist/tests/integration/spec43-midstory-introduction.test.js`
- `dist/tests/integration/spec44-append-only-supersession.test.js`
- `dist/tests/integration/spec64-world-compatibility-coverage.test.js`
- `dist/tests/integration/world-compatibility-cli.test.js`

Representative diagnostics show a test-harness child-process failure, not a validator behavior failure. Running `node dist/tests/cli/world-validate.test.js` from `tools/validators` reports `spawnSync /home/joeloverbeck/projects/worldloom/tools/validators/dist/src/cli/world-validate.js EPERM` and `spawnSync git EPERM`. Running a focused reproduction of the story-bundle CLI invocation showed `spawnSync(process.execPath, [cliPath, ...])` returning `{ error: "spawnSync /usr/local/bin/node EPERM", stdout: "", stderr: "" }`, while the test proceeded to `JSON.parse(scoped.stdout)`, producing `Unexpected end of JSON input`.

The current tests therefore obscure the real failure mode: when child-process execution is blocked or unavailable, several tests parse empty stdout/stderr instead of first asserting that the spawn itself succeeded. This makes the package-wide validators proof lane noisy and prevents reviewers from distinguishing sandbox/process restrictions from real `world-validate` regressions.

## Assumption Reassessment (2026-05-23)

1. `tools/validators/tests/cli/world-validate.test.ts` invokes the compiled CLI executable path directly via `execFileSync(cliPath, ...)` and `spawnSync(cliPath, ...)` in multiple tests; the `--since` test also invokes `git` through `execFileSync`. In the current Codex environment, direct module execution of the compiled test reports `EPERM` for both executable and git spawn paths.
2. `tools/validators/tests/cli/world-validate.story-bundle.test.ts` already invokes the CLI as `spawnSync(process.execPath, [cliPath, ...])`, but the review probe still observed `error: "spawnSync /usr/local/bin/node EPERM"` with empty output. The test does not inspect `result.error` before parsing stdout.
3. Shared boundary under audit: CLI-backed validators package tests are the broad proof lane for validator/schema tickets, and they must make child-process launch failures explicit before asserting CLI JSON or diagnostic content.
4. FOUNDATIONS alignment: this ticket supports the Machine-Facing Layer / Validator Framework contract by restoring a truthful package proof surface. It does not change world canon, validator semantics, HARD-GATE approval flow, or Mystery Reserve enforcement.
5. Active-ticket ownership check: no active ticket currently owns the red `tools/validators && npm test` CLI/integration harness failure; the only active tickets at review time were `tickets/FOUNDATIONS-006.md` and this newly drafted ticket.

## Architecture Check

1. Centralizing CLI process invocation behind a test helper is cleaner than fixing each JSON parse assertion independently. The helper can assert `result.error === undefined`, preserve stdout/stderr on assertion failure, and make environment failures explicit before behavior assertions run.
2. No backwards-compatibility aliasing/shims are introduced. This ticket changes test harness diagnostics and invocation discipline only; it does not add alternate CLI behavior or weaken validators.

## Verification Layers

1. Child-process launch failures are surfaced clearly -> focused CLI test helper proof: representative `world-validate` tests fail with an explicit spawn-error assertion when the environment blocks child processes, rather than `Unexpected end of JSON input`.
2. CLI behavior remains covered when child-process execution is available -> compiled CLI test files under `tools/validators/dist/tests/cli/` and the affected integration files pass or report behavior assertions with nonempty stdout/stderr.
3. Package proof lane restored or truthfully classified -> `cd tools/validators && npm test` no longer fails through empty-output JSON parsing; if local sandbox still blocks child processes, the failure is a clear environment diagnostic rather than an ambiguous validator regression.

## What to Change

### 1. Add or reuse a CLI test invocation helper

Create a small helper in the validators test tree, or local helper functions in the affected files if a shared helper is too broad, that wraps `spawnSync` / `execFileSync` for `world-validate` invocations. The helper must:

- call the CLI in the package-truthful form for the current test contract
- assert or throw when `result.error` is present before parsing stdout/stderr
- include command, cwd, stdout, stderr, status, and `result.error.message` in the failure text
- provide a JSON parse helper that first verifies the selected output stream is nonempty

### 2. Patch CLI-backed tests to use the helper

Update direct `world-validate` executable launches in `tools/validators/tests/cli/world-validate.test.ts` and CLI-backed integration tests to route through the helper or equivalent local guard before JSON parsing. Keep tests that intentionally invoke `git` explicit about whether `git` spawn failure is an environment skip/diagnostic or a hard test failure.

## Files to Touch

- `tools/validators/tests/cli/world-validate.test.ts` (modify)
- `tools/validators/tests/cli/world-validate.story-bundle.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec34-integration.test.ts` (modify)
- `tools/validators/tests/integration/spec43-midstory-introduction.test.ts` (modify)
- `tools/validators/tests/integration/spec44-append-only-supersession.test.ts` (modify)
- `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts` (modify)
- `tools/validators/tests/integration/world-compatibility-cli.test.ts` (modify)
- Optional: `tools/validators/tests/_helpers/cli.ts` (new) if a shared helper is chosen.

## Out of Scope

- Changing `world-validate` runtime behavior.
- Changing validator rules, schema contracts, or package public exports.
- Fixing unrelated content/fixture failures if the helper reveals true behavior regressions after spawn succeeds; classify those separately during implementation.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build` — TypeScript compile clean.
2. `cd tools/validators && node dist/tests/cli/world-validate.test.js` — produces explicit child-process diagnostics when spawn is blocked, or passes the CLI behavior assertions when spawn is available.
3. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec43-midstory-introduction.test.js dist/tests/integration/spec44-append-only-supersession.test.js dist/tests/integration/spec64-world-compatibility-coverage.test.js dist/tests/integration/world-compatibility-cli.test.js` — the previously red files no longer fail through empty-output JSON parsing.
4. `cd tools/validators && npm test` — broad package lane passes, or any remaining failure is classified with a concrete non-spawn, non-empty-output diagnostic and a follow-up owner.

### Invariants

1. Test harness failures must not masquerade as validator behavior failures.
2. CLI tests must not parse stdout/stderr until the spawn result has been checked for `error` and the selected stream is nonempty.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/cli/world-validate.test.ts` and sibling CLI-backed integration tests — update harness assertions around child-process results.
2. Optional helper test if a shared helper is added; otherwise no separate test file is required because the affected compiled CLI tests exercise the helper.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node dist/tests/cli/world-validate.test.js`
3. `cd tools/validators && node --test dist/tests/cli/world-validate.story-bundle.test.js dist/tests/cli/world-validate.test.js dist/tests/integration/spec09-verification.test.js dist/tests/integration/spec34-integration.test.js dist/tests/integration/spec43-midstory-introduction.test.js dist/tests/integration/spec44-append-only-supersession.test.js dist/tests/integration/spec64-world-compatibility-coverage.test.js dist/tests/integration/world-compatibility-cli.test.js`
4. `cd tools/validators && npm test`
