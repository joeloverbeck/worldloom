# SPEC13ATOSRCMIG-006: Remove Animalia pre-migration snapshot after commit soak

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — local cleanup of the temporary migration restore snapshot
**Deps**: archive/tickets/SPEC13ATOSRCMIG-003.md, user-owned migration commit `99f6a97`, one week of confirmed stable post-migration use

## Problem

`SPEC13ATOSRCMIG-003` intentionally retained `.pre-migration-snapshot/animalia/` as an ignored filesystem restore copy until the user reviews and commits the migration. The ticket's post-commit cleanup step says to delete the snapshot after one week of confirmed working migration. That cleanup is not owned by `SPEC13ATOSRCMIG-004`, and the snapshot should not linger indefinitely after the git-level restore point exists.

## Assumption Reassessment (2026-05-02)

1. At intake, `.pre-migration-snapshot/animalia/` existed and contained the pre-migration root files, including `CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, the seven prose files, `ONTOLOGY.md`, and `WORLD_KERNEL.md`.
2. Public-repo `.gitignore` ignores `worlds/*` and `.pre-migration-snapshot/`, so the restore copy and world content are intentionally invisible to public-repo `git status`; the private `worlds/` repo owns Animalia source tracking.
3. Cross-artifact boundary: this ticket is local cleanup only. It must not delete or modify `worlds/animalia/_source/**`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or hybrid content directories.
4. FOUNDATIONS principle under audit: none directly. The snapshot is not canonical storage; it is a temporary restore aid for the migration window.
5. The user-owned private-world migration commit exists as `99f6a97` (`Atomized animalia.`, committed `2026-04-24 18:55:41 +0200` in `worlds/`). The one-week post-migration stability window elapsed before this 2026-05-02 cleanup run, and the user's explicit implementation request is treated as the cleanup go-ahead.
6. `worlds/animalia/_source/` currently contains 229 YAML records and the Animalia root contains only `WORLD_KERNEL.md` and `ONTOLOGY.md`, matching the SPEC-13 atomic-source storage contract. The increase from the original 225-record migration baseline is current canon growth in the private world repo (CF=48, CH=21, INV=16, M=20, OQ=60, ENT=6, SEC=58), not cleanup fallout. Private `worlds/` status is clean.

## Architecture Check

1. Time-boxing the ignored snapshot is cleaner than keeping a stale parallel copy of retired world files that can confuse future audits.
2. No backwards-compatibility aliasing/shims introduced. The migration restore path after this cleanup is the user-owned git commit/revert history.

## Verification Layers

1. Snapshot presence and ignore status before cleanup -> codebase grep-proof / `git check-ignore`.
2. Canonical atomic source remains present after cleanup -> codebase grep-proof of `_source/` record counts.
3. No private-repo canonical source deletion occurred -> `git status --short` review from `worlds/`.

## Landed Changes

### 1. Confirmed cleanup preconditions

Confirmed the migration commit exists, the one-week post-migration window has elapsed, and `worlds/animalia/_source/**` remains present.

### 2. Deleted the ignored snapshot

Removed `.pre-migration-snapshot/animalia/` after the preconditions passed.

### 3. Verified no canonical files were removed

Confirmed `_source/` record counts and public/private repo status after cleanup.

## Files to Touch

- `.pre-migration-snapshot/animalia/` (delete ignored temporary restore copy)

## Out of Scope

- Any mutation to `worlds/animalia/_source/**`.
- Any rewrite of migrated records.
- Any change to migration scripts or `world-index`.

## Acceptance Criteria

### Tests That Must Pass

1. User confirms the migration commit exists and the one-week stability window has elapsed.
2. `.pre-migration-snapshot/animalia/` no longer exists.
3. `worlds/animalia/_source/**` still contains the current 229 YAML records.
4. Private `worlds/` repo `git status --short` does not show accidental deletion of canonical Animalia source files.

### Invariants

1. The ignored snapshot is temporary restore state, not canon.
2. Cleanup must not remove any canonical atomic record or authored-primary file.

## Test Plan

### New/Modified Tests

1. None — cleanup-only ticket; verification is command-based.

### Commands

1. `test ! -e .pre-migration-snapshot/animalia`.
2. `git check-ignore -v .pre-migration-snapshot/animalia`.
3. `find worlds/animalia/_source -type f -name '*.yaml' | wc -l`.
4. `find worlds/animalia -maxdepth 1 -type f | sort`.
5. `git status --short` from `worlds/`.

## Outcome

Completed on 2026-05-02. `.pre-migration-snapshot/animalia/` was removed after the one-week post-migration stability window elapsed. No canonical Animalia source file was edited or removed; `worlds/animalia/_source/` remains present and the root still contains only `WORLD_KERNEL.md` and `ONTOLOGY.md`.

## Verification Result

1. `test ! -e .pre-migration-snapshot/animalia` — snapshot directory no longer exists.
2. `git check-ignore -v .pre-migration-snapshot/animalia` — snapshot path remains ignored by the public pipeline repo via `.gitignore:153`.
3. `git -C worlds show -s --format=%h%n%ci%n%s%n%b 99f6a97` — migration commit exists and is dated `2026-04-24 18:55:41 +0200`, so the one-week window has elapsed by the 2026-05-02 cleanup run.
4. `find worlds/animalia/_source -type f -name '*.yaml' | wc -l` — canonical atomic source contains 229 YAML records.
5. `find worlds/animalia -maxdepth 1 -type f | sort` — Animalia root contains only `ONTOLOGY.md` and `WORLD_KERNEL.md`.
6. `git -C worlds status --short --untracked-files=all` — clean; no canonical Animalia source deletion is present.
7. `git status --short --untracked-files=all` — clean before ticket/spec closeout edits; ignored snapshot deletion is intentionally invisible to the public pipeline repo.

## Deviations

- The active ticket's previous 225-record count was stale. Live Animalia now has 229 YAML records after post-migration canon growth; the cleanup invariant is preservation of the current canonical `_source/` tree, not restoration to the migration-day baseline.
