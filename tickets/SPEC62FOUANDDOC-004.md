# SPEC62FOUANDDOC-004: REPOSITORY-MAP — add `pressure-events/`, `character-proposals/`, root `world-proposals/`

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/REPOSITORY-MAP.md` (directory-layout documentation); no code, schema, or world-data change.
**Deps**: None

## Problem

`pressure-events/` and `character-proposals/` have zero mentions in REPOSITORY-MAP's `worlds/<slug>/` layout, and root-level `world-proposals/` is undocumented — even though all three are live allocator-tracked surfaces. The asymmetry where EPE base cards are allocator-tracked but intentionally not retrieval-indexed is also undocumented, so a reader could mistake it for a bug. SPEC-62 §2.5 closes the docs gap.

## Assumption Reassessment (2026-05-21)

1. Verified against current `docs/REPOSITORY-MAP.md`: `proposals/` (line 44) and `audits/` (line 45) are **already present** in the `worlds/<slug>/` layout with one-line descriptions matching every sibling — they need NO addition (the spec's reassessment corrected an earlier "under-documented" framing). `pressure-events/` and `character-proposals/` return zero matches in the world-directory layout; `world-proposals/` returns zero matches at root level. `archive/` is at root level (line 57), confirming `world-proposals/` belongs at root scope, not under `worlds/<slug>/`.
2. SPEC-62 §2.5 (lines 115–134) is the source deliverable; the root-level scoping of `world-proposals/` matches §2.7's `NWP`/`NWB` root-scoping note and the allocator's `PIPELINE_ID_CLASSES` (`NWB`/`NWP`) + `PRESSURE_EVENT_ID_CLASSES` (`EPE`) in `tools/world-mcp/src/tools/allocate-next-id.ts`. The EPE non-indexing asymmetry is confirmed by archived SPEC-61 (EPE base cards allocator-tracked, file-scanned until canonized via sidecar).
3. Single-artifact ticket (`docs/REPOSITORY-MAP.md`); the boundary under audit is the world-directory layout block (must place `pressure-events/` + `character-proposals/` under `worlds/<slug>/` and `world-proposals/` at root, beside `archive/`) — no other doc or code is touched.

## Architecture Check

1. Documenting the three live surfaces at the standard layout makes the repository map truthful; the explicit root-vs-world scoping for `world-proposals/` prevents a future reader from mis-placing it under `worlds/<slug>/` (the same trap §2.7 guards in ID-ALLOCATION).
2. No backwards-compatibility aliasing/shims — additive layout entries plus one asymmetry note; no existing entry is removed or renamed (`proposals/` + `audits/` at lines 44–45 are left unchanged).

## Verification Layers

1. `pressure-events/` and `character-proposals/` appear under the `worlds/<slug>/` layout → codebase grep-proof.
2. `world-proposals/` appears as a root-level entry (beside `archive/`), not under `worlds/<slug>/` → codebase grep-proof + manual review of placement.
3. The EPE "allocator-tracked but intentionally not retrieval-indexed" asymmetry note is present → codebase grep-proof.
4. Single-layer ticket: a documentation directory-map edit with no code path; grep-proof of the added entries plus a placement read is the complete verification surface, so no further layer mapping applies.

## What to Change

### 1. Add `pressure-events/` and `character-proposals/` to the world-directory layout

Under the `worlds/<slug>/` layout (alongside `proposals/`, `audits/`, `characters/`, `diegetic-artifacts/`): add `pressure-events/` (EPE base cards + `EPE-*.proposal.md` sidecars + `batches/`) and `character-proposals/` (`NCP-<integer>` cards + `batches/NCB-<integer>` manifests).

### 2. Add root-level `world-proposals/`

Add `world-proposals/` (`NWP-<integer>` cards + `batches/NWB-<integer>` manifests) as a **root-level** entry, beside `archive/` — explicitly NOT a `worlds/<slug>/` directory.

### 3. Add the EPE indexing-asymmetry note

Add a one-line note that EPE base cards are allocator-tracked but intentionally NOT retrieval-indexed (file-scanned until canonized via sidecar), so the asymmetry reads as design, not a bug.

## Files to Touch

- `docs/REPOSITORY-MAP.md` (modify)

## Out of Scope

- `proposals/` and `audits/` entries — already present at lines 44–45; do not re-add or duplicate.
- Any allocator, schema, or retrieval-surface change (the prefixes are already allocator-supported; EPE non-indexing is by design and preserved).
- The ID-ALLOCATION registry entries for the same prefixes (SPEC62FOUANDDOC-006, a parallel docs-gap on a different surface).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "pressure-events/\|character-proposals/" docs/REPOSITORY-MAP.md` returns matches inside the `worlds/<slug>/` layout block.
2. `grep -n "world-proposals/" docs/REPOSITORY-MAP.md` returns a match at root level (sibling to `archive/`), not nested under `worlds/<slug>/`.
3. `grep -ni "not retrieval-indexed\|file-scanned" docs/REPOSITORY-MAP.md` returns the EPE asymmetry note.

### Invariants

1. The existing `proposals/` (line 44) and `audits/` (line 45) entries are unchanged and not duplicated.
2. `world-proposals/` is documented at root scope; `pressure-events/` + `character-proposals/` at world scope — matching the allocator's pipeline-vs-world-vs-pressure id-class scoping.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "pressure-events\|character-proposals\|world-proposals" docs/REPOSITORY-MAP.md`
2. `grep -n "proposals/\|audits/" docs/REPOSITORY-MAP.md` — confirm lines 44–45 remain single (no duplication).
3. Narrower-command rationale: a single directory-map doc edit; grep-proof of the three added entries + the no-duplication check on the pre-existing entries is the complete verification boundary.
