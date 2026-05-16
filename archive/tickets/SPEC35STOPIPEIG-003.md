# SPEC35STOPIPEIG-003: Partition story-local seeds before context-packet assembly

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`get-context-packet.ts` tool) + integration test
**Deps**: `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` D3

## Problem

At intake, `tools/world-mcp/src/tools/get-context-packet.ts` passed the original `args.seed_nodes` (unfiltered) into `assembleContextPacket`; the `story_local_seed_nodes_ignored` warning was computed and appended AFTER assembly completed. `tools/world-mcp/src/context-packet/local-authority.ts` (`findLocalAuthoritySourceNodeIds`) queries every seed-node ID against the world database; a story-local ID like `SF-1` could leak the story-local node into world-scope packet layers. The pre-ticket test at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` only asserted the warning was present; it did NOT assert that story-local IDs were excluded from `local_authority.nodes`.

The warning was added per SPEC-31 D14 as a defensive backstop, but the underlying filter was never implemented. Per the spec §Story Bundles §3 Read Discipline, story-local records load through `story_slug`-scoped tools (`get_records(record_ids=..., story_slug=<story_slug>)`); they MUST NOT route through world-scope context-packet seeds.

## Assumption Reassessment (2026-05-16)

1. At intake, `tools/world-mcp/src/tools/get-context-packet.ts` passed `args.seed_nodes` unfiltered to `assembleContextPacket`; warning append happened after assembly. `tools/world-mcp/src/context-packet/local-authority.ts` queries seed IDs against the world DB. The completed implementation now filters story-local seeds through `seedNodesForAssembly` before assembly.
2. At intake, `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` asserted only that `result.task_header.warnings` contains `"story_local_seed_nodes_ignored"`; no assertion checked that `result.local_authority.nodes` excludes story-local IDs. The completed tests now cover mixed world/story-local seeds and all-story-local seeds.
3. Cross-skill boundary under audit: the `STORY_LOCAL_SEED_NODE_PATTERN` regex (`get-context-packet.ts:29-31`) and the `isStoryPipelineTaskType` predicate — already existing surfaces that this ticket reuses for the seed-filtering decision. No new public APIs are introduced.
4. §Story Bundles §3 Read Discipline and §4a Plan-Authority Boundary motivate this ticket: story-local truth is separate from world canon at retrieval time. The MCP server must enforce the separation at the seed-partitioning step, not announce-after-the-fact via a warning.

## Architecture Check

1. Filtering seeds BEFORE `assembleContextPacket` is structurally correct: the warning becomes truthful (the seeds WERE ignored), and `local_authority.nodes` reflects the actual world-scope retrieval rather than a leak surface. Alternative considered: raise `invalid_input` when only story-local seeds are supplied (the auditor's A3 sub-recommendation) — rejected per spec §Key design decisions because story-pipeline task types such as `story_turn_cycle`, `commitment_block_authoring`, and `branching_story_health_audit` legitimately rely on `story_slug` + `story_bundle_context` with no world-scope seeds, and forcing `invalid_input` would either break those task types or push consumers to invent dummy world seeds.
2. No backwards-compatibility aliasing introduced. The existing `STORY_LOCAL_SEED_NODE_PATTERN` + `isStoryPipelineTaskType` predicates are reused; the only change is partitioning seeds before `assembleContextPacket` and proceeding with the filtered set.

## Verification Layers

1. Story-local seeds are excluded from `local_authority.nodes` for story-pipeline task types → integration test asserting that `seed_nodes` containing `storyNodeId(STORY_FIXTURE_SLUG, "SF-0001")` produces a packet whose `local_authority.nodes` contains no story-local seed entry (the warning STILL fires).
2. Empty-world-seed-set case succeeds (story-pipeline task type, all seeds story-local) → integration test asserting that `seed_nodes=[]` (after filtering) does NOT raise `invalid_input` and instead returns a packet whose `story_bundle_context` carries the bundle-local state.
3. Non-story task types pass seeds through unchanged → existing tests for non-story task types continue to pass.
4. Full `tools/world-mcp/` test suite green → `npm test`.

## Landed Changes

### 1. Partition seeds before `assembleContextPacket`

`tools/world-mcp/src/tools/get-context-packet.ts` now filters story-local seed IDs for story-pipeline task types before calling `assembleContextPacket`. The existing warning computation continues to fire when the request includes at least one story-local seed. When all input seeds are story-local, the tool proceeds with an empty world-seed set; story-pipeline task types still receive `story_bundle_context` through `story_slug`.

### 2. Extend the integration test

`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` now extends the warning test to assert that the story-local seed is absent from `local_authority.nodes` while the world-scope seed remains present. It also adds an all-story-local-seeds test proving the call succeeds, warning is returned, `story_bundle_context` is populated, and `local_authority.nodes` is empty.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — extend existing test + add new test)
- `specs/SPEC-35-story-pipeline-eighth-iteration-fixes.md` (modify — progress note)

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

1. `cd tools/world-mcp && npm run build` — typechecks the change and refreshes `dist/`.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` — focused compiled story-pipeline proof.
3. `cd tools/world-mcp && npm test` — full MCP suite.

## Outcome

Completed: 2026-05-16

`get_context_packet` now filters story-local seed IDs before context-packet assembly for story-pipeline task types. Mixed world/story-local requests keep world-scope local authority while excluding story-local IDs; all-story-local requests succeed with the existing warning and populated `story_bundle_context` instead of treating story-local IDs as world-scope seeds.

No public API, schema, task-type, or non-story behavior changed.

## Verification Result

Pre-edit baseline:

1. `cd tools/world-mcp && npm test` — passed before source edits (`369` tests reported in the TAP summary; no failures).

Final proof:

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` — passed (`5` tests, `0` failures).
3. `cd tools/world-mcp && npm test` — passed (`370` tests, `0` failures).

Ignored package artifacts present/updated during proof: `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/`.

## Deviations

None.
