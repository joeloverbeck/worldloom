# SPEC100MANSTOSTU-007: Manual-stories routes — GET list + POST create (sandbox-gated)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/server/routes/manual-stories.ts` and modifies `src/server/http.ts` (created by ticket 006) to register the new routes inside the existing `wrapRouterWritable` block.
**Deps**: SPEC100MANSTOSTU-003, SPEC100MANSTOSTU-005, SPEC100MANSTOSTU-006

## Problem

SPEC-100 §2 in-scope item 6 + acceptance criterion #2 require two routes for the manual-story list/create flow: `GET /api/worlds/:slug/manual-stories` returns the list of manual stories for a given world (uses ticket 005's `enumerateManualStories`), and `POST /api/worlds/:slug/manual-stories` creates a new manual story directory containing an empty (or minimal) `manual-story.yaml` (uses ticket 003's `resolveManualStoryRoot` + `assertInsideSandbox`, registered inside ticket 006's `wrapRouterWritable` block). The POST handler is the first **write** route in the system; it exercises both the route-level fence (ticket 002) AND the filesystem-level sandbox (ticket 003) in a single end-to-end path.

## Assumption Reassessment (2026-05-30)

1. `tools/manual-story-studio/src/server/http.ts` is `(new)` in ticket 006 in this batch; this ticket declares `Deps: SPEC100MANSTOSTU-006` and modifies http.ts to register the new routes inside the existing `wrapRouterWritable(server, async (writableRouter) => { ... })` block. The intra-batch create-then-modify chain is declared explicitly per `spec-to-tickets/SKILL.md` §Intra-batch shared-file create-then-modify chains.
2. Ticket 003's sandbox API (`resolveManualStoryRoot(repoRoot, worldSlug, manualStorySlug)` + `assertInsideSandbox(targetPath, root)`) is consumed by the POST handler: resolve the target manual-story root, build the target `manual-story.yaml` path inside it, assert sandbox containment, then `fs.mkdirSync(root.absolutePath, { recursive: true })` + `fs.writeFileSync(yamlPath, initialContent)`. Ticket 005's `enumerateManualStories(repoRoot, worldSlug)` is consumed by the GET handler. SPEC-100 §4 Files to touch line 75 specifies `src/server/routes/manual-stories.ts` as the route module path.
3. **Cross-skill / cross-artifact boundary**: this ticket is the FIRST place all four upstream surfaces compose end-to-end — Fastify wrapper (ticket 006), write-scope guard (ticket 002, via 006's wrap call), sandbox (ticket 003), read backend (ticket 005). The shared invariant: any POST handler MUST (a) be registered inside `wrapRouterWritable` (else 002's fence throws at boot) AND (b) call `assertInsideSandbox` before any filesystem write (else 003's sandbox provides no defense). Both invariants are enforced at this ticket's POST handler implementation; a future POST route MUST repeat the same pattern.

## Architecture Check

1. **GET registers outside the writable scope; POST inside**: the GET handler is a read; per ticket 002's fence semantics, reads register everywhere. The POST handler is a write; it MUST register inside `wrapRouterWritable` (else the fence throws `write-scope fence violation: POST /api/worlds/:slug/manual-stories` at boot). Mirrors the Story Explorer pattern of reads-everywhere; symmetric polarity, opposite direction.
2. **Sandbox assertion before any FS mutation**: the POST handler builds the target path from logical IDs (`worldSlug`, `manualStorySlug`), calls `resolveManualStoryRoot` + `assertInsideSandbox`, then writes. If a sandbox check throws (denylist hit, symlink escape, `..` traversal), the handler returns 400/403 with the assertion message. No `fs.writeFileSync` ever runs without a prior `assertInsideSandbox` pass.
3. **Idempotency boundary**: if the target manual story already exists (the `manual-story.yaml` is present), the POST returns 409 Conflict rather than overwriting. Mirror the conservative "POST is not blind upsert" discipline.
4. No backwards-compatibility aliasing/shims introduced — manual-stories.ts is new; http.ts modification is purely additive (registering one new route module).

## Verification Layers

1. POST registration outside `wrapRouterWritable` would throw at boot → already proved by ticket 002's tests; this ticket's tests verify the POST handler is INSIDE the wrapper by exercising the route successfully.
2. POST `/api/worlds/:slug/manual-stories` with `{ slug, title }` body creates `worlds/<worldSlug>/manual-stories/<slug>/manual-story.yaml` → integration test using `server.inject` against a temp repo root; asserts (a) response status 201, (b) the file exists on disk, (c) the file contains the title.
3. POST with a slug that fails the sandbox slug-validation regex → integration test asserts 400 response with the validation error.
4. POST with an existing manual-story slug returns 409 Conflict → integration test pre-creates the directory + yaml, asserts 409.
5. GET `/api/worlds/:slug/manual-stories` returns the list with the right shape → integration test against a fixture world with 2 manual stories; asserts response includes both entries.
6. GET against a nonexistent world slug returns 404 (or `{ manualStories: [] }` — see implementation note) → integration test asserts the agreed shape.

## What to Change

### 1. Create `tools/manual-story-studio/src/server/routes/manual-stories.ts`

```typescript
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";
import YAML from "yaml";

import { enumerateManualStories } from "../../read/manual-stories.js";
import { resolveManualStoryRoot, assertInsideSandbox } from "../../write/sandbox.js";

export interface ManualStoriesRouteOptions {
  repoRoot: string;
}

interface CreateManualStoryBody {
  slug?: string;
  title?: string;
}

export async function registerManualStoriesGetRoute(
  server: FastifyInstance,
  options: ManualStoriesRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string } }>("/api/worlds/:slug/manual-stories", async (request) => {
    const manualStories = enumerateManualStories(options.repoRoot, request.params.slug);
    return { manualStories };
  });
}

export async function registerManualStoriesWriteRoutes(
  server: FastifyInstance,
  options: ManualStoriesRouteOptions,
): Promise<void> {
  server.post<{
    Params: { slug: string };
    Body: CreateManualStoryBody;
  }>("/api/worlds/:slug/manual-stories", async (request, reply) => {
    const { slug: worldSlug } = request.params;
    const { slug: manualStorySlug, title } = request.body ?? {};

    if (typeof manualStorySlug !== "string" || typeof title !== "string") {
      return reply.code(400).send({ error: "bad_request", message: "slug and title required" });
    }

    let root;
    try {
      root = resolveManualStoryRoot(options.repoRoot, worldSlug, manualStorySlug);
    } catch (error) {
      return reply.code(400).send({ error: "invalid_slug", message: (error as Error).message });
    }

    try {
      assertInsideSandbox(root.absolutePath, root);
    } catch (error) {
      return reply.code(403).send({ error: "sandbox_violation", message: (error as Error).message });
    }

    const manualStoryYamlPath = path.join(root.absolutePath, "manual-story.yaml");
    if (existsSync(manualStoryYamlPath)) {
      return reply.code(409).send({ error: "already_exists", manualStorySlug });
    }

    mkdirSync(root.absolutePath, { recursive: true });
    const now = new Date().toISOString();
    const initialContent = YAML.stringify({
      schema_version: "manual-story.v1",
      world_slug: worldSlug,
      manual_story_slug: manualStorySlug,
      title,
      created_at: now,
      updated_at: now,
    });
    writeFileSync(manualStoryYamlPath, initialContent);

    return reply.code(201).send({ worldSlug, manualStorySlug, title, absolutePath: root.absolutePath });
  });
}
```

The split into `registerManualStoriesGetRoute` (read) and `registerManualStoriesWriteRoutes` (write) lets `http.ts` register the GET outside `wrapRouterWritable` and the POST inside, preserving the read-vs-write polarity discipline.

### 2. Modify `tools/manual-story-studio/src/server/http.ts` (from ticket 006)

Add the manual-stories route registrations inside the existing structure:

```typescript
import { registerManualStoriesGetRoute, registerManualStoriesWriteRoutes } from "./routes/manual-stories.js";

// ... inside createServer ...

await registerWorldsRoutes(server, { repoRoot: options.repoRoot });
await registerManualStoriesGetRoute(server, { repoRoot: options.repoRoot }); // GET outside the wrapper

await wrapRouterWritable(server, async (writableRouter) => {
  await registerManualStoriesWriteRoutes(writableRouter, { repoRoot: options.repoRoot });
});
```

### 3. Create test at `tools/manual-story-studio/test/server/manual-stories-routes.test.ts`

Use Fastify's `server.inject` + `node:fs` + temp directories. Cases:

1. `POST /api/worlds/<world>/manual-stories` with valid `{ slug, title }` returns 201 + the manual-story is created on disk.
2. `POST` with missing fields returns 400.
3. `POST` with invalid slug (`'Slug With Spaces'`) returns 400 (sandbox slug validation).
4. `POST` to an existing manual-story slug returns 409.
5. `GET /api/worlds/<world>/manual-stories` returns the populated list after POSTs.
6. `GET` against a world that has no `manual-stories/` directory returns `{ manualStories: [] }`.

## Files to Touch

- `tools/manual-story-studio/src/server/routes/manual-stories.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify — register the new routes; `(new)` in ticket 006 this batch, Deps:006 declared)
- `tools/manual-story-studio/test/server/manual-stories-routes.test.ts` (new)

## Out of Scope

- Manual record CRUD (records under `manual-stories/<slug>/records/<class>/`) — SPEC-101 deliverable, not in this spec's scope.
- Prompt composition — SPEC-102 deliverable.
- Segment / manuscript / prose paste flow — SPEC-103 deliverable.
- Beat templates — SPEC-104 deliverable.
- Any modification to the sandbox API (ticket 003) — this ticket consumes the sandbox as-is.
- Any modification to the write-scope guard (ticket 002) — this ticket exercises the guard's `insideScope` discipline through `wrapRouterWritable`.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/manual-stories-routes.test.js"` — all 6 test cases pass.
2. End-to-end POST + filesystem check: `server.inject({ method: 'POST', url: '/api/worlds/test-world/manual-stories', payload: { slug: 'test-story', title: 'Test' } })` → 201, and `fs.existsSync('<repoRoot>/worlds/test-world/manual-stories/test-story/manual-story.yaml')` returns true.
3. `grep -E "wrapRouterWritable" tools/manual-story-studio/src/server/http.ts` shows the POST registration inside the wrapper (visual inspection at line); `grep -E "registerManualStoriesWriteRoutes" tools/manual-story-studio/src/server/http.ts` shows the write-route registrar called inside the wrap callback.

### Invariants

1. The POST handler calls `assertInsideSandbox(targetRealPath, root)` before any `fs.mkdir` / `fs.writeFile`. (Architectural invariant — the sandbox is the load-bearing filesystem guard; calling write without prior sandbox assertion is a regression that other tickets MUST not introduce.)
2. The POST route is registered inside `wrapRouterWritable`. (Architectural invariant — write routes must always live inside the wrapper; ticket 002's fence would throw at boot if this regressed.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/manual-stories-routes.test.ts` — new file, 6 cases covering the POST validate/sandbox/conflict/success paths + the GET empty/populated paths.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/manual-stories-routes.test.js"` — targeted run.
2. `cd tools/manual-story-studio && npm test` — full chain (composes ticket 002, 003, 005, 006 tests as well).
