**Status**: COMPLETED

# **1. Executive verdict**

**Verdict: the character-to-story bridge is architecturally sound but semantically fragile.** The current system has the right major architecture: world-level `CHAR-*` dossiers are not supposed to remain runtime characterization authority; `STCHAR-*` is the story-local authority; page plans must carry STCHAR-derived §16a character packets; prose attach checks §16a packet presence and hash consistency. That is the right shape, and it aligns with `FOUNDATIONS.md`’s insistence that Worldloom state be modeled, constrained, retrievable, and validated rather than treated as loose prose memory.

**The highest-risk gap is upstream semantic preservation during `CHAR → STCHAR`.** Current files strongly require STCHAR existence, STCHAR hashes, STCHAR body sections, and no runtime `CHAR` leakage, but they do **not** require a source-fact coverage map proving that operational facts from `CHAR`—especially `## Capabilities` and `## Signature Scene Behavior` / `dramatic_core.signature_scene_behaviors`—were copied, transformed, compressed, omitted with rationale, or marked story-irrelevant. The triggering failure class is therefore real: a capability can survive only inside `## Source Distillation` commentary and still pass the current structural gates.

**Fix first:** add a **Semantic Preservation Contract** and a **source-operational-fact mapping validator** for STCHAR creation/regeneration. Do not redesign the whole story system. Preserve the existing STCHAR architecture, but add explicit homes and deterministic coverage checks for source fact classes that are already canonical in `CHAR`.

# **2. Repository evidence base**

**Repository:** `joeloverbeck/worldloom`  
 **Default branch:** `main`  
 **Resolved branch SHA:** `fb1eb3712935bae675f7157319c6487b4d09a416`  
 **Evidence discipline:** I did not clone the repository. I did not use GitHub code-search snippets as evidence. Repository claims below are grounded in files fetched directly from `ref=fb1eb3712935bae675f7157319c6487b4d09a416`.

One caveat: the available GitHub connector could resolve the repository and branch SHA and fetch direct files, but it could not return a full recursive tree manifest or directory listings through the exposed tools; attempts to fetch the GitHub tree/contents endpoints and directory paths failed. I therefore used the user-named current paths plus file paths referenced by fetched current files, then fetched each candidate directly at the exact SHA. I am not treating the missing tree manifest as evidence of file absence.

Fetched files materially used:

* `docs/FOUNDATIONS.md` — governing design constitution; story/modeling/validation/tooling constraints.  
* `docs/CONTEXT-PACKET-CONTRACT.md` — packet layers, story-bundle context, active story characters, story-task retrieval discipline.  
* `docs/MACHINE-FACING-LAYER.md` — retrieval/index/validator/MCP layer and story-bundle graph edges.  
* `docs/HARD-GATE-DISCIPLINE.md` — absolute gates, validation rationale discipline, engine/validator expectations.  
* `.claude/skills/character-generation/SKILL.md` and `templates/character-dossier.md` — current `CHAR` structure, `dramatic_core`, capabilities, signature scene behaviors, voice, pressure behavior.  
* `.claude/skills/propose-new-characters/SKILL.md`, `.claude/skills/deepen-character-proposal/SKILL.md`, and `_shared-references/protagonist-grade-character-engine.md` — proposal/deepening/realization seams and canonical character-engine fields.  
* `.claude/skills/story-character-profile/SKILL.md` — STCHAR creation/regeneration contract and the 13 required STCHAR H2 sections.  
* `.claude/skills/branching-story-bootstrap/SKILL.md` — selected cast → STCHAR before story state; root page plan §16a.  
* `.claude/skills/branching-story-turn-cycle/SKILL.md` and its relevant references — runtime STCHAR retrieval, mid-story STCHAR blocker, §16a page-plan packets, validation gates.  
* `.claude/skills/branching-story-prose-attach/SKILL.md` — prose receipt, §16a hash comparison, profile-fidelity checks.  
* `.claude/skills/_shared-templates/story-state-contract.md` and `story-record-schemas.md` — story authority model, page plan contract, STCHAR record semantics, STPLAN/STEMO derivation, prose receipt semantics.  
* `tools/validators/src/schemas/story-character-authority.schema.json` — STCHAR frontmatter schema.  
* `tools/validators/src/structural/stchar-body-integrity.ts` — STCHAR section/hash validator.  
* `tools/validators/src/structural/no-char-authority-in-story-runtime.ts` — runtime `CHAR-*` leak validator.  
* `tools/validators/src/structural/prose-receipt-stchar-integrity.ts` — §16a/prose receipt STCHAR authority validator.  
* `tools/validators/src/structural/stchar-utils.ts` — STCHAR-relevant operation scope and helper logic.  
* `tools/validators/src/schemas/story-page.schema.json`, `story-choice.schema.json`, `story-entity.schema.json`, `story-event.schema.json` — page snapshot, choices, STENT binding, event introductions/state deltas.  
* `tools/world-mcp/src/cli/compute-stchar-hashes.ts`, `tools/world-mcp/src/package-interop.ts`, `tools/world-index/src/hash/content.ts` — canonical STCHAR hash computation.

Relevant files not found by direct path attempts:

* No standalone `tools/validators/src/structural/page-plan-stchar-integrity.ts`.  
* No standalone `tools/validators/src/structural/pg-plan-stchar-integrity.ts`.  
* No standalone `tools/validators/src/structural/page-plan-hash-integrity.ts`.  
* No direct `tools/validators/src/schemas/character.schema.json`.

That does **not** prove absence across the repository because the connector could not provide a manifest; it means those likely current-main equivalents were not available at those direct paths.

# **3. Research base**

Research was used only to strengthen repo-specific recommendations. It does not override `FOUNDATIONS.md`.

Key sources consulted:

* **Narrative function / actants:** Greimas’s actantial model distinguishes characters by action-function—subject/object, helper/opponent, sender/receiver—rather than static biography. This supports treating STCHAR as a story-operational projection: what a character can want, oppose, enable, threaten, reveal, withhold, or cause matters more than a summary of who they “are.”  
* **Interactive narrative grounding:** Ammanabrolu and Riedl describe interactive narratives as systems where agents perceive, act, and talk in text-based worlds, with challenges around knowledge representation, commonsense reasoning, and sequential decision-making. This directly supports role-sensitive character packets: a character’s packet should expose the information needed for the current page’s action/knowledge/dialogue role, not every trait every time.  
* **Computational narrative intelligence:** Riedl frames narrative intelligence as crafting, understanding, and responding affectively to stories. That supports preserving appraisal, pressure behavior, relationship charge, and voice as machine-facing character data, not only prose style notes.  
* **Storylets:** Emily Short defines storylets as content plus prerequisites plus effects on world state, emphasizing robust recombination beyond simple branching. This aligns with Worldloom’s page plan / CHC / state-delta approach and argues for packet granularity tied to prerequisites/effects: offstage pressure, speaking, choice target, consequence carrier, and promise/thread carrier are different retrieval needs.  
* **Agent memory/planning:** Park et al.’s generative-agents architecture uses memory, reflection, and planning to produce believable behavior; their ablation finding that observation/planning/reflection contribute to believability supports Worldloom’s separation of STCHAR, STPLAN, STEMO, BEL, SREL, and page packet projections. The repo already has most of this architecture; the weak point is preserving source character affordances into the state that planning can use.  
* **BDI-style agency:** Rao and Georgeff model beliefs, goals, intentions, time, actions, probabilities, and payoffs in rational agents. This supports keeping stable persona authority separate from volatile beliefs/intentions/plans, which Worldloom already does through STCHAR vs BEL/STINT/STPLAN.  
* **Provenance and traceability:** W3C PROV defines provenance as information about entities, activities, and people involved in producing data, used to judge quality, reliability, and trustworthiness; it also emphasizes derivation, procedures, validation, and versioning. This supports an explicit `CHAR → STCHAR` semantic-preservation map with source anchors, transformations, omissions, and rationales.  
* **Schema validation limits:** JSON Schema validation is about assertions over what a valid document must look like; it is excellent for structure and closed enums, not for judging literary adequacy. That supports deterministic validators for coverage, references, hashes, and role/packet consistency, while leaving prose quality and “is this character compelling?” to judgment-based critic passes.

Research-to-repo synthesis:

| Research insight | Why it matters here | FOUNDATIONS alignment | Repo evidence | Proposal consequence |
| ----- | ----- | ----- | ----- | ----- |
| Character is action-function, not only biography. | A source capability matters if it changes action, opposition, knowledge, choice, consequence, or scene behavior. | Aligns with world facts as constrained model, not lore bag. | `CHAR` has capabilities and signature behaviors; STCHAR lacks explicit coverage proof. | Add operational fact classes and map each to STCHAR homes or omission rationale. |
| Interactive narrative needs world-grounded perception/action/dialogue state. | Page packets should differ by whether the character speaks, acts, pressures offstage, or carries a relationship/consequence. | Aligns with context packet locality and page-plan grounding. | §16a already distinguishes full vs offstage causal but not enough role-sensitive subprojection. | Keep full/reduced split, add closed role flags and role-conditioned packet fields. |
| Storylets are prerequisites + content + effects. | Character packets should expose facts that affect eligibility, action, choice, and consequences. | Aligns with CHC grounding and SE state delta model. | CHC can ground in STCHAR; choices based on STCHAR must cite it. | Require “relevant capabilities / limits / promises” in §16a when role requires it. |
| Believable agents need memory/planning/reflection. | STCHAR should not replace BEL/STINT/STPLAN/STEMO, but it must seed their derivation. | Aligns with schema-minimal story state. | STPLAN/STEMO `derived_from[]` may cite STCHAR. | Do not overload STCHAR with volatile state; add stable affordance/behavior homes. |
| Provenance improves reliability. | `source_char_sections_used[]` is not enough; it names sources but not what survived. | Aligns with source hashes and audit anchors. | STCHAR schema has source ids/hashes but no operational coverage map. | Add `source_operational_fact_map` or structured equivalent. |
| Schemas validate shape, not literary meaning. | Do not make validators judge “good characterization”; do make them catch missing mapping, illegal packet roles, missing STCHAR. | Aligns with hard-gate PASS-with-rationale and validator discipline. | Current validators catch body sections, hashes, no CHAR leak, receipt hash comparison. | Add deterministic coverage/role validators and leave nuance to critic pass. |

# **4. Current bridge map**

## **4.1 World `CHAR-*` source**

Current `CHAR` dossiers are rich hybrid files. The `character-generation` skill and template give `CHAR` both frontmatter and body homes for:

* identity, role, world grounding, canon safety;  
* `dramatic_core` fields: wound, appetite, self-mythology, contradiction, pressure behavior, relational charge, moral edge, signature scene behaviors, voice under pressure, cannot-swap reason;  
* `## Capabilities`, with acquisition, cost, teacher/institution, distribution/ordinary-vs-unusual, and body/class/place shaping;  
* `## Signature Scene Behavior`, separate from capabilities, with repeated visible behaviors under pressure;  
* voice, perception, contradictions, likely hooks, canon safety trace.

**Source of truth:** current world `CHAR` dossier at its indexed content hash.  
 **Derived fields:** frontmatter `dramatic_core` denormalizes some body material.  
 **Operational fields:** capabilities, pressure behavior, voice, relational charge, embodiment, signature behaviors, moral/psychological edge.  
 **Audit fields:** canon safety trace and some body rationale.

## **4.2 Proposal / deepening → `CHAR`**

`NCP` cards from `propose-new-characters` and `deepen-character-proposal` are not canon and not characters, but their first frontmatter block is structurally consumable by `character-generation`; `memorability_profile` field names mirror `CHAR.dramatic_core`. Deepening validates all 10 profile fields, pressure behavior keys, voice keys, relational charge, and at least three signature scene behaviors.

This upstream seam is stronger than the later `CHAR → STCHAR` seam: proposal/deepening explicitly protects signature behaviors and capability-cost integrity through the shared protagonist-grade engine.

## **4.3 `CHAR → STCHAR`**

`story-character-profile` is the only general story-pipeline surface allowed to read world `CHAR-*` for characterization; after distillation, runtime consumes active `STCHAR`, not `CHAR`. It supports `create_from_world_char`, `create_story_local`, and `regenerate` modes. For source `CHAR`, it records `source_char_id`, `source_char_hash`, and `source_char_sections_used[]`; the source id is provenance only, not operational authority.

Current required STCHAR H2 sections:

1. `Story-Facing Identity`  
2. `Source Distillation`  
3. `Stable Persona Core`  
4. `Emotional Appraisal Map`  
5. `Pressure Behavior`  
6. `Voice Bible / Dialogue Authority`  
7. `Page-Plan Voice Block`  
8. `Perception and Embodiment`  
9. `Agency and Planning Tendencies`  
10. `Relationship-Specific Behavior`  
11. `Story-State Derivation Guide`  
12. `Prose Rendering Constraints`  
13. `Validation / Audit Anchors`

The structure has many plausible operational homes, but no explicit “Capabilities / Operational Affordances” home and no required mapping from `CHAR` operational fact classes to STCHAR sections. The skill’s source-section list names identity, embodied constraints, voice, stable dispositions, relevant relationships, pressure behavior, and canon limits; it does **not** explicitly name `## Capabilities` or `## Signature Scene Behavior`.

## **4.4 STCHAR frontmatter / schema**

The STCHAR schema requires provenance and hash fields: `source_kind`, `source_char_id`, `source_char_hash`, `source_char_sections_used`, `profile_hash`, `voice_block_hash`, `page_packet_hash`, revision/status fields, etc. It conditionally requires `source_char_id` and `source_char_hash` for `source_kind: world_char` and requires nulls for `story_local`. It does not require non-empty operational fact mapping, capability coverage, or signature behavior coverage.

## **4.5 STCHAR validation**

`stchar-body-integrity.ts` validates that each required H2 exists exactly once and is non-empty. It recomputes `profile_hash` over the STCHAR body and `voice_block_hash` over `## Page-Plan Voice Block`. It collects `page_packet_hash` shape, but does not prove semantic coverage from source `CHAR`.

The canonical hash CLI defines:

* `profile_hash`: STCHAR body;  
* `voice_block_hash`: Page-Plan Voice Block;  
* `page_packet_hash`: §16a page-plan packet projection text, with its own hash masked.

This is useful denormalization, but it means §16a packet construction must be disciplined: the packet hash covers the packet projection, not a magical guarantee that all important source facts were projected.

## **4.6 Story bootstrap**

`branching-story-bootstrap` requires selected cast `CHAR` dossiers to be resolved and distilled into STCHAR before story state is created. It creates STENTs with `bound_stchar_id`, places STCHAR ids into `PG-1.state_snapshot.active_records.STCHAR`, and requires the root page plan to include §16a STCHAR-derived packets. It forbids world `CHAR` as runtime authority.

## **4.7 Turn cycle**

`branching-story-turn-cycle` loads active STCHAR summaries, cross-checks parent page snapshots, retrieves full/projected STCHAR sections before deriving persona/voice/appraisal/pressure/relationship/perception/agency, and blocks if a meaningful non-background character enters without active STCHAR.

Turn-cycle preflight explicitly says runtime uses `story_slug`, story bundle context, and targeted STCHAR retrieval; it must not retrieve world `CHAR` for runtime characterization.

## **4.8 Page-plan §16a packets**

Current §16a packets are required for viewpoint, speaker, major actor, direct target, emotionally salient character, behavior-shaping character, voice-shaping character, and offstage-causal character. Full packets carry identity, voice/dialogue, appraisal, pressure behavior, relationship conduct, perception/embodiment, agency/planning, prose show/not-imply constraints, and anti-generic constraints. Offstage-causal packets omit voice/dialogue and on-page rendering lines but keep identity, appraisal/pressure, causal relevance, not-imply, and anti-generic material.

**This is a good design.** The gap is not “no packets.” The gap is that packet role taxonomy and packet content do not explicitly require “relevant capabilities / limits / signature behaviors / promises” when those facts drive the page.

## **4.9 Page records, choices, events, prose**

`story-page.schema.json` requires page state snapshots to include active STCHAR ids. `story-choice.schema.json` allows `grounded_in.records[]` to cite STCHAR. `story-entity.schema.json` requires non-background STENT records to bind to STCHAR. `story-event.schema.json` allows STCHAR introduction in `record_introductions[]` and state deltas.

`no_char_authority_in_story_runtime` enforces the no-runtime-CHAR rule across story runtime records and page-plan/prose-receipt text surfaces, except for allowed provenance/promotion contexts.

`prose-receipt-stchar-integrity` parses §16a packets from page plans and checks prose receipts for matching STENT/STCHAR, `required_because`, active snapshot, and hash comparisons.

# **5. Semantic preservation findings**

## **What is preserved well**

The current bridge preserves:

* **authority boundary:** `CHAR` is allowed for STCHAR source reads, not runtime characterization.  
* **story-local provenance:** STCHAR records source id/hash/sections.  
* **structural completeness:** every STCHAR must have the 13 body sections.  
* **runtime packet requirement:** page plans require §16a packets for relevant characters.  
* **runtime anti-leak:** validators forbid operational `CHAR-*` references in story runtime and page-plan/prose-receipt text.

## **What can be lost**

The current bridge can lose any `CHAR` fact that is:

* not explicitly requested in `story-character-profile`’s source-section list;  
* placed only in `## Source Distillation`;  
* omitted from `Stable Persona Core`, `Pressure Behavior`, `Voice Bible`, `Perception and Embodiment`, `Agency and Planning Tendencies`, `Relationship-Specific Behavior`, `Prose Rendering Constraints`, or page-plan packet export;  
* not needed by a validator’s current structural checks.

The most exposed classes are:

* capabilities / skills / special abilities;  
* signature scene behaviors;  
* capability costs, limits, access constraints, distribution constraints;  
* offstage causal capabilities;  
* non-speaking onstage behaviors;  
* relationship-specific action tendencies;  
* promise/thread/consequence hooks specific to a character.

## **Where operational facts can fall into commentary-only sections**

`## Source Distillation` is explicitly positioned as source/accounting: source kind, ids, sections used, evidence, and statement that `CHAR` is not operational authority. It is not described as a packet source.

Therefore, a capability that appears only in `## Source Distillation` is **not safely preserved**. It may be human-readable, but it is not necessarily available to STPLAN/STEMO derivation, §16a page packets, CHC grounding, or prose rendering.

## **Do capabilities and signature scene behaviors have a reliable operational home?**

**Partially, but not reliably.**

Possible homes already exist:

* body/perception-linked capabilities → `Perception and Embodiment`;  
* tactical/action capabilities → `Agency and Planning Tendencies`;  
* pressure-triggered uses → `Pressure Behavior`;  
* visible repeated behaviors → `Prose Rendering Constraints`;  
* voice shifts → `Voice Bible / Dialogue Authority` and `Page-Plan Voice Block`;  
* relationship-linked capabilities → `Relationship-Specific Behavior`.

But the repo does not yet say: “Every source `CHAR` capability/signature behavior must be mapped to one of these homes or omitted with rationale.” The existing homes are implicit. The failure class is exactly an implicit-home failure.

## **Proposed semantic preservation contract**

Add this principle to `story-character-profile`, bootstrap Phase 2, story-state contract §16a, and STCHAR validation docs:

For any STCHAR derived from a world `CHAR`, every story-operational source fact must be copied, transformed, compressed, intentionally omitted with rationale, or marked story-irrelevant. No story-operational source fact may survive only in `## Source Distillation` or equivalent audit/commentary prose if page planning, choice grounding, state derivation, or prose rendering may need it.

Operational source fact classes:

| Source fact class | Must survive when… | Legal target homes |
| ----- | ----- | ----- |
| Identity/provenance | Always | frontmatter, Story-Facing Identity, Source Distillation |
| Canon constraints / Mystery Reserve boundaries | Always if source fact touches canon/mystery | Stable Persona Core, Prose Rendering Constraints, Validation / Audit Anchors |
| Physical/sensory/body constraints | Character can appear, act, perceive, or be described | Perception and Embodiment, Prose Rendering Constraints |
| Capabilities / skills / special abilities | Capability affects action, choice, threat, perception, offstage pressure, social leverage, or prose plausibility | Agency and Planning Tendencies, Perception and Embodiment, Pressure Behavior, Relationship-Specific Behavior, Prose Rendering Constraints |
| Capability costs/limits/access | Whenever capability is retained | Same target as capability; omission forbidden unless capability omitted |
| Signature scene behaviors | Character can appear onstage or affect scene texture | Pressure Behavior, Prose Rendering Constraints, Agency and Planning Tendencies |
| Voice/dialogue | Character may speak, write, be quoted, or have voice-shaped narration | Voice Bible, Page-Plan Voice Block |
| Appraisal / emotional triggers | Character may react, decide, or become emotionally salient | Emotional Appraisal Map, Pressure Behavior |
| Goals/appetites/refusals | Character may act, oppose, choose, plan, or pressure | Stable Persona Core, Agency and Planning Tendencies |
| Relationships/conflicts/loyalties | Relationship affects page, choice, plan, conflict, or emotional charge | Relationship-Specific Behavior |
| Secrets/withheld knowledge/beliefs | Character’s knowledge boundary affects scene or observer firewall | Story-State Derivation Guide, Relationship-Specific Behavior, Prose Rendering Constraints |
| Story hooks/promises | Selected story premise/page path activates them | Story-State Derivation Guide, Prose Rendering Constraints, page plan §10b/threads where applicable |
| Pure biographical color | No operational effect in this story | May be compressed or omitted with rationale |

# **6. STCHAR structure assessment**

## **Existing structure**

The 13-section STCHAR structure is close to right. It separates:

* identity/provenance;  
* stable persona;  
* emotional appraisal;  
* pressure behavior;  
* voice and page-plan voice;  
* perception/body;  
* agency/planning;  
* relationships;  
* derivation guidance;  
* prose constraints;  
* audit anchors.

It also respects the current story-state architecture: STCHAR is stable authority, not belief, not canon fact, not an active plan, not an emotion record.

## **Missing homes**

Do **not** add a giant new STCHAR ontology. But three homes need to become explicit:

1. **Capabilities / Operational Affordances**  
    Add as a required subsection under `## Agency and Planning Tendencies`, not as a new H2 initially. This avoids a large migration blast radius while giving skills and validators a stable operational target.  
2. **Signature Scene Behavior Rendering**  
    Add as a required subsection under `## Prose Rendering Constraints`, cross-referenced to `## Pressure Behavior`. Signature behaviors are visible scene habits; they belong in render guidance and pressure/action behavior, not only audit.  
3. **Source Operational Fact Map**  
    Add as a required structured block under `## Validation / Audit Anchors`, or as a frontmatter field if implementation prefers schema validation. I recommend frontmatter only if the validator/MCP layer will consume it often; otherwise use a parseable YAML fenced block in `Validation / Audit Anchors`.

## **Recommended STCHAR subsection refinements**

Keep the 13 H2s. Add required subsections:

* `## Agency and Planning Tendencies`  
  * `### Operational capabilities and affordances`  
  * `### Capability limits, costs, and access constraints`  
  * `### Likely tactics and refusal patterns`  
* `## Prose Rendering Constraints`  
  * `### Signature scene behaviors to render`  
  * `### Behaviors not to imply`  
  * `### Anti-generic rendering constraints`  
* `## Validation / Audit Anchors`  
  * `### Source operational fact map`  
  * `### Omission / compression / transformation rationales`

This is the medium-aggressive option: it closes the actual gap without adding an H2 or redesigning STCHAR.

## **Redundant homes**

Some redundancy is useful:

* `Voice Bible` + `Page-Plan Voice Block`;  
* `Pressure Behavior` + `Prose Rendering Constraints`;  
* `Agency and Planning Tendencies` + §16a packet projection;  
* source fact map + operational section text.

Keep these, but validate them for divergence where deterministic.

# **7. Packet sufficiency assessment**

## **Current packet roles**

Current packets are:

* **Full §16a packet** for viewpoint, speaker, major actor, direct target, emotionally salient, behavior-shaping, voice-shaping.  
* **Reduced offstage-causal packet** for offstage characters whose goals/pressure/absence matter but who do not speak or appear.

This is mostly sound.

## **Adequacy by role**

| Role | Current adequacy | Gap |
| ----- | ----- | ----- |
| Offstage reference only | Not explicitly a §16a role unless causal. | Correct to avoid bloat, but plan should distinguish continuity mention from causal pressure. |
| Offstage active influence / pressure | Reduced packet exists. | Needs explicit “relevant capabilities / limits / pressure mechanism.” |
| Onstage silent presence | Full packet likely over-includes voice. | Needs role flag so voice may be omitted unless voice shapes page. |
| Onstage action without speech | Full packet has agency/planning. | Needs capability/affordance line. |
| Onstage speaking role | Full packet has voice. | Good; validator should require voice for speaker. |
| POV/internality | Full packet has appraisal/perception. | Needs POV/internality flag and required perception/appraisal fields. |
| Antagonist/opposition pressure | Full or offstage. | Needs opposition/pressure mechanism and relevant capability. |
| Relationship-relevant role | Relationship conduct exists. | Validator should require SREL or STCHAR relationship conduct when `relationship_relevant`. |
| Consequence carrier | Not explicit. | Add packet role flag. |
| Promise/thread carrier | Not explicit. | Add packet role flag and §10b/thread reference. |

## **Packet refinement**

Do not replace §16a. Refine it:

Add a closed `Required because:` vocabulary, allowing comma-separated values:

* `viewpoint`  
* `speaker`  
* `major_actor`  
* `direct_target`  
* `emotionally_salient`  
* `behavior_shapes_page`  
* `voice_shapes_page`  
* `relationship_relevant`  
* `offstage_causal`  
* `opposition_pressure`  
* `consequence_carrier`  
* `promise_thread_carrier`  
* `continuity_mention`

Then define field requirements:

| Required-because flag | Required packet material |
| ----- | ----- |
| `speaker` / `voice_shapes_page` | Page-Plan Voice Block / dialogue authority |
| `viewpoint` | perception/embodiment + appraisal + internality limits |
| `major_actor` / `behavior_shapes_page` | pressure behavior + agency/planning + relevant capabilities/limits |
| `offstage_causal` | offstage pressure mechanism + goals/intentions if known + relevant capabilities/limits; no dialogue block unless also `voice_shapes_page` |
| `relationship_relevant` | relationship-specific conduct and SREL/BEL/OBL/THR grounding if active |
| `opposition_pressure` | opposition mechanism, limits, likely tactics |
| `consequence_carrier` | consequence/obligation/thread reference |
| `promise_thread_carrier` | setup/payoff or STQ/THR reference |
| `continuity_mention` | identity/status only; no voice/appraisal bloat |

Add one line to both full and reduced packet templates:

`Relevant capabilities / limits for this page: …`

This line is the direct fix for the triggering class.

# **8. Validation assessment**

## **Deterministically validatable now**

Already covered:

* STCHAR required H2 sections exist and are non-empty.  
* `profile_hash` and `voice_block_hash` recompute from STCHAR body.  
* `source_char_id` / `source_char_hash` are required for `source_kind: world_char`.  
* non-background STENT requires `bound_stchar_id`.  
* page snapshots include active STCHAR array.  
* CHC grounding may cite STCHAR.  
* runtime records and page-plan/prose-receipt text must not cite world `CHAR-*` as authority.  
* prose receipt must have STCHAR authority entries matching §16a packet STENT/STCHAR, required-because, active snapshot, and stored/observed hashes.

## **Validatable with schema / MCP / validator changes**

Add these validators:

### **A. `stchar_source_fact_coverage`**

For `source_kind: world_char`, retrieve the source `CHAR` by `source_char_id` and `source_char_hash`. Validate:

* `source_char_sections_used[]` includes source sections needed for declared fact classes.  
* Frontmatter `dramatic_core.signature_scene_behaviors[]` has map entries.  
* Frontmatter/body `pressure_behavior`, `voice_under_pressure`, `relational_charge`, `moral_psychological_edge`, and `cannot_be_swapped_out_because` have map entries when present.  
* Each `## Capabilities` subsection heading has one map entry.  
* Each mapped operational fact has disposition:  
  * `copied`  
  * `transformed`  
  * `compressed`  
  * `omitted_with_rationale`  
  * `story_irrelevant`  
* If disposition is copied/transformed/compressed, target section must not be `Source Distillation`.  
* If disposition is omitted/story_irrelevant, rationale is required.  
* Capability retained without cost/limit/access mapping fails.

### **B. `stchar_operational_home_integrity`**

Validate required subsections:

* `Agency and Planning Tendencies / Operational capabilities and affordances`  
* `Agency and Planning Tendencies / Capability limits, costs, and access constraints`  
* `Prose Rendering Constraints / Signature scene behaviors to render`  
* `Validation / Audit Anchors / Source operational fact map`

This validator should not judge quality, only presence, non-empty content, and legal references.

### **C. `page_plan_stchar_packet_integrity`**

Parse §16a before prose attach:

* every packet STCHAR is active in `PG.state_snapshot.active_records.STCHAR`;  
* packet `Required because` uses closed vocabulary;  
* `speaker` requires voice block;  
* `offstage_causal` without `speaker` or `voice_shapes_page` must not include dialogue bloat;  
* `major_actor`, `behavior_shapes_page`, `offstage_causal`, `opposition_pressure`, `consequence_carrier`, and `promise_thread_carrier` require `Relevant capabilities / limits for this page`;  
* packet hash recomputes using `computeStcharPagePacketHash`, not just declared string comparison;  
* no page-plan packet cites `CHAR-*`.

The current prose receipt validator compares declared packet hashes to STCHAR stored hashes, but it does not recompute the packet hash from packet text. The hash library already supports recomputing §16a packet text; use it pre-commit for page-plan packet integrity.

### **D. `stchar_page_packet_hash_source_integrity`**

Clarify `page_packet_hash` semantics:

* Either keep STCHAR frontmatter `page_packet_hash` as hash of a canonical full default packet projection and store that projection or make it reproducible from STCHAR sections; or  
* Move page-specific packet hashes fully to page plans and receipts, while STCHAR stores only `profile_hash` and `voice_block_hash`.

I recommend the first, smaller change: store a canonical packet projection block in `Validation / Audit Anchors` or `Story-State Derivation Guide`, then recompute `page_packet_hash` deterministically.

## **LLM-judgment-only**

Keep these as critic-pass / prose-attach judgment, not deterministic validators:

* whether a transformed capability is dramatically satisfying;  
* whether compressed source behavior preserves literary nuance;  
* whether prose voice is beautiful;  
* whether a signature behavior is overused or underused;  
* whether a character feels memorable;  
* whether a capability should matter in a page when the plan does not declare it relevant.

## **Should not be validated**

Avoid deterministic validation for:

* “every capability must appear in every page where character appears” — bloats prose and destroys flexibility.  
* “offstage characters must never have voice data” — sometimes offstage quoting, remembered speech, or written artifacts make voice relevant.  
* “all source `CHAR` facts must survive” — story-locality requires omission and compression.  
* “capabilities must be used when available” — fiction needs restraint and negative space.  
* “signature behaviors must appear exactly N times” — mechanical repetition harms prose.

# **9. Redundancy and divergence assessment**

## **Harmful divergence risk**

1. **`CHAR` operational fact → STCHAR audit-only mention**  
    Current risk: a capability in `CHAR` can appear only in `Source Distillation`.  
    Fix: source operational fact map + operational-home validator.  
2. **STCHAR operational sections → §16a packet**  
    Current risk: page plan packet omits a capability needed by the page.  
    Fix: role-conditioned §16a required fields and packet hash recomputation.  
3. **§16a declared hash → actual §16a text**  
    Current risk: declared `page_packet_hash` can be copied without recomputing actual packet text unless a tool/skill does it.  
    Fix: `page_plan_stchar_packet_integrity`.

## **Useful deliberate denormalization**

Keep:

* `CHAR.dramatic_core` frontmatter + CHAR body sections. This helps machines and humans; upstream skills already enforce rich fields.  
* `Voice Bible` + `Page-Plan Voice Block`. The latter is a projection optimized for page plans.  
* STCHAR body + §16a packet. Page plans need self-contained packets.  
* STCHAR source hash + source map. Provenance plus semantic coverage is valuable.

## **Harmless documentation duplication**

* phase descriptions repeating “no world CHAR runtime authority” across skills and contracts are beneficial; keep them. They are a core safety boundary.

## **What to generate rather than author manually**

Generate or tool-assist:

* `source_operational_fact_map` skeleton from parsed source `CHAR`;  
* §16a packet hash;  
* `profile_hash` / `voice_block_hash`;  
* packet role validation;  
* source capability headings list.

Author manually / judgment-assisted:

* transformation rationale;  
* story-irrelevance rationale;  
* page-specific relevance;  
* prose rendering nuance.

# **10. Page-plan adequacy assessment**

Current page plans receive much of the right character information. The §16a packet is one of the strongest parts of the bridge: it is mandatory, story-local, hash-backed, and role-triggered.

But current page-plan adequacy depends on two weak assumptions:

1. the STCHAR actually contains all operational source facts in operational homes;  
2. the §16a packet author selects the right material for the page role.

The proposed refinements address both.

## **Where plans are too thin**

* Capabilities / limits are not an explicit packet line.  
* Signature scene behaviors are not explicitly page-projected.  
* Promise/thread/consequence carrier roles are not explicit §16a roles.  
* Offstage pressure can omit the exact mechanism by which the character affects the page.

## **Where plans may be bloated**

* Full packets for onstage silent/non-speaking characters may include voice/dialogue material unnecessarily.  
* Continuity-only mentions should not receive full persona/appraisal packets.  
* Offstage-only reference should not load full voice, physical rendering, or dialogue constraints unless memory/quote/artifact use requires it.

## **How to ensure capabilities, scene behavior, relationships, promises appear when needed**

* Add `Relevant capabilities / limits for this page` to §16a.  
* Add `Signature behaviors to render or suppress on this page` only when `behavior_shapes_page` or onstage role applies.  
* Add `Relationship state / conduct required for this page` when `relationship_relevant`.  
* Add `Promise/thread/consequence carried` when `promise_thread_carrier` or `consequence_carrier`.  
* Validate closed `Required because` flags and field presence.

# **11. Prioritized proposals**

## **Proposal 1 — Add the Semantic Preservation Contract**

**Problem:** Current `CHAR → STCHAR` distillation has provenance but not semantic coverage.  
 **Evidence:** STCHAR schema requires source id/hash/sections but not mapped operational facts; STCHAR body validator checks H2s and hashes, not source coverage.  
 **Research support:** provenance and derivation improve trustworthiness; interactive narrative needs action/knowledge/dialogue-relevant state.  
 **FOUNDATIONS alignment:** strengthens modeled machine-facing state; does not promote story facts to canon.  
 **Exact change:** Add contract text to `story-character-profile`, bootstrap Phase 2, story-state contract §16a, and STCHAR validation docs:

Every story-operational source `CHAR` fact must be copied, transformed, compressed, omitted with rationale, or marked story-irrelevant; it must not survive only in `Source Distillation`.

**Affected files/systems:**  
 `.claude/skills/story-character-profile/SKILL.md`; `.claude/skills/branching-story-bootstrap/SKILL.md`; `.claude/skills/_shared-templates/story-state-contract.md`; `story-record-schemas.md`; STCHAR validators; docs.  
 **Blast radius:** skills, templates, validators, golden STCHAR fixtures, migration guidance.  
 **Validation impact:** enables source coverage validator.  
 **Migration impact:** existing STCHAR need backfill maps or legacy warnings.  
 **Risk:** moderate; mostly documentation/contract until validator lands.  
 **Sequencing:** first.

## **Proposal 2 — Add STCHAR operational capability and signature behavior homes**

**Problem:** Capabilities and signature behaviors have implicit homes but no explicit STCHAR requirement.  
 **Evidence:** `CHAR` template explicitly has `## Capabilities` and `## Signature Scene Behavior`; STCHAR required sections do not name these classes.  
 **Research support:** character function must be expressed as action, opposition, speech, and pressure, not only biography.  
 **FOUNDATIONS alignment:** adds load-bearing operational state without new story system.  
 **Exact change:** Keep the 13 H2s, but require subsections:

* `Agency and Planning Tendencies / Operational capabilities and affordances`  
* `Agency and Planning Tendencies / Capability limits, costs, and access constraints`  
* `Prose Rendering Constraints / Signature scene behaviors to render`  
* `Validation / Audit Anchors / Source operational fact map`

**Affected files/systems:** STCHAR skill, bootstrap cast distillation, validators, templates, hash fixtures.  
 **Blast radius:** lower than adding a new H2; body hash changes for migrated files.  
 **Validation impact:** add subsection parser.  
 **Migration impact:** backfill existing STCHAR bodies.  
 **Risk:** low-medium.  
 **Sequencing:** after Proposal 1.

## **Proposal 3 — Add `stchar_source_fact_coverage` validator**

**Problem:** Prompt instructions alone cannot catch deterministic omissions from known source sections.  
 **Evidence:** current validators do not inspect source `CHAR` facts.  
 **Research support:** JSON Schema is appropriate for structural assertions; semantic completeness requires a mix of deterministic coverage and judgment.  
 **FOUNDATIONS alignment:** deterministic validation where appropriate.  
 **Exact change:** Parse source `CHAR` frontmatter/body and STCHAR map. Require coverage for:

* `dramatic_core.signature_scene_behaviors[]`  
* `dramatic_core.pressure_behavior`  
* `dramatic_core.voice_under_pressure`  
* `dramatic_core.relational_charge`  
* `## Capabilities` subsections  
* `## Signature Scene Behavior` bullets where parseable

Fail if retained facts target only `Source Distillation`.

**Affected files/systems:** validators, MCP targeted retrieval, STCHAR schema or body parser, tests.  
 **Blast radius:** validator package, world-index hybrid parser assumptions, fixtures.  
 **Validation impact:** high.  
 **Migration impact:** initially warn for legacy STCHAR; fail for new/modified STCHAR.  
 **Risk:** medium; source markdown parsing must be conservative.  
 **Sequencing:** after Proposal 2.

## **Proposal 4 — Refine §16a packet roles and fields**

**Problem:** Current full/reduced packets are good but not sufficiently role-sensitive for capabilities, silent presence, consequence carriers, and promise/thread carriers.  
 **Evidence:** §16a defines full and offstage-causal packets but lacks explicit capability line and closed expanded role taxonomy.  
 **Research support:** storylets require prerequisites/effects; interactive agents need action/knowledge/dialogue-relevant data.  
 **FOUNDATIONS alignment:** improves page-plan grounding without bloating every page.  
 **Exact change:** Add closed role flags and a required `Relevant capabilities / limits for this page` line when role flags imply action, offstage pressure, opposition, consequence, or promise/thread carrying.

**Affected files/systems:** story-state contract §16a, bootstrap Phase 8, turn-cycle Phase 7, prose attach, packet hash CLI fixtures, page-plan templates.  
 **Blast radius:** page plan generation, receipt validation, tests.  
 **Validation impact:** enables packet role validator.  
 **Migration impact:** existing plans may remain legacy; new plans use refined form.  
 **Risk:** medium; avoid over-bloating packets.  
 **Sequencing:** after STCHAR homes are defined.

## **Proposal 5 — Add `page_plan_stchar_packet_integrity`**

**Problem:** Current prose receipt validation compares declared hashes but does not itself recompute actual §16a packet text.  
 **Evidence:** `prose-receipt-stchar-integrity` parses declared hash strings; hash library can compute packet hash from packet text.  
 **Research support:** deterministic validation should cover mechanical integrity.  
 **FOUNDATIONS alignment:** strengthens plan-authority bridge.  
 **Exact change:** Validator recomputes each §16a packet’s `page_packet_hash`, checks active STCHAR, role flags, required fields, and no `CHAR-*` leakage.

**Affected files/systems:** validators, prose attach, plan commit gates, tests.  
 **Blast radius:** plans, prose receipts, hash fixtures.  
 **Validation impact:** high.  
 **Migration impact:** legacy plans may warn unless reattached/replanned.  
 **Risk:** medium; parsing markdown packets must be stable.  
 **Sequencing:** after Proposal 4.

## **Proposal 6 — Clarify `page_packet_hash` semantics**

**Problem:** STCHAR frontmatter stores `page_packet_hash`, but §16a packets are page-specific projections.  
 **Evidence:** hash CLI computes `page_packet_hash` from a supplied packet projection; STCHAR body validator recomputes profile/voice but not packet projection.  
 **FOUNDATIONS alignment:** prevents silent divergence in machine-facing layer.  
 **Exact change:** Define STCHAR `page_packet_hash` as hash of a canonical full packet projection stored or reproducibly generated from STCHAR sections; page-specific packet hashes must be recomputed and compared to that canonical projection only when the packet claims canonical/full equivalence.

**Affected files/systems:** STCHAR schema, hash CLI docs, validators, prose attach, story-state contract.  
 **Blast radius:** moderate-high because hashes are already central.  
 **Validation impact:** clarifies what can be recomputed.  
 **Migration impact:** may require restamping STCHAR records.  
 **Risk:** medium-high; handle after core semantic map.  
 **Sequencing:** after packet role validator.

## **Proposal 7 — Add golden failure fixture for the triggering case**

**Problem:** The exact known failure should be impossible to regress.  
 **Evidence:** current validators would not fail a capability appearing only in `Source Distillation`.  
 **Exact change:** Add fixture:

* source `CHAR` has a capability in both `dramatic_core.signature_scene_behaviors[]` and `## Signature Scene Behavior`;  
* invalid STCHAR mentions it only in `Source Distillation`;  
* validator fails;  
* valid STCHAR maps it to operational capability/signature rendering sections;  
* page plan includes it only when role requires it.

**Affected files/systems:** validator tests, skill examples, golden docs.  
 **Blast radius:** low.  
 **Validation impact:** high confidence.  
 **Migration impact:** none.  
 **Risk:** low.  
 **Sequencing:** alongside Proposal 3.

# **12. Non-goals**

Do not:

* reintroduce world `CHAR` as runtime authority;  
* collapse STCHAR into `BEL`, `STINT`, `STPLAN`, `STEMO`, or `SREL`;  
* add a new drama-manager system;  
* require every source `CHAR` detail to appear in every STCHAR or page plan;  
* validate literary excellence deterministically;  
* make `Source Distillation` an operational packet source;  
* add broad page-plan bloat by default;  
* promote story-local facts to world canon through STCHAR;  
* replace the current §16a design wholesale.

# **13. Implementation plan for a later Claude Code/spec session**

## **Phase 1 — Spec the Semantic Preservation Contract**

Create a spec, probably `SPEC-CHAR-STCHAR-SEMANTIC-PRESERVATION.md`, covering:

* source fact classes;  
* legal dispositions;  
* legal target sections;  
* omission rationale rules;  
* audit-only vs operational homes;  
* story-local transformation semantics;  
* examples.

Acceptance criteria:

* no operational source fact can be mapped only to `Source Distillation`;  
* capability and signature behavior rules are explicit;  
* contract cites `FOUNDATIONS.md`.

## **Phase 2 — Update skills/templates**

Update:

* `story-character-profile`  
* `branching-story-bootstrap`  
* `branching-story-turn-cycle` §16a reference  
* shared story-state contract  
* story-record schemas prose sections

Acceptance criteria:

* STCHAR creation/regeneration instructions require fact map;  
* bootstrap cast distillation names `## Capabilities` and `## Signature Scene Behavior` explicitly;  
* turn-cycle packet instructions include capabilities/limits by role.

## **Phase 3 — Add STCHAR subsection requirements**

Update STCHAR body integrity validator to require named subsections under existing H2s.

Acceptance criteria:

* new STCHAR fails without operational capability/signature subsections;  
* legacy mode can warn if needed;  
* profile hash recomputation remains canonical.

## **Phase 4 — Add source fact coverage validator**

Implement conservative parser:

* parse CHAR frontmatter `dramatic_core`;  
* parse `## Capabilities` subsection headings;  
* parse signature scene behavior frontmatter array and body bullets where reliable;  
* parse STCHAR source fact map;  
* validate disposition and target section.

Acceptance criteria:

* triggering fixture fails;  
* valid mapped fixture passes;  
* omitted-with-rationale passes only with rationale;  
* story-irrelevant passes only with rationale;  
* target `Source Distillation` fails for operational facts.

## **Phase 5 — Refine §16a packet validator**

Implement `page_plan_stchar_packet_integrity`.

Acceptance criteria:

* speaker without voice block fails;  
* offstage-only packet with unnecessary voice block warns or fails depending contract;  
* active actor without capabilities/limits line fails;  
* packet hash recomputes;  
* inactive STCHAR fails;  
* `CHAR-*` leak fails.

## **Phase 6 — Clarify/restamp packet hash semantics**

Decide whether STCHAR stores canonical packet projection or page-specific packet hashes live only in page plans/receipts.

Acceptance criteria:

* one source of truth for computing `page_packet_hash`;  
* prose receipt and plan validator agree;  
* docs state exactly what hash covers.

## **Phase 7 — Migration and fixtures**

Add:

* legacy STCHAR migration guide;  
* “capability only in Source Distillation” failure fixture;  
* “offstage pressure needs capability but no voice” fixture;  
* “speaker requires voice” fixture;  
* “silent onstage actor requires behavior/capability but not voice” fixture;  
* “promise/thread carrier requires THR/STQ reference” fixture;  
* “source fact omitted with rationale” fixture.

# **14. Open questions**

1. **Should `source_operational_fact_map` live in frontmatter or in a parseable body block?**  
    My recommendation: body block first, frontmatter only if MCP consumers need fast projection.  
2. **Should legacy STCHAR files fail immediately or warn until touched?**  
    My recommendation: fail for new/modified STCHAR, warn for untouched legacy records during one migration window.  
3. **Should `page_packet_hash` remain a STCHAR frontmatter field?**  
    My recommendation: keep it only if a canonical packet projection is stored or reproducible; otherwise move page-specific packet hashes fully to page plans/receipts to avoid ambiguous authority.

## Outcome

Archived on 2026-05-25 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
