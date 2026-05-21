# SPEC61PROSURSCH-006: Capstone — schema-coverage + approval-enforcement integration test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds an integration test under `tools/validators/tests/`; no production code (exercises the pipeline composed by 001–005).
**Deps**: SPEC61PROSURSCH-003, SPEC61PROSURSCH-004, archive/tickets/SPEC61PROSURSCH-005.md

## Problem

SPEC-61 §4 names six acceptance criteria that cut across the prior tickets (schema coverage, approval-semantics enforcement, RP fix, CF no-regression, world-index node-type emission, EPE-retrieval-unchanged). This capstone exercises them end-to-end against a fixture world so the cross-cutting guarantees are proven once the implementation tickets land, without mutating real canon.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/validators/tests/` and `tools/world-index/tests/` are the test homes; `npm --prefix tools/validators test` and `npm --prefix tools/world-index test` are the runners (no `typecheck` script — `npm run build` covers `tsc`). The capstone composes the surfaces SPEC61PROSURSCH-001..005 produce.
2. Verified against the spec: SPEC-61 §4 enumerates the six acceptance criteria this capstone asserts as test sub-cases. §2.2 blockquote requires EPE retrieval to remain unchanged (still absent from `list_records`).
3. Cross-artifact boundary under audit: this test exercises the schema files (001), node types/enumeration (002), `RECORD_TYPE_TO_SCHEMA` wiring (003), approval-semantics validator (004), and the renamed RP field (005) together — the shared boundary is the world-validate + world-index pipeline over a fixture world containing all eight surfaces.
4. FOUNDATIONS §Canon Fact Record Schema (no-regression): §4 bullet 5 requires an accepted CF to still require `direct_user_approval: true`. Restate that the capstone must assert the CF carve-out survives alongside the new non-CF hard-fail, so the approval-semantics validator does not regress CF validation.

## Architecture Check

1. A single trailing capstone keyed to the spec's §Verification bullets keeps the cross-cutting assertions in one reviewable place and avoids duplicating the end-to-end setup across the per-surface tickets; it introduces no production code, so it cannot mask an implementation gap.
2. No backwards-compatibility shims — the test copies a fixture world to a temp root (`fs.cpSync`) and never mutates `worlds/<slug>/`; expected counts are re-enumerated from the fixture at test start rather than hardcoded.

## Verification Layers

1. Malformed card per surface → `record-schema-compliance` FAIL; well-formed → PASS -> schema validation over the fixture set.
2. Non-CF `direct_user_approval` → blocking FAIL; CF `direct_user_approval: true` → PASS -> approval-semantics validator over the fixture.
3. Freshly-rendered RP card carries `user_approved`, not `direct_user_approval` -> codebase grep-proof against the continuity-audit template.
4. `world-index build` over the fixture emits the four new node types; EPE remains absent from `list_records` -> index inspection + retrieval-surface grep-proof.

## What to Change

### 1. Capstone integration test

Add `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` (or the closest existing integration-test convention):

- Copy a fixture world (containing PR/BATCH/EPE/EPE-sidecar/AU/RP/NWP/NWB surfaces, a well-formed and a malformed instance each, plus a CF and a `user_approved` NCP/DA) to a temp root via `fs.cpSync`.
- Re-enumerate expected surface counts from the fixture at test start.
- One assertion per §4 acceptance bullet: schema FAIL/PASS per surface; non-CF `direct_user_approval` blocking FAIL; RP carries `user_approved`; CF still requires `direct_user_approval: true`; `world-index build` emits the four new node types; EPE absent from `list_records`.

## Files to Touch

- `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` (new)
- `tools/validators/tests/fixtures/` (new fixture-world subtree, if not reusing an existing fixture)

## Out of Scope

- Any production code (schemas, validators, world-index, skill templates — all owned by 001–005).
- A CI wall-clock perf gate (SPEC-61 names no performance threshold).
- Mutating any real `worlds/<slug>/` tree.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators test` passes including the capstone.
2. The capstone asserts all six §4 acceptance bullets, each as a distinct sub-case.
3. `npm --prefix tools/world-index test` passes (node-type emission assertion, if placed world-index-side).

### Invariants

1. The test never mutates `worlds/<slug>/` — fixture copied to a temp root.
2. Expected counts are re-enumerated from the fixture, never hardcoded.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` — end-to-end assertions for all six §4 bullets. — covers §4 in full.

### Commands

1. `npm --prefix tools/validators test`
2. `npm --prefix tools/world-index test`
