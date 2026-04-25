# SPEC03PATENG-008: Per-op unit tests (fixture-based before/after snapshots)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/patch-engine/tests/ops/` suite with one test file per op (14 ops total) plus an approval-verification test file and a commit-order test file. No production code changes.
**Deps**: archive/tickets/SPEC03PATENG-006.md

## Problem

SPEC-03 §Verification line 278 (post-reassessment): "**Unit**: each op tested against fixture files (before/after snapshots)." This ticket lands the per-op unit-test suite: for each of the 14 ops (7 create, 4 update/append, 3 hybrid-file), a test file verifies the op transforms a known input fixture into a known output fixture. Additionally this ticket lands tests for the approval-token verifier (ticket 005's output) and the commit-order/auto-add logic (ticket 006's `reorderPatches` + `autoAddTouchedByCfOps`) — these modules are pure enough to test in isolation without the full apply orchestration.

## Assumption Reassessment (2026-04-24)

1. Node.js built-in test runner (`node --test`) is the existing convention across `tools/world-index` and `tools/world-mcp` (confirmed via `grep "node --test" tools/world-index/package.json tools/world-mcp/package.json`). This ticket follows the same convention; no new test framework dep.
2. Fixture layout: `tools/patch-engine/tests/fixtures/<scenario>/before/_source/` and `after/_source/` — each scenario is a minimal world tree. Approach: use `fs.cpSync(before, tmp)` at test setup so tests mutate a temp copy, not the fixture itself. This mirrors the scaffolding pattern SPEC-03 §Spec-Integration Ticket Shape prescribes and keeps fixtures reusable.
3. Shared boundary: tests import ops directly (`import { stageCreateCfRecord } from "../../src/ops/create-cf-record"`) — they do not route through `submitPatchPlan` (that's ticket 009's integration capstone). Each op is exercised in isolation with a synthetic `OpContext` (temp DB + temp world root).
4. Schema posture: tests verify additive extension — the 7 new record interfaces from ticket 001 are instantiated with realistic values. Tests DO NOT verify SPEC-04 `record_schema_compliance` (that's SPEC-04's test suite); they verify that ops produce YAML matching the TypeScript interface shape.
5. Adjacent contradictions: `@ts-expect-error` usage for the compile-time append-only rejection check (SPEC-03 §Verification bullet 8) is non-trivial — the Node test runner doesn't catch TypeScript errors, only runtime ones. Approach: a dedicated compile-only test file `tests/compile-time/append-only-rejection.ts.ignore` whose contents deliberately instantiate retired ops (e.g., `const bad: PatchOperation = {op: 'replace_cf_record', ...}`), plus a `tsc --noEmit` invocation in the test script that expects a non-zero exit. Classification: **required consequence of this ticket** — the compile-time rejection IS the invariant; without this shape, the invariant is untested.

## Architecture Check

1. One test file per op mirrors the one-file-per-op source layout (tickets 002/003/004). Tests and sources parallel 1:1, which makes navigation obvious (`src/ops/create-cf-record.ts` ↔ `tests/ops/create-cf-record.test.ts`).
2. Fixture-based before/after snapshots (rather than programmatic assertions on every YAML field) produce readable diffs when tests fail — the tester sees "expected this YAML, got that YAML" rather than "expected field X to equal Y." Human-readable failure output matters for a codebase where YAML shape is load-bearing.
3. Compile-time append-only rejection via `tsc --noEmit` on a deliberately-failing `.ts.ignore` file is the only way to verify the closed-union invariant at runtime test time. Alternative approaches (runtime-only rejection via schema validator) would leave the compile-time gate untested.
4. Test scenarios cover both success paths AND every error code each op can return (hash drift, attestation missing, path traversal, file-already-exists, etc.) — SPEC-03 §Verification bullets 6-11 enumerate the error cases this ticket's tests must cover.
5. No backwards-compatibility aliasing/shims introduced. Tests do not import retired op names; they exist only in the compile-time rejection probe file.

## Verification Layers

1. Each create op produces a YAML file whose parsed content equals the `*_record` payload -> fixture before/after snapshot test (one per create op, 7 total).
2. `update_record_field` rejects structural mutations on accepted CFs without `retcon_attestation` -> unit test with error-code assertion.
3. `update_record_field` succeeds with valid retcon attestation on structural fields -> unit test with before/after snapshot.
4. `append_extension` on CF records is rejected (wrong target class) -> unit test with error-code assertion.
5. `append_touched_by_cf` idempotence on duplicate CF-ID -> unit test (submit twice; second call is noop).
6. Hybrid-file ops reject path traversal -> unit test with error-code assertion.
7. Approval verifier rejects: expired, tampered, replayed, hash-mismatch, malformed tokens -> 5 unit tests with distinct error codes.
8. `reorderPatches` produces canonical Tier 1 → Tier 2 → Tier 3 sequence regardless of input order -> unit test with permuted inputs.
9. `autoAddTouchedByCfOps` injects the correct op when `append_extension` targets a SEC with a new originating CF -> unit test with before/after patch-list snapshot.
10. **Compile-time append-only rejection** — attempting to instantiate `{op: 'replace_cf_record', ...}` fails TypeScript compilation -> `tsc --noEmit` test returns non-zero exit.

## What to Change

### 1. Create `tools/patch-engine/tests/ops/create-{cf,ch,inv,m,oq,ent,sec}-record.test.ts` (7 files)

Each test file follows the same pattern:

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { stageCreateCfRecord } from "../../src/ops/create-cf-record";
import { loadFixture, makeOpContext, yamlEqual } from "../harness";

test("create_cf_record writes CF-0099.yaml with expected content", async () => {
  const { worldRoot, worldSlug } = loadFixture("minimal-world-1");
  const ctx = makeOpContext(worldRoot, worldSlug);
  const cf_record = /* realistic CanonFactRecord */ ;
  const envelope = { ..., expected_id_allocations: { cf_ids: ["CF-0099"] } };
  const staged = await stageCreateCfRecord(envelope, {op: "create_cf_record", payload: {cf_record}, ...}, ctx);
  assert.equal(staged.target_file_path, path.join(worldRoot, "worlds", worldSlug, "_source/canon/CF-0099.yaml"));
  assert.ok(fs.existsSync(staged.temp_file_path));
  assert.ok(yamlEqual(fs.readFileSync(staged.temp_file_path, "utf8"), /* expected YAML */));
});

test("create_cf_record refuses overwrite", async () => { /* assert error code record_already_exists */ });
test("create_cf_record rejects ID outside expected_id_allocations", async () => { /* assert error code */ });
```

Apply the same template to the other 6 create ops, varying the target path, record shape, and ID pattern per ticket 002's per-op spec.

### 2. Create `tools/patch-engine/tests/ops/update-record-field.test.ts`

Scenarios:
- `notes` append without attestation → success.
- `modification_history` append without attestation → success.
- `statement` set without attestation → error `retcon_attestation_required`.
- `distribution.why_not_universal` set with valid attestation → success with before/after snapshot.
- Content-hash drift → error `record_hash_drift`.
- Field-path invalid → error `field_path_invalid`.

### 3. Create `tools/patch-engine/tests/ops/append-extension.test.ts`

Scenarios: append to INV/M/OQ/SEC → success; append to CF → error `op_target_class_mismatch`; malformed extension → schema error.

### 4. Create `tools/patch-engine/tests/ops/append-touched-by-cf.test.ts`

Scenarios: first append → success; duplicate append → noop; target non-SEC → error.

### 5. Create `tools/patch-engine/tests/ops/append-modification-history-entry.test.ts`

Scenarios: append to CF → success; append to INV → error; malformed entry (missing `change_id`) → schema error.

### 6. Create `tools/patch-engine/tests/ops/append-{adjudication,character,diegetic-artifact}-record.test.ts` (3 files)

Scenarios per op: valid path under expected sub-directory → success with frontmatter+body snapshot; path traversal → error; file already exists → error; malformed frontmatter → schema error.

### 7. Create `tools/patch-engine/tests/approval/verify-token.test.ts`

5 verdict codes + 1 success case per SPEC-03 §Verification bullet 6 (approval token). Fixture HMAC secret; tokens synthesized per test.

### 8. Create `tools/patch-engine/tests/commit/order.test.ts`

Scenarios:
- Empty patch list → empty output.
- Single create op → unchanged.
- Input order `[Tier3, Tier1, Tier2]` → output order `[Tier1, Tier2, Tier3]`.
- Multiple ops per tier preserve relative order within tier.
- `autoAddTouchedByCfOps`: `append_extension` on SEC with new `originating_cf` → output includes injected `append_touched_by_cf`; `append_extension` on SEC with existing CF → no injection; `append_extension` on CF → no injection (wrong target class).

### 9. Create `tools/patch-engine/tests/compile-time/append-only-rejection.ts.ignore`

```typescript
import type { PatchOperation } from "../../src/envelope/schema";
// These must all fail TypeScript compilation — closed-union append-only gate.
const bad1: PatchOperation = {op: "replace_cf_record", target_record_id: "CF-0001", payload: {} as any};
const bad2: PatchOperation = {op: "delete_cf_record", target_record_id: "CF-0001", payload: {} as any};
const bad3: PatchOperation = {op: "insert_before_node", target_record_id: "CF-0001", payload: {} as any};
```

And add a `test:compile-reject` script to `tools/patch-engine/package.json`: `"test:compile-reject": "! tsc --noEmit tests/compile-time/append-only-rejection.ts.ignore 2>/dev/null"` (exits 0 when tsc fails, exits 1 when tsc succeeds unexpectedly). The `.ts.ignore` extension keeps this file out of the normal build's compilation scope.

### 10. Create `tools/patch-engine/tests/harness.ts`

Utility exports: `loadFixture(name)`, `makeOpContext(worldRoot, worldSlug)`, `yamlEqual(a, b)`, `synthesizeToken(...)` for approval tests. The harness owns temp-dir creation (via `fs.mkdtempSync`) and cleanup (via `t.after(() => fs.rmSync(...))`).

### 11. Create `tools/patch-engine/tests/fixtures/minimal-world-1/` (scenario directory)

A minimal world with 2-3 CF records, 1 CH record, 1 invariant, 1 SEC record — enough for each op test to reference existing records for hash-drift and attestation scenarios. Structure: `before/_source/...` (initial state) + per-test expected `after/_source/...` snapshots stored inline in the test files rather than as separate fixture dirs (reduces fixture proliferation).

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
- `tools/patch-engine/tests/compile-time/append-only-rejection.ts.ignore` (new)
- `tools/patch-engine/tests/harness.ts` (new)
- `tools/patch-engine/tests/fixtures/minimal-world-1/` (new — several YAML files under `before/_source/`)
- `tools/patch-engine/package.json` (modify — add `test:compile-reject` script)

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
2. `cd tools/patch-engine && npm run test:compile-reject` exits 0 — confirms `tsc --noEmit` on the append-only-rejection probe fails as expected.
3. `find tools/patch-engine/tests/ops -name "*.test.ts" | wc -l` returns 14 (7 create + 4 update/append + 3 hybrid-file).
4. Test runtime under 10s total on a typical developer machine — fixture-based tests are lightweight (no real SQLite for most ops; temp-dir YAML only).

### Invariants

1. Every op module in `src/ops/` has a corresponding `tests/ops/*.test.ts` file (1:1 mapping).
2. Every error code each op can return is exercised by at least one negative-path test — coverage of error paths is the point of unit testing the engine's fail-closed behavior.
3. No test mutates a fixture directory on disk — all mutations target `fs.mkdtempSync`-created temp roots; fixtures are read-only copies.
4. The compile-time append-only rejection probe includes at least one example per retired-op category (pre-SPEC-13 anchor-based, pre-SPEC-13 yaml-field, hypothetical delete/replace).

## Test Plan

### New/Modified Tests

1. All 14 op-test files + approval + commit-order are new (enumerated in Files to Touch).
2. `tools/patch-engine/tests/harness.ts` — new test-utility module; rationale: shared fixture-loading + synthetic-context + YAML-compare utilities so individual test files stay focused on scenarios, not boilerplate.
3. `tools/patch-engine/tests/compile-time/append-only-rejection.ts.ignore` + the `test:compile-reject` script — this IS the test for the compile-time append-only rejection invariant.

### Commands

1. `cd tools/patch-engine && npm run test` (full unit suite).
2. `cd tools/patch-engine && npm run test:compile-reject` (compile-time rejection probe).
3. `cd tools/patch-engine && npm run test 2>&1 | grep -c "^ok "` should return ≥40 (14 ops × ≥2 scenarios each + 6 approval cases + 6 order cases; lower-bound estimate).
