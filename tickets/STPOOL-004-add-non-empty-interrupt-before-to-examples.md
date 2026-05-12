# STPOOL-004: Add non-empty `interrupt_before` block to storylet-record example arcs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — template edit only; the `stop_policy_parsability` validator already rejects empty/missing `interrupt_before`.
**Deps**: STPOOL-002 (the escalation_to_confrontation `interrupt_before` block's `safety_valve_triggered` predicate must be replaced first per F-01).

## Problem

`templates/storylet-record.yaml` example arcs do not consistently provide a non-empty `interrupt_before` block:

- Main scaffold at `:225-228` shows `interrupt_before:` with a comment-only sample (no concrete entry).
- `fragile_offer` example (`:299-304`) omits `interrupt_before` entirely — only `normal_exits` and `safety_valves` present.
- `bounded_question` example (`:348-353`) omits `interrupt_before` entirely.
- `escalation_to_confrontation` example (`:399-405`) includes `interrupt_before` but the entry uses the invalid `safety_valve_triggered` predicate (corrected by STPOOL-002).

Per `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:79`: *"`stop_policy.interrupt_before` must be NON-EMPTY (≥1 entry). The storylet template shows it as syntactically optional, but the validator rejects empty `interrupt_before: []` arrays."*

After STPOOL-002 lands, none of the three example arcs will demonstrate a passing `interrupt_before` block. Records constructed by following these examples will fail `stop_policy_parsability`.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-03.

## Assumption Reassessment (2026-05-12)

1. Verified `templates/storylet-record.yaml:299-304` (fragile_offer stop_policy) omits `interrupt_before`; `:348-353` (bounded_question stop_policy) omits `interrupt_before`; `:399-405` (escalation stop_policy) has `interrupt_before` with one invalid entry.
2. Verified `templates/predicate-dsl.md:202-225` enumerates the legal interrupt-before predicates: `irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change`.
3. Bootstrap reference at `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:79` proposes the safe default: `{id: consent-boundary-imminent, predicate: consent_boundary_imminent, args: {}}` (no required args).
4. Rule 1 (No Floating Facts) per `references/governance-and-foundations.md` — stop_policy must declare interrupt conditions structurally; a missing block represents an undeclared safety surface.

## Architecture Check

1. Use the bootstrap reference's safe default for any arc that doesn't have a specific interrupt-class semantically appropriate to it. The default is safe because `consent_boundary_imminent` is a meaningful interrupt for any scene involving cast interaction (which is every arc in this template).
2. Where an arc has a more specific natural interrupt (e.g., `forced_disclosure` archetype could use `forbidden_mystery_resolution_risk`), prefer the more specific predicate as a teaching example.

## Verification Layers

1. **Template completeness** — every `stop_policy:` block in worked examples has a non-empty `interrupt_before:` list → `grep -B0 -A12 "stop_policy:" templates/storylet-record.yaml | grep -c "interrupt_before:"` ≥3 (one per example arc) AND each match is followed by at least one structured entry, not just a comment.
2. **Live validator agreement** — every `interrupt_before` predicate matches `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `INTERRUPT_BEFORE_STOP_PREDICATES` enum.

## What to Change

### 1. Add non-empty `interrupt_before` to `fragile_offer` example

In `templates/storylet-record.yaml:299-304` (within the fragile_offer `stop_policy:` block), insert before `safety_valves`:

```yaml
interrupt_before:
  - {id: consent-boundary, predicate: consent_boundary_imminent, args: {}}
```

### 2. Add non-empty `interrupt_before` to `bounded_question` example

In `templates/storylet-record.yaml:348-353` (within the bounded_question `stop_policy:` block), insert before `safety_valves`:

```yaml
interrupt_before:
  - {id: forbidden-mystery-risk, predicate: forbidden_mystery_resolution_risk, args: {mystery_id: M-NNNN}}
```

(`bounded_question` arcs frequently brush mystery edges; `forbidden_mystery_resolution_risk` is the natural interrupt class for the bounded-disclosure scene-shape this example demonstrates. The `M-NNNN` placeholder remains a literal that the LLM will replace at authoring time.)

### 3. Update the main scaffold to surface a non-empty default

In `templates/storylet-record.yaml:225-228`, replace the comment-only `interrupt_before:` block with:

```yaml
interrupt_before:                        # MUST be non-empty (≥1 entry); validator rejects empty list
  - id: <kebab-case interrupt id>
    predicate: <interrupt_predicate enum>    # from templates/predicate-dsl.md §Interrupt-before predicates
    args: {}                                 # type-specific args; see predicate-dsl.md per-predicate args schemas
```

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)

## Out of Scope

- Adding an interrupt-class authoring decision tree (which interrupt predicate fits which arc shape) — that would be a reference-doc addition, not a template fix.
- Validator changes — the validator already correctly rejects empty `interrupt_before`.

## Acceptance Criteria

### Tests That Must Pass

1. `awk '/stop_policy:/,/safety_valves:/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c "interrupt_before:"` ≥3 across the three example arcs.
2. For each example arc, the line immediately following its `interrupt_before:` is a structured `- id:` entry, not a comment-only line.
3. Every interrupt-before `predicate:` value matches one of the eight predicates listed at `templates/predicate-dsl.md:202-225`.

### Invariants

1. Every example arc in `templates/storylet-record.yaml` has a non-empty `interrupt_before:` block with at least one structured entry.
2. The main scaffold's `interrupt_before:` placeholder is annotated with the "MUST be non-empty" constraint so future template readers do not omit it.

## Test Plan

### New/Modified Tests

1. None — template edit only.

### Commands

1. `grep -B0 -A20 'stop_policy:' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | head -80` — visual confirmation every stop_policy block in examples carries a populated `interrupt_before`.
2. Next storylet-pool-authoring invocation's Phase 5b validate-patch-plan run; success means `stop_policy_parsability` PASSes for the generated SLT records' stop_policy.
