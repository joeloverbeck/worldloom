# **Proposal: replace beat choices with scene-commitment arcs**

Your scene-arc pivot is the right direction, but I would tighten the concept. The core unit should not be “a scene” in the loose prose sense, and it should not be “N beats glued together.” It should be a **scene-commitment arc**: one selected player commitment carried through a dramatic unit until it is satisfied, blocked, overturned, or reaches a new commitment hinge.

The current problem is not that Phase 8 needs better labels. It is that Phase 8 is being asked to manufacture agency at points where the story has no real agency to offer. Your evidence is damning: 30 choices over 8 pages, `likely_effects` empty in every record, and late choices collapsing into gestures, silence, verbal register, and posture rather than strategically different downstream situations. The current system emits 4–6 choices after every 500–1500-word page, so it structurally forces a menu every beat whether or not the story has reached a meaningful hinge.

The strongest external confirmation comes from quality-based narrative practice itself. Failbetter described StoryNexus/QBN as a compromise between branching and world-model approaches, but also explicitly noted that the setup-choice-result rhythm is “staccato” and hard for longer dramatic scenes. Emily Short’s storylet writing emphasizes that a storylet is not inherently one fixed size: it is content with prerequisites and effects, and may be a line, section, dialogue chunk, or larger unit. So the literature and practice support your instinct: **storylet granularity is authorial policy, not an immutable law.**

My recommendation:

**Make choice emission a validated consequence of a scene-level commitment hinge, not a default page-cycle output.**  
 Beat-level acting decisions become internal execution tactics inside an arc. Menus appear only when the user can choose among meaningfully distinct next commitments with different expected state trajectories.

---

## **1. The architecture I would build**

### **Core model**

Use four separate concepts:

| Concept | Purpose | Authoritative? |
| ----- | ----- | ----- |
| `SLT` / scene-commitment arc | Authorable template for a multi-beat dramatic unit | Yes |
| `CHC` / commitment choice | User-facing option that selects a next commitment, not a gesture | Yes |
| `PG` / arc run page | Realized page: prose render + selected arc + deterministic state patch | Yes |
| `ARC_TRACE` / render trace | Extracted beat evidence for validation/debugging | Optional, not continuity-authoritative |

This preserves your non-negotiables: append-only records, branch isolation, replay equality, HARD-GATE approval, mystery firewall, world/story canon separation, and “LLM is never the continuity database.” Those constraints are already explicit in the brief. They also align with the broader Worldloom discipline: story bundles are story-local derived layers, while world canon remains separate and patch-gated.

The page becomes “one committed arc rendered as prose,” not “one beat plus menu.” The choice becomes “what strategic commitment should the protagonist make next?”, not “what tiny thing do they do now?”

---

## **2. The key fix: a choice-emission gate**

Do **not** ask the LLM, “What choices should the user have now?” That question is too permissive. The LLM will always find gestures, tones, silences, and micro-questions because language makes everything feel like a choice.

Ask this instead:

**Has the story reached a commitment hinge?**

A menu may be emitted only when all of these are true:

1. The current arc is complete, blocked, overturned, or about to cross an interruption boundary.  
2. There are at least two viable next commitments.  
3. Those commitments differ on strong downstream axes, not merely surface performance.  
4. Each displayed choice has non-empty expected state consequences.  
5. Each choice has continuation capacity: an eligible authored arc, a valid JIT arc plan, or a declared synthesis route.  
6. The user can prospectively understand why the options differ.

This is directly supported by “meaningful choice” work. Cardona-Rivera et al.’s *Foreseeing Meaningful Choices* argues that choices contribute to agency when they lead to meaningfully different content, and their experiment found higher perceived agency when choices differed in the situation they produced. Choice poetics similarly treats choices through the relationship among options, outcomes, and player goals, not through local action labels.

### **Strong axes for meaningful difference**

A candidate choice is choice-worthy only if it changes at least one strong axis, and a menu is healthy only if the menu’s options differ across at least two strong axes overall.

Strong axes:

| Axis | Examples |
| ----- | ----- |
| Relationship trajectory | trust, intimacy, fear, debt, respect, dependency |
| Obligation state | create, accept, defer, refuse, discharge, complicate |
| Information posture | reveal, conceal, investigate, misdirect, confess, test |
| Risk/cost exposure | accept danger, avoid danger, transfer cost, spend resource |
| Route/scene type | stay, leave, escalate, de-escalate, seek third party, change venue |
| Thread pressure | threat rises/falls, deadline advances, antagonist gains/loses initiative |
| Irreversibility | public commitment, promise, betrayal, exit, exposure |
| Character intention | protagonist adopts a new goal; NPC adopts a new goal |

Weak axes are not enough:

| Weak axis | Treatment |
| ----- | ----- |
| Gesture | execution tactic |
| Silence vs one sentence | execution tactic unless it changes information/relationship state |
| Tone/register | style directive |
| Posture/distance | execution envelope detail unless it changes safety, consent, threat, or exit |
| “Ask gently” vs “ask carefully” | merge |
| “Wait” vs “hold silence” | merge unless waiting burns a deadline or lets NPC choose a route |

Your sample “Hold the silence” choice is morally precise, but unless it changes an obligation, relationship axis, information posture, risk level, route, or future eligibility, it belongs inside the arc envelope as `may: allow_silence`, not in the menu.

---

## **3. The exact LLM instruction for detecting whether choices should be emitted**

Use this as the governing instruction for the choice-surface stage.

You do not emit choices because a page ended.

First classify the narrative point as exactly one of:

1. CONTINUE_ARC  
  The current commitment is still playing out. No menu is allowed.  
  Continue rendering inside the active scene-commitment arc.

2. NATURAL_COMMITMENT_HINGE  
  The current commitment has reached a natural close:  
  satisfied, blocked, overturned, refused, completed, or transformed.  
  A menu may be emitted only if at least two next commitments pass the  
  choice-worthiness test.

3. INTERRUPT_HINGE  
  Continuing would cross an irreversible boundary, violate the execution  
  envelope, force a major cost, trigger an urgent obligation, resolve or  
  endanger a protected mystery, or require the protagonist to adopt a new  
  commitment. A menu is required.

4. CONTINUE_ONLY_PAUSE  
  The prose/page may pause for readability or author approval, but there  
  is only one plausible next commitment. Emit no menu; offer Continue only  
  if the interface requires an affordance.

5. TERMINAL_OR_CHAPTER_CLOSE  
  The branch, chapter, or sequence has closed.

A choice menu is valid only when all displayed options are strategic  
commitments, not micro-actions.

Reject as menu options:  
- gestures  
- posture changes  
- silence versus speech variants  
- tone/register variants  
- single-line phrasings  
- local tactical variations of the same strategy  
- options that produce the same next dramatic situation  
- options whose only effect is `intention` without an externally relevant  
 relationship, obligation, information, risk, route, thread, or resource change

Convert rejected micro-options into:  
- `execution_envelope.allowed_tactics`  
- `execution_envelope.style_directives`  
- `beat_plan.optional_tactics`  
- prose variation notes

For every surviving choice, provide:

- `commitment_class`  
- `player_intent`  
- `strategic_question_answered`  
- `expected_state_delta`  
- `likely_effects`  
- `continuation_arc_selector`  
- `why_this_is_not_a_microbeat`  
- `why_the_user_can_foresee_the_difference`

Then enforce it deterministically. The LLM can propose and explain; it should not be trusted to decide alone.

---

## **4. Revised `SLT` schema**

Your sketched schema is close, but `must` / `may` / `must_not` is too blunt. The word “must” conflates “always true throughout the arc” with “must occur at least once.” Split those.

id: SLT-0421  
shape: scene_commitment_arc  
status: authored | jit_draft | promoted  
provenance:  
 authored_by: llm_skill | human | jit_runtime  
 created_at_page: null  
 branch_scope: global_pool | branch_local  
 source_choice: CHC-0172

arc_contract:  
 commitment_class: stay_available_without_pressure  
 actor: STENT-0001  
 target: STENT-0002  
 player_intent: >  
   Stay present and available without pressing her for explanation,  
   control, confession, or contact.  
 strategic_question_answered: >  
   Does Jon respond to her distress by offering space, pressing for  
   information, intervening materially, or withdrawing?  
 commitment_scope: scene  
 success_policy: uncontested | contested | costly | uncertain  
 allowed_outcome_band:  
   - succeeds  
   - partially_succeeds

dramatic_unit:  
 scene_question: >  
   Will she accept his non-invasive availability enough to choose  
   the next movement herself?  
 entry_pressure:  
   thread: THR-0008  
   description: >  
     She has just made a visible body-level decision but has not  
     converted it into speech or request.  
 value_delta_target:  
   relationship:  
     axis: trust_without_pressure  
     direction: increase_small  
   thread_pressure:  
     id: THR-0008  
     direction: stabilize  
 natural_close_definition: >  
   The arc closes when she makes a demand, disclosure, exit,  
   refusal, or reciprocal gesture that creates the next commitment hinge.

preconditions:  
 all:  
   - predicate: relationship_axis_at_least  
     args: {relationship: SREL-0003, axis: basic_safety, value: 1}  
   - predicate: thread_open  
     args: {thread: THR-0008}  
   - predicate: mystery_not_resolved  
     args: {mystery: M-0002}

participants:  
 required: [STENT-0001, STENT-0002]  
 optional: []  
location_policy:  
 allowed_locations: [STLOC-0004]  
 may_change_location: false

beat_plan:  
 mode: ordered_soft  
 min_beats: 3  
 max_beats: 6  
 beats:  
   - id: B1  
     function: reestablish_shared_physical_context  
     required: true  
     state_significance: none  
   - id: B2  
     function: let_target_set_pace  
     required: true  
     state_significance: relationship_axis_evidence  
   - id: B3  
     function: offer_one_low-pressure acknowledgment  
     required: false  
     state_significance: possible_trust_shift  
   - id: B4  
     function: target_makes_next_move  
     required: true  
     state_significance: stop_condition_candidate

execution_envelope:  
 invariants:  
   - maintain_non_crowding_distance  
   - do_not_take_control_of_scene  
 required_functions:  
   - target_gets_first_substantive_next_move  
 allowed_tactics:  
   - step_back  
   - allow_silence  
   - answer_briefly_if_asked  
   - mirror_one_concrete_detail  
 prohibited_actions:  
   - touch_target  
   - ask_about_bruise  
   - multiply_offers  
   - block_exit  
   - narrate_target_internal_state_as_fact  
 style_directives:  
   - prose_may_include_silence  
   - avoid_menu-like enumeration of beats  
   - keep interiority anchored in known state, not guesses  
 mystery_preservation:  
   forbidden_resolutions:  
     - M-0002  
   allowed_claims:  
     - apparent  
     - branch_local_counterfactual

stop_policy:  
 normal_exits:  
   - id: target_makes_demand  
     predicate: npc_makes_demand  
     args: {npc: STENT-0002}  
   - id: target_discloses_limited_fact  
     predicate: new_story_fact_claimed  
     args: {speaker: STENT-0002, safety: allowed}  
   - id: target_exits_or_invites_exit  
     predicate: participant_changes_scene_continuation  
     args: {participant: STENT-0002}  
 interrupt_before:  
   - id: irreversible_contact_imminent  
     predicate: next_required_action_would_violate  
     args: {prohibition: touch_target}  
   - id: forbidden_mystery_pressure  
     predicate: render_path_risks_mystery_resolution  
     args: {mystery: M-0002}  
 safety_valves:  
   max_internal_beats: 6  
   max_words: 1800

effect_model:  
 selected_before_render: true  
 required_effects:  
   - type: relationship_axis_shift  
     id: SREL-0003  
     axis: trust_without_pressure  
     delta: +1  
     magnitude: small  
   - type: thread_pressure_delta  
     id: THR-0008  
     delta: -1  
     magnitude: small  
 forbidden_effects:  
   - type: mystery_resolution  
     id: M-0002  
   - type: world_canon_mutation

exit_portfolio:  
 native_seeds:  
   - id: tighter_aid  
     commitment_class: offer_practical_help  
     strategy_cluster: practical_external_help  
     expected_state_delta:  
       obligation: create_or_accept  
       relationship: trust_test  
     continuation_arc_selector:  
       include_tags: [aid, practical, consent_sensitive]  
   - id: gentle_investigation  
     commitment_class: ask_one_bounded_question  
     strategy_cluster: information_request  
     expected_state_delta:  
       information_posture: ask  
       relationship: risk_pressure  
     continuation_arc_selector:  
       include_tags: [question, bounded, fragile_trust]  
   - id: release_pressure  
     commitment_class: withdraw_without_abandoning  
     strategy_cluster: deescalation  
     expected_state_delta:  
       route: exit_or_pause  
       relationship: respect_boundary  
     continuation_arc_selector:  
       include_tags: [withdrawal, boundary_respect]  
 engine_discovered_exit_budget:  
   min: 0  
   max: 2  
   allowed_sources:  
     - urgent_obligation  
     - high_salience_thread  
     - unresolved_consequence  
     - user_write_in  
 menu_policy:  
   min_distinct_commitments: 2  
   max_displayed_choices: 4  
   require_likely_effects: true  
   require_strong_axis_difference: true

The important additions are:

* `arc_contract`: what the user actually chose.  
* `dramatic_unit`: why this is a scene-level unit.  
* `beat_plan`: soft internal structure, not menu structure.  
* `execution_envelope`: split into invariants, required functions, allowed tactics, prohibitions, and style directives.  
* `stop_policy`: separates normal exits from interrupt-before exits.  
* `effect_model.selected_before_render: true`: protects replay equality.  
* `exit_portfolio`: hybrid authored + engine-discovered exits.

The `effect_model` should be selected before prose rendering, not inferred afterward. The prose is then validated against the selected effect model. If the LLM invents a different result, revise the prose; do not mutate state to fit the prose. This is essential because Worldloom’s foundations already insist that LLM agents must not operate on prose alone and that state lives in structured, retrievable records.

---

## **5. Revised `CHC` schema**

A `CHC` should no longer carry beat execution constraints. It should carry the user’s next commitment and a selector for compatible arcs.

id: CHC-0180  
emitted_at_page: PG-0042  
choice_kind: scene_commitment  
label: "Offer one practical thing she can refuse."  
commitment_class: offer_practical_help  
strategy_cluster: practical_external_help

choice_contract:  
 actor: STENT-0001  
 target: STENT-0002  
 player_intent: >  
   Shift from passive availability to one concrete offer of help,  
   while preserving her right to refuse it.  
 guaranteed_action: >  
   Jon makes exactly one practical offer, framed as optional.  
 success_policy: contested  
 allowed_outcome_band:  
   - accepted_with_limits  
   - refused_without_break  
   - partially_deflected  
 forbidden_outcomes:  
   - Jon pressures her for explanation  
   - Jon treats refusal as ingratitude  
   - Jon touches her without consent

choice_worthiness:  
 strategic_question_answered: >  
   Does Jon move from availability into practical intervention?  
 strong_axes:  
   - obligation_state  
   - relationship_pressure  
   - route_or_scene_type  
 expected_state_delta:  
   obligation:  
     possible: [create_low_pressure_offer, refusal_closes_offer]  
   relationship:  
     possible: [trust_test, pressure_risk]  
   thread:  
     possible: [stabilize_if_accepted, stall_if_refused]  
 why_not_microbeat: >  
   This is not a wording variant. It changes Jon's role in the scene  
   from witness to potential helper and opens different continuation arcs.  
 foreseeable_difference: >  
   The user can tell that this choice risks pressure but may create  
   practical aid; it differs from asking questions or withdrawing.

likely_effects:  
 - type: obligation_status_change  
   candidates: [OBL-new-practical-help, OBL-offer-refused]  
 - type: relationship_axis_shift  
   relationship: SREL-0003  
   axis: trust_under_pressure  
   possible_delta: [-1, +1]  
 - type: continuation_arc_eligibility  
   include_tags: [aid, consent_sensitive, practical]

continuation_capacity:  
 authored_arcs:  
   - SLT-0422  
   - SLT-0440  
 jit_allowed: true  
 jit_template_fallback: practical_offer_fragile_trust

This keeps the user’s commitment authoritative without pushing all execution details back onto every choice. The choice is not merely a pointer; it is a **semantic contract**. The selected arc must satisfy that contract.

---

## **6. Runtime pipeline**

### **Current pathology**

Your current pipeline effectively says:

1. Render a beat.  
2. Emit a menu.  
3. Hope the menu contains real agency.

That is backwards.

### **Proposed pipeline**

1. **Resolve selected commitment.**  
    The selected `CHC` identifies a commitment class and strategy cluster.  
2. **Select or synthesize a scene-commitment arc.**  
    Deterministically filter eligible `SLT` records by branch-local state, preconditions, mystery safety, participants, location, obligation relevance, and continuation capacity.  
3. **Select effect variant before prose.**  
    Pick the allowed outcome/effect package before render. Store the arc ID and effect variant in the pending page transaction.  
4. **Render the full arc.**  
    One LLM call renders the multi-beat prose under the arc contract, beat plan, and execution envelope.  
5. **Extract observed trace.**  
    A critic or extraction model produces `ARC_TRACE`: events, touched facts, possible violations, stop condition evidence, and state-effect evidence.  
6. **Validate.**  
    Deterministic validators check schema, preconditions, forbidden mysteries, branch isolation, effect legality, continuation capacity, and whether the trace supports the selected effect model.  
7. **Revise or fail.**  
    If prose violates the envelope, revise prose. If the arc itself cannot satisfy the selected commitment, fail and select another arc. Do not silently alter continuity to fit prose.  
8. **Commit page and state patch after HARD-GATE.**  
    Writes route through the existing story-bundle patch discipline; direct mutation of atomic story records remains forbidden.  
9. **Run choice-surface gate.**  
    If a commitment hinge exists and at least two choices pass the strong-axis test, emit a menu. Otherwise emit `Continue` or auto-chain according to runtime mode.

This gives you the cost reduction you want: one render call per dramatic unit, not 4–5 full page cycles per scene. Your brief already identifies this as the central advantage of the pivot.

---

## **7. Stop conditions: use a small predicate DSL, not temporal logic**

Do not use full temporal logic unless you want the authoring system to become a theorem-proving hobby project.

Use three stop classes:

stop_policy:  
 normal_exits:       # scene has naturally completed  
 interrupt_before:   # continuing would steal agency or violate constraints  
 safety_valves:      # max beats/words/time, fallback exits

Each stop condition should be a first-order predicate over:

* story state,  
* selected commitment,  
* arc-local trace,  
* mystery safety,  
* effect model,  
* participant/location changes.

This is close to Inform 7’s scene model, where scenes start and end when conditions become true, and scenes may overlap. It is also compatible with ChoiceScript and Ink practice, where screen breaks, gathers, diverts, and page breaks can structure reading without always creating a choice. ChoiceScript’s `*page_break` explicitly creates a Next button without radio-button choices, and Ink’s diverts can move automatically between knots.

Recommended stop predicates:

normal_exit_predicates:  
 - commitment_satisfied  
 - commitment_blocked  
 - commitment_overturned  
 - npc_makes_demand  
 - npc_makes_disclosure  
 - participant_exits  
 - scene_goal_resolves  
 - scene_goal_changes  
 - new_obligation_created  
 - open_thread_reprioritized  
 - time_or_location_changes

interrupt_before_predicates:  
 - irreversible_cost_imminent  
 - consent_boundary_imminent  
 - violence_or_harm_imminent  
 - forbidden_mystery_resolution_risk  
 - protagonist_goal_change_required  
 - selected_commitment_would_be_violated  
 - user_write_in_conflicts_with_envelope  
 - only_next_action_would_create_major_state_change

safety_valves:  
 - max_internal_beats_reached  
 - max_words_reached  
 - no_valid_continuation_after_effect  
 - validation_confidence_low

A key distinction: **stop conditions do not always imply a menu.** They imply the current arc must close. A menu still requires at least two choice-worthy next commitments.

---

## **8. Beat-template policy**

Use **ordered soft beat plans** as the default.

Do not use:

* pure script: too rigid, poor reuse, weak runtime adaptation;  
* arbitrary DAG: too much authoring overhead;  
* beat-by-beat runtime storylets: recreates the pathology.

The beat plan should express dramatic functions, not prose instructions:

beat_plan:  
 mode: ordered_soft  
 beats:  
   - function: orient_scene_after_choice  
   - function: apply_commitment_under_pressure  
   - function: reveal_resistance_or_response  
   - function: register_cost_or_shift  
   - function: close_on_new_hinge

This matches the useful part of traditional scene theory: a scene is a pressure unit with an intention, conflict/resistance, and turn. Craft models differ in vocabulary—Swain’s goal-conflict-disaster / reaction-dilemma-decision, Mamet’s “who wants what?” pressure, McKee’s value shift—but they converge on this: **a scene is not a sequence of gestures; it is a unit of changed pressure.**

The LLM should never output beat headers in final prose unless your house style wants visible sectionalization. Beat headers belong in the prompt and trace, not in the rendered story. Otherwise the prose becomes a checklist.

---

## **9. Exit choices: hybrid, not fully authored**

Your idea that `exit_choice_seeds` should be authored alongside the arc is directionally good, but dangerous if taken literally.

If every arc has to enumerate every plausible exit, you will create:

* authoring bottlenecks,  
* brittle local menus,  
* graph explosion,  
* missed obligations,  
* weak response to emergent state.

Use a **hybrid exit portfolio**:

1. **Native exits** authored with the arc.  
    These are the most dramatically coherent next moves.  
2. **Engine-discovered exits** from urgent obligations, consequences, threads, relationship states, and user write-ins.  
    These prevent the authored arc from ignoring live state.  
3. **JIT commitment synthesis** when no authored arc exists.  
    This should generate a minimal valid arc from a template, not a full author-quality bundle in one leap.  
4. **Write-in slot as commitment synthesis, not immediate beat execution.**  
    A write-in should be classified into a commitment class, validated, then resolved into an arc.

This matches what QBN systems are good at—state-driven availability—without inheriting their staccato rhythm. Emily Short describes QBN as using qualities/variables to gate storylets, and notes both its modular strengths and scale challenges. Bruno Dias similarly frames QBN as free-floating storylets qualified by qualities, powerful for worlds and procedural hybrids but demanding in tooling and UI.

---

## **10. Validation strategy**

Treat validation as a three-layer system.

### **Layer 1: deterministic structural validation**

Validate before render:

* SLT schema completeness,  
* preconditions,  
* branch-scope legality,  
* mystery safety,  
* effect legality,  
* continuation capacity,  
* choice-worthiness fields,  
* no world-canon mutation,  
* no sibling branch references.

This aligns with your existing machine-facing layer: indexed records, retrieval API, patch engine, validators, hooks, and append-only write surfaces.

### **Layer 2: post-render trace extraction**

After prose render, ask a critic model to extract:

observed_arc_trace:  
 realized_beats:  
   - beat_function: ...  
     evidence_span: ...  
 observed_actions:  
   - actor: ...  
     action: ...  
     target: ...  
 observed_claims:  
   - claim: ...  
     source: narrator | character | inference  
     canon_status: story_local | apparent | forbidden_risk  
 possible_violations:  
   - envelope_item: ...  
     evidence_span: ...  
 stop_condition_hit:  
   id: ...  
   evidence_span: ...  
 effect_evidence:  
   - effect_id: ...  
     evidence_span: ...

This is similar in spirit to FActScore-style decomposition: break long generation into atomic claims, then check each claim against support. For hallucination-risk detection, SelfCheckGPT-style sampling can also be useful as a secondary signal, though I would not rely on it as the primary validator.

### **Layer 3: semantic conformance checks**

Use critic/NLI checks for questions deterministic validators cannot answer cheaply:

* Did the prose imply forbidden knowledge?  
* Did the protagonist violate the selected commitment?  
* Did the NPC’s behavior contradict known relationship state?  
* Did the prose actually reach the declared stop condition?  
* Did the arc collapse into one undifferentiated long beat?  
* Did it become a stilted enumeration of the beat plan?

Validation outputs should be:

validation_result:  
 status: pass | revise_prose | reject_arc | split_arc | promote_interrupt  
 reasons: [...]  
 required_revision_constraints: [...]

`split_arc` is important. If one arc contains two separate commitment hinges, it is too large. If it contains no pressure turn, it is too small or inert.

---

## **11. Pool-thin runtime generation**

When the pool has no eligible scene-commitment arc, do not ask the LLM to invent an entire polished SLT from scratch.

Use a template cascade:

1. Classify the selected commitment.  
2. Select an arc archetype.  
3. Fill only the minimum viable fields.  
4. Validate.  
5. Render.  
6. Mark provenance as `jit_draft`.  
7. Cache the draft.  
8. Promote later only after author review.

Example archetype library:

arc_archetypes:  
 - fragile_offer  
 - bounded_question  
 - confession_received  
 - refusal_and_aftercare  
 - practical_aid_attempt  
 - withdrawal_without_abandonment  
 - escalation_to_confrontation  
 - concealment_under_pressure  
 - third_party_intervention  
 - investigation_followup  
 - aftermath_processing  
 - route_change  
 - public_commitment  
 - private_betrayal

This borrows the sensible part of narrative planning—goal, preconditions, effects, causal progression—without forcing full IPOCL-style planning into every scene. Riedl and Young’s narrative planning work is valuable because it stresses causal progression and character intentionality, but importing full narrative planning would overcomplicate your authoring stack.

---

## **12. Comparative architecture lessons**

| System | Unit of authoring | Choice cadence | Lesson for Worldloom |
| ----- | ----- | ----- | ----- |
| **StoryNexus / Fallen London / QBN** | Cards/storylets gated by qualities; often short setup-choice-result chunks | Frequent, card/storylet-driven | Great state gating; bad if copied at beat cadence. Failbetter’s own note about staccato rhythm is directly relevant. |
| **Storylets design space** | Reorderable chunks/modules selected by state, salience, search, or DM | System-dependent | Storylet size is flexible. You are allowed to make storylets multi-beat. |
| **Cultist Simulator / resource narrative** | Resources, verbs, timers, recurring situations | Player acts through resource combinations | Useful lesson: model pressures and resources; do not fake agency through prose micro-options. |
| **Ink** | Knots, stitches, gathers, diverts, choices | Author-controlled | Strong precedent for separating flow breaks from choices; automatic diverts are your friend. |
| **ChoiceScript** | Linear text plus choices, variables, page breaks | Author-controlled | `*page_break` proves a UI pause is not necessarily a choice point. |
| **Inform 7 scenes** | Named scenes with start/end conditions | World-state driven | Strong model for `normal_exit` / `interrupt_before` predicates. |
| **Façade** | Thousands of reactive behaviors organized into drama-manager beats | Real-time micro-interaction | Brilliant but wrong default for your cost model; beat-level responsiveness is expensive. |
| **Versu** | Social practices, autonomous agents, affordances | Player may act or let NPCs act | Useful for “More/Act” cadence and NPC autonomy, but too simulation-heavy as your core. |
| **Search-based drama management** | Plot points, DM actions, evaluation functions | DM adjusts story trajectory | Useful for ranking/prioritizing arcs, not for prose generation. |
| **IDtension** | Narrative goals/actions interpreted by an engine | Many meaningful narrative actions | Good warning: expressive formalism can become authorially heavy. |
| **AI Dungeon-style LLM play** | User action + model continuation + memory/context systems | Usually every turn | Good at improvisation, weak at authoritative continuity. AI Dungeon’s memory/story-card machinery is context support, not a deterministic continuity database. |

---

## **13. Papers worth reading**

### **Max Kreminski and Noah Wardrip-Fruin, “Sketching a Map of the Storylets Design Space,” ICIDS 2018**

This is the most directly relevant storylet paper. It treats storylet systems as discrete, reorderable content chunks whose availability depends on state, and surveys dimensions such as internal structure, selection method, and gating. The key takeaway for you: storylet size and internal structure are design variables, not fixed laws.

### **Rogelio E. Cardona-Rivera, Justus Robertson, Stephen G. Ware, Brent Harrison, David L. Roberts, and R. Michael Young, “Foreseeing Meaningful Choices,” AIIDE 2014**

This paper should directly inform your choice-worthiness validator. It formalizes meaningful choice in terms of whether options lead to different situational content. Your current late-page choices fail exactly this test.

### **Peter Mawhorter, Michael Mateas, Noah Wardrip-Fruin, and Arnav Jhala, “Towards a Theory of Choice Poetics,” FDG 2014**

Useful as the conceptual framework for menu evaluation. It moves analysis away from “are these actions different?” toward “what poetic effects arise from options, outcomes, and player goals?”

### **Peter Mawhorter, Carmen Zegura, Alex Gray, Arnav Jhala, Michael Mateas, and Noah Wardrip-Fruin, “Choice Poetics by Example,” *Arts*, 2018**

More applied than the FDG paper. Read this when designing the menu critic: prospective reading, retrospective outcome, player goals, responsibility, regret, and agency should become explicit evaluation fields.

### **Glena H. Iten, Sharon T. Steinemann, and Klaus Opwis, “Choosing to Help Monsters: A Mixed-Method Examination of Meaningful Choices in Narrative-Rich Games and Interactive Narratives,” CHI 2018**

Relevant for empirical grounding around meaningful choices, appreciation, enjoyment, and narrative engagement. It does not give a universal cadence number, but it reinforces that meaningfulness matters more than raw option frequency.

### **Richard Evans and Emily Short, “Versu—A Simulationist Storytelling System,” *IEEE Transactions on Computational Intelligence and AI in Games*, 2014**

Read for social practices, autonomous character behavior, and the UI distinction between acting and letting other agents act. Do not copy the whole architecture unless you want a social simulation platform.

### **Michael Mateas and Andrew Stern, “Structuring Content in the Façade Interactive Drama Architecture,” AIIDE 2005**

Read as a warning and inspiration. Façade shows how beat-level drama management can work, but it required thousands of authored behaviors and a reactive planning stack. Your prose system should not pay that cost.

### **Mark J. Nelson and Michael Mateas, “Search-Based Drama Management in the Interactive Fiction Anchorhead,” AIIDE 2005**

Relevant for arc ranking and drama-manager evaluation functions. Less relevant for deciding every micro-action.

### **Mark O. Riedl and R. Michael Young, “Narrative Planning: Balancing Plot and Character,” *Journal of Artificial Intelligence Research*, 2010**

Useful for thinking about causal soundness and character intentionality. Use its principles, not necessarily its machinery.

### **Mieke Bal / Gérard Genette / Seymour Chatman / classical narratology**

Read for discourse/story separation and event hierarchy, but expect less direct implementation guidance. Your more practical bridge is computational narrative + IF craft.

### **Lili Yao et al., “Plan-and-Write: Towards Better Automatic Storytelling,” AAAI 2019**

Useful for prompting: generate a plan/storyline first, then prose. Your `beat_plan` → render pipeline is a symbolic/LLM version of this hierarchical generation idea.

### **Angela Fan, Mike Lewis, and Yann Dauphin, “Hierarchical Neural Story Generation,” ACL 2018**

Useful background for separating premise/outline generation from prose realization. This supports your move toward arc-level planning before prose.

### **Ximing Lu et al., “NeuroLogic Decoding: Unsupervised Neural Text Generation with Predicate Logic Constraints,” NAACL 2021**

Worth reading for constraint satisfaction ideas, though you probably do not need constrained decoding in v1. Your constraints are better enforced through prompting + post-render validation unless you need hard lexical constraints.

### **Sewon Min et al., “FActScore: Fine-grained Atomic Evaluation of Factual Precision in Long Form Text Generation,” EMNLP 2023**

Important for validation design: atomize prose claims and check them against known support. Adapt the idea to story state, canon, mystery safety, and selected arc effects.

### **Jialin Sun et al., “Drama Llama: Low-Resourced Storylet Authoring Through Character-Based Narrative Planning,” 2025**

Worth reading because it explicitly combines LLMs with storylets for open-ended interactive stories. It is recent and close to your problem space, though you should still treat it as emerging work rather than settled practice.

---

## **14. Source-available implementations to inspect**

| Project | Why inspect it |
| ----- | ----- |
| **Ink / inkle** | Best practical model for controlled text flow, knots, stitches, gathers, diverts, and author-controlled choice cadence. |
| **ChoiceScript** | Useful for delayed branching and the distinction between page breaks and actual choices. |
| **TinyQBN** | Twine/SugarCube storylets library; good minimal example of state-gated storylet availability. |
| **SimpleQBN** | Generic JavaScript QBN library; useful for clean availability/state logic. |
| **StoryAssembler** | Dynamic choice-based narrative engine with gated choices, state-driven progression, and templated roles/qualities. |
| **storylets-rs** | Small Rust storylet engine inspired by StoryNexus; useful if you want a compact engine-side availability model. |

StoryNexus itself is no longer a practical tool to study hands-on; Failbetter announced the shutdown of StoryNexus worlds for late January 2026 after many years in maintenance, and IFWiki also lists it as unavailable.

---

## **15. Token-cost optimization beyond scene arcs**

The scene-arc pivot is the biggest win. After that, the next savings come from removing unnecessary LLM discretion.

Recommended optimizations:

1. **Deterministic arc eligibility.**  
    Do not ask the LLM what storylets are eligible. Use the predicate DSL and index.  
2. **Small-model label rendering.**  
    Menu labels are cheap. The large model should not be used unless labels need literary precision.  
3. **Cache context packets by branch hash.**  
    Your state is append-only and replayable, which makes branch-hash caching natural.  
4. **Cache arc render packets.**  
    Precompile the minimal packet needed for a given `SLT`: relevant participants, facts, obligations, relationships, mysteries, and style constraints.  
5. **Use retrieval projections, not full record dumps.**  
    Your Foundations already describe targeted retrieval and context-packet slices; lean into that.  
6. **Two-pass prose only when needed.**  
    Runtime mode can use one render + cheap validator. Authoring mode can use render + critic + revision + HARD-GATE.  
7. **Promote JIT arcs.**  
    If a JIT arc validates and works, cache it as `jit_draft`; after approval, promote it to the authored pool.  
8. **Separate prose validation from state validation.**  
    State validation must be hard. Prose quality validation can be sampled, tiered, or skipped in low-cost runtime mode.  
9. **Deduplicate choice candidates by commitment signature before label rendering.**  
    Never spend label tokens on five versions of “be quiet near her.”

---

## **16. The research gap**

There is no robust universal empirical answer for “how many choices per minute/word maximizes immersion.” The good empirical work is about meaningfulness, agency, appreciation, engagement, and outcome distinctness, not a single cadence number. Cardona-Rivera et al., Mawhorter et al., and Iten/Steinemann/Opwis all help you evaluate whether choices matter; they do not tell you “one choice every X words.”

So cadence must be treated as a design invariant, not a literature-derived constant:

cadence_policy:  
 default_min_words_between_menus: 1200  
 preferred_words_per_arc: [700, 2000]  
 max_arcs_without_menu_soft: 2  
 max_words_without_player_commitment_soft: 3500  
 allow_continue_only_pages: true  
 force_menu_only_on_interrupt_hinge: true

Those numbers are starting defaults, not truths. The real invariant is:

**Never offer a menu unless the options change the future shape of the scene, sequence, relationship, obligation, information state, or risk profile.**

---

## **17. Highest-leverage decisions**

### **1. Define the unit of agency as commitment, not action**

This is the whole game. If the system thinks agency means “what exact thing does the protagonist do next?”, it will always collapse into beat granularity. If it thinks agency means “what commitment do we now follow through?”, the scene can breathe.

### **2. Make choice emission a gate, not a habit**

Menus should be earned. A false menu is worse than a `Continue` button because it trains the user that choices are decorative.

### **3. Select effects before prose**

Do not let generated prose decide continuity. The selected arc/effect variant is authoritative; prose must conform or be revised.

### **4. Use hybrid exits**

Author native exits, but let obligations, consequences, and threads inject additional exits. Fully authored exits are too brittle; fully generated exits are too noisy.

### **5. Keep the DSL small**

Use predicates, not full-blown temporal logic or planner formalisms. Complex AI narrative systems are impressive, but many collapse under authoring complexity. Façade and Versu are instructive partly because they show the cost of richer simulation.

---

## **Final design stance**

Keep the scene-arc storylet pivot, but rename it internally to **scene-commitment arc** so the team does not accidentally author “long beats.” The design should revolve around this invariant:

**A page renders the consequences of one selected commitment.**  
 **A menu appears only when the next commitment is genuinely undecided.**

Everything else follows from that. Beat templates become internal scaffolding. `must/may/must_not` becomes a more precise envelope. `exit_choice_seeds` become a hybrid exit portfolio. Phase 8 stops being an agency generator and becomes a choice-surface validator. And the LLM is no longer asked to invent choices at places where the story has none.

