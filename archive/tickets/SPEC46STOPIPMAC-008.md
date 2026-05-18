# SPEC46STOPIPMAC-008: STINT edge extraction (2 edges: holder, supersedes)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (2 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryIntention` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests), `tools/world-index/tests/types.test.ts` (current registry-count assertion), and `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (implementation note)
**Deps**: None

## Problem

At intake, world-index story-edge extraction did not extract `STINT` (intention) record relations. Intention-ownership (`STINT.holder`) and intention-supersession chains (`STINT.supersedes`) are schema-defined on the `STINT` record but were not extracted as edges. The active-intentions projection landed in `archive/tickets/SPEC46STOPIPMAC-002.md` benefits from holder-edge traversal; future STPLAN (deferred) will depend on intention-supersession chain walking. This ticket added the two `STINT`-rooted edges following the per-class helper pattern established by SPEC46STOPIPMAC-006.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts` declares `STORY_EDGE_TYPES` with 20 entries after `archive/tickets/SPEC46STOPIPMAC-007.md`; `tools/world-index/src/parse/atomic.ts` dispatches story-record edge helpers in `edgesForStoryRecord`. The `STINT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.2 carries `holder` (STENT id) and `supersedes` (STINT id or null) fields. The supersession chain is the canonical store for STINT lifecycle per FOUNDATIONS §Story Bundles append-only / supersession discipline (story-state-contract.md §3).
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the two STINT edges (`intention_holder`, `intention_supersedes`). The §Extractor implementation pattern paragraph names `edgesForStoryIntention` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the active-intentions projection landed in `archive/tickets/SPEC46STOPIPMAC-002.md`. Future STPLAN tickets (deferred per SPEC-46 §Out of Scope item 1) will depend on intention-supersession chain walking via `intention_supersedes`. Adding STINT edges is additive.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making STINT ownership and supersession graph-queryable supports the `intention_active` predicate per `story-state-contract.md` §5 and prepares for future STPLAN `root_intention` linking. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge` carrying `storySlug` on every emitted edge.
5. Live package reassessment added `tools/world-index/tests/types.test.ts` to the owned surface. The existing registry-count assertion moves with each Phase C edge slice; this ticket updates it from 20 to 22 story-edge types and from 35 to 37 total edge types while leaving the final `36` story-edge capstone assertion to SPEC46STOPIPMAC-015.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryIntention` emits at most two edges per `STINT` record — one `intention_holder` to the holder STENT, and one `intention_supersedes` to the prior STINT (skipped when `supersedes` is null). The supersession edge mirrors the existing supersession-edge pattern (no existing `*_supersedes` edge type today; this is the first per the spec's edge inventory).
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STINT` record with `holder` populated emits one `intention_holder` edge; fixture with `supersedes` populated emits one `intention_supersedes` edge.
2. **Per-edge negative case** → schema validation: fixture `STINT` with `supersedes: null` emits no `intention_supersedes` edge.
3. **Supersession chain walking** → manual review: a chain of three `STINT-1` ← `STINT-2.supersedes=STINT-1` ← `STINT-3.supersedes=STINT-2` records produces two `intention_supersedes` edges; walking from `STINT-3` via the edges reaches `STINT-1`.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## Landed Changes

### 1. Extended `STORY_EDGE_TYPES` with two new edge type strings

In `tools/world-index/src/schema/types.ts`, added two entries to `STORY_EDGE_TYPES`: `"intention_holder"`, `"intention_supersedes"`. The current registry-count test now asserts 22 story-edge types and 37 total edge types; the final 36 story-edge assertion remains owned by SPEC46STOPIPMAC-015.

### 2. Implemented `edgesForStoryIntention` helper

In `tools/world-index/src/parse/atomic.ts`, added `edgesForStoryIntention(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]`:
- `STINT.holder` → emit one `intention_holder` edge from node id to the holder STENT id.
- `STINT.supersedes` → emit one `intention_supersedes` edge from node id to the prior STINT id, skipping when null.

### 3. Wired `edgesForStoryIntention` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts`, added a dispatch branch for the `intention_record` node type.

### 4. Appended STINT tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Appended positive + negative tests for both STINT edges to the shared file. The supersession-chain test confirms that a 3-record chain produces two `intention_supersedes` edges reachable from the leaf.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 2 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryIntention` + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STINT tests)
- `tools/world-index/tests/types.test.ts` (modify — update current registry-count assertions to the post-STINT edge count)
- `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` (modify — add dated implementation note for the landed STINT slice)

## Out of Scope

- Other per-class extractors (BEL in 006, SREL in 007, STSTAT in 009, CLK in 010, STSEC in 011, STQ in 012, SE extension in 013).
- STPLAN-related edges (`plan_root_intention` etc.) — deferred to a follow-up spec per SPEC-46 §Out of Scope item 1.
- `STORY_EDGE_TYPES.length === 36` registry-completeness assertion — capstone ticket 015.
- `docs/MACHINE-FACING-LAYER.md` story-edge enumeration update — covered by SPEC46STOPIPMAC-014.
- `placeholder-skip` convention — not applicable to STINT.

## Acceptance Criteria

### Tests That Must Pass

1. Positive tests for `intention_holder` and `intention_supersedes` — each emits exactly one edge per populated source field with correct source / target / `edge_type` (T-7 scope).
2. Negative test for `intention_supersedes` with null source field — no edge emitted.
3. Supersession-chain test — three-record chain produces two `intention_supersedes` edges reachable from the leaf.
4. Current registry-count assertion reflects 22 story-edge types after this ticket; the final `36` assertion remains deferred to SPEC46STOPIPMAC-015.
5. `npm test --prefix tools/world-index` passes for the full world-index test suite.
6. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. `edgesForStoryIntention` is independently testable from sibling per-class helpers.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + supersession-chain tests for the two STINT edges.
2. `tools/world-index/tests/types.test.ts` — update current registry-count assertions to the post-STINT edge count.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new STINT edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)

## Outcome

Completed on 2026-05-18. The world-index story-edge registry now includes `intention_holder` and `intention_supersedes`, and `intention_record` parser nodes emit those edges for `STINT.holder` and populated `STINT.supersedes`. Parser-level tests now cover populated STINT edges, null-supersedes behavior, and a three-record supersession chain. The current registry-count assertion moved to the post-STINT count (`STORY_EDGE_TYPES.length === 22`; total `EDGE_TYPES.length === 37`). SPEC-46 now carries a dated implementation note for this landed Phase C slice.

## Verification Result

Completed on 2026-05-18:

1. `npm run build` from `tools/world-index` — passed; TypeScript build completed after source/test edits.
2. `npm test` from `tools/world-index` — passed (`104` tests, `104` pass), including `intention records emit holder and supersedes edges`, `intention records with null supersedes emit only holder edges`, `intention supersession chains are walkable through supersedes edges`, and the updated registry-count test.
3. Manual review confirmed the two new edges use `createStoryRefEdge`, so emitted rows carry `story_slug` and preserve story-bundle isolation.

## Deviations

- `tools/world-index/tests/types.test.ts` was added to the touched surface during reassessment because the existing current-count assertion moves with each Phase C edge slice. This does not replace the final `STORY_EDGE_TYPES.length === 36` capstone assertion owned by SPEC46STOPIPMAC-015.
- `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` was updated with a narrow implementation note instead of rewriting the proposal's broader historical Phase C prose.
