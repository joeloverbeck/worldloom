# Causal Story Engine - Guidelines

Our intention was to be able to generate branching stories that offer X choices coherent to the current story moment, but not straight-jacketing the story by forcing a story spine or act structure, which is solely suited to non-branching storytelling.

**Do not replace act structure with “promise tracking” alone. Replace act structure with a live coherence engine.**  
 Promises/payoffs are one important layer, but a robust branching-story system needs to track **causality, character intention, reader knowledge, world facts, unresolved narrative debt, consequence capacity, and available future continuations**.

The best architecture is a **hybrid of storylets + world simulation + narrative-obligation tracking + salience/drama management**. Acts can become optional authoring templates, not the thing that holds the story together.

## **The core principle**

A story feels coherent when the reader can answer:

**“Why did this happen, why did this person do this, why does this matter, and what is still unresolved?”**

That is not the same as “the story reached Act II turning point.” Research on narrative comprehension repeatedly points to **causal coherence** and **character goals** as central: readers build a “situation model” by linking events locally and globally; character goals are especially important cues for understanding why events matter. Story-grammar research likewise treats narratives as goal-centered episodes: initiating event, character goal, attempt, and outcome. Riedl and Young’s narrative-planning work makes a similar computational claim: good generated narratives need both **logical causal progression of plot** and **character believability/intentionality**.

So the system should not primarily ask:

“Where are we in the act structure?”

It should ask:

“Given what has happened, what facts are now true, what consequences are pending, what promises are open, what characters want, what the reader knows, and what available scene can meaningfully continue or complicate this?”

That is the governing loop.

---

## **Why the old act-spine approach breaks**

Your example is exactly the failure mode: if the spine assumes Character X is alive in Act III, the system must quietly prevent earlier choices from killing X. That means the story is not truly branching; it is **branch-flavored railroaded continuity**.

The better answer is not “allow anything and hope the model remembers.” The better answer is:

**A choice is offerable only if the system has enough downstream consequence capacity to absorb it.**

So “kill X” is legal if the system can do at least one of these:

1. **Pay off X’s unresolved functions through death.**  
    Their secret is found in a journal; their murder radicalizes another character; their absence becomes the dramatic engine.  
2. **Transfer X’s narrative load.**  
    Another character inherits their clue, role, opposition, relationship tension, or unfinished goal.  
3. **Transform open promises.**  
    A romance becomes grief. A rivalry becomes guilt. A prophecy becomes impossible and therefore suspicious. A planned confrontation becomes an investigation.  
4. **Close promises with consequence.**  
    Some threads die with them, but the story acknowledges that loss rather than pretending the thread never existed.  
5. **Make the attempted action fail for diegetic reasons.**  
    Not “the system disallows it,” but “the gun misfires,” “the bodyguard intervenes,” “you hesitate,” “you wound them but do not kill them.” This should be used sparingly because overuse destroys agency.

That is the difference between a flexible story and a fake branch.

---

# **The preferred architecture**

I would build the system around seven ledgers/models.

## **1. Canonical world state**

This is the non-negotiable truth layer.

It tracks:

Entity {  
 id: string  
 type: "character" | "place" | "object" | "faction" | "secret" | "event"  
 status: Record<string, any> // alive, injured, location, owner, known_by, etc.  
 tags: string[]  
}

Fact {  
 id: string  
 subject: string  
 predicate: string  
 object?: string  
 value?: any  
 certainty: "true" | "false" | "rumored" | "unknown"  
 knownBy: string[] // reader, protagonist, NPCs, factions  
 introducedAt: EventId  
}

Separate **truth** from **knowledge**. A character may be dead, but the protagonist may not know. The villain may know the relic is fake; the reader may not. This distinction is vital for suspense, mystery, irony, and betrayal.

Barthes’ hermeneutic/enigma code is useful here: stories create forward motion by opening questions, delaying answers, giving partial answers, or revealing the truth. Your engine should track those open questions as formal objects, not merely as prose.

---

## **2. Causal event graph**

Every meaningful event should know what caused it and what it enables.

Event {  
 id: string  
 textSummary: string  
 causes: EventId[]  
 enabledByFacts: FactId[]  
 createsFacts: FactId[]  
 invalidatesFacts: FactId[]  
 affectedEntities: EntityId[]  
 visibleToReader: boolean  
 visibleToCharacters: EntityId[]  
}

This lets you answer:

* “Can this happen?”  
* “Why did this happen?”  
* “What did this make possible?”  
* “What did this make impossible?”  
* “What must be mentioned later for this to feel meaningful?”

This is more important than acts. Narrative coherence depends heavily on causal connectivity; writers also tend to continue stories by producing events causally connected to prior text.

---

## **3. Promise / obligation ledger**

This is the layer you are already imagining, but I would formalize it more broadly than “Chekhov guns.”

Chekhov’s gun is the familiar version: an introduced element becomes a promise to the audience, and the writer keeps the promise by using it meaningfully later. But interactive fiction needs a larger category: **narrative obligations**.

A promise may be:

* a physical object: “the black key”  
* a mystery: “who betrayed the queen?”  
* a threat: “the plague will reach the city in three days”  
* a relationship tension: “Mara knows you lied”  
* a moral debt: “you abandoned the child”  
* a motif: “mirrors keep appearing”  
* a prophecy: “the heir will die by fire”  
* a mechanical affordance: “the player learned lockpicking”  
* an emotional expectation: “the brother has not forgiven you”  
* a dramatic irony: “the reader knows the food is poisoned; the hero does not”

Suggested schema:

NarrativeObligation {  
 id: string  
 type:  
   | "mystery"  
   | "foreshadowed_object"  
   | "threat"  
   | "relationship_tension"  
   | "secret"  
   | "moral_debt"  
   | "quest"  
   | "motif"  
   | "prophecy"  
   | "character_goal"  
   | "reader_expectation"

 introducedAt: EventId  
 owner?: EntityId  
 subjects: EntityId[]  
 visibleToReader: boolean  
 knownBy: EntityId[]

 salience: number        // how noticeable/important it feels  
 urgency: number         // how soon it wants attention  
 emotionalWeight: number  
 decayRate: number       // some promises may fade  
 requiredClosure: boolean

 possiblePayoffModes:  
   | "fulfill"  
   | "subvert"  
   | "complicate"  
   | "transfer"  
   | "echo"  
   | "explain_away"  
   | "abandon_with_acknowledgment"

 constraints: Predicate[]  
 dependentFacts: FactId[]  
 compatibleStorylets: StoryletId[]  
 status: "open" | "complicated" | "paid_off" | "abandoned" | "invalidated"  
}

The most important field is **possiblePayoffModes**. Not every promise needs a straightforward payoff. Some can be subverted, transformed, or explicitly abandoned. But the system should not silently forget high-salience obligations.

A red herring is not an unfulfilled promise. It is a promise that gets **reclassified** and paid off as misdirection.

---

## **4. Character intention model**

This is where many branching systems fail. They track facts but not why people act.

A coherent story needs characters whose actions are legible as intentional. That is central to Riedl and Young’s IPOCL model: generated stories should include character actions that can be explained by character goals, not merely by plot convenience.

Track:

CharacterState {  
 id: EntityId  
 traits: string[]  
 values: Record<string, number>  
 goals: Goal[]  
 fears: Goal[]  
 secrets: FactId[]  
 relationships: Record<EntityId, RelationshipState>  
 beliefs: FactId[]  
 emotionalState: Record<string, number>  
 currentPressure: number  
}

Then every major action should be checked:

ActionJustification {  
 actor: EntityId  
 action: string  
 servesGoal?: GoalId  
 violatesGoal?: GoalId  
 requiredPressure?: number  
 requiredBelief?: FactId  
 explanationForReader?: string  
}

A timid character can betray someone, but the system must supply pressure, fear, misinformation, coercion, or desperation. Without that, the branch may be factually consistent but dramatically incoherent.

Prom Week is a useful reference point here: it made social interaction playable by tracking character traits, relationships, histories, and thousands of social considerations that affected available actions and dialogue. Versu similarly modeled characters with traits, inclinations, memory of how the player treated them, and social reactions.

---

## **5. Storylets, not branches**

The most practical content unit is the **storylet**: a small piece of narrative content with prerequisites and world-state effects. Emily Short defines storylets as content with prerequisites determining when it can play and effects on world state afterward. Failbetter describes StoryNexus/Fallen London’s quality-based narrative as “little bundles” of interactive story whose appearance is controlled by mutable state.

A storylet should not merely be a passage of text. It should be a transaction against the narrative state.

Storylet {  
 id: string  
 title: string

 hardPreconditions: Predicate[]       // must be true  
 softPreconditions: WeightedPredicate[]

 castRequirements: RoleRequirement[]  // "betrayer", "victim", "witness"  
 locationRequirements: Predicate[]

 opensObligations: ObligationTemplate[]  
 paysOffObligations: ObligationMatcher[]  
 complicatesObligations: ObligationMatcher[]

 consumesConsequences: ConsequenceMatcher[]  
 producesConsequences: ConsequenceTemplate[]

 advancesGoals: GoalEffect[]  
 changesFacts: FactEffect[]  
 relationshipEffects: RelationshipEffect[]

 toneTags: string[]  
 themeTags: string[]  
 tensionDelta: number  
 aftermathWeight: number

 choices: ChoiceTemplate[]  
}

This is the backbone I’d use.

Not: “Page 37 goes to page 38 or 44.”

But: “This scene is eligible when Mara is alive, distrust is high, the reader knows about the forged letter, and there is an open betrayal obligation. It can pay off betrayal by confrontation, or complicate it by blackmail.”

---

## **6. Salience-based scene selection**

Once branches are no longer fixed, you need a selector. Yarn Spinner’s current docs describe storylets as breaking rigid links between narrative elements; saliency is what decides which disconnected piece is most relevant at a given moment. Emily Short’s salience-based model similarly chooses the most applicable content from a large pool based on testable world state.

A rough scoring function:

score(storylet) =  
 + 4.0 * obligationRelevance(storylet, openObligations)  
 + 3.0 * causalRelevance(storylet, pendingConsequences)  
 + 2.5 * characterGoalRelevance(storylet, activeGoals)  
 + 2.0 * readerKnowledgeRelevance(storylet, knownFacts)  
 + 1.5 * thematicContinuity(storylet, activeThemes)  
 + 1.5 * tensionFit(storylet, currentTensionTarget)  
 + 1.0 * novelty(storylet)  
 - 3.0 * contradictionRisk(storylet)  
 - 2.0 * unresolvedDebtIncrease(storylet)  
 - 1.0 * repetitionPenalty(storylet)

Hard filters first. Scoring second.

A scene is **legal** if it does not contradict the canonical state.  
 A scene is **good** if it pays off, complicates, or meaningfully extends what the player already caused.

This lets the system prefer consequence-rich continuation without needing a fixed spine.

---

## **7. Narrative governor, not act structure**

You still need pacing. Throwing out acts does not mean throwing out shape.

But the shape should come from **health metrics**, not mandatory milestones.

Track:

NarrativeHealth {  
 openObligationCount: number  
 highSalienceUnpaidCount: number  
 averageObligationAge: number  
 contradictionRisk: number  
 causalConnectivity: number  
 characterMotivationCoverage: number  
 unresolvedThreatPressure: number  
 recentConsequenceDensity: number  
 recentReflectionDensity: number  
 novelty: number  
 tension: number  
 agencyScore: number  
}

The governor can nudge the story:

* Too many open promises? Offer payoff/closure scenes.  
* Too little consequence? Offer aftermath scenes.  
* Too much chaos? Offer reflection/consolidation.  
* Too much exposition? Offer action.  
* High threat but no movement? Escalate.  
* Character did something extreme? Offer justification or fallout.  
* Reader knows a secret too long? Either reveal it, exploit dramatic irony, or reframe it.

This is drama management, but not an act spine. Façade used story beats sequenced by a drama manager to maintain a coherent, high-agency interactive drama. More broadly, recent design discussion still treats drama/experience management as the layer that nudges player experience when uncontrolled player action would otherwise produce poor timing, confusion, or weak emotional impact.

The governor should not say:

“We need the Act II turning point.”

It should say:

“The story has three high-salience unresolved obligations, rising threat pressure, and no recent consequence scene. Select a storylet that pays off or escalates one of those obligations.”

That is a much better fit for branching fiction.

---

# **How to handle destructive choices**

A destructive choice should be evaluated as a **narrative transaction**.

Suppose the player manually says:

“I shoot the mentor.”

The system should parse this into proposed state changes:

ProposedEvent {  
 action: "shoot"  
 actor: "protagonist"  
 target: "mentor"  
 possibleOutcomes: ["miss", "wound", "kill"]  
}

Then run impact analysis:

ImpactAnalysis {  
 factsCreated: ["mentor_dead" | "mentor_wounded"]  
 factsInvalidated: ["mentor_available", "mentor_knows_secret_but_can_speak"]  
 obligationsAffected: [  
   "mentor_promised_to_reveal_secret",  
   "mentor_student_relationship",  
   "villain_wants_mentor_silenced"  
 ]  
 impossibleStorylets: [...]  
 newlyEligibleStorylets: [...]  
 transferableFunctions: [  
   { from: "mentor", to: "mentor_journal", function: "reveal_secret" },  
   { from: "mentor", to: "rival", function: "moral_judgment" }  
 ]  
 requiredAftermath: [  
   "body_discovered",  
   "protagonist_guilt_or_justification",  
   "faction_reaction"  
 ]  
}

Then decide:

### **Accept**

Use when the engine can absorb it.

The mentor dies. The secret is now inaccessible through conversation, but the system opens “Search the mentor’s study,” “Cover up the murder,” “Confess to Mara,” and “The rival notices blood on your sleeve.”

### **Accept but transform**

Use when the choice is viable but needs dramatic framing.

You fire, but the shot wounds him. He survives long enough to say one fragment of the secret, then collapses.

### **Treat as an attempt**

Use when instant success would be incoherent or too cheap.

You draw the pistol, but he sees the motion and knocks your arm aside. Now the relationship is permanently changed.

### **Refuse only through world logic**

Use when impossible, not inconvenient.

You cannot shoot him because you do not have the pistol, or because he is not present, or because you are bound.

The key rule: **the system should never block a destructive choice merely because it violates a preplanned future.** It should block only because the current state makes it impossible, or because the system cannot generate a coherent consequence path. Even then, “attempt with consequence” is usually better than “no.”

---

# **How choices should be generated**

At the end of each page, do not ask the model to invent 4–6 choices from scratch. Generate choices from the current state.

Pipeline:

1. **Collect affordances.**  
    What can the protagonist plausibly do here? Talk, attack, flee, investigate, conceal, confess, bargain, use object, test theory, follow clue, change relationship, etc.  
2. **Bind affordances to live entities.**  
    Talk to whom? Attack whom? Investigate what? Use which object? Reveal which secret?  
3. **Filter hard impossibilities.**  
    Dead characters cannot speak. Lost objects cannot be used. Unknown secrets cannot be confessed unless the protagonist knows them.  
4. **Run consequence-capacity check.**  
    Every offered choice must have at least one viable continuation path.  
5. **Score choices by narrative value.**  
    Does the choice pay off a promise? Escalate a threat? Force a character decision? Reveal information? Create a meaningful cost?  
6. **Diversify choice types.**  
    Avoid six versions of “ask about X.” Offer a mix: moral, strategic, emotional, investigative, risky, self-protective.  
7. **Write the surface text last.**  
    Prose is presentation. The underlying choice should already be a structured operation.

Choice-poetics research is relevant here because choices have experiential effects based on the relationship among options, outcomes, and player goals; Dunyazad, for example, explicitly generated different structures such as relaxed choices, obvious choices, and dilemmas.

So your choice generator should understand not only “what can happen?” but “what kind of choice experience is this?”

Example choice set:

Choice {  
 label: "Accuse Mara in front of the council."  
 operation: "reveal_secret"  
 target: "Mara"  
 usesFact: "mara_forged_letter"  
 likelyEffects: [  
   "mara_relationship--",  
   "council_trust++",  
   "mara_retaliation_obligation_opened"  
 ]  
 choiceMode: "public_confrontation"  
 poeticEffect: "risky_truth"  
}  
---

# **Promise tracking is necessary but dangerous**

A promise/payoff ledger can become mechanical if you are not careful. It can turn fiction into a checklist.

Bad version:

Introduced knife. Must use knife.  
 Introduced prophecy. Must fulfill prophecy.  
 Introduced secret. Must reveal secret.

Better version:

Introduced knife. It has high reader salience and can be fulfilled, subverted, misdirected, transferred, symbolically echoed, or explicitly rendered irrelevant by a stronger event.

The engine should support multiple closure modes:

PayoffMode =  
 | "literal_fulfillment"      // the gun fires  
 | "ironic_reversal"          // the gun saves, not kills  
 | "failed_expectation"       // the gun jams, revealing sabotage  
 | "symbolic_echo"            // the gun is never fired, but becomes a token of cowardice  
 | "transfer"                 // another weapon/object/person carries the function  
 | "red_herring"              // attention was misdirected, with explanation  
 | "tragic_loss"              // the chance to use it is gone, and that loss matters

This matters because interactive stories often destroy their own setups. The system should be comfortable transforming promises rather than merely preserving them.

---

# **The best model: “narrative debt”**

I’d introduce a concept called **narrative debt**.

Every time the system introduces something salient, it takes on debt. Every time the player makes a consequential choice, debt changes. Every time the story pays off, reframes, or acknowledges something, debt falls.

Debt is not bad. Debt is suspense. But unmanaged debt becomes incoherence.

Examples:

| Event | Debt created |
| ----- | ----- |
| A locked door is described in detail | What is behind it? |
| The sister refuses to discuss the war | What happened in the war? |
| The player lies to a friend | Will the lie be discovered? |
| The villain spares the hero | Why? What does the villain want? |
| The player kills a clue-holder | How will the clue surface now, or what happens because it is lost? |

The governor’s job is not to force a plot. It is to keep debt at a satisfying level.

---

# **Recommended system design**

## **The runtime loop**

1. Read current world state.  
2. Read open obligations, consequences, and character goals.  
3. Select or generate candidate storylets.  
4. Filter by hard continuity.  
5. Score by salience and narrative health.  
6. Render the highest-value storylet.  
7. Generate 4–6 structured choices from available affordances.  
8. User picks or manually enters action.  
9. Convert action into event transaction.  
10. Apply facts, consequences, obligations, relationship changes.  
11. Recompute narrative health.  
12. Repeat.

This is much closer to a living fiction engine than a branching tree.

---

## **The storylet selector**

function selectNextStorylet(state: NarrativeState): Storylet {  
 const candidates = storylets  
   .filter(s => satisfiesHardPreconditions(s, state))  
   .filter(s => hasValidCast(s, state))  
   .filter(s => !wouldContradictKnownFacts(s, state))

 const scored = candidates.map(s => ({  
   storylet: s,  
   score:  
     obligationScore(s, state.openObligations) +  
     consequenceScore(s, state.pendingConsequences) +  
     characterGoalScore(s, state.characters) +  
     readerKnowledgeScore(s, state.readerKnowledge) +  
     themeScore(s, state.activeThemes) +  
     pacingScore(s, state.narrativeHealth) -  
     repetitionPenalty(s, state.history) -  
     debtPenalty(s, state)  
 }))

 return weightedPickTop(scored)  
}

Weighted choice is better than always taking the top result. Always-top selection becomes predictable and brittle. Weighted-top lets the story breathe while still favoring relevance.

Yarn Spinner’s built-in strategies include best, least-recently-viewed, random, and random-best-least-recently-viewed approaches; that last idea is especially useful because it combines relevance with anti-repetition.

---

# **Use “threads,” not acts**

Instead of acts, define multiple live threads.

Thread {  
 id: string  
 type: "mystery" | "relationship" | "threat" | "quest" | "theme" | "survival"  
 status: "dormant" | "active" | "pressured" | "critical" | "resolved" | "failed"  
 obligations: ObligationId[]  
 majorEntities: EntityId[]  
 currentPressure: number  
 desiredCadence: number  
}

A story might have:

* `thread: succession_crisis`  
* `thread: mara_friendship`  
* `thread: missing_relic`  
* `thread: plague_in_the_city`  
* `thread: protagonist_guilt`  
* `thread: old_gods_returning`

Each thread advances, stalls, mutates, or resolves depending on play.

This gives shape without requiring a global spine. The story remains coherent because the active threads keep exerting pressure.

---

# **The role of simulation**

Simulation is useful for consequences; it is bad at producing satisfying prose by itself.

Pure simulation tends to create logs:

Bob hated Alice. Alice went to the market. Bob was hungry. The king died. A wolf appeared.

That is not story. It is material from which story can be made.

So I would use simulation for:

* character goals  
* relationships  
* faction pressure  
* resources  
* knowledge propagation  
* offscreen consequences  
* world events  
* threat escalation

Then use **story sifting** to identify narratable patterns. Story sifting is specifically about scanning systemic events for interesting micro-stories and weaving them back into the player-facing narrative.

In other words:

**Simulation creates possibilities. Storylets narrativize them. The governor chooses which ones matter.**

---

# **The role of LLMs**

Use an LLM as a **surface realization and proposal engine**, not as the source of truth.

Bad:

The LLM remembers the story and decides what happens next.

Good:

The state engine tells the LLM what is true, what is open, what tone is desired, which facts must not be contradicted, and which structured event should be rendered.

LLMs are useful for:

* rewriting a storylet to fit current context  
* generating flavor choices from structured affordances  
* summarizing previous events  
* classifying manual player input into structured operations  
* proposing possible consequence templates  
* creating alternate phrasings  
* generating emotional interiority  
* producing bridge scenes

LLMs should not be allowed to silently create, delete, resurrect, or retcon facts. All fact changes should pass through a validator.

Recent LLM-interactive-narrative research is converging on this hybrid approach: generative AI can expand preauthored content, but it widens the gap between author-envisioned and player-experienced stories unless authors can inspect and shape the possibility space. Elsewise, for example, uses structured initialization prompts and trigger rules adapted from storylets, plus visualization of possible playthroughs. Drama Llama similarly combines storylet structure with LLM generation to support open-ended responsiveness while preserving authorial control.

My strong recommendation: **never let the LLM be the continuity database.**

---

# **Authoring tools you will need**

This kind of system lives or dies by tooling.

You need an author UI that shows:

## **1. Open obligations**

HIGH SALIENCE  
- Mara saw the protagonist hide the knife. Open for 7 pages.  
- The blue door has been mentioned twice. No payoff route currently available.  
- The mentor promised to reveal the traitor. Mentor is now dead. Needs transfer/closure.

MEDIUM SALIENCE  
- The storm is approaching.  
- The prince suspects the protagonist.

## **2. Contradiction warnings**

Storylet "Dinner with Mentor" invalid:  
- requires mentor_alive = true  
- current state has mentor_dead = true

## **3. Payoff coverage**

Obligation: "Who forged the letter?"  
Available payoff routes:  
- Mara confession  
- forensic clue in archive  
- rival frames Mara  
- protagonist destroys evidence and mystery becomes moral debt

If a high-salience obligation has zero payoff routes, the authoring tool should scream.

## **4. Consequence horizon**

For every offered choice:

Choice: Kill the captain  
Immediate effects:  
- captain_dead  
- guard_alert +3  
- rebellion_thread pressure +2

Invalidated:  
- captain_interrogation_scene  
- captain_romance_thread

Newly available:  
- funeral_scene  
- second_in_command_power_grab  
- evidence_found_on_body  
- rebellion_blames_player

## **5. Fuzz testing**

Run thousands of simulated playthroughs.

Track:

* unreachable storylets  
* overused storylets  
* orphaned promises  
* contradictions  
* dead ends  
* unresolved high-salience obligations  
* characters acting without motivation  
* player choices that produce no consequences  
* excessive repetition  
* threads that never resolve

Emily Short explicitly notes that salience-based systems benefit from randomized playthroughs and visualization to find sequences that never appear or appear too often.

This is not optional. Without simulation/testing, a dynamic narrative system rots invisibly.

---

# **A concrete example**

Initial state:

World:  
- Mentor alive  
- Mara distrusts protagonist  
- Black pistol in protagonist inventory  
- Forged letter hidden in library  
- Storm approaching

Open obligations:  
- Mentor promised to reveal who betrayed the city  
- Black pistol introduced with high detail  
- Mara saw protagonist lie  
- Storm has been foreshadowed

At page end, possible choices:

1. **Press the mentor for the truth.**  
    Pays/complicates mentor-secret obligation.  
2. **Search the library before the storm hits.**  
    Advances forged-letter clue and storm pressure.  
3. **Give Mara the pistol as a gesture of trust.**  
    Transforms pistol promise and relationship tension.  
4. **Lie to Mara again and sneak away.**  
    Escalates moral debt and distrust.  
5. **Shoot the mentor before he can speak.**  
    Destructive but viable if downstream support exists.

If player chooses 5:

Facts:  
- mentor_dead = true  
- protagonist_killed_mentor = true  
- mentor_secret_unspoken = true

Closed/changed obligations:  
- "mentor promised revelation" cannot be fulfilled literally  
- transformed into "what secret died with him?"  
- black pistol paid off literally  
- Mara distrust escalates if she discovers it

New obligations:  
- body concealment / discovery  
- guilt or justification  
- alternate route to betrayal secret  
- faction reaction to mentor death

New storylet priorities:  
- immediate aftermath  
- search mentor’s room  
- Mara notices blood  
- storm traps protagonist with the corpse

The story has radically changed, but it is coherent.

That is the target.

---

# **What I would avoid**

## **1. Pure act replacement with “promise tracking”**

Too thin. Promises do not explain character behavior or causality by themselves.

## **2. Pure simulation**

Too shapeless. It produces events, not necessarily drama.

## **3. Pure LLM generation**

Too unstable. It will eventually forget, flatten, contradict, or invent continuity.

## **4. Global plot milestones**

Too rigid. You already saw the failure mode.

## **5. “Important NPC cannot die” flags**

Sometimes necessary, but usually a smell. Prefer consequence absorption, role transfer, or diegetic failure.

---

# **The practical MVP**

Build this in layers.

## **Phase 1: State + obligations**

Implement:

* canonical world facts  
* event log  
* reader/character knowledge  
* obligation ledger  
* consequence ledger

Do not worry about fancy AI yet.

## **Phase 2: Storylet engine**

Each storylet has:

* hard preconditions  
* effects  
* obligation opens/closes  
* consequence hooks  
* tags for tone, theme, tension  
* available choices

Use simple salience scoring.

## **Phase 3: Choice transaction system**

Every choice becomes structured state mutation.

Add impact analysis:

* what facts change?  
* what obligations are affected?  
* what future content is invalidated?  
* what new content becomes available?  
* does this choice create unsupported debt?

## **Phase 4: Narrative health dashboard**

Track:

* open debt  
* payoff coverage  
* contradiction risk  
* tension rhythm  
* inactive threads  
* overused storylets  
* unresolved high-salience items

## **Phase 5: LLM integration**

Only now add LLMs:

* parse manual input  
* generate prose from structured scene plans  
* suggest choices from affordances  
* create bridge text  
* summarize state for the reader

Keep deterministic validators.

---

# **The central design rule**

Every generated page and every offered choice should satisfy at least one of these:

1. **Pay off** something previously introduced.  
2. **Complicate** something previously introduced.  
3. **Reveal** a meaningful fact.  
4. **Force** a character to act according to desire, fear, or pressure.  
5. **Create** a new obligation the system knows how to support.  
6. **Change** the world state in a way future scenes can use.  
7. **Reframe** prior events so they matter differently.

If a page does none of those, it is probably filler.

If a choice does none of those, it is fake agency.

---

# **My recommended formulation**

I’d call the architecture something like:

**Obligation-Driven Storylets with Causal State and Character Intent**

Or, more compactly:

**Causal Promise Engine**

The engine’s job is not to enforce a plot. It is to enforce these invariants:

No contradiction without explanation.  
No salient setup without possible closure.  
No major action without causal or motivational support.  
No destructive choice without aftermath.  
No consequence without future availability.  
No reader-facing detail without narrative accounting.  
No character behavior without intention, pressure, or ignorance.

That gets you the thing you actually want: not a story that follows an act structure, but a story that **remembers what it has become**.

