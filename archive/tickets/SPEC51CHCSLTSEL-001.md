# SPEC51CHCSLTSEL-001: Extract shared alias-resolution + branch-locality helpers

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — refactors `tools/validators/src/structural/observer-firewall.ts` and `branch-isolation.ts` to consume new shared helper modules under `tools/validators/src/structural/`; no behavior change to either validator.
**Deps**: None

## Problem

At intake, SPEC-51's selected-commitment trace validator (ticket 002) needed to resolve existential predicates through `SE.commitment.alias_bindings` and confirm bound records are branch-local. That exact machinery already existed, but it was buried inside two validators' bodies rather than exposed as reusable helpers: `observer-firewall.ts` resolved predicate holders through `alias_bindings`, and `branchIsolation` performed the branch-locality check inline. Per SPEC-51 §Approach A.1.3 (and the reassessment finding M2 that corrected the spec from "reuse the helpers" to "extract them"), neither logic was exported as a standalone helper. Building ticket 002 on a copy of this logic would duplicate it and let the two copies drift. This ticket extracted both into shared helpers — a behavior-preserving refactor — so ticket 002 can import rather than re-implement.

## Assumption Reassessment (2026-05-20)

1. At intake, `tools/validators/src/structural/observer-firewall.ts` resolved predicate holders through `SE.commitment.alias_bindings` and treated `write_in_attempt` identically to `selected_choice`. `tools/validators/src/structural/branch-isolation.ts` exported only `branchIsolation: Validator` and skipped `bound:` prefixes during static-reference collection; the branch-locality check was inline, not a standalone export. The validators package already uses a `*-utils.ts` shared-helper convention (`clock-utils.ts`, `stplan-utils.ts`, `utils.ts`).
2. SPEC-51 §Approach A.1.3 and Deliverables A.1.3 prescribe this extraction; the reassessment (2026-05-20) corrected the deliverable wording from "reuse … helpers" to "extract … into shared helpers" precisely because no standalone helper export exists today (finding M2).
3. Cross-artifact boundary under audit: the new helper modules become a shared contract consumed by THREE call sites — `observer-firewall` (refactored here), `branchIsolation` (refactored here), and the new `chc_slt_selected_commitment_trace` validator (ticket 002). The helper signatures must accept the data surfaces all three have: the indexed `SE`/`SLT`/`PG` records and the `alias_bindings` map.
4. Canon Safety surface: `observer-firewall` is the §Story Bundles §6b Information/Observer Firewall enforcement surface. This refactor MUST preserve its behavior exactly — the extracted alias-resolution and branch-locality helpers must produce identical results to the inline logic, so the firewall is neither weakened nor silently altered. Confirm via the existing observer-firewall + branch-isolation test suites passing unchanged.

## Architecture Check

1. A single shared helper for alias-binding resolution and a single shared helper for branch-locality eliminate the duplication that would otherwise arise when ticket 002 needs the same logic; one implementation, three consumers, no drift. Following the established `*-utils.ts` convention keeps the package layout consistent.
2. No backwards-compatibility shim: the inline logic is moved, not aliased. `observer-firewall` and `branchIsolation` call the new helpers directly; the old inline code is deleted, not wrapped.

## Verification Layers

1. Behavior preservation (observer-firewall) -> existing `tools/validators/tests/structural/observer-firewall.test.ts` passes unchanged.
2. Behavior preservation (branch-isolation) -> existing `tools/validators/tests/structural/branch-isolation.test.ts` passes unchanged.
3. Helper API shape (accepts all three consumers' data surfaces) -> new helper unit tests plus `npm run build --prefix tools/validators` compiling the two current consumers; ticket 002 remains the future importer (FOUNDATIONS §6b alignment: the firewall semantics are unchanged).
4. Cross-artifact boundary -> the helper is consumed by two refactored validators here; ticket 002 is the next queued consumer.

## Landed Changes

### 1. Extract alias-binding resolution helper

Moved the `SE.commitment.alias_bindings` resolution logic out of `observer-firewall.ts` into new `tools/validators/src/structural/alias-binding-utils.ts`. The helper returns an alias-to-record map, resolves plain or `bound:`-prefixed aliases, and exposes an STENT-only convenience for actor aliases. `observer-firewall.ts` now imports and calls it.

### 2. Extract branch-locality helper

Moved branch path, owning-branch, root-page, genesis-record, and branch-locality checks out of `branch-isolation.ts` into new `tools/validators/src/structural/branch-locality-utils.ts`, including `isBranchLocal(recordId, branchContext)`. `branchIsolation` now imports and calls the shared helper.

### 3. Preserve exact semantics

Both refactors are behavior-preserving. The existing `observer-firewall` and `branch-isolation` suites pass unchanged, and new helper unit tests cover the extracted contracts ticket 002 will consume.

## Files to Touch

- `tools/validators/src/structural/alias-binding-utils.ts` (new)
- `tools/validators/src/structural/branch-locality-utils.ts` (new)
- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/src/structural/branch-isolation.ts` (modify)
- `tools/validators/tests/structural/alias-binding-utils.test.ts` (new)
- `tools/validators/tests/structural/branch-locality-utils.test.ts` (new)

## Out of Scope

- The new `chc_slt_selected_commitment_trace` validator (ticket 002).
- Any change to firewall or branch-locality SEMANTICS — this ticket is a pure extraction.
- The eligibility-validator fold (ticket 002).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators` — observer-firewall and branch-isolation suites pass unchanged (behavior preserved).
2. `npm run build --prefix tools/validators` — the new helper modules type-check and both refactored validators compile against them.
3. New helper unit tests assert: an existential alias resolves to its bound record via the alias-binding helper; a cross-branch record id returns false from `isBranchLocal`.

### Invariants

1. `observer-firewall` and `branchIsolation` produce identical verdicts before and after the extraction.
2. The extracted helpers carry no consumer-specific assumptions — their signatures accept the data surfaces all three consumers (the two refactored validators + ticket 002) provide.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/observer-firewall.test.ts` — unchanged assertions must still pass (behavior-preservation proof).
2. `tools/validators/tests/structural/branch-isolation.test.ts` — unchanged assertions must still pass.
3. `tools/validators/tests/structural/alias-binding-utils.test.ts` — asserts plain and `bound:` alias resolution plus STENT-only actor alias filtering.
4. `tools/validators/tests/structural/branch-locality-utils.test.ts` — asserts ancestor, bundle-genesis, and sibling-branch locality behavior in isolation.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators`
3. Narrow boundary: validators-package-only, because the extraction touches no other package and no skill prose; cross-package effects are deferred to ticket 002's import.

## Outcome

Completed 2026-05-20.

The alias-binding and branch-locality logic now has shared helper modules under `tools/validators/src/structural/`. `observer-firewall` and `branchIsolation` consume those helpers directly, preserving their prior behavior while giving ticket 002 a reusable import surface. The helper tests were added rather than modifying the existing behavior-preservation tests.

## Verification Result

1. `npm test --prefix tools/validators` — PASS before implementation: 678 tests passed, establishing the pre-edit validators baseline.
2. `npm run build --prefix tools/validators` — PASS after implementation.
3. From `tools/validators/`: `node --test dist/tests/structural/alias-binding-utils.test.js dist/tests/structural/branch-locality-utils.test.js dist/tests/structural/observer-firewall.test.js dist/tests/structural/branch-isolation.test.js` — PASS after implementation: 27 tests passed, including helper tests and unchanged behavior-preservation suites.
4. `npm test --prefix tools/validators` — PASS after closeout: 681 tests passed.

## Deviations

- The existing `observer-firewall` and `branch-isolation` tests were left unchanged; helper-specific assertions landed in two new co-located test files instead.
