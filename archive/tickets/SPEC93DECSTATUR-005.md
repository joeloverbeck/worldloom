# SPEC93DECSTATUR-005: world-mcp PG hashing → state_hash-only (drop plan_hash stamping & comparison)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` (`cli/compute-pg-hashes.ts`, `tools/verify-pg-state-hash.ts`, `tools/plan-story-state-maintenance.ts`, `server.ts`, `README.md`)
**Deps**: archive/tickets/SPEC93DECSTATUR-001.md

## Problem

With page plans gone, the `plan_hash` half of PG hashing is meaningless for new `PG`s. SPEC-93 §2.5 + §6 narrowed PG hashing to `state_hash`-only: `compute-pg-hashes` now stops stamping `plan_hash` from `--plan`; `verify-pg-state-hash` drops its `plan_hash` comparison output; and `plan_story_state_maintenance` — a third PG-authoring path that previously generated a maintenance page-plan body and stamped `plan_hash`/`prose_plan_path` — now emits a planless maintenance `PG`. The `state_hash` tamper check (the integrity-bearing hash) is retained unchanged.

## Assumption Reassessment (2026-05-28)

1. At intake, `tools/world-mcp/src/cli/compute-pg-hashes.ts` took `--plan` and stamped `plan_hash` into the PG payload before emitting both `plan_hash` and `state_hash`; `tools/verify-pg-state-hash.ts` emitted `recorded_plan_hash`/`computed_plan_hash`/`plan_hash_match`; `server.ts` carried a "SPEC-72 advisory" `plan_hash_match` comment; `plan-story-state-maintenance.ts` computed a maintenance page-plan body and stamped `plan_hash` + `prose_plan_path`. The landed implementation removes those owned surfaces.
2. SPEC-93 §2.5 (compute-pg-hashes state-only) + §6 world-mcp bullet (verify-pg-state-hash field drop; plan-story-state-maintenance planless) + §8 AC1 (maintenance tool produces a planless `PG`).
3. Cross-artifact boundary: `compute-pg-hashes` is the canonical PG-hash CLI mandated for PG-authoring skills (bootstrap/turn-cycle); `verify-pg-state-hash` is the MCP verification tool. The PG-hash output shape is the surface under audit; the schema relaxation (Deps 001) lets the maintenance PG omit plan fields.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the change preserves the `state_hash` tamper detection (the integrity-bearing hash) and drops only the advisory `plan_hash` — the integrity contract is strengthened-by-decoupling, not silently weakened, and is documented in `story-record-schemas.md` (SPEC93DECSTATUR-010).
5. (was template item 7 — removed output-field blast radius) Grep for `plan_hash_match` / `recorded_plan_hash` / `computed_plan_hash` consumers: the `verify-pg-state-hash` output schema, `server.ts` registration/comment, and any test asserting these fields; remove the fields and update consumers/tests.
6. Implementation found same-seam support/tests not listed in the draft: `tools/world-mcp/src/tools/maintenance-page-plan.ts` was only used by the maintenance page-plan path and was deleted; `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` also asserted the old `--plan` + `plan_hash` CLI shape and moved with the CLI contract.

## Architecture Check

1. Dropping plan_hash stamping/comparison while retaining `state_hash` cleanly separates the integrity-bearing hash (kept) from the advisory render-byte hash (removed) — matching SPEC-72's already-advisory posture, now fully retired.
2. No backwards-compatibility shim: the `--plan` stamping path, the `plan_hash_match` output fields, and the maintenance page-plan generation are removed outright.

## Verification Layers

1. `compute-pg-hashes` emits `state_hash` only -> CLI dry-run / unit test (no `plan_hash` in output; no `--plan` stamping).
2. `verify-pg-state-hash` reports only `state_hash` -> codebase grep-proof + test (`plan_hash_match`/`recorded_plan_hash`/`computed_plan_hash` absent).
3. Maintenance PG is planless -> schema validation (the maintenance `PG` validates against the relaxed `story-page.schema.json`; no `plan_hash`/`prose_plan_path` stamped).
4. `state_hash` tamper detection retained -> FOUNDATIONS alignment check (Rule 6) + unit test (hand-edited PG state field → mismatch).

## Landed Changes

### 1. compute-pg-hashes → state-only

`tools/world-mcp/src/cli/compute-pg-hashes.ts` no longer accepts `--plan`, computes no `plan_hash`, stamps nothing into `PG.plan`, and emits only `state_hash`.

### 2. verify-pg-state-hash → drop plan_hash comparison

`tools/world-mcp/src/tools/verify-pg-state-hash.ts` no longer reads `pages-prose-plans/` or returns `recorded_plan_hash`, `computed_plan_hash`, or `plan_hash_match`. `server.ts` now describes the tool as `state_hash`-only.

### 3. plan-story-state-maintenance → planless

`tools/world-mcp/src/tools/plan-story-state-maintenance.ts` emits a planless maintenance `PG` with no `plan`, no `prose_plan_path`, and no `maintenance_page_plan` response. The now-unused `maintenance-page-plan.ts` helper was deleted.

### 4. README

`tools/world-mcp/README.md` describes PG hashing and maintenance planning as `state_hash`-only / planless.

## Files to Touch

- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify)
- `tools/world-mcp/src/tools/verify-pg-state-hash.ts` (modify)
- `tools/world-mcp/src/tools/plan-story-state-maintenance.ts` (modify)
- `tools/world-mcp/src/tools/maintenance-page-plan.ts` (delete)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify)
- `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` (modify)
- `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts` (modify)
- `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` (modify)

## Out of Scope

- The `page_plan_drafts` argument removal (archive/tickets/SPEC93DECSTATUR-004.md) — also touches `server.ts` but at the patch-plan tool surface, not the hashing surface.
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

1. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` and `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` — assert `state_hash`-only CLI output and planless PG input support.
2. `tools/world-mcp/tests/tools/verify-pg-state-hash.test.ts` — asserts legacy and planless PGs verify by `state_hash`, and the tamper-FAIL case is retained.
3. `tools/world-mcp/tests/tools/plan-story-state-maintenance.test.ts` — asserts the maintenance PG and response are planless.

### Commands

1. `(cd tools/world-mcp && npm run build && npm test)`
2. Full bootstrap/turn-cycle hashing flow exercised end-to-end in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Landed changes:

1. `compute-pg-hashes` is now a `--pg`-only CLI that emits only `{ "state_hash": ... }`; the old `--plan` byte-hash path, PG `plan_hash` stamping, and `plan_hash` output are gone.
2. `verify_pg_state_hash` now recomputes and reports only `state_hash` fields plus provenance; it no longer reads `pages-prose-plans/` or reports advisory plan-hash comparisons.
3. `plan_story_state_maintenance` now emits a planless maintenance `PG` and no maintenance page-plan payload; the old maintenance page-plan renderer was deleted.
4. The registered tool description, package README, and same-package tests were updated to the state-only / planless contract.

Deviations from plan:

- Added `tools/world-mcp/src/tools/maintenance-page-plan.ts` deletion and `tools/world-mcp/tests/integration/yaml-vs-json-parity.test.ts` to the landed file set because they were same-seam support/proof surfaces for the retired `--plan` and maintenance page-plan behavior.
- The broader SPEC-93 removal of remaining legacy `prose_plan_path` fixtures/read-path references is not claimed here; those are legacy fixtures, scene-plan placeholders, or sibling-ticket surfaces.

## Verification Result

1. Pre-edit baseline: `cd tools/world-mcp && npm run build` — PASS.
2. Pre-edit baseline: `cd tools/world-mcp && npm test` — PASS (`508` tests passed).
3. Post-edit: `cd tools/world-mcp && npm run build` — PASS.
4. Post-edit focused proof: `cd tools/world-mcp && node --test dist/tests/cli/compute-pg-hashes.test.js dist/tests/integration/yaml-vs-json-parity.test.js dist/tests/tools/verify-pg-state-hash.test.js dist/tests/tools/plan-story-state-maintenance.test.js` — PASS (`17` tests passed).
5. Post-edit broad proof: `cd tools/world-mcp && npm test` — PASS (`506` tests passed).
6. Stale output-field sweep over `tools/world-mcp/src`, `tools/world-mcp/tests`, and `tools/world-mcp/README.md` found no `recorded_plan_hash`, `computed_plan_hash`, `plan_hash_match`, `renderMaintenancePagePlan`, `maintenance-page-plan`, or `compute-pg-hashes --plan` current-contract hits. Remaining `prose_plan_path` / `pages-prose-plans` hits are legacy fixtures, scene-plan placeholders, or non-owned sibling surfaces.
