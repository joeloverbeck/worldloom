# SPEC81INDSTOCAN-001: World-index SLT projection columns and edges

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index/` parse layer + SQLite schema. No impact on existing edge types or node types; additions are additive.
**Deps**: None

## Problem

`commitment-block-authoring` Phase 1 and `branching-story-turn-cycle` Phase 2 currently load the entire SLT pool via `list_records(record_type='storylet_record', include_full_body=true)` — a linear scan over typed rows with per-row YAML parse + in-process filter at `tools/world-mcp/src/tools/list-records.ts` (the body of `listRecordsImpl`, approximately lines 409-517). At ~25 SLTs the scan is sub-second; at 100-200+ SLTs the parse cost dominates and the story-bundle context-packet's `MAX_VISIBLE_STORYLETS = 50` cap (`tools/world-mcp/src/context-packet/story-bundle-context.ts:48`) starts losing LLM-facing visibility.

This ticket lands the foundational layer that unlocks indexed predicate-shape retrieval: project the load-bearing filter fields of each SLT into indexed columns at world-index build time, and emit four new coarse-grained edges that pre-filter candidates by predicate kind, predicate referenced class, action family, and compatible turn driver. The downstream MCP tool (SPEC81INDSTOCAN-002) and its consumers (003-005) build on this surface.

## Assumption Reassessment (2026-05-24)

1. `tools/world-index/src/schema/types.ts` defines `STORY_EDGE_TYPES` as the closed registry of story-bundle edge type literals; appending 4 new entries is the canonical additive registration site. `tools/world-index/src/parse/atomic.ts` defines `edgesForStorylet` as the parser emission site for existing SLT edges (`storylet_predicate_ref`, `storylet_effect_ref`, `storylet_exit_likely_effect_ref`); extending it is the canonical place to emit the new edge kinds and project the new SLT fields.
2. SPEC-81 §3.1 (projection fields table: 8 scalar/single-value fields in `slt_projections`, 4 new coarse edge families, and source-record ids resolved through existing `storylet_predicate_ref`), §3.2 (4 new edge types), §3.3 (build invalidation via existing per-node anchor-hash discipline — no new invalidation surface).
3. Cross-skill boundary under audit: parser (`tools/world-index/src/parse/atomic.ts`) ↔ schema (`tools/world-index/src/schema/types.ts` + `migrations/`) ↔ downstream MCP retrieval surface (`tools/world-mcp/`, in SPEC81INDSTOCAN-002). The parser produces what schema defines; downstream MCP retrieval reads what the parser produces. Edge-type and projection-column additions stay strictly within `tools/world-index/`'s public API surface; no cross-package coupling changes.
4. FOUNDATIONS §Tooling Recommendation ("LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern") motivates indexed projection — this ticket lands the index half of the retrieval pattern that SPEC81INDSTOCAN-002 then exposes through MCP.
5. HARD-GATE: world-index build path. The SQL migration adds new columns / typed edges that the build process recomputes per affected SLT row; no canon-write ordering change; no Mystery Reserve firewall weakening (the build is read-only over `_source/<class>/*.yaml` records).
6. Extends existing STORY_EDGE_TYPES schema additively — append-only; existing consumers of `STORY_EDGE_TYPES` (downstream MCP retrieval, `get_neighbors`, edge-projection in context-packet assembly) continue to handle the registry as a closed enum with new entries.

## Architecture Check

1. Indexed projection columns + typed edges at world-index build time give the MCP tool a symbolic pre-filter that runs against parsed YAML once (at build time) rather than once per call. This is cleaner than an ad-hoc cache layer because the projection lives in the same SQLite store as the rest of the world index, follows the same per-node anchor-hash invalidation, and benefits from FTS5 if needed in the future. Alternative: keep the linear-scan-with-full-YAML-parse model and add an LRU cache around `list_records` — rejected because it does not address the per-row YAML parse cost and does not preserve the FOUNDATIONS §Tooling Recommendation pattern (LLMs would still receive truncated views above the 50-cap).
2. No backwards-compatibility aliasing/shims introduced. The new edge types are additive; the new columns are derived; existing `list_records(record_type='storylet_record', include_full_body=true)` continues to work unchanged.

## Verification Layers

1. New edge types registered in `STORY_EDGE_TYPES` → codebase grep-proof (`grep -n 'storylet_compatible_driver\|storylet_predicate_pred\|storylet_predicate_class\|storylet_action_family' tools/world-index/src/schema/types.ts` returns 4 hits).
2. SQL migration applies cleanly to a fresh fixture-world database → schema validation (build a fresh `_index/world.db` against a fixture world; confirm migration 007 ran and projection columns/tables exist).
3. Parser projects every load-bearing SLT field exactly as the source YAML declares → SPEC §9.1 roundtrip check (re-derive projection columns from full bodies at build time and assert equality).
4. Single-layer ticket — additional layer mapping is not applicable; downstream MCP retrieval layer is owned by SPEC81INDSTOCAN-002.

## What to Change

### 1. Extend STORY_EDGE_TYPES with 4 new edge types

In `tools/world-index/src/schema/types.ts`, append to the `STORY_EDGE_TYPES` const (currently ends at `event_selected_storylet`):

- `storylet_compatible_driver` — SLT → driver-kind enum value (from `SLT.grounding.compatible_turn_drivers[]`; SPEC-77 surface)
- `storylet_predicate_pred` — SLT → `pred` enum value (from `PRED_TYPES` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`; sourced from `preconditions.hard[].pred` + `preconditions.soft[].pred`)
- `storylet_predicate_class` — SLT → record-class enum value (sourced from predicate `record_class` / `holder_role` / `kind` arguments)
- `storylet_action_family` — SLT → action-family enum value (sourced from `exit_options[].action_family`)

### 2. New SQL migration: 007_slt_projection_columns.sql

Create `tools/world-index/src/schema/migrations/007_slt_projection_columns.sql` adding a new `slt_projections` derived table. Columns to add (8 scalar/single-value projection fields, plus `node_id`, `world_slug`, `story_slug`, and `candidate_projection_hash`):

- `slt_scope_visibility` TEXT (enum: `global_author_pool | branch_prefix_scoped | branch_scoped`)
- `slt_scope_branch_id` TEXT NULL
- `slt_scope_branch_path_prefix` TEXT NULL (JSON-serialized array of PG IDs)
- `slt_provenance_origin` TEXT (enum)
- `slt_move_family` TEXT (enum)
- `slt_saliency_urgency` TEXT (enum: `low | medium | high`)
- `slt_saliency_cooldown_pages` INTEGER NULL
- `slt_mystery_policy_allowed_authority` TEXT (enum: `apparent | branch_local_counterfactual | canon_candidate | none`)

The remaining fields named in §3.1 (`slt_exit_action_families`, `slt_grounding_compatible_turn_drivers`, `slt_predicate_pred`, `slt_predicate_referenced_class`) are 0-N cardinality and are projected as edges via §3.2's new edge types, NOT as columns. `slt_source_record_id` is resolved through the existing `storylet_predicate_ref` literal-record edge surface rather than a new fifth edge type, because SPEC-81 §3.2 defines only four new edges.

### 3. Extend `edgesForStorylet` in `tools/world-index/src/parse/atomic.ts`

After the existing exit-option likely_effects loop (around line 837), add edge emission for the 4 new types:

- Iterate `record.grounding.compatible_turn_drivers[]` (closed enum, 1-8 values per the SLT schema) and emit `storylet_compatible_driver` edges (each driver-kind enum value as a target).
- Iterate `record.preconditions.hard[].pred` + `record.preconditions.soft[].pred` (predicate-object arrays per `tools/validators/src/schemas/story-storylet.schema.json` `$defs/predicateObject`) and emit `storylet_predicate_pred` edges per distinct `pred` value.
- Iterate predicate arguments (`record_class` / `holder_role` / `kind`) across the same predicate arrays and emit `storylet_predicate_class` edges per distinct referenced class.
- Iterate `record.exit_options[].action_family` and emit `storylet_action_family` edges per distinct action-family enum value.

### 4. Extend the parser's node-row population to project the 8 scalar/single-value fields

In the same SLT parsing pass (sibling to `edgesForStorylet`), extract the scalar projection columns from the parsed SLT record body and write them to the corresponding columns in the migration-defined table. This is the read-side complement to the migration; both must land together.

### 5. New test: storylet-projection-roundtrip.test.ts

Create `tools/world-index/tests/storylet-projection-roundtrip.test.ts` covering SPEC §9.1 (Index-build correctness): after `world-index build` against a fixture bundle with ≥10 SLTs of varying scope/driver/predicate shapes, the projection columns and new edges exactly match the source SLT fields. Verification mechanism: re-derive each projection column from the parsed SLT full body at test time and assert equality against the persisted column; assert that the count of emitted edges per kind matches the count of source-field values (deduplicated for closed-enum classes).

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/schema/migrations/007_slt_projection_columns.sql` (new)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/index/nodes.ts` (modify)
- `tools/world-index/src/schema/version.ts` (modify)
- `tools/world-index/tests/storylet-projection-roundtrip.test.ts` (new)
- `tools/world-index/tests/schema.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tickets/SPEC81INDSTOCAN-002.md` (modify dependency handoff note)

## Out of Scope

- The new MCP tool `select_storylet_candidates` — landed in SPEC81INDSTOCAN-002.
- Consumer wiring in `branching-story-turn-cycle`, `commitment-block-authoring`, and `story_bundle_context` — landed in SPEC81INDSTOCAN-003/004/005.
- SQL-migration-system changes (this ticket adds one migration file following the existing 001-006 pattern; it does not modify the migration runner).
- Performance benchmarking against the synthetic 1000-SLT pool — landed in SPEC81INDSTOCAN-006 (capstone).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` — all existing tests pass; new `storylet-projection-roundtrip.test.ts` passes.
2. `grep -n 'storylet_compatible_driver\|storylet_predicate_pred\|storylet_predicate_class\|storylet_action_family' tools/world-index/src/schema/types.ts` returns 4 hits (one per new edge type).
3. After a fresh `world-index build` against a fixture story bundle, the resulting `_index/world.db` contains the projection columns from migration 007 AND emitted edges of the 4 new types match the source SLT bodies (per the roundtrip test).

### Invariants

1. STORY_EDGE_TYPES remains a closed append-only enum; the 4 new entries are appended at the end of the existing list.
2. The projection columns are derived from `_source/<bundle>/storylets/SLT-*.yaml` records; they are NEVER authored, NEVER stored outside the world-index, and are recomputed per `world-index build` / `update` run.
3. No production code path reads SLT data from anywhere except `_source/<bundle>/storylets/SLT-*.yaml` (canonical source) or the derived `_index/world.db` (projection); the index is read-only relative to the source.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/storylet-projection-roundtrip.test.ts` (new) — covers SPEC §9.1 by re-deriving projection columns from parsed full bodies and asserting equality against the persisted columns; asserts edge emission counts per kind match source-field values.
2. Existing parser/schema/count tests updated to recognize the four new edge types and the `slt_projections` table.

### Commands

1. `cd tools/world-index && npm test` — runs all world-index tests including the new roundtrip test.
2. `cd tools/world-index && npm run build` — confirms TypeScript compiles cleanly with the new edge-type entries and projection-column writes.

## Outcome

Completed: 2026-05-24

What changed:
- Added world-index schema version 7 with `slt_projections`, including indexed story/scope/move/saliency columns and `candidate_projection_hash`.
- Added `SltProjectionRow` persistence, parser emission, and cleanup on file reparse/delete.
- Appended four new storylet projection edge types: `storylet_compatible_driver`, `storylet_predicate_pred`, `storylet_predicate_class`, and `storylet_action_family`.
- Added a roundtrip test proving persisted projection rows and coarse filter edges match source SLT YAML, plus schema/count/parity test updates and `docs/MACHINE-FACING-LAYER.md` edge documentation.
- Updated `tickets/SPEC81INDSTOCAN-002.md` to state that source-record-id filtering uses existing `storylet_predicate_ref` edges, not a new fifth edge.

Deviations from original plan:
- Implemented the scalar projections as a dedicated `slt_projections` table rather than widening `nodes`.
- The scalar projection field count is 8, not 10; the ticket's earlier count was stale. The table also carries `node_id`, `world_slug`, `story_slug`, and `candidate_projection_hash`.
- The new fixture uses one representative SLT with varied scalar/edge fields instead of a 10-SLT fixture; it directly asserts the source-to-DB roundtrip for every owned projection field and edge family. Broader pool-size and trace-count coverage remains in downstream/capstone tickets.

Verification Result:
- PASS — `cd tools/world-index && npm run build` completed successfully after the implementation.
- PASS — `cd tools/world-index && node --test dist/tests/storylet-projection-roundtrip.test.js dist/tests/parse/atomic-edges-for-choice-and-storylet.test.js dist/tests/schema.test.js` passed 9/9 focused subtests.
- PASS — `cd tools/world-index && npm test` passed 132/132 subtests.
- PASS — `grep -n 'storylet_compatible_driver\|storylet_predicate_pred\|storylet_predicate_class\|storylet_action_family' tools/world-index/src/schema/types.ts` returned exactly four registry hits.
