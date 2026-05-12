# STPOOL-013: Retire resolved bootstrap SLT template-divergence note

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — skill reference truthing only.
**Deps**: archive/tickets/STPOOL-002-fix-stop-predicate-args-in-storylet-record-examples.md, archive/tickets/STPOOL-003-add-realization-target-to-beat-scaffolds.md, archive/tickets/STPOOL-004-add-non-empty-interrupt-before-to-examples.md

## Problem

`branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` still carries resolved storylet-template divergence prose after STPOOL-002, STPOOL-003, and STPOOL-004 landed:

- The opening paragraph of `## SLT schema landmines` still says `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` examples "either omit, encode incorrectly, or split" validator-required surfaces.
- The `stop_policy.interrupt_before` gotcha still says the storylet template shows the field as syntactically optional, even though the main scaffold now says it is non-empty and all worked examples carry populated entries.
- The `Template-divergence note` still claims `templates/storylet-record.yaml` contains `predicate: safety_valve_triggered` around line 404 and tells auditors to flag that divergence, but STPOOL-002 removed that invalid example and STPOOL-004 archived after adding the missing interrupt-before examples.

This was exposed during post-ticket review of STPOOL-004 on 2026-05-12.

## Assumption Reassessment (2026-05-12)

1. Verified `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` still contains the resolved `safety_valve_triggered` template-divergence note and still frames the storylet template as showing `interrupt_before` as syntactically optional.
2. Verified `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml` now has `realization_target` on scaffold/worked-example beats, a non-empty `interrupt_before` scaffold note, populated `interrupt_before` blocks on fragile_offer, bounded_question, and escalation_to_confrontation, and no `safety_valve_triggered` example.
3. Cross-skill boundary under audit: `branching-story-bootstrap` Phase 6 inline SLT authoring guidance consumes `storylet-pool-authoring`'s SLT schema authority. The bootstrap reference should remain a landmine checklist for validator requirements, not a stale bug report against a now-corrected producer template.
4. FOUNDATIONS Rule 1 alignment: bootstrap authors still need structural SLT fields and parser-valid stop policies, but stale "template diverges" prose weakens traceability by pointing implementers at already-fixed divergences.
5. HARD-GATE / validation-signal surface: this is a content-generating skill reference used before engine-routed story-bundle writes. The intended edit must not relax any gate, approval requirement, patch-engine write route, or Mystery Reserve firewall; it should only truth the reference text against the corrected template and live validator.
6. Adjacent contradiction classification: the stale bootstrap note is separate follow-up cleanup, not unfinished STPOOL-004 work, because STPOOL-004 owned the storylet-pool-authoring template/prompt grammar and explicitly left bootstrap reference cleanup out of scope.

## Architecture Check

1. Convert the bootstrap section from stale divergence reporting to durable validator landmine guidance: keep required-field and predicate-section reminders, but remove or historicalize claims that the storylet-pool-authoring template is currently wrong.
2. No backwards-compatibility aliases or shims introduced.

## Verification Layers

1. **Bootstrap reference truthing** -> grep-proof/manual review that `phase-6-storylet-pool-seed.md` no longer claims `templates/storylet-record.yaml` contains `safety_valve_triggered` or omits the fixed fields.
2. **Cross-skill alignment** -> manual comparison against `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, and `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`.
3. **FOUNDATIONS / HARD-GATE discipline** -> manual review that the rewritten bootstrap reference preserves validator fail-closed guidance and does not relax user approval or engine-routed writes.

## What to Change

### 1. Truth the bootstrap Phase 6 SLT landmines reference

Update `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` so it:

- keeps the validator-required `realization_target`, `interrupt_before`, predicate-section, and predicate-args guidance;
- stops saying the storylet-pool-authoring template currently omits or incorrectly encodes those surfaces;
- removes or replaces the resolved `safety_valve_triggered` `Template-divergence note`;
- points to archived STPOOL-002/STPOOL-003/STPOOL-004 only as historical cleanup evidence if that helps future readers.

### 2. Keep triage handoff aligned

Update `docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` if the bootstrap-reference follow-up note still describes this cleanup as merely possible rather than actively ticketed.

## Files to Touch

- `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` (modify)
- `docs/triage/2026-05-12-storylet-pool-authoring-audit-triage.md` (modify, if still stale)

## Out of Scope

- Editing storylet-pool-authoring templates or predicate grammar; STPOOL-002/STPOOL-003/STPOOL-004 already landed those corrections.
- Changing validators, schemas, patch-engine behavior, approval-token behavior, or story-bundle write routing.
- Rewriting bootstrap Phase 6 delegation semantics beyond the stale landmine prose.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -nE 'safety_valve_triggered|flag this template divergence|shows it as syntactically optional|either omit, encode incorrectly' .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md` returns no stale-current claims.
2. Manual review confirms the bootstrap reference still warns authors that `beat_plan.beats[].realization_target`, populated `stop_policy.interrupt_before`, predicate-section split, and predicate-specific args are validator-enforced.
3. Manual comparison confirms the bootstrap reference, storylet template, predicate-DSL prompt grammar, and live validator grammar agree on the stop-policy predicates and required args.

### Invariants

1. Bootstrap remains stricter than convenience: it still tells inline SLT authors to satisfy validator-required storylet structure before Phase 11 patch submission.
2. The reference no longer describes corrected storylet-pool-authoring template examples as currently divergent.
3. HARD-GATE and engine-routed story-bundle write discipline remain unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation/reference truthing only.

### Commands

1. `grep -nE 'safety_valve_triggered|flag this template divergence|shows it as syntactically optional|either omit, encode incorrectly' .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`
2. `grep -nE 'realization_target|interrupt_before|NORMAL_EXIT_STOP_PREDICATES|INTERRUPT_BEFORE_STOP_PREDICATES|mystery_id|cost_axis' .claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`
3. Manual comparison against `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`, `.claude/skills/storylet-pool-authoring/templates/predicate-dsl.md`, and `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts`.
