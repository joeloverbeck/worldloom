# Phase 7: Multi-Beat Arc Plan Authoring

Reference for `branching-story-page-cycle` Phase 7 — the LLM plan-authoring phase that populates the canonical comprehensive plan template (`.claude/skills/_shared-templates/page-plan.md`) for the next page in the `selected_arc_id != null` shape, runs the deterministic post-LLM plan-completeness check, and emits the PG record into the working buffer with the new schema fields. The rendered prose is produced externally (manual author or external LLM renderer) after bundle commit and merged back via `branching-story-page-prose-finalize`.

Phase 7 produces a plan; it does NOT render prose. The 8-axis post-render prose critic and ARC_TRACE Layer 2 / Layer 3 are absent from this phase — both run in `branching-story-page-prose-finalize` against user-supplied rendered prose.

---

## Selected-arc mode for non-root pages

Unlike bootstrap PG-0001 (scene-setter, no SLT), every page-cycle turn realizes a Phase-4-selected scene-commitment arc. The plan's frontmatter carries:

- `selected_arc_id: SLT-NNNN` — the arc chosen at Phase 4.
- `chosen_variant_id: <variant id>` — the variant selected at Phase 4b.
- `required_effects: [...]` — the chosen variant's `required_effects[]` array copied verbatim for engine readback at finalize time.

In the plan body, **§15 (Selected scene-commitment arc) is REQUIRED** and inlines the SLT id plus the prose-direction translation of the Phase-4-selected SLT-NNNN record: `notes`, `arc_contract.user_intent`, `dramatic_unit.scene_question`, `dramatic_unit.natural_close_definition`, and `beat_plan.beats[].function` paraphrased as prose direction. Engine-only SLT fields stay on the canonical SLT record and frontmatter for validator readback. **§16 (Chosen variant for this turn) is REQUIRED** and inlines the chosen variant's `required_effects[]` verbatim. **§15-alt (Entry pressure framing) is OMITTED**.

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
[cast bound — for each STENT in cast_present, CHAR dossier projections
              (frontmatter + Material Reality + Goals and Pressures +
              Capabilities + Voice and Perception, when world_character_id set)
              + STENT record + current STINT + relevant SREL records]
[state context — current state_snapshot ledgers visible to POV: SFs (with
                 epistemic_class), open OBLs, active THRs, pending CNSQs,
                 STLOC + STOBJ in scope, cast_present, accessible_locations,
                 inventory_by_entity, entity_status]
[selected arc record — the SLT-NNNN selected at Phase 4; extract for §15 body
                       ONLY the prose-bearing fields: notes,
                       arc_contract.user_intent,
                       dramatic_unit.scene_question,
                       dramatic_unit.natural_close_definition, and
                       beat_plan.beats[].function paraphrased as prose
                       direction, NOT verbatim engine identifiers. Engine
                       fields (success_policy, allowed_outcome_band,
                       beat_plan.mode, beat_plan.beats[].state_significance /
                       realization_target, execution_envelope.*, stop_policy.*,
                       effect_model.variants[].probability_weight /
                       maps_to_outcome / forbidden_effects, mystery_safety.*,
                       exit_portfolio.*) are NOT inlined into §15 body; they
                       remain on the canonical SLT record and are
                       validator-consumed through frontmatter and engine
                       context]
[chosen variant — variant id + required_effects[] verbatim from Phase 4b]
[recent prose continuity — the last 1-2 pages of rendered prose along
                           parent.branch_path (NOT sibling branches);
                           guaranteed non-empty by the §14 hard pre-flight
                           block, which aborts when parent.prose_status
                           != "rendered"]
[governor_nudge — Phase 6 homeostat signal for this turn]
[scene direction — REQUIRED TURN, STOPPING POINT, DO NOT REVEAL
                   (the engaged-mystery posture cues from §7, not the
                   complete frontmatter forbidden_resolutions[] list; plus
                   engine-vocabulary tokens list from frontmatter)]

INSTRUCTION:
Populate the canonical plan template at .claude/skills/_shared-templates/page-plan.md
for PG-NNNN. Do NOT render prose. Do NOT produce narrative fiction. The
deliverable is the populated comprehensive plan document — a hybrid YAML
frontmatter + markdown body file that the external prose renderer will later
read in its entirety to produce pages-prose/PG-NNNN.md.

Frontmatter shape (selected-arc case):
The frontmatter required keys and their shapes are documented at
.claude/skills/_shared-templates/page-plan.md (frontmatter block). At the
page-cycle selected-arc case, populate the frontmatter exactly as the
canonical template specifies, with these selected-arc-case-specific values:
- selected_arc_id: SLT-NNNN
- chosen_variant_id: <variant id>
- required_effects: [...] (variant.required_effects verbatim)
- parent_page_id: <parent PG-NNNN>
- branch_id: <BR-NNNN — new on fork, existing logical_id on continuation>
- branch_path: <parent.branch_path + [PG-NNNN]>
- state_hash_at_plan_time: <PG-NNNN.state_hash from working buffer>
- canon_revision_at_plan_time: <PG-NNNN.state_snapshot.canon_revision>
- prose_status: pending
- deferred_validation_trace: all three keys (prose_ledger_consistency,
  arc_trace_evidence_alignment, prose_critic_8_axis) set to
  "DEFERRED — awaiting prose render"

Body shape (selected-arc case):
The body sections §1 through §19 are documented at
.claude/skills/_shared-templates/page-plan.md (markdown body). At the
page-cycle selected-arc case, populate every section per the canonical
template, with the following selected-arc-case deviations:
- §14 Recent prose continuity: inline the last 1-2 rendered pages along
  parent.branch_path verbatim; the §14 hard pre-flight block guarantees
  parent.prose_status == "rendered" so the section is always non-empty.
- §15 Selected scene-commitment arc: REQUIRED. Populate the canonical
  template's §15 prose-direction translation block: the SLT id, storylet
  notes, `arc_contract.user_intent`, `dramatic_unit.scene_question`,
  `dramatic_unit.natural_close_definition`, and prose paraphrases of the
  intended beat functions. Do NOT inline engine-only SLT schema fields
  (`success_policy`, `allowed_outcome_band`, `execution_envelope.*`,
  `stop_policy.*`, `effect_model.*`, `mystery_safety.*`, `exit_portfolio.*`).
- §15-alt Entry pressure framing: OMITTED in the selected-arc case.
- §16 Chosen variant for this turn: REQUIRED. Inline the chosen variant's
  id + variant.required_effects[] verbatim.
- §17 Governor nudge: inline the Phase 6 homeostat signal verbatim.
- §7 Mysteries in play: use the canonical template's engaged-mystery filter.
  Inline only mysteries semantically engaged by the selected storylet,
  current scene domain, in-scope CF / OBL / THR / character intention, or
  accidental-resolution risk. Mysteries declared in `mysteries_in_play[]` for
  kernel completeness but not engaged by this page remain in frontmatter when
  forbidden, not in the §7 body.
- §18 Scene direction / DO NOT REVEAL: carry the posture cues from §7's
  engaged-only mystery set; do not re-list the complete
  frontmatter.forbidden_resolutions[] array in the body.

Every record id referenced in any plan section MUST be backed by body context
in that section. Bare CF-NNNN / CHAR-NNNN / OBL-NNNN / etc. references are
plan-completeness failures (Phase 9 gate `plan_completeness_check`). §15 is
the selected-arc exception: it MUST inline the resolvable SLT id and the
prose-direction translation from the canonical template, not the full SLT
schema body.
```

LLM produces the populated plan body. Engine writes the populated plan to a working buffer (NOT to disk yet — disk write happens at Phase 11 step 2 to `pages-prose-plans/PG-NNNN.md`). **The 8-axis prose critic does not run at this phase** — there is no rendered prose to critique at plan-commit. The critic moves to `branching-story-page-prose-finalize/references/phase-3-prose-critic.md`, where it runs against the user-supplied rendered prose at `pages-prose/PG-NNNN.md`.

---

## Plan-completeness post-LLM check (deterministic)

Phase 7's post-LLM check is structural, not stylistic:

- Every required plan section (§1-§14, §15, §16, §17-§19 in the selected-arc case; §15-alt explicitly omitted) is populated with non-placeholder text.
- Every inlined record id (CF-NNNN, CHAR-NNNN, SF-NNNN, OBL-NNNN, THR-NNNN, SREL-NNNN, STINT-NNNN, STLOC-NNNN, STOBJ-NNNN, M-NNNN, INV-id, SLT-NNNN) resolves against the current world index or story-bundle working buffer. For §15, the SLT id must resolve, but the body carries the prose-direction translation rather than the full SLT schema body.
- Frontmatter required keys are present and well-formed (`plan_id`, `story_id`, `world_slug`, `story_slug`, `parent_page_id`, `branch_id`, `branch_path`, `state_hash_at_plan_time`, `canon_revision_at_plan_time`, `prose_status`, `plan_authored_at`, `plan_authored_by`, `selected_arc_id`, `chosen_variant_id`, `required_effects`, `declared_visible_affordances`, `declared_intended_beats`, `declared_stop_condition`, `forbidden_resolutions`, `forbidden_engine_vocabulary`, `deferred_validation_trace`).
- `selected_arc_id` matches the Phase-4-selected arc; `chosen_variant_id` matches the Phase-4b-chosen variant; `required_effects[]` matches the chosen variant's `required_effects[]` verbatim (selected-arc case shape).
- `declared_intended_beats[]` length is within `[arc.beat_plan.min_beats, arc.beat_plan.max_beats]`.
- `forbidden_resolutions[]` carries every M-NNNN in `mysteries_in_play[]` whose `future_resolution_safety == forbidden`.
- §7 body follows the engaged-mystery filter from the canonical template:
  missing an engaged mystery is a re-prompt; including a non-engaged forbidden
  mystery is a re-prompt to remove the body entry while preserving the
  frontmatter `forbidden_resolutions[]` list.
- `deferred_validation_trace` has all three required keys (`prose_ledger_consistency`, `arc_trace_evidence_alignment`, `prose_critic_8_axis`) set to DEFERRED strings.
- `cast_material_reality_consistency` scans each `frontmatter.declared_visible_affordances[]` entry mapped to a `STENT-NNNN` cast member and each §8 cast-block "Current intentions" paragraph for that same STENT. It uses the closed vocabulary at `.claude/skills/_shared-templates/clothing-consistency-vocabulary.md`; detected garment-kind tokens must be grounded in the cast member's projected `body.Material Reality` clothing / possessions summary, and detected posture tokens must not contradict the projected physical condition. FAIL re-prompts Phase 7 with the offending affordance or intention prose, the matched token, and the exact Material Reality summary inlined as correction context.

Any missing/malformed section or cast Material Reality contradiction fails the post-LLM check and re-prompts Phase 7. Up to 3 re-prompts share the existing Phase 7 budget; if exhausted, escalate to the user with the unmapped failures inlined.

---

## Emit PG-NNNN record into working buffer

Page-cycle runtime PG schema. The schema fields carry the plan-vs-prose split:

- **Prose plan path (always)**: `prose_plan_path: pages-prose-plans/PG-NNNN.md`.
- **Prose path (deferred to finalize)**: `prose_path: null` at plan-commit; finalize sets this to `pages-prose/PG-NNNN.md`.
- **Prose status (transitional state)**: `prose_status: pending` at plan-commit; finalize flips to `rendered`.
- **Deferred validation trace**: `deferred_validation_trace.{prose_ledger_consistency, arc_trace_evidence_alignment, prose_critic_8_axis}` all set to `"DEFERRED — awaiting prose render"` at plan-commit; finalize Phase 5 flips each to PASS/FAIL.
- **ARC_TRACE fields**: `state_snapshot.arc_trace_id: null`, `state_snapshot.arc_trace_emitted: false` at plan-commit. Finalize Phase 4 emits the ARCTRACE record and finalize Phase 7 updates these fields via `update_record_field` ops.

All other PG fields (identity / branch wiring, storylet_realized, applied_event_ops, state_hash, state_snapshot ledgers, narrative_health, governor_nudge_applied, content_intensity, validation_trace) follow the runtime schema in `references/record-schemas.md`.

---

## Cross-references

- Canonical plan template (`.claude/skills/_shared-templates/page-plan.md`) — single source of truth for §1-§19 body and frontmatter shape; this reference describes the page-cycle selected-arc-case delta only.
- Declared-affordance validator (Phase 7.5): `references/phase-7-5-visible-affordance-extraction.md`
- ARC_TRACE Layer 1 only at plan-commit (Phase 7.6): `references/phase-7-6-arc-trace-extraction.md`
- Phase 9 gate table (including DEFERRED rows, `plan_completeness_check`, and `cast_material_reality_consistency`): `references/phase-9-validation-gates.md`
- §14 hard pre-flight block (parent.prose_status check): `references/pre-flight-and-prerequisites.md`
- Convergence point — rendered prose validators + ARC_TRACE Layer 2/3 extraction + PG.prose_status flip: `.claude/skills/branching-story-page-prose-finalize/SKILL.md`
- 8-axis prose critic (moved out of Phase 7): `.claude/skills/branching-story-page-prose-finalize/references/phase-3-prose-critic.md`
- ARC_TRACE Layer 2 / Layer 3 (moved out of Phase 7.6): `.claude/skills/branching-story-page-prose-finalize/references/phase-4-arc-trace-extraction.md`
- Render-time instruction block (inlined verbatim into plan §19): `reports/prose-quality-instructions.md` §"Render-Time Instruction Template"
