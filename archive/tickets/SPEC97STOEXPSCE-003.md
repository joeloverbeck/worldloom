# SPEC97STOEXPSCE-003: Story dashboard route + overview + coverage panel

**Status**: DONE
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/web` new route `/worlds/:slug/stories/:storySlug` (story dashboard) + `StoryDashboard`/`BranchSelector`/coverage-panel components; one route-array entry added to `app.tsx`.
**Deps**: 001

## Problem

SPEC-97 §2.2 makes the story dashboard (`/worlds/:slug/stories/:storySlug`) the landing surface for a story bundle, and §2.7 puts a coverage panel on it. The dashboard shows per-branch summaries (root PG, latest committed PG, latest scene + its publication state), scene-coverage and unscened-run counts, and validation/index status — backed by SPEC-96's `/overview`. The coverage panel lists unscened committed PG runs plus scenes keyed to the `ScenePublicationState` label set. There is currently no such route (the current landing is the page-first `/entry`).

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/web/src/app.tsx` is the route tree; current entries (reassessment grep) are `/`, `/worlds/:slug/stories`, `/worlds/:slug/stories/:storySlug/entry`, `/worlds/:slug/stories/:storySlug/pages/:pageId`. There is NO `/worlds/:slug/stories/:storySlug` (bare dashboard) route — `routes/story-dashboard.tsx` is absent (verified `test -e` → absent). `routes/worlds.tsx` (`WorldsRoute`) and `routes/stories.tsx` (`StoriesRoute`) are retained navigation-shell routes (not page-reader concepts). Route loader + `ErrorBoundary` scaffolding is reusable.
2. SPEC-97 §2.2 (dashboard route) + §2.7 (coverage panel) + the consumed `getStoryOverview`/`StoryOverview`/`BranchSummary` from SPEC97STOEXPSCE-001. SPEC-97 §2.7: coverage categories key to SPEC-96's `ScenePublicationState` label set (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`) plus unscened committed PG runs; "stale receipt/prose" is intentionally dropped (SPEC-96 pruned hash-freshness); NO automatic scene-boundary recommender (optional contiguous-PG grouping helper only).
3. Cross-artifact boundary under audit: the `StoryOverview` + `BranchSummary` payload (SPEC-96 `/overview`, typed in 001). The dashboard reads per-branch summaries and coverage/unscened counts from this payload; the index-status envelope drives the degraded/stale banner.
4. FOUNDATIONS §SCN render layer: publication state is derived at read time from artifact presence + receipt verdict, never stored on the append-only `SCN`. The coverage panel surfaces SPEC-96's presence-based `ScenePublicationState` indicator and MUST NOT recompute or invent freshness — under a stale/degraded index it degrades orientation (shows the index-status banner), never fabricates coverage.

## Architecture Check

1. The dashboard composes existing scaffolding (route loader + `ErrorBoundary` + envelope client) around the new `getStoryOverview` data, reusing the established loader pattern. The coverage panel is a presentation of SPEC-96's derived indicator — no client-side coverage computation, keeping the frontend a pure consumer of the derived view.
2. No backwards-compatibility shims — the dashboard is a new route; it does not wrap or alias the old `/entry` landing (whose removal is 008's).

## Verification Layers

1. Dashboard renders per-branch summaries + coverage/unscened counts from `StoryOverview` → component test against a `StoryOverview` fixture.
2. Coverage panel categories map exactly to `ScenePublicationState` labels with no recommender → component test asserting the rendered category set + absence of any boundary-suggestion control.
3. Stale/degraded index degrades orientation, never fabricates coverage → component test rendering with a degraded-index envelope, asserting the status banner shows and coverage is not invented.
4. Route resolves at `/worlds/:slug/stories/:storySlug` → route test (app.tsx wiring).

## What to Change

### 1. Add the dashboard route

New `routes/story-dashboard.tsx` with a loader calling `getStoryOverview(slug, storySlug)`; render `StoryDashboard`. Add one route-array entry `/worlds/:slug/stories/:storySlug` to `app.tsx` (the route tree is otherwise untouched by this ticket — page-route removal is 008's; old and new routes coexist transiently).

### 2. Dashboard + branch-selector components

`StoryDashboard` (story metadata header + per-`BranchSummary` cards + counts + index-status banner), `BranchSelector` (switch the active branch).

### 3. Coverage panel

A dashboard section listing unscened committed PG runs + scenes grouped by `ScenePublicationState` label (`planned` / `prose-present` / `attached:PASS|WARN|FAIL` / `superseded`). Optional contiguous-PG grouping helper only; NO automatic boundary recommender. Plus a11y tests for the new components.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — add the dashboard route entry; pre-existing shared file, coordinate route-array placement with 004/005/006/007/008)
- `tools/story-explorer/web/src/routes/story-dashboard.tsx` (new)
- `tools/story-explorer/web/src/routes/story-dashboard.test.tsx` (new)
- `tools/story-explorer/web/src/routes/story-dashboard.a11y.test.tsx` (new)
- `tools/story-explorer/web/src/components/StoryDashboard.tsx` (new)
- `tools/story-explorer/web/src/components/BranchSelector.tsx` (new)
- `tools/story-explorer/web/src/components/CoveragePanel.tsx` (new)
- component `*.test.tsx` + `*.a11y.test.tsx` for the three new components (new)

## Out of Scope

- Timeline / scenes / scene-detail / unscened routes — owned by 004/005/006/007.
- Removing the old `/entry` landing route — owned by 008.
- Branch-map / search surfaces — deferred to SPEC-98.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — dashboard route + component + coverage-panel + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — typechecks against the `StoryOverview`/`BranchSummary` types from 001.
3. Coverage-panel test asserts no automatic scene-boundary recommender control is rendered.

### Invariants

1. Coverage state is read from SPEC-96's presence-based `ScenePublicationState` indicator; the frontend never recomputes or invents publication freshness — §SCN render-layer derived-state discipline.
2. Under a degraded/stale index the dashboard degrades orientation (status banner) and never fabricates coverage counts.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/story-dashboard.test.tsx` + `.a11y.test.tsx` — route loader + render.
2. `tools/story-explorer/web/src/components/{StoryDashboard,BranchSelector,CoveragePanel}.test.tsx` + `.a11y.test.tsx` — component behavior incl. degraded-index path + no-recommender assertion.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
