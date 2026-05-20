# MCPENH-058: get_context_packet hard-aborts the whole packet on the first unresolvable seed_node

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/local-authority.ts`, `tools/world-mcp/src/context-packet/assemble.ts`, `tools/world-mcp/src/server.ts`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and the story-pipeline packet test.
**Deps**: None.

## Problem

At intake, during the `red-bunny` `branching-story-bootstrap` run, the documented Pre-flight call `get_context_packet(world_slug, task_type='story_bootstrap', story_slug=..., seed_nodes=<cast CHAR ids + initial_location label>)` returned only `{ code: node_not_found, message: "Node 'the park near the Leka Enea school' does not exist." }`. The entire packet aborted because one seed, the initial_location label, was not an indexed node. The resolvable cast-id seeds and the whole governing-world context were discarded; the operator had to drop the label and re-call.

Before this ticket, `findLocalAuthoritySourceNodeIds` hard-errored on the first unresolvable seed: `findMissingSeedNodeId(...)` -> `createMcpError("node_not_found", ...)`, which `assemble.ts` propagated as a fatal tool error. `branching-story-bootstrap` §World-State Prerequisites prescribes passing the initial_location *label* as a seed; story-local locations can have no world ENT node, so the documented call shape could hard-fail. This contrasted with `get_records`, which returns per-id `found: false` for missing ids. This ticket now skips unresolvable seed(s), surfaces them in the packet's existing `warnings[]` channel, and assembles local authority from the resolvable subset.

## Assumption Reassessment (2026-05-20)

1. Intake confirmed via grep of `tools/world-mcp/src/context-packet/`: `findLocalAuthoritySourceNodeIds` returned `createMcpError("node_not_found", ...)` on the first missing seed and `assemble.ts` treated that as fatal. **Change attribution (no-silent-retcons):** this ticket replaces that abort with skip-and-warn behavior: each unresolvable seed gets a `task_header.warnings[]` entry, resolvable seeds still populate `local_authority`, and all-unresolvable seed sets still return seed-independent context with an aggregate warning.
2. Intake confirmed: `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` are user-facing or machine-facing contract surfaces for `get_context_packet`. All now describe the unresolvable-seed graceful-degradation behavior.
3. Shared boundary under audit: the contract between (a) `branching-story-bootstrap` §World-State Prerequisites seed-shape prose, (b) the `get_context_packet` seed-resolution code (`local-authority.ts` + `assemble.ts`), and (c) the package/repo docs plus registered capability metadata. The fix lands in (b)+(c); (a) remains the adjacent skill-prose contradiction (item 5).
4. The retrieval surface this hardens is the context-packet path mandated by FOUNDATIONS §Tooling Recommendation as the standard world-canon loading mechanism. This ticket is an implementation robustness fix to that surface; it does not change any contract-level commitment and requires no FOUNDATIONS amendment.
5. Adjacent contradiction surfaced during reassessment (separate, routed elsewhere): `branching-story-bootstrap` §World-State Prerequisites instructs passing the initial_location *label* as a `seed_node`, which is the skill-side cause of the hard failure. That is skill-prose drift, out of this pipeline ticket's scope; route it via `/skill-audit .claude/skills/branching-story-bootstrap` so the prose resolves the label to a node id or omits it. This pipeline robustness fix stands independently of that prose correction.

## Architecture Check

1. Per-seed graceful skip with `warnings[]` surfacing mirrors the established `get_records` per-id `found: false` posture and reuses the packet's existing `warnings[]` / `dropped_node_ids_by_class` soft-signal channels. The all-unresolvable case adds only an aggregate warning, not a new response field. This is cleaner than the alternative of resolving free-text labels to nodes inside the packet, which would couple `get_context_packet` to entity-name resolution it does not own.
2. No backwards-compatibility shims: the hard-abort path is replaced, not aliased or dual-pathed. A call that previously returned `node_not_found` for a single bad seed now returns an assembled packet with that seed named in `warnings[]`.

## Verification Layers

1. Unresolvable seed no longer aborts -> unit test (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): a `story_bootstrap` call mixing a resolvable world seed with one bogus label returns an assembled packet whose `warnings[]` names the unresolved seed, not an `McpError`.
2. All-unresolvable seed sets still assemble seed-independent context -> unit test (`tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`): a `story_bootstrap` call with only a bogus label returns an assembled packet with empty `local_authority`, populated governing context, per-seed warning, and aggregate warning.
3. Resolvable seeds still anchor local authority -> broad package tests: the `tools/world-mcp` package suite stays green.
4. Docs and capability metadata match behavior -> manual review / grep: `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` describe unresolvable-seed skip-and-warn.

## Landed Changes

1. `tools/world-mcp/src/context-packet/local-authority.ts` — `findLocalAuthoritySourceNodeIds` now partitions seed ids into present vs unresolved, returns source node ids plus unresolved seed ids, and no longer emits `node_not_found`.
2. `tools/world-mcp/src/context-packet/assemble.ts` — assembly now appends per-seed warnings, uses only resolvable seeds for local authority and related layers, and adds an aggregate warning when every seed was unresolved.
3. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — added mixed-valid/unresolvable and all-unresolvable story-bootstrap coverage.
4. `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `tools/world-mcp/src/server.ts` — documented the skip-and-warn behavior across operator docs, package README, and registered capability metadata.

## Files to Touch

- `tools/world-mcp/src/context-packet/local-authority.ts` (modify)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify)

## Out of Scope

- The `branching-story-bootstrap` §World-State Prerequisites seed-shape prose (routed to `/skill-audit`).
- Resolving free-text location labels to world ENT nodes inside the packet (skip-and-warn, not name-resolve).
- Any change to `get_records` or other retrieval tools.

## Acceptance Criteria

- **Tests that passed**: `story_bootstrap` packet calls with mixed valid/unresolvable seeds and all-unresolvable seeds return normal packets with warnings; the full `tools/world-mcp` package suite stays green.
- **Invariants**: no call shape that previously returned a valid packet changes behavior; the only behavior change is unresolvable-seed → warn-and-skip instead of abort.

## Test Plan

- **New/modified tests**: extended `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` with unresolvable-seed graceful-degradation cases:
  - mixed valid + invalid seeds -> assembled packet with a `warnings[]` entry naming the bad seed and valid local authority retained
  - all invalid seeds -> assembled seed-independent packet with empty `local_authority`, governing context, per-seed warning, and aggregate warning
- **Commands**:
  - Targeted: `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js`
  - `cd tools/world-mcp && npm test`

## Outcome

`get_context_packet` no longer hard-aborts when `seed_nodes` contains an unresolvable id or free-text label. Resolvable seeds continue to anchor `local_authority`; missing seeds are omitted and named in `task_header.warnings`; if no seed resolves, the packet still returns seed-independent governing/world context with an aggregate warning.

## Verification Result

1. Baseline before edits: `cd tools/world-mcp && npm test` passed (`410` reported passes, `0` failures).
2. Focused final proof: `cd tools/world-mcp && npm run build && node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` passed (`12` reported passes, `0` failures).
3. Broad final proof: `cd tools/world-mcp && npm test` passed (`412` reported passes, `0` failures).
4. Manual public-surface review confirmed the behavior is documented in `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and registered capability metadata in `tools/world-mcp/src/server.ts`.

## Deviations

The live public-surface sweep added `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/src/server.ts` to the file set. Those are same-seam contract surfaces for `get_context_packet`, so they moved with the package behavior rather than being left as follow-up drift. `tickets/MCPENH-058.md` was already untracked at intake and was updated in place; archival was not requested.
