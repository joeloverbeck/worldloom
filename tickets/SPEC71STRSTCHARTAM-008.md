# SPEC71STRSTCHARTAM-008: Migrate red-bunny + INDEX columns + capstone structural-validation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — strips the four hashes from the `erotica-world/red-bunny` bundle (engine-routed STCHAR ops + direct edits to plans/receipts/INDEX); capstone verification of the full SPEC-71 teardown.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-003.md, archive/tickets/SPEC71STRSTCHARTAM-004.md, archive/tickets/SPEC71STRSTCHARTAM-005.md, archive/tickets/SPEC71STRSTCHARTAM-006.md, tickets/SPEC71STRSTCHARTAM-007.md

## Problem

`erotica-world/red-bunny` is the only existing bundle and carries the four hashes in 3 STCHAR frontmatter blocks, 3 STCHAR body `Hashes:` notes, 2 page-plan §16a `Hashes:` lines, 2 prose receipts, and the INDEX Story Character Authority columns (SPEC-71 §2.3). Once 002 removes the fields from the schema (`additionalProperties:false`), these records fail structural validation until stripped. This ticket performs the one-time migration and serves as the capstone: `world-validate erotica-world --structural` clean + `tools/` build+test green across the whole teardown.

## Assumption Reassessment (2026-05-22)

1. Codebase: red-bunny carries the hashes at `story-characters/STCHAR-{1,2,3}.md` (frontmatter `profile_hash`/`voice_block_hash`/`source_char_hash` + body `- Hashes:` note), `pages-prose-plans/PG-{1,2}.md` (§16a `Hashes:` line), `pages-prose-receipts/PG-{1,2}.yaml` (`stchar_authority[]` hash sub-blocks), and `INDEX.md` (Story Character Authority `profile_hash`/`voice_block_hash`/`page_packet_hash` columns). The purpose-built ops `remove_story_character_authority_frontmatter_field` + `remove_story_character_authority_body_hash_note_field` exist (`tools/patch-engine/src/ops/create-story-record.ts:199,236`, `commit/order.ts:43-44`).
2. Specs/docs: SPEC-71 §2.3 (migration mechanism, reassessment finding I4) + §5 acceptance criteria 4-6.
3. Cross-artifact boundary under audit: red-bunny's STCHAR records are engine-routed by skill prescription (under `story-characters/`, not `_source/`, NOT Hook-3-blocked); strip via the patch engine for the frontmatter/body-note surfaces; page plans, receipts, and INDEX are direct-write surfaces.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the migration is a logged consequence of the schema change (this ticket + SPEC-71); the records are stripped, not silently rewritten — the strip is the visible change.
5. Removed-record-fields / INDEX blast radius: after the strip, `grep -rnE "profile_hash|voice_block_hash|page_packet_hash|source_char_hash" worlds/erotica-world/stories/red-bunny/` → zero; the new guard (006) then PASSes the bundle.

## Architecture Check

1. Routing the frontmatter/body-note strip through the existing `remove_*` ops (rather than `update_record_field` or a direct edit) preserves the engine-routed discipline for `story-characters/` records while page-plan/receipt/INDEX (direct-write surfaces) are edited directly.
2. No shim: fields are removed from the live records; no compatibility copy retained.

## Verification Layers

1. red-bunny STCHAR frontmatter + body notes carry no hashes → grep-proof on `story-characters/`.
2. red-bunny page plans + receipts + INDEX carry no hashes → grep-proof on `pages-prose-plans/`, `pages-prose-receipts/`, `INDEX.md`.
3. Full bundle validates clean → `world-validate erotica-world --structural` (incl. the new guard from 006).
4. Whole teardown builds + tests green → `tools/` per-package build+test.

## What to Change

### 1. Strip red-bunny STCHAR records (engine-routed)
Submit a patch plan applying `remove_story_character_authority_frontmatter_field` (for `profile_hash`/`voice_block_hash`/`source_char_hash`) and `remove_story_character_authority_body_hash_note_field` to STCHAR-1/2/3.

### 2. Strip direct-write surfaces
Remove the §16a `Hashes:` line from `pages-prose-plans/PG-1.md` + `PG-2.md`; remove the `profile_hash`/`voice_block_hash`/`page_packet_hash` sub-blocks from `pages-prose-receipts/PG-1.yaml` + `PG-2.yaml`; remove the Story Character Authority `profile_hash`/`voice_block_hash`/`page_packet_hash` columns from `INDEX.md`.

### 3. Capstone verification
Run `world-validate erotica-world --structural` (expect clean, incl. guard 006) and the `tools/` build+test suites.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modify — via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modify — via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modify — via patch engine)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` (modify)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-2.yaml` (modify)
- `worlds/erotica-world/stories/red-bunny/INDEX.md` (modify)

## Out of Scope

- All code/schema/validator/skill/doc changes (001-007) — Deps.
- Job-A `plan_hash`/`state_hash` on the red-bunny PG records (SPEC-72; untouched here).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rnE "profile_hash|voice_block_hash|page_packet_hash|source_char_hash" worlds/erotica-world/stories/red-bunny/` → zero matches.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` → no hash-field findings; the `forbidden_stchar_tamper_hash_fields` guard PASSes the bundle.
3. `npm test --prefix tools/validators && npm test --prefix tools/patch-engine && npm test --prefix tools/world-mcp && npm test --prefix tools/world-index` → green.

### Invariants

1. red-bunny carries none of the four hashes on any surface after migration.
2. Job-A `state_hash`/`plan_hash` on red-bunny PG records are unchanged (SPEC-72 scope).

## Test Plan

### New/Modified Tests

1. `None — migration + capstone ticket; verification is grep-proof + world-validate + the cross-package build/test suites the prior tickets introduced/amended.`

### Commands

1. `grep -rnE "profile_hash|voice_block_hash|page_packet_hash|source_char_hash" worlds/erotica-world/stories/red-bunny/`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json`
3. `npm test --prefix tools/validators && npm test --prefix tools/patch-engine && npm test --prefix tools/world-mcp && npm test --prefix tools/world-index`
