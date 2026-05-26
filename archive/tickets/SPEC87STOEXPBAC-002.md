# SPEC87STOEXPBAC-002: Read-only fencing (Layer 1-4)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/src/server/readonly-guard.ts` + fence-enforcement tests.
**Deps**: archive/tickets/SPEC87STOEXPBAC-001.md

## Problem

SPEC-87 §6 specifies four structural fence layers that together guarantee the Story Explorer backend is read-only-by-construction rather than read-only-by-convention. Each layer enforces a distinct prohibition: Layer 1 forbids dependency-graph paths to mutation tools (`@worldloom/patch-engine`, `@worldloom/world-mcp`); Layer 2 forbids HTTP method registrations beyond `GET`; Layer 3 forbids any filesystem write call into the worldloom repo; Layer 4 forbids subprocess invocation of `world-index build` / `world-index sync`. Per FOUNDATIONS §Canonical Storage Layer, `_source/` is engine-only — the explorer must never reach that surface. This ticket implements the runtime guard (Layer 2) and the test surfaces that prove all four layers hold.

## Assumption Reassessment (2026-05-25)

1. Ticket 001 will have created `tools/story-explorer/package.json` with the correct dependency exclusion set (no `@worldloom/patch-engine`, no `@worldloom/world-mcp`); this ticket adds the test that asserts the absence. The Layer 1 verification is grep-based against the package.json file.
2. SPEC-87 §6 enumerates the four fence layers and the rationale; the `tools/story-explorer/README.md` (from 001) restates the contract. This ticket's tests are the structural enforcement that the README and SPEC-87 §6 describe.
3. Cross-skill boundary: the routing primitive under audit is the HTTP router (Fastify or Node `http`). Layer 2's `readonly-guard.ts` wraps the router's `route` / `addRoute` registration API so any non-GET handler registration throws at startup. The wrap must be applied at server bootstrap time, before any route file's registration runs. The boundary is the router API; the test surface is the wrap's rejection of attempted non-GET registration.
4. FOUNDATIONS §Canonical Storage Layer (engine-only write surface for `_source/`) and §Story Bundles §4 (engine-routed writes for story-bundle `_source/`) are the principles motivating the four-layer fence. Rule 6 (No Silent Retcons) is the meta-principle: any backend code path that mutated canon would be a silent retcon by construction. This ticket's tests are the structural Rule 6 preservation.
5. HARD-GATE surface: the four-layer fence IS the read-only HARD-GATE for this package. Layer 2 enforces at runtime (router wrap throws); Layers 1/3/4 enforce at test time (assertions against the package.json and the bundled `dist/` and the absence of subprocess calls). The just-amended `/reassess-spec` §3.9 trigger (per this session) explicitly covers "MCP tools or other tools that mediate canon reads/writes — including HTTP read-backends" — this ticket is the structural enforcement that satisfies that trigger's Rule 1/6/7 preservation requirements.

## Assumption Reassessment (2026-05-26)

1. Archived dependency `archive/tickets/SPEC87STOEXPBAC-001.md` landed the package skeleton and confirmed the live package convention uses Node's built-in test runner, not Vitest. The skeleton kept the spec-family `test/` directory but its initial `tsconfig.json` / `npm test` script still pointed at `tests/`; this ticket owns the first real test and corrects that proof-surface mismatch to compiled `dist/test/**/*.test.js`.
2. Pre-edit baseline `cd tools/story-explorer && npm test -- readonly-guard` passed with `1..0` because no tests existed yet and the package script did not compile the `test/` tree. The truthful targeted proof after implementation is `npm run build` followed by `node --test dist/test/readonly-guard.test.js`; `npm test` remains the package-wide compiled test lane.
3. Live package state already satisfies Layer 1 in `tools/story-explorer/package.json`: dependencies include `@worldloom/world-index`, `better-sqlite3`, and `fastify`, and do not include `@worldloom/patch-engine` or `@worldloom/world-mcp`. The new test asserts that manifest contract so later dependency drift is caught.
4. `tools/story-explorer/README.md` already restates the no-mutation contract from SPEC-87 §6; no README update is needed for this ticket because the runtime guard and test suite implement the existing documented contract without changing user-facing invocation.
5. HARD-GATE read completed against `docs/HARD-GATE-DISCIPLINE.md`: this ticket does not mutate canon and does not change a canon-mutating skill gate, but its read-only fence preserves the engine-only write boundary for world and story `_source` records by preventing HTTP mutation routes, mutation dependencies, filesystem writes, and index-refresh subprocesses.

## Architecture Check

1. Four independent fence layers prevent the package from drifting into mutation territory through any plausible path: dependency-graph (Layer 1), router-API (Layer 2), fs-API (Layer 3), subprocess-API (Layer 4). A single-layer fence would be brittle — a developer adding a new dep could forget to also wrap the router; this design forces every plausible mutation path to be visibly closed.
2. No backwards-compatibility shims; the fences are introduced fresh with the package.

## Verification Layers

1. Layer 1 fence (no mutation-package deps) → codebase grep-proof (`grep -E "patch-engine|world-mcp" tools/story-explorer/package.json` returns zero matches)
2. Layer 2 fence (router rejects non-GET registrations) → Node test (`test/readonly-guard.test.ts` asserts the wrap throws on `POST`/`PUT`/`PATCH`/`DELETE`/`OPTIONS` registration attempts and allows `GET`)
3. Layer 3 fence (no fs.write imports in compiled output) → Node test (`test/readonly-guard.test.ts` scans compiled story-explorer production output for `fs.write`, `fs.appendFile`, `fs.mkdir`-with-write-intent references)
4. Layer 4 fence (no subprocess invocation of world-index build/sync) → Node test (`test/readonly-guard.test.ts` scans compiled story-explorer production output for `child_process.spawn`, `execSync`, etc. references paired with `world-index`)
5. FOUNDATIONS §Canonical Storage Layer alignment → FOUNDATIONS alignment check (the four-layer fence structurally prevents any `_source/` write; manual review confirms each layer's enforcement matches the principle's "engine-only write surface" requirement)

## What to Change

### 1. Implement Layer 2 runtime guard

- `tools/story-explorer/src/server/readonly-guard.ts` — exports `wrapRouterReadOnly(router)` that takes a Fastify (or Node `http`) router instance and intercepts route-registration calls. If a handler is registered for `POST`/`PUT`/`PATCH`/`DELETE`/`OPTIONS` (excluding the CORS preflight `OPTIONS` reply path), throws a startup error naming the offending method + path. Returns the wrapped router for chaining.
- The guard runs at server bootstrap before any route files register handlers; ticket 007's `src/server/http.ts` will call it.

### 2. Tests for all four layers

- `tools/story-explorer/package.json` and `tools/story-explorer/tsconfig.json` — correct the first-test proof surface from `tests/` to the spec-family `test/` directory so compiled tests land under `dist/test/`.
- `tools/story-explorer/test/readonly-guard.test.ts`:
  - **Layer 1 test**: parses `tools/story-explorer/package.json`, asserts `dependencies` does NOT include `@worldloom/patch-engine` or `@worldloom/world-mcp`.
  - **Layer 2 test**: imports `wrapRouterReadOnly`, creates a mock router, registers a GET (should succeed), then attempts to register non-GET methods (should throw with a clear "read-only fence violation: POST /foo" style error message).
  - **Layer 3 test**: greps `tools/story-explorer/dist/` for forbidden patterns (`fs.writeFile`, `fs.appendFile`, `writeFileSync`, `appendFileSync`, `fs.mkdir` (unless `recursive: true` for a temp-path use-case the test allowlists)). Test fails if any match is found.
  - **Layer 4 test**: greps `dist/` for `child_process.spawn`, `child_process.exec`, `execSync`, `spawnSync` references that pass `world-index` as an argument. Test fails if any match is found.

## Files to Touch

- `tools/story-explorer/src/server/readonly-guard.ts` (new)
- `tools/story-explorer/test/readonly-guard.test.ts` (new)
- `tools/story-explorer/package.json` (modify — test script path)
- `tools/story-explorer/tsconfig.json` (modify — include path)

## Out of Scope

- The HTTP server itself (ticket 007 — this ticket's guard is consumed by 007's `http.ts`)
- Any route file registrations (tickets 007-009)
- Test fixtures for read-path behavior (tickets 003-006)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build && node --test dist/test/readonly-guard.test.js` — all four layer tests pass.
2. The Layer 2 guard throws with a clear error message when a POST/PUT/PATCH/DELETE handler is registered.
3. Greps for `fs.writeFile`/`fs.appendFile`/`writeFileSync`/`appendFileSync` in `dist/` return zero matches (Layer 3).
4. Greps for `child_process` references to `world-index` in `dist/` return zero matches (Layer 4).

### Invariants

1. The Story Explorer backend MUST NOT have any code path that mutates the worldloom repository — no `_source/` writes, no derived-index refresh, no story-bundle prose attachment, no spec edits.
2. The four-layer fence is non-bypassable: removing or weakening any layer requires a separate spec amendment (per SPEC-87 §6 and Rule 6 No Silent Retcons).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/readonly-guard.test.ts` — covers all four fence layers; one describe block per layer.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/readonly-guard.test.js` (targeted: runs only the fence tests)
2. `cd tools/story-explorer && npm test` (full-pipeline: all package tests after siblings land)

## Outcome

Completed: 2026-05-26

Implemented the Story Explorer read-only fence test surface and the Layer 2 route-registration guard. `wrapRouterReadOnly()` now wraps Fastify-style `route`, `addRoute`, and shorthand route methods, permits `GET`, and throws `read-only fence violation: <METHOD> <path>` for non-GET registrations. The new `node:test` suite verifies all four fence layers: mutation-surface packages are absent from `package.json`, non-GET routes are rejected, compiled production output has no filesystem write API references, and compiled production output has no `world-index build` / `world-index sync` subprocess execution path.

Deviations from draft:

1. Tests use Node's built-in test runner, not Vitest, matching the package convention established by ticket 001.
2. The package skeleton's first-test proof surface was corrected from `tests/` / `dist/tests/` to the spec-family `test/` / `dist/test/` directory.
3. The guard also wraps route shorthand methods (`post`, `put`, `patch`, `delete`, etc.) in addition to `route` / `addRoute`, because Fastify exposes those registration paths and leaving them unwrapped would make the Layer 2 fence incomplete.

## Verification Result

1. Pre-edit baseline `cd tools/story-explorer && npm test -- readonly-guard` passed with `1..0`, proving the prior command was not a real targeted test lane before this ticket added tests and corrected the compiled test path.
2. `cd tools/story-explorer && npm run build` passed.
3. `cd tools/story-explorer && node --test dist/test/readonly-guard.test.js` passed: 5 tests, 5 pass.
4. `cd tools/story-explorer && npm test` passed: 5 tests, 5 pass.
