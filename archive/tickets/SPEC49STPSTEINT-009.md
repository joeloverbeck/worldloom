# SPEC49STPSTEINT-009: Add world-index edges for STPLAN fallback/success/derived/expires + STEMO expires

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/schema/types.ts`, focused world-index tests, and `docs/MACHINE-FACING-LAYER.md` (modified)
**Deps**: None

## Problem

At intake, `tools/world-index/src/parse/atomic.ts` extracted 8 STPLAN edges (`plan_holder`, `plan_root_intention`, `plan_belief_basis`, `plan_resource_basis`, `plan_blocker`, `plan_current_step_target`, `plan_created_by_event`, `plan_supersedes`) but did not extract edges for `STPLAN.fallback_steps[].target_records[]`, predicate-reference edges within `success_condition` / `fallback_steps[].trigger_condition`, `STPLAN.derived_from`, or `STPLAN.expires_when`. It also extracted 6 STEMO edges but did not extract `STEMO.expires_when`. The schemas declared these fields, but the indexed graph silently omitted their references. SPEC-49 §C.1 + §C.2 closed this by adding 5 new STPLAN edge types and 1 new STEMO edge type to extraction.

## Assumption Reassessment (2026-05-19)

1. `tools/world-index/src/parse/atomic.ts:856-900` (STPLAN block) and lines 902-939 (STEMO block) confirmed via codebase grep during reassess-spec session. The extraction uses the `pushStoryEdgeIfReference` helper pattern (verified at lines 863, 909). Each existing edge extraction follows the shape: `pushStoryEdgeIfReference(edges, node.node_id, "<edge_type>", storySlug, <source-field-expression>)`. The 5 new STPLAN edges + 1 new STEMO edge extend this pattern mechanically.
2. SPEC-49 §Approach §C.1 + §C.2 (per the reassess-spec-updated spec) cites the audit report's Priority 1 list item 2 *"World-index edges for fallback/success/derived plan references."* The 6 new edge type names: `plan_fallback_step_target` (from `STPLAN.fallback_steps[].target_records[]`), `plan_fallback_predicate_ref` (predicate args in `fallback_steps[].trigger_condition.predicates[]`), `plan_success_predicate_ref` (predicate args in `current_step.success_condition.predicates[]`), `plan_derived_from` (from `STPLAN.derived_from[]`), `plan_expires_when_ref` (record IDs parsed from `STPLAN.expires_when` string), `emotion_expires_when_ref` (record IDs parsed from `STEMO.expires_when` string).
3. Cross-skill boundary under audit: world-index edge extraction is consumed by retrieval-side surfaces — `mcp__worldloom__get_neighbors`, MCP context-packet edge projections, `find_impacted_fragments`, story-pipeline skill grep paths. The 6 new edges are graph-edge deliverables per `references/codebase-validation.md` §3.11 graph-edge consumer model rule: consumers are structural-query primitives, not name-greppable invocations. No per-edge consumer wiring is required; the world-index retrieval surface will project the new edges automatically.
4. FOUNDATIONS §Story Bundles §5b Schema Minimalism: the 6 new edges are derived projections of existing schema fields — no new record fields, no new schema entries, no new edge taxonomies. The extension follows the existing edge-vocabulary contract (one entry per resolved record reference). SPEC-49 §FOUNDATIONS Alignment confirms §5b alignment.
5. Implementation reassessment corrected the live proof surface: dedicated STPLAN/STEMO parse tests already existed under `tools/world-index/tests/parse/`, and the cross-package edge integration witness already existed as `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts`. The older generic `tools/world-index/tests/story-bundle-edges.test.ts` path remains a legacy broad story-edge test, not the narrowest current seam for STPLAN/STEMO.
6. Implementation exposed required same-seam fallout in `STORY_REF_REGEX`: free-text story-reference extraction omitted `BEL`, so direct `BEL` array fields were indexed only through explicit field walkers while predicate/expires text extraction could not see `BEL-<integer>`. Adding `BEL` to the regex is required for the ticket's predicate-reference invariant.

## Architecture Check

1. Extending the existing extraction blocks with new `pushStoryEdgeIfReference` calls is the minimal-blast-radius approach. Alternative (introducing a separate per-class extraction module) would multiply the parser file count without semantic gain — the existing per-class block structure at lines 856-900 (STPLAN) and 902-939 (STEMO) is the canonical pattern.
2. No backwards-compatibility aliasing introduced. Re-running `world-index build <world>` picks up the new edges on the next index rebuild; existing indexed worlds need a rebuild to surface the new edges, but this is the standard world-index update discipline (no migration code required).

## Verification Layers

1. Edge extraction: each of the 6 new edge types is emitted from the STPLAN / STEMO extraction blocks. Validator surface: unit test against fixtures that populate the new fields.
2. Round-trip persistence: after `world-index build` runs, the SQLite `edges` rows for the new edge types contain the expected story-local target refs. Validator surface: existing world-index integration test exercising the build path and DB rows.
3. Edge-vocabulary contract: each new edge type follows the existing naming convention (`plan_*` for STPLAN-sourced edges, `emotion_*` for STEMO-sourced) and produces one entry per resolved record reference. Validator surface: codebase grep-proof for the new edge type strings.

## Landed Changes

### 1. Extend STPLAN edge extraction at `tools/world-index/src/parse/atomic.ts` (near lines 856-900)

Added 5 new STPLAN extraction paths:

- `plan_fallback_step_target`: for each entry in `record.fallback_steps[]`, for each target in `entry.target_records[]`, push an edge. Mirror the existing `plan_current_step_target` extraction at line 887.
- `plan_fallback_predicate_ref`: walk `fallback_steps[].trigger_condition.predicates[]`, extract record IDs from predicate arguments (record-ID-bearing predicate arg pattern), push edges.
- `plan_success_predicate_ref`: walk `current_step.success_condition.predicates[]`, extract record IDs, push edges.
- `plan_derived_from`: for each ID in `record.derived_from[]`, push an edge. Mirror the existing `emotion_derived_from` extraction at line 935.
- `plan_expires_when_ref`: parse the `record.expires_when` string for record-ID patterns (e.g., `expires_when: "page-after STPLAN-3 fulfills"` would emit an edge to STPLAN-3). Use the same string-with-record-id parse pattern used in other extraction sites.

### 2. Extend STEMO edge extraction at `tools/world-index/src/parse/atomic.ts` (near lines 902-939)

Added 1 new STEMO extraction path:

- `emotion_expires_when_ref`: parse the `record.expires_when` string for record-ID patterns. Mirror C.1's `plan_expires_when_ref` mechanics.

### 3. No Canon Safety surface change

This ticket modifies the world-index parser, not a structural validator or patch-engine op. The graph-edge consumer model (per `references/codebase-validation.md` §3.11) applies: the new edges are consumed by general retrieval primitives, not by name-greppable invocations.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify — extend STPLAN + STEMO edge extraction blocks and story-reference regex)
- `tools/world-index/src/schema/types.ts` (modify — register 6 new story edge types)
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (modify — focused parser coverage for 5 new STPLAN edge types)
- `tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts` (modify — focused parser coverage for `emotion_expires_when_ref`)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify — build/DB integration coverage for the expanded STPLAN/STEMO edge set)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify — fixed registry count witness)
- `tools/world-index/tests/types.test.ts` (modify — fixed registry count and inclusion witness)
- `docs/MACHINE-FACING-LAYER.md` (modify — public story-edge count/table)

## Out of Scope

- Modifying the existing 14 STPLAN/STEMO edges (8 + 6) at their current extraction sites — preserved unchanged.
- Adding edge extraction for any record class beyond STPLAN/STEMO.
- Adding edge consumers (MCP tools, skill phases) that explicitly query the new edge types — graph-edge consumers are general-query primitives; no per-edge wiring required.
- Modifying world-index schema files (the edge graph schema is the in-memory + SQLite-backed graph contract; new edge type strings extend the schema automatically via the parser's `pushStoryEdgeIfReference` helper).
- Modifying the world-index CLI's `build` command surface.

## Acceptance Criteria

### Tests That Must Pass

1. After `world-index build <fixture-world>`, a STPLAN with populated `fallback_steps[0].target_records: [STENT-5]` produces an edge of type `plan_fallback_step_target` from the STPLAN to STENT-5.
2. A STPLAN with `current_step.success_condition.predicates: [{ pred: "plan_active(STPLAN-3)" }]` produces a `plan_success_predicate_ref` edge to STPLAN-3.
3. A STPLAN with `fallback_steps[0].trigger_condition.predicates: [{ pred: "belief_held(BEL-7, ...)" }]` produces a `plan_fallback_predicate_ref` edge to BEL-7.
4. A STPLAN with `derived_from: [STPLAN-1]` produces a `plan_derived_from` edge to STPLAN-1.
5. A STPLAN with `expires_when: "page-after STPLAN-3 fulfills"` produces a `plan_expires_when_ref` edge to STPLAN-3.
6. A STEMO with `expires_when: "page-after SE-7"` produces an `emotion_expires_when_ref` edge to SE-7.
7. The 8 existing STPLAN edges + 6 existing STEMO edges continue to be extracted correctly on existing fixtures (no regression).
8. The integration build test persists the expected new edge rows into `world.db`; direct MCP `get_neighbors` coverage remains out of scope for this world-index package ticket.

### Invariants

1. Every record-ID-bearing field on STPLAN/STEMO records that the schema declares produces a corresponding indexed edge (no silent omission of references in `fallback_steps`, `success_condition`, `derived_from`, or `expires_when`).
2. New edges follow the existing edge-vocabulary contract: `plan_*` prefix for STPLAN-sourced, `emotion_*` for STEMO-sourced; one edge per resolved record reference; no novel semantics.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` — modified to cover `plan_fallback_step_target`, `plan_fallback_predicate_ref`, `plan_success_predicate_ref`, `plan_derived_from`, and `plan_expires_when_ref`.
2. `tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts` — modified to cover `emotion_expires_when_ref`.
3. `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` — modified to cover the expanded STPLAN/STEMO edge set through `world-index build` and DB edge rows.
4. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` and `tools/world-index/tests/types.test.ts` — modified to keep registry count witnesses truthful after the 6-edge expansion.

### Commands

1. `npm run build --prefix tools/world-index`
2. `node --test dist/tests/parse/atomic-edges-for-story-plan.test.js` from `tools/world-index/`
3. `node --test dist/tests/parse/atomic-edges-for-story-emotion.test.js` from `tools/world-index/`
4. `node --test dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` from `tools/world-index/`
5. `npm test --prefix tools/world-index` (full world-index suite)
6. Edge-type grep-proof: `grep -nE "plan_fallback_step_target|plan_fallback_predicate_ref|plan_success_predicate_ref|plan_derived_from|plan_expires_when_ref|emotion_expires_when_ref" tools/world-index/src/parse/atomic.ts tools/world-index/src/schema/types.ts tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts docs/MACHINE-FACING-LAYER.md` should return current extraction, registry, test, and docs hits.

## Outcome

Completed: 2026-05-19

Implemented the SPEC-49 C.1/C.2 world-index edge expansion:

- Registered 6 new story edge types: `plan_fallback_step_target`, `plan_success_predicate_ref`, `plan_fallback_predicate_ref`, `plan_derived_from`, `plan_expires_when_ref`, and `emotion_expires_when_ref`.
- Extended STPLAN extraction for fallback target records, success/fallback predicate record ids, `derived_from[]`, and scalar `expires_when` refs.
- Extended STEMO extraction for scalar `expires_when` refs.
- Added `BEL` to `STORY_REF_REGEX` so free-text predicate/expires extraction can see belief record ids as well as the other story record classes.
- Updated focused parser tests, the existing STPLAN/STEMO build integration test, registry count witnesses, and the public machine-facing edge table.

## Verification Result

- `npm run build --prefix tools/world-index` — passed.
- From `tools/world-index/`: `node --test dist/tests/parse/atomic-edges-for-story-plan.test.js` — passed (2 tests).
- From `tools/world-index/`: `node --test dist/tests/parse/atomic-edges-for-story-emotion.test.js` — passed (2 tests).
- From `tools/world-index/`: `node --test dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` — passed (1 test).
- `npm test --prefix tools/world-index` — passed (119 tests). Output included expected diagnostic chatter from existing tests: a schema-pattern mismatch skip log under `/tmp/...` and a legacy-world atomic-source rejection message.

## Deviations

- The drafted `tools/world-index/tests/story-bundle-edges.test.ts` target was superseded by the live narrower test seam: dedicated STPLAN/STEMO parse tests plus the existing STPLAN/STEMO integration edge test.
- The drafted direct MCP `get_neighbors` acceptance was not run. The package-owned proof is `world-index build` plus direct SQLite edge-row assertions; MCP retrieval is a downstream consumer of the persisted graph and remains covered by later integration/capstone scope.
