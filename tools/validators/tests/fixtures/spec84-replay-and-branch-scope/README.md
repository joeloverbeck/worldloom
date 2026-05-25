# SPEC-84 Replay And Branch-Scope Fixture

Golden fixture for replay-time SLT visibility across global, branch-scoped, and branch-prefix-scoped storylets.

## Branch Topology

- BR-1: root -> PG-1 -> PG-3 -> PG-5
- BR-2: root -> PG-1 -> PG-2 -> PG-4

`PG-5` is the BR-1 replay/fork parent used by the positive global-pool and sibling-exclusion cases. `PG-4` is the BR-2 replay/fork parent used by the wrong-prefix negative case.

## SLT Inventory

- `SLT-1`: `global_author_pool`; baseline visible candidate for either branch.
- `SLT-2`: `global_author_pool`; positive replay candidate. It is documented as authored after `PG-3` via `created_at_page: PG-4`, but retrieval does not consume per-SLT creation ordering, so current global-pool membership is the operative behavior.
- `SLT-3`: `global_author_pool` with hard precondition `{ pred: plan_active, plan: STPLAN-99 }`; negative replay candidate. Its `storylet_predicate_ref` edge to `STPLAN-99` is rejected at `after_source_record_id` because current code treats all story-bundle record references from global-pool SLTs as story-local.
- `SLT-4`: `branch_scoped` with `branch_id: BR-2`; sibling-branch candidate rejected from BR-1 at `after_scope`.
- `SLT-5`: `branch_prefix_scoped` with `visible_branch_path_prefix: [PG-1, PG-3]`; visible from BR-1 `PG-5` and rejected from BR-2 `PG-4` at `after_scope`.

## Consumer

`SPEC84REPBRASCO-002` consumes `fixture.json` from `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts`, materializes the records into a temporary world tree, runs `world-index build`, then calls `selectStoryletCandidates` against the built DB.

## Risk Boundary

`STPLAN-99` is authored under BR-2 for narrative coherence. The current rejection behavior does not distinguish branch-local story records from bundle-genesis story records; it uniformly rejects story-bundle references from global-pool SLTs. The FOUNDATIONS Rule 4 bundle-genesis exception remains out of scope for this fixture.
