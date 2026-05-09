# SPEC22SCECOM-014: Track 5 migration: discard `worlds/erotica-world/stories/red-bunny/` test bundle + INDEX.md edit

**Status**: COMPLETED (2026-05-09)
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — file deletion + 1 markdown edit. No code, no skill, no tool changes.
**Deps**: None

## Problem

SPEC-22 §Track 5 directs the user to discard the existing `worlds/erotica-world/stories/red-bunny/` test bundle, which carries v1 SLT/CHC records that have no v2 form. Per the spec's "We have one test story we will discard. The redesign is forward-only" direction, the bundle is removed wholesale (no v1-to-v2 record migration). After the bundle deletion, `worlds/erotica-world/stories/INDEX.md` must be edited to remove the red-bunny entry; if red-bunny was the only entry, the file is reduced to an empty stories index. The deletion is recorded in SPEC-22 itself (the spec is the audit trail; no CH-NNNN is allocated because no world-canon mutation occurred — story-bundle deletion is a story-bundle-level operation per archived SPEC-13's §Story Bundles §8 rule).

## Assumption Reassessment (2026-05-09)

1. `worlds/erotica-world/stories/red-bunny/` existed before implementation and contained 305 files. It was the only story bundle under `worlds/erotica-world/stories/` (`find worlds/erotica-world/stories -mindepth 1 -maxdepth 1 -print` showed only `red-bunny` plus `INDEX.md`).
2. `worlds/erotica-world/stories/INDEX.md` existed and referenced red-bunny before implementation. After deletion, the INDEX was reduced to an explicit empty-index placeholder: `No active story bundles.`
3. **FOUNDATIONS §Story Bundles §8 (Story Bundle As Derived Per-World Layer)** restated: "Story-bundle deletion is permitted at the bundle level. Within a retained bundle, atomic YAML records remain append-only at the filesystem level." Bundle-level deletion is lawful; the discard is not a Rule 6 retcon.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)** restated: the deletion is recorded in SPEC-22 itself (the spec is the audit trail). No CH-NNNN is allocated because no world-canon mutation occurred. The §Risks block of SPEC-22 documents the discard rationale and the resolved post-SPEC-21 reassessment items.
5. (HARD-GATE / canon-write ordering): N/A — no world-canon mutation; story-bundle deletion is below the canon-write surface.
6. **Forward-only discipline**: there is no v1-to-v2 record migration. Worlds with existing v1 SLT/CHC records (only `worlds/erotica-world/stories/red-bunny/` at SPEC-22 intake) discard the bundle wholesale. Future worlds (`worlds/animalia/` post-cutover, plus future worlds) bootstrap v2-native through `branching-story-bootstrap` (010).
7. **Hook 3 surface**: `worlds/<slug>/stories/<slug>/_source/...` block pattern continues to apply to any future bundle re-creation; no hook config change needed (verified at SPEC-22 reassessment).
8. Command drift corrected: the drafted optional index command used a path argument (`build worlds/erotica-world`), but the live `world-index` CLI expects a world slug. The verified command is `node tools/world-index/dist/src/cli.js build erotica-world`.

## Architecture Check

1. Wholesale bundle deletion is the simplest discard mechanism — no per-record migration script is needed because no v1 records survive.
2. Editing `INDEX.md` to remove the red-bunny entry preserves the convention that the INDEX file lists every active story-bundle. Empty INDEX (when red-bunny was the only entry) preserves the file as a placeholder for future bundles.
3. No backwards-compatibility shims — v1 records are not preserved as historical artifacts; the spec audit trail is the only retained reference.

## Verification Layers

1. After deletion: `ls -d worlds/erotica-world/stories/red-bunny/` returns "No such file or directory".
2. After INDEX edit: `grep -n "red-bunny" worlds/erotica-world/stories/INDEX.md` returns 0 matches.
3. `worlds/erotica-world/stories/` may be empty (containing only the edited INDEX.md) or may still hold the file structure if other bundles remain. (Verified at SPEC-22 reassessment: red-bunny is the only entry.)
4. SPEC-22 §Risks block is the audit trail for the discard (already populated by the 2026-05-08 reassessment).
5. FOUNDATIONS §Story Bundles §8 alignment: bundle-level deletion is lawful; no Rule 6 violation.

## What to Change

### 1. User-driven bundle deletion

The user runs (or this ticket's implementer runs on user authority):

```bash
rm -rf worlds/erotica-world/stories/red-bunny/
```

This is a one-time operation. The deletion is destructive — the spec's audit trail (§Track 5 + §Risks) is the only retained reference to the bundle's prior existence.

### 2. Edit `worlds/erotica-world/stories/INDEX.md`

Remove the red-bunny entry from the INDEX. If red-bunny was the only entry, reduce the file to an empty stories index (preserve the file as a placeholder with a comment line indicating no active bundles, or whatever the existing INDEX template uses for the empty case).

### 3. SPEC-22 audit trail (already populated)

No additional documentation is required — SPEC-22 §Track 5 + §Risks already document the discard rationale. The ticket itself is the implementation receipt.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/` (DELETE — entire directory tree)
- `worlds/erotica-world/stories/INDEX.md` (modify — remove red-bunny entry)
- `tickets/SPEC22SCECOM-014.md` (modify — closeout)

## Out of Scope

- All other Track 4 skill alignments (in 010, 011, 012, 013)
- Validators (in 003/004/005)
- Canonical vocabularies (in archive/tickets/SPEC22SCECOM-006.md)
- Indexer + MCP retrieval (in 007/008)
- Allocator + CLAUDE.md docs (in 009)
- Patch-engine op (in 001)
- v1-to-v2 record migration scripts — explicitly out of scope per "forward-only discipline"
- Bundle re-creation (animalia v2-native bootstrap is a separate user action, not part of this ticket)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `ls -d worlds/erotica-world/stories/red-bunny/` returns "No such file or directory".
2. `grep -nE 'red-bunny' worlds/erotica-world/stories/INDEX.md` returns 0 matches.
3. The bundle's deletion is reflected in `worlds/erotica-world/_index/world.db` after a `world-index build` rebuild — the indexer is gitignored and regenerable; no on-disk migration script needed (per SPEC-22 §Risks).

### Invariants

1. Bundle-level deletion is the only operation; individual record-level discards within a retained bundle would violate the FOUNDATIONS §Story Bundles §8 append-only-within-retained-bundle rule (not applicable here because the entire bundle is deleted).
2. No CH-NNNN is allocated — story-bundle deletion is below the world-canon-mutation surface (FOUNDATIONS Rule 6 preserved at the spec audit-trail level).
3. Hook 3's `worlds/<slug>/stories/<slug>/_source/...` block pattern continues to apply to any future bundle re-creation; no hook config change.

## Test Plan

### New/Modified Tests

`None — migration ticket; verification is command-based against the file system state.`

### Commands

1. `ls -d worlds/erotica-world/stories/red-bunny/ 2>&1` — should report no-such-file post-discard.
2. `grep -n "red-bunny" worlds/erotica-world/stories/INDEX.md` — should return 0 matches post-edit.
3. (Optional) `node tools/world-index/dist/src/cli.js build erotica-world` — confirms indexer rebuilds without red-bunny references.

## Outcome

Completed. The `worlds/erotica-world/stories/red-bunny/` story bundle was deleted wholesale, preserving SPEC-22's forward-only migration rule and avoiding any v1-to-v2 record migration. `worlds/erotica-world/stories/INDEX.md` now contains only an empty-index placeholder.

No CH-NNNN was allocated. The deletion stays at the story-bundle derived-layer boundary described by FOUNDATIONS §Story Bundles §8 and SPEC-22 Track 5.

## Verification Result

Passed on 2026-05-09:

1. `ls -d worlds/erotica-world/stories/red-bunny` returned `No such file or directory`.
2. `grep -nE 'red-bunny' worlds/erotica-world/stories/INDEX.md` returned 0 matches.
3. `find worlds/erotica-world/stories -mindepth 1 -maxdepth 2 -print` returned only `worlds/erotica-world/stories/INDEX.md`.
4. `node tools/world-index/dist/src/cli.js build erotica-world` exited 0 and rebuilt the derived index.
5. `node tools/world-index/dist/src/cli.js render erotica-world --story red-bunny` returned `No indexed story-bundle records found for 'erotica-world/red-bunny'.`

## Deviations

- The drafted optional index command used `build worlds/erotica-world`, but the live CLI expects `build erotica-world`; the ticket's command was corrected.
- The index rebuild emitted a pre-existing skipped-record warning for `worlds/erotica-world/_source/change-log/CH-0006.yaml` (`missing_id_field`). This warning is outside the Track 5 deletion seam; the rebuild still exited 0 and proved the deleted story bundle no longer appears in the rebuilt index.
