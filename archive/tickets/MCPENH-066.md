# MCPENH-066: Add `allocate_many_ids` MCP tool for batch-allocation of multi-class IDs at story-bundle bootstrap

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — new MCP tool at `tools/world-mcp/src/tools/allocate-many-ids.ts`; tool name registration in `tools/world-mcp/src/tool-names.ts`; registration/capability metadata in `tools/world-mcp/src/server.ts`; package-local handler and MCP boundary tests
**Deps**: None

## Problem

At intake, `mcp__worldloom__allocate_next_id` was the only allocator MCP tool. Every call returned exactly one id for exactly one class. For bootstrap-style workflows that initialize a story bundle from scratch (e.g., `.claude/skills/branching-story-bootstrap`), the Pre-flight Check required allocating IDs across every record class the bundle will draft — at typical seed-pool sizes, this is 20+ classes (STCHAR, STENT, STSTAT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, optional CLK/STSEC/STQ/STPLAN/STEMO/DA, BR, SE, PG, CHC, SLT, plus STORY at the per-world tier).

Session evidence: during the `branching-story-bootstrap` invocation that initialized `worlds/erotica-world/stories/red-bunny/` this session, the assistant made separate `mcp__worldloom__allocate_next_id` calls for every needed class (STORY, STCHAR, STENT, STSTAT, STINT, SF, BEL, OBL, CNSQ, THR, SREL, STLOC, STOBJ, CLK, STSEC, STQ, STPLAN, STEMO, BR, SE, PG, CHC, SLT) to confirm starting IDs for a fresh bundle. Every call returned `<CLASS>-1` because the bundle was new; the round-trip volume was the cost of confirming the fresh-bundle invariant for each class individually.

There was no correctness gap — the allocator worked as designed and the contract was clear that allocations are per-class. For fresh-bundle bootstrap (and parallel multi-class workflows such as bulk audit-time ID reservations), this ticket added `allocate_many_ids` so callers can batch the allocator into a single MCP round trip. The tool accepts a list of `{id_class, story_slug?, audit_id?}` allocations and returns a parallel list of `{id_class, allocated_id}` responses, applied in dependency-safe order (per-class monotonic). For mixed allocations the response preserves the request ordering so the caller can correlate request to response by index.

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/tools/allocate-next-id.ts` exports `allocateNextId`, `IdClass`, and `ID_CLASS_FORMATS`. It is registered in `tools/world-mcp/src/server.ts` via `allocateNextIdInputSchema` and the `registerToolWithCapability("allocate_next_id", ...)` block. The handler accepts `{world_slug, id_class, story_slug?, audit_id?}` and returns `{next_id: "<CLASS>-<integer>"}`. No batched form exists at pre-edit HEAD per `rg -n "allocate_many_ids|allocateManyIds|batch_allocate|bulk_allocate|allocate_next_ids" tools/world-mcp/src`.
2. The MCP tool documentation surfaces (`docs/MACHINE-FACING-LAYER.md`, `docs/ID-ALLOCATION.md`, `tools/world-mcp/README.md`, and the `describe_capabilities` runtime descriptor in `tools/world-mcp/src/server.ts`) describe only `allocate_next_id`. Live reassessment corrected the draft: there is no capability map in `tools/world-mcp/src/tools/_shared.ts`; capability metadata is accumulated in `src/server.ts`.
3. Cross-skill shared boundary: `branching-story-bootstrap` is the live consumer whose pre-flight currently instructs many single `allocate_next_id` calls. This ticket owns updating that current operational prose to prefer `allocate_many_ids` while preserving the same HARD-GATE requirement that all IDs are allocated before writes or patch-plan submission. The single-id allocator remains the right shape for incremental allocations (one record at a time during turn-cycle); the batched tool is additive — it does not retire `allocate_next_id`.
4. HARD-GATE triage: the bootstrap skill consumer text lives inside an existing `<HARD-GATE>` block, so `references/hard-gate-read-triage.md` and `docs/HARD-GATE-DISCIPLINE.md` were read. The edit is a command substitution in the unchanged pre-flight sequence; gate order, approval timing, failure handling, validation semantics, patch-plan submit behavior, and approval-token behavior remain unchanged.
5. Pre-edit package baseline: `cd tools/world-mcp && npm test` passed on 2026-05-25 with 452 passing tests before source edits. Ignored package artifacts (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`) were already present.

## Architecture Check

1. **A new tool, not an `allocate_next_id` extension.** Extending `allocate_next_id` to accept an array would break the existing `{world_slug, id_class}` contract — `id_class` is currently a closed-enum scalar, and changing it to an array shape is a breaking schema change. A sibling tool `allocate_many_ids` with its own `allocations: [{id_class, story_slug?, audit_id?}]` shape preserves the existing tool's contract and lets callers choose per-call ergonomics.
2. **No backwards-compatibility shims.** Existing per-call sites (current single-allocation pattern) continue working unchanged. The new tool is additive; no aliasing, no deprecated proxy.

## Verification Layers

1. The batched tool returns one allocation per request entry in stable order → package-local test: `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` asserts `response.allocations.length === request.allocations.length` AND `response.allocations[i].id_class === request.allocations[i].id_class` for an N-entry request.
2. Per-class allocations remain monotonic when the same class appears multiple times in one batch → package-local test asserts that a batch request with `[{id_class: "BEL"}, {id_class: "BEL"}]` returns `[{allocated_id: "BEL-1"}, {allocated_id: "BEL-2"}]` for a fresh bundle (or `[{allocated_id: "BEL-N+1"}, {allocated_id: "BEL-N+2"}]` for an existing bundle whose highest BEL is N).
3. Cross-class allocations are independent → package-local test asserts a mixed-class batch produces each class's correct next-id without cross-class interference.
4. The tool reuses the existing freshness guard (HOOK-001 `withIndexFreshnessGuard`) → grep: `rg -n 'withIndexFreshnessGuard' tools/world-mcp/src/tools/allocate-many-ids.ts` returns import and export-wrap hits, parallel to other read-side tools that consult the index.

## Landed Changes

### 1. New tool implementation

Created `tools/world-mcp/src/tools/allocate-many-ids.ts` exporting `allocateManyIds`. Handler signature:

```ts
type AllocationRequest = {
  id_class: IdClass;
  story_slug?: string;
  audit_id?: string;
};

type AllocateManyIdsInput = {
  world_slug: string;
  allocations: AllocationRequest[]; // minItems: 1
};

type AllocateManyIdsOutput = {
  allocations: Array<{ id_class: IdClass; allocated_id: string }>;
};
```

Implementation details:

- Iterates the input `allocations` list in order.
- Reuses an extracted `allocateNextIdWithOffset` helper from `tools/world-mcp/src/tools/allocate-next-id.ts` so the existing single-id API remains unchanged.
- Tracks per-scope offsets between entries within the batch so `[{BEL}, {BEL}]` returns `[BEL-1, BEL-2]` (not `[BEL-1, BEL-1]`).
- Reuses `withIndexFreshnessGuard` (HOOK-001) for stale-index recovery.
- The tool is read-side relative to canon (allocation is a derivation, not a write); no patch-engine routing needed.

### 2. Tool registration

Added the tool to `tools/world-mcp/src/tool-names.ts`, to the `tools/world-mcp/src/server.ts` import block, and to the `registerToolWithCapability` registration block. `describe_capabilities` surfaces the new tool through the `src/server.ts` capability registration list; there is no separate `_shared.ts` capability map.

### 3. JSON-Schema description

The tool's registered input schema follows the same scope shape as `allocate_next_id`, with `allocations` as a non-empty array of single-allocation shapes and `allocations[].id_class` exposed through capability metadata.

### 4. Documentation update

Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, `docs/ID-ALLOCATION.md`, `docs/FOUNDATIONS.md`, and `branching-story-bootstrap` pre-flight prose to document the new tool alongside `allocate_next_id` with the bootstrap-batch motivation.

## Files to Touch

- `tools/world-mcp/src/tools/allocate-many-ids.ts` (new)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify — extracted offset-capable shared allocator helper while preserving `allocateNextId`)
- `tools/world-mcp/src/server.ts` (modify — import + registration)
- `tools/world-mcp/src/tool-names.ts` (modify — tool key + order)
- `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — registration/dispatch/capability proof)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — registered tool inventory count)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — static capability fixture)
- `tools/world-mcp/tests/integration/spec42-capstone.test.ts` (modify — bootstrap skill contract literal now names `allocate_many_ids`)
- `tools/world-mcp/README.md` (modify — document the new tool)
- `docs/MACHINE-FACING-LAYER.md` (modify — document the new tool in the allocator section)
- `docs/ID-ALLOCATION.md` (modify — document batch allocation as the equivalent pre-flight route)
- `docs/FOUNDATIONS.md` (modify — story-bundle ID allocation route mentions the batch equivalent)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — pre-flight HARD-GATE allocation wording prefers batch allocation)
- `.claude/skills/branching-story-bootstrap/references/pre-flight-and-prerequisites.md` (modify — operational pre-flight allocation step uses batch allocation)

## Out of Scope

- Retiring or deprecating `allocate_next_id`. The single-id form remains the right shape for turn-cycle and incremental-allocation workflows.
- Per-class allocator changes (the underlying per-class monotonic-integer derivation is unchanged).
- Transactional allocation semantics across batches. The new tool is sequential per-entry; if entries 1-5 succeed and entry 6 fails, the failure aborts with entries 1-5 already allocated. Operators needing strict all-or-nothing semantics should validate the input client-side before submitting. The error contract: the tool returns an `McpError` on any per-entry failure with `details.successful_allocations: [{...}]` so the caller can reconcile.
- Cross-world batching (the tool is scoped to one `world_slug` per call, matching the existing allocator's contract).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — the new `tests/tools/allocate-many-ids.test.ts` plus all existing tests pass.
2. A bootstrap-shape batch of STORY plus the story-bundle classes exercised by `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` returns `<CLASS>-1` for each class in the request ordering.
3. A batch with repeated same-class entries returns monotonically incrementing ids for that class within the batch.
4. A batch invocation against a world whose index is stale uses the same `withIndexFreshnessGuard` wrapper as other read-side tools.

### Invariants

1. The new tool's response ordering matches the request ordering element-for-element (deterministic; non-shuffled).
2. Per-class monotonicity is preserved across batches AND within a single batch.
3. The existing `allocate_next_id` tool's contract and behavior are unchanged (no breaking modifications to single-id callers).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/allocate-many-ids.test.ts` (new) — exercises the batched allocator's order-preservation, intra-batch monotonicity, cross-class independence, and freshness-guard wrapping.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — exercises registration, input validation, and ordered monotonic batch dispatch through the MCP boundary.
3. `tools/world-mcp/tests/server/list-tools.test.ts` — updates registered tool inventory count.
4. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — proves `describe_capabilities` exposes the new enum-valued input contract.
5. `tools/world-mcp/tests/integration/spec42-capstone.test.ts` — keeps the bootstrap skill contract literal witness aligned to `allocate_many_ids`.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/allocate-many-ids.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

Completion date: 2026-05-25.

Implemented `mcp__worldloom__allocate_many_ids` as an additive ordered batch allocator. `allocate_next_id` remains available and delegates to the same offset-capable helper with zero offset, preserving existing single-id behavior. The new batch tool is registered in `MCP_TOOL_NAMES`, `MCP_TOOL_ORDER`, the server input schema, and `describe_capabilities`; package docs and repo allocation docs now document the batch route. `branching-story-bootstrap` now prefers `allocate_many_ids` in pre-flight while preserving the HARD-GATE requirement that IDs are allocated before any writes or patch-plan submission.

## Verification Result

1. `cd tools/world-mcp && npm test` — pre-edit baseline passed with 452 tests.
2. `cd tools/world-mcp && npm run build` — passed after implementation.
3. `cd tools/world-mcp && node --test dist/tests/tools/allocate-many-ids.test.js` — passed, 4 tests.
4. `cd tools/world-mcp && node --test dist/tests/server/dispatch.test.js` — passed, 36 tests.
5. `cd tools/world-mcp && npm test` — first post-change broad run failed on same-seam proof surfaces only: `SPEC-42 capstone covers story-skill contract surfaces` still expected the old bootstrap allocation literal, and `listTools returns exactly the registered worldloom MCP tool inventory` still expected 25 tools.
6. `cd tools/world-mcp && npm run build` — passed after proof-surface fixes.
7. `cd tools/world-mcp && node --test dist/tests/integration/spec42-capstone.test.js dist/tests/server/list-tools.test.js` — passed, 5 tests.
8. `cd tools/world-mcp && npm test` — final broad run passed with 457 tests.
9. `rg -n 'withIndexFreshnessGuard' tools/world-mcp/src/tools/allocate-many-ids.ts` — import and export-wrap hits, proving the new tool is wrapped by HOOK-001 freshness recovery.
10. Manual grep/stale-surface review confirmed current package docs, repo allocation docs, registered metadata, and `branching-story-bootstrap` pre-flight prose now mention `allocate_many_ids`; remaining `allocate_next_id` hits are legitimate single-id and fallback/incremental-use references.

## Deviations

- Live reassessment corrected the drafted capability-map target: `tools/world-mcp/src/tools/_shared.ts` does not own capability registration; `tools/world-mcp/src/server.ts` does.
- Required same-seam fallout added `tools/world-mcp/src/tool-names.ts`, `tools/world-mcp/tests/server/list-tools.test.ts`, `tools/world-mcp/tests/integration/spec42-capstone.test.ts`, `docs/ID-ALLOCATION.md`, `docs/FOUNDATIONS.md`, and the `branching-story-bootstrap` pre-flight surfaces to the landed file set.
- The bootstrap skill prose lives inside a `<HARD-GATE>` block; `docs/HARD-GATE-DISCIPLINE.md` was read. The landed edit preserves gate order, approval timing, validation semantics, submit behavior, and approval-token behavior.
- The final implementation did not modify `tools/world-mcp/tests/tools/allocate-next-id.test.ts`; the unchanged single-id contract is covered by the broad package suite.
