# SPEC88STOEXPFRO-008: Reading Page chrome + Breadcrumb

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — wires `web/src/routes/page-read.tsx` as the `/worlds/:slug/stories/:storySlug/pages/:pageId` route, replacing T001's placeholder; adds 4 chrome components.
**Deps**: archive/tickets/SPEC88STOEXPFRO-001.md, SPEC88STOEXPFRO-002, SPEC88STOEXPFRO-004

## Problem

The Reading Page is the primary surface of the entire explorer — it composes the page header, breadcrumb, prose panel slot (T009 fills), choice cards slot (T010 fills), terminal/branch-pause slot (T010 fills), and the SPEC-89 X-Ray slot (SPEC-89 fills). Without this route's chrome and composition, T009/T010's components have nowhere to render and the explorer cannot show actual page content. SPEC-88 §4.4 defines the section ordering; this ticket lays the structural shell, the breadcrumb, and the chrome bar — the heaviest scaffolding ticket because every subsequent route ticket plugs into this shell.

## Assumption Reassessment (2026-05-26)

1. T001 created the placeholder `/worlds/:slug/stories/:storySlug/pages/:pageId` route. T002 created `getPageDetail(slug, storySlug, pageId): Promise<{ envelope, payload: PageDetail }>`. T004 created `<ErrorBoundary>`, `<RouteLoading>`, `<IndexStatusBanner>`, disclosure primitive. SPEC-87's `PageDetail` type at `tools/story-explorer/src/view-models/page-detail.ts` declares the consumed fields: `page` (full PG body), `prose`, `proseStatus`, `pagePlanSummary`, `receiptSummary`, `choiceNavigation`, `currentStateRecordIds`, `eventDelta`, `validationIntegrity`, `branchContext`, `rawSources`. SPEC-87's `PageSummary` provides `pageId`, `branchId`, `parentPageId`, `turnIndex`, `isLeaf`, `isTerminalOrPaused`, `terminalReason` — used by both the chrome and the (T010) terminal card.
2. SPEC-88 §4.4 (post-reassessment) names the section ordering: "1. `<PageHeader>` — story title, page ID, branch chip, turn index, parent/back, branch-map button (placeholder until SPEC-90), page-jump placeholder, integrity chip. 2. `<Breadcrumb>` — `World / Story / Branch BR-x / PG-y`, with parent page link when present. 3. `<ProsePanel>` OR `<ProseMissingPlaceholder>` based on `proseStatus`. 4. `<ChoiceCard>` list (one card per choice from `choiceNavigation` where `isNavigable === true`). 5. `<TerminalCard>` when no navigable children (per `isLeaf`/`isTerminalOrPaused` from `PageSummary`). 6. State X-Ray section (slot — SPEC-89 fills). 7. Right-rail summary on desktop (slot — SPEC-89 fills); inline summary bar above x-ray on mobile (slot — SPEC-89 fills)." This ticket implements sections 1, 2, and the shell hosting 3-7 (T009 fills 3; T010 fills 4-5; SPEC-89 fills 6-7).
3. Cross-skill boundary: this route is the highest-coupling surface in the explorer — every subsequent ticket plugs into a slot here. T009 (prose) takes over section 3; T010 (choices + terminal) takes over sections 4-5; T011 (degraded states) covers the route-level IndexStatusBanner; T012 verifies a11y across the composed page. SPEC-89/90 then plug into sections 6-7 + chrome placeholders (branch-map button, page-jump). The shell must reserve these slots cleanly so future tickets don't need to restructure.

## Architecture Check

1. **Route as a composition shell** — the route component owns layout and section ordering; each section is a sub-component or slot. T009/T010 inject their components via the shell's prop API; SPEC-89/90 inject into the slot props.
2. **`<PageHeader>` as a flat horizontal bar** — story title left, page-ID + branch chip + turn index center-ish, parent/back + branch-map placeholder + page-jump placeholder + integrity chip right. Avoids the "two-tier nav" anti-pattern that makes mobile layout fragile.
3. **`<Breadcrumb>` as semantic `<nav aria-label="Breadcrumb">`** with `<ol>` of `<li>` items separated by visual `›` characters. WAI-ARIA breadcrumb pattern. Parent-page link when `parentPageId !== null` per §4.4.
4. **`<BranchChip>` as a small inline chip** (e.g., `BR-3`) with optional click → opens the branch-map drawer (placeholder until SPEC-90 wires it). For now, click is a no-op or shows a "Branch map coming soon" toast.
5. **`<IntegrityChip>` shows summarized integrity state** — e.g., a green ✓ when `validationIntegrity` is clean, a yellow ⚠ when warnings present, a red ✗ when broken refs. Click expands to a small popover with the validation summary (SPEC-89 takes this further with the full Validation & Integrity tab).
6. **Slots for T009/T010** — the shell renders `props.proseSlot`, `props.choicesSlot`, `props.terminalSlot` (where each defaults to a placeholder until T009/T010 provide real content via composition at app.tsx level or via route-internal imports). Decision: route imports T009/T010's components directly when those tickets land; no slot prop API needed for intra-batch composition.
7. **Mobile layout: single-column** per §8 — header → breadcrumb → prose → choices → terminal (when applicable) → x-ray slot. Desktop layout: same vertical flow plus right-rail summary slot (SPEC-89 fills).
8. **No backwards-compatibility aliasing/shims introduced** — greenfield route + components.

## Verification Layers

1. **Route renders PageDetail from `getPageDetail()`** → unit test with mocked client; assert header, breadcrumb, and section structure render.
2. **PageHeader displays all required fields** → unit test: story title, page ID, branch chip, turn index, integrity chip — all present and readable.
3. **Breadcrumb renders World / Story / Branch / PG hierarchy** → unit test: assert `<nav aria-label="Breadcrumb">` + 4-item `<ol>` with proper separators; parent-page link when `parentPageId !== null`.
4. **404 handling for missing PG** → unit test: backend returns 404; assert the route renders the polished 404 from §9 (T011 wires the actual UI; this ticket reserves the ErrorBoundary catch path).
5. **Slot structure preserved** → unit test: assert the route renders the prose-section / choices-section / terminal-section / x-ray-section containers in order, even when their contents are placeholders.

## What to Change

### 1. Create `tools/story-explorer/web/src/routes/page-read.tsx`

Functional component implementing §4.4's structural contract. Reads `worldSlug`, `storySlug`, `pageId` from URL params. Fetches `getPageDetail(worldSlug, storySlug, pageId)`. Wrapped in `<ErrorBoundary>` + `<Suspense fallback={<RouteLoading label="Loading page..." />}>`.

Structure (top to bottom):
- `<PageHeader>` (component below)
- `<Breadcrumb>` (component below)
- `<section className="prose-section">` — placeholder content for now: `<p>Prose panel slot (T009 fills)</p>`. T009 replaces with `<ProsePanel>` / `<ProseMissingPlaceholder>`.
- `<section className="choices-section">` — placeholder: `<p>Choice cards slot (T010 fills)</p>`. T010 replaces with `<ChoiceCard>` list.
- `<section className="terminal-section">` — conditional placeholder when `pageSummary.isLeaf === true` AND `pageSummary.choiceNavigation.every(c => !c.isNavigable)`; placeholder: `<p>Terminal card slot (T010 fills)</p>`. T010 replaces with `<TerminalCard>`.
- `<section className="xray-section">` — placeholder: `<p>State X-Ray slot (SPEC-89 fills)</p>`.
- Right rail (desktop only): `<aside className="summary-rail">` placeholder: `<p>Summary rail slot (SPEC-89 fills)</p>`.

### 2. Create `tools/story-explorer/web/src/components/PageHeader.tsx`

Functional component. Props: `pageDetail: PageDetail`, `storyTitle: string`. Renders horizontal bar:
- Story title (left)
- Page ID, BranchChip, turn index (center)
- Parent/back button (when `parentPageId !== null` — `<Link to={parent path}>`), branch-map placeholder button (no-op for now), page-jump placeholder button (no-op for now), IntegrityChip (right)

### 3. Create `tools/story-explorer/web/src/components/Breadcrumb.tsx`

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
Parent-page link rendered as a small inline "← Parent: PG-{n}" when `parentPageId !== null`.

### 4. Create `tools/story-explorer/web/src/components/BranchChip.tsx`

Small inline chip (e.g., `BR-3`). Props: `branchId: string`, `onClick?: () => void`. Renders as a `<button>` with the chip styling; default click is no-op (SPEC-90 wires the branch-map drawer trigger).

### 5. Create `tools/story-explorer/web/src/components/IntegrityChip.tsx`

Small chip showing integrity state. Props: `validationIntegrity: ValidationIntegritySummary`. Renders green ✓ / yellow ⚠ / red ✗ based on summary content. Click expands to a small popover with the integrity summary; full Validation & Integrity tab is SPEC-89's surface.

### 6. Update `tools/story-explorer/web/src/app.tsx`

Replace the `/worlds/:slug/stories/:storySlug/pages/:pageId` placeholder with the imported route.

### 7. Create tests

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
