# **Executive verdict**

Worldloom **is missing genuine story-facing structure**, but not in the way a first glance suggests.

The current ontology is already unusually rich: it has branch-local facts, beliefs, events, intentions, obligations, consequences, threads, clocks, secrets, story questions, relationships, statuses, locations, objects, pages, choices, storylets, branch records, and diegetic artifacts. The validation posture is also strong: append-only state, replayed snapshots, branch isolation, observer firewall, mystery firewall, state-delta integrity, story-question payoff integrity, clock/secret validators, prose receipts, and page-plan hashing are all present in the implementation.

The core verdict:

**Worldloom should add two new active story-state records now:**

1. **`STPLAN` — actor-owned tactical plan / medium-range agency state.**  
    Current `STINT` is too thin to make characters feel resourceful, persistent, adaptive, and strategically motivated across pages. `STINT` says “what I want”; `STPLAN` should say “what I am currently trying, why I think it can work, what I have, what blocks me, and what I may try next.” This is not an author plot plan.  
2. **`STEMO` — actor-owned affective state / emotional-causality record.**  
    Current `SREL`, `BEL`, and `STSTAT` cover relationship valence, cognitive interpretation, and material status, but not transient embodied emotion as a causal driver. This is why actions can be logically grounded yet emotionally underpowered.

**Worldloom should not add first-class active records for scene, conflict, dramatic irony, reader expectation, social reputation, resources, theme, motif, pacing, clue, quest, or act/beat structure.** Those concerns are either already owned by existing records or should be handled through MCP projections, page-plan rendering, validators, and health-audit views.

The larger problem is that Worldloom’s **machine-facing and rendering support underuses the ontology it already has**. The story state may be structurally valid, but the external prose LLM and story skills do not consistently receive the synthesized information needed for rich fiction: current actor plans, emotional transitions, dramatic irony, local situation/conflict, social pressure, reader-facing setup/payoff handling, and branch possibility-space.

So the strongest answer is:

**Add `STPLAN` and `STEMO`; sharpen `STINT`, `BEL`, `SREL`, `STQ`, and page-plan sections; build MCP/index projections for present situation, dramatic irony, reader expectation, social pressure, and branch possibility-space. Do not add plot-shape machinery.**

# **Repository architecture map**

## **Current record classes**

I inspected the non-archived story contracts, story skills, MCP/context-packet code, world-index parsing, patch-engine operation vocabulary, and validator source. The current live story-state record set is:

| Class | Current ownership |
| ----- | ----- |
| `STENT` | Story-local entity mirror or story-only entity. |
| `STSTAT` | Entity life, agency, and location status. |
| `STINT` | Thin active intention: holder, intent, urgency, expiry. |
| `SF` | Branch-local fact with authority/provenance. |
| `BEL` | Actor/group/public/narrator belief, claim, truth relation, confidence, visibility, basis, consequences. |
| `SE` | Story event: selected commitment, action route, rationale, state delta, promotion claims. |
| `OBL` | Open duty, debt, promise, moral/social obligation. |
| `CNSQ` | Pending or addressed consequence/fallout. |
| `THR` | Qualitative thread/ongoing concern. |
| `CLK` | Quantified pressure clock with thresholds and tick history. |
| `STSEC` | Hidden truth / secret with holders, clue carriers, reveal records, mystery protection. |
| `STQ` | Open setup, story question, or promise with source records and payoff/answer lifecycle. |
| `SREL` | Objective relationship state between two story entities, across axes such as trust, fear, desire, debt, approval, respect, hostility, resentment, etc. |
| `STLOC` | Story-local location or location state. |
| `STOBJ` | Story-local object or object state. |
| `DA` | Story-local diegetic artifact. |
| `BR` | Branch record. |
| `PG` | Page record with branch path, input, state snapshot, plan hash, emitted choices, validation trace. |
| `CHC` | Choice record. |
| `SLT` | Storylet / commitment block. |

Auxiliary/non-active records include story audits, promotion packages, remediation proposal cards, storylet batch manifests, prose receipts, page plans, attached prose, and `STORY_KERNEL.md`.

## **Current embedded structured concepts**

Worldloom already represents many story-facing concepts without using separate records:

| Embedded concept | Current owner |
| ----- | ----- |
| Actor knowledge and access | `BEL.basis`, observer firewall, `DA`/`STOBJ`/`STLOC` access routes. |
| Branch-local truth authority | `SF.authority`, `BEL.truth_relation`, promotion claims, unresolved mystery claims. |
| Mystery preservation | `STSEC`, `STQ`, `PG.state_snapshot.unresolved_mystery_claims`, Mystery Reserve references. |
| Local affordances | `PG.state_snapshot.visible_affordances`, `STLOC`, `STOBJ`, `DA`, `CHC.grounded_in`. |
| Commitments / possible moves | `SLT.preconditions`, `SLT.effects`, `SLT.exit_options`, `CHC.committed_slt_id`. |
| Open debts | `OBL`, `CNSQ`, `THR`, `CLK`, `STSEC`, `STQ`. |
| Entity material status | `STSTAT`, projected into `PG.state_snapshot.entity_status`. |
| Reader-known / audience-visible setup | `STQ.audience_visibility`, `STSEC.clue_carriers`, `BEL.visibility`, page-plan §10b. |
| Prose render contract | `pages-prose-plans/PG-<N>.md`, `PG.plan.plan_hash`, prose receipt checks. |

The important gap is not that these concepts are absent. It is that some **syntheses** are absent: “what does this actor think they are doing over the next few pages?”, “what emotion is causally pressuring them?”, “what is the immediate conflict situation?”, “what does the reader know that the actor does not?”, and “which setup/payoff should the prose foreground now?”

## **Non-state direct-write artifacts**

The repository distinguishes append-only state from direct-write authoring surfaces. Current non-state direct-write artifacts include:

| Artifact | Role |
| ----- | ----- |
| `STORY_KERNEL.md` | Story identity, premise, agency contract, cast binding, invariant/mystery acknowledgements. |
| `pages-prose-plans/PG-<N>.md` | Load-bearing prose-render contract. |
| `pages-prose/PG-<N>.md` | Attached rendered prose. |
| `pages-prose-receipts/PG-<N>.yaml` | Prose attach validation receipt. |
| Promotion packages | Story-to-canon candidate proposals. |
| Health audit records / remediation proposals | Non-state audit/remediation surfaces. |
| Index artifacts | Machine-facing retrieval support. |

This boundary is correct and should be preserved. The new structures recommended here should respect it: `STPLAN` and `STEMO` belong in append-only active state; present situation, dramatic irony, reader expectation, social pressure, pressure texture, and branch possibility-space should mostly be projections/views/rendering surfaces.

## **Current skill responsibilities**

| Skill | Current responsibility |
| ----- | ----- |
| `branching-story-bootstrap` | Creates story bundle, initial active records, root page, root page plan, choices, optional clocks/secrets/questions. |
| `branching-story-turn-cycle` | Advances one causal page from a committed parent; resolves input; selects/JITs storylet; creates SE/PG/new records/page plan/choices; validates. |
| `branching-story-prose-attach` | Attaches externally supplied prose to already committed page plan; validates prose against plan/state without mutating PG. |
| `branching-story-health-audit` | Read-only structural, compatibility, prose, remediation, and cross-story audits. |
| `commitment-block-authoring` | Authors reusable `SLT` commitment blocks with predicates/effects/coverage. |
| `story-fact-promotion-to-canon` | Packages branch-local story claims for canon promotion. |
| `story-promotion-closeout` | Closes out story-local claims after canon-addition verdicts. |

The turn-cycle is already the natural place to maintain `STPLAN` and `STEMO`. Bootstrap should seed only load-bearing initial plans/emotions. Prose-attach should reflect them, not create them.

## **MCP/context-packet support**

The implementation currently builds a story-bundle context with:

* storylet pool summary;  
* open obligations;  
* active threads;  
* active clocks;  
* hidden secrets;  
* open story questions;  
* longest active branch path;  
* recent pages;  
* mysteries in play;  
* mystery evidence chains;  
* cast bind list;  
* acknowledged invariants.

This is useful but too shallow. It does **not** currently summarize active `STINT`, `BEL`, `SREL`, `STSTAT`, `STLOC`, `STOBJ`, story-local `DA`, actor plans, emotions, local conflict, dramatic irony, social pressure, or branch divergence. It also appears to project `OBL` with older field expectations such as `owner`, `subjects`, numeric salience, and numeric urgency, while the current schema uses different fields such as `kind`, `description`, `owed_by`, `owed_to`, and enum urgency. That mismatch matters because story skills are supposed to rely on MCP/context packets rather than raw markdown.

## **World-index story indexing and edge extraction**

The world-index implementation recognizes the current story record directories and node types, including `CLK`, `STSEC`, and `STQ`.

Current story edges include:

* `world_entity_binding`;  
* `story_fact_derived_from`;  
* `created_at_page`;  
* `state_delta_create`;  
* `state_delta_supersede`;  
* `creation_evidence`;  
* storylet obligation edges;  
* page/choice parent edges;  
* branch leaf/parent edges;  
* obligation dependent facts;  
* thread obligations.

The index does **not** currently extract many story-significant edges:

* `BEL.holder`;  
* `BEL.basis.source_event`;  
* `BEL.basis.access_records`;  
* `BEL.consequences.opens`;  
* `SREL.participants`;  
* `SREL.derived_from`;  
* `STINT.holder`;  
* `STINT.supersedes`;  
* `STSTAT.entity`;  
* `STLOC`/`STOBJ` affordance/access edges;  
* `CLK.linked_records`, `CLK.driver`, `CLK.tick_history.cause/event`;  
* `STSEC.truth_anchor`, `STSEC.holders`, `STSEC.clue_carriers.record`, `STSEC.reveal_records`;  
* `STQ.source_records`, `STQ.payoff_of`, `STQ.answer_records`;  
* `SE.actor`, `SE.targets`, `SE.commitment.selected_slt_id`.

This is a major support gap. Before adding many new records, Worldloom should make existing records more queryable.

## **Patch-engine story operation vocabulary**

The patch engine supports create operations for the current story records and append-only supersede-intent operations for `CLK`, `STSEC`, and `STQ`. `supersede_clk_record`, `supersede_stsec_record`, and `supersede_stq_record` route through the same fresh-file create path as ordinary create operations, with the new record carrying `supersedes`.

There are no operation kinds, ID allocations, source directories, or record specs for `STPLAN` or `STEMO`.

## **Validator coverage and gaps**

Current validator coverage is extensive:

* schema compliance for current record classes;  
* state delta class integrity;  
* no in-place mutation;  
* snapshot replay equality;  
* branch isolation;  
* observer firewall;  
* story fact authority;  
* lie-promotion checks;  
* mid-story introduction grounding;  
* expected witness coverage;  
* clock range/threshold/tick/terminal debt checks;  
* secret carrier/reveal/mystery firewall checks;  
* story-question setup/payoff/terminal-debt checks;  
* relationship introduction grounding;  
* entity status pairing;  
* narrative shape field rejection;  
* active records full-shape warning;  
* prose receipt schema compliance.

Key gaps:

1. `STINT` is schema-valid but underpowered.  
2. There is no causal emotional-state validator because no emotional-state record exists.  
3. No validator can ask whether an actor’s action advances, revises, ignores, or contradicts an active plan.  
4. Dramatic irony is enforced negatively through observer firewall, but not rendered positively as audience-facing usable information.  
5. Reader expectation/payoff is represented by `STQ`, but page-plan rendering and MCP support are not strong enough to tell the prose renderer what to foreground, echo, complicate, pay off, or withhold.  
6. The current `SE.commitment.alias_bindings` schema omits `CLK`, `STSEC`, and `STQ`, even though current storylets and page plans explicitly use clocks, secrets, and story questions.  
7. Adding any new active class requires coordinated changes to `ACTIVE_RECORDS_CLASSES`, replay, schemas, state-delta class integrity, active-records full-shape, patch engine, ID allocation, story-index node types, MCP summaries, and page-plan sections.

## **Page-plan rendering**

The current page-plan contract is strong: it has sections for canon, cast/status, location/affordances, selected event/delta, required beats, relationship/belief context, open obligations/consequences/threads, optional clocks/secrets/questions, forbidden mystery resolutions, stopping point, choices, prose continuity, style, and anti-pathology checks.

But it lacks several fiction-critical render surfaces:

* active actor plan;  
* emotional transition / affective state;  
* immediate present causal situation;  
* dramatic irony / audience-vs-character knowledge;  
* reader-facing setup/payoff handling;  
* social pressure / reputation-as-concrete-state;  
* pressure texture grounded in current records;  
* branch possibility implications.

This is where state richness currently leaks away. If a structure is not rendered into `pages-prose-plans/PG-<N>.md`, the external prose LLM will either ignore it or invent it.

## **Mismatches found**

The main mismatches are:

1. **`STINT` is documented and implemented as very thin.** Its JSON schema requires only `id`, `story_id`, `created_at_page`, `holder`, `intent`, `urgency`, and `expires_when`. That is not enough for medium-range agency.  
2. **MCP story-bundle context under-supports current state.** It summarizes obligations, threads, clocks, secrets, questions, storylets, branch path, and mysteries, but not active beliefs, relationships, intentions, statuses, objects, locations, artifacts, actor strategy, affect, social pressure, or dramatic irony.  
3. **World-index edges are too shallow for story reasoning.** Important ownership/provenance/access relations are not extracted as graph edges.  
4. **Page-plan §10b exists for `STQ`/`CLK`/`STSEC`, but the page plan does not synthesize them into suspense, dramatic irony, local conflict, or payoff instructions.**  
5. **The patch engine and validators recognize the current classes but are not prepared for `STPLAN`/`STEMO`.** That is expected, but it makes the blast radius real.  
6. **The implementation still relies on parseable intro tags in `SE.world_logic_rationale` for some mid-story introductions.** That is workable but brittle; it should eventually become structured `SE.record_introductions[]`.  
7. **The schema for `SE.commitment.alias_bindings` does not include `CLK`, `STSEC`, or `STQ`.** That is now inconsistent with the richer storylet/debt model.

# **Research synthesis**

Interactive-fiction tools consistently show that branching fiction needs explicit state, not just prose branches. Ink’s tutorial describes stories as knots, diverts, and choices; it also warns authors about unfinished “loose ends” and supports conditional content based on prior story traversal. That maps directly onto Worldloom’s existing concern with branch paths, emitted choices, and open debts. The takeaway is not “copy Ink,” but “branching authoring needs machine-visible unfinished structure.”

ChoiceScript’s official tutorial frames the system as a simple programming language for interactive novels and shows nested choices leading to distinct consequences. That reinforces Worldloom’s current commitment-block and choice model: choices should not be decorative; they should be causally routeable and state-aware.

Storylet practice is especially relevant. Emily Short defines storylets as content with prerequisites and effects on world state, and emphasizes that storylet systems are atomic, robust, recombinable, and can interlock with other narrative circumstances in the same storyworld. This strongly validates Worldloom’s `SLT`/predicate/effect architecture, but also exposes the need for better story-state projections: storylets become powerful when the system can retrieve the right circumstances cheaply.

Storylets also argue against pure “time cave” branching as a default. Short notes that exact-route dependency loses much of the value of storylets and that most sizable games use smaller branchy segments inside a larger state-driven structure. That aligns with Worldloom’s causal branch-local state and compatibility-audit approach: preserve branch divergence, but avoid making every later page depend on raw path history when causal state can carry the meaning.

Narrative-planning research gives the strongest support for `STPLAN`. Riedl and Young argue that narrative understandability depends on both causal progression and character believability, and that characters must be perceived as intentional agents. Their IPOCL approach explicitly reasons about goals and plan structures that explain why characters commit to actions. Worldloom should not import automated plot planning or fixed goal-state endings, but it should represent character-owned plans as present causal state.

Recent social-agent research points in the same direction. The generative-agents paper describes believable behavior as arising from observations, memories/reflections, and planning; its evaluation emphasizes that observation, planning, and reflection contribute to believable behavior. Again, Worldloom should not become a general autonomous-agent sandbox, but persistent actor plans and emotional/social projections are directly relevant to believable branching fiction.

Façade is useful mainly as a boundary case. It integrated believable agents with interactive plot and a drama manager, but the drama-manager aspect is exactly what Worldloom should not import as a global tension/ending controller. The useful lesson is the importance of social and affective character state in an interactive dramatic situation; the rejected lesson is centralized plot-shape steering.

Suspense research matters because reader experience is not reducible to internal world truth. A 2024 paper on suspenseful story generation frames suspense as a common but underexplored dimension of human-written stories and grounds generation in cognitive psychology and narratology. For Worldloom, this supports richer `STQ`/dramatic-irony/page-plan rendering, not global suspense curves or mandatory dramatic beats.

Mystery design argues against splitting clues into a separate first-class record right now. GUMSHOE’s premise is that investigative play should not stall on whether players find clues; the real play is interpreting clues. Worldloom already has `STSEC.clue_carriers`, `BEL`, `SF`, `DA`, and story-question payoff support. The missing piece is clue visibility/rendering/audit support, not `STCLUE`.

The research-filtered conclusion is simple: **state-driven branching fiction benefits from explicit causal prerequisites, effects, obligations, information state, actor intentionality, emotional pressure, social context, and reader-facing information management. It does not benefit from fixed act schemas, mandatory plot beats, global dramatic curves, or convergence rails.**

# **Candidate structure inventory**

| Candidate | Classification | Verdict | Reason |
| ----- | ----- | ----- | ----- |
| `STPLAN` actor-owned tactical plan | Active branch state | **Add now** | Distinct, recurrent, branch-relevant, validation-capable, not owned by current `STINT`. |
| `STEMO` actor-owned affective state | Active branch state | **Add now** | Emotional causality is currently split across `BEL`, `SREL`, prose, and skill judgment. |
| Present causal situation / local conflict packet | MCP + page-plan projection | **Add now, non-state** | Needed for prose and choice generation; should be derived from state, not stored as state. |
| Reader expectation / payoff packet | Page-plan + MCP + `STQ` sharpening | **Sharpen existing** | `STQ` owns this, but rendering is too weak. |
| Dramatic irony packet | MCP + page-plan + validator/audit | **Add now, non-state** | Existing knowledge structures cover facts; no synthesized audience-vs-character view. |
| Social pressure packet | MCP + page-plan + `SREL`/`BEL`/`OBL` sharpening | **Sharpen existing** | Avoid generic reputation meter; represent concrete groups, beliefs, obligations, sanctions. |
| Resource/leverage structure | Embedded in `STPLAN` + situation packet | **Sharpen existing** | `STOBJ`, `STLOC`, `DA`, `SF`, affordances already own resources. |
| Branch possibility-space map | MCP + health-audit view | **Add now, non-state** | Authoring/audit support for divergence and compatibility; not branch state. |
| Pressure texture | Page-plan + audit only | **Add now, non-state** | Useful for prose pacing; deterministic only when grounded in clocks/debts/threats. |
| `STNORM` social norm record | Active state | **Defer** | Could matter later, but current `STENT` group + `BEL` + `SREL` + `OBL` + `CLK` should be sharpened first. |
| `STCLUE` clue record | Active state | **Reject** | `STSEC.clue_carriers` already owns clue lifecycle. Split only if clue reuse becomes independently complex. |
| `SCENE` / `SCONF` scene-conflict record | Active state | **Reject as state** | The useful part is a derived present-situation packet. A scene record would duplicate page/event/state. |
| `STPROM` promise/payoff record | Active state | **Reject** | `STQ` already owns open setup/question/promise. |
| `STREP` reputation meter | Active state | **Reject** | Too generic; social state should be concrete and causal. |
| `STRES` resources/capabilities record | Active state | **Reject** | Duplicates `STOBJ`, `STLOC`, `DA`, `SF`, `STSTAT`, and affordances. |
| `STTHEME` theme record | Active state | **Reject** | Literary value real, but not causal branch state. Use audit/page-plan guidance. |
| `STMOTIF` motif record | Active state | **Reject** | Use artifact/object/location recurrence tracking and page-plan notes, not active state. |
| `STSUB` subtext record | Active state | **Reject** | Subtext is prose craft and social/emotional implication, not deterministic state. |
| `STARC` character arc record | Active state | **Reject** | Risks plot-shape thinking. Character change should emerge from `BEL`, `SREL`, `STEMO`, `STPLAN`, `STSTAT`, `OBL`, `CNSQ`. |
| Act/midpoint/climax/beat-position records | Active state | **Reject hard** | Violates Worldloom’s causal-engine philosophy. |
| Global drama manager / tension curve | Planner/controller | **Reject hard** | Would override branch-local causality and create plot rails. |
| Quest journal record | Active state | **Reject/defer** | `OBL`, `CNSQ`, `THR`, `CLK`, `STQ`, `SLT` already cover quest-like structures. |

# **Accepted recommendations**

## **1. `STPLAN` — actor-owned tactical plan**

### **Classification**

New first-class active story-state record.

### **Story problem solved**

Worldloom currently represents what characters believe, want, owe, fear, know, and can physically do, but it does not represent **how a character is presently trying to solve a problem over multiple pages**.

That is why medium-range character agency is under-owned. A character can have:

* a `BEL` about a threat;  
* an `STINT` to escape;  
* an `SREL` of fear toward an antagonist;  
* an `OBL` to protect someone;  
* an `SLT` that could realize a move;  
* an `SE` for the immediate action.

But no record says:

“She thinks the guard can be bribed because she saw him pocket money; she has the ring as leverage; the locked gate blocks direct escape; if bribery fails, she will try to fake illness; she is acting cautiously because discovery would trigger the prison clock.”

That is not prose decoration. It is causal state.

### **Why existing structures are insufficient**

`STINT` almost owns this, but it is too thin. In implementation, `STINT` requires only `holder`, `intent`, `urgency`, and `expires_when`. It cannot express:

* belief basis;  
* resource basis;  
* blockers;  
* current tactical step;  
* fallback;  
* plan status;  
* plan revision;  
* action-family bias;  
* whether an event advances, blocks, revises, fulfills, or abandons the plan.

`SLT` is not sufficient because it is a possible commitment block, not an actor-owned present intention. `SE` is one event, not a persistent plan. `BEL` is cognition, not plan. `OBL` is debt, not strategy. `THR` is thread pressure, not actor tactic.

### **Schema sketch**

id: STPLAN-12  
story_id: STORY-1  
created_at_page: PG-17  
created_by_event: SE-22  
supersedes: STPLAN-9

holder: STENT-4  
root_intention: STINT-18

objective: "Get Mara out of the quarantine wing without alerting the watch."  
plan_status: active # active | blocked | suspended | fulfilled | failed | abandoned | revised

belief_basis:  
 - BEL-31  
 - BEL-37

resource_basis:  
 facts:  
   - SF-44  
 objects:  
   - STOBJ-8  
 locations:  
   - STLOC-3  
 artifacts:  
   - DA-5  
 relationships:  
   - SREL-14  
 obligations:  
   - OBL-6

blockers:  
 - STSTAT-27  
 - CLK-3  
 - STLOC-9

current_step:  
 action_family: negotiate  
 target_records:  
   - STENT-11  
   - STOBJ-8  
 success_condition:  
   predicates:  
     - "belief_record(STENT-11, BEL-37, at_least=medium)"  
     - "object_accessible(STENT-4, STOBJ-8)"  
 rationale: "The guard has already accepted contraband and may respond to leverage."

fallback_steps:  
 - action_family: deceive  
   trigger_predicates:  
     - "not(belief_record(STENT-11, BEL-37, at_least=medium))"  
   target_records:  
     - STENT-11  
     - STLOC-9  
   rationale: "If leverage fails, fake a medical emergency to move Mara."

risk_posture: cautious # cautious | opportunistic | desperate | coerced | reckless  
visibility: private # private | shared | public | exposed | inferred  
expires_when: "When Mara leaves the quarantine wing, the watch is alerted, or the quarantine clock fires."

derived_from:  
 - SE-22  
 - BEL-31  
 - STOBJ-8

### **Lifecycle**

`STPLAN` should be append-only and superseded on meaningful change. A plan should not be edited in place. It should become inactive through supersession or closure when fulfilled, blocked, abandoned, or invalidated by new facts/beliefs/status.

Typical lifecycle:

1. `STINT` exists or is created.  
2. Actor receives relevant belief/resource/pressure.  
3. Turn-cycle creates `STPLAN`.  
4. Later `SE` advances, blocks, revises, fulfills, or abandons it.  
5. New `STPLAN` supersedes prior record when plan status, current step, resources, blockers, or fallback materially change.  
6. Health audit flags stale active plans.

### **Bootstrap use**

Bootstrap should seed `STPLAN` only for actors whose medium-range agency matters at story start. Do not create plans for every cast member. A root page may have:

* player-proxy plan;  
* main opposing actor plan;  
* one hidden/partial plan if dramatic irony matters;  
* no plan for background entities.

Bootstrap should not pre-author outcomes. It should define present tactical state.

### **Turn-cycle use**

Turn-cycle should:

* retrieve active `STPLAN` for actor(s) in scope;  
* decide whether the selected `SLT` advances, blocks, revises, or ignores a plan;  
* create/supersede `STPLAN` when new beliefs/resources/blockers change what the actor would reasonably try;  
* cite active plan in `SE.world_logic_rationale`;  
* require player-visible or actor-accessible information for any plan-driven action.

A selected event by an actor with an active plan should usually have one of these relations:

plan_relation:  
 plan: STPLAN-12  
 relation: advances # advances | tests | blocks | revises | fulfills | abandons | ignores

This can be embedded in `SE`, or introduced first as a structured `SE.record_introductions[]` / `SE.story_state_relations[]` field.

### **Prose-attach use**

Prose-attach should validate that if a page plan says the actor is acting from `STPLAN-12`, the prose does not render the action as random, omniscient, or motivated by inaccessible information. It should not require explicit engine terminology.

Checks:

* plan-holder action appears in prose;  
* resource/blocker is not contradicted;  
* fallback is not silently invoked unless event/page plan says so;  
* no future outcome is implied as guaranteed.

### **Health-audit use**

Health audit should inspect:

* active plans whose `root_intention` is no longer active;  
* plans whose blockers/resources are inactive or superseded;  
* high-urgency intentions with no plan after N pages;  
* actions by major actors that ignore active plans without rationale;  
* plans that become hidden author future-plot outlines;  
* stale `active` plans after fulfillment/failure.

### **Commitment-block-authoring use**

`SLT` authoring should support plan-sensitive preconditions and effects:

* preconditions: `plan_active(holder, plan?)`, `any_plan_active(holder)`, `plan_blocked(holder)`;  
* effects: create/supersede `STPLAN`, advance plan, block plan, revise plan;  
* move families do not need a new family immediately, but `decision`, `negotiation`, `evasion`, `investigation`, `resource_exchange`, `protection`, `conflict`, and `recovery` should explicitly cite how they can interact with plans.

Do not make storylets pre-bind future page outcomes.

### **Promotion/closeout relevance**

`STPLAN` usually should not promote to canon. What may promote is a resulting `SF`, relationship change, artifact, character outcome, institutional outcome, or mystery resolution. Promotion closeout should be able to mark plans fulfilled/failed/abandoned if a canon verdict changes the branch-local truth they depended on.

### **MCP/context-packet requirements**

Add:

* active plans by holder;  
* blocked plans;  
* plans relevant to current actor/page;  
* plans whose current step matches available `SLT`/choice action families;  
* plan dependencies: beliefs, resources, blockers, obligations, clocks.

Suggested helper:

get_active_actor_plans(story_slug, branch_page_id?, actor_id?, include_dependencies=true)

Context packet should include a compact `active_actor_plans` array for story tasks.

### **World-index edge requirements**

Extract edges:

* `plan_holder`: `STPLAN -> STENT`;  
* `plan_root_intention`: `STPLAN -> STINT`;  
* `plan_belief_basis`: `STPLAN -> BEL`;  
* `plan_resource_basis`: `STPLAN -> SF/STOBJ/STLOC/DA/SREL/OBL`;  
* `plan_blocked_by`: `STPLAN -> record`;  
* `plan_current_target`: `STPLAN -> record`;  
* `plan_created_by_event`: `STPLAN -> SE`;  
* `plan_supersedes`: `STPLAN -> STPLAN`;  
* optional `event_advances_plan`: `SE -> STPLAN`.

### **Validator requirements**

Deterministic validators:

* schema compliance;  
* ID uniqueness and append-only lifecycle;  
* holder exists and is active;  
* `root_intention` exists, active, and belongs to same holder;  
* all basis/blocker/target records exist and are active or same-event-created;  
* belief basis is accessible to holder;  
* resource basis is accessible to holder or explicitly desired-but-unavailable;  
* no future page IDs;  
* plan status and supersession chain validity;  
* if plan is `fulfilled`, `failed`, or `abandoned`, closure event must exist;  
* no contradictory active plans with identical holder/objective unless explicitly marked as competing;  
* `SE` that claims to advance a plan must cite active plan and create/supersede relevant records.

Judgment-based audits:

* plan plausibility;  
* cleverness;  
* whether fallback feels character-specific;  
* whether plan produces compelling choice pressure;  
* whether plan is too authorial/future-plot-shaped.

### **Page-plan rendering requirements**

Add a section after current §9 or before §10:

## 9b. Active actor plans / tactical agency

- STPLAN-12 — Holder: STENT-4.  
 - Objective:  
 - Current step:  
 - Belief basis:  
 - Resources/leverage:  
 - Blockers:  
 - Risk posture:  
 - This page must show:  
 - This page must not imply:

For the external prose LLM, this section is crucial. It should not say “the plot needs X.” It should say “this actor presently thinks/tries X because Y.”

### **Deterministic vs judgment-based checks**

Deterministic:

* references;  
* active state membership;  
* holder/access consistency;  
* predicate syntax;  
* no future pages;  
* event-plan relation exists where claimed;  
* plan closure has proof.

Judgment-based:

* psychological plausibility;  
* literary freshness;  
* emotional/subtextual quality;  
* whether the plan is too convenient.

### **Implementation blast radius**

* `story-state-contract.md`;  
* `story-record-schemas.md`;  
* `FOUNDATIONS.md` only if adding a short ontology note;  
* bootstrap skill;  
* turn-cycle skill;  
* prose-attach skill;  
* health-audit skill;  
* commitment-block-authoring skill;  
* promotion closeout;  
* JSON schema;  
* patch-engine `IdAllocations`, `OPERATION_KINDS`, `STORY_RECORD_SPECS`;  
* world-index node types and story dirs;  
* edge types;  
* validators;  
* context packet types/builders;  
* `describe-envelope-schema`;  
* tests and fixtures;  
* existing story bundles need no migration if `STPLAN` optional.

### **Risks**

* It can become an author plot plan. Guard with schema language and validators: no future page IDs, no guaranteed outcomes, no expected ending.  
* It can overburden every actor. Skill guidance should require plans only for load-bearing actors.  
* It can duplicate `SLT`. Keep `SLT` as reusable move template; `STPLAN` as actor-owned tactical state.

### **What happens if Worldloom does not add it**

Characters will remain heavily event-reactive. Agency will be inferred by skill judgment or prose, not reliably retrieved, validated, or rendered. The system will generate valid branches whose characters feel less strategic than the state model otherwise allows.

---

## **2. `STEMO` — actor-owned affective state**

### **Classification**

New first-class active story-state record.

### **Story problem solved**

Worldloom currently has strong cognitive and relational state but weak emotional causality. A character can believe a betrayal happened, have a relationship resentment axis, and be physically free or constrained, yet the story state does not own the transient affective pressure that makes their next action emotionally believable.

Without an affective state record, the prose renderer must invent emotional transitions, and validators cannot distinguish:

* calm strategic deception;  
* panic-driven concealment;  
* shame-driven withdrawal;  
* grief-driven recklessness;  
* relief-driven confession;  
* anger-driven confrontation.

Those are different causal states, not just prose tones.

### **Why existing structures are insufficient**

`SREL` almost covers emotional relationship valence, but it is durable relational state between entities. It is not “what the holder feels now as a result of this event.”

`BEL` covers appraisal and interpretation, but not embodied affect or action pressure.

`STSTAT` covers life/agency/location, not internal affect.

`STINT` covers desire/intent, not emotional pressure.

Affective state can alter action plausibility, choice salience, dialogue, memory, risk posture, and relationship movement. That makes it branch-relevant.

### **Schema sketch**

id: STEMO-7  
story_id: STORY-1  
created_at_page: PG-17  
created_by_event: SE-22  
supersedes: STEMO-4

holder: STENT-4  
status: active # active | suppressed | settled | transformed

affect_kind: shame  
# fear | anger | grief | shame | guilt | hope | relief | desire | disgust |  
# confusion | awe | numbness | envy | tenderness | dread | humiliation

intensity: high # low | medium | high | extreme

orientation:  
 toward_records:  
   - STENT-11  
   - BEL-31  
   - SREL-14  
 toward_claim: "Mara thinks she betrayed the only person still protecting her."

appraisal_basis:  
 - BEL-31  
 - BEL-32

trigger_event: SE-22

behavioral_pressure:  
 - conceal  
 - withdraw  
# approach | avoid | freeze | confront | conceal | confess | protect |  
# repair | retaliate | withdraw | seek_help | seek_contact | self_soothe

agency_effect: constraining # none | constraining  
expires_when: "Until Mara receives forgiveness, denies responsibility, or the accusation becomes public."

derived_from:  
 - SE-22  
 - BEL-31  
 - SREL-14

### **Lifecycle**

Create or supersede `STEMO` when a story event materially changes affective pressure:

* betrayal;  
* secret reveal;  
* threat;  
* loss;  
* humiliation;  
* rescue;  
* intimacy;  
* coercion;  
* relief;  
* public accusation;  
* irreversible consequence.

Do not create a new `STEMO` for every passing mood. This should be reserved for affect that changes choices, prose rendering, or state interpretation.

### **Bootstrap use**

Bootstrap should seed only load-bearing starting emotions:

* grief after a recent death;  
* fear of a pursuer;  
* shame about a secret;  
* hope tied to an active plan;  
* numbness after trauma;  
* attraction/desire where it materially affects agency.

Do not use `STEMO` as a mood board.

### **Turn-cycle use**

Turn-cycle should:

* create `STEMO` when event outcomes causally trigger emotion;  
* supersede old `STEMO` when intensity, orientation, or behavioral pressure changes;  
* use active `STEMO` to justify action-family salience;  
* require `BEL`/`SE`/`SREL` basis for nontrivial emotion shifts;  
* connect emotional shifts to `SREL` changes only when relationship state truly changes.

### **Prose-attach use**

Prose-attach should check:

* required emotional transition is visible in prose;  
* prose does not invent extreme affect as if it were state;  
* action tone does not contradict active `STEMO` without a plan/event rationale;  
* no engine jargon leaks.

This is one of the highest-leverage prose quality improvements.

### **Health-audit use**

Health audit should flag:

* extreme emotions active for many pages with no reflection, transformation, or suppression;  
* emotionally significant events with no `STEMO` update;  
* actions that contradict active `STEMO` without `STPLAN`/`BEL`/`SE` support;  
* `SREL` shifts unsupported by affect/belief/event;  
* emotion records lacking actor-accessible appraisal basis.

### **Commitment-block-authoring use**

Commitment blocks can use emotion predicates:

emotion_active(holder, kind?, min_intensity?)  
any_emotion_active(holder)  
emotion_pressure(holder, pressure)

Blocks can also produce emotion effects:

* escalate fear;  
* transform anger into guilt;  
* settle panic after safety;  
* suppress grief under public scrutiny;  
* convert shame into confession or withdrawal.

The effect should create/supersede `STEMO`, not mutate it.

### **Promotion/closeout relevance**

`STEMO` itself should rarely promote to canon. Promotion may care if a long-term emotional transformation becomes a canon character outcome, but that should promote as a character/canon claim, not as raw affective state.

### **MCP/context-packet requirements**

Add:

get_active_emotional_states(story_slug, branch_page_id?, holder_id?, include_basis=true)  
get_emotional_transition_packet(parent_page_id, child_page_id)

Context packet should include:

* active high-intensity emotions;  
* emotions tied to selected actor;  
* emotions tied to active relationships;  
* emotions that constrain or bias choice/action.

### **World-index edge requirements**

Extract:

* `emotion_holder`: `STEMO -> STENT`;  
* `emotion_trigger_event`: `STEMO -> SE`;  
* `emotion_appraisal_basis`: `STEMO -> BEL`;  
* `emotion_oriented_toward`: `STEMO -> record`;  
* `emotion_derived_from`: `STEMO -> record`;  
* `emotion_supersedes`: `STEMO -> STEMO`.

### **Validator requirements**

Deterministic validators:

* holder exists and active;  
* trigger event exists and is on branch path or same event;  
* appraisal basis exists and is accessible to holder;  
* orientation records exist;  
* no future page IDs;  
* if `agency_effect: constraining`, either `STSTAT.agency` remains compatible or the plan/event explains why action still occurs;  
* supersession chain valid;  
* `status: settled/transformed` requires closure/transition event.

Judgment-based audits:

* emotion plausibility;  
* emotional intensity appropriateness;  
* whether prose renders emotion with sufficient specificity;  
* whether emotion is repetitive or melodramatic.

### **Page-plan rendering requirements**

Add after relationship/belief context:

## 9c. Emotional causality / affective state

- STEMO-7 — Holder: STENT-4.  
 - Affect:  
 - Intensity:  
 - Trigger:  
 - Appraisal basis:  
 - Behavioral pressure:  
 - This page’s emotional transition:  
 - Prose must render:  
 - Prose must avoid:

This section should tell the prose renderer what emotional movement the page must carry.

### **Deterministic vs judgment-based checks**

Deterministic:

* references;  
* access;  
* active membership;  
* lifecycle;  
* event linkage.

Judgment-based:

* psychological truth;  
* subtlety;  
* subtext;  
* whether the emotion is earned.

### **Implementation blast radius**

Same as `STPLAN`, plus page-plan/prose receipt checks. Existing bundles can remain valid because `STEMO` should be optional.

### **Risks**

* Overuse: every mood becomes state. Mitigate with “load-bearing affect only.”  
* Emotional taxonomies become rigid. Keep affect kinds broad and allow notes.  
* It may duplicate `SREL.fear/desire/resentment`. Keep boundary strict: `SREL` is durable relation; `STEMO` is current affective pressure.

### **What happens if Worldloom does not add it**

The system will remain causally logical but emotionally shallow. The external prose LLM will invent or flatten emotional transitions, and story actions will sometimes feel unearned even when all deterministic state is valid.

---

## **3. Present causal situation / local conflict packet**

### **Classification**

Non-state MCP/page-plan projection; not an active record.

### **Story problem solved**

Worldloom has all the ingredients of a dramatic situation, but not the synthesis:

* who wants what now;  
* who or what opposes it;  
* what leverage exists;  
* what constraints matter;  
* what information asymmetry matters;  
* what would count as a local turn.

Without that synthesis, page plans can be state-complete but dramatically diffuse.

### **Why existing structures are insufficient**

`PG`, `SE`, `SLT`, `STINT`, `SREL`, `BEL`, `OBL`, `CNSQ`, `THR`, `CLK`, `STOBJ`, `STLOC`, and `DA` collectively own the facts. But none owns the page-local situation as a renderable packet.

Do not add `SCENE`. A scene/conflict record would duplicate page/event/branch state. The situation should be derived for the current page or branch leaf.

### **Structural shape**

present_situation:  
 page: PG-17  
 viewpoint_actor: STENT-4  
 active_actor_wants:  
   - actor: STENT-4  
     wants: [STINT-18]  
     plans: [STPLAN-12]  
 opposition:  
   - source: STENT-11  
     record_refs: [SREL-14, CLK-3, STSTAT-27]  
     nature: "Guard can expose the escape attempt."  
 leverage:  
   - record: STOBJ-8  
     usable_by: STENT-4  
     use: "Bribe/leverage."  
 constraints:  
   - record: CLK-3  
     constraint: "Two ticks before watch rotation."  
 information_asymmetries:  
   - audience_knows: [STSEC-2]  
     actor_does_not_know: [STENT-4]  
 local_turn_condition:  
   - "Guard accepts leverage."  
   - "Guard refuses and quarantine clock ticks."  
   - "Mara abandons plan."

### **Lifecycle**

Generated on demand by MCP and rendered in page plans. No append-only state lifecycle.

### **Bootstrap use**

Root page plan should include a present situation summary if there is immediate conflict. If the story opens in quiet discovery, it should still identify the local tension or uncertainty.

### **Turn-cycle use**

Turn-cycle should generate this packet before writing the page plan and choices. It should be the bridge between state delta and prose instructions.

### **Prose-attach use**

Prose-attach should check whether the local turn condition and opposition/leverage/constraint are rendered if marked required.

### **Health-audit use**

Health audit should flag pages with:

* no active want/opposition/constraint despite high-intensity story state;  
* choices that do not alter any local condition;  
* local situation unsupported by active records.

### **Commitment-block-authoring use**

Storylets should be tested against situation packets: a block is valuable if it can change wants, opposition, leverage, constraints, information, or local turn conditions.

### **Promotion/closeout relevance**

None directly.

### **MCP/context-packet requirements**

Add:

get_present_situation_packet(story_slug, page_id?, branch_id?)

Context packet for turn-cycle should include a compact situation packet by default.

### **World-index edge requirements**

No new stored edges required beyond improving existing edge extraction. The packet depends on richer edges.

### **Validator requirements**

Deterministic:

* every situation entry cites active records;  
* every local turn condition maps to at least one possible event outcome/choice/effect;  
* no future page IDs;  
* no actor knowledge violation.

Judgment-based:

* whether the situation is dramatically compelling;  
* whether opposition is strong enough;  
* whether choices are emotionally meaningful.

### **Page-plan rendering requirements**

Add:

## 8b. Present causal situation

- Immediate want:  
- Active opposition:  
- Leverage/resources:  
- Constraints:  
- Information asymmetry:  
- What can turn locally on this page:

### **Implementation blast radius**

Low-to-medium. No schema state class, but requires MCP, page-plan template, health-audit checks, and prose receipt checks.

### **Risks**

* Can drift into “scene beat” thinking. Avoid by grounding every entry in active records.  
* Can become verbose. Keep it compact and current-page scoped.

### **What happens if Worldloom does not add it**

Page plans will keep listing state ingredients but fail to tell the prose renderer what dramatic situation the reader should experience.

---

## **4. Reader expectation / payoff handling packet**

### **Classification**

Sharpen existing `STQ`; MCP/page-plan projection; validator/audit support.

### **Story problem solved**

`STQ` already tracks open setup/question/promise. But reader-facing expectation management needs more than “open question exists.” The prose renderer needs to know whether this page should:

* foreground;  
* echo;  
* complicate;  
* defer;  
* partially answer;  
* pay off;  
* avoid resolving;  
* convert a setup into a new question.

### **Why existing structures are insufficient**

`STQ` is the right state owner. It already has `setup_kind`, `question_or_setup`, `salience`, `audience_visibility`, `source_event`, `source_records`, `payoff_of`, `status`, `answer_event`, and `answer_records`.

The insufficiency is in **projection and rendering**, not core state.

### **Structural shape**

Non-state packet:

reader_expectation_packet:  
 page: PG-17  
 relevant_stq:  
   - stq: STQ-5  
     audience_visibility: audience_knows_setup  
     current_status: open  
     this_page_handling: complicate  
     foreground_level: medium  
     supporting_records: [BEL-31, STSEC-2]  
     forbidden_moves:  
       - "Do not answer whether the magistrate forged the warrant."  
     payoff_requirements_if_answered:  
       - "Must cite answer_records."

### **Lifecycle**

Generated per page. `STQ` lifecycle remains append-only through create/supersede.

### **Bootstrap use**

Bootstrap should seed only actual reader-facing setups/questions/promises. Avoid turning every curiosity into an `STQ`.

### **Turn-cycle use**

Turn-cycle should decide per relevant `STQ` what this page does with it. It should be explicit when a page pays off or complicates a question.

### **Prose-attach use**

If page plan says `pay_off`, prose must render payoff. If page plan says `avoid_resolving`, prose must not accidentally answer.

### **Health-audit use**

Audit should detect:

* high-salience `STQ` ignored for too long;  
* answered `STQ` without adequate answer records;  
* prose resolving an `STQ` without state;  
* repeated foregrounding with no complication/payoff.

### **Commitment-block-authoring use**

Storylets can target `story_question_open`, `promise_due`, and `story_question_status`. Existing predicates are enough, but block authors should tag whether a storylet foregrounds, complicates, or pays off an `STQ`.

### **Promotion/closeout relevance**

If an `STQ` payoff asserts canon-level truth, promotion flow cares. Otherwise no direct promotion.

### **MCP/context-packet requirements**

Add richer `open_story_questions` projection:

* source records;  
* payoff chain;  
* answer records if any;  
* pages since last foregrounded;  
* audience visibility;  
* recommended page-plan handling.

### **World-index edge requirements**

Extract:

* `story_question_source_record`;  
* `story_question_payoff_of`;  
* `story_question_answer_record`;  
* `story_question_source_event`.

### **Validator requirements**

Deterministic:

* payoff/answer records exist;  
* setup predates payoff;  
* answer event exists;  
* paid-off/answered `STQ` not still active;  
* page plan `pay_off` must correspond to `STQ` supersession or answer records;  
* prose receipt checks payoff rendering.

Judgment-based:

* payoff satisfaction;  
* whether foregrounding is subtle or clumsy;  
* suspense/curiosity quality.

### **Page-plan rendering requirements**

Add or amend §10b:

## 10c. Reader-facing setup/payoff handling

- STQ-5:  
 - What the reader currently knows:  
 - What relevant characters know:  
 - This page should: foreground | echo | complicate | defer | pay_off | avoid_resolving  
 - Required wording/imagery/beat:  
 - Forbidden premature answer:

### **Implementation blast radius**

Mostly page-plan, MCP, index edges, prose receipt, health-audit.

### **Risks**

* Can become mechanical “promise/payoff” advice. Keep it branch-local and record-cited.  
* Could tempt expected payoff scheduling. Do not add `expected_chapter`, `act_position`, or deadline unless represented by `CLK`/`OBL`.

### **What happens if Worldloom does not add it**

`STQ` will remain structurally valid but underused by prose, causing setups to vanish, payoffs to feel unearned, or mysteries to resolve accidentally.

---

## **5. Dramatic irony / audience knowledge packet**

### **Classification**

MCP/page-plan projection plus validators/audits; not active state.

### **Story problem solved**

Worldloom has strong knowledge structures but no concise view of:

* what the audience knows;  
* what the viewpoint actor knows;  
* what other actors know;  
* what secrets are visible as clues but not understood;  
* which actions would violate observer firewall;  
* which irony should be foregrounded in prose.

### **Why existing structures are insufficient**

`BEL`, `STSEC`, `DA`, observer firewall, and page plans cover the pieces. But dramatic irony is a relation between audience knowledge and character knowledge. It is a derived view.

Adding a new active `STAUD` record would duplicate belief/secret/artifact state. The right answer is a packet.

### **Structural shape**

dramatic_irony_packet:  
 audience_known:  
   - BEL-31  
   - STSEC-2.clue_carrier[DA-5]  
 viewpoint_actor: STENT-4  
 actor_known:  
   - BEL-18  
 actor_blind_spots:  
   - STSEC-2  
 other_actor_known:  
   - actor: STENT-11  
     knows: [BEL-31]  
 this_page_use:  
   - "Let the reader understand the guard is lying before Mara does."  
 forbidden:  
   - "Mara cannot act on BEL-31 unless she receives evidence."

### **Lifecycle**

Generated per page/branch leaf.

### **Bootstrap use**

If the root page opens with audience-character asymmetry, render it explicitly.

### **Turn-cycle use**

Turn-cycle should compute dramatic irony before authoring page plan and choices, especially when secrets, lies, dramatic reveals, or hidden plans are active.

### **Prose-attach use**

Validate that prose does not:

* give actor access to inaccessible audience knowledge;  
* reveal hidden truth beyond page-plan permission;  
* flatten intended irony by overexplaining.

### **Health-audit use**

Flag:

* audience-visible clues never used;  
* actor actions that exploit audience-only knowledge;  
* secrets partially revealed but not represented by `BEL` or `STSEC` lifecycle;  
* page plans omitting high-salience asymmetries.

### **Commitment-block-authoring use**

Storylets can include irony-aware predicates using existing `BEL`/`STSEC` predicates. No new state.

### **Promotion/closeout relevance**

Only if hidden truth becomes canon candidate.

### **MCP/context-packet requirements**

Add:

get_dramatic_irony_packet(story_slug, page_id?, viewpoint_actor?)

Context packet should include high-salience audience/actor asymmetries.

### **World-index edge requirements**

Needs richer `BEL`, `STSEC`, and `DA` edge extraction.

### **Validator requirements**

Deterministic:

* actor knowledge cited from `BEL`/access records;  
* audience-known claims cite visible `BEL`, `DA`, `STSEC` clue carrier, or prose-plan permission;  
* no character action uses inaccessible knowledge.

Judgment-based:

* whether irony is dramatically effective;  
* whether withholding feels fair.

### **Page-plan rendering requirements**

Add:

## 11b. Dramatic irony / information asymmetry

- Reader knows or can infer:  
- Viewpoint actor knows:  
- Other actors know:  
- This page may foreground:  
- This page must withhold:  
- Observer-firewall constraints:

### **Implementation blast radius**

MCP, page-plan, health-audit, prose-attach, edge extraction.

### **Risks**

* Over-rendering can spoil subtlety. Keep packet concise and permission-focused.  
* It can become omniscient narration by accident. Page plan must specify POV/narration limits.

### **What happens if Worldloom does not add it**

The observer firewall will prevent some errors, but the prose renderer will miss opportunities for suspense, dramatic irony, and controlled revelation.

---

## **6. Social pressure packet**

### **Classification**

Sharpen existing `SREL`, `BEL`, `OBL`, `CLK`, `THR`, `STENT`; MCP/page-plan projection.

### **Story problem solved**

Social fiction needs more than pairwise relationship axes. It often depends on:

* public legitimacy;  
* group expectations;  
* face/shame;  
* institutional pressure;  
* factional beliefs;  
* reputation consequences;  
* social contracts;  
* sanctions.

Current structures can represent this, but the ownership is split and the page plan does not synthesize it.

### **Why existing structures are insufficient**

`SREL` can represent approval/respect/hostility/power imbalance. `BEL` can represent public or factional belief. `OBL` can represent social duty. `CLK` can represent escalating scandal. `THR` can represent ongoing social risk. But no view says:

“The public thinks he lied; the guild expects apology; the magistrate can sanction him; his ally’s trust is at risk; the scandal clock is one tick from firing.”

Do not add `STREP`. A generic reputation meter would hide causal detail.

### **Structural shape**

social_pressure_packet:  
 public_or_group_entities:  
   - STENT-20  
 public_beliefs:  
   - BEL-51  
 relationship_axes:  
   - SREL-22  
   - SREL-23  
 obligations:  
   - OBL-12  
 sanctions_or_clocks:  
   - CLK-7  
 legitimacy_at_stake:  
   - "Guild standing"  
 this_page_pressure:  
   - "Apologize publicly, deflect blame, or expose the witness."

### **Lifecycle**

Generated per page. Underlying records remain active state.

### **Bootstrap use**

Create group/faction `STENT` records when groups exert branch-relevant pressure. Use `BEL` holder as concrete `STENT` where possible instead of loose prose.

### **Turn-cycle use**

When a page changes public belief, shame, status, obligation, or faction pressure, turn-cycle should update `BEL`, `SREL`, `OBL`, `CLK`, or `THR`, then render social pressure.

### **Prose-attach use**

Prose must reflect public/social stakes when marked required; no invented reputation shifts without state.

### **Health-audit use**

Flag:

* social consequences in prose with no `BEL`/`SREL`/`OBL`/`CLK`;  
* public belief changes without witness/access basis;  
* generic “everyone hates him” with no holder/group;  
* social pressure not surfaced in choices.

### **Commitment-block-authoring use**

Add storylet guidance for public apology, face-saving, scapegoating, faction negotiation, sanction, rumor spread, and social repair using existing records.

### **Promotion/closeout relevance**

Institutional or relationship outcomes may become promotion candidates.

### **MCP/context-packet requirements**

Add:

get_social_pressure_packet(story_slug, page_id?, actor_id?)

### **World-index edge requirements**

Extract group/public belief edges, relationship participants, obligation owed_by/owed_to, clock drivers/linked records.

### **Validator requirements**

Deterministic:

* social pressure entries cite concrete records;  
* group/public pressure uses `STENT` group or `BEL.holder` pattern consistently;  
* public belief basis has access route;  
* relationship participants exist;  
* sanction clock threshold effects have records.

Judgment-based:

* social realism;  
* shame/face nuance;  
* whether pressure feels culturally specific.

### **Page-plan rendering requirements**

Add:

## 9d. Social pressure / public stakes

- Relevant public/faction/group:  
- What they believe or expect:  
- Who can enforce it:  
- Relationship axes at risk:  
- Obligations/sanctions/clocks:  
- This page’s social pressure:

### **Implementation blast radius**

Mostly MCP, page-plan, health-audit, edge extraction, skill guidance.

### **Risks**

* Group entities can proliferate. Only create group `STENT` when branch-relevant.  
* Reputation can become a generic score. Reject scores unless every change maps to concrete beliefs/relations/sanctions.

### **What happens if Worldloom does not add it**

Social consequences will remain scattered and under-rendered. The system will validate facts but miss social texture.

---

## **7. Branch possibility-space map**

### **Classification**

MCP/health-audit/authoring view; not active branch state.

### **Story problem solved**

Branching stories become hard to audit because each branch carries inherited debts, incompatible truths, unresolved questions, clocks, secrets, and possible convergence constraints. Authors need a map.

### **Why existing structures are insufficient**

`BR`, `PG.branch_path`, and `state_snapshot.active_records` hold the data. Health-audit has compatibility mode. But there is no concise branch possibility-space view.

Do not force convergence. This view should validate compatibility only.

### **Structural shape**

branch_possibility_space:  
 branch_leaves:  
   - page: PG-19  
     branch: BR-2  
     active_debts:  
       obligations: [OBL-8]  
       consequences: [CNSQ-4]  
       clocks: [CLK-3]  
       secrets: [STSEC-2]  
       questions: [STQ-5]  
     divergent_truths:  
       facts: [SF-44]  
       beliefs: [BEL-31]  
       statuses: [STSTAT-27]  
     canon_candidates: [SF-44]  
     convergence_compatible_with:  
       - branch: BR-3  
         required_resolutions: [STQ-5, CLK-3]

### **Lifecycle**

Generated on demand by MCP/health-audit.

### **Bootstrap use**

None.

### **Turn-cycle use**

Turn-cycle can query this when forking, closing, or authoring compatibility-sensitive choices.

### **Prose-attach use**

None except branch consistency.

### **Health-audit use**

This becomes a core output of compatibility mode.

### **Commitment-block-authoring use**

Can help create remediation blocks for abandoned branches or debt-heavy leaves.

### **Promotion/closeout relevance**

Important: promotion decisions may affect multiple branches. The map should show which branches contain promotion candidates or counterfactual claims.

### **MCP/context-packet requirements**

Add:

get_branch_possibility_space(story_slug, include_terminal=false)

### **World-index edge requirements**

Depends on improved active-record and branch edges.

### **Validator requirements**

Deterministic:

* branch leaf identification;  
* active debt counts;  
* incompatible active truth detection;  
* canon candidate distribution;  
* convergence precondition compatibility.

Judgment-based:

* whether divergence is interesting or bloated;  
* whether branch debt is artistically acceptable.

### **Page-plan rendering requirements**

Not required on every page. Render only when authoring a fork, convergence-compatible move, terminal page, or audit remediation page.

### **Implementation blast radius**

MCP, health-audit, index queries, tests.

### **Risks**

* Could become convergence pressure. Avoid recommendations like “merge these branches”; use “compatible if these debts resolve.”  
* Could become too big. Provide summaries and targeted retrieval.

### **What happens if Worldloom does not add it**

The story system may remain locally valid but become hard to reason about globally.

# **Sharpen-existing recommendations**

## **Sharpen `STINT`, but do not make it do `STPLAN`’s job**

Keep `STINT` as concise desire/intention state. It should not absorb plan fields. Add only small improvements if needed:

desire_kind: protect | escape | learn | conceal | obtain | repair | punish | persuade | survive | belong | other  
target_records: [...]

But do not add resources/blockers/fallbacks/current steps to `STINT`; that would turn it into an overloaded weak `STPLAN`.

Boundary:

* `STINT`: what the actor wants.  
* `STPLAN`: how the actor is presently trying to pursue it.

## **Sharpen `BEL`**

`BEL` is already strong. It should gain support, not a new replacement.

Recommended improvements:

* index `holder`, `basis.source_event`, `basis.access_records`, `consequences.opens`;  
* MCP summaries by holder;  
* dramatic-irony packet;  
* social-pressure packet;  
* emotion appraisal basis for `STEMO`;  
* plan belief basis for `STPLAN`.

No new belief-like record is needed.

## **Sharpen `SREL`**

`SREL` is strong but should be more consistently used for group/public pressure.

Recommendations:

* allow and encourage group/faction/public `STENT` records when socially causal;  
* add MCP summaries for active relationship axes by participant;  
* extract participant edges;  
* page-plan render relationship axes at risk;  
* health-audit relationship changes unsupported by event/belief/emotion.

Do not use `SREL` for transient emotion. That belongs to `STEMO`.

## **Sharpen `STQ`**

`STQ` should remain the owner of setup/question/promise.

Recommendations:

* add page-plan `this_page_handling` projection, not schema fields that imply a fixed schedule;  
* index source/payoff/answer records;  
* MCP summarize salience, audience visibility, age, last foregrounded page, and payoff chain;  
* prose receipt checks for accidental answer or missing payoff.

Do not add `STPROM`.

## **Sharpen `STSEC`**

Keep clue carriers embedded. Add support:

* index clue carrier records;  
* MCP clue visibility summary;  
* page-plan dramatic-irony and mystery sections;  
* health audit for discovered clues never reflected in `BEL`.

Do not add `STCLUE` now.

## **Sharpen `SLT`**

`SLT` already has prerequisites/effects. Add support for new optional predicates:

plan_active(...)  
plan_blocked(...)  
any_plan_active(...)  
emotion_active(...)  
emotion_pressure(...)

But do not turn `SLT` into a story planner. It remains a commitment block, not an actor-owned strategy.

## **Sharpen `SE`**

Move brittle story-state provenance out of prose strings over time.

Recommended structured additions:

record_introductions:  
 - record_id: STPLAN-12  
   class: STPLAN  
   evidence: [BEL-31, STOBJ-8]  
   rationale: "..."

state_relations:  
 - source_record: SE-22  
   relation: advances_plan  
   target_record: STPLAN-12

This should eventually replace parseable `intro:<CLASS>(...)` tags in `world_logic_rationale`.

# **Non-state support recommendations**

## **Present causal situation packet**

Add as MCP/page-plan support. It is the most important non-state prose improvement.

## **Dramatic irony packet**

Add as MCP/page-plan support. It should be derived from `BEL`, `STSEC`, `DA`, visibility, and observer firewall.

## **Reader expectation/payoff packet**

Add as MCP/page-plan support around `STQ`.

## **Social pressure packet**

Add as MCP/page-plan support around `SREL`, `BEL`, `OBL`, `CLK`, `THR`, and group `STENT`.

## **Branch possibility-space map**

Add as MCP/health-audit support. Do not store it as active state.

## **Pressure texture note**

Add page-plan/audit guidance:

pressure_texture:  
 kind: compression | relief | recovery | dread | delay | deadline | aftermath  
 grounded_in: [CLK-3, CNSQ-4, STEMO-7]  
 prose_instruction: "Let relief and dread coexist; do not resolve the quarantine clock."

This is not a state record. It is render guidance grounded in state.

## **Prose-plan render packet**

Add a machine-facing helper that assembles the page-plan-relevant pieces from state:

get_page_render_packet(story_slug, page_id)

It should return:

* selected event;  
* active actor plans;  
* emotional states;  
* present situation;  
* dramatic irony;  
* reader expectation/payoff;  
* social pressure;  
* clocks/secrets/questions;  
* required beats;  
* forbidden mystery/canon moves;  
* choices.

This is the most direct fix for external prose LLM quality.

# **Negative recommendations**

## **Do not add act structure**

Reject:

* three-act structure;  
* midpoint;  
* climax;  
* resolution mechanics;  
* fixed beats;  
* global plot phase;  
* predetermined endings.

These violate Worldloom’s causal-engine model.

## **Do not add a global drama manager**

A drama manager that targets tension curves, optimal story shape, convergence, or mandatory resolution would fight branch-local state.

The only acceptable “drama management” is local, state-grounded support: clocks, obligations, consequences, story questions, active plans, emotions, and page-plan texture.

## **Do not add `SCENE` as active state**

A page already functions as the committed unit of branch progression, and `SE` owns the event. A scene record would either duplicate page/event state or smuggle in act/beat thinking.

Use a present causal situation packet instead.

## **Do not add `STCLUE`**

`STSEC.clue_carriers` already owns clue lifecycle. Add index/MCP/page-plan support, not a new record.

Split clues later only if clues become reusable independent objects with cross-secret lifecycle, ownership, discovery, degradation, transfer, and promotion concerns. That is not currently proven.

## **Do not add `STREP`**

Generic reputation scores are usually bad ontology. They collapse concrete social causality into a number.

Use:

* `BEL` for public/faction beliefs;  
* `SREL` for approval/respect/hostility;  
* `OBL` for social duties;  
* `CLK` for scandal escalation;  
* `THR` for ongoing social threat;  
* group `STENT` for concrete publics/factions.

## **Do not add `STRES` or capability meters**

Resources and constraints already live in `STOBJ`, `STLOC`, `DA`, `SF`, `STSTAT`, and affordances. Add `STPLAN.resource_basis` and present-situation leverage rendering.

## **Do not add theme/motif/subtext active records**

Theme, motif, and subtext are real craft concerns but poor active branch state.

Allowed forms:

* page-plan style/register note;  
* health-audit commentary;  
* artifact/object/location recurrence;  
* prose receipt craft review;  
* canon/diegetic artifact linkage if materially causal.

Rejected form:

STTHEME-1:  
 theme: "freedom vs duty"  
 required_payoff: ...

That becomes plot-shape scaffolding.

## **Do not add character arc records**

A character arc should emerge from changes in:

* `BEL`;  
* `SREL`;  
* `STEMO`;  
* `STPLAN`;  
* `STINT`;  
* `OBL`;  
* `CNSQ`;  
* `STSTAT`;  
* `SF`.

An `STARC` record would encourage pre-authored transformation rails.

## **Do not add quest records**

Quest-like structures are already covered by `OBL`, `CNSQ`, `THR`, `CLK`, `STQ`, and `SLT`. Add branch possibility-space and page-plan support instead.

# **Page-plan rendering implications**

This is mandatory. The state only helps if the external prose LLM sees it.

Current `pages-prose-plans/PG-<N>.md` should be amended as follows.

## **Keep current sections**

The existing 19-section plan is basically sound. Keep:

* story kernel excerpt;  
* content policy;  
* prose craft contract;  
* canon excerpt;  
* cast/status;  
* location/affordances;  
* selected event/delta;  
* required beats;  
* relationship/belief context;  
* obligations/consequences/threads;  
* clocks/secrets/questions;  
* forbidden mystery resolutions;  
* stopping point;  
* next choices;  
* recent prose continuity;  
* plan frontmatter;  
* cast material projection;  
* style/register;  
* anti-pathology checklist;  
* render-time instruction.

## **Add `STPLAN` rendering**

Add after relationship/belief context:

## 9b. Active actor plans / tactical agency

- STPLAN-12 — Holder: STENT-4.  
 - Objective:  
 - Root intention:  
 - Current step:  
 - Belief basis:  
 - Resources/leverage:  
 - Blockers:  
 - Fallbacks currently available:  
 - Risk posture:  
 - This page’s relation to the plan: advances | tests | blocks | revises | fulfills | abandons | ignores  
 - Prose must show:  
 - Prose must not imply:

## **Add `STEMO` rendering**

Add after active plans:

## 9c. Emotional causality / affective transition

- STEMO-7 — Holder: STENT-4.  
 - Affect and intensity:  
 - Trigger:  
 - Appraisal basis:  
 - Behavioral pressure:  
 - Transition this page:  
 - Prose must render:  
 - Prose must avoid:

## **Add social pressure rendering**

Add after emotional causality:

## 9d. Social pressure / public stakes

- Relevant group/public/faction:  
- What they believe or expect:  
- Who can enforce consequences:  
- Relationship axes at risk:  
- Obligations/sanctions/clocks:  
- This page’s social pressure:

## **Add present causal situation**

Add after required beats:

## 8b. Present causal situation

- Immediate want:  
- Active opposition:  
- Leverage/resources:  
- Constraints:  
- Information asymmetry:  
- What can turn locally on this page:

This section is not a scene beat sheet. Every line should cite state.

## **Expand current §10b into setup/payoff handling**

Current §10b should become stronger:

## 10b. Active clocks, secrets, and story questions

### Clocks  
- CLK-3:  
 - Value/max:  
 - Thresholds:  
 - What pressure is visible:  
 - Whether this page ticks/fires/pauses/resolves:

### Secrets  
- STSEC-2:  
 - Status:  
 - Holders:  
 - Clue carriers visible to reader:  
 - Clue carriers visible to viewpoint actor:  
 - This page may reveal:  
 - This page must not reveal:

### Story questions / setups / promises  
- STQ-5:  
 - Audience visibility:  
 - Source:  
 - Current status:  
 - This page should: foreground | echo | complicate | defer | pay_off | avoid_resolving  
 - Required payoff/complication records:  
 - Forbidden premature answer:

## **Add dramatic irony section**

Add after forbidden mystery resolutions or inside §11:

## 11b. Dramatic irony / information asymmetry

- Reader knows or can infer:  
- Viewpoint actor knows:  
- Other actors know:  
- This page may foreground:  
- This page must withhold:  
- Observer-firewall constraints:

## **Add pressure texture note**

Add inside style/register notes:

## 17b. Pressure texture

- Texture: compression | relief | recovery | dread | delay | aftermath | deadline  
- Grounded in:  
- Prose instruction:  
- Do not:

This should not be a global tension curve. It is local page texture grounded in active state.

## **Add branch possibility note only when relevant**

For forks, convergence-compatible moves, terminal pages, or audit remediation:

## 13b. Branch possibility implications

- This page diverges from:  
- Inherited debts:  
- Incompatible truths:  
- Compatibility conditions:  
- Do not force convergence:

# **Validation strategy**

## **Deterministic validators**

### **New `STPLAN` validators**

* Schema compliance.  
* ID allocation and append-only lifecycle.  
* Active-record class inclusion in `PG.state_snapshot.active_records`.  
* Holder exists and is active.  
* Root intention exists, active, and belongs to holder.  
* Basis/resource/blocker/target records exist.  
* Belief basis accessible to holder.  
* Resource basis accessible or explicitly unavailable as blocker.  
* Current step action family valid.  
* No future page references.  
* Supersession chain valid.  
* Closure statuses require closure event.  
* Event-plan relation consistency.  
* Active contradictory plan warning/fail depending on explicit conflict marker.

### **New `STEMO` validators**

* Schema compliance.  
* Holder exists and is active.  
* Trigger event exists and is on branch path or same event.  
* Appraisal basis accessible to holder.  
* Orientation records exist.  
* Intensity/kind/pressure enum compliance.  
* No future page references.  
* Supersession/settlement lifecycle.  
* Extreme emotion stale warning.  
* Emotion-to-agency compatibility warning.

### **Existing-state support validators**

* `SE.commitment.alias_bindings` should include `CLK`, `STSEC`, `STQ`, `STPLAN`, and `STEMO` where relevant.  
* `active_records_full_shape` should become fail for current-contract pages once migration is complete.  
* `midstory_record_introduction_grounding` should include `STPLAN` and `STEMO`, or move to structured `SE.record_introductions[]`.  
* `observer_firewall` should understand `STPLAN.belief_basis` and `STEMO.appraisal_basis`.  
* `state_delta_class_integrity` should include new active classes.  
* `snapshot_replay_equality` should include new active classes.

### **Page-plan/prose validators**

* If page plan cites `STPLAN`, prose must not contradict plan resources/blockers.  
* If page plan cites `STEMO`, prose must render required emotional transition.  
* If page plan says `STQ pay_off`, prose must render payoff and state must support answer/payoff.  
* If page plan says `avoid_resolving`, prose must not resolve.  
* Dramatic irony packet must not grant actor inaccessible knowledge.  
* Present situation entries must cite active records.

## **Judgment-based audits**

Do not pretend these are deterministic:

* whether a plan is clever;  
* whether a plan is character-specific;  
* whether emotional intensity is artistically right;  
* whether suspense is effective;  
* whether payoff is satisfying;  
* whether social pressure feels culturally convincing;  
* whether motif/subtext works;  
* whether prose is beautiful.

These belong in health-audit commentary or prose receipt craft review.

## **What must not be deterministic**

Do not mechanize:

* “optimal” story;  
* required escalation;  
* required climax;  
* required theme;  
* required character growth;  
* ideal pacing curve;  
* correct emotional response;  
* mandatory payoff timing;  
* mandatory convergence.

# **MCP and world-index strategy**

## **New context-packet summaries**

Add to `ContextPacketStoryBundleContext`:

active_intentions  
active_actor_plans  
active_emotional_states  
active_beliefs_by_holder  
active_relationships_by_participant  
active_statuses  
active_locations_in_scope  
active_objects_in_scope  
active_artifacts_in_scope  
present_situation_summary  
dramatic_irony_summary  
reader_expectation_summary  
social_pressure_summary  
branch_possibility_summary

Keep summaries compact. Provide targeted retrieval helpers for full details.

## **New targeted retrieval helpers**

Recommended helpers:

get_active_actor_plans(story_slug, branch_page_id?, actor_id?)  
get_active_emotional_states(story_slug, branch_page_id?, holder_id?)  
get_present_situation_packet(story_slug, page_id?)  
get_dramatic_irony_packet(story_slug, page_id?, viewpoint_actor?)  
get_reader_expectation_packet(story_slug, page_id?)  
get_social_pressure_packet(story_slug, page_id?, actor_id?)  
get_branch_possibility_space(story_slug)  
get_page_render_packet(story_slug, page_id)

`get_page_render_packet` should become the primary machine-facing surface for prose-plan creation and prose attach.

## **World-index edge extraction requirements**

Add edge types for current records first:

| Edge | Source |
| ----- | ----- |
| `belief_holder` | `BEL.holder` |
| `belief_basis_event` | `BEL.basis.source_event` |
| `belief_access_record` | `BEL.basis.access_records[]` |
| `belief_opens` | `BEL.consequences.opens[]` |
| `relationship_participant` | `SREL.participants[]` |
| `relationship_derived_from` | `SREL.derived_from[]` |
| `intention_holder` | `STINT.holder` |
| `status_entity` | `STSTAT.entity` |
| `clock_linked_record` | `CLK.linked_records[]` |
| `clock_tick_event` | `CLK.tick_history[].event` |
| `secret_holder` | `STSEC.holders[]` |
| `secret_truth_anchor` | `STSEC.truth_anchor` |
| `secret_clue_carrier` | `STSEC.clue_carriers[].record` |
| `secret_reveal_record` | `STSEC.reveal_records[]` |
| `story_question_source` | `STQ.source_records[]` |
| `story_question_payoff_of` | `STQ.payoff_of[]` |
| `story_question_answer_record` | `STQ.answer_records[]` |
| `event_actor` | `SE.actor` |
| `event_target` | `SE.targets[]` |
| `event_selected_storylet` | `SE.commitment.selected_slt_id` |

Then add new edges for `STPLAN` and `STEMO` as described above.

## **MCP schema drift fixes**

Before adding new state classes, fix current MCP projection drift:

* `open_obligations` should match current `OBL` schema.  
* `storylet_pool_summary` should expose enough precondition/effect summary to be useful.  
* `hidden_secrets` should include clue carrier visibility distinction.  
* `open_story_questions` should include source/payoff/answer/progression metadata.  
* active `STINT`, `BEL`, `SREL`, `STSTAT`, `STLOC`, `STOBJ`, and `DA` should be queryable without raw file reading.

# **Blast-radius analysis**

## **Docs**

Update:

* `docs/FOUNDATIONS.md` with a short note that actor-owned plans and affective states are causal branch state, not plot-shape machinery.  
* `.claude/skills/_shared-templates/story-state-contract.md` active record list, state snapshot, predicate DSL, page-plan contract.  
* `.claude/skills/_shared-templates/story-record-schemas.md` with `STPLAN` and `STEMO`.  
* `docs/MACHINE-FACING-LAYER.md` for new MCP helpers.  
* `docs/CONTEXT-PACKET-CONTRACT.md` for new packet fields.  
* `docs/HARD-GATE-DISCIPLINE.md` only if new hard gates are added.

## **Schemas**

Add:

* `story-plan.schema.json`;  
* `story-emotion.schema.json`.

Update:

* `story-event.schema.json`;  
* `story-page.schema.json`;  
* `storylet.schema.json` if predicates/effects include plans/emotions;  
* schema registry;  
* active records helper;  
* state-delta class integrity.

## **Skills**

Update:

* bootstrap: seed load-bearing plans/emotions;  
* turn-cycle: maintain plans/emotions and render packets;  
* prose-attach: validate prose against plan/emotion/situation/irony/payoff;  
* health-audit: stale/contradictory plan and emotion checks;  
* commitment-block-authoring: plan/emotion predicates/effects;  
* promotion-to-canon: ignore plans/emotions except as evidence context;  
* promotion-closeout: close/supersede affected plans/emotions if canon verdict invalidates basis.

## **Validators**

Add validators for `STPLAN` and `STEMO`.

Update:

* schema compliance registration;  
* active records replay;  
* no-story-state-in-place mutation;  
* state-delta class integrity;  
* snapshot replay equality;  
* active records full-shape;  
* cross-file reference;  
* observer firewall;  
* midstory record introduction grounding;  
* validation trace shape if new gates appear.

## **Patch engine**

Update:

* `IdAllocations`;  
* `OPERATION_KINDS`;  
* `PatchOperation`;  
* `STORY_RECORD_SPECS`;  
* commit ordering if needed;  
* envelope schema description;  
* tests.

## **MCP**

Update:

* context packet builder;  
* shared types;  
* targeted retrieval helpers;  
* capability descriptions;  
* persisted packet slices;  
* tests.

## **World-index**

Update:

* node types;  
* story dirs;  
* edge types;  
* edge extraction;  
* public types;  
* tests/fixtures.

## **Tests**

Test categories:

1. `STPLAN` schema pass/fail.  
2. `STEMO` schema pass/fail.  
3. State replay with new active classes.  
4. Append-only supersession.  
5. Holder/root-intention/basis validation.  
6. Belief access validation for plans/emotions.  
7. Plan contradiction/staleness health audit.  
8. Emotion trigger/appraisal validation.  
9. Page-plan render packet includes plans/emotions/situation/irony.  
10. Prose receipt detects missing emotional transition.  
11. Prose receipt detects actor using audience-only knowledge.  
12. MCP context packet includes new summaries.  
13. World-index extracts new edges.  
14. Branch possibility-space diff across divergent branches.  
15. Legacy story bundle remains valid without optional `STPLAN`/`STEMO`.

## **Existing story bundles**

No mandatory migration. Existing bundles should remain valid with empty `STPLAN`/`STEMO` active lists only after current-contract snapshots are updated. If optional during transition, validators should permit absence until migration.

# **Ranked roadmap**

## **Priority 0: must-do before adding more complexity**

1. Fix MCP story-bundle context drift for current records.  
2. Expand world-index edge extraction for current story records.  
3. Add active `STINT`, `BEL`, `SREL`, `STSTAT`, `STLOC`, `STOBJ`, and `DA` summaries to context packets.  
4. Fix `SE.commitment.alias_bindings` to include `CLK`, `STSEC`, and `STQ`.  
5. Decide whether to replace parseable `intro:<CLASS>(...)` tags with structured `SE.record_introductions[]`.  
6. Add page-plan render packet helper or equivalent MCP surface.

This is not glamorous, but it is the foundation. Without it, new records will become more markdown that skills must raw-read.

## **Priority 1: high-value missing structures**

1. Add `STPLAN`.  
2. Add `STEMO`.  
3. Update validators, patch engine, world-index, MCP, page-plan templates, and skills for both.

These two records materially improve causal agency and emotional believability.

## **Priority 2: support/rendering/audit improvements**

1. Present causal situation packet.  
2. Dramatic irony packet.  
3. Reader expectation/payoff packet.  
4. Social pressure packet.  
5. Pressure texture page-plan note.  
6. Branch possibility-space map.  
7. Prose receipt checks for plan/emotion/payoff/irony rendering.

These are high value but should not become active state.

## **Priority 3: future candidates / defer**

1. `STNORM` only if group norms become branch-local causal objects independent of `BEL`/`SREL`/`OBL`/`CLK`.  
2. Independent clue records only if clue lifecycle becomes cross-secret, transferable, destructible, or reused across mysteries.  
3. Capability/access records only if affordances and `STSTAT`/`STOBJ`/`STLOC` cannot handle recurring constraints.  
4. Motif recurrence tooling as a non-state prose/audit feature, not active branch state.

# **Final verdict**

Worldloom is **not structurally empty**. It is already a sophisticated causal branching story engine.

But it is not complete.

It is missing **two genuinely important active story structures**:

1. **`STPLAN`** for medium-range character agency.  
2. **`STEMO`** for emotional causality.

Everything else that feels missing is mostly a **support/rendering/audit gap**, not a new state-record gap:

* local conflict should be a present causal situation packet;  
* dramatic irony should be a knowledge/asymmetry packet;  
* reader expectation should sharpen `STQ`;  
* social pressure should sharpen `SREL`/`BEL`/`OBL`/`CLK`/group `STENT`;  
* resources should be rendered through `STOBJ`/`STLOC`/`DA`/`SF` plus `STPLAN.resource_basis`;  
* branch possibility-space should be MCP/audit;  
* pressure texture should be page-plan guidance;  
* theme/motif/subtext should remain prose/audit guidance unless materially causal.

The strongest roadmap is:

**First fix MCP/index/page-plan support for the ontology Worldloom already has. Then add `STPLAN` and `STEMO`. Then add the non-state render/audit packets that make those structures visible to story skills and the external prose LLM. Reject all fixed-shape plot machinery.**

