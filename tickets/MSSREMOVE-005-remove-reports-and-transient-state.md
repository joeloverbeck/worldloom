# MSSREMOVE-005: Remove MSS reports, transient run-state, and produced local data

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — deletes report artifacts and one codex run-state file; removes untracked produced data. No code/contract surface.
**Deps**: None

## Problem

Several non-code artifacts are pure Manual Story Studio traces and should be removed: the iteration reports and the prompt example under `reports/`, the codex run-state pointer at `.codex/run-state/`, and the tool-produced data under `worlds/<slug>/manual-stories/`.

## Assumption Reassessment (2026-06-07)

1. Pure-MSS report artifacts (delete): `reports/manual-story-studio-first-iteration.md`, `-second-`, `-third-`, `-fourth-`, `-fifth-iteration.md` (5 files), and `reports/prompt_example.md` (its first line is `# Manual Story Studio Prompt Example`; the whole file documents the MSS prompt path).
2. `.codex/run-state/implement-spec-tickets.json` references the archived `SPEC-122-manual-story-studio-*` spec as its `originating_spec`/`archived_spec` and mentions MSS `dist`/`node_modules` in its `dirty_state` note. This is transient run-state for a completed codex run; delete the file (it tracks state for work that is being removed). Confirm it is not actively consumed by an in-flight codex run before deleting.
3. `reports/manifest_2026-06-03.txt` is a **repo-wide file snapshot** (3371 lines listing all repo files at that date); only 263 lines happen to name MSS paths. It is not an MSS-specific artifact — it is a dated snapshot like an archive entry. **Retain it** (editing a historical snapshot to surgically remove file paths is pointless and corrupts the snapshot). MSSREMOVE-006's residue sweep excludes this file by name.
4. `worlds/erotica-world/manual-stories/red-bunny/` is tool-produced data (`manual-story.yaml`, `manuscript.md`, `prompt-working-set.yaml`, `records/`). It is currently **untracked** (`git ls-files` returns nothing for it), so its removal is a working-tree cleanup, not a tracked-file deletion. The user noted other repos hold the good material; this in-repo produced data is a trace to remove. Delete the `manual-stories/` directory under each world that has one (only `erotica-world` at audit time: `find worlds -maxdepth 2 -type d -name manual-stories`).
5. No `.gitignore` entry references `manual-story` (`grep -n manual-story .gitignore` is empty), so no ignore rule needs removing.

## Architecture Check

1. Deleting pure-MSS reports and produced data is the complete removal; retaining the dated repo-wide manifest snapshot keeps an honest historical record without corrupting it by surgical line edits.
2. No replacement artifacts are introduced.

## Verification Layers

1. MSS reports gone -> `ls reports/ | grep -E "manual-story-studio|prompt_example"` returns nothing.
2. Run-state gone -> `test ! -f .codex/run-state/implement-spec-tickets.json` (or, if a live run still needs it, document why it was retained).
3. Produced data gone -> `find worlds -maxdepth 2 -type d -name manual-stories` returns nothing.

## What to Change

### 1. Delete pure-MSS report artifacts

Remove the 5 `reports/manual-story-studio-*-iteration.md` files and `reports/prompt_example.md`.

### 2. Delete the codex run-state pointer

Remove `.codex/run-state/implement-spec-tickets.json` (after confirming no in-flight run depends on it).

### 3. Remove produced local data

Recursively remove every `worlds/<slug>/manual-stories/` directory (untracked working-tree cleanup; only `worlds/erotica-world/manual-stories/` exists at audit time).

## Files to Touch

- `reports/manual-story-studio-first-iteration.md` … `-fifth-iteration.md` (delete — 5 files)
- `reports/prompt_example.md` (delete)
- `.codex/run-state/implement-spec-tickets.json` (delete)
- `worlds/erotica-world/manual-stories/` (delete — untracked produced data)

## Out of Scope

- `reports/manifest_2026-06-03.txt` — retained as a dated repo-wide snapshot (see Assumption 3).
- Archived specs/tickets — intentionally retained.

## Acceptance Criteria

### Tests That Must Pass

1. `ls reports/ | grep -E "manual-story-studio|prompt_example" && echo FAIL || echo OK` — pure-MSS reports removed.
2. `test ! -f .codex/run-state/implement-spec-tickets.json && echo OK` (or documented retention).
3. `find worlds -maxdepth 2 -type d -name manual-stories | grep . && echo FAIL || echo OK` — no produced MSS data dir remains.

### Invariants

1. No pure-MSS artifact remains under `reports/`, `.codex/run-state/`, or `worlds/<slug>/manual-stories/`.
2. The dated repo-wide manifest snapshot is left byte-for-byte intact.

## Test Plan

### New/Modified Tests

1. `None — artifact-cleanup ticket; verification is command-based.`

### Commands

1. `ls reports/ | grep -E "manual-story|prompt_example"; find worlds -maxdepth 2 -type d -name manual-stories`
2. `test ! -f .codex/run-state/implement-spec-tickets.json && echo "run-state removed"`
