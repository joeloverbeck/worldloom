**Status**: COMPLETED

# **STCHAR Stable Character Authority vs. Temporal State Projection — Requirements-First Architecture Proposal**

## **Repository basis**

I followed the requested evidence pipeline. The live repository is `joeloverbeck/worldloom`; current `main` resolved to commit `29d63cc7e957d62e423da1c03c20a381478e1298`. All repository evidence below is from targeted file fetches at that SHA, not code search, snippets, clone state, uploaded stale copies, or assistant memory.

The uploaded manifest was used as file inventory. It lists the active story skills/templates, STCHAR-related schemas/validators, and tests that guided targeted fetch selection.

One important freshness note: the uploaded manifest lists active-looking specs such as `specs/SPEC-71-strip-stchar-tamper-hashes.md`, but direct fetch from the exact current `main` SHA returned 404, and current `specs/IMPLEMENTATION-ORDER.md` says there are **no active specs** and that SPEC-70 is completed/archived. I therefore did not use manifest-only spec paths as evidence.

---

## **1. Executive verdict**

**STCHAR temporal contamination is a real architecture bug.** It is not intended behavior. The current repository already tries to define `STCHAR` as stable story-local character authority, while routing page-local and branch-local state into `STSTAT`, `BEL`, `STPLAN`, `STEMO`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, `SE`, and page-plan §16a. The problem is that the current authoring instructions still leave enough ambiguity for bootstrap distillation to compress opening-page state into the durable STCHAR file.

**Semantic loss from opening-only filtering is also a real risk.** The repository’s new `source_operational_fact_map` is a good first-line guard, but it currently covers only the 10 structured `dramatic_core` fields. Stable operational material in CHAR body prose, capabilities, embodiment, relationships, signature behavior prose, and voice examples can still be silently dropped if the bootstrap prompt treats page-1 relevance as the filter.

**The fix is not to make STCHAR shorter.** The fix is to make STCHAR more precisely durable: rich, operational, story-local, and persistent, but not a root-page summary, not an opening-scene state packet, and not the place where current fear, bruises, exhaustion, tactical paralysis, or “girl on the bench” presentation live.

My recommendation is low-blast-radius first: tighten skill instructions and shared templates, add one small schema field for regeneration reason classification, add structural validators based on record references and lifecycle/provenance—not phrase heuristics—and add tests proving both sides of the boundary: no temporal contamination, no semantic loss.

---

## **2. Live repo evidence**

### **2.1 The governing architecture already supports the desired split**

`docs/FOUNDATIONS.md` frames Worldloom as a constrained model where facts must be routed through explicit authority, retrieval, context packets, and hard-gate rationale rather than inferred from prose. That supports the core principle here: STCHAR must not become a prose-like condensation of whatever happened on page 1.

The shared story-state contract already gives the right authority order: world canon first, story-bundle state second, rendered prose last. Rendered prose does not create state; story state and page plans do. The same file explicitly lists `STCHAR` as “stable story-local character authority,” while `STSTAT`, `BEL`, `STPLAN`, and `STEMO` are separate active-state classes.

The shared record schemas also define `STPLAN` as present tactical strategy and `STEMO` as present-causal affective pressure, while `STCHAR` is the hybrid markdown authority for stable persona, voice, appraisal, pressure behavior, relationship conduct, and prose/page-plan authority. It explicitly says STCHAR is not belief/fact/canon-promotion source authority.

The turn-cycle reinforces that division: when events change tactical agency or affective pressure, the workflow creates or supersedes `STPLAN` or `STEMO`, not STCHAR.

### **2.2 Page-plan §16a is already supposed to be the projection layer**

The page-plan reference says §16a is mandatory for relevant characters and that it must include the STENT/STCHAR binding, hashes, story-facing identity for this page, voice/dialogue projection, relevant appraisal rules, pressure behavior, relationship conduct, embodiment, planning tendency, prose must-show/must-not-imply, and anti-generic warnings. It also says §16a does **not** replace §5 entity status, §9 relationships/beliefs, §9b plans, §9c emotions, §16 cast material reality, or §17 style/register.

That is almost exactly the desired architecture. The remaining problem is wording: STCHAR’s own `Page-Plan Voice Block` is described as a “compact projection suitable for page-plan section 16a,” which can be read as “put a page packet into STCHAR.” It should instead be a stable, context-free seed that §16a projects through active state.

### **2.3 The STCHAR skill correctly forbids world-CHAR runtime authority, but underspecifies temporal durability**

`story-character-profile` says it is the only general-purpose story-pipeline surface allowed to read a world `CHAR-*` dossier for characterization, and normal runtime skills must consume active STCHAR, not CHAR. Good.

But its `regeneration_reason` argument currently allows “fidelity failure, story-state drift, or other reason,” and regenerate mode says changed story-local evidence may make the old profile stale. That is too broad. Ordinary `BEL`, `STPLAN`, `STEMO`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ` changes are not automatically STCHAR changes.

The same skill’s Phase 3 section list is otherwise strong: `Stable Persona Core`, `Emotional Appraisal Map`, `Pressure Behavior`, `Voice Bible`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Story-State Derivation Guide`, and `Prose Rendering Constraints` are exactly the right operational homes.

### **2.4 Bootstrap is the likely contamination point**

Bootstrap Phase 2 distills world CHAR into STCHAR before drafting opening `STENT`, `STSTAT`, `STINT`, `BEL`, `STPLAN`, `STEMO`, and other state records. The phase loads stable source sections, but it lacks an explicit “opening temporal state extraction” pass before STCHAR drafting. That makes it easy for the authoring model to mix story seed/opening situation with stable character authority.

Bootstrap Phase 4/5 already has legal homes for the problematic state: BEL, STENT/STSTAT, STINT, STPLAN, STEMO, SREL, THR, OBL, CNSQ, CLK, STSEC, STQ. The workflow does not need a new state class to fix the bug; it needs a sharper routing pass.

### **2.5 Source preservation is partially implemented but too narrow**

The `story-character-authority.schema.json` defines `source_operational_fact_map`, but its `source_field` enum covers only the 10 `dramatic_core` fields.

The `stchar_source_fact_coverage` validator likewise inspects only `source.parsed.dramatic_core` for those 10 fields. It ensures retained facts do not land only in `Source Distillation`, which is excellent, but it cannot protect stable source material outside `dramatic_core`.

The repository’s own protagonist-grade character engine treats those 10 fields as a rich dramatic core, but CHAR dossiers can also contain operational material in capabilities, embodiment, relationships, and scene behavior prose. Those should not be filtered out merely because page 1 does not need them.

### **2.6 Existing validators are structurally useful but do not catch this bug**

Current STCHAR validators check required body sections, required subsections, hash integrity, source fact coverage for structured dramatic_core, STENT/STCHAR reciprocity, active STCHAR presence, resolution, supersession, §16a packet hashes, prose-receipt STCHAR hash fidelity, and split world-CHAR runtime authority.

That is good infrastructure. The missing validators are not phrase scanners; they are structural checks: STCHAR operational sections should not cite active temporal record IDs except in provenance/audit contexts, regenerated STCHARs should have durable-change reason classifications, §16a packets that depend on current state should cite current state records, and source-preservation inventory should cover stable source material beyond dramatic_core.

### **2.7 Health audit already has the right surface for advisory detection**

The health-audit skill already has a Phase 2m “STCHAR authority health” section and an opt-in Phase 2n “source_drift” mode that compares STCHAR source hashes without automatically superseding STCHAR.

That is the correct migration surface: contaminated existing STCHARs should be detected by audit, then repaired through `story-character-profile regenerate` only when durable authority must change.

---

## **3. Research synthesis**

The external research points in the same direction as the repo architecture: stable identity and transient state must be separate, then composed at runtime.

Tabletop RPGs offer the simplest analogy. A character sheet records durable identity, abilities, proficiencies, and inventory-like capabilities; conditions are temporary states, and turn actions/rests change current state without rewriting the character’s underlying identity. Worldloom’s STCHAR should behave like the durable character authority, while `STSTAT`, `STEMO`, `STPLAN`, `BEL`, and related records behave like current conditions, resources, choices, and knowledge.

Interactive fiction world models make the same split. Inform models rooms, things, doors, inventory, attributes, and relations as mutable world state; the authored object identity does not become a transcript of the first scene where the player met the object. Worldloom’s `STENT`/`STSTAT`/`SREL`/`BEL` stack is much closer to an IF world model than to a static story synopsis.

Game AI architectures also separate stable knowledge/capabilities from runtime state. GOAP-style systems such as F.E.A.R. plan from goals and actions at runtime rather than hard-coding per-scene behavior, and Soar distinguishes working memory for the current situation from long-term procedural/semantic/episodic memory. Worldloom should use STCHAR as durable persona/capability/appraisal knowledge, while STPLAN/STEMO/BEL/STSTAT form the working state blackboard.

LLM agent research reaches the same conclusion. Generative Agents store observations in memory, reflect over them, and plan dynamically; they do not fold every current observation into a permanent persona card. For Worldloom, current “she is crying on the bench” belongs in event/status/emotion/page projection; only durable consolidation after branch events belongs in regenerated STCHAR.

Believable-agent appraisal models strengthen the routing rule for emotion. OCC-style and LLM appraisal architectures treat emotion as an appraisal of events, goals, and knowledge, not as a permanent character trait by default. Worldloom already has `STEMO` for present-causal affective pressure; it should be used for “fear after the chase,” while STCHAR retains stable appraisal patterns like “humiliation converts to bravado or contempt.”

Interactive narrative and drama-management research adds a caution: if a durable character authority absorbs page-local situation, it becomes a hidden drama manager. It starts pushing later branches back toward the opening premise, which is a railroading failure in a branching system. Storylets and drama managers can support authorial control, but they must stay responsive to player action and active state. STCHAR should provide character legality, not lock in page-1 destiny.

The synthesis: **STCHAR is the character bible, not the session log.** It should preserve durable story-local identity and dormant operational possibility; current state should live in the story-state blackboard; §16a should compose the two for the immediate page.

---

## **4. Target architecture**

### **4.1 Correct conceptual boundary**

| Surface | Correct role | Must not do |
| ----- | ----- | ----- |
| world `CHAR-*` | World-level durable character dossier. Source/provenance for story-local distillation. | Must not be operational runtime authority once STCHAR exists. |
| `STCHAR-*` | Durable story-local operational character model: stable identity, voice, appraisal, pressure behavior, agency tendencies, embodiment, capabilities/limits, relationship conduct, derivation guidance, dormant stable possibilities. | Must not summarize root page, opening scene, current emotion, current belief, current physical status, current tactical plan, or page-local prose. |
| `STENT` | Story-local entity/person binding, role, identity mirror, STCHAR binding. | Must not contain persona bible material. |
| `STSTAT` | Current physical/life/agency/location/status state. | Must not become stable personality. |
| `BEL` | Knowledge, belief, suspicion, misunderstanding, deception, visibility, access route. | Must not use STCHAR as epistemic evidence; STCHAR can explain conduct, not knowledge access. |
| `STPLAN` / `STINT` | Current intention and tactical plan. | Must not regenerate STCHAR merely because a plan changes. |
| `STEMO` | Current/transient affective pressure and appraisal result. | Must not freeze into STCHAR unless durably consolidated. |
| `SREL` | Current branch-local relationship state. | Must not overwrite stable relationship-specific disposition unless the durable relationship model changes. |
| `THR` / `OBL` / `CNSQ` / `CLK` | Current pressure, debt, consequence, staged causal clock. | Must not be collapsed into character bible. |
| `STSEC` / `STQ` | Current secret/setup/question state. | Must not be encoded as stable persona. |
| `SE` | Causal event. | Must not become STCHAR body prose except as audit/provenance for durable transformation. |
| `PG` | Page snapshot of active state. | Must not be copied into STCHAR. |
| page-plan §16a | Page-local projection of STCHAR + active state. | Must not replace STSTAT/BEL/STPLAN/STEMO/SREL/etc.; must not mutate STCHAR. |
| prose receipt | Validation artifact comparing prose to plan/STCHAR/state. | Must not become new authority. |

### **4.2 Durable STCHAR inclusion rule**

STCHAR should include stable operational character material even when dormant at story opening, provided it can lawfully matter in a later branch. The correct inclusion test is:

Could this stable material shape future voice, appraisal, conduct, pressure behavior, planning, relationships, embodiment, capabilities, limits, choices, or prose fidelity without requiring a new durable transformation?

If yes, include it in an operational STCHAR section. “Not relevant on page 1” is not an omission reason.

### **4.3 Temporal exclusion rule**

STCHAR must exclude ordinary current state. The correct exclusion test is:

Would this fact be false, stale, or branch-dependent after a different choice, a later page, or a sibling branch?

If yes, route it to state records and page-plan §16a. Only retain a stable dispositional equivalent in STCHAR when the durable character model supports it.

Good STCHAR transformation:

Under humiliation or predatory attention, she converts shame into bravado, contempt, or a bright performative mask until the pressure exceeds her capacity.

Bad STCHAR contamination:

Today, after crying in the park, her bright voice keeps cracking back toward the scared girl underneath.

---

## **5. Routing the problematic examples**

| Problematic content | Correct home | Stable STCHAR equivalent, only if true |
| ----- | ----- | ----- |
| Bruise from mother that morning | `STSTAT` current physical condition; `SE` cause if story-local event; possible `BEL`/`THR`/`CNSQ` if it creates risk. | “Family humiliation or bodily intimidation trains her to hide injury behind performance.” |
| Being chased that day | `SE` if represented; `THR` active threat; `STEMO` fear; `BEL` suspicion/knowledge; possibly `CLK` if pursuit pressure continues. | “Predatory pursuit makes her assess exits, distance, and male attention defensively.” |
| Current crying exhaustion | `STEMO` plus `STSTAT` fatigue/visibility; §16a/prose rendering. | “When overwhelmed, she withdraws from public view before reassembling her mask.” |
| Current fear of cornering | `STEMO`; `BEL` if tied to a specific person/group; `STPLAN` if it shapes escape tactics. | “Cornering triggers flight-readiness and hostile appraisal before trust can form.” |
| “She is the despondent girl on the bench Jon sees” | `PG`/`STSTAT`/`STLOC`; page-plan §16a identity-for-this-page; prose. | None, unless “bench-girl presentation” is a recurring stable public mask, which this sounds not to be. |
| Current voice cracking because present fear | page-plan §16a projected from stable voice + active `STEMO`; prose receipt. | Stable voice bible may say her bright register fractures under high shame/fear. |
| Current inability to work or go home | `STPLAN`/`STINT` blockage; `THR`/`OBL`/`CNSQ`; `BEL`; `STSTAT` location/agency. | “When both safety and obligation conflict, she stalls in hidden liminal spaces before choosing.” |
| Current distrust of male attention after a recent pursuit | `STEMO`; `BEL`; `SREL` if counterpart-specific; `THR` if active. | “Unsolicited male attention is appraised first as status threat or predatory risk.” |

---

## **6. Recommended file-by-file changes**

These are proposal-level replacement/addition sections, not diffs.

### **6.1 `.claude/skills/story-character-profile/SKILL.md`**

#### **Replace the argument description for `regeneration_reason`**

 - name: regeneration_reason  
   description: "regenerate input: durable profile-change reason. Valid reasons are source world CHAR material change, durable branch-local character transformation, repeated profile fidelity failure showing the profile is wrong or underpowered, promotion of a story-local character to durable authority, or repair of stable source material omitted from the prior STCHAR. Ordinary changes to STEMO, BEL, STPLAN, SREL, STSTAT, STOBJ, STLOC, THR, OBL, CNSQ, CLK, STSEC, STQ, PG, SE, or page-local prose are not STCHAR regeneration reasons unless they have durably consolidated into a changed character model."  
   required: false

#### **Add this section after “Modes”**

## Durable-Authority Boundary

`STCHAR` is a durable story-local character bible. It is not a root-page summary, opening-scene summary, compressed current-state packet, prose synopsis, or substitute for active story-state records.

A valid `STCHAR` may include stable operational material that can shape future voice, conduct, appraisal, pressure behavior, agency, relationship behavior, perception, embodiment, capabilities, limits, choices, `STINT`, `STPLAN`, `STEMO`, `SREL`, page-plan §16a packets, and prose-fidelity checks.

A valid `STCHAR` must exclude ordinary transient state: current wounds, current location, current crying/exhaustion, current fear, current tactical paralysis, current beliefs, current relationship state, current secrets, current clocks, current obligations, current page presentation, and current prose-rendering instructions. Those belong in `STSTAT`, `STOBJ`, `STLOC`, `SE`, `BEL`, `STPLAN`, `STINT`, `STEMO`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, page-plan §16a, and prose receipts.

When a transient fact reveals a durable disposition, transform only the durable equivalent into STCHAR.

Examples:

- Durable STCHAR: “Under humiliation, she converts shame into bravado, contempt, or performative brightness.”  
- Transient state, not STCHAR: “Today her bravado is worn through after crying in the park.”  
- Durable STCHAR: “Unsolicited male attention is appraised first as status threat or predatory risk.”  
- Transient state, not STCHAR: “After being chased this afternoon, she distrusts Jon’s attention.”  
- Durable STCHAR: “When cornered, she scans exits before answering.”  
- Transient state, not STCHAR: “She is the despondent girl on the bench Jon sees.”

Opening-page relevance is never the inclusion test. Stable operational material may be dormant at story opening and still belongs in STCHAR if it could lawfully matter in later branches.

#### **Replace the `Page-Plan Voice Block` section requirement**

- `Page-Plan Voice Block`: stable, context-free reusable voice-authority seed for page-plan §16a. This section is the source of `voice_block_hash`. It must describe durable voice behavior, dialogue constraints, silence behavior, pressure shifts, register, rhythm, taboo language, and anti-generic warnings that remain valid across branches until durable profile regeneration. It must not mention the current page, opening scene, current event, current emotional state, current physical status, active page ids, active event ids, active belief/plan/emotion/status records, or page-specific voice modulation. Page-specific modulation belongs in page-plan §16a, where it must be grounded in active `STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, and `SE` records as applicable.

#### **Add this under `## Source Distillation`**

### Stable Source Material Inventory

For `source_kind: world_char`, complete a stable-source inventory before drafting operational sections. This inventory is an authoring hard gate; it may be preserved in `## Source Distillation` or `## Validation / Audit Anchors`.

Inventory every loaded source area that contains stable operational character material, not only the 10 structured `dramatic_core` fields:

| source_area | stable operational material | disposition | operational_home | rationale |  
|---|---|---|---|---|  
| dramatic_core.<field> | <fact or compressed cluster> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | <STCHAR H2 or null> | <required for omitted/story_irrelevant; optional otherwise> |  
| Capabilities | <capability, cost, access limit, embodied affordance> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | Agency and Planning Tendencies / Perception and Embodiment / Prose Rendering Constraints | <rationale> |  
| Signature Scene Behavior | <stable repeated behavior> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | Pressure Behavior / Prose Rendering Constraints | <rationale> |  
| Relationships | <stable relation-specific behavior or charge> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | Relationship-Specific Behavior | <rationale> |  
| Voice / dialogue prose | <stable voice rule> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | Voice Bible / Dialogue Authority or Page-Plan Voice Block | <rationale> |  
| Embodiment / perception | <stable sensory, bodily, access, or limit rule> | copied / transformed / compressed / omitted_with_rationale / story_irrelevant | Perception and Embodiment | <rationale> |

`story_irrelevant` is rare at bootstrap. It means the material is outside the story premise, unavailable under the story’s allowed scope, incompatible with the story’s content constraints, or purely non-operational trivia. It does not mean “not needed on page 1.”

A retained source fact must land in an operational STCHAR home. `Source Distillation` can record provenance and compression choices, but it is not an operational home for retained character authority.

#### **Replace the `regenerate` mode description**

### regenerate

Supersede an existing `STCHAR-*` with a from-zero durable-profile rebuild.

Use this only when the durable character model changes or is proven wrong/underpowered:

- `source_world_char_material_change` — the source world `CHAR-*` changed materially and the story-local durable model should refresh.  
- `durable_branch_transformation` — accumulated branch events have durably consolidated into changed persona, voice, appraisal, pressure behavior, agency tendency, relationship behavior, embodiment, capabilities, or limits.  
- `profile_fidelity_failure` — repeated page-plan/prose receipts show the profile is wrong, too vague, or underpowered as durable authority.  
- `story_local_character_promotion` — a story-local entity becomes important enough to need durable character authority.  
- `stable_source_material_omission_repair` — the current STCHAR omitted stable source material that later pages lawfully need.

Do not regenerate STCHAR for ordinary current-state changes:

- a new or superseded `STEMO`  
- a new or superseded `BEL`  
- a new or superseded `STPLAN` / `STINT`  
- a new or superseded `SREL`  
- a new or superseded `STSTAT`, `STOBJ`, or `STLOC`  
- an active `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ`  
- a page-local voice modulation  
- a newly visible bruise, current fear, current exhaustion, current suspicion, or current tactical blockage

Those are routed through story-state records and page-plan §16a. They become regeneration-worthy only after durable consolidation changes the character model.  
---

### **6.2 `.claude/skills/branching-story-bootstrap/SKILL.md`**

#### **Add a new phase between current Phase 1 and Phase 2**

## Phase 1b: Extract Opening Temporal State and Build the Distillation Boundary Ledger

Before drafting any `STCHAR`, separate durable character authority from opening temporal state.

Create a working-memory Distillation Boundary Ledger with these categories:

| Category | Route |  
|---|---|  
| Stable persona, voice, appraisal, pressure behavior, agency tendency, relationship-specific conduct, embodiment, capabilities, limits, and dormant operational source material | `STCHAR` |  
| Current physical condition, injury, clothing state, fatigue, location, concealment, ability to act | `STSTAT`, `STOBJ`, `STLOC`, `PG.state_snapshot`, page-plan §5/§6/§16 |  
| Opening event or recent causal incident | `SE`, `THR`, `CNSQ`, `CLK`, `STQ`, `STSEC` as applicable |  
| Current affective pressure, fear, shame, anger, exhaustion, suppression, dissociation | `STEMO` |  
| Knowledge, misunderstanding, suspicion, distrust, lie, uncertainty, witness access | `BEL` |  
| Current intention, tactical blockage, next step, fallback, inability to proceed | `STINT`, `STPLAN` |  
| Current relationship state or branch-local change in relation | `SREL` |  
| Active obligation, threat, consequence, debt, staged pressure | `OBL`, `THR`, `CNSQ`, `CLK` |  
| Page-local presentation, “who the player/protagonist sees,” current voice modulation, prose must-show for this page | page-plan §16a and prose plan sections |  
| Provenance, source compression, omission rationale, validation trace | `Source Distillation`, `Stable Source Material Inventory`, `Validation / Audit Anchors` |

The ledger is not a persistent schema field. It is a required prompt-process hard gate. Phase 2 may draft STCHAR only from the `Stable -> STCHAR` row plus stable equivalents derived from transient facts. Phase 4/5 must consume the temporal rows to create the initial story-state records.

Opening-page relevance is not an omission criterion. At bootstrap, future branches are unknown; stable operational source material should be retained unless it is genuinely outside the story scope or non-operational trivia.

#### **Replace the Phase 2 STCHAR distillation rule**

## Phase 2: Create Durable Story-Local Character Authority (`STCHAR`)

Draft `STCHAR` only from stable story-local character authority.

For each selected cast member, read the source `CHAR-*` dossier sections needed for durable distillation: identity, embodied constraints, voice, stable dispositions, relationships, pressure behavior, known canon limits, `dramatic_core` all 10 fields, `## Capabilities`, `## Signature Scene Behavior`, and any other loaded section containing stable operational character material.

Do not copy opening temporal state into STCHAR. Do not include current page location, current physical injury, current fear/exhaustion, current belief, current tactical paralysis, current pursuit, current relationship shift, current “seen by X” presentation, or current page-specific voice modulation. Route those through the Distillation Boundary Ledger to Phase 4/5 records and Phase 8 §16a.

For every transient opening fact that seems character-relevant, decide whether there is a stable dispositional equivalent:

- If yes, write only the durable equivalent into an operational STCHAR section.  
- If no, route the fact entirely to story-state records or page-plan §16a.

For every `source_kind: world_char` profile, satisfy both preservation layers:

1. `source_operational_fact_map` covers each present structured `dramatic_core` field.  
2. `Stable Source Material Inventory` covers stable operational material from all loaded CHAR sections, including capabilities, signature scene behavior, embodiment, voice, relationships, and relevant body prose.

`story_irrelevant` at bootstrap requires a strong rationale: outside story scope, blocked by content constraints, unavailable under the premise, or non-operational trivia. “Not needed on the root page” is invalid.

#### **Add this to Phase 4/5 initial state creation**

Consume the Distillation Boundary Ledger. Every opening-current fact identified as temporal state must be represented in the appropriate initial record class before root `PG` and page-plan authoring:

- injury / fatigue / visibility / current location / immediate agency -> `STSTAT`, `STOBJ`, `STLOC`, `PG.state_snapshot`  
- recent pursuit or opening incident -> `SE`, `THR`, `CNSQ`, `CLK` when ongoing pressure exists  
- fear, shame, exhaustion, dissociation, bravado failing under pressure -> `STEMO`  
- distrust, suspicion, misunderstanding, knowledge, lie, witness access -> `BEL`  
- inability to work, go home, speak, flee, or approach -> `STPLAN` / `STINT`  
- active relationship change or counterpart-specific current stance -> `SREL`  
- page-local “seen as” presentation and current voice modulation -> root page-plan §16a

If a fact is not durable enough for STCHAR and no state record is created for it, it must not appear in the root page plan as an unexplained assertion.

#### **Add this to Phase 8 root page plan**

Root page-plan §16a is the first page-local projection of STCHAR plus active opening state. It may mention current fear, bruises, exhaustion, location, tactical blockage, current distrust, or page-specific voice fracture only when grounded in active `STEMO`, `BEL`, `STPLAN`, `STSTAT`, `STOBJ`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `SE`, or `PG` records.

Do not repair missing state by copying temporal prose into STCHAR. Create the state record or omit the claim.  
---

### **6.3 `.claude/skills/_shared-templates/story-state-contract.md`**

#### **Replace the §16a conceptual note with this**

### §16a STCHAR-derived character authority packets

§16a is page-local projection, not durable authority. It composes:

1. stable `STCHAR` authority;  
2. active current story-state records in the page snapshot;  
3. this page’s rendering needs.

`STCHAR` supplies stable voice, conduct, appraisal, pressure behavior, relationship behavior, perception, embodiment, agency tendencies, capabilities, limits, and anti-generic constraints. Active records supply current physical condition, current belief, current plan, current emotion, current relationship state, current pressure, current secret/question/clock state, current location, current objects, and the current causal event.

A §16a packet must not imply that current state lives inside STCHAR. When page-local modulation depends on current state, name the active records that ground the modulation.

For each present viewpoint character, speaker, major actor, direct target, emotionally salient character, or character whose behavior/voice/appraisal/relationship conduct/perception/embodiment/agency materially shapes the page, include:

- `STENT` / `STCHAR` / display name  
- Required because: viewpoint / speaker / major_actor / direct_target / emotionally_salient / behavior_shaping / offstage_causal  
- Hashes: `profile_hash`, `voice_block_hash`, `page_packet_hash`  
- Stable STCHAR seed used: stable identity, stable voice seed, appraisal rule, pressure behavior, relationship conduct, embodiment, agency tendency, capabilities/limits, or prose constraint  
- Current-state grounding records: active `STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `SE`, or `PG` ids when page-local modulation depends on them  
- Page-local projection: what the prose renderer should show on this page after combining the stable STCHAR seed with current state  
- Prose must-show  
- Prose must-not-imply  
- Anti-generic warnings

If no current-state record is needed for the packet, write `Current-state grounding records: none; stable STCHAR authority only.` Do not cite world `CHAR-*` as operational page-plan characterization authority.  
---

### **6.4 `.claude/skills/_shared-templates/story-record-schemas.md`**

#### **Add this to the STCHAR record schema prose**

`STCHAR` is durable story-local character authority. It must not be used as a root-page summary, opening-scene summary, or compressed current-state packet. Opening or branch-current facts belong to `STSTAT`, `STOBJ`, `STLOC`, `SE`, `BEL`, `STPLAN`, `STINT`, `STEMO`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, and page-plan §16a.

Stable source material should be preserved even when dormant at story opening if it can lawfully shape later voice, conduct, appraisal, pressure behavior, agency, relationship behavior, embodiment, capabilities, limits, choices, plans, emotions, relationship records, page-plan packets, or prose fidelity.

#### **Add this frontmatter field to the STCHAR example**

regeneration_reason_class: null | source_world_char_material_change | durable_branch_transformation | profile_fidelity_failure | story_local_character_promotion | stable_source_material_omission_repair

#### **Add this field rule**

`regeneration_reason_class` is required and non-null when `source_kind: regenerated` or `supersedes` is non-null. It must classify a durable profile-change reason. Ordinary updates to active `STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `PG`, `SE`, or page-local prose are not valid reason classes unless the evidence has durably consolidated into changed persona, voice, appraisal, pressure behavior, agency tendency, relationship behavior, embodiment, capabilities, or limits.  
---

### **6.5 `.claude/skills/branching-story-turn-cycle/references/phase-7-page-plan.md`**

#### **Replace the §16a paragraph with this**

§16a is mandatory when any viewpoint character, speaker, major actor, direct target, emotionally salient character, or character whose behavior/voice/appraisal/relationship conduct/perception/embodiment/agency materially shapes the page is present.

For each such character, author a page-local packet that projects stable STCHAR authority through active current state. Include: `STENT` / `STCHAR` / display name; required-because reason; `profile_hash`, `voice_block_hash`, and page-local `page_packet_hash`; stable STCHAR seed used; current-state grounding records when page-local modulation depends on active `STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`, `SE`, or `PG`; page-local voice/conduct/appraisal projection; relationship-specific conduct; perception and embodiment constraints; agency/planning tendency; prose must-show; prose must-not-imply; and anti-generic warnings.

Use the active STCHAR profile as stable authority. Use active story-state records for current physical, emotional, epistemic, tactical, social, pressure, secret, question, object, and location state. Do not cite world `CHAR-*` as operational page-plan characterization authority. Do not imply that current state lives inside STCHAR.  
---

### **6.6 `.claude/skills/branching-story-health-audit/SKILL.md`**

#### **Add these findings to Phase 2m**

- `stchar_temporal_authority_contamination` — an operational STCHAR section or `Page-Plan Voice Block` cites active temporal story-state records as durable authority, or otherwise uses `PG`, `SE`, `STEMO`, `BEL`, `STPLAN`, `STINT`, `STSTAT`, `STOBJ`, `STLOC`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ` as if current state belongs in the durable profile. Allowed contexts are frontmatter provenance fields, `Source Distillation`, `story_local_inputs_used`, and `Validation / Audit Anchors` when the record is clearly cited as evidence/provenance rather than operational durable authority. WARNING for legacy untouched profiles; ERROR for newly created, regenerated, or touched STCHAR profiles. `repair_kind: turn_repair` when missing state records must be created; `repair_kind: prose_revision` when only §16a/page-plan text is wrong; `repair_kind: branch_flag` when durable regeneration is needed.

- `stchar_semantic_loss_risk` — a `source_kind: world_char` STCHAR lacks a Stable Source Material Inventory, maps retained stable source material only to `Source Distillation`, or uses `story_irrelevant` at bootstrap with a rationale equivalent to opening-page irrelevance. WARNING for legacy untouched profiles; ERROR for newly created, regenerated, or touched STCHAR profiles. `repair_kind: branch_flag` unless a specific later page already needs the omitted durable material, in which case recommend `story-character-profile regenerate`.

- `stchar_regeneration_reason_invalid` — a regenerated/superseding STCHAR lacks a durable `regeneration_reason_class`, or the reason is an ordinary current-state change rather than source material change, durable branch transformation, profile fidelity failure, story-local character promotion, or stable source material omission repair. ERROR for new/touched regenerated profiles. `repair_kind: branch_flag`.  
---

### **6.7 `tools/validators/src/schemas/story-character-authority.schema.json`**

#### **Add this property**

"regeneration_reason_class": {  
 "type": ["string", "null"],  
 "enum": [  
   "source_world_char_material_change",  
   "durable_branch_transformation",  
   "profile_fidelity_failure",  
   "story_local_character_promotion",  
   "stable_source_material_omission_repair",  
   null  
 ]  
}

#### **Add this conditional rule**

{  
 "if": {  
   "anyOf": [  
     {  
       "properties": {  
         "source_kind": { "const": "regenerated" }  
       },  
       "required": ["source_kind"]  
     },  
     {  
       "properties": {  
         "supersedes": { "type": "string" }  
       },  
       "required": ["supersedes"]  
     }  
   ]  
 },  
 "then": {  
   "properties": {  
     "regeneration_reason_class": {  
       "type": "string",  
       "enum": [  
         "source_world_char_material_change",  
         "durable_branch_transformation",  
         "profile_fidelity_failure",  
         "story_local_character_promotion",  
         "stable_source_material_omission_repair"  
       ]  
     }  
   },  
   "required": ["regeneration_reason_class"]  
 }  
}

This is the only schema expansion I recommend immediately. It has small blast radius and prevents the most dangerous lifecycle ambiguity.

---

### **6.8 `tools/validators/src/structural/stchar-body-integrity.ts`**

#### **Add this required subsection for new/touched records**

{  
 section: "Source Distillation",  
 subsections: [  
   "Stable Source Material Inventory"  
 ]  
}

Keep the same compatibility policy already used for newer subsections: fail on pre-apply/touched records, warn for untouched legacy profiles.

---

### **6.9 New validator: `tools/validators/src/structural/stchar-temporal-reference-boundary.ts`**

This validator should be structural-reference-based, not phrase-based.

#### **Complete validator contract**

Validator name: `stchar_temporal_reference_boundary`

Severity:  
- fail for pre-apply or touched STCHAR records  
- warn for untouched legacy STCHAR records during migration window

Applies when:  
- a patch creates, supersedes, repairs, or touches STCHAR  
- full-world validation includes story-character records

Rule:  
- Inspect the STCHAR body by H2 section.  
- In operational durable sections, disallow references to active temporal story-state record classes:  
 `PG`, `SE`, `STEMO`, `BEL`, `STPLAN`, `STINT`, `STSTAT`, `STOBJ`, `STLOC`, `SREL`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, `STQ`.  
- Operational durable sections are:  
 `Story-Facing Identity`,  
 `Stable Persona Core`,  
 `Emotional Appraisal Map`,  
 `Pressure Behavior`,  
 `Voice Bible / Dialogue Authority`,  
 `Page-Plan Voice Block`,  
 `Perception and Embodiment`,  
 `Agency and Planning Tendencies`,  
 `Relationship-Specific Behavior`,  
 `Story-State Derivation Guide`,  
 `Prose Rendering Constraints`.

Allowed contexts:  
- frontmatter fields such as `story_local_inputs_used`, `generated_at_page`, `supersedes`  
- `Source Distillation`  
- `Validation / Audit Anchors`  
- explicit provenance/audit wording inside those allowed sections only

Failure message:  
`<STCHAR-id> operational section '<section>' cites temporal story-state record <record-id> as durable character authority. Route current state to the appropriate story-state record and project it through page-plan §16a.`

Suggested fix:  
`Move <record-id>-specific current state to STSTAT/BEL/STPLAN/STEMO/SREL/etc. and retain only a stable dispositional equivalent in STCHAR when warranted.`

This uses record-class references, not temporal words like “today,” “now,” or “opening.” It will not flag “at the opening of the gala” unless that phrase cites a current-state record in an operational STCHAR section.

---

### **6.10 New validator: `tools/validators/src/structural/stchar-regeneration-reason-integrity.ts`**

#### **Complete validator contract**

Validator name: `stchar_regeneration_reason_integrity`

Rule:  
- If `source_kind: regenerated` or `supersedes` is non-null, `regeneration_reason_class` must be one of:  
 - `source_world_char_material_change`  
 - `durable_branch_transformation`  
 - `profile_fidelity_failure`  
 - `story_local_character_promotion`  
 - `stable_source_material_omission_repair`  
- If `regeneration_reason_class` is `durable_branch_transformation`, the STCHAR `story_local_inputs_used[]` or `Validation / Audit Anchors` must cite at least one story-local evidence record.  
- If `regeneration_reason_class` is `source_world_char_material_change`, `source_char_id` and `source_char_hash` must be non-null and current source-drift evidence must be available.  
- If `regeneration_reason_class` is `profile_fidelity_failure`, the profile must cite prose receipt or page-plan fidelity evidence.  
- If `regeneration_reason_class` is `stable_source_material_omission_repair`, the profile must cite source material inventory or prior coverage failure evidence.  
- A regenerated STCHAR whose evidence consists only of ordinary active-state records without durable-consolidation rationale emits `ordinary_state_not_regeneration_reason`.

This validator does not judge prose semantics. It checks that the lifecycle event is classified and structurally evidenced.  
---

### **6.11 New or expanded validator: `stchar-source-material-inventory-integrity.ts`**

#### **Complete validator contract**

Validator name: `stchar_source_material_inventory_integrity`

Rule:  
- For `source_kind: world_char`, require a non-empty `### Stable Source Material Inventory` subsection under `## Source Distillation` on new/touched STCHAR records.  
- Inventory rows must name:  
 - `source_area`  
 - `disposition`  
 - `operational_home`  
 - `rationale` when disposition is `omitted_with_rationale` or `story_irrelevant`  
- Valid retained operational homes are the same operational STCHAR H2s used by `stchar_source_fact_coverage`; `Source Distillation` is not a retained operational home.  
- At bootstrap, `story_irrelevant` must include one of these rationale categories:  
 - `outside_story_scope`  
 - `content_constraint`  
 - `premise_incompatible`  
 - `non_operational_trivia`  
 - `duplicate_of_retained_material`  
- `opening_not_relevant`, `not_needed_on_page_1`, `not_in_root_scene`, and equivalent rationale categories are invalid as structured categories.

This validator checks inventory shape and rationale categories. It does not attempt semantic phrase detection in free prose.

The `story_irrelevant` rationale category should be structured in the inventory row, not inferred by regex from a sentence.

---

### **6.12 Enhance `tools/validators/src/structural/page-plan-stchar-packet-integrity.ts`**

#### **Add these checks**

1. Parse `Required because:` as a comma- or slash-separated set of reason tokens, not a single raw string.  
2. Require a voice/dialogue authority line when the reason set includes `speaker` or `viewpoint`, even if the line also includes `major_actor` or another reason.  
3. If the packet contains a page-local modulation line that cites current fear, belief, plan, physical state, relationship state, pressure, secret, question, clock, object, location, or event via record IDs, each cited current-state record must:  
  - resolve in the same story bundle;  
  - be active in `PG.state_snapshot.active_records` for that page, unless the cited record is the page’s own `SE` or `PG`;  
  - be in an allowed current-state class, not a world `CHAR`.  
4. If the packet says `Current-state grounding records: none`, then it must not cite current-state record IDs elsewhere in the packet.  
5. If the packet cites active `STEMO`, `BEL`, `STPLAN`, `SREL`, `STSTAT`, `STOBJ`, `STLOC`, `THR`, `OBL`, `CNSQ`, `CLK`, `STSEC`, or `STQ`, the page-local projection must keep those references in §16a and must not require any STCHAR hash change.

Again, this is structural reference enforcement, not phrase heuristics.

---

### **6.13 Branch-aware STCHAR supersession fix**

`stchar_supersession_integrity` currently reasons by page ordinal. That is unsafe for branch-local durable transformations: if branch A regenerates STCHAR at `PG-12`, sibling branch B at `PG-13` should not necessarily be forced to use the regenerated profile unless `PG-12` is an ancestor of B’s page. The existing validator checks page ordinal and supersession ordinal.

#### **Replacement rule**

An inactive/superseded STCHAR may remain active on pages that are not descendants of the supersession page or branch-local supersession event. It must not remain active on the supersession branch after the supersession point.

If the successor is global to the whole story bundle, mark that explicitly through regeneration reason/evidence and require all later branches to use it. If the successor is branch-local durable transformation, enforce only along descendant pages of the supersession event.

This may require adding branch/page ancestry utilities rather than using ordinal alone.

---

## **7. Validator and test plan**

### **7.1 Validators to add or modify**

| Validator | Type | Purpose | Phrase heuristic? |
| ----- | ----- | ----- | ----- |
| `stchar_temporal_reference_boundary` | new structural | Prevent operational STCHAR sections from citing temporal state record IDs as durable authority. | No |
| `stchar_regeneration_reason_integrity` | new lifecycle/schema | Require durable reason class and evidence for regeneration. | No |
| `stchar_source_material_inventory_integrity` | new structural/provenance | Require inventory for source material beyond dramatic_core. | No |
| `stchar_body_integrity` | modify | Require `Stable Source Material Inventory` subsection for new/touched world-char STCHAR. | No |
| `stchar_source_fact_coverage` | modify lightly | Keep 10 dramatic_core coverage; add stricter allowed omission categories if schema supports structured categories. | No |
| `page_plan_stchar_packet_integrity` | modify | Require current-state grounding records when §16a projection depends on current state; parse multi-reason packets. | No |
| `stchar_supersession_integrity` | modify | Make supersession branch-aware. | No |
| `no_char_authority_in_story_runtime` | keep | Already blocks runtime world-CHAR authority leaks. | No |

### **7.2 Tests to add**

#### **`tools/validators/tests/structural/stchar-temporal-reference-boundary.test.ts`**

Positive cases:

- STCHAR `Validation / Audit Anchors` may cite `SE-1`, `PG-1`, `STEMO-1` as evidence/provenance.  
- STCHAR `Source Distillation` may cite `PG-1` as generation provenance when non-operational.  
- STCHAR stable section may say “under humiliation, she turns shame into bravado” without any record IDs.

Negative cases:

- `Page-Plan Voice Block` cites `STEMO-1` as voice state.  
- `Stable Persona Core` says “as of PG-1 she is unable to go home.”  
- `Pressure Behavior` cites `BEL-2` or `STPLAN-4` as current authority.

#### **`tools/validators/tests/structural/stchar-regeneration-reason-integrity.test.ts`**

Positive cases:

- `source_kind: regenerated`, `supersedes: STCHAR-1`, `regeneration_reason_class: durable_branch_transformation`, with `story_local_inputs_used: [SE-9, SREL-4, STEMO-7]` and audit anchor explaining durable consolidation.  
- `profile_fidelity_failure` with prose receipt evidence.  
- `stable_source_material_omission_repair` with inventory evidence.

Negative cases:

- regenerated STCHAR missing reason class.  
- reason class null with supersedes non-null.  
- reason says ordinary `STEMO` update without durable-consolidation evidence.

#### **Extend `stchar-source-fact-coverage.test.ts`**

Add:

- retained stable material from `Capabilities` cannot be recorded only in Source Distillation inventory.  
- `story_irrelevant` with rationale category `not_needed_on_page_1` fails for bootstrap.  
- `story_irrelevant` with `non_operational_trivia` passes when operational_home is null and rationale is explicit.

#### **Extend `stchar-body-integrity.test.ts`**

Add:

- new/touched world-char STCHAR missing `### Stable Source Material Inventory` fails.  
- untouched legacy STCHAR missing inventory warns.  
- story-local STCHAR may omit inventory only when source_kind is not world_char.

#### **Extend `page-plan-stchar-packet-integrity.test.ts`**

Add:

- `Required because: speaker, major_actor` still requires voice block.  
- §16a packet citing `STEMO-1` passes only when `STEMO-1` is active in the page snapshot.  
- §16a packet citing inactive `BEL-2` fails.  
- §16a packet with `Current-state grounding records: none` fails if packet text cites `STPLAN-1`.  
- two pages can project different active `STEMO` records from the same STCHAR without changing `profile_hash` or `voice_block_hash`.

#### **Add bootstrap/skill-level golden tests or prompt-fixture tests**

These do not need brittle semantic validators. They can assert generated records and sections:

- Given a source CHAR with dormant stable capability not needed on root page, bootstrap STCHAR includes it in `Agency and Planning Tendencies` or `Perception and Embodiment`.  
- Given opening seed with bruise/chase/crying/fear, generated initial records include `STSTAT`/`STEMO`/`BEL`/`THR` as appropriate, and STCHAR operational sections do not cite those record IDs.  
- Root page-plan §16a includes active `STEMO` and `STSTAT` current modulation while STCHAR hashes remain stable.

#### **Branch-local supersession test**

- Branch A regenerates `STCHAR-2` from `STCHAR-1` at `PG-6`.  
- Descendant `PG-7` in branch A must use `STCHAR-2`.  
- Sibling branch page `PG-8`, whose ancestor path does not include `PG-6`, may still use `STCHAR-1`.

This test is essential before allowing branch-local durable transformation.

---

## **8. Migration and remediation plan**

### **8.1 Lowest-blast-radius migration**

Do not immediately regenerate every existing STCHAR. That would conflate schema migration with character transformation and risk breaking branch history.

Recommended path:

1. **Documentation/skill hardening first.** Update the skills and templates so new profiles stop contaminating STCHAR.  
2. **Warn-mode audit for legacy profiles.** Add `stchar_temporal_authority_contamination` and `stchar_semantic_loss_risk` to health audit as warnings for untouched legacy files.  
3. **Fail only for new/touched STCHAR.** New, regenerated, or directly repaired STCHAR profiles must pass the new boundary checks.  
4. **Targeted remediation.** Only regenerate contaminated STCHARs when the durable model itself is polluted or missing stable material. Do not regenerate just because state records are missing; create state records or repair page plans instead.  
5. **Hash/restamp only after semantic repair.** If body text changes, recompute `profile_hash` and `voice_block_hash`; then restamp §16a packets as needed.

### **8.2 Existing contaminated profiles**

For each STCHAR:

1. Run health audit structural mode with the new STCHAR authority health findings.  
2. Classify each problem:  
   * **Temporal contamination only:** move current facts to state records/page plans; regenerate STCHAR only if contamination is embedded in durable sections and cannot be cleanly removed via authorized repair.  
   * **Semantic loss:** regenerate STCHAR if stable source material was omitted and later pages need it, or if bootstrap omission was objectively wrong.  
   * **Hash/section-only issue:** repair body/schema/hash without changing durable model if possible.  
3. Create a remediation note or RSP card when repair requires a turn-cycle state event or page-plan/prose revision.

### **8.3 Red Bunny**

The uploaded manifest shows Red Bunny references in archived reports/tickets, but I did not fetch any active current-main Red Bunny story bundle. The active current-main MCP fixture I fetched is `opening-bells`, not Red Bunny.

Recommendation: do not rely on archived Red Bunny reports as current truth. If Red Bunny is an active bundle outside the fetched evidence, retrieve its live story files from current `main` and run the new audit. If contaminated, repair it as a normal migrated story bundle: state records/page plans first, STCHAR regeneration only for durable-profile repair.

### **8.4 Grandfathering policy**

* Legacy STCHAR without `Stable Source Material Inventory`: warning.  
* Legacy STCHAR with temporal record IDs in operational sections: warning until touched.  
* New/touched STCHAR with temporal record IDs in operational sections: fail.  
* New/touched regenerated STCHAR without durable reason class: fail.  
* Existing page plans with old §16a packet format: warn unless touched; new page plans must use current-state grounding records.

---

## **9. Blast-radius analysis**

| Change | Files affected | Runtime/data impact | Migration cost | Opinion |
| ----- | ----- | ----- | ----- | ----- |
| Skill wording hardening in `story-character-profile` | 1 | No schema/data change | Low | Do first. Biggest value per risk. |
| Bootstrap Distillation Boundary Ledger | 1 | No schema/data change; changes generation behavior | Low | Essential. This is where contamination likely enters. |
| Shared contract §16a rewording | 1-2 | Page-plan authoring changes | Low | Essential. Clarifies projection layer. |
| Add `regeneration_reason_class` | schema + patch-engine op specs + tests | New optional/null field; required for regenerated | Medium | Worth it. Prevents lifecycle abuse. |
| Stable Source Material Inventory subsection | skill + body validator + tests | New/touched STCHAR body requirement | Medium | Worth it. Solves semantic loss beyond dramatic_core. |
| Temporal reference boundary validator | new validator + tests + registry | Fails new/touched contaminated STCHAR | Medium | Worth it if ID-reference-based only. |
| §16a current-state grounding validation | page-plan validator + tests | New page plans stricter | Medium | Worth it. Avoids hidden page-state projection. |
| Branch-aware STCHAR supersession | validator + tests + branch utilities | More correct branch behavior | Medium-high | Important before branch-local durable transformation. |
| Full semantic validation of CHAR body | many validators/LLM critic | High uncertainty | High | Do not start here. Use inventory/hard-gate first. |
| New record type for projection ledger | schemas + patch engine + validators + skills | Persistent new artifact | High | Not justified now. Keep ledger in prompt process. |

---

## **10. Implementation order**

### **Stage 1 — Documentation-only, safe**

1. Update `story-character-profile/SKILL.md` with durable boundary, stable Page-Plan Voice Block wording, source inventory, and regeneration reason rules.  
2. Update `branching-story-bootstrap/SKILL.md` with Phase 1b Distillation Boundary Ledger and stable-only Phase 2.  
3. Update `story-state-contract.md` §16a projection language.  
4. Update `story-record-schemas.md` prose to clarify STCHAR’s durable boundary.  
5. Update `branching-story-turn-cycle/references/phase-7-page-plan.md` §16a wording.  
6. Update `branching-story-health-audit/SKILL.md` Phase 2m finding taxonomy.

These changes should not break current validators.

### **Stage 2 — Schema and validator shape**

7. Add `regeneration_reason_class` to `story-character-authority.schema.json`.  
8. Update patch-engine story-character-authority operation fixtures/examples to pass null for non-regenerated STCHAR and a valid value for regenerated STCHAR.  
9. Update schema tests.

### **Stage 3 — Source-preservation hardening**

10. Add `Stable Source Material Inventory` subsection requirement for new/touched world-char STCHAR.  
11. Add or extend tests in `stchar-body-integrity.test.ts`.  
12. Add `stchar_source_material_inventory_integrity`.

### **Stage 4 — Temporal-boundary structural enforcement**

13. Add `stchar_temporal_reference_boundary`.  
14. Add tests proving it allows audit/provenance record references but blocks operational-section temporal record references.  
15. Keep legacy warning behavior for untouched profiles.

### **Stage 5 — Page-plan projection enforcement**

16. Enhance `page-plan-stchar-packet-integrity`.  
17. Add tests for multi-reason packets and current-state grounding records.  
18. Update page-plan examples/templates if any fail the new packet shape.

### **Stage 6 — Regeneration lifecycle enforcement**

19. Add `stchar_regeneration_reason_integrity`.  
20. Add tests for valid/invalid regeneration reasons.  
21. Update `story-character-profile` patch payload examples.

### **Stage 7 — Branch-aware supersession**

22. Replace ordinal-only supersession validity with branch-ancestry-aware logic.  
23. Add branch-local STCHAR regeneration tests.  
24. Only after this should the docs explicitly encourage branch-local durable STCHAR transformations.

### **Stage 8 — Migration**

25. Run health audit against active story fixtures.  
26. Repair current fixtures that fail new hard gates.  
27. Treat Red Bunny only after fetching its active current-main files.  
28. Keep archive reports/specs out of migration truth unless an active file directly references them.

---

## **11. Open questions**

1. **Should `regeneration_reason_class` be frontmatter or only audit/prose?** I recommend frontmatter because validators and migration need deterministic lifecycle classification.  
2. **Should Stable Source Material Inventory become schema-structured frontmatter?** I recommend body subsection first. Frontmatter arrays would be more enforceable but higher blast radius and harder to maintain for rich prose source material.  
3. **How much branch-local STCHAR transformation should be allowed before branch-aware supersession lands?** I recommend allowing the concept in docs but gating enforcement until branch-aware validator tests exist.  
4. **Should `story_irrelevant` categories be schema-enforced now?** I recommend enforcing structured categories in the inventory validator for new/touched profiles, while leaving the existing `source_operational_fact_map.rationale` string intact to avoid broad schema churn.

---

## **12. Bottom-line recommendation**

Worldloom already has the right architecture in embryo:

* `STCHAR` = durable story-local character authority.  
* `STPLAN` / `STEMO` / `BEL` / `STSTAT` / `SREL` / pressure records = current state.  
* page-plan §16a = page-local projection.  
* prose receipt = fidelity check.

The bug is at the seam: bootstrap and profile generation still allow opening-page state to be written into durable STCHAR, while source preservation only deterministically protects the 10 structured dramatic_core fields.

The decisive fix is:

**Distill STCHAR from stable operational character material, preserve dormant stable source material, route opening-current facts into state records, and project STCHAR plus current state only in page-plan §16a.**

Do that with skill/template hardening first, then structural validators based on record references, lifecycle reason classes, provenance inventory, and page-plan grounding. Do not use brittle word/phrase temporal-leakage validators.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
