# NWP Proposal Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the
# propose-new-worlds-from-preferences skill as a single candidate world proposal.
#
# CANON POSTURE: This file is NOT a world. It is NOT canon. The frontmatter
# carries audit-trail metadata; the body is freeform markdown directly
# consumable as create-base-world's `premise_path` argument. create-base-world
# will then produce the actual atomic-source world bundle at worlds/<world-slug>/.
# This card is pre-world archival input, not the world itself.
#
# source_basis.user_approved=true means the card was reviewed and kept in the
# batch at Phase 14 HARD-GATE — it does NOT mean the world has been created.
# World realization happens only when create-base-world accepts this card's
# path in a separate run.
#
# DOWNSTREAM CONTRACT: create-base-world's Phase 0 (Normalize Premise) reads
# the body as freeform markdown. The body sections below match what
# create-base-world's parser expects to find. If create-base-world's Phase 0
# acquires a structured-input mode in the future, this template's body section
# shape may need a parallel update.
#
# Required fields and body sections must not be left as TODO or empty
# (enforced by Phase 12 Test 17, Create-Base-World Readiness).

---
# ===== identification =====

proposal_id: NWP-0000                        # monotonic, pipeline-scoped (not world-scoped)
batch_id: NWB-0000                           # the batch this card was emitted in
slug: ""                                     # kebab-case; thematic-name first
title: ""                                    # short evocative human label
generated_date: ""                           # ISO date

# ===== core ontology =====

core_sentence: >
  The shortest accurate statement of what makes the world impossible.
  One concrete impossible sentence — not a genre, not an aesthetic, not a vibe.

intended_canon_layer: hard_canon             # hard_canon (default — primary-difference facts almost always
                                             # land here for create-base-world's CF-0001 lift).
                                             # FOUNDATIONS §Canon Layers enumerates five layers
                                             # (hard_canon | derived_canon | soft_canon | contested_canon |
                                             # mystery_reserve); a primary-difference proposal targeting any of the
                                             # other four (e.g., a world built around a contested-canon central
                                             # truth, or a mystery_reserve-as-foundation premise) MAY use the
                                             # corresponding label, with the card body's Distinctness section
                                             # explaining why the non-default layer is correct for this premise.

# ===== niche metadata =====

niche_summary: >
  One- to two-paragraph prose summary of the niche this proposal occupies in
  unoccupied possibility space. Names the world wound, the survival pressure,
  the chronotope category, and what stories this world produces that cannot
  happen elsewhere.

occupancy_strength:
  current_state: open                        # open | adjacent | crowded | hard_duplicate
                                             # (hard_duplicate should have been filtered at Phase 8;
                                             #  if present here, see notes)
  nearest_existing_worlds: []                # list of world_slugs from the cross-world essence map;
                                             # empty under Empty Worlds Path
  decisive_differences: []                   # what makes THIS proposal distinct from the nearest worlds

distinctness_enforced: true                  # false under Empty Worlds Path
distinctness_check_skipped_reason: ""        # populated only when distinctness_enforced=false

# ===== preference fit =====

preference_fit:
  matched_patterns: []                       # list of preference essence patterns this card honors
  rejected_patterns_avoided: []              # list of preference essence rejected_shapes this card does NOT echo
  why_user_may_like_it: >
    One paragraph naming the load-bearing reasons this card aligns with the
    user's worldbuilding preference document.

# ===== scoring (Phase 9) =====

scores:                                      # each 1-5 per Phase 9 rubric
                                             # canon_burden, overlap_risk, and other negative axes are LOWER-is-better
  preference_alignment: 0
  novelty: 0
  consequence_propagation: 0
  ordinary_life_reach: 0
  institution_generation: 0
  faction_generation: 0
  geography_as_law_strength: 0
  deep_history_pressure: 0
  mystery_reserve_quality: 0
  diegetic_artifact_potential: 0
  character_generation_potential: 0
  native_story_procedure_strength: 0
  tonal_aesthetic_specificity: 0
  redundancy_risk: 0                         # LOWER is better
  pastiche_risk: 0                           # LOWER is better
  overcomplexity: 0                          # LOWER is better
  implementation_burden: 0                   # LOWER is better (1=light; 5=very heavy)
  thematic_mismatch: 0                       # LOWER is better
  ethical_boundary_risk: 0                   # LOWER is better
  mystery_flattening_risk: 0                 # LOWER is better
  spectacle_without_society_risk: 0          # LOWER is better

score_aggregate: 0                           # sum(positive 13) − sum(negative 8)

# ===== domains touched =====

domains_affected: []                         # canonical domain enum from get_canonical_vocabulary({class:"domain"})
                                             # used to verify Test 16 Canonical Vocabulary Conformance

# ===== mystery reserve seeds (Phase 10 → Phase 11b) =====

mystery_reserve_seeds:
  active: []                                 # list of {title, status: active, future_resolution_safety: low|medium|high}
  passive: []                                # list of {title, status: passive, future_resolution_safety: low|medium|high}
  forbidden: []                              # MANDATORY at least one — list of {title, status: forbidden, future_resolution_safety: none}
                                             # Phase 11b verifies presence + safety coupling
                                             # forbidden mysteries' `unknowns` must be world-internal,
                                             # never lifted from any existing world's M record

# ===== Canon Safety Check audit trail (Phase 11) =====

canon_safety_check:
  cross_world_mr_firewall:
    checked: []                              # list of "<world_slug>/<M-id>" strings (e.g., "animalia/M-5") —
                                             # every existing world's forbidden M-id checked at Phase 11a.
                                             # The world_slug prefix is mandatory — bare "M-N" is ambiguous once
                                             # multiple worlds exist. Empty list ONLY when skipped=true (Empty
                                             # Worlds Path); a non-empty cross-world map with an empty checked[]
                                             # is internally inconsistent and fails Phase 11b verification.
    skipped: false                           # true under Empty Worlds Path
    skipped_reason: ""                       # populated when skipped=true
    overlap_findings: []                     # list of {world_slug, m_id, overlap_kind, repair_action}
  forbidden_mystery_presence:
    has_forbidden_mystery: false             # MUST be true after Phase 11b
    forbidden_count: 0
  notes: ""                                  # one-line free notes on the safety check

# ===== critic pass audit trail (Mandatory LLM Roles, fused inline) =====

critic_pass_trace:
  phase_1_preference_extractor: ""
  phase_2_narrative_theory: ""
  phase_4_niche_diversity: ""
  phase_6_ontology_architect: ""
  phase_7_propagation_systems: ""
  phase_7_geography_ecology: ""
  phase_7_institutions_economy: ""
  phase_8_anti_pastiche: ""
  phase_9_theme_tone: ""
  phase_9_mystery_curator: ""
  phase_10_everyday_life: ""
  phase_10_body_personhood: ""
  phase_10_diegetic_artifact: ""
  phase_10_create_base_world_readiness: ""
  phase_11_mystery_curator: ""

# ===== source basis =====

source_basis:
  preference_path: ""                        # path provided to the skill
  parameters_path: ""                        # path provided to the skill (or "" if interview)
  derived_from_seed_id: ""                   # internal seed-pool id (Phase 5)
  user_approved: false                       # set to true at Phase 14 HARD-GATE just before write;
                                             # means "kept in batch after review", NOT "world has been created"

# ===== recommended next step =====

recommended_next_step: route_to_create_base_world
                                             # route_to_create_base_world | reserved_for_future_batch | seed_for_other_pipeline
notes: ""                                    # free notes; Phase 11e repairs land here
---

# {{title}}

## Core Sentence

{{core_sentence}}

## World Niche Summary

{{niche_summary}}

## Why This Niche Is Open

Explain how this proposal avoids repeating any existing world's hard-occupied niche (Phase 4 vacancy diagnosis output). Under Empty Worlds Path, state explicitly: "No existing worlds — niche is open by default; distinctness unenforced."

## Genre Contract

What kind of stories the world promises. Concrete, not adjective-only.

## Tone Contract

Emotional and aesthetic identity. Specify what the world smells like, what institutions look like, what people fear saying aloud, what humor survives, what beauty is available, what ugliness is normalized, what cannot happen without breaking the world.

## Primary Difference

The concrete operational impossible fact, restated more fully than the core sentence. Avoid metaphor unless the metaphor IS the mechanism.

## Core Contradiction

The unresolved moral/systemic paradox that keeps the world narratively alive.

## Survival Constraint

What this fact makes scarce, dangerous, unstable, forbidden, or administratively necessary.

## Chronotope

The world's lived time-space structure. Specify what direction matters, what distance means, what travel costs, what historical layers remain visible, what time rhythm governs life, what places make certain events inevitable, what genre of encounter the time-space naturally produces.

## Geography as Law

How space enforces the premise — at what scale and through what mechanisms.

## Resource / Infrastructure Spine

What civilization processes, extracts, burns, preserves, feeds on, hides, or fails to authenticate.

## Deep History and Misrecognition

- **Old event**: ...
- **Official explanation**: ...
- **Folk explanation**: ...
- **Specialist theory**: ...
- **Suppressed truth**: ...
- **Surviving evidence**: ...
- **Faction that benefits from misunderstanding**: ...

## Institutions Born From the Premise

At least seven across the seven functional categories:

- **Official**: ...
- **Religious / Ideological**: ...
- **Criminal / Black-Market**: ...
- **Technical / Scientific / Medical**: ...
- **Military / Policing**: ...
- **Commercial**: ...
- **Folk / Local**: ...

For each, name material base, legitimacy source, enforcement method, recruitment path, internal contradiction, and relationship to the core world wound.

## Professions Born From the Premise

Jobs that sound absurd outside this world but ordinary inside it. Provide ≥8.

## Factions as Civic Hypotheses

At least four factions. Each represents an answer to: *given this world, what should civilization become?* For each:

- ideology
- aesthetic
- social base
- resource base
- enemy
- internal contradiction
- distorted history
- ordinary member's daily life

## Ordinary-Life Proof

At least ten consequences across the ten domains:

- **Food**: ...
- **Housing**: ...
- **Clothing**: ...
- **Childhood**: ...
- **Courtship**: ...
- **Medicine**: ...
- **Law**: ...
- **Work**: ...
- **Mourning**: ...
- **Language**: ...

## Body and Personhood Consequences

Whose bodies are changed by the premise? Who is feared, exploited, needed, legally unstable? What happens to children? What happens to the dead?

## Local Documents and Artifact Potential

List likely diegetic artifact classes the world naturally produces: law codes, field manuals, prayers, smuggling songs, court records, medical charts, children's rhymes, heretical maps, repair logs, propaganda broadsheets. Each artifact class names the institution or actor that produces it and the bias the artifact carries.

## Native Story Procedures

What does one *do* in this world to reveal it? Investigation, heist, expedition, descent, audit, trial, forbidden crossing, emergency response, pilgrimage, relic appraisal, ecological investigation, institutional coverup. Procedures should be only-possible-here, not generic.

## Natural Story Engines

What repeatedly creates conflict in this world?

## Mystery Reserve Seeds

- **Active mystery (≥1)**: ... — `future_resolution_safety: low|medium|high`
- **Passive depth (≥1)**: ... — `future_resolution_safety: low|medium|high`
- **Forbidden mystery (≥1, MANDATORY)**: ... — `future_resolution_safety: none`

The forbidden mystery's `unknowns` must be world-internal, NEVER lifted from any existing world's M record (Phase 11a cross-world firewall enforces).

## Equilibrium Explanation

Why has the world not already optimized away its premise? Use bottlenecks: rarity, secrecy, taboo, high failure cost, monopoly, unreliable knowledge, geography, politics, material limits, hard-to-transport resource, social dependence on the false explanation.

## Preference Fit

Explain which user preference patterns this satisfies. Cross-reference Phase 1 dominant_patterns and Phase 2 favored_* clusters from the batch manifest.

## Distinctness From Existing Worlds

(Skipped under Empty Worlds Path — replace this section with: "DISTINCTNESS UNENFORCED — no existing worlds to compare against. The user accepted this gap at Phase 14.")

Under Standard Path, name the nearest existing world niches and the decisive differences for each. Provide a human-readable explanation alongside the Phase 8 weighted score.

## Risks and Repairs

- **Pastiche risk**: ... → repair: ...
- **Overcomplexity risk**: ... → repair: ...
- **Tone risk**: ... → repair: ...
- **Implementation burden**: ... → repair: ...

## Canon Safety Check Trace

Phase 11 audit trail surfaced for human review:

- **11a Cross-World MR Firewall**: checked vs `<list of M-ids per existing world>`; overlap findings: `<none | <list>>`. Skipped if Empty Worlds Path with reason.
- **11b Forbidden-Mystery Presence**: `<count>` forbidden mysteries declared; resolution-safety coupling verified.
- **11c Batch Mutual Distinctness** (intra-batch): position in score matrix vs other finalists.
- **11d Batch World-Grammar Fidelity**: which preference cluster this card represents.

## Required World Updates (forward-looking)

When `create-base-world` ingests this proposal, it will need to compose:

- WORLD_KERNEL.md
- ONTOLOGY.md
- CF-0001 (the primary-difference fact)
- CH-0001 (genesis change-log entry)
- ≥1 invariant per category (ontological / causal / distribution / social / aesthetic_thematic)
- ≥1 mystery seed per status (active / passive / forbidden)
- One initial section per prose concern (GEO / PAS / INS / ECR / MTS / ELF / TML)

This list is **forward-looking guidance for create-base-world**, not a backward-looking record of mutations this skill performed. This skill performs no canon mutations.
