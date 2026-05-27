# STOEXPFIX-006: Collapse hidden X-Ray tab panels so they no longer reserve vertical space

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — CSS-only change to `tools/story-explorer/web/src/styles/app.css`
**Deps**: None

## Problem

At intake, on any page-detail route's State X-Ray panel (e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`), there was a large empty gap between the X-Ray tabs strip and the active tab's content panel. The gap was ~384 pixels — roughly three viewport rows of blank space — and appeared on every one of the four tabs (Current State / What Changed Here / Plan & Prose / Validation & Integrity).

Verified DOM cause before this ticket: the X-Ray tab UI renders four `<div class="xray-tab-panel" role="tabpanel">` siblings. The non-active panels carry the `hidden` HTML attribute. The `[hidden]` attribute's implicit `display: none` was silently overridden by the explicit `.xray-tab-panel { display: grid; min-height: 8rem; }` rule. Because explicit `display:` wins over the user-agent's `[hidden] { display: none }` default, every hidden panel still rendered at its `min-height: 8rem` (= 128 px), and the gap was `3 × 128 px = 384 px`.

Historical Puppeteer evaluation on the live dev server confirmed: `document.querySelectorAll('.xray-tab-panel')` returned four panels; three had `hasAttribute('hidden') === true`; each of those three reported `getBoundingClientRect().height === 128`.

## Assumption Reassessment (2026-05-26)

1. Before this ticket, `tools/story-explorer/web/src/styles/app.css` defined `.xray-tab-panel { display: grid; min-height: 8rem; gap: var(--space-3); }` with no `:not([hidden])` qualifier and no `[hidden]` override anywhere in `app.css` (verified by `grep -n "xray-tab-panel\[hidden\]" tools/story-explorer/web/src/styles/app.css` returning empty before the source edit).
2. The HTML `[hidden]` attribute corresponds to a user-agent style `[hidden] { display: none }` with **lower** specificity and origin priority than an author-declared `display: grid` on the same element. This is the well-known `[hidden]` override gotcha and is documented in MDN's `hidden` attribute reference. The fix is an author-declared `display: none` on the hidden element with at least matching specificity.
3. `min-height: 8rem` is meaningful for the ACTIVE tab panel — it prevents the surrounding card from collapsing while content loads (Plan & Prose can lazy-load). The intent is "active panel, give me 128px of fallback height," not "all panels reserve 128px each."
4. The fix is additive — a single new rule `.xray-tab-panel[hidden] { display: none; }` keeps the active panel's `min-height: 8rem` intact and only suppresses the hidden ones. No selector restructuring required.
5. No FOUNDATIONS principle is engaged. The story-explorer is a read-only human surface over `_source/`; X-Ray tab visibility is presentation, not canon storage or validation. The thirteen concerns and the seven validation rules are silent on UI layout.
6. The tab component renders all four panels at all times (rather than mounting only the active one); this is a common ARIA tabs pattern that keeps panel state during switching. Switching to a render-only-active approach would be a larger refactor; the CSS fix is the minimal correct intervention.
7. The drafted root `pnpm --filter @worldloom/story-explorer-web test` and `pnpm --filter @worldloom/story-explorer-web typecheck` commands do not match this checkout: there is no repo-root `package.json`, and `tools/story-explorer/web/package.json` exposes package-local `npm test` and `npm run build` scripts, with no separate `typecheck` script. Baseline before source edits: `npm test` passed 76 files / 184 tests; `npm run build` passed.

## Architecture Check

1. The fix is a single CSS rule additive on top of the existing `.xray-tab-panel` rule. No selector restructuring, no component change, no test fixture change. The minimal cut.
2. The alternative — restructuring the React component to mount only the active panel — is a larger refactor that would also lose the panel-state-preserved-during-switching benefit. Not worth the scope.
3. The alternative — removing `min-height: 8rem` from `.xray-tab-panel` entirely — would regress the lazy-loading skeleton experience for the Plan & Prose tab. Keep `min-height` on the visible panel.
4. No backwards-compatibility shim. The change is purely additive.

## Verification Layers

1. Playwright computed-style assertion against the built app served on the page-detail route: every `.xray-tab-panel[hidden]` returns `getBoundingClientRect().height === 0` and `getComputedStyle(el).display === 'none'`.
2. Playwright computed-style assertion: the active `.xray-tab-panel:not([hidden])` retains `display: grid` and nonzero height.
3. Browser tab-switch check on each of the four tabs — Current State / What Changed Here / Plan & Prose / Validation & Integrity — confirms exactly one panel is visible and all non-selected panels are collapsed.
4. `npm test` passes from `tools/story-explorer/web` (no test asserts on the empty-panel height; the existing X-Ray tab tests assert on tab activation, ARIA, and visible content, all unchanged).
5. `npm run build` passes from `tools/story-explorer/web`; this is the package-local typecheck plus Vite production build lane.

## Landed Changes

### 1. Added a single CSS rule in `tools/story-explorer/web/src/styles/app.css`

Inserted immediately after the existing `.xray-tab-panel` block:

```css
.xray-tab-panel[hidden] {
  display: none;
}
```

The new rule has higher specificity than the original `.xray-tab-panel` rule and applies cleanly to hidden panels only.

## Files to Touch

- `tools/story-explorer/web/src/styles/app.css` (modify)
- `archive/tickets/STOEXPFIX-006-collapse-hidden-xray-tab-panels.md` (modify closeout/proof truthing)

## Out of Scope

- Restructuring the X-Ray tab React component to render only the active panel. The CSS fix is sufficient and preserves the panel-state-preserved-during-switching benefit.
- Removing or changing `min-height: 8rem` on the active `.xray-tab-panel`. The minimum height is meaningful for lazy-loading skeleton.
- Any change to the four tab content components (`CurrentStateTab.tsx`, `WhatChangedHereTab.tsx`, `PlanProseTab.tsx`, `ValidationIntegrityTab.tsx`) — those render correctly when displayed.

## Acceptance Criteria

### Tests That Must Pass

1. On `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-5`, the Current State tab panel begins directly below the tabs strip with no empty gap.
2. The same is true on the What Changed Here, Plan & Prose, and Validation & Integrity tabs (each on click).
3. Playwright assertion: `Array.from(document.querySelectorAll('.xray-tab-panel[hidden]')).every(el => el.getBoundingClientRect().height === 0 && getComputedStyle(el).display === 'none')` is `true`.
4. Playwright assertion: the visible `.xray-tab-panel:not([hidden])` has `display: grid` and nonzero height.
5. `npm test` passes from `tools/story-explorer/web`.
6. `npm run build` passes from `tools/story-explorer/web`.

### Invariants

1. A hidden X-Ray tab panel never occupies vertical space in the document flow.
2. The active X-Ray tab panel retains a minimum height of 8rem (128px) so that lazy-loading skeleton states do not cause layout collapse.

## Test Plan

### New/Modified Tests

1. None. The fix is a single CSS rule whose effect was verified by browser computed-style inspection; the existing X-Ray tab tests cover ARIA selection and visible content.

### Commands

1. `npm test` from `tools/story-explorer/web`
2. `npm run build` from `tools/story-explorer/web`
3. Playwright browser check against `http://127.0.0.1:5174/worlds/erotica-world/stories/red-bunny/pages/PG-5` with the built app served by the Story Explorer backend.

## Outcome

Completion date: 2026-05-26.

Added `.xray-tab-panel[hidden] { display: none; }` in `tools/story-explorer/web/src/styles/app.css`. Hidden X-Ray panels no longer reserve their 8rem fallback height, while the active panel still renders as a grid and keeps a nonzero content height.

## Verification Result

1. `npm test` from `tools/story-explorer/web` passed after the CSS edit: 76 test files / 184 tests.
2. `npm run build` from `tools/story-explorer/web` passed after the CSS edit; the Vite bundle emitted `dist/assets/index-C09_npL4.css`, proving the built CSS artifact was refreshed.
3. Story Explorer backend served the built app on `http://127.0.0.1:5174`; Playwright opened `/worlds/erotica-world/stories/red-bunny/pages/PG-5` and measured the X-Ray panels.
4. Initial Current State tab measurement: the active current-state panel had `display: grid` and nonzero height; the three hidden panels had `display: none` and `height: 0`.
5. After clicking What Changed Here, Plan & Prose, and Validation & Integrity, the selected panel had `display: grid` and nonzero height each time; every non-selected `.xray-tab-panel[hidden]` had `display: none` and `height: 0`.
6. `git diff --check` passed for the tracked CSS edit and the untracked ticket file after temporarily adding the ticket with intent-to-add, then clearing the intent-to-add marker.

## Deviations

1. Drafted `pnpm --filter @worldloom/story-explorer-web test` / `typecheck` commands were replaced with the package-local `npm test` and `npm run build` commands because the checkout has no repo-root `package.json` and the web package has no separate `typecheck` script.
2. The browser check used the built app served by the Story Explorer backend on port 5174 rather than a separate Vite dev server. This proves the same route and the generated CSS artifact while avoiding an unnecessary second local server.
3. The first sandboxed Playwright CLI invocation failed while trying to reach npm (`EAI_AGAIN` for `registry.npmjs.org`); the browser proof was rerun with approved network/tool access and completed successfully.
