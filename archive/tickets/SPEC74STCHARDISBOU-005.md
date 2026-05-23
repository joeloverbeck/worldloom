# SPEC74STCHARDISBOU-005: branching-story-turn-cycle/references/phase-7-page-plan.md §16a paragraph rewrite

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §16a paragraph rewrite (drops post-SPEC-71-stale hash citations)
**Deps**: None

## Problem

At intake, the `phase-7-page-plan.md` §16a paragraph still described the per-character packet shape without the post-SPEC-71 / post-SPEC-74 `Current-state grounding records:` field convention from SPEC74STCHARDISBOU-003. The paragraph has been rewritten against the canonical post-SPEC-71 packet field set. Per SPEC-74 §4.5 + §3 Out of Scope, no STCHAR hash fields are part of the landed §16a contract.

## Assumption Reassessment (2026-05-23)

1. At intake, `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §16a lacked the post-SPEC-74 `Current-state grounding records:` packet field and still used the older per-character packet shape. SPEC-74 §4.5 required replacing that paragraph with the post-SPEC-71 / post-this-spec field set and preserving the drop of `profile_hash`, `voice_block_hash`, and `page_packet_hash`.
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
4. **Forbid-world-CHAR-as-page-plan-authority rule explicit** → grep-proof: ``grep -n 'Do not cite world `CHAR-\*`' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`` returns ≥1 match.

## Landed Changes

### 1. Replaced the §16a paragraph

Rewrote the §16a paragraph with the post-SPEC-71 / post-this-spec packet shape. It is mandatory when any viewpoint character / speaker / major actor / direct target / emotionally salient character / behavior-shaping or offstage-causal character is present. Per-character packets project stable STCHAR authority through active current state and do not store current state inside STCHAR. Required fields now include:

- `STENT / STCHAR / display name`
- Multi-token `Required because:` (SPEC-73 vocabulary)
- `Stable STCHAR seed used`
- `Current-state grounding records:` (this spec — names active STEMO/BEL/STPLAN/SREL/STSTAT/STOBJ/STLOC/THR/OBL/CNSQ/CLK/STSEC/STQ/SE/PG ids when page-local modulation depends on them, or `none; stable STCHAR authority only`)
- `Page-local projection`
- `Prose must-show`
- `Prose must-not-imply`
- `Anti-generic warnings`

Closing rule: "Use the active STCHAR profile as stable authority. Use active story-state records for current state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR."

### 2. Preserved SPEC-71 hash removal

The rewritten paragraph does not reintroduce `profile_hash`, `voice_block_hash`, or `page_packet_hash` in any form.

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
3. Manual inspection: cross-check the §16a paragraph's field list against the canonical list in `story-state-contract.md` (SPEC74STCHARDISBOU-003) for contract alignment.

## Outcome

Completed: 2026-05-23

- Rewrote `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` §16a to use the post-SPEC-71 / post-SPEC-74 packet shape.
- Added the explicit `Current-state grounding records:` convention for both full and reduced `offstage_causal` §16a packets.
- Restated the projection boundary: stable STCHAR authority supplies durable character authority, active story-state records supply current state, and page plans must not cite world `CHAR-*` as operational page-plan characterization authority.
- Preserved SPEC-71's hash-field removal; no `profile_hash`, `voice_block_hash`, or `page_packet_hash` references remain in the turn-cycle reference.

## Verification Result

1. `grep -nE 'profile_hash|voice_block_hash|page_packet_hash' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returned no matches, as expected for the negative stale-hash proof.
2. `grep -n 'Current-state grounding records:\|Required because' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md` returned matches in the rewritten §16a full and reduced packet paragraphs.
3. ``grep -n 'Do not cite world `CHAR-\*`' .claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`` returned the world-CHAR prohibition in the rewritten §16a paragraph.
4. Manual review compared the rewritten field list against `.claude/skills/_shared-templates/story-state-contract.md` §16a and `archive/tickets/SPEC74STCHARDISBOU-003.md`; the turn-cycle reference now carries the same packet fields and projection-vs-authority boundary in procedural form.

## Deviations

- None.
