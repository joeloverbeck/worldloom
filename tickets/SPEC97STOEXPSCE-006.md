# SPEC97STOEXPSCE-006: Scene detail workbench route + panels

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/web` new route `/worlds/:slug/stories/:storySlug/scenes/:sceneId` (scene-detail author workbench) + `SceneDetailShell`/`SceneProsePanel`/`ScenePlanPanel`/`SceneReceiptPanel`/`StateDeltaPanel`/`ActiveRecordsPanel`/`ValidationFreshnessPanel`; `ProsePanel` rebuilt as scene-scoped `SceneProsePanel`; one route-array entry added to `app.tsx`.
**Deps**: 001, 002

## Problem

SPEC-97 §2.5 makes scene detail an author workbench, not a reader page: prose-first left panel when prose exists (else plan or "prose not attached"), x-ray right panel (co-equal), and a bottom rail of PG ticks / event deltas / emitted choice surface / active records / validation+freshness. Publication/freshness chips read SPEC-96's presence-based `ScenePublicationState`. The page-level `ProsePanel` is rebuilt as the scene-scoped `SceneProsePanel`. There is no scene-detail route today.

## Assumption Reassessment (2026-05-29)

1. `routes/scene-detail.tsx` is absent (verified `test -e` → absent). The page-level `components/ProsePanel.tsx` exists and is page-scoped (consumes `getProseBody`/`PagePlanSummary`/`ProseStatus`) — it is rebuilt here as scene-scoped `SceneProsePanel` (new file); the page-level `ProsePanel` itself is DELETED in SPEC97STOEXPSCE-008, not here. `getSceneDetail`/`getSceneProse`/`getScenePlan`/`getSceneReceipt` + `SceneDetail`/`SceneArtifactSummary`/`ScenePublicationState`/`ChoiceSurface`/`EventDeltaSummary` are delivered by SPEC97STOEXPSCE-001; the rebound `XRayPanel` (right-panel x-ray) by SPEC97STOEXPSCE-002.
2. SPEC-97 §2.5 (workbench layout), §2.2 (`/scenes/:sceneId?focusPg=PG-12`), §3 (prose-first when prose exists but x-ray co-equal; author tool not reader product). SPEC-96 `/scenes/:sceneId` returns the SCN record + derived publication indicator + included-PG summaries + end `ChoiceSurface` + event-delta summaries + plan/prose/receipt availability; `/scenes/:id/plan|prose|receipt` serve the artifacts.
3. Cross-artifact boundary under audit: the `SceneDetail` + `SceneArtifactSummary` payload (SPEC-96 `/scenes/:id` + artifact sub-routes, typed in 001) and the rebound `XRayPanel` contract (002). The workbench reads SceneDetail for layout, fetches plan/prose/receipt on demand, and embeds the x-ray panel for the focused PG (`?focusPg=PG-N`).
4. FOUNDATIONS §Story Bundles §4 (Scene render layer; `SCN` is the render unit, rendered prose non-authoritative) + §4a (author-x-ray-first, prose never treated as state): scene detail surfaces prose as publication output with derived publication chips, with x-ray co-equal so state is always inspectable; prose is never edited and never treated as authoritative state. The "prose-first when prose exists, else plan, else 'prose not attached'" precedence enacts the presence-derived publication model without storing status.

## Architecture Check

1. The workbench composes the new scene panels (prose/plan/receipt) with the already-rebound `XRayPanel` (002) and the bottom-rail panels, giving authors prose AND state in one view without a reader-only framing. Rebuilding `ProsePanel` as scene-scoped `SceneProsePanel` (rather than parameterizing the page-level one) keeps the page-prose coupling out of the new surface — the page `ProsePanel` is deleted wholesale in 008.
2. No backwards-compatibility shims — `SceneProsePanel` is a fresh scene-scoped component; it does not wrap or alias the page-level `ProsePanel`.

## Verification Layers

1. Prose-first precedence (prose → plan → "prose not attached") → component tests against `SceneDetail` fixtures for each artifact-availability state.
2. X-ray panel is co-equal and renders the focused PG's `StateTickXray` → component test embedding the rebound `XRayPanel` with a `?focusPg` preset.
3. Bottom rail renders PG ticks / event deltas / choice surface / active records / validation+freshness → component tests per rail panel.
4. Publication/freshness chips read `ScenePublicationState` (presence-based) → component test asserting chip label per publication state.

## What to Change

### 1. Add the scene-detail route

New `routes/scene-detail.tsx` with a loader calling `getSceneDetail(slug, storySlug, sceneId)` (+ on-demand plan/prose/receipt fetches); render `SceneDetailShell`. Add one route-array entry `/worlds/:slug/stories/:storySlug/scenes/:sceneId` to `app.tsx`; honor `?focusPg=PG-N`.

### 2. Workbench shell + panels

`SceneDetailShell` (header: SCN id/branch/PG range/publication+freshness chips; prose-first left panel; x-ray right panel; bottom rail). Left-panel panels: `SceneProsePanel` (scene prose when present), `ScenePlanPanel` (plan fallback), `SceneReceiptPanel` (receipt). Bottom-rail panels: `StateDeltaPanel` (event deltas), `ActiveRecordsPanel` (active records by class), `ValidationFreshnessPanel` (validation traces + publication freshness). PG-tick rail entries open the x-ray drawer / set `?focusPg`.

### 3. Rebuild ProsePanel as SceneProsePanel

`SceneProsePanel` renders scene prose from `getSceneProse`, with the "prose not attached" empty state — scene-scoped, no page-prose coupling. Plus a11y tests for all new components.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — add the scene-detail route entry; pre-existing shared file, coordinate route-array placement with 003/004/005/007/008)
- `tools/story-explorer/web/src/routes/scene-detail.tsx` (new)
- `tools/story-explorer/web/src/routes/scene-detail.test.tsx` (new)
- `tools/story-explorer/web/src/routes/scene-detail.a11y.test.tsx` (new)
- `tools/story-explorer/web/src/components/SceneDetailShell.tsx` (new)
- `tools/story-explorer/web/src/components/SceneProsePanel.tsx` (new)
- `tools/story-explorer/web/src/components/ScenePlanPanel.tsx` (new)
- `tools/story-explorer/web/src/components/SceneReceiptPanel.tsx` (new)
- `tools/story-explorer/web/src/components/StateDeltaPanel.tsx` (new)
- `tools/story-explorer/web/src/components/ActiveRecordsPanel.tsx` (new)
- `tools/story-explorer/web/src/components/ValidationFreshnessPanel.tsx` (new)
- component `*.test.tsx` + `*.a11y.test.tsx` for the seven new components (new)

## Out of Scope

- Deleting the page-level `components/ProsePanel.tsx` — owned by SPEC97STOEXPSCE-008 (this ticket creates the scene-scoped replacement; it does not delete the old one).
- The `XRayPanel` rebind itself — delivered by SPEC97STOEXPSCE-002 (this ticket embeds the rebound panel).
- Scenes list route — owned by SPEC97STOEXPSCE-005.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — scene-detail route + all panel + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — typechecks against `SceneDetail`/`SceneArtifactSummary`/`StateTickXray` from 001/002.
3. Component test: prose-first precedence renders prose when present, plan when prose absent, "prose not attached" when neither.

### Invariants

1. Scene prose is surfaced as publication output with derived publication chips; it is never edited and never treated as authoritative state — §Story Bundles §4/§4a.
2. X-ray is co-equally accessible in scene detail (author tool, not reader-safe) — author-x-ray-first.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/scene-detail.test.tsx` + `.a11y.test.tsx` — loader + workbench render + `?focusPg`.
2. `tools/story-explorer/web/src/components/{SceneDetailShell,SceneProsePanel,ScenePlanPanel,SceneReceiptPanel,StateDeltaPanel,ActiveRecordsPanel,ValidationFreshnessPanel}.test.tsx` + `.a11y.test.tsx`.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
