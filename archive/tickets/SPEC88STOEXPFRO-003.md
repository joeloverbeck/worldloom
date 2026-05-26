# SPEC88STOEXPFRO-003: Backend integration — build chain + static-serve

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies landed SPEC-87 backend `tools/story-explorer/package.json` (build/test script chaining), `tools/story-explorer/src/server/http.ts` (read-only static-serve for `web/dist/`), and `tools/story-explorer/src/server/readonly-guard.ts` (GET/HEAD read-method allowance); adds `@fastify/static` dependency.
**Deps**: None

## Problem

At intake, SPEC-88 §3 (post-reassessment) committed to a "single `npm install` followed by `npm run build` from the package root produces both halves" UX and a production-mode posture where "the backend serves `web/dist/` at `/` in production mode". The landed SPEC-87 backend had neither — `tools/story-explorer/package.json`'s `build` script was only `tsc -p tsconfig.json` (no web chain), `test` was `npm run build && node --test ...` (no web tests), and Fastify registered no static-serve middleware (`@fastify/static` was not a dependency; `src/server/http.ts` had no `register(fastifyStatic, ...)` call). This ticket lands those integration paths.

## Assumption Reassessment (2026-05-26)

1. Intake SPEC-87 backend at HEAD: `tools/story-explorer/package.json` had scripts `{"build": "tsc -p tsconfig.json", "test": "npm run build && node --test \"dist/test/**/*.test.js\"", "clean": "rm -rf dist"}`; dependencies were `@worldloom/world-index`, `better-sqlite3`, `fastify`, `yaml` with no `@fastify/static`. `src/server/http.ts` confirmed Fastify was the HTTP framework and no static-serve registration existed. The backend's `src/cli.ts` remains the production entry (`bin: dist/src/cli.js` in package.json). T001 created `tools/story-explorer/web/` as a sibling sub-tree at the package level.
2. SPEC-88 §10 (post-reassessment) deliverables this ticket implements: (a) backend `package.json` now chains `npm --prefix web install --no-audit --no-fund`, web build, and backend build; (b) `test` now runs backend compiled tests and then web vitest; (c) `@fastify/static` is a backend dependency; (d) `src/server/http.ts` registers a guarded read-only `web/dist/` static-serve when `index.html` exists; (e) `test/static-serve-readonly.test.ts` verifies static serving, absent-bundle fallback, API envelope preservation, and mutation-method rejection.
3. Cross-skill boundary: this ticket modifies code landed by SPEC-87 (COMPLETED + archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`). The work respects SPEC-87 §6's four-layer read-only fence: (Layer 1) `@fastify/static` is a read-only middleware — no write surface; (Layer 2) static-serve registers standard `GET` and `HEAD` read routes, while `POST`/`PUT`/`PATCH`/`DELETE`/`OPTIONS` remain rejected; (Layer 3) no `fs.write*` calls introduced; (Layer 4) no `world-index build`/`sync` subprocess invocation. `test/static-serve-readonly.test.ts` and the updated `readonly-guard.test.ts` independently re-verify Layer 2.
4. FOUNDATIONS §Canonical Storage Layer — `worlds/<slug>/_source/` is engine-only write surface. This ticket adds read-only static-serve for `web/dist/` (a derived build output under the package, not under `worlds/`); no `_source/` interaction. FOUNDATIONS §Story Bundles §4 Write Discipline (story-bundle writes are engine-routed) is preserved unchanged — the static-serve introduces no story-bundle mutation path. The read-only fence is the load-bearing principle here; the four layers above structurally enforce it.

## Architecture Check

1. **`@fastify/static` over hand-rolled static-serve** — using the maintained Fastify plugin avoids subtle mime-type, range-request, and path-traversal bugs that hand-rolled `fs.readFile + reply.send` paths fall into. `@fastify/static` is read-only by construction (no write API) and already handles ETag, Last-Modified, and conditional requests.
2. **Build-presence guard** — the static-serve registration is gated on `fs.existsSync(web/dist/index.html)`. When `web/dist/` is absent (backend-only test runs that didn't build the web sub-tree first), the static-serve handler is not registered; the backend continues to serve only `/api/*` routes. This preserves backend-only test workflow (T013 capstone tests the integrated build; intermediate ticket tests don't need the web bundle).
3. **No backwards-compatibility aliasing/shims introduced** — the script chaining replaces SPEC-87's `build` and `test` definitions outright; no `build:legacy` alias retained. `build:backend` and `test:backend` are focused development commands, not compatibility aliases for a retired public behavior. Per `tickets/README.md` §Core Architectural Contract item 1, no shims in new work.
4. **`npm --prefix web` over `npm run build --workspace=web`** — reassessment confirmed no root `package.json` exists at the repo root and no workspaces config exists. `--workspace=web` would require root-level workspaces configuration the repo doesn't have; `--prefix web` works against the sub-tree's own `package.json` directly.
5. **Read-only Layer enforcement via new test** — `test/static-serve-readonly.test.ts` registers the static-serve handler, then attempts to register a sibling `POST /index.html` route; asserts the readonly-guard from SPEC-87 (`src/server/readonly-guard.ts`) rejects it. `@fastify/static` also registers `HEAD /index.html`, so the guard was corrected to allow `GET`/`HEAD` read methods and reject non-read methods. The existing SPEC-87 readonly-guard test verifies the global posture; the new test verifies the posture holds after the static-serve modification.

## Verification Layers

1. **Integrated build succeeds** → `cd tools/story-explorer && npm install --no-audit --no-fund` followed by `npm run build` builds both web sub-tree (`web/dist/`) and backend (`dist/`) in order. Verified by command in Acceptance Criteria.
2. **Static-serve route responds in production mode** → compiled integration test: `node --test dist/test/static-serve-readonly.test.js` seeds a temp repo with `web/dist/index.html`, calls `createServer()`, and asserts `GET /` returns the bundled HTML. The later T013 capstone still owns real browser/manual smoke.
3. **Static-serve is read-only** → `test/static-serve-readonly.test.ts` asserts the readonly-guard rejects a `POST` attempt at the static-serve mount point, and `readonly-guard.test.ts` asserts only `GET`/`HEAD` read methods pass.
4. **Build-presence guard works** → unit test: server starts without `web/dist/` present (e.g., a clean clone where `web/` hasn't been built yet); the backend's `/api/*` routes respond; the `/` route returns 404 (not 500). Confirms the gate doesn't crash the server when the bundle is absent.
5. **FOUNDATIONS read-only fence preserved** → grep-proof: no new `fs.write*`, `fs.append*`, `fs.mkdir`, or subprocess-spawn calls introduced. `grep -nE "fs\\.(write|append|mkdir)|child_process|spawn|exec" tools/story-explorer/src/server/` returns zero matches.

## Landed Changes

### 1. Modify `tools/story-explorer/package.json` — script chaining

Replaced the existing `build` and `test` scripts:

```json
{
  "scripts": {
    "build": "npm --prefix web install --no-audit --no-fund && npm --prefix web run build && npm run build:backend",
    "test": "npm run build && node --test \"dist/test/**/*.test.js\" && npm --prefix web test",
    "test:backend": "npm run build:backend && node --test \"dist/test/**/*.test.js\"",
    "build:backend": "tsc -p tsconfig.json",
    "clean": "rm -rf dist web/dist web/node_modules"
  }
}
```

(`test:backend` and `build:backend` are escape hatches for backend-only iteration during development; the canonical `build` and `test` chain both halves.)

### 2. Added `@fastify/static` as a dependency in `tools/story-explorer/package.json`

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

### 3. Modified `tools/story-explorer/src/server/http.ts` — register static-serve

The server now registers static serving before installing the API envelope hook:

```ts
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ... inside the server setup before the API envelope hook and API route registrations ...

const webDistPath = resolve(options.repoRoot, 'tools/story-explorer/web/dist');
const indexPath = join(webDistPath, 'index.html');
if (existsSync(indexPath)) {
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

The registration is before `installEnvelopeHook` (so the static assets do not get the API envelope wrapping). The `if (existsSync(indexPath))` guard means the static-serve is skipped when `web/dist/index.html` is absent — backend-only test runs continue to work; production runs (where the build has produced `web/dist/`) get the bundle served.

### 4. Created `tools/story-explorer/test/static-serve-readonly.test.ts`

The test seeds temp repos with and without `tools/story-explorer/web/dist/index.html`, then verifies absent-bundle fallback, `GET /` static HTML response, preserved `/api/health` envelope behavior, and `POST /index.html` rejection after static registration.

### 5. Verified `scripts/build-all.sh` needs no change

The build chain `world-index → patch-engine → validators → hooks → world-mcp → story-explorer` already includes `story-explorer`. The script invokes `npm run build` inside each package, which now chains the web build automatically, so no `scripts/build-all.sh` edit was needed.

## Files to Touch

- `tools/story-explorer/package.json` (modify) — script chaining + `@fastify/static` dependency
- `tools/story-explorer/package-lock.json` (modify) — locks `@fastify/static` and transitive dependencies
- `tools/story-explorer/src/server/http.ts` (modify) — register static-serve with build-presence guard
- `tools/story-explorer/src/server/readonly-guard.ts` (modify) — allow `GET`/`HEAD` read-method registrations while rejecting mutation methods
- `tools/story-explorer/test/readonly-guard.test.ts` (modify) — verifies `GET`/`HEAD` allowance and non-read rejection
- `tools/story-explorer/test/static-serve-readonly.test.ts` (new) — read-only Layer verification test
- `tools/story-explorer/README.md` (modify) — documents package-root build and production static serving
- `specs/SPEC-88-story-explorer-frontend-foundation.md` (modify) — records the T003 implementation note and `GET`/`HEAD` correction

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
3. `cd tools/story-explorer && node --test dist/test/static-serve-readonly.test.js dist/test/readonly-guard.test.js` — runs focused static-serve and read-only guard assertions after build.

### Invariants

1. SPEC-87 §6 four-layer read-only fence holds: no new `fs.write*`, `fs.append*`, `fs.mkdir`, or subprocess-spawn calls in `tools/story-explorer/src/server/`. Verified by grep.
2. Static-serve is gated on `existsSync(web/dist/index.html)` — server starts cleanly when bundle is absent.
3. Backend's `package.json` declares `@fastify/static` as a dependency (so production deploys pick it up).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/static-serve-readonly.test.ts` (new) — verifies static serving, absent-bundle fallback, API envelope preservation, and write-method rejection.
2. `tools/story-explorer/test/readonly-guard.test.ts` (modified) — verifies `GET`/`HEAD` read-method allowance and non-read rejection.

### Commands

1. `cd tools/story-explorer && npm install --no-audit --no-fund` — dependency/lockfile update.
2. `cd tools/world-index && npm install --no-audit --no-fund && npm run build` — verification setup for the local `@worldloom/world-index` file dependency declarations.
3. `cd tools/story-explorer && npm run build` — integrated build verification.
4. `cd tools/story-explorer && node --test dist/test/static-serve-readonly.test.js dist/test/readonly-guard.test.js` — focused static-serve/read-only proof.
5. `cd tools/story-explorer && npm test` — full backend+web test run.
6. `cd tools/story-explorer && npm run test:backend` — backend-only test run.
7. `rg -n "fs\\.(write|append|mkdir)|child_process|spawn|exec" tools/story-explorer/src/server` — read-only fence grep-proof; expect no matches.

## Outcome

Completed 2026-05-26. The story-explorer backend package now builds the web sub-tree before the backend, runs backend compiled tests plus web vitest from `npm test`, exposes backend-only `build:backend`/`test:backend` scripts for focused iteration, and cleans both backend and web generated outputs. `@fastify/static` is locked in the backend package and `createServer()` serves `web/dist/index.html` at `/` when the built bundle exists under the resolved repo root; when it is absent, the API still starts and `/` returns 404 instead of crashing. API routes remain enveloped because static serving is registered before the envelope hook and API routes after it.

## Verification Result

1. `cd tools/story-explorer && npm install --no-audit --no-fund` — passed; updated `package-lock.json`; npm emitted deprecation warnings for transitive `prebuild-install@7.1.3` and `glob@11.1.0`.
2. `cd tools/world-index && npm install --no-audit --no-fund && npm run build` — passed; this refreshed the local file dependency's declaration output required by the story-explorer backend compile.
3. `cd tools/story-explorer && npm run build` — first run reached backend compile and failed because the local `@worldloom/world-index` dependency had not been built; after the world-index setup above, rerun passed and built both `web/dist/` and backend `dist/`.
4. `cd tools/story-explorer && node --test dist/test/static-serve-readonly.test.js dist/test/readonly-guard.test.js` — first focused run exposed that `@fastify/static` registers `HEAD /index.html`; after correcting the read-only guard to allow `GET`/`HEAD`, rerun passed: 9/9 tests.
5. `cd tools/story-explorer && npm test` — passed: backend compiled tests 70/70; web vitest 4 files and 10/10 tests.
6. `cd tools/story-explorer && npm run test:backend` — passed: 12 compiled test files.
7. `rg -n "fs\\.(write|append|mkdir)|child_process|spawn|exec" tools/story-explorer/src/server` — returned no matches, proving the server source adds no write API or subprocess refresh path.

## Deviations

1. The drafted "GET-only" static-serve assertion was corrected to `GET`/`HEAD` because `@fastify/static` registers a standard `HEAD` companion route for static files. `HEAD` is metadata-only and remains inside the read-only fence; `POST`/`PUT`/`PATCH`/`DELETE`/`OPTIONS` still fail closed.
2. Verification required building `tools/world-index` after dependency install so the local `file:../world-index` dependency exposed fresh declaration files. The generated `tools/world-index/dist/` and package `node_modules/` directories are expected ignored proof artifacts, not ticket-owned source.
