# Phase 1: Coverage Diagnosis

Phase 1 scans the current storylet pool and the open story state, then emits the
diagnosis matrix that Phase 2 uses for seed selection. Coverage is measured by
`commitment_class` and `arc_archetype` (per the SPEC-21 scene-commitment-arc
rebind).

The matrix is a planning artifact, not a canon mutation. It must surface the
missing routes by which the pool can pay off obligations, advance active
threads, touch mysteries safely, and avoid recent commitment-class repetition.
That keeps Phase 2 grounded in FOUNDATIONS Rule 1: every proposed arc must have
a story-state reason to exist rather than floating free as decoration.

## Direct Invocation Matrix

For direct `seed` or `focus` invocation, emit one `diagnosis_matrix` with these
top-level keys:

```yaml
diagnosis_matrix:
  open_obligations_by_commitment_class:
    OBL-NNNN:
      eligible_commitment_classes: [<commitment_class>, ...]
      pool_arcs_by_class:
        <commitment_class>: [SLT-NNNN, ...]
      gaps: [<commitment_class>, ...]
      rationale: >
        Why these commitment_classes could plausibly pay off, complicate,
        transfer, or otherwise engage this obligation.

  active_threads_by_commitment_class:
    THR-NNNN:
      escalation_commitment_classes: [<commitment_class>, ...]
      pool_arcs_by_class:
        <commitment_class>: [SLT-NNNN, ...]
      gaps: [<commitment_class>, ...]
      rationale: >
        Why these commitment_classes could plausibly raise, sustain, redirect,
        or close this thread's pressure.

  arc_archetype_distribution:
    fragile_offer: 0
    bounded_question: 0
    confession_received: 0
    refusal_and_aftercare: 0
    practical_aid_attempt: 0
    withdrawal_without_abandonment: 0
    escalation_to_confrontation: 0
    concealment_under_pressure: 0
    third_party_intervention: 0
    investigation_followup: 0
    aftermath_processing: 0
    route_change: 0
    public_commitment: 0
    private_betrayal: 0
    intimacy_negotiation: 0
    boundary_setting: 0
    restitution_offered: 0
    silent_witness: 0
    forced_disclosure: 0
    pressure_release: 0

  commitment_class_distribution:
    stay_available_without_pressure: 0
    offer_practical_help: 0
    ask_one_bounded_question: 0
    withdraw_without_abandoning: 0
    confess_one_thing: 0
    accept_offered_help: 0
    refuse_with_grace: 0
    escalate_to_confrontation: 0
    conceal_under_pressure: 0
    seek_third_party: 0
    change_venue: 0
    make_public_commitment: 0
    private_betrayal: 0
    bear_witness: 0
    release_pressure: 0
    tighten_pressure: 0
    defer_decision: 0
    force_disclosure: 0
    mirror_acknowledgment: 0
    intimacy_advance: 0

  content_intensity_distribution:
    tame: 0
    mature: 0
    explicit: 0

  mysteries_in_play_by_arc:
    M-NNNN:
      touching_arcs: [SLT-NNNN, ...]
      progressing_arcs: [SLT-NNNN, ...]
      gap: true

  recent_history_repetition_signal:
    last_5_pages_classes: [<commitment_class>, ...]
    over_represented: [<commitment_class>, ...]
```

`arc_archetype_distribution` keys should preserve the labels actually present in
the pool. Values from `templates/arc-archetypes.md` are recommended library
patterns, not an exhaustive set; story-specific labels are allowed when they
capture a dramatic structure the library would distort.
`commitment_class_distribution` keys must come from SPEC-22 Track 3
`COMMITMENT_CLASSES`. Do not invent local values.

## Obligation And Thread Classification

For every open OBL, enumerate `eligible_commitment_classes` by reading the OBL's
type, subjects, constraints, salience, and current branch context. This is an
LLM-driven heuristic judgment, not a closed lookup table. Prompt the LLM to name
which commitment_classes could plausibly engage the obligation and why.

Then scan the current pool for existing arcs whose `arc_contract.commitment_class`
matches one of those eligible classes and whose effects, preconditions, and
scope can actually engage the OBL. Record those SLT ids under
`pool_arcs_by_class`; any eligible class with no usable matching arc becomes a
`gaps` entry.

For every active THR, enumerate `escalation_commitment_classes` by reading the
thread's current pressure, branch-local state, involved actors, and available
story routes. As with OBL classification, this is heuristic and context-bound.
Classes that could escalate, sustain, redirect, or close the thread are
eligible. Existing arcs are counted only when their `commitment_class` and
effect model can plausibly move that THR.

If `source_obligations` or `source_threads` is supplied, those records remain
mandatory targets for Phase 2. When `source_threads` is supplied, unpack each
thread's `obligations[]` into the OBL classification pass and also retain the
thread-level row. De-duplicate OBL rows when a source OBL appears both directly
and through a source thread.

## Distribution Scans

`arc_archetype_distribution` counts current pool occurrences by
`arc_contract.arc_archetype`. Phase 2 uses low-count archetypes to diversify
seed generation, subject to the story's actual obligation and thread pressure.

`commitment_class_distribution` counts current pool occurrences by
`arc_contract.commitment_class`. Phase 2 uses low-count classes as positive
pressure and `recent_history_repetition_signal.over_represented` as suppression
pressure.

`content_intensity_distribution` tracks the intensity axis. Compare the
pool against `STORY_KERNEL.content_intensity_baseline`:

- `tame` baseline: aim for roughly 60 percent tame, 30 percent mature, and
  10 percent explicit.
- `mature` baseline: aim for roughly 30 percent tame, 50 percent mature, and
  20 percent explicit.
- `explicit` baseline: aim for roughly 20 percent tame, 30 percent mature, and
  50 percent explicit.

`content_intensity_override`, when supplied, shifts the target one band in the
requested direction without lifting the NC-21 content policy.

## Mystery Coverage

For each `mysteries_in_play[]` entry in `STORY_KERNEL.md`, scan the pool for
arcs whose storylet-level `mystery_safety.M_touched` or `M_progressed` cites the
mystery. Record touching and progressing arcs separately.

Set `gap: true` when no current arc touches the mystery. A gap may become a
Phase 2 seed pressure, but it is not permission to resolve the mystery.
Forbidden-status mysteries may be brushed or preserved only within the skill's
Mystery Reserve firewall; they must never be seeded for resolution.

## Recent History Repetition

For direct seed/focus mode, scan the last five pages along the longest active
`branch_path`. Record their realized `commitment_class` values in
`last_5_pages_classes`.

Any commitment_class appearing at least three times in those five pages is
`over_represented`. Phase 2 should suppress that class unless a supplied source
OBL/THR makes it necessary.

Do not scan sibling branches for this signal. The purpose is to prevent a local
branch tip from homogenizing, not to flatten the whole story.

## Bootstrap Sub-Routine

When `parent_skill_invocation: true` from `branching-story-bootstrap`, the
story bundle may not exist on disk yet. Treat the current pool as empty and
diagnose against the parent-supplied bootstrap state: initial OBLs and THRs,
premise-driven PG-0001 CNSQs or story-local DAs, Phase 4
`audited_thread_obligation_sketch`, cast-bound STENT/STINT records, imported
SFs, premise tone and themes, `mysteries_in_play[]`, and the loaded whole-class
M/INV context.

Every bootstrap OBL/THR row must remain compatible with the
`audited_thread_obligation_sketch`. If a needed seed would materially widen the
initial THR/OBL branch beyond that sketch, route the divergence back to
`branching-story-bootstrap` Phase 4 instead of silently authoring a global
author-pool arc against an unaudited Rule 4 premise.

## Audit Mode

For `mode=audit`, validated RSP cards are the primary diagnosis source. Emit one
matrix row per card and copy the card's arc-targeting fields directly:

```yaml
diagnosis_matrix:
  audit_rsp_rows:
    RSP-NNNN:
      source_rsp: RSP-NNNN
      source_audit: SAU-NNNN
      finding_ids: [F-NN, ...]
      target_commitment_family: <commitment_family>
      target_commitment_class: <commitment_class>
      target_commitment_detail: <story-specific precision label | null>
      target_arc_archetype: <arc_archetype>
      sketch_arc_contract: >
        Card-provided arc-contract sketch, when present.
      sketch_dramatic_unit: >
        Card-provided dramatic-unit sketch, when present.
      priority_weight: max
```

`target_commitment_family`, `target_commitment_class`, optional
`target_commitment_detail`, and `target_arc_archetype` are owned by the
`branching-story-health-audit` RSP card schema. This Phase 1 reference consumes
those fields; it does not define or migrate the RSP card schema. The base
`target_commitment_class` remains the deterministic join key.

Audit mode bypasses a full pool-health diagnosis unless the operator explicitly
requests contextual review. RSP targeting already names the remediable gap; the
matrix's job is to preserve that targeting for Phase 2.

## JIT Mode

For `parent_skill_invocation: true` from `branching-story-page-cycle` with
`mode=jit`, reduce the diagnosis matrix to the single continuation failure that
triggered JIT:

```yaml
diagnosis_matrix:
  jit_continuation_failure:
    gap_kind: continuation_failure
    target_record_id: <caller_state_snapshot.current_storylet_eligibility_failure_reason.record_id | null>
    caller_commitment_class: <caller_state_snapshot.selected_chc.commitment_class>
    caller_state_snapshot_ref: inline
    priority_weight: max
```

Use `caller_state_snapshot.current_storylet_eligibility_failure_reason` when it
is present. Otherwise derive the row from page-cycle's Phase 3
consequence-capacity result and the failed Phase 4 eligibility/scoring context.

Do not run a full pool-health scan, distribution scan, or longest-branch recent
history scan inside the JIT sub-routine. Page-cycle has already assembled the
branch-local state. The resulting JIT seed is one arc whose `commitment_class`
matches the chosen CHC's `commitment_class`; `templates/arc-archetypes.md`
provides the recommended archetype mapping.

## Cross-References

- `templates/arc-archetypes.md` — authoring vocabulary and JIT
  `commitment_class -> recommended arc_archetype` mapping. The mapping is a
  default, not a closed value set.
- `references/phase-2-generation-seeds.md` — downstream consumer of this
  diagnosis matrix. Its SPEC-21 arc-seed rewrite is owned by
  `SPEC21SCECOM-004`.
- `archive/specs/SPEC-22-scene-commitment-arc-engine-and-cross-skill.md` — Track 3
  owns `COMMITMENT_CLASSES` and the initial recommended `ARC_ARCHETYPES`; Track 4 owns RSP card
  targeting fields.

## Output

The output is the structured `diagnosis_matrix`. It feeds Phase 2 seed
selection and should be retained in the operator's working notes or batch
manifest rationale when it explains why a seed target was chosen. It does not
write story records, mutate world canon, allocate ids, or authorize a HARD-GATE
write.
