# STOEXPFIX-009: Style the RouteLoading indicator and the NotFoundPage back-link

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None — CSS-only change to `tools/story-explorer/web/src/styles/app.css`
**Deps**: None

## Problem

At intake, two error/loading surfaces of the explorer carried class names that had no CSS rules in `app.css`, so they rendered as unstyled plain text:

1. **`RouteLoading` component** (`tools/story-explorer/web/src/components/RouteLoading.tsx`) renders `<div class="route-loading" role="status"><span class="route-loading__mark">Loading</span>...</div>`. Before this ticket, neither `.route-loading` nor `.route-loading__mark` had rules in `tools/story-explorer/web/src/styles/app.css`. The user saw the literal word "Loading" as default body-styled text — no animation, centering, or card framing.
2. **`NotFoundPage` back-link** (`tools/story-explorer/web/src/components/NotFoundPage.tsx`) renders `<Link className="route-error__link" to={target}>{label}</Link>`. Before this ticket, `.route-error__link` had no CSS rule. The "Back to story root" / "Back to worlds" call-to-action rendered as the body's default link styling — small accent-colored text without the button-shaped affordance that the surrounding error surface implies. `BackendUnreachablePage.tsx` uses `<button>` and benefits from the existing `.route-error button` styling in `app.css`.

The two surfaces are rarely-seen (loading state during data fetch, 404 on a missing page) but when they appear they look unfinished.

## Assumption Reassessment (2026-05-27)

1. `tools/story-explorer/web/src/components/RouteLoading.tsx` renders the loading indicator. The class names `route-loading` and `route-loading__mark` were present but unstyled before this ticket.
2. `tools/story-explorer/web/src/components/NotFoundPage.tsx` renders the 404 surface. The class name `route-error__link` was present but unstyled before this ticket. The surrounding `.route-error` wrapper in `app.css` already had padding, surface color, border, and radius.
3. `tools/story-explorer/web/src/components/BackendUnreachablePage.tsx` uses `<button>` for its retry action, and `app.css` defines `.route-error button` as a fully-styled accent button. Sharing that selector treatment with `.route-error__link` keeps the 404 call-to-action visually consistent without changing anchor semantics.
4. `tools/story-explorer/web/package.json` confirms the package-local proof commands are `npm test` and `npm run build`. Pre-edit baseline `npm test` passed: 76 files / 185 tests.
5. `tools/story-explorer/web` has no package README in the live checkout, so there is no same-package public README surface to update.
6. The fix is additive CSS. No component markup, route behavior, ARIA attributes, package manifest, or test fixture changed.
7. No FOUNDATIONS principle is engaged. Error/loading surfaces are presentation, not canon storage or validation.

## Architecture Check

1. The fix is purely additive CSS; no component change, no test fixture change.
2. The back-link remains a `<Link>`, preserving anchor semantics while sharing the same visual treatment as `.route-error button`.
3. For RouteLoading, the landed treatment is text with a subtle pulse animation on existing markup. No SVG spinner or dependency was added.
4. No backwards-compatibility shim.

## Verification Layers

1. CSS grep/manual review: `app.css` now defines `.route-loading`, `.route-loading__mark`, `route-loading-pulse`, and `.route-error__link` selectors.
2. Browser computed-style check: Vite dev server plus Playwright confirmed `.route-loading` computes to `display: grid` and `place-items: center`, `.route-loading__mark` uses `route-loading-pulse`, and `.route-error__link` computes to `inline-flex` with nonzero padding and accent background.
3. `npm test` passes from `tools/story-explorer/web` (existing accessibility tests for both components continue to pass).
4. `npm run build` passes from `tools/story-explorer/web` (package-local typecheck/build lane).

## Landed Changes

### 1. Added `.route-loading` and `.route-loading__mark` rules to `tools/story-explorer/web/src/styles/app.css`

The loader now uses centered grid layout, muted monospace text, a bordered inline mark, and a reduced-motion-aware pulse animation.

### 2. Added `.route-error__link` styling through the existing route-error CTA selector group

The NotFound back-link now shares the accent-filled CTA styling of `.route-error button` while adding link-appropriate layout and `text-decoration: none`.

## Files to Touch

- `tools/story-explorer/web/src/styles/app.css` (modify)
- `archive/tickets/STOEXPFIX-009-style-route-loading-and-not-found-back-link.md` (modify closeout)

## Out of Scope

- Adding a rotating SVG spinner or a third-party loading library. The CSS-only pulse on text is sufficient and lighter.
- Restructuring `RouteLoading.tsx` to render different markup. The class names already exist; only their styling is missing.
- Restructuring `NotFoundPage.tsx` to use a `<button>` instead of `<Link>`. A back navigation correctly uses anchor semantics.
- Auditing other unstyled classnames across the codebase. STOEXPFIX-009 targets the two empirically-observed unstyled error/loading surfaces.

## Acceptance Criteria

### Tests That Must Pass

1. Browser computed-style assertion: `.route-loading` computes to `display: grid` and `place-items: center`.
2. Browser computed-style assertion: `.route-loading__mark` computes to use the `route-loading-pulse` animation.
3. Browser computed-style assertion: `.route-error__link` computes to `inline-flex`, nonzero horizontal padding, accent background, and no text decoration.
4. `npm test` passes from `tools/story-explorer/web` — existing a11y tests for both components continue to pass.
5. `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. The `.route-loading` indicator is centered and framed, with a motion cue that respects `prefers-reduced-motion`.
2. The `.route-error__link` renders with a button-like affordance consistent with `.route-error button`.
3. No accessibility regression — ARIA roles on both components remain unchanged (the CSS does not alter `aria-*` attributes or `role`s).

## Test Plan

### New/Modified Tests

1. None strictly required. The fix is CSS-only and its effect is observable by computed-style inspection; the existing a11y tests cover ARIA semantics which are unchanged.

### Commands

1. `npm test` from `tools/story-explorer/web`
2. `npm run build` from `tools/story-explorer/web` (package-local typecheck lane)
3. `npm run dev -- --host 127.0.0.1 --port 5174` from `tools/story-explorer/web`, then Playwright computed-style inspection against injected representative `.route-loading` and `.route-error__link` elements in the running app.

## Outcome

Implemented the CSS-only styling in `tools/story-explorer/web/src/styles/app.css`. The loading indicator is now centered and framed with a reduced-motion-aware pulse, and the 404 back-link now presents as an accent-filled CTA consistent with existing route-error buttons.

## Verification Result

1. Pre-edit baseline: `npm test` from `tools/story-explorer/web` passed — 76 test files / 185 tests. Output included existing React Router future-flag warnings and intentional ErrorBoundary test stderr.
2. `npm run build` from `tools/story-explorer/web` passed.
3. Post-edit `npm test` from `tools/story-explorer/web` passed — 76 test files / 185 tests. Output included existing React Router future-flag warnings and intentional ErrorBoundary test stderr.
4. Browser computed-style proof passed against `http://127.0.0.1:5174/`: `.route-loading` returned `display: grid`, `placeItems: center`; `.route-loading__mark` returned `animationName: route-loading-pulse`; `.route-error__link` returned `display: inline-flex`, `paddingLeft: 16px`, accent `backgroundColor`, and `textDecorationLine: none`.

## Deviations

1. The package has no `tools/story-explorer/web/README.md`, so no package README update was applicable.
2. The originally drafted manual visual route navigation was replaced with a browser computed-style probe against representative injected elements in the running Vite app. This directly proves the CSS selectors and computed properties without relying on backend data or route timing.
