# VALENH-005: State snapshot integrity structural validator

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/structural/` (new validator), `tools/validators/src/public/registry.ts` (register validator), plus focused tests under `tools/validators/tests/`.
**Deps**: none

## Problem

At intake, `branching-story-page-cycle` Phase 9 gate 10 was still operator-verified: the operator had to confirm the new page's `state_snapshot` had no dangling record references and had the load-bearing fields populated. A malformed page could pass the machine layer when the replayed snapshot equaled the authored snapshot but the snapshot itself was incomplete, sparse, or pointed at missing records. That weakened the runtime's agency contract because later choice/storylet eligibility depends on a complete state snapshot.

## Assumption Reassessment (2026-05-05)

1. `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md` landed Phase 9 gate 4 replay equality and explicitly out-scoped Phase 9 gate 10 as a separate structural-validator candidate.
2. `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` defines gate 10 as state_snapshot integrity: all cited records exist on disk, no dangling references, epistemic-faceted lists populated, and `entity_status`, `current_location`, `relationships_current`, and `intentions_current` populated.
3. The shared boundary under audit is the validators package's pre-apply/full-world read surface for page records and story-local records, especially PG `state_snapshot` fields that later drive storylet eligibility, branch replay, cast/location continuity, and choice consequence capacity.
4. FOUNDATIONS §Validation Rules At Story Scope says Rule 5 governs per-page consequence capacity. A sparse or dangling `state_snapshot` can hide consequences, actors, locations, or intentions from later eligibility checks, so this validator strengthens the same story-scope continuity principle without adding canon facts.
5. HARD-GATE / Canon Safety Check semantics are affected because Phase 9 is the page-cycle Canon Safety Check phase. This ticket must add enforcement without weakening Mystery Reserve firewall behavior or canon-promotion approvals.
6. Intake grep evidence showed Phase 9 gate 10 documented in `.claude/skills/branching-story-page-cycle/SKILL.md` and `references/phase-9-validation-gates.md`, but no dedicated `state_snapshot_integrity` validator registered in `tools/validators/src/public/registry.ts`.

## Architecture Check

1. A structural validator is the clean boundary because state-snapshot presence and reference existence are deterministic data-contract checks over PG records and indexed story records. It complements, rather than duplicates, `snapshot_replay_equality`: replay equality proves transition math, while this ticket proves the resulting snapshot is structurally complete.
2. No backwards-compatibility aliasing/shims introduced. Existing operator rationale remains as audit trail; the validator adds programmatic enforcement.

## Verification Layers

1. Validator registration -> codebase grep-proof and registry test.
2. Complete representative snapshot passes -> structural validator test.
3. Dangling references fail -> structural validator test for each load-bearing snapshot reference class.
4. Missing required snapshot fields fail -> structural validator test for `current_location`, `entity_status`, `relationships_current`, `intentions_current`, and the required fact/obligation/consequence/thread lists.
5. FOUNDATIONS / HARD-GATE alignment -> manual review against `docs/FOUNDATIONS.md` and page-cycle Phase 9 gate 10 prose.

## Landed Changes

### 1. Added a state snapshot integrity validator

Added `state_snapshot_integrity` as a PG-create-only structural validator. It checks new PG `state_snapshot` objects for the Phase 9 gate 10 load-bearing field set, including fact facets, obligation/consequence/thread lists, `current_location`, `relationships_current`, `intentions_current`, `inventory_by_entity`, and `entity_status`.

The validator also walks story-local IDs inside the snapshot and rejects dangling references unless the ID resolves to a same-story indexed or pre-apply materialized record. World-level IDs with the same visible shape, such as a world-level `DA-NNNN` artifact, remain legal and are not treated as missing story-bundle records.

### 2. Registered the validator

Registered the validator in `tools/validators/src/public/registry.ts` so pre-apply validation runs it automatically for Shape B `create_pg_record` plans. Non-PG plans skip it with the existing `applies_to=false` execution behavior.

### 3. Added focused tests

Added focused structural tests for a complete snapshot, missing required fields, dangling snapshot references, same-story scoping, world-level artifact ID allowance, and non-PG skip behavior. Updated registry, README, and integration tests so structural validator counts and pre-apply execution expectations include `state_snapshot_integrity`.

## Files to Touch

- `tools/validators/src/structural/state-snapshot-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/README.md` (modify — validator inventory)
- `tools/validators/tests/structural/state-snapshot-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — execution expectation)

## Out of Scope

- Snapshot replay equality; landed in `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md`.
- Recursive branch-isolation graph closure; completed separately by `archive/tickets/VALENH-004-recursive-reference-closure-structural-validator.md`.
- Semantic choice consequence-capacity; Phase 9 gate 9 remains a separate concern.
- Changing page-cycle skill prose unless reassessment proves a factual handoff correction is required.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` from `tools/validators` succeeds.
2. `node --test dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec04-verification.test.js` from `tools/validators` passes.
3. `npm test` from `tools/validators` passes.

### Invariants

1. PG `state_snapshot` contains all load-bearing fields required by Phase 9 gate 10.
2. Every story-local ID cited by required snapshot fields resolves to an indexed or pre-apply materialized record in the same story scope.
3. Missing or dangling snapshot references produce fail verdicts with field-level detail.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/state-snapshot-integrity.test.ts` — complete, missing-field, dangling-reference, and story-scope fixtures.
2. `tools/validators/tests/structural/registry.test.ts` — assert validator registration.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirms non-PG plans skip the PG-only validator and Shape B page plans execute it.
4. `tools/validators/tests/integration/spec04-verification.test.ts` — updates active structural and total mechanized validator counts.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec04-verification.test.js`
3. `cd tools/validators && npm test`

## Outcome

Completion date: 2026-05-05.

Implemented `state_snapshot_integrity` as a structural pre-apply validator in `tools/validators`. The validator anchors on newly-created PG records, enforces the required snapshot field shape, resolves story-local IDs in the same `story_slug`, emits `state_snapshot_integrity.missing_required_field` for missing/malformed snapshot fields, and emits `state_snapshot_integrity.dangling_reference` for unresolved snapshot references.

The validator is registered in the structural registry, listed in the validators README inventory, and covered by direct structural tests plus `validatePatchPlan` integration coverage for Shape B page ops.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/state-snapshot-integrity.test.js dist/tests/structural/registry.test.js dist/tests/integration/validate-patch-plan.test.js dist/tests/integration/spec04-verification.test.js` — passed.
3. `cd tools/validators && npm test` — passed, 125/125 tests. The suite emitted Git's default-branch-name hint from a temp git fixture; it was non-fatal and unrelated to the ticket.

## Deviations

- `tools/validators/tests/integration/validate-patch-plan.test.ts` and `tools/validators/tests/integration/spec04-verification.test.ts` were both required, not optional, because the new PG-only validator changes the pre-apply execution table and the active mechanized-validator counts.
