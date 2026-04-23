# SPEC02RETMCPSER-012: Spec-integration capstone — SPEC-02 §Verification end-to-end

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds a shared integration fixture builder plus SPEC-02 capstone and token-reduction integration tests under `tools/world-mcp/tests/`.
**Deps**: SPEC02RETMCPSER-011

## Problem

SPEC-02 §Verification lists 12 bullets, but by the time this ticket started the live `tools/world-mcp` package already covered many of them in package-local tests: ranking semantics, approval-token HMAC behavior, context-packet shape conformance, empty/stale/version lifecycle errors, summary-null fallback, and Phase 1 stub semantics. The missing delta was the composed server-stack capstone proving those behaviors still hold together through MCP tool dispatch, plus a runnable token-reduction harness that records a truthful fixture-local baseline. Without that capstone layer, Phase 1 proof stayed fragmented across unit files and the active ticket overstated what still needed to be added.

## Assumption Reassessment (2026-04-24)

1. SPEC02RETMCPSER-011 is live: `tools/world-mcp/src/server.ts` registers all 10 MCP tools, `tests/server/dispatch.test.ts` already proves basic tool dispatch, and `tests/integration/server-stdio.test.ts` already proves the built stdio entrypoint stays alive as a child process.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Verification remains the authoritative checklist, but the active ticket's text drifted from live reality in two ways: it said "11 bullets" while the spec actually lists 12 verification bullets, and it treated several already-landed package tests as missing capstone work. The truthful owner for this ticket is the remaining composed integration layer, not re-implementing upstream unit coverage.
3. Cross-artifact boundary under audit: `tools/world-mcp/tests/integration/` now owns the server-stack composition seam over the already-landed tool, DB, ranking, approval, and context-packet modules. Upstream tests continue to own direct module invariants; this ticket owns proving those invariants still compose through MCP dispatch on fixture worlds.
4. `specs/SPEC-08-migration-and-phasing.md` Phase 1's ≥50% reduction target is an animalia acceptance gate, not something a package fixture can honestly certify by itself. The truthful test surface for this ticket is a fixture-local eager-load baseline harness that records concrete packet-vs-baseline numbers and enforces the same reduction shape without pretending to be the repo-level animalia measurement.
5. The drafted fixture-builder path `tools/world-mcp/tests/fixtures/build-fixture.ts` did not exist. Adding it was a safe same-seam correction because the live package already relied on ad hoc fixture seeding helpers in `tests/tools/_shared.ts`, and the capstone would otherwise duplicate that setup logic across new integration files.

## Architecture Check

1. A shared fixture-builder module is cleaner than embedding separate seeding logic in each new integration file; it keeps the server-stack scenarios and the token-reduction harness on one truthful fixture substrate.
2. Keeping direct module proof in the existing upstream tests is cleaner than forcing every spec bullet through one giant capstone file. The new capstone covers the composition seam the repo was actually missing, while ranking/HMAC/shape module details remain proven where they already lived.
3. No backwards-compatibility shims.

## Verification Layers

1. **Composed canon-addition proof** -> `tools/world-mcp/tests/integration/spec02-verification.test.ts` verifies `get_context_packet` through MCP dispatch stays under the 8k budget and remains at least 50% smaller than the fixture-local eager-load baseline.
2. **World-scoping and lifecycle errors** -> the same capstone file proves multi-world isolation plus `empty_index`, `stale_index`, and `index_version_mismatch` responses through the server seam.
3. **Search/context contract fidelity** -> the capstone file proves exact-entity ordering over weighted-only lexical hits, `summary: null` fallback behavior, and `docs/CONTEXT-PACKET-CONTRACT.md` shape fidelity through live MCP calls.
4. **Phase 1 public-surface stability** -> the capstone file proves `@worldloom/world-index/public/types` imports cleanly and the MCP write-path placeholders still return `validator_unavailable` / `phase1_stub` through the server.
5. **Measurement harness** -> `tools/world-mcp/tests/integration/token-reduction.test.ts` prints fixture-local baseline numbers and enforces the ≥50% reduction shape without claiming it is the final animalia Phase 1 acceptance run.

## What to Change

### 1. `tools/world-mcp/tests/fixtures/build-fixture.ts` (new)

Adds shared fixture builders for the capstone seam: a representative seeded world, multi-world setup, empty-index world, version-skew world, drifted-index world, and the file list used by the token-reduction baseline harness.

### 2. `tools/world-mcp/tests/integration/spec02-verification.test.ts` (new)

Adds 12 localized `test(...)` cases covering the missing composed proof surface: fixture-local token reduction, multi-world isolation, exact-entity search ordering, empty/stale/version lifecycle errors, summary-null fallback, context-packet shape fidelity, public types import, Phase 1 stub semantics, and a <30s sentinel.

### 3. `tools/world-mcp/tests/integration/token-reduction.test.ts` (new)

Adds a standalone measurement harness that prints fixture-local eager-load vs packet token estimates and asserts the packet remains at least 50% smaller.

## Files to Touch

- `tools/world-mcp/tests/fixtures/build-fixture.ts` (new)
- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (new)
- `tools/world-mcp/tests/integration/token-reduction.test.ts` (new)

## Out of Scope

- Phase 2 verification bullets (engine wiring, patch-plan submission, validator delegation) — those land alongside SPEC-03 / SPEC-04.
- Claude Code end-user testing (manual `.mcp.json` registration + tool invocation from a real Claude session) — out-of-test-harness; user-level validation.
- Cross-spec verification (SPEC-02 + SPEC-05 hooks together) — SPEC-05's own capstone handles that.
- Load testing beyond the single-user assumption — per spec §Out of Scope line 333.
- Re-running unit tests for every upstream tool in this file — upstream tickets already cover them; capstone asserts composition, not re-coverage.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/spec02-verification.test.js`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/token-reduction.test.js`
3. `cd tools/world-mcp && npm test`

### Invariants

1. The new integration fixture never mutates real repo `worlds/<slug>/` content; every scenario seeds an isolated temp repo root under `os.tmpdir()`.
2. The capstone proves the composed server seam without replacing the existing upstream unit/shape/ranking/token tests that already own direct module behavior.
3. The standalone token-reduction harness reports a truthful fixture-local baseline and must not be described as the final animalia Phase 1 acceptance measurement.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/fixtures/build-fixture.ts` — shared seeded, multi-world, empty, drifted, and version-skew fixture builders.
2. `tools/world-mcp/tests/integration/spec02-verification.test.ts` — composed MCP-server verification for the remaining SPEC-02 proof seam.
3. `tools/world-mcp/tests/integration/token-reduction.test.ts` — fixture-local token-reduction measurement harness.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/spec02-verification.test.js`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/token-reduction.test.js`
3. `cd tools/world-mcp && npm test`

## Outcome

**Completed**: 2026-04-24

- Added `tools/world-mcp/tests/fixtures/build-fixture.ts` so the new integration lanes share one truthful fixture substrate instead of duplicating temp-world setup.
- Added `tools/world-mcp/tests/integration/spec02-verification.test.ts` with 12 MCP-server capstone checks for the still-missing composed proof seam.
- Added `tools/world-mcp/tests/integration/token-reduction.test.ts` to print fixture-local baseline numbers and enforce a ≥50% reduction shape.
- Rewrote this ticket to match the live repo: upstream package tests still own several SPEC-02 verification bullets directly, while this ticket now truthfully owns the missing integration/capstone layer.
- **Deviations from plan**:
  - The original ticket overclaimed a single capstone file covering every SPEC-02 verification bullet. The live repo already had direct proof for several bullets, so the landed change added the missing composed server-stack seam instead of duplicating those tests.
  - The original ticket treated the token-reduction harness as if it could directly certify SPEC-08's animalia Phase 1 gate. The landed harness truthfully measures a fixture-local eager-load baseline and leaves the real animalia acceptance measurement to the broader Phase 1 workflow.
- **Verification results**:
  1. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/spec02-verification.test.js`
  2. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/token-reduction.test.js`
  3. `cd tools/world-mcp && npm test`
