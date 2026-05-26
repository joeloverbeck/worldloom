# SPEC89STOEXPSTA-008: Linked-record navigation primitives

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `LinkedRecordPeek.tsx` + `BrokenReferenceChip.tsx` components plus navigation-semantics integration with SPEC-88's routing and (eventually) SPEC-90's branch-map drawer
**Deps**: archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

At intake, SPEC-89 §6 defined the linked-record navigation rules: when a record card contains a chip linking to another record, three cases govern the click behavior — (1) **active on current page** (linked record present in `PG.state_snapshot.active_records`): scroll to its card in the X-Ray; (2) **exists but not active**: open a right-side peek panel with the record's compact card and a "not active on this page" chip; (3) **broken** (cited ID doesn't resolve): render as an `Unresolved reference` chip with the cited ID, also listed under Validation & Integrity. Additionally, three special link semantics: PG links navigate to that page (per SPEC-88 routing); SE links open the SE in the What Changed Here tab; CHC links highlight the choice card in the reading view (and, when SPEC-90 lands, focus the corresponding branch-map edge).

This ticket creates `LinkedRecordPeek.tsx` (right-side peek panel for case 2) and `BrokenReferenceChip.tsx` (case 3 display), plus a navigation dispatcher module that routes record-link clicks per the three cases + three special semantics.

## Assumption Reassessment (2026-05-26)

1. SPEC-88's React Router setup at `tools/story-explorer/web/src/app.tsx` and `tools/story-explorer/web/src/routes/page-read.tsx` exists. SPEC-87's `/records/:recordId` route exists for fetching not-active linked records. The live `RecordLink` view-model already carries `targetExists` and `activeOnCurrentPage`, so the final dispatcher does not issue a speculative HEAD/full GET probe for record-card links; the peek panel fetches not-active records through the canonical record route.
2. SPEC-89 §6 (Linked-record navigation) defines the three cases + three special semantics. SPEC-90 (Branch map & search) future work consumes the CHC-link semantics for branch-map edge focusing; for now, CHC link clicks scroll to the reading-area choice card per SPEC-88's choice list.
3. Cross-skill boundary: SPEC-88's page-routing module (`app.tsx` + `routes/page-read.tsx`) is the destination for PG link clicks. SPEC-90 is not yet landed; the CHC link handler currently only scrolls to the choice card. The `<BrokenReferenceChip>` is rendered in both the X-Ray cards (when a link target is broken) and the Validation & Integrity tab (which lists all broken refs from `pageDetail.validationIntegrity`).
4. Live tab inventory correction: `PlanProseTab.tsx` does not currently render record-ID chips, so there was no same-seam Plan & Prose click hook to wire in this ticket. The landed integration covers `RecordCardExpanded`, `CurrentStateTab`, `WhatChangedHereTab`, `ValidationIntegrityTab`, `XRayPanel`, and `ChoiceCard`.

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

## Landed Changes

### 1. Created `LinkedRecordPeek.tsx`

Right-side peek panel rendered inside the X-Ray surface. On open, it fetches `/api/.../records/{recordId}` and renders `<RecordCardCompact>` with the response plus a "not active on this page" chip. The panel can be dismissed with Escape, click outside, or an explicit close button. It uses a simple fixed side panel rather than the SPEC-88 disclosure primitive because the live primitive only models inline collapsed content, not an overlay panel.

### 2. Created `BrokenReferenceChip.tsx`

Inline display for unresolved references. Renders the cited record ID with a "Unresolved reference" tooltip + a destructive-styled chip border. Clickable to copy the cited ID to clipboard (for the operator to investigate). Used both in record cards (inline broken link target) and in the Validation & Integrity tab listing.

### 3. Created navigation dispatcher module

`tools/story-explorer/web/src/components/xray/navigation-dispatcher.ts` exports `dispatchRecordLinkClick(target, context)` and routes per the active/not-active/broken cases plus PG/SE/CHC semantics. It receives the current page's active record IDs from `XRayPanel`, uses React Router navigation for PG links, switches the X-Ray tab for SE links, and uses `document.querySelector` + `scrollIntoView` for active record and CHC targets.

### 4. Integrated with existing tabs

Existing record-ID chip surfaces now call the navigation dispatcher:
- `CurrentStateTab.tsx`: chip clicks dispatch via the new module.
- `WhatChangedHereTab.tsx`: state-delta chip clicks dispatch.
- `ValidationIntegrityTab.tsx`: broken-ref display switches from plain text to `<BrokenReferenceChip>`.
- `RecordCardExpanded.tsx`: related-record chips dispatch for active/not-active links and render broken links through `<BrokenReferenceChip>`.
- `ChoiceCard.tsx`: choice card hosts expose `data-choice-id` anchors for CHC scroll targets.

### 5. Added tests

- `__tests__/LinkedRecordPeek.test.tsx` — peek panel render + dismiss.
- `__tests__/BrokenReferenceChip.test.tsx` — display + clipboard interaction.
- `__tests__/navigation-dispatcher.test.ts` — unit tests for the three cases + three special semantics.
- Existing `RecordCard`, `ValidationIntegrityTab`, `WhatChangedHereTab`, and `XRayPanel` tests were updated for the new clickable/navigation integration.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/LinkedRecordPeek.tsx` (new)
- `tools/story-explorer/web/src/components/xray/BrokenReferenceChip.tsx` (new)
- `tools/story-explorer/web/src/components/xray/navigation-dispatcher.ts` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/LinkedRecordPeek.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/BrokenReferenceChip.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/navigation-dispatcher.test.ts` (new)
- `tools/story-explorer/web/src/components/ChoiceCard.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardExpanded.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/WhatChangedHereTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` (modify)
- `tools/story-explorer/web/src/styles/app.css` (modify)

## Out of Scope

- SPEC-90's branch-map drawer integration (CHC link → branch-map edge focus) — that's SPEC-90's work.
- `PlanProseTab.tsx` record-chip wiring; the live tab has no record-ID chip surface yet.
- Accessibility verification (SPEC89STOEXPSTA-012).
- Visual styling beyond tokens.css.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- LinkedRecordPeek.test BrokenReferenceChip.test navigation-dispatcher.test RecordCard.test ValidationIntegrityTab.test XRayPanel.test WhatChangedHereTab.test` — focused navigation/component tests pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. `cd tools/story-explorer && npm test` — full backend + web package suite passes.

### Invariants

1. The navigation dispatcher is the SINGLE source of truth for record-link click behavior; no tab implements its own link click handler.
2. Broken-ref chips appear in both record cards AND the Validation & Integrity tab; the two surfaces share the same `<BrokenReferenceChip>` component.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/LinkedRecordPeek.test.tsx` — peek panel mount + dismiss + fetch mocking.
2. `tools/story-explorer/web/src/components/xray/__tests__/BrokenReferenceChip.test.tsx` — chip render + clipboard interaction.
3. `tools/story-explorer/web/src/components/xray/__tests__/navigation-dispatcher.test.ts` — unit tests covering 3 cases × 3 link types.
4. Updated existing tab/panel tests listed in Files to Touch.

### Commands

1. `cd tools/story-explorer/web && npm test -- LinkedRecordPeek.test BrokenReferenceChip.test navigation-dispatcher.test RecordCard.test ValidationIntegrityTab.test XRayPanel.test WhatChangedHereTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.

## Outcome

Completed: 2026-05-26

Implemented SPEC-89 linked-record navigation primitives in the Story Explorer frontend. The X-Ray now has a central dispatcher, a not-active linked-record peek panel, a shared unresolved-reference chip, clickable related-record/state-delta chips, PG/SE/CHC special routing, and choice/record DOM anchors for scroll targets.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- LinkedRecordPeek.test BrokenReferenceChip.test navigation-dispatcher.test RecordCard.test ValidationIntegrityTab.test XRayPanel.test WhatChangedHereTab.test` — PASS (7 files, 18 tests).
2. `cd tools/story-explorer && npm run build` — PASS (web TypeScript compile, Vite bundle, backend TypeScript compile).
3. `cd tools/story-explorer && npm test` — PASS (74 backend node tests, 152 web vitest tests). The web suite still emits existing React Router v7 future-flag warnings and the intentional ErrorBoundary test error output; no test failures.

## Deviations

1. The dispatcher does not issue a HEAD/full GET probe for record-card link existence. The live `RecordLink` view-model already carries `targetExists`; not-active links open the peek panel, which fetches the record through the existing `/records/:recordId` route and renders an unresolved-reference chip if that fetch fails.
2. `PlanProseTab.tsx` was not modified because the live tab does not render record-ID chips. The ticket's drafted "receipt-affected-record chip" hook had no current substrate.
3. Manual dev-mode visual smoke was not claimed. The accepted proof is focused DOM/component coverage plus the full package build/test suite.
