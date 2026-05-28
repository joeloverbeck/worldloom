# SPEC92SCERANPRO-002: SCN + scene-prose-receipt JSON schemas + registry/dispatch

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/validators` (new `story-scene.schema.json`, `scene-prose-receipt.schema.json`; registry + `record-schema-compliance.ts` dispatch).
**Deps**: archive/tickets/SPEC92SCERANPRO-001.md

## Problem

The SCN record and scene-prose receipt need machine-enforceable JSON schemas so the patch engine validates SCN records at pre-apply and `branching-story-scene-prose-attach` validates receipts. Schemas must match the contract landed in -001 and follow the `story-<class>.schema.json` naming convention (PG = `story-page.schema.json`).

## Assumption Reassessment (2026-05-28)

1. `tools/validators/src/schemas/story-page.schema.json` (naming-convention sibling), `tools/validators/src/public/registry.ts`, and `tools/validators/src/structural/record-schema-compliance.ts` all exist at HEAD (verified). The new schema MUST be `story-scene.schema.json` — NOT `scene-page.schema.json`; the `/reassess-spec` pass corrected this (SCN is not a page).
2. SPEC-92 §3 / §6 + the contract landed in -001 define the SCN field set + scene-prose-receipt checks. The schema's `required` / `properties` must match -001 exactly.
3. Cross-artifact boundary under audit: `record-schema-compliance.ts` maps record class → schema; registering `story-scene.schema.json` there makes SCN records validate at pre-apply. The patch engine (-003) and scene-prose-attach (-009) consume these schemas.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the SCN schema's `properties` set must be exactly the load-bearing fields from -001 — no `render_kind`, no `source_pg_fingerprint`. `additionalProperties: false` enforces minimalism mechanically.

## Architecture Check

1. JSON schemas as the machine enforcement of the -001 contract keep the human-authoritative contract and the machine gate in lockstep; the `story-<class>` naming convention keeps the schema discoverable alongside `story-page` / `story-event`.
2. No shims: SCN schema is net-new; `record-schema-compliance.ts` gets a new class→schema entry, not a special-case branch.

## Verification Layers

1. `story-scene.schema.json` field set matches the -001 contract -> schema validation + manual diff against the contract.
2. `record-schema-compliance.ts` resolves SCN records to `story-scene.schema.json` -> codebase grep-proof + unit test.
3. `additionalProperties: false` rejects render_kind / source_pg_fingerprint -> negative schema-validation test.

## What to Change

### 1. story-scene.schema.json (new)

SCN record schema: `required` = id, story_id, branch_id, status, pg_ids, start_page_id, end_page_id, choice_surface_page_id, emitted_choice_ids, title, slug, prose_plan_path, prose_path, receipt_path; optional = previous_scene_id (null for SCN-1), scene_descriptor, boundary_rationale. `additionalProperties: false`. Pattern validators: id `^SCN-[0-9]+$`, pg_ids items `^PG-[0-9]+$`.

### 2. scene-prose-receipt.schema.json (new)

Receipt schema: scene_id, included_pg_ids + their `state_hash`es (advisory freshness), and a `checks` object (included_pg_events_rendered, final_scene_choice_surface_visibility, scene_range_entity_status_consistency, scene_range_invented_structural_fact, scene_range_forbidden_mystery_resolution, scene_prose_stchar_fidelity, engine_jargon_leak, canon_claim_without_authority). Model on `prose-receipt.schema.json`.

### 3. registry.ts + record-schema-compliance.ts (modify)

Register both schemas; add `SCN → story-scene.schema.json` to the record-class→schema map.

## Files to Touch

- `tools/validators/src/schemas/story-scene.schema.json` (new)
- `tools/validators/src/schemas/scene-prose-receipt.schema.json` (new)
- `tools/validators/src/public/registry.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)

## Out of Scope

- The scene-plan structural validators (-006) and scene-prose-receipt content validators (-007) — this ticket lands the SCHEMAS + class→schema dispatch only.
- The patch op (-003), world-mcp retrieval (-004), world-index parsing (-005).

## Acceptance Criteria

### Tests That Must Pass

1. A well-formed SCN record validates against `story-scene.schema.json`; one carrying `render_kind` or `source_pg_fingerprint` FAILS (`additionalProperties`).
2. `record-schema-compliance.ts` resolves an SCN record to `story-scene.schema.json`.
3. `cd tools/validators && npm run build && npm test` green.

### Invariants

1. SCN schema field set == -001 contract field set (no drift).
2. `additionalProperties: false` on both schemas.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` — new; SCN-resolves-to-schema + additionalProperties-rejection (render_kind / source_pg_fingerprint).

### Commands

1. `cd tools/validators && npm run build && npm test`
