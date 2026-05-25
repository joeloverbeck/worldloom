# SPEC83SLTCOOWIN-001: Fix SLT cooldown filter — numeric-window + branch-isolation correctness

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/select-storylet-candidates.ts` (cooldown filter algorithm rewrite + helper replacement + additive `StoryletCandidateFilterTrace` field); `tools/world-mcp/src/context-packet/shared.ts` (embedded selection-shortlist trace type kept in sync); 3 test files in `tools/world-mcp/tests/` extended (unit cooldown coverage + new cooldown-window cases + integration fixture). No new MCP tool, no schema changes, no validator-registry changes, no world-index changes, no skill changes.
**Deps**: None

## Problem

The MCP `select_storylet_candidates` tool's cooldown filter is broken in two ways:

1. **Numeric-window collapse**: `cooldown_pages: 2` and `cooldown_pages: 50` behave identically — the current `matchesCooldown` at `tools/world-mcp/src/tools/select-storylet-candidates.ts:439-446` collapses the numeric `slt_saliency_cooldown_pages` field into a binary "ever previously selected" check, treating any prior selection of the SLT — anywhere in the bundle's event history — as a permanent block.
2. **Cross-branch leak**: `loadSelectedStoryletIds` (lines 408-437) scans every `story_event_record` in the bundle globally, with no branch filter and no page-order context. An SLT selected on sibling branch BR-2 currently blocks the same SLT from being selected on BR-1, violating FOUNDATIONS §Story Bundles §5 Rule 4 (No Globalization by Accident) at story scope.

The parent PG's `branchPath` is already loaded into `PageState.branchPath` at line 237 (`stringArray(parsed.branch_path)`) but is never threaded into `matchesCooldown`. The `filter_trace.after_cooldown` counter is emitted but carries no per-SLT rejection samples, so a forever-blocked SLT cannot be distinguished from an in-window-blocked SLT in `filter_trace` output — operators debugging cooldown behavior cannot tell the two failure modes apart from the trace alone.

The third-iteration source report (`archive/reports/slt-chc-overhaul-third-iteration.md` §6, §11, §17 SPEC-83) and its triage (`docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md` §ACCEPT) verified the bug at the cited line range and folded the cooldown-specific portion of report SPEC-87's `cooldown_active_samples` diagnostic into this spec (the broader §7a-prose-extension portion of SPEC-87 is deferred per the triage's DEFER bucket).

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/tools/select-storylet-candidates.ts:439-446` defines `matchesCooldown` as a binary `Set<string>` membership check; `loadSelectedStoryletIds` at lines 408-437 scans `story_event_record` rows globally with no branch filter. The parent PG's `branchPath` is loaded into `PageState.branchPath` at line 237 via `stringArray(parsed.branch_path)` but never threaded into `matchesCooldown`. The `StoryletCandidateFilterTrace` interface at line 41 currently has 9 fields (`pool_total`, `after_scope`, `after_driver_kind`, `after_action_family`, `after_predicate_shape`, `after_predicate_class`, `after_source_record_id`, `after_mystery_policy`, `after_cooldown`); the additive `cooldown_active_samples` field extends it to 10. The `afterCooldown` filter pass at lines 573-577 is where sample collection lands.
2. SPEC-83 `archive/specs/SPEC-83-slt-cooldown-window-correctness.md` is the authoritative spec; predecessor `archive/specs/SPEC-81-indexed-storylet-candidate-retrieval.md` introduced the `select_storylet_candidates` MCP tool and the `slt_projections.slt_saliency_cooldown_pages` projection column. Source report at `archive/reports/slt-chc-overhaul-third-iteration.md` §6 (verified bug) and triage at `docs/triage/2026-05-25-slt-chc-overhaul-third-iteration-triage.md` §ACCEPT route the cooldown-specific portion of report SPEC-87 (`cooldown_active_samples` diagnostic) into this fix; the broader §7a candidate-filter-trace prose extension is deferred per the triage. The fix uses `SE.created_at_page` (required per `tools/validators/src/schemas/story-event.schema.json:11`) — not `SE.parent_page_id` — as the selection-page filter key, because `created_at_page` is unique per branch (the page the event creates) while `parent_page_id` can be shared across sibling-branch events at a forked ancestor.
3. The `StoryletCandidateFilterTrace` interface IS the cross-skill MCP response contract consumed by sibling skills: `.claude/skills/branching-story-turn-cycle/SKILL.md:158` and `.claude/skills/commitment-block-authoring/SKILL.md:36`/`:112`/`:128`/`:173` both call `mcp__worldloom__select_storylet_candidates` and pass through `filter_trace` to downstream LLM-facing surfaces and to coverage diagnostics. The `cooldown_active_samples` extension is additive-only (new field with an empty-array default at the unblocked-pass code path); consumers reading existing trace fields are unaffected. The shared contract under audit: the response shape declared by `SelectStoryletCandidatesResponse.filter_trace` and the per-call diagnostic-vs-persisted-state boundary that FOUNDATIONS §Story Bundles §5b "Schema-minimalism at story scope" preserves (no new persisted field on `SE` / `PG` / any record class).
4. FOUNDATIONS principles under audit per spec §7: §Story Bundles §5 Rule 4 (No Globalization by Accident — story-scope branch isolation; the cross-branch leak is the Rule-4 violation this fix closes); §Story Bundles §5 Rule 5 (No Consequence Evasion — per-page consequence capacity; the bug REDUCES capacity by forever-blocking eligible SLTs after one use, and the fix restores authoring intent encoded by `cooldown_pages`); §Story Bundles §5b "Schema-minimalism at story scope" (preserved: the `cooldown_active_samples` field is a per-call diagnostic on the response contract, not a persisted field on any record class); §Story Bundles §5c "Driver salience is local" (N/A — cooldown applies uniformly across driver kinds via the same `matchesCooldown` check; the fix touches retrieval-time eligibility, not driver salience ranking).
5. `StoryletCandidateFilterTrace` is the response-shape schema being extended. The extension is additive-only: a new `cooldown_active_samples: ReadonlyArray<{slt_id, last_selected_on_page, distance, cooldown_pages}>` field is added. Consumer-side compatibility — sibling skills (`branching-story-turn-cycle`, `commitment-block-authoring`) read `filter_trace.pool_total` through `filter_trace.after_cooldown` for stage-count diagnostics; they do not destructure or shape-validate the trace beyond field-access patterns, so a new field is backwards-compatible. No persisted-state schema is modified (per FOUNDATIONS §Story Bundles §5b).
6. Helper rename: `loadSelectedStoryletIds` → `loadSelectedStoryletPagesByBranch` (per spec §4.1). Blast radius is internal-only — grep across `tools/*/src/`, `tools/*/tests/`, and `.claude/skills/` for `loadSelectedStoryletIds` returns matches only inside `tools/world-mcp/src/tools/select-storylet-candidates.ts` itself (the function definition at line 408 and the single call site at line 573). The helper is not exported; the rename has zero cross-file consumers. Test files do not reference the helper by name (they invoke `selectStoryletCandidates` as the entry point).
7. Build baseline before source edits: `(workdir tools/world-mcp) npm run build` passed on 2026-05-25. Reassessment also found `tools/world-mcp/src/context-packet/shared.ts` embeds the `filter_trace` type for `story_bundle_context.selection_shortlist`; this is same-seam type fallout of the additive response-shape change and must be updated with the tool interface so `get_context_packet` remains type-truthful when it passes through `selectionShortlist.filter_trace`.

## Architecture Check

1. **Why `SE.created_at_page` and not `SE.parent_page_id`**: the spec's primary correctness claim is branch-isolation under fork scenarios. `SE.parent_page_id` is the page the event forks FROM — multiple sibling-branch events at a forked ancestor share the same `parent_page_id`, so filtering by `parent_page_id ∈ branchPath` would still admit sibling-branch events whose parent_page_id IS the shared ancestor in the current branch's path, leaving the cross-branch leak partially open. `SE.created_at_page` is the page the event creates and lives on; each branch fork produces a distinct child PG, and only the current-branch child appears in `branchPath`. Filtering by `created_at_page ∈ branchPath` precisely identifies events that landed on the current branch (per the new `references/codebase-validation.md` §3.2 §Field-CHOICE drift between sibling schema fields sub-bullet and the SPEC-83 reassessment's I1 finding).
2. **Why a per-call diagnostic, not a persisted trace record**: per FOUNDATIONS §Story Bundles §5b "Schema-minimalism at story scope" and the iteration-2 IMPLEMENTATION-ORDER §Out-of-Scope SSEL rejection at `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md:27` (and the third-iteration report §7 Alternative C rejection), persistent cooldown trace records are explicitly out-of-scope. The `cooldown_active_samples` field sits on the per-call response contract, not on `SE`, `PG`, or any persisted record class — operators get an immediate diagnostic surface without paying the schema-bloat cost of a persisted trace record.
3. **No backwards-compatibility shims**: the helper rename, the algorithm change, and the additive `cooldown_active_samples` field land together. No legacy alias for the old helper name; no compatibility-mode binary check; no `parent_page_id` fallback path. The fixture-update sub-deliverables (D2 + D4) preserve the existing tests' cooldown blocking semantics by adding `created_at_page` to seeded SE records, not by maintaining a legacy code path.

## Verification Layers

1. Numeric-window correctness (cooldown_pages: 2 selected 3 pages ago = eligible; selected 1 page ago = blocked) → unit test (new file `select-storylet-candidates-cooldown-window.test.ts`, cases (a) and (b))
2. Cross-branch isolation under non-fork sibling-branch event (SLT selected on BR-2 doesn't block on BR-1) → unit test (new file, case (c))
3. Fork-scenario cross-branch isolation (shared-ancestor PG-N case: SLT selected on BR-2 forked from PG-N doesn't block on BR-1 forked from PG-N) → unit test (new file, case (e); this is the case the `created_at_page` choice — rather than `parent_page_id` — specifically protects against)
4. Zero-cooldown bypass (cooldown_pages: 0 and null skip the check) → unit test (new file, case (d))
5. SPEC-81 §9.3 hand-counted-pool integration test preserves `after_cooldown: 8` semantics after fixture update → integration test (`tests/integration/spec81-storylet-candidate-retrieval.test.ts`, post-fixture-update assertion)
6. SPEC-81 existing unit test preserves `after_cooldown: 2` semantics after fixture update → unit test (`tests/tools/select-storylet-candidates.test.ts`, post-fixture-update assertion)
7. `cooldown_active_samples` carries up to 3 deterministic sample rejections with `slt_id` / `last_selected_on_page` / `distance` / `cooldown_pages` → unit test (new file, asserted across the within-window cases)
8. FOUNDATIONS §Story Bundles §5 Rule 4 (story-scope branch isolation) at MCP retrieval → FOUNDATIONS alignment check (spec §7 row); proven by Verification Layer 2 + 3 above
9. FOUNDATIONS §Story Bundles §5b (schema-minimalism: no persisted-record schema change) → codebase grep-proof (`grep -r "cooldown_active_samples" tools/validators/src/schemas/` returns zero matches; the field exists only in the MCP tool's TypeScript interface, not in any YAML schema)
10. Cross-skill MCP response contract additive-compatibility → codebase grep-proof (sibling skills' usage of `filter_trace` reads stage-count fields by name without shape-validating; the new field is invisible to them)

## Landed Changes

### 1. Replaced `loadSelectedStoryletIds` with `loadSelectedStoryletPagesByBranch`

In `tools/world-mcp/src/tools/select-storylet-candidates.ts`, the old helper was replaced with `loadSelectedStoryletPagesByBranch(db, worldSlug, storySlug, parentPage)`. The helper:

- Accepts the parent `PageState` (specifically its `branchPath`) so it can scope the scan.
- Builds `branchPagesSet = new Set(parentPage.branchPath)` (O(branchPath.length)).
- Scans `story_event_record` rows once via the existing SQL `SELECT node_id, story_slug, node_type, file_path, body, content_hash FROM nodes WHERE world_slug = ? AND story_slug = ? AND node_type = 'story_event_record'`.
- For each row: parse the body via `parseRecordBody(row)`; skip on parse error; read `parsed.created_at_page` and `parsed.commitment?.selected_slt_id`; skip events whose `created_at_page` is not in `branchPagesSet` (this naturally excludes sibling-branch events because their child PG isn't in the current branch's path) AND skip events whose body lacks `created_at_page` (defensive default for malformed records).
- For each surviving (slt_id, created_at_page) pair: record the page-id with the maximum branch-path index at which the SLT appears (later index = more recent selection); store as `Map<sltId, lastSelectedPageId>` (page-id form, not index form — index is computed at filter-call time so the helper's return shape matches the `cooldown_active_samples` sample field shape and avoids carrying two derivable forms).

### 2. Rewrote `matchesCooldown` to use page-distance against `branchPath`

The function now takes the new helper's output plus the parent `PageState`:

```ts
function matchesCooldown(
  candidate: Candidate,
  lastSelectedPagesByBranch: ReadonlyMap<string, string>,
  parentPage: PageState,
  storySlug: string
): boolean {
  return cooldownRejectionSample(candidate, lastSelectedPagesByBranch, parentPage, storySlug) === null;
}
```

Edge cases (per spec §4.1):
- `lastSelectedPageId === undefined`: SLT never selected on this branch → pass.
- `lastSelectedBranchIndex === parentBranchIndex` (distance 0): SLT was just selected at the current parent PG → blocked when `cooldown > 0`.
- `cooldown === 0` or `null`: pass (preserved behavior).
- Events whose body lacks `created_at_page`: skipped at the helper (cannot be mapped to a branch-path index); defensive default for legacy fixtures or malformed records. Valid SE records authored against the current schema always carry `created_at_page` (required per `tools/validators/src/schemas/story-event.schema.json:11`).

### 3. Extended `StoryletCandidateFilterTrace` with `cooldown_active_samples`

The interface preserves all 9 existing fields and appends the new field:

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

The trace initializes `cooldown_active_samples: []` so the field is always present in the response.

### 4. Populated `cooldown_active_samples` during the cooldown filter pass

The `afterCooldown` step now:

- Calls the new helper: `const lastSelectedPagesByBranch = loadSelectedStoryletPagesByBranch(opened.db, args.world_slug, args.story_slug, page)`.
- Computes the filter result and collects samples in the same pass: for each candidate in `afterMysteryPolicy`, `cooldownRejectionSample` returns either `null` for eligible candidates or a sample `{slt_id, last_selected_on_page, distance, cooldown_pages}` for an in-window block; sample collection is capped at 3 entries.
- Assigns `trace.cooldown_active_samples = samples` after the filter.

Determinism: take the first 3 in iteration order over `afterMysteryPolicy` (which is already deterministic per the upstream filters — the spec's §4.2 last paragraph confirms this).

### 5. Kept embedded context-packet selection-shortlist trace type in sync

`tools/world-mcp/src/context-packet/shared.ts` now includes the additive `cooldown_active_samples` array on `ContextPacketStoryBundleContext.selection_shortlist.filter_trace`. This is a type-only propagation of the same response contract; `story-bundle-context.ts` already passes through `selectionShortlist.filter_trace`.

### 6. Updated SE-1 fixture in `select-storylet-candidates.test.ts`

In `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`, the SE-1 fixture body changed from:

```
"id: SE-1\ncommitment:\n  selected_slt_id: SLT-9\n"
```

to:

```
"id: SE-1\ncreated_at_page: PG-1\ncommitment:\n  selected_slt_id: SLT-9\n"
```

This preserves the existing `after_cooldown: 2` assertion at lines 199-209 because PG-1 IS in the test's `branch_path: [PG-1, PG-2]` and the SLT-9 selection (cooldown_pages: 2, last_selected at PG-1, parent at PG-2) computes `distance = 1 < 2` → blocked. Without this fixture update, the new helper would skip SE-1 (missing `created_at_page`), SLT-9 would no longer be blocked, and `after_cooldown` would become 3.

The deepEqual assertion now includes `cooldown_active_samples: [{slt_id: "SLT-9", last_selected_on_page: "PG-1", distance: 1, cooldown_pages: 2}]` (one sample because SLT-9 is the only in-window cooldown rejection).

### 7. Added new test file `select-storylet-candidates-cooldown-window.test.ts`

`tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` now has five test cases. Each case seeds a multi-PG fixture using the temp indexed-world helpers from `_shared.ts`.

Test cases:

- **(a) Within-window block**: cooldown_pages: 2, SLT selected at PG-(N-1) on the current branch; parent at PG-N; assert `after_cooldown` reflects the block AND `cooldown_active_samples` carries one entry with `distance: 1, cooldown_pages: 2`.
- **(b) Expired-window pass**: cooldown_pages: 2, SLT selected at PG-(N-3) on the current branch; parent at PG-N; assert the SLT is in the shortlist AND `cooldown_active_samples` does NOT include the SLT (distance 3 > 2 → eligible).
- **(c) Sibling-branch isolation (non-fork)**: SLT selected on branch BR-2 (event's `created_at_page` is PG-on-BR-2, NOT in current branch's `branch_path`); parent on branch BR-1; assert the SLT is eligible on BR-1 AND `cooldown_active_samples` is empty for this SLT.
- **(d) Zero-cooldown pass**: cooldown_pages: 0 (and a second sub-assertion for `null`), SLT selected in the recent past on the current branch; assert the SLT is in the shortlist AND `cooldown_active_samples` is empty (the cooldown check short-circuits at `cooldown <= 0` and emits no sample).
- **(e) Fork-scenario shared-ancestor isolation**: PG-5 forks into PG-6a (BR-1) and PG-6b (BR-2); SE-b selects an SLT to create PG-6b on BR-2; current branch is BR-1 with parent PG-6a; both events share `parent_page_id: PG-5` but only PG-6a is in BR-1's `branch_path`; SE-b's `created_at_page: PG-6b` is NOT in BR-1's `branch_path`, so the new helper excludes SE-b naturally; assert the SLT is eligible on BR-1 AND `cooldown_active_samples` is empty for this SLT. This is the case the `created_at_page` choice — rather than `parent_page_id` — specifically protects against; using `parent_page_id` would have admitted SE-b's selection into BR-1's cooldown bookkeeping because PG-5 IS in BR-1's branch_path.

Each SE fixture in the new test file includes `created_at_page: <PG-id>` per the new helper's required-field expectation.

### 8. Updated SE-1 / SE-2 fixtures in `spec81-storylet-candidate-retrieval.test.ts`

In `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts`, the SE-1 fixture changed from:

```
"id: SE-1",
"commitment:",
"  selected_slt_id: SLT-9",
""
```

to:

```
"id: SE-1",
"created_at_page: PG-1",
"commitment:",
"  selected_slt_id: SLT-9",
""
```

The same `created_at_page: PG-1` insertion landed on SE-2. Both selections sit at PG-1 in the inherited fixture's `branch_path: [PG-1, PG-2]`, so both are within-window blocks under the implemented parent-index calculation (distance 1 → blocked when cooldown_pages > 0).

The deepEqual now includes `cooldown_active_samples` as a 2-entry array in filtered candidate iteration order (`SLT-10` then `SLT-9`, because `node_id` ordering is lexical), both with `last_selected_on_page: "PG-1"`, `distance: 1`, `cooldown_pages: 2` — capped at 3 per the spec's determinism rule; only 2 in-window rejections exist in this fixture so the cap doesn't bite.

This preserves the existing `after_cooldown: 8` assertion because both prior selections sit on the fixture's current branch path and the numeric-window semantics (distance 1 < cooldown 2) agree with the old binary check for this fixture.

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (modify) — helper replacement (§1), `matchesCooldown` rewrite (§2), `StoryletCandidateFilterTrace` interface extension (§3), sample collection in filter pass (§4)
- `tools/world-mcp/src/context-packet/shared.ts` (modify) — embedded `selection_shortlist.filter_trace` type extension (§5)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — SE-1 fixture extension with `created_at_page` (§6); assertion update for `cooldown_active_samples`
- `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` (new) — 5 new cooldown-window test cases (§7)
- `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (modify) — SE-1 + SE-2 fixture extension with `created_at_page` (§8); assertion update for `cooldown_active_samples`

## Out of Scope

- Persistent cooldown trace records (rejected — `archive/specs/IMPLEMENTATION-ORDER-2026-05-25-2.md:27` §Out-of-Scope SSEL rejection; `archive/reports/slt-chc-overhaul-third-iteration.md` §7 Alternative C rejection).
- Schema changes to `SE.commitment` or `PG.state_snapshot` (existing `SE.created_at_page` + `PG.branch_path` schema fields carry the necessary info; both already required per `tools/validators/src/schemas/story-event.schema.json` and `tools/validators/src/schemas/story-page.schema.json`).
- Page-plan §7a candidate-filter summary lines (the broader report SPEC-87 surface is deferred per the triage's DEFER bucket; only the `cooldown_active_samples` portion folds into this fix).
- Server-side full predicate evaluation (iteration-2 §Out-of-Scope holds).
- Cooldown semantics for branch-prefix-scoped or branch-scoped SLTs (their visibility filter already isolates them via `matchesScope`; the cooldown fix applies uniformly to all surviving candidates after `matchesScope`).
- Skill-side updates to `branching-story-turn-cycle` or `commitment-block-authoring` (the additive trace field is invisible to existing consumers; no skill prose change needed).
- World-index, validator-registry, or world-mcp schema-discovery surface changes.

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/world-mcp && npm run build && node --test "dist/tests/tools/select-storylet-candidates-cooldown-window.test.js")` — all five new test cases pass (within-window block, expired-window pass, sibling-branch isolation, zero-cooldown pass, fork-scenario shared-ancestor isolation). Primary correctness gate per spec §8 step 1.
2. `(cd tools/world-mcp && npm run build && node --test "dist/tests/tools/select-storylet-candidates.test.js")` — existing cooldown assertion (`after_cooldown: 2`) continues to pass after SE-1 fixture extension with `created_at_page`; the additive `cooldown_active_samples` field appears in the deepEqual with one entry for SLT-9.
3. `(cd tools/world-mcp && npm run build && node --test "dist/tests/integration/spec81-storylet-candidate-retrieval.test.js")` — SPEC-81 §9.3 hand-counted-pool assertion (`after_cooldown: 8`) preserved after SE-1/SE-2 fixture extension; `cooldown_active_samples` deepEqual carries 2 entries.
4. `(cd tools/world-mcp && npm test)` — full world-mcp test suite passes (full-pipeline verification).
5. `(cd tools/world-mcp && npm run build)` — clean TypeScript build (covers typecheck via tsc; no separate lint script exists in the worldloom tooling layer).

### Invariants

1. **Branch isolation at MCP retrieval (Rule 4)**: events whose `created_at_page` is not in the parent PG's `branch_path` MUST NOT contribute to the cooldown bookkeeping for that parent. Provable by Verification Layer 2 + 3 (sibling-branch and fork-scenario test cases).
2. **Numeric-window correctness (Rule 5 consequence capacity restoration)**: `matchesCooldown` MUST compute distance as `parentBranchIndex - lastSelectedBranchIndex` and return `distance > cooldown`; the binary "ever previously selected" check is the bug being removed and MUST NOT reappear in any code path.
3. **Schema-minimalism preservation (§5b)**: `cooldown_active_samples` MUST exist ONLY on the in-memory `StoryletCandidateFilterTrace` interface in `select-storylet-candidates.ts`; NO new field appears on `SE`, `PG`, or any YAML schema under `tools/validators/src/schemas/`. Provable by codebase grep: `grep -r "cooldown_active_samples" tools/validators/ tools/world-index/` returns zero matches.
4. **Additive-only response contract**: the 9 existing `StoryletCandidateFilterTrace` fields preserve their names, types, and semantics; the new `cooldown_active_samples` field appears with an empty-array default when no in-window rejections occur, so consumers reading only the existing fields are unaffected.
5. **Defensive-default for malformed records**: events whose parsed body lacks `created_at_page` (legacy partial-body fixtures, malformed records) MUST be skipped at the helper, not crash the filter; the helper handles missing-field gracefully.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` (new) — 5 cases per spec §6 acceptance criteria 3-5 + the spec's §2 Goals (d) zero-cooldown + the new AC5 fork-scenario; this file is the primary correctness gate per spec §8 step 1.
2. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (modify) — SE-1 fixture extended with `created_at_page: PG-1`; deepEqual at line 199-209 extended with `cooldown_active_samples` 1-entry array; preserves `after_cooldown: 2` assertion by ensuring the new helper still attributes SE-1's selection to PG-1.
3. `tools/world-mcp/tests/integration/spec81-storylet-candidate-retrieval.test.ts` (modify) — SE-1 + SE-2 fixtures extended with `created_at_page: PG-1`; deepEqual at line 358-369 extended with `cooldown_active_samples` 2-entry array; preserves `after_cooldown: 8` assertion for the hand-counted-pool scaling proof.

### Commands

1. `(cd tools/world-mcp && npm run build && node --test "dist/tests/tools/select-storylet-candidates-cooldown-window.test.js")` — targeted run of the new cooldown-window test file (primary correctness gate).
2. `(cd tools/world-mcp && npm test)` — full world-mcp suite (runs build + every dist/tests/**/*.test.js); verifies the implementation change, the SE-1 fixture update in the existing unit test, and the SE-1/SE-2 fixture updates in the integration test all land cleanly together.
3. `(cd tools/world-mcp && npm run build)` — clean TypeScript build (covers typecheck via tsc). The worldloom tooling layer has no separate `lint` script (no eslint config exists across the repo); `npm run build` is the closest substitute for the spec's `pnpm turbo lint typecheck` Verification command — build verification covers the typecheck portion; the lint portion drops as no-such-tooling.

## Outcome

Completed: 2026-05-25

What changed:

- Replaced the global binary cooldown scan in `tools/world-mcp/src/tools/select-storylet-candidates.ts` with branch-path-aware prior-selection lookup keyed by `SE.created_at_page`, preserving the most recent selected page per SLT on the current branch.
- Reworked cooldown filtering to compare page distance against `slt_saliency_cooldown_pages` and emit additive `filter_trace.cooldown_active_samples` diagnostics capped at three rejection samples.
- Updated the embedded context-packet selection-shortlist trace type in `tools/world-mcp/src/context-packet/shared.ts`.
- Added `tools/world-mcp/tests/tools/select-storylet-candidates-cooldown-window.test.ts` covering within-window block, expired-window pass, sibling-branch isolation, zero/null cooldown bypass, and shared-ancestor fork isolation.
- Updated existing unit and SPEC-81 integration fixtures to include `created_at_page` on seeded SE records and assert the additive cooldown samples.

Deviations from original plan:

- Same-seam type fallout added `tools/world-mcp/src/context-packet/shared.ts` to the touched file set because `get_context_packet` passes through `selectionShortlist.filter_trace`.
- The SPEC-81 hand-counted fixture's deterministic sample order is lexical candidate iteration order (`SLT-10`, then `SLT-9`), not numeric id order.
- The SPEC-81 fixture retained its existing `branch_path: [PG-1, PG-2]`; the seeded selections therefore report distance `1` in samples.

## Verification Result

Passed on 2026-05-25:

1. `(workdir tools/world-mcp) npm run build` — passed before source edits as baseline.
2. `(workdir tools/world-mcp) npm run build` — passed after implementation.
3. `(workdir tools/world-mcp) node --test dist/tests/tools/select-storylet-candidates-cooldown-window.test.js` — 5 tests passed.
4. `(workdir tools/world-mcp) node --test dist/tests/tools/select-storylet-candidates.test.js` — 2 tests passed.
5. `(workdir tools/world-mcp) node --test dist/tests/integration/spec81-storylet-candidate-retrieval.test.js` — initially failed only on expected `cooldown_active_samples` order; after updating the assertion to lexical order, 4 tests passed.
6. `(workdir tools/world-mcp) npm test` — full package suite passed: 447 tests, 0 failures.
