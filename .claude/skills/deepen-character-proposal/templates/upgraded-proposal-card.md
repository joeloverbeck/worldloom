# Upgraded NCP Proposal Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the deepen-character-proposal
# skill for one user seed or one existing NCP proposal card.
#
# CANON POSTURE: This file is NOT a character and NOT canon. It is an upgraded
# proposal card directly consumable by character-generation as character_brief_path.
# Canon-requiring implications are routed; they are never asserted here.
#
# Single-seed upgrades do not require a batch manifest. Omit batch_id.

---
# ===== character-generation compatibility block =====

current_location: ""
place_of_origin: ""
date: ""
species: ""
age_band: ""
social_position: ""
profession: ""
kinship_situation: ""
religious_ideological_environment: ""
major_local_pressures: []
intended_narrative_role: ""

central_contradiction: ""
desired_emotional_tone: ""
desired_arc_type: ""
taboo_limit_themes: []

# ===== NCP-specific identification =====

proposal_id: NCP-<integer>
slug: ""
title: ""

# ===== NCP-specific proposal metadata =====

niche_summary: >
  One- to two-paragraph summary of the world niche, pressure engine, voice
  family, relational charge, and why this upgraded proposal is not interchangeable
  with the source seed or nearby characters.

occupancy_strength:
  current_state: open
  nearest_existing_occupants: []
  overlap_type: ""
  decisive_differences: []

depth_class: protagonist_grade
proposal_family: upgraded_single_seed
diagnosis_target: ""

# ===== protagonist-grade engine =====

memorability_profile:
  seed_essence_preserved: []
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
  voice_under_pressure:
    lying: ""
    begging: ""
    threatening: ""
    grieving_or_hiding_ignorance: ""
  cannot_be_swapped_out_because: ""

upgrade_lineage:
  origin_kind: upgraded_seed
  source_path: ""
  source_proposal_id: ""
  mutation_summary: ""
  rejected_directions_audit:
    - direction: ""
      preserved_essence: []
      mutation_attempted: ""
      rejection_reason: ""

# ===== scoring =====

scores:
  validity:
    world_rootedness: 0
    niche_distinctiveness: 0
    institutional_embedding: 0
    ordinary_life_relevance: 0
    capability_cost_integrity: 0
    canon_safety: 0
    canon_burden: 0
    overlap_risk: 0
  memorability:
    protagonist_grade_force: 0
    contradiction_irreconcilability: 0
    appetite_specificity: 0
    self_mythology_strength: 0
    pressure_behavior_distinctiveness: 0
    voice_pressure_distinction: 0
    relational_charge: 0
    moral_psychological_edge: 0
    world_specific_surprise: 0
    cannot_be_swapped_out: 0

score_aggregate: 0

# ===== canon routing =====

canon_assumption_flags:
  status: canon-safe
  edge_assumptions: []
  implied_new_facts: []

recommended_next_step: generate_immediately

# ===== critic pass audit trail =====

critic_pass_trace:
  seed_essence_extractor: ""
  world_pressure_mapper: ""
  blandness_executioner: ""
  protagonist_grade_critic: ""

# ===== Canon Safety Check audit trail =====

canon_safety_check:
  invariants_respected: []
  mystery_reserve_firewall: []
  distribution_discipline:
    canon_facts_consulted: []

# ===== provenance =====

source_basis:
  world_slug: ""
  generated_date: ""
  input_path: ""
  user_approved: false

notes: >
  Record canon-routing caveats, overlap findings, user constraints, taboo limits,
  and any explicit anti-flattening tradeoffs here.
---

# <title>

## Seed Essence

<List the non-negotiables preserved from the seed or source NCP, then name what
was intentionally mutated.>

## Upgrade Diagnosis

<Explain the source seed's blandness, predictability, weak pressure behavior,
missing appetite, relationship neutrality, cosmetic weirdness, or canon-avoidant
flattening. Tie every diagnosis to a protagonist-grade engine field.>

## Material Reality

<Prose grounded in geography, everyday life, economy, species/body condition,
institutions, and kernel pressures.>

## Institutional Embedding

<Prose naming the local family, law, religion, employer/guild/lord/state, debt,
taboo, literacy, inheritance, or other axes that make the upgraded engine real.>

## Epistemic Position

<Known firsthand, known by rumor, cannot know, wrongly believes, vocabulary, and
missing categories. Preserve Mystery Reserve boundaries.>

## Goals and Pressures

<Short-term goal, long-term desire, unavoidable obligation, public mask, private
appetite, social fear, private shame, external pressure, central contradiction,
and repeated forced choice.>

## Capabilities

<Capabilities with acquisition route, cost, teacher/institution, ordinary-or-
unusual status, body/species/place constraints, and distribution discipline.>

## Voice and Perception

<Speech, written register if relevant, metaphors, education, taboo words,
noticing patterns, and pressure-specific voice shifts.>

## Contradictions and Tensions

<The irreconcilable contradiction as repeated behavior, not an abstract trait.>

## Niche Analysis

<Nearest existing occupants, decisive differences, and why this proposal occupies
a useful open or adjacent space without duplicating another figure.>

## Canon Routing

<Canon-safe / canon-edge / canon-requiring classification. For canon-requiring
cards, list each implied fact with preferred route: canon-addition or
propose-new-canon-facts.>

## Rejected Directions Audit

<At least three rejected mutation directions. Each entry names preserved essence,
mutation attempted, rejection trigger, and why the selected direction is stronger.>

## Canon Safety Check Trace

<Invariant checks, Mystery Reserve firewall checks, distribution discipline, and
critic-pass rationales. Each PASS includes a one-line rationale.>
