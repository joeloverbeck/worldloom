# SPEC115MANSTOSTU-002: GET-only world-source routes + read-only guarantee

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new route module `tools/manual-story-studio/src/server/routes/world-source.ts` (GET-only) + registration in `src/server/http.ts`. No new write surface.
**Deps**: archive/tickets/SPEC115MANSTOSTU-001.md

## Problem

The manual-story-studio server registers no route for browsing world source. Expose the `archive/tickets/SPEC115MANSTOSTU-001.md` reader over GET-only HTTP routes for listing/reading world source material, registered outside any writable scope, with world paths resolved from a validated slug and no request-body value able to cause a read outside the resolved world root.

## Assumption Reassessment (2026-06-02)

1. `src/server/http.ts` registers read routes directly on `server` (e.g. `registerWorldsRoutes(server, { repoRoot })` at line 78) and wraps write routes in `wrapRouterWritable` (line 89+). The new world-source read route registers on `server` (outside the writable wrapper), matching the existing read-route pattern. `src/server/routes/worlds.ts` exports `registerWorldsRoutes(server, { repoRoot })` — the new `routes/world-source.ts` follows the same `register*(server, { repoRoot })` signature.
2. Spec §2 item 4 + §4 (`specs/SPEC-115-manual-story-studio-world-source-browser.md`): GET-only routes outside the writable scope; world paths resolved from a validated world slug, never a raw filesystem path in a request body (SPEC-116 containment discipline applied on the read side).
3. Shared boundary under audit: the route write-scope guard `wrapRouterWritable` in `src/server/write-scope-guard.ts` (throws `write-scope fence violation` when a write method is registered outside the writable scope). The readonly test reuses this to assert the world-source routes register only GET. The route consumes `archive/tickets/SPEC115MANSTOSTU-001.md`'s `ReadResult`-returning reader.
4. FOUNDATIONS §Canonical Storage Layer / Hook 3 write discipline: the routes are strictly read-only (GET only); they add no write path to `_source/`, characters, or diegetic-artifacts. The existing write-sandbox denylist remains the write authority; these routes live outside the writable scope.
5. Canon Safety / read-side containment (SPEC-116 precedent): SPEC-116 fixed an arbitrary-file-read where a request-body path (`included_template_path` / `selected_template: "../../../_source/canon/CF-1"`) traversed into `_source/`. These routes deliberately read `_source/` — so every request-body value (the world slug AND any per-item selector for on-demand raw text) MUST be validated/contained: the slug resolved via `enumerateWorlds`; any item selector resolved to a path provably under the resolved world root; absolute paths and `..` traversal rejected with a structured 400. No raw filesystem path is accepted in any request body. This does not weaken any Mystery Reserve firewall — the route only reads literal text and writes nothing.

## Architecture Check

1. Registering on `server` (not inside `wrapRouterWritable`) is the existing read-route convention; the write-scope guard then structurally guarantees no write method can be added to this surface (it throws at registration time). Containment-by-slug + selector-validation reuses the SPEC-116 lesson rather than inventing a new path-handling scheme.
2. No backwards-compatibility shim: new route module; `http.ts` gains one additive registration call.

## Verification Layers

1. Routes are GET-only / no write method registered -> `test/server/world-source-readonly.test.ts` using the `wrapRouterWritable` guard (codebase test).
2. No request-body value reads outside the resolved world root (absolute / `..` rejected) -> readonly test with adversarial selectors (incl. a `_source/`-traversal attempt à la SPEC-116).
3. Read-only fence preserved (no canon write surface) -> grep-proof: no write-route registration, no patch-engine / world-mcp import in the route module.

## What to Change

### 1. New route module `src/server/routes/world-source.ts`

- Export `registerWorldSourceReadRoutes(server, { repoRoot })` (name at implementer discretion; `register*(server, { repoRoot })` shape).
- GET endpoints to (a) list/enumerate a world's source items (summaries + metadata) and (b) fetch on-demand raw text for a single item. Both resolve the world via `enumerateWorlds` (`archive/tickets/SPEC115MANSTOSTU-001.md`) and reject any selector that escapes the world root.
- Structured 400 on an invalid slug / absolute path / `..` traversal; structured error surfaced for unparseable items (from the reader).

### 2. Register in `src/server/http.ts`

- Import `registerWorldSourceReadRoutes`; `await` it on `server` alongside the other read-route registrations (outside `wrapRouterWritable`).

### 3. Readonly test `test/server/world-source-readonly.test.ts`

- Assert the world-source routes register only GET (reuse `wrapRouterWritable`: a write method on this surface throws). Assert no request-body value reads outside the resolved world root: an absolute path, a `..` traversal, and a `_source/`-reaching selector are all rejected; slug-resolved reads succeed.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/world-source.ts` (new)
- `tools/manual-story-studio/test/server/world-source-readonly.test.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify — register the read route; under-enumerated in spec §4 but required as the registration seam, mirroring `registerWorldsRoutes` at line 78)

## Out of Scope

- The reader logic (`archive/tickets/SPEC115MANSTOSTU-001.md`), frontend (SPEC115MANSTOSTU-003).
- Any write/edit/copy-to-world route; any non-GET method on this surface.
- A server-side search index (filtering is client-side in SPEC115MANSTOSTU-003, mirroring SPEC-112's no-index decision per spec §2 item 2).

## Acceptance Criteria

### Tests That Must Pass

1. The world-source routes are GET-only and registered outside the writable scope; registering a write method on this surface throws via the write-scope guard. (spec AC4)
2. No request-body value reads outside the resolved world root — absolute paths and `..` traversal are rejected (incl. a `_source/`-reaching selector). (spec AC4)
3. `cd tools/manual-story-studio && npm run test:backend` is green.

### Invariants

1. No write path to world canon exists anywhere in this route surface.
2. Every world/item read resolves from a validated slug + contained selector — never a raw request-body path.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/world-source-readonly.test.ts` — GET-only assertion + request-body containment (absolute / `..` / `_source/`-traversal rejection).

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm run build`

## Outcome

Completed on 2026-06-02.

Added `tools/manual-story-studio/src/server/routes/world-source.ts` and registered it from `tools/manual-story-studio/src/server/http.ts` alongside the existing read routes, outside `wrapRouterWritable`. The route surface is GET-only:

1. `GET /api/worlds/:worldSlug/source` returns world-source item summaries without `raw_text`.
2. `GET /api/worlds/:worldSlug/source/item?path=<relative item path>` returns one raw source item.

Both endpoints validate the world slug before filesystem lookup and resolve world content through the archived `readWorldSource` reader. The item endpoint rejects missing paths, absolute paths, backslash traversal, and any raw `..` path segment before matching the selector against enumerated in-world source items. No request body is consumed and no write route or copy-to-world path was added.

Added `tools/manual-story-studio/test/server/world-source-readonly.test.ts` covering GET-only registration via the write-scope guard, list summaries, raw item reads, absolute/traversal selector rejection, and invalid slug rejection.

## Verification Result

1. PASS: `cd tools/manual-story-studio && npm run build:backend` — TypeScript backend compile succeeded.
2. PASS: `cd tools/manual-story-studio && node --test dist/test/server/world-source-readonly.test.js` — focused route suite passed 5/5 tests.
3. PASS: `cd tools/manual-story-studio && npm run test:backend` — backend/static suite passed 84/84 compiled tests, including the new route test.
4. PASS: `cd tools/manual-story-studio && npm run build` — web install/build, Vite production build, and backend compile all succeeded.

## Deviations

1. The list endpoint intentionally omits `raw_text` and the item endpoint returns raw text on demand. This implements the ticket's "summaries + on-demand raw text" route contract and avoids eager raw-text loading for the frontend.
2. Slash-bearing traversal such as `/api/worlds/../test-world/source` is rejected by Fastify routing before this handler runs; the route-level invalid-slug test uses a malformed single segment (`Bad%20Slug`) to prove handler validation.
