# SPEC71STRSTCHARTAM-005: Remove the hash declarations from the §16a + STCHAR-body contract docs

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-record-schemas.md`, `.claude/skills/_shared-templates/story-state-contract.md` (authoring-contract docs).
**Deps**: None

## Problem

The shared authoring contracts still instruct skills to emit the four hashes: `story-record-schemas.md` §4.5.19 (STCHAR schema rows + the "Tooling (STCHAR and page-packet hash computation)" block) and §4.6 (prose-receipt `stchar_authority[]` hash sub-blocks); `story-state-contract.md` §8/§16a (the `Hashes:` line in both the full packet template `:467` and the `offstage_causal` reduced packet `:486`, plus the page_packet_hash tooling prose `:500`). This ticket removes those contract declarations so the documents skills author against (007) no longer prescribe hashes (SPEC-71 §1.3 §16a-contract row).

## Assumption Reassessment (2026-05-22)

1. Codebase: `story-state-contract.md:467` and `:486` carry `Hashes: profile_hash=<hash>; voice_block_hash=<hash>; page_packet_hash=<hash>.`; `:500` documents `page_packet_hash` computation; `story-record-schemas.md` §4.5.19 lists `profile_hash`/`voice_block_hash` STCHAR frontmatter rows + the compute-stchar tooling block, §4.6 lists the receipt hash sub-blocks. (Confirmed via this session's prose-attach + reassessment reads.)
2. Specs/docs: SPEC-71 §1.3 §16a-contract row + §2.1; coherent with the skill edits in 007 (skills author per these contracts).
3. Cross-artifact boundary under audit: the shared `_shared-templates` contract surface that all five story skills (007) and the prose-attach validator read — the contract must stop prescribing the hashes before/with the skills that emit them.
4. FOUNDATIONS §5b (Schema-Minimalism): the contract's hash declarations are the authoring-side source of the token cost the spec removes; the page-packet-hash tooling block and the STCHAR-global hash tooling block are deleted entirely.

## Architecture Check

1. Editing the contract docs as a standalone ticket (no code Deps) keeps the doc change reviewable in isolation; it is coherent with 007 (skills) and should land in the same review window, but neither breaks code.
2. No shim: the `Hashes:` lines and tooling blocks are deleted, not marked deprecated.

## Verification Layers

1. Neither packet template (full + offstage_causal) carries a `Hashes:` line → grep-proof on `story-state-contract.md`.
2. §4.5.19/§4.6 carry no `profile_hash`/`voice_block_hash`/`page_packet_hash` rows and no compute-stchar tooling block → grep-proof on `story-record-schemas.md`.

## What to Change

### 1. story-state-contract.md §8/§16a
Remove the `Hashes: profile_hash=…; voice_block_hash=…; page_packet_hash=…` line from the full §16a packet template (`:467`) and the `offstage_causal` reduced packet template (`:486`); remove the `page_packet_hash` computation prose (`:500`) and any sibling profile/voice-hash framing in the §16a load-bearing-hash paragraph. Retain `required_because`, the voice/dialogue authority block, and all non-hash packet content.

### 2. story-record-schemas.md §4.5.19 + §4.6
§4.5.19: remove the `profile_hash`/`voice_block_hash`/`source_char_hash` STCHAR frontmatter field rows and the "Tooling (STCHAR and page-packet hash computation)" block; retain `source_kind`/`source_char_id`/`source_char_sections_used`/`source_operational_fact_map`. §4.6: remove the `profile_hash`/`voice_block_hash`/`page_packet_hash` sub-blocks from the `stchar_authority[]` receipt shape; retain `stchar_id`/`stent_id`/`display_name`/`required_because`/`packet_present`/`active_in_snapshot`/`deterministic_verdict`.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)

## Out of Scope

- The skill SKILL.md edits (007) that author per these contracts.
- Code schemas/validators (001/002); MCP (`archive/tickets/SPEC71STRSTCHARTAM-003.md`).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Hashes: profile_hash|page_packet_hash|voice_block_hash" .claude/skills/_shared-templates/story-state-contract.md` → zero.
2. `grep -nE "profile_hash|voice_block_hash|page_packet_hash" .claude/skills/_shared-templates/story-record-schemas.md` → zero (the §4.5.19 rows, tooling block, and §4.6 sub-blocks all gone).

### Invariants

1. The §16a packet contract still requires `required_because` + voice authority; only the hash declarations are removed.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is grep-proof against the two shared-template files. The contract is consumed by the prose-attach validator + the five story skills (named in Assumption Reassessment item 3).`

### Commands

1. `grep -nE "Hashes: profile_hash|page_packet_hash|voice_block_hash" .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -nE "profile_hash|voice_block_hash|page_packet_hash|compute-stchar-hashes" .claude/skills/_shared-templates/story-record-schemas.md`
