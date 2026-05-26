# STOEXPFIX-009: Style the RouteLoading indicator and the NotFoundPage back-link

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — CSS-only change to `tools/story-explorer/web/src/styles/app.css`
**Deps**: None

## Problem

Two error/loading surfaces of the explorer carry class names that have no CSS rules in `app.css`, so they render as unstyled plain text:

1. **`RouteLoading` component** (`tools/story-explorer/web/src/components/RouteLoading.tsx:18-27`) renders `<div class="route-loading" role="status"><span class="route-loading__mark">Loading</span>...</div>`. Neither `.route-loading` nor `.route-loading__mark` has any rule in `tools/story-explorer/web/src/styles/app.css` (verified by `grep -n "route-loading" tools/story-explorer/web/src/styles/app.css` returning empty). The user sees the literal word "Loading" as default body-styled text — no spinner, no animation, no centering, no card framing.
2. **`NotFoundPage` back-link** (`tools/story-explorer/web/src/components/NotFoundPage.tsx:24-26`) renders `<Link className="route-error__link" to={target}>{label}</Link>`. `.route-error__link` also has no CSS rule (verified by the same grep). The "Back to story root" / "Back to worlds" call-to-action renders as the body's default link styling — small accent-colored text without the button-shaped affordance that the surrounding error surface implies. Compare `BackendUnreachablePage.tsx:14-16` which uses `<button>` and benefits from the existing `.route-error button` styling at `app.css:1202-1217`.

The two surfaces are rarely-seen (loading state during data fetch, 404 on a missing page) but when they appear they look unfinished.

## Assumption Reassessment (2026-05-26)

1. `tools/story-explorer/web/src/components/RouteLoading.tsx:17-27` renders the loading indicator. The class names `route-loading` and `route-loading__mark` are present but unstyled. Verified by Read.
2. `tools/story-explorer/web/src/components/NotFoundPage.tsx:13-30` renders the 404 surface. The class name `route-error__link` is present but unstyled. The surrounding `.route-error` wrapper at `app.css:1281-1295` does have styling (padding, surface color, border, radius), so the page is framed correctly — only the back-link sits ungroomed inside the frame.
3. `tools/story-explorer/web/src/components/BackendUnreachablePage.tsx:14-16` uses `<button>` for its retry action, and `app.css:1202-1217` defines `.route-error button` as a fully-styled accent button. Reusing that styling for `.route-error__link` produces a consistent "call-to-action in error surface" treatment without inventing a new visual primitive.
4. For the loading indicator, the minimal acceptable presentation is: centered text, slightly muted color, optional animated dot pulse or rotating ring. A pure CSS `@keyframes pulse` animation on a small inline-block element keeps the surface lightweight and avoids adding a new dependency.
5. The fix is additive — two new CSS blocks for `.route-loading` (and `.route-loading__mark`) and one new block for `.route-error__link`. No selector restructuring.
6. No FOUNDATIONS principle is engaged. Error/loading surfaces are presentation, not canon storage or validation.

## Architecture Check

1. The fix is purely additive CSS; no component change, no test fixture change. The minimal cut.
2. The alternative — converting `<Link className="route-error__link">` in `NotFoundPage.tsx` to a `<Link>` that consumes the existing `.route-error button` styling — is a tempting refactor but mixes anchor and button semantics (a back-link is correctly a `<Link>`, not a button). Better to give `.route-error__link` its own styling that mirrors the button visual treatment.
3. For RouteLoading, the simplest visually-acceptable treatment is text with subtle pulse animation, NOT a rotating SVG ring (which would require adding markup to the component). Pure-CSS-only on existing markup.
4. No backwards-compatibility shim.

## Verification Layers

1. Manual visual check: navigate to a slow-loading route (or throttle the network in DevTools) and observe the loading indicator — it appears as a centered text element with a subtle motion cue (pulse), framed by appropriate spacing.
2. Manual visual check: navigate to `/worlds/erotica-world/stories/red-bunny/pages/PG-9999` (a non-existent page) and observe the 404 surface — the "Back to story root" link renders as a styled button-like CTA, visually consistent with the BackendUnreachablePage's Retry button.
3. Puppeteer assertion (when dev server is running): `getComputedStyle(document.querySelector('.route-loading')).display !== 'inline'` (asserts the loader has been given block-level layout treatment).
4. Puppeteer assertion: `getComputedStyle(document.querySelector('.route-error__link')).padding` is non-zero (asserts the link has button-like padding).
5. `npm test` passes from `tools/story-explorer/web` (existing accessibility tests for both components — `RouteLoading.a11y.test.tsx`, `NotFoundPage.a11y.test.tsx` — assert ARIA roles, not visual styling, so they continue to pass).
6. `npm run build` passes from `tools/story-explorer/web` (package-local typecheck lane — no separate `typecheck` script exists in the `web` package).

## What to Change

### 1. Add `.route-loading` and `.route-loading__mark` rules to `tools/story-explorer/web/src/styles/app.css`

Append the following block (suggested placement: near the other `.route-*` rules, e.g., after `.route-error` at `app.css:1281-1295`):

```css
.route-loading {
  display: grid;
  place-items: center;
  min-height: 8rem;
  padding: var(--space-6);
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.route-loading__mark {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  letter-spacing: 0.08em;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  animation: route-loading-pulse 1.4s ease-in-out infinite;
}

@keyframes route-loading-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .route-loading__mark {
    animation: none;
  }
}
```

The element gets centered placement, a card-like outline, monospace styling consistent with status text elsewhere (`.prose-panel__status` at `app.css:288-294` uses the same family), and a gentle opacity pulse that respects `prefers-reduced-motion`.

### 2. Add `.route-error__link` rule to `tools/story-explorer/web/src/styles/app.css`

Append the following block (suggested placement: alongside the existing `.route-error button` rule at `app.css:1202-1217`):

```css
.route-error__link {
  display: inline-flex;
  align-items: center;
  min-height: 2.75rem;
  padding: 0 var(--space-4);
  color: var(--color-surface-elevated);
  font-weight: 700;
  text-decoration: none;
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
}

.route-error__link:hover {
  color: var(--color-surface-elevated);
  background: var(--color-accent-strong);
  border-color: var(--color-accent-strong);
}
```

This mirrors the existing `.route-error button` and `.page-entry-jump button` treatments (`app.css:1202-1217`) — accent-filled rectangle with surface-elevated text, hover shifts to the stronger accent. The back-link now reads as a primary CTA consistent with the surrounding error frame.

## Files to Touch

- `tools/story-explorer/web/src/styles/app.css` (modify)

## Out of Scope

- Adding a rotating SVG spinner or a third-party loading library. The CSS-only pulse on text is sufficient and lighter.
- Restructuring `RouteLoading.tsx` to render different markup. The class names already exist; only their styling is missing.
- Restructuring `NotFoundPage.tsx` to use a `<button>` instead of `<Link>`. A back navigation correctly uses anchor semantics.
- Auditing other unstyled classnames across the codebase. STOEXPFIX-009 targets the two empirically-observed unstyled error/loading surfaces.

## Acceptance Criteria

### Tests That Must Pass

1. On a slow-loading route (or throttled DevTools), the loading indicator renders as a centered card-framed monospace text element with a subtle pulse animation. Under `prefers-reduced-motion: reduce`, the animation is suppressed.
2. On a 404 route (e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-9999`), the "Back to ..." link renders as an accent-filled button-shaped CTA matching the existing `.route-error button` styling.
3. Puppeteer assertion: `getComputedStyle(document.querySelector('.route-loading')).display === 'grid'` AND `placeItems === 'center'`.
4. Puppeteer assertion: `getComputedStyle(document.querySelector('.route-error__link')).background` resolves to the accent color (not transparent / default).
5. `npm test` passes from `tools/story-explorer/web` — existing a11y tests for both components continue to pass.
6. `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. The `.route-loading` indicator is centered and framed, with a motion cue that respects `prefers-reduced-motion`.
2. The `.route-error__link` renders with a button-like affordance consistent with `.route-error button`.
3. No accessibility regression — ARIA roles on both components remain unchanged (the CSS does not alter `aria-*` attributes or `role`s).

## Test Plan

### New/Modified Tests

1. None strictly required. The fix is two CSS blocks whose effect is observable by computed-style inspection; the existing a11y tests cover ARIA semantics which are unchanged.

### Commands

1. `npm test` from `tools/story-explorer/web`
2. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
3. Manual visual check: `npm run dev` from `tools/story-explorer/web`, throttle network in DevTools and navigate, observe the loader; separately navigate to a non-existent page ID, observe the 404 surface and its back-link.
