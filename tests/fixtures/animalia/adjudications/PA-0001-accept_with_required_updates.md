---
pa_id: PA-0001
date: 2026-04-18
verdict: ACCEPT_WITH_REQUIRED_UPDATES
originating_skill: canon-addition
change_id: CH-0002
cf_records_touched: [CF-0021, CF-0022, CF-0023, CF-0003, CF-0004, CF-0008, CF-0019]
mystery_reserve_touched: [M-6]
invariants_touched: [ONT-1, ONT-2, ONT-3, CAU-1, CAU-2, CAU-3, DIS-1, DIS-2, DIS-3, SOC-1, SOC-2, SOC-3, SOC-4, AES-1, AES-2, AES-3]
open_questions_touched: [OQ-0006, OQ-0010, OQ-0011, OQ-0013, OQ-0017, OQ-0018, OQ-0019]
---

# PA-0001 — Adjudication Record

---

# Proposal

> While the vast majority of magical artifacts, specially the most powerful ones and/or with the strangest effects, were created in a mysterious past era, and recovered from digs or ruins, the research done on recovered and contained artifacts has led to the creation of modern magical artifacts. Some of this knowledge, encoded in treatises and grimoires, has escaped or been sold. Independent crafters interested in occult matters have managed to acquire grimoires or parts of them in black markets, and have either attempted to create magical artifacts or succeeded at it. However, the process of creating magical artifacts, which always involves a vessel of varying materials (ceramics, metal, wood), is very risky and poorly understood. The attempts at putting in practice obscure knowledge gained from treatises or grimoires has sometimes led to kiln explosions that killed assistants or the crafter themselves. Some of the attempts led to artifacts being possessed with unknown entities seemingly imbued with agency, but whether that agency is due to some sort of magical instructions, beastly intelligence, or even sentient intelligence, is very poorly understood. Different communities handle the attempts at creating magical artifacts, or even the possession of knowledge to create one, differently: some communities accept it, others tolerate it, others force to pay fines, or even jail the person. There's huge variety in the possible effects of newly-created artifacts (as well as discovered ones), and researchers debate on whether the effects are random upon creation or if they're dependent on the artifact-creation process.

---

# Phase 0–11 Analysis

## Phase 0 — Normalize the Proposal

The brief's surface statement is "modern crafters create magical artifacts." The **underlying world-change** is much larger:
- Breaks CF-0004's "all artifacts originate in the Maker Age."
- Introduces a *learnable craft* of artifact-making (stressing CF-0003 / ONT-2).
- Introduces "possessed artifacts with apparent agency" (which collides with ONT-1 unless carefully scoped).
- Extends the existing black-market grimoire economy (CF-0019) into an active production economy.
- Creates a new hazard class (kiln explosions in residential workshops).
- Creates regional legal divergence on a question previously settled (artifact possession is illegal almost everywhere).

**Fact types**: craft + technology + magic practice + law + hazard + historical process + (potentially) belief/contested-canon for the entity-agency question.

**User-stated constraints**: very risky, poorly understood, vessel-mediated (ceramic / metal / wood), variable polity response (accept / tolerate / fine / jail), random-or-process-dependent effects (debated in-world), "possessed entities" of uncertain nature (instructions / beastly / sentient — debated).

## Phase 1 — Scope Detection

**Stated scope**: indeterminate community-by-community variability; independent crafters exist.

**Logical scope**:
- Geographic: GLOBAL (grimoires move on existing trade and black-market network; once knowledge is loose, it cannot be regionally contained).
- Temporal: CURRENT.
- Social: MIXED — both restricted (guild-internal research origin) and independent (black-market crafters).
- Visibility: VARIABLE — accepted in some polities, criminalized in others.
- Reproducibility: POSSIBLE BUT UNRELIABLE — high failure rate; effects "random or process-dependent" (debated).
- Diffusion risk: HIGH — knowledge has already spread (escape/sale of grimoires); ongoing diffusion process.

**Scope drift risk**: HIGH unless reproducibility, lethality, materials, and knowledge are all kept narrow. Proposal already provides narrowing language ("very risky and poorly understood").

## Phase 2 — Invariant Check

| Invariant | Verdict |
|---|---|
| ONT-1 (sentience requires biological embodiment) | **Compatible only if the "entities" in possessed artifacts are world-level NOT sentient; their nature can be in-world contested (parallel to M-5)** |
| ONT-2 (magic = artifact, not learnable art) | Compatible-with-clarification: people still cannot cast; what is learned is the craft of producing vessels that ARE the magic |
| ONT-3 (no interbreeding) | Untouched |
| CAU-1 (effects always cost) | Strengthened (kiln-explosion, possession, contamination during creation are pure cost) |
| CAU-2 (corruption produces signals) | Untouched/extended |
| CAU-3 (wards public-but-restricted) | Untouched |
| DIS-1 (artifacts routinely turned up underground) | Compatible — Maker-Age remains dominant supply |
| DIS-2 (literacy / fragment access partial) | Strengthened (grimoire economy extends fragment economy) |
| DIS-3 (mythical-species rare) | Untouched |
| SOC-1 / SOC-2 / SOC-3 | Untouched |
| SOC-4 (extraction guild-licensed) | Stressed: legal frame must extend to creation, with leakage parallel to existing extraction leakage |
| AES-1 / AES-2 / AES-3 | Compatible — proposal *enriches* the magical-and-contaminated-allied frame |

**Existing CF impact**:
- **CF-0003**: needs clarifying note that "artifact" includes both Maker-Age and modern-crafted vessels.
- **CF-0004**: requires QUALIFICATION (per Continuity Archivist synthesis — change is distributional, not ontological; CF-0019 already permits the upstream).
- **CF-0008**: extended scope to creation.
- **CF-0019**: extended visible consequences.

**Mystery Reserve impact**:
- **M-1** (what ended Makers): ENRICHED but not foreclosed; modern parallel is interpretively suggestive only.
- **M-2** (catastrophic-class origin): PRESERVED via explicit no-catastrophic-class scope ceiling on CF-0021.
- **M-3** (mythical spontaneous births): UNTOUCHED.
- **M-4** (progenitor figures): low direct pressure; moderate indirect pressure via sectarian movements.
- **M-5** (sentience as artifact effect): AT RISK from "possessed with agency" wording. Resolved via CF-0022 firewall clause: world-level NOT sentient + in-world contested + no cross-application to animal-folk sentience.

## Phase 3 — Capability/Constraint

**What can now be done**: small population of brave/desperate/sectarian crafters can attempt to make new artifacts.
**What can no longer be assumed**: artifacts are inherently old; guild monopoly on artifact knowledge; provenance authentication is trivial.
**What becomes harder**: civic regulation, containment economics, guild monopoly defense.

## Phase 4 — Prerequisites and Bottlenecks

| Bottleneck | Class |
|---|---|
| Grimoire/treatise fragments specific to creation | RARE |
| Specific vessels (ordinary ceramic / metal / wood) | UNCOMMON |
| Skill in interpreting fragmentary instructions | RARE — empirical, often-lethal failed attempts |
| Capital for repeated failures | UNCOMMON |
| Privacy from civic and guild authorities | regionally variable |
| Willingness to risk death | UNCOMMON |
| Time (months to years per attempt) | UNCOMMON |
| Authentic complete recipe | EXTINCT |
| Vessel-preparation knowledge (guild-internal, not in leaked grimoires) | MONOPOLIZED |

These bottlenecks are concrete, not hand-waves; collectively they stabilize the diffusion problem.

## Phase 5 — Diffusion

**Adopters**: independent occult scholars, sectarian fringe (Maker-mystics, certain progenitor-cult radicals), greedy/desperate craftsfolk, rogue researchers leaking from guilds.
**Suppressors**: most polities, established guilds, common-pantheon clergy, communities scarred by kiln explosions.
**Profiteers**: grimoire smugglers, the few successful crafters, authentication specialists, polities that tax.
**Victims**: dead crafters, neighbors of kiln explosions, hosts of newly-created possessed objects.
**Diffusion conclusion**: real but bounded — small persistent population, not common practice. Bottleneck robust.

## Phase 6 — Consequence Propagation (8 of 13 domains touched)

- **Everyday Life**: kiln-explosion incidents, suspicious workshops, "watch your neighbor" anxiety.
- **Economy**: grimoire price spikes, authentication niche, parallel shadow market, insurance/risk practices, broker revenue impact.
- **Law**: regional legal divergence (accept/tolerate/fine/jail), case-law evolution, inter-polity friction.
- **Religion**: Maker-mystic celebration, common-pantheon condemnation, sectarian splits, "ensouled vs possessed" theological debate.
- **Warfare**: taboo-against-artifact-warfare under new strain; foreign agents acquire crafted items.
- **Status signaling**: collector prestige; "patron of the work" honorific.
- **Architecture**: workshop registration in some polities; ward-rings around suspect workshops.
- **Memory/Myth**: new folk tales, sectarian doctrines, subtle world-myth shift.

## Escalation Gate — TRIGGERED

All three triggers fire: invariant revision required (CF-0004), >3 of 13 domains touched (8 touched), new invariant-level rules introduced (entities-in-possessed-artifacts; modern-creation-bounded). Six parallel critic sub-agents dispatched. See "Critic Reports" section below for verbatim returns.

## Phase 6b — Multi-Critic Synthesis

Six critics converged on actionable corrections to my Phase 0–6 analysis:

**Critical reframings** (Continuity Archivist): The retcon I proposed for CF-0004 is wrongly framed. CF-0019 already permits the upstream (fragment purchase). The change should be a **qualification** to CF-0004 (not `ontology_retcon`) plus a **new CF** for modern creation.

**Hard scope commitments forced**:
- Modern craft must EXPLICITLY produce **only ordinary-class artifacts, never catastrophic-class** (preserves M-2).
- Modern artifacts must be **distinguishable** from Maker-Age artifacts (visible craft signature).
- An **M-5 firewall clause** is required.
- Vessels use **ordinary** ceramic/metal/wood — NOT containment-grade clay.

**New required commitments**:
- CF-0023: partial Maker-Age fragment translations exist.
- M-6: new Mystery Reserve entry — "The Nature of Vessel-Hosted Agencies."
- TIMELINE Layer 3 reattribution: some Incident Wave events were always failed crafter attempts misattributed to Maker leakage.

**Per-cluster everyday-life signatures**: all 5 clusters need explicit touch points or AES-2 fails.

**Battlefield-artifact taboo** (Politics): without explicit constraint, mercenary-commissioned crafted artifacts collapse the existing taboo.

## Phase 7 — Counterfactual Pressure Test

**Stabilizers** (concrete, named mechanisms): lethality (kiln explosions), knowledge fragmentariness (no complete recipe), vessel-preparation-knowledge gap (guild-internal, not in leaked grimoires), capital cost, time cost, guild + civic suppression, folk taboo, unpredictable outputs, no-catastrophic-class ceiling (M-2 boundary), ordinary-substitute preference (CF-0003 logic).

These collectively explain why a proposal that *sounds* world-changing is in fact bounded to a thin persistent stream: a few crafters per polity per generation, most of them dying without success.

## Phase 8 — Contradiction Classification

- **Hard contradictions**: CF-0004 statement "No one alive makes new artifacts" requires qualification.
- **Soft conflicts** (need explanation/annotation): CF-0003, CF-0008, CF-0019, ONT-2, WORLD_KERNEL Primary Difference item 2.
- **Latent burdens**: detection asymmetry; possession-entity adjudication mechanism; crafter battlefield deployment; guild internal-schism naming.
- **Scope drift risks**: bound by explicit no-catastrophic-class commitment, ordinary-vessel-material commitment, lethality stabilizer.
- **Tone/thematic mismatches**: none if framing is careful (per Theme/Tone critic). Risk of crafter-protagonist drift in future canon (warning noted in CF).

## Phase 9 — Repair Pass

Repairs applied:
- Reduce scope: explicit no-catastrophic-class.
- Reduce reproducibility: most attempts fail (often fatally).
- Add cost: lethality, capital, time.
- Add bottleneck: vessel preparation knowledge gap (guild-internal).
- Localize temporally: attribute to last ~50 years (Layer 3 incident wave).
- Make taboo: regional legal divergence acknowledged.
- Split into narrower facts: ONE proposal becomes THREE CFs (creation craft / non-sentient entities / partial translations exist).
- Move questions into Mystery Reserve: M-6 (Nature of Vessel-Hosted Agencies).

These repairs preserve the user's dramatic intent (modern creation IS possible; some succeed; black market exists; communities respond differently; possessed artifacts with apparent agency exist) while preventing universalization, mystery-trivialization, and ONT-1/M-5 collapse.

## Phase 10 — Narrative and Thematic Fit

- **Deepens identity?** YES. Strengthens AES-3, enriches the Maker-Age frame.
- **Creates tensions?** YES. New legal divergence; new guild jurisdictional disputes; new sectarian movements; new everyday-life suspicion.
- **Trivializes struggle?** NO if scope-bound. The proposal is about LETHAL FAILURE more than easy success.
- **Universalizes specialness?** Risk avoided by stabilizers + no-catastrophic-class + ordinary-substitutes preference.
- **Undermines mystery?** ENRICHES M-1, PRESERVES M-2 (with explicit clauses), PROTECTS M-5 (with firewall clause), CREATES new bounded M-6.
- **Enriches ordinary life?** YES (with Everyday-Life critic's recommended cluster updates).
- **Creates story engines?** YES — many. Compatible with existing Natural Story Engines.

**Narrative fit verdict**: STRONG.

## Phase 11 — Adjudication

**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES

**Justification** (phase-cited):
- Phase 2: invariants compatible with annotations; CF-0004 requires qualification, not wholesale revision (per Continuity Archivist).
- Phase 4: stabilizers concrete and robust.
- Phase 6: 8 of 13 domains touched with manageable consequences if updates applied.
- Phase 7: counterfactual pressure satisfied — explicit named mechanisms, no hand-waves.
- Phase 8: classification yields one qualification + soft conflicts + latent burdens + scope risks all bounded.
- Phase 9: repair pass produces clean three-CF split.
- Phase 10: narrative fit strong; world identity strengthened.

**Verdicts NOT chosen**:
- *ACCEPT* (without required updates): rejected — Rule 5 requires multi-file integration explicit.
- *ACCEPT_AS_LOCAL_EXCEPTION*: rejected — logical scope is global.
- *ACCEPT_AS_CONTESTED_BELIEF*: rejected — user wants this objective.
- *REVISE_AND_RESUBMIT*: rejected — proposal sufficiently specified.
- *REJECT*: rejected — invariants not violated, consequences manageable.

---

# Verdict

**ACCEPT_WITH_REQUIRED_UPDATES** — written 2026-04-18, applied atomically to 11 world files plus this adjudication record.

---

# Justification (Repair Options Considered)

**Chosen repair**: split into 3 CFs (CF-0021 modern creation, CF-0022 non-sentient agencies, CF-0023 partial translations) + 4 modifications (CF-0003, CF-0004, CF-0008, CF-0019) + new M-6, with explicit no-catastrophic-class ceiling, M-5 firewall, and ordinary-vessel-material commitment.

**Why it won**: preserves all user-stated dramatic intent (modern creation IS possible; some succeed; black market exists; communities respond differently; possessed artifacts with apparent agency exist) while keeping ONT-1, M-2, and M-5 intact. Sacrifices: catastrophic-class crafting is permanently impossible; vessel-hosted entities can never be confirmed sentient at world level; containment-grade clay remains guild-monopolized.

**Rejected alternatives**:
- (a) ACCEPT_AS_LOCAL_EXCEPTION — rejected because logical scope is global.
- (b) ACCEPT_AS_CONTESTED_BELIEF — rejected because the user wants this as objective truth.
- (c) Move the technique into Mystery Reserve as bounded unknown — rejected because it sacrifices the productive narrative pressure of confirmed-but-bounded practice.
- (d) `ontology_retcon` of CF-0004 — rejected per Continuity Archivist: change is distributional, not ontological; CF-0019 already latently permitted the upstream.

---

# Critic Reports (verbatim)

The escalation gate fired with all three triggers. Six critic sub-agents were dispatched in parallel; their reports are reproduced verbatim below.

## Continuity Archivist

### Direct Contradictions

- **CF-0004 (lines 168–219)** is the only direct, hard contradiction. The statement "Every magical artifact in Animalia was made by a vanished prior civilization (the 'Maker Age')" and "No one alive makes new artifacts" are both falsified by the proposal. The `distribution.who_can_do_it: []` and `who_cannot_easily_do_it: all living people (no one can make new artifacts)` lines are explicit and require revision, not annotation.
- **CF-0004 line 196** ("artifact supply is finite; no replenishment") is contradicted in spirit — replenishment exists, just at a thin and dangerous trickle. Must be reworded to "Maker-Age supply is finite; modern creation is marginal, lethal, and does not meaningfully replenish the artifact pool."
- **TIMELINE Layer 1, line 14**: "The artifacts themselves — ceramic, wood, metal — most inert, some dangerous, a tiny fraction catastrophic" implicitly references Maker artifacts only. Not a direct contradiction but reads as a closed set; needs clarifying phrase.

### Soft Conflicts and Required Annotations

- **CF-0003** (artifact-bound magic): not contradicted — modern crafted artifacts remain artifact-bound. But the `notes` field should explicitly state that "artifact" includes both Maker-Age and modern-crafted vessels, to forestall the misreading that magic is shifting toward learned craft. Without this, a future reader can mistake crafter knowledge for "learned spellcraft," breaching ONT-2.
- **CF-0006** (ceramic containment vessels): The proposal names ceramic, metal, and wood as crafter vessel materials. CF-0006 already restricts containment-grade clay as scarce and guild-controlled. Annotation needed: are crafter vessels using the same restricted clay grade (forcing material-conflict with guild monopoly) or a different grade (raising why-it-fails questions)? This is a stabilizer-load issue.
- **CF-0008** (guild-licensed extraction/traffic): scope must extend to crafter activity and the artifacts they produce. Currently the law covers extraction, containment, neutralization, brokerage — not creation. The proposal introduces a new criminalized/tolerated category that needs explicit inclusion.
- **CF-0019** (occult fragment purchase): The proposal expands fragment use from "studied empirically" to "used to actually attempt artifact creation." Needs `visible_consequences` annotation: kiln explosions, dead apprentices, possessed wares.
- **CF-0005** (effects always cost): not contradicted but extended — creation itself becomes a new cost-bearing event-class (lethal kiln explosions). Worth a note linking creation-attempt deaths to CAU-1's logic.
- **AES-3** (magical and contaminated aesthetically allied): reinforced, not threatened. No change needed but strengthens proposal.

### Timeline Updates Required

- **Layer 1 (Maker Age)**: Add a clause clarifying Maker-Age remains the dominant source; modern creation is a marginal recent stream.
- **Layer 3 (Incident Wave, ~last 50 years)**: Add a sub-pressure: emergence/visibility of crafter-attempts, kiln-explosion incidents, and the legal-response divergence across polities. The "rise in incidents" framing actually accommodates this naturally — some "incidents" of the wave may have always been failed crafter attempts misattributed to Maker leakage. This is an opportunity, not a burden.
- **Layer 4 (Current Unstable Present)**: Add convergence pressure: "Crafter-tolerance debate" — polities argue whether to treat crafters as smugglers, scholars, heretics, or legitimate artisans. Plays well with existing centralization-vs-guild tension.

### Latent Burdens

1. **Possession-entity adjudication**: Even if world-level resolved as non-sentient (per ONT-1), the world must commit to *what they are* mechanically. Beastly intelligence vs magical instructions are very different burdens for future canon. Recommend treating mechanism as Mystery Reserve (parallel to M-2/M-5) rather than committing.
2. **Containment-clay overlap (CF-0006)**: If crafters use guild-monopolized clay, the guild has a supply-side enforcement lever the proposal doesn't yet acknowledge. If they use substitute clay, why does substitute clay work? Forces a material-science commitment.
3. **Recipe-success question**: "Researchers debate on whether the effects are random upon creation or if they're dependent on the artifact-creation process" — this is a new in-world contested-canon item that needs an M-# entry or contested-canon record.
4. **Detection asymmetry**: Can wards/inspectors distinguish a modern artifact from a Maker artifact? If yes, enforcement is tractable. If no, the black market becomes much more difficult to police, which destabilizes CF-0008.
5. **Maker-mystic sectarian reaction**: Crafter activity is doctrinally explosive for cults that treat Makers as sacred ancestors or demons. Future canon will need a stance.
6. **Origin of Maker knowledge itself**: If modern creation is possible from grimoire study, this softens M-2 ("whether the technique could be relearned is mystery") — partially answers it. Needs deliberate adjudication: is M-2 narrowed, preserved as "full Maker technique remains lost," or retired?

### Retcon Framing Recommendation

`ontology_retcon` is the wrong change_type for CF-0004. The change is not ontological — magic is still artifact-bound, artifacts still cost, Makers still vanished, supply is still effectively finite. What changes is a **distributional/historical claim**: "all artifacts originate in Maker Age" → "artifacts predominantly originate in Maker Age; a marginal modern creation stream exists."

Recommended framing: **`scope_revision`** (or `qualification` if your schema supports it) on CF-0004, paired with a *new* CF (CF-0021: "Modern artifact creation exists as a marginal, lethal, leaky craft"). This is more honest because:
- It preserves CF-0004's core role anchoring M-1, M-2, M-5 rather than rewriting it.
- The new fact carries its own stabilizers, distribution, and prerequisites cleanly.
- It avoids the appearance of silently weakening a foundational fact (Rule 6 risk).
- `ontology_retcon` implies ONT-* invariant change; none of ONT-1/2/3 actually shift.

Reserve `ontology_retcon` language for the genuinely ontological commitment: the world-level decision that possession-entities are NOT sentient (preserves ONT-1). That deserves an explicit note, possibly as a new invariant-clarification rather than a retcon.

### Critical Risks

- **M-2 partial resolution unflagged**: The proposal effectively answers "could the technique be relearned?" with "partially yes, dangerously, from leaked grimoires." Mystery Reserve M-2 must be explicitly narrowed or rewritten in this change. The main agent's summary does not flag this. Per Rule 7, mystery erosion must be deliberate, not a side effect.
- **ONT-1 enforcement is fragile**: Calling possession-entities "non-sentient at world level" while letting in-world debate treat them as possibly sentient is workable, but the line between "imbued with agency" and "sentient" is thin. Risk of Rule 4 (silent globalization) if a future story treats one possessed artifact as actually communicating. Recommend an explicit invariant clarification: "artifact-bound entities are non-sentient regardless of apparent agency; their behavior is mechanism, not mind."
- **CF-0019 already permits the upstream**: Fragment purchase is canon. The proposal's "knowledge has escaped or been sold" is already structurally permitted by CF-0019 — meaning the *capability* to attempt creation has been latently canon since genesis. The retcon is smaller than it looks; the main agent may be over-stating disruption. Worth re-examining whether crafter attempts could be framed as *always having existed* (no temporal retcon needed) rather than as a recent development.
- **DIS-1 stress**: "Most artifacts are inert junk" applies to dug-up Maker artifacts. If crafter outputs have a different inert/dangerous/catastrophic ratio (e.g., higher catastrophic rate due to poor process), this introduces a second distribution that needs stating. Otherwise, readers will assume crafter outputs follow the same ratio, which is probably wrong given the proposal's emphasis on lethality.
- **No crafter-deaths in TIMELINE**: If crafter activity is decades old (per "have managed to acquire grimoires"), there should be timeline residue — named kiln-explosion incidents, executed crafters, a famous possessed artifact in a sealed quarter-town. Without residue, the practice will read as just-invented, violating the proposal's own framing.

## Systems/Economy Critic

### Economic Plausibility of Stated Stabilizers

The stabilizers are **partially plausible but underspecified relative to the file's stated scarcities**.

- **Lethality**: Kiln explosions kill crafters/assistants — credible friction, but the file already prices artifact-extraction veterans at "top silver and above" (Wage Spreads). High lethality plus high payoff historically *attracts* labor (cf. extraction guild apprenticeship pipelines). Lethality alone cannot stabilize entry; it must be paired with material scarcity.
- **Material scarcity**: The file lists **containment-grade ceramic clay**, **ward inscription pigments**, and **neutralizer compounds** as guild-controlled ("scarce by guild design and by genuine geological constraint" — Scarcity Map). The proposal says crafters use "ceramics, metal, wood" with no specification of whether these are *containment-grade* or ordinary. This is the single largest hole: if rogue crafters can use ordinary ceramic, scarcity stabilizer collapses; if they need containment-grade clay, the proposal silently implies black-market diversion from charter-controlled pits, which is a major Breakage Point not flagged.
- **Capital cost**: A kiln is cheap (any village potter has one). This is *much* lower capital intensity than extraction-guild infrastructure. The stabilizer is weak.
- **Knowledge scarcity**: Grimoire fragments in black market — plausible, but Recordkeeping/Archives (INSTITUTIONS.md) already has *three* contesting custodians; leakage is structurally over-determined, not rare.

### Missed Economic Consequences

1. **Labor market substitution**: Village potters and small-smiths now have a latent option-value on becoming rogue artifact-crafters. This pressures journey-work wages (upper copper / lower silver tier) by adding a high-variance outside option. Apprentice retention in ceramic guilds becomes harder.
2. **Insurance-equivalent collapse**: The file states "Insurance is informal and rarely complete" (Breakage Points). Adding a new class of workshop-detonation risk in residential quarters compounds urban fire/contamination risk with no actuarial absorber. Expect informal mutual-aid premiums to rise in artisan quarters.
3. **Distributional effect**: Successful rogue artifacts compete with **broker** revenue, not extraction. Brokers' charters depend on declared inventory; an unchartered supply directly erodes broker rents — a wealth-concentration node identified in Inequality Patterns.
4. **Ward-inspector arbitrage**: Inspectors (chartered guild specialty) gain a private side-market verifying or denouncing rogue artifacts. Regulatory capture risk is direct and unaddressed.
5. **In-kind payment channel**: Grimoire fragments become a value-store (Value Stores section needs this). They are partible, concealable, and high-density — superior to livestock for fugitive wealth.

### Market Structure Risks

- **Arbitrage across polities**: The proposal explicitly states polities differ (accept / tolerate / fine / jail). This *creates* a smuggling corridor along canals — exactly what Trade Flows Black Market Overlay already names, but the proposal does not specify which heartland/peripheral polity sits at which end. Without that, every canal junction becomes a latent arbitrage node.
- **Substitution against chartered artifacts**: Rogue artifacts may be cheaper (no charter dues, no inspection) and *more variable* — a lemons market in the Akerlof sense. Chartered registered-artifact prices likely bifurcate: premium for authenticated, depressed for marginal.
- **Regulatory capture**: Containment-wrights have an incentive to lobby for *criminalization* (protect cartel) OR *licensing-extension* (capture new market). Both are plausible; the proposal picks neither.
- **Specialized-material black market**: Containment-grade clay leakage from guild-controlled pits is the most likely vector, and it directly threatens the existing artifact-extraction guild's input monopoly.

### Required Updates to ECONOMY_AND_RESOURCES.md

- **Currency / Value Stores**: Add grimoire fragments as concealable, high-density value store; note thinness and price volatility.
- **Wage Spreads**: New tier — "rogue crafter assistant (kiln-side)" with hazard discount (cannot negotiate openly); contrast with chartered containment-wright apprentice.
- **Scarcity Map** (Temperate Canal Heartland row): Add "grimoire fragments; clandestine containment-grade clay diverted from charter pits."
- **Trade Flows / Black Market Overlay**: Explicitly add grimoire fragments, diverted containment clay, rogue-made artifacts; note polity-asymmetric criminalization driving arbitrage.
- **Wealth Creation**: Add "clandestine artifact crafting" as a high-variance, high-mortality wealth path distinct from chartered extraction.
- **Inequality Patterns**: Note new precarious stratum — surviving assistants of failed crafters (often maimed, blacklisted from guild apprenticeship).
- **Breakage Points**: Add "rogue-kiln detonation in residential quarter" as a new urban breach class.
- **Specialist Resources**: Flag containment-grade clay as having a *measurable* leakage rate, not just guild-controlled.

### Critical Risks

1. **Lemons-market collapse of the legal artifact trade** — variable-quality rogue artifacts at lower prices may destabilize broker revenue faster than the proposal implies, threatening a named wealth-concentration node.
2. **Containment-clay diversion** is the unspoken supply chain — without specifying whether rogue crafters use ordinary or containment-grade vessels, the entire artifact-extraction guild's input monopoly is silently breached.
3. **Polity asymmetry was asserted but not mapped** — until specific polities are named as "accepting" vs "jailing," the proposal silently creates a continent-wide arbitrage corridor along canal infrastructure, which interacts with existing Inter-polity trade-war Breakage Point.
4. **No mention of which Wage Spread tier rogue crafters occupy** — they are simultaneously poor (no guild contract) and potentially high-earning (one successful artifact). This volatility is not modelled in the existing tier table and will distort the artisan labor market without correction.

## Politics/Institution Critic

### Guild Response Plausibility

The brief is **partially incoherent** with existing institutional history. INSTITUTIONS.md's Artifact-Extraction Guilds list five specialties — **extractor, containment-wright, neutralizer, broker, inspector** — and notably *no creator/crafter role*. TIMELINE.md Layer 1 says containment-wright lineages "learned by trial and casualty," and Layer 3 emphasizes that guilds have **professionalized and consolidated** during the Incident Wave — not opened up creation programs.

The brief's claim that "research done on recovered and contained artifacts has led to the creation of modern magical artifacts" implies the guilds (the only legitimate custodians of contained artifacts) authored this knowledge. But guild charters carry **capital penalty for unlicensed possession** — which makes it implausible that a leak occurred casually. Either:
- A faction inside containment-wright lineages broke charter (institutional schism — needs naming);
- The brokers (chartered to deal with collectors and scholars) inadvertently distributed treatise material to "scholars" who later defected;
- A polity sponsored the research and the leak was inter-state espionage.

The brief leaves this unspecified, which is **a Rule 5 violation (No Consequence Evasion)**. Guild response is split: containment-wrights see crafters as charter-violators meriting seizure and prosecution; brokers see a market opportunity (regulated registration, fees); inspectors are now stretched between artifact-site inspection and *kiln inspection* — a major resource shock.

### Civic / Legal Pressure

This **strains, but does not break, the Charter Era settlement** — provided the divergence runs along existing fault lines. Law/Custom/Judgment already lists "civic charter versus species tradition" and "watch authority versus guild private enforcement" as live contradictions. Regional crafter-divergence maps onto these (highland/fenland communities likely tolerant; charter-anchored civic quarters punitive).

But **inter-polity crafter mobility is genuinely novel**: a crafter who trains legally in a tolerant polity and travels to a punitive one creates extradition, asylum, and reciprocity questions the Charter never anticipated. Civic registry has no schema for "lawful crafter status." This generates new case-law genuinely — the agent is right.

### Religious Pressure

**Understated**. The Common Pantheon vs Species-Progenitor settlement folded progenitors into the pantheon as "aspects." Modern artifact crafters claim creative power historically reserved (in folk cosmology) for **Makers** — Layer 1 deep-past entities variably read as ancestors, demons, or failed gods. A successful crafter implicitly answers a Mystery-Reserve question that the Charter-Era **deliberately left open**. Progenitor-supremacy sectarians will read crafters as either Maker-imitators (heretical) or progenitor-empowered (validating their supremacy claim). Common-pantheon clergy face a doctrinal crisis: was the "elder labor" divine, mortal, or demonic? The "possessed-with-unknown-entities" detail forces priests to issue exorcism judgments, dragging clergy into artifact-guild jurisdictional turf.

### Archive / Knowledge-Custody Pressure

**Severely destabilizes** the existing three-way contest (civic archive / artifact-guild / theological authority). Grimoire fragments now circulate on **black markets** — a fourth, illegitimate custodian. Civic archives historically claim chartered occult fragments; theological authorities claim cosmologically-charged ones; guilds claim operational ones. A grimoire that *teaches creation* fits all three categories. Worse, **possession itself becomes a criminal-status question** with regional variance (the brief explicitly says some polities jail mere possession of knowledge). Archives in tolerant polities effectively become safe-harbors; punitive polities will demand extradition of fragments. Bardic transmission (oral, deniable) becomes a workaround, politicizing bards further (Layer 4 already notes bardic-circuit politicization).

### Required Updates to INSTITUTIONS.md

1. **Artifact-Extraction Guilds subsection**: add sixth specialty *crafter* (contested status — chartered in some polities, outlawed in others); add new contradiction line about creation-research leakage and internal schism between containment-wrights and brokers.
2. **Law/Custom/Judgment**: add contradiction "regional divergence on artifact-creation: tolerated/fined/jailed; crafter-mobility creates novel extradition case law."
3. **Religion / Ritual Authority**: add contradiction under both Common Pantheon and Progenitor Cults about crafters as Maker-imitators; add note on possessed-vessel exorcism authority dispute.
4. **Recordkeeping / Archives**: explicitly add **black market** as fourth custodian; note regional criminalization of possession.
5. **Healing/Medicine**: add kiln-explosion injury and entity-possession contamination as new species of artifact-injury beyond extraction-contamination.
6. **Education/Apprenticeship**: add *clandestine occult apprenticeship* as new shadow track outside guild-seal/monastic-ordination legitimacy.

### Critical Risks

- **Maker Mystery erosion (M-1, M-2, M-5)**: Successful modern creation **partially answers** what Makers were. The brief must explicitly preserve the mystery — perhaps modern artifacts are crude, unstable, qualitatively inferior to Maker artifacts, suggesting Maker technique remains unrecovered.
- **Battlefield-artifact taboo (Military contradiction)**: Modern crafters could produce *bespoke* battlefield artifacts on commission. Mercenary captains will commission them. This collapses the existing taboo within a generation unless explicitly constrained.
- **Crafter-as-political-asset**: Polities will compete to recruit/protect/extradite crafters — a new diplomatic axis the agent has noted but underweighted. Successful crafters become **strategic assets** like master shipwrights or siege engineers, with attendant kidnapping/defection plotlines.
- **Ward-breach/kiln-explosion jurisdictional collision**: Civic watch, artifact-guild, and now *fire wardens / kiln inspectors* must coordinate. The Healing institution is hit twice (extraction injury + creation injury) without resource expansion.
- **Sentience question is live**: "Sentient intelligence" possession claim has ONTOLOGY implications (ONT-3 cross-species kinship via adoption — could a possessed artifact be adopted? Sounds absurd but a sectarian movement *will* try).

## Everyday-Life Critic

### AES-2 Compliance

Strong potential, currently under-realized in the proposal. The current Phase 6 list (kiln explosions, gossip, "dangerous-to-apprentice" trades) touches the artisan quarter only. WORLD_KERNEL already establishes magic as "treated like radium, sold under guild license, and feared like plague" — this proposal correctly extends that texture *downward* into informal craft, which is good for AES-2. But to genuinely "keep the world honest," the rogue-crafter possibility must produce visible signatures across non-artisan classes too: tenant-farmer, fisherwife, drylands caravaner. Right now the proposal reads as an addendum to the licensed-extraction economy rather than something that touches the herb-wife's morning rounds. Needs strengthening, not rewriting.

### Per-Cluster Signatures

- **(a) Canal heartland** — STRONG. Kiln-smoke at odd hours on the next street; canal-laborers passing rumor about which row-cottage workshop "lost an apprentice last spring"; ward-inspectors making unscheduled walk-throughs of potter and metalworker quarters; off-street kilns inspected on charter authority.
- **(b) Outskirts estate** — MODERATE. Risk lives in the *tenant cottages* and the outbuildings — a tenant smith who reads above his station, a steward noticing unaccounted ceramics deliveries. The dowager's gossip-circuit knows which neighboring estate "had a scandal in the kiln-yard." Estate-master's quiet fear: a tenant making artifacts on family land = family scandal + civic exposure.
- **(c) Cold north highland** — WEAK by geography (no kilns at scale, no grimoire trade routes), but NOT absent. A traveling tinker peddling "useful charms" to a clan; a clan elder who burns a found grimoire-leaf rather than read it; suspicion of the clan smith who winters alone. Asymmetry: rarer, but more lethally suspicious when it appears — clan justice is faster than charter justice.
- **(d) Drylands south** — MODERATE-STRONG. Adobe kilns and metal-smiths in caravan towns are perfect cover; caravan rotation moves grimoire-fragments between towns invisibly; water-rights tribunals occasionally hear "the kiln drew off well water for *what*?" cases. Caravan-masters quietly refuse certain cargo.
- **(e) Fenlands west** — WEAK direct (no kilns in stilt-villages), but DISPLACED: dry-edge potter villages on the fen-margin become the suspected source; fen-folk amphibian-canaries detect odd contamination from a botched firing miles away and the village blames the potter. Asymmetry justifies itself.

### Hero-Drift Risk

MODERATE. The proposal as written drifts toward "story engine for adventurers and crafters." It needs explicit hooks to ordinary trades:
- **Herb-wife**: asked to treat unexplained burns; pressed by neighbors to identify whether a household's miscarriage / sickness / animal death came from a "neighbor's pot."
- **Tannery-master**: receives unusual ceramic-vessel orders; refuses or accepts at risk.
- **Canal-laborer**: hauls an unmarked crate from a private workshop, knows what the contract isn't saying.
- **Tenant-farmer**: notices the manor-tenant smith taking deliveries of strange clays; reports or doesn't report.

If those touchpoints aren't in EVERYDAY_LIFE.md, this fact lives only in the artisan layer.

### Concrete Ordinary-Life Touch Points

- **New fears**: the *neighbor's kiln*; apprenticing a child into a private workshop without guild stamp; buying secondhand pottery from estate sales; sleeping downwind of an unlicensed forge.
- **New gossip**: which workshops have unexplained injuries; which tenant "reads at night"; which caravaner brought back a bound book.
- **New common knowledge**: kiln-smoke that smells "wrong"; the warning that a private workshop with shuttered windows on firing-day is a tell.
- **New safety drills**: town fire-watch trained to evacuate adjacent row-cottages on suspected artifact-firing (kiln explosions are now a *category* of fire); children taught not to enter neighbor's workshops uninvited.
- **New household precautions**: refusing pottery gifts from unfamiliar makers; checking that hired crafters carry a guild stamp; herb-wife keeping burn-salve restocked in artisan quarters.
- **New regional norms**: heartland charter-courts impose fines; northern clans burn the grimoire and exile the reader; drylands water-courts add "occult firing" to well-misuse statutes; fenland villages quarantine the suspected potter on the dry edge.

### "Watch Your Neighbor" Anxiety

REALISTIC for the chronotope. Late-medieval-to-early-modern texture supports this exactly — historical analogues (witch-suspicion, alchemist-suspicion, illicit forging of coin) all produced this neighbor-watching pattern. The kernel's "treated like radium, feared like plague" line legitimizes the anxiety. NOT overstated — but it should be *uneven*, not panic. Day-to-day it's background hum; flares only when an incident happens.

### Children

YES, children would know — variably:
- **(a) Heartland**: explicit warning rhymes about kiln-smoke; "don't enter that workshop" lessons; charter-school may name the legal categories.
- **(b) Outskirts estate**: tutored children told it's a *family-shame* topic; servants' children whisper more freely.
- **(c) North highland**: ghost-story texture — the clan-elder who "read the wrong page"; warnings against grimoire-leaves found in trade goods.
- **(d) Drylands**: caravan-children warned which cargo not to touch; riddles encode the warning.
- **(e) Fenlands**: ghost-stories about contaminated villages already cover this — extend with "the potter on the dry edge whose pots sang."

### Required Updates to EVERYDAY_LIFE.md

- **(a) Common fears**: add "kiln-explosion next door, neighbor's private workshop." **Common injuries**: "burns and shrapnel from neighborhood kiln incidents." **Childrearing**: add the warning about unstamped workshops. **Labor rhythm**: ward-inspector walk-throughs noted.
- **(b) Common fears**: add "tenant or cousin caught with grimoire fragments." **Aging/oversight**: dowager-gossip tracks which estates had kiln-yard scandals. **Common injuries**: extend the buried-artifact line to include tenant-workshop incidents.
- **(c) Common fears**: add "outsider tinker selling charms; clan-member found reading bound book." **Prayer and ritual**: clan-burning of suspect texts as ritual.
- **(d) Common fears**: add "occult firing in caravan-town kilns; well drawn down by unlicensed crafter." **Prayer and ritual**: water-rite officiants speak against occult firing. **Labor rhythm**: caravan-master cargo refusals.
- **(e) Common fears**: add "dry-edge potter making artifacts whose contamination reaches us first." **Oral storytelling**: the singing-pot ghost story. **Medicine**: amphibian-folk early warning of distant firings.

### Critical Risks

1. **Artisan-only capture**: the fact will be filed under "potters and smiths" and will not propagate to herb-wife, midwife, tenant-farmer, caravan-laborer unless EVERYDAY_LIFE.md explicitly names those touchpoints.
2. **Class-flattening**: the proposal as written reads working-class-coded (independent crafter, kiln). The estate-tenant and the dowager-gossip dimension is missing — and that's where the *class friction* of this fact actually lives. A licensed estate sheltering an unlicensed tenant-crafter is a powerful story-engine the proposal doesn't articulate.
3. **Geography asymmetry not explicit**: north and fen don't have kilns at scale. The proposal must NAME the displacement (traveling tinkers north; dry-edge potters for the fen) or those clusters will appear unaffected and break AES-2.
4. **Child-knowledge pipeline missing**: without explicit lines in childrearing/oral-storytelling per cluster, this fact becomes adult-only knowledge and loses lived texture across generations.
5. **Conflation risk with dug-up artifacts**: ordinary people may not distinguish "ancient buried artifact" from "modern crafted artifact." That conflation is itself a feature — but EVERYDAY_LIFE should note the folk indistinguishability explicitly, otherwise the texture flattens into existing ward-economy fear.

## Theme/Tone Critic

### Primary Difference Preservation

**Status: Eroded at the seam, but recoverable.**

The Kernel says: "Magic is not a learned art but an unearthed hazard… Living people cannot cast. Artifacts can — and the artifacts decide." ONT-2 reinforces: "Magical effects are produced by physical artifacts… made by lost makers."

The proposal does not introduce spellcasting. Crafters are still making vessels, not throwing fire. **However**, the phrase "made by lost makers" in ONT-2 is now literally false: makers are no longer exclusively lost. The proposal converts "vanished antiquity" into "vanished antiquity + leaky modern reverse-engineering." The artifact-as-hazard frame survives; the "inherited from a vanished antiquity" frame takes a hit.

The mitigation is in the proposal itself: lethal failure rates, poor understanding, fragmentary grimoires, no reproducibility. If those constraints are load-bearing rather than cosmetic, the primary difference is bent, not broken. Recommend ONT-2 be revised to read "made by lost makers, and rarely and dangerously approximated by modern crafters working from leaked fragments" — the revision difficulty is high, but it's an honest revision rather than a silent retcon.

### Tonal Contract Compatibility

Strong fit. "Kiln explosions that killed assistants or the crafter themselves" is exactly the register: sober about death, earthy (kilns, ceramics, wood), hazardous, and quietly tragic. Communities that "tolerate," "fine," or "jail" crafters mirrors the existing texture of guild license, ward taboo, and regional variation. The dryly comic potential is intact (a back-room potter who blew off three fingers and won't say why).

### Genre Drift Risk

The drift vector is **toward occult-pulp / hedge-wizard sword & sorcery** (think Clark Ashton Smith's necromancers, or warlock-as-craftsman). Not academy fantasy — the proposal explicitly rules that out by fragmenting the knowledge and lethalizing the practice. The danger is the *romance* of the lone artificer in his workshop becoming a recurring protagonist archetype, which would crowd out canal-folk, magistrates, and veterans. The Kernel's ordinariness (AES-2) needs vigilant protection: stories should still center the bargemaster who finds a crafter's botched vessel in the silt, not the crafter himself.

### "Possessed Entities" Tonal Handling

This is the highest tonal risk in the proposal. "Possessed with unknown entities seemingly imbued with agency" can read either as (a) Meadows-grade emergent system weirdness (in register) or (b) demon-bound talismans (out of register, pulpier). ONT-1 forbids disembodied sentience as a world-fact, so the framing must stay **diegetic and contested** — practitioners *debate* whether it's intelligence, instinct, or inscribed pseudo-agency. Never confirm sentience at world-level. Keep this in Mystery Reserve / Contested Canon. Avoid words like "spirits," "souls," "demons." Prefer "behaves as if," "appears to," "resembles."

### Story Engine Coherence

Generates new engines compatible with the existing list: "kiln explosion in a guild quarter triggers ward inspection," "smuggler caught with a grimoire fragment faces a magistrate split between species tradition and civic charter," "modern artifact mistaken for ancient one at market." These map cleanly onto extraction-jobs-gone-wrong, ward-inspector-finds-something, and magistrate-dilemma engines. **But** it also enables "crafter tries to make a great work" — a chosen-individual narrative that fights AES-1 ("heroism in coin and scars, not glory"). Containable, not automatic.

### Critical Risks

1. **ONT-2 silent retcon.** The main agent's enrichment claim doesn't acknowledge that ONT-2's literal text becomes false. This needs an explicit invariant revision, not a slide.
2. **Mystery Reserve erosion.** "What made the Makers fall" is taboo speculation; partial rediscovery quietly answers part of the question (the technique was *learnable*, just lost). Bound this carefully.
3. **Specialness inflation drift** if crafter-protagonists proliferate. Keep crafters offstage or in supporting roles in early canon.
4. **Possessed-entity framing** must remain contested/diegetic, never world-level confirmed, or ONT-1 cracks.
5. **"Modern artifact" diagnostic signature** unspecified — if modern and ancient artifacts are indistinguishable, the wonder/dread of unearthing collapses. The proposal needs a visible signature distinction (AES-3 protection).

## Mystery Curator

### M-1 Status After Proposal

**Enrichment, not foreclosure** — but with a bounded risk that needs explicit guarding. The proposal introduces modern kiln explosions and crafter deaths as a *small-scale* parallel to the catastrophic-end interpretation already listed as a "common in-world interpretation": "They consumed themselves with their own magic (a popular cautionary reading)." This is enrichment because the modern parallel adds *evidence-shape* in-world for that folk reading without confirming it at world level. The line is crossed only if the CF record asserts that modern accidents *demonstrate* the Maker fall mechanism, or scales modern accidents toward civilization-ending magnitudes. **Required guard**: CF record must explicitly state the modern parallel is interpretively suggestive only — it does NOT constitute evidence at world level for any M-1 hypothesis. The "popular cautionary reading" gains diegetic traction; the underlying mystery does not narrow.

### M-2 Required Scope Commitments

The main agent's claim that modern craft does NOT produce catastrophic-class is **NOT explicit in the proposal text** and MUST be a hard scope constraint in the CF record. M-2 disallows "any answer that resolves into a single named adversary" — but it equally disallows any framing that implies catastrophic-class is *just* a scaled-up version of what modern crafters do, because that would tacitly resolve the "war/cult/accident-collapse" trichotomy toward "accident-collapse." Required CF commitments, verbatim level:
1. Modern craft produces **only ordinary-class artifacts at most**, never catastrophic-class.
2. Modern craft is recognizably different in process and output from the catastrophic class (preserving M-2 Knowns clause: "recognizably different in craft and material from ordinary Maker-Age work").
3. The treatises/grimoires accessible on black markets do NOT contain catastrophic-class instructions; whether such instructions ever existed remains M-2-bound.

Without these, M-2's "war-collapse / cult-collapse / accident-collapse / hidden-people" four-way ambiguity collapses toward accident-collapse.

### M-5 Resolution Adequacy

**Adequate but fragile** — needs one additional guardrail. The "world-level NOT-sentient + in-world contested-canon" framing aligns with M-5's permitted structure ("Heretical sectarian belief in either direction is permitted as contested canon"). However, the proposal's phrase "possessed with unknown entities seemingly imbued with agency" is dangerously close to introducing a *new* observable phenomenon that pressures M-5 by analogy: if modern artifacts can host agency-bearing entities, the question "is animal-folk sentience also a hosted entity?" becomes diegetically askable in a sharper way than before. Required additional guard: the CF record must classify the in-world dispute (instructions / beastly / sentient) as **observationally unresolvable** in the present, and must explicitly disclaim any cross-application to animal-folk sentience (M-5 firewall clause). Otherwise even the careful framing becomes a trojan horse: scholars in-world will inevitably draw the analogy, and the world-design will have foreclosed M-5 by structural implication rather than statement.

### M-4 Pressure

**Low direct pressure, moderate indirect pressure.** The proposal does not touch progenitor figures. However, the new sectarian/community variation in handling crafters (acceptance/tolerance/fines/jail) opens a parallel sectarian axis that could become entangled with progenitor-supremacy movements (M-4 mentions "rising progenitor-cult tension"). Flag: future canon work should not let crafter-tolerance map cleanly onto progenitor-sect alignment — that would consolidate two pressure systems into one and weaken both.

### OPEN_QUESTIONS Items Now Pressured

- **"Specific Maker-Age Details"**: Now harder to defer. The proposal implies treatises/grimoires were *recovered and translated enough to enable craft* — this implicitly resolves part of "Maker-Age Linguistic Recovery" (partial translations exist; some are in private/black-market hands). The CF record must commit to this implication rather than leave it ambient.
- **"Maker-Age Linguistic Recovery"**: **Partially resolved by implication.** Must be explicitly committed: partial translations exist, are restricted, and have leaked. Caution flag for M-1/M-2/M-5 must be re-asserted on what those partial translations may NOT contain.
- **"Specific Guild Naming and Charter Conditions"**: Now pressured because crafter regulation varies by polity — needs at least a sketch of how guild charters interact with independent-crafter law.
- **"Mythical-Species Embodiment Mechanism Specifics"**: Indirectly pressured via the agency-in-vessels framing (M-5 adjacency).

### New Mystery Reserve Entries Recommended

**M-6 (proposed) — The Nature of Vessel-Hosted Agencies**: bounded unknown around what the "agency" in modern possessed artifacts actually is (magical instruction-set / beastly intelligence / sentient intelligence / something else). Knowns: agency-like behavior is observed; world-level NOT sentient. Unknowns: mechanism, classification, relationship (if any) to Maker-Age artifact behaviors. Disallowed cheap answers: "they're just programs," "they're trapped souls," any reveal that maps cleanly onto M-5. Future-resolution safety: low. This entry is necessary because the proposal *creates* this question and leaving it floating violates Rule 7.

### Critical Risks

1. **M-5 firewall not explicit**: Without an explicit disclaimer prohibiting cross-application of vessel-agency reasoning to animal-folk sentience, the proposal silently pressures M-5 by structural analogy. This is the single highest-priority risk.
2. **Catastrophic-class scope unstated**: The main agent's verbal claim that modern craft does not produce catastrophic-class is not in the proposal text. If it doesn't make the CF record explicitly, M-2 is silently narrowed.
3. **"Popular cautionary reading" gains evidence-weight**: Without a clause noting the modern parallel is interpretively suggestive only, M-1's interpretation balance tilts toward self-destruction.
4. **Linguistic Recovery silent retcon risk**: Treatises/grimoires being usable implies partial translations exist. This must be a logged commitment (Rule 6: No Silent Retcons), not an unspoken implication.
5. **Missing M-6**: The proposal manufactures a new bounded unknown (vessel-agency nature). Failing to register it as a Mystery Reserve entry is a Rule 7 violation in its own right.

---

# Files Modified

- `worlds/animalia/CANON_LEDGER.md` — appended CF-0021, CF-0022, CF-0023; modified CF-0003 (note); CF-0004 (qualification); CF-0008 (extension); CF-0019 (extension); appended CH-0002.
- `worlds/animalia/WORLD_KERNEL.md` — Primary Difference item 2 acquires marginal-modern-stream qualifier; "What Is Wonder" / "What Is Taboo" lists updated.
- `worlds/animalia/INVARIANTS.md` — ONT-1 clarification (vessel-hosted agencies non-sentient); ONT-2 annotation (marginal modern reverse-engineering).
- `worlds/animalia/TIMELINE.md` — Layer 1 dominant-source clarification; Layer 3 reattribution sub-stream; Layer 4 crafter-tolerance debate.
- `worlds/animalia/GEOGRAPHY.md` — Sealed-quarter reattribution note; new "Regional Asymmetry on Crafter-Tolerance" section.
- `worlds/animalia/INSTITUTIONS.md` — Artifact-Extraction Guilds sixth specialty + internal schism; Law/Custom/Judgment new contradiction; Religion doctrinal-crisis line; Healing kiln-explosion injury class; Education clandestine occult apprenticeship; Recordkeeping black-market fourth custodian.
- `worlds/animalia/ECONOMY_AND_RESOURCES.md` — Wage Spreads new tier; containment-clay clarification; Black Market Overlay extension; Value Stores grimoire fragments; Wealth Creation clandestine crafting; Inequality Patterns precarious sub-stratum; Breakage Points rogue-kiln detonation; Specialist Resources grimoire fragments.
- `worlds/animalia/MAGIC_OR_TECH_SYSTEMS.md` — Source clause clarified; Failure States table extended; Material Requirements clay-grade clarification; new "Modern Creation" subsection.
- `worlds/animalia/EVERYDAY_LIFE.md` — All 5 clusters receive concrete touch-points (heartland, outskirts estate, highland, drylands, fenland).
- `worlds/animalia/OPEN_QUESTIONS.md` — Maker-Age Linguistic Recovery partial-commitment update; three new entries (Crafter Charter Conditions; Vessel Effect Predictability; Possessed-Entity Adjudication Mechanism).
- `worlds/animalia/MYSTERY_RESERVE.md` — added M-6 (The Nature of Vessel-Hosted Agencies).
- `worlds/animalia/adjudications/PA-0001-accept_with_required_updates.md` — this record.
