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
  gate_09_storylet_diversity: "PASS — <one-line rationale>"
  gate_10_prose_ledger_consistency: "PASS — <one-line rationale>"
  gate_11_choice_consequence_capacity: "PASS — <one-line rationale>"
  gate_12_state_snapshot_completeness: "PASS — <one-line rationale>"

storylet_pool_summary:                   # populated by Phase 6
  total: 20
  shape_distribution:
    entry_pressure: 4
    cast_introduction: 2
    threat_escalation: 3
    relational_dynamics: 4
    routine_disruption: 3
    aftermath_sequel: 2
    reflection_dilemma: 2
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

<Compact summary mirrored from frontmatter `storylet_pool_summary`. Phase 9 gate 9 enforces ≥5 distinct shapes covered.>

| Shape | Count |
|---|---|
| entry_pressure | <count> |
| cast_introduction | <count> |
| threat_escalation | <count> |
| relational_dynamics | <count> |
| routine_disruption | <count> |
| aftermath_sequel | <count> |
| reflection_dilemma | <count> |

## Validation Trace

<Same content as frontmatter `validation_trace`, restated for human readers as a numbered list of gate names + PASS rationales.>

1. **Mystery firewall (gate 1)**: PASS — <rationale>
2. **Invariant compatibility (gate 2)**: PASS — <rationale>
3. ...
12. **State_snapshot completeness (gate 12)**: PASS — <rationale>
