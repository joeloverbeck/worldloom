# SPEC54CHAPIPTHI-001: Require batch_id for batch-generated NCPs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (character-proposal-card schema + its fixtures test). No impact on `tools/world-mcp` or any skill.
**Deps**: None

## Problem

At intake, batch-generated NCP cards could omit `batch_id` and still validate: the schema listed `batch_id` (pattern `^NCB-[0-9]+$`) in `properties` but not in any `required` constraint, and the only `origin_kind`-keyed conditional governed `critic_pass_trace` shape, not `batch_id` presence. A batch card that omitted `batch_id` validated but silently dropped the NCP→NCB structured edge (`batch_id` -> NCB `batch_id`) the world index relies on for batch lineage and batch-scoped retrieval. SPEC-54 Phase 1.

## Assumption Reassessment (2026-05-20)

1. At intake, `tools/validators/src/schemas/character-proposal-card.schema.json` contained the root-level batch-generated conditional whose `if` is `anyOf: [ {not: {required: [upgrade_lineage]}}, {properties: {upgrade_lineage: {properties: {origin_kind: {const: batch_generated}}}, required: [origin_kind]}}, required: [upgrade_lineage]} ]`; its `then` constrained `critic_pass_trace` to `batchCriticPassTrace` only. This ticket now requires `batch_id` in that `then` block and locally declares its `NCB-<integer>` shape there to satisfy Ajv strict-required compilation.
2. SPEC-54 Phase 1. The NCP card template (`.claude/skills/propose-new-characters/templates/proposal-card.md`) emits `batch_id: NCB-<integer>` for batch cards; `deepen-character-proposal`'s upgraded template omits it per the SPEC-53 decision — so the requirement must stay conditional, not global.
3. Cross-artifact boundary under audit: the proposal-card schema is consumed by `tools/validators` (`record-schema-compliance` applies it) AND by the world-index NCP→NCB structured-edge extraction (`batch_id` → NCB `batch_id`); the fixtures test `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (`validCard()` helper carries `batch_id`) is the schema's contract test.
4. FOUNDATIONS Rule 6 (No Silent Retcons) / auditability: requiring `batch_id` on batch cards keeps the NCP→NCB lineage edge present so batch provenance is not silently dropped.
5. Output-schema change (template menu item 6): this modifies the `character-proposal-card` proposal-card schema. The change is **breaking** for batch cards that omit `batch_id` — intentionally, since batch cards should always carry it (the template does). Consumers: `tools/validators` (`record-schema-compliance`) + world-index edge extraction + the fixtures test. Upgraded/user-seed cards are unaffected — the requirement is keyed to the batch-generated `if` branch only.

## Architecture Check

1. Keying `required: [batch_id]` to the existing batch-generated `if` branch reuses the schema's established `origin_kind` conditional rather than introducing a parallel mechanism; the upgraded/user-seed path is untouched and `batch_id` stays omittable there.
2. No backwards-compatibility aliasing/shims — batch cards lacking `batch_id` fail rather than being grandfathered.

## Verification Layers

1. Batch card without `batch_id` fails -> schema validation (AJV) via fixtures-test grep-proof.
2. Upgraded/user-seed card without `batch_id` still passes -> schema validation.
3. NCP→NCB lineage preservation -> FOUNDATIONS alignment check (Rule 6 auditability).

## What to Change

### 1. Schema conditional

In `tools/validators/src/schemas/character-proposal-card.schema.json`, the root-level `allOf` batch-generated conditional now has `"required": ["batch_id"]` in its `then` block and preserves the existing `critic_pass_trace` -> `batchCriticPassTrace` constraint. `batch_id` was not added to the schema's top-level `required` array, so upgraded/user-seed omission remains valid.

### 2. Fixtures test

In `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts`, added cases proving: (a) a batch `validCard()` with `batch_id` still validates; (b) the same card minus `batch_id` fails with a `required`/`batch_id` AJV error; (c) an upgraded card (`origin_kind: upgraded_seed`, upgrade critic trace, >=3 object-shaped rejected directions) without `batch_id` still validates; (d) an upgraded card with a well-formed `batch_id` still validates.

### 3. Same-seam proof fixtures

Updated the existing current-positive `record_schema_compliance` NCP fixture with `batch_id`, and updated SPEC-04/SPEC-09 full-world baseline assertions from 459 to 473 fails because the tightened schema intentionally exposes 14 existing legacy animalia proposal cards without batch lineage.

## Files to Touch

- `tools/validators/src/schemas/character-proposal-card.schema.json` (modify)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/validators/tests/integration/spec04-verification.test.ts` (modify)
- `tools/validators/tests/integration/spec09-verification.test.ts` (modify)

## Out of Scope

- NCP body-section heading validation (rejected in SPEC-54 §Out of Scope).
- Any change to the upgraded/user-seed critic-trace or rejected-directions conditionals (landed in SPEC-53).
- The NCB batch-manifest schema.

## Acceptance Criteria

### Tests That Must Pass

1. A batch `validCard()` minus `batch_id` fails AJV with a `required` keyword error naming `batch_id`.
2. An `origin_kind: upgraded_seed` card minus `batch_id` validates.
3. `npm test` from `tools/validators` passes with the four new fixture cases and same-seam baseline updates.

### Invariants

1. `batch_id` remains conditional — never added to the schema's top-level `required`.
2. Upgraded/user-seed cards may omit `batch_id` (SPEC-53 contract preserved).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — added the batch-without-`batch_id` failure case and upgraded-without-`batch_id` pass case, plus the two confirming positives.
2. `tools/validators/tests/structural/record-schema-compliance.test.ts` — current positive NCP fixture now includes `batch_id`.
3. `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/spec09-verification.test.ts` — full-world legacy baseline count updated to 473.

### Commands

1. `npm test` from `tools/validators`
2. `npm test` from `tools/validators` is the correct verification boundary — the schema is exercised entirely by the validators package's own fixtures and full-world validator baselines; no cross-package run is needed.

## Outcome

Completed: 2026-05-20

The NCP proposal-card schema now requires `batch_id` only for the batch-generated branch. The schema keeps upgraded/user-seed cards free to omit `batch_id`, while batch cards without it now fail with an AJV `required` diagnostic. The test surface now includes explicit schema-fixture coverage for both batch and upgraded/user-seed cases, plus the current `record_schema_compliance` positive fixture and full-world legacy baseline count updates required by the tightened schema.

## Verification Result

1. `npm test` from `tools/validators` before edits — passed, 738 tests.
2. First post-edit `npm test` from `tools/validators` — failed during Ajv strict compilation because the conditional `then.required` referenced `batch_id` without declaring it in the same subschema. Fixed by declaring the `batch_id` property in the same `then` block.
3. Second post-edit `npm test` from `tools/validators` — failed because the tighter schema raised the expected full-world legacy baseline from 459 to 473. Updated SPEC-04/SPEC-09 baseline assertions.
4. Third post-edit `npm test` from `tools/validators` — failed one current-positive `record_schema_compliance` NCP fixture that modeled a batch card without `batch_id`. Updated that fixture.
5. Final `npm test` from `tools/validators` — passed, 740 tests.

## Deviations

- Same-seam proof fallout expanded the touched test set beyond the drafted schema-fixture file: the structural positive fixture and SPEC-04/SPEC-09 full-world baseline assertions had to move with the schema so package-wide verification remained truthful.
- The tightened schema intentionally increases the animalia legacy character/proposal baseline from 459 to 473 full-world failures. This ticket enforces the contract; it does not repair historical proposal cards.
