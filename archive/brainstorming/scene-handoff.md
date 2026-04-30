# Scene handoff

## Purpose

Convert approved story architecture into scene-level instruction cards.

This pipeline should produce a complete scene handoff package such that prose writing can begin without further structural invention.

It should generate:
- ordered scene handoff cards
- scene-to-milestone map
- POV schedule
- world-detail obligations
- artifact touchpoint map
- continuity constraints
- carry-forward questions between scenes

This document is intentionally standalone and repeats repository assumptions on purpose.

---

## Core Rule

A scene is a state change under pressure.

It is not:
- a lore container
- an atmosphere block
- a conversation that changes nothing
- a summary of what the writer already knows

Every scene must do at least three jobs:
- advance causality
- reveal character through pressure
- reveal world through consequence

If a scene does only atmosphere, cut it or merge it.

---

## Design Goal

End with a package where the remaining task is prose execution.

A strong scene handoff package should make clear:
- why each scene exists
- what changes inside the scene
- what world detail must surface naturally
- what continuity constraints cannot be violated
- what open question drives the next scene

---

## Definitions

### Scene
A unit of dramatic action in which a character pursues something under pressure and the situation changes.

### Sequel
A processing unit after action:
- reaction
- dilemma
- decision

### State Change
The measurable difference between the beginning and end of a scene.

A state change may affect:
- knowledge
- alliance
- status
- access
- territory
- bodily condition
- law position
- resource position
- ritual status
- time pressure

### World-Detail Obligation
A material, institutional, ordinary-life, or artifact detail that must be surfaced because the scene logically touches it.

### Carry-Forward Question
The unresolved pressure, uncertainty, or decision that makes the next scene necessary.

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

### Architecture Inputs
- final fabula
- milestone architecture
- relationship grid
- opposition grid
- artifact integration plan
- consequence map
- canon risk report
- residue plan

### Character Inputs
- POV character dossiers
- belief maps
- obligation maps
- capability maps
- threshold-world notes
- current relational states

### Optional Inputs
- desired chapter count
- preferred scene density
- multi-POV vs single-POV preference
- desired balance of action / discovery / drama
- target story length

---

## Outputs

- ordered scene handoff cards
- scene-to-milestone matrix
- POV schedule
- world-detail obligation list
- artifact touchpoint map
- continuity checklist
- next-scene carry-forward chain

---

## Phase 0: Determine scene granularity

Break the architecture into the minimum number of scenes needed to express all required state changes.

### Ask

- What distinct attempts must be dramatized?
- What distinct reactions must be dramatized?
- Which milestone shifts can occur in one scene?
- Which shifts require separation because the state change is too large?
- Which offscreen intervals are acceptable?
- Which world consequences must be shown directly rather than reported later?

### Rule

Do not split scenes for ornament.
Split them only when:
- objective changes
- power changes hands
- knowledge changes materially
- relationship status changes
- law or institution enters
- route or location change matters
- bodily risk changes the scene logic

---

## Phase 1: Build the scene sequence skeleton

Convert architecture into an ordered list of scene slots.

### Minimum Structural Coverage

Your sequence must include scenes covering:

- opening pressure signal
- loaded normality
- inciting breach
- first misreading or refusal
- first threshold / lock-in
- consequence wave I
- first turning point
- midpoint reframe
- consequence wave II / constriction
- crisis
- climax
- fallout
- resolution
- residue, when used

### Rule

Not every milestone needs exactly one scene.

Some milestones may need:
- one scene
- several linked scenes
- one action scene followed by one sequel scene

---

## Phase 2: Write scene handoff cards

Create one card per scene.

### Scene Handoff Card Template

- **Scene ID**
- **Milestone Served**
- **POV Character**
- **Date / Place**
- **Entry State**
- **Immediate Scene Goal**
- **Conflict Source**
- **Disaster / Reversal**
- **Reaction**
- **Dilemma**
- **Decision**
- **Exit State**
- **Knowledge Change**
- **Relationship Change**
- **World Detail That Must Be Surfaced**
- **Artifact Touchpoint**
- **Continuity Constraints**
- **Carry-Forward Question**

### Rule

The entry state and exit state must not be interchangeable.

If they are, the scene has no structural reason to exist.

---

## Phase 3: Apply scene/sequel rhythm

Use alternating movement between:
- action / attempt
- consequence / processing
- new commitment

### Action Scene Logic
Best when a scene is driven by:
- pursuit
- negotiation
- concealment
- theft
- travel risk
- ritual performance
- investigation
- confrontation

### Sequel Logic
Use after significant reversals:
- reaction
- dilemma
- decision

### Rule

Not every scene must contain the full cycle, but every cluster of scenes should complete it.

A sequence of action with no processing becomes hollow.
A sequence of processing with no attempt becomes static.

---

## Phase 4: Enforce world-detail obligations

World detail must surface because characters are trying to do something in the world.

### High-yield detail families

- bodily limits
- food, labor, weather, and fatigue
- travel speeds and terrain
- law, taboo, and ritual procedure
- architecture and access
- class markers
- species-specific affordances and difficulties
- trade and resource constraints
- ordinary tools and work practices
- local rumor and public memory

### Rule

Do not insert wiki paragraphs.

Surface detail through:
- blocked action
- cost
- misunderstanding
- procedure
- danger
- social friction
- practical necessity

### Failure Modes

Reject scene plans that use world detail only as:
- decorative names
- exposition monologue
- encyclopedia dialogue
- texture unrelated to the scene’s pressure

---

## Phase 5: Enforce artifact touchpoints

Artifacts should alter scene logic, not decorate it.

### Valid artifact touchpoint functions

- discovered
- misread
- quoted
- forged
- hidden
- traded
- confiscated
- translated
- publicly invoked
- ritually used
- destroyed
- left behind as residue

### Rule

An artifact touchpoint should change at least one of:
- authority
- interpretation
- risk
- timing
- allegiance
- access
- consequence

If it changes nothing, remove it.

---

## Phase 6: Run scene-level continuity and canon safety

Each scene must be checked against canon and continuity.

### Scene-Level Continuity Questions

- Is all supposedly public knowledge actually public at this date?
- Is this POV character allowed to know this?
- Is a local custom being treated as universal truth?
- Has a rare capability become suspiciously consequence-free?
- What institution should respond to what happens here?
- What bodily, legal, or ritual costs should be visible?
- Does the scene accidentally resolve a protected mystery?
- Does the scene rely on rejected or superseded canon?
- What changed here that later scenes must remember?

### Rule

Continuity is not a final cleanup pass.

Continuity must be attached to every scene card.

---

## Phase 7: Validate escalation and sequence health

Once scene cards exist, inspect the sequence.

### Check For

- escalation rather than repetition
- narrowing options after threshold points
- clear preparation for crisis and climax
- visible propagation after the climax
- balance between public and private stakes
- rhythm between action and sequel
- scene-to-scene causality
- no dead stretches where nothing important changes

### Scene Sequence Failure Modes

- too many scenes with the same goal
- multiple scenes that reveal the same fact the same way
- reaction scenes with no decision
- action scenes with no irreversible effect
- world detail repeated without new pressure
- climax unsupported by prior decisions
- fallout skipped or minimized
- resolution that restores everything too cleanly

---

## Phase 8: Package the writing handoff

When the scene sequence is stable, prepare the final package.

### Required Package Elements

- ordered scene cards
- scene-to-milestone matrix
- POV schedule
- world-detail obligations by scene
- artifact touchpoint map
- continuity checklist
- carry-forward chain
- unresolved questions the prose writer may answer locally without changing structure
- prohibited improvisations that would violate canon, mystery boundaries, or architecture

---

## Scene Handoff Output Template

```yaml
scene_handoff_id: SH-0006
story_architecture_id: SA-0009
scene_cards:
  - scene_id: S-01
    milestone: opening_pressure_signal
    pov: ...
    date_place: ...
    entry_state: ...
    immediate_goal: ...
    conflict_source: ...
    disaster_or_reversal: ...
    reaction: ...
    dilemma: ...
    decision: ...
    exit_state: ...
    knowledge_change:
      - ...
    relationship_change:
      - ...
    world_detail_obligation:
      - ...
    artifact_touchpoint:
      - none
    continuity_constraints:
      - ...
    carry_forward_question: ...
scene_to_milestone:
  - S-01 -> opening_pressure_signal
  - S-02 -> loaded_normality
pov_schedule:
  - S-01 protagonist
  - S-02 protagonist
artifact_map:
  - S-05 decree_fragment
continuity_watchlist:
  - ...
```

---

## Acceptance Tests

This pipeline succeeds only if all of these are true.

### Scene Tests
- every scene has a clear state change
- every scene has a reason to exist
- every scene creates or sharpens a carry-forward question
- no scene exists solely for exposition or atmosphere
- entry and exit states are materially different

### Character Tests
- the POV character wants something in the scene
- pressure reveals character rather than explanatory summary
- reaction, dilemma, and decision are present where needed
- relationships shift when the architecture says they should

### World Tests
- world detail appears through consequence
- institutions, embodiment, time, and place are visible where relevant
- artifacts alter scene logic when present
- ordinary life remains legible, not replaced by abstract plotting

### Canon Tests
- no unsupported knowledge
- no mystery collapse
- no local/global drift
- no consequence evasion
- downstream reactions are remembered later

---

## Mandatory LLM Roles

Run the handoff through at least these critics:

- Scene Architect
- Pacing Critic
- POV Critic
- World-Detail Critic
- Artifact Critic
- Continuity Critic

Then synthesize.

---

## Where This Pipeline Stops

This pipeline stops when prose scenes can be written from the cards without inventing new structure.

It does not write the final prose scene text.

---

## Final Rule

Do not start prose because the outline “basically exists.”

At the repository level, a story is only fully ready when it exists as:
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

This document governs the last pre-prose layer of that chain.