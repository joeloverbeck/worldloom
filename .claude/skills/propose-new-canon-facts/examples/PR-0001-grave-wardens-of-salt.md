---
# EXAMPLE proposal card, adapted from the reference proposal's "Grave Wardens of Salt"
# worked example. This card is ILLUSTRATIVE — it assumes a generic post-catastrophe
# world where corrupting relics are a hard-canon hazard. A real emission would bind
# each field to specific world-file citations.
#
# Demonstrates: hard_canon posture + institutional-adaptation card + Rule 4 discipline
# via recommended_scope=regional + why_not_universal rationale.

proposal_id: PR-0001
batch_id: BATCH-0001
slug: grave-wardens-of-salt
title: "Grave Wardens of Salt"

canon_fact_statement: >
  In regions where corrupting relics are known, graves of the wealthy are packed
  with salt and iron filings, and a hereditary warden caste oversees legal
  exhumation under sworn oath to the regional authority.

proposed_status: hard_canon
type: institution

enrichment_category: C                        # Institutional Response
proposal_family: 2                            # Institutionalization Facts

domains_touched:
  - law
  - religion
  - economy
  - everyday_life
  - labor
  - status_signaling

recommended_scope:
  geographic: regional                        # not global — only relic-threatened regions
  temporal: current
  social: public                              # the practice is openly known, though the caste is closed

why_not_universal:
  - "requires known presence of corrupting relics in the region"
  - "demands sustained salt + iron-filings supply chain (coastal or mining adjacency)"
  - "warden caste is hereditary — cannot be spun up by decree"
  - "unaffected regions use ordinary inhumation"

scores:
  coherence: 5
  propagation_value: 5
  story_yield: 5
  distinctiveness: 4
  ordinary_life_relevance: 4
  mystery_preservation: 3                     # does not touch major MR entries
  integration_burden: 3                       # medium — requires funerary-law passages in affected regions
  redundancy_risk: 1                          # no existing CF covers relic-containment funerary practice

score_aggregate: 22                           # (5+5+5+4+4+3) − (3+1) = 22

immediate_consequences:
  - "Grave labor becomes a specialized, hereditary trade in affected regions."
  - "Funerary expense rises sharply across classes — salt becomes a prestige commodity."
  - "Relic smuggling routes acquire a new disposal pathway (re-inhumation under warden oversight)."
  - "Legal exhumation becomes a formal procedure with warden witness required."

longer_term_consequences:
  - "Inheritance law adapts to the new grave-cost burden: estates pre-allocate salt reserves."
  - "Anti-graverobber violence is normalized and ritualized in affected regions."
  - "A sacred-impurity taboo extends outward from grave sites, reshaping settlement patterns."
  - "Warden caste develops regional political influence via their monopoly on legal exhumation."

likely_required_downstream_updates:
  - INSTITUTIONS.md
  - ECONOMY_AND_RESOURCES.md
  - EVERYDAY_LIFE.md
  - TIMELINE.md

risks:
  - "may require rethinking prior burial customs documented in EVERYDAY_LIFE.md"
  - "could over-centralize religious authority if warden oath structure is misjudged"
  - "salt-commodity inflation could cascade into economic retcons if existing trade routes assumed cheap salt"

canon_safety_check:
  invariants_respected:
    - INV-0001                                # example: "corruption spreads through intimacy, not distance"
    - INV-0002                                # example: "magic always exacts a cost" (salt/iron-filings ritual IS the cost)
  mystery_reserve_firewall:
    - MR-0001                                 # example: "origin of corrupting relics" — NO OVERLAP; this card treats corruption as mundane hazard, not origin claim
  distribution_discipline:
    canon_facts_consulted:
      - CF-0003                               # example: existing CF establishing corrupting-relic material hazard

source_basis:
  world_slug: example-world
  batch_id: BATCH-0001
  generated_date: 2026-04-18
  user_approved: false                        # this is a template example, not a real emission
  derived_from_cfs:
    - CF-0003

notes: >
  This card fits the "Institutionalization Facts" family (Proposal Family 2) —
  converts an existing abstract hazard (artifact corruption) into ordinary social
  practice with a visible hereditary caste, a trade, and a law surface. It honors
  Rule 2 (changes labor, law, religion, economy, everyday life, status signaling —
  six domains touched). Rule 3 is respected via the why_not_universal rationale.
  Rule 4 is respected via recommended_scope=regional with explicit geographic gate.
  Rule 5 is respected via two orders of consequences + four downstream updates.
  Rule 7 is respected via MR firewall audit showing no overlap with mystery-reserve
  entries — this card does NOT claim to answer where corruption comes from, only
  how settlements have adapted to it.
---

# Grave Wardens of Salt

## What It Deepens

Converts artifact corruption from an abstract environmental hazard into **ordinary social practice**: a hereditary trade, a funerary legal procedure, a salt-commodity economy, and a class-stratified grave-cost burden. Makes corruption visible in everyday life without resolving the mystery of where it comes from.

## Why It Fits This World

Honors the world's grim tonal contract: heroism is not clean, and the dead are not at peace. The practice is labor-intensive, expensive, and socially stratifying — exactly the kind of institutional response a post-catastrophe world *must* generate under sustained relic pressure. The warden caste's hereditary closure is a social invariant in miniature: corruption-handling becomes a kinship-bound profession.

## Immediate Consequences

Grave labor specializes into a distinct hereditary trade. Funerary expense rises sharply across all classes as salt and iron-filings become funerary staples — the commodity's pre-existing utility is now competing with its ritual demand. Relic smuggling routes acquire a new disposal pathway: a smuggler with access to wardens can discreetly re-inhumate a cursed object under legal oversight, creating a black-market variant of the legitimate practice. Legal exhumation becomes a formal procedure requiring warden witness.

## Longer-Term Consequences

Inheritance law adapts as wealthy households pre-allocate salt reserves alongside traditional bequests. Anti-graverobber violence becomes not just permitted but ritually sanctioned — wardens carry oath-bound authority to execute on sight. Sacred-impurity taboos extend outward from grave sites, reshaping settlement patterns: cemeteries become exurban buffers, and real-estate value inverts near burial grounds. Over generations, the warden caste's monopoly on legal exhumation yields regional political influence disproportionate to their numbers.

## Risks

The six prior domains touched may need prose additions to `EVERYDAY_LIFE.md` and `INSTITUTIONS.md`. If existing world prose has documented burial customs in affected regions as simple inhumation, those passages require revision (`integration_burden: 3`). Salt commodity inflation could cascade: any existing trade-route CFs assuming cheap salt will need re-examination under `canon-addition`'s Phase 5 diffusion analysis.

The Mystery Reserve entry MR-0001 ("origin of corrupting relics") is adjacent but **not compromised** — this card treats corruption as mundane hazard, not origin claim. Phase 7b firewall audit confirms no overlap.

## Likely Burden If Accepted

Medium. Prose additions to `INSTITUTIONS.md` (warden caste), `ECONOMY_AND_RESOURCES.md` (salt pricing, grave labor), `EVERYDAY_LIFE.md` (funerary practice by region/class), `TIMELINE.md` (when the practice first consolidated — likely tied to an existing catastrophe event). No invariant revisions required.

## Likely Story Yield

High. Natural story engines activated: (1) warden-vs-graverobber conflicts with legal-but-deadly stakes; (2) smugglers seeking warden complicity; (3) inheritance disputes where salt reserves become a contested asset; (4) wardens as investigative figures with privileged access to the dead; (5) class friction when the poor cannot afford the salt rite and must settle for lesser burials.

## Would This Be Better As

Hard canon (regional). The practice is objective, institutional, and publicly known within its geographic scope — not a contested belief, not a rumor, not mystery-reserve material.

## Canon Safety Check Trace

**Phase 7a (Invariants)**: Tested against all invariants. INV-0001 (corruption spreads through intimacy, not distance) — respected: the salt-iron ritual is containment, not distance-gating. INV-0002 (magic always exacts a cost) — respected: the ritual IS the cost, paid in labor, commodity, and social stratification. No ontological, distribution, social, or aesthetic invariants violated.

**Phase 7b (Mystery Reserve Firewall)**: MR-0001 ("origin of corrupting relics") checked — **no overlap**. This card treats corruption as a known hazard to be contained; it makes no claim about where corruption comes from. Additional MR entries if present would be checked identically; this example shows only the adjacent one.

**Phase 7c (Distribution Discipline)**: CF-0003 (corrupting-relic material hazard) consulted. `recommended_scope: regional` is justified by why_not_universal: the practice requires known relic presence + salt/iron supply + hereditary caste — unaffected regions use ordinary inhumation. No silent universalization.

**Phase 7e Repairs Applied**: None. The card passed 7a/7b/7c on first emission.
