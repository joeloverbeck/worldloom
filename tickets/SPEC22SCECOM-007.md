# SPEC22SCECOM-007: World-index ARC_TRACE support: types + parser + migration `005_arc_trace_nodes.sql`

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index/src/schema/types.ts` (new `arc_trace_node` node-type), adds `tools/world-index/src/parse/arc-traces.ts` (or extends `parse/yaml.ts`), adds new SQLite migration `005_arc_trace_nodes.sql`. No impact on existing node types.
**Deps**: 006

## Problem

SPEC-22 §Track 3 requires the world-index to parse ARC_TRACE records and surface arc-level fields for retrieval. Without indexer support, `mcp__worldloom__search_nodes`, `get_neighbors`, and `find_named_entities` queries cannot include ARC_TRACE records; the SQLite schema has no place to store the arc-level edges (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`); and downstream MCP retrieval extensions (008) have no parsed records to return.

## Assumption Reassessment (2026-05-08)

1. `tools/world-index/src/schema/migrations/` ships 4 forward-only SQL migrations: `001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`. The new migration is `005_arc_trace_nodes.sql` — next sequence number, additive schema.
2. `tools/world-index/src/parse/` exists (not `parsers/` as the spec's pre-reassessment text incorrectly stated). Story-bundle records are parsed via `tools/world-index/src/parse/yaml.ts` (16.9KB) and `tools/world-index/src/parse/entities.ts` (24.7KB). The new ARC_TRACE parser lives at `tools/world-index/src/parse/arc-traces.ts` OR extends the existing `parse/yaml.ts` story-bundle dispatch.
3. **Cross-skill boundary under audit**: this ticket creates the indexer surface that MCP retrieval (008) consumes via `get_record(ARCTRACE-NNNN)` and `list_records(record_type='arc_trace_record', story_slug)`. The indexer's `arc_trace_node` table + 3 edge tables (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`) are the schema contract.
4. **FOUNDATIONS §Machine-Facing Layer** restated: "Once the retrieval surface is active, every 'skills should always receive X' item above is delivered by `mcp__worldloom__get_context_packet(...)`." The new node-type and edges extend this delivery surface to ARC_TRACE records.
5. (HARD-GATE / canon-write ordering): N/A — indexer is a derived artifact regenerable from atomic-source records via `world-index build`.
6. **Schema extension is additive** — new table + 3 new edge tables; existing tables unchanged. The migration is forward-only per SPEC-01's migration discipline.
7. **Indexer schema migration concern** (per SPEC-22 §Risks): existing worlds' `_index/world.db` is gitignored; running `world-index build` regenerates the index. No on-disk migration script needed for existing world.db files — they are rebuilt.

## Architecture Check

1. Following the existing migration pattern (`00N_*.sql` forward-only) preserves the indexer's deterministic-rebuild property. Splitting into multiple migrations would fragment the ARC_TRACE schema landing.
2. New parser file (`parse/arc-traces.ts`) follows the existing per-class parser pattern — `parse/yaml.ts` is a generic dispatcher that delegates to per-class parsers. ARC_TRACE-specific parsing logic in its own file keeps the dispatcher lean.
3. No backwards-compatibility shims — new node type, new edges; existing schema unchanged.

## Verification Layers

1. Migration applies cleanly on a fresh index → `cd tools/world-index && npm run build && node dist/src/cli.js build <test-fixture-world>` succeeds.
2. Parser ingests a fixture ARC_TRACE record → `arc_trace_node` row appears with fulltext-indexed claims/actions; 3 edge rows appear (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`).
3. Re-build is idempotent — running `world-index build` twice produces byte-identical index (existing world-index discipline).
4. Indexer ingestion benchmark: a story bundle with 50 pages × 1 ARC_TRACE per page (50 ARCTRACE records) ingests in <10s wall-clock (per SPEC-22 §Verification).
5. FOUNDATIONS §Machine-Facing Layer alignment: ARC_TRACE retrievable via the existing tool surface after this ticket lands.

## What to Change

### 1. Add `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`

NEW migration adding:

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

(Exact column names + FTS5 setup per existing node-type pattern in earlier migrations.)

### 2. Add `tools/world-index/src/parse/arc-traces.ts`

NEW parser module:

- Reads YAML from `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`.
- Inserts into `arc_trace_node` + 3 edge tables.
- Resolves `created_at_page` → PG-NNNN; `arc_realized` → SLT-NNNN; `observed_actions[].actor` → STENT-NNNN.
- Indexes `realized_beats[].evidence_text`, `possible_violations[].detail`, `observed_actions[].action_summary` for FTS5.

### 3. Extend `tools/world-index/src/schema/types.ts`

Add `arc_trace_node` to the node-type enum / discriminated union; add corresponding TypeScript record-shape interface (mirroring the JSON Schema added in 002).

### 4. Extend `tools/world-index/src/public/types.ts`

Re-export the new types so MCP retrieval (008) can import from `@worldloom/world-index/public/types`.

### 5. Extend `tools/world-index/src/parse/yaml.ts` dispatcher

Add `arc_trace_record` case to the per-class dispatcher (route to the new `parse/arc-traces.ts` module).

### 6. Extend `world-index render` CLI (optional, per SPEC-22)

`tools/world-index/src/commands/render.ts` gains optional `--arc-traces` flag to include ARC_TRACE records in story-bundle merged-markdown output. Implementation is straightforward extension of the existing render path; spec marks this as an optional enhancement.

## Files to Touch

- `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` (new)
- `tools/world-index/src/parse/arc-traces.ts` (new)
- `tools/world-index/src/parse/yaml.ts` (modify — dispatcher case for `arc_trace_record`)
- `tools/world-index/src/schema/types.ts` (modify — node-type enum + record interface)
- `tools/world-index/src/public/types.ts` (modify — re-export)
- `tools/world-index/src/commands/render.ts` (modify — optional `--arc-traces` flag)
- `tools/world-index/tests/parse/arc-traces.test.ts` (new)

## Out of Scope

- MCP retrieval extensions (in 008)
- Allocator registration + CLAUDE.md docs (in 009)
- Patch-engine op (in 001)
- v1 SLT/CHC parser path removal — existing parser preserves v1 semantics until 014's red-bunny discard
- Same downstream Out of Scope as 001/002

## Acceptance Criteria

### Tests That Must Pass

1. `world-index build` against a fixture v2 bundle (containing 1 ARC_TRACE record) produces an index with 1 row in `arc_trace_node` + corresponding edge rows.
2. Re-running `world-index build` on the same fixture produces a byte-identical index (idempotency check).
3. A bundle with 50 pages × 1 ARC_TRACE per page indexes in <10s wall-clock (per SPEC-22 §Verification).
4. `world-index render --arc-traces` includes ARC_TRACE records in the merged-markdown output (when the flag is provided).
5. Migration `005_arc_trace_nodes.sql` applies cleanly on a fresh database (no syntax errors, no constraint violations on a representative fixture).

### Invariants

1. `arc_trace_node` is the canonical indexer surface for ARC_TRACE records — no parallel indexing path.
2. Edge tables (`arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`) are foreign-key-bound to existing node tables (page_node, storylet_node) where applicable.
3. Migration ordering preserved: `005_arc_trace_nodes.sql` lands after `004_story_bundle_scope.sql` and before any future migration.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/arc-traces.test.ts` (new) — fixture-based parse test.
2. `tools/world-index/tests/integration/arc-trace-indexing.test.ts` (new) — end-to-end build + idempotency + 50-record perf.

### Commands

1. `cd tools/world-index && npm run build`
2. `cd tools/world-index && npm run test`
3. `node dist/src/cli.js build <test-fixture-world>` — full-pipeline build verification.
