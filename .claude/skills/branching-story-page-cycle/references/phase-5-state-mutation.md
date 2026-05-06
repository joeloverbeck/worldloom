# Phase 5: State Mutation

Apply the structured ops from Phase 1's `ProposedEvent` and Phase 4's selected storylet's `fact_effects` / `relationship_effects` / `opens_obligations` / `pays_off_obligations` / `complicates_obligations` / `transfers_obligations`.

## Append-Only Discipline

Records are append-only. Mutations to facts (certainty change), obligations (status change), threads (status / pressure), or intentions (pressure / emotional_state) create NEW records:

```yaml
# Example: an OBL goes from open → paid_off
id: OBL-0091
story_id: STORY-001
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
    fact_create:                  add SF-NNNN to objective/apparent/disputed/reader/belief facets per epistemic_class
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
    intention_refresh:            add new STINT-NNNN to intentions_current; replace the prior STINT for that story entity / `stent_id` via supersession (logical_id + supersedes link to the prior record)
    cast_change:                  update cast_present
    location_change:              update current_location and accessible_locations
    inventory_change:             update inventory_by_entity via STOBJ supersession
    canon_sync:                   update canon_revision (audit trail; CFs visible to this branch are recomputed from world canon retrieval)
this_page.state_snapshot = next_snapshot
this_page.state_hash = hash(canonicalize(next_snapshot))
```

## State-subset-list Semantics

`obligations_open` / `obligations_paid_off` / `obligations_complicated` / `obligations_abandoned` are **cumulative-state subsets** of the obligation state space, not per-turn deltas. An obligation transitioned to complicated at PG-N stays in `obligations_complicated` of PG-N+1, PG-N+2, ... until either superseded again to a different status or abandoned; an obligation paid off at PG-N stays in `obligations_paid_off` of every subsequent page along the branch. The same cumulative-state interpretation applies to `consequences_pending` (CNSQ-NNNN records open until addressed or expired) and `consequences_addressed` (CNSQ-NNNN records remain visible in the addressed list across subsequent pages along the branch).

Per-turn deltas live in the SE record's `ops` array (the supersession events themselves: `obligation_complicate` / `obligation_pay_off` / `obligation_abandon` / `consequence_address`). The state_snapshot fields are the post-replay register at this page — what state the branch IS in, not what changed THIS turn. This is what makes snapshot-replay equality (Phase 9 gate 4) computable: replaying the parent's snapshot through this turn's structured ops yields the new cumulative-state register, not a delta. Storylet-pool-authoring's `obligation_state` predicate (per `templates/predicate-dsl.md`) reads these subset arrays as cumulative state to determine whether a candidate storylet's hard_preconds are met against the current branch register.

## Consequence Persistence

Each `required_aftermath` item from Phase 2 is instantiated as a `CNSQ-NNNN` record UNLESS it is already represented by a newly-opened OBL (when an aftermath is sufficiently structural that an obligation is the right primitive — e.g., "discover the body" is opened as an OBL while "guilt or justification" is a CNSQ).

CNSQ records are branch-scoped. They carry `created_at_page: this_PG` and visibility along `branch_path` only — sibling branches do not see them. A subsequent turn whose selected storylet has effects matching a pending CNSQ's `kind` produces a `consequence_address` op, which supersedes the CNSQ to `status: addressed` (or `transformed` when the storylet partially absorbs it; or `expired` when narrative time renders it irrelevant).

## Branch-Isolation Invariant Enforced Here

Every new non-PG story-local record (SF / SE / OBL / CNSQ / THR / SREL / STINT / SLT-JIT / STLOC / STOBJ / DA / CHC) carries `created_at_page: this_PG`. A PG record is the page itself; its own `id` is the branch anchor and must be included in `this_page.branch_path`. The engine verifies before write — and Phase 9 gate 3 verifies recursively — that no story-local ID cited at any depth inside any record reachable from `state_snapshot` references a page outside `this_page.branch_path`. World canon (CF / M / INV / ENT) propagates freely; story-local engine state is branch-isolated.
