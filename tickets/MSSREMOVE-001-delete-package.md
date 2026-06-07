# MSSREMOVE-001: Delete the `tools/manual-story-studio/` package in full

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — removes the entire `tools/manual-story-studio` package (its own standalone npm package; no `@worldloom/*` consumer depends on it). No canon/MCP/patch-engine/validator/hook surface is touched.
**Deps**: None (sibling tickets MSSREMOVE-002..006 remove the package's CI, docs, skill prose, and reports; they may land in any order relative to this one)

## Problem

`tools/manual-story-studio/*` was implemented in full across recent PRs (SPEC-100..SPEC-124) but the author considers it wrong from the foundations and has re-implemented it from scratch in a separate repo. The goal is to remove every trace of the package from this repository. This ticket removes the package source itself; siblings remove its CI, docs, active-skill prose, and report artifacts.

The package is standalone: it is a parallel writing-cockpit tool that explicitly disclaims canon-pipeline integration (`No LLM, no MCP, no patch engine`); its `package.json` excludes `@worldloom/patch-engine` and `@worldloom/world-mcp`. No other package or skill imports from it, so deletion is self-contained.

## Assumption Reassessment (2026-06-07)

1. The package is self-contained: there is no root `package.json` / `pnpm-workspace.yaml` declaring it as a workspace member (`ls package.json pnpm-workspace.yaml` at repo root returns nothing). Each `tools/<pkg>` is standalone, so no workspace manifest needs editing.
2. No sibling package or skill imports the package: `grep -rl "manual-story-studio"` across `tools/` (excluding the package itself), `.claude/skills/`, and `docs/` surfaces only documentation/prose references (handled by MSSREMOVE-003/004) and report artifacts (MSSREMOVE-005) — zero code imports.
3. Cross-artifact boundary under audit: the package owns its own `node_modules/`, `dist/`, `web/` subpackage, and `web/node_modules/`. All are inside `tools/manual-story-studio/` and are removed together by deleting the directory.
4. The package produces non-canon data under `worlds/<slug>/manual-stories/` (currently only an untracked `worlds/erotica-world/manual-stories/red-bunny/`); that produced data is handled by MSSREMOVE-005, not here.

## Architecture Check

1. Deleting the whole directory is the cleanest removal — the package has no in-repo consumers, so there is no surface to re-wire, alias, or shim.
2. No backwards-compatibility shim is introduced; the package simply ceases to exist.

## Verification Layers

1. Package is gone -> `test ! -d tools/manual-story-studio` (directory absent).
2. No dangling import -> repo-wide grep for `manual-story-studio` over live surfaces (`tools/`, `.claude/skills/`, `docs/`, `.github/`) returns only matches owned by sibling tickets at the time this lands; the consolidated zero-residue proof is MSSREMOVE-006.

## What to Change

### 1. Remove the package directory

Delete `tools/manual-story-studio/` recursively, including `src/`, `test/`, `web/` (with its own `package.json`, `package-lock.json`, `node_modules/`), `dist/`, `node_modules/`, `package.json`, `package-lock.json`, `tsconfig.json`, and `README.md`.

## Files to Touch

- `tools/manual-story-studio/` (delete — entire tree)

## Out of Scope

- `.github/workflows/ci-manual-story-studio.yml` — MSSREMOVE-002
- `docs/manual-story-studio/` and `docs/ID-ALLOCATION.md` — MSSREMOVE-003
- `.claude/skills/reassess-spec/*` MSS prose — MSSREMOVE-004
- `reports/*` MSS artifacts and produced `worlds/<slug>/manual-stories/` data — MSSREMOVE-005
- `archive/specs/*` and `archive/tickets/*` MSS history — intentionally retained (see `docs/triage/2026-06-07-manual-story-studio-removal-triage.md`)

## Acceptance Criteria

### Tests That Must Pass

1. `test ! -d tools/manual-story-studio && echo OK` — directory fully removed.
2. `ls tools/` shows the remaining packages only (`hooks`, `patch-engine`, `story-explorer`, `validators`, `world-index`, `world-mcp`, `README.md`).
3. No other package's test suite references the removed package (sibling packages build/test unchanged — they never imported it).

### Invariants

1. No live (non-archive) code, config, or doc imports or path-references `tools/manual-story-studio`.
2. Sibling `tools/*` packages remain buildable and testable, unaffected by the deletion.

## Test Plan

### New/Modified Tests

1. `None — deletion-only ticket; verification is command-based (directory absence + repo-wide grep).`

### Commands

1. `test ! -d tools/manual-story-studio && echo "package removed"`
2. `grep -rn "manual-story-studio" tools/ .claude/skills/ docs/ .github/ --exclude-dir=node_modules` — remaining hits at land time are owned by sibling tickets only; MSSREMOVE-006 asserts the final zero-residue state.
3. Narrower command rationale: there is no build step for the deleted package to run; absence + grep is the correct verification boundary.
