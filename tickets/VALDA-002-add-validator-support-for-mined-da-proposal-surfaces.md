# VALDA-002: Add validator schema support for mined-from-DA proposal surfaces

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes - `tools/validators` schemas, schema selection, tests, and README/inventory docs if present
**Deps**: `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md` for final live `erotica-world` validator green; targeted schema fixtures can be implemented independently

## Problem

The current `record_schema_compliance` validator applies the generic `proposal-card.schema.json` and `proposal-batch.schema.json` to all files under `worlds/<slug>/proposals/`. That rejects valid output from `.claude/skills/canon-facts-from-diegetic-artifacts`, whose mined-from-DA proposal cards and batch manifests intentionally carry mining-specific audit fields such as `source_artifact_id`, `mining_context`, `narrator_reliability_basis`, `source_basis.derived_from_artifact_path`, `canon_safety_check.diegetic_to_world_laundering`, `classification_counts`, and `single_narrator_concentration_flag`.

The result is noisy full-world validation: after `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`, `erotica-world` currently reports 130 `record_schema_compliance` failures, most of which are schema/tooling drift rather than bad content.

## Assumption Reassessment (2026-05-22)

1. Current schema mapping is node-type-only: `tools/validators/src/structural/utils.ts` maps `proposal_card` to `proposal-card` and `proposal_batch` to `proposal-batch`; `tools/validators/src/structural/record-schema-compliance.ts` routes `proposals/*.md` and `proposals/batches/*.md` to those node types without source-skill variant detection.
2. Source-skill contract verified: `.claude/skills/canon-facts-from-diegetic-artifacts/references/canon-rules-and-foundations.md` states the proposal card is structurally parallel to the sibling template but adds `source_artifact_id`, `source_basis.derived_from_artifact_path`, and `canon_safety_check.diegetic_to_world_laundering`; the batch manifest adds `source_artifact_id`, `source_artifact_path`, `classification_counts`, `flagged_contradictions`, `mr_positional_flags`, and `single_narrator_concentration_flag`.
3. Live templates verified: `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md` and `templates/batch-manifest.md` include the mined-from-DA fields rejected by the current generic schemas.
4. Cross-artifact boundary under audit: `canon-facts-from-diegetic-artifacts` emits proposal surfaces; `tools/world-index` indexes them as existing `proposal_card` / `proposal_batch`; `tools/validators` validates their frontmatter; `canon-addition` later consumes shared proposal fields.
5. FOUNDATIONS alignment: Artifact Authority and Maturity says proposal review approval is not canon acceptance. Validator support must preserve proposal audit metadata without treating proposals as canon or weakening Canon Safety/Mystery Reserve checks.
6. Existing output schema extension: this ticket extends validator acceptance for proposal card and batch surfaces. The extension should be additive for mined-from-DA outputs and must not relax the generic `propose-new-canon-facts` schema for files that do not declare mined-from-DA provenance.
7. Adjacent issue classified as completed dependency: malformed YAML scalar entries in live `PR-0002`/`PR-0003` were real content syntax defects and were repaired by `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`.

## Architecture Check

1. Add explicit mined-from-DA schema variants and source-aware schema selection instead of weakening the generic proposal-card/proposal-batch schemas. This keeps generic proposal outputs strict while validating the richer mining contract on its own terms.
2. Prefer variant selection by unambiguous frontmatter markers (`source_artifact_id: DA-*`, `source_artifact_path`, or `source_basis.source_artifact_id`) while retaining the existing `proposal_card` / `proposal_batch` node types. Avoid a world-index migration unless implementation proves a new node type is necessary.
3. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Generic proposal schema remains strict -> existing `proposal-surface-schema-compliance` tests still reject malformed generic proposal cards/batches.
2. Mined-from-DA card schema accepts required mining audit fields -> new fixture test using a representative `canon-facts-from-diegetic-artifacts` card frontmatter.
3. Mined-from-DA batch schema accepts required mining audit fields -> new fixture test using a representative mined batch manifest frontmatter.
4. Live corpus validation -> after `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`, `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` has `fail_count: 0` or, if unrelated live defects exist, no failures in the four mined proposal files from this batch.
5. FOUNDATIONS alignment check -> tests or code comments should preserve Artifact Authority semantics: `user_approved: true` means kept in batch, not canonized.

## What to Change

### 1. Add mined-from-DA schema variants

Add schemas for the mining variants, likely:

- `tools/validators/src/schemas/mined-proposal-card.schema.json`
- `tools/validators/src/schemas/mined-proposal-batch.schema.json`

The card schema should accept the fields declared by `.claude/skills/canon-facts-from-diegetic-artifacts/templates/proposal-card.md`, including:

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

The batch schema should accept the fields declared by `.claude/skills/canon-facts-from-diegetic-artifacts/templates/batch-manifest.md`, including:

- `source_artifact_id`
- `source_artifact_path`
- `parameters.max_cards`
- `parameters.allow_soft_canon_only`
- `claim_extraction_summary`
- `classification_counts`
- `flagged_contradictions`
- `mr_positional_flags`
- `single_narrator_concentration_flag`

### 2. Add source-aware schema selection

Update validator schema selection so:

- Generic proposal cards continue to validate against `proposal-card.schema.json`.
- Proposal cards with mined-from-DA provenance validate against the mined card schema.
- Generic proposal batches continue to validate against `proposal-batch.schema.json`.
- Batches with mined-from-DA provenance validate against the mined batch schema.

Implementation may add a resolver near `tools/validators/src/structural/record-schema-compliance.ts` or `tools/validators/src/structural/utils.ts`; do not change world-index node types unless necessary.

### 3. Expand tests and inventory docs

Add or update tests around `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts` and, if needed, `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts`. Update validator README/inventory/count tests if the schema inventory has explicit counts.

## Files to Touch

- `tools/validators/src/schemas/mined-proposal-card.schema.json` (new)
- `tools/validators/src/schemas/mined-proposal-batch.schema.json` (new)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/validators/src/structural/utils.ts` (modify if schema resolution belongs there)
- `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts` (modify)
- `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` (modify if integration coverage tracks proposal-surface schema breadth)
- `tools/validators/README.md` (modify if schema/validator inventory lists proposal surface coverage)

## Out of Scope

- Do not edit or canonize the proposal content.
- Do not weaken generic proposal schemas to accept any arbitrary extra field.
- Do not create compatibility aliases for stale field names.
- Do not change `world-index` node vocabulary unless source-aware schema selection is impossible without it.
- Do not fix YAML scalar syntax in current live cards; that was completed by `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`.

## Acceptance Criteria

### Tests That Must Pass

1. New mined-from-DA card fixture passes `record_schema_compliance`.
2. New mined-from-DA batch fixture passes `record_schema_compliance`.
3. Existing generic proposal-card and proposal-batch fixtures still pass and malformed generic fixtures still fail.
4. After `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`, `node tools/validators/dist/src/cli/world-validate.js erotica-world --json` no longer emits `record_schema_compliance` failures for:
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

1. `tools/validators/tests/structural/proposal-surface-schema-compliance.test.ts` - add mined-from-DA proposal card and batch fixtures, plus negative cases proving the variant still rejects missing required mining provenance.
2. `tools/validators/tests/integration/spec61-proposal-surface-coverage.test.ts` - update if this integration test snapshots proposal surface coverage/counts.
3. `tools/validators/README.md` or inventory tests - update only if the validator package documents schema surface counts.

### Commands

1. `npm run build --prefix tools/validators`
2. `node --test tools/validators/dist/tests/structural/proposal-surface-schema-compliance.test.js`
3. `node --test tools/validators/dist/tests/integration/spec61-proposal-surface-coverage.test.js` if modified by implementation
4. `npm test --prefix tools/validators`
5. After `archive/tickets/VALDA-001-repair-mined-proposal-yaml-scalars.md`: `node tools/validators/dist/src/cli/world-validate.js erotica-world --json`
