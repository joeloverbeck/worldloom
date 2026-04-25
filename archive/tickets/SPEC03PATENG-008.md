# SPEC03PATENG-008: Per-op unit tests (fixture-based before/after snapshots)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/patch-engine/tests/ops/` suite with one test file per op (14 ops total) plus an approval-verification test file, a commit-order test file, and the narrow production fix those tests expose in `autoAddTouchedByCfOps`.
**Deps**: archive/tickets/SPEC03PATENG-006.md

## Problem

SPEC-03 §Verification line 278 (post-reassessment): "**Unit**: each op tested against fixture files (before/after snapshots)." This ticket lands the per-op unit-test suite: for each of the 14 ops (7 create, 4 update/append, 3 hybrid-file), a test file verifies the op transforms temp-root fixture state into the expected staged output. Additionally this ticket lands tests for the approval-token verifier (ticket 005's output) and the commit-order/auto-add logic (ticket 006's `reorderPatches` + `autoAddTouchedByCfOps`) — these modules are pure enough to test in isolation without the full apply orchestration.

## Assumption Reassessment (2026-04-25)

1. Node.js built-in test runner (`node --test`) is already the package-local command surface in `tools/patch-engine/package.json`: `npm run test` builds with `tsc -p tsconfig.json` and then runs `node --test dist/tests/**/*.test.js`. This ticket follows that surface; no new test framework dependency.
2. The live package already has all 14 op modules under `tools/patch-engine/src/ops/`, plus `src/approval/verify-token.ts` and `src/commit/order.ts`. This ticket is now a fixture/unit proof landing, not an op implementation ticket.
3. Shared boundary: tests import op stage functions directly from `src/ops/*`, `verifyApprovalToken` from `src/approval/verify-token.ts`, and `reorderPatches` / `autoAddTouchedByCfOps` from `src/commit/order.ts`. They do not route through `submitPatchPlan`; ticket 009 owns the composed apply path.
4. Fixture layout is corrected to the live `OpContext`: tests use a temp repo root containing `worlds/<slug>/...`, seed minimal `_source` YAML, and seed an in-memory SQLite DB with the exact `nodes`, `edges`, and `approval_tokens_consumed` columns the staged ops query. No checked-in fixture directory is required for the pure unit seam.
5. Schema posture: tests instantiate the seven record interfaces exported by `@worldloom/world-index/public/types` with realistic minimal values and compare parsed staged YAML. They do not verify SPEC-04 `record_schema_compliance`; SPEC-04 owns validator completeness.
6. Adjacent contradiction corrected: the drafted `tests/compile-time/append-only-rejection.ts.ignore` proof is invalid because `tsc --noEmit tests/compile-time/append-only-rejection.ts.ignore` fails on unsupported extension before checking the `PatchOperation` union. The truthful shape is `tests/compile-time/append-only-rejection.ts` excluded from normal `tsconfig.json`, plus `tsconfig.compile-reject.json` and `npm run test:compile-reject` expecting that compile to fail on retired op names.
7. Required consequence fallout: at intake, `tools/patch-engine/src/commit/order.ts` checked `edges.from_node_id` / `to_node_id`, but the live world-index schema uses `source_node_id` / `target_node_id` (`tools/world-index/src/schema/migrations/001_initial.sql`). The auto-add test for "existing patched_by edge means no duplicate op" exposed that bug, so the narrow column-name fix was owned by this ticket.

## Architecture Check

1. One test file per op mirrors the one-file-per-op source layout (tickets 002/003/004). Tests and sources parallel 1:1, which makes navigation obvious (`src/ops/create-cf-record.ts` ↔ `tests/ops/create-cf-record.test.ts`).
2. Temp-root before/after assertions (rather than programmatic assertions on every YAML field) produce readable diffs when tests fail — the tester sees "expected this YAML/text, got that YAML/text" rather than only "expected field X to equal Y." Human-readable failure output matters for a codebase where YAML shape is load-bearing.
3. Compile-time append-only rejection via a dedicated excluded `.ts` probe is the only way to verify the closed-union invariant from a package command. Runtime-only envelope validation would leave the TypeScript union gate untested.
4. Test scenarios cover the main success paths and the fail-closed error surfaces owned by the current op layer (hash drift, attestation missing, path traversal, file-already-exists, malformed extension/history payloads, and target-class mismatches). SPEC-04 schema-compliance validation remains outside this ticket.
5. No backwards-compatibility aliasing/shims introduced. Tests do not import retired op names; they exist only in the compile-time rejection probe file.

## Verification Layers

1. Each create op produces a YAML file whose parsed content equals the `*_record` payload -> fixture before/after snapshot test (one per create op, 7 total).
2. `update_record_field` rejects structural mutations on accepted CFs without `retcon_attestation` -> unit test with error-code assertion.
3. `update_record_field` succeeds with valid retcon attestation on structural fields -> unit test with staged temp YAML comparison.
4. `append_extension` on CF records is rejected (wrong target class) -> unit test with error-code assertion.
5. `append_touched_by_cf` idempotence on duplicate CF-ID -> unit test (submit twice; second call is noop).
6. Hybrid-file ops reject path traversal -> unit test with error-code assertion.
7. Approval verifier rejects: expired, tampered, replayed, hash-mismatch, malformed tokens -> 5 unit tests with distinct error codes.
8. `reorderPatches` produces canonical Tier 1 → Tier 2 → Tier 3 sequence regardless of input order -> unit test with permuted inputs.
9. `autoAddTouchedByCfOps` injects the correct op when `append_extension` targets a SEC with a new originating CF and skips injection when the live `patched_by` edge already exists -> unit test with patch-list assertions.
10. **Compile-time append-only rejection** — attempting to instantiate `{op: 'replace_cf_record', ...}` fails TypeScript compilation -> `tsc -p tsconfig.compile-reject.json` test returns non-zero exit and `npm run test:compile-reject` inverts that failure to success.

## What to Change

### 1. Create `tools/patch-engine/tests/ops/create-{cf,ch,inv,m,oq,ent,sec}-record.test.ts` (7 files)

Each create-op test uses `tests/harness.ts` to create a temp repo root, construct a realistic record, call the corresponding `stageCreate*Record` function directly, and compare the staged temp-file YAML against the expected parsed record. Negative-path checks cover overwrite, allocation, invalid-id, or target-world errors where those are the live op-owned failure surfaces.

### 2. Create `tools/patch-engine/tests/ops/update-record-field.test.ts`

Scenarios:
- `notes` append without attestation → success.
- `statement` set without attestation → error `retcon_attestation_required`.
- `distribution.why_not_universal` set with valid attestation → success with before/after snapshot.
- Content-hash drift → error `record_hash_drift`.
- Field-path invalid → error `field_path_invalid`.

### 3. Create `tools/patch-engine/tests/ops/append-extension.test.ts`

Scenarios: append to SEC → success; append to CF → error `op_target_class_mismatch`; malformed extension → error `invalid_extension_payload`.

### 4. Create `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts`

Scenarios: first append → success; duplicate append → noop; target non-SEC → error.

### 5. Create `tools/patch-engine/tests/ops/append-modification-history-entry.test.ts`

Scenarios: append to CF → success; append to INV → error `op_target_class_mismatch`; malformed entry (bad `change_id`) → error `invalid_modification_history_entry`.

### 6. Create `tools/patch-engine/tests/ops/append-{adjudication,character,diegetic-artifact}-record.test.ts` (3 files)

Scenarios per op: valid path under expected sub-directory → success with frontmatter+body text assertion; path traversal → error; file already exists → error. Frontmatter schema validation is not present in the current hybrid-file op layer and remains outside this unit-test ticket.

### 7. Create `tools/patch-engine/tests/approval/verify-token.test.ts`

5 verdict codes + 1 success case per SPEC-03 §Verification bullet 6 (approval token). Fixture HMAC secret; tokens synthesized per test.

### 8. Create `tools/patch-engine/tests/commit/order.test.ts`

Scenarios:
- Input order `[Tier3, Tier1, Tier2, Tier1]` → output order `[Tier1, Tier1, Tier2, Tier3]`.
- Multiple ops per tier preserve relative order within tier.
- `autoAddTouchedByCfOps`: `append_extension` on SEC with new `originating_cf` → output includes injected `append_touched_by_cf`; existing `patched_by` edge → no injection.

### 9. Create `tools/patch-engine/tests/compile-time/append-only-rejection.ts`

```typescript
import type { PatchOperation } from "../../src/envelope/schema";
// These must all fail TypeScript compilation — closed-union append-only gate.
const bad1: PatchOperation = {op: "replace_cf_record", target_record_id: "CF-0001", payload: {} as any};
const bad2: PatchOperation = {op: "delete_cf_record", target_record_id: "CF-0001", payload: {} as any};
const bad3: PatchOperation = {op: "insert_before_node", target_record_id: "CF-0001", payload: {} as any};
```

Also add `tools/patch-engine/tsconfig.compile-reject.json` and a `test:compile-reject` script to `tools/patch-engine/package.json`: `"test:compile-reject": "! tsc -p tsconfig.compile-reject.json"` (exits 0 when tsc fails for the intended retired-op assignments, exits 1 when tsc succeeds unexpectedly). Exclude `tests/compile-time/**/*` from normal `tsconfig.json` so the negative compile probe does not break the ordinary build.

### 10. Create `tools/patch-engine/tests/harness.ts`

Utility exports: temp-world setup, in-memory DB schema/seed helpers, record factories, YAML parsing/assertion helpers, and approval-token synthesis. The harness owns temp-dir creation (via `fs.mkdtempSync`) and cleanup (via `t.after(() => fs.rmSync(...))`).

### 11. Fix auto-add edge-column query

Update `tools/patch-engine/src/commit/order.ts` so `hasTouchedByCf` queries the live `edges.source_node_id` / `target_node_id` columns used by `world-index`.

### 12. No checked-in fixture tree

Minimal fixture state is generated in temp roots by `tests/harness.ts`. This keeps each test isolated, avoids stale checked-in snapshots, and still verifies before/after content by comparing the staged temp-file YAML/text against expected parsed records.

### 13. Closeout documentation

Update this ticket with the final verification results and the deviations from the initial fixture-tree / `.ts.ignore` draft.

## Files to Touch

- `tools/patch-engine/tests/ops/create-cf-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-ch-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-inv-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-m-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-oq-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-ent-record.test.ts` (new)
- `tools/patch-engine/tests/ops/create-sec-record.test.ts` (new)
- `tools/patch-engine/tests/ops/update-record-field.test.ts` (new)
- `tools/patch-engine/tests/ops/append-extension.test.ts` (new)
- `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts` (new)
- `tools/patch-engine/tests/ops/append-modification-history-entry.test.ts` (new)
- `tools/patch-engine/tests/ops/append-adjudication-record.test.ts` (new)
- `tools/patch-engine/tests/ops/append-character-record.test.ts` (new)
- `tools/patch-engine/tests/ops/append-diegetic-artifact-record.test.ts` (new)
- `tools/patch-engine/tests/approval/verify-token.test.ts` (new)
- `tools/patch-engine/tests/commit/order.test.ts` (new)
- `tools/patch-engine/tests/compile-time/append-only-rejection.ts` (new)
- `tools/patch-engine/tests/harness.ts` (new)
- `tools/patch-engine/tsconfig.compile-reject.json` (new)
- `tools/patch-engine/tsconfig.json` (modify — exclude compile-time negative probe from normal build)
- `tools/patch-engine/package.json` (modify — add `test:compile-reject` script)
- `tools/patch-engine/src/commit/order.ts` (modify — use live world-index edge column names)

## Out of Scope

- Integration / end-to-end / acceptance tests — ticket 009.
- Historical canon-addition replay against animalia — ticket 009.
- Atomicity fault-injection tests (Phase A failure, Phase B temp-write failure, Phase B rename failure) — ticket 009, since they require the full `submitPatchPlan` path.
- Concurrency tests (per-world lock under contention) — ticket 009.
- Performance gate — ticket 009.
- SPEC-04 validator integration tests — SPEC-04's own suite.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm run test` exits 0 — all 14 op-test files + approval test + commit-order test pass.
2. `cd tools/patch-engine && npm run test:compile-reject` exits 0 — confirms `tsc -p tsconfig.compile-reject.json` on the append-only-rejection probe fails as expected.
3. `find tools/patch-engine/tests/ops -name "*.test.ts" | wc -l` returns 14 (7 create + 4 update/append + 3 hybrid-file).
4. Test runtime under 10s total on a typical developer machine — fixture-based tests are lightweight (no real SQLite for most ops; temp-dir YAML only).

### Invariants

1. Every op module in `src/ops/` has a corresponding `tests/ops/*.test.ts` file (1:1 mapping).
2. Representative fail-closed error paths for each op family are exercised by negative-path tests; exhaustive SPEC-04 schema validation remains outside this package-local unit seam.
3. No test mutates source or fixture directories on disk — all mutations target `fs.mkdtempSync`-created temp roots.
4. The compile-time append-only rejection probe includes at least one example per retired-op category (pre-SPEC-13 anchor-based, pre-SPEC-13 yaml-field, hypothetical delete/replace).

## Test Plan

### New/Modified Tests

1. All 14 op-test files + approval + commit-order are new (enumerated in Files to Touch).
2. `tools/patch-engine/tests/harness.ts` — new test-utility module; rationale: shared fixture-loading + synthetic-context + YAML-compare utilities so individual test files stay focused on scenarios, not boilerplate.
3. `tools/patch-engine/tests/compile-time/append-only-rejection.ts` + `tools/patch-engine/tsconfig.compile-reject.json` + the `test:compile-reject` script — this IS the test for the compile-time append-only rejection invariant.

### Commands

1. `cd tools/patch-engine && npm run test` (full unit suite).
2. `cd tools/patch-engine && npm run test:compile-reject` (compile-time rejection probe).
3. `find tools/patch-engine/tests/ops -name "*.test.ts" | wc -l` should return `14` (one unit-test file per op).

## Outcome

Completed. The patch-engine package now has:

1. Fourteen op-unit test files under `tools/patch-engine/tests/ops/`, one per live `src/ops/*.ts` module.
2. Shared `tests/harness.ts` temp-world, in-memory DB, YAML assertion, record factory, and approval-token helpers.
3. Approval-token verifier tests covering success plus expired, tampered-HMAC, replayed, hash-mismatch, and malformed-token failures.
4. Commit-order tests for tier ordering and `append_extension` auto-added `append_touched_by_cf` behavior.
5. A corrected `autoAddTouchedByCfOps` edge lookup using the live `edges.source_node_id` / `target_node_id` schema.
6. A real compile-reject proof using `tests/compile-time/append-only-rejection.ts`, `tsconfig.compile-reject.json`, and `npm run test:compile-reject`.

## Verification Result

Passed on 2026-04-25:

1. `cd tools/patch-engine && npm run test` — passed; build succeeded and `node --test dist/tests/**/*.test.js` reported 32/32 passing subtests.
2. `cd tools/patch-engine && npm run test:compile-reject` — passed by inverting the intended TypeScript failures for retired op names (`replace_cf_record`, `delete_cf_record`, `insert_before_node`).
3. `find tools/patch-engine/tests/ops -name "*.test.ts" | wc -l` — returned `14`.

## Deviations

1. The drafted `.ts.ignore` compile-reject proof was replaced because `tsc` rejects that extension before checking the `PatchOperation` union, which would be a false positive.
2. The drafted checked-in fixture tree was replaced with temp-root fixture generation in `tests/harness.ts`, matching the live `OpContext` and avoiding persistent fixture drift.
3. Hybrid-file malformed-frontmatter tests were not added because the current hybrid op layer has no frontmatter schema-validator error code; this ticket keeps that outside the unit-test seam.
4. The ticket absorbed a narrow production fix in `tools/patch-engine/src/commit/order.ts` after the auto-add test exposed stale edge column names.
