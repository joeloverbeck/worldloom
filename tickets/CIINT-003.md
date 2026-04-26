# CIINT-003: Enable world-index integration tests in CI

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None at the source level — single-line change to `tools/world-index/package.json` plus the existing `.github/workflows/ci-world-index.yml` continues to invoke the package-level `npm test`
**Deps**: `archive/tickets/CIINT-001.md`, `archive/tickets/CIINT-002.md` (both completed changes must be merged first; otherwise CI immediately goes red)

## Problem

`tools/world-index/package.json` declares its `test` script as:

```
"test": "node --test dist/tests/*.test.js"
```

The single asterisk in `dist/tests/*.test.js` matches only top-level test files. The `dist/tests/integration/` subdirectory is silently excluded. The other four packages (`patch-engine`, `validators`, `world-mcp`, `hooks`) use either `dist/tests/**/*.test.js` (recursive) or `node --test` (default discovery), and their integration tests do run in CI.

Consequence: `tools/world-index/tests/integration/build-animalia.test.ts` does not run during local `npm test` and therefore does not run in `.github/workflows/ci-world-index.yml`. Real bugs and content drift in the integration test went undetected until the post-CI-rollout audit.

This ticket switches the glob to make `npm test` recursive, bringing world-index in line with the other packages and ensuring the integration test runs in CI on every push to main and every PR.

## Assumption Reassessment (2026-04-26)

1. `tools/world-index/package.json` line 39 currently reads `"test": "node --test dist/tests/*.test.js"`. Verified via direct read (no other test-related script aliases this command).
2. After the change, the recursive glob `dist/tests/**/*.test.js` will pick up `dist/tests/integration/build-animalia.test.js`. The existing `tests/integration/spec10-verification.sh` is a shell script (not a `.test.js` file) and is invoked separately via `npm run test:spec10-verification`; it remains unaffected.
3. `.github/workflows/ci-world-index.yml` currently runs `npm test` in `tools/world-index/`. No workflow file changes are required — the recursive glob automatically extends CI coverage to the integration test once `npm test` invokes it.
4. Cross-artifact boundary: this ticket only changes the `npm test` invocation surface. It does not touch `enumerate.ts`, `build.ts`, the test files themselves, or the workflow YAML. The other four packages' globs are unchanged (they already include `**`).
5. Hard prerequisite: `archive/tickets/CIINT-001.md` and `archive/tickets/CIINT-002.md` must both be merged first. If this ticket lands before either completed change, CI for world-index goes red immediately on the next push that triggers it (which is every PR touching `tools/world-index/**` or `tests/fixtures/animalia/**`). Confirm both prereq tickets have STATUS: COMPLETED before merging this one.
6. The package's other test script `test:spec10-verification` is untouched. If the integration test for SPEC-10 should also run in CI, that's a separate concern (likely worth its own ticket if the shell script is intended as a CI gate).

## Architecture Check

1. Aligning world-index's test glob with the other four packages eliminates a silent coverage gap. Recursive globbing is the default convention across the repo; the non-recursive form was a quirk, not a deliberate exclusion.
2. No backwards-compatibility aliasing/shims introduced. The change is a one-character glob update (`*` → `**`); no fallback test command is preserved.

## Verification Layers

1. `npm test` in `tools/world-index/` runs the integration test -> targeted `npm test` invocation surfaces `build-animalia` test names in output.
2. CI workflow `CI - world-index` runs the integration test on push -> manual review of the GitHub Actions run after the merge commit lands on a feature branch + PR.
3. No other package's test command is altered -> codebase grep-proof on `tools/*/package.json` `"test"` entries before and after the change.

## What to Change

### 1. Update the test glob in `tools/world-index/package.json`

Change line 39 from `"test": "node --test dist/tests/*.test.js"` to `"test": "node --test dist/tests/**/*.test.js"`.

This matches `patch-engine`, `validators`, and `hooks`'s pattern (`dist/tests/**/*.test.js`) and brings the integration test into the default `npm test` invocation.

## Files to Touch

- `tools/world-index/package.json` (modify — single line)

## Out of Scope

- Workflow file changes. `.github/workflows/ci-world-index.yml` already runs `npm test`; the glob change in `package.json` automatically expands its scope.
- The `test:spec10-verification` shell script. If that should also gate CI, it's a separate ticket.
- Adding integration tests to other packages. They already run their integration tests via recursive globs.
- Changes to the test fixture or to the integration test's content (covered by `archive/tickets/CIINT-001.md` and `archive/tickets/CIINT-002.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm run build && npm test 2>&1 | grep -c "^# Subtest:"` returns a count higher than 55 (the prior top-level-only count) — the integration test's 12 subtests are included.
2. `cd tools/world-index && npm test` exit code is 0.
3. CI workflow `CI - world-index` runs and passes on the PR introducing this change.
4. The other four CI workflows (`CI - patch-engine`, `CI - validators`, `CI - world-mcp`, `CI - hooks`) continue to run and pass — no regression.

### Invariants

1. `tools/world-index/package.json` `"test"` script uses a recursive glob (`**`).
2. `npm test` in `tools/world-index/` invokes both top-level and integration test files.
3. CI workflow does not require any YAML edits; the package-level test command is the single point of control.

## Test Plan

### New/Modified Tests

1. None — this ticket does not add or modify tests. It changes the invocation surface so existing tests are exercised in CI. Verification is command-based.

### Commands

1. `cd tools/world-index && npm run build && npm test 2>&1 | tail -15` — targeted: confirms the recursive glob picks up integration tests and they pass.
2. `for pkg in world-index patch-engine validators world-mcp hooks; do (cd tools/$pkg && npm test 2>&1 | tail -5); done` — full-pipeline: confirms no cross-package regression.
3. After merging to a feature branch and opening a PR, manually verify the `CI - world-index` GitHub Actions run includes integration test names in its log and exits 0. The narrower-than-full-CI command is the right boundary because the change is a one-character glob update isolated to one package.
