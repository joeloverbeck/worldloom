# SPEC108MANSTOSTU-003: Frontend API wrappers — mode + force_replace params

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/api/segments.ts` to extend the `editSegment` and `deleteSegment` API wrappers with `mode` and `force_replace` parameters (mirroring the route surface introduced by ticket 002).
**Deps**: SPEC108MANSTOSTU-002

## Problem

Ticket 002 introduces the `?mode=repair` query parameter (and `force_replace` request-body field for `editSegment`) on the segment write routes. The frontend API wrappers in `web/src/api/segments.ts` currently call those routes without any mode parameter; under the new route gating they would receive `405 Method Not Allowed`. The repair-mode UI (ticket 007) needs to call the wrappers with `mode=repair` and optionally `force_replace=true`. This ticket extends the API wrappers' signatures with explicit options so the RepairSegments page can compose the correct request shapes.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/web/src/api/segments.ts` exports `editSegment` (verified at HEAD lines 105-123) and `deleteSegment` (verified at HEAD lines 125-141). The existing `deleteSegment` already accepts a `{ force?: boolean }` options bag, which sets the `?force=true` query parameter pattern — the new `mode` parameter follows the same pattern.
2. SPEC-108 §4 Files to Touch lists `tools/manual-story-studio/web/src/api/segments.ts` with the action *"extend `editSegment`/`deleteSegment` API wrappers with the `mode` and `force_replace` parameters"*. SPEC-108 §2 item 4 (PUT precondition) names `force_replace` as the sub-flag.
3. Cross-skill boundary: this module is consumed by `web/src/pages/Manuscript.tsx` (currently — but ticket 005 removes that consumer), `web/src/pages/PasteProse.tsx` (currently — but ticket 004 removes that consumer), and the new `web/src/pages/RepairSegments.tsx` (ticket 007). After ticket 004 + 005 + 007 land, the ONLY consumers of `editSegment` / `deleteSegment` wrappers will be RepairSegments. The wrappers' new signatures must remain backward-compatible (mode/force_replace are optional) so that any test still calling them without arguments compiles unchanged. The shared boundary is the `editSegment(worldSlug, msSlug, segmentId, request, options?)` / `deleteSegment(worldSlug, msSlug, segmentId, options?)` signatures.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the wrapper signatures now make the mode flag visible at every call site — callers must explicitly pass `{ mode: "repair" }` to reach the destructive routes, and the rename surface from "unconditional access" to "mode-gated access" is greppable across `web/src/`.

## Architecture Check

1. The wrapper signatures extend the existing `options: { force?: boolean }` pattern that `deleteSegment` already uses, keeping the API stylistically consistent. `editSegment` gains an `options: { mode?: "repair"; force_replace?: boolean }` parameter; `deleteSegment` gains a `mode?: "repair"` slot in its existing options bag.
2. The wrappers do NOT import `SEGMENT_REPAIR_MODE_FLAG` from the backend constants module (the frontend bundle is separate; importing across the backend/frontend boundary would couple them). Instead, the wrapper's TypeScript type uses the literal `"repair"` directly, which is acceptable because TypeScript's literal-type narrowing will catch any typo at compile time.
3. No backwards-compatibility shims — the new parameters are optional with no default mode, preserving the wrappers' existing call shapes for any test that calls them without options.

## Verification Layers

1. `editSegment` signature extended -> codebase grep-proof (`grep -n "editSegment" tools/manual-story-studio/web/src/api/segments.ts | head -3` shows the new options parameter).
2. `deleteSegment` signature extended -> codebase grep-proof (`grep -n "deleteSegment" tools/manual-story-studio/web/src/api/segments.ts | head -3` shows the new mode field in options).
3. Frontend bundle typechecks -> `npm --prefix tools/manual-story-studio/web test` (which is `tsc --noEmit`) passes.

## What to Change

### 1. Extend `editSegment` wrapper

In `tools/manual-story-studio/web/src/api/segments.ts`, the `editSegment` function (currently lines 105-123) gains an optional fifth parameter:

```ts
export async function editSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  request: SaveSegmentRequest,
  options: { mode?: "repair"; force_replace?: boolean } = {},
): Promise<SaveSegmentResponse> {
  const qs = options.mode ? `?mode=${encodeURIComponent(options.mode)}` : "";
  const body = options.force_replace
    ? { ...request, force_replace: true }
    : request;
  const response = await fetch(
    `${segmentsBase(worldSlug, msSlug)}/${enc(segmentId)}${qs}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  // ...existing error-mapping logic unchanged...
}
```

### 2. Extend `deleteSegment` wrapper

In the same file, the `deleteSegment` function (currently lines 125-141) extends its options bag:

```ts
export async function deleteSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  options: { force?: boolean; mode?: "repair" } = {},
): Promise<DeleteSegmentResponse | { ok: false; error: "not_found" }> {
  const params = new URLSearchParams();
  if (options.mode) params.set("mode", options.mode);
  if (options.force) params.set("force", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  // ...rest of function unchanged, using `qs` instead of the previous hand-built query string...
}
```

## Files to Touch

- `tools/manual-story-studio/web/src/api/segments.ts` (modify)

## Out of Scope

- Backend route changes (ticket 002).
- RepairSegments page integration (ticket 007).
- Acceptance test additions (ticket 008).
- Updating Manuscript / PasteProse / Dashboard pages to call the new options — tickets 004 / 005 / 006 strip those pages' wrapper usage entirely, so no update is needed there.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (which is `tsc --noEmit`) succeeds — the new optional parameters do not break any existing caller signature.
2. `grep -n "mode?: \"repair\"" tools/manual-story-studio/web/src/api/segments.ts` returns ≥2 matches (one in `editSegment`, one in `deleteSegment`).
3. `grep -n "force_replace" tools/manual-story-studio/web/src/api/segments.ts` returns ≥1 match (in `editSegment`).

### Invariants

1. `editSegment(worldSlug, msSlug, segmentId, request)` (without options) continues to call `PUT /api/.../segments/:segmentId` without any query string — this preserves any existing test that calls the wrapper without options. After ticket 002 lands, such calls receive 405; the wrapper itself does NOT enforce mode (the route does).
2. `deleteSegment(worldSlug, msSlug, segmentId, { force: true })` (with the existing options pattern) continues to add `?force=true` — the new `mode` parameter is independent.
3. When both `mode` and `force` (or `force_replace`) are set, both flags reach the route — the wrapper composes them in the query string / request body without precedence ambiguity.

## Test Plan

### New/Modified Tests

1. `None — frontend API wrapper signature extension; runtime behavior is verified via the new RepairSegments page (ticket 007) calling the wrappers, and via the route-level acceptance tests (ticket 008) hitting the routes directly.`

### Commands

1. `cd tools/manual-story-studio/web && npm test` — TypeScript typecheck for the extended signatures.
