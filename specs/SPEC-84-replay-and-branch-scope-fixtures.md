# SPEC-84: Replay/Fork and Branch-Scope Golden Fixtures

**Status:** active
**Date:** 2026-05-25
**Source brainstorm:** [`reports/slt-chc-overhaul-third-iteration.md`](../reports/slt-chc-overhaul-third-iteration.md) §17 SPEC-84 (replay live global pool) + §17 SPEC-85 (branch-scope exclusion). Combined here because both prove replay-time SLT visibility correctness across scope dimensions.
**Triage:** [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md) §ACCEPT (assumption A — combined).
**Predecessors:** archived [`SPEC-79-chc-associated-commitment-block-removal.md`](../archive/specs/SPEC-79-chc-associated-commitment-block-removal.md) (made the live-global-pool semantics structural by removing CHC→SLT pinning); archived [`SPEC-81-indexed-storylet-candidate-retrieval.md`](../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md) (proves branch-scope filtering at the projection layer with 9 synthetic rows, no replay context).

## 1. Problem

Post-SPEC-79, the storylet pool is structurally live: a replay or fork from an older parent PG-X sees the *current* global author pool (not the pool that existed when PG-X was committed), filtered by lawfulness gates against PG-X's snapshot. Branch-scoped and branch-prefix-scoped SLTs are isolated to their branch (or branch-prefix) and invisible to siblings.

These behaviors are **doctrinally correct** but **unproven by any golden fixture**:

- **Replay/newer-global-SLT**: No test exercises an older PG selecting a newer global SLT that was authored AFTER the parent PG committed. The 15+ replay tests in `tools/validators/tests/structural/snapshot-replay-equality.test.ts` cover snapshot/hash equality but not pool-refresh semantics.
- **Branch-scope exclusion at replay time**: `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts:131-148` exercises `slt_scope_branch_id` and `slt_scope_branch_path_prefix` filtering with 9 synthetic projection rows on a single parent page — it does NOT cover the case where a fork from branch BR-2 must reject a branch-scoped SLT belonging to sibling BR-1.
- **Branch-prefix wrong-prefix case**: No fixture proves a `branch_prefix_scoped` SLT with prefix `[PG-1, PG-2]` is correctly excluded from a fork whose `branch_path` is `[PG-1, PG-3, PG-9]`.

The iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope rejected the original "replay live global pool" proposal **as a separate structural spec** ("Subsumed by SPEC-79 — the live global pool semantics is automatic once `CHC.associated_commitment_block` is removed"). The structural rejection stands. This spec proposes the **test-only** complement: fixtures that prove the now-automatic behavior actually works, since replay/fork is the exact place where the prior CHC→SLT stale-binding bug manifested.

This is a **fixture-and-test spec only**. No schema change, no skill prose change, no MCP-tool change.

## 2. Goals

Author one new compact authored bundle and three integration tests covering:

1. **Replay sees newer global SLT (positive)** — fork from old PG-3 selects an SLT added to the global author pool after PG-3 was committed, when the SLT passes all lawfulness gates against PG-3's snapshot.
2. **Replay rejects newer global SLT with branch-local exact ref (negative)** — same setup, but the new global SLT's hard predicate references a `STPLAN-*` that is branch-local to BR-2; from BR-1's fork the SLT is rejected as `global_slt_branch_local_dependency`.
3. **Branch-scoped sibling exclusion** — fork from BR-1 parent, branch-scoped SLT belongs to sibling BR-2 → excluded by `matchesScope` (`select-storylet-candidates.ts:318-344`).
4. **Branch-prefix prefix-match positive** — fork whose `branch_path` matches the SLT's `slt_scope_branch_path_prefix` → included.
5. **Branch-prefix wrong-prefix negative** — fork whose `branch_path` does NOT have the SLT's `slt_scope_branch_path_prefix` → excluded.

## 3. Non-goals

- New schema fields, new MCP tools, new validators.
- New skill prose (turn-cycle Phase 2 already prescribes `select_storylet_candidates`; bootstrap already prescribes the null-default for absent SLT pinning post-SPEC-79).
- A "replay policy" record class or carrier (rejected per iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope; the policy is the implementation, not a persisted artifact).
- Cooldown semantics across replay (covered by SPEC-83's branch-restricted cooldown scan).
- Authored large-pool fixtures (deferred per triage §DEFER on report SPEC-89; the synthetic SPEC-81 proof + this spec's small authored fixture are sufficient).

## 4. Design

### 4.1 Authored fixture

Add one fixture at `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/`:

- `README.md` — fixture description, branch topology diagram, expected behaviors.
- `fixture.json` — small authored bundle in the same shape as `red-kiln-ambush/fixture.json` (one JSON file carrying world canon + story bundle records). Minimum content:
  - 2 branches: BR-1 (root → PG-1 → PG-3 → PG-5), BR-2 (root → PG-1 → PG-2 → PG-4).
  - 5 SLTs:
    - SLT-1: `scope.visibility: global_author_pool`, authored at bundle creation, broadly applicable.
    - SLT-2: `scope.visibility: global_author_pool`, authored AFTER PG-3 was committed (simulated by SLT having higher creation index than the PG; the fixture wires this), broadly applicable — proves positive replay.
    - SLT-3: `scope.visibility: global_author_pool`, hard predicate `exists(STPLAN-99)` where STPLAN-99 is branch-local to BR-2 — proves negative replay (rejected from BR-1 fork as `global_slt_branch_local_dependency`).
    - SLT-4: `scope.visibility: branch_scoped`, `scope.branch_id: BR-2` — proves sibling exclusion from BR-1 fork.
    - SLT-5: `scope.visibility: branch_prefix_scoped`, `scope.branch_path_prefix: [PG-1, PG-3]` — proves prefix-match positive from BR-1's `[PG-1, PG-3, PG-5]` fork; proves wrong-prefix negative from BR-2's `[PG-1, PG-2, PG-4]` fork.

The fixture stays small (target ~300-400 lines total JSON, comparable to Red Kiln's 271-line `fixture.json`). It exists to prove these specific gates, not to exercise rich prose or full driver coverage.

### 4.2 Integration tests

Add `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` with five `describe`/`it` blocks corresponding to the five cases in §2. Each test:

1. Builds the fixture's world-index DB.
2. Calls `select_storylet_candidates` with the appropriate `parent_page_id` and `turn_driver`.
3. Asserts presence/absence of the target SLT in `shortlisted_candidate_ids` AND in `filter_trace.after_scope` (for scope-exclusion cases) or `filter_trace.after_source_record_id` (for the branch-local-ref rejection case).

For the "rejected as `global_slt_branch_local_dependency`" assertion, the current `matchesSourceRecordIds` logic at `select-storylet-candidates.ts:383-401` rejects global SLTs whose source-record edges point at story-local record IDs (`isStoryLocalRecordId` check). The fixture's SLT-3 should be excluded at the `after_source_record_id` stage; the test asserts this exact stage. (No new rejection sample mechanism is required — the existing per-stage counters suffice for assertion.)

### 4.3 Validator behavior — confirmation only

No validator change. The fixture proves that the existing `matchesScope` (line 318-344) and `matchesSourceRecordIds` (line 383-401) logic produces the right outcomes for the five cases. If any case fails, the bug is in those functions, not in the spec.

## 5. Files Touched

- `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/README.md` — new.
- `tools/validators/tests/fixtures/spec84-replay-and-branch-scope/fixture.json` — new (authored bundle, ~300-400 lines).
- `tools/world-mcp/tests/integration/spec84-replay-and-branch-scope.test.ts` — new.

No source-code changes, no schema changes, no skill prose changes, no validator-registry changes.

## 6. Acceptance Criteria

1. The fixture loads and parses through `world-index build` cleanly (no schema rejections).
2. From a BR-1 fork at PG-5, calling `select_storylet_candidates` with a player driver shortlists SLT-2 (newer global, lawful).
3. From a BR-1 fork at PG-5, SLT-3 is rejected at the `after_source_record_id` stage (its branch-local-ref dependency on STPLAN-99 / BR-2 fails the global-pool branch-local-ref gate).
4. From a BR-1 fork at PG-5, SLT-4 is rejected at the `after_scope` stage (sibling branch-scoped).
5. From a BR-1 fork at PG-5, SLT-5 is shortlisted (prefix `[PG-1, PG-3]` matches branch_path `[PG-1, PG-3, PG-5]`).
6. From a BR-2 fork at PG-4, SLT-5 is rejected at the `after_scope` stage (branch_path `[PG-1, PG-2, PG-4]` does not start with `[PG-1, PG-3]`).
7. `pnpm turbo lint typecheck test` passes.

## 7. FOUNDATIONS Alignment

| Principle | Stance | Mechanism @ surface |
|---|---|---|
| §Story Bundles §4a "Plan-Authority Boundary" — PG snapshots are the fork primitive | aligns | The fixture exercises the canonical fork pattern: a committed PG (with or without rendered prose) becomes the parent of a new fork, and SLT eligibility is computed against that PG's snapshot @ MCP retrieval. |
| §Story Bundles §5 Rule 4 "No Globalization by Accident" (story-scope branch isolation) | aligns | Cases 3, 5, 6 directly prove branch-scope / branch-prefix-scope isolation gates. Case 2 proves that global-pool SLTs are also subject to branch-local-ref dependency rejection @ retrieval-time eligibility, preventing inadvertent cross-branch coupling through predicate refs. |
| §Story Bundles §5b "Schema-minimalism at story scope" | aligns | Zero new fields, zero new records, zero new validators. The spec is fixture + tests only @ test-surface. |
| §Story Bundles §5c "No global drama manager" | aligns | The replay-time pool refresh is a *local* salience pass (which SLTs apply at this PG?), not a *global* planning pass (steer the story toward a target shape). The fixture verifies the local-salience model holds across pool growth and across branches @ runtime selection. |

## 8. Verification Test Plan

Run on a worktree containing the new fixture and tests:

1. **Fixture parse**: `pnpm --filter world-index build -- <fixture-world>` — loads cleanly. *(rationale: the fixture is the spec; if it doesn't parse, the spec is unbuildable)*
2. **Integration (new)**: `pnpm --filter world-mcp test -- spec84-replay-and-branch-scope` — all five cases pass. *(rationale: this is the primary acceptance gate)*
3. **Integration (regression)**: `pnpm --filter world-mcp test -- spec81-storylet-candidate-retrieval` — unchanged. *(rationale: the new fixture must not perturb SPEC-81's existing branch-scope projection coverage at the synthetic-row layer)*
4. **Lint + typecheck**: `pnpm turbo lint typecheck` — clean. *(rationale: pre-completion verification per global CLAUDE.md)*
