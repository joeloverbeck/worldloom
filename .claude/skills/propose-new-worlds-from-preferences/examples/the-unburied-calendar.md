# Example NWP Proposal Card — The Unburied Calendar
#
# Adapted from the source proposal's "NWP-0001 — The Unburied Calendar" example
# (brainstorming/propose-new-worlds-from-preferences.md §"Example Proposal Card Style").
# The source example was skeletal (selected sections only, prose-fragment register).
# This file expands it to the hybrid frontmatter + body format required by
# templates/proposal-card.md, faithfully preserving the source's semantic content
# and scaling each section into the Phase 10 schema. Sections not present in the
# source example were filled from the source's own design grammar (Mystery Reserve
# Seeds, Equilibrium, Risks, Critic-Pass Trace, Canon Safety Check Trace) without
# inventing semantic content beyond what the source's phase definitions imply.
#
# This file is illustrative — it shows the template applied. It is NOT a real
# proposal card and was not produced by an actual run of the skill.

---
# ===== identification =====

proposal_id: NWP-0001
batch_id: NWB-0001
slug: the-unburied-calendar
title: The Unburied Calendar
generated_date: 2026-04-28

# ===== core ontology =====

core_sentence: >
  Every year has corpses that belong to it, and if the dead are not buried
  in the correct year-soil before the season turns, the next year arrives deformed.

intended_canon_layer: hard_canon

# ===== niche metadata =====

niche_summary: >
  A civilization where time is agricultural, funerary, and political infrastructure.
  Calendrical continuity depends on correct burial ecology — institutions, professions,
  taboos, and crimes form around interpreting, scheduling, transporting, and falsifying
  the relationship between death dates, year-soil, and the safe arrival of the next
  season. The world wound is not death itself but the requirement that death be
  bureaucratically correct, and the chronotope is the seasonal threshold where
  miscounted dead deform what comes next.

occupancy_strength:
  current_state: open
  nearest_existing_worlds: []
  decisive_differences:
    - Death is treated as chronological infrastructure, not ghost economy
    - Calendar mechanics depend on burial soil, not astronomy or ritual time
    - Funeral practice carries civic risk (deformed years) rather than ancestral risk

distinctness_enforced: true
distinctness_check_skipped_reason: ""

# ===== preference fit =====

preference_fit:
  matched_patterns:
    - consequence_propagation
    - premise_specific_institutions
    - geography_as_law
    - death_as_infrastructure
    - bureaucratic_metaphysics
    - misrecognized_history
    - ordinary_life_under_impossible_conditions
    - native_story_procedures
  rejected_patterns_avoided:
    - generic_empire_vs_rebels
    - necromancy_as_magic_system
    - apocalypse_survival_setting
    - ghost_containment_world
  why_user_may_like_it: >
    The premise is one load-bearing impossible fact — calendrical continuity through
    burial — that propagates across labor, law, war, religion, architecture, kinship,
    medicine, and language without ever needing additional metaphysical machinery.
    Survival depends on a contested process (death certification + soil allocation +
    transport + interpretation), creating professions and crimes that could only
    exist here. The mystery reserve protects the question of cause vs prediction
    indefinitely, satisfying the user's preference for bounded unknowns over vague
    blanks.

# ===== scoring (Phase 9) =====

scores:
  preference_alignment: 5
  novelty: 5
  consequence_propagation: 5
  ordinary_life_reach: 5
  institution_generation: 5
  faction_generation: 4
  geography_as_law_strength: 4
  deep_history_pressure: 4
  mystery_reserve_quality: 5
  diegetic_artifact_potential: 5
  character_generation_potential: 4
  native_story_procedure_strength: 5
  tonal_aesthetic_specificity: 4
  redundancy_risk: 1
  pastiche_risk: 2
  overcomplexity: 2
  implementation_burden: 3
  thematic_mismatch: 1
  ethical_boundary_risk: 2
  mystery_flattening_risk: 2
  spectacle_without_society_risk: 1

score_aggregate: 46

# ===== domains touched =====

domains_affected:
  - law
  - religion
  - economy
  - warfare
  - kinship
  - medicine
  - taboo_and_pollution
  - settlement_life
  - memory_and_myth

# ===== mystery reserve seeds =====

mystery_reserve_seeds:
  active:
    - title: Some years demand more dead than occurred naturally
      status: active
      future_resolution_safety: medium
  passive:
    - title: Whether ancient calendars were once less corpse-dependent
      status: passive
      future_resolution_safety: low
  forbidden:
    - title: Whether years are causes of deaths or consequences of them
      status: forbidden
      future_resolution_safety: none

# ===== Canon Safety Check audit trail =====

canon_safety_check:
  cross_world_mr_firewall:
    checked: []                              # empty in this illustrative example;
                                             # a real run would list every checked M-id per existing world
    skipped: false
    skipped_reason: ""
    overlap_findings: []
  forbidden_mystery_presence:
    has_forbidden_mystery: true
    forbidden_count: 1
  notes: "Example file — firewall checks not actually run."

# ===== critic pass audit trail =====

critic_pass_trace:
  phase_1_preference_extractor: "Preference patterns aligned: death-as-infrastructure, bureaucratic metaphysics, ordinary life under impossible conditions."
  phase_2_narrative_theory: "Chronotope-as-law passes possible-world plurality test; novum is operationally clear."
  phase_4_niche_diversity: "Open niche; no existing world treats time as burial-dependent."
  phase_6_ontology_architect: "Impossible fact is one sentence, unambiguous, propagates without additional metaphysical machinery."
  phase_7_propagation_systems: "Three orders of consequence achieved: civic shadow → insurer pricing → ruling-house falsification."
  phase_7_geography_ecology: "Year-soil consecration ties geography to calendar; concrete and mappable."
  phase_7_institutions_economy: "Calendar Office + Gravewright Guild + Black Almanac Market form a coherent power triangle."
  phase_8_anti_pastiche: "No surface resemblance to ghost-containment, necromancy, or apocalypse-survival worlds."
  phase_9_theme_tone: "Tone of bureaucratic dread + agricultural intimacy is specific and not generic gothic."
  phase_9_mystery_curator: "Cause-vs-prediction question protected as forbidden mystery; resolution safety: none."
  phase_10_everyday_life: "Children taste soil; lovers exchange year-clay; insults are 'badly dated' — premise reaches breakfast and gossip."
  phase_10_body_personhood: "Dead-as-infrastructure raises body politics for both corpses and burial workers."
  phase_10_diegetic_artifact: "Calendar Office audits, gravewright manuals, black almanacs, hearth-binder ledgers, mercy-truce treaties, rot-patrol reports — six artifact classes natural to the world."
  phase_10_create_base_world_readiness: "Body sections parse as freeform brief; create-base-world Phase 0 can extract genre/tone/primary-difference/pressures directly."
  phase_11_mystery_curator: "Forbidden mystery present and well-bounded; cross-world firewall not exercised in this illustrative example."

# ===== source basis =====

source_basis:
  preference_path: "briefs/preferred-worldbuilding.md"
  parameters_path: ""
  derived_from_seed_id: "WSEED-007"
  user_approved: true

# ===== recommended next step =====

recommended_next_step: route_to_create_base_world
notes: ""
---

# The Unburied Calendar

## Core Sentence

Every year has corpses that belong to it, and if the dead are not buried in the correct year-soil before the season turns, the next year arrives deformed.

## World Niche Summary

A civilization where time is agricultural, funerary, and political infrastructure. The premise is not necromancy, ghost containment, or apocalypse survival; it is calendrical continuity through correct burial ecology. Civic survival depends on enough consecrated year-soil, trained burial mathematicians, corpse transport, seasonal war truces, and truthful death records to keep time coherent. Stories arise from the gap between what the calendar requires and what civic actors can deliver.

## Why This Niche Is Open

Existing worlds (in cross-world essence map) treat death through ghost economy, ancestor worship, or undead politics. None treat time itself as burial-dependent — the load-bearing mechanism here. The proposal occupies a vacancy that combines bureaucratic metaphysics with seasonal-threshold chronotope, neither of which appears as a primary axis in occupied niches.

## Genre Contract

Bureaucratic-magic fantasy with funerary horror in the seams. Stories revolve around audits, smuggling, falsified records, civic coverups, and pilgrimages to recover missing year-soil. Politics is calendrical; war is interrupted by corpse-return weeks; class is measured in burial allocation.

## Tone Contract

The world smells of consecrated soil and lamp-oil archives. Institutions look like windowless audit halls and walled orchards. People fear saying aloud that a year was deformed. Humor survives as bureaucratic gallows-wit. Beauty is available in the ritual cleanness of correctly-buried dead. Ugliness is normalized in the rot-patrols' battlefield work. The world breaks if necromancy is introduced, if a god-machine is shown to explain the entire system, or if any character can casually undo a missed burial.

## Primary Difference

Calendrical continuity depends on correct burial ecology. A year does not turn cleanly if its dead are unburied or buried in the wrong year-soil. The deformation of the next year manifests through agricultural failure, weather distortion, child malformation, infrastructure collapse, and political illegitimacy, in escalating order with the count of mis-buried dead.

## Core Contradiction

The dead must be honored as persons, but civic survival requires treating them as chronological machinery. Funerals are simultaneously ritual mourning AND public-works engineering, and any society that resolves the contradiction in either direction collapses (full personhood = year deformation; full machinery = social revolution).

## Survival Constraint

Cities need enough consecrated year-soil, trained burial mathematicians, corpse transport, seasonal war truces, and truthful death records to keep time coherent. The constraint is administrative, not magical: forge a death date and the year still deforms; lose burial soil to flood and the next season arrives with infant malformations.

## Chronotope

Seasonal threshold world. The most dangerous direction is not north or down, but across the year's edge with the wrong dead unburied. Time rhythm: governed by the corpse-return weeks before season turns. Visible historical layers: each district keeps a "deformed-year" map showing which seasons came in wrong and what they cost.

## Geography as Law

Year-soil is regional. Cities cannot bury their dead in another city's soil without disaster, which makes corpse-transport routes load-bearing and chokepoints politically valuable. Frontiers exist where year-soil consecration has lapsed; reconquest there is funerary first, military second.

## Resource / Infrastructure Spine

Consecrated year-soil. Civilization burns wood, eats grain, mints coin — but it processes corpses. Soil consecration takes years; mishandling renders soil dead-neutral; war and plague exhaust soil reserves; smugglers move year-clay in barrels through customs.

## Deep History and Misrecognition

- **Old event**: An undocumented dynasty around a thousand years ago either invented the burial-calendar discipline or revealed it. Records are incomplete and contradictory.
- **Official explanation**: The first king received the burial calendar from the Last Orchard god as covenant.
- **Folk explanation**: A starving widow's daughter discovered, buried correctly, that her grandmother's year had not yet turned.
- **Specialist theory**: The discipline was reverse-engineered from an older catastrophe whose unburied dead deformed the world for two generations.
- **Suppressed truth**: Some calendar offices may know the discipline is a containment of a deformation already underway, not a covenant.
- **Surviving evidence**: Old foundation rituals, anomalous orchard records, fragmentary almanacs in heretical script.
- **Faction that benefits from misunderstanding**: The Last Orchard Temples, whose covenant theology depends on the official explanation.

## Institutions Born From the Premise

- **Official — The Calendar Office**: audits deaths, soil allotments, year-boundary risk; legitimacy from imperial / civic charter; recruitment by examination; internal contradiction is between mathematical truth and political pressure.
- **Religious / Ideological — The Last Orchard Temples**: teach that years are grown from the rightly buried; legitimacy from covenant theology; recruitment from orphan-novitiates raised in walled orchards; internal contradiction between covenant and the suppressed-truth specialists' view.
- **Criminal / Black-Market — The Black Almanac Market**: sells forged death dates and smuggled year-soil; legitimacy from civic dependence on flexibility; recruitment through artisan apprenticeships; internal contradiction is that successful forgery still deforms years.
- **Technical / Scientific / Medical — The Gravewright Guild**: engineers burials by age, cause, oath-status, and district; legitimacy from technical exam tradition; recruitment by guild apprenticeship; internal contradiction between mathematical correctness and customer mercy requests.
- **Military / Policing — The Rot Patrol**: hunts unregistered plague pits and battlefield hoards; legitimacy from emergency civic warrant; recruitment from former battlefield retrievers; internal contradiction between thoroughness and political non-disclosure.
- **Commercial — Corpse-Transport Houses**: move dead across regions with bonded couriers; legitimacy from licensure; recruitment from inland-river-folk and steppe-cart families; internal contradiction between schedule fidelity and ritual cleanliness.
- **Folk / Local — The Hearth-Binders**: village women who maintain household dead-ledgers; legitimacy from kinship custom; recruitment by mother-to-daughter inheritance; internal contradiction between family discretion and civic auditability.

## Professions Born From the Premise

Burial mathematicians, year-soil surveyors, mercy-truce envoys, almanac forgers, lamp-black brokers, district shadow auditors, dead-ledger scribes, corpse couriers, exhumation arbiters, deformity-year archivists.

## Factions as Civic Hypotheses

- **The Orchard Orthodoxy** — covenant theology; aesthetic of walled orchards and white linen; social base in religious peasantry; resource base in temple endowments; enemy: heretical-map cartels; internal contradiction: depends on a possibly-false history; distorted history: covenant origin; ordinary day: orchard work + scripture.
- **The Calendrical Reformers** — propose smaller civic year-units to reduce burial risk; aesthetic of audit halls and ledger-bound capes; social base in literate civil servants; resource base in administrative fees; enemy: Orchard Orthodoxy; internal contradiction: smaller years multiply the burial schedule; distorted history: portray current calendar as tyrannical innovation; ordinary day: ledgering and lobbying.
- **The Hearth Confederation** — village hearth-binders who claim local dead are local; aesthetic of beaded ledger-cords; social base in matrilineal villages; resource base in land tenure; enemy: imperial Calendar Office; internal contradiction: their discretion enables civic falsification; distorted history: village-first origin myth; ordinary day: maintaining household dead-ledgers.
- **The Unburied Reckoners** — anti-burial heretics who claim year-deformation is the correction; aesthetic of unconsecrated wool and plain ground; social base in millennial peasants; resource base in stolen year-clay; enemy: civic order itself; internal contradiction: their experiments hurt the same villagers they recruit from; distorted history: deny ancient catastrophe entirely; ordinary day: clandestine ritual and slow proselytization.

## Ordinary-Life Proof

- **Food**: orchard fruit from year-soil orchards is graded by burial-fidelity score; off-grade fruit is feed for transport-house mules.
- **Housing**: thresholds are painted with pale clay before births to ward shadow-debt; rented rooms post corpse-storage rates.
- **Clothing**: mourning clothes encode the year of death in dye and stitch; wearing the wrong year's mourning is forgery.
- **Childhood**: children learn their birth year by tasting soil in ritual; "badly-dated" is a schoolyard insult.
- **Courtship**: lovers exchange year-clay in marriage rite, instead of metal rings.
- **Medicine**: physicians distinguish death-of-year from death-of-day on charts; midwives carry year-soil amulets.
- **Law**: inheritance disputes turn on forged death dates as often as on forged signatures.
- **Work**: corpse couriers are licensed; falsifying transport manifests is a hanging offense.
- **Mourning**: funerals are scheduled at dawn to minimize shadow debt; war truces are negotiated around corpse-return weeks.
- **Language**: insults accuse someone of being "badly dated"; toasts wish "a clean turning"; legal letters open with the formula "in the consecrated soil of [year]."

## Body and Personhood Consequences

The dead are persons until burial allocation is set; afterward they are persons-as-infrastructure, an unresolved status that lawyers exploit. Burial workers carry social pollution that limits marriage prospects. Children born in deformed years are watched for malformation and may be placed under temple wardship. The dying often instruct kin on burial allocation as a final administrative act, sometimes to spite enemies.

## Local Documents and Artifact Potential

- Calendar Office audit reports
- Gravewright Guild burial-mathematics manuals
- Last Orchard Temple liturgies and orchard registers
- Black Almanac Market forged death-date catalogues
- Hearth-Binder household ledgers (matrilineal, oral-to-written)
- Mercy Truce Court treaty texts
- Rot Patrol incident logs and unregistered-pit maps
- Year-deformity broadsheets (popular press)
- Children's rhymes about burial timing
- Heretical "the deformation is correction" tracts (Unburied Reckoners)

## Native Story Procedures

- Burial audit (suspecting falsification)
- Corpse-smuggling heist (across regional year-soil borders)
- Plague-year coverup (Rot Patrol vs Calendar Office)
- Battlefield retrieval expedition (post-war truce period)
- Inheritance trial over a forged death date
- Pilgrimage to find missing year-soil (after flood or war)
- Mercy Truce negotiation (war suspended for corpse return)
- Deformity-year archive break-in (suppressed records)
- Heretical experiment exposure (Unburied Reckoner cell)

## Natural Story Engines

- Audits exposing decades-old falsifications
- Corpse-shipment delays creating cascading civic crises
- War's collision with corpse-return weeks
- Hearth Confederation/Calendar Office jurisdictional fights
- Suppressed-truth specialists exposed as heretics
- Black Almanac forgery rings extending into noble households

## Mystery Reserve Seeds

- **Active mystery (≥1)**: Why some years demand more dead than occurred naturally. — `future_resolution_safety: medium` (the world can survive a partial answer about local correlations, but never a full mechanism).
- **Passive depth (≥1)**: Whether ancient calendars were once less corpse-dependent. — `future_resolution_safety: low` (touched by archaeologists, scholars; cannot be cleanly resolved without dropping civilization-defining stakes).
- **Forbidden mystery (≥1)**: Whether years are causes of deaths or consequences of them — i.e., whether the calendar predicts mortality or compels it. — `future_resolution_safety: none` (resolving this collapses the world's moral structure; the world must never reveal a simple god-machine that explains the entire system).

## Equilibrium Explanation

The world has not optimized away its premise because: (a) consecrating year-soil takes generations; (b) burial mathematics is a guild secret; (c) the official theology depends on the suppressed truth NOT being widely known; (d) corpse transport is geographically constrained by river and pass; (e) every civic faction benefits from a different distortion of the underlying mechanism; (f) the forbidden mystery cannot be tested without civilization-scale risk. The bottlenecks are administrative, theological, infrastructural, and epistemic simultaneously.

## Preference Fit

This world honors the user's preferences for consequence propagation, premise-specific institutions, geography-as-law, deep history as gravity, contested documentation, and bureaucratic metaphysics. It avoids the user's rejected shapes (generic empire-vs-rebels, decorative magic, neutral lore encyclopedias). The everyday-life propagation reaches breakfast, lullabies, courtship, and gossip — satisfying the preference for ordinary-life under impossible conditions.

## Distinctness From Existing Worlds

(Standard Path: this section would name the nearest existing world niches and decisive differences. In this illustrative example, the cross-world essence map is empty, so the section reads:)

The cross-world essence map is empty for this illustrative example. A real run would name nearest existing world niches and decisive differences here, alongside the Phase 8 weighted score and human-readable explanation.

## Risks and Repairs

- **Pastiche risk**: surface resemblance to gothic-bureaucracy fiction (Pratchett's Death subplots, etc.). → Repair: maintain agricultural-civic register, never lean into psychopomp or named Death-figures.
- **Overcomplexity risk**: 7+ institutions with overlapping jurisdiction can confuse readers. → Repair: introduce institutions in story-relevant order; never assume a reader holds all seven simultaneously.
- **Tone risk**: the bureaucratic-funerary register can drift to comic absurdism or to grimdark misery. → Repair: protect the agricultural-intimacy moments (orchards, lullabies, lovers' year-clay) as the world's emotional ballast.
- **Implementation burden**: the calendar mechanics + soil consecration system + transport network needs careful first-canon design. → Repair: in `create-base-world`, treat year-soil consecration timing as the load-bearing CF-0001 and let everything else derive from it.

## Canon Safety Check Trace

- **11a Cross-World MR Firewall**: not exercised in this illustrative example (no existing worlds enumerated). A real run would list every checked M-id per existing world; overlap findings would be reported with structural distinctness rationale.
- **11b Forbidden-Mystery Presence**: 1 forbidden mystery declared (cause-vs-prediction); resolution-safety coupling verified (`future_resolution_safety: none` per FOUNDATIONS resolution-safety semantics).
- **11c Batch Mutual Distinctness**: not exercised in this single-card illustrative example.
- **11d Batch World-Grammar Fidelity**: this card represents the `bureaucratic_metaphysics` + `death_as_infrastructure` + `geography_as_law` clusters from the user's design grammar.

## Required World Updates (forward-looking)

When `create-base-world` ingests this proposal, it will need to compose:

- WORLD_KERNEL.md (genre contract, tone, chronotope, primary difference, core pressures, story engines)
- ONTOLOGY.md (categories: institution, ritual, taboo, artifact, ecological system, bodily condition, metaphysical rule)
- CF-0001 — primary-difference fact: "Calendrical continuity depends on correct burial ecology"
- CH-0001 — genesis change-log entry
- Invariants: ontological (years deform if dead unburied), causal (consecration takes generations), distribution (year-soil is regional), social (burial workers carry pollution), aesthetic_thematic (the world remains low-magic in lived experience)
- Mystery seeds: cause-vs-prediction (forbidden), some-years-demand-more (active), ancient-less-dependent-calendars (passive)
- Initial sections: GEO (year-soil regions), PAS (burial-pollution caste structure), INS (Calendar Office + Last Orchard Temples + Gravewright Guild), ECR (year-soil + corpse-transport economy), MTS (burial mathematics as proto-magic-system), ELF (children's soil-tasting + lovers' year-clay), TML (the Unburied Dynasty era + the deformed-year archive)

This list is forward-looking guidance for create-base-world, not a backward-looking record of mutations this skill performed.
