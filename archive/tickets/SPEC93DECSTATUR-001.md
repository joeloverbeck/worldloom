# SPEC93DECSTATUR-001: PG schema — make plan fields optional; field-presence state-hash regression test

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators` (`schemas/story-page.schema.json` + record-schema-compliance test); `tools/world-index` (regression test only; `src/hash/content.ts` unchanged)
**Deps**: None

## Problem

SPEC-93 removes the per-`PG` page-plan render artifact. New `PG` records must be allowed to omit `plan.plan_hash` and `prose_plan_path`, while existing (red-bunny) records keep them and stay verifiable. Today `tools/validators/src/schemas/story-page.schema.json` lists `plan` and `prose_plan_path` in the top-level `required` array and `plan_hash` in `plan.required`, so a planless `PG` is rejected at record-schema validation. This ticket relaxes the schema so planless `PG`s validate, and locks in (via test) that the `state_hash` payload split between legacy and new records is emergent from field presence — requiring **no** change to `computePgStateHash`.

## Assumption Reassessment (2026-05-28)

1. `tools/validators/src/schemas/story-page.schema.json` currently lists `plan` and `prose_plan_path` in the top-level `required` array and `plan_hash` (pattern `^[0-9a-f]{64}$`) in `plan.required`, with `additionalProperties: false` at root — confirmed during SPEC-93 reassessment (this session).
2. SPEC-93 §2.3 + §3 + reassessment Issue I1 establish: make both fields optional, grandfather existing records, and make NO change to `content.ts`.
3. Cross-artifact boundary: `story-page.schema.json` is the PG record-write gate consumed by `record-schema-compliance` (validators), the patch-engine PG create op (validates via this schema), `world-mcp` retrieval, and the story-pipeline skills. Relaxing `required` is the shared-surface change under audit.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism) motivates removing the now-non-load-bearing `plan_hash`/`prose_plan_path` from new `PG`s; Rule 6 (No Silent Retcons) governs the grandfathering — existing records are append-only and unmodified, and the field-presence payload rule is documented, not silent.
5. (was template item 6 — schema change) The modified schema is `story-page.schema.json` (a story-bundle record schema). Consumers: `record-schema-compliance` validator, patch-engine PG create op, `world-mcp` retrieval, story skills. The change is **non-breaking** — it relaxes `required` (every previously-valid `PG`, with the fields, stays valid; planless `PG`s become newly valid). `computePgStateHash` (`tools/world-index/src/hash/content.ts:56-68`) excludes only `state_hash` and hashes whatever fields are present, so a legacy `PG` (with `prose_plan_path`) and a new planless `PG` each verify against their own stored hash with no `content.ts` edit. Adding `prose_plan_path` to `PG_STATE_HASH_EXCLUDED_FIELDS` would false-FAIL every legacy record and is explicitly rejected (SPEC-93 §3).
6. Implementation found a same-seam schema inventory consumer: `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` asserts the amended story-schema required field sets. That expected `story-page` required list moved with the schema relaxation so the package proof checks the new contract rather than stale pre-SPEC-93 required fields.

## Architecture Check

1. Relaxing `required` (rather than deleting the property definitions) is the minimal, non-breaking change: legacy records validate unchanged; planless records validate; no consumer that reads the optional fields breaks because they remain defined.
2. No backwards-compatibility shim: the field-presence payload behavior is the existing `computePgStateHash` contract, not a new compatibility branch. `content.ts` is untouched.

## Verification Layers

1. Planless `PG` accepted by schema -> schema validation (a `PG` lacking `plan`/`prose_plan_path` passes `record-schema-compliance`).
2. Legacy `PG` still accepted -> schema validation (a `PG` carrying `plan`/`prose_plan_path` still passes).
3. Field-presence `state_hash` integrity -> codebase grep-proof + unit test (legacy `PG` with `prose_plan_path` re-verifies to its stored hash; planless `PG` re-verifies; `content.ts` not modified to exclude `prose_plan_path`).
4. Schema-minimalism / grandfathering -> FOUNDATIONS alignment check (§5b + Rule 6).

## What to Change

### 1. Relax the PG schema

In `tools/validators/src/schemas/story-page.schema.json`: remove `plan` and `prose_plan_path` from the top-level `required` array; remove `plan_hash` from `plan.required` (keep the property definitions + patterns so legacy records validate). Preserve `additionalProperties: false`.

### 2. Extend the record-schema-compliance test

In `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts`: add a case asserting a `PG` lacking `plan`/`prose_plan_path` PASSES, and a case asserting a legacy `PG` carrying both still PASSES.

### 3. Field-presence state-hash regression test

In `tools/world-index/tests/hash/content.test.ts`: add assertions that (a) a legacy `PG` carrying `prose_plan_path` re-verifies to its stored `state_hash`, (b) a planless `PG` (omitting `plan`/`prose_plan_path`) re-verifies to its stored `state_hash`, and (c) a guard documenting that `PG_STATE_HASH_EXCLUDED_FIELDS` must NOT include `prose_plan_path` (the rejected alternative that would false-FAIL legacy records).

## Files to Touch

- `tools/validators/src/schemas/story-page.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/world-index/tests/hash/content.test.ts` (modify)

## Out of Scope

- Any change to `tools/world-index/src/hash/content.ts` (the field-presence split is emergent; SPEC-93 §3).
- Removing the `plan_hash`/`prose_plan_path` property definitions from the schema (kept for legacy-record validation).
- The `state_hash` / `state_hash_parent` chain semantics (retained unchanged).
- `compute-pg-hashes` CLI changes (SPEC93DECSTATUR-005).

## Acceptance Criteria

### Tests That Must Pass

1. `record-schema-compliance-story-page` passes a planless `PG` and a legacy `PG`.
2. `content.test.ts` shows a legacy `PG` (with `prose_plan_path`) and a planless `PG` each re-verify to their own stored `state_hash`.
3. `(cd tools/validators && npm run build && npm test)` and `(cd tools/world-index && npm run build && npm test)` green.

### Invariants

1. `computePgStateHash` excludes only `state_hash`; the legacy/new payload split is field-presence-driven with zero code change.
2. The patch-engine PG create op accepts a planless `PG` purely as a consequence of the relaxed schema (no patch-engine code edit).

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` — planless + legacy PG acceptance.
2. `tools/world-index/tests/hash/content.test.ts` — field-presence state-hash regression + `content.ts`-unchanged guard.

### Commands

1. `(cd tools/validators && npm run build && npm test)`
2. `(cd tools/world-index && npm run build && npm test)`
3. Narrower boundary: these two packages own the schema + hash surfaces; downstream consumer behavior (patch-engine planless-PG acceptance) is exercised end-to-end in SPEC93DECSTATUR-013.

## Outcome

Completed: 2026-05-28

Landed changes:

1. `tools/validators/src/schemas/story-page.schema.json` no longer requires top-level `plan` or `prose_plan_path`; both legacy properties remain defined so existing `PG`s with plan metadata still validate. `plan.required` is now empty, keeping `plan.plan_hash` optional when a legacy-shaped `plan` block is present.
2. `tools/validators/tests/structural/record-schema-compliance-story-page.test.ts` now proves both planless SPEC-93 `PG`s and legacy `PG`s pass `record_schema_compliance`, while malformed legacy paths/placeholders still fail when present.
3. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` now records the amended `story-page` required field set without `plan` / `prose_plan_path`.
4. `tools/world-index/tests/hash/content.test.ts` now proves a legacy `PG` carrying `plan` + `prose_plan_path` and a planless `PG` each re-verify to their own stored `state_hash`, with different hashes because the payload is field-presence-driven.

Deviations from plan:

- Added `contract-schema-roundtrip.test.ts` to the landed file set after the first validators broad suite exposed its stale same-seam required-field inventory. This is proof-surface truthing, not a new behavior scope.
- No production change was made to `tools/world-index/src/hash/content.ts`; the existing `computePgStateHash` behavior remains unchanged.

## Verification Result

1. `cd tools/world-index && npm run build` — PASS.
2. `cd tools/world-index && npm test` — PASS (`127` non-CLI tests plus serial CLI tests passed; includes `computePgStateHash verifies both legacy and planless PG field-presence payloads`).
3. `cd tools/validators && npm run build` — PASS.
4. `cd tools/validators && node --test dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/record-schema-compliance-story-page.test.js dist/tests/integration/validate-patch-plan.test.js` — PASS (`50` tests passed), after updating the same-seam schema inventory expectation.
5. `cd tools/validators && npm test` — PASS (`1136` tests passed).
