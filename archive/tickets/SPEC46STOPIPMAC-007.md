# SPEC46STOPIPMAC-007: SREL edge extraction (2 edges: participants, derived_from)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (2 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryRelationship` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests), `tools/world-index/tests/types.test.ts` (current registry count truthing)
**Deps**: None

## Problem

At intake, the world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` did not extract `SREL` (relationship) record relations. Relationship-participant ownership (`SREL.participants[]`) and relationship-provenance derivation (`SREL.derived_from[]`) are schema-defined on the `SREL` record but were not extracted as edges and therefore could not be queried via graph traversal. This ticket added the two `SREL`-rooted edges following the per-class helper pattern established by SPEC46STOPIPMAC-006.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site; SPEC46STOPIPMAC-006 establishes the per-class helper pattern. The `SREL` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.x carries `participants[]` (typically a STENT id pair) and `derived_from[]` (record ids — any class) fields.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the two SREL edges (`relationship_participant`, `relationship_derived_from`) with their source fields. The §Extractor implementation pattern paragraph names `edgesForStoryRelationship` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the active-relationships-by-participant projection landed in `archive/tickets/SPEC46STOPIPMAC-003.md`. Adding SREL edges is additive — consumers that don't query the new edge types continue to work unchanged.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making SREL participant / provenance relations graph-queryable supports the relationship-axis predicates (`relationship_axis` / `any_relationship_axis` per `story-state-contract.md` §5) and prepares for future social-state-firewall prefiltering. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge` carrying `storySlug` on every emitted edge.
5. Reassessment correction: the ticket draft's dispatch note said `story_relationship_record`, but the live parser vocabulary uses `relationship_record_story` (`tools/world-index/src/parse/atomic.ts` relationship record spec and `tools/world-index/src/schema/types.ts` node registry). The implementation branch and tests use the live node type; this is a mechanical vocabulary correction, not a behavior change.
6. Same-seam proof fallout: `tools/world-index/tests/types.test.ts` currently asserts the post-BEL count (`STORY_EDGE_TYPES.length === 18`, total `EDGE_TYPES.length === 33`). Adding the two SREL edge strings makes that current-count proof stale, so this ticket updates it to the post-SREL count while leaving final `36` completeness to SPEC46STOPIPMAC-015.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryRelationship` iterates `SREL.participants[]` (typically two STENT ids) and `SREL.derived_from[]` (record ids) and emits one edge per element. The participant pair is emitted as two separate `relationship_participant` edges (one per participant) rather than as a single grouped edge — this matches the per-element edge pattern used by SPEC-45's `creation_evidence` extractor for arrays.
2. No backwards-compatibility aliasing or shims introduced. The two new edge type strings extend `STORY_EDGE_TYPES` additively.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `SREL` records with `participants[]` and `derived_from[]` populated emit the expected edges with correct source / target / `edge_type` (T-7 scope).
2. **Per-edge negative case** → schema validation: fixture `SREL` records with empty arrays emit no edges of those types (T-7 scope).
3. **Participant pair handling** → schema validation: a 2-participant `SREL` emits exactly two `relationship_participant` edges, one per participant id.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## Landed Changes

### 1. Extended `STORY_EDGE_TYPES` with two new edge type strings

In `tools/world-index/src/schema/types.ts`, added two entries to `STORY_EDGE_TYPES`: `"relationship_participant"`, `"relationship_derived_from"`.

### 2. Implemented `edgesForStoryRelationship` helper

In `tools/world-index/src/parse/atomic.ts`, added `edgesForStoryRelationship(node: NodeRow, record: Record<string, unknown>, storySlug: string)` mirroring `edgesForStoryBelief` from SPEC46STOPIPMAC-006:
- `SREL.participants[]` → iterate and emit one `relationship_participant` edge per STENT id.
- `SREL.derived_from[]` → iterate and emit one `relationship_derived_from` edge per record id.

### 3. Wired `edgesForStoryRelationship` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts`, added a dispatch branch for the live `relationship_record_story` node type that calls `edgesForStoryRelationship` and pushes its edges into the result.

### 4. Appended SREL tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Appended positive + negative tests for both SREL edges to the shared file created by SPEC46STOPIPMAC-006. The populated fixture confirms a 2-participant `SREL` emits exactly two `relationship_participant` edges and two `relationship_derived_from` edges.

### 5. Updated current registry-count proof

Updated `tools/world-index/tests/types.test.ts` from the post-BEL count to the post-SREL count (`STORY_EDGE_TYPES.length === 20`, total `EDGE_TYPES.length === 35`) and asserted the two new relationship edge strings.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 2 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling tickets 006/008/009/010/011/012/013 each adding their own class's edges)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryRelationship` + dispatch wiring; mechanical merge with sibling per-class tickets)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append SREL tests; file created by SPEC46STOPIPMAC-006)
- `tools/world-index/tests/types.test.ts` (modify — update same-seam current registry count from 18/33 to 20/35 and assert the two SREL edge strings)

## Out of Scope

- Other per-class extractors (BEL in 006, STINT in 008, STSTAT in 009, CLK in 010, STSEC in 011, STQ in 012, SE extension in 013).
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015 confirms via end-to-end build.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — not applicable to SREL (both source fields take record ids, not placeholder strings).

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `relationship_participant` and `relationship_derived_from` — each emits exactly one edge per populated array element with correct source / target / `edge_type` (T-7 scope).
2. Negative tests — empty arrays emit no edges of those types.
3. Participant-pair test — a 2-participant `SREL` emits exactly two `relationship_participant` edges.
4. `npm test --prefix tools/world-index` passes for the full world-index test suite.
5. `npm run build --prefix tools/world-index` typechecks cleanly with the extended `STORY_EDGE_TYPES`.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. `edgesForStoryRelationship` is independently testable from sibling per-class helpers.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + participant-pair tests for the two SREL edges.
2. `tools/world-index/tests/types.test.ts` — update same-seam current registry-count proof and assert the new SREL edge strings.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new SREL edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)

## Outcome

Completed on 2026-05-18.

Implemented the SREL Phase C edge-extraction slice for `tools/world-index`. The two new story edge types are registered, `relationship_record_story` parser nodes now emit `relationship_participant` and `relationship_derived_from`, and the shared Phase C parser-level test file covers populated and empty SREL source-field cases. The current registry-count test now asserts the post-SREL count (`STORY_EDGE_TYPES.length === 20`) while leaving the final Phase C `36` assertion to SPEC46STOPIPMAC-015.

## Verification Result

1. Pre-edit baseline: `npm run build --prefix tools/world-index` — passed.
2. Pre-edit baseline: `npm test --prefix tools/world-index` — passed, 99 tests.
3. `npm run build --prefix tools/world-index` — passed.
4. `node --test tools/world-index/dist/tests/story-bundle-edges.test.js` — passed, 4 tests.
5. `npm test --prefix tools/world-index` — passed, 101 tests.

## Deviations

1. The ticket draft named `story_relationship_record`, but the live world-index parser vocabulary is `relationship_record_story`; implementation and closeout use the live node type.
2. `tools/world-index/tests/types.test.ts` was added to the touched file set because its existing current-count assertion would otherwise fail after the two new edge strings landed.
