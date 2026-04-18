---
# EXAMPLE proposal card, adapted from the reference proposal's "The False Taxonomy"
# worked example. ILLUSTRATIVE — assumes a generic world where corruption is a real
# material phenomenon and where a religious-scholarly establishment exists.
#
# Demonstrates: contested_canon posture + institutional-and-epistemic card +
# Rule 7 firewall (explicitly does NOT resolve whether the dominant belief is
# right) + Family 6 (Misinterpretation Facts) usage.

proposal_id: PR-0002
batch_id: BATCH-0001
slug: the-false-taxonomy
title: "The False Taxonomy"

canon_fact_statement: >
  The dominant scholarly tradition classifies some corruption effects as moral
  punishment rather than material contamination, and this misclassification is
  enshrined in legal doctrine across most civilized polities.

proposed_status: contested_canon
type: belief

enrichment_category: H                        # Contested Knowledge
proposal_family: 6                            # Misinterpretation Facts

domains_touched:
  - law
  - religion
  - medicine
  - ideology
  - daily_life                                # shapes how ordinary accusations and trials unfold
  - language                                  # the taxonomy shapes vocabulary for corruption

recommended_scope:
  geographic: global                          # civilization-level doctrine
  temporal: current                           # with historical roots (see longer_term_consequences)
  social: elite                               # the doctrine is propagated by scholarly / priestly elites;
                                              # local dissent exists in specific regions

why_not_universal:
  - "local folk traditions in peripheral regions preserve the material-contamination view"
  - "a dissenting scholarly minority exists, largely suppressed but not extinct"
  - "the doctrine's reach is institutional, not ontological — ordinary people follow it because law requires it, not because they have investigated"

scores:
  coherence: 5
  propagation_value: 4
  story_yield: 5
  distinctiveness: 5                          # epistemic friction is rare and valuable
  ordinary_life_relevance: 4
  mystery_preservation: 5                     # preserves the question of what corruption truly is
  integration_burden: 2                       # low-medium — requires careful diegetic handling, not massive retcons
  redundancy_risk: 1

score_aggregate: 25                           # (5+4+5+5+4+5) − (2+1) = 25

immediate_consequences:
  - "Wrongful executions occur when corruption-afflicted individuals are tried as morally tainted rather than materially contaminated."
  - "Priest-physician conflict emerges — some healers privately treat the material-contamination view, creating friction with the ordained classification."
  - "Legal doctrine cites the moral-taxonomy view as settled; defense lawyers arguing contamination face charges of heresy."

longer_term_consequences:
  - "Political disputes over jurisdictional authority (priestly vs medical) intensify in regions where outbreak pressure tests the doctrine."
  - "Social stigma against corruption-afflicted families is reinforced across generations."
  - "Investigative plots become natural story engines — a detective, a scholar, or a heretic seeking to prove the material view runs afoul of the institutional consensus."
  - "A dissenting-scholar underground preserves texts and methods that may later resurface."

likely_required_downstream_updates:
  - INSTITUTIONS.md                            # religious-legal classification of corruption
  - EVERYDAY_LIFE.md                           # how ordinary people encounter the doctrine
  - CANON_LEDGER.md                            # record of the doctrine itself as contested-canon

risks:
  - "requires careful diegetic handling: the card makes the DOMINANT view false, but the world must not objectively confirm the dissenting view either — that would resolve a Mystery Reserve entry"
  - "potential entanglement with MR-0001 (origin of corrupting relics) if dissenting view becomes too specific"
  - "tonal risk: the world already leans grim; adding systemic wrongful-execution pressure must not tip into farce"

canon_safety_check:
  invariants_respected:
    - INV-0001                                # corruption spreads through intimacy, not distance — untouched
    - INV-0002                                # magic always exacts a cost — untouched
    - INV-0005                                # example: "institutional power rests on textual authority" — this card REINFORCES this invariant
  mystery_reserve_firewall:
    - MR-0001                                 # "origin of corrupting relics" — NO OVERLAP; this card states a belief is wrong, not what the true answer is
    - MR-0002                                 # example: "whether corruption has a moral component at all" — ADJACENT; this card claims the dominant institutional answer is wrong BUT does not claim moral and material aspects are mutually exclusive
  distribution_discipline:
    canon_facts_consulted:
      - CF-0003                               # existing CF establishing corrupting-relic material hazard
      - CF-0007                               # example: existing CF establishing scholarly-priestly authority

source_basis:
  world_slug: example-world
  batch_id: BATCH-0001
  generated_date: 2026-04-18
  user_approved: false                        # this is a template example, not a real emission
  derived_from_cfs:
    - CF-0003
    - CF-0007

notes: >
  This card is a Family-6 (Misinterpretation Facts) proposal and a canonical example
  of why contested_canon is the right posture: the world TRACKS that the doctrine
  is wrong, but in-world characters overwhelmingly believe it, act on it, and die
  by it. The card adds epistemic friction without forcing a new objective claim —
  honoring Rule 7 (Preserve Mystery Deliberately) because it leaves the deeper
  question of corruption's nature inside the Mystery Reserve.

  The Phase 7b firewall audit is the critical safety check here: the card must
  state "dominant doctrine is wrong" without stating "the correct answer is X" —
  any attempt to resolve MR-0002 would force Phase 7e repair via
  reclassification-to-mystery-reserve or drop-from-batch.

  If this card is later accepted by canon-addition, the resulting CF Record should
  preserve the non-resolution stance: contested_canon status, diegetic_status:
  disputed, and an explicit notes section explaining the MR-0002 firewall.
---

# The False Taxonomy

## What It Deepens

Adds **epistemic friction** to the world's handling of corruption: the dominant classification is wrong, but institutional weight sustains it. Makes law, religion, medicine, and ideology collide without forcing an objective resolution. Perfect for Family-6 (Misinterpretation Facts) — the world is enriched not by new stuff, but by a newly-visible flaw in what people already think they know.

## Why It Fits This World

Honors the tonal contract: power in this world decays what it touches, and knowledge is no exception. Priestly authority's monopoly on the corruption question produces exactly the kind of wrongful certainty that a grim world generates naturally. The doctrine's reach is institutional — ordinary people follow it because law requires it, not because they have investigated.

## Immediate Consequences

Wrongful executions occur when corruption-afflicted individuals are tried as morally tainted. Priest-physician conflict emerges privately — some healers treat patients on the material-contamination view while publicly deferring to the doctrine. Defense lawyers arguing the material view face charges of heresy, creating legal self-censorship.

## Longer-Term Consequences

In regions where outbreak pressure tests the doctrine, political disputes intensify: medical guilds agitate for autonomy, priestly authorities push back with textual tradition, rulers find themselves adjudicating between them. Social stigma against corruption-afflicted families is reinforced across generations, shaping kinship and inheritance patterns. Investigative plots become natural story engines — any character who attempts to prove the material view runs directly into institutional opposition. A dissenting-scholar underground preserves texts and methods, hiding its conclusions in plain sight.

## Risks

The critical risk is **Rule 7 boundary discipline**. This card makes the dominant view *wrong* without claiming the correct view is known. Any attempt to specify the true nature of corruption would touch Mystery Reserve entry MR-0002. Phase 7b firewall audit confirms the adjacency but no overlap; future drift (e.g., characters "proving" the material view decisively) would require vigilance during `canon-addition`'s adjudication.

Tonal risk is real but manageable: the wrongful-execution consequence is grim but structurally contained to specific trial contexts, not ambient.

## Likely Burden If Accepted

Low-medium. The doctrine enters `INSTITUTIONS.md` as a religious-legal classification; `EVERYDAY_LIFE.md` gets a short section on how ordinary people encounter it (trials, inquests, accusations). The CF Record itself carries contested_canon status, so no world-level truth claim is made — the burden is primarily about prose threading, not retcon.

## Likely Story Yield

Very high. Natural story engines activated: (1) the detective protagonist who accumulates evidence of institutional wrong; (2) the heretic-scholar facing excommunication; (3) the priest-physician whose private practice contradicts their public doctrine; (4) the ruler forced to choose between traditional authority and outbreak evidence; (5) the afflicted family navigating social erasure. Five narrative wells from one contested-canon fact.

## Would This Be Better As

Contested canon — civilization-level doctrine with local dissent. NOT hard canon (that would resolve MR-0002 downstream), NOT mystery reserve (the doctrine's existence and its flaw are both world-level facts; only the corruption's true nature remains reserved).

## Canon Safety Check Trace

**Phase 7a (Invariants)**: Tested against all invariants. INV-0001 (corruption spreads through intimacy, not distance) — untouched. INV-0002 (magic always exacts a cost) — untouched. INV-0005 ("institutional power rests on textual authority") — **reinforced**: the card's very plot is an illustration of this invariant, where textual authority outlasts evidence.

**Phase 7b (Mystery Reserve Firewall)**: MR-0001 ("origin of corrupting relics") checked — **no overlap**. This card says a belief about corruption is institutionally wrong; it makes no claim about where corrupting relics come from. MR-0002 ("whether corruption has a moral component at all") — **adjacent**: the card states the dominant *institutional doctrine* is wrong, but does NOT claim moral and material aspects are mutually exclusive. The correct view remains reserved. This is the Rule 7 firewall functioning as designed.

**Phase 7c (Distribution Discipline)**: CF-0003 (corrupting-relic material hazard) and CF-0007 (scholarly-priestly authority) consulted. `recommended_scope: global / elite` is justified: the doctrine is a civilization-level institutional product with local dissent and elite propagation. `why_not_universal` explicitly names local-folk counter-traditions and the scholarly-minority dissent — no silent universalization.

**Phase 7e Repairs Applied**: None. Passed 7a/7b/7c on first emission.
