# SPEC79CHCREM-004: Remove `choice_associated_storylet` edge from world-index schema and parser

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (STORY_EDGE_TYPES enum); `tools/world-index/src/parse/atomic.ts` (CHC parser); three world-index regression tests plus two integration registry-count assertions.
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

Before this ticket, world-index emitted a `choice_associated_storylet` edge from each CHC node to the SLT named by its `associated_commitment_block` field. Once SPEC79CHCREM-001 dropped the field from the schema, the parser could no longer read it; this ticket removes the edge type from the enum and removes the extraction call from the CHC parser. Three world-index regression tests pinned the edge-type enumeration and CHC parse output, and two integration tests pinned the old registry count; all were updated to match the new 3-edge CHC parity (`created_at_page` + `choice_grounded_in` + `choice_affordance_ordinal`).

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/world-index/src/schema/types.ts:111` declares `"choice_associated_storylet"` in the `STORY_EDGE_TYPES` enum at lines 108-168. Confirmed `tools/world-index/src/parse/atomic.ts:795-801` emits the edge via a 7-line `pushStoryEdgeIfReference` call that reads `stringField(record, "associated_commitment_block")`.
2. Confirmed SPEC-79 §3.3 prescribes the edge-class removal alongside the parser removal and the three test updates. The retired-edge consumer at archived SPEC-51 §A.1 (which relied on `page_emitted_choice ∩ choice_associated_storylet` for selected-CHC resolution) is superseded by the new `PG.input.choice_id` resolver per §2.2; no live consumer remains.
3. Cross-skill boundary: the world-index emits edges that are consumed by retrieval surfaces (`mcp__worldloom__get_neighbors`, `get_record_field`, `find_impacted_fragments`, context-packet edge projections). With the edge type removed from the enum, the retrieval surfaces will no longer project this edge for CHC nodes — consumers that previously queried for `choice_associated_storylet` would now get zero results. No production consumer of this specific edge exists outside the archived SPEC-51 resolver (confirmed via the reassessment session's exhaustive grep). The `docs/MACHINE-FACING-LAYER.md:137` table-row deletion (handled in ticket 008) documents the removal for downstream readers.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the edge was load-bearing only because the field it indexed was load-bearing; once both are removed, no validation gate, replay primitive, or retrieval consumer depends on this edge.
5. Removal blast radius (was template item 7): the edge type is removed from the enum (this ticket), the extraction call is removed from the parser (this ticket), and three world-index regression tests are updated (this ticket). The docs table-row deletion (008) and the IMPLEMENTATION-ORDER's mention of this work (informational only) round out the removal. No other consumer queries this edge type.
6. Baseline and proof-surface correction: after `npm run build`, pre-edit `npm test` failed only in `CHC parity fixtures satisfy the story-choice schema field contract` because the already-updated story-choice schema rejected the old `associated_commitment_block` test fixture. After the parser/test removal, the broad suite exposed two additional same-seam registry-count assertions (`spec46-story-bundle-edges-integration.test.ts`, `spec47-stplan-stemo-edges-integration.test.ts`) plus the aggregate `EDGE_TYPES` count in `types.test.ts`; those counts moved from 76 story edges / 91 total edges to 75 story edges / 90 total edges as required fallout from removing exactly one edge type.

## Architecture Check

1. Removing the edge type from the enum is cleaner than leaving the type declared but never emitted: a never-emitted edge type would be a dead declaration that future consumers might query in vain. Per SPEC-79 §3.3 acceptance, the world-index build emits no `choice_associated_storylet` edges; the three tests pass against the new 3-edge CHC parity.
2. No backwards-compatibility aliasing/shims introduced. The edge type is removed outright; no migration path for old database rows is preserved (the world-index is a derived artifact rebuilt from `_source/` on each `world-index build` invocation, per `docs/FOUNDATIONS.md` §Mandatory World Files derived-artifacts clause).

## Verification Layers

1. The `STORY_EDGE_TYPES` enum no longer contains `"choice_associated_storylet"` → codebase grep-proof: `grep -n "choice_associated_storylet" tools/world-index/src/schema/types.ts` returns zero matches.
2. The CHC parser no longer emits the edge → codebase grep-proof: `grep -n "choice_associated_storylet" tools/world-index/src/parse/atomic.ts` returns zero matches.
3. The three world-index regression tests pass against the new 3-edge CHC parity → schema validation: `cd tools/world-index && npm test` runs to completion with zero new failures.
4. The CHC node now produces exactly 3 edges: `created_at_page`, `choice_grounded_in`, and `choice_affordance_ordinal` (when affordance ordinals are present) → manual review of the atomic.ts diff plus regression-test coverage of the per-CHC edge count.

## Landed Changes

### 1. `tools/world-index/src/schema/types.ts`

- Removed `"choice_associated_storylet"` from the `STORY_EDGE_TYPES` enum. The enum's other entries (page_emitted_choice, choice_grounded_in, choice_affordance_ordinal, storylet_predicate_ref, storylet_effect_ref, storylet_exit_likely_effect_ref, event_selected_storylet, plus all non-CHC edge types) remain unchanged.

### 2. `tools/world-index/src/parse/atomic.ts`

- Removed the `pushStoryEdgeIfReference(edges, node.node_id, "choice_associated_storylet", storySlug, stringField(record, "associated_commitment_block"))` call. The surrounding parser code (the `choice_grounded_in` extraction and the `choice_affordance_ordinal` extraction) remains unchanged.

### 3. `tools/world-index/tests/types.test.ts`

- Dropped the `STORY_EDGE_TYPES.includes("choice_associated_storylet")` assertion and updated the `STORY_EDGE_TYPES` / aggregate `EDGE_TYPES` counts to 75 / 90.

### 4. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts`

- Dropped the `"associated_commitment_block: SLT-3"` line from the test CHC YAML.
- Dropped the `edge("CHC-2", "SLT-3", "choice_associated_storylet")` expected entry.
- The test's other expected edges (created_at_page, choice_grounded_in, choice_affordance_ordinal) remain in the expected list, and the test title now names only the surviving CHC edge families.

### 5. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`

- Dropped the `"associated_commitment_block: SLT-3"` line from the test CHC YAML.
- Dropped `"choice_associated_storylet"` from the expected edge-type list. The other expected edge types remain in the list.

### 6. Integration registry-count assertions

- Updated `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` and `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` from 76 to 75 registered story edge types so those capstone guards reflect the removed edge.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` (modify)
- `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` (modify)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The validator rewrites (handled in 002, 003).
- The docs/MACHINE-FACING-LAYER.md table-row deletion (handled in 008, which depends on this ticket).
- Skill-side documentation updates (handled in 005, 006, 007).
- World-canon CF/CH record schemas (not affected by this change).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` runs to completion with zero new failures.
2. The broad `cd tools/world-index && npm test` run covers the updated CHC edge fixture, atomic story-edge parity fixture, registry count test, and two integration registry-count assertions.

### Invariants

1. The world-index emits exactly 3 edges per CHC node post-landing: `created_at_page`, `choice_grounded_in`, and `choice_affordance_ordinal` (when affordance ordinals are present).
2. The `STORY_EDGE_TYPES` enum is the single source of truth for edge-type membership; no parser may emit an edge type not declared in the enum.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/types.test.ts` — drop the edge-type membership assertion.
2. `tools/world-index/tests/parse/atomic-edges-for-choice-and-storylet.test.ts` — drop the CHC field line and the expected edge entry.
3. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` — drop the CHC field line and the expected edge-type entry.
4. `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` — update story edge registry count from 76 to 75.
5. `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` — update story edge registry count from 76 to 75.

### Commands

1. `cd tools/world-index && npm test`
2. `grep -R -n "choice_associated_storylet" tools/world-index/src tools/world-index/tests` returns zero matches.
3. `grep -n "associated_commitment_block" tools/world-index/src/parse/atomic.ts` returns zero matches.

## Outcome

Completed on 2026-05-24. The `choice_associated_storylet` edge type is no longer registered in world-index, the CHC parser no longer reads `associated_commitment_block`, and the CHC parser parity fixtures now assert only `created_at_page`, `choice_grounded_in`, and `choice_affordance_ordinal`. Same-seam registry-count tests now expect 75 story edge types and 90 total edge types.

## Verification Result

1. `cd tools/world-index && npm run build` — PASS; TypeScript compiled the updated source and tests.
2. `cd tools/world-index && npm test` — PASS after same-seam count fallout was updated; final summary was 131 tests, 131 pass, 0 fail.
3. `grep -R -n "choice_associated_storylet" tools/world-index/src tools/world-index/tests` — PASS; no matches.
4. `grep -n "associated_commitment_block" tools/world-index/src/parse/atomic.ts` — PASS; no matches.
5. `cd tools/world-index && npm test -- --test-name-pattern='atomic-edges-for-choice-and-storylet'` — PASS, but the package wrapper still executed the full compiled suite; final summary was again 131 tests, 131 pass, 0 fail. The active acceptance surface is therefore the broad package suite above, not filtered subtest execution.

## Deviations

- Pre-edit baseline after `npm run build` showed the broad `npm test` suite already red in `CHC parity fixtures satisfy the story-choice schema field contract` because SPEC79CHCREM-001 had removed the schema field while the world-index test fixture still carried `associated_commitment_block`. This ticket repaired that owned baseline failure.
- The original ticket listed three regression tests, but final proof exposed two additional integration registry-count assertions and one aggregate edge-count assertion in `tools/world-index/tests/types.test.ts`. Updating those counts is same-seam fallout from removing exactly one registered edge type, not separate behavior.
