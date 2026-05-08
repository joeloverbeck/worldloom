# SPEC22SCECOM-009: ARCTRACE allocator registration + CLAUDE.md §ID Allocation Conventions docs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS` + `STORY_SCOPED_ID_CLASS_DIRECTORIES`) and `CLAUDE.md` §ID Allocation Conventions. Additive across both surfaces.
**Deps**: archive/tickets/SPEC22SCECOM-001.md

## Problem

SPEC-22 §Track 3 requires `allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` to return the next ARCTRACE-NNNN id. Without registering ARCTRACE in `tools/world-mcp/src/tools/allocate-next-id.ts`, the allocator rejects ARCTRACE requests and the runtime page-cycle (archived SPEC-20) cannot allocate new ids before patch-plan submission. Separately, `CLAUDE.md` §ID Allocation Conventions documents 14 id classes for human readers but is missing ARCTRACE-NNNN — a Rule-6 (No Silent Retcons) docs gap that this ticket closes by routing the docs update through the allocator-landing ticket so the addition lands atomically.

## Assumption Reassessment (2026-05-08)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` exists (17.8KB). Verified at SPEC-22 reassessment: lines 11-59 hold `ID_CLASS_FORMATS` (47 registered ID classes including SF, PG, SLT, CHC, etc.); lines 79-98 hold `STORY_SCOPED_ID_CLASS_DIRECTORIES` (story-scoped class → source directory map). Neither lists `ARCTRACE`.
2. `CLAUDE.md` §ID Allocation Conventions (lines 93-113) documents 14 id classes including the recently-added `SP-NNNN` and `RSP-NNNN` for story bundles. `ARCTRACE-NNNN` is absent (verified at reassessment via `grep` returning 0 matches).
3. **Cross-skill boundary under audit**: the allocator is the canonical machine-facing allocation surface used by every patch-plan-submitting skill. Registering ARCTRACE there enables the patch-engine op from archive/tickets/SPEC22SCECOM-001.md to resolve ARCTRACE-NNNN sequentially at submit time. CLAUDE.md is the canonical pipeline-docs surface; humans reading the §ID Allocation Conventions block must see ARCTRACE alongside SP and RSP.
4. **FOUNDATIONS §Change Control Policy** restated: "Every approved change must: get a record, list affected files." Adding a new ID class is a pipeline-level convention change; documenting it in CLAUDE.md alongside the code-side allocator change preserves the attribution chain (Rule 6 No Silent Retcons at the pipeline level).
5. (HARD-GATE / canon-write ordering): N/A — allocator + docs are meta-tooling.
6. **Schema extension is additive** — new ID class entry in both `ID_CLASS_FORMATS` and `STORY_SCOPED_ID_CLASS_DIRECTORIES` maps; new bullet in CLAUDE.md.
7. **Soft dep on archive/tickets/SPEC22SCECOM-001.md**: the allocator coordinates with the patch-engine's pre-apply check (`id-allocation-race.ts`, extended in archived SPEC22SCECOM-001). Without the archived ticket's `arc_trace_ids` envelope-schema field, the allocator's ARCTRACE registration would be unreachable from patch plans. Listing the archived ticket as a dep ensures 009 doesn't ship before that envelope surface exists.

## Architecture Check

1. The allocator's `ID_CLASS_FORMATS` + `STORY_SCOPED_ID_CLASS_DIRECTORIES` pair is the canonical place to register new story-bundle-scoped ID classes; following the existing pattern (parallel to PG, SLT, CHC entries) keeps the registration surface uniform.
2. Routing the CLAUDE.md docs update through this ticket rather than a separate "docs-only" ticket avoids the partial-landing pattern where the code surface is updated but the docs lag — Rule 6 (No Silent Retcons) at the pipeline level prefers atomic landing.
3. No backwards-compatibility shims.

## Verification Layers

1. `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=<slug>)` returns `ARCTRACE-0001` on a fresh story bundle; returns `ARCTRACE-0002` after an existing ARCTRACE-0001 record.
2. The allocator rejects `ARCTRACE` allocation without `story_slug` (preserves story-bundle-scoped discipline).
3. `grep -n "ARCTRACE-NNNN" CLAUDE.md` returns ≥1 match in §ID Allocation Conventions.
4. The CLAUDE.md entry follows the existing format: `<ID-CLASS> — <description> (<storage path>; allocate with <scope-arguments>)`.
5. FOUNDATIONS §Change Control Policy alignment: pipeline-level convention change documented atomically with its code surface.

## What to Change

### 1. Extend `tools/world-mcp/src/tools/allocate-next-id.ts`

In `ID_CLASS_FORMATS` (lines 11-59):

```typescript
ARCTRACE: {
  width: 4,
  zeroPad: true,
  regex: /^ARCTRACE-(\d{4})$/,
}
```

In `STORY_SCOPED_ID_CLASS_DIRECTORIES` (lines 79-98):

```typescript
ARCTRACE: 'arc-traces'
```

Confirm the allocator's existing per-class scan logic (which counts highest-numbered file in the source directory) works against the new `arc-traces/` directory without explicit code change.

### 2. Extend `CLAUDE.md` §ID Allocation Conventions

Add a new bullet in the existing list (lines 93-113), placed alphabetically/categorically near other story-bundle-scoped entries (after SP-NNNN, before RSP-NNNN by alphabetical grouping):

```markdown
- `ARCTRACE-NNNN` — ARC_TRACE records (`worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`; allocate with `story_slug`)
```

The bullet follows the existing format convention used for SP-NNNN, RSP-NNNN, etc.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — register ARCTRACE in both maps)
- `CLAUDE.md` (modify — add bullet to §ID Allocation Conventions)
- `tools/world-mcp/tests/tools/allocate-next-id-arctrace.test.ts` (new)

## Out of Scope

- Patch-engine envelope `arc_trace_ids` field (in 001)
- Indexer + MCP retrieval extensions (in 007, 008)
- Canonical-vocabularies enums (in 006)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `allocate_next_id(world_slug, 'ARCTRACE', story_slug=<slug>)` returns `ARCTRACE-0001` on an empty bundle (no existing ARCTRACE files).
2. After writing `ARCTRACE-0001.yaml` to the bundle, the next allocation returns `ARCTRACE-0002`.
3. `allocate_next_id(world_slug, 'ARCTRACE')` (without `story_slug`) rejects with structured error preserving story-bundle-scoped discipline.
4. `grep -n "ARCTRACE-NNNN" CLAUDE.md` returns 1 match in §ID Allocation Conventions.

### Invariants

1. ARCTRACE allocation is monotonic — never returns a previously-used id.
2. ARCTRACE allocation is `story_slug`-scoped per story-bundle ID-class discipline.
3. CLAUDE.md §ID Allocation Conventions documents every story-bundle-scoped ID class the codebase actually allocates (FOUNDATIONS Rule 6 alignment at the pipeline-docs level).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id-arctrace.test.ts` (new) — covers fresh-bundle allocation, sequential allocation, and missing-`story_slug` rejection.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm run test`
3. `grep -n "ARCTRACE-NNNN" CLAUDE.md` — docs-update verification.
