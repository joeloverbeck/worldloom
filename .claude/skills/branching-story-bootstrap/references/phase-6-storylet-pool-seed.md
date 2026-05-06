# Phase 6: Storylet Pool Seed

Reference for `branching-story-bootstrap` Phase 6 — the delegated content-generation phase that produces the seed storylet pool. Bootstrap invokes `storylet-pool-authoring` as an in-memory sub-routine; the sub-routine produces and validates SLT records with caller-supplied final ids but does NOT write them. Bootstrap writes the final-id records inside its Phase 11 transaction.

---

Use `storylet-pool-authoring` as an in-memory sub-routine to generate `target_pool_size` (computed below) approved `SLT-NNNN` records for `_source/storylets/`.

## Computing `target_pool_size`

The bootstrap computes `target_pool_size` from `intended_scale` + state complexity. The `storylet_pool_seed_size` argument, if explicitly supplied by the user, short-circuits this computation.

Base by `intended_scale`:

| `intended_scale` | base range |
|---|---|
| `one_shot` | 14-18 |
| `chapter` | 18-26 |
| `arc` | 32-48 |
| `open_ended` | 45-70 |

Pick the midpoint of the range, then add complexity modifiers:

- +2 per non-protagonist major in `cast_bind_list`
- +2 per high-salience OBL emitted in Phase 5 (`salience >= 7`)
- +1 per active mystery-edge thread in Phase 5
- +1 per `accessible_locations` entry beyond `current_location` (per the PG-0001 state snapshot sketch)

Cap the result at the upper end of the next-larger band (e.g. an `arc` bundle that complexity-scales above 48 may go up to 70 — the `open_ended` cap — but no higher). If the user supplied `storylet_pool_seed_size` explicitly, use that value directly and record a one-line note in `STORY_KERNEL.md.storylet_pool_summary` ("explicit user override; formula-suggested would have been N").

If the formula yields fewer than the minimum coverage floor for gate 9 (≥5 distinct shapes covered, plus ≥1 storylet per shape), raise to the minimum and record a warning in the Phase 10 deliverable summary.

---

## Delegation contract

- **Pre-allocate the SLT id range for the seed pool before delegation.** Compute the upper-bound candidate count: `target_pool_size + ceil(target_pool_size * 0.30)`. Call `mcp__worldloom__allocate_next_id(world_slug, 'SLT', story_slug=<story-slug>)` once per candidate id and collect the returned ids into `target_slt_ids[]`. Pass this bound id range to `storylet-pool-authoring`, which consumes the ids in deterministic order. If fewer records survive Phase 4 rejections and Phase 5 culls than the pre-allocated count, discard the unused tail ids; append-only allocation tolerates skipped ranges.

- `mode: seed`
- `focus_area: bootstrap_mix`
- `target_pool_size: <computed target_pool_size, or explicit storylet_pool_seed_size override>`
- `target_slt_ids: <list pre-allocated in Phase 6 before delegation; length = target_pool_size + ceil(target_pool_size * 0.30)>`
- `source_audit_path: null`
- `parent_skill_invocation: true`
- caller context: normalized premise, cast-bound STENT/STINT records, imported SFs, initial THRs/OBLs, whole-class M/INV loads, and content_policy already loaded by bootstrap Phases 1-5

Bootstrap pre-allocates the SLT id range in Phase 6 before invoking `storylet-pool-authoring`. The sub-routine consumes the supplied ids in deterministic order. SLT records returned to bootstrap carry final ids; there is no Phase 11 remap pass.

`storylet-pool-authoring` Phase 2 §Bootstrap-mix shape weighting is the coverage contract: entry_pressure 3-5, cast_introduction 1 per non-protagonist major, threat_escalation 2-4, relational_dynamics 3-5, routine_disruption 2-3, aftermath_sequel 2-3, reflection_dilemma 2-3. The bootstrap-supplied `target_pool_size` (computed above) sets the upper bound; the storylet-pool-authoring sub-routine then produces `target_pool_size + ceil(target_pool_size * 0.30)` candidate seeds (per `storylet-pool-authoring/references/phase-2-generation-seeds.md:3`'s +30% replacement buffer rule).

---

## In-memory return contract

The delegated sub-routine applies storylet-pool-authoring Phase 4's 9 per-storylet gates and Phase 5's diversity audit, then returns the approved SLT records and validation summaries in memory. It does not allocate or write an SLB manifest, does not edit the story bundle INDEX, and does not require `worlds/<world-slug>/stories/<story-slug>/` to exist yet. Returned SLT records have the pre-allocated ids already populated; bootstrap writes them as-is in Phase 11.

Returned seed storylets must carry `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`. They use the schema authority at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; this skill's `templates/story-records.yaml` only cross-references that authority for SLT records.
