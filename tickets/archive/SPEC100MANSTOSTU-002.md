# SPEC100MANSTOSTU-002: Write-scope guard (`wrapRouterWritable`) — registration-time fence

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/manual-story-studio/src/server/write-scope-guard.ts`. No impact on existing tools.
**Deps**: SPEC100MANSTOSTU-001

## Problem

SPEC-100 §2 in-scope item 2 + §3 Key decisions require a **write-scope guard** that is the inverse-polarity analog of Story Explorer's `wrapRouterReadOnly`. Story Explorer wraps its router so only GET/HEAD register; Manual Studio must wrap its router so write methods (POST/PUT/DELETE/PATCH) register only inside an explicit `wrapRouterWritable` scope. Any handler registered outside the wrapper that attempts a write throws **at registration time**, not at request time — making boundary violations visible during `npm test`, not during a live request. This is the load-bearing design pattern that prevents a future contributor from accidentally adding a write handler outside the sandbox-protected scope.

## Assumption Reassessment (2026-05-30)

1. `tools/story-explorer/src/server/readonly-guard.ts:84-102` defines `wrapRouterReadOnly` as the existing analog: it intercepts `router.route`, `router.addRoute`, and each method-specific function (`router.get`, `router.post`, etc.) via wrapper functions that call `assertGetOnly` at registration time, throwing `read-only fence violation: <METHOD> <path>` when a write method is registered. Confirmed at HEAD by reading the file. Manual Studio's `wrapRouterWritable` inverts the assertion: registration of GET/HEAD is allowed everywhere (reads are unrestricted); registration of POST/PUT/PATCH/DELETE is allowed ONLY when called inside `wrapRouterWritable(router, register)` — outside that wrapper, the method functions throw `write-scope fence violation: <METHOD> <path>`.
2. SPEC-100 §4 Files to touch line 70 specifies `tools/manual-story-studio/src/server/write-scope-guard.ts` as the implementation path; SPEC-100 §3 Key decision line 55 names the pattern shape: "Manual Studio wraps its router so write methods register only inside an explicit `wrapRouterWritable` scope. Symmetric pattern, opposite polarity."
3. **Cross-skill / cross-artifact boundary**: this ticket establishes a route-registration contract that ticket 006 (HTTP server scaffolding) and ticket 007 (manual-stories routes) both consume. The shared boundary is the `wrapRouterWritable(router, register)` signature — `register` is a callback that receives the router and registers writes inside the wrapper's enabled scope. The Story Explorer guard's shape (whole-router wrapping with mutated method functions) is the established pattern; Manual Studio inverts the predicate but keeps the wrapping shape.

## Architecture Check

1. **Registration-time failure beats request-time failure**: a misregistered write handler that throws at boot (during `server.register(...)`) surfaces in `npm test` and CI logs immediately; a runtime-only check would survive testing and only fire under a malicious or buggy real request. The Story Explorer precedent uses the registration-time discipline for the same reason — extend it.
2. **Method-function override, not Fastify hook chain**: Fastify supports an `onRoute` lifecycle hook, but using a hook means the guard fires asynchronously after route addition; the throw could be caught and swallowed by Fastify's error pipeline. Overriding `router.get` / `router.post` / etc. forces the throw to propagate synchronously to the registration call site, which is what we want. Mirrors Story Explorer's approach.
3. No backwards-compatibility aliasing/shims introduced — this is a new module.

## Verification Layers

1. Outside `wrapRouterWritable`, `server.post(...)` throws at registration → unit test that asserts `assert.throws(() => bareServer.post('/api/x', handler), /write-scope fence violation: POST/)`.
2. Inside `wrapRouterWritable(server, register => register(...))`, `server.post(...)` succeeds → unit test that registers a POST handler inside the wrapper and asserts it landed on the server's route table.
3. GET / HEAD always register without scope → unit test that bare `server.get('/api/x', ...)` succeeds outside any wrapper.
4. Cross-artifact invariant — fence shape mirrors Story Explorer → codebase grep-proof comparing the two guard files' shape (both export a single `wrap*` function; both override `router.route` / `router.addRoute` and the method-specific functions).

## What to Change

### 1. Create `tools/manual-story-studio/src/server/write-scope-guard.ts`

Implement `wrapRouterWritable<T>(router: T, register: (writableRouter: T) => void | Promise<void>): void | Promise<void>`. Outside the wrapper, calling `router.post`, `router.put`, `router.patch`, or `router.delete` throws `write-scope fence violation: <METHOD> <path>`. The `route(...)` and `addRoute(...)` generic entry points are checked the same way (extract method from the options object). Inside the wrapper, the override is lifted for the duration of `register(...)` and reinstated after.

Implementation outline (parallel to `readonly-guard.ts` shape):

```typescript
type RouteOptions = { method?: string | string[]; url?: string; path?: string };
type RouteRegistrar = (...args: any[]) => unknown;
type WritableRouter = Record<string, any> & { route?: RouteRegistrar; addRoute?: RouteRegistrar };

const ROUTE_METHODS = ["delete", "get", "head", "options", "patch", "post", "put"] as const;
const READ_METHODS = new Set(["GET", "HEAD"]);
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

// ... normalizeMethods, pathFromOptions: same shape as readonly-guard.ts ...

function assertReadOrInsideScope(method: unknown, routePath: string, insideScope: { value: boolean }): void {
  for (const normalized of normalizeMethods(method)) {
    if (WRITE_METHODS.has(normalized) && !insideScope.value) {
      throw new Error(`write-scope fence violation: ${normalized} ${routePath}`);
    }
  }
}

export function wrapRouterWritable<T extends WritableRouter>(router: T, register: (writableRouter: T) => void | Promise<void>): void | Promise<void> {
  // Build the guarded router lazily, but with a mutable insideScope flag flipped to true for the duration of register(...)
  const insideScope = { value: false };
  // Wrap router.route, router.addRoute, and each method function so the closure reads insideScope.value at registration time.
  // Then flip insideScope.value to true, invoke register(router), and reset to false in a try/finally.
  // ...
}
```

The wrapped router's method functions read `insideScope.value` at each registration call (not just at wrap time), so the same router instance can be passed in and out of `wrapRouterWritable` without re-wrapping.

### 2. Create test at `tools/manual-story-studio/test/server/write-scope-guard.test.ts`

Use Node's `node:test` and a stub-router that captures registrations (mirror the Story Explorer test layout if it exists; otherwise a minimal `{ route(): void; get(): void; post(): void; ...; routes: any[] }` stub). Test cases:

1. **POST outside wrap throws**: `assert.throws(() => stub.post('/api/x', h), /write-scope fence violation: POST \/api\/x/);`
2. **POST inside wrap succeeds**: `wrapRouterWritable(stub, r => r.post('/api/x', h)); assert(stub.routes.some(r => r.method === 'POST'));`
3. **PUT/PATCH/DELETE outside wrap throw**.
4. **GET outside wrap succeeds** (reads are unrestricted).
5. **OPTIONS treated as write** (mirrors Story Explorer's symmetry, where OPTIONS is in `WRITE_METHODS`).
6. **`router.route({ method: 'POST', ... })` outside wrap throws** (the generic entry point is guarded too).

## Files to Touch

- `tools/manual-story-studio/src/server/write-scope-guard.ts` (new)
- `tools/manual-story-studio/test/server/write-scope-guard.test.ts` (new)

## Out of Scope

- HTTP server scaffolding (`http.ts`, route registration) — ticket 006.
- Filesystem sandbox (`sandbox.ts`) — ticket 003. The route guard prevents misregistration; the sandbox enforces real-path discipline. Two layers, two tickets.
- Any modification to `tools/story-explorer/src/server/readonly-guard.ts` — Story Explorer is read-only and untouched per SPEC-100 §2 in-scope item 8 + §4 No modification list.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/write-scope-guard.test.js"` — all 6 test cases pass.
2. `grep -E "write-scope fence violation" tools/manual-story-studio/src/server/write-scope-guard.ts` — error message is exact match for the fence-violation string the test asserts.

### Invariants

1. Write methods (POST/PUT/PATCH/DELETE/OPTIONS) registered outside `wrapRouterWritable` throw at registration time, not at request time. (Architectural invariant — boundary violations are caught at boot/test, not at live request.)
2. The fence error message format is `write-scope fence violation: <METHOD> <path>` — parallel to Story Explorer's `read-only fence violation: <METHOD> <path>` format. (Data-contract invariant — log surface is parseable and pattern-aligned with the sibling guard.)

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/write-scope-guard.test.ts` — new file, 6 test cases covering the outside-scope-throws + inside-scope-succeeds matrix for all write methods + the generic `route()` entry point.

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/write-scope-guard.test.js"` — targeted test run.
2. `cd tools/manual-story-studio && npm test` — full chain (after this ticket lands, the backend tests include this file).
