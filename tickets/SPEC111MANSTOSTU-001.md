# SPEC111MANSTOSTU-001: Sibling-page nav strip with shared route-match helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web frontend (new `StoryPageNav` component + `useStoryRouteMatch` hook; `HealthBanner` refactor; `App.tsx` mount). No backend, no canon-pipeline impact.
**Deps**: None

## Problem

Per SPEC-111 §1: the manual-studio frontend has a single top-level nav link (`App.tsx:38–40` renders only `<nav><Link to="/">Worlds</Link></nav>`), and per-story pages have no consistent navigation — the author back-buttons or types URLs. MSSUX-006 added an uneven Dashboard-local nav (one page only). This ticket adds an App-level sibling-page nav strip mounted just below the existing SPEC-105 `HealthBanner`, conditional on the per-story URL, covering every per-story page, and reuses HealthBanner's existing route-matcher rather than authoring a parallel one.

## Assumption Reassessment (2026-06-02)

1. Codebase: `tools/manual-story-studio/web/src/components/HealthBanner.tsx:18–34` contains `parseStoryPath(pathname)` (+ `decodeSegment`) doing the per-story URL match (`worlds/:worldSlug/manual-stories/:msSlug`, excludes `new`); `App.tsx:38–40` renders the single `<nav><Link to="/">Worlds</Link></nav>`; `<HealthBanner />` is mounted at `App.tsx:41`; the 12 per-story `<Route>` paths are enumerated at `App.tsx:44–100`. `react-router-dom` is `^6.27.0` (installed 6.30.4) — `useLocation` available.
2. Specs/docs: SPEC-111 §2 item 2 + §3 first key decision + §8 assumption 2. The `/contract` route (`App.tsx:86`, `EditContract`) is included in the tab list per reassessment finding M1.
3. Cross-artifact boundary under audit: the per-story URL route-match is a shared boundary between `HealthBanner` (existing consumer) and the new `StoryPageNav`. Extracting `parseStoryPath` into a single `useStoryRouteMatch` hook makes it one source both consume; this realizes SPEC-111 §3's "reuse the route-parsing discipline landed by SPEC-105" concretely instead of authoring a second matcher.
4. FOUNDATIONS §Soft Canon / Local Truth: the health banner makes local-truth integrity visible across every per-story page (SPEC-111 §2 item 1). Mounting `StoryPageNav` below the banner — not remounting it — preserves the single source of health rendering.
5. (was template item 7 — rename/relocate blast radius): extracting `parseStoryPath` from `HealthBanner.tsx` relocates an internal symbol. Blast radius: `HealthBanner` (sole current consumer — refactored to import the helper) and the new `StoryPageNav` (new consumer); the `App.tsx` single-`<nav>` block is removed (world-level "Worlds" navigation moves into the strip). Grep-confirmed no other consumer of the inline `parseStoryPath`.

## Architecture Check

1. An App-level conditional mount is one integration point; per-page nav is N integration points (the MSSUX-006 unevenness). Extracting the route-matcher into one hook prevents two divergent matchers drifting apart.
2. No backwards-compatibility shims: the old `App.tsx` single-nav and the inline `HealthBanner` `parseStoryPath` are removed, not aliased.

## Verification Layers

1. `StoryPageNav` renders only on per-story URLs → codebase grep-proof (`useStoryRouteMatch` gate) + manual scenario 2.
2. `HealthBanner` behavior unchanged after refactor → grep-proof (HealthBanner imports `useStoryRouteMatch`; render condition `!report || status === "ok"` preserved) + `tsc --noEmit`.
3. Tab list covers every per-story route → manual review against the `App.tsx` `<Route>` enumeration (Dashboard, Current State, Cast, Records, Beat Templates, Moment Composer, Prompt Preview, Prompt History, Paste Prose, Manuscript, Edit Contract, Repair).

## What to Change

### 1. Create the shared route-match hook

Create `tools/manual-story-studio/web/src/hooks/useStoryRouteMatch.ts`: move `parseStoryPath` + `decodeSegment` out of `HealthBanner.tsx`; export a hook that reads `useLocation()` and returns `{ worldSlug, msSlug }` on a per-story path or `{}` off-pattern.

### 2. Refactor HealthBanner to consume the hook

`HealthBanner.tsx`: remove the inline `parseStoryPath`/`decodeSegment`; call `useStoryRouteMatch()`. Preserve the render condition exactly (`if (!report || report.status === "ok") return null`).

### 3. Create StoryPageNav

Create `tools/manual-story-studio/web/src/components/StoryPageNav.tsx`: a horizontal nav strip of links for the 12 per-story pages with active-page highlighting; renders only when `useStoryRouteMatch()` resolves a per-story match. Consistent ordering everywhere.

### 4. Mount in App.tsx

`App.tsx`: remove the single `<nav><Link to="/">Worlds</Link></nav>`; mount `<StoryPageNav />` just below `<HealthBanner />`. Keep world-level "Worlds" navigation reachable (strip's leading item / banner).

### 5. Styles

`index.css`: nav-strip layout + active-tab treatment.

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

1. `None — web test step is tsc --noEmit only (SPEC-111 §2 item 7); verification is tsc + grep-proof + manual scenarios. No browser harness — deferred per §Out of scope.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -n "useStoryRouteMatch" tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/components/StoryPageNav.tsx`
3. `grep -n "StoryPageNav" tools/manual-story-studio/web/src/App.tsx` — narrower than a full-pipeline command because the change is frontend-only and the package's sole programmatic gate is `tsc`.
