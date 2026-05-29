# SPEC96STOEXPSCE-001: Scene-read foundation — shared view-models + world-index coverage helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `read/scene-coverage.ts` helper + new shared view-models (`ScenePublicationState`, `ChoiceSurface`, relocated `EventDeltaSummary`). No impact on existing canon/story-pipeline behavior (read-only).
**Deps**: None

## Problem

SPEC-96 replaces the story-explorer backend's page-first reader surfaces with scene/timeline/x-ray read APIs over SPEC-95's world-index scene-coverage view. Every new route (overview, timeline, scenes, unscened-ranges, state-tick-xray) consumes the same world-index coverage surface and shares a small set of view-models. Building that shared foundation once — a typed coverage-read helper plus the cross-route view-models — keeps the per-route tickets thin and prevents each route from re-deriving coverage from artifacts (which would reintroduce the artifact-state coupling SPEC-94/95 removed). It also relocates the **retained** `EventDeltaSummary` view-model out of `view-models/page-detail.ts`, which SPEC96STOEXPSCE-007 deletes, so the retained type survives the page-first teardown.

## Assumption Reassessment (2026-05-29)

1. SPEC-95's coverage view exists and is consumable: `querySceneCoverage(db, { worldSlug, storySlug?, branchId? })` returns `SceneCoverageBranch[]` (fields `active_scene_ids`, `superseded_scene_ids`, `unscened_runs`, `pg_scene_lookup`, `scenes`, `refreshed_at`), with `SceneCoverageScene.publication_indicator` ∈ {`planned`, `prose-present`, `attached:PASS|WARN|FAIL`, `superseded`} — implemented at `tools/world-index/src/index/scene-coverage.ts`, exported via `@worldloom/world-index/public/types`. Verified during SPEC-96 reassessment (2026-05-29).
2. SPEC-96 §4 names the consumed surface explicitly: "the new read modules call `querySceneCoverage(...)` → `SceneCoverageBranch[]` … and read `SceneCoverageScene.publication_indicator` for the `ScenePublicationState` view-model … all from `@worldloom/world-index/public/types`. The backend does not recompute coverage or publication state from artifacts; it reads the derived view."
3. Cross-package boundary under audit: `@worldloom/story-explorer` consuming `@worldloom/world-index`'s public read surface. `tools/story-explorer/package.json` already declares `"@worldloom/world-index": "file:../world-index"` and `better-sqlite3`; the consumption respects the world-index → story-explorer layering (story-explorer may consume world-index's public schema/query surface, not reach into `world-index/src/parse/` internals — per `reassess-spec/references/codebase-validation.md` §3.7).
4. FOUNDATIONS §Story Bundles scene layer: `SCN` is a derived, non-authoritative membership record; publication state is "derived at read time from scene artifact presence plus the scene-prose receipt verdict, never stored on the append-only `SCN`." The `ScenePublicationState` view-model is a thin pass-through of world-index's already-derived `publication_indicator` — this ticket must not recompute it from artifacts directly.
5. (was template item 7 — rename/relocate blast radius) `EventDeltaSummary` is currently defined in `tools/story-explorer/src/view-models/page-detail.ts:17` and imported by `read/page-detail.ts:11`. SPEC-96 §2.7 marks it `(retain)`. Relocating it to a new `view-models/event-delta-summary.ts` requires `view-models/page-detail.ts` to re-export it (so existing consumers compile until 007 deletes page-detail.ts) and the new route tickets (003/004/005/006) to import it from the new location. Blast radius at this ticket: 1 consumer (`view-models/page-detail.ts`, re-export); `read/page-detail.ts`'s import resolves transitively via the re-export and needs no change here.

## Architecture Check

1. A single foundation module that wraps `querySceneCoverage` gives every route one typed entry point into the coverage view, so route modules never touch `better-sqlite3` or the world-index query signature directly — boundary stays at one seam. Relocating `EventDeltaSummary` to its own file (rather than leaving it in the doomed `page-detail.ts`) keeps the retained type's ownership explicit and lets 007 delete page-first code without collateral loss of a retained surface.
2. No backwards-compatibility shims: the re-export in `page-detail.ts` is a transitional compile-bridge that 007 removes when it deletes the file; it is not a permanent alias. New routes import `EventDeltaSummary` from its canonical new location directly.

## Verification Layers

1. Coverage helper returns SPEC-95's derived view unmodified → codebase grep-proof: `read/scene-coverage.ts` calls `querySceneCoverage` and returns its `SceneCoverageBranch`/`SceneCoverageScene` shape without re-deriving `publication_indicator`.
2. `ScenePublicationState` value set matches world-index's `publication_indicator` → schema/type check: the view-model's union type equals `planned | prose-present | attached:PASS | attached:WARN | attached:FAIL | superseded`.
3. `EventDeltaSummary` relocation preserves consumers → codebase grep-proof: `grep -rn "EventDeltaSummary" tools/story-explorer/src` resolves all imports to the new `view-models/event-delta-summary.ts` (directly or via the transitional re-export); `npm run build:backend` compiles clean.
4. (cross-package) world-index consumption respects the boundary → FOUNDATIONS/layering check: imports come from `@worldloom/world-index/public/types`, not `world-index/src/parse/` internals.

## What to Change

### 1. Add the coverage-read helper

Create `tools/story-explorer/src/read/scene-coverage.ts`: a thin typed wrapper that opens the world index (via the existing index-status / repo-root machinery) and calls `querySceneCoverage(db, { worldSlug, storySlug, branchId? })`, returning the `SceneCoverageBranch[]` (or a single branch when `branchId` is supplied). Surface the world-index `worldIndexStatus` / degraded-direct-read posture per the existing response-envelope contract so callers can carry it; never re-derive coverage when the index is stale.

### 2. Add shared view-models

- `tools/story-explorer/src/view-models/scene-publication-state.ts` — `ScenePublicationState` union mirroring world-index's `publication_indicator` (`planned | prose-present | attached:PASS | attached:WARN | attached:FAIL | superseded`).
- `tools/story-explorer/src/view-models/choice-surface.ts` — `ChoiceSurface` (the end-of-segment / end-of-scene emitted-choice surface consumed by timeline, scenes, and unscened-ranges).

### 3. Relocate the retained `EventDeltaSummary`

- Create `tools/story-explorer/src/view-models/event-delta-summary.ts` holding the `EventDeltaSummary` interface (moved verbatim from `view-models/page-detail.ts:17`).
- Modify `tools/story-explorer/src/view-models/page-detail.ts` to import-and-re-export `EventDeltaSummary` from the new file (transitional bridge; deleted by 007).

## Files to Touch

- `tools/story-explorer/src/read/scene-coverage.ts` (new)
- `tools/story-explorer/src/view-models/scene-publication-state.ts` (new)
- `tools/story-explorer/src/view-models/choice-surface.ts` (new)
- `tools/story-explorer/src/view-models/event-delta-summary.ts` (new)
- `tools/story-explorer/src/view-models/page-detail.ts` (modify — re-export relocated `EventDeltaSummary`)

## Out of Scope

- Any route file or `http.ts` registration (route tickets 002–006 own those).
- Deleting page-first code (`pages.ts`, `prose.ts`, `page-detail.ts`, etc.) — that is SPEC96STOEXPSCE-007.
- Recomputing publication state or coverage from artifacts (forbidden — read the world-index derived view).
- Any world-canon or `_source/` read/write.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run build:backend` compiles clean with the new modules and the relocated `EventDeltaSummary`.
2. `grep -rn "EventDeltaSummary" tools/story-explorer/src` shows all references resolving to `view-models/event-delta-summary.ts` (directly or via the page-detail re-export); no dangling import.
3. `cd tools/story-explorer && npm run test:backend` passes (existing suite still green; the relocation is import-transparent).

### Invariants

1. The coverage helper reads SPEC-95's derived `publication_indicator`/coverage and never recomputes it from artifact presence.
2. `ScenePublicationState`'s value set is byte-equal to world-index's `publication_indicator` union; drift between the two is a contract break.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/scene-coverage.test.ts` — new; asserts the helper returns the world-index `SceneCoverageBranch` shape (active/superseded scene ids, unscened runs, pg↔scene lookup, per-scene `publication_indicator`) against a seeded fixture index.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -rn "EventDeltaSummary\|ScenePublicationState\|querySceneCoverage" tools/story-explorer/src`

## Outcome

Completed: 2026-05-29

What changed:
- Added `tools/story-explorer/src/read/scene-coverage.ts`, a thin wrapper over `querySceneCoverage` from `@worldloom/world-index/public/types`. It returns world-index coverage rows when the index is fresh and reports `worldIndexStatus` plus `degradedDirectRead: true` with no fabricated coverage when the index is unavailable or stale.
- Added shared view-models: `ScenePublicationState`, `ChoiceSurface`, and the relocated `EventDeltaSummary`.
- Updated `view-models/page-detail.ts` to import and re-export the relocated `EventDeltaSummary`, preserving existing page-detail consumers until SPEC96STOEXPSCE-007 removes page-first code.
- Added `tools/story-explorer/test/scene-coverage.test.ts` covering fresh coverage pass-through, branch filtering, publication-indicator preservation, and degraded missing-index behavior.

Deviations from original plan:
- The helper returns a `SceneCoverageReadResult` envelope (`branches`, `worldIndexStatus`, `degradedDirectRead`) plus `readSceneCoverageBranch(...)` for branch-specific callers, rather than returning a bare array only. This preserves the existing response-envelope posture required by the ticket.
- The first `npm run test:backend` run failed in SPEC-88/89 capstone smoke tests because `tools/story-explorer/web/dist` was absent; those tests expect a prebuilt static bundle even though `test:backend` does not build it. Running `npm run build` restored the expected bundle, after which `npm run test:backend` passed.

Verification results:
- `cd tools/world-index && npm run build` — PASS.
- `cd tools/story-explorer && npm run build:backend` — PASS.
- `cd tools/story-explorer && npm run test:backend` — PASS after `npm run build` restored `web/dist`; 16/16 backend test files passed, including `dist/test/scene-coverage.test.js`.
- `grep -rn "EventDeltaSummary" tools/story-explorer/src` — PASS; references resolve to `view-models/event-delta-summary.ts` directly or through the transitional `page-detail.ts` re-export.
- `grep -rn "EventDeltaSummary\|ScenePublicationState\|querySceneCoverage" tools/story-explorer/src` — PASS; `querySceneCoverage` is imported from the public world-index surface, and `ScenePublicationState` derives from `SceneCoverageScene["publication_indicator"]`.
- `git diff --check` over owned tracked files — PASS.
