# SPEC44STOSTAAPP-007: expected witness coverage reassessment

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — live `expected_witness_coverage` already provides the semantic coverage validator; this ticket truthed SPEC-44 and downstream capstone prose to the live validator name and schema boundary.
**Deps**: None

## Problem

SPEC-44 originally called for a new `propagation_exception_integrity` validator that would enforce non-propagation coverage for an `SE.expected_witnesses` field. Live reassessment showed that this split was stale in two ways:

1. `tools/validators/src/structural/expected-witness-coverage.ts` already performs the semantic witness-coverage work and is registered as a `fail` structural validator.
2. `tools/validators/src/schemas/story-event.schema.json` has no `expected_witnesses` field and uses `additionalProperties: false`, so adding a validator over that field would create a phantom contract rather than enforce the live SE schema.

The remaining owned work is therefore ticket/spec truthing, not a new validator.

## Assumption Reassessment (2026-05-18)

1. `tools/validators/src/structural/non-propagation-tag-shape.ts` validates parseable `non_propagation:<reason>(group=<label>, records=[...])` tag syntax and explicitly states that full witness coverage belongs to sibling validator `expected_witness_coverage`.
2. `tools/validators/src/structural/expected-witness-coverage.ts` is the live semantic validator. It runs in full-world mode, pre-apply plans that create SE records, and incremental touched-SE paths; it computes direct witnesses from active STSTAT/STLOC state, checks same-event BEL propagation, accepts valid non-propagation tags, and enforces the DA-anchored indirect propagation route.
3. `tools/validators/src/public/registry.ts` already registers `expected_witness_coverage` at fail severity, and `tools/validators/tests/structural/expected-witness-coverage.test.ts` already covers missing BEL propagation, partial BEL coverage, wrong group labels, valid non-propagation tags, indirect DA propagation, and pre-apply scoping.
4. `tools/validators/src/schemas/story-event.schema.json` does not include `expected_witnesses`. The schema is closed with `additionalProperties: false`, so the drafted `expected_witnesses`-field validator would contradict the live schema and SPEC-44's own schema-minimalism claim that no new fields are added.
5. **Cross-boundary surface under audit**: the correct two-validator layering is `non_propagation_tag_shape` for tag syntax plus `expected_witness_coverage` for semantic coverage. The active SPEC-44 and capstone ticket were stale where they still named `propagation_exception_integrity`.
6. **FOUNDATIONS principle**: `docs/FOUNDATIONS.md` §Story Bundles §6b separates move/choice observer firewall from post-event propagation. This ticket preserves the existing post-event propagation validator instead of introducing a second name over the same gate.
7. **Canon Safety surface touched**: no validator behavior changed. This run only corrected ticket/spec/capstone prose, so it does not weaken the Mystery Reserve firewall or any pre-apply gate.

## Architecture Check

1. Reusing `expected_witness_coverage` is cleaner than adding `propagation_exception_integrity`: it preserves the existing single semantic enforcement point and avoids duplicate or conflicting verdicts over the same SE propagation contract.
2. No backwards-compatibility shim or alias validator was introduced. The obsolete validator name was removed from active SPEC-44 and capstone expectations instead.

## Verification Layers

1. **Semantic coverage already registered** -> codebase grep/manual review: `tools/validators/src/public/registry.ts` registers `expected_witness_coverage`, and `tools/validators/src/structural/expected-witness-coverage.ts` exports the live fail-severity validator.
2. **Tag syntax remains separate** -> codebase grep/manual review: `tools/validators/src/structural/non-propagation-tag-shape.ts` remains the syntax validator and points coverage to `expected_witness_coverage`.
3. **No phantom SE field added** -> schema review: `tools/validators/src/schemas/story-event.schema.json` remains closed and contains no `expected_witnesses` property.
4. **Regression proof** -> existing focused test: `npm test --prefix tools/validators -- expected-witness-coverage non-propagation-tag-shape` passes.

## What Changed

### 1. Truth active ticket/spec wording

- Replaced this ticket's stale implementation request with a completed reassessment that names the live validator boundary.
- Updated `specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` Phase 3 and verification text to use `expected_witness_coverage`.
- Updated `archive/tickets/SPEC44STOSTAAPP-009.md` so the capstone test expects the live validator, not `propagation_exception_integrity`.

## Files to Touch

- `archive/tickets/SPEC44STOSTAAPP-007.md` (modify)
- `specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md` (modify)
- `archive/tickets/SPEC44STOSTAAPP-009.md` (modify)

## Out of Scope

- Adding `tools/validators/src/structural/propagation-exception-integrity.ts`.
- Adding an `expected_witnesses` field to the SE schema.
- Changing `expected_witness_coverage` behavior.
- Changing `non_propagation_tag_shape` behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/validators -- expected-witness-coverage non-propagation-tag-shape` exits 0.
2. `git diff --check -- archive/tickets/SPEC44STOSTAAPP-007.md specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md archive/tickets/SPEC44STOSTAAPP-009.md` exits 0.

### Invariants

1. The live semantic coverage validator remains `expected_witness_coverage`.
2. The live tag-syntax validator remains `non_propagation_tag_shape`.
3. No code, schema, registry, or test file introduces `propagation_exception_integrity`.
4. Active SPEC-44/capstone prose no longer asks a later ticket to depend on the nonexistent validator.

## Test Plan

### New/Modified Tests

1. None — the implementation is ticket/spec truthing over already-registered validator behavior.

### Commands

1. `npm test --prefix tools/validators -- expected-witness-coverage non-propagation-tag-shape`
2. `git diff --check -- archive/tickets/SPEC44STOSTAAPP-007.md specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md archive/tickets/SPEC44STOSTAAPP-009.md`

## Outcome

Completed: 2026-05-18.

What changed:
- Reassessed the drafted `propagation_exception_integrity` ticket against the live validator package.
- Confirmed the intended semantic coverage already belongs to `expected_witness_coverage`.
- Corrected SPEC-44 and the capstone ticket to reference the live validator name and avoid a phantom `expected_witnesses` schema field.

Deviations from original plan:
- No new validator or tests were added. The original plan would have duplicated the existing semantic validator and depended on a non-existent closed-schema field.

Verification results:
- `npm test --prefix tools/validators -- expected-witness-coverage non-propagation-tag-shape` exited 0.
- `git diff --check -- archive/tickets/SPEC44STOSTAAPP-007.md specs/SPEC-44-story-state-append-only-lifecycle-and-schema-correctness.md archive/tickets/SPEC44STOSTAAPP-009.md` exited 0.
