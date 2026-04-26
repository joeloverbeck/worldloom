---
pa_id: PA-0016
date: 2026-04-20
verdict: ACCEPT_WITH_REQUIRED_UPDATES
originating_skill: canon-addition
change_id: CH-0017
cf_records_touched: [CF-0045, CF-0017]
mystery_reserve_touched: []
invariants_touched: []
open_questions_touched: []
---

# PA-0016 — Adjudication Record

# Proposal

PR-0014 proposes canonizing "lock-night" as a named bardic-performance occasion at canal-corridor lockside taverns in the canal-heartland (and selected canal-adjacent heartland) towns — a sub-occasion within CF-0017's bardic-tavern institutional frame, distinct from ordinary tavern-night by audience composition (canal-labor heavy), temporal anchor (lock-closure hour), and pay register (customary silver above middling tavern-night rate). The proposal originates from BATCH-0003 mining of DA-0001 (Vespera Nightwhisper's travelogue *A Season on the Circuit*), where the author's firsthand statement *"I played the lock-night at a town I can only call 'the one with the green shutters' and took silver enough to drink for a week"* is marked `canonically_true` in the artifact's claim_map with cf_refs [CF-0017, CF-0009]. Proposal-requested status `soft_canon`; proposed scope `regional / current / public`. Proposal self-assessed `coherence: 5, propagation_value: 2, story_yield: 3, distinctiveness: 4, ordinary_life_relevance: 3, mystery_preservation: 5, integration_burden: 2, redundancy_risk: 2` (aggregate 18).

# Phase 0-11 Analysis

## Phase 0 — Normalize the Proposal

**Input shape**: new-fact proposal (not a retcon-proposal card); emitted by `propose-new-canon-facts` at BATCH-0003 with proposal-side `canon_safety_check` self-assessment block.

**Underlying world-change**: a named bardic-performance OCCASION — "lock-night" — within CF-0017's bardic-tavern institutional frame, characterized by:
- temporal anchor: lock-closure hour (evening, driven by lockmaster-crew end-of-shift);
- audience composition: canal-labor heavy (lockmaster-crew, barge-layover travelers, wharf-traders), reduced tavern-regular presence;
- pay register: customary silver above middling tavern-night rate;
- repertoire bias: canal-infrastructure-keyed, canal-labor ballads, short-form material suited to tired laborers;
- institutional texture: informal lockmaster / tavern-keeper coordination on lock-closure-hour scheduling.

**Fact-type classification** (per proposal-normalization.md tie-break rubric):
- Primary: `institution` — a named occasion-class with institutional texture (distinct audience register, pay differential, coordinative mechanism) within CF-0017's parent institution.
- Secondary tags: `text_tradition` (lock-night accretes sub-genre material within CF-0017 repertoire) and `daily_routine` (canal-heartland everyday-life register). These are captured in the CF's cross-cutting notes rather than as separate `type` commitments — primary is `institution` per tie-break.

**Domains touched** (canonical enum + established ledger extensions): `economy`, `settlement_life`, `language`, `status_signaling`. All four labels present in existing ledger usage (CF-0017, CF-0024, CF-0038 domain sets).

**Selective domain-file loads** executed at pre-flight (canal-institutional-texture cluster): CF-0015 (canal network), CF-0017 (bardic-tavern economy), CF-0024 (lockmaster posting-wall / contractor stratum), CF-0038 (Brinewick canal-circuit quarter-year rotation); INSTITUTIONS.md §Trade/Guilds and §Recordkeeping; EVERYDAY_LIFE.md §(a) Canal-Town Heartland; ECONOMY_AND_RESOURCES.md §Wealth Creation + §Service work; MYSTERY_RESERVE.md M-7 and M-19; OPEN_QUESTIONS.md section enumeration.

**Diegetic pre-figuring confirmed**: pre-flight pre-figuring scan (mandatory per SKILL.md when proposal names specific entities) located the lock-night claim in DA-0001 (`a-season-on-the-circuit.md`) claim_map at `canon_status: canonically_true` with `cf_refs: [CF-0017, CF-0009]` and body text at line 362 (*"I played the lock-night at a town I can only call 'the one with the green shutters' and took silver enough to drink for a week. I drank it mostly in one."*). Per Rule 6 (No Silent Retcons) audit-trail preservation, the new CF MUST cite DA-0001 in `source_basis.derived_from`.

**Proposal self-assessment treated as advisory input**, not findings. Independent verification of invariants and Mystery Reserve firewalls run in Phase 2 and Phase 9.

## Phase 1 — Scope Detection

**Stated scope** (proposal): `regional / current / public`.

**Logical scope** (my derivation): wherever (canal-lock infrastructure per CF-0015) + (CF-0017 tavern/bardic activity) + (canal-corridor labor density) intersect. Mapping:
- Canal-heartland towns with lock infrastructure — primary domain.
- Selected canal-adjacent heartland towns with working locks — secondary domain, consistent with CF-0017's declared scope profile.
- Brinewick explicitly an exemplar (CF-0038 commits canal-circuit quarter-year rotation at heartland exemplar density; lock-night coexists with but is NOT the rotation).
- Highland clan-holds, drylands-core caravan-stops, fenlands-core stilt-villages — excluded; canal-infrastructure-sparse or canal-infrastructure-absent.
- Non-canal heartland market-towns — excluded; no lock infrastructure.

**Scope verdict**: `regional / current / public` is accurate. The stated scope aligns with logical scope. Stabilizer structure is non-trivial and physically / institutionally anchored (not normative-only).

## Phase 2 — Invariant Check

All 16 invariants tested against the proposed CF:

| Invariant | Result | Rationale |
|-----------|--------|-----------|
| ONT-1 (sentience biological) | COMPATIBLE | lock-night performers are sentient cat-folk / other species circuit-bards; no disembodied agency |
| ONT-2 (magic only as artifact) | COMPATIBLE | no magical effect claimed; lock-night is mundane labor in mundane venues |
| ONT-3 (no interbreeding) | COMPATIBLE | no reproductive claim |
| CAU-1 (artifacts always cost) | COMPATIBLE | no artifact in commitment surface |
| CAU-2 (corruption signals) | COMPATIBLE | no artifact fallout claimed |
| CAU-3 (ward-speech restricted) | COMPATIBLE | lock-night is performance, not ward-specifics |
| DIS-1 (artifacts routinely found) | COMPATIBLE | no artifact-distribution claim |
| DIS-2 (literacy partial) | COMPATIBLE | no literacy constraint |
| DIS-3 (mythic-species rare) | COMPATIBLE | no species-distribution claim |
| SOC-1 (animal-folk any class) | COMPATIBLE | performers, audiences, lockmasters can be any species (CF-0015 beaver-folk canal-engineering concentration noted, no species-exclusion) |
| SOC-2 (public adult barter) | COMPATIBLE | not touched |
| SOC-3 (coin contract sacred) | COMPATIBLE | silver-differential pay register enforced by SOC-3 coin-contract custom |
| SOC-4 (artifact extraction guild-licensed) | COMPATIBLE | lock-night is CF-0017 bardic labor, not artifact-handling |
| AES-1 (heroism = coin and scars) | COMPATIBLE | "took silver enough to drink for a week" — dryly pragmatic, not heroic register |
| AES-2 (ordinary world honest) | COMPATIBLE | lock-night foregrounds ordinary canal-labor texture |
| AES-3 (magic/contamination allied) | COMPATIBLE | no magical content; not engaged |

**Verdict**: all 16 invariants compatible. No invariant revision required. No new invariant-level rule introduced.

## Phase 3 — Underlying Capability / Constraint Analysis

Lock-night is not a capability in the artifact-handling sense; it is an **institutional occasion-class**. The underlying substrate:

- **Infrastructural substrate**: canal-lock infrastructure (CF-0015) + tavern venue proximate to the lock (CF-0017) + canal-labor density sufficient to populate the audience. All three are pre-committed at canal-heartland band scope.
- **Social substrate**: lockmaster-crew with periodic end-of-shift rhythm (implicit in CF-0015 + CF-0024 lockmaster posting-wall institutional shape); barge-layover travelers; wharf-trader density.
- **Performer substrate**: canal-circuit bards (CF-0017) with corridor mobility (CF-0024 contractor-stratum extension).

The new CF does not introduce a new capability; it **names an existing intersection** and makes it institutionally legible.

## Phase 4 — Prerequisites and Bottlenecks

Required for a polity / town to host lock-night:
1. Canal-lock infrastructure substantial enough that lockmaster-crew shifts form rhythm (CF-0015 + CF-0038 lockmaster-hall institutional shape).
2. CF-0017 bardic-tavern venue proximate to the lock.
3. Canal-labor density (barge-traffic + lockmaster-crew + wharf-traders) adequate to populate audience.
4. Canal-circuit bards on the local circuit (CF-0017 + CF-0024).
5. Coin liquidity for silver-differential pay — canal-heartland copper-silver economy per CF-0009 supports this.

Distribution:
- **Common**: Canal-heartland towns with all five prerequisites → lock-night is routine.
- **Rare**: highland / drylands / fens towns with marginal canal access → partial or occasional lock-night; mostly absent.
- **Absent**: non-canal heartland market-towns, coastal ports without locks, highland clan-holds, drylands caravan-stops, fenland stilt-villages → no lock-night.

The narrow structural gating (canal-lock required) is the primary stabilizer against globalization.

## Phase 5 — Diffusion and Copycat Analysis

**Could lock-night spread beyond canal-heartland?** No — lock-infrastructure gating is physical, not normative. A town without a lock cannot have lock-night.

**Could canal-labor oral register spread?** Yes. Canal-labor ballads entering bardic-circuit repertoire via lock-night audience composition can circulate inter-town via CF-0017 circuit-bard mobility. But this is **repertoire migration**, not occasion migration — the occasion itself stays canal-corridor-scoped. Parallel to CF-0044's verse-fragment one-way flow (content travels, protocol does not).

**Copycat risk**: a non-canal town naming its ordinary tavern-night "lock-night" as linguistic imitation would be a diegetic-register anomaly, self-correcting (a lock-night that isn't near a lock isn't recognizable to canal-labor audiences). No institutional-diffusion concern.

## Phase 6 — Consequence Propagation

**1st-order** (immediate / within months of acceptance):
- Lockside canal-town taverns distinguish lock-night from ordinary tavern-night in performance-calendar.
- Canal-circuit bards include lock-night bookings as a named circuit-subtype.
- Informal lockmaster / tavern-keeper coordination on lock-closure-hour scheduling.
- Characteristic silver-differential pay register.

**2nd-order** (across seasons / years):
- Canal-labor oral-register feeds back into circuit-bard repertoire via lock-night audience composition.
- Lock-night-specific material accretes: lockside-labor ballads, canal-route work-songs, barge-traveler goodbyes as named sub-genre within CF-0017.
- Performer-income volatility tracks canal-season opening/closing, lock-repair windows, seasonal barge-traffic density.

**3rd-order** (longer-term / thematic):
- Canal-labor idiom enters bardic-circuit catalog → thickens EVERYDAY_LIFE canal-heartland register.
- Lock-night as venue for the kernel's natural story engine *"Bardic-circuit traveler who witnesses a ward breach and must decide what to sing"* — canal-labor audience is where such a song lands.
- Minor bias toward lock-towns in circuit-bard peak-canal-season scheduling; below the threshold that would disturb CF-0017's regional scope.

**13-domain touch audit**:

| File | Touched? | Rationale |
|------|----------|-----------|
| WORLD_KERNEL.md | No | Chronotope already commits canal-borne commerce as dominant rhythm |
| INVARIANTS.md | No | No invariant substantively changed |
| ONTOLOGY.md | No | `institution` + `text_tradition` categories already in use |
| TIMELINE.md | No | Current scope; no new era |
| GEOGRAPHY.md | No | Canal-heartland band already committed |
| PEOPLES_AND_SPECIES.md | No | Species distribution unchanged |
| INSTITUTIONS.md | **Yes** | §Trade/Guilds annotation extending CF-0017 bardic-tavern institutional cluster |
| ECONOMY_AND_RESOURCES.md | **Yes** | §Wealth Creation service-work canal-corridor subtype extension |
| MAGIC_OR_TECH_SYSTEMS.md | No | No magical content |
| EVERYDAY_LIFE.md | **Yes** | §(a) canal-heartland Leisure/Labor-rhythm extension |
| CANON_LEDGER.md | **Yes** (always) | New CF + modification_history + change log entry |
| OPEN_QUESTIONS.md | No | No new OQ; no OQ resolved |
| MYSTERY_RESERVE.md | No | M-7 + M-19 firewalls preserved without modification |

**Touched**: 3 domain files + ledger = 4/13.

**Escalation Gate**: NOT FIRED. ≤3 of 13 FOUNDATIONS domains substantively changed (ledger excluded from the 13-count by convention); no invariant revision; no new invariant-level rule. Proceeding to Phase 7 on the single-agent path. No critic sub-agents dispatched.

## Phase 7 — Counterfactual Pressure Test

Three pressure tests applied:

1. **If lock-night were just CF-0017 ordinary tavern-night under a new name** — would the commitment add substance? **YES**. The distinctiveness is the named-occasion status (stable terminology across the canal-heartland band), the audience-composition differential (canal-labor heavy vs. tavern-regular), the pay-differential register, and the informal lockmaster-tavern-keeper coordination. These are institutional textures NOT reducible to "tavern-night in a town that happens to have a canal lock."

2. **If lock-night were just CF-0038 canal-circuit quarter-year rotation under a new name** — would the commitment collapse into CF-0038? **NO**. Canal-circuit rotation commits WHICH taverns the bard works over a quarter-year (career-scheduling, cross-year dimension); lock-night commits a NAMED NIGHT-TYPE within canal-corridor tavern performance (occasion within a week). Orthogonal dimensions: a Brinewick bard working canal-circuit rotation at The Copper Weir for a quarter-year spends some evenings playing ordinary tavern-night and some playing lock-night during that quarter. The proposal explicitly flags this (risk 2: CF-0038 Brinewick-exemplar absorption).

3. **If lock-night only existed in Brinewick (CF-0038)** — is the commitment a globalization-by-accident from Brinewick's exemplar status? **NO**. The proposal scopes lock-night as regional canal-heartland, not Brinewick-unique. Brinewick is an exemplar-density case (consistent with CF-0038's pattern), but the occasion spans the canal corridor.

**Stabilizer mechanism check**: the proposal names three concrete stabilizers:
1. Canal-lock infrastructure gating (concrete physical mechanism — no lock → no lock-night).
2. CF-0017 parent-institution containment (lock-night is a sub-occasion, not a separate institution with its own licensure).
3. Named-polity-instance density via CF-0038 (canal-circuit at Brinewick exemplar density already committed).

All three stabilizers name concrete mechanisms. No hand-wave.

**Verdict**: counterfactual pressure tests all PASS.

## Phase 8 — Contradiction Classification

Scan of existing canon for contradictions:

- **CF-0017**: extended multiple times (CH-0003/0008/0009/0010/0013/0016); adding lock-night as sub-occasion fits the extension pattern. No contradiction.
- **CF-0038**: canal-circuit rotation at Brinewick exemplar density — lock-night complements without collapsing. **Latent soft-contradiction risk** (future prose might conflate the two); mitigated by explicit distinguishing clause in CF-0045 statement.
- **CF-0024**: lockmaster posting-wall is advertising mechanism for lock-night; consistent.
- **CF-0015**: canal infrastructure substrate; consistent.
- **CF-0009**: silver compensation above middling tavern-night rate consistent with canal-heartland copper-silver economy.
- **AES-1 register**: lock-night performance is dry-pragmatic, not heroic; consistent.

**Classification**: no hard contradictions; one latent soft-contradiction (CF-0017 vs CF-0038 rotation conflation) mitigated by explicit distinguishing language at the CF-0045 statement level and at the CF-0017 modification_history level.

## Phase 9 — Repair Pass

Minor repairs applied in deliverable assembly:

1. **Distinguishing clause added to CF-0045 statement** — explicitly separates lock-night (night-type) from CF-0038 canal-circuit rotation (year-schedule) as orthogonal dimensions.
2. **CF-0017 modification_history entry** — captures lock-night as a named sub-occasion extension; Rule 3 specialness-inflation firewall clause explicit.
3. **No Mystery Reserve extension** required:
   - **M-7** (reputation-genealogy of occult-fallout specialists): firewall preserved. Lock-night is occasion-naming / audience-composition, not specialist reputation-genealogy. A circuit-bard's lock-night competence does not accrue as a new M-7 cohort-class or oracle-register reading; absorbed within existing CF-0017 circuit-bard reputation register per Rule 3.
   - **M-19** (Brinewick canal / underground network origin): firewall preserved. Lock-night operates on current canal infrastructure; makes no antiquity/origin claim about canal construction. Pre-Charter canal attribution remains bounded unknown.
4. **Rule 3 specialness-inflation firewall** encoded in both CF statement `why_not_universal` and `notes`, following precedent of CH-0009 / CH-0010 / CH-0012 / CH-0015 / CH-0016 sub-specialty holding clauses: lock-night is absorbed within CF-0017's existing circuit-bard reputation register, not elevated to a separate institution with its own licensure, oversight, guild-body, or cohort-status.

## Phase 10 — Narrative and Thematic Fit

- **Tone**: lived-in, earthy, hazardous; lock-night is canal-labor rest rhythm + tavern-performance + silver-differential. Ordinary-life-heavy, no heroic register. Fits WORLD_KERNEL tonal contract.
- **AES-1**: lock-night performance is coin-paid labor ("took silver enough to drink for a week" per DA-0001). Scarred-veteran / dryly-working register. Honored.
- **AES-2**: foregrounds ordinary canal-labor texture as audience. Explicitly aligned with *"The ordinary keeps the world honest."*
- **AES-3**: no magical content; not engaged.
- **Natural Story Engines**: extends existing *"Bardic-circuit traveler who witnesses a ward breach and must decide what to sing"* — lock-night is the natural canal-labor-audience venue for such a song. No new engines created.
- **Open Questions created**: none.
- **Open Questions resolved**: none.
- **Open Questions pressured**: none directly.

**Narrative-thematic fit**: PASS.

## Phase 11 — Adjudication

**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES.

**Status granted**: `soft_canon`.

**Justification summary** (full phase citations in the Discovery block):
- Phase 1: scope structurally gated; stabilizers mechanistic.
- Phase 2: all 16 invariants compatible.
- Phase 3-4: no new capability; prerequisites concrete.
- Phase 5: no diffusion risk — lock-infrastructure gating is physical.
- Phase 6: 3 domain files + ledger; below escalation threshold.
- Phase 7: counterfactual pressure tests PASS; no hand-wave.
- Phase 8: no hard contradictions; latent soft-contradiction mitigated.
- Phase 9: minor repairs (distinguishing clause + mod_history); no MR extension required.
- Phase 10: tonal fit; extends existing story engine without inflation.

**Status rationale**: `soft_canon` via partial-support evidence-breadth pathway. CF-0015, CF-0017, CF-0024, CF-0038 commit surrounding infrastructure and institutional mechanics; the NAMING of "lock-night" as a distinct occasion-class with canal-labor audience composition and silver-differential pay register is DA-0001 sole-source. Partial-support soft_canon is defensible against Rule 4 globalization via three structurally-anchored stabilizers.

# Phase 14a Validation Checklist

| # | Test | Result | Rationale |
|---|------|--------|-----------|
| 1 | Domains populated (Rule 2) | PASS | `domains_affected: [economy, settlement_life, language, status_signaling]` non-empty, canonical enum + established ledger usage |
| 2 | Fact structure complete (Rule 1) | PASS | `costs_and_limits` (3), `visible_consequences` (7), `prerequisites` (5) populated; type=institution is operationally-conditioned, prerequisites mandatory |
| 3 | Stabilizers for non-universal scope (Rule 4) | PASS | `why_not_universal` has 3 concrete stabilizers (canal-lock infrastructure gating; CF-0017 parent-institution containment; Rule 3 sub-occasion framing) |
| 4 | Consequences materialized (Rule 5) | PASS | Phase 6 1st/2nd/3rd-order consequences appear in CF `visible_consequences` AND in drafted patches to INSTITUTIONS/EVERYDAY_LIFE/ECONOMY |
| 5 | Retcon policy observed (Rule 6) | PASS | CH-0017 retcon_policy_checks all true; DA-0001 citation in source_basis.derived_from preserves pre-figuring audit trail |
| 6 | Mystery Reserve preserved (Rule 7) | PASS | M-7 checked (no trespass — occasion-naming ≠ specialist reputation-genealogy); M-19 checked (no antiquity claim made) |
| 7 | Required updates enumerated AND patched | PASS | 3 files (INSTITUTIONS/EVERYDAY_LIFE/ECONOMY) + ledger; each has concrete drafted patch |
| 8 | Stabilizer mechanisms named | PASS | canal-lock physical infrastructure (concrete); CF-0017 institutional containment (concrete); Rule 3 sub-occasion classification (concrete) |
| 9 | Verdict cites phases | PASS | Verdict cites Phases 1, 2, 3-4, 5, 6, 7, 8, 9, 10 specifically |
| 10 | No specialness inflation (Rule 3) | PASS | No superlative register in CF; "above a middling tavern-night rate" is pragmatic comparison; explicit Rule 3 firewall clause; parallel to CH-0009/0010/0012/0015/0016 sub-specialty holding clause precedents |

**All 10 tests: PASS.**

# Verdict

**ACCEPT_WITH_REQUIRED_UPDATES** at `soft_canon`.

# Justification

Lock-night is a distinguishable, structurally-stabilized, DA-0001-pre-figured institutional occasion within CF-0017's bardic-tavern frame that materially changes canal-corridor bardic-performance scheduling, canal-labor oral-register feedback into circuit-bard repertoire, and performer-income volatility patterns — while introducing no invariant stress, preserving the M-7 specialist-reputation and M-19 canal-origin firewalls without modification, and remaining below the escalation threshold on FOUNDATIONS-domain touches. Status `soft_canon` reflects partial-support evidence-breadth (surrounding mechanics pre-committed across CF-0015/0017/0024/0038; NAMING sole-source DA-0001) and is defensible against Rule 4 globalization via three concrete stabilizer mechanisms (canal-lock physical gating, CF-0017 institutional containment, Rule 3 sub-occasion framing).

# New Canon Fact Records

- **CF-0045** — Lock-night: named bardic-performance occasion at canal-corridor lockside taverns. Status `soft_canon`. Type `institution`. Scope regional/current/public. `derived_from: [CF-0017, DA-0001]` (pared from proposal-self-asserted list per SKILL.md axis-(a) pre-scan verification; CF-0015/0024/0038 are prerequisites/mechanism-references/orthogonal-coexistence, captured in notes).

# Change Log Entry

- **CH-0017** — affected_fact_ids `[CF-0045, CF-0017]`. `change_type: addition`. `local_or_global: local` (regional canal-heartland band). `ordinary_life_change: true`. `new_story_engines: false` (extends existing "Bardic-circuit traveler who witnesses a ward breach" engine). `mystery_reserve_effect: none` (M-7 / M-19 firewalls preserved).

# Required World Updates Applied

- **INSTITUTIONS.md §Trade/Guilds Internal Contradictions** — new bullet inserted after CF-0038 Brinewick lock-keeper guild bullet; commits lock-night as a named canal-corridor performance-occasion sub-institution within CF-0017, with explicit distinguishing clause vs CF-0038 canal-circuit quarter-year rotation, informal lockmaster/tavern-keeper coordination note, CF-0024 posting-wall advertising reference, and Rule 3 firewall clause.
- **EVERYDAY_LIFE.md §(a) Canal-Town Heartland** — new bullet added after CF-0043 register bullets; commits lock-night as recognized Leisure / Labor-rhythm texture with audience-composition register (canal-labor heavy), silver-differential pay register (DA-0001 cadence *"took silver enough to drink for a week"*), song-selection bias (short-form, work-song, canal-route), circuit-bard scheduling vocabulary, Brinewick canal-circuit cadence integration note, and non-canal heartland exclusion note.
- **ECONOMY_AND_RESOURCES.md §Wealth Creation** — new bullet inserted between §Service work and §Estate income; commits canal-corridor lock-night performer-income subtype within CF-0017 bardic-circuit service-work path with canal-infrastructure-keyed income volatility (canal-season opening/closing, lock-repair windows, seasonal barge-traffic), frozen-canal / under-maintenance stretch income collapse, Rule 3 firewall against new wealth-stratum, DA-0001 aspirational register.
- **CANON_LEDGER.md** — new CF-0045 record appended to CFs section; CF-0017 modification_history appended (CH-0017 extension summary); CH-0017 Change Log Entry appended to change log section tail.
