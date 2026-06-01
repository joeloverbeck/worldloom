# SPEC108MANSTOSTU-008: Acceptance tests — new mode-gate file + existing-test updates

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new file covering the mode-gate enforcement assertions per SPEC-108 §2 item 8); modifies `tools/manual-story-studio/test/server/segments-routes.test.ts` and `tools/manual-story-studio/test/capstone-spec103.test.ts` (updates existing PUT/DELETE tests to thread `?mode=repair` so their legacy-outcome assertions continue to hold under the new gating).
**Deps**: archive/tickets/SPEC108MANSTOSTU-002.md

## Problem

SPEC-108 §2 item 8 prescribes the route-level acceptance test matrix for the mode-gating behavior introduced by ticket 002:

- `POST /api/.../segments` (no mode flag) — accepts a save; segment appended.
- `PUT /api/.../segments/SEG-3` (no mode flag) — returns 405 with `repair-mode-required`.
- `PUT /api/.../segments/SEG-3?mode=repair` — succeeds when SEG-3 is the latest segment.
- `PUT /api/.../segments/SEG-2?mode=repair` — returns 422 with `repair-replace-non-latest-blocked` when SEG-3 exists after it; succeeds when `force_replace: true` is also set.
- `DELETE /api/.../segments/SEG-3` (no mode flag) — returns 405.
- `DELETE /api/.../segments/SEG-3?mode=repair` — proceeds; outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) unchanged from current behavior.

Additionally, the existing route-level PUT/DELETE tests in `test/server/segments-routes.test.ts` (PUT edit at line 270, DELETE hard at line 302, DELETE preserved/force at lines 333-380) and `test/capstone-spec103.test.ts` currently call the segment routes without any mode flag and expect `200`. Under ticket 002's new gating they would receive `405`, breaking the build. This ticket updates each in place to thread `?mode=repair` so their legacy-outcome assertions continue to hold.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/test/server/segments-routes.test.ts` exists at HEAD with the PUT test at lines 270-300 and DELETE tests at lines 302-380. `tools/manual-story-studio/test/capstone-spec103.test.ts` also injects segment PUT/DELETE routes in its save/edit/rebuild and hybrid-delete capstone coverage. `tools/manual-story-studio/test/segments/` does NOT exist yet (verified — parent `test/` exists with siblings `server/`, `write/`, `read/`, etc.). The new test directory is created when the new file is added (the test runner handles arbitrary subdirectories via the `dist/test/**/*.test.js` glob in `package.json`).
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
3. Existing tests updated -> codebase grep-proof (`grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/test/server/segments-routes.test.ts tools/manual-story-studio/test/capstone-spec103.test.ts` returns ≥8 — import plus one use per updated PUT/DELETE call site across the focused route tests and the SPEC-103 capstone route tests).
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

### 2. Update existing route and capstone tests

For each affected test in `tools/manual-story-studio/test/server/segments-routes.test.ts` and `tools/manual-story-studio/test/capstone-spec103.test.ts`, append `?mode=repair` to the URL (or for tests that already use query strings like `?force=true`, extend to `?force=true&mode=repair`):

- **Line 270-300 (PUT edits SEG-1)** — change `url: \`/api/worlds/${...}/manual-stories/${...}/segments/SEG-1\`` to `url: \`/api/worlds/${...}/manual-stories/${...}/segments/SEG-1?mode=repair\``. The test asserts `response.statusCode === 200` (line 280) — unchanged under repair mode since SEG-1 IS the latest in this fixture.
- **Line 302-331 (DELETE hard-delete)** — same URL extension. The test asserts `outcome === "hard_deleted"` — unchanged under repair mode.
- **Line 333-365+ (DELETE preserved + force)** — same URL extension for the un-forced case; for the forced case at line 367+, change `?force=true` to `?force=true&mode=repair` (order does not matter; both are independent query parameters).
- **SPEC-103 capstone route calls** — update the injected PUT on `SEG-1`, the unforced DELETE calls, and the forced DELETE call to include the repair mode qualifier while leaving the capstone assertions unchanged.

The assertions in each affected test remain unchanged — the repair-mode qualifier only changes how the route reaches the existing function-level behavior; the outcomes are identical.

## Files to Touch

- `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new)
- `tools/manual-story-studio/test/server/segments-routes.test.ts` (modify)
- `tools/manual-story-studio/test/capstone-spec103.test.ts` (modify)

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
4. `grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/test/server/segments-routes.test.ts tools/manual-story-studio/test/capstone-spec103.test.ts` returns ≥8 matches (imports plus updated PUT/DELETE call sites).
5. `grep -nE "repair-mode-required|repair-replace-non-latest-blocked" tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` returns ≥3 matches across the new test file.

### Invariants

1. The new file's test names mirror SPEC-108 §2 item 8 wording verbatim where practical, so a test failure reads as a spec-AC failure.
2. The existing route and capstone assertions are unchanged — only the request URLs gain the `?mode=repair` qualifier. Outcome assertions (hard_deleted / segment_order_removed_files_preserved / force_deleted) continue to hold.
3. No test asserts the literal `"repair"` string in URL construction; all such sites use `?mode=${SEGMENT_REPAIR_MODE_FLAG}` (or import the constant). The literal-string rename surface is the constants module per ticket 001.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` (new) — covers SPEC-108 §7 AC #1-#6 (route-level mode-gate matrix).
2. `tools/manual-story-studio/test/server/segments-routes.test.ts` (modify) — existing tests updated to pass `?mode=repair` so their legacy-outcome assertions continue to validate under repair mode.
3. `tools/manual-story-studio/test/capstone-spec103.test.ts` (modify) — capstone route injections updated to pass `?mode=repair` so SPEC-103's broader route workflow remains aligned with the new gate.

### Commands

1. `cd tools/manual-story-studio && npm test` — full backend + frontend test suite. This is the load-bearing verification command — passing it confirms ticket 002's route gating works, ticket 001's constants are wired correctly, and the existing-test updates were sufficient.
2. `cd tools/manual-story-studio && node --test "dist/test/segments/**/*.test.js"` — targeted run of the new file only (after `npm run build:backend` populates `dist/`).

## Outcome

Completed: 2026-06-01

Added `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` with route-level coverage for SPEC-108 acceptance criteria #1-#6: append-only POST, PUT/DELETE 405 gates without repair mode, latest-segment repair success, non-latest repair 422 without `force_replace`, non-latest repair success with `force_replace`, and repair-mode DELETE preserving the hard-delete outcome.

Updated `tools/manual-story-studio/test/server/segments-routes.test.ts` and `tools/manual-story-studio/test/capstone-spec103.test.ts` so their existing PUT/DELETE route calls use `SEGMENT_REPAIR_MODE_FLAG` while keeping their legacy outcome assertions unchanged.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && node --test "dist/test/segments/**/*.test.js"` — passed, 7 tests.
3. `cd tools/manual-story-studio && npm test` — passed; backend reported 398 passing tests, then `web` `tsc -p tsconfig.json --noEmit` passed.
4. `test -f tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` — passed.
5. `grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/test/server/segments-routes.test.ts tools/manual-story-studio/test/capstone-spec103.test.ts` — import plus 8 updated route call sites present.
6. `grep -nE "repair-mode-required|repair-replace-non-latest-blocked" tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` — gate/error assertions present.
7. `git diff --check -- archive/tickets/SPEC108MANSTOSTU-008.md tools/manual-story-studio/test/segments/segment-lifecycle.test.ts tools/manual-story-studio/test/server/segments-routes.test.ts tools/manual-story-studio/test/capstone-spec103.test.ts archive/tickets/SPEC108MANSTOSTU-002.md` — clean after archival/reference repairs.

## Deviations

The drafted existing-test grep proof originally searched for hard-coded `mode=repair` literals. The landed tests intentionally construct URLs with `SEGMENT_REPAIR_MODE_FLAG`, so the proof was corrected to grep for the constant instead. Reassessment from ticket 002 also added `test/capstone-spec103.test.ts` to this ticket's owned test-update surface.
