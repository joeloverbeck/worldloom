# SPEC31STOCONHAR-014: Clarify story-local retrieval vs. packet seed nodes

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Medium
**Engine Changes**: Yes — `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `specs/SPEC-31-story-contract-hardening-iii.md`, `.claude/skills/branching-story-health-audit/SKILL.md`, `.claude/skills/commitment-block-authoring/SKILL.md`, `.claude/skills/story-fact-promotion-to-canon/SKILL.md`, `tools/world-mcp/src/context-packet/assemble.ts`, `tools/world-mcp/src/context-packet/shared.ts`, `tools/world-mcp/src/tools/get-context-packet.ts`, `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, `seed_nodes` was world-record-oriented in `get_context_packet` semantics, but story-pipeline skills sometimes described `seed_nodes` containing story-local ids. Story-local records are delivered through `story_slug` + `story_bundle_context` or via explicit `get_records(record_ids, story_slug=...)`. Mixing scopes risked under-delivered packets when story-local ids were passed as world seed nodes.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: `docs/CONTEXT-PACKET-CONTRACT.md` and `docs/MACHINE-FACING-LAYER.md` document the story-pipeline packet scope; `tools/world-mcp/src/tools/get-context-packet.ts` delegates packet assembly without currently surfacing story-local seed misuse warnings.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D14 specifies the clarification + skill audit.
3. **Cross-skill / cross-artifact boundary under audit**: 2 governing docs + 3 story-pipeline skill pre-flights + MCP server warning surface.
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — context-packet completeness guarantees depend on correct scope routing; story-local records cannot be expected via world-scope seed expansion.
5. **Pre-flight audit result**: the three named skills currently mix world-canon and story-local ids in `seed_nodes` prose (`STENT`, `OBL`, `THR`, `SF`, and source story ids). This ticket owns rewriting those pre-flight instructions to keep world-canon ids in `seed_nodes` and load story-local ids through `story_slug` + targeted `get_records` / `list_records`.
6. **Proof command correction**: the repo has package-local manifests and no root `pnpm-workspace.yaml`; the runnable proof is `npm test -- --test-name-pattern "seed_nodes"` from `tools/world-mcp/`, not the drafted root `pnpm --filter @worldloom/world-mcp test -t "seed_nodes"` command.

## Architecture Check

1. **Cleaner than alternative**: explicit scope routing prevents under-delivered packets and forces the right retrieval surface (`get_records(story_slug=...)`) when story-local records are needed.
2. **No backwards-compatibility shims**: the warning surface (`task_header.warnings`) is additive; existing callers continue to work, but misuse becomes visible.

## Verification Layers

1. **CONTEXT-PACKET-CONTRACT and MACHINE-FACING-LAYER document the boundary** → codebase grep-proof.
2. **Story-pipeline skill pre-flights audit clean** → codebase grep-proof (no story-local ids in `seed_nodes` arguments).
3. **MCP server emits warning for story-local id in seed_nodes** → MCP integration test.

## Landed Changes

### 1. CONTEXT-PACKET-CONTRACT.md

Added `task_header.warnings` to the canonical packet shape and documented the story-pipeline `seed_nodes` boundary in Assembly Discipline:
```
For story-pipeline task types (`story_bootstrap`, `story_turn_cycle`,
`commitment_block_authoring`, `branching_story_health_audit`,
`story_fact_promotion_to_canon`), `seed_nodes` should preferentially name
world-canon or hybrid world records (CF / CH / M / OQ / INV / ENT / SEC /
CHAR / DA-world / PA). Story-bundle records are supplied through
`story_slug` and `story_bundle_context`; when exact story-local records
are needed, use `get_records(record_ids, story_slug=<story_slug>)` or
`list_records(record_type, story_slug=<story_slug>)`. Do not rely on
world-scope `seed_nodes` expansion for story-local ids. If a story-pipeline
request supplies story-local ids in `seed_nodes`, the packet returns
`task_header.warnings: ["story_local_seed_nodes_ignored"]`.
```

### 2. MACHINE-FACING-LAYER.md `:76`

The `get_context_packet` row now states that story-pipeline `seed_nodes` are world-scope seeds and cross-references `docs/CONTEXT-PACKET-CONTRACT.md` §Assembly Discipline for warning behavior.

### 3. Skill audit

Audited `branching-story-health-audit`, `commitment-block-authoring`, and `story-fact-promotion-to-canon` pre-flight `get_context_packet` calls. Each now keeps story-local records on `story_slug` scoped retrieval paths (`story_bundle_context`, `get_records`, or `list_records`) and reserves `seed_nodes` for world-scope ids.

### 4. MCP server (`tools/world-mcp/src/tools/get-context-packet.ts`)

The implementation emits a warning in the packet response (`task_header.warnings: ['story_local_seed_nodes_ignored']`) when a story-pipeline request supplies story-local ids in `seed_nodes`. Warning is the lower-risk default; strict rejection is out of scope.

## Files to Touch

- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify — `:76`)
- `specs/SPEC-31-story-contract-hardening-iii.md` (modify — D14 implementation note)
- `.claude/skills/branching-story-health-audit/SKILL.md` (modify — pre-flight)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — pre-flight)
- `.claude/skills/story-fact-promotion-to-canon/SKILL.md` (modify — pre-flight)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — initialize `task_header.warnings`)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — packet type)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — warning surface)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — new fixture)

## Out of Scope

- Strict rejection of story-local ids in `seed_nodes` — warning is the default; strict rejection is a follow-up if warnings prove insufficient.
- Other task types' seed_nodes semantics — unchanged.

## Acceptance Criteria

### Tests That Must Pass

1. MCP integration test: `get_context_packet(story_turn_cycle, story_slug=<story>, seed_nodes=['opening-bells:SF-0001'])` → warning in `task_header.warnings`. Calls without `story_slug` remain covered by the existing required-argument test.
2. Cross-file audit: every story-pipeline skill's pre-flight `get_context_packet` call uses world ids in `seed_nodes` only.

### Invariants

1. Story-local records are never expected via world-scope seed expansion.
2. Misuse of `seed_nodes` for story-local ids is visible in the packet response.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — new fixture: story-local id in seed_nodes → warning.

### Commands

1. From `tools/world-mcp/`: `npm test -- --test-name-pattern "seed_nodes"` → green.
2. From `tools/world-mcp/`: `node --test dist/tests/tools/get-context-packet.story-pipeline.test.js --test-name-pattern seed_nodes` → green.
3. `rg -n 'seed_nodes=<[^>]*(SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP)' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md` → 0 matches.

## Outcome

Completed: 2026-05-15

The context-packet contract now explicitly treats story-pipeline `seed_nodes` as world-scope seeds and documents `task_header.warnings` as the non-fatal diagnostic surface. `docs/MACHINE-FACING-LAYER.md` cross-references that routing rule from the `get_context_packet` row.

The three audited story skills now keep story-local records on `story_slug` scoped retrieval paths: health audit, commitment block authoring, and story fact promotion no longer instruct callers to pass `STENT`, `SF`, `OBL`, `THR`, source story ids, or other story-local records through world-scope packet seeds.

`tools/world-mcp` now initializes `task_header.warnings` and adds `story_local_seed_nodes_ignored` when a story-pipeline packet request still supplies story-local seed ids. `SPEC-31` D14 also has a dated implementation note marking the original problem/change prose as historical intake context.

## Verification Result

- `npm test -- --test-name-pattern "seed_nodes"` from `tools/world-mcp/` passed after rebuilding `dist/`; the package wrapper reported the full compiled suite as green: 358 pass, 0 fail.
- `node --test dist/tests/tools/get-context-packet.story-pipeline.test.js --test-name-pattern seed_nodes` from `tools/world-mcp/` passed the direct compiled story-pipeline packet file: 4 pass, 0 fail.
- `rg -n 'seed_nodes=<[^>]*(SF|BEL|SE|OBL|CNSQ|THR|SREL|STINT|STENT|STSTAT|STLOC|STOBJ|BR|PG|CHC|SLT|SLB|SAU|SP|RSP)' .claude/skills/branching-story-health-audit/SKILL.md .claude/skills/commitment-block-authoring/SKILL.md .claude/skills/story-fact-promotion-to-canon/SKILL.md` returned no matches, proving the scoped pre-flight prose no longer puts story-local ids in `seed_nodes`.
- `git diff --check` passed.

## Deviations

- The drafted root `pnpm --filter @worldloom/world-mcp test -t "seed_nodes"` command was replaced because this repo has package-local `npm` manifests and no root `pnpm-workspace.yaml`.
- The warning test uses the indexed story-local node id form (`opening-bells:SF-0001`) so the existing local-authority lookup can resolve the seed before emitting the warning. Bare authored ids such as `SF-0001` remain invalid as world-scope node ids in the current lookup path.
