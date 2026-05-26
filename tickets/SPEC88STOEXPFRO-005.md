# SPEC88STOEXPFRO-005: World Picker route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — wires `web/src/routes/worlds.tsx` as the `/` route, replacing T001's placeholder.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, archive/tickets/SPEC88STOEXPFRO-002.md, SPEC88STOEXPFRO-004

## Problem

The World Picker is the explorer's entry point — landing on `/` shows a list of all worlds under `worlds/` with index-freshness badges and story counts. Without this route, the explorer has no entry surface; users have no way to navigate from a bare URL into the story-reading flow. SPEC-88 §4.1 defines the exact rendering contract; this ticket implements it.

## Assumption Reassessment (2026-05-26)

1. T001 created `web/src/app.tsx` with a placeholder `/` route (`<p>Route: /</p>`); this ticket replaces it with the real `routes/worlds.tsx` component. T002 created `web/src/api/client.ts` with `listWorlds(): Promise<{ envelope, payload: WorldSummary[] }>`; the route consumes that fetcher. T004 created `web/src/components/IndexStatusBanner.tsx`; each world card consumes it for the per-world `indexStatus` badge. SPEC-87's `WorldSummary` type at `tools/story-explorer/src/view-models/world-summary.ts` declares the consumed fields: `worldSlug`, `displayName`, `path`, `indexStatus`, `storyCount`, `hasWorldDb`, `indexVersion`, `driftedFiles`, `errors`.
2. SPEC-88 §4.1 (post-reassessment) names the rendering contract: "Route: `/`. Lists all worlds under `worlds/`. Each card shows: world slug + display name; status badge: `Indexed` / `Stale index` / `Missing index` / `Empty world` / `Error`; story count; click → `/worlds/:slug/stories`. The picker does NOT require an index; it falls back to filesystem enumeration." The status-badge labels are user-visible UI strings that map from the 6 `IndexStatus.kind` values plus the `errors` array — implement the mapping in this route, not in `IndexStatusBanner` (which is for full banners; per-card badges are smaller).
3. Cross-skill boundary: this route is the first consumer of `IndexStatusBanner` from T004 and `listWorlds()` from T002. Drift in either contract surfaces here first. The route also reads `WorldSummary.errors` for the `Error` badge variant — that field is on every world response when filesystem-enumeration fallback hits a malformed world directory.

## Architecture Check

1. **Functional component wrapped in `<ErrorBoundary>`** at the route boundary — render-throw or fetch-throw becomes a polished error fallback per T004's contract, not a white screen. Wrapped at app.tsx level so every route inherits.
2. **`<Suspense fallback={<RouteLoading label="Loading worlds..." />}>`** wraps the data-dependent JSX; first paint shows a loading state while `listWorlds()` resolves. React 18 use-hook or react-router-dom v6 loader API both work; pick the loader API for cleaner code separation (data fetching declared at route definition, not in the component).
3. **Per-card status badge as a small derived component**, distinct from T004's full `IndexStatusBanner`. The badge is a compact pill (4-12 characters of text); the banner is a full-width row with remedy text. They share the severity-color tokens from T001's `tokens.css` but differ in layout. A spec-level decision (§4.1) — badges in pickers, banners on detail routes.
4. **No backwards-compatibility aliasing/shims introduced** — greenfield route.
5. **Card click as `<Link>`** (react-router-dom) not `<button onClick>` — preserves browser back/forward + middle-click-to-new-tab + right-click affordances that buttons break.

## Verification Layers

1. **Route renders world list from `listWorlds()`** → unit test with mocked client; assert each `WorldSummary` produces a card with slug + display name + story count.
2. **Status badge maps every IndexStatus.kind to a label** → unit test: render each of 6 kinds + the `errors`-non-empty case; assert the badge text matches §4.1's enumeration (`Indexed`, `Stale index`, `Missing index`, `Empty world`, `Error`).
3. **Card click navigates to `/worlds/:slug/stories`** → unit test: click a card; assert react-router navigation event fires with the correct path. T013 capstone re-verifies in the live integrated build.
4. **Empty-world-list state per §9** → unit test: client returns `[]`; assert the "No worlds found in this repository." message renders with a link to docs.

## What to Change

### 1. Create `tools/story-explorer/web/src/routes/worlds.tsx`

Functional component implementing §4.1's contract. Structure:
- Use react-router-dom v6 `useLoaderData()` (data fetched via the route's loader) OR a `useEffect` + `useState` pattern (simpler but less idiomatic for v6 — implementer's choice; both are acceptable).
- Renders `<h1>Worlds</h1>` plus a grid/list of world cards.
- Empty state: when `worlds.length === 0`, renders "No worlds found in this repository." plus a documentation link per §9.
- Each card: world slug, display name, status badge (per the §4.1 enumeration), story count, click handler navigating to `/worlds/${worldSlug}/stories`.
- Inline `<WorldStatusBadge>` helper component (or sub-module) maps `IndexStatus.kind` + `errors[]` → badge label + severity.

### 2. Update `tools/story-explorer/web/src/app.tsx`

Replace the placeholder `/` route with the imported `routes/worlds.tsx`. If using the loader API, attach `loader: () => listWorlds()` to the route definition.

### 3. Create `tools/story-explorer/web/src/routes/worlds.test.tsx`

Tests covering:
- Mocked `listWorlds()` returns 3 worlds → 3 cards render with correct content.
- Mocked `listWorlds()` returns empty array → "No worlds found" message renders.
- Each of 6 `IndexStatus.kind` values + `errors`-non-empty case produces the expected badge label.
- Card click navigates to `/worlds/:slug/stories`.

## Files to Touch

- `tools/story-explorer/web/src/routes/worlds.tsx` (new)
- `tools/story-explorer/web/src/routes/worlds.test.tsx` (new)
- `tools/story-explorer/web/src/app.tsx` (modify — replace `/` placeholder with imported route)

## Out of Scope

- Other routes (T006-T008 land separately).
- Full-row `<IndexStatusBanner>` on the world picker — §4.1 specifies per-card badges only; the banner appears on detail routes (T011 wires it).
- World creation / editing UI — explorer is read-only per SPEC-87 §6 fence.
- Filtering / sorting / search across worlds — out of v1 scope per IMPLEMENTATION-ORDER Named Assumption E.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- worlds.test` — all 4 test cases pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. The route never throws when `listWorlds()` succeeds with `[]` — empty state is a designed UI, not an error.
2. Card click is a `<Link>` (preserves browser navigation affordances), not a `<button onClick>`.
3. Per-card badge label maps deterministically from `IndexStatus.kind` + `errors[]` — no LLM summaries per SPEC-87 §10.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/worlds.test.tsx` (new) — verifies §4.1 contract.

### Commands

1. `cd tools/story-explorer/web && npm test -- worlds.test` — targeted route test.
2. `cd tools/story-explorer/web && npm test` — full vitest suite.
3. `cd tools/story-explorer/web && npm run build` — TypeScript verification.
