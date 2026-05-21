# SPEC61PROSURSCH-006: Capstone — schema-coverage + approval-enforcement integration test

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds an integration test under `tools/validators/tests/`; no production code (exercises the pipeline composed by 001–005).
**Deps**: archive/tickets/SPEC61PROSURSCH-003.md, archive/tickets/SPEC61PROSURSCH-004.md, archive/tickets/SPEC61PROSURSCH-005.md

## Problem

SPEC-61 §4 named six acceptance criteria that cut across the prior tickets (schema coverage, approval-semantics enforcement, RP fix, CF no-regression, world-index node-type emission, EPE-retrieval-unchanged). This capstone now exercises them together with a temp-seeded fixture world and source-level boundary checks, without mutating real canon.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/tests/` and `tools/world-index/tests/` are the test homes; `npm --prefix tools/validators test` and `npm --prefix tools/world-index test` are the runners (no `typecheck` script; `npm run build` covers `tsc`). The capstone composes the surfaces SPEC61PROSURSCH-001..005 produced.
2. Verified against the spec: SPEC-61 §4 enumerates the six acceptance criteria this capstone asserts as test sub-cases. §2.2 blockquote requires EPE retrieval to remain unchanged (still absent from `list_records`).
3. Cross-artifact boundary under audit: this test exercises the schema files (001), node types/enumeration (002), `RECORD_TYPE_TO_SCHEMA` wiring (003), approval-semantics validator (004), and the renamed RP field (005) together. Existing per-surface structural tests already covered individual schema behavior; the new capstone proves the composed integration surface across validators, world-index, the continuity-audit template, and the MCP retrieval boundary.
4. FOUNDATIONS §Canon Fact Record Schema (no-regression): §4 bullet 5 requires an accepted CF to still require `direct_user_approval: true`. Restate that the capstone must assert the CF carve-out survives alongside the new non-CF hard-fail, so the approval-semantics validator does not regress CF validation.

## Architecture Check

1. A single trailing capstone keyed to the spec's §Verification bullets keeps the cross-cutting assertions in one reviewable place and avoids duplicating the end-to-end setup across the per-surface tickets; it introduces no production code, so it cannot mask an implementation gap.
2. No backwards-compatibility shims. The test writes a minimal fixture world under `/tmp`, runs `world-index` build against that temp root, and never mutates `worlds/<slug>/`.

## Verification Layers

1. Malformed card per surface -> `record-schema-compliance` FAIL; well-formed -> PASS -> schema validation over the fixture set.
2. Non-CF `direct_user_approval` -> blocking FAIL; CF `direct_user_approval: true` -> PASS -> approval-semantics validator over the fixture.
3. Freshly-rendered RP card carries `user_approved`, not `direct_user_approval` -> codebase source-proof against the continuity-audit template.
4. `world-index build` over the temp fixture emits the proposal-surface node types; EPE remains absent from `list_records` -> index inspection + retrieval-surface source-proof.

## Landed Changes

### 1. Capstone integration test

Added `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts`:

- Builds synthetic indexed records for all nine proposal-surface node types and verifies well-formed records pass `record-schema-compliance`.
- Deletes each required id field to verify malformed proposal surfaces fail schema validation.
- Verifies `approvalSemantics` rejects non-CF `source_basis.direct_user_approval`, still accepts CF `direct_user_approval`, and accepts non-CF `source_basis.user_approved`.
- Verifies CF schema no-regression by asserting a CF missing `source_basis.direct_user_approval` still fails schema validation.
- Reads the continuity-audit RP template and confirms it emits `source_basis.user_approved`, not `direct_user_approval`.
- Reads `tools/world-mcp/src/tools/list-records.ts` and confirms pressure-event proposal surfaces remain absent from `list_records`.
- Writes a minimal fixture world under `/tmp`, runs `world-index` build, opens the resulting SQLite index, and verifies each proposal-surface node type is emitted once.

## Files to Touch

- `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` (new)
- `archive/tickets/SPEC61PROSURSCH-006.md` (closeout truthing)

## Out of Scope

- Any production code (schemas, validators, world-index, skill templates — all owned by 001–005).
- A CI wall-clock perf gate (SPEC-61 names no performance threshold).
- Mutating any real `worlds/<slug>/` tree.

## Acceptance Criteria

### Tests That Must Pass

1. PASS — `npm --prefix tools/validators test` passes including the capstone.
2. PASS — the capstone asserts all six §4 acceptance bullets as distinct checks inside the integration test.
3. PASS — `npm --prefix tools/world-index test` passes after a fresh `npm run build`.

### Invariants

1. PASS — the test never mutates `worlds/<slug>/`; it writes and deletes a temp root under `/tmp`.
2. PASS — the temp fixture is generated from the same fixture array used by the schema checks, then verified from the built index.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` — composed assertions for all six §4 bullets; covers §4 in full.

### Commands

1. PASS — `cd tools/validators && npm run build && node --test dist/tests/integration/spec61-proposal-surface-coverage.test.js`
2. PASS — `cd tools/validators && npm test` (`808` tests passed)
3. PASS — `cd tools/world-index && npm run build`
4. PASS — `cd tools/world-index && npm test` (`127` tests passed)

## Outcome

Completed. SPEC-61 now has a package-local capstone integration test that proves the proposal-surface schema coverage, approval-semantics reservation, RP template field rename, CF approval no-regression, world-index node emission, and unchanged EPE retrieval boundary together.

## Deviations

1. No checked-in `tools/validators/tests/fixtures/` subtree was needed. The capstone generates its fixture world under `/tmp`, which keeps the fixture colocated with the test data builders and avoids mutating real world content.
2. The world-index node-emission check lives in the validators integration test through the built `@worldloom/world-index` package exports; the world-index package suite was still rebuilt and run as acceptance proof.
