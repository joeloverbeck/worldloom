# SPEC31STOCONHAR-004: Normalize `story_bootstrap` context-packet behavior

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `tools/world-mcp/src/server.ts`, `tools/world-mcp/README.md`, `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts`
**Deps**: `archive/specs/SPEC-31-story-contract-hardening-iii.md`

## Problem

At intake, three documents told three different stories about `story_bootstrap`:
- `docs/CONTEXT-PACKET-CONTRACT.md:125`: callers supply `story_slug` as target slug; `story_bundle_context` is `null`.
- `docs/MACHINE-FACING-LAYER.md:76`: `story_bootstrap` "requires `story_slug` and returns `story_bundle_context` populated from indexed story-bundle records" — contradicts the contract because the bundle does not exist at bootstrap time.
- `branching-story-bootstrap/SKILL.md:209`: pre-flight call is `get_context_packet(world_slug, task_type='story_bootstrap', seed_nodes=..., token_budget=...)` — no `story_slug` argument supplied.

The bundle does not exist at bootstrap; the contract is correct. This ticket aligned the remaining stale docs, skill, README, and registered MCP capability text to that behavior.

## Assumption Reassessment (2026-05-15)

1. **Codebase symbols verified against the live repo**: `docs/CONTEXT-PACKET-CONTRACT.md` already states that `story_bootstrap` uses `story_slug` as the target slug and returns `story_bundle_context: null`; `tools/world-mcp/src/context-packet/assemble.ts` already excludes `story_bootstrap` from bundle-context loading; `tools/world-mcp/src/tools/get-context-packet.ts` already requires `story_slug` for every story-pipeline task type. Remaining stale surfaces are the full-body candidate table, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-bootstrap/SKILL.md`, `tools/world-mcp/src/server.ts` capability text, `tools/world-mcp/README.md`, and focused test coverage for the `story_bootstrap` missing-`story_slug` rejection.
2. **Spec assumptions verified**: `archive/specs/SPEC-31-story-contract-hardening-iii.md` §D4 specifies the standardization explicitly.
3. **Cross-skill / cross-artifact boundary under audit**: MCP server `get_context_packet` task-type handler ↔ bootstrap skill ↔ two governing docs. The MCP server may need to short-circuit its bundle-lookup path for `story_bootstrap` (the bundle doesn't yet exist; the slug is a target identifier).
4. **FOUNDATIONS principle under audit (restated)**: §Tooling Recommendation — "LLM agents should never operate on prose alone ... the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The 3-way drift breaks completeness guarantees for bootstrap because the skill's call shape disagrees with both contract documents on what is supplied vs. returned. Standardization restores the contract.
5. **HARD-GATE read not required**: this ticket changes read-only context-packet retrieval semantics and caller documentation; it does not alter canon mutation, approval tokens, validator gate results, or Mystery Reserve enforcement.

## Architecture Check

1. **Cleaner than alternative**: standardizing on "requires `story_slug`, returns `null` story_bundle_context" matches the on-disk reality (the bundle does not exist) and the contract intent. MACHINE-FACING-LAYER's "populated" wording was simply wrong.
2. **No backwards-compatibility shims**: pre-production-greenfield posture; the server-behavior breaking change is low-risk.

## Verification Layers

1. **Package handler `get_context_packet(story_bootstrap, story_slug='new-bundle')` returns `story_bundle_context: null` and populated INV / M / OQ full bodies** → focused package test.
2. **Package handler `get_context_packet(story_bootstrap)` without `story_slug` returns a required-argument error** → focused package test.
3. **Bootstrap pre-flight call passes `story_slug` parameter** → codebase grep-proof (skill prose at `:209` includes `story_slug=<story_slug>`).
4. **MACHINE-FACING-LAYER and CONTEXT-PACKET-CONTRACT agree on bootstrap's return shape** → codebase grep-proof (both docs say `story_bundle_context: null` for `story_bootstrap`).

## Landed Changes

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

### 4. MCP public surfaces

The core handler already accepts `story_bootstrap` `story_slug` as a target identifier and returns `story_bundle_context: null`. Land the remaining package surface cleanup by updating the registered `get_context_packet` capability text, README wording, and focused tests so the public contract matches the handler.

## Files to Touch

- `docs/CONTEXT-PACKET-CONTRACT.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify — `:76`)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — `:195`, `:209`)
- `tools/world-mcp/src/server.ts` (modify — registered capability text)
- `tools/world-mcp/README.md` (modify — package quick-reference text)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — explicit `story_bootstrap` missing-`story_slug` rejection)

## Out of Scope

- Other task_types' return-shape semantics — unchanged.
- Indexed-bundle existence at pre-bootstrap time — bundle creation is the bootstrap skill's job, not the packet server's.

## Acceptance Criteria

### Tests That Must Pass

1. Package handler test: `get_context_packet(world_slug, task_type='story_bootstrap', story_slug='new-bundle')` → `story_bundle_context: null`, populated INV / M / OQ full bodies.
2. Package handler test: same call without `story_slug` → required-argument error.
3. Bootstrap skill contract text passes `story_slug=<story_slug>` and describes `story_bundle_context: null` for the target bundle.

### Invariants

1. CONTEXT-PACKET-CONTRACT, MACHINE-FACING-LAYER, and the bootstrap skill all agree on the `story_bootstrap` packet shape.
2. `story_slug` is required for every story-pipeline task_type at the MCP server level.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — fixture: `story_bootstrap` with `story_slug` → null story_bundle_context; without `story_slug` → error.

### Commands

1. `npm run build` from `tools/world-mcp` → green.
2. `node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` from `tools/world-mcp` → green.
3. `grep -n "story_slug" .claude/skills/branching-story-bootstrap/SKILL.md` → match at the pre-flight call site.

## Outcome

Completed: 2026-05-15

The `story_bootstrap` context-packet contract is now aligned across the repo:

- `docs/CONTEXT-PACKET-CONTRACT.md` includes `story_bootstrap` in the full-body candidate table with world-canon governing classes.
- `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, and the registered `get_context_packet` capability text now distinguish `story_bootstrap` from other story-pipeline task types: it requires `story_slug` as a target slug and returns `story_bundle_context: null`.
- `.claude/skills/branching-story-bootstrap/SKILL.md` now passes `story_slug=<story_slug>` in its context-packet pre-flight call and explicitly expects null story-bundle context before the bundle exists.
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` now proves `story_bootstrap` rejects missing `story_slug`; existing tests already proved the target-slug/null-context behavior.

## Verification Result

1. `npm run build` from `tools/world-mcp` — passed.
2. `node --test dist/tests/tools/get-context-packet.story-pipeline.test.js` from `tools/world-mcp` — passed, 3 tests.
3. `grep -n "story_slug" .claude/skills/branching-story-bootstrap/SKILL.md` — confirmed the pre-flight call includes `story_slug=<story_slug>` at lines 195 and 209.
4. `rg -n "story_bootstrap.*story_bundle_context populated|Story-pipeline task types require story_slug and return story_bundle_context populated|task_type='story_bootstrap', seed_nodes|world_slug, task_type='story_bootstrap', seed_nodes|return story_bundle_context populated from indexed" docs .claude/skills tools/world-mcp/src tools/world-mcp/README.md archive/tickets/SPEC31STOCONHAR-004.md` — remaining hits are the ticket's labelled historical intake evidence and this verification command.
5. `git diff --check -- archive/tickets/SPEC31STOCONHAR-004.md docs/CONTEXT-PACKET-CONTRACT.md docs/MACHINE-FACING-LAYER.md .claude/skills/branching-story-bootstrap/SKILL.md tools/world-mcp/src/server.ts tools/world-mcp/README.md tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — passed.

## Deviations

- The drafted `tools/world-mcp/src/tools/get-context-packet.ts` handler change was already live before this run; this ticket completed the remaining contract/docs/test surfaces instead.
- `npm test` from `tools/world-mcp` rebuilt successfully and then failed one broad, pre-existing live-index fixture assertion: `erotica-world character and artifact skill defaults protect governing full bodies` returned `index_version_mismatch` instead of `packet_incomplete_required_classes`. The focused 004 handler test passed, so this ticket does not widen into live-world index maintenance.
