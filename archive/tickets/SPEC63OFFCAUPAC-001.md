# SPEC63OFFCAUPAC-001: §16a contract — add the offstage-causal packet tier

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/_shared-templates/story-state-contract.md` §16a (shared page-plan contract consumed by branching-story-bootstrap, branching-story-turn-cycle, branching-story-prose-attach, and the page_plan_stchar_packet_integrity / prose_receipt_stchar_integrity validators). No code change.
**Deps**: None

## Problem

At intake, the §16a STCHAR authority-packet contract offered only two postures: emit a full present packet, or omit a background-only entity. A causally-relevant offstage character — not present on the page but whose offstage activity bears on it — had no lawful reduced posture, so authoring had to either over-author a full packet (including a voice block for someone who never speaks on-page) or drop the character from `active_records` and lose their offstage causal authority. SPEC-59 §5 deferred this gap as an authoring-contract extension. This ticket added the contract tier that the validator (003) and authoring skills (002) consume.

## Assumption Reassessment (2026-05-21)

1. The §16a `Required because:` enum currently reads `viewpoint | speaker | major_actor | direct_target | emotionally_salient | behavior_shapes_page | voice_shapes_page` at `.claude/skills/_shared-templates/story-state-contract.md:464`; the packet template (lines ~460–476) carries `profile_hash`/`voice_block_hash`/`page_packet_hash` plus voice/appraisal/pressure/relationship/perception/agency lines. No offstage value and no reduced shape exist — confirmed.
2. Source: SPEC-59 §5 (`archive/specs/SPEC-59-stchar-authority-fidelity-validators.md`) defers `offstage_causal_packet`; `reports/stchar-audit-first-iteration.md` §8 (lines ~391–426) proposes the amendment. SPEC-63 §2.1 + §5 reject the audit's separate `packet_scope` field in favor of one `required_because` value.
3. Cross-artifact boundary under audit: §16a is a SHARED contract in `_shared-templates/`. Consumers — `branching-story-bootstrap` + `branching-story-turn-cycle` (emit packets), `branching-story-prose-attach` (validates receipts against them), and the `page_plan_stchar_packet_integrity` / `prose_receipt_stchar_integrity` validators (enforce shape). The added tier must not break any consumer's parse of the present-packet shape — it is purely additive (a new enum value + a new optional reduced shape).
4. FOUNDATIONS §5b (Schema-Minimalism At Story Scope) motivates the one-enum-value-not-new-field decision: a separate `packet_scope` field would duplicate the discriminator. §6.1 (Story-Local Character Authority) — the reduced packet keeps offstage authority STCHAR-sourced. §9 (Prose Length Discipline) — the reduction is by sections omitted, never by word budget. Restated before trusting the spec narrative; all three hold.

## Architecture Check

1. A new `required_because` value reuses the discriminator the validator already parses (003 reads `Required because:`), so there is no new field and no new parse surface — the minimal contract change that expresses the offstage tier. Carrying all three hashes on the reduced packet keeps the receipt-side hash machinery uniform (no schema change needed in 003).
2. No backwards-compatibility shim: the present-packet shape is unchanged; a full packet authored for an offstage character stays valid. The offstage tier is an added option, not a replacement.

## Verification Layers

1. The §16a enum now includes `offstage_causal` -> codebase grep-proof (`grep "offstage_causal" story-state-contract.md`).
2. The reduced packet shape is documented (carries hashes + appraisal/pressure/causal-relevance; omits the voice block) -> manual review of the §16a section.
3. The emit/omit boundary is stated as authoring judgment, not validator-graded -> manual review.
4. FOUNDATIONS §5b alignment (no new schema field introduced) -> FOUNDATIONS alignment check.

## Landed Changes

### 1. Add `offstage_causal` to the §16a Required-because enum

In `.claude/skills/_shared-templates/story-state-contract.md` §16a, appended `offstage_causal` to the `Required because:` value list.

### 2. Document the reduced offstage packet shape

After the present-packet template block, added a sub-section describing the `offstage_causal` packet: it **carries** `profile_hash`/`voice_block_hash`/`page_packet_hash` (declared from the STCHAR's stored frontmatter hashes, exactly as the full packet), `Relevant appraisal rules`, `Relevant pressure behavior` (when applicable), and a new `Offstage causal relevance:` line; it **omits** the `Voice/dialogue authority:` block and the on-page rendering lines (perception/embodiment, agency rendering, prose-must-show dialogue cues).

### 3. Document the emit/omit boundary

Stated that an active offstage character (`entity_status.location: offstage`) whose offstage activity causally bears on the page should carry an `offstage_causal` packet; one with no causal bearing may be omitted as background-only, and the omission must not ask the prose renderer to infer persona from an id. The boundary is authoring judgment, not validator-graded.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify)

## Out of Scope

- A distinct `packet_scope` field (rejected per §5b — SPEC-63 §5).
- The broader §8 packet-shape amendments (structured `page_relevant_projection`, `included_stchar_sections`, `omitted_sections_with_reason`, `active_in_pg_snapshot`) — SPEC-63 §5; not adopted here.
- Validator enforcement of the new tier (SPEC63OFFCAUPAC-003).
- Authoring-skill emission guidance (SPEC63OFFCAUPAC-002).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "offstage_causal" .claude/skills/_shared-templates/story-state-contract.md` returns the new enum value plus the reduced-shape sub-section.
2. The present-packet template block is unchanged — the existing `profile_hash=<hash>; voice_block_hash=<hash>; page_packet_hash=<hash>` line is still present.
3. No new YAML schema field is introduced (manual review — only markdown contract prose changes).

### Invariants

1. The present-character full-packet shape and its `Required because:` values remain valid and unchanged (additive-only contract extension).
2. The offstage packet carries all three integrity hashes, so receipt-side hash comparison needs no schema change.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "offstage_causal\|Offstage causal relevance" .claude/skills/_shared-templates/story-state-contract.md`
2. `grep -n "Required because:" .claude/skills/_shared-templates/story-state-contract.md` (confirm the enum line now includes `offstage_causal`)
3. A narrower command is the correct verification boundary: this is a single-file contract amendment with no executable surface; validator enforcement is verified in SPEC63OFFCAUPAC-003's test suite.

## Outcome

Completed: 2026-05-21

The shared §16a story-state contract now includes `offstage_causal` in the `Required because:` enum and documents a reduced offstage packet shape. The reduced packet carries the same three STCHAR integrity hashes as the full packet, carries offstage operational authority through appraisal, pressure behavior, and `Offstage causal relevance:`, and omits voice/dialogue plus on-page rendering lines because the character is not rendered on the page.

The emit/omit boundary is now explicit: offstage causal relevance is authoring judgment, an active offstage character whose offstage activity bears on the page should carry the reduced packet, and non-causal offstage characters may still be omitted as background-only without asking prose to infer persona from an id.

## Verification Result

1. `grep -n "offstage_causal\|Offstage causal relevance" .claude/skills/_shared-templates/story-state-contract.md` — passed; returned the enum value, reduced-packet `Required because: offstage_causal`, `Offstage causal relevance:`, and the emit/omit boundary.
2. `grep -n "Required because:" .claude/skills/_shared-templates/story-state-contract.md` — passed; the present-packet enum line includes `offstage_causal`, and the reduced packet has its own `Required because: offstage_causal` line.
3. Manual review — passed; the present packet still carries `profile_hash=<hash>; voice_block_hash=<hash>; page_packet_hash=<hash>`, and no new schema field such as `packet_scope` was introduced.

## Deviations

None. The change stayed within the single shared contract file. Validator enforcement remains owned by `tickets/SPEC63OFFCAUPAC-003.md`, and authoring-skill emission guidance remains owned by `tickets/SPEC63OFFCAUPAC-002.md`.
