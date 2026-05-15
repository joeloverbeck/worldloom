# SPEC29LEGTOOVOC-004: Retire `arc_trace_record` from world-index schema/parser/indexer/migration/CLI layer

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` drops the `arc_trace_node` node-type + 3 edge-table entries + `arc_trace_id` field type; `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` is deleted from the forward migration chain; `tools/world-index/src/index/nodes.ts` drops the arc_trace_node DELETE/INSERT statements + special-case parse branch; `tools/world-index/src/parse/atomic.ts` drops the parser registration + parse logic; `tools/world-index/src/commands/render.ts` drops the render filter; `tools/world-index/src/cli.ts` drops the `--arc-traces` CLI flag; `tools/world-index/tests/schema.test.ts` loses references to retired tables/triggers; `tools/world-index/tests/arc-trace-indexing.test.ts` is deleted.
**Deps**: archive/tickets/SPEC29LEGTOOVOC-002.md

## Problem

The world-index layer parses, indexes, and exposes `arc_trace_node` records (id-pattern `^ARCTRACE-[0-9]+$`) through a substantial registry seam: a dedicated SQLite migration (`005_arc_trace_nodes.sql`) creates one main table + 3 edge tables + 3 indexes + FTS5 virtual table + 3 triggers; the indexer in `index/nodes.ts` carries ~125 lines of INSERT/DELETE statements and a special-case branch; the parser in `parse/atomic.ts` registers the `arc-traces/` directory and a parse-logic branch for `arc_trace_node`-typed records; `render.ts` filters them by node-type; `cli.ts` exposes a `--arc-traces` CLI flag. The schema sanity test asserts the tables/triggers exist; the dedicated `arc-trace-indexing.test.ts` exercises the entire indexing pipeline.

Zero `arc_trace_node` records exist anywhere in the live repository (verified at codebase validation 2026-05-15: `grep -rnE "ARCTRACE-[0-9]+" tools/ docs/ worlds/ briefs/` returns hits only in `dist/` test artifacts, which are rebuilt by `npm run build`). The world-mcp surface no longer exposes the records as of `archive/tickets/SPEC29LEGTOOVOC-002.md`.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: 8 world-index source/test files carry arc_trace_node references: `schema/types.ts:42` (node_type), `:85-87` (3 edge tables `arc_trace_describes_page`, `arc_trace_realizes_arc`, `arc_trace_observes_action_by`), `:382` (`arc_trace_id` field); `schema/migrations/005_arc_trace_nodes.sql` (entire file: 1 main table + 3 edge tables + 3 indexes + FTS5 + 3 triggers); `index/nodes.ts:84-208` (DELETE statements at L84-93, INSERT statements at L128-168, special-case branch at L183); `parse/atomic.ts:84` (parser registration `["arc-traces", recordSpec("arc_trace_node", "id", "^ARCTRACE-[0-9]+$")]`), `:604-608` (parse logic emitting `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` story refs); `commands/render.ts:35` (render filter `node_type != 'arc_trace_node'`); `cli.ts:39` (`--arc-traces` CLI flag help-text mention); `tests/schema.test.ts:83-247` (table/trigger references); `tests/arc-trace-indexing.test.ts` (entire file — writes ARCTRACE-0001 records dynamically via a local `writeArcTrace` helper, so no fixture file needs deletion).
2. **Spec/docs reality**: SPEC-29 §2 names only the MCP-side `list-records.ts` for `arc_trace_record`; the world-index layer is not enumerated. Issue 2 from /spec-to-tickets Step 2 (2026-05-15) surfaced the full world-index surface and dispositioned **expand-scope-in-place** — the spec's intent (mechanical cleanup of legacy ARC vocabulary, no behavior change to live flows) is preserved; the codebase requires the world-index layer to be retired in lockstep, otherwise the indexer continues to emit dead `arc_trace_node` rows into `world.db` on every rebuild.
3. **Shared boundary under audit**: world-index ↔ SQLite schema (forward migration chain); world-index ↔ world-mcp (the latter no longer reads `arc_trace_record` after `archive/tickets/SPEC29LEGTOOVOC-002.md`, which is why this ticket carries that archived ticket in `Deps`). Migration framework convention: deleting `005_arc_trace_nodes.sql` removes it from the forward chain — new `world.db` files built after this ticket will not contain the `arc_trace_node` tables; existing `world.db` files (`worlds/animalia/_index/world.db`, `worlds/erotica-world/_index/world.db`) still contain the tables but are unreachable through MCP. No data migration is needed (zero ARCTRACE records exist anywhere live).
4. **Schema retcon (per Rule 6 — No Silent Retcons)**: the world-index forward migration chain loses migration 005. The migration chain is structural; deletion is treated as schema replacement in pre-production worldloom. Retcon attribution: SPEC-22 ARC system retired at the skill layer in the 2026-05-13 greenfield story-skills rebuild (`archive/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`); this ticket completes the tools-layer migration that did not land in lockstep, retiring the index-time storage for a record class no producer or consumer references.
5. **Removal blast radius**: pipeline-wide grep for `arc_trace_node` / `arc_trace_id` / `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` / `ARCTRACE-` / `recordSpec("arc_trace_node"` / `arc-traces` confirms 8 files inside this ticket's scope. World-mcp's `arc_trace_record` mapping is gone after `archive/tickets/SPEC29LEGTOOVOC-002.md`; patch-engine's `arc_trace_*` field-path branches are gone after SPEC29LEGTOOVOC-003.

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the world-index registry seam (schema/migration/indexer/parser/CLI + tests) in one diff produces a clean post-state where no source builds or indexes `arc_trace_node` rows. The alternative — leaving the indexer in place as "dead code that emits unread rows" — costs maintenance attention without benefit (per spec §"Key design decisions" point 4: "a read surface for records that cannot exist is dead code; retaining it costs maintenance attention without benefit"). The same logic applies to the index-side write surface.
2. **No backwards-compatibility shims**: migration 005 is deleted from the forward chain; no replacement migration drops the tables (existing `world.db` files retain them as dead state — they are unreachable through MCP after `archive/tickets/SPEC29LEGTOOVOC-002.md` and structurally absent in any new `world.db` built after this ticket). No `// @deprecated`-tagged parser branch is retained.

## Verification Layers

1. **Invariant: zero `arc_trace_node` / `arc_trace_id` / `arc_trace_describes_page` / `arc_trace_realizes_arc` / `arc_trace_observes_action_by` / `arc-traces` references remain in world-index src** → `grep -rnE "arc_trace_node|arc_trace_id|arc_trace_describes_page|arc_trace_realizes_arc|arc_trace_observes_action_by|arc-traces" tools/world-index/src/` returns no hits.
2. **Invariant: migration 005 is gone from the forward chain** → `test -e tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` returns false; `ls tools/world-index/src/schema/migrations/` returns exactly 4 SQL files (`001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`).
3. **Invariant: world-index test lane passes without ARC_TRACE indexing coverage** → `cd tools/world-index && npm test`. The `schema.test.ts` no longer references `arc_trace_node` tables/triggers; `arc-trace-indexing.test.ts` is gone.
4. **Invariant: a fresh world build produces a `world.db` without `arc_trace_node` tables** → manual verification at implementation time: run `cd tools/world-index && npm run build && node dist/src/cli.js build <fixture-world-slug>` on a test fixture; `sqlite3 worlds/<slug>/_index/world.db ".tables"` returns the schema-defined tables without `arc_trace_node` or its edges.

## What to Change

### 1. Drop arc_trace_node from world-index schema types

`tools/world-index/src/schema/types.ts`:
- Remove `"arc_trace_node"` from the node-type list at L42.
- Remove the three edge-table entries at L85-87 (`"arc_trace_describes_page"`, `"arc_trace_realizes_arc"`, `"arc_trace_observes_action_by"`).
- Remove the `arc_trace_id: string` field (or the typed interface field carrying it) at L382. Confirm at implementation time which TypeScript surface owns the field — typically the row-type interface for the retired tables; the surrounding row-type for the retired tables should be removed alongside.

### 2. Delete migration 005 from the forward chain

`tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`:
- Delete the entire file. The migration runner reads the migrations directory; with the file gone, new `world.db` builds proceed with migrations 001-004 only. No replacement migration is added — existing `world.db` files retain the (now-unreferenced) `arc_trace_node` tables until rebuilt.

### 3. Drop arc_trace_node indexer logic

`tools/world-index/src/index/nodes.ts`:
- Remove the DELETE statements at L84-93 (`arc_trace_observes_action_by`, `arc_trace_realizes_arc`, `arc_trace_describes_page`, `arc_trace_node`).
- Remove the INSERT statements at L128-168 (the entire `INSERT INTO arc_trace_node` block + `INSERT OR IGNORE INTO arc_trace_describes_page` + `INSERT OR IGNORE INTO arc_trace_realizes_arc` + `INSERT OR IGNORE INTO arc_trace_observes_action_by`).
- Remove the special-case branch at L183 (`if (node.node_type !== "arc_trace_node" || !node.story_slug)`) and its surrounding parse-arc-trace handler (typically a function that extracts `arc_trace_id` + `actorStentId` + edges from the parsed record body — confirm function boundary at implementation time).

### 4. Drop arc_trace_node parser registration

`tools/world-index/src/parse/atomic.ts`:
- Remove the parser registration at L84 (`["arc-traces", recordSpec("arc_trace_node", "id", "^ARCTRACE-[0-9]+$")]`).
- Remove the parse-logic branch at L604-608 (`if (node.node_type === "arc_trace_node") { pushStoryRef("arc_trace_describes_page", ...); pushStoryRef("arc_trace_realizes_arc", ...); pushStoryRef("arc_trace_observes_action_by", ...); }`).

### 5. Drop arc_trace_node render filter and CLI flag

`tools/world-index/src/commands/render.ts`:
- Remove the render filter at L35 (`AND (? = 1 OR node_type != 'arc_trace_node')`). Adjust the surrounding SQL query so the parameter list / placeholder count still matches the bound parameters — if the bound parameter for the arc-traces opt-in (`? = 1`) is also no longer needed, remove it from the parameter array passed to `.prepare(...).all(...)`.

`tools/world-index/src/cli.ts`:
- Remove the `--arc-traces` CLI flag help-text mention at L39 (the help string mentioning "add --arc-traces to include ARC_TRACE records in story renders") and the flag parsing if present in adjacent lines — confirm flag-parser entry at implementation time (likely a `commander`-style or hand-rolled argv loop nearby). Surrounding `world-index render` CLI structure stays; the flag was opt-in coverage for a record class that no longer exists.

### 6. Drop arc_trace_node references from the schema sanity test

`tools/world-index/tests/schema.test.ts`:
- Remove `arc_trace_node` from the table-name assertion at L83, and the FTS table assertions at L84-88 (`arc_trace_node_fts`, `arc_trace_node_fts_config`, `arc_trace_node_fts_data`, `arc_trace_node_fts_docsize`, `arc_trace_node_fts_idx`).
- Remove the trigger-name assertions at L150-152 (`arc_trace_node_ad`, `arc_trace_node_ai`, `arc_trace_node_au`).
- Remove `arc_trace_node` from the table-existence sweep at L240 (the `IN (...)` clause) and from any IN-clause membership at L247 if present. Surrounding non-ARC_TRACE table/trigger assertions stay.

### 7. Delete the arc-trace-indexing test file

`tools/world-index/tests/arc-trace-indexing.test.ts`:
- Delete the entire file. The indexer is gone (Change 3); the test that exercised it has no surface to exercise. The dynamically-written ARCTRACE-0001 records (via the local `writeArcTrace` helper) are created and consumed only inside this test, so no fixture cleanup is needed elsewhere.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` (delete)
- `tools/world-index/src/index/nodes.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/commands/render.ts` (modify)
- `tools/world-index/src/cli.ts` (modify)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/arc-trace-indexing.test.ts` (delete)

## Out of Scope

- World-mcp surface (`list-records.ts`, `_shared.ts`, all world-mcp tests, `spec22-capstone.test.ts`) — completed in `archive/tickets/SPEC29LEGTOOVOC-002.md` (prerequisite per Deps).
- Validators + patch-engine + hooks legacy-rejection surfaces — routed to SPEC29LEGTOOVOC-003.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Data migration of existing `world.db` files (`worlds/animalia`, `worlds/erotica-world`) — no migration is needed; zero ARCTRACE records exist (verified at codebase validation 2026-05-15). The `arc_trace_node` tables in existing `world.db` files become dead state, unreachable through MCP after `archive/tickets/SPEC29LEGTOOVOC-002.md`, and structurally absent in any new `world.db` built after this ticket.
- Replacement migration that drops the now-orphaned tables in existing `world.db` files — explicitly out of scope per SPEC-29 §"Out of Scope: Migration of existing data"; rebuilds suffice for cleanup, since worldloom is single-user pre-production.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` passes; the schema sanity test asserts only the surviving tables/triggers; the arc-trace-indexing test is gone.
2. `cd tools/world-index && npm run build` succeeds (TypeScript compile passes after `schema/types.ts` + `index/nodes.ts` + `parse/atomic.ts` + `render.ts` + `cli.ts` edits).
3. `grep -rnE "arc_trace_node|arc_trace_id|arc_trace_describes_page|arc_trace_realizes_arc|arc_trace_observes_action_by|arc-traces" tools/world-index/src/` returns no hits.
4. `test -e tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql` returns false.
5. `ls tools/world-index/src/schema/migrations/` returns exactly 4 SQL files.

### Invariants

1. The world-index forward migration chain is 4 migrations (`001_initial.sql`, `002_scoped_references.sql`, `003_approval_tokens_consumed.sql`, `004_story_bundle_scope.sql`); no migration mentions `arc_trace_*`.
2. New `world.db` builds produce schemas without `arc_trace_node` + edge tables + FTS + triggers.
3. The world-index parser does not register the `arc-traces/` subdirectory; the indexer does not emit any `arc_trace_node` rows.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/schema.test.ts` — modify per Change 6; surrounding non-ARC_TRACE table/trigger assertions stay.
2. `tools/world-index/tests/arc-trace-indexing.test.ts` — delete; the indexer it exercised is gone.

### Commands

1. `cd tools/world-index && npm test`
2. `cd tools/world-index && npm run build`
3. Manual verification: `cd tools/world-index && node dist/src/cli.js build <test-fixture-world-slug>` against `tools/world-index/tests/fixtures/fixture-world/` followed by `sqlite3 worlds/<slug>/_index/world.db ".tables"` to confirm the new `world.db` schema is `arc_trace_*`-free. This is the narrower verification boundary because the standard `npm test` lane does not exercise a from-scratch build against a real fixture world; the schema sanity test asserts post-migration table membership but not real-world rebuild output.
