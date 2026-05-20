# MCPENH-059: get_context_packet's story-local seed-node pattern omits STPLAN/STEMO

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-context-packet.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`.
**Deps**: None.

## Problem

`STORY_LOCAL_SEED_NODE_PATTERN` in `tools/world-mcp/src/tools/get-context-packet.ts:31` enumerates the story-local record-id classes so that story-local `seed_nodes` passed to `get_context_packet` are (a) flagged with the `story_local_seed_nodes_ignored` warning and (b) filtered out of world-canon assembly (`storyLocalSeedNodeWarnings` / `seedNodesForAssembly`). The pattern lists every story-local class — including the SPEC-42 trio CLK/STSEC/STQ and the audit/promotion classes SLB/SAU/SP/RSP — but **omits STPLAN and STEMO**. A `STPLAN-<n>` or `STEMO-<n>` seed_node is therefore not recognized as story-local: it is neither warned nor filtered, and (post-MCPENH-058) is treated as an unresolvable world-canon seed and skipped with a generic warning. This is a completeness gap from the SPEC-42 → SPEC-47 transition (the pattern was last updated for the SPEC-42 classes and never extended for the two SPEC-47 classes).

## Assumption Reassessment (2026-05-20)

1. Confirmed at HEAD: `get-context-packet.ts:31` `STORY_LOCAL_SEED_NODE_PATTERN` includes `SF|BEL|SE|DA|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|CLK|STSEC|STQ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP` but not STPLAN/STEMO; it is consumed by `storyLocalSeedNodeWarnings` and `seedNodesForAssembly`. **Change attribution (no-silent-retcons):** existing behavior — a STPLAN/STEMO seed_node is unrecognized (not warned, not filtered); new behavior — recognized as story-local like every other bundle class.
2. Confirmed at HEAD: `docs/CONTEXT-PACKET-CONTRACT.md` describes the story-local-seed warning generically (it does not enumerate the class list), so the pattern is the source of truth and no doc enumeration drifts; no doc edit is required.
3. Shared boundary under audit: the story-local-class enumeration inside `get_context_packet` versus the canonical story-bundle record-class set (the same set `branching-story-bootstrap`/`turn-cycle` emit). The fix brings the packet's notion of "story-local id" in line with that set.
4. The retrieval surface this completes is the context-packet path mandated by FOUNDATIONS §Tooling Recommendation. This is a robustness/completeness fix to that surface; it changes no contract-level commitment and needs no FOUNDATIONS amendment.

## Architecture Check

1. The fix mirrors every other story-local class already in the pattern — additive widening of a recognition regex, no new code path. Cleaner than special-casing STPLAN/STEMO elsewhere.
2. No backwards-compatibility shims: the regex is extended in place.

## Verification Layers

1. A STPLAN/STEMO seed_node is recognized as story-local → unit test (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): a `story_bootstrap` call with a `STPLAN-1`/`STEMO-1` seed emits `story_local_seed_nodes_ignored` and the seed is excluded from assembly.
2. World-canon seeds still pass through unchanged → existing context-packet tests stay green.

## What to Change

1. `tools/world-mcp/src/tools/get-context-packet.ts` — add `STPLAN` and `STEMO` to `STORY_LOCAL_SEED_NODE_PATTERN`.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify)

## Out of Scope

- Resolving story-local seed_nodes against bundle state (the contract is to ignore-and-warn, not resolve).
- Any other retrieval tool or the seed-resolution graceful-degradation behavior (MCPENH-058).

## Acceptance Criteria

- **Tests that must pass**: a STPLAN/STEMO seed_node triggers `story_local_seed_nodes_ignored` and is filtered from assembly; the existing `tools/world-mcp/tests/context-packet/*` and `tests/tools/get-context-packet.*` suites stay green.
- **Invariants**: no world-canon seed behavior changes; the only change is STPLAN/STEMO now recognized as story-local.

## Test Plan

- **New/modified tests**: extend `get-context-packet.story-pipeline.test.ts` with a STPLAN/STEMO story-local-seed case.
- **Commands**:
  - `cd tools/world-mcp && npm test`
  - Targeted: `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js`
