# SPEC97STOEXPSCE-004: Timeline route + segment components + PG-tick x-ray drawer wiring

**Status**: DONE
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/web` new route `/worlds/:slug/stories/:storySlug/timeline` + `TimelineSegmentList`/`SceneSegmentCard`/`UnscenedRunCard`/`ChoiceSurfacePanel` components; PG-tick→`StateTickDrawer` interaction; one route-array entry added to `app.tsx`.
**Deps**: 001, 002

## Problem

SPEC-97 §2.2 makes the branch-path timeline the backbone surface (`/worlds/:slug/stories/:storySlug/timeline?branch=BR-1&focus=PG-12`). It renders the ordered segments SPEC-96's `/timeline` returns (`scene_segment | unscened_run | choice_surface | branch_split | terminal_marker`) as a causal-tick timeline, and clicking a PG tick opens the `StateTickDrawer` (from SPEC97STOEXPSCE-002), deep-linkable via `?focus=PG-N`. There is no timeline route today.

## Assumption Reassessment (2026-05-29)

1. `routes/timeline.tsx` is absent (verified `test -e` → absent). `app.tsx` route tree (reassessment grep) has no timeline route. The `StateTickDrawer` (consumed for PG-tick clicks) is delivered by SPEC97STOEXPSCE-002; `getBranchTimeline`/`BranchTimeline`/`TimelineSegment`/`ChoiceSurface` by SPEC97STOEXPSCE-001. Route loader + `ErrorBoundary` scaffolding reusable.
2. SPEC-97 §2.2 (timeline route, PG focus is query state not a path segment), §2.5 (bottom-rail concept), §2.8 (PG-tick→drawer, deep-linkable via `timeline?focus=PG-12`), §3 (Query-state PG focus). SPEC-96 `/timeline?branchId=BR-N&focus=PG-N|SCN-N` returns ordered `TimelineSegment`s of kinds `scene_segment | unscened_run | choice_surface | branch_split | terminal_marker`.
3. Cross-artifact boundary under audit: the `BranchTimeline` + `TimelineSegment` payload (SPEC-96 `/timeline`, typed in 001) and the `StateTickXray` drawer contract (002). The timeline reads ordered segments from `BranchTimeline`; PG-tick clicks pass a `pgId` to `StateTickDrawer` (which fetches `getStateTickXray`).
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): PG is a causal tick, not a reader page. The timeline renders PGs AS ticks inside segments; clicking one opens an x-ray drawer (state inspection), never a page-reader view — the design directly enacts "PG = causal tick" and the §3 query-state-focus decision that PG deep links survive without a `/pages/:pageId` route.

## Architecture Check

1. The timeline is the single backbone the rest of the UI hangs off (scene detail + x-ray reached from it), composed from the existing loader pattern + the segment payload. PG focus as query state (`?focus=PG-N`) preserves deep linking without resurrecting a PG route segment — the cleanest way to keep convenient PG links while killing the PG-as-page model.
2. No backwards-compatibility shims — the timeline opens the x-ray drawer directly; no fallback to the old `/pages/:pageId` route is wired.

## Verification Layers

1. Timeline renders each `TimelineSegment` kind correctly → component tests against a `BranchTimeline` fixture covering all five segment kinds.
2. PG-tick click opens `StateTickDrawer` for that `pgId`, URL gains `?focus=PG-N` → interaction test asserting drawer open + query param.
3. Deep-link `?focus=PG-N` opens the drawer on load → route test with the focus query preset.
4. Branch switch re-queries `/timeline` for the new `branchId` → loader test.

## What to Change

### 1. Add the timeline route

New `routes/timeline.tsx` with a loader calling `getBranchTimeline(slug, storySlug, { branchId, focus })`; render `TimelineSegmentList`. Add one route-array entry `/worlds/:slug/stories/:storySlug/timeline` to `app.tsx`.

### 2. Segment components

`TimelineSegmentList` (ordered render dispatch by segment kind), `SceneSegmentCard` (scene_segment — SCN range + publication chip), `UnscenedRunCard` (unscened_run — PG range + count; **exported for reuse by SPEC97STOEXPSCE-007**), `ChoiceSurfacePanel` (choice_surface — emitted choices at the end PG). `branch_split` / `terminal_marker` render inline.

### 3. PG-tick → drawer wiring

Clicking a PG tick within a segment opens `StateTickDrawer` (from 002) for that `pgId` and sets `?focus=PG-N`; a preset `?focus` opens the drawer on load. Plus a11y tests for the new components.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — add the timeline route entry; pre-existing shared file, coordinate route-array placement with 003/005/006/007/008)
- `tools/story-explorer/web/src/routes/timeline.tsx` (new)
- `tools/story-explorer/web/src/routes/timeline.test.tsx` (new)
- `tools/story-explorer/web/src/routes/timeline.a11y.test.tsx` (new)
- `tools/story-explorer/web/src/components/TimelineSegmentList.tsx` (new)
- `tools/story-explorer/web/src/components/SceneSegmentCard.tsx` (new)
- `tools/story-explorer/web/src/components/UnscenedRunCard.tsx` (new — exported for 007)
- `tools/story-explorer/web/src/components/ChoiceSurfacePanel.tsx` (new)
- component `*.test.tsx` + `*.a11y.test.tsx` for the four new components (new)

## Out of Scope

- The `StateTickDrawer` component itself — delivered by SPEC97STOEXPSCE-002 (this ticket only wires the tick→drawer interaction).
- Scene detail route + workbench panels — owned by SPEC97STOEXPSCE-006.
- Unscened range route — owned by SPEC97STOEXPSCE-007 (reuses `UnscenedRunCard` from this ticket).
- Branch-map / search — deferred to SPEC-98.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — timeline route + segment-component + interaction + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — typechecks against `BranchTimeline`/`TimelineSegment`/`StateTickXray` from 001/002.
3. Interaction test: a PG-tick click opens the drawer and sets `?focus=PG-N`; a preset focus query opens the drawer on load.

### Invariants

1. PGs render as ticks inside timeline segments and resolve only to a state-tick x-ray drawer — never to a page-reader route (§Story Bundles §4a; §3 query-state focus).
2. The timeline consumes SPEC-96's ordered segment payload as-is; it does not recompute segment boundaries client-side.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/timeline.test.tsx` + `.a11y.test.tsx` — loader, render, focus deep-link.
2. `tools/story-explorer/web/src/components/{TimelineSegmentList,SceneSegmentCard,UnscenedRunCard,ChoiceSurfacePanel}.test.tsx` + `.a11y.test.tsx`.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
