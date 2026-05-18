# SPEC43PRECAUSTO-010: `narrative_shape_field_rejection` Validator (Per-Class Extension)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — new `tools/validators/src/structural/narrative-shape-field-rejection.ts` (extends per-class prohibition of narrative-shape fields beyond the existing STQ-only check at `record-schema-compliance.ts:177-193` to CLK / STSEC / THR / SREL / STENT). Registered in `tools/validators/src/public/registry.ts` (shared file with 8 other SPEC-43 tickets per §Step 6.5).
**Deps**: archive/tickets/SPEC43PRECAUSTO-002.md

## Problem

At intake, SPEC-43 §Approach D Table row 9 + §Approach C non-goals + spec §Verification required a validator that extends the existing STQ prohibition (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, `kind: moral_question`, `holders[]`) to also cover CLK / STSEC / THR / SREL / STENT records. This ticket landed that additive validator; fresh CLK / STSEC / THR / SREL / STENT records now fail when they carry top-level narrative-shape fields.

## Assumption Reassessment (2026-05-18)

1. Existing `record-schema-compliance.ts` carries the STQ-only prohibition with 9 named direct field checks (`expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`, `holders`). Verified via grep before implementation. The new validator extends only the 8 narrative-shape fields to CLK / STSEC / THR / SREL / STENT; `holders` remains STQ-specific and is not duplicated.
2. SPEC-43 §Approach D scoping note: "extends per-class prohibition coverage to CLK/STSEC/THR/SREL/STENT beyond the existing STQ check". The new validator is purely additive — the existing STQ-only checks in `record-schema-compliance.ts` remain intact (STQ has its OWN hard-reject path at `record_schema_compliance` per the existing line 731 reference); the new validator runs alongside and covers the 5 newly-extended classes.
3. Cross-skill boundary under audit: the new validator is registered as a separate Validator object rather than extending `record-schema-compliance.ts` directly — keeps the existing STQ-specific surface stable. The live validator framework scopes validators by run mode, patch-plan ops, and touched files rather than by skill name; the landed `applies_to` covers full-world runs, pre-apply plans that create CLK / STSEC / THR / SREL / STENT records, and incremental touched-file paths for the same five classes.
4. FOUNDATIONS §Story Bundles §5c (Present Causal State, Not Narrative Shape) restated: the engine tracks what is true now and what that licenses next; never asks where the story "should" be in a dramatic arc. The prohibited field list (act_position, midpoint, climax, dramatic_curve_position, tension_arc, expected_chapter, scene_sequence) is the operational expression of §5c — any record carrying these fields encodes future dramatic shape rather than present causal state.
5. HARD-GATE / Canon Safety surface: per-commit gate at `record_schema_compliance` family. The new validator extends the per-class prohibition surface; preserves the existing STQ-specific gate logic unchanged.
6. Same-seam inventory fallout: `tools/validators/README.md` stated 43 structural validators and listed the current structural inventory, and `tools/validators/tests/integration/spec04-verification.test.ts` asserted structural/combined registry counts. Those surfaces are same-package validator inventory/proof surfaces and move with this registry addition.

## Architecture Check

1. Cleaner than alternative #1 (extend `record-schema-compliance.ts` with new per-class checks): that file is large and houses the STQ prohibition. Extending it with 5 more per-class blocks would inflate the file and risk cross-class test coupling. A separate Validator object keeps the new prohibition isolated.
2. Cleaner than alternative #2 (single validator that takes the prohibited-field list as a parameter and applies to all classes): the existing STQ check at `record-schema-compliance.ts:177-193` cannot be easily parameterized without rewriting that validator's surface; a fresh per-class validator is the lower-risk path.
3. No backwards-compatibility aliasing/shims introduced: existing STQ prohibition in `record-schema-compliance.ts` is unchanged; the new validator is purely additive.

## Verification Layers

1. Validator registration → codebase grep-proof: `grep -n "narrativeShapeFieldRejection\|narrative_shape_field_rejection" tools/validators/src/public/registry.ts` returns import + array entry.
2. Per-class prohibition enforcement → schema validation: `archive/tickets/SPEC43PRECAUSTO-002.md`'s `narrative-shape-fail/prohibited-fields.yaml` cases (one per class with a prohibited field — CLK with `expected_payoff_mode`, STSEC with `act_position`, etc.) each emit `narrative_shape_forbidden_field`.
3. STQ prohibition preserved → schema validation: existing `record_schema_compliance` STQ tests continue to pass (the new validator does not duplicate or override the existing STQ-only gate).
4. FOUNDATIONS §5c alignment → FOUNDATIONS alignment check: prohibited-field list matches `story-record-schemas.md:720-731` STQ prohibition + extends to CLK/STSEC/THR/SREL/STENT.

## Landed Changes

### 1. `tools/validators/src/structural/narrative-shape-field-rejection.ts`

Landed Validator object:
- `name: "narrative_shape_field_rejection"`.
- `applies_to`: full-world, pre-apply plans with create ops for the five covered classes, and incremental touched files for those class subdirectories.
- `severity: "fail"`.
- Prohibited field list: `expected_payoff_mode`, `act_position`, `midpoint`, `climax`, `dramatic_curve_position`, `tension_arc`, `expected_chapter`, `scene_sequence`. (NOTE: `holders[]` and `kind: moral_question` are STQ-specific and remain owned by the existing `record_schema_compliance` STQ check; the new validator covers only the 8 narrative-shape fields applicable across all classes.)
- For each CLK / STSEC / THR / SREL / STENT record in the bundle, verify no top-level field is in the prohibited list.
- Failure code: `narrative_shape_forbidden_field` (with the offending field name in the message).

### 2. Registry and inventory

Added the import + array entry in `tools/validators/src/public/registry.ts`, added the structural registry assertion row, updated the SPEC-04 structural/combined validator counts, and updated the validator inventory/count in `tools/validators/README.md`.

### 3. `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts`

Landed fixture-backed rejection coverage for the shared `narrative-shape-fail/prohibited-fields.yaml` cases, clean covered-class acceptance coverage, STQ non-duplication coverage, and `applies_to` scoping coverage. The test adapter normalizes the historical fixture's old thread/relationship node labels to the live validator node-type vocabulary.

### 4. Pre-apply clean-plan execution status

Updated `tools/validators/tests/integration/validate-patch-plan.test.ts` so the clean CF-only pre-apply plan expects `narrative_shape_field_rejection` to be intentionally skipped, matching the landed selector.

## Files to Touch

- `tools/validators/src/structural/narrative-shape-field-rejection.ts` (new)
- `tools/validators/src/public/registry.ts` (modify — shared with 8 sibling tickets)
- `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts` (new)
- `tools/validators/tests/structural/registry.test.ts` (modify — shared with sibling validator tickets)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — structural validator count witness)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — clean pre-apply skip expectation)
- `tools/validators/README.md` (modify — validator inventory/count)

## Out of Scope

- Existing STQ prohibition at `record-schema-compliance.ts:177-193` — unchanged.
- STQ-specific extra-prohibited fields (`kind: moral_question`, `holders[]`) — those remain owned by the existing STQ check.
- New record class additions (no schema changes; just new prohibition coverage).

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/validators` (producer build pass).
2. `node --test tools/validators/dist/tests/structural/narrative-shape-field-rejection.test.js` (focused test file passes).
3. `node --test tools/validators/dist/tests/structural/record-schema-compliance-story-question.test.js` (existing STQ tests continue to pass).
4. `npm test --prefix tools/validators` (full validator package test pass).
5. `grep -n "narrativeShapeFieldRejection\|narrative_shape_field_rejection" tools/validators/src/public/registry.ts` returns import + array entry.

### Invariants

1. The new validator covers the 5 new classes (CLK / STSEC / THR / SREL / STENT); STQ remains covered by the existing `record-schema-compliance.ts` STQ check. Splitting the surface this way preserves the existing STQ-specific test coverage.
2. The prohibited-field list is anchored in FOUNDATIONS §Story Bundles §5c + `story-record-schemas.md:720-731`; any new prohibited field added in the future must update both the prohibited-field constant AND the contract documentation.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/narrative-shape-field-rejection.test.ts` — fixture-backed rejection tests, clean covered-class acceptance, STQ non-duplication, and `applies_to` scoping.
2. `tools/validators/tests/structural/registry.test.ts` (modify) — adds the new validator to the name assertion.
3. `tools/validators/tests/integration/spec04-verification.test.ts` (modify) — updates the structural/combined registry counts.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify) — records clean-plan selector skip behavior.

### Commands

1. `npm run build --prefix tools/validators` (fresh compiled output).
2. `node --test tools/validators/dist/tests/structural/narrative-shape-field-rejection.test.js` (focused validator proof).
3. `node --test tools/validators/dist/tests/structural/record-schema-compliance-story-question.test.js` (STQ preservation proof).
4. `npm test --prefix tools/validators` (full validator package proof).

## Outcome

Completed: 2026-05-18.

Implemented `narrative_shape_field_rejection` as a new additive structural validator for CLK / STSEC / THR / SREL / STENT records. The validator emits `narrative_shape_forbidden_field` for top-level narrative-shape fields and deliberately does not duplicate STQ-specific `record_schema_compliance` checks. Registry, README inventory, registry-count tests, and clean pre-apply selector expectations were updated with the new validator.

## Verification Result

1. `npm test --prefix tools/validators` passed before implementation as a clean baseline: 467 tests passed.
2. `npm run build --prefix tools/validators` passed after implementation.
3. `node --test tools/validators/dist/tests/structural/narrative-shape-field-rejection.test.js` initially exposed test-adapter drift from the shared YAML fixture (`file_path` absent; old thread/relationship node labels). After correcting the adapter to synthesize paths and normalize to live node types, it passed: 4 tests passed.
4. `node --test tools/validators/dist/tests/structural/record-schema-compliance-story-question.test.js` passed: 5 tests passed, proving the existing STQ path remains intact.
5. `npm test --prefix tools/validators` initially exposed same-seam clean pre-apply execution-status fallout for the new validator skip. After updating `validate-patch-plan.test.ts`, it passed: 471 tests passed.
6. Manual FOUNDATIONS alignment check: the prohibited-field list enforces §Story Bundles §5c present-causal-state discipline for the five newly covered classes while leaving STQ-specific `holders` handling in `record_schema_compliance`.

## Deviations

1. The drafted `applies_to` wording named story skills directly. The live validator framework does not carry skill names in `Context`; the landed selector uses run mode, patch-plan create ops, and touched-file paths.
2. The shared narrative-shape YAML fixture was authored with historical node-type labels for THR/SREL and omitted `file_path`. The new test adapts that fixture to the live structural authority rather than changing the shared fixture in this ticket.
3. Same-seam inventory/proof fallout added `tools/validators/README.md`, `tools/validators/tests/integration/spec04-verification.test.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` to the landed file set.
