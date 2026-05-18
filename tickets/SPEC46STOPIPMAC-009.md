# SPEC46STOPIPMAC-009: STSTAT edge extraction (1 edge: entity)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (1 new edge type in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryStatus` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests)
**Deps**: None

## Problem

The world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` does not extract `STSTAT` (status) record relations. Status-to-entity binding (`STSTAT.entity`) is schema-defined on the `STSTAT` record but is not extracted as an edge. The active-statuses projection landing in SPEC46STOPIPMAC-002 and the `entity_status` predicate per `story-state-contract.md` §5 both benefit from entity-edge traversal. This ticket adds the single `STSTAT`-rooted edge following the per-class helper pattern established by SPEC46STOPIPMAC-006.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site. The `STSTAT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.x carries `entity` (STENT id) plus `life` / `agency` / `location` fields per SPEC-44's append-only lifecycle.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the single STSTAT edge (`status_entity`). The §Extractor implementation pattern paragraph names `edgesForStoryStatus` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the active-statuses projection landing in SPEC46STOPIPMAC-002. Adding the STSTAT edge is additive.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making STSTAT entity binding graph-queryable supports the `entity_status` predicate and health-audit life/agency consistency checks. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge`.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryStatus` is the simplest per-class helper in Phase C — one edge per `STSTAT` record, from node id to the bound STENT id. No nested-field access, no array iteration, no placeholder handling.
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STSTAT` record with `entity` populated emits one `status_entity` edge.
2. **Per-edge negative case** → schema validation: fixture `STSTAT` with empty `entity` field emits no edge (defensive — schema requires `entity` so this case is unlikely in valid bundles, but the negative test confirms the extractor doesn't emit a malformed edge if encountered).
3. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with one new edge type string

In `tools/world-index/src/schema/types.ts:84-99`, add one entry to `STORY_EDGE_TYPES`: `"status_entity"`.

### 2. Implement `edgesForStoryStatus` helper

In `tools/world-index/src/parse/atomic.ts`, add `edgesForStoryStatus(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]`:
- `STSTAT.entity` → emit one `status_entity` edge from node id to the bound STENT id.

### 3. Wire `edgesForStoryStatus` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts:564`, add a dispatch branch for the `story_status_record` node type.

### 4. Append STSTAT tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Append positive + negative tests for the single STSTAT edge to the shared file.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 1 entry to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryStatus` + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STSTAT tests)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STINT in 008, CLK in 010, STSEC in 011, STQ in 012, SE extension in 013).
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — not applicable to STSTAT.

## Acceptance Criteria

### Tests That Must Pass

1. Positive test for `status_entity` — emits exactly one edge per `STSTAT` record with correct source / target / `edge_type` (T-7 scope).
2. Negative test — empty entity field emits no edge.
3. `npm test --prefix tools/world-index` passes for the full world-index test suite.
4. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. `edgesForStoryStatus` is independently testable from sibling per-class helpers.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative tests for the single STSTAT edge.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new STSTAT edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
