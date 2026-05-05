# Phase 8: Initial Choice Generation

Reference for `branching-story-bootstrap` Phase 8 — the delegated choice-production phase that runs `branching-story-page-cycle`'s Phase 8 (Amendment B Pipeline) against the genesis state produced by Phases 2, 3, 5, 6, and 7. Emits 4-6 CHC-NNNN records under the diversification + consequence-capacity contract; populates `PG-0001.emitted_choices` for Phase 11.

---

Delegate to `branching-story-page-cycle` Phase 8 (Amendment B Pipeline), applying the same production CHC contract to the genesis state produced by Phases 2, 3, 5, 6, and 7. Bootstrap supplies `PG-0001.state_snapshot` as the current state, the selected root storylet's `choice_templates` as anchors, and uses `governor_nudge: "bootstrap root; favor premise-aligned entry pressure and initial agency spread"`.

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
- at least 3 distinct `choice_mode` values
- at least 3 distinct `poetic_effect` values
- across the set, engage at least 60% of currently open high-salience OBLs (salience ≥ 7) when at least 2 such OBLs exist; when only 1 high-salience OBL exists it must be engaged by ≥1 CHC; when 0 high-salience OBLs exist this requirement is vacuous

The write-in slot is N+1 (handled by the runtime, not stored as CHC at bootstrap).

---

## CHC fields

Page-cycle-compatible schema in `templates/story-records.yaml`; `branching-story-page-cycle` Phase 8 step 5 is the runtime authority: `id`, `story_id`, `emitted_at_page: PG-0001`, `created_at_page: PG-0001`, `operation`, `actor`, `target`, `uses_fact`, `choice_contract` (`user_intent`, `guaranteed_action`, `success_policy`, `allowed_outcome_band`, `forbidden_outcomes`, `minimum_state_change`), `likely_effects[]`, `choice_mode`, `poetic_effect`, `content_intensity_implied`, and `label` (the user-facing prose).

---

## Consequence-capacity check

Every emitted CHC must have at least one continuation storylet (in the seed pool or marked as `jit_generatable: true` with a one-line shape spec). A CHC with no continuation is dead-end at runtime — halt and re-derive.

Populate `PG-0001.emitted_choices` with the 4-6 CHC ids.
