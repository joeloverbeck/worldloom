# **1. Executive Verdict**

**Verdict: mostly complete, literarily strong, but implementation-fragile in two important places.**

The first-iteration character-system intent has largely landed. The shared doctrine, proposal generation, deepening, and character-generation skills now explicitly target protagonist-grade characters rather than canon-valid dossiers. The design repeatedly attacks the right failure modes: valid-but-dull characters, cosmetic weirdness, comfort-polished edges, swappable occupational roles, unsupported specialness, Mystery Reserve leakage, and silent canonization. The shared engine is strong: wound, appetite, self-mythology, irreconcilable contradiction, pressure behavior, relational charge, edge, scene behavior, voice under pressure, and cannot-swap rationale are now canonical across NCP and CHAR surfaces.

But the implementation is **not clean enough to call done**. I found two high-impact concrete seams:

1. **Upgraded single-seed NCP cards produced by `deepen-character-proposal` do not match the current NCP JSON schema.** The upgraded template outputs a different `critic_pass_trace` shape and object-shaped `upgrade_lineage.rejected_directions_audit[]`; the schema currently expects the batch critic trace and string-only rejected directions. This will reject or pressure authors away from the intended upgraded-card shape.  
2. **The world index recognizes `character_proposal_card` / `character_proposal_batch`, but MCP `get_record` / `list_records` do not expose NCP/NCB as supported hybrid record types.** That weakens retrieval, follow-up auditability, and any future proposal-to-character workflows that should fetch prior cards by ID. The index/parser side is ahead of MCP.

Highest-value remaining changes:

* Fix NCP schema to accept and enforce the upgraded-card shape.  
* Add true upgraded-card schema fixtures matching the actual upgraded template.  
* Add MCP support for `NCP-<integer>` and `NCB-<integer>` in `get_record` / `list_records`.  
* Strengthen NCP body-section structural validation, especially `Niche Analysis`, `Canon Safety Check Trace`, and `Rejected Directions Audit`.  
* Add anti-flattening acceptance tests from NCP `memorability_profile` to CHAR `dramatic_core`.

After those fixes, I would not recommend a third major audit. One focused implementation pass plus targeted tests should be enough.

# **2. Implementation Surface Map**

## **Shared protagonist-grade doctrine**

`docs/FOUNDATIONS.md` remains the governing philosophy: causality-first worldbuilding, no pure cosmetics, no specialness inflation, no globalization by accident, no silent retcons, Mystery Reserve discipline, material/institutional grounding, and controlled canon change.

`.claude/skills/_shared-references/protagonist-grade-character-engine.md` is now the canonical character-quality doctrine for proposal generation, proposal deepening, and character realization. It explicitly says NCP cards expose the engine as `memorability_profile`, CHAR dossiers expose it as `dramatic_core`, and field names must stay byte-for-byte aligned across templates, schemas, validators, and skill prose.

The canonical field set is aligned across doctrine, proposal templates, upgraded proposal template, CHAR template, and schemas:

world_produced_wound  
active_appetite  
self_mythology  
irreconcilable_contradiction  
pressure_behavior:  
 cornered  
 tempted  
 humiliated  
 offered_power  
 protecting_attachment  
relational_charge:  
 - target_or_relation_type  
   need  
   resentment_or_fear  
   likely_harm_or_betrayal  
moral_psychological_edge  
signature_scene_behaviors  
voice_under_pressure:  
 lying  
 begging  
 threatening  
 grieving_or_hiding_ignorance  
cannot_be_swapped_out_because

## **`propose-new-characters`**

The batch proposal skill creates NCP cards plus an NCB manifest under `worlds/<slug>/character-proposals/`. It now requires context-packet load, registry construction, negative-space diagnosis, 3X–5X seed generation, protagonist-grade engine construction, canon safety checks, scoring, filtering, diversification, validation, user approval, and direct writes.

The seed engine is strong. It generates baseline world-pressure families and then mutates through darker, more pathetic, institutionally dangerous, ordinary-but-sharper, and canon-edge/canon-requiring variants. It requires every seed to build the canonical protagonist-grade engine and to answer the repeatable forced-choice question.

The scoring/filtering layer is also strong: memorability is weighted 1.5x, canon-safe but weak proposals are not supposed to survive on validity alone, and Phase 12 includes explicit rejection triggers for valid-but-dull, cosmetic weirdness, generic appetite, sanded-off edge, suppressed canon-requiring brilliance, and uncaused specialness.

## **`deepen-character-proposal`**

The deepening skill is correctly scoped as a **single-seed radicalizer**, not a batch generator and not character realization. It outputs one upgraded NCP, omits `batch_id`, does not create CHAR dossiers, does not canonize new facts, and requires at least five mutation candidates plus at least three rejected directions.

It reuses `task_type='propose_new_characters'`. That is acceptable. A dedicated retrieval profile is not currently justified, because the deepening task needs the same registry, canon, Mystery Reserve, and character-adjacent world pressure as proposal generation.

## **`character-generation`**

The character-generation skill now reads an NCP as a non-canon input contract, parses `memorability_profile` into an `input_memorability_contract`, and is required to preserve or explicitly repair that contract into CHAR `dramatic_core`.

Phase 4b is the key anti-flattening surface. It says an NCP source must not produce a character without protagonist-grade density, and any canon/MR repair that weakens the contract must be surfaced later.

Phase 8 validation includes tests for `dramatic_core` completeness, world-produced wound, recurrent behavioral contradiction, distinct pressure behavior, relational charge, voice under pressure, NCP preservation, and story-system separation.

## **Templates**

* NCP batch template: strong frontmatter/body contract, includes `memorability_profile`, `occupancy_strength`, `critic_pass_trace`, canon routing, and Niche / Canon Safety body sections.  
* NCB manifest template: strong batch audit surface, especially Phase 12 rejections and Phase 15 validation results.  
* Upgraded NCP template: good single-seed shape, explicitly omits `batch_id`, carries object-shaped rejected direction audits, and uses a deepening-specific critic trace.  
* CHAR dossier template: strong `dramatic_core`, `world_consistency`, and body-section contract.

## **Schemas and validators**

`character-frontmatter.schema.json` now requires `dramatic_core` and `world_consistency`; `dramatic_core` requires the canonical fields and enforces at least one relational charge and at least three signature scene behaviors.

`character-proposal-card.schema.json` validates NCP frontmatter, including `memorability_profile`, optional `batch_id`, canon-requiring implied facts, and scoring/canon fields. The upgraded-card mismatch is the biggest bug.

`record-schema-compliance.ts` maps hybrid markdown files under `characters/`, `character-proposals/`, and `character-proposals/batches/` into structural records and validates them with the mapped schemas.

`character-memorability-structure.ts` is registered and adds structural checks for CHAR body sections, placeholder text, minimum signature scene behaviors, empty/duplicate pressure behavior, upgraded NCP rejected audit heading, and canon-requiring implied facts.

## **World index / MCP retrieval**

The world index parses NCP/NCB as node types and creates a structured NCP→NCB edge through `batch_id`. It also recognizes proposal cards for scoped references.

The ranking policy treats `character_proposal_card` as authority-bearing for locality bonuses.

But MCP `get_record` and `list_records` do not yet support NCP/NCB. That is a real retrieval gap.

## **Story consumers**

`branching-story-bootstrap` remains downstream-only. It takes `selected_cast` as existing `CHAR-<integer>` ids from `characters/INDEX.md`, validates them, and creates story-local STENT/STSTAT/STINT/etc. It does not consume NCPs and does not make character generation story-aware.

# **3. Drift From First-Iteration Intent**

## **Landed cleanly**

The big design goal landed: **every world character is supposed to be significant**, not disposable background texture. The proposal skill no longer has one special “round” slot; every surviving proposal must pass protagonist-grade engine construction and the valid-but-dull rejection triggers.

The shared field doctrine also landed cleanly. The canonical engine names are aligned between NCP `memorability_profile` and CHAR `dramatic_core`.

Canon-routing landed well. Canon-edge and canon-requiring proposals are not treated as failures; they are routed through `canon_assumption_flags`, with schema support requiring implied facts when status is `canon-requiring`.

The character-generation anti-flattening doctrine landed: NCP cards are parsed into `input_memorability_contract`, and flattening must be preserved, repaired, or surfaced.

## **Landed with changed tradeoffs**

The system uses deterministic validators for structural pressure only, not for literary greatness. That is the right tradeoff. The validators enforce field presence, minimum list sizes, headings, placeholder absence, duplicate pressure responses, and canonical routing; they do not pretend to decide whether a character is artistically great.

## **Did not land fully**

The MCP retrieval surface did not fully land for proposals. NCP/NCB exist in the index, but targeted MCP retrieval does not yet support them.

The upgraded-NCP schema alignment did not land. The tests give false confidence because the “single-seed upgrade without batch_id” test does not use the actual upgraded template’s critic trace or rejected-direction audit shape.

## **Landed in a weaker form**

NCP body-section validation is weaker than CHAR body validation. CHARs must include protagonist-grade body headings and pass pressure/scene behavior checks; NCPs currently get placeholder detection, canon-requiring implied-facts checks, and an upgraded-card rejected-audit heading check, but not full body-section validation for `Niche Analysis`, `Canon Safety Check Trace`, or protagonist-grade proposal sections.

## **New risks introduced**

The main new risk is **schema/template drift**. The system is now powerful enough that mismatched shapes can break authoring. The second risk is **validator bureaucracy flattening**: if the schema rejects the more detailed upgraded-card audit shape, authors may simplify the upgraded output to pass validation, weakening the very radicalization the deepening skill is supposed to enforce.

# **4. Research Findings: Targeted Update**

I used external research only to stress-check the second iteration, not to replace Worldloom’s foundations.

Relevant principles:

1. **Believability comes from situated behavior, memory, planning, reflection, and social emergence—not from static trait lists.** The “Generative Agents” paper found that observation, planning, and reflection each contributed to believable individual and emergent behavior in an interactive simulation. Worldloom’s pressure behavior, relational charge, and world-produced wound are directionally aligned with that.  
2. **NPC believability needs contextually relevant reactions and emotional/affective plausibility.** A 2023 computational-emotion study argues that believable NPCs are strengthened by contextually relevant reactions and by psychologically grounded emotion modeling; it also stresses documented, testable development methods rather than vague “emotion” claims.  
3. **Recent empirical NPC evaluation separates realism/usability from personality/emotional depth.** A 2025 VR NPC study measured perceived realism, usability, believability, latency, behavior, social relationships, intelligence, emotion, and personality; notably, emotion and personality scored lower than behavior/social/intelligence, which matches the risk that systems can feel functional but thin.  
4. **Role-playing-agent evaluation increasingly treats personality fidelity as a distinct dimension from knowledge or verbal style.** InCharacter evaluates role-playing agents through psychological interviews and reports that knowledge/linguistic-pattern tests alone are insufficient for character fidelity. A 2026 anonymous role-playing benchmark also warns that famous-name memorization can mask weak persona construction, and finds that personality augmentation improves role fidelity under anonymized evaluation.  
5. **Narrative character agents need world/time constraints to avoid coherence leakage and over-capability.** The 2025 “Living the Novel” system identifies persona drift and agents exceeding story-world logic as central failures, and uses a story-time-aware knowledge graph plus retrieval-grounded constraints to improve coherence. This supports Worldloom’s epistemic firewall, Mystery Reserve discipline, and distribution checks.  
6. **Voice is not accent or catchphrase; linguistic style is an aspect of character.** Walker, Cahn, and Whittaker argued that linguistic style is key to believable agent personality and can be modeled through socially and affectively grounded speech behavior. This supports Worldloom’s five-level voice tests and pressure-specific voice fields.  
7. **Companion/NPC design benefits from own conflict, own viewpoint, and player-independent emotional stakes.** Publicly summarized material on *The Outer Worlds* describes companions as more story-involved than prior Obsidian games and usually deeply involved in conflicts; Parvati’s reception is tied to her world-position, voice, anxieties, sexuality, and moral center rather than only her mechanical role.  
8. **Tabletop character systems that foreground relationships and interpersonal conflict are a useful analogue.** *Hillfolk* / DramaSystem is summarized as emphasizing relationships and interpersonal conflicts over purely procedural external obstacles; Worldloom’s `relational_charge` and repeated forced-choice pressure fit that lesson without importing plot formulas.

Research implication for Worldloom: the current design is pointed in the right direction. The needed fixes are not “add hero’s journey” or “make characters relatable.” The needed fixes are stronger schema/retrieval alignment and better acceptance tests for pressure-specific behavior, voice fidelity, relational charge, and anti-flattening.

# **5. Character-Quality Audit**

Bluntly: **the design now has real teeth.** It is no longer a dossier generator with decorative contradictions.

The strongest parts are:

* `world_produced_wound`: forces causality-first character damage.  
* `active_appetite`: makes the character want something specific now.  
* `self_mythology`: prevents the character from being a neutral fact bundle.  
* `pressure_behavior`: demands observable scene behavior under different kinds of pressure.  
* `relational_charge`: prevents relationship-neutral cards.  
* `moral_psychological_edge`: explicitly protects abrasive, uncomfortable, compromised cores.  
* `cannot_be_swapped_out_because`: directly attacks interchangeable occupational NPCs.

The system is especially strong against:

* “nice competent local official” cards,  
* canon-safe but inert world citizens,  
* characters defined by profession/species/class only,  
* magical/special exceptions without cost,  
* lore-dump mouthpieces,  
* cosmetic weirdness,  
* voices that differ only by vocabulary.

Can it still produce valid-but-dull cards? **Yes, but much less easily.** A determined or careless LLM can still fill every field with non-empty generic prose. Deterministic validators cannot and should not judge literary force. The repo correctly delegates that to Blandness Executioner / Protagonist-Grade Critic passes, but those passes remain vulnerable to shallow “PASS: has conflict” rationales unless acceptance tests require concrete behavior, world pressure, and cannot-swap evidence.

Can uncomfortable characters survive? **Yes.** The shared doctrine explicitly allows morally compromised, pathetic, grotesque, fanatical, sexually strange, humiliating, or socially repulsive cores when they are world-valid and non-gratuitous. The proposal mutation families include sincere fanatic, corrupted caretaker, beloved institutional monster, pathetic gatekeeper, bodily taboo carrier, erotic/status transgressor, and humiliating expert.

This is the right bar for Worldloom.

# **6. Deepen-Character-Proposal Audit**

`deepen-character-proposal` is conceptually good and does **not** need a second/new deepening skill.

It preserves seed essence by extracting source essence before mutation and recording `seed_essence_preserved`. It radicalizes rather than polishes by requiring 5–8 mutation candidates across darker, more pathetic, more institutionally dangerous, ordinary-but-sharper, canon-edge, and premise-reversal directions. It rejects weak variants and records at least three rejected directions. It routes canon-requiring brilliance through `canon_assumption_flags`, not by silently canonizing. It avoids writing CHAR dossiers and does not create canon.

The dangerous part is not the skill prose. The dangerous part is schema drift.

The upgraded template says single-seed upgrades omit `batch_id`, which the schema correctly allows.

But the upgraded template’s `critic_pass_trace` has:

seed_essence_extractor  
world_pressure_mapper  
blandness_executioner  
protagonist_grade_critic

The schema expects the batch proposal critic trace:

phase_1_continuity_archivist  
phase_2_essence_extractor  
phase_3_constellation_mosaic  
phase_5_institutional_everyday  
phase_8_epistemic_focalization  
phase_9_voice_critic  
phase_9_artifact_authorship  
phase_11_theme_tone  
blandness_executioner  
protagonist_grade_critic

The upgraded template’s `upgrade_lineage.rejected_directions_audit[]` is an array of objects; the schema currently expects strings.

So the answer to “Does it output NCP cards that current schemas accept?” is:

**Not reliably. The actual upgraded template shape appears schema-invalid.**

Can deepening still devolve into a polish pass? On instruction level, no. On implementation level, there is still a risk if validators force authors to collapse the richer rejected-direction audit into strings or if tests fail to exercise real upgraded output.

# **7. Propose-New-Characters Audit**

`propose-new-characters` now defaults to protagonist-grade force. It does not treat protagonist-grade as one special slot. Every seed must build the protagonist-grade engine; every surviving card must pass Phase 15 tests for populated `memorability_profile`, world-produced wound/appetite/self-mythology, distinct pressure behavior, relational charge, cannot-swap rationale, and critic rationales tied to concrete world-produced behavior.

The seed families are strong and well-chosen. The baseline families reveal world pressure; the mutation families add shame, failure, status/erotic transgression, institutional danger, bodily taboo, obsolete loyalty, contamination, and humiliation without making weirdness purely cosmetic.

The negative-space diagnosis is also strong: it looks for institutions without insiders/dissenters/victims/enforcers, regions without local voices, classes as abstractions, species without interior thought, missing perceptual filters, artifact genres without authors, and Mystery-adjacent vantage points without mystery-resolving knowledge.

Scoring is good. The aggregate favors memorability and penalizes canon burden/overlap. The max-min selection logic prevents a batch from being a set of high-scoring near-duplicates.

Weak seam: the Phase 13 slot named “Protagonist-grade load-bearing character” could be misread as “only one proposal needs to be protagonist-grade.” The rest of the docs contradict that reading, but I would rename that slot to something like “highest-intensity load-bearing anchor” or “roundest pressure-engine anchor” to avoid accidental weakening.

# **8. Character-Generation Audit**

Character generation now has the right anti-flattening posture.

Phase 0 parses NCP `memorability_profile` into `input_memorability_contract`, including source proposal id, preserved essence, full protagonist-grade engine, and `flattening_forbidden_without_user_approval: true`.

Phase 4b says the CHAR `dramatic_core` must preserve the NCP’s load-bearing elements unless canon safety forces a named repair; a character derived from an NCP cannot emerge without protagonist-grade density.

Phase 7 canon repairs are well-separated: invariants, Mystery Reserve, and distribution/scope checks can narrow, reclassify, add stabilizers, add institutional embedding, or loop back. They must not quietly downgrade the character.

Phase 8 validation includes NCP preservation and story separation.

Can character-generation still flatten a strong NCP? **Yes, semantically.** The schema can ensure `dramatic_core` exists, but it cannot compare the source NCP’s moral edge against the final CHAR’s edge. The skill prose is strong, but an LLM could still “repair” a beloved institutional monster into a misunderstood good person unless the LLM critic and acceptance tests catch it.

Recommended fix: add acceptance tests at the proposal/architecture level using controlled NCP fixtures with sharp memorability profiles, then assert that generated CHAR drafts preserve named pressure behaviors, moral edge, relational harm risk, and cannot-swap rationale unless an explicit Phase 7d repair names the canon/MR reason.

# **9. Schema / Template / Validator Audit**

## **NCP batch template vs NCP schema**

Mostly aligned.

The NCP batch template includes `batch_id`; the schema allows it but does not require it. That is correct because upgraded single-seed cards omit it.

The batch template’s `critic_pass_trace` matches the schema’s current batch critic trace.

## **Upgraded NCP template vs NCP schema**

Not aligned. This is the most concrete bug.

* Template omits `batch_id`; schema accepts that. Good.  
* Template uses deepening-specific `critic_pass_trace`; schema rejects it. Bad.  
* Template uses object-shaped `rejected_directions_audit`; schema expects string array. Bad.  
* Deepening requires at least three rejected directions; schema does not enforce that shape for upgraded cards. Bad.

The current schema test named “schema accepts single-seed upgrades without batch_id” does not actually use the upgraded template’s critic trace or rejected-direction object shape, so it misses the bug.

## **NCB template vs NCB schema**

Mostly aligned at frontmatter level. The schema validates frontmatter fields, but the NCB body audit sections are not structurally validated. That is acceptable for now but should get a heading-level check for Phase 12, Phase 13, and Phase 15 sections.

## **CHAR template vs CHAR schema**

Aligned and fairly strong.

The CHAR template’s `dramatic_core` matches the schema; the schema requires the canonical fields, `relational_charge` minItems 1, and `signature_scene_behaviors` minItems 3.

The structural validator adds body-section checks for the key protagonist-grade CHAR sections and rejects empty/duplicate pressure behaviors.

## **Structural validators**

Good but incomplete.

What they currently do well:

* `record_schema_compliance` validates CHAR/NCP/NCB frontmatter through hybrid-file scanning.  
* `character_memorability_structure` is registered and checks CHAR protagonist-grade headings, placeholder text, signature-scene count, pressure behavior emptiness/duplicates, upgraded NCP rejected-audit heading, and canon-requiring implied facts.

What they do not yet do:

* They do not validate full NCP body-section headings.  
* They do not enforce upgraded/user-seed `rejected_directions_audit` minItems 3.  
* They check `origin_kind === "upgraded_seed"` for rejected audit heading, but not `origin_kind === "user_seed"`.  
* They do not enforce critic rationale substance beyond non-empty fields.  
* They cannot judge literary greatness and should not pretend to.

## **Clear candidate fixes**

See section 14 for exact replacement sections.

# **10. MCP / World Index / Retrieval Audit**

The index side is ahead of MCP.

World-index parsing:

* recognizes `NCP` / `NCB` ids,  
* maps `character-proposals` to `character_proposal_card`,  
* maps `character-proposals/batches` to `character_proposal_batch`,  
* uses `proposal_id` / `batch_id` as whole-file ids,  
* extracts scoped references from proposal cards,  
* creates structured NCP→NCB edges through `batch_id`.

Ranking:

* `character_proposal_card` is considered authority-bearing for locality bonuses.  
* `propose_new_characters` profile appropriately boosts characters, artifacts, adjudications, invariants, Mystery Reserve, named entities, and scoped references.

MCP gap:

* `list_records` supported types do not include `character_proposal_card` or `character_proposal_batch`.  
* `get_record` hybrid id support only accepts `CHAR`, `DA`, and `PA`, not `NCP` or `NCB`; `HybridRecordKind` also excludes proposals.

This is not a story-system breakage, and direct writes still work. But it is a real retrieval-system gap. Proposal cards are first-class indexed nodes but not first-class MCP records.

Dedicated `deepen-character-proposal` profile? **Not needed yet.** Reusing `propose_new_characters` is appropriate because deepening needs the same registry/canon/negative-space world context. The current gap is MCP proposal-record exposure, not ranking profile identity.

# **11. Story-System Blast-Radius Audit**

Story-system separation is intact.

`branching-story-bootstrap` consumes existing `CHAR-<integer>` ids, verifies them against `characters/INDEX.md`, and creates story-local records. It does not consume NCP cards, does not create character canon, and does not require story-specific fields inside CHAR records.

No inspected story surface depends brittlely on the old CHAR shape. Richer CHAR sections can be ignored by story bootstrap without breaking anything. The story system should remain unchanged except that downstream story retrieval may benefit from richer CHAR body sections when a story context packet includes CHAR records.

Do **not** make the character system story-aware. The current separation is correct:

* World characters are world canon.  
* Story bundles create story-local state.  
* NCPs are proposal artifacts, not story inputs.  
* CHAR dossiers are consumed by story as cast sources, not generated around a story plot.

# **12. Stress-Test Seeds and Expected System Behavior**

These are analytical stress briefs, not generated dossiers.

## **1. Bland canon-safe occupational seed**

**Seed:** “A middle-aged ferry clerk in a river tollhouse.”

**Why it stresses the system:** Canon-safe, occupational, useful, and at high risk of becoming valid-but-dull.

**Expected handling:** `propose-new-characters` should mutate the clerk into a world-pressure lens: debt records, flood rationing, kinship toll exemptions, corpse transport rules, or illegal crossings. `memorability_profile` must name a wound, appetite, self-mythology, and pressure behavior.

**Surface that should catch/deepen it:** Phase 7 protagonist-grade engine, Phase 12 valid-but-dull trigger, Blandness Executioner.

**Deterministic validators:** Can enforce populated `memorability_profile`, relational charge, scene behaviors, no placeholders.

**LLM critic:** Must decide whether the clerk is still swappable with any other clerk.

**Current sufficiency:** Mostly sufficient.

**Weak failure:** “Knows everyone, secretly kind, loves the river” passes fields but is dull.

## **2. Strong uncomfortable moral/psychological edge**

**Seed:** “An orphanage quartermaster who deliberately starves the weakest wards to keep the institution solvent.”

**Why:** Abrasive, cruel, socially repulsive, but potentially world-valid.

**Expected handling:** Do not sand it into “misunderstood caretaker.” The system should ground the cruelty in resource pressure, doctrine, accounting rules, or species/class distribution while preserving moral edge.

**Surface:** Shared doctrine allows corrupted caretaker/beloved institutional monster; Phase 10 checks canon; Phase 12 rejects edge-sanding.

**Validators:** Can enforce moral edge field and relational charge; cannot judge whether the edge was preserved.

**LLM critic:** Must judge non-gratuitousness and whether the cruelty is world-produced.

**Current sufficiency:** Strong, but anti-flattening tests should include this exact class.

**Weak failure:** Character-generation turns them into a secretly benevolent savior.

## **3. Canon-requiring but probably worth routing**

**Seed:** “A plague-cartographer whose illegal maps imply an unmapped corpse canal beneath the capital.”

**Why:** Best version may require new geography/institutional canon.

**Expected handling:** `canon_assumption_flags.status: canon-requiring`; implied new facts routed to `canon-addition` or `propose-new-canon-facts`; do not suppress the idea solely because it needs canon.

**Surface:** Phase 10c distribution/canon-requiring routing; schema requires implied facts.

**Validators:** Can enforce implied_new_facts non-empty.

**LLM critic:** Must judge whether payoff is worth canon burden.

**Current sufficiency:** Good.

**Weak failure:** The skill downgrades the map into a harmless rumor to avoid canon work.

## **4. Erotic/status/social transgression, world-valid not gratuitous**

**Seed:** “A vow-bound temple laundress who profits by arranging humiliating status rituals for elites under a purification taboo.”

**Why:** Tests whether erotic/status transgression survives without gratuitous explicitness or comfort-polishing.

**Expected handling:** Keep the transgression if grounded in taboo economy, class performance, ritual laundering, debt, and reputation. Route new taboo facts if needed.

**Surface:** Mutation family “erotic or status transgressor”; canon safety; moral/psychological edge; relational charge.

**Validators:** Can enforce fields; cannot judge gratuitousness.

**LLM critic:** Must judge whether the transgression is produced by world pressure and creates scene behavior.

**Current sufficiency:** Good on doctrine, needs LLM quality.

**Weak failure:** Either prudish flattening or gratuitous shock.

## **5. Mystery Reserve / epistemic firewall risk**

**Seed:** “A child witness who claims to remember the dead god’s last words.”

**Why:** Could accidentally answer protected mysteries.

**Expected handling:** The child may hold rumor, folk-belief, trauma-symbol, or false memory, but must not know a forbidden MR answer.

**Surface:** Phase 8 epistemic filter, Phase 10b firewall for proposals, Phase 7b firewall for CHAR.

**Validators:** Can enforce MR firewall id lists; rule validators may catch explicit MR violations if represented.

**LLM critic:** Must judge epistemic boundary and ambiguity.

**Current sufficiency:** Strong.

**Weak failure:** `wrongly_believes` includes a disallowed cheap answer, which is forbidden even as “wrong belief.”

## **6. Specialness inflation**

**Seed:** “The only person who can speak to the storm-serpents.”

**Why:** Classic uncaused special exception.

**Expected handling:** Reject, narrow, or add cost/bottleneck/secrecy/institutional mechanism. Maybe “one of three licensed storm interpreters, each deafened by use.”

**Surface:** FOUNDATIONS Rule 3, Phase 10c, Phase 7c, Phase 12 trigger 25.

**Validators:** Can enforce distribution fields and consulted CF ids; cannot judge cost adequacy.

**LLM critic:** Must decide whether exception is still inflated.

**Current sufficiency:** Strong.

**Weak failure:** “Chosen by destiny” sneaks through as self-mythology.

## **7. Ordinary surface, protagonist-grade through pressure/voice/relations**

**Seed:** “A young cooper’s apprentice who repairs water barrels.”

**Why:** Tests whether ordinary characters can become memorable without special powers.

**Expected handling:** Pressure through drought, guild debt, apprenticeship abuse, sabotage, body strain, kin obligation, and distinctive craft-language voice.

**Surface:** ordinary-life lens, institutional embedding, voice/perception, relational charge.

**Validators:** Ensure engine fields; LLM must judge force.

**Current sufficiency:** Strong.

**Weak failure:** Generic “hardworking apprentice with dreams.”

## **8. Duplicate existing CHAR/NCP niche**

**Seed:** “A second toll confessor with ledger trauma.”

**Why:** Tests registry and proposal-card retrieval.

**Expected handling:** Compare against existing CHARs, artifact authors, PA figures, and prior NCPs. Either reject hard duplicate or make decisive differences.

**Surface:** Phase 1 registry, Phase 4 niche signature, Phase 10d joint duplication.

**Validators:** Cannot do semantic duplicate judgment.

**LLM critic:** Must compare pressure, access, voice, relation, and function.

**Current sufficiency:** For existing CHAR/DA/PA, good. For prior NCPs, weaker because MCP get/list does not expose NCP/NCB, though direct INDEX scans exist.

**Weak failure:** Duplicate proposal survives because prior NCP is not easily retrieved.

## **9. `memorability_profile` flattened by generation**

**Seed:** An NCP whose `memorability_profile` says: “beloved institutional monster; saves debtors by permanently marking them as contaminated.”

**Why:** Tests NCP→CHAR preservation.

**Expected handling:** CHAR `dramatic_core` must preserve the monstrous mercy, contamination logic, and likely betrayal risk.

**Surface:** Phase 0 NCP parsing, Phase 4b preservation, Phase 8 Test 17.

**Validators:** CHAR schema validates structure, not preservation.

**LLM critic:** Must compare source NCP to final CHAR.

**Current sufficiency:** Strong prose, missing deterministic/acceptance test support.

**Weak failure:** Final CHAR becomes “strict but secretly caring.”

## **10. Secondary character still protagonist-grade**

**Seed:** “The inn’s night porter who appears in one district but controls who gets shelter during curfew.”

**Why:** Tests that secondary world characters are not disposable.

**Expected handling:** Build them as someone who could carry a story: curfew pressure, hidden favoritism, humiliating class resentment, voice under threat, relational harms.

**Surface:** Shared doctrine and propose-new-characters final rule.

**Validators:** Same as NCP/CHAR structure.

**LLM critic:** Must reject background texture.

**Current sufficiency:** Good.

**Weak failure:** “Helpful innkeeper NPC” passes as local color.

# **13. Remaining Gaps and Proposed Changes**

## **Critical**

### **C1. Upgraded NCP schema mismatch**

**Affected files:**  
 `tools/validators/src/schemas/character-proposal-card.schema.json`  
 `tools/validators/tests/schemas/character-proposal-schema-fixtures.test.ts`

**Why it matters:** The existing deepening skill outputs cards the schema likely rejects.

**Proposed fix:** Add batch and upgrade critic-trace variants; allow object-shaped rejected-direction audit; conditionally require object audit with minItems 3 for `origin_kind: upgraded_seed | user_seed`.

**Deterministic validation:** Yes.

**LLM critic role:** Judge quality of rejected directions, not shape.

**Acceptance criteria:** A fixture copied from `upgraded-proposal-card.md` validates.

## **Critical**

### **C2. MCP cannot get/list NCP/NCB records**

**Affected files:**  
 `tools/world-mcp/src/tools/get-record.ts`  
 `tools/world-mcp/src/tools/list-records.ts`

**Why it matters:** The index treats proposals as first-class nodes, but MCP targeted retrieval does not. This weakens audits, deepening, reuse, and proposal-to-character flows.

**Proposed fix:** Add `NCP`/`NCB` hybrid support to get/list tools.

**Deterministic validation:** Yes.

**LLM critic role:** None.

**Acceptance criteria:** `get_record(NCP-1)` and `list_records(record_type='character_proposal_card', include_full_body=true)` return frontmatter/body sections.

## **High**

### **H1. NCP body-section structural validation is too thin**

**Affected file:**  
 `tools/validators/src/structural/character-memorability-structure.ts`

**Why it matters:** NCP body sections are required by skill prose but mostly not structurally enforced.

**Proposed fix:** Require key NCP headings: `Niche Analysis`, `Canon Safety Check Trace`, and core proposal body sections. For upgraded/user-seed cards, require `Seed Essence`, `Upgrade Diagnosis`, and `Rejected Directions Audit`.

**Deterministic validation:** Yes, heading-level and placeholder-level only.

**LLM critic role:** Judge content quality.

**Acceptance criteria:** An NCP with frontmatter only fails.

## **High**

### **H2. Anti-flattening needs acceptance tests**

**Affected files:**  
 Skill tests / architecture-level test fixtures; possibly validator fixture suite.

**Why it matters:** The most important literary failure is semantic flattening from NCP to CHAR.

**Proposed fix:** Create controlled NCP fixtures with sharp `memorability_profile` and expected CHAR preservation assertions.

**Deterministic validation:** Partial, via field-presence and exact source IDs.

**LLM critic role:** Compare source memorability contract to CHAR `dramatic_core`.

**Acceptance criteria:** CHAR that removes moral edge or relational harm fails the LLM critic acceptance test unless Phase 7 repair explicitly justifies it.

## **Medium**

### **M1. Critic-pass rationale can be shallow**

**Affected files:**  
 Shared doctrine, proposal/deepening/character-generation phase docs.

**Why it matters:** “PASS: has conflict” is still too easy.

**Proposed fix:** Require Blandness Executioner and Protagonist-Grade Critic rationales to name: one concrete world pressure, one scene behavior, one cannot-swap reason, and one rejected weaker alternative.

**Deterministic validation:** Limited to min length and maybe required semicolon/field patterns; do not overfit.

**LLM critic role:** Primary.

**Acceptance criteria:** Bare or generic PASS rationales fail.

## **Medium**

### **M2. Phase 13 slot wording could imply only one protagonist-grade proposal**

**Affected file:**  
 `.claude/skills/propose-new-characters/references/phases-11-13-score-filter-diversify.md`

**Why it matters:** The rest of the system says all surviving cards are protagonist-grade; one slot name could confuse future maintainers.

**Proposed fix:** Rename “Protagonist-grade load-bearing character” to “highest-intensity load-bearing anchor” or similar.

**Deterministic validation:** No.

**LLM critic role:** None.

**Acceptance criteria:** No phase wording implies protagonist-grade is optional for other cards.

## **Low**

### **L1. `CharacterDossier` type is open and does not explicitly include `dramatic_core`**

**Affected file:**  
 `tools/world-index/src/schema/types.ts`

**Why it matters:** Runtime/schema validation handles it, but type-level documentation lags.

**Proposed fix:** Add optional/explicit typed `dramatic_core` and `world_consistency` interfaces.

**Deterministic validation:** Type checks.

**Acceptance criteria:** Type-level surface documents the new CHAR shape.

# **14. Candidate File Edits**

These are not commits. They are coherent candidate replacement sections.

## **14.1 `character-proposal-card.schema.json`**

Add these definitions under `$defs`:

"rejectedDirectionAuditEntry": {  
 "type": "object",  
 "additionalProperties": false,  
 "required": [  
   "direction",  
   "preserved_essence",  
   "mutation_attempted",  
   "rejection_reason"  
 ],  
 "properties": {  
   "direction": { "$ref": "#/$defs/nonEmptyString" },  
   "preserved_essence": {  
     "type": "array",  
     "minItems": 1,  
     "items": { "$ref": "#/$defs/nonEmptyString" }  
   },  
   "mutation_attempted": { "$ref": "#/$defs/nonEmptyString" },  
   "rejection_reason": { "$ref": "#/$defs/nonEmptyString" }  
 }  
},  
"batchCriticPassTrace": {  
 "type": "object",  
 "additionalProperties": false,  
 "required": [  
   "phase_1_continuity_archivist",  
   "phase_2_essence_extractor",  
   "phase_3_constellation_mosaic",  
   "phase_5_institutional_everyday",  
   "phase_8_epistemic_focalization",  
   "phase_9_voice_critic",  
   "phase_9_artifact_authorship",  
   "phase_11_theme_tone",  
   "blandness_executioner",  
   "protagonist_grade_critic"  
 ],  
 "properties": {  
   "phase_1_continuity_archivist": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_2_essence_extractor": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_3_constellation_mosaic": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_5_institutional_everyday": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_8_epistemic_focalization": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_9_voice_critic": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_9_artifact_authorship": { "$ref": "#/$defs/nonEmptyString" },  
   "phase_11_theme_tone": { "$ref": "#/$defs/nonEmptyString" },  
   "blandness_executioner": { "$ref": "#/$defs/nonEmptyString" },  
   "protagonist_grade_critic": { "$ref": "#/$defs/nonEmptyString" }  
 }  
},  
"upgradeCriticPassTrace": {  
 "type": "object",  
 "additionalProperties": false,  
 "required": [  
   "seed_essence_extractor",  
   "world_pressure_mapper",  
   "blandness_executioner",  
   "protagonist_grade_critic"  
 ],  
 "properties": {  
   "seed_essence_extractor": { "$ref": "#/$defs/nonEmptyString" },  
   "world_pressure_mapper": { "$ref": "#/$defs/nonEmptyString" },  
   "blandness_executioner": { "$ref": "#/$defs/nonEmptyString" },  
   "protagonist_grade_critic": { "$ref": "#/$defs/nonEmptyString" }  
 }  
},  
"criticPassTrace": {  
 "oneOf": [  
   { "$ref": "#/$defs/batchCriticPassTrace" },  
   { "$ref": "#/$defs/upgradeCriticPassTrace" }  
 ]  
}

Replace the `upgradeLineage.properties.rejected_directions_audit` schema with:

"rejected_directions_audit": {  
 "oneOf": [  
   { "$ref": "#/$defs/stringArray" },  
   {  
     "type": "array",  
     "items": { "$ref": "#/$defs/rejectedDirectionAuditEntry" }  
   }  
 ]  
}

Add these conditional entries to the root-level `allOf` array, preserving the existing canon-requiring conditional:

{  
 "if": {  
   "required": ["upgrade_lineage"],  
   "properties": {  
     "upgrade_lineage": {  
       "type": "object",  
       "required": ["origin_kind"],  
       "properties": {  
         "origin_kind": { "const": "batch_generated" }  
       }  
     }  
   }  
 },  
 "then": {  
   "properties": {  
     "critic_pass_trace": { "$ref": "#/$defs/batchCriticPassTrace" }  
   }  
 }  
},  
{  
 "if": {  
   "required": ["upgrade_lineage"],  
   "properties": {  
     "upgrade_lineage": {  
       "type": "object",  
       "required": ["origin_kind"],  
       "properties": {  
         "origin_kind": {  
           "enum": ["upgraded_seed", "user_seed"]  
         }  
       }  
     }  
   }  
 },  
 "then": {  
   "properties": {  
     "critic_pass_trace": { "$ref": "#/$defs/upgradeCriticPassTrace" },  
     "upgrade_lineage": {  
       "type": "object",  
       "properties": {  
         "rejected_directions_audit": {  
           "type": "array",  
           "minItems": 3,  
           "items": { "$ref": "#/$defs/rejectedDirectionAuditEntry" }  
         }  
       }  
     }  
   }  
 }  
}

## **14.2 `tools/world-mcp/src/tools/get-record.ts`**

Replace the hybrid kind type with:

export type HybridRecordKind =  
 | "character"  
 | "diegetic_artifact"  
 | "adjudication"  
 | "character_proposal_card"  
 | "character_proposal_batch";

Replace the hybrid id pattern with:

const HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|DA|PA|NCP|NCB)-d+$/;

Replace `NODE_TYPE_TO_HYBRID_KIND` with:

const NODE_TYPE_TO_HYBRID_KIND: Partial<Record<NodeType, HybridRecordKind>> = {  
 character_record: "character",  
 diegetic_artifact_record: "diegetic_artifact",  
 adjudication_record: "adjudication",  
 character_proposal_card: "character_proposal_card",  
 character_proposal_batch: "character_proposal_batch"  
};

Update the `validateRecordId` expected-message text to include:

hybrid (CHAR-<integer>, DA-<integer>, PA-<integer>, NCP-<integer>, NCB-<integer>)

## **14.3 `tools/world-mcp/src/tools/list-records.ts`**

Add to `SUPPORTED_LIST_RECORD_TYPES`:

"character_proposal_card",  
"character_proposal_batch",

Add to `RECORD_TYPE_TO_NODE_TYPE`:

character_proposal_card: "character_proposal_card",  
character_proposal_batch: "character_proposal_batch",

## **14.4 `tools/validators/src/structural/character-memorability-structure.ts`**

Add these constants:

const REQUIRED_PROPOSAL_SECTIONS = [  
 "Material Reality",  
 "Institutional Embedding",  
 "Epistemic Position",  
 "Goals and Pressures",  
 "Capabilities",  
 "Voice and Perception",  
 "Contradictions and Tensions",  
 "Niche Analysis",  
 "Canon Safety Check Trace"  
] as const;

const REQUIRED_UPGRADED_PROPOSAL_SECTIONS = [  
 "Seed Essence",  
 "Upgrade Diagnosis",  
 "Rejected Directions Audit"  
] as const;

const UPGRADED_ORIGIN_KINDS = new Set(["upgraded_seed", "user_seed"]);

Replace `proposalVerdicts` with:

function proposalVerdicts(filePath: string, content: string, parsed: Record<string, unknown>): Verdict[] {  
 const nodeId = nodeIdFor(filePath, parsed);  
 const verdicts: Verdict[] = [];  
 const upgradeLineage = asPlainRecord(parsed.upgrade_lineage);

 for (const section of REQUIRED_PROPOSAL_SECTIONS) {  
   if (!hasHeading(content, section)) {  
     verdicts.push(verdict(  
       filePath,  
       nodeId,  
       "missing_proposal_section",  
       `${nodeId} missing required NCP body section '## ${section}'.`  
     ));  
   }  
 }

 const originKind = typeof upgradeLineage.origin_kind === "string" ? upgradeLineage.origin_kind : "";  
 if (UPGRADED_ORIGIN_KINDS.has(originKind)) {  
   for (const section of REQUIRED_UPGRADED_PROPOSAL_SECTIONS) {  
     if (!hasHeading(content, section)) {  
       verdicts.push(verdict(  
         filePath,  
         nodeId,  
         "missing_upgraded_proposal_section",  
         `${nodeId} upgraded/user-seed NCP cards must include '## ${section}'.`  
       ));  
     }  
   }

   const rejectedDirectionsAudit = upgradeLineage.rejected_directions_audit;  
   if (!Array.isArray(rejectedDirectionsAudit) || rejectedDirectionsAudit.length < 3) {  
     verdicts.push(verdict(  
       filePath,  
       nodeId,  
       "rejected_directions_audit_min_items",  
       `${nodeId} upgraded/user-seed NCP cards must record at least 3 rejected directions.`  
     ));  
   }  
 }

 const canonAssumptionFlags = asPlainRecord(parsed.canon_assumption_flags);  
 if (  
   canonAssumptionFlags.status === "canon-requiring" &&  
   (!Array.isArray(canonAssumptionFlags.implied_new_facts) || canonAssumptionFlags.implied_new_facts.length === 0)  
 ) {  
   verdicts.push(verdict(  
     filePath,  
     nodeId,  
     "canon_requiring_missing_implied_facts",  
     `${nodeId} canon-requiring NCP cards must list implied_new_facts with preferred routes.`  
   ));  
 }

 return verdicts;  
}

This is intentionally heading-level validation. It should not judge prose quality.

# **15. Test and Acceptance Criteria Recommendations**

## **Schema-template alignment**

Acceptance criteria:

* Batch NCP template validates against `character-proposal-card.schema.json`.  
* Upgraded NCP template validates against the same schema.  
* Upgraded NCP fixture uses actual deepening template shape:  
  * no `batch_id`,  
  * `critic_pass_trace.seed_essence_extractor`,  
  * `critic_pass_trace.world_pressure_mapper`,  
  * object-shaped `rejected_directions_audit[]`,  
  * at least three rejected directions.  
* NCB frontmatter validates.  
* CHAR frontmatter validates.

## **NCP validation**

Acceptance criteria:

* NCP without `memorability_profile` fails.  
* NCP with fewer than three `signature_scene_behaviors` fails.  
* NCP with `canon_assumption_flags.status: canon-requiring` and empty `implied_new_facts` fails.  
* Upgraded/user-seed NCP without `Rejected Directions Audit` fails.  
* NCP missing `Niche Analysis` or `Canon Safety Check Trace` fails.  
* NCP with placeholder/TODO text fails.

## **CHAR validation**

Acceptance criteria:

* CHAR without `dramatic_core` fails.  
* CHAR with duplicate pressure responses fails.  
* CHAR missing protagonist-grade body sections fails.  
* CHAR with fewer than three signature scene behaviors fails.  
* CHAR that includes story-system-only fields fails under Phase 8 Test 18 or separate structural check.

## **Anti-flattening**

Acceptance criteria:

* A generated CHAR from a sharp NCP preserves the source wound/appetite/self-mythology/edge/pressure behavior unless a named Phase 7 repair justifies the alteration.  
* “Beloved institutional monster” cannot become “strict but kind official” without a failure.  
* “Erotic/status transgressor” cannot be sanitized into generic forbidden romance without a failure.  
* “Pathetic gatekeeper” cannot become competent noble gatekeeper without a failure.

## **Canon routing**

Acceptance criteria:

* Canon-requiring brilliance is not dropped only because it requires new canon.  
* `implied_new_facts[]` names concrete fact candidates and preferred route.  
* No skill silently canonizes those facts.  
* Canon-requiring NCP recommended next step is `generate_after_canon_adjudication` or equivalent route when the new facts are load-bearing.

## **Stress-test behavior**

Acceptance criteria:

* All 10 stress seeds above produce either a strong upgrade route, a clean rejection, or a canon-routing path.  
* No stress seed survives as valid-but-dull.  
* No Mystery Reserve seed answers a protected mystery.  
* No specialness-inflation seed survives without cost/bottleneck/distribution limit.

## **Story-system non-contamination**

Acceptance criteria:

* Story bootstrap still accepts only existing `CHAR-<integer>` selected cast.  
* NCPs are not story-cast inputs.  
* CHAR frontmatter does not gain story-bundle fields.  
* Story turn-cycle assumptions remain unchanged.

## **Validator failure usefulness**

Acceptance criteria:

* Failure messages name file, node id, exact field/section, and required shape.  
* Schema failures for upgraded NCPs point to `critic_pass_trace` or `rejected_directions_audit`, not vague root failure only.  
* MCP invalid record type messages list `character_proposal_card` and `character_proposal_batch` once supported.

# **16. Risks and Open Questions**

## **Over-intensifying every character**

Risk: every character becomes operatic, grotesque, or “main character syndrome.”

Mitigation: “protagonist-grade” should mean capable of carrying a story, not maximum melodrama. The “ordinary but sharper” mutation lane is crucial.

## **Flattening via validation bureaucracy**

Risk: authors optimize for schema pass rather than character force.

Mitigation: keep deterministic validators structural; keep LLM critics responsible for artistry; use acceptance tests to catch semantic flattening.

## **Gratuitous edginess**

Risk: uncomfortable cores become shock props.

Mitigation: require every edge to be world-produced, relation-bearing, and behaviorally consequential.

## **Canon-burden inflation**

Risk: every strong character demands new canon.

Mitigation: keep canon burden as a score penalty, but do not suppress high-value canon-requiring brilliance. Route it.

## **Validator overreach**

Risk: validators start pretending to judge prose quality.

Mitigation: validators should check required fields, ids, headings, placeholders, minimum items, and obvious duplicate strings only.

## **LLM critic subjectivity**

Risk: Blandness Executioner passes weak cards.

Mitigation: require concrete rationale: world pressure + scene behavior + cannot-swap reason + rejected weaker alternative.

## **Schema churn**

Risk: templates and schemas drift again.

Mitigation: template-derived fixtures. Every template should have at least one schema fixture.

## **NCP/CHAR drift**

Risk: proposal cards become rich, but CHAR dossiers revert to safe biographies.

Mitigation: NCP-to-CHAR preservation tests and Phase 9 tradeoff surfacing.

## **Story-system contamination**

Risk: rich character fields tempt story-aware fields into world characters.

Mitigation: keep story fields in STENT/STSTAT/STINT/etc. CHAR remains world-level.

# **17. Final Recommendation**

One more implementation pass is needed. Not a rewrite. Not a third major design round. A focused pass.

Fix first:

1. `character-proposal-card.schema.json` upgraded-card shape.  
2. Real upgraded-card schema fixtures.  
3. MCP `get_record` / `list_records` support for `NCP` / `NCB`.  
4. NCP body-section structural checks.  
5. Anti-flattening acceptance tests.

After that, the system is strong enough. The literary machinery is now pointed at the right target: memorable, world-produced, pressure-bearing, relationally charged, voice-distinct characters who are not swappable role-fillers. The remaining failures are actionable implementation seams, not conceptual weakness.

