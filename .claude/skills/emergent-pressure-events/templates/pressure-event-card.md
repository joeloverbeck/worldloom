---
# Pressure-Event Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the emergent-pressure-events
# skill as a single candidate event seed for an existing world.
#
# CANON POSTURE: This file is NOT canon. source_basis.user_approved=true means
# the card was reviewed and kept in the batch at Phase 8 HARD-GATE — it does
# NOT mean any fact has been canonized. canonize-routed cards spawn a sidecar
# proposal-card file (EPE-<integer>-<slug>.proposal.md) that canon-addition may
# accept in a separate run.
#
# Required fields must not be left as TODO or empty (enforced by Phase 7 Test 7).

event_id: EPE-<integer>                           # monotonic per-world
batch_id: BATCH-<integer>                         # the batch this card was emitted in
slug: ""                                     # kebab-case slug derived from title
title: ""                                    # short human label

event_seed: >                                # 1-3 sentences describing the event
  Natural-language description of the event. Must be concrete enough to seed
  Phase 6 Canon Safety Check sub-checks and Phase 7 Validation Tests.

origin_type: ""                              # one of the 14-value taxonomy:
                                             # scarcity | succession | ecological_disruption |
                                             # taboo_breach | technology_leakage | migration |
                                             # faction_rivalry | disease | black_market |
                                             # theological_dispute | anniversary | relic_discovery |
                                             # trade_collapse | climate

# Phase 4 Traceability Rule — at least one CF-<integer> required
traceability:
  cited_canon_facts: []                      # REQUIRED — at least one CF id
    # - CF-42
  cited_institutions: []                     # optional — entity ids or institution names
  cited_material_conditions: []              # optional — SEC-ECR / SEC-MTS ids
  cited_pressures: []                        # optional — pressure_label strings from Phase 1 inventory

actors_involved: []                          # named entities or actor categories driving / affected
what_changes_immediately: []                 # first-order propagation — Rule 5 (No Consequence Evasion)
what_might_change_if_unchecked: []           # second-order propagation — Rule 5
who_benefits: []                             # at least one of who_benefits / who_suffers / rumor_waves
who_suffers: []                              # / what_changes_immediately must be non-empty (Rule 2)
rumor_waves: []                              # public-rumor versions of the event; story-fuel staple
mysteries_touched: []                        # Phase 6b firewall declaration; required if any M record overlapped
  # - M-7

scope:                                       # Phase 6c Distribution Discipline
  geographic: local                          # local | regional | global
  temporal: acute                            # acute | seasonal | chronic | cyclical
  why_not_universal: []                      # required for regional/global; rumor carve-out applies

downstream_routing: ""                       # canonize | story_fuel | ambient
routing_rationale: >
  One paragraph: why this routing, what would change if re-routed.
  If canonize, indicate whether the user is expected to pass the sidecar directly
  to canon-addition or to route first through propose-new-canon-facts for
  formal PR-shaping (multi-fact / distribution-sensitive / diversification-needing).

# Sidecar pre-validation block — populated at Phase 5 ONLY for canonize-routed cards.
# null for story_fuel / ambient routings. Phase 7 Test 8 verifies this block's
# completeness before sidecar emission. Shape is byte-parallel to
# propose-new-canon-facts/templates/proposal-card.md frontmatter.
proposal_card_extract: null                  # null OR the following shape:
  # proposal_id: PR-<integer>                     # freshly-allocated via allocate_next_id
  # canon_fact_statement: ""                 # one-sentence canon-fact-shaped truth distilled from event_seed
  # proposed_status: hard_canon              # hard_canon | soft_canon | contested_canon
  # type: ""                                 # capability | event | institution | etc.
  # domains_touched: []                      # derived from actors_involved + who_benefits + who_suffers
  # recommended_scope:
  #   geographic: local                      # local | regional | global | cosmic
  #   temporal: current                      # ancient | historical | current | future | cyclical
  #   social: public                         # restricted_group | public | elite | secret | rumor
  # why_not_universal: []                    # copied from this card's scope.why_not_universal
  # immediate_consequences: []               # copied from this card's what_changes_immediately
  # longer_term_consequences: []             # copied from this card's what_might_change_if_unchecked
  # enrichment_category: derived_from_epe    # sentinel value signaling EPE-origin to canon-addition
  # proposal_family: 0                       # sentinel — not from the 1-10 enrichment family taxonomy

canon_safety_flags:                          # Phase 6 sub-check audit trail
  invariants_tested: []                      # every INV id tested at Phase 6a, regardless of overlap
  mystery_reserve_firewall: []               # every M id tested at Phase 6b, regardless of overlap
  distribution_discipline:
    canon_facts_consulted: []                # every CF id consulted at Phase 6c
  invariant_conformance: pass                # pass | needs_review (per the proposal's flag form)
  mystery_reserve_firewall_status: pass      # pass | needs_review
  distribution_discipline_status: pass       # pass | needs_review

recurrence_flag: null                        # null OR an EPE-<integer> id from a prior batch with same
                                             # origin_type / pressure_label cluster (recurrence detection)

status: active                               # active | resolved | superseded
                                             # superseded set when a later batch emits a card that
                                             # explicitly retires this one (recurrence_flag points back)

source_basis:
  world_slug: ""
  batch_id: BATCH-<integer>
  generated_date: ""                         # ISO date
  user_approved: false                       # set true at Phase 8 commit — means "kept in batch after review",
                                             # NOT "canonized"

notes: >
  Free-form notes. Phase 6e repairs applied to this card (if any) recorded here
  in the form: "Phase 6e repair: <check-id> — <repair-type> — <justification>".
---

# <title>

## Narrative Expansion

<Prose: 2-4 paragraphs describing the event as it would be experienced or
narrated in-world. Must be specific enough that the Phase 6 Canon Safety Check
sub-checks have concrete material to test against.>

## Consequence Propagation Notes

<Prose expansion of frontmatter what_changes_immediately and
what_might_change_if_unchecked. Trace at least first-order and second-order
effects through the world's institutions, economy, ritual life, or geography.
Cite which Pressure Inventory entries the event amplifies or relieves.>

## Routing Discussion

<Prose: why this downstream_routing was chosen. What would change if the card
were re-routed? If canonize, explicitly state whether the proposal_card_extract
is parse-ready for canon-addition direct consumption, or whether the user is
expected to first route through propose-new-canon-facts.>

## Canon Safety Check Trace

<Phase 6 audit prose. One paragraph per sub-phase:>

**Phase 6a (Invariants)**: <which invariants were tested, pass/fail per invariant,
any exception fired (e.g., contested_canon reclassification)>

**Phase 6b (Mystery Reserve Firewall)**: <every MR entry checked, overlap status
per entry, any forbidden-MR drop-trigger or active/passive citation in
mysteries_touched>

**Phase 6c (Distribution Discipline)**: <CFs consulted, why_not_universal
rationale, rumor-carve-out if applied>

**Phase 6e Repairs Applied** (if any): <each repair with check-id, repair-type,
justification — duplicates what is in the frontmatter notes field>
