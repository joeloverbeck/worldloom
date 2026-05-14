# Scene-Arc Storylet Research Brief

## Purpose of this brief

You are a deep-research LLM. We are designing a significant pivot in the architecture of an LLM-driven interactive narrative engine. This brief gives you everything you need to research the problem space without access to our codebase: the engine model, the pacing pathology we are trying to fix, the architectural direction we are leaning toward, the constraints we must respect, and the specific open questions where outside research would change our design. Please return citations to academic papers (title, authors, year, venue) and pointers to source-available implementations we can study, with comparative reasoning where alternatives exist.

The previous research pass on this same problem (a separate LLM-authored report; not reproduced here) correctly diagnosed the symptom — pacing is broken because choice cadence is at beat granularity — but its proposed remedy (autoplay-until-stop with execution constraints attached to choices) is still beat-paced under the hood. We have since chosen a more aggressive structural pivot. We need your research to either reinforce that pivot, surface alternatives we have not considered, or improve the specific design at the level of schema, algorithm, or validation.

## Project context: the engine

The system is an interactive branching narrative engine driven primarily by an LLM operator. It produces long-form prose stories (literary, character-driven, often morally textured) where the user makes choices that branch the narrative. The engine is not a game — there are no graphics, scores, or mechanical systems beyond narrative state. The output the user reads is rendered prose; the state that drives that prose is structured (atomic YAML records on disk).

The engine runs as a pipeline of stages (in our system these are called "skills" — discrete prompt+procedure modules an LLM executes one at a time, with deterministic engine code between them for validation and state mutation). Each user choice triggers a single "page-cycle" pass through the pipeline, which currently produces:

- One **page record** (the new state after the choice).
- One **prose render** (what the user reads, ~500-1500 words).
- A new menu of **4-6 structured choice records** (the next decision point) plus a free-form write-in slot.
- Per-turn append-only state mutations (facts, obligations, threads, relationships, character intentions, consequences, events).

The story bundle is a directed acyclic graph of pages along branches. Records are append-only via supersession (a "modified" obligation is a new record citing `supersedes: OBL-NNNN`). The branch path is the primary key for what counts as continuity. State mutations are deterministic and replayable from the chain of chosen choices.

## Glossary

Worldloom-specific terminology used throughout this brief:

- **CHC** — choice record. A structured representation of one option in a choice menu. Carries an operation, actor, target, contract (`user_intent`, `guaranteed_action`, `success_policy`, `allowed_outcome_band`, `forbidden_outcomes`, `minimum_state_change`), `likely_effects[]`, and a continuation-capacity block proving the choice can lead somewhere.
- **SLT** — storylet. A pre-authored narrative unit eligible to fire when its preconditions hold over current state. Currently beat-granular: one SLT realizes one beat (≈one page of prose).
- **STINT** — story intention. A per-character intention snapshot (what the character is currently planning, fearing, hoping for).
- **PG** — page. The unit of one render-and-state-mutation tick.
- **SE** — story event. The structured operation applied this turn (the engine's input-to-state-mutation contract).
- **SF / OBL / CNSQ / THR / SREL** — story facts, obligations, consequences, threads, story-local relationships. The persistent state classes.
- **BR** — branch. A path through the page DAG, identified by `branch_path: [PG-0001, PG-0002, ...]`.
- **M** — mystery. A reserved canonical question whose resolution is gated by safety status (`forbidden`, `medium`, `low`).
- **HARD-GATE** — an explicit user-approval pause built into the pipeline. In authoring mode, the user must approve each page-cycle's deliverable before any writes commit.

## The pacing problem

The engine emits 4-6 choices per page. Pages are produced one storylet (one beat) at a time. The result is that the user is asked to make a decision approximately every 500-1500 words — for an intimate, slow-paced, character-driven scene, this is roughly every 30-60 seconds of reading, including in moments where no genuine decision is available, only a stylistic permutation of "what does the protagonist do next this very second."

We have eight pages of a single test story. By page 4 the choices have collapsed from "what kind of scene are we playing?" to "what is the protagonist's next tiny gesture?" — choices like "Hold the silence," "Take a half-step back," "Give his name back," "Ask two words." These are valid acting beats but they are not interactive narrative choices. A choice menu emitted at this granularity destroys reading flow, multiplies token cost (each page is a full pipeline pass), and gives the user a false sense of agency: most of the "choices" do not change the strategic direction of the scene.

### Concrete evidence from the test story

Across 30 emitted choice records spanning 8 pages:

| Metric | Result |
|---|---|
| Pages produced | 8 |
| Choices emitted | 30 (5 per page, every page) |
| `likely_effects` populated | 0 / 30 (every record has empty `likely_effects: []`) |
| `success_policy: guaranteed` | majority |
| `minimum_state_change` includes `intention` | ~28 / 30 |
| `minimum_state_change` includes `fact` | ~27 / 30 |
| Choices whose differences are postural / verbal-register / silence-vs-speech | majority of late-page choices |
| Choices that produce a meaningfully different downstream situation | only the first-page menu fully qualifies |

The schema *has* a `likely_effects` field. The proposing LLM is not populating it. The engine's validation pass does not require it to be populated. Both gaps have to be closed, but closing them is not sufficient — the deeper issue is that the choice cadence is at the wrong granularity entirely.

### Sample choice record (verbatim, lightly redacted)

```yaml
id: CHC-0026
emitted_at_page: PG-0006
operation: hold_silence_after_audit_verdict
actor: STENT-0001
target: STENT-0002
choice_contract:
  user_intent: |
    Refuse to fill the silence. Trust the body-decision-as-first-verdict to land
    where she put it.
  guaranteed_action: |
    Jon stays at his two-arms'-length position; says nothing; allows the silence
    to extend; permits her next move (look up, speak, stand, leave) to compose
    at her own rate without nudging it.
  success_policy: uncontested
  allowed_outcome_band: [succeeds, partially_succeeds]
  forbidden_outcomes:
    - Jon speaks any word, sentence, or sound
    - Jon takes a step closer or farther
  minimum_state_change: [intention, thread]
likely_effects: []
choice_mode: observational
poetic_effect: obvious
label: "Hold the silence. Let what she just did stay where she put it."
```

This is morally precise but mechanically empty. It is one of five options on its page. The other four are similar in caliber. The user reads ~1000 words of prose, picks one of these, and gets one more 1000-word beat. The scene moves at the speed of postures.

## What the current architecture does

The choice generation phase ("Phase 8") works as follows:

1. **Affordance space collection** (deterministic). Enumerate `(verb, target, instrument)` tuples from current state — talkable actors, usable objects, knowable secrets, open obligations.
2. **LLM proposer.** Take top-K affordances by relevance scores, pass to an LLM with a prompt asking for "6-10 candidate structured choices" covering a mix of choice modes and poetic effects, engaging open obligations where possible.
3. **Engine validation.** Drop candidates that violate hard preconditions, fail an impact-analysis simulation, or have no continuation path. Validate that each surviving choice has a reachable downstream storylet (or a sketch of a runtime-generated one).
4. **Diversification + pair-distance scoring.** Require ≥3 distinct `choice_mode` values across the menu, ≥3 distinct `poetic_effect` values, ≥60% of currently-open high-salience obligations engaged, and every pair of choices must differ on ≥2 of 8 axes (operation, actor, target, fact-used, state-change set, success policy, mode, poetic effect) with ≥1 difference being structural (axes 1-6).
5. **LLM surface-label rendering.** For each surviving structured choice, the LLM writes the user-facing label.
6. **Write-in slot.** Always offered as the last option ("I want to do something else…").

The pair-distance discipline does prevent literally identical choices, but it allows operationally-identical choices that differ in label or modal axis to pass — which is why "stay still" and "step five paces back" and "half-step back" can all coexist in one menu.

## Approaches considered and rejected

**Approach A — Tighten the existing emission policy.** Mandate non-empty `likely_effects`. Add a "warrant test" requiring at least two surviving choices to produce meaningfully different post-choice state on a *strong-axis* set (relationship change, obligation status change, threat pressure delta, irreversible exit, route change). Tighten pair-distance to reject pairs sharing operation + success_policy + state-change set even when actor/target differ.

Rejected as sufficient because it does not change the cadence: a scene still emits a menu every beat. It tightens the noise floor without addressing the architectural mismatch.

**Approach B — Autoplay-until-stop.** Introduce a `commitment_kind` axis on choices (`tactical_beat | strategic_commitment | route_hinge`). When the user picks a strategic commitment, the engine enters an autoplay mode for subsequent page-cycles bound to a new intention record. Each autoplay tick runs the full pipeline but emits only a "Continue" affordance instead of a 4-6 menu, until a stop condition fires (a `must_not` clause is about to be violated, an urgent obligation opens, the commitment's user-intent is satisfied/blocked/overturned, etc.).

Rejected because it preserves the per-beat page artifact (full pipeline pass per beat: prose render, validation, state mutation, optional commit). For a 4-5 beat scene this is roughly 4-5x the LLM cost of rendering the scene as one unit. The user explicitly flagged token cost and wall-clock time as concerns.

## The design direction we are pursuing

**Scene-arc storylet granularity.** Re-author the storylet pool so that one storylet is a *scene-arc* — a multi-beat unit that plays out a single commitment from activation to natural close. The page becomes the scene-arc's render. The choice menu emerges at scene close.

The conceptual move: a storylet is no longer "a beat that may fire" but "a commitment that, once selected, plays out under a baked-in execution envelope until a stop condition fires."

Hypothesized scene-arc storylet schema (illustrative, not final):

```yaml
SLT-NNNN
  shape: scene_arc
  commitment_class: stay_available_without_pressure

  preconditions: [...]                # gate the storylet on entry state

  beat_template:                      # sketch the LLM elaborates inside the prose render
    - establish_distance_or_position
    - accept_NPC_pace
    - mirror_or_acknowledge_once
    - allow_natural_close

  execution_envelope:                 # control vocabulary for the LLM render
    must:    [maintain_physical_distance, let_NPC_control_continuation]
    may:     [step_back, allow_silence, brief_reciprocal_answer]
    must_not: [touch, crowd, multiply_offers, ask_about_bruise]

  stop_conditions:                    # any of these closes the arc and triggers the menu
    - NPC_makes_demand_or_disclosure
    - irreversible_commitment_imminent
    - scene_goal_resolves_or_changes
    - max_beats_reached_safety_valve

  effects:                            # arc-level state mutations validated post-render
    - thread_pressure_delta:    {...}
    - relationship_axis_shift:  {...}
    - obligation_status_change: {...}

  exit_choice_seeds:                  # the next-commitment menu, authored alongside the arc
    - tighter_aid:    {strategy_cluster: practical_external_help, ...}
    - press_question: {strategy_cluster: gentle_investigation, ...}
    - release:        {strategy_cluster: release_pressure, ...}
```

Three properties of this design that distinguish it from beat-granularity storylets + runtime chaining:

1. **The execution envelope lives on the storylet, not on the choice.** The choice degenerates into a pointer ("which scene-arc do you want next?"). The author writes the envelope once when authoring the arc, not at every choice emission.
2. **`exit_choice_seeds` are authored alongside the arc.** The next-commitment menu is structurally coherent with the just-played-out scene because the same author wrote both. Phase 8's LLM-proposer step largely dissolves into label-rendering.
3. **One LLM render call per scene** — covering all beats — instead of one per beat. Engine math: ~4 LLM calls per scene (prose render + post-render critic + Phase 8 label render + validation) instead of ~4-5 calls per beat × N beats.

We believe this is structurally cleaner than autoplay-with-execution-constraints because it stores strategy at the granularity at which it is authored and consumed, rather than reconstructing strategy from beats at runtime. But "we believe" is doing a lot of work here. This is where your research is most valuable.

## Hard constraints

Any architecture you recommend or critique must respect these:

1. **Append-only via supersession.** Records are immutable. A "modified" record is a new record citing `supersedes: <prior-id>`. This is non-negotiable; the entire continuity model depends on it.
2. **Branch-isolation invariant.** A page on branch B may not read or reference any page on a sibling branch B'. This is structurally enforced by validators.
3. **Snapshot-replay equality.** Replaying the chain of chosen choices from genesis must produce a state equal to the state on disk. Multi-beat scene-arcs preserve this if the arc's `effects` are deterministic — beat-internal mutations need not be replayed at the engine level if arc-level effects suffice.
4. **HARD-GATE discipline.** In authoring mode the user explicitly approves each pipeline pass before any disk writes. The pivot to scene-arc pages reduces approval frequency (one approval per scene, not per beat), which is a design benefit — but the gate itself cannot be removed.
5. **Mystery firewall.** Mysteries with `safety: forbidden` may never be resolved by any storylet. Validators enforce this. Scene-arc storylets must respect this at the arc level (every beat in the arc must preserve forbidden mysteries).
6. **World-canon vs story-canon separation.** Story-bundle pipelines never directly mutate world-level canon. Promotion of a story-local fact to world canon is a separate, gated workflow.
7. **The LLM is never the continuity database.** State lives in YAML. Prose is rendered from state and is not authoritative. Any beat or arc that wants to "remember" something must produce a structured record that future arcs consume via preconditions.
8. **Authoring + runtime workflows are both supported.** Storylets are authored (typically batch-generated by another LLM-driven skill) into a pool. At runtime, eligible storylets are filtered, scored, and selected. Scene-arc granularity must support both bulk authoring and runtime just-in-time generation when the pool is thin.

## Open design questions

These are the questions where research would meaningfully change the design. Please address as many as you can.

### 1. Scene-arc unit of decomposition

What is the right granularity for a "scene-arc" in interactive narrative? Beats? Strategic commitments? Dramatic units (Aristotelian scene-into-sequel, Mamet's scene as negotiation, Yorke's five-act fractal)? Is there academic or implementation precedent for storylet/quality-based narrative systems where the storylet is multi-beat? StoryNexus, Cultist Simulator, Fallen London — at what granularity do those systems author storylets? How do their authoring tools handle multi-beat composition, and do they regret it?

### 2. Execution-envelope control vocabularies

We sketch `must` / `may` / `must_not` / `stop_before` as the control vocabulary. What does the literature say about expressing narrative constraints declaratively? Behavior trees, drama managers (Search-Based Drama Management; Declarative Optimization-based Drama Management; Mateas's Façade), HTN planners, BDI architectures, character authorial intentions in IDtension or Suspenser — which abstractions have proven authorable and inspectable, and which collapse under their own complexity? How do these systems represent "what the character is committed to doing during this scene" without requiring a logician to author each scene?

### 3. Beat-template flexibility versus determinism

Our `beat_template` is a sketch of the beat sequence inside an arc, which the LLM elaborates within the execution envelope at render time. How rigid should this be? Pure script? Soft sequence? Branchy DAG? What is the right balance between author intent (the arc plays out approximately this way) and runtime emergence (the arc adapts to current state)? We're particularly interested in academic work on beat decomposition (Alex Goss's beat-driven structure; Emily Short's salience model; James Ryan's Bad News and the Talking Aliens narrative architectures; Mawhorter et al.'s choice poetics).

### 4. Exit-choice authorship

We propose `exit_choice_seeds` declared alongside the arc — the author writes the next menu when they write the arc. Is this approach sound? Does it create authorial bottlenecks (every arc has to enumerate every plausible exit)? Are there hybrid models where exits are partly arc-declared and partly engine-discovered? How do existing storylet systems (especially those with quality-based narrative — StoryNexus, Cultist Simulator, FailBetter Games' tooling) handle the next-decision-menu after a multi-beat unit fires?

### 5. Stop-condition expressiveness

Our stop-condition list (NPC demand, irreversible cost imminent, scene goal resolves, max beats reached) is informal. What formal language should this be in? First-order predicates over state? Temporal logic? Drama-manager event triggers? How granular do stop conditions need to be to feel responsive without becoming unauthorable? Comparable systems: the Choice of Games "delayed branching" pattern; Ink's gathers; ChoiceScript's `*page_break`; Versu's drama manager; the "boundary triggers" of Inform 7's scene system.

### 6. LLM prose render under a multi-beat envelope

When one LLM call has to produce 500-2000 words covering N beats under a `must`/`may`/`must_not` envelope, what prompting strategies work? Does inline structural scaffolding (beat headers in the prompt) help or hurt prose quality? How do we prevent the LLM from collapsing the arc into a single long beat or a stilted enumeration of beats? Is there literature on long-form constrained generation we should know about? We are particularly interested in work that combines symbolic constraints with LLM rendering at scenes longer than a paragraph.

### 7. Validation of multi-beat arcs

We need post-render validation that the rendered prose actually played out the arc — respected the `must_not` clauses, hit the stop condition, produced the declared state effects. What validation strategies exist for declarative narrative units? Is this a model-checking problem? An NLI problem? A dedicated critic-LLM problem? How do existing systems (drama managers, narrative planners) verify that a generated scene matches its author intent?

### 8. Pool-thin runtime generation

When the pre-authored pool has no eligible scene-arc for the current state, the engine needs to generate one just-in-time. This is harder for scene-arcs (whole arc, with envelope and exit seeds) than for beats (one moment). What does the literature say about runtime narrative-unit generation at multi-beat granularity? Are there efficient ways to generate an arc from a partial specification (target commitment + entry state) without producing full author-quality YAML?

### 9. Author tooling implications

Our current pool-authoring skill is an LLM-driven batch authoring tool that produces beat storylets with a 9-gate validation suite. Pivoting to scene-arc granularity means each authored unit is larger and richer. What does the storylet-authoring literature say about the cognitive load on (LLM or human) authors when units grow from beats to arcs? Are there proven authoring patterns (templates, partials, beat libraries shared across arcs) that mitigate the per-unit cost?

### 10. Comparative architectures we should evaluate against

Please survey and compare to: Versu (Richard Evans, Emily Short); Façade (Michael Mateas, Andrew Stern); Ink and the inkle Studios stack; ChoiceScript and Choice of Games' "delayed branching" pattern; StoryNexus / Fallen London quality-based narrative; Cultist Simulator; Sam Kabo Ashwell's interactive-fiction structure taxonomy; Bruno Dias's storylet writing; James Ryan's Bad News, Talking Aliens, and Hennepin; AI Dungeon's scene structure; Idyll / Spirit AI's character-authoring frameworks. For each: what is their unit of authoring? How is choice cadence determined? What is the runtime generation contract? Where does our scene-arc proposal align or diverge?

### 11. Choice poetics and meaningful-choice cadence

The previous report cited Mawhorter et al. ("choice poetics"), Cardona-Rivera et al. ("Foreseeing Meaningful Choices"), Iten/Steinemann/Opwis (CHI work on meaningful choices), Yin/Xiao 2022, and Green/Appel on narrative transportation. We want you to go deeper here: full citations with venues, follow-up papers, replication or critique of these findings, and any work specifically on choice cadence (decisions per minute / per word / per beat) in narrative-rich games. Is there empirical evidence on what choice cadence produces the highest perceived agency and narrative immersion?

### 12. Token cost optimization

We are LLM-cost sensitive. The pivot to scene-arc reduces calls per scene by ~4x. What further optimizations exist for LLM-driven narrative engines? Caching? Hierarchical prompting? Distillation of common rendering operations into smaller models? Are there published architectures combining symbolic state with LLM rendering that have published cost numbers we can benchmark against?

## Out of scope

Please do not spend research effort on:

- Graphics, animation, voice, or audio systems. We render only prose.
- Combat systems, puzzle systems, or mechanical-game subsystems. We have none.
- Multiplayer or networked play. The system is single-user.
- Generic LLM-prompting tutorials. We are competent prompt engineers; we want narrative-architecture and storylet-system research, not "how to write a good prompt."
- Tooling-level specifics for any particular IDE, language, or library. The architecture should be expressible in any reasonable backend.
- Migration paths for existing stories. We have one test story we will discard. The redesign is forward-only.

## What we are looking for in your response

A research report (markdown is fine) that:

1. **Cites specific academic papers** with title, authors, year, venue, and a one-paragraph relevance note. We will read the papers; we don't need full summaries, just enough to know which ones matter.
2. **Surveys specific implementations** (named systems, with links where source is available) and characterizes their unit of authoring and choice cadence.
3. **Pressure-tests the scene-arc-storylet pivot.** If beat-granularity-plus-something is actually better, or if a third architecture beats both, tell us. Do not assume our direction is correct.
4. **Recommends concrete design vocabulary** for `execution_envelope`, `stop_conditions`, and `exit_choice_seeds` based on what has worked in published systems.
5. **Flags research gaps** — questions where the literature is silent and we will have to make judgment calls on our own.
6. **Identifies the 3-5 highest-leverage decisions** in this design space, in your assessment.

Optional but valued: open-source codebases we can read, working prototypes we can study, and any researchers we should contact directly.

Thank you. The output of this research will directly shape the spec set we write next.
