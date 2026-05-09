# Phase 8: Choice-Surface Gate

Phase 8 stops being an agency generator. It validates whether the current narrative
point deserves a user-facing choice surface, and when it does, it emits only CHC
records whose commitments are structurally choice-worthy.

Inputs:

- Current page working record after Phase 7.6 validation.
- ARC_TRACE narrative-point evidence when `arc_trace_emitted: true`.
- The realized scene-commitment arc, including `exit_portfolio.native_seeds[]`.
- Current `state_snapshot`, open obligations, active threads, and storylet pool.
- Phase 7.5 Visible Affordance Map as an anchor source, not as a menu generator.
- `STORY_KERNEL.menu_policy`, using defaults when absent.
- Execution mode: `authoring`, `interactive_runtime`, or `batch_generation`.

Outputs:

- Zero CHCs for terminal or chapter-close points.
- One auto-chain CHC for `CONTINUE_ARC` / `CONTINUE_ONLY_PAUSE` when applicable.
- A validated menu of scene-commitment CHCs plus the write-in slot for natural or
  interrupt hinges.

## Step 1: Narrative-Point Classification (engine deterministic with LLM fallback)

The engine classifies the current narrative point into one of the closed
`narrative_point` enum values:

| Class | Trigger | Menu behavior |
|---|---|---|
| `CONTINUE_ARC` | The arc has not yet hit a normal exit or interrupt predicate, or Phase 7.6 leaves an explicitly allowed split/unresolved arc flow. | No user menu in `interactive_runtime`; auto-chain. |
| `NATURAL_COMMITMENT_HINGE` | The arc closed at one of `arc.stop_policy.normal_exits[]`. | Build and validate a menu. |
| `INTERRUPT_HINGE` | The arc closed via `arc.stop_policy.interrupt_before[]`, or Phase 7.6 returned `promote_interrupt`. | Build and validate a menu; menu is required. |
| `CONTINUE_ONLY_PAUSE` | A runaway-defense safety valve fired (`safety_valves.max_words_reached` or `safety_valves.max_internal_beats_reached`) and only one plausible next commitment exists. | Emit only the exact Continue carve-out CHC. |
| `TERMINAL_OR_CHAPTER_CLOSE` | Existing terminal-branch or chapter-close logic applies. | Emit no CHCs. |

Deterministic classification is preferred. If ARC_TRACE evidence is emitted, the
engine uses `stop_condition_hit.category`, Phase 7.6's Layer 3 verdict, and terminal
branch state:

- `normal_exit` maps to `NATURAL_COMMITMENT_HINGE`.
- `interrupt_before` maps to `INTERRUPT_HINGE`.
- `safety_valve` maps to `CONTINUE_ONLY_PAUSE` only when the single-commitment
  predicate also holds.
- Layer 3 verdict `promote_interrupt` maps to `INTERRUPT_HINGE`.

If the engine cannot decide because the stop evidence is ambiguous, an LLM
classifier may propose a class. The engine then validates the proposed class against
the closed enum and available trace/state evidence. Unknown enum values or unsupported
classes HARD-REJECT.

`CONTINUE_ARC` and `CONTINUE_ONLY_PAUSE` are not pacing targets. They are structural
or safety-valve states; ordinary dramatic pacing is expressed through arc structure
and `STORY_KERNEL.cadence_policy`, not through word-count prompts.

## Step 2: Hybrid Exit Portfolio Composition (deterministic engine)

For `NATURAL_COMMITMENT_HINGE` and `INTERRUPT_HINGE`, compose a candidate exit set
before CHCs are surfaced.

### Candidate sources

1. **Native seeds**: include every `arc.exit_portfolio.native_seeds[]` entry whose
   `continuation_arc_selector` matches at least one eligible arc in the storylet
   pool. Eligibility uses the same deterministic checks as Phase 4: `hard_preconds`,
   `cast_requirements`, `location_requirements`, visibility, mystery safety, and
   `commitment_class`.
2. **Engine-discovered exits**: add exits from
   `arc.exit_portfolio.engine_discovered_exit_budget.allowed_sources[]`, capped at
   `arc.exit_portfolio.engine_discovered_exit_budget.max`. Legal sources include
   `urgent_obligation`, `high_salience_thread`, `unresolved_consequence`, and
   `user_write_in`. Each discovered exit derives a `commitment_class` from the
   source's structural semantics.
3. **JIT synthesis**: if the candidate set remains below
   `STORY_KERNEL.menu_policy.min_distinct_commitments` (default `2`), invoke
   `storylet-pool-authoring mode=jit` to synthesize a missing arc archetype.

The Phase 7.5 Visible Affordance Map may prioritize or ground an exit, but it must
not bypass eligibility, mystery safety, continuation capacity, or choice-worthiness.

### Candidate CHC shape

Every candidate intended for menu emission is assembled as a CHC working record:

```yaml
record_version: 2
choice_kind: scene_commitment
commitment_class: <commitment_class enum>
strategy_cluster: <kebab-case open-vocab tag>
choice_worthiness:
  strategic_question_answered: >
  strong_axes:
    - <strong_axis enum>
  expected_state_delta: {...}
  why_not_microbeat: >
  foreseeable_difference: >
choice_contract: {...}
likely_effects: [...]
continuation_capacity: {...}
content_intensity_implied: tame | mature | explicit
label: null
```

`choice_contract` and `continuation_capacity` remain load-bearing. A candidate with
no legal seed continuation and no valid JIT continuation is not emitted.

## Step 3: Choice-Worthiness Validation (engine; HARD-REJECT failures)

For every candidate CHC except the exact `CONTINUE_ONLY_PAUSE` carve-out below,
validate:

| Check | Requirement |
|---|---|
| `likely_effects` | Non-empty. |
| `choice_worthiness.strategic_question_answered` | Populated with the scene-level question this commitment answers. |
| `choice_worthiness.strong_axes[]` | At least one entry from the closed `strong_axis` enum. |
| `choice_worthiness.expected_state_delta` | Non-empty; names the expected state difference by strong axis. |
| `choice_worthiness.why_not_microbeat` | Populated; explains why this is not a gesture-level beat. |
| `choice_worthiness.foreseeable_difference` | Populated; tells what the user can foresee will differ from sibling choices. |
| Pair commitment difference | The candidate's `commitment_class` differs from at least one other surviving candidate. |
| Continuation capacity | Either `continuation_capacity.valid_seed_storylets[]` is non-empty or `continuation_capacity.jit_shape_spec` is populated, with `validation_basis` explaining the accepted path. |

Failures HARD-REJECT the candidate. If the menu falls below
`STORY_KERNEL.menu_policy.min_distinct_commitments`, return to Step 2 for JIT synthesis
or fail Phase 8 with a structured reason.

This is the Rule 1 (No Floating Facts) enforcement surface for CHC records: a choice
cannot be emitted as mere posture, label, or mood. It must carry non-empty likely
effects and a populated choice-worthiness argument.

## Step 4: Strong-Axis Pair Distance (engine; HARD-REJECT failures)

For menus with two or more surviving CHCs, compute the union of all
`choice_worthiness.strong_axes[]` values across the displayed menu. The menu must
cover at least two distinct `strong_axis` values.

Two choices that both engage only `relationship_trajectory`, for example, share the
same axis profile even if their labels differ. Re-derive or drop the weaker candidate
until the menu's strong-axis union has size at least `2`.

The strong-axis check protects commitment-level difference: the menu must not ask
the user to choose among labels that all produce the same strong-axis future. (An
8-axis pair-distance check on `(operation, actor, target)` etc. is retained as
defense-in-depth in `branching-story-health-audit` SAU §Choice Pair-Distance Integrity,
but the strong-axis collective-difference check above is the runtime authority.)

## CONTINUE_ONLY_PAUSE Carve-Out

When Step 1 classifies `CONTINUE_ONLY_PAUSE`, emit exactly one CHC:

```yaml
record_version: 2
choice_kind: tactical_beat
commitment_class: continue_arc_continuation  # tactical_beat-only special-case value; NOT in storylet-pool-authoring's scene_commitment_arc COMMITMENT_CLASSES enum (per references/phase-1-coverage-diagnosis.md §Distribution Scans); auto-PASSes Phase 9 gate 9 per references/phase-9-validation-gates.md gate 9 carve-out
strategy_cluster: continue-only
choice_worthiness:
  strategic_question_answered: "Continue the current arc safely."
  strong_axes: []
  expected_state_delta:
    continuation: "No alternative commitment is currently plausible; continue the arc."
  why_not_microbeat: "CONTINUE_ONLY_PAUSE - only one plausible next commitment"
  foreseeable_difference: "The current arc continues without opening a new commitment surface."
choice_contract:
  user_intent: "Continue."
  guaranteed_action: "Continue the current arc without selecting a new commitment."
  success_policy: guaranteed
  allowed_outcome_band: [succeeds]
  forbidden_outcomes: []
  minimum_state_change: []
likely_effects:
  - "The current arc continues from this page."
continuation_capacity:
  post_choice_delta: {}
  valid_seed_storylets: []
  jit_shape_spec: null
  validation_basis: "CONTINUE_ONLY_PAUSE auto-chain continuation."
label: "Continue."
```

Step 3's `strong_axes[] >= 1` and pair commitment-difference checks are bypassed
only for this exact `commitment_class: continue_arc_continuation` carve-out. No other
commitment class may bypass choice-worthiness validation.

## Auto-Chaining in `interactive_runtime`

When the narrative point is `CONTINUE_ARC` or `CONTINUE_ONLY_PAUSE`,
`interactive_runtime` auto-chains:

1. Phase 11 commits the current page normally.
2. The runtime immediately re-invokes page-cycle with
   `parent_page_id = this_PG`.
3. `chosen_choice_id` is the auto-chain CHC for the continuation.
4. The user sees one continuous reading flow without an intermediate Phase 10 pause.

`authoring` mode never auto-chains past the user. Phase 10 HARD-GATE fires for every
arc-page in `authoring`, and the Phase 4.5 canon-promotion handoff to
`story-fact-promotion-to-canon` remains never-elided in every execution mode.

## Bootstrap PG-0001 special case

`branching-story-bootstrap` delegates PG-0001 initial choice generation to this Phase
8 in special-case mode. PG-0001 has no parent arc and no ARC_TRACE because bootstrap
renders a scene-setter; the first true arc render happens on the next page after the
user picks a commitment.

Special-case behavior:

- **Step 1 - Narrative-Point Classification**: skipped. PG-0001 defaults to
  `NATURAL_COMMITMENT_HINGE` because the bootstrap root is the first commitment
  surface.
- **Step 2 - Hybrid Exit Portfolio Composition**: composed without native seeds from
  a closed arc. Candidate sources are:
  - initial obligations from bootstrap Phase 5 that are salient or urgent enough to
    engage immediately;
  - active threads from bootstrap Phase 5 carrying entry pressure;
  - seed-pool arc eligibility, where every SLT whose `hard_preconds` pass against
    PG-0001's `state_snapshot` contributes its `arc_contract.commitment_class` as a
    candidate;
  - optional JIT synthesis when the candidate set is below
    `STORY_KERNEL.menu_policy.min_distinct_commitments`.
- **Steps 3, 4, and 5**: apply normally. Every stored PG-0001 CHC has non-empty
  `likely_effects`, populated `choice_worthiness`, at least one `strong_axes` entry,
  and the menu collectively covers at least two distinct strong axes.
- **Step 6 - Write-In Slot**: not stored as a CHC at bootstrap. The slot is presented
  at runtime when the user reads PG-0001.

PG-0001's `state_snapshot` records:

```yaml
applied_effect_variant: null
narrative_point_classification: NATURAL_COMMITMENT_HINGE
arc_trace_id: null
arc_trace_emitted: false
```

SPEC-22 validators accept these null/default values only for the `id == PG-0001`
root-page exception.

## Step 5: LLM Surface Label Rendering

For each surviving structured choice, the LLM writes the user-facing label:

```
[content_policy block]
[scene context summary]
[structured choice - choice_kind, commitment_class, strategy_cluster,
 choice_worthiness, choice_contract, likely_effects, continuation_capacity]

INSTRUCTION:
Write the user-facing label for this choice. Faithful to the validated CHC
record - especially `commitment_class`, `choice_worthiness`, `choice_contract`,
and `likely_effects`. Do not embellish in ways that lie about what the choice
does. Match the prose tone. Length: 5-15 words. Prefer active voice. Do not
preview the outcome explicitly; the player should make the choice without knowing
exactly what will happen.
```

Labels are surface text only. They must remain faithful to the validated CHC
record and must not introduce outcome promises absent from `choice_contract`.

## Step 6: Write-In Slot

The user-facing display always includes a write-in slot as choice N+1: "I want to do something else..."

When the user submits free-form text, page-cycle is invoked again with `parent_page_id = current_page` and `manual_action_text = <user input>`. Phase 1 Path B handles it.
