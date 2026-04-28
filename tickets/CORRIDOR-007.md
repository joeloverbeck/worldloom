# CORRIDOR-007: Patch receipt — add `validators_run` field for success-path validator visibility

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/` (extend `PatchReceipt` schema); `tools/validators/` (expose validator-run telemetry); `tools/world-mcp/` (pass-through receipt)
**Deps**: None — additive schema field

## Problem

The current `PatchReceipt` schema (`tools/patch-engine/src/envelope/schema.ts:84-91`) returned by `mcp__worldloom__submit_patch_plan` reports:

```typescript
interface PatchReceipt {
  plan_id: string;
  applied_at: string;
  files_written: FileWriteReceipt[];
  new_nodes: NewNodeReceipt[];
  id_allocations_consumed: IdAllocations;
  index_sync_duration_ms: number;
}
```

On the success path, the receipt does NOT report which validators ran or what they checked. Pre-apply validators (Rule 1-7 + structural validators per FOUNDATIONS §Machine-Facing Layer §Validator Framework) executed silently against the plan and passed — but the operator has no telemetry confirming this. For trust-building, debugging, and audit-trail completeness, the receipt should expose `validators_run` listing each validator name + pass/fail status, even when all pass.

Session evidence from DA-0003 generation: the receipt returned `index_sync_duration_ms: 1370` and the file-write info, confirming the engine wrote the file atomically. The operator had to take on faith that `record_schema_compliance` and Rule 1-7 validators ran successfully — there was no telemetry distinguishing "all validators ran and passed" from "no validators ran."

This is LOW priority because the success-path silence is benign (the mutation succeeded, validators are gating the success path) — but it's an observability gap that prevents future debugging if a validator silently no-ops or is skipped due to a wiring bug.

## Assumption Reassessment (2026-04-27)

1. `tools/patch-engine/src/envelope/schema.ts:84-91` defines `PatchReceipt`. `tools/patch-engine/src/apply.js` constructs the receipt at successful commit. The receipt construction code is the addition site.
2. `tools/validators/dist/src/public/index.js:7` exposes `validatePatchPlan(envelope)` returning `{verdicts: VerdictRow[]}`. The verdicts already track each validator's name and severity (`fail`/`pass`/etc.); this ticket pipes the verdict list into the receipt's new field.
3. Cross-artifact boundary: the receipt schema is consumed by every caller of `submit_patch_plan` (MCP tool handler + future CLI per CORRIDOR-006). Adding an optional `validators_run` field is additive; consumers that don't read it are unaffected.
6. Schema extension: `validators_run` is an additive optional field. Pre-CORRIDOR-007 receipts won't have it; consumers MUST tolerate its absence (additive-with-default-`undefined` semantics).

## Architecture Check

1. Embedding validator telemetry in the receipt is cleaner than emitting it separately (e.g., as a side-channel log) because the receipt is the single artifact a caller examines for write-success confirmation. Splitting validator telemetry into a separate channel would require callers to correlate two artifacts to know whether their write was checked.
2. No backwards-compatibility aliasing/shims introduced. `validators_run` is additive; pre-existing receipt-consumers continue to work.

## Verification Layers

1. `validators_run` is populated on every successful submission → schema validation: integration test asserts `receipt.validators_run.length > 0` for a non-trivial plan that triggers ≥1 validator.
2. `validators_run` content reflects actual validator execution → integration test: inject a validator that always passes; confirm it appears in `validators_run` with `status: 'pass'`.
3. Failed submissions still expose `validators_run` (as part of the error response, not the receipt) → schema validation: a Rule 7 firewall failure returns an error with `validators_run` listing every validator and the failing one's status.

## What to Change

### 1. Extend `PatchReceipt` schema

```typescript
interface PatchReceipt {
  plan_id: string;
  applied_at: string;
  files_written: FileWriteReceipt[];
  new_nodes: NewNodeReceipt[];
  id_allocations_consumed: IdAllocations;
  index_sync_duration_ms: number;
  validators_run?: ValidatorRunReceipt[];  // additive, optional
}

interface ValidatorRunReceipt {
  validator_name: string;       // e.g., 'rule7_mystery_reserve_preservation', 'record_schema_compliance'
  status: 'pass' | 'fail' | 'skipped';
  duration_ms: number;
  detail?: string;              // populated when status !== 'pass' to name what failed
}
```

### 2. Wire validator-run telemetry into receipt construction

In `tools/patch-engine/src/apply.js` (or wherever `submitPatchPlan` constructs the receipt), capture the validator verdicts (already returned by `validatePatchPlan` per `tools/validators/dist/src/public/index.js:7`) and project them into `validators_run` entries. The mapping is direct: each verdict's `validator_name` + `severity → status` + measured `duration_ms`.

### 3. Update error-path telemetry

When pre-apply validation fails, the engine returns an error to the caller. Augment the error to include `validators_run` (same shape) so the caller can see WHICH validator failed and which ran-and-passed before the failure.

### 4. Update `tools/world-mcp/src/tools/submit-patch-plan.ts`

Pass the new field through unchanged — the MCP wrapper already returns the receipt as-is; no logic change beyond the type.

### 5. Documentation

Update `docs/MACHINE-FACING-LAYER.md` (referenced by FOUNDATIONS line 504) §Validator Framework to mention the `validators_run` receipt field as the success-path telemetry surface.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify — extend PatchReceipt; add ValidatorRunReceipt)
- `tools/patch-engine/src/apply.ts` (modify — wire validator verdicts into receipt construction)
- `tools/validators/src/public/index.ts` (verify — confirm verdict shape includes the metadata `validators_run` needs; if not, extend)
- `docs/MACHINE-FACING-LAYER.md` (modify — §Validator Framework receipt-telemetry note)
- `tools/patch-engine/tests/` (new tests)

## Out of Scope

- Real-time validator-execution streaming (e.g., progress callbacks during long validation runs) — receipt-level reporting only.
- Validator-output diffing across plans (e.g., "plan B added 1 validator vs plan A") — analytics is out of scope.
- New validators — this ticket exposes existing validator execution; new validators are separate tickets.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test -- --grep "receipt-validators-run"` — successful submission's receipt contains `validators_run` with one entry per validator that ran, each entry with `status: 'pass'`.
2. `cd tools/patch-engine && npm test -- --grep "receipt-validators-run-failure"` — failing submission's error includes `validators_run` listing all validators that ran and the failing one's `status: 'fail'` + `detail` field.
3. `cd tools/patch-engine && npm test -- --grep "receipt-backward-compat"` — pre-CORRIDOR-007-style receipt-consumers (that don't read `validators_run`) continue to work against the new receipts.

### Invariants

1. `validators_run` is populated on every receipt where validators ran (success or fail).
2. Each `ValidatorRunReceipt.duration_ms` is non-negative.
3. The sum of `validators_run[*].duration_ms` is ≤ `index_sync_duration_ms + (other engine-phase durations)` (sanity bound).
4. Existing receipt fields are unchanged in shape and semantics.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/receipt-validators-run.test.ts` — success-path validator-run telemetry.
2. `tools/patch-engine/tests/receipt-validators-run-failure.test.ts` — failure-path validator-run telemetry.
3. `tools/patch-engine/tests/receipt-backward-compat.test.ts` — receipt-consumers ignoring `validators_run` continue to work.

### Commands

1. `cd tools/patch-engine && npm test -- --grep "receipt-validators-run"` — targeted test suite.
2. `cd tools/patch-engine && npm test` — full patch-engine suite.
3. `cd tools/world-mcp && npm test` — confirm MCP wrapper passes the new field through unchanged.
