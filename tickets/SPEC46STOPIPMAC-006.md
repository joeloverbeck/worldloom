# SPEC46STOPIPMAC-006: BEL edge extraction (4 edges: holder, basis.source_event, basis.access_records, consequences.opens)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (4 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryBelief` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (new test file, first Phase C ticket to land it)
**Deps**: None

## Problem

The world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` (`edgesForStoryRecord`) currently extracts 14 edge types per `tools/world-index/src/schema/types.ts:84-99` (`STORY_EDGE_TYPES`); none cover `BEL` record relations. Belief ownership (`BEL.holder`), belief grounding-event provenance (`BEL.basis.source_event`), belief access-route record provenance (`BEL.basis.access_records[]`), and belief opening-debt consequences (`BEL.consequences.opens[]`) are all schema-defined on the `BEL` record at `.claude/skills/_shared-templates/story-record-schemas.md` §4.1 but are not extracted as edges and therefore cannot be queried via `get_neighbors`, graph-walking MCP helpers, or future dramatic-irony / social-pressure packets. This ticket adds the four `BEL`-rooted edges following SPEC-45's `edgesForStoryEvent` pattern and creates the new shared test file for Phase C per-class extractor tests.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES` (14 edge type strings); `tools/world-index/src/parse/atomic.ts:564` is the `edgesForStoryRecord` dispatch site; `tools/world-index/src/parse/atomic.ts:638` is the existing `edgesForStoryEvent` helper from SPEC-45 — the canonical pattern for per-class helpers. The `BEL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.1 carries `holder`, `basis: { source_event, access_records[], ... }`, and `consequences: { opens[], ... }` fields (verified at brainstorm-triage time and re-verified at Step 2).
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the four BEL edges (`belief_holder`, `belief_basis_event`, `belief_access_record`, `belief_opens`) with their source fields and target classes; the §Extractor implementation pattern paragraph names `edgesForStoryBelief` as one of the seven per-class helpers; the §Idempotent rebuild paragraph confirms that `world-index build` is fully deterministic and adding edges does not require bundle migration.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers (`get_neighbors`, `find_referencing_symbols`, future dramatic-irony / social-pressure packet helpers). Adding BEL edges is additive — consumers that don't query the new edge types continue to work unchanged; the master `EdgeType` union spread at `types.ts:108` auto-picks up the new types from `STORY_EDGE_TYPES`.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: BEL state is core ontology with multiple consumer surfaces; making it graph-queryable means skills can walk belief-ownership / belief-grounding relationships via the documented `get_neighbors` retrieval pattern instead of fetching every BEL record and parsing the body. FOUNDATIONS §Story Bundles Rule 4 (No Globalization by Accident) is preserved by the existing `createStoryRefEdge` helper at `tools/world-index/src/parse/atomic.ts:649-650` which carries `storySlug` on every emitted edge row — bundle isolation is structurally maintained.

## Architecture Check

1. Per-class helper pattern mirrors SPEC-45's `edgesForStoryEvent` at `atomic.ts:638` — each helper takes `(node: NodeRow, record: Record<string, unknown>, storySlug: string)` and returns `EdgeRow[]`. Dispatch in `edgesForStoryRecord` switch adds one more case for the `story_belief_record` node type. Alternative considered: one mega-helper handling all 7 record classes with internal switching — rejected because per-class helpers keep each addition independently testable per the spec's §Extractor implementation pattern paragraph.
2. No backwards-compatibility aliasing or shims introduced. The four new edge type strings extend `STORY_EDGE_TYPES` additively; the master `EdgeType` union spread at `types.ts:108` derives automatically. The `placeholder-skip` convention (emit only when field resolves to a known node id) is unused for BEL — all four source fields take record ids, not placeholders.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `BEL` records with each of the four source fields populated emit the expected edge with correct source / target / `edge_type` (T-7 scope).
2. **Per-edge negative case** → schema validation: fixture `BEL` records with the source fields empty or missing emit no edge for that type (T-7 scope).
3. **Registry completeness preservation** → codebase grep-proof: the four new edge types appear in `STORY_EDGE_TYPES` and are reachable via the `StoryEdgeType` type derivation at `types.ts:101`.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with four new edge type strings

In `tools/world-index/src/schema/types.ts:84-99`, add four entries to the `STORY_EDGE_TYPES` const array: `"belief_holder"`, `"belief_basis_event"`, `"belief_access_record"`, `"belief_opens"`. The `StoryEdgeType` type at line 101 derives automatically; the master `EdgeType` union spread at line 108 auto-picks up the additions.

### 2. Implement `edgesForStoryBelief` helper

In `tools/world-index/src/parse/atomic.ts`, add a new helper `edgesForStoryBelief(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]` following the `edgesForStoryEvent` pattern at line 638. For each of the four source fields:
- `BEL.holder` → emit one `belief_holder` edge from node id to the holder STENT id (use `createStoryRefEdge`).
- `BEL.basis.source_event` → emit one `belief_basis_event` edge from node id to the source SE id (skip when null).
- `BEL.basis.access_records[]` → iterate the array and emit one `belief_access_record` edge per record id.
- `BEL.consequences.opens[]` → iterate the array and emit one `belief_opens` edge per record id.

Use `readNestedString` / `stringArrayField` / equivalent helpers for nested-path access; the implementation ticket inspects `atomic.ts` for the correct helper names if they differ from the SPEC-45 pattern.

### 3. Wire `edgesForStoryBelief` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts:564` (`edgesForStoryRecord`), add a dispatch branch for the `story_belief_record` node type that calls `edgesForStoryBelief` and pushes its edges into the result. The exact dispatch shape follows SPEC-45's wiring at lines around 591 (`if (node.node_type === "story_event_record") { for (const edge of edgesForStoryEvent(...)) edges.push(edge); }` style).

### 4. Create `tools/world-index/tests/story-bundle-edges.test.ts` with positive + negative cases for the four BEL edges

This ticket creates the new test file. Subsequent Phase C tickets (007-013) append per-class tests to this file. For each of the four BEL edges, add:
- Positive test: fixture `BEL` record with the source field populated; assert exactly one edge of the expected type emits with correct source / target.
- Negative test: fixture `BEL` record with the source field empty / missing; assert no edge of that type emits.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 4 entries to `STORY_EDGE_TYPES`)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryBelief` helper + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (new — first Phase C test file; subsequent per-class tickets 007-013 append to it)

## Out of Scope

- Other per-class extractors (SREL in 007, STINT in 008, STSTAT in 009, CLK in 010, STSEC in 011, STQ in 012, SE extension in 013).
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion at `tools/world-index/tests/types.test.ts` — that lands once all per-class tickets have shipped; tracking it across each per-class ticket would cause merge-conflict thrash. The capstone ticket 015 confirms the final count via end-to-end build.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — not applicable to BEL (all four source fields take record ids, not placeholder strings).

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `belief_holder`, `belief_basis_event`, `belief_access_record`, `belief_opens` — each emits exactly one edge per populated source field with correct source / target / `edge_type` (T-7 scope for the four edges).
2. Negative tests for the same four edges — empty / missing source fields emit no edge of that type.
3. `npm test --prefix tools/world-index` passes for the full world-index test suite.
4. `npm run build --prefix tools/world-index` typechecks cleanly with the extended `STORY_EDGE_TYPES`.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. The four new edge type strings are reachable via the `StoryEdgeType` type derivation at `types.ts:101` and the master `EdgeType` union spread at `types.ts:108`.
3. `edgesForStoryBelief` is independently testable from sibling per-class helpers — no shared state between extractors.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — NEW: create the shared Phase C edge-extraction test file; add positive + negative tests for the four BEL edges. Subsequent Phase C tickets 007-013 append their per-class tests to this file.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new BEL edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
