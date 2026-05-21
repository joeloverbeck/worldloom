# SPEC60STCHARMACLAY-002: MCP `story_character_profile` task profile

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` ranking profiles + context-packet governing-world maps + story-pipeline task-type set; introduces the `story_character_profile` task type. No impact on existing task types (additive).
**Deps**: None

## Problem

`story-character-profile/SKILL.md` (~line 160) calls `mcp__worldloom__get_context_packet(world_slug, task_type='story_character_profile', story_slug=…)`, but `story_character_profile` is absent from `TASK_TYPES` (`tools/world-mcp/src/ranking/profiles/index.ts:19-36`). The call currently errors at `get-context-packet.ts:71-72` (`Unsupported task_type`). The skill has no matching ranking profile or governing-world context, so STCHAR authoring cannot retrieve its source `CHAR-*` dossier or story-bundle context through the documented context-packet pattern.

## Assumption Reassessment (2026-05-21)

1. `TASK_TYPES` (`tools/world-mcp/src/ranking/profiles/index.ts:19`) does not contain `story_character_profile` (confirmed). The story-pipeline ranking profiles live in `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (e.g., `storyBootstrapRankingProfile`, `storyTurnCycleRankingProfile`). `get-context-packet.ts:71` rejects unknown task types; `:79` requires `story_slug` for story-pipeline types via `isStoryPipelineTaskType` (`shared.ts:412`).
2. `story-character-profile/SKILL.md` calls `get_context_packet(task_type='story_character_profile', story_slug=…)` with `create_from_world_char` / `create_story_local` / `regenerate` modes (confirmed at SKILL.md ~line 160). The new type requires `story_slug`, so it is a story-pipeline task type and MUST be added to `STORY_PIPELINE_TASK_TYPES` (`shared.ts:404`).
3. **Cross-package / cross-skill boundary under audit**: the `story_character_profile` token is the contract shared between the `story-character-profile` skill (consumer) and `world-mcp` (provider). The seam is wider than the spec's §2.2 named two maps: `story_character_profile` must be added to **every exhaustive `Record<TaskType, …>` map** or `world-mcp` fails to typecheck — `rankingProfilesByTaskType` (`profiles/index.ts:39`), `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` (`profiles/index.ts:55+`), `GOVERNING_FILE_PATHS` (`governing-world-context.ts:14`), `ACTIVE_RULES` (`:110`), `REQUIRED_OUTPUT_SCHEMA` (`:203`), `PROHIBITED_MOVES` (`:251`), and `FULL_BODY_RULES_BY_TASK_TYPE` (`full-body-delivery.ts:29`) — plus the `TASK_TYPES` source array and the `STORY_PIPELINE_TASK_TYPES` set. `GOVERNING_ATOMIC_NODE_TYPES` (`governing-world-context.ts:346`) is `Partial<Record<TaskType, …>>` (optional — add an entry only if the profile needs governing atomic node types). These sites cannot land independently (TypeScript exhaustiveness), so they belong in one ticket. Surfaced as the Step 2 (g) in-ticket expansion (intent-preserving under-enumeration, not a separate Issue).
4. **§Tooling Recommendation (FOUNDATIONS)**: "LLM agents should never operate on prose alone … via the documented context-packet + targeted-retrieval pattern." A skill that calls `get_context_packet` with a task type that has no profile is forced into ad-hoc reads; defining the profile restores the documented retrieval path. New entries are modeled on the existing story-pipeline task types (e.g., `story_bootstrap`) for the governing-world maps, with story-bundle context for `create_story_local` and targeted source-`CHAR` retrieval for `create_from_world_char` / `regenerate`.

## Architecture Check

1. Registering one task type across the existing exhaustive `Record<TaskType, …>` maps is the framework's established extension pattern — each new story-pipeline task type already occupies all these maps. Following the pattern keeps task-type configuration centralized and exhaustiveness-checked by the compiler, which is cleaner than special-casing `story_character_profile` outside the maps.
2. No backwards-compatibility shim: `story_character_profile` is added as a first-class task type; no fallback-to-`other` alias is introduced (the whole point is to stop the `other`/error fallback).

## Verification Layers

1. `get_context_packet(task_type="story_character_profile")` resolves against a defined profile rather than erroring → new world-mcp integration/unit test + `grep` for the token in `TASK_TYPES`.
2. `isStoryPipelineTaskType("story_character_profile") === true` and `story_slug` is required → unit test asserting the `story_slug`-required error path.
3. An oversize source `CHAR` returns section-projection suggestions for `create_from_world_char` / `regenerate` → context-packet test asserting full-body/section delivery rule.
4. Package typechecks (all exhaustive `Record<TaskType, …>` maps populated) → `npm run build --prefix tools/world-mcp` (build is the exhaustiveness proof).

## What to Change

### 1. Register the task type

Add `"story_character_profile"` to `TASK_TYPES` (`profiles/index.ts:19`) and to `STORY_PIPELINE_TASK_TYPES` (`shared.ts:404`).

### 2. Add the ranking profile

Define `storyCharacterProfileRankingProfile` in `profiles/canon-pipeline-adjacent.ts` (alongside the other story-pipeline profiles) and wire it into `rankingProfilesByTaskType`; add a `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` entry. Tune for targeted full/section retrieval of the source `CHAR-*` dossier (`create_from_world_char` / `regenerate`) and story-bundle context (`create_story_local`).

### 3. Populate the governing-world maps

Add a `story_character_profile` entry to each exhaustive map in `governing-world-context.ts` (`GOVERNING_FILE_PATHS`, `ACTIVE_RULES`, `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`) and to `FULL_BODY_RULES_BY_TASK_TYPE` in `full-body-delivery.ts`, modeled on the existing story-pipeline task-type entries. Add to `GOVERNING_ATOMIC_NODE_TYPES` only if the profile needs governing atomic node types.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify) — `TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify) — new `storyCharacterProfileRankingProfile`
- `tools/world-mcp/src/context-packet/shared.ts` (modify) — `STORY_PIPELINE_TASK_TYPES`
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify) — 4 exhaustive maps (+ optional partial map)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify) — `FULL_BODY_RULES_BY_TASK_TYPE`
- `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` (new) — task-type resolution + story_slug-required + section-projection

## Out of Scope

- The §2.4 *Optional/secondary* `active_story_characters` rename to `global_active_story_characters` or the page-scoped `active_story_character_ids_by_latest_page` field — spec-deferred ("include only if 2.2 work makes it cheap"); not implemented here.
- No change to `story-character-profile/SKILL.md` (it already calls the task type).
- No new MCP tool; this extends `get_context_packet`'s existing task-type surface only.

## Acceptance Criteria

### Tests That Must Pass

1. `get_context_packet(task_type="story_character_profile", story_slug=…)` resolves to the defined profile (no `Unsupported task_type` error, no `other` fallback).
2. Omitting `story_slug` for `story_character_profile` raises the `story_slug is required` error (confirms story-pipeline membership).
3. An oversize source `CHAR` yields section-projection suggestions.
4. `npm run build --prefix tools/world-mcp` succeeds (all exhaustive `Record<TaskType, …>` maps populated).

### Invariants

1. Every `Record<TaskType, …>` map in `world-mcp` contains a `story_character_profile` key (compiler-enforced exhaustiveness).
2. `story_character_profile ∈ STORY_PIPELINE_TASK_TYPES`, so `story_slug` is mandatory and `story_bundle_context` is populated.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` (new) — resolution, `story_slug`-required path, and section-projection for an oversize source `CHAR`.

### Commands

1. `npm run build --prefix tools/world-mcp && npm test --prefix tools/world-mcp`
2. `grep -n "story_character_profile" tools/world-mcp/src/ranking/profiles/index.ts tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts` — confirm the token is registered at every required seam site.
