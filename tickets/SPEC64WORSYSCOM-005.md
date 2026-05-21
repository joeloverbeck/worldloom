# SPEC64WORSYSCOM-005: SPEC-64 capstone integration test

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — integration test only; no production code.
**Deps**: archive/tickets/SPEC64WORSYSCOM-003.md

## Problem

SPEC-64 D5 requires a capstone integration test that exercises the full world-compatibility pipeline end-to-end against a fixture world, asserting every §Acceptance behavior: maturity collapse is caught, a non-CF `direct_user_approval` is still caught (no regression on SPEC-61's check via the compatibility CLI path), index drift is caught, `full-world` read-only mode warns rather than blocks, and a clean world passes.

## Assumption Reassessment (2026-05-21)

1. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` is the model. The test exercises the `--compatibility` CLI mode (archive/tickets/SPEC64WORSYSCOM-003.md), which composes `artifact_maturity` (SPEC64WORSYSCOM-001), `index_disk_consistency` (SPEC64WORSYSCOM-002), and the already-landed `approval_semantics` (SPEC-61) + `record_schema_compliance`. A fixture-world copy (e.g., `fs.cpSync` to a temp root) keeps the real `worlds/<slug>/` tree untouched; the fixture is indexed before validation.
2. SPEC-64 §D5 + §Acceptance enumerate the five assertions; the §Acceptance bullets are this ticket's test matrix.
3. Cross-artifact boundary under audit: the test composes the pipeline built by SPEC64WORSYSCOM-001 / -002 / -003 via the compatibility CLI path; it must never mutate real canon (fixture-world copy) and must re-enumerate expected counts from the fixture at test start rather than hardcoding them.

## Architecture Check

1. A fixture-world copy (`fs.cpSync` to a temp root) guarantees the test never mutates real `worlds/<slug>/` canon; re-enumerated expected counts stay valid as canon grows, avoiding stale hardcoded counts.
2. No backwards-compatibility shim; this is a pure test addition exercising the composed pipeline through its public CLI surface.

## Verification Layers

1. Maturity collapse is caught (D1) → assertion on `artifact_maturity.collapse` for a planted collapsed artifact.
2. Non-CF `direct_user_approval` is still caught via the compatibility path (no SPEC-61 regression) → assertion on `approval_semantics.direct_user_approval_reserved`.
3. Index drift is caught (D3) → assertion on `index_disk_drift` for a planted on-disk/INDEX mismatch.
4. `full-world` read-only mode warns rather than blocks → assertion on non-failing exit / warn severities.
5. A clean fixture world passes → assertion of zero compatibility verdicts.

## What to Change

### 1. New capstone integration test

Create `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts`, modeled on `spec61-proposal-surface-coverage.test.ts`: copy a fixture world to a temp root, index it, run the `--compatibility` CLI mode, and assert the five §Acceptance behaviors. Use re-enumerated counts; never touch the real `worlds/<slug>/` tree.

## Files to Touch

- `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts` (new)

## Out of Scope

- The production validator logic (SPEC64WORSYSCOM-001 / -002) and CLI-mode implementation (archive/tickets/SPEC64WORSYSCOM-003.md).
- The continuity-audit reporting hook (SPEC64WORSYSCOM-004) — the skill is not exercised by this validators-package integration test.

## Acceptance Criteria

### Tests That Must Pass

1. The test asserts maturity collapse, approval-semantics no-regression, index drift, full-world warn behavior, and clean-world pass — one assertion per §Acceptance bullet.
2. The test runs against a fixture-world copy and never mutates the real `worlds/<slug>/` tree.
3. `npm test --prefix tools/validators` passes with the new capstone included.

### Invariants

1. The real `worlds/<slug>/` tree is never mutated (fixture copy only).
2. Expected counts are re-enumerated from the fixture at test start, not hardcoded.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/integration/spec64-world-compatibility-coverage.test.ts` (new) — the capstone covering all five §Acceptance behaviors via the compatibility CLI path.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (covers `tsc`)
