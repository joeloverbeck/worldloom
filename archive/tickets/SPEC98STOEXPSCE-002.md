# SPEC98STOEXPSCE-002: Branch-map backend (MVP single-layer scene map) + page-model teardown

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer` backend: real `branch-map` route + new `src/read/branch-map.ts` read module + new scene-layer `BranchMapGraph` view-model; removes the page-centric `branch-map-node.ts` / `branch-map-edge.ts` view-models, deletes `sketch-routes.test.ts`, replaces the SPEC-90 `not_implemented` branch-map placeholder. Read-only; no impact on the patch engine, validators, or canon write paths.
**Deps**: None

## Problem

`GET /api/worlds/:slug/stories/:storySlug/branch-map` currently returns `{ kind: "not_implemented", spec: "SPEC-90" }` (`tools/story-explorer/src/server/routes/branch-map.ts:42-45`), and the backend ships page-centric SPEC-87/SPEC-90-era branch-map view-models (`src/view-models/branch-map-node.ts` keyed on `pageId`/`turnIndex`/`hasProse`; `branch-map-edge.ts` keyed on `fromPageId`/`toPageId`) plus a sketch test that pins them (`test/sketch-routes.test.ts`). SPEC-98 replaces the page-centric model with an **MVP single-layer scene map**; this ticket implements the real branch-map backend (SPEC-98 §2 item 3; D3) and performs the page-model teardown (SPEC-98 §2 item 1; D1 branch-map/view-model/test portion).

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/src/server/routes/branch-map.ts` exists and returns the `not_implemented` placeholder (lines 42-45); its querystring parses `focus` (required) and `depth` (default 3, max 10, via `parseDepth`). SPEC-98 §2 item 3 widens `focus` to `SCN-N|PG-N|CHC-N|BR-N`. The page-centric view-models exist at `src/view-models/branch-map-node.ts` and `branch-map-edge.ts` and are consumed only by `test/sketch-routes.test.ts:8-9,19,31` (type-only import + a "view-model types expose the SPEC-87 type-only fields" test) — confirmed via pipeline-wide grep; there is no `src/view-models/index.ts` barrel re-exporting them. The read layer uses `openExistingIndex` from `@worldloom/world-index/index/open` (the `src/read/scene-coverage.ts` pattern).
2. Spec surface: SPEC-98 §2 item 3 enumerates the scene-layer node set (`scene`, `unscened_run` [compressed bar "PG-14..PG-18 · 5 ticks · no SCN · final choices: 4"], `branch_split`, `choice_surface`, `terminal_marker`), focus + depth bounding, and sibling-branch visibility (scenes are branch-local — do NOT force cross-branch scene segmentation). SPEC-98 §2/§3 explicitly **defers** the expandable PG/tick layer, the full focus-mode set (ancestors/descendants/sibling-outcomes), and the reader-vs-causal toggle (confirmed MVP-only; §8 risk).
3. Cross-artifact boundary under audit: (a) the scene-layer graph model — the new `BranchMapGraph` view-model introduces scene-layer node/edge types that **replace** the page-centric `BranchMapNode`/`BranchMapEdge`; and (b) the **frontend mirror** of those page-centric types at `tools/story-explorer/web/src/api/client.ts:146-160` ("Frontend mirrors of …branch-map-node.ts and branch-map-edge.ts"), which SPEC98STOEXPSCE-004 must replace with scene-layer equivalents — the backend removal here and the frontend mirror replacement there are paired. SPEC-95 scene coverage (`src/read/scene-coverage.ts`) supplies scene-to-PG membership and unscened-run computation.
4. FOUNDATIONS principle under audit — §Tooling Recommendation (machine-facing honesty) + Rule 7: per SPEC-98 §5, branch-map is read-only; scenes are branch-local (no forced cross-branch segmentation, preserving the `SCN` branch-local render-unit contract per SPEC-92), the response carries the index-status envelope and degrades rather than fabricates under a stale index, and no forbidden-status `M` is surfaced as resolved. Read-only mediator (SPEC-87 fence preserved); no canon write path, no MR resolution.
5. (was template item 7 — rename/remove blast radius) Removed/replaced symbols, grepped pipeline-wide (`tools/`, `.claude/skills/`, `docs/`, `specs/`): backend `BranchMapNode`/`BranchMapEdge` (`src/view-models/branch-map-node.ts`, `branch-map-edge.ts`) — consumers: `test/sketch-routes.test.ts` only (deleted wholesale here, since its entire content is the two SPEC-90 sketch-route tests + the page-view-model type test, all obsoleted by this spec; deleting it also clears SPEC98STOEXPSCE-001's old search sketch test — cross-ref 001). The frontend mirror types in `web/src/api/client.ts` are handled by SPEC98STOEXPSCE-004 (Deps relationship: 004 → 002). No `world-index`/`docs`/`specs` consumers of the page-centric types exist.

## Architecture Check

1. The MVP single-layer model ships the load-bearing branch-map surface (scene/unscened/split/choice/terminal nodes) without the deferred dual-layer/focus-mode machinery — YAGNI per SPEC-98 §5 — and the scene-layer `BranchMapGraph` is built on SPEC-95 scene coverage rather than on PG-page traversal, matching the segment-model architecture SPEC-96 established. Removing the page-centric view-models prevents two contradictory branch-map models from coexisting.
2. No backwards-compatibility shim: the `not_implemented` body is replaced outright; the page-centric view-models are deleted, not aliased to the new scene-layer types; `sketch-routes.test.ts` is deleted rather than partially salvaged.

## Verification Layers

1. Scene-layer node coverage → `node --test` route test (`test/branch-map-route.test.ts`) asserting `scene` / `unscened_run` / `branch_split` / `choice_surface` / `terminal_marker` nodes are returned for the scene-first fixture, with the compressed-bar shape for unscened runs.
2. Focus + depth + sibling-branch visibility → route test asserting `focus=SCN-N|PG-N|CHC-N|BR-N` and `depth` bound the returned graph and that sibling branches appear without forced cross-branch segmentation.
3. Page-model teardown → codebase grep-proof: `branch-map-node.ts`/`branch-map-edge.ts` absent, `sketch-routes.test.ts` absent, zero remaining backend references to the page-centric `BranchMapNode`/`BranchMapEdge`.
4. Machine-facing honesty (stale index) → route test asserting the index-status envelope is present and the graph degrades rather than fabricates under a stale index.

## What to Change

### 1. Real branch-map read module (`src/read/branch-map.ts`)

Compute the scene-layer graph from SPEC-95 scene coverage: `scene` nodes (active SCN ranges), `unscened_run` nodes (compressed bars over no-SCN PG runs with tick count + final-choice count), `branch_split` nodes (at fork points), `choice_surface` nodes (end-page choice surfaces), `terminal_marker` nodes (leaf pages). Bound by `focus` (resolve `SCN-N`/`PG-N`/`CHC-N`/`BR-N` to a graph anchor) and `depth`. Include sibling branches without forcing cross-branch scene segmentation. Return the index-status envelope.

### 2. `BranchMapGraph` scene-layer view-model (`src/view-models/branch-map-graph.ts`)

Define the scene-layer node union (`scene` | `unscened_run` | `branch_split` | `choice_surface` | `terminal_marker`) and the scene-layer edge type, plus the `BranchMapGraph` container (nodes + edges + focus/depth metadata + envelope). These replace the page-centric `BranchMapNode`/`BranchMapEdge`.

### 3. Real `branch-map` route (`src/server/routes/branch-map.ts`)

Replace the `not_implemented` body (lines 42-50) with a call into `src/read/branch-map.ts`. Widen `focus` parsing to accept `SCN-`/`PG-`/`CHC-`/`BR-` prefixes; preserve the existing `depth` validation (default 3, `0`–`10`) and the `400` on missing `focus`.

### 4. Page-model teardown

Delete `src/view-models/branch-map-node.ts` and `src/view-models/branch-map-edge.ts`. Delete `test/sketch-routes.test.ts` wholesale (its content — both SPEC-90 sketch-route tests + the page-view-model type test — is fully obsoleted; this also removes SPEC98STOEXPSCE-001's old search sketch test). Update `test/capstone-smoke.test.ts` (lines 232-234): the branch-map smoke assertion currently expects `data.spec === "SPEC-90"`; change it to assert the real scene-layer branch-map shape. (Coordinate the `capstone-smoke.test.ts` edit with SPEC98STOEXPSCE-001, which edits the search assertion block in the same file.)

## Files to Touch

- `tools/story-explorer/src/server/routes/branch-map.ts` (modify)
- `tools/story-explorer/src/read/branch-map.ts` (new)
- `tools/story-explorer/src/view-models/branch-map-graph.ts` (new)
- `tools/story-explorer/src/view-models/branch-map-node.ts` (delete)
- `tools/story-explorer/src/view-models/branch-map-edge.ts` (delete)
- `tools/story-explorer/test/sketch-routes.test.ts` (delete)
- `tools/story-explorer/test/branch-map-route.test.ts` (new)
- `tools/story-explorer/test/capstone-smoke.test.ts` (modify — branch-map assertion only; shared with SPEC98STOEXPSCE-001)

## Out of Scope

- The search route, search read module, `SearchHit` view-model → SPEC98STOEXPSCE-001.
- All frontend work (`BranchMapCanvas`, scene-layer `getBranchMap()` client, frontend mirror-type replacement, `/branch-map` route) → SPEC98STOEXPSCE-004.
- The deferred dual-layer (scene + PG tick) map, full focus-mode set, and reader/causal toggle → SPEC-98 §Out of scope (deferred follow-up).
- Backend segment model / scene-coverage layer → SPEC-96 / SPEC-95 (consumed, not built here).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm run test:backend` — `test/branch-map-route.test.ts` passes: scene-layer nodes returned with compressed unscened-run bars; `focus`/`depth` bound the graph; sibling branches visible without forced cross-branch segmentation.
2. `grep -n "not_implemented" tools/story-explorer/src/server/routes/branch-map.ts` → zero matches; `test -f tools/story-explorer/src/view-models/branch-map-node.ts` and `…/branch-map-edge.ts` and `…/test/sketch-routes.test.ts` → all absent.
3. `cd tools/story-explorer && npm test` — full backend + web suite passes.

### Invariants

1. Branch-map is read-only and branch-local: scenes are not cross-branch-segmented; the index-status envelope is always present; no MR resolution.
2. Exactly one branch-map model exists post-teardown: the scene-layer `BranchMapGraph`; the page-centric `BranchMapNode`/`BranchMapEdge` are gone from the backend (frontend mirror handled by SPEC98STOEXPSCE-004).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/branch-map-route.test.ts` (new) — scene-layer node coverage, focus/depth bounding, sibling-branch visibility, stale-index honesty against the scene-first fixture.
2. `tools/story-explorer/test/sketch-routes.test.ts` (delete) — obsolete SPEC-90 sketch + page-view-model type tests removed.
3. `tools/story-explorer/test/capstone-smoke.test.ts` (modify) — branch-map smoke assertion flipped from `not_implemented`/`SPEC-90` to real scene-layer shape.

### Commands

1. `cd tools/story-explorer && npm run test:backend` (targeted backend `node --test`).
2. `cd tools/story-explorer && npm test` (full pipeline: backend `node --test` + web `vitest`).
3. `grep -rn "BranchMapNode\|BranchMapEdge" tools/story-explorer/src` (page-centric-removal proof — should match only the new `branch-map-graph.ts` scene-layer types if reused names, else zero).
