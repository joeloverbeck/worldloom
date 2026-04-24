# SPEC13ATOSRCMIG-006: Remove Animalia pre-migration snapshot after commit soak

**Status**: BLOCKED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — local cleanup of the temporary migration restore snapshot
**Deps**: SPEC13ATOSRCMIG-003, user-owned migration commit, one week of confirmed stable post-migration use

## Problem

`SPEC13ATOSRCMIG-003` intentionally retained `.pre-migration-snapshot/animalia/` as an ignored filesystem restore copy until the user reviews and commits the migration. The ticket's post-commit cleanup step says to delete the snapshot after one week of confirmed working migration. That cleanup is not owned by `SPEC13ATOSRCMIG-004`, and the snapshot should not linger indefinitely after the git-level restore point exists.

## Assumption Reassessment (2026-04-24)

1. `.pre-migration-snapshot/animalia/` exists and contains the pre-migration root files, including `CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, the seven prose files, `ONTOLOGY.md`, and `WORLD_KERNEL.md`.
2. Public-repo `.gitignore` ignores `worlds/*` and `.pre-migration-snapshot/`, so the restore copy and world content are intentionally invisible to public-repo `git status`; the private `worlds/` repo owns Animalia source tracking.
3. Cross-artifact boundary: this ticket is local cleanup only. It must not delete or modify `worlds/animalia/_source/**`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, or hybrid content directories.
4. FOUNDATIONS principle under audit: none directly. The snapshot is not canonical storage; it is a temporary restore aid for the migration window.
5. The user-owned private-world migration commit now exists as `99f6a97` (`Atomized animalia.`, committed `2026-04-24 18:55:41 +0200` in `worlds/`). The one-week post-migration stability window has not elapsed on `2026-04-24`, so cleanup remains blocked.
6. `worlds/animalia/_source/` currently contains 225 YAML records and the Animalia root contains only `WORLD_KERNEL.md` and `ONTOLOGY.md`, matching the SPEC-13 atomic-source storage contract. Private `worlds/` status shows only derived `_index/world.db` / WAL / SHM state, not canonical source deletions.

## Architecture Check

1. Time-boxing the ignored snapshot is cleaner than keeping a stale parallel copy of retired world files that can confuse future audits.
2. No backwards-compatibility aliasing/shims introduced. The migration restore path after this cleanup is the user-owned git commit/revert history.

## Verification Layers

1. Snapshot presence and ignore status before cleanup -> codebase grep-proof / `git check-ignore`.
2. Canonical atomic source remains present after cleanup -> codebase grep-proof of `_source/` record counts.
3. No private-repo canonical source deletion occurred -> `git status --short` review from `worlds/`.

## What to Change

### 1. Confirm cleanup preconditions

Verify the migration commit exists, the user confirms the one-week post-migration window has elapsed, and `worlds/animalia/_source/**` remains present and structurally valid.

### 2. Delete the ignored snapshot

Remove `.pre-migration-snapshot/animalia/` only after the preconditions pass.

### 3. Verify no canonical files were removed

Confirm `_source/` record counts and public/private repo status after cleanup.

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
3. `worlds/animalia/_source/**` still contains the expected 225 YAML records.
4. Private `worlds/` repo `git status --short` does not show accidental deletion of canonical Animalia source files.

### Invariants

1. The ignored snapshot is temporary restore state, not canon.
2. Cleanup must not remove any canonical atomic record or authored-primary file.

## Test Plan

### New/Modified Tests

1. None — cleanup-only ticket; verification is command-based.

### Commands

1. `test -d .pre-migration-snapshot/animalia`.
2. `git check-ignore -v .pre-migration-snapshot/animalia`.
3. `find worlds/animalia/_source -type f -name '*.yaml' | wc -l`.
4. `git status --short` from `worlds/`.

## Outcome

Not executed. The ignored restore snapshot remains in place because the required one-week post-migration stability window has not elapsed since private-world commit `99f6a97` on `2026-04-24`.

## Verification Result

1. `test -d .pre-migration-snapshot/animalia && find .pre-migration-snapshot/animalia -maxdepth 2 -type f | sort | sed -n '1,80p'` — snapshot exists and contains the expected pre-migration restore files.
2. `git check-ignore -v .pre-migration-snapshot/animalia` — snapshot is ignored by the public pipeline repo via `.gitignore:151`.
3. `git -C worlds show -s --format='%h%n%ci%n%s%n%b' 99f6a97` — migration commit exists but is dated `2026-04-24 18:55:41 +0200`, so the one-week window is not satisfied.
4. `find worlds/animalia/_source -type f -name '*.yaml' | wc -l` — canonical atomic source contains 225 YAML records.
5. `git -C worlds status --short --untracked-files=all` — no canonical Animalia source deletion is present; only derived `_index` DB/WAL/SHM state is dirty.

## Deviations

- The drafted deletion was intentionally not performed because the ticket's own precondition and SPEC-13 §E step 17 require one week of confirmed stable post-migration use before removing `.pre-migration-snapshot/`.
