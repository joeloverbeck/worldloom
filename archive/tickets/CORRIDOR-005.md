# CORRIDOR-005: New `get_firewall_content` MCP tool — focused Mystery Reserve disallowed-cheap-answers retrieval

**Status**: DONE
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/` (new tool); `docs/CONTEXT-PACKET-CONTRACT.md` cross-reference; `.claude/skills/` Phase 7b firewall procedures (cross-reference)
**Deps**: None — net-additive new tool

## Problem

Phase 7b Mystery Reserve firewall audits in canon-reading and canon-mutating skills require the operator to check, for every M-NNNN record relevant to the artifact's claim domain, whether any artifact body / claim_map entry / epistemic_horizon item matches an item from the M record's `disallowed_cheap_answers` list. The current retrieval paths are:

1. `get_context_packet(...)` — bundles M records along with all other classes; suffers the budget-pressure issues documented in CORRIDOR-001 / CORRIDOR-002 / CORRIDOR-003.
2. `get_record('M-NNNN')` per id — works correctly but requires N calls for N M records (Animalia has 20).

Neither path is focused on the firewall use case. The Phase 7b audit is mechanically simple — for each M-id, fetch the `disallowed_cheap_answers` and `common_in_world_interpretations` lists, compare against the artifact's claim surface — and would benefit from a single-call tool that returns just that data keyed by M-id.

Session evidence from DA-0003 generation: the dossier-trace shortcut covered Phase 7b firewall by transferring the dossier's pre-cleared `mystery_reserve_firewall` list. Without the dossier shortcut, the operator faced a choice between a budget-pressured packet call or 20 individual `get_record` calls. A focused tool eliminates this choice.

## Assumption Reassessment (2026-04-27)

1. `tools/world-mcp/src/server.ts` registers MCP tools; `tools/world-mcp/src/tool-names.ts` defines tool-name constants. Adding `get_firewall_content` follows the same registration pattern as existing tools.
2. `tools/world-index/src/schema/types.ts` defines `MysteryRecord` (referenced by `tools/patch-engine/src/envelope/schema.ts:7`); the M-record's `disallowed_cheap_answers` and `common_in_world_interpretations` fields are part of that schema and are queryable via the index.
3. Cross-artifact boundary: this ticket adds a new MCP tool; existing tools and skills are unaffected unless they opt into the new tool.
5. HARD-GATE / Mystery Reserve firewall: Rule 7 (Preserve Mystery Deliberately) is the FOUNDATIONS principle this tool serves. The tool returns world-truth data (the M record's bounded-unknown surface) but does NOT leak `disallowed_cheap_answers` content into a generation surface — it returns it to the operator's reasoning context, which is the same access pattern as current `get_record('M-NNNN')` and is canon-safe by design (the firewall protects against asserting the answers in artifacts; reading the answers to know what to firewall is the intended mechanism).
6. Schema extension: `get_firewall_content(world_slug, m_ids?)` is a new tool. Existing tools are unchanged. No schema is broken.

## Architecture Check

1. A focused tool is cleaner than a context-packet `node_classes=['mystery_record']` filter (CORRIDOR-003) for this specific use case because the firewall audit needs the `disallowed_cheap_answers` list — a specific FIELD of M records — not the whole M-record body. CORRIDOR-003 returns full M-record bodies (or summaries with `delivery_mode='summary_only'`); CORRIDOR-005 returns only the firewall-relevant fields, in a shape directly consumable by the audit code path. The two are complementary: CORRIDOR-003 helps with discovery ("which M records exist?"); CORRIDOR-005 helps with audit ("what must I firewall against?").
2. No backwards-compatibility aliasing/shims introduced. The tool is net-new.

## Verification Layers

1. `get_firewall_content('animalia')` (no `m_ids` filter) returns all M records' firewall fields → schema validation: response contains every M-NNNN id from `worlds/animalia/_source/mystery-reserve/` keyed to `{disallowed_cheap_answers, common_in_world_interpretations}`.
2. `get_firewall_content('animalia', m_ids=['M-1', 'M-7'])` returns only the requested ids → schema validation: response keys are exactly `['M-1', 'M-7']`.
3. Non-existent M-id in filter → error path: response includes a `not_found` array listing the missing ids while still returning data for the existing ids.
4. Rule 7 enforcement is unweakened by the tool's existence → manual review: confirm the tool is read-only, returns existing M-record content (no synthesis), and is callable from any skill phase that the existing `get_record('M-NNNN')` is callable from.

## What to Change

### 1. Add `get_firewall_content` MCP tool

Schema:

```typescript
get_firewall_content(args: {
  world_slug: string,
  m_ids?: string[]  // optional; defaults to all M records in the world
}): Promise<{
  records: Record<string, {
    disallowed_cheap_answers: string[],
    common_in_world_interpretations: string[],
    what_is_unknown: string,  // brief one-sentence summary of the mystery's surface
  }>,
  not_found: string[]  // m_ids that didn't resolve, if any
}>
```

The response is keyed by M-id. Each value contains the three firewall-relevant fields. The `what_is_unknown` summary is the M record's `what_is_unknown` field truncated to one sentence (≤200 chars) — sufficient for the operator to know which mystery the firewall list is protecting without retrieving the full M-record body.

### 2. Register the tool in `tools/world-mcp/src/server.ts` and `tool-names.ts`

Following the established pattern for new tools.

### 3. Update `docs/CONTEXT-PACKET-CONTRACT.md`

Add a §Focused Retrieval Tools subsection (or equivalent) listing `get_firewall_content` alongside `get_record_field` as use-case-specific complements to the general packet retrieval. Document when to use each.

### 4. Skill prose updates (cross-references)

Skills with Phase 7b Mystery Reserve firewall procedures get a one-line cross-reference noting that `get_firewall_content` is the canonical bulk-retrieval path for the firewall audit, with `get_record('M-NNNN')` as the per-record alternative when full M-record context is needed (e.g., for `notes` or `modification_history`). Affected skills:
- `.claude/skills/diegetic-artifact-generation/references/phase-7-canon-safety-check.md` §Phase 7b
- `.claude/skills/canon-addition/` (relevant phase reference file; path determined at implementation time)
- `.claude/skills/canon-facts-from-diegetic-artifacts/` (laundering firewall section; path determined at implementation time)
- `.claude/skills/character-generation/` (Phase 7b equivalent; path determined at implementation time)

## Files to Touch

- `tools/world-mcp/src/tools/get-firewall-content.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — add `get_firewall_content`)
- `tools/world-mcp/src/server.ts` (modify — register the tool)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — add §Focused Retrieval Tools subsection)
- `.claude/skills/diegetic-artifact-generation/references/phase-7-canon-safety-check.md` (modify — Phase 7b cross-reference)
- `.claude/skills/canon-addition/references/` (modify — Phase 7b equivalent)
- `.claude/skills/canon-facts-from-diegetic-artifacts/references/` (modify — laundering firewall procedure)
- `.claude/skills/character-generation/references/` (modify — Phase 7b equivalent)
- `tools/world-mcp/tests/get-firewall-content.test.ts` (new)

## Out of Scope

- Other focused-retrieval tools (e.g., `get_distribution_blocks` for Phase 7c) — separate ticket if needed.
- Auto-firewall validation (i.e., a tool that takes the artifact's claim_map and reports overlaps with disallowed_cheap_answers) — semantic analysis is out of scope for the corridor; the firewall audit remains the skill's responsibility.
- Modification of the M-record schema — read-only over existing fields.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test -- --grep "get-firewall-content"` — assert response shape and content for full-world and filtered queries against `worlds/animalia/`.
2. `cd tools/world-mcp && npm test -- --grep "get-firewall-content-not-found"` — non-existent M-id appears in `not_found` array; existing ids still return their content.
3. Full pipeline: invoke `diegetic-artifact-generation` skill against `worlds/animalia/` with the existing brief; the skill's Phase 7b can call `get_firewall_content('animalia')` once and use the result for the full firewall audit, recorded in the artifact's Canon Safety Check Trace.

### Invariants

1. The tool returns existing M-record content unchanged — no synthesis, no derivation.
2. Rule 7 (Preserve Mystery Deliberately) firewall surface is preserved: the tool's role is to expose the firewall content TO the operator's audit, not to allow leakage to artifact surfaces. Skills calling the tool for audit purposes do not become exempt from the firewall.
3. Performance: a single call returns ≤ N × 1KB for N M records (Animalia: 20 M records → ~20KB response), well within MCP transport budgets.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/get-firewall-content.test.ts` — full-world and filtered-id tests against the Animalia fixture.
2. `tools/world-mcp/tests/get-firewall-content-empty-world.test.ts` — degenerate case: world with no M records returns empty `records` map.

### Commands

1. `cd tools/world-mcp && npm test -- --grep "get-firewall-content"` — targeted test suite.
2. `cd tools/world-mcp && npm test` — full world-mcp suite.
