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
