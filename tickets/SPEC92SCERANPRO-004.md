# SPEC92SCERANPRO-004: world-mcp SCN op dispatch, allocator, and retrieval registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (SCN id_class in the allocator; SCN record_type in `list_records` / `get_record`; `create_scn_record` envelope dispatch).
**Deps**: SPEC92SCERANPRO-003, archive/tickets/SPEC92SCERANPRO-002.md

## Problem

SCN records must be allocatable (`allocate_next_id(world_slug, 'SCN', story_slug=...)`) and retrievable (`list_records` / `get_record` with `story_slug`) so `branching-story-scene-plan` can allocate SCN ids and skills / Story Explorer can read scenes. SPEC-92 acceptance #1 + #6 and the `/reassess-spec` M4 finding require this retrieval registration explicitly (it is distinct from the op dispatch).

## Assumption Reassessment (2026-05-28)

1. `tools/world-mcp/src/tools/allocate-next-id.ts`, `allocate-many-ids.ts`, `list-records.ts`, `tool-names.ts`, and `server.ts` all exist at HEAD (verified). The SCN id_class joins the existing story-bundle id_class set; the SCN record_type joins the `list_records` / `get_record` record-type registry.
2. SPEC-92 §2 + §Acceptance #1 (`allocate_next_id('SCN')`) + #6 (SCN retrieval) + the reassessment M4 finding (Files-to-touch made retrieval registration explicit) define this ticket. FOUNDATIONS §Story Bundles §6 lists SCN as a story-bundle ID class (the FOUNDATIONS edit lands in -010).
3. Cross-artifact boundary under audit: the op dispatch routes `create_scn_record` (defined in -003, the Dep) through submit/validate-patch-plan, delegating envelope validation to the patch engine; the retrieval surface is consumed by `branching-story-scene-plan` (-008) and `branching-story-scene-prose-attach` (-009).
4. FOUNDATIONS §Story Bundles §3 (Read Discipline): story-bundle records are retrievable via `get_record` / `list_records` when `story_slug` is supplied. SCN must join that surface so scene reads route through MCP retrieval (not raw file reads), per §Tooling Recommendation.

## Architecture Check

1. Registering SCN in the existing allocator + retrieval surfaces (rather than a scene-specific tool) keeps SCN a first-class story-bundle record uniformly with PG / SLT. The op dispatch delegates to the patch-engine envelope validation (-003) — no duplicated op logic.
2. No shims: SCN id_class + record_type are new enum members, not special cases.

## Verification Layers

1. `allocate_next_id('SCN', story_slug=...)` returns the next unpadded SCN id -> world-mcp tool test.
2. `list_records(record_type=scene, story_slug=...)` + `get_record('SCN-1')` resolve -> world-mcp retrieval test (requires the world-index node-type from -005 at query time).
3. `submit_patch_plan` accepts a `create_scn_record` envelope -> world-mcp dispatch test (delegates to patch-engine).

## What to Change

### 1. allocate-next-id.ts + allocate-many-ids.ts (modify)

Add `SCN` to the story-bundle id_class set so allocation produces unpadded `SCN-<n>`.

### 2. list-records.ts + tool-names.ts (modify)

Register the SCN record_type so `list_records` / `get_record` resolve SCN records.

### 3. server.ts (modify)

Wire the record_type / op-dispatch registration as needed.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/tools/allocate-many-ids.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)

## Out of Scope

- world-index enumeration + node-type parsing (-005) — retrieval depends on it but it lands separately.
- The skills that call allocate / retrieve (-008 / -009).

## Acceptance Criteria

### Tests That Must Pass

1. `allocate_next_id('SCN', story_slug)` allocates a unique unpadded `SCN-<n>`.
2. `list_records` / `get_record` resolve SCN records (with -005 landed).
3. `cd tools/world-mcp && npm run build && npm test` green.

### Invariants

1. SCN id allocation follows the unpadded natural-integer convention (FOUNDATIONS §Canonical Storage Layer).
2. Scene retrieval requires `story_slug` (story-bundle scope).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — extend; SCN id_class.
2. `tools/world-mcp/tests/tools/list-records.test.ts` — extend; SCN record_type.

### Commands

1. `cd tools/world-mcp && npm run build && npm test`
