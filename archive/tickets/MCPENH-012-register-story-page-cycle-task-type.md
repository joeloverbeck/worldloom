# MCPENH-012: Register `story_page_cycle` task type for context-packet retrieval

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (`TaskType` tuple, context-packet ranking/default-budget/governing/full-body registries, tests, docs), `.claude/skills/branching-story-page-cycle/SKILL.md` (`task_type='other'` fallback removed)
**Deps**: archive/tickets/MCPENH-009-register-story-bootstrap-task-type.md (story_bootstrap task type precedent)

## Problem

At intake, `branching-story-page-cycle` Pre-flight loaded premise-and-state-bounded world canon via `mcp__worldloom__get_context_packet(world_slug, task_type='story_page_cycle', seed_nodes=[...], token_budget=18000)`, but the `task_type='story_page_cycle'` profile was not registered in the context-packet retrieval profile registry. Until this ticket landed, the skill shipped with `task_type='other'` as a fallback (per Shape A integration posture).

The fallback worked (the skill assembled seed nodes explicitly and `task_type='other'` returned a generic packet), but lost the per-task-class prioritization that the registered profile now encodes — specifically:

- World-canon CFs scoped to `seed_nodes` (cast_present STENT.world_ent_id resolution + parent_page.current_location + active period)
- INV records governing the seed scope (subset of the whole-class load — the page-cycle still does whole-class loading separately, but a packet-level INV layer would prioritize governing INVs near the top of the budget)
- Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same logic as INV)
- Named-entity neighbors of seeds (one-hop relation resolution)
- WORLD_KERNEL summary + ONTOLOGY governing context (top-of-packet always)

Without a registered profile, the page-cycle's runtime context retrieval was shaped by `task_type='other'`'s generic priorities, which over-fetched peripheral records and under-prioritized the cast-and-location-scoped CF/INV/M layer the runtime actually needs.

## Assumption Reassessment (2026-05-02)

1. The live task-type profile registry is split across `tools/world-mcp/src/ranking/profiles/index.ts` (`TASK_TYPES`, `rankingProfilesByTaskType`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`), `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (same-family profile definitions), `tools/world-mcp/src/context-packet/governing-world-context.ts`, `tools/world-mcp/src/context-packet/full-body-delivery.ts`, and `tools/world-mcp/src/context-packet/shared.ts`. The drafted `tools/world-mcp/src/context-packet/profiles/` path does not exist.
2. Archived MCPENH-009 is the structural precedent. It registered `story_bootstrap` in the TaskType tuple, ranking registry, default-budget table, governing-world-context metadata, full-body delivery rules, reserve-policy table, package tests, package README, `docs/MACHINE-FACING-LAYER.md`, and the consuming skill. This ticket follows the same lockstep registration pattern for `story_page_cycle`.
3. The shared boundary under audit is the contract between (a) `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight retrieval, (b) the `tools/world-mcp` `get_context_packet` task-type enum/profile/provider surface, and (c) the page-cycle's downstream Phase 4 / Phase 7 / Phase 9 consumers (which read CF / INV / M / ENT records identified by the packet).
4. **FOUNDATIONS principle**: §Tooling Recommendation's "non-negotiable" load discipline. The recommendation says "skills should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + Invariants + relevant CFs + affected domain files + unresolved contradictions list + Mystery Reserve entries touching the same domain." The registered profile is what makes the recommendation operational for this skill's task class.
5. This ticket does NOT touch HARD-GATE semantics. It tunes retrieval prioritization within an existing read mechanism.
6. Added a single profile entry; did not modify the retrieval API shape. Additive-only. Consumers of `task_type='other'` are unaffected.
7. No skill / tool / hook / validator / schema field was renamed or removed.
8. Same-seam required fallout: the skill contained two `task_type='other'` fallback disclosures and a Guardrails debt bullet naming `tickets/MCPENH-012`. Those were reverted to registered-profile wording in this ticket.
9. Verification boundary correction: direct external `mcp__worldloom__get_context_packet(...)` is not exposed as a fresh post-source-edit proof in this Codex session. Acceptance uses package-local build/tests plus in-memory MCP dispatch/capability metadata as the truthful source-change proof, with direct external MCP smoke left as post-restart operational validation.

## Architecture Check

1. Per-task-class profiles are the right primitive (vs a one-size-fits-all retrieval). The packet shape and prioritization are task-specific by design — `propose_new_canon_facts` retrieves differently than `story_bootstrap` differently than `story_page_cycle`. The MCPENH-009 precedent established the pattern; this ticket continues it.
2. No backwards-compatibility aliasing: a new profile entry is added; nothing is renamed.

## Verification Layers

1. **Profile-registry package proof** — `tools/world-mcp/tests/ranking/profile-overrides.test.ts`, `tools/world-mcp/tests/tools/get-context-packet.test.ts`, `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts`, and `tools/world-mcp/tests/server/dispatch.test.ts` assert `task_type='story_page_cycle'` is registered, uses an 18000 default budget, reserves governing full bodies, includes latest CH audit-trail context, and appears in wrapped MCP enum metadata.
2. **Skill contract check** — `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight now uses `task_type='story_page_cycle'` without `task_type='other'` fallback prose or active MCPENH-012 debt.
3. **Docs/contract check** — `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` enumerate the new default budget and reserve-policy behavior.

## Landed Changes

### 1. Task-type registration

Registered `story_page_cycle` in the existing `tools/world-mcp` task-type registries with prioritization:

- **Top layer** (always included): `WORLD_KERNEL` summary + `ONTOLOGY` Categories + Relation Types in use.
- **Layer 1**: CFs reachable from `seed_nodes` (cast_present's world ENT ids + parent_page.current_location + active period). Hard-canon CFs prioritized over derived/soft.
- **Layer 2**: INV records governing the seed-scoped CFs (subset of the whole-class load — top-of-packet placement so the runtime has the most-relevant INVs available before falling back to whole-class).
- **Layer 3**: Mystery Reserve records orbiting the seed scope (subset of the whole-class load — same top-of-packet logic).
- **Layer 4**: Named-entity neighbors of seeds (one-hop graph traversal).
- **Layer 5** (audit-trail): the latest `CH-NNNN` record from `_source/change-log/` so the page can record `state_snapshot.canon_revision`.

### 2. Profile documentation

Updated `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` where they enumerate context-packet task types, default budgets, and reserve governing full-body task types.

### 3. Skill fallback removal

Removed the deferred-MCPENH-012 disclosure and the `task_type='other'` fallback prose from `branching-story-page-cycle` SKILL.md.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — TaskType tuple + profile registration + default budget)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — story_page_cycle ranking profile)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — task metadata, governing atomic node types, latest CH inclusion)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — full-body priority for story_page_cycle)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — reserve full-body priority for story_page_cycle)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — accepted task/default-budget coverage)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — reserve full-body coverage)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify — non-default profile/default-budget coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — schema enum/capability coverage)
- `tools/world-mcp/README.md` (modify — task/default-budget/reserve-policy docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — task/default-budget/reserve-policy docs)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add `story_page_cycle` profile section)
- `.claude/skills/branching-story-page-cycle/SKILL.md` (modify — fallback removal)

## Out of Scope

- Adding profiles for `storylet-pool-authoring`, `story-fact-promotion-to-canon`, or `branching-story-health-audit` — those skills don't exist yet; their profiles ship with their generation.
- Optimizing the whole-class M / INV loads — those remain whole-class for the page-cycle's class-bounded firewall semantics, separate from the packet's prioritization layer.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes after adding `story_page_cycle` to the package registries, default-budget coverage, reserve full-body coverage, and in-memory MCP dispatch/capability enum coverage.
2. Package-local `getContextPacket(...)` accepts `task_type='story_page_cycle'`, defaults omitted `token_budget` to `18000`, reserves governing invariant and Mystery Reserve full bodies, and includes the latest `change_log_entry` node in governing context when present.
3. `.claude/skills/branching-story-page-cycle/SKILL.md` Pre-flight retrieval uses `task_type='story_page_cycle'` without a `task_type='other'` fallback or active MCPENH-012 debt note.

### Invariants

1. The registered profile is additive — consumers using `task_type='other'` continue to receive the generic packet shape.
2. No story-bundle records are loaded by the packet (the packet returns world-canon only; story-bundle records are direct-Read by the skill itself).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — `story_page_cycle` accepted-task/default-budget/latest-CH coverage.
2. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — reserve-policy coverage for governing invariant and Mystery Reserve full bodies.
3. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — non-default ranking profile and 18000 default-budget assertion.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — wrapped enum metadata includes `story_page_cycle`.

### Commands

1. `cd tools/world-mcp && npm test`
2. `rg -n "story_page_cycle" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/branching-story-page-cycle/SKILL.md`
3. `rg -n "task_type='other'|MCPENH-012" .claude/skills/branching-story-page-cycle/SKILL.md`

## Outcome

Completed on 2026-05-02.

- Added `story_page_cycle` to the `tools/world-mcp` task-type tuple, ranking profile registry, default-budget table, governing-world-context metadata, full-body delivery rules, and reserve full-body policy.
- Added a story-page-cycle ranking profile tuned toward seed-scoped canon facts, governing invariant and Mystery Reserve records, named-entity locality, section context, and recent change-log context.
- Added governing-context inclusion for the latest `change_log_entry` node when a `story_page_cycle` packet is assembled.
- Removed `.claude/skills/branching-story-page-cycle/SKILL.md` fallback/debt prose for `task_type='other'` and `tickets/MCPENH-012`.
- Updated package/repo docs that enumerate context-packet default budgets and reserve full-body task types.
- Added package-local tests for profile/default-budget coverage, latest-CH inclusion, reserve full-body behavior, and in-memory MCP enum exposure.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed; package build succeeded and Node test suite reported 277 passing tests, 0 failures.
2. `rg -n "story_page_cycle" tools/world-mcp/src tools/world-mcp/tests tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md docs/CONTEXT-PACKET-CONTRACT.md .claude/skills/branching-story-page-cycle/SKILL.md` — returned hits in the package registries, tests, docs, and consuming skill.
3. `rg -n "task_type='other'|MCPENH-012" .claude/skills/branching-story-page-cycle/SKILL.md` — returned no hits.
4. Same-seam metadata sweep over `tools/world-mcp/src/server.ts`, `docs/WORKFLOWS.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `docs/CONTEXT-PACKET-CONTRACT.md` found no stale same-seam omission requiring another edit; server enum/capability metadata is derived from `TASK_TYPES` and covered by `tools/world-mcp/tests/server/dispatch.test.ts`.

Package ignored artifacts were present before verification (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). `npm test` rebuilt `dist/`; this is expected generated ignored state.

## Deviations

- The live registry path is `tools/world-mcp/src/ranking/profiles/index.ts`, not the drafted `tools/world-mcp/src/context-packet/profiles/` directory.
- The package-local proof uses built handler/tests and in-memory MCP dispatch metadata rather than direct external `mcp__worldloom__get_context_packet(...)`, which is the truthful Codex proof surface for source changes before any deployed MCP server restart.
