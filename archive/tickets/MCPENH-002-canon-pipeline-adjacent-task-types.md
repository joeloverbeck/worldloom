# MCPENH-002: Add canon-pipeline-adjacent skill task types to get_context_packet TASK_TYPES enum

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles/index.ts` + sibling profile modules (TASK_TYPES enum extension + per-task ranking weights + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE entries); `tools/world-mcp/src/context-packet/governing-world-context.ts` (exhaustive task metadata entries); `tools/world-mcp/src/tools/get-context-packet.ts` (shared default-budget import); `.claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/SKILL.md` + their references (revert `'other'` fallback to per-skill task_type); docs and package README budget wording.
**Deps**: none

## Problem

At intake, the `get_context_packet` tool's `TASK_TYPES` enum registered five values: `canon_addition | character_generation | diegetic_artifact_generation | continuity_audit | other`. Four canon-pipeline-adjacent skills — `propose-new-canon-facts`, `propose-new-characters`, `propose-new-worlds-from-preferences`, `canon-facts-from-diegetic-artifacts` — explicitly used `task_type='other'` as the registered fallback and documented this in their pre-flight references with the comment "adding it is out of scope for this skill rewrite." Each `propose-new-X` skill has DIFFERENT context needs (proposal-cards on a canon-fact diagnosis surface vs character-niche surface vs world-essence-cross-pipeline surface vs diegetic-artifact extraction surface) but they all shared the generic default ranking-weights profile applied to `'other'`. This was a documented suboptimality that no individual skill rewrite could fix — it required extending the MCP enum + ranking-profile registry.

Before this ticket, context packets returned to these skills were tuned to a generic baseline rather than to each skill's per-phase retrieval shape. Operators received packets that could be over-broad or under-specific for the task at hand.

## Assumption Reassessment (2026-04-28)

1. The `TASK_TYPES` enum lives at `tools/world-mcp/src/ranking/profiles/index.ts` and is consumed by `tools/world-mcp/src/tools/get-context-packet.ts` plus the MCP input schema in `tools/world-mcp/src/server.ts`. The enum's current values are confirmed by grep across the live profile registry — no grep hit for `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, or `canon_facts_from_diegetic_artifacts` task_type registrations before this ticket.
2. Four canon-pipeline-adjacent skills explicitly document the `'other'` fallback with the same template phrase: `propose-new-canon-facts/references/preflight-and-prerequisites.md`, `propose-new-characters/references/preflight-and-prerequisites.md`, `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, and `propose-new-worlds-from-preferences/SKILL.md` line 132. Each skill explicitly notes "adding it is out of scope for this skill rewrite" — they correctly defer the registration to a separate ticket; this is that ticket.
3. Cross-skill / cross-tool boundary under audit: the contract between (a) the four canon-pipeline-adjacent skills (consumers of `get_context_packet`) and (b) `tools/world-mcp/src/ranking/profiles/index.ts`, sibling profile modules, `tools/world-mcp/src/server.ts`, and `get-context-packet.ts` (provider). Shared schema: the TASK_TYPES enum + per-task ranking weights + per-task default token budget. Each skill currently injects its own `seed_nodes` and often an explicit `token_budget`; the missing surface is the per-task ranking-profile that determines which node-types get weight when the packet's token budget runs short, plus truthful default budgets for omitted `token_budget` calls.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation ("LLM agents should never operate on prose alone … they should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain"). The `'other'` fallback applies a generic default ranking profile that may not surface the right slice for a task-specific retrieval — for example, `propose-new-characters` needs a Person Registry-weighted profile (heavy on entities + dossiers + adjudications); `canon-facts-from-diegetic-artifacts` needs a single-artifact-anchored profile (heavy on the artifact's claim ledger + named-entity neighbors). These shape differences are real and currently invisible to the packet assembler.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. Context-packet ranking determines what arrives in the packet; it does not change what the skill DOES with the packet. No firewall is weakened or strengthened.
6. Not applicable — no output schema (CF / CH / proposal card / dossier / artifact) is extended. The change is purely on the input-side ranking surface.
7. The change adds four enum values; it does not rename or remove any existing value. Blast radius scan: `rg -n "task_type=['\"]other['\"]" .claude/skills/` returned owned hits across the four skills, their references, and the skill-creator meta guidance. The four canon-pipeline skills wanted the per-skill task_type and explicitly documented the wait; `skill-creator` keeps `'other'` only as guidance for genuinely unclassified future skills.
8. Mismatch correction: the drafted ticket referenced `tools/world-mcp/src/ranking/profiles.ts`, but the live registry is `tools/world-mcp/src/ranking/profiles/index.ts` with per-profile modules. The drafted narrow command also named `get-context-packet.test.ts profiles.test.ts`; the live closest tests are `tests/tools/get-context-packet.test.ts` and `tests/ranking/profile-overrides.test.ts`, and package `npm test` always rebuilds before running compiled `dist/tests/**/*.test.js`.
9. Adjacent contradiction surfaced during reassessment: `propose-new-worlds-from-preferences` described itself as "this skill is not in the TASK_TYPES enum and adding it is out of scope" — after this ticket, that skill prose needed the same revert as the other three (replace `task_type='other'` with `task_type='propose_new_worlds_from_preferences'`). All four reverts were required consequences of this ticket and live in §Files to Touch.
10. Build reassessment exposed same-seam fallout in `tools/world-mcp/src/context-packet/governing-world-context.ts`: its per-task metadata maps are exhaustively typed as `Record<TaskType, string[]>`, so adding task types required task-specific governing file paths, active rules, output schemas, and prohibited moves rather than weakening the type.

## Architecture Check

1. Extending the enum + ranking profiles in one place (the profiles registry) keeps the per-task tuning central and discoverable. The alternative (per-skill custom retrieval logic that bypasses `get_context_packet`) duplicates retrieval code into skill prose, exactly the scenario FOUNDATIONS §Tooling Recommendation forbids ("LLM agents should never operate on prose alone").
2. No backwards-compatibility shims — the enum extension is additive. The `'other'` fallback remains valid for genuinely unclassified tasks; the four canon-pipeline-adjacent skills migrate off it. No aliasing required.

## Verification Layers

1. The TASK_TYPES enum literally includes the four new task types after the change -> codebase grep-proof: `rg -n "propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts" tools/world-mcp/src/ranking/profiles tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/tools/get-context-packet.ts tools/world-mcp/src/server.ts` returns hits in the TASK_TYPES array, per-task ranking-weights table, default budget table, and governing context metadata.
2. A successful package-local `getContextPacket(...)` call accepts each new task type and applies its default budget -> `tools/world-mcp/tests/tools/get-context-packet.test.ts` covers all four new task types without relying on direct session MCP tool availability.
3. After the skill texts are reverted (§Files to Touch §2), no canon-pipeline-adjacent skill references `task_type='other'` for its own context-packet calls -> grep-proof: `rg -n "task_type='other'|task_type=\"other\"" .claude/skills/propose-new-canon-facts .claude/skills/propose-new-characters .claude/skills/propose-new-worlds-from-preferences .claude/skills/canon-facts-from-diegetic-artifacts` returns no hits.
4. Per-task ranking profiles are tuned for the skill's actual retrieval shape and are not identical fallback entries -> `tools/world-mcp/tests/ranking/profile-overrides.test.ts` asserts non-default profile priorities and task-specific default budgets.

## What to Change

### 1. Extend TASK_TYPES enum + ranking profiles + token budgets

In `tools/world-mcp/src/ranking/profiles/index.ts` and sibling profile modules:

- Add four task_type values to the `TASK_TYPES` array: `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, `canon_facts_from_diegetic_artifacts`.
- Add per-task entries to the ranking-weights table. Each profile should reflect the skill's documented retrieval shape (per its `references/preflight-and-prerequisites.md`):
  - `propose_new_canon_facts`: broad-domain thinness scan; weight Kernel + INV + CF + named-entity neighbors + section context across multiple domains. Default token budget: 15000 (per current skill setting).
  - `propose_new_characters`: niche/voice + Person Registry; weight Kernel + INV + named-entity neighbors + character / diegetic-artifact / adjudication frontmatter heavily; weight CFs by relevance to institutions / peoples-and-species / everyday-life / geography / timeline domains. Default token budget: 15000.
  - `propose_new_worlds_from_preferences`: cross-world essence map; weight WORLD_KERNEL + ONTOLOGY + INV + forbidden M records (firewall) heavily across MULTIPLE worlds (the skill iterates world by world). Default token budget: 12000 per world (per current skill setting).
  - `canon_facts_from_diegetic_artifacts`: artifact-anchored extraction; weight Kernel + INV + CF + named-entity neighbors + section context for the artifact-local domains. Default token budget: 12000.
- Add per-task entries to exported `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` matching the values above, and have `tools/world-mcp/src/tools/get-context-packet.ts` consume that shared registry instead of keeping a separate local budget table.

### 2. Revert the four skills' `'other'` fallback to per-skill task_type

In each of the following files, replace the `task_type='other'` argument and the surrounding "registered fallback / out of scope for this skill rewrite" prose with the per-skill task_type and a brief reference to MCPENH-002 as the ticket that registered it:

- `.claude/skills/propose-new-canon-facts/SKILL.md` line 16, 68 + `references/preflight-and-prerequisites.md` lines 11, 17 + `references/canon-rules-and-foundations.md` line 23
- `.claude/skills/propose-new-characters/SKILL.md` line 16, 76 + `references/preflight-and-prerequisites.md` lines 11, 17 + `references/canon-rules-and-foundations.md` line 21
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` line 42 + line 132 (Process Flow Phase 3 entry + World-State Prerequisites)
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` line 19, 80 + `references/preflight-and-prerequisites.md` lines 11, 17

### 3. Update skill-creator's meta-tooling guidance

In `.claude/skills/skill-creator/SKILL.md` line 129, the meta-with-multi-world-read documentation references `task_type='other'` as the canonical pattern for that skill scope. After this ticket lands, that reference needs to be updated to point to the new per-task task_types as examples (or to clarify that `'other'` remains valid for skills genuinely outside the four-skill set).

## Files to Touch

- `tools/world-mcp/src/ranking/profiles/index.ts` (modify — TASK_TYPES enum + per-task ranking weights + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE export)
- `tools/world-mcp/src/ranking/profiles/canon-pipeline-adjacent.ts` (new — four per-task ranking profiles)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — exhaustive governing context metadata for the four new task types)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — consume shared default-budget table)
- `tools/world-mcp/tests/ranking/profile-overrides.test.ts` (modify — non-default profile and default-budget assertions)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — accepted-task-type/default-budget assertions)
- `tools/world-mcp/README.md` (modify — omitted-budget docs)
- `docs/MACHINE-FACING-LAYER.md` (modify — omitted-budget docs)
- `archive/tickets/MCPENH-002-canon-pipeline-adjacent-task-types.md` (modify — reassessment, closeout, and archival truthing)
- `.claude/skills/propose-new-canon-facts/SKILL.md` (modify — line 16, 68 prose)
- `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` (modify — lines 11, 17)
- `.claude/skills/propose-new-canon-facts/references/canon-rules-and-foundations.md` (modify — line 23)
- `.claude/skills/propose-new-canon-facts/references/phase-7-canon-safety-check.md` (modify — packet-profile wording)
- `.claude/skills/propose-new-characters/SKILL.md` (modify — line 16, 76 prose)
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify — lines 11, 17)
- `.claude/skills/propose-new-characters/references/canon-rules-and-foundations.md` (modify — line 21)
- `.claude/skills/propose-new-characters/references/phase-10-canon-safety-check.md` (modify — packet-profile wording)
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` (modify — Process Flow Phase 3 entry + World-State Prerequisites)
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` (modify — line 19, 80 prose)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md` (modify — lines 11, 17)
- `.claude/skills/skill-creator/SKILL.md` (modify — line 129 update meta-with-multi-world-read example)

## Out of Scope

- Adding task_types for `continuity-audit` (already registered as `continuity_audit`), `reassess-spec`, `spec-to-tickets`, `skill-creator`, `skill-audit`, `skill-consolidate`, `skill-extract-references`, or `brainstorm`. These either already have task_types or are meta-tooling skills that do not call `get_context_packet`.
- Tuning the `'other'` ranking-weights profile itself. The fallback remains untouched for genuinely unclassified tasks; this ticket only adds new entries.
- A migration window or deprecation period for `'other'`-using skills. The four skills migrate in lockstep with the enum extension; no transitional state.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local `getContextPacket(...)` calls for `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, and `canon_facts_from_diegetic_artifacts` return packets without raising "Unsupported task_type" and apply the expected default budgets — verifying enum membership through the same handler used by the MCP registration.
2. The four added task_types each route to a per-task ranking-weights table entry (NOT silently fall through to the `'other'` defaults) — `tools/world-mcp/tests/ranking/profile-overrides.test.ts` asserts non-default, distinct profile tuning for each task type.
3. `grep -n "task_type='other'\|task_type=\"other\"" .claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/` returns zero hits after §Files to Touch §2 lands.
4. Direct external MCP smoke remains a post-rebuild/restart operational follow-up; this Codex session does not expose `mcp__worldloom__get_context_packet`, so acceptance is on the package-local handler and in-memory/schema-covered test path.

### Invariants

1. Existing `task_type='other'` callers (any future skill genuinely outside the four named) continue to receive the generic default profile; the `'other'` entry is unmodified.
2. Existing `task_type='canon_addition' | 'character_generation' | 'diegetic_artifact_generation' | 'continuity_audit'` callers see no change — their ranking weights and token budgets are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — add default-budget and accepted-task-type coverage for the four new task types.
2. `tools/world-mcp/tests/ranking/profile-overrides.test.ts` — assert each of the four new task_types has a non-default ranking-weights entry and a non-default `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` entry.
3. Existing package build/test coverage — confirms `server.ts` schema registration compiles against the extended `TASK_TYPES` tuple and package-local handler calls accept the four new task types.

### Commands

1. `cd tools/world-mcp && npm test` — package-local MCP build + test proof for this ticket.
2. `rg -n "task_type='(propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts)'" .claude/skills/` — confirms the four skill reverts landed.
3. `! rg -n "task_type='other'|task_type=\"other\"" .claude/skills/propose-new-canon-facts .claude/skills/propose-new-characters .claude/skills/propose-new-worlds-from-preferences .claude/skills/canon-facts-from-diegetic-artifacts` — must return zero hits after the reverts.

## Outcome

Implemented the canon-pipeline-adjacent task types end to end:

- Added `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, and `canon_facts_from_diegetic_artifacts` to the `TASK_TYPES` registry.
- Added a dedicated `canon-pipeline-adjacent` ranking profile module with non-default weighting for each new task type.
- Moved `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` into the ranking profile registry and set defaults to 15000 for the two proposal-generation task types and 12000 for the cross-world/artifact-mining task types.
- Added governing context metadata entries for each new task type so exhaustive `Record<TaskType, string[]>` maps stay strict.
- Updated the four consuming skills, supporting references, skill-creator guidance, package README, and machine-facing docs away from the stale generic `'other'` guidance.

## Verification Result

Completed:

1. `cd tools/world-mcp && npm test` — passed; package build succeeded and Node test suite reported 205 passing tests, 0 failures.
2. `rg -n "task_type='(propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts)'" .claude/skills/` — returned the expected per-skill task_type references.
3. `rg -n "task_type='other'|task_type=\"other\"" .claude/skills/propose-new-canon-facts .claude/skills/propose-new-characters .claude/skills/propose-new-worlds-from-preferences .claude/skills/canon-facts-from-diegetic-artifacts` — returned no hits.
4. `rg -n "propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts" tools/world-mcp/src/ranking/profiles tools/world-mcp/src/context-packet/governing-world-context.ts tools/world-mcp/src/tools/get-context-packet.ts tools/world-mcp/src/server.ts` — confirmed registry/default-budget/governing-context coverage.
5. `git diff --check` — passed.

Package ignored artifacts were present before verification (`tools/world-mcp/.secret`, `tools/world-mcp/dist/`, `tools/world-mcp/node_modules/`). `npm test` rebuilt `dist/`; this is expected generated ignored state.

## Deviations

- Direct session-level `mcp__worldloom__get_context_packet(...)` smoke was not available in this Codex toolset. The accepted proof uses package-local handler tests plus package build/test coverage, which also compiles `server.ts`'s Zod enum registration against the extended `TASK_TYPES` tuple.
- The first package build failed because `tools/world-mcp/src/context-packet/governing-world-context.ts` had exhaustive `Record<TaskType, string[]>` maps. This was same-seam fallout from adding new task types, so the ticket absorbed explicit governing metadata entries instead of weakening the type.
- Archival was handled by the subsequent post-ticket-review pass after closeout verification.
