# Phase 6: Storylet Pool Seed

Reference for `branching-story-bootstrap` Phase 6 — the delegated content-generation phase that produces the seed storylet pool. Bootstrap invokes `storylet-pool-authoring` as an in-memory sub-routine; the sub-routine produces and validates SLT records with caller-supplied final ids but does NOT write them. Bootstrap writes the final-id records inside Phase 11's staged commit: the engine envelope holds all `_source/storylets/SLT-*.yaml` writes atomically, while markdown writes are sequenced separately.

---

Use `storylet-pool-authoring` as an in-memory sub-routine to generate `target_pool_size` (computed below) approved `SLT-NNNN` records for `_source/storylets/`. Every returned seed is a scene-commitment arc (`record_version: 2`, `shape: scene_commitment_arc`) with an `arc_contract.commitment_class`.

## Computing `target_pool_size`

The bootstrap computes `target_pool_size` in arc-units. A scene-commitment arc spans multiple prose beats. The `storylet_pool_seed_size` argument, if explicitly supplied by the user, short-circuits this computation.

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

If the formula yields fewer than the minimum coverage floor for gate 9, raise to that floor and record a warning in the Phase 10 deliverable summary. The coverage floor is commitment-class coverage: at least 5 distinct `arc_contract.commitment_class` values for `target_pool_size >= 8`, unless the premise has a smaller lawful commitment surface and the Phase 9 rationale records the limitation.

**Operator-judgment reduction below formula** — when the formula yields a `target_pool_size` materially larger than the opening surface's natural commitment-class span (typical case: a single-location single-encounter opener at `open_ended` scale, where the formula yields 20+), the operator MAY reduce below formula with explicit Phase 10 HARD-GATE surfacing as a deviation. The reduction must (a) still satisfy gate 9 — ≥5 distinct `commitment_class` values when `target_pool_size >= 8`; (b) record the reduction in `STORY_KERNEL.md.storylet_pool_summary.notes` with the formula-suggested target alongside the chosen target and a one-line rationale (e.g., `Bootstrap formula recommended target_pool_size = 24; operator reduced to 12 for the opening encounter's narrow surface — an opening-scene seed pool deeper than 12 distinct scene-commitment arcs would generate alternatives that no PG-0002 commitment-class hinge could activate in the immediate aftermath of a first-encounter close`); (c) surface at the Phase 10 deliverable summary as a NOTE so the user explicitly authorizes the deviation. The recovery path when the runtime starves after PG-0002 is `storylet-pool-authoring focus_area=<>` top-up (per `references/phase-9-validation-gates.md` gate 9 small-batch relaxation notes). This path is distinct from the explicit `storylet_pool_seed_size` argument override above — that path is user-supplied at invocation time; this path is operator-judgment at Phase 6 evaluation time and routes through Phase 10 for user authorization.

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

`storylet-pool-authoring` Phase 2 §Bootstrap-mix is the coverage contract, keyed by `commitment_class` and `arc_archetype`. The bootstrap-supplied `target_pool_size` (computed above) sets the approved-arc target; the storylet-pool-authoring sub-routine then produces `target_pool_size + ceil(target_pool_size * 0.30)` candidate seeds (per `storylet-pool-authoring/references/phase-2-generation-seeds.md`'s +30% replacement buffer rule).

---

## In-memory return contract

The delegated sub-routine applies storylet-pool-authoring Phase 4's 14 per-storylet gates and Phase 5's diversity audit, then returns the approved SLT records and validation summaries in memory. It does not allocate or write an SLB manifest, does not edit the story bundle INDEX, and does not require `worlds/<world-slug>/stories/<story-slug>/` to exist yet. Returned SLT records have the pre-allocated ids already populated; bootstrap writes them as-is in Phase 11.

Returned seed storylets must carry `record_version: 2`, `shape: scene_commitment_arc`, `provenance.origin: bootstrap_seed`, `provenance.created_at_page: null`, and `visibility.scope: global_author_pool`. They use the schema authority at `.claude/skills/storylet-pool-authoring/templates/storylet-record.yaml`; this skill's `templates/story-records.yaml` only cross-references that authority for SLT records.

---

## SLT schema landmines

The bootstrap depends on storylet-pool-authoring to deliver valid SLTs (delegation contract above). When the bootstrap implementer authors SLTs inline within the Phase 11 patch envelope — legitimate per the in-memory return contract, since bootstrap's Phase 11 staged commit writes the returned records into the engine envelope — catch the validator-enforced SLT requirements below at envelope-construction time rather than discovering them through validator iteration cycles.

The live validator grammar at `tools/validators/src/rules/_shared/predicate-dsl-grammar.ts` is authoritative when this section and the sibling template disagree.

**Required field gotchas:**

- `beat_plan.beats[].realization_target` is REQUIRED (open-vocab string; describes what scene-movement the beat realizes — typically a kebab-case phrase like `realizes-question-framed-as-scene-movement`). The storylet template's scaffold and examples now include this field; the JSON schema at `tools/validators/src/schemas/story-storylet.schema.json` requires it on every beat.
- `stop_policy.interrupt_before` must be NON-EMPTY (≥1 entry). The storylet template's scaffold and examples now surface populated interrupt-before entries; validator rejects empty `interrupt_before: []` arrays. Default safe interrupt: `{id: consent-boundary-imminent, predicate: consent_boundary_imminent, args: {}}` (no required args for `consent_boundary_imminent`).

**Predicate-section split (NORMAL_EXIT vs INTERRUPT_BEFORE):**

`stop_policy.normal_exits[].predicate` and `stop_policy.interrupt_before[].predicate` enforce DIFFERENT sub-enums of `STOP_PREDICATES`. Using a normal-exit predicate in `interrupt_before` (or vice versa) fails with `stop_policy_parsability.wrong_stop_policy_section`.

- **NORMAL_EXIT_STOP_PREDICATES** (allowed in `normal_exits` only): `commitment_satisfied`, `commitment_blocked`, `commitment_overturned`, `npc_makes_demand`, `npc_makes_disclosure`, `participant_exits`, `scene_goal_resolves`, `scene_goal_changes`, `new_obligation_created`, `open_thread_reprioritized`, `time_or_location_changes`.
- **INTERRUPT_BEFORE_STOP_PREDICATES** (allowed in `interrupt_before` only): `irreversible_cost_imminent`, `consent_boundary_imminent`, `violence_or_harm_imminent`, `forbidden_mystery_resolution_risk`, `protagonist_goal_change_required`, `selected_commitment_would_be_violated`, `user_write_in_conflicts_with_envelope`, `only_next_action_would_create_major_state_change`.

**Predicate-specific `args` requirements** (validator rejects when missing required args):

| Predicate | Required args |
|---|---|
| `commitment_satisfied` / `commitment_blocked` / `commitment_overturned` | `commitment_class` (the SLT's own `arc_contract.commitment_class`) |
| `participant_exits` | `participant` (STENT-id or role-ref like `role:recipient`) |
| `npc_makes_demand` / `npc_makes_disclosure` | `npc` (STENT-id or role-ref) |
| `scene_goal_resolves` / `scene_goal_changes` / `protagonist_goal_change_required` | `goal` (open-vocab kebab-case string) |
| `new_obligation_created` | `obligation_type` (open-vocab kebab-case string) |
| `open_thread_reprioritized` | `thread_id` (THR-id, 4-digit-padded) |
| `time_or_location_changes` | `change_kind` (open-vocab kebab-case string) |
| `irreversible_cost_imminent` | `cost_axis` (open-vocab kebab-case string) |
| `forbidden_mystery_resolution_risk` | `mystery_id` (M-id, 4-digit-padded per the `^M-[0-9]{4}$` regex) |
| `selected_commitment_would_be_violated` | `commitment_class` (the violating commitment_class) |
| `user_write_in_conflicts_with_envelope` | `envelope_field` (envelope field name) |
| `only_next_action_would_create_major_state_change` | `state_axis` (open-vocab kebab-case string) |
| `consent_boundary_imminent` / `violence_or_harm_imminent` | (no required args) |
