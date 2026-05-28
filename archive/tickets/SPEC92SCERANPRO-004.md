# SPEC92SCERANPRO-004: world-mcp SCN op dispatch, allocator, and retrieval registration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (SCN id_class in allocator surfaces; `scene_record` in retrieval/schema/capability surfaces; `create_scn_record` / `supersede_scn_record` envelope-schema projection) plus the minimal `tools/world-index` `scene_record` node-type enum prerequisite needed for MCP typing.
**Deps**: archive/tickets/SPEC92SCERANPRO-003.md, archive/tickets/SPEC92SCERANPRO-002.md

## Problem

SCN records must be allocatable (`allocate_next_id(world_slug, 'SCN', story_slug=...)`) and retrievable (`list_records` / `get_record` with `story_slug`) so `branching-story-scene-plan` can allocate SCN ids and skills / Story Explorer can read scenes. SPEC-92 acceptance #1 + #6 and the `/reassess-spec` M4 finding require this retrieval registration explicitly (it is distinct from the op dispatch).

## Assumption Reassessment (2026-05-28)

1. `tools/world-mcp/src/tools/allocate-next-id.ts`, `list-records.ts`, `get-record.ts`, `get-record-schema.ts`, `describe-envelope-schema.ts`, `_shared.ts`, and `server.ts` all exist at HEAD (verified). The SCN id_class joins the existing story-bundle id_class set; `scene_record` joins the `list_records` / `get_record` / `get_record_schema` node-type surface.
2. SPEC-92 §2 + §Acceptance #1 (`allocate_next_id('SCN')`) + #6 (SCN retrieval) + the reassessment M4 finding (Files-to-touch made retrieval registration explicit) define this ticket. FOUNDATIONS §Story Bundles §6 lists SCN as a story-bundle ID class (the FOUNDATIONS edit lands in -010).
3. Cross-artifact boundary under audit: the op dispatch routes `create_scn_record` (defined in -003, the Dep) through submit/validate-patch-plan, delegating envelope validation to the patch engine; the retrieval surface is consumed by `branching-story-scene-plan` (-008) and `branching-story-scene-prose-attach` (-009).
4. FOUNDATIONS §Story Bundles §3 (Read Discipline): story-bundle records are retrievable via `get_record` / `list_records` when `story_slug` is supplied. SCN must join that surface so scene reads route through MCP retrieval (not raw file reads), per §Tooling Recommendation.
5. Baseline before source edits: `cd tools/world-mcp && npm run build` failed because -003 added SCN patch-engine op kinds, but `tools/world-mcp/src/tools/describe-envelope-schema.ts` did not yet project `create_scn_record` / `supersede_scn_record` schemas. This ticket absorbs that same-seam MCP projection fallout.
6. SCN retrieval registration needs `scene_record` in the shared `@worldloom/world-index` `NodeType` enum before `world-mcp` can compile. This ticket absorbs only the minimal enum addition in `tools/world-index/src/schema/types.ts`; active -005 still owns world-index enumeration, parsing, indexing, and edges.
7. `tools/world-mcp/src/tool-names.ts` did not require a change: no new MCP tool was added, only existing tool arguments/capability descriptions were expanded.

## Architecture Check

1. Registering SCN in the existing allocator, retrieval, schema, and envelope-description surfaces (rather than a scene-specific tool) keeps SCN a first-class story-bundle record uniformly with PG / SLT. The op dispatch delegates to the patch-engine envelope validation (-003) — no duplicated op logic.
2. No shims: SCN id_class + record_type are new enum members, not special cases.

## Verification Layers

1. `allocate_next_id('SCN', story_slug=...)` returns the next unpadded SCN id -> world-mcp tool test.
2. `list_records(record_type=scene_record, story_slug=...)` + `get_record('SCN-1')` resolve through story-bundle retrieval -> world-mcp retrieval and server dispatch tests.
3. `get_record_schema(record_type=scene_record)` exposes `story-scene.schema.json` -> world-mcp schema-discovery test.
4. `describe_envelope_schema` projects `create_scn_record` / `supersede_scn_record` payload schemas -> world-mcp envelope-schema test (delegates validation to patch-engine).

## Landed Changes

### 1. SCN allocator registration (modify)

Added `SCN` to the story-bundle id_class set and story-scoped directory map so `allocate_next_id` and `allocate_many_ids` produce unpadded `SCN-<n>` ids under a story bundle.

### 2. SCN retrieval registration (modify)

Added `scene_record` to the shared story-bundle node-type vocabulary, `list_records` support, `get_record` id-prefix validation text, and MCP server descriptions. Added the minimal `world-index` `NodeType` enum member needed for compile-time MCP typing.

### 3. SCN schema and envelope-schema projection (modify)

Added `scene_record` to `get_record_schema` and projected `create_scn_record` / `supersede_scn_record` through `describe_envelope_schema` using `story-scene.schema.json`.

### 4. Public docs and coverage (modify)

Updated MCP README / machine-facing docs and added allocator, retrieval, schema-discovery, envelope-schema, and server-dispatch tests for the SCN surfaces.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/get-record.ts` (modify)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- world-index enumeration, node parsing, indexing, and edges (-005) beyond the minimal `scene_record` node-type enum prerequisite needed by MCP.
- The skills that call allocate / retrieve (-008 / -009).

## Acceptance Criteria

### Tests That Must Pass

1. `allocate_next_id('SCN', story_slug)` allocates a unique unpadded `SCN-<n>`.
2. `list_records` / `get_record` resolve SCN records with `story_slug`.
3. `cd tools/world-mcp && npm run build && npm test` green.

### Invariants

1. SCN id allocation follows the unpadded natural-integer convention (FOUNDATIONS §Canonical Storage Layer).
2. Scene retrieval requires `story_slug` (story-bundle scope).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — extend; SCN id_class.
2. `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` — extend; SCN participates in story-bundle batch allocation.
3. `tools/world-mcp/tests/tools/list-records.test.ts` — extend; `scene_record` retrieval.
4. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — extend; `scene_record` schema discovery.
5. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — extend; SCN op schema projection.
6. `tools/world-mcp/tests/server/dispatch.test.ts` — extend; MCP-boundary SCN allocation and scene listing.

### Commands

1. `cd tools/world-mcp && npm run build && npm test`

## Outcome

Completed: 2026-05-28

`tools/world-mcp` now treats SCN as a first-class story-bundle id class and `scene_record` as a first-class story-bundle retrieval/schema node type. The server can allocate SCN ids, list indexed scene records through `list_records(story_slug=...)`, expose `story-scene.schema.json` through `get_record_schema`, and describe `create_scn_record` / `supersede_scn_record` patch-envelope payloads.

The implementation also added the minimal shared `world-index` `scene_record` node-type enum member required for the MCP TypeScript contract. Actual scene parsing/indexing remains with -005.

## Verification Result

1. `cd tools/world-index && npm run build` passed.
2. `cd tools/world-mcp && npm run build` passed.
3. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js dist/tests/tools/allocate-many-ids.test.js dist/tests/tools/list-records.test.js dist/tests/tools/get-record.test.js dist/tests/tools/get-record-schema.test.js dist/tests/tools/describe-envelope-schema.test.js dist/tests/server/dispatch.test.js dist/tests/server/capability-parity.test.js` passed: 111 tests, 111 pass, 0 fail.
4. `cd tools/world-mcp && npm test` passed: 516 tests, 516 pass, 0 fail.
5. `cd tools/world-index && npm test` passed: non-CLI suite 126 tests, CLI suites 14 tests, 0 fail.

## Deviations

The drafted ticket named `allocate-many-ids.ts` and `tool-names.ts`, but neither source file needed a direct code change: `allocate_many_ids` consumes the shared id-class registry, and no new MCP tool name was added.

The drafted ticket also omitted same-seam surfaces required for a green MCP contract after -003: `describe-envelope-schema.ts`, `get-record-schema.ts`, public docs, and the minimal `world-index` `NodeType` enum/test prerequisite. This ticket absorbed those narrow changes while leaving real scene indexing/parser work to -005.
