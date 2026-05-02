# MCPENH-009: Register `story_bootstrap` task_type in get_context_packet

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` (TaskType tuple extension + ranking profile + default budget); `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (story_bootstrap ranking profile, co-located with adjacent canon-reading profiles); `tools/world-mcp/src/context-packet/governing-world-context.ts` (`GOVERNING_FILE_PATHS` / `ACTIVE_RULES` / `REQUIRED_OUTPUT_SCHEMA` / `PROHIBITED_MOVES` / `GOVERNING_ATOMIC_NODE_TYPES` entries); `tools/world-mcp/src/context-packet/full-body-delivery.ts` (full-body priority); `tools/world-mcp/src/context-packet/shared.ts` (`GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE` reserve membership); package-local tests; `.claude/skills/branching-story-bootstrap/SKILL.md` (Pre-flight + §World-State Prerequisites: change `task_type='other'` to `task_type='story_bootstrap'`; remove deferred-disclosure prose); `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (TaskType/default-budget enumeration update).
**Deps**: archive/tickets/MCPENH-002-canon-pipeline-adjacent-task-types.md (registered the canon-pipeline-adjacent task_types and established the registration pattern); archive/tickets/MCPENH-005.md (precedent for emergent_pressure_events registration); the `branching-story-bootstrap` skill (consumer; shipped against `task_type='other'` at intake).

## Problem

At intake (2026-05-02), `mcp__worldloom__get_context_packet` did not accept `story_bootstrap` as a `task_type` value. The live `TaskType` tuple at `tools/world-mcp/src/ranking/profiles/index.ts` and the supporting context-packet registries (`GOVERNING_FILE_PATHS`, `ACTIVE_RULES`, `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_ATOMIC_NODE_TYPES`, `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`) did not enumerate `story_bootstrap`.

The `branching-story-bootstrap` skill (created 2026-05-02 from `archive/brainstorming/branching-story-bootstrap.md`) shipped its Pre-flight retrieval against `task_type='other'` with an inline deferred-disclosure pointing at this ticket. At intake, the Shape A integration posture in the skill's Guardrails was explicit:

> `MCPENH-009: Register story_bootstrap task_type in get_context_packet` — when landed, change Pre-flight's `task_type='other'` to `task_type='story_bootstrap'`.

`task_type='other'` was a correct fallback per the gap-filler interview's §Context-packet `task_type` registration, but it lost the skill-specific governing-world-context priority + full-body delivery defaults that a registered profile applies. For a bootstrap whose entire job is respecting world canon, retrieval quality is correctness-adjacent: the wrong CFs / INVs / M records loaded at Pre-flight cascade into Phase 4 firewall + Invariant Audit failures the skill would otherwise have caught.

The gap was structurally identical to MCPENH-002 (canon-pipeline-adjacent task_types) and MCPENH-005 (emergent_pressure_events) — additive registration of a new task-specific profile against the existing TaskType infrastructure.

## Assumption Reassessment (2026-05-02)

1. The TaskType union and registries are split across (a) `tools/world-mcp/src/ranking/profiles/index.ts` (tuple + ranking weights + `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`), (b) `tools/world-mcp/src/context-packet/governing-world-context.ts` (`GOVERNING_FILE_PATHS`, `ACTIVE_RULES`, `REQUIRED_OUTPUT_SCHEMA`, `PROHIBITED_MOVES`, `GOVERNING_ATOMIC_NODE_TYPES`), (c) `tools/world-mcp/src/context-packet/full-body-delivery.ts` (full-body priority order per task), and (d) `tools/world-mcp/src/context-packet/shared.ts` (`GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE` reserve/opportunistic membership policy). The earlier draft's `tools/world-mcp/src/ranking/profiles.ts` and `tools/world-mcp/src/context-packet/assemble.ts` default-budget edit target are stale; `assemble.ts` consumes the ranking registry but does not own the default table.
2. `story_bootstrap` is a single-world canon-reading task. Its retrieval profile prioritizes (in order): Mystery Reserve full-body (Rule 7 firewall whole-class; the Pre-flight `list_records` whole-class load also covers this — but the packet should still surface relevant M-records in `governing_world_context`); invariant full-body (Rule 4 audit; same dual-load relationship; live node type is `invariant`, not `invariant_record`); seed-touched canon facts (Phase 3 World-Fact Import bounded by cast/location/period); seed-touched section records (premise-period TIMELINE entries, premise-location GEOGRAPHY/INSTITUTIONS entries); named-entity neighbors for cast `current_location` and `place_of_origin` resolution.
3. Cross-skill / cross-tool boundary under audit: the contract between (a) the `branching-story-bootstrap` skill (consumer of `get_context_packet`) and (b) `tools/world-mcp/src/context-packet/*` (provider). The shared schema is the `task_type` enum and the per-task ranking profile + governing-world-context registries. At intake, the skill's Pre-flight prose documents the `task_type='other'` fallback and a forward-note pointing at this ticket; the post-implementation skill text reverts to `task_type='story_bootstrap'` as primary.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain." Without a registered profile, the `branching-story-bootstrap` skill's Pre-flight retrieval falls back to the generic `'other'` ranking — which under-prioritizes the M / INV / domain-touched-CF surfaces that Phase 4 (Mystery Firewall + Invariant Audit) and Phase 3 (World-Fact Import) require.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. Retrieval-side enhancement only; the skill's Phase 4 firewall + Phase 9 gate 1 enforcement surfaces are unchanged.
6. Not applicable — no existing output schema (CF / CH / proposal card / dossier / artifact / EPE card / sidecar / batch manifest) is extended. The change is purely on the retrieval-profile registration surface.
7. The change adds one task_type value (`story_bootstrap`); it does not rename or remove any existing value. Blast radius scan over `tools/world-mcp`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and `.claude/skills/branching-story-bootstrap` shows the same-seam surfaces: task tuple/profile/default budget, governing-context metadata, full-body reserve policy, README/doc default-budget prose, and the untracked `branching-story-bootstrap` skill's `task_type='other'` fallback plus MCPENH-009 Guardrails note.
8. Adjacent contradiction surfaced during reassessment: the skill shipped with the `task_type='other'` fallback as the inline primary call. The implementation reverted the skill's Pre-flight + §World-State Prerequisites to `task_type='story_bootstrap'` as the primary and removed the deferred-disclosure prose. That revert was a required consequence of this ticket and is captured in §Files to Touch.
9. Dirty-worktree classification: `.claude/skills/branching-story-bootstrap/`, the then-active `tickets/MCPENH-009-register-story-bootstrap-task-type.md`, and `tickets/MCPENH-010-add-story-id-class-to-allocator.md` were already untracked at intake; this ticket owns the MCPENH-009 ticket text and only the task_type-related hunks in the untracked branching-story-bootstrap skill. `MCPENH-010` remains sibling scope, and the pre-existing `brainstorming/branching-story-bootstrap.md` -> `archive/brainstorming/branching-story-bootstrap.md` rename remains outside this ticket.

## Architecture Check

1. Adding `story_bootstrap` to the existing TaskType registries is the minimal change preserving the context-packet contract. Each registry entry is additive — existing consumers of `get_context_packet` are unaffected; no aliasing, no deprecation period required. The generic `task_type='other'` path remains available for genuinely unclassified tasks.
2. No backwards-compatibility shims. The five-registry lockstep is the existing pattern (per MCPENH-002 / MCPENH-005); this ticket follows it without introducing a new abstraction.

## Verification Layers

1. The `TaskType` tuple includes `'story_bootstrap'` after the change -> codebase grep-proof: `rg -n "story_bootstrap" tools/world-mcp/src/ranking/profiles tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` returns hits in the registry, reserve-policy, and docs surfaces.
2. Package-local `getContextPacket(...)` accepts `task_type='story_bootstrap'` and applies the 18000 default budget -> `tools/world-mcp/tests/tools/get-context-packet.test.ts`.
3. The MCP server's wrapped input-schema metadata includes `'story_bootstrap'` in the `get_context_packet.task_type` enum -> in-memory MCP server dispatch coverage in `tools/world-mcp/tests/server/dispatch.test.ts`.
4. `story_bootstrap` reserves governing invariant + Mystery Reserve full bodies -> `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts`.
5. `.claude/skills/branching-story-bootstrap/SKILL.md` Pre-flight + §World-State Prerequisites no longer reference `task_type='other'` as primary -> grep-proof: `rg -n "task_type='other'" .claude/skills/branching-story-bootstrap/SKILL.md` returns no hits, and `rg -n "task_type='story_bootstrap'|MCPENH-009" .claude/skills/branching-story-bootstrap/SKILL.md` returns only the registered-profile note and the two primary calls.

## Landed Changes

### 1. Register the task_type

In `tools/world-mcp/src/ranking/profiles/index.ts` and `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts`:
- Extended the `TaskType` tuple with `'story_bootstrap'`.
- Added `storyBootstrapRankingProfile` with boosted Mystery Reserve, invariant, canon fact, section, named-entity, character, and locality edge weights.

### 2. Register the governing-world-context entries

In `tools/world-mcp/src/context-packet/governing-world-context.ts`:
- Added `GOVERNING_FILE_PATHS['story_bootstrap']` for `WORLD_KERNEL.md`, `ONTOLOGY.md`, and the seven primary domain section paths.
- Added `ACTIVE_RULES['story_bootstrap']`, `REQUIRED_OUTPUT_SCHEMA['story_bootstrap']`, and `PROHIBITED_MOVES['story_bootstrap']` matching the story-local, canon-read-only skill contract.
- Added `GOVERNING_ATOMIC_NODE_TYPES['story_bootstrap']`: `['invariant', 'mystery_reserve_entry']`.

### 3. Register full-body delivery + opportunistic priority

In `tools/world-mcp/src/context-packet/full-body-delivery.ts`:
- Added a `story_bootstrap` entry prioritizing full-body delivery for `invariant` + `mystery_reserve_entry`.

In `tools/world-mcp/src/context-packet/shared.ts`:
- Added `story_bootstrap: { invariants: 'reserve', mystery_reserve: 'reserve' }` to `GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE`.

### 4. Register the per-task token budget default

In `tools/world-mcp/src/ranking/profiles/index.ts`:
- Added `'story_bootstrap': 18000` to `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`.

### 5. Revert the skill's deferred-disclosure framing

In `.claude/skills/branching-story-bootstrap/SKILL.md`:
- Replaced the `task_type='other'` deferred-disclosure paragraph with registered-profile language citing MCPENH-009.
- Changed the Pre-flight context-packet call to `task_type='story_bootstrap'`.
- Removed the MCPENH-009 deferred-debt Guardrails bullet.

### 6. Update tests

- Extended `tools/world-mcp/tests/tools/get-context-packet.test.ts` for `story_bootstrap` accepted-task/default-budget coverage.
- Extended `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` for reserved governing invariant + Mystery Reserve full bodies.
- Extended `tools/world-mcp/tests/ranking/profile-overrides.test.ts` for non-default profile and budget assertions.
- Extended `tools/world-mcp/tests/server/dispatch.test.ts` to assert the wrapped enum includes `story_bootstrap`.

### 7. README pointer

`tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` now list the `story_bootstrap: 18000` default and its reserve full-body policy.

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — TaskType tuple extension + ranking profile registration + default budget)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (modify — story_bootstrap ranking profile)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — GOVERNING_FILE_PATHS / ACTIVE_RULES / REQUIRED_OUTPUT_SCHEMA / PROHIBITED_MOVES / GOVERNING_ATOMIC_NODE_TYPES)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (modify — full-body priority for story_bootstrap)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — GOVERNING_FULL_BODY_PRIORITY_BY_TASK_TYPE reserve membership)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — reserve full-body coverage)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify — non-default profile + default budget assertion)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — schema-acceptance coverage)
- `tools/world-mcp/README.md` (modify — TaskType enumeration update)
- `docs/MACHINE-FACING-LAYER.md` (modify — TaskType/default-budget enumeration update)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Pre-flight + §World-State Prerequisites revert; §Guardrails entry removal)

## Out of Scope

- Adding any other task_type. `story_bootstrap` is the only task_type the active codebase emits without registered profile coverage as of 2026-05-02.
- The `STORY` id_class allocator extension (separate ticket: MCPENH-010).
- Per-story-scoped allocator classes (STENT, SF, SE, etc.) — deferred until the runtime page-cycle stabilizes the schemas (per the skill's Guardrails).
- Hook 3 namespace extension to `worlds/<slug>/stories/<slug>/_source/` — deferred until engine ops for story records exist.
- Patch engine ops for story records — deferred until the runtime page-cycle stabilizes the schemas.
- Validators for story-record schemas — deferred until the runtime page-cycle stabilizes the schemas.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "story_bootstrap" tools/world-mcp/src/ranking/profiles tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts tools/world-mcp/src/context-packet/shared.ts` returns hits in all four registry surfaces.
2. The package-local context-packet/default-budget coverage for `story_bootstrap` passes.
3. The in-memory MCP server dispatch test passes — `'story_bootstrap'` is present in the wrapped input-schema enum, and profile tests prove it does not route to the `'other'` fallback.
4. `rg -n "task_type='other'" .claude/skills/branching-story-bootstrap/SKILL.md` returns zero hits after the skill revert.
5. `npm test` (or the per-package equivalent) passes for `tools/world-mcp/`.

### Invariants

1. The five-registry lockstep is preserved — every existing task_type still has entries in all five registries; no registry entry references a task_type that does not exist in the union.
2. `task_type='other'` continues to function as a generic fallback for genuinely unclassified tasks.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — `story_bootstrap` accepted-task/default-budget coverage.
2. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` — reserve-policy coverage for governing invariant and Mystery Reserve full bodies.
3. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — non-default ranking profile and 18000 default-budget assertion.
4. `tools/world-mcp/tests/server/dispatch.test.ts` — wrapped enum metadata includes `story_bootstrap`.

### Commands

1. `cd tools/world-mcp && npm test`
2. `rg -n "story_bootstrap" tools/world-mcp/src/ tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md`
3. `rg -n "task_type='other'" .claude/skills/branching-story-bootstrap/SKILL.md`

## Outcome

Completed on 2026-05-02.

- Added `story_bootstrap` to the `tools/world-mcp` task-type tuple, ranking profile registry, default-budget table, governing-world-context metadata, full-body delivery rules, and reserve full-body policy.
- Added a story-bootstrap ranking profile tuned toward Mystery Reserve, invariants, canon facts, section context, named entities, character-locality edges, scoped references, and firewall edges.
- Reverted `.claude/skills/branching-story-bootstrap/SKILL.md` from the `task_type='other'` fallback to `task_type='story_bootstrap'` and removed the MCPENH-009 deferred integration debt.
- Updated package/repo docs that enumerate context-packet default budgets and reserve full-body task types.
- Added package-local tests for the profile/default budget, context-packet acceptance, reserve full-body behavior, and in-memory MCP enum exposure.

## Verification Result

1. `cd tools/world-mcp && npm test` — passed; package build succeeded and Node test suite reported 267 passing tests, 0 failures.
2. `rg -n "story_bootstrap" tools/world-mcp/src/ranking/profiles tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/context-packet/full-body-delivery.ts tools/world-mcp/src/context-packet/shared.ts tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` — returned hits in the registry, governing context, full-body policy, and docs surfaces.
3. `rg -n "task_type='other'" .claude/skills/branching-story-bootstrap/SKILL.md` — returned no hits.
4. `rg -n "task_type='story_bootstrap'|MCPENH-009" .claude/skills/branching-story-bootstrap/SKILL.md` — returned the two primary context-packet call sites and the registered-profile note.

Package ignored artifacts were present before verification (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). `npm test` rebuilt `dist/`; this is expected generated ignored state.

## Deviations

- The live registry path is `tools/world-mcp/src/ranking/profiles/index.ts`, not the drafted `profiles.ts`, and `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` lives there rather than in `assemble.ts`.
- The live invariant node type is `invariant`, not the drafted `invariant_record`; the implementation and tests use the live node type.
- The package-local proof uses built handler/tests and in-memory MCP dispatch metadata rather than direct external `mcp__worldloom__get_context_packet(...)`, which is the truthful Codex proof surface for source changes before any deployed MCP server restart.
- Outcome amended: 2026-05-02 — the sibling STORY allocator ticket has since been completed and archived at `archive/tickets/MCPENH-010-add-story-id-class-to-allocator.md`; the old active path `tickets/MCPENH-010-add-story-id-class-to-allocator.md` no longer exists.
