# SPEC53CHAPIPSEC-001: Reconcile NCP schema with the deepening template + real upgraded fixtures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators/src/schemas/character-proposal-card.schema.json` (NCP card schema) plus validators package schema-fixture and legacy-baseline test truthing; no impact on the structural validator framework or MCP surface.
**Deps**: None

## Problem

At intake, `deepen-character-proposal/templates/upgraded-proposal-card.md` emitted a `critic_pass_trace` with the deepening-specific keys (`seed_essence_extractor`, `world_pressure_mapper`, `blandness_executioner`, `protagonist_grade_critic`) and an **object-array** `upgrade_lineage.rejected_directions_audit`, while the NCP schema's single `criticPassTrace` `$def` required the **batch** ten-phase trace under `additionalProperties:false`, and `rejected_directions_audit` was `stringArray`-only. Every upgraded card the deepening skill produced therefore failed AJV validation in two places. The existing fixtures test masked this — its "single-seed upgrades without batch_id" case set `origin_kind: upgraded_seed` but kept the batch trace and a string audit, a shape the template never emits.

## Assumption Reassessment (2026-05-20)

1. **Codebase intake evidence**: before this ticket, `tools/validators/src/schemas/character-proposal-card.schema.json` required `critic_pass_trace` and `$ref`ed a single batch-only `criticPassTrace` `$def` (`additionalProperties:false`); `upgradeLineage.rejected_directions_audit` was `{$ref: stringArray}` and `rejected_directions_audit` was required by `upgradeLineage`. This contradicted the deepening template's object-array audit and four-key deepening critic trace in `.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md`.
2. **Spec/docs**: SPEC-53 Phase 1; SPEC-52 (archived) Phase 5 item 2 added the optional `upgrade_lineage` block but its schema and the deepening template drifted within that spec — this ticket closes that drift.
3. **Cross-artifact boundary under audit**: the contract is NCP schema ↔ deepening template (`upgraded-proposal-card.md`) ↔ batch template/`propose-new-characters` output ↔ the schema fixtures test. The schema must accept BOTH the batch shape (batch trace + string audit) and the upgrade shape (deepening trace + object audit ≥3) without breaking either producer.
4. **FOUNDATIONS principle (§Machine-Facing Layer)**: validators/schemas are *executable enforcement*. A schema that rejects the skill pipeline's own authored output is a correctness defect in the enforcement surface, not a stricter guard — the fix restores enforcement fidelity.
5. **Schema extension (additive vs breaking)**: the NCP card schema (`character_proposal_card`) is consumed by `record-schema-compliance.ts`'s `hybridRecordsFromFiles` mapping. The change is **additive/widening** — it accepts a previously-rejected valid shape; batch-generated cards (the current `validCard()` fixture) must continue to validate unchanged (regression guard).
6. **Proof-surface fallout**: the package baseline was green before edits (`npm test` in `tools/validators`: 730 pass). After the schema conditional landed, the full-world legacy fixture still reports only the existing `character_memorability_structure` / `record_schema_compliance` validator families, but the total failure count increases from 319 to 459 and `record_schema_compliance.if` / `record_schema_compliance.oneOf` appear because legacy proposal records now receive stricter origin-kind field-level schema diagnostics. The SPEC-04/SPEC-09 legacy-baseline assertions are same-seam test truthing, not behavior broadening.

## Architecture Check

1. Reconciling the schema to the existing template (rather than forcing the template to collapse its richer audit into strings) preserves the deepening skill's radicalization surface, which SPEC-53 §Key design decisions and the source report §16 identify as load-bearing.
2. No backwards-compatibility shim: the batch shape is retained as a first-class `oneOf` branch, not aliased. Origin-kind-keyed `if/then` conditionals give actionable per-field AJV errors; the property-level `oneOf` is the fallback for cards omitting `upgrade_lineage` (which is optional).

## Verification Layers

1. Upgraded-template card validates → schema validation (AJV) against a fixture copied byte-for-byte from `upgraded-proposal-card.md`.
2. Batch card still validates (regression) → schema validation against the existing `validCard()` fixture.
3. Mismatched trace-vs-origin_kind / <3 rejected directions fails → schema validation (negative fixtures).

## Landed Changes

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
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify — legacy baseline count truthing)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify — legacy baseline count truthing)
- `specs/SPEC-53-character-pipeline-second-iteration-fixes.md` (modify — Phase 1 implementation note)

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

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — added upgraded-card positive fixture + trace/audit negative fixtures; retained batch-card regression assertion.
2. `tools/validators/tests/integration/spec04-verification.test.ts` — truthed the SPEC-04 full-world legacy baseline count/code assertions for the stricter schema diagnostics.
3. `tools/validators/tests/integration/spec09-verification.test.ts` — truthed the SPEC-09 full-world legacy baseline count assertion for the stricter schema diagnostics.

### Commands

1. `npm test --prefix tools/validators`
2. `npm run build --prefix tools/validators` (compiles the schema-consuming validator + tests; `tsc` covers typecheck since no `typecheck` script exists)

## Outcome

Completed 2026-05-20.

The NCP schema now has separate `batchCriticPassTrace` and `upgradeCriticPassTrace` branches. `critic_pass_trace` accepts only those branches, `upgrade_lineage.rejected_directions_audit` accepts either the batch string-array shape or the deepening object-array shape, and origin-kind conditionals enforce the intended pairing:

- `upgraded_seed` / `user_seed` require the upgrade critic trace and at least three object-shaped rejected-direction audit entries.
- `batch_generated` or missing `upgrade_lineage` requires the batch critic trace.
- The existing canon-requiring `implied_new_facts` conditional remains in place.

The schema fixture test now covers a real upgraded-card shape copied from the deepening template contract, the existing batch-card regression path, fewer-than-three rejected directions, upgraded cards carrying the batch trace, and batch cards carrying the upgrade trace. The SPEC-04/SPEC-09 full-world legacy-baseline assertions were updated to the new truthful baseline produced by the stricter conditional diagnostics. The active SPEC-53 Phase 1 section has a dated implementation note so the spec does not present this seam as wholly unlanded.

## Verification Result

Commands run from `tools/validators`:

1. `npm test` before edits: PASS — 730 tests passed, establishing the package baseline.
2. `npm run build`: PASS — TypeScript compiled the validator package and refreshed `dist/`.
3. `node --test dist/tests/schemas/character-proposal-schema-fixtures.test.js`: PASS — 8 schema fixture tests passed, including the new positive/negative NCP card cases.
4. `npm test` after final edits: PASS — 733 tests passed, covering the schema fixture changes plus the updated SPEC-04/SPEC-09 full-world legacy baselines.

## Deviations

- Same-seam test fallout was broader than the draft `Files to Touch`: the new JSON Schema conditionals changed the legacy full-world diagnostic count from 319 to 459 and added `record_schema_compliance.if` / `record_schema_compliance.oneOf` to the expected code set. The assertions were truthed in `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/spec09-verification.test.ts`.
- `dist/` was regenerated by package build/test commands and remains an ignored generated artifact, not a tracked source edit.
