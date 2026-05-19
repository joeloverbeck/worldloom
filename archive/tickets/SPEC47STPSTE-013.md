# SPEC47STPSTE-013: Extend world-index STORY_EDGE_TYPES with 14 STPLAN+STEMO edges + extractors

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — extends `tools/world-index/src/schema/types.ts` NODE_TYPES with `story_plan_record` / `story_emotion_record` and STORY_EDGE_TYPES from 36 to 50 edge types; registers `_source/plans/` and `_source/emotions/` story-bundle directories; implements 2 new per-class edge extractor helpers (`edgesForStoryPlan`, `edgesForStoryEmotion`) in `tools/world-index/src/parse/atomic.ts`; wires both helpers into the existing `edgesForStoryRecord` dispatch
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

At intake, SPEC-47's STPLAN/STEMO records carried ownership / provenance / access / supersession relationships across their fields (holder → STENT; root_intention → STINT; belief_basis → BEL[]; resource_basis → SF/STOBJ/STLOC/DA/SREL/OBL; blockers → record[]; current_step.target_records → record[]; created_by_event → SE; supersedes → STPLAN; trigger_event → SE; appraisal_basis → BEL[]; orientation.toward_records → record[]; derived_from → record[]), but `tools/world-index` could not parse those story-bundle record directories or emit traversable edges for them. Without world-index edge extraction for these fields, `get_neighbors`-style graph-walking queries and downstream packets (future present-causal-situation, dramatic-irony, social-pressure packets per SPEC-47 §Out of Scope items 3-6) would fall back to per-record scans. This ticket extends STORY_EDGE_TYPES from 36 (SPEC-46 baseline) to 50 and adds per-class extractors mirroring SPEC-46 Phase C's per-class extractor pattern.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/world-index/src/schema/types.ts` STORY_EDGE_TYPES had 36 entries at intake (14 pre-SPEC-46 + 22 SPEC-46 Phase C additions). Verified `tools/world-index/src/parse/atomic.ts` contained `edgesForStoryRecord` (the central dispatch) plus per-class extractor helpers added by SPEC-46 (`edgesForStoryEvent`, `edgesForStoryBelief`, `edgesForStoryRelationship`, `edgesForStoryIntention`, `edgesForStoryStatus`, `edgesForStoryClock`, `edgesForStorySecret`, `edgesForStoryQuestion`). The pattern for new extractor helpers is established by SPEC-46 Phase C's implementation.
2. Verified SPEC-47 §Approach §C D-C5 enumerates 8 STPLAN edges (plan_holder, plan_root_intention, plan_belief_basis, plan_resource_basis, plan_blocker, plan_current_step_target, plan_created_by_event, plan_supersedes) + 6 STEMO edges (emotion_holder, emotion_trigger_event, emotion_appraisal_basis, emotion_oriented_toward, emotion_supersedes, emotion_derived_from) = 14 new edges; D-C6 specifies per-class helpers `edgesForStoryPlan` + `edgesForStoryEmotion`; D-C7 wires them into the `edgesForStoryRecord` dispatch.
3. Cross-skill boundary under audit: STORY_EDGE_TYPES is the closed enum of recognized story-edge types consumed by (a) the world-index parser at build time; (b) `mcp__worldloom__get_neighbors` and related graph-walking helpers at retrieval time; (c) future packet builders that traverse plan/emotion ownership (deferred per SPEC-47 §Out of Scope items 3-6). Adding 14 edges extends the closed enum monotonically; existing 36 edges are unchanged.
4. FOUNDATIONS §Tooling Recommendation — extending the world-index edge surface to cover STPLAN/STEMO records preserves the "machine-facing layer" principle ("World Index" #1 in the §Machine-Facing Layer enumeration); without this ticket, the patch engine could write STPLAN/STEMO records (via ticket 004), but `world-index` had no registered node types, source directories, or traversable edges for them.
5. Reassessment correction: the drafted ticket assumed STPLAN/STEMO node entries were already available in `world-index` via patch-engine ticket 004. Live code proved that patch-engine write metadata is package-local to `tools/patch-engine`; `tools/world-index/src/schema/types.ts` and `tools/world-index/src/parse/atomic.ts` still needed `story_plan_record` / `story_emotion_record` NODE_TYPES and `_source/plans/` / `_source/emotions/` story-directory registration before edge extraction could run. This was same-seam prerequisite fallout and was folded into this ticket.

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
5. Per-edge round-trip: fixture STPLAN/STEMO records with populated fields produce the expected edge rows, and fixture records with empty/placeholder fields produce no extraneous edges → focused parser tests plus integration `world-index build` fixture.

## Landed Changes

### 1. Extended `tools/world-index/src/schema/types.ts`

Added `story_plan_record` and `story_emotion_record` to NODE_TYPES and appended 14 new entries to STORY_EDGE_TYPES:

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

The derived `StoryEdgeType` and `EDGE_TYPES` unions update from those constants; total `EDGE_TYPES.length` is now 65.

### 2. Registered STPLAN/STEMO story-bundle source directories

Added `_source/plans/STPLAN-<integer>.yaml` and `_source/emotions/STEMO-<integer>.yaml` routing to `STORY_DIRS` in `tools/world-index/src/parse/atomic.ts`, and extended `STORY_REF_REGEX` so structured story-reference discovery recognizes STPLAN/STEMO ids.

### 3. Implemented `edgesForStoryPlan` extractor

Implemented the 8 STPLAN edge extractions. Per-edge extraction reads the corresponding STPLAN field and emits one edge row per valid record-id reference; placeholder values such as `system`, `unknown`, and `group:<name>` are silently skipped per the SPEC-46 placeholder convention.

### 4. Implemented `edgesForStoryEmotion` extractor

Implemented the 6 STEMO edge extractions with the same valid-record-reference filtering.

### 5. Wired both helpers into `edgesForStoryRecord` dispatch

Added `story_plan_record` and `story_emotion_record` dispatch branches in `edgesForStoryRecord`.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify) — STORY_EDGE_TYPES extension
- `tools/world-index/src/parse/atomic.ts` (modify) — story-directory registration, STPLAN/STEMO reference recognition, 2 new extractor helpers + dispatch wiring
- `tools/world-index/tests/types.test.ts` (modify) — NODE_TYPES/STORY_EDGE_TYPES/EDGE_TYPES count and membership assertions
- `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (new) — focused STPLAN parser edge tests
- `tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts` (new) — focused STEMO parser edge tests
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (new) — `world-index build` fixture asserting all 14 new edge rows
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify) — same-seam registry count truthing from 36 to 50 while preserving SPEC-46 edge assertions

## Out of Scope

- world-index docs (MACHINE-FACING-LAYER.md story-edge enumeration) — covered by ticket 014.
- Patch-engine wiring for STPLAN/STEMO node types — covered by ticket 004.
- JSON schemas for STPLAN/STEMO — covered by `archive/tickets/SPEC47STPSTE-003.md`.
- Full cross-package SPEC-47 capstone integration across validators, MCP, page-plan, skills, Hook 3, and §5c lint — covered by ticket 017.

## Acceptance Criteria

### Tests That Must Pass

1. STORY_EDGE_TYPES.length === 50 (was 36; +14 = 50) — TypeScript constant length assertion.
2. `grep -cE "plan_holder|plan_root_intention|plan_belief_basis|plan_resource_basis|plan_blocker|plan_current_step_target|plan_created_by_event|plan_supersedes|emotion_holder|emotion_trigger_event|emotion_appraisal_basis|emotion_oriented_toward|emotion_supersedes|emotion_derived_from" tools/world-index/src/schema/types.ts` returns ≥14.
3. `edgesForStoryPlan` and `edgesForStoryEmotion` functions exist in `tools/world-index/src/parse/atomic.ts` → codebase grep-proof.
4. Per-edge fixture tests: a fixture STPLAN record with populated `holder` field produces a `plan_holder` edge with correct source/target/edge_type/story_slug; a fixture STPLAN record with empty `belief_basis[]` produces zero `plan_belief_basis` edges.
5. `world-index build` regression on a representative fixture world rebuilds the index with the 14 new edges populated without rebuild errors.

### Invariants

1. The 36 pre-existing edge types (14 pre-SPEC-46 + 22 SPEC-46 Phase C) are unchanged in name or extraction logic.
2. Placeholder values (`system`, `unknown`, `group:<name>`) in source fields silently skip edge emission per the SPEC-46 convention; the semantic concept is preserved on the record body.
3. Multi-edge fields (e.g., `belief_basis[]` of length N) produce N edge rows, one per array entry.
4. `world-index build` is idempotent — re-running on an unchanged source set produces the same index.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-edges-for-story-plan.test.ts` (new) — per-edge positive + negative case fixtures for all 8 STPLAN edge types.
2. `tools/world-index/tests/parse/atomic-edges-for-story-emotion.test.ts` (new) — same shape for the 6 STEMO edge types.
3. `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (new) — registry-completeness test (STORY_EDGE_TYPES.length === 50) + end-to-end `build` on a fixture bundle containing STPLAN + STEMO records; assert all 14 new edge rows appear with correct source/target/story_slug and zero spurious placeholder rows.

### Commands

1. From `tools/world-index`: `npm run build`
2. From `tools/world-index`: `node --test dist/tests/types.test.js dist/tests/parse/atomic-edges-for-story-plan.test.js dist/tests/parse/atomic-edges-for-story-emotion.test.js dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js`
3. From `tools/world-index`: `npm test`

## Outcome

Completed: 2026-05-19.

- Added `story_plan_record` and `story_emotion_record` to `tools/world-index` node vocabulary and registered `_source/plans/` / `_source/emotions/` story-bundle input directories.
- Extended STORY_EDGE_TYPES from 36 to 50 with the 8 STPLAN and 6 STEMO edge types named by SPEC-47.
- Implemented `edgesForStoryPlan` and `edgesForStoryEmotion` and wired both through `edgesForStoryRecord`.
- Added focused parser tests for populated, empty, and placeholder-bearing STPLAN/STEMO records.
- Added an integration build fixture that asserts all 14 new edge rows are written to the rebuilt SQLite index and that placeholder values do not emit edge targets.
- Updated the SPEC-46 edge capstone's registry-count assertion to the current 50-edge total while preserving its SPEC-46 edge-row checks.

## Verification Result

Commands run from `tools/world-index`:

1. `npm run build` — passed after implementation and again after final test edits.
2. `node --test dist/tests/types.test.js dist/tests/parse/atomic-edges-for-story-plan.test.js dist/tests/parse/atomic-edges-for-story-emotion.test.js dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js` — passed; 6 tests passed.
3. `npm test` — first run failed only on the stale SPEC-46 capstone assertion `50 !== 36`; updated that same-seam registry-count assertion and reran successfully.
4. `npm test` final — passed; 129 tests passed.

## Deviations

- The drafted premise that STPLAN/STEMO node entries already existed in `world-index` was false; this ticket added the `world-index` node vocabulary and story-directory routing required for the edge extractors to run.
- The full SPEC-47 cross-package capstone remains owned by ticket 017. This ticket's integration test covers the `world-index build` edge-population slice only.
