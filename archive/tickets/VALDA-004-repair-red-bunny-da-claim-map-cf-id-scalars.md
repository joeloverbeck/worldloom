# VALDA-004: Repair red-bunny DA-0001 claim_map cf_id scalar schema failures

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — narrow DA claim-map maintenance operation, live `DA-0001` diegetic-artifact hybrid record, validator pre-apply overlay, and world-mcp operation schema description
**Deps**: `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md`

## Problem

At intake, the focused `red-bunny` structural validation run used to close `VALSTCHAR-002` remained nonzero because live `DA-0001` had schema-invalid `claim_map[]` entries where `canon_status: canonically_true` was paired with `cf_id: null`.

Historical intake evidence from `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`:

- `record_schema_compliance.type` failures report `DA-0001 schema violation at /claim_map/<index>/cf_id: must be string`.
- Paired `record_schema_compliance.if` failures report the same `claim_map` entries do not match the conditional schema.
- The failing file is `diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`.

This ticket added and used an approved engine route for a narrow diegetic-artifact claim-map metadata repair so `DA-0001` conforms to the current diegetic-artifact frontmatter schema without changing the artifact prose or promoting local artifact claims to world canon.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md` did not touch DA content; it only exposed this DA schema debt while validating the focused story lane.
2. The current validator schema requires a string `claim_map[].cf_id` when `canon_status` is `canonically_true`. The live `DA-0001` invalid entries are `canonically_true` with `cf_id: null`, not object/list scalar drift.
3. The shared boundary under audit is diegetic-artifact frontmatter schema compliance for `claim_map[]`, the `diegetic-artifact-generation` claim-map contract, and the patch-engine route used to mutate existing DA hybrid files.
4. FOUNDATIONS alignment: diegetic artifacts are canon-reading / in-world artifacts, not world-canon mutation. Repairing frontmatter shape must not silently canonize, retcon, or reinterpret the artifact claims.
5. Hybrid files under `diegetic-artifacts/` are engine-routed by repo discipline. Live reassessment found only `append_diegetic_artifact_record` for world-level DA files, which creates new hybrid files and rejects existing targets. A same-file DA maintenance route is required before repairing `DA-0001`.
6. The truthful metadata repair is to retag unbacked local/direct artifact claims away from `canonically_true` rather than inventing CF references or creating new canon facts. `diegetic-artifact-generation` Phase 7d explicitly routes direct `canonically_true` claims without resolvable CFs to retagging.
7. Red-bunny STCHAR body/hash/source-map failures are separate STCHAR validation debt and are not owned here.

## Architecture Check

1. Repair the malformed DA frontmatter through a supported patch-engine path so schema compliance and index state remain coherent.
2. No backwards-compatibility aliasing/shims introduced; do not loosen the DA schema to accept non-string `claim_map[].cf_id` values unless reassessment proves the schema itself is wrong.

## Verification Layers

1. DA schema shape restored -> focused `record_schema_compliance` proof over `DA-0001`.
2. Engine route respected -> patch receipt and supported operation evidence for the modified diegetic-artifact hybrid file.
3. Canon discipline preserved -> manual review that the repair changes only schema shape/serialization, not artifact claim meaning or world-canon status.

## Landed Changes

### 1. Inspect the live DA shape and schema

Inspected `DA-0001` through targeted reads and inspected `tools/validators/src/schemas/diegetic-artifact-frontmatter.schema.json`. The invalid entries were claim-map indices `0,1,2,3,4,5,6,7,10,15,16,17,19,20,21`, all with `canon_status: canonically_true` and `cf_id: null`.

### 2. Repair DA-0001 through the engine route

Added and used `repair_diegetic_artifact_claim_map_metadata`, a supported patch-engine route that updates only the metadata fields required to repair `claim_map[]` schema conformance on an existing DA hybrid file. Through that route, repaired:

- `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`

The repair preserved the artifact prose and claim text while converting unbacked `canonically_true` metadata into schema-valid `partially_true` claim-map metadata that does not promote local artifact claims to world canon.

### 3. Validate the focused story surface

Rebuilt the `erotica-world` index and reran focused validation. This ticket does not own remaining STCHAR body/hash/source-map failures.

## Files to Touch

- `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md` (modify through supported engine route)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/tests/ops/append-diegetic-artifact-record.test.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Changing artifact prose or claim meaning.
- Promoting DA claims to world canon.
- Loosening the DA schema to accept malformed `cf_id` values.
- Fixing STCHAR body-integrity or source-map warnings.
- Direct filesystem edits that bypass the supported diegetic-artifact hybrid write route.

## Acceptance Criteria

### Tests That Must Pass

1. Supported engine route validates and applies the DA repair without bypassing hybrid write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` may remain nonzero for unrelated STCHAR failures, but it must no longer emit `record_schema_compliance` failures for `DA-0001 claim_map[].cf_id`.

### Invariants

1. `DA-0001 claim_map[]` entries do not pair `canon_status: canonically_true` with missing/null `cf_id`.
2. DA claim meaning and canon status are preserved.
3. The repair does not mutate world-level canon.

## Test Plan

### New/Modified Tests

1. Patch-engine/world-mcp operation coverage for the new DA claim-map maintenance route.

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. Focused grep or validator-output proof showing no remaining `DA-0001 claim_map[].cf_id` schema failures.

## Outcome

Completed 2026-05-22.

Added `repair_diegetic_artifact_claim_map_metadata` as a narrow patch-engine maintenance operation for existing world-level DA hybrid records. The operation:

- targets an indexed `diegetic_artifact_record` by `DA-<integer>` id and matching `target_file`;
- verifies the current content hash and per-entry preconditions;
- only retags unbacked `canonically_true` / `cf_id: null` claim-map entries to `partially_true` or `contested`;
- preserves artifact body prose and claim text;
- adds a `repair_trace.valda_004` note to each repaired claim-map entry.

World-mcp now describes the new operation schema, and validators pre-apply file inputs project the repaired DA frontmatter so `record_schema_compliance` validates the post-operation shape during patch-plan validation.

Applied approved patch plan `/tmp/VALDA-004-red-bunny-da-claim-map-repair.json` through the patch engine with token file `/tmp/VALDA-004-red-bunny-da-claim-map-repair.token`. The receipt wrote:

- `worlds/erotica-world/diegetic-artifacts/marla-kerns-journal-the-iker-entries.md`
- prior hash `9d84b5980bd41f7ccb63b4454fafa7dfff7956d796c33c09db3702304a426b71`
- new hash `3deef5191cd920f02d8544dd6dc97fba32cd196a482d3a038d31691d33d75e72`

The repaired claim-map indices are `0,1,2,3,4,5,6,7,10,15,16,17,19,20,21`.

## Verification Result

Passed:

- `npm run build` in `tools/patch-engine`
- `node --test dist/tests/ops/append-diegetic-artifact-record.test.js` in `tools/patch-engine` - 4 tests passed
- `npm run build` in `tools/validators`
- `node --test dist/tests/structural/record-schema-compliance.test.js` in `tools/validators` - 35 tests passed
- `npm run build` in `tools/world-mcp`
- `node --test dist/tests/tools/describe-envelope-schema.test.js` in `tools/world-mcp` - 8 tests passed
- `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/VALDA-004-red-bunny-da-claim-map-repair.json`
- `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/VALDA-004-red-bunny-da-claim-map-repair.json /tmp/VALDA-004-red-bunny-da-claim-map-repair.token`
- direct post-write probe: `bad=0`, `valda004=15` for `DA-0001` claim-map metadata
- `node tools/world-index/dist/src/cli.js build erotica-world`
- targeted validator-output proof over `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`: command exit `1`, but `targeted_hits=0` for `DA-0001`, `claim_map`, and `record_schema_compliance`

Focused story validation command:

- `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

Result: nonzero, with no DA `record_schema_compliance` failures and no `DA-0001 claim_map[].cf_id` failures.

Remaining failures are outside this ticket:

- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` `stchar_body_integrity.hash_mismatch` failures.
- STCHAR missing-subsection warnings and `stchar_source_fact_coverage.missing_fact_map` warnings.

## Deviations

- The live failure shape was narrowed from drafted "non-string scalar" drift to `canonically_true` entries with `cf_id: null`.
- The live patch-engine surface had no world-level DA same-file maintenance operation, so this ticket added a narrow claim-map metadata operation instead of using the existing append-only DA creation route.
- The final focused validator command remains nonzero for pre-existing STCHAR validation debt, but the DA-owned `record_schema_compliance` failures are gone.
