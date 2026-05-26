# SPEC89STOEXPSTA-012: Accessibility — axe-core sweep + WAI-ARIA verification

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `.a11y.test.tsx` files covering each X-Ray surface, a shared X-Ray a11y fixture helper, a cross-tab a11y test verifying the WAI-ARIA tabs pattern across all four tabs simultaneously, and two same-seam X-Ray accessibility fixes surfaced by the sweep
**Deps**: archive/tickets/SPEC89STOEXPSTA-004.md, archive/tickets/SPEC89STOEXPSTA-005.md, archive/tickets/SPEC89STOEXPSTA-006.md, archive/tickets/SPEC89STOEXPSTA-007.md, archive/tickets/SPEC89STOEXPSTA-008.md, archive/tickets/SPEC89STOEXPSTA-009.md, archive/tickets/SPEC89STOEXPSTA-010.md, archive/tickets/SPEC89STOEXPSTA-011.md

## Problem

SPEC-89 §11 prescribes the accessibility baseline for the X-Ray: tab list using WAI-ARIA tabs pattern (`role="tablist"`, `role="tab"`, `aria-selected`, arrow-key navigation), group headers as buttons inside `<h3>` semantic headings (accordion pattern per WAI-ARIA APG), card disclosures using the disclosure pattern (button controlling hidden/visible content, Enter/Space toggles, `aria-expanded` reflects state), raw YAML disclosure with `<pre><code>` and language label, hidden/secret/author-only chips with accessible labels (not color-only signal), reduced motion respected on every expand/collapse animation. SPEC-88's a11y baseline (landed via SPEC88STOEXPFRO-012) established axe-core/vitest-axe wiring for the SPEC-88 surface; this ticket extends that wiring to the X-Ray surface in a single consolidating sweep, parallel to the SPEC-88 a11y-baseline-ticket precedent.

## Assumption Reassessment (2026-05-26)

1. SPEC-88's a11y wiring (axe-core + vitest-axe) is landed and available at `tools/story-explorer/web/` per SPEC-88 §10 + SPEC88STOEXPFRO-012 (verified via the IMPLEMENTATION-ORDER.md status note for SPEC-88). All X-Ray components from SPEC89STOEXPSTA-001 through -011 existed at intake (intra-batch dependency on the leaf set per SPEC-89 §15 + the parallel-branch leaf-set convention).
2. SPEC-89 §11 (Accessibility) specifies the WAI-ARIA contracts. SPEC-88 §8 (Accessibility baseline) provides the underlying WCAG AA discipline (tab order, contrast, reduced motion) the X-Ray inherits.
3. Cross-skill boundary: SPEC-88's `disclosure/` primitive ARIA contract (button + `aria-expanded` + Enter/Space + reduced-motion) is the standard the X-Ray surfaces inherit. axe-core/vitest-axe runs against the rendered DOM per SPEC-88's established pattern; this ticket adds `.a11y.test.tsx` files alongside each X-Ray component without modifying the underlying axe-core wiring.
4. The first `npm test -- a11y.test` run exposed two same-seam X-Ray defects that had to be fixed before this verification ticket could close honestly: inactive tabs advertised `aria-controls` values for tab panels that were not mounted, and the Plan & Prose tab rendered a nested `aside` landmark plus embedded markdown headings that could skip from the tab's `h3` hierarchy. The landed scope therefore includes the minimal component fixes in `XRayPanel.tsx` and `PlanProseTab.tsx` instead of creating a follow-up for defects discovered inside this ticket's own required proof lane.

## Architecture Check

1. Consolidated a11y ticket (one ticket adding tests across the full surface) parallels SPEC-88's SPEC88STOEXPFRO-012 ticket pattern. The alternative (per-component a11y test in each component ticket) would distribute the a11y discipline across 11+ tickets, making the baseline harder to audit; consolidation keeps the X-Ray a11y baseline in one reviewable diff.
2. No backwards-compatibility aliasing or shims — all `.a11y.test.tsx` files are greenfield; the cross-tab a11y test reuses the WAI-ARIA tabs pattern from SPEC89STOEXPSTA-001 without modification.

## Verification Layers

1. axe-core zero-violation pass for each X-Ray surface (XRayPanel, XRayTabs, XRayGroup, RecordCard{Compact,Expanded}, RawRecordDisclosure, LinkedRecordPeek, BrokenReferenceChip, StickyRail, MobileSummaryBar, each tab) → `.a11y.test.tsx` per component → vitest + axe-core.
2. Cross-tab arrow-key navigation: focus the tablist; ArrowRight cycles through tabs; aria-selected updates correctly → keyboard-interaction test on `<XRayPanel>` with all four real tabs mounted.
3. Reduced-motion respected on every expand/collapse: with `prefers-reduced-motion: reduce`, expand animations are disabled → media-query mock test.
4. Hidden/secret/author-only chips have accessible labels (not color-only) → axe-core check + grep-proof for `aria-label` attributes on the chip components.

## What to Change

### 1. Land `.a11y.test.tsx` files for each X-Ray component

Per-component a11y tests adding the standard axe-core sweep:

- `__tests__/XRayPanel.a11y.test.tsx` — full panel render + axe-core zero-violations + tablist ARIA contract.
- `__tests__/XRayTabs.a11y.test.tsx` — tablist isolated + arrow-key keyboard nav.
- `__tests__/XRayGroup.a11y.test.tsx` — accordion disclosure ARIA + group-header-as-button-inside-h3 semantic.
- `__tests__/RecordCardCompact.a11y.test.tsx` — compact card + chip accessible labels (no color-only signal).
- `__tests__/RecordCardExpanded.a11y.test.tsx` — expanded card + disclosure ARIA + reduced-motion.
- `__tests__/RawRecordDisclosure.a11y.test.tsx` — disclosure pattern + `<pre><code>` language label.
- `__tests__/LinkedRecordPeek.a11y.test.tsx` — peek panel focus management + dismiss-on-Escape.
- `__tests__/BrokenReferenceChip.a11y.test.tsx` — chip accessible labels.
- `__tests__/StickyRail.a11y.test.tsx` — desktop rail with sticky positioning.
- `__tests__/MobileSummaryBar.a11y.test.tsx` — mobile bar.
- `__tests__/HybridSectionParser.a11y.test.tsx` — N/A (parser is non-visual); skip.

Per-tab a11y tests:

- `tabs/__tests__/CurrentStateTab.a11y.test.tsx`
- `tabs/__tests__/WhatChangedHereTab.a11y.test.tsx`
- `tabs/__tests__/PlanProseTab.a11y.test.tsx`
- `tabs/__tests__/ValidationIntegrityTab.a11y.test.tsx`

### 2. Create cross-tab a11y test

`tabs/__tests__/all-tabs.a11y.test.tsx` — mounts `<XRayPanel>` with all four tabs and verifies:
- ArrowRight from tab 1 → tab 2 → tab 3 → tab 4 → wraps to tab 1.
- ArrowLeft cycles backwards.
- Home → tab 1; End → tab 4.
- aria-selected always matches the focused tab.
- aria-controls / aria-labelledby resolve correctly between tabs and tab panels.

### 3. Reduced-motion test helper

SPEC-88 already exported `withReducedMotion` from `tools/story-explorer/web/src/lib/a11y-test-helpers.tsx`; no new reduced-motion helper was needed.

### 4. Fix same-seam violations exposed by the sweep

- `XRayPanel.tsx` now renders all four tabpanel containers so every tab's `aria-controls` target exists, while still mounting only the active tab body so Plan & Prose stays on-demand.
- `PlanProseTab.tsx` now renders the boundary banner as a `role="note"` block instead of a nested complementary landmark and normalizes sanitized embedded plan headings under the tab section.

## Files to Touch

- 11 new component `.a11y.test.tsx` files under `tools/story-explorer/web/src/components/xray/__tests__/`
- `tools/story-explorer/web/src/components/xray/__tests__/a11y-fixtures.ts` (new shared X-Ray a11y fixture helper)
- 4 new tab `.a11y.test.tsx` files under `tools/story-explorer/web/src/components/xray/tabs/__tests__/`
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/all-tabs.a11y.test.tsx` (new — cross-tab a11y)
- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (modify — keep all tabpanel IDs mounted for resolvable `aria-controls`)
- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (modify — avoid nested complementary landmark and normalize embedded plan headings)

## Out of Scope

- Broader UX or visual redesign beyond the two same-seam accessibility fixes required to make this ticket's own axe-core proof pass.
- Performance benchmarking (separate concern; SPEC-89 §10 perf rules verified in SPEC89STOEXPSTA-004 + SPEC89STOEXPSTA-011).
- Visual styling beyond what SPEC-88 tokens provide.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- a11y.test` — all 16+ a11y test files pass with zero axe-core violations.
2. `cd tools/story-explorer/web && npm test -- all-tabs.a11y.test` — cross-tab arrow-key + Home/End + wraps pass.
3. `cd tools/story-explorer && npm run build` — build succeeds.

### Invariants

1. Zero axe-core violations across the X-Ray surface.
2. Every disclosure follows the SPEC-88 disclosure-primitive ARIA contract; no ad-hoc disclosure implementations.

## Test Plan

### New/Modified Tests

1. 16 new `.a11y.test.tsx` files plus one shared X-Ray a11y fixture helper.

### Commands

1. `cd tools/story-explorer/web && npm test -- a11y.test` — full a11y sweep.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.

## Outcome

Completed on 2026-05-26. The X-Ray accessibility sweep now covers the panel, tabs, groups, compact/expanded cards, raw-record disclosure, linked-record peek, broken-reference chips, provenance trail, sticky rail, mobile summary bar, all four tabs, and cross-tab keyboard navigation. The sweep exposed and fixed two same-seam defects: X-Ray tab `aria-controls` targets are now always present, and Plan & Prose avoids nested complementary landmarks while normalizing embedded markdown heading levels.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- a11y.test` — PASS; 35 a11y test files / 40 tests passed with zero axe-core violations.
2. `cd tools/story-explorer && npm run build` — PASS; web TypeScript + Vite build and backend TypeScript build succeeded.
3. `cd tools/story-explorer && npm test` — PASS; backend `node:test` reported 74/74 passing and web Vitest reported 76 files / 184 tests passing.

## Deviations

- The draft framed this as verification-only. The first a11y run found same-seam violations in `XRayPanel.tsx` and `PlanProseTab.tsx`; fixing them in this ticket was the narrowest honest closeout because the acceptance criteria required the a11y sweep to pass.
- No new reduced-motion helper was added because SPEC-88's existing `withReducedMotion` helper already covered the needed test surface.
