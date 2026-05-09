# Phase 5: State Mutation

Under the scene-commitment-arc runtime, Phase 5 applies the chosen arc variant's `required_effects[]` as one state-transition batch at arc-close. Phase 4b selects the variant before render and records the variant id in the pending PG transaction; Phase 5 converts that selected variant's effects into the deterministic `SE.ops` entries that Phase 11 submits.

## Arc-Level Effect Application

Phase 5 consumes `arc.effect_model.variants[<chosen>].required_effects[]`, not beat-internal prose interpretation. The render must realize the selected variant, but the prose does not decide which state changes are authoritative. Replay equality is computed at arc cadence: replay reads the PG's recorded `state_snapshot.applied_effect_variant`, re-derives the same `SE.ops` batch from the realized arc's `effect_model`, and compares the resulting snapshot/hash to disk.

Each `required_effects[]` entry maps to one or more `SE.ops` entries using the closed `op_type` vocabulary:

| `required_effects.type` | `SE.op_type` |
|---|---|
| `relationship_axis_shift` | `relationship_supersede` |
| `thread_pressure_delta` | `thread_supersede` |
| `obligation_status_change` | `obligation_pay_off` / `obligation_complicate` / `obligation_supersede` per status target |
| `fact_create` | `fact_create` |
| `fact_invalidate` | `fact_invalidate` |
| `consequence_open` | `consequence_open` |
| `consequence_address` | `consequence_address` |
| `cast_change` | `cast_change` |
| `location_change` | `location_change` |
| `mystery_progress` | no direct `SE.op`; record through `mystery_safety.M_progressed[]` on a new SF or the page's `state_snapshot` |

`effect_model_replay_safety` fails if the PG's `applied_effect_variant` does not name a real variant on the realized arc, or if the SE record's ops are not derivable from that variant's `required_effects[]`.

## STINT Refresh After Variant Ops

Per-character intention refresh still runs after the variant ops apply. STINT updates are deterministic engine-side follow-through, not entries in `required_effects[]`; they may produce `intention_refresh` ops after the arc-level effect batch has established the new post-arc state.

## Legacy v1 Beat-Derived Inputs

Post-cutover there are no v1 story records to execute. The old beat-derived input path is retained below only as a documentation note for readers comparing the v1 and v2 contracts: Phase 1's `ProposedEvent`, `required_aftermath`, and the selected storylet's `fact_effects` / `relationship_effects` / obligation effect fields are no longer the active Phase 5 source of truth. Equivalent state changes must be represented in the selected arc variant's `required_effects[]` before Phase 7 render.

## Append-Only Discipline

Records are append-only. Mutations to facts (certainty change), obligations (status change), threads (status / pressure), or intentions (pressure / emotional_state) create NEW records:

```yaml
# Example: an OBL goes from open → paid_off
id: OBL-0091
story_id: STORY-0001
logical_id: OBL-0007                  # the original logical obligation
supersedes: OBL-0007
created_at_page: PG-0042
status: paid_off
payoff_mode: literal_fulfillment
payoff_event: SE-0091
# ... other fields inherited or updated
```

The new page's `state_snapshot.obligations_open` no longer cites `OBL-0007`; it cites `OBL-0091` only if the new status is still `open` (here `paid_off`, so `obligations_open` drops `OBL-0007` entirely; `obligations_paid_off` gains `OBL-0091`).

## State_Snapshot Computation

Given `parent_page.state_snapshot` and the structured ops applied this turn:

```
next_snapshot = parent_snapshot.clone()
for op in applied_event_ops (each op is structured per the SE schema's op_type enum):
    fact_create:                  add SF-NNNN to objective/apparent/disputed/belief facets per epistemic_class; add it to reader_known_facts only when visible_to_reader == true AND reader_visibility_basis is one of shown_in_pg0001, known_to_pov, dramatic_irony, diegetic_artifact_visible
    fact_invalidate:              replace SF-NNNN entry with superseder
    obligation_open:              add OBL-NNNN to obligations_open
    obligation_pay_off:           move OBL-NNNN from obligations_open to obligations_paid_off; replace ID with superseder
    obligation_complicate:        replace OBL-NNNN in obligations_open with superseder
    obligation_transfer:          update owner field via supersession
    obligation_supersede:         replace OBL-NNNN with superseder for any other field change
    consequence_open:             add CNSQ-NNNN to consequences_pending (instantiated from required_aftermath)
    consequence_address:          move CNSQ-NNNN from pending to addressed; replace status via supersession
    thread_supersede:             replace THR-NNNN with superseder (status / pressure delta)
    relationship_supersede:       replace SREL-NNNN with superseder (axes / public_status / private_status_by_actor)
    intention_refresh:            add new STINT-NNNN to intentions_current; replace the prior STINT for that story entity / `stent_id` via supersession (logical_id + supersedes link to the prior record); STENT.intention_snapshot_id is NOT updated by this op — it remains the bootstrap-time pointer (per `branching-story-bootstrap/templates/story-records.yaml:33`), so post-bootstrap consumers MUST read active intentions from `intentions_current` rather than dereferencing through STENT
    cast_change:                  update cast_present
    location_change:              update current_location and accessible_locations
    inventory_change:             update inventory_by_entity via STOBJ supersession
    canon_sync:                   update canon_revision (audit trail; CFs visible to this branch are recomputed from world canon retrieval)
this_page.state_snapshot = next_snapshot
this_page.state_hash = hash(canonicalize(next_snapshot))
```

For `fact_create`, `unrevealed_objective_truth` is valid only with
`visible_to_reader: false`. A new SF whose `visible_to_reader: true` is missing
`reader_visibility_basis`, uses `unrevealed_objective_truth`, or is omitted from
`reader_known_facts` when page prose relies on reader-facing knowledge is a state
mutation error, not a prose-only issue.

## State-subset-list Semantics

`obligations_open` / `obligations_paid_off` / `obligations_complicated` / `obligations_abandoned` are **cumulative-state subsets** of the obligation state space, not per-turn deltas. An obligation transitioned to complicated at PG-N stays in `obligations_complicated` of PG-N+1, PG-N+2, ... until either superseded again to a different status or abandoned; an obligation paid off at PG-N stays in `obligations_paid_off` of every subsequent page along the branch. The same cumulative-state interpretation applies to `consequences_pending` (CNSQ-NNNN records open until addressed or expired) and `consequences_addressed` (CNSQ-NNNN records remain visible in the addressed list across subsequent pages along the branch).

Per-turn deltas live in the SE record's `ops` array (the supersession events themselves: `obligation_complicate` / `obligation_pay_off` / `obligation_supersede` / `consequence_address`). The state_snapshot fields are the post-replay register at this page — what state the branch IS in, not what changed THIS turn. This is what makes snapshot-replay equality (Phase 9 gate 4) computable: replaying the parent's snapshot through this turn's structured ops yields the new cumulative-state register, not a delta. Storylet-pool-authoring's `obligation_state` predicate (per `templates/predicate-dsl.md`) reads these subset arrays as cumulative state to determine whether a candidate storylet's hard_preconds are met against the current branch register.

## Consequence Persistence

Each `required_aftermath` item from Phase 2 is instantiated as a `CNSQ-NNNN` record UNLESS it is already represented by a newly-opened OBL (when an aftermath is sufficiently structural that an obligation is the right primitive — e.g., "discover the body" is opened as an OBL while "guilt or justification" is a CNSQ).

CNSQ records are branch-scoped. They carry `created_at_page: this_PG` and visibility along `branch_path` only — sibling branches do not see them. A subsequent turn whose selected storylet has effects matching a pending CNSQ's `kind` produces a `consequence_address` op, which supersedes the CNSQ to `status: addressed` (or `transformed` when the storylet partially absorbs it; or `expired` when narrative time renders it irrelevant).

## Branch-Isolation Invariant Enforced Here

Every new non-PG story-local record (SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC) carries `created_at_page: this_PG` (`created_at_page == this_PG`). ARC_TRACE records also carry `created_at_page: this_PG`; they are derived validation/debugging artifacts, not replay-authoritative state, but their branch anchor must match the page whose render they describe. A PG record is the page itself; its own `id` is the branch anchor and must be included in `this_page.branch_path`. The engine verifies before write — and Phase 9 gate 3 verifies recursively — that no story-local ID cited at any depth inside any record reachable from `state_snapshot` or ARC_TRACE references points at a page outside `this_page.branch_path`. World canon (CF / M / INV / ENT) propagates freely; story-local engine state is branch-isolated.
