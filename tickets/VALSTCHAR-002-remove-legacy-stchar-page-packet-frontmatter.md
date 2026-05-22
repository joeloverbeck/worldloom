# VALSTCHAR-002: Remove legacy STCHAR `page_packet_hash` frontmatter from red-bunny

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-character-authority migration/supersession path, live `red-bunny` STCHAR records, and validator live-corpus proof
**Deps**: `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md`

## Problem

`VALSTCHAR-001` corrected the shared STCHAR/page-packet contract so `page_packet_hash` is page-local rather than STCHAR-global. The live `red-bunny` STCHAR hybrid records still carry the retired `page_packet_hash` frontmatter field, so `record_schema_compliance` now correctly reports `additionalProperties` failures for `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.

This ticket owns removing or superseding those legacy STCHAR fields through an approved engine-supported story-character-authority path. It must not direct-edit the hybrid STCHAR files as a shortcut.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-001-fix-page-packet-hash-contract.md` removed `page_packet_hash` from `tools/validators/src/schemas/story-character-authority.schema.json` and changed page-plan/prose-receipt validation so page-local packet hashes are checked against each page's §16a packet projection.
2. Live evidence after `VALSTCHAR-001`: `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md` each still have `page_packet_hash` in frontmatter at line 8. Each body also has a "Hashes" note that still describes `page_packet_hash` as STCHAR-bundle projection metadata.
3. The exact shared boundary under audit is the existing live STCHAR hybrid record shape versus the corrected `story-character-authority_record` schema and the story-pipeline authoring contract.
4. FOUNDATIONS alignment: story-local character authority belongs to the story bundle, but page-specific projection state must not be represented as a global STCHAR invariant. Removing the legacy field strengthens validation truth without changing world canon.
5. This ticket touches live world/story artifacts and must preserve AGENTS.md write-boundary discipline. Do not bypass the engine for STCHAR hybrid writes; first verify the current patch-engine / world-mcp story-character operation surface and use the supported append/supersession/migration route.
6. Adjacent DA `claim_map[].cf_id` failures seen in the same `red-bunny` live-corpus validation are separate from this STCHAR cleanup and are out of scope here.

## Architecture Check

1. Use the existing engine-supported story-character-authority route rather than direct filesystem surgery so the hybrid record lineage, indexes, and validation gates stay coherent.
2. No backwards-compatibility aliasing/shims introduced. The end state should not re-allow `STCHAR.page_packet_hash` as a schema alias.

## Verification Layers

1. Legacy field removed from live STCHAR authority -> schema validation / live-corpus validator proof over `red-bunny`.
2. Page-local hash contract preserved -> codebase grep-proof or focused validator proof confirming `page_packet_hash` remains valid only in page-plan §16a packets and prose receipts.
3. Engine route respected -> manual review of the patch receipt, generated/indexed state, or the exact supported operation used for STCHAR hybrid mutation.
4. FOUNDATIONS alignment -> manual review that the cleanup does not mutate world-level canon or weaken story-bundle validation gates.

## What to Change

### 1. Verify the supported STCHAR write route

Inspect the current patch-engine / world-mcp operation surface for story-character-authority hybrid records. Confirm whether the correct route is supersession, append, or a migration operation before editing any live story-character file.

### 2. Remove legacy STCHAR page-packet authority

Using the supported engine route, remove or supersede the legacy `page_packet_hash` frontmatter on:

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`

Also correct any same-record body note that still describes `page_packet_hash` as STCHAR-local authority, without rewriting unrelated STCHAR prose.

### 3. Refresh derived state and validate

Rebuild or sync the `erotica-world` index through the package CLI, then rerun the focused story validation and confirm the STCHAR `record_schema_compliance.additionalProperties` failures are gone.

## Files to Touch

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

1. Supported engine/patch route validates and applies the STCHAR cleanup without bypassing story-character-authority write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` may remain nonzero for unrelated DA and STCHAR body/source-map findings, but it must no longer emit `record_schema_compliance.additionalProperties` for `red-bunny:STCHAR-1`, `red-bunny:STCHAR-2`, or `red-bunny:STCHAR-3`.

### Invariants

1. STCHAR frontmatter carries only STCHAR-global hash authority: `profile_hash` and `voice_block_hash`.
2. `page_packet_hash` remains page-local on page-plan §16a packets and prose receipts.
3. Existing story-character lineage and index state remain coherent after the cleanup.

## Test Plan

### New/Modified Tests

1. None — live-story cleanup ticket; verification is command-based against existing validators and package CLI.

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. A focused grep or JSON validation summary proving no remaining STCHAR `record_schema_compliance.additionalProperties` verdicts for `STCHAR-1`, `STCHAR-2`, or `STCHAR-3`.
