# BSBOOT-016: CHC semantic-distance gate (each pair differs on ≥2 axes)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — `branching-story-bootstrap/references/phase-8-choice-generation.md` only.
**Deps**: none

## Problem

`references/phase-8-choice-generation.md:22-32` (the §Required CHC diversification block) currently requires:

- one main-thread engagement,
- one relationship engagement,
- one OBL engagement,
- one less-obvious path,
- one or two diversification slots,
- ≥3 distinct `choice_mode` values,
- ≥3 distinct `poetic_effect` values,
- ≥60% high-salience-OBL coverage when ≥2 such OBLs exist.

These are good *coverage* rules but two CHCs can still be **operational cosmetic variants**: "Question the guard" vs "Press the guard harder" can satisfy the rules with different `choice_mode` (e.g. `investigative` vs `aggressive_investigative`) and different `poetic_effect` (e.g. `obvious` vs `dilemma`) while sharing actor + target + operation + likely_effects + minimum_state_change. From the user's perspective these are the same choice with different framing.

The diversification rule should require each pair of CHCs to differ on **structural** axes, not just on choice-modal labels.

## Assumption Reassessment (2026-05-06)

1. `references/phase-8-choice-generation.md:22-32` — verified diversification rules.
2. `templates/story-records.yaml:359-385` — verified CHC schema fields the new rule will reason over (`operation`, `actor`, `target`, `choice_contract.minimum_state_change`).
3. Cross-skill / cross-artifact boundary: this is a bootstrap-Phase-8 rule (which delegates to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline) per the existing reference). The new rule is added in the bootstrap reference; the page-cycle reference is unchanged because the per-tick page-cycle has its own diversification discipline. Cross-skill alignment is a follow-up only if the page-cycle wants the same rule.
4. FOUNDATIONS / hard-gate principle: this strengthens Phase 9 gate 9 (storylet diversity) operationally — diverse storylets producing cosmetically-similar CHCs would no longer pass. HARD-GATE per-gate-PASS-with-rationale discipline preserved.
5. Schema-extension classification: no schema change. The rule operates over existing CHC fields.
6. Naming the axes: ChatGPT-Pro proposed {operation, actor, target, risk, minimum_state_change, obligation_engaged, relationship_vector, information_gain, location_vector, moral_cost}. Some of these (risk, information_gain, moral_cost, location_vector, relationship_vector) are not direct CHC fields; they're emergent properties. To keep the rule programmatically checkable from the in-memory CHC records, the operative axes are: `operation`, `actor`, `target`, `uses_fact`, `choice_contract.minimum_state_change` (which sub-types differ), `choice_contract.success_policy`, `choice_mode`, `poetic_effect`. Pairs differing on ≥2 of these 8 axes are operationally distinct.

## Architecture Check

1. **Why cleaner**: a structural pair-distance rule catches the "same-actor-same-target-same-operation-different-label" cosmetic case. The rule is mechanical (read CHC fields, compute pairwise distance) — no LLM call, no operator judgment.
2. **Alternative considered**: requiring ≥4 distinct `operation` values across the set. Rejected: too coarse. Two CHCs with the same operation but different actors and different minimum_state_change are legitimately distinct (e.g., "the protagonist confronts X" vs "the ally confronts X" — same operation, different agency).
3. No backwards-compatibility shim. The new rule fires for every CHC set; existing committed bundles are not retroactively validated.

## Verification Layers

1. The new pair-distance rule appears in `references/phase-8-choice-generation.md` → codebase grep-proof.
2. The eight axes are enumerated → codebase grep-proof.
3. The rule is mechanical — no operator judgment is required to compute the distance → manual review.
4. Phase 9 gate 9 (storylet diversity) wording is unchanged; the new rule operates at the CHC level and is enforced inside the same gate's authority surface (the gate authoritatively requires storylet shape diversity AND, by extension via this rule, CHC operational diversity).

## What to Change

### 1. `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md`

- After the existing §Required CHC diversification list (lines 22-32), add a new sub-section:

  ```
  ## Pair-distance discipline

  In addition to the diversification list above, **every pair of emitted CHCs must differ on at least 2 of the following 8 axes**:

  1. `operation` (the canonical verb from Phase 8 affordance vocabulary)
  2. `actor` (the STENT performing the action)
  3. `target` (the STENT / STOBJ / STLOC / abstract being acted upon)
  4. `uses_fact` (the SF the choice leverages, if any)
  5. `choice_contract.minimum_state_change` set (compared by the contained `{fact, obligation, consequence, relationship, intention, thread, location, cast, terminality}` sub-types — two CHCs that both change `fact` and `obligation` are equivalent on this axis; different sub-types are distinct)
  6. `choice_contract.success_policy` (`guaranteed | attempted | uncertain | opposed`)
  7. `choice_mode` (the modal label)
  8. `poetic_effect` (the affective register)

  Two CHCs that share 7 of these 8 axes (differing only in `poetic_effect`, for example) are operational cosmetic variants — fail Phase 8, halt and re-derive the more cosmetically-similar of the pair.

  ### Why pair-distance and not set-diversification

  The diversification list above ensures the SET covers thread / relationship / OBL / less-obvious / mode / poetic axes. The pair-distance rule ensures no two members of the set are cosmetic variants of each other — the set's coverage is real, not lip-service.

  ### Worked counterexample

  "Question the guard about the magistrate's whereabouts" vs "Press the guard about who he saw last night":

  - operation: `investigate` / `investigate` (same)
  - actor: `STENT-0001` / `STENT-0001` (same)
  - target: `STENT-0007` / `STENT-0007` (same)
  - uses_fact: `null` / `null` (same)
  - minimum_state_change: `{fact}` / `{fact}` (same)
  - success_policy: `attempted` / `attempted` (same)
  - choice_mode: `investigative` / `pressure_management` (DIFFERENT)
  - poetic_effect: `obvious` / `dilemma` (DIFFERENT)

  Differs on 2 of 8 — passes minimum, but BARELY. This is exactly the "framing variants of the same operational choice" case ChatGPT-Pro flagged. Re-deriving one of the two with a different `actor` (e.g., the ally confronts the guard instead of the protagonist), `target` (different witness), or `minimum_state_change` (e.g., introduces a `relationship` change as well as a `fact` change) lifts the pair into clear operational distinction.
  ```

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` (modify)

## Out of Scope

- Editing `branching-story-page-cycle` Phase 8. The runtime page-cycle's diversification discipline is its own concern; if the rule should propagate, that's a separate ticket.
- Code-level validator. The pair-distance computation is mechanical but does not require code; operator-discipline at Phase 8 is sufficient. A future Phase 9.5 (BSBOOT-015) check could enforce it programmatically.
- Adjusting Phase 9 gate 9. Gate 9 governs storylet shape diversity; CHC operational diversity is a Phase 8 internal concern that, when violated, surfaces at Phase 8's halt-and-re-derive point — not at Phase 9.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE "Pair-distance|≥2 axes|minimum_state_change set" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` returns matches.
2. The eight axes are explicitly enumerated.
3. The worked counterexample appears.

### Invariants

1. Every pair of CHCs in the emitted 4-6 set differs on ≥2 of the 8 axes.
2. The pair-distance rule is enforced at Phase 8 halt-time, not at Phase 9 gate-time.
3. The rule is mechanical (read fields, compute pairwise distance) — no LLM judgment.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -nE "Pair-distance discipline" .claude/skills/branching-story-bootstrap/references/phase-8-choice-generation.md` — confirms the section exists.
2. (Manual) construct two synthetic CHC sets — one passing (each pair differs on ≥3 axes), one failing (one pair differs on only 1 axis) — and verify the failing pair would be flagged by the rule.
