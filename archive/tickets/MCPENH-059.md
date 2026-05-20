# MCPENH-059: get_context_packet's story-local seed-node pattern omits STPLAN/STEMO

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-context-packet.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`.
**Deps**: None.

## Problem

At intake, `STORY_LOCAL_SEED_NODE_PATTERN` in `tools/world-mcp/src/tools/get-context-packet.ts` enumerated the story-local record-id classes so that story-local `seed_nodes` passed to `get_context_packet` are (a) flagged with the `story_local_seed_nodes_ignored` warning and (b) filtered out of world-canon assembly (`storyLocalSeedNodeWarnings` / `seedNodesForAssembly`). The pattern listed every story-local class — including the SPEC-42 trio CLK/STSEC/STQ and the audit/promotion classes SLB/SAU/SP/RSP — but **omitted STPLAN and STEMO**. A `STPLAN-<n>` or `STEMO-<n>` seed_node was therefore not recognized as story-local: it was neither warned nor filtered, and (post-MCPENH-058) was treated as an unresolvable world-canon seed and skipped with a generic warning. This was a completeness gap from the SPEC-42 → SPEC-47 transition (the pattern was last updated for the SPEC-42 classes and never extended for the two SPEC-47 classes).

## Assumption Reassessment (2026-05-20)

1. Confirmed at intake: `get-context-packet.ts` `STORY_LOCAL_SEED_NODE_PATTERN` included `SF|BEL|SE|DA|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|CLK|STSEC|STQ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP` but not STPLAN/STEMO; it is consumed by `storyLocalSeedNodeWarnings` and `seedNodesForAssembly`. **Change attribution (no-silent-retcons):** previous behavior — a STPLAN/STEMO seed_node was unrecognized (not warned, not filtered); landed behavior — recognized as story-local like every other bundle class.
2. Confirmed during reassessment: `docs/CONTEXT-PACKET-CONTRACT.md` describes the story-local-seed warning generically (it does not enumerate the class list), so the pattern is the source of truth and no doc enumeration drifts; no doc edit was required.
3. Shared boundary under audit: the story-local-class enumeration inside `get_context_packet` versus the canonical story-bundle record-class set (the same set `branching-story-bootstrap`/`turn-cycle` emit). The fix brings the packet's notion of "story-local id" in line with that set.
4. The retrieval surface this completes is the context-packet path mandated by FOUNDATIONS §Tooling Recommendation. This is a robustness/completeness fix to that surface; it changes no contract-level commitment and needs no FOUNDATIONS amendment.

## Architecture Check

1. The fix mirrors every other story-local class already in the pattern — additive widening of a recognition regex, no new code path. Cleaner than special-casing STPLAN/STEMO elsewhere.
2. No backwards-compatibility shims: the regex is extended in place.

## Verification Layers

1. A STPLAN/STEMO seed_node is recognized as story-local -> unit test (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): a `story_turn_cycle` call with `STPLAN-1`/`STEMO-1` seeds emits `story_local_seed_nodes_ignored` and the seeds are excluded from assembly.
2. World-canon seeds still pass through unchanged → existing context-packet tests stay green.

## Landed Changes

1. `tools/world-mcp/src/tools/get-context-packet.ts` — added `STPLAN` and `STEMO` to `STORY_LOCAL_SEED_NODE_PATTERN`.
2. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — added a compiled-package test case proving `opening-bells:STPLAN-1` and `opening-bells:STEMO-1` seed nodes are warned as story-local, filtered from world-scope local authority, and do not affect a world-canon `CF-1` seed.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify)

## Out of Scope

- Resolving story-local seed_nodes against bundle state (the contract is to ignore-and-warn, not resolve).
- Any other retrieval tool or the seed-resolution graceful-degradation behavior (MCPENH-058).

## Acceptance Criteria

- **Tests that passed**: a STPLAN/STEMO seed_node triggers `story_local_seed_nodes_ignored` and is filtered from assembly; the existing `tools/world-mcp/tests/context-packet/*` and `tests/tools/get-context-packet.*` coverage stayed green through the full package suite.
- **Invariants**: no world-canon seed behavior changes; the only change is STPLAN/STEMO now recognized as story-local.

## Test Plan

- **New/modified tests**: extended `get-context-packet.story-pipeline.test.ts` with a STPLAN/STEMO story-local-seed case.
- **Commands**:
  - `cd tools/world-mcp && npm test`
  - Targeted: `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js`

## Outcome

Completion date: 2026-05-20.

`get_context_packet` now treats `STPLAN-<n>` and `STEMO-<n>` seed nodes, including story-prefixed forms such as `opening-bells:STPLAN-1`, as story-local IDs for story-pipeline task types. They produce the existing `story_local_seed_nodes_ignored` warning and are filtered before world-canon packet assembly, while world-canon seeds continue to populate `local_authority`.

## Verification Result

1. Baseline before edits: `cd tools/world-mcp && npm test` passed (`412` pass, `0` fail).
2. Focused proof after edits: `cd tools/world-mcp && npm run build`, then `node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` passed (`13` pass, `0` fail).
3. Broad package proof after edits: `cd tools/world-mcp && npm test` passed (`413` pass, `0` fail).
4. Package public-surface review: `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `tools/world-mcp/src/server.ts` were inspected. The user-facing contract remains generic ("story-local ids" warning), while STPLAN/STEMO are already documented as story-bundle classes elsewhere, so no same-seam docs/metadata edit was required.
5. Generated/ignored artifacts refreshed: `tools/world-mcp/dist/` was rebuilt by `npm run build` / `npm test`.

## Deviations

- No scope deviation. HARD-GATE discipline was not required because this change does not alter canon writes, validation gates, approval flow, or operator PASS/FAIL criteria.
