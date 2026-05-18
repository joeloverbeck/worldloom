# SPEC43PRECAUSTO-006: `story_question_introduction_grounding_integrity` Validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/story-question-introduction-grounding-integrity.ts` (STQ-specific introduction gate; extends or runs alongside existing `story-question-grounding-integrity.ts`). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-002.md, 003

## Problem

SPEC-43 §Approach D Table row 4 + §Approach C STQ rules + spec §Verification ("Future-shape `STQ` fails (`narrative_shape_forbidden_field`): `expected_payoff_mode` or `climax` field present") require an STQ-specific introduction validator that enforces: (a) for mid-story-created STQ, `source_event` equals the creating `SE`; (b) `source_records[]` exists in the bundle and is active at `created_at_page` (parent PG or same-event-created). Without this validator, an STQ could land with a `source_event` pointing at an unrelated past event, breaking the "same-event authority" corollary of SPEC-43 §Approach A. The existing `story-question-grounding-integrity.ts` validator covers general STQ grounding; this new validator extends it with mid-story-creation specific gates.

## Assumption Reassessment (2026-05-18)

1. STQ schema at `tools/validators/src/schemas/story-question.schema.json` requires `["id", "story_id", "created_at_page", "setup_kind", "source_event", "source_records", "status"]` (verified via grep). `source_event` is required and typed `^SE-(0|[1-9][0-9]*)$` (line 29). `source_records[]` is required (line 30). `answer_records[]` is optional (line 43). Existing `story-question-grounding-integrity.ts` validator (in the structural/ directory listing) gates general STQ grounding; this new validator adds the mid-story-creation `source_event = creating SE` check.
2. SPEC-43 §Approach C STQ rules specify the validator's checks; SPEC-43 §Approach D Table row 4 names the failure codes `stq_intro_source_event_mismatch`, `stq_intro_source_not_active`.
3. Cross-skill boundary under audit: this validator extends the existing `story_question_grounding_integrity` validator's surface. Per the spec's wording ("extends `story_question_grounding_integrity` or sibling"), the implementation may either (a) register as a separate Validator object running alongside the existing one, or (b) extend the existing validator's check list with the mid-story-specific gates. Implementer choice — recommendation: register separately for cleaner test isolation, parallel to other per-class introduction validators (004 / 005 / 007 / 008 / 009).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) restated: STQ tracks PRESENT open-setup state, not FUTURE dramatic obligation. The `source_event = creating SE` rule enforces this at mid-story-creation time — the STQ must be born from the just-committed event, not from some earlier event being retconned into a future-shape promise.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story STQ creation. Does not weaken Mystery Reserve firewall (STQ does not interact with MR directly).

## Architecture Check

1. Cleaner than alternative #1 (extend existing `story-question-grounding-integrity.ts`): registering a separate Validator object keeps the existing validator's surface stable + test coverage focused. The mid-story-creation checks are sufficiently distinct (mid-story-only vs. all-STQ) to warrant separate identity.
2. Cleaner than alternative #2 (fold STQ checks into generic ticket-003): same per-class scoping rationale as tickets 004-005.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator; existing `story-question-grounding-integrity.ts` + `story-question-payoff-integrity.ts` + `story-question-setup-predates-payoff.ts` + `story-question-terminal-debt.ts` validators unchanged.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "storyQuestionIntroductionGroundingIntegrity\|story_question_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific grounding enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` `STQ-1` case passes; `creation-fail/failure-cases.yaml` `stq-source-event-mismatch` case (where `source_event` points to an earlier SE, not the creating one) emits `stq_intro_source_event_mismatch`.
3. Composition with existing STQ validators → schema validation: a fixture that passes this validator continues to pass `story_question_grounding_integrity` + `story_question_payoff_integrity` + `story_question_setup_predates_payoff` (those validators are out of scope here).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: the validator never references future-shape predicates; STQ.setup_kind enum is preserved per existing schema.

## What to Change

### 1. Create `tools/validators/src/structural/story-question-introduction-grounding-integrity.ts`

Validator object:
- `name: "story_question_introduction_grounding_integrity"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"`.
- For each STQ record whose `created_at_page` is the new child PG (mid-story-created), verify:
  - `source_event` equals the creating SE (the SE that introduces this STQ via `state_delta.create[]`).
  - Every id in `source_records[]` resolves to a record active at `created_at_page` (parent PG `state_snapshot.active_records.<class>[]` OR same-event `state_delta.create[]`).
- Failure codes: `stq_intro_source_event_mismatch`, `stq_intro_source_not_active`.

May import shared STQ-shape helpers from `story-question-utils.ts` (verified to exist in `tools/validators/src/structural/` listing).

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-005, 007-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/story-question-introduction-grounding-integrity.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: promise made via a DA letter, source_event = creating SE, source_records = [DA-letter-id, BEL-claim-id] → 0 failures.
- creation-fail: STQ source_event points to an earlier SE, not the creating one → emits `stq_intro_source_event_mismatch`.
- creation-fail: STQ source_records[] includes an id absent from parent active_records AND absent from same-event create[] → emits `stq_intro_source_not_active`.
- lifecycle-still-valid: existing STQ answered via `answer_records[]` (no new creation) → 0 failures (validator does not fire on lifecycle).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `story_question_introduction_grounding_integrity` to the validator-name assertion list (coordinate with tickets 003-005, 007-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/story-question-introduction-grounding-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/story-question-introduction-grounding-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- General STQ grounding (covered by existing `story_question_grounding_integrity` validator).
- STQ payoff integrity / setup-predates-payoff / terminal debt (covered by existing validators).
- Narrative-shape field rejection on STQ — already enforced for STQ at `record_schema_compliance.ts:177-193`; ticket 010 extends this to other classes.
- Generic introduction grounding — handled by ticket 003.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- story-question-introduction-grounding-integrity` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "storyQuestionIntroductionGroundingIntegrity\|story_question_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on mid-story-created STQ records (where `created_at_page` is a non-root PG); root-bootstrapped STQs are unaffected.
2. Existing STQ grounding / payoff / terminal-debt validators retain ownership of their respective surfaces; this validator adds the mid-story-creation source_event check without re-implementing them.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/story-question-introduction-grounding-integrity.test.ts` — 4 test cases per §What to Change item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-005, 007-012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- story-question-introduction-grounding-integrity` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
