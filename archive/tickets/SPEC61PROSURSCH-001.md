# SPEC61PROSURSCH-001: JSON schemas for the proposal/audit/pressure surfaces

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — adds nine JSON Schema files under `tools/validators/src/schemas/`; no impact on existing schema files (all new).
**Deps**: None

## Problem

At intake, every mature world-system surface (CF/CH/INV/M/OQ/ENT/SEC, CHAR/DA/PA, NCP/NCB, all story-bundle classes) was JSON-schema-backed, but the least-mature proposal/audit/pressure surfaces had **zero** schema coverage (verified: none appeared in `tools/validators/src/schemas/`). This is exactly where maturity/approval confusion is most likely yet least mechanically caught. This ticket adds the declarative schema contract for the uncovered surfaces; wiring them into structural validation is SPEC61PROSURSCH-003.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase at intake: `tools/validators/src/schemas/` shipped 38 schemas; `character-proposal-card.schema.json` and `character-proposal-batch.schema.json` are the proven direct-write-proposal precedent (both use root `additionalProperties: false` + a required `source_basis` object). The new schemas model on this pair.
2. Verified against the spec: SPEC-61 §2.1 listed eight schema basenames and required the implementation to derive each schema's required-field set from the current producing template. Reassessment found `propose-new-canon-facts/templates/batch-manifest.md` and `emergent-pressure-events/templates/batch-manifest.md` do not align: PR batches use `diagnosis_summary` and `parameters.enrichment_types`, while EPE batches use `pressure_inventory_summary`, `parameters.origin_type_focus/current_date/current_season`, `sidecars_emitted`, and `phase_4_drop_log_ids`. The live implementation therefore uses nine schemas, adding `pressure-event-batch.schema.json`.
3. Cross-artifact boundary under audit: each schema is a contract over a sibling skill's emitted frontmatter. The schema's required-field set must match what the producing skill actually writes today — a field the schema requires that the skill doesn't emit fails every real card. Derive from the template, then spot-check one emitted example per surface where one exists.
4. FOUNDATIONS §Canon Fact Record Schema (lines 355–361) reserves `source_basis.direct_user_approval` for accepted CF records. Per SPEC-61 §2.1, each new schema declares `source_basis` as an object and carries the optional defense-in-depth prohibition `"not": {"required": ["direct_user_approval"]}` on `source_basis` (the primary enforcement is the SPEC61PROSURSCH-004 validator, per the spec's Q1=(a) resolution). The schemas must not require `direct_user_approval`.

## Architecture Check

1. Modeling on the `character-proposal-card` precedent keeps the new schemas consistent with the established direct-write-proposal validation pattern, so the SPEC61PROSURSCH-003 wiring reuses the existing `record-schema-compliance` path with no new validation machinery.
2. No backwards-compatibility shims — all nine files are new; no existing schema is aliased or duplicated.

## Verification Layers

1. Each schema is valid JSON Schema (compiles under the validator's Ajv2020 strict setup) -> schema validation (`npm run build` from `tools/validators` + a compile smoke test).
2. Each schema's required-field set matches the producing skill's template frontmatter -> codebase grep-proof (diff schema `required` against template keys per surface).
3. `source_basis` schemas do not require `direct_user_approval` and carry the optional `not`-prohibition -> codebase grep-proof.
4. Single concern (declarative schema files); behavioral validation lands in SPEC61PROSURSCH-003 — so no skill-dry-run layer applies here.

## What to Change

### 1. Author nine JSON Schema files

Under `tools/validators/src/schemas/`, each modeled on `character-proposal-card.schema.json` / `character-proposal-batch.schema.json`:

- `proposal-card.schema.json` (PR — `propose-new-canon-facts`, `canon-facts-from-diegetic-artifacts`)
- `proposal-batch.schema.json` (PR batch manifests)
- `pressure-event-card.schema.json` (EPE base card)
- `pressure-event-sidecar-proposal.schema.json` (EPE `*.proposal.md`)
- `pressure-event-batch.schema.json` (EPE batch manifests — split after frontmatter did not align with PR batches)
- `audit-report.schema.json` (AU)
- `retcon-proposal-card.schema.json` (RP)
- `world-proposal-card.schema.json` (NWP)
- `world-proposal-batch.schema.json` (NWB)

Each schema: pins `world_slug` / `id` / `generated_date` consistent with sibling proposal schemas; declares `source_basis` as an object with the optional `"not": {"required": ["direct_user_approval"]}` prohibition where the surface has `source_basis`; uses schema-local enums sourced from live templates and `tools/world-index/src/public/canonical-vocabularies.ts` where a field is canonical; leaves skill-local heuristic lists as free-string.

### 2. Resolve the pressure-event-batch shared-vs-split decision (SPEC-61 §6)

Read `propose-new-canon-facts/templates/batch-manifest.md` and `emergent-pressure-events/templates/batch-manifest.md`. Their frontmatter diverges, so this ticket split out `pressure-event-batch.schema.json` as a ninth schema and flagged SPEC61PROSURSCH-002/003 to add a ninth `pressure_event_batch` node type + `RECORD_TYPE_TO_SCHEMA` row.

## Files to Touch

- `tools/validators/src/schemas/proposal-card.schema.json` (new)
- `tools/validators/src/schemas/proposal-batch.schema.json` (new)
- `tools/validators/src/schemas/pressure-event-card.schema.json` (new)
- `tools/validators/src/schemas/pressure-event-sidecar-proposal.schema.json` (new)
- `tools/validators/src/schemas/pressure-event-batch.schema.json` (new)
- `tools/validators/src/schemas/audit-report.schema.json` (new)
- `tools/validators/src/schemas/retcon-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/world-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/world-proposal-batch.schema.json` (new)

## Out of Scope

- Wiring schemas into `RECORD_TYPE_TO_SCHEMA` / scan dirs (SPEC61PROSURSCH-003).
- The `approval-semantics` validator (SPEC61PROSURSCH-004) — schemas carry only the optional `not`-prohibition, not the primary enforcement.
- World-index node-type/enumeration changes (SPEC61PROSURSCH-002).
- Editing producing-skill templates or any `_source/` record.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/validators run build` succeeds (TypeScript + schema files load).
2. Each new schema compiles under Ajv2020 strict mode (compile smoke test added in SPEC61PROSURSCH-003 fixtures; here, a one-off `node -e` Ajv2020 compile of each file passes).
3. For each surface, the schema's `required` array is a subset of (or exactly) the producing template's emitted frontmatter keys (manual diff per surface).

### Invariants

1. No new schema requires `source_basis.direct_user_approval`; each carries the optional `not`-prohibition on `source_basis`.
2. Every canonical-enum field uses schema-local values sourced from live templates or `tools/world-index/src/public/canonical-vocabularies.ts`; no unsupported JSON Schema `$ref` to TypeScript constants is introduced.

## Test Plan

### New/Modified Tests

1. `None — schema files are exercised by the fixtures added in SPEC61PROSURSCH-003; this ticket's verification is a per-file Ajv2020 compile smoke test (command below).`

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node -e 'import Ajv2020 from "ajv/dist/2020.js"; import fs from "node:fs"; const names=["proposal-card","proposal-batch","pressure-event-card","pressure-event-sidecar-proposal","pressure-event-batch","audit-report","retcon-proposal-card","world-proposal-card","world-proposal-batch"]; const ajv=new Ajv2020({allErrors:true,strict:true}); for (const name of names) { const schema=JSON.parse(fs.readFileSync(`src/schemas/${name}.schema.json`,"utf8")); ajv.compile(schema); console.log(`OK ${name}`); }'`
3. Narrower compile-only boundary is correct here because schema *behavior* (FAIL on malformed cards) is validated in SPEC61PROSURSCH-003 once the schemas are wired into `record-schema-compliance`.

## Outcome

Completed: 2026-05-21.

- Added nine schema files for PR, PR batch, EPE card, EPE sidecar, EPE batch, AU report, RP card, NWP card, and NWB batch.
- Reassessment split EPE batches from PR batches because the live templates do not share frontmatter.
- Used schema-local enums sourced from the live templates and canonical-vocabulary file instead of unsupported cross-file `$ref` references to TypeScript constants.

## Verification Result

- `npm run build` in `tools/world-index` passed after installing dependencies.
- `npm run build` in `tools/patch-engine` passed after installing dependencies.
- `npm run build` in `tools/validators` passed after installing dependencies and building sibling `file:` dependencies.
- From `tools/validators`, Ajv2020 strict compile passed for all nine new schemas:
  `proposal-card`, `proposal-batch`, `pressure-event-card`, `pressure-event-sidecar-proposal`, `pressure-event-batch`, `audit-report`, `retcon-proposal-card`, `world-proposal-card`, and `world-proposal-batch`.

## Deviations

- SPEC-61 drafted eight schemas with a possible EPE-batch split. The split was required by live template frontmatter, so the landed schema count is nine.
- The drafted `npm --prefix tools/validators run build` shape was run as `npm run build` from `tools/validators`; the package script and outcome are identical, and the package-local cwd was required for the Ajv probe's module resolution.
- `npm install` was run in `tools/world-index`, `tools/patch-engine`, and `tools/validators` to restore local package dependencies before proof. It produced only ignored `node_modules/` artifacts and no lockfile changes.
