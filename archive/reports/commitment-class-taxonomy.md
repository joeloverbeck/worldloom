## **Verdict**

A **truly comprehensive finite closed enum for all possible fictional commitments is not possible** without either becoming absurdly large or collapsing meaningful distinctions. Fictional action space is too open-ended: VerbNet alone is a broad-coverage hierarchical verb lexicon rather than a small action enum, and it groups verbs through syntactic and semantic behavior rather than narrative commitment.

But a **practical, finite routing taxonomy is possible** if Worldloom stops treating `commitment_class` as the only semantic layer. My strong recommendation is:

commitment_family: <closed routing family enum>

base_commitment_class: <closed practical enum, ~80 values>

commitment_class: <story-specific label, defaulting to base_commitment_class>

So the engine keeps deterministic joins and coverage reporting, while stories can still say something precise like:

commitment_family: secrecy_deception

base_commitment_class: perform_false_identity

commitment_class: impersonate_the_archbishop_to_enter_the_court

That is much better than either a fully open `commitment_class` or a giant flat closed enum.

Your uploaded brief defines `commitment_class` as the protagonist’s user-side scene-strategy commitment, not surface action, tone, microbeat, dramatic structure, or outcome; it is also operationally load-bearing as a routing key for CHC classification, write-ins, storylet selection, coverage, and monoculture detection. The current 20-value enum is coherent, but the brief’s own missing-area list—investigation, bargaining, command, deception, violence, ritual, resource sacrifice, teaching, travel, survival, and so on—is real and large enough that the existing set will misclassify broad fiction if left flat and closed.

## **What the research implies**

Speech-act theory gives one useful foundation: Searle’s five high-level illocutionary classes—assertives, directives, commissives, expressives, and declarations—show that communicative commitments can be taxonomized, but not at the granularity Worldloom needs for scene routing. Dialogue-act taxonomies are more directly relevant: DIT++ explicitly uses a **multidimensional hierarchy**, where a dialogue segment may carry multiple communicative functions, and more specific functions inherit preconditions from broader ones. That supports a layered approach rather than one flat enum.

Narratology also argues against a single universal flat list. Propp’s 31 folktale functions are useful as a stress test—trickery, pursuit, rescue, punishment, wedding/reward, spatial movement, struggle—but they are genre-bound and plot-function-oriented, not player-commitment-oriented. Greimas’s actantial model is more abstract: action decomposes into subject/object, helper/opponent, sender/receiver, which supports families such as help, oppose, seek, receive, command, and transmit—but again, it is a perspective model, not an enum.

Interactive narrative research points in the same direction. Riedl and Young’s narrative-planning work treats believable narrative action as intentional action: characters must be perceived as intentional agents, and IPOCL reasons about possible character goals that explain actions. Choice Poetics also distinguishes options, outcomes, and player goals, which reinforces that `commitment_class` should classify the **chosen strategy**, not the whole choice experience. Game-design theory likewise treats mechanics as methods by which agents interact with the game world; that is useful for “verbs,” but too low-level for narrative commitments unless lifted into strategic classes.

The best nearby engineering analogy is Comme il Faut / Prom Week: instead of hand-authoring every social possibility, it uses reusable representations of social norms and interactions to reduce authoring burden. Worldloom should do the same: reusable routing families, reusable base commitments, and story-local semantic precision.

## **Recommended representation**

Use three layers:

type CommitmentFamily =

 | "presence_attention"

 | "inquiry_discovery"

 | "disclosure_expression"

 | "secrecy_deception"

 | "care_help_protection"

 | "acceptance_alignment"

 | "boundary_delay_withdrawal"

 | "negotiation_exchange"

 | "pressure_coercion"

 | "conflict_force_evasion"

 | "movement_exploration"

 | "coordination_authority"

 | "creation_study_worldwork"

 | "moral_accounting"

 | "intimacy_performance_ritual"

 | "risk_survival_sacrifice";

type BaseCommitmentClass = /* the 80 values below */;

interface CommitmentRoute {

 commitment_family: CommitmentFamily;

 base_commitment_class: BaseCommitmentClass;

 commitment_class?: string; // open, story-specific, defaults to base_commitment_class

}

`commitment_family` is the safest deterministic storylet-pool join key.  
 `base_commitment_class` is the useful diversity and continuation-capacity key.  
 `commitment_class` is where genre-local precision belongs.

## **Proposed base enum: 16 families, 80 values**

### **1. `presence_attention`**

For commitments whose primary move is to stay, notice, receive, acknowledge, or hold space.

presence_attention:

 - stay_available_without_pressure

 - bear_witness

 - mirror_acknowledgment

 - listen_patiently

 - observe_without_intervening

### **2. `inquiry_discovery`**

For commitments to reduce uncertainty, gather facts, test assumptions, or investigate.

inquiry_discovery:

 - ask_one_bounded_question

 - ask_open_probe

 - search_for_evidence

 - verify_claim

 - test_or_experiment

### **3. `disclosure_expression`**

For commitments to reveal, state, warn, declare, or make an internal position legible.

disclosure_expression:

 - confess_one_thing

 - share_private_feeling

 - reveal_secret

 - warn_or_alert

 - make_public_commitment

### **4. `secrecy_deception`**

For commitments to hide, distort, misdirect, impersonate, or privately violate trust.

secrecy_deception:

 - conceal_under_pressure

 - lie_or_fabricate

 - misdirect_attention

 - perform_false_identity

 - private_betrayal

### **5. `care_help_protection`**

For commitments to aid, comfort, protect, rescue, teach, or tend.

care_help_protection:

 - offer_practical_help

 - provide_comfort

 - protect_from_harm

 - rescue_or_extract

 - teach_or_mentor

### **6. `acceptance_alignment`**

For commitments to accept, join, trust, submit, or bind oneself to another’s side or offer.

acceptance_alignment:

 - accept_offered_help

 - accept_obligation

 - join_or_ally

 - trust_another

 - submit_or_yield

### **7. `boundary_delay_withdrawal`**

For commitments to decline, step back, delay, set limits, or end contact.

boundary_delay_withdrawal:

 - refuse_with_grace

 - set_boundary

 - withdraw_without_abandoning

 - defer_decision

 - break_contact

### **8. `negotiation_exchange`**

For commitments to request, bargain, trade, compromise, ask consent, or spend.

negotiation_exchange:

 - request_favor

 - bargain_or_trade

 - offer_compromise

 - ask_for_consent

 - spend_resource

### **9. `pressure_coercion`**

For commitments to raise or lower pressure, demand, corner, or compel revelation/action.

pressure_coercion:

 - release_pressure

 - tighten_pressure

 - make_demand

 - issue_ultimatum

 - force_disclosure

### **10. `conflict_force_evasion`**

For direct conflict, violence, defense, pursuit, flight, and physical contest.

conflict_force_evasion:

 - escalate_to_confrontation

 - attack_directly

 - defend_against_attack

 - pursue_or_chase

 - flee_or_evade

### **11. `movement_exploration`**

For commitments to change position, enter, retreat, travel, explore, or infiltrate.

movement_exploration:

 - change_venue

 - travel_toward_goal

 - explore_environment

 - infiltrate_location

 - retreat_to_safety

### **12. `coordination_authority`**

For commitments involving third parties, leadership, delegation, rules, institutions, or authority.

coordination_authority:

 - seek_third_party

 - delegate_task

 - lead_group_action

 - enforce_rule

 - defy_rule_or_order

### **13. `creation_study_worldwork`**

For commitments to make, repair, prepare, train, study, or transform the environment.

creation_study_worldwork:

 - craft_or_build

 - repair_or_restore

 - alter_environment

 - prepare_tool_or_plan

 - study_or_train

### **14. `moral_accounting`**

For commitments to apologize, forgive, punish, atone, expose wrongdoing, or repair moral order.

moral_accounting:

 - apologize_or_admit_fault

 - forgive_or_grant_mercy

 - punish_or_retribute

 - make_restitution

 - expose_wrongdoing

### **15. `intimacy_performance_ritual`**

For commitments to move relationally, erotically, socially, ceremonially, playfully, or performatively.

intimacy_performance_ritual:

 - intimacy_advance

 - flirt_or_seduce

 - perform_social_role

 - conduct_ritual

 - celebrate_or_play

### **16. `risk_survival_sacrifice`**

For commitments to endure, risk, sacrifice, preserve oneself, or improvise under survival pressure.

risk_survival_sacrifice:

 - accept_risk

 - sacrifice_resource_or_self_interest

 - endure_hardship

 - survive_by_improvising

 - prioritize_self_preservation

## **Why this taxonomy is the right granularity**

This gives you **80 base classes**. That is high enough to cover broad fiction without forcing absurd mappings like “sneak into the palace” → `change_venue` or “trade the last vial of antidote” → `offer_practical_help`. It is low enough that storylet pools can still be audited and populated.

The taxonomy is also not merely a verb list. A surface verb like “go” could be `change_venue`, `retreat_to_safety`, `travel_toward_goal`, `infiltrate_location`, or `flee_or_evade`, depending on the protagonist’s scene strategy. That is exactly the distinction `commitment_class` needs.

## **Mapping from current 20 values**

All 20 current values should remain as canonical base classes. They are good classes; they are just not enough.

| Current value | New family | New base class |
| ----- | ----- | ----- |
| `stay_available_without_pressure` | `presence_attention` | unchanged |
| `offer_practical_help` | `care_help_protection` | unchanged |
| `ask_one_bounded_question` | `inquiry_discovery` | unchanged |
| `withdraw_without_abandoning` | `boundary_delay_withdrawal` | unchanged |
| `confess_one_thing` | `disclosure_expression` | unchanged |
| `accept_offered_help` | `acceptance_alignment` | unchanged |
| `refuse_with_grace` | `boundary_delay_withdrawal` | unchanged |
| `escalate_to_confrontation` | `conflict_force_evasion` | unchanged |
| `conceal_under_pressure` | `secrecy_deception` | unchanged |
| `seek_third_party` | `coordination_authority` | unchanged |
| `change_venue` | `movement_exploration` | unchanged |
| `make_public_commitment` | `disclosure_expression` | unchanged |
| `private_betrayal` | `secrecy_deception` | unchanged |
| `bear_witness` | `presence_attention` | unchanged |
| `release_pressure` | `pressure_coercion` | unchanged |
| `tighten_pressure` | `pressure_coercion` | unchanged |
| `defer_decision` | `boundary_delay_withdrawal` | unchanged |
| `force_disclosure` | `pressure_coercion` | unchanged |
| `mirror_acknowledgment` | `presence_attention` | unchanged |
| `intimacy_advance` | `intimacy_performance_ritual` | unchanged |

## **Examples across genres**

In a **mystery**, “dust the window latch for prints” should be `test_or_experiment`, not `ask_one_bounded_question`; “follow the suspect through the market” should be `pursue_or_chase`; “plant a false rumor” should be `misdirect_attention`.

In a **romance**, “tell him why the letter hurt” is `share_private_feeling`; “kiss her before she leaves” is `intimacy_advance`; “give her space but stay nearby” remains `withdraw_without_abandoning`.

In a **heist**, “pose as the Duke’s courier” is `perform_false_identity`; “split the crew between exits” is `delegate_task`; “burn the ledger before the guard sees it” is probably `alter_environment` or `conceal_under_pressure`, depending on whether the scene strategy is transformation or secrecy.

In **epic fantasy**, “swear fealty before the court” is `make_public_commitment`; “bind the demon with the old rite” is `conduct_ritual`; “spend the last phoenix feather to heal the enemy prince” is `sacrifice_resource_or_self_interest`.

In **survival fiction**, “ration the water” is `prioritize_self_preservation` or `spend_resource`, depending on whether the commitment is survival discipline or resource expenditure; “cross the ice before dawn” is `accept_risk`; “splint the stranger’s leg” is `offer_practical_help` or `heal_or_tend` if you later add `heal_or_tend` as a story-local subclass under `care_help_protection`.

## **Important implementation rule**

Do **not** use `base_commitment_class` as a pure synonym for the literal action. Use it as the **dominant scene-strategy commitment**.

For example:

choice: "Smile and ask where she found the knife."

commitment_family: inquiry_discovery

base_commitment_class: ask_one_bounded_question

commitment_class: ask_where_the_knife_came_from

Not:

base_commitment_class: perform_social_role

The smile is surface behavior. The commitment is inquiry.

Another example:

choice: "Kiss him so he stops asking about the ledger."

commitment_family: secrecy_deception

base_commitment_class: misdirect_attention

commitment_class: use_intimacy_to_divert_attention_from_the_ledger

Not:

base_commitment_class: intimacy_advance

The kiss is the means. The commitment is concealment through misdirection.

## **Closed vs open vs hybrid**

Option A, a closed expanded enum, is tempting but wrong as the whole solution. An 80-value list will be far better than the current 20, but it will still fail in genres with specialized social worlds: courtly ritual, legal drama, military command, espionage, religious sacrifice, magical research, colony survival, and so on.

Option B, a fully open label, is also wrong for Worldloom because your brief says deterministic matching, write-in classification, storylet eligibility, and coverage reporting depend on stable canonical values.

Option C is the correct design:

commitment_family: secrecy_deception

base_commitment_class: perform_false_identity

commitment_class: impersonate_the_archbishop_to_enter_the_court

This preserves deterministic routing while letting the authored story be precise. That is the only design that scales without flattening fiction.

