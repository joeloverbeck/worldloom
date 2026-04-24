# Worldloom Foundations

## Core Principle

A story world is not a bag of cool facts.

It is a constrained model of:
- ontology
- space
- time
- causality
- embodiment
- institutions
- resources
- culture
- knowledge
- history
- daily life
- pressure points
- mystery reserves

Every canon fact must live somewhere inside that model.

---

## Canon Layers

### 1. Hard Canon
Facts explicitly approved by the user and treated as true at the world level.

Examples:
- "Magic exists but is rare, dangerous, and difficult to control."
- "Sentient animal-humanoids coexist with humans."
- "The western coast is dominated by city-states, not empires."

### 2. Derived Canon
Facts not directly stated by the user but accepted as necessary consequences of hard canon.

Examples:
- If magic is rare and dangerous, magical education will likely be restricted, taboo, monopolized, or ritualized.
- If sentient species differ bodily, architecture, clothing, warfare, and tools should vary accordingly.

Derived canon must always cite the hard canon it follows from.

### 3. Soft Canon / Local Truth
Facts true only in limited scope:
- one region
- one institution
- one period
- one species
- one sect
- one faction
- one narrator's account

Examples:
- "In the Marsh Courts, the dead are not buried."
- "Among dune-fox clans, oath scars are sacred."

### 4. Contested Canon
Claims present in-world but not world-level truth.

Examples:
- legends
- propaganda
- false scholarship
- conflicting chronicles
- folk explanations
- court lies
- priestly doctrine

These are allowed and desirable. They enrich the world without forcing ontological commitment.

### 5. Mystery Reserve
Important unknowns deliberately left unresolved at the world-design level.

These are not gaps caused by laziness.
They are bounded unknowns preserved for depth, future stories, revelation control, or contested interpretation.

Examples:
- origin of a lost civilization
- why a dead god fell
- true source of corrupting artifacts
- whether one apocalypse was natural or engineered

Mystery Reserve entries must define:
- what is unknown
- what is known around it
- what kinds of answers are forbidden
- whether future canon may resolve it

---

## Mandatory World Files

At minimum, maintain:

- `WORLD_KERNEL.md`
- `INVARIANTS.md`
- `ONTOLOGY.md`
- `TIMELINE.md`
- `GEOGRAPHY.md`
- `PEOPLES_AND_SPECIES.md`
- `INSTITUTIONS.md`
- `ECONOMY_AND_RESOURCES.md`
- `MAGIC_OR_TECH_SYSTEMS.md`
- `EVERYDAY_LIFE.md`
- `CANON_LEDGER.md`
- `OPEN_QUESTIONS.md`
- `MYSTERY_RESERVE.md`

> **Derived artifacts**: `worlds/<slug>/_index/world.db` is a derived, gitignored artifact produced by `world-index build`. `worlds/<slug>/_source/` is reserved for the Phase 3 atomic-source layout (`CF-NNNN.yaml`, `CH-NNNN.yaml`). Neither is a mandatory world file in the human-facing sense; both are machine-facing infrastructure.

For larger worlds, split by domain and region.

---

## World Kernel

The World Kernel is the shortest accurate statement of what the world fundamentally is.

It must include:
- genre contract
- tonal contract
- chronotope
- key ontological deviations from reality
- major organizing pressures
- what kinds of stories the world naturally generates

### Template

- **Genre Contract:** what kind of world this is
- **Tone Contract:** grim, comic, tragic, lyrical, pulp, mythic, etc.
- **Chronotope:** what time-space structure governs lived experience
- **Primary Difference:** what most sharply distinguishes this world from reality or from adjacent genres
- **Core Pressures:** scarcity, empire, corruption, migration, divine absence, ecological collapse, ritual violence, etc.
- **Natural Story Engines:** frontier conflict, factional intrigue, pilgrimage, monster economy, relic hunting, class warfare, succession crises, etc.

---

## Invariants

Invariants are world-level truths that new canon must not violate without explicit user-approved revision.

Types of invariants:

### Ontological Invariants
What can and cannot exist.
- No resurrection
- Souls are real
- Time travel is impossible
- Gods act only indirectly
- Sentience requires biological embodiment
- Spirits cannot cross running water

### Causal Invariants
How causes and effects behave.
- Magic always exacts a cost
- Corruption spreads through intimacy, not distance
- A vow witnessed by blood has material consequences

### Distribution Invariants
Who has access to what.
- Gunpowder exists only in one archipelago
- Literacy is elite
- Large-scale magical schooling does not exist
- Flying mounts are symbolic rarities, not common transport

### Social Invariants
Stable rules of institutions, norms, taboos, legitimacy.
- Nobility is elective within clan structures
- Slavery is illegal but debt bondage is normalized
- Dead rulers are consumed ritually in one empire

### Aesthetic / Thematic Invariants
What must remain true for the world to still feel like itself.
- Heroism is costly, not clean
- Power decays what it touches
- The sacred and the filthy are never fully separable
- The world must remain low-magic in lived experience even if deep-time cosmology is vast

Each invariant should have:
- identifier
- statement
- rationale
- examples
- non-examples
- break conditions
- revision difficulty

---

## Ontology Categories

Every canon fact should attach to one or more ontology categories.

- entity
- species
- person
- faction
- institution
- polity
- place
- region
- route
- resource
- craft
- technology
- magic practice
- belief
- ritual
- law
- taboo
- artifact
- hazard
- event
- historical process
- social role
- text/tradition
- ecological system
- bodily condition
- metaphysical rule

---

## Relation Types

Use explicit relation types. Do not rely on prose alone.

Examples:
- causes
- enables
- constrains
- depends_on
- monopolized_by
- feared_by
- worshipped_by
- forbidden_to
- traded_by
- concealed_from
- descends_from
- originates_in
- destabilizes
- legitimizes
- imitates
- corrupts
- replaces
- ritualizes
- militarizes
- mythologizes

---

## Canon Fact Record Schema

Use this record format for every accepted canon fact.

```yaml
id: CF-0001
title: Raiders can reprogram robots
status: hard_canon | soft_canon | contested_canon | mystery_reserve
type: capability | artifact | law | belief | event | institution | species | etc
statement: >
  Natural-language statement of the fact.
scope:
  geographic: local | regional | global | cosmic
  temporal: ancient | historical | current | future | cyclical
  social: restricted_group | public | elite | secret | rumor
truth_scope:
  world_level: true | false | uncertain
  diegetic_status: objective | believed | disputed | propagandistic | legendary
domains_affected:
  - labor
  - warfare
  - economy
  - settlement_life
prerequisites:
  - technical_knowledge
  - tools
  - compatible_robots
  - energy_supply
distribution:
  who_can_do_it:
    - raider_tinker_crews
  who_cannot_easily_do_it:
    - ordinary_farmers
  why_not_universal:
    - unstable
    - rare_parts
    - high_failure_rate
costs_and_limits:
  - robots degrade rapidly after capture
  - reprogramming attracts hostile swarms
  - successful overrides require rare signal tools
visible_consequences:
  - some raider camps field captured robots
  - settlements fear scavenged automatons
  - black market in override modules exists
required_world_updates:
  - INSTITUTIONS.md
  - ECONOMY_AND_RESOURCES.md
  - EVERYDAY_LIFE.md
  - TIMELINE.md
source_basis:
  direct_user_approval: true
  derived_from:
    - CF-0000
contradiction_risk:
  hard: false
  soft: true
notes: >
  Accepted only with limiting conditions and downstream updates.
```

---

## World Queries Every Tool Must Be Able To Answer

Before approving any major change, the system should be able to answer:

1. What is this world, in one paragraph?
2. What are its ontological differences from baseline reality?
3. What are the main material constraints?
4. What institutions stabilize it?
5. What pressures destabilize it?
6. What kinds of people can plausibly exist here?
7. What can ordinary people actually do all day?
8. What do they fear, worship, trade, hide, and misunderstand?
9. What stays unexplained on purpose?
10. What would instantly make the world feel unlike itself?

---

## Validation Rules

### Rule 1: No Floating Facts
No fact may exist without:
- domain
- scope
- prerequisites
- limits
- consequences

### Rule 2: No Pure Cosmetics
No species, ritual, technology, artifact, or institution may be added as surface flavor only.
It must change at least one of:
- labor
- embodiment
- social norms
- architecture
- mobility
- law
- trade
- war
- kinship
- religion
- language
- status signaling
- ecology
- daily routine

### Rule 3: No Specialness Inflation
Do not repeatedly add exceptional elements that behave as if they have no impact on the ordinary world.

### Rule 4: No Globalization by Accident
A local capability must not be silently treated as universal.

### Rule 5: No Consequence Evasion
If a new fact has obvious second-order effects, either integrate them or explicitly explain why they do not manifest.

### Rule 6: No Silent Retcons
All canon changes must be logged with justification.

### Rule 7: Preserve Mystery Deliberately
Unknowns must be chosen, bounded, and tracked.
They must not be side effects of weak design memory.

---

## Acceptance Tests

A world model is not ready until all these can be answered cleanly:

- Why does the world currently look like this and not some nearby alternative?
- Why have existing powers not optimized away the world's premise?
- What keeps extraordinary capabilities from becoming mundane?
- What forms of inequality are structurally produced?
- What does geography force?
- What does embodiment force?
- What does scarcity force?
- What do people falsely believe?
- What contradictions are permitted because they are diegetic rather than ontological?
- What would a child, a laborer, a priest, a smuggler, and a ruler each think the world fundamentally is?

---

## Change Control Policy

Every approved change must:
- get a record
- list affected files
- state whether it is local or global
- state whether it changes ordinary life
- state whether it creates new story engines
- state whether it narrows or expands the Mystery Reserve

No change is complete until downstream files are updated.

---

## Tooling Recommendation

LLM agents should never operate on prose alone.

They should always receive:
- current World Kernel
- current Invariants
- relevant canon fact records
- affected domain files
- unresolved contradictions list
- mystery reserve entries touching the same domain

This is non-negotiable. The context-packet API (`mcp__worldloom__get_context_packet`) is the machine-facing mechanism for delivering this set with completeness guarantees, but those guarantees only hold when the underlying authoring surfaces are explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract.

---

## Machine-Facing Layer

The "LLM agents should never operate on prose alone" commitment in §Tooling Recommendation is realized by a phased machine-facing layer beside the human-facing markdown:

1. **World Index** (`worlds/<slug>/_index/world.db`) — SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums. Derived, deterministic, and regenerable from markdown. See `tools/world-index/` and `specs/SPEC-01-world-index.md`.
2. **Retrieval MCP Server** (`mcp__worldloom__*` tools) — structured read API over the world index. It replaces ad hoc raw-file loading with typed retrieval and context-packet assembly. See `tools/world-mcp/` and `archive/specs/SPEC-02-retrieval-mcp-server.md`.
3. **Patch Engine** (`mcp__worldloom__submit_patch_plan`) — deterministic world-edit applier with typed operations, anchor-hash anchoring, append-only vocabulary, and engine-controlled write ordering. This is the Phase 2 mutation path for machine-layer-enabled worlds. See `tools/patch-engine/` and `specs/SPEC-03-patch-engine.md`.
4. **Validator Framework** (`world-validate` CLI; engine pre-apply gate; Hook 5 post-apply) — executable enforcement of Rules 1–7 plus structural invariants such as id uniqueness, attribution compliance, and anchor integrity. Structural-only use begins in Phase 1; the full enforcement path lands with SPEC-04 and Phase 2 engine integration.
5. **Hooks** (`.claude/settings.json`) — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation. See `tools/hooks/` and `specs/SPEC-05-hooks-discipline.md`.

Once the retrieval surface is active, every "skills should always receive X" item above is delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`. The packet's five layers are documented in [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md).

For the operational overview, rollout boundaries, and troubleshooting guidance, see [docs/MACHINE-FACING-LAYER.md](/home/joeloverbeck/projects/worldloom/docs/MACHINE-FACING-LAYER.md).
