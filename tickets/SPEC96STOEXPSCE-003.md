# SPEC96STOEXPSCE-003: Timeline route — causal branch backbone

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /api/worlds/:slug/stories/:storySlug/timeline` route + `read/timeline.ts` + `BranchTimeline` / `TimelineSegment` view-models + registration in `http.ts`. Read-only.
**Deps**: 001

## Problem

SPEC-96 §2.2 (D2): the timeline is the new backbone the frontend loads before scene detail — an ordered sequence of segments along a branch path (`scene_segment` | `unscened_run` | `choice_surface` | `branch_split` | `terminal_marker`), with PG focus expressed as query state (`?focus=PG-N|SCN-N`), never as a `/pages/:pageId` reader route. Today the backend has no timeline; PGs are exposed as reader pages. This route is the orientation backbone that the scene-first model hangs off (spec §3 "Timeline is the backbone, not a page list").

## Assumption Reassessment (2026-05-29)

1. 001's `read/scene-coverage.ts` supplies per-branch `active_scene_ids` + `unscened_runs` + `pg_scene_lookup`, the structural basis for segmenting a branch path into `scene_segment` / `unscened_run` runs; `ChoiceSurface` (from 001) types the `choice_surface` segment. Branch-path traversal uses the committed `PG` chain (the `PG.branch_path` array encodes ancestry per the story state contract — no name-walking primitive needed). Verified against `tools/world-index/src/index/scene-coverage.ts` + the PG schema during reassessment.
2. SPEC-96 §2.2 fixes the five segment kinds exactly: `scene_segment`, `unscened_run`, `choice_surface`, `branch_split`, `terminal_marker` — matching report §7. Use these literal kinds; do not invent additional segment types.
3. Cross-package boundary under audit: timeline's read module consumes world-index only via 001's helper; branch-split / terminal-marker detection reads the committed PG/CHC/BR structure through existing retrieval, not world-index parser internals. Reuse the existing response envelope.
4. FOUNDATIONS §Story Bundles §4a (PG = causal tick, not a reader page): the timeline exposes PGs as ticks inside segments addressable via `?focus=PG-N`, never as `/pages/:pageId` reader routes — this ticket must not introduce any page-reader route shape. PG inspection is the x-ray surface (006), reached from timeline focus.

## Architecture Check

1. Segmenting a branch path once in a dedicated read module — runs of scene-covered PGs become `scene_segment`s, contiguous uncovered committed PGs become `unscened_run`s, fork points become `branch_split`s, leaves become `terminal_marker`s — gives the frontend a single ordered structure to render, rather than making it re-derive segmentation from raw PG/SCN data. The route handler stays thin.
2. No backwards-compatibility shims: timeline is net-new and replaces the page-list mental model; it does not wrap or alias `/pages`.

## Verification Layers

1. Segment ordering + kinds correct → route dry-run: inject `GET …/timeline?branchId=BR-N` against a fixture with both scened and unscened committed PGs; assert the ordered segment list uses only the five kinds and respects branch-path order.
2. `focus` is query state, not a route → grep-proof: no `/pages/:pageId`-shaped route is introduced; focus is a query param on `/timeline`.
3. Branch-split / terminal-marker detection → route dry-run: a forked fixture yields a `branch_split` at the fork PG and `terminal_marker`s at branch leaves.
4. Envelope reuse (cross-package) → grep-proof: timeline imports world-index only via 001's helper and returns the existing envelope.

## What to Change

### 1. Timeline read module

Create `tools/story-explorer/src/read/timeline.ts`: walk a branch path (committed PG chain) and emit ordered `TimelineSegment`s — `scene_segment` for active-SCN-covered PG runs, `unscened_run` for contiguous uncovered committed PGs, `choice_surface` for end-of-segment emitted choices, `branch_split` at fork PGs, `terminal_marker` at branch leaves. Source coverage from 001's helper; accept optional `focus=PG-N|SCN-N` to annotate the focused segment.

### 2. `BranchTimeline` + `TimelineSegment` view-models

Create `tools/story-explorer/src/view-models/branch-timeline.ts`: `TimelineSegment` (a tagged union over the five `kind`s, each carrying its payload — scene id + `ScenePublicationState`, unscened run bounds, `ChoiceSurface`, split children, terminal reason) and `BranchTimeline` (branch id, ordered `segments: TimelineSegment[]`, focus annotation).

### 3. Route + registration

Create `tools/story-explorer/src/server/routes/timeline.ts` exporting `registerTimelineRoutes(server, options)` for `GET /api/worlds/:slug/stories/:storySlug/timeline?branchId=BR-N&focus=PG-N|SCN-N`; wire into `http.ts` behind the read-only guard + envelope.

## Files to Touch

- `tools/story-explorer/src/read/timeline.ts` (new)
- `tools/story-explorer/src/view-models/branch-timeline.ts` (new)
- `tools/story-explorer/src/server/routes/timeline.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the timeline route)

## Out of Scope

- Scene detail / artifact reads (004), unscened-range detail (005), x-ray (006).
- Any `/pages/:pageId`-shaped reader route (forbidden — focus is query state).
- Search / branch-map (SPEC-98).
- Recomputing coverage from artifacts.

## Acceptance Criteria

### Tests That Must Pass

1. `GET …/timeline?branchId=BR-N` returns an ordered segment list using only `scene_segment` | `unscened_run` | `choice_surface` | `branch_split` | `terminal_marker`, against a seeded fixture.
2. A forked fixture produces a `branch_split` segment at the fork and `terminal_marker` at leaves; `?focus=PG-N` annotates the containing segment without a page-reader route.
3. `cd tools/story-explorer && npm run test:backend` passes.

### Invariants

1. The timeline never exposes a PG as a reader page; PG focus is query state on `/timeline`.
2. Segment kinds are exactly the five SPEC-96 §2.2 values; coverage-derived segments come from SPEC-95's view via 001's helper.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/timeline-route.test.ts` — new; ordered-segment assertions on linear + forked fixtures, focus-annotation check, degraded-index path.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -n "registerTimelineRoutes" tools/story-explorer/src/server/http.ts`
