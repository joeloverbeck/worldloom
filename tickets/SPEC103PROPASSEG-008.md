# SPEC103PROPASSEG-008: Segments HTTP routes — POST save / GET list & single / PUT edit / DELETE hybrid

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/server/routes/segments.ts` + paired test under `tools/manual-story-studio/test/server/segments-routes.test.ts`; modifies `tools/manual-story-studio/src/server/http.ts` to register the new routes (split between read and write registration sites per the existing convention).
**Deps**: archive/tickets/SPEC103PROPASSEG-004.md, 007

## Problem

SPEC-103 §4 Create enumerates `src/server/routes/segments.ts` exposing four HTTP endpoints (POST save, GET list, GET single, PUT edit, DELETE hybrid). SPEC-103 §7 AC#1, #3, #7, #8 specify the behaviors. The route module wraps `archive/tickets/SPEC103PROPASSEG-004.md`'s save / edit / delete write functions + ticket 005's checklist module + ticket 007's read functions in Fastify handlers behind the SPEC-100 `wrapRouterWritable` write-scope guard at `tools/manual-story-studio/src/server/http.ts`. `http.ts` is modified to register the new routes alongside the existing manual-stories / records / metadata / prompts routes — a shared-file overlap with ticket 009 (manuscript routes) governed by §Step 6 item 5 mechanical-merge discipline.

## Assumption Reassessment (2026-05-31)

1. Existing `tools/manual-story-studio/src/server/http.ts:53-83` exposes `createServer` which registers read routes outside `wrapRouterWritable` (lines 61-65) and write routes inside it (lines 67-80). The pattern for adding a new route file is established by `routes/manual-stories.ts`, `routes/records.ts`, `routes/metadata.ts`, `routes/prompts.ts`: import the register functions at the top, then add `await register*ReadRoutes(...)` and `await register*WriteRoutes(...)` calls. The segments routes follow the same split (GET endpoints register on the bare server; POST/PUT/DELETE register inside `wrapRouterWritable`).
2. SPEC-103 §2 item 2 (save flow returns segment_id + sidecar + checklist payload), §2 item 7 (per-segment actions: Edit, Delete with hybrid semantics), §4 Create includes `src/server/routes/segments.ts`, §4 Modify includes `src/server/http.ts`, §7 AC#1, #3, #7, #8 (saved segment + segment_order update + edit-in-place + hybrid delete).
3. Cross-skill boundary: `http.ts` is modified by both this ticket (segments routes) and ticket 009 (manuscript routes) — mechanical merge per §Step 6 item 5 shared-file overlap (each ticket adds its own pair of register calls; conflicts are line-level only, no semantic overlap). The route module consumes `archive/tickets/SPEC103PROPASSEG-004.md` (saveSegment / editSegment / deleteSegment), ticket 005 (buildStateUpdateChecklist), and ticket 007 (listSegments / readSegmentSidecar / readSegmentBody) — boundaries documented in those tickets' Cross-skill boundary notes.

## Architecture Check

1. Route module follows the existing `routes/*.ts` pattern (separate `registerSegmentsReadRoutes` and `registerSegmentsWriteRoutes` exports; GET routes register on the bare server; POST/PUT/DELETE register inside `wrapRouterWritable`). Preserves the write-scope guard discipline SPEC-100 established and the read/write registration split convention from SPEC-100 / SPEC-101 / SPEC-102.
2. No backwards-compatibility aliasing — net-new routes; `http.ts` modification is purely additive (adds two `await register*Routes(...)` calls; no existing route is renamed or removed).

## Verification Layers

1. POST /api/worlds/:slug/manual-stories/:msSlug/segments invokes `archive/tickets/SPEC103PROPASSEG-004.md`'s `saveSegment`; returns 201 with `{ segment_id, sidecar, checklist_payload }` body → route test
2. GET /api/worlds/:slug/manual-stories/:msSlug/segments invokes ticket 007's `listSegments`; returns 200 with `{ segments: SegmentListEntry[] }` body → route test
3. GET /api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId invokes ticket 007's `readSegmentSidecar` + `readSegmentBody`; returns 200 with `{ body, sidecar }` body or 404 when missing → route test (two sub-cases)
4. PUT /api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId invokes `archive/tickets/SPEC103PROPASSEG-004.md`'s `editSegment`; returns 200 with `{ segment_id, sidecar, checklist_payload }` body → route test
5. DELETE /api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId[?force=true] invokes `archive/tickets/SPEC103PROPASSEG-004.md`'s `deleteSegment`; returns 200 with `{ outcome, referrers, warning? }` body → route test (three sub-cases for the hybrid: unreferenced / referenced / force)

## What to Change

### 1. Create src/server/routes/segments.ts

Implement `registerSegmentsReadRoutes` (GET list + GET single) and `registerSegmentsWriteRoutes` (POST save + PUT edit + DELETE delete), following the shape of `tools/manual-story-studio/src/server/routes/records.ts` and `tools/manual-story-studio/src/server/routes/prompts.ts`. Each handler:

- Validates path params (`:slug`, `:msSlug`, and for single-segment endpoints `:segmentId` matching `^SEG-\d+$`)
- Resolves the manual story root via the sandbox helper (parallel to `prompts.ts:54-66` `resolveRootOrNull`); returns 404 `{ error: "manual_story_not_found" }` when unresolvable
- Invokes the corresponding write / read / state-checklist function from `archive/tickets/SPEC103PROPASSEG-004.md` / ticket 005 / ticket 007
- Returns the typed response with appropriate HTTP status codes (200 / 201 / 400 / 404)

```typescript
// Indicative sketch — actual implementation should follow routes/prompts.ts:106-242 pattern verbatim
export async function registerSegmentsReadRoutes(server, options) {
  server.get("/api/worlds/:slug/manual-stories/:msSlug/segments", listHandler);
  server.get("/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId", singleHandler);
}

export async function registerSegmentsWriteRoutes(server, options) {
  server.post("/api/worlds/:slug/manual-stories/:msSlug/segments", saveHandler);
  server.put("/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId", editHandler);
  server.delete("/api/worlds/:slug/manual-stories/:msSlug/segments/:segmentId", deleteHandler);
}
```

### 2. Modify src/server/http.ts

At the top of `tools/manual-story-studio/src/server/http.ts`, add the imports:

```typescript
import {
  registerSegmentsReadRoutes,
  registerSegmentsWriteRoutes,
} from "./routes/segments.js";
```

Inside `createServer`, after the existing `registerPromptsReadRoutes(server, ...)` call (around line 65), add:

```typescript
await registerSegmentsReadRoutes(server, { repoRoot: options.repoRoot });
```

Inside the existing `wrapRouterWritable` block (lines 67-80), after the existing `registerPromptsWriteRoutes(writableRouter, ...)` call, add:

```typescript
await registerSegmentsWriteRoutes(writableRouter, {
  repoRoot: options.repoRoot,
});
```

**Shared-file overlap with ticket 009**: ticket 009 (manuscript routes) also adds a pair of register calls inside `createServer` — segments routes' register calls land first (Read + Write), manuscript routes' follow. Both edits are additive `await register*Routes(...)` lines at sibling positions in `createServer`; conflicts are mechanical (different lines, no semantic overlap).

### 3. Create test/server/segments-routes.test.ts

Cover the five route behaviors above per the existing `test/server/records.test.ts` and `test/server/prompts-routes.test.ts` patterns. Use the existing in-process Fastify server fixture (likely from `test/server/http.test.ts` or similar); assert response shape + status codes + filesystem state after each call. Subcases:

- POST save: empty `segments/` → 201 + new SEG-1 + segment_order updated + manuscript.md compiled (when `compile_on_segment_save: true`)
- GET list: empty segments/ → 200 + `{ segments: [] }`; one segment present → 200 + 1 entry
- GET single: existing SEG-1 → 200 + body + sidecar; missing SEG-99 → 404
- PUT edit: existing SEG-1 → 200 + updated sidecar with refreshed `updated_at`/`word_count`; id + created_at preserved
- DELETE hybrid (3 cases): unreferenced → 200 + `outcome: "hard_deleted"`; referenced via `caused_by_segment` → 200 + `outcome: "segment_order_removed_files_preserved"` + referrer list; `?force=true` on referenced → 200 + `outcome: "force_deleted"` + warning + referrer list

## Files to Touch

- `tools/manual-story-studio/src/server/routes/segments.ts` (new)
- `tools/manual-story-studio/test/server/segments-routes.test.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify — register new routes; shared-file overlap with ticket 009)

## Out of Scope

- Manuscript routes (covered by ticket 009; the http.ts shared-file overlap is mechanical)
- Prompts route extension for `linked_segments` (covered by ticket 010)
- Frontend wiring (covered by ticket 011 — PasteProse page consumes these routes)
- The write-scope guard logic itself (existing SPEC-100 surface; this ticket only registers new routes inside the existing guard)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/segments-routes.test.js"` — segments-routes tests pass
2. `cd tools/manual-story-studio && npm test` — full suite green; existing routes (manual-stories, records, metadata, prompts) unaffected

### Invariants

1. All POST/PUT/DELETE handlers register inside `wrapRouterWritable` (SPEC-100 write-scope guard preserved); GET handlers register outside it.
2. Routes return typed responses matching the contracts produced by `archive/tickets/SPEC103PROPASSEG-004.md` (save/edit/delete return shapes) / 005 (checklist payload) / 007 (list + read return shapes); no field renames or extra fields beyond what those tickets define.
3. `http.ts` modification is purely additive (no existing register call is removed or renamed); the order of register calls is preserved (segments before any subsequent register calls added by future tickets).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/segments-routes.test.ts` (new) — five route behaviors covered per the existing routes-test pattern; DELETE hybrid covers all three sub-cases.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/segments-routes.test.js"` — targeted segments-routes test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes new test under chained `node --test "dist/test/**/*.test.js"`)
