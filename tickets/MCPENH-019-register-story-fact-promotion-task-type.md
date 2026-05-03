# MCPENH-019: Register `story_fact_promotion_to_canon` task_type with ranking profile + token budget

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` (extend `TASK_TYPES`, add ranking profile entry, set token budget); `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (add `storyFactPromotionToCanonRankingProfile` export); `tools/world-mcp/src/context-packet/shared.ts` (add reserve-priority entry to `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`); `tools/world-mcp/src/context-packet/governing-world-context.ts` (add governing rules / protected surfaces / required output schema / prohibited moves / reserve full-body classes entries — exhaustive `Record<TaskType, ...>` maps require coverage); `tools/world-mcp/src/context-packet/full-body-delivery.ts` (add `FULL_BODY_RULES_BY_TASK_TYPE` entry); `tools/world-mcp/tests/` (add task_type coverage); `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (Pre-flight Step 7 + Guardrails §Known integration debt — drop `task_type='canon_addition'` fallback once this lands)
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

1. `tools/world-mcp/src/ranking/profiles/index.ts` enumerated 14 task_types after MCPENH-017 landed; the story-promotion skill ships against `task_type='canon_addition'` as the interim, which is closer than `task_type='other'` (the catch-all defaultRankingProfile) but still misses the story-promotion-specific governing-CF prioritization (CFs touching the cited STENT's world_ent_id; CFs touching the source's domains_affected; OQs in those domains; recent CH for canon-revision-baseline context).
2. The skill's context-packet seed_nodes are the source-relevant CF/INV/M/OQ ids identified at Pre-flight (the proposal's promotion CF candidate cites `domains_affected`, the source's STENT cites `world_ent_id`, the mystery_resolution variant cites the target M, etc.).
3. Cross-skill / cross-artifact boundary: the task_type is produced by `tools/world-mcp` and consumed by the story-promotion skill via `get_context_packet`; the `TaskType` union also drives exhaustive `Record<TaskType, ...>` maps in `tools/world-mcp/src/context-packet/shared.ts` (governing-priority), `full-body-delivery.ts` (full-body rules), and `governing-world-context.ts` (active rules / protected surfaces / required output schema / prohibited moves / reserve full-body classes). All five exhaustive maps require simultaneous extension to keep the `TaskType` type-narrowing complete.
4. FOUNDATIONS Tooling Recommendation motivation: every skill consuming the context packet should declare a task_type that names its retrieval intent so the ranking profile can be tuned. `task_type='canon_addition'` is a serviceable interim because the proposal package routes to canon-addition; `task_type='other'` would be wrong (the skill IS classifiable). But the registered story_fact_promotion_to_canon profile is the right long-term shape.
5. Schema parity: not applicable — registering a task_type extends an enum and adds profile entries; no record schema changes.
6. Same-seam package fallout: the `TaskType` union drives 5 exhaustive maps (per item 3 above). Each must include the new task_type; missing entries produce TypeScript compilation failures that catch the omission at build time.
7. The companion ticket `archive/tickets/MCPENH-018-add-sp-id-class-to-allocator.md` has completed the SP id-class allocator support. MCPENH-019 remains independently landable and must also complete before `SFPC-001-revert-fallbacks-after-mcpenh-lands` removes the skill's interim fallbacks.

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
6. **Skill Pre-flight uses the registered task_type** → `story-fact-promotion-to-canon/SKILL.md` Pre-flight Step 7 + World-State Prerequisites use `task_type='story_fact_promotion_to_canon'` and omit the explicit `token_budget` override (relying on the registered default).

## What to Change

### 1. Create the ranking profile

Add `storyFactPromotionToCanonRankingProfile` to `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`. Elevated weights for: `canon_fact_record` (CF candidates and parent CFs), `invariant` (Phase 7 Scope-Inflation), `mystery_reserve_entry` (Phase 4 firewall + Phase 7 Mystery-Firewall critic), `change_log_entry` (canon-revision-baseline context), `open_question_record` (downstream OQ pressure-scan), `named_entity` (the source STENT's world_ent_id is a seed), `recency_of_modification_bonus` (recent canon changes affecting the source's domains).

### 2. Wire into `index.ts`

Add `story_fact_promotion_to_canon` to:
- `TASK_TYPES` const array
- `rankingProfilesByTaskType` map
- `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` map (value `8000`)
- profile re-exports

### 3. Extend the five exhaustive context-packet maps

In `tools/world-mcp/src/context-packet/shared.ts`:
- `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: { invariants: "reserve", mystery_reserve: "reserve" }` (parallel to story_bootstrap / story_page_cycle / storylet_pool_authoring / branching_story_health_audit).

In `tools/world-mcp/src/context-packet/governing-world-context.ts`:
- `GOVERNING_PROTECTED_SURFACES_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: ["WORLD_KERNEL.md", "INVARIANTS.md (atomized)", "MYSTERY_RESERVE (atomized)"]` (rendering depends on the existing string conventions).
- `GOVERNING_REQUIRED_OUTPUT_SCHEMA_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: ["Canon Fact candidate (proposal package)", "Story promotion ledger SP-NNNN", "Superseding story-local source record (on accept)"]`.
- `GOVERNING_PROHIBITED_MOVES_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: ["Bypass canon-addition handoff", "Promote forbidden-status mystery", "Silently elevate story-local truth without SP+CH+PA triad"]`.
- `GOVERNING_ACTIVE_RULES_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: ["Rule 4 (No Globalization by Accident)", "Rule 6 (No Silent Retcons)", "Rule 7 (Preserve Mystery Deliberately)", "Rule 12 (No Single-Trace Truths) — conditional on hard_canon", "Default Reality clause"]`.
- `GOVERNING_RESERVE_FULL_BODY_CLASSES`: add `story_fact_promotion_to_canon: ["invariant", "mystery_reserve_entry", "open_question_record"]`.

In `tools/world-mcp/src/context-packet/full-body-delivery.ts`:
- `FULL_BODY_RULES_BY_TASK_TYPE`: add `story_fact_promotion_to_canon: [<rules selecting governing CFs touching domains_affected, governing entities for cited STENT world_ent_id, governing M for source M, governing OQ for source domain>]` — concrete rule shape per the existing entries (canon_addition / story_page_cycle precedent).

### 4. Tests

- `tools/world-mcp/tests/ranking/profile-lookup.test.ts`: assert `getRankingProfile('story_fact_promotion_to_canon')` returns the new profile.
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts`: assert the new profile's elevated weights.
- `tools/world-mcp/tests/ranking/default-budgets.test.ts` (or equivalent): assert default token budget = 8000.
- `tools/world-mcp/tests/context-packet/`: add task-type coverage tests asserting governing-context inclusion + reserve full-body delivery for invariants/MR.
- `tools/world-mcp/tests/server/describe-capabilities.test.ts`: assert `story_fact_promotion_to_canon` in the task_type enum surface.

### 5. Documentation

- `docs/CONTEXT-PACKET-CONTRACT.md`: add `story_fact_promotion_to_canon` to the task_type table with token budget + ranking profile summary.
- `tools/world-mcp/README.md`: add to the registered task_types list.
- `docs/MACHINE-FACING-LAYER.md`: cross-reference if it enumerates task_types.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify)
- `tools/world-mcp/tests/ranking/profile-lookup.test.ts` (modify)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify)
- `tools/world-mcp/tests/ranking/default-budgets.test.ts` (modify, or extend the closest equivalent)
- `tools/world-mcp/tests/context-packet/` (modify or add)
- `tools/world-mcp/tests/server/describe-capabilities.test.ts` (modify)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Tuning the ranking profile weights against real story-promotion runs — initial values per the precedent profiles; future tuning is a separate follow-up if observability justifies.
- Skill prose edits to drop the `task_type='canon_addition'` interim (covered by `SFPC-001-revert-fallbacks-after-mcpenh-lands`).
- Token budget tuning beyond the initial 8000 (the audit skill's 12000 is precedent for higher-budget classes; the story-promotion skill's narrower retrieval slice justifies 8000).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` — TypeScript build succeeds (exhaustive-map coverage validated by the type system).
2. `cd tools/world-mcp && npm test` — full package test lane passes with new task-type coverage.
3. `mcp__worldloom__describe_capabilities` (if exposed in the runtime — otherwise `dist/tests/server/describe-capabilities.test.js`) lists `story_fact_promotion_to_canon` in the task_type enum.

### Invariants

1. `TaskType` union includes `story_fact_promotion_to_canon`; all five exhaustive maps cover it.
2. `getRankingProfile('story_fact_promotion_to_canon')` returns a non-default profile with elevated CF / INV / MR / OQ / NE / CH weights.
3. `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['story_fact_promotion_to_canon'] === 8000`.
4. Reserve-priority full-body delivery for invariants and mystery_reserve.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/profile-lookup.test.ts` — add story_fact_promotion_to_canon lookup case.
2. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — add story_fact_promotion_to_canon override-weights case.
3. `tools/world-mcp/tests/ranking/default-budgets.test.ts` — add 8000 budget assertion.
4. `tools/world-mcp/tests/context-packet/` — add governing-context + reserve-full-body assertions.

### Commands

1. `cd tools/world-mcp && npm run build` (TypeScript exhaustive-map validation).
2. `cd tools/world-mcp && npm test` (full package test lane).
