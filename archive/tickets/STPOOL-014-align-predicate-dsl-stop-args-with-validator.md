# STPOOL-014: Align predicate-DSL stop args with validator grammar

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — storylet-pool-authoring prompt grammar/reference truthing only.
**Deps**: archive/tickets/STPOOL-013-retire-resolved-bootstrap-template-divergence-note.md

## Problem

At intake, STPOOL-013 reassessment found that `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` still documented several stop-predicate `args` shapes that disagreed with the live validator grammar in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and the bootstrap landmine table in `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`.

The resolved STPOOL-002/STPOOL-004 example rows were aligned, but the broader prompt grammar still contained drift such as `new_obligation_created` using `salience_min`, `open_thread_reprioritized` using `thread`, `time_or_location_changes` using `axis`, and several interrupt predicates using prompt-only arg names instead of the validator-required keys.

## Assumption Reassessment (2026-05-12)

1. Verified `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` defines `STOP_PREDICATE_ARG_SCHEMAS` as the live enforcement surface for stop-policy args.
2. Verified `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` mirrors the live validator-required stop args in its SLT schema landmines table.
3. Cross-artifact boundary under audit: `storylet-pool-authoring/templates/predicate-dsl.md` is the LLM prompt grammar consumed before `storylet_predicate_dsl_parsability` / `stop_policy_parsability`; it should not teach an args shape that the validator rejects.
4. FOUNDATIONS Rule 1 alignment: storylet stop policies must be structurally grounded and parser-valid before engine-routed story-bundle writes.
5. HARD-GATE / validation-signal surface: this edits a content-generating skill grammar reference. The edit must not relax the HARD-GATE, approval-token discipline, patch-engine routing, or Mystery Reserve firewall; it should only align prompt grammar with the existing fail-closed validator.
6. Adjacent contradiction classification: STPOOL-013 owns only retiring resolved bootstrap divergence prose; this broader predicate-DSL args alignment is separate same-family follow-up work.
7. Reassessment correction: the drafted negative grep included bare `salience_min`, but `salience_min` remains legitimate outside the stop-predicate tier for `consequence_pending` and obligation matchers. The proof must target the stale stop-args rows and old stop-only arg names, not every non-stop occurrence of `salience_min`.

## Architecture Check

1. Keep the validator as the enforcement authority and make the prompt grammar match it, rather than preserving parallel arg aliases.
2. No backwards-compatibility aliases or shims introduced.

## Verification Layers

1. **Prompt grammar agreement** -> manual comparison of every stop-predicate args row in `templates/predicate-dsl.md` against `STOP_PREDICATE_ARG_SCHEMAS`.
2. **Cross-skill alignment** -> grep/manual comparison that bootstrap's SLT landmine table and predicate-dsl use the same required arg names.
3. **FOUNDATIONS / HARD-GATE discipline** -> manual review that the rewrite only tightens prompt guidance to the existing validator and does not alter approval or write routing.

## What to Change

### 1. Aligned predicate-dsl stop args

Updated `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` so every normal-exit and interrupt-before predicate documents the same validator-required args as `STOP_PREDICATE_ARG_SCHEMAS` and the bootstrap Phase 6 SLT landmine table, including the no-required-args `consent_boundary_imminent` and `violence_or_harm_imminent` rows.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Changing validator code or adding new stop predicates.
- Editing bootstrap Phase 6 landmine prose beyond any necessary comparison-note fallout from the predicate-dsl alignment.
- Resolving STPOOL-011's Phase 7.6 lifecycle wording unless that ticket is deliberately absorbed during reassessment.

## Acceptance Criteria

### Tests That Must Pass

1. Manual comparison confirms every `templates/predicate-dsl.md` stop-predicate args row matches `STOP_PREDICATE_ARG_SCHEMAS`.
2. `grep -nE 'args: \\{salience_min|thread: THR|axis: time|violation_kind|envelope_item|args: \\{axis: <strong_axis|by_actor:|new_commitment_class|args: \\{from:|target: STENT' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns no stale stop-args rows after implementation.
3. Manual review confirms no HARD-GATE, approval, patch-engine, or Mystery Reserve firewall behavior changed.

### Invariants

1. The prompt grammar teaches only validator-accepted stop-policy args.
2. Existing predicate names and section membership remain unchanged.

## Test Plan

### New/Modified Tests

1. None — prompt grammar/reference truthing only.

### Commands

1. `grep -nE 'commitment_overturned|scene_goal_changes|new_obligation_created|open_thread_reprioritized|time_or_location_changes|violence_or_harm_imminent|protagonist_goal_change_required|selected_commitment_would_be_violated|user_write_in_conflicts_with_envelope|only_next_action_would_create_major_state_change|commitment_class|goal|obligation_type|thread_id|change_kind|envelope_field|state_axis|no required args' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`
2. Manual comparison against `STOP_PREDICATE_ARG_SCHEMAS`.

## Outcome

Completed on 2026-05-12 after post-ticket review reopened the same-seam `violence_or_harm_imminent` blocker. The storylet-pool-authoring predicate DSL now documents validator-required stop-policy args for every normal-exit and interrupt-before predicate, including the validator/bootstrap no-required-args contract for `violence_or_harm_imminent`. The edit did not change validator code, approval flow, patch-engine routing, or world content.

## Verification Result

1. `grep -nE 'args: \\{salience_min|thread: THR|axis: time|violation_kind|envelope_item|args: \\{axis: <strong_axis|by_actor:|new_commitment_class|args: \\{from:|target: STENT' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returned no matches, as expected for stale stop-args rows.
2. `grep -nE 'commitment_overturned|scene_goal_changes|new_obligation_created|open_thread_reprioritized|time_or_location_changes|violence_or_harm_imminent|protagonist_goal_change_required|selected_commitment_would_be_violated|user_write_in_conflicts_with_envelope|only_next_action_would_create_major_state_change|commitment_class|goal|obligation_type|thread_id|change_kind|envelope_field|state_axis|no required args' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` passed by inspection: the predicate DSL, validator required-args map, and bootstrap landmine table now agree on the stop-tier required arg names and no-required-args rows.
3. Manual FOUNDATIONS / HARD-GATE review completed against `docs/FOUNDATIONS.md` Rule 1 / Rule 7 and `docs/HARD-GATE-DISCIPLINE.md`: this was prompt-grammar truthing only and did not relax approval, patch-engine submission, validator failure behavior, or Mystery Reserve firewall discipline.

## Deviations

1. Reassessment corrected the drafted negative grep. Bare `salience_min` remains legitimate in non-stop predicate and obligation-matcher documentation, so the implemented proof targets stale stop-arg rows (`args: {salience_min...}`) and old stop-only arg names instead of banning `salience_min` globally.

## Post-Ticket Review (2026-05-12)

Post-review blocker resolved in the same active ticket before archival. Review found one same-seam predicate row still contradicting the ticket's own "every stop-predicate args row matches `STOP_PREDICATE_ARG_SCHEMAS`" acceptance criterion:

- `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` defines `violence_or_harm_imminent: { required: [] }`.
- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` lists `violence_or_harm_imminent` with no required args.
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` still documents `violence_or_harm_imminent` as `args: {target: STENT-NNNN | role:<role>}`.

Resolution: `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` now documents `violence_or_harm_imminent` as `args: {}` and the stale `target: STENT` row is gone.
