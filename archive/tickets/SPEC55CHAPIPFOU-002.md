# SPEC55CHAPIPFOU-002: Story-pipeline authoring-proposal seed-node guard

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`get_context_packet` seed filtering), package/repo MCP docs, and `docs/CONTEXT-PACKET-CONTRACT.md`
**Deps**: None

## Problem

Before this ticket, `get_context_packet` kept story-local node ids (`SF`, `BEL`, `PG`, …) out of the world-scope seed assembly for story-pipeline task types: gated by `isStoryPipelineTaskType`, `seedNodesForAssembly` filtered them out and `storyLocalSeedNodeWarnings` emitted `story_local_seed_nodes_ignored`, because story-local ids belong in the `story_bundle_context` layer (resolved via `story_slug`), not in world seeds. Non-story task types returned early and kept all seeds. The complementary case was unguarded: `NCP`/`NCB` are world-scope authoring-proposal ids, so when supplied as seeds to a story-pipeline task type they passed through `seedNodesForAssembly` and could resolve into the packet. Current story skills seed only with realized `CHAR` ids and world anchors, so this was not a current breakage — but it was an unprotected seam in the clean story/world separation. SPEC-55 Phase 2 (audit Medium #5) closed it by mirroring the existing story-local guard.

## Assumption Reassessment (2026-05-20)

1. Codebase: `tools/world-mcp/src/tools/get-context-packet.ts` imports `isStoryPipelineTaskType`, defines `STORY_LOCAL_SEED_NODE_WARNING = "story_local_seed_nodes_ignored"`, and now defines the sibling `AUTHORING_PROPOSAL_SEED_NODE_WARNING = "authoring_proposal_seed_nodes_ignored"`. `storyLocalSeedNodeWarnings` and `seedNodesForAssembly` both early-return for non-story task types and otherwise warn/drop seeds matching the story-local or authoring-proposal patterns. The two functions are the exact extension site; world authoring task types (e.g. `propose_new_characters`) keep all seeds via the early return.
2. Spec: SPEC-55 §Phase 2 (post-reassessment) names the corrected mechanism, the new constant `authoring_proposal_seed_nodes_ignored`, and the `docs/CONTEXT-PACKET-CONTRACT.md` note. §Out of Scope confirms hard rejection (vs warn+drop) is not chosen.
3. Cross-skill boundary under audit: the context-packet seed contract consumed by story-pipeline skills (`branching-story-bootstrap`, `branching-story-turn-cycle`) — they seed with realized `CHAR` ids and world anchors, never `NCP`/`NCB`. The guard makes that contract enforced rather than conventional; it must not drop `NCP`/`NCB` for world authoring task types.
4. FOUNDATIONS principle motivating this ticket: §Story Bundles §8 (story bundles are derived per-world layers; world-scope authoring-proposal records are not story cast) and clean story/world separation. The guard strengthens separation by keeping authoring-proposal nodes out of story packets; it resolves no Mystery Reserve entry and weakens no firewall.

## Architecture Check

1. Extending the two existing `isStoryPipelineTaskType`-gated functions with a second pattern is cleaner than adding a parallel filter pipeline: the drop+warn shape, the early-return-for-world-tasks behavior, and the warning-aggregation site are reused unchanged, so the new authoring-proposal case is symmetric to the established story-local case.
2. No backwards-compatibility shim: the new pattern + constant are additive; world task types are untouched (early return), and the existing story-local warning/drop is unchanged.

## Verification Layers

1. NCP/NCB seed dropped + warned for story tasks → `get-context-packet.story-pipeline.test.ts` assertion that the packet excludes the node and `task_header.warnings` contains `authoring_proposal_seed_nodes_ignored`.
2. World authoring tasks keep NCP/NCB seeds → `get-context-packet.test.ts` assertion that a `propose_new_characters` packet still resolves NCP/NCB seeds.
3. Existing story-local warning/drop unchanged → existing `get-context-packet.story-pipeline.test.ts` cases continue to pass.
4. Contract doc states realized-`CHAR`-only story-seed rule → grep-proof against `docs/CONTEXT-PACKET-CONTRACT.md`.

## Landed Changes

### 1. `get-context-packet.ts` — add authoring-proposal pattern + constant

Added `AUTHORING_PROPOSAL_SEED_NODE_PATTERN = /^(?:[a-z0-9-]+:)?(?:NCP|NCB)-\d+$/` and `AUTHORING_PROPOSAL_SEED_NODE_WARNING = "authoring_proposal_seed_nodes_ignored"`. In the story-pipeline branch of `seedNodesForAssembly`, seeds matching the new pattern are filtered out; in the story-pipeline branch of `storyLocalSeedNodeWarnings`, the new warning is emitted when any seed matches it. The non-story early returns stayed intact, so world authoring seeds are untouched.

### 2. Context-packet public docs

Added notes to `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md`: story-pipeline seed nodes must be realized `CHAR-<integer>` ids and world anchors; `NCP`/`NCB` authoring-proposal nodes are world-scope and are warned-and-dropped for story task types.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — add NCP/NCB drop+warn case)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — add world-task-keeps-NCP/NCB case and fixture nodes)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/README.md` (modify — public MCP behavior note)
- `docs/MACHINE-FACING-LAYER.md` (modify — public MCP behavior note)

## Out of Scope

- Hard rejection of NCP/NCB seeds (the chosen mechanism is warn+drop, symmetric to the story-local guard).
- Any change to the story-local pattern, the `story_bundle_context` assembly, or world-task seed handling.
- The completed MCP field-tool error work (`archive/tickets/SPEC55CHAPIPFOU-001.md`) and the schema-doc/regression-test work (SPEC55CHAPIPFOU-003).

## Acceptance Criteria

### Tests That Must Pass

1. A story-pipeline `get_context_packet` call seeded with an `NCP`/`NCB` id emits `authoring_proposal_seed_nodes_ignored` and excludes that node from the assembled packet.
2. A world authoring task (`propose_new_characters`) seeded with an `NCP`/`NCB` id still resolves it (world task types unaffected).
3. Existing story-local seed warnings/drops are unchanged.
4. `npm test` passes from `tools/world-mcp`.

### Invariants

1. The new guard fires only for story-pipeline task types (gated by `isStoryPipelineTaskType`); world task types keep their early-return seed pass-through.
2. The new warning constant is a sibling to `story_local_seed_nodes_ignored`, aggregated through the same `task_header.warnings` set.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — added NCP/NCB-seed drop+warn assertion.
2. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — added world-task-keeps-NCP/NCB assertion against indexed proposal nodes.

### Commands

1. `npm test` from `tools/world-mcp` (runs `npm run build` first, then compiled tests)
2. Grep proof:

```bash
rg -n 'authoring_proposal_seed_nodes_ignored|realized `CHAR|NCP` / `NCB`|NCP / NCB' docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/tools/get-context-packet.ts tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts tools/world-mcp/tests/tools/get-context-packet.test.ts
```

## Outcome

Completed: 2026-05-20.

Implemented the SPEC-55 Phase 2 story-pipeline authoring-proposal seed guard:

- `tools/world-mcp/src/tools/get-context-packet.ts` now recognizes `NCP` / `NCB` ids as authoring-proposal seeds for story-pipeline task types, filters them before packet assembly, and emits `authoring_proposal_seed_nodes_ignored` through the existing warning aggregation path.
- Non-story task types keep their existing early-return behavior, so world authoring packets such as `propose_new_characters` can still use indexed `NCP` / `NCB` seeds.
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` pins the story-task warn+drop behavior.
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` pins world-task pass-through with indexed NCP/NCB fixture nodes.
- `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` now state the realized-`CHAR` story-seed rule and the `authoring_proposal_seed_nodes_ignored` warning.

## Verification Result

- `npm test` from `tools/world-mcp` — PASS on 2026-05-20. The command ran `npm run build` first, then the compiled suite; result was 422 passing tests, 0 failures.
- Grep proof — PASS on 2026-05-20. This command confirmed the warning constant/test assertion and the realized-`CHAR` / NCP-NCB public contract prose in the owned source and docs:

```bash
rg -n 'authoring_proposal_seed_nodes_ignored|realized `CHAR|NCP` / `NCB`|NCP / NCB' docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tools/world-mcp/src/tools/get-context-packet.ts tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts tools/world-mcp/tests/tools/get-context-packet.test.ts
```

## Deviations

- The world-task pass-through test landed in `tools/world-mcp/tests/tools/get-context-packet.test.ts` instead of the story-pipeline-specific test file because it exercises the non-story `propose_new_characters` path and uses that file's existing world-authoring fixture.
- `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` were added to the touched set during package public-surface closeout because the new warning is user-facing MCP behavior.
- A separate `npm run build` command was not needed after `npm test`; the package test script runs `npm run build` as its first step.
