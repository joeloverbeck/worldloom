# Phase 6: Storylet Pool Seed

Reference for `branching-story-bootstrap` Phase 6 — the delegated content-generation phase that produces the seed storylet pool. Bootstrap invokes `storylet-pool-authoring` as an in-memory sub-routine; the sub-routine produces and validates SLT records but does NOT write them. Bootstrap assigns final SLT ids and writes the records inside its Phase 11 single transaction.

---

Use `storylet-pool-authoring` as an in-memory sub-routine to generate `storylet_pool_seed_size` (default ~20) approved `SLT-NNNN` records for `_source/storylets/`.

---

## Delegation contract

- `mode: seed`
- `focus_area: bootstrap_mix`
- `target_pool_size: <storylet_pool_seed_size>`
- `source_audit_path: null`
- `parent_skill_invocation: true`
- caller context: normalized premise, cast-bound STENT/STINT records, imported SFs, initial THRs/OBLs, whole-class M/INV loads, and content_policy already loaded by bootstrap Phases 1-5

`storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting is the coverage contract: entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3.

---

## In-memory return contract

The delegated sub-routine applies storylet-pool-authoring Phase 4's 9 per-storylet gates and Phase 5's diversity audit, then returns the approved SLT records and validation summaries in memory. It does not allocate or write an SLB manifest, does not edit the story bundle INDEX, and does not require `worlds/<world-slug>/stories/<story-slug>/` to exist yet. Bootstrap assigns the new bundle's `SLT-NNNN` ids and writes the returned records in Phase 11's single transaction.

Returned seed storylets must carry `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`. They use the schema authority at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; this skill's `templates/story-records.yaml` only cross-references that authority for SLT records.
