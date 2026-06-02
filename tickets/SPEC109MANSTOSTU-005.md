# SPEC109MANSTOSTU-005: Backend routes + frontend API wrapper + route tests

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `src/server/routes/current-context.ts`, `web/src/api/current-context.ts`, `test/current-context/routes-current-context.test.ts`; modifies `src/server/http.ts` to wire the read + write registration functions in their proper scopes.
**Deps**: archive/tickets/SPEC109MANSTOSTU-002.md, archive/tickets/SPEC109MANSTOSTU-003.md, archive/tickets/SPEC109MANSTOSTU-004.md

## Problem

The Edit Current Context page (010), Mark-state-reviewed button (011), Dashboard CurrentStatePanel (008), and MomentComposer seeding (009) all consume the current-context surface through HTTP. They need a GET route returning the parsed payload (or `null` for absent) and a PUT route accepting a full body with validation + write integration. The frontend API wrapper provides the typed fetch surface those UI tickets consume. This ticket lands the route file (split into read + write registration functions per the existing `routes/metadata.ts` / `routes/prompts.ts` pattern), the http.ts wiring, the API wrapper, and a route-integration test file (inferred from SPEC-109 §Approach + AC #4 + #5).

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/src/server/http.ts:7-36` shows the canonical pattern — every routes file exports a `registerXxxReadRoute(s)` + `registerXxxWriteRoute(s)` pair; reads mount outside `wrapRouterWritable`, writes inside. `tools/manual-story-studio/web/src/api/` already hosts `records.ts`, `prompts.ts`, `segments.ts`, etc., each as a thin typed fetch wrapper. No `current-context.ts` exists in either location today (verified via spot-check); no name collision.
2. **Spec**: SPEC-109 §2 item 6 (rewritten per `/reassess-spec`) declares the route file exports `registerCurrentContextReadRoute` + `registerCurrentContextWriteRoute`. GET semantics: returns parsed `CurrentContext` or `null` if absent; `409` if corrupted (health-integrated). PUT semantics: accepts full body, runs `validateCurrentContext` (003), returns `422` on validation failure with structured findings, otherwise calls `writeCurrentContext` (004) and returns `200`. The inferred `routes-current-context.test.ts` is attributed to SPEC-109 §Approach §2 item 6 + AC #4 ("PUT with valid body writes the file and returns 200") + AC #5 ("PUT with invalid POV holder returns 422") per §Step 3 Inferred deliverable rule — the AC names route-level behavior but the spec's §4 Files-to-touch named test list does not allocate a dedicated route test file.
3. **Cross-skill boundary**: SPEC-100's package fence is the load-bearing invariant — the route file must NOT import `@worldloom/patch-engine` or `@worldloom/world-mcp`, and all writes route through `safeWriteFile` via 004. The PUT handler's validation step calls 003's `validateCurrentContext` with `KnownIds` + `metadata.segment_order` it constructs at request time (via `listAllKnownIds` + `readManualStoryMetadata`).
4. **FOUNDATIONS Rule 6 (preserves SPEC-100 fence)**: the new HTTP routes mediate `current-context.yaml` reads and writes only. They introduce no canon-pipeline surface — no patch-engine dependency, no world-mcp dependency, no `_source/` read or write — and remain inside the SPEC-100 realpath sandbox. Per the §Write-enabled-but-canon-fenced package carve-out at `references/foundations-alignment.md` §4.4, this ticket does NOT trigger Canon-Pipeline Impact Rule scrutiny.

## Architecture Check

1. The read + write registration-function split mirrors every other routes file in the package; `http.ts` wires read outside `wrapRouterWritable` and write inside, preserving the established write-scope-guard discipline (`tools/manual-story-studio/src/server/write-scope-guard.ts`).
2. The PUT handler's validate-then-write order (read metadata → list known IDs → validate → write) keeps invalid payloads from ever reaching the writer; the writer trusts validated input per its declared contract (004 §Out of Scope).
3. The frontend API wrapper is a thin typed fetch — no client-side caching, no retry logic; matches the existing `web/src/api/*.ts` shape.

## Verification Layers

1. GET 200 with valid file → route test asserts payload equality.
2. GET 200 with absent file → route test asserts `null` body.
3. GET 409 with corrupted file → route test asserts status code + finding code.
4. PUT 200 with valid body → route test asserts status + file write occurred.
5. PUT 422 with invalid POV holder → route test asserts status + structured `current-context-pov-not-in-cast` finding.
6. PUT 422 with unknown record ID in `pinned_records` → route test asserts status + structured `current-context-reference-broken` finding.
7. Frontend API wrapper compiles under `tsc --noEmit` (web) → `cd tools/manual-story-studio/web && npm test`.

## What to Change

### 1. New routes file at `src/server/routes/current-context.ts`

Export `registerCurrentContextReadRoute(server, {repoRoot})` (mounts `GET /api/worlds/:world/manual-stories/:story/current-context`) and `registerCurrentContextWriteRoute(server, {repoRoot})` (mounts `PUT /api/worlds/:world/manual-stories/:story/current-context`). The PUT handler:
- Resolves the manual-story root via the existing sandbox utility.
- Reads metadata (via `readManualStoryMetadata`) to obtain `segment_order`.
- Builds `KnownIds` via `listAllKnownIds(manualStoryRoot)`.
- Validates the body via `validateCurrentContext(body, knownIds, metadata.value.segment_order)` (from 003).
- On validation failure: returns `422` with `{error: "validation_failed", findings: <ValidationError[]>}`.
- On validation success: calls `writeCurrentContext(manualStoryRoot, body)` (from 004) and returns `200` with the written payload.
- Sandbox / I/O failures from `writeCurrentContext` propagate as Fastify 500s with structured error payloads (matches existing route-error discipline).

The GET handler:
- Resolves the manual-story root.
- Calls `readCurrentContext(manualStoryRoot)` (from 002).
- `{ok: true, value: null}` → `200` with body `null`.
- `{ok: true, value: <ctx>}` → `200` with body `<ctx>`.
- `{ok: false, error: <ReadError>}` → `409` with `{error: "<error.code>", message: <error.message>, path: <error.path>}`.

### 2. Wire the new registrations in `src/server/http.ts`

Add the two `register` calls — read alongside the other `registerXxxReadRoute` lines outside `wrapRouterWritable`; write alongside the other `registerXxxWriteRoute` lines inside `wrapRouterWritable`.

### 3. New frontend API wrapper at `web/src/api/current-context.ts`

Export typed `fetchCurrentContext(worldSlug, msSlug): Promise<CurrentContext | null>` and `saveCurrentContext(worldSlug, msSlug, ctx: CurrentContext): Promise<SaveResult>` where `SaveResult = { ok: true } | { ok: false; findings: ValidationError[] }`. Use the same `loadErrorMessage` / `fetch` conventions as `web/src/api/records.ts`.

### 4. New route-integration test at `test/current-context/routes-current-context.test.ts`

Hybrid test using `tools/manual-story-studio`'s in-process Fastify server pattern (see existing `test/server/*.test.ts` for the harness shape). Covers all 6 cases in Verification Layers above against a fixture story root built per `tools/manual-story-studio/test/current-context/fixtures/`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/current-context.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify)
- `tools/manual-story-studio/web/src/api/current-context.ts` (new)
- `tools/manual-story-studio/test/current-context/routes-current-context.test.ts` (new)

## Out of Scope

- Schema definition / read function / validate function / write function — owned by 001-004.
- Health-pass integration — owned by 006.
- Composer plumbing — owned by 007.
- UI consumers (Dashboard, MomentComposer, EditCurrentContext, StateUpdateChecklist) — owned by 008-011.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run test:backend` passes.
2. `cd tools/manual-story-studio/web && npm test` passes (frontend API wrapper compiles).
3. AC #4 (PUT with valid body returns 200, file written).
4. AC #5 (PUT with invalid POV returns 422 with the matching finding).
5. GET 200 / 200-with-null / 409 paths each assert the expected status + body.

### Invariants

1. SPEC-100 fence preserved: the route file imports only from siblings inside `@worldloom/manual-story-studio`; no patch-engine / world-mcp dependency.
2. Read route mounts outside `wrapRouterWritable`; write route mounts inside.
3. Validate runs before write at the route handler; the writer never sees invalid input.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/current-context/routes-current-context.test.ts` — covers GET 200/null/409 + PUT 200/422 cases via in-process Fastify server.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio/web && npm test`
3. `cd tools/manual-story-studio && npm test`
