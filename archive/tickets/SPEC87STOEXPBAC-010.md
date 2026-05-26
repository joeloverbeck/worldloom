# SPEC87STOEXPBAC-010: Capstone integration smoke test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/test/capstone-smoke.test.ts` (end-to-end smoke test against `red-bunny` fixture).
**Deps**: archive/tickets/SPEC87STOEXPBAC-008.md, archive/tickets/SPEC87STOEXPBAC-009.md

## Problem

SPEC-87 §9 specifies a manual smoke test in dev mode against a red-bunny story bundle shape (one prose page, one plan, one receipt). This ticket landed the automated equivalent: a compiled `node:test` test that constructs the HTTP server from ticket 007, mounts all routes from tickets 007-009, issues representative requests against a fixture-isolated red-bunny-shaped temp repo, and asserts every endpoint returns a well-formed response with the correct envelope, the correct shape per SPEC-87 §4 view models, and the correct discriminators for missing-prose / first-class states. This is the capstone that proves SPEC-87 ships a working backend.

## Assumption Reassessment (2026-05-25)

1. Tickets 001-009 have produced the full backend: package skeleton, fencing, IndexStatus, enumeration, page read path, record card data path, HTTP server with base routes, page/record/prose/provenance routes, and search/branch-map sketches. This ticket's smoke test exercises the composition through HTTP — the same path SPEC-88's frontend will hit.
2. Superseded draft assumption: the drafted ticket expected a checkout-local `worlds/erotica-world/stories/red-bunny/` fixture carrying PG-1 with rendered prose, plan, receipt, plus STCHAR + STENT records. Live reassessment in item 4 replaced that missing checkout-local path with a temp-seeded red-bunny-shaped fixture.
3. Cross-skill boundary: the fixture isolation contract is the shared boundary under audit. The implemented test seeds a temp tree, runs the server against the temp tree, verifies temp `_source` hashes are unchanged, and verifies the absent checkout-local `worlds/erotica-world/` path is not created. FOUNDATIONS §Canonical Storage Layer is the principle this protects: even a read-only backend test must not accidentally mutate canon. The Layer 3 fence from ticket 002 is the structural prevention; this ticket's hash-snapshot assertion is the runtime confirmation.
4. Implementation reassessment (2026-05-26): the live checkout does not contain `worlds/erotica-world/stories/red-bunny/`, so the canonical-copy proof surface is not executable here. Per the package-tooling checked-fixture rule, the capstone uses a temp-seeded red-bunny-shaped fixture matching the SPEC-87 artifact shape instead of a missing checkout-local world. The isolation invariant remains: the test hashes the temp fixture `_source` before and after HTTP requests, and it asserts the absent canonical path is not created.

## Architecture Check

1. The capstone smoke test is end-to-end: HTTP server up, temp-seeded red-bunny-shaped fixture, all endpoints exercised. It complements the per-ticket unit tests by proving the composition works against a complete story bundle shape. Test isolation via a temp directory ensures repeatability and prevents checkout-world mutation under Layer 3 fence.
2. No backwards-compatibility shims; the smoke test is the first end-to-end verification.

## Verification Layers

1. Server bootstrap end-to-end → compiled `node:test` test (constructs server via `createServer` from ticket 007; asserts server handles every route family from 007/008/009)
2. Every endpoint returns a well-formed envelope → compiled `node:test` test (issues GET against each SPEC-87 §5 endpoint; asserts `_envelope.requestId`, `_envelope.serverVersion`, `_envelope.worldIndexStatus` are present on route responses)
3. PageDetail composition against red-bunny-shaped fixture → compiled `node:test` test (issues `GET /api/worlds/erotica-world/stories/red-bunny/pages/PG-1`; asserts PageDetail returned with `proseStatus: 'present'`, plan summary, receipt summary, choice navigation populated)
4. Fixture source untouched → compiled `node:test` test (computes sha256 of every temp fixture `_source` file before HTTP requests; reruns hash after test; asserts equality; also asserts the absent checkout-local canonical path remains absent)
5. Cross-skill fixture-isolation contract → manual review (test setup seeds only a temp repo and teardown asserts temp `_source` hashes unchanged)

## Landed Changes

### 1. Implement capstone smoke test

- `tools/story-explorer/test/capstone-smoke.test.ts`:
  - **setup**: seed a red-bunny-shaped story bundle into a temp repo; snapshot sha256 hashes of every temp fixture `_source/**/*.yaml` file; construct server via `createServer({ repoRoot: <temp-tree-root> })` and exercise it with Fastify `inject`.
  - **endpoint smoke tests**: issue GET against each SPEC-87 §5 endpoint:
    - `/api/health` → assert `{ ok: true, version }` + envelope.
    - `/api/worlds` → assert `WorldSummary[]` shape; assert the test world is in the list with `indexStatus.kind === 'fresh'`.
    - `/api/worlds/erotica-world/stories` → assert `StorySummary[]` includes red-bunny.
    - `/api/worlds/erotica-world/stories/red-bunny/pages/PG-1` → assert PageDetail returned with `proseStatus: 'present'`, plan body, receipt summary, choice navigation, currentStateRecordIds populated.
    - `/api/worlds/erotica-world/stories/red-bunny/records/PG-1` → assert record-fetch returns PG body + RecordCard summary.
    - `/api/worlds/erotica-world/stories/red-bunny/prose/PG-1` → assert prose body returned with `proseStatus: 'present'`.
    - `/api/worlds/erotica-world/stories/red-bunny/page-plans/PG-1` → assert plan body returned.
    - `/api/worlds/erotica-world/stories/red-bunny/prose-receipts/PG-1` → assert parsed receipt YAML returned.
    - `/api/worlds/erotica-world/stories/red-bunny/provenance/STENT-1` → assert non-empty provenance shape (`creatingSeId`, `modifyingSeIds[]`, `evidenceRecords[]`).
    - `/api/worlds/erotica-world/stories/red-bunny/search?q=test` → assert sketch envelope (`kind: 'not_implemented'`, SPEC-90 forward reference).
    - `/api/worlds/erotica-world/stories/red-bunny/branch-map?focus=PG-1` → assert sketch envelope.
  - **fixture-isolation assertion**: rerun sha256 hashing of temp fixture `_source` files; assert hashes unchanged; assert the absent checkout-local canonical red-bunny path was not created.
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

1. `cd tools/story-explorer && npm run build && node --test dist/test/capstone-smoke.test.js` — every endpoint returns a well-formed envelope + correct shape against the red-bunny-shaped temp fixture.
2. Temp fixture `_source/**/*.yaml` file hashes are unchanged after the test runs and the absent checkout-local canonical red-bunny path is not created (fixture-isolation invariant).
3. Server constructs successfully and all requests are exercised through the HTTP route layer; teardown succeeds.

### Invariants

1. The smoke test MUST NOT mutate fixture source content or create checkout-local canonical world content — hash-snapshot and absent-path assertions are the structural enforcement (complements the Layer 3 fence's grep-based assertion).
2. Every SPEC-87 §5 endpoint MUST be reachable from the constructed server — endpoint coverage is the load-bearing capstone property.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/capstone-smoke.test.ts` — end-to-end smoke covering every SPEC-87 §5 endpoint against a red-bunny-shaped temp fixture.

### Commands

1. `cd tools/story-explorer && npm run build && node --test dist/test/capstone-smoke.test.js` (targeted)
2. `cd tools/story-explorer && npm test` (full-pipeline — includes all sibling ticket tests)

## Outcome

Completed: 2026-05-26

Added `tools/story-explorer/test/capstone-smoke.test.ts`, a compiled `node:test` capstone that seeds a red-bunny-shaped temp repo, creates a fresh `world-index` DB, constructs the Fastify server through `createServer`, and exercises every SPEC-87 route family through HTTP injection. The test verifies universal envelopes, world/story/page/record/prose/plan/receipt/provenance response shapes, the SPEC-90 sketch route envelopes, temp `_source` hash stability, and that the absent checkout-local canonical red-bunny path is not created.

## Verification Result

1. `cd tools/story-explorer && npm run build` — passed.
2. `cd tools/story-explorer && node --test dist/test/capstone-smoke.test.js` — passed: 1 test, 1 pass.
3. `cd tools/story-explorer && npm test` — passed: 66 tests, 66 pass.
4. Manual fixture-isolation review — `capstone-smoke.test.ts` seeds only an OS temp repo, hashes temp `_source/**/*.yaml` before/after route requests, removes the temp repo in `finally`, and asserts the checkout-local `worlds/erotica-world/stories/red-bunny` path remains absent.

## Deviations

1. The drafted checkout-local fixture path `worlds/erotica-world/stories/red-bunny/` is absent in this worktree, so the capstone uses a temp-seeded red-bunny-shaped fixture rather than `fs.cpSync` from canonical world content. This keeps the proof portable and avoids reading or mutating checkout-local `_source` content in bulk.
2. The drafted targeted command `cd tools/story-explorer && npm test -- capstone-smoke` was corrected to `cd tools/story-explorer && npm run build && node --test dist/test/capstone-smoke.test.js` because the package `npm test` script runs the full compiled glob.
