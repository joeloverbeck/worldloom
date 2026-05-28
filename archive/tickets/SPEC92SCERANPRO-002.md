# SPEC92SCERANPRO-002: SCN + scene-prose-receipt JSON schemas + registry/dispatch

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (new `story-scene.schema.json`, `scene-prose-receipt.schema.json`; SCN record-schema dispatch; scene receipt schema-compliance validator + registry; same-package tests and README inventory).
**Deps**: archive/tickets/SPEC92SCERANPRO-001.md

## Problem

The SCN record and scene-prose receipt need machine-enforceable JSON schemas so the patch engine validates SCN records at pre-apply and `branching-story-scene-prose-attach` validates receipts. Schemas must match the contract landed in -001 and follow the `story-<class>.schema.json` naming convention (PG = `story-page.schema.json`).

## Assumption Reassessment (2026-05-28)

1. `tools/validators/src/schemas/story-page.schema.json`, `tools/validators/src/structural/utils.ts`, `tools/validators/src/structural/record-schema-compliance.ts`, and `tools/validators/src/public/registry.ts` exist. Live dispatch maps record node types to schema names through `RECORD_TYPE_TO_SCHEMA` in `utils.ts`, not through a raw schema registry in `registry.ts`.
2. SPEC-92 §3 / §6 and the completed contract in `archive/tickets/SPEC92SCERANPRO-001.md` define the SCN field set and scene-prose-receipt shape. `story-scene.schema.json` mirrors that contract: required routing/status/path fields, optional `previous_scene_id`, `scene_descriptor`, and `boundary_rationale`, and no `render_kind` or `source_pg_fingerprint`.
3. Cross-artifact boundary under audit: `record_schema_compliance` validates indexed story records by `node_type`; adding `scene_record -> story-scene` plus the `_source/scenes/SCN-*.yaml` authority-path filter makes future SCN records validate through the same structural path as PG/BR/CHC records.
4. The scene receipt is a direct-write artifact, not an atomic `_source` record, so it needs a receipt-specific schema-compliance validator parallel to `prose_receipt_schema_compliance`. This is same-seam registry fallout from the ticket's "register both schemas" requirement, while the content validators remain owned by SPEC92SCERANPRO-007.
5. HARD-GATE-facing validation signal: `record_schema_compliance` participates in pre-apply. The SCN dispatch remains fail-closed through `additionalProperties: false`, and the new `scene_prose_receipt_schema_compliance` explicitly skips pre-apply because scene receipts are direct-write publication artifacts, not patch-plan source records.
6. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the SCN schema's `properties` set is exactly the load-bearing contract from -001, with `additionalProperties: false` rejecting speculative fields.

## Architecture Check

1. JSON schemas as the machine enforcement of the -001 contract keep the human-authoritative contract and the machine gate in lockstep; the `story-<class>` naming convention keeps the schema discoverable alongside `story-page` / `story-event`.
2. No shims: SCN schema is net-new; `tools/validators/src/structural/utils.ts` gets a new `scene_record -> story-scene` class-to-schema entry, not a special-case branch.

## Verification Layers

1. `story-scene.schema.json` field set matches the -001 contract -> schema validation + manual diff against the contract.
2. `record_schema_compliance` resolves SCN records to `story-scene.schema.json` through the shared `RECORD_TYPE_TO_SCHEMA` dispatch -> codebase grep-proof + unit test.
3. `additionalProperties: false` rejects render_kind / source_pg_fingerprint -> negative schema-validation test.

## Landed Changes

### 1. story-scene.schema.json (new)

Added `tools/validators/src/schemas/story-scene.schema.json`. Required fields are `id`, `story_id`, `branch_id`, `status`, `pg_ids`, `start_page_id`, `end_page_id`, `choice_surface_page_id`, `emitted_choice_ids`, `title`, `slug`, `prose_plan_path`, `prose_path`, and `receipt_path`. Optional fields are `record_kind`, `previous_scene_id`, `scene_descriptor`, and `boundary_rationale`. `additionalProperties: false` rejects `render_kind`, `source_pg_fingerprint`, and other non-contract fields.

### 2. scene-prose-receipt.schema.json (new)

Added `tools/validators/src/schemas/scene-prose-receipt.schema.json` for direct-write scene receipts. It requires scene/story/branch identity, scene plan/prose paths, timestamp, strict/verdict state, `included_pages[]` with advisory `state_hash_at_attach`, and the eight scene-range check keys. `notes` and `repair_recommendation` remain optional, matching the -001 contract's non-starred fields.

### 3. dispatch + scene receipt schema compliance

Added `scene_record` to `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, and structural authority path filtering in `tools/validators/src/structural/utils.ts`. Added `scene_prose_receipt_schema_compliance`, registered it in `tools/validators/src/public/registry.ts`, and updated the validators README inventory and tests.

## Files to Touch

- `tools/validators/src/schemas/story-scene.schema.json` (new)
- `tools/validators/src/schemas/scene-prose-receipt.schema.json` (new)
- `tools/validators/src/structural/scene-prose-receipt-schema-compliance.ts` (new)
- `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` (new)
- `tools/validators/tests/structural/scene-prose-receipt-schema-compliance.test.ts` (new)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `tools/validators/tests/structural/story-record-kind-schema-contract.test.ts` (modify)
- `tools/validators/tests/structural/registry.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/src/structural/utils.ts` (modify)
- `tools/validators/README.md` (modify)

## Out of Scope

- The scene-plan structural validators (-006) and scene-prose-receipt content validators (-007) — this ticket lands the SCHEMAS + class→schema dispatch only.
- The patch op (-003), world-mcp retrieval (-004), world-index parsing (-005).

## Acceptance Criteria

### Tests That Must Pass

1. A well-formed SCN record validates against `story-scene.schema.json`; one carrying `render_kind` or `source_pg_fingerprint` FAILS (`additionalProperties`).
2. `record_schema_compliance` resolves an SCN record to `story-scene.schema.json`.
3. `cd tools/validators && npm run build && npm test` green.

### Invariants

1. SCN schema field set == -001 contract field set (no drift).
2. `additionalProperties: false` on both schemas.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` — new; SCN-resolves-to-schema + additionalProperties-rejection (render_kind / source_pg_fingerprint).
2. `tools/validators/tests/structural/scene-prose-receipt-schema-compliance.test.ts` — new; scene receipt schema positive and rejection coverage.
3. Existing schema/registry tests updated for `story-scene` and `scene_prose_receipt_schema_compliance`.

### Commands

1. `cd tools/validators && npm run build && npm test`

## Outcome

Completed: 2026-05-28

The validators package now has machine schemas for the SPEC-92 SCN record and scene-prose receipt. SCN records validate through `record_schema_compliance` as `scene_record` records under `stories/<story>/_source/scenes/SCN-*.yaml`. Scene receipt YAML validates through the new `scene_prose_receipt_schema_compliance` structural validator for full-world and incremental receipt-file runs, while skipping pre-apply so patch-plan validation remains scoped to engine-routed source records.

## Verification Result

1. `cd tools/validators && npm run build` passed after the TypeScript fix in the new scene receipt test.
2. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-scene.test.js dist/tests/structural/scene-prose-receipt-schema-compliance.test.js dist/tests/structural/contract-schema-roundtrip.test.js dist/tests/structural/story-record-kind-schema-contract.test.js dist/tests/structural/registry.test.js` passed 17 focused tests.
3. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js` passed 21 tests after same-seam pre-apply execution-status truthing for the new receipt schema validator.
4. `cd tools/validators && npm test` passed: 1108 tests, 1108 pass, 0 fail.

## Deviations

The drafted ticket named `record-schema-compliance.ts` as the class-to-schema map location. Live code keeps that map and the structural node-type/authority-path filter in `tools/validators/src/structural/utils.ts`; `record-schema-compliance.ts` consumes it unchanged. The ticket also said "registry/dispatch" for both schemas; the direct-write scene receipt required a receipt-specific schema-compliance validator and registry entry rather than `record_schema_compliance` dispatch.
