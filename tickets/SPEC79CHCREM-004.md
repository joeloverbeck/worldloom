# SPEC79CHCREM-004: Remove `choice_associated_storylet` edge from world-index schema and parser

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (STORY_EDGE_TYPES enum); `tools/world-index/src/parse/atomic.ts` (CHC parser); three world-index regression tests.
**Deps**: SPEC79CHCREM-001

## Problem

The world-index emits a `choice_associated_storylet` edge from each CHC node to the SLT named by its `associated_commitment_block` field. Once SPEC79CHCREM-001 drops the field from the schema, the parser cannot read it; the edge type must be removed from the enum and the extraction call must be removed from the CHC parser. Three world-index regression tests pin the edge-type enumeration and the CHC parse output; all three must be updated to match the new 3-edge CHC parity (`created_at_page` + `choice_grounded_in` + `choice_affordance_ordinal`).

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/world-index/src/schema/types.ts:111` declares `"choice_associated_storylet"` in the `STORY_EDGE_TYPES` enum at lines 108-168. Confirmed `tools/world-index/src/parse/atomic.ts:795-801` emits the edge via a 7-line `pushStoryEdgeIfReference` call that reads `stringField(record, "associated_commitment_block")`.
2. Confirmed SPEC-79 §3.3 prescribes the edge-class removal alongside the parser removal and the three test updates. The retired-edge consumer at archived SPEC-51 §A.1 (which relied on `page_emitted_choice ∩ choice_associated_storylet` for selected-CHC resolution) is superseded by the new `PG.input.choice_id` resolver per §2.2; no live consumer remains.
3. Cross-skill boundary: the world-index emits edges that are consumed by retrieval surfaces (`mcp__worldloom__get_neighbors`, `get_record_field`, `find_impacted_fragments`, context-packet edge projections). With the edge type removed from the enum, the retrieval surfaces will no longer project this edge for CHC nodes — consumers that previously queried for `choice_associated_storylet` would now get zero results. No production consumer of this specific edge exists outside the archived SPEC-51 resolver (confirmed via the reassessment session's exhaustive grep). The `docs/MACHINE-FACING-LAYER.md:137` table-row deletion (handled in ticket 008) documents the removal for downstream readers.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the edge was load-bearing only because the field it indexed was load-bearing; once both are removed, no validation gate, replay primitive, or retrieval consumer depends on this edge.
5. Removal blast radius (was template item 7): the edge type is removed from the enum (this ticket), the extraction call is removed from the parser (this ticket), and three world-index regression tests are updated (this ticket). The docs table-row deletion (008) and the IMPLEMENTATION-ORDER's mention of this work (informational only) round out the removal. No other consumer queries this edge type.

## Architecture Check

1. Removing the edge type from the enum is cleaner than leaving the type declared but never emitted: a never-emitted edge type would be a dead declaration that future consumers might query in vain. Per SPEC-79 §3.3 acceptance, the world-index build emits no `choice_associated_storylet` edges; the three tests pass against the new 3-edge CHC parity.
2. No backwards-compatibility aliasing/shims introduced. The edge type is removed outright; no migration path for old database rows is preserved (the world-index is a derived artifact rebuilt from `_source/` on each `world-index build` invocation, per `docs/FOUNDATIONS.md` §Mandatory World Files derived-artifacts clause).

## Verification Layers

1. The `STORY_EDGE_TYPES` enum no longer contains `"choice_associated_storylet"` → codebase grep-proof: `grep -n "choice_associated_storylet" tools/world-index/src/schema/types.ts` returns zero matches.
2. The CHC parser no longer emits the edge → codebase grep-proof: `grep -n "choice_associated_storylet" tools/world-index/src/parse/atomic.ts` returns zero matches.
3. The three world-index regression tests pass against the new 3-edge CHC parity → schema validation: `cd tools/world-index && npm test` runs to completion with zero new failures.
4. The CHC node now produces exactly 3 edges: `created_at_page`, `choice_grounded_in`, and `choice_affordance_ordinal` (when affordance ordinals are present) → manual review of the atomic.ts diff plus regression-test coverage of the per-CHC edge count.

## What to Change

### 1. `tools/world-index/src/schema/types.ts`

- Remove `"choice_associated_storylet"` from the `STORY_EDGE_TYPES` enum at line 111. The enum's other entries (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal, storylet_predicate_ref, storylet_effect_ref, storylet_exit_likely_effect_ref, event_selected_storylet, plus all non-CHC edge types) remain unchanged.

### 2. `tools/world-index/src/parse/atomic.ts`

- Remove the 7-line block at lines 795-801 that calls `pushStoryEdgeIfReference(edges, node.node_id, "choice_associated_storylet", storySlug, stringField(record, "associated_commitment_block"))`. The surrounding parser code (the `choice_grounded_in` extraction at lines 791-793 and the `choice_affordance_ordinal` extraction at lines 803-815) remains unchanged.

### 3. `tools/world-index/tests/types.test.ts`

- Drop the `STORY_EDGE_TYPES.includes("choice_associated_storylet")` assertion at line 88. The other edge-type assertions in this file remain unchanged.

### 4. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts`

- Drop the `"associated_commitment_block: SLT-3"` line from the test CHC YAML at line 21.
- Drop the `edge("CHC-2", "SLT-3", "choice_associated_storylet")` expected entry at line 40.
- The test's other expected edges (created_at_page, choice_grounded_in, choice_affordance_ordinal) remain in the expected list.

### 5. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`

- Drop the `"associated_commitment_block: SLT-3"` line from the test CHC YAML at line 26.
- Drop `"choice_associated_storylet"` from the expected edge-type list at line 31. The other expected edge types remain in the list.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The validator rewrites (handled in 002, 003).
- The docs/MACHINE-FACING-LAYER.md table-row deletion (handled in 008, which depends on this ticket).
- Skill-side documentation updates (handled in 005, 006, 007).
- World-canon CF/CH record schemas (not affected by this change).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` runs to completion with zero new failures.
2. `cd tools/world-index && npm test -- --test-name-pattern='atomic-edges-for-choice-and-storylet'` passes against the updated expected-edge list.
3. `cd tools/world-index && npm test -- --test-name-pattern='atomic-story-edge-parity'` passes against the updated expected-edge-type list.
4. `cd tools/world-index && npm test -- --test-name-pattern='types'` passes against the updated STORY_EDGE_TYPES enum.

### Invariants

1. The world-index emits exactly 3 edges per CHC node post-landing: `created_at_page`, `choice_grounded_in`, and `choice_affordance_ordinal` (when affordance ordinals are present).
2. The `STORY_EDGE_TYPES` enum is the single source of truth for edge-type membership; no parser may emit an edge type not declared in the enum.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/types.test.ts` — drop the edge-type membership assertion.
2. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` — drop the CHC field line and the expected edge entry.
3. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` — drop the CHC field line and the expected edge-type entry.

### Commands

1. `cd tools/world-index && npm test`
2. `grep -n "choice_associated_storylet" tools/world-index/src/ tools/world-index/tests/` returns zero matches.
3. `grep -n "associated_commitment_block" tools/world-index/src/parse/atomic.ts` returns zero matches.
