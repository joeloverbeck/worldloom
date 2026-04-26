---
pa_id: PA-0005
date: 2026-04-18
verdict: ACCEPT_WITH_REQUIRED_UPDATES
originating_skill: canon-addition
change_id: CH-0006
cf_records_touched: [CF-0032, CF-0010, CF-0011, CF-0018]
mystery_reserve_touched: [M-4, M-7, M-12]
invariants_touched: [SOC-1, AES-1, AES-2, DIS-3]
open_questions_touched: [OQ-0010, OQ-0015, OQ-0030, OQ-0035]
---

# PA-0005 — Adjudication Record

---

# Proposal

- **Proposal ID**: PA-0005
- **Date**: 2026-04-18
- **Source**: `worlds/animalia/proposals/PR-0007-oversize-saddlery-subsection-cluster-c.md`

## Verbatim Proposal

> A subsection within the wainwright and saddlery guilds, in polities with ancestral Cluster C population bases, specializes in oversize harness, reinforced wagon-bed, barge-deck modification, and chair-for-estate work for mammoth-folk, ground-sloth-folk, and other large-body-plan Cluster C species; journeymen travel between Cluster C ancestral regions on a reciprocal tradition to learn body-plan accommodation variants; prices are very high, and the subsection constitutes a recognized occupational upward-mobility route for Cluster C species members otherwise concentrated in haulage labor.

Proposal derives from CF-0010 (sentient animal-folk include extinct), CF-0011 (animal-folk can hold any class), CF-0018 (skilled trades stable livelihoods); consults CF-0015 (canal network).

Proposed status: soft_canon. Type: institution. Scope: regional / current / public.

## User-Stated Constraints

- **Preferred scope**: regional (ancestral Cluster C polities only).
- **Desired rarity**: subsection masters scarce per polity; total practitioners small.
- **Dramatic purpose**: provide Cluster C upward-mobility path distinct from haulage; produce story engines around apprenticeship-placement negotiation, cross-polity journeyman reciprocity, estate-commission economics, progenitor-cult integration tension.
- **Revision appetite**: high (proposal-author explicitly flagged Rule 3 specialness-inflation risk around "older bloods" self-conception and invited firewall additions).
- **Other**: specific guild names must remain deferred to OPEN_QUESTIONS; structural commitment only.

---

# Phase 0–11 Analysis

## Phase 0: Normalize the Proposal

### Statement

A subsection within wainwright and saddlery guilds, in polities with ancestral Cluster C population bases, specializes in oversize fitments for large-body-plan Cluster C species. Journeymen travel a reciprocal cross-polity circuit. Prices are very high. The subsection is a recognized occupational upward-mobility route for Cluster C members otherwise in haulage.

### Underlying World-Change

Three layers:
1. Commits institutional form for the Cluster C architectural-accommodation need already named in `PEOPLES_AND_SPECIES.md` Cluster C (bespoke-only clothing, oversized doorways, reinforced floors) — the canon stated the need but left the economic institutional form thin.
2. Adds a third named Cluster C labor specialty alongside the two already in canon ("heavy haulage, anchor-roles in mixed work-crews, longstanding tradition-keeping roles").
3. Extends CF-0011 (animal-folk can hold any class) from a distribution claim into a concrete Cluster C upward-mobility mechanism — the canon currently has Cluster A modern mammalian animal-folk specialty-labor visibility but not a comparable Cluster C mechanism.

### Canon Fact Type

`institution` (template enum). Primary entity is the guild-subsection (organized body), not the craft in isolation. Sub-aspects (reciprocal tradition = ritual-adjacent; placement-right = informal economic instrument; guild-seal = signaling) are subordinate to the institution and documented in `visible_consequences`, not split.

Applied Phase 0 tie-break rubric: "organized civic/guild body with operational effects → institution (not law or resource_distribution)."

### Additional Domain Files Loaded

`PEOPLES_AND_SPECIES.md`, `INSTITUTIONS.md`, `ECONOMY_AND_RESOURCES.md`, `EVERYDAY_LIFE.md`, `GEOGRAPHY.md`, `TIMELINE.md`; CF records CF-0010, CF-0011, CF-0015, CF-0018, CF-0030.

## Phase 1: Scope Detection

- **Geographic**: regional (ancestral Cluster C polities only; explicitly NOT global).
- **Temporal**: current (Charter-Era-consolidated; pre-Charter origin deferred to M-12).
- **Social**: public (guild-seal visible; shop signage public).
- **Visibility**: public within ancestral polities; export contracts visible at estate-class level elsewhere.
- **Reproducibility**: gated by multi-year reciprocal master-training + Cluster C ancestral-region customer base + guild continuity.
- **Institutional awareness**: public within ancestral polities; recognized by civic registry where charter frames reciprocity.
- **Secrecy level**: none.
- **Diffusion risk**: low — reproducibility genuinely gated; see Phase 7.

Rule 4 check: geographic non-global AND social public → `distribution.why_not_universal` must be populated. Four stabilizers in proposal + one additional CF-notes Rule-4 partial concession (consumption-locality ≠ production-locality; estate-sizing drift is named intended generational change). PASS.

## Phase 2: Invariant Check

Tested all 16 invariants + WORLD_KERNEL tonal contract:

- **ONT-1** (sentience requires biological embodiment): UNTOUCHED.
- **ONT-2** (magic only as artifact, not learnable): UNTOUCHED. Subsection is ordinary wainwright/saddlery craft.
- **ONT-3** (no cross-species reproduction): UNTOUCHED.
- **CAU-1/2/3** (artifact effects, bleed-through, wards): UNTOUCHED.
- **DIS-1** (artifacts turned up underground): UNTOUCHED.
- **DIS-2** (literacy partial): CONSISTENT — subsection masters are literate at ordinary guild level.
- **DIS-3** (mythic-species rare): RESPECTED — proposal correctly identifies Cluster C as extinct-species, NOT Cluster D mythic; DIS-3 does not apply.
- **SOC-1** (animal-folk can hold any class): REINFORCED — concretization of class mobility for Cluster C.
- **SOC-2/3** (public adult barter, coin-contract sacred): UNTOUCHED / REINFORCED (commissions operate within SOC-3).
- **SOC-4** (artifact extraction guild-licensed): UNTOUCHED — subsection is ordinary craft, not artifact-trade.
- **AES-1** (heroism paid in coin and scars, not glory): CONSISTENT with required in-register framing per Theme/Tone critic.
- **AES-2** (ordinary keeps world honest): REINFORCED — subsection is ordinary skilled craft.
- **AES-3** (magical and contaminated allied): UNTOUCHED.

Tonal contract (WORLD_KERNEL): CONSISTENT — lived-in, earthy, hazardous (though low-hazard here), multispecies social realism.

**Classification**: compatible. No invariant revision required.

## Phase 3: Underlying Capability / Constraint Analysis

- **Newly possible**: Cluster C subsection apprenticeship pipeline as upward-mobility path; body-plan-verified guild-seal fitments; cross-polity Cluster C fellowship via reciprocal-journey circuit.
- **No longer safely assumable**: that Cluster C accommodation is ad-hoc retrofit in ancestral polities; that all Cluster C labor is haulage/anchor-infantry/tradition-keeping.
- **Easier**: body-plan-correct fitments in ancestral regions; Cluster C upward mobility; estate-architecture migration toward subsection-informed defaults.
- **Harder**: nothing obvious.
- **More valuable**: subsection guild-seal fitments; subsection apprenticeship placements (negotiable in inheritance/dowry).
- **More politically useful**: progenitor-cult lineage-keepers have material institutional hook for cultural-continuity claims (firewall required).

## Phase 4: Prerequisites and Bottlenecks

- **Knowledge**: body-plan-variant instruction — RARE (multi-polity reciprocal travel required).
- **Training**: slow master-rank progression via reciprocal circuit — UNCOMMON.
- **Tools**: oversize variants — UNCOMMON.
- **Infrastructure**: ancestral Cluster C community + wainwright/saddlery guild continuity — REGION-LOCKED.
- **Materials**: heavier leather, reinforced timber, larger metal fittings — UNCOMMON but obtainable.
- **Permission**: guild charter + subsection master-rank recognition — GATED.
- **Secrecy**: none.
- **Time**: multi-year reciprocal journey.
- **Maintenance**: ongoing master-rank progression depends on reciprocal continuity.

Primary bottleneck: master-training lineage is rare, region-locked, reciprocally transmitted.

## Phase 5: Diffusion and Copycat Analysis

- **Primary adopters**: ancestral-polity wainwright/saddlery guilds; Cluster C apprentice candidates; estate-class customers in ancestral polities.
- **Secondary adopters**: barge-builders in canal-corridor ancestral polities; extra-regional estate-class buyers via long-lead-time contracts.
- **Suppressors**: none directly (rhetorical progenitor-cult co-option risk only; firewall addresses).
- **Skeptics**: non-subsection guilds without subsection tradition.
- **Profiteers**: subsection masters; guild-seal-certified craftsmen.
- **Victims**: none structurally (Cluster C members who decline subsection route remain in haulage, unchanged).
- **Non-adopters**: non-ancestral polities (no customer base, no training lineage, no reciprocal continuity).

Diffusion pressure analysis: useful AND constrained. The "useful + freely reproducible → diffuses" test does NOT trigger because reproducibility is gated by multi-year reciprocal training AND Cluster C customer-base presence. Both gates are genuine.

## Phase 6: Consequence Propagation

### First-Order

- **everyday life**: subsection apprenticeship visible in ancestral-polity artisan quarters; guild-seal fitments visible at Cluster C estates; subsection shops visible; subsection-apprentice tenant-cottage recognizable household category.
- **economy**: subsection wage tier at master-craft level; extra-regional export stream small-but-durable; oversize-fittings material supply develops in ancestral polities.
- **law**: subsection-apprenticeship placements become negotiated assets in inheritance/dowry.
- **religion**: progenitor-cult lineage-keepers integrate subsection into cultural-continuity claims.
- **status order**: subsection guild-seal as visible Cluster C regional authenticity marker; subsection masters acquire recognized master-craft status.
- **kinship**: inheritance/dowry incorporates subsection placement as negotiated asset.
- **architecture**: estate architecture migrates toward subsection-informed default sizing.
- **mobility**: reciprocal journeyman travel creates new canal-corridor/caravan-route pattern; cross-polity Cluster C fellowship network.
- **language/slang**: subsection-specific song-cycles, reputation idioms, master-identification register.
- **memory/myth**: subsection-master lineages enter ancestral-polity craft memory; song-cycles mythologize journey tradition.

### Second-Order

- **everyday life**: tenant-cottage subsection apprentice as recognizable household category; dowager-gossip tracks subsection commissions; rotating journeymen visible in mixed taverns.
- **economy**: subsection-apprenticeship placement-price as informal asset class; export-contract premium inflating waiting lists; authentication sub-specialty emerges.
- **law**: magistrate precedent — subsection-seal fraud, placement-breach, export-contract disputes, reciprocal-travel abandonment (fourth docket class distinct from the three polity-asymmetric patterns).
- **religion**: doctrinal debate (civic-secular craft vs progenitor-cult validation); aspectualizing-vs-supremacist split; common-pantheon clergy can aspectualize cleanly.
- **status order**: subsection masters in guild-master stratum; Cluster C "older bloods" self-conception acquires prestige surface (RISK: Rule 3 — firewall required).
- **kinship**: subsection-apprenticeship placement in dowry negotiations; assortative sorting across placement-holder lineages (Rule 3 compounding pressure).
- **architecture**: export-contract waiting-list inflation; non-ancestral estates with Cluster C residents inherit subsection-informed sizing.
- **mobility**: reciprocal circuit sustains durable cross-polity network; journeymen as information-carriers parallel to bardic circuit.
- **language/slang**: "chair-guild pricing" idiom; subsection-seal recognition as cultural literacy in ancestral polities.
- **memory/myth**: subsection-master reputation-bardic subgenre emerges parallel to CF-0024 contracted-veteran and CF-0028 ruin-cycle subgenres (M-7 firewall cross-application required).

### Third-Order

- **everyday life**: Cluster C ancestral polities develop visibly accommodating built environment; cultural-tourism-adjacent estate-class visitor flow.
- **economy**: generational-wealth bias toward subsection-adjacent Cluster C families (mitigated by haulage majority and M-12 antiquity firewall).
- **law**: precedent accumulation for subsection-seal fraud and reciprocal-travel extradition.
- **religion**: sectarian progenitor-cult supremacy claims on subsection intensify (firewall load-bearing); common-pantheon charter-day processional language accommodates subsection guild-seals.
- **status order**: subsection-seal as Cluster C regional-authenticity signal; intra-Cluster-C stratification (subsection-lineage vs haulage-lineage).
- **kinship**: marriage-market subsection-adjacent endogamy pattern (mirrors CF-0031 positive-signaling analog).
- **architecture**: ancestral-polity regional-identity strengthens; non-ancestral polity default-sizing drift (Rule 4 partial concession, named in CF notes).
- **mobility**: reciprocal circuit matures as informal canal-corridor presence alongside bardic circuit and adventurer-contractor flow.
- **language/slang**: subsection-seal recognition as durable cultural-literacy in ancestral polities.
- **memory/myth**: subsection-master reputation-bardic subgenre durable across generations (M-7 firewall).

**Domains touched**: 11 of 13 (labor, economy, law, religion, status_signaling, kinship, architecture, mobility, language/slang, memory/myth, everyday life). Escalation gate fires (>3).

## Escalation Gate: Fired

Dispatched six parallel critic sub-agents. Reports appended below in "Critic Reports" section. Phase 6b synthesis:

**Convergent concerns**:
1. Rule 3 specialness-inflation via "older bloods" progenitor-cult supremacy capture (Continuity Archivist, Politics/Institution, Theme/Tone, Mystery Curator).
2. M-7 reputation-genealogy firewall cross-application absent (Mystery Curator; confirmed by Politics/Institution authentication concerns and Theme/Tone song-cycle risk).
3. M-4 firewall absent from proposal self-trace (Mystery Curator).
4. Rule 4 universalization leak via estate-architecture sizing drift (Systems/Economy).
5. Authentication-specialist cartel formation pressure parallel to CF-0028 (Systems/Economy + Politics/Institution).
6. Reciprocal-journey tradition as novel institutional form (agreement pattern, NOT fourth polity-asymmetry instance); requires new archival category (Politics/Institution + Continuity Archivist).
7. "Upward-mobility route" framing tilts toward species-preferential; must explicitly not gate apprenticeship by species (Politics/Institution + Theme/Tone).
8. Per-cluster EVERYDAY_LIFE signature requires ancestral-region distribution commitment; silent absences in (d) drylands and (e) fenlands (Everyday-Life).
9. AES-2 hero-drift risk; need ordinary-commission tier surfaced (Everyday-Life).
10. New M-12 recommended for craft antiquity (Mystery Curator, Rule 7 obligation).

**Productive tensions resolved**: Charter-Era consolidation (Continuity Archivist) and antiquity mystery (Mystery Curator) compatible — M-12 governs world-level antiquity; Charter-Era consolidation is a narrower institutional claim. Theme/Tone pragmatic register and Everyday-Life texture requirement complementary once ordinary-commission tier is surfaced alongside journeyman-as-economic-necessity framing.

## Phase 7: Counterfactual Pressure Test

If true, why doesn't the world look more different already?

### Stated Stabilizers

1. **Sustained ancestral Cluster C community presence**: gates both production locality and demand. Consumption locality can leak outward via mobile Cluster C estate-class residents — NAMED explicitly in CF notes as Rule 4 partial concession (architectural sizing drift is intended generational change; craft remains regional).
2. **Bespoke pricing gates customer accessibility**: reinforced by multi-year master-training interval + demographic ceiling on Cluster C large-body-plan populations.
3. **Reciprocal journeyman tradition requires guild continuity across ancestral polities**: explicitly framed as craft-discipline coordination, NOT rent-extraction cartel; openness to non-ancestral apprentices who complete reciprocity preserves SOC-1.
4. **Apprenticeship lineages slow to replicate outside ancestral regions**: pipeline flows from Cluster C families; CF explicitly does NOT gate by species.

Additional stabilizer added via Phase 9 repair: **M-12 antiquity reserve**: the subsection's historical origin is bounded-unknown; three contested readings (Charter-Era-consolidation / pre-Charter-inherited / recent-innovation) are productive.

No hand-waves. Each stabilizer names a concrete mechanism.

## Phase 8: Contradiction Classification

- **Hard contradictions**: none.
- **Soft conflicts**:
  - CF-0018 ("socially legible without explicit guild branding"): subsection's guild-seal is a narrow named exception — qualification annotation on CF-0018 resolves.
  - `PEOPLES_AND_SPECIES.md` Cluster C labor catalogue: extension required; not a contradiction, an addition with attribution.
- **Latent Burdens** (6):
  1. M-12 resolution (craft antiquity) — tracked as new MR entry.
  2. Reciprocal-travel case law — tracked as new OPEN_QUESTIONS item.
  3. Subsection-seal fraud precedent — tracked as new OPEN_QUESTIONS item.
  4. Intra-Cluster-C stratification (subsection-lineage vs haulage-lineage; Rule 3 compounding) — tracked in ECONOMY Inequality Patterns annotation.
  5. Architectural sizing-norm drift to non-ancestral estates (Rule 4 partial concession) — named in CF notes and GEOGRAPHY section.
  6. Subsection-seal authentication cartel-formation pressure (parallel to CF-0028) — named in INSTITUTIONS Trade/Guilds and ECONOMY Wealth Creation.
- **Scope Drift Risk**: LOW — explicit regional scope + four strong stabilizers + Rule-4 partial concession explicitly named.
- **Tone Mismatch**: none if in-register language used per Theme/Tone critic recommendations.

## Phase 9: Repair Pass

### Options Considered

- (A) Reject for specialness-inflation risk.
- (B) Revise-and-resubmit.
- (C) Accept as hard_canon.
- (D) Accept as contested_canon.
- (E) Accept as soft_canon with three firewalls + Rule 4 partial concession + new M-12.
- (Split) Split into narrower facts.

### Options Declined (and why)

- (A) excessive — risk containable via CF language.
- (B) excessive — proposal is well-formed; firewall language fits at Phase 13a without resubmission.
- (C) violates Rule 4 — regional scope is intrinsic (subsection operates only where ancestral community and guild continuity both exist).
- (D) under-institutionalizes — this is a concrete craft practice, not a disputed claim; Politics/Institution critic explicitly advised against.
- (Split) rejected per split rubric: sub-facts share type (`institution`), Mystery Reserve exposure profile (M-4, M-7, M-12 apply to whole fact), distribution shape (all ancestral-polity-gated), and `domains_affected` set (all overlap). Splitting would fragment integrity.

### Options Adopted (and what they preserve vs sacrifice)

**(E) Accept as soft_canon with required updates**. Preserves: full dramatic intent (upward-mobility route, reciprocal journey tradition, estate-class commission economics, third named Cluster C labor specialty, Cluster C cross-polity fellowship network). Sacrifices: implicit "older bloods" prestige subtext (firewalled); tight Rule 4 discipline on architectural sizing (named as partial concession); any world-level oracle-reading of subsection-master field-lore (M-7 firewall). No dramatic material lost.

**Firewalls added**:
1. Rule 3 "older bloods" disowning clause in CF notes and PEOPLES_AND_SPECIES.md.
2. M-4 firewall extension (progenitor-cult cultural-continuity claims are sectarian, NOT adjudication).
3. M-7 firewall cross-application (subsection-master reputations subject to four contested readings).
4. SOC-1 non-species-gated apprenticeship clause.
5. Rule 4 partial concession explicitly named (sizing drift to non-ancestral estates is intended generational change).

**New M-12**: antiquity of craft as bounded unknown (Rule 7 obligation).

**Three qualification annotations**: CF-0010, CF-0011, CF-0018 receive notes-field + modification_history entries. No retcon.

## Phase 10: Narrative and Thematic Fit

- **Deepens identity?** YES — multispecies civic participation for Cluster C concretely realized.
- **Creates tensions?** YES — intra-Cluster stratification, progenitor-cult integration ambiguity, export waiting-list friction, subsection-seal authentication cartel pressure.
- **Trivializes struggle?** NO — most Cluster C remain in haulage; subsection is minority path.
- **Universalizes specialness?** Contained by Rule 3 firewall + explicit "apprenticeship is species-concentrated by ancestral-region presence, NOT species-gated" clause.
- **Undermines mystery?** Contained by M-4 + M-7 firewalls + new M-12.
- **Enriches ordinary life?** Requires EVERYDAY_LIFE patches (delivered in Phase 13a); ordinary-commission tier surfaced + failed-apprentice fallback + three-polity skip-rope rhyme + subsection work-song lineage in AES-1 register.
- **Creates story engines or clutter?** Strong alignment with artisan-coalition, mixed-species-estate-succession, bardic-circuit, animal-folk-magistrate natural engines (per Theme/Tone critic).

Rule 7 check: no forbidden-answer collisions after firewalls; new M-12 satisfies Rule 7 obligation.

## Phase 11: Adjudication

**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES at CF status `soft_canon`.

See Justification section below for phase-cited reasoning.

---

# Phase 14a Validation Checklist

- Test 1 (Rule 2 / domains_affected non-empty): PASS — 11 domains populated in CF record (`labor`, `economy`, `law`, `religion`, `status_signaling`, `kinship`, `architecture`, `mobility`, `language`, `memory_and_myth`, `settlement_life`).
- Test 2 (Rule 1 / prerequisites + costs_and_limits + visible_consequences populated): PASS — all three fields populated for institution type; prerequisites include apprenticeship lineage, reciprocal-journey tradition, oversize materials, guild continuity.
- Test 3 (Rule 4 / distribution.why_not_universal populated): PASS — scope is regional/current/public; four concrete stabilizers (ancestral presence, bespoke pricing, reciprocal continuity, lineage-replication inertia) + explicit Rule-4 partial concession clause.
- Test 4 (Rule 5 / 2nd+3rd-order consequences in CF or patches): PASS — 2nd/3rd-order consequences surfaced in CF `visible_consequences` (subsection shop visibility, reciprocal circuit, placement-right inheritance, export-contract waiting-list, authentication cartel pressure, intra-Cluster-C stratification) AND in concrete Phase 13a patches to nine domain files.
- Test 5 (Rule 6 / Change Log Entry retcon_policy_checks all true): PASS — CH-0006 is pure `addition` with three qualifications documented in `summary` and `notes`; all five `retcon_policy_checks` set true; no silent edits; world identity preserved per Phase 10.
- Test 6 (Rule 7 / no unrepaired forbidden-answer collisions): PASS — M-4 and M-7 collisions identified and repaired by firewall extensions in MYSTERY_RESERVE.md; new M-12 entry added per Rule 7 obligation.
- Test 7 (Phase 12a checklist + Phase 13a patches present for every required_world_updates entry): PASS — 9 files enumerated; concrete patches delivered to each: CANON_LEDGER.md, PEOPLES_AND_SPECIES.md, INSTITUTIONS.md (5 subsections), ECONOMY_AND_RESOURCES.md (4 sections), EVERYDAY_LIFE.md (clusters a and b), GEOGRAPHY.md (new section), TIMELINE.md (Layer 2), MYSTERY_RESERVE.md (M-4 + M-7 extensions + new M-12), OPEN_QUESTIONS.md (2 annotations + 2 new items).
- Test 8 (Phase 7 stabilizers name concrete mechanisms; no hand-waves): PASS — each stabilizer specifies mechanism (ancestral community demographics; bespoke pricing gated by multi-year master-training + demographic ceiling; reciprocal tradition as craft-discipline coordination with concrete master-rank progression requirement; lineage-replication inertia backed by region-locked apprenticeship pipeline).
- Test 9 (Verdict reasoning cites specific phase findings; not vague): PASS — Justification below cites Phases 2, 5, 6, 6b, 7, 8, 9, 10 with named critic findings.

---

# Verdict

**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES

---

# Justification

Phase 2 established invariant-compatibility across all 16 invariants; SOC-1 and AES-2 are reinforced, not stressed. Phase 5 established that the proposal's four stabilizers adequately contain diffusion pressure, with Systems/Economy critic's flagged weaknesses addressed by Phase 9 repair language (Rule 4 partial concession explicitly named; authentication cartel pressure named in INSTITUTIONS and ECONOMY patches). Phase 6 touched 11 of 13 domains, requiring extensive downstream updates. Phase 6b critic synthesis identified three specific firewall gaps (M-4 absent, M-7 cross-application absent, "older bloods" Rule 3 firewall required), which Phase 9 repair resolves via three notes-field firewall clauses in CF-0032 plus MYSTERY_RESERVE.md M-4 and M-7 extensions. Phase 7 counterfactual pressure test passes with all stabilizers naming concrete mechanisms (no hand-waves). Phase 8 classified no hard contradictions and six latent burdens, all tracked in CH-0006 `latent_burdens_introduced`. Phase 9 repair pass preserves full dramatic intent while adding three firewalls, one Rule 4 partial concession, one new Mystery Reserve entry (M-12), and three notes-field qualifications on existing CFs (CF-0010, CF-0011, CF-0018) without retcon framing. Phase 10 thematic fit strong: story engines align with artisan-coalition, mixed-species-estate-succession, and bardic-circuit natural engines; ordinary life is enriched via concrete per-cluster EVERYDAY_LIFE patches (cluster a heartland and cluster b estate) with silent absences in (d) drylands and (e) fenlands per critic analysis.

The verdict rests on: escalation-gate-dispatched critics converging on containable concerns (Rule 3, Rule 4 partial, M-4, M-7 cross-application, AES-2 hero-drift) all addressable via CF language + domain-file patches without restructuring the proposal.

---

# Critic Reports

## Continuity Archivist

### Direct Contradictions
None. Scanned CF-0001 through CF-0031 with full read of CF-0010, CF-0011, CF-0012, CF-0015, CF-0018, CF-0019 and targeted scans of the rest. No hard-canon fact asserts absence of Cluster C skilled-craft subsection; no CF reserves oversize/saddlery/wainwright as un-specialized domain. CF-0010 costs_and_limits and visible_consequences are REINFORCED. CF-0011 and CF-0018 are directly in-line. Invariants compatible; SOC-1 reinforced; DIS-3 respected.

### Soft Conflicts and Required Annotations
1. CF-0012/DIS-3 softening: Cluster C distinctness now includes trans-regional professional vector; qualification annotation on CF-0010 required, not retcon.
2. PEOPLES_AND_SPECIES.md line 94 labor catalogue: adding third named specialty requires explicit attribution annotation (Rule 6).
3. CF-0018 craft-authority frame: "guild-seal on commissioned work" introduces explicit signage for subsection only; qualification annotation on CF-0018 required.
4. CF-0015 canal interaction: barge-deck modification work sits at canal/Cluster-C intersection; CF must include `settlement_life` or `architecture` in `domains_affected` and reference CF-0015.

### Required Updates to Owned Files
CANON_LEDGER.md: new CF-NNNN record + new CH-NNNN change log entry naming CF-0010/CF-0011/CF-0018 qualifications. CF-0010/CF-0011/CF-0018: append notes-field annotations. TIMELINE Layer 2: Institutional residue annotation for Charter-Era reciprocal-journey consolidation. TIMELINE Layer 4: optional annotation for export-contract pressure (minor).

### Critical Risks
Rule 3 specialness-inflation via "older bloods" + progenitor-cult co-option is the central risk. New CF must carry explicit `notes` firewall.

### Continuity Archivist

#### Timeline Updates Required
- Layer 2: add sub-bullet under Institutional residue (Charter-Era-consolidated reciprocal-journey tradition; mark with CF attribution).
- Layer 4: no strict requirement; optional minor annotation.

#### Latent Burdens
1. Cross-polity extradition schema (fourth axis; OPEN_QUESTIONS entry recommended).
2. Subsection-seal fraud precedent (future CF or OPEN_QUESTIONS).
3. Intra-Cluster stratification (Rule 3 compounding; OPEN_QUESTIONS at accept).
4. Specific named guilds deferred (proposal correct; do not pull guild name into canon).
5. Reciprocal-journeyman "tradition" as structural commitment (implicit multi-polity guild continuity; defer specific polities to OPEN_QUESTIONS).

#### Retcon Framing Recommendation
Qualification + pure addition (not `ontology_retcon`, not `scope_retcon`). CF-0010/CF-0011/CF-0018 gain qualification annotations via existing CH-0002-style notes-field pattern. New fact is pure addition; PEOPLES_AND_SPECIES.md Cluster C labor catalogue extension is named addition with attribution tag, not rewrite. change_type = `addition`.

---

## Systems/Economy Critic

### Direct Contradictions
None.

### Soft Conflicts and Required Annotations
1. Wage Spreads table: "master-craft level" + "extra-regional export-contract premium" places subsection in upper-silver band, silent wage-compression pressure on hazard tier. Annotated wage row required.
2. Value Stores section: subsection-apprenticeship placement is a novel value-store class (informal, cross-polity-reciprocal, heritable); requires annotation.
3. Inequality Patterns: upward mobility creates new stratification axis inside Cluster C (ancestral vs diaspora mobility horizons). Silent stratification; annotation required.
4. Inequality Patterns re: dowry-asset: placement-right-as-dowry creates endogamy incentive (Rule 3 vector).

### Required Updates to Owned Files
ECONOMY_AND_RESOURCES.md: Wage Spreads (subsection row), Value Stores (subsection placement-right), Wealth Creation (Craft mastery annotation), Inequality Patterns (intra-Cluster-C stratification), Breakage Points (bespoke commission backlog if systemic), Specialist Resources (oversize fittings material).

### Critical Risks

#### Economic Plausibility of Stated Stabilizers
- (a) ancestral-community-presence: ECONOMICALLY WEAK — estate-class customer mobility leaks ancestral-sizing norm outward. Stabilizer gates PRODUCTION locality but not CONSUMPTION locality.
- (b) bespoke pricing: contingent on supply constraint only; if lineages expand, prices drop. Compare CF-0028 authentication-specialist cartel formation.
- (c) reciprocal tradition: cartel-adjacent. Reciprocal inter-polity guild coordination to control credentialing IS structurally a cartel.
- (d) apprenticeship lineages: bounded by demand only; extra-regional demand creates lineage incentive to place extra-regionally.

#### Missed Economic Consequences
1. Labor market substitution within Cluster C: subsection mobility REDUCES haulage labor; haulage wage pressure rises in canal-corridor.
2. Material supply inflation: oversize ironwork, large-format hide, reinforced timber — Charter timber (old-growth) competes with shipbuilding.
3. Distributional effect inside Cluster C: ancestral-polity Cluster C capture rents; diaspora Cluster C bear universalization reputational costs without rent-access.
4. Dowry-asset compounding: placement-right-as-dowry → assortative sorting → 3-gen placement-right concentration (mirrors CF-0031 pattern).

#### Market Structure Risks
1. Authentication cartel (directly analogous to CF-0028).
2. Canal-corridor arbitrage (analogous to CF-0021 if polities vary in pricing/taxing bespoke commissions).
3. Hidden subsidy via reciprocal journeyman travel funding.
4. Substitution on estate-architecture default sizing (Rule 4 leak).
5. Injury profile: oversize barge-deck modification on live canals has falls/crush-injury exposure. If non-trivial, lands on CF-0025/CF-0031 axis OR requires explicit non-hazard classification.

---

## Politics/Institution Critic

### Direct Contradictions
None. Subsection-within-parent-guild is institutionally coherent; mirrors Artifact-Extraction Guilds' five-specialty pattern. Specific-name deferral correctly preserves OPEN_QUESTIONS Specific Guild Naming.

### Soft Conflicts and Required Annotations
1. Trade/Guilds framing mismatch: "upward-mobility route" tilts toward species-preferential access. Annotation required — subsection is species-concentrated by body-plan-variant instructional lineage and ancestral-region presence, NOT species-gated at apprenticeship intake. Otherwise Rule 3 specialness-inflation escalates.
2. Reciprocal-journeyman tradition structurally IS a NEW institutional TYPE — agreement pattern, mirror image of the three disagreement-asymmetries. Must be annotated as such; not a fourth instance of existing polity-asymmetric pattern.
3. Trade/Guilds succession line (hereditary-mastership): subsection's body-plan-variant instructional lineage slots in; explicit non-exclusion annotation required to keep SOC-1 safe.

### Required Updates to Owned Files
INSTITUTIONS.md — Trade/Guilds §Internal Contradictions (subsection commitment); Law/Custom §Internal Contradictions (subsection-seal fraud + reciprocal-travel extradition as fourth docket class); Religion §Species-Progenitor Cults §Internal Contradictions (aspectualizing-vs-supremacist split); Education/Apprenticeship (body-plan-variant lineage as guild-seal sub-tradition); Recordkeeping/Archives (reciprocal-journey verification archive). OPEN_QUESTIONS.md §Specific Guild Naming extension.

### Critical Risks
Rule 3 via progenitor-cult supremacist capture is load-bearing; Charter-Era rupture risk from reciprocal-journey breach creating multi-polity guild-discipline events without civic-extradition analogue; archive-custody ambiguity (guild-internal vs civic) unresolved.

### Politics/Institution Critic

#### Guild Response Plausibility
Subsection-within-parent-guild institutionally coherent. Wainwright/saddlery framing plausible; barge-builders as secondary adopters per Phase 5; oversize-chair-for-estate hooks into Landholding estate-household apparatus. "Upward-mobility route" framing is weakest institutional claim — should reframe as "higher-prestige Cluster C occupational niche as side-effect, retrospectively named as mobility."

#### Civic / Legal Pressure
Charter Era does NOT rupture. But: reciprocal-journeymanship extradition is cross-polity guild-internal discipline — NOT Charter-asymmetry extradition class. A journeyman abandoning reciprocity is guild-disciplinary with civic-watch handoff only where charter monopoly invoked. Fourth categorically distinct docket class. Competing-polity seal-authentication and apprenticeship-placement inheritance disputes also missed by proposal.

#### Religious Pressure
Risk correctly identified. Comparison to precedent: pattern most closely resembles CF-0031 (bifurcated reform-current clergy + progenitor-supremacist opposition). Common-pantheon clergy CAN aspectualize (unlike CF-0028). Reform-current clergy (CF-0026) have no specific hook (not contamination, not expedition). Rule 3 tips into supremacy specifically via progenitor-cult lineage-keeper pathway; pricing stabilizer addresses diffusion, NOT rhetorical capture.

#### Archive / Knowledge-Custody Pressure
New archival category required. Reciprocal-journey verification = cross-polity guild-seal exchange with charter-clerk recording. Distinct from contract/deed/chronicle/occult-fragment/ruin-cartography/contamination-ledger streams. Custody guild-internal with civic-copy deposit at charter polities. Seal-authentication sub-specialty real; must be institutionally sited (inspector-adjacent but NOT inspector). Corvid-clerk overrepresentation sensitivity applies.

---

## Everyday-Life Critic

### Direct Contradictions
None.

### Soft Conflicts and Required Annotations
- (a) canal-town heartland: REQUIRED if ancestral-polity overlap with canal corridor. Subsection shop, barge-refit yard, subsection-apprentice tenant-cottage.
- (b) big-city outskirts estate: REQUIRED. Guild-seal fitments, dowager-gossip on subsection commissions, cross-polity journeyman residency as status marker.
- (c) cold north highland: CONDITIONAL on woolly-rhinoceros/aurochs ancestral range reach. If yes, clan-forge reciprocal apprenticeship and saga-fragment required; if no, silent absence.
- (d) drylands south: Absence required and silent (heat-vulnerability excludes ancestral-Cluster-C presence).
- (e) fenlands west: Absence required and silent (stilt-village embodiment-incompatibility).

### Required Updates to Owned Files
EVERYDAY_LIFE.md needs CF-tagged annotations in cluster(s) with Cluster C ancestral presence. Ancestral-polity geographic distribution is load-bearing prerequisite.

### Critical Risks
Hero-drift risk MODERATE-HIGH and under-addressed. Must surface: non-estate Cluster C customer (mid-range commission tier), journeyman's return-home gossip, failed-apprentice fallback (returned to haulage).

### Everyday-Life Critic

#### AES-2 Compliance
Partial PASS with required augmentation. Changes ordinary life concretely in ancestral-Cluster-C polities but currently reads estate-facing with mobility annotation bolted on. Must surface non-estate customer tier + journeyman return-home gossip + failed-apprentice fallback.

#### Per-Cluster Signatures
(a) REQUIRED (canal-corridor overlap); (b) REQUIRED (estate); (c) CONDITIONAL on ancestral-range commitment; (d) silent absence; (e) silent absence.

#### Hero-Drift Risk
MODERATE-HIGH. Surface ordinary-commission tier (tenant-cottage loft-ladder, market-stall chair), failed-apprentice fallback, neighborhood-craft-quarter texture. Song-cycle mythologization risks heroic drift against AES-1; counterweight with work-song texture (tedium of road, missed harvest, homesick apprentice-note).

#### Concrete Ordinary-Life Touch Points
- Idiom: "chair-guild pricing."
- Rhyme: three-reciprocal-polity masters ("north for the horn, south for the hide, east for the fit").
- Gossip: tenant-cottage placement between subsection and wainwright proper.
- Fear: journeyman who did not return.
- Drill/norm: guild-seal recognition at charter-school.
- Craft-festival: subsection-guild journey-completion festival.
- Children's register: subsection-seal recognition in ancestral polities; visiting Cluster C travelers' fitments as recognized oddity elsewhere.

---

## Theme/Tone Critic

### Direct Contradictions
None.

### Soft Conflicts and Required Annotations
1. Reciprocal journeyman tradition risks drift into mythic register against AES-1. CF must frame as journeyman economics (narrow customer base → necessary itinerancy), NOT pilgrimage/calling.
2. Guild-seal risks sliding from charter-and-apprenticeship register into bloodline-authentic-manufacture register. CF must locate seal in charter-and-apprenticeship system; human journeyman completing Cluster-C-region training gets same seal.
3. "Upward-mobility route" must annotate route as alongside, not in place of, general guild mobility available to Cluster C — otherwise SOC-1 strained.

### Required Updates to Owned Files
None owned. Recommendations to CF notes and domain-file prose.

### Critical Risks
Live risk: mythic-journeymen romanticism if song-cycle not corralled; authenticity-seal inflation. Dormant: Cluster-C wealth universalization.

### Theme/Tone Critic

#### Primary Difference Preservation
STRENGTHENING if framed pragmatically. Embodiment produces labor-market consequence; exact Kernel claim served. No inflation if "older bloods" soft-canon kept dormant.

#### Tonal Contract Compatibility
Fits when framed as earthy trade fact. "Because large bodies need large harnesses, and the guilds built a way to make them" is in-register.

#### Genre Drift Risk
Live: crafter-heroism romanticism; authenticity-prestige drift. Dormant: noble-Cluster-C prestige fantasy; "ancient bloods" supremacy; mystical-species-uniqueness. Absent: chosen-one framing.

#### Tonally-Risky Framings
IN-register (recommend): subsection, commission, journeyman circuit, specialty harness, narrow customer base, reinforced wagon-bed, guild-seal of competence, well-paid because work is hard and customers few, estate modification, sober trade.

OUT-of-register (forbid): mystery of the craft, ancestral calling, sacred commission, bloodline authenticity, proud tradition of the old bloods, honored circuit, masters of their people's forms, pride of the Cluster, keepers of, any Capitalized-Phrase ennoblement, any language making subsection feel like cultural destiny rather than market response.

#### Story Engine Coherence
Strong alignment with artisan-coalition, mixed-species-estate-succession, bardic-circuit (keep in AES-1 register), animal-folk-magistrate. Does not generate artifact/ward/plague/inscription stories and does not need to.

---

## Mystery Curator

### Direct Contradictions
None.

### Soft Conflicts and Required Annotations
- M-4 pressure via progenitor-cult integration. CF must say subsection does NOT function as evidence for progenitor-position resolution.
- M-7 cross-application required. Proposal self-trace does NOT address M-7. Firewall gap.
- M-11 not implicated; self-trace omission is audit-hygiene flag only.
- Cluster C "older bloods" soft-canon: subsection prestige + journeyman reciprocity + upward-mobility = vector for Rule 3 specialness-inflation. CF must pre-empt.

### Required Updates to Owned Files
MYSTERY_RESERVE.md: M-7 CH-NNNN extension (subsection-master reputation parallel); OPEN_QUESTIONS.md Specific Guild Naming annotation; OPEN_QUESTIONS.md Species Population Ratios annotation; new M-12 entry.

### Critical Risks
Rule 3 specialness-inflation risk concrete, not hypothetical. CF MUST contain explicit disowning sentences.

### Mystery Curator

#### Per-Entry Mystery Status
- M-1, M-2, M-6, M-8, M-9, M-10: preserved.
- M-3: preserved. Self-trace correct.
- M-4: narrowed/pressured. Firewall required.
- M-5: preserved. Self-trace correct.
- M-7: forbidden-cheap-answer-touched absent cross-application firewall.
- M-11: not touched.

#### Required Scope Commitments
CF must say:
1. "The subsection is a body-plan accommodation craft. It does not constitute world-level authority for Cluster C 'older bloods' self-conception, which remains soft-canon at most."
2. "Progenitor-cult integration is sectarian activity, not civic/chartered endorsement. The subsection does not adjudicate M-4."
3. "Subsection-master reputations subject to M-7 reputation-genealogy firewall; no subsection-master holds world-level authority on Cluster C ancestry, Maker-Age adjacency, or progenitor-figure nature."
4. "The reciprocal tradition is craft-knowledge custody mechanism. Not evidence for any specific historical origin claim about Cluster C species, ancestral-region continuity, or craft antiquity (see new M-12)."

#### Firewall Adequacy
M-3, M-5: adequate. M-4: ABSENT, must add. M-7: ABSENT, must add (most serious gap). M-11: minor audit omission.

#### OPEN_QUESTIONS Items Now Pressured
- Specific Guild Naming: partially pressured; proposal defers specific names correctly.
- Species Population Ratios: pressured (ancestral-region upper-bound narrowing).
- Sentient–Non-Sentient Boundary: NOT pressured.
- Mythical-Species Embodiment: NOT pressured (DIS-3 respected).

#### New Mystery Reserve Entries Recommended
M-12 recommended — Historical Origin and Antiquity of the Oversize-Saddlery Craft and its Reciprocal Tradition. Three contested readings (Charter-Era-consolidated / pre-Charter-inherited / recent-innovation); disallowed cheap answers: world-level antiquity resolution, single founding-figure reveal, pre-Maker-Age descent claim (opens M-1 adjacency). Future-resolution safety: low.

## Synthesis (Phase 6b)

See Escalation Gate section above.

---

# New Canon Fact Records

- **CF-0032** — Oversize Saddlery Guild-Subsection for Cluster C Body Plans (Ancestral-Polity) — `status: soft_canon`, `type: institution`, `scope: regional / current / public`. Full record in `CANON_LEDGER.md`.

# Qualified Canon Fact Records

- **CF-0010** — notes-field + modification_history entry: architectural accommodation partially institutionalized via CF-0032 in ancestral polities; species distinctness now includes trans-regional professional vector.
- **CF-0011** — notes-field + modification_history entry: concrete Cluster C upward-mobility mechanism committed via CF-0032; class-mobility global scope preserved, concrete mechanism regional.
- **CF-0018** — notes-field + modification_history entry: CF-0032 guild-seal is narrow named exception to "socially legible without explicit guild branding" default; branding remains non-required elsewhere.

---

# Change Log Entry

**CH-0006** — `addition` — affected_fact_ids: [CF-0032 (added), CF-0010 (qualified), CF-0011 (qualified), CF-0018 (qualified)]. downstream_updates: PEOPLES_AND_SPECIES.md, INSTITUTIONS.md, ECONOMY_AND_RESOURCES.md, EVERYDAY_LIFE.md, GEOGRAPHY.md, TIMELINE.md, MYSTERY_RESERVE.md, OPEN_QUESTIONS.md. scope.local_or_global: local. scope.changes_ordinary_life: true. scope.creates_new_story_engines: true. scope.mystery_reserve_effect: expands. All `retcon_policy_checks` true. `latent_burdens_introduced`: 6 entries.

Full entry in `CANON_LEDGER.md` change log section.

---

# Required World Updates Applied

- **CANON_LEDGER.md**: CF-0010/CF-0011/CF-0018 notes-field + modification_history qualifications; new CF-0032 record appended; CH-0006 change log entry appended.
- **PEOPLES_AND_SPECIES.md**: Cluster C §Self-conception firewall annotation + §Embodiment effects on §labor third named specialty addition.
- **INSTITUTIONS.md**: Trade/Guilds §Internal Contradictions subsection commitment bullet; Law/Custom §Internal Contradictions fourth docket class bullet; Religion §Species-Progenitor Cults §Internal Contradictions doctrinal response bullet; Education/Apprenticeship §Internal Contradictions subsection apprenticeship bullet; Recordkeeping/Archives §Internal Contradictions reciprocal-journey verification archive bullet.
- **ECONOMY_AND_RESOURCES.md**: Wage Spreads bespoke body-plan row; Value Stores subsection placement-right bullet; Wealth Creation subsection mastery bullet; Inequality Patterns intra-Cluster-C stratification bullet.
- **EVERYDAY_LIFE.md**: cluster (a) canal-town heartland — Housing, Labor rhythm, Common aspirations, Common fears, Childrearing, Oral storytelling extensions; cluster (b) big-city estate — Housing, Labor rhythm, Aging, Common aspirations, Common fears extensions.
- **GEOGRAPHY.md**: new "Regional Coordination on Cluster C Subsection Presence" section (agreement pattern; regional distribution table).
- **TIMELINE.md**: Layer 2 Institutional residue reciprocal-journey consolidation bullet.
- **MYSTERY_RESERVE.md**: M-4 CH-0006 subsection-craft firewall extension; M-7 CH-0006 subsection-master reputation-genealogy extension; new M-12 entry for craft antiquity.
- **OPEN_QUESTIONS.md**: Specific Guild Naming CH-0006 extension; Species Population Ratios CH-0006 ancestral-region floor narrowing annotation; new "Reciprocal-Travel Case Law" item; new "Subsection-Seal Fraud Precedent" item.
