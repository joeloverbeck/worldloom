# SPEC100MANSTOSTU-006: Backend HTTP server + CLI + GET `/api/worlds` route + backend startup banner

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/cli.ts`, `src/server/http.ts`, and `src/server/routes/worlds.ts`. The `manual-story-studio` CLI binary becomes runnable after this ticket.
**Deps**: SPEC100MANSTOSTU-001, SPEC100MANSTOSTU-002, SPEC100MANSTOSTU-005

## Problem

SPEC-100 §2 in-scope item 2 (backend HTTP shell) + item 6 (world picker server-side support) + item 7 (startup banner backend half) require the backend server scaffolding: a Fastify instance wrapped by `wrapRouterWritable` (ticket 002) so every write route MUST land inside the wrapper, registered routes for the world list (`GET /api/worlds`), static-serve for the built frontend at `web/dist/`, a CLI entry point parsing `--port` and `--repo-root`, and a startup banner logged to the backend stdout. This ticket lands the server skeleton + the first route (worlds GET) + the CLI; ticket 007 adds the manual-stories routes (which require ticket 003's sandbox), and ticket 008 lands the frontend that the static-serve handler serves.

## Assumption Reassessment (2026-05-30)

1. `tools/story-explorer/src/server/http.ts` (read at HEAD lines 1-141) is the structural template: it imports `wrapRouterReadOnly` and wraps Fastify in `createServer`, registers `@fastify/static` for `web/dist/` serving when present (lines 92-113 `registerStaticServe`), installs a response envelope hook, and registers each route module via `registerXRoute(server, options)` calls. Manual Studio mirrors this shape EXCEPT it uses `wrapRouterWritable` (ticket 002) instead of `wrapRouterReadOnly`, points static-serve at `tools/manual-story-studio/web/dist/`, and registers ONLY the worlds GET route in this ticket (manual-stories routes land in ticket 007).
2. SPEC-100 §4 Files to touch line 69 specifies `tools/manual-story-studio/src/server/http.ts`; line 68 specifies `src/cli.ts` (argv parsing `--port`, `--repo-root`, repo-root resolution, server start); line 74 specifies `src/server/routes/worlds.ts` (`GET /api/worlds`). Story Explorer's `src/server/routes/worlds.ts` (read at HEAD lines 1-39) shows the canonical route-module shape — exported `registerWorldsRoutes(server, options)` function that calls `server.get('/api/worlds', ...)` and an optional per-slug GET handler. Manual Studio mirrors the shape, sourcing world data from `enumerateWorlds` (ticket 005's `tools/manual-story-studio/src/read/worlds.ts`).
3. **Cross-skill / cross-artifact boundary**: this ticket composes ticket 002's `wrapRouterWritable` (route fence) + ticket 005's `enumerateWorlds` (direct filesystem read) + Fastify's `@fastify/static` (declared dep in ticket 001's `package.json`) into a single backend server. The shared boundaries are: (a) the Fastify instance type passed to both `wrapRouterWritable` and the route registrars; (b) the `enumerateWorlds(repoRoot)` contract returning the `WorldEntry[]` shape consumed by the worlds route; (c) `web/dist/` static-serve target which ticket 008 produces but which must be tolerated as absent until 008 lands (`registerStaticServe` short-circuits when `index.html` is missing, per Story Explorer's pattern).

## Architecture Check

1. **Compose the route fence into the server creation function, not as a per-route decoration**: wrapping the Fastify instance once at `createServer` time means every subsequent `server.get/post/...` call is automatically guarded. The alternative (per-route fence decoration) is error-prone and easy to forget. Mirror Story Explorer's `wrapRouterReadOnly(Fastify({ ... }))` shape with `wrapRouterWritable(Fastify({ ... }))`.
2. **Static-serve short-circuit when `web/dist/` is absent**: during development (no frontend build yet) or when running the backend before ticket 008 lands, `registerStaticServe` simply does nothing rather than throwing. Mirrors Story Explorer's `if (!existsSync(indexPath)) return;` pattern.
3. **Startup banner in the CLI entry, not in `http.ts`**: the banner is informational for the operator running the CLI, not a per-request server log. Print to stderr via `console.error` after the server boots successfully so the operator sees the boundary statement before opening the URL. Mirror SPEC-100 §2 item 7 banner template verbatim.
4. No backwards-compatibility aliasing/shims introduced — all three files are new.

## Verification Layers

1. `createServer` wraps Fastify via `wrapRouterWritable` → unit test that attempts to register a POST route at boot OUTSIDE the wrapper and asserts it throws (composition test: `wrapRouterWritable` + `createServer` together enforce the fence).
2. `GET /api/worlds` returns the world list → integration test using `server.inject({ method: 'GET', url: '/api/worlds' })` against a fixture repo root containing 2 valid worlds; asserts response status 200 and body shape `{ worlds: [{ worldSlug, ... }, ...] }`.
3. Static-serve is a no-op when `web/dist/index.html` is absent → unit test that calls `registerStaticServe` against a temp repo root with no `web/dist/` and asserts no error.
4. CLI banner contents → grep proof: `cd tools/manual-story-studio && node dist/src/cli.js --port 5175 --repo-root /tmp/empty 2>&1 | grep -E "Write root:.*manual-stories" | grep -E "World canon: read-only"` (or equivalent fixture-driven test that captures stderr).

## What to Change

### 1. Create `tools/manual-story-studio/src/server/http.ts`

Mirror Story Explorer's `http.ts:1-141` structure. Replace `wrapRouterReadOnly` with `wrapRouterWritable` (imported from `./write-scope-guard.js`). Replace the static-serve target with `tools/manual-story-studio/web/dist`. Register only `registerWorldsRoutes` from `./routes/worlds.js`. The route-registration block is inside `wrapRouterWritable(server, async (writableRouter) => { ... })` — currently only the GET route, but the wrapper is the place ticket 007 will add POST routes for manual-stories.

```typescript
import { existsSync } from "node:fs";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

import { wrapRouterWritable } from "./write-scope-guard.js";
import { registerWorldsRoutes } from "./routes/worlds.js";

export interface CreateServerOptions {
  repoRoot: string;
  port?: number;
}

async function registerStaticServe(server: FastifyInstance, repoRoot: string): Promise<void> {
  const webDistPath = path.resolve(repoRoot, "tools/manual-story-studio/web/dist");
  const indexPath = path.join(webDistPath, "index.html");

  if (!existsSync(indexPath)) return;

  await server.register(fastifyStatic, {
    root: webDistPath,
    prefix: "/",
    wildcard: false,
  });

  server.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api")) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html");
  });
}

export async function createServer(options: CreateServerOptions): Promise<FastifyInstance> {
  const server = Fastify({ logger: false, genReqId: () => crypto.randomUUID() });

  await registerStaticServe(server, options.repoRoot);

  // Wrap the router so write methods (POST/PUT/PATCH/DELETE) can only register inside the wrapper.
  // GETs register freely outside (reads are unrestricted).
  await registerWorldsRoutes(server, { repoRoot: options.repoRoot }); // GET routes — register outside the wrapper

  await wrapRouterWritable(server, async (writableRouter) => {
    // Ticket 007 adds registerManualStoriesRoutes here for the POST create path.
  });

  return server;
}
```

### 2. Create `tools/manual-story-studio/src/server/routes/worlds.ts`

Mirror `tools/story-explorer/src/server/routes/worlds.ts:1-39` shape. Source data from `enumerateWorlds`:

```typescript
import type { FastifyInstance } from "fastify";
import { enumerateWorlds } from "../../read/worlds.js";

export interface WorldsRouteOptions {
  repoRoot: string;
}

export async function registerWorldsRoutes(
  server: FastifyInstance,
  options: WorldsRouteOptions,
): Promise<void> {
  server.get("/api/worlds", async () => {
    const worlds = enumerateWorlds(options.repoRoot);
    return { worlds };
  });
}
```

### 3. Create `tools/manual-story-studio/src/cli.ts`

Argv parsing (`--port` defaulting to 5175, `--repo-root` defaulting to `process.cwd()`), repo-root resolution to absolute, server start, startup banner per SPEC-100 §2 item 7 exact template:

```
Manual Story Studio
Write root: worlds/<world>/manual-stories/<story>/
World canon: read-only
Normal story bundles: read-only
External LLM: not connected
```

The `<world>` and `<story>` are placeholder symbols (no specific world selected at boot); print the banner verbatim.

```typescript
import { createServer } from "./server/http.js";
import path from "node:path";

interface Args {
  port: number;
  repoRoot: string;
}

function parseArgs(argv: string[]): Args {
  let port = 5175;
  let repoRoot = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port") port = parseInt(argv[++i] ?? "5175", 10);
    else if (argv[i] === "--repo-root") repoRoot = path.resolve(argv[++i] ?? process.cwd());
  }
  return { port, repoRoot };
}

async function main(): Promise<void> {
  const { port, repoRoot } = parseArgs(process.argv.slice(2));
  const server = await createServer({ repoRoot, port });
  await server.listen({ port, host: "127.0.0.1" });

  console.error("Manual Story Studio");
  console.error("Write root: worlds/<world>/manual-stories/<story>/");
  console.error("World canon: read-only");
  console.error("Normal story bundles: read-only");
  console.error("External LLM: not connected");
  console.error(`Listening on http://127.0.0.1:${port}`);
}

main().catch((error) => {
  console.error("Manual Story Studio failed to start:", error);
  process.exit(1);
});
```

### 4. Create smoke test at `tools/manual-story-studio/test/server/http.test.ts`

Use Fastify's `server.inject` API + Node's `node:test`. Cases:

1. **`createServer` boots without throwing** when given a valid repo root.
2. **`GET /api/worlds` returns 200 + a `worlds` array** against a fixture repo root.
3. **POST registration outside `wrapRouterWritable` throws** at server-build time (negative test).
4. **Static-serve no-op** when `web/dist/index.html` absent (positive test — server still boots).

## Files to Touch

- `tools/manual-story-studio/src/server/http.ts` (new)
- `tools/manual-story-studio/src/server/routes/worlds.ts` (new)
- `tools/manual-story-studio/src/cli.ts` (new)
- `tools/manual-story-studio/test/server/http.test.ts` (new)

## Out of Scope

- Manual-stories routes (GET list, POST create) — ticket 007.
- Web frontend — ticket 008.
- Story Explorer modifications — out of scope per SPEC-100 §4 No modification list.
- Per-route response envelope hook (Story Explorer's `installEnvelopeHook` pattern) — Manual Studio omits this in MVP; routes return plain JSON. Envelope addition is post-SPEC-100 cleanup if surfaces grow.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/http.test.js"` — all 4 smoke test cases pass.
2. `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root /tmp/empty-test-root` boots without throwing; CLI prints the 5-line banner to stderr; HTTP request to `http://127.0.0.1:5175/api/worlds` returns `200 { worlds: [] }`.
3. `grep -E "wrapRouterWritable" tools/manual-story-studio/src/server/http.ts` returns ≥1 match (the wrap call site).
4. `grep -E "Write root:|World canon:|Normal story bundles:|External LLM:" tools/manual-story-studio/src/cli.ts | wc -l` returns 4 (banner lines).

### Invariants

1. Every write-method registration in `http.ts` lives inside `wrapRouterWritable(server, ...)`. (Architectural invariant — the route fence is the load-bearing boundary; later route additions MUST go inside the wrapper.)
2. The startup banner contents match SPEC-100 §2 item 7 exactly. (Data-contract invariant — operators rely on the banner as the boundary-statement contract.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/http.test.ts` — new file, 4 smoke cases.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/http.test.js"` — targeted test run.
2. `cd tools/manual-story-studio && npm test` — full chain.
3. `node tools/manual-story-studio/dist/src/cli.js --port 5175 --repo-root <repo-root>` — manual boot verification + banner inspection (deferred to ticket 009 capstone for end-to-end exercise).
