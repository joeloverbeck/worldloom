<!--
STORY_KERNEL.md template — used by branching-story-bootstrap Phase 11 step 2.

The frontmatter is the machine-readable state-of-record for the story bundle.
The body is the human-readable companion that mirrors the frontmatter and
embeds the content_policy block verbatim (NC-21 — never edit, never paraphrase).

Required: every frontmatter field below must be populated before write. Body
sections are required in the order shown.
-->

---
story_id: STORY-NNNN                     # allocated at Pre-flight
world_slug: <world-slug>
story_slug: <story-slug>
created_at: <iso8601>
intended_scale: one_shot                 # one_shot | chapter | arc | open_ended
pov_mode: single                         # single | rotating | omniscient
content_intensity_baseline: mature       # tame | mature | explicit
execution_mode_default: authoring        # authoring | interactive_runtime | batch_generation

cadence_policy:                          # optional per-bundle defaults; omit block to use these values
  max_arcs_without_menu_soft: 2           # arc-units only; not a word-count budget
  max_arcs_without_player_commitment_soft: 4
  allow_continue_only_pages: true
  force_menu_only_on_interrupt_hinge: false

menu_policy:                             # optional per-bundle defaults; omit block to use these values
  min_distinct_commitments: 2
  max_displayed_choices: 4
  require_likely_effects: true
  require_strong_axis_difference: true
  require_choice_worthiness: true

cast_bind_list:
  - char_id: CHAR-NNNN
    stent_id: STENT-NNNN
    role_in_story: protagonist           # protagonist | major | supporting | antagonist | foil
  - char_id: null                        # null for story-only STENTs (named cast not in world canon — see SKILL.md §Phase 2 §Story-only entities)
    stent_id: STENT-NNNN
    role_in_story: supporting

mysteries_in_play:                       # populated by Phase 4 — Rule 7 firewall surface
  - id: M-N
    status: passive                      # passive | active | forbidden
    future_resolution_safety: medium     # none (forbidden) | low | medium | high
    domain_overlap: <one-line reason this M is in play>

invariants_acknowledged:                 # populated by Phase 4 — Rule 4 anchor
  - INV-id
  - INV-id

audited_thread_obligation_sketch:        # required for new bootstraps — Phase 4 Rule 4 anchor used by Phase 9 gate 2
  - id: THR-NNNN                         # provisional ids allowed until Phase 5 emits final THR/OBL records
    type: <thread-type>
    salience: <0..10>
    urgency: <0..10>
    payoff_modes_sketch:
      - <mode>
      - <mode>
    INV_branches_audited:
      - INV-id

central_dramatic_question: ""            # optional — leave empty if not all stories have a single Q
themes:
  - <tag>
language_register: <register hints>      # optional — describe the SUBSTRATE the
                                          # character's vocabulary draws from
                                          # (profession, class, formative reading,
                                          # regional speech), NOT a checklist of
                                          # idiom-types or metaphor categories to
                                          # deploy each page. Per-page voice should
                                          # vary WITHIN the substrate; listing
                                          # categories ("X-idiom, Y-metaphors,
                                          # Z-vocabulary") produces tic-language
                                          # across pages. See branching-story-
                                          # page-cycle/references/prose-craft-
                                          # contract.md rule 7.

validation_trace:                        # populated by Phase 9 — every gate one-line PASS rationale
  gate_01_mystery_firewall: "PASS — <one-line rationale>"
  gate_02_invariant_compatibility: "PASS — <one-line rationale>"
  gate_03_content_policy_presence: "PASS — embedded verbatim"
  gate_04_id_uniqueness: "PASS — <one-line rationale>"
  gate_05_branch_path_consistency: "PASS — <one-line rationale>"
  gate_06_cast_intention_coverage: "PASS — <one-line rationale>"
  gate_07_obligation_salience: "PASS — <one-line rationale>"
  gate_08_epistemic_class_declared: "PASS — <one-line rationale>"
  gate_09_storylet_commitment_route_diversity: "PASS — <one-line rationale>"
  gate_10_prose_ledger_consistency: "PASS — <one-line rationale>"
  gate_11_choice_consequence_capacity: "PASS — <one-line rationale>"
  gate_12_recursive_reference_closure: "PASS — <one-line rationale>"
  gate_13_state_snapshot_integrity: "PASS — <one-line rationale>"
  gate_14_arc_envelope_conformance: "PASS — PG-0001 root special case; no arc selected"
  gate_15_effect_model_replay_safety: "PASS — PG-0001 root special case; applied_effect_variant is null"
  gate_16_arc_trace_evidence_alignment: "PASS — PG-0001 root special case; no ARC_TRACE emitted"
  gate_17_narrative_point_classification: "PASS — PG-0001 defaults to NATURAL_COMMITMENT_HINGE"
  gate_18_choice_worthiness_completeness: "PASS — <one-line rationale>"
  gate_19_plan_completeness_check: "PASS — <one-line rationale>"
  gate_20_cast_material_reality_consistency: "PASS — <one-line rationale>"

discipline_validation_trace:             # populated by Phase 9.5 — every discipline check one-line PASS rationale
  discipline_check_01_choice_contract_completeness: "PASS — <one-line rationale>"
  discipline_check_02_stent_role_in_story_enum: "PASS — <one-line rationale>"
  discipline_check_03_stint_structural_completeness: "PASS — <one-line rationale>"
  discipline_check_04_thr_type_enum: "PASS — <one-line rationale>"
  discipline_check_05_srel_relation_type_populated: "PASS — <one-line rationale>"
  discipline_check_06_sf_reader_visibility_basis: "PASS — <one-line rationale>"
  discipline_check_07_br0001_root_invariants: "PASS — <one-line rationale>"
  discipline_check_08_obl_coverage_cache_schema: "PASS — <one-line rationale>"
  discipline_check_09_se0001_genesis_discipline: "PASS — <one-line rationale>"
  discipline_check_10_pg0001_state_snapshot_field_keys: "PASS — <one-line rationale>"
  discipline_check_11_plan_self_containment: "PASS — <one-line rationale>"

storylet_pool_summary:                   # populated by Phase 6
  # total: derived from intended_scale + complexity per references/phase-6-storylet-pool-seed.md §Computing target_pool_size; user override permitted via `storylet_pool_seed_size` argument.
  total: 10
  commitment_family_distribution:
    inquiry_discovery: 2
    care_help_protection: 4
    pressure_coercion: 2
    boundary_delay_withdrawal: 2
  commitment_class_distribution:
    ask_one_bounded_question: 2
    offer_practical_help: 2
    stay_available_without_pressure: 2
    withdraw_without_abandoning: 2
    tighten_pressure: 2
---

# STORY-NNNN — <Story Title (free-form derived from premise)>

## Premise

<The user's premise normalized to a 1-3 paragraph design brief — genre/sub-genre identity, tonal register, opening situation, implied initial threads + obligations + cast tensions + locations + period.>

## Content Policy

<!--
Embed the contents of templates/content-policy.txt VERBATIM — including the
<content_policy> open and close tags. This is Phase 9 gate 3's enforcement
surface. Do not paraphrase, summarize, or edit.
-->

```
<content_policy>
RATING: NC-21 (ADULTS ONLY)
NO RESTRICTIONS: ...
[full block from templates/content-policy.txt — verbatim]
</content_policy>
```

## Designing Principle

<One sentence — the story's unique unfolding process. NOT plot, NOT genre, NOT chronology. Phase 1 enforces this.>

## Tone

<Free-form prose describing tonal register beyond the genre tag.>

## POV

<Single-POV protagonist | rotating cast | omniscient narrator. Names the POV character(s) when relevant.>

## Central Dramatic Question

<Optional. Not all branching stories have a single Q. Leave blank or write "N/A — emergent" if intentional.>

## Cadence And Menu Policy

Defaults are the frontmatter values shown in `cadence_policy` and `menu_policy`.
These blocks live on STORY_KERNEL.md, not on individual arcs, because they
describe per-bundle authorial taste rather than per-arc structure. Pacing is
expressed in arc-units only; do not add word-count fields to `cadence_policy`.

## Cast

<For each STENT in cast_bind_list, one bullet:>

- **<name> (<STENT-NNNN> ← <CHAR-NNNN>)** — `<role_in_story>` — <one-line current situation drawn from the dossier's Goals and Pressures + the premise>.

## Mysteries In Play

<Same content as frontmatter `mysteries_in_play[]`, restated for human readers with one-line `domain_overlap` rationales each.>

| M | Status | Resolution safety | Why in play |
|---|---|---|---|
| M-N | passive | medium | <one-line domain overlap> |

## Invariants Acknowledged

<List of INV ids the story respects. Phase 4 Invariant Audit enforces this.>

- ONT-N — <one-line reminder of the invariant the story will not violate>
- DIS-N — <one-line reminder>

## Initial Threads + Obligations

<For each THR in `_source/threads/`, one block:>

### THR-NNNN: <title> (`<type>`, current_pressure: <0..10>)

- **Owner cast**: <STENT-NNNN, STENT-NNNN>
- **Initial obligations**:
  - **OBL-NNNN** — `<type>` — salience <0..10>, urgency <0..10>, payoff_modes: [<mode>, <mode>]
  - **OBL-NNNN** — `<type>` — salience <0..10>, urgency <0..10>, payoff_modes: [<mode>, <mode>]

## Storylet Pool Summary

<Compact summary mirrored from frontmatter `storylet_pool_summary`. Phase 9 gate 9 enforces commitment_family / commitment_class diversity. Every seed SLT is `shape: scene_commitment_arc`; shape distribution is not a diversity axis.>

| Commitment class | Count |
|---|---|
| ask_one_bounded_question | <count> |
| offer_practical_help | <count> |
| stay_available_without_pressure | <count> |
| withdraw_without_abandoning | <count> |
| tighten_pressure | <count> |

## Validation Trace

<Same content as frontmatter `validation_trace`, restated for human readers as a numbered list of gate names + PASS rationales.>

1. **Mystery firewall (gate 1)**: PASS — <rationale>
2. **Invariant compatibility (gate 2)**: PASS — <rationale>
3. ...
12. **Recursive reference closure (gate 12)**: PASS — <rationale>
13. **State_snapshot integrity (gate 13)**: PASS — <rationale>
14. **Arc envelope conformance (gate 14)**: PASS — PG-0001 root special case; no arc selected
15. **Effect model replay safety (gate 15)**: PASS — PG-0001 root special case; applied_effect_variant is null
16. **Arc trace evidence alignment (gate 16)**: PASS — PG-0001 root special case; no ARC_TRACE emitted
17. **Narrative point classification (gate 17)**: PASS — PG-0001 defaults to NATURAL_COMMITMENT_HINGE
18. **Choice worthiness completeness (gate 18)**: PASS — <rationale>
19. **Plan completeness check (gate 19)**: PASS — <rationale>
20. **Cast Material Reality consistency (gate 20)**: PASS — <rationale>

## Discipline Validation Trace

<Same content as frontmatter `discipline_validation_trace`, restated for human readers as a numbered list of Phase 9.5 discipline-check names + PASS rationales.>

1. **Choice contract completeness (discipline check 1)**: PASS — <rationale>
2. **STENT role_in_story enum (discipline check 2)**: PASS — <rationale>
3. ...
10. **PG-0001 state_snapshot field-key completeness (discipline check 10)**: PASS — <rationale>
11. **Plan self containment (discipline check 11)**: PASS — <rationale>
