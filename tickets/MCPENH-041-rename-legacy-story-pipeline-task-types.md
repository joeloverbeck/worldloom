# MCPENH-041: Rename legacy story-pipeline task types to match the rebuilt family

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/shared.ts` (TaskType list + retrieval profile names) and any downstream code that references the legacy strings
**Deps**: None blocking; ships alongside or shortly after `.claude/skills/branching-story-turn-cycle/SKILL.md` and `.claude/skills/commitment-block-authoring/SKILL.md` (the consumer skills that reference the renamed task types).

## Problem

The rebuilt story-skill family (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`) renames two of the legacy story-pipeline skills:

- `branching-story-page-cycle` → `branching-story-turn-cycle`
- `storylet-pool-authoring` → `commitment-block-authoring`

The MCP retrieval surface at `tools/world-mcp/src/context-packet/shared.ts` currently lists `STORY_PIPELINE_TASK_TYPES = ["story_bootstrap", "story_page_cycle", "storylet_pool_authoring", "branching_story_health_audit", "story_fact_promotion_to_canon"]`. Two of those entries (`story_page_cycle`, `storylet_pool_authoring`) are mis-named for the rebuilt family. The new turn-cycle skill calls `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)`; the new commitment-block-authoring skill (when it lands) will call `task_type='commitment_block_authoring'`. Both task types must exist in the registry before those skills can dry-run cleanly.

The legacy consumer skills (`branching-story-page-cycle`, `storylet-pool-authoring`) were deleted in the greenfield-plan §D step 1 rollout. No live caller uses the old task type names. The rename is therefore safe — no backwards-compat alias is required.

## Assumption Reassessment (2026-05-13)

1. **TaskType registry file verified.** `tools/world-mcp/src/context-packet/shared.ts:237-243` defines `STORY_PIPELINE_TASK_TYPES`. The broader `TASK_TYPES` constant in `tools/world-mcp/src/ranking/profiles/index.ts:19` also includes these entries.
2. **Retrieval profile coverage.** Each `story_pipeline` TaskType has an associated retrieval-ranking profile that scores nodes for prioritization. The rename must update the profile name AND any internal references to the task type string (registry lookup, telemetry tags, error messages).
3. **Cross-skill reference parity.** Two skills reference these task types: the new `branching-story-turn-cycle/SKILL.md` Pre-flight + Guardrails (lands in the same commit window as this ticket) and a forthcoming `commitment-block-authoring/SKILL.md` (per the greenfield plan §D step 6).
4. **FOUNDATIONS principle.** This ticket carries no new FOUNDATIONS implication — it realigns string identifiers to match the rebuilt skill names. No Rule 1-7 or §Story Bundles principle is added or weakened.
5. **HARD-GATE / canon-write impact.** None. The MCP retrieval surface is read-only; renaming task types does not change canon-mutation paths.
6. **Schema extension impact.** No schema extension. This is a string rename within an existing enum.
7. **Rename / removal blast radius.** `rg -n "story_page_cycle|storylet_pool_authoring" tools/ docs/ .claude/skills/` identifies all sites that need updating. Expected sites: `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/ranking/profiles/<task-type-files>.ts`, possibly `tools/world-mcp/README.md`, any test fixtures referencing the legacy task types, possibly `docs/CONTEXT-PACKET-CONTRACT.md` if it enumerates task types.
8. **Adjacent contradictions.** The legacy retrieval profiles (under `tools/world-mcp/src/ranking/profiles/`) were authored for the deleted skills. Their seed-node prioritization and token-budget defaults may or may not match the rebuilt skills' actual needs. Re-tuning is out of scope for this ticket; record the carry-forward as future work if the rebuilt skills surface a retrieval-quality issue.

## Architecture Check

1. **String rename, not aliasing.** No legacy alias retained — the legacy consumer skills are deleted, so no caller would benefit from a `story_page_cycle → story_turn_cycle` alias mapping. A retained alias would be dead code that future maintainers would have to investigate to confirm safety of removal.
2. **No backwards-compatibility shim.** Per Architecture Check 1.

## Verification Layers

1. **`story_turn_cycle` task_type accepted**: `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', ...)` returns a valid packet (no "unsupported task_type" error). → MCP-tool invocation in test harness.
2. **`commitment_block_authoring` task_type accepted**: same shape as above. → test harness.
3. **Legacy task_types rejected**: `task_type='story_page_cycle'` and `task_type='storylet_pool_authoring'` return clear unsupported-task-type errors. → test harness.
4. **No grep hits for legacy task types**: `rg -n "story_page_cycle|storylet_pool_authoring" tools/world-mcp/src/` returns zero matches after this ticket lands (excluding any rejection-path string).
5. **Cross-skill alignment**: `.claude/skills/branching-story-turn-cycle/SKILL.md` references `task_type='story_turn_cycle'` (verified at ticket-write time) and the future `.claude/skills/commitment-block-authoring/SKILL.md` will reference `task_type='commitment_block_authoring'` (verified when that skill lands).

## What to Change

### 1. Rename entries in `STORY_PIPELINE_TASK_TYPES`

In `tools/world-mcp/src/context-packet/shared.ts`:

```diff
 export const STORY_PIPELINE_TASK_TYPES = [
   "story_bootstrap",
-  "story_page_cycle",
-  "storylet_pool_authoring",
+  "story_turn_cycle",
+  "commitment_block_authoring",
   "branching_story_health_audit",
   "story_fact_promotion_to_canon"
 ] as const satisfies readonly TaskType[];
```

### 2. Rename entries in the broader `TASK_TYPES` constant

In `tools/world-mcp/src/ranking/profiles/index.ts`, apply the same rename. Verify the `TaskType` type union (if exported separately) is consistent.

### 3. Rename or refactor retrieval-ranking profile files

The retrieval profiles under `tools/world-mcp/src/ranking/profiles/` likely include per-task-type profile files. Rename:

- `story-page-cycle.ts` (or equivalent) → `story-turn-cycle.ts`
- `storylet-pool-authoring.ts` (or equivalent) → `commitment-block-authoring.ts`

Update internal references (export names, profile keys, telemetry tags). The profiles' SEED_NODE_BIASES and TOKEN_BUDGET defaults are inherited as-is — retuning is out of scope (see Assumption Reassessment item 8).

### 4. Update documentation references

`tools/world-mcp/README.md` and `docs/CONTEXT-PACKET-CONTRACT.md` (if either enumerates task types) — replace legacy names with the new ones. Add a one-line note in the changelog or top-of-file commentary that the rename happened (so future maintainers grepping for the legacy strings find the new names).

### 5. Update tests

Any test fixtures or integration tests referencing `story_page_cycle` / `storylet_pool_authoring` — rename to the new task types. Where tests verify a specific profile's retrieval behavior, the test name should also be renamed for clarity.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — `STORY_PIPELINE_TASK_TYPES`)
- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — `TASK_TYPES` if applicable)
- `tools/world-mcp/src/ranking/profiles/story-page-cycle.ts` → rename to `story-turn-cycle.ts` (and update internal exports)
- `tools/world-mcp/src/ranking/profiles/storylet-pool-authoring.ts` → rename to `commitment-block-authoring.ts` (same)
- `tools/world-mcp/README.md` (modify if enumerates task types)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify if enumerates task types)
- `tools/world-mcp/tests/**/*.ts` (modify any test fixtures referencing legacy names)

## Out of Scope

- Retuning retrieval-ranking profile SEED_NODE_BIASES or TOKEN_BUDGET defaults for the rebuilt skills (separate concern; address if/when the rebuilt skills surface retrieval-quality issues).
- Adding a `task_type='story_promotion_closeout'` for the new closeout skill (the closeout skill ships separately; the gap-filler interview for that skill will decide whether to add a new task_type or reuse `story_fact_promotion_to_canon`).
- Adding a `task_type='branching_story_prose_attach'` (prose-attach is a deterministic-validator skill; whether it needs context-packet retrieval at all is a gap-filler-time decision for that skill).

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__get_context_packet(world_slug='<test>', task_type='story_turn_cycle', seed_nodes=[...])` returns a valid packet.
2. `mcp__worldloom__get_context_packet(world_slug='<test>', task_type='commitment_block_authoring', seed_nodes=[...])` returns a valid packet.
3. `mcp__worldloom__get_context_packet(world_slug='<test>', task_type='story_page_cycle', seed_nodes=[...])` returns a clear unsupported-task-type error.
4. `mcp__worldloom__get_context_packet(world_slug='<test>', task_type='storylet_pool_authoring', seed_nodes=[...])` returns a clear unsupported-task-type error.
5. Full `tools/world-mcp` test suite passes.

### Invariants

1. No live caller uses the legacy task type strings after this ticket lands.
2. The retrieval profile registry exhaustively covers the rebuilt skills' task types.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/get-context-packet.test.ts` (modify) — replace legacy task-type test cases with `story_turn_cycle` and `commitment_block_authoring`.
2. `tools/world-mcp/tests/integration/unsupported-task-type-rejection.test.ts` (modify or add) — assert legacy task types are rejected.

### Commands

1. `cd tools/world-mcp && npm test` — full MCP suite passes.
2. `rg -n "story_page_cycle|storylet_pool_authoring" tools/world-mcp/src/` — returns zero matches (excluding rejection-path strings).
3. `rg -n "story_turn_cycle|commitment_block_authoring" tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/src/ranking/profiles/` — returns matches confirming the rename landed.
