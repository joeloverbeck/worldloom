# Phase 3: Structured Drafting

Phase 3 turns each Phase 2 arc seed into an `SLT-NNNN` storylet record.
The LLM produces a structured arc proposal; the engine wraps that proposal with
schema scaffolding, validates field types and Predicate DSL parsability,
generates obligation/fact/cast-role templates from the structured proposal, and
assigns visibility/provenance fields according to mode.

The unit of authoring is a scene-commitment arc.

## Inputs Consumed

For each candidate seed, Phase 3 consumes:

- The 11-field `arc_seed` from `references/phase-2-generation-seeds.md`.
- The story kernel, including tone constraints, content-intensity baseline,
  cadence/menu policy when present, known invariants, and mysteries in play.
- State context: open OBLs, active THRs, mysteries in play, cast roster,
  current location, and relevant recent branch state.
- `templates/content-policy.txt`, loaded verbatim first.
- `templates/predicate-dsl.md`, including the stop-predicate third tier.
- `templates/tone-theme-tag-dictionary.md`, as recommended tag vocabulary.
- `templates/arc-archetypes.md`, excerpted by the strategy below.
- `templates/storylet-record.yaml`, used as the SLT scaffold target.

Phase 3 must not guess missing ids. If a seed's nullable `target_obligation` or
`target_thread` is `null`, keep it null unless the state context contains a real
record that Phase 1/2 made available for this seed.

## LLM Prompt Assembly

The prompt assembly order is load-bearing. `content_policy` is FIRST so the
content contract binds before any world, state, or drafting instruction.

```text
[content_policy verbatim]
[story kernel]
[seed brief]
[state context - open OBLs, active THRs, mysteries_in_play, cast roster, current_location]
[predicate DSL - including stop predicates]
[arc archetype excerpt for this seed's arc_archetype]
[arc template scaffold - SLT with TODO markers]

INSTRUCTION:
Fill the SLT template for this arc seed. Required:
- arc_contract (commitment_class, arc_archetype, actor, target, user_intent,
  strategic_question_answered, commitment_scope, success_policy, allowed_outcome_band)
- dramatic_unit (scene_question, entry_pressure, value_delta_target, natural_close_definition)
- beat_plan (mode: ordered_soft, min_beats, max_beats, 3-8 beats with function/realization_target/required/state_significance)
- execution_envelope (invariants, required_functions, allowed_tactics, prohibited_actions,
  style_directives, mystery_preservation)
- stop_policy (normal_exits using stop predicates, interrupt_before, safety_valves)
- effect_model.variants (1..N rows; each maps to one allowed_outcome_band entry; required_effects
  use closed effect-type enum; forbidden_effects enumerate what MUST NOT happen)
- exit_portfolio.native_seeds (3-5 entries; each commitment_class + strategy_cluster +
  expected_state_delta + continuation_arc_selector)
- eligibility/effect fields (hard_preconds, soft_preconds, cast_requirements, location_requirements,
  tone_tags, theme_tags, tension_delta, aftermath_weight, mystery_safety, provenance, visibility)

Do NOT use beat headers in any prose-bearing field. Beat plans are structural; prose flows continuously.
```

The seed brief maps directly into the scaffold:

- `arc_seed.commitment_class` -> `arc_contract.commitment_class`
- `arc_seed.arc_archetype` -> `arc_contract.arc_archetype`
- `arc_seed.entry_pressure_description` -> `dramatic_unit.entry_pressure.description`
- `arc_seed.scene_question` -> `dramatic_unit.scene_question`
- `arc_seed.value_delta_target_axes[]` -> `dramatic_unit.value_delta_target` and
  `beat_plan.beats[].state_significance`
- `arc_seed.implied_preconditions[]` -> formalized Predicate DSL entries in
  `hard_preconds`, `soft_preconds`, cast requirements, or location requirements
- `arc_seed.dramatic_transaction_summary` -> `effect_model.variants[]` and
  `exit_portfolio.native_seeds[]`

## Archetype Excerpt Strategy

The archetype excerpt is library-table-only, not the full archetype prose. Full
archetype entries in `templates/arc-archetypes.md` are intentionally rich; putting
one complete entry into every Phase 3 prompt can make complex bundle prompts
exceed the intended size budget.

For the selected `arc_seed.arc_archetype`, excerpt only:

- the matching `commitment_class -> recommended arc_archetype` mapping-table row
  when present,
- the archetype heading and typical commitment classes,
- a condensed structural sketch of entry pressure, beat_plan shape,
  execution-envelope emphasis, stop-policy shape, effect-model pattern, and
  exit-portfolio direction.

Do not paste the full 30-50 line archetype detail by default. If the LLM cannot
complete the scaffold from the table-only excerpt plus condensed sketch, it may
request expanded archetype detail as a follow-up retrieval; that expansion is
out of scope for this authoring pass.

## Structured Arc Proposal

The LLM output is a structured proposal, not the persistence authority. It must
fill every required storylet block:

### `arc_contract`

Populate the commitment contract that this arc tests or satisfies:

- `commitment_class` from the closed vocabulary and `arc_archetype` from the
  seed. `arc_archetype` is an orienting pattern label: library values are
  preferred when they fit, but story-specific snake_case values are valid when
  the arc's `dramatic_unit` and `beat_plan` justify them.
- `actor` and `target` as STENT ids or role matchers from the cast context.
- `user_intent` as the user-side commitment encoded by the arc.
- `strategic_question_answered` as the scene-level question the arc helps answer.
- `commitment_scope`, normally `scene` unless the seed requires `sequence`.
- `success_policy`.
- `allowed_outcome_band`, using closed `strong_outcome` values.

### `dramatic_unit`

Populate the scene-level unit:

- `scene_question` from the seed, sharpened to a bounded dramatic question.
- `entry_pressure.thread` when a real THR is targeted, else `null`.
- `entry_pressure.description` from the seed and current state.
- `value_delta_target` fields matching the seed's strong axes.
- `natural_close_definition`, describing the conditions under which the arc has
  played out and a next commitment hinge is exposed.

### `beat_plan`

Use `mode: ordered_soft`. Produce 3-8 beats with `min_beats` and `max_beats`
consistent with the list. Beat entries are structural, not prose headings. Each
beat names:

- `id`
- `function`
- `realization_target`, an open-vocab kebab-case string naming the scene movement this beat realizes
- `required`
- `state_significance`, either `none` or one of the closed `strong_axis` values

At least one beat should carry a state-significance value aligned with the seed's
`value_delta_target_axes[]` unless the seed is intentionally low-motion and the
reason is recorded in the proposal notes.

### `execution_envelope`

Populate the prose-render contract:

- `invariants`
- `required_functions`
- `allowed_tactics`
- `prohibited_actions`
- `style_directives`
- `mystery_preservation.forbidden_resolutions[]`
- `mystery_preservation.allowed_claims[]`

`mystery_preservation.forbidden_resolutions[]` must include any forbidden-status
M ids from the whole-class Mystery Reserve load that the arc could otherwise
brush, imply, or risk resolving. The envelope controls page-cycle rendering; it
does not replace `mystery_safety`, which remains the storylet-level declaration.

### `stop_policy`

Populate `normal_exits`, `interrupt_before`, and `safety_valves`.

Every `normal_exits[].predicate` and `interrupt_before[].predicate` must use the
stop-predicate tier from `templates/predicate-dsl.md`. Do not invent free-form
stop predicates. Safety valves are thresholds, not DSL predicates.

### `effect_model`

Populate `selected_before_render: true` and at least one variant. Each variant:

- has an `id`,
- maps to one value from `arc_contract.allowed_outcome_band`,
- has a `probability_weight`,
- contains at least one `required_effects[]` entry using the closed effect-type
  enum,
- names `forbidden_effects[]` entries for outcomes that must not happen under
  that variant.

Closed effect types are:

- `relationship_axis_shift`
- `thread_pressure_delta`
- `obligation_status_change`
- `fact_create`
- `fact_invalidate`
- `consequence_open`
- `consequence_address`
- `cast_change`
- `location_change`
- `mystery_progress`

The LLM may propose semantic args, but the engine normalizes them into
structured effect records or re-prompts on malformed shapes.

### `exit_portfolio`

Populate 3-5 `native_seeds[]` entries unless `mode=jit` explicitly requests a
smaller runtime arc. Each native seed has:

- `id`
- `commitment_class`
- `strategy_cluster`
- `expected_state_delta`
- `continuation_arc_selector`

Runtime choice proposal scaffolding lives here in `exit_portfolio.native_seeds`.

### Eligibility and Effect Fields

Populate these fields in the record:

- `hard_preconds`
- `soft_preconds`
- `cast_requirements`
- `location_requirements`
- `opens_obligations`
- `pays_off_obligations`
- `complicates_obligations`
- `transfers_obligations`
- `fact_effects`
- `relationship_effects`
- `tone_tags`
- `theme_tags`
- `tension_delta`
- `aftermath_weight`
- `mystery_safety`
- `provenance`
- `visibility`

Predicate-bearing fields must use the Predicate DSL core or documented
extension forms. The stop-predicate tier is only for `stop_policy`.

## Engine Wrapping

The engine wraps the LLM output before anything is accepted as an SLT record:

1. Applies `templates/storylet-record.yaml` scaffolding and verifies every
   required field is present with the correct shape.
2. Validates field types, closed-enum values, and record-id or role-matcher
   shapes.
3. Validates Predicate DSL syntax for `hard_preconds`, `soft_preconds`,
   `cast_requirements`, `location_requirements`, and stop-policy predicates.
4. Generates or normalizes obligation templates, fact templates, relationship
   effects, and cast-role machinery from the LLM's structured proposal.
5. Fills reader-visibility defaults for created story facts:
   `visible_to_reader: false` and
   `reader_visibility_basis: unrevealed_objective_truth`, unless the arc
   deliberately creates a reader-facing reveal with a positive basis.
6. Assigns `provenance` and `visibility` from mode and source context.
7. Records the LLM's `exit_portfolio.native_seeds[]` verbatim; these become
   Phase 8 exit candidates at runtime.

The LLM never operates as the continuity database. Engine wrapping and Phase 4
validation preserve the FOUNDATIONS tooling discipline that structured records
and validators carry continuity.

## Visibility Scope Assignment

- `mode=seed` or `mode=focus`: default to `visibility.scope:
  global_author_pool`, `provenance.origin: focus_authoring`,
  `provenance.created_at_page: null`.
- Bootstrap seed sub-routine (`parent_skill_invocation: true`, `mode=seed`,
  `focus_area=bootstrap_mix`): records are returned in memory with
  `provenance.origin: bootstrap_seed`; the parent bootstrap skill owns writes.
- `mode=jit`: require `parent_skill_invocation: true`, set
  `visibility.scope: branch_scoped`, `provenance.origin: runtime_jit`, and
  `provenance.created_at_page: <created_at_page>`.
- `mode=audit`: set `provenance.origin: audit_remediation`,
  `provenance.source_audit`, and `provenance.source_rsp`; visibility inherits
  from the source RSP card's `proposed_visibility` block.

When a direct seed/focus run targets source obligations or threads whose records
were created after bootstrap (`created_at_page` non-null and no superseding
bootstrap precursor), `global_author_pool` is not safe. Use
`branch_prefix_scoped` visibility derived from the source record's branch-path
prefix, with `provenance.created_at_page: null`, so the storylet is visible only
on branches where those source records exist.

## Choice Template Retirement

`choice_templates` is forbidden. `templates/storylet-record.yaml` states
that presence of `choice_templates` on an SLT is HARD-REJECTed by SPEC-22's
`arc_schema_compliance` validator.

Do not instruct the LLM to fill `choice_templates`. Runtime choice proposal
scaffolding moves to `exit_portfolio.native_seeds[]`, and the page-cycle choice
surface consumes those native seeds alongside engine-discovered exits.

## Failure Handling

If the LLM produces malformed output, missing fields, wrong types, free-form
predicates, free-form stop predicates, unknown enum values, or a malformed
record, the engine re-prompts with the exact failure inlined. Retry up to 2
times for the same seed. After two failed retries, drop the seed and replace it
with the next under-represented seed from Phase 1's diagnosis matrix.

If a failure reveals a Phase 2 seed defect, return to Phase 2 for that candidate
instead of patching the Phase 3 output by guesswork.

## Cross-References

- `references/phase-2-generation-seeds.md` is the upstream producer of the
  11-field arc seed.
- `references/phase-4-5-canon-safety-checks.md` is the downstream gate surface
  for schema completeness, Predicate DSL parsability, mystery safety, branch
  contamination, and batch diversity.
- `templates/content-policy.txt` is loaded verbatim first in the prompt.
- `templates/predicate-dsl.md` supplies eligibility predicates and the
  stop-predicate tier.
- `templates/tone-theme-tag-dictionary.md` supplies recommended tag vocabulary.
- `templates/arc-archetypes.md` supplies mapping-table rows and condensed
  archetype sketches.
- `templates/storylet-record.yaml` is the SLT scaffold target.
- SPEC-21 §C defines this Phase 3 arc-schema-fill contract.
- SPEC-22 Track 2 owns the executable `arc_schema_compliance`,
  `stop_policy_parsability`, and `effect_model_legality` validator extensions.
