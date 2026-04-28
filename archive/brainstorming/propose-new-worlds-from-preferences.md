# Propose New Worlds From Preference Documents

## Purpose

Generate candidate story-world proposals from a user's worldbuilding preference document, while avoiding repetition of existing worlds in `worlds/*`.

This pipeline does **not** create the full world. It produces proposal cards and downstream-ready packets for `create-base-world`.

It is for:

- turning a preference document into a generative world-design grammar
- extracting the distinct essence of existing worlds
- finding unoccupied world niches
- generating X mutually distinct story-world proposals
- producing proposals with enough propagation logic to be safely deepened into full worlds

---

## Core Rule

No world proposal begins as a genre, vibe, trope, map, faction list, or image.

Every proposal begins as:

- a fertile impossible fact / novum
- a survival constraint
- a time-space structure
- a core contradiction
- a misrecognized history
- a propagation web
- a set of institutions, professions, taboos, documents, crimes, and ordinary lives that could only exist under that condition

A proposal is not ready until it can answer:

> What world-specific pressure produces stories here that cannot happen elsewhere?

---

## Research Basis

This pipeline operationalizes several narrative-theory and worldbuilding principles:

- **Storyworlds as inferred mental models:** a world is not only what is explicitly stated, but the implicit environment that lets readers infer who did what, where, when, why, and under what conditions.
- **Minimal departure:** readers assume a fictional world resembles reality except where the design marks a departure. Therefore a proposal should use a small number of load-bearing deviations and derive many consequences from them.
- **Novum / cognitive estrangement:** the central difference should be a conceptual challenge, not a decorative exotic element.
- **Chronotope:** time and space should fuse into a lived structure that determines what kinds of events naturally occur.
- **Subcreation / inner consistency:** the more unlike reality the world becomes, the more rigorously its internal laws must hold.
- **Worldbuilding infrastructures:** maps, timelines, cultures, mythologies, languages, ecologies, institutions, and philosophies must interconnect, not merely accumulate.
- **Possible-world plurality:** the world must contain not only objective truth, but official truths, local truths, character belief-worlds, propaganda-worlds, and reader-expectation worlds.
- **Transmedia/world-scale fertility:** the world should be able to support many stories, artifacts, characters, and routes of discovery without exhausting itself.

---

## Boundary With Adjacent Pipelines

### vs `create-base-world`

This pipeline proposes a world niche and a downstream-ready design packet.

`create-base-world` turns one selected proposal into:

- `WORLD_KERNEL.md`
- initial invariants
- ontology
- canon records
- geography
- institutions
- everyday life
- mystery reserve
- other mandatory world files

This pipeline must not pretend the proposal is already canon.

### vs `canon-addition`

This pipeline may propose candidate foundational facts, but it does not adjudicate canon changes inside an existing world.

If a user wants to graft a proposed world element into an existing world, route that element through `canon-addition`.

### vs `propose-new-canon-facts`

That pipeline enriches an existing world.

This pipeline creates *new world options* and prevents them from repeating existing world niches.

### vs `propose-new-characters`

This pipeline may sketch the kinds of people a world would generate, but it does not create character proposals except as proof that the world can produce distinctive persons.

### vs `diegetic-artifact-generation`

This pipeline may name likely artifact classes — court manuals, plague ledgers, heretical maps, repair prayers, birth registries, smuggling songs — but it does not write artifacts.

---

## Required Inputs

- user preference document, similar to `preferred-worldbuilding.md`
- desired number of world proposals, X
- app foundations / world-design rules
- `worldbuilding-patterns.md` or equivalent extracted preference grammar
- current `worlds/*` directory, if existing worlds must be avoided
- intended use case:
  - novel
  - RPG setting
  - open-world game
  - anthology world
  - transmedia setting
  - lore sandbox
- user exclusions / dislikes / ethical red lines
- desired inspiration distance:
  - close resonance
  - moderate resonance
  - distant resonance
  - only structural resonance, no surface resemblance

---

## Strongly Recommended User Inputs

If absent, the skill should request them or mark assumptions explicitly.

Ask for:

- at least 8-12 favorite worlds, not only titles but what the user likes about each
- at least 3-5 anti-inspirations or failure modes
- preferred tonal range
- genre preferences and genre exclusions
- desired degree of weirdness
- desired degree of realism vs mythic abstraction
- preferred scale:
  - one settlement
  - region
  - continent
  - planet
  - solar system
  - cosmology
- desired story scale:
  - intimate
  - local
  - regional
  - epic
  - mosaic / anthology
- content boundaries around sex, violence, body horror, child endangerment, religion, politics, and oppression
- whether the user wants playable institutions, diegetic-document richness, factional politics, ecology, body/personhood questions, or mystery-forward design emphasized

### Follow-Up Trigger

Ask a follow-up before generating if the preference document is mostly:

- titles with no explanation
- aesthetic adjectives with no mechanism
- plot preferences rather than worldbuilding preferences
- only one or two inspirations
- no anti-inspirations
- no intended use case
- no tonal or ethical boundaries

Otherwise proceed and tag uncertainties.

---

## Required World-State Inputs When Existing Worlds Exist

For each world under `worlds/<slug>/`, retrieve the strongest available context packet or equivalent structured materials.

At minimum:

- `WORLD_KERNEL.md`
- `ONTOLOGY.md`
- all invariants
- canon fact summaries by domain
- mystery reserve entries
- open questions
- timeline layers
- geography sections
- peoples/species sections
- institutions sections
- economy/resources sections
- magic/tech systems sections
- everyday-life sections
- characters index, if present
- diegetic-artifact metadata, if present
- unresolved contradiction list

### Read Discipline

Use `mcp__worldloom__get_context_packet` or structured retrieval whenever available.

Do not rely on raw prose alone if machine-facing retrieval exists.

### Output From This Stage

- one essence profile per existing world
- world-niche occupancy map
- hard-avoid repetition zones
- reusable-but-must-transform motifs
- underused adjacent possibility zones

---

## Output Bundle

The pipeline produces:

1. **Preference Essence Report**
   - what the user repeatedly values
   - what they reject
   - pattern weights
   - desired world grammar

2. **Existing World Essence Map**
   - essence profile for each world in `worlds/*`
   - niche signature for each
   - hard/soft/ambient niche occupancy

3. **Vacancy Map**
   - unoccupied possibility zones
   - promising combinations not yet represented
   - forbidden duplicates

4. **Candidate Seed Pool**
   - at least 4X to 6X rough world seeds before filtering

5. **Final X Proposal Cards**
   - mutually distinct
   - preference-aligned
   - world-produced, not trope-produced
   - ready for user selection

6. **Pairwise Distinctiveness Notes**
   - how each finalist differs from every other finalist
   - how each finalist differs from existing worlds

7. **Create-Base-World Packets**
   - one downstream packet per proposal

8. **Risk and Repair Notes**
   - where a proposal could become derivative, too broad, too thin, or too burdensome

---

## Design Goal

Generate worlds that are:

- distinct from existing worlds
- structurally fertile
- internally coherent
- aligned with the user's stated taste
- not mere pastiche of favorite works
- not generic genre skins
- rich in ordinary-life implications
- capable of producing institutions, professions, characters, artifacts, local documents, and mysteries
- compatible with the app's canon-layer discipline
- ready to become full worlds without requiring the generator to improvise basic logic later

---

# World Essence Model

A world's essence is not its summary.

A summary says what exists.

An essence profile says what keeps making things exist.

For each preference-world, existing world, seed, and finalist, represent the world through these layers.

## 1. Primary Difference / Impossible Fact

The shortest sentence that makes the world depart from baseline reality.

Examples of form:

- ascent is physically punished
- death creates ghosts unless industrially contained
- the city is legally split by trained perception
- bodies can become legal infrastructure
- one resource makes civilization possible but morally contaminates everyone who uses it

## 2. Survival Constraint

What the impossible fact makes scarce, dangerous, unstable, forbidden, or administratively necessary.

Typical constraints:

- heat
- water
- oxygen
- clean memory
- legal perception
- personhood
- fertility
- bodily integrity
- identity continuity
- burial safety
- authorization
- clean air
- return from a place
- immunity from old infrastructure

## 3. Propagation Signature

The domains most deeply altered by the primary difference.

Mandatory domains to check:

- food
- medicine
- birth
- childhood
- sex / courtship / kinship
- labor
- class
- law
- punishment
- religion
- architecture
- transport
- trade
- war
- crime
- education
- language
- mourning
- archives
- ecology
- body/personhood
- daily routine

## 4. Core Contradiction

The unresolved paradox that keeps the world morally and narratively alive.

Examples of form:

- the cure is the vector
- the wall protects and imprisons
- the oppressed group is genuinely dangerous but the control system is monstrous
- restoration would destroy the survivors
- rebellion is partly anticipated by control
- a resource enables civilization and proves its guilt

## 5. Chronotope

The world's lived time-space structure.

Not merely a map.

Define:

- what direction matters
- what distance means
- what travel costs
- what historical layers remain visible
- what time rhythm governs life
- what places make certain events inevitable
- what genre of encounter the time-space naturally produces

Examples of chronotope categories:

- vertical descent world
- concentric enclosure world
- border/Zone world
- pressure-cooker city
- dying frontier
- recurrent apocalypse cycle
- road/pilgrimage world
- ruin-under-present world
- archipelago of isolated experiments
- moving-settlement predation world
- underworld-displaced civilization

## 6. Resource / Infrastructure Spine

What civilization processes, extracts, burns, preserves, feeds on, hides, or fails to authenticate.

This may be:

- a material resource
- an energy source
- a dead civilization's infrastructure
- a legal system
- a biological condition
- a metaphysical boundary
- a memory technology
- a corpse economy
- a climate survival mechanism

## 7. Institutional Ecology

Which organizations could only exist here?

For each world, identify:

- one official institution
- one religious / ideological institution
- one criminal or black-market institution
- one technical / scholarly / medical institution
- one military / policing institution
- one folk or local adaptation
- one commercial organization

Each institution must have:

- material base
- legitimacy source
- enforcement method
- recruitment path
- internal contradiction
- relationship to the core world wound

## 8. Deep History / Misrecognition

What old event still acts on the present, and how is it misunderstood?

For each proposal:

- old catastrophe or origin event
- official explanation
- folk explanation
- specialist theory
- suppressed truth
- surviving evidence
- faction that benefits from the false explanation
- mystery reserve boundary

## 9. Body and Personhood Consequences

Ask:

- whose bodies are changed by the premise?
- who is legally/personally unstable?
- who is useful but feared?
- who is dangerous but victimized?
- what bodily condition changes class, labor, sexuality, personhood, or punishment?
- what happens to children?
- what happens to the dead?

## 10. Factions as Civic Hypotheses

Each major faction answers:

> Given this world, what should civilization become?

For each faction, define:

- ideology
- aesthetic
- resource base
- social base
- body/personhood stance
- taboo
- enemy
- internal contradiction
- distorted history
- ordinary member's daily life

## 11. Everyday-Life Strangeness

A world's premise is real only when it reaches breakfast, toilets, beds, songs, insults, paperwork, childcare, and funeral habits.

For each world seed, prove everyday-life propagation through at least five ordinary practices.

## 12. Mystery Reserve Shape

The world must have bounded unknowns, not vague blanks.

For each proposal:

- active mysteries
- passive depths
- forbidden mysteries
- forbidden cheap answers
- future resolution safety
- documents or institutions that preserve distorted clues

## 13. Native Story Procedures

What does one *do* in this world to reveal it?

Possible procedures:

- case
- heist
- descent
- hunt
- expedition
- audit
- pilgrimage
- smuggling run
- quarantine breach
- memory trial
- relic appraisal
- city repair
- funeral dispute
- faction negotiation
- forbidden crossing
- ecological investigation
- institutional coverup

A proposal without native procedures will not reliably produce stories.

## 14. Tone / Aesthetic Contract

Define the emotional and sensory identity of the world.

Do not stop at adjectives. Specify:

- what the world smells like
- what institutions look like
- what people fear saying aloud
- what kind of humor survives
- what kinds of beauty are available
- what kind of ugliness is normalized
- what cannot happen without breaking the world

---

# Niche Occupancy Model

Existing worlds should not block all reuse of broad patterns. They block repeated essence combinations.

## Hard-Occupied World Niche

A niche is hard-occupied if an existing world already has the same combination of:

- primary impossible fact
- survival constraint
- chronotope
- resource/infrastructure spine
- core contradiction
- deep-history misrecognition
- institutional ecology
- native story procedures
- tone/aesthetic contract

Do not generate a new proposal in this niche.

## Soft-Occupied World Niche

A niche is soft-occupied if an existing world shares several major layers but differs in one or two decisive structural axes.

You may generate adjacent proposals only if the new proposal decisively changes:

- the survival variable
- the chronotope
- the core contradiction
- the institutional response
- the ordinary-life consequences
- the epistemic/mystery structure

## Ambient-Occupied Motif

Broad motifs are ambient, not blocking:

- ruins
- factions
- body horror
- old catastrophe
- religious institution
- magic resource
- hostile frontier
- cybernetic identity
- plague
- forbidden border

Ambient motifs may be reused only if they are functionally transformed.

Rule:

> Never reject a proposal because it shares one motif. Reject it because it repeats a pressure engine.

---

# Distinctiveness Axes

Use weighted comparison for existing worlds and finalists.

Suggested weights:

- primary impossible fact / novum: 20%
- survival constraint: 15%
- chronotope / geography-as-law: 15%
- core contradiction: 12%
- resource/infrastructure spine: 10%
- deep history and misrecognition: 10%
- institutional ecology: 8%
- body/personhood consequences: 5%
- factional civic hypotheses: 3%
- tone/aesthetic contract: 2%

Suggested thresholds:

- 0.80+ similarity = duplicate / reject
- 0.65-0.79 = crowded / major redesign required
- 0.45-0.64 = adjacent / viable with explicit differentiation
- below 0.45 = usually distinct

Never use the score without a human-readable explanation.

---

# Phase 0: Normalize the Request

Determine:

- X, desired number of proposals
- intended use case
- desired scale
- desired inspiration distance
- whether existing worlds must be strictly avoided or only not repeated
- whether the user wants proposals close to the preference document or aggressively novel
- whether mature, erotic, horrific, religious, political, or body-focused content is allowed
- whether the batch should diversify genre or stay in one broad genre family

Output:

```yaml
request_profile:
  proposal_count: 8
  use_case: lore_sandbox
  scale_preference: regional_to_planetary
  inspiration_distance: structural_resonance_only
  novelty_preference: high
  existing_world_policy: avoid_repeating_core_niches
  content_boundaries:
    sexual_content: ask_or_tag
    body_horror: allowed_if_structural
    child_endangerment: ask_or_handle_carefully
  assumptions_to_tag:
    - user wants worlds with strong rule propagation
    - user prefers factional/institutional density
```

---

# Phase 1: Parse the Preference Document

Extract every liked world and each stated reason for liking it.

For each referenced world, separate:

- surface feature
- underlying mechanism
- user-valued effect
- reusable abstract pattern
- anti-pattern implied by the preference

Example transformation:

```yaml
input_surface: giant toxic jungle with insects
underlying_mechanism:
  - ecology is misunderstood planetary process
  - survival requires environmental interpretation
  - factions adapt differently to ecological danger
user_valued_effect:
  - strange fauna/flora with real consequences
  - technology adapted to atmosphere and terrain
  - myth formed around environmental constraint
reusable_pattern:
  - ecology_as_epistemic_puzzle
avoid_copying:
  - poison jungle
  - giant guardian insects
```

### Extract Preference Weights

Score 0-5 for each pattern:

- impossible fact / novum
- consequence propagation
- survival constraints
- premise-born professions
- compensatory technology
- resource-as-civilization
- morally contaminated energy
- premise-specific institutions
- factions as civic hypotheses
- faction aesthetic/function fusion
- extreme localization
- geography as law
- directional geography
- settlement-as-organism
- ecology as process
- monsters with multiple meanings
- deep history as gravity
- misrecognized catastrophe
- active ruins
- contested documentation
- managed ignorance
- prophecy/control systems
- layered power jurisdictions
- power as liability
- body politics
- personhood instability
- visible interiority
- death as infrastructure
- medicine as control/contamination/sacrament
- religion as technology
- bureaucratic metaphysics
- hostile borders
- crime as world-interface
- playable institutions
- material-constraint politics
- sovereignty fragmentation
- moral ambiguity
- utopian horror
- suspicious restoration
- genre mutation through revelation
- protagonist as systemic rupture
- systems that metabolize rebellion
- social rules as world engines
- everyday life under impossible conditions
- tonal hybridization
- local documents as canon carriers
- artifact layers
- one location as hinge
- world-specific transport
- architecture as ideology
- class made physical
- race/species as material condition
- catastrophe as civic design
- pressure-cooker modernity
- infrastructure failure as apocalypse
- native story procedures
- small-scale life plus large-scale metaphysics
- dead world repurposed
- institutions as fossils
- premise contradiction
- current inhabitants are legitimate
- local myths from constraints
- weather/environment as institution
- multiple truth layers
- institutional smell
- mini-society generator
- one shared domain, many expressions
- civic machine
- metaphysical underworld
- digital necromancy / technological occultism
- world-generated taboos
- world-specific law enforcement
- punishment as worldbuilding
- failure-mode episodes
- food / medicine / mourning / children / language as worldbuilding
- specificity of the impossible
- aesthetic follows function

### Output

```yaml
preference_essence:
  dominant_patterns:
    - consequence_propagation
    - survival_constraints
    - premise_specific_institutions
    - deep_history_as_gravity
    - contested_documentation
    - geography_as_law
  strong_dislikes:
    - generic_factions
    - cosmetic_species
    - decorative_magic
    - neutral_lore_encyclopedia
  design_formula: >
    A strange rule creates a survival problem; survival produces institutions;
    institutions produce professions, taboos, technologies, factions,
    documents, and crimes; truth is buried or distorted; stories arise from
    discovering, exploiting, resisting, or being crushed by that distortion.
```

---

# Phase 2: Preference Compression Into a Design Grammar

The preference essence must be compressed into a rule system the generator can use.

## Required Grammar Fields

- preferred world wound types
- preferred survival variables
- preferred chronotopes
- preferred institution types
- preferred faction structures
- preferred mystery shapes
- preferred everyday-life consequences
- preferred story procedures
- preferred tone contradictions
- disliked failure modes

### Example

```yaml
world_preference_grammar:
  favored_wounds:
    - old_catastrophe_normalized_as_daily_life
    - resource_that_sustains_and_contaminates
    - hostile_border_that_is_also_temptation
    - social_rule_with_metaphysical_effects
    - infrastructure_that_outlived_legitimacy
  favored_chronotopes:
    - vertical_descent
    - pressure_cooker_city
    - active_ruin_frontier
    - enclosed_society_with_false_history
    - border_zone
  favored_story_procedures:
    - investigation
    - expedition
    - heist
    - forbidden_crossing
    - relic_recovery
    - institutional_coverup
  rejected_shapes:
    - generic_empire_vs_rebels
    - magic_school_without_social_consequence
    - species_catalogue
    - ruins_as_scenery
```

---

# Phase 3: Load and Essence-Map Existing Worlds

For every world in `worlds/*`, build a concise but formal essence profile.

Do not summarize the world in fan-wiki form.

Ask:

- what is the world's shortest accurate kernel?
- what is its primary impossible fact?
- what survival constraint does it create?
- what institutions exist because of it?
- what does its geography force?
- what historical wound remains active?
- what are its strongest mystery reserves?
- what kind of character does it naturally grow?
- what stories can happen only here?
- what would make it feel unlike itself?

### Existing World Essence Schema

```yaml
world_slug: animalia
attention_status: existing_world
world_kernel_digest: >
  Short description of what the world fundamentally is.
primary_difference: ...
survival_constraint: ...
core_contradiction: ...
chronotope: ...
resource_infrastructure_spine: ...
institutional_ecology:
  official: ...
  religious: ...
  criminal: ...
  technical: ...
  policing: ...
deep_history_pressure: ...
misrecognition_structure: ...
body_personhood_axis: ...
factional_civic_hypotheses:
  - ...
everyday_life_signature: ...
native_story_procedures:
  - ...
mystery_reserve_shape: ...
aesthetic_contract: ...
hard_avoid_repetition:
  - ...
ambient_reusable_motifs:
  - ...
```

---

# Phase 4: Build the World-Niche Occupancy Map

Compare existing worlds against the preference grammar.

Classify niches as:

- hard-occupied
- soft-occupied
- ambient motif only
- open
- especially promising vacancy

### Vacancy Diagnosis Questions

- Which preferred world patterns are not represented in existing worlds?
- Which existing worlds share a surface genre but not the deeper pressure engine?
- Which existing world has a strong impossible fact but weak institutional propagation?
- Which chronotopes are absent?
- Which survival variables are absent?
- Which body/personhood tensions are absent?
- Which official/unofficial adaptation pairs are absent?
- Which native story procedures are absent?
- Which kinds of ordinary life are still unavailable?

### Output

```yaml
world_niche_vacancy_map:
  hard_occupied:
    - wound: resource_corruption_desert_empire
      occupied_by: world_slug
      avoid: repeating spice-like monopoly ecology plus feudal imperial dependency
  soft_occupied:
    - wound: old_infrastructure_failed_authentication
      occupied_by: world_slug
      allowed_if: move from machine infrastructure to social/perceptual/ritual infrastructure
  open_high_yield:
    - civic_design_around_forbidden_sleep
    - food_chain_based_personhood
    - memory_as_taxable_resource
    - architecture_that_must_be_fed
    - seasonal_legal_identity_shift
```

---

# Phase 5: Generate Seed Families

Generate at least 4X to 6X seeds.

Each seed must be one clean world wound plus a rough propagation promise.

Do not deepen yet.

## Seed Families

### 1. Impossible Fact Seeds

Begin with a sentence that alters reality.

Prompt:

> What concrete impossible fact would force civilization to reorganize?

### 2. Survival Variable Seeds

Begin with one scarcity or hazard.

Prompt:

> What if one mundane necessity became metaphysical, politicized, or morally contaminated?

Variables:

- heat
- sleep
- memory
- silence
- light
- shadow
- clean names
- stable bodies
- legal identity
- breathable truth
- burial space
- unobserved time
- trustworthy maps

### 3. Chronotope Seeds

Begin with time-space asymmetry.

Prompt:

> What direction, boundary, rhythm, or distance behaves like law?

Categories:

- deeper / higher / inward / outward
- before / after / looped / seasonal
- inside / outside
- seen / unseen
- authorized / unauthorized
- remembered / erased
- near the center / far from heat

### 4. Resource Spine Seeds

Begin with civilization's load-bearing resource.

Prompt:

> What keeps society alive while morally implicating it?

### 5. Misrecognized History Seeds

Begin with a false explanation that still keeps people alive.

Prompt:

> What disaster did civilization survive by misunderstanding it usefully?

### 6. Institution Fossil Seeds

Begin with an institution that forgot its original purpose but retained power.

Prompt:

> What office, guild, church, archive, or machine still rules because no one remembers how to safely stop it?

### 7. Body / Personhood Seeds

Begin with altered human/sentient status.

Prompt:

> What bodily condition makes someone necessary, feared, exploitable, or legally unstable?

### 8. Social Rule Seeds

Begin with a rule rather than a technology.

Prompt:

> What behavior is forbidden here that would be ordinary elsewhere, and what institution enforces the taboo?

### 9. Ecology-as-Process Seeds

Begin with an ecological verb.

Prompt:

> What does the ecosystem do that humans must adapt to, misunderstand, exploit, and mythologize?

Examples of verbs:

- remembers
- digests
- audits
- mimics
- votes
- heals
- reclassifies
- mourns
- preserves
- eats lies
- produces heirs
- translates corpses

### 10. Artifact-Layer Seeds

Begin with an object whose use and meaning diverge.

Prompt:

> What artifact has an observed effect, a local myth, an official classification, a black-market use, and an original purpose that contradicts all of them?

---

# Phase 6: Seed Sanity Pass

Reject seed immediately if:

- it is only a genre premise
- it has no survival constraint
- it copies a named inspiration's surface package
- it copies an existing world's essence
- it produces only elite/adventure consequences
- it has no ordinary-life implications
- it has no institutional consequences
- it has no plausible bottleneck
- it contains too many disconnected impossible facts
- it explains itself too completely
- it lacks mystery potential

Each surviving seed must answer in one paragraph:

> If this were true, why would ordinary life, institutions, geography, and history look different?

---

# Phase 7: Build Propagation Skeletons

For each surviving seed, generate a skeleton, not a full world.

## Required Fields

- impossible fact
- immediate survival constraint
- first-order consequences
- second-order consequences
- third-order consequences
- institutions generated
- professions generated
- taboos generated
- crimes generated
- technologies / rituals generated
- factions as civic hypotheses
- region types
- ordinary-life practices
- deep-history misrecognition
- mystery reserve seeds
- native story procedures
- limiting conditions

### Skeleton Schema

```yaml
seed_id: WSEED-014
working_title: The Cities That Cast Shadows Backward
impossible_fact: >
  Every settlement casts a shadow not from sunlight but from its future deaths;
  the longer and darker the shadow, the more disaster the city is owed.
survival_constraint: >
  Civic survival depends on interpreting, shortening, concealing, or exporting
  future-death shadows without causing worse disasters.
first_order:
  - cities measure shadow-length as public danger
  - architects design streets to redirect civic omen-load
  - births and executions alter readings
second_order:
  - shadow auditors become powerful
  - insurers and marriage houses price families by district shadow
  - criminals smuggle portable darkness from doomed neighborhoods
third_order:
  - ruling houses falsify shadows to preserve legitimacy
  - anti-shadow sects sabotage civic lighting systems
  - frontier towns invite refugees because new bodies redistribute future deaths
institutions:
  official: Civic Shadow Office
  criminal: lampblack brokers
  religious: doctrine of owed endings
  technical: catastrophe surveyors
ordinary_life:
  - households paint thresholds with pale clay before births
  - children learn not to step into municipal death-lines
  - funerals are scheduled at dawn to minimize shadow debt
native_story_procedures:
  - audit
  - insurance fraud investigation
  - disaster pilgrimage
  - civic coverup
mystery_seeds:
  - whether shadows predict deaths or cause them
limiting_conditions:
  - readings are local, probabilistic, and politically corruptible
```

---

# Phase 8: Existing-World Distinctness Check

Compare each skeleton to every existing world essence profile.

For each near-overlap, require a design decision:

- reject
- transform chronotope
- transform survival variable
- transform contradiction
- transform institution ecology
- transform body/personhood axis
- transform history/misrecognition
- transform native story procedure

### Duplicate Warning Signs

- same one-sentence impossible fact with nouns swapped
- same central place type and same resource logic
- same faction structure under different names
- same old catastrophe and same current misunderstanding
- same protagonist rupture type
- same native story procedure without new world logic
- same tone/aesthetic with no structural change

### Anti-Pastiche Rule

A proposal inspired by a liked world must copy **no more than one surface layer** from that work, and must transform the load-bearing mechanism.

Bad:

> A city underground where souls are traded and devils run commerce.

Better:

> A city displaced into an archive where recorded promises become edible fuel; the old civic bureaucracy survives because starving citizens must keep producing contracts that the archive can digest.

---

# Phase 9: Preference Fit Scoring

Score each skeleton 1-5.

## Positive Axes

- preference alignment
- novelty relative to existing worlds
- consequence propagation
- ordinary-life reach
- institution generation
- faction generation
- geography-as-law strength
- deep-history pressure
- mystery reserve quality
- diegetic artifact potential
- character-generation potential
- native story procedure strength
- tonal/aesthetic specificity

## Negative Axes

- redundancy risk
- pastiche risk
- overcomplexity
- implementation burden
- thematic mismatch
- ethical boundary risk
- mystery-flattening risk
- spectacle-without-society risk

### Selection Rule

Do not select only by total score.

Use max-min selection:

1. Choose the highest-quality viable seed.
2. For each next proposal, choose the candidate with the best combination of:
   - quality
   - minimum distance from already selected finalists
   - minimum distance from existing worlds
   - coverage of different preference-pattern clusters
3. Continue until X proposals remain.

A slightly lower-scoring proposal is better if it opens a truly unoccupied world niche.

---

# Phase 10: Deepen Finalists Into Proposal Cards

Each final proposal must include enough structure to feed `create-base-world`, but not so much that it becomes a full world before user approval.

## Proposal Card Template

### Proposal ID

Unique ID, e.g. `NWP-0001`.

### Title

Evocative but not misleading.

### Core Sentence

The shortest accurate statement of what makes the world impossible.

### World Niche Summary

What possibility-space this proposal occupies.

### Why This Niche Is Open

Explain how it avoids repeating existing worlds.

### Genre Contract

What kind of stories the world promises.

### Tone Contract

Emotional and aesthetic identity.

### Primary Difference / Impossible Fact

Concrete and operational.

### Core Contradiction

The moral/systemic paradox.

### Survival Constraint

What this fact makes scarce, dangerous, unstable, or politically valuable.

### Chronotope

The lived time-space structure.

### Geography as Law

How space enforces the premise.

### Resource / Infrastructure Spine

What civilization depends on.

### Deep History and Misrecognition

- old event
- official version
- folk version
- suppressed truth
- evidence
- who benefits from misunderstanding

### Institutions Born From the Premise

At least seven:

- official
- religious/ideological
- criminal/black-market
- technical/scientific/medical
- military/policing
- commercial
- folk/local

### Professions Born From the Premise

Jobs that sound absurd outside this world but ordinary inside it.

### Factions as Civic Hypotheses

At least four factions.

Each needs:

- ideology
- aesthetic
- social base
- resource base
- enemy
- internal contradiction
- distorted history

### Ordinary-Life Proof

At least ten ordinary consequences across:

- food
- housing
- clothing
- childhood
- courtship
- medicine
- law
- work
- mourning
- language

### Body / Personhood Consequences

Who is changed, feared, exploited, needed, or legally unstable?

### Local Documents and Artifact Potential

List likely diegetic artifact classes:

- law code
- field manual
- prayer
- smuggling song
- court record
- medical chart
- children's rhyme
- heretical map
- repair log
- propaganda broadsheet

### Native Story Procedures

List procedures that reveal the world:

- investigation
- heist
- expedition
- descent
- audit
- trial
- forbidden crossing
- emergency response
- pilgrimage
- relic appraisal

### Natural Story Engines

What repeatedly creates conflict?

### Mystery Reserve Seeds

At least:

- one active mystery
- one passive depth
- one forbidden mystery

### Equilibrium Explanation

Why has the world not already optimized away its premise?

Use bottlenecks:

- rarity
- secrecy
- taboo
- high failure cost
- monopoly
- unreliable knowledge
- geography
- politics
- material limits
- hard-to-transport resource
- social dependence on the false explanation

### Preference Fit

Explain which user preference patterns this satisfies.

### Distinctness From Existing Worlds

Name the nearest existing world niches and decisive differences.

### Risks and Repairs

- pastiche risk
- overcomplexity risk
- tone risk
- implementation burden
- repair strategy

### Downstream `create-base-world` Packet

Required fields:

- user premise
- genre
- exclusions / dislikes
- target mood or tone
- degree of realism vs mythic abstraction
- intended use case
- inspirations to use structurally
- anti-inspirations
- scale
- preferred density of lore
- mystery level
- ethical red lines

---

# Phase 11: Validation Tests

Reject or revise any final proposal that fails any test.

## 1. One-Sentence Fertility Test

Can the world be stated as one concrete impossible sentence that produces many consequences?

## 2. Minimal Departure Test

Are there too many unrelated departures from reality?

A strong world usually has one or two load-bearing departures, then consequences.

## 3. Consequence Propagation Test

Does the premise affect at least eight major domains?

## 4. Ordinary-Life Test

Can a child, laborer, healer, criminal, priest, trader, ruler, and outsider each experience the premise differently?

## 5. Institution Test

Do institutions arise from the premise rather than generic genre furniture?

## 6. Geography-as-Law Test

Does space impose consequences?

## 7. History-as-Pressure Test

Does the past still act on the present?

## 8. Misrecognition Test

Are people wrong about the world in useful, socially maintained ways?

## 9. Mystery Reserve Test

Are the unknowns bounded and useful rather than vague?

## 10. Faction Test

Do factions represent survival arguments rather than color teams?

## 11. Body / Personhood Test

Does the premise touch embodiment, personhood, death, childhood, sexuality, illness, class, or law?

Not every world must emphasize all of these equally, but at least one bodily/social axis must be nontrivial.

## 12. Native Procedure Test

Does the world create repeatable story procedures impossible elsewhere?

## 13. Anti-Pastiche Test

Can the proposal survive removing all surface resemblance to its inspirations?

## 14. Existing-World Non-Redundancy Test

Does it avoid the hard-occupied niches in `worlds/*`?

## 15. Tone Contract Test

Would one obvious escalation or genre import make the world feel unlike itself?

If yes, record it as a future invariant candidate.

---

# Phase 12: Mandatory LLM Roles

Run these passes separately when possible.

## Preference Extractor

Builds the preference grammar.

## Narrative Theory Analyst

Checks storyworld, minimal-departure, novum, chronotope, and possible-world logic.

## Existing World Essence Cartographer

Extracts essence profiles from `worlds/*`.

## Niche Diversity Critic

Prevents repetition of existing worlds and repetition within the proposal batch.

## Ontology Architect

Checks whether the impossible fact is operationally clear and not merely poetic.

## Propagation Systems Critic

Forces second- and third-order consequences.

## Geography / Ecology Analyst

Checks whether space, environment, and ecology are load-bearing.

## Institutions / Economy Critic

Checks whether power, labor, resources, enforcement, and legitimacy make sense.

## Everyday-Life Critic

Rejects worlds that only serve rulers, heroes, and lore dumps.

## Body / Personhood Critic

Checks bodies, death, medicine, childhood, class, and personhood.

## Mystery Curator

Protects unresolved depths and prevents overexplanation.

## Diegetic Artifact Critic

Checks whether the world naturally produces biased documents, records, manuals, laws, myths, and artifacts.

## Anti-Pastiche Critic

Flags disguised copies of preferred works or existing worlds.

## Create-Base-World Readiness Critic

Ensures every selected proposal can route cleanly into `create-base-world`.

---

# Phase 13: Final Output Schema

```yaml
proposal_batch_id: NWP-BATCH-0001
source_preference_document: preferred-worldbuilding.md
proposal_count_requested: 8
existing_worlds_scanned:
  - world_slug: animalia
    occupancy_summary: ...
preference_essence:
  dominant_patterns:
    - consequence_propagation
    - geography_as_law
    - premise_specific_institutions
  rejected_patterns:
    - decorative_magic
    - generic_factions
    - species_as_skin
vacancy_map:
  hard_occupied:
    - ...
  open_high_yield:
    - ...
final_proposals:
  - proposal_id: NWP-0001
    title: ...
    core_sentence: ...
    world_niche_summary: ...
    why_niche_is_open: ...
    genre_contract: ...
    tone_contract: ...
    primary_difference: ...
    core_contradiction: ...
    survival_constraint: ...
    chronotope: ...
    geography_as_law: ...
    resource_infrastructure_spine: ...
    deep_history_misrecognition:
      old_event: ...
      official_version: ...
      folk_version: ...
      suppressed_truth: ...
      beneficiary_of_lie: ...
    institutions_born_from_premise:
      official: ...
      religious: ...
      criminal: ...
      technical: ...
      policing: ...
      commercial: ...
      folk: ...
    professions_born_from_premise:
      - ...
    factions_as_civic_hypotheses:
      - name: ...
        ideology: ...
        aesthetic: ...
        social_base: ...
        resource_base: ...
        internal_contradiction: ...
    ordinary_life_proof:
      food: ...
      housing: ...
      childhood: ...
      medicine: ...
      mourning: ...
      language: ...
    body_personhood_consequences: ...
    local_documents_and_artifact_potential:
      - ...
    native_story_procedures:
      - ...
    natural_story_engines:
      - ...
    mystery_reserve_seeds:
      active: ...
      passive: ...
      forbidden: ...
    equilibrium_explanation: ...
    preference_fit:
      matched_patterns:
        - ...
      why_user_may_like_it: ...
    distinctness_from_existing_worlds:
      nearest_existing_niches:
        - ...
      decisive_differences:
        - ...
    scores:
      preference_alignment: 5
      distinctiveness: 5
      propagation_value: 5
      story_yield: 5
      ordinary_life_relevance: 4
      mystery_quality: 4
      implementation_burden: medium_high
      pastiche_risk: low
    risks_and_repairs:
      - risk: ...
        repair: ...
    create_base_world_packet:
      user_premise: ...
      genre: ...
      target_mood_or_tone: ...
      realism_vs_mythic_abstraction: ...
      intended_use_case: ...
      exclusions_dislikes: ...
      scale: ...
      desired_mystery_level: ...
      ethical_red_lines: ...
recommended_next_steps:
  - user_selects_one
  - route_selected_proposal_to_create_base_world
  - preserve_unselected_finalists_as_noncanon_proposal_archive
```

---

# Example Proposal Card Style

This is an example of output shape, not a recommendation to include this exact world.

## NWP-0001 — The Unburied Calendar

### Core Sentence

Every year has corpses that belong to it, and if the dead are not buried in the correct year-soil before the season turns, the next year arrives deformed.

### World Niche Summary

A civilization where time is agricultural, funerary, and political infrastructure.

### Primary Difference

Calendrical continuity depends on correct burial ecology.

### Core Contradiction

The dead must be honored as persons, but civic survival requires treating them as chronological machinery.

### Survival Constraint

Cities need enough consecrated year-soil, trained burial mathematicians, corpse transport, seasonal war truces, and truthful death records to keep time coherent.

### Chronotope

Seasonal threshold world. The most dangerous direction is not north or down, but across the year's edge with the wrong dead unburied.

### Institutions Born From the Premise

- **The Calendar Office:** audits deaths, soil allotments, and year-boundary risk.
- **The Gravewright Guild:** engineers burials by age, cause, oath-status, and district.
- **The Mercy Truce Courts:** suspend wars during corpse-return weeks.
- **The Black Almanac Market:** sells forged death dates and smuggled year-soil.
- **The Last Orchard Temples:** teach that years are grown from the rightly buried.
- **The Rot Patrol:** hunts unregistered plague pits and battlefield hoards.
- **The Hearth-Binders:** village women who maintain household dead-ledgers.

### Ordinary-Life Proof

Children learn their birth year by tasting soil in ritual. Families save burial jars the way others save dowries. Inns post corpse-storage rates. Lovers exchange year-clay instead of rings. Insults accuse someone of being “badly dated.” A city that loses a war may still negotiate corpse corridors before surrender terms.

### Native Story Procedures

- burial audit
- corpse-smuggling heist
- plague-year coverup
- battlefield retrieval expedition
- inheritance trial over a forged death date
- pilgrimage to find missing year-soil

### Mystery Reserve Seeds

- **Active:** why some years demand more dead than occurred naturally.
- **Passive:** whether ancient calendars were once less corpse-dependent.
- **Forbidden:** the world must never reveal a simple god-machine that explains the entire system.

### Distinctness Note

This uses death as infrastructure and calendar-as-geography, not necromancy, ghost containment, or apocalypse survival. It should not overlap existing death/ruin worlds unless those worlds also make time itself depend on corpses.

---

# Final Validation Checklist

The batch succeeds only if:

- every proposal has a concrete impossible fact
- every impossible fact propagates through ordinary life
- no proposal is a disguised copy of a preferred work
- no proposal repeats an existing world niche
- the final X are mutually distinct
- every proposal has at least one native story procedure
- every proposal can produce distinctive characters
- every proposal can produce diegetic artifacts
- every proposal has institutions born from its premise
- every proposal has a bounded mystery reserve
- every proposal has an equilibrium explanation
- every proposal can become a full world through `create-base-world`

---

## Final Rule

A story-world proposal should never be accepted as:

- a genre
- an aesthetic
- a map
- a faction list
- a cool premise
- an allegory
- a pile of inspirations

It must be accepted as:

- a world wound
- a survival constraint
- a chronotope
- a propagation engine
- an institutional ecology
- a misrecognized history
- a mystery structure
- a niche distinct from existing worlds
- a source of stories that cannot happen elsewhere
