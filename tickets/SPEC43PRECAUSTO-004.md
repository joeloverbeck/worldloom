# SPEC43PRECAUSTO-004: `clock_introduction_grounding_integrity` Validator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/clock-introduction-grounding-integrity.ts` (CLK-specific introduction gate). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-001.md, 002, 003

## Problem

SPEC-43 §Approach D Table row 2 + §Approach C CLK rules + spec §Verification ("Vague-pressure `CLK` fails (`clock_intro_missing_grounding_link`)") require a CLK-specific introduction validator that runs after the generic grounding gate (ticket 003) and adds class-specific checks: non-empty `driver`, valid `max`, valid `thresholds[]`, and at least one grounding record in `linked_records[]` that is active in the parent PG or created in the same SE. Without this validator, vague-pressure CLKs ("the scene feels too calm; start a danger clock") would pass the generic gate but violate SPEC-43 §5c discipline — a CLK without a present driver is exactly the "danger clock because the author wants pressure" anti-pattern the spec rejects.

## Assumption Reassessment (2026-05-18)

1. CLK schema at `tools/validators/src/schemas/story-pressure-clock.schema.json` requires `driver`, `max`, `thresholds`, and `linked_records` per the SPEC-42-landed schema. `linked_records[]` is constrained to 8 classes (`THR | OBL | CNSQ | STINT | SREL | STLOC | STOBJ | STQ`) per `tools/validators/src/schemas/story-pressure-clock.schema.json:39`. Widening this pattern to BEL / SF / DA / STENT is explicitly deferred to Wave 3 per SPEC-43 §Out of Scope.
2. SPEC-43 §Approach C CLK rules specify the validator's checks; SPEC-43 §Verification names two pass + one fail test case (deadline declared with grounding pass; vague pressure no driver/link fails; existing-clock tick remains valid — the negative case where the validator should NOT fire).
3. Cross-skill boundary under audit: this validator is one of 6 class-specific introduction validators composing with the generic ticket-003 gate; the composition pattern (generic gate runs first → per-class gate runs after) is shared across tickets 004-009. The Validator object's `applies_to` field must include `branching-story-turn-cycle` (Phase 9).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State) restated: every CLK's `driver` field must name a present pressure source (the staged-pressure rule of SPEC-42), and every CLK's `linked_records[]` must include a record active in current branch state. The validator enforces both at mid-story-creation time; existing CLK lifecycle is unaffected.
5. HARD-GATE / Canon Safety surface: per-commit Phase 9 gate gating mid-story CLK creation. Does not weaken Mystery Reserve firewall (no MR interaction).

## Architecture Check

1. Cleaner than alternative #1 (fold CLK checks into generic ticket-003 validator): the generic validator must remain class-agnostic so it can be reasoned about and tested independently. Class-specific concerns (CLK driver/linked-records, STSEC truth_anchor, STQ source_event) live in per-class validators.
2. Cleaner than alternative #2 (extend existing `clock-firing-threshold-integrity.ts`): that validator gates existing-clock lifecycle (tick provenance, threshold crossing). Mid-story creation is a structurally different concern; conflating them would force every clock-lifecycle test to also exercise creation grounding.
3. No backwards-compatibility aliasing/shims introduced: purely additive new validator. The shared `clock-utils.ts` helper module continues to be the canonical location for CLK-shape utilities; this validator may import from it.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "clockIntroductionGroundingIntegrity\|clock_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.
2. Class-specific grounding enforcement → schema validation: ticket 002's `creation-pass/clk-deadline-declared/` fixture passes; `creation-fail/clk-vague-pressure/` fixture emits `clock_intro_missing_grounding_link` (or the equivalent named failure code per SPEC-43 §Approach D Table).
3. Composition with generic gate → schema validation: a fixture failing generic grounding (e.g., missing tag) surfaces ticket-003's failure code; a fixture failing CLK-specific grounding (e.g., missing driver) surfaces this validator's failure code; both codes can coexist on a fixture failing both gates.
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: no future-shape predicates referenced (no `expected_payoff_mode`, no act position, no climax — those are validated by ticket 010's `narrative_shape_field_rejection`).

## What to Change

### 1. Create `tools/validators/src/structural/clock-introduction-grounding-integrity.ts`

Validator object:
- `name: "clock_introduction_grounding_integrity"`.
- `applies_to: ["branching-story-turn-cycle"]`.
- `severity: "fail"`.
- For each CLK record whose `created_at_page` is the new child PG (i.e., mid-story-created), verify:
  - `driver` is non-empty.
  - `max` is a positive integer ≥1.
  - `thresholds[]` is non-empty AND every threshold's `at` is in `[1, max]`.
  - `linked_records[]` is non-empty AND at least one linked record is active in the parent PG's `state_snapshot.active_records.<class>[]` OR appears in the creating SE's `state_delta.create[]`.
- Failure codes: `clock_intro_missing_driver`, `clock_intro_missing_linked_record`, `clock_intro_link_not_active`, `clock_intro_missing_grounding_link` (the spec-named umbrella code emitted when no linked_records resolve to active/same-event records).

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003, 005-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/clock-introduction-grounding-integrity.test.ts`

Test cases (using ticket 002's fixtures):
- creation-pass for CLK (deadline declared with grounding THR/OBL) → 0 failures.
- creation-fail: CLK missing driver → emits `clock_intro_missing_driver`.
- creation-fail: CLK with no linked_records[] → emits `clock_intro_missing_grounding_link`.
- creation-fail: CLK linked to a record absent from parent + absent from same-event create[] → emits `clock_intro_link_not_active`.
- lifecycle-still-valid: existing CLK tick (no new creation) → 0 failures (validator does not fire on lifecycle updates).

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `clock_introduction_grounding_integrity` to the validator-name assertion list.

## Files to Touch

- `tools/validators/src/structural/clock-introduction-grounding-integrity.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/clock-introduction-grounding-integrity.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- Widening CLK `linked_records[]` to allow BEL / SF / DA / STENT grounding — deferred to Wave 3 per SPEC-43 §Out of Scope.
- Existing CLK lifecycle integrity (tick provenance, firing threshold crossing) — already covered by existing validators.
- Generic introduction grounding (state_delta membership, created_at match, tag parses, evidence ids exist) — handled by ticket 003.
- Narrative-shape field rejection on CLK — handled by ticket 010.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- clock-introduction-grounding-integrity` (test file passes).
2. `npm test --prefix tools/validators` (full validator package test pass).
3. `grep -n "clockIntroductionGroundingIntegrity\|clock_introduction_grounding_integrity" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The validator fires ONLY on mid-story-created CLK records (where `created_at_page` is a non-root PG); root-bootstrapped CLKs (created at PG-1 by `branching-story-bootstrap`) are unaffected.
2. Existing-CLK lifecycle ops (tick, resolve) never trigger this validator — the existing `clock_tick_provenance` / `clock_firing_threshold_integrity` validators retain ownership of the lifecycle surface.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/clock-introduction-grounding-integrity.test.ts` — 5 test cases per scoping in §What to Change item 3; uses ticket 002's fixtures.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003, 005-012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- clock-introduction-grounding-integrity` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
