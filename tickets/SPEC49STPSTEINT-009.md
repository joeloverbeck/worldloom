# SPEC49STPSTEINT-009: Add world-index edges for STPLAN fallback/success/derived/expires + STEMO expires

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/parse/atomic.ts` (modify), `tools/world-index/tests/story-bundle-edges.test.ts` (modify)
**Deps**: None

## Problem

`tools/world-index/src/parse/atomic.ts:856-900` extracts 8 STPLAN edges (`plan_holder`, `plan_root_intention`, `plan_belief_basis`, `plan_resource_basis`, `plan_blocker`, `plan_current_step_target`, `plan_created_by_event`, `plan_supersedes`) but does NOT extract edges for `STPLAN.fallback_steps[].target_records[]`, predicate-reference edges within `success_condition` / `fallback_steps[].trigger_condition`, `STPLAN.derived_from`, or `STPLAN.expires_when`. Lines 902-939 extract 6 STEMO edges but do NOT extract `STEMO.expires_when`. The schemas (verified during reassess-spec: `story-plan.schema.json` has `fallback_steps`, `success_condition`, `expires_when`, `derived_from` at lines 56-100; `story-emotion.schema.json` has `expires_when` + `derived_from` at lines 104-105) declare these fields, but the indexed graph silently omits their references. SPEC-49 §C.1 + §C.2 close this by adding 5 new STPLAN edge types and 1 new STEMO edge type to the extraction.

## Assumption Reassessment (2026-05-19)

1. `tools/world-index/src/parse/atomic.ts:856-900` (STPLAN block) and lines 902-939 (STEMO block) confirmed via codebase grep during reassess-spec session. The extraction uses the `pushStoryEdgeIfReference` helper pattern (verified at lines 863, 909). Each existing edge extraction follows the shape: `pushStoryEdgeIfReference(edges, node.node_id, "<edge_type>", storySlug, <source-field-expression>)`. The 5 new STPLAN edges + 1 new STEMO edge extend this pattern mechanically.
2. SPEC-49 §Approach §C.1 + §C.2 (per the reassess-spec-updated spec) cites the audit report's Priority 1 list item 2 *"World-index edges for fallback/success/derived plan references."* The 6 new edge type names: `plan_fallback_step_target` (from `STPLAN.fallback_steps[].target_records[]`), `plan_fallback_predicate_ref` (predicate args in `fallback_steps[].trigger_condition.predicates[]`), `plan_success_predicate_ref` (predicate args in `current_step.success_condition.predicates[]`), `plan_derived_from` (from `STPLAN.derived_from[]`), `plan_expires_when_ref` (record IDs parsed from `STPLAN.expires_when` string), `emotion_expires_when_ref` (record IDs parsed from `STEMO.expires_when` string).
3. Cross-skill boundary under audit: world-index edge extraction is consumed by retrieval-side surfaces — `mcp__worldloom__get_neighbors`, MCP context-packet edge projections, `find_impacted_fragments`, story-pipeline skill grep paths. The 6 new edges are graph-edge deliverables per `references/codebase-validation.md` §3.11 graph-edge consumer model rule: consumers are structural-query primitives, not name-greppable invocations. No per-edge consumer wiring is required; the world-index retrieval surface will project the new edges automatically.
4. FOUNDATIONS §Story Bundles §5b Schema Minimalism: the 6 new edges are derived projections of existing schema fields — no new record fields, no new schema entries, no new edge taxonomies. The extension follows the existing edge-vocabulary contract (one entry per resolved record reference). SPEC-49 §FOUNDATIONS Alignment confirms §5b alignment.

## Architecture Check

1. Extending the existing extraction blocks with new `pushStoryEdgeIfReference` calls is the minimal-blast-radius approach. Alternative (introducing a separate per-class extraction module) would multiply the parser file count without semantic gain — the existing per-class block structure at lines 856-900 (STPLAN) and 902-939 (STEMO) is the canonical pattern.
2. No backwards-compatibility aliasing introduced. Re-running `world-index build <world>` picks up the new edges on the next index rebuild; existing indexed worlds need a rebuild to surface the new edges, but this is the standard world-index update discipline (no migration code required).

## Verification Layers

1. Edge extraction: each of the 6 new edge types is emitted from the STPLAN / STEMO extraction blocks. Validator surface: unit test against fixtures that populate the new fields.
2. Round-trip retrieval: after `world-index build` runs, `get_neighbors` queries on the new edge types return the expected record IDs. Validator surface: integration test exercising the world-index CLI + MCP retrieval.
3. Edge-vocabulary contract: each new edge type follows the existing naming convention (`plan_*` for STPLAN-sourced edges, `emotion_*` for STEMO-sourced) and produces one entry per resolved record reference. Validator surface: codebase grep-proof for the new edge type strings.

## What to Change

### 1. Extend STPLAN edge extraction at `tools/world-index/src/parse/atomic.ts` (near lines 856-900)

Add 5 new `pushStoryEdgeIfReference` call patterns:

- `plan_fallback_step_target`: for each entry in `record.fallback_steps[]`, for each target in `entry.target_records[]`, push an edge. Mirror the existing `plan_current_step_target` extraction at line 887.
- `plan_fallback_predicate_ref`: walk `fallback_steps[].trigger_condition.predicates[]`, extract record IDs from predicate arguments (record-ID-bearing predicate arg pattern), push edges.
- `plan_success_predicate_ref`: walk `current_step.success_condition.predicates[]`, extract record IDs, push edges. Reuse the dormant helper `successConditionRecordIds()` at `tools/validators/src/structural/stplan-utils.ts:159` for the ID extraction logic (factor it into a shared utility if cross-package import is needed, OR inline the same parse pattern).
- `plan_derived_from`: for each ID in `record.derived_from[]`, push an edge. Mirror the existing `emotion_derived_from` extraction at line 935.
- `plan_expires_when_ref`: parse the `record.expires_when` string for record-ID patterns (e.g., `expires_when: "page-after STPLAN-3 fulfills"` would emit an edge to STPLAN-3). Use the same string-with-record-id parse pattern used in other extraction sites.

### 2. Extend STEMO edge extraction at `tools/world-index/src/parse/atomic.ts` (near lines 902-939)

Add 1 new `pushStoryEdgeIfReference` call:

- `emotion_expires_when_ref`: parse the `record.expires_when` string for record-ID patterns. Mirror C.1's `plan_expires_when_ref` mechanics.

### 3. No Canon Safety surface change

This ticket modifies the world-index parser, not a structural validator or patch-engine op. The graph-edge consumer model (per `references/codebase-validation.md` §3.11) applies: the new edges are consumed by general retrieval primitives, not by name-greppable invocations.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify — extend STPLAN + STEMO edge extraction blocks)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — add test cases for new edge types)

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
8. `get_neighbors(STPLAN-N, edge_type: "plan_fallback_step_target")` returns the expected target records via the MCP retrieval surface.

### Invariants

1. Every record-ID-bearing field on STPLAN/STEMO records that the schema declares produces a corresponding indexed edge (no silent omission of references in `fallback_steps`, `success_condition`, `derived_from`, or `expires_when`).
2. New edges follow the existing edge-vocabulary contract: `plan_*` prefix for STPLAN-sourced, `emotion_*` for STEMO-sourced; one edge per resolved record reference; no novel semantics.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — modify to add 6 new test cases (one per new edge type) consuming bundle fixtures that populate the new fields. Existing STPLAN/STEMO edge tests preserved unchanged.
2. `tools/world-index/tests/fixtures/stplan-with-fallback-steps.yaml` — new fixture for `plan_fallback_step_target` + `plan_fallback_predicate_ref` cases.
3. `tools/world-index/tests/fixtures/stplan-with-success-predicates.yaml` — new fixture for `plan_success_predicate_ref` case.
4. `tools/world-index/tests/fixtures/stplan-with-derived-from-and-expires-when.yaml` — new fixture for `plan_derived_from` + `plan_expires_when_ref` cases.
5. `tools/world-index/tests/fixtures/stemo-with-expires-when.yaml` — new fixture for `emotion_expires_when_ref` case.

### Commands

1. `npm test --prefix tools/world-index` (full world-index suite)
2. Targeted: `npm run build --prefix tools/world-index && node --test tools/world-index/dist/tests/story-bundle-edges.test.js`
3. Edge-type grep-proof: `grep -nE "plan_fallback_step_target|plan_fallback_predicate_ref|plan_success_predicate_ref|plan_derived_from|plan_expires_when_ref|emotion_expires_when_ref" tools/world-index/src/parse/atomic.ts` should return 6+ matches (one per new edge type, possibly multiple per edge for the extraction loop logic).
