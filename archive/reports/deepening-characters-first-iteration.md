**Status**: COMPLETED

# **Executive Verdict**

Worldloom’s current character system is **structurally sound but not yet memorability-driven enough**. It already has unusually strong machinery for canon safety, material grounding, institutional embedding, epistemic limits, capability costs, and world-grown specificity. The problem is that these mechanisms mostly ensure a character is **valid inside the world**, not that the character has enough contradiction, appetite, self-deception, pressure behavior, relational charge, weirdness, and symbolic force to feel impossible to swap out. The current pipeline can create credible dossiers; it is not yet ruthless enough about rejecting “valid but dull.”

The highest-value change is to introduce a shared **Protagonist-Grade Character Engine** and thread it through three surfaces:

1. **New skill:** `deepen-character-proposal` — a single-seed upgrade skill that extracts the seed essence, generates several radical world-valid mutations, scores them, rejects weaker directions, and emits one upgraded NCP proposal card.  
2. **Revise `propose-new-characters`:** make protagonist-grade force a default generation requirement, not an optional “load-bearing round character” slot.  
3. **Revise `character-generation`:** make final CHAR dossiers preserve and deepen a proposal’s memorability instead of flattening it into a safe dossier.

The second-highest-value change is to make **NCP proposal cards first-class schema-validated records**. The repository already indexes `character-proposals/` as `character_proposal_card`, and scoped/structured reference extraction already recognizes that node type, but the structural validator does not yet include `character_proposal_card` or `character_proposal_batch` in its schema-validation path. That is the biggest deterministic-validation gap.

My strong recommendation: **implement the shared protagonist-grade reference, the `deepen-character-proposal` skill, and first-class NCP schema validation first**. Then revise `propose-new-characters` and `character-generation` to consume the same shared engine.

# **Current Repository Findings**

I used repository search and direct file fetches only, and did not inspect `archive/*` sources for conclusions.

## **Foundations alignment**

`docs/FOUNDATIONS.md` defines Worldloom as a causality-first world model, not a bag of flavor facts. It emphasizes ontology, causality, embodiment, institutions, resources, culture, knowledge, history, ordinary life, pressure points, and Mystery Reserve discipline. The relevant validation principles are especially Rule 2, “No Pure Cosmetics”; Rule 3, “No Specialness Inflation”; Rule 4, “No Globalization by Accident”; and Rule 7, “Preserve Mystery Deliberately.”

That foundation is compatible with protagonist-grade character design, but only if “memorability” is interpreted as **world pressure made personal**, not as arbitrary eccentricity. The new character system should not add “cool traits.” It should force every strange, abrasive, pathetic, cruel, charismatic, grotesque, obsessive, or morally weird trait to have material, institutional, epistemic, relational, or bodily roots.

## **`character-generation`**

The `character-generation` skill creates canonical `CHAR-<integer>` dossiers under `worlds/<world_slug>/characters/`, mutating only the character directory and its index. It has a hard gate before writes, requires context-packet loading, performs world-state normalization, and runs canon safety before committing.

Its phases are strong on grounded construction:

* Phase 0 normalizes required inputs such as location, origin, date, species, social position, profession, kinship, ideology, local pressures, and intended role. It also resolves entity bindings and refuses generic unresolved briefs.  
* Phases 1–6 build material reality, institutional embedding, epistemic position, goals and pressures, capability validation, and voice/perception. These phases already include short-term goal, long-term desire, unavoidable obligation, social fear, private shame, external pressure, internal contradiction, capability cost, and perception rules.  
* Phase 7 checks invariants, Mystery Reserve boundaries, and capability distribution/scope; repair must preserve user intent where possible and cannot silently drop invariants or universalize capabilities.  
* Phase 8 validation tests enforce entity binding, capability stabilizers, canon/Mystery Reserve audit, invariant checks, institutional axes, schema completeness, and “World-Grown Specificity.”

The current `character-dossier.md` template has the right base sections — Material Reality, Institutional Embedding, Epistemic Position, Goals and Pressures, Capabilities, Voice and Perception, Contradictions and Tensions, Likely Story Hooks, Canon Safety Check Trace — but the sections do not yet require a structured protagonist-grade engine. There is no deterministic frontmatter block for wound, appetite, self-mythology, pressure behavior, relational charge, moral/psychological edge, signature scene behavior, or anti-flattening preservation from NCP input.

## **`propose-new-characters`**

The `propose-new-characters` skill is already the closest thing to the desired design. It creates NCP proposal cards and NCB batch manifests under `worlds/<world_slug>/character-proposals/`, does not write canon, and emits cards that are directly consumable by `character-generation` as `character_brief_path`.

Its existing strengths are substantial:

* It builds a Person Registry from character dossiers, diegetic artifact personas, adjudications, and salient offstage figures.  
* It diagnoses negative space before proposing new characters.  
* It generates 3X–5X seeds before selection.  
* It uses seed families such as institution insider, dissenter, ordinary-life witness, boundary broker, taboo technician, pressure sufferer, ideological misinterpreter, regional mirror, artifact-native author, and scale bridge.  
* It requires a per-seed character engine with goals, obligations, pressure, mask, appetite, shame, contradiction, capability path, law/taboo/debt relation, and repeated forced choice.  
* It builds epistemic/perceptual filters and five-level voice signatures.

Its scoring and filtering are also strong but not ruthless enough. Current scoring dimensions include world rootedness, niche distinctiveness, pressure richness, voice distinctiveness, ordinary-life relevance, artifact utility, thematic freshness, expansion potential, canon burden, and overlap risk. Rejection triggers catch cosmetic duplication, profession clones, lore-dump characters, missing institutional embedding, missing ordinary life, missing repeated choice pressure, generic voice, and similar faults.

The issue is that “potentially load-bearing round character” is currently one diversification slot among ten, not the governing quality bar for every card.

## **NCP proposal cards**

The NCP template mirrors the `character-generation` compatibility fields first, then adds proposal-specific metadata: proposal id, batch id, slug, title, niche summary, occupancy strength, depth class, proposal family, diagnosis target, scores, canon assumption flags, recommended next step, critic pass trace, canon safety check, source basis, and notes.

The body includes the dossier-style sections plus Niche Analysis and Canon Safety Check Trace. This is good interop design. But the card lacks an explicit `memorability_profile` or `protagonist_grade_engine` block. The relevant ideas are partially present in Phase 7 engine fields, but too much is prose-only and therefore easy to underweight, omit, or flatten downstream.

The NCB batch manifest is an excellent audit record. It tracks registry summary, constellation/mosaic audit, niche occupancy, negative-space diagnosis, seed generation, score matrix, rejected candidates, diversification, canon repair logs, and final validation. It should be extended rather than replaced.

## **Validators**

`character-frontmatter.schema.json` validates CHAR frontmatter with `additionalProperties: false`, required identity/world-consistency fields, `scoped_references`, and `world_consistency`; it does not include protagonist-grade structural fields. Adding required CHAR frontmatter fields will therefore be high blast radius but mechanically straightforward.

`record-schema-compliance.ts` compiles schemas from `RECORD_TYPE_TO_SCHEMA`, validates indexed structural records, and separately validates hybrid markdown frontmatter from files. Its hybrid markdown scan currently recognizes `characters/`, `diegetic-artifacts/`, and `adjudications/`, but not `character-proposals/`.

`utils.ts` confirms the same gap: `STRUCTURAL_NODE_TYPES`, `RECORD_TYPE_TO_SCHEMA`, `isStructuralAuthorityRecord`, and `listSupportedWorldFiles` include character records and many story records, but not `character_proposal_card` or `character_proposal_batch`.

Conclusion: **NCP is indexed but not structurally schema-validated with the same rigor as CHAR**.

## **World index and MCP surfaces**

The world index parser already maps `character-proposals/` to `character_proposal_card` and batch files under `character-proposals/batches/` to `character_proposal_batch`. It also recognizes `NCP` and `NCB` ids in the structured id regex.

The public node-type list includes both `character_proposal_card` and `character_proposal_batch`, so the schema layer already knows the node types exist.

Scoped reference extraction supports `character_proposal_card` as a scoped source, assigning proposal provenance. Structured edge extraction already connects `character_proposal_card.batch_id` to a `character_proposal_batch`.

The MCP ranking profile registry includes `character_generation` and `propose_new_characters`, but no upgrade/deepening task type. `character_generation`’s profile is minimal, while `propose_new_characters` has a more robust profile that prioritizes character records, named entities, diegetic artifacts, adjudications, invariants, Mystery Reserve, and canon facts.

## **Story consumers**

`branching-story-bootstrap` takes `selected_cast` as a list of existing `CHAR-<integer>` ids from `characters/INDEX.md`, verifies they resolve to existing CHAR dossiers, and then binds them into story-local `STENT` records. It consumes characters as world-canon entities; it does not consume NCP proposal cards.

The context packet contract keeps story-bundle context separate from world-canon task types and explicitly treats story context as null for non-story world tasks. This supports the clean separation the proposal must preserve.

Therefore, character-generation changes should preserve existing CHAR identity fields and sections, but should not add story-specific fields or make the character system story-aware.

# **Research Findings**

The external research points toward the same core conclusion: memorable characters are not memorable because they have more attributes. They are memorable because they behave like intentional agents under pressure, with legible desires, mental states, emotional reactions, relational stakes, and world-constrained choices.

Computational narrative research on narrative planning argues that narrative success depends on causal progression and character believability, and that characters must be perceived as intentional agents whose actions can be explained by goals and commitments. For Worldloom, that means the character system should not merely record “traits”; it should record the character’s **action engine**: what they pursue, what they cannot admit, what pressure recurs, and why they keep choosing badly or forcefully.

Narrative-understanding research similarly treats character motivation, goals, mental states, interactions, and desire fulfillment as central to understanding story. This supports adding explicit fields for appetite/desire, self-mythology, wrong belief, relational charge, and pressure behavior rather than relying on broad prose descriptions.

Research on fictional character relationships argues that emotional relationships among characters are important to story development, not merely social decoration. Worldloom should therefore treat relational charge as a required character-generation surface: whom the character needs, resents, harms, obeys, humiliates, envies, protects, or cannot stop returning to.

NPC believability research emphasizes contextually relevant reactions to changing situations, often emotion-driven, and the need for psychologically plausible affective behavior. That maps cleanly onto deterministic prompt fields such as “what they do when cornered,” “what they do when humiliated,” “what they do when offered power,” and “what they do when their self-myth is threatened.”

Affective-agent research specifically explores appraisal-based emotion simulation for game agents; this reinforces that “pressure behavior” should not be generic mood labeling. It should be an appraisal-to-action pattern: the character interprets a situation through their wound, appetite, fear, and self-deception, then acts in a distinctive way.

Generative-agent research found that believable behavior depends on observation, memory, reflection, and planning. Worldloom does not need to become a live agent simulator, but it should encode the static equivalents that make downstream use possible: what the character notices, what they remember wrongly or obsessively, how they reflect, and what plans they tend to form under stress.

Creative-writing tool research found value in progressive character manifestation through guided prompts and open conversation, especially early in creation. The proposed upgrade skill should therefore not be a single polish pass; it should interrogate and mutate the seed through multiple candidate manifestations before choosing the strongest.

Character-analysis tooling research highlights characterization, events, dialogue, and dynamic scenes as connected surfaces. This supports adding “signature scene behavior” and “voice under pressure” sections: memorable characters are proven in scenes, not in static adjectives.

Tabletop design examples also support this direction. *My Life with Master* operationalizes characters through wants, needs, fear, reason, weariness, self-loathing, and love connections; the useful lesson is not that Worldloom should copy those mechanics, but that intense character design can be made concrete through a small number of pressure-bearing variables.

*Monsterhearts* makes each character class both a supernatural premise and a metaphor for adolescent social/body pressure, then defines relationships during character creation. The relevant lesson for Worldloom is that weirdness should be socially and bodily meaningful, not cosmetic.

CRPG companion design points in the same direction: companion impact comes from values, boundaries, relationships among companions, and the sense that loss or choice affects a social web, not merely the player’s utility roster. Worldloom should import the relational principle, not the game-story dependency: characters should feel embedded in charged networks before any story system consumes them.

# **Definition: Protagonist-Grade Character**

A **protagonist-grade character** is a world-valid person who feels like they could carry a story because their inner engine generates pressure, choices, reversals, and scene behavior without needing an external plot formula.

Operationally, every protagonist-grade character has:

1. **World-produced wound or pressure** — not generic trauma, but damage or distortion caused by the world’s institutions, laws, species conditions, economy, geography, taboo systems, history, or epistemic limits.  
2. **Irreconcilable internal contradiction** — not “kind but strict,” but a tension that repeatedly forces choices: loyalty versus evidence, purity versus survival, appetite versus duty, self-myth versus visible failure.  
3. **Active appetite/desire** — something they hunger for enough to distort judgment: status, touch, absolution, revenge, safety, recognition, forbidden knowledge, purity, domination, ordinariness, obliteration, belonging.  
4. **Self-mythology or delusion** — the story they tell themselves that is partly useful and partly false.  
5. **Pressure behavior** — what they actually do when cornered, humiliated, tempted, contradicted, offered power, deprived, exposed, or forced to protect someone.  
6. **Voice and perception** — what they notice first, what metaphors they reach for, what words they avoid, how they lie, plead, threaten, teach, flirt, confess, or perform status.  
7. **Relational charge** — people or groups they need, exploit, resent, obey, envy, protect, betray, worship, or cannot forgive.  
8. **Moral/psychological edge** — the uncomfortable part: cruelty, cowardice, obsession, erotic strangeness, fanaticism, vanity, pathetic need, sanctimony, self-erasure, violence, humiliation, or repulsive charm when world-valid.  
9. **World-specific surprise** — the character reveals something about this world that a generic version could not reveal.  
10. **Canon-cost clarity** — if the strongest version requires new canon, the proposal names the implied facts and routes them through canon addition/proposal workflows instead of silently canonizing them.

The key standard: **even a background character should feel like the protagonist of their own life**. They do not need main-character screen time. They do need a behavioral engine strong enough that, when touched by pressure, they produce specific, surprising, consequential action.

# **Gap Analysis**

## **What the current system already does well**

The current system is excellent at preventing floating, overpowered, ungrounded, lore-dump, or canon-breaking characters. It requires material reality, institutions, epistemic boundaries, capability paths, costs, and canon-safety audits.

`propose-new-characters` is especially strong because it diagnoses negative space, builds a Person Registry, generates many seeds, scores them, rejects duplicates, tracks canon posture, and emits NCP cards that can feed directly into `character-generation`.

The system already has seeds of protagonist-grade design: `private_appetite`, `private_shame`, `central_contradiction`, `repeated_forced_choice`, `scans_for_under_stress`, and five-level voice.

## **What is missing**

The missing piece is not “add more fields” in the abstract. The missing piece is a **quality doctrine** that forces those fields to become dramatic engines.

Current weak points:

* **Contradiction is present but underpowered.** It is required, but not necessarily irreconcilable, behavioral, or recurring.  
* **Appetite exists in the proposal phase but is not frontmatter-schema-stabilized.** It can disappear or become polite prose.  
* **Self-mythology is missing.** Current fields include shame and fear, but not the lie or myth the character lives by.  
* **Pressure behavior is under-specified.** `scans_for_under_stress` is useful, but not enough. The system needs what they do when cornered, humiliated, tempted, exposed, or offered power.  
* **Relational charge is not required.** A character can be socially embedded but emotionally neutral.  
* **Moral/psychological edge is not a scoring dimension.** The system may overproduce plausible, acceptable, institutionally embedded citizens.  
* **World-specific surprise is softer than it should be.** “World-grown specificity” exists as a validation test, but protagonist-grade surprise should be a core score and rejection gate.  
* **No anti-flattening audit exists.** A strong NCP can be fed into `character-generation` and emerge as a safer, duller dossier.  
* **NCP cards are not schema-validated.** The index recognizes them, but validator infrastructure does not yet treat them as first-class structural records.

# **Proposed New Skill**

## **Name**

Use **`deepen-character-proposal`**.

“Upgrade” sounds like generic improvement. “Deepen” better captures the desired behavior: preserve the seed’s load-bearing essence while making the best version stranger, sharper, more pressured, more compromised, and more revealing.

## **Description**

`deepen-character-proposal` accepts a single seed — either a user-authored brief or an existing NCP proposal card — and emits one stronger NCP proposal card. It is not a dossier generator and never writes canon. It is allowed to radically mutate the seed as long as it preserves the seed’s essence.

## **Arguments**

Recommended skill arguments:

arguments:  
 - name: world_slug  
   required: true  
   description: Existing world directory slug under worlds/  
 - name: input_path  
   required: true  
   description: Path to either a markdown seed brief or an existing NCP proposal card  
 - name: upgrade_intensity  
   required: false  
   description: tempered | radical | feral; default radical  
 - name: canon_risk_tolerance  
   required: false  
   description: conservative | open_to_edge | open_to_canon_requiring; default open_to_edge  
 - name: output_mode  
   required: false  
   description: preview_only | write_after_approval; default write_after_approval

## **Input modes**

Mode 1: **User-authored markdown brief** with:

# Character seed

<plain-English concept>

## Parameters

current_location: ...  
place_of_origin: ...  
date: ...  
species: ...  
age_band: ...  
social_position: ...  
profession: ...  
kinship_situation: ...  
religious_ideological_environment: ...  
major_local_pressures:  
 - ...  
intended_narrative_role: ...

Mode 2: **Existing NCP proposal card** at:

worlds/<world-slug>/character-proposals/NCP-<integer>-<slug>.md

The skill parses both frontmatter and body. For NCP input, it must preserve the source card’s load-bearing essence but may replace weak execution.

## **Process phases**

1. **Pre-flight**  
   * Load `docs/FOUNDATIONS.md`, `WORLD_KERNEL.md`, `ONTOLOGY.md`, and the new shared protagonist-grade reference.  
   * Load context packet with new task type `character_proposal_upgrade`.  
   * Load Person Registry and relevant existing NCP cards for overlap detection.  
   * Load invariants and Mystery Reserve firewall surfaces.  
   * Parse the input seed and normalize it into a `seed_essence`.  
2. **Seed essence extraction**  
   * Identify non-negotiables: world location, species/body premise, institutional slot, central role, user-specified constraints, taboo limits, canon assumptions, and any phrase that is clearly the concept’s core.  
   * Identify negotiables: profession expression, social rank, wound, shame, appetite, moral edge, relationship network, canon posture, voice family, and pressure behavior.  
3. **Blandness diagnosis**  
   * Name what is currently predictable, safe, generic, over-comfortable, merely cosmetic, or too similar to existing characters.  
   * If no weakness is found, still generate mutations; the best mutation may simply intensify a strong seed.  
4. **World-pressure stress map**  
   * Map seed essence against world pressures from canon facts, sections, institutions, species/body logic, economy, geography, Mystery Reserve boundaries, and core pressures.  
   * Identify where the world can plausibly deform this person.  
5. **Generate radical mutation candidates**  
   * Generate 5–8 variants.  
   * Required spread:  
     * one darker version,  
     * one more pathetic/humiliating version,  
     * one more institutionally dangerous version,  
     * one more ordinary-but-sharper version,  
     * one canon-edge or canon-requiring brilliant version when world-valid,  
     * one version that reverses the seed premise without breaking essence.  
   * Each mutation must state what essence it preserves and what it mutates.  
6. **Score and critic-pass**  
   * Score each candidate 1–5 on:  
     * seed essence preservation,  
     * world rootedness,  
     * protagonist-grade force,  
     * contradiction irreconcilability,  
     * appetite specificity,  
     * pressure behavior distinctiveness,  
     * self-mythology strength,  
     * relational charge,  
     * moral/psychological edge,  
     * voice/perception distinction,  
     * world-specific surprise,  
     * canon-cost clarity,  
     * generation readiness.  
   * Penalize:  
     * overlap risk,  
     * canon burden without payoff,  
     * cosmetic weirdness,  
     * comfort-polishing,  
     * generic tragic backstory,  
     * “cool but uncaused” specialness.  
7. **Reject weak candidates**  
   * Required rejection triggers:  
     * only polishes the original concept,  
     * changes essence rather than deepening it,  
     * weirdness is cosmetic,  
     * contradiction is non-behavioral,  
     * no active appetite,  
     * no pressure behavior,  
     * no relational charge,  
     * too much new canon for too little gain,  
     * violates Mystery Reserve or invariant discipline,  
     * duplicates existing registry niche.  
8. **Select best candidate**  
   * Pick the best surviving candidate, not necessarily the safest.  
   * Prefer a canon-edge/canon-requiring candidate over a canon-safe one when the dramatic payoff is high and the canon route is explicit.  
9. **Canon routing**  
   * Classify as `canon-safe`, `canon-edge`, or `canon-requiring`.  
   * If canon-requiring, list implied facts and route:  
     * `canon-addition` when the fact is precise, local, and ready for direct adjudication.  
     * `propose-new-canon-facts` when the character implies a cluster of systemic facts, an institution, distribution rule, taboo, social practice, technology/magic pattern, or broader world update.  
   * Never write canon facts.  
10. **Compose upgraded NCP card**  
    * Emit one NCP-compatible card with a new `memorability_profile` and `upgrade_lineage`.  
    * Include a short rejected-directions audit: enough to prove multi-candidate work occurred, not enough to bloat the card.  
11. **Validation**  
    * Deterministic checks for required fields, IDs, enums, non-empty sections, canon routing, and body headings.  
    * LLM critic checks for memorability, surprise, psychological specificity, pressure behavior, voice distinction, and non-genericness.  
12. **Hard gate**  
    * No file writes until the user approves the preview.  
    * On approval, write the NCP card and update `character-proposals/INDEX.md`.  
    * Do not write a CHAR dossier and do not write canon.

## **Output path**

Recommended:

worlds/<world_slug>/character-proposals/NCP-<integer>-<slug>.md

Do not require a full NCB batch manifest for every upgrade card unless the repository owner wants every NCP to have a batch edge. Instead, make `batch_id` optional for NCP schema and add:

origin:  
 kind: upgraded_seed  
 source_path: "..."  
 source_proposal_id: "NCP-<integer> | null"  
 upgrade_run_id: "NCU-<integer>"

If you want every proposal artifact to remain batch-addressable, introduce a lightweight `NCU-<integer>` upgrade audit record under:

worlds/<world_slug>/character-proposals/upgrades/NCU-<integer>.md

But my recommendation is **do not add NCU yet**. Put the compact audit in the card first. Add a separate audit record only if repeated upgrade chains become hard to inspect.

## **Relationship to `character-generation`**

`deepen-character-proposal` outputs an NCP card that can be passed to `character-generation` via `character_brief_path`. `character-generation` should treat `memorability_profile` as a preservation contract: it may repair canon issues, but it must not flatten the engine unless the user approves a named flattening tradeoff.

## **Relationship to `propose-new-characters`**

`propose-new-characters` remains the batch generator. `deepen-character-proposal` is the single-seed radicalizer. Both should use the same shared protagonist-grade reference and scoring rubric.

# **Proposed Changes to `propose-new-characters`**

## **Add a shared protagonist-grade phase**

Insert a new phase after the existing Phase 7 character engine and before Phase 8 epistemic/perceptual filter:

Phase 7b: Protagonist-Grade Engine

For every seed, require:

protagonist_grade_engine:  
 world_produced_wound: ""  
 active_appetite: ""  
 self_mythology: ""  
 irreconcilable_contradiction: ""  
 pressure_behavior:  
   cornered: ""  
   tempted: ""  
   humiliated: ""  
   offered_power: ""  
   protecting_attachment: ""  
 relational_charge:  
   - target_or_relation_type: ""  
     need: ""  
     resentment_or_fear: ""  
     likely_harm_or_betrayal: ""  
 moral_psychological_edge: ""  
 signature_scene_behaviors: []  
 cannot_be_swapped_out_because: ""

This should not replace existing fields like `private_appetite`, `private_shame`, and `repeated_forced_choice`; it should consolidate and intensify them.

## **Expand seed families**

Keep the existing 16 families, but add high-yield mutation families:

17. self-mythologizer  
18. shame-defender  
19. corrupted caretaker  
20. sincere fanatic  
21. failed prodigy  
22. beloved institutional monster  
23. pathetic gatekeeper  
24. bodily taboo carrier  
25. erotic/status transgressor, only when world-valid and within user taboo limits  
26. impossible witness  
27. humiliated expert  
28. dangerous innocent  
29. obsolete loyalist  
30. contaminating saint

These are not surface archetypes. They are mutation prompts. Every one must still pass world-rootedness and no-pure-cosmetics tests.

## **Revise scoring**

Replace the current score matrix with a two-layer matrix.

Layer A: Worldloom validity:

world_validity_scores:  
 world_rootedness: 1-5  
 niche_distinctiveness: 1-5  
 institutional_embedding: 1-5  
 ordinary_life_relevance: 1-5  
 capability_cost_integrity: 1-5  
 canon_safety: 1-5  
 canon_burden: 1-5 # lower better  
 overlap_risk: 1-5 # lower better

Layer B: protagonist-grade force:

memorability_scores:  
 protagonist_grade_force: 1-5  
 contradiction_irreconcilability: 1-5  
 appetite_specificity: 1-5  
 self_mythology_strength: 1-5  
 pressure_behavior_distinctiveness: 1-5  
 voice_pressure_distinction: 1-5  
 relational_charge: 1-5  
 moral_psychological_edge: 1-5  
 world_specific_surprise: 1-5  
 cannot_be_swapped_out: 1-5

Aggregate should weight memorability heavily:

aggregate =  
 validity_total  
 + 1.5 * memorability_total  
 - canon_burden  
 - overlap_risk

A proposal with weak memorability should not survive merely because it is canon-safe.

## **Add rejection triggers**

Add these to Phase 12:

14. Valid but dull: canon-safe and plausible, but no unforgettable engine.  
15. Contradiction is abstract, not forced into behavior.  
16. Appetite is generic, polite, or missing.  
17. Self-mythology missing or merely a stated belief.  
18. Pressure behavior absent or interchangeable.  
19. Weirdness is cosmetic, not world-produced.  
20. Relationship-neutral: no charged need, harm, resentment, dependence, worship, betrayal, or envy.  
21. Moral/psychological edge sanded off for comfort.  
22. Seed mutation too timid; final card mostly restates the initial premise.  
23. Brilliant canon-requiring version was suppressed instead of routed.  
24. Voice is distinct in vocabulary only, not in perception or pressure speech.  
25. “Special” by exception without cost, bottleneck, secrecy, taboo, or institutional mechanism.

## **Add critic passes**

Add two mandatory critic passes:

phase_7b_blandness_executioner: ""  
phase_7b_protagonist_grade_critic: ""

The blandness critic’s job is to fail cards that are “good Worldloom citizens” but not memorable. The protagonist-grade critic’s job is to ask: “Could this person plausibly carry a compelling story if the world pressed on them hard enough?”

## **Update Phase 15 tests**

Add per-card tests:

13. Protagonist-grade engine exists and all required fields are populated.  
14. `world_produced_wound`, `active_appetite`, and `self_mythology` are not generic.  
15. `pressure_behavior` includes at least four distinct stress responses.  
16. `relational_charge` has at least one charged relation with need and harm risk.  
17. `cannot_be_swapped_out_because` names world-specific reasons.  
18. Memorability critic pass is recorded with rationale.

Tests 14–18 are partly LLM-critic judged, but the presence and shape of fields are deterministic.

# **Proposed Changes to `character-generation`**

## **Add a preservation contract**

When `character_brief_path` points to an NCP card containing `memorability_profile`, Phase 0 should extract it and treat it as a **non-flattening contract**:

input_memorability_contract:  
 source_proposal_id: NCP-<integer>  
 preserved_essence: []  
 protagonist_grade_engine: {}  
 flattening_forbidden_without_user_approval: true

If canon safety requires weakening a dramatic element, the skill must name the tradeoff in Phase 9 before commit.

## **Add Phase 4b**

Insert:

Phase 4b: Protagonist-Grade Deepening / Preservation

Tasks:

* Preserve NCP `memorability_profile` if present.  
* If no NCP profile exists, derive one from the brief and generated character.  
* Convert contradiction into repeated behavior.  
* Convert shame into self-mythology.  
* Convert desire into appetite.  
* Convert social embedding into relational charge.  
* Convert voice into pressure speech.  
* Add at least three signature scene behaviors that arise from body, work, status, fear, appetite, or institution.

## **Add CHAR frontmatter block**

Add required CHAR frontmatter:

dramatic_core:  
 world_produced_wound: ""  
 active_appetite: ""  
 self_mythology: ""  
 irreconcilable_contradiction: ""  
 pressure_behavior:  
   cornered: ""  
   tempted: ""  
   humiliated: ""  
   offered_power: ""  
   protecting_attachment: ""  
 relational_charge:  
   - target_or_relation_type: ""  
     need: ""  
     resentment_or_fear: ""  
     likely_harm_or_betrayal: ""  
 moral_psychological_edge: ""  
 signature_scene_behaviors:  
   - ""  
   - ""  
   - ""  
 voice_under_pressure:  
   lying: ""  
   pleading: ""  
   threatening: ""  
   confessing: ""  
 cannot_be_swapped_out_because: ""

This is high blast radius, but worthwhile. The user explicitly does not require backward compatibility.

## **Add dossier body sections**

Keep existing body sections, but add these before “Likely Story Hooks”:

## Protagonist-Grade Core

## Pressure Behavior

## Self-Mythology and Blind Spots

## Relational Charge

## Moral and Psychological Edge

## Signature Scene Behavior

“Likely Story Hooks” should remain non-story-system-specific. It can continue to describe pressure surfaces, but it should not become act structure, destiny, or story-pipeline optimization.

## **Add validation tests**

Extend character-generation Phase 8:

11. `dramatic_core` required and complete.  
12. Wound is world-produced, not generic biography.  
13. Contradiction is behavioral and recurrent.  
14. Pressure behavior has distinct responses, not synonyms.  
15. Relational charge includes need and likely harm/betrayal.  
16. Voice under pressure passes swap test.  
17. If source was NCP, dossier preserves or explicitly names any altered memorability element.  
18. No story-system-specific fields added.

The deterministic validator can enforce shape and non-empty content. LLM critics judge literary quality.

# **Proposed Schema and Validator Changes**

## **NCP cards should become first-class schema-validated records**

Yes. This is the clearest validator win.

The repo already has:

* `character_proposal_card` and `character_proposal_batch` node types.  
* prose parsing for `character-proposals/`.  
* scoped reference extraction for NCP cards.  
* structured edge extraction from NCP `batch_id` to NCB.

But validator utilities omit `character_proposal_card` and `character_proposal_batch`.

## **Add schemas**

Add:

tools/validators/src/schemas/character-proposal-card.schema.json  
tools/validators/src/schemas/character-proposal-batch.schema.json

NCP schema should require:

proposal_id  
slug  
title  
current_location  
place_of_origin  
date  
species  
age_band  
social_position  
profession  
kinship_situation  
religious_ideological_environment  
major_local_pressures  
intended_narrative_role  
niche_summary  
depth_class  
proposal_family  
diagnosis_target  
memorability_profile  
scores  
canon_assumption_flags  
recommended_next_step  
critic_pass_trace  
canon_safety_check  
source_basis

Do not require `batch_id` for upgraded single-seed cards unless the team wants every NCP to link to an NCB. Existing batch-generated cards can still include it.

`canon_assumption_flags` should enforce:

status: canon-safe | canon-edge | canon-requiring  
implied_new_facts:  
 - statement: string  
   reason_needed: string  
   preferred_route: canon-addition | propose-new-canon-facts

If `status: canon-requiring`, `implied_new_facts` must be non-empty.

## **Update structural validator utilities**

Add `character_proposal_card` and `character_proposal_batch` to:

* `STRUCTURAL_NODE_TYPES`  
* `RECORD_TYPE_TO_SCHEMA`  
* `isStructuralAuthorityRecord`  
* `listSupportedWorldFiles`  
* `hybridRecordsFromFiles`

## **Add structural body validator**

Add a separate validator rather than overloading JSON schema:

tools/validators/src/structural/character-memorability-structure.ts

It should check headings and basic body completeness for both CHAR and NCP.

Deterministic checks:

* Missing `## Protagonist-Grade Core`  
* Missing `## Pressure Behavior`  
* Missing `## Relational Charge`  
* Missing `## Self-Mythology and Blind Spots`  
* Missing `## Moral and Psychological Edge`  
* Missing `## Signature Scene Behavior`  
* NCP missing `## Rejected Directions Audit` when `origin.kind: upgraded_seed`  
* NCP `canon-requiring` without implied facts  
* CHAR `dramatic_core.signature_scene_behaviors` fewer than 3  
* `pressure_behavior` values duplicated or empty  
* placeholder/TODO text

Example failure messages:

CHAR-12 missing /dramatic_core/world_produced_wound:  
add a concrete pressure caused by canon, institution, species/body condition,  
economy, geography, taboo, or history. Generic biography does not pass.  
NCP-8 canon-requiring but /canon_assumption_flags/implied_new_facts is empty:  
name each implied fact and route it through canon-addition or propose-new-canon-facts.  
NCP-8 missing ## Rejected Directions Audit:  
deepen-character-proposal must record at least three rejected mutation directions  
with one-line rejection reasons.

## **Deterministic versus LLM-critic judgment**

Deterministic validators should enforce:

* IDs  
* enums  
* required fields  
* non-empty arrays  
* route presence  
* body headings  
* placeholder absence  
* field shape  
* frontmatter/body coherence  
* NCP canon posture requirements  
* CHAR/NCP required dramatic-core surfaces

LLM critics should judge:

* memorability  
* surprise  
* protagonist-grade force  
* non-genericness  
* quality of contradiction  
* psychological specificity  
* moral edge  
* voice distinction  
* whether weirdness is world-produced  
* whether the dossier flattened an NCP

Do not pretend AJV can judge literary greatness. It can force the system to expose the material that an LLM critic can judge.

## **Tests to add**

1. NCP schema accepts a complete upgraded card.  
2. NCP schema rejects missing `memorability_profile`.  
3. NCP schema rejects `canon-requiring` with empty `implied_new_facts`.  
4. CHAR schema rejects missing `dramatic_core`.  
5. Structural validator rejects missing protagonist-grade body headings.  
6. Structural validator validates `character-proposals/NCP-*.md` through `hybridRecordsFromFiles`.  
7. `listSupportedWorldFiles` includes `character-proposals/*.md` and `character-proposals/batches/*.md`.  
8. World-index whole-file test confirms NCP remains canonical node id.  
9. Structured edge test confirms batch-generated NCP still links to NCB when `batch_id` exists.  
10. Story bootstrap fixture still resolves selected CHAR ids unchanged.

# **MCP / World Index / Retrieval Implications**

## **Add task type**

Add:

"character_proposal_upgrade"

to `TASK_TYPES`, `rankingProfilesByTaskType`, default budgets, and the context-packet contract.

Recommended default token budget: **15000**. If full-body MR/invariant delivery becomes necessary, use **18000**.

## **Add ranking profile**

Create `characterProposalUpgradeRankingProfile` with high priority for:

character_proposal_card: 1.5  
character_record: 1.35  
diegetic_artifact_record: 1.15  
adjudication_record: 1.1  
named_entity: 1.25  
canon_fact_record: 1.2  
invariant: 1.2  
mystery_reserve_entry: 1.2  
section: 0.9  
narrative_section: 0.8

Boost edges:

references_record: 12  
references_scoped_name: 10  
mentions_entity: 12  
firewall_for: 10  
pressures: 8

The profile should prioritize the input NCP or brief-derived local authority first, then nearest existing CHAR/NCP overlaps, then governing canon.

## **Full-body delivery**

For `character_proposal_upgrade`, full-body candidates should include:

* `character_proposal_card`  
* `character_record`  
* `canon_fact_record`  
* `invariant`  
* `mystery_reserve_entry`  
* relevant `section` records from `PEOPLES_AND_SPECIES`, `EVERYDAY_LIFE`, `INSTITUTIONS`, `ECONOMY_AND_RESOURCES`, and `GEOGRAPHY`

## **World index**

The parser already supports NCP/NCB indexing. Practical changes:

* Consider adding `NCB` to `CANONICAL_ID_REGEX` so batch records can receive canonical ids when frontmatter exposes `batch_id`. Current normal NCP cards canonicalize via `proposal_id`; batch files are handled as whole-file records but not explicitly canonicalized the same way.  
* Keep `character_proposal_card` scoped-reference support.  
* Add schema validation; do not change index semantics unless necessary.

# **Story-System Blast-Radius Analysis**

Story bootstrap consumes canonical CHAR dossiers, not NCP cards. It verifies `selected_cast` against `characters/INDEX.md` and binds cast members into story-local records.

Therefore:

* Do **not** add story-specific fields to CHAR or NCP.  
* Do **not** add “role in future story,” “arc beat,” “act position,” “plot destiny,” or “companion quest” fields.  
* Do **not** make `character-generation` aware of `story_bootstrap`.  
* Preserve CHAR id format, `characters/INDEX.md`, and current required frontmatter identity fields.  
* Add protagonist-grade fields as world-character fields: behavior, pressure, relationships, voice, appetite, self-mythology, moral edge.

Expected story impact: story bootstrap and turn-cycle will receive richer CHAR dossiers, but should remain unchanged. Any story improvements should be emergent: better cast members produce better state, beliefs, relationships, choices, and prose plans. The character system remains a clean upstream producer.

# **Backwards Compatibility and Existing Characters**

No migration or backward compatibility should be required.

Old CHAR dossiers and NCP cards should fail validation once the new schema is active. That is acceptable and desirable under this mission. The validator should not silently tolerate old weak structures.

Failure posture:

* Fail with actionable messages.  
* Name the missing field or section.  
* Explain the kind of content needed.  
* Do not auto-migrate.  
* Do not preserve old fields just to reduce breakage.  
* Do not weaken the new structure because existing records lack it.

Manual editing is the right migration path.

# **Implementation Plan**

## **Phase 1 — Shared doctrine and templates**

Files:

.claude/skills/_shared-references/protagonist-grade-character-engine.md  
.claude/skills/propose-new-characters/templates/proposal-card.md  
.claude/skills/character-generation/templates/character-dossier.md

Work:

* Add shared protagonist-grade definition, engine fields, mutation rules, scoring rubric, rejection triggers, and critic prompts.  
* Add `memorability_profile` to NCP template.  
* Add `dramatic_core` to CHAR template.

Tests:

* Template smoke checks for required headings.  
* Manual sample NCP and CHAR pass template completeness.

Acceptance criteria:

* A skill author has one canonical reference for protagonist-grade character construction.  
* NCP and CHAR templates expose required fields.

## **Phase 2 — New `deepen-character-proposal` skill**

Files:

.claude/skills/deepen-character-proposal/SKILL.md  
.claude/skills/deepen-character-proposal/templates/upgraded-proposal-card.md

Work:

* Add preflight, input parsing, seed essence extraction, mutation generation, scoring, rejection audit, canon routing, validation, hard gate, and write behavior.  
* Use multi-candidate internal generation by default.

Tests:

* User-authored brief input.  
* Existing NCP input.  
* Canon-safe output.  
* Canon-requiring output with route.  
* Rejected-directions audit present.

Acceptance criteria:

* The skill emits one stronger NCP card.  
* It can feed its own output back into itself.  
* It can feed output into `character-generation`.

## **Phase 3 — Revise `propose-new-characters`**

Files:

.claude/skills/propose-new-characters/references/phases-6-9-seeds-engine-epistemic-voice.md  
.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md  
.claude/skills/propose-new-characters/references/phases-14-16-compose-validate-commit.md  
.claude/skills/propose-new-characters/templates/proposal-card.md  
.claude/skills/propose-new-characters/templates/batch-manifest.md

Work:

* Add Phase 7b.  
* Add seed families.  
* Revise score matrix.  
* Add rejection triggers.  
* Add Phase 15 tests.  
* Add critic pass slots.

Tests:

* Batch proposal manifest includes new scores.  
* Bad bland seed gets rejected.  
* Canon-requiring strong seed routes rather than disappears.  
* Voice/pressure duplication fails.

Acceptance criteria:

* Future batch cards are stronger by default.  
* “Valid but dull” is a named failure mode.

## **Phase 4 — Revise `character-generation`**

Files:

.claude/skills/character-generation/SKILL.md  
.claude/skills/character-generation/references/phase-0-normalize-brief.md  
.claude/skills/character-generation/references/phases-1-6-character-construction.md  
.claude/skills/character-generation/references/phase-8-validation-tests.md  
.claude/skills/character-generation/templates/character-dossier.md

Work:

* Parse NCP `memorability_profile`.  
* Add Phase 4b preservation/deepening.  
* Add anti-flattening validation.  
* Add new body sections.  
* Add `dramatic_core`.

Tests:

* NCP with strong profile becomes CHAR preserving all load-bearing elements.  
* Canon repair that weakens profile is surfaced before approval.  
* Non-NCP brief still gets a generated dramatic core.  
* Dossier without `dramatic_core` fails.

Acceptance criteria:

* Character-generation no longer flattens upgraded proposals.  
* CHAR dossier remains world entity, not story-aware.

## **Phase 5 — Schemas and validators**

Files:

tools/validators/src/schemas/character-frontmatter.schema.json  
tools/validators/src/schemas/character-proposal-card.schema.json  
tools/validators/src/schemas/character-proposal-batch.schema.json  
tools/validators/src/structural/utils.ts  
tools/validators/src/structural/record-schema-compliance.ts  
tools/validators/src/structural/character-memorability-structure.ts

Work:

* Add CHAR `dramatic_core` schema.  
* Add NCP/NCB schemas.  
* Add structural recognition for `character-proposals/`.  
* Add body-heading validator.

Tests:

* AJV schema pass/fail tests.  
* Hybrid file validation includes NCP/NCB.  
* Actionable failure message snapshots.

Acceptance criteria:

* NCP is first-class validated.  
* Old weak records fail usefully.

## **Phase 6 — MCP/context packet**

Files:

tools/world-mcp/src/ranking/profiles/index.ts  
tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts  
docs/CONTEXT-PACKET-CONTRACT.md

Work:

* Add `character_proposal_upgrade` task type.  
* Add ranking profile.  
* Add default token budget.  
* Add full-body candidates.

Tests:

* `get_context_packet(task_type='character_proposal_upgrade')` works.  
* Seed NCP is local authority.  
* Existing story profiles unchanged.

Acceptance criteria:

* Upgrade skill gets the right context without story contamination.

# **Candidate File Edits**

These are proposal-level candidate edits, not a PR.

## **New file: `.claude/skills/_shared-references/protagonist-grade-character-engine.md`**

# Protagonist-Grade Character Engine

A protagonist-grade character is a world-valid person whose inner engine can generate  
specific behavior under pressure. The goal is not heroic importance. The goal is that  
even a background figure feels like the protagonist of their own life.

## Required Engine Fields

- `world_produced_wound` — damage, distortion, hunger, shame, or pressure caused by  
 world institutions, body/species conditions, economy, geography, taboo, law, religion,  
 history, or epistemic limits.  
- `active_appetite` — what the character wants badly enough to distort judgment.  
- `self_mythology` — the story the character tells themselves that is partly useful and  
 partly false.  
- `irreconcilable_contradiction` — a pressure that repeatedly forces choice.  
- `pressure_behavior` — what the character does when cornered, tempted, humiliated,  
 offered power, or forced to protect an attachment.  
- `relational_charge` — charged need, resentment, dependency, envy, worship, debt,  
 attraction, disgust, loyalty, or betrayal risk.  
- `moral_psychological_edge` — the uncomfortable human material that prevents comfort-polish.  
- `signature_scene_behaviors` — concrete scene actions that prove the character cannot  
 be replaced by a generic occupant of the same role.  
- `voice_under_pressure` — how speech changes while lying, pleading, threatening,  
 confessing, teaching, or hiding ignorance.  
- `cannot_be_swapped_out_because` — why this person, not just this role, matters.

## Mutation Rule

Do not merely intensify adjectives. Mutate the social, institutional, bodily, moral,  
or epistemic engine while preserving the seed essence.

Required mutation spread for single-seed upgrades:

1. darker  
2. more pathetic or humiliating  
3. more institutionally dangerous  
4. more ordinary but sharper  
5. canon-edge or canon-requiring, if world-valid  
6. premise reversal that preserves essence

## Rejection Triggers

Reject if:

- the concept is merely polished;  
- weirdness is cosmetic;  
- contradiction does not force behavior;  
- appetite is missing or polite;  
- no pressure behavior is specified;  
- no charged relationship exists;  
- moral edge is sanded off for comfort;  
- canon-requiring brilliance is hidden instead of routed;  
- the character could be swapped with another occupant of the same role.

## **New skill: `.claude/skills/deepen-character-proposal/SKILL.md`**

---  
name: deepen-character-proposal  
description: "Use when upgrading one user-authored character seed or one existing NCP proposal card into a stronger protagonist-grade NCP proposal card. Produces one improved NCP card; never writes canon; never writes a CHAR dossier."  
user-invocable: true  
arguments:  
 - name: world_slug  
   required: true  
   description: "Existing world directory slug under worlds/"  
 - name: input_path  
   required: true  
   description: "Markdown seed brief or existing NCP proposal card"  
 - name: upgrade_intensity  
   required: false  
   description: "tempered | radical | feral; default radical"  
 - name: canon_risk_tolerance  
   required: false  
   description: "conservative | open_to_edge | open_to_canon_requiring; default open_to_edge"  
 - name: output_mode  
   required: false  
   description: "preview_only | write_after_approval; default write_after_approval"  
---

# Deepen Character Proposal

Transform one seed into one stronger NCP proposal card. This skill is not a  
polish pass. It preserves the seed's load-bearing essence, generates multiple  
radical world-valid mutations, rejects weaker directions, and emits the best  
upgraded proposal.

<HARD-GATE>  
Do not write any file until:  
1. FOUNDATIONS, WORLD_KERNEL, ONTOLOGY, and the shared protagonist-grade reference are loaded.  
2. The input seed has been parsed.  
3. Context packet has been loaded with task_type='character_proposal_upgrade'.  
4. Existing CHAR/NCP registry overlap has been checked.  
5. Invariant and Mystery Reserve checks have been run.  
6. At least five mutation candidates have been generated and scored.  
7. Rejected directions have been recorded.  
8. The upgraded NCP preview has been shown to the user.  
9. The user explicitly approves the write.  
</HARD-GATE>

## Input Modes

### Markdown seed brief

Requires a plain-English concept and a `## Parameters` section containing the  
fields required by character-generation.

### Existing NCP card

Parse frontmatter and body. Preserve load-bearing essence, not weak execution.

## Process

1. Pre-flight.  
2. Extract seed essence.  
3. Diagnose blandness and predictability.  
4. Map world pressures onto seed.  
5. Generate 5-8 radical mutations.  
6. Score mutations.  
7. Reject weak candidates.  
8. Select strongest surviving candidate.  
9. Run canon routing.  
10. Compose upgraded NCP.  
11. Validate deterministic structure.  
12. Run protagonist-grade critic.  
13. Present preview.  
14. On approval, write card and update character-proposals/INDEX.md.

## Canon Posture

Allowed statuses:

- canon-safe  
- canon-edge  
- canon-requiring

For canon-requiring proposals, list implied facts and route each through  
`canon-addition` or `propose-new-canon-facts`. This skill never writes canon.

## Output

One NCP proposal card under:

`worlds/<world_slug>/character-proposals/NCP-<integer>-<slug>.md`

## **Add to NCP template frontmatter**

memorability_profile:  
 seed_essence_preserved:  
   - ""  
 world_produced_wound: ""  
 active_appetite: ""  
 self_mythology: ""  
 irreconcilable_contradiction: ""  
 pressure_behavior:  
   cornered: ""  
   tempted: ""  
   humiliated: ""  
   offered_power: ""  
   protecting_attachment: ""  
 relational_charge:  
   - target_or_relation_type: ""  
     need: ""  
     resentment_or_fear: ""  
     likely_harm_or_betrayal: ""  
 moral_psychological_edge: ""  
 signature_scene_behaviors:  
   - ""  
   - ""  
   - ""  
 voice_under_pressure:  
   lying: ""  
   pleading: ""  
   threatening: ""  
   confessing: ""  
 cannot_be_swapped_out_because: ""

upgrade_lineage:  
 origin_kind: batch_generated | upgraded_seed | user_seed  
 source_path: ""  
 source_proposal_id: ""  
 mutation_summary: ""  
 rejected_directions_audit:  
   - candidate: ""  
     rejected_because: ""

## **Add to CHAR frontmatter schema conceptually**

dramatic_core:  
 world_produced_wound: ""  
 active_appetite: ""  
 self_mythology: ""  
 irreconcilable_contradiction: ""  
 pressure_behavior:  
   cornered: ""  
   tempted: ""  
   humiliated: ""  
   offered_power: ""  
   protecting_attachment: ""  
 relational_charge:  
   - target_or_relation_type: ""  
     need: ""  
     resentment_or_fear: ""  
     likely_harm_or_betrayal: ""  
 moral_psychological_edge: ""  
 signature_scene_behaviors:  
   - ""  
   - ""  
   - ""  
 voice_under_pressure:  
   lying: ""  
   pleading: ""  
   threatening: ""  
   confessing: ""  
 cannot_be_swapped_out_because: ""

## **New schema: `tools/validators/src/schemas/character-proposal-card.schema.json`**

Candidate skeleton:

{  
 "$schema": "https://json-schema.org/draft/2020-12/schema",  
 "$id": "https://worldloom.local/schemas/character-proposal-card.schema.json",  
 "title": "CharacterProposalCard",  
 "type": "object",  
 "additionalProperties": false,  
 "required": [  
   "proposal_id",  
   "slug",  
   "title",  
   "current_location",  
   "place_of_origin",  
   "date",  
   "species",  
   "age_band",  
   "social_position",  
   "profession",  
   "kinship_situation",  
   "religious_ideological_environment",  
   "major_local_pressures",  
   "intended_narrative_role",  
   "niche_summary",  
   "depth_class",  
   "proposal_family",  
   "diagnosis_target",  
   "memorability_profile",  
   "scores",  
   "canon_assumption_flags",  
   "recommended_next_step",  
   "critic_pass_trace",  
   "canon_safety_check",  
   "source_basis"  
 ],  
 "properties": {  
   "proposal_id": { "type": "string", "pattern": "^NCP-[0-9]+$" },  
   "batch_id": { "type": "string", "pattern": "^NCB-[0-9]+$" },  
   "slug": { "type": "string", "minLength": 1 },  
   "title": { "type": "string", "minLength": 1 },  
   "current_location": { "type": "string", "minLength": 1 },  
   "place_of_origin": { "type": "string", "minLength": 1 },  
   "date": { "type": "string", "minLength": 1 },  
   "species": { "type": "string", "minLength": 1 },  
   "age_band": { "type": "string", "minLength": 1 },  
   "social_position": { "type": "string", "minLength": 1 },  
   "profession": { "type": "string", "minLength": 1 },  
   "kinship_situation": { "type": "string", "minLength": 1 },  
   "religious_ideological_environment": { "type": "string", "minLength": 1 },  
   "major_local_pressures": {  
     "type": "array",  
     "minItems": 1,  
     "items": { "type": "string", "minLength": 1 }  
   },  
   "intended_narrative_role": { "type": "string", "minLength": 1 },  
   "niche_summary": { "type": "string", "minLength": 1 },  
   "depth_class": {  
     "type": "string",  
     "enum": ["emblematic", "elastic", "round_load_bearing", "protagonist_grade"]  
   },  
   "proposal_family": { "type": "string", "minLength": 1 },  
   "diagnosis_target": { "type": "string", "minLength": 1 },  
   "memorability_profile": {  
     "type": "object",  
     "additionalProperties": false,  
     "required": [  
       "seed_essence_preserved",  
       "world_produced_wound",  
       "active_appetite",  
       "self_mythology",  
       "irreconcilable_contradiction",  
       "pressure_behavior",  
       "relational_charge",  
       "moral_psychological_edge",  
       "signature_scene_behaviors",  
       "voice_under_pressure",  
       "cannot_be_swapped_out_because"  
     ],  
     "properties": {  
       "seed_essence_preserved": {  
         "type": "array",  
         "minItems": 1,  
         "items": { "type": "string", "minLength": 1 }  
       },  
       "world_produced_wound": { "type": "string", "minLength": 1 },  
       "active_appetite": { "type": "string", "minLength": 1 },  
       "self_mythology": { "type": "string", "minLength": 1 },  
       "irreconcilable_contradiction": { "type": "string", "minLength": 1 },  
       "pressure_behavior": {  
         "type": "object",  
         "additionalProperties": false,  
         "required": ["cornered", "tempted", "humiliated", "offered_power", "protecting_attachment"],  
         "properties": {  
           "cornered": { "type": "string", "minLength": 1 },  
           "tempted": { "type": "string", "minLength": 1 },  
           "humiliated": { "type": "string", "minLength": 1 },  
           "offered_power": { "type": "string", "minLength": 1 },  
           "protecting_attachment": { "type": "string", "minLength": 1 }  
         }  
       },  
       "relational_charge": {  
         "type": "array",  
         "minItems": 1,  
         "items": {  
           "type": "object",  
           "additionalProperties": false,  
           "required": ["target_or_relation_type", "need", "resentment_or_fear", "likely_harm_or_betrayal"],  
           "properties": {  
             "target_or_relation_type": { "type": "string", "minLength": 1 },  
             "need": { "type": "string", "minLength": 1 },  
             "resentment_or_fear": { "type": "string", "minLength": 1 },  
             "likely_harm_or_betrayal": { "type": "string", "minLength": 1 }  
           }  
         }  
       },  
       "moral_psychological_edge": { "type": "string", "minLength": 1 },  
       "signature_scene_behaviors": {  
         "type": "array",  
         "minItems": 3,  
         "items": { "type": "string", "minLength": 1 }  
       },  
       "voice_under_pressure": {  
         "type": "object",  
         "additionalProperties": false,  
         "required": ["lying", "pleading", "threatening", "confessing"],  
         "properties": {  
           "lying": { "type": "string", "minLength": 1 },  
           "pleading": { "type": "string", "minLength": 1 },  
           "threatening": { "type": "string", "minLength": 1 },  
           "confessing": { "type": "string", "minLength": 1 }  
         }  
       },  
       "cannot_be_swapped_out_because": { "type": "string", "minLength": 1 }  
     }  
   },  
   "scores": { "type": "object" },  
   "canon_assumption_flags": {  
     "type": "object",  
     "required": ["status"],  
     "properties": {  
       "status": { "type": "string", "enum": ["canon-safe", "canon-edge", "canon-requiring"] },  
       "edge_assumptions": { "type": "array", "items": { "type": "string" } },  
       "implied_new_facts": {  
         "type": "array",  
         "items": {  
           "type": "object",  
           "required": ["statement", "reason_needed", "preferred_route"],  
           "properties": {  
             "statement": { "type": "string", "minLength": 1 },  
             "reason_needed": { "type": "string", "minLength": 1 },  
             "preferred_route": {  
               "type": "string",  
               "enum": ["canon-addition", "propose-new-canon-facts"]  
             }  
           }  
         }  
       }  
     }  
   },  
   "recommended_next_step": {  
     "type": "string",  
     "enum": ["generate_immediately", "reserved_future_seed", "generate_after_canon_adjudication"]  
   },  
   "critic_pass_trace": { "type": "object" },  
   "canon_safety_check": { "type": "object" },  
   "source_basis": { "type": "object" },  
   "notes": { "type": "string" }  
 },  
 "allOf": [  
   {  
     "if": {  
       "properties": {  
         "canon_assumption_flags": {  
           "properties": { "status": { "const": "canon-requiring" } }  
         }  
       }  
     },  
     "then": {  
       "properties": {  
         "canon_assumption_flags": {  
           "required": ["implied_new_facts"],  
           "properties": {  
             "implied_new_facts": { "minItems": 1 }  
           }  
         }  
       }  
     }  
   }  
 ]  
}

# **Risks and Open Questions**

## **Risk: over-intensifying every character**

If every background character becomes operatic, the world may feel melodramatic and crowded. Mitigation: protagonist-grade does not mean maximum volume. A quiet character can still have appetite, contradiction, self-mythology, pressure behavior, and relational charge. The rule is **engine density**, not theatrical loudness.

## **Risk: weirdness becomes cosmetic**

The system could start producing grotesque quirks without causal grounding. Mitigation: every strange trait must pass Rule 2 and be world-produced through body, institution, scarcity, taboo, law, ecology, history, or epistemic limits.

## **Risk: canon-burden inflation**

The best versions may often become canon-requiring. Mitigation: allow canon-requiring brilliance to surface, but score canon burden separately and route implied facts explicitly. Reject high-burden/low-payoff proposals.

## **Risk: validators overreach**

A validator cannot know whether a character is great. Mitigation: validators enforce exposure of the engine; LLM critics judge quality. Do not encode literary greatness as JSON schema.

## **Risk: LLM critic subjectivity**

Memorability judgments vary. Mitigation: use multiple named criteria and require concrete failure rationales: protagonist-grade force, world-rootedness, contradiction, appetite, pressure behavior, relational charge, voice, surprise, and non-genericness.

## **Risk: proposal/dossier drift**

A strong NCP may become a bland CHAR. Mitigation: add `input_memorability_contract` and an anti-flattening critic in `character-generation`.

## **Risk: story-system contamination**

Story consumers may tempt character fields toward story arcs or companion-quest structure. Mitigation: forbid story-system-specific fields. Keep all additions character-in-world fields.

## **Risk: schema churn**

Adding required `dramatic_core` and NCP schemas will break existing records. Mitigation: this is acceptable. Fail usefully and let the user manually edit.

## **Open question: batch id for upgraded NCPs**

Current NCP cards expect `batch_id`, and structured edges can link NCP to NCB. But a single-seed upgrade does not naturally need a batch manifest. Recommendation: make `batch_id` optional, add `origin.kind`, and only add a separate upgrade audit record later if chains become hard to inspect.

# **Final Recommendation**

Implement first:

1. **`protagonist-grade-character-engine.md` shared reference**  
2. **`deepen-character-proposal` skill**  
3. **NCP first-class schema validation**  
4. **NCP template `memorability_profile`**  
5. **`character-generation` anti-flattening preservation**

Do not start with story changes. Do not start by adding a few cosmetic fields. The real win is a multi-candidate mutation and rejection process that makes “valid but dull” a hard failure.

The design should let the system say: “This character is canon-safe and plausible, but they are not yet worth keeping.” That is the missing bar.



---

## Outcome

Archived on 2026-05-22 as an exploited source report. The report remains preserved as provenance, but it is no longer active intake material; current specs, tickets, triage records, and docs govern accepted, rejected, modified, and deferred outcomes.
