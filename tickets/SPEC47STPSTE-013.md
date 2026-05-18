# SPEC47STPSTE-013: Extend world-index STORY_EDGE_TYPES with 14 STPLAN+STEMO edges + extractors

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends `tools/world-index/src/schema/types.ts` STORY_EDGE_TYPES constant from 36 to 50 edge types; implements 2 new per-class edge extractor helpers (`edgesForStoryPlan`, `edgesForStoryEmotion`) in `tools/world-index/src/parse/atomic.ts`; wires both helpers into the existing `edgesForStoryRecord` dispatch
**Deps**: 003

## Problem

SPEC-47's STPLAN/STEMO records carry ownership / provenance / access / supersession relationships across their fields (holder → STENT; root_intention → STINT; belief_basis → BEL[]; resource_basis → SF/STOBJ/STLOC/DA/SREL/OBL; blockers → record[]; current_step.target_records → record[]; created_by_event → SE; supersedes → STPLAN; trigger_event → SE; appraisal_basis → BEL[]; orientation.toward_records → record[]; derived_from → record[]). Without world-index edge extraction for these fields, `get_neighbors`-style graph-walking queries and downstream packets (future present-causal-situation, dramatic-irony, social-pressure packets per SPEC-47 §Out of Scope items 3-6) cannot traverse plan/emotion ownership relationships at the index level — they must fall back to per-record scans, which scales poorly. Per SPEC-47 §Approach §C D-C5+D-C6+D-C7, 14 new edges (8 STPLAN + 6 STEMO) extend STORY_EDGE_TYPES from 36 (SPEC-46 baseline) to 50, with per-class extractor helpers mirroring SPEC-46 Phase C's per-class extractor pattern.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/world-index/src/schema/types.ts` STORY_EDGE_TYPES currently has 36 entries per the reassess-spec session's exact count (14 pre-SPEC-46 + 22 SPEC-46 Phase C additions). Verified `tools/world-index/src/parse/atomic.ts` contains `edgesForStoryRecord` (the central dispatch) plus per-class extractor helpers added by SPEC-46 (`edgesForStoryEvent`, `edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, `edgesForStoryStatus`, `edgesForStoryClock`, `edgesForStorySecret`, `edgesForStoryQuestion`). The pattern for new extractor helpers is established by SPEC-46 Phase C's implementation.
2. Verified SPEC-47 §Approach §C D-C5 enumerates 8 STPLAN edges (plan_holder, plan_root_intention, plan_belief_basis, plan_resource_basis, plan_blocker, plan_current_step_target, plan_created_by_event, plan_supersedes) + 6 STEMO edges (emotion_holder, emotion_trigger_event, emotion_appraisal_basis, emotion_oriented_toward, emotion_supersedes, emotion_derived_from) = 14 new edges; D-C6 specifies per-class helpers `edgesForStoryPlan` + `edgesForStoryEmotion`; D-C7 wires them into the `edgesForStoryRecord` dispatch.
3. Cross-skill boundary under audit: STORY_EDGE_TYPES is the closed enum of recognized story-edge types consumed by (a) the world-index parser at build time; (b) `mcp__worldloom__get_neighbors` and related graph-walking helpers at retrieval time; (c) future packet builders that traverse plan/emotion ownership (deferred per SPEC-47 §Out of Scope items 3-6). Adding 14 edges extends the closed enum monotonically; existing 36 edges are unchanged.
4. FOUNDATIONS §Tooling Recommendation — extending the world-index edge surface to cover STPLAN/STEMO records preserves the "machine-facing layer" principle ("World Index" #1 in the §Machine-Facing Layer enumeration); without this ticket, the index has node entries for STPLAN/STEMO (via the patch-engine writes from ticket 004) but no traversable edges, leaving the graph-walking surface inconsistent with the rest of the story-bundle index.

## Architecture Check

1. Per-class extractor helpers (one per record class) preserves the orthogonal extractor structure that SPEC-46 established; alternative shapes (one mega-extractor for all classes) would force reviewers to mentally separate per-class logic from a single function. Following the SPEC-46 Phase C pattern keeps the extractor structure consistent across the codebase.
2. Edge-type constants in STORY_EDGE_TYPES use the established `<class>_<field>` snake_case convention (e.g., SPEC-46 added `belief_holder`, `intention_supersedes`; SPEC-47 adds `plan_holder`, `emotion_supersedes` parallel).
3. No backwards-compatibility aliasing/shims introduced — additions only. Existing 36 edges are unchanged in name or extraction logic.
4. The `world-index build` rebuild is fully deterministic per the world-index design contract; running on an existing world after this ticket lands rebuilds the index with the new edges populated against the same atomic records. No bundle migration required.

## Verification Layers

1. STORY_EDGE_TYPES.length === 50 after edit (was 36) → codebase grep-proof / TypeScript constant length assertion
2. 14 new edge type strings present in STORY_EDGE_TYPES → codebase grep-proof per edge name
3. `edgesForStoryPlan` and `edgesForStoryEmotion` extractor functions implemented in `tools/world-index/src/parse/atomic.ts` → codebase grep-proof
4. `edgesForStoryRecord` dispatch wires both new helpers → codebase grep-proof
5. Per-edge round-trip: fixture STPLAN/STEMO records with populated fields produce the expected edge rows in the rebuilt index; fixture records with empty fields produce no extraneous edges → integration test (deferred to ticket 017 capstone for full end-to-end coverage)

## What to Change

### 1. Extend `STORY_EDGE_TYPES` at `tools/world-index/src/schema/types.ts`

Append 14 new entries to the closed-enum array (alphabetical or grouped by class — follow the existing SPEC-46 Phase C ordering convention):

**STPLAN edges** (8):
- `plan_holder` — `STPLAN.holder` → `STENT`
- `plan_root_intention` — `STPLAN.root_intention` → `STINT`
- `plan_belief_basis` — `STPLAN.belief_basis[]` → `BEL` (multi-edge)
- `plan_resource_basis` — `STPLAN.resource_basis.*[]` → `SF` / `STOBJ` / `STLOC` / `DA` / `SREL` / `OBL` (multi-edge across sub-arrays)
- `plan_blocker` — `STPLAN.blockers[]` → record (any class)
- `plan_current_step_target` — `STPLAN.current_step.target_records[]` → record (any class)
- `plan_created_by_event` — `STPLAN.created_by_event` → `SE`
- `plan_supersedes` — `STPLAN.supersedes` → `STPLAN`

**STEMO edges** (6):
- `emotion_holder` — `STEMO.holder` → `STENT`
- `emotion_trigger_event` — `STEMO.trigger_event` → `SE`
- `emotion_appraisal_basis` — `STEMO.appraisal_basis[]` → `BEL` (multi-edge)
- `emotion_oriented_toward` — `STEMO.orientation.toward_records[]` → record (any)
- `emotion_supersedes` — `STEMO.supersedes` → `STEMO`
- `emotion_derived_from` — `STEMO.derived_from[]` → record (any)

Update the `StoryEdgeType` derived type and the cross-package `EDGE_TYPES` aggregator if they enumerate length-dependent constants (per the existing SPEC-46 Phase C pattern at lines 84-99 of types.ts).

### 2. Implement `edgesForStoryPlan` extractor in `tools/world-index/src/parse/atomic.ts`

Mirror the SPEC-46 Phase C pattern (e.g., `edgesForStoryEvent` for SE-actor / SE-target / SE-selected_storylet extraction). Per-edge extraction reads the corresponding STPLAN field and emits one edge row per resolved record-id reference; placeholder values (e.g., `system`, `unknown`, `group:<name>`) are silently skipped per the SPEC-46 placeholder convention (the semantic concept is preserved on the record body, retrievable via `get_record`).

### 3. Implement `edgesForStoryEmotion` extractor

Same shape for STEMO's 6 edge types.

### 4. Wire both helpers into `edgesForStoryRecord` dispatch

Add 2 new case arms to the central dispatch (matching on `node_type` string per SPEC-46's pattern; STPLAN node-type is `story_plan_record`, STEMO is `story_emotion_record` per the patch-engine STORY_RECORD_SPECS from ticket 004).

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify) — STORY_EDGE_TYPES extension
- `tools/world-index/src/parse/atomic.ts` (modify) — 2 new extractor helpers + dispatch wiring

## Out of Scope

- world-index docs (MACHINE-FACING-LAYER.md story-edge enumeration) — covered by ticket 014.
- Patch-engine wiring for STPLAN/STEMO node types — covered by ticket 004.
- JSON schemas for STPLAN/STEMO — covered by ticket 003.
- Capstone integration test (`world-index build` regression run on fixture world) — covered by ticket 017.

## Acceptance Criteria

### Tests That Must Pass

1. STORY_EDGE_TYPES.length === 50 (was 36; +14 = 50) — TypeScript constant length assertion.
2. `grep -cE "plan_holder|plan_root_intention|plan_belief_basis|plan_resource_basis|plan_blocker|plan_current_step_target|plan_created_by_event|plan_supersedes|emotion_holder|emotion_trigger_event|emotion_appraisal_basis|emotion_oriented_toward|emotion_supersedes|emotion_derived_from" tools/world-index/src/schema/types.ts` returns ≥14.
3. `edgesForStoryPlan` and `edgesForStoryEmotion` functions exist in `tools/world-index/src/parse/atomic.ts` → codebase grep-proof.
4. Per-edge fixture tests: a fixture STPLAN record with populated `holder` field produces a `plan_holder` edge with correct source/target/edge_type/story_slug; a fixture STPLAN record with empty `belief_basis[]` produces zero `plan_belief_basis` edges.
5. `world-index build` regression on a representative test world (fixture from SPEC-46's regression tests is sufficient) rebuilds the index with the 14 new edges populated without rebuild errors.

### Invariants

1. The 36 pre-existing edge types (14 pre-SPEC-46 + 22 SPEC-46 Phase C) are unchanged in name or extraction logic.
2. Placeholder values (`system`, `unknown`, `group:<name>`) in source fields silently skip edge emission per the SPEC-46 convention; the semantic concept is preserved on the record body.
3. Multi-edge fields (e.g., `belief_basis[]` of length N) produce N edge rows, one per array entry.
4. `world-index build` is idempotent — re-running on an unchanged source set produces the same index.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (new) — per-edge positive + negative case fixtures for all 8 STPLAN edge types.
2. `tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts` (new) — same shape for the 6 STEMO edge types.
3. `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (new) — registry-completeness test (STORY_EDGE_TYPES.length === 50) + end-to-end `build` on a fixture bundle containing STPLAN + STEMO records; assert all 14 new edge rows appear with correct source/target/story_slug and zero spurious rows.

### Commands

1. `npm --prefix tools/world-index run build && npm --prefix tools/world-index test` (full world-index package tests pass)
2. `npm --prefix tools/world-index test -- --test-name-pattern "edges-for-story-(plan|emotion)|spec47"` (only new edge tests run)
