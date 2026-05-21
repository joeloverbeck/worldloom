# VALDA-002: Add validator schema support for mined-from-DA proposal surfaces

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes - `tools/validators` schemas, schema selection, indexed proposal read surfaces, tests, and README/inventory docs
**Deps**: `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md` for final live `erotica-world` validator green; targeted schema fixtures can be implemented independently

## Problem

At intake, the `record_schema_compliance` validator applied the generic `proposal-card.schema.json` and `proposal-batch.schema.json` to all files under `worlds/<slug>/proposals/`. That rejected valid output from `.claude/skills/canon-facts-from-diegetic-artifacts`, whose mined-from-DA proposal cards and batch manifests intentionally carry mining-specific audit fields such as `source_artifact_id`, `mining_context`, `narrator_reliability_basis`, `source_basis.derived_from_artifact_path`, `canon_safety_check.diegetic_to_world_laundering`, `classification_counts`, and `single_narrator_concentration_flag`.

The result was noisy full-world validation where mined proposal audit metadata was reported as schema drift instead of being validated as a source-specific proposal variant.

## Assumption Reassessment (2026-05-22)

1. Schema mapping remains node-type-based at the shared map level, but `tools/validators/src/structural/record-schema-compliance.ts` now performs parsed-provenance variant selection for `proposal_card` and `proposal_batch` records. No world-index node-type migration was needed.
2. Source-skill contract verified: `.claude/skills/canon-facts-from-diegetic-artifacts/references/canon-rules-and-foundations.md` states the proposal card is structurally parallel to the sibling template but adds `source_artifact_id`, `source_basis.derived_from_artifact_path`, and `canon_safety_check.diegetic_to_world_laundering`; the batch manifest adds `source_artifact_id`, `source_artifact_path`, `classification_counts`, `flagged_contradictions`, `mr_positional_flags`, and `single_narrator_concentration_flag`.
3. Live templates verified: `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` and `templates/batch-manifest.md` include the mined-from-DA fields rejected by the previous generic schemas.
4. Cross-artifact boundary under audit: `canon-facts-from-diegetic-artifacts` emits proposal surfaces; `tools/world-index` indexes them as existing `proposal_card` / `proposal_batch`; `tools/validators` validates their frontmatter; `canon-addition` later consumes shared proposal fields.
5. FOUNDATIONS alignment: Artifact Authority and Maturity says proposal review approval is not canon acceptance. Validator support preserves proposal audit metadata without treating proposals as canon or weakening Canon Safety/Mystery Reserve checks.
6. Existing output schema extension: this ticket extends validator acceptance for proposal card and batch surfaces. The extension is additive for mined-from-DA outputs and does not relax the generic `propose-new-canon-facts` schema for files that do not declare mined-from-DA provenance.
7. DB and CLI indexed read surfaces previously parsed indexed proposal Markdown as whole YAML, yielding empty-object/missing-all-fields noise for proposal cards and batches. `tools/validators/src/_helpers/index-access.ts` and `tools/validators/src/cli/_helpers.ts` now parse `proposal_card` and `proposal_batch` frontmatter before schema validation.
8. HARD-GATE discipline was read. This ticket changes structural validator signal only; it does not approve proposals, write canon, or weaken canon-write ordering.
9. The VALDA-001 scalar-content dependency is not satisfied in the live checkout used for verification. Full-world validation now has only four proposal scalar type failures in `PR-0002`/`PR-0003`; those are content repairs outside this validator-schema ticket.
10. The historical `animalia` full-world baseline changed from 1081 failures to 540 because proposal card/batch indexed frontmatter parsing removes legacy missing-all-fields noise. The integration assertions were updated to the current truthful baseline.

## Architecture Check

1. Added explicit mined-from-DA schema variants and source-aware schema selection instead of weakening the generic proposal-card/proposal-batch schemas. This keeps generic proposal outputs strict while validating the richer mining contract on its own terms.
2. Variant selection uses unambiguous parsed frontmatter markers such as `source_artifact_id`, `source_artifact_path`, `source_basis.source_artifact_id`, `source_basis.derived_from_artifact_path`, and mined audit fields while retaining the existing `proposal_card` / `proposal_batch` node types.
3. No backwards-compatibility aliasing/shims introduced.

## Landed Changes

### 1. Added mined-from-DA schema variants

Added schemas for the mining variants:

- `tools/validators/src/schemas/mined-proposal-card.schema.json`
- `tools/validators/src/schemas/mined-proposal-batch.schema.json`

The card schema accepts the fields declared by `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md`, including:

- `source_artifact_id`
- `mining_context`
- `narrator_reliability_basis`
- `canon_safety_check.invariants_violated`
- `canon_safety_check.mystery_reserve_firewall[]` entries as structured objects with `mr_id`, `overlap`, and `note`
- `canon_safety_check.distribution_discipline.why_not_universal_basis`
- `canon_safety_check.diegetic_to_world_laundering`
- `canon_safety_check.repairs_applied`
- `source_basis.source_artifact_id`
- `source_basis.derived_from_artifact_path`

The batch schema accepts the fields declared by `.claude/skills/canon-facts-from-diegetic-artifacts/templates/batch-manifest.md`, including:

- `source_artifact_id`
- `source_artifact_path`
- `parameters.max_cards`
- `parameters.allow_soft_canon_only`
- `claim_extraction_summary`
- `classification_counts`
- `flagged_contradictions`
- `mr_positional_flags`
- `single_narrator_concentration_flag`

### 2. Added source-aware schema selection

Updated validator schema selection so:

- Generic proposal cards continue to validate against `proposal-card.schema.json`.
- Proposal cards with mined-from-DA provenance validate against the mined card schema.
- Generic proposal batches continue to validate against `proposal-batch.schema.json`.
- Batches with mined-from-DA provenance validate against the mined batch schema.

The resolver lives in `tools/validators/src/structural/record-schema-compliance.ts`. World-index node types were not changed.

### 3. Expanded tests, read surfaces, and inventory docs

Updated:

- `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts`
- `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts`
- `tools/validators/tests/integration/spec04-verification.test.ts`
- `tools/validators/tests/integration/spec09-verification.test.ts`
- `tools/validators/README.md`

Also updated indexed read helpers so proposal card/batch records validate their frontmatter rather than raw Markdown bodies.

## Files Touched

- `tools/validators/src/schemas/mined-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/mined-proposal-batch.schema.json` (new)
- `tools/validators/src/structural/record-schema-compliance.ts`
- `tools/validators/src/_helpers/index-access.ts`
- `tools/validators/src/cli/_helpers.ts`
- `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts`
- `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts`
- `tools/validators/tests/integration/spec04-verification.test.ts`
- `tools/validators/tests/integration/spec09-verification.test.ts`
- `tools/validators/README.md`

## Out of Scope

- Do not edit or canonize the proposal content.
- Do not weaken generic proposal schemas to accept any arbitrary extra field.
- Do not create compatibility aliases for stale field names.
- Do not change `world-index` node vocabulary unless source-aware schema selection is impossible without it.
- Do not fix proposal scalar content in current live cards; the remaining scalar failures are separate content work.

## Verification Layers

1. Generic proposal schema remains strict: existing `proposal-surface-schema-compliance` tests still reject malformed generic proposal cards/batches.
2. Mined-from-DA card schema accepts required mining audit fields: new fixture test uses a representative `canon-facts-from-diegetic-artifacts` card frontmatter.
3. Mined-from-DA batch schema accepts required mining audit fields: new fixture test uses a representative mined batch manifest frontmatter.
4. Indexed proposal validation: temp-world integration test proves `proposal_card` and `proposal_batch` records validate parsed frontmatter from the built index.
5. Live corpus validation: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` has no schema-shape/additionalProperties/mined-audit-field failures for the mined proposal files. It exits nonzero only for four out-of-scope scalar type failures in `PR-0002`/`PR-0003`.
6. FOUNDATIONS alignment check: `source_basis.user_approved` remains proposal maturity metadata and is not treated as canon acceptance.

## Acceptance Criteria

### Tests That Must Pass

1. New mined-from-DA card fixture passes `record_schema_compliance`.
2. New mined-from-DA batch fixture passes `record_schema_compliance`.
3. Existing generic proposal-card and proposal-batch fixtures still pass and malformed generic fixtures still fail.
4. Negative mined fixtures with mined markers but missing top-level `source_artifact_id` fail with a required-field schema verdict.
5. Indexed proposal card/batch records validate parsed frontmatter from the read surface.
6. Live `erotica-world` validation no longer emits schema-shape failures for mined proposal files; the remaining four scalar type failures are out-of-scope content dependency drift:
   - `proposals/PR-0001-pre-displacement-long-tenure-leases.md`
   - `proposals/PR-0002-centro-cultivated-purchased-discretion-grammar.md`
   - `proposals/PR-0003-engineered-coincidence-first-contact-tradecraft.md`
   - `proposals/batches/BATCH-0001.md`

### Invariants

1. Mined-from-DA proposal audit traces remain machine-readable and are not collapsed into notes-only prose.
2. Generic proposal surfaces stay strict; this ticket adds a source-specific schema variant, not a broad escape hatch.
3. `source_basis.user_approved` retains proposal maturity semantics and must not be treated as canon acceptance.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts` - added mined-from-DA proposal card and batch fixtures, plus negative cases proving the variant still rejects missing required mining provenance.
2. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` - updated to prove indexed proposal-surface node types validate parsed frontmatter.
3. `tools/validators/tests/integration/spec04-verification.test.ts` and `tools/validators/tests/integration/spec09-verification.test.ts` - updated historical full-world baseline counts after proposal frontmatter parsing removed missing-all-fields noise.
4. `tools/validators/README.md` - updated schema inventory wording for proposal surface variants.

### Commands

1. From `tools/validators`: `npm run build`
2. From `tools/validators`: `node --test dist/tests/structural/proposal-surface-schema-compliance.test.js dist/tests/integration/spec61-proposal-surface-coverage.test.js`
3. From repo root: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json`
4. From `tools/validators`: `npm test`

## Outcome (2026-05-22)

Implemented strict mined-from-DA proposal card and batch schemas, parsed-provenance schema selection, indexed proposal-card/batch frontmatter parsing, targeted structural/integration coverage, README inventory text, and updated historical full-world baseline assertions affected by the parser fix.

## Verification Result

1. `npm run build` from `tools/validators` -> PASS.
2. `node --test dist/tests/structural/proposal-surface-schema-compliance.test.js dist/tests/integration/spec61-proposal-surface-coverage.test.js` from `tools/validators` -> PASS, 8 tests.
3. `npm test` from `tools/validators` -> PASS, 849 tests.
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` from repo root -> expected nonzero exit with only 4 failures:
   - `PR-0002` `/longer_term_consequences/2: must be string`
   - `PR-0003` `/immediate_consequences/3: must be string`
   - `PR-0003` `/longer_term_consequences/1: must be string`
   - `PR-0003` `/longer_term_consequences/6: must be string`

## Deviations

1. `tools/validators/src/structural/utils.ts` was not modified; schema resolution belongs directly in `record-schema-compliance.ts` for this validator-specific parsed-record decision.
2. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` was modified to prove indexed proposal card/batch frontmatter validation; no separate fixture files were needed.
3. Live `erotica-world` validation remains nonzero because the live checkout still has four scalar proposal-content failures in `PR-0002`/`PR-0003`. Proposal content repair is out of VALDA-002 scope, and no world proposal content was edited.
4. The broad `animalia` historical baseline count changed from 1081 to 540 because proposal card/batch indexed frontmatter parsing eliminated missing-all-fields legacy noise.
5. Follow-up ownership for the current live proposal scalar drift is `tickets/VALDA-003-restore-live-mined-proposal-scalar-repairs.md`.
