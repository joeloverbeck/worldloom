# SPEC96STOEXPSCE-005: Unscened-ranges route — uncovered committed-PG runs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /api/worlds/:slug/stories/:storySlug/unscened-ranges` route + `read/unscened.ts` + `UnscenedRange` view-model + registration in `http.ts`. Read-only.
**Deps**: archive/tickets/SPEC96STOEXPSCE-001.md

## Problem

SPEC-96 §2.4 (D4): the scene-first reader needs to surface contiguous committed-PG ranges on a branch path NOT covered by an active SCN — so the author can see what still needs scene planning. `GET /unscened-ranges?branchId=BR-N` returns each range with start/end PG, count, final choice surface, event-delta summary, active-record delta summary, validation status, and a suggested default range label (a hint, NOT an automatic scene-boundary verdict). Today the backend has no unscened surface.

## Assumption Reassessment (2026-05-29)

1. 001's `read/scene-coverage.ts` exposes `unscened_runs` (each `{ start_pg, end_pg, pg_ids }`) directly from SPEC-95's view — the structural basis for this route; the per-range enrichment (final choice surface, event-delta summary, active-record delta, validation status) is assembled from existing record retrieval over the run's `pg_ids`. `ChoiceSurface` / `EventDeltaSummary` (from 001) type those fields. Verified against `tools/world-index/src/index/scene-coverage.ts` (`buildUnscenedRuns` / `UnscenedPgRun`) during reassessment.
2. SPEC-96 §2.4 specifies the per-range fields exactly: start/end PG, count, final choice surface, event-delta summary, active-record delta summary, validation status, suggested default range label — and is explicit that the label is "NOT an automatic scene-boundary verdict." Implement the label as a non-authoritative hint; do not emit a boundary decision.
3. Cross-package boundary under audit: unscened-run data comes via 001's helper (which reads world-index's `unscened_runs`); per-range enrichment uses existing record retrieval, not world-index parser internals. Reuse the existing response envelope.
4. FOUNDATIONS §Story Bundles scene-coverage (unscened runs are derived, non-authoritative): the suggested range label is an orientation hint, not a scene-boundary commitment — surfacing it must not imply the engine has decided a scene boundary. Aligns with the scene layer's "must not become a narrative-shape engine" discipline; this route reports present coverage gaps, it does not prescribe scene structure.

## Architecture Check

1. A thin read module that enriches 001's `unscened_runs` with per-range derived summaries keeps the "where is scene planning still needed?" question answerable from one endpoint, reusing the coverage view rather than re-scanning committed PGs for SCN membership. The route handler stays thin.
2. No backwards-compatibility shims: net-new route; no aliasing of any page-first surface.

## Verification Layers

1. Unscened runs match the coverage view → route dry-run: `GET /unscened-ranges?branchId=BR-N` returns ranges whose `pg_ids` equal the fixture's uncovered committed-PG runs (no active-SCN PGs included).
2. Per-range enrichment present → route dry-run: each range carries start/end PG, count, final `ChoiceSurface`, `EventDeltaSummary`, active-record delta, validation status, and a suggested label.
3. Label is non-authoritative → manual review + grep-proof: the label field is documented/typed as a suggestion, and the module emits no scene-boundary decision or SCN write.
4. Envelope reuse (cross-package) → grep-proof: imports world-index only via 001's helper; returns the existing envelope.

## What to Change

### 1. Unscened read module

Create `tools/story-explorer/src/read/unscened.ts`: take `branchId`, pull `unscened_runs` from 001's coverage helper, and enrich each run with final `ChoiceSurface` (end-PG emitted choices), `EventDeltaSummary`, active-record delta summary, validation status, and a `suggestedRangeLabel` (a derived hint string). Emit no boundary verdict.

### 2. `UnscenedRange` view-model

Create `tools/story-explorer/src/view-models/unscened-range.ts`: `UnscenedRange` with `startPg`, `endPg`, `count`, `finalChoiceSurface: ChoiceSurface`, `eventDelta: EventDeltaSummary`, `activeRecordDelta`, `validationStatus`, `suggestedRangeLabel` (documented as a non-authoritative hint).

### 3. Route + registration

Create `tools/story-explorer/src/server/routes/unscened.ts` exporting `registerUnscenedRoutes(server, options)` for `GET /api/worlds/:slug/stories/:storySlug/unscened-ranges?branchId=BR-N`; wire into `http.ts` behind the read-only guard + envelope.

## Files to Touch

- `tools/story-explorer/src/read/unscened.ts` (new)
- `tools/story-explorer/src/view-models/unscened-range.ts` (new)
- `tools/story-explorer/src/server/routes/unscened.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the unscened-ranges route)

## Out of Scope

- Overview / timeline / scenes / x-ray routes (002, 003, 004, 006).
- Any automatic scene-boundary decision or SCN write (the label is a hint only).
- Triggering scene planning/rendering from the explorer (spec §2 Out of scope — stay read-only).
- Recomputing coverage from artifacts.

## Acceptance Criteria

### Tests That Must Pass

1. `GET /unscened-ranges?branchId=BR-N` returns ranges whose PGs are exactly the branch's uncovered committed-PG runs (active-SCN PGs excluded), each with start/end/count + final choice surface + event/active-record deltas + validation status + suggested label (route-injection test).
2. The suggested range label is present but the response contains no scene-boundary verdict and no SCN write occurs.
3. `cd tools/story-explorer && npm run test:backend` passes.

### Invariants

1. Unscened ranges derive from SPEC-95's `unscened_runs`; the route never decides a scene boundary.
2. Every response carries the existing `worldIndexStatus` + degraded-direct-read envelope.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/unscened-route.test.ts` — new; range-membership assertions, per-range enrichment presence, label-is-hint check, degraded-index path.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -n "registerUnscenedRoutes" tools/story-explorer/src/server/http.ts`
