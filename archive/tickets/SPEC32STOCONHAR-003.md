# SPEC32STOCONHAR-003: Resolve story-local seed IDs in turn-cycle pre-flight

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: `branching-story-turn-cycle` (skill prose only)
**Deps**: None

## Problem

At intake, `.claude/skills/branching-story-turn-cycle/SKILL.md:147` (World-State Prerequisites bullet) said: *"World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', seed_nodes=<active cast + active location + parent's unresolved mystery claims>, token_budget=<default>)`."* The phrases "active cast" and "active location" were ambiguous. In story state, the active cast is encoded as `STENT` records and the active location as `STLOC` records — both story-local IDs that the context-packet contract at `docs/CONTEXT-PACKET-CONTRACT.md:157` and `docs/MACHINE-FACING-LAYER.md` forbid as `seed_nodes` for story-pipeline task types.

SPEC-31 D14 landed the MCP-server-side defense: the regex `STORY_LOCAL_SEED_NODE_PATTERN` at `tools/world-mcp/src/tools/get-context-packet.ts:29-40` detects story-local IDs (`STENT|STLOC|SF|BEL|SE|...`) and emits `task_header.warnings: ["story_local_seed_nodes_ignored"]` when they appear in `seed_nodes` for story-pipeline tasks. The contract docs were also updated. Before this ticket, the skill prose at `branching-story-turn-cycle/SKILL.md:147` was not updated to instruct callers to pre-resolve `STENT.bound_char_id` to world `ENT`/`CHAR` IDs and `STLOC.bound_ent` (or governing SEC/CF ids) to world-scope IDs BEFORE the `get_context_packet` call. The warning fired when a turn-cycle skill author misread "active cast" as "STENT ids."

This ticket landed the skill-prose discipline that completes SPEC-31 D14's defense: the skill enumerates the world-scope resolution paths for STENT / STLOC / mystery claims, explicitly lists the story-local ID prefixes that must NOT be passed as seeds, and points callers at `get_records(story_slug=...)` / `list_records(story_slug=...)` for story-local retrieval.

## Assumption Reassessment (2026-05-16)

1. At intake, Turn-cycle SKILL.md:147 existed at the current path and contained the literal text *"seed_nodes=<active cast + active location + parent's unresolved mystery claims>"*. The MCP server warning is wired at `tools/world-mcp/src/tools/get-context-packet.ts:29-40` (verified — `STORY_LOCAL_SEED_NODE_PATTERN` regex enumerates `SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP`).
2. Context-packet contract `docs/CONTEXT-PACKET-CONTRACT.md:157` confirms the story-pipeline seed-node discipline: world-scope seeds only; story-local records via `story_slug` + `story_bundle_context`. MACHINE-FACING-LAYER (`docs/MACHINE-FACING-LAYER.md`) repeats the discipline.
3. Cross-skill / cross-artifact boundary: turn-cycle's `get_context_packet` call IS the boundary — the skill is the caller, the MCP server is the consumer. The MCP test at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:110` asserts the warning behavior; no new test is required for this ticket. SPEC-32 §D2 Risks anticipated this resolution.
4. FOUNDATIONS §Tooling Recommendation at `docs/FOUNDATIONS.md:528`: *"Story-pipeline skills (Skill Category 2c) depend on this same MCP retrieval surface for world-canon reads."* The skill prose update brings turn-cycle into compliance with this clause; world-canon context packets receive world-scope seeds, and story-local retrieval routes through `story_slug` + `get_records` / `list_records`.

## Architecture Check

1. Cleaner than adding a skill-side preflight filter that drops story-local IDs before the MCP call: the MCP server's `story_local_seed_nodes_ignored` warning is already the canonical defense (per SPEC-31 D14), so a skill-side filter would duplicate the check. Documented skill-prose discipline at the call site is the missing piece; the warning continues to serve as the audit-trail backstop when a future caller skips the discipline.
2. No backwards-compatibility shims. The change is a single bullet prose replacement at line 147.

## Verification Layers

1. Turn-cycle SKILL.md:147 enumerates STENT/STLOC/etc. as forbidden seeds and resolves them to world-scope IDs → codebase grep-proof (`` grep -nE 'Do not pass `STENT`' .claude/skills/branching-story-turn-cycle/SKILL.md ``).
2. Existing MCP test at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:110` continues to assert the warning fires when story-local IDs appear in `seed_nodes` for `task_type='story_turn_cycle'` → existing test pass.
3. Skill-prose conformance check is not automated (skill prose is not validator-checked); manual review confirms the replacement preserves the existing `change_log_entry` follow-up sentence after the seed_nodes bullet.

## Landed Changes

### 1. Replace the World-State Prerequisites bullet at line 147

Replaced the existing bullet at `.claude/skills/branching-story-turn-cycle/SKILL.md:147`:

```
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', seed_nodes=<active cast + active location + parent's unresolved mystery claims>, token_budget=<default>)`; the latest `change_log_entry` in governing context is the current world-canon revision for §4b drift-trigger comparison. If the parent baseline is stale, targeted follow-up retrieval of the intervening CH window and CF-to-section reverse links is required before drift classification.
```

with:

```
- World canon context packet via `mcp__worldloom__get_context_packet(world_slug, task_type='story_turn_cycle', story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, token_budget=<default>)`. Derive `seed_nodes` from the parent snapshot by resolving story-local state to world-scope anchors: active `STENT` -> resolved world `CHAR-<integer>` / `ENT-<integer>` ids via `STENT.bound_char_id` (when bound to a character) or `STENT.bound_ent_id` (when bound to a non-character named entity); active `STLOC` -> resolved governing world `SEC-<prefix>-<integer>` / `CF-<integer>` / `ENT-<integer>` ids via `STLOC.bound_ent` or `STLOC.governing_section_id`; parent's unresolved mystery claims -> `M-<integer>` ids from `PG.state_snapshot.unresolved_mystery_claims[]`; active-period anchors -> `CH-<integer>` / `SEC-<integer>` / `CF-<integer>` ids when known. Do not pass `STENT`, `STLOC`, `SF`, `BEL`, `PG`, `SE`, `CHC`, `SLT`, `OBL`, `CNSQ`, `THR`, `SREL`, `STINT`, `STOBJ`, `STSTAT`, `BR`, `SLB`, `SAU`, `SP`, or `RSP` ids as context-packet `seed_nodes`; passing any story-local id triggers the MCP server's `story_local_seed_nodes_ignored` warning (see `tools/world-mcp/src/tools/get-context-packet.ts`) and the seed is discarded. Story-local records are loaded through `story_slug` + `story_bundle_context`, `mcp__worldloom__get_records(record_ids=..., story_slug=<story_slug>)`, or `mcp__worldloom__list_records(record_type=..., story_slug=<story_slug>)`. The latest `change_log_entry` in governing context is the current world-canon revision for §4b drift-trigger comparison. If the parent baseline is stale, targeted follow-up retrieval of the intervening CH window and CF-to-section reverse links is required before drift classification.
```

The existing `change_log_entry` follow-up sentence is preserved at the end of the new bullet, since it covers a separate concern (canon-baseline drift trigger) that the SPEC-32 §D2 proposed replacement also retained implicitly.

## Files to Touch

- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — line 147 bullet rewrite, preserving the `change_log_entry` tail clause)

## Out of Scope

- New MCP test for `story_local_seed_nodes_ignored` warning — already exists from SPEC-31 D14 (verified at `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:110`).
- Skill-side preflight filter that rejects story-local IDs before the MCP call — the MCP server's warning is the canonical defense; the skill-prose discipline is sufficient.
- MCP server changes — no schema or behavior change.
- New validator-fixture directory under `tools/validators/tests/fixtures/branching-story-turn-cycle/` — no per-skill convention exists in the codebase, and the MCP test already covers the warning surface.
- Contract `docs/CONTEXT-PACKET-CONTRACT.md` edits — already updated per SPEC-31 D14.
- The `change_log_entry` tail clause and §4b drift-trigger discipline — preserved verbatim; not in scope for this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `` grep -nE 'Do not pass `STENT`' .claude/skills/branching-story-turn-cycle/SKILL.md `` returns a match in the rewritten bullet.
2. `grep -n "resolved world-scope ids only" .claude/skills/branching-story-turn-cycle/SKILL.md` returns a match.
3. `grep -nE "active cast \\+ active location" .claude/skills/branching-story-turn-cycle/SKILL.md` returns no matches (the old ambiguous wording is gone).
4. `grep -n "change_log_entry" .claude/skills/branching-story-turn-cycle/SKILL.md` returns a match in the rewritten bullet (the tail clause is preserved).
5. `npm --prefix tools/world-mcp test` runs the existing `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:110` assertion and passes — no test changes required.

### Invariants

1. The MCP server's `story_local_seed_nodes_ignored` warning continues to fire when callers pass story-local IDs as `seed_nodes` for story-pipeline tasks (unchanged behavior; existing test coverage).
2. Story-local records remain retrievable through `story_slug` + `story_bundle_context` / `get_records(story_slug=…)` / `list_records(story_slug=…)`; the skill-prose discipline points callers to these paths.
3. Canon-baseline drift trigger (`change_log_entry` comparison + CH-window follow-up retrieval) is preserved verbatim from the existing bullet — not affected by this ticket.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment (the MCP test at tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts:110 from SPEC-31 D14).`

### Commands

1. `` grep -nE 'Do not pass `STENT`' .claude/skills/branching-story-turn-cycle/SKILL.md ``
2. `grep -nE "active cast \\+ active location" .claude/skills/branching-story-turn-cycle/SKILL.md` (must return no matches)
3. `npm --prefix tools/world-mcp test` (regression check; existing test for `story_local_seed_nodes_ignored` still passes)

## Outcome

Completed: 2026-05-16

`.claude/skills/branching-story-turn-cycle/SKILL.md` now tells turn-cycle callers to call `mcp__worldloom__get_context_packet(..., story_slug=<story_slug>, seed_nodes=<resolved world-scope ids only>, ...)`, derive seeds from story-local parent state by resolving STENT/STLOC records to world-scope anchors, and avoid passing story-local IDs as `seed_nodes`. The rewritten bullet preserves the existing `change_log_entry` canon-baseline drift language.

No MCP server or validator changes were needed. The server-side `story_local_seed_nodes_ignored` warning and its existing test coverage were already present.

## Verification Result

Commands run on 2026-05-16:

1. `` grep -nE 'Do not pass `STENT`' .claude/skills/branching-story-turn-cycle/SKILL.md `` — passed; matched the rewritten bullet.
2. `grep -n "resolved world-scope ids only" .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; matched the rewritten bullet.
3. `grep -nE "active cast \\+ active location" .claude/skills/branching-story-turn-cycle/SKILL.md` — passed by returning no matches.
4. `grep -n "change_log_entry" .claude/skills/branching-story-turn-cycle/SKILL.md` — passed; confirmed the canon-baseline drift tail remains.
5. `npm --prefix tools/world-mcp test` — passed; 70 tests passed, including `dist/tests/tools/get-context-packet.story-pipeline.test.js`.

## Deviations

- The drafted optional MCP test was not added because the existing SPEC-31 D14 coverage is live and passed in `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`.
- The implementation was skill-prose only; no schema, MCP server, or validator fixture changed.
