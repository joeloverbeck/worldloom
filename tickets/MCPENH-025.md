# MCPENH-025: Index story-bundle atomic records in the world-index DB

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index/` parser, indexer, and schema to ingest story-bundle records under `worlds/<slug>/stories/<slug>/_source/`. No skill changes; no MCP retrieval-tool changes (those follow in MCPENH-026 / MCPENH-027).
**Deps**: `archive/tickets/FOUNDATIONS-001.md` (provides the design-contract anchor for story-bundle architecture)

## Problem

`tools/world-index/` indexes world-canon atomic records (CF / CH / INV / M / OQ / ENT / SEC) under `worlds/<slug>/_source/<world-subdir>/` plus hybrid records (CHAR / DA / PA) under their respective hybrid directories. The output is `worlds/<slug>/_index/world.db` — the SQLite + FTS5 index per FOUNDATIONS §Machine-Facing Layer §1.

It does NOT index story-bundle records. Files under `worlds/<slug>/stories/<slug>/_source/<story-subdir>/` are not parsed, not indexed, and not queryable through the MCP retrieval surface.

The friction is concrete: during the storylet-pool-authoring session (this conversation), Pre-flight required ~33 individual file reads to assemble the story-bundle context (20 SLT files + 6 OBL files + 4 THR files + 1 PG file + STORY_KERNEL.md + INDEX.md + the bundle-root `_source/` directory listing). With a mature pool of 100+ storylets, this scales to hundreds of reads. There is no aggregate-load option because `mcp__worldloom__list_records` doesn't support story-bundle record types — and that limitation traces back to this ticket: the index doesn't know about story-bundle records.

The five story-pipeline skills (per `docs/FOUNDATIONS.md` §Story Bundles) all read story-bundle state at Pre-flight (current pool / open OBLs / active THRs / recent page metadata along the longest-active branch). Without story-bundle indexing, every Pre-flight pays the directory-walk cost.

## Assumption Reassessment (2026-05-03)

1. **Existing world-index parses world-canon atomic records but not story-bundle records** — verified by inspecting `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/index/nodes.ts`, and `tools/world-index/src/enumerate.ts`. The parser walks `worlds/<slug>/_source/<world-subdir>/` and emits typed nodes for the 7 world-canon atomic classes plus the 3 hybrid classes. It does not walk `worlds/<slug>/stories/<slug>/_source/`.
2. **Story-bundle record schemas are documented in two places** — `branching-story-bootstrap/templates/story-records.yaml` (one document per class with required + optional field enumeration and worked examples for STENT / SF / SE / OBL / CNSQ / THR / SREL / STINT / STLOC / STOBJ / BR / PG / CHC and story-local DA) plus `storylet-pool-authoring/templates/storylet-record.yaml` (SLT records). The schemas are stable and versioned with the skill files.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Machine-Facing Layer §1 names the World Index as "SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums. Derived, deterministic, and regenerable from markdown." This commitment is currently restricted to world canon. `docs/FOUNDATIONS.md` §Story Bundles establishes that story-bundle records are equally first-class architectural objects — the same indexing discipline should extend to them.
4. **Cross-artifact shared boundary under audit** — the boundary is the SQLite schema in `tools/world-index/src/schema/types.ts` + `tools/world-index/src/schema/migrations/`. The schema currently has tables keyed by world-level node types; this ticket adds story-bundle-scoped tables (or extends existing tables with a `story_slug` column to preserve a single nodes table) AND adds story-bundle node-type variants to the typed-node enum.
5. **No CF Record schema extension** — story-bundle record schemas are not CF Record schema; FOUNDATIONS §Canon Fact Record Schema is unchanged.
6. **No Mystery Reserve firewall weakening** — indexing is read-only over the bundle filesystem; it cannot mutate story-bundle records nor world-canon records. Mystery Reserve discipline remains enforced at skill (Phase 4 gates) and validator (VALENH-001) layers.
7. **Adjacent contradictions** — `_index/world.db` is gitignored per CLAUDE.md §Repository Layout. A per-world index extension stays gitignored; story-bundle indexing does not introduce a new tracked artifact. If a per-bundle index is preferred (`worlds/<slug>/stories/<slug>/_index/story.db`), it should be gitignored at the same scope; either path-shape is acceptable but must be picked at implementation time and propagated to `.gitignore`.

## Architecture Check

1. **Single-database extension is cleaner than per-bundle databases** — keeping `worlds/<slug>/_index/world.db` as the canonical index surface (with a `story_slug` discriminator column on story-bundle node tables) preserves a single retrieval point for the MCP server. Per-bundle databases would require either (a) the MCP server discovering story-slugs at query time and federating queries across N databases, or (b) skills supplying the story-slug to route the query — both add complexity. Single-database keeps the `world_slug` axis as the primary partition (already established) and adds `story_slug` as a secondary partition for story-bundle node types. Cross-bundle queries (e.g., "all SLT records across all stories in this world") remain trivially expressible.
2. **No backwards-compatibility shims** — the schema migration adds new tables (or new columns to existing tables) keyed by story-bundle node types. World-canon node tables are untouched. Existing MCP retrieval queries against world-canon node types continue to work without modification.
3. **Story-bundle node-type vocabulary is closed and documented** — the node-type enum addition (`storylet_record`, `obligation_record`, `thread_record`, `fact_record`, `event_record`, `consequence_record`, `relationship_record_story`, `intention_record`, `story_entity_record`, `story_location_record`, `story_object_record`, `branch_record`, `page_record`, `choice_record`, `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, `remediation_storylet_proposal_card`) is fully derived from CLAUDE.md §ID Allocation Conventions and the two schema-template files cited in Assumption Reassessment item 2. No vocabulary inventiveness in this ticket.

## Verification Layers

1. `world-index build worlds/<slug>` parses every story-bundle record under `worlds/<slug>/stories/<slug>/_source/` and emits typed nodes for each → schema validation: query the resulting `world.db` for `SELECT count(*) FROM nodes WHERE node_type='storylet_record' AND world_slug='<slug>' AND story_slug='<story-slug>'` and confirm it equals the count of `*.yaml` files under `worlds/<slug>/stories/<slug>/_source/storylets/`.
2. Story-bundle node IDs (SLT-NNNN, OBL-NNNN, etc.) are unique within their (world_slug, story_slug, node_type) triple → schema validation: `CREATE UNIQUE INDEX` migration on the new columns; the index build aborts if a collision is detected.
3. STENT.world_ent_id references resolve to a world-canon ENT record → codebase grep-proof on the parser: confirm the parsing pass preserves the `world_ent_id` field as a typed cross-reference edge in the `edges` table.
4. SF.derived_from_cf references resolve to a world-canon CF record (when non-null) → schema validation: post-build, query for SF nodes with `derived_from_cf` populated and confirm each cited CF exists in the canon_fact node table.
5. SLT.provenance.created_at_page references a PG record in the same bundle (when non-null) → schema validation: post-build, JOIN on (world_slug, story_slug) confirms every non-null `created_at_page` resolves to an indexed PG node.
6. Build is regenerable → `world-index build worlds/<slug>` is idempotent (same input → same output `world.db` content_hash); deleting `_index/` and rebuilding produces an equivalent database.
7. FOUNDATIONS §Machine-Facing Layer §1 alignment → manual review: the World Index commitment ("SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums; derived, deterministic, and regenerable") holds for story-bundle records identically to how it holds for world-canon records.

## What to Change

### 1. Extend `tools/world-index/src/parse/atomic.ts` to walk story-bundle subdirectories

Currently the parser walks `worlds/<slug>/_source/<world-subdir>/`. Extend it to also walk `worlds/<slug>/stories/<slug>/_source/<story-subdir>/` with the per-story-bundle node-type vocabulary listed in §Architecture Check item 3. Each parsed record becomes a typed node with `(world_slug, story_slug, node_id, node_type, content_hash, file_path, parsed_body)`.

### 2. Extend `tools/world-index/src/index/nodes.ts` to write story-bundle node types

Add the new node-type values to the typed-node enum. Add `story_slug TEXT` column to the `nodes` table (NULL for world-canon nodes; populated for story-bundle nodes). Add composite unique index on `(world_slug, story_slug, node_id)` so id-collision detection covers both world-canon and story-bundle namespaces.

### 3. Extend `tools/world-index/src/index/edges.ts` to capture story-bundle edges

Story-bundle records carry several typed-edge classes:
- `STENT.world_ent_id → world-canon ENT` (story-to-world reference; load-bearing for cast binding integrity).
- `SF.derived_from_cf → world-canon CF` (story-to-world reference; load-bearing for Rule 1 fact-citation).
- `SLT.provenance.created_at_page → PG` in same bundle (intra-bundle reference; load-bearing for Rule 4 branch-isolation).
- `SLT.opens_obligations / pays_off_obligations / complicates_obligations / transfers_obligations → OBL matchers` (intra-bundle references; load-bearing for Phase 4 gate 4 consequence-capacity check).
- `PG.parent_page_id → PG` in same bundle (intra-bundle tree edge; load-bearing for branch_path reconstruction).
- `CHC.parent_page_id → PG` in same bundle.
- `BR.leaf_page_id → PG` in same bundle.
- `OBL.dependent_facts → SF` in same bundle.
- `THR.obligations → OBL` in same bundle.

Each becomes a typed edge in the `edges` table.

### 4. Extend `tools/world-index/src/parse/entities.ts` to capture story-local entity mentions

Story-bundle records' prose fields (notes, fact_template.object, etc.) carry entity mentions parallel to world-canon records' prose. Extend the entity-mention extraction to include story-bundle records, with `story_slug` populated. This enables future `find_named_entities(world_slug, names, story_slug=<slug>)` queries (added in MCPENH-026) to surface story-local entities alongside world-canon entities.

### 5. Schema migration

Add migration `tools/world-index/src/schema/migrations/<NNN>-story-bundle-tables.ts` (number per the existing migration sequence). The migration adds `story_slug TEXT` columns to `nodes`, `edges`, `entity_mentions`, and `fts_*` tables; adds composite indexes per §Architecture Check item 3; updates the schema version in `tools/world-index/src/schema/version.ts`.

### 6. Parser-error handling

When a story-bundle YAML file is malformed, the parser logs a warning and skips the record (consistent with how malformed world-canon records are handled today per `tools/world-index/src/parse/atomic.ts`). The build does not abort — partial pool indexing is preferred over no indexing.

### 7. `world-index render` extension

`world-index render <world-slug> [--story <story-slug>]` is added as a new sub-command to render a merged-markdown view of a story bundle (parallel to the existing `world-index render <world-slug> [--file <class>]` for world canon). Read-only; not persisted to disk.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify — extend directory walk)
- `tools/world-index/src/parse/entities.ts` (modify — extend entity-mention extraction to story-bundle records)
- `tools/world-index/src/parse/yaml.ts` (modify — handle story-bundle YAML schemas, citing `branching-story-bootstrap/templates/story-records.yaml` and `storylet-pool-authoring/templates/storylet-record.yaml`)
- `tools/world-index/src/index/nodes.ts` (modify — extended typed-node enum + story_slug column)
- `tools/world-index/src/index/edges.ts` (modify — story-bundle typed edges)
- `tools/world-index/src/index/fts.ts` (modify — FTS index covers story-bundle records)
- `tools/world-index/src/schema/types.ts` (modify — schema-type definitions for new columns)
- `tools/world-index/src/schema/migrations/<NNN>-story-bundle-tables.ts` (new — migration script)
- `tools/world-index/src/schema/version.ts` (modify — bump version)
- `tools/world-index/src/enumerate.ts` (modify — enumerate story-bundle subdirectories)
- `tools/world-index/src/cli.ts` (modify — `render --story <slug>` sub-command)
- `tools/world-index/tests/` (new test files — fixture story bundle + index-build assertions)

## Out of Scope

- Adding `mcp__worldloom__list_records` enum values for story-bundle types (covered by MCPENH-026).
- Adding `get_record` / `get_neighbors` / `find_named_entities` story-slug parameter handling (covered by MCPENH-026).
- Adding the story-bundle context layer to `get_context_packet` (covered by MCPENH-027).
- Adding the predicate-DSL parsability validator (covered by VALENH-001).
- Migrating story-pipeline skills' write discipline from Shape A to Shape B (covered by PEENH-001).
- Re-indexing the existing `worlds/erotica-world/stories/marla-kern-seduction/` bundle (operationally; the build command runs after this ticket lands and is part of the user's normal workflow, not the ticket's deliverable).

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter world-index test` passes; new tests cover the story-bundle parsing + indexing path.
2. `pnpm --filter world-index build && node tools/world-index/dist/cli.js build worlds/<fixture-slug>` produces a `world.db` whose story-bundle node count matches the YAML file count under the fixture's `worlds/<fixture-slug>/stories/<story-slug>/_source/`.
3. `node tools/world-index/dist/cli.js render worlds/<fixture-slug> --story <story-slug>` emits a merged-markdown view containing every story-bundle record class.
4. Idempotency check: `world-index build` followed by a second `world-index build` produces a `world.db` with identical content_hashes for every node.
5. Cross-bundle isolation check: a fixture with two story bundles in the same world produces two distinct sets of story-bundle nodes; no story_slug crossover.

### Invariants

1. World-canon node retrieval (`SELECT * FROM nodes WHERE node_type='canon_fact'`) returns identical results pre- and post-migration — story-bundle indexing is purely additive at the schema level.
2. Story-bundle node IDs are unique within `(world_slug, story_slug, node_type)` triples — id collisions across stories within the same world are permitted (each story owns its own ID namespace per CLAUDE.md §ID Allocation Conventions).
3. Every story-bundle node's `file_path` resolves to a real file on disk at index-build time; deleting a story-bundle YAML file and rebuilding the index cleanly removes the corresponding node.
4. The `_index/world.db` artifact remains gitignored.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-parse.test.ts` — fixture story bundle with one record per class; assert each record parses and lands as a typed node in the index.
2. `tools/world-index/tests/story-bundle-edges.test.ts` — fixture story bundle with cross-bundle edges (STENT.world_ent_id → ENT, SF.derived_from_cf → CF); assert edges land in the `edges` table with correct types.
3. `tools/world-index/tests/story-bundle-render.test.ts` — assert `world-index render --story <slug>` emits a markdown view containing every record class.
4. `tools/world-index/tests/story-bundle-isolation.test.ts` — fixture with two story bundles; assert no cross-bundle node leakage.
5. `tools/world-index/tests/migrations/<NNN>-story-bundle-tables.test.ts` — assert the migration adds expected columns/indexes and is reversible (down migration restores original schema).

### Commands

1. `pnpm --filter world-index lint && pnpm --filter world-index typecheck && pnpm --filter world-index test` (targeted pipeline verification).
2. `cd tools/world-index && pnpm build && node dist/cli.js build worlds/erotica-world && sqlite3 worlds/erotica-world/_index/world.db "SELECT node_type, count(*) FROM nodes WHERE story_slug IS NOT NULL GROUP BY node_type"` (full-pipeline verification against the existing `marla-kern-seduction` bundle, after this ticket lands).
3. `node tools/world-index/dist/cli.js render worlds/erotica-world --story marla-kern-seduction | head -100` (visual confirmation of the rendered story-bundle view).
