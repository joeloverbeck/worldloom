# SPEC103PROPASSEG-009: Manuscript HTTP routes — GET manuscript + POST rebuild

**Status**: COMPLETED
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

## Landed Changes

### 1. Create src/server/routes/manuscript.ts

Created `registerManuscriptReadRoute` and `registerManuscriptWriteRoute` in `tools/manual-story-studio/src/server/routes/manuscript.ts`.

- `GET /api/worlds/:slug/manual-stories/:msSlug/manuscript` resolves the manual-story root, calls `readManuscript`, returns the manuscript body/count payload, and returns `{ error: "manuscript_not_found" }` when `manuscript.md` has not been compiled.
- `POST /api/worlds/:slug/manual-stories/:msSlug/manuscript/rebuild` resolves the manual-story root, calls `compileManuscript`, and returns the compiler result.

### 2. Modify src/server/http.ts

Registered the GET route outside `wrapRouterWritable` and the POST rebuild route inside the existing `wrapRouterWritable` block after the segments routes.

**Shared-file overlap with ticket 008**: tickets 008 + 009 each add their own pair of register calls at sibling positions in `createServer`. Implementers coordinate the line order (segments routes first, manuscript routes following the segments routes); conflicts are mechanical only.

### 3. Create test/server/manuscript-routes.test.ts

Added `tools/manual-story-studio/test/server/manuscript-routes.test.ts`, covering:

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

## Outcome

Completed: 2026-05-31

The Manual Story Studio backend now exposes the SPEC-103 manuscript HTTP surface. `src/server/routes/manuscript.ts` adds the read and rebuild handlers, `src/server/http.ts` registers GET outside the write guard and POST rebuild inside `wrapRouterWritable`, and `test/server/manuscript-routes.test.ts` proves normal read, missing manuscript, non-empty rebuild, empty rebuild, and idempotent rebuild behavior.

## Verification Result

1. `cd tools/manual-story-studio && npm run build:backend` — passed.
2. `cd tools/manual-story-studio && node --test "dist/test/server/manuscript-routes.test.js"` — passed, 5/5 subtests.
3. `cd tools/manual-story-studio && npm test` — passed; backend build, 268 backend tests, and web TypeScript check completed successfully.

## Deviations

None.
