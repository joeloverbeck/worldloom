# SPEC88STOEXPFRO-007: Page Entry route

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — wires `web/src/routes/page-entry.tsx` as the `/worlds/:slug/stories/:storySlug/entry` route, replacing T001's placeholder.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, SPEC88STOEXPFRO-002, SPEC88STOEXPFRO-004

## Problem

After picking a story from T006, users land on the Page Entry screen — a small interstitial that defaults to opening PG-1 with secondary options (start at root, open latest leaf, choose page, open last viewed). Without this route, users would jump directly from the Story Picker into the Reading Page, missing the chance to deep-link to a specific page or resume where they left off. SPEC-88 §4.3 defines the exact options; this ticket implements it, including the "Open last viewed" entry that reads T002's local-storage prefs.

## Assumption Reassessment (2026-05-26)

1. T001 created the placeholder `/worlds/:slug/stories/:storySlug/entry` route. T002 created `getRootPage(slug, storySlug)`, `getLatestPage(slug, storySlug)`, `getLastViewedPage(storySlug)` (from `prefs/local-storage.ts`). T004's `RouteLoading` covers the brief fetch latency for the entry-screen's metadata. SPEC-88 §4.3 (post-reassessment) names the entry options: "Per proposal §5 'Page Entry Choice', default action opens `PG-1`. Secondary options on the same screen: 'Start at root' (PG-1), 'Open latest leaf', 'Choose page' (links into SPEC-90's search/jump when that lands; until then, plain input box), 'Open last viewed' — only when `prefs/local-storage.ts` has a record for this story slug".
2. SPEC-88 §4.3 also commits: "Default click moves to `/worlds/:slug/stories/:storySlug/pages/PG-1`." The default action is implicit (no further interaction needed) — the entry screen surfaces it as a prominent button but the route also auto-redirects when no other choice is made within a short interaction window. Implementer judgment: prefer the explicit-button approach over auto-redirect, since auto-redirect breaks back-button affordances and rushes users who want secondary options.
3. Cross-skill boundary: this route consumes both backend fetchers (root/latest page) AND client-side local-storage prefs. The local-storage read is gated by `if (getLastViewedPage(storySlug) !== null)` — the option only appears when a record exists. The "Choose page" plain input is a v1 placeholder; SPEC-90 wires the full search/jump experience later.

## Architecture Check

1. **Route wrapped in `<ErrorBoundary>` + `<Suspense fallback={<RouteLoading label="Loading page entry..." />}>`** — same pattern as T005/T006.
2. **Default action as a prominent button**, not auto-redirect — preserves browser back-button semantics; users who landed here on purpose can still see the secondary options.
3. **"Open last viewed" conditionally renders** based on `getLastViewedPage(storySlug)` returning non-null. Per SPEC-88 §4.3, the option only appears when a record exists; no greyed-out "no last-viewed" placeholder.
4. **"Choose page" as a plain text input + submit** in v1 — accepts a PG-id string like `PG-12` and navigates to `/worlds/:slug/stories/:storySlug/pages/PG-12`. No validation beyond a regex check that the input matches `PG-\d+`; the destination route handles "PG not found" via its own 404 surface per §9.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield route.

## Verification Layers

1. **Default "Start at root" action navigates to PG-1** → unit test: mock `getRootPage` returning `{ pageId: 'PG-1', ... }`; click default button; assert navigation to `/worlds/:slug/stories/:storySlug/pages/PG-1`.
2. **"Open latest leaf" navigates to latest page** → unit test: mock `getLatestPage` returning `{ pageId: 'PG-12', ... }`; click button; assert navigation to `/worlds/:slug/stories/:storySlug/pages/PG-12`.
3. **"Open last viewed" conditionally renders** → unit test: when `getLastViewedPage` returns null, assert the option is absent; when returns 'PG-7', assert the option is present and click navigates to PG-7.
4. **"Choose page" input + submit navigates to entered PG-id** → unit test: enter "PG-5"; submit; assert navigation. Reject malformed inputs (e.g., empty or non-PG-id) with a small inline error.

## What to Change

### 1. Create `tools/story-explorer/web/src/routes/page-entry.tsx`

Functional component implementing §4.3's contract. Reads `worldSlug` and `storySlug` from URL params. Fetches `getRootPage(worldSlug, storySlug)` and `getLatestPage(worldSlug, storySlug)` (parallel awaits or two-loader composition).

Structure:
- `<h1>{storyTitle}</h1>`
- Prominent default button: "Start at root (PG-1)" → navigates to `/worlds/:slug/stories/:storySlug/pages/PG-1` (or whatever the root's pageId resolves to from `getRootPage`)
- Secondary buttons:
  - "Open latest leaf (PG-{n})" → navigates to `latest.pageId`
  - "Choose page" → reveals a `<input placeholder="PG-..." />` + submit button; navigates to entered PG-id (validates via `/^PG-\d+$/`)
  - "Open last viewed (PG-{n})" — conditionally rendered when `getLastViewedPage(storySlug) !== null`; navigates to the stored page-id
- Small footer text: "Or use the page-jump from the reading view (SPEC-90 will add search)."

### 2. Update `tools/story-explorer/web/src/app.tsx`

Replace the `/worlds/:slug/stories/:storySlug/entry` placeholder with the imported route.

### 3. Create `tools/story-explorer/web/src/routes/page-entry.test.tsx`

Tests covering each Verification Layer above (default-action navigation, latest-leaf navigation, conditional last-viewed rendering, choose-page input flow, malformed-input rejection).

## Files to Touch

- `tools/story-explorer/web/src/routes/page-entry.tsx` (new)
- `tools/story-explorer/web/src/routes/page-entry.test.tsx` (new)
- `tools/story-explorer/web/src/app.tsx` (modify — replace placeholder with imported route)

## Out of Scope

- SPEC-90's full search/jump experience — this ticket ships the v1 plain input only.
- Multi-page bookmarking / favorites — out of v1 scope.
- Server-side persistence of last-viewed (it's local-storage only per §3).
- The actual reading page (T008 wires that).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- page-entry.test` — all test cases pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. Default action is a button click, not auto-redirect (preserves back-button affordances).
2. "Open last viewed" option is hidden when no record exists — no greyed-out placeholder.
3. "Choose page" input validates against `/^PG-\d+$/` before navigation — rejects malformed inputs with an inline error rather than producing a broken URL.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/page-entry.test.tsx` (new) — verifies §4.3 contract.

### Commands

1. `cd tools/story-explorer/web && npm test -- page-entry.test` — targeted route test.
2. `cd tools/story-explorer/web && npm test` — full vitest suite.
3. `cd tools/story-explorer/web && npm run build` — TypeScript verification.
