# SPEC50STPSTECHC-007: World-index edge-parity test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` test surface only (no production code).
**Deps**: archive/tickets/SPEC50STPSTECHC-005.md, archive/tickets/SPEC50STPSTECHC-006.md

## Problem

The world-index extraction drift this spec corrects (the `trigger_predicates` field-name bug; the missing CHC/SLT/PG/SE exploitation edges) shares a root failure mode: a structured reference field can silently go un-indexed without any test asserting an edge is produced for it. Without a parity test enumerating every structured reference field and asserting it yields an edge, future schema fields can repeat the silent-omission pattern.

## Assumption Reassessment (2026-05-20)

1. Codebase: the new edge functions landed in `tools/world-index/src/parse/atomic.ts` via `archive/tickets/SPEC50STPSTECHC-005.md` (choice + storylet) and `archive/tickets/SPEC50STPSTECHC-006.md` (page + event); this ticket asserts parity over those edge surfaces plus the pre-existing STPLAN/STEMO edges. Verified the dependency tickets' closeout and the live parser/registry this session.
2. Specs/contract: SPEC-50 §C.5.
3. Cross-artifact boundary: the parity test references every structured reference field across CHC / SLT / PG / SE / STPLAN / STEMO that SPEC-50 C-series and the existing STPLAN/STEMO extraction surface rely on, then confirms each emitted edge type is registered in `STORY_EDGE_TYPES`. It is the guard against future un-indexed fields in this story-edge seam.
4. Package proof baseline: `tools/world-index/package.json` defines `build` as `tsc -p tsconfig.json` and `test` as `node --test "dist/tests/**/*.test.js"`, so the truthful lane is package-root `npm run build` followed by compiled-output tests. Existing ignored package artifacts `tools/world-index/dist/` and `tools/world-index/node_modules/` were present before this ticket.

## Architecture Check

1. A single parity test is the cheapest structural guard against the silent-omission failure mode that produced both the SPEC-49 `trigger_predicates` drift and the missing exploitation edges; the alternative (relying on per-field ad-hoc tests) is exactly what let the drift through.
2. No production code — test-only; no shim.

## Verification Layers

1. Every structured reference field enumerated in §A/§B/§C produces an edge -> parity test (the test IS the proof surface).
2. Single-layer ticket: this is a test-only ticket; the parity assertion is itself the verification, so no additional layer mapping applies.

## Landed Changes

### 1. Edge-parity test (C.5)

Added a parser parity test that enumerates the CHC / SLT / PG / SE / STPLAN / STEMO structured-reference fields covered by this seam, asserts each fixture emits exactly its expected edge-type set, and asserts every emitted edge type remains registered in `STORY_EDGE_TYPES`.

## Files to Touch

- `tools/world-index/tests/` edge-parity test (new)

## Out of Scope

- The edge-extraction implementations themselves (`archive/tickets/SPEC50STPSTECHC-005.md`, `archive/tickets/SPEC50STPSTECHC-006.md`).
- Any production parser change.

## Acceptance Criteria

### Tests That Must Pass

1. The parity test passes against the post-005/006 parser, asserting an edge for every structured reference field in the CHC / SLT / PG / SE / STPLAN / STEMO parity seam.
2. The parity test compares exact emitted edge-type sets per record and validates every emitted edge type against `STORY_EDGE_TYPES`, so a missing extractor or missing registry entry fails the test.
3. `npm test` in `tools/world-index` green.

### Invariants

1. Every structured reference field in a story-bundle record schema maps to exactly one edge type in the parser.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts` — edge-parity test enumerating CHC / SLT / PG / SE / STPLAN / STEMO structured-reference fields and registry membership.

### Commands

1. `npm run build` in `tools/world-index`
2. `node --test dist/tests/parse/atomic-story-edge-parity.test.js` in `tools/world-index`
3. `npm test` in `tools/world-index`

## Outcome

Completed: 2026-05-20

- Added `tools/world-index/tests/parse/atomic-story-edge-parity.test.ts`.
- The test builds one fixture per CHC / SLT / PG / SE / STPLAN / STEMO record surface, asserts exact edge-type emission for each, and verifies emitted edge types are registered in `STORY_EDGE_TYPES`.
- No production parser or registry code changed.

## Verification Result

- `npm run build` in `tools/world-index` — PASS.
- `node --test dist/tests/parse/atomic-story-edge-parity.test.js` in `tools/world-index` — PASS, 1 test.
- `npm test` in `tools/world-index` — PASS, 124 tests.

## Deviations

- The ticket's drafted "deliberately-omitted edge (test-local mutation)" criterion was satisfied by the exact set comparison plus registry-membership assertion in the committed test, not by committing a mutation harness. A local mutation is not checked in.
