# Phase 1: Plan / Prose Pairing

Phase 1 establishes that the rendered prose was produced against the plan currently on disk, and that the plan's view of the world (state hash + canon revision) still matches the PG record's view. The check exists because the plan is an authoring-time prompt and the prose is rendered against that prompt; if the world canon shifted between plan-commit and finalize, the prose may have been rendered against a stale view of the world.

## Inputs

- Plan frontmatter (loaded at pre-flight from `pages-prose-plans/PG-NNNN.md`).
- PG record (loaded at pre-flight).
- `accept_plan_drift` flag (default `false`).

## Drift Checks

Two equality checks against the plan's frontmatter:

| Plan frontmatter field | PG record field | Drift meaning |
|---|---|---|
| `state_hash_at_plan_time` | `PG.state_hash` | The PG's state snapshot mutated after plan-commit. Should be impossible under the design's append-only contract — investigate any mismatch. |
| `canon_revision_at_plan_time` | `PG.state_snapshot.canon_revision` | World canon advanced between plan-commit and finalize (a `canon-addition` ran). The plan's §5 (World canon snapshot) is now stale; the prose may reference now-retconned canon. |

## Decision Routing

```
state_hash drift?  canon_revision drift?  accept_plan_drift  Route
       no                  no                    -            PROCEED — no drift detected
       no                  yes                  false         ABORT — canon advanced; re-render or accept drift explicitly
       no                  yes                  true          PROCEED — record drift in SE.notes
       yes                  -                    -            ABORT (always) — state_hash drift is structural, not just stale canon
```

## Abort Forms

**state_hash drift (always abort):**

```
state_hash_drift: plan.state_hash_at_plan_time = <plan-hash>; PG.state_hash = <pg-hash>.
The PG state snapshot changed after the plan was committed. This indicates a structural anomaly —
the PG record's state_snapshot is append-only at the engine layer. Investigate before re-running.
```

**canon_revision drift without `accept_plan_drift` (abort):**

```
canon_revision_drift: plan.canon_revision_at_plan_time = <plan-CH>; PG.state_snapshot.canon_revision = <pg-CH>.
World canon advanced between plan-commit and prose render. The plan's §5 world canon snapshot is now stale.
Options:
  (a) Re-run branching-story-page-cycle (or bootstrap) Phase 7 with the current canon revision to regenerate
      the plan against fresh canon; render new prose against the new plan; re-run finalize.
  (b) If the canon advance is irrelevant to this page's content, re-run this skill with accept_plan_drift=true.
      The drift will be recorded in SE.notes; the rendered prose will be finalized as-is.
```

## Proceed-with-drift Form

When `accept_plan_drift == true` and `canon_revision_drift` is detected, record the drift in working context for Phase 7 to inline into `SE.notes`:

```
SE.notes draft: "Prose finalized; deferred validators resolved; ARCTRACE emitted: <bool>.
Plan drift accepted: canon_revision advanced from <plan-CH> to <pg-CH> between plan-commit and finalize."
```

The drift record is the audit trail — a future health-audit can read the SE event and see exactly which CH advanced unobserved by the plan.

## Non-drift Hash Verification

Beyond the two drift checks, Phase 1 also verifies that the plan's `plan_id` frontmatter field equals `PG-NNNN` (the page being finalized). A mismatch indicates a misnamed plan file:

```
plan_id_mismatch: plan.plan_id = "<plan-plan-id>"; expected "<page_id>".
The plan file at pages-prose-plans/PG-NNNN.md is named for one page but its frontmatter cites another.
Investigate before re-running.
```

## Phase 1 Output

On PROCEED:

- Drift status recorded in working context: `{ state_hash_drift: false, canon_revision_drift: <bool>, accepted: <bool> }`.
- Plan frontmatter cached for Phase 2's `forbidden_engine_vocabulary` and `forbidden_resolutions` reads and for Phase 4's `selected_arc_id` / `chosen_variant_id` reads.

On ABORT: no writes; halt. The user revises the plan, the prose, or both, then re-runs the skill.
