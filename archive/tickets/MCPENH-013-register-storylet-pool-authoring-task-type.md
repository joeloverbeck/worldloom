# MCPENH-013: Register `storylet_pool_authoring` task type for context-packet retrieval

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (`TaskType` tuple, context-packet ranking/default-budget/governing/full-body registries, tests, README), `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, `.claude/skills/storylet-pool-authoring/SKILL.md` (`task_type='other'` fallback removed)
**Deps**: archive/tickets/MCPENH-009-register-story-bootstrap-task-type.md, archive/tickets/MCPENH-012-register-story-page-cycle-task-type.md (precedents)

## Problem

At intake, `.claude/skills/storylet-pool-authoring` Pre-flight loaded premise-bounded world canon via `mcp__worldloom__get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)`, but the `task_type='storylet_pool_authoring'` profile was not registered in the context-packet retrieval profile registry. The skill shipped with `task_type='other'` as a fallback (Shape A integration posture).

The fallback was correct (the skill assembled seed nodes explicitly — `STORY_KERNEL.cast_bind_list` STENT.world_ent_id resolution + recent-history-named entities + active period — so `task_type='other'` returned a generic packet that included them). What it lost was the per-task-class prioritization that a registered profile encodes:

- World-canon CFs scoped to `seed_nodes`, prioritizing CFs that orbit cast and active period (storylet authoring is premise-relevant, not whole-world)
- INV records governing the seed scope (subset of the whole-class load — the skill still does whole-class loading separately, but a packet-level INV layer would prioritize governing INVs near the top of the budget)
- Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same logic as INV; mystery firewall and per-claim resolution-authority routing are key Phase 4 gates)
- Named-entity neighbors of seeds (one-hop relation resolution — relevant for cast-driven shape weighting in Phase 2)
- WORLD_KERNEL summary + ONTOLOGY governing context (top-of-packet always)

Before this ticket landed, retrieval prioritization came from `task_type='other'`'s generic priorities, which over-fetched peripheral records and under-prioritized the cast-and-mystery-scoped CF/INV/M layer Phase 1 / Phase 2 / Phase 4 actually need.

## Assumption Reassessment (2026-05-02)

1. The live task-type profile registry is split across `tools/world-mcp/src/ranking/profiles/index.ts` (`TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`), `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (same-family profile definitions), `tools/world-mcp/src/context-packet/governing-world-context.ts`, `tools/world-mcp/src/context-packet/full-body-delivery.ts`, and `tools/world-mcp/src/context-packet/shared.ts`. MCPENH-012's archive ticket confirmed these locations on 2026-05-02.
2. Archived MCPENH-009 (`story_bootstrap`) and MCPENH-012 (`story_page_cycle`) are the structural precedents. They registered each task type in the TaskType tuple, ranking registry, default-budget table, governing-world-context metadata, full-body delivery rules, reserve-policy table, package tests, package README, `docs/MACHINE-FACING-LAYER.md`, `docs/CONTEXT-PACKET-CONTRACT.md`, and the consuming skill. This ticket followed the same lockstep registration pattern for `storylet_pool_authoring`.
3. The shared boundary under audit is the contract between (a) `.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight retrieval, (b) the `tools/world-mcp` `get_context_packet` task-type enum/profile/provider surface, and (c) the storylet-authoring Phase 1 / Phase 2 / Phase 4 consumers (which read CF / INV / M / ENT records identified by the packet to drive coverage diagnosis, seed shape weighting, and mystery firewall).
4. **FOUNDATIONS principle**: §Tooling Recommendation's "non-negotiable" load discipline. The recommendation says "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + Invariants + relevant CFs + affected domain files + unresolved contradictions list + Mystery Reserve entries touching the same domain." The registered profile is what makes the recommendation operational for this skill's task class, parallel to MCPENH-009 / MCPENH-012's contribution for the bootstrap and page-cycle skills.
5. This ticket does NOT touch HARD-GATE semantics. It tunes retrieval prioritization within an existing read mechanism. The HARD-GATE for `storylet-pool-authoring` (Phase 6 batch deliverable approval) is independent of retrieval profile registration.
6. Adds a single profile entry; does not modify the retrieval API shape. Additive-only. Consumers of `task_type='other'` are unaffected. Consumers of existing `story_bootstrap` and `story_page_cycle` profiles are unaffected.
7. No skill / tool / hook / validator / schema field is renamed or removed.
8. Same-seam required fallout: `.claude/skills/storylet-pool-authoring/SKILL.md` contained a `task_type='other'` fallback disclosure in §World-State Prerequisites, a Pre-flight fallback line, a FOUNDATIONS Alignment fallback parenthetical, and a Guardrails debt bullet naming this ticket. Those were removed.
9. Same-seam docs correction: `docs/CONTEXT-PACKET-CONTRACT.md` also enumerates context-packet task types, full-body candidates, reserve-policy task types, and story profiles. It was updated with `storylet_pool_authoring` even though the draft ticket only named README and `docs/MACHINE-FACING-LAYER.md`.

## Architecture Check

1. Per-task-class profiles are the right primitive (vs a one-size-fits-all retrieval). The packet shape and prioritization are task-specific by design — `propose_new_canon_facts` retrieves differently than `story_bootstrap` differently than `story_page_cycle` differently than `storylet_pool_authoring`. The MCPENH-009 / MCPENH-012 precedents established the pattern; this ticket continues it for the next consuming skill.
2. No backwards-compatibility aliasing: a new profile entry is added; nothing is renamed.

## Verification Layers

1. **Profile registration unit tests** — `tools/world-mcp` package tests assert `TASK_TYPES` includes `'storylet_pool_authoring'`, `rankingProfilesByTaskType['storylet_pool_authoring']` returns the registered profile, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['storylet_pool_authoring']` returns `18000`, and governing-world-context / full-body-delivery / reserve-policy tables all have entries.
2. **MCP dispatch tests** — in-memory MCP capability metadata exposes `task_type='storylet_pool_authoring'` through the wrapped input schema; `getContextPacket(...)` package tests prove the handler accepts the new task type and uses the 18000 default budget.
3. **Skill prose grep/manual review** — `.claude/skills/storylet-pool-authoring/SKILL.md` now uses `task_type='storylet_pool_authoring'` without `task_type='other'` fallback prose, registration-debt prose, or the active MCPENH-013 Guardrails bullet.
4. **README + docs update** — `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` enumerate `storylet_pool_authoring`.

## Landed Changes

### 1. Registered the task type

Added `'storylet_pool_authoring'` to the `TASK_TYPES` tuple in `tools/world-mcp/src/ranking/profiles/index.ts`, registered `storyletPoolAuthoringRankingProfile`, and exported the profile. The profile lives in `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` with story-family weighting toward premise-relevant CFs, governing INV/M records, named-entity neighbors, scoped references, and firewall edges.

### 2. Set default token budget

Added `'storylet_pool_authoring': 18000` to `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`, matching the skill's documented Pre-flight budget and the `story_bootstrap` / `story_page_cycle` precedent.

### 3. Added governing-world-context entry

Added `storylet_pool_authoring` entries in `tools/world-mcp/src/context-packet/governing-world-context.ts` for governing file paths, active rules, required output schema, prohibited moves, and governing atomic node types (`invariant`, `mystery_reserve_entry`).

### 4. Added full-body delivery and reserve policy

Added `storylet_pool_authoring` to `tools/world-mcp/src/context-packet/full-body-delivery.ts` for task-critical `canon_fact_record`, `invariant`, and `mystery_reserve_entry` full-body candidates. Added `storylet_pool_authoring: { invariants: "reserve", mystery_reserve: "reserve" }` to `tools/world-mcp/src/context-packet/shared.ts`.

### 5. Added tests

Extended package tests for ranking profile/default-budget coverage, context-packet default-budget acceptance, governing invariant/Mystery Reserve reserve full-body behavior, and in-memory MCP enum exposure.

### 6. Reverted skill fallback prose

Updated `.claude/skills/storylet-pool-authoring/SKILL.md` to remove the `task_type='other'` fallback disclosure, the Pre-flight substitution line, the FOUNDATIONS Alignment fallback parenthetical, and the MCPENH-013 Guardrails debt bullet.

### 7. Updated docs

Updated `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` so user-facing context-packet task-type/default-budget/full-body/reserve-policy prose includes `storylet_pool_authoring`.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify; reserve-policy)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify; profile + default-budget coverage)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify; default-budget acceptance coverage)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify; reserve full-body coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify; schema enum/capability coverage)
- `tools/world-mcp/README.md` (modify; add task-types table row)
- `docs/MACHINE-FACING-LAYER.md` (modify; add task-types catalog row)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify; add task-type enum, full-body candidate, reserve-policy, and profile section)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; revert fallback prose)

## Out of Scope

- Patch-engine ops for SLT/SLB records (separate Shape-A-future ticket; not blocked by this one).
- Validator framework integration for SLT/SLB records (separate Shape-A-future ticket).
- `branching-story-health-audit` skill (the deferred sibling that audit-mode aborts on; outside this ticket's scope).
- BSBOOT-002 / BSPAG-001 (the post-shipping reverse-seam tickets for bootstrap and page-cycle).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including new `storylet_pool_authoring` profile/default-budget/full-body/dispatch coverage.
2. Grep proof: `rg -n "task_type='other'|MCPENH-013" .claude/skills/storylet-pool-authoring/SKILL.md` returns zero hits after the prose revert.
3. Grep proof: `rg -n "storylet_pool_authoring" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/storylet-pool-authoring/SKILL.md` returns hits in the package registries, tests, docs, and consuming skill.

### Invariants

1. `TASK_TYPES` is alphabetically sorted (or follows the existing convention in the file) after the addition.
2. The new profile's `default_token_budget` matches the storylet-pool-authoring SKILL.md's documented `token_budget=18000`.
3. Package-local `getContextPacket({ task_type: "storylet_pool_authoring", ... })` and in-memory MCP capability metadata prove the source-change path. Direct external `mcp__worldloom__get_context_packet(...)` remains post-rebuild/restart operational smoke for any deployed MCP session.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — assertion that the storylet profile does not reuse the generic fallback and that the default budget is `18000`.
2. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — `getContextPacket(...)` accepts `task_type='storylet_pool_authoring'` and applies the 18000 default.
3. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — `storylet_pool_authoring` reserves governing invariant and Mystery Reserve full bodies.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — wrapped enum metadata includes `storylet_pool_authoring`.

### Commands

1. `cd tools/world-mcp && npm test`
2. `rg -n "task_type='other'|MCPENH-013" .claude/skills/storylet-pool-authoring/SKILL.md`
3. `rg -n "storylet_pool_authoring" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/storylet-pool-authoring/SKILL.md`

## Outcome

Completed on 2026-05-02.

- Added `storylet_pool_authoring` to the `tools/world-mcp` task-type tuple, ranking profile registry, default-budget table, governing-world-context metadata, full-body delivery rules, and reserve full-body policy.
- Added a storylet-pool-authoring ranking profile tuned toward premise-relevant CFs, governing invariant and Mystery Reserve records, named-entity locality, section context, scoped references, and firewall edges.
- Removed `.claude/skills/storylet-pool-authoring/SKILL.md` fallback/debt prose for `task_type='other'` and MCPENH-013.
- Updated package/repo docs that enumerate context-packet default budgets, reserve full-body task types, full-body candidates, and story-family task profiles.
- Added package-local tests for profile/default-budget coverage, context-packet acceptance, reserve full-body behavior, and in-memory MCP enum exposure.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed; package build succeeded and Node test suite reported 278 passing tests, 0 failures.
2. `rg -n "task_type='other'|MCPENH-013" .claude/skills/storylet-pool-authoring/SKILL.md` — returned no hits.
3. `rg -n "storylet_pool_authoring" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/storylet-pool-authoring/SKILL.md` — returned hits in the package registries, tests, docs, and consuming skill.

Package ignored artifacts were present before verification (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). `npm test` rebuilt `dist/`; this is expected generated ignored state.

## Deviations

- `docs/CONTEXT-PACKET-CONTRACT.md` was added to the landed file set because it is a live same-seam context-packet contract surface.
- The package-local proof uses built handler/tests and in-memory MCP dispatch metadata rather than direct external `mcp__worldloom__get_context_packet(...)`, which is the truthful Codex proof surface for source changes before any deployed MCP server restart.
