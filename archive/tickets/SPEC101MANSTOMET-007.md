# SPEC101MANSTOMET-007: Backend CRUD routes + http.ts wiring

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/server/routes/records.ts` + `metadata.ts`; modifies `src/server/http.ts` to register them.
**Deps**: SPEC101MANSTOMET-005, SPEC101MANSTOMET-006

## Problem

The frontend (Dashboard, Records, Cast & Profiles pages — SPEC101MANSTOMET-008/009/010) and any future external client need a stable HTTP API surface to read and write Manual Studio records + metadata. SPEC-101 §2.6 enumerates the seven required endpoints (5 record routes + 2 metadata routes). The write routes must register under `wrapRouterWritable` (the SPEC-100 fence that gates the writable router behind the `?write=true` query flag verified in SPEC-100's capstone) so reads stay open for browsing while writes require explicit opt-in. The routes are the plumbing seam between the typed read/write modules and the JSON-over-HTTP boundary; their job is request parsing, validator-error-to-HTTP-status mapping, and response shaping — no business logic.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/server/http.ts` exists and uses `wrapRouterWritable` (verified at `tools/manual-story-studio/src/server/http.ts:12` import + `:52` call). The existing pattern registers read routes outside the wrapper and write routes inside (per the SPEC-100 capstone). `src/server/routes/manual-stories.ts` already follows the `registerManualStoriesGetRoute` / `registerManualStoriesWriteRoutes` pattern (verified via earlier grep). This ticket adds two new route modules (`records.ts`, `metadata.ts`) following the same pattern, and adds two registration calls to `http.ts`.
2. SPEC-101 §2.6 names every endpoint:
   - `GET /api/worlds/:slug/manual-stories/:msSlug/records?class=<class>`
   - `GET /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id`
   - `POST /api/worlds/:slug/manual-stories/:msSlug/records/:class`
   - `PUT /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id`
   - `DELETE /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id`
   - `GET /api/worlds/:slug/manual-stories/:msSlug/metadata`
   - `PUT /api/worlds/:slug/manual-stories/:msSlug/metadata`
   The DELETE endpoint accepts `?force=true` query OR a confirmation body flag (per SPEC-101 §2.6's parenthetical: *"`?force=true` for force-delete with confirmation flag in request body"*).
3. Cross-artifact boundary under audit: `wrapRouterWritable` from SPEC-100's `src/server/write-scope-guard.ts`. The route module passes the writable-router to its `register*WriteRoutes(writableRouter)` function exactly as `registerManualStoriesWriteRoutes` does. The route boundary's job is HTTP plumbing only; business logic lives in `src/read/records.ts` / `src/read/manual-story-metadata.ts` (SPEC101MANSTOMET-005) and `src/write/records.ts` / `src/write/manual-story-metadata.ts` (SPEC101MANSTOMET-006).

## Architecture Check

1. Two route modules (records + metadata) mirrors the read/write module split (SPEC101MANSTOMET-005/006). Each route module exposes two `register*` functions — one for GET routes (registered outside `wrapRouterWritable`), one for write routes (registered inside). The pattern matches the established `registerManualStoriesGetRoute` / `registerManualStoriesWriteRoutes` shape from SPEC-100, keeping the http.ts wiring uniform.
2. No backwards-compatibility shims. The existing routes from SPEC-100 (`worlds`, `manual-stories` enumeration + create) are untouched; the new routes occupy a disjoint URL space (`.../records/...` and `.../metadata`).

## Verification Layers

1. Every SPEC-101 §2.6 endpoint registered → codebase grep-proof (one grep per route path).
2. Write routes registered inside `wrapRouterWritable` only — read routes registered outside → manual review of `http.ts` registration order.
3. Validator errors (schema, refs) map to HTTP 400 with structured error body; missing-record reads map to 404; sandbox rejection maps to 400 or 403 → smoke tests.
4. Hybrid-delete outcomes (hard_deleted / inactive_default / force_deleted) round-trip through the DELETE route with correct status codes and response-body shapes → smoke tests covering all three SPEC101MANSTOMET-006 outcomes.

## What to Change

### 1. Create `tools/manual-story-studio/src/server/routes/records.ts`

Module exports:

- **`registerRecordsReadRoutes(server, { repoRoot }): Promise<void>`** registers:
  - `GET /api/worlds/:slug/manual-stories/:msSlug/records?class=<class>` — resolves manual-story root, calls `listRecords` (SPEC101MANSTOMET-005); response: `{ records: ManualRecordSummary[] }`.
  - `GET /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — calls `readRecord`; response: `{ record: ManualRecord }` or 404 `{ error: "not_found" }`.

- **`registerRecordsWriteRoutes(writableRouter, { repoRoot }): Promise<void>`** registers:
  - `POST /api/worlds/:slug/manual-stories/:msSlug/records/:class` — body: `{ record: Omit<ManualRecord, "id">, overrideBrokenRefs?: boolean }`; calls `createRecord` (SPEC101MANSTOMET-006); response: 200 `{ id, record }` on success; 400 `{ error: "validation_failed", errors }` on schema failure; 400 `{ error: "broken_refs", violations, needsOverride: true }` on refs failure when no override.
  - `PUT /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — body: `{ record: ManualRecord, overrideBrokenRefs?: boolean }`; calls `updateRecord`; same error shape; 404 if record missing.
  - `DELETE /api/worlds/:slug/manual-stories/:msSlug/records/:class/:id` — accepts `?force=true` query OR `{ confirm: true }` body flag; calls `deleteRecord` (SPEC101MANSTOMET-006); response: 200 with `{ outcome, ... }` payload — `hard_deleted` / `inactive_default` (referrer list included) / `force_deleted` (audit entry included).

### 2. Create `tools/manual-story-studio/src/server/routes/metadata.ts`

Module exports:

- **`registerMetadataReadRoute(server, { repoRoot }): Promise<void>`** registers:
  - `GET /api/worlds/:slug/manual-stories/:msSlug/metadata` — calls `readManualStoryMetadata`; response: `{ metadata: ManualStoryMetadata }` or 404 `{ error: "not_found" }`.

- **`registerMetadataWriteRoute(writableRouter, { repoRoot }): Promise<void>`** registers:
  - `PUT /api/worlds/:slug/manual-stories/:msSlug/metadata` — body: `{ metadata: ManualStoryMetadata }`; calls `updateManualStoryMetadata` (SPEC101MANSTOMET-006); response: 200 `{ ok: true }` on success; 400 `{ error: "validation_failed", errors }` on schema failure.

### 3. Modify `tools/manual-story-studio/src/server/http.ts`

Add two `register*ReadRoute*` calls outside `wrapRouterWritable` (after the existing `registerManualStoriesGetRoute`), and two `register*WriteRoutes` calls inside `wrapRouterWritable` (after the existing `registerManualStoriesWriteRoutes`):

```typescript
// Read routes — outside writable wrapper
await registerRecordsReadRoutes(server, { repoRoot: options.repoRoot });
await registerMetadataReadRoute(server, { repoRoot: options.repoRoot });

await wrapRouterWritable(server, async (writableRouter) => {
  await registerManualStoriesWriteRoutes(writableRouter, { repoRoot: options.repoRoot });
  // New write routes
  await registerRecordsWriteRoutes(writableRouter, { repoRoot: options.repoRoot });
  await registerMetadataWriteRoute(writableRouter, { repoRoot: options.repoRoot });
});
```

Add corresponding imports at the top of `http.ts`.

### 4. Path resolution

Each route resolves the manual-story root from `:slug` (world) + `:msSlug` (manual-story) using `<repoRoot>/worlds/<slug>/manual-stories/<msSlug>/`. Each route validates the resolved path exists; missing world OR missing manual story → 404 `{ error: "not_found" }`.

### 5. Error shape contract

All validation / sandbox / not-found errors use a consistent response body shape: `{ error: <string>, details?: <object> }`. The frontend (SPEC101MANSTOMET-008) consumes these for surfacing.

### 6. Tests

Create `tools/manual-story-studio/test/server/records.test.ts` covering:

- Each route's happy path (smoke test the registration + invocation against a fixture manual-story).
- POST with schema-fail body → 400 `validation_failed`.
- POST with refs-fail body (no override) → 400 `broken_refs` with `needsOverride: true`.
- POST with refs-fail body + `overrideBrokenRefs: true` → 200.
- DELETE without force on unreferenced record → 200 `hard_deleted`.
- DELETE without force on referenced record → 200 `inactive_default` with referrers.
- DELETE with `?force=true` on referenced record → 200 `force_deleted` with audit.
- GET on missing record → 404.

Create `tools/manual-story-studio/test/server/metadata.test.ts` covering:

- GET / PUT happy paths.
- PUT with invalid enum value → 400 `validation_failed`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/records.ts` (new)
- `tools/manual-story-studio/src/server/routes/metadata.ts` (new)
- `tools/manual-story-studio/test/server/records.test.ts` (new)
- `tools/manual-story-studio/test/server/metadata.test.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify)

## Out of Scope

- Frontend API client + components — SPEC101MANSTOMET-008.
- Validation / write-side business logic — SPEC101MANSTOMET-006 (the routes call into it, do not duplicate it).
- Authentication / authorization — Manual Studio is single-server, single-user; no auth scope per SPEC-100.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` passes including new `test/server/records.test.ts` + `test/server/metadata.test.ts`; SPEC-100 capstone test still passes (the http.ts modification preserves all existing route registrations).
2. `cd tools/manual-story-studio && npm run build:backend` succeeds.
3. `grep -c "register" tools/manual-story-studio/src/server/http.ts` returns ≥ 6 (existing 3: registerStaticServe + registerWorldsRoutes + registerManualStoriesGetRoute + registerManualStoriesWriteRoutes; new 2: registerRecordsRead/Write + registerMetadataRead/Write = 4 new for total 7 register calls).

### Invariants

1. Read routes registered OUTSIDE `wrapRouterWritable`; write routes registered INSIDE — invariant against accidental read-as-write or write-without-guard.
2. Every validator-error code path returns a structured `{ error, details? }` body — invariant for frontend error-handling.
3. SPEC-100's existing `registerManualStoriesGetRoute` and `registerManualStoriesWriteRoutes` calls remain present and unchanged in http.ts (the modification is ADDITIVE, not a rewrite).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/records.test.ts` — per-endpoint smoke tests + validation-failure + hybrid-delete outcome tests.
2. `tools/manual-story-studio/test/server/metadata.test.ts` — GET/PUT smoke + validation-failure tests.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `cd tools/manual-story-studio && node --test "dist/test/server/**/*.test.js"` (after `npm run build:backend`) — server-layer suite in isolation.
