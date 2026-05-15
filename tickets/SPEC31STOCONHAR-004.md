# SPEC31STOCONHAR-004: Normalize `story_bootstrap` context-packet behavior

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `tools/world-mcp/src/tools/get-context-packet.ts`
**Deps**: `specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

Three documents tell three different stories about `story_bootstrap`:
- `docs/CONTEXT-PACKET-CONTRACT.md:125`: callers supply `story_slug` as target slug; `story_bundle_context` is `null`.
- `docs/MACHINE-FACING-LAYER.md:76`: `story_bootstrap` "requires `story_slug` and returns `story_bundle_context` populated from indexed story-bundle records" — contradicts the contract because the bundle does not exist at bootstrap time.
- `branching-story-bootstrap/SKILL.md:209`: pre-flight call is `get_context_packet(world_slug, task_type='story_bootstrap', seed_nodes=..., token_budget=...)` — no `story_slug` argument supplied.

The bundle does not exist at bootstrap; the contract is correct, MACHINE-FACING-LAYER's wording is wrong, and the skill call is incomplete.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified**: CONTEXT-PACKET-CONTRACT `:125`, MACHINE-FACING-LAYER `:76`, bootstrap `:209,:195` all verified at quoted locations during brainstorm verification.
2. **Spec assumptions verified**: `specs/SPEC-31-story-contract-hardening-iii.md` §D4 specifies the standardization explicitly.
3. **Cross-skill / cross-artifact boundary under audit**: MCP server `get_context_packet` task-type handler ↔ bootstrap skill ↔ two governing docs. The MCP server may need to short-circuit its bundle-lookup path for `story_bootstrap` (the bundle doesn't yet exist; the slug is a target identifier).
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — "LLM agents should never operate on prose alone ... the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The 3-way drift breaks completeness guarantees for bootstrap because the skill's call shape disagrees with both contract documents on what is supplied vs. returned. Standardization restores the contract.

## Architecture Check

1. **Cleaner than alternative**: standardizing on "requires `story_slug`, returns `null` story_bundle_context" matches the on-disk reality (the bundle does not exist) and the contract intent. MACHINE-FACING-LAYER's "populated" wording was simply wrong.
2. **No backwards-compatibility shims**: pre-production-greenfield posture; the server-behavior breaking change is low-risk.

## Verification Layers

1. **MCP `get_context_packet(story_bootstrap, story_slug='new-bundle')` returns `story_bundle_context: null` and populated INV / M / OQ full bodies** → MCP integration test.
2. **MCP `get_context_packet(story_bootstrap)` without `story_slug` returns a required-argument error** → MCP integration test.
3. **Bootstrap pre-flight call passes `story_slug` parameter** → codebase grep-proof (skill prose at `:209` includes `story_slug=<story_slug>`).
4. **MACHINE-FACING-LAYER and CONTEXT-PACKET-CONTRACT agree on bootstrap's return shape** → codebase grep-proof (both docs say `story_bundle_context: null` for `story_bootstrap`).

## What to Change

### 1. CONTEXT-PACKET-CONTRACT.md

Keep `:125` as authoritative. Ensure the full-body candidates table includes a `story_bootstrap` row:
```
| `story_bootstrap` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
```

### 2. MACHINE-FACING-LAYER.md `:76`

Replace the over-broad sentence about populated story_bundle_context with:
```
`story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`,
`branching_story_health_audit`, and `story_fact_promotion_to_canon` require
`story_slug`. For `story_bootstrap`, the slug is the target bundle slug and
`story_bundle_context` is `null` because the bundle does not yet exist. For
the other story-pipeline task types, `story_bundle_context` is populated from
indexed story-bundle records plus `STORY_KERNEL.md` frontmatter.
```

### 3. Bootstrap skill (`.claude/skills/branching-story-bootstrap/SKILL.md`)

Update pre-flight call at `:209` (and matching prose at `:195`):
```
mcp__worldloom__get_context_packet(
    world_slug,
    task_type='story_bootstrap',
    story_slug=<story_slug>,
    seed_nodes=<cast CHAR ids + initial_location label if provided>,
    token_budget=<default>
)
```

### 4. MCP server (`tools/world-mcp/src/tools/get-context-packet.ts`)

If the current `story_bootstrap` task_type handler rejects `story_slug` (because no indexed bundle exists), short-circuit the bundle-lookup path: accept the slug as a target identifier without requiring a corresponding indexed bundle. Return `story_bundle_context: null` per contract. Also make `story_slug` a required argument for `story_bootstrap`; emit a clear input-validation error if omitted.

## Files to Touch

- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify — `:76`)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — `:195`, `:209`)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — story_bootstrap handler)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — new fixtures)

## Out of Scope

- Other task_types' return-shape semantics — unchanged.
- Indexed-bundle existence at pre-bootstrap time — bundle creation is the bootstrap skill's job, not the packet server's.

## Acceptance Criteria

### Tests That Must Pass

1. MCP integration test: `get_context_packet(world_slug, task_type='story_bootstrap', story_slug='new-bundle')` → `story_bundle_context: null`, populated INV / M / OQ full bodies.
2. MCP integration test: same call without `story_slug` → required-argument error.
3. Bootstrap dry-run produces a context packet with `story_bundle_context: null`.

### Invariants

1. CONTEXT-PACKET-CONTRACT, MACHINE-FACING-LAYER, and the bootstrap skill all agree on the `story_bootstrap` packet shape.
2. `story_slug` is required for every story-pipeline task_type at the MCP server level.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.test.ts` — fixture: `story_bootstrap` with `story_slug` → null story_bundle_context; without `story_slug` → error.

### Commands

1. `pnpm --filter @worldloom/world-mcp test -t "story_bootstrap"` → green.
2. `grep -n "story_slug" .claude/skills/branching-story-bootstrap/SKILL.md` → match at the pre-flight call site.
