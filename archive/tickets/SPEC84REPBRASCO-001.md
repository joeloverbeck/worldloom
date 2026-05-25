# SPEC84REPBRASCO-001: Author replay-and-branch-scope golden fixture bundle

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new fixture bundle at `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/` (test-data only; no impact on production code).
**Deps**: None

## Problem

Post-SPEC-79, the storylet pool is structurally live: a replay or fork from an older parent PG-X sees the *current* global author pool, filtered by lawfulness gates against PG-X's snapshot. Branch-scoped and branch-prefix-scoped SLTs are isolated to their branch (or branch-prefix) and invisible to siblings. These behaviors are doctrinally correct but unproven by any golden fixture: the 15+ replay tests in `tools/validators/tests/structural/snapshot-replay-equality.test.ts` cover snapshot/hash equality but not pool-refresh semantics; `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` exercises `slt_scope_branch_id` only via synthetic projection rows on a single parent page (storylets 71-100 receive `branchId: BR-999`, filtered at `after_scope`), and `slt_scope_branch_path_prefix` is not exercised at all (the `sltProjection` helper accepts a `branchPrefix` parameter but no SPEC-81 test populates it). This ticket authors the fixture bundle (per SPEC-84 §4.1) that the capstone integration test in SPEC84REPBRASCO-002 will consume to prove the five §2 cases end-to-end.

## Assumption Reassessment (2026-05-25)

1. The fixture shape mirrors `tools/validators/tests/fixtures/red-kiln-ambush/fixture.json` (single JSON file carrying world canon + story-bundle records under a top-level `records[]` array, plus a sibling `README.md`); verified by directory listing — the only other authored bundle in `tools/validators/tests/fixtures/` is `red-kiln-ambush/` with the same two-file shape. Target size ~300-400 lines, comparable to Red Kiln's 271-line `fixture.json`. The fixture records use the same `{ node_type, node_id, file_path, parsed }` shape per record, with `world_slug` + `story_slug` top-level keys.
2. SPEC-84 §4.1 specifies the topology exactly: 2 branches (BR-1: root → PG-1 → PG-3 → PG-5; BR-2: root → PG-1 → PG-2 → PG-4), 5 SLTs (SLT-1/SLT-2 with `scope.visibility: global_author_pool`; SLT-3 with `scope.visibility: global_author_pool` plus hard precondition `{ pred: plan_active, plan: STPLAN-99 }`; SLT-4 with `scope.visibility: branch_scoped` and `scope.branch_id: BR-2`; SLT-5 with `scope.visibility: branch_prefix_scoped` and live-schema `scope.visible_branch_path_prefix: [PG-1, PG-3]`). The drafted spec/tickets used `scope.branch_path_prefix`, but `tools/validators/src/schemas/story-storylet.schema.json` and `tools/world-index/src/parse/atomic.ts` read `visible_branch_path_prefix`; this ticket implements and truths the live field name. Per spec §4.1 SLT-2 paragraph, the live-pool semantics is structural and no per-SLT creation-index wiring is load-bearing for the test; an optional `created_at_page: PG-4` may document author intent without affecting retrieval (only `SE.created_at_page` is read by the cooldown-tracking code in `tools/world-mcp/src/tools/select-storylet-candidates.ts`, not `SLT.created_at_page`). The SLT schema's required-field set is authoritative per `tools/validators/src/schemas/story-storylet.schema.json` (`scope`, `title`, `move_family`, `preconditions`, `beats`, `exit_options`, `saliency`, `mystery_policy`, `provenance`, and `grounding`; `effects` is optional but included as an empty create/supersede/close carrier for clarity).
3. Cross-artifact boundary under audit: the fixture's shape contract with the SPEC-45 materialize-and-build pattern (per `tools/world-mcp/tests/integration/spec45-provenance-e2e.test.ts:226-236`) that SPEC84REPBRASCO-002 will use to consume this fixture. The fixture's `records[].node_type`, `records[].node_id`, `records[].file_path`, and `records[].parsed` fields must match what `@worldloom/world-index/commands/build`'s `build()` function expects when indexing a materialized world tree; the Red Kiln fixture is the established reference for these field semantics. The branch-path constraint: per `tools/world-mcp/src/tools/select-storylet-candidates.ts` `matchesScope` logic, branch_prefix_scoped matching requires `prefixPath.every((pageId, index) => page.branchPath[index] === pageId)`, so the PG records' `state_snapshot.branch_path` arrays must be authored to include the full ancestor chain (`[PG-1, PG-3, PG-5]` for BR-1's PG-5; `[PG-1, PG-2, PG-4]` for BR-2's PG-4).
4. FOUNDATIONS principles motivating this ticket: §Story Bundles §5 Rule 4 (story-scope branch isolation — branch-scoped + branch-prefix-scoped SLTs must remain invisible to siblings) is the load-bearing principle the fixture exercises; §Story Bundles §5b (schema-minimalism at story scope) is preserved trivially — the fixture authors zero new fields, zero new records, zero new validators. Per spec §7's FOUNDATIONS Alignment table, the fixture's primary contribution to Rule 4 is the SLT-4 / SLT-5 / case-2 (cross-branch story-bundle-record-ref via STPLAN-99) scenarios. The fixture does NOT adjudicate the pre-existing FOUNDATIONS §5 Rule 4 vs `isStoryLocalRecordId` divergence on the `bundle_genesis_record` exception noted in SPEC-84 §9 Risks #1 — STPLAN-99 is authored as branch-local for narrative coherence but the current code's rejection is uniform across all story-bundle record classes.

## Architecture Check

1. Authoring the fixture as a discrete reviewable diff (separate from the integration test in 002) lets reviewers verify topology + SLT data in isolation from test-authoring concerns. The fixture is data, not code; conflating fixture-authoring with test-authoring in a single ticket would mix concerns and inflate the diff to ~600-800 lines spanning two packages. The split also matches the natural causal order — the fixture must exist before the test that consumes it can be reviewed against a real consumer surface — which the `Deps: 001` declaration on 002 makes structural.
2. No backwards-compatibility shims introduced — net-new fixture; no prior version to alias. No alias to a legacy fixture; no compat layer for older schema shapes.

## Verification Layers

1. JSON syntactic validity → `node -e "JSON.parse(require('fs').readFileSync(...))"` returns no error (codebase grep-proof on the parsed structure).
2. Topology correctness (2 branches, 5 PGs, 5 SLTs with specified IDs / scopes / branch_path arrays) → manual review against SPEC-84 §4.1; also verifiable structurally via the consuming test in SPEC84REPBRASCO-002 (which asserts on specific SLT IDs and stages).
3. Cross-artifact boundary contract (fixture shape consumable by world-index `build()` API) → verified at integration-test runtime in SPEC84REPBRASCO-002 (the `build(root, fixture.world_slug, { quiet: true })` call would emit schema-rejection errors if the fixture's record shapes don't match world-index expectations). This is the single end-to-end proof surface for the fixture's correctness; this ticket's verification is structural (JSON validity + topology match) because the functional verification surface lives in the consumer.

## Landed Changes

### 1. Created fixture directory

Created `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/` as a new directory under the validators package's test fixtures root, parallel to the existing `tools/validators/tests/fixtures/red-kiln-ambush/` directory.

### 2. Authored README.md documenting topology

Authored `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/README.md` covering:

- **Purpose**: SPEC-84 golden fixture proving replay-time SLT visibility correctness across scope dimensions.
- **Branch topology diagram**:
  - BR-1: root → PG-1 → PG-3 → PG-5
  - BR-2: root → PG-1 → PG-2 → PG-4
- **SLT inventory** with scope + expected behavior per case:
  - SLT-1: `scope.visibility: global_author_pool`, broadly applicable. Baseline visible to any parent PG.
  - SLT-2: `scope.visibility: global_author_pool`, broadly applicable. Proves positive replay (visible from older PG-3 even though the spec frames the SLT as "authored after PG-3's commit"; live-pool semantics makes the framing structurally automatic regardless of any per-SLT creation-index wiring).
  - SLT-3: `scope.visibility: global_author_pool` with hard precondition `{ pred: plan_active, plan: STPLAN-99 }`. Proves negative replay — the `storylet_predicate_ref` edge to STPLAN-99 triggers rejection at the `after_source_record_id` stage because `STPLAN` is in `RECORD_PREFIX_TO_CLASS` (any story-bundle record class is `isStoryLocalRecordId`-positive per current code at `tools/world-mcp/src/tools/select-storylet-candidates.ts`).
  - SLT-4: `scope.visibility: branch_scoped` with `scope.branch_id: BR-2`. Proves sibling exclusion from BR-1 fork (rejected at `after_scope`).
  - SLT-5: `scope.visibility: branch_prefix_scoped` with `scope.visible_branch_path_prefix: [PG-1, PG-3]`. Proves prefix-match positive from BR-1 fork at PG-5 (whose `branch_path` is `[PG-1, PG-3, PG-5]` — prefix matches) AND wrong-prefix negative from BR-2 fork at PG-4 (whose `branch_path` is `[PG-1, PG-2, PG-4]` — prefix does not match).
- **Consumer**: SPEC84REPBRASCO-002's integration test at `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` consumes this fixture via cross-package path resolution (analogous to `tools/validators/tests/integration/spec76-red-kiln-ambush.test.ts` consuming `red-kiln-ambush/fixture.json`).
- **Note on §9 Risks #1**: STPLAN-99 is authored as branch-local under BR-2 for narrative coherence; the rejection at `after_source_record_id` does NOT distinguish branch-local from bundle-genesis records (current code uniformly rejects all story-bundle refs from global SLTs). Adjudication of the FOUNDATIONS §5 Rule 4 divergence is out of scope for this fixture.

### 3. Authored fixture.json

Authored `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` as a single JSON file with this top-level shape:

- `world_slug`: a unique slug (e.g., `spec84-replay-and-branch-scope-world`).
- `story_slug`: a unique slug (e.g., `spec84-replay-and-branch-scope`).
- `records[]` array containing:
  - **One world-level CF record** — minimum viable canon for the fixture world to parse through `world-index build` cleanly (mirroring `red-kiln-ambush`'s CF setup; required fields per `tools/validators/src/schemas/canon-fact-record.schema.json`).
  - **Two BR records** (BR-1, BR-2) with live-schema branch metadata; page-level `branch_path` arrays declare ancestor chains.
  - **Five PG records** (PG-1 through PG-5) with `branch_id` + `branch_path` arrays + minimal `state_snapshot.active_records` appropriate for each branch position. Branch_path content per topology:
    - PG-1: `[PG-1]` (root)
    - PG-2: `[PG-1, PG-2]` (BR-2)
    - PG-3: `[PG-1, PG-3]` (BR-1)
    - PG-4: `[PG-1, PG-2, PG-4]` (BR-2)
    - PG-5: `[PG-1, PG-3, PG-5]` (BR-1)
  - **One STPLAN record** (STPLAN-99) authored under BR-2 (per the README note above) to serve as SLT-3's hard-precondition referent.
  - **Five SLT records** per the inventory above, each with full required schema fields per `tools/validators/src/schemas/story-storylet.schema.json`:
    - `id`, `title`, `move_family`, `scope` (with `visibility` + conditional `branch_id` / `visible_branch_path_prefix`), `preconditions` (`hard` array; `soft` array; empty for SLTs 1/2/4/5), `beats`, `exit_options`, `provenance` (`origin`), `saliency` (`urgency` + `cooldown_pages`), `mystery_policy` (`allowed_authority`), and `grounding` (`compatible_turn_drivers` + `reason_to_exist`). `effects` is optional in the schema but included with empty arrays for all five SLTs.
- `files[]` array (if needed per the red-kiln-ambush shape) for any auxiliary file content the materialization step in 002 needs to write into the temp world tree.

Final size is 549 JSON lines; the increase over the target comes from using full live-schema page, branch, STPLAN, and SLT records rather than the draft's abbreviated sketches.

## Files to Touch

- `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/README.md` (new)
- `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` (new)

## Out of Scope

- Source-code changes (per SPEC-84 §3 Non-goals — no schema fields, no MCP tools, no validators, no skill prose).
- Schema additions (no new fields on SLT, PG, BR, STPLAN, or any record class).
- Modifications to existing fixtures (`red-kiln-ambush/`, `midstory-introduction/`, and atomic-record fixtures untouched).
- Integration test code (lives in SPEC84REPBRASCO-002).
- A separate `tools/validators/tests/integration/spec84-*.test.ts` file (no validator-side integration test needed; SPEC84REPBRASCO-002's world-mcp integration test is the sole functional consumer).
- Adjudication of the FOUNDATIONS §5 Rule 4 vs `isStoryLocalRecordId` divergence (SPEC-84 §9 Risks #1) — a future spec adjudicates whether to relax the code's uniform story-bundle-ref rejection or codify it; the fixture tests current code behavior.
- A dedicated regression test asserting no `CHC.associated_commitment_block` field is used (SPEC-84 §3 — implicit per SPEC-79's field removal; schema validation guards regression).

## Acceptance Criteria

### Tests That Must Pass

1. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json', 'utf8'))"` — exits 0 (JSON syntactic validity).
2. Manual visual review of `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/README.md` confirms the 2-branch + 5-PG + 5-SLT topology matches SPEC-84 §4.1 IDs / scopes / branch_path arrays exactly.
3. `(cd tools/validators && npm run build)` — clean TypeScript build (regression check; no impact expected since the fixture is JSON data, not TS code, but confirms the addition doesn't perturb the validators package build).

### Invariants

1. The fixture's record shapes match the world-index `build()` input contract (verified end-to-end by SPEC84REPBRASCO-002's test at runtime; any schema-rejection surfaces as a test setup failure with stage-named error output).
2. The fixture authors zero new schema fields, zero new record classes, zero new validators — per SPEC-84 §3 Non-goals and FOUNDATIONS §Story Bundles §5b schema-minimalism.

## Test Plan

### New/Modified Tests

1. `None — fixture-data ticket; the fixture is exercised end-to-end by SPEC84REPBRASCO-002's integration test which IS the functional verification surface. This ticket's own verification is structural (JSON validity + topology match against the spec) per the Verification Layers section above.`

### Commands

1. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json', 'utf8'))"` — JSON syntactic validity check.
2. `(cd tools/validators && npm run build)` — validators-package regression build (no expected impact since the fixture is data, not code, but confirms the addition is clean).
3. `git diff --stat tools/validators/tests/fixtures/spec84-replay-and-branch-scope/` — confirms only the two new files landed (README.md + fixture.json) with no incidental edits to sibling fixtures.

## Outcome

Completed: 2026-05-25

- Added `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/README.md` documenting the BR-1 / BR-2 topology, five SLTs, expected selection/rejection stages, and the out-of-scope FOUNDATIONS Rule 4 bundle-genesis divergence.
- Added `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` with one minimal CF record, two BR records, five PG records, one BR-2 `STPLAN-99`, five SLTs, and minimal `WORLD_KERNEL.md` / `ONTOLOGY.md` fixture files for the later materialize-and-build consumer.
- Truthed the active spec and dependent ticket to the live authored field name `scope.visible_branch_path_prefix`; the DB projection remains `slt_scope_branch_path_prefix`.

## Verification Result

1. `node -e "JSON.parse(require('fs').readFileSync('tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json', 'utf8'))"` — passed; the fixture is syntactically valid JSON.
2. Manual review — passed; README + fixture encode BR-1 as `PG-1 -> PG-3 -> PG-5`, BR-2 as `PG-1 -> PG-2 -> PG-4`, and SLT-1 through SLT-5 with the expected global, branch-scoped, and branch-prefix-scoped cases.
3. `(cd tools/validators && npm run build)` — passed; TypeScript build completed cleanly.
4. `git diff --stat tools/validators/tests/fixtures/spec84-replay-and-branch-scope/` — covered by closeout review; only the new SPEC-84 fixture README and JSON live under that directory.

## Deviations

- The draft used `scope.branch_path_prefix`; live schema and parser code use `scope.visible_branch_path_prefix`. The fixture, active spec, this ticket, and `SPEC84REPBRASCO-002` now use the live authored field name while preserving the projected DB column name where relevant.
- The draft expected roughly 300-400 fixture JSON lines. The landed file is 549 lines because full live-schema records were authored rather than abbreviated records. This is a review-size deviation only, not a behavior or scope expansion.
