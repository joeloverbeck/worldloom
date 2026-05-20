# Character Dossier — template
#
# Hybrid YAML frontmatter + markdown body. Original to this skill.
#
# YAML frontmatter carries structured lookups (species, age band, institutional
# relations, world-consistency audit trail); markdown body carries rich prose
# grounded in the world files cited per passage.
#
# Copy this file into worlds/<world-slug>/characters/<char-slug>.md and fill
# every field. Do NOT leave placeholders — Phase 8 Test 9 (Schema completeness)
# rejects any field left as TODO, empty-where-content-required, or placeholder.
#
# Field-level notes live alongside the fields below. The five blocks under
# `world_consistency` are the Canon Safety Check audit trail — they are not
# decorative. Silent empty lists fail Phase 8 Tests 5 and 7.

---
character_id: CHAR-<integer>                      # allocated at Pre-flight by scanning characters/
slug: ""                                     # kebab-case of the in-world name; filename stem
name: ""                                     # in-world display name
species: ""                                  # bound to a PEOPLES_AND_SPECIES.md cluster
age_band: ""                                 # plausible for species lifespan
place_of_origin: ""                          # bound to a GEOGRAPHY.md region or settlement
current_location: ""                         # bound to a GEOGRAPHY.md region or settlement
date: ""                                     # in-world date per TIMELINE.md / chronotope
social_position: ""                          # bound to an INSTITUTIONS.md stratum
profession: ""                               # bound to an INSTITUTIONS.md / ECONOMY_AND_RESOURCES.md trade
kinship_situation: ""                        # per INSTITUTIONS.md kinship logic + EVERYDAY_LIFE.md norms
religious_ideological_environment: ""        # bound to an institution / cult / folk practice
major_local_pressures: []                    # cross-ref GEOGRAPHY / ECONOMY / INSTITUTIONS / TIMELINE
intended_narrative_role: ""                  # protagonist / witness / antagonist / foil / narrator / background

# --- Protagonist-grade character engine (Phase 4b output) ---
# Field names match .claude/skills/_shared-references/protagonist-grade-character-engine.md.
# Every value must be world-produced, not cosmetic.
dramatic_core:
  world_produced_wound: ""                    # durable hurt/exclusion/debt/etc. plus the world mechanism that produced it
  active_appetite: ""                         # recurring wanted behavior rooted in world pressure
  self_mythology: ""                          # the self-story made available by local values/institutions
  irreconcilable_contradiction: ""            # recurring behavioral conflict with two world-valid sides
  pressure_behavior:
    cornered: ""                              # distinct response under threat
    tempted: ""                               # distinct response when desire is available
    humiliated: ""                            # distinct response to shame/status injury
    offered_power: ""                         # distinct response to leverage/authority
    protecting_attachment: ""                 # distinct response when guarding a charged bond
  relational_charge:
    - target_or_relation_type: ""             # named person, group, institution, kin role, rival, debtor, etc.
      need: ""                                # what they need from the relation
      resentment_or_fear: ""                  # what makes the relation charged
      likely_harm_or_betrayal: ""             # plausible harm/betrayal risk under pressure
  moral_psychological_edge: ""                # uncomfortable line they may cross/defend/refuse
  signature_scene_behaviors: []               # at least 3 visible behaviors from body/work/status/fear/appetite/institution/taboo/environment
  voice_under_pressure:
    lying: ""                                 # how speech changes when lying
    begging: ""                               # how speech changes when pleading
    threatening: ""                           # how speech changes when threatening
    grieving_or_hiding_ignorance: ""          # how speech changes when grieving or concealing ignorance
  cannot_be_swapped_out_because: ""           # world-specific reason this person is not role-interchangeable

# --- Canon Safety Check audit trail (Phase 7 output) ---
# These five lists ARE the audit trail. Empty lists are suspicious by default;
# Phase 8 Tests 5 and 7 reject empty-where-non-empty-is-required.
world_consistency:
  canon_facts_consulted: []                  # bare CF-<integer> ids only (regex ^CF-[0-9]+$); CFs consulted during Phases 5 and 7c. Add descriptive context to the Phase 7c trace prose, NOT to this array — record_schema_compliance rejects mixed-format entries
  invariants_respected: []                   # bare invariant ids only — ONT-N / CAU-N / DIS-N / SOC-N / AES-N (regex ^(ONT|CAU|DIS|SOC|AES)-[0-9]+$); invariants tested at Phase 7a. Descriptive context belongs in the Phase 7a trace prose
  mystery_reserve_firewall: []               # bare M-<integer> ids only (regex ^M-[0-9]+$); MR entries checked at Phase 7b (non-empty required if MR has touching entries). Per-entry overlap-or-no-overlap status belongs in the Phase 7b trace prose
  distribution_exceptions: []                # free-form strings of form "<CF-id>: <justification citing Phase 2 embedding>"
  continuity_checked_with: []                # bare CHAR-<integer> ids only (regex ^CHAR-[0-9]+$); CHAR-ids of existing dossiers read at Pre-flight step 6 for continuity-preservation; empty if no existing dossiers name this character

source_basis:
  world_slug: ""                             # the world this character belongs to
  generated_date: ""                         # ISO date of generation, e.g. 2026-04-18
  user_approved: false                       # set true ONLY at Phase 9 atomic write, after HARD-GATE release
  source_proposal_id: ""                     # optional; when generated from an NCP, copy input_memorability_contract.source_proposal_id (NCP-<integer>)

notes: >
  Free-form notes: Phase 7d repair sub-passes that fired (form:
  "Phase 7d repair: <trait> — <repair type> — <justification>"),
  optional inputs supplied at Phase 0 (central contradiction, desired
  emotional tone, desired arc type, taboo/limit themes), and any
  scope-narrowing decisions the user may want to revisit.
---

# <Name>

## Material Reality

<Prose grounded in GEOGRAPHY.md, EVERYDAY_LIFE.md, ECONOMY_AND_RESOURCES.md,
 PEOPLES_AND_SPECIES.md, INSTITUTIONS.md, WORLD_KERNEL.md:
 - what this character eats
 - where they sleep
 - what injures them most often
 - what they own
 - what they cannot legally or materially access
 - how far they can travel
 - what they owe and to whom
 - what bodily capacities or limits their species gives them
 - what local climate and terrain do to them
 Every fact cites the loaded file and passage — Phase 8 Test 2.>

## Institutional Embedding

<Prose per every institutional axis present in INSTITUTIONS.md for this
 region/class/species. Every axis gets a stated relation — even if the
 relation is "none, and here is why." No silent gaps (Phase 8 Test 8):
 - family / clan / household
 - law
 - religious authority
 - employer / guild / lord / state
 - military obligation
 - debt
 - local taboo system
 - literacy / schooling
 - inheritance>

## Epistemic Position

<Prose structured as four subsections + vocabulary + missing categories:
 - known firsthand (witnessed / experienced / handled)
 - known by rumor (heard from neighbors / priests / travelers / merchants)
 - cannot know (spatially / institutionally / epistemically out of reach —
   cross-reference OPEN_QUESTIONS.md and any MYSTERY_RESERVE.md entries
   whose `what is unknown` block overlaps)
 - wrongly believes (folk theories / propaganda / inherited superstitions)
 - vocabulary they have for major world phenomena
 - categories they lack entirely
 Rule 7 discipline: no item in `known_firsthand` or `wrongly_believes` may
 match any MYSTERY_RESERVE `disallowed cheap answers` item (Phase 8 Test 6).>

## Goals and Pressures

<Prose covering:
 - short-term goal (days to months)
 - long-term desire (years to lifetime)
 - unavoidable obligation
 - social fear
 - private shame
 - external pressure (from Phase 0 major_local_pressures)
 - internal contradiction (instantiates a WORLD_KERNEL.md core pressure at
   individual scale)>

## Capabilities

<Prose, one subsection per distinct skill / craft / knowledge / ability.
 Each subsection answers:
 - how_learned (self-taught / apprenticeship / family inheritance /
   institutional training / accident / initiation)
 - cost_to_acquire (time / money / body / social standing / exile / secrecy)
 - teachers_institutions (named institution / guild / master / elder / cult —
   or explicit self-teaching with stated cost)
 - unusual_or_ordinary (against EVERYDAY_LIFE.md baseline)
 - body_class_place_shape (PEOPLES_AND_SPECIES.md embodiment +
   GEOGRAPHY.md regional effects)
 Phase 8 Test 3 rejects any capability with an unpopulated field or
 hand-wave stabilizer.>

## Voice and Perception

<Prose covering:
 - preferred metaphors (drawn from labor / region / religion /
   species-embodiment)
 - education level (per Phase 2 literacy/schooling)
 - rhythm of speech (formal / vernacular / terse / florid — per
   EVERYDAY_LIFE.md language patterns by class/region/religion)
 - taboo words (per INSTITUTIONS.md taboo system)
 - what they notice first in a room (shaped by profession, fear, embodiment)
 - what they overlook (what their class / profession / ideology makes
   invisible to them)
 - species/body perception effects (per PEOPLES_AND_SPECIES.md senses block)>

## Contradictions and Tensions

<Prose covering:
 - central contradiction (the single internal tension most likely to drive
   the character's story; derived from Phase 4 internal contradiction,
   enriched with Phase 0 optional input if supplied)
 - tension map (how the central contradiction connects to the character's
   obligations, fears, goals, and institutional embedding — a short map,
   not a list)>

## Protagonist-Grade Core

<Prose summarizing `dramatic_core` as world pressure made personal:
 - world_produced_wound
 - active_appetite
 - irreconcilable_contradiction
 - cannot_be_swapped_out_because
 Cite the world mechanism behind each element. If the character came from an
 NCP `memorability_profile`, state what load-bearing essence was preserved.>

## Pressure Behavior

<Prose or structured bullets covering all five `dramatic_core.pressure_behavior`
 keys: cornered, tempted, humiliated, offered_power, protecting_attachment.
 Each response must be distinct and rooted in world-trained habits, risks,
 language, obligations, or bodily limits.>

## Self-Mythology and Blind Spots

<Prose covering:
 - the self-story the character uses to survive guilt, desire, obedience,
   ambition, shame, or failure
 - which local values, institutions, beliefs, or social roles make that
   self-story available
 - the blind spots and misreadings this self-mythology creates>

## Relational Charge

<Prose covering each charged relation or relation type:
 - what the character needs
 - what they resent or fear
 - what harm or betrayal becomes likely under pressure
 Neutral or frictionless relationship description fails Phase 8 Test 15.>

## Moral and Psychological Edge

<Prose naming the uncomfortable line the character may cross, defend,
 rationalize, or refuse. Tie the edge to law, piety, hunger, rank, grief,
 inheritance, secrecy, contamination, survival, or another loaded world
 pressure.>

## Signature Scene Behavior

<At least 3 visible repeated behaviors that reveal this character under
 pressure. Each behavior should arise from body, work, status, fear, appetite,
 institution, taboo, or environment, and should be specific enough that another
 member of the same role/species/class would not do it the same way.>

## Likely Story Hooks

<Bulleted list, 3-6 hooks. Each hook names:
 - the world-produced situation (tie to a specific Phase 0 major_local_pressure
   or WORLD_KERNEL.md core pressure)
 - the character's response register (what they do under this pressure,
   shaped by Phase 6 voice and Phase 4 pressures)
 Hooks generic enough to apply to any character in any world fail this
 section — they are cosmetic per Rule 2.>

## Canon Safety Check Trace

<One subsection per Phase 7 check + the Phase 8 validation checklist.
 Every line here is audit trail — not decorative.>

### Phase 7a: Invariant Conformance
<Prose listing each invariant id tested, pass/fail result, and (on fail)
 the Phase 7d repair applied. The full list of passed invariants also
 populates `world_consistency.invariants_respected` in the frontmatter.>

### Phase 7b: Mystery Reserve Firewall
<Prose listing each MYSTERY_RESERVE entry id checked, what the character's
 epistemic position holds about the mystery (rumor / folk-belief / no view),
 and confirmation that no `disallowed cheap answers` item appears in
 `known_firsthand` or `wrongly_believes`. The full list of checked MR ids
 also populates `world_consistency.mystery_reserve_firewall` in the frontmatter.>

### Phase 7c: Distribution/Scope Conformance
<Prose listing each capability, the matching CF id (or "ordinary-person scope,
 no CF match"), the character's fit to `who_can_do_it` or a citation of the
 Phase 2 embedding that justifies an exception. Exceptions also populate
 `world_consistency.distribution_exceptions` in the frontmatter.>

### Phase 8 Validation Checklist
<Record each of the 18 tests as one line in the form:
 `- Test N (Rule R / topic): PASS — <one-line rationale>`
 Test 10's rationale must enumerate at least 3 world-specificity axes with
 citations. A PASS without rationale is treated as FAIL. All 18 must PASS before
 Phase 9 HARD-GATE fires.>
