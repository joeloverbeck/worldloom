# SPEC88STOEXPFRO-011: Empty / degraded states + 404 + backend-unreachable

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies T005/T006/T008 routes to integrate `<IndexStatusBanner>` for all 6 IndexStatus kinds; adds 404 and backend-unreachable global error surfaces.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, archive/tickets/SPEC88STOEXPFRO-005.md, archive/tickets/SPEC88STOEXPFRO-006.md, archive/tickets/SPEC88STOEXPFRO-007.md, archive/tickets/SPEC88STOEXPFRO-008.md

## Problem

The explorer must gracefully handle every degraded state SPEC-87's backend can surface: 6 `IndexStatus.kind` values (`fresh`, `missing`, `stale`, `empty`, `version_mismatch`, `open_failed`), 404 Page-Not-Found responses, and complete backend-unreachable (network down, backend process not running). Without this ticket, individual routes have inconsistent degraded-state handling: T005's World Picker handles its per-card badges; T006's Story Picker shows world-level banner; T008's Reading Page has no degraded-state surface at all. T013 capstone validation would fail against any non-fresh fixture. SPEC-88 §9 (post-reassessment) defines the matrix; this ticket lands the cross-route integration.

## Assumption Reassessment (2026-05-26)

1. T004 created `<IndexStatusBanner>` covering all 6 `IndexStatus.kind` variants including the audit-added `open_failed` case. T005 / T006 / T008 created routes with route-internal envelope handling but no consistent banner integration. T011 ties it together: every route that consumes envelope-bearing responses renders `<IndexStatusBanner>` at the top when `envelope.worldIndexStatus.kind !== 'fresh'`. T002's `fetchEnveloped` helper exposes the envelope on every response, so the integration is mechanical — pass envelope to the route's top section, render banner.
2. SPEC-88 §9 (post-reassessment) names the matrix: 6 `indexStatus.kind` cases (4 from original spec + `open_failed` added by the reassessment audit) + Page-Not-Found (404) + Backend-Unreachable (network error). World-list-empty and Story-list-empty cases are owned by T005 / T006 respectively (they're empty-state UI, not degraded backend state). 404 surface: "Polished 404 with link to story root." Backend-unreachable: "Polished error with retry button." Live React Router reassessment corrected the original fallback shape: loader failures are handled by route `errorElement` / `useRouteError`, while T004's `<ErrorBoundary>` remains the render-time subtree fallback.
3. Cross-skill boundary: this ticket spans 5 route/app files — `routes/{worlds,stories,page-entry,page-read}.tsx` + `app.tsx` (for shared route `errorElement` wiring) — plus new shared components/hooks/tests. The route modifications are mechanical (add IndexStatusBanner integration at the top). Loader-level 404/backend-unreachable surfaces use React Router `errorElement`; render-time subtree throws still use T004's `<ErrorBoundary>`. The §Intra-batch shared-file create-then-modify chains rule applies — T011 modifies route files that T005/T006/T007/T008 created `(new)`; Deps declared accordingly.

## Architecture Check

1. **Banner placement consistency** — `<IndexStatusBanner>` renders at the top of every data-dependent route (World Picker / Story Picker / Reading Page) when `envelope.worldIndexStatus.kind !== 'fresh'`. Conditional render avoids the banner showing for fresh-index reads. Centralized in a small `useIndexStatusBanner(envelope)` hook that returns the banner JSX or `null`; routes call the hook at the top and render its result.
2. **404 as a route-level `errorElement` fallback** — when a loader throws `ApiError.status === 404`, the route error element renders `<NotFoundPage worldSlug={...} storySlug={...} />` with a link back to the story root (or world picker, when story slug unavailable). The 404 surface is route-aware — the link target adapts based on which route caught the error.
3. **Backend-unreachable as a route-level retry fallback** — route `errorElement` catches network-style loader failures and renders a polished retry surface with a button that calls React Router revalidation, not `window.location.reload()`.
4. **`<NotFoundPage>` and `<BackendUnreachablePage>` as new shared components** — both live in `components/` alongside the cross-cutting infrastructure. Used by route-level `errorElement` fallbacks.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield additions plus mechanical route modifications.

## Verification Layers

1. **IndexStatusBanner renders on every route for non-fresh status** → unit tests per route: mock envelope with each of 5 non-fresh kinds; assert banner present at top.
2. **Fresh status → no banner** → unit tests per route: mock `envelope.worldIndexStatus.kind === 'fresh'`; assert banner absent.
3. **404 → NotFoundPage** → unit test: mock `getPageDetail` throwing `ApiError({status: 404})`; assert NotFoundPage renders with story-root link.
4. **Backend-unreachable → BackendUnreachablePage** → unit test: mock `fetch` rejecting with network error; assert BackendUnreachablePage renders with retry button; click retry → re-fetch attempted.
5. **`open_failed` banner shows backend error string** → unit test (route or banner component): mock `envelope.worldIndexStatus = { kind: 'open_failed', error: 'EACCES: permission denied' }`; assert banner renders the error text.

## Landed Changes

### 1. Create `tools/story-explorer/web/src/components/NotFoundPage.tsx`

Functional component. Props:
```ts
interface NotFoundPageProps {
  worldSlug?: string;
  storySlug?: string;
  resourceLabel?: string; // e.g., "page", "story", "world"
}
```
Renders a polished 404: "Page not found." (or contextual variant) with a "← Back to story root" link (when storySlug present) or "← Back to worlds" link (otherwise).

### 2. Create `tools/story-explorer/web/src/components/BackendUnreachablePage.tsx`

Functional component. Props:
```ts
interface BackendUnreachablePageProps {
  onRetry: () => void;
}
```
Renders: "Backend is unreachable." + "Check that the explorer backend is running (`npm start --prefix tools/story-explorer`) and try again." + retry button calling `onRetry`.

### 3. Create `tools/story-explorer/web/src/hooks/use-index-status-banner.tsx`

Small hook returning banner JSX or null:
```tsx
export function useIndexStatusBanner(envelope: ResponseEnvelope | null): React.ReactNode {
  if (!envelope?.worldIndexStatus || envelope.worldIndexStatus.kind === 'fresh') {
    return null;
  }
  return <IndexStatusBanner status={envelope.worldIndexStatus} />;
}
```

### 4. Modify `tools/story-explorer/web/src/routes/worlds.tsx`

Add `useIndexStatusBanner` integration at the top of the rendered tree. Per-card status badges (added in T005) remain unchanged; the route-level banner is for the world-list-fetch envelope (typically `kind: 'fresh'` since the list endpoint doesn't depend on per-world indices; the banner only fires if some global error envelope arrives — implementer judgment may make this banner-call a no-op for the worlds endpoint).

### 5. Modify `tools/story-explorer/web/src/routes/stories.tsx`

Add `useIndexStatusBanner` at top — T006 already had a world-level banner for `getWorld()`'s envelope; this ticket ensures it covers all 6 IndexStatus kinds including `open_failed`.

### 6. Modify `tools/story-explorer/web/src/routes/page-read.tsx`

Add `useIndexStatusBanner` at top — covers `getPageDetail()`'s envelope. The page route uses the shared app `errorElement` for loader-level 404/backend-unreachable dispatch.

### 7. Modify `tools/story-explorer/web/src/app.tsx`

Add a shared route error element that dispatches loader errors by type/status: 404 to `<NotFoundPage>`, network-style failures to `<BackendUnreachablePage>`, and all other loader failures to the existing generic route error surface.

### 8. Create tests

- `tools/story-explorer/web/src/components/NotFoundPage.test.tsx`
- `tools/story-explorer/web/src/components/BackendUnreachablePage.test.tsx`
- `tools/story-explorer/web/src/hooks/use-index-status-banner.test.tsx`
- `tools/story-explorer/web/src/app.test.tsx`
- Updates to existing route tests: assert IndexStatusBanner integration for non-fresh kinds.

## Files to Touch

- `tools/story-explorer/web/src/components/NotFoundPage.tsx` (new)
- `tools/story-explorer/web/src/components/NotFoundPage.test.tsx` (new)
- `tools/story-explorer/web/src/components/BackendUnreachablePage.tsx` (new)
- `tools/story-explorer/web/src/components/BackendUnreachablePage.test.tsx` (new)
- `tools/story-explorer/web/src/hooks/use-index-status-banner.tsx` (new)
- `tools/story-explorer/web/src/hooks/use-index-status-banner.test.tsx` (new)
- `tools/story-explorer/web/src/app.test.tsx` (new)
- `tools/story-explorer/web/src/routes/worlds.tsx` (modify — adds banner integration)
- `tools/story-explorer/web/src/routes/stories.tsx` (modify — adds banner integration)
- `tools/story-explorer/web/src/routes/page-entry.tsx` (modify — adds banner integration)
- `tools/story-explorer/web/src/routes/page-entry.test.tsx` (modify — adds banner-integration assertion)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — adds banner integration)
- `tools/story-explorer/web/src/app.tsx` (modify — adds shared route `errorElement` for 404/backend-unreachable)

## Out of Scope

- SPEC-89's Validation & Integrity tab (the X-Ray surface that the missing-prose placeholder anchors point to).
- Backend recovery automation (read-only fence; explorer never invokes `world-index sync`).
- Generic 500 / 502 / 503 status-code dispatch beyond the catchall — those land as `GenericErrorPage` for v1.
- Offline-mode caching / service workers — out of v1 scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- NotFoundPage BackendUnreachablePage use-index-status-banner` — all tests pass.
2. `cd tools/story-explorer/web && npm test -- worlds.test stories.test page-read.test` — updated route tests pass.
3. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. Every route renders IndexStatusBanner at the top for non-fresh envelope kinds; no route silently ignores degraded backend state.
2. 404 surfaces have route-aware back links (story-root when storySlug present, worlds-root otherwise) — generic "back to home" is not sufficient.
3. Backend-unreachable retry button re-fetches; it does NOT page-reload (preserves any in-progress client state).
4. The `open_failed` IndexStatus kind surfaces the backend's `error` string verbatim in the banner — gives the user actionable diagnostic info.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/NotFoundPage.test.tsx` (new)
2. `tools/story-explorer/web/src/components/BackendUnreachablePage.test.tsx` (new)
3. `tools/story-explorer/web/src/hooks/use-index-status-banner.test.tsx` (new)
4. `tools/story-explorer/web/src/app.test.tsx` (new)
5. Updates to T005/T006/T008's existing route tests (add banner-integration assertions).

### Commands

1. `cd tools/story-explorer/web && npm test` — full vitest suite.
2. `cd tools/story-explorer/web && npm run build` — TypeScript verification.

## Outcome

Completed: 2026-05-26

The web explorer now renders envelope-level `IndexStatusBanner` content at the top of the world picker, story picker, page entry route, and reading page whenever the API envelope carries a non-fresh `worldIndexStatus`. The route-level error surface now dispatches loader failures through React Router `errorElement`: 404 `ApiError` values render a contextual `NotFoundPage` with a story-root/worlds-root link, network-style failures render `BackendUnreachablePage`, and the retry button revalidates the route without a page reload. Render-time subtree errors remain covered by T004's `ErrorBoundary`.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- NotFoundPage BackendUnreachablePage use-index-status-banner app worlds.test stories.test page-entry.test page-read.test` — passed 8 test files / 31 tests. React Router emitted v7 future-flag warnings only.
2. `cd tools/story-explorer/web && npm test` — passed 24 test files / 78 tests. React Router emitted v7 future-flag warnings only.
3. `cd tools/story-explorer/web && npm run build` — passed; TypeScript and Vite production build completed.

## Deviations

1. The drafted `<ErrorBoundary renderFallback>` plan was corrected during reassessment because React Router loader failures are handled by `errorElement`, not by the rendered child element's error boundary. The implemented `errorElement` route surface is the truthful 404/backend-unreachable boundary.
2. `tools/story-explorer/web/src/app.test.tsx` was added to prove the shared app-level route error dispatch and retry revalidation behavior directly.
