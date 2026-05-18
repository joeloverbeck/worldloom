# SPEC46STOPIPMAC-013: SE event-edge extension (3 edges: actor, targets, commitment.selected_slt_id)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (3 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (extends existing `edgesForStoryEvent` helper — does NOT add a new helper), `tools/world-index/tests/story-bundle-edges.test.ts` (SE-extension tests), `tools/world-index/tests/structured-edges.test.ts` (same-seam expectation updates), `tools/world-index/tests/types.test.ts` (existing registry count assertion updated from 33/48 to 36/51)
**Deps**: None

## Problem

Before this ticket, the existing `edgesForStoryEvent` helper at `tools/world-index/src/parse/atomic.ts` (landed in SPEC-45) extracted three provenance edges from `SE` records: `state_delta_create`, `state_delta_supersede`, `creation_evidence`. It did not extract three additional `SE`-rooted relations that are schema-defined on the `SE` record per `.claude/skills/_shared-templates/story-record-schemas.md` §4.3: actor identity (`SE.actor`), event-target records (`SE.targets[]`), and selected-storylet provenance (`SE.commitment.selected_slt_id`). Adding these three edges completes the SE-relation surface and enables actor-walking / target-walking / storylet-selection queries via `get_neighbors`. This ticket extends the existing `edgesForStoryEvent` (does not add a new per-class helper) since SE already has a helper from SPEC-45.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts` contains the existing `edgesForStoryEvent` helper (from SPEC-45). The `SE` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.3 carries `actor: STENT-<integer> | system | unknown`, `targets[]` (story record ids), and `commitment.selected_slt_id` (SLT id or null per audit-only `SE` events that omit commitment) fields. Live reassessment corrected the draft's "actor is always STENT" claim: `event_actor` emits only when `actor` is a structured story-record id and skips `system` / `unknown` placeholders, matching the placeholder-skip convention already used by `clock_driver` and `secret_holder`.
2. `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the three SE edges (`event_actor`, `event_target`, `event_selected_storylet`) and Deliverable D-C3 explicitly says *"Extend the existing `edgesForStoryEvent` helper to emit `event_actor`, `event_target`, `event_selected_storylet` edges."* — the spec is explicit that this is an extension of an existing helper, not a new per-class helper. The implementation also truthed the spec with a dated note so downstream tickets 014/015 know Phase C SE extraction is landed.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by future packets (deferred per SPEC-46 §Out of Scope items 3-7). The SE extension is additive — consumers that don't query the new edge types continue to work unchanged; the existing `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges are preserved and the older structured-edge tests now assert the added `event_selected_storylet` row where their fixture already carries `commitment.selected_slt_id`.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: SE is the causal-tick record at story scope; making actor / target / selected-storylet relations graph-queryable supports any future audit or query that walks "who did what with which storylet to whom". FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge` carrying `storySlug` on every emitted edge.

## Architecture Check

1. Extending the existing `edgesForStoryEvent` helper (rather than adding a new per-class helper) is mandated by spec §D-C3 and matches the SPEC-45 pattern. The extension adds three new edge-emission paths inside the existing helper's body. The `actor` skip for `system` / `unknown` and the `commitment.selected_slt_id` null skip match the existing structured-id emission discipline used by Phase C placeholder-aware edges. Alternative considered: factor a new `edgesForStoryEventExtensions` helper called by `edgesForStoryEvent` — rejected because the spec is explicit about extending the existing helper; factoring would diverge from spec intent and create unnecessary indirection.
2. No backwards-compatibility aliasing or shims introduced. The three new edge type strings extend `STORY_EDGE_TYPES` additively.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `SE` records with `actor`, `targets[]`, and `commitment.selected_slt_id` populated emit the expected edges with correct source / target / `edge_type` (T-7 scope).
2. **Per-edge negative case** → schema validation: fixture audit-only `SE` with `commitment` omitted emits no `event_selected_storylet` edge, and placeholder `actor: system | unknown` emits no `event_actor` edge.
3. **Existing-edge preservation** → schema validation: the same fixture `SE` records still emit the SPEC-45 `state_delta_create`, `state_delta_supersede`, `creation_evidence` edges unchanged.
4. **No regression on existing edges** → `npm test` from `tools/world-index` passes for the full world-index test suite including the SPEC-45 integration test at `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with three new edge type strings

In `tools/world-index/src/schema/types.ts`, added three entries to `STORY_EDGE_TYPES`: `"event_actor"`, `"event_target"`, `"event_selected_storylet"`.

### 2. Extend the existing `edgesForStoryEvent` helper with three new edge emissions

In `tools/world-index/src/parse/atomic.ts` (`edgesForStoryEvent`), added three new edge-emission paths within the existing helper's body:
- `SE.actor` → emit one `event_actor` edge from node id to the actor STENT id when actor is a structured story-record id; skip `system` / `unknown`.
- `SE.targets[]` → iterate the polymorphic array and emit one `event_target` edge per element (handle the polymorphic shape — each entry is a record id; if the schema uses nested structure with a `record` field, project that sub-field).
- `SE.commitment.selected_slt_id` → emit one `event_selected_storylet` edge from node id to the selected SLT id, SKIPPING when `commitment` is omitted or `selected_slt_id` is null (audit-only `SE` events).

### 3. Append SE-extension tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Appended positive + negative tests for the three SE-extension edges. The positive test also confirms that the existing SPEC-45 edges (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) still emit from the same fixture `SE` record.

### 4. Truth existing same-package proof fixtures

Updated the existing structured-edge tests to expect `event_selected_storylet` from fixtures that already carried `commitment.selected_slt_id`, and updated the existing registry count assertion to the post-ticket `STORY_EDGE_TYPES.length === 36` / total edge count `51`. This was required same-seam proof fallout because the package test lane already asserted the registry total.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 3 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — EXTEND existing `edgesForStoryEvent`; do NOT add a new helper)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append SE-extension tests including SPEC-45-edge-preservation regression)
- `tools/world-index/tests/structured-edges.test.ts` (modify — same-seam expectation update for fixtures that now emit `event_selected_storylet`)
- `tools/world-index/tests/types.test.ts` (modify — existing registry count assertion updated to the post-013 totals)
- `archive/specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (modify — dated implementation note for ticket 013)
- `archive/tickets/SPEC46STOPIPMAC-015.md` (modify — capstone wording truthed because the existing registry assertion moved with ticket 013)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, STSTAT in 009, CLK in 010, STSEC in 011, STQ in 012).
- Refactoring `edgesForStoryEvent` into multiple helpers — explicitly out of scope per spec D-C3.
- End-to-end capstone fixture proving all 22 Phase C edges through `world-index build` — capstone ticket 015. This ticket updated the existing registry-count assertion because it was already part of the package suite that proves this SE change.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- New placeholder-skip documentation — docs ticket 014 owns the cross-cutting operator-facing convention prose; this ticket only applies the live schema-faithful skip for `SE.actor`.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `event_actor`, `event_target`, `event_selected_storylet` — each emits expected edges with correct source / target / `edge_type` (T-7 scope).
2. Negative tests for `event_selected_storylet` with audit-only `SE` (no `commitment`) and `event_actor` with placeholder actors — no edge emitted.
3. Existing-edge preservation regression — same fixture `SE` records emit `state_delta_create`, `state_delta_supersede`, `creation_evidence` edges unchanged (validates no regression in SPEC-45's surface).
4. `npm test` from `tools/world-index` passes for the full world-index test suite including `tools/world-index/tests/integration/spec45-atomic-integration.test.ts`.
5. `npm run build` from `tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. The SPEC-45 `state_delta_create` / `state_delta_supersede` / `creation_evidence` edges are unaffected by this extension.
3. `commitment: null` (audit-only `SE` events per spec §C edge table) NEVER produces an `event_selected_storylet` edge, and `actor: system | unknown` never produces an `event_actor` edge.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — appended positive + negative + SPEC-45-preservation tests for the three SE-extension edges.
2. `tools/world-index/tests/structured-edges.test.ts` — updated older SE fixtures to expect the newly emitted `event_selected_storylet` row.
3. `tools/world-index/tests/types.test.ts` — updated the existing registry count assertion to 36 story-edge types and 51 total edge types.

### Commands

1. `npm test` from `tools/world-index` (targeted: full world-index test suite passes including new SE-extension edge tests AND SPEC-45 integration regression)
2. `npm run build` from `tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)

## Outcome

Completed: 2026-05-18

Ticket 013 landed the Phase C SE edge extension in `tools/world-index`: `event_actor`, `event_target`, and `event_selected_storylet` are registered in `STORY_EDGE_TYPES` and emitted by the existing `edgesForStoryEvent` helper. `event_actor` is schema-faithful to the live SE contract: it emits for structured story-record ids and skips `system` / `unknown` placeholders. `event_target` emits one edge per target id, and `event_selected_storylet` emits when `commitment.selected_slt_id` is present.

The implementation also updated same-seam proof fixtures: `story-bundle-edges.test.ts` covers positive and negative SE extraction, `structured-edges.test.ts` preserves existing SPEC-45 event-edge expectations with the newly emitted selected-storylet edge, and `types.test.ts` now asserts the existing registry totals at 36 story-edge types / 51 total edge types.

## Verification Result

- `npm run build` from `tools/world-index` — passed.
- `npm test` from `tools/world-index` — passed, 118 tests.

## Deviations

- Live schema reassessment corrected the draft's `SE.actor` assumption. The schema allows `system` and `unknown`, so `event_actor` skips those placeholder values instead of emitting invalid story-record references.
- The existing `tools/world-index/tests/types.test.ts` registry-count assertion had to move in this ticket, even though the draft assigned the 36-count capstone assertion to ticket 015. Without this same-seam proof update, the accepted package test lane would be false-red after adding the three SE edge types.
