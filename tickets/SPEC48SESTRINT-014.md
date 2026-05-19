# SPEC48SESTRINT-014: Enforce `record_introductions[].record_id` uniqueness beyond JSON Schema exact-object checks

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds validator-layer enforcement for a SPEC-48 structured-field invariant
**Deps**: archive/tickets/SPEC48SESTRINT-001.md, SPEC48SESTRINT-003

## Problem

SPEC48SESTRINT-001 lands `SE.record_introductions[]` in JSON Schema and uses standard `uniqueItems`, which rejects identical duplicate objects but cannot enforce uniqueness by the dynamic `record_id` property when the rest of the object differs. SPEC-48 still needs the stronger invariant: one SE event must not introduce the same `record_id` twice with conflicting class, trigger, evidence, or rationale.

## Assumption Reassessment (2026-05-19)

1. `tools/validators/src/schemas/story-event.schema.json` carries `record_introductions[]` as an optional array after SPEC48SESTRINT-001, but standard JSON Schema does not provide dynamic property-key uniqueness for array items.
2. SPEC48SESTRINT-003 owns the typed reader seam for `SE.record_introductions[]`; this ticket depends on that reader so uniqueness enforcement is implemented once against the same parsed structured-field surface consumed by later validators.
3. Cross-artifact boundary under audit: schema-level exact-object rejection remains in `story-event.schema.json`; dynamic keyed uniqueness belongs in the validator layer that runs under `record_schema_compliance` / structural validation paths for `create_se_record`.
4. FOUNDATIONS alignment: this preserves story-bundle schema minimalism while preventing ambiguous machine-readable provenance. It does not mutate canon or weaken any HARD-GATE path.

## Architecture Check

1. Enforcing dynamic `record_id` uniqueness in a structural validator is cleaner than adding a nonstandard Ajv keyword or changing the accepted record shape to a mapping object. It keeps the public YAML shape from SPEC-48 intact and avoids a package dependency solely for one array-key constraint.
2. No backwards-compatibility aliasing or tag-parser fallback is introduced.

## Verification Layers

1. Duplicate `record_id` with differing item bodies rejects -> focused validator test using `SE.record_introductions[]`.
2. Distinct `record_id` entries still pass -> focused validator positive test.
3. Exact duplicate object rejection remains schema-covered by SPEC48SESTRINT-001 -> no duplicate schema logic is reimplemented here.

## What to Change

### 1. Add validator-layer uniqueness check

Add a small structural validator or extend the SPEC48SESTRINT-003 typed-reader support surface so an SE record with two `record_introductions[]` entries sharing the same `record_id` emits a fail verdict.

### 2. Add focused tests

Add positive and negative tests proving duplicate `record_id` entries are rejected even when the two entries are not identical objects, while distinct introductions pass.

## Files to Touch

- `tools/validators/src/structural/` (modify/add validator or utility-adjacent check)
- `tools/validators/tests/structural/` (modify/add focused tests)
- `tools/validators/src/structural/registry.ts` (modify, if implemented as a standalone validator)
- `tools/validators/README.md` (modify, if implemented as a standalone validator)

## Out of Scope

- Rewriting the `record_introductions[]` YAML shape into a mapping object.
- Adding nonstandard Ajv keywords or new schema dependencies.
- Refactoring tag-parser consumers; those remain with SPEC48SESTRINT-003 through SPEC48SESTRINT-009.

## Acceptance Criteria

### Tests That Must Pass

1. Focused structural test rejects two `record_introductions[]` entries with the same `record_id` and different field values.
2. Focused structural test accepts distinct `record_id` entries.
3. `npm test --prefix tools/validators` passes after the validator-layer change.

### Invariants

1. `SE.record_introductions[]` remains an array of structured entries.
2. The schema remains additive-only; uniqueness-by-property is enforced outside JSON Schema standard keywords.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/<new-or-existing-test>.test.ts` — duplicate `record_id` rejection and distinct-id acceptance.

### Commands

1. `npm test --prefix tools/validators`
