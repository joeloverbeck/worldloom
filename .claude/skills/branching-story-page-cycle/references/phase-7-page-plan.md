# Phase 7: Multi-Beat Arc Plan Authoring

Reference for `branching-story-page-cycle` Phase 7 — the LLM plan-authoring phase that populates the canonical comprehensive plan template (`.claude/skills/_shared-templates/page-plan.md`) for the next page in the `selected_arc_id != null` shape, runs the deterministic post-LLM plan-completeness check, and emits the PG record into the working buffer with the new schema fields. The rendered prose is produced externally (manual author or external LLM renderer) after bundle commit and merged back via `branching-story-page-prose-finalize`.

Phase 7 produces a plan; it does NOT render prose. The 8-axis post-render prose critic and ARC_TRACE Layer 2 / Layer 3 are absent from this phase — both run in `branching-story-page-prose-finalize` against user-supplied rendered prose.

---

## Selected-arc mode for non-root pages

Unlike bootstrap PG-0001 (scene-setter, no SLT), every page-cycle turn realizes a Phase-4-selected scene-commitment arc. The plan's frontmatter carries:

- `selected_arc_id: SLT-NNNN` — the arc chosen at Phase 4.
- `chosen_variant_id: <variant id>` — the variant selected at Phase 4b.
- `required_effects: [...]` — the chosen variant's `required_effects[]` array copied verbatim for engine readback at finalize time.

In the plan body, **§15 (Selected scene-commitment arc) is REQUIRED** and inlines the full SLT-NNNN record (arc_contract, dramatic_unit, beat_plan with min/max/beat-functions, execution_envelope, stop_policy.normal_exits, effect_model.variants[]). **§16 (Chosen variant for this turn) is REQUIRED** and inlines the chosen variant's `required_effects[]` verbatim. **§15-alt (Entry pressure framing) is OMITTED**.

`declared_intended_beats[]` is populated as concrete scene-movement beats realizing the selected arc's `beat_plan` — one entry per intended beat, each carrying `beat_function` (drawn from the arc's `beat_plan.beat_functions`) and a one-sentence `scene_movement_summary` describing what changes in that beat. The Phase 7.6 Layer 1 deterministic check validates this array's length against `arc.beat_plan.min_beats` / `max_beats`.

---

## Plan authoring — populate the canonical template

Phase 7's deliverable is a populated copy of the canonical plan template at `.claude/skills/_shared-templates/page-plan.md`, written into the working buffer (NOT to disk yet — disk write happens at Phase 11 step 2 to `pages-prose-plans/PG-NNNN.md`). The plan IS the prompt: the external prose renderer reads §1-§19 of the body verbatim. Verbosity is a feature, not a defect — when in doubt, inline more rather than less.

### LLM prompt assembly for plan authoring

Order matters; content_policy is FIRST so it binds the model before any other instruction. The instruction is to **populate the plan template body**, not to generate prose:

```
[content_policy block — verbatim from templates/content-policy.txt]
[story kernel — premise + designing_principle + tone + content_intensity_baseline
                + POV + central dramatic question + invariants_acknowledged
                + mysteries_in_play]
[PROSE CRAFT CONTRACT — verbatim from references/prose-craft-contract.md]
[cast bound — for each STENT in cast_present, full CHAR dossier (when
              world_character_id set) + STENT record + current STINT
              + relevant SREL records]
[state context — current state_snapshot ledgers visible to POV: SFs (with
                 epistemic_class), open OBLs, active THRs, pending CNSQs,
                 STLOC + STOBJ in scope, cast_present, accessible_locations,
                 inventory_by_entity, entity_status]
[selected arc record — the full SLT-NNNN selected at Phase 4: arc_contract,
                       dramatic_unit, beat_plan, execution_envelope,
                       stop_policy.normal_exits, effect_model.variants[]]
[chosen variant — variant id + required_effects[] verbatim from Phase 4b]
[recent prose continuity — the last 1-2 pages of rendered prose along
                           parent.branch_path (NOT sibling branches);
                           guaranteed non-empty by the §14 hard pre-flight
                           block, which aborts when parent.prose_status
                           != "rendered"]
[governor_nudge — Phase 6 homeostat signal for this turn]
[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL
                   (the M-NNNN forbidden list and engine-vocabulary tokens
                   list from frontmatter)]

INSTRUCTION:
Populate the canonical plan template at .claude/skills/_shared-templates/page-plan.md
for PG-NNNN. Do NOT render prose. Do NOT produce narrative fiction. The
deliverable is the populated comprehensive plan document — a hybrid YAML
frontmatter + markdown body file that the external prose renderer will later
read in its entirety to produce pages-prose/PG-NNNN.md.

Frontmatter shape (selected-arc case):
- plan_id: PG-NNNN
- story_id: STORY-NNNN
- world_slug / story_slug from arguments
- parent_page_id: <parent PG-NNNN>
- branch_id: <BR-NNNN — new on fork, existing logical_id on continuation>
- branch_path: <parent.branch_path + [PG-NNNN]>
- state_hash_at_plan_time: <PG-NNNN.state_hash from the working buffer>
- canon_revision_at_plan_time: <PG-NNNN.state_snapshot.canon_revision>
- prose_status: pending
- plan_authored_at: <iso8601 now>
- plan_authored_by: branching-story-page-cycle
- selected_arc_id: SLT-NNNN            # selected-arc case — non-null
- chosen_variant_id: <variant id>      # selected-arc case — non-null
- required_effects: [...]              # chosen variant's required_effects[] verbatim
- declared_visible_affordances: [...]  # one entry per visually salient
                                        # element the plan intends the prose
                                        # to anchor on; each entry MUST carry
                                        # affordance_text, affordance_type,
                                        # mapped_state_id, grounding_source
                                        # — see Phase 7.5 for the validator
- declared_intended_beats: [...]       # one entry per intended beat, count
                                        # within [arc.beat_plan.min_beats,
                                        # arc.beat_plan.max_beats]
- declared_stop_condition:
    exit_class: normal | terminal | interrupt
    exit_signal: "<one-sentence narrative cue that fires the stop>"
- forbidden_resolutions: [<every M-NNNN in mysteries_in_play[] whose
                            future_resolution_safety == forbidden>, ...]
- forbidden_engine_vocabulary: <full list per the template>
- deferred_validation_trace:
    prose_ledger_consistency: "DEFERRED — awaiting prose render"
    arc_trace_evidence_alignment: "DEFERRED — awaiting prose render"
    prose_critic_8_axis: "DEFERRED — awaiting prose render"

Body shape (selected-arc case):
- §1 How to use this plan — verbatim from template
- §2 Content Policy — inline content_policy block verbatim
- §3 Prose Craft Contract — inline prose-craft-contract.md verbatim
- §4 Story kernel context — inline premise + designing_principle + tone +
     central dramatic question + content_intensity_baseline + POV +
     language_register from STORY_KERNEL
- §5 World canon snapshot — inline every CF touching cast/location/period
     as full record body (statement + level + mode + scope +
     invariants_supported). Do NOT emit bare CF-NNNN references.
- §6 World invariants in play — inline every INV referenced by an active
     OBL/THR/STINT/SLT-precondition, with full break_conditions[].
- §7 Mysteries in play (firewall posture) — inline every M-NNNN with status
     and forbidden_resolutions[]; mark which the renderer MUST NOT resolve.
- §8 Cast in this scene — for each STENT in cast_present, inline:
     world CHAR dossier verbatim (when world_character_id set) →
     story-local STENT record → current STINT (goals/fears/beliefs/
     emotional_state/current_pressure) → relevant SREL records.
- §9 Story-local facts visible — inline every SF in state_snapshot filtered
     by POV-accessibility, with epistemic_class, certainty, known_by[],
     derived_from_cf if applicable.
- §10 Open obligations — inline every OBL in obligations_open with salience,
     urgency, owner, payoff_modes[], decay_rate.
- §11 Active threads — inline every THR in threads_active with status,
     current_pressure, type.
- §12 Pending consequences — inline every CNSQ in consequences_pending with
     required_aftermath_text, urgency, source SE. (Empty allowed when the
     parent state had no pending consequences.)
- §13 Locations & objects in scope — inline current_location,
     accessible_locations, objects_in_scope, inventory_by_entity with
     STLOC and STOBJ records inlined verbatim.
- §14 Recent prose continuity — inline verbatim the last 1-2 pages of
     pages-prose/PG-*.md along parent.branch_path (NOT sibling branches).
     The §14 hard pre-flight block guarantees this section is non-empty:
     page-cycle aborts when parent.prose_status != "rendered", so there
     is always rendered prose to inline.
- §15 Selected scene-commitment arc — REQUIRED in the selected-arc case.
     Inline the full SLT-NNNN record verbatim: arc_contract, dramatic_unit,
     beat_plan (min_beats, max_beats, beat_functions, required turn-shape
     notes), execution_envelope (invariants, required_functions,
     allowed_tactics, prohibited_actions, style_directives,
     mystery_preservation), stop_policy.normal_exits, effect_model.variants[].
- §15-alt Entry pressure framing — OMITTED in the selected-arc case.
- §16 Chosen variant — REQUIRED in the selected-arc case. Inline the chosen
     variant's id + required_effects[] verbatim, with the note: "the prose
     must realize these as scene consequences, not as ledger jargon."
- §17 Governor nudge — inline the Phase 6 homeostat signal verbatim (e.g.,
     "obligation density is high; favor reflection cadence over action").
- §18 Scene direction — AUTHOR-WRITTEN five fields:
     ENTRY PRESSURE / SCENE QUESTION / VALUE DELTA TARGET / REQUIRED TURN /
     STOPPING POINT / DO NOT REVEAL (the M-NNNN forbidden list and the
     engine-vocabulary tokens list from frontmatter).
- §19 Render-time instruction block — inline verbatim from
     reports/prose-quality-instructions.md §"Render-Time Instruction Template".

Every record id referenced in any plan section MUST be inlined verbatim in
that section. Bare CF-NNNN / CHAR-NNNN / SLT-NNNN / OBL-NNNN / etc.
references are plan-completeness failures (Phase 9 gate
`plan_completeness_check`).
```

LLM produces the populated plan body. Engine writes the populated plan to a working buffer (NOT to disk yet — disk write happens at Phase 11 step 2 to `pages-prose-plans/PG-NNNN.md`). **The 8-axis prose critic does not run at this phase** — there is no rendered prose to critique at plan-commit. The critic moves to `branching-story-page-prose-finalize/references/phase-3-prose-critic.md`, where it runs against the user-supplied rendered prose at `pages-prose/PG-NNNN.md`.

---

## Plan-completeness post-LLM check (deterministic)

Phase 7's post-LLM check is structural, not stylistic:

- Every required plan section (§1-§14, §15, §16, §17-§19 in the selected-arc case; §15-alt explicitly omitted) is populated with non-placeholder text.
- Every inlined record id (CF-NNNN, CHAR-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN, STINT-NNNN, STLOC-NNNN, STOBJ-NNNN, M-NNNN, INV-id, SLT-NNNN) resolves against the current world index or story-bundle working buffer.
- Frontmatter required keys are present and well-formed (`plan_id`, `story_id`, `world_slug`, `story_slug`, `parent_page_id`, `branch_id`, `branch_path`, `state_hash_at_plan_time`, `canon_revision_at_plan_time`, `prose_status`, `plan_authored_at`, `plan_authored_by`, `selected_arc_id`, `chosen_variant_id`, `required_effects`, `declared_visible_affordances`, `declared_intended_beats`, `declared_stop_condition`, `forbidden_resolutions`, `forbidden_engine_vocabulary`, `deferred_validation_trace`).
- `selected_arc_id` matches the Phase-4-selected arc; `chosen_variant_id` matches the Phase-4b-chosen variant; `required_effects[]` matches the chosen variant's `required_effects[]` verbatim (selected-arc case shape).
- `declared_intended_beats[]` length is within `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]`.
- `forbidden_resolutions[]` carries every M-NNNN in `mysteries_in_play[]` whose `future_resolution_safety == forbidden`.
- `deferred_validation_trace` has all three required keys (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) set to DEFERRED strings.

Any missing/malformed section fails the post-LLM check and re-prompts Phase 7. Up to 3 re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped failures inlined.

---

## Emit PG-NNNN record into working buffer

Page-cycle runtime PG schema. The new schema fields (per PROSESPLIT-002) carry the plan-vs-prose split:

- **Prose plan path (always)**: `prose_plan_path: pages-prose-plans/PG-NNNN.md`.
- **Prose path (deferred to finalize)**: `prose_path: null` at plan-commit; finalize sets this to `pages-prose/PG-NNNN.md`.
- **Prose status (transitional state)**: `prose_status: pending` at plan-commit; finalize flips to `rendered`.
- **Deferred validation trace**: `deferred_validation_trace.{prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis}` all set to `"DEFERRED — awaiting prose render"` at plan-commit; finalize Phase 5 flips each to PASS/FAIL.
- **ARC_TRACE fields**: `state_snapshot.arc_trace_id: null`, `state_snapshot.arc_trace_emitted: false` at plan-commit. Finalize Phase 4 emits the ARCTRACE record and finalize Phase 7 updates these fields via `update_record_field` ops.

All other PG fields (identity / branch wiring, storylet_realized, applied_event_ops, state_hash, state_snapshot ledgers, narrative_health, governor_nudge_applied, content_intensity, validation_trace) follow the runtime schema in `references/record-schemas.md`.

---

## Cross-references

- Canonical plan template: `.claude/skills/_shared-templates/page-plan.md`
- Declared-affordance validator (Phase 7.5): `references/phase-7-5-visible-affordance-extraction.md`
- ARC_TRACE Layer 1 only at plan-commit (Phase 7.6): `references/phase-7-6-arc-trace-extraction.md`
- Phase 9 gate table (including DEFERRED rows and `plan_completeness_check`): `references/phase-9-validation-gates.md`
- §14 hard pre-flight block (parent.prose_status check): `references/pre-flight-and-prerequisites.md`
- Convergence point — rendered prose validators + ARC_TRACE Layer 2/3 extraction + PG.prose_status flip: `.claude/skills/branching-story-page-prose-finalize/SKILL.md`
- 8-axis prose critic (moved out of Phase 7): `.claude/skills/branching-story-page-prose-finalize/references/phase-3-prose-critic.md`
- ARC_TRACE Layer 2 / Layer 3 (moved out of Phase 7.6): `.claude/skills/branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md`
- Render-time instruction block (inlined verbatim into plan §19): `reports/prose-quality-instructions.md` §"Render-Time Instruction Template"
