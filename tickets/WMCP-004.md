# WMCP-004: Add task-type-aware full-body delivery to `get_context_packet` for high-value node classes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extend `tools/world-mcp/src/tools/get-context-packet.ts` and the packet shape under `docs/CONTEXT-PACKET-CONTRACT.md`; consumers in canon-addition, character-generation, diegetic-artifact-generation, continuity-audit benefit
**Deps**: None

## Problem

The current `mcp__worldloom__get_context_packet` returns a uniform `body_preview` field (~250 chars) for every node it identifies, regardless of node class or how load-bearing the node is for the calling task type. For `task_type: canon_addition`, the operator typically needs FULL bodies of the world's invariants, the genesis CF (CF-0001), and Mystery Reserve entries to perform Phase 2 invariant check, Phase 6b multi-critic synthesis, and Phase 8 contradiction classification — those bodies don't fit in 250 chars.

During the canon-addition session that produced PA-0001 for `worlds/erotica-world`, the initial context packet (token_budget=12000, allocated=7769) returned previews for ~30 nodes; to perform invariant check I had to follow up with `get_record` calls for CF-0001, all 10 invariants, all 3 MR entries, all 7 OQs, the 7 SEC records (peoples-and-species, everyday-life, institutions, magic-or-tech-systems, geography, economy-and-resources, timeline), and one ENT record — a tail of ~28 sequential MCP calls after the initial packet. Each call was small and fast individually; the round-trip count is the friction.

The packet's `body_preview` truncation is correct DEFAULT behavior — full bodies for arbitrary impact-surface neighbors would blow the token budget on packets returning many nodes. But for high-value node classes the current task type DEPENDS on (the invariants and CFs that Rule 4/Rule 5/Rule 7 validation tests against), full bodies would amortize the budget productively and eliminate the follow-up tail.

## Assumption Reassessment (2026-05-01)

1. The current packet shape (`docs/CONTEXT-PACKET-CONTRACT.md` §Packet Shape and the implementation under `tools/world-mcp/src/tools/get-context-packet.ts` plus `tools/world-mcp/src/context-packet/`) returns nodes with a `body_preview` field uniformly truncated regardless of task type or node class. The packet header carries `token_budget.requested` and `token_budget.allocated`; the layered structure (`local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces`) is task-type-aware but the per-node body delivery is not.
2. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern... with completeness guarantees"). The current "+ targeted-retrieval pattern" hedge places the round-trip burden on the skill operator; full-body delivery for high-value classes shifts more of the completeness guarantee into the packet itself, while preserving targeted retrieval for genuinely-broad surfaces (impact-surface SECs, named-entity neighbors).
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes this output shape — `canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `propose-new-canon-facts`, `propose-new-characters`, `canon-facts-from-diegetic-artifacts`, `emergent-pressure-events`. Each skill's `task_type` value identifies its load-bearing node classes; the change is task-type-aware and additive.
6. Schema extension shape: additive — adds optional `full_body` field on selected nodes without removing `body_preview`. Backwards-compatible for callers that only read previews. The packet header gains a `full_body_classes_delivered: string[]` audit field naming which classes were promoted to full bodies for this task type.
7. Adjacent contradictions: none. WMCP-001/002/003 cover separate retrieval-tool gaps.

## Architecture Check

1. Task-type-aware full-body delivery is cleaner than a generic "include_full_body=true" packet flag because it preserves the layered budget allocation (`local_authority` and `governing_world_context` get full bodies; `impact_surfaces` stay preview-only). A flat flag would either blow the budget on broad surfaces or require the operator to re-tune budget per call.
2. The default-by-task-type approach means existing skill prose ("call `get_context_packet` per pre-flight") doesn't change; the operator gets denser packets without changing call sites.
3. No backwards-compatibility aliasing/shims introduced. `body_preview` remains the universal field; `full_body` is an additive optional field.

## Verification Layers

1. Packet now delivers full bodies for high-value classes per task type -> manual MCP call dry-run: `get_context_packet(task_type='canon_addition', seed_nodes=['CF-0001'], world_slug='animalia', token_budget=12000)` returns full bodies for invariants and CFs in `governing_world_context.nodes` and `local_authority.nodes`.
2. Token budget is respected -> packet `token_header.allocated` ≤ `requested`; if budget is too tight to fit promoted full bodies, the packet downgrades selectively (per `truncation_summary.dropped_layers`) rather than refusing.
3. Existing previews still work for non-high-value classes -> SEC records under `impact_surfaces` continue to return `body_preview` only, not full body.
4. FOUNDATIONS alignment -> manual review: §Tooling Recommendation's "completeness guarantees" framing now applies more squarely to the packet itself, with the "+ targeted-retrieval pattern" residual covering only impact-surface neighbors.

## What to Change

### 1. Define per-task-type high-value node-class table

Add a configuration in `tools/world-mcp/src/context-packet/` mapping each `task_type` to the node classes whose full bodies should be delivered. Initial proposal:

| task_type | High-value node classes (full body delivered) |
|---|---|
| `canon_addition` | `canon_fact_record`, `invariant_record`, `mystery_reserve_entry`, `open_question_record` |
| `character_generation` | `canon_fact_record`, `invariant_record`, `mystery_reserve_entry`, `section_record` (PEOPLES_AND_SPECIES + EVERYDAY_LIFE) |
| `diegetic_artifact_generation` | `canon_fact_record`, `invariant_record`, `section_record` (TIMELINE + INSTITUTIONS), `mystery_reserve_entry` |
| `continuity_audit` | varies — defer to whole-class enumeration via `list_records` per FOUNDATIONS §Tooling Recommendation "Whole-class enumeration is a legitimate primary loading pattern" |
| `propose_new_canon_facts` | `canon_fact_record`, `invariant_record`, `mystery_reserve_entry`, `open_question_record` |
| `canon_facts_from_diegetic_artifacts` | `canon_fact_record`, `invariant_record`, `mystery_reserve_entry`, `diegetic_artifact_record` (the source artifact) |
| `propose_new_characters` | `canon_fact_record`, `invariant_record`, `section_record` (PEOPLES_AND_SPECIES) |
| `propose_new_worlds_from_preferences` | none (no in-world seed; whole-batch operates on preference doc) |

### 2. Extend node-shape to include optional `full_body`

Update the per-node return type to add `full_body?: string` alongside the existing `body_preview`. When the node's class is in the task-type's high-value list AND budget permits, populate `full_body`; otherwise leave undefined.

### 3. Budget-allocation policy

When promoting nodes to full-body, allocate budget in this order:

1. `local_authority` nodes whose class is in the high-value list (always priority — these are the seed-local nodes the task operates on).
2. `governing_world_context` nodes whose class is in the high-value list (invariants, MR records — Rule 2/4/7 validation depends on these).
3. `exact_record_links` nodes whose class is in the high-value list.
4. `scoped_local_context` and `impact_surfaces` — keep `body_preview` only (full bodies on broad surfaces would blow the budget; targeted `get_record` follow-ups remain the right pattern here).

If a high-value node's full body would exceed the remaining budget, downgrade to `body_preview` and record the downgrade in `truncation_summary.dropped_layers` with a `reason: high_value_full_body_budget_exceeded` annotation.

### 4. Header audit field

Add `task_header.full_body_classes_delivered: string[]` listing the node classes for which full bodies were actually delivered (after budget allocation). This lets skill operators verify which nodes need follow-up `get_record` calls vs which are already complete.

### 5. Update `docs/CONTEXT-PACKET-CONTRACT.md` to reflect the new shape

Document the per-task-type table, the optional `full_body` field, the budget-allocation policy, and the `full_body_classes_delivered` audit field.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify)
- `tools/world-mcp/src/context-packet/` (modify — new high-value-class config + full-body delivery logic + budget allocator)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — document the new shape)
- `tools/world-mcp/src/server.ts` (no change expected — input schema is the same)

## Out of Scope

- Removing `body_preview` (it stays as the universal short-form field).
- Changing the layered packet structure (`local_authority` / `exact_record_links` / etc. — same as today).
- Whole-class enumeration via `list_records` (FOUNDATIONS already names this as a parallel primary loading pattern; no change here).

## Acceptance Criteria

### Tests That Must Pass

1. Calling `get_context_packet(task_type='canon_addition', seed_nodes=['CF-0001'], world_slug='animalia')` returns nodes whose `full_body` is populated for `canon_fact_record`, `invariant_record`, `mystery_reserve_entry`, and `open_question_record` classes.
2. Calling the same with a tight `token_budget` (e.g., 2000) downgrades selectively per the budget-allocation policy and records the downgrades in `truncation_summary`.
3. Calling with `task_type='other'` (no high-value list) returns `body_preview` only on every node, matching pre-ticket behavior.
4. The `task_header.full_body_classes_delivered` field accurately enumerates the classes for which full bodies were delivered.

### Invariants

1. `body_preview` is always populated; `full_body` is sometimes populated; both are sourced from the same canonical record content (no drift).
2. The packet token budget is respected — promoted full bodies count against `token_header.allocated`.
3. Backwards-compatible: callers reading only `body_preview` continue to work unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/test/get-context-packet.test.ts` (modify) — extend with cases for each task type's high-value class list; assert full-body delivery and budget-allocation policy.
2. `tools/world-mcp/test/get-context-packet.budget.test.ts` (new) — exercise tight-budget downgrade behavior and the `truncation_summary` annotation.

### Commands

1. `pnpm --filter @worldloom/world-mcp test`.
2. Dry-run MCP call from a real canon-addition pre-flight: `mcp__worldloom__get_context_packet({task_type: 'canon_addition', world_slug: 'animalia', seed_nodes: ['CF-0001'], token_budget: 12000})` — verify invariant and MR full bodies present, SEC bodies still preview-only.
3. Manual review of `docs/CONTEXT-PACKET-CONTRACT.md` — verify the documented shape matches the implementation.
