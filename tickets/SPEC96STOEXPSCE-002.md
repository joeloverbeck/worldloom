# SPEC96STOEXPSCE-002: Overview route — story dashboard summary

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /api/worlds/:slug/stories/:storySlug/overview` route + `read/overview.ts` + `StoryOverview` view-model + registration in `http.ts`. Read-only; no canon/story-pipeline mutation.
**Deps**: 001

## Problem

SPEC-96 §2.1 (D1): the story-explorer frontend needs a single dashboard endpoint summarizing a story bundle — story metadata, per-branch summaries (root PG, latest committed PG, latest scene + its publication indicator), scene-coverage counts, unscened-run counts, and validation/index status — backed by SPEC-95's coverage view. Today the backend exposes no overview; the frontend would have to assemble this from page-first routes. This route is the orientation surface the dashboard loads first.

## Assumption Reassessment (2026-05-29)

1. The coverage-read helper from SPEC96STOEXPSCE-001 (`read/scene-coverage.ts`, wrapping `querySceneCoverage`) supplies per-branch `active_scene_ids` / `superseded_scene_ids` / `unscened_runs` / `scenes[].publication_indicator` — the raw material for overview counts. `ScenePublicationState` (also from 001) types the "latest scene + its publication indicator" field. Verified against `tools/world-index/src/index/scene-coverage.ts` during reassessment.
2. SPEC-96 §2.1 enumerates the overview payload (story metadata, per-branch summaries, scene-coverage counts, unscened-run counts, validation/index status); the spec deliberately omits the report's `plan/prose/receipt counts` + `stale artifact counts` (consistent with its anti-hash-freshness stance, §3 + §8). Match the spec's leaner field set, not the report's.
3. Cross-package boundary under audit: overview's read module consumes `@worldloom/world-index/public/types` only through 001's helper; it must not call `querySceneCoverage` directly or reach into world-index internals. The existing response-envelope contract (`worldIndexStatus`, degraded-direct-read flag) is the shared output surface — reuse it; do not invent a new envelope.
4. FOUNDATIONS §Tooling Recommendation (machine-facing honesty under stale index): the overview must carry world-index status + degraded-read flag, and a stale index must degrade orientation rather than fabricate scene-coverage counts (spec §3 "degrade orientation, don't invent"). Counts derive from the coverage view; when the index is degraded, the envelope says so and counts are reported as unavailable/degraded, not invented.

## Architecture Check

1. A dedicated overview read module that composes 001's coverage helper + existing story/branch enumeration keeps the dashboard's data assembly in one place and reuses the response envelope, rather than spreading count logic across the frontend. The route handler stays thin (params → read module → envelope).
2. No backwards-compatibility shims: the overview route is net-new; it does not alias or wrap any page-first route.

## Verification Layers

1. Overview returns per-branch summaries + coverage/unscened counts from the derived view → skill/route dry-run: inject `GET …/overview` against a seeded fixture index; assert branch summaries + counts match the fixture's coverage.
2. Stale-index honesty → route dry-run: with a degraded/missing index, assert the envelope's degraded-read flag is set and counts are reported degraded, never fabricated.
3. Envelope reuse → codebase grep-proof: the handler returns the existing `worldIndexStatus`/degraded-direct-read envelope shape, not a new one.
4. Single read surface (cross-package) → grep-proof: overview imports world-index only via `read/scene-coverage.ts`.

## What to Change

### 1. Overview read module

Create `tools/story-explorer/src/read/overview.ts`: compose story metadata + per-branch summaries (root PG, latest committed PG, latest scene + `publication_indicator`) + scene-coverage counts + unscened-run counts + validation/index status, sourcing scene/coverage data from 001's `read/scene-coverage.ts` and branch/page enumeration from existing read-layer helpers.

### 2. `StoryOverview` view-model

Create `tools/story-explorer/src/view-models/story-overview.ts`: `StoryOverview` with story metadata, `branches: BranchOverviewSummary[]` (root PG, latest committed PG, latest scene + `ScenePublicationState`), `sceneCoverageCounts`, `unscenedRunCounts`, and index/validation status.

### 3. Route + registration

Create `tools/story-explorer/src/server/routes/overview.ts` exporting `registerOverviewRoutes(server, options)` for `GET /api/worlds/:slug/stories/:storySlug/overview`; wire it into `tools/story-explorer/src/server/http.ts` alongside the existing `register*Routes` calls, behind the existing read-only guard + envelope.

## Files to Touch

- `tools/story-explorer/src/read/overview.ts` (new)
- `tools/story-explorer/src/view-models/story-overview.ts` (new)
- `tools/story-explorer/src/server/routes/overview.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the overview route)

## Out of Scope

- Timeline / scenes / unscened / x-ray routes (separate tickets 003–006).
- `plan/prose/receipt` counts or stale-artifact counts (spec deliberately omits; do not add).
- Any page-first route removal (007) or capstone test wiring (008).
- Recomputing coverage from artifacts.

## Acceptance Criteria

### Tests That Must Pass

1. `GET /api/worlds/:slug/stories/:storySlug/overview` returns story metadata + per-branch summaries + scene-coverage/unscened-run counts + index status against a seeded fixture (route-injection test).
2. With a stale/missing index, the overview response carries the degraded-read flag and does not fabricate scene-coverage counts.
3. `cd tools/story-explorer && npm run test:backend` passes.

### Invariants

1. Overview counts derive from SPEC-95's coverage view via 001's helper, never recomputed from artifact presence.
2. Every overview response carries the existing `worldIndexStatus` + degraded-direct-read envelope.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/overview-route.test.ts` — new; route-injection coverage of the happy path + degraded-index path.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -n "registerOverviewRoutes" tools/story-explorer/src/server/http.ts`
