# Phase 6: Seed Commitment Blocks (Optional)

Covers original §Phase 6 (Seed commitment blocks (optional)).

Conditional on the `seed_commitment_blocks` argument:

- `none`: skip; the turn-cycle will create branch-scoped JIT blocks at runtime.
- `minimal`: create 4-8 broad `SLT` records covering recovery / conflict-or-evasion / investigation / bond_shift-or-status_shift / movement-or-protection / fallback-continuation. Add disclosure and/or recovery blocks only if the opening pressure plausibly calls for them within the first few turns.
- `standard`: create 8–14 blocks (cap).

All seed blocks: `scope.visibility: global_author_pool`, `scope.branch_id: null`, `created_at_page: null`, `provenance.origin: bootstrap_seed`. Predicate preconditions reference only world canon, mirrored `SF` from the mirror-world-facts phase, and bootstrap-created `BEL` / `SREL` / `STENT` ids from the belief/debt phases — no branch-local records (there is no branch-local state yet at bootstrap; including any would fail the validation step's branch-isolation gate).

Use the existential predicates in the predicate DSL for seed-block coverage when the opening seed includes matching state. The function-call forms below are notation only; emitted `SLT.preconditions.hard | soft` entries are flat predicate objects per shared contract §5. Prefer actor-unbound existential predicates such as `any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)`, `any_consequence_pending(alias, kind?, urgency?, derived_from?)`, `any_thread_active(alias, tag?, urgency?)`, `any_relationship_axis(alias, axis, comparator, value, participant_role?)`, `any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)`, `any_intention(alias, holder_role?, urgency?)`, `any_clock_active(alias, kind?, salience?)`, `any_secret_unrevealed(alias, salience?, kind?)`, `any_story_question_open(alias, salience?, setup_kind?)`, `any_plan_active(alias, holder_role?)`, and `any_emotion_active(alias, holder_role?, kind?, min_intensity?)` to prefilter broad `global_author_pool` blocks without naming branch-local ids. Pick stable aliases that describe the matched record's role in the seed block, for example `urgent_debt`, `pending_fallout`, `trust_edge`, `public_belief`, `open_intent`, `active_clock`, `hidden_secret`, `open_setup`, `active_plan`, or `active_emotion`.

`effects.create`, `effects.supersede`, `effects.close`, and `exit_options[].likely_effects` may reference a matched record as `bound:<alias>` only when a hard or soft precondition on the same seed `SLT` introduces that alias with one of the `any_*` predicates. Do not use `bound:<alias>` as a prose label or as a placeholder for a record the seed block did not bind.

Commitment blocks are causal moves, not dramatic acts, arcs, or plot rails — the schema discipline at shared contract §4.4 plus FOUNDATIONS §Story Bundles §5a (Commitment Blocks Are Causal Moves) forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, and shape discriminators.
