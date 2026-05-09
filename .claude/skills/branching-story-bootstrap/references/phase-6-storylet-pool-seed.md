# Phase 6: Storylet Pool Seed

Reference for `branching-story-bootstrap` Phase 6 — the delegated content-generation phase that produces the seed storylet pool. Bootstrap invokes `storylet-pool-authoring` as an in-memory sub-routine; the sub-routine produces and validates SLT records with caller-supplied final ids but does NOT write them. Bootstrap writes the final-id records inside Phase 11's staged commit: the engine envelope holds all `_source/storylets/SLT-*.yaml` writes atomically, while markdown writes are sequenced separately.

---

Use `storylet-pool-authoring` as an in-memory sub-routine to generate `target_pool_size` (computed below) approved v2 `SLT-NNNN` records for `_source/storylets/`. Every returned seed is a scene-commitment arc (`record_version: 2`, `shape: scene_commitment_arc`) with an `arc_contract.commitment_class`; bootstrap no longer seeds beat-granular shape buckets.

## Computing `target_pool_size`

The bootstrap computes `target_pool_size` in arc-units. A scene-commitment arc spans multiple prose beats, so the old beat-granular ranges are intentionally retired. The `storylet_pool_seed_size` argument, if explicitly supplied by the user, short-circuits this computation.

Default formula:

```text
target_pool_size = max(8, ceil(world_complexity_factor * 10))
```

`world_complexity_factor` starts from the story's intended scale:

| `intended_scale` | base factor |
|---|---:|
| `one_shot` | 0.8 |
| `chapter` | 1.0 |
| `arc` | 1.4 |
| `open_ended` | 1.8 |

Add bounded complexity modifiers:

- +0.10 per non-protagonist major in `cast_bind_list` (max +0.40)
- +0.10 per high-salience OBL emitted in Phase 5 (`salience >= 7`, max +0.30)
- +0.10 per active mystery-edge thread in Phase 5 (max +0.20)
- +0.05 per `accessible_locations` entry beyond `current_location` (max +0.20)
- +0.10 when the premise carries three or more active threads after Phase 5

Clamp `world_complexity_factor` to `0.8..2.4` before multiplying. Typical outputs are 8-24 approved arcs. If the user supplied `storylet_pool_seed_size` explicitly, use that value directly and record a one-line note in `STORY_KERNEL.md.storylet_pool_summary` ("explicit user override; formula-suggested would have been N").

If the formula yields fewer than the minimum coverage floor for gate 9, raise to that floor and record a warning in the Phase 10 deliverable summary. Under v2 the coverage floor is commitment-class coverage, not shape coverage: at least 5 distinct `arc_contract.commitment_class` values for `target_pool_size >= 8`, unless the premise has a smaller lawful commitment surface and the Phase 9 rationale records the limitation.

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

Bootstrap pre-allocates the SLT id range in Phase 6 before invoking `storylet-pool-authoring`. The sub-routine consumes the supplied ids in deterministic order. SLT records returned to bootstrap carry final ids; there is no Phase 11 remap pass, and bootstrap writes the returned records in Phase 11's staged commit (engine YAML transaction subset).

`storylet-pool-authoring` Phase 2 §Bootstrap-mix is the coverage contract. Under v2 it is keyed by `commitment_class` and `arc_archetype`, not retired shape buckets. The bootstrap-supplied `target_pool_size` (computed above) sets the approved-arc target; the storylet-pool-authoring sub-routine then produces `target_pool_size + ceil(target_pool_size * 0.30)` candidate seeds (per `storylet-pool-authoring/references/phase-2-generation-seeds.md`'s +30% replacement buffer rule).

---

## In-memory return contract

The delegated sub-routine applies storylet-pool-authoring Phase 4's 9 per-storylet gates and Phase 5's diversity audit, then returns the approved SLT records and validation summaries in memory. It does not allocate or write an SLB manifest, does not edit the story bundle INDEX, and does not require `worlds/<world-slug>/stories/<story-slug>/` to exist yet. Returned SLT records have the pre-allocated ids already populated; bootstrap writes them as-is in Phase 11.

Returned seed storylets must carry `record_version: 2`, `shape: scene_commitment_arc`, `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`. They use the schema authority at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; this skill's `templates/story-records.yaml` only cross-references that authority for SLT records.
