# SPEC62FOUANDDOC-006: ID-ALLOCATION — document the `EPE` / `NWP` / `NWB` prefixes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `docs/ID-ALLOCATION.md` (per-class registry documentation); no allocator or schema change.
**Deps**: None

## Problem

`docs/ID-ALLOCATION.md` §Per-class registry → §World-scoped hybrid / pipeline artifacts documents `PA` / `CHAR` / `DA` / `PR` / `BATCH` / `NCP` / `NCB` / `AU` / `RP`, but `EPE`, `NWP`, and `NWB` are absent — even though they are live allocator-tracked prefixes. SPEC-62 §2.7 records them (closing the gap archived SPEC-61 §6 routes here). Pure documentation: the allocator already supports the prefixes.

## Assumption Reassessment (2026-05-21)

1. Verified against current code: `EPE` / `NWP` / `NWB` are live allocator prefixes — `tools/world-mcp/src/tools/allocate-next-id.ts:19-28` defines `NWB`, `NWP`, `EPE` id-class formats; `PIPELINE_ID_CLASSES = {NWB, NWP}` and `PRESSURE_EVENT_ID_CLASSES = {EPE}` (lines 84–85). Verified absent from `docs/ID-ALLOCATION.md`: `grep -c "EPE\|NWP\|NWB" docs/ID-ALLOCATION.md` returns 0 each this session. The §World-scoped hybrid / pipeline artifacts list is at line 23 onward.
2. SPEC-62 §2.7 (lines 153–171) is the source deliverable; archived SPEC-61 §6 (`archive/specs/SPEC-61-proposal-surface-schema-and-approval-enforcement.md`) explicitly routes this docs gap to SPEC-62 ("do not expand SPEC-61's scope to edit `docs/ID-ALLOCATION.md` directly"). Triage A3 (Fault 9, narrowed) confirms the docs-only scope.
3. Single-artifact ticket (`docs/ID-ALLOCATION.md`); the boundary under audit is the §World-scoped hybrid / pipeline artifacts list — the three entries must record the live allocator prefixes and flag `NWP`/`NWB` as root-scoped (not `worlds/<slug>/`) so they are not mistaken for world-scoped classes.

## Architecture Check

1. Recording the three prefixes where the other pipeline-artifact prefixes already live keeps the per-class registry truthful to the allocator; the explicit root-scope note for `NWP`/`NWB` mirrors §2.5's REPOSITORY-MAP root-vs-world placement, keeping the two docs surfaces consistent.
2. No backwards-compatibility aliasing/shims — three additive registry entries; no allocator, schema, or existing-entry change.

## Verification Layers

1. `EPE-<integer>`, `NWP-<integer>`, `NWB-<integer>` appear in the §World-scoped hybrid / pipeline artifacts list with correct paths → codebase grep-proof.
2. `NWP`/`NWB` are flagged as root-scoped (root-level `world-proposals/`, not under `worlds/<slug>/`) → codebase grep-proof + manual review.
3. The documented prefixes match the allocator's id-class definitions → FOUNDATIONS/code alignment check against `allocate-next-id.ts` (no allocator change; the doc records existing support).
4. Single-layer ticket: a documentation registry edit with no code path; grep-proof of the three entries plus a read of the allocator definitions is the complete verification surface.

## What to Change

### 1. Add three entries to §World-scoped hybrid / pipeline artifacts

- `EPE-<integer>` — pressure-event cards and their `EPE-*.proposal.md` sidecars (`worlds/<slug>/pressure-events/`).
- `NWP-<integer>` — world-proposal cards (root-level `world-proposals/`, a pre-world surface).
- `NWB-<integer>` — world-proposal batch manifests (root-level `world-proposals/batches/`).

Note the root-level path for `NWP` / `NWB` explicitly so they are not mistaken for world-scoped classes.

## Files to Touch

- `docs/ID-ALLOCATION.md` (modify)

## Out of Scope

- Any allocator or schema change — the allocator already supports `EPE` / `NWP` / `NWB`; this only records them in the registry.
- The REPOSITORY-MAP entries for the same surfaces (SPEC62FOUANDDOC-004, a parallel docs-gap on a different surface).
- The §Per-class registry's other lists (canon atomic-source, story-bundle-scoped) — unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "EPE-<integer>\|NWP-<integer>\|NWB-<integer>" docs/ID-ALLOCATION.md` returns the three new entries in the §World-scoped hybrid / pipeline artifacts list.
2. `grep -n "root-level\|root-scoped" docs/ID-ALLOCATION.md` confirms `NWP`/`NWB` carry the root-scope note.
3. `grep -n "EPE\|NWP\|NWB" tools/world-mcp/src/tools/allocate-next-id.ts` confirms the documented prefixes match live allocator id-class definitions (no allocator change made).

### Invariants

1. The documented prefixes exactly match the allocator's `ID_CLASS_FORMATS` keys for `EPE` / `NWP` / `NWB`.
2. `NWP` / `NWB` are documented as root-scoped pre-world artifacts; `EPE` as `worlds/<slug>/pressure-events/` — matching `PIPELINE_ID_CLASSES` vs `PRESSURE_EVENT_ID_CLASSES`.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "EPE\|NWP\|NWB" docs/ID-ALLOCATION.md`
2. `grep -n "NWB:\|NWP:\|EPE:" tools/world-mcp/src/tools/allocate-next-id.ts` — cross-check documented prefixes against the live allocator.
3. Narrower-command rationale: a registry-list doc edit recording already-supported allocator prefixes; grep-proof of the three entries + an allocator cross-check is the complete verification boundary.
