# VALSTCHAR-003: Repair red-bunny STCHAR body integrity after page-packet cleanup

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — live `red-bunny` STCHAR hybrid records and, if current engine routes are insufficient, a narrow STCHAR body/frontmatter maintenance operation
**Deps**: `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md`

## Problem

`VALSTCHAR-002` removed the retired STCHAR-local `page_packet_hash` authority from `red-bunny` STCHAR records. The focused story validation now shows the ticketed `record_schema_compliance.additionalProperties` failures are gone, but the same three STCHAR records still fail or warn under newer STCHAR body validators.

Current `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` evidence:

- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` fail `stchar_body_integrity.hash_mismatch` because `profile_hash` no longer matches the canonical recompute from the STCHAR body.
- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` warn for missing required body subsections under `## Agency and Planning Tendencies` and `## Prose Rendering Constraints`.
- `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` warn under `stchar_source_fact_coverage.missing_fact_map`.

This ticket owns bringing those three live STCHAR records back into the current STCHAR body/source-map validation contract through an approved engine route. It must not direct-edit the hybrid STCHAR files as a shortcut.

## Assumption Reassessment (2026-05-22)

1. `archive/tickets/VALSTCHAR-002-remove-legacy-stchar-page-packet-frontmatter.md` added narrow STCHAR maintenance operations and removed `page_packet_hash` from the three `red-bunny` STCHAR records.
2. The current focused story validator output names `stchar_body_integrity.hash_mismatch`, missing required STCHAR body subsections, and `stchar_source_fact_coverage.missing_fact_map` on `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.
3. The shared boundary under audit is the STCHAR hybrid artifact contract: markdown body sections, `profile_hash` frontmatter, `voice_block_hash` frontmatter, and source operational fact-map metadata consumed by validators and story-pipeline retrieval.
4. FOUNDATIONS alignment: STCHAR is story-local authority, not world canon. Repairs must preserve story-local character authority without mutating world-level canon or bypassing hybrid-file engine discipline.
5. Current patch-engine routes should be rechecked before implementation. `VALSTCHAR-002` added two very narrow removal operations; they may not be sufficient for a broader body/source-map repair.
6. Adjacent `DA-0001 claim_map[].cf_id` schema failures are separate DA validation debt and are not owned here.

## Architecture Check

1. Repair the three active STCHAR records through a supported patch-engine path so content, hashes, and index state remain coherent.
2. No backwards-compatibility aliasing/shims introduced; do not reintroduce STCHAR-local `page_packet_hash`.

## Verification Layers

1. STCHAR body contract restored -> focused `stchar_body_integrity` validator proof over `red-bunny`.
2. Source fact-map contract restored -> focused `stchar_source_fact_coverage` validator proof over `red-bunny`.
3. Engine route respected -> patch receipt or supported operation evidence for each modified STCHAR hybrid file.
4. Page-local hash contract preserved -> grep proof that `page_packet_hash` remains absent from `STCHAR-1.md`, `STCHAR-2.md`, and `STCHAR-3.md`.

## What to Change

### 1. Reassess the current STCHAR body contract

Inspect the current STCHAR validators and schemas that emit:

- `stchar_body_integrity.hash_mismatch`
- `stchar_body_integrity.missing_subsection`
- `stchar_source_fact_coverage.missing_fact_map`

Confirm the exact required body subsections and source-map shape before drafting a patch plan.

### 2. Repair the three red-bunny STCHAR records

Through the supported engine route, update:

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md`
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`

The repair should preserve character meaning, add only validator-required structure/source-map metadata, and restamp `profile_hash` to the canonical recompute after any body changes. `voice_block_hash` should change only if the `## Page-Plan Voice Block` section changes.

### 3. Validate the focused story surface

Rebuild the `erotica-world` index and rerun the focused story validator. This ticket does not own unrelated DA validation failures.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modify through supported engine route)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modify through supported engine route)
- `tools/patch-engine/src/` (modify only if current engine routes cannot lawfully perform the STCHAR repair)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` and related tests (modify only if a new operation is required)
- `tools/validators/tests/` (modify only if validator fixture coverage is required)
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Reintroducing `page_packet_hash` to STCHAR frontmatter or STCHAR body notes.
- Fixing `DA-0001 claim_map[].cf_id` schema failures.
- Restamping page-plan section 16a packet hashes or prose receipts.
- Changing STCHAR validator semantics unless reassessment proves a validator bug.
- Direct filesystem edits that bypass the supported STCHAR hybrid write route.

## Acceptance Criteria

### Tests That Must Pass

1. Supported engine route validates and applies the STCHAR repairs without bypassing hybrid write discipline.
2. `node tools/world-index/dist/src/cli.js build erotica-world`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` may remain nonzero for unrelated DA failures, but it must no longer emit `stchar_body_integrity.hash_mismatch`, `stchar_body_integrity.missing_subsection`, or `stchar_source_fact_coverage.missing_fact_map` for `STCHAR-1`, `STCHAR-2`, or `STCHAR-3`.
4. `rg -n "page_packet_hash" worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` returns no hits.

### Invariants

1. `profile_hash` matches the canonical recompute from each STCHAR body.
2. `voice_block_hash` remains correct for the `## Page-Plan Voice Block` section.
3. STCHAR records remain story-local authority and do not mutate world-level canon.

## Test Plan

### New/Modified Tests

1. `None unless a new engine operation or validator fix is required; live-world repair proof is command-based against existing validators.`

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
3. `rg -n "page_packet_hash" worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md`
