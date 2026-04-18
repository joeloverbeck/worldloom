# Diegetic artifact generation

## Purpose

Generate in-world texts and artifacts that feel native to the story world rather than explanatory appendices.

Applies to:
- short in-world books
- chronicles
- sermons
- travelogues
- legal decrees
- funerary inscriptions
- battle songs
- herbals
- fragmentary myths
- prison confessions
- scholarly disputes
- manuals
- letters
- folk tales
- cult tracts

This pipeline is for diegetic output, not canon creation by stealth.

---

## Core Rule

An in-world text is not a direct voice of the setting.

It is a voice from within the setting.

Therefore every artifact must be constrained by:
- author identity
- date
- place
- audience
- motive
- ideology
- education
- fear
- access to knowledge
- censorship
- genre convention
- material form

---

## Inputs

Required:
- artifact type
- date in world history
- place of production
- author or attributed author
- intended audience
- communicative purpose
- canon facts accessible to this author at this date
- taboo / censorship conditions
- desired relation to truth:
  - accurate
  - biased but mostly true
  - propaganda
  - mythicized
  - fragmentary
  - deliberately false in places

Optional:
- desired length
- emotional tone
- rhetorical style
- level of ornament
- whether the text should seed mysteries
- whether the text should contradict another artifact

---

## Output

- artifact text
- metadata record
- claim map
- truth-status map
- canon links
- list of what the artifact cannot know

---

## Phase 0: Author Reality Construction

Create the author as a world-embedded agent.

Define:
- species
- age
- sex/gender if relevant
- class
- literacy level
- profession
- religious alignment
- political dependency
- bodily limitations
- trauma history if relevant
- geographic mobility
- access to archives
- access to rumor
- access to forbidden knowledge
- speech register
- likely blind spots

Rule:
No omniscient artifact authors unless the artifact itself is a divine or impossible object and the world permits that.

---

## Phase 1: Epistemic Horizon

Determine what this author can:
- know directly
- infer plausibly
- repeat secondhand
- get wrong
- intentionally conceal
- never know

Tag all candidate claims under:
- witnessed
- learned from authority
- inherited tradition
- common rumor
- contested scholarship
- impossible for this narrator to verify

This phase prevents lore dumping.

---

## Phase 2: Genre Convention Pass

Each artifact type has built-in conventions.

Examples:

### Chronicle
- dates
- dynasties
- battles
- official framing
- elite perspective
- selective omission

### Sermon
- moralized causality
- authority performance
- repetition
- condemnation / reassurance
- metaphor over precision

### Travelogue
- sensory detail
- outsider misunderstanding
- exaggeration
- comparison to home
- trade gossip

### Herbal / Practical Manual
- utility bias
- regional specificity
- inaccuracies that survive because they are "good enough"
- craft vocabulary
- omission of elite metaphysics unless locally relevant

### Myth / Folk Tale
- symbolic compression
- repetition
- formulaic pattern
- truth hidden in impossibility

---

## Phase 3: Claim Selection

Build a list of claims the artifact may contain.

For each claim, mark:
- truth status in world canon
- narrator's believed truth status
- source of narrator's knowledge
- risk of contradiction
- whether the claim is direct, implied, or symbolic

Truth statuses:
- canonically true
- canonically false
- partially true
- contested
- mystery-adjacent
- prohibited for this artifact

---

## Phase 4: Material and Social Texture

Embed the text in world texture.

Choose details from:
- local measurements
- proper names
- food
- weather
- tools
- ritual gestures
- insults
- honorifics
- legal phrases
- body metaphors
- architecture
- animal references
- smells, stains, fabrics, writing surfaces
- local calendrical markers
- class markers in diction

Rule:
Do not add texture randomly.
Texture should imply the world.

---

## Phase 5: Bias and Distortion Pass

Every artifact should carry worldview pressure.

Add:
- what the author omits
- what the author overstates
- what the author moralizes
- what the author cannot imagine otherwise
- what audience expectations shape the text
- what institution the author must flatter or fear

This is where the text becomes alive.

---

## Phase 6: Truth Discipline

Run two simultaneous checks.

### World-Truth Check
Does the artifact accidentally state impossible objective facts without justification?

### Narrator-Truth Check
Given the author, date, and context, would this person plausibly say this?

A text may be false in-world yet excellent if it is false correctly.

---

## Phase 7: Canon Safety Check

The artifact must not:
- silently create new canon
- resolve a protected mystery accidentally
- reveal restricted knowledge to the wrong narrator
- contradict current canon unless that contradiction is intentional and tagged diegetic
- generalize local custom as world law unless the author would plausibly make that mistake

---

## Phase 8: Metadata Record

Every artifact must generate a companion metadata entry.

```yaml
artifact_id: DA-0031
title: On the Salting of Noble Graves
artifact_type: practical_treatise
author: Heren son of Vask
date: Year 412 After Flood
place: Port Serekh
audience: junior grave wardens
author_profile:
  class: hereditary specialist
  literacy: trained
  ideology: ritual-purity traditionalist
  political_dependency: temple charter
epistemic_horizon:
  direct_knowledge:
    - grave preparation
    - contamination signs
  indirect_knowledge:
    - old relic lore
  impossible_knowledge:
    - true origin of buried artifacts
claim_map:
  - claim: Salt delays corruption spread in opened graves.
    canon_status: partially_true
    narrator_belief: true
  - claim: The impure dead rise only when offended by kin.
    canon_status: false
    narrator_belief: true
canon_links:
  - CF-0201
  - CF-0222
mystery_protection:
  - does_not_resolve_artifact_origin
```

---

## Artifact Quality Checklist

The artifact succeeds if:
- it sounds like it came from inside the world
- it reveals both world facts and world misunderstandings
- it has motive
- it contains selective specificity
- it does not read like a wiki summary
- it can coexist with other artifacts that disagree

---

## Special Rule for Lore-Rich RPG-Style Books

Aim for one of these effects:
- practical specificity that implies a wider world
- ideological slant that reveals institutions
- fragmentary witness that hints at larger horrors
- scholarly certainty undermined by subtle error
- anecdote that implies an unseen system
- myth that preserves distorted truth

Do not aim for:
- total explanation
- neutral omniscience
- exhaustive setting summaries disguised as prose

That is dead writing.

---

## Final Rule

A diegetic artifact should increase:
- texture
- plurality of perspective
- mystery
- historical depth
- implied world size

without compromising canon control.