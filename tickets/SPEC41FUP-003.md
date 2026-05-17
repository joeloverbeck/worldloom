# SPEC41FUP-003: Add DA seed-node test case to get-context-packet story-pipeline test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — extends `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` with one new test case mirroring the existing PG/BEL/SE pattern. No source modification.
**Deps**: None

## Problem

D3 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F3, scope narrowed). `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` has dedicated test cases for PG (line 125), BEL (line 157), and SE (line 189) seed-node filtering for story-pipeline task types, plus generic story-local seed coverage at lines 93 and 221. The eleventh-iteration audit's `story_local_seed_warning_for_pg_bel_se_da` recommendation enumerated four seed-types (PG/BEL/SE/DA); the DA case is the only one without a dedicated test. Adding it brings the test surface to full parity with the audit's enumeration and matches the established pattern.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` verified via grep — 9 test cases total covering PG-1 / BEL-1 / SE-1 dedicated patterns at lines 125, 157, 189; generic story-local seed test at line 93; all-story-local seeds test at line 221. Each dedicated test follows the pattern: `storyLocalSeedId = storyNodeId(STORY_FIXTURE_SLUG, "<PREFIX>-N")` → invoke `get_context_packet` with `seed_nodes: [storyLocalSeedId, "CF-1"]` → assert filtered world-seeds + `story_local_seed_nodes_ignored` warning. The DA seed-type test would mirror this pattern exactly with `"DA-1"`.
2. Spec: SPEC-41 §D3 names the single test addition; scope narrowed from SPEC-40's broader `story_local_seed_warning_for_pg_bel_se_da` enumeration after reassessment confirmed 3 of 4 already exist.
3. Cross-skill boundary: the test file is the consumer of the `get_context_packet` MCP tool's filtering contract. The shared contract under audit is the story-pipeline-task-type seed-filtering behavior — story-local seeds (records under `worlds/<slug>/stories/<slug>/_source/`) must be filtered out of the world-seeds set when a story-pipeline task type queries; the warning `story_local_seed_nodes_ignored` must surface. The DA seed-type test confirms the filter handles the diegetic-artifact record class correctly, just as the PG/BEL/SE tests confirm it for page/belief/event classes.

## Architecture Check

1. Adding one test case mirroring the existing PG/BEL/SE pattern is structurally cleaner than refactoring the three existing tests into a parameterized fixture loop — the four seed-types share enough structure that a loop is tempting, but the explicit per-type tests aid debugging when one type's filter regresses (the failing test name directly names the regressed seed-type). The existing pattern is the right one; the addition extends it consistently.
2. No backwards-compatibility aliasing or shims introduced — the new test is a pure addition; existing tests continue to work unchanged.

## Verification Layers

1. Test passes on current source → test run: `cd tools/world-mcp && npm test` passes with the new test included.
2. Filter behavior preserved → grep-proof: the new test's assertion structure matches lines 125-155 / 157-187 / 189-219 patterns exactly (verified by reading the file post-edit).
3. Single-layer ticket — codebase grep-proof of fixture parity + test-run together cover the change surface; no cross-skill dry-run needed because the test exercises the existing filter without modifying it.

## What to Change

### 1. New test case

In `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`, add a new test case after the SE-seed-node test (after the current line 189-219 block) and before the all-story-local-seeds test (current line 221):

```typescript
test("getContextPacket ignores DA seed nodes for story-pipeline task types", async () => {
  await withFixtureWorld(async (root) => {
    process.chdir(root);
    const storyLocalSeedId = storyNodeId(STORY_FIXTURE_SLUG, "DA-1");
    const result = await getContextPacket(
      {
        task_type: "story_turn_cycle",
        seed_nodes: [storyLocalSeedId, "CF-1"],
        story_slug: STORY_FIXTURE_SLUG
      },
      { repoRoot: root }
    );
    assert.deepEqual(result.task_header.warnings, ["story_local_seed_nodes_ignored"]);
    // Additional assertions matching the PG/BEL/SE pattern — verify world-seeds set excludes the DA-id
    // and includes CF-1 only.
  });
});
```

Implementer note: copy the exact structure from the PG-seed-node test (lines 125-155) and substitute `PG-1` → `DA-1`. The `withFixtureWorld` helper and `storyNodeId` / `STORY_FIXTURE_SLUG` imports are already in the file.

## Files to Touch

- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — add one new test case after the SE-seed-node test.

## Out of Scope

- No MCP source modification (`tools/world-mcp/src/tools/get-context-packet.ts` is unchanged — this ticket adds test coverage for existing behavior).
- No refactoring of the existing PG/BEL/SE tests into a parameterized loop (explicit per-type tests aid debugging; the existing pattern is correct).
- No new fixture data — the existing `withFixtureWorld` / `STORY_FIXTURE_SLUG` fixture already includes a DA record at the standard `DA-1` path (per the SPEC-35-D3 / SPEC-36-D6 fixture setup).
- No companion tests for other seed-types — PG/BEL/SE are already covered; the audit's enumeration was 4 types (PG/BEL/SE/DA); DA is the only gap.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes with the new test case asserting the DA seed-node is filtered and `story_local_seed_nodes_ignored` warning is present.
2. The new test's assertion structure matches the existing PG/BEL/SE pattern exactly (visual diff against lines 125-155 / 157-187 / 189-219).
3. `cd tools/world-mcp && npm run build` succeeds (TypeScript compilation passes with the new test imports resolved).

### Invariants

1. The `get_context_packet` MCP tool's filter for story-pipeline task types continues to drop all story-local seed-types (PG, BEL, SE, DA) and emit the `story_local_seed_nodes_ignored` warning.
2. The test surface for the filter covers all four seed-types named in the eleventh-iteration audit's recommendation.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — add one test case `getContextPacket ignores DA seed nodes for story-pipeline task types` mirroring the existing PG/BEL/SE pattern.

### Commands

1. `cd tools/world-mcp && npm test` — runs the full world-mcp test suite including the new DA-seed-node test.
2. `cd tools/world-mcp && npm run build` — TypeScript build verifies compilation.
3. `grep -nE 'ignores .* seed nodes for story-pipeline task types' tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — confirms the four seed-type tests now form a complete set (PG, BEL, SE, DA).
