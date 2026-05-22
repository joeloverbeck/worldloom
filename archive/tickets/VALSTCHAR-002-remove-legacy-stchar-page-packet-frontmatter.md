# VALSTCHAR-002: Remove legacy STCHAR `page_packet_hash` frontmatter from red-bunny

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-character-authority frontmatter maintenance operation, live `red-bunny` STCHAR records, and validator live-corpus proof
**Deps**: `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md`

## Problem

`VALSTCHAR-001` corrected the shared STCHAR/page-packet contract so `page_packet_hash` is page-local rather than STCHAR-global. The live `red-bunny` STCHAR hybrid records still carry the retired `page_packet_hash` frontmatter field, so `record_schema_compliance` now correctly reports `additionalProperties` failures for `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.

This ticket owns adding the missing engine-supported STCHAR frontmatter maintenance route, then removing those legacy STCHAR fields through that approved route. It must not direct-edit the hybrid STCHAR files as a shortcut.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md` removed `page_packet_hash` from `tools/validators/src/schemas/story-character-authority.schema.json` and changed page-plan/prose-receipt validation so page-local packet hashes are checked against each page's §16a packet projection.
2. Live evidence after `VALSTCHAR-001`: `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md` each still have `page_packet_hash` in frontmatter at line 8. Each body also has a "Hashes" note that still describes `page_packet_hash` as STCHAR-bundle projection metadata.
3. The exact shared boundary under audit is the existing live STCHAR hybrid record shape versus the corrected `story-character-authority_record` schema and the story-pipeline authoring contract.
4. FOUNDATIONS alignment: story-local character authority belongs to the story bundle, but page-specific projection state must not be represented as a global STCHAR invariant. Removing the legacy field strengthens validation truth without changing world canon.
5. This ticket touches live world/story artifacts and must preserve AGENTS.md write-boundary discipline. Do not bypass the engine for STCHAR hybrid writes. Live reassessment found `append_story_character_authority_record` and `supersede_story_character_authority_record`, but no existing operation that removes an obsolete frontmatter key from an existing STCHAR hybrid file.
6. Adjacent DA `claim_map[].cf_id` failures seen in the same `red-bunny` live-corpus validation are separate from this STCHAR cleanup and are out of scope here.
7. Superseding `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` would not satisfy the owned invariant by itself: the old invalid hybrid records would remain schema-validated, and all active page/entity/choice/plan references would need a broader story-state migration. The truthful same-seam fix is a narrow schema-maintenance operation that rewrites existing STCHAR frontmatter through the patch engine while preserving body text and story meaning.
8. First validation of the new maintenance patch plan failed only on pre-existing `DA-0001` `claim_map[].cf_id` schema failures. That is validator overbreadth for this op class: `record_schema_compliance` should validate pre-apply file inputs / overlay records touched by the plan, not block a targeted STCHAR maintenance repair on unrelated current-world DA debt.

## Architecture Check

1. Add and use a narrow engine-supported story-character-authority frontmatter maintenance route rather than direct filesystem surgery so the hybrid record identity, indexes, and validation gates stay coherent.
2. No backwards-compatibility aliasing/shims introduced. The end state should not re-allow `STCHAR.page_packet_hash` as a schema alias.

## Verification Layers

1. Legacy field removed from live STCHAR authority -> schema validation / live-corpus validator proof over `red-bunny`.
2. Page-local hash contract preserved -> codebase grep-proof or focused validator proof confirming `page_packet_hash` remains valid only in page-plan §16a packets and prose receipts.
3. Engine route respected -> manual review of the patch receipt, generated/indexed state, or the exact supported operation used for STCHAR hybrid mutation.
4. FOUNDATIONS alignment -> manual review that the cleanup does not mutate world-level canon or weaken story-bundle validation gates.

## What to Change

### 1. Add the supported STCHAR maintenance route

Add a narrow patch-plan operation that removes a named legacy frontmatter field from an existing story-character-authority hybrid record. The operation must:

- target only `story_character_authority_record` hybrid files;
- preserve the record id and markdown body;
- reject unsupported fields rather than becoming a generic arbitrary delete path;
- validate through `validate_patch_plan` / `submit_patch_plan` like other patch-engine operations.

### 2. Remove legacy STCHAR page-packet authority

Using the supported engine route, remove the legacy `page_packet_hash` frontmatter on:

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`

Also correct any same-record body note that still describes `page_packet_hash` as STCHAR-local authority, without rewriting unrelated STCHAR prose.

### 3. Refresh derived state and validate

Rebuild or sync the `erotica-world` index through the package CLI, then rerun the focused story validation and confirm the STCHAR `record_schema_compliance.additionalProperties` failures are gone.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- `tools/validators/src/structural/record-schema-compliance.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- `tools/validators/tests/structural/record-schema-compliance.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modify through supported engine route)
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Reintroducing `page_packet_hash` to the STCHAR schema or context packet inventory.
- Changing `profile_hash` or `voice_block_hash` semantics.
- Restamping page-plan §16a packet hashes or prose receipts already corrected by `VALSTCHAR-001`.
- Fixing DA `claim_map[].cf_id` failures or STCHAR source fact coverage warnings.
- Direct filesystem edits that bypass the supported STCHAR hybrid write route.

## Acceptance Criteria

### Tests That Must Pass

1. Supported engine/patch maintenance route validates and applies the STCHAR cleanup without bypassing story-character-authority write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` may remain nonzero for unrelated DA and STCHAR body/source-map findings, but it must no longer emit `record_schema_compliance.additionalProperties` for `red-bunny:STCHAR-1`, `red-bunny:STCHAR-2`, or `red-bunny:STCHAR-3`.

### Invariants

1. STCHAR frontmatter carries only STCHAR-global hash authority: `profile_hash` and `voice_block_hash`.
2. `page_packet_hash` remains page-local on page-plan §16a packets and prose receipts.
3. Existing story-character lineage and index state remain coherent after the cleanup.

## Test Plan

### New/Modified Tests

1. Patch-engine/world-mcp operation coverage as needed for the new STCHAR frontmatter maintenance route.

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. A focused grep or JSON validation summary proving no remaining STCHAR `record_schema_compliance.additionalProperties` verdicts for `STCHAR-1`, `STCHAR-2`, or `STCHAR-3`.

## Outcome

Completed 2026-05-22.

Added two narrow STCHAR hybrid maintenance patch operations:

- `remove_story_character_authority_frontmatter_field` removes only the retired `page_packet_hash` frontmatter field from existing `story_character_authority_record` files.
- `remove_story_character_authority_body_hash_note_field` removes only the matching legacy `page_packet_hash` clause from the STCHAR `Hashes` body note.

Both operations are exposed in the patch-envelope schema, staged through the patch engine, included in patch ordering/metadata, and represented in world-mcp schema descriptions. Validator pre-apply overlay support now projects these maintenance operations into file inputs, and `record_schema_compliance` pre-apply runs with explicit file inputs are scoped to the touched indexed files so unrelated current-world schema debt does not block a targeted maintenance repair.

Applied the cleanup through approved patch plans:

- `/tmp/VALSTCHAR-002-red-bunny-stchar-frontmatter-cleanup.json`
- `/tmp/VALSTCHAR-002-red-bunny-stchar-body-note-cleanup.json`

The patch engine wrote the three live STCHAR files and refreshed the world index. Final `rg` proof over `STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md` shows only:

- `Hashes: profile_hash over the full body markdown; voice_block_hash over the ## Page-Plan Voice Block section.`

There is no remaining `page_packet_hash` in those three STCHAR records.

## Verification Result

Passed:

- `npm run build` in `tools/patch-engine`
- `node --test dist/tests/ops/create-story-record.test.js` in `tools/patch-engine` - 18 tests passed
- `npm run build` in `tools/validators`
- `node --test dist/tests/structural/record-schema-compliance.test.js` in `tools/validators` - 35 tests passed
- `npm run build` in `tools/world-mcp`
- `node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/tools/validate-patch-plan.test.js` in `tools/world-mcp` - 20 tests passed
- `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/VALSTCHAR-002-red-bunny-stchar-frontmatter-cleanup.json`
- `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/VALSTCHAR-002-red-bunny-stchar-body-note-cleanup.json`
- `node tools/world-index/dist/src/cli.js build erotica-world`
- `rg -n "page_packet_hash|Hashes|STCHAR-bundle|bundle projection" worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`

Focused story validation command:

- `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

Result: nonzero, with no `record_schema_compliance.additionalProperties` verdicts for `red-bunny:STCHAR-1`, `red-bunny:STCHAR-2`, or `red-bunny:STCHAR-3`.

Remaining failures are outside this ticket:

- Pre-existing `DA-0001` `claim_map[].cf_id` schema failures. Follow-up: `tickets/VALDA-004-repair-red-bunny-da-claim-map-cf-id-scalars.md`.
- STCHAR body-integrity warnings/hash mismatches and source fact-map warnings on `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`. The body-note cleanup necessarily changes the STCHAR body text, but this ticket did not own restamping `profile_hash` or retrofitting the newer STCHAR body/source-map contract. Follow-up: `tickets/VALSTCHAR-003-repair-red-bunny-stchar-body-integrity.md`.

## Deviations

- The live patch-engine surface did not have an existing same-record STCHAR frontmatter maintenance route, so this ticket added the narrow operation instead of using append/supersession.
- Supersession was rejected during reassessment because it would leave the old invalid STCHAR records schema-validated and require broader story reference migration.
- The first frontmatter patch-plan validation exposed validator overbreadth: unrelated `DA-0001` schema failures blocked targeted STCHAR maintenance. The implementation narrowed `record_schema_compliance` pre-apply checks to explicit touched file inputs while leaving full-world validation unchanged.
- The first frontmatter submit token was observed as already consumed after a context handoff; the target files showed that submit had succeeded, so no replay was attempted.
