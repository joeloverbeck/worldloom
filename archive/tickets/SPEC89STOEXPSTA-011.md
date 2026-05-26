# SPEC89STOEXPSTA-011: Sticky rail (desktop) + Mobile summary bar

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `StickyRail.tsx` (desktop right rail) + `MobileSummaryBar.tsx` (mobile inline summary) components, mounted in the appropriate slot established by SPEC-88 §4.4
**Deps**: archive/tickets/SPEC89STOEXPSTA-004.md

## Problem

SPEC-89 §8 prescribes a sticky right-rail summary on viewports wider than ~1200px: current page chip (PG-N · BR-N), prose/receipt status icons, active-record counts by group, "What Changed" delta counts, and a mini table of contents for x-ray groups with anchor scroll. SPEC-89 §9 prescribes the mobile counterpart: an inline summary bar above the X-Ray groups (mobile flow section 4 in the SPEC-88 §8 mobile layout). The rail and bar are responsive variants of the same logical content; they switch based on viewport width.

SPEC-88 §4.4 already names the right-rail slot ("Right-rail summary on desktop (slot — SPEC-89 fills); inline summary bar above x-ray on mobile (slot — SPEC-89 fills)"). This ticket fills both.

## Assumption Reassessment (2026-05-26)

1. SPEC-88's reading-page layout at `tools/story-explorer/web/src/routes/page-read.tsx` reserves slots for the right rail (desktop) and the inline summary bar (mobile) per SPEC-88 §4.4 items 6-7 (verified). Active-record counts by group are derived from the SPEC89STOEXPSTA-004 group classification logic; "What Changed" delta counts are derived from `PG.input.resolved_event_id` → SE's `state_delta.{create,supersede,close}.length` aggregated.
2. SPEC-89 §8 (Sticky summary rail desktop) + §9 (Mobile behavior) + §11 (Accessibility — mobile inline bar above x-ray groups, no horizontal scrolling).
3. Cross-skill boundary: SPEC-88's `PageHeader.tsx` integrity chip is parallel to this rail's prose/receipt status icons — the rail provides a fuller summary, not a replacement. SPEC-88's mobile flow ordering (header → prose → choices → compact summary → x-ray groups) places the mobile summary bar between item 4 (compact state summary) and item 5 (x-ray groups); SPEC-89 §9's section 4 ("compact state summary") IS this mobile summary bar.

## Architecture Check

1. CSS-driven responsive switching (`@media (min-width: 1200px)`) rather than JavaScript window-size watching — the alternative (JS `useWindowSize` hook) would force a re-render at every resize and add complexity for marginal gain; CSS media queries are sufficient.
2. No backwards-compatibility aliasing or shims — both components are greenfield; mounting in SPEC-88's reserved slots is a direct replacement of the empty slot.

## Verification Layers

1. Desktop viewport (≥1200px): StickyRail renders with all chips (page chip, prose/receipt status, group counts, what-changed counts, ToC) → render test with mocked viewport width → vitest + RTL.
2. Mobile viewport (<1200px): MobileSummaryBar renders inline with the same logical content compressed into a single horizontal bar → render test with mocked viewport.
3. Group counts mirror the SPEC89STOEXPSTA-004 classification logic → fixture test with a known `currentStateRecordIds` set; assert the rail's counts match the tab's group sizes.
4. ToC anchor scroll: clicking a group name in the rail scrolls to that group in the Current State tab → DOM scroll test.

## Landed Changes

### 1. Created `StickyRail.tsx`

Desktop right-rail component. Accepts `pageDetail: PageDetail` as a prop. Renders:
- **Current page chip**: `{PG-N} · {BR-N}` (extracted from `pageDetail.page.id` + `pageDetail.branchContext.branchId`).
- **Prose/receipt status icons**: a row of small icons indicating prose presence (from `pageDetail.proseStatus`) and receipt presence (from `pageDetail.receiptSummary`).
- **Active record counts by group**: list of 8 group names with counts, derived from shared `groupActiveRecords.ts` classification.
- **What Changed counts**: `Created N · Superseded M · Closed K` from `pageDetail.eventDelta`.
- **Mini ToC**: list of group names as anchor links scrolling to each group in the Current State tab.

The rail uses CSS `position: sticky` with `top: <header-height>` so it stays visible as the user scrolls the X-Ray content.

### 2. Created `MobileSummaryBar.tsx`

Mobile inline-bar component. Renders the same logical content as the rail but compressed into a single horizontal bar above the X-Ray groups (per SPEC-88 §8 mobile flow item 4). On mobile the ToC is collapsed into a "Jump to group" select element rather than a vertical list.

### 3. Mounted both in `routes/page-read.tsx`

The route now renders `MobileSummaryBar` directly above `XRayPanel` and `StickyRail` inside the reserved summary aside. CSS media queries switch the visible component at the ~1200px desktop threshold.

### 4. Extracted shared classification helper

`tools/story-explorer/web/src/components/xray/groupActiveRecords.ts` now owns the group ordering, class-prefix-to-group mapping, anchor IDs, and record-id count helpers. `CurrentStateTab`, `XRayGroup`, `StickyRail`, and `MobileSummaryBar` consume that helper.

### 5. Added tests

- `__tests__/StickyRail.test.tsx` — desktop viewport render test.
- `__tests__/MobileSummaryBar.test.tsx` — mobile viewport render test.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/StickyRail.tsx` (new)
- `tools/story-explorer/web/src/components/xray/MobileSummaryBar.tsx` (new)
- `tools/story-explorer/web/src/components/xray/groupActiveRecords.ts` (new — extracted shared helper)
- `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/MobileSummaryBar.test.tsx` (new)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — mount both components in the reserved slots)
- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify if classification logic was inlined in SPEC89STOEXPSTA-004; refactor to import from `groupActiveRecords.ts`)

## Out of Scope

- Restructuring SPEC-88's reading-page layout beyond filling the reserved slots.
- A separate "What's New" widget — that's the WhatChangedHereTab's tab content, not the rail.
- Cross-bundle comparison or sibling-page peek (Future Enhancements).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- StickyRail.test MobileSummaryBar.test` — both pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Manual visual smoke in dev mode is not part of the accepted automated close boundary for this Codex pass; see `## Deviations`.

### Invariants

1. The rail and bar render the SAME logical content (counts, status, ToC); only the layout differs. A drift between them is a bug.
2. CSS `position: sticky` MUST not be replaced with a JS-driven scroll handler — the rule above states why.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.test.tsx` — desktop fixture.
2. `tools/story-explorer/web/src/components/xray/__tests__/MobileSummaryBar.test.tsx` — mobile fixture.

### Commands

1. `cd tools/story-explorer/web && npm test -- StickyRail.test MobileSummaryBar.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.

## Outcome

Completed 2026-05-26.

Implemented the SPEC-89 summary layer for the Story Explorer reading page:

- Added `StickyRail` for the desktop right rail and `MobileSummaryBar` for the inline mobile summary.
- Mounted the rail/bar in `page-read.tsx` using the SPEC-88 reserved slots.
- Extracted group classification and group anchor IDs into `groupActiveRecords.ts` so the Current State tab, rail, and mobile summary share the same grouping logic.
- Updated responsive CSS so the reading page widens for the rail, the desktop rail appears at the ~1200px threshold, and the mobile bar is hidden at that threshold.
- Added focused render/interaction tests for the new components and updated the page-read route test.

## Verification Result

Commands run on 2026-05-26:

1. `npm --prefix tools/story-explorer/web test -- CurrentStateTab.test page-read.test XRayPanel.test` — PASS before edits; 3 files / 8 tests passed. This established the pre-edit focused baseline.
2. `npm --prefix tools/story-explorer/web test -- StickyRail.test MobileSummaryBar.test CurrentStateTab.test page-read.test XRayPanel.test` — PASS after edits; 5 files / 11 tests passed.
3. `npm --prefix tools/story-explorer run build` — PASS; web TypeScript/Vite build and backend TypeScript build completed.
4. `npm --prefix tools/story-explorer test` — PASS; backend `node:test` lane passed 13/13 compiled test files and web vitest passed 60/60 files, 166/166 tests.

## Deviations

- The drafted visual smoke in a live dev browser was not run in this Codex pass because the harness did not start a paired Story Explorer backend/API with a real story bundle. The route/component tests and full package suite verify the DOM placement, group-count logic, responsive component presence, and build integration.
