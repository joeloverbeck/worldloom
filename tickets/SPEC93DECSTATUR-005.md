# SPEC93DECSTATUR-005: world-mcp PG hashing → state_hash-only (drop plan_hash stamping & comparison)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`cli/compute-pg-hashes.ts`, `tools/verify-pg-state-hash.ts`, `tools/plan-story-state-maintenance.ts`, `server.ts`, `README.md`)
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

With page plans gone, the `plan_hash` half of PG hashing is meaningless for new `PG`s. SPEC-93 §2.5 + §6 narrow PG hashing to `state_hash`-only: `compute-pg-hashes` stops stamping `plan_hash` from `--plan`; `verify-pg-state-hash` drops its `plan_hash` comparison output; and `plan_story_state_maintenance` — a third PG-authoring path that currently generates a maintenance page-plan body and stamps `plan_hash`/`prose_plan_path` — emits a planless maintenance `PG`. The `state_hash` tamper check (the integrity-bearing hash) is retained unchanged.

## Assumption Reassessment (2026-05-28)

1. `tools/world-mcp/src/cli/compute-pg-hashes.ts` takes `--plan` and stamps `plan_hash` into the PG payload before emitting both `plan_hash` and `state_hash`; `tools/verify-pg-state-hash.ts` emits `recorded_plan_hash`/`computed_plan_hash`/`plan_hash_match`; `server.ts` carries a "SPEC-72 advisory" `plan_hash_match` comment; `plan-story-state-maintenance.ts:556,573,575` computes a maintenance page-plan body and stamps `plan_hash` + `prose_plan_path` — all confirmed during SPEC-93 reassessment (this session, Improvements M3/M4).
2. SPEC-93 §2.5 (compute-pg-hashes state-only) + §6 world-mcp bullet (verify-pg-state-hash field drop; plan-story-state-maintenance planless) + §8 AC1 (maintenance tool produces a planless `PG`).
3. Cross-artifact boundary: `compute-pg-hashes` is the canonical PG-hash CLI mandated for PG-authoring skills (bootstrap/turn-cycle); `verify-pg-state-hash` is the MCP verification tool. The PG-hash output shape is the surface under audit; the schema relaxation (Deps 001) lets the maintenance PG omit plan fields.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the change preserves the `state_hash` tamper detection (the integrity-bearing hash) and drops only the advisory `plan_hash` — the integrity contract is strengthened-by-decoupling, not silently weakened, and is documented in `story-record-schemas.md` (SPEC93DECSTATUR-010).
5. (was template item 7 — removed output-field blast radius) Grep for `plan_hash_match` / `recorded_plan_hash` / `computed_plan_hash` consumers: the `verify-pg-state-hash` output schema, `server.ts` registration/comment, and any test asserting these fields; remove the fields and update consumers/tests.

## Architecture Check

1. Dropping plan_hash stamping/comparison while retaining `state_hash` cleanly separates the integrity-bearing hash (kept) from the advisory render-byte hash (removed) — matching SPEC-72's already-advisory posture, now fully retired.
2. No backwards-compatibility shim: the `--plan` stamping path, the `plan_hash_match` output fields, and the maintenance page-plan generation are removed outright.

## Verification Layers

1. `compute-pg-hashes` emits `state_hash` only -> CLI dry-run / unit test (no `plan_hash` in output; no `--plan` stamping).
2. `verify-pg-state-hash` reports only `state_hash` -> codebase grep-proof + test (`plan_hash_match`/`recorded_plan_hash`/`computed_plan_hash` absent).
3. Maintenance PG is planless -> schema validation (the maintenance `PG` validates against the relaxed `story-page.schema.json`; no `plan_hash`/`prose_plan_path` stamped).
4. `state_hash` tamper detection retained -> FOUNDATIONS alignment check (Rule 6) + unit test (hand-edited PG state field → mismatch).

## What to Change

### 1. compute-pg-hashes → state-only

In `tools/world-mcp/src/cli/compute-pg-hashes.ts`: remove the `--plan` flag handling, the `plan_hash` computation/stamping into the PG payload, and the `plan_hash` output field; emit `state_hash` only.

### 2. verify-pg-state-hash → drop plan_hash comparison

In `tools/world-mcp/src/tools/verify-pg-state-hash.ts`: remove `recorded_plan_hash`, `computed_plan_hash`, `plan_hash_match` from the output interface and the disk-plan read that computes them. In `server.ts`: remove the `plan_hash_match` "SPEC-72 advisory" comment and any output-schema reference.

### 3. plan-story-state-maintenance → planless

In `tools/world-mcp/src/tools/plan-story-state-maintenance.ts`: stop generating the maintenance page-plan body; remove the `plan_hash` and `prose_plan_path` stamping (lines ~556/573/575); emit a planless maintenance `PG`.

### 4. README

Update `tools/world-mcp/README.md` to describe PG hashing as `state_hash`-only.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify)
- `tools/world-mcp/src/tools/verify-pg-state-hash.ts` (modify)
- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/README.md` (modify)

## Out of Scope

- The `page_plan_drafts` argument removal (SPEC93DECSTATUR-004) — also touches `server.ts` but at the patch-plan tool surface, not the hashing surface.
- The PG schema relaxation itself (archive/tickets/SPEC93DECSTATUR-001.md).
- The `state_hash` / `state_hash_parent` chain semantics (retained unchanged).

## Acceptance Criteria

### Tests That Must Pass

1. `compute-pg-hashes` emits `state_hash` only (no `plan_hash`, no `--plan` stamping).
2. `verify-pg-state-hash` output contains no `plan_hash_match`/`recorded_plan_hash`/`computed_plan_hash`; `state_hash` mismatch on a hand-edited PG still FAILs.
3. `(cd tools/world-mcp && npm run build && npm test)` green.

### Invariants

1. The `state_hash` tamper check is byte-identical to pre-spec behavior; only `plan_hash` stamping/comparison is removed.
2. `plan_story_state_maintenance` emits a `PG` that validates against the relaxed schema with no plan fields.

## Test Plan

### New/Modified Tests

1. world-mcp `compute-pg-hashes` / `verify-pg-state-hash` suites — assert `state_hash`-only output; retain the `state_hash` tamper-FAIL case.
2. `plan-story-state-maintenance` suite — assert planless maintenance `PG`.

### Commands

1. `(cd tools/world-mcp && npm run build && npm test)`
2. Full bootstrap/turn-cycle hashing flow exercised end-to-end in SPEC93DECSTATUR-013.
