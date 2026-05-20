# SPEC51CHCSLTSEL-001: Extract shared alias-resolution + branch-locality helpers

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — refactors `tools/validators/src/structural/observer-firewall.ts` and `branch-isolation.ts` to consume new shared helper modules under `tools/validators/src/structural/`; no behavior change to either validator.
**Deps**: None

## Problem

SPEC-51's selected-commitment trace validator (ticket 002) must resolve existential predicates through `SE.commitment.alias_bindings` and confirm bound records are branch-local. That exact machinery already exists, but it is buried inside two validators' bodies rather than exposed as reusable helpers: `observer-firewall.ts` resolves predicate holders through `alias_bindings` at runtime (lines 161-164, 385-403), and `branchIsolation` performs the branch-locality check inline. Per SPEC-51 §Approach A.1.3 (and the reassessment finding M2 that corrected the spec from "reuse the helpers" to "extract them"), neither logic is exported as a standalone helper today. Building ticket 002 on a copy of this logic would duplicate it and let the two copies drift. This ticket extracts both into shared helpers — a behavior-preserving refactor — so ticket 002 imports rather than re-implements.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/structural/observer-firewall.ts` resolves predicate holders through `SE.commitment.alias_bindings` (verified: lines 161-164, 385-403) and treats `write_in_attempt` identically to `selected_choice` (line 35). `tools/validators/src/structural/branch-isolation.ts` exports only `branchIsolation: Validator` (verified: line 14) and skips `bound:` prefixes during static-reference collection (lines 215-216); the branch-locality check is inline, not a standalone export. The validators package already uses a `*-utils.ts` shared-helper convention (`clock-utils.ts`, `stplan-utils.ts`, `utils.ts`).
2. SPEC-51 §Approach A.1.3 and Deliverables A.1.3 prescribe this extraction; the reassessment (2026-05-20) corrected the deliverable wording from "reuse … helpers" to "extract … into shared helpers" precisely because no standalone helper export exists today (finding M2).
3. Cross-artifact boundary under audit: the new helper modules become a shared contract consumed by THREE call sites — `observer-firewall` (refactored here), `branchIsolation` (refactored here), and the new `chc_slt_selected_commitment_trace` validator (ticket 002). The helper signatures must accept the data surfaces all three have: the indexed `SE`/`SLT`/`PG` records and the `alias_bindings` map.
4. Canon Safety surface: `observer-firewall` is the §Story Bundles §6b Information/Observer Firewall enforcement surface. This refactor MUST preserve its behavior exactly — the extracted alias-resolution and branch-locality helpers must produce identical results to the inline logic, so the firewall is neither weakened nor silently altered. Confirm via the existing observer-firewall + branch-isolation test suites passing unchanged.

## Architecture Check

1. A single shared helper for alias-binding resolution and a single shared helper for branch-locality eliminate the duplication that would otherwise arise when ticket 002 needs the same logic; one implementation, three consumers, no drift. Following the established `*-utils.ts` convention keeps the package layout consistent.
2. No backwards-compatibility shim: the inline logic is moved, not aliased. `observer-firewall` and `branchIsolation` call the new helpers directly; the old inline code is deleted, not wrapped.

## Verification Layers

1. Behavior preservation (observer-firewall) -> existing `tools/validators/tests/structural/observer-firewall.test.ts` passes unchanged.
2. Behavior preservation (branch-isolation) -> existing `tools/validators/tests/structural/branch-isolation.test.ts` passes unchanged.
3. Helper API shape (accepts all three consumers' data surfaces) -> new helper unit tests + ticket 002's import compiling against the same signatures (FOUNDATIONS §6b alignment: the firewall semantics are unchanged).
4. Cross-artifact boundary -> the helper is consumed by two refactored validators here and one new validator in 002; the package `npm run build` proves the type contract holds across consumers.

## What to Change

### 1. Extract alias-binding resolution helper

Move the `SE.commitment.alias_bindings` resolution logic out of `observer-firewall.ts` into a new `tools/validators/src/structural/alias-binding-utils.ts` exporting a function that, given an indexed `SE` event, returns the alias→record map and resolves a predicate alias to its bound record (class + activeness checks left to the caller). Refactor `observer-firewall.ts` to import and call it.

### 2. Extract branch-locality helper

Move the branch-locality check out of `branch-isolation.ts` into a new `tools/validators/src/structural/branch-locality-utils.ts` exporting a predicate `isBranchLocal(recordId, branchContext)`. Refactor `branchIsolation` to import and call it.

### 3. Preserve exact semantics

Both refactors are behavior-preserving. Do not change which records the firewall blocks, which bindings resolve, or which records count as branch-local. The diff is a move + import, not a logic change.

## Files to Touch

- `tools/validators/src/structural/alias-binding-utils.ts` (new)
- `tools/validators/src/structural/branch-locality-utils.ts` (new)
- `tools/validators/src/structural/observer-firewall.ts` (modify)
- `tools/validators/src/structural/branch-isolation.ts` (modify)
- `tools/validators/tests/structural/observer-firewall.test.ts` (modify — only if helper extraction surfaces a unit-test seam worth asserting; otherwise unchanged)
- `tools/validators/tests/structural/branch-isolation.test.ts` (modify — same caveat)

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
3. New helper unit tests co-located per package convention — assert resolution + locality helpers in isolation.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators`
3. Narrow boundary: validators-package-only, because the extraction touches no other package and no skill prose; cross-package effects are deferred to ticket 002's import.
