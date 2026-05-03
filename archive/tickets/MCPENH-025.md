# MCPENH-025: Index story-bundle atomic records in the world-index DB

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-index/` parser, indexer, schema, CLI, package docs, and machine-layer docs to ingest and render story-bundle records under `worlds/<slug>/stories/<story-slug>/_source/`. No skill changes; no MCP retrieval-tool changes (those follow in MCPENH-026 / MCPENH-027).
**Deps**: `archive/tickets/FOUNDATIONS-001.md` (provides the design-contract anchor for story-bundle architecture)

## Problem

`tools/world-index/` indexes world-canon atomic records (CF / CH / INV / M / OQ / ENT / SEC) under `worlds/<slug>/_source/<world-subdir>/` plus hybrid records (CHAR / DA / PA) under their respective hybrid directories. The output is `worlds/<slug>/_index/world.db` — the SQLite + FTS5 index per FOUNDATIONS §Machine-Facing Layer §1.

At intake, it did not index story-bundle records. Files under `worlds/<slug>/stories/<story-slug>/_source/<story-subdir>/` were not parsed, not indexed, and not queryable through the MCP retrieval surface.

The friction is concrete: during the storylet-pool-authoring session (this conversation), Pre-flight required ~33 individual file reads to assemble the story-bundle context (20 SLT files + 6 OBL files + 4 THR files + 1 PG file + STORY_KERNEL.md + INDEX.md + the bundle-root `_source/` directory listing). With a mature pool of 100+ storylets, this scales to hundreds of reads. There is no aggregate-load option because `mcp__worldloom__list_records` doesn't support story-bundle record types — and that limitation traces back to this ticket: the index doesn't know about story-bundle records.

The five story-pipeline skills (per `docs/FOUNDATIONS.md` §Story Bundles) all read story-bundle state at Pre-flight (current pool / open OBLs / active THRs / recent page metadata along the longest-active branch). Before this ticket, every Pre-flight paid the directory-walk cost.

## Assumption Reassessment (2026-05-03)

1. **Existing world-index parses world-canon atomic records but not story-bundle records** — verified by inspecting `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/index/nodes.ts`, and `tools/world-index/src/enumerate.ts`. The parser walks `worlds/<slug>/_source/<world-subdir>/` and emits typed nodes for the 7 world-canon atomic classes plus the 3 hybrid classes. It does not walk `worlds/<slug>/stories/<slug>/_source/`.
2. **Story-bundle record schemas are documented in two places** — `branching-story-bootstrap/templates/story-records.yaml` (one document per class with required + optional field enumeration and worked examples for STENT / SF / SE / OBL / CNSQ / THR / SREL / STINT / STLOC / STOBJ / BR / PG / CHC and story-local DA) plus `storylet-pool-authoring/templates/storylet-record.yaml` (SLT records). The schemas are stable and versioned with the skill files.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Machine-Facing Layer §1 names the World Index as "SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums. Derived, deterministic, and regenerable from markdown." At intake, that implementation was restricted to world canon. `docs/FOUNDATIONS.md` §Story Bundles establishes that story-bundle records are equally first-class architectural objects, so the same indexing discipline now extends to them.
4. **Cross-artifact shared boundary under audit** — the boundary is the SQLite schema in `tools/world-index/src/schema/types.ts` + `tools/world-index/src/schema/migrations/`. The schema currently has tables keyed by world-level node types; this ticket adds story-bundle-scoped tables (or extends existing tables with a `story_slug` column to preserve a single nodes table) AND adds story-bundle node-type variants to the typed-node enum.
5. **No CF Record schema extension** — story-bundle record schemas are not CF Record schema; FOUNDATIONS §Canon Fact Record Schema is unchanged.
6. **No Mystery Reserve firewall weakening** — indexing is read-only over the bundle filesystem; it cannot mutate story-bundle records nor world-canon records. Mystery Reserve discipline remains enforced at skill (Phase 4 gates) and validator (VALENH-001) layers.
7. **Adjacent contradictions** — `_index/world.db` is gitignored per CLAUDE.md §Repository Layout. This ticket chose the per-world index extension, so story-bundle indexing does not introduce a new tracked artifact or require a per-bundle `.gitignore` addition.
8. **Live package command and migration shape corrected before implementation** — `tools/world-index/package.json` has package-local `npm run build` and `npm test` scripts; there is no root `pnpm --filter world-index` workspace command in this checkout. Schema migrations are ordered SQL files under `tools/world-index/src/schema/migrations/`, not TypeScript migration modules, so this ticket owns `004_story_bundle_scope.sql` and a version bump.
9. **DB identity boundary corrected before implementation** — the live `nodes` table uses `node_id TEXT PRIMARY KEY`, so duplicate bare IDs such as `SLT-0001` cannot coexist across story bundles. Story-bundle records are stored with a deterministic DB node id of `<story_slug>:<record_id>` while `story_slug` is stored in the new nullable column and the authored record id remains in the YAML body. This preserves cross-bundle isolation without rewriting the whole index schema to composite primary keys.

## Architecture Check

1. **Single-database extension is cleaner than per-bundle databases** — keeping `worlds/<slug>/_index/world.db` as the canonical index surface (with a `story_slug` discriminator column on story-bundle node tables) preserves a single retrieval point for the MCP server. Per-bundle databases would require either (a) the MCP server discovering story-slugs at query time and federating queries across N databases, or (b) skills supplying the story-slug to route the query — both add complexity. Single-database keeps the `world_slug` axis as the primary partition (already established) and adds `story_slug` as a secondary partition for story-bundle node types. Cross-bundle queries (e.g., "all SLT records across all stories in this world") remain trivially expressible.
2. **No backwards-compatibility shims** — the schema migration adds nullable `story_slug` columns and story-bundle node types. World-canon rows keep `story_slug IS NULL`. Existing MCP retrieval queries against world-canon node types continue to work without modification.
3. **Story-bundle node-type vocabulary is closed and documented** — the node-type enum addition (`storylet_record`, `obligation_record`, `thread_record`, `story_fact_record`, `story_event_record`, `consequence_record`, `relationship_record_story`, `intention_record`, `story_entity_record`, `story_location_record`, `story_object_record`, `branch_record`, `page_record`, `choice_record`, `story_diegetic_artifact_record`, `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, `remediation_storylet_proposal_card`) is derived from FOUNDATIONS §Story Bundles and the two schema-template files cited in Assumption Reassessment item 2.

## Verification Layers

1. `world-index build <slug>` parses every story-bundle record under `worlds/<slug>/stories/<story-slug>/_source/` and emits typed nodes for each → schema validation: query the resulting `world.db` for `SELECT count(*) FROM nodes WHERE node_type='storylet_record' AND world_slug='<slug>' AND story_slug='<story-slug>'` and confirm it equals the count of `*.yaml` files under `worlds/<slug>/stories/<story-slug>/_source/storylets/`.
2. Story-bundle authored IDs (SLT-NNNN, OBL-NNNN, etc.) are represented by DB node ids scoped as `<story_slug>:<record_id>` → schema validation: build a fixture with duplicate bare story IDs across two bundles and confirm both rows coexist with distinct `story_slug` values.
3. STENT.world_ent_id references resolve to a world-canon ENT record → codebase grep-proof on the parser: confirm the parsing pass preserves the `world_ent_id` field as a typed cross-reference edge in the `edges` table.
4. SF.derived_from_cf references resolve to a world-canon CF record (when non-null) → schema validation: post-build, query for SF nodes with `derived_from_cf` populated and confirm each cited CF exists as a `canon_fact_record` node.
5. SLT.provenance.created_at_page references a PG record in the same bundle (when non-null) → schema validation: post-build, JOIN on (world_slug, story_slug) confirms every non-null `created_at_page` resolves to an indexed PG node.
6. Build is regenerable → `world-index build worlds/<slug>` is idempotent (same input → same output `world.db` content_hash); deleting `_index/` and rebuilding produces an equivalent database.
7. FOUNDATIONS §Machine-Facing Layer §1 alignment → manual review: the World Index commitment ("SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums; derived, deterministic, and regenerable") holds for story-bundle records identically to how it holds for world-canon records.

## Landed Changes

### 1. Extend `tools/world-index/src/parse/atomic.ts` to walk story-bundle subdirectories

The parser now walks `worlds/<slug>/stories/<story-slug>/_source/<story-subdir>/` for story entities, facts, events, obligations, consequences, threads, relationships, intentions, locations, objects, branches, pages, choices, storylets, and story-local artifacts. Each parsed story YAML record becomes a typed node with `story_slug` populated and a deterministic DB node id of `<story_slug>:<authored-id>`.

### 2. Extend `tools/world-index/src/index/nodes.ts` to write story-bundle node types

Added the new story-bundle node-type values to the typed-node enum. Added nullable `story_slug` columns to `nodes`, `edges`, and `entity_mentions`; world-canon rows keep `story_slug IS NULL`. Added story-scoped indexes while preserving the existing global `node_id` primary key.

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

Implemented typed edges for `STENT.world_ent_id`, `SF.derived_from_cf`, `created_at_page`, page/branch parent and leaf links, obligation/fact links, thread/obligation links, and storylet obligation matcher references. Same-bundle references resolve through `<story_slug>:<record-id>` node ids.

### 4. Extend `tools/world-index/src/parse/entities.ts` to capture story-local entity mentions

Entity-mention extraction now scans story-bundle node bodies and persists `story_slug` on emitted mentions and mention edges. Future MCP retrieval filtering remains out of scope for MCPENH-026.

### 5. Schema migration

Added `tools/world-index/src/schema/migrations/004_story_bundle_scope.sql` and bumped `CURRENT_INDEX_VERSION` to 4. FTS remains content-backed by `nodes`; story-scoped filtering is performed through `nodes.story_slug`.

### 6. Parser-error handling

Malformed story-bundle YAML emits a warning validation result and skips the malformed story record. The build does not abort solely because one story-bundle record is malformed.

### 7. `world-index render` extension

Added `world-index render <world-slug> --story <story-slug>` as a read-only merged markdown view over indexed story-bundle records. The world-canon `--file <class>` render surface remains future work and is not claimed by this ticket.

## Files to Touch

- `docs/FOUNDATIONS.md` (modify — render/read-discipline wording)
- `docs/MACHINE-FACING-LAYER.md` (modify — render command inventory)
- `docs/WORKFLOWS.md` (modify — render command quick reference)
- `tools/world-index/README.md` (modify — CLI and output-scope docs)
- `tools/world-index/src/parse/atomic.ts` (modify — story-bundle enumeration/parser/edges)
- `tools/world-index/src/parse/entities.ts` (modify — extend entity-mention extraction to story-bundle records)
- `tools/world-index/src/commands/render.ts` (new — story-bundle render command)
- `tools/world-index/src/commands/shared.ts` (modify — build/sync pipeline includes story records)
- `tools/world-index/src/commands/verify.ts` (modify — drift verification reparses story records as story YAML)
- `tools/world-index/src/enumerate.ts` (modify — enumerate story-bundle subdirectories)
- `tools/world-index/src/index/edges.ts` (modify — story-bundle typed edges)
- `tools/world-index/src/index/nodes.ts` (modify — insert nullable `story_slug`)
- `tools/world-index/src/schema/types.ts` (modify — schema-type definitions for new columns)
- `tools/world-index/src/schema/migrations/004_story_bundle_scope.sql` (new — migration script)
- `tools/world-index/src/schema/version.ts` (modify — bump version)
- `tools/world-index/src/cli.ts` (modify — `render --story <slug>` sub-command)
- `tools/world-index/tests/cli-smoke.test.ts` (modify — CLI render smoke)
- `tools/world-index/tests/commands.test.ts` (modify — story indexing, edge, render assertions)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify — fixture story bundles)
- `tools/world-index/tests/schema.test.ts` (modify — migration column/index assertions)
- `tools/world-index/tests/types.test.ts` (modify — registry counts)

## Out of Scope

- Adding `mcp__worldloom__list_records` enum values for story-bundle types (covered by MCPENH-026).
- Adding `get_record` / `get_neighbors` / `find_named_entities` story-slug parameter handling (covered by MCPENH-026).
- Adding the story-bundle context layer to `get_context_packet` (covered by MCPENH-027).
- Adding the predicate-DSL parsability validator (covered by VALENH-001).
- Migrating story-pipeline skills' write discipline from Shape A to Shape B (covered by PEENH-001).
- Re-indexing the existing `worlds/erotica-world/stories/marla-kern-seduction/` bundle (operationally; the build command runs after this ticket lands and is part of the user's normal workflow, not the ticket's deliverable).

## Acceptance Criteria

### Tests That Passed

1. `npm run build` from `tools/world-index`.
2. `npm test` from `tools/world-index` passed 72 tests. The compiled suite covers story-bundle parsing/indexing, story edges, story render output, CLI render smoke, schema migration columns/indexes, and duplicate bare `SLT-0001` ids across two story bundles.

### Invariants

1. World-canon node retrieval (`SELECT * FROM nodes WHERE node_type='canon_fact_record'`) remains additive at the schema level; world-canon rows retain `story_slug IS NULL`.
2. Story-bundle authored IDs are unique within `(world_slug, story_slug, node_type)` triples; the persisted DB `node_id` is story-scoped as `<story_slug>:<record_id>` so id collisions across stories within the same world are permitted without violating the existing primary-key schema.
3. Every story-bundle node's `file_path` resolves to a real file on disk at index-build time; deleting a story-bundle YAML file and rebuilding the index cleanly removes the corresponding node.
4. The `_index/world.db` artifact remains gitignored.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/helpers/atomic-fixture.ts` — adds two fixture story bundles, including duplicate bare `SLT-0001` ids across stories.
2. `tools/world-index/tests/commands.test.ts` — asserts storylet rows land with distinct `story_slug` values, `SF.derived_from_cf` resolves to `CF-0001`, stats include storylet rows, and `render(..., {storySlug})` emits story-bundle markdown.
3. `tools/world-index/tests/cli-smoke.test.ts` — asserts the compiled CLI accepts `render <world> --story <story-slug>` and prints indexed story-bundle records.
4. `tools/world-index/tests/schema.test.ts` — asserts migration-added `story_slug` columns and indexes exist.
5. `tools/world-index/tests/types.test.ts` — updates node/edge registry counts for story types.

### Commands

1. `npm run build` from `tools/world-index`.
2. `npm test` from `tools/world-index`.

## Outcome

Completion date: 2026-05-03.

Completed. `world-index build` / `sync` now ingest story-bundle `_source/**/*.yaml` records into the existing per-world `world.db`, with nullable `story_slug` columns, story-bundle node types, story-scoped DB node ids, typed story edges, entity mentions, drift verification, and `world-index render <world-slug> --story <story-slug>`.

## Verification Result

Passed:

1. `npm run build` from `tools/world-index`.
2. `npm test` from `tools/world-index` — 72 tests passed.
3. Manual closeout review of `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/WORKFLOWS.md`, and `docs/FOUNDATIONS.md` for same-seam render/index wording.

## Deviations

The live package does not have a root `pnpm --filter world-index` proof lane, so verification used package-local `npm` scripts. The live migration system uses SQL migrations, so the new migration is `004_story_bundle_scope.sql`, not a TypeScript migration. The existing `nodes.node_id` primary key remains global; story-bundle DB node ids are scoped as `<story_slug>:<record_id>` while authored IDs remain in the YAML body. FTS did not need a `story_slug` column because story filtering is performed through the content-backed `nodes` table. Post-ticket review added `docs/WORKFLOWS.md` to the same-seam docs handoff so the machine-facing CLI quick reference includes `world-index render <world-slug> --story <story-slug>`.
