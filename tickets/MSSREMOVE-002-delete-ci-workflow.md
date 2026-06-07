# MSSREMOVE-002: Delete the `ci-manual-story-studio.yml` GitHub Actions workflow

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — removes one CI workflow file. No other workflow references the package.
**Deps**: None (independent of MSSREMOVE-001; the workflow only triggers on `tools/manual-story-studio/**` paths, so it becomes inert once the package is gone but can be deleted at any time)

## Problem

The repository ships a dedicated CI workflow for the Manual Story Studio package. As part of removing every trace of the package, its CI must go too — the user explicitly called out "the related .github/workflows".

## Assumption Reassessment (2026-06-07)

1. There is exactly one MSS workflow: `grep -ln "manual-story" .github/workflows/*.yml` returns only `.github/workflows/ci-manual-story-studio.yml`. The other workflows (`ci-hooks`, `ci-patch-engine`, `ci-story-explorer`, `ci-validators`, `ci-world-index`, `ci-world-mcp`, `codeql`) make no reference to the package.
2. The workflow is package-scoped: its `on.push.paths` / `on.pull_request.paths` are `tools/manual-story-studio/**` and the workflow file itself; its job `working-directory` is `tools/manual-story-studio`. Nothing else triggers it, so removing it cannot affect any other package's CI.
3. Cross-artifact boundary: no aggregator workflow includes or `needs:` this workflow (checked — each `ci-*.yml` is self-standing). No status-check name from this workflow is referenced by branch-protection config tracked in the repo.

## Architecture Check

1. Deleting the file is the complete and correct removal — there is no shared step or reusable workflow extracted from it.
2. No replacement or stub workflow is introduced.

## Verification Layers

1. Workflow file removed -> `test ! -f .github/workflows/ci-manual-story-studio.yml`.
2. No residual reference -> `grep -rn "manual-story" .github/` returns nothing.

## What to Change

### 1. Remove the workflow

Delete `.github/workflows/ci-manual-story-studio.yml`.

## Files to Touch

- `.github/workflows/ci-manual-story-studio.yml` (delete)

## Out of Scope

- The package source — MSSREMOVE-001.
- Any branch-protection / required-check settings configured outside the repo (GitHub UI); flag to the maintainer that the "CI - manual-story-studio" check should be dropped from any branch-protection rule if one references it.

## Acceptance Criteria

### Tests That Must Pass

1. `test ! -f .github/workflows/ci-manual-story-studio.yml && echo OK` — file removed.
2. `grep -rn "manual-story" .github/ && echo FAIL || echo OK` — no `.github/` reference remains.
3. Remaining workflows parse (no workflow referenced the deleted one, so none break).

### Invariants

1. No GitHub Actions workflow references `tools/manual-story-studio` or the deleted workflow file.

## Test Plan

### New/Modified Tests

1. `None — deletion-only ticket; verification is command-based.`

### Commands

1. `test ! -f .github/workflows/ci-manual-story-studio.yml && echo "workflow removed"`
2. `grep -rn "manual-story" .github/`
