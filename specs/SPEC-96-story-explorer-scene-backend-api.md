# SPEC-96 — Story Explorer Backend: Scene / Timeline / Unscened / State-Tick X-Ray API

**Status:** draft
**Date:** 2026-05-28
**Classification:** story-canon-related (tooling that operates on story-handling logic — replaces the `tools/story-explorer` backend's page-first reader routes with scene/timeline/x-ray read APIs over story-bundle records; reads canon/story records, mutates nothing).
**Depends on:** **SPEC-95** (consumes the world-index scene-coverage view: active SCNs, unscened PG runs, PG↔SCN lookup, per-SCN publication indicator) and **SPEC-94** (no SCN `status`). Land SPEC-95 first.
**Related:** archived `SPEC-87/88/89` (the current page/prose/records read model + envelope), `SPEC-90` (the page-centric search/branch-map placeholders this iteration removes — handled in SPEC-98). Consumed by **SPEC-97** (frontend).
**Source:** critical triage of `reports/scene-prose-planning-second-iteration.md` §7/§9/§19 phase 4. Rejected report extras (8-state `ScenePublicationState` machine, hash freshness) are pruned — publication state comes from SPEC-95's presence-based indicator.

---

## 1. Context & Motivation

The story-explorer backend (`@worldloom/story-explorer`) is entirely page-first: `pages.ts` (`/pages`, `/pages/:pageId`), `prose.ts` (`/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId` reading `pages-prose*`), and the `PageDetail` view model are the reader surface; there is **no scene-aware backend code**. With SPEC-92/93 having made PG a causal tick and SCN the render unit, and SPEC-95 providing scene coverage, the backend must stop exposing PGs as reader pages and expose the **causal branch timeline segmented by scenes / unscened runs**, with PG inspection demoted to a state-tick x-ray surface. The clean route-registration pattern in `src/server/http.ts` (each `register*Routes(server, options)` wired in order) and the `src/read/` + `src/view-models/` split give clear insertion points.

## 2. Scope

### In scope

1. **Overview route** — `GET /api/worlds/:slug/stories/:storySlug/overview`: story metadata, per-branch summaries (root PG, latest committed PG, latest scene + its publication indicator), scene-coverage counts, unscened-run counts, validation/index status. Backed by SPEC-95's coverage view.
2. **Timeline route** — `GET .../timeline?branchId=BR-N&focus=PG-N|SCN-N`: ordered segments `scene_segment` | `unscened_run` | `choice_surface` | `branch_split` | `terminal_marker` along a branch path. The backbone the frontend loads before scene detail.
3. **Scenes routes** — `GET .../scenes` (filters: `branchId`, `hasProse`, `receiptVerdict`, `coverage=active|superseded`) and `GET .../scenes/:sceneId` (SCN record, derived publication indicator, included-PG summaries, end choice surface, event-delta summaries, plan/prose/receipt availability, links to x-ray payloads). Scene artifact reads: `GET .../scenes/:sceneId/plan|prose|receipt` (reading `scene-prose-plans/`, `scene-prose/`, `scene-prose-receipts/`).
4. **Unscened-ranges route** — `GET .../unscened-ranges?branchId=BR-N`: contiguous committed PG ranges on a branch path not covered by an active SCN, each with start/end PG, count, final choice surface, event-delta summary, active-record delta summary, validation status, a suggested default range label (NOT an automatic scene-boundary verdict).
5. **State-tick x-ray route** — `GET .../state-ticks/:pgId/xray`: the PG inspection payload (parent PG, branch path, turn index, input mode, resolved SE, state hash + parent hash, state-snapshot summary, active records by class, visible affordances, unresolved mystery claims, continuation status, emitted choices, validation trace, raw PG YAML, event delta, created/superseded/closed records, link to containing SCN or unscened range). Technical x-ray surface, explicitly NOT a reader-page route.
6. **Retain technical lookup surfaces** — `records/:recordId`, `records/:recordId/raw`, `provenance/:recordId` (already present) as x-ray surfaces.
7. **Remove page-first reader surfaces** — delete `pages.ts` reader routes (`/pages`, `/pages/:pageId`) and `prose.ts` (`/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId`); delete the `getPageDetail` / `readProse` / page-prose read-layer functions and the `PageDetail` view model (and `PageSummary.hasRenderedProse`, `StorySummary.renderedProseCount` if page-prose-derived). New `src/read/` modules: `scene-detail.ts`, `timeline.ts`, `unscened.ts`, `state-tick-xray.ts`; new view-models: `StoryOverview`, `BranchTimeline` + `TimelineSegment`, `SceneSummary`/`SceneDetail`, `ScenePublicationState`, `UnscenedRange`, `StateTickXray`, `EventDeltaSummary` (retain), `ChoiceSurface`. Register the new routes in `http.ts`; keep the response envelope (`worldIndexStatus`, degraded-direct-read flag) and the read-only guard.

### Out of scope

- Search + branch-map (and SPEC-90 placeholder removal) → **SPEC-98**.
- All frontend → **SPEC-97**.
- MCP context-packet scene surface → **SPEC-99**.
- Triggering scene planning/rendering workflows from the explorer — out (report §17 Q3: stay read-only).
- A patch op for scene-prose attach — none (attach is direct-write; unchanged).

## 3. Key decisions

- **Timeline is the backbone, not a page list.** The frontend loads `/timeline` first; scene detail and x-ray hang off it. PG focus is query state (`?focus=PG-12`), never a `/pages/:pageId` reader route.
- **Publication state is derived, single-label.** `ScenePublicationState` is SPEC-95's presence-based indicator (`planned`/`prose-present`/`attached:PASS|WARN|FAIL`/`superseded`), surfaced as a view-model field — NOT the report's 8-state machine and NOT hash-derived freshness.
- **Stale/degraded honesty.** Every response carries world-index status + whether it is indexed or degraded direct-read; a stale index must never fabricate scene coverage (degrade orientation, don't invent).

## 4. Files to touch (backend `tools/story-explorer/src`)

- `server/http.ts` (route registration), `server/routes/` (new `overview.ts`, `timeline.ts`, `scenes.ts`, `unscened.ts`, `state-tick-xray.ts`; delete `pages.ts`, `prose.ts` reader routes), `read/` (new scene/timeline/unscened/x-ray modules; delete `page-detail.ts`, `prose-direct.ts`), `view-models/` (new scene/timeline/overview/x-ray models; delete `page-detail.ts`), `read/story-list.ts` (drop page-prose-derived summary fields).
- `test/` — delete page/prose route + page-detail tests; add scene/timeline/unscened/x-ray + degraded-index tests (see SPEC-99 fixtures).

Verify the package shape before prescribing commands (done): package `@worldloom/story-explorer`, scripts `build` / `build:backend` / `test` / `test:backend` (Node `--test` over `dist/test/**`); no pnpm workspace.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| PG = causal tick, not a reader page (SPEC-92/93) | aligns | PG inspection moves to a `/state-ticks/:pgId/xray` technical surface; no `/pages/:pageId` reader route remains (route surface). |
| `SCN` is the render unit; publication derived (SPEC-92/94/95) | aligns | Scene routes surface SPEC-95's presence-based indicator; no stored status, no hashing (read-model surface). |
| Rendered prose is non-authoritative (story-state-contract §1) | aligns | Scene prose served as a publication artifact via `/scenes/:id/prose`; never as state; page-prose reader routes removed. |
| Machine-facing honesty under stale index (degraded-read disclosure) | aligns | Envelope carries index status + degraded-read flag; stale index degrades orientation, never fabricates coverage (envelope surface). |

## 6. Build & test

`tools/story-explorer`: `npm run test:backend` during development (builds backend + runs `node --test` over `dist/test/**`); `npm test` for the full pass (also builds + tests `web`). Add tests for each new route + the degraded-index path; assert the absence of `/pages/:pageId` and page-prose routes.

## 7. Acceptance criteria

1. Backend exposes `/overview`, `/timeline`, `/scenes`, `/scenes/:id` (+ `/plan|/prose|/receipt`), `/unscened-ranges`, `/state-ticks/:pgId/xray`; all consume SPEC-95's coverage view and carry the index-status envelope.
2. No live route exposes `/pages/:pageId` as a reader page, nor `/prose/:pageId`, `/page-plans/:pageId`, `/prose-receipts/:pageId`; `PageDetail` view model and page-prose read layer are removed; a test asserts these routes 404 / are absent.
3. Scene publication state is the SPEC-95 presence-based indicator; no 8-state machine, no hash-derived freshness in the backend.
4. State-tick x-ray returns the full PG inspection payload and is documented/typed as a technical x-ray surface, not a reader route.
5. Responses degrade gracefully on stale/missing index (status surfaced; coverage never fabricated); covered by a test.
6. `npm test` passes for `@worldloom/story-explorer`.
