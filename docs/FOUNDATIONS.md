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

**Default Reality.** Silence is not permission to invent a supposedly long-standing truth later as if it had always been modeled. When a previously-unmodeled area is first canonized, the change must acknowledge that prior silence and route through Rule 6: no silent retcons. The world may grow, but growth must say what was newly modeled, what was already implied, and what remains deliberately unknown.

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

> **Resolution-safety semantics (per SPEC-14)**: `future_resolution_safety` is coupled to `status`. Mysteries with `status: forbidden` take `future_resolution_safety: none` (no future canon may resolve them — they define the world's metaphysics by what stays unsaid). Mysteries with `status: active` or `status: passive` take `future_resolution_safety: low | medium | high` (rare-but-allowed → readily allowed). This coupling is enforced by the `rule7_mystery_reserve_preservation` validator.

---

## Mandatory World Files

At minimum, every world model must express all thirteen concerns below. On machine-layer-enabled worlds (per SPEC-13 Atomic-Source Migration), their **storage form** is split between primary-authored files at the world root and atomic YAML records under `worlds/<slug>/_source/`:

| Concern | Storage form |
|---|---|
| `WORLD_KERNEL.md` | **Primary-authored** (root-level) — narrative summary; read cover-to-cover |
| `ONTOLOGY.md` | **Primary-authored** (root-level) — Categories in Use, Relation Types in Use, Notes on Use. Named Entity Registry atomized to `_source/entities/`. |
| Canon Ledger | Atomized: `_source/canon/CF-NNNN.yaml` + `_source/change-log/CH-NNNN.yaml` |
| Invariants | Atomized: `_source/invariants/<ID>.yaml` (one file per invariant, category preserved in the record) |
| Mystery Reserve | Atomized: `_source/mystery-reserve/M-NNNN.yaml` |
| Open Questions | Atomized: `_source/open-questions/OQ-NNNN.yaml` |
| Timeline | Atomized: `_source/timeline/SEC-TML-NNN.yaml` (one record per historical Layer) |
| Geography | Atomized: `_source/geography/SEC-GEO-NNN.yaml` (one record per H2 section) |
| Peoples and Species | Atomized: `_source/peoples-and-species/SEC-PAS-NNN.yaml` |
| Institutions | Atomized: `_source/institutions/SEC-INS-NNN.yaml` |
| Economy and Resources | Atomized: `_source/economy-and-resources/SEC-ECR-NNN.yaml` |
| Magic or Tech Systems | Atomized: `_source/magic-or-tech-systems/SEC-MTS-NNN.yaml` |
| Everyday Life | Atomized: `_source/everyday-life/SEC-ELF-NNN.yaml` |

The thirteen concerns remain load-bearing. The **storage form** is atomic-YAML-under-`_source/` for the eleven compiled concerns plus the Named Entity Registry. There are no compiled-markdown views at the world root for atomized concerns — the `_source/` tree is the sole canonical form. Humans read atomic records directly in their IDE (file-tree view over `_source/` subdirectories) or on-demand via `world-index render <world-slug> [--file <class>]` CLI for a merged view.

> **Derived artifacts**: `worlds/<slug>/_index/world.db` is a derived, gitignored artifact produced by `world-index build`. `worlds/<slug>/_source/` is the canonical source-of-truth layer and should be tracked in the private world-content repository, not in the public pipeline repository when those repositories are split.

For larger worlds, split by domain and region within the appropriate `_source/` subdirectory.

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
- observed_by — names actors who can directly perceive the fact
- recorded_in — names artifacts or records that capture the fact
- suppressed_by — names actors who actively prevent propagation
- distorted_by — names actors who systematically misrepresent the fact
- countered_by — names mechanisms that limit the fact's effects
- rate_limited_by — names mechanisms that throttle exercise of the fact

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

# epistemic_profile: required when knowability is non-trivial; n_a permitted
# only with one-line rationale tied to fact-type.
epistemic_profile:
  directly_observable_by: []
  inferable_by: []
  recorded_by: []
  suppressed_by: []
  distortion_vectors: []
  propagation_channels: []
  evidence_left: []
  knowledge_exclusions: []
exception_governance:
  activation_conditions: []
  rate_limits: []
  mobility_limits: []
  diffusion_barriers: []
  countermeasures: []
  nondeployment_reasons: []
---
# n_a forms are accepted only with one-line rationale tied to fact-type.
epistemic_profile:
  n_a: "Pure geography fact; no knowability axis."
exception_governance:
  n_a: "Structural-institutional fact; no exception axis."
```

The optional `pre_figured_by[]` field, when present in machine-readable Canon Fact Records, accepts CF ids only and records CF-to-CF foreshadowing: an earlier accepted CF that hinted at the later commitment before it was canonized. Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references.

*Genesis-world rule.* New worlds adopt the full schema from `CF-0001`. Existing worlds honor the append-only ledger — historical CFs predating a schema extension remain valid; new CFs appended after a schema extension meet the current schema.

> **Canonical storage (machine-layer-enabled worlds, per SPEC-13)**: Canon Fact Records are stored as atomic YAML files at `worlds/<slug>/_source/canon/CF-NNNN.yaml` — one record per file. The `notes` field and `modification_history[]` array are the authorized in-place mutation surfaces for an accepted CF; structural fields (`statement`, `scope`, `domains_affected`, `distribution`, etc.) are append-only in practice (changing them requires an explicit retcon attestation through the patch engine).

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
- technology
- geography
- institutions
- everyday_life

> The canonical-domain enum (`tools/world-index/src/public/canonical-vocabularies.ts`) extends this list with additional domains accumulated during implementation (`economy`, `settlement_life`, `memory_and_myth`, `magic`, `medicine`, `status_order`, `warfare`, `taboo_and_pollution`). The list above is the authoritative starting set; the validator's superset is queryable at runtime via `mcp__worldloom__get_canonical_vocabulary({class: "domain"})` (per SPEC-14).

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

### Rule 11: No Spectator Castes by Accident
When a canon fact introduces or depends on exceptional capability, it must name at least three forms of leverage that remain available to ordinary or mid-tier actors.

Permissible leverage includes locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, and infrastructural control.

Rule 9 (No Impossible Knowledge) is handled by character-generation Phase 7b and diegetic-artifact-generation Phase 7c distribution conformance checks.

### Rule 12: No Single-Trace Truths
Hard-canon core truths must leave traces in at least two distinct registers unless the truth is intentionally hidden and the hiding mechanism is itself canonized.

Registers include law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms, and other named in-world traces.

Rule 10 (No Premise-Collapsing Exceptions) is handled by canon-addition Phase 5 Diffusion Analysis, Phase 7 Counterfactual Pressure Test, and Validation Tests 3 and 8 on stabilizer concreteness.

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
- When an exceptional capability exists, what leverage remains to ordinary, mid-tier, and institutional actors respectively?
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

They should always receive — directly or via the documented context-packet + targeted-retrieval pattern —:
- current World Kernel
- current Invariants
- relevant canon fact records
- affected domain files
- unresolved contradictions list
- mystery reserve entries touching the same domain

This is non-negotiable. The context-packet API (`mcp__worldloom__get_context_packet`) is the machine-facing mechanism for delivering this set with completeness guarantees, complemented by targeted per-record retrieval (`mcp__worldloom__get_record`, `mcp__worldloom__get_record_field`) for full bodies of the load-bearing nodes the packet identifies; see [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) for the documented pattern, but those guarantees only hold when the underlying authoring surfaces are explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract.

---

## Machine-Facing Layer

The "LLM agents should never operate on prose alone" commitment in §Tooling Recommendation is realized by a phased machine-facing layer beside the human-facing markdown:

1. **World Index** (`worlds/<slug>/_index/world.db`) — SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums. Derived, deterministic, and regenerable from markdown. See `tools/world-index/` and `specs/SPEC-01-world-index.md`.
2. **Retrieval MCP Server** (`mcp__worldloom__*` tools) — structured read API over the world index. It replaces ad hoc raw-file loading with typed retrieval and context-packet assembly. See `tools/world-mcp/` and `archive/specs/SPEC-02-retrieval-mcp-server.md`.
3. **Patch Engine** (`mcp__worldloom__submit_patch_plan`) — deterministic world-edit applier with typed operations, anchor-hash anchoring, append-only vocabulary, and engine-controlled write ordering. This is the Phase 2 mutation path for machine-layer-enabled worlds. See `tools/patch-engine/` and `archive/specs/SPEC-03-patch-engine.md`.
4. **Validator Framework** (`world-validate` CLI; engine pre-apply gate; Hook 5 post-apply) — executable enforcement of Rules 1–7 plus structural invariants such as id uniqueness, attribution compliance, and anchor integrity. CLI and pre-apply validation are present; Hook 5 post-apply integration remains a later machine-layer phase.
5. **Hooks** (`.claude/settings.json`) — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation. See `tools/hooks/` and `archive/specs/SPEC-05-hooks-discipline.md`.

Once the retrieval surface is active, every "skills should always receive X" item above is delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`. The packet's five layers are documented in [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md).

For the operational overview, rollout boundaries, and troubleshooting guidance, see [docs/MACHINE-FACING-LAYER.md](/home/joeloverbeck/projects/worldloom/docs/MACHINE-FACING-LAYER.md).

---

## Canonical Storage Layer

Canonical storage for world state is atomic YAML under `worlds/<slug>/_source/` — one file per record, per the classification in §Mandatory World Files. There are no compiled-markdown views at the world root for atomized concerns. The `_source/` tree is the sole source-of-truth for CF / CH / INV / M / OQ / ENT / SEC records. The retired root-level markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, and the five large prose files) do not exist on machine-layer-enabled worlds.

**Write discipline**: `worlds/<slug>/_source/` is an engine-only write surface. Direct `Edit`/`Write` on any `_source/*.yaml` file is blocked by Hook 3; mutations route through `mcp__worldloom__submit_patch_plan` with typed record-ops (per SPEC-03 op vocabulary: `create_cf_record`, `update_record_field`, `append_extension`, `append_touched_by_cf`, etc.). The append-only ledger discipline of Rule 6 is preserved per-file: a CF's YAML file is append-only in its structural fields; mutations happen only in `notes`, `modification_history[]`, and `extensions[]`.

**Read discipline**: Skills read atomic records via `mcp__worldloom__get_record(record_id)` or `get_context_packet(task_type, seed_nodes, token_budget)`. Hybrid records (`CHAR-NNNN`, `DA-NNNN`, `PA-NNNN`) are also retrievable via `get_record(record_id)` with optional `section_path` projection — frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`) and body sections (`body.Capabilities`) project as structured slices, paralleling `get_record_field` for atomic records. Raw reads of `_source/` subdirectories via the `Read` tool are redirected to MCP retrieval by Hook 2. Humans read atomic records directly (IDE file-tree) or via `world-index render <world-slug> [--file <class>]` for a merged markdown view (read-only; not persisted to disk).

**Authored-primary surfaces**: `WORLD_KERNEL.md` and the reduced `ONTOLOGY.md` (Categories / Relation Types / Notes) remain directly editable at the world root. `characters/`, `diegetic-artifacts/`, `proposals/`, `audits/`, `adjudications/` continue as hybrid YAML-frontmatter-plus-markdown per-file artifacts (skill-owned mutation via engine ops; not atomized further).

**Migration history**: the one-time migration of `worlds/animalia/` from monolithic markdown to atomic YAML is documented in SPEC-13 Atomic-Source Migration. Worlds created after the migration (via `create-base-world`) start in atomic-source form directly; no legacy form accumulates.
