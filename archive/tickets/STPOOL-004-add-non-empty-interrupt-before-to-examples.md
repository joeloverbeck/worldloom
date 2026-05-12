# STPOOL-004: Add non-empty `interrupt_before` block to storylet-record example arcs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None — skill template / prompt-grammar edit only; the existing schema/validator surfaces already require populated `stop_policy.interrupt_before`.
**Deps**: archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md (the escalation_to_confrontation `interrupt_before` block's `safety_valve_triggered` predicate was replaced first per F-01).

## Problem

At intake, `templates/storylet-record.yaml` example arcs did not consistently provide a non-empty `interrupt_before` block:

- Main scaffold showed `interrupt_before:` with a placeholder entry, but did not state that the list must be non-empty.
- `fragile_offer` example omitted `interrupt_before` entirely — only `normal_exits` and `safety_valves` present.
- `bounded_question` example omitted `interrupt_before` entirely.
- `escalation_to_confrontation` example includes a valid `interrupt_before`; its formerly invalid `safety_valve_triggered` predicate was corrected by `archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md`.

Per `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:79`: *"`stop_policy.interrupt_before` must be NON-EMPTY (≥1 entry). The storylet template shows it as syntactically optional, but the validator rejects empty `interrupt_before: []` arrays."*

Before this ticket, after `archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md`, only the escalation example demonstrated a passing `interrupt_before` block. Records constructed by following the two omission examples would fail the populated `stop_policy.interrupt_before` contract.

This was uncovered by storylet-pool-authoring streamlining audit 2026-05-12 finding F-03.

## Assumption Reassessment (2026-05-12)

1. Verified `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` fragile_offer and bounded_question worked examples omit `interrupt_before`; escalation_to_confrontation already has one valid `interrupt_before` entry from STPOOL-002; the main scaffold has a placeholder entry but lacks the non-empty constraint note.
2. Verified `templates/predicate-dsl.md:202-225` enumerates the legal interrupt-before predicates: `irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change`.
3. Bootstrap reference at `branching-story-bootstrap/references/phase-6-storylet-pool-seed.md:79` proposes the safe default: `{id: consent-boundary-imminent, predicate: consent_boundary_imminent, args: {}}` (no required args).
4. Rule 1 (No Floating Facts) per `references/governance-and-foundations.md` — stop_policy must declare interrupt conditions structurally; a missing block represents an undeclared safety surface.
5. Same-seam prompt-grammar drift found during reassessment: `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` lists `consent_boundary_imminent` with required `boundary_class` and `forbidden_mystery_resolution_risk` with `mystery`, but the live validator and bootstrap reference require no args for `consent_boundary_imminent` and `mystery_id` for `forbidden_mystery_resolution_risk`. This ticket owns the minimal DSL args correction because the new examples rely on those exact args shapes.
6. `docs/HARD-GATE-DISCIPLINE.md` was read because this edits a content-generating skill template / prompt-grammar surface. The edit does not relax any HARD-GATE approval, canon-write, or Mystery Reserve firewall behavior; it makes the examples and prompt grammar match the fail-closed validator.

## Architecture Check

1. Use the bootstrap reference's safe default for any arc that doesn't have a specific interrupt-class semantically appropriate to it. The default is safe because `consent_boundary_imminent` is a meaningful interrupt for any scene involving cast interaction (which is every arc in this template).
2. Where an arc has a more specific natural interrupt (e.g., `forced_disclosure` archetype could use `forbidden_mystery_resolution_risk`), prefer the more specific predicate as a teaching example.

## Verification Layers

1. **Template completeness** — the main scaffold plus every worked example `stop_policy:` block has a non-empty `interrupt_before:` list -> `awk '/stop_policy:/,/safety_valves:/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c 'interrupt_before:'` returns `4`, and an awk structural check confirms each `interrupt_before:` is immediately followed by a structured entry.
2. **Live validator agreement** — every worked-example `interrupt_before` predicate matches `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`'s `INTERRUPT_BEFORE_STOP_PREDICATES` enum, and the prompt grammar now matches the validator/bootstrap args shapes for `consent_boundary_imminent` and `forbidden_mystery_resolution_risk`.

## Landed Changes

### 1. Add non-empty `interrupt_before` to `fragile_offer` example

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, the fragile_offer `stop_policy:` worked example now includes before `safety_valves`:

```yaml
interrupt_before:
  - {id: consent-boundary, predicate: consent_boundary_imminent, args: {}}
```

### 2. Add non-empty `interrupt_before` to `bounded_question` example

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, the bounded_question `stop_policy:` worked example now includes before `safety_valves`:

```yaml
interrupt_before:
  - {id: forbidden-mystery-risk, predicate: forbidden_mystery_resolution_risk, args: {mystery_id: M-NNNN}}
```

(`bounded_question` arcs frequently brush mystery edges; `forbidden_mystery_resolution_risk` is the natural interrupt class for the bounded-disclosure scene-shape this example demonstrates. The `M-NNNN` placeholder remains a literal that the LLM will replace at authoring time.)

### 3. Update the main scaffold to surface a non-empty default

In `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, the main scaffold's `interrupt_before:` block now surfaces the non-empty requirement and predicate-DSL args pointer:

```yaml
interrupt_before:                        # MUST be non-empty (>=1 entry); any of these interrupts the arc before completion
  - id: <kebab-case interrupt id>
    predicate: <interrupt_predicate enum>    # from templates/predicate-dsl.md Interrupt-before predicates
    args: {}                                 # type-specific args; see predicate-dsl.md per-predicate args schemas
```

### 4. Align predicate-DSL args text with validator/bootstrap authority

In `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, the prompt grammar now agrees with `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` and bootstrap's landmines reference:

- `consent_boundary_imminent` uses `args: {}`.
- `forbidden_mystery_resolution_risk` uses `args: {mystery_id: M-NNNN}`.

## Files to Touch

- `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` (modify)
- `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md` (modify)

## Out of Scope

- Adding an interrupt-class authoring decision tree (which interrupt predicate fits which arc shape) — that would be a reference-doc addition, not a template fix.
- Validator changes — the validator already correctly rejects empty `interrupt_before`.

## Acceptance Criteria

### Tests That Must Pass

1. `awk '/stop_policy:/,/safety_valves:/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c "interrupt_before:"` returns at least 4 across the main scaffold plus three worked example arcs.
2. For each example arc, the line immediately following its `interrupt_before:` is a structured `- id:` entry, not a comment-only line.
3. Every interrupt-before `predicate:` value matches one of the eight predicates listed at `templates/predicate-dsl.md:202-225`.
4. `templates/predicate-dsl.md` documents `consent_boundary_imminent` with no required args and `forbidden_mystery_resolution_risk` with `mystery_id`, matching the live validator.

### Invariants

1. Every example arc in `templates/storylet-record.yaml` has a non-empty `interrupt_before:` block with at least one structured entry.
2. The main scaffold's `interrupt_before:` placeholder is annotated with the "MUST be non-empty" constraint so future template readers do not omit it.
3. The predicate-DSL prompt grammar does not contradict the validator args shape used by the template examples.

## Test Plan

### New/Modified Tests

1. None — skill template / prompt-grammar edit only.

### Commands

1. `awk '/stop_policy:/,/safety_valves:/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c 'interrupt_before:'` — count scaffold plus worked example `interrupt_before` blocks.
2. `awk 'BEGIN{fail=0} /#? *interrupt_before:/ { line=$0; getline nxt; if (nxt !~ /#? *- (id:|\{id:)/) { print "bad following line after: " line " => " nxt; fail=1 } } END{ if (fail) exit 1; print "all interrupt_before blocks have structured following entries" }' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` — structural check that each `interrupt_before:` is populated.
3. `grep -nE 'consent_boundary_imminent|forbidden_mystery_resolution_risk|boundary_class|mystery_id|args: [{]mystery:' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` — visual comparison of prompt grammar, live validator grammar, and bootstrap reference.

## Outcome

Completed on 2026-05-12. The main SLT scaffold now states `interrupt_before` must be non-empty, fragile_offer and bounded_question worked examples now include populated interrupt-before entries, and predicate-dsl prompt grammar now matches validator/bootstrap args for the two interrupt predicates used by those examples.

## Verification Result

1. `awk '/stop_policy:/,/safety_valves:/' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml | grep -c 'interrupt_before:'` returned `4`.
2. `awk 'BEGIN{fail=0} /#? *interrupt_before:/ { line=$0; getline nxt; if (nxt !~ /#? *- (id:|\{id:)/) { print "bad following line after: " line " => " nxt; fail=1 } } END{ if (fail) exit 1; print "all interrupt_before blocks have structured following entries" }' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` passed with `all interrupt_before blocks have structured following entries`.
3. `grep -nE 'consent_boundary_imminent|forbidden_mystery_resolution_risk|boundary_class|mystery_id|args: [{]mystery:' .claude/skills/storylet-pool-authoring/templates/predicate-dsl.md tools/validators/src/rules/_shared/predicate-dsl-grammar.ts .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` passed by inspection: the prompt grammar, live validator, and bootstrap reference agree that `consent_boundary_imminent` has no required args and `forbidden_mystery_resolution_risk` uses `mystery_id`; no `boundary_class` or `args: {mystery:` stale hits remained.
4. `grep -nE 'interrupt_before:|predicate: (consent_boundary_imminent|forbidden_mystery_resolution_risk|irreversible_cost_imminent)' .claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` confirmed the scaffold plus all three worked examples carry interrupt-before entries with valid interrupt predicates.

## Deviations

1. Reassessment widened the file set from template-only to include `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, because the new example args would otherwise conflict with the same skill's prompt-grammar authority.
2. The drafted "next storylet-pool-authoring invocation's Phase 5b validate-patch-plan run" was not run in this implementation pass; no story bundle invocation or world-content patch plan was in scope. Verification used the skill-template grep/manual proof surface plus validator/bootstrap grammar comparison.
