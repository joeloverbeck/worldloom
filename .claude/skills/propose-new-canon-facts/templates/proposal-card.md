---
# Proposal Card — template
#
# Hybrid YAML frontmatter + markdown body. Emitted by the propose-new-canon-facts
# skill as a single candidate for canon-addition's separate adjudication.
#
# CANON POSTURE: This file is NOT canon. source_basis.user_approved=true means
# the card was reviewed and kept in the batch at Phase 9 HARD-GATE — it does
# NOT mean the fact has been canonized. Canonization happens only when
# canon-addition accepts this card in a separate run.
#
# Required fields must not be left as TODO or empty (enforced by Phase 8 Test 10).

proposal_id: PR-0000                         # monotonic per-world
batch_id: BATCH-0000                         # the batch this card was emitted in
slug: ""                                     # kebab-case slug derived from title
title: ""                                    # short human label

canon_fact_statement: >                      # one-sentence candidate fact
  Single-sentence statement of the proposed canon fact. Must be unambiguous
  enough to be cited in canon-addition's Phase 0 proposal parse.

proposed_status: hard_canon                  # hard_canon | soft_canon | contested_canon | mystery_reserve | invariant_revision
type: ""                                     # capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule

enrichment_category: ""                      # A | B | C | D | E | F | G | H | I | J (per SKILL.md Phase 2 taxonomy)
proposal_family: 0                           # 1..10 (per reference Proposal Families Reference)

domains_touched: []                          # at least one — enforced by Phase 8 Test 1 (14-domain Rule 2 check)
  # - labor
  # - warfare
  # - economy
  # - settlement_life
  # - kinship
  # - religion
  # - language
  # - law

recommended_scope:                           # required for capability/artifact/technology/magic cards (Phase 7c)
  geographic: local                          # local | regional | global | cosmic
  temporal: current                          # ancient | historical | current | future | cyclical
  social: public                             # restricted_group | public | elite | secret | rumor

why_not_universal: []                        # required UNLESS social=rumor — each entry names a concrete stabilizer
  # - "requires rare training at a named institution"
  # - "bottlenecked by material scarcity"
  # - "socially taboo outside a specific caste"

scores:                                      # each 1-5 per Phase 4 rubric
  coherence: 0
  propagation_value: 0
  story_yield: 0
  distinctiveness: 0
  ordinary_life_relevance: 0
  mystery_preservation: 0
  integration_burden: 0                      # LOWER is better (5 = massive retcon)
  redundancy_risk: 0                         # LOWER is better

score_aggregate: 0                           # (coherence + propagation_value + story_yield + distinctiveness
                                             #  + ordinary_life_relevance + mystery_preservation)
                                             # − (integration_burden + redundancy_risk)
                                             # Range: [-10, +28]. Seeds with <+6 are Phase-5 flagged unless high-value diagnosis.

immediate_consequences: []                   # first-order — enforced by Phase 8 Test 4
  # - "grave labor becomes a specialized trade"
  # - "funerary expense rises across all classes"

longer_term_consequences: []                 # second-order and beyond — enforced by Phase 8 Test 4
  # - "inheritance law adapts to the new grave-cost burden"
  # - "anti-graverobber violence becomes normalized"

likely_required_downstream_updates: []       # world files that would need updating if this card is accepted by canon-addition
  # - INSTITUTIONS.md
  # - ECONOMY_AND_RESOURCES.md
  # - EVERYDAY_LIFE.md
  # - TIMELINE.md

risks: []                                    # per Phase 4 + proposal card template
  # - "may require rethinking prior burial customs"
  # - "could over-centralize religious authority"

canon_safety_check:                          # audit trail (Phase 7 outputs)
  invariants_respected: []                   # every invariant id tested at 7a, pass or fail
  mystery_reserve_firewall: []               # every MR entry id checked at 7b, regardless of overlap
  distribution_discipline:
    canon_facts_consulted: []                # every CF id consulted at 7c

source_basis:
  world_slug: ""
  batch_id: BATCH-0000
  generated_date: ""                         # ISO date, e.g. 2026-04-18
  user_approved: false                       # set true at Phase 9 commit — means "kept in batch after review", NOT "canonized"
  derived_from_cfs: []                       # parent CF ids this proposal derives from

notes: >
  Free-form notes. Phase 7e repairs applied to this card (if any) are recorded here
  in the form: "Phase 7e repair: <check-id> — <repair-type> — <justification>".
  Also: adjudication-appetite hints, scope-narrowing caveats, dramatic-intent notes
  that canon-addition's Phase 0 normalizer may surface.
---

# <title>

## What It Deepens

<Prose: which existing structures, pressures, or contested knowledge this card makes
more legible. Cite specific WORLD_KERNEL / INVARIANTS / domain-file sections.>

## Why It Fits This World

<Prose: how this card honors the world's genre contract, tonal contract, chronotope,
and core pressures. One paragraph.>

## Immediate Consequences

<Prose expansion of the frontmatter immediate_consequences list — ordinary-life
signals this fact would produce within days-to-months of acceptance.>

## Longer-Term Consequences

<Prose expansion of longer_term_consequences — structural effects over years.
Must trace through at least two of the 14 Rule-2 domains.>

## Risks

<Prose: specific world-integrity risks if this card is accepted. Name the
invariants that would come under stress; name the MR entries that would
require firewall discipline during canon-addition's adjudication.>

## Likely Burden If Accepted

<One paragraph on the scope of world-file updates canon-addition would likely
required_world_updates. Calibrate against integration_burden score.>

## Likely Story Yield

<One paragraph naming the concrete story engines this card would activate.
Draw from WORLD_KERNEL §Natural Story Engines.>

## Would This Be Better As

<Final recommendation line: hard_canon / soft_canon (regional) / contested_canon /
mystery_reserve / invariant_revision — matching frontmatter proposed_status.
If the recommendation is *other than* the frontmatter status, explain why.>

## Canon Safety Check Trace

<Phase 7 audit prose. One paragraph per sub-phase:>

**Phase 7a (Invariants)**: <which invariants were tested, pass/fail per invariant,
any exception fired (e.g., invariant_revision status)>

**Phase 7b (Mystery Reserve Firewall)**: <every MR entry checked, overlap status per
entry, Family-J inversion note if applicable>

**Phase 7c (Distribution Discipline)**: <CFs consulted, why_not_universal rationale,
rumor-carve-out if social=rumor>

**Phase 7e Repairs Applied** (if any): <each repair with check-id, repair-type,
justification — duplicates what is in the frontmatter notes field>
