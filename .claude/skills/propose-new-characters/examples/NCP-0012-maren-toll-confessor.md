# Example — NCP-0012 Marsh Toll Confessor
#
# This is a worked example of the proposal-card format, adapted from the
# brainstorming proposal's NCP-0012 example. It illustrates:
#   - Option-A structural compatibility: frontmatter's first block carries
#     character-generation's required+optional fields; body sections mirror
#     character-generation's dossier schema.
#   - Niche Analysis section preserves the proposal's 7-layer essence spine
#     as audit trail.
#   - canon_assumption_flags.status = canon-edge (the card leans on the
#     assumption that confession is used informally for rumor flow in this
#     world — a leaning-point, not a new canon claim).
#   - recommended_next_step = generate_immediately (the canon-edge
#     assumption is minor enough that character-generation can run without
#     first routing to canon-addition).
#
# The world-slug and CF/MR/invariant ids below are illustrative placeholders.
# In a real run, they would be actual IDs from the target world's files.

---
# ===== character-generation compatibility block =====

current_location: "South Marsh Levy Stations"
place_of_origin: "South Marsh Levy Stations"
date: "Year 412 After Flood"
species: "human"
age_band: "late thirties"
social_position: "low chartered cleric"
profession: "ferry toll priest and record-keeper"
kinship_situation: "widowed with dependent niece"
religious_ideological_environment: "temple traditionalist under frontier compromise"
major_local_pressures:
  - "smuggling expansion along the river crossings"
  - "flood-season shortages"
  - "pressure from visiting tax collectors"
  - "local distrust of temple oversight"
intended_narrative_role: "broker, witness, compromised moral filter"

central_contradiction: "believes order prevents suffering but survives by tolerating selective lawbreaking"
desired_emotional_tone: ""
desired_arc_type: ""
taboo_limit_themes: []

# ===== NCP-specific identification =====

proposal_id: NCP-0012
batch_id: NCB-0003
slug: "maren-toll-confessor"
title: "Maren, Marsh Toll Confessor"

# ===== NCP-specific proposal metadata =====

niche_summary: >
  A ferryman-priest stationed at a levy crossing who hears confession,
  logs contraband rumors, and has become the unofficial broker between
  tax law, folk piety, and smuggling families. Opens a world window on
  the marsh frontier's tripartite compromise — temple authority, crown
  taxation, and clan smuggling economies — from a low-mobility insider
  whose ordinary-life reality is constant material negotiation with
  what the world officially forbids.

occupancy_strength:
  current_state: adjacent
  nearest_existing_occupants:
    - "DA-author-ritual-purity-voice (unnamed; sermon in diegetic-artifacts/sermon-levy-season.md)"
    - "CHAR-0004 Magistrate Vor (regional magistrate with no river access)"
  overlap_type: adjacent
  decisive_differences:
    - "low-status local mobility vs magistrate's elite-distant oversight"
    - "hybrid ritual-and-tax access vs pure ritual-purity voice"
    - "confession-based rumor intake rather than sermon delivery"

depth_class: elastic
proposal_family: "boundary broker / translator"
diagnosis_target: "Phase-5 probe 7 (pressures without translators / archivists)"

# ===== scoring (Phase 11) =====

scores:
  world_rootedness: 5
  niche_distinctiveness: 4
  pressure_richness: 5
  voice_distinctiveness: 4
  ordinary_life_relevance: 5
  artifact_utility: 5
  thematic_freshness: 4
  expansion_potential: 4
  canon_burden: 2
  overlap_risk: 2

score_aggregate: 32

# ===== canon routing (Phase 10c output) =====

canon_assumption_flags:
  status: canon-edge
  edge_assumptions:
    - "Assumes confession is used informally for rumor flow among low-chartered clergy at frontier stations. This is plausible under existing temple-charter canon (CF-0018 allows local-chartered clergy to keep operational records at their station) but not explicitly attested. If a future run establishes that confession must be sealed across all chartered ranks, this card downgrades to canon-requiring."
  implied_new_facts: []

recommended_next_step: generate_immediately

# ===== critic pass audit trail =====

critic_pass_trace:
  phase_1_continuity_archivist: "Registry build surfaced DA-sermon-levy-season and CHAR-0004 as nearest occupants in the marsh-frontier religious zone; neither overlaps at function layer."
  phase_2_essence_extractor: "Essence profile: low-mobility insider with tripartite access (ritual + tax + smuggling-kin); function layer = boundary broker; voice layer = temple-formulae-frayed-by-river-slang."
  phase_3_constellation_mosaic: "Mosaic-view placement: parallels CHAR-0007 Border-Mint Tallier across a different institutional axis (customs vs sacraments); constellation-view: direct link to CHAR-0004 via institutional tension between magistrate and temple."
  phase_5_institutional_everyday: "Diagnosed gap: marsh-frontier clergy visible only through sermon-voice; no insider-voice on the compromise between law and folk-piety."
  phase_8_epistemic_focalization: "Seed's known_firsthand contains practical-corruption specifics but nothing touching MR-0002 (origin of Flood). Phase-10b firewall recorded clean."
  phase_9_voice_critic: "Voice signature passes swap/motive/mode/quote/artifact-author tests. Distinct from DA-sermon-levy-season (pure ritual-purity register) through river-slang fraying and ledger-exactness on written register."
  phase_9_artifact_authorship: "Plausible authorship: toll ledgers, devotional notices, private warning letters, witness statements. Written register (ledger-exactness) distinct from oral register (evasive, indirect)."
  phase_11_theme_tone: "Thematic freshness 4/5: adds a new angle on the world's grim-compromise tonal contract — not rebellion against compromise, but daily inhabitation of it."

# ===== Canon Safety Check audit trail (Phase 10 output) =====

canon_safety_check:
  invariants_respected:
    - "INV-0001 (no supernatural efficacy without cost) — seed claims no magic"
    - "INV-0003 (literacy is elite-granted, not universal) — seed's literacy is temple-charter-granted, passes"
    - "INV-0007 (heroism is costly, not clean) — seed's moral position is compromised, passes tonally"
  mystery_reserve_firewall:
    - "MR-0001 (origin of the Marsh Courts) — checked; no overlap with seed's epistemic surface"
    - "MR-0002 (origin of the Flood) — checked; no overlap (seed holds no view)"
    - "MR-0003 (true authorship of the Sacred-Letters corpus) — checked; seed's reading list excludes the Sacred-Letters corpus"
  distribution_discipline:
    canon_facts_consulted:
      - "CF-0018 (local-chartered clergy may keep operational records at their station)"
      - "CF-0022 (frontier tax stations operate under tripartite authority)"
      - "CF-0031 (confession practices in temple-traditionalist sects)"

# ===== provenance =====

source_basis:
  world_slug: "marsh-courts"
  batch_id: NCB-0003
  generated_date: "2026-04-20"
  user_approved: false

notes: >
  Phase 10e did not fire. The canon-edge assumption about informal confession
  flow is logged for future audit: if a continuity-audit run tightens
  confession-seal rules, this card may require revision before becoming a
  character via character-generation. Voice family intentionally contrasts
  with DA-sermon-levy-season (both marsh-frontier clergy, both temple-
  traditionalist-under-frontier-compromise, but the sermon's ritual-purity
  register vs this card's practical-ledger register is the exact contrast
  that makes the marsh-frontier religious zone legible from two angles
  rather than one).
---

# Maren, Marsh Toll Confessor

## Material Reality

Maren eats what the river provides — eel stew in summer, salt-pork and barley-bread in winter — supplemented by the station's temple stipend (calibrated per `ECONOMY_AND_RESOURCES.md §Frontier Stipends` to bare subsistence, which is the point: hungry clergy are more tractable clergy). He sleeps in the stone cell above the levy station's record-room, which floods to ankle-height twice a year per `GEOGRAPHY.md §South Marsh Flood Cycles`. He owns a ledger-book, three quills, a sealed lock-box for coin-receipts, a brass medallion of office, a single ritual vestment that goes from ceremonial to everyday across the season, and — secretly — a small tin of tobacco purchased from a family he is technically investigating.

His leg is scarred from a spiked-post incident ten years ago; the injury makes fording difficult and current-reading constantly salient (`PEOPLES_AND_SPECIES.md §Human embodiment` + `EVERYDAY_LIFE.md §Marsh Hazards`). He cannot travel beyond the levy's jurisdiction without crown authorization — the temple charter binds him to the station (`INSTITUTIONS.md §Temple-Charter Clergy`). He owes the temple three years of service beyond his current term as reparation for a drunken incident with a noble's daughter in his youth; the debt is the reason he was assigned to this frontier station rather than a more comfortable inland parish.

## Institutional Embedding

**Family / clan / household**: widowed; raises his late sister's daughter Rill (age 11) who helps with the ledger work. No surviving kin at the station.

**Law**: operates under the tripartite authority of temple, crown, and marsh-clan custom (`INSTITUTIONS.md §Frontier Levies, CF-0022`). Law is situational, layered, and often contradictory at this station.

**Religious authority**: low chartered cleric, temple-traditionalist sect. Reports nominally to the inland archdeacon; in practice corresponds with him once a season at most.

**Employer / guild / lord / state**: the temple pays his stipend; the crown's tax office audits his ledgers; the marsh-clans pay toll and receive confession.

**Military obligation**: exempt under clerical charter.

**Debt**: three-year reparative service owed to the temple (see Material Reality).

**Local taboo system**: temple-traditionalist restrictions (no direct handling of the dead without second cleric; no working on high holy days; no speaking certain ritual formulae outside consecrated ground); plus marsh-clan taboos he has absorbed through proximity (no pointing at flood-lines, no counting cargo aloud during the dusk hour).

**Literacy / schooling**: literate in formal temple register + vernacular ledger script (`EVERYDAY_LIFE.md §Literacy distribution`). Schooled at the inland seminary in his late teens.

**Inheritance**: none expected; his sister's small estate went to Rill's dowry, held in trust by the temple.

## Epistemic Position

**Known firsthand**: the flood paths of the South Marsh; the faces and kin-networks of every regular toll-payer; the weight of a standard grain barge vs one carrying hidden cargo; the specific corruption patterns of the last three tax inspectors he has hosted; the speech habits of confessors lying vs confessing truly; the emotional rhythm of a family pressed against a deadline.

**Known by rumor**: court politics at the inland capital; the state of the wider smuggling economy beyond his stretch of river; the health of the aging archdeacon; whether the Sacred-Letters canon will be expanded in the coming synod.

**Cannot know**: the fate of his former lover (decades gone, no contact); whether his informal deals will be discovered; MR-0002's forbidden answer.

**Wrongly believes**: that his immediate superior, the archdeacon, is unaware of his informal arrangements (the archdeacon has known for six years and chose not to escalate — Maren has not yet deduced this). That the marsh-clans' deference to his medallion is religious (it is primarily pragmatic).

**Vocabulary for major phenomena**: speaks of the Flood using temple-formal terms in public and river-slang in private ("the big drink"). Uses "balance" to mean both ledger-arithmetic and moral reckoning — this metaphor-collision is central to his voice.

**Missing categories**: has no word for "bureaucracy" as an abstract concept; treats each institutional relation as a specific named chain of persons.

## Goals and Pressures

**Short-term goal**: prevent the incoming quarterly inspection from exposing his informal deals with the Voss smuggling family.

**Long-term desire**: be transferred inland and regain ritual respectability — preferably before Rill comes of marriageable age, so she can enter a settled social field rather than the frontier's compromise economy.

**Unavoidable obligation**: keep the crossing functioning for both villagers and temple revenue; failure here costs his charter, which is the only thing between Rill and destitution.

**Public mask**: patient servant of law and mercy; the stable moral center of the station.

**Private appetite**: tobacco, which is technically permitted but in practice marks him as having accepted marsh-clan hospitality.

**Social fear**: being named corrupt by both smugglers and clergy simultaneously — the one outcome that destroys all three of his institutional footholds.

**Private shame**: took temple vows after abandoning a drowning victim years ago (he was not the cause of the drowning, but he saw and did not go back; nobody else knows).

**External pressure**: the inspection; flood season's approach; rising crown interest in the marsh tolls as a revenue source.

**Internal contradiction**: believes order prevents suffering but survives by tolerating selective lawbreaking.

**Repeated forced choice**: *profit-vs-contamination* — each time a smuggler family offers him a small courtesy (warm bread, tobacco, a ferrying favor for Rill), he must choose between accepting (contamination of his moral standing, but continued practical access) and refusing (clean standing, but losing the information flow that makes his station functional). He chooses accept approximately seven times out of ten. The pattern is stable; the cost accumulates.

## Capabilities

### Ledger-reading and Double-entry Record-keeping

**how_learned**: seminary training (two years); deepened through ten years of station practice.

**cost_to_acquire**: the seminary debt; the tedium of the daily ledger labor.

**teachers_institutions**: the inland seminary; the retired station clerk who trained him in his first year.

**unusual_or_ordinary**: ordinary for chartered clergy per `EVERYDAY_LIFE.md §Literacy distribution`; unusual for anyone at his station stratum outside clergy.

**body_class_place_shape**: the scarred leg makes standing-desk work painful, so he writes seated on a stool — which produces a distinctively cramped hand that station-inspectors recognize on sight.

### Confession-hearing (temple-formal register)

**how_learned**: seminary training; refined under the archdeacon during his apprentice year.

**cost_to_acquire**: the spiritual burden of the knowledge he absorbs and cannot share; specific sleeplessness during flood season when confessions become dense.

**teachers_institutions**: the temple; the archdeacon specifically.

**unusual_or_ordinary**: ordinary for chartered clergy.

**body_class_place_shape**: his leg-injury means confessors come to him rather than the reverse, which has subtly reshaped the confession format at this station — shorter, more practical, less formally ritualized.

### Flood-path reading

**how_learned**: a decade of station observation; informal instruction from three marsh-clan elders who respected his medallion.

**cost_to_acquire**: accepted hospitality from those elders (see `private_appetite` and `repeated_forced_choice` — this is the paradigmatic case).

**teachers_institutions**: marsh-clan elders (three, named in his private ledger); no institutional affiliation.

**unusual_or_ordinary**: unusual for temple clergy; ordinary for marsh-clan natives.

**body_class_place_shape**: the scarred leg's chronic pain tunes him to minute water-level changes; his body is a barometer.

## Voice and Perception

**Preferred metaphors**: drawn from current / silt / snag / drift / ledger-balance / weight. Speaks of moral questions in hydraulic terms ("that decision's silted up," "the balance is drifting"). Avoids military metaphors despite marsh-clan fluency in them.

**Education level**: literate in formal temple register + vernacular ledger script.

**Rhythm of speech**: patient clauses followed by a hard verdict. A typical Maren sentence is three or four balanced hedges leading to one short declarative that settles the matter.

**Taboo words**: avoids saying "clean" about people (the word's ritual sense activates temple-law implications he does not want to trigger in casual conversation). Avoids saying "the big drink" in the presence of the archdeacon or any inland-temple visitor.

**What he notices first in a room**: the waterline marks on the walls; who is standing closest to the exit; hidden weight in cargo; who avoids eye contact with whom.

**What he overlooks**: elite symbolic disputes; distant theological nuance; fashion; anything the archdeacon would find important enough to correct by letter.

**Species / body perception effects**: the scarred leg makes current, mud-depth, and weight-distribution perpetually salient. He reads river surface continuously without noticing he is doing it.

**Oral / written split**: speech is indirect and evasive, built around hedged clauses. Records are unnervingly exact — every confessor named (except in sealed confession, which is recorded only by category), every toll-weight logged, every deviation flagged. The written register has a flat, unsentimental precision that surprises inland-temple visitors.

## Contradictions and Tensions

The central contradiction — *believes order prevents suffering but survives by tolerating selective lawbreaking* — is not a secret Maren keeps from himself. He holds it consciously, reviews it each night at the ledger, and has constructed a working theology around it: that the compromise is itself a form of order, and that true rigor at this station would produce more suffering than it prevents. The theology is privately coherent but professionally unsayable.

This tension connects to every other layer of his life. His institutional embedding is tripartite because no single authority can stabilize the station. His capabilities (ledger / confession / flood-reading) are drawn from all three authorities and belong fully to none. His forced-choice pattern (profit-vs-contamination) is a repeating instance of the central contradiction. His private shame (the drowning victim) is what taught him that abstention is not innocence — which is the experiential root of his working theology.

Rill is the pressure point. Maren's long-term desire (transfer inland, regain respectability) is entirely for her sake; he would remain at the station indefinitely otherwise. If she is endangered — by a smuggler family's overreach, by an inspector's scrutiny, by a flood — the central contradiction may collapse into either rigid orthodoxy or full complicity.

## Likely Story Hooks

- **Inspection week**: the quarterly inspection lands, and one of Maren's informal arrangements surfaces. He must choose between betraying a marsh-clan family or accepting exposure; his long-term desire and his forced-choice pattern pull opposite directions.
- **Relic hidden in grain barge**: a smuggler family uses Maren's station to move something ritually charged (a relic, a corpse, a forbidden text). He realizes only after the barge has passed.
- **Rill courted by a Voss smuggler son**: the Voss family has been his longest-running arrangement; their son is now courting Rill. Maren must confront whether his selective tolerance is generosity or grooming.
- **Flood-season sermon**: the archdeacon orders Maren to preach a hardline sermon on temple purity for the flood-season service. His congregation includes every smuggler he has quietly tolerated.
- **A drowning victim Maren could save**: the situation from his private shame recurs, years later, in a new form. This time he does not abstain — and the consequences ramify through his tripartite authority.

## Niche Analysis

### 7-layer Essence Trace

**World-Position layer**: Low chartered clergy at a South-Marsh frontier levy station, Year 412 After Flood. Scarred-leg, low physical mobility, human, late thirties, widowed with a dependent niece. Bound to the station by both charter and leg injury. Positioned at the intersection of three authorities (temple, crown, marsh-clan) without full belonging to any.

**Function layer**: Boundary broker + witness + archive carrier + compromised moral filter. Mediates daily negotiations between official law and lived marsh-clan economy. His function is NOT enforcement and NOT dissent — it is sustained translation.

**Pressure layer**: Tripartite institutional pressure (temple revenue expectation + crown tax scrutiny + marsh-clan kin obligation) + personal pressure (Rill's future, inspection approaching, flood season) + internal pressure (central contradiction, private shame).

**Access layer**: Hears confessions (both formal and informal); sees cargo manifests; knows flood paths; moves within the station and along 20km of riverbank; has read-access to the archdeacon's correspondence; has influence-access to the three marsh-clan elders who tutored him in flood-reading. Does NOT have access to: inland temple politics; crown military decisions; elite symbolic disputes.

**Epistemic layer**: Knows local corruption in depth; understands almost nothing of capital politics. Carries specific un-shareable knowledge (sealed confessions); carries specific share-but-mark-it knowledge (informal rumors). His body (scarred leg, literate hand) tunes him to some phenomena and away from others.

**Thematic layer**: Embodies the world's grim-compromise tonal contract at individual scale. His daily inhabitation of compromise is the theme — not rebellion, not purity, but sustained accommodation. Invites the false simplification "he is corrupt" that the narrative should resist.

**Voice layer**: Temple-formulae frayed by river-slang; hydraulic metaphor field; patient-clauses-hard-verdict rhythm; indirect speech, exact records. Distinct from the marsh-frontier's existing sermon-voice through its practical-ledger register.

### Occupancy-Strength Justification

The marsh-frontier religious zone currently has one dossier-level entry (CHAR-0004 Magistrate Vor, who is crown-authority, not temple) and one artifact-author (the DA-sermon-levy-season preacher, who is ritual-purity-voice only). Neither occupies the boundary-broker function or the practical-ledger register. The zone is therefore *adjacent* rather than *open* — a character is present, but not this combination of function + voice + access.

### Nearest Existing Occupants

**CHAR-0004 Magistrate Vor**: crown-authority regional magistrate with no river access. Overlap with Maren on: frontier setting, tripartite-authority context, moral-complexity register. Decisive differences: Vor has elite distance and state-backed enforcement power; Maren has low status, river-level mobility, and no enforcement authority. Vor operates on writs; Maren operates on relationships.

**DA-sermon-levy-season (unnamed artifact author)**: temple-traditionalist preacher, marsh-frontier posting. Overlap with Maren on: temple-traditionalist sect, marsh-frontier posting, formal register capability. Decisive differences: the sermon's author inhabits pure ritual-purity voice and speaks publicly; Maren's voice is hydraulic-compromised and speaks privately. They share a social stratum and an institutional charter but carry opposite rhetorical postures — which is exactly the pairing that makes the zone legible from two angles.

### Decisive Differences

- **Function layer**: boundary broker vs magistrate's enforcer / sermon-author's ritualist
- **Access layer**: hears confessions + reads cargo manifests + knows flood paths (tripartite access from a low-status position) vs magistrate's writ-based access / sermon-author's sanctuary-only access
- **Voice layer**: hydraulic metaphors + patient-clauses-hard-verdict rhythm + exact-records / indirect-speech split vs magistrate's legal register / sermon-author's ritual-purity register
- **Thematic layer**: sustained compromise as lived theology vs magistrate's institutional-duty theme / sermon-author's purity theme

## Canon Safety Check Trace

### Phase 10a (Invariants)

Tested INV-0001 (no supernatural efficacy without cost): Maren claims no supernatural efficacy; passes. Tested INV-0003 (literacy is elite-granted, not universal): Maren's literacy is temple-charter-granted via seminary schooling; passes. Tested INV-0007 (heroism is costly, not clean): Maren's moral position is explicitly compromised and the compromise is dramatized rather than laundered; passes tonally. No Phase 10e repair required.

### Phase 10b (Mystery Reserve Firewall)

MR-0001 (origin of the Marsh Courts): checked — no overlap with Maren's epistemic surface; he has folk-rumor about the origin-myths but no firsthand knowledge. MR-0002 (origin of the Flood): checked — Maren holds no view; clean. MR-0003 (true authorship of the Sacred-Letters corpus): checked — Maren's reading list excludes Sacred-Letters texts (they are inland-scholar-only); clean. No `disallowed cheap answers` item appears in `known_firsthand` or `wrongly_believes`.

### Phase 10c (Distribution Discipline)

CFs consulted: CF-0018 (local-chartered clergy may keep operational records at their station — supports Maren's ledger-keeping), CF-0022 (frontier tax stations operate under tripartite authority — supports the station's institutional layering), CF-0031 (confession practices in temple-traditionalist sects — supports formal confession-hearing). Tag: **canon-edge**. The leaning-point: Maren's use of informal confession for rumor flow among low-chartered clergy at frontier stations is plausible under CF-0018 (which permits operational-record discretion) but not explicitly attested as a recognized practice. If a future canon-addition run establishes that confession must be formally sealed across all chartered ranks, this card would need revision — but the current canon does not forbid the practice, so the card proceeds with canon-edge status and a recorded edge-assumption.

### Phase 10d (Batch-level Check — this card's contribution)

Non-duplication vs registry: passes (adjacent to CHAR-0004 and DA-sermon-levy-season, not duplicative of either). Pairwise non-duplication vs other NCB-0003 cards: passes (no other batch card occupies the marsh-frontier religious zone or the boundary-broker function). Joint-closure check: Maren's epistemic surface touches MR-0001 at the folk-rumor layer only; no other card in NCB-0003 approaches MR-0001 from a complementary angle. No joint-closure risk.

### Phase 10e Repairs Applied

None. The card passed Phase 10 clean.
