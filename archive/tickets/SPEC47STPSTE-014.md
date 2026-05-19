# SPEC47STPSTE-014: Update MACHINE-FACING-LAYER docs with 14 new STPLAN+STEMO edges

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `docs/MACHINE-FACING-LAYER.md` story-edge enumeration with the 14 new STPLAN+STEMO edge types and their semantic shapes; no code changes
**Deps**: `archive/tickets/SPEC47STPSTE-013.md`

## Problem

At intake, ticket 013 had landed 14 new STPLAN/STEMO edge types in the world-index STORY_EDGE_TYPES constant, but the documented machine-facing layer reference at `docs/MACHINE-FACING-LAYER.md` still described the pre-SPEC-47 36-edge surface for consumers (skills, future packet builders, audit-pattern authors). Without this docs update, those consumers would see a stale enumeration that omitted the 14 new STPLAN/STEMO edges, leaving the documented retrieval surface inconsistent with the actual code surface. Per SPEC-47 §Approach §C D-C8, this docs-sync ticket lands after the code ticket it documents.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `docs/MACHINE-FACING-LAYER.md` exists at HEAD per the pre-Write verification; the file is the documented reference for the worldloom machine-facing layer (world-index, MCP retrieval, patch-engine, validator framework, hooks). The story-edge enumeration section was added/extended by SPEC-46's D-C8 to enumerate the SPEC-46 Phase C edge additions (22 edges) alongside the original 14 story-edge families.
2. Verified SPEC-47 §Approach §C D-C8 specifies updating the story-edge enumeration to list the 14 new STPLAN+STEMO edge types and their semantic shapes (source class → target class mappings, multi-edge vs single-edge distinctions, placeholder-skip conventions).
3. Cross-skill boundary under audit: `docs/MACHINE-FACING-LAYER.md` is the documented reference for skills and tools that consume the world-index retrieval surface. Skill authors and future packet implementers (deferred per SPEC-47 §Out of Scope items 3-7) reference this doc at design time; drift between the doc and the code would mislead them about which edges are queryable.

## Architecture Check

1. Docs-sync after code lands preserves the canonical reference; without this ticket, the documented edge enumeration becomes stale relative to the actual code surface. Landing docs-sync as its own small ticket (rather than co-edit with ticket 013) keeps the docs change reviewable independently and lets ticket 013's code-side review focus on the extractor logic.
2. No backwards-compatibility aliasing/shims introduced — docs additions only. Existing 36-edge enumeration is unchanged.

## Verification Layers

1. MACHINE-FACING-LAYER.md story-edge enumeration includes 14 new edge type rows → codebase grep-proof
2. Documented semantic shapes (source class → target class, multi-edge markers) match ticket 013's actual STORY_EDGE_TYPES extraction logic → manual review against the extractor code

## Landed Changes

### 1. Extended `docs/MACHINE-FACING-LAYER.md` story-edge enumeration

Added 14 new rows to the story-edge enumeration table (parallel to SPEC-46 Phase C's edge documentation). Format follows the existing per-edge row convention (source | edge type | target | meaning):

**STPLAN edges** (8):
- `plan_holder` | `STPLAN.holder` | STPLAN | STENT | single edge per record
- `plan_root_intention` | `STPLAN.root_intention` | STPLAN | STINT | single edge per record
- `plan_belief_basis` | `STPLAN.belief_basis[]` | STPLAN | BEL | one edge per array entry
- `plan_resource_basis` | `STPLAN.resource_basis.*[]` | STPLAN | SF / STOBJ / STLOC / DA / SREL / OBL | one edge per sub-array entry across all 6 sub-arrays
- `plan_blocker` | `STPLAN.blockers[]` | STPLAN | record (any class) | one edge per array entry
- `plan_current_step_target` | `STPLAN.current_step.target_records[]` | STPLAN | record (any) | one edge per array entry
- `plan_created_by_event` | `STPLAN.created_by_event` | STPLAN | SE | single edge per record
- `plan_supersedes` | `STPLAN.supersedes` | STPLAN | STPLAN | single edge per record; null when no supersession

**STEMO edges** (6):
- `emotion_holder` | `STEMO.holder` | STEMO | STENT | single edge per record
- `emotion_trigger_event` | `STEMO.trigger_event` | STEMO | SE | single edge per record
- `emotion_appraisal_basis` | `STEMO.appraisal_basis[]` | STEMO | BEL | one edge per array entry; empty when `status: dissociated`
- `emotion_oriented_toward` | `STEMO.orientation.toward_records[]` | STEMO | record (any) | one edge per array entry
- `emotion_supersedes` | `STEMO.supersedes` | STEMO | STEMO | single edge per record; null when no supersession
- `emotion_derived_from` | `STEMO.derived_from[]` | STEMO | record (any) | one edge per array entry

Note any placeholder-skip conventions inherited from the SPEC-46 Phase C documentation (e.g., when source field contains `system`, `unknown`, `group:<name>`, no edge is emitted; per-record-body retrieval via `get_record` preserves the semantic concept).

Updated the story-bundle edge-count statement in the doc body from 36 to 50.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Code-side STORY_EDGE_TYPES extension and extractor helpers — covered by ticket 013.
- CONTEXT-PACKET-CONTRACT.md updates for MCP summaries — covered by `archive/tickets/SPEC47STPSTE-012.md`.
- Other docs/MACHINE-FACING-LAYER.md sections (world-index core, MCP retrieval, patch-engine, validator framework, hooks) are unchanged — only the story-edge enumeration section is extended.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -cE "plan_holder|plan_root_intention|plan_belief_basis|plan_resource_basis|plan_blocker|plan_current_step_target|plan_created_by_event|plan_supersedes|emotion_holder|emotion_trigger_event|emotion_appraisal_basis|emotion_oriented_toward|emotion_supersedes|emotion_derived_from" docs/MACHINE-FACING-LAYER.md` returns ≥14.
2. `grep -nE "STORY_EDGE_TYPES.length.*50|50 story-bundle edge" docs/MACHINE-FACING-LAYER.md` returns a match for the updated total-count statement.
3. Manual review: documented semantic shapes match ticket 013's actual STORY_EDGE_TYPES extraction logic.

### Invariants

1. Existing 36-edge enumeration content is unchanged — only 14 new entries appended.
2. The documented semantic shapes match the code surface produced by ticket 013 — drift would mislead consumers.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -cE "plan_(holder|root_intention|belief_basis|resource_basis|blocker|current_step_target|created_by_event|supersedes)|emotion_(holder|trigger_event|appraisal_basis|oriented_toward|supersedes|derived_from)" docs/MACHINE-FACING-LAYER.md` (returns ≥14)
2. `grep -nE "STORY_EDGE_TYPES.length.*50|50 story-bundle edge" docs/MACHINE-FACING-LAYER.md` (returns the updated total-count statement)

## Outcome

Completed: 2026-05-19.

- Updated `docs/MACHINE-FACING-LAYER.md` to state that `world-index` emits 50 story-bundle edge types.
- Added a SPEC-47 STPLAN/STEMO table documenting all 14 new edge types, their source classes, target classes, and semantics.
- Extended the placeholder-skip convention note so STPLAN/STEMO reference-bearing fields follow the same structured-record-id edge-emission discipline as the existing story-edge surface.

## Verification Result

Commands run from the repo root:

1. `grep -cE "plan_(holder|root_intention|belief_basis|resource_basis|blocker|current_step_target|created_by_event|supersedes)|emotion_(holder|trigger_event|appraisal_basis|oriented_toward|supersedes|derived_from)" docs/MACHINE-FACING-LAYER.md` — returned `14`.
2. `grep -nE "STORY_EDGE_TYPES.length.*50|50 story-bundle edge" docs/MACHINE-FACING-LAYER.md` — returned the updated count line.
3. Manual review against `tools/world-index/src/schema/types.ts` and `tools/world-index/src/parse/atomic.ts` — documented edge names and source/target semantics match the 14 STPLAN/STEMO edge extractors landed by `archive/tickets/SPEC47STPSTE-013.md`.

## Deviations

- The drafted total-count grep looked for `50 story-edge`; the live docs use the clearer phrase `50 story-bundle edge types`, so the accepted grep was updated to match the landed wording.
