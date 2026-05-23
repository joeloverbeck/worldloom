# SPEC71STRSTCHARTAM-005: Remove the hash declarations from the §16a + STCHAR-body contract docs

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-record-schemas.md`, `.claude/skills/_shared-templates/story-state-contract.md` (authoring-contract docs).
**Deps**: None

## Problem

At intake, the shared authoring contracts still instructed skills to emit the four hashes: `story-record-schemas.md` §4.5.19 (STCHAR schema rows + the "Tooling (STCHAR and page-packet hash computation)" block) and §4.6 (prose-receipt `stchar_authority[]` hash sub-blocks); `story-state-contract.md` §8/§16a (the `Hashes:` line in both the full packet template and the `offstage_causal` reduced packet, plus page-packet hash tooling prose). This ticket removes those contract declarations so the documents skills author against (007) no longer prescribe hashes (SPEC-71 §1.3 §16a-contract row).

## Assumption Reassessment (2026-05-22)

1. Codebase: `story-state-contract.md:467` and `:486` carry `Hashes: profile_hash=<hash>; voice_block_hash=<hash>; page_packet_hash=<hash>.`; `:500` documents `page_packet_hash` computation; `story-record-schemas.md` §4.5.19 lists `profile_hash`/`voice_block_hash` STCHAR frontmatter rows + the compute-stchar tooling block, §4.6 lists the receipt hash sub-blocks. (Confirmed via this session's prose-attach + reassessment reads.)
2. Specs/docs: SPEC-71 §1.3 §16a-contract row + §2.1; coherent with the skill edits in 007 (skills author per these contracts).
3. Cross-artifact boundary under audit: the shared `_shared-templates` contract surface that all five story skills (007) and the prose-attach validator read — the contract must stop prescribing the hashes before/with the skills that emit them.
4. FOUNDATIONS §5b (Schema-Minimalism): the contract's hash declarations are the authoring-side source of the token cost the spec removes; the page-packet-hash tooling block and the STCHAR-global hash tooling block are deleted entirely.

## Assumption Reassessment (2026-05-23)

1. Resume validation: `.codex/run-state/implement-spec-tickets.json` points at this ticket; `last_work_commit` (`adc9bd4ec3c9c05dc52217add5892d1c00a2b1cc`) is reachable; latest state-file commit is `8bddaeff`; the tracked worktree was clean at intake. Ignored package artifacts under `tools/{world-index,patch-engine,validators,world-mcp}` were pre-existing and unrelated to this docs-only ticket.
2. Live contract check: the expected hash declarations were present only in `.claude/skills/_shared-templates/story-state-contract.md` and `.claude/skills/_shared-templates/story-record-schemas.md` for this ticket's owned surface. The active sibling skill prose still names hashes and remains owned by `tickets/SPEC71STRSTCHARTAM-007.md`.
3. Boundary correction: line-number references in the draft were historical intake hints, not durable authority. The landed change removes the hash rows/tooling while preserving `source_char_id`, `source_char_sections_used`/`source_operational_fact_map`, §16a `required_because`, voice authority, and prose-receipt `deterministic_verdict`.

## Architecture Check

1. Editing the contract docs as a standalone ticket (no code Deps) keeps the doc change reviewable in isolation; it is coherent with 007 (skills) and should land in the same review window, but neither breaks code.
2. No shim: the `Hashes:` lines and tooling blocks are deleted, not marked deprecated.

## Verification Layers

1. Neither packet template (full + offstage_causal) carries a `Hashes:` line → grep-proof on `story-state-contract.md`.
2. §4.5.19/§4.6 carry no `profile_hash`/`voice_block_hash`/`page_packet_hash` rows and no compute-stchar tooling block → grep-proof on `story-record-schemas.md`.

## Landed Changes

### 1. story-state-contract.md §8/§16a
Removed the `Hashes:` line from the full §16a packet template and the `offstage_causal` reduced packet template. Replaced the hash-validation paragraph with page-local authority prose based on required character presence, active snapshot membership, and voice/behavior authority. Retained `required_because`, the voice/dialogue authority block, and all non-hash packet content.

### 2. story-record-schemas.md §4.5.19 + §4.6
§4.5.19: removed the `profile_hash`/`voice_block_hash`/`source_char_hash` STCHAR frontmatter field rows and the "Tooling (STCHAR and page-packet hash computation)" block; retained `source_kind`/`source_char_id`/`source_char_sections_used`/`source_operational_fact_map`. §4.6: removed the `profile_hash`/`voice_block_hash`/`page_packet_hash` sub-blocks from the `stchar_authority[]` receipt shape; retained `stchar_id`/`stent_id`/`display_name`/`required_because`/`packet_present`/`active_in_snapshot`/`deterministic_verdict`.

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

## Outcome

Completed: 2026-05-23.

The shared template contracts no longer prescribe STCHAR frontmatter content-tamper hashes, §16a packet hash lines, page-packet hash computation, or prose-receipt hash comparison sub-blocks. STCHAR provenance remains non-hash based through `source_char_id`, `source_char_sections_used`, and `source_operational_fact_map`; §16a packet authority still requires `required_because` and voice/behavior authority; prose receipts still record packet presence, snapshot activity, and `deterministic_verdict`.

## Verification Result

1. `! grep -nE "Hashes: profile_hash|page_packet_hash|voice_block_hash" .claude/skills/_shared-templates/story-state-contract.md` passed with no matches.
2. `! grep -nE "profile_hash|voice_block_hash|page_packet_hash|compute-stchar-hashes" .claude/skills/_shared-templates/story-record-schemas.md` passed with no matches.
3. `rg -n "source_operational_fact_map|source_char_id|required_because|Voice/dialogue authority|deterministic_verdict" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` confirmed the retained non-hash authority fields/prose.
4. `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/_shared-templates/story-record-schemas.md` passed.

## Deviations

- No runtime test was added or run because this is a shared-template documentation ticket; the accepted proof is negative grep plus manual contract review of retained authority fields.
- Active skill prose remains intentionally out of scope and is owned by `tickets/SPEC71STRSTCHARTAM-007.md`.
