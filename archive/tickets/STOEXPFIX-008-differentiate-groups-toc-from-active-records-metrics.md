# STOEXPFIX-008: Differentiate the Groups TOC from the Active Records metrics list in the summary rail

**Status**: COMPLETED
**Priority**: LOW-MEDIUM
**Effort**: Small
**Engine Changes**: None — frontend-only change to `tools/story-explorer/web/src/components/xray/StickyRail.tsx`, `tools/story-explorer/web/src/styles/app.css`, and the existing StickyRail a11y assertion.
**Deps**: None

## Problem

At intake, the page-detail route's right-side summary rail (visible at viewport widths ≥ 75rem, e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`) rendered two visually identical-looking lists stacked:

1. **Active Records** — a metrics list pairing each of the eight record-group labels with a count (e.g., `Cast & Status 9`, `Scene & Affordances 5`, `Knowledge & Truth 25`, ...).
2. **Groups** — a TOC of jump-to-anchor links to those same eight groups within the Current State tab.

The two lists are functionally distinct (metrics vs navigation), but the intake styling made them look like duplicates: both showed the same eight group labels stacked vertically, the "Groups" links had no link affordance (no underline, no color differentiation; they rendered as bold dark text styled identically to surrounding metric labels per the intake `app.css` rule), and the two `<section>`s sat immediately adjacent in the rail.

Verified intake source: `tools/story-explorer/web/src/components/xray/StickyRail.tsx` rendered Active Records (`<ul class="xray-summary-list">` with strong counts) and a Groups TOC (`<nav class="xray-summary-section"><ul class="xray-summary-toc">` with `<a href="#anchor">` jumps). The intake TOC `<a>` styling declared `color: var(--color-text-secondary); font-weight: 700; text-decoration: none;` — identical hue to surrounding ambient text, no underline. The links were present and functional, but visually hidden as links.

## Assumption Reassessment (2026-05-27)

1. `tools/story-explorer/web/src/components/xray/StickyRail.tsx:21-62` is the only render site of the summary rail. The two lists are intentional (separate `<section>` with `<h3>` headings) but visually indistinguishable. Verified by Read.
2. At intake, `tools/story-explorer/web/src/styles/app.css` defined `.xray-summary-toc a { ... color: var(--color-text-secondary); font-weight: 700; text-decoration: none; }`. That styling disabled the link affordance (no underline) and matched the surrounding ambient secondary-text color, so the list read as redundant rather than navigational.
3. The fix is presentation-only: differentiate the Groups TOC's link affordance and clarify the heading. Two narrow surfaces — the heading text and the link CSS — capture the entirety of the bug.
4. The Active Records list at `StickyRail.tsx:34-44` is correct — counts are useful, and the visual treatment is appropriate for metrics. No change there.
5. The Groups list is genuinely useful: clicking a group anchor scrolls the Current State tab to that group's `<section id="<groupAnchor>">`. Verified by inspection of `groupActiveRecords.ts` (referenced by `StickyRail.tsx:2`). Keep the section; fix only the affordance.
6. No FOUNDATIONS principle is engaged. The story-explorer is a read-only human surface over `_source/`; summary-rail presentation is UI typography, not canon storage or validation.
7. Reassessment on 2026-05-27 found one same-seam test surface: `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.a11y.test.tsx` asserts the nav landmark name as `Groups`. That assertion must be updated with the heading change. No package README exists under `tools/story-explorer/web`, and repo-level docs do not document this private component surface.
8. Pre-edit package baseline passed: `npm test` from `tools/story-explorer/web` reported 76 test files and 185 tests passing. The run emitted existing React Router future-flag warnings and an expected ErrorBoundary test stderr trace, but exited 0.

## Architecture Check

1. The minimal fix has two parts: (a) rename the heading `Groups` → `Jump to group` (or similar phrasing that signals navigation), and (b) restore the link affordance (`text-decoration: underline` and a link color, or a hover-color change) so the user reads each row as an interactive anchor.
2. The alternative — combining Active Records and Groups into a single list where each row shows `<a href="#anchor"><label> <count></a>` — is more compact but a larger refactor and changes the metrics list's accessibility role from `<ul>` to `<nav>`. The simpler fix is to differentiate the two visually.
3. No backwards-compatibility shim.

## Verification Layers

1. Browser computed-style check: the rail's second list is clearly identifiable as navigation — heading reads `Jump to group`, and the rows render with link affordance through underline and distinct accent color.
2. Browser computed-style assertion: `getComputedStyle(document.querySelector('.xray-summary-toc a')).textDecorationLine` includes `underline` and its `color` resolves to a value distinct from the metrics-list secondary text.
3. Existing tests for `StickyRail.tsx` continue to pass after updating the a11y landmark-name assertion from `Groups` to `Jump to group`.
4. `npm test` passes from `tools/story-explorer/web`.
5. `npm run build` passes from `tools/story-explorer/web` (package-local typecheck lane — no separate `typecheck` script exists in the `web` package).

## Landed Changes

### 1. Renamed the Groups heading in `tools/story-explorer/web/src/components/xray/StickyRail.tsx`

The desktop summary-rail TOC heading now reads:

```tsx
<nav className="xray-summary-section" aria-labelledby="xray-rail-toc-title">
  <h3 id="xray-rail-toc-title">Jump to group</h3>
```

The existing StickyRail a11y assertion now expects the navigation landmark name `Jump to group`.

### 2. Restored link affordance on the Groups TOC in `tools/story-explorer/web/src/styles/app.css`

The `.xray-summary-toc a` rule now uses accent color and underline styling:

```css
.xray-summary-toc a {
  display: inline-flex;
  width: 100%;
  min-height: 1.75rem;
  align-items: center;
  color: var(--color-accent);
  font-size: var(--font-size-sm);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.xray-summary-toc a:hover {
  color: var(--color-accent-strong);
}
```

The hover rule continues to shift color to the stronger accent.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/StickyRail.tsx` (modify)
- `tools/story-explorer/web/src/styles/app.css` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.a11y.test.tsx` (modify)

## Out of Scope

- Refactoring the summary rail to merge Active Records and Groups into a single list with both counts and anchors. That is a structural change with accessibility implications (a `<nav>` whose items contain metric data); the present visual differentiation is sufficient.
- Adding scroll-spy behavior (highlighting the active group as the user scrolls). Out of scope for a presentation fix.
- Changing the mobile summary bar (`MobileSummaryBar.tsx`) — the redundancy is not present there (the mobile bar has a single `<select>` for jump, not two parallel lists).

## Acceptance Criteria

### Tests That Must Pass

1. Browser computed-style proof confirms the second list in the rail is visually identifiable as navigation: underlined accent-colored links, distinct from the Active Records list above.
2. Browser computed-style assertion: `getComputedStyle(document.querySelector('.xray-summary-toc a')).textDecorationLine.includes('underline') === true`.
3. Browser computed-style assertion: the resolved `color` of `.xray-summary-toc a` is not equal to the resolved `color` of `.xray-summary-list li span` (a member of the Active Records list).
4. The Groups list heading text is `Jump to group` — confirmed in DOM and by the StickyRail a11y test.
5. `npm test` passes from `tools/story-explorer/web`.
6. `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. The summary rail's two lists (Active Records, Groups TOC) remain visually distinguishable at all supported viewport widths ≥ 75rem.
2. Each Groups TOC entry is rendered as a perceptibly-interactive link (underline AND/OR distinct color).
3. The Active Records metrics list remains unchanged in role and visual treatment.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.a11y.test.tsx` — update the nav landmark-name assertion to `Jump to group`.
2. None strictly required for the CSS change; a guard puppeteer-style assertion (textDecoration, color distinction) is sufficient.

### Commands

1. `npm test` from `tools/story-explorer/web`
2. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
3. Browser computed-style proof against the dev-served CSS from `tools/story-explorer/web`: injected a minimal summary-rail DOM at a wide viewport and confirmed `heading: "Jump to group"`, `textDecorationLine: "underline"`, link `color: rgb(31, 111, 120)`, metrics `color: rgb(89, 98, 104)`, and `textUnderlineOffset: "3px"`.

## Outcome

Completion date: 2026-05-27.

The desktop StickyRail TOC now advertises itself as navigation with the `Jump to group` heading. Its links render in the accent color with an underline and 3px underline offset, while Active Records metrics keep their existing secondary-text treatment. The existing a11y test now checks the updated navigation landmark name.

## Verification Result

1. `npm test -- StickyRail` from `tools/story-explorer/web` — passed; 2 test files and 2 tests passed.
2. `npm run build` from `tools/story-explorer/web` — passed; TypeScript and Vite production build completed.
3. `npm test` from `tools/story-explorer/web` — passed; 76 test files and 185 tests passed. Existing React Router future-flag warnings and the expected ErrorBoundary test stderr trace were still present.
4. Browser computed-style proof via the Playwright CLI against `http://127.0.0.1:5174/` and the dev-served `src/styles/app.css` — passed; heading, underline, distinct link/metric colors, and underline offset matched the landed contract.

## Deviations

- The drafted test note only mentioned a possible `StickyRail.test.tsx` heading assertion. Live reassessment found the same-seam assertion in `StickyRail.a11y.test.tsx`, so that test was updated instead.
- The Vite-only page-detail route could not complete its proxied `/api/...` loads in this checkout without the backend API process, so the browser proof used the dev-served CSS with a minimal StickyRail DOM instead of claiming a full route visual smoke.
- No package README exists under `tools/story-explorer/web`; repo-level docs do not document this private component surface, so no package docs/examples changed.
