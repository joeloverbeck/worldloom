# SPEC-97 — Story Explorer Frontend: Scene-First / Author-X-Ray UI

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (tooling that operates on story-handling logic — replaces the `tools/story-explorer/web` page-reader UI with a scene-first branch-path author dashboard + embedded PG x-ray; read-only consumer of SPEC-96's API).
**Depends on:** **SPEC-96** (consumes the new `/overview`, `/timeline`, `/scenes`, `/unscened-ranges`, `/state-ticks/:pgId/xray` API). Land SPEC-96 first.
**Related:** `SPEC-98` (search + branch-map UI, layered on the same shell); archived `SPEC-87/88/89` (current page-reader frontend). Frontend package `@worldloom/story-explorer-web` (React 18 + React Router 6 + Vite + Vitest).
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §6/§8/§9/§19 phase 5. Author-x-ray-first, not reader-only (report §16/§18).

---

## 1. Context & Motivation

The frontend is entirely page-centric: routes `/entry` (`PageEntryRoute`) and `/pages/:pageId` (`PageReadRoute`) load `getPageDetail`, rendering `PageHeader` / `ProsePanel` / choices / `XRayPanel` around a `pageId`; the `PageDetail` view model fuses page+prose+plan+receipt; the API client exposes `getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages`. Tools fossilize around the UI — while `/pages/:pageId` is where authors read/inspect/branch, PGs stay psychologically first-class prose units even though the engine treats them as causal ticks. This spec makes the **branch-path timeline segmented by scene coverage** the primary surface, with prose prominent when it exists and PG inspection demoted to an x-ray drawer. The existing `XRayPanel` tab infrastructure, `groupActiveRecords`, `RecordCard` rendering, route loader/ErrorBoundary scaffolding, and the API envelope client are **reusable**.

## 2. Scope

### In scope

1. **Delete page-reader route concepts**: `/entry`, `/pages/:pageId`, `PageEntryRoute`, `PageReadRoute`, `pageReadLoader`, page-first breadcrumbs, page-level "Plan & Prose" tab semantics, page-reader not-found labels.
2. **New route hierarchy** (PG focus is query state, never a path segment):
   - `/worlds/:slug/stories/:storySlug` (story dashboard / overview)
   - `/worlds/:slug/stories/:storySlug/timeline?branch=BR-1&focus=PG-12`
   - `/worlds/:slug/stories/:storySlug/scenes` and `/scenes/:sceneId?focusPg=PG-12`
   - `/worlds/:slug/stories/:storySlug/unscened`
   - (`/branch-map`, `/search` added by SPEC-98)
3. **New view models** (frontend `api/client.ts`): `StoryOverview`, `BranchSummary`, `BranchTimeline`, `TimelineSegment`, `SceneSummary`, `SceneDetail`, `ScenePublicationState`, `SceneArtifactSummary`, `UnscenedRange`, `StateTickXray`, `EventDeltaSummary` (retain), `ChoiceSurface`, `RecordCard` (retain). Remove `PageDetail`, `PageSummary`, `PagePlanSummary`, `ReceiptSummary`, `ProseStatus` (page-scoped). New client functions for the SPEC-96 endpoints; remove `getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages`.
4. **Components**: new `StoryDashboard`, `BranchSelector`, `TimelineSegmentList`, `SceneSegmentCard`, `UnscenedRunCard`, `ChoiceSurfacePanel`, `SceneDetailShell`, `SceneProsePanel`, `ScenePlanPanel`, `SceneReceiptPanel`, `StateTickDrawer`, `StateDeltaPanel`, `ActiveRecordsPanel`, `ValidationFreshnessPanel`. Reuse the x-ray tab infra (`XRayPanel`, `groupActiveRecords`, `RecordCard*`) rebound to the `StateTickXray` payload. Rebuild `ProsePanel` as `SceneProsePanel` (scene-scoped); delete the page-level `ProsePanel` and `PageHeader`.
5. **Scene detail = author workbench**: prose-first left panel when prose exists (else plan or "prose not attached"), x-ray right panel, bottom rail of PG ticks / event deltas / emitted choice surface / active records / validation+freshness. Publication/freshness chips read SPEC-96's `ScenePublicationState` (presence-based).
6. **Unscened range view**: normal authoring state (not an error) — PG range, branch path, state progression summary, event deltas, emitted choices at final PG, validation traces; no reader/prose affordance beyond "no scene plan/prose yet".
7. **Coverage panel** (on the dashboard): lists unscened committed PG runs, planned-but-unrendered scenes, attached-with-warnings, superseded. **No** automatic scene-boundary recommender (optional contiguous-PG grouping helper only; author chooses the range).
8. **PG x-ray drawer**: clicking a PG tick opens a `StateTickDrawer` (deep-linkable via `timeline?focus=PG-12`), never a page-reader view.

### Out of scope

- Search + branch-map UI → **SPEC-98** (this spec leaves the `/branch-map` and `/search` routes as stubs or omits them until SPEC-98).
- Backend API → **SPEC-96**.
- Any reader-only "scene viewer" framing — explicitly rejected (report §18: author-x-ray-first, not reader-only).

## 3. Key decisions

- **Author tool, not a reader product.** Scene detail is prose-first when prose exists but x-ray is equally accessible; this is not a reader-safe surface.
- **Reuse the x-ray infra.** `XRayPanel`/tabs/`groupActiveRecords`/`RecordCard` rebind from `PageDetail` to `StateTickXray` rather than being rewritten — the record-grouping and rendering logic is sound.
- **Query-state PG focus.** PG deep links survive as `timeline?focus=PG-N` / `scenes/SCN-3?focusPg=PG-N`, preserving convenient linking without resurrecting `/pages/:pageId`.

## 4. Files to touch (`tools/story-explorer/web/src`)

- `app.tsx` (route tree), `routes/` (delete `page-entry.tsx`, `page-read.tsx`; add `story-dashboard.tsx`, `timeline.tsx`, `scenes.tsx` + `scene-detail.tsx`, `unscened.tsx`), `api/client.ts` (view models + client fns), `components/` (new scene/timeline/dashboard components; delete `PageHeader`, page-level `ProsePanel`; rebind `xray/`), `components/xray/*` (rebind to `StateTickXray`).
- Tests: delete page-route + page-detail + page `ProsePanel` tests; add scene/timeline/unscened/dashboard + x-ray-drawer tests + a11y tests (the suite is large — ~76 test files; budget for parallel rewrite).

Package shape (verified): `@worldloom/story-explorer-web`, scripts `dev` (vite) / `build` (tsc + vite build) / `test` (`vitest run`); run via `npm --prefix web test` from the root package or `npm test` in `web/`.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| PG = causal tick, not a reader page (SPEC-92/93) | aligns | No `/pages/:pageId` reader route; PG inspection is an x-ray drawer reached via timeline focus (route + component surface). |
| `SCN` is the render unit; prose non-authoritative (SPEC-92) | aligns | Scene detail surfaces prose as publication output with derived publication chips; prose never edited or treated as state (UI surface). |
| Tools shouldn't fossilize the wrong model (report §5 motivation; design discipline) | aligns | Making timeline/scene the primary surface stops the UI from re-teaching "PG = prose page" (navigation-model surface). |
| Author-x-ray-first, not reader-only (report §16/§18) | aligns | X-ray is co-equal with prose in scene detail; unscened ranges are first-class authoring views (layout surface). |

## 6. Build & test

`tools/story-explorer/web`: `npm test` (`vitest run`) + `npm run build` (tsc + vite). Add component/route/a11y tests for the new surfaces; assert no route resolves `/pages/:pageId` or `/entry`. Full-tool gate: `npm test` at `@worldloom/story-explorer` root (builds web + backend + runs both suites).

## 7. Acceptance criteria

1. Route tree exposes story dashboard, timeline, scenes (list + detail), unscened; `/entry` and `/pages/:pageId` (and `PageEntryRoute`/`PageReadRoute`/`pageReadLoader`) are removed; PG focus is query state.
2. `PageDetail`/`PageSummary`/page-scoped client functions are removed; new scene/timeline/overview/x-ray view models + client functions consume SPEC-96 endpoints.
3. Scene detail is an author workbench (prose-first-when-present + co-equal x-ray + PG-tick rail); the x-ray tab infra is reused, rebound to `StateTickXray`; the page-level `ProsePanel`/`PageHeader` are deleted.
4. Unscened ranges render as a normal authoring view with no reader/prose affordance; the coverage panel lists unscened/planned/attached-warn/superseded with no automatic boundary recommender.
5. Clicking a PG opens a state-tick x-ray drawer (deep-linkable via timeline focus), never a page reader.
6. `npm test` passes for `@worldloom/story-explorer-web`; tests assert the absence of page-reader routes.
