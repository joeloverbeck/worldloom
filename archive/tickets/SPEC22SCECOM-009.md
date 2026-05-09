# SPEC22SCECOM-009: ARCTRACE allocator registration + CLAUDE.md §ID Allocation Conventions docs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/allocate-next-id.ts` (`ID_CLASS_FORMATS` + `STORY_SCOPED_ID_CLASS_DIRECTORIES`), the MCP `ID_CLASSES` enum in `tools/world-mcp/src/server.ts`, package-local allocator tests/docs, and `CLAUDE.md` §ID Allocation Conventions. Additive across all surfaces.
**Deps**: archive/tickets/SPEC22SCECOM-001.md

## Problem

At intake, SPEC-22 §Track 3 required `allocate_next_id(world_slug, 'ARCTRACE', story_slug=...)` to return the next ARCTRACE-NNNN id. Before this ticket, `tools/world-mcp/src/tools/allocate-next-id.ts` rejected ARCTRACE requests and the runtime page-cycle (archived SPEC-20) could not allocate new ids before patch-plan submission. Separately, `CLAUDE.md` §ID Allocation Conventions documented the existing human-facing allocation classes but was missing ARCTRACE-NNNN — a Rule-6 (No Silent Retcons) docs gap closed by landing the docs update with the allocator registration.

## Assumption Reassessment (2026-05-08)

1. At intake, `tools/world-mcp/src/tools/allocate-next-id.ts` existed and carried `ID_CLASS_FORMATS` plus `STORY_SCOPED_ID_CLASS_DIRECTORIES`; neither listed `ARCTRACE`. This ticket adds ARCTRACE to both registries.
2. At intake, `CLAUDE.md` §ID Allocation Conventions documented the existing id classes including `SP-NNNN` and `RSP-NNNN`, but `ARCTRACE-NNNN` was absent. This ticket adds the ARCTRACE bullet.
3. **Cross-skill boundary under audit**: the allocator is the canonical machine-facing allocation surface used by every patch-plan-submitting skill. Registering ARCTRACE there enables the patch-engine op from archive/tickets/SPEC22SCECOM-001.md to resolve ARCTRACE-NNNN sequentially at submit time. CLAUDE.md is the canonical pipeline-docs surface; humans reading the §ID Allocation Conventions block must see ARCTRACE alongside SP and RSP.
4. **FOUNDATIONS §Change Control Policy** restated: "Every approved change must: get a record, list affected files." Adding a new ID class is a pipeline-level convention change; documenting it in CLAUDE.md alongside the code-side allocator change preserves the attribution chain (Rule 6 No Silent Retcons at the pipeline level).
5. (HARD-GATE / canon-write ordering): N/A — allocator + docs are meta-tooling.
6. **Schema extension is additive** — new ID class entry in both `ID_CLASS_FORMATS` and `STORY_SCOPED_ID_CLASS_DIRECTORIES` maps; new bullet in CLAUDE.md.
7. **Soft dep on archive/tickets/SPEC22SCECOM-001.md**: the allocator coordinates with the patch-engine's pre-apply check (`id-allocation-race.ts`, extended in archived SPEC22SCECOM-001). Without the archived ticket's `arc_trace_ids` envelope-schema field, the allocator's ARCTRACE registration would be unreachable from patch plans. Listing the archived ticket as a dep ensures 009 doesn't ship before that envelope surface exists.
8. Live reassessment (2026-05-09) found same-package fallout not listed in the draft: `tools/world-mcp/src/server.ts` exports `ID_CLASSES`, which backs the MCP input schema and `describe_capabilities()` enum metadata, and `tools/world-mcp/tests/tools/allocate-next-id.test.ts` already carries the focused allocator coverage and lockstep assertions. These are same-seam required edits, not a separate capability.
9. Live reassessment also found `tools/world-mcp/README.md` documents `allocate_next_id`'s story-bundle-scoped id-class list and currently omits ARCTRACE. Because this is package-local user-facing documentation for the changed tool surface, it is included as closeout fallout alongside `CLAUDE.md`. `docs/MACHINE-FACING-LAYER.md` already mentions `describe_capabilities` for id-class schema currency and does not enumerate `allocate_next_id` classes, so it remains outside scope.
10. The explicit SPEC-22 reference had the allocator row and CLAUDE.md row but omitted the MCP enum and README fallout. This ticket updates `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` Track 3 implementation matrix to match the landed public-surface boundary.

## Architecture Check

1. The allocator's `ID_CLASS_FORMATS` + `STORY_SCOPED_ID_CLASS_DIRECTORIES` pair is the canonical place to register new story-bundle-scoped ID classes; following the existing pattern (parallel to PG, SLT, CHC entries) keeps the registration surface uniform.
2. Routing the CLAUDE.md docs update through this ticket rather than a separate "docs-only" ticket avoids the partial-landing pattern where the code surface is updated but the docs lag — Rule 6 (No Silent Retcons) at the pipeline level prefers atomic landing.
3. No backwards-compatibility shims.

## Verification Layers

1. `mcp__worldloom__allocate_next_id(world_slug, 'ARCTRACE', story_slug=<slug>)` returns `ARCTRACE-0001` on a fresh story bundle; returns `ARCTRACE-0002` after an existing ARCTRACE-0001 record.
2. The allocator rejects `ARCTRACE` allocation without `story_slug` (preserves story-bundle-scoped discipline).
3. `ID_CLASSES` exposes `ARCTRACE`, so the MCP input schema and `describe_capabilities()` id_class enum accept the new class.
4. `grep -n "ARCTRACE-NNNN" CLAUDE.md` returns ≥1 match in §ID Allocation Conventions.
5. The CLAUDE.md entry follows the existing format: `<ID-CLASS> — <description> (<storage path>; allocate with <scope-arguments>)`.
6. Package-local README allocator docs list ARCTRACE in the story-bundle-scoped class list.
7. FOUNDATIONS §Change Control Policy alignment: pipeline-level convention change documented atomically with its code surface.

## Landed Changes

### 1. Extended `tools/world-mcp/src/tools/allocate-next-id.ts`

In `ID_CLASS_FORMATS`:

```typescript
ARCTRACE: {
  width: 4,
  zeroPad: true,
  regex: /^ARCTRACE-(\d{4})$/,
}
```

In `STORY_SCOPED_ID_CLASS_DIRECTORIES`:

```typescript
ARCTRACE: 'arc-traces'
```

The allocator's existing per-class scan logic works against the new `arc-traces/` directory without further code changes.

### 2. Extended MCP enum metadata

Added `ARCTRACE` to `tools/world-mcp/src/server.ts` `ID_CLASSES` so the public MCP input schema and `describe_capabilities()` id_class enum expose the same class registered by the allocator.

### 3. Extended docs

Added a new bullet in `CLAUDE.md` §ID Allocation Conventions:

```markdown
- `ARCTRACE-NNNN` — ARC_TRACE records (`worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`; allocate with `story_slug`)
```

The bullet follows the existing format convention used for SP-NNNN, RSP-NNNN, etc.

Also updated the package-local `tools/world-mcp/README.md` allocator class list to include `ARCTRACE`, and updated the SPEC-22 implementation matrix for the same-seam enum/docs fallout.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — register ARCTRACE in both maps)
- `tools/world-mcp/src/server.ts` (modify — add ARCTRACE to `ID_CLASSES`)
- `CLAUDE.md` (modify — add bullet to §ID Allocation Conventions)
- `tools/world-mcp/README.md` (modify — include ARCTRACE in package-local allocator docs)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — extend existing allocator coverage)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — truth Track 3 file matrix)

## Out of Scope

- Patch-engine envelope `arc_trace_ids` field (in 001)
- Indexer + MCP retrieval extensions (in 007, 008)
- Canonical-vocabularies enums (in archive/tickets/SPEC22SCECOM-006.md)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `allocate_next_id(world_slug, 'ARCTRACE', story_slug=<slug>)` returns `ARCTRACE-0001` on an empty bundle (no existing ARCTRACE files).
2. After writing `ARCTRACE-0001.yaml` to the bundle, the next allocation returns `ARCTRACE-0002`.
3. `allocate_next_id(world_slug, 'ARCTRACE')` (without `story_slug`) rejects with structured error preserving story-bundle-scoped discipline.
4. `describe_capabilities()` / the exported MCP enum exposes `ARCTRACE` in `allocate_next_id.id_class`.
5. `grep -n "ARCTRACE-NNNN" CLAUDE.md` returns 1 match in §ID Allocation Conventions.
6. `grep -n "ARCTRACE" tools/world-mcp/README.md` shows ARCTRACE in the package-local allocator docs.

### Invariants

1. ARCTRACE allocation is monotonic — never returns a previously-used id.
2. ARCTRACE allocation is `story_slug`-scoped per story-bundle ID-class discipline.
3. CLAUDE.md §ID Allocation Conventions documents every story-bundle-scoped ID class the codebase actually allocates (FOUNDATIONS Rule 6 alignment at the pipeline-docs level).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modified) — extends existing allocator coverage for fresh-bundle allocation, sequential allocation, missing-`story_slug` rejection, and enum lockstep.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js`
3. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js`
4. `grep -n "ARCTRACE-NNNN" CLAUDE.md`
5. `grep -n "ARCTRACE" tools/world-mcp/README.md`
6. `cd tools/world-mcp && npm run test` — broad package sweep; result recorded in `## Verification Result` / `## Deviations` because one unrelated local-index-dependent test failed.

## Outcome

Completed: 2026-05-09.

ARCTRACE is now a first-class story-bundle-scoped allocator class in `tools/world-mcp`: direct module calls, the MCP input enum, and `describe_capabilities()` metadata all expose it. Allocation scans `worlds/<slug>/stories/<story-slug>/_source/arc-traces/` and returns monotonic `ARCTRACE-NNNN` ids, while missing `story_slug` still returns the existing structured invalid-input error. `CLAUDE.md`, `tools/world-mcp/README.md`, and the SPEC-22 Track 3 matrix now document the public surface.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js` — passed, 15 tests.
3. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js` — passed, 2 tests.
4. `grep -n "ARCTRACE-NNNN" CLAUDE.md` — passed; one §ID Allocation Conventions hit.
5. `grep -n "ARCTRACE" tools/world-mcp/README.md` — passed; hits in existing `get_record` docs and updated `allocate_next_id` docs.
6. `cd tools/world-mcp && npm run test` — rebuilt and ran the package suite; 341 tests passed and 1 unrelated context-packet test failed because the local gitignored `worlds/erotica-world` index returned `index_version_mismatch` instead of the test's expected `packet_incomplete_required_classes`.

## Deviations

- The draft named a new `tools/world-mcp/tests/tools/allocate-next-id-arctrace.test.ts`; the live package already had the focused allocator test file and lockstep enum assertions, so this ticket extended `tools/world-mcp/tests/tools/allocate-next-id.test.ts` instead.
- The draft omitted `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, and the SPEC-22 matrix from the file list. Live reassessment classified these as same-seam public-surface fallout.
- The broad `npm run test` lane is not a green acceptance gate for this ticket in the current checkout because it depends on the local gitignored `worlds/erotica-world/_index` state. The focused allocator and capability tests are the truthful proof surface for the owned change.
