# SPEC43PRECAUSTO-009: `relationship_introduction_grounding_integrity` Validator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (SREL-specific introduction gate). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-002.md, archive/tickets/SPEC43PRECAUSTO-003.md

## Problem

SPEC-43 §Approach D Table row 7 + §Approach C SREL rules + spec §Verification ("Believed-only relationship as `SREL` fails or warns") require an SREL-specific introduction validator that enforces: (a) every fresh SREL's `participants[]` are active STENT records in parent PG or created in same SE; (b) `derived_from[]` is non-empty; (c) no duplicate active SREL with the same participants/axis/direction (warn-level, unless justified by a different axis). Without this validator, a "planned future romance" SREL could land before the relationship constrains branch-local state — exactly the §5c-prohibited "planned trajectory" anti-pattern.

## Assumption Reassessment (2026-05-18)

1. SREL schema at `tools/validators/src/schemas/story-relationship.schema.json` requires `["id", "story_id", "created_at_page", "axis", "participants", "direction", "value", "valence", "description"]` (verified via grep). `derived_from` is a field (line 75) but NOT in the required list — meaning the schema permits empty `derived_from[]`. This validator enforces non-empty `derived_from[]` AS A MID-STORY-CREATION-SPECIFIC RULE.
2. `valence` enum at line 73 is `["symmetric", "asymmetric", "bidirectional", "adversarial"]` (NOT `positive`/`negative`/`neutral` — noting this for the validator's duplicate-axis detection logic if it inspects valence).
3. Cross-skill boundary under audit: this validator composes with the existing tickets 003 (generic gate) and Phase 9 (turn-cycle). The Validator object's `applies_to` field must include `branching-story-turn-cycle`.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) restated: SREL tracks current objective branch-local relationship constraints, not planned emotional trajectory. The `derived_from[]` non-empty + participants-active rule enforces this at mid-story-creation time — every new SREL must be grounded in a present event (a witnessed action, an exchanged oath, a recorded obligation) or in a current branch fact.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story SREL creation. Observer firewall on relationship-grounded choices is handled separately by ticket 011 (`introduction_observer_firewall`).

## Architecture Check

1. Cleaner than alternative #1 (extend STQ/STSEC existing validator pattern): no existing SREL-grounding validator — this is the first SREL introduction integrity gate. Same per-class scoping rationale as tickets 004-008.
2. Cleaner than alternative #2 (warning-only on duplicate-axis): the spec specifies fail-level for participants/derived_from grounding, warn-level for duplicate-axis (unless supersession justifies it). Splitting severities preserves the spec's nuance.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "relationshipIntroductionGroundingIntegrity\|relationship_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific grounding enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` `SREL-1` case passes; `creation-fail/failure-cases.yaml` `srel-participant-inactive` case emits `srel_intro_participant_inactive`.
3. Believed-only relationship handling → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-fail/failure-cases.yaml` `believed-only-relationship` case → warn-level finding (per SPEC-43 §Approach D Table: "fail/warn" — implementation choice; recommend warn-level when only BEL grounding exists and the truth is uncertain).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: validator enforces present-causal grounding; never asks about planned emotional trajectory.

## What to Change

### 1. Create `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts`

Validator object:
- `name: "relationship_introduction_grounding_integrity"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"` (with warn-level sub-codes for duplicate-axis and believed-only cases).
- For each SREL record whose `created_at_page` is the new child PG (mid-story-created), verify:
  - Every id in `participants[]` resolves to a STENT record active at parent PG OR created in same SE.
  - `derived_from[]` is non-empty.
  - No other active SREL exists with the same participants AND same axis AND same direction (warn-level; unless this SREL has `supersedes:` pointing at the other one).
- Failure codes: `srel_intro_participant_inactive` (fail), `srel_intro_missing_derived_from` (fail), `srel_intro_duplicate_axis` (warn).

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-008, 010-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: oath of loyalty between two active STENTs, derived_from = [SE-creating, BEL-witness] → 0 failures.
- creation-fail: SREL participant not in parent + not in same-event create[] → emits `srel_intro_participant_inactive`.
- creation-fail: SREL derived_from empty → emits `srel_intro_missing_derived_from`.
- creation-warn: SREL duplicate of existing active SREL on same axis/participants/direction (no supersedes link) → emits `srel_intro_duplicate_axis` (warn-level).
- creation-pass: SREL supersedes existing active SREL on same axis/participants → 0 failures (the supersedes link justifies the apparent duplicate).
- lifecycle-still-valid: existing SREL superseded (no new participants) → 0 failures.

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `relationship_introduction_grounding_integrity` to the validator-name assertion list (coordinate with tickets 003-008, 010-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — registry count assertion)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean non-story pre-apply skip assertion)
- `tools/validators/README.md` (modify — structural validator inventory/status count)

## Out of Scope

- BEL-vs-SREL discipline ("if only believed, use BEL, not objective SREL") — authoring rule enforced by skill prose (ticket 015), not by validator.
- Observer firewall on relationship-grounded choices — handled by ticket 011.
- Existing SREL supersession lifecycle — owned by existing structural validators.
- Generic introduction grounding — handled by ticket 003.
- Narrative-shape field rejection on SREL — handled by ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "relationshipIntroductionGroundingIntegrity\|relationship_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on mid-story-created SREL records; root-bootstrapped SREL is unaffected.
2. Duplicate-axis warning suppresses when `supersedes:` field is populated — supersession is the legitimate "replace an existing SREL with a new one on the same axis" path.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/relationship-introduction-grounding-integrity.test.ts` — 6 test cases per §What to Change item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-008, 010-012 per §Step 6.5).
3. `tools/validators/tests/integration/spec04-verification.test.ts` — updates active structural/total validator counts.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — confirms the validator is skipped for clean non-story pre-apply plans.

### Commands

1. `npm run build --prefix tools/validators && cd tools/validators && node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js` (targeted test pass).
2. `cd tools/validators && node --test --test-name-pattern "clean pre-apply" dist/tests/integration/validate-patch-plan.test.js` (clean non-story pre-apply skip proof).
3. `npm test --prefix tools/validators` (full validator package test pass).

## Outcome

Completed: 2026-05-18.

Implemented `relationship_introduction_grounding_integrity` as an additive structural validator in `tools/validators/src/structural/relationship-introduction-grounding-integrity.ts` and registered it in `tools/validators/src/public/registry.ts`. The validator runs for full-world validation, relevant story-bundle pre-apply plans, and incremental touches to SE / PG / SREL / STENT files. It enforces mid-story SREL participant grounding against parent-active or same-event-created STENT records, requires non-empty `derived_from[]`, and emits a warn-level duplicate-axis finding when a fresh SREL duplicates an active relationship without `supersedes`.

Added focused structural tests covering the shared creation-pass SREL fixture, inactive participant failure, empty `derived_from[]` failure, duplicate-axis warning, supersedes suppression, lifecycle non-introduction behavior, same-event STENT participants, and selector scoping. Updated registry, validator count, README inventory, and clean non-story pre-apply skip assertions so the package's broader guardrails remain truthful.

## Verification Result

- `node --test dist/tests/structural/relationship-introduction-grounding-integrity.test.js` passed after `npm run build --prefix tools/validators`: 8 tests, 0 failures.
- `node --test --test-name-pattern "clean pre-apply" dist/tests/integration/validate-patch-plan.test.js` passed from `tools/validators`: 1 test, 0 failures.
- `npm test --prefix tools/validators` passed: 467 tests, 0 failures.
- `grep -n "relationshipIntroductionGroundingIntegrity\|relationship_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returned the import and structural registry entry.

## Deviations

- The drafted `npm test --prefix tools/validators -- relationship-introduction-grounding-integrity` targeted command is not a true narrow target in this package because the package script runs the compiled glob and treats extra arguments as additional paths. The actual narrow proof used the compiled test directly after build.
- The live validator API uses `severity_mode` plus `applies_to(ctx)`, not a literal `applies_to: ["branching-story-turn-cycle"]` list. The implementation records the equivalent live run-mode predicate.
- The ticket's "believed-only relationship" fixture proves the objective-SREL shortfall through empty `derived_from[]` and therefore emits fail-level `srel_intro_missing_derived_from`; broader BEL-vs-SREL authoring discipline remains out of scope for ticket 015 as originally drafted.
