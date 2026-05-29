# SPEC97STOEXPSCE-001: API client — scene/timeline/x-ray view models + SPEC-96 client functions (additive)

**Status**: DONE
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/web` API client layer (`@worldloom/story-explorer-web`); additive only, no impact on existing page-scoped surface (its removal is owned by SPEC97STOEXPSCE-008).
**Deps**: None

## Problem

SPEC-96 has landed a scene-first backend (`/overview`, `/timeline`, `/scenes` + `/scenes/:id` + `/plan|/prose|/receipt`, `/unscened-ranges`, `/state-ticks/:pgId/xray`) but the frontend `api/client.ts` only exposes the page-first surface (`getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages` + `PageDetail`/`PageSummary`/...). The new scene-first UI surfaces (dashboard, timeline, scenes, unscened, x-ray drawer) have no typed client to consume. This ticket adds the new view models and client functions that mirror SPEC-96's response shapes, so the downstream UI tickets have a typed data layer to build against. Removal of the now-superseded page-scoped surface is deferred to SPEC97STOEXPSCE-008 so this ticket stays additive and the package keeps compiling.

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/web/src/api/client.ts` exists and currently exports the page-first surface (`getPageDetail` at line ~340, `getProseBody`/`searchPages`/`getPagePlan`/`getProseReceipt`, and types `PageDetail`/`PageSummary`/`PagePlanSummary`/`ReceiptSummary`/`ProseStatus`/`EventDeltaSummary`/`RecordCard`/`StorySummary`); the `EnvelopedResult<T>` envelope wrapper is the shared response shape and is reused unchanged. Verified by reassessment-session grep.
2. SPEC-96 (`archive/specs/SPEC-96-story-explorer-scene-backend-api.md` §2.7) names the authoritative response view models: `StoryOverview`, `BranchTimeline` + `TimelineSegment`, `SceneSummary`/`SceneDetail`, `ScenePublicationState`, `UnscenedRange`, `StateTickXray`, `EventDeltaSummary` (retain), `ChoiceSurface`. SPEC-97 §2.3 additionally names frontend-defined nested shapes `BranchSummary` (per-branch summary inside `StoryOverview`) and `SceneArtifactSummary` (scene plan/prose/receipt availability inside `SceneDetail`). `ScenePublicationState` is the presence-based label set `planned | prose-present | attached:PASS|WARN|FAIL | superseded` (SPEC-96 §3), NOT an 8-state machine and NOT hash-derived.
3. Cross-artifact boundary under audit: the frontend↔backend API contract. The web client re-declares view-model interfaces mirroring SPEC-96's JSON response shapes (the established pattern — `web/src/api/client.ts` mirrors backend types rather than importing from `@worldloom/story-explorer`, per SPEC-96 §8). This ticket's new interfaces must match SPEC-96's served payloads field-for-field; the `EnvelopedResult<T>` envelope (`worldIndexStatus`, degraded-direct-read flag) wraps every response.

## Architecture Check

1. Additive-only client extension keeps the package compiling at every step: new view models + functions land here; the page-scoped surface they supersede is removed atomically with its consumers in SPEC97STOEXPSCE-008, avoiding a broken intermediate state where types are gone but consumers remain.
2. No backwards-compatibility shims — the new client functions are independent exports; no aliasing of old function names to new ones. Old and new surfaces coexist only transiently across the batch and the old surface is fully removed by 008.

## Verification Layers

1. New view models match SPEC-96 served shapes → codebase grep-proof against `archive/specs/SPEC-96-...md` §2 route descriptions + manual review of field names.
2. New client functions hit the correct SPEC-96 endpoints with the `EnvelopedResult<T>` envelope → unit tests in `api/client.test.ts` asserting URL paths + envelope unwrapping (mocked fetch).
3. Additive-only (no removals) → grep-proof that `getPageDetail`/`PageDetail`/etc. still exist in `client.ts` after this ticket (their removal is 008's, not this ticket's).

## What to Change

### 1. Add scene-first view models to `api/client.ts`

Add interfaces: `StoryOverview` (story metadata + `BranchSummary[]` + coverage/unscened counts + index/validation status), `BranchSummary` (root PG, latest committed PG, latest scene + its `ScenePublicationState`), `BranchTimeline` + `TimelineSegment` (segment kind `scene_segment | unscened_run | choice_surface | branch_split | terminal_marker` + per-segment payload), `SceneSummary`, `SceneDetail` (SCN record + derived publication indicator + included-PG summaries + end `ChoiceSurface` + event-delta summaries + `SceneArtifactSummary`), `ScenePublicationState` (string-union `planned | prose-present | attached:PASS | attached:WARN | attached:FAIL | superseded`), `SceneArtifactSummary` (plan/prose/receipt availability + paths), `UnscenedRange` (start/end PG, count, final `ChoiceSurface`, event-delta summary, active-record delta, validation status, suggested-default range label), `StateTickXray` (full PG inspection payload per SPEC-96 §2.5: parent PG, branch path, turn index, input mode, resolved SE, state+parent hash, state-snapshot summary, active records by class, visible affordances, unresolved mystery claims, continuation status, emitted choices, validation trace, raw PG YAML, event delta, created/superseded/closed records, link to containing SCN/unscened range), `ChoiceSurface`. Retain `EventDeltaSummary` and `RecordCard` (reused by the x-ray rebind in 002).

### 2. Add client functions for the SPEC-96 endpoints

Add `getStoryOverview`, `getBranchTimeline` (branch + optional focus query), `listScenes` (filters: branchId, hasProse, receiptVerdict, coverage), `getSceneDetail`, `getScenePlan`/`getSceneProse`/`getSceneReceipt`, `getUnscenedRanges`, `getStateTickXray` — each returning `Promise<EnvelopedResult<T>>` and targeting the SPEC-96 route paths. Reuse the existing fetch+envelope helper.

### 3. Add unit tests in `api/client.test.ts`

One test per new function asserting the request URL/query and envelope unwrapping against a mocked fetch, mirroring the existing page-fn test structure.

## Files to Touch

- `tools/story-explorer/web/src/api/client.ts` (modify)
- `tools/story-explorer/web/src/api/client.test.ts` (modify)

## Out of Scope

- Removing `getPageDetail`/`getProseBody`/`getPagePlan`/`getProseReceipt`/`searchPages` or the page-scoped types (`PageDetail`/`PageSummary`/`PagePlanSummary`/`ReceiptSummary`/`ProseStatus`/`ChoiceNavigation`/`ChildOutcomeVariant` + page-prose fields) — owned by SPEC97STOEXPSCE-008.
- `SearchHit` / `BranchMapGraph` view models — deferred to SPEC-98.
- Any component, route, or UI work — owned by 002–008.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — all new `api/client.test.ts` cases pass (request URL + envelope assertions for each new function).
2. `cd tools/story-explorer/web && npm run build` — `tsc` typechecks the new interfaces with no errors and the existing page-scoped surface still compiles (additive-only).
3. `grep -nE "getStoryOverview|getStateTickXray|interface StateTickXray|interface StoryOverview" tools/story-explorer/web/src/api/client.ts` — new surface present.

### Invariants

1. Every new client function returns `Promise<EnvelopedResult<T>>` — the index-status envelope is never bypassed.
2. New view-model field names match SPEC-96's served payload shapes exactly (frontend mirror of the backend contract).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/api/client.test.ts` — add one request-shape + envelope-unwrap test per new client function.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
