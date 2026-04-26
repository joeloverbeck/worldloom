# CIINT-003: Enable world-index integration tests in CI

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None at the source level — single-line change to `tools/world-index/package.json` plus the existing `.github/workflows/ci-world-index.yml` continues to invoke the package-level `npm test`
**Deps**: `archive/tickets/CIINT-001.md`, `archive/tickets/CIINT-002.md` (completed prerequisites; both are required for the widened test script to stay green)

## Problem

At intake, `tools/world-index/package.json` declared its `test` script as:

```
"test": "node --test dist/tests/*.test.js"
```

The single asterisk in `dist/tests/*.test.js` matched only top-level test files. The `dist/tests/integration/` subdirectory was silently excluded. `patch-engine` and `validators` use recursive test globs, `world-mcp` uses Node's default discovery, and `hooks` currently has only top-level tests.

Consequence: `tools/world-index/tests/integration/build-animalia.test.ts` did not run during local `npm test` and therefore did not run in `.github/workflows/ci-world-index.yml`. Real bugs and content drift in the integration test went undetected until the post-CI-rollout audit.

This ticket switched the glob to make `npm test` recursive, bringing world-index in line with the other packages that already include nested tests and ensuring the integration test runs in CI on every push to main and every PR.

## Assumption Reassessment (2026-04-26)

1. At intake, `tools/world-index/package.json` read `"test": "node --test dist/tests/*.test.js"`. Verified via direct read (no other test-related script aliases this command).
2. The recursive glob must be quoted as `"dist/tests/**/*.test.js"` in the npm script. A dry run through `/bin/sh` showed that unquoted `dist/tests/**/*.test.js` expands to only `dist/tests/integration/build-animalia.test.js`, which would drop the top-level tests. Quoting the glob lets Node's test runner perform recursive discovery and pick up both top-level compiled tests and `dist/tests/integration/build-animalia.test.js`.
3. `.github/workflows/ci-world-index.yml` currently runs `npm test` in `tools/world-index/`. No workflow file changes are required — the recursive glob automatically extends CI coverage to the integration test once `npm test` invokes it.
4. Cross-artifact boundary: this ticket only changes the `npm test` invocation surface. It does not touch `enumerate.ts`, `build.ts`, the test files themselves, or the workflow YAML. `patch-engine` and `validators` already use recursive globs, `world-mcp` uses default Node discovery, and `hooks` has only top-level tests under the live tree.
5. Hard prerequisite: `archive/tickets/CIINT-001.md` and `archive/tickets/CIINT-002.md` both have `Status: COMPLETED` in their archived records. The live integration test passes under the widened test script, so the prerequisite gate is satisfied for this branch.
6. The package's other test script `test:spec10-verification` is untouched. If the integration test for SPEC-10 should also run in CI, that's a separate concern (likely worth its own ticket if the shell script is intended as a CI gate).

## Architecture Check

1. Aligning world-index's test glob with the recursive/default discovery packages eliminates a silent coverage gap. The quoted recursive glob is required so the npm shell does not collapse the command to nested tests only.
2. No backwards-compatibility aliasing/shims introduced. The change replaces the non-recursive glob with one quoted recursive glob; no fallback test command is preserved.

## Verification Layers

1. `npm test` in `tools/world-index/` runs the integration test -> targeted `npm test` invocation surfaces `build-animalia` test names in output.
2. CI workflow `CI - world-index` delegates to package-level `npm test` -> workflow file read plus local package command proof. Live GitHub Actions log review remains a post-PR observation, not a local implementation gate.
3. No other package's test command is altered -> codebase grep-proof on `tools/*/package.json` `"test"` entries before and after the change.

## What to Change

### 1. Update the test glob in `tools/world-index/package.json`

Change the `test` script from `"test": "node --test dist/tests/*.test.js"` to `"test": "node --test \"dist/tests/**/*.test.js\""`.

This uses Node's recursive test-glob handling and brings the integration test into the default `npm test` invocation without dropping the existing top-level tests.

## Files to Touch

- `tools/world-index/package.json` (modify — single line)

## Out of Scope

- Workflow file changes. `.github/workflows/ci-world-index.yml` already runs `npm test`; the glob change in `package.json` automatically expands its scope.
- The `test:spec10-verification` shell script. If that should also gate CI, it's a separate ticket.
- Adding integration tests to other packages. This ticket only widens `world-index` discovery; sibling package discovery remains unchanged.
- Changes to the test fixture or to the integration test's content (covered by `archive/tickets/CIINT-001.md` and `archive/tickets/CIINT-002.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test 2>&1 | grep -c "^# Subtest:"` returns a count higher than 55 (the prior top-level-only count) — the integration test's 12 subtests are included.
2. `cd tools/world-index && npm test` exit code is 0.
3. Local equivalents of the other four package CI test commands (`patch-engine`, `validators`, `world-mcp`, `hooks`) continue to pass — no regression.

### Invariants

1. `tools/world-index/package.json` `"test"` script uses a quoted recursive glob (`"dist/tests/**/*.test.js"`).
2. `npm test` in `tools/world-index/` invokes both top-level and integration test files.
3. CI workflow does not require any YAML edits; the package-level test command is the single point of control.

## Test Plan

### New/Modified Tests

1. None — this ticket does not add or modify tests. It changes the invocation surface so existing tests are exercised in CI. Verification is command-based.

### Commands

1. `cd tools/world-index && npm run build && npm test 2>&1 | tail -15` — targeted: confirms the recursive glob picks up integration tests and they pass.
2. `cd tools/patch-engine && npm test`; `cd tools/validators && npm test`; `cd tools/world-mcp && npm test`; `cd tools/hooks && npm test` — adjacent package regression sweep.
3. After opening a PR, manually verify the `CI - world-index` GitHub Actions run includes integration test names in its log and exits 0. This is a post-PR observation rather than a local implementation gate because the workflow delegates to the package-level command already proven here.

## Outcome

Completed: 2026-04-26.

`tools/world-index/package.json` now runs `node --test "dist/tests/**/*.test.js"`, so package-level `npm test` exercises both the top-level compiled test files and `dist/tests/integration/build-animalia.test.js`.

No workflow YAML, test source, fixture, indexer source, or sibling package scripts were changed.

## Verification Result

1. `/bin/sh -c 'node --test dist/tests/**/*.test.js --test-reporter=spec'` from `tools/world-index/` — passed but proved the unquoted recursive-looking glob selects only `dist/tests/integration/build-animalia.test.js`; this was used as reassessment evidence, not the landed proof.
2. `npm run build` from `tools/world-index/` — passed.
3. `npm test` from `tools/world-index/` — passed; 67/67 subtests passed, including the 12 `build-animalia` integration subtests.
4. `npm test` from `tools/patch-engine/` — passed; 40/40 tests passed.
5. `npm test` from `tools/validators/` — passed; 54/54 tests passed.
6. `npm test` from `tools/world-mcp/` — passed; 137/137 tests passed.
7. `npm test` from `tools/hooks/` — passed; 17/17 tests passed.

Pre-existing ignored package artifacts before the verification sweep: `tools/world-index/dist/`, `tools/world-index/node_modules/`, `tools/patch-engine/dist/`, `tools/patch-engine/node_modules/`, `tools/validators/dist/`, `tools/validators/node_modules/`, `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`, `tools/hooks/dist/`, and `tools/hooks/node_modules/`.

## Deviations

1. The drafted unquoted `dist/tests/**/*.test.js` command was not safe under `/bin/sh`: it selected only the nested integration test and would have dropped the top-level suite. The landed package script quotes the glob so Node performs recursive discovery.
2. The drafted CI workflow pass is not locally executable in this implementation session. The workflow was verified by file read to delegate to `npm test`, and the local package command was run through the same package script that CI invokes. A live GitHub Actions log check remains a post-PR observation.
3. The intake text overstated `hooks` as already using a recursive/default discovery pattern. The live hooks package has only top-level tests and keeps its existing non-recursive script unchanged.
