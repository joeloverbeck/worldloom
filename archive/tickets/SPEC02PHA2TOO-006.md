# SPEC02PHA2TOO-006: Restore truthful package-wide `world-mcp` aggregate test lane after live-corpus stale-index failure

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — repaired the package-wide `tools/world-mcp` aggregate test lane by truthing stale-index lifecycle handling for atomized logical file rows and updating the live-corpus assertion to the repaired packet behavior.
**Deps**: archive/tickets/SPEC02PHA2TOO-001.md

## Problem

At intake, post-ticket review of SPEC02PHA2TOO-001 confirmed the new `get_record` seam was green on targeted compiled proof, but the broader `cd tools/world-mcp && npm run test` lane was red in `dist/tests/integration/spec12-live-corpus.test.js`.

Observed command result during SPEC02PHA2TOO-001 closeout:

- `cd tools/world-mcp && npm run test` builds successfully.
- 104 tests pass.
- `SPEC-12 live corpus capstone proves the repaired animalia retrieval seam` fails 3 subtests.
- The failing subtests exercise `findNamedEntities`, `getNeighbors`, and `getContextPacket`, not `get_record`.
- The failure payload includes `stale_index` where the context-packet subtest expected `packet_incomplete_required_classes`.

This did not block SPEC02PHA2TOO-001 because the reviewed ticket's owned invariant was the new parsed-record retrieval tool, and its direct tool, registration, dispatch, and error-taxonomy proofs passed. It did leave the package-wide aggregate lane untruthful for subsequent SPEC02PHA2TOO tickets that still listed `npm run test` as a full-suite acceptance surface.

## Assumption Reassessment (2026-04-25)

1. `tools/world-mcp/package.json` defines `"test": "npm run build && node --test"`, so `cd tools/world-mcp && npm run test` is the live package-wide aggregate runner.
2. `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` copies the live `worlds/animalia` tree to a temp repo root, removes the copied `_index`, rebuilds with `@worldloom/world-index`, then invokes `findNamedEntities`, `getNeighbors`, and `getContextPacket` against the copied fixture.
3. The current failure is outside SPEC02PHA2TOO-001's owned seam: the new `tools/world-mcp/src/tools/get-record.ts` is not called by the failing integration test, and the targeted proof `node --test dist/tests/tools/get-record.test.js dist/tests/errors.test.js dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js` exits 0.
4. Reproduction on 2026-04-25 still matches the ticket: `cd tools/world-mcp && npm run test` builds, then the live-corpus capstone returns `stale_index` for `findNamedEntities`, `getNeighbors`, and `getContextPacket`.
5. Narrow probing isolated the stale-index payload to atomized logical file rows such as `CANON_LEDGER.md`, `INVARIANTS.md`, and other retired compiled-markdown concerns that `world-index` intentionally emits as synthetic `domain_file` rows in atomic mode. These rows are recorded in `file_versions`, but they do not exist on disk under `worlds/animalia/`, so `tools/world-mcp/src/db/open.ts` incorrectly treats them as deleted source files.
6. After the stale-index repair, the live-corpus context-packet assertions no longer return `packet_incomplete_required_classes`: `CHAR-0002` and `DA-0002` both fit locality-first packet classes under the live 8000-token budget. The integration test expectation was updated to assert successful packets, requested/allocated budget, local authority, scoped local context, governing world context, and the DA→CHAR exact record link.
7. Prior archived ticket `archive/tickets/SPEC12SKIRELRET-011.md` previously truth-checked an older package-wide aggregate failure and closed it as no longer reproducing. The current failure is a new live-corpus failure in `spec12-live-corpus.test.js`, not the old `server-stdio.test.js` failure.
8. FOUNDATIONS principle under audit: §Tooling Recommendation — retrieval tools should provide reliable structured access to canonical records. A stale aggregate live-corpus proof makes that reliability harder to trust, even when individual bounded tool seams are green.
9. Sibling proof wording remains truthful: `rg -n "npm run test" tickets/SPEC02PHA2TOO-*.md` still finds active sibling references in SPEC02PHA2TOO-002 and SPEC02PHA2TOO-003, and the aggregate lane now exits 0.

## Architecture Check

1. Keep this as a separate proof-surface repair ticket instead of folding it into SPEC02PHA2TOO-001. The failing tests cover existing SPEC-12 retrieval behavior, not the new `get_record` tool.
2. The implementation proved the stale-index response was caused by retrieval lifecycle validation treating `world-index` atomized logical rows as missing disk files. Repairing `tools/world-mcp/src/db/open.ts` keeps the lifecycle check narrow and avoids weakening real stale-source detection.
3. No backwards-compatibility aliasing/shims should be introduced. If the aggregate lane is red because the fixture setup is stale, fix the setup or test expectation rather than weakening retrieval errors.

## Verification Layers

1. Package-wide aggregate lane restored or truthfully narrowed -> targeted tool command: `cd tools/world-mcp && npm run test`.
2. Live-corpus failure source isolated -> manual review / targeted command evidence for whether the stale index comes from fixture setup, live source drift, or retrieval behavior.
3. SPEC02PHA2TOO sibling acceptance surfaces remain truthful -> codebase grep-proof over active `tickets/SPEC02PHA2TOO-*.md` for `npm run test` references after this ticket lands.

## What to Change

### 1. Reproduce and isolate the aggregate failure

Run `cd tools/world-mcp && npm run test` and, if still red, run the compiled live-corpus test directly with enough reporter detail to capture the first failing structured error payload.

### 2. Repair the narrowest truthful seam

Likely areas to inspect:

- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts`
- copied fixture cleanup around `_index/`
- `tools/world-mcp/src/db/open.ts` stale-index checks if the copied fixture is rebuilt but still reported stale
- `tools/world-mcp/tests/fixtures/` only if the failure proves fixture-builder fallout

### 3. Reconcile active SPEC02PHA2TOO proof wording if needed

If this ticket cannot restore `npm run test` as a truthful aggregate gate, update active sibling tickets that still name it so they use the strongest truthful compiled proof lane instead.

## Files to Touch

- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (modify if fixture setup or expectations are stale)
- `tools/world-mcp/src/db/open.ts` (modify only if stale-index detection is proven wrong)
- `tools/world-mcp/tests/db/open.test.ts` (modify if stale-index lifecycle coverage needs an atomic logical-file regression)
- `tickets/SPEC02PHA2TOO-*.md` (modify only if sibling proof wording must be truthfully narrowed)

## Out of Scope

- Changing `get_record` behavior from SPEC02PHA2TOO-001.
- Broad refactors of `findNamedEntities`, `getNeighbors`, or `getContextPacket` unless the first failing proof isolates a real regression there.
- Mutating live `worlds/animalia` canon content.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` exits 0.
2. `cd tools/world-mcp && npm run test` exits 0.
3. If test expectations are changed, the direct compiled live-corpus test explains the same result: `cd tools/world-mcp && node --test dist/tests/integration/spec12-live-corpus.test.js`.

### Invariants

1. Existing retrieval tools do not suppress legitimate `stale_index` lifecycle errors.
2. Live-corpus tests do not rely on inherited generated state from `worlds/animalia/_index`.
3. Follow-on SPEC02PHA2TOO tickets do not claim package-wide proof that is known red for unrelated reasons.

## Test Plan

### New/Modified Tests

1. Existing `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` — repair or truth its live-corpus fixture proof if it is stale.
2. Existing `tools/world-mcp/tests/db/open.test.ts` — cover atomized logical `file_versions` rows so synthetic retired markdown paths do not produce false `stale_index` errors.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/integration/spec12-live-corpus.test.js`
3. `cd tools/world-mcp && npm run test`

## Outcome

Completion date: 2026-04-25.

`tools/world-mcp/src/db/open.ts` now skips missing atomized logical concern files when a world has an `_source` tree. Real tracked source drift still returns `stale_index`; only synthetic `world-index` logical rows such as `CANON_LEDGER.md` are exempted from disk-presence drift checks.

The live-corpus integration test now proves the rebuilt Animalia fixture exercises `findNamedEntities`, `getNeighbors`, and `getContextPacket` successfully. Its context-packet assertion was updated because the repaired corpus now fits the locality-first required classes under the 8000-token budget instead of returning `packet_incomplete_required_classes`.

## Verification Result

1. `cd tools/world-mcp && npm run build` — exits 0.
2. `cd tools/world-mcp && node --test dist/tests/integration/spec12-live-corpus.test.js` — exits 0.
3. `cd tools/world-mcp && npm run test` — exits 0; 109/109 assertions pass.
4. `rg -n "npm run test" tickets/SPEC02PHA2TOO-*.md` — remaining active sibling references are truthful because the package-wide aggregate lane is green.

## Deviations

No sibling ticket proof wording needed narrowing. Package-local README and `.mcp.json.example` were inspected during closeout; neither documents the stale-index lifecycle behavior or the live-corpus test expectation, so no same-package docs edit was needed.
