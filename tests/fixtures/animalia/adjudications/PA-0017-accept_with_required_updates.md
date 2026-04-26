---
pa_id: PA-0017
date: 2026-04-20
verdict: ACCEPT_WITH_REQUIRED_UPDATES
originating_skill: canon-addition
change_id: CH-0018
cf_records_touched: [CF-0046, CF-0047, CF-0017, CF-0024, CF-0031, CF-0033, CF-0034, CF-0037, CF-0044]
mystery_reserve_touched: [M-7, M-9, M-19]
invariants_touched: [DIS-2, SOC-1, SOC-3, AES-1]
open_questions_touched: [OQ-0058, OQ-0059, OQ-0060, OQ-0013]
---

# PA-0017 — Adjudication Record

---

# Proposal

- **Proposal ID**: PA-0017
- **Date**: 2026-04-20
- **Source**: briefs/animalia-drylands-deepening.md

Drylands regional deepening brief with 11 named commitments:

1. Caravan-corridor infrastructure (wells, gate-stops, villages, caravanserais) with drought → traffic/water pressure and runner-reachable village militia emergency response.
2. Oral-primary, only partially literate drylands culture — verse-counter, memorized repertoire, sparse station-logs, partial literacy.
3. Drylands trade-tongue — existing DIS-2 lingua franca applied in drylands as corridor-language; station-logs kept in it; keeper fluency load-bearing (Reading 1 — not a new distinct language).
4. Drylands well-keepers as mid-stratum customary-authority role; regionally respected; trade-useful; not backed by strong civic registry.
5. Drylands polity institutional thinness — thin civic registry, no real civic-court reach, caravan-master adjudication for some disputes.
6. Regional economy mostly reciprocity and in-kind; coin at the edges for practical transactions (supply runs); not pure barter but not heavily monetized.
7. Ecologically-disciplined life (drought cycles, water management, sun exposure, bodily conservation).
8. Drylands hospitality protocol includes apprenticeship, inheritance, repertoire transmission; structured lineage.
9. Cross-species travel through corridor requires etiquette; keeper adapts.
10. One-way cultural leakage drylands → heartland (drylands verse appears in heartland taverns stripped of protocol). (Already committed by CF-0044.)
11. Property/office can be lineage-based — well-stop as customary family property; office heirlooms pass within the line.

## User-Stated Constraints

- **Preferred scope**: regional (drylands).
- **Desired rarity**: common part of life in the region.
- **Dramatic purpose**: deepen drylands texture/realism to match heartland detail; drylands stories should feel "quite distinct" from heartland. Drought cycles + verse-tradition peculiar-exchanges as dramatic engines.
- **Revision appetite**: not explicitly stated.

---

# Phase 0–11 Analysis

## Phase 0: Normalize the Proposal

### Statement

The proposal commits a composite drylands-regional institutional-cultural complex deepening, bundling corridor-infrastructure, institutional-thinness, economic pattern, literacy register, ecological discipline, hospitality protocol, cross-species etiquette, and lineage-inheritance into a unified regional deepening. Phase 0 classification decision: TWO tightly-coupled CFs rather than one monster CF.

### Underlying World-Change

The drylands region is formalized as a distinct institutional-cultural complex operating at regional scale, stabilized by water-scarcity geography, caravan-rotation social form, and (critically) geographic non-transportability of canal-infrastructure that prevents heartland civic-registry export. The well-keeper emerges as a named customary-authority social role operating lineage-inheritable household-enterprise water-nodes within that complex.

### Canon Fact Type(s)

- **CF-0046** (primary_type: `institution`): Drylands caravan-corridor institutional-cultural complex. Composite of institution + route + ecological_system + text_tradition + historical_process + law/custom. Scope: regional. Status: hard_canon.
- **CF-0047** (primary_type: `social_role`): Drylands well-keeper as named customary-authority social role. Composite of social_role + institution (lineage-inheritable office) + craft (hospitality-keeping, station-log, verse-repertoire custody). Scope: regional. Status: hard_canon.

### Additional Domain Files Loaded

All 13 mandatory world files loaded via pre-flight (WORLD_KERNEL, INVARIANTS, ONTOLOGY, TIMELINE, GEOGRAPHY, PEOPLES_AND_SPECIES, INSTITUTIONS, ECONOMY_AND_RESOURCES, MAGIC_OR_TECH_SYSTEMS, EVERYDAY_LIFE, CANON_LEDGER, OPEN_QUESTIONS, MYSTERY_RESERVE). Large-file grep-then-targeted-read method applied to CANON_LEDGER, MYSTERY_RESERVE, EVERYDAY_LIFE, INSTITUTIONS, ECONOMY_AND_RESOURCES, OPEN_QUESTIONS.

Diegetic pre-figuring scan performed: DA-0001 "a-season-on-the-circuit" (Vespera Nightwhisper travelogue) references trade-tongue, caravanserai, drylands corridor — pre-figuring warrants DA-0001 citation in both CF records' `source_basis.derived_from`. No character-file pre-figuring found beyond trade-tongue literacy mentions in Vespera Nightwhisper and Melissa Threadscar dossiers (handled via DA-0001 citation).

## Phase 1: Scope Detection

- **Geographic / Temporal / Social**: CF-0046 regional / current / public. CF-0047 regional / current / public. Both align with stated scope; no hidden global reach.
- **Visibility / Reproducibility / Institutional awareness / Secrecy / Diffusion risk**: both CFs are public ordinary-life institutional patterns; no secrecy; diffusion risk low (see Phase 5).

One scope tension identified: "reciprocity-primary with coin at edges" could be misread as a global statement about all caravan-type regions. Logical scope holds regional (the brief explicitly delimits to drylands; coin-at-edges framing compatible with CF-0009 copper/silver preservation).

## Phase 2: Invariant Check

- **Classification**: compatible. DIS-2, SOC-1, SOC-3, AES-1 receive clarification annotations (not revisions); other invariants unaffected.
- **Invariants tested**: ONT-1 (no pressure), ONT-2 (no pressure), ONT-3 (no pressure), CAU-1 (no pressure), CAU-2 (no pressure), CAU-3 (no pressure), DIS-1 (no direct pressure; CF-0041 drylands qanat-cleaning-rite handles overlap), **DIS-2** (drylands-regional partial-literacy signature clarification required), **DIS-3** (no pressure), **SOC-1** (well-keeper no-species-gate reaffirming annotation required), **SOC-2** (no pressure), **SOC-3** (reciprocity-primary coin-at-edges preservation clarification required), **SOC-4** (no pressure; drylands corridor is non-chartered per CF-0046 reaffirmation), **AES-1** (working-texture register clarification required; forbidden-register enumeration paralleling CH-0016 CF-0044 precedent), AES-2 (reinforcing), AES-3 (no direct pressure).
- **Hard rejection triggers hit**: none.

## Phase 3: Underlying Capability / Constraint Analysis

**CF-0046 prerequisites**: drylands water-scarce geography (GEOGRAPHY); caravan-rotation social form (CF-0024); qanat/cistern infrastructure (EVERYDAY_LIFE §(d)); CF-0009 copper/silver currency for coin-at-edges; DIS-2 partial literacy substrate; CF-0034 caravan-master cargo-refusal judgment baseline. All trace to existing canon.

**CF-0047 prerequisites**: CF-0046 drylands corridor-complex substrate; water-scarce geography; CF-0044 verse-repertoire tradition; DIS-2 partial-literacy with trade-tongue fluency; SOC-3 coin-contract (at edges). All trace to existing canon or the co-proposed CF-0046.

## Phase 4: Prerequisites and Bottlenecks

**CF-0046 stabilizers**:
- Water-scarce geography + low tax-base + caravan-rotation population-swell combination exists only in drylands.
- **Geographic non-transportability of canal-infrastructure** (Systems/Economy critic contribution): heartland institutional thickness universalizes along canals; drylands lack water to float barges; heartland's institutional-export mechanism physically cannot reach drylands — the institutional-thinness equilibrium holds indefinitely.
- Reciprocity-economy returns-to-scale fall with institutional thickness; civic-registry introduction would DESTROY not merely compete with the economic substrate.

**CF-0047 stabilizers**:
- Wells-as-critical-water-nodes drylands-specific; heartland canal-lock has chartered lock-keeper (CF-0038); civic-chartered form replaces customary authority where wealth/institution exist.
- CF-0037 water-node/road-rest firewall — well-stop distinct from waystation.
- Customary authority stabilized by drylands institutional-thinness (CF-0046).
- Rule 3 absorption: no new wage-table row; absorbed within household-enterprise middle-stratum register paralleling CF-0037 stationkeeper-master.

## Phase 5: Diffusion and Copycat Analysis

**CF-0046 diffusion risk**: low. Heartland overland connector-route runs on CF-0037 family-waystations (not well-stops-with-keepers); highland clan-border roads run on clan-custom hospitality; mountain east has seasonal CF-0037 waystations; fenland summon-not-post. Water-scarcity + low-tax + caravan-rotation combination doesn't exist elsewhere.

**CF-0047 diffusion risk**: low. Wells-as-critical-water-nodes drylands-specific; heartland canal-locks have chartered lock-keeper (CF-0038). The civic-chartered form is the response where wealth and institution exist; drylands' institutional thinness keeps the well-keeper as customary-authority.

## Phase 6: Consequence Propagation

### First-Order
- Corridor-node typology (four node-types: wells, gate-stops, villages, caravanserai).
- Named customary-authority role (well-keeper) with lineage inheritance.
- Caravan-master corridor-internal adjudication scope.
- Runner-reached village militia response.
- Reciprocity-primary economy formalized.
- Drought-cycle calendar-marker register.
- Station-log convention in trade-tongue.

### Second-Order
- Cross-species hospitality etiquette at well-approach (CF-0036 friction-register preserved).
- New match-maker catechism question (*"whose well does your family keep?"*).
- New value-store category (well-stop placement-right as fourth multi-generational tenancy asset-class).
- New Breakage Point (well-lineage failure / drought-corridor collapse / caravan-master reputation-network rupture).
- New regional wealth-creation pattern (reciprocity-primary drylands economy as distinct regional path).
- Obligation-denominated stratification register.
- New idiom pair ("kept the well" / "walked the well") paralleling CF-0037.
- Drylands-trade-factor reciprocity-standing as ninth dowager-gossip axis at Brinewick outskirts estates.
- Drylands-learned-the-gate-turn saga-fragment in highland register.
- Heartland inbound drylands-verse tavern-fragment annotation.
- Fen non-participation via silence-discipline.

### Third-Order
- 13/13 exposition domains touched (everyday life, economy, law, religion, warfare, status order, kinship, architecture, mobility, environment, taboo/pollution, language/slang, memory/myth).
- Escalation gate FIRES.

## Phase 7: Counterfactual Pressure Test

### Stated Stabilizers

- Water-scarce geography (**geographic; NOT hand-wave**): drylands is actually water-scarce per GEOGRAPHY Climate Bands; stabilizer concrete.
- Low tax-base + caravan-rotation population-swell (**demographic; NOT hand-wave**): caravan-rotation means local population cannot amortize permanent civic-court infrastructure; tax-base literally non-resident for half the year; concrete mechanism.
- Geographic non-transportability of canal-infrastructure (**geographic-physical; NOT hand-wave**): heartland's institutional-export mechanism rides canals; drylands cannot float barges; concrete physical mechanism.
- Reciprocity-economy returns-to-scale decline with institutional thickness (**economic; NOT hand-wave**): concrete structural mechanism — reciprocity networks function below governance threshold, decay above it; civic-registry introduction destroys rather than competes.
- Multi-caravan-master reputation-boycott (**reputational-network; NOT hand-wave**): multi-master network overlap produces structural brake against graft/capture; concrete mechanism paralleling CF-0034 waiting-wolves judgment and CF-0036 mix-sound judgment.
- CF-0037 water-node/road-rest firewall (**categorical; NOT hand-wave**): water-node IS the asset (non-relocatable, drought-volatile); road-rest-node IS the asset (trade-flow-volatile); structural distinction preserves CF-0037 drylands-exclusion stabilizer.
- Rule 3 absorption to household-enterprise middle-stratum (**taxonomic; NOT hand-wave**): concrete precedent per CF-0037 stationkeeper-master register; no new anomalous wage-class.

All seven stabilizers name concrete mechanisms. No hand-wave stabilizers.

## Phase 8: Contradiction Classification

- **Hard contradictions**: none.
- **Soft contradictions**: CF-0037 §(d) drylands structural-absence line (*"drylands oasis-stops are caravanserai, NOT family-inheritance waystations"*). **Resolution**: water-node / road-rest-node firewall preserving CF-0037 drylands-exclusion stabilizer while committing CF-0046/CF-0047 as distinct category. CF-0037 receives `modification_history` entry (substantive extension: new firewall clause constraining future reading of CF-0037 drylands-absence to distinguish water-node family-inheritance from road-rest-node family-inheritance).
- **Latent contradictions**: well-stop wealth-concentration over generations vs. "mid-stratum" framing. **Resolution**: obligation-denominated-stratification annotation in §Inequality Patterns; visible-coin-wealth framing is one ledger, obligation-capital framing is a parallel ledger; mid-stratum holds at visible-coin-wealth measure.
- **Drift**: Orientalism + noble-primitive drift (Theme/Tone HIGH risk). **Resolution**: AES-1 register-discipline clarification paralleling CH-0016 CF-0044 precedent; forbidden-register enumeration + in-register enumeration.
- **Tone conflicts**: addressed at Phase 10.

## Phase 9: Repair Pass

### Options Considered

1. **One large composite CF** (all 11 strands in CF-0046). Rejected: too monolithic; well-keeper deserves named social-role treatment paralleling CF-0037 precedent.
2. **Two tightly-coupled CFs** (CF-0046 institutional complex + CF-0047 social role). **Adopted.**
3. **Three or more atomic CFs** (caravan-corridor complex + well-keeper + caravan-master-adjudication + institutional-thinness + station-log). Rejected: excessive fragmentation; the strands are structurally unified; CF-0033 / CF-0038 composite precedent supports bundling into institutional-complex + named-social-role pair.
4. **Reading 2 on trade-tongue** (distinct drylands-specific caravan tongue). Rejected: introduces unnecessary Rule 3 pressure; Reading 1 (DIS-2 existing lingua franca applied in drylands) is canon-consistent and sufficient.

### Options Declined (and why)

- **Absorbing well-stop placement-right into CF-0037 waystation placement-right** (declined per Systems/Economy critic): absorption erases load-bearing differences (water-node vs. road-rest-node; drought-volatile vs. trade-flow-volatile; customary-NOT-civic vs. civic-registry-backed). Named as fourth multi-generational tenancy asset-class.
- **Framing caravan-master adjudication as sixth Charter-Era structural axis** (declined per Politics/Institution critic): drylands polities AGREE on thin-institution equilibrium; this is uncontested regional-consensus, not polity-asymmetric disagreement; new GEOGRAPHY §Regional Asymmetry on Drylands Institutional Thinness section distinguishes this from the five existing structural axes.
- **Creating new Mystery Reserve entries** for drylands infrastructure antiquity (declined per Mystery Curator): ordinary author-side deferral paralleling CF-0037 waystation-antiquity and CF-0044 verse-convention-antiquity precedents; Rule 7 obligation discharged with documented negative finding.
- **Named runner-militia as new CF-0020 standing-militia subtype** (declined per Politics/Institution critic): informal emergency-response folk-practice paralleling fenland amphibian-folk canary vigilance relay pattern (CF-0025 frame); Rule 3 firewall applied.

### Options Adopted (and what they preserve vs. sacrifice)

- **Water-node/road-rest-node firewall**: preserves CF-0037 drylands-exclusion stabilizer; sacrifices nothing substantive (the two CFs co-exist cleanly).
- **Well-stop placement-right as fourth multi-generational tenancy asset-class**: preserves categorical distinctness; sacrifices absorption-simplicity (but absorption would erase differences).
- **AES-1 register-discipline clarification**: preserves tonal contract; enumerates forbidden and in-register language paralleling CH-0016 CF-0044 precedent.
- **Three Mystery Reserve extensions (M-7, M-9, M-19)**: preserve bounded-unknown discipline; cover well-keeper-as-oracle drift, station-log-as-custody-channel drift, qanat-antiquity-as-M-19-parallel drift.
- **DIS-2-convergence annotation on trade-tongue**: preserves Maker-Age Linguistic Recovery deferral; discharges potential Maker-mystic projection on trade-tongue.
- **Six CFs receive `modification_history` entries**: CF-0024, CF-0031, CF-0033, CF-0034, CF-0037, CF-0044. Audit trail preserved per Rule 6.

## Phase 10: Narrative and Thematic Fit

- **Primary Difference preserved**: PD-1 (animal-folk civic participation) reinforced via cross-species etiquette in CF-0047; PD-2 (magic-as-artifact) untouched.
- **Tonal contract compatible** with AES-1 register-discipline annotation and SOC-3 reciprocity-clarification committed.
- **Natural story engines generated**: well-keeper inheritance dispute under drought; caravan-master adjudication of sealed-cargo-refusal; runner-militia response to bandit corridor; emigrant returning "dumb at the gate"; plague-year who-waters-who; reciprocity-default crisis at drought-break; drought-corridor-collapse refugee migration northward; walked-the-well exile into CF-0024/CF-0034 feeders. All kernel-compatible.
- **No Mystery Reserve forbidden-answer collisions**: all firewall commitments applied at CF-level; Rule 7 preserved.

---

# Phase 14a Validation Checklist

- Test 1 (Rule 2 / domains_affected non-empty): PASS — CF-0046 has 11 domain labels (labor, economy, settlement_life, law, language, daily_routine, ecology, mobility, kinship, status_signaling, memory_and_myth), CF-0047 has 7 (labor, kinship, settlement_life, status_signaling, language, law, daily_routine); all drawn from canonical enum and established ledger extensions.
- Test 2 (Rule 1 / prerequisites + costs_and_limits + visible_consequences populated): PASS — CF-0046 and CF-0047 both populate all three; CF-0046 prerequisites trace to CF-0024/0034/0041/0044/0009 + DIS-2 + geography; CF-0047 prerequisites trace to CF-0046/0044 + DIS-2 + SOC-3; costs_and_limits enumerate stabilizers and firewalls; visible_consequences name corridor-node typology, apprenticeship register, drought-cycle markers, dowager-gossip axis, etc.
- Test 3 (Rule 4 / capability/artifact distribution.why_not_universal populated): PASS — both CFs have scope.geographic `regional` and populate distribution.why_not_universal with concrete stabilizers (geographic non-transportability, water-scarce + low-tax + caravan-rotation combination, water-node-drylands-specific, CF-0037 water-node/road-rest firewall).
- Test 4 (Rule 5 / Phase 6 2nd+3rd-order consequences appear in CF or required_world_updates): PASS — 11 files patched with concrete prose extensions covering corridor-infrastructure, dowager-gossip axis, saga-fragment, per-cluster signatures, drought-cycle calendar-markers, obligation-denominated stratification, well-lineage failure Breakage Point, Mystery Reserve firewalls; every consequence traces to a specific patch.
- Test 5 (Rule 6 / Change Log Entry retcon_policy_checks all true): PASS — CH-0018 retcon_policy_checks all true (no silent edit; no replacement needed for addition change_type; no stealth diegetic rewrite; net contradictions not increased; world identity preserved). CF-0037 modification_history entry preserves audit trail for the water-node/road-rest firewall distinction.
- Test 6 (Rule 7 / no unrepaired forbidden-answer collisions): PASS — Mystery Curator Phase 6b found no forbidden-answer collisions with new CFs; three firewall extensions (M-7, M-9, M-19) applied explicitly; no new MR entries warranted (Rule 7 obligation discharged with documented negative finding per Mystery Curator synthesis).
- Test 7 (Phase 12a Required Update List + Phase 13a patches present for every required_world_updates entry): PASS — CF-0046 and CF-0047 required_world_updates list all 11 domain files (WORLD_KERNEL, INVARIANTS, ONTOLOGY, GEOGRAPHY, PEOPLES_AND_SPECIES, INSTITUTIONS, ECONOMY_AND_RESOURCES, EVERYDAY_LIFE, OPEN_QUESTIONS, MYSTERY_RESERVE, TIMELINE); all 11 have concrete Phase 13a patches; summaries present in Tier 2 deliverable summary (placement b per accept-path.md).
- Test 8 (Phase 7 stabilizers name concrete mechanisms; no hand-waves): PASS — seven stated stabilizers each name a concrete mechanism (geographic, demographic, physical, economic, reputational, categorical, taxonomic); no hand-waves identified in Phase 7 review.
- Test 9 (Verdict reasoning cites specific phase findings; not vague): PASS — verdict justification below cites Phase 2 (invariants compatible), Phase 3 (prerequisites trace to existing canon), Phase 4-5 (stabilizers including Systems/Economy geographic non-transportability contribution), Phase 6 (13/13 domains touched), Phase 6b (six critic reports with 13 synthesized commitments), Phase 7 (no hand-waves), Phase 8 (CF-0037 soft-conflict resolved via water-node/road-rest firewall), Phase 9 (repair pass preserves dramatic intent), Phase 10 (Primary Difference preserved, AES-1 register-discipline required, story-engine coherence strong).
- Test 10 (Rule 3 / no unmotivated superlative or ordinal claims; superlatives stabilizer-backed or softened to pragmatic-scale): PASS — CF-0046 / CF-0047 statements avoid superlative-register; "mid-stratum" register is explicitly working-texture, not prestige-caste; forbidden-register list explicitly enumerates superlative-adjacent drifts ("wise well-keeper", "legendary corridor", "chosen well-line", etc.); no "#1", "most", "greatest", "world-first" claims; regional-pattern register is "uncontested regional-consensus" NOT "unique regional structure"; Phase 6b Theme/Tone critic primary catchment against superlative drift confirmed compliant.

---

# Verdict

**Verdict**: ACCEPT_WITH_REQUIRED_UPDATES

---

# Justification

The proposal is a composite drylands regional deepening committing two tightly-coupled hard-canon facts: CF-0046 (drylands caravan-corridor institutional-cultural complex) and CF-0047 (drylands well-keeper as named customary-authority social role). Phase 0 classification split the composite brief into two CFs rather than one monolith (per CF-0037 + CF-0038 composite-CF precedent) or three-plus atomic CFs (which would fragment structurally-unified strands).

Phase 2 found all invariants compatible; DIS-2 / SOC-1 / SOC-3 / AES-1 receive clarification annotations (not revisions), paralleling the CF-0044 CH-0016 annotation pattern.

Phase 3 found all prerequisites trace to existing canon (CF-0009 copper/silver, CF-0024 caravan-rotation, CF-0031 registry-weakness, CF-0034 caravan-master cargo-refusal, CF-0037 apprenticeship precedent, CF-0041 qanat-cleaning-rite, CF-0044 verse-repertoire) or to the co-proposed CF-0046/CF-0047 pair.

Phase 4-5 stabilizers survive Phase 7 counterfactual pressure: water-scarce geography + low tax-base + caravan-rotation + **geographic non-transportability of canal-infrastructure** (the Systems/Economy critic's load-bearing contribution — heartland's institutional-export mechanism physically cannot reach drylands because canal-based export has no water to float on) + reciprocity-economy returns-to-scale + multi-caravan-master reputation-boycott. Seven concrete stabilizer mechanisms; no hand-waves. Diffusion risk is low because each region's equivalent social-work is done by a structurally different institution.

Phase 6 found 13/13 exposition domains touched — escalation gate fires. Six critics dispatched in parallel: Continuity Archivist (identified CF-0037 water-node/road-rest firewall as load-bearing HIGH risk; recommended `addition` change_type); Systems/Economy (surfaced geographic non-transportability as load-bearing stabilizer; identified water-node wealth-concentration HIGH risk; named well-stop placement-right as fourth multi-generational tenancy asset-class); Politics/Institution (identified caravan-master adjudication scope-firewall need; affirmed runner-militia ≠ CF-0020-subtype ≠ dragoon-precursor firewall); Everyday-Life (flagged hero-drift MODERATE risk on well-keeper; identified per-cluster signature gaps requiring cross-cluster annotations); Theme/Tone (identified Orientalism + noble-primitive + desert-warrior drift HIGH risk; recommended AES-1 register-discipline annotation paralleling CH-0016 precedent); Mystery Curator (identified 4 mandatory firewalls: M-7 well-keeper sub-specialty, M-9 station-log custody-channel, M-19 drylands-infrastructure scoped-distinct, DIS-2-convergence on trade-tongue).

Phase 6b synthesis integrated 13 consolidated commitments from the six critic reports. All 13 are reflected in the final CF records (costs_and_limits enumeration), the invariant clarification annotations (DIS-2, SOC-1, SOC-3, AES-1), the three Mystery Reserve firewall extensions (M-7, M-9, M-19), the GEOGRAPHY new Regional Asymmetry on Drylands Institutional Thinness section, the INSTITUTIONS law/custom/judgment caravan-master adjudication scope-firewall, the INSTITUTIONS military/defense runner-militia firewall, the INSTITUTIONS recordkeeping station-log NOT new archival category firewall, the INSTITUTIONS trade/guilds corridor NON-CHARTERED reaffirmation, the ECONOMY new Value Stores fourth multi-generational tenancy asset-class entry, the ECONOMY new Breakage Points well-lineage-failure/drought-corridor-collapse entry, the ECONOMY new Wealth Creation reciprocity-primary regional path entry, the EVERYDAY_LIFE per-cluster signature annotations (heartland inbound drylands-verse, outskirts-estate ninth dowager-gossip axis, highland clansman-learned-the-gate-turn saga-fragment, drylands extensive extension, fenland non-participation silence-discipline), the OPEN_QUESTIONS two new sections (Drylands Caravan-Corridor Infrastructure Antiquity + Well-Stop Succession Case Law) plus two pressured-deferral annotations (§Drylands Short-Poetry Convention Antiquity and Scope + §Maker-Age Linguistic Recovery DIS-2-convergence discharge).

Phase 7 counterfactual pressure test found no hand-wave stabilizers; each mechanism survives "what if stabilizer X were absent?" test with concrete structural consequence.

Phase 8 classified one soft-conflict with CF-0037 §(d) structural-absence line. Phase 9 resolved via water-node/road-rest firewall preserving CF-0037 stabilizer through categorical distinction rather than scope retcon; CF-0037 receives `modification_history` entry per Rule 6 audit trail discipline. Six CFs total receive `modification_history` entries: CF-0024 (axis a from CF-0046 derived_from; caravan-master adjudication extension to caravan-rotation frame), CF-0031 (axis c; drylands registry-thinness alternative-institutional-substrate reason), CF-0033 (axis c; runner-militia ≠ dragoon-precursor firewall), CF-0034 (axis c; caravan-master corridor-adjudication extends waiting-wolves judgment register), CF-0037 (axis b/c; water-node/road-rest firewall), CF-0044 (axis a from CF-0047 derived_from; well-keeper as verse-book-custodian formalization).

Phase 10 narrative and thematic fit: Primary Difference preserved (PD-1 animal-folk civic participation reinforced via cross-species well-keeper etiquette; PD-2 magic-as-artifact untouched); tonal contract compatible under AES-1 register-discipline annotation; story-engine coherence strong with kernel-compatible engines (well-keeper inheritance dispute under drought; caravan-master adjudication of sealed-cargo-refusal; runner-militia response to bandit corridor; emigrant returning "dumb at the gate"; drought-corridor-collapse refugee migration; etc.).

The two CFs, the six modification_history entries, the three Mystery Reserve extensions, the two new OPEN_QUESTIONS sections, the two pressured-deferral annotations, and the 11 domain-file patches are committed together under Change Log Entry CH-0018 (`change_type: addition`, affecting 8 CF ids total: CF-0046 and CF-0047 added; CF-0017, CF-0024, CF-0031, CF-0033, CF-0034, CF-0037, CF-0044 qualified or cross-referenced — note CF-0017 is cross-referenced in CF-0047 derived_from per the DA-0001 pre-figuring chain but does NOT receive modification_history under the axis-(c) decision test per SKILL.md Phase 12a discipline since CF-0017 is not substantively extended).

---

# Critic Reports

## Continuity Archivist

### Direct Contradictions

- **CF-0037 "NOT drylands south" structural-absence commitment** (§prerequisites line 4513, §distribution line 4524, §Stabilizer (i) line 4743). CF-0037 explicitly excludes drylands from the family-handled-station-as-inherited-household-enterprise tradition on the stated ground that "drylands water-cistern logistics make rotating caravan-train cistern-management economically superior to fixed-station resupply; caravan-rotation IS the cistern-management mechanism." The proposed CF-0047 lineage-inheritable well-stop with apprenticeship-from-young and walking-away register reads as the drylands version of exactly what CF-0037 structurally excluded. The idiom *"the southern road keeps no stop"* (Charter-Era Layer-2 annotation, TIMELINE line 31) is load-bearing structural absence, not thin commitment. Proposal CF-0046/0047 MUST commit the well-stop ≠ waystation distinction operationally and textually (water-node vs road-rest-node), preserve the *"southern road keeps no stop"* idiom intact, and preserve the CF-0037 cistern-caravan-rotation stabilizer rather than silently overwriting it. Otherwise Rule 6 retcon.
- None otherwise.

### Soft Conflicts and Required Annotations

- **CF-0037 Stabilizer (i) needs reaffirming annotation**, NOT revision: well-stop is water-node family property, distinct in origin and economic substrate from road-rest fixed-station (which remains structurally absent in drylands per caravan-rotation mechanism).
- **CF-0044 one-way bardic-flow** and **verse-repertoire / retiring keeper's verse-book** already commit keeper-verse integration. CF-0046/0047 must cross-reference CF-0044 as co-constitutive rather than superseding; annotate CF-0044 visible_consequences (retiring-keeper's-verse-book) under CH-NNNN as formal well-stop-heirloom convention.
- **CF-0017 circuit-bards** and **CF-0024 caravanserai posting-boards** need annotation acknowledging drylands trade-tongue as the corridor-language substrate (not a new language per Reading 1).

### Required Updates to Owned Files

**CANON_LEDGER.md**: Append CF-0046 + CF-0047 + CH-NNNN. Add modification_history entries to: CF-0037, CF-0044, CF-0017, CF-0024, CF-0031, CF-0033, CF-0034.

**TIMELINE.md**: Layer 1 and Layer 2 annotations under CH-NNNN.

### Critical Risks

1. **HIGH: CF-0037 structural-absence silent erosion.** Mitigated by explicit water-node/road-rest firewall.
2. **MEDIUM: Charter-Era stress-register inflation.** Required CF-0046 costs_and_limits commitment: NOT a sixth structural axis — uncontested regional-consensus.
3. **MEDIUM: Rule 3 absorption discipline.** Runner-militia / caravan-master adjudication / well-keeper role must each be ABSORBED with explicit firewall clauses.
4. **LOW: M-12 oversize-saddlery antiquity contestation** untouched, but drylands corridor-institution antiquity should parallel CF-0037/CF-0044 pattern as OPEN_QUESTIONS deferral.

### Timeline Updates Required

- Layer 1 Pre-Charter annotation: drylands corridor-as-node-network + well-keeper lineage + oral-tradition + trade-tongue-as-corridor-language as pre-Charter folk-tradition residue.
- Layer 2 Charter-Era annotation: drylands corridor-institution NEITHER chartered NOR displaced.
- Layer 3: no entry required.
- Layer 4: no entry required.

### Latent Burdens

- Well-stop succession disputes as drylands operational-docket parallel to CF-0037 waystation-succession.
- Verse-book heirloom ownership disputes.
- Runner-militia ≠ dragoon ≠ CF-0024 contractor boundary maintenance.
- Drylands trade-tongue register-drift risk.
- Cross-species etiquette firewall preservation.
- Reciprocity-primary economy ≠ SOC-3 erosion preservation.
- Well-stop fortification register on wildland stretches.

### Retcon Framing Recommendation

**`addition`** is correct. Not `ontology_retcon`. Not `scope_retcon`. The cleanest framing: `change_type: addition` with two new CF records + modification_history entries on cross-referenced CFs documenting cross-reference-annotation-only (no content revision); CF-0037 modification_history entry is load-bearing as the firewall against Rule 6 silent retcon.

## Systems/Economy Critic

### Direct Contradictions

- **None identified** as hard contradictions.

### Soft Conflicts and Required Annotations

- **SOC-3 coin-contract / reciprocity-primary tension.** SOC-3 sacredness preserved at coin-at-edges contact surface; reciprocity obligations customary-reputation-enforced, NOT a separate sacred tier.
- **Caravan-master adjudication vs. SOC-3 and Charter-Era extradition.** Annotate as CUSTOMARY-CORRIDOR, NOT chartered.
- **CF-0044 verse-competence / CF-0047 well-keeper overlap.** Well-keeper placement-right derives from FIXED-INFRASTRUCTURE + lineage-inheritance, NOT from verse-competence.

### Required Updates to Owned Files

**ECONOMY_AND_RESOURCES.md**:
- §Wage Spreads: append well-keeper household row paralleling CF-0037 stationkeeper-master. Rule 3 absorption explicit.
- §Value Stores: add **"Well-stop tenancy / placement-right (CF-0047)"** as a **FOURTH multi-generational tenancy asset**.
- §Scarcity Map drylands row: annotate well-node concentration risk.
- §Breakage Points: append **"Well-lineage failure / drought-cycle-corridor collapse"**.
- §Trade Flows: annotate drylands reciprocity-primary at corridor-internal hops, coin-at-heartland-border.

**INSTITUTIONS.md**:
- §Trade/Guilds/Caravans/Shipping internal contradictions: append CF-0046 corridor-complex NON-CHARTERED reaffirmation.
- §Law/Custom/Judgment: annotate caravan-master adjudication as CUSTOMARY-CORRIDOR-REGISTER.
- §Education/Apprenticeship: Well-keeper chore-from-young added.

### Critical Risks

1. **Water-node wealth concentration (HIGH).** Mitigation: drought-cycle customary hospitality obligations + inter-corridor caravan-master reputation-boycott as structural brake.
2. **Caravan-master adjudication → graft/coercion (HIGH).** Stabilizer: multi-caravan-master precedent register; cross-caravan challenge convention.
3. **Reciprocity-primary hides inequality (MEDIUM).** Inequality Patterns needs obligation-denominated-stratification annotation.
4. **Corridor-arbitrage vs. civic-court polities (MEDIUM).** Firewall: corridor-custom adjudication does NOT supersede civic-court jurisdiction.
5. **Station-log record-custody arbitrage (LOW-MEDIUM).** Traveler-privacy-norm protected by corridor custom.
6. **Diffusion stabilizer economic soundness (MEDIUM).** Missing force: **geographic non-transportability of canal-infrastructure** prevents heartland civic-registry expansion into drylands corridor. Named explicitly.

### Economic Plausibility of Stated Stabilizers

Partially sufficient but under-specified. Missing the LOAD-BEARING force: **geographic non-transportability of canal infrastructure**. Named explicitly. Reciprocity-economy returns-to-scale decline identified as missing stabilizer.

### Missed Economic Consequences

1. Well-node monopoly rent across generations.
2. Labor substitution for apprentices.
3. Drought-cycle debt-peonage pressure.
4. Station-log as latent information-asset.
5. Reciprocity-to-coin pressure at heartland border.

### Market Structure Risks

- Well-stop placement-right as FOURTH multi-generational tenancy asset-class: **name as fourth**, because absorbing into CF-0037 would erase load-bearing differences.
- Caravan-master adjudication authority as latent regulatory-capture: multi-caravan-master network overlap as check.
- Arbitrage against civic-court polities: firewall annotation.
- No new authentication-cartel vector confirmed (station-logs are ephemeral manifest records).
- Hidden subsidy: drylands economy cross-subsidized by heartland grain/coin flowing in at corridor-border.

## Politics/Institution Critic

### Direct Contradictions

- None identified.

### Soft Conflicts and Required Annotations

- **Caravan-master adjudication scope wording risks Rule 4 globalization drift.** Scope as CORRIDOR-INTERNAL CUSTOMARY DISPUTE RESOLUTION.
- **Runner-reached village militia** firewall against reading as new CF-0020 subtype or drylands proto-dragoon emergence.
- **Well-stop lineage-inheritable office** NON-CHARTERED annotation paralleling CF-0037 clause.
- **Trade-tongue station-log in drylands** M-1 / M-9 firewalls hold.

### Required Updates to Owned Files

**INSTITUTIONS.md**:
- §Law/Custom/Judgment: append CF-0046 bullet for drylands caravan-master customary-adjudication as MINOR operational NON-DOCKET line, NOT sixth-axis, NOT magistrate-reachable.
- §Religion/Ritual Authority: short CF-0046 note on common-pantheon water-god aspectualization.
- §Trade/Guilds/Caravans/Shipping: CF-0047 well-keeper tradition NON-CHARTERED reaffirmation.
- §Recordkeeping/Archives: CF-0046 station-log NOT new numbered archival category firewall.
- §Education/Apprenticeship: CF-0047 apprenticeship FIFTH household-trade labor-onboarding pattern.
- §Military/Defense: CF-0046 runner-reached village militia informal-emergency-response firewall.

**TIMELINE.md**: Layer 3/4 annotations (not required, but drylands institutional-thinness as Charter-Era-persistent pattern).

### Critical Risks

1. Inter-polity caravan-master-ruling recognition drift: explicit non-extradition firewall required.
2. Well-stop succession-failure magistrate-reach: annotation against silent civic-court expansion.
3. SOC-1 cross-species etiquette breach: firewalled.
4. Eleventh/twelfth archival category inflation risk: Rule 3 firewall.
5. Dragoon-adoption posture preservation: runner-militia firewall.

### Guild Response Plausibility

- Chartered-extraction-guild: minimal drylands presence. Institutional history coherent.
- Caravan-guild interface: CUSTOMER-relationship under SOC-3 edge-coin.
- Inn-guild: no friction.

### Civic/Legal Pressure

Charter-Era settlement strains at drylands-heartland commerce interface but does NOT break. Extradition dockets see NO new asymmetry axis.

### Religious Pressure

Progenitor-cult southern flavor + common-pantheon water-rites at qanat-cleaning already committed. No new doctrinal commitment needed.

### Archive / Knowledge-Custody Pressure

Station-log NON-ARCHIVAL. **NOT an eleventh/twelfth archival category.** M-1 / M-9 firewalls load-bearing.

## Everyday-Life Critic

### Direct Contradictions

- None identified.

### Soft Conflicts and Required Annotations

- CF-0037 §(d) structural-absence tension — annotation distinguishing well-keeper-stop from caravanserai and family-handled waystation.
- CF-0044 verse-book inheritance elevated to full lineage-inheritable office.
- CF-0047 age 6-7 apprenticeship as drylands-specific parallel to CF-0037.

### Required Updates to Owned Files

**EVERYDAY_LIFE.md §(d)**:
1. Extend Housing: corridor-node typology.
2. Extend Childrearing: well-keeper-child register.
3. Extend Labor rhythm: well-keeper customary authority + drought-cycle traffic pressure.
4. Extend Common fears: lineage-failure, reciprocity-default, drought-cycle compression.
5. Extend Common aspirations: keeping-book passed whole, corridor knows her name in two seasons.
6. Extend Courtship and marriage: well-keeper-lineage match-maker catechism.
7. Extend Oral storytelling: station-log as fifth literacy-register.

**EVERYDAY_LIFE.md §(a), §(b), §(c), §(e)**: per-cluster signature additions.

**WORLD_KERNEL.md**: extend CF-0044 annotation to acknowledge well-keeper as primary verse-repertoire custodian.

### Critical Risks

1. Texture-without-grip risk on institutional-thinness commitment.
2. Well-keeper hero-drift (MODERATE).
3. Drought-cycle engine under-operationalized.

### AES-2 Compliance

Marginal. Institutional-thinness claim is sharpest AES-2 wedge but needs §(d) touch-points in Courtship/marriage, Medicine, and Death disposal.

### Per-Cluster Signatures

- **§(a) Canal-Town Heartland**: WEAK. Required: inbound drylands-verse tavern-fragment annotation.
- **§(b) Big-City Outskirts Estate**: NEAR-ABSENT. Required: drylands-trade-factor reciprocity-standing dowager-gossip axis.
- **§(c) Cold North Highland**: ADEQUATE. Required: clansman-learned-the-gate-turn saga-fragment.
- **§(d) Drylands South**: OBVIOUSLY SIGNATURE. Near-saturation risk.
- **§(e) Fenlands West**: ABSENT BY DESIGN. Required: non-participation via silence-discipline annotation.

### Hero-Drift Risk

MODERATE. Mitigation: "ordinary well-keeper" register commitment.

### Concrete Ordinary-Life Touch Points

- Children: keeping-book catechism from apprentice-keeper cousin; station-log alphabet.
- Drills/precautions: drought-cycle keeping-book audit.
- Gossip: estate-factor reciprocity-standing; well-keeper lineage prospects.
- New fears: lineage-failure, drought-year reciprocity-default, trade-tongue fluency erosion.
- Drought-cycle calendar-markers required in §(d) labor rhythm.

## Theme/Tone Critic

### Direct Contradictions

None identified against Kernel text or aesthetic invariants.

### Soft Conflicts and Required Annotations

- **SC-1 well-keeper prestige-caste drift risk**: CF-0047 must explicitly inherit CF-0037's cadence and forbid lineage-glory register.
- **SC-2 noble-primitive pastoral register risk**: must annotate SOC-3 explicitly — coin-contract sanctity HOLDS in drylands.
- **SC-3 cross-species hospitality etiquette**: annotate drylands hospitality is CHARTER-CUSTOM obligation under load, not unearned harmony.

### Required Updates to Owned Files

- **WORLD_KERNEL.md "What Is Ordinary" drylands block**: append CF-0046/47 drylands-specific texture additions.
- **INVARIANTS.md AES-1**: add CH-NNNN clarification parallel to CH-0016 with forbidden-register enumeration.
- **INVARIANTS.md SOC-3**: optional clarification on reciprocity-primary.

### Critical Risks

1. **Orientalism drift (HIGHEST)** — mitigate by ensuring drylands is EQUALLY ordinary, unromantic, contaminated.
2. **Noble-primitive pastoral drift** — pragmatic default, not noble simplicity.
3. **Desert-warrior glory-register adjacency** — anchor to AES-1; paid laborers, not chieftains.

### Primary Difference Preservation

PASS with mitigation.

### Tonal Contract Compatibility

PASS-WITH-MITIGATION.

### Genre Drift Risk

HIGH if unmitigated.

### Tonally-Risky Framings

**In-Register Language (fits)**:
- "the well-keeper's word"
- "kept the well" / "walked the well" (CF-0037 parallel)
- "trade-useful," "working-texture," "station-log register," "runner-reached"
- "paid carrier of liability"
- "the corridor knows her name in two seasons"
- "the keeper sent the runner; the magistrate will come in four days"

**Forbidden Register (does NOT fit)**:
- "wise well-keeper," "ancient keeper-lineage," "venerable gate-custom"
- "refined drylands hospitality," "sophisticated caravan culture," "cultured drylanders"
- "the great keeper of the Third Well," "keeper-elite," "hereditary verse-lord"
- "pristine pre-civic tradition," "pure reciprocity economy," "untainted by coin"
- "destined caravan-master," "the legendary corridor," "chosen well-line"
- "noble caravan-master adjudicating in timeless wisdom"
- "desert warriors," "corridor princes," "well-lords"
- "the simple honest drylanders" (noble-primitive cadence)
- "the drylands that coin had not yet corrupted"

### Story Engine Coherence

PASS with direction. Distinctiveness from heartland comes from the SCARCITY GRAMMAR, not from exotic atmosphere.

## Mystery Curator

### Direct Contradictions

None identified.

### Soft Conflicts and Required Annotations

- CF-0046 station-log M-9 firewall annotation required.
- CF-0046 caravan-corridor infrastructure M-19 antiquity scoped-distinct firewall required.
- CF-0047 well-keeper M-7 sub-specialty holding clause required.
- CF-0046 trade-tongue §Maker-Age Linguistic Recovery DIS-2-convergence firewall required.

### Required Updates to Owned Files

**MYSTERY_RESERVE.md**:
- M-7 Extension (CH-NNNN) — Drylands well-keeper sub-specialty holding clause.
- M-9 Extension (CH-NNNN) — Caravan-corridor station-log not-a-custody-channel firewall.
- M-19 Extension (CH-NNNN) — Drylands corridor-infrastructure antiquity scoped-distinct firewall.

**OPEN_QUESTIONS.md**:
- NEW §Drylands Caravan-Corridor Infrastructure Antiquity (author-side deferral).
- Annotate §Drylands Short-Poetry Convention Antiquity and Scope (pressured).
- Annotate §Maker-Age Linguistic Recovery (DIS-2-convergence discharge).

### Critical Risks

1. Station-log as latent Maker-knowledge custody channel (HIGH).
2. Well-keeper-as-oracle drift (HIGH).
3. Qanat-antiquity leak toward M-19 parallel (MEDIUM).
4. Trade-tongue linguistic-recovery adjacency (LOW-MEDIUM).

### Per-Entry Mystery Status

- M-1: preserved.
- M-2: preserved.
- M-4: preserved.
- M-7: preserved IF new well-keeper sub-specialty holding clause added.
- M-8: preserved.
- M-9: preserved IF new station-log not-a-custody-channel firewall added.
- M-10: preserved.
- M-14: preserved.
- M-17, M-18: preserved.
- M-19: preserved IF new scoped-distinct firewall added.
- M-20: preserved.
- Linguistic Recovery (OQ): preserved IF explicit DIS-2-convergence annotation added.

### Required Scope Commitments

CF-0046 explicitly commits: (a) station-log as mundane corridor record NOT Maker-knowledge channel; (b) drylands corridor-infrastructure antiquity author-side deferred; (c) trade-tongue as DIS-2-convergence mundane trade-pidgin.

CF-0047 explicitly commits: (a) well-keeper authority customary/mid-stratum NOT oracle-register; (b) lineage-inheritance institutional-role continuity NOT knowledge-genealogy; (c) verse-repertoire absorption within CF-0044 register.

### Firewall Adequacy

All four required firewalls applied as MR extensions + OPEN_QUESTIONS discharge.

### OPEN_QUESTIONS Items Now Pressured

- §Drylands Short-Poetry Convention Antiquity and Scope: preserve deferral via explicit non-resolution annotation.
- §Waystation Tradition Antiquity: parallel precedent, not pressured.
- §Per-Polity Waystation Tenancy and Licensing Regimes: NOT pressured.
- §Maker-Age Linguistic Recovery: discharge with DIS-2-convergence annotation.

### New Mystery Reserve Entries Recommended

**NONE warranted.** Rule 7 obligation discharged with documented negative finding.

## Synthesis (Phase 6b)

**Convergent concerns**:

1. CF-0037 water-node/road-rest firewall required (Continuity Archivist, Everyday-Life) — resolved via explicit categorical distinction and CF-0037 modification_history entry.
2. Rule 3 absorption discipline on multiple surfaces (Continuity Archivist, Systems/Economy, Politics/Institution, Mystery Curator): well-keeper NOT sixth M-7 cohort, runner-militia NOT new CF-0020 subtype, station-log NOT new archival category, well-keeper NOT new wage-class row. All resolved via firewall clauses.
3. AES-1 register-discipline clarification required (Theme/Tone, Continuity Archivist, Everyday-Life) — resolved via CH-0018 AES-1 extension paralleling CH-0016 CF-0044 precedent with enumerated forbidden and in-register language.
4. Geographic non-transportability of canal-infrastructure as load-bearing stabilizer (Systems/Economy) — surfaced commitment; named explicitly in CF-0046 distribution.why_not_universal.
5. Four Mystery Reserve firewalls required (Mystery Curator) — all applied: M-7 well-keeper sub-specialty, M-9 station-log custody-channel, M-19 drylands-infrastructure scoped-distinct, DIS-2-convergence trade-tongue.

**Productive tensions resolved**:

1. Well-stop placement-right: absorb into CF-0037 (simpler taxonomy, erases differences) vs. name as fourth asset-class (preserves categorical distinction). Resolved per Systems/Economy critic recommendation: name as fourth. CF-0037 water-node/road-rest firewall preserves CF-0037 drylands-exclusion.
2. Caravan-master adjudication as sixth Charter-Era structural axis (apparent pattern at high level) vs. uncontested regional-consensus (actual pattern at mechanism level). Resolved per Politics/Institution critic: uncontested regional-consensus; new GEOGRAPHY Regional Asymmetry section distinguishes this pattern type from the five structural-disagreement axes.
3. Well-keeper as dramatic-actor register (proposal texture) vs. ordinary-trade register (Everyday-Life critic requirement). Resolved via "ordinary well-keeper" register commitment in CF-0047 costs_and_limits alongside the dramatic register — both registers coexist, the former stabilizing the latter.

**Required CF-language commitments arising from synthesis**:

- CF-0046 and CF-0047 name CF-0037 water-node/road-rest firewall explicitly in costs_and_limits.
- CF-0046 names geographic non-transportability of canal-infrastructure in distribution.why_not_universal.
- CF-0046 and CF-0047 include enumerated forbidden-register list in costs_and_limits paralleling CH-0016 CF-0044 precedent.
- CF-0047 names "ordinary well-keeper" register commitment in costs_and_limits (hero-drift mitigation).
- CF-0046 and CF-0047 include Rule 3 absorption firewall clauses for well-keeper (M-7 cohort), runner-militia (CF-0020 subtype), station-log (archival category), wage-row.
- CF-0046 names caravan-master adjudication scope-firewall (CORRIDOR-INTERNAL CUSTOMARY DISPUTE RESOLUTION only; NOT magistrate-reachable; NOT extradition-carrying; NOT sixth-axis).
- CF-0046 names multi-caravan-master reputation-boycott as structural brake against graft.
- CF-0046 and CF-0047 name CF-0036 cross-species friction-register preservation (charter-custom under load, NOT unearned harmony).
- CF-0046 names trade-tongue as DIS-2-convergence (Reading 1 — existing lingua franca, NOT new distinct language).

---

# New Canon Fact Records

- **CF-0046** — Drylands caravan-corridor institutional-cultural complex. Status: `hard_canon`. Type: `institution`. Scope: regional / current / public.
- **CF-0047** — Drylands well-keeper as named customary-authority social role. Status: `hard_canon`. Type: `social_role`. Scope: regional / current / public.

Full CF records in CANON_LEDGER.md.

---

# Change Log Entry

- **CH-0018**. Change type: `addition`. Affected fact ids: CF-0046 (added), CF-0047 (added), CF-0017 (cross-referenced via CF-0047 derived_from), CF-0024 (qualified via mod_history), CF-0031 (qualified via mod_history), CF-0033 (qualified via mod_history), CF-0034 (qualified via mod_history), CF-0037 (qualified via mod_history), CF-0044 (qualified via mod_history). Downstream updates: 11 domain files. Retcon policy checks: all true.

Full change log entry in CANON_LEDGER.md change log section.

---

# Required World Updates Applied

- **WORLD_KERNEL.md** — extended "What Is Ordinary" drylands block with CF-0046 corridor-node typology + CF-0047 well-keeper register ("kept the well" / "walked the well" idiom pair); extended Core Pressures with CF-0046 corridor-under-drought-load and CF-0047 water-node wealth-concentration; extended What Is Taboo with CF-0046 caravan-master-graft + well-keeper-rent-extraction-during-drought + station-log-trust-breach + bandit-fronting-well-stop and CF-0047 household-heirloom-as-curiosity.

- **INVARIANTS.md** — appended four CH-0018 clarification annotations: DIS-2 (drylands-regional partial-literacy signature); SOC-1 (well-keeper no-species-gate reaffirmation); SOC-3 (drylands reciprocity-primary preservation at coin-at-edges contact surface); AES-1 (drylands well-keeper and corridor-institution working-texture register with enumerated forbidden/in-register language paralleling CH-0016 CF-0044 precedent).

- **ONTOLOGY.md** — extended Categories in Use: `institution` (CF-0046 drylands caravan-corridor composite); `social role` (CF-0047 drylands well-keeper); `text/tradition` (CF-0046 drylands corridor station-log + trade-tongue corridor-application). Extended Notes on Use with CF-0046 and CF-0047 composite-type attachments and firewall clauses.

- **GEOGRAPHY.md** — extended Trade Corridors §Tertiary with CF-0046 drylands caravan-corridor named as institutional-cultural complex with node-network typology; NEW §Regional Asymmetry on Drylands Institutional Thinness section distinguishing uncontested regional-consensus pattern from the five polity-asymmetric structural-disagreement axes; extended §Settlement Limits caravan towns with CF-0046 four-node-type corridor-network (wells / gate-stops / villages / caravanserai); extended §Predator Zones bandit corridors with CF-0046 runner-reached village militia drylands informal emergency-response.

- **PEOPLES_AND_SPECIES.md** — extended Cluster A §Social density with CF-0047 well-keeper SOC-1 no-species-gate annotation (species-concentration by embodiment-fit practice-level, not intake-level gating; CF-0036 friction-register preserved at well-approach).

- **INSTITUTIONS.md** — extended §Family/Clan/Household with CF-0047 drylands well-keeper lineage-inheritable household-enterprise pattern (categorically distinct from CF-0037 waystation; water-node-anchored vs road-rest-node-anchored); extended §Law/Custom/Judgment with CF-0046 caravan-master CORRIDOR-INTERNAL customary-adjudication firewall (MINOR operational non-docket line; NOT sixth-axis); extended §Religion/Ritual Authority with CF-0046/47 common-pantheon water-rite aspectualization at well-stops; extended §Trade/Guilds/Caravans/Shipping with CF-0046 corridor NON-CHARTERED reaffirmation paralleling CF-0037 clause; extended §Military/Defense with CF-0046 runner-reached village militia firewall (NOT CF-0020 subtype; NOT dragoon-precursor); extended §Education/Apprenticeship with CF-0047 well-keeper chore-from-young as FIFTH household-trade labor-onboarding pattern; extended §Recordkeeping/Archives with CF-0046 drylands corridor station-log household-held NON-ARCHIVAL firewall (M-9 load-bearing).

- **ECONOMY_AND_RESOURCES.md** — extended §Wage Spreads with CF-0046/CF-0047 well-keeper household-enterprise income row (NON-ANOMALOUS; Rule 3 absorption); extended §Scarcity Map drylands row with CF-0047 well-node concentration risk annotation; extended §Trade Flows drylands→heartland with CF-0046 reciprocity-primary corridor annotation + coin-at-heartland-border monetary anchor + not-on-illegitimate-service-rail firewall; extended §Value Stores with NEW entry "Well-stop tenancy / placement-right (CF-0047)" as FOURTH multi-generational tenancy asset-class; extended §Wealth Creation with NEW entry "Drylands caravan-corridor reciprocity-primary regional wealth-creation (CF-0046/CF-0047)"; extended §Inequality Patterns with NEW entry "Drylands obligation-denominated stratification register (CF-0046/CF-0047)"; extended §Breakage Points with NEW entry "Drylands well-lineage failure / drought-corridor collapse (CF-0046/CF-0047)".

- **EVERYDAY_LIFE.md** — extended §(a) Canal-Town Heartland with CF-0046 inbound drylands-cadence tavern-fragment annotation (one-way bardic-flow texture); extended §(b) Big-City Outskirts Estate with CF-0046 NINTH dowager-gossip axis on drylands-trade-factor reciprocity-standing; extended §(c) Cold North Highland with CF-0046 clansman-learned-the-gate-turn saga-fragment (hearth-side register, not public-feast); extended §(d) Drylands South EXTENSIVELY with CF-0046 corridor-node typology housing; CF-0047 well-keeper apprenticeship from 6-7; CF-0046 caravan-master corridor-adjudication + runner-militia labor-rhythm; drought-cycle-specific common fears + common aspirations (keeping-book passed whole, corridor knows her name in two seasons); CF-0047 well-keeper lineage-catechism as FIFTH marriage-broker catechism question; CF-0046 station-log as FIFTH drylands literacy register; CF-0046 drought-cycle calendar-marker register; extended §(e) Fenlands West with CF-0046 non-participation via silence-discipline annotation.

- **OPEN_QUESTIONS.md** — NEW §Drylands Caravan-Corridor Infrastructure Antiquity (author-side deferral paralleling CF-0037/CF-0044 precedents; covers well-keeper lineage antiquity, caravan-master adjudication antiquity, runner-militia antiquity, station-log convention antiquity, reciprocity-primary economy antiquity); NEW §Well-Stop Succession Case Law (latent burden covering multi-heir inheritance adjudication procedure, walked-the-well return-and-reclaim, lineage-extinction protocol, cross-corridor inheritance, estate-tenant well-stop); annotate §Drylands Short-Poetry Convention Antiquity and Scope (pressured by CF-0047 concretization of verse-repertoire transmission; deferral preserved); annotate §Maker-Age Linguistic Recovery (DIS-2-convergence discharge on trade-tongue corridor-application).

- **MYSTERY_RESERVE.md** — THREE extensions: M-7 Extension (CH-0018) drylands well-keeper sub-specialty holding clause (absorbed within existing tradesperson / caravan-master / CF-0017 circuit-bard / CF-0044 verse-competent-drylander cohorts; NOT sixth M-7 cohort); M-9 Extension (CH-0018) drylands corridor station-log not-a-custody-channel firewall; M-19 Extension (CH-0018) drylands corridor-infrastructure scoped-distinct firewall (categorically distinct from Brinewick canal-and-underground-network bounded-unknown; drylands infrastructure antiquity is ordinary author-side deferral).

- **TIMELINE.md** — Layer 1 Pre-Charter annotation (drylands caravan-corridor institutional-cultural complex + well-keeper role as pre-Charter folk-tradition residue; no Maker-Age cosmological residue; antiquity under-resolved per OPEN_QUESTIONS); Layer 2 Charter-Era annotation (drylands corridor-institution NEITHER chartered NOR displaced; paralleling CF-0037/CF-0044 non-chartered persistence; five-axis structural pattern does NOT extend to sixth axis — uncontested regional-consensus).
