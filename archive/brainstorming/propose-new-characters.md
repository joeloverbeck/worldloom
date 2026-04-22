# Propose new characters

## Purpose

Generate candidate character proposals that expand the world's human/sentient ecology without duplicating niches already occupied by existing characters, artifact-authors, or historically salient personae.

These proposals are not full characters.
They are option cards for the user to review.

Every selected proposal should be ready to feed directly into `character-generation`.

This pipeline is for:
- expanding who can carry stories in the world
- expanding who can author or appear inside diegetic artifacts
- opening new world windows without repeating existing character slots
- building a story-world-wide character web, including characters who may never meet

---

## Boundary with Adjacent Pipelines

### vs `character-generation`

This pipeline proposes a niche and a downstream-ready input packet.

`character-generation` takes one selected proposal and deepens it into a full dossier.

### vs `canon-addition`

This pipeline may identify character concepts that imply missing world facts, but it does not adjudicate those facts.

Any proposal that depends on new:
- institutions
- laws
- taboos
- capabilities
- historical residues
- distribution rules
- access paths

must flag those assumptions explicitly and route them to `canon-addition` before the character is treated as fully canon-supported.

### vs `propose-new-canon-facts`

This pipeline may reveal under-modeled domains through people, but it must not smuggle new canon facts in as settled truth.

Any implied lore beyond current canon must be flagged as:
- derivable from canon already
- assumption needing adjudication
- separate canon proposal

### vs `diegetic-artifact-generation`

This pipeline may identify plausible artifact authors, speakers, censors, patrons, copyists, annotators, and witnesses.

It does not generate the artifact itself.

### vs `emergent-pressure-events`

Pressure events describe what the world is doing.

This pipeline describes who is positioned to:
- suffer that pressure
- enforce it
- profit from it
- misunderstand it
- narrate it
- archive it
- deny it

---

## Core Rule

A character niche is not a profession.

It is a distinct slot in the world-wide character web.

A niche is determined by the combination of:
- world position
- narrative/world function
- pressure engine
- access pattern
- epistemic/perceptual filter
- thematic charge
- voice signature

If existing canon already strongly occupies the same combination, treat that niche as filled.

---

## Inputs

Required:
- current World Kernel
- Invariants
- Canon Ledger
- all existing character files and indexes
- all diegetic artifact metadata records, claim maps, and author profiles
- active pressure-event pool or equivalent world-pressure summary
- Mystery Reserve
- unresolved contradiction list
- desired number of proposals

Optional:
- desired depth mix:
  - emblematic/local
  - recurring
  - protagonist-grade
- target domains to deepen
- taboo areas not to touch
- desired degree of ordinary-life vs exceptional proposals
- desired share of artifact-author candidates
- under-modeled regions, species, institutions, or classes to prioritize
- maximum permitted overlap with existing niches
- preferred story scale:
  - intimate
  - local
  - regional
  - transregional
- whether proposals should be likely to know each other or deliberately belong to separate world-mosaic zones

---

## Output

- existing character niche map
- niche-occupancy-strength map
- vacancy map
- X proposal cards
- pairwise distinctiveness notes
- voice-space notes
- canon-assumption flags
- downstream-ready input packets for `character-generation`

---

## Design Goal

Generate proposals that are:
- canon-safe
- world-produced rather than trope-pasted
- non-redundant
- structurally useful for future stories
- distinct in voice, not just résumé
- useful for diegetic artifact authorship or participation
- distributed across the world rather than clustered in one social niche
- mixed in depth, so the batch includes both memorable local figures and expandable load-bearing characters

---

## Character Essence Model

Treat each existing or proposed character as a multi-layer construct.

### 1. World-Position Layer
- place
- date
- species/body
- age band
- class/social position
- profession or livelihood
- kinship status
- law status
- mobility
- literacy
- institutional embedding

### 2. Function Layer
What work the character does in the world-wide narrative ecology.

Possible functions include:
- world window
- pressure carrier
- pressure enforcer
- gatekeeper
- broker / translator
- witness
- interpreter / misinterpreter
- foil / mirror
- archive or memory carrier
- rumor node
- scale bridge
- catalyst
- local exception

### 3. Pressure Layer
- short-term goal
- long-term desire
- unavoidable obligation
- external pressure
- social fear
- private shame
- central contradiction
- repeated forced choice

### 4. Access Layer
What the character can reach that others cannot.

Check:
- institutions
- archives
- ritual spaces
- trade routes
- taboo zones
- legal processes
- violence
- literacy
- hidden markets
- elite rooms
- common rooms

### 5. Epistemic / Perceptual Layer
- what they know firsthand
- what they know by rumor
- what they cannot know
- what they believe wrongly
- what they notice first
- what they overlook
- what their body/species makes salient
- what categories or distinctions they lack

### 6. Thematic Layer
- what tension they embody
- what value conflict they sharpen
- what false moral simplification they invite
- what part of the world's argument they carry

### 7. Voice Layer
- social language
- idiolect
- rhythm
- metaphor sources
- taboo words or avoidances
- oral register
- written register
- pressure speech
- silence habits

Rule:
Profession alone never closes a niche.

Two characters may share a profession and still occupy radically different niches.
Two characters may differ in profession and still occupy the same niche.

---

## Niche Occupancy Strength

Not every existing persona blocks new proposals with equal force.

### Hard-Occupied
Use when a niche is already held by:
- a formal character file
- a recurring named character
- a fully profiled artifact author or speaker
- a historically salient person with a clear world position, pressure engine, and voice

### Soft-Occupied
Use when a niche is held by:
- an artifact author with partial but distinctive profile
- a dead or offstage figure with strong thematic or institutional presence
- a recurring quoted or remembered figure
- an implied person whose worldview and access are already legible

### Ambient-Occupied
Use when canon contains:
- an office
- a profession
- a caste
- a social type
- a named but non-individuated role

Rule:
Ambient occupancy does not close a niche.
It usually marks the exact space where a character is needed.

---

## Memorability Modes

Do not make every proposal maximally deep.

A world-scale batch needs different memorability modes.

### Emblematic
Built around one governing principle or pressure.
Best for:
- local color
- unforgettable minor roles
- artifact narrators
- social texture

### Elastic
Has a clear governing principle plus a strong counterpressure.
Best for:
- recurring side characters
- foils
- institutional contrasts
- pressure witnesses who can expand later

### Round / Load-Bearing
Can surprise convincingly under pressure without feeling false.
Best for:
- protagonists
- major recurring actors
- long-form scene engines
- story-kernel anchors

Rule:
A good batch contains more than one mode.

---

## Phase 0: Normalize the Request

Determine:
- proposal count X
- desired spread vs desired focus
- whether the world is currently character-sparse or character-dense
- whether the user wants mostly ordinary-life lenses, exceptional operators, or a mix
- whether artifact authorship is a priority
- whether the batch should mostly open new world windows or sharpen contrast around existing ones

### Density Rule

If the world is character-sparse:
- prioritize anchor characters for under-modeled domains
- establish strong contrasts early
- avoid overfitting to a single region or institution

If the world is character-dense:
- prioritize negative space
- avoid crowded niches
- prefer contrastive or bridge figures over more local duplication

---

## Phase 1: Build the Canonical Person Registry

Construct a single registry of all person-like entities that may already occupy narrative space.

Include:
- formal character files
- diegetic artifact authors
- attributed speakers
- correspondents
- scribes, annotators, censors, patrons, and copyists
- historically salient named figures
- recurring remembered or quoted figures
- offstage figures with strong narrative gravity

Track for each:
- source type
- occupancy strength
- scope
- whether living, dead, mythologized, or uncertain
- whether the figure has a stable voice, worldview, or institutional position already

Rule:
A sermon writer with a clear ideology, access pattern, and speech register is already occupying a niche even if no formal character file exists.

---

## Phase 2: Derive Existing Character Essence Profiles

For every registry entry, produce an essence profile.

### Mandatory Fields

- attention weight:
  - lead
  - recurring
  - local
  - historical
  - artifact-only
- depth class:
  - emblematic
  - elastic
  - round/load-bearing
- world position
- institutional embedding
- function layer
- pressure layer
- access layer
- epistemic/perceptual layer
- thematic layer
- voice layer
- artifact affordance
- likely story scale
- nearest mirrors or foils already in canon

### Institutional Embedding Checklist

Specify relation to:
- household / kin / clan
- law
- religion
- employer / guild / lord / state
- debt
- taboo system
- education / apprenticeship
- inheritance
- policing or violence structures

### Capability Validation

For each existing character, ask:
- how did they learn this?
- what did it cost?
- what institution enabled it?
- why is it ordinary or unusual?
- what bodily or species constraints shape it?

Rule:
Do not compare future proposals against vague impressions.
Compare them against formalized essence profiles only.

---

## Phase 3: Build the Story-World Character Web

Build a world-wide character web, not just a plot cast list.

Use two forms simultaneously:

### A. Constellation View
Characters linked by:
- kinship
- patronage
- rivalry
- debt
- mentorship
- desire
- conflict
- co-presence
- contrast
- moral opposition
- thematic analogy

### B. Mosaic View
Characters linked even if they never meet, through:
- shared institutions
- shared trade routes
- same species pressure
- same border or geography type
- same taboo system
- same relic economy
- same war residue
- same archive chain
- same artifact circulation
- same rumor ecology
- mirrored contradictions in different regions

Required outputs:
- dense clusters
- isolated domains
- overrepresented clusters
- monopoly windows:
  - domains visible through only one character
- mosaic mirrors:
  - separated characters occupying parallel social or thematic positions

Rule:
Characters need not know each other to compete for the same story-world niche.

---

## Phase 4: Determine Filled, Crowded, and Open Niches

For each existing character, create a niche signature from the core layers.

Then classify possible future spaces as:
- filled
- crowded
- adjacent
- open

### Hard Duplicate

Treat a proposal as a hard duplicate when it substantially matches an existing character on:
- function layer
- world position and institutional relation
- pressure layer
- access layer
- epistemic/perceptual layer
- voice family

### Crowded Niche

Use when several characters already reveal the same world window from similar pressure and voice positions.

### Adjacent Niche

Use when the proposal shares a domain with an existing character but differs in:
- function
- power relation
- pressure engine
- perception
- voice
- thematic charge
- artifact affordance

### False Duplicate

Never reject a proposal solely because it shares:
- profession
- species
- region
- age band
- gender
- religious alignment

These are surface overlaps, not decisive overlaps.

### Optional Formal Similarity Heuristic

Use a weighted comparison if helpful:

- function and relation to pressure: 25%
- world position and institution: 20%
- pressure engine: 20%
- access pattern: 15%
- epistemic/perceptual filter: 10%
- voice signature: 10%

Suggested thresholds:
- 0.75+ = probable duplicate
- 0.55-0.74 = crowded niche
- 0.35-0.54 = adjacent niche
- below 0.35 = usually distinct

Rule:
Never use the score without human-readable justification.

---

## Phase 5: Run Negative-Space Diagnosis

This is the key generative phase.

Ask:
- which institutions exist without insiders?
- which institutions exist without dissenters, corrupters, victims, or enforcers?
- which regions lack local voices?
- which classes exist only as abstractions?
- which species exist but do not yet think differently on the page?
- which age bands or kinship positions are missing?
- which pressures lack witnesses, profiteers, healers, deniers, translators, or archivists?
- which themes are monopolized by one character only?
- which artifact genres lack plausible authors?
- which knowledge systems lack representatives?
- which perceptual filters are absent?
- which voice families are absent?
- which border positions are absent?
- which ordinary labor systems still have no character lens?

Rule:
Negative space is not "who is cool."
It is "who must exist if this world is real, but is still missing from the cast."

---

## Phase 6: Generate Proposal Seeds

Generate at least 3X to 5X seeds before selecting the final X.

Use multiple proposal families.

High-yield families include:
- institution insider
- institution dissenter
- ordinary-life witness
- boundary broker / translator
- taboo technician
- gatekeeper
- black-market adapter
- pressure enforcer
- pressure sufferer with unusual clarity
- archive / memory carrier
- ideological misinterpreter
- regional mirror
- species/body-specific specialist
- artifact-native author
- historical residue carrier
- scale bridge

Rule:
Prefer seeds that reveal existing world pressure over seeds that merely add eccentricity.

---

## Phase 7: Build the Character Engine for Each Seed

For each seed, specify:

- short-term goal
- long-term desire
- unavoidable obligation
- external pressure
- public mask
- private appetite
- social fear
- private shame
- central contradiction
- capability path
- cost of competence
- relation to law, taboo, and debt
- repeated forced choice

### Forced-Choice Rule

Every strong proposal must answer:
"What choice does this person get forced into again and again by the world?"

Examples:
- duty vs appetite
- loyalty vs evidence
- kinship vs law
- purity vs survival
- ambition vs bodily limit
- profit vs contamination
- belief vs observed reality
- local belonging vs mobility
- secrecy vs intimacy

Rule:
A proposal without repeatable choice pressure is not yet a character niche.
It is only a biography fragment.

---

## Phase 8: Build the Epistemic and Perceptual Filter

For each seed, define:

- what they know firsthand
- what they know only through rumor or authority
- what they can never know directly
- what they believe firmly but wrongly
- what terms they use for major phenomena
- what distinctions or categories they lack
- what they notice first in a room
- what they scan for under stress
- what they consistently overlook
- what shame, trade, training, or trauma makes newly visible to them
- what bodily/species traits shape sensory emphasis, spatial awareness, vulnerability, tempo, or comfort

Rule:
"Notices first" and "overlooks" must arise from body, work, fear, and environment.
They must never be random flavor.

---

## Phase 9: Build the Voice Signature

Model voice on multiple levels.

### Social Language
Define:
- class markers
- region markers
- age or generation markers
- profession jargon
- religious or ideological diction
- politeness logic
- honorific logic
- swearing logic

### Idiolect
Define:
- favorite words
- favorite sentence shapes
- compression vs rambling
- assertive vs hedged
- literal vs figurative
- clipped vs musical
- interruption habits
- repair habits
- pacing

### Metaphor Sources
Define what domains they draw comparisons from:
- weather
- animals
- ritual
- machinery
- bureaucracy
- farming
- trade
- sickness
- warfare
- family
- navigation
- craft labor

Also define:
- what metaphor domains never appear in their speech
- what words or ideas they avoid on purpose

### Pressure Speech
How do they sound when:
- lying
- persuading
- threatening
- teaching
- begging
- grieving
- hiding ignorance
- performing status
- writing formally
- writing privately

### Oral / Written Split
If literate, distinguish:
- speech voice
- formal writing voice
- intimate writing or prayer voice
- public testimony voice

### Voice Rules

Do not rely on accent spelling as the primary differentiator.

Do not make all characters speak the writer's voice.

Do not make voice a set of catchphrases only.

Voice must be recognizable through:
- word choice
- rhythm
- motive
- conceptual habits
- taboo/avoidance
- in-scene intent

### Mandatory Voice Tests

- swap test:
  could another character say this unchanged?
- motive test:
  is the character saying what they want to say, or what exposition needs said?
- mode test:
  does the speech mode match the character's emotional and strategic state?
- quote test:
  if dialogue tags vanish, is the likely speaker still inferable?
- artifact-author test:
  would the same person still be recognizable in a letter, decree, marginal note, prayer, report, or confession?

Rule:
No two final proposals should share the same voice family unless deliberate contrast within the same institution or kin group is the point.

---

## Phase 10: Check Canon Safety and Lore Load

A strong character proposal must be world-embedded without silently rewriting the world.

For each proposal, tag:

### Canon-Safe
Everything is derivable from current canon.

### Canon-Edge
The proposal is plausible but leans on interpretation, distribution assumptions, or lightly implied lore.

### Canon-Requiring
The proposal implies a new fact, institution, capability, law, taboo, resource pattern, or historical residue that should be separately adjudicated.

Also check:
- invariant conformance
- mystery reserve protection
- mobility plausibility
- literacy plausibility
- capability plausibility
- institution access plausibility
- whether the proposal knows too much
- whether the proposal resolves mystery by existing

If a proposal is `canon-requiring`, list each implied fact separately and mark the preferred route:
- direct to `canon-addition`
- first through `propose-new-canon-facts` if the implication is better expressed as a more formal world-fact proposal

Rule:
A character may hold false beliefs.
A proposal may not contain untagged new world truths.

---

## Phase 11: Score and Select

After seed generation and deepening, score each candidate on:

- world-rootedness
- niche distinctiveness
- pressure richness
- voice distinctiveness
- ordinary-life relevance
- artifact utility
- thematic freshness
- expansion potential
- canon burden
- overlap risk

### Pairwise Distance Axes

Compare candidates against both:
- existing characters
- other new candidates

Across at least these axes:
- geography
- institution
- species/body
- relation to power
- pressure cluster
- knowledge access
- perception filter
- voice family
- artifact affordance
- likely story scale

### Selection Rule

Do not pick the final X by raw total score alone.

Use max-min selection:
1. take the highest-value viable seed first
2. for each next choice, prefer the candidate with the best combination of:
   - quality score
   - minimum distance from already selected proposals
   - minimum redundancy with existing canon
3. continue until X proposals are selected

Rule:
A slightly lower-scoring proposal may be preferable if it opens a genuinely new world window.

---

## Phase 12: Filter Out Bad Proposals

Reject any candidate that:
- differs only cosmetically from an existing character
- is just a profession clone
- is just a moral inversion of an existing character
- exists only to dump lore
- bypasses world constraints
- has no institutional embedding
- has no ordinary-life reality
- has no repeatable choice pressure
- speaks in generic author voice
- would write the same artifacts as an existing character with no new angle
- duplicates the same pressure cluster and voice family as another selected proposal
- requires massive new canon for little gain
- turns species or body into costume only

---

## Phase 13: Diversify the Final Batch

A world-scale proposal batch should feel like a real social field, not a line of alternate protagonists.

When X is large enough, the final set should usually include a mix such as:
- one ordinary-life lens
- one institution insider
- one boundary broker
- one pressure enforcer or gatekeeper
- one sufferer or witness with low formal power
- one artifact-native author
- one ideological misreader or dissenter
- one regionally distant mosaic figure
- one body/species-differentiated lens
- one potentially load-bearing round character

Also vary:
- elite vs common
- settled vs mobile
- literate vs oral
- orthodox vs heterodox
- lawful vs illicit
- old vs young
- kin-tied vs socially detached
- local vs transregional

Rule:
At least some proposals should be mirrors or foils of existing characters.
At least some should belong to entirely separate mosaic zones.

---

## Phase 14: Write Proposal Cards

Each final proposal card must contain:

- proposal ID
- title
- niche summary
- why this niche is open
- occupancy strength:
  - open against what
  - nearest existing occupants
  - overlap type
  - decisive differences
- depth class:
  - emblematic
  - recurring
  - round/load-bearing

### Downstream-Ready Input Packet for `character-generation`

Required fields:
- place
- date
- species
- age band
- social position
- profession or livelihood
- kinship situation
- religious / ideological environment
- major local pressures
- intended narrative role

Optional but strongly recommended:
- central contradiction
- desired emotional tone
- desired arc type
- taboo or limit themes to avoid

### Essence Packet

- short-term goal
- long-term desire
- unavoidable obligation
- external pressure
- public mask
- social fear
- private shame
- capability notes
- institutional embedding
- access pattern
- epistemic limits
- perception filter
- voice signature
- artifact authorship potential
- likely story hooks
- canon-assumption flags

### Distinctiveness Packet

- nearest existing characters
- why it is not redundant
- what world window it opens
- what story scales it supports
- what future artifacts it could author or distort
- whether it is better as:
  - immediate generation
  - reserved future seed
  - generation after canon adjudication

---

## Phase 15: Final Validation

Reject or revise the batch if any of the following are true:

- most proposals belong to the same institution, class, or region
- most proposals use the same voice family
- all proposals are protagonist-grade and none are emblematic or elastic
- all proposals are exceptional and ordinary life remains blank
- species or body differences are cosmetic
- the same pressure is repeated without new angle
- artifact authorship remains narrow
- all proposals are likely to know each other and no mosaic spread exists
- proposals silently create canon
- the world still has only one lens on major institutions or pressures

---

## Output Schema

proposal_id: NCP-0012
title: Marsh Toll Confessor
niche_summary: >
  A ferryman-priest stationed at a levy crossing who hears confession,
  logs contraband rumors, and has become the unofficial broker between
  tax law, folk piety, and smuggling families.
occupancy_strength:
  current_state: open
  nearest_existing_occupants:
    - DA-author with ritual-purity voice only
    - regional magistrate with no river access
  overlap_type: adjacent
  decisive_differences:
    - low-status local mobility
    - hybrid ritual and tax access
    - confession-based rumor intake
depth_class: elastic
character_generation_packet:
  place: South Marsh Levy Stations
  date: Year 412 After Flood
  species: human
  age_band: late thirties
  social_position: low chartered cleric
  profession_or_livelihood: ferry toll priest and record-keeper
  kinship_situation: widowed with dependent niece
  religious_ideological_environment: temple traditionalist under frontier compromise
  major_local_pressures:
    - smuggling expansion
    - flood-season shortages
    - pressure from tax collectors
    - local distrust of temple oversight
  intended_narrative_role: broker, witness, compromised moral filter
  central_contradiction: believes order prevents suffering but survives by tolerating selective lawbreaking
essence_packet:
  short_term_goal: prevent an inspection from exposing his informal deals
  long_term_desire: be transferred inland and regain ritual respectability
  unavoidable_obligation: keep the crossing functioning for both villagers and temple revenue
  external_pressure: rival officials want the crossing cleaned up
  public_mask: patient servant of law and mercy
  social_fear: being named corrupt by both smugglers and clergy
  private_shame: took temple vows after abandoning a drowning victim years ago
  capability_notes:
    - literate in formal registers
    - excellent memory for kin networks
    - poor open-water confidence
  institutional_embedding:
    - temple charter
    - tax office dependence
    - marsh kin obligations through marriage
  access_pattern:
    - hears confessions
    - sees cargo manifests
    - knows flood paths
  epistemic_limits:
    - knows local corruption well
    - understands almost nothing of capital politics
  perception_filter:
    notices_first:
      - waterline marks
      - hidden weight in cargo
      - who avoids eye contact
    overlooks:
      - elite symbolic disputes
      - distant theological nuance
    body_species_effects:
      - scarred leg makes current and mud depth constantly salient
  voice_signature:
    social_language:
      - temple formulae frayed by river slang
    idiolect:
      - answers questions indirectly, then lands on blunt practical phrasing
    metaphor_fields:
      - current, silt, snag, drift, ledger balance
    rhythm:
      - patient clauses followed by hard verdict
    taboo_words:
      - avoids saying "clean" about people
    oral_written_split:
      - speech is evasive, records are unnervingly exact
  artifact_authorship_potential:
    - toll ledgers
    - devotional notices
    - private warning letters
    - witness statements
  likely_story_hooks:
    - inspection week
    - relic hidden in grain barge
    - niece courted by a smuggler family
  canon_assumption_flags:
    status: canon-edge
    reasons:
      - assumes confession is used informally for rumor flow
    preferred_routing:
      - safe to generate if the assumption remains marked
      - route to canon-addition if this practice is meant to be wider than local custom
recommended_next_step: generate immediately

---

## Mandatory LLM Roles

Run the pipeline through at least these passes:

- Continuity Archivist
- Character Essence Extractor
- Constellation / Mosaic Analyst
- Institutional and Everyday-Life Critic
- Epistemic / Focalization Critic
- Sociolinguistic Voice Critic
- Artifact Authorship Critic
- Theme / Tone Critic

Then synthesize.

---

## Success Condition

The batch succeeds if the world gains:
- more distinct human or sentient presence
- more social and institutional coverage
- more voice diversity
- more artifact authorship possibilities
- more pressure-bearing lenses
- more contrasts and mirrors
- more room for future story kernels

without losing canon discipline.

---

## Final Rule

No character proposal should ever be accepted as:
- a trope
- a profession
- a biography fragment
- a cool voice
- an exposition device

It must be accepted as:
- a world position
- a pressure engine
- a relation slot
- a perceptual filter
- a voice
- a canon-safe access pattern
- a future source of scenes, artifacts, and misunderstandings