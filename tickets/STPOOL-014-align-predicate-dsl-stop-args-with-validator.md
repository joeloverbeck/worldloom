# STPOOL-014: Align predicate-DSL stop args with validator grammar

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — storylet-pool-authoring prompt grammar/reference truthing only.
**Deps**: archive/tickets/STPOOL-013-retire-resolved-bootstrap-template-divergence-note.md

## Problem

STPOOL-013 reassessment found that `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` still documents several stop-predicate `args` shapes that disagree with the live validator grammar in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and the bootstrap landmine table in `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`.

The resolved STPOOL-002/STPOOL-004 example rows are aligned, but the broader prompt grammar still contains drift such as `new_obligation_created` using `salience_min`, `open_thread_reprioritized` using `thread`, `time_or_location_changes` using `axis`, and several interrupt predicates using prompt-only arg names instead of the validator-required keys.

## Assumption Reassessment (2026-05-12)

1. Verified `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` defines `STOP_PREDICATE_ARG_SCHEMAS` as the live enforcement surface for stop-policy args.
2. Verified `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` mirrors the live validator-required stop args in its SLT schema landmines table.
3. Cross-artifact boundary under audit: `storylet-pool-authoring/templates/predicate-dsl.md` is the LLM prompt grammar consumed before `storylet_predicate_dsl_parsability` / `stop_policy_parsability`; it should not teach an args shape that the validator rejects.
4. FOUNDATIONS Rule 1 alignment: storylet stop policies must be structurally grounded and parser-valid before engine-routed story-bundle writes.
5. HARD-GATE / validation-signal surface: this edits a content-generating skill grammar reference. The edit must not relax the HARD-GATE, approval-token discipline, patch-engine routing, or Mystery Reserve firewall; it should only align prompt grammar with the existing fail-closed validator.
6. Adjacent contradiction classification: STPOOL-013 owns only retiring resolved bootstrap divergence prose; this broader predicate-DSL args alignment is separate same-family follow-up work.

## Architecture Check

1. Keep the validator as the enforcement authority and make the prompt grammar match it, rather than preserving parallel arg aliases.
2. No backwards-compatibility aliases or shims introduced.

## Verification Layers

1. **Prompt grammar agreement** -> manual comparison of every stop-predicate args row in `templates/predicate-dsl.md` against `STOP_PREDICATE_ARG_SCHEMAS`.
2. **Cross-skill alignment** -> grep/manual comparison that bootstrap's SLT landmine table and predicate-dsl use the same required arg names.
3. **FOUNDATIONS / HARD-GATE discipline** -> manual review that the rewrite only tightens prompt guidance to the existing validator and does not alter approval or write routing.

## What to Change

### 1. Align predicate-dsl stop args

Update `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` so every normal-exit and interrupt-before predicate documents the same required args as `STOP_PREDICATE_ARG_SCHEMAS`.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Changing validator code or adding new stop predicates.
- Editing bootstrap Phase 6 landmine prose beyond any necessary comparison-note fallout from the predicate-dsl alignment.
- Resolving STPOOL-011's Phase 7.6 lifecycle wording unless that ticket is deliberately absorbed during reassessment.

## Acceptance Criteria

### Tests That Must Pass

1. Manual comparison confirms every `templates/predicate-dsl.md` stop-predicate args row matches `STOP_PREDICATE_ARG_SCHEMAS`.
2. `grep -nE 'salience_min|thread: THR|axis: time|violation_kind|envelope_item|args: \\{axis: <strong_axis' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns no stale stop-args rows after implementation.
3. Manual review confirms no HARD-GATE, approval, patch-engine, or Mystery Reserve firewall behavior changed.

### Invariants

1. The prompt grammar teaches only validator-accepted stop-policy args.
2. Existing predicate names and section membership remain unchanged.

## Test Plan

### New/Modified Tests

1. None — prompt grammar/reference truthing only.

### Commands

1. `grep -nE 'new_obligation_created|open_thread_reprioritized|time_or_location_changes|protagonist_goal_change_required|selected_commitment_would_be_violated|user_write_in_conflicts_with_envelope|only_next_action_would_create_major_state_change|salience_min|thread: THR|axis: time|violation_kind|envelope_item|args: \\{axis: <strong_axis' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`
2. Manual comparison against `STOP_PREDICATE_ARG_SCHEMAS`.
