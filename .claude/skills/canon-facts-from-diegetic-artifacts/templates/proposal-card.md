---
# Proposal Card — template (mining variant)
#
# Hybrid YAML frontmatter + markdown body. Emitted by the
# canon-facts-from-diegetic-artifacts skill as a single candidate for
# canon-addition's separate adjudication.
#
# CF-SCHEMA PARITY: This template is structurally parallel to FOUNDATIONS.md
# §"Canon Fact Record Schema" and to propose-new-canon-facts/templates/
# proposal-card.md. Matching field names (type, recommended_scope,
# domains_touched, distribution, source_basis) are load-bearing: canon-addition's
# Phase 0 proposal normalizer consumes these fields by direct field-copy, not
# re-derivation. Future schema evolution must preserve parity across all three
# files (FOUNDATIONS §Canon Fact Record Schema + the two proposal-card
# templates) simultaneously — drifting one without the others breaks
# canon-addition consumption.
#
# CANON POSTURE: This file is NOT canon. source_basis.user_approved=true means
# the card was reviewed and kept in the batch at Phase 8 HARD-GATE — it does
# NOT mean the fact has been canonized. Canonization happens only when
# canon-addition accepts this card in a separate run.
#
# MINING-SPECIFIC FIELDS (not present in sibling template):
#   source_artifact_id                 — the DA-NNNN this card was mined from
#   source_basis.derived_from_artifact_path — full path to source artifact
#   canon_safety_check.diegetic_to_world_laundering — Phase 6d sub-test results
#
# Required fields must not be left as TODO or empty (enforced by Phase 7 T5/T6/T7).

proposal_id: PR-0000                         # monotonic per-world
batch_id: BATCH-0000                         # the batch this card was emitted in
slug: ""                                     # kebab-case slug derived from title
title: ""                                    # short human label

source_artifact_id: DA-0000                  # DA-NNNN of the diegetic artifact mined
mining_context: ""                           # one-line note on what artifact feature
                                             # the claim arose from (e.g., "chronicle's
                                             # opening invocation of the Year-Counters'
                                             # festival"); purposive, not taxonomic

canon_fact_statement: >                      # one-sentence candidate fact
  Single-sentence statement of the proposed canon fact. Must be unambiguous
  enough to be cited in canon-addition's Phase 0 proposal parse.

proposed_status: soft_canon                  # hard_canon | soft_canon | contested_canon
                                             # (invariant_revision NOT allowed — those
                                             # route to flagged-contradictions at Phase 2)

type: ""                                     # capability | artifact | law | belief | event |
                                             # institution | species | ritual | taboo |
                                             # technology | resource_distribution |
                                             # hidden_truth | local_anomaly |
                                             # metaphysical_rule

domains_touched: []                          # at least one — enforced by Phase 7 Test T1
  # - labor
  # - warfare
  # - economy
  # - settlement_life
  # - kinship
  # - religion
  # - language
  # - law

recommended_scope:                           # required; checked by Phase 6c
  geographic: local                          # local | regional | global | cosmic
  temporal: current                          # ancient | historical | current | future | cyclical
  social: public                             # restricted_group | public | elite | secret | rumor

why_not_universal: []                        # required UNLESS social=rumor — concrete stabilizers
  # - "known only within the author's monastic order"
  # - "tied to the specific calendrical festival the chronicle describes"
  # - "material dependency on a regional resource"

narrator_reliability_basis:                  # Phase 3 mapping audit trail
  stance: ""                                 # firsthand | secondhand | propagandistic | legendary | outside_horizon
  central_to_artifact: false                 # true if the claim is central to artifact's purpose
  cross_referenced_in_canon: false           # true ONLY if Phase 6d.1 evidence-breadth found FULL support for the
                                             # specific operational detail (pass verdict); false if 6d.1 found only
                                             # partial support for the underlying mechanic (partial verdict → soft_canon
                                             # via sole-source-for-the-specification mapping per Phase 3 reference).
  mapping_rationale: >
    One-paragraph explanation of why Phase 3 produced this proposed_status.

scores:                                      # each 1-5 per Phase 4 rubric
  coherence: 0
  propagation_value: 0
  story_yield: 0
  distinctiveness: 0
  ordinary_life_relevance: 0
  mystery_preservation: 0
  integration_burden: 0                      # LOWER is better (5 = massive retcon)
  redundancy_risk: 0                         # LOWER is better

score_aggregate: 0                           # sum(first 6) − sum(last 2). Range [-10, +28].
                                             # Threshold +6 unless high-value artifact signal.

immediate_consequences: []                   # first-order — enforced by Phase 7 T3
  # - "if accepted, this festival gets named in EVERYDAY_LIFE.md"
  # - "monastic calendar annotations become a recognizable artifact class"

longer_term_consequences: []                 # second-order and beyond — T3 requires ≥2 domains
  # - "year-counting as a specialized skill alters clerical labor structure"
  # - "disputes over calendrical accuracy become a political axis"

likely_required_downstream_updates: []       # world files canon-addition would update on accept
  # - EVERYDAY_LIFE.md
  # - INSTITUTIONS.md
  # - TIMELINE.md

risks: []                                    # per Phase 4 + narrator-reliability constraints
  # - "may over-centralize the author's monastic order in world cosmology"
  # - "contested_canon framing must be preserved if accepted"

canon_safety_check:                          # full Phase 6 audit trail — Phase 7 T5 checks completeness
  invariants_respected: []                   # every invariant id tested at 6a, pass
  invariants_violated: []                    # every invariant id tested at 6a, fail (must be empty for write)
  mystery_reserve_firewall: []               # every MR id checked at 6b (overlap or not — absent id = un-checked)
    # - { mr_id: MR-0003, overlap: false, note: "claim does not touch forbidden-answer set" }
    # - { mr_id: MR-0007, overlap: false, note: "claim adjacent but does not resolve" }
  distribution_discipline:
    canon_facts_consulted: []                # every CF id consulted at 6c
    why_not_universal_basis: ""              # one-line: what anchors the stabilizers to canon
  diegetic_to_world_laundering:              # Phase 6d three sub-tests — mining-specific
    evidence_breadth:
      test_result: pass                      # pass | partial | fail
                                             #   pass    = full support (CFs/domain-file prose commit the fact
                                             #             independently); any proposed_status defensible.
                                             #   partial = existing CFs commit the mechanic partially, card
                                             #             specifies operational detail; artifact sole-source
                                             #             FOR THE SPECIFICATION; proposed_status = soft_canon
                                             #             with adjudication-appetite flagged higher.
                                             #   fail    = sole source; proposed_status MUST be soft_canon
                                             #             or contested_canon (or card rejected at 6f).
      independent_evidence: []               # CF ids or domain-file prose confirming support. Populated for
                                             # pass (full independent commitment) and partial (partial-
                                             # supporting CFs); typically empty for fail (pure sole-source).
      rationale: ""                          # For partial: name the specification-delta (what the artifact
                                             # adds beyond the partial-supporting CFs). For fail: name the
                                             # sole-source pathway and confirm proposed_status is demoted.
    epistemic_horizon:
      test_result: pass                      # pass | fail
      author_position_consulted: []          # PEOPLES_AND_SPECIES.md / GEOGRAPHY.md / INSTITUTIONS.md
                                             # entries used to establish plausible reach
      rationale: ""
    mr_positional:
      test_result: pass                      # pass | fail (fail = card rejected + batch-level flag)
      mr_ids_checked_positionally: []        # every MR id whose forbidden-answer set the author's
                                             # world-position could plausibly have accessed
      rationale: ""
  repairs_applied: []                        # every Phase 6f repair fired on this card
    # - { sub_check: 6d.1, repair_type: demote_to_soft_canon, justification: "..." }

source_basis:
  world_slug: ""
  batch_id: BATCH-0000
  source_artifact_id: DA-0000
  derived_from_artifact_path: ""             # full path — e.g., worlds/<slug>/diegetic-artifacts/<da-slug>.md
  generated_date: ""                         # ISO date
  user_approved: false                       # set true at Phase 8 commit — means "kept in batch after
                                             # review", NOT "canonized"
  derived_from_cfs: []                       # parent CF ids if the claim extends existing canon

notes: >
  Free-form notes. Phase 6f repairs applied to this card (if any) are recorded here
  in the form: "Phase 6f repair: <sub-check-id> — <repair-type> — <justification>".
  Also: narrator-reliability edge cases, cross-artifact signals that informed 6d.1
  evidence-breadth, canon-addition adjudication-appetite hints.
---

# <title>

## What the Artifact Implies

<Prose: the specific moment, phrase, or implicit assumption in the source artifact
that surfaced this candidate fact. Cite artifact line/paragraph or quote verbatim
where brief. This is the claim-extraction trace made legible — the canon-addition
adjudicator needs to see *what the author said* that produced this card.>

## Why It Fits This World

<Prose: how this card honors the world's genre contract, tonal contract, chronotope,
and core pressures. One paragraph. Cite WORLD_KERNEL / INVARIANTS / domain-file
sections that anchor the fit.>

## Narrator Reliability Assessment

<Prose expansion of the frontmatter narrator_reliability_basis block. Name the
author (lifting from artifact frontmatter if generated by diegetic-artifact-
generation, or inferring from voice if hand-authored). Explain why the stance,
centrality, and cross-reference findings produced this proposed_status.>

## Immediate Consequences

<Prose expansion of frontmatter immediate_consequences — ordinary-life signals
this fact would produce within days-to-months of acceptance.>

## Longer-Term Consequences

<Prose expansion of longer_term_consequences — structural effects over years.
Must trace through at least two of the 14 Rule-2 domains.>

## Risks

<Prose: specific world-integrity risks if this card is accepted. Name invariants
that would come under stress; name MR entries requiring firewall discipline
during canon-addition's adjudication.>

## Likely Burden If Accepted

<One paragraph on the scope of world-file updates canon-addition would likely
`required_world_updates`. Calibrate against integration_burden score.>

## Likely Story Yield

<One paragraph naming concrete story engines this card would activate. Draw from
WORLD_KERNEL §Natural Story Engines.>

## Would This Be Better As

<Final recommendation line: hard_canon / soft_canon (regional) / contested_canon —
matching frontmatter proposed_status. If the recommendation is *other than* the
frontmatter status, explain why.>

## Canon Safety Check Trace

**Phase 6a (Invariants)**: <which invariants tested, pass/fail per invariant.>

**Phase 6b (Mystery Reserve Content Firewall)**: <every MR entry checked, overlap
status per entry, note any narrowing/shaping effects.>

**Phase 6c (Distribution Discipline)**: <CFs consulted, why_not_universal rationale,
rumor carve-out if social=rumor.>

**Phase 6d (Diegetic-to-World Laundering)**:
- **6d.1 Evidence-breadth**: <sole-source vs cross-referenced finding, impact on proposed_status.>
- **6d.2 Epistemic-horizon**: <author's plausible reach, scope narrowing if applicable.>
- **6d.3 MR Positional**: <author's world-position vs MR forbidden-answer sets, any positional flags.>

**Phase 6f Repairs Applied** (if any): <each repair with sub-check-id, repair-type,
justification — duplicates frontmatter notes field.>
