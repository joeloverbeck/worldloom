# CHARGENMCP-001: character_generation packet must deliver Phase 7 audit-surface completeness

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/context-packet/governing-world-context.ts` (extend governing class for `character_generation`); `tools/world-mcp/src/context-packet/shared.ts` (add optional parsed node `record` projection); `tools/world-mcp/src/context-packet/assemble.ts` (self-consistent retry budget); `docs/CONTEXT-PACKET-CONTRACT.md` §Example Roles (character_generation row); `tools/world-mcp/tests/context-packet/` (new completeness test)
**Deps**: none

## Problem

At intake, during the `character-generation` Namahan run on 2026-04-27 (CHAR-0003 in `worlds/animalia/`), the `mcp__worldloom__get_context_packet(task_type='character_generation', …)` response delivered only a subset of Mystery Reserve records as `impact_surfaces` (8 of 20 M-NNNN records present as direct-impact entries) and delivered every `local_authority` / `scoped_local_context` node body as a ~280-character `body_preview` truncation. The character-generation skill's Phase 7b firewall discipline (`references/phase-7-canon-safety-check.md` §Phase 7b) requires recording every M-NNNN record into `world_consistency.mystery_reserve_firewall` regardless of overlap, and Phase 7a requires testing each character trait against every invariant's full break-condition text. Satisfying both required either N follow-up `mcp__worldloom__get_record(record_id)` calls (40+ for a small-seed run) or — what actually happened — a subagent reading `worlds/animalia/_source/mystery-reserve/*.yaml` and `worlds/animalia/_source/invariants/*.yaml` directly to obtain the verbatim canonical text the audit cites. That is a documented anti-pattern (`docs/FOUNDATIONS.md` §Tooling Recommendation; `docs/CONTEXT-PACKET-CONTRACT.md` Index + Follow-Up Retrieval Pattern relies on retrieval, not raw `_source/` reads), and the audit trail produced by Phase 7 traced back to text the MCP did not deliver.

For `character_generation`, every M record's firewall fields and every invariant's body are universally relevant — they are governing world context, not seed-dependent impact surfaces. This ticket delivers them by construction so the firewall list discipline and invariant-conformance audit have a guaranteed retrieval surface.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/context-packet/governing-world-context.ts` is the layer that already carries kernel + invariants + protected-surfaces metadata into the packet for every task type (per `docs/CONTEXT-PACKET-CONTRACT.md` §5 governing world context). Verified by reading the layer assembler list at `tools/world-mcp/src/context-packet/assemble.ts` and the implementation file. The Mystery Reserve nodes currently surface only when locality intersects them, via `tools/world-mcp/src/context-packet/impact-surfaces.ts` — i.e., they are advisory, trim-first, and seed-dependent.
2. `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` §Phase 7b states: "**Record every checked entry's id into `world_consistency.mystery_reserve_firewall`, regardless of whether overlap was found** — the firewall list is a proof-of-check audit trail, not an overlap register." The skill enforces "all M records" at audit-trail level; the packet currently delivers only a domain-touching subset.
3. Cross-skill / cross-artifact boundary under audit: the contract between `mcp__worldloom__get_context_packet` (deliverer) and the character-generation skill's Phase 7 audit (consumer). The shared schema is the packet's `governing_world_context.nodes[]` and `impact_surfaces.nodes[]` arrays plus the per-node `body_preview` size budget. The live node shape does not currently carry a full body or parsed YAML record, so packet-only Phase 7 proof requires an additive optional `record` projection on the mandatory `character_generation` governing nodes. This ticket changes the packet's class assignment and parsed-record delivery for M records and invariants under `task_type='character_generation'` only — it does not change the `canon_addition` or `continuity_audit` mandatory-node behavior.
4. FOUNDATIONS principle under audit: Rule 7 (Preserve Mystery Deliberately) and §Tooling Recommendation. §Tooling Recommendation lists "mystery reserve entries touching the same domain" as the minimum guarantee; for `character_generation` we need to deliver more than the minimum because Phase 7b's audit-trail discipline is stricter than seed-locality. The ticket strengthens delivery without weakening any firewall — full body delivery for governing nodes is additive to the existing locality-first guarantee.
5. HARD-GATE / canon-write ordering: not touched. This ticket does not modify the patch engine, the approval-token pipeline, Hook 3, or canon-mutation flow. The change is read-side only.
6. Schema extension: the packet response shape is additive-only. `nodes[]` arrays still carry node objects and no existing field is renamed or removed, but mandatory `character_generation` governing nodes for invariants and Mystery Reserve records gain an optional parsed `record` object. Invariant nodes carry the full parsed invariant record; Mystery Reserve nodes carry the Phase 7b firewall projection (`id`, `status`, `what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`). Existing consumers can ignore the additional `record` field; the character-generation skill can use it immediately.
7. Token-budget impact: 16 invariants average ~1.5KB on disk = ~24KB; 20 M records' relevant fields (`what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`, `status`) average ~1KB per record after field-projection = ~20KB. Combined ~44KB additional governing payload. Default `character_generation` token budget was 10000 in `.claude/skills/character-generation/SKILL.md:92` — too low. CHARGENMCP-004 measured the post-CHARGENMCP-001 floor for a representative 12-seed Namahan packet and raised the documented skill call budget to `33000`, which fits the required classes while preserving `packet_incomplete_required_classes` for larger seed sets.
8. Adjacent contradictions exposed by reassessment:
   - The character-generation skill's `world-state-prerequisites.md:13` documents `token_budget=10000`. The same Namahan run hit `packet_incomplete_required_classes` with `minimum_required_budget: 12132` at 12000 budget for a 12-seed call. Filed separately as CHARGENMCP-004 (alignment of skill default with engine minimum) — this is a required follow-up, not a consequence of this ticket.
   - `tools/world-mcp/src/tools/get-record-field.ts` and `get-record-schema.ts` are registered in `tools/world-mcp/dist/src/server.js:213-214` but were not exposed in the running session's MCP tool surface during the Namahan run, suggesting the running MCP server process predated the rebuild. This is a runtime-restart issue, not a code change, and is noted here for context — no separate ticket.
9. Final worktree refresh note: same-family skill-budget prose now shows `token_budget=33000` and a `packet_incomplete_required_classes` retry note in `.claude/skills/character-generation/SKILL.md` / `references/world-state-prerequisites.md` after CHARGENMCP-004. CHARGENMCP-001 did not change the engine's `character_generation` default budget; the package test still proves the 8000-budget path returns structured insufficiency and succeeds at the computed retry budget.

## Architecture Check

1. Moving Mystery Reserve firewall fields and invariant bodies into `governing_world_context` for `character_generation` (instead of leaving them in advisory `impact_surfaces`) tracks the FOUNDATIONS layer semantics correctly: governing world context is the FOUNDATIONS-driven guardrail surface required by the task type (per `docs/CONTEXT-PACKET-CONTRACT.md` §5). For character generation, "preserve mystery" is governing, not advisory. Aligning the layer assignment with the layer's documented role is cleaner than leaving it as a heuristic of seed-locality.
2. No backwards-compatibility aliasing/shims introduced. `canon_addition` and `continuity_audit` packets retain their current behavior; only the `character_generation` task profile gains the additional governing payload.

## Verification Layers

1. The character_generation packet for a minimal-seed call returns every world's invariant record with full body in `governing_world_context.nodes` — schema validation (packet response shape).
2. The character_generation packet returns every world's M-NNNN record (with at minimum `what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`, `status` fields) in `governing_world_context.nodes` — schema validation.
3. The character_generation skill's Phase 7b firewall audit can populate `world_consistency.mystery_reserve_firewall` from the packet alone, without follow-up `get_record` calls or `_source/` reads — package test plus skill prerequisite/Phase 7 doc update.
4. The `canon_addition` packet behavior is unchanged for the same world — codebase grep-proof + targeted test.
5. FOUNDATIONS alignment — §Tooling Recommendation guarantees are strengthened (additive), Rule 7 preservation is unchanged, no Mystery Reserve entry is silently resolved — FOUNDATIONS alignment check.

## What to Change

### 1. Extend governing-world-context assembly for `character_generation`

In `tools/world-mcp/src/context-packet/governing-world-context.ts`, when `task_type === 'character_generation'`, include:
- every invariant record in the world (full parsed body — they are small and bounded)
- every M-NNNN record in the world, with at minimum the audit-relevant field projection (`record_id`, `status`, `what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`)

These are governing nodes — they are not optional under budget pressure for character_generation. They should carry an additive parsed `record` projection so Phase 7 does not rely on truncated `body_preview`. If budget cannot fit them, the packet must return `packet_incomplete_required_classes` per existing `tools/world-mcp/src/context-packet/assemble.ts` insufficiency contract.

### 2. Update CONTEXT-PACKET-CONTRACT.md

In `docs/CONTEXT-PACKET-CONTRACT.md` §Example Roles, replace the `character_generation` row's `governing_world_context` entry to read: "no-world-write rules, distribution discipline, **all invariant records with full body, all Mystery Reserve records' firewall fields (`what_is_unknown` + `disallowed_cheap_answers` + `common_in_world_interpretations` + `status`), Mystery Reserve firewall on locality intersection nodes**". Keep the existing distribution discipline language; add the explicit completeness clause.

### 3. Add packet completeness test

Add `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (or extend an existing character_generation test) asserting:
- a `character_generation` packet against a fixture world returns `governing_world_context.nodes` containing every invariant and every M record in the fixture
- the M records carry the four firewall fields named above (parsed, not body_preview)
- the invariants carry the full parsed body
- a `canon_addition` packet against the same fixture does NOT carry every M record and every invariant in `governing_world_context.nodes` (regression guard: change is scoped to `character_generation`)

### 4. Update character-generation skill prerequisites doc

In `.claude/skills/character-generation/references/world-state-prerequisites.md`, add a one-line note that the `character_generation` packet auto-includes all invariants and all M-record firewall fields, and that Phase 7a/7b can rely on the packet without `_source/` direct reads or N-record `get_record` follow-ups.

## Files to Touch

- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — additive parsed `record` projection and token accounting)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — self-consistent `retry_with.token_budget` after larger required classes)
- `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (new) — or extend an existing character_generation packet test
- `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (modify — live-corpus expectation now proves insufficiency at 8000 and success at retry budget)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify §Example Roles)
- `docs/MACHINE-FACING-LAYER.md` (modify — document parsed `record` projection exception to the body-preview pattern)
- `.claude/skills/character-generation/SKILL.md` (modify — summarize packet-delivered governing projection)
- `.claude/skills/character-generation/references/world-state-prerequisites.md` (modify — single line note)
- `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` (modify — remove stale fallback to nonexistent node-type filters)

## Out of Scope

- Changes to `canon_addition`, `diegetic_artifact_generation`, or `continuity_audit` packet shapes.
- Changes to the patch engine, HARD-GATE flow, or any canon-mutation surface.
- Changes to FOUNDATIONS.md (the strengthening is implementation-level + contract-level; FOUNDATIONS Rule 7 and §Tooling Recommendation already permit and motivate this).
- Bulk-typed retrieval primitives such as `list_records` (filed as CHARGENMCP-002).
- Skill default token-budget alignment (filed as CHARGENMCP-004).

## Acceptance Criteria

### Tests That Must Pass

1. New / extended packet-completeness test passes: `character_generation` packet's `governing_world_context.nodes` contains every invariant (full parsed `record`) and every M record (parsed `record` firewall fields) in the fixture world.
2. Existing `canon_addition` packet test passes unchanged (regression guard).
3. Existing character-generation packet tests pass unchanged or are updated to reflect the strengthened delivery.
4. Package-local `cd tools/world-mcp && npm test` passes. Reassessment correction: this checkout has a package-local `package.json`, not a root `pnpm --filter world-mcp` workspace command.
5. Manual dry-run remains out of scope for this implementation-only run unless the user explicitly invokes the character-generation workflow; packet-only feasibility is proven by the package test and skill prerequisite documentation update.

### Invariants

1. The `character_generation` packet is complete-by-construction for Phase 7a (every invariant) and Phase 7b (every M record's firewall fields).
2. Phase 7b's `world_consistency.mystery_reserve_firewall` audit-list discipline has a guaranteed retrieval surface (governing_world_context), not a heuristic dependence on impact-surface seeding.
3. No Mystery Reserve entry is silently resolved or weakened by this change (Rule 7 preservation).
4. `canon_addition` and `continuity_audit` packet behavior is unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (new) — asserts every-invariant + every-M-firewall-field parsed-record delivery for `character_generation` against fixture world.
2. Existing `tools/world-mcp/tests/integration/context-packet-canon-addition.test.ts` (verify-no-regression) — confirms the `canon_addition` packet shape is unchanged.
3. Existing `tools/world-mcp/tests/integration/spec12-live-corpus.test.ts` (modified) — confirms live `animalia` fixture returns `packet_incomplete_required_classes` at 8000 and succeeds at the computed retry budget with parsed governing records.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/character-generation-completeness.test.js`
3. `cd tools/world-mcp && node --test dist/tests/integration/context-packet-canon-addition.test.js`
4. `cd tools/world-mcp && npm test`
5. Manual skill dry-run is not claimed in this ticket closeout unless separately executed.

## Outcome

Completion date: 2026-04-27.

Implemented. `character_generation` governing context now includes every indexed invariant and Mystery Reserve record. Invariant nodes carry the full parsed `record`; Mystery Reserve nodes carry a parsed Phase 7b firewall projection (`id`, `status`, `what_is_unknown`, `disallowed_cheap_answers`, `common_in_world_interpretations`). `canon_addition` keeps its previous mandatory-node behavior.

The larger mandatory governing class exposed an existing retry-budget edge case: `minimum_required_budget` could be one token too low after the requested-budget value itself changed packet-header size. `assemble.ts` now computes a self-consistent retry budget, and the live-corpus test proves the retry succeeds.

Docs and skill references now state that Phase 7a/7b use the packet's parsed governing records instead of raw `_source/` reads or fallback scans.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/context-packet/character-generation-completeness.test.js`
3. `cd tools/world-mcp && node --test dist/tests/integration/context-packet-canon-addition.test.js`
4. `cd tools/world-mcp && node --test dist/tests/context-packet/character-generation-completeness.test.js dist/tests/integration/context-packet-canon-addition.test.js dist/tests/integration/spec12-live-corpus.test.js dist/tests/context-packet/budget-handling.test.js`
5. `cd tools/world-mcp && npm test` — 139 passing tests

Manual character-generation skill dry-run was not run; this ticket closes on packet-level proof and aligned skill documentation.

## Deviations

- The live packet node schema had no full body field, so the implementation uses an additive optional parsed `record` projection instead of overloading `body_preview`.
- The drafted root `pnpm --filter world-mcp ...` commands were replaced with the live package-local `tools/world-mcp` commands.
- `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/character-generation/SKILL.md`, and `.claude/skills/character-generation/references/phase-7-canon-safety-check.md` were same-seam documentation fallout beyond the original file list.
- Same-family local edits also changed `.claude/skills/character-generation/SKILL.md`, `.claude/skills/character-generation/references/world-state-prerequisites.md`, and `.claude/skills/character-generation/references/phase-0-normalize-brief.md` outside this ticket's owned code path; they were preserved and not reverted.
