# SPEC98STOEXPSCE-004: Branch-map frontend — BranchMapCanvas + scene-layer getBranchMap() + /branch-map route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer` web frontend: new `BranchMapCanvas` component + `/branch-map` route + scene-layer `getBranchMap()` client; replaces the page-focused `getBranchMap` and the page-centric `BranchMapNode`/`BranchMapEdge` frontend mirror interfaces. Read-only UI over the SPEC98STOEXPSCE-002 branch-map route; no backend or canon impact.
**Deps**: SPEC98STOEXPSCE-002

## Problem

SPEC-98 §2 item 4 (D4, branch-map portion) requires a `BranchMapCanvas` frontend surface: a single-layer scene-segment map rendered inside a focus-trapped drawer (WAI-ARIA APG), reusing the SPEC-97 shell, with the canvas library left to the implementer and used only inside the drawer (never a permanent dominant graph). The frontend `client.ts` currently exposes a **page-focused** `getBranchMap` (`web/src/api/client.ts:506`, `focus: string`, returns `EnvelopedResult<unknown>`) and page-centric **mirror** interfaces `BranchMapNode`/`BranchMapEdge` (`client.ts:146-160`, "Frontend mirrors of …branch-map-node.ts and branch-map-edge.ts"). This ticket replaces both with scene-layer equivalents and adds the `BranchMapCanvas` component + `/branch-map` route.

## Assumption Reassessment (2026-05-29)

1. `tools/story-explorer/web/src/api/client.ts` exposes a page-focused `getBranchMap(slug, storySlug, focus, depth=3): Promise<EnvelopedResult<unknown>>` at line 506 (confirmed via grep; zero other consumers — it is defined but unused) AND page-centric mirror interfaces `BranchMapNode` (line 147) / `BranchMapEdge` (line 160) at lines 146-160. `app.tsx` (`createBrowserRouter` / `routes: RouteObject[]`) has no `/branch-map` route. Route components live under `web/src/routes/*.tsx`; a11y/component tests as `*.a11y.test.tsx` / `*.test.tsx` (vitest).
2. Spec surface: SPEC-98 §2 item 3/4 + §7 criterion 4 — `BranchMapCanvas` renders single-layer scene segments (the SPEC98STOEXPSCE-002 `BranchMapGraph` node set: `scene` / `unscened_run` / `branch_split` / `choice_surface` / `terminal_marker`) inside a focus-trapped drawer (focus trap, Escape closes, focus returns), reusing the SPEC-97 shell; the canvas library is the implementer's choice, drawer-only, never a permanent dominant graph. The deferred dual-layer/focus-mode/toggle surface is out of scope (SPEC-98 §Out of scope).
3. Cross-artifact boundary under audit: the scene-layer `getBranchMap()` consumes the `GET .../branch-map?focus=SCN-N|PG-N|CHC-N|BR-N&depth=N` route + `BranchMapGraph` view-model contract delivered by SPEC98STOEXPSCE-002 (hence `Deps: 002`). `client.ts` and `app.tsx` are shared with SPEC98STOEXPSCE-003 (each adds its own function / route entry — mechanical, no Deps between 003 and 004).
4. (was template item 7 — rename/remove blast radius) Removed/replaced frontend symbols, grepped pipeline-wide (`tools/`, `.claude/skills/`, `docs/`, `specs/`): the page-focused `getBranchMap` (`client.ts:506`) — zero consumers beyond its own definition, so replacement is non-breaking; the page-centric mirror interfaces `BranchMapNode`/`BranchMapEdge` (`client.ts:146-160`) — these are the frontend half of the page-model the backend teardown (SPEC98STOEXPSCE-002) removes; they were under-enumerated in SPEC-98 §4 (which named only the backend view-models) and are routed here per the Step 2 (e) blast-radius spot-check (within-spec intent: the spec replaces the page-centric branch-map model wholesale). They must be replaced with scene-layer mirror types matching `BranchMapGraph`, not left dangling against deleted backend types.

## Architecture Check

1. `BranchMapCanvas` is a drawer-scoped, single-layer scene-segment renderer reusing SPEC-97's focus-trap/Escape/focus-return primitives — never a permanent dominant graph — and the scene-layer `getBranchMap()` follows the `fetchEnveloped` client pattern so the index-status envelope surfaces unchanged. Replacing the frontend mirror types in lockstep with the backend teardown keeps exactly one branch-map model across the stack.
2. No backwards-compatibility shim: the page-focused `getBranchMap` and page-centric mirror interfaces are replaced outright, not aliased to the scene-layer types.

## Verification Layers

1. Scene-layer `getBranchMap()` contract → vitest unit test asserting it issues `GET .../branch-map` with `focus`/`depth` and returns the enveloped `BranchMapGraph` scene-layer shape.
2. Page-centric mirror removal → codebase grep-proof: `client.ts` no longer declares the page-keyed `BranchMapNode`/`BranchMapEdge` (`pageId`/`fromPageId`), only scene-layer types.
3. Accessible drawer behavior → `BranchMapCanvas.a11y.test.tsx` asserting focus trap, Escape closes, focus returns (WAI-ARIA APG).
4. Single-layer scene rendering → `BranchMapCanvas.test.tsx` asserting `scene`/`unscened_run`/`branch_split`/`choice_surface`/`terminal_marker` nodes render and the canvas is drawer-scoped.

## What to Change

### 1. Scene-layer `getBranchMap()` + mirror-type replacement (`web/src/api/client.ts`)

Replace the page-focused `getBranchMap` at line 506 with a scene-layer version returning `Promise<EnvelopedResult<BranchMapGraph-scene-shape>>` (`focus` accepts `SCN-`/`PG-`/`CHC-`/`BR-`). Replace the page-centric `BranchMapNode`/`BranchMapEdge` mirror interfaces (lines 146-160) with scene-layer mirror types matching SPEC98STOEXPSCE-002's `BranchMapGraph` node/edge union (or import-mirror them per the established frontend-mirror comment convention).

### 2. `BranchMapCanvas` component (`web/src/components/BranchMapCanvas.tsx`)

Single-layer scene-segment renderer (scene / unscened-run compressed bars / branch-split / choice-surface / terminal nodes), drawer-hosted, focus-trapped, reusing the SPEC-97 shell. Canvas library is the implementer's choice, used only inside the drawer.

### 3. `/branch-map` route (`web/src/routes/branch-map.tsx` + `web/src/app.tsx`)

Add a `branch-map` route component hosting `BranchMapCanvas`, and register its entry in the `app.tsx` routes array (coordinate the array edit with SPEC98STOEXPSCE-003's `/search` entry — different array entries, mechanical).

## Files to Touch

- `tools/story-explorer/web/src/components/BranchMapCanvas.tsx` (new)
- `tools/story-explorer/web/src/components/BranchMapCanvas.a11y.test.tsx` (new)
- `tools/story-explorer/web/src/components/BranchMapCanvas.test.tsx` (new)
- `tools/story-explorer/web/src/routes/branch-map.tsx` (new)
- `tools/story-explorer/web/src/api/client.ts` (modify — replace `getBranchMap` + page-centric mirror interfaces; shared with SPEC98STOEXPSCE-003)
- `tools/story-explorer/web/src/app.tsx` (modify — add `/branch-map` route; shared with SPEC98STOEXPSCE-003)

## Out of Scope

- The branch-map backend route / read module / `BranchMapGraph` view-model / backend page-centric view-model removal → SPEC98STOEXPSCE-002.
- `SearchModal`, `search()` client, `/search` route → SPEC98STOEXPSCE-003.
- The deferred dual-layer (scene + PG tick) map, full focus-mode set, reader/causal toggle → SPEC-98 §Out of scope.
- Any backend or `_source/` change — this is a read-only UI ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — `BranchMapCanvas.a11y.test.tsx` (focus trap / Escape / focus return) and `BranchMapCanvas.test.tsx` (scene-layer node rendering, drawer-scoped) and the `getBranchMap()` client unit test pass.
2. `grep -n "pageId\|fromPageId" tools/story-explorer/web/src/api/client.ts` → zero matches in the branch-map mirror interfaces (page-centric mirror removed); `grep -n "branch-map" tools/story-explorer/web/src/app.tsx` → `/branch-map` route registered.
3. `cd tools/story-explorer && npm test` — full pipeline (backend + web) passes.

### Invariants

1. `BranchMapCanvas` is drawer-scoped, accessible (focus trap, Escape, focus return), single-layer — never a permanent dominant graph.
2. Exactly one branch-map model exists across the stack post-replacement: the scene-layer `BranchMapGraph` and its frontend mirror; no page-keyed (`pageId`/`fromPageId`) branch-map types remain.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/BranchMapCanvas.a11y.test.tsx` (new) — WAI-ARIA APG focus-trap/Escape/focus-return.
2. `tools/story-explorer/web/src/components/BranchMapCanvas.test.tsx` (new) — scene-layer node rendering, drawer-scoped canvas.
3. `tools/story-explorer/web/src/api/client.ts` (modify) — scene-layer `getBranchMap()` covered by a vitest unit assertion (in `client.test.ts` or the component test) for request shape + enveloped return.

### Commands

1. `cd tools/story-explorer/web && npm test` (targeted web vitest).
2. `cd tools/story-explorer && npm test` (full pipeline: backend `node --test` + web `vitest`).
3. `grep -n "pageId\|fromPageId" tools/story-explorer/web/src/api/client.ts` (page-centric-mirror-removal proof).
