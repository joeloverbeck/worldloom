# SPEC87STOEXPBAC-007: HTTP server + base routes

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/src/server/http.ts` + `src/cli.ts` wiring + `src/server/routes/health.ts` + `worlds.ts` + `stories.ts`.
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md, SPEC87STOEXPBAC-002, SPEC87STOEXPBAC-004

## Problem

SPEC-87 §5 specifies the read-only HTTP API surface that the SPEC-88 frontend consumes. The server bootstrap must wrap its router with the Layer 2 read-only guard (ticket 002) at startup before any route file registers handlers, then mount the base routes: `GET /api/health` (process-level liveness), `GET /api/worlds` + `GET /api/worlds/:slug` (World Picker), `GET /api/worlds/:slug/stories` + `GET /api/worlds/:slug/stories/:storySlug` (Story Picker). The CLI from ticket 001's stub gets wired to actually start the server when invoked, listening on the default port 5174 (per SPEC-87 §IMPLEMENTATION-ORDER open decision 1).

## Assumption Reassessment (2026-05-25)

1. Tickets 001-004 have created the package skeleton, the read-only guard, the IndexStatus view-model, and the World/Story enumeration view-models. This ticket consumes all four: `cli.ts` from 001 (stub gets wired), `wrapRouterReadOnly` from 002, `resolveIndexStatus` from 003, `enumerateWorlds`/`enumerateStories` from 004. The HTTP server framework is Fastify (per IMPLEMENTATION-ORDER Named Assumption C — implementer's choice between Fastify and Node `http`; this ticket commits to Fastify for the type-safety + plugin ecosystem; substituting is a single-file change in `http.ts`).
2. SPEC-87 §5 specifies the response envelope: `_envelope` object with `requestId`, `serverVersion`, and `worldIndexStatus` on every response. This ticket's base routes implement the envelope wrapper as a Fastify pre-serialization hook (or equivalent) so every response carries the envelope without per-route boilerplate.
3. Cross-skill boundary: the HTTP API surface contract is the shared boundary under audit between this ticket and SPEC-88 / SPEC-89 / SPEC-90's frontend code. The route paths, response shapes, and envelope structure are the contract; SPEC-88's API client (`web/src/api/client.ts` per SPEC-88 §3) is the consumer. Deviation would silently break the frontend. The base routes implemented here (health/worlds/stories) match the SPEC-87 §5 table rows exactly; the contract is the route path + the WorldSummary[] / StorySummary[] return shape.

## Architecture Check

1. The HTTP server is intentionally minimal: a Fastify instance, the readonly-guard wrap applied at construction, the envelope pre-serialization hook, three route files mounted. Route bodies are thin — they call read primitives from tickets 003/004 and return the result wrapped in the envelope. Centralizing the envelope as a hook avoids per-route duplication and ensures every response carries `worldIndexStatus` (the frontend's universal staleness surface).
2. No backwards-compatibility shims; the HTTP server is wholly new.

## Verification Layers

1. Server bootstrap with read-only guard → vitest test (asserts the constructed server has the wrap applied; a test that tries to register a POST handler post-construction throws per ticket 002's guard contract)
2. Envelope structure correct on every response → vitest test (issues GET /api/health, asserts response includes `_envelope.requestId`, `_envelope.serverVersion`, `_envelope.worldIndexStatus`)
3. Base routes return correct shapes → vitest test (issues GET /api/worlds → asserts WorldSummary[] shape per SPEC-87 §4; issues GET /api/worlds/<slug>/stories → asserts StorySummary[] shape)
4. Cross-skill HTTP API surface contract → codebase grep-proof (route paths registered in `http.ts` + `routes/*.ts` match SPEC-87 §5 table rows exactly — `grep -E "(GET .*\\/api\\/.*)" tools/story-explorer/src/server/` enumerates the route registrations)

## What to Change

### 1. Implement HTTP server bootstrap

- `tools/story-explorer/src/server/http.ts` — exports `createServer(opts: { port: number; repoRoot: string }): FastifyInstance`. Constructs a Fastify instance, applies `wrapRouterReadOnly` from ticket 002, registers the envelope pre-serialization hook (computes `requestId` per request, reads `serverVersion` from `package.json`, calls `resolveIndexStatus` from ticket 003 for the world the request targets when applicable), then mounts the three base route modules. Returns the unstarted instance for the CLI to `listen()`.

### 2. Wire CLI to start server

- `tools/story-explorer/src/cli.ts` — replaces the ticket-001 stub with full CLI: parses args (`--port <n>` default 5174, `--repo-root <path>` default detected via `repo-root.ts` from ticket 003), constructs the server via `createServer`, calls `server.listen({ port })`, prints a startup banner. Handles SIGTERM/SIGINT cleanly.

### 3. Implement base routes

- `tools/story-explorer/src/server/routes/health.ts` — exports `registerHealthRoute(server)`. Mounts `GET /api/health` returning `{ ok: true, version: <serverVersion> }`. No world dependency.
- `tools/story-explorer/src/server/routes/worlds.ts` — exports `registerWorldsRoutes(server)`. Mounts `GET /api/worlds` (returns `WorldSummary[]` via `enumerateWorlds()`) and `GET /api/worlds/:slug` (returns `WorldSummary` with extended diagnostics; 404 envelope when slug doesn't resolve to a directory under `worlds/`).
- `tools/story-explorer/src/server/routes/stories.ts` — exports `registerStoriesRoutes(server)`. Mounts `GET /api/worlds/:slug/stories` (returns `StorySummary[]` via `enumerateStories(slug)`) and `GET /api/worlds/:slug/stories/:storySlug` (returns extended `StorySummary`).

### 4. Tests

- `tools/story-explorer/test/server-base.test.ts` — bootstrap test (read-only guard applied; envelope hook fires); per-route smoke tests (health returns ok; worlds returns array; stories returns array).

## Files to Touch

- `tools/story-explorer/src/server/http.ts` (new)
- `tools/story-explorer/src/cli.ts` (modify — replaces the ticket-001 stub)
- `tools/story-explorer/src/server/routes/health.ts` (new)
- `tools/story-explorer/src/server/routes/worlds.ts` (new)
- `tools/story-explorer/src/server/routes/stories.ts` (new)
- `tools/story-explorer/test/server-base.test.ts` (new)

## Out of Scope

- Page/record/prose/provenance routes (ticket 008)
- Search/branch-map sketch routes (ticket 009)
- Capstone smoke test (ticket 010)
- Frontend client code consuming the API (SPEC-88)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test -- server-base` — server bootstrap + base routes pass.
2. `node tools/story-explorer/dist/src/cli.js --port 5174` starts the server and responds to `GET /api/health` with `{ ok: true, version: <version> }` wrapped in the envelope.
3. The Layer 2 read-only guard is applied at server construction (attempting to register a POST handler post-construction throws per ticket 002's guard contract).

### Invariants

1. Every HTTP response MUST include the `_envelope` object with `requestId`, `serverVersion`, and `worldIndexStatus` (when applicable to the route's world scope).
2. The HTTP server MUST NOT register any non-GET handlers (Layer 2 fence enforced at bootstrap).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/server-base.test.ts` — bootstrap + base route smoke tests.

### Commands

1. `cd tools/story-explorer && npm test -- server-base` (targeted)
2. `cd tools/story-explorer && npm test` (full-pipeline)
