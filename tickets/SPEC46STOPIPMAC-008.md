# SPEC46STOPIPMAC-008: STINT edge extraction (2 edges: holder, supersedes)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index/src/schema/types.ts` (2 new edge types in `STORY_EDGE_TYPES`), `tools/world-index/src/parse/atomic.ts` (new `edgesForStoryIntention` helper + dispatch wiring), `tools/world-index/tests/story-bundle-edges.test.ts` (append per-class tests)
**Deps**: None

## Problem

The world-index story-edge extraction at `tools/world-index/src/parse/atomic.ts:564` does not extract `STINT` (intention) record relations. Intention-ownership (`STINT.holder`) and intention-supersession chains (`STINT.supersedes`) are schema-defined on the `STINT` record but are not extracted as edges. The active-intentions projection landing in SPEC46STOPIPMAC-002 benefits from holder-edge traversal; future STPLAN (deferred) will depend on intention-supersession chain walking. This ticket adds the two `STINT`-rooted edges following the per-class helper pattern established by SPEC46STOPIPMAC-006.

## Assumption Reassessment (2026-05-18)

1. `tools/world-index/src/schema/types.ts:84-99` declares `STORY_EDGE_TYPES`; `tools/world-index/src/parse/atomic.ts:564` is the dispatch site. The `STINT` schema at `.claude/skills/_shared-templates/story-record-schemas.md` §4.5.2 carries `holder` (STENT id) and `supersedes` (STINT id or null) fields. The supersession chain is the canonical store for STINT lifecycle per FOUNDATIONS §Story Bundles append-only / supersession discipline (story-state-contract.md §3).
2. `specs/SPEC-46-story-pipeline-machine-facing-foundation-fixes.md` §Phase C table specifies the two STINT edges (`intention_holder`, `intention_supersedes`). The §Extractor implementation pattern paragraph names `edgesForStoryIntention` as one of the seven per-class helpers.
3. Cross-skill boundary: the world-index edge extraction is consumed by MCP graph-walking helpers and by the active-intentions projection landing in SPEC46STOPIPMAC-002. Future STPLAN tickets (deferred per SPEC-46 §Out of Scope item 1) will depend on intention-supersession chain walking via `intention_supersedes`. Adding STINT edges is additive.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: making STINT ownership and supersession graph-queryable supports the `intention_active` predicate per `story-state-contract.md` §5 and prepares for future STPLAN `root_intention` linking. FOUNDATIONS §Rule 4 (No Globalization by Accident) is preserved by `createStoryRefEdge` carrying `storySlug` on every emitted edge.

## Architecture Check

1. Per-class helper pattern matches SPEC46STOPIPMAC-006's `edgesForStoryBelief`. `edgesForStoryIntention` emits at most two edges per `STINT` record — one `intention_holder` to the holder STENT, and one `intention_supersedes` to the prior STINT (skipped when `supersedes` is null). The supersession edge mirrors the existing supersession-edge pattern (no existing `*_supersedes` edge type today; this is the first per the spec's edge inventory).
2. No backwards-compatibility aliasing or shims introduced.

## Verification Layers

1. **Per-edge positive case** → schema validation: fixture `STINT` record with `holder` populated emits one `intention_holder` edge; fixture with `supersedes` populated emits one `intention_supersedes` edge.
2. **Per-edge negative case** → schema validation: fixture `STINT` with `supersedes: null` emits no `intention_supersedes` edge.
3. **Supersession chain walking** → manual review: a chain of three `STINT-1` ← `STINT-2.supersedes=STINT-1` ← `STINT-3.supersedes=STINT-2` records produces two `intention_supersedes` edges; walking from `STINT-3` via the edges reaches `STINT-1`.
4. **No regression on existing edges** → `npm test --prefix tools/world-index` passes for the full world-index test suite.

## What to Change

### 1. Extend `STORY_EDGE_TYPES` with two new edge type strings

In `tools/world-index/src/schema/types.ts:84-99`, add two entries to `STORY_EDGE_TYPES`: `"intention_holder"`, `"intention_supersedes"`.

### 2. Implement `edgesForStoryIntention` helper

In `tools/world-index/src/parse/atomic.ts`, add `edgesForStoryIntention(node: NodeRow, record: Record<string, unknown>, storySlug: string): EdgeRow[]`:
- `STINT.holder` → emit one `intention_holder` edge from node id to the holder STENT id.
- `STINT.supersedes` → emit one `intention_supersedes` edge from node id to the prior STINT id, skipping when null.

### 3. Wire `edgesForStoryIntention` into `edgesForStoryRecord` dispatch

In `tools/world-index/src/parse/atomic.ts:564`, add a dispatch branch for the `story_intention_record` node type.

### 4. Append STINT tests to `tools/world-index/tests/story-bundle-edges.test.ts`

Append positive + negative tests for both STINT edges to the shared file. Include a supersession-chain walking test confirming that a 3-record chain produces two `intention_supersedes` edges reachable from the leaf.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify — add 2 entries to `STORY_EDGE_TYPES`; mechanical merge with sibling per-class tickets)
- `tools/world-index/src/parse/atomic.ts` (modify — add `edgesForStoryIntention` + dispatch wiring)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify — append STINT tests)

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
4. `npm test --prefix tools/world-index` passes for the full world-index test suite.
5. `npm run build --prefix tools/world-index` typechecks cleanly.

### Invariants

1. Every emitted edge carries `storySlug` via `createStoryRefEdge` — bundle isolation is preserved (FOUNDATIONS §Rule 4 discipline).
2. `edgesForStoryIntention` is independently testable from sibling per-class helpers.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/story-bundle-edges.test.ts` — append positive + negative + supersession-chain tests for the two STINT edges.

### Commands

1. `npm test --prefix tools/world-index` (targeted: full world-index test suite passes including new STINT edge tests)
2. `npm run build --prefix tools/world-index` (typechecks the extended `STORY_EDGE_TYPES`)
