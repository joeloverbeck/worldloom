# SPEC54CHAPIPTHI-001: Require batch_id for batch-generated NCPs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (character-proposal-card schema + its fixtures test). No impact on `tools/world-mcp` or any skill.
**Deps**: None

## Problem

Batch-generated NCP cards can omit `batch_id` and still validate: the schema lists `batch_id` (pattern `^NCB-[0-9]+$`) in `properties` but not in any `required` constraint, and the only `origin_kind`-keyed conditional governs `critic_pass_trace` shape, not `batch_id` presence. A batch card that omits `batch_id` validates but silently drops the NCP→NCB structured edge (`batch_id` → NCB `batch_id`) the world index relies on for batch lineage and batch-scoped retrieval. SPEC-54 Phase 1.

## Assumption Reassessment (2026-05-20)

1. `tools/validators/src/schemas/character-proposal-card.schema.json` — confirmed the root-level `allOf` contains a batch-generated conditional whose `if` is `anyOf: [ {not: {required: [upgrade_lineage]}}, {properties: {upgrade_lineage: {properties: {origin_kind: {const: batch_generated}}}, required: [origin_kind]}}, required: [upgrade_lineage]} ]` and whose `then` currently constrains `critic_pass_trace` to `batchCriticPassTrace` only; `batch_id` is NOT in the schema's top-level `required`.
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

In `tools/validators/src/schemas/character-proposal-card.schema.json`, locate the root-level `allOf` batch-generated conditional (the branch whose `if.anyOf` covers "no `upgrade_lineage`" OR "`origin_kind: batch_generated`"). Add `"required": ["batch_id"]` to that branch's `then` block, preserving the existing `critic_pass_trace` → `batchCriticPassTrace` constraint. Do NOT add `batch_id` to the schema's top-level `required` array — the requirement must stay conditional so upgraded/user-seed omission remains valid.

### 2. Fixtures test

In `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts`, add cases: (a) a batch `validCard()` with `batch_id` still validates; (b) the same card minus `batch_id` fails with a `required`/`batch_id` AJV error; (c) an upgraded card (`origin_kind: upgraded_seed`, upgrade critic trace, ≥3 object-shaped rejected directions) without `batch_id` still validates; (d) an upgraded card with a well-formed `batch_id` still validates.

## Files to Touch

- `tools/validators/src/schemas/character-proposal-card.schema.json` (modify)
- `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` (modify)

## Out of Scope

- NCP body-section heading validation (rejected in SPEC-54 §Out of Scope).
- Any change to the upgraded/user-seed critic-trace or rejected-directions conditionals (landed in SPEC-53).
- The NCB batch-manifest schema.

## Acceptance Criteria

### Tests That Must Pass

1. A batch `validCard()` minus `batch_id` fails AJV with a `required` keyword error naming `batch_id`.
2. An `origin_kind: upgraded_seed` card minus `batch_id` validates.
3. `npm test --prefix tools/validators` passes with the four new fixture cases.

### Invariants

1. `batch_id` remains conditional — never added to the schema's top-level `required`.
2. Upgraded/user-seed cards may omit `batch_id` (SPEC-53 contract preserved).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts` — add the batch-without-`batch_id` failure case and the upgraded-without-`batch_id` pass case (plus the two confirming positives).

### Commands

1. `npm test --prefix tools/validators`
2. `npm test --prefix tools/validators` is the correct verification boundary — the schema is exercised entirely by the validators package's own fixtures; no cross-package run is needed.
