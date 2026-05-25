# SPEC-83: SLT Cooldown Window Correctness

**Status:** active
**Date:** 2026-05-25
**Source brainstorm:** [`reports/slt-chc-overhaul-third-iteration.md`](../reports/slt-chc-overhaul-third-iteration.md) §6 "Repo-specific bugs or mismatches found" and §17 SPEC-83.
**Triage:** [`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md`](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md) §ACCEPT.
**Predecessors:** archived [`SPEC-81-indexed-storylet-candidate-retrieval.md`](../archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md) (introduced `select_storylet_candidates` and `slt_projections.slt_saliency_cooldown_pages`).

## 1. Problem

The MCP `select_storylet_candidates` tool's cooldown filter is broken. When an SLT has `cooldown_pages > 0`, the tool treats *any prior selection of that SLT — anywhere in the bundle's event history — as a permanent block*, instead of comparing the page-distance from the parent PG to the most recent prior selection on the same branch against the numeric `cooldown_pages` value.

The bug is at `tools/world-mcp/src/tools/select-storylet-candidates.ts:439-446`:

```ts
function matchesCooldown(candidate: Candidate, selectedStoryletIds: ReadonlySet<string>, storySlug: string): boolean {
  const cooldown = candidate.row.slt_saliency_cooldown_pages ?? 0;
  if (cooldown <= 0) {
    return true;
  }
  return !selectedStoryletIds.has(displayStoryRecordId(candidate.row.node_id, storySlug));
}
```

`selectedStoryletIds` is populated by `loadSelectedStoryletIds` (lines 408-437), which scans **every story_event_record in the bundle globally** — no branch filter, no page-order context. The function then collapses the numeric `cooldown_pages` field into a binary "ever previously selected" check.

Two distinct correctness failures stem from this:

1. **Numeric-window collapse**: `cooldown_pages: 2` and `cooldown_pages: 50` behave identically (forever-block after first selection on any branch).
2. **Cross-branch leak**: an SLT selected on sibling branch BR-2 blocks the same SLT from being selected on BR-1, violating branch isolation discipline (FOUNDATIONS §Story Bundles §5, Rule 4 at story scope).

The parent PG's `branchPath` is already loaded into `PageState.branchPath` at line 237 (`stringArray(parsed.branch_path)`) but is never threaded into `matchesCooldown`.

The `filter_trace.after_cooldown` counter is emitted, but no per-SLT rejection sample exists — so a forever-blocked SLT cannot be distinguished from an in-window-blocked SLT in `filter_trace` output. The third-iteration report §11 explicitly asks for stage-level rejection samples; the cooldown-specific portion of that ask folds into this spec.

## 2. Goals

- Fix `matchesCooldown` to compute numeric page-distance from the parent PG along the same branch path and compare against `slt_saliency_cooldown_pages`.
- Restrict the prior-selection scan to events whose `created_at_page` lies on the parent PG's `branch_path` (no cross-branch contamination — `created_at_page` is the page the event creates and lives on, so sibling-branch events are naturally excluded because their child PG is not in the current branch's path).
- Add a `cooldown_active_samples` field to `StoryletCandidateFilterTrace` carrying up to 3 sample rejection records (SLT id + `last_selected_on_page` + `distance` + `cooldown_pages`). The field's two consumer routes are (a) the per-call MCP response shape, where it gives operators an immediate diagnostic surface for distinguishing forever-blocked from in-window-blocked SLTs during debugging, and (b) the deferred report-SPEC-87 §7a fold-in (per triage §DEFER on SPEC-87), where the uniform sample shape will be reused if the broader candidate-filter-trace diagnostics surface ever lifts.
- Add unit tests proving: (a) SLT becomes eligible after `cooldown_pages` pages; (b) SLT remains blocked when distance < `cooldown_pages`; (c) sibling-branch selection does NOT block; (d) `cooldown_pages: 0` and `null` skip the check entirely; (e) sibling-branch selection at a *shared ancestor* (fork scenario) does NOT block.

## 3. Non-goals

- Persistent cooldown trace records (rejected — see [`archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md`](../archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md) §Out-of-Scope SSEL rejection at line 27, and the third-iteration report itself §7 Alternative C rejection).
- Schema changes to `SE.commitment` or `PG.state_snapshot` (the existing `SE.created_at_page` + `PG.branch_path` schema fields carry the necessary info — both already required per `tools/validators/src/schemas/story-event.schema.json` and `tools/validators/src/schemas/story-page.schema.json`).
- Page-plan §7a candidate-filter summary lines (folds out to the triage's DEFER bucket — see [triage](../docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md) §DEFER on report SPEC-87; no consumer beyond the per-call `filter_trace`).
- Server-side full predicate evaluation (out of scope; iteration-2 §Out-of-Scope holds).
- Cooldown semantics for branch-prefix-scoped or branch-scoped SLTs (their visibility filter already isolates them — the cooldown fix applies uniformly to all surviving candidates after `matchesScope`).

## 4. Design

### 4.1 Page-distance computation

Modify `loadSelectedStoryletIds` (or replace with a new helper `loadSelectedStoryletPagesByBranch`) to return a `Map<sltId, lastSelectedPageId>` restricted to events whose `created_at_page` is in the parent PG's `branch_path`. The branch-path index is derived at the filter call site, not stored in the map; this keeps the helper's return shape page-id-aligned with the `cooldown_active_samples` sample shape and avoids carrying two derivable forms. Two-step approach (deterministic, no recursion needed because `branch_path` is already a flat array):

1. Build `branchPagesSet = new Set(parentPage.branchPath)` — O(branchPath.length).
2. Scan `story_event_record` rows once: parse each, read `created_at_page` and `commitment.selected_slt_id`. Skip events whose `created_at_page` is not in `branchPagesSet` (this also naturally excludes sibling-branch events: each branch fork produces a distinct child PG, and only the current branch's child appears in `branchPath`). For each surviving (slt_id, created_at_page) pair, record the page-id with the **maximum branch-path index** at which the SLT appears; later index = more recent selection.
3. Result: `Map<sltId, lastSelectedPageId>`.

`matchesCooldown` then computes the branch-path index from the page-id and compares:

```ts
const lastSelectedBranchIndex = parentPage.branchPath.indexOf(lastSelectedPageId);
const distance = parentBranchIndex - lastSelectedBranchIndex;
// distance === 0 means the SLT was just selected at the current parent PG itself
// distance === 1 means the SLT was selected at the immediate predecessor page
return distance > cooldown;
```

Where `parentBranchIndex = parentPage.branchPath.length - 1` (the parent PG's own position).

**Why `created_at_page` and not `parent_page_id`**: `SE.parent_page_id` is the page the event *forks from*; multiple sibling-branch events at a forked ancestor share the same `parent_page_id`. Filtering by `parent_page_id ∈ branchPath` would therefore include sibling-branch events whose `parent_page_id` is a shared ancestor in the current branch's path — leaving the cross-branch leak partially open under fork scenarios. `SE.created_at_page` is the page the event *creates and lives on*; each branch fork has a distinct child PG, so filtering by `created_at_page ∈ branchPath` precisely identifies events that landed on the current branch.

**Edge cases**:
- `lastSelectedPageId` undefined (SLT never selected on this branch): pass.
- `lastSelectedBranchIndex === parentBranchIndex`: SLT was just selected at the current parent PG (distance 0) → blocked when `cooldown > 0`.
- `cooldown === 0` or `null`: pass (current behavior at line 441-443; preserved).
- Events whose body does not carry `created_at_page` (legacy partial-body fixtures, malformed records): skipped — they cannot be mapped to a branch-path index. This is a defensive default; valid SE records authored against the current schema always carry `created_at_page` (required per `tools/validators/src/schemas/story-event.schema.json:11`).

### 4.2 `filter_trace.cooldown_active_samples`

Extend `StoryletCandidateFilterTrace` (interface at line 41 of `select-storylet-candidates.ts`):

```ts
export interface StoryletCandidateFilterTrace {
  pool_total: number;
  after_scope: number;
  after_driver_kind: number;
  after_action_family: number;
  after_predicate_shape: number;
  after_predicate_class: number;
  after_source_record_id: number;
  after_mystery_policy: number;
  after_cooldown: number;
  cooldown_active_samples: ReadonlyArray<{
    slt_id: string;
    last_selected_on_page: string;
    distance: number;
    cooldown_pages: number;
  }>;
}
```

Populate `cooldown_active_samples` during the `afterCooldown` filter pass (line 574-577) with up to 3 sample rejections. Determinism: take the first 3 in iteration order over `afterMysteryPolicy` (which is already deterministic per the upstream filters).

### 4.3 Telemetry on the response contract

This is a **purely additive** extension to the existing `SelectStoryletCandidatesResponse.filter_trace`. No new MCP tool. No schema for any record class. No persisted state.

## 5. Files Touched

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` — `matchesCooldown` rewrite (parametrize on parent-page branchPath + lastSelectedPageId map), `loadSelectedStoryletIds` replacement to `loadSelectedStoryletPagesByBranch` reading `created_at_page` from each event body, `StoryletCandidateFilterTrace` interface extension, sample-collection in the cooldown filter pass.
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` — extend existing cooldown coverage (the current test at line 147 only covers binary block). **Fixture update**: add `created_at_page` (and any other now-required SE fields surfaced by the new loader) to the SE-1 fixture body at line 127 so the SPEC-81-era cooldown blocking is preserved; without this, the new loader will silently skip SE-1 and the existing `after_cooldown: 2` assertion will become `after_cooldown: 3`.
- `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` — new file with the five cases from §2 (within-window block, expired-window pass, sibling-branch isolation, zero-cooldown pass, shared-ancestor fork isolation).
- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` — update existing cooldown assertions to reflect the new `filter_trace` shape (additive `cooldown_active_samples` field). **Fixture update**: add `created_at_page: PG-1` to the SE-1 and SE-2 fixtures at lines 240-256 so the SPEC-81 §9.3 hand-counted-pool blocking is preserved (`after_cooldown: 8`); without this, both events will be skipped and `after_cooldown` will become `10`.

No skill, schema, validator-registry, or world-index changes. The fix is fully contained in the MCP tool plus its test fixtures.

## 6. Acceptance Criteria

1. `matchesCooldown` consults the parent PG's `branch_path` and computes numeric distance.
2. `loadSelectedStoryletIds` (or replacement) restricts its scan to events whose `created_at_page` is in the parent branch path.
3. An SLT with `cooldown_pages: 2` selected 3 pages ago on the same branch is eligible; selected 1 page ago, blocked.
4. An SLT selected on a sibling branch does not block selection on the current branch.
5. An SLT selected on branch BR-2 that forked from a shared ancestor PG-N does NOT block selection on branch BR-1 that also forked from PG-N (the `created_at_page` filter precisely excludes BR-2's event because BR-2's child page is not in BR-1's `branch_path`, even though their shared ancestor PG-N is).
6. `filter_trace.cooldown_active_samples` carries up to 3 rejection samples with `slt_id` / `last_selected_on_page` / `distance` / `cooldown_pages`.
7. After fixture updates that add `created_at_page` to seeded SE records, SPEC-81's existing 1,000-SLT synthetic test preserves its `after_cooldown` count (the synthetic pool's prior selections all sit on the test's single branch; the numeric-window semantics agree with the old binary check when distance is always ≤ cooldown).
8. `pnpm turbo lint typecheck test` passes.

## 7. FOUNDATIONS Alignment

| Principle | Stance | Mechanism @ surface |
|---|---|---|
| §Story Bundles §5b "Schema-minimalism at story scope" | aligns | No new schema field, no new record class; the fix lives entirely in the MCP filter logic. The `filter_trace.cooldown_active_samples` addition is a per-call diagnostic on the response contract @ MCP tool boundary, not a persisted field on `SE`, `PG`, or any other record. |
| §Story Bundles §5 Rule 4 "No Globalization by Accident" (story-scope branch isolation) | aligns | The fix corrects a cross-branch globalization bug: an SLT selection on BR-2 currently leaks into BR-1's cooldown bookkeeping. Restricting the prior-selection scan to events whose `created_at_page` is on the parent's `branch_path` enforces branch isolation @ MCP retrieval, including under fork scenarios where sibling branches share an ancestor `parent_page_id` (the `created_at_page` of sibling-branch events is the sibling's child PG, which is NOT in the current branch's `branch_path`). |
| §Story Bundles §5 Rule 5 "No Consequence Evasion" (per-page consequence capacity) | aligns | The current bug **reduces** consequence capacity by forever-blocking eligible SLTs after one use; the fix restores the authoring intent encoded by `cooldown_pages` @ retrieval-time eligibility. |
| §Story Bundles §5c "Driver salience is local" | N/A | Cooldown applies uniformly across all driver kinds via the same `matchesCooldown` check; this fix touches retrieval-time eligibility, not driver salience ranking. |

## 8. Verification Test Plan

Run on a worktree containing the fix:

1. **Unit (new)**: `pnpm --filter world-mcp test -- select-storylet-candidates-cooldown-window` — all five cooldown cases pass. *(rationale: this is the primary correctness gate for the bug fix; without these cases the regression — including the fork-scenario cross-branch leak — is undetectable)*
2. **Unit (regression)**: `pnpm --filter world-mcp test -- select-storylet-candidates.test` — existing cooldown assertions continue to pass with the updated `filter_trace` shape and the updated SE-1 fixture. *(rationale: SPEC-81's existing coverage must not regress)*
3. **Integration**: `pnpm --filter world-mcp test -- spec81-storylet-candidate-retrieval` — 1,000-SLT synthetic pool behavior preserved after SE-1 / SE-2 fixture updates. *(rationale: SPEC-81's scaling proof must remain intact)*
4. **Lint + typecheck**: `pnpm turbo lint typecheck` — clean. *(rationale: pre-completion verification per global CLAUDE.md)*
