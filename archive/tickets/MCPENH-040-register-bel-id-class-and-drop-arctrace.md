# MCPENH-040: Register `BEL` id class in allocator; drop `ARCTRACE` registration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` allocator registry, MCP input enum/capability metadata, focused tests, and package README
**Deps**: None (lands before `branching-story-bootstrap` is first invoked per the greenfield plan §D step 10c)

## Problem

The rebuilt story-skill family (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`) introduces a first-class `BEL` (Belief) record class for story-bundle records. `BEL` is the missing coherence primitive that lets the engine distinguish what is true in a branch (`SF`) from what a holder believes / claims / witnesses / lies about (`BEL`). The `BEL` class is required by:

- `.claude/skills/_shared-templates/story-state-contract.md` §3 record class inventory and §4.1 schema.
- `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 3 (Create initial belief state) and Phase 6 (PG snapshot's `state_snapshot.active_records.BEL` key).
- Future siblings: `branching-story-turn-cycle` (BEL updates per turn), `branching-story-health-audit` (belief / visibility health check), `commitment-block-authoring` (predicate `belief(holder, claim, confidence?)`), `story-fact-promotion-to-canon` (BEL → CF promotion path).

At intake, the allocator at `tools/world-mcp/src/tools/allocate-next-id.ts` lacked a `BEL` entry in `STORY_SCOPED_ID_CLASS_DIRECTORIES`, so `mcp__worldloom__allocate_next_id(world_slug, 'BEL', story_slug=...)` failed for the new family.

The same plan deletes the `ARCTRACE` class entirely (the new `branching-story-prose-attach` skill does not produce ARC_TRACE records; the page snapshot is authoritative and prose is a receipt). This ticket dropped the allocator's existing `ARCTRACE: "arc-traces"` entry and removed `ARCTRACE` from the allocator input enum.

## Assumption Reassessment (2026-05-13)

1. **Allocator file path verified.** `tools/world-mcp/src/tools/allocate-next-id.ts` is the live allocator; `STORY_SCOPED_ID_CLASS_DIRECTORIES` is the directory-mapping registry. It now includes `BEL: "beliefs"` and no longer includes `ARCTRACE: "arc-traces"`.
2. **`IdClass` type exports.** The TypeScript `IdClass` type is derived from `keyof typeof ID_CLASS_FORMATS` in `tools/world-mcp/src/tools/allocate-next-id.ts`. Adding `BEL` to `ID_CLASS_FORMATS` and removing `ARCTRACE` updates the direct handler type; `tools/world-mcp/src/server.ts` `ID_CLASSES` is the MCP input enum/capability metadata mirror and was updated in lockstep.
3. **Cross-skill schema parity.** The `BEL` id class is named in the shared story state contract (`.claude/skills/_shared-templates/story-state-contract.md` §3) and in `branching-story-bootstrap` Pre-flight step 5; both surfaces assume the allocator supports it.
4. **FOUNDATIONS principle.** This ticket realizes FOUNDATIONS §Story Bundles §6 (the rebuilt-family record-class inventory adds `BEL` per the greenfield plan's §F.1 stale-reference cleanup of FOUNDATIONS §Story Bundles §1 + §6); registering the id class is the allocator-side execution of that doctrine.
5. **HARD-GATE / canon-write impact.** None. The allocator is a read-only registry update; no Mystery Reserve firewall surfaces are touched.
6. **Schema extension impact.** Extending `STORY_SCOPED_ID_CLASS_DIRECTORIES` with `BEL: "beliefs"` is additive. Dropping `ARCTRACE` from the allocator is removal at the allocation/input-enum layer only. Live reassessment found broader `ARC_TRACE` retrieval/index/patch-engine surfaces still present in `tools/world-mcp/src/tools/_shared.ts`, `tools/world-mcp/src/server.ts` `get_record` description, story-bundle retrieval tests, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md`; those are not allocator registration and remain owned by the greenfield removal/PEENH follow-up track.
7. **Rename / removal blast radius.** `rg -n 'ARCTRACE|arc-traces|ARC_TRACE|BEL' tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md` shows the allocator-owned sites are `tools/world-mcp/src/tools/allocate-next-id.ts`, `tools/world-mcp/src/server.ts` `ID_CLASSES`, `tools/world-mcp/tests/tools/allocate-next-id.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and `tools/world-mcp/README.md`'s `allocate_next_id` row. Existing `get_record` / `list_records` / schema-discovery ARC_TRACE references are intentionally left to the separate retrieval/index/patch-engine removal track.
8. **Direct MCP invocation availability.** No external `mcp__worldloom__allocate_next_id` tool is exposed in this Codex session. Acceptance is rewritten to package-local handler and in-memory MCP dispatch/capability tests, which are the truthful post-source-change proof before a live MCP server restart.
9. **Adjacent contradictions.** `tools/world-mcp/src/context-packet/shared.ts` currently lists `STORY_PIPELINE_TASK_TYPES = ["story_bootstrap", "story_page_cycle", "storylet_pool_authoring", "branching_story_health_audit", "story_fact_promotion_to_canon"]`. The legacy `story_page_cycle` and `storylet_pool_authoring` task types are now mis-named for the rebuilt family (`branching-story-turn-cycle` and `commitment-block-authoring`). That's a separate MCPENH-NNN ticket scope — flag it as future cleanup, do not address here.

## Architecture Check

1. **Additive `BEL` registration** is the minimal change consistent with the rebuilt-family contract. Alternative considered: introduce an abstraction layer that auto-discovers id classes from a separate manifest file. Rejected: the existing registry pattern is explicit and trivially auditable; an abstraction layer would introduce indirection without solving a real problem.
2. **No backwards-compatibility shim** for `ARCTRACE`. Per the greenfield plan, no live ARCTRACE ids exist in any retained world (red-bunny was the only bundle with ARC_TRACE records and was deleted). A shim would preserve a deleted class for no consumer.

## Verification Layers

1. **`BEL` allocator works**: `allocateNextId` returns `BEL-0001` for a freshly-created story bundle with no prior `_source/beliefs/` directory and `BEL-NNNN+1` after one record exists. → focused package-local handler test.
2. **`ARCTRACE` allocator rejects**: `allocateNextId({ world_slug, id_class: 'ARCTRACE', story_slug })` rejects with "Unsupported id_class" rather than silently allocating from a stale registry. → focused package-local handler test with the removed value cast through the direct API boundary.
3. **MCP input enum/capability surface updated**: the in-memory MCP server accepts `BEL`, rejects `ARCTRACE` at validation, and `describe_capabilities` exposes `BEL` but not `ARCTRACE` for `allocate_next_id.id_class`. → server dispatch and capability tests.
4. **Allocator source/docs no longer advertise `ARCTRACE` allocation**: `rg -n 'ARCTRACE|arc-traces' tools/world-mcp/src/tools/allocate-next-id.ts` and `rg -n 'allocate_next_id.*(ARCTRACE|arc-traces)' tools/world-mcp/README.md` return zero matches after this ticket lands. Broader ARC_TRACE retrieval/index references are intentionally outside this allocator ticket.

## Landed Changes

### 1. Added `BEL: "beliefs"` and removed allocator `ARCTRACE`

`tools/world-mcp/src/tools/allocate-next-id.ts` now defines `BEL` in `ID_CLASS_FORMATS`, maps it to `_source/beliefs/`, and no longer recognizes `ARCTRACE` as an allocator id class.

### 2. Updated allocator-facing MCP metadata and docs

`tools/world-mcp/src/server.ts` `ID_CLASSES`, focused dispatch/capability tests, and the `tools/world-mcp/README.md` `allocate_next_id` row now expose `BEL` and omit `ARCTRACE` for allocation.

### 3. Updated focused tests

`tools/world-mcp/tests/tools/allocate-next-id.test.ts` covers `BEL` first-run and incrementing allocation, preserves the 49-class registry count, and asserts direct-handler `ARCTRACE` rejection. `tools/world-mcp/tests/server/dispatch.test.ts` covers in-memory MCP `BEL` dispatch and `ARCTRACE` input-schema rejection. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` asserts the advertised allocator enum includes `BEL` and omits `ARCTRACE`.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify — allocator input enum / capability metadata)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify — BEL allocation and ARCTRACE rejection)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — BEL dispatch and ARCTRACE validation rejection)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — capability enum includes BEL and omits ARCTRACE)
- `tools/world-mcp/README.md` (modify — allocator class list)

## Out of Scope

- Renaming `story_page_cycle` task type to `story_turn_cycle` (flagged in Assumption Reassessment item 9; separate ticket).
- Renaming `storylet_pool_authoring` task type to `commitment_block_authoring` (same).
- The corresponding patch-engine op `create_bel_record` (PEENH-007) and validator `record_schema_compliance` for BEL (VALENH-011) — those ship alongside the rebuilt family, not as a Shape C "must land before bootstrap ships" prerequisite.
- Removing existing ARC_TRACE retrieval/index/schema support outside the allocator input enum. Live `get_record`, `list_records`, `get_record_schema`, patch-engine, and world-index references remain a separate greenfield removal track.
- Editing the currently dirty/untracked `.claude/skills/branching-story-bootstrap` surfaces. They already consume `BEL`, but their "MCPENH-040 lands via..." debt note is excluded from this package-local ticket because that skill tree is active sibling work in the dirty worktree.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local handler tests show `BEL` returns `BEL-0001` on first call and increments from existing `_source/beliefs/BEL-NNNN.yaml` records.
2. Package-local handler and MCP dispatch tests show `ARCTRACE` is rejected as an unsupported/invalid allocator id class.
3. In-memory MCP dispatch/capability tests show `allocate_next_id.id_class` includes `BEL` and omits `ARCTRACE`.
4. `tools/world-mcp` build passes; full package suite was attempted and only failed on pre-existing dirty/deleted `.claude/skills/branching-story-bootstrap/references/*` files outside this allocator ticket.

### Invariants

1. The `BEL` id class always allocates from `worlds/<slug>/stories/<story-slug>/_source/beliefs/BEL-NNNN.yaml` (the path the patch engine will write to via `create_bel_record` per PEENH-007).
2. No silent ARCTRACE allocation occurs anywhere in the allocator code path.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — add `BEL` allocation test cases; remove ARCTRACE allocator support and add rejection coverage.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — exercise `BEL` through the in-memory MCP boundary and assert `ARCTRACE` is rejected by the MCP input schema.
3. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — assert `describe_capabilities` allocator metadata includes `BEL` and omits `ARCTRACE`.

### Commands

1. `cd tools/world-mcp && npm test` — build passes; full suite currently fails only on pre-existing dirty/deleted branching-story-bootstrap reference files outside this ticket.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js`
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js`
4. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js`
5. `rg -n 'ARCTRACE|arc-traces' tools/world-mcp/src/tools/allocate-next-id.ts` — returns zero matches.
6. `rg -n 'allocate_next_id.*(ARCTRACE|arc-traces)' tools/world-mcp/README.md` — returns zero matches.

## Outcome

Implemented the allocator-side greenfield prerequisite: `BEL` is now a story-scoped allocator class at `_source/beliefs/`, `ARCTRACE` is no longer accepted by the allocator or advertised in the allocator input enum, and the package README allocator row matches the new allocation contract. Existing ARC_TRACE retrieval/index/schema references remain intentionally outside this allocator ticket.

## Verification Result

1. `cd tools/world-mcp && npm test` — `npm run build` passed; suite then failed on two unrelated SPEC-22 capstone tests trying to read pre-existing missing dirty-worktree files under `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` and `phase-6-storylet-pool-seed.md`.
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-next-id.test.js` — passed.
3. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed.
4. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js` — passed.
5. `rg -n 'ARCTRACE|arc-traces' tools/world-mcp/src/tools/allocate-next-id.ts` — no matches.
6. `rg -n 'allocate_next_id.*(ARCTRACE|arc-traces)' tools/world-mcp/README.md` — no matches.

## Deviations

- The drafted direct `mcp__worldloom__allocate_next_id` smoke was replaced with package-local handler and in-memory MCP dispatch/capability tests because the external MCP tool is not exposed in this Codex session.
- The drafted broad `tools/world-mcp/src/` zero-ARC_TRACE grep was narrowed to allocator source and allocator README documentation. Live ARC_TRACE retrieval/index/schema support still exists and is not removed by this allocator-only ticket.
- Full `tools/world-mcp` suite is not green in this dirty checkout because of pre-existing story-skill reference deletions, not allocator fallout. The touched focused tests and build passed.
