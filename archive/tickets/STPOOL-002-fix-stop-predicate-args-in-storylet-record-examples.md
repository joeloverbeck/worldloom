# STPOOL-002: Fix stop-predicate args in storylet-record.yaml worked examples

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — skill grammar/template edit only; corrected examples will already pass the existing `storylet_predicate_dsl_parsability` and `stop_policy_parsability` validators.
**Deps**: None

## Problem

At intake, the three worked example arcs in `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (the SLT schema authority) used stop-policy predicate `args` that contradicted the predicate-DSL grammar this same skill owns. SLT records constructed by following those examples would have failed engine validators at submit time:

- `commitment_satisfied` / `commitment_blocked` examples used `args: {outcome: ...}`, `{reason: ...}`, or `{thread_pressure: ...}` instead of the required `commitment_class`.
- `participant_exits` examples used `args: {role: recipient}` / `{role: opponent}` instead of `participant` (for example, `participant: role:recipient`).
- `templates/storylet-record.yaml` used `predicate: safety_valve_triggered`, which is not in the `STOP_PREDICATES` enum and would fail `stop_policy_parsability.unknown_predicate`.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-01. `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` already documented this divergence and explicitly handed it off to a storylet-pool-authoring audit: *"Treat the live validator grammar as authoritative when constructing SLT records; flag this template divergence in any storylet-pool-authoring audit."*

## Assumption Reassessment (2026-05-12)

1. Verified `templates/storylet-record.yaml` contained the divergent `fragile_offer`, `bounded_question`, and `escalation_to_confrontation` stop-policy examples before this ticket's edits.
2. Verified `templates/predicate-dsl.md:151-183` is the closed-grammar source of truth — `commitment_satisfied: {commitment_class: <enum>}`, `participant_exits: {participant: STENT-NNNN | role:<role>}`, and `safety_valve_triggered` is absent from both the normal-exits and interrupt-before predicate enumerations.
3. Cross-checked `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is the live validator grammar (cited by `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:74`); any future divergence between this template and the live grammar must be reconciled with the live grammar as authority.
4. FOUNDATIONS Rule 1 (No Floating Facts) governs storylet schema compliance (per `references/governance-and-foundations.md`); a template whose examples produce records that fail Phase 4 gate 7 (predicate DSL parsability) or gate 11 (stop-policy parsability) undermines Rule 1 at the schema-template authoring surface.
5. Reassessment found one same-seam grammar-text mismatch: `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` documents `irreversible_cost_imminent` with `cost_class`, while the live validator and bootstrap landmines reference require `cost_axis`. This ticket therefore owns the paired DSL text correction needed for the replacement interrupt-before example to remain self-consistent.
6. `docs/HARD-GATE-DISCIPLINE.md` was read because this edits a content-generating skill's prompt/validation grammar surface. The edit does not relax any HARD-GATE approval, canon-write, or Mystery Reserve firewall behavior; it only aligns the documented stop-policy args with the fail-closed validator grammar.
7. Mismatch + correction: the schema-template's worked examples must use the stop-predicate grammar enforced by the live validator and mirrored by bootstrap's landmines note. The grammar enum is unchanged; the skill-local prompt grammar and examples are corrected to match the existing validator.

## Architecture Check

1. Single-source the predicate args by binding the template's examples to the live stop-policy grammar already enforced by `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`, mirrored in bootstrap's landmines note, and documented for authors in `templates/predicate-dsl.md`. The DSL document is the prompt authority; the template's role is to demonstrate it correctly.
2. No backwards-compatibility shim — the divergent examples never produced valid records, so there are no in-tree storylets following the wrong shape to grandfather.

## Verification Layers

1. **Template self-consistency** — every stop-policy entry in `templates/storylet-record.yaml`'s worked examples parses against the grammar at `templates/predicate-dsl.md` §Stop Predicates → grep-proof/manual comparison of `predicate:` values and args against the DSL grammar's enumerated predicate names.
2. **Live validator agreement** — corrected examples match `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` `STOP_PREDICATES` / `NORMAL_EXIT_STOP_PREDICATES` / `INTERRUPT_BEFORE_STOP_PREDICATES` enums and `STOP_PREDICATE_ARG_SCHEMAS` required keys → manual comparison against the live constants.
3. **Cross-skill alignment with bootstrap landmines doc** — bootstrap's `references/phase-6-storylet-pool-seed.md:80-106` describes the same required args; the corrected template matches the bootstrap reference's predicate-args table line-by-line.

## Landed Changes

### 1. Fixed `commitment_satisfied` / `commitment_blocked` examples to use `commitment_class:` arg

In `templates/storylet-record.yaml`, the worked examples now use:

- Line 301: `{id: commitment-satisfied, predicate: commitment_satisfied, args: {outcome: accepted_with_limits}}` → `{id: commitment-satisfied, predicate: commitment_satisfied, args: {commitment_class: offer_practical_help}}` (use the arc's own `arc_contract.commitment_class`).
- Line 302: `{id: commitment-blocked, predicate: commitment_blocked, args: {reason: refusal}}` → `{id: commitment-blocked, predicate: commitment_blocked, args: {commitment_class: offer_practical_help, reason_class: refusal}}` (per DSL grammar `commitment_blocked` accepts both required `commitment_class` and optional `reason_class` open-vocab arg).
- Line 350: `{id: question-answered, predicate: commitment_satisfied, args: {information_posture: investigated}}` → `{id: question-answered, predicate: commitment_satisfied, args: {commitment_class: ask_one_bounded_question}}`.
- Line 351: `{id: question-refused, predicate: commitment_blocked, args: {reason: refusal}}` → `{id: question-refused, predicate: commitment_blocked, args: {commitment_class: ask_one_bounded_question, reason_class: refusal}}`.
- Line 352: `{id: question-redirected, predicate: commitment_satisfied, args: {outcome: partially_deflected}}` → `{id: question-redirected, predicate: commitment_satisfied, args: {commitment_class: ask_one_bounded_question}}`.
- Line 400: `{id: position-forced, predicate: commitment_satisfied, args: {thread_pressure: increased}}` → `{id: position-forced, predicate: commitment_satisfied, args: {commitment_class: escalate_to_confrontation}}`.
- Line 402: `{id: cost-accepted, predicate: commitment_satisfied, args: {outcome: fails_with_consequence}}` → `{id: cost-accepted, predicate: commitment_satisfied, args: {commitment_class: escalate_to_confrontation}}`.

### 2. Fixed `participant_exits` examples to use `participant:` arg

In `templates/storylet-record.yaml`, the worked examples now use:

- Line 303: `{id: participant-exits, predicate: participant_exits, args: {role: recipient}}` → `{id: participant-exits, predicate: participant_exits, args: {participant: role:recipient}}`.
- Line 401: `{id: confrontation-interrupted, predicate: participant_exits, args: {role: opponent}}` → `{id: confrontation-interrupted, predicate: participant_exits, args: {participant: role:opponent}}`.

### 3. Replaced the `safety_valve_triggered` interrupt_before example

In `templates/storylet-record.yaml`:

`{id: safety-limit, predicate: safety_valve_triggered, args: {kind: escalation_limit}}` was replaced because `safety_valve_triggered` is not a predicate at all. Safety valves are inline thresholds under `stop_policy.safety_valves`, not DSL predicates.

The replacement uses a valid interrupt-before predicate from `templates/predicate-dsl.md`. The escalation arc's natural interrupt is irreversible-cost approach:

`{id: irreversible-cost, predicate: irreversible_cost_imminent, args: {cost_axis: alliance_damage}}` (per the validator's required `cost_axis: <kebab-case open-vocab>` arg as documented in `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:99`).

The `max_internal_beats` safety valve already in line 405 covers the runaway-defense surface that the deleted `safety_valve_triggered` entry pretended to.

### 4. Aligned the DSL prompt text for the replacement interrupt predicate

In `templates/predicate-dsl.md`, the stale `irreversible_cost_imminent` args key `cost_class` was replaced with `cost_axis`, matching `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and bootstrap's required-args table.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Extending the predicate-DSL grammar itself (this ticket only corrects examples against the existing grammar).
- Auditing in-tree SLT records under `worlds/<slug>/stories/<slug>/_source/storylets/` for the same divergence — those bundles either never adopted the broken examples or have already been worked around by the live validator's rejection. If the user wants an in-tree sweep, it becomes its own ticket.
- Editing `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`'s "Template-divergence note" (lines 88-106) — once this ticket lands, the bootstrap reference's note can be revisited in a separate cleanup ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -E 'predicate: (commitment_satisfied|commitment_blocked|commitment_overturned)' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` shows every match's `args:` block contains `commitment_class:`.
2. `grep -E 'predicate: participant_exits' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` shows every match's `args:` block uses `participant:` (not `role:`).
3. `grep -n 'safety_valve_triggered' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returns no matches.
4. `grep -n 'cost_class' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` returns no matches, and `grep -n 'cost_axis' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` shows the `irreversible_cost_imminent` args key.
5. The corrected stop-policy snippets parse against `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `STOP_PREDICATES` enums by manual comparison against `STOP_PREDICATE_ARG_SCHEMAS`.

### Invariants

1. Every `predicate:` value in `templates/storylet-record.yaml`'s worked examples appears in `templates/predicate-dsl.md`'s STOP_PREDICATES grammar.
2. Every `args:` payload's required key matches the per-predicate args table at `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:88-104` (which mirrors the live validator's per-predicate args schema).

## Test Plan

### New/Modified Tests

1. None — skill-template/grammar ticket; verification is command-based/manual comparison and existing pipeline coverage (`storylet_predicate_dsl_parsability` / `stop_policy_parsability` validators in `tools/validators/`) is the runtime backstop named in Assumption Reassessment.

### Commands

1. `grep -nE 'predicate: (commitment_(satisfied|blocked|overturned)|participant_exits|safety_valve_triggered)' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — visual confirmation that every match uses the correct args shape and `safety_valve_triggered` is gone.
2. `grep -nE 'cost_class|cost_axis' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` — visual confirmation that `irreversible_cost_imminent` uses `cost_axis` across the skill prompt grammar, live validator grammar, and bootstrap landmines note.
3. Re-read the corrected examples and verify they are consistent with the stop-policy parser's required-args schema. (No automated CLI for a template-only edit; the user's next storylet-pool-authoring invocation is the integration test.)

## Outcome

Completed. The storylet-record worked examples now use validator-aligned stop-policy args for `commitment_satisfied`, `commitment_blocked`, and `participant_exits`; the invalid `safety_valve_triggered` interrupt example is replaced with `irreversible_cost_imminent`; and `templates/predicate-dsl.md` now documents the matching `cost_axis` arg key.

## Verification Result

1. `grep -nE 'predicate: (commitment_(satisfied|blocked|overturned)|participant_exits|safety_valve_triggered|irreversible_cost_imminent)' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` passed by inspection: all ten stop-policy example rows use the corrected predicate/args shapes, including `irreversible_cost_imminent` with `cost_axis`.
2. `grep -n 'safety_valve_triggered' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` returned no matches.
3. `grep -nE 'cost_class|cost_axis' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` showed `cost_axis` in all three current authority surfaces and no `cost_class` hit.
4. Manual validator-grammar comparison completed against `STOP_PREDICATES`, `NORMAL_EXIT_STOP_PREDICATES`, `INTERRUPT_BEFORE_STOP_PREDICATES`, and `STOP_PREDICATE_ARG_SCHEMAS` in `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`.

## Deviations

1. Reassessment widened the file set from the drafted template-only edit to include `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, because the replacement `irreversible_cost_imminent` example needed the prompt grammar's `cost_axis` key aligned with the live validator.
2. `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` already had unrelated dirty edits changing `arc_archetype` comments from enum wording to label wording. Those pre-existing hunks were left intact and are not part of this ticket.
