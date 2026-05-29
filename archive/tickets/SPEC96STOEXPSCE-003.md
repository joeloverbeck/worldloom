# SPEC96STOEXPSCE-003: Timeline route — causal branch backbone

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /api/worlds/:slug/stories/:storySlug/timeline` route + `read/timeline.ts` + `BranchTimeline` / `TimelineSegment` view-models + registration in `http.ts`. Read-only.
**Deps**: archive/tickets/SPEC96STOEXPSCE-001.md

## Problem

SPEC-96 §2.2 (D2): the timeline is the new backbone the frontend loads before scene detail — an ordered sequence of segments along a branch path (`scene_segment` | `unscened_run` | `choice_surface` | `branch_split` | `terminal_marker`), with PG focus expressed as query state (`?focus=PG-N|SCN-N`), never as a `/pages/:pageId` reader route. At intake the backend had no timeline; PGs were exposed as reader pages. This route is the orientation backbone that the scene-first model hangs off (spec §3 "Timeline is the backbone, not a page list").

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

## Landed Changes

### 1. Timeline read module

Created `tools/story-explorer/src/read/timeline.ts`: walks a branch path (preferring `PG.branch_path`, falling back to parent-chain traversal) and emits ordered `TimelineSegment`s — `scene_segment` for active-SCN-covered PG runs, `unscened_run` for contiguous uncovered committed PGs, `choice_surface` for end-of-segment emitted choices, `branch_split` at fork PGs, `terminal_marker` at branch leaves. Coverage comes from 001's helper; optional `focus=PG-N|SCN-N` annotates the matching segment. When the index is missing/stale, the route reports `degradedDirectRead: true` and does not fabricate scene or unscened coverage.

### 2. `BranchTimeline` + `TimelineSegment` view-models

Created `tools/story-explorer/src/view-models/branch-timeline.ts`: `TimelineSegment` is a tagged union over the five `kind`s, each carrying its payload — scene id + `ScenePublicationState`, unscened run bounds, `ChoiceSurface`, split children, or terminal reason — and `BranchTimeline` carries branch id, ordered segments, focus annotation, index status, and degraded-read posture.

### 3. Route + registration

Created `tools/story-explorer/src/server/routes/timeline.ts` exporting `registerTimelineRoutes(server, options)` for `GET /api/worlds/:slug/stories/:storySlug/timeline?branchId=BR-N&focus=PG-N|SCN-N`; wired it into `http.ts` behind the read-only guard + envelope.

## Files to Touch

- `tools/story-explorer/src/read/timeline.ts` (new)
- `tools/story-explorer/src/view-models/branch-timeline.ts` (new)
- `tools/story-explorer/src/server/routes/timeline.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the timeline route)
- `tools/story-explorer/test/timeline-route.test.ts` (new)

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

## Outcome

Completed: 2026-05-29

What changed:
- Added the timeline read module, view-model, and route registration for `GET /api/worlds/:slug/stories/:storySlug/timeline`.
- The timeline emits only the five SPEC-96 segment kinds, annotates `focus=PG-N|SCN-N` on the matching segment, builds `ChoiceSurface` from CHC records, and detects branch splits / terminal markers from committed PG structure.
- Added `tools/story-explorer/test/timeline-route.test.ts` covering ordered scene/choice/split/unscened/terminal segments, PG focus annotation, CHC surface projection, and degraded-index honesty.

Deviations from original plan:
- The implementation includes `indexStatus` and `degradedDirectRead` directly on `BranchTimeline`, matching the existing story-explorer envelope/degraded posture used by overview.
- When the index is unavailable, the route still reports PG structural segments such as `choice_surface` and `terminal_marker`, but intentionally emits no `scene_segment` or `unscened_run` because those are coverage-derived.

Verification results:
- Pre-edit baseline: `cd tools/story-explorer && npm run test:backend` — PASS, 17/17 backend test files.
- Final proof: `cd tools/story-explorer && npm run test:backend` — PASS, 18/18 backend test files, including `dist/test/timeline-route.test.js`.
- `grep -n "registerTimelineRoutes" tools/story-explorer/src/server/http.ts` — PASS; import and registration are present.
