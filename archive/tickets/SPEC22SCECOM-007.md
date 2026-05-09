# SPEC22SCECOM-007: World-index ARC_TRACE support: types + parser + migration `005_arc_trace_nodes.sql`

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index` schema/types/parser/render surfaces: new `arc_trace_node` node-type, new ARC_TRACE story edge types, migration `005_arc_trace_nodes.sql`, story-source parser registration, typed ARC_TRACE rows, opt-in `world-index render --arc-traces`, and package tests. Existing node types preserved.
**Deps**: archive/tickets/SPEC22SCECOM-006.md

## Problem

At intake, SPEC-22 §Track 3 required `world-index` to parse ARC_TRACE records and surface arc-level fields for retrieval. Without indexer support, downstream MCP retrieval extensions (008) had no parsed records to return, the SQLite schema had no typed ARC_TRACE row surface, and arc-level relations (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`) were not represented in the index.

## Assumption Reassessment (2026-05-09)

1. `tools/world-index/src/schema/migrations/` shipped 4 forward-only SQL migrations at intake: `001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`. The next additive migration is `005_arc_trace_nodes.sql`, and `tools/world-index/src/schema/version.ts` must move from 4 to 5.
2. The drafted parser path was stale. Live story-bundle `_source/*.yaml` parsing is centralized in `tools/world-index/src/parse/atomic.ts` via `STORY_DIRS`, `listStoryBundleSourceFiles()`, `parseStoryBundleSourceFile()`, and `edgesForStoryRecord()`. `tools/world-index/src/parse/yaml.ts` parses fenced markdown YAML, not story-bundle source records. No separate `parse/arc-traces.ts` is needed for the current architecture.
3. **Cross-artifact boundary under audit**: this ticket creates the indexer producer surface consumed later by MCP retrieval (008): story-scoped `arc_trace_node` records, typed `arc_trace_node` table rows, `arc_trace_describes_page`, `arc_trace_realizes_arc`, and `arc_trace_observes_action_by` relations, plus public type export for downstream package typechecking.
4. **FOUNDATIONS §Machine-Facing Layer** restated: derived indexes are machine-facing read surfaces; canonical story-bundle records remain atomic YAML under `worlds/<slug>/stories/<story-slug>/_source/`. This ticket only regenerates derived index artifacts and does not mutate world canon.
5. (HARD-GATE / canon-write ordering): N/A — `world-index` is a derived artifact regenerable from source records via `world-index build`.
6. **Schema extension is additive** — new ARC_TRACE table + three edge tables + FTS table/triggers; existing tables and node types are preserved. Existing story records still index through the same parser path.
7. Story-bundle node ids are story-scoped in the live index (`<story-slug>:<record-id>`), so ARC_TRACE primary keys and typed edge-table targets use story-scoped node ids while preserving authored `arc_trace_id` as a separate column.
8. The live ARC_TRACE structural schema in `tools/validators/src/schemas/story-arc-trace.schema.json` uses `semantic_critic_verdict.status` values `pass`, `revise_prose`, `reject_arc`, and `promote_interrupt`; the ticket's older `semantic_critic_status` prose was implementation shorthand, not the source schema.

## Architecture Check

1. Following the existing migration pattern (`00N_*.sql` forward-only) preserves the indexer's deterministic-rebuild property. Splitting into multiple migrations would fragment the ARC_TRACE schema landing.
2. Extending `parse/atomic.ts` follows the live story-bundle parser registry and avoids a parallel parser path.
3. No backwards-compatibility shims — new node type, new edges; existing schema unchanged.

## Verification Layers

1. Migration applies cleanly on fresh and upgraded indexes → `npm run build`, `node --test dist/tests/schema.test.js`, and full `npm test`.
2. Parser ingests a fixture ARC_TRACE record → `arc_trace_node` typed row appears, FTS indexes claims/actions, generic story edges and typed edge tables appear.
3. Re-build remains idempotent at the package proof boundary → focused test runs `build()` twice on the same fixture and broad package determinism tests pass.
4. `world-index render` excludes ARC_TRACE by default and includes it only with `--arc-traces` / `arcTraces: true`.
5. FOUNDATIONS §Machine-Facing Layer alignment: ARC_TRACE records are indexed as derived machine-facing rows; MCP retrieval extension remains owned by 008.

## Landed Changes

### 1. Add `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`

Added migration:

```sql
-- arc_trace_node table
CREATE TABLE arc_trace_node (
  id TEXT PRIMARY KEY,                     -- ARCTRACE-NNNN
  story_id TEXT NOT NULL,                  -- STORY-NNN
  created_at_page TEXT NOT NULL,           -- PG-NNNN
  arc_realized TEXT NOT NULL,              -- SLT-NNNN
  effect_variant_applied TEXT,             -- variant id
  semantic_critic_status TEXT NOT NULL,    -- pass / warn / reject_arc / reject_envelope
  -- additional columns per arc-level facets
  -- FTS5 virtual table for claims/actions per existing node-type pattern
  FOREIGN KEY (story_id) REFERENCES story_bundle(id),
  FOREIGN KEY (created_at_page) REFERENCES page_node(id),
  FOREIGN KEY (arc_realized) REFERENCES storylet_node(id)
);

-- Edge tables
CREATE TABLE arc_trace_describes_page (
  arc_trace_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  PRIMARY KEY (arc_trace_id, page_id),
  FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id),
  FOREIGN KEY (page_id) REFERENCES page_node(id)
);

CREATE TABLE arc_trace_realizes_arc (
  arc_trace_id TEXT NOT NULL,
  arc_id TEXT NOT NULL,
  PRIMARY KEY (arc_trace_id, arc_id),
  FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id),
  FOREIGN KEY (arc_id) REFERENCES storylet_node(id)
);

CREATE TABLE arc_trace_observes_action_by (
  arc_trace_id TEXT NOT NULL,
  actor_stent_id TEXT NOT NULL,
  PRIMARY KEY (arc_trace_id, actor_stent_id),
  FOREIGN KEY (arc_trace_id) REFERENCES arc_trace_node(id)
  -- actor_stent_id may reference stent_node when story_bundle scope resolves
);

-- Indexes for retrieval queries
CREATE INDEX idx_arc_trace_story ON arc_trace_node(story_id);
CREATE INDEX idx_arc_trace_page ON arc_trace_node(created_at_page);
CREATE INDEX idx_arc_trace_arc ON arc_trace_node(arc_realized);

-- FTS5 virtual table for fulltext-indexed claims/actions
CREATE VIRTUAL TABLE arc_trace_node_fts USING fts5(
  arc_trace_id UNINDEXED,
  claim_text,
  content='arc_trace_node',
  content_rowid='rowid'
);
```

(Exact landed migration uses story-scoped node ids as table primary keys, stores authored `ARCTRACE-NNNN` in `arc_trace_id`, and indexes `claim_text`, `action_text`, and `violation_text` through FTS5.)

### 2. Extend `tools/world-index/src/parse/atomic.ts`

- Registers `worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`.
- Emits story-scoped `arc_trace_node` nodes.
- Emits story edges for `created_at_page`, `arc_trace_describes_page`, `arc_trace_realizes_arc`, and `arc_trace_observes_action_by`.
- Populates typed ARC_TRACE rows from inserted node bodies in the build path.

### 3. Extend `tools/world-index/src/schema/types.ts`

Add `arc_trace_node` to the node-type enum / discriminated union; add corresponding TypeScript record-shape interface (mirroring the JSON Schema added in archive/tickets/SPEC22SCECOM-002.md).

### 4. Extend `tools/world-index/src/public/types.ts`

Re-export the new types so MCP retrieval (008) can import from `@worldloom/world-index/public/types`.

### 5. Extend story-source inventory and build insertion

`tools/world-index/src/enumerate.ts`, `tools/world-index/src/commands/shared.ts`, and `tools/world-index/src/index/nodes.ts` recognize ARC_TRACE source files, maintain typed ARC_TRACE rows during rebuild/sync, and clean them during file reparse/removal.

### 6. Extend `world-index render` CLI

`tools/world-index/src/commands/render.ts` and `tools/world-index/src/cli.ts` gained an optional `--arc-traces` flag to include ARC_TRACE records in story-bundle merged-markdown output. Default render output still excludes ARC_TRACE records.

## Files to Touch

- `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` (new)
- `tools/world-index/src/parse/atomic.ts` (modify — story-bundle parser registry + ARC_TRACE edges)
- `tools/world-index/src/enumerate.ts` (modify — story source inventory)
- `tools/world-index/src/index/nodes.ts` (modify — typed ARC_TRACE row insertion/deletion)
- `tools/world-index/src/commands/shared.ts` (modify — typed row insertion)
- `tools/world-index/src/schema/types.ts` (modify — node-type enum + record interface)
- `tools/world-index/src/public/types.ts` (modify — re-export)
- `tools/world-index/src/schema/version.ts` (modify — schema version 5)
- `tools/world-index/src/cli.ts` (modify — parse/help for `--arc-traces`)
- `tools/world-index/src/commands/render.ts` (modify — optional `--arc-traces` flag)
- `tools/world-index/README.md` (modify — CLI/public surface docs)
- `tools/world-index/tests/arc-trace-indexing.test.ts` (new)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)

## Out of Scope

- MCP retrieval extensions (in 008)
- Allocator registration + CLAUDE.md docs (in 009)
- Patch-engine op (in 001)
- v1 SLT/CHC parser path removal — existing parser preserves v1 semantics until 014's red-bunny discard
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `world-index build` against a fixture v2 bundle (containing 1 ARC_TRACE record) produces an index with 1 row in `arc_trace_node` + corresponding edge rows.
2. Re-running `world-index build` on the same fixture succeeds with the same ARC_TRACE row/edge contract, and the existing broad package determinism lane remains green.
3. The larger 50-record timing benchmark remains a SPEC-22-level verification goal, not this unit-level ticket gate.
4. `world-index render --arc-traces` includes ARC_TRACE records in the merged-markdown output (when the flag is provided).
5. Migration `005_arc_trace_nodes.sql` applies cleanly on a fresh database (no syntax errors, no constraint violations on a representative fixture).

### Invariants

1. `arc_trace_node` is the canonical indexer surface for ARC_TRACE records — no parallel indexing path.
2. Edge tables (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`) use story-scoped node ids and the generic `edges` table resolves matching targets after full-world parsing.
3. Migration ordering preserved: `005_arc_trace_nodes.sql` lands after `004_story_bundle_scope.sql` and before any future migration.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/arc-trace-indexing.test.ts` (new) — end-to-end build + typed row/edge/FTS/render proof.
2. Existing `schema.test.ts`, `types.test.ts`, and `public-types.test.ts` updated for migration inventory, registry counts, and public type export.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm run test`
3. `cd tools/world-index && node --test dist/tests/arc-trace-indexing.test.js`
4. `cd tools/world-index && node --test dist/tests/schema.test.js`
5. `cd tools/world-index && node --test dist/tests/public-types.test.js`
6. `cd tools/world-index && node --test dist/tests/types.test.js`

## Outcome

Completion date: 2026-05-09.

Implemented the SPEC-22 Track 3 `world-index` ARC_TRACE indexing slice:

1. Added schema migration `005_arc_trace_nodes.sql` and bumped the index schema version to 5.
2. Registered `arc-traces` story-bundle source records as `arc_trace_node` nodes with story-scoped ids.
3. Added ARC_TRACE typed table rows, typed edge tables, FTS indexing for claim/action/violation text, and deletion cleanup during reparse.
4. Added generic story edges for ARC_TRACE page, realized-arc, and observed-actor relations.
5. Added opt-in `world-index render --arc-traces` output while keeping default story render output free of ARC_TRACE records.
6. Exported the ARC_TRACE index row type through `@worldloom/world-index/public/types` and updated README/spec same-seam prose.

## Verification Result

Passed:

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && node --test dist/tests/arc-trace-indexing.test.js`
3. `cd tools/world-index && node --test dist/tests/schema.test.js`
4. `cd tools/world-index && node --test dist/tests/public-types.test.js`
5. `cd tools/world-index && node --test dist/tests/types.test.js`
6. `cd tools/world-index && npm test` — 77 tests passed.

## Deviations

1. The drafted `parse/arc-traces.ts` / `parse/yaml.ts` dispatcher boundary was stale. The live architecture routes story-bundle `_source/*.yaml` records through `tools/world-index/src/parse/atomic.ts`, so ARC_TRACE registration landed there.
2. The typed ARC_TRACE table uses story-scoped node ids (`<story-slug>:ARCTRACE-NNNN`) as primary keys to match the existing story-bundle node contract and preserve cross-story id reuse. The authored `ARCTRACE-NNNN` value is also stored as `arc_trace_id`.
3. The 50-record `<10s` benchmark was not added as a separate timing assertion. The focused fixture proves the parser/schema/edge/render contract and the broad package suite still passes; larger ingestion timing remains covered by SPEC-22's broader verification goal rather than this ticket's unit-level acceptance.
