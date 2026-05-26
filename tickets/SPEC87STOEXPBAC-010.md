# SPEC87STOEXPBAC-010: Capstone integration smoke test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/test/capstone-smoke.test.ts` (end-to-end smoke test against `red-bunny` fixture).
**Deps**: archive/tickets/SPEC87STOEXPBAC-008.md, SPEC87STOEXPBAC-009

## Problem

SPEC-87 §9 specifies a manual smoke test in dev mode against the `worlds/erotica-world/stories/red-bunny/` bundle (one prose page, one plan, one receipt confirmed present per pre-spec audit). This ticket lands the automated equivalent: a vitest test that constructs the HTTP server from ticket 007, mounts all routes from tickets 007-009, issues representative requests against a fixture-isolated copy of red-bunny, and asserts every endpoint returns a well-formed response with the correct envelope, the correct shape per SPEC-87 §4 view models, and the correct discriminators for missing-prose / first-class states. This is the capstone that proves SPEC-87 ships a working backend.

## Assumption Reassessment (2026-05-25)

1. Tickets 001-009 have produced the full backend: package skeleton, fencing, IndexStatus, enumeration, page read path, record card data path, HTTP server with base routes, page/record/prose/provenance routes, and search/branch-map sketches. This ticket's smoke test exercises the composition through HTTP — the same path SPEC-88's frontend will hit.
2. The `worlds/erotica-world/stories/red-bunny/` fixture (brainstorm-verified existence; reassess-verified path) carries PG-1 with rendered prose, plan, receipt, plus STCHAR + STENT + a small set of supporting records. The smoke test uses this fixture as the canonical target (per SPEC-87 reassessment M5 fixture clarification) but copies it to a temp directory at test start (via `fs.cpSync` or equivalent) so the test never mutates the actual fixture or the canonical world.
3. Cross-skill boundary: the fixture isolation contract is the shared boundary under audit. The test MUST copy the fixture to a temp tree, run the server against the temp tree, and verify the canonical `worlds/erotica-world/` is untouched at test end (assertion: file hashes of canonical `_source/` records match pre-test snapshots). FOUNDATIONS §Canonical Storage Layer is the principle this protects: even a read-only backend test must not accidentally mutate canon. The Layer 3 fence from ticket 002 is the structural prevention; this ticket's hash-snapshot assertion is the runtime confirmation.

## Architecture Check

1. The capstone smoke test is end-to-end: HTTP server up, real fixture copy, all endpoints exercised. It complements the per-ticket unit tests (which mock or use minimal in-test fixtures) by proving the composition works against a real story bundle shape. Test isolation via temp-directory copy ensures repeatability and prevents canonical-fixture mutation under Layer 3 fence.
2. No backwards-compatibility shims; the smoke test is the first end-to-end verification.

## Verification Layers

1. Server bootstrap end-to-end → vitest test (constructs server via `createServer` from ticket 007; asserts server starts, all routes from 007/008/009 registered)
2. Every endpoint returns a well-formed envelope → vitest test (issues GET against each SPEC-87 §5 endpoint; asserts `_envelope.requestId`, `_envelope.serverVersion`, `_envelope.worldIndexStatus` present on every response)
3. PageDetail composition against red-bunny → vitest test (issues `GET /api/worlds/erotica-world/stories/red-bunny/pages/PG-1`; asserts PageDetail returned with `proseStatus: 'present'`, plan body present, receipt present, choice navigation populated)
4. Canonical fixture untouched → vitest test (computes sha256 of every `_source/` file in `worlds/erotica-world/stories/red-bunny/` before test; reruns hash after test; asserts equality)
5. Cross-skill fixture-isolation contract → manual review (test setup uses `fs.cpSync` to a temp directory; teardown asserts canonical paths' hashes unchanged)

## What to Change

### 1. Implement capstone smoke test

- `tools/story-explorer/test/capstone-smoke.test.ts`:
  - **setup**: snapshot sha256 hashes of every `worlds/erotica-world/stories/red-bunny/_source/**/*.yaml` file; `fs.cpSync` the red-bunny bundle to a temp directory; construct server via `createServer({ port: 0, repoRoot: <temp-tree-root> })`; listen on an ephemeral port.
  - **endpoint smoke tests**: issue GET against each SPEC-87 §5 endpoint:
    - `/api/health` → assert `{ ok: true, version }` + envelope.
    - `/api/worlds` → assert `WorldSummary[]` shape; assert the test world is in the list with `indexStatus.kind === 'fresh'` (or `'missing'` if the test doesn't pre-build the index — implementer choice).
    - `/api/worlds/erotica-world/stories` → assert `StorySummary[]` includes red-bunny.
    - `/api/worlds/erotica-world/stories/red-bunny/pages/PG-1` → assert PageDetail returned with `proseStatus: 'present'`, plan body, receipt summary, choice navigation, currentStateRecordIds populated.
    - `/api/worlds/erotica-world/stories/red-bunny/records/PG-1` → assert record-fetch returns PG body + RecordCard summary.
    - `/api/worlds/erotica-world/stories/red-bunny/prose/PG-1` → assert prose body returned with `proseStatus: 'present'`.
    - `/api/worlds/erotica-world/stories/red-bunny/page-plans/PG-1` → assert plan body returned.
    - `/api/worlds/erotica-world/stories/red-bunny/prose-receipts/PG-1` → assert parsed receipt YAML returned.
    - `/api/worlds/erotica-world/stories/red-bunny/provenance/PG-1` → assert provenance shape (`creatingSeId`, `modifyingSeIds[]`, `evidenceRecords[]`).
    - `/api/worlds/erotica-world/stories/red-bunny/search?q=test` → assert sketch envelope (`kind: 'not_implemented'`, SPEC-90 forward reference).
    - `/api/worlds/erotica-world/stories/red-bunny/branch-map?focus=PG-1` → assert sketch envelope.
  - **fixture-isolation assertion**: rerun sha256 hashing of canonical `_source/` files; assert hashes unchanged.
  - **teardown**: server.close(); temp directory cleanup.

## Files to Touch

- `tools/story-explorer/test/capstone-smoke.test.ts` (new)

## Out of Scope

- Frontend smoke tests (SPEC-88 capstone)
- Search / branch-map functional behavior (SPEC-90)
- Performance benchmarks — SPEC-87 §10 mentions performance considerations for large stories but doesn't set a wall-clock threshold; capstone validates correctness, not latency.
- Multi-story-bundle smoke (red-bunny is the only test fixture in v1 per the SPEC-87 reassessment M5 clarification)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm test -- capstone-smoke` — every endpoint returns a well-formed envelope + correct shape against the red-bunny temp-copy fixture.
2. Canonical `worlds/erotica-world/stories/red-bunny/_source/**/*.yaml` file hashes are unchanged after the test runs (fixture-isolation invariant).
3. Server starts and listens on the ephemeral port; teardown succeeds.

### Invariants

1. The smoke test MUST NOT mutate canonical fixture content — hash-snapshot assertion is the structural enforcement (complements the Layer 3 fence's grep-based assertion).
2. Every SPEC-87 §5 endpoint MUST be reachable from the constructed server — endpoint coverage is the load-bearing capstone property.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-smoke.test.ts` — end-to-end smoke covering every SPEC-87 §5 endpoint against red-bunny.

### Commands

1. `cd tools/story-explorer && npm test -- capstone-smoke` (targeted)
2. `cd tools/story-explorer && npm test` (full-pipeline — includes all sibling ticket tests)
