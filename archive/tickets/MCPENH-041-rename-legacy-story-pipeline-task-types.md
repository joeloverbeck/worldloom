# MCPENH-041: Rename legacy story-pipeline task types to match the rebuilt family

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` TaskType/profile registries, context-packet policy tables, package tests, and same-seam package/repo docs
**Deps**: None blocking; `.claude/skills/branching-story-turn-cycle/SKILL.md` already references `task_type='story_turn_cycle'`. `.claude/skills/commitment-block-authoring/SKILL.md` is not present yet, so this ticket lands the provider-side `commitment_block_authoring` enum/profile before that consumer exists.

## Problem

The rebuilt story-skill family (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`) renames two of the legacy story-pipeline skills:

- `branching-story-page-cycle` → `branching-story-turn-cycle`
- `storylet-pool-authoring` → `commitment-block-authoring`

At intake, the MCP retrieval surface at `tools/world-mcp/src/context-packet/shared.ts` listed `STORY_PIPELINE_TASK_TYPES = ["story_bootstrap", "story_page_cycle", "storylet_pool_authoring", "branching_story_health_audit", "story_fact_promotion_to_canon"]`. Two of those entries (`story_page_cycle`, `storylet_pool_authoring`) were mis-named for the rebuilt family. The new turn-cycle skill calls `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)`; the new commitment-block-authoring skill (when it lands) will call `task_type='commitment_block_authoring'`. This ticket lands both provider-side task types in the package registry before those skills need to dry-run cleanly.

The legacy consumer skills (`branching-story-page-cycle`, `storylet-pool-authoring`) were deleted in the greenfield-plan §D step 1 rollout. No live caller uses the old task type names. The rename is therefore safe — no backwards-compat alias is required.

## Assumption Reassessment (2026-05-13)

1. **TaskType registry file verified.** `tools/world-mcp/src/ranking/profiles/index.ts` defines the exported `TASK_TYPES` tuple, `TaskType` union, ranking-profile map, and default-budget map. `tools/world-mcp/src/context-packet/shared.ts` derives `STORY_PIPELINE_TASK_TYPES` from that `TaskType` union.
2. **Retrieval profile coverage.** The legacy names appear across the ranking profile registry, story-pipeline task-type list, governing-context policy tables, governing full-body priority map, full-body delivery rules, package tests, `tools/world-mcp/README.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and `docs/MACHINE-FACING-LAYER.md`. The rename must update all current enum/profile/policy consumers, not only `shared.ts`.
3. **Cross-skill reference parity.** `.claude/skills/branching-story-turn-cycle/SKILL.md` already calls `mcp__worldloom__get_context_packet(... task_type='story_turn_cycle' ...)` and has a current MCPENH-041 debt note. `.claude/skills/commitment-block-authoring/SKILL.md` does not exist in this checkout; per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`, the provider enum should still land as `commitment_block_authoring` before that skill is authored.
4. **FOUNDATIONS principle.** This ticket carries no new FOUNDATIONS implication — it realigns string identifiers to match the rebuilt skill names. No Rule 1-7 or §Story Bundles principle is added or weakened.
5. **HARD-GATE / canon-write impact.** None. The MCP retrieval surface is read-only; renaming task types does not change canon-mutation paths.
6. **Schema extension impact.** No schema extension. This is a string rename within an existing enum.
7. **Rename / removal blast radius.** `rg -n 'story_page_cycle|storylet_pool_authoring|story_turn_cycle|commitment_block_authoring' tools/world-mcp docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` identifies the live same-seam source, test, docs, and current skill-consumer sites. Historical archived tickets are not updated; they preserve the old task names as provenance.
8. **Adjacent contradictions.** The legacy retrieval profiles (under `tools/world-mcp/src/ranking/profiles/`) were authored for the deleted skills. Their seed-node prioritization and token-budget defaults may or may not match the rebuilt skills' actual needs. Re-tuning is out of scope for this ticket; record the carry-forward as future work if the rebuilt skills surface a retrieval-quality issue.

## Architecture Check

1. **String rename, not aliasing.** No legacy alias retained — the legacy consumer skills are deleted, so no caller would benefit from a `story_page_cycle → story_turn_cycle` alias mapping. A retained alias would be dead code that future maintainers would have to investigate to confirm safety of removal.
2. **No backwards-compatibility shim.** Per Architecture Check 1.

## Verification Layers

1. **`story_turn_cycle` task_type accepted**: package-local `getContextPacket(...)` and compiled `tools/world-mcp` tests return a valid packet with no unsupported-task-type error. → Package handler/test harness.
2. **`commitment_block_authoring` task_type accepted**: same shape as above. → Package handler/test harness.
3. **Legacy task_types rejected**: `task_type='story_page_cycle'` and `task_type='storylet_pool_authoring'` are absent from the source enum, wrapped MCP schema metadata, and package docs. → Compile-time enum removal plus source/docs grep proof.
4. **No same-seam source/docs hits for legacy task types**: post-change grep over `tools/world-mcp/src`, `tools/world-mcp/tests`, `tools/world-mcp/README.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and `.claude/skills/branching-story-turn-cycle/SKILL.md` returns no current-contract hits for the legacy names.
5. **Cross-skill alignment**: `.claude/skills/branching-story-turn-cycle/SKILL.md` remains aligned to `task_type='story_turn_cycle'`, and its MCPENH-041 debt note is removed or historicalized now that the provider enum lands. The future commitment-block-authoring skill remains out of scope because it is not present.

## Landed Changes

### 1. Renamed story-pipeline task-type entries

`tools/world-mcp/src/context-packet/shared.ts` now lists `story_turn_cycle` and `commitment_block_authoring` in `STORY_PIPELINE_TASK_TYPES`, with matching governing full-body reserve policy entries.

### 2. Rename entries in the broader `TASK_TYPES` constant

`tools/world-mcp/src/ranking/profiles/index.ts` now exposes `story_turn_cycle` and `commitment_block_authoring` in `TASK_TYPES`, `rankingProfilesByTaskType`, and `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`.

### 3. Rename retrieval-ranking profile exports

The live retrieval profiles are exports in `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`, not per-task files. The profile identifiers now match the rebuilt names while preserving the inherited weights and 18000 default budgets.

### 4. Update documentation references

`tools/world-mcp/README.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, and the current `branching-story-turn-cycle` skill now enumerate or consume the rebuilt task types. Archived tickets that mention the legacy strings remain historical evidence.

### 5. Update tests

Accepted-task, default-budget, story-pipeline, full-body policy, and capability metadata tests now use the rebuilt task types. `tools/world-mcp/tests/server/dispatch.test.ts` also preserves the two legacy literals only inside an explicit MCP-boundary rejection test.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — `STORY_PIPELINE_TASK_TYPES`)
- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — `TASK_TYPES` if applicable)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — profile export names)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — task-specific governing policy keys and labels)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — full-body rule keys)
- `tools/world-mcp/README.md` (modify — task-type/default-budget/full-body docs)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — task-type enum, story-pipeline sections, full-body/reserve tables)
- `docs/MACHINE-FACING-LAYER.md` (modify — machine-facing task-type/default-budget/full-body docs)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — remove/historicalize now-stale MCPENH-041 debt note)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — accepted task/default-budget cases)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — story-pipeline story_slug/story_bundle_context cases)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — capability metadata and legacy rejection test)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — reserve-policy task-specific tests)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — story-pipeline budget case)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — story-pipeline context case)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify — profile/default-budget assertions)

## Out of Scope

- Retuning retrieval-ranking profile SEED_NODE_BIASES or TOKEN_BUDGET defaults for the rebuilt skills (separate concern; address if/when the rebuilt skills surface retrieval-quality issues).
- Adding a `task_type='story_promotion_closeout'` for the new closeout skill (the closeout skill ships separately; the gap-filler interview for that skill will decide whether to add a new task_type or reuse `story_fact_promotion_to_canon`).
- Adding a `task_type='branching_story_prose_attach'` (prose-attach is a deterministic-validator skill; whether it needs context-packet retrieval at all is a gap-filler-time decision for that skill).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` passes.
2. Focused compiled package tests pass for accepted task types, default budgets, story-pipeline `story_slug` requirements, governing full-body policy, capability metadata, and legacy MCP-boundary rejection.
3. `rg -n 'story_page_cycle|storylet_pool_authoring' tools/world-mcp/src tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` returns zero current-contract hits. The only remaining same-package test hits are the intentional legacy rejection literals in `tools/world-mcp/tests/server/dispatch.test.ts`.
4. `rg -n 'story_turn_cycle|commitment_block_authoring' tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` returns the expected current-contract hits.

### Invariants

1. No live caller uses the legacy task type strings after this ticket lands.
2. The retrieval profile registry exhaustively covers the rebuilt skills' task types.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` and `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify) — replace legacy accepted task-type cases with `story_turn_cycle` and `commitment_block_authoring`.
2. `tools/world-mcp/tests/server/dispatch.test.ts` (modify) — assert wrapped capability metadata exposes the renamed task types through `describe_capabilities`, and assert legacy task types fail at the MCP validation boundary.
3. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts`, `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts`, `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts`, and `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify as needed) — update task-specific policy/default-budget assertions.

### Commands

1. `cd tools/world-mcp && npm run build` — compiled source and tests.
2. `cd tools/world-mcp && node --test dist/tests/ranking/profile-overrides.test.js dist/tests/tools/get-context-packet.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/story-bundle-budget.test.js dist/tests/context-packet/story-bundle-context.test.js` — focused package proof.
3. `cd tools/world-mcp && node --test --test-name-pattern 'describe_capabilities dispatches through the MCP boundary with no arguments|legacy story task types fail at the MCP validation boundary' dist/tests/server/dispatch.test.js` — MCP registration/rejection boundary proof.
4. `rg -n 'story_page_cycle|storylet_pool_authoring' tools/world-mcp/src tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` — returns zero current-contract matches.
5. `rg -n 'story_page_cycle|storylet_pool_authoring' tools/world-mcp/tests` — returns only the intentional rejection literals in `tools/world-mcp/tests/server/dispatch.test.ts`.
6. `rg -n 'story_turn_cycle|commitment_block_authoring' tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` — returns matches confirming the rename landed.

## Outcome

Renamed the story-pipeline task-type contract from `story_page_cycle` / `storylet_pool_authoring` to `story_turn_cycle` / `commitment_block_authoring` across `tools/world-mcp` registries, profile exports, context-packet governing policy tables, full-body delivery rules, docs, and focused tests. Removed the now-stale MCPENH-041 integration-debt note from `branching-story-turn-cycle`.

No backwards-compatibility alias or runtime shim was introduced.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/ranking/profile-overrides.test.js dist/tests/tools/get-context-packet.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/story-bundle-budget.test.js dist/tests/context-packet/story-bundle-context.test.js` — passed, 25 tests.
3. `cd tools/world-mcp && node --test --test-name-pattern 'describe_capabilities dispatches through the MCP boundary with no arguments|legacy story task types fail at the MCP validation boundary' dist/tests/server/dispatch.test.js` — passed, 2 tests.
4. `rg -n 'story_page_cycle|storylet_pool_authoring' tools/world-mcp/src tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` — passed with zero hits.
5. `rg -n 'story_page_cycle|storylet_pool_authoring' tools/world-mcp/tests` — returned only `tools/world-mcp/tests/server/dispatch.test.ts:504`, the intentional legacy rejection test literals.
6. `rg -n 'story_turn_cycle|commitment_block_authoring' tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-turn-cycle/SKILL.md` — returned the expected current-contract hits.

## Deviations

`cd tools/world-mcp && npm test` was attempted after the implementation and did not pass. The failures are outside this ticket's task-type rename seam: SPEC-22 tests still read deleted legacy skill files under `.claude/skills/branching-story-bootstrap` / `.claude/skills/branching-story-page-cycle`, `get_record_schema` tests still reference missing `tools/validators/src/schemas/story-arc-trace.schema.json`, and one `validatePatchPlan` BEL pre-apply expectation currently returns `fail` instead of `pass`. The focused build, task-type/profile tests, capability metadata test, rejection test, and grep proofs above cover MCPENH-041's owned invariant.
