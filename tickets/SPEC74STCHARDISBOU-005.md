# SPEC74STCHARDISBOU-005: branching-story-turn-cycle/references/phase-7-page-plan.md §16a paragraph rewrite

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §16a paragraph rewrite (drops post-SPEC-71-stale hash citations)
**Deps**: None

## Problem

The `phase-7-page-plan.md` §16a paragraph still describes the per-character packet shape with hash citations (`profile_hash`, `voice_block_hash`, `page_packet_hash`) that no longer exist post-SPEC-71. The paragraph must be rewritten against the post-SPEC-71 / post-this-spec packet field set, including the new `Current-state grounding records:` field convention from SPEC74STCHARDISBOU-003. Per SPEC-74 §4.5 + §3 Out of Scope, the source report's hash-citation text is dropped — the rewrite replaces the field list with the canonical post-SPEC-71 set.

## Assumption Reassessment (2026-05-23)

1. Verified current `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §16a paragraph: still references `profile_hash`, `voice_block_hash`, `page_packet_hash` in the per-character packet field list — stale post-SPEC-71. Confirms SPEC-74 §4.5's premise that the rewrite must drop these references and replace with the post-SPEC-71 field set.
2. Verified SPEC-74 §4.5 specifies the rewrite content + the explicit drop of `profile_hash`, `voice_block_hash`, `page_packet_hash` references (per SPEC-71 + SPEC-74 §3 Out of Scope).
3. Cross-skill boundary under audit: the §16a paragraph in this reference IS the per-page authoring instruction that `branching-story-turn-cycle`'s page-plan authoring phase reads; it must align with the shared §16a contract in `story-state-contract.md` (SPEC74STCHARDISBOU-003). The two files restate the same contract in different procedural registers — turn-cycle's reference file gives the per-page authoring procedure; the shared template gives the canonical contract.
4. FOUNDATIONS principle restated: §Story Bundles §5c ("Present Causal State, Not Narrative Shape") — §16a current-state mentions MUST cite active state records as their grounding, not present current state as if it were durable STCHAR content. The new `Current-state grounding records:` field is the structural anchor.

## Architecture Check

1. The rewrite preserves the §16a paragraph's authoring-procedure role (when to author §16a, what to include, how to ground modulations). Only the field list and hash references change. This is the minimum viable diff to align the procedural reference with the post-SPEC-71 reality and the new `Current-state grounding records:` convention.
2. No backwards-compatibility shims. The hash citations are dropped outright per SPEC-71; reintroducing them would reverse SPEC-71's strip and would be caught by the `forbidden_stchar_tamper_hash_fields` validator.

## Verification Layers

1. **No hash-field references in §16a paragraph** → grep-proof: `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns 0 matches.
2. **`Current-state grounding records:` field cited in the §16a paragraph** → grep-proof: `grep -n 'Current-state grounding records:' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns ≥1 match.
3. **Multi-token `Required because:` (SPEC-73 vocabulary) cited as part of the packet field list** → grep-proof: `grep -n 'Required because' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns ≥1 match in the §16a paragraph.
4. **Forbid-world-CHAR-as-page-plan-authority rule explicit** → grep-proof: `grep -n 'Do not cite world `CHAR-\*`\|must not cite world `CHAR-\*`' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns ≥1 match.

## What to Change

### 1. Replace the §16a paragraph

Rewrite the §16a paragraph with the post-SPEC-71 / post-this-spec packet shape. Mandatory when any viewpoint character / speaker / major actor / direct target / emotionally salient character / behavior-shaping or offstage-causal character is present. Per-character packet projects stable STCHAR authority through active current state. Required fields:

- `STENT / STCHAR / display name`
- Multi-token `Required because:` (SPEC-73 vocabulary)
- `Stable STCHAR seed used`
- `Current-state grounding records:` (this spec — names active STEMO/BEL/STPLAN/SREL/STSTAT/STOBJ/STLOC/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG ids when page-local modulation depends on them, or `none; stable STCHAR authority only`)
- `Page-local projection`
- `Prose must-show`
- `Prose must-not-imply`
- `Anti-generic warnings`

Closing rule: "Use the active STCHAR profile as stable authority. Use active story-state records for current state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR."

### 2. Drop all references to `profile_hash`, `voice_block_hash`, `page_packet_hash`

These fields do NOT exist post-SPEC-71. The rewrite must not reintroduce them in any form (verbatim citation, paraphrase, or example).

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (modify)

## Out of Scope

- The shared §16a contract in `story-state-contract.md` (SPEC74STCHARDISBOU-003).
- The page-packet validator extension that enforces the new field convention (SPEC74STCHARDISBOU-010).
- Any reintroduction of STCHAR hash fields (forbidden by SPEC-71 + the existing `forbidden_stchar_tamper_hash_fields` validator).
- Migration of existing turn-cycle-generated §16a packets in red-bunny prose-plans (covered by SPEC74STCHARDISBOU-013).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns 0 matches.
2. `grep -n 'Current-state grounding records:' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns ≥1 match in the §16a paragraph.
3. `grep -n 'Required because' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returns ≥1 match.
4. The forbid-world-CHAR-as-page-plan-authority rule is present in the §16a paragraph.

### Invariants

1. The §16a paragraph aligns with the shared `story-state-contract.md` §16a contract (SPEC74STCHARDISBOU-003) — same field set, same projection-vs-authority framing.
2. No STCHAR tamper-hash field is cited anywhere in the paragraph; SPEC-71's strip is preserved.
3. Page-local modulations depending on current state are grounded in active state records, not in STCHAR.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (confirms 0 hash references)
2. `grep -n 'Current-state grounding records:\|Required because' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` (confirms both new + retained convention citations)
3. Manual inspection: cross-check the §16a paragraph's field list against the canonical list in `story-state-contract.md` (SPEC74STCHARDISBOU-003) for bit-for-bit alignment.
