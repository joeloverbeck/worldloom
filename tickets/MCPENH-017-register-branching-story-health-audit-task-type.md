# MCPENH-017: Register branching_story_health_audit task_type with ranking profile + token budget

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` (extend `TASK_TYPES`, add ranking profile, set token budget); new `tools/world-mcp/src/ranking/profiles/branching-story-health-audit.ts` (or extend `canon-pipeline-adjacent.ts`); `tools/world-mcp/tests/` (add task_type coverage); update `branching-story-health-audit/SKILL.md` to switch from `task_type='other'` to the registered task_type after landing
**Deps**: None (parallels MCPENH-009 / MCPENH-012 / MCPENH-013 — registration pattern is well-established)

## Problem

`branching-story-health-audit` Pre-flight loads premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='other', seed_nodes=[...], token_budget=12000)`. The interim `task_type='other'` falls back to `defaultRankingProfile` (per `tools/world-mcp/src/ranking/profiles/index.ts` line 48), which weights generic nodes evenly rather than prioritizing the surfaces the audit actually consumes. This is correctness-adjacent, not load-bearing — the audit's primary world-canon reads are whole-class M + INV record loads via `mcp__worldloom__list_records(... include_full_body=true)`, which work regardless of task_type registration. But the context packet's governing-CFs delivery is degraded relative to a registered profile: generic ranking buries the CFs touching the bundle's cast / location / period / canon-revision delta that Phase 4 canon-baseline-drift cross-references.

A registered `branching_story_health_audit` task_type would prioritize, in order: governing CFs touching cast STENT world_ent_id values; CFs added since the bundle's `canon_revision` baseline (these are the candidates for Phase 4's contradiction-with-active-SF check); CFs touching the bundle's mysteries_in_play[] M-NNNN ids; ontology-grounding context. Token budget 12000 (set explicitly by the skill today as an override above the default 8000) becomes the registered default for this profile.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/ranking/profiles/index.ts` line 17-31 enumerates 13 task_types; the audit skill ships against `task_type='other'` (line 30, falls through to `defaultRankingProfile`). Adding `branching_story_health_audit` is a one-entry extension to the `TASK_TYPES` const + a paired profile entry + a token-budget entry — mechanically identical to MCPENH-009 / MCPENH-012 / MCPENH-013 (the three story-pipeline-adjacent profiles that landed in the May 2026 batch and now power story_bootstrap / story_page_cycle / storylet_pool_authoring).
2. The audit skill's context-packet seed_nodes are: cast STENT `world_ent_id` values + recent in-scope page-history named entities. Phase 4 canon-baseline drift wants CFs added since the bundle's `canon_revision` baseline — this is a TIME-BOUNDED query the ranking profile should privilege. The existing `canon-pipeline-adjacent.ts` profiles already privilege governing-INV and mystery-edge M records; the audit profile would do the same with an additional bias toward recent-CH-affected CFs.
3. Cross-skill / cross-artifact boundary: the task_type is consumed only by the audit skill via `get_context_packet`. No other skill consumes the registered profile.
4. FOUNDATIONS Tooling Recommendation motivation: every skill consuming the context packet should declare a task_type that names its retrieval intent so the ranking profile can be tuned. `task_type='other'` is the catch-all for genuinely unclassified skills; a shipping audit skill is not unclassified.
5. Schema parity: not applicable — registering a task_type extends an enum and adds a profile entry; no record schema changes.

## Architecture Check

1. The pattern is established: every story-pipeline-adjacent skill that ships gets a registered profile. The cleanest placement is to extend `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` with a `branchingStoryHealthAuditRankingProfile` export, then wire it into `index.ts` parallel to the other entries.
2. No backwards-compatibility shim needed: the audit skill's Pre-flight already documents "Until MCPENH-017 lands, `task_type='other'`... the deferred ticket registers `branching_story_health_audit` as a task_type whose ranking profile prioritizes governing CFs touching cast/location/period and CFs added since the bundle's canon_revision baseline." Landing this ticket triggers the one-line skill update.
3. Token budget 12000 is the audit skill's existing override; making it the registered default avoids the skill's explicit `token_budget=12000` argument going forward (the registered default fires automatically).

## Verification Layers

1. **TASK_TYPES enum extends to include `branching_story_health_audit`** → grep `TASK_TYPES` in `tools/world-mcp/src/ranking/profiles/index.ts` after the edit shows the new entry.
2. **`getRankingProfile('branching_story_health_audit')` returns the new profile** → unit test in `tools/world-mcp/tests/ranking/profiles/`.
3. **`DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['branching_story_health_audit'] === 12000`** → unit test.
4. **Skill Pre-flight switches to registered task_type on landing** → `branching-story-health-audit/SKILL.md` Pre-flight Check switches `task_type='other'` to `task_type='branching_story_health_audit'` and removes the explicit `token_budget=12000` override (relying on the registered default).
5. **Profile prioritization observable in packet output** → integration test on a real bundle: with `task_type='branching_story_health_audit'`, the context packet's `body_preview` for governing CFs should include CFs added in the last N change-log entries before any non-recent CF; with `task_type='other'`, ranking is generic.

## What to Change

### 1. Create / extend the ranking profile

Add to `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`:

```typescript
export const branchingStoryHealthAuditRankingProfile: RankingWeights = {
  // Prioritize CFs touching cast STENT world_ent_id values.
  cast_relevance: 1.0,

  // Prioritize CFs added since baseline (Phase 4 canon-baseline drift cross-reference target).
  recent_change_log_affected: 0.9,

  // Prioritize governing INVs (whole-class load is the primary path; packet supplements).
  invariant_relevance: 0.7,

  // Prioritize mystery-edge M records adjacent to mysteries_in_play[].
  mystery_relevance: 0.7,

  // Lower-priority: generic CFs not touching cast / period / mystery.
  generic_canon_fact: 0.3,

  // Ontology grounding context (cast STENT classification).
  ontology_relevance: 0.5
};
```

Exact weight values and field names should align with the existing `RankingWeights` type and other canon-pipeline-adjacent profiles — verify against `policy.ts` and current sibling profiles before finalizing values; the above is illustrative.

### 2. Wire into `index.ts`

```typescript
export const TASK_TYPES = [
  // ... existing entries ...
  "storylet_pool_authoring",
  "branching_story_health_audit",   // NEW
  "other"
] as const;

export const rankingProfilesByTaskType: Record<TaskType, RankingWeights> = {
  // ... existing entries ...
  storylet_pool_authoring: storyletPoolAuthoringRankingProfile,
  branching_story_health_audit: branchingStoryHealthAuditRankingProfile,   // NEW
  other: defaultRankingProfile
};

export const DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number> = {
  // ... existing entries ...
  storylet_pool_authoring: 18000,
  branching_story_health_audit: 12000,   // NEW
  other: 8000
};

export {
  // ... existing exports ...
  branchingStoryHealthAuditRankingProfile,
};
```

### 3. Update generated skill

Once landed, edit `.claude/skills/branching-story-health-audit/SKILL.md`:
- §World-State Prerequisites: change `task_type='other', seed_nodes=[...], token_budget=12000` to `task_type='branching_story_health_audit', seed_nodes=[...]` (drop the explicit budget; registered default applies).
- §World-State Prerequisites: delete the "**Until MCPENH-017 lands**, `task_type='other'`..." paragraph.
- §Pre-flight Check: same simplification.
- §HARD-GATE clause (a): drop the "(`task_type='other'` context packet for governing CFs until MCPENH-017 lands)" parenthetical, replace with "(`task_type='branching_story_health_audit'` context packet for governing CFs)".
- §FOUNDATIONS Alignment table (Tooling Recommendation row): update the parenthetical similarly.

### 4. Update describe-capabilities

`mcp__worldloom__describe_capabilities` enumerates supported task_types — verify `branching_story_health_audit` appears after landing.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — add new profile export)
- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — extend TASK_TYPES + rankingProfilesByTaskType + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE + re-exports)
- `tools/world-mcp/tests/ranking/profiles/` (modify or new test file — add coverage parallel to existing per-task-type tests)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (verify task_type enumeration auto-derives, or modify if not)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — switch task_type from 'other' to 'branching_story_health_audit'; remove explicit token_budget override; remove all "until MCPENH-017 lands" disclosures from §World-State Prerequisites + §Pre-flight + HARD-GATE + FOUNDATIONS Alignment)

## Out of Scope

- SAU allocator support is completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`; RSP allocator support remains tracked in MCPENH-016.
- Page-cycle audit-flag wiring — tracked in BSPAG-002.
- Storylet-pool-authoring audit-mode wiring — tracked in STPOOL-001.
- Tuning the ranking profile's exact weights based on real audit-run packet quality — defer to after a few real-world audit invocations produce evidence.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- ranking/profiles` passes with new branching_story_health_audit coverage.
2. `getRankingProfile('branching_story_health_audit')` returns the new profile (not defaultRankingProfile).
3. `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['branching_story_health_audit'] === 12000`.
4. Manual integration: invoke `branching-story-health-audit` Pre-flight on a real bundle with several change-log entries; observe the context packet's governing-CF ranking prioritizes recent-CH-affected CFs.

### Invariants

1. The audit skill's Pre-flight no longer references `task_type='other'` after landing.
2. The registered profile remains additive — landing it does not regress any other task_type's ranking.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/profiles/branching-story-health-audit.test.ts` (new) — verifies profile registration + weights + token budget; mirrors existing per-task-type test files.

### Commands

1. `cd tools/world-mcp && npm test -- ranking/profiles` — targeted ranking-profile coverage.
2. `cd tools/world-mcp && npm test` — full world-mcp test suite.
3. `cd tools/world-mcp && npm run typecheck` — verify TASK_TYPES + Record exhaustiveness are preserved.
