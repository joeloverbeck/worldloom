# SPEC88STOEXPFRO-003: Backend integration — build chain + static-serve

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies landed SPEC-87 backend `tools/story-explorer/package.json` (build/test script chaining) and `tools/story-explorer/src/server/http.ts` (read-only static-serve for `web/dist/`); adds `@fastify/static` dependency.
**Deps**: None

## Problem

SPEC-88 §3 (post-reassessment) commits to a "single `npm install` followed by `npm run build` from the package root produces both halves" UX and a production-mode posture where "the backend serves `web/dist/` at `/` in production mode". The landed SPEC-87 backend has neither — `tools/story-explorer/package.json`'s `build` script is only `tsc -p tsconfig.json` (no web chain), `test` is `npm run build && node --test ...` (no web tests), and Fastify registers no static-serve middleware (`@fastify/static` is not a dependency; `src/server/http.ts` has no `register(fastifyStatic, ...)` call). Without these landed-code modifications, the web sub-tree from T001 has no integrated build path and no production-serve path.

## Assumption Reassessment (2026-05-26)

1. Landed SPEC-87 backend at HEAD: `tools/story-explorer/package.json` has scripts `{"build": "tsc -p tsconfig.json", "test": "npm run build && node --test \"dist/test/**/*.test.js\"", "clean": "rm -rf dist"}` (confirmed by Step 2 spot-check); dependencies are `@worldloom/world-index`, `better-sqlite3`, `fastify`, `yaml` — NO `@fastify/static`. `src/server/http.ts` lines 28-97 confirm Fastify is the HTTP framework; no static-serve registration exists. The backend's `src/cli.ts` is the production entry (`bin: dist/src/cli.js` in package.json). T001 creates `tools/story-explorer/web/` as a sibling sub-tree at the package level.
2. SPEC-88 §10 (post-reassessment) deliverables this ticket implements: (a) modify backend `package.json` to replace `build` with chained `npm --prefix web run build && tsc -p tsconfig.json` and chain `test` to include the web vitest run; (b) add `@fastify/static` as a dependency; (c) register read-only `web/dist/` static-serve in `src/server/http.ts` for production mode (guarded by build-presence check); (d) add `test/static-serve-readonly.test.ts` asserting GET-only registration. The `(a)-extending-archived-sibling` clause at the reassess-spec skill's §Pre-Process (added by the SPEC-88 reassessment cycle audit) explicitly authorizes this work — this ticket is new SPEC-88 scope, not a SPEC-87 amendment.
3. Cross-skill boundary: this ticket modifies code landed by SPEC-87 (COMPLETED + archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`). The work respects SPEC-87 §6's four-layer read-only fence: (Layer 1) `@fastify/static` is a read-only middleware — no write surface; (Layer 2) static-serve registers only GET handlers; (Layer 3) no `fs.write*` calls introduced; (Layer 4) no `world-index build`/`sync` subprocess invocation. The new test `test/static-serve-readonly.test.ts` independently re-verifies Layer 2 for the static-serve handler.
4. FOUNDATIONS §Canonical Storage Layer — `worlds/<slug>/_source/` is engine-only write surface. This ticket adds read-only static-serve for `web/dist/` (a derived build output under the package, not under `worlds/`); no `_source/` interaction. FOUNDATIONS §Story Bundles §4 Write Discipline (story-bundle writes are engine-routed) is preserved unchanged — the static-serve introduces no story-bundle mutation path. The read-only fence is the load-bearing principle here; the four layers above structurally enforce it.

## Architecture Check

1. **`@fastify/static` over hand-rolled static-serve** — using the maintained Fastify plugin avoids subtle mime-type, range-request, and path-traversal bugs that hand-rolled `fs.readFile + reply.send` paths fall into. `@fastify/static` is read-only by construction (no write API) and already handles ETag, Last-Modified, and conditional requests.
2. **Build-presence guard** — the static-serve registration is gated on `fs.existsSync(webDistPath)`. When `web/dist/` is absent (backend-only test runs that didn't build the web sub-tree first), the static-serve handler is not registered; the backend continues to serve only `/api/*` routes. This preserves backend-only test workflow (T013 capstone tests the integrated build; intermediate ticket tests don't need the web bundle).
3. **No backwards-compatibility aliasing/shims introduced** — the script chaining replaces SPEC-87's `build` and `test` definitions outright; no `build:legacy` alias retained. Per `tickets/README.md` §Core Architectural Contract item 1, no shims in new work.
4. **`npm --prefix web` over `npm run build --workspace=web`** — confirmed at Step 2 spot-check that no root `package.json` exists at the repo root and no workspaces config exists. `--workspace=web` would require root-level workspaces configuration the repo doesn't have; `--prefix web` works against the sub-tree's own `package.json` directly.
5. **Read-only Layer enforcement via new test** — `test/static-serve-readonly.test.ts` registers the static-serve handler, then attempts to register a sibling `POST /test-write` route on the same path prefix; asserts the readonly-guard from SPEC-87 (`src/server/readonly-guard.ts`) rejects it. The existing SPEC-87 readonly-guard test (`test/readonly-guard.test.ts`) verifies the global posture; this new test verifies the posture holds after the static-serve modification.

## Verification Layers

1. **Integrated build succeeds** → `cd tools/story-explorer && npm install && npm run build` builds both web sub-tree (`web/dist/`) and backend (`dist/`) in order. Verified by command in Acceptance Criteria.
2. **Static-serve route responds in production mode** → integration test: build web sub-tree, start server, `curl http://localhost:5174/` returns the bundled `index.html`. Manual verification step in T013 capstone runbook.
3. **Static-serve is read-only** → `test/static-serve-readonly.test.ts` asserts the readonly-guard rejects a `POST` attempt at the static-serve mount point. Catches a future maintainer adding a write surface via `@fastify/static` config options (the plugin DOES support `decorateReply: true` and `serve: true` toggles; misconfiguration could in principle enable a writable surface, though the plugin's own API has no write semantics by default).
4. **Build-presence guard works** → unit test: server starts without `web/dist/` present (e.g., a clean clone where `web/` hasn't been built yet); the backend's `/api/*` routes respond; the `/` route returns 404 (not 500). Confirms the gate doesn't crash the server when the bundle is absent.
5. **FOUNDATIONS read-only fence preserved** → grep-proof: no new `fs.write*`, `fs.append*`, `fs.mkdir`, or subprocess-spawn calls introduced. `grep -nE "fs\\.(write|append|mkdir)|child_process|spawn|exec" tools/story-explorer/src/server/` returns zero matches.

## What to Change

### 1. Modify `tools/story-explorer/package.json` — script chaining

Replace the existing `build` and `test` scripts:

```json
{
  "scripts": {
    "build": "npm --prefix web install --no-audit --no-fund && npm --prefix web run build && tsc -p tsconfig.json",
    "test": "npm run build && node --test \"dist/test/**/*.test.js\" && npm --prefix web test",
    "test:backend": "npm run build:backend && node --test \"dist/test/**/*.test.js\"",
    "build:backend": "tsc -p tsconfig.json",
    "clean": "rm -rf dist web/dist web/node_modules"
  }
}
```

(`test:backend` and `build:backend` are escape hatches for backend-only iteration during development; the canonical `build` and `test` chain both halves.)

### 2. Add `@fastify/static` as a dependency in `tools/story-explorer/package.json`

```json
{
  "dependencies": {
    "@worldloom/world-index": "file:../world-index",
    "@fastify/static": "^8.0.0",
    "better-sqlite3": "12.10.0",
    "fastify": "5.6.2",
    "yaml": "2.9.0"
  }
}
```

(Pin to a version compatible with `fastify@5.6.2`; `@fastify/static@8.x` is the current major for Fastify 5.)

### 3. Modify `tools/story-explorer/src/server/http.ts` — register static-serve

After the existing route registrations and before the server starts, add:

```ts
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ... inside the server-setup function, after route registrations ...

const webDistPath = resolve(options.repoRoot, 'tools/story-explorer/web/dist');
if (existsSync(webDistPath)) {
  await server.register(fastifyStatic, {
    root: webDistPath,
    prefix: '/',
    // SPA-mode fallback: unmatched non-/api routes serve index.html so
    // client-side routing (react-router) works on deep-linked URLs
    wildcard: false,
  });
  // SPA fallback for client routes
  server.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'not_found' });
    }
    return reply.sendFile('index.html');
  });
}
```

Place the registration BEFORE the existing `installEnvelopeHook` call (so the static assets do not get the API envelope wrapping). The `if (existsSync(webDistPath))` guard means the static-serve is skipped when `web/dist/` is absent — backend-only test runs continue to work; production runs (where the build has produced `web/dist/`) get the bundle served.

### 4. Create `tools/story-explorer/test/static-serve-readonly.test.ts`

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server/http.js';

describe('static-serve read-only enforcement', () => {
  it('rejects POST attempts at static-serve mount point', async () => {
    const server = await createServer({ /* ... test options ... */ });
    await assert.rejects(
      () => server.route({ method: 'POST', url: '/index.html', handler: () => {} }),
      /readonly|not allowed|forbidden/i,
      'readonly-guard must reject POST registration at static-serve path'
    );
  });

  it('serves /index.html when web/dist/ is present', { skip: !existsSync(webDistPath) }, async () => {
    // Verifies the static-serve handler responds; skipped when web/dist/ is absent.
  });

  it('returns 404 for missing static files in non-/api paths', async () => {
    // Verifies the SPA fallback works.
  });
});
```

### 5. Update `scripts/build-all.sh` (verify no change needed)

The build chain `world-index → patch-engine → validators → hooks → world-mcp → story-explorer` already includes `story-explorer`. The script invokes `npm run build` inside each package, which (post-this-ticket) will chain the web build automatically. Confirm at implementation: the existing `scripts/build-all.sh` step for `story-explorer` does not need editing because `npm run build` becomes the chained build.

## Files to Touch

- `tools/story-explorer/package.json` (modify) — script chaining + `@fastify/static` dependency
- `tools/story-explorer/src/server/http.ts` (modify) — register static-serve with build-presence guard
- `tools/story-explorer/test/static-serve-readonly.test.ts` (new) — read-only Layer verification test

## Out of Scope

- The web sub-tree itself (T001 creates `web/` scaffold; this ticket only chains build/test and adds static-serve).
- Any web-side API client work (T002).
- Any new HTTP routes — this ticket adds only static-serve middleware, no new `/api/*` endpoints.
- SPA history-mode routing beyond the simple `setNotFoundHandler` fallback (e.g., advanced redirect logic, locale handling).
- Any changes to SPEC-87's existing API routes, view-models, or envelope shape.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test` — runs backend build + backend tests + web tests; all green (assumes T001+T002 have landed so web tests exist; otherwise web test step is no-op-equivalent because vitest finds no tests).
2. `cd tools/story-explorer && npm run test:backend` — runs backend-only build + tests; passes even when `web/` is absent (backwards compatibility with backend-only iteration).
3. `cd tools/story-explorer && npm test -- --test-name-pattern="static-serve"` — runs the new `static-serve-readonly.test.ts` assertions.

### Invariants

1. SPEC-87 §6 four-layer read-only fence holds: no new `fs.write*`, `fs.append*`, `fs.mkdir`, or subprocess-spawn calls in `tools/story-explorer/src/server/`. Verified by grep.
2. Static-serve is gated on `existsSync(web/dist/)` — server starts cleanly when bundle is absent.
3. Backend's `package.json` declares `@fastify/static` as a dependency (so production deploys pick it up).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/static-serve-readonly.test.ts` (new) — verifies the static-serve handler is read-only and the SPA fallback works.

### Commands

1. `cd tools/story-explorer && npm install && npm run build` — integrated build verification.
2. `cd tools/story-explorer && npm test` — full backend+web test run.
3. `cd tools/story-explorer && npm run test:backend` — backend-only test run (verifies build-presence guard).
4. `grep -nE "fs\\.(write|append|mkdir)|child_process|spawn|exec" tools/story-explorer/src/server/` — read-only fence grep-proof (expect zero matches).
