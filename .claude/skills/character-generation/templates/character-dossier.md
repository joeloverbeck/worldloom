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
# Field-level notes live alongside the fields below. The three blocks under
# `world_consistency` are the Canon Safety Check audit trail — they are not
# decorative. Silent empty lists fail Phase 8 Tests 5 and 7.

---
character_id: CHAR-0000                      # allocated at Pre-flight by scanning characters/
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

# --- Canon Safety Check audit trail (Phase 7 output) ---
# These four lists ARE the audit trail. Empty lists are suspicious by default;
# Phase 8 Tests 5 and 7 reject empty-where-non-empty-is-required.
world_consistency:
  canon_facts_consulted: []                  # CF ids from CANON_LEDGER.md consulted during Phases 5 and 7c
  invariants_respected: []                   # invariant ids from INVARIANTS.md tested at Phase 7a
  mystery_reserve_firewall: []               # MR entry ids from MYSTERY_RESERVE.md checked at Phase 7b (non-empty required if MR has touching entries)
  distribution_exceptions: []                # entries of form "<CF-id>: <justification citing Phase 2 embedding>"

source_basis:
  world_slug: ""                             # the world this character belongs to
  generated_date: ""                         # ISO date of generation, e.g. 2026-04-18
  user_approved: false                       # set true ONLY at Phase 9 atomic write, after HARD-GATE release

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
<Record each of the 9 tests as one line in the form:
 `- Test N (Rule R / topic): PASS — <one-line rationale>`
 A PASS without rationale is treated as FAIL. All 9 must PASS before
 Phase 9 HARD-GATE fires.>
