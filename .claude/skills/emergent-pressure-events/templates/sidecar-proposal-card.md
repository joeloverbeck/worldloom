---
# Sidecar Proposal Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the emergent-pressure-events
# skill ONLY for canonize-routed pressure-event cards (one sidecar per such card).
# Filename pattern: EPE-NNNN-<slug>.proposal.md (sits next to the parent
# EPE-NNNN-<slug>.md in worlds/<slug>/pressure-events/).
#
# Frontmatter is byte-parallel to propose-new-canon-facts/templates/proposal-card.md
# so canon-addition's Phase 0 proposal-parser can field-copy directly. Three
# explicit field overrides distinguish this from a propose-new-canon-facts emission:
#   - source_basis.derived_from_cfs:   populated from parent EPE traceability.cited_canon_facts
#   - enrichment_category:             "derived_from_epe" (sentinel)
#   - proposal_family:                 0 (sentinel — not from the 1-10 enrichment family taxonomy)
#
# DOWNSTREAM CONSUMER: canon-addition. Field-schema parity with
# propose-new-canon-facts/templates/proposal-card.md MUST be preserved across
# any future schema evolution. If this template diverges, canon-addition's
# Phase 0 proposal-parser breaks for EPE-origin cards.
#
# CANON POSTURE: This file is NOT canon. source_basis.user_approved=true means
# the parent EPE card was reviewed and kept at Phase 8 HARD-GATE. Canonization
# happens only when canon-addition accepts this sidecar in a separate run.

proposal_id: PR-0000                         # freshly-allocated via allocate_next_id at Phase 5
batch_id: BATCH-0000                         # parent EPE card's batch_id
slug: ""                                     # parent EPE card's slug (same kebab-case slug)
title: ""                                    # parent EPE card's title (or a canon-fact-shaped reframing)

canon_fact_statement: >                      # one-sentence candidate fact distilled from parent
  Single-sentence statement of the proposed canon fact. One canon-fact-shaped
  truth — NOT the multi-faceted event narrative. Must be unambiguous enough
  to be cited in canon-addition's Phase 0 proposal parse.

proposed_status: hard_canon                  # hard_canon | soft_canon | contested_canon | mystery_reserve | invariant_revision
type: ""                                     # capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule

enrichment_category: derived_from_epe        # SENTINEL — signals EPE-origin to canon-addition's parser
proposal_family: 0                           # SENTINEL — not from the 1-10 enrichment family taxonomy

domains_touched: []                          # derived from parent's actors_involved + who_benefits + who_suffers
                                             # at least one — enforced by canon-addition's Phase 8 Test 1
  # - labor
  # - warfare
  # - economy
  # - settlement_life

recommended_scope:                           # required for capability/artifact/technology/magic cards
  geographic: local                          # local | regional | global | cosmic
  temporal: current                          # ancient | historical | current | future | cyclical
                                             # derived from parent's scope.temporal mapped to CF temporal enum:
                                             #   acute -> current
                                             #   seasonal -> cyclical
                                             #   chronic -> current
                                             #   cyclical -> cyclical
  social: public                             # restricted_group | public | elite | secret | rumor
                                             # derived from parent's actors_involved reach

why_not_universal: []                        # copied from parent EPE card's scope.why_not_universal
                                             # required UNLESS social=rumor — each entry names a concrete stabilizer

scores:                                      # canon-addition's Phase 0 may re-score; sidecar emits all-zeros
  coherence: 0                               # by default. EPE does not score canonize candidates — that is
  propagation_value: 0                       # canon-addition's adjudication concern.
  story_yield: 0
  distinctiveness: 0
  ordinary_life_relevance: 0
  mystery_preservation: 0
  integration_burden: 0
  redundancy_risk: 0

score_aggregate: 0

immediate_consequences: []                   # copied from parent EPE card's what_changes_immediately
longer_term_consequences: []                 # copied from parent EPE card's what_might_change_if_unchecked

likely_required_downstream_updates: []       # atomic SEC-* records likely needing updating if accepted
  # - SEC-INS-007         # institutions
  # - SEC-ECR-003         # economy-and-resources
  # - SEC-ELF-012         # everyday-life

risks: []                                    # populated from parent EPE card's routing_rationale risks
                                             # plus any Phase 6 Canon Safety Check flags raised but not blocking

canon_safety_check:                          # mirrors parent EPE card's canon_safety_flags audit trail
  invariants_respected: []                   # parent's canon_safety_flags.invariants_tested
  mystery_reserve_firewall: []               # parent's canon_safety_flags.mystery_reserve_firewall
  distribution_discipline:
    canon_facts_consulted: []                # parent's canon_safety_flags.distribution_discipline.canon_facts_consulted

source_basis:
  world_slug: ""
  batch_id: BATCH-0000
  generated_date: ""                         # ISO date
  user_approved: false                       # set true at Phase 8 commit — "kept in batch after review", NOT "canonized"
  derived_from_cfs: []                       # populated from parent EPE traceability.cited_canon_facts
  derived_from_epe: ""                       # parent EPE-NNNN id — non-empty for sidecars; absent on
                                             # native propose-new-canon-facts proposal cards

notes: >
  Free-form notes. EPE-origin sidecars carry the parent card's Phase 6e repair
  log (if any) here as: "Parent EPE-NNNN Phase 6e repair: <check-id> — <repair-type> — <justification>".
  canon-addition's Phase 0 may also append normalization notes here.
---

# <title>

## What It Deepens

<Prose: which existing structures, pressures, or contested knowledge this
candidate fact would make more legible. Cite specific WORLD_KERNEL / INVARIANTS /
SEC-* records. May summarize parent EPE card's Narrative Expansion section.>

## Why It Fits This World

<Prose: how this candidate fact honors the world's genre contract, tonal
contract, chronotope, and core pressures. One paragraph.>

## Immediate Consequences

<Prose expansion of frontmatter immediate_consequences — ordinary-life
signals this fact would produce within days-to-months of acceptance.>

## Longer-Term Consequences

<Prose expansion of longer_term_consequences — structural effects over years.
Must trace through at least two of Rule 2's domains.>

## Risks

<Prose: specific world-integrity risks if this card is accepted by canon-addition.
Name the invariants that would come under stress; name the MR entries that would
require firewall discipline during canon-addition's adjudication.>

## EPE-Origin Provenance

<Prose: one paragraph naming the parent EPE-NNNN card, the pressure-inventory
entries that seeded it, and the routing_rationale from the parent card.
Helps canon-addition's adjudicator understand why this candidate was distilled
from a richer event into a single canon-fact-shaped statement.>

## Would This Be Better As

<Final recommendation line: hard_canon / soft_canon (regional) / contested_canon /
mystery_reserve / invariant_revision — matching frontmatter proposed_status.
If the recommendation is *other than* the frontmatter status, explain why.>

## Canon Safety Check Trace

<Phase 6 audit prose inherited from parent EPE card. One paragraph per sub-phase:>

**Phase 6a (Invariants)**: <inherited from parent>

**Phase 6b (Mystery Reserve Firewall)**: <inherited from parent>

**Phase 6c (Distribution Discipline)**: <inherited from parent>
