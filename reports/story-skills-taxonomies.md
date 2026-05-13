## **Core judgment**

The contract should **not** try to make every narrative enum a permanently closed flat list. That will recreate the bloat problem in a different form. The right move is to split vocabularies into two kinds:

1. **Hard-closed operational enums** where validators need exact finite states: `outcome_route`, `authority`, `terminal_status`, receipt verdicts, patch/state-delta verbs, hard-gate keys.  
2. **Controlled-open semantic taxonomies** where the base vocabulary is canonical but extensions are allowed through a registry with a parent, definition, exclusions, and an operational consumer: `action_family`, `SLT` causal move family, relationship axes, dialogue/exit intents, STENT story roles, maybe belief modes.

This aligns with FOUNDATIONS’ schema-minimalism rule: every field must be load-bearing, and story scope should validate state, branch isolation, consequences, and mystery authority without drifting into arc/plot rails. It also matches the contract’s own plan-authority model: story state is authoritative at page-plan commit, while prose is only a rendering, not a second state engine.

The strongest evidence from outside Worldloom points the same way. Storylet systems work by gating reusable chunks with preconditions, qualities, salience, and effects rather than by hardcoding dramatic arcs; Yarn Spinner’s current docs frame storylets as nodes selected by saliency/conditions, and Emily Short describes storylets becoming available/unavailable as state qualities change. Narrative planning research similarly treats narrative generation as stateful action sequencing with preconditions, effects, causality, and character intentionality. Social-simulation systems such as Comme il Faut / Ensemble separate social facts, relationships, statuses, social networks, and rules, which is directly relevant to `SREL.axis`, `BEL`, `STINT`, and predicate design. Dialogue-act standards also use extensible taxonomies with hierarchy and orthogonal qualifiers rather than one monolithic enum.

## **Biggest problems in the current contract**

The current contract is already much better than a bloated story pipeline, but the enum layer has five concrete defects.

First, **`BEL.confidence` is semantically polluted**. `performative_lie` is not a confidence level; it is a belief/claim mode. `rumor` is also not confidence; it is provenance or propagation state. This will make social-state validation brittle. The contract currently uses `truth_relation`, `confidence`, and `visibility` as the core `BEL` enums.

Second, **`PG.entity_status.life` and `agency` mix categories**. `missing` is not a life state. `incapacitated` can be a bodily/agency state. `dead` appearing inside `agency` is redundant but useful as a derived lock state. The current status block should be normalized because it is consumed by predicates and snapshots.

Third, **`SLT.purpose` is too close to dramatic-function labeling**. Values like `aftermath`, `escalation`, `reveal`, `intimacy`, and `closure` are not wrong, but the axis is underspecified: some are information moves, some are social moves, some are pacing effects, some are terminal effects. FOUNDATIONS explicitly says commitment blocks are causal moves, not acts, arcs, mini-stories, or plot rails.

Fourth, **`visible_affordances.action_families` and `exit_options.intent` are duplicate, incompatible vocabularies**. One says `escape`, the other says `flee`; one says `pursue`, the other does not; one says `hide`, the other says `hide`. They should use one shared action-family taxonomy. Interactive-fiction systems treat player action as a broad action space, not a tiny closed menu; Inform’s action model has many built-in action types, and VerbNet’s verb classes show why action taxonomies should be hierarchical rather than a flat fixed list.

Fifth, **the record-class inventory is inconsistent with FOUNDATIONS**. FOUNDATIONS says story-bundle classes include `SLB`, audit/promotion classes `SAU`, `SP`, and `RSP`, and it specifically names the STENT `role_in_story` enum as a shared surface. The contract’s inventory omits those auxiliary classes and does not define the STENT role enum at all.

## **Enum inventory and proposed disposition**

| Surface | Current enum style | Proposed disposition |
| ----- | ----- | ----- |
| Record classes | Closed | Keep closed, but synchronize with FOUNDATIONS: core classes plus auxiliary classes. |
| `BEL.truth_relation` | Closed | Keep closed; add `future_contingent`. |
| `BEL.confidence` | Closed but conflated | Split into `belief_mode` + `confidence`; remove `performative_lie` and `rumor` from confidence. |
| `BEL.visibility` | Closed | Keep closed; add `factional` and `rumored`; clarify `concealed` vs `suppressed`. |
| `PG.entity_status.life` | Closed | Replace with `alive |
| `PG.entity_status.agency` | Closed | Replace with agency/capacity values; remove `missing`. |
| `PG.visible_affordances.action_families` | Implicit examples | Make controlled-open shared `action_family` taxonomy. |
| Mystery claim `authority` | Closed | Keep exactly. It aligns with FOUNDATIONS. |
| Mystery claim `status` | Closed | Replace vague `advanced` with precise statuses. |
| `continuation.terminal_status` | Closed | Keep. |
| `SE.event_kind` | Closed | Rename to `event_origin`; remove `world_block` and `prose_attach`. |
| `SE.outcome_route` | Closed | Keep. It is well-partitioned. |
| `SE.promotion_claims.authority` | Closed | Keep. |
| `SLT.scope.visibility` | Closed | Keep. |
| `SLT.purpose` | Closed | Rename to `move_family`; replace with causal-move taxonomy. |
| `SLT.beats.function` | Closed | Keep small, add `action`. |
| `SLT.exit_options.intent` | Closed with `custom` | Replace with shared `action_family`; remove `custom`. |
| `saliency.urgency` | Closed | Keep. |
| `mystery_policy.allowed_authority` | Closed | Keep. |
| `provenance.origin` | Closed | Add `manual_authoring` and `promotion_closeout` if those workflows create blocks. |
| Prose receipt verdict/check enums | Closed | Keep. |
| `repair_recommendation` | Closed | Keep, maybe add `revise_plan` only if prose-attach can detect bad plan artifacts. |
| Predicate DSL predicate names | Closed grammar | Keep closed, but add missing predicates for active records, intentions, object/artifact access, and per-actor affordances. |
| `relationship_axis` axis | Currently free placeholder | Define controlled-open base taxonomy. |
| STENT `role_in_story` | Mentioned in FOUNDATIONS, absent here | Add to contract or remove as a shared surface. I recommend adding it as a controlled-open taxonomy. |

## **Proposed amendments to `story-state-contract.md`**

### **1. Add a vocabulary policy section before §4**

Add this after §3, before the schema definitions:

## 3a. Vocabulary Policy

Story-state vocabularies are divided into two classes.

### Hard-closed operational enums

Hard-closed enums are finite validator states. Skills must not extend them without amending this contract.

Hard-closed enums include:

- `SE.outcome_route`

- mystery/canon `authority`

- `PG.state_snapshot.continuation.terminal_status`

- `SE.state_delta` verbs: `create | supersede | close`

- validation trace gate keys

- prose receipt verdict/check statuses

- patch/write-order lifecycle states

### Controlled-open semantic taxonomies

Controlled-open taxonomies have a canonical base vocabulary, but new values may be added only through a vocabulary amendment. Every added value must define:

- `id`

- `parent` value, when applicable

- one-sentence operational definition

- mutually exclusive sibling values

- examples and non-examples

- consuming validator, predicate, planner, renderer, or audit surface

No ad hoc `custom`, `other`, or one-off enum values are allowed inside committed records. If a value is not in the base vocabulary, it must be registered before use.

Controlled-open taxonomies include:

- `action_family`

- `SLT.move_family`

- `SREL.axis`

- `STENT.role_in_story`

- dialogue / communicative subfunctions, when introduced

This is the single most important amendment. ISO-style dialogue-act taxonomies explicitly allow extension while preserving hierarchy and sister/dominance relations, which is exactly the governance model needed here.

### **2. Correct the record-class inventory**

Replace the current inventory header with two groups:

Story-bundle record classes are split into core page-cycle state records and auxiliary audit / batch / promotion records.

### Core page-cycle state records

| Class | Purpose |

|---|---|

| `STENT` | Story-local entity mirror or story-local entity. |

| `STINT` | Intention held by an entity. |

| `SF` | Branch / story-local fact. |

| `BEL` | Belief, knowledge, suspicion, public claim, lie, witness memory, or misconception. |

| `SE` | Event; the single causal tick that produced a page. |

| `OBL` | Obligation. |

| `CNSQ` | Consequence. |

| `THR` | Thread. |

| `SREL` | Relationship. |

| `STLOC` | Location. |

| `STOBJ` | Object. |

| `DA` | Story-local diegetic artifact. |

| `BR` | Branch. |

| `PG` | Page / causal-tick state snapshot. |

| `CHC` | Emitted choice. |

| `SLT` | Commitment block: reusable causal move with preconditions, beats, effects, exits, and saliency. |

### Auxiliary story-bundle records

| Class | Purpose |

|---|---|

| `SLB` | Storylet / commitment-block batch or generated block set. |

| `SAU` | Story-bundle audit. |

| `SP` | Story-promotion record. |

| `RSP` | Remediation / response card scoped under an audit. |

This removes the current mismatch with FOUNDATIONS, which says story-bundle architecture includes both per-bundle state classes and per-bundle audit/promotion classes.

### **3. Add the missing STENT story-role taxonomy**

Because FOUNDATIONS names `STENT.role_in_story` as a shared surface, the contract should define it. Do not use literary-role values like “hero” or “villain”; those are too interpretive. Use operational story functions.

role_in_story:

 - viewpoint          # entity whose local perception can anchor page prose or choice framing

 - player_proxy       # entity through whom player agency is primarily expressed

 - primary_actor      # entity with recurring causal agency in the branch

 - opposing_actor     # entity whose intention materially blocks a primary actor

 - allied_actor       # entity whose intention materially supports a primary actor

 - authority          # entity with recognized local power to permit, command, judge, or sanction

 - dependent          # entity whose vulnerability or need creates obligations for others

 - witness            # entity whose observation, memory, testimony, or silence matters

 - information_source # entity primarily useful because of knowledge, rumor, record access, or interpretation

 - pressure_source    # entity whose presence creates danger, urgency, temptation, scarcity, or social cost

 - social_bridge      # entity connecting otherwise separate groups, places, registers, or institutions

 - background         # entity present for continuity or texture but not currently a causal driver

Make this a list, not a scalar. A character can be both `authority` and `opposing_actor`, or both `witness` and `dependent`.

### **4. Replace the `BEL` epistemic enums**

Current `BEL.confidence` mixes truth, confidence, sincerity, and circulation. Replace the `BEL` epistemic block with this:

truth_relation: true | false | partly_true | unknown | contested | future_contingent | branch_counterfactual   # *

belief_mode: knows | believes | suspects | doubts | denies | reports | claims | deceives | misremembers | interprets   # *

confidence: certain | high | medium | low | uncommitted   # *

visibility: private | shared | factional | public | rumored | concealed | suppressed   # *

Definitions:

| Field | Values | Meaning |
| ----- | ----- | ----- |
| `truth_relation` | `true` | Claim matches current branch truth. |
|  | `false` | Claim contradicts current branch truth. |
|  | `partly_true` | Claim contains both true and false material parts. |
|  | `unknown` | Branch state cannot adjudicate the claim. |
|  | `contested` | Multiple active records or authorities conflict. |
|  | `future_contingent` | Claim concerns an intended, promised, predicted, or threatened future state. |
|  | `branch_counterfactual` | Claim is true only in this branch or counterfactual branch layer. |
| `belief_mode` | `knows` | Holder treats claim as knowledge with direct or authoritative basis. |
|  | `believes` | Holder sincerely accepts claim without decisive proof. |
|  | `suspects` | Holder leans toward claim but treats it as uncertain. |
|  | `doubts` | Holder leans against claim but has not rejected it completely. |
|  | `denies` | Holder rejects claim. |
|  | `reports` | Holder transmits claim as heard/received information. |
|  | `claims` | Holder asserts claim; sincerity is not encoded. |
|  | `deceives` | Holder knowingly asserts a claim contrary to their own belief. |
|  | `misremembers` | Holder’s memory is treated as corrupted, incomplete, or displaced. |
|  | `interprets` | Holder reads signs, omens, evidence, or behavior into a meaning. |
| `confidence` | `certain/high/medium/low` | Holder’s subjective certainty. |
|  | `uncommitted` | Used for pure reports, strategic claims, or deception where confidence is not the operative axis. |
| `visibility` | `private` | Known only to the holder. |
|  | `shared` | Known by a named small set. |
|  | `factional` | Known within a faction, institution, family, sect, class, or group. |
|  | `public` | Broadly available in the relevant social arena. |
|  | `rumored` | Circulating without stable attribution. |
|  | `concealed` | Hidden by circumstance, secrecy, or access limits. |
|  | `suppressed` | Actively prevented from spreading. |

This better supports the contract’s purpose: `BEL` exists to separate truth from claims, lies, secrets, betrayal, witness asymmetry, and contested public claims. It also follows dialogue-act modeling practice: communicative function, semantic content, and update effects should not be collapsed into one label.

### **5. Normalize `PG.entity_status`**

Replace this:

life: alive | dead | incapacitated | missing | unknown

agency: free | constrained | captive | unconscious | dead

location: STLOC-NNNN | unknown

with this:

life: alive | dead | unknown

agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown

location: STLOC-NNNN | unknown | concealed | offstage

Definitions:

| Field | Value | Meaning |
| ----- | ----- | ----- |
| `life` | `alive` | Entity is biologically/ontologically alive by branch truth. |
|  | `dead` | Entity is dead by branch truth. |
|  | `unknown` | Branch snapshot does not assert life/death. |
| `agency` | `free` | Entity can intentionally act within ordinary constraints. |
|  | `constrained` | Entity can act, but material/social/legal limits narrow options. |
|  | `coerced` | Entity can act, but under threat, blackmail, compulsion, or binding pressure. |
|  | `captive` | Entity is held by another actor/institution/place constraint. |
|  | `incapacitated` | Entity cannot exercise normal agency due to injury, illness, exhaustion, intoxication, magic, tech failure, etc. |
|  | `unconscious` | Entity is temporarily unaware/unresponsive. |
|  | `dead` | Agency locked by death. |
|  | `unknown` | Agency state is not known in this branch snapshot. |
| `location` | `STLOC-NNNN` | Known current location. |
|  | `unknown` | Location unknown to branch state. |
|  | `concealed` | Location exists but is hidden by an active secrecy/suppression condition. |
|  | `offstage` | Entity is not locally reachable in the current scene/time slice. |

`missing` should be modeled as `life: unknown` plus `location: unknown` or `concealed`, and usually a `BEL`, `THR`, or `CNSQ`, not as a life-state.

### **6. Replace mystery claim `status`**

Current:

status: preserved | advanced | held_for_promotion

Proposed:

status: preserved | clue_added | narrowed | apparent_resolution | held_for_promotion

Definitions:

| Value | Meaning |
| ----- | ----- |
| `preserved` | The page did not materially alter the mystery. |
| `clue_added` | New evidence, testimony, trace, or contradiction was added without resolving the mystery. |
| `narrowed` | The page ruled out or weighted possibilities without asserting a final answer. |
| `apparent_resolution` | The branch presents a seeming answer, but only under `authority: apparent`. |
| `held_for_promotion` | The page would assert world-level truth and must pause for promotion/adjudication. |

Delete `advanced`; it is too vague for a validator. FOUNDATIONS requires mystery preservation to distinguish apparent, branch-local counterfactual, and canon-candidate authority.

### **7. Replace `SE.event_kind` with `event_origin`**

Current:

event_kind: story_start | selected_choice | write_in_attempt | world_block | repair | prose_attach | promotion_closeout

Proposed:

event_origin: story_start | selected_choice | write_in_attempt | system_repair | audit_repair | promotion_closeout

Rationale:

* `world_block` is already an `outcome_route`; it should not also be an event kind.  
* `prose_attach` should not be an `SE` origin if prose receipts never mutate `PG` state.  
* `repair` is too vague; distinguish `system_repair` from `audit_repair`.

Keep `outcome_route` unchanged:

outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal

That routing enum is strong and should remain hard-closed. It cleanly separates “can happen,” “transformed by constraints,” “uncertain attempt,” “impossible,” “canon promotion hold,” and “branch terminal.”

### **8. Rename `SLT.purpose` to `move_family`**

Current `purpose` should become `move_family`, because the field is classifying the causal move, not the story’s literary purpose.

Replace:

purpose: aftermath | escalation | reveal | refusal | negotiation | flight | investigation | intimacy | conflict | repair | closure | transition

with:

move_family: orient | world_pressure | aftermath | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | consequence_payoff | recovery | transition | closure

Definitions:

| Value | Meaning |
| ----- | ----- |
| `orient` | Establish the immediate situation, available affordances, changed constraints, or scene state. |
| `world_pressure` | External world force intrudes: scarcity, law, weather, hazard, institution, crowd, taboo, patrol, debt, time pressure. |
| `aftermath` | Characters absorb or respond to consequences of a prior event. |
| `pursuit` | An actor actively advances an intention, search, chase, mission, desire, or plan. |
| `investigation` | Actors seek, test, inspect, infer, research, question, or reduce uncertainty. |
| `disclosure` | Information is revealed, concealed, distorted, confessed, exposed, interpreted, or misdirected. |
| `negotiation` | Actors exchange terms, bargain, coordinate, threaten terms, offer concessions, or seek consent. |
| `bond_shift` | Relationship warmth, trust, intimacy, loyalty, resentment, or emotional distance changes. |
| `status_shift` | Rank, legitimacy, reputation, authority, role, standing, or public face changes. |
| `conflict` | Direct opposition, refusal, contest, coercion, attack, accusation, or resistance. |
| `evasion` | Flight, hiding, stealth, avoidance, misdirection, or withdrawal. |
| `protection` | Rescue, defense, sheltering, guarding, shielding, warning, or sacrifice. |
| `resource_exchange` | Acquisition, loss, trade, theft, payment, rationing, spending, or transfer of material/social resources. |
| `transformation` | Body, object, place, system, relationship, or condition is materially changed. |
| `ritual_protocol` | Rule-bound social, legal, religious, magical, bureaucratic, or institutional procedure is performed. |
| `decision` | A choice, judgment, commitment, abandonment, or irreversible selection is forced or made. |
| `consequence_payoff` | A pending obligation, consequence, thread, or prior setup materially pays off. |
| `recovery` | Rest, healing, regrouping, repair, reconciliation, or restoration after stress. |
| `transition` | Movement to another location, time slice, institution, social arena, or mode of action. |
| `closure` | A branch, debt, thread, or local dramatic problem is closed without opening a higher-salience replacement. |

This taxonomy is intentionally not Propp’s 31 functions. Propp is useful because he demonstrates that recurring narrative functions can be abstracted from surface characters, but his folktale sequence is too genre-specific and sequence-like for Worldloom’s causal-block model.

### **9. Expand `SLT.beats.function` only slightly**

Current:

function: setup | pressure | turn | consequence | exit

Proposed:

function: setup | action | pressure | turn | consequence | exit

Definitions:

| Value | Meaning |
| ----- | ----- |
| `setup` | Establish local context, affordance, position, or expectation. |
| `action` | Execute the central physical, social, investigative, or communicative move. |
| `pressure` | Apply opposition, cost, risk, constraint, urgency, temptation, or complication. |
| `turn` | Reframe the situation through reversal, discovery, refusal, escalation, or altered leverage. |
| `consequence` | Show the immediate state/social/material effect. |
| `exit` | Land the stopping condition and expose next affordances or closure. |

This preserves minimalism while removing the awkward case where the actual action has to be mislabeled as `setup` or `turn`.

### **10. Create one shared `action_family` taxonomy**

Use the same taxonomy for:

* `PG.state_snapshot.visible_affordances[].action_families`  
* `SLT.exit_options[].action_family`  
* `has_affordance` / `affordance_available_to` predicates  
* CHC generation and grounding checks

Replace `exit_options.intent` with:

exit_options:

 - action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide

   surface_hint: string*

   likely_effects: [<short label>]

Base taxonomy:

| Value | Meaning |
| ----- | ----- |
| `move` | Change position or location: approach, enter, leave, climb, cross, travel. |
| `evade` | Avoid contact/control: flee, hide, sneak, misdirect, withdraw. |
| `pursue` | Follow or close distance: chase, track, tail, hunt, shadow. |
| `perceive` | Attend to sensory information: look, listen, smell, feel, observe. |
| `investigate` | Seek hidden/uncertain information: search, question, test, research, compare. |
| `communicate` | Exchange information: ask, tell, confess, warn, explain, report. |
| `persuade` | Try to change another’s belief/intention: argue, plead, threaten, flatter, appeal. |
| `negotiate` | Exchange terms or coordinate agreement: bargain, trade terms, ally, compromise. |
| `bond` | Alter relational closeness: comfort, trust, reconcile, touch, share, reassure. |
| `oppose` | Resist or confront without necessarily causing harm: refuse, accuse, block, defy. |
| `harm` | Damage, injure, expose, sabotage, poison, kill, destroy. |
| `protect` | Defend, rescue, shield, shelter, warn, preserve. |
| `control` | Command, restrain, capture, release, direct, contain. |
| `transfer` | Move possession/access: take, give, steal, buy, sell, lend, pay. |
| `use` | Operate or apply an object/system: activate, consume, read, unlock, wear. |
| `make_change` | Craft, repair, alter, dismantle, build, transform. |
| `ritual_protocol` | Perform rule-bound procedure: pray, swear, judge, sentence, initiate, file, certify. |
| `recover` | Rest, heal, regroup, tend, repair self/group capacity. |
| `wait` | Delay intentionally: wait, watch, stall, hold position. |
| `decide` | Choose, commit, abandon, prioritize, accept, reject. |

The key is that this is a top-level operational taxonomy, not an exhaustive verb dictionary. The prose-facing `surface_hint` carries local specificity. That gives the engine enough structure for eligibility and grounding without pretending to close the full space of human action.

### **11. Define `SREL.axis`**

The predicate DSL references `relationship_axis(SREL-NNNN, axis, comparator, value)`, but `axis` is currently undefined. Add this controlled-open base taxonomy:

axis: affinity | trust | respect | fear | attraction | obligation | loyalty | resentment | suspicion | authority | dependency | familiarity

Definitions:

| Axis | Meaning |
| ----- | ----- |
| `affinity` | Warmth, liking, fondness, emotional positivity. |
| `trust` | Expectation of reliability, honesty, discretion, or safety. |
| `respect` | Regard for competence, status, courage, wisdom, office, or skill. |
| `fear` | Expectation that the other can/will cause harm, punishment, exposure, loss, or domination. |
| `attraction` | Romantic, erotic, aesthetic, or fascination pull. |
| `obligation` | Felt duty, debt, oath, promise, responsibility, or binding expectation. |
| `loyalty` | Commitment to person, side, family, faction, institution, cause, or role. |
| `resentment` | Grievance, bitterness, humiliation, envy, or desire for redress. |
| `suspicion` | Belief that the other conceals threat, guilt, deception, or divided loyalty. |
| `authority` | Recognized right to command, judge, permit, forbid, or sanction. |
| `dependency` | Practical/material reliance: protection, money, medicine, access, knowledge, shelter. |
| `familiarity` | Shared history, intimacy of knowledge, routine contact, or recognizability. |

This draws directly from social-simulation practice: CiF separates relationships, temporary statuses, and numeric social-network values such as romance/friendship/respect, while Ensemble uses social state and volition rules to decide what characters want and can do.

### **12. Amend the predicate DSL**

Keep the DSL closed, but make it expressive enough for the record inventory. Current predicates cover facts, beliefs, entity status, relationship axes, obligations, consequences, threads, location, affordances, and boolean composition. Add these:

| Predicate | Shape | Consumed by |
| ----- | ----- | ----- |
| `record_active(<record_id>)` | Record must be active in the current page snapshot. Accepts `STENT | STINT |
| `intention_active(STINT-NNNN)` | Intention must be active and held by its owning entity. | turn-cycle eligibility, agency validation |
| `object_accessible(STENT-NNNN, STOBJ-NNNN)` | Object must be available to the entity through location, possession, permission, or reach. | plan grounding |
| `artifact_accessible(STENT-NNNN, DA-NNNN)` | Diegetic artifact must be available to the entity through possession, location, record access, memory, or testimony. | plan grounding, canon-claim firewall |
| `affordance_available_to(STENT-NNNN, <action_family>)` | Current page must expose an affordance of that family available to that entity. | turn-cycle eligibility, plan grounding |
| `belief(holder, claim, mode?, confidence_floor?)` | Belief must exist for holder with optional `belief_mode` and minimum confidence. | turn-cycle eligibility, social-state firewall |

Deprecate or narrow:

`has_affordance(<action_family>)` is deprecated for branch execution because it does not specify who can use the affordance. Use `affordance_available_to(...)`. `has_affordance(...)` may remain only as an author-pool prefilter.

This is a high-value change. Without actor-specific affordances, the engine can wrongly select a block because *someone* can flee, hide, speak, unlock, or attack, even when the acting entity cannot.

### **13. Minor provenance amendment**

Current:

provenance:

 origin: bootstrap_seed | author_batch | audit_repair | runtime_jit

Proposed:

provenance:

 origin: bootstrap_seed | manual_authoring | author_batch | audit_repair | runtime_jit | promotion_closeout

Definitions:

| Value | Meaning |
| ----- | ----- |
| `bootstrap_seed` | Created during initial story-bundle bootstrap. |
| `manual_authoring` | Created directly by an authoring instruction outside a generated batch. |
| `author_batch` | Created as part of a batch of reusable blocks. |
| `audit_repair` | Created to fix a health/audit finding. |
| `runtime_jit` | Created just-in-time during turn-cycle because no eligible block existed. |
| `promotion_closeout` | Created after canon-promotion adjudication to integrate the story-local result. |

## **Things I would deliberately keep unchanged**

Keep `authority` exactly as:

apparent | branch_local_counterfactual | canon_candidate

That enum is clean, distinct, and aligned with FOUNDATIONS’ mystery/canon authority discipline.

Keep `outcome_route` exactly as:

accept | accommodate | attempt | world_block | promotion_hold | terminal

It is one of the best-designed enums in the file.

Keep receipt checks and verdicts hard-closed:

PASS | WARN | FAIL | NOT_RUN

Those are validator states, not creative taxonomies.

Keep `SLT.scope.visibility`:

author_pool | branch_scoped

It directly enforces branch isolation, which FOUNDATIONS treats as story-scope Rule 4.

Keep `saliency.urgency`:

low | medium | high

A larger urgency taxonomy would not improve engine behavior unless you add a scheduler that consumes it.

## **One proposed replacement schema excerpt**

This is the consolidated shape I’d aim for in §4.1–§4.4:

# BEL epistemic block

truth_relation: true | false | partly_true | unknown | contested | future_contingent | branch_counterfactual

belief_mode: knows | believes | suspects | doubts | denies | reports | claims | deceives | misremembers | interprets

confidence: certain | high | medium | low | uncommitted

visibility: private | shared | factional | public | rumored | concealed | suppressed

# PG entity status

entity_status:

 STENT-NNNN:

   life: alive | dead | unknown

   agency: free | constrained | coerced | captive | incapacitated | unconscious | dead | unknown

   location: STLOC-NNNN | unknown | concealed | offstage

# PG visible affordance

visible_affordances:

 - ordinal: 0

   label: "door to the alley"

   grounded_in: [STLOC-NNNN, STOBJ-NNNN]

   available_to: [STENT-NNNN]

   action_families: [move, evade]

# mystery claim

unresolved_mystery_claims:

 - mystery_id: M-NNNN

   authority: apparent | branch_local_counterfactual | canon_candidate

   status: preserved | clue_added | narrowed | apparent_resolution | held_for_promotion

# SE

event_origin: story_start | selected_choice | write_in_attempt | system_repair | audit_repair | promotion_closeout

outcome_route: accept | accommodate | attempt | world_block | promotion_hold | terminal

# SLT

move_family: orient | world_pressure | aftermath | pursuit | investigation | disclosure | negotiation | bond_shift | status_shift | conflict | evasion | protection | resource_exchange | transformation | ritual_protocol | decision | consequence_payoff | recovery | transition | closure

beats:

 - beat_id: B1

   function: setup | action | pressure | turn | consequence | exit

   instruction: >

exit_options:

 - action_family: move | evade | pursue | perceive | investigate | communicate | persuade | negotiate | bond | oppose | harm | protect | control | transfer | use | make_change | ritual_protocol | recover | wait | decide

   surface_hint: string

   likely_effects: [<short label>]

provenance:

 origin: bootstrap_seed | manual_authoring | author_batch | audit_repair | runtime_jit | promotion_closeout

## **Priority order**

I’d implement in this order:

1. Add vocabulary policy: hard-closed vs controlled-open.  
2. Fix `BEL` by splitting `belief_mode` from `confidence`.  
3. Replace `SLT.purpose` with `move_family`.  
4. Create shared `action_family` and make `exit_options` use it.  
5. Normalize `entity_status`.  
6. Define `SREL.axis`.  
7. Amend predicate DSL with actor-specific affordances and object/artifact access.  
8. Correct record-class inventory and centralize `STENT.role_in_story`.

The main principle: **close the engine states; govern but do not over-close the creative semantics.** That keeps the contract comprehensive without turning it back into the bloated architecture you just escaped.

