# SPEC60STCHARMACLAY-002: MCP `story_character_profile` task profile

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp` ranking profiles + context-packet governing-world maps + story-pipeline task-type set; introduces the `story_character_profile` task type. No impact on existing task types (additive).
**Deps**: None

## Problem

At intake, `story-character-profile/SKILL.md` called `mcp__worldloom__get_context_packet(world_slug, task_type='story_character_profile', story_slug=…)`, but `story_character_profile` was absent from `TASK_TYPES` (`tools/world-mcp/src/ranking/profiles/index.ts`). The call errored at `get-context-packet.ts` (`Unsupported task_type`). The skill had no matching ranking profile or governing-world context, so STCHAR authoring could not retrieve its source `CHAR-*` dossier or story-bundle context through the documented context-packet pattern.

## Assumption Reassessment (2026-05-21)

1. `TASK_TYPES` (`tools/world-mcp/src/ranking/profiles/index.ts:19`) does not contain `story_character_profile` (confirmed). The story-pipeline ranking profiles live in `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (e.g., `storyBootstrapRankingProfile`, `storyTurnCycleRankingProfile`). `get-context-packet.ts:71` rejects unknown task types; `:79` requires `story_slug` for story-pipeline types via `isStoryPipelineTaskType` (`shared.ts:412`).
2. `story-character-profile/SKILL.md` calls `get_context_packet(task_type='story_character_profile', story_slug=…)` with `create_from_world_char` / `create_story_local` / `regenerate` modes (confirmed at SKILL.md ~line 160). The new type requires `story_slug`, so it is a story-pipeline task type and MUST be added to `STORY_PIPELINE_TASK_TYPES` (`shared.ts:404`).
3. **Cross-package / cross-skill boundary under audit**: the `story_character_profile` token is the contract shared between the `story-character-profile` skill (consumer) and `world-mcp` (provider). The seam is wider than the spec's §2.2 named two maps: `story_character_profile` had to be added to **every exhaustive `Record<TaskType, …>` map** or `world-mcp` would fail to typecheck — `rankingProfilesByTaskType` (`profiles/index.ts:39`), `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` (`profiles/index.ts:55+`), `GOVERNING_FILE_PATHS` (`governing-world-context.ts:14`), `ACTIVE_RULES` (`:110`), `REQUIRED_OUTPUT_SCHEMA` (`:203`), `PROHIBITED_MOVES` (`:251`), and `FULL_BODY_RULES_BY_TASK_TYPE` (`full-body-delivery.ts:29`) — plus the `TASK_TYPES` source array and the `STORY_PIPELINE_TASK_TYPES` set. `GOVERNING_ATOMIC_NODE_TYPES` (`governing-world-context.ts:346`) is `Partial<Record<TaskType, …>>`; the implementation added an entry because the profile needs governing invariant and Mystery Reserve node coverage. Package-public enum/budget prose in `tools/world-mcp/README.md` and the `describe_capabilities` enum witness test are same-seam package surfaces. Repo-level docs remain owned by dependent ticket `SPEC60STCHARMACLAY-004`. These sites cannot land independently (TypeScript exhaustiveness), so they belong in one ticket. Surfaced as the Step 2 (g) in-ticket expansion (intent-preserving under-enumeration, not a separate Issue).
4. **§Tooling Recommendation (FOUNDATIONS)**: "LLM agents should never operate on prose alone … via the documented context-packet + targeted-retrieval pattern." A skill that calls `get_context_packet` with a task type that has no profile is forced into ad-hoc reads; defining the profile restores the documented retrieval path. New entries are modeled on the existing story-pipeline task types (e.g., `story_bootstrap`) for the governing-world maps, with story-bundle context for `create_story_local` and targeted source-`CHAR` retrieval for `create_from_world_char` / `regenerate`.

## Architecture Check

1. Registering one task type across the existing exhaustive `Record<TaskType, …>` maps is the framework's established extension pattern — each new story-pipeline task type already occupies all these maps. Following the pattern keeps task-type configuration centralized and exhaustiveness-checked by the compiler, which is cleaner than special-casing `story_character_profile` outside the maps.
2. No backwards-compatibility shim: `story_character_profile` is added as a first-class task type; no fallback-to-`other` alias is introduced (the whole point is to stop the `other`/error fallback).

## Verification Layers

1. `get_context_packet(task_type="story_character_profile")` resolves against a defined profile rather than erroring → new world-mcp integration/unit test + `grep` for the token in `TASK_TYPES`.
2. `isStoryPipelineTaskType("story_character_profile") === true` and `story_slug` is required → unit test asserting the `story_slug`-required error path.
3. A source `CHAR` can be carried as a task-critical local-authority full body when it fits; oversize hybrid projection remains owned by the existing targeted `get_record(section_path)` recovery path → context-packet test asserting source-`CHAR` full-body delivery, with existing hybrid projection tests covering section suggestions.
4. Package typechecks (all exhaustive `Record<TaskType, …>` maps populated) → `npm run build --prefix tools/world-mcp` (build is the exhaustiveness proof).
5. Package-public enum/budget prose and capability metadata expose the new token → README grep + `describe_capabilities` enum witness test.

## Landed Changes

### 1. Register the task type

Added `"story_character_profile"` to `TASK_TYPES` and to `STORY_PIPELINE_TASK_TYPES`.

### 2. Add the ranking profile

Defined `storyCharacterProfileRankingProfile` in `profiles/canon-pipeline-adjacent.ts`, wired it into `rankingProfilesByTaskType`, and added a `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` entry. The profile prioritizes source `CHAR-*`, STCHAR/story-entity context, governing canon, and relevant sections for `create_from_world_char` / `regenerate` / `create_story_local`.

### 3. Populate the governing-world maps

Added `story_character_profile` to each exhaustive map in `governing-world-context.ts` (`GOVERNING_FILE_PATHS`, `ACTIVE_RULES`, `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`) and to `FULL_BODY_RULES_BY_TASK_TYPE` in `full-body-delivery.ts`. Added `GOVERNING_ATOMIC_NODE_TYPES` and reserve governing full-body priority entries so invariants and Mystery Reserve records remain protected like other content-generating story-pipeline flows.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify) — `TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify) — new `storyCharacterProfileRankingProfile`
- `tools/world-mcp/src/context-packet/shared.ts` (modify) — `STORY_PIPELINE_TASK_TYPES`
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify) — 4 exhaustive maps (+ optional partial map)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify) — `FULL_BODY_RULES_BY_TASK_TYPE`
- `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` (new) — task-type resolution + story_slug-required + source-`CHAR` full-body delivery
- `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (modify) — exhaustive active-rules witness includes `story_character_profile`
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify) — profile/default-budget witness includes `story_character_profile`
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify) — enum witness includes `story_character_profile`
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify) — adds source `CHAR-1` fixture for profile tests
- `tools/world-mcp/README.md` (modify) — package-public task-type and default-budget prose includes `story_character_profile`

## Out of Scope

- The §2.4 *Optional/secondary* `active_story_characters` rename to `global_active_story_characters` or the page-scoped `active_story_character_ids_by_latest_page` field — spec-deferred ("include only if 2.2 work makes it cheap"); not implemented here.
- No change to `story-character-profile/SKILL.md` (it already calls the task type).
- No new MCP tool; this extends `get_context_packet`'s existing task-type surface only.

## Acceptance Criteria

### Tests That Must Pass

1. `get_context_packet(task_type="story_character_profile", story_slug=…)` resolves to the defined profile (no `Unsupported task_type` error, no `other` fallback).
2. Omitting `story_slug` for `story_character_profile` raises the `story_slug is required` error (confirms story-pipeline membership).
3. A source `CHAR` is eligible for task-critical full-body delivery when it fits; oversized hybrid section recovery remains available through the existing `get_record(section_path)` projection path.
4. `npm run build --prefix tools/world-mcp` succeeds (all exhaustive `Record<TaskType, …>` maps populated).
5. `describe_capabilities` exposes `story_character_profile` in the `get_context_packet.task_type` enum, and `tools/world-mcp/README.md` lists the task type in story-pipeline requirements/default-budget prose.

### Invariants

1. Every `Record<TaskType, …>` map in `world-mcp` contains a `story_character_profile` key (compiler-enforced exhaustiveness).
2. `story_character_profile ∈ STORY_PIPELINE_TASK_TYPES`, so `story_slug` is mandatory and `story_bundle_context` is populated.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-character-profile.test.ts` (new) — resolution, `story_slug`-required path, story-bundle context, reserve governing policy, and source-`CHAR` full-body delivery.
2. `tools/world-mcp/tests/context-packet/active-rules-foundations-alignment.test.ts` (modified) — active-rules exhaustive witness includes `story_character_profile`.
3. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modified) — profile/default-budget witness includes `story_character_profile`.
4. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modified) — source-current enum witness includes `story_character_profile`.

### Commands

1. `npm run build --prefix tools/world-mcp && npm test --prefix tools/world-mcp`
2. `grep -n "story_character_profile" tools/world-mcp/src/ranking/profiles/index.ts tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts tools/world-mcp/tests/tools/describe-capabilities.test.ts tools/world-mcp/README.md` — confirm the token is registered at every required seam site and package-public enum surface.

## Outcome

Completed: 2026-05-21

Implemented `story_character_profile` as a first-class `tools/world-mcp` context-packet task type. It is registered in the task-type enum, story-pipeline set, ranking profile map, default-budget map, governing-world context maps, reserve governing full-body policy, and task-type full-body delivery rules. The profile prioritizes source `CHAR` dossiers, STCHAR/story-entity context, governing canon, and story-bundle context. Package-public README prose and capability enum tests now include the new token. Repo-level contract docs remain owned by dependent ticket `SPEC60STCHARMACLAY-004`.

## Verification Result

1. `cd tools/world-mcp && npm test` passed before implementation as the baseline: 425 tests passed.
2. `cd tools/world-mcp && npm run build` initially failed on the exhaustive active-rules test fixture map missing `story_character_profile`; after adding the required fixture entry, the build passed.
3. `cd tools/world-mcp && node --test dist/tests/context-packet/story-character-profile.test.js dist/tests/ranking/profile-overrides.test.js dist/tests/context-packet/active-rules-foundations-alignment.test.js dist/tests/tools/describe-capabilities.test.js` passed: 12 tests passed.
4. `cd tools/world-mcp && npm test` passed after implementation: 427 tests passed.

## Deviations

1. The drafted "oversize source `CHAR` returns section-projection suggestions" acceptance was narrowed to the live architecture: `get_context_packet` now marks source `CHAR` as task-critical and delivers its full body when it fits, while oversized hybrid section suggestions remain the existing targeted `get_record(section_path)` recovery behavior. No new `get_context_packet` section-suggestion mechanism was added.
2. Package-public surfaces were wider than the draft file list: `tools/world-mcp/README.md`, `active-rules-foundations-alignment.test.ts`, `profile-overrides.test.ts`, `describe-capabilities.test.ts`, and the story-bundle fixture moved with the implementation so the package enum/profile contract stays truthful.
