# BSBOOT-016: CHC semantic-distance gate (2 axes plus structural difference)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/references/phase-8-choice-generation.md` only.
**Deps**: none

## Problem

At intake, `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (the §Required CHC diversification block) required:

- one main-thread engagement,
- one relationship engagement,
- one OBL engagement,
- one less-obvious path,
- one or two diversification slots,
- ≥3 distinct `choice_mode` values,
- ≥3 distinct `poetic_effect` values,
- ≥60% high-salience-OBL coverage when ≥2 such OBLs exist.

These are good *coverage* rules but two CHCs can still be **operational cosmetic variants**: "Question the guard" vs "Press the guard harder" can satisfy the rules with different `choice_mode` (e.g. `investigative` vs `aggressive_investigative`) and different `poetic_effect` (e.g. `obvious` vs `dilemma`) while sharing actor + target + operation + likely_effects + minimum_state_change. From the user's perspective these are the same choice with different framing.

This ticket adds a Phase 8 pair-distance rule requiring each pair of CHCs to differ on **structural** axes, not just on choice-modal labels.

## Assumption Reassessment (2026-05-06)

1. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — verified the live diversification rules are set-level coverage rules and do not yet prevent pairwise cosmetic CHC variants.
2. `.claude/skills/branching-story-bootstrap/templates/story-records.yaml` — verified CHC schema fields the new rule will reason over (`operation`, `actor`, `target`, `uses_fact`, `choice_contract.success_policy`, `choice_contract.minimum_state_change`, `choice_mode`, `poetic_effect`).
3. Cross-skill / cross-artifact boundary: this is a bootstrap-Phase-8 rule (which delegates to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) per the existing reference). The new rule is added in the bootstrap reference; the page-cycle reference is unchanged because the per-tick page-cycle has its own diversification discipline. Cross-skill alignment is a follow-up only if the page-cycle wants the same rule.
4. FOUNDATIONS / hard-gate principle: this strengthens Phase 8 halt-and-rederive discipline without changing the Phase 9 gate table or HARD-GATE approval flow. HARD-GATE per-gate-PASS-with-rationale discipline is preserved.
5. Schema-extension classification: no schema change. The rule operates over existing CHC fields.
6. Naming the axes: ChatGPT-Pro proposed {operation, actor, target, risk, minimum_state_change, obligation_engaged, relationship_vector, information_gain, location_vector, moral_cost}. Some of these (risk, information_gain, moral_cost, location_vector, relationship_vector) are not direct CHC fields; they're emergent properties. To keep the rule programmatically checkable from the in-memory CHC records, the operative axes are: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change` (compared by sub-type set), `choice_contract.success_policy`, `choice_mode`, `poetic_effect`. Reassessment correction: `choice_mode` and `poetic_effect` remain useful axes, but a pair that differs only on those labels is still cosmetic. The landed rule must require at least two axis differences and at least one difference on a structural field among axes 1-6.

## Architecture Check

1. **Why cleaner**: a structural pair-distance rule catches the "same-actor-same-target-same-operation-different-label" cosmetic case. The rule is mechanical (read CHC fields, compute pairwise distance) — no LLM call, no operator judgment.
2. **Alternative considered**: requiring ≥4 distinct `operation` values across the set. Rejected: too coarse. Two CHCs with the same operation but different actors and different minimum_state_change are legitimately distinct (e.g., "the protagonist confronts X" vs "the ally confronts X" — same operation, different agency).
3. No backwards-compatibility shim. The new rule fires for every CHC set; existing committed bundles are not retroactively validated.

## Verification Layers

1. The new pair-distance rule appears in `references/phase-8-choice-generation.md` → codebase grep-proof.
2. The eight axes are enumerated → codebase grep-proof.
3. The rule is mechanical — no operator judgment is required to compute the distance → manual review.
4. Phase 9 gate wording is unchanged; the new rule operates at the CHC level and is enforced at Phase 8 halt-time.

## Landed Changes

### 1. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- Added a new §Pair-distance discipline subsection after the existing §Required CHC diversification list.
- Enumerated the 8 checkable CHC axes: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change` set, `choice_contract.success_policy`, `choice_mode`, and `poetic_effect`.
- Defined the mechanical check: compute pairwise axis differences from in-memory CHC records and reject pairs with fewer than 2 total differences or no structural-axis difference from axes 1-6.
- Added a worked counterexample where two choices differ only on `choice_mode` and `poetic_effect`; the example fails Phase 8 and routes to halt-and-rederive.
- The landed rule is Phase 8 halt-time guidance. It does not edit Phase 9 gate wording.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Editing `branching-story-page-cycle` Phase 8. The runtime page-cycle's diversification discipline is its own concern and is now tracked by `tickets/BSPAG-006-runtime-chc-pair-distance-parity.md`.
- Code-level validator. The pair-distance computation is mechanical but does not require code; operator-discipline at Phase 8 is sufficient. BSBOOT-015 completed Phase 9.5 as a 10-check bootstrap-discipline validator and did not absorb this pair-distance rule; a future code-level enforcement ticket would need to own that separately.
- Adjusting Phase 9 gate 9. Gate 9 governs storylet shape diversity; CHC operational diversity is a Phase 8 internal concern that, when violated, surfaces at Phase 8's halt-and-re-derive point — not at Phase 9.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Pair-distance|at least 2.*axes|minimum_state_change.*set|structural axes 1-6" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` returns matches.
2. The eight axes are explicitly enumerated.
3. The worked counterexample appears.

### Invariants

1. Every pair of CHCs in the emitted 4-6 set differs on at least 2 of the 8 axes, with at least 1 difference from structural axes 1-6.
2. The pair-distance rule is enforced at Phase 8 halt-time, not at Phase 9 gate-time.
3. The rule is mechanical (read fields, compute pairwise distance) — no LLM judgment.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "Pair-distance discipline" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — confirms the section exists.
2. (Manual) construct two synthetic CHC sets — one passing (each pair differs on at least 3 axes), one failing (one pair differs only on `choice_mode` and `poetic_effect`) — and verify the failing pair would be flagged by the rule.

## Outcome

Completed on 2026-05-06. Implemented the bootstrap Phase 8 CHC pair-distance discipline in `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`. The rule enumerates the 8 checkable CHC axes, requires at least 2 total axis differences per pair, and requires at least 1 structural-axis difference from axes 1-6 so `choice_mode`/`poetic_effect` relabeling alone cannot pass.

## Verification Result

1. `grep -nE 'Pair-distance|at least 2.*axes|minimum_state_change.*set|structural axes 1-6' .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — PASS; returned the section heading, pair-distance requirement, and `minimum_state_change` axis.
2. Manual review of the landed §Pair-distance discipline — PASS; the 8 axes are explicitly enumerated and the worked counterexample fails because both differences are label axes with no structural-axis difference.
3. Manual HARD-GATE alignment review against `docs/HARD-GATE-DISCIPLINE.md` and `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` — PASS; the edit preserves Phase 9 gate wording and approval flow, and routes failure to Phase 8 halt-and-rederive.

## Deviations

1. Reassessment corrected the drafted rule: the original 8-axis rule would have allowed two CHCs to pass by differing only on `choice_mode` and `poetic_effect`, which contradicted the ticket's problem statement. The landed rule adds the structural-axis requirement.
2. No code-level validator was added; enforcement remains prose/operator discipline at bootstrap Phase 8 as scoped.
3. Post-ticket review created `tickets/BSPAG-006-runtime-chc-pair-distance-parity.md` for the runtime page-cycle parity concern; BSBOOT-016 remains limited to bootstrap Phase 8.
4. Downstream-consumer reflection created `tickets/BSAUD-002-audit-chc-pair-distance-discipline.md` for read-only health-audit detection of persisted CHC pair-distance defects. `storylet-pool-authoring` and `story-fact-promotion-to-canon` were reviewed and left without follow-up because they do not emit or validate persisted CHC choice sets.
