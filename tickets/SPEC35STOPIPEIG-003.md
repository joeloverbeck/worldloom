# SPEC35STOPIPEIG-003: Partition story-local seeds before context-packet assembly

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`get-context-packet.ts` tool) + integration test
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D3

## Problem

`tools/world-mcp/src/tools/get-context-packet.ts:86–94` passes the original `args.seed_nodes` (unfiltered) into `assembleContextPacket`; the `story_local_seed_nodes_ignored` warning (lines 33–41) is computed and appended AFTER assembly completes (lines 97–99). `tools/world-mcp/src/context-packet/local-authority.ts:152–168` (`findLocalAuthoritySourceNodeIds`) queries every seed-node ID against the world database; a story-local ID like `SF-1` will return a `node_not_found` McpError or — if a future schema accident indexes story-local records in the world schema — leak the story-local node into world-scope packet layers. The existing test at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:93–114` only asserts the warning is present; it does NOT assert that story-local IDs are excluded from `local_authority.nodes`.

The warning was added per SPEC-31 D14 as a defensive backstop, but the underlying filter was never implemented. Per the spec §Story Bundles §3 Read Discipline, story-local records load through `story_slug`-scoped tools (`get_records(record_ids=..., story_slug=<story_slug>)`); they MUST NOT route through world-scope context-packet seeds.

## Assumption Reassessment (2026-05-16)

1. `tools/world-mcp/src/tools/get-context-packet.ts:86–94` passes `args.seed_nodes` unfiltered to `assembleContextPacket`; warning appended at lines 97–99 AFTER assembly. `tools/world-mcp/src/context-packet/local-authority.ts:152–168` queries unfiltered seed IDs against the world DB. Verified by brainstorm parallel-agent inspection.
2. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:93–114` asserts only that `result.task_header.warnings` contains `"story_local_seed_nodes_ignored"`; no assertion that `result.local_authority.nodes` excludes story-local IDs. Verified by brainstorm parallel-agent inspection.
3. Cross-skill boundary under audit: the `STORY_LOCAL_SEED_NODE_PATTERN` regex (`get-context-packet.ts:29-31`) and the `isStoryPipelineTaskType` predicate — already existing surfaces that this ticket reuses for the seed-filtering decision. No new public APIs are introduced.
4. §Story Bundles §3 Read Discipline and §4a Plan-Authority Boundary motivate this ticket: story-local truth is separate from world canon at retrieval time. The MCP server must enforce the separation at the seed-partitioning step, not announce-after-the-fact via a warning.

## Architecture Check

1. Filtering seeds BEFORE `assembleContextPacket` is structurally correct: the warning becomes truthful (the seeds WERE ignored), and `local_authority.nodes` reflects the actual world-scope retrieval rather than a leak surface. Alternative considered: raise `invalid_input` when only story-local seeds are supplied (the auditor's A3 sub-recommendation) — rejected per spec §Key design decisions because several story-pipeline task types (`story_prose_attach`, `story_turn_cycle`, `story_health_audit`) legitimately rely on `story_slug` + `story_bundle_context` with no world-scope seeds, and forcing `invalid_input` would either break those task types or push consumers to invent dummy world seeds.
2. No backwards-compatibility aliasing introduced. The existing `STORY_LOCAL_SEED_NODE_PATTERN` + `isStoryPipelineTaskType` predicates are reused; the only change is partitioning seeds before `assembleContextPacket` and proceeding with the filtered set.

## Verification Layers

1. Story-local seeds are excluded from `local_authority.nodes` for story-pipeline task types → integration test asserting that `seed_nodes=[storyNodeId(STORY_FIXTURE_SLUG, "SF-1")]` produces a packet whose `local_authority.nodes` contains no `SF-1` entry (the warning STILL fires).
2. Empty-world-seed-set case succeeds (story-pipeline task type, all seeds story-local) → integration test asserting that `seed_nodes=[]` (after filtering) does NOT raise `invalid_input` and instead returns a packet whose `story_bundle_context` carries the bundle-local state.
3. Non-story task types pass seeds through unchanged → existing tests for non-story task types continue to pass.
4. Full `tools/world-mcp/` test suite green → `npm test`.

## What to Change

### 1. Partition seeds before `assembleContextPacket`

In `tools/world-mcp/src/tools/get-context-packet.ts`, change the assembly call (lines 86–94) to filter seeds for story-pipeline task types:

```typescript
const isStoryTask = isStoryPipelineTaskType(args.task_type);
const seedsForAssembly = isStoryTask
  ? args.seed_nodes.filter((seed) => !STORY_LOCAL_SEED_NODE_PATTERN.test(seed))
  : args.seed_nodes;

const result = await assembleContextPacket({
  task_type: args.task_type,
  world_slug: args.world_slug,
  ...(args.story_slug === undefined ? {} : { story_slug: args.story_slug }),
  seed_nodes: seedsForAssembly,
  token_budget: args.token_budget ?? DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE[args.task_type],
  delivery_mode: args.delivery_mode ?? DEFAULT_DELIVERY_MODE,
  ...(args.node_classes === undefined ? {} : { node_classes: args.node_classes })
});
```

The existing warning computation (lines 33–41 + 97–99) continues to fire when the partition removes at least one seed. When `seedsForAssembly.length === 0 && isStoryTask`, proceed with assembly using the empty seed set — story-pipeline task types legitimately rely on `story_slug` + `story_bundle_context` for state retrieval. Do NOT raise `invalid_input`.

### 2. Extend the integration test

In `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`, extend the existing `getContextPacket warns when story-pipeline seed_nodes contain story-local ids` test (lines 93–114) to additionally assert:

- `result.local_authority.nodes` does NOT contain the story-local ID's node entry.
- No `node_not_found` McpError is raised.

Add a second test where ALL seeds are story-local (post-filter `seedsForAssembly === []`):

- Call `getContextPacket({ task_type: "story_turn_cycle", story_slug: STORY_FIXTURE_SLUG, seed_nodes: [storyNodeId(STORY_FIXTURE_SLUG, "SF-1"), storyNodeId(STORY_FIXTURE_SLUG, "STENT-1")] })`.
- Assert: warning present; assembly succeeds (no `invalid_input`); `result.story_bundle_context` is populated; `result.local_authority.nodes` contains only world-scope nodes (transitively retrieved via `story_bundle_context` if any, otherwise empty).

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — extend existing test + add new test)

## Out of Scope

- Behavior changes for non-story task types — they continue to pass seeds through unchanged.
- Changes to `assembleContextPacket`'s internal seed-handling logic — the filter lives at the tool's entry point.
- Changes to `STORY_LOCAL_SEED_NODE_PATTERN` regex — the existing pattern (per `get-context-packet.ts:29-31`) covers the required story-local class set.

## Acceptance Criteria

### Tests That Must Pass

1. Extended test asserts story-local seeds are excluded from `local_authority.nodes` AND warning fires AND no `node_not_found`.
2. New test for all-story-local-seeds case asserts assembly succeeds with empty world-seed set + `story_bundle_context` populated.
3. Existing non-story task-type tests continue to pass (no regression).
4. `npm test` in `tools/world-mcp/` returns green.

### Invariants

1. For story-pipeline task types, no story-local ID (matching `STORY_LOCAL_SEED_NODE_PATTERN`) appears in `result.local_authority.nodes`.
2. The `story_local_seed_nodes_ignored` warning fires whenever filtering removes at least one seed.
3. An all-story-local-seed call returns a successful packet (not `invalid_input`).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — extend `getContextPacket warns when story-pipeline seed_nodes contain story-local ids` test with exclusion assertion + add new test for all-story-local-seed case.

### Commands

1. `cd tools/world-mcp && npm test` — full MCP suite.
2. `cd tools/world-mcp && npm run build` — typechecks the change.
3. Post-landing: rebuild MCP `dist/` so the running server (if any) picks up the filtered behavior — `cd tools/world-mcp && npm run build` is sufficient; restart any long-running MCP server consumer.
