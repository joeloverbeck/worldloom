# SPEC43PRECAUSTO-010: `narrative_shape_field_rejection` Validator (Per-Class Extension)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/narrative-shape-field-rejection.ts` (extends per-class prohibition of narrative-shape fields beyond the existing STQ-only check at `record-schema-compliance.ts:177-193` to CLK / STSEC / THR / SREL / STENT). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: 002

## Problem

SPEC-43 §Approach D Table row 9 + §Approach C non-goals + spec §Verification ("Future-shape `CLK` / `STSEC` / `THR` / `SREL` / `STENT` fail: same validator extends rejection per-class") require a validator that extends the existing STQ prohibition (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, `kind: moral_question`, `holders[]`) at `record-schema-compliance.ts:177-193` to also cover CLK / STSEC / THR / SREL / STENT records — these classes have not previously had explicit narrative-shape prohibitions. Without this validator, a fresh CLK could land with `act_position: midpoint`, a fresh THR with `dramatic_curve_position: rising_action`, etc., drifting into the §5c-prohibited future-shape territory.

## Assumption Reassessment (2026-05-18)

1. Existing `record-schema-compliance.ts` at lines 177-193 carries the STQ-only prohibition with 5 named forbidden fields (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`). Verified via grep. The new validator extends to CLK / STSEC / THR / SREL / STENT using the same field list (plus the additional STQ-only fields `tension_arc`, `expected_chapter`, `scene_sequence` per SPEC-43 §Verification).
2. SPEC-43 §Approach D scoping note: "extends per-class prohibition coverage to CLK/STSEC/THR/SREL/STENT beyond the existing STQ check". The new validator is purely additive — the existing STQ-only checks in `record-schema-compliance.ts` remain intact (STQ has its OWN hard-reject path at `record_schema_compliance` per the existing line 731 reference); the new validator runs alongside and covers the 5 newly-extended classes.
3. Cross-skill boundary under audit: the new validator is registered as a separate Validator object rather than extending `record-schema-compliance.ts` directly — keeps the existing STQ-specific surface stable. The Validator object's `applies_to` field must include `branching-story-turn-cycle` (Phase 9 gate; also any other story-pipeline skill that produces these records).
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) restated: the engine tracks what is true now and what that licenses next; never asks where the story "should" be in a dramatic arc. The prohibited field list (act_position, midpoint, climax, dramatic_curve_position, tension_arc, expected_chapter, scene_sequence) is the operational expression of §5c — any record carrying these fields encodes future dramatic shape rather than present causal state.
5. HARD-GATE / Canon Safety surface: per-commit gate at `record_schema_compliance` family. The new validator extends the per-class prohibition surface; preserves the existing STQ-specific gate logic unchanged.

## Architecture Check

1. Cleaner than alternative #1 (extend `record-schema-compliance.ts` with new per-class checks): that file is large and houses the STQ prohibition. Extending it with 5 more per-class blocks would inflate the file and risk cross-class test coupling. A separate Validator object keeps the new prohibition isolated.
2. Cleaner than alternative #2 (single validator that takes the prohibited-field list as a parameter and applies to all classes): the existing STQ check at `record-schema-compliance.ts:177-193` cannot be easily parameterized without rewriting that validator's surface; a fresh per-class validator is the lower-risk path.
3. No backwards-compatibility aliasing/shims introduced: existing STQ prohibition in `record-schema-compliance.ts` is unchanged; the new validator is purely additive.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "narrativeShapeFieldRejection\|narrative_shape_field_rejection" tools/validators/src/public/registry.ts` returns import + array entry.
2. Per-class prohibition enforcement → schema validation: ticket 002's `narrative-shape-fail/` fixtures (one per class with a prohibited field — CLK with `expected_payoff_mode`, STSEC with `midpoint`, etc.) each emit `narrative_shape_forbidden_field`.
3. STQ prohibition preserved → schema validation: existing `record_schema_compliance` STQ tests continue to pass (the new validator does not duplicate or override the existing STQ-only gate).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: prohibited-field list matches `story-record-schemas.md:720-731` STQ prohibition + extends to CLK/STSEC/THR/SREL/STENT.

## What to Change

### 1. Create `tools/validators/src/structural/narrative-shape-field-rejection.ts`

Validator object:
- `name: "narrative_shape_field_rejection"`.
- `applies_to: ["branching-story-turn-cycle", "branching-story-bootstrap", "commitment-block-authoring"]` (any skill producing these records).
- `severity: "fail"`.
- Prohibited field list: `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`. (NOTE: `holders[]` and `kind: moral_question` are STQ-specific and remain owned by the existing `record_schema_compliance` STQ check; the new validator covers only the 8 narrative-shape fields applicable across all classes.)
- For each CLK / STSEC / THR / SREL / STENT record in the bundle, verify no top-level field is in the prohibited list.
- Failure code: `narrative_shape_forbidden_field` (with the offending field name in the message).

### 2. Register in `tools/validators/src/public/registry.ts`

Add import + array entry (coordinate slot ordering with tickets 003-009, 011-012 per §Step 6.5).

### 3. Add test `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts`

Test cases (using ticket 002's `narrative-shape-fail/` fixtures):
- CLK with `expected_payoff_mode` → emits `narrative_shape_forbidden_field`.
- STSEC with `midpoint` → emits `narrative_shape_forbidden_field`.
- THR with `act_position` → emits `narrative_shape_forbidden_field`.
- SREL with `climax` → emits `narrative_shape_forbidden_field`.
- STENT with `dramatic_curve_position` → emits `narrative_shape_forbidden_field`.
- Clean CLK / STSEC / THR / SREL / STENT records (no prohibited fields) → 0 failures.

### 4. Update `tools/validators/tests/structural/registry.test.ts`

Add `narrative_shape_field_rejection` to the validator-name assertion list (coordinate with tickets 003-009, 011-012 per §Step 6.5).

## Files to Touch

- `tools/validators/src/structural/narrative-shape-field-rejection.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with 8 sibling tickets)

## Out of Scope

- Existing STQ prohibition at `record-schema-compliance.ts:177-193` — unchanged.
- STQ-specific extra-prohibited fields (`kind: moral_question`, `holders[]`) — those remain owned by the existing STQ check.
- New record class additions (no schema changes; just new prohibition coverage).

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- narrative-shape-field-rejection` (test file passes).
2. `npm test --prefix tools/validators -- record-schema-compliance` (existing STQ tests continue to pass).
3. `npm test --prefix tools/validators` (full validator package test pass).
4. `grep -n "narrativeShapeFieldRejection\|narrative_shape_field_rejection" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The new validator covers the 5 new classes (CLK / STSEC / THR / SREL / STENT); STQ remains covered by the existing `record-schema-compliance.ts` STQ check. Splitting the surface this way preserves the existing STQ-specific test coverage.
2. The prohibited-field list is anchored in FOUNDATIONS §Story Bundles §5c + `story-record-schemas.md:720-731`; any new prohibited field added in the future must update both the prohibited-field constant AND the contract documentation.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts` — 6 test cases per §What to Change item 3.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion (coordinate with tickets 003-009, 011-012 per §Step 6.5).

### Commands

1. `npm test --prefix tools/validators -- narrative-shape-field-rejection` (targeted test pass).
2. `npm test --prefix tools/validators` (full validator package test pass).
