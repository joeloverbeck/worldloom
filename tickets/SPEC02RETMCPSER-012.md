# SPEC02RETMCPSER-012: Spec-integration capstone — SPEC-02 §Verification end-to-end

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces capstone integration tests at `tools/world-mcp/tests/integration/` exercising the spec's full §Verification matrix.
**Deps**: SPEC02RETMCPSER-011

## Problem

SPEC-02 §Verification enumerates 11 verification bullets: unit, integration (canon-addition context-packet), ranking, approval token, multi-world, empty index, out-of-sync index, version skew, summary-null fallback, context-packet shape fidelity, types-only public export, Phase 1 stub semantics. Unit tests for each tool live in their implementation tickets (-003 through -011). This capstone ticket wires the cross-cutting and end-to-end scenarios — the ones that depend on multiple tools composing correctly through the full server stack landed in -011. It is the final quality gate before SPEC-02 is treated as "Phase 1 complete" per `specs/IMPLEMENTATION-ORDER.md` Phase 1 completion gate.

## Assumption Reassessment (2026-04-23)

1. SPEC02RETMCPSER-011 landed: `tools/world-mcp/src/server.ts` exists, registers all 10 tools, responds over stdio. Every upstream ticket's tests pass independently. `specs/SPEC-08-migration-and-phasing.md` Phase 1 acceptance criteria (cited via `specs/IMPLEMENTATION-ORDER.md:57–61`) name the ≥50% token-reduction measurement this ticket's integration test contributes to.
2. `specs/SPEC-02-retrieval-mcp-server.md` §Verification (lines 313–326) is the authoritative source for the 11 bullets. Each bullet maps to a concrete fixture assertion below. Per `tickets/README.md` §Spec-Integration Ticket Shape guidance, this capstone uses a fixture-world copy strategy (never mutates real `worlds/<slug>/`), re-enumerates expected counts from the fixture at test start (not hardcoded), asserts one bullet per test sub-case, and includes a wall-clock perf sentinel (<30s per `specs/SPEC-08-migration-and-phasing.md` Phase 1 gate).
3. Cross-artifact boundary under audit: the capstone exercises every prior ticket simultaneously. A regression in any upstream ticket (e.g., a ranking-order bug in -004, a packet-shape drift in -007, a token-tamper bug in -009) surfaces here. Failures in the capstone trace back to the responsible upstream ticket, not to the capstone itself.

## Architecture Check

1. A single capstone ticket with one test sub-case per spec §Verification bullet is cleaner than 11 separate verification tickets because the bullets share the same fixture-world copy machinery; splitting would duplicate the `fs.cpSync` + fixture-build setup 11 times.
2. Re-enumerating expected counts at test start (not hardcoded) is cleaner than static assertions because the fixture can evolve without forcing this ticket to re-bless. Per `tickets/README.md` Spec-Integration Ticket Shape guidance.
3. No backwards-compatibility shims.

## Verification Layers

1. **Unit bullet** — cross-check that every tool's unit test suite (from -003 through -010) is referenced in the capstone's top-level `npm test` run. No new unit tests here; this bullet is a pointer.
2. **Integration bullet** — end-to-end replays canon-addition Phase 0 pre-flight against a fixture world via `get_context_packet({task_type: 'canon_addition', seed_nodes: [fixtureProposalNodeId], token_budget: 8000})`. Assert response size < 8k tokens AND ≥ 50% reduction vs. eager-load baseline.
3. **Ranking bullet** — `tests/ranking/exact-match-ordering.test.ts` (already landed in -004) is re-run from the capstone; cross-check that Band E1 > E2 > W holds against a representative fixture.
4. **Approval token bullet** — `tests/approval/token-lifecycle.test.ts` (from -009) runs; additionally, an integration test confirms `submit_patch_plan` with a tampered token would return `token_tampered` (future-proofed; currently returns `phase1_stub` since engine is not wired).
5. **Multi-world bullet** — fixture creates two worlds (seeded-a, seeded-b); capstone issues concurrent `search_nodes` requests against each; asserts results are world-scoped with zero cross-contamination.
6. **Empty-index bullet** — fixture creates a world with a freshly built but empty `world.db`; asserts `search_nodes` returns `{code: 'empty_index'}`.
7. **Out-of-sync bullet** — fixture touches a world-file mtime after indexing; asserts `search_nodes` returns `{code: 'stale_index', details: {drifted_files: [...]}}`.
8. **Version skew bullet** — fixture writes a bumped `index_version.txt`; asserts every tool returns `{code: 'index_version_mismatch'}`.
9. **Summary-null fallback bullet** — fixture contains at least one node with `nodes.summary IS NULL`; asserts `search_nodes` response has `summary: null` and `body_preview` is a truncated string.
10. **Shape-fidelity bullet** — reads `docs/CONTEXT-PACKET-CONTRACT.md`, extracts the example YAML, runs `get_context_packet` on a fixture, asserts structural match (top-level keys + sub-keys + `packet_version: 1`).
11. **Types-only public export bullet** — `node -e "require('@worldloom/world-index/public/types')"` imports cleanly and performs zero IO.
12. **Phase 1 stub semantics bullet** — `submit_patch_plan(wellFormedPlan)` returns `{code: 'phase1_stub'}`; `validate_patch_plan(wellFormedPlan)` returns `{code: 'validator_unavailable'}`.

Each bullet is its own `test(...)` block so failures localize.

## What to Change

### 1. `tools/world-mcp/tests/integration/spec02-verification.test.ts` (new — main capstone)

One `describe('SPEC-02 §Verification', ...)` block with 11 `test(...)` sub-cases, one per bullet above. Fixture setup runs once at the top (fixture world copied via `fs.cpSync` to a temp root under `os.tmpdir()`); cleanup in `after`.

### 2. Fixture builder extensions

`tools/world-mcp/tests/fixtures/build-fixture.ts` (from -003) gains:
- `buildEmptyWorldFixture(tmpRoot, slug)` — creates a world directory + empty `world.db`.
- `buildMultiWorldFixture(tmpRoot)` — creates two worlds with non-overlapping content.
- `buildSummaryNullFixture(tmpRoot)` — seeds at least one node with `summary = NULL`.

### 3. Performance sentinel

A `test('wall-clock perf: full verification suite completes in under 30s', ...)` block wraps the entire capstone in a timer. Per `tickets/README.md` Spec-Integration Ticket Shape, this is a CI gate (hard), not an aspirational dev-loop target.

### 4. Token-reduction measurement harness

A separate `tests/integration/token-reduction.test.ts` (new) records context-packet byte size + an estimated token count for a representative canon-addition seed; prints to stdout for manual comparison against the Phase 0 baseline. Asserts ≥ 50% reduction once the baseline is frozen in SPEC-08 Phase 1 measurement.

## Files to Touch

- `tools/world-mcp/tests/integration/spec02-verification.test.ts` (new)
- `tools/world-mcp/tests/integration/token-reduction.test.ts` (new)
- `tools/world-mcp/tests/fixtures/build-fixture.ts` (modify — add empty / multi-world / summary-null builders)

## Out of Scope

- Phase 2 verification bullets (engine wiring, patch-plan submission, validator delegation) — those land alongside SPEC-03 / SPEC-04.
- Claude Code end-user testing (manual `.mcp.json` registration + tool invocation from a real Claude session) — out-of-test-harness; user-level validation.
- Cross-spec verification (SPEC-02 + SPEC-05 hooks together) — SPEC-05's own capstone handles that.
- Load testing beyond the single-user assumption — per spec §Out of Scope line 333.
- Re-running unit tests for every upstream tool in this file — upstream tickets already cover them; capstone asserts composition, not re-coverage.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — entire suite, including this capstone, passes.
2. `cd tools/world-mcp && node --test dist/tests/integration/spec02-verification.test.js` — all 11 sub-cases pass.
3. Token-reduction harness reports a context-packet size ≥ 50% smaller than the documented Phase 0 baseline for a representative canon-addition pre-flight.
4. Wall-clock sentinel: full capstone completes in < 30s on commodity hardware.

### Invariants

1. Every spec §Verification bullet has exactly one corresponding `test(...)` sub-case in `spec02-verification.test.ts`. Adding a bullet to the spec requires adding a sub-case; removing a bullet requires removing its sub-case. Drift between the spec and the capstone is a bug.
2. The capstone never mutates real `worlds/<slug>/` directories — every test uses a `fs.cpSync` copy to a temp root.
3. Expected counts are re-enumerated from the fixture at test start, never hardcoded. Fixture evolution must not force capstone re-bless.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec02-verification.test.ts` — 11 sub-cases + wall-clock sentinel.
2. `tools/world-mcp/tests/integration/token-reduction.test.ts` — token-reduction ≥ 50% measurement.
3. `tools/world-mcp/tests/fixtures/build-fixture.ts` — builder extensions for empty / multi-world / summary-null scenarios.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/spec02-verification.test.js`
2. `cd tools/world-mcp && npm run build && node --test dist/tests/integration/token-reduction.test.js`
3. `cd tools/world-mcp && npm test` (full suite — every upstream unit test + this capstone composes cleanly).
