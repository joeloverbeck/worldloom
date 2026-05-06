# Phase 8: Initial Choice Generation

Reference for `branching-story-bootstrap` Phase 8 — the delegated choice-production phase that runs `branching-story-page-cycle`'s Phase 8 (Amendment B Pipeline) against the genesis state produced by Phases 2, 3, 5, 6, 7, and 7.5. Emits 4-6 CHC-NNNN records under the diversification + consequence-capacity contract; populates `PG-0001.emitted_choices` for Phase 11.

---

Delegate to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline), applying the same production CHC contract to the genesis state produced by Phases 2, 3, 5, 6, 7, and 7.5. Bootstrap supplies `PG-0001.state_snapshot` as the current state, the selected root storylet's `choice_templates` as anchors, and the Phase 7.5 Visible Affordance Map as additional anchors. Diversification and consequence-capacity must consider all three input sources. Bootstrap uses `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`.

Run the six page-cycle Phase 8 steps in order:

1. Affordance Space Collection over `PG-0001.state_snapshot`.
2. Salient-Affordance Shortlist + LLM Proposer, with the selected root storylet's `choice_templates` as anchors.
3. Engine Validation Pass.
4. Diversification + Scoring.
5. Surface Label Rendering.
6. Runtime write-in slot N+1 (not stored as CHC at bootstrap).

---

## Required CHC diversification

Emit 4-6 `CHC-NNNN` records into `_source/choices/`. Required diversification:

- one choice that engages the **main thread** directly
- one choice that engages a **relationship**
- one choice that addresses a specific **OBL** (typically a high-urgency one)
- one choice that explores a **less-obvious path** (low-obvious-payoff but high agency)
- one or two **diversification** slots
- if the Visible Affordance Map contains a grounded affordance that none of the existing 4-6 CHCs engage, prefer a CHC anchored on that affordance over a fully storylet-template-driven choice
- at least 3 distinct `choice_mode` values
- at least 3 distinct `poetic_effect` values
- across the set, engage at least 60% of currently open high-salience OBLs (salience ≥ 7) when at least 2 such OBLs exist; when only 1 high-salience OBL exists it must be engaged by ≥1 CHC; when 0 high-salience OBLs exist this requirement is vacuous

Affordance-anchored CHCs still satisfy the diversification and consequence-capacity gates; they are not exempt from any Phase 8 or Phase 9 check.

## Pair-distance discipline

In addition to the diversification list above, every pair of emitted CHCs must differ on at least 2 of the following 8 axes, with at least 1 difference from structural axes 1-6:

1. `operation` (the canonical verb from Phase 8 affordance vocabulary)
2. `actor` (the STENT performing the action)
3. `target` (the STENT / STOBJ / STLOC / abstract being acted upon)
4. `uses_fact` (the SF the choice leverages, if any)
5. `choice_contract.minimum_state_change` set (compare the contained `{fact, obligation, consequence, relationship, intention, thread, location, cast, terminality}` sub-types; two CHCs that both change `fact` and `obligation` are equivalent on this axis, while different sub-types are distinct)
6. `choice_contract.success_policy` (`guaranteed | attempted | uncertain | opposed`)
7. `choice_mode` (the modal label)
8. `poetic_effect` (the affective register)

Two CHCs that differ only in `choice_mode` and `poetic_effect` are operational cosmetic variants even though they differ on 2 total axes. Fail Phase 8, halt, and re-derive the more cosmetically similar of the pair. The check is mechanical: read the in-memory CHC records, compute pairwise axis differences, and reject any pair that has fewer than 2 total differences or has no structural-axis difference.

### Why pair-distance and not set-diversification

The diversification list above ensures the set covers thread / relationship / OBL / less-obvious / mode / poetic axes. The pair-distance rule ensures no two members of the set are cosmetic variants of each other - the set's coverage is real, not lip service.

### Worked counterexample

"Question the guard about the magistrate's whereabouts" vs "Press the guard about who he saw last night":

- operation: `investigate` / `investigate` (same)
- actor: `STENT-0001` / `STENT-0001` (same)
- target: `STENT-0007` / `STENT-0007` (same)
- uses_fact: `null` / `null` (same)
- minimum_state_change: `{fact}` / `{fact}` (same)
- success_policy: `attempted` / `attempted` (same)
- choice_mode: `investigative` / `pressure_management` (different)
- poetic_effect: `obvious` / `dilemma` (different)

This differs on 2 of 8 axes, but both differences are label axes and neither is a structural-axis difference. It fails Phase 8 as a framing variant of the same operational choice. Re-deriving one CHC with a different `actor` (for example, the ally confronts the guard instead of the protagonist), `target` (a different witness), or `minimum_state_change` (for example, adding a `relationship` change alongside a `fact` change) lifts the pair into clear operational distinction.

The write-in slot is N+1 (handled by the runtime, not stored as CHC at bootstrap).

---

## CHC fields

Page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` Phase 8 step 5 is the runtime authority: `id`, `story_id`, `emitted_at_page: PG-0001`, `created_at_page: PG-0001`, `operation`, `actor`, `target`, `uses_fact`, `choice_contract` (`user_intent`, `guaranteed_action`, `success_policy`, `allowed_outcome_band`, `forbidden_outcomes`, `minimum_state_change`), `likely_effects[]`, `choice_mode`, `poetic_effect`, `content_intensity_implied`, and `label` (the user-facing prose).

---

## Consequence-capacity check (gate 11 backstop)

Every emitted CHC must populate `continuation_capacity`:

1. Compute `post_choice_delta` from the CHC's `choice_contract.minimum_state_change` plus `likely_effects`:
   - `facts_added_or_changed`: SFs whose value or `epistemic_class` would change.
   - `obligations_changed`: OBLs whose status (`open`, `paid_off`, `abandoned`, `failed`) or salience would shift.
   - `location_changed`: the new `current_location` if the CHC moves the actor; otherwise `null`.
   - `cast_present_changed`: STENTs that enter or leave `cast_present`.
   - `mystery_resolution_risk`: M-NNNN ids whose safety the post-choice prose would test.
2. For each candidate seed-pool SLT, check whether its `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` all pass under the post-choice delta. The candidate enters `valid_seed_storylets` only when all four checks pass.
3. If `valid_seed_storylets` is empty, populate `jit_shape_spec` with a one-line sketch of the storylet shape the runtime would need to JIT-author through the page-cycle's `storylet-pool-authoring mode=jit` path.
4. Record `validation_basis` as a one-line rationale, for example: `hard_preconds satisfied after simulated minimum_state_change with cast_present, location, and mystery_safety updates`.

A CHC where `valid_seed_storylets` is empty and `jit_shape_spec` is null is a dead-end - halt and re-derive the choice.

Populate `PG-0001.emitted_choices` with the 4-6 CHC ids.
