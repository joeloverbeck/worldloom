# SPEC43PRECAUSTO-008: `entity_introduction_status_pairing` Validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/entity-introduction-status-pairing.ts` (STENT-specific introduction gate enforcing same-event STSTAT pairing). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-002.md, archive/tickets/SPEC43PRECAUSTO-003.md

## Problem

SPEC-43 §Approach D Table row 6 + §Approach C STENT rules + spec §Verification ("New `STENT` without `STSTAT` fails (`entity_intro_missing_status`)" AND "Existing-entity status update does NOT trigger pairing requirement") require an STENT-specific introduction validator that enforces: (a) every fresh STENT (new in same-event `state_delta.create[]`) must have exactly one same-event STSTAT also in `state_delta.create[]` whose `entity` field points to the new STENT; (b) the next PG's `state_snapshot.active_records.STENT[]` and `.STSTAT[]` include both. The validator's precondition is `SE.state_delta.create[]` contains at least one STENT id — existing-entity STSTAT-only updates (the common case where an entity stays alive and only life/agency/location changes) MUST NOT trigger the pairing requirement.

## Assumption Reassessment (2026-05-18)

1. STSTAT schema at `tools/validators/src/schemas/story-status.schema.json:5` requires `["id", "story_id", "created_at_page", "entity", "life", "agency", "location"]` — the foreign-key field naming the related STENT is `entity` (NOT `entity_id`). SPEC-43 §Verification originally said "New `STSTAT.entity_id` points to the new `STENT`"; the corrected field name is `STSTAT.entity` (mechanical-drift correction noted in Step 2 summary).
2. STENT schema at `tools/validators/src/schemas/story-entity.schema.json` requires `["id", "story_id", "created_at_page", "display_name", "role_in_story"]` (verified via grep). The schema does NOT carry `entity_id` (that field lives on STSTAT, not STENT).
3. Cross-skill boundary under audit: the validator's precondition is critical — checking "any STSTAT created" would over-fire on existing-entity status updates (a common case). Per SPEC-43 §Verification: "Existing-entity status update does NOT trigger pairing requirement: validator checks `STENT` IS in `SE.state_delta.create[]` before requiring pairing." The precondition is `len(SE.state_delta.create[].filter(r => r.startsWith("STENT-"))) > 0`.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) restated: STENT representation is earned by present branch utility (agency, witness role, information-source role, pressure-driver role, choice-target role), not by outline importance. The STSTAT pairing rule enforces that every fresh entity becomes immediately agency-bearing (with a status record committing life/agency/location), not a background name-drop.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story STENT creation. Critical that the precondition correctly distinguishes fresh STENT creation from existing-entity status updates — an over-firing validator would break legitimate STSTAT-only updates (e.g., entity's life changes from alive to dead after an event).
6. Live validator API correction: `Validator` objects use `severity_mode: "fail"` and an `applies_to(ctx)` predicate, not a literal `severity` / `applies_to: ["branching-story-turn-cycle"]` shape. This validator's live run-mode equivalent is full-world plus pre-apply/incremental story-bundle predicates for SE / PG / STENT / STSTAT touches.
7. Same-seam inventory/count fallout: adding a structural validator also updates `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts`. These are package proof surfaces, not separate feature scope.

## Architecture Check

1. Cleaner than alternative #1 (check "any STSTAT created → requires paired STENT"): over-fires on existing-entity STSTAT-only updates (a common case). The correct precondition direction is fresh-STENT → requires-paired-STSTAT.
2. Cleaner than alternative #2 (fold STENT checks into generic ticket-003): same per-class scoping rationale as tickets 004-007.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator; existing STSTAT schema field `entity` is unchanged.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "entityIntroductionStatusPairing\|entity_introduction_status_pairing" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific pairing enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` `STENT-3` + `STSTAT-3` case passes; `creation-fail/failure-cases.yaml` `stent-without-status` case emits `entity_intro_missing_status`.
3. No over-firing on existing-entity updates → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `lifecycle-still-valid/lifecycle-cases.yaml` `existing-entity-status-update` case (no new STENT, only STSTAT update) → 0 failures (validator's precondition correctly excludes this case).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: validator enforces immediate agency-bearing for fresh entities; never asks about outline importance.

## What to Change

### 1. Create `tools/validators/src/structural/entity-introduction-status-pairing.ts`

Validator object:
- `name: "entity_introduction_status_pairing"`.
- `severity_mode: "fail"`.
- `applies_to(ctx)` returns true for full-world validation, relevant story-bundle pre-apply plans, and incremental touched files under events/pages/entities/status.
- For each SE in the bundle:
  - Extract `freshStentIds = se.state_delta.create[].filter(id => id.startsWith("STENT-"))`. If `freshStentIds.length === 0`, skip (no pairing requirement triggered).
  - For each fresh STENT id:
    - Find STSTAT ids in `se.state_delta.create[].filter(id => id.startsWith("STSTAT-"))` whose `entity` field (per STSTAT schema) equals the fresh STENT id.
    - Verify EXACTLY ONE such paired STSTAT exists → emit `entity_intro_missing_status` if zero, `entity_intro_multiple_active_status` if more than one.
    - Verify the new child PG's `state_snapshot.active_records.STENT[]` includes the fresh STENT id AND `.STSTAT[]` includes the paired STSTAT id.
- Failure codes: `entity_intro_missing_status`, `entity_intro_multiple_active_status`.

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-007, 009-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/entity-introduction-status-pairing.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: new courier STENT + paired STSTAT in same SE → 0 failures.
- creation-fail: new STENT without paired STSTAT → emits `entity_intro_missing_status`.
- creation-fail: new STENT with two paired STSTATs in same SE → emits `entity_intro_multiple_active_status`.
- lifecycle-still-valid: existing entity, STSTAT-only update (no new STENT in create[]) → 0 failures (validator does not fire).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `entity_introduction_status_pairing` to the validator-name assertion list (coordinate with tickets 003-007, 009-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/entity-introduction-status-pairing.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/entity-introduction-status-pairing.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count assertion)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean non-story pre-apply skip assertion)
- `tools/validators/README.md` (modify — structural validator inventory/status count)

## Out of Scope

- BEL-creation discipline ("if only one actor believes the entity exists, create BEL first") — authoring rule enforced by skill prose (ticket 015), not by validator.
- Existing STENT supersession (identity mirror / role metadata changes) — owned by existing structural validators.
- Generic introduction grounding — handled by ticket 003.
- Narrative-shape field rejection on STENT — handled by ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/validators && cd tools/validators && node --test dist/tests/structural/entity-introduction-status-pairing.test.js` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "entityIntroductionStatusPairing\|entity_introduction_status_pairing" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator's precondition (fresh STENT in `state_delta.create[]`) MUST correctly distinguish from existing-entity STSTAT-only updates; over-firing on the latter would break legitimate STSTAT lifecycle updates.
2. STSTAT-to-STENT linkage is via the STSTAT schema's `entity` field (NOT `entity_id`); the validator implementation must match the actual schema field name.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/entity-introduction-status-pairing.test.ts` — 7 test cases: creation-pass, missing paired STSTAT, multiple paired STSTATs, paired STSTAT absent from child PG, existing-entity STSTAT-only update, root-bootstrap STENT creation, and run-mode scoping.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-007, 009-012 per §Step 6.5).

### Commands

1. `npm run build --prefix tools/validators && cd tools/validators && node --test dist/tests/structural/entity-introduction-status-pairing.test.js` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).

## Outcome

Completed: 2026-05-18.

Implemented `entity_introduction_status_pairing` as an additive structural validator in `tools/validators/src/structural/entity-introduction-status-pairing.ts` and registered it in `tools/validators/src/public/registry.ts`. The validator runs in full-world, relevant story-bundle pre-apply plans, and incremental event/page/entity/status touches. It fires only when an SE creates a fresh `STENT-*`, then requires exactly one same-event `STSTAT-*` whose `entity` field points at the fresh STENT and verifies the child PG active-record map carries both records.

Added focused structural tests for the creation-pass fixture, missing paired status, multiple same-event status records, missing active child-PG status, existing-entity status-only updates, root-bootstrap STENT creation, and run-mode scoping. Updated the structural registry assertion, SPEC-04 validator counts, clean non-story pre-apply skip assertions, and `tools/validators/README.md` inventory. The README update also restored the already-live `thread_introduction_grounding_integrity` inventory row, which was missing before this ticket's same-seam inventory pass.

## Verification Result

- Baseline before edits: `npm test --prefix tools/validators` passed with 452 tests, 0 failures.
- `npm run build --prefix tools/validators` passed.
- `cd tools/validators && node --test dist/tests/structural/entity-introduction-status-pairing.test.js` passed: 7 tests, 0 failures.
- `npm test --prefix tools/validators` passed: 459 tests, 0 failures.
- `grep -n "entityIntroductionStatusPairing\|entity_introduction_status_pairing" tools/validators/src/public/registry.ts` returned the import and structural registry entry.

## Deviations

- Replaced the drafted `npm test --prefix tools/validators -- entity-introduction-status-pairing` targeted command with a direct compiled Node test after package build, matching the established validator-package proof pattern.
- The implementation uses the live `Validator` API (`severity_mode` plus `applies_to(ctx)`) rather than the ticket's originally drafted literal `severity` / array `applies_to` shape.
- The package README inventory had pre-existing drift from ticket 007 (`thread_introduction_grounding_integrity` already registered but missing from the list). This ticket corrected that inventory row while adding `entity_introduction_status_pairing`.
