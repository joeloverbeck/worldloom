# Phase 0: Proposal Normalization and Fact-Type Classification

Parse `proposal_path` if provided; otherwise interview the user. Extract: **statement** (one paragraph), **underlying world-change** (operational change, not surface sentence), **canon fact type(s)** (ontological rule / capability / artifact / species trait / institution / ritual / law / historical event / social practice / taboo / technology / metaphysical claim / resource distribution / hidden truth / local anomaly / contested belief), **user-stated constraints** (preferred scope, rarity, access pattern, novelty, dramatic purpose, revision appetite).

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

## Selective Domain-File Loading

After classification, selectively load additional world files based on fact type. See the World-State Prerequisites section of SKILL.md for the type→files mapping (examples: proposed institution → `INSTITUTIONS.md` + `EVERYDAY_LIFE.md` + `ECONOMY_AND_RESOURCES.md`; proposed magic practice → `MAGIC_OR_TECH_SYSTEMS.md` + `INVARIANTS.md` + `EVERYDAY_LIFE.md`; proposed historical event → `TIMELINE.md` + `INSTITUTIONS.md` + `GEOGRAPHY.md`).

## Rule

Never evaluate a surface sentence only. Always identify the underlying world-change before advancing.

**FOUNDATIONS cross-ref**: Ontology Categories and Relation Types.
