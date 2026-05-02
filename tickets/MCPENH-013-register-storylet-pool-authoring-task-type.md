# MCPENH-013: Register `storylet_pool_authoring` task type for context-packet retrieval

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (`TaskType` tuple, context-packet ranking/default-budget/governing/full-body registries, tests, README), `.claude/skills/storylet-pool-authoring/SKILL.md` (`task_type='other'` fallback removed)
**Deps**: archive/tickets/MCPENH-009-register-story-bootstrap-task-type.md, archive/tickets/MCPENH-012-register-story-page-cycle-task-type.md (precedents)

## Problem

`.claude/skills/storylet-pool-authoring` Pre-flight loads premise-bounded world canon via `mcp__worldloom__get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)`, but the `task_type='storylet_pool_authoring'` profile is not registered in the context-packet retrieval profile registry. The skill ships with `task_type='other'` as a fallback (Shape A integration posture).

The fallback is correct (the skill assembles seed nodes explicitly — `STORY_KERNEL.cast_bind_list` STENT.world_ent_id resolution + recent-history-named entities + active period — so `task_type='other'` returns a generic packet that includes them). What it loses is the per-task-class prioritization that a registered profile would encode:

- World-canon CFs scoped to `seed_nodes`, prioritizing CFs that orbit cast and active period (storylet authoring is premise-relevant, not whole-world)
- INV records governing the seed scope (subset of the whole-class load — the skill still does whole-class loading separately, but a packet-level INV layer would prioritize governing INVs near the top of the budget)
- Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same logic as INV; mystery firewall and per-claim resolution-authority routing are key Phase 4 gates)
- Named-entity neighbors of seeds (one-hop relation resolution — relevant for cast-driven shape weighting in Phase 2)
- WORLD_KERNEL summary + ONTOLOGY governing context (top-of-packet always)

Without a registered profile, retrieval prioritization comes from `task_type='other'`'s generic priorities, which over-fetch peripheral records and under-prioritize the cast-and-mystery-scoped CF/INV/M layer Phase 1 / Phase 2 / Phase 4 actually need.

## Assumption Reassessment (2026-05-02)

1. The live task-type profile registry is split across `tools/world-mcp/src/ranking/profiles/index.ts` (`TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`), `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (same-family profile definitions), `tools/world-mcp/src/context-packet/governing-world-context.ts`, `tools/world-mcp/src/context-packet/full-body-delivery.ts`, and `tools/world-mcp/src/context-packet/shared.ts`. MCPENH-012's archive ticket confirmed these locations on 2026-05-02.
2. Archived MCPENH-009 (`story_bootstrap`) and MCPENH-012 (`story_page_cycle`) are the structural precedents. They registered each task type in the TaskType tuple, ranking registry, default-budget table, governing-world-context metadata, full-body delivery rules, reserve-policy table, package tests, package README, `docs/MACHINE-FACING-LAYER.md`, and the consuming skill. This ticket follows the same lockstep registration pattern for `storylet_pool_authoring`.
3. The shared boundary under audit is the contract between (a) `.claude/skills/storylet-pool-authoring/SKILL.md` Pre-flight retrieval, (b) the `tools/world-mcp` `get_context_packet` task-type enum/profile/provider surface, and (c) the storylet-authoring Phase 1 / Phase 2 / Phase 4 consumers (which read CF / INV / M / ENT records identified by the packet to drive coverage diagnosis, seed shape weighting, and mystery firewall).
4. **FOUNDATIONS principle**: §Tooling Recommendation's "non-negotiable" load discipline. The recommendation says "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + Invariants + relevant CFs + affected domain files + unresolved contradictions list + Mystery Reserve entries touching the same domain." The registered profile is what makes the recommendation operational for this skill's task class, parallel to MCPENH-009 / MCPENH-012's contribution for the bootstrap and page-cycle skills.
5. This ticket does NOT touch HARD-GATE semantics. It tunes retrieval prioritization within an existing read mechanism. The HARD-GATE for `storylet-pool-authoring` (Phase 6 batch deliverable approval) is independent of retrieval profile registration.
6. Adds a single profile entry; does not modify the retrieval API shape. Additive-only. Consumers of `task_type='other'` are unaffected. Consumers of existing `story_bootstrap` and `story_page_cycle` profiles are unaffected.
7. No skill / tool / hook / validator / schema field is renamed or removed.
8. Same-seam required fallout: `.claude/skills/storylet-pool-authoring/SKILL.md` contains a `task_type='other'` fallback disclosure in §World-State Prerequisites (the "Until the registration ticket lands" paragraph) and a Pre-flight fallback line ("Until the registration ticket lands: substitute task_type='other'") plus a Guardrails debt bullet naming this ticket. Those will be reverted to registered-profile wording when this ticket lands.

## Architecture Check

1. Per-task-class profiles are the right primitive (vs a one-size-fits-all retrieval). The packet shape and prioritization are task-specific by design — `propose_new_canon_facts` retrieves differently than `story_bootstrap` differently than `story_page_cycle` differently than `storylet_pool_authoring`. The MCPENH-009 / MCPENH-012 precedents established the pattern; this ticket continues it for the next consuming skill.
2. No backwards-compatibility aliasing: a new profile entry is added; nothing is renamed.

## Verification Layers

1. **Profile registration unit tests** — `tools/world-mcp` package tests assert `TASK_TYPES` includes `'storylet_pool_authoring'`, `rankingProfilesByTaskType['storylet_pool_authoring']` returns the registered profile, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE['storylet_pool_authoring']` returns the documented default (suggested 18000 — same as `story_bootstrap` and `story_page_cycle` precedent), and `governing-world-context.ts` + `full-body-delivery.ts` + reserve-policy table all have entries.
2. **MCP dispatch tests** — wrapped MCP input schema accepts `task_type='storylet_pool_authoring'`, dispatches to the registered profile path, and returns a packet whose top-budget layers are CF/INV/M scoped by seed_nodes (parallel to MCPENH-009/-012 dispatch tests).
3. **Skill prose grep/manual review** — `.claude/skills/storylet-pool-authoring/SKILL.md` switches from `task_type='other'` fallback prose to registered-profile wording: `task_type='storylet_pool_authoring'` is the always-call value (no fallback paragraph), the §World-State Prerequisites "task_type registration debt" paragraph is removed, the Pre-flight "Until the registration ticket lands" line is removed, the Guardrails MCPENH-013 bullet is removed.
4. **README + docs update** — `tools/world-mcp/README.md` task-types table gains a `storylet_pool_authoring` row; `docs/MACHINE-FACING-LAYER.md` task-types catalog gains a `storylet_pool_authoring` row (parallel to the MCPENH-009/-012 README/docs updates).

## What to Change

### 1. Register the task type

Add `'storylet_pool_authoring'` to the `TASK_TYPES` tuple in `tools/world-mcp/src/ranking/profiles/index.ts`. Add a profile entry to `rankingProfilesByTaskType` and to `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (or whichever profile family file matches its retrieval shape — story-family is the right fit given precedent).

### 2. Set default token budget

Add `'storylet_pool_authoring': 18000` to `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` (matching MCPENH-009 and MCPENH-012 precedent — the storylet skill's seed-node assembly is comparably premise-bounded).

### 3. Add governing-world-context entry

`tools/world-mcp/src/context-packet/governing-world-context.ts` gains a `storylet_pool_authoring` entry naming the WORLD_KERNEL summary slot, ONTOLOGY summary slot, and which top-of-packet records the profile should always include (suggested: governing INVs that orbit cast, mystery-reserve M records orbiting cast, and CFs marking `mysteries_in_play` referenced records).

### 4. Add full-body delivery entry

`tools/world-mcp/src/context-packet/full-body-delivery.ts` gains a `storylet_pool_authoring` entry. Per the gate-1 / gate-2 / gate-3 whole-class reads in `.claude/skills/storylet-pool-authoring`, the packet does NOT need to deliver every M or every INV at full body (those come from `list_records(... include_full_body=true)` separately). Full bodies should be reserved for the cast-and-period-scoped CF subset that storylet authoring's Phase 3 LLM prompts inline directly.

### 5. Add reserve-policy entry

`tools/world-mcp/src/context-packet/shared.ts` reserve-policy table gains a `storylet_pool_authoring` entry mirroring `story_bootstrap`'s shape (cast-and-premise-bounded with mystery-edge reserve).

### 6. Tests

`tools/world-mcp/test/` package tests gain coverage parallel to MCPENH-009/-012's test additions: dispatch on `task_type='storylet_pool_authoring'`, profile lookup, default budget, governing-context inclusion, full-body delivery, reserve policy.

### 7. Skill prose revert

`.claude/skills/storylet-pool-authoring/SKILL.md`:

- §World-State Prerequisites: remove the "task_type registration debt" paragraph.
- §Pre-flight Check: remove the "Until the registration ticket lands: substitute `task_type='other'`" line.
- §Guardrails > Known integration debt: remove the MCPENH-013 bullet.
- §FOUNDATIONS Alignment > Tooling Recommendation row: remove the "with `task_type='other'` fallback until the registered profile lands" parenthetical.

### 8. Docs

`tools/world-mcp/README.md`: add the new task type to the task-types table.

`docs/MACHINE-FACING-LAYER.md`: add the new task type to the task-types catalog (parallel to the entries for `story_bootstrap` and `story_page_cycle`).

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify; or whichever profile-family file matches)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify; reserve-policy)
- `tools/world-mcp/test/` various (modify; add dispatch + profile-lookup tests)
- `tools/world-mcp/README.md` (modify; add task-types table row)
- `docs/MACHINE-FACING-LAYER.md` (modify; add task-types catalog row)
- `.claude/skills/storylet-pool-authoring/SKILL.md` (modify; revert fallback prose)

## Out of Scope

- Patch-engine ops for SLT/SLB records (separate Shape-A-future ticket; not blocked by this one).
- Validator framework integration for SLT/SLB records (separate Shape-A-future ticket).
- `branching-story-health-audit` skill (the deferred sibling that audit-mode aborts on; outside this ticket's scope).
- BSBOOT-002 / BSPAG-001 (the post-shipping reverse-seam tickets for bootstrap and page-cycle).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — passes including new `storylet_pool_authoring` profile-lookup and dispatch tests.
2. Grep proof: `grep -n "task_type='other'" .claude/skills/storylet-pool-authoring/SKILL.md` returns zero hits after the prose revert.
3. Grep proof: `grep -n "MCPENH-013" .claude/skills/storylet-pool-authoring/SKILL.md` returns zero hits after the prose revert.

### Invariants

1. `TASK_TYPES` is alphabetically sorted (or follows the existing convention in the file) after the addition.
2. The new profile's `default_token_budget` matches the storylet-pool-authoring SKILL.md's documented `token_budget=18000`.
3. Direct external `mcp__worldloom__get_context_packet(world_slug=<any>, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)` returns a non-error packet whose top layer is the registered profile's governing-context (not the generic-other fallback).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/ranking/profiles/index.test.ts` — assertion that `TASK_TYPES` includes `'storylet_pool_authoring'` and `rankingProfilesByTaskType['storylet_pool_authoring']` returns the registered profile.
2. `tools/world-mcp/test/context-packet/governing-world-context.test.ts` — `getGoverningContext('storylet_pool_authoring', ...)` returns the documented top-of-packet shape.
3. `tools/world-mcp/test/server.test.ts` — MCP dispatch test: `get_context_packet({task_type: 'storylet_pool_authoring', ...})` returns a packet whose `delivery_status` is `complete` for representative seed_nodes and a budget of 18000.

### Commands

1. `cd tools/world-mcp && npm test` — full package test suite.
2. `grep -n "task_type='other'\\|MCPENH-013" .claude/skills/storylet-pool-authoring/SKILL.md` — should return zero lines after the revert.
