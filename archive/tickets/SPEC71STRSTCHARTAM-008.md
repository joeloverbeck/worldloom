# SPEC71STRSTCHARTAM-008: Migrate red-bunny + INDEX columns + capstone structural-validation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — strips the four hashes from the `erotica-world/red-bunny` bundle (engine-routed STCHAR ops + direct edits to plans/receipts/INDEX); capstone verification of the full SPEC-71 teardown.
**Deps**: archive/tickets/SPEC71STRSTCHARTAM-003.md, archive/tickets/SPEC71STRSTCHARTAM-004.md, archive/tickets/SPEC71STRSTCHARTAM-005.md, archive/tickets/SPEC71STRSTCHARTAM-006.md, archive/tickets/SPEC71STRSTCHARTAM-007.md

## Problem

`erotica-world/red-bunny` was the only existing bundle carrying the four hashes on operational story surfaces: STCHAR frontmatter, STCHAR body notes, page-plan §16a packets, prose receipts, and the INDEX Story Character Authority columns (SPEC-71 §2.3). Once 002 removed the fields from the schema (`additionalProperties:false`), those records needed a one-time strip. This ticket performs that migration and serves as the capstone: `world-validate erotica-world --structural` clean + package tests green across the teardown.

## Assumption Reassessment (2026-05-23)

1. Codebase: red-bunny carried hashes at `story-characters/STCHAR-{1,2,3}.md` frontmatter, `pages-prose-plans/PG-{1,2}.md` §16a `Hashes:` lines, `pages-prose-receipts/PG-{1,2}.yaml` `stchar_authority[]` hash sub-blocks, and `INDEX.md` Story Character Authority hash columns. Body-note reality was narrower than the draft ticket: `STCHAR-1` and `STCHAR-3` carried hash/source body notes; `STCHAR-2` no longer carried a body hash note after index sync.
2. Specs/docs: SPEC-71 §2.3 (migration mechanism, reassessment finding I4) + §5 acceptance criteria 4-6.
3. Cross-artifact boundary under audit: red-bunny's STCHAR records are engine-routed by skill prescription (under `story-characters/`, not `_source/`, NOT Hook-3-blocked); strip via the patch engine for the frontmatter/body-note surfaces; page plans, receipts, and INDEX are direct-write surfaces.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the migration is a logged consequence of the schema change (this ticket + SPEC-71); the records are stripped, not silently rewritten — the strip is the visible change.
5. Purpose-built STCHAR maintenance ops existed, but live schema/submit/pre-apply handling only allowed `page_packet_hash`. This ticket widened that same maintenance seam to the full retired field set (`profile_hash`, `voice_block_hash`, `page_packet_hash`, `source_char_hash`) rather than adding an ad hoc migration bypass.
6. Patch-engine same-file staging and validator pre-apply overlays were not cumulative for multiple maintenance ops against the same STCHAR file. The first approved submit exposed that only the final staged write per file survived. This ticket fixed the tracked tooling so multi-op STCHAR maintenance plans apply and validate cumulatively.
7. `worlds/erotica-world/` is ignored/private content. The red-bunny migration was applied on disk and proved directly by grep and structural validation; the tracked commit contains the tool/test/ticket/spec closeout, not force-added world content.

## Architecture Check

1. Routing the frontmatter/body-note strip through the existing `remove_*` ops (rather than `update_record_field` or a direct edit) preserves the engine-routed discipline for `story-characters/` records while page-plan/receipt/INDEX (direct-write surfaces) are edited directly.
2. The retired field set is represented once in the patch-engine envelope schema and exposed through MCP schema introspection; validation and submission now share that same field contract.
3. No shim: fields are removed from the live records; no compatibility copy retained.

## Verification Layers

1. red-bunny STCHAR frontmatter + body notes carry no hashes → grep-proof on `story-characters/`.
2. red-bunny page plans + receipts + INDEX carry no hashes → grep-proof on `pages-prose-plans/`, `pages-prose-receipts/`, `INDEX.md`.
3. Full bundle validates clean → `world-validate erotica-world --structural --json` (incl. the guard from 006).
4. Maintenance-op contract validates at the package boundary → patch-engine, validators, and world-mcp tests cover the widened retired field set and cumulative same-file staging.
5. Whole teardown package tests green → `tools/validators`, `tools/patch-engine`, `tools/world-mcp`, and `tools/world-index`.

## What to Change

### 1. Strip red-bunny STCHAR records (engine-routed)
Submit patch plans applying `remove_story_character_authority_frontmatter_field` (for `profile_hash`/`voice_block_hash`/`source_char_hash`) and `remove_story_character_authority_body_hash_note_field` to the STCHAR files that actually carry matching body-note metadata.

### 2. Strip direct-write surfaces
Remove the §16a `Hashes:` line from `pages-prose-plans/PG-1.md` + `PG-2.md`; remove the `profile_hash`/`voice_block_hash`/`page_packet_hash` sub-blocks from `pages-prose-receipts/PG-1.yaml` + `PG-2.yaml`; remove the Story Character Authority `profile_hash`/`voice_block_hash`/`page_packet_hash` columns from `INDEX.md`.

### 3. Capstone verification
Run `world-validate erotica-world --structural` (expect clean, incl. guard 006) and the `tools/` build+test suites.

## Files Touched

- `tools/patch-engine/src/envelope/schema.ts` (modified)
- `tools/patch-engine/src/ops/create-story-record.ts` (modified)
- `tools/patch-engine/src/ops/types.ts` (modified)
- `tools/patch-engine/src/commit/temp-file.ts` (modified)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modified)
- `tools/validators/src/_helpers/index-access.ts` (modified)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modified)
- `tools/world-mcp/tests/server/capability-parity.test.ts` (modified)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modified)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modified)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-1.md` (modified on ignored/private world content — via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-2.md` (modified on ignored/private world content — via patch engine)
- `worlds/erotica-world/stories/red-bunny/story-characters/STCHAR-3.md` (modified on ignored/private world content — via patch engine)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` (modified on ignored/private world content)
- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modified on ignored/private world content)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` (modified on ignored/private world content)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-2.yaml` (modified on ignored/private world content)
- `worlds/erotica-world/stories/red-bunny/INDEX.md` (modified on ignored/private world content)

## Out of Scope

- All code/schema/validator/skill/doc changes (001-007) — Deps.
- Job-A `plan_hash`/`state_hash` on the red-bunny PG records (SPEC-72; untouched here).

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "profile_hash|voice_block_hash|page_packet_hash|source_char_hash|Hashes:" worlds/erotica-world/stories/red-bunny` → exit 1 / zero matches.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` → `fail_count: 0`, `warn_count: 0`; the `forbidden_stchar_tamper_hash_fields` guard PASSes the bundle.
3. `npm test` in `tools/validators`, `tools/patch-engine`, `tools/world-mcp`, and `tools/world-index` → green.

### Invariants

1. red-bunny carries none of the four hashes on any surface after migration.
2. Job-A `state_hash`/`plan_hash` on red-bunny PG records are unchanged (SPEC-72 scope).

## Test Plan

### New/Modified Tests

1. Maintenance-op tests were amended to cover the widened retired field set and cumulative same-file staging.
2. MCP schema/capability tests were amended so the exposed maintenance schema and validator registry include the SPEC-71 guard.
3. Validator pre-apply tests now cover multi-field STCHAR maintenance overlays.

### Commands

1. `rg -n "profile_hash|voice_block_hash|page_packet_hash|source_char_hash|Hashes:" worlds/erotica-world/stories/red-bunny`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json`
3. `npm test` from `tools/validators`
4. `npm test` from `tools/patch-engine`
5. `npm test` from `tools/world-mcp`
6. `npm test` from `tools/world-index`

## Outcome

Completed on 2026-05-23.

The red-bunny bundle no longer carries the SPEC-71 retired STCHAR/page-packet hash fields on STCHAR records, page plans, prose receipts, or INDEX. STCHAR removal was applied through approved patch-engine plans:

1. `/tmp/spec71-red-bunny-stchar-strip-plan.json` after `world-index sync erotica-world` repaired an `index_stale` precondition.
2. `/tmp/spec71-red-bunny-stchar-strip-remaining-plan.json` after fixing same-file staging so remaining multi-op removals applied cumulatively.

The tracked tool changes widen the maintenance-op contract to the full retired field set and repair cumulative overlay/staging behavior in the patch-engine and validator pre-apply path.

## Verification Result

- PASS: `rg -n "profile_hash|voice_block_hash|page_packet_hash|source_char_hash|Hashes:" worlds/erotica-world/stories/red-bunny` returned no matches.
- PASS: `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --json` returned `fail_count: 0`, `warn_count: 0`, `info_count: 3`; the info entries were optional compatibility drift for absent `_source/plans` and `_source/artifacts`.
- PASS: `npm test` in `tools/patch-engine` (99/99).
- PASS: `npm test` in `tools/validators` (893/893).
- PASS: `npm test` in `tools/world-index` (131/131).
- PASS: `npm test` in `tools/world-mcp` after updating the SPEC-71 validator registry parity expectation.

## Deviations

- The ticket's draft body-note inventory was stale: `STCHAR-2` did not contain a matching body hash note after index sync, so the approved migration plan omitted nonexistent body-note removals for that file.
- The purpose-built maintenance ops were present but too narrow for this migration. This ticket widened the existing engine path instead of using a direct edit for STCHAR records.
- The first successful submit exposed non-cumulative same-file staging for maintenance ops; the remaining strip was applied after fixing that same-seam tooling bug.
- `worlds/erotica-world/` is ignored/private content. Those files are changed on disk and verified, but they are not force-added to the tracked commit.
