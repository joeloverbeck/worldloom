# MCPENH-017: Register branching_story_health_audit task_type with ranking profile + token budget

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` (extended `TASK_TYPES`, added ranking profile, set token budget); `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (added profile export); `tools/world-mcp/src/context-packet/` exhaustive task-type maps (reserve governing M/INV full bodies and include audit governing context); `tools/world-mcp/tests/` (added task_type coverage); `.claude/skills/branching-story-health-audit/SKILL.md` and context-packet docs now use the registered task_type
**Deps**: None (parallels MCPENH-009 / MCPENH-012 / MCPENH-013 — registration pattern is well-established)

## Problem

At intake, `branching-story-health-audit` Pre-flight loaded premise-bounded world-canon retrieval via `mcp__worldloom__get_context_packet(world_slug, task_type='other', seed_nodes=[...], token_budget=12000)`. The interim `task_type='other'` fell back to `defaultRankingProfile`, which weighted generic nodes evenly rather than prioritizing the surfaces the audit actually consumes. This was correctness-adjacent, not load-bearing — the audit's primary world-canon reads are whole-class M + INV record loads via `mcp__worldloom__list_records(... include_full_body=true)`, which work regardless of task_type registration. But the context packet's governing-CFs delivery was degraded relative to a registered profile: generic ranking buried the CFs touching the bundle's cast / location / period / canon-revision delta that Phase 4 canon-baseline-drift cross-references.

The completed `branching_story_health_audit` task_type prioritizes governing CFs touching cast STENT world_ent_id values, recent change-log context for the bundle's `canon_revision` baseline, CFs touching the bundle's `mysteries_in_play[]` M-NNNN ids, and ontology-grounding context. Token budget 12000 is now the registered default for this profile.

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/ranking/profiles/index.ts` enumerated 13 task_types before this ticket; the audit skill shipped against `task_type='other'`, which fell through to `defaultRankingProfile`. Adding `branching_story_health_audit` was a one-entry extension to the `TASK_TYPES` const + a paired profile entry + a token-budget entry — mechanically identical to MCPENH-009 / MCPENH-012 / MCPENH-013 (the three story-pipeline-adjacent profiles that landed in the May 2026 batch and now power story_bootstrap / story_page_cycle / storylet_pool_authoring).
2. The audit skill's context-packet seed_nodes are cast STENT `world_ent_id` values + recent in-scope page-history named entities. Phase 4 canon-baseline drift wants CFs added since the bundle's `canon_revision` baseline; the live ranking model exposes that as `change_log_entry` priority plus `recency_of_modification_bonus`, not the illustrative `recent_change_log_affected` weight named in the draft.
3. Cross-skill / cross-artifact boundary: the task_type is produced by `tools/world-mcp` and consumed by the audit skill via `get_context_packet`; context-packet contract docs, package README, `docs/MACHINE-FACING-LAYER.md`, and `describe_capabilities` metadata also expose the enum/default-budget surface.
4. FOUNDATIONS Tooling Recommendation motivation: every skill consuming the context packet should declare a task_type that names its retrieval intent so the ranking profile can be tuned. `task_type='other'` is the catch-all for genuinely unclassified skills; a shipping audit skill is not unclassified.
5. Schema parity: not applicable — registering a task_type extends an enum and adds a profile entry; no record schema changes.
6. Same-seam package fallout: `TaskType` drives exhaustive `Record<TaskType, ...>` maps in `tools/world-mcp/src/context-packet/shared.ts`, `full-body-delivery.ts`, and `governing-world-context.ts`. The audit requires governing CF context and already whole-class-loads M + INV, so the registered context-packet path now reserves governing M/INV full bodies and includes the latest CH node for canon-revision audit trail, matching the ticket's ranking intent.
7. Proof-surface correction: the drafted `tools/world-mcp/tests/ranking/profiles/` directory does not exist; live ranking tests sit under `tools/world-mcp/tests/ranking/`. Direct live `mcp__worldloom__describe_capabilities` is not exposed in this Codex toolset, so package-local build/tests and in-memory dispatch/capability tests are the truthful substitute.

## Architecture Check

1. The pattern is established: every story-pipeline-adjacent skill that ships gets a registered profile. The cleanest placement is to extend `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` with a `branchingStoryHealthAuditRankingProfile` export, then wire it into `index.ts` parallel to the other entries.
2. No backwards-compatibility shim was introduced. The audit skill now calls `task_type='branching_story_health_audit'` directly and relies on the registered default budget.
3. Token budget 12000 was the audit skill's existing override; making it the registered default removed the explicit skill override without changing the intended packet size.

## Verification Layers

1. **TASK_TYPES enum extends to include `branching_story_health_audit`** → grep `TASK_TYPES` in `tools/world-mcp/src/ranking/profiles/index.ts` after the edit shows the new entry.
2. **`getRankingProfile('branching_story_health_audit')` returns the new profile** → unit tests in `tools/world-mcp/tests/ranking/profile-lookup.test.ts` and `tools/world-mcp/tests/ranking/profile-overrides.test.ts`.
3. **`DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['branching_story_health_audit'] === 12000`** → unit test.
4. **Skill Pre-flight uses the registered task_type** → `branching-story-health-audit/SKILL.md` Pre-flight Check uses `task_type='branching_story_health_audit'` and omits the explicit `token_budget=12000` override (relying on the registered default).
5. **Profile prioritization observable in package output** → package tests assert the new task's default budget, non-default ranking profile, governing full-body reservation, latest change-log inclusion for canon-revision audit trail, and `describe_capabilities` enum exposure. A real-bundle manual packet-quality tuning run remains out of scope.

## Landed Changes

### 1. Create / extend the ranking profile

Added `branchingStoryHealthAuditRankingProfile` to `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` with elevated canon fact, invariant, Mystery Reserve, named entity, section, domain, change-log, recency, and structured-edge weights.

### 2. Wire into `index.ts`

Added `branching_story_health_audit` to `TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`, and profile re-exports in `tools/world-mcp/src/ranking/profiles/index.ts`.

### 3. Update generated skill

Updated `.claude/skills/branching-story-health-audit/SKILL.md` so HARD-GATE, Process Flow, World-State Prerequisites, Pre-flight, and FOUNDATIONS Alignment all use `task_type='branching_story_health_audit'` and no longer require an explicit `token_budget=12000` override.

### 4. Update describe-capabilities

`describe_capabilities` derives supported task_types from `TASK_TYPES`; server dispatch and tool-level tests now verify `branching_story_health_audit` appears in that enum surface.

### 5. Update context-packet exhaustive maps and docs

Added `branching_story_health_audit` to the context-packet task-type maps that compile against `TaskType`, reserve governing invariant and Mystery Reserve full bodies, include the latest change-log entry for canon-revision audit trail, and updated `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` default-budget/task-type prose.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — add new profile export)
- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — extend TASK_TYPES + rankingProfilesByTaskType + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE + re-exports)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — add reserve full-body priority)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — add full-body candidate rules)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — add governing context, latest CH audit-trail behavior)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify — add coverage parallel to existing per-task-type tests)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — default budget and latest CH coverage)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — reserve governing M/INV full-body coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — verify enum auto-derives through capabilities)
- `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md` (modify — task-type/default-budget docs)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — switch task_type from 'other' to 'branching_story_health_audit'; remove explicit token_budget override; remove all "until MCPENH-017 lands" disclosures from §World-State Prerequisites + §Pre-flight + HARD-GATE + FOUNDATIONS Alignment)

## Out of Scope

- SAU allocator support is completed in `archive/tickets/MCPENH-015-add-sau-id-class-to-allocator.md`; RSP allocator support is completed in `archive/tickets/MCPENH-016-add-rsp-id-class-to-allocator-sub-audit-scoped.md`.
- Page-cycle audit-flag wiring — tracked in BSPAG-002.
- Storylet-pool-authoring audit-mode wiring — tracked in STPOOL-001.
- Tuning the ranking profile's exact weights based on real audit-run packet quality — defer to after a few real-world audit invocations produce evidence.

## Acceptance Criteria

### Tests That Must Pass

1. Focused compiled tests pass with new branching_story_health_audit coverage.
2. `getRankingProfile('branching_story_health_audit')` returns the new profile (not defaultRankingProfile).
3. `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['branching_story_health_audit'] === 12000`.
4. Package-local context-packet tests prove the new task type receives the registered default budget, reserves governing M/INV full bodies, and includes the latest change-log entry for canon-revision audit trail.

### Invariants

1. The audit skill's Pre-flight no longer references `task_type='other'`.
2. The registered profile remains additive — landing it does not regress any other task_type's ranking.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — verifies profile registration + weights + token budget; mirrors existing per-task-type test coverage.
2. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — verifies default budget and latest CH governing-context behavior.
3. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — verifies reserve governing M/INV full bodies.
4. `tools/world-mcp/tests/server/dispatch.test.ts` and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — verify `describe_capabilities` enum exposure.

### Commands

1. `cd tools/world-mcp && node --test dist/tests/ranking/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — targeted compiled package coverage after `npm run build`.
2. `cd tools/world-mcp && npm test` — full world-mcp test suite.
3. `cd tools/world-mcp && npm run build` — verify TASK_TYPES + Record exhaustiveness are preserved.

## Outcome

Completed: 2026-05-03.

Completed. `branching_story_health_audit` is registered as a `tools/world-mcp` task type with a non-default ranking profile and a 12000 default token budget. Context-packet assembly now gives the audit task reserve governing invariant and Mystery Reserve full-body treatment, includes the latest change-log entry for canon-revision audit trail, and exposes the new task type through `describe_capabilities`. The audit skill and context-packet docs now call and document the registered task type directly.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed after one test assertion was tightened for strict optional access.
2. `cd tools/world-mcp && node --test dist/tests/ranking/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — passed; 8 compiled test files passed.
3. `cd tools/world-mcp && npm test` — passed; package build plus full compiled suite reported 286 passing tests.
4. `git diff --check` — passed.
5. Stale-anchor sweep over `.claude/skills/branching-story-health-audit/SKILL.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, `tools/world-mcp/src`, and `tools/world-mcp/tests` found no remaining live-consumer `task_type='other'`, `token_budget=12000`, or MCPENH-017 fallback wording for the audit skill.

## Deviations

The drafted `cd tools/world-mcp && npm test -- ranking` command was replaced with direct compiled `node --test dist/...` focused coverage because the package `npm test` script is a compiled-output wrapper. Direct live `mcp__worldloom__describe_capabilities` was unavailable in this Codex session; in-memory package dispatch and describe-capabilities tests are the truthful substitute for source-level enum exposure.
