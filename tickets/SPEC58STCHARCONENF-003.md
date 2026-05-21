# SPEC58STCHARCONENF-003: Accept STCHAR in SREL.derived_from

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`story-relationship.schema.json`, consumed by `record_schema_compliance`); no impact on existing validators.
**Deps**: None

## Problem

A lawful `SREL` record citing STCHAR provenance fails schema validation. `story-relationship.schema.json`'s `derived_from[]` pattern enumerates ~23 prefixes but excludes `STCHAR`, even though the shared contract explicitly directs citing STCHAR there when a relationship's stable conduct/voice/pressure/appraisal depends on story-local character authority (SPEC-58 C3).

## Assumption Reassessment (2026-05-21)

1. `tools/validators/src/schemas/story-relationship.schema.json` (~lines 75–78): the `derived_from[]` item `pattern` excludes `STCHAR`. Confirmed by spot-check grep (no `STCHAR` in the `derived_from` region) this session.
2. `.claude/skills/_shared-templates/story-record-schemas.md:555-560` — *"Use `STCHAR` in `derived_from[]` when a relationship's stable conduct, voice, pressure behavior, or appraisal pattern depends on story-local character authority rather than only on present-causal state."* The schema lags the contract.
3. Cross-artifact boundary: `story-relationship.schema.json` is consumed by the `record_schema_compliance` structural validator; the schema, that validator, and the shared contract must agree on the `SREL.derived_from` allowed-prefix set.
4. FOUNDATIONS §Story Bundles §6.1 (Story-Local Character Authority) + §5b (Schema-Minimalism): STCHAR is allowed only where load-bearing; `SREL.derived_from` is exactly such a consumer per the contract, so adding it is contract-aligned, not scope creep. Direct world `CHAR-*` must still be rejected.
5. Canon Safety surface: the SREL schema gates story-relationship record acceptance at engine pre-apply (via `record_schema_compliance`). The change is additive and weakens no Mystery Reserve firewall.
6. Output-schema extension: `SREL` is a story-bundle output-record schema. The extension is **additive-only** — it adds `^STCHAR-[0-9]+$` to the `derived_from[]` union; existing consumers (`record_schema_compliance`, world-index SREL edge extraction) are unaffected because no field is renamed or removed.

## Architecture Check

1. Extends the existing `derived_from[]` prefix union by one prefix — the minimal additive schema edit; no separate field or validation path introduced.
2. No backwards-compatibility aliasing/shims — `CHAR-*` remains excluded; only `STCHAR-` is added.

## Verification Layers

1. An `SREL` with `derived_from: [STCHAR-1, BEL-3]` passes `record_schema_compliance` → codebase test.
2. An `SREL` with `derived_from: [CHAR-1]` still fails → codebase test (negative case) + FOUNDATIONS alignment check (world `CHAR` is not a story-runtime authority).
3. The `derived_from[]` pattern includes `^STCHAR-[0-9]+$` → schema validation / grep-proof against the schema file.

## What to Change

### 1. Add STCHAR to the derived_from union

Add `^STCHAR-[0-9]+$` (or the `STCHAR` alternative within the existing combined pattern) to `derived_from[]` in `story-relationship.schema.json`.

## Files to Touch

- `tools/validators/src/schemas/story-relationship.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` (modify)

## Out of Scope

- C1/C2/C4 changes (separate tickets).
- Any other schema's `derived_from` union (this ticket touches SREL only).
- Narrowing other over-broad unions (rejected at triage as I2 — see SPEC-58 §Out of Scope).

## Acceptance Criteria

### Tests That Must Pass

1. `SREL` with STCHAR + BEL/SE provenance in `derived_from` passes.
2. `SREL` with direct `CHAR-*` in `derived_from` still fails.
3. `npm --prefix tools/validators test` passes.

### Invariants

1. `SREL.derived_from[]` accepts STCHAR and continues to reject world `CHAR-*`.
2. The schema's `derived_from` prefix set matches the shared story-record contract.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-relationship.test.ts` — add a positive STCHAR-in-`derived_from` case and a negative `CHAR-*` regression case.

### Commands

1. `npm --prefix tools/validators test -- record-schema-compliance-story-relationship` (targeted, after build).
2. `npm --prefix tools/validators test` (build + full suite).
