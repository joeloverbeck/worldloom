# MCPENH-002: Add canon-pipeline-adjacent skill task types to get_context_packet TASK_TYPES enum

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/ranking/profiles.ts` (TASK_TYPES enum extension + per-task ranking weights + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE entries); `tools/world-mcp/src/tools/get-context-packet.ts` (validator surface only); `.claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/SKILL.md` + their `references/preflight-and-prerequisites.md` (revert `'other'` fallback to per-skill task_type)
**Deps**: none

## Problem

The `get_context_packet` tool's `TASK_TYPES` enum currently registers five values: `canon_addition | character_generation | diegetic_artifact_generation | continuity_audit | other`. Four canon-pipeline-adjacent skills — `propose-new-canon-facts`, `propose-new-characters`, `propose-new-worlds-from-preferences`, `canon-facts-from-diegetic-artifacts` — explicitly use `task_type='other'` as the registered fallback and document this in their pre-flight references with the comment "adding it is out of scope for this skill rewrite." Each `propose-new-X` skill has DIFFERENT context needs (proposal-cards on a canon-fact diagnosis surface vs character-niche surface vs world-essence-cross-pipeline surface vs diegetic-artifact extraction surface) but they all currently share the generic default ranking-weights profile applied to `'other'`. This is a documented suboptimality that no individual skill rewrite can fix — it requires extending the MCP enum + ranking-profile registry.

The result is that context packets returned to these skills are tuned to a generic baseline rather than to each skill's per-phase retrieval shape. Operators receive packets that are over-broad or under-specific for the task at hand.

## Assumption Reassessment (2026-04-28)

1. The `TASK_TYPES` enum lives at `tools/world-mcp/src/ranking/profiles.ts` and is consumed by `tools/world-mcp/src/tools/get-context-packet.ts` (validator at line 34: `if (!TASK_TYPES.includes(args.task_type)) throw ...`). The enum's current values are confirmed by grep across the file — no grep hit for `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, or `canon_facts_from_diegetic_artifacts` task_type registrations.
2. Four canon-pipeline-adjacent skills explicitly document the `'other'` fallback with the same template phrase: `propose-new-canon-facts/references/preflight-and-prerequisites.md`, `propose-new-characters/references/preflight-and-prerequisites.md`, `canon-facts-from-diegetic-artifacts/references/preflight-and-prerequisites.md`, and `propose-new-worlds-from-preferences/SKILL.md` line 132. Each skill explicitly notes "adding it is out of scope for this skill rewrite" — they correctly defer the registration to a separate ticket; this is that ticket.
3. Cross-skill / cross-tool boundary under audit: the contract between (a) the four canon-pipeline-adjacent skills (consumers of `get_context_packet`) and (b) `tools/world-mcp/src/ranking/profiles.ts` + `get-context-packet.ts` (provider). Shared schema: the TASK_TYPES enum + per-task ranking weights + per-task default token budget. Each skill currently injects its own `seed_nodes` and `token_budget`; the missing surface is the per-task ranking-profile that determines which node-types get weight when the packet's token budget runs short.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation ("LLM agents should never operate on prose alone … they should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel + current Invariants + relevant canon fact records + affected domain files + unresolved contradictions list + mystery reserve entries touching the same domain"). The `'other'` fallback applies a generic default ranking profile that may not surface the right slice for a task-specific retrieval — for example, `propose-new-characters` needs a Person Registry-weighted profile (heavy on entities + dossiers + adjudications); `canon-facts-from-diegetic-artifacts` needs a single-artifact-anchored profile (heavy on the artifact's claim ledger + named-entity neighbors). These shape differences are real and currently invisible to the packet assembler.
5. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check surfaces. Context-packet ranking determines what arrives in the packet; it does not change what the skill DOES with the packet. No firewall is weakened or strengthened.
6. Not applicable — no output schema (CF / CH / proposal card / dossier / artifact) is extended. The change is purely on the input-side ranking surface.
7. The change adds four enum values; it does not rename or remove any existing value. Blast radius scan: `grep -rn "task_type='other'" .claude/skills/` returns 6 hits across the four skills + their reference files; all of them WANT the per-skill task_type and explicitly document the wait. No silent consumer of `'other'` outside the four skills exists per the grep.
8. Adjacent contradiction surfaced during reassessment: `propose-new-worlds-from-preferences` describes itself as "this skill is not in the TASK_TYPES enum and adding it is out of scope" — once this ticket lands, that skill prose needs the same revert as the other three (replace `task_type='other'` with `task_type='propose_new_worlds_from_preferences'`). All four reverts ARE required consequences of this ticket and live in §Files to Touch.

## Architecture Check

1. Extending the enum + ranking profiles in one place (the profiles registry) keeps the per-task tuning central and discoverable. The alternative (per-skill custom retrieval logic that bypasses `get_context_packet`) duplicates retrieval code into skill prose, exactly the scenario FOUNDATIONS §Tooling Recommendation forbids ("LLM agents should never operate on prose alone").
2. No backwards-compatibility shims — the enum extension is additive. The `'other'` fallback remains valid for genuinely unclassified tasks; the four canon-pipeline-adjacent skills migrate off it. No aliasing required.

## Verification Layers

1. The TASK_TYPES enum literally includes the four new task types after the change → codebase grep-proof: `grep -E "propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts" tools/world-mcp/src/ranking/profiles.ts` returns hits in both the TASK_TYPES array and the per-task ranking-weights table.
2. A successful `get_context_packet(world_slug='animalia', task_type='propose_new_canon_facts', seed_nodes=[...], token_budget=15000)` call returns a packet whose node-type distribution differs from the same call with `task_type='other'` (ranking weights actually differ) → MCP smoke test (one packet call per new task type, comparing layer composition).
3. After the skill texts are reverted (§Files to Touch §2), no canon-pipeline-adjacent skill references `task_type='other'` for its own context-packet calls → grep-proof: `grep -n "task_type='other'\|task_type=\"other\"" .claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/` returns zero hits in those skill directories.
4. Per-task ranking profiles are tuned for the skill's actual retrieval shape (NOT identical defaults copy-pasted across the four entries) → manual review: each skill's ticket peer-review confirms the chosen weights surface the right nodes for that skill's worked-precedent invocation.

## What to Change

### 1. Extend TASK_TYPES enum + ranking profiles + token budgets

In `tools/world-mcp/src/ranking/profiles.ts`:

- Add four task_type values to the `TASK_TYPES` array: `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, `canon_facts_from_diegetic_artifacts`.
- Add per-task entries to the ranking-weights table. Each profile should reflect the skill's documented retrieval shape (per its `references/preflight-and-prerequisites.md`):
  - `propose_new_canon_facts`: broad-domain thinness scan; weight Kernel + INV + CF + named-entity neighbors + section context across multiple domains. Default token budget: 15000 (per current skill setting).
  - `propose_new_characters`: niche/voice + Person Registry; weight Kernel + INV + named-entity neighbors + character / diegetic-artifact / adjudication frontmatter heavily; weight CFs by relevance to institutions / peoples-and-species / everyday-life / geography / timeline domains. Default token budget: 15000.
  - `propose_new_worlds_from_preferences`: cross-world essence map; weight WORLD_KERNEL + ONTOLOGY + INV + forbidden M records (firewall) heavily across MULTIPLE worlds (the skill iterates world by world). Default token budget: 12000 per world (per current skill setting).
  - `canon_facts_from_diegetic_artifacts`: artifact-anchored extraction; weight Kernel + INV + CF + named-entity neighbors + section context for the artifact-local domains. Default token budget: 12000.
- Add per-task entries to `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` matching the values above.

### 2. Revert the four skills' `'other'` fallback to per-skill task_type

In each of the following files, replace the `task_type='other'` argument and the surrounding "registered fallback / out of scope for this skill rewrite" prose with the per-skill task_type and a brief reference to MCPENH-002 as the ticket that registered it:

- `.claude/skills/propose-new-canon-facts/SKILL.md` line 16, 68 + `references/preflight-and-prerequisites.md` lines 11, 17 + `references/canon-rules-and-foundations.md` line 23
- `.claude/skills/propose-new-characters/SKILL.md` line 16, 76 + `references/preflight-and-prerequisites.md` lines 11, 17 + `references/canon-rules-and-foundations.md` line 21
- `.claude/skills/propose-new-worlds-from-preferences/SKILL.md` line 42 + line 132 (Process Flow Phase 3 entry + World-State Prerequisites)
- `.claude/skills/canon-facts-from-diegetic-artifacts/SKILL.md` line 19, 80 + `references/preflight-and-prerequisites.md` lines 11, 17

### 3. Update skill-creator's meta-tooling guidance

In `.claude/skills/skill-creator/SKILL.md` line 129, the meta-with-multi-world-read documentation references `task_type='other'` as the canonical pattern for that skill scope. After this ticket lands, that reference needs to be updated to point to the new per-task task_types as examples (or to clarify that `'other'` remains valid for skills genuinely outside the four-skill set).

## Files to Touch

- `tools/world-mcp/src/ranking/profiles.ts` (modify — TASK_TYPES enum + per-task ranking weights + DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify only if validator-side changes are needed; the enum extension may be sufficient on its own)
- `.claude/skills/propose-new-canon-facts/SKILL.md` (modify — line 16, 68 prose)
- `.claude/skills/propose-new-canon-facts/references/preflight-and-prerequisites.md` (modify — lines 11, 17)
- `.claude/skills/propose-new-canon-facts/references/canon-rules-and-foundations.md` (modify — line 23)
- `.claude/skills/propose-new-characters/SKILL.md` (modify — line 16, 76 prose)
- `.claude/skills/propose-new-characters/references/preflight-and-prerequisites.md` (modify — lines 11, 17)
- `.claude/skills/propose-new-characters/references/canon-rules-and-foundations.md` (modify — line 21)
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

1. `mcp__worldloom__get_context_packet(world_slug='animalia', task_type='propose_new_canon_facts', seed_nodes=['CF-0001'], token_budget=15000)` returns a packet without raising "Unsupported task_type" — verifying enum membership.
2. The four added task_types each route to a per-task ranking-weights table entry (NOT silently fall through to the `'other'` defaults) — `tools/world-mcp/tests/get-context-packet.test.ts` adds one test per task_type comparing layer composition against `'other'`.
3. `grep -n "task_type='other'\|task_type=\"other\"" .claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/` returns zero hits after §Files to Touch §2 lands.
4. The four skills' next dry-run invocations (one each) load context packets via the per-skill task_type without error.

### Invariants

1. Existing `task_type='other'` callers (any future skill genuinely outside the four named) continue to receive the generic default profile; the `'other'` entry is unmodified.
2. Existing `task_type='canon_addition' | 'character_generation' | 'diegetic_artifact_generation' | 'continuity_audit'` callers see no change — their ranking weights and token budgets are unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/get-context-packet.test.ts` — add four task_type-membership tests + four ranking-profile-divergence tests (each new task_type returns a packet whose node-type distribution differs measurably from the `'other'` baseline on the same `world_slug` + `seed_nodes`).
2. `tools/world-mcp/tests/profiles.test.ts` (or equivalent) — assert each of the four new task_types has a non-default ranking-weights entry and a non-default DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE entry.
3. Per-skill dry-run verification (one invocation per skill) — confirm the per-skill task_type call succeeds and the returned packet shape matches the skill's documented retrieval expectations.

### Commands

1. `cd tools/world-mcp && npm test -- get-context-packet.test.ts profiles.test.ts` — narrow MCP test for this ticket.
2. `grep -nE "task_type='(propose_new_canon_facts|propose_new_characters|propose_new_worlds_from_preferences|canon_facts_from_diegetic_artifacts)'" .claude/skills/` — confirms the four skill reverts landed.
3. `grep -n "task_type='other'" .claude/skills/{propose-new-canon-facts,propose-new-characters,propose-new-worlds-from-preferences,canon-facts-from-diegetic-artifacts}/` — must return zero hits after the reverts.
