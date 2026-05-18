# SPEC46STOPIPMAC-013: SE event-edge extension (3 edges: actor, targets, commitment.selected_slt_id)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (3 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (extends existing `edgesForStoryEvent` helper at line 638 — does NOT add a new helper), `tools/world-index/tests/story-bundle-edges.test.ts` (append SE-extension tests)
**Deps**: None

## Problem

The existing `edgesForStoryEvent` helper at `tools/world-index/src/parse/atomic.ts:638` (landed in SPEC-45) extracts three provenance edges from `SE` records: `state_delta_create`, `state_delta_supersede`, `creation_evidence`. It does NOT extract three additional `SE`-rooted relations that are schema-defined on the `SE` record per `.claude/skills/_shared-templates/story-record-schemas.md` §4.3: actor identity (`SE.actor`), event-target records (`SE.targets[]`), and selected-storylet provenance (`SE.commitment.selected_slt_id`). Adding these three edges completes the SE-relation surface and enables actor-walking / target-walking / storylet-selection queries via `get_neighbors`. This ticket EXTENDS the existing `edgesForStoryEvent` (does not add a new per-class helper) since SE already has a helper from SPEC-45.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:638` is the existing `edgesForStoryEvent` helper (from SPEC-45). The `SE` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.3 carries `actor` (STENT id), `targets[]` (polymorphic record ids per `SE.targets[]`'s shape), and `commitment.selected_slt_id` (SLT id or null per audit-only `SE` events that omit commitment) fields. SPEC-45's `creation_evidence` skip-when-non-id pattern (per `atomic.ts:645-656`) is the canonical model for the `selected_slt_id` null skip.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the three SE edges (`event_actor`, `event_target`, `event_selected_storylet`) and Deliverable D-C3 explicitly says *"Extend the existing `edgesForStoryEvent` helper to emit `event_actor`, `event_target`, `event_selected_storylet` edges."* — the spec is explicit that this is an extension of an existing helper, not a new per-class helper.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by future packets (deferred per SPEC-46 §Out of Scope items 3-7). The SE extension is additive — consumers that don't query the new edge types continue to work unchanged; the existing `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges are unaffected.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: SE is the causal-tick record at story scope; making actor / target / selected-storylet relations graph-queryable supports any future audit or query that walks "who did what with which storylet to whom". FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge` carrying `storySlug` on every emitted edge.

## Architecture Check

1. Extending the existing `edgesForStoryEvent` helper (rather than adding a new per-class helper) is mandated by spec §D-C3 and matches the SPEC-45 pattern. The extension adds three new edge-emission paths inside the existing helper's body. The `commitment.selected_slt_id` null skip matches the existing SPEC-45 pattern at `atomic.ts:645-656` (`creation_evidence` skips non-id entries). Alternative considered: factor a new `edgesForStoryEventExtensions` helper called by `edgesForStoryEvent` — rejected because the spec is explicit about extending the existing helper; factoring would diverge from spec intent and create unnecessary indirection.
2. No backwards-compatibility aliasing or shims introduced. The three new edge type strings extend `STORY_EDGE_TYPES` additively.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `SE` records with `actor`, `targets[]`, and `commitment.selected_slt_id` populated emit the expected edges with correct source / target / `edge_type` (T-7 scope).
2. **Per-edge negative case** → schema validation: fixture audit-only `SE` with `commitment` omitted emits no `event_selected_storylet` edge.
3. **Existing-edge preservation** → schema validation: the same fixture `SE` records still emit the SPEC-45 `state_delta_create`, `state_delta_supersede`, `creation_evidence` edges unchanged.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite including the SPEC-45 integration test at `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with three new edge type strings

In `tools/world-index/src/schema/types.ts:84-99`, add three entries to `STORY_EDGE_TYPES`: `"event_actor"`, `"event_target"`, `"event_selected_storylet"`.

### 2. Extend the existing `edgesForStoryEvent` helper with three new edge emissions

In `tools/world-index/src/parse/atomic.ts:638` (`edgesForStoryEvent`), add three new edge-emission paths within the existing helper's body:
- `SE.actor` → emit one `event_actor` edge from node id to the actor STENT id.
- `SE.targets[]` → iterate the polymorphic array and emit one `event_target` edge per element (handle the polymorphic shape — each entry is a record id; if the schema uses nested structure with a `record` field, project that sub-field).
- `SE.commitment.selected_slt_id` → emit one `event_selected_storylet` edge from node id to the selected SLT id, SKIPPING when `commitment` is omitted or `selected_slt_id` is null (audit-only `SE` events).

### 3. Append SE-extension tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Append positive + negative tests for the three SE-extension edges. Include a regression test confirming that the existing SPEC-45 edges (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) still emit unchanged from the same fixture `SE` record.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 3 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — EXTEND existing `edgesForStoryEvent` at line 638; do NOT add a new helper)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append SE-extension tests including SPEC-45-edge-preservation regression)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, STSTAT in 009, CLK in 010, STSEC in 011, STQ in 012).
- Refactoring `edgesForStoryEvent` into multiple helpers — explicitly out of scope per spec D-C3.
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — `SE.actor` is always a STENT id, never a placeholder.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `event_actor`, `event_target`, `event_selected_storylet` — each emits expected edges with correct source / target / `edge_type` (T-7 scope).
2. Negative test for `event_selected_storylet` with audit-only `SE` (no `commitment`) — no edge emitted.
3. Existing-edge preservation regression — same fixture `SE` records emit `state_delta_create`, `state_delta_supersede`, `creation_evidence` edges unchanged (validates no regression in SPEC-45's surface).
4. `npm test --prefix tools/world-index` passes for the full world-index test suite including `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.
5. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. The SPEC-45 `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges are unaffected by this extension.
3. `commitment: null` (audit-only `SE` events per spec §C edge table) NEVER produces an `event_selected_storylet` edge.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + SPEC-45-preservation tests for the three SE-extension edges.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new SE-extension edge tests AND SPEC-45 integration regression)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
