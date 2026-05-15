# SPEC31STOCONHAR-014: Clarify story-local retrieval vs. packet seed nodes

**Status**: PENDING
**Priority**: LOW
**Effort**: Medium
**Engine Changes**: Yes — `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `tools/world-mcp/src/tools/get-context-packet.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

`seed_nodes` is world-record-oriented in `get_context_packet` semantics, but story-pipeline skills sometimes describe `seed_nodes` containing story-local ids. Story-local records are delivered through `story_slug` + `story_bundle_context` or via explicit `get_records(record_ids, story_slug=...)`. Mixing scopes risks under-delivered packets when story-local ids are passed as world seed nodes.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: CONTEXT-PACKET-CONTRACT.md and MACHINE-FACING-LAYER.md `:76` confirm the scope-conflation issue at the contract layer.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D14 specifies the clarification + skill audit.
3. **Cross-skill / cross-artifact boundary under audit**: 2 governing docs + 3 story-pipeline skill pre-flights + MCP server warning surface.
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — context-packet completeness guarantees depend on correct scope routing; story-local records cannot be expected via world-scope seed expansion.

## Architecture Check

1. **Cleaner than alternative**: explicit scope routing prevents under-delivered packets and forces the right retrieval surface (`get_records(story_slug=...)`) when story-local records are needed.
2. **No backwards-compatibility shims**: the warning surface (`task_header.warnings`) is additive; existing callers continue to work, but misuse becomes visible.

## Verification Layers

1. **CONTEXT-PACKET-CONTRACT and MACHINE-FACING-LAYER document the boundary** → codebase grep-proof.
2. **Story-pipeline skill pre-flights audit clean** → codebase grep-proof (no story-local ids in `seed_nodes` arguments).
3. **MCP server emits warning for story-local id in seed_nodes** → MCP integration test.

## What to Change

### 1. CONTEXT-PACKET-CONTRACT.md

Add a clarification section after the `seed_nodes` documentation:
```
For story-pipeline task types (`story_bootstrap`, `story_turn_cycle`,
`commitment_block_authoring`, `branching_story_health_audit`,
`story_fact_promotion_to_canon`), `seed_nodes` should preferentially name
world-canon or hybrid world records (CF / CH / M / OQ / INV / ENT / SEC /
CHAR / DA-world / PA). Story-bundle records are supplied through
`story_slug` and `story_bundle_context`; when exact story-local records
are needed, use `get_records(record_ids, story_slug=<story_slug>)` or
`list_records(record_type, story_slug=<story_slug>)`. Do not rely on
world-scope `seed_nodes` expansion for story-local ids unless the
deployed MCP capability explicitly documents that support.
```

### 2. MACHINE-FACING-LAYER.md `:76`

Add a one-line cross-reference to the new contract section in the `get_context_packet` row.

### 3. Skill audit

Audit `branching-story-health-audit`, `commitment-block-authoring`, and `story-fact-promotion-to-canon` pre-flight `get_context_packet` calls. If any pass story-local ids in `seed_nodes`, refactor to use `story_slug` + targeted `get_records`. (Implementation note: search each skill's pre-flight section for `seed_nodes=` and audit each id class.)

### 4. MCP server (`tools/world-mcp/src/tools/get-context-packet.ts`)

If the implementation currently silently expands story-local ids passed as world `seed_nodes` (or silently drops them), emit a warning in the packet response (`task_header.warnings: ['story_local_seed_nodes_ignored']`). Implementation may choose strict rejection instead; warning is the lower-risk default.

## Files to Touch

- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify — `:76`)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — pre-flight, if applicable)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — pre-flight, if applicable)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — pre-flight, if applicable)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — warning surface)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — new fixture)

## Out of Scope

- Strict rejection of story-local ids in `seed_nodes` — warning is the default; strict rejection is a follow-up if warnings prove insufficient.
- Other task types' seed_nodes semantics — unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. MCP integration test: `get_context_packet(story_turn_cycle, seed_nodes=['SF-3'])` (story-local id without `story_slug`) → warning in `task_header.warnings`.
2. Cross-file audit: every story-pipeline skill's pre-flight `get_context_packet` call uses world ids in `seed_nodes` only.

### Invariants

1. Story-local records are never expected via world-scope seed expansion.
2. Misuse of `seed_nodes` for story-local ids is visible in the packet response.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — new fixture: story-local id in seed_nodes → warning.

### Commands

1. `pnpm --filter @worldloom/world-mcp test -t "seed_nodes"` → green.
2. `grep -nE "seed_nodes=\[.*(SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP)-" .claude/skills/branching-story-*/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md` → 0 matches.
