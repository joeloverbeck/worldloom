# Phase 0: Proposal Normalization and Fact-Type Classification

Parse `proposal_path` if provided; otherwise interview the user. Extract: **statement** (one paragraph), **underlying world-change** (operational change, not surface sentence), **canon fact type(s)** (ontological rule / capability / artifact / species trait / institution / ritual / law / historical event / social practice / taboo / technology / metaphysical claim / resource distribution / hidden truth / local anomaly / contested belief), **user-stated constraints** (preferred scope, rarity, access pattern, novelty, dramatic purpose, revision appetite).

**CF-id reference verification**: when the proposal text cites specific CF ids — either formally (`CF-0005`, `CF-0017`) or informally ("the ceramic containment CF," "the bardic circuit one," "the one about X") — verify each citation against the ledger's current CF content before advancing. Misreferences are common: a user writing from memory may transpose adjacent ids or name a CF by its subject-area rather than by its actual content, and pattern-matching the phrase without checking the id propagates the error into Phase 2 (invariant check), Phase 6a (critic dispatch), and Phase 8 (contradiction classification) where catching it costs more than a one-time Phase 0 lookup. Misreference correction is a Phase 0 concern, not a Phase 6a critic finding. This rule is distinct from but complementary to the "proposal self-assessment is advisory" rule (SKILL.md Procedure step 2): that rule governs `canon_safety_check` frontmatter blocks; this rule governs informal CF citations in proposal prose.

## Template `type` Mapping

Phase 0 conceptual labels feed a single `type` value in `canon-fact-record.yaml`. Common enum: `capability | artifact | law | belief | event | institution | species | ritual | taboo | technology | resource_distribution | hidden_truth | local_anomaly | metaphysical_rule`. Additional values are permitted when drawn from FOUNDATIONS.md §Ontology Categories AND in active use in the ledger (notably `historical_process`, `text_tradition`, `hazard`, `craft`). Mapping:

- `ontological rule` / `metaphysical claim` → `metaphysical_rule`
- `capability` → `capability`
- `artifact` → `artifact`
- `species trait` → `species`
- `institution` → `institution`
- `ritual` → `ritual`
- `law` → `law`
- `historical event` → `event` (discrete occurrence); use `historical_process` for an ongoing process or residue of past events rather than a single event
- `taboo` → `taboo`
- `technology` → `technology`
- `craft` → `craft` (learned production-skill; FOUNDATIONS.md §Ontology Categories)
- `resource distribution` → `resource_distribution`
- `hidden truth` → `hidden_truth`
- `local anomaly` → `local_anomaly`
- `contested belief` → `belief` (with `status: contested_canon`)
- `social practice` → one of `belief` (doctrinal), `ritual` (ceremonial), `institution` (organized), or `law` (codified) — choose by dominant expression
- `text / tradition` → `text_tradition` (texts, fragmentary corpora, translation status)
- `hazard` → `hazard` (recurring environmental or bodily danger)

## Tie-Break Criteria for Overlapping Types

Some proposals straddle `institution` / `law` / `ritual` / `resource_distribution` / `craft` / `technology` without a clear single answer (e.g., a welfare registry is simultaneously an organized body, a statute, and a distribution mechanism). Apply this rubric before falling through to the Phase 9 split option:

1. **Choose the type of the PRIMARY ENTITY — the thing that EXISTS**, not its operational effects. The registry IS an institution; the statute codifying it and the supplement it distributes are consequences, not the entity. The apprenticeship IS a craft; the initiation rite prescribing its start is a subordinate aspect.
2. **Subordinate aspects become `visible_consequences`, not separate CFs.** Pension-distribution, enrollment ceremony, and governing statute all belong in one CF's `visible_consequences` unless a sub-fact passes the Phase 9 split rubric (materially distinct CF types, Mystery Reserve exposure, distribution shape, or domains_affected).
3. **Preferred type defaults for common overlaps**:
   - Organized civic/guild body with operational effects → `institution` (not `law` or `resource_distribution`)
   - Statute whose primary existence is codification-of-a-rule → `law` (not `institution`)
   - Bounded ceremonial performance with no independent institutional housing → `ritual` (not `institution`)
   - Standing allocation pattern whose administering body is already committed elsewhere → `resource_distribution`
   - Learned production skill with empirical technique → `craft` (not `technology`)
   - Built/engineered apparatus whose operation doesn't require learned technique → `technology`

If the rubric still yields two defensible types after these checks, fall through to the Phase 9 split option; unnecessary splitting fragments the fact's integrity (see Phase 9).

Each CF record gets exactly one `type` value. If the proposal straddles categories, split into multiple CFs (see Phase 9 split rubric). When using a value outside the common enum, draw it verbatim from FOUNDATIONS.md §Ontology Categories so ledger-wide grep discovery works across CFs.

**Composite facts (primary type + sub-types in YAML)**: when a proposal straddles types AND the Phase 9 split rubric declines the split because the sub-facts are tightly coupled (see `counterfactual-and-verdict.md` §Phase 9 "Composite-CF positive criteria"), commit the **primary type** in the YAML `type:` field and document the sub-types in the CF record's `notes` field and `statement` paragraph. The primary type is the one that survives the "primary entity — the thing that EXISTS" test above; sub-types are the operational-effect or secondary-register aspects. This preserves single-`type` grep discoverability across the ledger while honoring the composite nature of the fact. Precedent (Animalia ledger): CF-0021 (primary `craft` with capability + artifact + taboo-pressure sub-aspects); CF-0029 (primary `artifact` with hazard + non-sentience-firewall sub-aspects); CF-0034 (primary `historical_process` with capability + law + distribution-asymmetry sub-aspects); CF-0035 (primary `hazard` with species + local_anomaly + historical_process sub-aspects).

## Place-type / Polity Composite Handling

Named-landmark city-scale proposals — first-committed chartered cities, major trade hubs, capital cities, or other place-entities whose scale demands treatment beyond "a specific site" — are their own composite shape worth naming because they tend to be scheduled after OPEN_QUESTIONS §Place and Polity Naming is partially resolved, and they recur in worldloom pipelines.

**Primary type selection for named-landmark city-scale proposals.** Apply the "primary entity — the thing that EXISTS" test from §Tie-Break Criteria:
- The city EXISTS as a **place** (bounded geographic locale with sensory register, architecture, settlement density). → `type: place` is the primary.
- The city's chartered civic authority IS an institution, but the institution is subordinate to the place (the institution exists because the place does; a city without chartered civic authority is a village, still a place).
- The city's polity-status, route-hub function, migrant-attractor historical process, and ecological-system infrastructure are all secondary register. None of them survive the "thing that EXISTS" test as primary — they are operational-effect layers on the place.

Typical composite enumeration in `notes`: `place + polity + institution + historical_process + route` (five secondary categories). For coastal or canal-confluence cities, add `ecological_system` (the canal / river / port infrastructure at landmark scale is an ecological system-scale commitment, not ordinary geography). For cities with a named social-role landmark (a circuit-walker bard, a chartered-broker bench seat, a retired-dragoon civic-advisory tradition), add `social_role`.

**Distribution stabilizers specific to named-landmark cities.** Named cities with world-renowned fame footprint almost always fail the Rule 3 (No Specialness Inflation) test on first draft — "the largest," "the richest," "the most populated," "the #1" appear naturally in user-stated dramatic intent and must be softened or stabilized at Phase 9 repair. Use the **four-stabilizer compound** pattern for primacy stabilization in `distribution.why_not_universal`:
1. **Geographic singularity** — name the specific geographic feature that makes primacy durable at this location (confluence geometry, harbor configuration, pass geometry, river-mouth access). The feature must be non-replicable in adjacent polities at the landmark's scale.
2. **Path-dependence of accumulated capital** — name the generational depth of commercial / institutional / chartered accumulation that a competitor cannot match quickly. Typical phrasing: "Charter-Era-depth accumulated commercial capital."
3. **Migration-gravity flywheel** — name the self-reinforcing pattern (labor-pool attracts migrants attracts further labor-pool growth) that locks primacy in place across generations.
4. **Resource / bench / infrastructure concentration** — name the specific concentration that compounds across cycles (chartered-broker bench density, authentication-specialist concentration, canal-engineering guild density). Commits a concrete mechanism.

Under escalation, Phase 6b Theme/Tone critic will flag any superlative that lacks four-stabilizer backing; under narrow proposals that don't escalate, Phase 14a Test 10 (Rule 3) catches the same drift.

**Firewall clauses load-bearing in named-landmark-city CFs.**
- **Estate-power lateral-not-vertical firewall.** User-stated dramatic intent often includes "estates are the true seats of power" or "the outskirts hold the real authority." If committed unmodified, this language retcons the Charter-Era civic-registry primacy (CAU-3 / SOC-4 preservation). Reframe as **lateral accretion** — estates exercise informal economic / social / backchannel influence within the Charter-Era civic frame, which formally holds (civic registry as default arbiter, magistrate courts for dispute, chartered watch for violence, guild charters for licensure). Estate influence is continuous with the charter, not displacing.
- **Institutional decomposition firewall.** When a proposal names a generic "inspection authority" or "watch corps" or "revenue body," do NOT conflate with existing chartered monopolies. Decompose against the existing taxonomy: civic watch (tariff-and-traffic chartered-watch subtype), ward-inspector (extraction-guild, artifact-hazard under SOC-4/CAU-3 — never corrupted by estate backchannels), chartered extraction guild (SOC-4 chartered monopoly), lock-keeper guild (canal-engineering-adjacent non-extraction trade), dragoon corps (CF-0033 ward-breach perimeter + sealed-quarter evacuation in adopting polities only). Estate backchannels target tariff-and-traffic corps only; corrupting artifact-hazard inspectors would trigger extraction-guild response and authentication-cartel cascade.
- **Pre-figuring diegetic-artifact citation.** Per SKILL.md Pre-flight Check, named-entity proposals require scanning `worlds/<world-slug>/characters/` and `worlds/<world-slug>/diegetic-artifacts/` for pre-figuring. Any prior diegetic commitment must be cited in `source_basis.derived_from` (Rule 6 audit-trail preservation). Named cities are particularly prone to pre-figuring because travelogues, chronicles, and character backstories naturally name major settlements.
- **Commodity / role-of-species firewall.** When a proposal names a species niche (aquatic-folk canal-underwater smuggling, corvid-folk scribal concentration), firewall against species-coding drift: the niche is MAJORITY legitimate labor + MINORITY underworld / specialty concentration (socioeconomic occupational-geography driven by embodiment-fit capability), NOT species-role civic assignment; full SOC-1 civic-participant standing preserved for all members of the named species.

**Worked precedent.** CF-0038 Brinewick (CH-0013, Animalia): canal-fed charter-polity city in Temperate Canal Heartland; primary `type: place`; secondary composite `polity + institution + historical_process + route + social_role` in notes; four-stabilizer compound (canal-geometry singularity + path-dependence of Charter-Era-depth commercial capital + migration-gravity flywheel + chartered-broker bench density); estate-lateral firewall; institutional decomposition (civic canal-wardens ≠ ward-inspectors); DA-0001 (Vespera Nightwhisper's travelogue) pre-figuring citation in `source_basis.derived_from`; aquatic-folk firewall (MAJORITY legitimate canal labor + MINORITY underworld concentration); five polity-asymmetric axes adoption commitments (CF-0021/24/28/31/33). 11 domain-file patches + 9 modification_history entries + new M-19 bounded unknown + M-1 extension firewall (pre-Charter ancestral-engineering, NOT Maker-Age).

## Selective Domain-File Loading

After classification, selectively load additional world files based on fact type. See the World-State Prerequisites section of SKILL.md for the type→files mapping (examples: proposed institution → `INSTITUTIONS.md` + `EVERYDAY_LIFE.md` + `ECONOMY_AND_RESOURCES.md`; proposed magic practice → `MAGIC_OR_TECH_SYSTEMS.md` + `INVARIANTS.md` + `EVERYDAY_LIFE.md`; proposed historical event → `TIMELINE.md` + `INSTITUTIONS.md` + `GEOGRAPHY.md`).

## Retcon-Proposal Inputs

Two input shapes arrive at Phase 0. The **new-fact proposal** is the dominant case covered by §Template `type` Mapping above: a proposal whose underlying world-change introduces a new capability, institution, artifact, law, belief, etc., and which maps to a single `type:` value in a new CF record. The **retcon-proposal card** is a distinct input shape emitted by the `continuity-audit` skill per `continuity-audit/templates/retcon-proposal-card.md`; it proposes a correction, qualification, or re-scoping of existing canon rather than a new fact.

**Retcon-proposal-card detection**: a proposal carrying any of these frontmatter fields is a retcon-proposal card — `retcon_type`, `target_cf_ids`, `severity_before_fix`, `severity_after_fix`, `audit_origin`, `finding_id`. When any appear, route through this subsection before advancing to Phase 1.

### Retcon-type taxonomy

The `retcon_type` frontmatter field names one of four types (definitions align with `continuity-audit/templates/retcon-proposal-card.md`):

- **Type A: Clarificatory** — corrects inherited drift, extends enumeration prose, or clarifies counting accuracy in existing domain-file annotations. Does NOT change any CF's `statement`, `scope`, `status`, or `distribution` fields. Produces a new Change Log Entry with `change_type: clarification` + `modification_history` appends on target CFs + domain-file prose patches bearing `<!-- clarified by CH-NNNN -->` attribution. **No new CF is created.** Route: `accept-path.md` §Clarificatory-Retcon Variant.
- **Type B: Scope retcon** — narrows or broadens an existing CF's geographic / temporal / social scope, typically in response to a discovered over-generalization or an under-represented regional variation. Edits the target CF's `scope` and `distribution` fields in place; `change_type: scope_retcon`. Usually no new CF unless the retcon splits the original CF into multiple region-scoped variants per Phase 9 split.
- **Type C: Perspective retcon** — reclassifies an existing CF's `truth_scope` (world_level vs diegetic-only) or `diegetic_status` (objective / believed / disputed / propagandistic / legendary), typically when later canon work reveals a claim was diegetic-only rather than world-level. Edits target CF's `truth_scope` / `diegetic_status` fields in place; `change_type: perspective_retcon`. Usually no new CF.
- **Type D: Cost retcon** — adjusts an existing CF's `costs_and_limits` or `prerequisites` when later canon work discovers the original cost-model was incomplete or over-specified. Edits target CF's `costs_and_limits` / `prerequisites` fields in place; `change_type: cost_retcon`. Usually no new CF unless the cost-model adjustment requires splitting the capability.

### Routing decision per type

After detecting a retcon-proposal card and reading its `retcon_type`:

- **Type A** → record the retcon classification in working notes; skip the §Template `type` Mapping step (no new CF to type); skip the §Tie-Break Criteria step (same reason); advance to Phase 1 with the understanding that Phase 13a Artifact 1 will be skipped per `accept-path.md` §Clarificatory-Retcon Variant. The CF `type:` field is N/A for this route.
- **Type B / C / D** → the retcon edits specific fields of an existing CF rather than creating a new one; record the target CF id(s) from `target_cf_ids` and the specific fields to be modified; the §Template `type` Mapping and §Tie-Break Criteria steps are N/A (no new CF type is chosen — the existing CF's `type:` is preserved). Phase 13a follows Artifact 2 (Modifications to Existing CF Records) rather than Artifact 1; the CF is edited in place and receives a `modification_history` entry naming the retcon's CH id. Phase 14a tests 1, 2, 3, 8 apply to the modified CF's updated fields (unchanged if the retcon narrowed a field, updated if broadened) — not N/A-adapted as in Type-A.

**Retcon-proposal-specific frontmatter fields** (all Types) — record these in working notes for use in later phases:

- `target_cf_ids`: the CF ids this retcon modifies. These are input to the Phase 12a modification_history scan (axis (a) derived_from-style, though the semantic relationship is "target CF" not "derivation parent").
- `severity_before_fix` / `severity_after_fix`: integer severity delta from the audit finding. Record in the Change Log Entry's `severity_before_fix` / `severity_after_fix` fields; expect `severity_after_fix < severity_before_fix` for accepted retcons (the retcon's purpose is to reduce severity).
- `audit_origin`: the audit report id (typically `AU-NNNN`) that produced this retcon proposal. Record in the adjudication record's Justification section to preserve the provenance chain.
- `finding_id`: the specific audit finding id (typically `F-NN`) within the audit report. Closing this finding is a success condition for the retcon; name the closure explicitly in the Change Log Entry `reason` list (e.g., `"closes AU-0001 Finding F-02"`).

**When a retcon-proposal card's self-assessment has drafting imprecisions**: the proposal's prose, field names, or schema references may drift from the canonical conventions this skill uses (observed example: RP-0001's Operator Notes referenced a "9-field retcon_policy_checks" schema when the canonical standard per `templates/change-log-entry.yaml` is 5 fields). Treat the proposal's self-assessment as advisory (per the top-of-file CF-id reference verification rule and SKILL.md Procedure step 2 "proposal self-assessment is advisory"); use canonical conventions from the skill's own templates, and flag the drafting imprecision in the Change Log Entry `notes` field so the audit trail records both the proposal's wording and the skill's correction.

### Hybrid input shapes

A proposal MAY carry both new-fact content AND retcon-proposal frontmatter — e.g., a new CF that also retcon-qualifies an existing CF's scope (a "Type-B retcon that also introduces a new CF"). When both shapes are present, route through the Retcon-Proposal Inputs subsection first (to record retcon classification and target CFs) AND the §Template `type` Mapping subsection (to type the new CF); Phase 13a then produces both Artifact 1 (new CF) and Artifact 2 (CF modifications), with `change_type` reflecting the dominant action (typically `addition` for hybrid shapes, because adding a new CF dominates even when paired with qualifications — per the SKILL.md change_type convention).

## Rule

Never evaluate a surface sentence only. Always identify the underlying world-change before advancing.

**FOUNDATIONS cross-ref**: Ontology Categories and Relation Types.
