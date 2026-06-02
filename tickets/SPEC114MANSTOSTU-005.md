# SPEC114MANSTOSTU-005: Docs — delete-outcomes + repair-log registration

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — documentation only (`tools/manual-story-studio/README.md`, `docs/ID-ALLOCATION.md`); no code, no canon, no story-bundle pipeline.
**Deps**: archive/tickets/SPEC114MANSTOSTU-002.md, archive/tickets/SPEC114MANSTOSTU-003.md, SPEC114MANSTOSTU-004

## Problem

Two docs surfaces describe the old delete lifecycle and must land coherently once the implementation tickets ship. `README.md:107` documents the `inactive_default` outcome ("rewritten in place with `active: false` …") which no longer exists after archive/tickets/SPEC114MANSTOSTU-002.md. And the new persisted `repair-log.yaml` control file (SPEC-114 §3, M3) is unregistered in `docs/ID-ALLOCATION.md` §Manual-story-scoped, which documents `manual-story.yaml` as a non-ID-bearing control file but not `repair-log.yaml`. SPEC-114 §4 commits both edits; they are grouped here as a cross-cutting docs ticket so the README delete-outcomes section reflects the full landed lifecycle (backend + records UX + beat-template parity) without a staleness window.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/README.md:107` documents the `inactive_default` delete outcome (`active: false` + `retired_reason`), now removed by archive/tickets/SPEC114MANSTOSTU-002.md. `docs/ID-ALLOCATION.md` §Manual-story-scoped (around line 74) documents `manual-story.yaml` as a per-manual-story non-ID-bearing control file; `repair-log.yaml` is absent. The post-implementation delete outcomes are `hard_deleted`, `blocked` (with referrer summaries), and repair-mode `force_deleted` (with a `repair-log.yaml` append).
2. SPEC-114 §4 Files-to-touch commits both edits (README delete-outcomes rewrite; ID-ALLOCATION `repair-log.yaml` note) and §8 Risks routes the ID-ALLOCATION note as a §4 deliverable rather than a separate docs spec. No FOUNDATIONS principle gates this docs-only surface beyond the Rule 6 audit-trail spirit already carried by the implementation tickets.
3. **Cross-artifact shared boundary under audit**: the README delete-outcomes section must describe the outcomes produced by archive/tickets/SPEC114MANSTOSTU-002.md (backend), reflected in archive/tickets/SPEC114MANSTOSTU-003.md (records UX) and SPEC114MANSTOSTU-004 (beat-template parity) coherently — hence the dependency on all three. The ID-ALLOCATION note must match the `repair-log.yaml` path/shape established in archive/tickets/SPEC114MANSTOSTU-002.md §1.

## Architecture Check

1. Grouping both docs edits into one trailing ticket lands the documentation atomically after the lifecycle is fully implemented, avoiding a window where the README describes a half-migrated delete flow — cleaner than co-locating each edit in its implementing ticket, since the README delete-outcomes section needs all three implementation surfaces to exist coherently before it reads true.
2. No backwards-compatibility shim — this is a documentation update; no code or aliases involved.

## Verification Layers

1. README no longer documents `inactive_default`; documents hard-delete-or-block + repair-mode force-delete + `repair-log.yaml` → grep-proof against the post-implementation README.
2. `docs/ID-ALLOCATION.md` §Manual-story-scoped registers `repair-log.yaml` as a non-ID control file → grep-proof for `repair-log.yaml` in that section.
3. Single docs surface set → additional layer mapping N/A; both invariants are grep-provable against the tree.

## What to Change

### 1. README delete-outcomes (`tools/manual-story-studio/README.md`)

Replace the `inactive_default` bullet (line ~107) with the post-SPEC-114 outcomes: `hard_deleted` (unreferenced), `blocked` (referenced — returns referrer summaries; UI shows referrer cards with edit links), and repair-mode `force_deleted` (explicit repair flag; appends `{deleted_class_and_id, deleted_at, referrers_at_deletion}` to `repair-log.yaml`). Note that `active`/`retired_reason` are no longer written by delete.

### 2. ID-ALLOCATION repair-log note (`docs/ID-ALLOCATION.md`)

In §Manual-story-scoped, add a one-line note registering `repair-log.yaml` as a non-ID-bearing per-manual-story control file (parallel to the existing `manual-story.yaml` note), written append-only by repair-mode force-delete.

## Files to Touch

- `tools/manual-story-studio/README.md` (modify)
- `docs/ID-ALLOCATION.md` (modify)

## Out of Scope

- Any code, schema, or test change (covered by 001–004).
- Renaming `current-context.yaml` / other report §39 doc-rename stages.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "inactive_default" tools/manual-story-studio/README.md` → expect zero matches.
2. `grep -nE "blocked|repair-log\.yaml|hard-delete" tools/manual-story-studio/README.md` → matches describing the new lifecycle.
3. `grep -n "repair-log.yaml" docs/ID-ALLOCATION.md` → match in §Manual-story-scoped.

### Invariants

1. No docs surface describes the removed `inactive_default` auto-archive behavior as current.
2. `repair-log.yaml` is documented wherever the manual-story control files are enumerated.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based (grep-proofs against the post-implementation tree) and the implementation coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "inactive_default" tools/manual-story-studio/README.md` (expect zero)
2. `grep -nE "blocked|repair-log\.yaml" tools/manual-story-studio/README.md docs/ID-ALLOCATION.md`
3. Grep-proofs are the correct boundary — a docs-only ticket has no compile/test surface of its own; coherence with code is guaranteed by the `Deps` on 002/003/004.
