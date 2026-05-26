# SPEC89STOEXPSTA-008: Linked-record navigation primitives

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `LinkedRecordPeek.tsx` + `BrokenReferenceChip.tsx` components plus navigation-semantics integration with SPEC-88's routing and (eventually) SPEC-90's branch-map drawer
**Deps**: archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

SPEC-89 §6 defines the linked-record navigation rules: when a record card contains a chip linking to another record, three cases govern the click behavior — (1) **active on current page** (linked record present in `PG.state_snapshot.active_records`): scroll to its card in the X-Ray; (2) **exists but not active**: open a right-side peek panel with the record's compact card and a "not active on this page" chip; (3) **broken** (cited ID doesn't resolve): render as an `Unresolved reference` chip with the cited ID, also listed under Validation & Integrity. Additionally, three special link semantics: PG links navigate to that page (per SPEC-88 routing); SE links open the SE in the What Changed Here tab; CHC links highlight the choice card in the reading view (and, when SPEC-90 lands, focus the corresponding branch-map edge).

This ticket creates `LinkedRecordPeek.tsx` (right-side peek panel for case 2) and `BrokenReferenceChip.tsx` (case 3 display), plus a navigation dispatcher module that routes record-link clicks per the three cases + three special semantics.

## Assumption Reassessment (2026-05-26)

1. SPEC-88's React Router setup at `tools/story-explorer/web/src/app.tsx` and `tools/story-explorer/web/src/routes/page-read.tsx` exists (verified via SPEC-88 §4). SPEC-87's `/records/:recordId` route exists for fetching not-active linked records (verified). SPEC-88's `disclosure/` primitive at `tools/story-explorer/web/src/components/disclosure/` is the canonical pattern this peek panel reuses.
2. SPEC-89 §6 (Linked-record navigation) defines the three cases + three special semantics. SPEC-90 (Branch map & search) future work consumes the CHC-link semantics for branch-map edge focusing; for now, CHC link clicks scroll to the reading-area choice card per SPEC-88's choice list.
3. Cross-skill boundary: SPEC-88's page-routing module (`app.tsx` + `routes/page-read.tsx`) is the destination for PG link clicks. SPEC-90 is not yet landed; the CHC link handler currently only scrolls to the choice card and includes a TODO comment for the SPEC-90 branch-map focus integration. The `<BrokenReferenceChip>` is rendered in both the X-Ray cards (when a link target is broken) and the Validation & Integrity tab (which lists all broken refs from `pageDetail.validationIntegrity`).

## Architecture Check

1. Single navigation-dispatcher module handles the three cases + three special semantics in one place; the alternative (per-card switch logic) would spread the cases across every component that renders a record link. Centralizing the dispatch keeps the §6 contract auditable in one file.
2. No backwards-compatibility aliasing or shims — the `<BrokenReferenceChip>` is new; legacy "broken reference" rendering (plain text in SPEC89STOEXPSTA-007 interim) is replaced wholesale when this ticket lands.

## Verification Layers

1. Active-record link click scrolls to the card in the X-Ray → DOM-scroll test with mock `scrollIntoView`.
2. Not-active link click opens the peek panel with the record's compact card + "not active" chip → render test with mocked `/records/:recordId` fetch.
3. Broken-ref chip renders the cited ID with appropriate styling → snapshot test.
4. PG link triggers React Router navigation → mock-router test.
5. SE link switches the X-Ray to What Changed Here tab → tab-state test.
6. CHC link scrolls to the choice card in the reading view → DOM-scroll test on `<ChoiceCard>` host.

## What to Change

### 1. Create `LinkedRecordPeek.tsx`

Right-side peek panel rendered inside the X-Ray surface. On open, fetches `/api/.../records/{recordId}` and renders `<RecordCardCompact>` with the response plus a "not active on this page" chip. The panel can be dismissed with Escape, click outside, or an explicit close button. Reuses SPEC-88's disclosure primitive for the open/close animation (respecting `prefers-reduced-motion`).

### 2. Create `BrokenReferenceChip.tsx`

Inline display for unresolved references. Renders the cited record ID with a "Unresolved reference" tooltip + a destructive-styled chip border. Clickable to copy the cited ID to clipboard (for the operator to investigate). Used both in record cards (inline broken link target) and in the Validation & Integrity tab listing.

### 3. Create navigation dispatcher module

`tools/story-explorer/web/src/components/xray/navigation-dispatcher.ts` — exports a single `dispatchRecordLinkClick(recordId, context)` function that routes per the three cases + three special semantics. Imports the active-records list from `pageDetail.state_snapshot.active_records` to determine case 1; calls `/records/:recordId` HEAD (or full GET if HEAD unsupported) to determine case 2 vs 3; uses React Router's `useNavigate()` for PG links; dispatches a tab-switch event for SE links; uses `document.querySelector` + `scrollIntoView` for CHC links.

### 4. Integrate with existing tabs

Tabs 004-007 wrap their record-ID chips with click handlers calling the navigation dispatcher. Update calls are minimal but cross-cutting:
- `CurrentStateTab.tsx`: chip clicks dispatch via the new module.
- `WhatChangedHereTab.tsx`: state-delta chip clicks dispatch.
- `PlanProseTab.tsx`: receipt-affected-record chip clicks dispatch.
- `ValidationIntegrityTab.tsx`: broken-ref display switches from plain text to `<BrokenReferenceChip>`.

### 5. Add tests

- `__tests__/LinkedRecordPeek.test.tsx` — peek panel render + dismiss.
- `__tests__/BrokenReferenceChip.test.tsx` — display + clipboard interaction.
- `__tests__/navigation-dispatcher.test.ts` — unit tests for the three cases + three special semantics.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/LinkedRecordPeek.tsx` (new)
- `tools/story-explorer/web/src/components/xray/BrokenReferenceChip.tsx` (new)
- `tools/story-explorer/web/src/components/xray/navigation-dispatcher.ts` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/LinkedRecordPeek.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/BrokenReferenceChip.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/navigation-dispatcher.test.ts` (new)

## Out of Scope

- SPEC-90's branch-map drawer integration (CHC link → branch-map edge focus) — that's SPEC-90's work; this ticket leaves a TODO + comment in the dispatcher.
- Modifying tabs 004-007's structure beyond wrapping chip clicks with the dispatcher call.
- Accessibility verification (SPEC89STOEXPSTA-012).
- Visual styling beyond tokens.css.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- LinkedRecordPeek.test BrokenReferenceChip.test navigation-dispatcher.test` — all three pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Visual smoke in dev mode: click a record-ID chip in a tab; verify peek panel opens for not-active records, scroll happens for active records, broken-ref chip displays for unresolved IDs.

### Invariants

1. The navigation dispatcher is the SINGLE source of truth for record-link click behavior; no tab implements its own link click handler.
2. Broken-ref chips appear in both record cards AND the Validation & Integrity tab; the two surfaces share the same `<BrokenReferenceChip>` component.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/LinkedRecordPeek.test.tsx` — peek panel mount + dismiss + fetch mocking.
2. `tools/story-explorer/web/src/components/xray/__tests__/BrokenReferenceChip.test.tsx` — chip render + clipboard interaction.
3. `tools/story-explorer/web/src/components/xray/__tests__/navigation-dispatcher.test.ts` — unit tests covering 3 cases × 3 link types.

### Commands

1. `cd tools/story-explorer/web && npm test -- LinkedRecordPeek.test BrokenReferenceChip.test navigation-dispatcher.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
