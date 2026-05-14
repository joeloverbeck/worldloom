Yes. You should change the standard. The current choice layer is not “too branching”; it is **too beat-level**. It is giving the player control over stage direction: sit, wait, half-step back, say one syllable, hold silence. That creates exquisite moral precision, but it murders pacing because every social micro-beat becomes a round trip.

Based on the uploaded YAML, I’d move to a **scene-beat / significant-situation-change standard**:

Break the narrative for a user choice only when the user is choosing a goal, value, tactic, commitment, reveal, refusal, exit, or risk whose consequences can carry beyond the next line of dialogue.

Micro-gestures should usually be handled by the narrative engine under the already-chosen intent.

## **What your current choice files show**

You uploaded **20 choice records**, but they are really **four choice menus of five options each**:

| Page | Options | What the menu is doing |
| ----- | ----- | ----- |
| PG-0001 | 5 | Initial encounter strategy: leave, approach, observe, indirect aid, speak |
| PG-0002 | 5 | Immediate response management: sit, offer, withdraw, wait, ask bruise question |
| PG-0003 | 5 | Reaction to her boundary / rehearsed phrase: leave, hold, name rehearsal, step back, ask name |
| PG-0004 | 5 | One fragile conversational turn: give name, ask morning, hold silence, call someone, half-step back |

The first menu is mostly the right scale. “Walk on,” “approach with practical aid,” “sit nearby and observe,” “leave indirect help,” and “open contact” are genuinely different encounter strategies.

The later menus shrink. By PG-0004, the choice is no longer “what kind of scene are we playing?” but “what is Jon’s next tiny move?” That is why the scene feels like it is barely moving.

A few hard numbers from the files:

| Metric | Result | Why it matters |
| ----- | ----- | ----- |
| Choice prompts | 4 |  |
| Options per prompt | exactly 5 every time |  |
| `likely_effects` populated | 0 / 20 |  |
| `success_policy: guaranteed` | 10 / 20 |  |
| `minimum_state_change` includes `intention` | 19 / 20 |  |
| `minimum_state_change` includes `fact` | 18 / 20 |  |
| `minimum_state_change` includes `relationship` | 8 / 20 |  |
| `minimum_state_change` includes `obligation` | 6 / 20 |  |
| Hold / silence / waiting options | 4+ |  |
| Physical-positioning options | many: sit, step back, five paces, half-step, stay still |  |

The big red flag is **0 / 20 `likely_effects`**. The files are extremely precise about what Jon may or may not do, but they do not specify what the choice is likely to *change*. That makes the choices feel morally textured but mechanically underpowered.

The second red flag is that `intention` and `fact` appear so often that they are no longer filtering for significance. “Jon chose to hold silence” is technically a fact and an intention, but it is not necessarily a new narrative situation.

## **What the research and implementations suggest**

The research does **not** point to a universal “choice every N words” rule. It points to **meaningful divergence**, **player foresight**, and **key decision points**.

Mawhorter et al.’s “choice poetics” framework analyzes choices by looking at player goals, offered options, suggested outcomes, actual outcomes, and the difference between prospective and retrospective impressions. That maps very directly onto your data: your current choices are rich in intent, but weak in explicit prospective/retrospective outcome modeling because `likely_effects` is empty.

Cardona-Rivera et al.’s “Foreseeing Meaningful Choices” is even more directly relevant: they found higher perceived agency when choices led to **meaningfully different situational content**, not merely different non-situational details. Your later choices often differ by posture, silence, or wording; those can matter poetically, but they do not always produce meaningfully different situations.

Iten, Steinemann, and Opwis’ CHI work on meaningful choices found that players associate meaningful choices with **moral, social, and consequential** characteristics, and that those characteristics positively affected appreciation. Your scene has moral and social stakes, but many emitted options are implementation details of the same social stance rather than distinct social/moral consequences.

Yin and Xiao’s 2022 work frames choices in narrative-rich games as moments that affect the game, the player-game relationship, and even the player outside the game. That again argues for choice points that change the player’s relationship to the unfolding story, not necessarily every possible line delivery.

Narrative transportation research also supports your intuition. Green and Appel describe interactive narratives as giving audiences agency at **key points** in the narrative, but they also note the tension: choices can interrupt the action and disrupt mental simulation, while control can also increase immersion. Your current system is landing on the dangerous side of that tradeoff: too many interruptions for too little forward movement.

Existing implementations point the same way. Choice of Games explicitly recommends **delayed branching** and aggressive merging: early choices can affect later outcomes without forcing the story to branch immediately at every moment. Sam Kabo Ashwell’s taxonomy describes branch-and-bottleneck structures as relying on state tracking so branches can rejoin without erasing previous choices. Ink’s official docs likewise show branching and rejoining as a normal pattern, with “gathers” bringing options back together.

There is also an important implementation distinction: **a break is not always a choice**. ChoiceScript has `*page_break` specifically to break up long narrative passages or heighten suspense without asking the player to decide anything. That is a useful model for your app: sometimes the right control is “Continue,” not five new choices.

## **The core diagnosis**

Your system is currently optimizing for:

“Never let the model make a morally risky micro-action without user approval.”

That is understandable in this scene. The contracts are trying hard to prevent creepiness, sexualization, unwanted proximity, false inference, and over-helping. Good instinct.

But the mechanism is wrong. You are using **choice frequency** to enforce ethical precision. You should use **scene policy and action constraints** for that, then let the model play out several beats inside those constraints.

Right now, the player is being asked to choose between things like:

* “stay still”  
* “step five paces back”  
* “take a half-step back”  
* “hold silence”  
* “give his own name back”  
* “ask two words”

Those are not bad beats. Some are beautiful. But they should usually be **execution** of a broader selected strategy, not separate menus.

## **The standard I’d adopt**

Use this as the rule:

A choice is warranted only when at least two options lead to different persistent situations that the player can reasonably foresee.

I’d make the generator classify every possible interruption into one of four tiers:

| Tier | Unit | Example | Should interrupt? |
| ----- | ----- | ----- | ----- |
| 0. Page break | prose pacing only | “Continue,” “Later,” “The silence lengthens” | No real choice |
| 1. Micro-beat | one gesture, line, silence, posture | “Half-step back,” “Say only ‘Jon’” | Usually no |
| 2. Tactical beat | next exchange or immediate approach | “Make the offer concrete,” “Ask about the bruise” | Sometimes |
| 3. Scene strategy | goal / stance / commitment | “Leave,” “Help practically,” “Stay available,” “Risk the truth” | Yes |
| 4. Route / chapter hinge | major branch or irreversible commitment | “Take her home,” “Call police,” “Walk away forever” | Yes |

Your current later files are mostly Tier 1 and Tier 2. The app should default to Tier 3, with Tier 2 only when the moment is genuinely tense and the next move is a hinge.

## **Concrete generator changes**

I would change the choice-emission policy to something like this:

choice_emission_policy:

 default_granularity: scene_beat

 emit_choice_only_when:

   - the player is choosing a goal, tactic, value, reveal, refusal, promise, exit, or risk

   - at least two options create meaningfully different situational content

   - at least one persistent state dimension changes beyond fact/intention

   - the player can reasonably infer the likely risks or consequences

   - the prior chosen intent has been satisfied, blocked, overturned, or made newly dangerous

 do_not_emit_choice_when:

   - options differ only by wording, gaze, silence, tiny movement, or politeness level

   - the next decision would only choose the protagonist's next sentence

   - the choice can be executed as part of a broader selected strategy

   - likely_effects would be empty

   - minimum_state_change only contains fact/intention/location without new affordances

 use_continue_instead_when:

   - the story needs pacing, suspense, or a paragraph break

   - the user has no meaningful new decision

   - the current selected intent can still play forward safely

 target_options_per_choice:

   default: 3

   maximum: 4

   allow_5_only_if: every option has a distinct strategy_cluster

 after_user_choice:

   autoplay_until:

     - new information changes the situation

     - an NPC makes a demand, refusal, offer, or disclosure

     - the protagonist would cross a user-relevant boundary

     - an irreversible cost or commitment is imminent

     - the scene goal resolves or changes

   target_span:

     dialogue_exchanges: 2-5

     prose_words: 500-1200

The most important line is this one:

do_not_emit_choice_when:

 - likely_effects would be empty

That single rule would kill a lot of the false granularity.

## **Change `minimum_state_change`**

Right now, `fact` and `intention` are too weak. They let almost anything qualify.

I would stop counting these as sufficient by themselves:

weak_state_changes:

 - fact

 - intention

 - location

`location` should count only when it creates new affordances: entering the bar, leaving the scene, crossing the street, reaching the phone, becoming visible to another character. “Half-step back” should not qualify.

A choice should usually require at least one of these:

strong_state_changes:

 - relationship_delta

 - obligation_created_or_removed

 - resource_committed

 - risk_level_changed

 - information_revealed_or_concealed

 - thread_opened_or_closed

 - scene_route_changed

 - NPC_plan_changed

 - future_option_enabled_or_disabled

 - irreversible_exit_or_entry

## **Keep the guardrails, but move them out of the choice**

The current contracts are useful. They protect the scene from LLM drift. But they should not force a new choice every time Jon might move his foot.

For example, instead of making these separate options:

* sit at the far end  
* step back  
* hold silence  
* half-step back

create a broader option:

label: Stay available without increasing pressure.

user_intent: Keep the offer alive while reducing the pressure of his presence.

execution_constraints:

 must:

   - maintain physical distance

   - let Ane control whether the exchange continues

 may:

   - step back

   - look away

   - allow silence

   - answer simple reciprocal questions briefly

 must_not:

   - touch her

   - crowd her

   - offer private space

   - multiply offers

   - ask about the bruise unless a new hinge occurs

stop_before:

 - asking about the source of injury

 - offering transport controlled by Jon

 - leaving the scene entirely

likely_effects:

 - lowers immediate pressure

 - preserves possibility of later trust

 - may be read as hovering if prolonged

That gives the model enough autonomy to write the scene, while still respecting the moral boundary.

## **How I would collapse PG-0004**

Current PG-0004 has five options:

1. Give his own name back.  
2. Ask about this morning.  
3. Hold the silence.  
4. Offer to call someone.  
5. Take a half-step back.

I would collapse that to three or four choices:

choice_prompt: Ane has given him a name. What does Jon do with that fragile trust?

options:

 - label: Equalize the exchange. Give his name, keep distance, and let the silence breathe.

   strategy_cluster: reciprocate_trust_without_pressure

   likely_effects:

     - reduces asymmetry

     - gives Ane room to continue or stop

     - preserves trust without converting it into interrogation

 - label: Turn the trust toward practical help. Offer one external call, nothing private.

   strategy_cluster: practical_external_help

   likely_effects:

     - creates a concrete path out

     - risks making the moment transactional

     - may reveal whether there is someone safe to call

 - label: Risk the question about this morning.

   strategy_cluster: gentle_investigation

   likely_effects:

     - may surface the source of the injury

     - risks making Jon feel investigative rather than safe

     - raises pressure sharply

 - label: End the pressure. Step back and let the encounter loosen.

   strategy_cluster: release_pressure

   likely_effects:

     - lowers threat

     - may close the window of contact

     - keeps Jon from becoming the center of the scene

Notice that “give his name,” “hold silence,” and “half-step back” are not gone. They are folded into a larger tactic.

## **What this means for your scene pacing**

For this kind of intimate, morally delicate two-person scene, I’d aim for roughly:

* **2–4 real choices for an ordinary scene**  
* **3–5 real choices for a major emotional negotiation**  
* **1 choice every 2–5 dialogue exchanges**, not every single exchange  
* **0-choice continuations** whenever the current intent is still playing out

In your current setup, eight user selections before the scene midpoint is a sign the system is over-pausing. For this scene, I would expect something like:

1. **Initial encounter strategy**: leave, observe, offer help, indirect aid, speak.  
2. **After her first response**: withdraw, make concrete aid offer, stay available, ask the dangerous question.  
3. **After a real disclosure or refusal**: deepen, help externally, respect exit, challenge a contradiction.  
4. **End-state choice**: leave, wait, call someone, accompany only if she asks, etc.

That is probably enough.

## **The blunt version**

Your current system is producing **beautifully written acting choices**. It is not yet producing well-paced **interactive narrative choices**.

The fix is not to make the choices less nuanced. The fix is to move the nuance into execution and reserve explicit user control for moments where the situation can actually turn.

Adopt this rule as the new standard:

Do not break the narrative for the next action. Break it for the next commitment.

