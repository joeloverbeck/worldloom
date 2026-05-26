# STOEXPFIX-008: Differentiate the Groups TOC from the Active Records metrics list in the summary rail

**Status**: PENDING
**Priority**: LOW-MEDIUM
**Effort**: Small
**Engine Changes**: None — frontend-only change to `tools/story-explorer/web/src/components/xray/StickyRail.tsx` and `tools/story-explorer/web/src/styles/app.css`
**Deps**: None

## Problem

On the page-detail route's right-side summary rail (visible at viewport widths ≥ 75rem, e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`), two visually identical-looking lists appear stacked:

1. **Active Records** — a metrics list pairing each of the eight record-group labels with a count (e.g., `Cast & Status 9`, `Scene & Affordances 5`, `Knowledge & Truth 25`, ...).
2. **Groups** — a TOC of jump-to-anchor links to those same eight groups within the Current State tab.

The two lists are functionally distinct (metrics vs navigation) but the styling makes them look like duplicates: both show the same eight group labels stacked vertically, the "Groups" links have no link affordance (no underline, no color differentiation; they render as bold dark text styled identically to surrounding metric labels per `app.css:588-601`), and the two `<section>`s sit immediately adjacent in the rail.

Verified source: `tools/story-explorer/web/src/components/xray/StickyRail.tsx:34-44` renders Active Records (`<ul class="xray-summary-list">` with strong counts), and `StickyRail.tsx:51-60` renders Groups (`<nav class="xray-summary-section"><ul class="xray-summary-toc">` with `<a href="#anchor">` jumps). The TOC `<a>` styling at `app.css:588-601` declares `color: var(--color-text-secondary); font-weight: 700; text-decoration: none;` — identical hue to surrounding ambient text, no underline. The links are present and functional, but invisible as links.

## Assumption Reassessment (2026-05-26)

1. `tools/story-explorer/web/src/components/xray/StickyRail.tsx:21-62` is the only render site of the summary rail. The two lists are intentional (separate `<section>` with `<h3>` headings) but visually indistinguishable. Verified by Read.
2. `tools/story-explorer/web/src/styles/app.css:588-601` defines `.xray-summary-toc a { ... color: var(--color-text-secondary); font-weight: 700; text-decoration: none; }`. The styling explicitly disables the link affordance (no underline) and matches the surrounding ambient secondary-text color. The user sees text that does not look interactive, which is why the list reads as redundant rather than navigational.
3. The fix is presentation-only: differentiate the Groups TOC's link affordance and clarify the heading. Two narrow surfaces — the heading text and the link CSS — capture the entirety of the bug.
4. The Active Records list at `StickyRail.tsx:34-44` is correct — counts are useful, and the visual treatment is appropriate for metrics. No change there.
5. The Groups list is genuinely useful: clicking a group anchor scrolls the Current State tab to that group's `<section id="<groupAnchor>">`. Verified by inspection of `groupActiveRecords.ts` (referenced by `StickyRail.tsx:2`). Keep the section; fix only the affordance.
6. No FOUNDATIONS principle is engaged. The story-explorer is a read-only human surface over `_source/`; summary-rail presentation is UI typography, not canon storage or validation.

## Architecture Check

1. The minimal fix has two parts: (a) rename the heading `Groups` → `Jump to group` (or similar phrasing that signals navigation), and (b) restore the link affordance (`text-decoration: underline` and a link color, or a hover-color change) so the user reads each row as an interactive anchor.
2. The alternative — combining Active Records and Groups into a single list where each row shows `<a href="#anchor"><label> <count></a>` — is more compact but a larger refactor and changes the metrics list's accessibility role from `<ul>` to `<nav>`. The simpler fix is to differentiate the two visually.
3. No backwards-compatibility shim.

## Verification Layers

1. Manual visual check: on `/worlds/erotica-world/stories/red-bunny/pages/PG-5`, the rail's second list is clearly identifiable as navigation — heading reads "Jump to group" (or equivalent), and the rows render with link affordance (underline AND/OR distinct color from the ambient secondary text).
2. Puppeteer assertion: `getComputedStyle(document.querySelector('.xray-summary-toc a')).textDecorationLine` includes `underline` OR its `color` resolves to a value distinct from `var(--color-text-secondary)`.
3. Existing tests for `StickyRail.tsx` continue to pass (no DOM structure change; only the heading text and CSS rules change).
4. `npm test` passes from `tools/story-explorer/web`.
5. `npm run build` passes from `tools/story-explorer/web` (package-local typecheck lane — no separate `typecheck` script exists in the `web` package).

## What to Change

### 1. Rename the Groups heading in `tools/story-explorer/web/src/components/xray/StickyRail.tsx`

At `StickyRail.tsx:51-52`, change:

```tsx
<nav className="xray-summary-section" aria-labelledby="xray-rail-toc-title">
  <h3 id="xray-rail-toc-title">Groups</h3>
```

to:

```tsx
<nav className="xray-summary-section" aria-labelledby="xray-rail-toc-title">
  <h3 id="xray-rail-toc-title">Jump to group</h3>
```

The exact wording is up to taste — alternatives include "Scroll to group", "Section nav", or keep "Groups" but add a small caret/arrow glyph next to each link. The change above is the simplest text-only path.

### 2. Restore link affordance on the Groups TOC in `tools/story-explorer/web/src/styles/app.css`

At `app.css:588-601`, the existing `.xray-summary-toc a` rule sets `color: var(--color-text-secondary); font-weight: 700; text-decoration: none;`. Modify to:

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

Two changes from the original: `color: var(--color-text-secondary)` becomes `color: var(--color-accent)` (so links read as accent-colored interactive elements consistent with body links via `app.css:32-37`), and `text-decoration: none` becomes `text-decoration: underline` with a small `text-underline-offset` for readability. The existing `:hover` rule is updated to shift color to the stronger accent on hover.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/StickyRail.tsx` (modify)
- `tools/story-explorer/web/src/styles/app.css` (modify)

## Out of Scope

- Refactoring the summary rail to merge Active Records and Groups into a single list with both counts and anchors. That is a structural change with accessibility implications (a `<nav>` whose items contain metric data); the present visual differentiation is sufficient.
- Adding scroll-spy behavior (highlighting the active group as the user scrolls). Out of scope for a presentation fix.
- Changing the mobile summary bar (`MobileSummaryBar.tsx`) — the redundancy is not present there (the mobile bar has a single `<select>` for jump, not two parallel lists).

## Acceptance Criteria

### Tests That Must Pass

1. On `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-5` at a viewport width ≥ 1200px (so the summary rail is visible), the second list in the rail is visually identifiable as navigation: underlined accent-colored links, distinct from the Active Records list above.
2. Puppeteer assertion: `getComputedStyle(document.querySelector('.xray-summary-toc a')).textDecorationLine.includes('underline') === true`.
3. Puppeteer assertion: the resolved `color` of `.xray-summary-toc a` is not equal to the resolved `color` of `.xray-summary-list li span` (a member of the Active Records list).
4. The Groups list heading text is "Jump to group" (or whatever final wording is chosen) — confirm in DOM.
5. `npm test` passes from `tools/story-explorer/web`.
6. `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. The summary rail's two lists (Active Records, Groups TOC) remain visually distinguishable at all supported viewport widths ≥ 75rem.
2. Each Groups TOC entry is rendered as a perceptibly-interactive link (underline AND/OR distinct color).
3. The Active Records metrics list remains unchanged in role and visual treatment.

## Test Plan

### New/Modified Tests

1. If `tools/story-explorer/web/src/components/xray/__tests__/StickyRail.test.tsx` (or equivalent) asserts the rendered heading text, update to the new wording.
2. None strictly required for the CSS change; a guard puppeteer-style assertion (textDecoration, color distinction) is sufficient.

### Commands

1. `npm test` from `tools/story-explorer/web`
2. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
3. Manual visual check: `npm run dev` from `tools/story-explorer/web`, open any page-detail route at a wide viewport, confirm the second list reads as navigation and the rows behave as scroll anchors on click.
