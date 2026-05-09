# Phase 8: Initial Choice Generation

Reference for `branching-story-bootstrap` Phase 8 — the delegated choice-surface phase that runs `branching-story-page-cycle` Phase 8 in PG-0001 special-case mode against the genesis state produced by Phases 2, 3, 5, 6, 7, and 7.5. Emits 4-6 v2 `CHC-NNNN` scene-commitment records under the choice-worthiness + consequence-capacity contract; populates `PG-0001.emitted_choices` for Phase 11.

---

Delegate to `branching-story-page-cycle` Phase 8 (Choice-Surface Gate), applying its PG-0001 special case. Bootstrap supplies `PG-0001.state_snapshot` as the current state, the Phase 7.5 Visible Affordance Map as additional anchors, and `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`.

PG-0001 has no parent arc and no ARC_TRACE because Phase 7 rendered a scene-setter. The first true arc render happens on the next page after the user picks a commitment.

Run the page-cycle Phase 8 special-case behavior:

1. **Narrative-point classification**: skipped. PG-0001 defaults to `NATURAL_COMMITMENT_HINGE` because the bootstrap root is the first commitment surface.
2. **Hybrid exit portfolio composition**: compose candidates without native seeds from a closed arc. Candidate sources are initial obligations, active threads, seed-pool arc eligibility, and the Visible Affordance Map as a grounding/prioritization source. The seed pool contributes eligible `arc_contract.commitment_class` values; it does not imply an already-closed root arc.
3. **Choice-worthiness validation**: apply normally. Every stored PG-0001 CHC must have non-empty `likely_effects`, populated `choice_worthiness`, at least one closed-enum `strong_axes` entry, and non-empty continuation capacity.
4. **Strong-axis collective difference**: apply normally. The displayed menu must collectively cover at least two distinct `choice_worthiness.strong_axes` values.
5. **Surface label rendering**: render labels from the validated CHC v2 records without adding outcome promises absent from `choice_contract`.
6. **Write-in slot**: not stored as a CHC at bootstrap. The slot is presented at runtime when the user reads PG-0001.

The legacy v1 "Required CHC diversification" and "Pair-distance discipline" subsections are superseded by the page-cycle Phase 8 choice-surface gate. Under v2, menu difference is commitment-level and strong-axis-level, not retired `choice_mode` / `poetic_effect` distribution.

---

## CHC fields

`branching-story-page-cycle` Phase 8 is the runtime authority. Stored PG-0001 CHCs are v2 scene-commitment records with at least: `record_version: 2`, `choice_kind: scene_commitment`, `commitment_class`, `strategy_cluster`, populated `choice_worthiness`, populated `choice_contract`, non-empty `likely_effects[]`, populated `continuation_capacity`, `content_intensity_implied`, and `label` (the user-facing prose).

---

## Consequence-capacity check (gate 11 backstop)

Every emitted scene-commitment CHC must populate `continuation_capacity`:

1. Compute `post_choice_delta` from the CHC's `choice_contract.minimum_state_change` plus `likely_effects`:
   - `facts_added_or_changed`: SFs whose value or `epistemic_class` would change.
   - `obligations_changed`: OBLs whose status (`open`, `paid_off`, `abandoned`, `failed`) or salience would shift.
   - `location_changed`: the new `current_location` if the CHC moves the actor; otherwise `null`.
   - `cast_present_changed`: STENTs that enter or leave `cast_present`.
   - `mystery_resolution_risk`: M-NNNN ids whose safety the post-choice prose would test.
2. For each candidate seed-pool SLT, check whether its `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` all pass under the post-choice delta. The candidate enters `valid_seed_storylets` only when all four checks pass.
3. If `valid_seed_storylets` is empty, populate `jit_shape_spec` with a one-line sketch of the scene-commitment arc the runtime would need to JIT-author through the page-cycle's `storylet-pool-authoring mode=jit` path.
4. Record `validation_basis` as a one-line rationale, for example: `hard_preconds satisfied after simulated minimum_state_change with cast_present, location, and mystery_safety updates`.

A CHC where `valid_seed_storylets` is empty and `jit_shape_spec` is null is a dead-end - halt and re-derive the choice.

Populate `PG-0001.emitted_choices` with the 4-6 CHC ids.
