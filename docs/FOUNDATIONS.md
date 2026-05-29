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

**Silence Semantics.** Canonization-time silence classification is an acknowledgment discipline, not a Canon Fact schema field. When a proposed CF touches a domain no prior CF covered, classify the prior state in the adjudication record as one of: previously unmodeled, already implied by named canon, default-baseline reality now being changed or specified, or deliberately unknown / Mystery Reserve-adjacent. The accepted CF records the result as a one-line note or `source_basis` rationale; if the domain was not previously silent, the adjudication records the reason instead. This preserves Rule 6 auditability without treating absence as evidence that a long-standing truth was always canon.

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

> **Resolution-safety semantics (per SPEC-14)**: `future_resolution_safety` is coupled to `status`. Mysteries with `status: forbidden` take `future_resolution_safety: none` (no future canon may resolve them — they define the world's metaphysics by what stays unsaid). Mysteries with `status: active`, `status: passive`, or `status: passive_depth` take `future_resolution_safety: low | medium | high` (rare-but-allowed → readily allowed). This coupling is enforced by the `rule7_mystery_reserve_preservation` validator.

A forbidden mystery is a strong default, not a universal law. A world should preserve at least one bounded unknown, but when a central mystery is intended for eventual revelation, the world records that policy explicitly rather than forcing a permanent lock.

## Artifact Authority and Maturity

Canon layer and artifact maturity are separate. A file may discuss canon, cite canon, propose canon, audit canon, or create an in-world artifact without itself becoming world canon. The world system recognizes these maturity classes: pre-world proposal (`NWP`), candidate canon proposal (`PR`, `RP`, and EPE sidecars), candidate character proposal (`NCP`), realized canon-reading hybrid (`CHAR`, `DA`), accepted world canon (`_source/` records), adjudication and provenance (`PA`), audit (`AU`), pressure affordance (`EPE`), and downstream story record. Only accepted world-canon records claim world-canon authority. Proposal review approval, artifact-write approval, audit recommendation approval, pressure-event approval, and story-bundle acceptance are not canon acceptance; accepted CF provenance remains governed by the Canon Fact Record Schema reservation for `source_basis.direct_user_approval`.

## World Generativity vs Story-Bundle State

Worldbuilding may describe the kinds of conflicts, procedures, pressures, revelations, and affordances a world structurally produces. `Natural Story Engines`, `Native Story Procedures`, `intended_narrative_role`, `desired_arc_type`, `likely_story_scale`, `creates_new_story_engines`, and EPE `story_fuel` are sanctioned world-generativity language when they describe world-level affordance, pressure, or use. World-canon and world-proposal artifacts must not encode downstream story-bundle execution state: page ids, choice ids, storylet ids, act beats, plot destiny, companion quests, story-local clocks, or story-local state transitions. Those belong to story-bundle records and story-pipeline workflows, not upstream world-canon authority.

---

## Mandatory World Files

At minimum, every world model must express all thirteen concerns below. On machine-layer-enabled worlds (per SPEC-13 Atomic-Source Migration), their **storage form** is split between primary-authored files at the world root and atomic YAML records under `worlds/<slug>/_source/`:

| Concern | Storage form |
|---|---|
| `WORLD_KERNEL.md` | **Primary-authored** (root-level) — narrative summary; read cover-to-cover |
| `ONTOLOGY.md` | **Primary-authored** (root-level) — Categories in Use, Relation Types in Use, Notes on Use. Named Entity Registry atomized to `_source/entities/`. |
| Canon Ledger | Atomized: `_source/canon/CF-<integer>.yaml` + `_source/change-log/CH-<integer>.yaml` |
| Invariants | Atomized: `_source/invariants/<ID>.yaml` (one file per invariant, category preserved in the record) |
| Mystery Reserve | Atomized: `_source/mystery-reserve/M-<integer>.yaml` |
| Open Questions | Atomized: `_source/open-questions/OQ-<integer>.yaml` |
| Timeline | Atomized: `_source/timeline/SEC-TML-<integer>.yaml` (one record per historical Layer) |
| Geography | Atomized: `_source/geography/SEC-GEO-<integer>.yaml` (one record per H2 section) |
| Peoples and Species | Atomized: `_source/peoples-and-species/SEC-PAS-<integer>.yaml` |
| Institutions | Atomized: `_source/institutions/SEC-INS-<integer>.yaml` |
| Economy and Resources | Atomized: `_source/economy-and-resources/SEC-ECR-<integer>.yaml` |
| Magic or Tech Systems | Atomized: `_source/magic-or-tech-systems/SEC-MTS-<integer>.yaml` |
| Everyday Life | Atomized: `_source/everyday-life/SEC-ELF-<integer>.yaml` |

The thirteen concerns remain load-bearing. The **storage form** is atomic-YAML-under-`_source/` for the eleven compiled concerns plus the Named Entity Registry. There are no compiled-markdown views at the world root for atomized concerns — the `_source/` tree is the sole canonical form. Humans read atomic records directly in their IDE (file-tree view over `_source/` subdirectories). Story-bundle records can also be inspected on demand via `world-index render <world-slug> --story <story-slug>` for a merged read-only view; world-canon `--file <class>` rendering remains a future human-UX surface.

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
id: CF-2
title: Raiders can reprogram robots
status: hard_canon | derived_canon | soft_canon | contested_canon
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
  - INSTITUTIONS
  - ECONOMY_AND_RESOURCES
  - EVERYDAY_LIFE
  - TIMELINE
source_basis:
  direct_user_approval: true
  derived_from:
    - CF-1
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

`source_basis.direct_user_approval` is accepted-CF provenance, not a proposal-side
approval switch. In a persisted Canon Fact Record it is required and must be
`true`, meaning the fact has passed `canon-addition` adjudication, explicit
HARD-GATE approval, approval-token issuance, and patch-engine submission.
Pre-acceptance proposal packages may carry a CF-shaped candidate with
`direct_user_approval: false`; `canon-addition` must not copy that value into
the accepted CF record.

Mystery Reserve entries are first-class `M-<integer>` records, not a Canon Fact `status` value. Relate a CF to an `M` record through `source_basis`, change-log entries, or extension mechanisms; do not encode Mystery Reserve as a CF status. `required_world_updates` uses bare UPPER_SNAKE SEC file-class names (`GEOGRAPHY`, `PEOPLES_AND_SPECIES`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, `MAGIC_OR_TECH_SYSTEMS`, `EVERYDAY_LIFE`, `TIMELINE`), not retired root markdown filenames.

The optional `pre_figured_by[]` field, when present in machine-readable Canon Fact Records, accepts CF ids only and records CF-to-CF foreshadowing: an earlier accepted CF that hinted at the later commitment before it was canonized. Diegetic-artifact or character pre-figurement belongs in `source_basis.derived_from` alongside any contributing CF parents, preserving Rule 6 audit-trail routing without widening `pre_figured_by` beyond CF references.

*Genesis-world rule.* New worlds adopt the full schema from `CF-1`. Existing worlds honor the append-only ledger — historical CFs predating a schema extension remain valid; new CFs appended after a schema extension meet the current schema.

> **Canonical storage (machine-layer-enabled worlds, per SPEC-13)**: Canon Fact Records are stored as atomic YAML files at `worlds/<slug>/_source/canon/CF-<integer>.yaml` — one record per file. The `notes` field and `modification_history[]` array are the authorized in-place mutation surfaces for an accepted CF; structural fields (`statement`, `scope`, `domains_affected`, `distribution`, etc.) are append-only in practice (changing them requires an explicit retcon attestation through the patch engine).

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

### Rule Numbering and Enforcement Map

The defined FOUNDATIONS Validation Rules are Rules 1-7, 11, and 12. The numbering gap is intentional and must be preserved in references; no workflow, skill, ticket, or spec may cite a FOUNDATIONS rule number whose meaning is not declared here.

| Rule | Name | Enforcement surface |
|---|---|---|
| 1 | No Floating Facts | `tools/validators/src/rules/rule1-no-floating-facts.ts` (`rule1_no_floating_facts`) plus skill grounding review |
| 2 | No Pure Cosmetics | `tools/validators/src/rules/rule2-no-pure-cosmetics.ts` (`rule2_no_pure_cosmetics`) plus skill integration review |
| 3 | No Specialness Inflation | Judgment-only design review; no validator file |
| 4 | No Globalization by Accident | `tools/validators/src/rules/rule4-no-globalization-by-accident.ts` (`rule4_no_globalization_by_accident`) plus scope review |
| 5 | No Consequence Evasion | `tools/validators/src/rules/rule5-no-consequence-evasion.ts` (`rule5_no_consequence_evasion`) plus integration review |
| 6 | No Silent Retcons | `tools/validators/src/rules/rule6-no-silent-retcons.ts` (`rule6_no_silent_retcons`) plus append-only canon/change-log review |
| 7 | Preserve Mystery Deliberately | `tools/validators/src/rules/rule7-mystery-reserve-preservation.ts` (`rule7_mystery_reserve_preservation`) plus the story-pipeline mystery/invariant firewall gate |
| 11 | No Spectator Castes by Accident | `tools/validators/src/rules/rule11-action-space.ts` (`rule11_action_space`) plus canon-addition Validation Test 11 judgment review |
| 12 | No Single-Trace Truths | `tools/validators/src/rules/rule12-redundancy.ts` (`rule12_redundancy`) plus canon-addition Validation Test 12 judgment review |

Rule 8 was proposed during SPEC-09 and rejected as a separate rule; its substance is folded into the §Core Principle "Default Reality" paragraph and Rule 6. Rule 9 (No Impossible Knowledge) and Rule 10 (No Premise-Collapsing Exceptions) are cross-reference notes, not standalone rules: Rule 9 is handled by character-generation Phase 7b and diegetic-artifact-generation Phase 7c distribution conformance checks, while Rule 10 is handled by canon-addition Phase 5 Diffusion Analysis, Phase 7 Counterfactual Pressure Test, and Validation Tests 3 and 8 on stabilizer concreteness. There is no Rule 13.

`canon-addition`'s numbered Validation Tests are a distinct scheme from FOUNDATIONS Validation Rules: Test N is not Rule N. In particular, canon-addition Validation Test 13 (misrecognition probe) maps to §Acceptance Tests #9, not to any FOUNDATIONS rule.

### Rule 1: No Floating Facts
No fact may exist without:
- domain
- scope
- prerequisites
- limits
- consequences

A committed `PG` record is the load-bearing story-state output. The story-pipeline validates the `PG` and its companion `SE` through the shared nine hard gates (state-delta grounding is gate 7; turn-driver lawfulness is gate 9) at record commit per `.claude/skills/_shared-templates/story-state-contract.md` §7. Producing a committed state turn without yet-rendered prose satisfies Rule 1, because the `PG.state_snapshot`, `SE.state_delta`, emitted choices, grounding records, and validation trace declare the causal affordances, consequences, prerequisites, and protected mystery boundaries. The rule's grounding requirements apply to the record state, not to a markdown prose plan.

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

> **Three distinct domain taxonomies exist; do not conflate them.** (1) The Rule 2 list above is the authoritative *attachment* set — what a fact must change to avoid being pure cosmetics. (2) The runtime `canonical-domain` enum is its validator-enforced superset, and is the vocabulary for the CF `domains_affected` field. (3) `canon-addition` Phase 6 uses a separate **13-domain exposition investigation list** (everyday life, economy, law, religion, warfare, status order, kinship, architecture, mobility, environment, taboo/pollution, language/slang, memory/myth) that names *where to look* for consequences — an investigation guide, not a `domains_affected` vocabulary. A fact's `domains_affected` is drawn from (2); the Phase 6 list (3) guides the propagation sweep that discovers them.

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

**Mystery firewall enforcement.** For PG-authoring state changes (`branching-story-bootstrap`, `branching-story-turn-cycle`), the authoritative state-turn firewall is gate 3 (mystery / invariant firewall) of the shared nine hard gates per `.claude/skills/_shared-templates/story-state-contract.md` §7. Non-PG story skills enforce the same firewall through their own named validation phases. Rendered scene prose is guarded downstream by `branching-story-scene-prose-attach` and its deterministic `scene_range_forbidden_mystery_resolution` check; that is a publication-layer guard, not a second authoritative state-transition gate. Forbidden-status `M` is NEVER resolved at either site.

### Rule 11: No Spectator Castes by Accident
When a canon fact introduces or depends on exceptional capability, it must name at least three forms of leverage that remain available to ordinary or mid-tier actors.

Permissible leverage includes locality, secrecy, legitimacy, bureaucracy, numbers, ritual authority, domain expertise, access, timing, social trust, deniability, and infrastructural control.

### Rule 12: No Single-Trace Truths
Hard-canon core truths must leave traces in at least two distinct registers unless the truth is intentionally hidden and the hiding mechanism is itself canonized.

Registers include law, ritual, architecture, slang, ledgers, funerary practice, landscape, bodily scars, supply chains, songs, maps, educational customs, bureaucratic forms, and other named in-world traces.

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

## Grounds for Rejection

A proposed canon addition is not merely scored for downstream work — it may be **rejected as incompatible** with the world. Rejection is a first-class outcome, not a pipeline failure: a world that cannot reject a fact has no identity to protect. This section synthesizes grounds already distributed across §Invariants, §Acceptance Tests, and Rule 6; it introduces no new doctrine and is **not** a numbered Validation Rule.

An addition must be rejected — absent an explicit, user-approved world revision — when it does any of the following:

- **Violates non-negotiable ontology** — contradicts an Ontological Invariant (what can and cannot exist). *Example: reprogrammable robots proposed for a world whose ontology has no machine substrate.*
- **Collapses the genre or tonal contract** — breaks an Aesthetic/Thematic Invariant or the §World Kernel genre contract, so the world stops feeling like itself.
- **Contradicts world-defining scarcity or distribution logic** — breaks a Distribution Invariant (who has access to what).
- **Destabilizes the world at scale without a plausible stabilizer** — fails the §Acceptance Tests counterfactual ("Why have existing powers not optimized away the world's premise?") with no concrete limiting mechanism; relates to Rule 3 (No Specialness Inflation).
- **Imposes excessive retroactive invalidation** — would silently overturn too much established canon, which Rule 6 (No Silent Retcons) forbids.

A rejection must name the specific violated constraint (invariant id, genre-contract element, or Mystery Reserve entry) so the verdict is auditable and the proposer can repair toward a viable, narrower fact. Incompatibility is a property of the addition against *this* world's invariants and contract — the same fact may be canon-compatible in another world.

Operationalized by `canon-addition` Phase 2 (hard-rejection triggers) and the Phase 11 `REJECT` verdict with its "Why This Cannot Be Repaired" section.

## Change Control Policy

Every approved change must:
- get a record
- list affected files
- state whether it is local or global
- state whether it changes ordinary life
- state whether it creates new story engines
- state whether it narrows or expands the Mystery Reserve

No change is complete until downstream files are updated.

The Change Log Entry (`CH-<integer>`) record schema operationalizes this policy with affected facts, downstream updates, Mystery Reserve effect, retcon checks, and latent-burden tracking.

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

This is non-negotiable. The context-packet API (`mcp__worldloom__get_context_packet`) is the machine-facing mechanism for delivering this set with completeness guarantees, complemented by targeted retrieval (`mcp__worldloom__get_record`, `mcp__worldloom__get_records`, `mcp__worldloom__get_record_field`, `mcp__worldloom__get_records_field`, `mcp__worldloom__get_persisted_packet_slice`) for full bodies, field projections, or persisted-packet slices of the load-bearing nodes the packet identifies; see [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) for the documented pattern, but those guarantees only hold when the underlying authoring surfaces are explicit and truthful as well (for example: canonical entity declarations and scoped-reference blocks on authority-bearing records); raw file reads alone cannot enforce the contract.

HARD-GATE PASS/FAIL rationales follow the authority-cited discipline in [docs/HARD-GATE-DISCIPLINE.md](/home/joeloverbeck/projects/worldloom/docs/HARD-GATE-DISCIPLINE.md): a validation judgment must cite the record id, packet layer, validator result, retrieved field, or named loaded authority it rests on, not model memory or impression alone.

**Whole-class enumeration is a legitimate primary loading pattern.** For skills whose validation discipline tests a candidate against every record of a class — the `emergent-pressure-events` Phase 6 firewalls (every INV record at Phase 6a; every Mystery Reserve entry at Phase 6b) and the `continuity-audit` cross-checks — whole-class enumeration via `mcp__worldloom__list_records(world_slug, record_type, include_full_body=true)` is a recognized primary loading branch of the "directly or via context-packet" permission above. The "touching the same domain" mystery-reserve scoping in the bullet list applies to skills with domain-bounded firewall surfaces; whole-class scoping applies to skills whose firewall is class-bounded by their own Canon Safety Check commitments. The load shape is the skill's choice, named explicitly in its FOUNDATIONS Alignment table and governed by its Canon Safety Check discipline.

Story-pipeline skills (Skill Category 2c) depend on this same MCP retrieval surface for world-canon reads. Indexed story-bundle records are also available through targeted retrieval when callers supply `story_slug`; `get_context_packet` also provides the story-bundle-local context layer for story-pipeline task types when callers supply `story_slug`.

---

## Machine-Facing Layer

The "LLM agents should never operate on prose alone" commitment in §Tooling Recommendation is realized by a phased machine-facing layer beside the human-facing markdown:

1. **World Index** (`worlds/<slug>/_index/world.db`) — SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums. Derived, deterministic, and regenerable from markdown. See `tools/world-index/` and `specs/SPEC-01-world-index.md`.
2. **Retrieval MCP Server** (`mcp__worldloom__*` tools) — structured read API over the world index. It replaces ad hoc raw-file loading with typed retrieval and context-packet assembly. See `tools/world-mcp/` and `docs/MACHINE-FACING-LAYER.md`.
3. **Patch Engine** (`mcp__worldloom__submit_patch_plan`) — deterministic world-edit applier with typed operations, anchor-hash anchoring, append-only vocabulary, and engine-controlled write ordering. This is the Phase 2 mutation path for machine-layer-enabled worlds. See `tools/patch-engine/` and `docs/HARD-GATE-DISCIPLINE.md`.
4. **Validator Framework** (`world-validate` CLI; engine pre-apply gate; Hook 5 post-apply) — executable enforcement of Rules 1–7 plus structural invariants such as id uniqueness, attribution compliance, and anchor integrity. CLI and pre-apply validation are present; Hook 5 post-apply integration remains a later machine-layer phase.
5. **Hooks** (`.claude/settings.json.example`) — Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation. See `tools/hooks/`, `tools/hooks/README.md`, and `.claude/settings.json.example`.

Once the retrieval surface is active, every "skills should always receive X" item above is delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`. The packet layers are documented in [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md), including `story_bundle_context` for story-pipeline task types when `story_slug` is supplied.

For the operational overview, rollout boundaries, and troubleshooting guidance, see [docs/MACHINE-FACING-LAYER.md](/home/joeloverbeck/projects/worldloom/docs/MACHINE-FACING-LAYER.md).

---

## Canonical Storage Layer

Canonical storage for world state is atomic YAML under `worlds/<slug>/_source/` — one file per record, per the classification in §Mandatory World Files. There are no compiled-markdown views at the world root for atomized concerns. The `_source/` tree is the sole source-of-truth for CF / CH / INV / M / OQ / ENT / SEC records. The retired root-level markdown files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, and the five large prose files) do not exist on machine-layer-enabled worlds.

**Per-class ID format conventions (FOUNDATIONS-002)**: Record IDs use an unpadded natural-integer suffix for every per-world atomic-source class, hybrid class, pipeline class, and story-bundle class. Filenames match the `id` field exactly: use `M-1.yaml` with `id: M-1`, not `M-0001.yaml` with `id: M-0001`. Engine schemas and allocation checks use `^<CLASS>-[0-9]+$` patterns, with the class prefix expanded as needed for section records (`SEC-GEO-1`) or invariant categories (`CAU-1`). Slug or date suffixes that are part of a hybrid filename, such as `SAU-1-2026-05-13.md` or `RSP-1-payoff.md`, follow the unpadded numeric ID. This decision preserves existing world data, keeps human file trees legible, and prevents schema-accepted references from resolving to non-existent padded IDs.

**Write discipline**: `worlds/<slug>/_source/` is an engine-only write surface. Direct `Edit`/`Write` on any `_source/*.yaml` file is blocked by Hook 3; mutations route through `mcp__worldloom__submit_patch_plan` with typed record-ops (per SPEC-03 op vocabulary: `create_cf_record`, `update_record_field`, `append_extension`, `append_touched_by_cf`, etc.). The append-only ledger discipline of Rule 6 is preserved per-file: a CF's YAML file is append-only in its structural fields; mutations happen only in `notes`, `modification_history[]`, and `extensions[]`.

**Read discipline**: Skills read atomic records via `mcp__worldloom__get_record(record_id)` or `get_context_packet(task_type, seed_nodes, token_budget)`. Hybrid records (`CHAR-<integer>`, `STCHAR-<integer>`, `DA-<integer>`, `PA-<integer>`, `NCP-<integer>`, `NCB-<integer>`) are also retrievable via `get_record(record_id)` with optional `section_path` projection — frontmatter blocks (`frontmatter.world_consistency`, `frontmatter.author_profile`, `frontmatter.memorability_profile`) and body sections (`body.Capabilities`) project as structured slices, paralleling `get_record_field` for atomic records. Whole-class hybrid enumeration uses `list_records(record_type='character_record'|'story_character_authority_record'|'diegetic_artifact_record'|'adjudication_record'|'character_proposal_card'|'character_proposal_batch')`; `include_full_body=true` returns parsed frontmatter plus body sections. Raw reads of `_source/` subdirectories via the `Read` tool are redirected to MCP retrieval by Hook 2. Humans read atomic world records directly in their IDE; story-bundle records can be rendered with `world-index render <world-slug> --story <story-slug>` for a merged markdown view (read-only; not persisted to disk).

**Authored-primary surfaces**: `WORLD_KERNEL.md` and the reduced `ONTOLOGY.md` (Categories / Relation Types / Notes) remain directly editable at the world root. `characters/`, `diegetic-artifacts/`, `proposals/`, `audits/`, `adjudications/` continue as hybrid YAML-frontmatter-plus-markdown per-file artifacts (skill-owned mutation via engine ops; not atomized further).

**Migration history**: the one-time migration of `worlds/animalia/` from monolithic markdown to atomic YAML is documented in SPEC-13 Atomic-Source Migration. Worlds created after the migration (via `create-base-world`) start in atomic-source form directly; no legacy form accumulates.

---

## Story Bundles

### 1. What A Story Bundle Is

A story bundle is a per-world derived layer at `worlds/<slug>/stories/<story-slug>/`. It carries a localized causal-engine state bound to a specific premise, cast, and tone contract: story-local entities, facts, beliefs, events, obligations, consequences, threads, relationships, intentions, locations, objects, pages, branches, choices, storylets, and artifacts.

Story bundles are distinct from world canon. Story-bundle records are story-local truths: they can be branch-scoped, counterfactual, provisional, or true only inside a particular narrative run. World canon remains world-level truth, expressed through CF / CH / INV / M / OQ / ENT / SEC records under `worlds/<slug>/_source/`.

### 2. Storage Form

`STORY_KERNEL.md` is primary-authored at the story-bundle root, parallel to `WORLD_KERNEL.md` at the world root. Atomic YAML story records live under `worlds/<slug>/stories/<story-slug>/_source/<class>/<ID>.yaml`, one file per record per class, following the SPEC-13 atomic-source convention. A per-bundle `INDEX.md` is a derived rendering of the bundle's branch, thread, mystery, cast, pool, and page state.

### 3. Read Discipline

Story-bundle records follow the same bulk-read discipline as world-canon atomic records. Hook 2 redirects oversized `Read` requests for `worlds/<slug>/stories/<story-slug>/_source/<class>/*.yaml` to MCP retrieval; scoped reads with explicit `offset` / `limit` remain available for targeted inspection, and the `ALLOW_FULL_READ` override remains reserved for human-driven review. For indexed story-bundle records with known authored IDs, targeted retrieval tools such as `get_record`, `get_records`, `get_record_field`, `get_records_field`, `list_records`, `get_neighbors`, `search_nodes`, `find_named_entities`, and `find_impacted_fragments` can read the bundle-scoped records when supplied with `story_slug`; `get_context_packet` also returns `story_bundle_context` for story-pipeline task types when supplied with `story_slug`.

World canon read by story-pipeline skills still routes through `mcp__worldloom__get_record`, `mcp__worldloom__get_context_packet`, `mcp__worldloom__list_records`, and the other targeted retrieval tools named in §Tooling Recommendation.

### 4. Write Discipline

Story-bundle `_source/<class>/*.yaml` writes use Shape B: they route through `mcp__worldloom__submit_patch_plan` with story-bundle record ops such as `create_slt_record`, `create_pg_record`, and `append_story_diegetic_artifact_record`. PEENH-001 landed this migration from the earlier Shape A direct-write posture.

Hook 3 blocks direct `Edit` / `Write` to both `worlds/<slug>/_source/...` and `worlds/<slug>/stories/<story-slug>/_source/...` YAML records. Story-bundle markdown and publication surfaces remain direct-write surfaces: `STORY_KERNEL.md`, `INDEX.md`, `pages-prose/` and legacy `pages-prose-plans/` / `pages-prose-receipts/` artifacts, `scene-prose/`, `scene-prose-plans/`, `scene-prose-receipts/`, `audits/`, `storylet-batches/`, `story-promotions/`, and remediation proposal cards are not atomic `_source/*.yaml` records. New story-state turns no longer author page-plan or page-receipt artifacts; legacy page artifacts remain readable while existing bundles need them. Story-pipeline skills must not mutate world canon directly. The only lawful story-to-world mutation path is `story-fact-promotion-to-canon`, which hands the candidate to `canon-addition`; `canon-addition` then assembles and submits the actual CF / CH / PA world-canon patch plan through the standard HARD-GATE and patch-engine route.

**Pipeline shape: state turn + scene prose.** Story state is authoritative at `PG` record commit; rendered prose is a publication artifact, not a second state-transition workflow. The story-bundle pipeline commits the causal state turn as story records (`SE`, `PG`, choices, and other affected story records) through the patch engine. It does not author a comprehensive per-page prose plan at bundle or turn commit. Prose is planned and rendered at the scene layer: `branching-story-scene-plan` writes `scene-prose-plans/SCN-<integer>.md` for a committed `PG` range, and `branching-story-scene-prose-attach` validates `scene-prose/SCN-<integer>.md` without mutating page state. `branching-story-turn-cycle` may advance the story from any committed page snapshot without requiring rendered parent prose, and it computes the next state delta from story records rather than from prose artifacts. No ARC_TRACE class. World-canon mutation remains exclusive to `story-fact-promotion-to-canon`, which hands the candidate to `canon-addition`; `story-promotion-closeout` records the verdict on story-local records after adjudication.

**Scene render layer.** A scene render unit (`SCN`) groups a contiguous committed `PG` range on one branch path for reader-facing prose planning and rendering. `PG` and `SE` records remain the causal authority; `SCN` is a derived, non-authoritative membership record that records which already-committed causal ticks are rendered together, their end-page choice surface, and the scene artifact paths. Publication state is derived at read time from scene artifact presence plus the scene-prose receipt verdict, never stored on the append-only `SCN`. `branching-story-scene-plan` creates or supersedes the `SCN` record through the patch engine and writes `scene-prose-plans/SCN-<integer>.md` as a direct renderer-facing artifact after its HARD-GATE. `branching-story-scene-prose-attach` validates `scene-prose/SCN-<integer>.md` across every included `PG` and writes `scene-prose-receipts/SCN-<integer>.yaml` without mutating `PG`, `SCN`, `SE`, or other story `_source` records.

The scene layer must not become a narrative-shape engine. `SCN.scene_descriptor` and `SCN.boundary_rationale` describe what the committed range depicts and why the boundary is factual for POV, time, location, cast, or exchange continuity; they do not state act position, arc obligation, climax/midpoint function, or future dramatic target. The deterministic `scn_no_narrative_shape_language` validator is the backstop, and `branching-story-scene-plan` carries the semantic §5c HARD-GATE affirmation. Scene plans may translate committed `PG` requirements into novelist-facing prose instructions, but they do not create new causal state or future obligation.

### 4a. Plan-Authority Boundary

Story state is authoritative at `PG` record commit. Rendered prose is a rendering of that committed state, not a second state engine. A `PG` record is real the moment the patch engine accepts the state-turn records; rendered prose is planned and attached later at scene scope.

Page snapshots are the fork primitive. Any committed page is a valid parent for `branching-story-turn-cycle`, regardless of whether its prose has been rendered. There is no parallel "did the prose realize the planned arc" state engine — no ARC_TRACE class, no second state-transition pass. Scene prose that deviates from committed state is routed by `branching-story-scene-prose-attach` as either a prose-quality issue (revise prose), a structural-fact issue (run a repair turn), or a canon-candidate (run promotion).

### 4b. Canon Baseline Drift

A committed story page is evaluated against the world-canon revision loaded at `PG` record commit. `PG.state_snapshot.canon_revision` records that baseline as the latest governing `CH-<integer>` change-log id visible to the state-turn context, or `null` only when the world has no change-log entry to cite.

Later world-canon changes do not silently rewrite committed story-bundle records. Before advancing from a parent page, story-pipeline skills must compare the parent page's recorded baseline against the current world-canon revision and classify drift as exactly one of: `compatible`, `grandfathered`, `requires_health_audit`, `requires_repair_turn`, or `promotion_or_retcon_conflict`.

No story-pipeline skill may silently treat stale story-local assumptions as current world-valid truth. Compatible or grandfathered drift may proceed with the classification recorded in the new `PG` validation trace or audit finding; drift that requires audit, repair, or promotion/retcon review must route to `branching-story-health-audit`, a repair turn, or `story-fact-promotion-to-canon` / `canon-addition` as appropriate before new world-valid assumptions are asserted.

### 5. Validation Rules At Story Scope

Rule 1 (No Floating Facts) governs story-bundle record schemas. For example, SLT records require `mystery_policy`, `provenance.origin`, `scope.visibility`, `preconditions.hard|soft` (in the closed predicate DSL), and `effects.create|supersede|close` (mirroring `SE.state_delta`) per the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4.4. The same load-bearing discipline applies across the landed story-state schemas: `STSTAT` carries replayable life / agency / location state for `entity_status`, `SE.resolution` grounds non-accept outcomes with result and player-visible feedback, `SF.authority` separates branch-local, counterfactual, candidate, and canon-linked facts, `OBL` / `CNSQ` `urgency` gives debt salience a uniform field, `CHC.grounded_in` makes choice grounding structurally checkable, and the closed predicate DSL includes actor-unbound existential predicates for social-state prefiltering without branch-local ID leakage.

Rule 4 (No Globalization by Accident) governs story-scope branch isolation. Global author-pool storylets must not reference `branch_local_record` IDs; `bundle_genesis_record` IDs remain globally visible unless later superseded or closed, per the shared story state contract's branch-scope vocabulary.

Rule 5 (No Consequence Evasion) governs per-page consequence capacity. Every page must leave at least one continuation storylet eligible.

**Choice Consequence Integrity.** No accepted player choice or accepted write-in may be cosmetic-only. Every committed `CHC` selection or accepted write-in must produce at least one grounded consequence: a non-empty `SE.state_delta`; a new, superseded, or closed story-bundle record; a changed visibility or affordance state; or a recorded failure, refusal, or block that is itself a consequence. Purely rhetorical or expressive choice variants are permitted only when the `PG` record explicitly marks them as rhetorical before selection.

Rule 7 (Preserve Mystery Deliberately) governs story-local `unresolved_mystery_claims` (on `PG.state_snapshot`) and `mystery_policy.allowed_authority` (on commitment blocks) authority discipline: `apparent`, `branch_local_counterfactual`, and `canon_candidate` claims remain separate. `SF.authority` uses the schema-backed story-fact authority enum from the shared story state contract: `branch_local`, `branch_local_counterfactual`, `canon_candidate`, and `canon_linked`; `canon_linked` is allowed only after canon acceptance and is backed by a parent `CF-<integer>` in `SF.derived_from`.

**Mystery Accretion.** Story-pipeline skills must protect Mystery Reserve entries against cumulative narrowing across a branch, not only against a single direct answer statement. Repeated `PG.state_snapshot.unresolved_mystery_claims[].status: clue_added | narrowed` entries can collectively resolve, overconstrain, or collapse a mystery even when no individual page says the answer outright; `branching-story-health-audit` must walk the branch page chain and flag that accumulated narrowing against the Mystery Reserve firewall. This uses the existing `unresolved_mystery_claims[].status` vocabulary and does not add an `SLT` field.

Rules 2 / 3 / 6 / 11 / 12 govern world-canon-mutation surfaces such as `canon-addition`, `propose-new-canon-facts`, and `create-base-world`; they are not story-scope record validators by default.

### 5a. Commitment Blocks Are Causal Moves

`SLT` records are reusable causal moves with preconditions, beats, effects, exits, and saliency — not dramatic acts, not arcs, not mini-stories, not plot rails. A good block says: *"when these conditions hold, this kind of action can happen, these beats dramatize it, and these state effects follow."* A bad block says: *"advance Act II"* or *"raise stakes before midpoint."*

The schema (per `.claude/skills/_shared-templates/story-state-contract.md` §4.4) explicitly forbids `arc_contract`, `dramatic_unit`, `execution_envelope`, nested `effect_model`, `stop_policy`, `record_version` discriminators above `1`, and `shape:` discriminators (until a second shape is ever needed). Each block's `effects.*` mirrors `SE.state_delta` (`create | supersede | close`).

### 5b. Schema-Minimalism At Story Scope

Every field in every story-bundle record schema must be load-bearing — directly consumed by a validation gate, a replay primitive, a predicate, a fork operation, or recorded audit-trail discipline. Nice-to-have fields are dropped, because each field costs LLM tokens to author at every record and to read at every retrieval.

The canonical field lists for all story-bundle record schemas live in the shared story state contract at `.claude/skills/_shared-templates/story-state-contract.md` §4. That contract is authoritative for story-record schemas; skills must not add fields to those schemas without amending the contract first.

### 5c. Present Causal State, Not Narrative Shape

The story engine is a present-causal-state machine. It tracks what is true now and what that licenses next; it does not track where a run "should" be in a dramatic arc. Two narrative-shape framings are rejected at engine scope — not merely at the `SLT` record scope §5a already governs.

**No act structure.** Act structure encodes *future dramatic obligations* ("preserve Act II", "this must be the climax"). Interactive branching state carries *present causal obligations* ("this debt is open", "this consequence is pending"). These are different beasts: if the player kills the planned antagonist, confesses early, abandons the quest, destroys the artifact, joins the enemy, or refuses the premise, an act structure either breaks or silently suppresses valid choices. At every page the engine asks: what is true now, who knows it, who wants what, what debts remain, what consequences are pending, what affordances are visible, what mysteries are protected, what action is the player attempting, and what world logic allows. It never asks: are we before or after the midpoint, has the protagonist refused the call, is this the climax, does this choice preserve a planned act. This is the story-scope analogue of §World Queries Every Tool Must Be Able To Answer. The schema-level expression of this principle is §5a (commitment blocks are causal moves, not acts) and §4a (no `ARC_TRACE` class); §5c is its engine-scope statement. The causal-dependency threat scan is the engine-scope expression of Rule 5 here: it asks only whether current state still supports what it claims, never where the story should go.

**No global drama manager.** Page-to-page progression is not a global "optimal story" search. A global drama manager — a planner that selects moves to steer a run toward a target narrative shape — reintroduces railroading through the back door, suppressing coherent player choices that the target shape disfavors. Selection is instead local salience ranking gated by hard coherence gates: the storylet pool offers commitment blocks, per-`SLT` `saliency` ranks the locally eligible ones, and the nine shared hard gates (story state contract §7) reject any selection that breaks coherence. The architecture already embodies this; the principle exists to keep it from drifting.

**Driver salience is local.** Multi-source causality — player action plus active non-player pressure (NPC plans stepping, clocks firing, secrets reveal-ready, threads escalating, obligations falling due) — does not invite a global planner. Driver selection (which active record becomes this turn's causal initiator) is a *prior* local-salience-ranking pass before SLT selection: rank due drivers by urgency, break by player action when supplied, decline drivers whose access route is illegible. The system selects among existing active pressures; it does not look ahead to a target narrative shape. This composes with §5a (SLTs are causal moves) and the shared hard gates (story state contract §7) — driver-then-SLT is two local salience passes, not one global plan.

### 6. Story-Bundle ID Classes

Story-bundle architecture uses world-scoped, story-bundle-scoped, and sub-audit-scoped ID classes. `STORY-<integer>` is per-world. Per-bundle records include STENT, STCHAR (story-local character authority profile; hybrid markdown artifact under `story-characters/`), STSTAT, SF, BEL, SE, OBL, CNSQ, THR, SREL, STINT, STLOC, STOBJ, CLK, STSEC, STQ, DA (story-local), BR, PG, CHC, SLT, STPLAN, STEMO, SCN, and SLB. Per-bundle audit and promotion records include SAU and SP, with RSP scoped under a specific SAU audit. All of these classes use the unpadded natural-integer format defined in §Canonical Storage Layer.

Allocation routes through `mcp__worldloom__allocate_next_id(world_slug, id_class, story_slug=...)`, or through the ordered batch equivalent `mcp__worldloom__allocate_many_ids(world_slug, allocations=[{id_class, story_slug, audit_id?}, ...])` when a bootstrap/reservation workflow needs several IDs in one round trip. RSP allocation also includes `audit_id`. The allocator is the same machine-facing allocation surface used for world-canon classes.

### 6.1 Story-Local Character Authority

World-level `CHAR-*` records remain story-agnostic. Story bundles that need character-specific behavior, voice, appraisal, or planning authority use story-local `STCHAR-*` profiles. Normal story runtime consumes active `STCHAR` profiles, not world `CHAR` dossiers.

`CHAR` provenance may be recorded in `STCHAR` frontmatter, but it must not be used as an operational shortcut in `STENT`, `CHC`, `PG`, scene plans, or prose receipts. `STCHAR` shapes persona, voice, and pressure behavior; it is not an epistemic access route and must not be added to `BEL.basis.access_records[]`.

### 6a. Belief vs. Fact

`SF` records what is true in the branch; `BEL` records what a holder believes, claims, witnesses, suspects, denies, or is deceived about. The two classes are kept separate so that lies, secrets, betrayals, witness asymmetry, and contested public claims remain coherent without inventing plot rails.

`BEL.belief_mode` separates sincerity / epistemic stance from confidence. `BEL.truth_relation` (`true | false | partly_true | unknown | contested | branch_counterfactual | future_contingent`) distinguishes belief from truth. `BEL.visibility` (`private | shared | factional | public | rumored | concealed | suppressed`) is consumed by the social-state firewall. Schemas live in `.claude/skills/_shared-templates/story-state-contract.md` §4.1 (BEL) and §4 generally (every other story-bundle record class).

### 6b. Information / Observer Firewall

Storylet selection, emitted choices, and character actions must not rely on information unavailable to the acting entity. Before selecting an `SLT`, binding an actor to a move, emitting a `CHC`, or resolving a character action, story-pipeline skills must confirm that the actor's active `BEL` state, page-state affordances, accessible artifacts, direct observation, testimony, documents, inference, surveillance, institutional channels, magic/tech, or another canonically valid mechanism gives that actor an access route to the load-bearing information.

The firewall also governs event-level driver declaration. When a causal event (`SE`) declares a non-player turn driver — `npc_action`, `offstage_action`, `clock_fire`, `world_pressure`, `secret_reveal`, `multi_actor_collision` — the declared `pov_visibility` must match the actor's actual access posture. The downgrade triggers are a closed set: `perceived_directly` is **not** lawful, and the declaration must downgrade to `inferred_from_trace`, `reported`, `discovered_after`, or `withheld` (with a matching `BEL` access route where the chosen value requires one), when any of the following holds:

1. a cited `driver_records[]` entry is a **hidden-status `STSEC`** (status `hidden` / `unrevealed` / `concealed`, or `audience_visibility: hidden`);
2. a cited `driver_records[]` entry is an **offstage-scoped `STPLAN`** (`scope.visibility` ∈ {`offstage`, `hidden`, `concealed`}) that the POV actor lacks an access route to; or
3. the **driving event itself is one the POV did not witness** — an `offstage_action`, or any event reaching the POV only by trace, report, or later discovery.

Conversely, `perceived_directly` *is* lawful for an on-stage driving event the POV directly witnesses, **even when its `driver_records[]` are the initiator's private interior records** (`STEMO`, `BEL`, `STINT`, `THR`, `SREL`). The interior substrate of an observed action is the normal unobservable motive layer: the POV sees the act, not the actor's affect/belief/intention, and renders its read of those motives through the POV's *own* inferential `BEL` records — never by leaking the initiator's private records into the `PG`/scene/choices and never by forcing a `pov_visibility` downgrade. The system may know the driver's full causal trace; the `PG` record, scene prose, and emitted choices must render only what the POV is canonically licensed to know.

This firewall governs move and choice generation. The existing `expected_witnesses` mechanism in `branching-story-turn-cycle` Phase 4 governs the post-event propagation side: who comes to know, suspect, misunderstand, or report what happened after the event.

### 7. Story-Pipeline Skill Category

The nine story-pipeline skills constitute Skill Category 2c per `.claude/skills/skill-audit/references/cross-skill-consistency.md`: `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-scene-plan`, `branching-story-scene-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, and `story-promotion-closeout`.

FOUNDATIONS alignment applies per the story-scope validation rules above. Sibling-scan is recommended as a defensive default for inter-skill shared surfaces, including the shared predicate DSL, the STENT `role_in_story` enum, the `PG.state_snapshot` schema (per the shared story state contract), the `SCN` schema and scene receipt schema, the RSP card schema, and scene-plan content-policy, prose-craft, and render-time instruction surfaces per the shared story state contract.

### 8. Story Bundle As Derived Per-World Layer

Story bundles are not canonical world state in the sense of world canon. They are derivative narrative-content layers attached to a world. Multiple story bundles can coexist under one world at `worlds/<slug>/stories/`, one per story slug, and each bundle is independent.

Story-bundle deletion is permitted at the bundle level. Within a retained bundle, atomic YAML records remain append-only at the filesystem level, following the same record-append-only discipline that governs `_source/<world-subdir>/*.yaml`.

### 9. Prose Length Discipline At Story Scope

Story-pipeline LLM-facing surfaces must not impose word-count targets, floors, ceilings, ranges, or budgets on rendered prose. Pacing is expressed structurally through the selected commitment block's `SLT.beats` list (1-5 beats per block), the committed `PG` / scene-plan beat surface, and the natural close-where-the-next-commitment-becomes-available — never as a per-page or per-arc word quota. Length follows content: the prose is as long as the beats, the cast's reactions, and the chosen stopping point require, and not a sentence sooner or later.

**Why**: word-count quotas at the LLM-facing surface produced empirically observed prose-padding (the LLM extending scenes to reach the floor) and prose-truncation (the LLM compressing scenes to fit the ceiling) pathologies. Commit `b28aead` (2026-05-06) removed the word-per-page guidelines from the page-render instructions on that basis; the archived SPEC-20 §H reassessment (2026-05-07) dropped the old per-bundle word-target fields for the same reason.

**Scope**: this discipline applies to LLM-facing prompts in the story-pipeline skills (Skill Category 2c per `.claude/skills/skill-audit/references/cross-skill-consistency.md`) — `story-character-profile`, `branching-story-bootstrap`, `branching-story-turn-cycle`, `branching-story-scene-plan`, `branching-story-scene-prose-attach`, `commitment-block-authoring`, `branching-story-health-audit`, `story-fact-promotion-to-canon`, and `story-promotion-closeout`. The Prose Craft Contract is hosted at `docs/prose-renderer-contract/prose-craft-contract.md` and inlined verbatim as the scene-plan Prose Craft Contract section. The Content Policy and Render-Time Instruction Template are hosted alongside at `docs/prose-renderer-contract/content-policy.md` and `docs/prose-renderer-contract/render-time-instruction.md` respectively, inlined as scene-plan Content Policy and Render-Time Instruction sections.

**Out of scope**: choice-button text length budgets (e.g., "5-15 words" for individual CHC text), INDEX preview excerpts (`first ~300 words of PG-<integer>.md` for display), prose-quality-density metrics (e.g., `filter_word_saturation per 100 words` as a filter-verb-ratio quality axis), and unrelated word-choice / vocabulary guidance are not word-quota mechanisms and remain outside this discipline.

The greenfield SLT schema (per `.claude/skills/_shared-templates/story-state-contract.md` §4.4) has no `stop_policy` field; no engine-side `max_words` ceiling exists anywhere in the story-pipeline surface. The prose renderer is external to the engine; runaway-defense is not the engine's concern.
