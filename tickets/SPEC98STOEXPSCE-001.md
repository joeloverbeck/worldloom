# SPEC98STOEXPSCE-001: Search backend — FTS-backed, container-grouped scene/unscened search

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer` backend: real `search` route + new `src/read/search.ts` read module + new `SearchHit` view-model; replaces the SPEC-90 `not_implemented` search placeholder. Read-only; no impact on the patch engine, validators, or canon write paths.
**Deps**: None

## Problem

`GET /api/worlds/:slug/stories/:storySlug/search` currently returns `{ kind: "not_implemented", spec: "SPEC-90" }` (`tools/story-explorer/src/server/routes/search.ts:58-61`). SPEC-90's page-centric search (page kinds, `pages-prose` scans, page-jump actions) is being removed; with the SPEC-96 segment model and SPEC-97 scene-first frontend in place, search must return **container-grouped** results over scenes / unscened ranges / state ticks — not pages. This ticket implements the real search backend (SPEC-98 §2 item 2; D2) and removes the search half of the SPEC-90 placeholder (SPEC-98 §2 item 1; D1 search portion).

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/src/server/routes/search.ts` exists and returns the `not_implemented` placeholder (lines 58-61); its querystring already parses `q` (required), `kinds`, `limit`, `offset` (`parseNonNegativeInteger`, `parseKinds`). SPEC-98 §2 adds `domains` and `groupBy=scene_or_unscened_range`. The read layer accesses the world index via `openExistingIndex` from `@worldloom/world-index/index/open` + `better-sqlite3` (the established pattern in `src/read/scene-coverage.ts`, `src/read/record-io.ts`); search reuses this open-index surface — no new package dependency, no reach into `world-index/src/parse/` internals (package-boundary preserved).
2. Spec surface: SPEC-98 §2 item 2 enumerates 11 result kinds (`scene` | `scene_prose` | `scene_plan` | `scene_receipt` | `unscened_range` | `state_tick` | `event` | `choice` | `record` | `validation` | `raw_source`) and 6 domains (prose text, plan text, receipt text, state YAML, metadata/id, validation/freshness), default grouping (containing scene → unscened range → branch-level orphan/technical), container reporting for raw-record hits, expandable-not-dumped raw bodies, and degrade-to-unscened/x-ray when no scene exists. SPEC-98 §8 flags that `fts_nodes` indexes `body`/`heading_path`/`summary` of indexed `nodes` (`tools/world-index/src/schema/migrations/001_initial.sql`) and that scene-prose / scene-plan / scene-receipt **body-text** FTS coverage is unverified — the implementer MUST confirm per-domain FTS coverage and fall back to a direct `src/read/`-layer artifact text scan for any domain `fts_nodes` does not index (SPEC-95 coverage already inventories scene artifacts).
3. Cross-artifact boundary under audit: the `fts_nodes` FTS5 virtual table contract (`tools/world-index/src/index/fts.ts`, migration `001_initial.sql` — columns `node_id` UNINDEXED, `body`, `heading_path`, `summary`) and the SPEC-95 scene-coverage read surface (`src/read/scene-coverage.ts`, re-exporting `SceneCoverageBranch`/`SceneCoverageScene` from `@worldloom/world-index/public/types`) used to roll hits up to their containing scene / unscened range. The `SearchHit` view-model is the new read-side output contract consumed by the frontend `search()` client (SPEC98STOEXPSCE-003).
4. FOUNDATIONS principle under audit — §Tooling Recommendation (machine-facing honesty) + Rule 7 (Preserve Mystery): per SPEC-98 §5, search is a read-only mediator over an already-fenced read-backend (the SPEC-87 four-layer fence); it MUST carry the index-status envelope and **degrade rather than fabricate** under a stale index, and MUST NOT surface a forbidden-status `M` Mystery Reserve entry as resolved. This is the read-only honesty angle of `reassess-spec`'s §3.9 extending-a-fenced-mediator carve-out — no canon write path, no MR resolution, no validator-threshold change.

## Architecture Check

1. Search composes the existing read surface (`openExistingIndex` + `fts_nodes` + SPEC-95 scene coverage) rather than introducing a parallel index — the world index is the single source of searchable nodes, and grouping is a read-time roll-up over scene coverage. This keeps the story-explorer backend a pure read mediator and preserves the `world-index` package boundary (consume public open-index + `public/types`; never reach into `parse/` internals).
2. No backwards-compatibility shim: the `not_implemented` placeholder body is replaced outright, not aliased. The new `SearchHit` view-model is greenfield; no page-kind fields are carried forward.

## Verification Layers

1. Result-kind + domain coverage → `node --test` route test (`test/search-route.test.ts`) asserting each named kind/domain returns container-grouped hits against the scene-first fixture.
2. Degrade-when-no-scene invariant → route test asserting search over an unscened-only fixture groups hits under unscened runs / PG x-ray contexts (no scene container required).
3. Machine-facing honesty (stale index) → route test asserting the response carries the index-status envelope and does not fabricate hits when the index is stale.
4. Raw-body-not-dumped invariant → route test asserting a `raw_source` hit reports its container ("inside SCN-N, PG-M state tick" / "inside unscened range PG-X..PG-Y") with the raw body expandable, not inlined at top level.

## What to Change

### 1. Real search read module (`src/read/search.ts`)

Open the world index via `openExistingIndex`; query `fts_nodes` for `q` across the requested `domains`; map each FTS hit to its result kind; roll hits up to their containing scene (via SPEC-95 scene coverage) or unscened range, falling back to branch-level orphan/technical grouping. For domains `fts_nodes` does not index (confirm scene-prose/plan/receipt body-text coverage first per §8), fall back to a direct artifact text scan over the SPEC-95-inventoried scene artifacts. Return the index-status envelope alongside results (degrade, don't fabricate, under a stale index).

### 2. `SearchHit` view-model (`src/view-models/search-hit.ts`)

Define the read-side output: result `kind` (the 11-value union), the matched `domain`, the container descriptor (containing scene / unscened range / branch-level), a short excerpt, and an `expandable` raw-body reference (not the inlined body). Group container is the top-level shape; raw record bodies are fetched on expand, never dumped.

### 3. Real `search` route (`src/server/routes/search.ts`)

Replace the `not_implemented` body (lines 58-69) with a call into `src/read/search.ts`. Extend the querystring parser to accept `domains` and `groupBy=scene_or_unscened_range` alongside the existing `q`/`kinds`/`limit`/`offset`. Preserve the existing `400` validation for missing `q` and malformed `limit`/`offset`.

### 4. Test cleanup (search portion of the SPEC-90 placeholder)

Update `test/capstone-smoke.test.ts` (lines 228-230): the search smoke assertion currently expects `data.kind === "not_implemented"`; change it to assert the real container-grouped search shape. (The `sketch-routes.test.ts` search sketch test is removed by SPEC98STOEXPSCE-002's wholesale deletion of that file — see its cross-reference; coordinate the `capstone-smoke.test.ts` edit with 002, which edits a different assertion block in the same file.)

## Files to Touch

- `tools/story-explorer/src/server/routes/search.ts` (modify)
- `tools/story-explorer/src/read/search.ts` (new)
- `tools/story-explorer/src/view-models/search-hit.ts` (new)
- `tools/story-explorer/test/search-route.test.ts` (new)
- `tools/story-explorer/test/capstone-smoke.test.ts` (modify — search assertion only; shared with SPEC98STOEXPSCE-002)

## Out of Scope

- The branch-map route, branch-map read module, `BranchMapGraph` view-model, and page-centric view-model removal → SPEC98STOEXPSCE-002.
- All frontend work (`SearchModal`, `search()` client, `/search` route) → SPEC98STOEXPSCE-003.
- Backend segment model / scene-coverage layer → SPEC-96 / SPEC-95 (consumed, not built here).
- Deleting `sketch-routes.test.ts` → SPEC98STOEXPSCE-002 (wholesale).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run test:backend` — `test/search-route.test.ts` passes: every named result kind + domain returns container-grouped hits; search over a no-scene fixture degrades to unscened/x-ray grouping; a `raw_source` hit reports its container and keeps the raw body expandable.
2. `grep -n "not_implemented" tools/story-explorer/src/server/routes/search.ts` → zero matches (placeholder removed).
3. `cd tools/story-explorer && npm test` — full backend + web suite passes.

### Invariants

1. Search is read-only: no write path into `_source/`, no MR resolution, index-status envelope always present; under a stale index the response degrades rather than fabricates.
2. The `world-index` package boundary holds: search consumes `@worldloom/world-index` public open-index + `public/types` only; no import from `world-index/src/parse/` internals.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/search-route.test.ts` (new) — exercises the result-kind/domain matrix, no-scene degrade path, stale-index honesty, and raw-body container reporting against the scene-first fixture.
2. `tools/story-explorer/test/capstone-smoke.test.ts` (modify) — search smoke assertion flipped from `not_implemented` to real container-grouped shape.

### Commands

1. `cd tools/story-explorer && npm run test:backend` (targeted backend `node --test`).
2. `cd tools/story-explorer && npm test` (full pipeline: backend `node --test` + web `vitest`).
3. `grep -rn "not_implemented" tools/story-explorer/src/server/routes/search.ts` (placeholder-removal proof).
