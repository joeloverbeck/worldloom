# SPEC111MANSTOSTU-001: Sibling-page nav strip with shared route-match helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web frontend (new `StoryPageNav` component + `useStoryRouteMatch` hook; `HealthBanner` refactor; `App.tsx` mount). No backend, no canon-pipeline impact.
**Deps**: None

## Problem

At intake, per SPEC-111 §1, the manual-studio frontend had a single top-level nav link (`App.tsx` rendered only a `Worlds` link), and per-story pages had no consistent App-level navigation — the author back-buttoned or typed URLs. MSSUX-006 had added an uneven Dashboard-local nav (one page only). This ticket added an App-level sibling-page nav strip mounted just below the existing SPEC-105 `HealthBanner`, conditional on the per-story URL, covering every per-story page, and reusing HealthBanner's existing route-matcher rather than authoring a parallel one.

## Assumption Reassessment (2026-06-02)

1. Codebase at intake: `tools/manual-story-studio/web/src/components/HealthBanner.tsx` contained inline `parseStoryPath(pathname)` (+ `decodeSegment`) doing the per-story URL match (`worlds/:worldSlug/manual-stories/:msSlug`, excludes `new`); `App.tsx` rendered a single `<nav><Link to="/">Worlds</Link></nav>`; `<HealthBanner />` was mounted before `<main>`; the 12 per-story `<Route>` paths were enumerated in `App.tsx`. `react-router-dom` is `^6.27.0` (installed 6.30.4) — `useLocation`, `Link`, and `NavLink` are available.
2. Specs/docs: SPEC-111 §2 item 2 + §3 first key decision + §8 assumption 2. The `/contract` route (`App.tsx:86`, `EditContract`) is included in the tab list per reassessment finding M1.
3. Cross-artifact boundary under audit: the per-story URL route-match is a shared boundary between `HealthBanner` (existing consumer) and the new `StoryPageNav`. Extracting `parseStoryPath` into a single `useStoryRouteMatch` hook makes it one source both consume; this realizes SPEC-111 §3's "reuse the route-parsing discipline landed by SPEC-105" concretely instead of authoring a second matcher.
4. FOUNDATIONS §Soft Canon / Local Truth: the health banner makes local-truth integrity visible across every per-story page (SPEC-111 §2 item 1). Mounting `StoryPageNav` below the banner — not remounting it — preserves the single source of health rendering.
5. (was template item 7 — rename/relocate blast radius): extracting `parseStoryPath` from `HealthBanner.tsx` relocated an internal symbol. Blast radius: `HealthBanner` (sole current consumer — refactored to import the helper) and the new `StoryPageNav` (new consumer); the `App.tsx` single-`<nav>` block was removed (world-level "Worlds" navigation moved into the strip). Grep-confirmed no other consumer of the inline `parseStoryPath`.

## Architecture Check

1. An App-level conditional mount is one integration point; per-page nav is N integration points (the MSSUX-006 unevenness). Extracting the route-matcher into one hook prevents two divergent matchers drifting apart.
2. No backwards-compatibility shims: the old `App.tsx` single-nav and the inline `HealthBanner` `parseStoryPath` are removed, not aliased.

## Verification Layers

1. `StoryPageNav` renders only on per-story URLs → codebase grep-proof (`useStoryRouteMatch` gate) + manual scenario 2.
2. `HealthBanner` behavior unchanged after refactor → grep-proof (HealthBanner imports `useStoryRouteMatch`; render condition `!report || status === "ok"` preserved) + `tsc --noEmit`.
3. Tab list covers every per-story route → manual review against the `App.tsx` `<Route>` enumeration (Dashboard, Current State, Cast, Records, Beat Templates, Moment Composer, Prompt Preview, Prompt History, Paste Prose, Manuscript, Edit Contract, Repair).

## Landed Changes

### 1. Shared route-match hook

Created `tools/manual-story-studio/web/src/hooks/useStoryRouteMatch.ts`: moved `parseStoryPath` + `decodeSegment` out of `HealthBanner.tsx`; exported a hook that reads `useLocation()` and returns `{ worldSlug, msSlug }` on a per-story path or `{}` off-pattern.

### 2. HealthBanner consumes the hook

`HealthBanner.tsx`: removed the inline `parseStoryPath`/`decodeSegment`; calls `useStoryRouteMatch()`. Preserved the render condition (`if (!report || report.status === "ok") return null`).

### 3. StoryPageNav

Created `tools/manual-story-studio/web/src/components/StoryPageNav.tsx`: a horizontal nav strip of links for the 12 per-story pages with active-page highlighting; renders only when `useStoryRouteMatch()` resolves a per-story match. Consistent ordering everywhere.

### 4. App mount

`App.tsx`: removed the single `<nav><Link to="/">Worlds</Link></nav>`; mounted `<StoryPageNav />` just below `<HealthBanner />`. World-level "Worlds" navigation remains reachable as the strip's leading item.

### 5. Styles

`index.css`: added nav-strip layout + active-tab treatment.

## Files to Touch

- `tools/manual-story-studio/web/src/hooks/useStoryRouteMatch.ts` (new)
- `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` (new)
- `tools/manual-story-studio/web/src/components/HealthBanner.tsx` (modify)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- Keyboard shortcuts / `/` quick-search (deferred to a follow-up spec).
- Full single-page cockpit layout (deferred).
- Dashboard-local nav removal (→ SPEC111MANSTOSTU-002).
- Per-page content changes; backend routes.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (`tsc --noEmit`) is green.
2. Grep: `<StoryPageNav />` mounted in `App.tsx` below `<HealthBanner />`; `HealthBanner` imports `useStoryRouteMatch`; the App single-`<nav>Worlds</nav>` block is removed.
3. Manual scenario 1 (banner persistence unaffected) + scenario 2 (sibling-page nav) per SPEC-111 §6.

### Invariants

1. `HealthBanner`'s show/hide condition is behavior-preserving after the refactor.
2. `StoryPageNav` and `HealthBanner` share exactly one route-matcher (`useStoryRouteMatch`); no second `parseStoryPath` copy remains.

## Test Plan

### New/Modified Tests

1. `None — web test step is tsc --noEmit only (SPEC-111 §2 item 7); verification is tsc + grep-proof + a local Vite/Playwright smoke. No committed browser harness — deferred per §Out of scope.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -n "useStoryRouteMatch" tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/components/StoryPageNav.tsx`
3. `grep -n "StoryPageNav" tools/manual-story-studio/web/src/App.tsx` — narrower than a full-pipeline command because the change is frontend-only and the package's sole programmatic gate is `tsc`.

## Outcome

Completed: 2026-06-02

The App now mounts `<HealthBanner />` followed by `<StoryPageNav />` on every route. `StoryPageNav` renders only when `useStoryRouteMatch()` resolves a per-story URL, includes a leading `Worlds` link, and links to all 12 per-story pages in the SPEC-111 order. `HealthBanner` now consumes the same route matcher instead of carrying an inline parser. The previous App-level single-link `<nav>` was removed; the Dashboard-local nav remains for SPEC111MANSTOSTU-002.

No backend, canon, HARD-GATE, or `_source/` surfaces changed.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — passed (`tsc -p tsconfig.json --noEmit`).
2. `rg -n "<StoryPageNav />|<HealthBanner />|<nav>|Link to=\"/\"" tools/manual-story-studio/web/src/App.tsx` — confirmed App-level order is `<HealthBanner />` then `<StoryPageNav />`, with the old single-link nav absent.
3. `rg -n "useStoryRouteMatch|parseStoryPath" tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/components/StoryPageNav.tsx tools/manual-story-studio/web/src/hooks/useStoryRouteMatch.ts` — confirmed `HealthBanner` and `StoryPageNav` share `useStoryRouteMatch`; `parseStoryPath` exists only in the shared hook.
4. Vite/Playwright smoke:
   - Root URL `/`: no `Story pages` navigation rendered.
   - Per-story URL `/worlds/demo/manual-stories/story-one/dashboard`: `Story pages` navigation rendered below the banner with all 12 tabs.
   - Clicking Records navigated to the Records page and marked the Records tab active.
   - Running Vite without the backend produced expected API 500/404 console noise; this did not affect the route/nav smoke.

## Deviations

1. Manual browser verification was performed as a local Vite/Playwright smoke rather than a committed browser test harness. This matches SPEC-111's current test boundary: the web package's committed gate is `tsc --noEmit`, with browser-like acceptance harness work deferred.
