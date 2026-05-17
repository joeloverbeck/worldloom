# SPEC41FUP-003: Add DA seed-node test case to get-context-packet story-pipeline test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-context-packet.ts` to classify DA seeds as story-local, adds one DA story-local fixture row in `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, updates the shared-fixture search expectation in `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`, and adds one new test case in `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` mirroring the existing PG/BEL/SE pattern.
**Deps**: None

## Problem

At intake, D3 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F3, scope narrowed) had dedicated test cases for PG, BEL, and SE seed-node filtering for story-pipeline task types, plus generic story-local seed coverage. The eleventh-iteration audit's `story_local_seed_warning_for_pg_bel_se_da` recommendation enumerated four seed-types (PG/BEL/SE/DA); the DA case was the only one without dedicated coverage. Implementation also found the live prefix filter itself omitted DA, so this ticket landed the minimal filter fix plus dedicated coverage.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` was verified via grep: PG-1 / BEL-1 / SE-1 dedicated tests already existed, along with generic story-local seed coverage and all-story-local seed coverage. Each dedicated test follows the pattern: `storyLocalSeedId = storyNodeId(STORY_FIXTURE_SLUG, "<PREFIX>-N")` → invoke `get_context_packet` with `seed_nodes: [storyLocalSeedId, "CF-1"]` → assert filtered world-seeds + `story_local_seed_nodes_ignored` warning. The landed DA seed-type test mirrors this pattern with `"DA-1"`.
2. Spec: SPEC-41 §D3 names the single test addition; scope narrowed from SPEC-40's broader `story_local_seed_warning_for_pg_bel_se_da` enumeration after reassessment confirmed 3 of 4 already exist.
3. Cross-skill boundary: the test file is the consumer of the `get_context_packet` MCP tool's filtering contract. The shared contract under audit is the story-pipeline-task-type seed-filtering behavior — story-local seeds (records under `worlds/<slug>/stories/<slug>/_source/`) must be filtered out of the world-seeds set when a story-pipeline task type queries; the warning `story_local_seed_nodes_ignored` must surface. The DA seed-type test confirms the filter handles the diegetic-artifact record class correctly, just as the PG/BEL/SE tests confirm it for page/belief/event classes.
4. Reassessment correction: the drafted ticket claimed the existing `withFixtureWorld` / `STORY_FIXTURE_SLUG` fixture already included a `DA-1` story artifact. Live inspection of `tools/world-mcp/tests/tools/story-bundle-fixture.ts` found no `DA-1` row. The corrected same-seam scope adds the minimal `story_diegetic_artifact_record` fixture row before adding the DA seed-filtering test.
5. Reassessment correction: live inspection of `tools/world-mcp/src/tools/get-context-packet.ts` found `STORY_LOCAL_SEED_NODE_PATTERN` includes SF/BEL/SE and other story-local prefixes but omits `DA`. The ticket therefore owns the small production regex fix as required same-seam fallout; otherwise the new DA test would expose an actual filter gap rather than only documenting existing behavior.
6. Verification fallout: adding `DA-1` to the shared story-bundle fixture changes the fixed exhaustive search expectation in `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`. Updating that expected list is same-seam proof-surface truthing for the fixture addition, not a search behavior change.

## Architecture Check

1. Adding `DA` to the existing story-local seed prefix regex, adding the missing DA fixture row, and adding one test case mirroring the existing PG/BEL/SE pattern is structurally cleaner than introducing a parallel filter path or refactoring the three existing tests into a parameterized fixture loop. The explicit per-type tests aid debugging when one type's filter regresses.
2. No backwards-compatibility aliasing or shims introduced — the filter extends the existing canonical story-local prefix set and the new test is additive; existing tests continue to work unchanged.

## Verification Layers

1. Test passes on current source → test run: `cd tools/world-mcp && npm test` passes with the new test included.
2. Filter behavior fixed and preserved → grep-proof/manual review confirms `STORY_LOCAL_SEED_NODE_PATTERN` includes `DA` alongside the existing story-local prefixes and the new test's assertion structure matches the PG/BEL/SE patterns.
3. Fixture support is minimal and local → codebase grep-proof/manual review confirms `story-bundle-fixture.ts` now provides `opening-bells:DA-1` as a `story_diegetic_artifact_record` for the test seed.
4. Shared fixture consumers remain truthful → focused test proof confirms the story-bundle search expectation accounts for the added DA fixture row.

## Landed Changes

### 1. Filter prefix fix

In `tools/world-mcp/src/tools/get-context-packet.ts`, `DA` was added to `STORY_LOCAL_SEED_NODE_PATTERN` so story-pipeline task types filter story-local diegetic artifact IDs and emit `story_local_seed_nodes_ignored`.

### 2. Fixture support

In `tools/world-mcp/tests/tools/story-bundle-fixture.ts`, a single `DA-1` story-local diegetic artifact node was added for `STORY_FIXTURE_SLUG` so the DA seed test uses a real story-local record instead of a synthetic missing ID.

### 3. Search expectation truthing

In `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`, the fixed exhaustive search expectation was updated to include the added `opening-bells:DA-1` row.

### 4. New test case

In `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`, a new DA seed-node test was added after the SE-seed-node test and before the all-story-local-seeds test:

```typescript
test("getContextPacket ignores DA seed nodes for story-pipeline task types", async () => {
  const root = createTempRepoRoot();
  try {
    buildStoryBundleWorld(root);
    const storyLocalSeedId = storyNodeId(STORY_FIXTURE_SLUG, "DA-1");
    const result = await withRepoRoot(root, () =>
      getContextPacket({
        task_type: "story_turn_cycle",
        world_slug: STORY_FIXTURE_WORLD,
        story_slug: STORY_FIXTURE_SLUG,
        seed_nodes: [storyLocalSeedId, "CF-1"],
        token_budget: 18000
      })
    );
    assert.deepEqual(result.task_header.warnings, ["story_local_seed_nodes_ignored"]);
  } finally {
    destroyTempRepoRoot(root);
  }
});
```

The landed test also asserts that the DA seed does not enter world-scope `local_authority` and that the world-canon `CF-1` seed still does.

## Files to Touch

- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify) — add one DA story-local fixture row.
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify) — add `DA` to the story-local seed prefix filter.
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify) — update fixed exhaustive search expectation for the added DA fixture row.
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — add one new test case after the SE-seed-node test.

## Out of Scope

- No refactoring beyond the minimal `DA` addition to the existing story-local seed prefix pattern.
- No refactoring of the existing PG/BEL/SE tests into a parameterized loop (explicit per-type tests aid debugging; the existing pattern is correct).
- No broad fixture expansion beyond the one `DA-1` row needed for this test.
- No companion tests for other seed-types — PG/BEL/SE are already covered; the audit's enumeration was 4 types (PG/BEL/SE/DA); DA is the only gap.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes with the new test case asserting the DA seed-node is filtered and `story_local_seed_nodes_ignored` warning is present.
2. The new test's assertion structure matches the existing PG/BEL/SE pattern exactly (visual diff against lines 125-155 / 157-187 / 189-219).
3. `cd tools/world-mcp && npm run build` succeeds (TypeScript compilation passes with the new test imports resolved).
4. The shared story-bundle search test remains truthful after the DA fixture row is added.

### Invariants

1. The `get_context_packet` MCP tool's filter for story-pipeline task types drops all story-local seed-types named by the audit enumeration (PG, BEL, SE, DA) and emits the `story_local_seed_nodes_ignored` warning.
2. The test surface for the filter covers all four seed-types named in the eleventh-iteration audit's recommendation.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/src/tools/get-context-packet.ts` (modify) — add `DA` to the story-local seed prefix filter.
2. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify) — add `DA-1` as a story-local diegetic artifact fixture row for `STORY_FIXTURE_SLUG`.
3. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify) — update the fixed exhaustive story search expectation to include `opening-bells:DA-1`.
4. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — add one test case `getContextPacket ignores DA seed nodes for story-pipeline task types` mirroring the existing PG/BEL/SE pattern.

### Commands

1. `cd tools/world-mcp && npm test` — runs the full world-mcp test suite including the new DA-seed-node test.
2. `cd tools/world-mcp && npm run build` — TypeScript build verifies compilation.
3. `grep -nE 'ignores .* seed nodes for story-pipeline task types' tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — confirms the four seed-type tests now form a complete set (PG, BEL, SE, DA).

## Outcome

Completed: 2026-05-17

- Added `DA` to the story-local seed prefix filter in `get_context_packet`.
- Added `opening-bells:DA-1` as a story-local diegetic artifact fixture.
- Added the dedicated DA seed-node filtering test.
- Updated the fixed story-bundle search fixture expectation for the added DA row.

## Verification Result

- `cd tools/world-mcp && npm run build` — passed.
- `cd tools/world-mcp && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/tools/search-nodes.story-bundle.test.js` — passed, 11 tests.
- `cd tools/world-mcp && npm test` — passed, 392 tests.

## Deviations

- The original ticket expected test-only coverage, but live reassessment found `STORY_LOCAL_SEED_NODE_PATTERN` did not classify `DA` as story-local. The production regex fix is same-seam required fallout.
- The original ticket expected the shared fixture already had `DA-1`. Live reassessment found it did not, so this ticket added the minimal fixture row.
- The broad package test initially failed because the new fixture row changed a fixed story-search expected list; `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` was updated as same-seam proof-surface truthing.
