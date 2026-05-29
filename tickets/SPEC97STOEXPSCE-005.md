# SPEC97STOEXPSCE-005: Scenes list route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/web` new route `/worlds/:slug/stories/:storySlug/scenes` (scene list + filters); one route-array entry added to `app.tsx`.
**Deps**: 001

## Problem

SPEC-97 §2.2 adds a `/worlds/:slug/stories/:storySlug/scenes` route — a filterable list of a story's scenes (by branch, has-prose, receipt-verdict, coverage), each row showing the scene's `ScenePublicationState`. It is the navigation entry point into the scene-detail workbench (SPEC97STOEXPSCE-006). No scenes list route exists today.

## Assumption Reassessment (2026-05-29)

1. `routes/scenes.tsx` is absent (verified `test -e` → absent). `app.tsx` has no scenes route (reassessment grep). `listScenes`/`SceneSummary`/`ScenePublicationState` are delivered by SPEC97STOEXPSCE-001. Route loader + `ErrorBoundary` scaffolding reusable.
2. SPEC-97 §2.2 (`/scenes` route). SPEC-96 `/scenes` supports filters `branchId`, `hasProse`, `receiptVerdict`, `coverage=active|superseded` and returns `SceneSummary[]`; each summary carries the derived `ScenePublicationState` indicator.
3. Cross-artifact boundary under audit: the `SceneSummary` payload (SPEC-96 `/scenes`, typed in 001). The list reads `SceneSummary[]` and renders each with its publication chip; filters map to the SPEC-96 query params. Scene rows link to `/scenes/:sceneId` (the detail route owned by SPEC97STOEXPSCE-006).

## Architecture Check

1. A thin list route over `listScenes` with filter controls mapping 1:1 to SPEC-96's documented query params — no client-side filtering logic that could diverge from the backend's filter semantics. Reuses the established loader + envelope pattern.
2. No backwards-compatibility shims — new route; no aliasing of the old page-list surface.

## Verification Layers

1. Scenes list renders `SceneSummary[]` with publication chips → component test against a `SceneSummary[]` fixture.
2. Filters map to SPEC-96 query params (branchId/hasProse/receiptVerdict/coverage) → loader test asserting the request query for each filter.
3. Route resolves at `/worlds/:slug/stories/:storySlug/scenes` → route test (app.tsx wiring).

## What to Change

### 1. Add the scenes list route

New `routes/scenes.tsx` with a loader calling `listScenes(slug, storySlug, filters)`; render the scene list with filter controls (branch, has-prose, receipt-verdict, coverage). Each row shows `SceneSummary` + its `ScenePublicationState` chip and links to `/scenes/:sceneId`. Add one route-array entry `/worlds/:slug/stories/:storySlug/scenes` to `app.tsx`. Plus a11y test.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — add the scenes route entry; pre-existing shared file, coordinate route-array placement with 003/004/006/007/008)
- `tools/story-explorer/web/src/routes/scenes.tsx` (new)
- `tools/story-explorer/web/src/routes/scenes.test.tsx` (new)
- `tools/story-explorer/web/src/routes/scenes.a11y.test.tsx` (new)

## Out of Scope

- The scene-detail route (`/scenes/:sceneId`) + workbench panels — owned by SPEC97STOEXPSCE-006.
- Branch-map / search — deferred to SPEC-98.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — scenes route + filter + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — typechecks against `SceneSummary`/`ScenePublicationState` from 001.
3. Loader test: each filter control produces the correct SPEC-96 query param.

### Invariants

1. Filters map directly to SPEC-96's `/scenes` query params; no divergent client-side filter logic.
2. Each scene row's publication state is SPEC-96's derived `ScenePublicationState`; the frontend does not recompute it.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/scenes.test.tsx` + `.a11y.test.tsx` — loader (filter→query), render, row links.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
