# Phase 8: Choice Generation (Amendment B Pipeline)

## Step 1: Affordance Space Collection (engine, deterministic)

Enumerate `(verb, target, instrument)` tuples from `state_snapshot`:
- verbs: from a canonical verb vocabulary (talk / attack / flee / investigate / conceal / confess / bargain / use_object / test_theory / follow_clue / change_relationship / intimacy_advance / refuse / reveal / etc.).
- targets: cast_present + objects in scope + locations in scope + secrets known + open OBLs visible to POV.
- instruments: objects in inventory + secrets known by POV + facts known by POV.

Hard filter: drop any tuple that violates a hard precondition (dead char can't speak; lost object can't be used; unknown secret can't be confessed).

Output: candidate affordance set (typically dozens to low hundreds).

## Step 2: Salient-Affordance Shortlist + LLM Proposer

Engine pre-scores affordances by:
- `obligation_relevance` (does this affordance pay off / complicate an open OBL?)
- `character_goal_relevance` (does this advance a STINT-current goal?)
- `reader_knowledge_relevance` (does this exploit dramatic irony?)
- `thread_pressure` (which THR needs attention?)
- `governor_nudge_alignment` (does this match Phase 6's recommendation?)

Take top-K (K = 15) affordances. Pass to LLM proposer with prompt:

```
[content_policy block]
[scene context — same as Phase 7]
[storylet realized this turn — its choice_templates as anchors]
[governor_nudge]
[top-K affordances with score rationales]

INSTRUCTION:
Propose 6-10 candidate choices as STRUCTURED CHC records (operation, actor, target,
uses_fact, likely_effects, continuation_capacity, choice_mode, poetic_effect). Cover
a mix of choice_modes and poetic_effects (relaxed / obvious / dilemma / risky_truth /
sacrifice / seduction / desperation / revelation). Engage at least one open OBL per
choice when possible. Do not write the user-facing label yet — that happens in step 5.
```

LLM produces 6-10 candidate structured CHCs.

## Step 3: Engine Validation Pass

For each LLM-proposed CHC:

| Check | Action on fail |
|---|---|
| Hard preconditions satisfied at current state | Drop |
| Impact analysis runs cleanly (Phase 2 logic on this proposed choice) | Drop |
| Consequence-capacity: `continuation_capacity` is populated with a simulated `post_choice_delta`, and either at least one `valid_seed_storylets[]` entry remains legal under that delta OR `jit_shape_spec` is non-empty | Drop or transform |
| `poetic_effect` is realistic for the operation + state | Re-tag |
| Mystery safety preserved | Drop |

For the consequence-capacity check, compute the post-choice delta implied by `choice_contract.minimum_state_change` and `likely_effects`, then test seed-pool SLTs against that delta: `hard_preconds`, `cast_requirements`, `location_requirements`, and `mystery_safety` must still pass. If no seed storylet matches but a runtime JIT continuation is viable, populate `jit_shape_spec` with the one-line shape of the needed continuation. Both `valid_seed_storylets` empty and `jit_shape_spec` empty is a dead-end and the CHC is not emitted. `validation_basis` records the one-line rationale for the accepted seed/JIT continuation path.

Drop choices that fail hard checks. Flag near-misses for transformation.

## Step 4: Diversification + Scoring

Apply diversification to surviving choices:
- Avoid 6 versions of "ask about X" — at most 1 of any single (verb, target) pair.
- Mix moral / strategic / emotional / investigative / risky / self-protective axes.
- Cover at least 3 distinct `choice_mode` values.
- Cover at least 3 distinct `poetic_effect` values.
- Engage at least 60% of currently-open high-salience OBLs across the choice set.

Final ranked list of 4-6 surviving structured choices.

## Step 5: Surface Label Rendering (LLM)

For each surviving structured choice, the LLM writes the user-facing label:

```
[content_policy block]
[scene context summary]
[structured choice — operation, actor, target, uses_fact, likely_effects,
 choice_mode, poetic_effect]

INSTRUCTION:
Write the user-facing label for this choice. Faithful to the underlying operation —
do not embellish in ways that lie about what the choice does. Match the prose tone.
Length: 5-15 words. Prefer active voice. Do not preview the outcome explicitly;
the player should make the choice without knowing exactly what will happen.
```

Each emitted CHC-NNNN record stores:

```yaml
id: CHC-NNNN
story_id: STORY-001
emitted_at_page: PG-NNNN
created_at_page: PG-NNNN

operation: <verb>
actor: STENT-NNNN
target: STENT-NNNN | STOBJ-NNNN | STLOC-NNNN | abstract
uses_fact: SF-NNNN | null

choice_contract:
  user_intent: >
    What the player is signaling they want to accomplish.
  guaranteed_action: >
    What WILL definitely be attempted or performed if this choice is selected.
  success_policy: guaranteed | attempted | uncertain | opposed
  allowed_outcome_band:
    - succeeds
    - partially_succeeds
    - fails_with_consequence
    - backfires
  forbidden_outcomes:
    - <outcome that would betray the label>
  minimum_state_change:
    - fact | obligation | consequence | relationship | intention | thread | location | cast | terminality

likely_effects: [...]
continuation_capacity:
  post_choice_delta:
    facts_added_or_changed: []        # SF-NNNN ids changed by minimum_state_change / likely_effects
    obligations_changed: []           # OBL-NNNN ids whose status or salience would shift
    location_changed: null            # null if no move; STLOC-NNNN id if current_location changes
    cast_present_changed: []          # STENT-NNNN ids entering or leaving cast_present
    mystery_resolution_risk: []       # M-NNNN ids whose safety status the post-choice state tests
  valid_seed_storylets: []            # SLT-NNNN ids whose hard_preconds/cast/location/mystery checks pass under the post-choice delta
  jit_shape_spec: null                # one-line JIT continuation sketch when no seed SLT matches
  validation_basis: ""                # one-line rationale for the accepted seed or JIT continuation path
choice_mode: <enum>
poetic_effect: <enum>
content_intensity_implied: tame | mature | explicit
label: <user-facing text>
```

Either `continuation_capacity.valid_seed_storylets` is non-empty OR `continuation_capacity.jit_shape_spec` is populated. Both empty is a Phase 9 gate-9 fail.

A selected CHC may NOT be transformed outside its `choice_contract.allowed_outcome_band` without explicit user confirmation. If the next turn's Phase 4 storylet selection or Phase 7 prose render would produce an outcome outside the band, the engine routes via Phase 1 B.3's `ACCEPT_BUT_TRANSFORM` (asking the user to confirm) rather than silently delivering an outcome that betrays the label. This protects user agency: "Confess the secret" cannot become "almost confess but get interrupted" without the user explicitly accepting the reframing.

## Step 6: Write-In Slot

The user-facing display always includes a write-in slot as choice N+1: "I want to do something else..."

When the user submits free-form text, page-cycle is invoked again with `parent_page_id = current_page` and `manual_action_text = <user input>`. Phase 1 Path B handles it.
