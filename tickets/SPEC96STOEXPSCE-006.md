# SPEC96STOEXPSCE-006: State-tick x-ray route — PG inspection surface

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `@worldloom/story-explorer` backend: new `GET /api/worlds/:slug/stories/:storySlug/state-ticks/:pgId/xray` route + `read/state-tick-xray.ts` + `StateTickXray` view-model + registration in `http.ts`. Read-only.
**Deps**: archive/tickets/SPEC96STOEXPSCE-001.md

## Problem

SPEC-96 §2.5 (D5): PG inspection remains essential, but PGs must stop being reader pages. The state-tick x-ray returns the full PG inspection payload (parent PG, branch path, turn index, input mode, resolved SE, state hash + parent hash, state-snapshot summary, active records by class, visible affordances, unresolved mystery claims, continuation status, emitted choices, validation trace, raw PG YAML, event delta, created/superseded/closed records, link to containing SCN or unscened range) as an explicitly technical surface — NOT a reader-page route. This is where the old `getPageDetail` inspection data lands in the scene-first model, reframed as an x-ray drawer reached from timeline focus.

## Assumption Reassessment (2026-05-29)

1. The PG inspection data the x-ray surfaces (parent PG, branch path, turn index, input mode, resolved SE, state hashes, state-snapshot summary, active records by class, affordances, unresolved mystery claims, continuation status, emitted choices, validation trace, raw YAML, event delta, created/superseded/closed records) is the same surface the deleted `getPageDetail` assembled — sourced from the committed PG/SE records + raw-YAML reads, NOT from page-prose. `EventDeltaSummary` (from 001) types the event-delta field; 001's coverage helper supplies the "link to containing SCN or unscened range" via `pg_scene_lookup` + `unscened_runs`. Verified against the PG schema + `tools/world-index/src/index/scene-coverage.ts` during reassessment.
2. SPEC-96 §2.5 enumerates the StateTickXray field set (matching report §9 nearly field-for-field) and is explicit that it is a "Technical x-ray surface, explicitly NOT a reader-page route." Implement it as `/state-ticks/:pgId/xray`, documented/typed as technical; do not add a `/pages/:pageId`-shaped reader route.
3. Cross-package boundary under audit: SCN/unscened linkage comes via 001's helper; PG/SE record + raw-YAML reads use existing retrieval/raw-read read-layer helpers. Reuse the existing response envelope. State hash + parent hash are surfaced as informational PG fields (read from `PG.state_snapshot`), NOT recomputed and NOT used to derive any publication/freshness state (SPEC-94/95 decoupling).
4. FOUNDATIONS Rule 7 (Preserve Mystery Deliberately): the x-ray surfaces `unresolved_mystery_claims` from `PG.state_snapshot` as read-only display. It must render only what the PG records — it must never resolve, narrow, or alter a Mystery Reserve entry, and a forbidden-status `M` is never surfaced as resolved. The x-ray is a read surface; it has no state-transition authority.

## Architecture Check

1. A dedicated x-ray read module assembles the PG inspection payload from committed records + raw YAML + 001's SCN/unscened linkage, giving the frontend one technical drawer reachable from `?focus=PG-N` rather than a reader-page route. This preserves the "PG = causal tick, not a reader page" model (§4a) while keeping all inspection data available.
2. No backwards-compatibility shims: the x-ray is net-new and does not alias the removed `/pages/:pageId` route; it is a `/state-ticks/:pgId/xray` technical surface, not a reader page.

## Verification Layers

1. Full inspection payload → route dry-run: `GET /state-ticks/:pgId/xray` returns every §2.5 field (parent PG, branch path, turn index, input mode, resolved SE, state+parent hash, snapshot summary, active records by class, affordances, unresolved mystery claims, continuation status, emitted choices, validation trace, raw PG YAML, event delta, created/superseded/closed records, SCN/unscened link) against a fixture.
2. Technical-surface, not reader route → grep-proof + manual review: the route shape is `/state-ticks/:pgId/xray`; no `/pages/:pageId` reader route is introduced; the view-model/route is documented as technical.
3. Mystery firewall (read-only) → FOUNDATIONS check + manual review: `unresolved_mystery_claims` is surfaced verbatim from `PG.state_snapshot`; no resolution/narrowing occurs; no write path exists in the module.
4. Hashes are informational only → grep-proof: state/parent hash are read from `PG.state_snapshot`, not recomputed and not feeding any publication/freshness derivation.

## What to Change

### 1. X-ray read module

Create `tools/story-explorer/src/read/state-tick-xray.ts`: assemble the full PG inspection payload from the committed `PG` record (parent PG, branch path, turn index, input mode, state+parent hash, state-snapshot summary, active records by class, affordances, unresolved mystery claims, continuation status, emitted choices, validation trace), the resolved `SE` + event delta (`EventDeltaSummary`), created/superseded/closed records, raw PG YAML (via existing raw-read helper), and the containing SCN / unscened-range link (via 001's coverage helper).

### 2. `StateTickXray` view-model

Create `tools/story-explorer/src/view-models/state-tick-xray.ts`: `StateTickXray` with all §2.5 fields, documented as a technical inspection surface.

### 3. Route + registration

Create `tools/story-explorer/src/server/routes/state-tick-xray.ts` exporting `registerStateTickXrayRoutes(server, options)` for `GET /api/worlds/:slug/stories/:storySlug/state-ticks/:pgId/xray`; wire into `http.ts` behind the read-only guard + envelope.

## Files to Touch

- `tools/story-explorer/src/read/state-tick-xray.ts` (new)
- `tools/story-explorer/src/view-models/state-tick-xray.ts` (new)
- `tools/story-explorer/src/server/routes/state-tick-xray.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify — register the state-tick-xray route)

## Out of Scope

- Overview / timeline / scenes / unscened routes (002, 003, 004, 005).
- Any `/pages/:pageId`-shaped reader route (forbidden — this is a technical surface).
- Recomputing state hashes or deriving publication/freshness from them.
- Any write to PG/SE/SCN or resolution of a Mystery Reserve entry.

## Acceptance Criteria

### Tests That Must Pass

1. `GET /state-ticks/:pgId/xray` returns the full PG inspection payload including the link to the containing SCN or unscened range, against a seeded fixture (route-injection test).
2. The route is `/state-ticks/:pgId/xray` (technical); no `/pages/:pageId` reader route exists; `unresolved_mystery_claims` is surfaced read-only with no resolution.
3. `cd tools/story-explorer && npm run test:backend` passes.

### Invariants

1. The x-ray is read-only — it never writes PG/SE/SCN and never resolves/narrows a Mystery Reserve entry (Rule 7).
2. State/parent hashes are informational PG fields; they never derive publication or freshness state.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/state-tick-xray-route.test.ts` — new; full-payload completeness, SCN/unscened-link resolution, read-only mystery-claim surfacing, degraded-index path.

### Commands

1. `cd tools/story-explorer && npm run test:backend`
2. `grep -n "registerStateTickXrayRoutes" tools/story-explorer/src/server/http.ts`
