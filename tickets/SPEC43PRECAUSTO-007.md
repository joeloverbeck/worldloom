# SPEC43PRECAUSTO-007: `thread_introduction_grounding_integrity` Validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` (THR-specific introduction gate). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, archive/tickets/SPEC43PRECAUSTO-002.md, archive/tickets/SPEC43PRECAUSTO-003.md

## Problem

SPEC-43 §Approach D Table row 5 + §Approach C THR rules + spec §Verification ("Thematic `THR` fails: no grounding, named as theme/arc") require a THR-specific introduction validator that enforces: (a) mid-story-created THR has non-empty `derived_from[]`; (b) every grounding record in `derived_from[]` is active in the parent PG OR created in the same SE. Without this validator, a "thematic" thread (e.g., "The corruption arc") could land with no grounding, drifting into the §5c-prohibited "thread as theme/arc label" anti-pattern.

## Assumption Reassessment (2026-05-18)

1. THR schema at `tools/validators/src/schemas/story-thread.schema.json` requires `["id", "story_id", "created_at_page", "status", "title", "summary", "urgency"]` (verified via grep). `derived_from` is a field (line 15) but NOT in the required list — meaning the schema permits empty `derived_from[]`. This validator enforces non-empty `derived_from[]` AS A MID-STORY-CREATION-SPECIFIC RULE (the spec language: "Mid-story `THR` must have non-empty grounding evidence and active/same-event records"); root-bootstrapped THR may still have empty derived_from per the bootstrap skill's discretion.
2. SPEC-43 §Approach C THR rules name the closed grounding-record classes: `SE | SF | BEL | OBL | CNSQ | STINT | SREL | DA`. The validator checks that every derived_from[] id is one of these classes AND is active in parent OR created in same SE.
3. Cross-skill boundary under audit: this validator composes with the existing tickets 003 (generic gate) and Phase 9 (turn-cycle). The Validator object's `applies_to` field must include `branching-story-turn-cycle`.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) restated: a thread is an ongoing causal concern with state consequences, not a narrative arc. The `derived_from[]` non-empty rule enforces this at mid-story-creation time — every new THR must be grounded in present branch state (a recorded fact, a current obligation, a pending consequence, an active relationship), never in future plot structure.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story THR creation.

## Architecture Check

1. Cleaner than alternative #1 (extend STQ existing validator pattern): no existing THR-grounding validator — this is the first THR introduction integrity gate. Same per-class scoping rationale as tickets 004-006.
2. Cleaner than alternative #2 (warning-only): a thread without grounding silently passes existing validators (THR schema permits empty derived_from); making this a fail-level validator at mid-story creation catches the anti-pattern early.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator; existing THR shape is unchanged.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "threadIntroductionGroundingIntegrity\|thread_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific grounding enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `creation-pass/all-classes.yaml` `THR-1` case passes; `creation-fail/failure-cases.yaml` `thematic-thread` case (thread titled as a thematic arc with empty `derived_from`) emits `thread_intro_missing_derived_from` or `thread_intro_grounding_missing`.
3. Composition with generic gate → schema validation: a fixture failing generic grounding surfaces ticket 003's codes; a fixture failing THR-specific grounding surfaces this validator's codes.
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: validator never inspects thematic content (the rule is "derived_from non-empty AND grounded", not "title doesn't contain 'arc'"); §5c discipline is enforced through structural grounding requirements, not through text-mining.

## What to Change

### 1. Create `tools/validators/src/structural/thread-introduction-grounding-integrity.ts`

Validator object:
- `name: "thread_introduction_grounding_integrity"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"`.
- For each THR record whose `created_at_page` is the new child PG (mid-story-created), verify:
  - `derived_from[]` is non-empty.
  - Every id in `derived_from[]` resolves to a record active at parent PG OR appears in the creating SE's `state_delta.create[]`.
- Failure codes: `thread_intro_missing_derived_from`, `thread_intro_grounding_missing`.

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-006, 008-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass: investigation line opened, derived_from = [SE-creating, CNSQ-prior] → 0 failures.
- creation-fail: thematic thread, derived_from empty → emits `thread_intro_missing_derived_from`.
- creation-fail: thread derived_from references an id absent from parent + absent from same-event create[] → emits `thread_intro_grounding_missing`.
- lifecycle-still-valid: existing THR superseded (no new creation) → 0 failures (validator does not fire on supersession).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `thread_introduction_grounding_integrity` to the validator-name assertion list (coordinate with tickets 003-006, 008-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/thread-introduction-grounding-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- THR text-mining ("does the title contain 'arc' or 'theme'?") — §5c discipline is enforced structurally, not textually.
- Existing THR lifecycle (supersession, status transitions) — owned by general structural validators.
- Generic introduction grounding — handled by ticket 003.
- Narrative-shape field rejection on THR — handled by ticket 010.
- Duplicate-active-thread warning ("optional warning for duplicate active thread with same title/tag/driver" per SPEC-43 §Approach D Table) — deferred; current scope is fail-only.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- thread-introduction-grounding-integrity` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "threadIntroductionGroundingIntegrity\|thread_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on mid-story-created THR records; root-bootstrapped THR is unaffected.
2. Existing THR supersession lifecycle is unaffected; the validator does not run on THR records whose `created_at_page` is the root or a prior page.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/thread-introduction-grounding-integrity.test.ts` — 4 test cases per §What to Change item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-006, 008-012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- thread-introduction-grounding-integrity` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
