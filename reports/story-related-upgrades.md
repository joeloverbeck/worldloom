## **Executive verdict**

Do **not** add act structure, dramatic-phase structure, midpoint logic, climax logic, or any global plot-shape optimizer. Your current direction is fundamentally correct: a branching story should be a **causal state machine with narrative rendering**, not a plot outline with choices stapled onto it.

The strongest parts of your current design are the right ones: world canon outranks story state, story state outranks prose, page plans are authoritative, rendered prose is only a receipt, any committed `PG` snapshot can become a fork point, and every player action routes through world logic rather than being silently rejected. That is exactly the right family of design for internally consistent interactive fiction. Your contract already encodes this in its authority model, schema-minimalism doctrine, plan-authority boundary, branching/rewind procedure, six action routes, and eight shared hard gates.

But I would **not** let production stories start yet. There are several blocking schema and pipeline mismatches that will become painful as soon as the first long branch appears. The biggest issue is not philosophy; it is that the now-settled `story-state-contract.md` and the sibling skill specs still disagree in important places. Fix that first. Then add two structural improvements: replayable entity status, and more expressive reusable predicates for author-pool commitment blocks.

The core proposal: keep the architecture, reject act structure permanently, and harden the story system around **causal replay, social-state propagation, obligation/consequence pressure, mystery authority, and branch-local truth**.

---

## **What the outside research suggests**

The strongest external match for your architecture is not “branching plot”; it is **storylet / quality-based narrative plus causal state validation**. Emily Short describes storylets as small, robust, recombinable narrative units with prerequisites and effects, rather than a fixed branching tree; her quality-based narrative framing uses state variables to unlock content and select salient next material. That maps closely to your `SLT` commitment blocks, `PG` snapshots, visible affordances, preconditions, and effects.

The useful warning from quality-based systems is that not all state should collapse into generic “qualities.” Weather Factory’s critique of flat QBN resources is relevant: story systems need resources, relationships, capabilities, facts, and social states to remain distinct because they behave differently in narrative causality. Your current split into `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STLOC`, `STOBJ`, and `DA` is therefore a strength, not excess complexity.

The most relevant social-simulation precedent is *Comme il Faut* / *Prom Week*. Its authors identify the exact authoring problem you are trying to avoid: if every prior social choice must be hand-accounted for, the state space explodes; if the system limits choices too much, impact feels fake. Their solution was reusable, recombinable social norms and interactions that modify social state. This strongly supports keeping `BEL`, `SREL`, `STINT`, obligations, and consequences as first-class state rather than deriving everything from prose.

Narrative-planning research points in the same direction. Riedl and Young’s IPOCL work argues that understandable narrative requires both causal progression and believable character intentionality. That means every major story transition should be causally supported and every character action should be legible through intentions, beliefs, obligations, or pressure—not through “the plot needs this now.”

Mimesis-style narrative mediation is also relevant, but mostly as a caution. Those systems compare user actions against causal links and either intervene or accommodate/replan when coherence is threatened. Your `accept | accommodate | attempt | world_block | promotion_hold | terminal` routing is the better version for your goals: it preserves player agency by responding inside the fiction instead of steering the player back toward a preplanned dramatic path.

Modern LLM interactive-narrative work reinforces the same lesson. LLMs help interpret and render, but they need state scaffolding. Drama Llama frames storylets plus LLM generation as a way to combine structure with generativity, while SCORE emphasizes dynamic state tracking and retrieval because long-term coherence is a known weakness of LLM-only story generation. That validates your decision to make prose downstream of committed state, not the state engine itself.

So the research-backed stance is: **storylets, social state, causal replay, affordance grounding, and local mediation are good; act structure and global drama-management optimization are wrong for this product.**

---

## **Current architecture: what is already right**

Your present contract has the correct high-level model:

1. **Authority layering is clean.** World canon, story state, and rendered prose are separate, with strict precedence. Prose cannot create state by accident.  
2. **Page snapshots are the right fork primitive.** A branch can advance from any committed `PG`, rendered or not. This is essential for interactive branching because prose-rendering latency should not block state progression.  
3. **Silent rejection is banned.** Every player action produces an event and a world-logic rationale, including impossible actions. This is one of the best design choices in the whole system. It lets the system say “no” diegetically without discarding player agency.  
4. **The eight hard gates are the right kind of gates.** They test legality, parent compatibility, mystery/invariant safety, branch isolation, append-only deltas, consequence capacity, plan grounding, and canon-promotion holds. None of those are dramatic-act gates. They protect coherence, not plot shape.  
5. **Commitment blocks are correctly framed as causal moves.** The skill explicitly says they are not acts, arcs, mini-stories, or plot rails. That should remain non-negotiable.  
6. **The story-to-world promotion path is conceptually sound.** A branch can produce a canon candidate, but world canon mutation routes through proposal, canon adjudication, and closeout rather than letting a branch silently rewrite the world.  
7. **The health audit is the right safety net.** Deterministic replay, branch isolation, debt health, belief/visibility checks, mystery/canon safety, and continuation/terminal proof are exactly the right retrospective checks for a system like this.

The architecture is not the problem. The problem is that some concrete schemas and sibling specs have not caught up with the settled contract.

---

## **P0 fixes before production stories**

### **1. Run a full schema-drift cleanup across every story skill**

This is the highest-priority fix. Right now, the contract and the skills disagree in ways that will break validators, authoring, or replay.

The settled contract uses unpadded integer IDs, `SLT.move_family`, `scope.visibility: global_author_pool | branch_prefix_scoped | branch_scoped`, `exit_options[].action_family`, `CHC.target_or_action_families`, `PG.prose_plan_path`, `PG.prose_path`, and `PG.prose_receipt_path`. But several skill specs still use older forms like `PG-0001`, `BR-0001`, `author_pool`, `purpose`, `exit_options[].intent`, singular `target_or_action_family`, `plan.path`, and `rendered_prose.path`. The contract also defines `BEL.confidence` as `certain | high | medium | low | uncommitted`, while some skill text still implies invalid values like “suspected,” “rumor,” or “performative_lie.”

Fix this as a single mechanical pass:

* Replace all padded examples with unpadded `<integer>` examples.  
* Replace every old `SLT.purpose` reference with `SLT.move_family`.  
* Replace every `author_pool` reference with `global_author_pool`.  
* Replace old action-family examples like `attack | flee | hide | confess` with the contract taxonomy: `move`, `evade`, `pursue`, `perceive`, `investigate`, `communicate`, `persuade`, `negotiate`, `bond`, `oppose`, `harm`, `protect`, `control`, `transfer`, `use`, `make_change`, `ritual_protocol`, `recover`, `wait`, `decide`.  
* Replace `plan.path` / `rendered_prose.path` / `rendered_prose.receipt_path` with `prose_plan_path` / `prose_path` / `prose_receipt_path`.  
* Fix prose receipt references: the contract shows prose receipt in §4.6, while some sibling text refers to §4.5.  
* Make validators reject legacy field names immediately.

This is not cosmetic. Until this is fixed, the system has two story schemas pretending to be one.

### **2. Make entity status replayable**

This is the biggest structural bug.

`PG.state_snapshot.entity_status` tracks each active entity’s `life`, `agency`, and `location`, and the predicate DSL includes `entity_status(...)`. But `SE.state_delta` only lists record IDs in `create`, `supersede`, and `close`. There is no committed record class that represents life/agency/location changes, and `STENT` itself does not contain status fields. Turn-cycle text says deaths, captivity, incapacity, and movement are first-class outcomes, but the current record model does not give replay a clean append-only object to apply.

Add a new story-state record class:

id: STSTAT-<integer>*

story_id: STORY-<integer>*

created_at_page: PG-<integer>*

supersedes: STSTAT-<integer> | null

entity: STENT-<integer>*

life: alive | dead | unknown*

agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown*

location: STLOC-<integer> | unknown | concealed | offstage*

derived_from: [SE-<integer> | <record_id>]

Then:

* Add `STSTAT` to `PG.state_snapshot.active_records`.  
* Define `PG.state_snapshot.entity_status` as a derived projection of active `STSTAT` records.  
* Make `entity_status(...)` predicates read `STSTAT`.  
* On death, captivity, unconsciousness, escape, concealment, or movement, supersede `STSTAT`.  
* Make replay compute entity status from root + deltas, not from unexplained snapshot mutation.

This preserves append-only discipline, makes death/removal truly first-class, and gives audit a real causal chain.

### **3. Add explicit story-fact authority to `SF`**

The contract says story-local resolution-like claims can be `apparent`, `branch_local_counterfactual`, or `canon_candidate`, and says branch-local counterfactuals live as `SF`. But the `SF` schema has only `statement` and `derived_from`; there is no authority field. Closeout and promotion workflows assume authority exists, but the schema does not support it.

Add this to `SF`:

authority: branch_local | branch_local_counterfactual | canon_candidate | canon_linked*

Then make the rules explicit:

* `branch_local`: ordinary branch truth.  
* `branch_local_counterfactual`: true only in this branch and not a world claim.  
* `canon_candidate`: held for promotion; must be paired with `SE.promotion_claims[]`.  
* `canon_linked`: story-local fact has been accepted into world canon and linked by closeout.

This is load-bearing because gate 8, promotion, closeout, and cross-story audits all need it.

### **4. Stop spreading promotion-closeout fields across unrelated schemas**

`story-promotion-closeout` currently wants to supersede `SF`, `BEL`, `DA`, `STENT`, `SREL`, and `BR` records with fields like `promoted_to_cf`, `promoted_via_ch`, `promoted_via_pa`, `canon_limits`, `promotion_rejected`, `contested_authority`, and similar verdict metadata. Those fields are not in the shared contract schemas. If you add them ad hoc to every affected class, schema minimalism is gone.

Better: add one compact crosslink record class.

id: SCX-<integer>*

story_id: STORY-<integer>*

created_at_page: PG-<integer> | null

promotion_id: SP-<integer>*

verdict: accepted | accepted_with_limits | rejected | deferred*

source_records: [<record_id>]*

linked_cf_ids: [CF-<integer>]

linked_ch_ids: [CH-<integer>]

linked_pa_ids: [PA-<integer>]

canon_limits: string | null

authority_after: canon_linked | branch_local_counterfactual | contested | pending*

notes: string | null

Then closeout only needs to supersede the source `SF` when its `authority` changes. The verdict details live in `SCX`, not smeared across every story record class.

This keeps the record model cleaner, makes promotion audits easier, and avoids invalid fields on `BEL`, `DA`, `STENT`, and `SREL`.

### **5. Fix branch status handling**

The contract says `BR` records track branch lineage and “branches fork; they do not supersede.” But closeout wants to supersede `BR` records to flag or archive contradictory same-story branches. That is a direct semantic conflict.

Do not overload `BR`. Add a branch-status record:

id: BRSTAT-<integer>*

story_id: STORY-<integer>*

created_at_page: PG-<integer> | null

supersedes: BRSTAT-<integer> | null

branch_id: BR-<integer>*

status: active | flagged | archived*

reason: string*

derived_from: [SP-<integer> | SAU-<integer> | SE-<integer>]

`BR` remains immutable lineage. `BRSTAT` tracks archive/flag state. This is cleaner and more consistent with append-only state.

---

## **P1 improvements that will materially strengthen branching**

### **6. Add urgency/salience to `OBL` and `CNSQ`**

The health audit talks about high-salience debt, ignored debt thresholds, and urgency-based severity. But `OBL` and `CNSQ` do not currently carry `urgency`; only `THR` and `SLT.saliency` do. That means audit either has to infer urgency from prose or treat all obligations/consequences equally.

Add:

urgency: low | medium | high*

tags: [string]

to both `OBL` and `CNSQ`.

This is a small change with a large payoff. It lets turn-cycle rank what matters now, lets audits detect ignored high-pressure debt, and lets commitment blocks target “urgent unresolved consequence” without act-structure logic.

### **7. Add generic binding predicates for reusable author-pool blocks**

Your current predicate DSL is good for branch-scoped exactness, but too weak for reusable global commitment blocks. A global author-pool `SLT` cannot reference branch-local records, so it needs typed generic conditions like “some open high-urgency obligation exists” or “some relationship has high resentment.” Right now it mostly has exact-ID predicates and `has_affordance(...)`. That will force too much runtime JIT and make the global author pool shallow.

Add deterministic existential predicates with bindings. For example:

any_obligation_open(alias, kind?, urgency?, owed_by_role?, owed_to_role?)

any_consequence_pending(alias, kind?, urgency?, derived_from?)

any_thread_active(alias, tag?, urgency?)

any_relationship_axis(alias, axis, comparator, value, participant_role?)

any_belief(alias, holder_role?, mode?, truth_relation?, visibility?)

any_intention(alias, holder_role?, urgency?)

any_accessible_object(alias, actor_role?, tag?)

Then let `SLT.effects` and `exit_options.likely_effects` refer to bound aliases:

preconditions:

 hard:

   - any_obligation_open("debt", urgency=high, owed_by_role=player_proxy)

effects:

 supersede:

   - bound:debt

This is the single best way to make reusable commitment blocks powerful without turning them into plot rails. It also directly reflects the lesson from social-simulation systems: reusable interactions need typed social/world conditions, not one-off branch references.

### **8. Add explicit causal-support validation**

You already have plan grounding and append-only deltas, but the validators should become stricter about causal support.

Every created or superseded `SF`, `BEL`, `OBL`, `CNSQ`, `THR`, `SREL`, `STSTAT`, `STOBJ`, and `DA` should cite a causal basis:

* `basis.source_event` for `BEL`.  
* `derived_from` for `SF`, `CNSQ`, `THR`, `SREL`, `STSTAT`, `STOBJ`, and `DA`.  
* `trigger_to_close` / `resolves_when` for closure conditions.  
* `SE.state_delta` must include the changed record IDs.

Then add an audit check: **no active state without causal support**.

This is the practical version of narrative-planning causal links. The point is not to generate a plan tree; the point is to ensure every state change has a reason the engine can replay and the reader can believe.

### **9. Strengthen `CHC` grounding**

Current `CHC` records have `surface_label`, `player_visible_intent`, action families, likely pressure, associated block, and optional success policy. That is close, but not quite enough to guarantee choices are grounded in what the player character can perceive and do. The hard gate says emitted choices must be grounded, but the `CHC` schema does not force a direct grounding link.

Add one field:

grounded_in:

 records: [STENT-<integer> | STLOC-<integer> | STOBJ-<integer> | BEL-<integer> | OBL-<integer> | CNSQ-<integer> | THR-<integer> | SREL-<integer> | DA-<integer>]

 affordance_ordinals: [integer]

This will prevent “cool choice button drift,” where a choice sounds good but is not actually available from the page state.

This also supports agency. Mateas’s account of agency argues that player agency depends on a balance between available actions and meaningful formal constraints; a choice should be both materially available and narratively intelligible. Your system can encode that by tying every choice to affordances, beliefs, debts, or relationships.

### **10. Add local salience scoring, not drama management**

Do not add a drama manager that optimizes toward a target curve. Search-based drama management was explicitly designed to avoid static branching while allowing unconstrained actions, but the authors also note scalability and story-dependence problems. That is the wrong direction for Worldloom, because it tempts the engine to steer toward a hidden ideal plot.

But add **local salience scoring** for commitment-block ranking:

score =

 urgency(open OBL/CNSQ/THR engaged)

+ recency_penalty(if same move_family repeated)

+ intention_match

+ relationship_pressure

+ mystery_pressure

+ affordance_specificity

+ player_choice_alignment

Do not store this as story truth. Compute it during turn-cycle selection and optionally expose it in the validation trace. This helps the system choose the most causally alive next move without imposing plot shape.

---

## **P2 improvements for branch scale and long stories**

### **11. Add a derived branch pressure index**

Long branching stories need quick answers like:

* What debts are open on this branch?  
* What mysteries were narrowed?  
* Which canon candidates are pending?  
* Which characters are dead, captive, missing, or estranged?  
* Which branches contradict a newly promoted fact?

Do not make this canonical state. Make it a derived index, probably regenerated by `world-index build` or bundle audit:

branch_pressure_index:

 branch_id: BR-<integer>

 leaf_page: PG-<integer>

 open_obligations: [...]

 pending_consequences: [...]

 active_threads: [...]

 high_pressure_relationships: [...]

 unresolved_mystery_claims: [...]

 canon_candidates: [...]

 terminal_status: open | branch_pause | terminal_closed

This will pay off when branch count grows.

### **12. Add a mystery-progress ledger or derived mystery trace**

`PG.state_snapshot.unresolved_mystery_claims` is useful, but mystery progress will become hard to audit across many branches. You need to answer: “What exactly has this branch established about `M-7`, and by which events?” The current system can probably derive that from `PG`, `SE`, `BEL`, and `SF`, but only if the records are disciplined.

Either add a small `MCL` record:

id: MCL-<integer>*

story_id: STORY-<integer>*

created_at_page: PG-<integer>*

mystery_id: M-<integer>*

authority: apparent | branch_local_counterfactual | canon_candidate*

movement: clue_added | narrowed | apparent_resolution | held_for_promotion*

source_records: [<record_id>]*

or make it a required derived audit section. I would start derived, then promote to a record only if audits become too expensive.

### **13. Add an optional semantic audit mode**

Your default health audit should remain deterministic. That is correct. But for mature stories, add an optional `semantic` mode that does not mutate state and asks an LLM to look for:

* emotional discontinuity,  
* character motivation drift,  
* repeated choice patterns,  
* stale unresolved threads,  
* prose-state mismatch that deterministic scans missed,  
* “branch feels railroaded” symptoms.

Keep this separate from structural validity. The deterministic audit says whether the branch is legal. The semantic audit says whether it feels narratively alive.

---

## **What I would explicitly reject**

### **Reject act structure permanently**

Act structure encodes future dramatic obligations. Interactive branching state wants present causal obligations. Those are different beasts. If the player kills the planned antagonist, confesses the secret early, abandons the quest, destroys the artifact, joins the enemy, or refuses the premise, an act structure either breaks or starts suppressing valid choices.

Your system should ask:

* What is true now?  
* Who knows it?  
* Who wants what?  
* What debts remain?  
* What consequences are pending?  
* What affordances are visible?  
* What mysteries are protected?  
* What action is the player attempting?  
* What does world logic allow?

It should never ask:

* Are we before or after the midpoint?  
* Has the protagonist refused the call?  
* Is this the climax?  
* Does this choice preserve Act II?

### **Reject global “optimal story” search**

A global drama manager is too likely to reintroduce railroading through the back door. Use local salience ranking and hard coherence gates instead.

### **Reject prose as a state source**

Do not let rendered prose create state. Your plan/prose boundary is one of the best parts of the architecture. Keep prose-attach as a validator and receipt system, not a state transition workflow.

### **Reject full autonomous-agent simulation for now**

Versu-like systems show the appeal of character files, genre files, beliefs, motivations, emotions, and autonomous social behavior, but full simulation is expensive and can generate noise. Your `STINT`, `BEL`, `SREL`, `OBL`, and `CNSQ` approach gives you the useful part without surrendering authorial control.

---

## **Concrete amendment plan**

### **Amendment A — Contract/skill alignment pass**

Scope: `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, `story-promotion-closeout`.

Change:

* Replace all legacy field names.  
* Replace old enums.  
* Replace padded IDs in examples.  
* Update prose receipt section references.  
* Make the shared contract the single schema source.  
* Add validator tests that fail on legacy fields.

Priority: **P0, before any production story.**

### **Amendment B — Replayable state records**

Add:

* `STSTAT` for entity life/agency/location.  
* `BRSTAT` for branch status.  
* `SCX` for story-canon closeout links.  
* `SF.authority`.

Update:

* `PG.state_snapshot.active_records`.  
* Predicate DSL.  
* Turn-cycle deltas.  
* Health audit replay.  
* Promotion/closeout.

Priority: **P0.**

### **Amendment C — Debt salience**

Add `urgency` and `tags` to `OBL` and `CNSQ`.

Update:

* Health audit debt thresholds.  
* Commitment-block selection.  
* Terminal proof requirements.  
* Page-plan §10 open debt rendering.

Priority: **P1.**

### **Amendment D — Predicate DSL v2**

Add existential/binding predicates for reusable author-pool blocks.

Update:

* Commitment-block authoring.  
* Turn-cycle SLT eligibility.  
* Plan grounding.  
* Health audit unactionable-debt checks.

Priority: **P1.**

### **Amendment E — Choice grounding**

Add `CHC.grounded_in.records` and `CHC.grounded_in.affordance_ordinals`.

Update:

* Bootstrap first-choice generation.  
* Turn-cycle choice generation.  
* Gate 7 validation.  
* Health audit dangling-choice checks.

Priority: **P1.**

### **Amendment F — Derived pressure indexes**

Add a generated branch pressure index and optional mystery trace.

Priority: **P2, after the first internal pilot story.**

---

## **Bottom line**

The current architecture is the right architecture. It is much closer to storylets + social state + narrative mediation + causal replay than to a branching outline, and that is exactly where it should be.

The changes I would make now are not a redesign. They are hardening moves:

1. eliminate schema drift;  
2. make entity status replayable;  
3. represent branch/canon closeout without polluting unrelated schemas;  
4. add explicit `SF.authority`;  
5. give obligations/consequences urgency;  
6. make reusable commitment blocks powerful through generic binding predicates;  
7. ground every choice in concrete affordances and state.

Do those before production stories. Otherwise the first serious branch will expose the same failure modes: non-replayable deaths/movement, invalid closeout fields, weak global storylets, and audits that talk about urgency or authority the schemas cannot actually represent.

