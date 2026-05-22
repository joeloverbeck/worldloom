# VALSTCHAR-004: Restamp red-bunny page-packet STCHAR profile hashes after STCHAR body repair

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — live `red-bunny` page prose-plan and prose-receipt hash surfaces
**Deps**: `tickets/VALSTCHAR-003-repair-red-bunny-stchar-body-integrity.md`

## Problem

`VALSTCHAR-003` repaired `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` body integrity through the patch engine. That repair correctly changed each STCHAR `profile_hash`, while leaving page-plan section 16a packets and existing prose receipts stamped with the pre-repair profile hashes.

Post-`VALSTCHAR-003` focused validation evidence:

- `page_plan_stchar_packet_integrity.hash_mismatch` for `PG-1.md` and `PG-2.md` section 16a packets, for `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.
- `prose_receipt_stchar_integrity.hash_mismatch` for `PG-1.yaml` receipt `stchar_authority` entries, for `STCHAR-1`, `STCHAR-2`, and `STCHAR-3`.

This ticket owns restamping those page-local STCHAR hash surfaces to the repaired STCHAR profile hashes without changing STCHAR authority prose or world canon.

## Assumption Reassessment (2026-05-22)

1. The repaired STCHAR stored hashes are:
   - `STCHAR-1 profile_hash=sha256:d72a67160ac581bf69a893657fe9a9d40b7fc12fb2667fe4cdf0390c78b88d26`
   - `STCHAR-2 profile_hash=sha256:2e5f8169c590ebd09f157d9af87fc62a101925e9d9b2fec9140883d286f6df2e`
   - `STCHAR-3 profile_hash=sha256:e749f9d3310472a01847fb965be14bd6dd295f8b6e1d30a9a489ffe0013f722f`
2. The stale page-local surfaces are `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`, `PG-2.md`, and `pages-prose-receipts/PG-1.yaml`.
3. The shared boundary under audit is page-local STCHAR packet/receipt hash coherence after a profile authority restamp.
4. FOUNDATIONS alignment: this is story-local derived/hash metadata, not world-canon mutation. Do not change world-level canon or STCHAR body meaning.

## Architecture Check

1. Restamp only page-local hash comparison/packet fields that validator output proves stale.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. Page-plan section 16a packets match repaired STCHAR profile hashes -> focused `page_plan_stchar_packet_integrity` validator proof.
2. Prose receipt STCHAR authority comparisons match repaired STCHAR profile hashes -> focused `prose_receipt_stchar_integrity` validator proof.
3. STCHAR body/source-map repair remains intact -> `stchar_body_integrity` and `stchar_source_fact_coverage` still pass.

## What to Change

### 1. Restamp page-plan packets

Update the `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` profile hashes in the section 16a packets for:

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`

### 2. Restamp prose receipt comparisons

Update the `STCHAR-1`, `STCHAR-2`, and `STCHAR-3` `stchar_authority` profile-hash comparison entries in:

- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`
- `worlds/erotica-world/_index/` (regenerate, ignored derived artifact)

## Out of Scope

- Changing STCHAR body prose or `source_operational_fact_map`.
- Changing page prose text.
- Mutating world-level canon.
- Reintroducing `page_packet_hash` to STCHAR files.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` no longer emits `page_plan_stchar_packet_integrity.hash_mismatch` or `prose_receipt_stchar_integrity.hash_mismatch` for `STCHAR-1`, `STCHAR-2`, or `STCHAR-3`.

### Invariants

1. Repaired STCHAR `profile_hash` values remain unchanged.
2. `voice_block_hash` values remain unchanged unless a future ticket changes the voice block.
3. Page-local `page_packet_hash` remains page-local; do not add it back to STCHAR frontmatter or body notes.

## Test Plan

### New/Modified Tests

1. `None — live-world restamp proof is command-based against existing validators.`

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
