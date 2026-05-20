# SPEC55CHAPIPFOU-002: Story-pipeline authoring-proposal seed-node guard

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`get_context_packet` seed filtering) + `docs/CONTEXT-PACKET-CONTRACT.md`
**Deps**: None

## Problem

`get_context_packet` already keeps story-local node ids (`SF`, `BEL`, `PG`, …) out of the world-scope seed assembly for story-pipeline task types: gated by `isStoryPipelineTaskType`, `seedNodesForAssembly` (`tools/world-mcp/src/tools/get-context-packet.ts:44`) filters them out and `storyLocalSeedNodeWarnings` (line 34) emits `story_local_seed_nodes_ignored` (constant line 32), because story-local ids belong in the `story_bundle_context` layer (resolved via `story_slug`), not in world seeds. Non-story task types return early (lines 35, 45) and keep all seeds. The complementary case is unguarded: `NCP`/`NCB` are world-scope authoring-proposal ids, so when supplied as seeds to a story-pipeline task type they pass straight through `seedNodesForAssembly` and resolve silently into the packet. Current story skills seed only with realized `CHAR` ids and world anchors, so this is not a current breakage — but it is an unprotected seam in the clean story/world separation. SPEC-55 Phase 2 (audit Medium #5) closes it by mirroring the existing story-local guard.

## Assumption Reassessment (2026-05-20)

1. Codebase: `tools/world-mcp/src/tools/get-context-packet.ts` imports `isStoryPipelineTaskType` (line 8); defines `STORY_LOCAL_SEED_NODE_WARNING = "story_local_seed_nodes_ignored"` (line 32); `storyLocalSeedNodeWarnings` (line 34) and `seedNodesForAssembly` (line 44) both early-return for non-story task types (lines 35, 45) and otherwise warn/drop seeds matching `STORY_LOCAL_SEED_NODE_PATTERN` (line 30). The two functions are the exact extension site; world authoring task types (e.g. `propose_new_characters`) keep all seeds via the early return.
2. Spec: SPEC-55 §Phase 2 (post-reassessment) names the corrected mechanism, the new constant `authoring_proposal_seed_nodes_ignored`, and the `docs/CONTEXT-PACKET-CONTRACT.md` note. §Out of Scope confirms hard rejection (vs warn+drop) is not chosen.
3. Cross-skill boundary under audit: the context-packet seed contract consumed by story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`) — they seed with realized `CHAR` ids and world anchors, never `NCP`/`NCB`. The guard makes that contract enforced rather than conventional; it must not drop `NCP`/`NCB` for world authoring task types.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §8 (story bundles are derived per-world layers; world-scope authoring-proposal records are not story cast) and clean story/world separation. The guard strengthens separation by keeping authoring-proposal nodes out of story packets; it resolves no Mystery Reserve entry and weakens no firewall.

## Architecture Check

1. Extending the two existing `isStoryPipelineTaskType`-gated functions with a second pattern is cleaner than adding a parallel filter pipeline: the drop+warn shape, the early-return-for-world-tasks behavior, and the warning-aggregation site (`get-context-packet.ts:108`) are reused unchanged, so the new authoring-proposal case is symmetric to the established story-local case and adds ~6 lines.
2. No backwards-compatibility shim: the new pattern + constant are additive; world task types are untouched (early return), and the existing story-local warning/drop is unchanged.

## Verification Layers

1. NCP/NCB seed dropped + warned for story tasks → `get-context-packet.story-pipeline.test.ts` assertion that the packet excludes the node and `task_header.warnings` contains `authoring_proposal_seed_nodes_ignored`.
2. World authoring tasks keep NCP/NCB seeds → `get-context-packet.test.ts` (or the story-pipeline test's world-task case) asserting a `propose_new_characters` packet still resolves an NCP/NCB seed.
3. Existing story-local warning/drop unchanged → existing `get-context-packet.story-pipeline.test.ts` cases continue to pass.
4. Contract doc states realized-`CHAR`-only story-seed rule → grep-proof against `docs/CONTEXT-PACKET-CONTRACT.md`.

## What to Change

### 1. `get-context-packet.ts` — add authoring-proposal pattern + constant

Add `AUTHORING_PROPOSAL_SEED_NODE_PATTERN = /^(?:[a-z0-9-]+:)?(?:NCP|NCB)-\d+$/` and `AUTHORING_PROPOSAL_SEED_NODE_WARNING = "authoring_proposal_seed_nodes_ignored"`. In the story-pipeline branch of `seedNodesForAssembly`, also filter out seeds matching the new pattern; in the story-pipeline branch of `storyLocalSeedNodeWarnings`, also emit the new warning when any seed matches it. Keep the non-story early returns intact so world authoring seeds are untouched.

### 2. `docs/CONTEXT-PACKET-CONTRACT.md` — one-line note

Add a note: story-pipeline seed nodes must be realized `CHAR-<integer>` ids and world anchors; `NCP`/`NCB` authoring-proposal nodes are world-scope and are warned-and-dropped for story task types.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — add NCP/NCB drop+warn case; add world-task-keeps-NCP/NCB case)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)

## Out of Scope

- Hard rejection of NCP/NCB seeds (the chosen mechanism is warn+drop, symmetric to the story-local guard).
- Any change to the story-local pattern, the `story_bundle_context` assembly, or world-task seed handling.
- The MCP field-tool error work (SPEC55CHAPIPFOU-001) and the schema-doc/regression-test work (SPEC55CHAPIPFOU-003).

## Acceptance Criteria

### Tests That Must Pass

1. A story-pipeline `get_context_packet` call seeded with an `NCP`/`NCB` id emits `authoring_proposal_seed_nodes_ignored` and excludes that node from the assembled packet.
2. A world authoring task (`propose_new_characters`) seeded with an `NCP`/`NCB` id still resolves it (world task types unaffected).
3. Existing story-local seed warnings/drops are unchanged.
4. `npm test --prefix tools/world-mcp` passes.

### Invariants

1. The new guard fires only for story-pipeline task types (gated by `isStoryPipelineTaskType`); world task types keep their early-return seed pass-through.
2. The new warning constant is a sibling to `story_local_seed_nodes_ignored`, aggregated through the same `task_header.warnings` set.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — add NCP/NCB-seed drop+warn assertion and a world-task-keeps-NCP/NCB assertion.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp` (typecheck — the build script runs `tsc`)
3. `grep -n "CHAR" docs/CONTEXT-PACKET-CONTRACT.md` to confirm the realized-`CHAR`-only story-seed note landed.
