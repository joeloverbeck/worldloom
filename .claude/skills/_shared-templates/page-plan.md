<!--
This is the canonical comprehensive plan template for branching-story page rendering.

Consumers:
- branching-story-bootstrap Phase 7 (LLM prompt assembly; selected_arc_id == null shape)
- branching-story-page-cycle Phase 7 (LLM prompt assembly; selected_arc_id != null shape)
- Phase 7.5 declared-affordance validation (deterministic frontmatter read)
- branching-story-page-prose-finalize Phase 1 (plan/prose pairing; reads state_hash_at_plan_time)
- External prose renderer (reads §1-§19 of the markdown body as the prompt)

The plan IS the prompt. The external renderer reads ONLY this file (§1-§19 of the markdown body).
§2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-time instruction block) are
inlined verbatim from `reports/prose-quality-instructions.md`, which is the upstream canonical
source for those three sections; the report is NOT concatenated at render time.
Every record id referenced in any plan section MUST be inlined verbatim in that section.

Authoring rule: when in doubt, include more rather than less. The plan is the only context the renderer
gets. Verbosity is a feature, not a defect.
-->

---
plan_id: PG-NNNN
story_id: STORY-NNNN
world_slug: <slug>
story_slug: <slug>
parent_page_id: PG-NNNN | null
branch_id: BR-NNNN
branch_path: [PG-NNNN, ...]
state_hash_at_plan_time: <hash>
canon_revision_at_plan_time: <revision>
prose_status: pending  # pending | rendered | superseded
plan_authored_at: <iso8601>
plan_authored_by: branching-story-bootstrap | branching-story-page-cycle
selected_arc_id: SLT-NNNN | null  # null for bootstrap PG-0001 scene-setter root case
chosen_variant_id: <variant-id> | null  # null when selected_arc_id is null
required_effects: [...]  # variant.required_effects[] copied for engine readback; empty array when selected_arc_id is null
declared_visible_affordances:
  - affordance_text: "<short description>"
    affordance_type: actor | object | location | exit | tension | question
    mapped_state_id: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | OBL-NNNN | THR-NNNN | M-NNNN
    grounding_source: cast_present | objects_in_scope | accessible_locations | obligations_open | threads_active | mysteries_in_play
declared_intended_beats:
  - beat_function: <e.g., "establish entry pressure" | "first commitment surface" | ...>
    scene_movement_summary: "<one-sentence summary of what changes in this beat>"
declared_stop_condition:
  exit_class: normal | terminal | interrupt
  exit_signal: "<one-sentence narrative cue that fires the stop>"
forbidden_resolutions: [M-NNNN, ...]  # carried forward from mysteries_in_play with status=forbidden
forbidden_engine_vocabulary:
  - CF-NNNN
  - CH-NNNN
  - CHAR-NNNN
  - DA-NNNN
  - SF-NNNN
  - OBL-NNNN
  - THR-NNNN
  - SREL-NNNN
  - STINT-NNNN
  - SE-NNNN
  - SLT-NNNN
  - CHC-NNNN
  - PG-NNNN
  - BR-NNNN
  - STLOC-NNNN
  - STOBJ-NNNN
  - STENT-NNNN
  - ARCTRACE-NNNN
  - INV-N
  - ONT-N
  - CAU-N
  - SOC-N
  - AES-N
  - DIS-N
  - M-NNNN
  - OQ-NNNN
  - ENT-NNNN
  - SEC-*
deferred_validation_trace:
  prose_ledger_consistency: "DEFERRED — awaiting prose render"
  arc_trace_evidence_alignment: "DEFERRED — awaiting prose render"
  prose_critic_8_axis: "DEFERRED — awaiting prose render"
---

## §1 How to use this plan

This file is the comprehensive prompt for rendering page <PG-NNNN>. Send §1 through §19 of this
file's body verbatim as the user-facing prompt to your prose renderer (manual or external LLM).
The plan is self-contained — §2 (Content Policy), §3 (Prose Craft Contract), and §19 (Render-time
instruction block) are inlined verbatim from `reports/prose-quality-instructions.md`, which is the
upstream canonical source. Do not concatenate the report at render time; doing so duplicates these
sections.

Output: continuous fiction prose only. No headers, no commentary, no engine vocabulary, no analysis.
Save the rendered prose to `pages-prose/PG-NNNN.md` (a plain markdown file with prose text only;
no frontmatter), then run `branching-story-page-prose-finalize` to validate and merge.

## §2 Content Policy

<!-- INLINE: verbatim from .claude/skills/branching-story-page-cycle/templates/content-policy.txt -->

## §3 Prose Craft Contract

<!-- INLINE: verbatim from .claude/skills/branching-story-page-cycle/references/prose-craft-contract.md -->

## §4 Story kernel context

<!-- INLINE: premise + designing principle + central dramatic question + tone constraints + themes
     + content_intensity_baseline + POV mode + language_register hints from STORY_KERNEL.md -->

## §5 World canon snapshot relevant to this scene

<!-- INLINE: every CF touching cast/location/period as full record body (statement + level + mode
     + scope + invariants_supported). Generate by greedy expansion of state_snapshot.objective_facts[]
     plus their derived_from_cf resolution. Do NOT reference by CF-NNNN alone. -->

## §6 World invariants in play

<!-- INLINE: every INV referenced by an active obligation, thread, or cast intention, with full
     break_conditions[]. Do NOT reference by ONT-N / CAU-N / SOC-N / AES-N / DIS-N alone. -->

## §7 Mysteries in play (firewall posture)

<!-- INLINE: every M-NNNN with status and forbidden_resolutions[]. Mark which mysteries the
     renderer must NOT resolve in this page. -->

## §8 Cast in this scene

<!-- For each STENT in cast_present, INLINE in this order:
     - World-level CHAR dossier verbatim (essence, niche, voice signature, relationships, visible/hidden traits)
       when world_character_id is set;
     - Story-local STENT record (role_in_story, current narrative function);
     - Current STINT (goals, fears, current_pressure, beliefs, emotional_state);
     - Relevant SREL records (axes between this character and other cast in scene). -->

## §9 Story-local facts visible in this scene

<!-- INLINE: every SF in state_snapshot filtered by POV-accessibility, with epistemic_class,
     certainty, known_by[], derived_from_cf if applicable. -->

## §10 Open obligations

<!-- INLINE: every OBL in obligations_open with salience, urgency, who owes whom, payoff_modes[],
     age, consequence_on_neglect. -->

## §11 Active threads

<!-- INLINE: every THR in threads_active with status, current_pressure, type. -->

## §12 Pending consequences

<!-- INLINE: every CNSQ in consequences_pending with required_aftermath_text, urgency, source SE. -->

## §13 Locations & objects in scope

<!-- INLINE: current_location, accessible_locations, objects_in_scope, inventory_by_entity.
     STLOC and STOBJ records inlined verbatim. -->

## §14 Recent prose continuity along this branch

<!-- INLINE: rendered prose along branch_path (NOT sibling branches), using the following rule: always
     inline the immediate parent's pages-prose/PG-*.md when parent_page_id != null; additionally inline
     the grandparent's rendered prose when the branch has exactly 2 prior pages (i.e., the current page
     is PG-0003 on a continuation branch with no fork); for deeper branches (3+ prior pages), default to
     parent-only unless the grandparent's content is specifically cited in §17 governor nudge or §18
     scene direction as load-bearing for the current arc's beat plan or substrate-rotation discipline
     (e.g., a sensory anchor introduced two pages ago that this page must rotate off). Mark: "for
     continuity ONLY; do NOT reuse phrasings, metaphor tokens, or specific concrete anchors verbatim."

     PRE-FLIGHT GUARANTEE: page-cycle aborts when parent.prose_status != "rendered", so this section
     always has rendered prose to inline (except for the bootstrap PG-0001 case, which has no parent —
     in that case this section reads "(no prior prose; this is the root page)"). -->

## §15 Selected scene-commitment arc

<!-- CONDITIONAL: present when frontmatter selected_arc_id != null. -->

<!-- INLINE: full SLT-NNNN arc record (arc_contract, dramatic_unit, beat_plan with min/max/beat-functions,
     execution_envelope, stop_policy.normal_exits, effect_model.variants[]). -->

## §15-alt Entry pressure framing

<!-- CONDITIONAL: present when frontmatter selected_arc_id == null (bootstrap PG-0001 root case);
     replaces §15 and §16. -->

<!-- INLINE: STORY_KERNEL.central_dramatic_question + Phase 5 initial obligations + Phase 5 initial
     threads + Phase 4 mysteries_in_play + summary of seed-pool's available commitment_class[]
     affordances (without selecting one). -->

## §16 Chosen variant for this turn

<!-- CONDITIONAL: present when frontmatter chosen_variant_id != null. -->

<!-- INLINE: chosen variant id + variant.required_effects[] verbatim. Mark: "the prose must realize
     these as scene consequences, not as ledger jargon." -->

## §17 Governor nudge

<!-- INLINE: per-turn homeostat signal from Phase 6 narrative governor (e.g., "obligation density
     is high; favor reflection cadence over action"). One short paragraph. -->

## §18 Scene direction

<!-- AUTHOR-WRITTEN, not record-inlined. Six fields:

ENTRY PRESSURE: <one-paragraph framing of what the scene opens with>

SCENE QUESTION: <the dramatic question this page answers>

VALUE DELTA TARGET: <what shifts by page end (positive/negative/complicated)>

REQUIRED TURN: <one-sentence binding outcome the page MUST end with — e.g., "Iker takes the
envelope but does not open it">

STOPPING POINT: <one-sentence narrative cue at which the page ends — e.g., "End when Mara
notices that Iker recognized the handwriting">

DO NOT REVEAL:
- <list of M-NNNN forbidden resolutions, with one-line summary of what each forbids>
- engine vocabulary tokens (frontmatter forbidden_engine_vocabulary list) -->

## §19 Render-time instruction block

<!-- INLINE: the literal LLM-facing instruction from
     reports/prose-quality-instructions.md §"Render-Time Instruction Template".
     This is the last section of the plan; the renderer reads §1-§19 in order. -->
