# SPEC53CHAPIPSEC-001: Reconcile NCP schema with the deepening template + real upgraded fixtures

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/character-proposal-card.schema.json` (NCP card schema); no impact on the structural validator framework or MCP surface.
**Deps**: None

## Problem

`deepen-character-proposal/templates/upgraded-proposal-card.md` emits a `critic_pass_trace` with the deepening-specific keys (`seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, `protagonist_grade_critic`) and an **object-array** `upgrade_lineage.rejected_directions_audit`. The NCP schema's `criticPassTrace` `$def` requires the **batch** ten-phase trace under `additionalProperties:false`, and `rejected_directions_audit` is `stringArray`-only. Every upgraded card the deepening skill produces therefore fails AJV validation in two places. The existing fixtures test masks this — its "single-seed upgrades without batch_id" case sets `origin_kind: upgraded_seed` but keeps the batch trace and a string audit, a shape the template never emits.

## Assumption Reassessment (2026-05-20)

1. **Codebase**: `tools/validators/src/schemas/character-proposal-card.schema.json` — `critic_pass_trace` is required (root `required`, line 7) and `$ref`s a single batch-only `criticPassTrace` `$def` (lines 113–129, `additionalProperties:false`); `upgradeLineage.rejected_directions_audit` is `{$ref: stringArray}` (line 87) and `rejected_directions_audit` is in `upgradeLineage.required` (line 81). Confirmed against the deepening template (`.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md` lines 88–92, 131–135).
2. **Spec/docs**: SPEC-53 Phase 1; SPEC-52 (archived) Phase 5 item 2 added the optional `upgrade_lineage` block but its schema and the deepening template drifted within that spec — this ticket closes that drift.
3. **Cross-artifact boundary under audit**: the contract is NCP schema ↔ deepening template (`upgraded-proposal-card.md`) ↔ batch template/`propose-new-characters` output ↔ the schema fixtures test. The schema must accept BOTH the batch shape (batch trace + string audit) and the upgrade shape (deepening trace + object audit ≥3) without breaking either producer.
4. **FOUNDATIONS principle (§Machine-Facing Layer)**: validators/schemas are *executable enforcement*. A schema that rejects the skill pipeline's own authored output is a correctness defect in the enforcement surface, not a stricter guard — the fix restores enforcement fidelity.
5. **Schema extension (additive vs breaking)**: the NCP card schema (`character_proposal_card`) is consumed by `record-schema-compliance.ts`'s `hybridRecordsFromFiles` mapping. The change is **additive/widening** — it accepts a previously-rejected valid shape; batch-generated cards (the current `validCard()` fixture) must continue to validate unchanged (regression guard).

## Architecture Check

1. Reconciling the schema to the existing template (rather than forcing the template to collapse its richer audit into strings) preserves the deepening skill's radicalization surface, which SPEC-53 §Key design decisions and the source report §16 identify as load-bearing.
2. No backwards-compatibility shim: the batch shape is retained as a first-class `oneOf` branch, not aliased. Origin-kind-keyed `if/then` conditionals give actionable per-field AJV errors; the property-level `oneOf` is the fallback for cards omitting `upgrade_lineage` (which is optional).

## Verification Layers

1. Upgraded-template card validates → schema validation (AJV) against a fixture copied byte-for-byte from `upgraded-proposal-card.md`.
2. Batch card still validates (regression) → schema validation against the existing `validCard()` fixture.
3. Mismatched trace-vs-origin_kind / <3 rejected directions fails → schema validation (negative fixtures).

## What to Change

### 1. Schema `$defs` (`character-proposal-card.schema.json`)

- Rename the current `criticPassTrace` `$def` to `batchCriticPassTrace` (the ten batch phases, `additionalProperties:false`).
- Add `upgradeCriticPassTrace` (`additionalProperties:false`, required `seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, `protagonist_grade_critic`, each `nonEmptyString`).
- Add `rejectedDirectionAuditEntry` (`additionalProperties:false`, required `direction`, `preserved_essence` (array minItems 1 of `nonEmptyString`), `mutation_attempted`, `rejection_reason`).

### 2. Property + conditional wiring

- Root `critic_pass_trace` property → `oneOf: [batchCriticPassTrace, upgradeCriticPassTrace]` (fallback for cards lacking `upgrade_lineage`).
- `upgradeLineage.properties.rejected_directions_audit` → `oneOf: [stringArray, {type: array, items: rejectedDirectionAuditEntry}]`.
- Add root-level `allOf` conditionals (preserving the existing `canon-requiring` conditional): `origin_kind ∈ {upgraded_seed, user_seed}` ⇒ `critic_pass_trace` is `upgradeCriticPassTrace` AND `rejected_directions_audit` is an object array with `minItems: 3`; `origin_kind == batch_generated` (or `upgrade_lineage` absent) ⇒ `critic_pass_trace` is `batchCriticPassTrace`. The `$def` rename's only `$ref` site is internal to this file — update it in the same edit.

### 3. Fixtures (`character-proposal-schema-fixtures.test.ts`)

- Add a real upgraded-card fixture (no `batch_id`; deepening trace; ≥3 object-shaped rejected directions) and assert it validates.
- Add negative cases: upgraded card with <3 rejected directions fails; upgraded card carrying the batch trace fails (and the inverse).
- Keep the existing batch-card fixture and its passing assertion (regression guard).

## Files to Touch

- `tools/validators/src/schemas/character-proposal-card.schema.json` (modify)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (modify)

## Out of Scope

- Broadening NCP body-section structural validation (rejected per SPEC-53 §Key design decisions / source report H1a).
- The structural validator's user_seed parity (SPEC53CHAPIPSEC-003).
- Any change to the batch template or `propose-new-characters` emission shape.

## Acceptance Criteria

### Tests That Must Pass

1. New upgraded-card fixture (deepening trace + object audit ≥3, no `batch_id`) validates against `character-proposal-card.schema.json`.
2. Existing batch-card fixture still validates; `canon-requiring` with empty `implied_new_facts` still fails (unchanged).
3. `npm test` (in `tools/validators`) passes — `npm run build && node --test dist/tests/**/*.test.js`.

### Invariants

1. Both producer shapes (batch-generated and upgraded/user-seed) validate under one schema; neither is rejected.
2. A card with `additionalProperties` beyond the declared surface still fails (the schema stays closed).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — add upgraded-card positive fixture + trace/audit negative fixtures; retain batch-card regression assertion.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (compiles the schema-consuming validator + tests; `tsc` covers typecheck since no `typecheck` script exists)
