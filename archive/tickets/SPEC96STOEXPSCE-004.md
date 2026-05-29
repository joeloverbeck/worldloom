# SPEC96STOEXPSCE-004: Scenes routes — list, detail, and artifact reads

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /scenes`, `GET /scenes/:sceneId`, `GET /scenes/:sceneId/plan|prose|receipt` routes + `read/scene-detail.ts` + `SceneSummary` / `SceneDetail` view-models + registration in `http.ts`; `record-io.ts` now recognizes `SCN` records under `_source/scenes`. Read-only.
**Deps**: archive/tickets/SPEC96STOEXPSCE-001.md

## Problem

SPEC-96 §2.3 (D3): the scene-first reader needs scene list + scene detail + scene artifact reads. `GET /scenes` lists scenes with filters (`branchId`, `hasProse`, `receiptVerdict`, `coverage=active|superseded`); `GET /scenes/:sceneId` returns the SCN record, derived publication indicator, included-PG summaries, end choice surface, event-delta summaries, plan/prose/receipt availability, and links to x-ray payloads; `GET /scenes/:sceneId/plan|prose|receipt` serve the scene artifacts from `scene-prose-plans/`, `scene-prose/`, `scene-prose-receipts/`. This replaces page-prose reads with scene-scoped reads — rendered prose served as a publication artifact, never as state.

## Assumption Reassessment (2026-05-29)

1. 001's `read/scene-coverage.ts` supplies `scenes[]` with `scene_id`, `branch_id`, `pg_ids`, `supersedes`/`superseded`, `artifact_availability` (plan/prose/receipt presence + receipt verdict), and `publication_indicator` — the basis for both the list filters and the detail payload. `ScenePublicationState` / `ChoiceSurface` / `EventDeltaSummary` (from 001) type the detail fields. Scene artifacts live under `worlds/<slug>/stories/<slug>/scene-prose-plans/`, `scene-prose/`, `scene-prose-receipts/` (direct-write publication surfaces per FOUNDATIONS §Story Bundles §4). Verified against `tools/world-index/src/index/scene-coverage.ts` during reassessment.
2. SPEC-96 §2.3 filters are `branchId`, `hasProse`, `receiptVerdict`, `coverage=active|superseded` — the spec deliberately drops the report's `hasPlan` + `freshness` filters and uses `coverage=active|superseded` (matching SPEC-95's `active_scene_ids`/`superseded_scene_ids`) rather than the report's `open|complete|superseded`. Implement the spec's filter set, not the report's; no freshness diagnostics (anti-hash stance, §3).
3. Cross-package boundary under audit: scene-coverage data comes via 001's helper; artifact reads use the existing direct-file-read read-layer pattern (the same shape `read/prose-direct.ts` uses today for page prose, retargeted to scene-prose paths). Reuse the existing response envelope; artifact routes return the file body + the degraded/missing-file posture.
4. FOUNDATIONS §Story Bundles §4 (rendered prose is non-authoritative): scene prose is served as a publication artifact via `/scenes/:id/prose`, never as state; the derived publication indicator comes from artifact presence + receipt verdict (read from the coverage view), never stored on the append-only `SCN`. This ticket must not write any SCN/PG/SE state.
5. Live implementation correction: `readRecord()` could not read `SCN-*` records until `tools/story-explorer/src/read/record-io.ts` mapped `SCN` to `_source/scenes`; scene detail needs that mapping to return the SCN record. This is same-seam fallout for this route and does not add a write path.

## Architecture Check

1. One scene-detail read module composes the coverage view's per-scene record with included-PG summaries + end choice surface + event-delta summaries + artifact availability, so list and detail share derivation and the three artifact routes stay thin file-reads. Keeping artifact reads in the same ticket as detail (rather than splitting) preserves the coupling — detail's "plan/prose/receipt availability" + "links to x-ray payloads" reference the same artifacts the artifact routes serve.
2. No backwards-compatibility shims: scene artifact routes are net-new and do not alias the removed `/prose/:pageId` / `/page-plans/:pageId` / `/prose-receipts/:pageId` page-prose routes; they are scene-scoped, not page-scoped.

## Verification Layers

1. List filters behave → route dry-run: `GET /scenes?branchId=…&hasProse=…&receiptVerdict=…&coverage=active|superseded` returns the filtered set against a fixture with active + superseded scenes.
2. Detail payload complete → route dry-run: `GET /scenes/:sceneId` returns SCN record + `ScenePublicationState` + included-PG summaries + `ChoiceSurface` + `EventDeltaSummary` list + artifact availability + x-ray links.
3. Artifact reads serve files, not state → route dry-run + grep-proof: `/scenes/:id/plan|prose|receipt` read from `scene-prose-plans/`/`scene-prose/`/`scene-prose-receipts/`; no SCN/PG/SE write occurs (grep the module for write/patch calls — none).
4. Publication indicator is derived, not stored (cross-cutting) → FOUNDATIONS check: the detail's publication state is the coverage view's `publication_indicator`, surfaced via `ScenePublicationState`, with no `SCN.status` read or write.

## Landed Changes

### 1. Scene-detail read module

Created `tools/story-explorer/src/read/scene-detail.ts`: lists scenes with the four filters and assembles scene detail (SCN record fields, derived `ScenePublicationState`, included-PG summaries, end `ChoiceSurface`, `EventDeltaSummary` list, plan/prose/receipt availability, x-ray payload links) from 001's coverage helper + existing record retrieval. Scene artifact file reads (plan/prose/receipt) use direct file reads retargeted to scene-prose paths.

### 2. `SceneSummary` / `SceneDetail` view-models

Created `tools/story-explorer/src/view-models/scene-summary.ts` (`SceneSummary`: scene id, branch, PG range, `ScenePublicationState`, coverage status) and `tools/story-explorer/src/view-models/scene-detail.ts` (`SceneDetail`: SCN record + publication state + included-PG summaries + `ChoiceSurface` + `EventDeltaSummary[]` + artifact availability + x-ray links).

### 3. Routes + registration

Created `tools/story-explorer/src/server/routes/scenes.ts` exporting `registerScenesRoutes(server, options)` for `GET /scenes`, `GET /scenes/:sceneId`, and `GET /scenes/:sceneId/plan|prose|receipt`; wired into `http.ts` behind the read-only guard + envelope.

### 4. SCN record lookup support

Added the minimal `SCN: "scenes"` mapping in `tools/story-explorer/src/read/record-io.ts` so scene detail can return the SCN record from `_source/scenes/SCN-*.yaml`.

## Files to Touch

- `tools/story-explorer/src/read/scene-detail.ts` (new)
- `tools/story-explorer/src/view-models/scene-summary.ts` (new)
- `tools/story-explorer/src/view-models/scene-detail.ts` (new)
- `tools/story-explorer/src/server/routes/scenes.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the scenes routes)
- `tools/story-explorer/src/read/record-io.ts` (modify — add `SCN` record source directory mapping)
- `tools/story-explorer/test/scenes-route.test.ts` (new)

## Out of Scope

- Overview / timeline / unscened / x-ray routes (002, 003, 005, 006).
- `hasPlan` / `freshness` filters or freshness diagnostics (spec deliberately omits).
- Any write to `SCN` / `PG` / `SE` or scene-prose receipts (attach is a separate skill, unchanged).
- Page-prose routes (removed by 007).

## Acceptance Criteria

### Tests That Must Pass

1. `GET /scenes?coverage=active` excludes superseded scenes; `?receiptVerdict=PASS` filters by verdict; `?hasProse=true` filters by prose presence (route-injection test against a fixture).
2. `GET /scenes/:sceneId` returns the full detail payload (SCN record, derived publication state, included-PG summaries, end choice surface, event-delta summaries, artifact availability, x-ray links); `/scenes/:id/prose` returns the scene-prose body.
3. `cd tools/story-explorer && npm run test:backend` passes.

### Invariants

1. Scene prose is served as a publication artifact, never as state; no SCN/PG/SE write occurs in any scene route.
2. Publication state is the derived `publication_indicator` from SPEC-95's view; no `SCN.status` is read or written.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/scenes-route.test.ts` — new; list-filter matrix (branchId / hasProse / receiptVerdict / coverage), detail-payload completeness, artifact-read happy + missing-file paths, degraded-index path.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -n "registerScenesRoutes" tools/story-explorer/src/server/http.ts`

## Outcome

Completed: 2026-05-29

Implemented the scene list/detail/artifact backend surface for SPEC-96 D3. The new scenes route uses the SPEC-95 scene-coverage helper for filters, coverage status, artifact availability, and `publication_indicator`; detail reads the SCN record and included PG/SE/CHC records only for presentation; artifact routes read `scene-prose-plans/`, `scene-prose/`, and `scene-prose-receipts/` directly.

## Verification Result

1. `cd tools/story-explorer && npm run test:backend` — PASS; backend build passed and 19 compiled backend test files passed, including `dist/test/scenes-route.test.js`.
2. `grep -n "registerScenesRoutes" tools/story-explorer/src/server/http.ts` — PASS; import and registration are present.
3. `rg -n "writeFile|appendFile|submit_patch_plan|validate_patch_plan|readProse\\(|pages-prose" tools/story-explorer/src/read/scene-detail.ts tools/story-explorer/src/server/routes/scenes.ts tools/story-explorer/src/view-models/scene-detail.ts tools/story-explorer/src/view-models/scene-summary.ts` — PASS; no matches, proving the scene route/read/view-model surface adds no writes, patch-plan calls, page-prose reads, or old page-prose helper use.

## Deviations

- Added `tools/story-explorer/src/read/record-io.ts` to the landed file set because SCN detail assembly requires existing `readRecord()` to resolve `SCN-*` records from `_source/scenes/`. The original ticket omitted that mapping, but the correction is same-seam and read-only.
