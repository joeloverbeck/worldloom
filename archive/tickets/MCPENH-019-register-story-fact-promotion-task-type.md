# MCPENH-019: Register `story_fact_promotion_to_canon` task_type with ranking profile + token budget

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` (extended `TASK_TYPES`, added ranking profile entry, set token budget); `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (added `storyFactPromotionToCanonRankingProfile` export); `tools/world-mcp/src/context-packet/shared.ts` (added reserve-priority entry to `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`); `tools/world-mcp/src/context-packet/governing-world-context.ts` (added governing rules / protected surfaces / required output schema / prohibited moves / reserve full-body classes entries — exhaustive `Record<TaskType, ...>` maps require coverage); `tools/world-mcp/src/context-packet/full-body-delivery.ts` (added `FULL_BODY_RULES_BY_TASK_TYPE` entry); `tools/world-mcp/tests/` (added task_type coverage); context-packet docs / README (enumerate the registered task_type and default budget)
**Deps**: `archive/tickets/MCPENH-009-register-story-bootstrap-task-type.md`, `archive/tickets/MCPENH-012-register-story-page-cycle-task-type.md`, `archive/tickets/MCPENH-013-register-storylet-pool-authoring-task-type.md`, `archive/tickets/MCPENH-017-register-branching-story-health-audit-task-type.md` (registration pattern is well-established across four prior tickets)

## Problem

`story-fact-promotion-to-canon` (the canon-mutating skill that bridges story-local outcomes to world canon) Pre-flight Step 7 loads world-canon retrieval via `mcp__worldloom__get_context_packet(...)` to power Phase 4 mystery firewall, Phase 7 critic prompts, and Phase 6 proposal-package construction. The retrieval slice needs:

- **Reserve-priority full bodies for invariants** — Phase 7 Scope-Inflation Critic + canon-addition's downstream validators all need full INV bodies; partial reads cannot meet the bar.
- **Reserve-priority full bodies for mystery_reserve** — Phase 4 mystery firewall is class-bounded (whole-class M load via `list_records`); the context-packet path supplements that with seed-relevant M's full bodies for Phase 7 Mystery-Firewall Critic.
- **Governing CFs touching the source's domains_affected** — Phase 7 Provenance + Scope-Inflation critics cross-reference these.
- **Recent change-log entries** — canon-baseline drift context for the proposal package.
- **OQ records in the source's domain** — Phase 14a Test 14 (downstream in canon-addition) requires OQ pressure-scan completion; the upstream slice should surface them so the proposal package can pre-classify.

At intake (the skill's first shipping pass), `story_fact_promotion_to_canon` is not registered in `tools/world-mcp/src/ranking/profiles/index.ts` `TASK_TYPES`. The skill ships with `task_type='canon_addition'` as the closest existing match (opportunistic priority for invariants/MR; CF-focused governing context — appropriate because the proposal package re-routes to canon-addition anyway). This is correctness-adjacent, not load-bearing — the skill's mystery-firewall hard-rejects work regardless because Phase 4 uses `list_records` whole-class load, not the context packet. But the context-packet's governing-CFs delivery is degraded relative to a registered profile that prioritizes the surfaces story-promotion specifically consumes (CFs touching the source's `subject` STENT's `world_ent_id`, CFs touching the source's `domains_affected`, OQ records in the source's domain).

## Assumption Reassessment (2026-05-03)

1. `tools/world-mcp/src/ranking/profiles/index.ts` enumerates 14 task_types after MCPENH-017 landed; the story-promotion skill ships against `task_type='canon_addition'` as the interim, which is closer than `task_type='other'` (the catch-all defaultRankingProfile) but still misses the story-promotion-specific governing-CF prioritization (CFs touching the cited STENT's world_ent_id; CFs touching the source's domains_affected; OQs in those domains; recent CH for canon-revision-baseline context).
2. The skill's context-packet seed_nodes are the source-relevant CF/INV/M/OQ ids identified at Pre-flight (the proposal's promotion CF candidate cites `domains_affected`, the source's STENT cites `world_ent_id`, the mystery_resolution variant cites the target M, etc.).
3. Cross-skill / cross-artifact boundary: the task_type is produced by `tools/world-mcp` and consumed by the story-promotion skill via `get_context_packet`; the `TaskType` union also drives exhaustive `Record<TaskType, ...>` maps in `tools/world-mcp/src/context-packet/shared.ts` (governing-priority), `full-body-delivery.ts` (full-body rules), and `governing-world-context.ts` (active rules / protected surfaces / required output schema / prohibited moves / reserve full-body classes). All five exhaustive maps require simultaneous extension to keep the `TaskType` type-narrowing complete.
4. FOUNDATIONS Tooling Recommendation motivation: every skill consuming the context packet should declare a task_type that names its retrieval intent so the ranking profile can be tuned. `task_type='canon_addition'` is a serviceable interim because the proposal package routes to canon-addition; `task_type='other'` would be wrong (the skill IS classifiable). But the registered story_fact_promotion_to_canon profile is the right long-term shape.
5. Schema parity: not applicable — registering a task_type extends an enum and adds profile entries; no record schema changes.
6. Same-seam package fallout: the `TaskType` union drives 5 exhaustive maps (per item 3 above). Each must include the new task_type; missing entries produce TypeScript compilation failures that catch the omission at build time.
7. The companion ticket `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` has completed the SP id-class allocator support. MCPENH-019 is independently landable and now supplies the second completed prerequisite for `SFPC-001-revert-fallbacks-after-mcpenh-lands`.
8. Boundary correction: active ticket `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` already owns `.claude/skills/story-fact-promotion-to-canon/SKILL.md` fallback removal and example-prose cleanup after MCPENH-018 + MCPENH-019 land. MCPENH-019 therefore owns the provider-side package registration, package tests, and context-packet docs only; it does not edit the skill fallback prose.
9. Dirty-worktree classification: `.claude/skills/skill-creator/references/skill-design-drafting.md` was modified before this run and is unrelated. During closeout, additional unrelated skill-creator files were also dirty (`.claude/skills/skill-creator/SKILL.md`, `references/gap-filler-interview.md`, and `references/governance-and-foundations.md`); those remain excluded from this ticket. `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were pre-existing ignored package artifacts before verification.

## Architecture Check

1. The pattern is established across four prior tickets (MCPENH-009, -012, -013, -017): every story-pipeline-adjacent skill that ships gets a registered profile in `canon-pipeline-adjacent.ts` plus the five exhaustive-map entries. Adding `story_fact_promotion_to_canon` follows the same shape — no new abstractions required.
2. No backwards-compatibility shim: the skill switches from `task_type='canon_addition'` to `task_type='story_fact_promotion_to_canon'` atomically when `SFPC-001-revert-fallbacks-after-mcpenh-lands` is executed (see that ticket for the skill-prose edit).
3. Token budget: 8000 (the skill's existing default per the SKILL.md Pre-flight Step 7 reference); making it the registered default removes the explicit skill override without changing intent. This is smaller than `branching_story_health_audit`'s 12000 because the story-promotion skill's retrieval is bounded to source-relevant CFs/INVs/Ms/OQs (Phase 4 whole-class M load is separate); the audit skill's broader cross-bundle scan needs a larger packet.

## Verification Layers

1. **TASK_TYPES enum extends to include `story_fact_promotion_to_canon`** → grep `TASK_TYPES` in `tools/world-mcp/src/ranking/profiles/index.ts` after the edit shows the new entry.
2. **`getRankingProfile('story_fact_promotion_to_canon')` returns the new profile** → unit tests in `tools/world-mcp/tests/ranking/profile-lookup.test.ts` and `tools/world-mcp/tests/ranking/profile-overrides.test.ts`.
3. **`DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['story_fact_promotion_to_canon'] === 8000`** → unit test.
4. **All five exhaustive maps include the new task_type** → TypeScript build succeeds (missing entries produce `Property 'story_fact_promotion_to_canon' is missing` errors).
5. **Context packet's governing-CFs prioritization for story-promotion is observably story-CF-focused** → package tests assert the new task_type's reserve full-body delivery for invariants + mystery_reserve, governing-context inclusion for CFs touching the source STENT's world_ent_id and domains_affected, and OQ inclusion for the source's domain.
6. **Consuming-skill fallback remains explicitly deferred** → `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` remains the follow-up owner for removing `task_type='canon_addition'` fallback prose after MCPENH-019 is complete.

## Landed Changes

### 1. Created the ranking profile

Added `storyFactPromotionToCanonRankingProfile` to `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`. The profile boosts `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, and `change_log_entry`, with recency and structured-edge weights for promotion-local authority.

### 2. Wired into `index.ts`

Added `story_fact_promotion_to_canon` to:
- `TASK_TYPES` const array
- `rankingProfilesByTaskType` map
- `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` map (value `8000`)
- profile re-exports

### 3. Extended the context-packet maps

In `tools/world-mcp/src/context-packet/shared.ts`, added `story_fact_promotion_to_canon: { invariants: "reserve", mystery_reserve: "reserve" }` to `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`.

In `tools/world-mcp/src/context-packet/governing-world-context.ts`, added the new task type to `GOVERNING_FILE_PATHS`, `ACTIVE_RULES`, `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, and `GOVERNING_ATOMIC_NODE_TYPES`. The governing atomic node types are `invariant`, `mystery_reserve_entry`, and `open_question_entry`; the task also includes the latest `change_log_entry` for canon-baseline drift context.

In `tools/world-mcp/src/context-packet/full-body-delivery.ts`, added `story_fact_promotion_to_canon` full-body candidates for `canon_fact_record`, `invariant`, `mystery_reserve_entry`, and `open_question_entry`.

### 4. Added tests

Extended `tools/world-mcp/tests/ranking/profile-overrides.test.ts`, `tools/world-mcp/tests/tools/get-context-packet.test.ts`, `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts`, `tools/world-mcp/tests/tools/describe-capabilities.test.ts`, and `tools/world-mcp/tests/server/dispatch.test.ts` for profile, default-budget, reserve/full-body, latest change-log, and enum-metadata coverage. `profile-lookup.test.ts` already iterates every `TASK_TYPES` entry and now covers the new value through the tuple.

### 5. Updated documentation

Updated `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` so the task type, 8000 default budget, reserve governing full-body policy, full-body candidates, and profile purpose are documented.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` (modify — dependency wording truthing)

## Out of Scope

- Tuning the ranking profile weights against real story-promotion runs — initial values per the precedent profiles; future tuning is a separate follow-up if observability justifies.
- Skill prose edits to drop the `task_type='canon_addition'` interim (covered by active follow-up `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md`).
- Token budget tuning beyond the initial 8000 (the audit skill's 12000 is precedent for higher-budget classes; the story-promotion skill's narrower retrieval slice justifies 8000).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` — TypeScript build succeeds (exhaustive-map coverage validated by the type system).
2. `cd tools/world-mcp && npm test` — full package test lane passes with new task-type coverage.
3. `cd tools/world-mcp && node --test dist/tests/ranking/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — focused compiled coverage lists `story_fact_promotion_to_canon` in the task_type enum surface.

### Invariants

1. `TaskType` union includes `story_fact_promotion_to_canon`; all five exhaustive maps cover it.
2. `getRankingProfile('story_fact_promotion_to_canon')` returns a non-default profile with elevated CF / INV / MR / OQ / NE / CH weights.
3. `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['story_fact_promotion_to_canon'] === 8000`.
4. Reserve-priority full-body delivery for invariants and mystery_reserve.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/profile-lookup.test.ts` — existing tuple iteration covers `story_fact_promotion_to_canon` once it is in `TASK_TYPES`; no source edit required.
2. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — add story_fact_promotion_to_canon override-weights case.
3. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — add 8000 default-budget and latest change-log assertions.
4. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — add reserve/full-body assertions for invariants, Mystery Reserve, and open questions.
5. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` — assert enum metadata includes `story_fact_promotion_to_canon`.

### Commands

1. `cd tools/world-mcp && npm run build` (TypeScript exhaustive-map validation).
2. `cd tools/world-mcp && npm test` (full package test lane).
3. `cd tools/world-mcp && node --test dist/tests/ranking/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` (focused compiled task-type coverage after build).

## Outcome

Completed on 2026-05-03.

- Registered `story_fact_promotion_to_canon` as a `tools/world-mcp` task type with a non-default ranking profile and an 8000 default token budget.
- Added governing-world-context metadata, latest change-log inclusion, reserve governing full-body priority, and full-body candidates for CF / INV / M / OQ records.
- Updated package and repo docs that enumerate context-packet task types, default budgets, reserve full-body policy, and story-family profile summaries.
- Updated active follow-up `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` so its dependency note treats MCPENH-019 as completed in place.
- Left `.claude/skills/story-fact-promotion-to-canon/SKILL.md` unchanged because active follow-up `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` owns the fallback removal.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/ranking/*.test.js dist/tests/tools/get-context-packet.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — passed; 8 compiled test files passed.
3. `cd tools/world-mcp && npm test` — passed; package build plus full compiled suite reported 289 passing tests.

Package ignored artifacts were present before verification (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). `npm test` rebuilt `dist/`; this is expected generated ignored state.

## Deviations

- `tickets/SFPC-001-revert-fallbacks-after-mcpenh-lands.md` owns the consuming-skill fallback cleanup, so MCPENH-019 did not edit `.claude/skills/story-fact-promotion-to-canon/SKILL.md` or its example file.
- `tools/world-mcp/tests/ranking/profile-lookup.test.ts` already covers every task type by iterating `TASK_TYPES`; no task-specific source edit was required there.
- The package-local proof uses built source/tests and in-memory MCP dispatch/describe-capabilities metadata rather than direct external `mcp__worldloom__describe_capabilities`, which is the truthful Codex proof surface for source changes before any deployed MCP server restart.
