# VALSTCHAR-003: Repair red-bunny STCHAR body integrity after page-packet cleanup

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — narrow STCHAR body-integrity maintenance operation, live `red-bunny` STCHAR hybrid records, validator pre-apply overlay, and world-mcp operation schema description
**Deps**: `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md`, `archive/tickets/VALDA-004-repair-red-bunny-da-claim-map-cf-id-scalars.md`

## Problem

At intake, `VALSTCHAR-002` had removed the retired STCHAR-local `page_packet_hash` authority from `red-bunny` STCHAR records. The focused story validation showed the ticketed `record_schema_compliance.additionalProperties` failures were gone, but the same three STCHAR records still failed or warned under newer STCHAR body validators.

Historical intake evidence from `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`:

- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` fail `stchar_body_integrity.hash_mismatch` because `profile_hash` no longer matches the canonical recompute from the STCHAR body.
- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` warn for missing required body subsections under `## Agency and Planning Tendencies` and `## Prose Rendering Constraints`.
- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` warn under `stchar_source_fact_coverage.missing_fact_map`.

This ticket brought those three live STCHAR records back into the current STCHAR body/source-map validation contract through an approved engine route. It did not direct-edit the hybrid STCHAR files as a shortcut.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md` added narrow STCHAR maintenance operations and removed `page_packet_hash` from the three `red-bunny` STCHAR records.
2. The current focused story validator output names `stchar_body_integrity.hash_mismatch`, missing required STCHAR body subsections, and `stchar_source_fact_coverage.missing_fact_map` on `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.
3. The shared boundary under audit is the STCHAR hybrid artifact contract: markdown body sections, `profile_hash` frontmatter, `voice_block_hash` frontmatter, and source operational fact-map metadata consumed by validators and story-pipeline retrieval.
4. FOUNDATIONS alignment: STCHAR is story-local authority, not world canon. Repairs must preserve story-local character authority without mutating world-level canon or bypassing hybrid-file engine discipline.
5. Current patch-engine routes should be rechecked before implementation. `VALSTCHAR-002` added two very narrow removal operations; they may not be sufficient for a broader body/source-map repair.
6. The adjacent `DA-0001 claim_map[].cf_id` schema failures are not owned here and were closed by `archive/tickets/VALDA-004-repair-red-bunny-da-claim-map-cf-id-scalars.md`; reassess the current validator output before assuming any remaining non-STCHAR residue.
7. Live reassessment confirmed there was no supported same-record operation that could replace an existing STCHAR body, add `source_operational_fact_map`, and restamp profile/voice hashes in one validated engine route.
8. The current validator proof after implementation has no `stchar_body_integrity` or `stchar_source_fact_coverage` verdicts. The remaining red-bunny failures are downstream page-local packet/receipt profile-hash drift caused by the repaired STCHAR `profile_hash` values; follow-up owner: `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md`.

## Architecture Check

1. Repaired the three active STCHAR records through a supported patch-engine path so content, hashes, and index state remain coherent.
2. No backwards-compatibility aliasing/shims introduced; STCHAR-local `page_packet_hash` was not reintroduced.

## Verification Layers

1. STCHAR body contract restored -> focused `stchar_body_integrity` validator proof over `red-bunny`.
2. Source fact-map contract restored -> focused `stchar_source_fact_coverage` validator proof over `red-bunny`.
3. Engine route respected -> patch receipt or supported operation evidence for each modified STCHAR hybrid file.
4. STCHAR-local page-packet authority remains retired -> grep proof that `page_packet_hash` remains absent from `STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md`.

## Landed Changes

### 1. Reassessed the current STCHAR body contract

Inspected the current STCHAR validators and schemas that emit:

- `stchar_body_integrity.hash_mismatch`
- `stchar_body_integrity.missing_subsection`
- `stchar_source_fact_coverage.missing_fact_map`

Confirmed the exact required body subsections and source-map shape before drafting the patch plan.

### 2. Added a supported STCHAR body-integrity repair route

Added `repair_story_character_authority_body_integrity`, a narrow patch-engine operation that:

- targets an existing indexed `story_character_authority_record` hybrid file by `story_slug` + `STCHAR-<n>`;
- replaces the body markdown with the supplied repaired body;
- writes the supplied `source_operational_fact_map`;
- computes and stamps `profile_hash` from the full repaired body and `voice_block_hash` from the `## Page-Plan Voice Block` section;
- validates through the normal `validate_patch_plan` / `submit_patch_plan` surfaces.

### 3. Repaired the three red-bunny STCHAR records

Through the supported engine route, updated:

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`

The repair preserved character meaning, added only validator-required structure/source-map metadata, and restamped `profile_hash` to the canonical recompute after body changes. `voice_block_hash` was recomputed by the engine and remained correct because the `## Page-Plan Voice Block` sections were unchanged.

### 4. Validated the focused story surface

Rebuilt the `erotica-world` index and reran the focused story validator. The owned STCHAR body/source-map failures are gone. Remaining nonzero failures are page-plan/prose-receipt profile-hash drift and are owned by `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md`.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modify through supported engine route)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- `tools/validators/src/structural/stchar-utils.ts` (modify)
- `tools/validators/tests/structural/stchar-body-integrity.test.ts` (modify)
- `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md` (new follow-up)
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Reintroducing `page_packet_hash` to STCHAR frontmatter or STCHAR body notes.
- Reopening the completed `DA-0001 claim_map[].cf_id` repair from `archive/tickets/VALDA-004-repair-red-bunny-da-claim-map-cf-id-scalars.md` unless fresh validation shows a regression.
- Restamping page-plan section 16a packet hashes or prose receipts. Follow-up: `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md`.
- Changing STCHAR validator semantics unless reassessment proves a validator bug.
- Direct filesystem edits that bypass the supported STCHAR hybrid write route.

## Acceptance Criteria

### Tests That Must Pass

1. Supported engine route validates and applies the STCHAR repairs without bypassing hybrid write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` must no longer emit `stchar_body_integrity.hash_mismatch`, `stchar_body_integrity.missing_subsection`, or `stchar_source_fact_coverage.missing_fact_map` for `STCHAR-1`, `STCHAR-2`, or `STCHAR-3`; any remaining nonzero exit must be classified from fresh output rather than assumed to be the completed DA residue.
4. `if rg -n 'page_packet_hash' worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md; then exit 1; else exit 0; fi`

### Invariants

1. `profile_hash` matches the canonical recompute from each STCHAR body.
2. `voice_block_hash` remains correct for the `## Page-Plan Voice Block` section.
3. STCHAR records remain story-local authority and do not mutate world-level canon.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-story-record.test.ts` — covers the new `repair_story_character_authority_body_integrity` operation and engine-computed hash stamping.
2. `tools/validators/tests/structural/stchar-body-integrity.test.ts` — proves the validator checks the new repair op during pre-apply.
3. `tools/validators/tests/structural/stchar-source-fact-coverage.test.ts` — proves the source-map validator checks the new repair op during pre-apply.
4. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — proves the operation is exposed through envelope-schema introspection.

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. `if rg -n 'page_packet_hash' worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md; then exit 1; else exit 0; fi`

## Outcome

Completed 2026-05-22.

Added `repair_story_character_authority_body_integrity` as a narrow STCHAR hybrid maintenance operation for existing story-character-authority files. The operation routes through the patch engine, validates the targeted file hash, replaces body markdown, writes `source_operational_fact_map`, and computes/stamps `profile_hash` and `voice_block_hash` through the canonical hash helpers.

Applied approved patch plan `/tmp/VALSTCHAR-003-red-bunny-stchar-body-integrity-repair.json` through the patch engine with token file `/tmp/VALSTCHAR-003-red-bunny-stchar-body-integrity-repair.token`. The receipt wrote:

- `STCHAR-1.md`: prior hash `b3d2343e93f9c1ce00f9119b15892ad6616129de79a3d233d4190914c2b0b720`, new hash `c95748a593a3f572e533b0edd14dc162527c27d564999f299a2b1053c23854dd`
- `STCHAR-2.md`: prior hash `93049a44cb73081a337d8d68e0830ec526cb1392e66f0fc3a063a96bd7a09ac4`, new hash `7cabc084957690453b2ef6b1154f2e46b43fe10a56b08ddee76f3eae6725d0e8`
- `STCHAR-3.md`: prior hash `724dca0e8bce202995b8552d95c47e521bccf73dc5fc107c02ee827e917bbfdc`, new hash `405ceaa50041c76a4bfd2be1b79aee4b34c5a71069cc23f23eda459a2808f16b`

The repaired STCHAR profile hashes are:

- `STCHAR-1`: `sha256:d72a67160ac581bf69a893657fe9a9d40b7fc12fb2667fe4cdf0390c78b88d26`
- `STCHAR-2`: `sha256:2e5f8169c590ebd09f157d9af87fc62a101925e9d9b2fec9140883d286f6df2e`
- `STCHAR-3`: `sha256:e749f9d3310472a01847fb965be14bd6dd295f8b6e1d30a9a489ffe0013f722f`

## Verification Result

Passed:

- `npm run build` in `tools/patch-engine`
- `node --test dist/tests/ops/create-story-record.test.js` in `tools/patch-engine` - 19 tests passed
- `npm run build` in `tools/validators`
- `node --test dist/tests/structural/stchar-body-integrity.test.js dist/tests/structural/stchar-source-fact-coverage.test.js` in `tools/validators` - 24 tests passed
- `npm run build` in `tools/world-mcp`
- `node --test dist/tests/tools/describe-envelope-schema.test.js` in `tools/world-mcp` - 8 tests passed
- `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/VALSTCHAR-003-red-bunny-stchar-body-integrity-repair.json`
- `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/VALSTCHAR-003-red-bunny-stchar-body-integrity-repair.json /tmp/VALSTCHAR-003-red-bunny-stchar-body-integrity-repair.token`
- `node tools/world-index/dist/src/cli.js build erotica-world`
- `if rg -n 'page_packet_hash' worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md; then exit 1; else exit 0; fi`

Focused story validation command:

- `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

Result: nonzero, with no `stchar_body_integrity` verdicts and no `stchar_source_fact_coverage` verdicts.

Remaining failures are outside this ticket:

- `page_plan_stchar_packet_integrity.hash_mismatch` for `PG-1.md` and `PG-2.md` section 16a packets because they still declare the old STCHAR profile hashes.
- `prose_receipt_stchar_integrity.hash_mismatch` for `PG-1.yaml` receipt `stchar_authority` entries because they still record the old STCHAR profile hashes.

Follow-up: `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md`.

## Deviations

- The live patch-engine surface did not have an existing same-record STCHAR body/source-map maintenance operation, so this ticket added `repair_story_character_authority_body_integrity` instead of using append/supersession or direct file edits.
- Final focused story validation remains nonzero because repairing the STCHAR profile hashes made page-plan section 16a packets and existing prose receipts stale. The active ticket explicitly excluded restamping those page-local surfaces, so the remaining work was split to `tickets/VALSTCHAR-004-restamp-red-bunny-page-packet-stchar-profile-hashes.md`.
- `VALDA-004` edits in `tools/patch-engine/src/ops/append-diegetic-artifact-record.ts`, `tools/patch-engine/tests/ops/append-diegetic-artifact-record.test.ts`, and related DA operation plumbing were pre-existing same-seam package dirt from the completed DA repair; this ticket only added the STCHAR body-integrity operation and tests on top of the shared files.
