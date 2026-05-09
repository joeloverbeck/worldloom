# SPEC22SCECOM-008: MCP retrieval for ARC_TRACE: `get_record` + `list_records` + `get_record_schema`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get_record.ts`, `tools/world-mcp/src/tools/list_records.ts`, `tools/world-mcp/src/tools/get_record_schema.ts`. Additive — no impact on existing record-type dispatch.
**Deps**: archive/tickets/SPEC22SCECOM-007.md

## Problem

SPEC-22 §Track 3 requires MCP retrieval tools to surface ARC_TRACE records: `get_record(ARCTRACE-NNNN)` returns the parsed YAML; `list_records(record_type='arc_trace_record', story_slug)` returns the bundle's ARC_TRACE records; `get_record_schema(record_type='arc_trace_record')` returns the v2 schema metadata. Without these extensions, downstream sibling skills (Track 4) cannot retrieve ARC_TRACE records via MCP — `branching-story-health-audit`'s Phase 3 sub-checks need `list_records('arc_trace_record', story_slug, include_full_body=true)` to load whole-class trace data; `story-fact-promotion-to-canon`'s Phase 1 needs `get_record(arc_trace_id)` for the proposal-package's evidence_span citation.

## Assumption Reassessment (2026-05-08)

1. `tools/world-mcp/src/tools/get_record.ts`, `list_records.ts`, `get_record_schema.ts` exist and dispatch by record-type string. Existing dispatch covers PG, SLT, CHC, SF, SE, OBL, etc. Adding `arc_trace_record` is a new dispatch arm following the existing pattern (verified at SPEC-22 reassessment).
2. `get_record` accepts `record_id`, `world_slug`, `story_slug`, `section_path` (per existing GetRecordArgs interface). The story-bundle dispatch uses `STORY_BUNDLE_NODE_TYPES` + `isStoryBundleNodeType` predicates; `arc_trace_record` is added to both.
3. `list_records` accepts `world_slug`, `record_type`, `story_slug`, `include_full_body`. The `SUPPORTED_LIST_RECORD_TYPES` set extends with `arc_trace_record`.
4. `get_record_schema(record_type='arc_trace_record')` returns the v2 schema metadata — consumes the JSON schema added in archive/tickets/SPEC22SCECOM-002.md (`tools/validators/src/schemas/story-arc-trace.schema.json`) OR a parallel TypeScript schema metadata source in `world-index/src/public/types.ts` (extended in archive/tickets/SPEC22SCECOM-007.md). Soft dep on that archived ticket for the JSON schema source-of-truth.
5. **Cross-skill boundary under audit**: this ticket extends the MCP retrieval surface that Track 4 skills (010, 011, 012) consume. The retrieval-tool semantics preserve `story_slug`-required discipline for story-bundle records.
6. **FOUNDATIONS §Story Bundles §3 (Read Discipline)** restated: "Story-bundle records remain directly readable as files for current story-pipeline workflows... For indexed story-bundle records with known authored IDs, targeted retrieval tools such as `get_record`, `get_records`, `get_record_field`, `get_records_field`, `list_records`... can read the bundle-scoped records when supplied with `story_slug`." The new dispatch arms preserve this discipline.
7. (HARD-GATE / canon-write ordering): N/A — read-only MCP surface.
8. **Schema extension is additive** — new dispatch arms; existing record-type dispatch unchanged.

## Architecture Check

1. Each MCP tool already follows the per-record-type dispatch pattern; adding `arc_trace_record` to each is a straightforward parallel extension. No new tool surfaces are needed (per SPEC-22 §Track 3 — `get_records` and `get_records_field` reuse the same dispatch).
2. No backwards-compatibility shims.

## Verification Layers

1. `mcp__worldloom__get_record(ARCTRACE-0001, world_slug, story_slug)` returns the parsed record → integration test.
2. `mcp__worldloom__get_record(ARCTRACE-0001, world_slug, story_slug, section_path: 'effect_evidence')` projects only the effect-evidence block → integration test.
3. `mcp__worldloom__list_records(world_slug, record_type='arc_trace_record', story_slug, include_full_body=true)` returns all ARCTRACE records for the story bundle.
4. `mcp__worldloom__get_record_schema(record_type='arc_trace_record')` returns the v2 schema metadata (matches `story-arc-trace.schema.json` shape).
5. `mcp__worldloom__get_records_field(record_ids: [ARCTRACE-...], field_path: 'semantic_critic_verdict.status')` projects per-record status values.
6. FOUNDATIONS §Story Bundles §3 alignment: `story_slug` required for ARC_TRACE retrieval (preserved discipline).

## What to Change

### 1. Extend `tools/world-mcp/src/tools/get_record.ts`

- Add `arc_trace_record` to `STORY_BUNDLE_NODE_TYPES`.
- Update `isStoryBundleNodeType` (if needed) to recognize ARCTRACE-NNNN id patterns.
- Confirm the dispatch routes ARC_TRACE retrieval through the existing story-bundle scoped read path.

### 2. Extend `tools/world-mcp/src/tools/list_records.ts`

- Add `arc_trace_record` to `SUPPORTED_LIST_RECORD_TYPES`.
- Confirm the listing query targets `arc_trace_node` table + reads the full YAML body when `include_full_body=true`.

### 3. Extend `tools/world-mcp/src/tools/get_record_schema.ts`

- Add `arc_trace_record` case returning the v2 schema metadata (load from `tools/validators/src/schemas/story-arc-trace.schema.json` OR from a TypeScript schema-metadata module in world-index — whichever the existing dispatch uses).

### 4. Confirm `get_records` and `get_records_field` cover ARC_TRACE

These tools dispatch through the same per-record-type lookup as `get_record` / `list_records`; adding `arc_trace_record` to the underlying registry should propagate. Verify the dispatch and add explicit cases if needed.

## Files to Touch

- `tools/world-mcp/src/tools/get_record.ts` (modify — STORY_BUNDLE_NODE_TYPES + dispatch)
- `tools/world-mcp/src/tools/list_records.ts` (modify — SUPPORTED_LIST_RECORD_TYPES + dispatch)
- `tools/world-mcp/src/tools/get_record_schema.ts` (modify — schema-metadata dispatch case)
- `tools/world-mcp/src/tools/get_records.ts` (modify if needed — bulk fetch)
- `tools/world-mcp/src/tools/get_records_field.ts` (modify if needed — field projection)
- `tools/world-mcp/tests/tools/get_record-arc-trace.test.ts` (new)
- `tools/world-mcp/tests/tools/list_records-arc-trace.test.ts` (new)

## Out of Scope

- Indexer parsing + migration (in archive/tickets/SPEC22SCECOM-007.md)
- Canonical-vocabularies + get_canonical_vocabulary (in archive/tickets/SPEC22SCECOM-006.md)
- Allocator + CLAUDE.md docs (in 009)
- Patch-engine op (in 001)
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `get_record(ARCTRACE-0001, world_slug, story_slug)` returns the parsed YAML record (integration test against fixture bundle).
2. `get_record(ARCTRACE-0001, world_slug, story_slug, section_path: 'effect_evidence')` returns just the effect_evidence block.
3. `list_records(world_slug, record_type='arc_trace_record', story_slug, include_full_body=true)` returns all ARCTRACE records in the bundle.
4. `get_record_schema(record_type='arc_trace_record')` returns schema metadata matching `story-arc-trace.schema.json`.
5. `get_record(ARCTRACE-0001)` (without `story_slug`) rejects with structured error per existing story-bundle scoped-read discipline.

### Invariants

1. ARC_TRACE retrieval preserves `story_slug`-required discipline (FOUNDATIONS §Story Bundles §3).
2. `section_path` projection works on ARC_TRACE records identically to other story-bundle records.
3. Existing record-type dispatch behavior is preserved unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get_record-arc-trace.test.ts` (new).
2. `tools/world-mcp/tests/tools/list_records-arc-trace.test.ts` (new).
3. `tools/world-mcp/tests/tools/get_record_schema-arc-trace.test.ts` (new).

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && npm run test`
