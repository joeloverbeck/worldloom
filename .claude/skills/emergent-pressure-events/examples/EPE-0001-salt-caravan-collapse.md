---
# EXAMPLE pressure-event card — illustrative emission for a generic
# post-catastrophe world where corrupting relics are a hard-canon hazard
# (the same world-shape used by propose-new-canon-facts's example cards
# PR-0001-grave-wardens-of-salt and PR-0002-the-false-taxonomy).
#
# This card is canonize-routed and DOES emit a sidecar — see the
# proposal_card_extract block at the bottom of the frontmatter, plus the
# implied sidecar file EPE-0001-salt-caravan-collapse.proposal.md (not
# included in this examples/ directory; canon-addition would consume that
# sidecar's path, not this card's path).
#
# Demonstrates: trade_collapse origin_type + canonize routing + sidecar
# emission + Rule 4 discipline via scope.geographic=regional + Rule 5
# discipline via populated immediate + longer-term consequence fields.

event_id: EPE-0001
batch_id: BATCH-0001
slug: salt-caravan-collapse
title: "Salt Caravan Collapse on the Iron Roads"

event_seed: >
  The summer salt-caravans from the coastal evaporation pans to the inland
  warden-cities have failed for the second consecutive year, this time owing
  to combined raider pressure and a brackish-tide season that ruined the
  pan harvest. Warden-cities entering the autumn relic-exhumation calendar
  with one-third their normal salt reserves now face triage: which graves
  get the prescribed salt-and-iron packing, and which receive a substituted
  ash-and-iron mix whose efficacy against corrupting relics is contested.

origin_type: trade_collapse

traceability:
  cited_canon_facts:
    - CF-0001                                # corrupting-relic hazard (hard canon)
    - CF-0014                                # warden-caste salt-and-iron grave-packing protocol
    - CF-0027                                # coastal evaporation pans as sole regional salt source
  cited_institutions:
    - "warden caste"
    - "coastal pan-keepers' guild"
    - "iron-road caravan compacts"
  cited_material_conditions:
    - SEC-ECR-003                            # regional salt economy
    - SEC-GEO-007                            # iron-road caravan corridor description
  cited_pressures:
    - "raider pressure on iron-road caravan corridor"
    - "brackish-tide pan-harvest failure"
    - "warden-city autumn exhumation calendar"

actors_involved:
  - "warden-caste exhumation officers"
  - "coastal pan-keepers' guild"
  - "iron-road caravan compacts"
  - "raider bands operating on the central iron-road"
  - "ash-substitution proponents (heterodox warden faction)"
  - "ordinary grieving families"

what_changes_immediately:
  - "warden-cities ration salt-and-iron packing to high-status graves only"
  - "ash-and-iron substitution licensed under emergency dispensation in three warden-cities"
  - "caravan-compact insurance rates double; some routes refuse contracts"
  - "ordinary families paying salt-bribes for proper grave packing; black market in salt emerges"

what_might_change_if_unchecked:
  - "ash-substitution's contested efficacy creates a generation of graves whose corruption-resistance is unproven"
  - "warden-caste authority fractures along orthodox/heterodox lines; political legitimacy of regional authorities erodes"
  - "salt becomes a politically charged resource with strategic-reserve dynamics"
  - "raider bands gain leverage to extract concessions or recognition from warden-cities desperate for caravan throughput"

who_benefits:
  - "raider bands (extortion leverage + black-market salt distribution)"
  - "ash-substitution proponents (theological legitimacy gained through emergency dispensation)"
  - "wealthy families (priority salt allocation maintains their funeral status)"

who_suffers:
  - "ordinary families (ash-substituted graves of unproven efficacy)"
  - "coastal pan-keepers (brackish-tide ruin + raider depredations)"
  - "orthodox warden-caste authority (legitimacy challenged)"

rumor_waves:
  - "the ash-mix is just as good and the wardens always knew it"
  - "the corrupted dead are walking near the eastern warden-city"
  - "the raider compact is taking salt-tribute and selling to wealthy families directly"
  - "the brackish tide was sent by the false god of the iron-road"

mysteries_touched: []                        # no overlap with M records in this illustrative world's reserve

scope:
  geographic: regional                       # affects relic-threatened regions; coastal pans are
                                             # geographically constrained
  temporal: acute                            # this autumn's exhumation calendar; not yet chronic
  why_not_universal:
    - "depends on regional presence of corrupting relics + warden-caste exhumation calendar"
    - "salt-trade collapse mechanism specific to coastal-pan + iron-road caravan dependency"
    - "ash-substitution dispensation is a regional warden-council decision, not a global law"

downstream_routing: canonize
routing_rationale: >
  The event implies a lasting institutional change (emergency ash-substitution
  dispensation creating heterodox warden faction) that other canon will rely
  on. Direct canon-addition routing is appropriate — the canon-fact-shape
  is single (a regional emergency dispensation establishes the heterodox
  ash-substitution legitimacy precedent), not multi-faceted, so the sidecar
  is parse-ready without first routing through propose-new-canon-facts.

proposal_card_extract:
  proposal_id: PR-0042
  canon_fact_statement: >
    During regional salt-supply emergencies, warden-caste regional councils
    may license ash-and-iron grave-packing as an emergency substitute for
    salt-and-iron, creating a heterodox practice whose corruption-resistance
    efficacy is contested but whose institutional legitimacy is established
    by precedent.
  proposed_status: soft_canon                # regional, not global; an emergency dispensation
                                             # mechanism, not a universal practice
  type: institution
  domains_touched:
    - law
    - religion
    - economy
    - status_signaling
    - everyday_life
  recommended_scope:
    geographic: regional
    temporal: current
    social: public                           # the dispensation is openly licensed though contested
  why_not_universal:
    - "depends on regional warden-caste authority structure"
    - "requires existing salt-and-iron packing as the normative practice being substituted"
    - "emergency-dispensation mechanism specific to council-governed regions"
  immediate_consequences:
    - "ash-substitution licensed under emergency dispensation in three warden-cities"
    - "warden-caste authority fractures along orthodox/heterodox lines"
    - "wealthy families maintain salt-priority while ordinary families receive ash-substituted packing"
  longer_term_consequences:
    - "heterodox warden faction gains legitimacy through institutional precedent"
    - "ash-substitution's contested efficacy produces a cohort of graves whose corruption-resistance is unproven"
    - "regional salt economies acquire strategic-reserve dynamics with political weight"
  enrichment_category: derived_from_epe
  proposal_family: 0

canon_safety_flags:
  invariants_tested:
    - INV-CAU-001                            # corruption spreads through proximity to unsealed graves
    - INV-DIS-002                            # warden-caste authority is regionally constrained
    - INV-SOC-004                            # warden practice is hereditary, not by decree
  mystery_reserve_firewall: []               # no MR overlap in this illustrative world
  distribution_discipline:
    canon_facts_consulted:
      - CF-0001
      - CF-0014
      - CF-0027
  invariant_conformance: pass
  mystery_reserve_firewall_status: pass
  distribution_discipline_status: pass

recurrence_flag: null                        # first occurrence in this illustrative world

status: active

source_basis:
  world_slug: post-catastrophe-relic-world
  batch_id: BATCH-0001
  generated_date: 2026-04-30
  user_approved: true                        # set at Phase 8 commit — "kept in batch", NOT canonized

notes: >
  Illustrative example. Phase 6e applied no repairs to this card; pre-validation
  of proposal_card_extract passed on first attempt because the canon-fact-shape
  distilled cleanly into a single regional-soft-canon institution fact. A real
  emission against a specific world would also populate mysteries_touched if the
  world's MR contained relevant entries (e.g., an M record about the origin of
  corrupting relics, which this event does not pre-empt).
---

# Salt Caravan Collapse on the Iron Roads

## Narrative Expansion

For the second consecutive summer, the salt-caravans linking the coastal
evaporation pans to the inland warden-cities have failed. Last year's failure
was a raider season — the iron-road caravan compacts had counted on the
warden-cities' autumn fees to recapitalize, and lost most of the haul to a
new raider compact operating from the central crossings. This year is worse:
the brackish-tide season ruined the pan harvest before the caravans even
loaded, and the salvaged take had to traverse the same raider-thickened
corridor with smaller escort budgets. By the autumn equinox, three of the
warden-cities had entered their relic-exhumation calendar with one-third
their normal salt reserves.

What follows is triage. Orthodox warden practice — the salt-and-iron
grave-packing of CF-0014 — cannot be extended to every grave in the
exhumation queue. The regional warden-councils have done what regional
councils sometimes do: they have issued emergency dispensations licensing
ash-and-iron substitution for ordinary graves, reserving the salt-and-iron
mixture for high-status interments. The ash-substitution proponents — a
heterodox warden faction with a generations-old theological argument that
ash bears the kindred-fire's purifying virtue equivalent to salt's
sea-virtue — have seized the dispensation as institutional legitimacy.
Orthodox warden voices argue (correctly, by their lights) that the
dispensation establishes a precedent the heterodox faction will not
relinquish when next year's caravans return.

The black market in salt has arrived already. Wealthy families pay
salt-bribes for proper packing; the coastal pan-keepers' guild now sells
direct to private buyers, bypassing the caravan compacts altogether. The
raider bands operating on the central iron-road have begun extracting
salt-tribute from caravan compacts in exchange for safe passage — a new
form of recognition that several warden-cities, desperate for any caravan
throughput, have tacitly endorsed.

## Consequence Propagation Notes

**First-order**: salt rationing across warden-city exhumation calendars,
ash-substitution licensed under emergency dispensation, doubled
caravan-compact insurance rates, ordinary-family salt-bribes, raider-band
salt-tribute extraction. These are visible within the current autumn
season.

**Second-order**: the heterodox warden faction acquires precedent-grounded
institutional legitimacy that orthodox voices cannot easily revoke; a
generation of ash-substituted graves enters the world with contested
corruption-resistance efficacy (the worry of CF-0001's corrupting relics
finds new purchase here); regional salt economies acquire strategic-reserve
dynamics that pan-keepers' guilds and warden-councils will not surrender
once caravan supply normalizes; raider bands gain a foothold of recognized
legitimacy within the iron-road compact structure that future raider
generations will inherit.

The pressure-inventory entries this event amplifies: raider pressure on
iron-road caravans (this is the second compounding year), brackish-tide
pan-harvest failure (acute and likely cyclical with climate trajectories
already in canon), warden-city autumn exhumation calendar inflexibility
(the institutional rigidity that forces dispensation rather than calendar
deferral).

## Routing Discussion

This card is routed `canonize` because the emergency-dispensation mechanism
establishes a lasting institutional precedent the world's other canon will
rely on (heterodox warden faction's legitimacy, regional salt strategic-reserve
dynamics, raider-band recognition pathways). The proposal_card_extract is
parse-ready for direct canon-addition consumption — the canon-fact-shape is
single (a regional soft-canon institution fact: emergency-dispensation
mechanism creates heterodox-practice legitimacy precedent), not multi-faceted,
so first routing through propose-new-canon-facts is unnecessary.

If re-routed `story_fuel`: the card would be a strong protagonist-collision
seed (a young warden caught between orthodox training and a heterodox-faction
recruiter, a pan-keeper family losing their compact contracts, a raider
captain weighing recognition vs. continued depredation). The pressure stays
visible, but the institutional precedent does not become canon. This routing
would be appropriate if the user wanted to preserve narrative flexibility —
keep the dispensation as an in-world contested event rather than a
canonized precedent.

If re-routed `ambient`: REJECTED. The event changes too many visible
consequence fields and touches institutional legitimacy too directly to
qualify as routine fluctuation. Phase 6b's ambient-on-mystery-edge check
would not fire (no MR overlap), but Phase 7 Test 1 would fail on the
"ambient routing requires mood-only consequences" threshold (this event's
consequences are structural, not atmospheric).

## Canon Safety Check Trace

**Phase 6a (Invariants)**: Tested against INV-CAU-001 (corruption spreads
through proximity to unsealed graves) — the ash-substitution mechanism's
contested efficacy means the invariant is preserved (graves are still
nominally sealed, just with substituted material), with the corruption-risk
specifically called out as a longer-term consequence. PASS. Tested against
INV-DIS-002 (warden-caste authority is regionally constrained) — the
dispensation explicitly stays at the regional warden-council level, no
global authority asserted. PASS. Tested against INV-SOC-004 (warden practice
is hereditary, not by decree) — the dispensation alters practice, not
caste membership; no decree-based recruitment to warden status. PASS.

**Phase 6b (Mystery Reserve Firewall)**: No MR records in this illustrative
world's reserve overlap with the event's actor / domain footprint. Empty
mysteries_touched is appropriate. PASS.

**Phase 6c (Distribution Discipline)**: scope.geographic = regional with
why_not_universal populated by three concrete stabilizers (regional warden
authority, salt-and-iron baseline practice prerequisite, council-governance
prerequisite). CFs consulted: CF-0001 (corrupting-relic hazard), CF-0014
(warden grave-packing protocol), CF-0027 (coastal pan salt source). No
contradiction with existing CFs' who_can_do_it sets. PASS.

**Phase 6e Repairs Applied**: None.
