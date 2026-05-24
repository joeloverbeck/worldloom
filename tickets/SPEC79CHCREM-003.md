# SPEC79CHCREM-003: Reduce `rule_choice_set_noncollapse` material axes from 4 to 3

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_choice_set_noncollapse.ts` (rule validator); `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` (rule test fixture).
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

The `rule_choice_set_noncollapse` validator builds a per-choice signature from FOUR material axes — `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure` — and flags page-emitted choice sets whose members all share an identical signature. Once SPEC79CHCREM-001 drops `associated_commitment_block` from the schema, the rule's `materialSignature()` function cannot read the field; the axis must be removed. The remaining 3 axes (`target_or_action_families`, `grounded_in.records`, `likely_state_pressure`) are sufficient to distinguish meaningfully different choices — `grounded_in.records` carries the storylet-grounding intent the dropped axis formerly hinted at.

## Assumption Reassessment (2026-05-24)

1. Confirmed `tools/validators/src/rules/rule_choice_set_noncollapse.ts:115-129` defines `materialSignature()` that reads `associated_commitment_block` at lines 120-123 as one of four axes. Line 203 builds the verdict message naming the four axes in its error string.
2. Confirmed SPEC-79 §4.3 prescribes the 4→3 axis reduction with no other behavior change. The rhetorical-mark detection (`isRhetoricallyMarked`), `choice_set_collapse_observed` vs `choice_set_rhetorical_unmarked` verdict codes, and severity assignment are unchanged.
3. Cross-skill boundary: this rule validator is consumed by the validator framework and surfaced via `world-validate` CLI. The 4→3 axis reduction also requires mirror updates in the turn-cycle reference files (`phase-8-choice-generation.md:19` and `phase-9-validation-gates.md:28`) and in the health-audit SKILL.md (line 185) — handled in tickets 006 and 007 respectively, both with explicit Deps on this ticket.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the dropped axis was load-bearing for choice-set-collapse detection only because the field was present in the schema; once removed, the remaining 3 axes preserve the rule's discrimination power for any well-formed bundle. `grounded_in.records` is required on every CHC per `story-choice.schema.json` (after 001 lands) and carries the storylet-grounding intent the dropped axis formerly hinted at.
5. HARD-GATE / rule-validator surface: this ticket modifies a rule validator under `tools/validators/src/rules/` — the pre-apply gate that blocks invalid patch plans. The change does NOT weaken the Mystery Reserve firewall; the rule's discrimination power is reduced from 4 axes to 3 but the remaining axes preserve the structural integrity of the check.
6. Removal blast radius (was template item 7): the axis is removed from this validator's source (this ticket) and from its regression test (this ticket). Sibling tickets 006 (turn-cycle) and 007 (audit) mirror the axis-list change in their respective skill-side documentation; both have explicit Deps on this ticket to keep the discrimination-power story coherent across surfaces.

## Architecture Check

1. Dropping the axis preserves the rule's structural shape (4-axis stableStringify → 3-axis stableStringify) while reducing per-call work proportionally. The verdict message update is mechanical (drop one axis name from the enumeration). No new abstraction is introduced.
2. No backwards-compatibility aliasing/shims introduced. The `materialSignature()` function returns a strictly smaller object after this ticket lands; old signatures with the 4-axis shape no longer occur because the field is gone from the schema.

## Verification Layers

1. The rule's `materialSignature()` function returns a 3-axis signature → codebase grep-proof: `grep -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns zero matches.
2. The verdict message at line 203 enumerates the 3 remaining axes → codebase grep-proof: `grep -n "no material difference across" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns the corrected message naming `target_or_action_families`, `grounded_in.records`, `likely_state_pressure`.
3. The rule's regression test fixture exercises the 3-axis signature correctly → schema validation: `cd tools/validators && npm test -- --test-name-pattern='rule_choice_set_noncollapse'` passes.
4. The rule's other behavior (rhetorical-mark detection, verdict codes, severity) is unchanged → manual review of the source diff plus regression-test coverage of the unchanged paths.

## What to Change

### 1. `tools/validators/src/rules/rule_choice_set_noncollapse.ts`

- Drop the `associated_commitment_block` key from the `materialSignature()` return object (lines 120-123). The signature becomes a 3-axis `stableStringify` over `target_or_action_families`, `grounded_in_records`, and `likely_state_pressure`.
- Update the verdict message at line 203 to enumerate the 3 remaining axes: replace *"…with no material difference across `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, or `likely_state_pressure`."* with *"…with no material difference across `target_or_action_families`, `grounded_in.records`, or `likely_state_pressure`."*

### 2. `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts`

- Drop the `associated_commitment_block: "SLT-1"` key from the test fixture at line 176.
- If the test's choice-set construction depended on the dropped axis to differ-or-collapse choices, rewrite the fixture so the choices differ-or-collapse on the 3 surviving axes. The collapse-detection test must still trigger `choice_set_collapse` when all three remaining axes are identical and must still pass when any one of them differs.

## Files to Touch

- `tools/validators/src/rules/rule_choice_set_noncollapse.ts` (modify)
- `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` (modify)

## Out of Scope

- The schema change itself (handled in 001).
- The chc_slt_selected_commitment_trace validator rewrite (handled in 002).
- Skill-side mirror updates (handled in 006 turn-cycle and 007 audit, both with explicit Deps on this ticket).
- Other test fixtures that drop the field as a fixture-key cleanup (handled in 010).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm test -- --test-name-pattern='rule_choice_set_noncollapse'` passes with the rewritten fixture; the rule still triggers `choice_set_collapse` when the 3 surviving axes are identical across the emitted choice set.
2. `cd tools/validators && npm test` runs to completion with zero new failures across all rule validators.
3. `grep -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns zero matches.

### Invariants

1. The rule's discrimination power is reduced from 4 axes to 3, but the remaining 3 axes (`target_or_action_families`, `grounded_in.records`, `likely_state_pressure`) are sufficient to distinguish meaningfully different choices in well-formed bundles per spec §4.3 acceptance.
2. The rule's other behavior (rhetorical-mark detection, `choice_set_collapse_observed` vs `choice_set_rhetorical_unmarked` codes, severity assignment) is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` — fixture at line 176 updated to drop the field; choice-set construction adjusted to differ-or-collapse on the 3 surviving axes.

### Commands

1. `cd tools/validators && npm test -- --test-name-pattern='rule_choice_set_noncollapse'`
2. `cd tools/validators && npm test`
3. `grep -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns zero matches.
