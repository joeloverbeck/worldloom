# SPEC22SCECOM-008: MCP retrieval for ARC_TRACE: `get_record` + `list_records` + `get_record_schema`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-record.ts`, `tools/world-mcp/src/tools/list-records.ts`, `tools/world-mcp/src/tools/get-record-schema.ts`, registered MCP metadata/docs, and focused world-mcp tests. Additive — no impact on existing record-type dispatch.
**Deps**: archive/tickets/SPEC22SCECOM-007.md

## Problem

SPEC-22 §Track 3 requires MCP retrieval tools to surface ARC_TRACE records: `get_record(ARCTRACE-NNNN)` returns the parsed YAML; `get_record(ARCTRACE-NNNN, section_path='effect_evidence')` returns a parsed-record projection; `list_records(record_type='arc_trace_record', story_slug)` returns the bundle's ARC_TRACE records; `get_record_schema(node_type='arc_trace_node')` returns the v2 schema metadata. Without these extensions, downstream sibling skills (Track 4) cannot retrieve ARC_TRACE records via MCP — `branching-story-health-audit`'s Phase 3 sub-checks need `list_records('arc_trace_record', story_slug, include_full_body=true)` to load whole-class trace data; `story-fact-promotion-to-canon`'s Phase 1 needs `get_record(arc_trace_id)` for the proposal-package's evidence_span citation.

## Assumption Reassessment (2026-05-09)

1. Live world-mcp tool files are hyphenated: `tools/world-mcp/src/tools/get-record.ts`, `list-records.ts`, and `get-record-schema.ts`. Existing story-bundle dispatch covers PG, SLT, CHC, SF, SE, OBL, etc. via `STORY_BUNDLE_NODE_TYPES`, `STORY_BUNDLE_ID_PREFIXES`, and `SUPPORTED_LIST_RECORD_TYPES`.
2. `get_record` accepts `record_id`, `world_slug`, `story_slug`, `section_path`, but live code only permits `section_path` for hybrid CHAR/DA/PA records. SPEC-22 requires ARC_TRACE projection via `section_path='effect_evidence'`; this ticket extends `section_path` projection to parsed atomic/story YAML records without removing `get_record_field`.
3. `list_records` accepts `world_slug`, `record_type`, `story_slug`, `include_full_body`. The live index producer from archive/tickets/SPEC22SCECOM-007.md emits ARC_TRACE nodes as node_type `arc_trace_node`, so `record_type='arc_trace_record'` maps to that node type rather than adding a fake node-type alias.
4. `get_record_schema` accepts `node_type`, not `record_type`. The truthful schema-discovery call is `get_record_schema(node_type='arc_trace_node')`, backed by `tools/validators/src/schemas/story-arc-trace.schema.json`.
5. **Cross-skill boundary under audit**: this ticket extends the MCP retrieval surface that Track 4 skills (010, 011, 012) consume. The retrieval-tool semantics preserve `story_slug`-required discipline for story-bundle records.
6. **FOUNDATIONS §Story Bundles §3 (Read Discipline)** restated: "Story-bundle records remain directly readable as files for current story-pipeline workflows... For indexed story-bundle records with known authored IDs, targeted retrieval tools such as `get_record`, `get_records`, `get_record_field`, `get_records_field`, `list_records`... can read the bundle-scoped records when supplied with `story_slug`." The new dispatch arms preserve this discipline.
7. (HARD-GATE / canon-write ordering): N/A — read-only MCP surface.
8. **Schema extension is additive** — new dispatch arms; existing record-type dispatch unchanged.

## Architecture Check

1. Each MCP tool already follows the per-record-type dispatch pattern; adding `arc_trace_record` to each is a straightforward parallel extension. No new tool surfaces are needed (per SPEC-22 §Track 3 — `get_records` and `get_records_field` reuse the same dispatch).
2. No backwards-compatibility shims.

## Verification Layers

1. `get_record(ARCTRACE-0001, world_slug, story_slug)` returns the parsed record → package handler/in-memory MCP-boundary tests.
2. `get_record(ARCTRACE-0001, world_slug, story_slug, section_path: 'effect_evidence')` projects only the effect-evidence block → package handler test.
3. `mcp__worldloom__list_records(world_slug, record_type='arc_trace_record', story_slug, include_full_body=true)` returns all ARCTRACE records for the story bundle.
4. `get_record_schema(node_type='arc_trace_node')` returns the v2 schema metadata (matches `story-arc-trace.schema.json` shape) through handler and MCP-boundary tests.
5. `mcp__worldloom__get_records_field(record_ids: [ARCTRACE-...], field_path: 'semantic_critic_verdict.status')` projects per-record status values.
6. FOUNDATIONS §Story Bundles §3 alignment: `story_slug` required for ARC_TRACE retrieval (preserved discipline).

## Landed Changes

### 1. Extended `tools/world-mcp/src/tools/get-record.ts`

- Added ARC_TRACE id support through the shared story-bundle id registry.
- Extended `section_path` projection to parsed atomic/story YAML records, including ARC_TRACE `effect_evidence` and dotted paths such as `semantic_critic_verdict.status`.

### 2. Extended `tools/world-mcp/src/tools/list-records.ts`

- Added `arc_trace_record` to `SUPPORTED_LIST_RECORD_TYPES`.
- Mapped `arc_trace_record` to index node type `arc_trace_node` and preserved story-bundle `story_slug` requirement.

### 3. Extended `tools/world-mcp/src/tools/get-record-schema.ts`

- Added `arc_trace_node` schema discovery backed by `tools/validators/src/schemas/story-arc-trace.schema.json`.
- Fixed local JSON Schema `$ref` handling so same-file refs such as `#/$defs/evidenceSpan` do not throw during referenced-schema collection.

### 4. Confirmed `get_records` and `get_records_field` cover ARC_TRACE

These tools dispatch through `get_record` / `get_record_field`; ARCTRACE now works through the shared story-bundle id registry and focused tests cover the path.

### 5. Updated docs and fixtures

- Updated world-mcp README, registered server description metadata, `docs/MACHINE-FACING-LAYER.md`, and SPEC-22 same-seam prose.
- Extended the story-bundle test fixture with an ARC_TRACE record and updated fixture DB setup for world-index migration 005.

## Files to Touch

- `tools/world-mcp/src/tools/_shared.ts` (modify — story-bundle ARC_TRACE node type + id prefix)
- `tools/world-mcp/src/tools/get-record.ts` (modify — parsed-record `section_path` projection + ARCTRACE id support via shared registry)
- `tools/world-mcp/src/tools/list-records.ts` (modify — `arc_trace_record` record-type mapping)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify — `arc_trace_node` schema case)
- `tools/world-mcp/src/server.ts` (modify — registered description/capability metadata)
- `tools/world-mcp/README.md` (modify — public retrieval surface docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — public retrieval surface docs)
- `specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` (modify — Track 3 truthing)
- `specs/IMPLEMENTATION-ORDER.md` (modify — Track 3 status truthing)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — ARC_TRACE fixture)
- `tools/world-mcp/tests/tools/_shared.ts` (modify — apply migration 005 in fixture DBs)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify — ARCTRACE get/projection/batch field coverage)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify — ARC_TRACE list coverage)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — ARC_TRACE schema coverage)
- `tools/world-mcp/tests/tools/get-record-section-path.test.ts` (modify — parsed atomic `section_path` coverage)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — fixture expectation includes ARC_TRACE node)

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
4. `get_record_schema(node_type='arc_trace_node')` returns schema metadata matching `story-arc-trace.schema.json`.
5. `get_record(ARCTRACE-0001)` (without `story_slug`) rejects with structured error per existing story-bundle scoped-read discipline.

### Invariants

1. ARC_TRACE retrieval preserves `story_slug`-required discipline (FOUNDATIONS §Story Bundles §3).
2. `section_path` projection works on ARC_TRACE records identically to other story-bundle records.
3. Existing record-type dispatch behavior is preserved unchanged.

## Test Plan

### New/Modified Tests

1. Existing story-bundle focused tests extend to cover ARC_TRACE retrieval, listing, section-path projection, batch field projection, and schema discovery.
2. Existing section-path and search-node tests were updated for parsed-record projection and the new ARC_TRACE fixture node.
3. Existing server/capability tests cover registered input enum exposure for `arc_trace_record` and `arc_trace_node` through imported constants.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record.story-bundle.test.js`
3. `cd tools/world-mcp && node --test dist/tests/tools/list-records.story-bundle.test.js`
4. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
5. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js`
6. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`
7. `cd tools/world-mcp && npm run test`

## Outcome

Completion date: 2026-05-09.

Implemented SPEC-22 Track 3 MCP retrieval for ARC_TRACE:

1. `get_record` accepts `ARCTRACE-NNNN` story-bundle ids with `story_slug`, rejects missing `story_slug`, and supports parsed-record `section_path` projection.
2. `get_records` and `get_records_field` cover ARCTRACE through the existing shared get-record paths.
3. `list_records(record_type='arc_trace_record', story_slug, include_full_body=true)` returns parsed ARC_TRACE records from index node type `arc_trace_node`.
4. `get_record_schema(node_type='arc_trace_node')` returns the validator JSON Schema and handles local `$ref` entries.
5. Public package docs, registered MCP descriptions, SPEC-22, implementation-order prose, and machine-facing docs now describe the landed retrieval surface.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record.story-bundle.test.js`
3. `cd tools/world-mcp && node --test dist/tests/tools/list-records.story-bundle.test.js`
4. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js`
5. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js`
6. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`
7. `cd tools/world-mcp && node --test dist/tests/tools/get-record-section-path.test.js`
8. `cd tools/world-mcp && node --test dist/tests/tools/search-nodes.story-bundle.test.js`

Broad package result:

1. `cd tools/world-mcp && npm run test` rebuilt successfully and passed 341 of 342 tests; the only failure was `erotica-world character and artifact skill defaults protect governing full bodies`, which returned `index_version_mismatch` for the gitignored local `worlds/erotica-world/_index/world.db` instead of the test's expected packet-size diagnostic. This is derived local index drift outside the ARC_TRACE retrieval seam.

## Deviations

1. The drafted file names used underscores; live world-mcp files use hyphenated names.
2. The drafted schema call used `record_type='arc_trace_record'`; the live `get_record_schema` public API uses `node_type`, so ARC_TRACE schema discovery landed as `node_type='arc_trace_node'`.
3. The live index producer from 007 uses node type `arc_trace_node`; `list_records` exposes the user-facing record type `arc_trace_record` by mapping it to that node type.
4. The ticket drafted new ARC_TRACE-specific test files, but the existing story-bundle and schema test files already owned the relevant fixture/proof surfaces, so they were extended instead.
