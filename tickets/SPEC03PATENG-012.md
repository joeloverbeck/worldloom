# SPEC03PATENG-012: Patch receipt reports CH new_nodes with change_id

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — fix `tools/patch-engine/src/apply.ts` receipt assembly and add patch-engine coverage for `create_ch_record` receipts.
**Deps**: `archive/tickets/SPEC03PATENG-006.md` (owns `submitPatchPlan` receipt assembly), `archive/tickets/SPEC14PAVOC-008.md` (review evidence that exposed the defect)

## Problem

`submitPatchPlan` successfully writes `create_ch_record` source files and the index sync sees the correct CH node, but the returned `PatchReceipt.new_nodes[]` reports `node_id: "undefined"` for CH creates. CH records use `change_id`, not `id`; receipt assembly currently reads the wrong property.

This is a traceability bug in the patch-engine receipt contract. Source writes are correct, but callers cannot trust `new_nodes[]` for created change-log records.

## Assumption Reassessment (2026-04-25)

1. Live receipt assembly in `tools/patch-engine/src/apply.ts` collects new nodes in `collectNewNodes()`. The `create_ch_record` branch reads `patch.payload.ch_record.id`, while the typed CH payload in `tools/patch-engine/src/envelope/schema.ts` is `ChangeLogEntry` with required `change_id`.
2. The commit/staging path already knows the correct identifier: `tools/patch-engine/src/commit/temp-file.ts` maps `create_ch_record` to `patch.payload.ch_record.change_id`.
3. Shared boundary under audit: `PatchReceipt.new_nodes[]` is produced by `tools/patch-engine` and consumed by `tools/world-mcp` callers through the `submit_patch_plan` delegation delivered by `archive/tickets/SPEC03PATENG-007.md`.
4. FOUNDATIONS alignment: the Change Control Policy depends on patch receipts as completion evidence for canon mutation. Receipt metadata must match the actual created CH record so approval and audit trails remain inspectable.
5. This is a separate bug exposed by `archive/tickets/SPEC14PAVOC-008.md`, not unfinished work inside that ticket. The reviewed patch wrote `worlds/animalia/_source/change-log/CH-0020.yaml` correctly; only the returned receipt's `new_nodes` entry was wrong.

## Architecture Check

1. Use the existing per-op identifier mapping pattern already present in `stagedRecordMetadata()` rather than adding a compatibility alias field to CH records.
2. No backwards-compatibility aliasing/shims introduced. CH records continue to use `change_id`; receipt assembly is corrected to read that canonical field.

## Verification Layers

1. CH create receipt contract -> patch-engine unit or integration test submits a plan containing `create_ch_record` and asserts `receipt.new_nodes` contains `{ node_id: "CH-....", node_type: "change_log_entry" }`.
2. Non-CH create receipt contract -> existing or updated test confirms `create_cf_record` still reports `cf_record.id`.
3. Cross-boundary exported type surface -> `tools/patch-engine` build proves `PatchReceipt` remains exported with unchanged shape.

## What to Change

### 1. Fix CH receipt ID extraction

In `tools/patch-engine/src/apply.ts`, update `collectNewNodes()` so the `create_ch_record` branch uses `patch.payload.ch_record.change_id`.

### 2. Add focused receipt coverage

Add or extend patch-engine coverage around the successful `submitPatchPlan` path so a plan containing `create_ch_record` asserts the returned `new_nodes[]` entry reports the CH `change_id`, not `"undefined"`.

## Files to Touch

- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/tests/**` (modify or add focused test coverage)

## Out of Scope

- Changing the `PatchReceipt` shape.
- Adding aliases such as `id` to CH records.
- Reworking world-mcp delegation; it should keep consuming the engine receipt type.
- Replaying or modifying the already-landed Animalia `CH-0020` content.

## Acceptance Criteria

### Tests That Must Pass

1. Focused patch-engine test for `create_ch_record` receipt returns `node_id: "CH-...."` in `new_nodes[]`.
2. Existing patch-engine successful-apply integration coverage still passes.
3. `cd tools/patch-engine && npm test` passes.

### Invariants

1. `ChangeLogEntry` identity remains `change_id`; no `id` alias is introduced.
2. `PatchReceipt.new_nodes[].node_id` matches the actual created source/index node for every create op.
3. Source-write behavior and post-apply index sync are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/**` — add or extend successful apply coverage for `create_ch_record` receipt metadata.

### Commands

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm test` — confirms the delegated `submit_patch_plan` consumer still accepts the unchanged receipt shape.
