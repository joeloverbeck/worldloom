# SPEC87STOEXPBAC-009: Search + branch-map route sketches

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer/src/server/routes/search.ts` + `branch-map.ts` (stubs) + `src/view-models/branch-map-node.ts` + `branch-map-edge.ts` (types).
**Deps**: archive/tickets/SPEC87STOEXPBAC-007.md

## Problem

SPEC-87 §5 lists the search and branch-map endpoints as sketch-only placeholders that SPEC-90 will fully implement. This ticket lands the route file stubs with sketch-only handler bodies (returning structured "not yet implemented; full implementation in SPEC-90" envelope responses) plus the BranchMapNode / BranchMapEdge type definitions that SPEC-87 §4 declares as type-only deliverables here. Landing the stubs in SPEC-87's scope keeps the HTTP API surface complete (every endpoint per §5 is registered) so SPEC-88's frontend can wire UI affordances (the Branch Map button, the page-search modal) without depending on SPEC-90 having shipped.

## Assumption Reassessment (2026-05-25)

1. SPEC-90 is the spec that fully implements search + branch-map; this ticket's stubs are the placeholders that SPEC-90 replaces. SPEC-87 §5 explicitly names them as sketch-only with the qualifier "full impl SPEC-90". Brainstorm-verified + reassess-verified that the SPEC-90 spec file exists at `specs/SPEC-90-story-explorer-branch-map-and-search.md` and describes the full implementation contract.
2. SPEC-87 §4 declares `BranchMapNode` and `BranchMapEdge` as type-only deliverables (the renderer lives in SPEC-90). This ticket creates the type files; SPEC-90 will consume them when implementing the actual route handlers.
3. Cross-skill boundary: this ticket creates a forward-compat contract for SPEC-90. The stub endpoint paths + the BranchMapNode/BranchMapEdge type shapes form the contract; SPEC-90's implementation must conform to the type shapes (or amend them via a separate SPEC-87 amendment if SPEC-90 surfaces a type-shape gap during implementation). The boundary is unidirectional: this ticket establishes the contract; SPEC-90 implements against it.

## Architecture Check

1. Sketch routes return structured "not yet implemented" envelope responses (with `kind: 'not_implemented', message: "Full implementation lands in SPEC-90"`) rather than 404s — this lets SPEC-88's frontend distinguish "endpoint not registered" (a real backend bug) from "endpoint sketch-only" (expected during the SPEC-87→SPEC-90 implementation gap). The type-only BranchMapNode/BranchMapEdge files are forward-compat infrastructure for SPEC-90.
2. No backwards-compatibility shims; the stubs are the first version of these endpoints.

## Verification Layers

1. Sketch routes registered → vitest test (issues `GET /api/.../search?q=foo`; asserts response contains the structured "not_implemented" envelope; same for `/branch-map`)
2. Type definitions match SPEC-87 §4 shape → tsc type-check (BranchMapNode + BranchMapEdge fields match `pageId`, `branchId`, `turnIndex`, `label`, `hasProse`, `isCurrent`, `isLeaf`, `isTerminal`, `eventKind`, `outcomeRoute` for nodes; `fromPageId`, `toPageId`, `choiceId`, `choiceLabel`, `variantLabel`, `branchId` for edges)
3. Cross-skill SPEC-90 forward-compat contract → codebase grep-proof (`grep -E "(search|branch-map)" specs/SPEC-90-story-explorer-branch-map-and-search.md` returns matches naming both endpoint paths; the SPEC-90 spec § HTTP backend specifications align with these stub paths)

## What to Change

### 1. Implement BranchMapNode + BranchMapEdge types

- `tools/story-explorer/src/view-models/branch-map-node.ts` — exports `BranchMapNode` per SPEC-87 §4 (`pageId`, `branchId`, `turnIndex`, `label`, `hasProse`, `isCurrent`, `isLeaf`, `isTerminal`, `eventKind`, `outcomeRoute`).
- `tools/story-explorer/src/view-models/branch-map-edge.ts` — exports `BranchMapEdge` per SPEC-87 §4 (`fromPageId`, `toPageId`, `choiceId`, `choiceLabel`, `variantLabel`, `branchId`).

### 2. Implement sketch route handlers

- `tools/story-explorer/src/server/routes/search.ts` — exports `registerSearchRoute(server)`. Mounts `GET /api/worlds/:slug/stories/:storySlug/search?q=<text>&kinds=<csv>&limit=<n>&offset=<n>` returning structured envelope `{ _envelope: {...}, kind: 'not_implemented', message: "Search endpoint is a sketch-only placeholder; full implementation lands in SPEC-90.", spec: 'SPEC-90' }`. Validates query params per the SPEC-87 §5 row (q required; kinds CSV; limit/offset numeric) so SPEC-90's implementation can land on the same validation surface.
- `tools/story-explorer/src/server/routes/branch-map.ts` — exports `registerBranchMapRoute(server)`. Mounts `GET /api/worlds/:slug/stories/:storySlug/branch-map?focus=:pageId&depth=:n` returning the same not-implemented envelope. Validates query params (focus required; depth default 3, max 10) so SPEC-90's implementation can land on the same validation surface.

### 3. Register stub routes in HTTP server

- `tools/story-explorer/src/server/http.ts` (modify — extends ticket 007 + ticket 008) — calls `registerSearchRoute` and `registerBranchMapRoute` after the page/record/prose/provenance routes.

### 4. Tests

- `tools/story-explorer/test/sketch-routes.test.ts` — asserts both endpoints register, return the "not_implemented" envelope, and validate their query params per the SPEC-87 §5 contract (so SPEC-90's implementation isn't blocked on rewiring the validation surface).

## Files to Touch

- `tools/story-explorer/src/view-models/branch-map-node.ts` (new)
- `tools/story-explorer/src/view-models/branch-map-edge.ts` (new)
- `tools/story-explorer/src/server/routes/search.ts` (new)
- `tools/story-explorer/src/server/routes/branch-map.ts` (new)
- `tools/story-explorer/src/server/http.ts` (modify)
- `tools/story-explorer/test/sketch-routes.test.ts` (new)

## Out of Scope

- Full search implementation (SPEC-90)
- Full branch-map implementation (SPEC-90)
- Frontend rendering of search results or branch-map (SPEC-90)
- Capstone integration test (ticket 010)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test -- sketch-routes` — both endpoints return the structured "not_implemented" envelope with the SPEC-90 forward reference.
2. Query-param validation rejects malformed requests (missing `q` for search; missing `focus` for branch-map) with structured envelope errors.

### Invariants

1. The HTTP API surface is complete per SPEC-87 §5: every endpoint listed in the table is registered (real implementation in tickets 007-008, sketches here).
2. Sketch endpoints MUST signal "not_implemented" with a SPEC-90 forward reference rather than returning 404 — the distinction is load-bearing for SPEC-88's frontend (404 = backend bug; "not_implemented" = expected pre-SPEC-90 state).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/sketch-routes.test.ts` — sketch route smoke + query-param validation.

### Commands

1. `cd tools/story-explorer && npm test -- sketch-routes` (targeted)
2. `cd tools/story-explorer && npm test` (full-pipeline)
