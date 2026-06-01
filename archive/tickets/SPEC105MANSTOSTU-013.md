# SPEC105MANSTOSTU-013: `build-all.sh` + `check-all.sh` inclusion

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `scripts/build-all.sh` and `scripts/check-all.sh` to add `manual-story-studio` to the PACKAGES arrays. No code or test changes to `tools/manual-story-studio/` itself.
**Deps**: None

## Problem

At intake, SPEC-105 §1 Context showed that `scripts/build-all.sh` and `scripts/check-all.sh` excluded `tools/manual-story-studio` from the monorepo's local-check path (`grep "manual-story-studio" scripts/build-all.sh scripts/check-all.sh` returned zero matches). Local "all green" was misleading because the package was covered by its dedicated CI workflow (`.github/workflows/ci-manual-story-studio.yml`) but not by the all-tools local check path. SPEC-105 §2 item 7 + §3 Key decisions bundle this fix into the foundational integrity spec because future SPEC-108 / SPEC-109 / SPEC-111 work will land cross-package edits whose test breakages must surface during local check, not only in CI.

## Assumption Reassessment (2026-06-01)

1. `scripts/build-all.sh` and `scripts/check-all.sh` both exist. At intake, each declared a `PACKAGES=(...)` bash array near line 9 with `PACKAGES=(world-index patch-engine validators hooks world-mcp story-explorer)`.
2. SPEC-105 §2 item 7 + §3 Key decisions specify the pattern: mirror `tools/story-explorer` (the closest analog — Fastify + Vite, dedicated CI plus monorepo coverage). Confirmed by the §8 Assumption reassessment: story-explorer IS in both PACKAGES arrays. The pattern is `tools/<pkg>` → array entry `<pkg>` (without the `tools/` prefix; the scripts iterate and join with `$ROOT/tools/$pkg`).
3. Cross-skill boundary: the scripts are project-level infrastructure shared by every `tools/` package. Adding `manual-story-studio` doesn't affect any other package's build/test logic — each is invoked in dependency order (the comment in build-all.sh notes the order: `world-index → patch-engine → validators → hooks → world-mcp → story-explorer`). `manual-story-studio` is independent of all those (it has no `@worldloom/*` deps per SPEC-100); it can be appended at the END of the array.

## Architecture Check

1. Adding `manual-story-studio` as the LAST entry preserves the existing dependency order documented in the script comments. The package has no `@worldloom/*` runtime dependencies (SPEC-100 establishes this), so it can be built/tested after the others without coordinating with them.
2. No backwards-compatibility shims. The scripts iterate over PACKAGES; adding an entry is the canonical extension shape.

## Verification Layers

1. PACKAGES arrays in both scripts contain `manual-story-studio` → codebase grep-proof: `grep "manual-story-studio" scripts/build-all.sh scripts/check-all.sh` returns the new entries.
2. `bash scripts/check-all.sh` from a clean tree exits 0 and includes the Manual Studio test output → manual verification at acceptance time (per SPEC-105 §6).
3. The script comment listing dependency order is updated to include `manual-story-studio` at the end → manual readback.

## Landed Changes

### 1. `scripts/build-all.sh`

```diff
- PACKAGES=(world-index patch-engine validators hooks world-mcp story-explorer)
+ PACKAGES=(world-index patch-engine validators hooks world-mcp story-explorer manual-story-studio)
```

Also updated the dependency-order comment to include `manual-story-studio` at the end.

### 2. `scripts/check-all.sh`

Same pattern: appended `manual-story-studio` to the `PACKAGES` array and updated the dependency-order comment.

## Files to Touch

- `scripts/build-all.sh` (modify — array entry + comment)
- `scripts/check-all.sh` (modify — array entry + comment)

## Out of Scope

- The acceptance test fixtures and `test/health/` test files — SPEC105MANSTOSTU-014.
- Any modification to `.github/workflows/manual-story-studio-ci.yml` — explicitly preserved per SPEC-105 §3 Key decisions ("Dedicated CI workflow is preserved").
- Splitting the scripts to run dependency-aware OR parallel — out of scope; the spec accepts the existing serial-for-loop pattern.

## Acceptance Criteria

### Tests That Must Pass

1. `bash scripts/build-all.sh` from repo root exits 0; the build loop iterates `manual-story-studio` and runs its `npm run build` successfully.
2. `bash scripts/check-all.sh` from repo root exits 0; the check loop iterates `manual-story-studio` and runs both `npm run build` AND `npm test` successfully (matching the existing pattern for sibling packages).
3. `grep "manual-story-studio" scripts/build-all.sh scripts/check-all.sh` returns the new PACKAGES entries.

### Invariants

1. The PACKAGES arrays in both scripts include `manual-story-studio`.
2. The package's existing dedicated CI workflow at `.github/workflows/ci-manual-story-studio.yml` is unchanged.
3. The script comments describe the current dependency order including `manual-story-studio`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `bash scripts/build-all.sh` — full monorepo build verification.
2. `bash scripts/check-all.sh` — full monorepo build + test verification.
3. `grep "manual-story-studio" scripts/build-all.sh scripts/check-all.sh` — confirm the additions.

## Outcome

Completed on 2026-06-01.

This ticket appended `manual-story-studio` to the `PACKAGES` arrays in `scripts/build-all.sh` and `scripts/check-all.sh`, and updated both dependency-order comments to include it after `story-explorer`.

No deviations from the planned file set. The broad verification commands refreshed pre-existing ignored build/dependency artifacts under the tools packages; no tracked generated artifacts were added.

## Verification Result

Commands run from the repo root:

1. `grep "manual-story-studio" scripts/build-all.sh scripts/check-all.sh` — passed; both scripts show the dependency-order comment and `PACKAGES` entry.
2. `bash scripts/build-all.sh` — passed; the loop built `manual-story-studio` after `story-explorer`.
3. `bash scripts/check-all.sh` — passed; all tool package builds/tests completed, including `manual-story-studio` at the end. The Manual Studio package reported 349 backend tests passing plus web `tsc --noEmit`.
