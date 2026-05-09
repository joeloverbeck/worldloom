# Phase 2: Generation Seeds

Phase 2 turns the Phase 1 diagnosis matrix into arc seeds. An arc seed is a
proposal, not a structured SLT record: it names a candidate
scene-commitment-arc shape that Phase 3 will fill into the v2 SLT scaffold.

Phase 2 is the bridge between pool diagnosis and structured drafting. It must
carry enough information for Phase 3 to choose the right v2 blocks
(`arc_contract`, `dramatic_unit`, `beat_plan`, `execution_envelope`,
`stop_policy`, `effect_model`, and `exit_portfolio`) without pretending the
seed itself is already a validated record.

## Arc Seed Format

Emit each seed in this shape:

```yaml
arc_seed:
  commitment_class: <commitment_class enum>
  arc_archetype: <arc_archetype enum>
  target_obligation: OBL-NNNN | null
  target_thread: THR-NNNN | null
  entry_pressure_description: >
    What is unstable on entry.
  scene_question: >
    The dramatic-unit question this arc tests.
  value_delta_target_axes:
    - <strong_axis enum>
  tone_register: <kebab-case>
  content_intensity_band: tame | mature | explicit
  implied_preconditions:
    - <kebab-case description>
  dramatic_transaction_summary: >
    One-line summary of what changes between the arc's entry state and exit
    state.
```

`commitment_class` values come from SPEC-22 Track 3 `COMMITMENT_CLASSES`.
`arc_archetype` values come from SPEC-22 Track 3 `ARC_ARCHETYPES` and the local
`templates/arc-archetypes.md` library. `value_delta_target_axes` entries come
from SPEC-22 Track 3 `STRONG_AXES`:

- `relationship_trajectory`
- `obligation_state`
- `information_posture`
- `risk_cost_exposure`
- `route_or_scene_type`
- `thread_pressure`
- `irreversibility`
- `character_intention`

Do not preserve v1 `shape` buckets as aliases. Under SPEC-21, the authoring
unit is the scene-commitment arc; every seed must be keyed by
`commitment_class` and `arc_archetype`.

## Required And Nullable Fields

The arc seed has 11 fields.

Mandatory fields:

- `commitment_class`
- `arc_archetype`
- `entry_pressure_description`
- `scene_question`
- `value_delta_target_axes`
- `tone_register`
- `content_intensity_band`
- `implied_preconditions`
- `dramatic_transaction_summary`

Nullable fields:

- `target_obligation`
- `target_thread`

Nullable fields must still be explicit. Use `null` when the arc does not engage
an OBL or THR. Arcs that engage neither an obligation nor a thread are valid
when Phase 1 identifies another story-state pressure, such as mystery coverage,
recent-history repetition relief, route pressure, or cast-state repair.

`target_obligation` and `target_thread` may hold real ids only when Phase 1's
diagnosis matrix made those records available. Do not guess ids and do not
invent placeholders.

## Seed Count Target

For seed/focus batches, produce:

```text
target_pool_size + ceil(target_pool_size * 0.30)
```

The +30% buffer is structural. Produce all buffered seeds up front so Phase 4
can drop or revise rejected candidates without forcing a stop-and-redraft cycle.
The buffer applies to the candidate seed count, not to the final approved SLT
count.

For `mode=jit`, produce exactly one seed.

For `mode=audit`, produce one seed per validated RSP card unless the caller
supplies a larger `target_pool_size`; when larger, distribute extra seeds across
the RSP cards in deterministic card order.

## Direct Seed And Focus Mode

For direct `seed` or `focus` invocation, read Phase 1's diagnosis matrix and
prioritize seeds from these pressures:

- OBL rows with commitment_class gaps.
- THR rows with escalation commitment_class gaps.
- Low-count `arc_archetype_distribution` entries that fit the current story
  pressure.
- Low-count `commitment_class_distribution` entries that fit current OBL, THR,
  mystery, route, or cast-state needs.
- `mysteries_in_play_by_arc` entries with `gap: true`, limited to safe touching
  or progressing rather than resolution.
- `recent_history_repetition_signal.over_represented` entries, which suppress
  repeated commitment_classes unless a supplied source OBL/THR requires them.
- `content_intensity_distribution` gaps, constrained by
  `STORY_KERNEL.content_intensity_baseline`, `content_intensity_override`, and
  the NC-21 content policy.

When `source_obligations` or `source_threads` is supplied, those source records
remain mandatory targets. Every seed must either engage one supplied source id
or state why its nullable target is still justified by the Phase 1 diagnosis
matrix. Mandatory source targeting takes precedence over archetype or
commitment-class balancing; Phase 5 will audit the resulting batch distribution.

Focus mode keeps the requested `focus_area` as a pressure lens, not as a v1
shape enum. For example, `focus_area=thread_resolution_options` should bias
toward commitment_classes and archetypes that can lower, redirect, or close
thread pressure; it must not emit a retired `thread_resolution` shape.

## Audit Mode

For audit mode (`mode=audit`), validated RSP cards drive seed creation. Each RSP produces an
arc seed whose targeting fields come from the card: `commitment_class` from
`RSP.target_commitment_class`, `arc_archetype` from
`RSP.target_arc_archetype`, nullable `target_obligation` and `target_thread`
from the RSP's corresponding target fields, `entry_pressure_description` and
`scene_question` from `RSP.sketch_dramatic_unit`, and
`dramatic_transaction_summary` from the RSP rationale plus the current
story-state pressure named by the finding.

The RSP schema extension is owned by SPEC-22 Track 4. This reference consumes
these RSP fields without defining or migrating them:

- `target_commitment_class`
- `target_arc_archetype`
- `sketch_arc_contract`
- `sketch_dramatic_unit`

If a historical RSP card still has only v1 `proposed_shape` data and lacks the
arc-targeting fields, stop and report that the card is pre-SPEC-21. Do not map a
retired shape to a commitment_class by guesswork.

## JIT mode

For JIT mode (`mode=jit`) with `parent_skill_invocation: true`, produce exactly
one seed from the continuation-failure context in `caller_state_snapshot`.

The seed's `commitment_class` must match the chosen CHC's
`commitment_class`. Select `arc_archetype` from `templates/arc-archetypes.md`
using the deterministic `commitment_class -> recommended arc_archetype` mapping
unless the caller state proves a more specific archetype is required.

The JIT seed should be just large enough for Phase 3's template cascade to
produce one runtime `branch_scoped` arc:

- `target_obligation` / `target_thread` cite the failed or pending source id
  when one exists; otherwise they are explicit `null`.
- `entry_pressure_description` names the eligibility failure, pending
  consequence, required aftermath, route blockage, or commitment pressure that
  made JIT necessary.
- `scene_question` frames the smallest dramatic question that can move the
  caller forward.
- `value_delta_target_axes` names only the strong axes the runtime arc is meant
  to move.

Direct user invocation of JIT remains invalid; JIT is a no-write sub-routine for
`branching-story-page-cycle`.

## Field Guidance

`commitment_class` should answer: what kind of commitment does this arc test,
offer, defer, tighten, or transform?

`arc_archetype` should answer: what dramatic structure from
`templates/arc-archetypes.md` best carries that commitment_class in this story
state?

`entry_pressure_description` should be concrete and story-state grounded. It is
the pressure on entry, not a plot synopsis.

`scene_question` should be answerable by the arc's beats. Use a bounded
dramatic question, not a theme statement.

`value_delta_target_axes` should name the strong axes the arc intends to move.
Phase 3 turns this target into concrete `dramatic_unit.value_delta_target`
content and beat-level `state_significance` values.

`implied_preconditions` are informal in Phase 2. Phase 3 formalizes them through
the Predicate DSL.

`dramatic_transaction_summary` is the one-line core change. It should be
specific enough that Phase 3 can build an effect model, but it should not name
unapproved canon facts or resolve Mystery Reserve entries.

## Cross-References

- `references/phase-1-coverage-diagnosis.md` is the upstream producer of the
  diagnosis matrix that drives seed selection.
- `references/phase-3-structured-drafting.md` is the downstream consumer that
  turns each arc seed into a v2 SLT record.
- `templates/arc-archetypes.md` is the local archetype vocabulary and JIT
  mapping table.
- SPEC-22 Track 3 is the closed-vocabulary source for `COMMITMENT_CLASSES`,
  `ARC_ARCHETYPES`, and `STRONG_AXES`.
- SPEC-22 Track 4 owns the RSP card schema fields consumed by audit mode.
