# SPEC46STOPIPMAC-009: STSTAT edge extraction (1 edge: entity)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (1 new edge type in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryStatus` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests), `tools/world-index/tests/types.test.ts` (current registry-count assertion)
**Deps**: None

## Problem

At intake, world-index story-edge extraction did not extract `STSTAT` (status) record relations. Status-to-entity binding (`STSTAT.entity`) is schema-defined on the `STSTAT` record but was not extracted as an edge. The active-statuses projection landed in `archive/tickets/SPEC46STOPIPMAC-002.md` and the `entity_status` predicate per `story-state-contract.md` §5 both benefit from entity-edge traversal. This ticket added the single `STSTAT`-rooted edge following the per-class helper pattern established by SPEC46STOPIPMAC-006.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site. The `STSTAT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.x carries `entity` (STENT id) plus `life` / `agency` / `location` fields per SPEC-44's append-only lifecycle.
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the single STSTAT edge (`status_entity`). The §Extractor implementation pattern paragraph names `edgesForStoryStatus` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the active-statuses projection landed in `archive/tickets/SPEC46STOPIPMAC-002.md`. Adding the STSTAT edge is additive.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making STSTAT entity binding graph-queryable supports the `entity_status` predicate and health-audit life/agency consistency checks. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge`.
5. Live package reassessment added `tools/world-index/tests/types.test.ts` to the owned surface. The existing registry-count assertion moves with each Phase C edge slice; this ticket updates it from 22 to 23 story-edge types and from 37 to 38 total edge types while leaving the final `36` story-edge capstone assertion to SPEC46STOPIPMAC-015.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryStatus` is the simplest per-class helper in Phase C — one edge per `STSTAT` record, from node id to the bound STENT id. No nested-field access, no array iteration, no placeholder handling.
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STSTAT` record with `entity` populated emits one `status_entity` edge.
2. **Per-edge negative case** → schema validation: fixture `STSTAT` with empty `entity` field emits no edge (defensive — schema requires `entity` so this case is unlikely in valid bundles, but the negative test confirms the extractor doesn't emit a malformed edge if encountered).
3. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## Landed Changes

### 1. Extend `STORY_EDGE_TYPES` with one new edge type string

In `tools/world-index/src/schema/types.ts`, added one entry to `STORY_EDGE_TYPES`: `"status_entity"`.

### 2. Implement `edgesForStoryStatus` helper

In `tools/world-index/src/parse/atomic.ts`, added `edgesForStoryStatus(node: NodeRow, record: Record<string, unknown>, storySlug: string)`:
- `STSTAT.entity` → emit one `status_entity` edge from node id to the bound STENT id.

### 3. Wire `edgesForStoryStatus` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts`, added a dispatch branch for the `story_status_record` node type.

### 4. Append STSTAT tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Appended positive + negative tests for the single STSTAT edge to the shared file.

### 5. Updated current registry-count proof

In `tools/world-index/tests/types.test.ts`, updated the moving current count to `STORY_EDGE_TYPES.length === 23` and `EDGE_TYPES.length === 38`. The final Phase C `36` story-edge assertion remains owned by SPEC46STOPIPMAC-015.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 1 entry to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryStatus` + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STSTAT tests)
- `tools/world-index/tests/types.test.ts` (modify — update current registry-count assertion)

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
2. `tools/world-index/tests/types.test.ts` — update current Phase C moving registry count to 23 story edges / 38 total edges.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new STSTAT edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)

## Outcome

Completed on 2026-05-18. The world-index story-edge registry now includes `status_entity`, and `story_status_record` parser nodes emit that edge for populated `STSTAT.entity` values. Parser-level tests cover populated and empty-entity STSTAT cases. The current registry-count test now asserts the post-STSTAT count (`STORY_EDGE_TYPES.length === 23`; total `EDGE_TYPES.length === 38`). SPEC-46 now carries a dated implementation note for this landed Phase C slice.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/world-index` passed 104 tests.
2. `npm run build` from `tools/world-index` passed.
3. First post-change `npm test` from `tools/world-index` failed only because the existing current-count assertion still expected `STORY_EDGE_TYPES.length === 22`; the new status-edge parser tests already passed in that run. This was same-seam proof-surface drift and was corrected in `tools/world-index/tests/types.test.ts`.
4. Final `npm run build --prefix tools/world-index` from the repo root passed.
5. Final `npm test --prefix tools/world-index` from the repo root passed 106 tests, including `status records emit entity edges`, `status records with empty entity emit no status edges`, and the updated registry-count assertion.

## Deviations

- `tools/world-index/tests/types.test.ts` was added to the touched surface during reassessment because the existing current-count assertion moves with each Phase C edge slice. This does not replace the final `STORY_EDGE_TYPES.length === 36` capstone assertion owned by SPEC46STOPIPMAC-015.
