# SPEC79CHCREM-007: Health-audit skill — drop axis from `choice_set_collapse_observed` material-axes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `.claude/skills/branching-story-health-audit/SKILL.md` (Phase 2 step 8 `choice_set_collapse_observed` finding).
**Deps**: archive/tickets/SPEC79CHCREM-003.md

## Problem

At intake, the branching-story-health-audit skill's Phase 2 step 8 enumerated four material axes for the `choice_set_collapse_observed` finding, mirroring the pre-removal `rule_choice_set_noncollapse` validator: *"`target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure`."*. Once SPEC79CHCREM-003 reduced the validator's axes from 4 to 3, the audit's documented material axes had to mirror the validator's actual signature axes — otherwise the audit's replay-time findings would use a different discrimination basis than the page-commit-time validator, producing inconsistent findings across the two surfaces.

## Assumption Reassessment (2026-05-24)

1. At intake, `.claude/skills/branching-story-health-audit/SKILL.md:185` enumerated four material axes for the `choice_set_collapse_observed` finding. The iteration-2 claim in the original SPEC-79 draft that the audit "reads `SE.commitment.selected_slt_id` and `selection_source` but not `CHC.associated_commitment_block` directly" was refuted by the SPEC-79 reassessment (Issue I3); this line directly referenced the field as one of the four material axes.
2. Confirmed SPEC-79 §5.4 prescribes dropping the axis to match the validator's 3-axis signature, keeping all other behavior (rhetorical-mark handling, `choice_set_collapse_observed` / `choice_set_rhetorical_unmarked` codes, ERROR severity, `turn_repair` repair_kind) unchanged. No stale-binding audit is needed — there is no field to go stale post-removal.
3. Cross-skill boundary: the audit's `choice_set_collapse_observed` finding mirrors the page-commit-time `rule_choice_set_noncollapse` validator (handled in 003). The two surfaces use the same material-axes signature to ensure replay-time audit findings are consistent with page-commit-time validation. Q3=(a) in the SPEC-79 reassessment confirmed the explicit mirror update.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the dropped axis was load-bearing for choice-set-collapse detection only because the field was present in the schema; the audit's discrimination power tracks the validator's. Both surfaces now use the same 3-axis signature post-landing.
5. Removal blast radius (was template item 7): this ticket updated one line in one SKILL.md file. Operational consequence: the audit's `choice_set_collapse_observed` finding now uses the 3-axis signature for replay-time discrimination, matching the page-commit-time validator's discrimination.
6. Proof correction: Codex cannot invoke the Claude slash-command `/branching-story-health-audit` as an executable dry-run. The accepted proof for this prose-only skill update is codebase grep-proof plus manual contract review of Phase 2 step 8 against SPEC-79 §5.4 and archived validator ticket SPEC79CHCREM-003.

## Architecture Check

1. Mirror updates between the page-commit-time validator (003) and the replay-time audit (this ticket) are necessary to keep the two surfaces consistent. If the audit kept the 4-axis signature while the validator dropped to 3 axes, replay-time findings would flag pages as `choice_set_collapse_observed` that page-commit-time validation accepted (because the dropped axis still contributed to the audit's discrimination). The mirror update prevents this audit-vs-validator divergence.
2. No backwards-compatibility aliasing/shims introduced.

## Verification Layers

1. The audit's `choice_set_collapse_observed` finding documents 3 material axes matching the validator's signature → codebase grep-proof: `grep -n "choice_set_collapse_observed" .claude/skills/branching-story-health-audit/SKILL.md` shows the updated axis list; `grep -n "associated_commitment_block" .claude/skills/branching-story-health-audit/SKILL.md` returns zero matches.
2. The audit's other Phase 2 step 8 behavior (rhetorical-mark handling, `choice_set_collapse_observed` / `choice_set_rhetorical_unmarked` codes, ERROR severity, `turn_repair` repair_kind) is unchanged → manual review of the unchanged paragraph surroundings.
3. Replay-time audit wording stays consistent with the page-commit-time validator's findings -> manual contract review of Phase 2 step 8 against SPEC-79 §5.4 and archive/tickets/SPEC79CHCREM-003.md.

## Landed Changes

### 1. `.claude/skills/branching-story-health-audit/SKILL.md`

- Rewrote the material-axes enumeration in the Phase 2 step 8 `choice_set_collapse_observed` description:
  - **Old**: *"…with the same material axes as the page-commit validator: `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure`."*
  - **New**: *"…with the same material axes as the page-commit validator: `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`."*
- Kept the rest of the step unchanged: rhetorical-mark handling (the conditional clause about marking CHCs as rhetorical or expressive variants), the `choice_set_collapse_observed` and `choice_set_rhetorical_unmarked` code distinctions, ERROR severity assignment, `turn_repair` repair_kind, and the post-validator surface description.

## Files to Touch

- `.claude/skills/branching-story-health-audit/SKILL.md` (modify)

## Out of Scope

- Adding a stale-binding audit (structurally unnecessary post-removal — there is no field to go stale; spec §5.4 explicitly rules this out).
- Other Phase 2 audit steps (Phase 2a replay, Phase 2b branch isolation, Phase 2c debt health, etc.) — unchanged by this ticket.
- The rule_choice_set_noncollapse validator change (handled in 003).
- The turn-cycle Phase 9 validator-gate description (handled in 006).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -n "associated_commitment_block" .claude/skills/branching-story-health-audit/SKILL.md` returns zero matches.
2. Manual contract review confirms the Phase 2 step 8 paragraph reads as prescribed in SPEC-79 §5.4, with the 3-axis material-axes list and the unchanged rhetorical-mark handling.
3. Manual contract review confirms the `choice_set_collapse_observed` finding's documented discrimination matches the page-commit-time `rule_choice_set_noncollapse` validator's discrimination.

### Invariants

1. The audit's `choice_set_collapse_observed` discrimination matches the page-commit-time validator's discrimination — both surfaces use the same 3-axis material signature.
2. The audit's other Phase 2 step 8 behavior (codes, severity, repair_kind) is unchanged.

## Test Plan

### New/Modified Tests

`None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`

### Commands

1. `grep -n "associated_commitment_block" .claude/skills/branching-story-health-audit/SKILL.md`
2. Manual review: inspect `.claude/skills/branching-story-health-audit/SKILL.md` Phase 2 step 8 and confirm only the material-axes list changed.
3. `rg -n 'target_or_action_families.*grounded_in.records.*likely_state_pressure|choice_set_collapse_observed|choice_set_rhetorical_unmarked|turn_repair' .claude/skills/branching-story-health-audit/SKILL.md`

## Outcome

Completed: 2026-05-24

The branching-story-health-audit Phase 2 step 8 `choice_set_collapse_observed` prose now mirrors the post-removal 3-axis `rule_choice_set_noncollapse` validator signature: `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`. The surrounding rhetorical-mark handling, `choice_set_collapse_observed` / `choice_set_rhetorical_unmarked` codes, ERROR severity, and `turn_repair` repair kind remain unchanged.

## Verification Result

1. `grep -n "associated_commitment_block" .claude/skills/branching-story-health-audit/SKILL.md` returned no matches.
2. `rg -n 'target_or_action_families.*grounded_in.records.*likely_state_pressure|choice_set_collapse_observed|choice_set_rhetorical_unmarked|turn_repair' .claude/skills/branching-story-health-audit/SKILL.md` showed the updated 3-axis Phase 2 step 8 line and the unchanged code / repair-kind terms in the same paragraph.
3. Manual review of `.claude/skills/branching-story-health-audit/SKILL.md` lines 184-185 confirmed only the material-axes list changed; the rhetorical-mark handling, finding codes, severity, and repair kind remain unchanged.
4. Manual contract review against SPEC-79 §5.4 and archive/tickets/SPEC79CHCREM-003.md confirmed the health-audit replay-time discrimination now mirrors the page-commit-time validator's 3-axis signature.

## Deviations

The drafted health-audit dry-run was not executed because Codex cannot invoke the Claude slash-command `/branching-story-health-audit` as an executable runner. For this prose-only skill update, the accepted proof is grep/stale-anchor proof plus manual contract review against the spec and the completed validator ticket.
