# SPEC48SESTRINT-014: Enforce `record_introductions[].record_id` uniqueness beyond JSON Schema exact-object checks

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `record_introduction_uniqueness` structural validator for a SPEC-48 structured-field invariant
**Deps**: archive/tickets/SPEC48SESTRINT-001.md, archive/tickets/SPEC48SESTRINT-003.md

## Problem

SPEC48SESTRINT-001 lands `SE.record_introductions[]` in JSON Schema and uses standard `uniqueItems`, which rejects identical duplicate objects but cannot enforce uniqueness by the dynamic `record_id` property when the rest of the object differs. SPEC-48 still needs the stronger invariant: one SE event must not introduce the same `record_id` twice with conflicting class, trigger, evidence, or rationale.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-event.schema.json` carries `record_introductions[]` as an optional array after SPEC48SESTRINT-001, but standard JSON Schema does not provide dynamic property-key uniqueness for array items.
2. SPEC48SESTRINT-003 owns the typed reader seam for `SE.record_introductions[]`; this ticket depends on that reader so uniqueness enforcement is implemented once against the same parsed structured-field surface consumed by later validators.
3. Cross-artifact boundary under audit: schema-level exact-object rejection remains in `story-event.schema.json`; dynamic keyed uniqueness belongs in the structural validator layer that runs in full-world, incremental touched-SE, and `create_se_record` pre-apply paths.
4. FOUNDATIONS alignment: this preserves story-bundle schema minimalism while preventing ambiguous machine-readable provenance. It does not mutate canon or weaken any HARD-GATE path.
5. HARD-GATE read was required and completed because the new structural validator can affect pre-apply / `validate_patch_plan` behavior. The landed validator is fail-closed for duplicate introductions and skipped for non-SE patch plans.
6. Same-seam inventory found registry and documentation/count fallout: adding a standalone validator required updates to `tools/validators/src/public/registry.ts`, `tools/validators/tests/structural/registry.test.ts`, `tools/validators/tests/integration/spec04-verification.test.ts`, `tools/validators/tests/integration/validate-patch-plan.test.ts`, and `tools/validators/README.md`.

## Architecture Check

1. Enforcing dynamic `record_id` uniqueness in a structural validator is cleaner than adding a nonstandard Ajv keyword or changing the accepted record shape to a mapping object. It keeps the public YAML shape from SPEC-48 intact and avoids a package dependency solely for one array-key constraint.
2. No backwards-compatibility aliasing or tag-parser fallback is introduced.

## Verification Layers

1. Duplicate `record_id` with differing item bodies rejects -> focused validator test using `SE.record_introductions[]`.
2. Distinct `record_id` entries still pass -> focused validator positive test.
3. Exact duplicate object rejection remains schema-covered by SPEC48SESTRINT-001 -> no duplicate schema logic is reimplemented here.

## What to Change

### 1. Add validator-layer uniqueness check

Added `tools/validators/src/structural/record-introduction-uniqueness.ts`, a standalone structural validator that reads introductions through `readSeIntroductions(event)` and emits `record_introduction_duplicate_record_id` for duplicate `record_id` values on one SE record.

### 2. Add focused tests

Added positive, negative, and pre-apply scoping coverage in `tools/validators/tests/structural/record-introduction-uniqueness.test.ts`.

### 3. Register and truth inventory surfaces

Registered `record_introduction_uniqueness` in the structural validator registry, updated registry/order assertions, updated the SPEC-04 capstone structural/total validator counts, updated the clean pre-apply integration skip inventory, and updated the validators README inventory/count.

## Files to Touch

- `tools/validators/src/structural/record-introduction-uniqueness.ts` (new)
- `tools/validators/tests/structural/record-introduction-uniqueness.test.ts` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/README.md` (modify)

## Out of Scope

- Rewriting the `record_introductions[]` YAML shape into a mapping object.
- Adding nonstandard Ajv keywords or new schema dependencies.
- Refactoring tag-parser consumers; those remain with SPEC48SESTRINT-003 through SPEC48SESTRINT-009.

## Acceptance Criteria

### Tests That Must Pass

1. Focused structural test rejects two `record_introductions[]` entries with the same `record_id` and different field values.
2. Focused structural test accepts distinct `record_id` entries.
3. Focused structural test confirms the validator runs for `create_se_record` pre-apply plans and skips unrelated patch-plan ops.
4. `npm test` passes from `tools/validators`.

### Invariants

1. `SE.record_introductions[]` remains an array of structured entries.
2. The schema remains additive-only; uniqueness-by-property is enforced outside JSON Schema standard keywords.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-introduction-uniqueness.test.ts` — duplicate `record_id` rejection, distinct-id acceptance, and pre-apply scoping.
2. `tools/validators/tests/structural/registry.test.ts` — registry inventory includes `record_introduction_uniqueness`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` — structural and total validator counts updated to 72 / 84.
4. `tools/validators/tests/integration/validate-patch-plan.test.ts` — clean non-SE pre-apply plan expects `record_introduction_uniqueness` to skip.

### Commands

1. `npm test` from `tools/validators`

## Outcome

Completed on 2026-05-19.

Added `record_introduction_uniqueness` as a standalone structural validator for SE records. It rejects duplicate `record_introductions[].record_id` entries even when the duplicate entries differ in trigger, evidence, `distinct_from`, or rationale, while preserving the public `record_introductions[]` array shape and leaving exact duplicate object rejection to JSON Schema `uniqueItems`.

The validator is registered in the package structural registry and participates in full-world, incremental touched-SE, and `create_se_record` pre-apply paths. Non-SE pre-apply plans skip it, preserving clean canon-only patch-plan behavior.

## Verification Result

- Baseline before edits: `npm test` from `tools/validators` passed with 617 tests.
- Focused proof after edits: `npm run build` from `tools/validators` passed.
- Focused proof after edits: `node --test dist/tests/structural/record-introduction-uniqueness.test.js` passed with 3 tests.
- Same-seam integration proof after broad-suite fallout fix: `node --test dist/tests/integration/validate-patch-plan.test.js` passed with 18 tests.
- Final package proof: `npm test` from `tools/validators` passed with 620 tests.
- Manual review: `docs/FOUNDATIONS.md` story-bundle schema-minimalism / observer-firewall principles remain aligned; this ticket adds fail-closed validation without direct canon writes, migration tooling, or tag-parser fallback.

## Deviations

- Implemented as a standalone structural validator rather than an extension inside the typed-reader utility so the enforcement emits a normal validator verdict and participates in pre-apply / full-world execution telemetry.
- Broad package proof initially failed because `validate-patch-plan.test.ts` treated the new validator as a pass-row for a non-SE clean plan. The correct behavior is `applies_to=false` / skipped for canon-only plans, so the same-seam integration skip inventory was updated.
