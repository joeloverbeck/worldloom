# SPEC88STOEXPFRO-009: Prose panel + missing-prose placeholder + lazy-fetch composition

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/components/{ProsePanel, ProseMissingPlaceholder}.tsx`, component tests, prose placeholder styles, and fills T008's prose-section slot.
**Deps**: archive/tickets/SPEC88STOEXPFRO-008.md

## Problem

The prose panel is the emotional center of the reading page — literary typography, generous reading column, sanitized markdown rendering, and a polished placeholder when prose hasn't been attached. SPEC-88 §5 (post-reassessment) commits to specific behaviors: typography rules, an eager-when-`present` / lazy-via-`/prose/:pageId` fetch composition per SPEC-87 §5's separate route, and three distinct missing-states (`missing`, `unreadable`, `hash_mismatch`) each with its own placeholder copy. At intake, T008's prose-section slot remained a placeholder and the explorer could not show prose.

## Assumption Reassessment (2026-05-26)

1. T008 created `web/src/routes/page-read.tsx` with a placeholder prose-section. T002 created `getPageDetail()` and `getProseBody()` — both fetchers exist for the eager/lazy composition. SPEC-87's `PageDetail.prose` field is the eager content; SPEC-87's `/api/.../prose/:pageId` route (handled by `tools/story-explorer/src/server/routes/prose.ts`) is the lazy source. SPEC-87 §5 documents the separation: "PageDetail returns only `pagePlanSummary`; the full plan body is fetched on-demand when SPEC-89's Plan & Prose tab opens" applies to plans; the prose body has the same separation — PageDetail may carry it eagerly OR omit it, deferring to the dedicated route. SPEC-88 §5 (post-reassessment) names the fetch pattern: "`<ProsePanel>` reads the prose body eagerly from `PageDetail.prose` when `proseStatus === 'present'` and the body is included in the initial PageDetail payload from `GET /api/.../pages/:pageId`. When the backend omits the body (large prose deferred) or when `proseStatus !== 'present'` (placeholder doesn't need the body), the panel uses the separate `GET /api/.../prose/:pageId` route per SPEC-87 §5."
2. SPEC-88 §5 (post-reassessment) names the placeholder copy per state: `missing` → header "Rendered prose not attached yet." + subtitle "This page's state, choices, event delta, and records are available below." (per proposal §6 "designed placeholder, not a file-not-found dump"); `unreadable` → "Prose file present but unreadable. See Validation & Integrity in State X-Ray." (X-Ray target lands in SPEC-89); `hash_mismatch` → "Prose receipt indicates hash mismatch. See Validation & Integrity." Every placeholder includes a "View page plan in State X-Ray" anchor (target lands in SPEC-89). SPEC-88 §5 (post-reassessment) also commits: "The prose panel NEVER renders `pages-prose-plans/PG-<n>.md` as a substitute for missing prose. The plan only ever appears in the X-Ray Plan & Prose tab (SPEC-89)."
3. Cross-skill boundary: this ticket consumes T002's API client + T001's CSS tokens + T002's `sanitize-markdown` lib. The fetch composition spans both `getPageDetail()` (eager) and `getProseBody()` (lazy) — drift in either contract breaks the rendering. The "View page plan in State X-Ray" anchor targets SPEC-89's surface; for this v1, render it as a non-functional anchor with `aria-disabled="true"` + text "SPEC-89 will wire this scroll target" — when SPEC-89 lands, the anchor becomes active.
4. **FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary)** — PG is page authority; rendered prose is renderable receipt, not a second state engine. The prose panel honors this by: (a) treating missing prose as a designed UI state, not an error that blocks page access; (b) NEVER rendering the page plan as a substitute for missing prose (the plan is engine artifact, not reader prose — SPEC-88 §11 alignment row 1 makes this explicit); (c) addressing the page by PG-id, not by prose-file-path (the PG record is the addressable entity). The fetch pattern preserves this: even when `proseStatus !== 'present'`, the route renders a fully-functional page with state/choices/event-delta/x-ray slots accessible — prose absence does not degrade the rest of the surface.

## Architecture Check

1. **Eager-when-present / lazy-otherwise composition** — `<ProsePanel>` accepts `proseStatus` + optional `eagerProseBody` props. When `proseStatus === 'present'` AND `eagerProseBody` is non-null, render eagerly. When `proseStatus === 'present'` AND `eagerProseBody` is null (backend deferred large prose), fetch via `getProseBody()` and render with `<Suspense fallback={<RouteLoading label="Loading prose..." />}>`. When `proseStatus !== 'present'`, render `<ProseMissingPlaceholder status={proseStatus} />` — no prose fetch needed (placeholder doesn't display body).
2. **Sanitization at render-time** — markdown body always passes through `sanitizeMarkdown()` from T002's lib before injection into the DOM (`dangerouslySetInnerHTML` after sanitize). Never trust upstream content.
3. **Page-status strip optional** — small muted strip below prose: `PG-12 · Branch BR-3 · Turn 7` per §5. Single line, low visual weight. Rendered only when prose is present (placeholder states have their own framing).
4. **`<ProseMissingPlaceholder>` as a sub-component** — receives `proseStatus: 'missing' | 'unreadable' | 'hash_mismatch'` and renders the corresponding header/subtitle pair. Centralizes the per-state copy.
5. **No backwards-compatibility aliasing/shims introduced** — greenfield components.
6. **Sanitize-markdown library is the source of XSS safety** — never roll a hand-built strip; T002's wrapper around dompurify is the only path from markdown to DOM.

## Verification Layers

1. **Eager rendering when `proseStatus === 'present'` AND body included** → unit test: pass `proseStatus: 'present'` + `eagerProseBody: '# Hello'`; assert rendered HTML contains `<h1>Hello</h1>` (sanitized).
2. **Lazy fetch when body omitted** → unit test: pass `proseStatus: 'present'` + `eagerProseBody: null`; mock `getProseBody()` returning markdown; assert Suspense fallback renders during fetch, then sanitized markdown renders.
3. **Placeholder per state** → unit test: pass each of `missing` / `unreadable` / `hash_mismatch`; assert correct header + subtitle text renders (per the §5 copy specification).
4. **Plan never substitutes for prose** → unit test: pass `proseStatus: 'missing'` + a `pagePlanSummary` value; assert plan body is NOT rendered in the prose panel. Verifies FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary).
5. **Sanitization rejects script tags** → unit test: pass `proseStatus: 'present'` + `eagerProseBody: '<script>alert(1)</script>'`; assert script is stripped before DOM injection.
6. **Page-status strip renders only when prose is present** → unit test: present → strip renders; missing → strip absent.

## Landed Changes

### 1. Create `tools/story-explorer/web/src/components/ProsePanel.tsx`

Created a functional component with props:
```ts
interface ProsePanelProps {
  proseStatus: ProseStatus;
  eagerProseBody: string | null; // from PageDetail.prose
  pageId: string;
  branchId: string;
  turnIndex: number;
  worldSlug: string;
  storySlug: string;
  pagePlanSummary?: PagePlanSummary | null;
}
```
Landed behavior:
- If `proseStatus !== 'present'`, renders `<ProseMissingPlaceholder status={proseStatus} />`.
- If `eagerProseBody !== null`, renders sanitized markdown directly.
- If `eagerProseBody === null`, wraps a lazy prose resource in `<Suspense>` with `<RouteLoading label="Loading prose..." />`, fetches via `getProseBody(worldSlug, storySlug, pageId)`, and renders the sanitized result.
- When prose is present, renders the page-status strip below as `{pageId} · Branch {branchId} · Turn {turnIndex}` using `formatPageStatusStrip()`.
- Markdown rendering uses T002's `sanitizeMarkdown()` before `dangerouslySetInnerHTML` on a `<div className="prose">`.

### 2. Create `tools/story-explorer/web/src/components/ProseMissingPlaceholder.tsx`

Created a functional component with props:
```ts
interface ProseMissingPlaceholderProps {
  status: 'missing' | 'unreadable' | 'hash_mismatch';
}
```
Landed behavior renders a polished placeholder per the §5 copy specification:
- `missing` → header "Rendered prose not attached yet." + subtitle "This page's state, choices, event delta, and records are available below."
- `unreadable` → header "Prose file present but unreadable." + subtitle "See Validation & Integrity in State X-Ray."
- `hash_mismatch` → header "Prose receipt indicates hash mismatch." + subtitle "See Validation & Integrity."

Every variant includes a "View page plan in State X-Ray" anchor — for v1, render as `<button disabled aria-disabled="true" title="SPEC-89 will wire this scroll target">View page plan in State X-Ray</button>`. SPEC-89 activates the anchor.

The placeholder uses a designed visual treatment (centered, restrained, calm — not "error red") consistent with the literary tone of the surrounding prose surface.

### 3. Update `tools/story-explorer/web/src/routes/page-read.tsx`

Replaced the prose-section placeholder with:
```tsx
<section className="prose-section">
  <ProsePanel
    proseStatus={pageDetail.proseStatus}
    eagerProseBody={pageDetail.prose}
    pageId={pageId}
    branchId={pageDetail.branchContext.branchId}
    turnIndex={pageDetail.branchContext.turnIndex}
    worldSlug={worldSlug}
    storySlug={storySlug}
    pagePlanSummary={pageDetail.pagePlanSummary}
  />
</section>
```

### 4. Create tests

- `tools/story-explorer/web/src/components/ProsePanel.test.tsx` — verifies Verification Layers 1, 2, 4, 5, 6.
- `tools/story-explorer/web/src/components/ProseMissingPlaceholder.test.tsx` — verifies Verification Layer 3 (each state's copy).
- `tools/story-explorer/web/src/routes/page-read.test.tsx` — updated route integration proof so the prose section now renders the missing-prose placeholder instead of the T009 placeholder text.

### 5. Add styles

- `tools/story-explorer/web/src/styles/app.css` — added prose panel status strip and missing-prose placeholder styles.

## Files to Touch

- `tools/story-explorer/web/src/components/ProsePanel.tsx` (new)
- `tools/story-explorer/web/src/components/ProsePanel.test.tsx` (new)
- `tools/story-explorer/web/src/components/ProseMissingPlaceholder.tsx` (new)
- `tools/story-explorer/web/src/components/ProseMissingPlaceholder.test.tsx` (new)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — fills prose-section slot)
- `tools/story-explorer/web/src/routes/page-read.test.tsx` (modify — proves the route now renders the prose placeholder state)
- `tools/story-explorer/web/src/styles/app.css` (modify — prose panel and missing-prose placeholder styles)

## Out of Scope

- The actual SPEC-89 X-Ray scroll target — the "View page plan" anchor is `disabled` placeholder until SPEC-89 wires it.
- Choice cards (T010).
- Terminal card (T010).
- Validation & Integrity tab (SPEC-89).
- Plan & Prose tab (SPEC-89).
- Prose receipt rendering (SPEC-89).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- ProsePanel.test ProseMissingPlaceholder.test` — all 6 Verification Layers' tests pass.
2. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. The page plan is NEVER rendered in the prose panel — even when the plan body is available on PageDetail, the prose-section never substitutes it for missing prose. Verified by Verification Layer 4.
2. All markdown bodies pass through `sanitizeMarkdown()` before DOM injection. Audited by `grep -n "dangerouslySetInnerHTML" tools/story-explorer/web/src/components/ProsePanel.tsx` — every match must be preceded by a `sanitizeMarkdown()` call in the same function scope.
3. Missing-prose placeholder is a designed UI state, not an error — preserves Plan-Authority Boundary (PG is page authority; prose is optional artifact).
4. Page-status strip renders only when prose is present (prevents the strip from appearing alongside the missing-prose placeholder, which would visually conflate the two states).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/ProsePanel.test.tsx` (new) — verifies eager/lazy composition, sanitization, plan-never-substitutes, page-status strip conditional.
2. `tools/story-explorer/web/src/components/ProseMissingPlaceholder.test.tsx` (new) — verifies each placeholder state's copy.
3. `tools/story-explorer/web/src/routes/page-read.test.tsx` (modified) — verifies the reading route renders the prose placeholder state in the prose section.

### Commands

1. `cd tools/story-explorer/web && npm test` — full vitest suite.
2. `cd tools/story-explorer/web && npm run build` — TypeScript verification.
3. `grep -n "dangerouslySetInnerHTML" tools/story-explorer/web/src/components/ProsePanel.tsx` — XSS-safety audit (every match must be preceded by sanitizeMarkdown call).

## Outcome

Completed on 2026-05-26. The reading page now renders a real prose surface instead of the T009 slot placeholder:

- Added `<ProsePanel>` with eager prose rendering, lazy deferred prose fetch via `getProseBody()`, `RouteLoading` Suspense fallback, sanitized markdown output, and a page-status strip.
- Added `<ProseMissingPlaceholder>` with the three SPEC-88 §5 degraded prose states and disabled SPEC-89 x-ray target.
- Integrated `<ProsePanel>` into `page-read.tsx`.
- Added focused component tests and updated the route integration test.
- Added matching CSS for the prose panel status strip and missing-prose placeholder.

## Verification Result

Passed:

1. Baseline before edits: `cd tools/story-explorer/web && npm test -- page-read.test` — 1 file / 3 tests passed.
2. Focused proof after edits: `cd tools/story-explorer/web && npm test -- ProsePanel.test ProseMissingPlaceholder.test page-read.test` — 3 files / 11 tests passed.
3. Build proof: `cd tools/story-explorer/web && npm run build` — TypeScript and Vite production build passed.
4. Full web suite: `cd tools/story-explorer/web && npm test` — 17 files / 57 tests passed.
5. XSS audit: `grep -n "dangerouslySetInnerHTML" tools/story-explorer/web/src/components/ProsePanel.tsx` returned the single render site; source inspection confirmed the same function assigns `const sanitized = sanitizeMarkdown(markdown);` before injection.

## Deviations

- The route integration test and `app.css` were added to the landed file set because replacing T008's prose slot required route-level proof and visible placeholder/status-strip styling. This is same-seam fallout inside the SPEC-88 §5 prose panel boundary.
- The lazy prose implementation uses a small resource cache keyed by world/story/page so React Suspense can retry the fetch without reissuing the same request. The cache is internal to the component module and does not write browser or repo state.
