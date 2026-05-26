# SPEC88STOEXPFRO-008: Reading Page chrome + Breadcrumb

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — wires `web/src/routes/page-read.tsx` as the `/worlds/:slug/stories/:storySlug/pages/:pageId` route, replacing T001's placeholder; adds 4 chrome components.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, archive/tickets/SPEC88STOEXPFRO-002.md, archive/tickets/SPEC88STOEXPFRO-004.md

## Problem

The Reading Page is the primary surface of the entire explorer — it composes the page header, breadcrumb, prose panel slot (T009 fills), choice cards slot (T010 fills), terminal/branch-pause slot (T010 fills), and the SPEC-89 X-Ray slot (SPEC-89 fills). At intake, this route still used T001's placeholder, so T009/T010 had nowhere to render and the explorer could not show actual page content. SPEC-88 §4.4 defines the section ordering; this ticket landed the structural shell, the breadcrumb, and the chrome bar.

## Assumption Reassessment (2026-05-26)

1. T001 created the placeholder `/worlds/:slug/stories/:storySlug/pages/:pageId` route. T002 created `getPageDetail(slug, storySlug, pageId): Promise<{ envelope, payload: PageDetail }>`. T004 created `<ErrorBoundary>`, `<RouteLoading>`, `<IndexStatusBanner>`, disclosure primitive. SPEC-87's `PageDetail` type at `tools/story-explorer/src/view-models/page-detail.ts` declares the consumed fields: `page` (full PG body), `prose`, `proseStatus`, `pagePlanSummary`, `receiptSummary`, `choiceNavigation`, `currentStateRecordIds`, `eventDelta`, `validationIntegrity`, `branchContext`, `rawSources`. SPEC-87's `PageSummary` provides `pageId`, `branchId`, `parentPageId`, `turnIndex`, `isLeaf`, `isTerminalOrPaused`, `terminalReason` — used by both the chrome and the (T010) terminal card.
2. SPEC-88 §4.4 (post-reassessment) names the section ordering: "1. `<PageHeader>` — story title, page ID, branch chip, turn index, parent/back, branch-map button (placeholder until SPEC-90), page-jump placeholder, integrity chip. 2. `<Breadcrumb>` — `World / Story / Branch BR-x / PG-y`, with parent page link when present. 3. `<ProsePanel>` OR `<ProseMissingPlaceholder>` based on `proseStatus`. 4. `<ChoiceCard>` list (one card per choice from `choiceNavigation` where `isNavigable === true`). 5. `<TerminalCard>` when no navigable children (per `isLeaf`/`isTerminalOrPaused` from `PageSummary`). 6. State X-Ray section (slot — SPEC-89 fills). 7. Right-rail summary on desktop (slot — SPEC-89 fills); inline summary bar above x-ray on mobile (slot — SPEC-89 fills)." This ticket implements sections 1, 2, and the shell hosting 3-7 (T009 fills 3; T010 fills 4-5; SPEC-89 fills 6-7).
3. Cross-skill boundary: this route is the highest-coupling surface in the explorer — every subsequent ticket plugs into a slot here. T009 (prose) takes over section 3; T010 (choices + terminal) takes over sections 4-5; T011 (degraded states) covers the route-level IndexStatusBanner; T012 verifies a11y across the composed page. SPEC-89/90 then plug into sections 6-7 + chrome placeholders (branch-map button, page-jump). The shell must reserve these slots cleanly so future tickets don't need to restructure.
4. Live loader reassessment corrected the drafted single-fetch route shape: `PageDetail` does not carry `storyTitle` or `worldDisplayName`, so the reading-page loader also fetches `getWorld(slug)` and `getStory(slug, storySlug)` using the existing T005/T006/T007 route-loader pattern. This is same-seam route composition, not a backend API change. The current page id is read from `PageDetail.page.id`, with `branchContext` providing branch/parent/turn fields.

## Architecture Check

1. **Route as a composition shell** — the route component owns layout and section ordering; each section is a sub-component or slot. T009/T010 replace the placeholder section bodies in this route; SPEC-89/90 fill the x-ray, summary rail, branch-map, and page-jump surfaces without reordering the page.
2. **`<PageHeader>` as a flat horizontal bar** — story title left, page-ID + branch chip + turn index center-ish, parent/back + branch-map placeholder + page-jump placeholder + integrity chip right. Avoids the "two-tier nav" anti-pattern that makes mobile layout fragile.
3. **`<Breadcrumb>` as semantic `<nav aria-label="Breadcrumb">`** with `<ol>` of `<li>` items separated by visual `›` characters. WAI-ARIA breadcrumb pattern. Parent-page link when `parentPageId !== null` per §4.4.
4. **`<BranchChip>` as a small inline chip** (e.g., `BR-3`) with optional click → opens the branch-map drawer (placeholder until SPEC-90 wires it). For now, click is a no-op or shows a "Branch map coming soon" toast.
5. **`<IntegrityChip>` shows summarized integrity state** — clean, warning, or issue based on `validationIntegrity`. Click expands to a small popover with the validation summary (SPEC-89 takes this further with the full Validation & Integrity tab).
6. **Slots for T009/T010** — the shell renders stable section containers with placeholder content until T009/T010 provide real content via route-internal imports. No slot prop API is needed for intra-batch composition.
7. **Mobile layout: single-column** per §8 — header → breadcrumb → prose → choices → terminal (when applicable) → x-ray slot. Desktop layout: same vertical flow plus right-rail summary slot (SPEC-89 fills).
8. **No backwards-compatibility aliasing/shims introduced** — greenfield route + components.

## Verification Layers

1. **Route renders PageDetail from `getPageDetail()`** → unit test with mocked client; assert header, breadcrumb, and section structure render.
2. **PageHeader displays all required fields** → unit test: story title, page ID, branch chip, turn index, integrity chip — all present and readable.
3. **Breadcrumb renders World / Story / Branch / PG hierarchy** → unit test: assert `<nav aria-label="Breadcrumb">` + 4-item `<ol>` with proper separators; parent-page link when `parentPageId !== null`.
4. **404 handling for missing PG** → not exercised here because T011 owns the polished 404/backend-unreachable UI; this ticket keeps the reading page inside the existing route-level ErrorBoundary frame.
5. **Slot structure preserved** → unit test: assert the route renders the prose-section / choices-section / terminal-section / x-ray-section containers in order, even when their contents are placeholders.

## Landed Changes

### 1. Created `tools/story-explorer/web/src/routes/page-read.tsx`

Functional component implementing §4.4's structural contract. It reads `worldSlug`, `storySlug`, and `pageId` from URL params, then fetches `getWorld(worldSlug)`, `getStory(worldSlug, storySlug)`, and `getPageDetail(worldSlug, storySlug, pageId)` in the loader so chrome and breadcrumb text come from live API data. `app.tsx` wraps it in the existing route frame with `<ErrorBoundary>` and `<RouteLoading label="Loading page..." />`.

Structure (top to bottom):
- `<PageHeader>` (component below)
- `<Breadcrumb>` (component below)
- `<section className="prose-section">` — placeholder content for now: `<p>Prose panel slot (T009 fills)</p>`. T009 replaces with `<ProsePanel>` / `<ProseMissingPlaceholder>`.
- `<section className="choices-section">` — placeholder: `<p>Choice cards slot (T010 fills)</p>`. T010 replaces with `<ChoiceCard>` list.
- `<section className="terminal-section">` — conditional placeholder when `choiceNavigation.every(c => !c.isNavigable)`; placeholder: `<p>Terminal card slot (T010 fills)</p>`. T010 replaces with `<TerminalCard>`.
- `<section className="xray-section">` — placeholder: `<p>State X-Ray slot (SPEC-89 fills)</p>`.
- Right rail (desktop only): `<aside className="summary-rail">` placeholder: `<p>Summary rail slot (SPEC-89 fills)</p>`.

### 2. Created `tools/story-explorer/web/src/components/PageHeader.tsx`

Functional component. Props: `pageDetail: PageDetail`, `storyTitle: string`, route slugs, and `pageId`. Renders horizontal bar:
- Story title (left)
- Page ID, BranchChip, turn index (center)
- Parent/back button (when `parentPageId !== null` — `<Link to={parent path}>`), branch-map placeholder button (no-op for now), page-jump placeholder button (no-op for now), IntegrityChip (right)

### 3. Created `tools/story-explorer/web/src/components/Breadcrumb.tsx`

Functional component. Props: `worldSlug`, `worldDisplayName`, `storySlug`, `storyTitle`, `branchId`, `pageId`, `parentPageId`. Renders:
```tsx
<nav aria-label="Breadcrumb">
  <ol>
    <li><Link to="/">Worlds</Link></li>
    <li>›</li>
    <li><Link to={`/worlds/${worldSlug}/stories`}>{worldDisplayName}</Link></li>
    <li>›</li>
    <li><Link to={`/worlds/${worldSlug}/stories/${storySlug}/entry`}>{storyTitle}</Link></li>
    <li>›</li>
    <li>Branch {branchId}</li>
    <li>›</li>
    <li aria-current="page">{pageId}</li>
  </ol>
</nav>
```
Parent-page link rendered as a small inline "Parent: PG-{n}" when `parentPageId !== null`.

### 4. Created `tools/story-explorer/web/src/components/BranchChip.tsx`

Small inline chip (e.g., `BR-3`). Props: `branchId: string`, `onClick?: () => void`. Renders as a `<button>` with the chip styling; default click is no-op (SPEC-90 wires the branch-map drawer trigger).

### 5. Created `tools/story-explorer/web/src/components/IntegrityChip.tsx`

Small chip showing integrity state. Props: `validationIntegrity: ValidationIntegritySummary`. Renders clean / warning / issue state based on summary content. Click expands to a small popover with prose status and receipt verdict; full Validation & Integrity tab is SPEC-89's surface.

### 6. Updated `tools/story-explorer/web/src/app.tsx`

Replaced the `/worlds/:slug/stories/:storySlug/pages/:pageId` placeholder with the imported route and loader.

### 7. Created tests

- `tools/story-explorer/web/src/routes/page-read.test.tsx` — verifies section ordering, slot placeholders present.
- `tools/story-explorer/web/src/components/PageHeader.test.tsx` — verifies all chrome fields render.
- `tools/story-explorer/web/src/components/Breadcrumb.test.tsx` — verifies `<nav aria-label="Breadcrumb">` semantic structure and parent-page link conditional.
- `tools/story-explorer/web/src/components/IntegrityChip.test.tsx` — verifies severity dispatch (clean / warning / broken).

## Files to Touch

- `tools/story-explorer/web/src/routes/page-read.tsx` (new)
- `tools/story-explorer/web/src/routes/page-read.test.tsx` (new)
- `tools/story-explorer/web/src/components/PageHeader.tsx` (new)
- `tools/story-explorer/web/src/components/PageHeader.test.tsx` (new)
- `tools/story-explorer/web/src/components/Breadcrumb.tsx` (new)
- `tools/story-explorer/web/src/components/Breadcrumb.test.tsx` (new)
- `tools/story-explorer/web/src/components/BranchChip.tsx` (new)
- `tools/story-explorer/web/src/components/IntegrityChip.tsx` (new)
- `tools/story-explorer/web/src/components/IntegrityChip.test.tsx` (new)
- `tools/story-explorer/web/src/app.tsx` (modify — replace placeholder)
- `tools/story-explorer/web/src/styles/app.css` (modify — reading-page chrome, breadcrumb, slot, and rail styles)

## Out of Scope

- Prose rendering (T009).
- Choice cards (T010).
- Terminal card (T010).
- State X-Ray (SPEC-89).
- Summary rail (SPEC-89).
- Branch-map drawer (SPEC-90).
- Page-jump search (SPEC-90).
- Page-status strip below prose (T009's §5 surface).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- page-read.test` — section ordering test passes.
2. `cd tools/story-explorer/web && npm test -- PageHeader.test Breadcrumb.test IntegrityChip.test` — component tests pass.
3. `cd tools/story-explorer/web && npm run build` — TypeScript compiles.

### Invariants

1. Section order is fixed (header → breadcrumb → prose → choices → terminal → x-ray); T009/T010/SPEC-89 fill sections without reordering.
2. Breadcrumb uses semantic `<nav aria-label="Breadcrumb">` + `<ol>` — no `<div>` ladder.
3. PageHeader is a single horizontal bar (no two-tier nav) — mobile layout depends on this.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/page-read.test.tsx` (new) — verifies section ordering.
2. `tools/story-explorer/web/src/components/PageHeader.test.tsx` (new) — verifies chrome fields.
3. `tools/story-explorer/web/src/components/Breadcrumb.test.tsx` (new) — verifies semantic structure.
4. `tools/story-explorer/web/src/components/IntegrityChip.test.tsx` (new) — verifies severity dispatch.

### Commands

1. `cd tools/story-explorer/web && npm test` — full vitest suite.
2. `cd tools/story-explorer/web && npm run build` — TypeScript verification.

## Verification Result

Completed on 2026-05-26.

1. Pre-edit baseline from `tools/story-explorer/web/`: `npm test` passed 11 files / 40 tests.
2. Pre-edit baseline from `tools/story-explorer/web/`: `npm run build` passed.
3. Focused T008 proof from `tools/story-explorer/web/`: `npm test -- page-read.test PageHeader.test Breadcrumb.test IntegrityChip.test` passed 4 files / 9 tests.
4. Final full web proof from `tools/story-explorer/web/`: `npm test` passed 15 files / 49 tests. The output still includes React Router v7 future-flag warnings already present in existing route/component tests; those warnings are non-fatal and outside this ticket's boundary.
5. Final build proof from `tools/story-explorer/web/`: `npm run build` passed; TypeScript compiled the new route/components and Vite emitted the refreshed web bundle.

## Deviations

1. The route loader fetches `getWorld()` and `getStory()` in addition to `getPageDetail()` because the live `PageDetail` payload does not include `worldDisplayName` or `storyTitle`. This is same-seam frontend route composition and required no backend API change.
2. The terminal placeholder condition uses the live `PageDetail.choiceNavigation.every(c => !c.isNavigable)` surface. `PageSummary.isLeaf` is not present in the page-detail payload, and T010 remains the owner for the final terminal-card discriminator/copy.

## Outcome

Completed on 2026-05-26.

The reading-page placeholder route is now replaced by a real loader-backed route shell. It renders the page header, breadcrumb, prose/choice/terminal/x-ray placeholders, and desktop summary rail in the SPEC-88 order. New chrome components cover branch chips, breadcrumb semantics, page header fields/actions, and a compact integrity popover. The route is wired into `app.tsx`, styled in `app.css`, and covered by focused route/component tests plus the full web suite and build.
