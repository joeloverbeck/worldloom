# SPEC50STPSTECHC-007: World-index edge-parity test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-index` test surface only (no production code).
**Deps**: SPEC50STPSTECHC-005, SPEC50STPSTECHC-006

## Problem

The world-index extraction drift this spec corrects (the `trigger_predicates` field-name bug; the missing CHC/SLT/PG/SE exploitation edges) shares a root failure mode: a structured reference field can silently go un-indexed without any test asserting an edge is produced for it. Without a parity test enumerating every structured reference field and asserting it yields an edge, future schema fields can repeat the silent-omission pattern.

## Assumption Reassessment (2026-05-19)

1. Codebase: the new edge functions land in `tools/world-index/src/parse/atomic.ts` via SPEC50STPSTECHC-005 (choice + storylet) and SPEC50STPSTECHC-006 (page + event); this ticket asserts parity over all of them plus the pre-existing STPLAN/STEMO edges. Verified the dependency tickets' scope this session.
2. Specs/contract: SPEC-50 §C.5.
3. Cross-artifact boundary: the parity test references every structured reference field across CHC / SLT / PG / SE / STPLAN / STEMO and the edge-type registry; it is the guard against future un-indexed fields.

## Architecture Check

1. A single parity test is the cheapest structural guard against the silent-omission failure mode that produced both the SPEC-49 `trigger_predicates` drift and the missing exploitation edges; the alternative (relying on per-field ad-hoc tests) is exactly what let the drift through.
2. No production code — test-only; no shim.

## Verification Layers

1. Every structured reference field enumerated in §A/§B/§C produces an edge -> parity test (the test IS the proof surface).
2. Single-layer ticket: this is a test-only ticket; the parity assertion is itself the verification, so no additional layer mapping applies.

## What to Change

### 1. Edge-parity test (C.5)

Add a parser test that enumerates every structured reference field across the new and existing story-bundle edge surfaces and asserts each produces its expected edge type. A new structured field added without a corresponding edge fails this test.

## Files to Touch

- `tools/world-index/tests/` edge-parity test (new)

## Out of Scope

- The edge-extraction implementations themselves (SPEC50STPSTECHC-005, SPEC50STPSTECHC-006).
- Any production parser change.

## Acceptance Criteria

### Tests That Must Pass

1. The parity test passes against the post-005/006 parser, asserting an edge for every structured reference field.
2. A deliberately-omitted edge (test-local mutation) fails the parity test (proves it has teeth).
3. `npm test --prefix tools/world-index` green.

### Invariants

1. Every structured reference field in a story-bundle record schema maps to exactly one edge type in the parser.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/` — edge-parity test enumerating all structured reference fields.

### Commands

1. `npm run build --prefix tools/world-index`
2. `npm test --prefix tools/world-index`
