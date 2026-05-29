# SPEC98STOEXPSCE-003: Search frontend — SearchModal + search() client + /search route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer` web frontend: new `SearchModal` component + `/search` route + `search()` client function. Read-only UI over the SPEC98STOEXPSCE-001 search route; no backend or canon impact.
**Deps**: SPEC98STOEXPSCE-001

## Problem

SPEC-98 §2 item 4 (D4, search portion) requires a `SearchModal` frontend surface: a query input, grouped results (by containing scene / unscened range / branch-level), a jump-to-segment action wired to timeline/scene focus, and keyboard navigation — hosted in an accessible focus-trapped modal (WAI-ARIA APG: focus trap, Escape closes, focus returns) reusing the SPEC-97 shell. The frontend `client.ts` currently has no `search()` function. This ticket adds the search client function, the `SearchModal` component, and the `/search` route.

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/web/src/api/client.ts` exists and exposes the enveloped-fetch pattern (`fetchEnveloped`, `EnvelopedResult<T>`); there is currently no `search()` function (confirmed via grep). `tools/story-explorer/web/src/app.tsx` defines routes via `createBrowserRouter` / a `routes: RouteObject[]` array (worlds, stories, story-dashboard, timeline, scenes, unscened, scene-detail) wrapped in `RouteFrame` (ErrorBoundary + Suspense); there is no `/search` route yet. Route components live under `web/src/routes/*.tsx` (e.g., `routes/scenes.tsx`), with a11y tests as `*.a11y.test.tsx` and component tests as `*.test.tsx` (vitest).
2. Spec surface: SPEC-98 §2 item 4 + §7 criterion 4 — `SearchModal` hosts query input, grouped results, jump-to-segment (wired to timeline/scene focus), keyboard nav, inside a focus-trapped drawer/modal (focus trap, Escape closes, focus returns) reusing SPEC-97's shell. The grouped-results shape consumes the `SearchHit` container view-model produced by SPEC98STOEXPSCE-001.
3. Cross-artifact boundary under audit: the `search()` client function consumes the `GET .../search?q=&kinds=&domains=&groupBy=…` route + `SearchHit` view-model contract delivered by SPEC98STOEXPSCE-001 (hence `Deps: 001`). The component reuses the existing SPEC-97 shell primitives (`RouteFrame`, ErrorBoundary, Suspense, the `disclosure/` + a11y-test helpers under `web/src/`). `client.ts` and `app.tsx` are shared with SPEC98STOEXPSCE-004 (each adds its own function / route entry — mechanical, no Deps between 003 and 004).

## Architecture Check

1. `SearchModal` is a drawer/modal opened over the existing scene-first shell, not a permanent dominant surface — it reuses SPEC-97's focus-trap/Escape/focus-return primitives rather than introducing a parallel modal system, and `search()` follows the established `fetchEnveloped` client pattern so the index-status envelope surfaces in the UI unchanged.
2. No backwards-compatibility shim: `search()` is a net-new additive client function; no page-search client is carried forward (none exists — SPEC-90 was never implemented).

## Verification Layers

1. `search()` client contract → vitest unit test asserting it issues `GET .../search` with `q`/`kinds`/`domains`/`groupBy` params and returns the enveloped `SearchHit` grouped shape.
2. Accessible modal behavior → `SearchModal.a11y.test.tsx` asserting focus trap, Escape closes, focus returns to the invoker (WAI-ARIA APG).
3. Grouped-results rendering + jump-to-segment → `SearchModal.test.tsx` asserting hits render grouped by container and the jump action dispatches timeline/scene focus; keyboard nav moves between results.

## What to Change

### 1. `search()` client function (`web/src/api/client.ts`)

Add `export function search(slug, storySlug, q, opts?)` issuing `GET /api/worlds/:slug/stories/:storySlug/search` with `q` + optional `kinds`/`domains`/`groupBy`, returning `Promise<EnvelopedResult<SearchHit-grouped-shape>>` via `fetchEnveloped` (mirror the existing client function shape).

### 2. `SearchModal` component (`web/src/components/SearchModal.tsx`)

Query input + grouped results list (containing scene / unscened range / branch-level), jump-to-segment action wired to timeline/scene focus, keyboard navigation, hosted in a focus-trapped modal reusing the SPEC-97 shell's focus-trap/Escape/focus-return behavior. Raw record bodies are expandable (not dumped) per the `SearchHit` contract.

### 3. `/search` route (`web/src/routes/search.tsx` + `web/src/app.tsx`)

Add a `search` route component that hosts `SearchModal`, and register `{ path: "...search...", element: <RouteFrame…><SearchRoute/></RouteFrame> }` in the `app.tsx` routes array (coordinate the array edit with SPEC98STOEXPSCE-004's `/branch-map` entry — different array entries, mechanical).

## Files to Touch

- `tools/story-explorer/web/src/components/SearchModal.tsx` (new)
- `tools/story-explorer/web/src/components/SearchModal.a11y.test.tsx` (new)
- `tools/story-explorer/web/src/components/SearchModal.test.tsx` (new)
- `tools/story-explorer/web/src/routes/search.tsx` (new)
- `tools/story-explorer/web/src/api/client.ts` (modify — add `search()`; shared with SPEC98STOEXPSCE-004)
- `tools/story-explorer/web/src/app.tsx` (modify — add `/search` route; shared with SPEC98STOEXPSCE-004)

## Out of Scope

- The search backend route / read module / `SearchHit` view-model → SPEC98STOEXPSCE-001.
- `BranchMapCanvas`, scene-layer `getBranchMap()`, frontend mirror-type replacement, `/branch-map` route → SPEC98STOEXPSCE-004.
- Any backend or `_source/` change — this is a read-only UI ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — `SearchModal.a11y.test.tsx` (focus trap / Escape / focus return) and `SearchModal.test.tsx` (grouped rendering, jump-to-segment, keyboard nav) and the `search()` client unit test pass.
2. `grep -n "export function search" tools/story-explorer/web/src/api/client.ts` → matches; `grep -n "search" tools/story-explorer/web/src/app.tsx` → `/search` route registered.
3. `cd tools/story-explorer && npm test` — full pipeline (backend + web) passes.

### Invariants

1. `SearchModal` is modal/drawer-scoped, accessible (focus trap, Escape, focus return), and reuses the SPEC-97 shell — never a permanent dominant surface.
2. The index-status envelope from the backend surfaces in the UI; the modal does not fabricate results when the backend reports a stale index.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/SearchModal.a11y.test.tsx` (new) — WAI-ARIA APG focus-trap/Escape/focus-return.
2. `tools/story-explorer/web/src/components/SearchModal.test.tsx` (new) — grouped-results rendering, jump-to-segment dispatch, keyboard nav.
3. `tools/story-explorer/web/src/api/client.ts` (modify) — `search()` covered by a vitest unit assertion (in `client.test.ts` or the component test) for the request shape + enveloped return.

### Commands

1. `cd tools/story-explorer/web && npm test` (targeted web vitest).
2. `cd tools/story-explorer && npm test` (full pipeline: backend `node --test` + web `vitest`).
