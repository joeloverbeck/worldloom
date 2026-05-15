# SPEC29LEGTOOVOC-004: Retire `arc_trace_record` from world-index schema/parser/indexer/migration/CLI layer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` drops the `arc_trace_node` node-type + 3 edge-table entries + `ArcTraceNodeRow` / `arc_trace_id` row type; `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` is deleted from the forward migration chain; `tools/world-index/src/index/nodes.ts` drops the arc_trace_node DELETE/INSERT statements + special-case parse branch; `tools/world-index/src/commands/shared.ts` drops the arc-trace row insertion call; `tools/world-index/src/parse/atomic.ts` drops the parser registration + parse logic + ARCTRACE story-ref prefix; `tools/world-index/src/enumerate.ts` drops the `arc-traces` source-directory whitelist; `tools/world-index/src/commands/render.ts` drops the render filter; `tools/world-index/src/cli.ts` drops the `--arc-traces` CLI flag; `tools/world-index/src/public/types.ts` drops the retired row-type export; `tools/world-index/tests/schema.test.ts`, `tools/world-index/tests/public-types.test.ts`, and `tools/world-index/tests/types.test.ts` lose retired table/trigger/type/count references; `tools/world-index/tests/arc-trace-indexing.test.ts` is deleted.
**Deps**: archive/tickets/SPEC29LEGTOOVOC-002.md

## Problem

At intake, the world-index layer parsed, indexed, and exposed `arc_trace_node` records (id-pattern `^ARCTRACE-[0-9]+$`) through a substantial registry seam: a dedicated SQLite migration (`005_arc_trace_nodes.sql`) created one main table + 3 edge tables + 3 indexes + FTS5 virtual table + 3 triggers; the indexer in `index/nodes.ts` carried INSERT/DELETE statements and a special-case branch; the parser in `parse/atomic.ts` registered the `arc-traces/` directory and a parse-logic branch for `arc_trace_node`-typed records; `render.ts` filtered them by node-type; `cli.ts` exposed a `--arc-traces` CLI flag. The schema sanity test asserted the tables/triggers existed; the dedicated `arc-trace-indexing.test.ts` exercised the entire indexing pipeline.

Zero `arc_trace_node` records existed anywhere in the live repository at intake (verified at codebase validation 2026-05-15: `grep -rnE "ARCTRACE-[0-9]+" tools/ docs/ worlds/ briefs/` returned hits only in generated `dist/` test artifacts). The world-mcp surface no longer exposes the records as of `archive/tickets/SPEC29LEGTOOVOC-002.md`.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: world-index source/test files carry arc_trace_node references across the storage/parser/public-type seam: `schema/types.ts:42` (node_type), `:85-87` (3 edge tables `arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`), `ArcTraceNodeRow` (`arc_trace_id` field); `schema/migrations/005_arc_trace_nodes.sql` (entire file: 1 main table + 3 edge tables + 3 indexes + FTS5 + 3 triggers); `index/nodes.ts:84-208` (DELETE statements at L84-93, INSERT statements at L128-168, special-case branch at L183); `commands/shared.ts` calls `insertArcTraceRows`; `parse/atomic.ts:84` (parser registration `["arc-traces", recordSpec("arc_trace_node", "id", "^ARCTRACE-[0-9]+$")]`), `:89` (`ARCTRACE` in the story-ref regex), `:604-608` (parse logic emitting `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` story refs); `enumerate.ts:57` whitelists `arc-traces`; `commands/render.ts:35` (render filter `node_type != 'arc_trace_node'`); `cli.ts:39` (`--arc-traces` CLI flag help-text mention); `src/public/types.ts` re-exports `ArcTraceNodeRow`; `tests/schema.test.ts`, `tests/public-types.test.ts`, and `tests/types.test.ts` assert retired schema/type/count surfaces; `tests/arc-trace-indexing.test.ts` (entire file — writes ARCTRACE-0001 records dynamically via a local `writeArcTrace` helper, so no fixture file needs deletion).
2. **Spec/docs reality**: SPEC-29 §2 names only the MCP-side `list-records.ts` for `arc_trace_record`; the world-index layer is not enumerated. Issue 2 from /spec-to-tickets Step 2 (2026-05-15) surfaced the full world-index surface and dispositioned **expand-scope-in-place** — the spec's intent (mechanical cleanup of legacy ARC vocabulary, no behavior change to live flows) is preserved; the codebase requires the world-index layer to be retired in lockstep, otherwise the indexer continues to emit dead `arc_trace_node` rows into `world.db` on every rebuild.
3. **Shared boundary under audit**: world-index ↔ SQLite schema (forward migration chain); world-index ↔ world-mcp (the latter no longer reads `arc_trace_record` after `archive/tickets/SPEC29LEGTOOVOC-002.md`, which is why this ticket carries that archived ticket in `Deps`). Migration framework convention: deleting `005_arc_trace_nodes.sql` removes it from the forward chain — new `world.db` files built after this ticket will not contain the `arc_trace_node` tables; existing `world.db` files (`worlds/animalia/_index/world.db`, `worlds/erotica-world/_index/world.db`) still contain the tables but are unreachable through MCP. No data migration is needed (zero ARCTRACE records exist anywhere live).
4. **Schema retcon (per Rule 6 — No Silent Retcons)**: the world-index forward migration chain loses migration 005. The migration chain is structural; deletion is treated as schema replacement in pre-production worldloom. Retcon attribution: SPEC-22 ARC system retired at the skill layer in the 2026-05-13 greenfield story-skills rebuild (`archive/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`); this ticket completes the tools-layer migration that did not land in lockstep, retiring the index-time storage for a record class no producer or consumer references.
5. **Removal blast radius**: pipeline-wide grep for `arc_trace_node` / `arc_trace_id` / `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` / `ARCTRACE-` / `recordSpec("arc_trace_node"` / `arc-traces` confirms the same-seam world-index cleanup also includes `commands/shared.ts`, `enumerate.ts`, and the `ARCTRACE` story-ref regex in `parse/atomic.ts`. World-mcp's `arc_trace_record` mapping is gone after `archive/tickets/SPEC29LEGTOOVOC-002.md`; patch-engine's `arc_trace_*` field-path branches are gone after `archive/tickets/SPEC29LEGTOOVOC-003.md`; docs references were completed by `archive/tickets/SPEC29LEGTOOVOC-005.md`.
6. **Baseline package proof**: pre-edit `npm test` from `tools/world-index` passed (83 tests), including the legacy ARC_TRACE indexing test. Broad proof after source edits must clean/rebuild `dist/` first so the deleted compiled test cannot remain in the package test lane.

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the world-index registry seam (schema/migration/indexer/parser/CLI + tests) in one diff produces a clean post-state where no source builds or indexes `arc_trace_node` rows. The alternative — leaving the indexer in place as "dead code that emits unread rows" — costs maintenance attention without benefit (per spec §"Key design decisions" point 4: "a read surface for records that cannot exist is dead code; retaining it costs maintenance attention without benefit"). The same logic applies to the index-side write surface.
2. **No backwards-compatibility shims**: migration 005 is deleted from the forward chain; no replacement migration drops the tables (existing `world.db` files retain them as dead state — they are unreachable through MCP after `archive/tickets/SPEC29LEGTOOVOC-002.md` and structurally absent in any new `world.db` built after this ticket). No `// @deprecated`-tagged parser branch is retained.

## Verification Layers

1. **Invariant: zero `arc_trace_node` / `arc_trace_id` / `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` / `arc-traces` / `ARCTRACE` references remain in world-index src** → `rg -n "arc_trace_node|arc_trace_id|arc_trace_describes_page|arc_trace_realizes_arc|arc_trace_observes_action_by|arc-traces|ARCTRACE" tools/world-index/src/` returns no hits.
2. **Invariant: migration 005 is gone from the forward chain** → `test -e tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` returns false; `ls tools/world-index/src/schema/migrations/` returns exactly 4 SQL files (`001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`).
3. **Invariant: world-index test lane passes without ARC_TRACE indexing coverage** → `cd tools/world-index && npm test`. The `schema.test.ts` no longer references `arc_trace_node` tables/triggers; `arc-trace-indexing.test.ts` is gone.
4. **Invariant: a fresh world build produces a `world.db` without `arc_trace_node` tables** → manual verification at implementation time: run `cd tools/world-index && npm run build && node dist/src/cli.js build <fixture-world-slug>` on a test fixture; `sqlite3 worlds/<slug>/_index/world.db ".tables"` returns the schema-defined tables without `arc_trace_node` or its edges.

## Landed Changes

### 1. Drop arc_trace_node from world-index schema types

`tools/world-index/src/schema/types.ts`:
- Removed `"arc_trace_node"` from the node-type list.
- Removed the three edge-table entries (`"arc_trace_describes_page"`, `"arc_trace_realizes_arc"`, `"arc_trace_observes_action_by"`).
- Removed `ArcTraceNodeRow` and the `arc_trace_id` typed row field it carried.

`tools/world-index/src/public/types.ts` and `tools/world-index/tests/public-types.test.ts`:
- Removed the retired `ArcTraceNodeRow` public type export and public-type assertion.

`tools/world-index/tests/types.test.ts`:
- Updated registry counts to 42 node types, 11 story edge types, and 26 total edge types.

### 2. Delete migration 005 from the forward chain

`tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`:
- Deleted the entire file. The migration runner reads the migrations directory; with the file gone, new `world.db` builds proceed with migrations 001-004 only. No replacement migration was added — existing `world.db` files retain the now-unreferenced `arc_trace_node` tables until rebuilt.

`tools/world-index/src/schema/version.ts`:
- Set `CURRENT_INDEX_VERSION` to `4` so the version matches the surviving four-file forward migration chain.

### 3. Drop arc_trace_node indexer logic

`tools/world-index/src/index/nodes.ts`:
- Removed the DELETE statements for `arc_trace_observes_action_by`, `arc_trace_realizes_arc`, `arc_trace_describes_page`, and `arc_trace_node`.
- Removed the `INSERT INTO arc_trace_node` block and associated edge-table inserts.
- Removed the special-case parser helpers that extracted `arc_trace_id`, actor stents, and text fields from parsed record bodies.

### 4. Drop arc_trace_node parser registration

`tools/world-index/src/parse/atomic.ts`:
- Removed the parser registration for `arc-traces`.
- Removed `ARCTRACE` from `STORY_REF_REGEX`; the parser no longer treats ARC_TRACE IDs as current story-record references.
- Removed the parse-logic branch that emitted `arc_trace_describes_page`, `arc_trace_realizes_arc`, and `arc_trace_observes_action_by` story refs.

### 5. Drop arc_trace_node insert dispatch and enumeration whitelist

`tools/world-index/src/commands/shared.ts`:
- Removed the `insertArcTraceRows` import and invocation from `insertParsedFile`; parsed story nodes are stored only in the generic `nodes` / `edges` tables.

`tools/world-index/src/enumerate.ts`:
- Removed `arc-traces` from `STORY_SOURCE_DIRECTORIES`, so `_source/arc-traces/*.yaml` is no longer an indexable story source directory.

### 6. Drop arc_trace_node render filter and CLI flag

`tools/world-index/src/commands/render.ts`:
- Removed the render filter (`AND (? = 1 OR node_type != 'arc_trace_node')`) and its bound parameter.

`tools/world-index/src/cli.ts`:
- Removed the `--arc-traces` CLI help-text mention, option parser entry, and render-call option forwarding. Surrounding `world-index render` CLI structure stayed intact.

### 7. Drop arc_trace_node references from the schema sanity test

`tools/world-index/tests/schema.test.ts`:
- Removed `arc_trace_node`, its FTS tables, indexes, and triggers from schema expectations.
- Removed `arc_trace_node` from the version-upgrade table-existence sweep. Surrounding non-ARC_TRACE table/trigger assertions stayed.

### 8. Delete the arc-trace-indexing test file

`tools/world-index/tests/arc-trace-indexing.test.ts`:
- Deleted the entire file. The indexer is gone (Change 3); the test that exercised it has no surface to exercise. The dynamically-written ARCTRACE-0001 records were created and consumed only inside this test, so no fixture cleanup was needed elsewhere.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` (delete)
- `tools/world-index/src/index/nodes.ts` (modify)
- `tools/world-index/src/commands/shared.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/src/commands/render.ts` (modify)
- `tools/world-index/src/cli.ts` (modify)
- `tools/world-index/src/public/types.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/public-types.test.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/arc-trace-indexing.test.ts` (delete)

## Out of Scope

- World-mcp surface (`list-records.ts`, `_shared.ts`, all world-mcp tests, `spec22-capstone.test.ts`) — completed in `archive/tickets/SPEC29LEGTOOVOC-002.md` (prerequisite per Deps).
- Validators + patch-engine + hooks legacy-rejection surfaces — completed in `archive/tickets/SPEC29LEGTOOVOC-003.md`.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Data migration of existing `world.db` files (`worlds/animalia`, `worlds/erotica-world`) — no migration is needed; zero ARCTRACE records exist (verified at codebase validation 2026-05-15). The `arc_trace_node` tables in existing `world.db` files become dead state, unreachable through MCP after `archive/tickets/SPEC29LEGTOOVOC-002.md`, and structurally absent in any new `world.db` built after this ticket.
- Replacement migration that drops the now-orphaned tables in existing `world.db` files — explicitly out of scope per SPEC-29 §"Out of Scope: Migration of existing data"; rebuilds suffice for cleanup, since worldloom is single-user pre-production.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` passes; the schema sanity test asserts only the surviving tables/triggers; the arc-trace-indexing test is gone.
2. `cd tools/world-index && npm run build` succeeds (TypeScript compile passes after `schema/types.ts` + `index/nodes.ts` + `parse/atomic.ts` + `render.ts` + `cli.ts` edits).
3. `rg -n "arc_trace_node|arc_trace_id|arc_trace_describes_page|arc_trace_realizes_arc|arc_trace_observes_action_by|arc-traces|ARCTRACE" tools/world-index/src/` returns no hits.
4. `test -e tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` returns false.
5. `ls tools/world-index/src/schema/migrations/` returns exactly 4 SQL files.

### Invariants

1. The world-index forward migration chain is 4 migrations (`001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`); no migration mentions `arc_trace_*`.
2. New `world.db` builds produce schemas without `arc_trace_node` + edge tables + FTS + triggers.
3. The world-index parser/enumerator does not register the `arc-traces/` subdirectory; the indexer does not emit any `arc_trace_node` rows.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — modify per Change 6; surrounding non-ARC_TRACE table/trigger assertions stay.
2. `tools/world-index/tests/public-types.test.ts` — remove the retired `ArcTraceNodeRow` public-type assertion/export coverage.
3. `tools/world-index/tests/types.test.ts` — update node/edge count assertions after removing one node type and three story edge types.
4. `tools/world-index/tests/arc-trace-indexing.test.ts` — delete; the indexer it exercised is gone.

### Commands

1. `cd tools/world-index && npm test`
2. `cd tools/world-index && npm run build`
3. `cd tools/world-index && npm run clean` before the post-edit broad package test, because the test lane consumes compiled `dist/tests/**/*.test.js` and this ticket deletes a source test.
4. Manual verification: package-local temp-world probe with `node dist/src/cli.js build probe-world` followed by a `better-sqlite3` `sqlite_master` query for `%arc_trace%` to confirm the new `world.db` schema is `arc_trace_*`-free.

## Outcome

Completed. World-index no longer recognizes, parses, enumerates, stores, indexes, renders, exports, or tests `arc_trace_node` / `ARCTRACE`. The forward migration chain now has four migrations, `CURRENT_INDEX_VERSION` is `4`, the dedicated arc-trace migration and indexing test are deleted, and SPEC-29 has a dated implementation note recording that this world-index slice landed while D5 docs remain active.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-index` passed with 83 tests, including the legacy ARC_TRACE indexing test.
2. `npm run clean` from `tools/world-index` — passed; removed stale compiled output before the post-edit broad package test.
3. `npm run build` from `tools/world-index` — passed after source edits.
4. First post-edit `npm test` from `tools/world-index` — failed on `tests/types.test.ts` stale count expectations (`42 !== 43`), classified as same-seam proof fallout and fixed by updating node/edge counts.
5. Final `npm run build` from `tools/world-index` — passed.
6. Final `npm test` from `tools/world-index` — passed; 82 tests passed after deleting the ARC_TRACE test.
7. `rg -n "arc_trace_node|arc_trace_id|arc_trace_describes_page|arc_trace_realizes_arc|arc_trace_observes_action_by|arc-traces|ARCTRACE" tools/world-index/src tools/world-index/tests --glob '!dist/**'` — no hits.
8. Temp-world fresh-build probe from a temp world root followed by `sqlite_master` query for `%arc_trace%` — passed; query returned `[]`.

## Deviations

1. Scope expanded within the same world-index package seam to include `commands/shared.ts`, `enumerate.ts`, `src/public/types.ts`, `src/schema/version.ts`, `tests/public-types.test.ts`, and `tests/types.test.ts`. These were required same-seam fallout because the parser, public type surface, schema version, and registry-count proof otherwise still referenced the retired record class.
2. Documentation references in `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` remained intentionally out of scope for this ticket and were completed by `archive/tickets/SPEC29LEGTOOVOC-005.md`.
3. The temp-world probe was first attempted from the repo root and correctly failed with `Unknown world slug 'probe-world'`; it was rerun from the temp root and passed.
4. Verification uses `rg` and a `better-sqlite3` schema query instead of the drafted `grep` / `sqlite3` shell command. The proof invariant is unchanged, and this avoids depending on an external `sqlite3` binary.
5. Ignored package artifact `tools/world-index/dist/` was cleaned and rebuilt; pre-existing ignored `tools/world-index/node_modules/` was left in place.
