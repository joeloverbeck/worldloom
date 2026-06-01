# SPEC108MANSTOSTU-002: Backend routes mode-gating + editSegment preconditions

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies `tools/manual-story-studio/src/server/routes/segments.ts` (mode-gating on PUT/DELETE) and `tools/manual-story-studio/src/write/segments.ts` (adds `preconditions: { require_latest: boolean }` option to `EditSegmentInput`). Route-level behavior change: PUT/DELETE without `?mode=repair` (or `mode: "repair"` body field) returns `405 Method Not Allowed` with a body containing `repair-mode-required`.
**Deps**: archive/tickets/SPEC108MANSTOSTU-001.md

## Problem

SPEC-108 makes the segment lifecycle append-only by default. The append-only `POST /api/.../segments` route remains unchanged; the destructive `PUT /api/.../segments/:segmentId` (rewrite) and `DELETE /api/.../segments/:segmentId` (remove) routes are gated behind an explicit `?mode=repair` flag. Routes without the flag return `405 Method Not Allowed` with a structured body explaining the mode requirement. Routes with the flag proceed with the existing implementation, but `editSegment` additionally validates that the target is the latest segment in `segment_order` (or `force_replace: true` is set, which overrides the latest-segment check).

This realizes the report §15 framing: *"replace latest accepted segment only if no later accepted segment exists"* and *"if the latest prose is bad, do not preserve it as a segment"*. The state-review precondition (the second half of the report §15 framing) is deferred to SPEC-109 per the spec's §3 Key decisions.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/src/server/routes/segments.ts` exports `registerSegmentsWriteRoutes` (verified at HEAD lines 140-263); the `PUT` handler is at lines 181-229 and the `DELETE` handler is at lines 231-262. Both currently take no mode flag. `tools/manual-story-studio/src/write/segments.ts` exports `editSegment` (verified at HEAD lines 138-199); `EditSegmentInput` is at lines 41-51 and accepts no `preconditions` field.
2. SPEC-108 §2 items 3-5 specify the route-level mode gate and the editSegment precondition contract. SPEC-108 §4 Files to Touch enumerates both `src/server/routes/segments.ts` and `src/write/segments.ts` modifications. The reassessment-updated §2 item 8 (D6) clarifies that the existing route-test behavior for delete outcomes is preserved under `mode=repair` and only the mode-gate enforcement assertions are new.
3. Cross-skill boundary: the route handler imports `SEGMENT_REPAIR_MODE_FLAG` from `../../write/segment-modes.js` (introduced by ticket 001). Downstream consumers of this route's behavior change are ticket 003 (frontend API wrappers), ticket 007 (RepairSegments UI), and ticket 008 (acceptance tests). The shared boundary is the HTTP route contract: PUT/DELETE without mode returns 405; with mode returns existing outcomes (legacy semantics).
4. FOUNDATIONS Rule 6 (No Silent Retcons): the route behavior change must NOT silently rewrite accepted manuscript text. The mode gate is the audit-trail surface — every PUT/DELETE operation now passes through a structured `mode` validation, and the 405 response names `repair-mode-required` so callers see the gate explicitly. The change is route-visible (the URL carries `?mode=repair`) and body-visible (the 405 response names the requirement).
5. (was template item 7 — route behavior change blast radius): the legacy `PUT /api/.../segments/:segmentId` and `DELETE /api/.../segments/:segmentId` routes previously accepted requests unconditionally; they now return 405 without `?mode=repair`. Pipeline-wide grep confirms all consumers are inside `tools/manual-story-studio/`: the frontend `web/src/api/segments.ts`, existing HTTP tests under `test/server/segments-routes.test.ts`, and `test/capstone-spec103.test.ts` route injections. The frontend consumer is updated by ticket 003. The test consumers are updated by ticket 008; that ticket was truthed during this reassessment to include the capstone route calls. No external CI / scripts / sibling tools call these routes.

## Architecture Check

1. The mode-gating happens at the route layer (HTTP boundary) rather than inside `editSegment` / `deleteSegment` directly. This keeps the function-level tests at `test/write/segments.test.ts` (which call the functions directly without HTTP) unaffected, preserves the "code paths intact, gates explicit" architecture from SPEC-108 §3 Key decisions, and centralizes the mode-validation in one location per route. The latest-segment precondition for `editSegment` is the exception — it lives inside `editSegment` itself because the function-level callers (e.g., the upcoming repair-mode page going through the route) must honor the same gate.
2. `405 Method Not Allowed` is the correct HTTP semantic per SPEC-108 §3 Key decisions: the method (PUT/DELETE) IS allowed on the resource (segment URL); the request is rejected because the mode qualifier is absent. `403 Forbidden` would imply an authorization failure, which this is not. The 405 response includes an `Allow: POST` header and a body naming `repair-mode-required`.
3. No backwards-compatibility shims — the legacy "accept any PUT/DELETE without mode" behavior is removed outright. The mode gate is the new contract; consumers update accordingly.

## Verification Layers

1. PUT without mode → 405 with `repair-mode-required` -> codebase grep-proof on the route handler (`grep -n "repair-mode-required" tools/manual-story-studio/src/server/routes/segments.ts` returns the rejection-path match) + ticket 008's HTTP test.
2. PUT with `?mode=repair` on latest segment → 200 -> ticket 008's HTTP test.
3. PUT with `?mode=repair` on non-latest segment (no `force_replace`) → 422 with `repair-replace-non-latest-blocked` -> ticket 008's HTTP test.
4. PUT with `?mode=repair&force_replace=true` on non-latest segment → 200 -> ticket 008's HTTP test.
5. DELETE without mode → 405 with `repair-mode-required` -> ticket 008's HTTP test.
6. DELETE with `?mode=repair` → existing three outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) preserved -> ticket 008's HTTP test, plus the updated existing tests in `test/server/segments-routes.test.ts`.
7. `editSegment` function-level tests at `test/write/segments.test.ts` continue to pass unchanged -> existing test suite (function-level callers do not pass through the HTTP gate).
8. `npm test` in `tools/manual-story-studio` passes -> full-pipeline verification.

## What to Change

### 1. Route-level mode validation

In `tools/manual-story-studio/src/server/routes/segments.ts`:

- Import `SEGMENT_REPAIR_MODE_FLAG` from `../../write/segment-modes.js` (introduced by ticket 001's `SEGMENT_REPAIR_MODE_FLAG`).
- Add a helper `extractMode(querystring, body): string | null` that reads `mode` from query string OR request body (body takes precedence).
- In the `PUT /api/.../segments/:segmentId` handler (currently lines 181-229), before `parseSegmentPayload`, extract the mode value. If it is not `SEGMENT_REPAIR_MODE_FLAG`, return `reply.code(405).header("Allow", "POST").send({ error: "repair-mode-required", message: "PUT requires ?mode=repair or body { mode: \"repair\" }; see the repair-mode UI affordance." })`.
- Symmetric handler change in the `DELETE /api/.../segments/:segmentId` handler (currently lines 231-262): extract mode, return the same 405 shape if absent.
- For PUT with repair mode: read `force_replace` from the request body (default `false`); pass `preconditions: { require_latest: !force_replace }` into the `editSegment` call.

### 2. `editSegment` precondition gate

In `tools/manual-story-studio/src/write/segments.ts`:

- Extend `EditSegmentInput` (currently lines 41-51) with `preconditions?: { require_latest: boolean }`.
- Inside `editSegment` (currently lines 138-199), after the existing `readSegmentSidecar` check (which already returns `missingEdit(input)` when the segment does not exist) and before the write, evaluate the precondition:
  - When `input.preconditions?.require_latest === true`, read the metadata via `readMetadata(input.root)`, fetch `metadata.segment_order`, and verify `input.segment_id === segment_order[segment_order.length - 1]`. When the check fails, throw a `SegmentPreconditionError` (a new error class exported from this module) carrying `{ code: "repair-replace-non-latest-blocked", segment_id, latest_segment_id }`.
- Add `SegmentPreconditionError` to the module exports; the route layer catches it in its `writeError` helper and maps it to `reply.code(422).send({ error: "repair-replace-non-latest-blocked", segment_id, latest_segment_id })`.

### 3. Route error mapping update

In `tools/manual-story-studio/src/server/routes/segments.ts`, update `writeError` (currently lines 81-87) to recognize `SegmentPreconditionError` and route it to `reply.code(422).send({ error: error.code, segment_id: error.segment_id, latest_segment_id: error.latest_segment_id })`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/segments.ts` (modify)
- `tools/manual-story-studio/src/write/segments.ts` (modify)
- `archive/tickets/SPEC108MANSTOSTU-008.md` (modify — same-family proof-surface truthing for capstone route tests)

## Out of Scope

- The state-review precondition for `force_replace` — deferred to SPEC-109 per SPEC-108 §3 Key decisions; will land as a follow-up edit to this same route when SPEC-109 ships.
- Frontend API wrapper changes (ticket 003).
- RepairSegments page UI (ticket 007).
- Acceptance test additions (ticket 008).
- Changes to `deleteSegment` function-level behavior — gating happens entirely at the route layer per SPEC-108 §4.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend` succeeds (typecheck for the new `preconditions` field + `SegmentPreconditionError`).
2. `cd tools/manual-story-studio && npm test` continues to pass after ticket 008 lands (route tests cover the mode-gate behavior; function-level tests at `test/write/segments.test.ts` remain unchanged). This ticket does not claim a green broad suite before ticket 008 updates the existing route/capstone test callers.
3. `grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/src/server/routes/segments.ts` returns ≥1 match (the import and the validation site).
4. `grep -n "repair-mode-required" tools/manual-story-studio/src/server/routes/segments.ts` returns ≥1 match (the 405 response body).
5. `grep -n "repair-replace-non-latest-blocked" tools/manual-story-studio/src/write/segments.ts` returns ≥1 match (the precondition error code).

### Invariants

1. `POST /api/.../segments` behavior is unchanged: append-only save with auto-allocated ID, regardless of any mode flag presence.
2. The function-level `editSegment` (called directly by tests under `test/write/`) honors `preconditions.require_latest` when set; when the option is absent or `false`, the function behaves exactly as before.
3. The route-level `PUT` / `DELETE` handlers ALWAYS check the mode flag first, before any payload validation or sandbox resolution — the 405 response is the fastest possible rejection path.
4. The `force_replace` request-body field, when present and `true` alongside `?mode=repair`, suppresses the `require_latest` precondition; when absent or `false`, the precondition is enforced.

## Test Plan

### New/Modified Tests

1. Test coverage for the changes in this ticket lands in ticket 008 (new `test/segments/segment-lifecycle.test.ts` plus updates to `test/server/segments-routes.test.ts` and `test/capstone-spec103.test.ts`). This ticket's edits cause route-test failures in existing tests that call PUT/DELETE without `?mode=repair` and expect 200; those failures resolve when ticket 008 lands. Land tickets 002 and 008 together (or 002 first, 008 immediately after) to avoid an intermediate breaking-tests state.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend` — typecheck for the new field + error class.
2. `node --input-type=module <<'NODE' ... NODE` from `tools/manual-story-studio` — focused compiled-route probe covering the repair-mode edge cases before test-file updates land in ticket 008.
3. `cd tools/manual-story-studio && npm test` — full test suite after ticket 008 lands.

## Outcome

Completed: 2026-06-01

Implemented backend repair-mode gating for the segment rewrite/delete routes:

1. `tools/manual-story-studio/src/server/routes/segments.ts` imports `SEGMENT_REPAIR_MODE_FLAG`, rejects PUT/DELETE without `mode=repair` using `405` + `repair-mode-required`, and maps `SegmentPreconditionError` to `422`.
2. `tools/manual-story-studio/src/write/segments.ts` adds `preconditions?: { require_latest: boolean }` to `EditSegmentInput` and throws `SegmentPreconditionError("repair-replace-non-latest-blocked", ...)` when repair-mode callers try to replace a non-latest segment without `force_replace`.
3. `POST /segments` and direct function-level edit/delete behavior remain unchanged unless a caller explicitly passes the new `preconditions.require_latest` option.
4. `archive/tickets/SPEC108MANSTOSTU-008.md` was truthed to include `test/capstone-spec103.test.ts`, because reassessment found capstone route injections in addition to `test/server/segments-routes.test.ts`.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. Focused compiled-route probe from `tools/manual-story-studio` using `node --input-type=module` — passed. Covered:
   - PUT without mode returns `405` and `repair-mode-required`.
   - PUT latest segment with `?mode=repair` returns `200`.
   - PUT non-latest segment with `?mode=repair` returns `422` and `repair-replace-non-latest-blocked`.
   - PUT non-latest segment with `?mode=repair` and `force_replace: true` returns `200`.
   - DELETE without mode returns `405` and `repair-mode-required`.
   - DELETE with query `?mode=repair` returns existing `hard_deleted` outcome.
   - DELETE with request-body `{ mode: "repair" }` returns existing `hard_deleted` outcome.
3. `cd tools/manual-story-studio && node --test dist/test/write/segments.test.js` — passed, 7 tests; direct function-level edit/delete behavior remains unchanged without the new precondition option.
4. `grep -n "SEGMENT_REPAIR_MODE_FLAG" tools/manual-story-studio/src/server/routes/segments.ts` — import and validation sites present.
5. `grep -n "repair-mode-required" tools/manual-story-studio/src/server/routes/segments.ts` — 405 response body present.
6. `grep -n "repair-replace-non-latest-blocked" tools/manual-story-studio/src/write/segments.ts` — precondition error code present.

## Deviations

The broad `npm test` lane is intentionally not claimed green for this ticket alone. Existing route/capstone test callers still need `?mode=repair`; ticket 008 owns those test updates and the final broad suite proof. Reassessment also found `test/capstone-spec103.test.ts` route injections, so ticket 008 was updated to own those along with `test/server/segments-routes.test.ts`.
