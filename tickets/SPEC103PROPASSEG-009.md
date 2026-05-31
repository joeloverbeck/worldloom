# SPEC103PROPASSEG-009: Manuscript HTTP routes — GET manuscript + POST rebuild

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/src/server/routes/manuscript.ts` + paired test under `tools/manual-story-studio/test/server/manuscript-routes.test.ts`; modifies `tools/manual-story-studio/src/server/http.ts` to register the new routes (shared-file overlap with ticket 008's segments routes).
**Deps**: archive/tickets/SPEC103PROPASSEG-006.md, archive/tickets/SPEC103PROPASSEG-007.md

## Problem

SPEC-103 §2 item 4 + §2 item 5 + §7 AC#4 require two manuscript HTTP endpoints: GET to read the compiled `manuscript.md` body (for the Manuscript view's full-render display) and POST to trigger a manual rebuild (the Rebuild Manuscript button, useful when the author edits a segment's prose file directly, when `compile_on_segment_save: false`, or when manual segment reordering happens). The route module wraps ticket 006's compiler + ticket 007's `readManuscript` in Fastify handlers behind the SPEC-100 `wrapRouterWritable` write-scope guard (for POST rebuild) at `tools/manual-story-studio/src/server/http.ts`.

## Assumption Reassessment (2026-05-31)

1. Existing `tools/manual-story-studio/src/server/http.ts:53-83` uses the same read/write registration split pattern as ticket 008's segments routes. The POST /rebuild endpoint must register inside `wrapRouterWritable` because it triggers a file write to `manuscript.md`; the GET /manuscript endpoint registers outside the write guard since it only reads. Existing `routes/prompts.ts:106-200` is the closest pattern for the read-route surface; existing `routes/records.ts` for the write-route surface.
2. SPEC-103 §2 item 4 (compiler triggered automatically on save when `compile_on_segment_save: true`), §2 item 5 (Rebuild Manuscript command — backend route `POST /api/.../manuscript/rebuild` + frontend button), §7 AC#4 ("manuscript.md recompiles automatically when `compile_on_segment_save: true`; manual Rebuild button works"), §4 Create includes `src/server/routes/manuscript.ts`, §4 Modify includes `src/server/http.ts`.
3. Cross-skill boundary: `http.ts` is also modified by ticket 008 (segments routes) — mechanical merge per §Step 6 item 5 shared-file overlap; this ticket's two register calls land at sibling positions in `createServer`, alongside the segments routes' calls (each adds its own `await register*Routes(...)` lines; conflicts are line-level only). The route module consumes ticket 006 (`compileManuscript`) and ticket 007 (`readManuscript`).

## Architecture Check

1. Route module follows the existing `routes/*.ts` pattern (separate read + write register functions; POST register inside `wrapRouterWritable`). The POST rebuild's idempotence (re-compile same inputs → byte-identical output per ticket 006's determinism invariant) means a duplicate POST is harmless — no token-based dedup needed.
2. No backwards-compatibility aliasing — net-new routes; `http.ts` modification is purely additive.

## Verification Layers

1. GET /api/worlds/:slug/manual-stories/:msSlug/manuscript invokes ticket 007's `readManuscript`; returns 200 with `{ body, byte_count, word_count, manuscript_path }` or 404 when `manuscript.md` not yet compiled → route test (two sub-cases)
2. POST /api/worlds/:slug/manual-stories/:msSlug/manuscript/rebuild invokes ticket 006's `compileManuscript`; returns 200 with `{ manuscript_path, segments_compiled, byte_count }` → route test
3. POST /rebuild on a fixture with empty `segment_order` writes an empty `manuscript.md` (legitimate state per SPEC-103 §8 Risks) and returns 200 with `segments_compiled: 0` → route test

## What to Change

### 1. Create src/server/routes/manuscript.ts

Implement `registerManuscriptReadRoute` (GET) and `registerManuscriptWriteRoute` (POST rebuild), following `tools/manual-story-studio/src/server/routes/prompts.ts:106-242` shape:

```typescript
import type { FastifyInstance } from "fastify";
import {
  resolveManualStoryRoot,
  type ManualStoryRoot,
} from "../../write/sandbox.js"; // verify exact export at impl time
import { readManuscript } from "../../read/manuscript.js";
import { compileManuscript } from "../../manuscript/compile.js";

export interface ManuscriptRouteOptions {
  repoRoot: string;
}

export async function registerManuscriptReadRoute(
  server: FastifyInstance,
  options: ManuscriptRouteOptions,
): Promise<void> {
  server.get<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/manuscript",
    async (request, reply) => {
      // resolve root; readManuscript; return 200 + body or 404
    },
  );
}

export async function registerManuscriptWriteRoute(
  server: FastifyInstance,
  options: ManuscriptRouteOptions,
): Promise<void> {
  server.post<{ Params: { slug: string; msSlug: string } }>(
    "/api/worlds/:slug/manual-stories/:msSlug/manuscript/rebuild",
    async (request, reply) => {
      // resolve root; compileManuscript; return 200 + result
    },
  );
}
```

### 2. Modify src/server/http.ts

Add imports at the top:

```typescript
import {
  registerManuscriptReadRoute,
  registerManuscriptWriteRoute,
} from "./routes/manuscript.js";
```

Inside `createServer`, after ticket 008's `registerSegmentsReadRoutes(server, ...)` call, add:

```typescript
await registerManuscriptReadRoute(server, { repoRoot: options.repoRoot });
```

Inside the `wrapRouterWritable` block, after ticket 008's `registerSegmentsWriteRoutes(...)` call, add:

```typescript
await registerManuscriptWriteRoute(writableRouter, {
  repoRoot: options.repoRoot,
});
```

**Shared-file overlap with ticket 008**: tickets 008 + 009 each add their own pair of register calls at sibling positions in `createServer`. Implementers coordinate the line order (segments routes first, manuscript routes following the segments routes); conflicts are mechanical only.

### 3. Create test/server/manuscript-routes.test.ts

Per the existing `test/server/prompts-routes.test.ts` pattern, cover:

- GET /manuscript on fixture with compiled `manuscript.md` → 200 + body + byte_count + word_count
- GET /manuscript on fixture without `manuscript.md` → 404 + `{ error: "manuscript_not_found" }`
- POST /manuscript/rebuild on fixture with 3 segments → 200 + `segments_compiled: 3` + non-zero byte_count
- POST /manuscript/rebuild on fixture with empty `segment_order` → 200 + `segments_compiled: 0` + zero or near-zero byte_count (legitimate empty manuscript per SPEC-103 §8 Risks)
- POST /manuscript/rebuild is idempotent: two consecutive calls produce byte-identical `manuscript.md` (determinism inherited from ticket 006 compiler)

## Files to Touch

- `tools/manual-story-studio/src/server/routes/manuscript.ts` (new)
- `tools/manual-story-studio/test/server/manuscript-routes.test.ts` (new)
- `tools/manual-story-studio/src/server/http.ts` (modify — register new routes; shared-file overlap with ticket 008)

## Out of Scope

- Segments routes (covered by ticket 008; the `http.ts` shared-file overlap is mechanical only)
- Frontend Manuscript view rendering (covered by ticket 013)
- Compiler determinism details (owned by ticket 006; this ticket inherits the invariant)
- The write-scope guard logic itself (existing SPEC-100 surface; this ticket only registers a new POST route inside the existing guard)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/manuscript-routes.test.js"` — manuscript-routes tests pass
2. `cd tools/manual-story-studio && npm test` — full suite green; segments routes (ticket 008) and other existing routes unaffected

### Invariants

1. POST /manuscript/rebuild registers inside `wrapRouterWritable`; GET /manuscript registers outside it.
2. POST /manuscript/rebuild is idempotent: same inputs → byte-identical `manuscript.md` across consecutive calls (inherited from ticket 006 compiler determinism per SPEC-103 §7 AC#5).
3. Empty `segment_order` produces an empty `manuscript.md` without error (legitimate state per SPEC-103 §8 Risks).

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/manuscript-routes.test.ts` (new) — covers GET (200 / 404), POST rebuild (non-empty / empty / idempotent).

### Commands

1. `cd tools/manual-story-studio && npm run build:backend && node --test "dist/test/server/manuscript-routes.test.js"` — targeted manuscript-routes test
2. `cd tools/manual-story-studio && npm test` — full pipeline verification
