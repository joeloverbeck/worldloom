# SPEC79CHCREM-003: Reduce `rule_choice_set_noncollapse` material axes from 4 to 3

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/rules/rule_choice_set_noncollapse.ts` (rule validator); `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` (rule test fixture).
**Deps**: archive/tickets/SPEC79CHCREM-001.md

## Problem

Before this ticket, the `rule_choice_set_noncollapse` validator built a per-choice signature from FOUR material axes — `target_or_action_families`, `grounded_in.records`, `associated_commitment_block`, and `likely_state_pressure` — and flagged page-emitted choice sets whose members all shared an identical signature. Once SPEC79CHCREM-001 dropped `associated_commitment_block` from the schema, the rule's `materialSignature()` function could no longer read the field; this ticket removed that axis. The remaining 3 axes (`target_or_action_families`, `grounded_in.records`, `likely_state_pressure`) are sufficient to distinguish meaningfully different choices — `grounded_in.records` carries the storylet-grounding intent the dropped axis formerly hinted at.

## Assumption Reassessment (2026-05-24)

1. At intake, `tools/validators/src/rules/rule_choice_set_noncollapse.ts` defined `materialSignature()` with `associated_commitment_block` as one of four axes, and the collapse verdict message named the four-axis list.
2. Confirmed SPEC-79 §4.3 prescribes the 4→3 axis reduction with no other behavior change. The rhetorical-mark detection (`isRhetoricallyMarked`), `choice_set_collapse_observed` vs `choice_set_rhetorical_unmarked` verdict codes, and severity assignment are unchanged.
3. Cross-skill boundary: this rule validator is consumed by the validator framework and surfaced via `world-validate` CLI. The 4→3 axis reduction also requires mirror updates in the turn-cycle reference files (`phase-8-choice-generation.md:19` and `phase-9-validation-gates.md:28`) and in the health-audit SKILL.md (line 185) — handled in tickets 006 and 007 respectively, both with explicit Deps on this ticket.
4. FOUNDATIONS §Story Bundles §5b (Schema-Minimalism): the dropped axis was load-bearing for choice-set-collapse detection only because the field was present in the schema; once removed, the remaining 3 axes preserve the rule's discrimination power for any well-formed bundle. `grounded_in.records` is required on every CHC per `story-choice.schema.json` (after 001 lands) and carries the storylet-grounding intent the dropped axis formerly hinted at.
5. HARD-GATE / rule-validator surface: this ticket modifies a rule validator under `tools/validators/src/rules/` — the pre-apply gate that blocks invalid patch plans. The change does NOT weaken the Mystery Reserve firewall; the rule's discrimination power is reduced from 4 axes to 3 but the remaining axes preserve the structural integrity of the check.
6. Removal blast radius (was template item 7): the axis is removed from this validator's source (this ticket) and from its regression test (this ticket). Sibling tickets 006 (turn-cycle) and 007 (audit) mirror the axis-list change in their respective skill-side documentation; both have explicit Deps on this ticket to keep the discrimination-power story coherent across surfaces.
7. Implementation-time proof correction: the drafted `npm test -- --test-name-pattern='rule_choice_set_noncollapse'` wrapper does not narrow to the rule test in this package; it rebuilds and runs the full validators suite. The accepted focused proof is therefore `npm run build` followed by `node --test dist/tests/rules/rule_choice_set_noncollapse.test.js`. The broad wrapper remains red on sibling-owned stale CHC fixture keys assigned to SPEC79CHCREM-010.

## Architecture Check

1. Dropping the axis preserves the rule's structural shape (4-axis stableStringify → 3-axis stableStringify) while reducing per-call work proportionally. The verdict message update is mechanical (drop one axis name from the enumeration). No new abstraction is introduced.
2. No backwards-compatibility aliasing/shims introduced. The `materialSignature()` function returns a strictly smaller object after this ticket lands; old signatures with the 4-axis shape no longer occur because the field is gone from the schema.

## Verification Layers

1. The rule's `materialSignature()` function returns a 3-axis signature → codebase grep-proof: `grep -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns zero matches.
2. The verdict message enumerates the 3 remaining axes → codebase grep-proof: `grep -n "no material difference across" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns the corrected message naming `target_or_action_families`, `grounded_in.records`, `likely_state_pressure`.
3. The rule's regression test fixture exercises the 3-axis signature correctly → targeted tool command: `cd tools/validators && node --test dist/tests/rules/rule_choice_set_noncollapse.test.js` passes after `npm run build`.
4. The rule's other behavior (rhetorical-mark detection, verdict codes, severity) is unchanged → manual review of the source diff plus regression-test coverage of the unchanged paths.

## Landed Changes

### 1. `tools/validators/src/rules/rule_choice_set_noncollapse.ts`

- Dropped the `associated_commitment_block` key from the `materialSignature()` return object. The signature is now a 3-axis `stableStringify` over `target_or_action_families`, `grounded_in_records`, and `likely_state_pressure`.
- Updated the collapse verdict message to enumerate the 3 remaining axes: `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`.

### 2. `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts`

- Dropped the `associated_commitment_block: "SLT-1"` key from the shared CHC test fixture.
- Renamed the collapse regression title from "four material axes" to "three material axes"; the existing fixture construction already exercises collapse and non-collapse behavior on the 3 surviving axes.

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

1. `cd tools/validators && npm run build` passes, refreshing compiled `dist/`.
2. `cd tools/validators && node --test dist/tests/rules/rule_choice_set_noncollapse.test.js` passes with the rewritten fixture; the rule still triggers `choice_set_collapse` when the 3 surviving axes are identical across the emitted choice set.
3. `grep -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts` returns zero matches.
4. The broad validators wrapper is run and classified; it remains red only on sibling-owned SPEC-79 stale fixture keys, not on this rule seam.

### Invariants

1. The rule's discrimination power is reduced from 4 axes to 3, but the remaining 3 axes (`target_or_action_families`, `grounded_in.records`, `likely_state_pressure`) are sufficient to distinguish meaningfully different choices in well-formed bundles per spec §4.3 acceptance.
2. The rule's other behavior (rhetorical-mark detection, `choice_set_collapse_observed` vs `choice_set_rhetorical_unmarked` codes, severity assignment) is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` — fixture updated to drop the field; choice-set construction adjusted to differ-or-collapse on the 3 surviving axes.

### Commands

1. `cd tools/validators && npm run build`
2. `cd tools/validators && node --test dist/tests/rules/rule_choice_set_noncollapse.test.js`
3. `rg -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` returns zero matches.
4. `cd tools/validators && npm test -- --test-name-pattern='rule_choice_set_noncollapse'` is a broad wrapper in this package; it is expected to remain red until SPEC79CHCREM-010 repairs the remaining stale fixtures.

## Outcome

Completed: 2026-05-24

The `choice_set_noncollapse` rule now computes CHC material signatures from 3 axes only: `target_or_action_families`, `grounded_in.records`, and `likely_state_pressure`. The collapse verdict message names the same 3 axes. The rule regression fixture no longer emits `associated_commitment_block`, and the collapse test title now reflects the 3-axis contract.

## Verification Result

1. `cd tools/validators && npm run build` passed.
2. `cd tools/validators && node --test dist/tests/rules/rule_choice_set_noncollapse.test.js` passed: 7 tests, 0 failures.
3. `rg -n "associated_commitment_block" tools/validators/src/rules/rule_choice_set_noncollapse.ts tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` returned no matches.
4. `rg -n "three material axes|no material difference across" tools/validators/src/rules/rule_choice_set_noncollapse.ts tools/validators/tests/rules/rule_choice_set_noncollapse.test.ts` showed the corrected test title and 3-axis verdict message.
5. `cd tools/validators && npm test -- --test-name-pattern='rule_choice_set_noncollapse'` rebuilt and ran the full validators suite rather than narrowing to the rule test; it exited 1 with 1010 passing tests and 2 failing tests. The failures are the known sibling-owned SPEC-79 stale-fixture fallout from remaining CHCs carrying `associated_commitment_block`.

## Deviations

The drafted wrapper proof `npm test -- --test-name-pattern='rule_choice_set_noncollapse'` is not a focused rule-test proof in this package; it runs the full validators suite. The focused accepted proof is the direct compiled rule test after `npm run build`.

The broad validators suite still fails on stale CHC fixture keys outside this ticket's owner boundary. Current discovery shows the remaining hits in `tools/validators/tests/integration/spec34-integration.test.ts`, `tools/validators/tests/integration/spec49-stplan-stemo-hardening.test.ts`, `tools/validators/tests/structural/stchar-structural-validators.test.ts`, and `tools/validators/tests/rules/rule_chc_grounded_in_artifact_accessible.test.ts`; SPEC79CHCREM-010 owns those fixture-key drops.
