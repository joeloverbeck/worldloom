# NCP Proposal Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the propose-new-characters
# skill as a single candidate character proposal.
#
# CANON POSTURE: This file is NOT a character. It is NOT canon. The frontmatter
# is structured so this card's path is directly consumable as character-generation's
# character_brief_path argument; character-generation will then produce the actual
# dossier at worlds/<world-slug>/characters/<char-slug>.md. This card is archival
# input, not the character itself.
#
# source_basis.user_approved=true means the card was reviewed and kept in the
# batch at Phase 16 HARD-GATE — it does NOT mean the character has been accepted
# or generated. Character realization happens only when character-generation
# accepts this card's path in a separate run.
#
# DOWNSTREAM CONTRACT: The frontmatter's first block (character-generation
# compatibility fields) MUST mirror character-generation's character_brief_path
# expected fields byte-for-byte. If character-generation's Phase 0 input schema
# changes, this template's first-block fields MUST be updated in lockstep.
# The Option-A design depends on this structural-parity contract.
#
# Required fields must not be left as TODO or empty (enforced by Phase 15 Test 8).

---
# ===== character-generation compatibility block (first, so Phase 0 parses quickly) =====
# These fields mirror character-generation's character_brief_path expected shape.
# Do NOT rename or reorder without updating character-generation's Phase 0 parser.

current_location: ""                         # bound to a GEOGRAPHY.md region or settlement
place_of_origin: ""                          # bound to a GEOGRAPHY.md region or settlement; follow character-generation's two-part test when origin is silent
date: ""                                     # in-world date per TIMELINE.md / chronotope
species: ""                                  # bound to a PEOPLES_AND_SPECIES.md cluster
age_band: ""                                 # plausible for species lifespan
social_position: ""                          # bound to an INSTITUTIONS.md stratum
profession: ""                               # bound to an INSTITUTIONS.md / ECONOMY_AND_RESOURCES.md trade
kinship_situation: ""                        # per INSTITUTIONS.md kinship logic + EVERYDAY_LIFE.md norms
religious_ideological_environment: ""        # bound to an institution, cult, or folk practice
major_local_pressures: []                    # cross-ref GEOGRAPHY / ECONOMY / INSTITUTIONS / TIMELINE
intended_narrative_role: ""                  # protagonist / witness / antagonist / foil / narrator / background

# Optional inputs character-generation recognizes
central_contradiction: ""                    # the internal tension most likely to drive the character's story
desired_emotional_tone: ""                   # optional authorial steer
desired_arc_type: ""                         # optional authorial steer
taboo_limit_themes: []                       # themes character-generation should avoid deepening

# ===== NCP-specific identification =====

proposal_id: NCP-0000                        # monotonic per-world
batch_id: NCB-0000                           # the batch this card was emitted in
slug: ""                                     # kebab-case; personal-name-first per character-generation convention
title: ""                                    # short human label

# ===== NCP-specific proposal metadata =====

niche_summary: >
  One- to two-paragraph prose summary of the niche this character fills
  in the story-world character web. Names the world window opened, the
  pressure engine, the voice family, and the artifact-authorship potential.

occupancy_strength:
  current_state: open                        # open | adjacent | crowded | filled
  nearest_existing_occupants: []             # list of CHAR-ids, artifact-author names, or PA-ids from the Person Registry
  overlap_type: ""                           # none | adjacent | crowded | hard_duplicate (hard_duplicate should have been filtered at Phase 4 or Phase 10d; if present here, see notes)
  decisive_differences: []                   # what makes THIS proposal distinct from the nearest occupants

depth_class: elastic                         # emblematic | elastic | round_load_bearing
proposal_family: ""                          # one of the 16 families from Phase 6
diagnosis_target: ""                         # which Phase 5 probe this seed addresses

# ===== scoring (Phase 11) =====

scores:                                      # each 1-5 per Phase 11 rubric; canon_burden and overlap_risk are LOWER-is-better
  world_rootedness: 0
  niche_distinctiveness: 0
  pressure_richness: 0
  voice_distinctiveness: 0
  ordinary_life_relevance: 0
  artifact_utility: 0
  thematic_freshness: 0
  expansion_potential: 0
  canon_burden: 0                            # LOWER is better (5 = requires massive new canon)
  overlap_risk: 0                            # LOWER is better

score_aggregate: 0                           # (world_rootedness + niche_distinctiveness + pressure_richness
                                             #  + voice_distinctiveness + ordinary_life_relevance + artifact_utility
                                             #  + thematic_freshness + expansion_potential)
                                             # − (canon_burden + overlap_risk)
                                             # Range: [-10, +40]

# ===== canon routing (Phase 10c output) =====

canon_assumption_flags:
  status: canon-safe                         # canon-safe | canon-edge | canon-requiring
  edge_assumptions: []                       # populated when status=canon-edge; each entry names the leaning-point
  implied_new_facts: []                      # populated when status=canon-requiring; each entry is:
                                             # { fact: "...", preferred_route: direct_to_canon_addition | first_through_propose_new_canon_facts }

recommended_next_step: generate_immediately  # generate_immediately | reserved_future_seed | generate_after_canon_adjudication

# ===== critic pass audit trail (Mandatory LLM Roles) =====

critic_pass_trace:
  phase_1_continuity_archivist: ""           # one-line note on what the Archivist flagged at registry-build
  phase_2_essence_extractor: ""              # one-line note on the seed's essence-profile derivation
  phase_3_constellation_mosaic: ""           # one-line note on constellation/mosaic placement
  phase_5_institutional_everyday: ""         # one-line note on negative-space diagnosis for this seed
  phase_8_epistemic_focalization: ""         # one-line note on epistemic/perceptual filter check
  phase_9_voice_critic: ""                   # one-line note on voice signature (incl. 5 voice tests)
  phase_9_artifact_authorship: ""            # one-line note on artifact-author register (if applicable)
  phase_11_theme_tone: ""                    # one-line note on thematic freshness / world-rootedness

# ===== Canon Safety Check audit trail (Phase 10 output) =====

canon_safety_check:
  invariants_respected: []                   # every invariant id tested at Phase 10a, pass or fail
  mystery_reserve_firewall: []               # every MR entry id checked at Phase 10b, regardless of overlap
  distribution_discipline:
    canon_facts_consulted: []                # every CF id consulted at Phase 10c

# ===== provenance =====

source_basis:
  world_slug: ""
  batch_id: NCB-0000
  generated_date: ""                         # ISO date, e.g. 2026-04-20
  user_approved: false                       # set true at Phase 16 commit — means "kept in batch after review", NOT "realized as character"

notes: >
  Free-form notes. Phase 10e repairs applied to this card (if any) are recorded here
  in the form: "Phase 10e repair: <check-id> — <repair-type> — <justification>".
  Also: dramatic-intent notes, scope-narrowing caveats, continuity constraints
  surfaced from the Person Registry that character-generation's Phase 0 should honor,
  and any explicit-deliberate-voice-family-overlap notes (so Phase 15 Test 9 passes).
---

# <title>

## Material Reality

<Prose grounded in GEOGRAPHY.md, EVERYDAY_LIFE.md, ECONOMY_AND_RESOURCES.md,
 PEOPLES_AND_SPECIES.md, INSTITUTIONS.md, WORLD_KERNEL.md. Every fact cites
 the loaded file and passage. This section is character-generation-compatible;
 when that skill reads this card as character_brief_path, its Phase 1 (Material
 Reality) draws directly from this prose.
 Cover: what this character eats; where they sleep; what injures them most
 often; what they own; what they cannot legally or materially access; how far
 they can travel; what they owe and to whom; species bodily capacities/limits;
 local climate/terrain effects.>

## Institutional Embedding

<Prose per every institutional axis present in INSTITUTIONS.md for this
 region/class/species. Every axis gets a stated relation — even if the
 relation is "none, and here is why." No silent gaps. This section is
 character-generation-compatible.
 Cover: family/clan/household; law; religious authority; employer/guild/
 lord/state; military obligation; debt; local taboo system; literacy/
 schooling; inheritance.>

## Epistemic Position

<Prose structured as four subsections + vocabulary + missing categories.
 Rule 7 discipline: no item in known_firsthand or wrongly_believes matches
 any MYSTERY_RESERVE disallowed_cheap_answers item (Phase 15 Test 6).
 This section is character-generation-compatible.
 Cover: known firsthand; known by rumor; cannot know (cross-ref
 OPEN_QUESTIONS.md and MYSTERY_RESERVE.md); wrongly believes; vocabulary
 for major phenomena; categories they lack.>

## Goals and Pressures

<Prose covering: short-term goal (days to months); long-term desire
 (years to lifetime); unavoidable obligation; public_mask; private_appetite;
 social fear; private shame; external pressure (from major_local_pressures);
 internal contradiction (instantiates a WORLD_KERNEL.md core pressure at
 individual scale); repeated_forced_choice (the world-produced choice the
 character faces again and again — Phase 7 Forced-Choice Rule).
 This section is character-generation-compatible.>

## Capabilities

<Prose, one subsection per distinct skill/craft/knowledge/ability.
 Each subsection answers: how_learned (self-taught / apprenticeship /
 family inheritance / institutional training / accident / initiation);
 cost_to_acquire (time / money / body / social standing / exile / secrecy);
 teachers_institutions (named institution / guild / master / elder / cult
 — or explicit self-teaching with stated cost); unusual_or_ordinary
 (against EVERYDAY_LIFE.md baseline); body_class_place_shape
 (PEOPLES_AND_SPECIES.md embodiment + GEOGRAPHY.md regional effects).
 Phase 15 Test 3 rejects any capability with unpopulated fields or
 hand-wave stabilizers. This section is character-generation-compatible.>

## Voice and Perception

<Prose covering preferred metaphors (drawn from labor/region/religion/
 species-embodiment); education level; rhythm of speech (formal/vernacular/
 terse/florid); taboo words (per INSTITUTIONS.md taboo system);
 what they notice first in a room; what they overlook; species/body
 perception effects; AND for literate characters, the oral/written split
 (speech voice vs formal-writing vs intimate-prayer vs public-testimony).
 This section is character-generation-compatible.>

## Contradictions and Tensions

<Prose covering the central_contradiction and tension map (how it connects
 to the character's obligations, fears, goals, and institutional embedding).
 This section is character-generation-compatible.>

## Likely Story Hooks

<Bulleted list, 3-6 hooks. Each hook names: the world-produced situation
 (tie to a specific Phase 0 major_local_pressure or WORLD_KERNEL.md core
 pressure); the character's response register (what they do under this
 pressure, shaped by Voice and Perception + Goals and Pressures). Hooks
 generic enough to apply to any character in any world fail this section —
 they are cosmetic per Rule 2. This section is character-generation-
 compatible.>

## Niche Analysis

<NCP-specific section. Not consumed by character-generation; preserved as
 audit trail for the proposal's intellectual spine.>

### 7-layer Essence Trace

<One subsection per layer: World-Position / Function / Pressure / Access /
 Epistemic / Thematic / Voice. Each gives a one-paragraph placement of
 this proposed character within the layer's space.>

### Occupancy-Strength Justification

<Prose: why this niche is currently open / adjacent / crowded. Cite the
 registry entries compared against.>

### Nearest Existing Occupants

<For each nearest occupant: CHAR-id or artifact-author-name, their niche
 signature summary, the overlap dimensions (function / position /
 pressure / access / epistemic / voice), and the decisive differences
 that make this proposal distinct.>

### Decisive Differences

<Short bullet list summarizing what makes this proposal NOT a duplicate
 of the nearest occupant(s). Each bullet names a specific layer difference,
 not a surface overlap (profession / species / region).>

## Canon Safety Check Trace

<NCP-specific section. Phase 10 audit prose, one paragraph per sub-phase.
 Also preserved for downstream reference by character-generation's Phase 7
 (which will re-run its own Canon Safety Check against the world's current
 state at the time of generation).>

### Phase 10a (Invariants)

<Which invariants were tested; pass/fail per invariant; any Phase 10e
 repair applied. The full list of tested invariant ids also populates
 frontmatter canon_safety_check.invariants_respected.>

### Phase 10b (Mystery Reserve Firewall)

<Every MR entry checked; overlap status per entry (no overlap / folk-
 rumor overlap permitted / disallowed-answer overlap repaired). The full
 list of checked MR ids also populates frontmatter
 canon_safety_check.mystery_reserve_firewall.>

### Phase 10c (Distribution Discipline)

<CFs consulted; capability-fit check per capability; canon_assumption_flags
 classification rationale (canon-safe / canon-edge / canon-requiring with
 specific edge_assumptions or implied_new_facts).>

### Phase 10d (Batch-level Check — this card's contribution)

<This card's contribution to the batch-level Phase 10d trace: non-
 duplication vs registry; pairwise non-duplication vs other batch cards;
 joint-closure check for MR entries this card's epistemic position
 touches (whether any other card in the batch also touches the same MR
 entry from a complementary angle).>

### Phase 10e Repairs Applied (if any)

<Each repair with check-id, repair-type (1-6 from the ladder), and
 justification. Duplicates what is in the frontmatter notes field for
 scannability.>
