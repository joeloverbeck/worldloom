# MSSREMOVE-003: Remove MSS documentation (`docs/manual-story-studio/` + ID-ALLOCATION section)

**Status**: COMPLETED

> **Correction (2026-06-07, user-confirmed):** The original footprint omitted the six `docs/triage/manual-story-*.md` files. Per user decision, the five iteration triages (`2026-06-01-...-second-`, `2026-06-02-...-third-`, `2026-06-02-...-fourth-`, `2026-06-03-...-fifth-iteration-triage.md`, `2026-06-04-...-cast-id-triage.md`) are deleted as residue under this ticket; the `2026-06-07-manual-story-studio-removal-triage.md` decision record is **retained** (it is the living retention authority cited by MSSREMOVE-006). AC3 below is corrected to allow the retained removal record.
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — removes a docs directory and edits `docs/ID-ALLOCATION.md` (a directly-editable doc, not an engine-only surface).
**Deps**: None

## Problem

Two documentation surfaces describe the Manual Story Studio and must be removed:

- `docs/manual-story-studio/` — a dedicated docs directory (`README.md` + `prose-craft-contract.md`); the latter is the prose-craft contract the package's prompt composer read at compose time.
- `docs/ID-ALLOCATION.md` — carries a "Manual-story-scoped" section documenting the lowercase-`m` ID family and the per-manual-story `SEG`/`PROMPT` classes, with file-path references into the now-removed package.

## Assumption Reassessment (2026-06-07)

1. `docs/manual-story-studio/` contains exactly two files: `README.md` and `prose-craft-contract.md` (`ls docs/manual-story-studio/`). The package's `src/prompt/compose.ts` / section files referenced the prose-craft contract; those readers are removed by MSSREMOVE-001, so the doc has no remaining consumer.
2. In `docs/ID-ALLOCATION.md`, the MSS content is a contiguous "Manual-story-scoped" section (around lines 48–76 at audit time): it documents the lowercase-`m` classes, allocation by `tools/manual-story-studio/src/write/id-allocator.ts` / `segment-id-allocator.ts` / `prompts.ts`, the `manual-story.yaml` / `repair-log.yaml` control files, and the `SEG-<integer>` / `PROMPT-<integer>` classes. All of it references the removed package.
3. Cross-artifact boundary: before deleting, grep `docs/ID-ALLOCATION.md` for any table-of-contents entry, anchor link, or "see Manual-story-scoped" back-reference elsewhere in the file so the removal does not leave a dangling internal link. Also confirm no other live doc links to the `docs/manual-story-studio/` path (`grep -rn "docs/manual-story-studio" docs/ .claude/skills/ specs/`).
4. `CLAUDE.md`, `README.md`, `docs/REPOSITORY-MAP.md`, `docs/WORKFLOWS.md`, and `docs/MACHINE-FACING-LAYER.md` have zero MSS references (verified by grep), so no edits are needed there.

## Architecture Check

1. Removing the doc directory and excising the ID-ALLOCATION section keeps the remaining ID-allocation documentation coherent (the canon, story-bundle, and skill-output ID families are unaffected and self-contained).
2. No placeholder or "removed" stub section is left behind in `docs/ID-ALLOCATION.md`.

## Verification Layers

1. Docs dir removed -> `test ! -d docs/manual-story-studio`.
2. ID-ALLOCATION scrubbed -> `grep -n "manual-story" docs/ID-ALLOCATION.md` returns nothing.
3. No dangling internal link -> the file's anchors/TOC (if any) contain no reference to the removed section.

## What to Change

### 1. Delete the MSS docs directory

Remove `docs/manual-story-studio/` (both files) recursively.

### 2. Excise the Manual-story-scoped section from `docs/ID-ALLOCATION.md`

Delete the entire "Manual-story-scoped" section and any TOC/anchor entry that points to it. Leave surrounding sections intact and renumber/relink only if an explicit TOC exists.

## Files to Touch

- `docs/manual-story-studio/` (delete — directory)
- `docs/ID-ALLOCATION.md` (modify — remove the Manual-story-scoped section + any back-reference)

## Out of Scope

- `reports/*` MSS artifacts — MSSREMOVE-005.
- Archived specs/tickets that mention ID classes — intentionally retained.

## Acceptance Criteria

### Tests That Must Pass

1. `test ! -d docs/manual-story-studio && echo OK` — directory removed.
2. `grep -n "manual-story" docs/ID-ALLOCATION.md && echo FAIL || echo OK` — no MSS reference remains in the file.
3. `grep -rn "docs/manual-story-studio" docs/ .claude/skills/ specs/ && echo FAIL || echo OK` — no live link to the removed docs dir.

### Invariants

1. `docs/ID-ALLOCATION.md` documents only the surviving ID families (canon, story-bundle, skill-output) with no dangling internal anchors.
2. No live doc references the Manual Story Studio.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (directory absence + grep).`

### Commands

1. `test ! -d docs/manual-story-studio && grep -c "manual-story" docs/ID-ALLOCATION.md`
2. `grep -rn "manual-story-studio\|manual-story" docs/ --include=*.md`
