# VALENH-005: State snapshot integrity structural validator

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/` (new validator), `tools/validators/src/public/registry.ts` (register validator), plus focused tests under `tools/validators/tests/`.
**Deps**: none

## Problem

`branching-story-page-cycle` Phase 9 gate 10 is still operator-verified: the operator must confirm the new page's `state_snapshot` has no dangling record references and has the load-bearing fields populated. A malformed page can currently pass the machine layer when the replayed snapshot equals the authored snapshot but the snapshot itself is incomplete, sparse, or points at missing records. That weakens the runtime's agency contract because later choice/storylet eligibility depends on a complete state snapshot.

## Assumption Reassessment (2026-05-05)

1. `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md` landed Phase 9 gate 4 replay equality and explicitly out-scoped Phase 9 gate 10 as a separate structural-validator candidate.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` defines gate 10 as state_snapshot integrity: all cited records exist on disk, no dangling references, epistemic-faceted lists populated, and `entity_status`, `current_location`, `relationships_current`, and `intentions_current` populated.
3. The shared boundary under audit is the validators package's pre-apply/full-world read surface for page records and story-local records, especially PG `state_snapshot` fields that later drive storylet eligibility, branch replay, cast/location continuity, and choice consequence capacity.
4. FOUNDATIONS §Validation Rules At Story Scope says Rule 5 governs per-page consequence capacity. A sparse or dangling `state_snapshot` can hide consequences, actors, locations, or intentions from later eligibility checks, so this validator strengthens the same story-scope continuity principle without adding canon facts.
5. HARD-GATE / Canon Safety Check semantics are affected because Phase 9 is the page-cycle Canon Safety Check phase. This ticket must add enforcement without weakening Mystery Reserve firewall behavior or canon-promotion approvals.
6. Current grep evidence shows Phase 9 gate 10 is documented in `.claude/skills/branching-story-page-cycle/SKILL.md` and `references/phase-9-validation-gates.md`, but no dedicated `state_snapshot_integrity` validator is registered in `tools/validators/src/public/registry.ts`.

## Architecture Check

1. A structural validator is the clean boundary because state-snapshot presence and reference existence are deterministic data-contract checks over PG records and indexed story records. It complements, rather than duplicates, `snapshot_replay_equality`: replay equality proves transition math, while this ticket proves the resulting snapshot is structurally complete.
2. No backwards-compatibility aliasing/shims introduced. Existing operator rationale remains as audit trail; the validator adds programmatic enforcement.

## Verification Layers

1. Validator registration -> codebase grep-proof and registry test.
2. Complete representative snapshot passes -> structural validator test.
3. Dangling references fail -> structural validator test for each load-bearing snapshot reference class.
4. Missing required snapshot fields fail -> structural validator test for `current_location`, `entity_status`, `relationships_current`, `intentions_current`, and the required fact/obligation/consequence/thread lists.
5. FOUNDATIONS / HARD-GATE alignment -> manual review against `docs/FOUNDATIONS.md` and page-cycle Phase 9 gate 10 prose.

## What to Change

### 1. Add a state snapshot integrity validator

Create a structural validator, likely named `state_snapshot_integrity`, that checks PG `state_snapshot` objects for required load-bearing fields and verifies referenced story-local records resolve in the same story scope.

### 2. Register the validator

Add the validator to `tools/validators/src/public/registry.ts` so relevant pre-apply and full-world validation paths run it.

### 3. Add focused tests

Add tests for a complete snapshot, missing required fields, dangling IDs in lists/maps, and same-story scoping.

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count if applicable)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — execution expectation if applicable)

## Out of Scope

- Snapshot replay equality; landed in `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md`.
- Recursive branch-isolation graph closure; completed separately by `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`.
- Semantic choice consequence-capacity; Phase 9 gate 9 remains a separate concern.
- Changing page-cycle skill prose unless reassessment proves a factual handoff correction is required.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/validators` succeeds.
2. `node --test dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/registry.test.js` from `tools/validators` passes.
3. `npm test` from `tools/validators` passes.

### Invariants

1. PG `state_snapshot` contains all load-bearing fields required by Phase 9 gate 10.
2. Every story-local ID cited by required snapshot fields resolves to an indexed or pre-apply materialized record in the same story scope.
3. Missing or dangling snapshot references produce fail verdicts with field-level detail.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — complete, missing-field, dangling-reference, and story-scope fixtures.
2. `tools/validators/tests/structural/registry.test.ts` — assert validator registration.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirm pre-apply execution behavior if the validator has an `applies_to` predicate.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/registry.test.js`
3. `cd tools/validators && npm test`
