# SPEC108MANSTOSTU-008: Acceptance tests — new mode-gate file + existing-test updates

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new file covering the mode-gate enforcement assertions per SPEC-108 §2 item 8); modifies `tools/manual-story-studio/test/server/segments-routes.test.ts` (updates existing PUT/DELETE tests to thread `?mode=repair` so their legacy-outcome assertions continue to hold under the new gating).
**Deps**: SPEC108MANSTOSTU-002

## Problem

SPEC-108 §2 item 8 prescribes the route-level acceptance test matrix for the mode-gating behavior introduced by ticket 002:

- `POST /api/.../segments` (no mode flag) — accepts a save; segment appended.
- `PUT /api/.../segments/SEG-3` (no mode flag) — returns 405 with `repair-mode-required`.
- `PUT /api/.../segments/SEG-3?mode=repair` — succeeds when SEG-3 is the latest segment.
- `PUT /api/.../segments/SEG-2?mode=repair` — returns 422 with `repair-replace-non-latest-blocked` when SEG-3 exists after it; succeeds when `force_replace: true` is also set.
- `DELETE /api/.../segments/SEG-3` (no mode flag) — returns 405.
- `DELETE /api/.../segments/SEG-3?mode=repair` — proceeds; outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) unchanged from current behavior.

Additionally, the existing route-level PUT/DELETE tests in `test/server/segments-routes.test.ts` (PUT edit at line 270, DELETE hard at line 302, DELETE preserved/force at lines 333-380) currently call the routes without any mode flag and expect `200`. Under ticket 002's new gating they would receive `405`, breaking the build. This ticket updates each in place to thread `?mode=repair` so their legacy-outcome assertions continue to hold.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/test/server/segments-routes.test.ts` exists at HEAD with the PUT test at lines 270-300 and DELETE tests at lines 302-380. `tools/manual-story-studio/test/segments/` does NOT exist yet (verified — parent `test/` exists with siblings `server/`, `write/`, `read/`, etc.). The new test directory is created when the new file is added (the test runner handles arbitrary subdirectories via the `dist/test/**/*.test.js` glob in `package.json`).
2. SPEC-108 §2 item 8 enumerates the new test matrix. SPEC-108 §4 Files to Touch lists both the new file path and the existing-test update. SPEC-108 §6 Build & test affirms the split (new file owns mode-gate assertions; existing-tests file remains canonical for HTTP-level segment route behavior under repair mode).
3. Cross-skill boundary: the new test file imports `SEGMENT_REPAIR_MODE_FLAG` from `../../src/write/segment-modes.js` (ticket 001) and exercises the route surface introduced by ticket 002. The existing-test update consumes the same route surface. The shared boundary is the HTTP route contract (PUT/DELETE without mode → 405; with mode → existing outcomes).
4. FOUNDATIONS Rule 6 (No Silent Retcons): the acceptance test surface is the authoritative verification that repair-mode behavior is gated visibly. The new file's test names directly mirror SPEC-108 §2 item 8 wording (e.g., `"PUT without mode flag returns 405 with repair-mode-required"`), which makes test failures auditable against the spec.

## Architecture Check

1. The new file lives at `test/segments/segment-lifecycle.test.ts` (a new subdirectory under `test/`) per SPEC-108 §4. It uses the same Fastify `server.inject` pattern as the existing `test/server/segments-routes.test.ts` (verified at HEAD — `await server.inject({ method: "PUT", url: "...", payload: ... })`), keeping the test style consistent across the package.
2. The existing-test update is a minimal-touch edit: each PUT/DELETE call gains `?mode=repair` in the URL OR `mode: "repair"` in the payload. No test assertion content changes (the outcomes under repair mode are identical to the pre-spec behavior). The new file's tests cover only the gate (405 without flag; 422 for non-latest replace without force_replace); the existing file continues to cover the legacy-outcome assertions under repair mode.
3. No backwards-compatibility shims — the existing tests are updated in place; they continue to assert the same outcomes, just under the repair-mode qualifier.

## Verification Layers

1. New test file present -> codebase grep-proof (`test -f tools/manual-story-studio/test/segments/segment-lifecycle.test.ts`).
2. New file covers the §2 item 8 matrix -> codebase grep-proof (`grep -cE "repair-mode-required|repair-replace-non-latest-blocked|force_replace" tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` returns ≥3 — at least one per finding code).
3. Existing tests updated -> codebase grep-proof (`grep -nE "mode=repair|mode.*repair" tools/manual-story-studio/test/server/segments-routes.test.ts` returns ≥4 — one per updated PUT/DELETE call site).
4. Test suite passes -> `cd tools/manual-story-studio && npm test`.
5. SPEC-108 §7 Acceptance criteria #1-#6 each map to a test in this ticket's coverage -> manual review by the implementer (the test file's docstrings name the AC numbers).

## What to Change

### 1. Create `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts`

The new file exercises the mode-gate enforcement assertions. Test cases:

- **AC #2** — `PUT /api/.../segments/:segmentId` without `?mode=repair` returns 405 with body containing `repair-mode-required`. Setup: save one segment via POST; then issue PUT without mode flag; assert status 405 and body shape.
- **AC #3** — `PUT /api/.../segments/SEG-N?mode=repair` succeeds when SEG-N is the latest segment. Setup: save one segment (SEG-1); issue PUT on SEG-1 with `?mode=repair`; assert status 200 and the segment's prose updated.
- **AC #4** — `PUT /api/.../segments/SEG-N?mode=repair` returns 422 with `repair-replace-non-latest-blocked` when a later segment exists. Setup: save two segments (SEG-1, SEG-2); issue PUT on SEG-1 with `?mode=repair` (no force_replace); assert status 422 and body code.
- **AC #4 (force_replace)** — `PUT /api/.../segments/SEG-N?mode=repair` succeeds when a later segment exists AND `force_replace: true` is set in the body. Setup: save two segments (SEG-1, SEG-2); issue PUT on SEG-1 with `?mode=repair` and body `{ prose, force_replace: true }`; assert status 200.
- **AC #5** — `DELETE /api/.../segments/:segmentId` without `?mode=repair` returns 405 with `repair-mode-required`. Setup: save one segment; issue DELETE without mode flag; assert status 405.
- **AC #1 (no regression)** — `POST /api/.../segments` continues to accept saves (no mode flag required). Smoke test: save one segment via POST; assert status 201 and the segment appears in `segment_order`.

Each test uses the same fixture pattern as the existing `test/server/segments-routes.test.ts` (the `mkWorld()` / `saveSegmentThroughRoute()` helpers — copy or extract as needed). Tests import `SEGMENT_REPAIR_MODE_FLAG` from `../../src/write/segment-modes.js` and assert against the constant rather than the literal `"repair"` string.

### 2. Update `tools/manual-story-studio/test/server/segments-routes.test.ts`

For each affected test, append `?mode=repair` to the URL (or for tests that already use query strings like `?force=true`, extend to `?mode=repair&force=true`):

- **Line 270-300 (PUT edits SEG-1)** — change `url: \`/api/worlds/${...}/manual-stories/${...}/segments/SEG-1\`` to `url: \`/api/worlds/${...}/manual-stories/${...}/segments/SEG-1?mode=repair\``. The test asserts `response.statusCode === 200` (line 280) — unchanged under repair mode since SEG-1 IS the latest in this fixture.
- **Line 302-331 (DELETE hard-delete)** — same URL extension. The test asserts `outcome === "hard_deleted"` — unchanged under repair mode.
- **Line 333-365+ (DELETE preserved + force)** — same URL extension for the un-forced case; for the forced case at line 367+, change `?force=true` to `?force=true&mode=repair` (order does not matter; both are independent query parameters).

The assertions in each affected test remain unchanged — the repair-mode qualifier only changes how the route reaches the existing function-level behavior; the outcomes are identical.

## Files to Touch

- `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new)
- `tools/manual-story-studio/test/server/segments-routes.test.ts` (modify)

## Out of Scope

- Backend route changes (ticket 002).
- Frontend tests for the RepairSegments page — SPEC-108 §6 Build & test uses manual verification for the UI surfaces; programmatic UI tests are not in scope.
- Function-level tests at `tools/manual-story-studio/test/write/segments.test.ts` — those call `editSegment` / `deleteSegment` directly without HTTP and are not affected by the route-level gating (verified at reassessment).
- Coverage for the state-review precondition of `force_replace` — deferred to SPEC-109.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` succeeds — all backend tests pass, including the new file and the updated existing file.
2. `cd tools/manual-story-studio && npm run build:backend` succeeds (typecheck-only run for the new test file).
3. `test -f tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` succeeds.
4. `grep -nE "mode=repair|mode.*repair" tools/manual-story-studio/test/server/segments-routes.test.ts` returns ≥4 matches (the updated PUT/DELETE call sites).
5. `grep -nE "repair-mode-required|repair-replace-non-latest-blocked" tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` returns ≥3 matches across the new test file.

### Invariants

1. The new file's test names mirror SPEC-108 §2 item 8 wording verbatim where practical, so a test failure reads as a spec-AC failure.
2. The existing file's assertions are unchanged — only the request URLs gain the `?mode=repair` qualifier. Outcome assertions (hard_deleted / segment_order_removed_files_preserved / force_deleted) continue to hold.
3. No test asserts the literal `"repair"` string in URL construction; all such sites use `?mode=${SEGMENT_REPAIR_MODE_FLAG}` (or import the constant). The literal-string rename surface is the constants module per ticket 001.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new) — covers SPEC-108 §7 AC #1-#6 (route-level mode-gate matrix).
2. `tools/manual-story-studio/test/server/segments-routes.test.ts` (modify) — existing tests updated to pass `?mode=repair` so their legacy-outcome assertions continue to validate under repair mode.

### Commands

1. `cd tools/manual-story-studio && npm test` — full backend + frontend test suite. This is the load-bearing verification command — passing it confirms ticket 002's route gating works, ticket 001's constants are wired correctly, and the existing-test updates were sufficient.
2. `cd tools/manual-story-studio && node --test "dist/test/segments/**/*.test.js"` — targeted run of the new file only (after `npm run build:backend` populates `dist/`).
