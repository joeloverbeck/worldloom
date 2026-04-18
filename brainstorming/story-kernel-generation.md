# Story kernel generation

## Purpose

Generate ranked story kernels from the current world state.

This pipeline should produce story seeds that:
- emerge from canon rather than from imported plot templates
- arise from world pressures, institutions, embodiment, and artifacts
- could only happen in this story world
- preserve canon safety unless deliberate new canon is proposed
- hand off cleanly to premise, spine, and architecture generation

This pipeline is for:
- short story seeds
- novella seeds
- novel seeds
- questline seeds
- linked artifact cycles
- story ideas derived from new or existing characters

This pipeline is not for:
- repainting generic plots with lore nouns
- generating “interesting events” with no causal depth
- stealth canon creation
- mystery collapse

This document is intentionally standalone and repeats repository assumptions on purpose.

---

## Core Rule

Do not begin with plot template.

Begin with a world-specific disequilibrium.

A story kernel is acceptable only when:
- a local norm is breached
- the breach matters in this world
- at least one world-embedded character is forced into incompatible action
- the consequences can propagate beyond the immediate incident
- multiple future paths are now possible, and not all can coexist

---

## Design Goal

Treat the story world as a possibility space, not a backdrop.

A strong story kernel should arise from:
- ontology
- geography and chronotope
- institutions
- ordinary life
- taboo and law
- resource distribution
- history and residue
- pressure systems
- character contradiction
- artifact bias and partial knowledge
- bounded mystery

The system should not ask, “What would be a cool plot here?”

It should ask, “What breach of order is this world already trying to produce?”

---

## Definitions

### Story Kernel
The smallest irreversible, consequence-bearing breach in the current world state that opens competing futures.

A good story kernel contains:
- a world-specific norm or equilibrium
- a disruptive event, discovery, or collision
- a character or character-set under incompatible pressures
- a causal question
- a consequence web

### Story Possibility Map
A current-state map of:
- what is ordinary
- what is rare
- what is impossible
- what is fragile
- what is under pressure
- who knows what
- what routines are vulnerable
- what mysteries can safely be touched

### Tellability
The degree to which an event becomes worth narrating because it is:
- relevant
- unpredictable in local context
- consequential
- partly irreversible

### Story Yield
How much usable narrative can be generated from the kernel:
- scenes
- reversals
- relationship changes
- institutional reactions
- artifact leverage
- aftermath

---

## Required Inputs

### World Inputs
- `WORLD_KERNEL.md`
- `INVARIANTS.md`
- `CANON_LEDGER.md`
- `MYSTERY_RESERVE.md`
- relevant domain files
- recent change log
- unresolved contradiction list

### Dynamic World Inputs
- current pressure systems
- active institutions
- unresolved conflicts
- current date / season / period
- recent canon additions
- latest emergent pressure event cards

### Character Inputs
- candidate character dossiers
- obligation maps
- belief maps
- capability maps
- fear / desire maps
- contradiction maps

### Artifact Inputs
- available diegetic artifacts
- artifact claim maps
- artifact truth-status maps
- narrator limitations
- known contradictions between artifacts

### Story Intent Inputs
Optional:
- desired scale: short story / novella / novel / questline
- desired dominant mode: epic / epistemic / dramatic / hybrid
- desired emotional tone
- taboo themes to avoid
- desired secrecy level
- desired degree of canon impact

---

## Outputs

- `STORY_POSSIBILITY_MAP`
- candidate story kernel cards
- four-lens evaluation for each kernel
- “only in this world” test results
- kernel score table
- ranked top 3 finalists
- finalist expansion notes
- kernel selection memo for the next pipeline stage

---

## Phase 0: Build the story possibility map

Before generating ideas, define the current storyable space.

### Extract

From the current world state, build:

- what is ordinary here
- what is rare here
- what is impossible here
- what institutions actively enforce
- what institutions fail to enforce
- what people widely believe
- what is true but not widely known
- what pressures are already unstable
- what hidden contradictions exist between domains
- what daily-life routines are vulnerable
- what mysteries can be touched safely
- what mysteries must remain protected
- what recent canon changes have not yet fully propagated

### Output Structure

The `STORY_POSSIBILITY_MAP` must include:

- local normalities
- known fragilities
- active conflict lines
- current opportunity structures
- knowledge asymmetries
- taboo tripwires
- under-updated consequences
- artifact contradiction clusters
- ordinary routines most exposed to disruption

### Rule

A story kernel cannot be generated from “coolness.”

It must be generated from pressure inside this map.

---

## Phase 1: Harvest latent story matter

Generate candidate matter from five source families.

### 1. Pressure Collision
Two existing pressures collide.

Examples:
- scarcity vs ritual law
- kinship duty vs civic order
- migration vs local taboo
- relic value vs contamination control
- trade need vs species embodiment limit
- climate event vs inheritance system

### 2. Character Contradiction
A character’s desire, shame, obligation, or false belief becomes unsustainable under current conditions.

High-yield triggers:
- they need what the world forbids them to access
- their institution demands mutually incompatible duties
- their private belief is about to meet contrary evidence
- their bodily limits make ordinary solutions fail
- their status gives responsibility without power
- their power creates danger they cannot publicly admit

### 3. Artifact Discrepancy
An existing in-world text, manual, decree, chronicle, sermon, confession, or travelogue does not line up cleanly with present reality.

High-yield artifact functions:
- clue
- provocation
- ideological weapon
- forged proof
- legal warrant
- ritual instruction
- false map
- suppressed testimony
- misunderstood practical manual

### 4. Historical Residue Activation
Something from the past becomes active again in the present.

Good triggers:
- old roads
- burial systems
- dynastic claims
- ruined infrastructure
- archived law
- old species-boundary practices
- earlier quarantines
- prior war logistics
- ritual calendars

### 5. Canon Edge / Mystery Edge Contact
A current event brushes against a protected unknown without fully resolving it.

This is especially valuable because it creates depth without flattening the world.

---

## Phase 2: Generate story kernel cards

For each harvested matter, generate a kernel card.

### Story Kernel Card Template

- **Kernel ID**
- **Kernel Sentence**
- **Origin Type**
  - pressure collision / character contradiction / artifact discrepancy / residue activation / mystery-edge contact
- **Current Norm Being Broken**
- **What Actually Happens**
- **Why This Matters Here**
- **Who Feels It First**
- **Who Benefits**
- **Who Suffers**
- **What Institution Must Respond**
- **What Ordinary-Life Routine Is Disturbed**
- **What Future Paths Open**
- **What Makes This Tellable**
- **What Makes This Non-Portable**
- **Artifact Involvement**
- **Mystery Touched**
- **Canon Risk**
- **Initial Story Yield Estimate**

### Kernel Generation Formula

Use:

world-specific normality  
+ disruptive breach  
+ actor under incompatible knowledge / desire / obligation  
+ immediate consequence  
+ larger unanswered consequence

### Rule

Every kernel must include a visible consequence outside the protagonist’s feelings.

If the world would not visibly react, the kernel is weak.

---

## Phase 3: Pass every kernel through four story lenses

Do not evaluate kernels once only.

Interrogate each kernel through four lenses.

### Epic Lens
Ask:
- Does this force movement through hostile space?
- Does the world itself become opponent, trial field, or route logic?
- Does survival, travel, extraction, escort, or return become central?

### Epistemic Lens
Ask:
- What is unknown?
- Who wants to know?
- What evidence exists?
- Which books, chronicles, decrees, relic manuals, or witness accounts matter?
- What false explanations currently dominate?

### Dramatic Lens
Ask:
- Which relationships mutate?
- Which alliances become unstable?
- Which duty bonds, intimacies, rivalries, lineages, or patronage ties are strained?

### Artifact Lens
Ask:
- Is an in-world text causing the event, misframing it, hiding it, or preserving distorted truth?
- Could the story be structured around reading, misreading, translating, disputing, stealing, or suppressing an artifact?

### Output

Each kernel gets:
- dominant mode
- secondary mode
- likely reader pleasure
- likely architecture pressure
- likely protagonist type
- likely public/private stake balance

---

## Phase 4: Run the “only in this world” test

This is the most important filter.

Reject kernels that survive too easily after superficial renaming.

### Mandatory Tests

#### Test 1: Invariant Dependence
Does the kernel depend on at least one core invariant?

#### Test 2: Institutional Dependence
Does the kernel require a specific institution, law, taboo, office, profession, or governance form?

#### Test 3: Material Dependence
Do geography, climate, infrastructure, resource distribution, travel speed, disease ecology, or architecture matter?

#### Test 4: Embodiment Dependence
Would species body, movement, sense profile, lifespan, fertility pattern, bodily taboo, or injury profile alter the logic?

#### Test 5: Historical Dependence
Does the present conflict depend on residue from this world’s past?

#### Test 6: Artifact Dependence
Could at least one key reveal, misdirection, authority claim, or legal action emerge from a diegetic artifact that belongs to this world?

#### Test 7: Ordinary-Life Dependence
Would an ordinary laborer, child, priest, craftsperson, smuggler, or official understand why this matters?

### Hard Rejection Rule

Reject any kernel that can be restated as:
- generic chosen-one plot
- generic murder mystery
- generic rebellion plot
- generic romance with fantasy wallpaper
- generic expedition story
- generic succession struggle

unless the world-specific dependencies materially transform the causal logic.

---

## Phase 5: Score and rank kernels

Use a scoring grid from 1-5.

### Required Scores

- **World-Specificity**
- **Tellability**
- **Consequence Load**
- **Character Pressure**
- **Artifact Leverage**
- **Institutional Depth**
- **Ordinary-Life Relevance**
- **Mystery Preservation**
- **Canon Safety**
- **Scene Yield**

### Selection Rule

Choose the top 3 kernels, not the top 1.

Then expand all 3 one level further before selecting the final story.

This prevents locking too early onto the first flashy idea.

---

## Phase 6: Expand the top 3 finalists

For each finalist, produce a deeper note bundle.

### Required Expansion Fields

- likely protagonist candidates
- likely primary opponent or opposing force
- likely helper types
- likely public stakes
- likely private stakes
- first probable consequence wave
- first probable misreading
- likely plot-family fit
- artifact leverage note
- continuity risk note
- whether the kernel wants short form or long form

### Rule

A finalist should already imply:
- pressure
- cost
- reversals
- aftermath

If it only implies “interesting mood,” it is not ready.

---

## Rejection Conditions

Reject a kernel if:
- it requires unsupported new canon to become interesting
- it resolves a protected mystery by accident
- it creates no visible reaction outside the protagonist
- it matters only because the summary says it matters
- it depends on coincidence rather than world pressure
- it could happen almost unchanged in a different world
- it adds lore but not narrative force
- it bypasses institutions, embodiment, or ordinary life

---

## Output Bundle Template

```yaml
kernel_batch_id: SK-0004
story_possibility_map_summary:
  normalities:
    - ...
  fragilities:
    - ...
  active_conflict_lines:
    - ...
ranked_kernels:
  - kernel_id: K-01
    kernel_sentence: ...
    origin_type: pressure_collision
    dominant_mode: dramatic
    secondary_mode: epistemic
    world_specificity: 5
    tellability: 4
    consequence_load: 5
    artifact_leverage: 3
    canon_safety: 4
    finalist: true
top_3_finalists:
  - K-01
  - K-04
  - K-07
handoff_note:
  next_stage_must_determine:
    - protagonist center
    - actant map
    - private-world collisions
    - premise
    - designing principle
```

---

## Acceptance Tests

This pipeline succeeds only if all of these are true.

### Story-Specificity Tests
- remove the world’s key institutions and the kernel collapses
- remove the world’s key embodiment rules and the kernel changes materially
- remove the world’s history and the kernel loses motive or structure
- remove the artifacts and at least one turning point disappears

### Eventfulness Tests
- a local norm is visibly breached
- someone must react
- at least two futures now compete
- the breach is partly irreversible
- the summary implies sceneable action, not just lore

### World Tests
- ordinary life matters
- institutions matter
- geography matters
- time matters
- mystery remains bounded, not dissolved

### Canon Tests
- no stealth canon creation
- no contradiction with invariants
- no diegetic leakage
- no local/global drift

---

## Mandatory LLM Roles

Run the kernel batch through at least these critics:

- Storyworld Specificity Critic
- Eventfulness / Tellability Critic
- Character Pressure Critic
- Artifact Critic
- Mystery Curator
- Continuity Critic

Then synthesize.

Do not rely on one undifferentiated pass when avoidable.

---

## Where This Pipeline Stops

This pipeline stops when it has:
- a ranked kernel batch
- top 3 finalists
- finalist expansion notes
- a clear handoff package for premise and spine generation

It does not yet choose the final premise, designing principle, or milestone architecture.

---

## Final Rule

A story idea must never be accepted as a sentence only.

At the repository level, it is only ready when it exists as:
- a kernel
- a world-specificity proof
- a pressure web
- an actant map
- a premise
- a designing principle
- a spine
- a milestone architecture
- a consequence map
- a scene handoff bundle

This document governs the first part of that chain, not the whole of it.