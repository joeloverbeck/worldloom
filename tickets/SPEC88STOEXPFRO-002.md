# SPEC88STOEXPFRO-002: API client + preferences + lib utilities

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `web/src/api/`, `web/src/prefs/`, `web/src/lib/` modules under T001's scaffold; no backend changes.
**Deps**: SPEC88STOEXPFRO-001

## Problem

Every route in T005-T011 fetches data from SPEC-87's HTTP API and renders it. Without a typed API client mirroring SPEC-87's view-model surface, each route would either fetch ad-hoc with raw `fetch()` calls and untyped responses (losing type safety across the SPEC-87 → SPEC-88 boundary), or duplicate type declarations across routes. A single typed client centralizes the boundary contract and the envelope-handling logic. Similarly, last-viewed page tracking and markdown sanitization belong in shared modules consumed by multiple routes.

## Assumption Reassessment (2026-05-26)

1. SPEC-87 backend view-models exist at `tools/story-explorer/src/view-models/*.ts` (confirmed by `ls`): `world-summary.ts`, `story-summary.ts`, `page-summary.ts`, `page-detail.ts`, `choice-navigation.ts`, `child-outcome-variant.ts`, `index-status.ts`, `record-card.ts`, `record-link.ts`, `branch-map-edge.ts`, `branch-map-node.ts`. These types are the SOURCE-OF-TRUTH for the API client — `web/src/api/client.ts` must mirror them exactly. Hand-typed copies in the web client risk drift; the client should re-declare matching interfaces or import via copy-paste with a comment naming the upstream source (no `import` across the sub-tree boundary per T001 invariant 1). The response envelope (`{ _envelope: ResponseEnvelope, ...payload }`) is documented at SPEC-87 §5 — surface it as a thin generic wrapper on every fetch call.
2. SPEC-88 §3 (post-reassessment) names `web/src/api/client.ts`, `web/src/prefs/local-storage.ts`, `web/src/lib/sanitize-markdown.ts`, and `web/src/lib/format.ts`. The prefs module per §3 stores last-viewed page and theme in browser local storage only — never written to repo files. The sanitize-markdown helper supports T009's prose rendering per §5 ("Markdown sanitization (no embedded HTML; safe link handling — links to other PG/CHC/SE IDs are detected and routed; external links are external)").
3. Cross-skill boundary: the API client is the ONLY surface where SPEC-88 consumes SPEC-87's HTTP contract. Drift between client types and backend view-models is the load-bearing risk — a backend view-model field addition or rename without client update silently breaks every consuming route. T013 capstone covers integration; this ticket carries the contract.

## Architecture Check

1. **Re-declared types over cross-package imports** — the API client re-declares the view-model interfaces verbatim (paste, not import) because importing across the `web/` ↔ backend boundary violates T001 invariant 1. The interface-mirroring discipline is documented inline with a comment naming `tools/story-explorer/src/view-models/<name>.ts` as the source-of-truth, so a future reader knows where drift checks must run.
2. **Generic envelope unwrapper** — every fetch goes through one `fetchEnveloped<T>(url)` helper that parses `{ _envelope, ...payload }` and surfaces both halves. Routes that need only payload destructure it; routes that need envelope status (e.g., World Picker rendering the `worldIndexStatus` badge) destructure both. Avoids per-route envelope-handling boilerplate.
3. **No backwards-compatibility aliasing/shims introduced** — greenfield modules.
4. **Local-storage prefs are namespaced** under a `worldloom-story-explorer:` key prefix to avoid collisions with other tools serving from the same origin during dev.
5. **Markdown sanitization uses a library, not hand-rolled HTML stripping** — recommend `marked` + `dompurify` for the same reason a hand-rolled XSS filter is dangerous; the choice between specific libraries is left to the implementer but the contract is "sanitize before injection into the DOM, never bypass."

## Verification Layers

1. **Client types mirror backend view-models** → manual diff at implementation time + comment in each interface naming the upstream source path. T013 capstone exercises every route end-to-end against the real backend, catching drift at integration time.
2. **Envelope unwrapper handles missing envelope gracefully** → unit test: a response without `_envelope` is handled (either as an error or with `worldIndexStatus: null` per backend's documented behavior at `tools/story-explorer/src/server/http.ts:31`).
3. **Local-storage prefs round-trip** → unit test: write a last-viewed entry, read it back, assert equality. Confirms the namespace prefix doesn't break the read path.
4. **Markdown sanitization rejects embedded HTML** → unit test: input markdown containing `<script>alert(1)</script>` produces output with the script stripped. Catches the sanitization library being misconfigured.

## What to Change

### 1. Create `tools/story-explorer/web/src/api/client.ts`

Typed client mirroring SPEC-87's view-models. Structure:
- Re-declared interfaces (with comments naming `tools/story-explorer/src/view-models/<name>.ts` as source-of-truth): `WorldSummary`, `StorySummary`, `PageSummary`, `PageDetail`, `ChoiceNavigation`, `ChildOutcomeVariant`, `IndexStatus`, `ProseStatus`, `PagePlanSummary`, `ReceiptSummary`, `EventDeltaSummary`, `ValidationIntegritySummary`, `BranchContext`, `RawSourceReference`, `ResponseEnvelope`.
- Generic `fetchEnveloped<T>(url: string): Promise<{ envelope: ResponseEnvelope, payload: T }>` helper.
- Per-route fetcher functions:
  - `listWorlds(): Promise<{ envelope, payload: WorldSummary[] }>`
  - `getWorld(slug): Promise<{ envelope, payload: WorldSummary }>`
  - `listStories(slug): Promise<{ envelope, payload: StorySummary[] }>`
  - `getStory(slug, storySlug): Promise<{ envelope, payload: StorySummary }>`
  - `listPages(slug, storySlug): Promise<{ envelope, payload: PageSummary[] }>`
  - `getRootPage(slug, storySlug): Promise<{ envelope, payload: PageSummary | null }>`
  - `getLatestPage(slug, storySlug): Promise<{ envelope, payload: PageSummary | null }>`
  - `getPageDetail(slug, storySlug, pageId): Promise<{ envelope, payload: PageDetail }>`
  - `getProseBody(slug, storySlug, pageId): Promise<{ envelope, payload: { prose: string | null, proseStatus: ProseStatus } }>` — for T009's lazy fetch pattern per §5
  - Sketch routes for SPEC-89/90 (records, branch-map, search, page-plans, prose-receipts, provenance) — declared but not implemented this ticket; comment notes "wired by SPEC-89/90".
- Error handling: HTTP non-2xx responses throw a typed `ApiError` carrying status code + envelope error body (when present).

### 2. Create `tools/story-explorer/web/src/prefs/local-storage.ts`

Local-storage wrapper for client preferences (§3: "last-viewed page, theme — never written to repo files"). Exports:
- `getLastViewedPage(storySlug: string): string | null` — reads last-viewed PG-id for a story slug
- `setLastViewedPage(storySlug: string, pageId: string): void`
- `getTheme(): 'light' | 'dark' | 'system'` (default: 'system')
- `setTheme(theme): void`
- Keys are namespaced `worldloom-story-explorer:last-viewed:<storySlug>` and `worldloom-story-explorer:theme`.
- Try/catch around `localStorage` access (Safari private-browsing throws on write); silent fallback to in-memory map when local-storage is unavailable.

### 3. Create `tools/story-explorer/web/src/lib/sanitize-markdown.ts`

Markdown → safe-HTML sanitizer for T009's prose rendering. Exports `sanitizeMarkdown(md: string): string` returning HTML string with:
- All `<script>`, `<iframe>`, `<object>`, `<embed>` tags stripped
- All `on*` attributes stripped
- `href` attributes restricted to `http(s)://`, `mailto:`, and relative paths (PG/CHC/SE id links detected per §5 — pattern `/PG-\d+/`, `/CHC-\d+/`, `/SE-\d+/` — rewritten to internal route URLs)
- External links automatically get `target="_blank" rel="noopener noreferrer"`

Implementation: use `marked` for markdown parsing + `dompurify` for sanitization. Pin versions in package.json (T001 didn't include — add here as a deps update).

### 4. Create `tools/story-explorer/web/src/lib/format.ts`

Formatting helpers used across routes. Exports:
- `formatTurnIndex(n: number): string` — e.g., `Turn 7`
- `formatPageStatusStrip(pageId, branchId, turnIndex): string` — e.g., `PG-12 · Branch BR-3 · Turn 7` per §5
- `formatBranchPath(branchPath: string[]): string` — e.g., `BR-1 → BR-3` for breadcrumb
- `formatProseStatus(status: ProseStatus): string` — human label

### 5. Add markdown sanitization dependencies to T001's `web/package.json`

Append to `dependencies`:
```json
"marked": "^14.1.0",
"dompurify": "^3.1.0"
```
And to `devDependencies`:
```json
"@types/dompurify": "^3.0.0"
```

(Pin to latest stable at implementation time; ranges are floors.)

### 6. Tests

Create unit tests:
- `web/src/api/client.test.ts` — mock `fetch`; assert `fetchEnveloped` parses `{ _envelope, ...payload }` correctly; assert it throws `ApiError` on non-2xx; assert per-route fetcher functions construct the right URLs.
- `web/src/prefs/local-storage.test.ts` — round-trip test for last-viewed and theme; test localStorage-unavailable fallback.
- `web/src/lib/sanitize-markdown.test.ts` — assert `<script>` is stripped; assert PG/CHC/SE id links rewrite to route URLs; assert external links get `rel="noopener noreferrer"`.

## Files to Touch

- `tools/story-explorer/web/src/api/client.ts` (new)
- `tools/story-explorer/web/src/api/client.test.ts` (new)
- `tools/story-explorer/web/src/prefs/local-storage.ts` (new)
- `tools/story-explorer/web/src/prefs/local-storage.test.ts` (new)
- `tools/story-explorer/web/src/lib/sanitize-markdown.ts` (new)
- `tools/story-explorer/web/src/lib/sanitize-markdown.test.ts` (new)
- `tools/story-explorer/web/src/lib/format.ts` (new)
- `tools/story-explorer/web/package.json` (modify — adds `marked`, `dompurify`, `@types/dompurify`)

## Out of Scope

- Backend changes — none. The client reads SPEC-87's existing HTTP routes verbatim.
- Cross-cutting components ErrorBoundary / RouteLoading / IndexStatusBanner / disclosure (T004).
- Any route body using the client (T005-T011 wire routes).
- React hooks wrapping the client (e.g., `useWorldList()`) — left to per-route tickets; this ticket ships plain async functions.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — all three test files (`client.test.ts`, `local-storage.test.ts`, `sanitize-markdown.test.ts`) pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles; no type errors.
3. `grep -E "import.*from.*\\.\\./\\.\\./src" tools/story-explorer/web/src/api/` — returns zero matches (sub-tree boundary preserved).

### Invariants

1. Every client interface has an inline comment naming `tools/story-explorer/src/view-models/<name>.ts` as the source-of-truth (drift-detection breadcrumb for future readers).
2. Local-storage keys use the `worldloom-story-explorer:` prefix (collision-avoidance with sibling tools on same origin during dev).
3. Markdown sanitization never bypasses dompurify — no path produces raw HTML reaching the DOM without sanitization. Per-call audit via grep at implementation time.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/api/client.test.ts` (new) — verifies envelope unwrapping, URL construction, and ApiError on non-2xx.
2. `tools/story-explorer/web/src/prefs/local-storage.test.ts` (new) — verifies prefs round-trip and Safari-private-browsing fallback.
3. `tools/story-explorer/web/src/lib/sanitize-markdown.test.ts` (new) — verifies XSS-vector stripping and link rewriting.

### Commands

1. `cd tools/story-explorer/web && npm test` — vitest run.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compile (typecheck verification per Step 2 substitution: `npm run build` covers typecheck via `tsc -p tsconfig.json`).
3. `grep -E "import.*from.*\\.\\./\\.\\./src" tools/story-explorer/web/src/api/` — sub-tree boundary verification.
