# WMCP-004: Add task-type-aware full-body delivery to `get_context_packet` for high-value node classes

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extend `tools/world-mcp/src/context-packet/` packet assembly and the packet shape under `docs/CONTEXT-PACKET-CONTRACT.md`; consumers in canon-addition, character-generation, diegetic-artifact-generation, and proposal-generation benefit
**Deps**: None

## Problem

At intake, `mcp__worldloom__get_context_packet` returned preview/summary-oriented node bodies without a generic task-aware `full_body` field, regardless of node class or how load-bearing the node is for the calling task type. For `task_type: canon_addition`, the operator typically needs FULL bodies of the world's invariants, the genesis CF (CF-0001), Mystery Reserve entries, and Open Questions to perform Phase 2 invariant check, Phase 6b multi-critic synthesis, and Phase 8 contradiction classification — those bodies don't fit in the preview field.

During the canon-addition session that produced PA-0001 for `worlds/erotica-world`, the initial context packet (token_budget=12000, allocated=7769) returned previews for ~30 nodes; to perform invariant check I had to follow up with `get_record` calls for CF-0001, all 10 invariants, all 3 MR entries, all 7 OQs, the 7 SEC records (peoples-and-species, everyday-life, institutions, magic-or-tech-systems, geography, economy-and-resources, timeline), and one ENT record — a tail of ~28 sequential MCP calls after the initial packet. Each call was small and fast individually; the round-trip count is the friction.

The packet's preview/summary truncation remains correct DEFAULT behavior — full bodies for arbitrary impact-surface neighbors would blow the token budget on packets returning many nodes. But for high-value node classes the current task type DEPENDS on (the invariants and CFs that Rule 4/Rule 5/Rule 7 validation tests against), full bodies amortize the budget productively and eliminate much of the follow-up tail.

## Assumption Reassessment (2026-05-01)

1. The current packet shape (`docs/CONTEXT-PACKET-CONTRACT.md` §Packet Shape and the implementation under `tools/world-mcp/src/tools/get-context-packet.ts` plus `tools/world-mcp/src/context-packet/`) returns default `delivery_mode: 'full'` nodes with truncated `body_preview`, and `delivery_mode: 'summary_only'` nodes without `body_preview`. `character_generation` already has task-specific parsed `record` projections for invariant, Mystery Reserve, seed-relevant CF, and priority SEC records, but there is no generic optional `full_body` string and no `task_header.full_body_classes_delivered` audit field.
2. FOUNDATIONS principle under audit: §Tooling Recommendation ("LLM agents should never operate on prose alone... directly or via the documented context-packet + targeted-retrieval pattern... with completeness guarantees"). The current "+ targeted-retrieval pattern" hedge places the round-trip burden on the skill operator; full-body delivery for high-value classes shifts more of the completeness guarantee into the packet itself, while preserving targeted retrieval for genuinely-broad surfaces (impact-surface SECs, named-entity neighbors).
3. Cross-skill shared boundary: every skill that calls `get_context_packet` consumes this output shape — `canon-addition`, `character-generation`, `diegetic-artifact-generation`, `continuity-audit`, `propose-new-canon-facts`, `propose-new-characters`, `canon-facts-from-diegetic-artifacts`, `propose-new-worlds-from-preferences`, and `emergent-pressure-events`. Each skill's `task_type` value identifies its load-bearing node classes; the change is task-type-aware and additive.
4. Live node-type correction: the index uses `invariant`, `open_question_entry`, and `section`, not the drafted aliases `invariant_record`, `open_question_record`, or `section_record` (`tools/world-index/src/schema/types.ts`). The implementation must use the live `NodeType` values.
5. Existing same-seam behavior to preserve: `character_generation` parsed `record` projections remain intact and are not replaced by `full_body`; the new field is an additive raw-body delivery path alongside `record`, `summary`, and default-mode `body_preview`.
6. Package command correction: this repo has no truthful root `pnpm --filter @worldloom/world-mcp test` workspace lane. The proof root is `tools/world-mcp` with `npm run build`, targeted compiled `node --test dist/tests/...`, then `npm test`.
7. Schema extension shape: additive — adds optional `full_body` field on selected nodes without removing default-mode `body_preview`; `summary_only` keeps omitting `body_preview` while eligible high-value nodes may still carry `full_body`. The packet header gains a `full_body_classes_delivered: string[]` audit field naming live node classes that were actually delivered with full bodies after budget allocation.
8. Adjacent contradictions: `continuity_audit` remains intentionally preview/index oriented in this ticket because broad audit completeness belongs to `list_records(... include_full_body=true)` whole-class enumeration rather than seed-local packet promotion. WMCP-001/002/003 cover separate retrieval-tool gaps.

## Architecture Check

1. Task-type-aware full-body delivery is cleaner than a generic "include_full_body=true" packet flag because it preserves the layered budget allocation (`local_authority` and `governing_world_context` get full bodies; `impact_surfaces` stay preview-only). A flat flag would either blow the budget on broad surfaces or require the operator to re-tune budget per call.
2. The default-by-task-type approach means existing skill prose ("call `get_context_packet` per pre-flight") doesn't change; the operator gets denser packets without changing call sites.
3. No backwards-compatibility aliasing/shims introduced. Default `delivery_mode: 'full'` keeps `body_preview`; `full_body` is an additive optional field.

## Verification Layers

1. Packet now delivers full bodies for high-value classes per task type -> `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` proves `canon_addition` full bodies for `canon_fact_record`, `invariant`, `mystery_reserve_entry`, and `open_question_entry`.
2. Token budget is respected -> `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` proves high-value bodies are downgraded when a full body would exceed the requested budget, with `truncation_summary.full_body_downgrades` carrying `high_value_full_body_budget_exceeded`.
3. Existing previews still work for non-high-value classes -> the same test proves an impact-surface SEC stays preview-only for `canon_addition`, and `other` remains preview-only with no delivered full-body classes.
4. FOUNDATIONS alignment -> manual review of `docs/FOUNDATIONS.md` §Tooling Recommendation plus `docs/CONTEXT-PACKET-CONTRACT.md`; the packet now carries task-aware completeness for selected high-value nodes while targeted retrieval and `list_records(... include_full_body=true)` remain the residual path for broad surfaces.

## What to Change

### 1. Define per-task-type high-value node-class table

Add a configuration in `tools/world-mcp/src/context-packet/` mapping each `task_type` to the node classes whose full bodies should be delivered. Initial proposal:

| task_type | High-value node classes (full body delivered) |
|---|---|
| `canon_addition` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
| `character_generation` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `section` (PEOPLES_AND_SPECIES + EVERYDAY_LIFE) |
| `diegetic_artifact_generation` | `canon_fact_record`, `invariant`, `section` (TIMELINE + INSTITUTIONS), `mystery_reserve_entry` |
| `continuity_audit` | none here — defer broad audit completeness to whole-class enumeration via `list_records` per FOUNDATIONS §Tooling Recommendation "Whole-class enumeration is a legitimate primary loading pattern" |
| `propose_new_canon_facts` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `open_question_entry` |
| `canon_facts_from_diegetic_artifacts` | `canon_fact_record`, `invariant`, `mystery_reserve_entry`, `diegetic_artifact_record` (the source artifact) |
| `propose_new_characters` | `canon_fact_record`, `invariant`, `section` (PEOPLES_AND_SPECIES) |
| `propose_new_worlds_from_preferences` | none (no in-world seed; whole-batch operates on preference doc) |
| `emergent_pressure_events` | none here — use existing governing context plus targeted retrieval / `list_records` as needed |

### 2. Extend node-shape to include optional `full_body`

Update the per-node return type to add `full_body?: string` alongside the existing `body_preview`. When the node's class is in the task-type's high-value list AND budget permits, populate `full_body`; otherwise leave undefined.

### 3. Budget-allocation policy

When promoting nodes to full-body, allocate budget in this order:

1. `local_authority` nodes whose class is in the high-value list (always priority — these are the seed-local nodes the task operates on).
2. `governing_world_context` nodes whose class is in the high-value list (invariants, MR records — Rule 2/4/7 validation depends on these).
3. `exact_record_links` nodes whose class is in the high-value list.
4. `scoped_local_context` and `impact_surfaces` — keep `body_preview` only (full bodies on broad surfaces would blow the budget; targeted `get_record` follow-ups remain the right pattern here).

If a high-value node's full body would exceed the remaining budget, downgrade to preview/summary delivery and record the downgrade in `truncation_summary.full_body_downgrades` with `reason: high_value_full_body_budget_exceeded`.

### 4. Header audit field

Add `task_header.full_body_classes_delivered: string[]` listing the node classes for which full bodies were actually delivered (after budget allocation). This lets skill operators verify which nodes need follow-up `get_record` calls vs which are already complete.

### 5. Update `docs/CONTEXT-PACKET-CONTRACT.md` to reflect the new shape

Document the per-task-type table, the optional `full_body` field, the budget-allocation policy, and the `full_body_classes_delivered` audit field.

## Files to Touch

- `tools/world-mcp/src/context-packet/shared.ts` (modify — node/header/truncation shape + token estimate)
- `tools/world-mcp/src/context-packet/full-body-delivery.ts` (new — task-type class config + full-body budget allocator)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — invoke full-body delivery after preview-layer budget fit)
- `tools/world-mcp/src/context-packet/governing-world-context.ts` (modify — include atomic governing records for full-body-capable task types)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — document the new shape)
- `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md` (modify — same-seam response-shape prose)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (new)
- `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (modify)
- `tools/world-mcp/tests/context-packet/packet-delivery-mode.test.ts` (modify)

## Out of Scope

- Removing default-mode `body_preview` (it stays as the default short-form field).
- Changing the layered packet structure (`local_authority` / `exact_record_links` / etc. — same as today).
- Whole-class enumeration via `list_records` (FOUNDATIONS already names this as a parallel primary loading pattern; no change here).

## Acceptance Criteria

### Tests That Must Pass

1. Calling `get_context_packet(task_type='canon_addition', seed_nodes=['CF-0001'], world_slug='seeded')` returns nodes whose `full_body` is populated for `canon_fact_record`, `invariant`, `mystery_reserve_entry`, and `open_question_entry` classes.
2. Calling the same with a tight `token_budget` (e.g., 2000) downgrades selectively per the budget-allocation policy and records the downgrades in `truncation_summary`.
3. Calling with `task_type='other'` (no high-value list) returns no `full_body` on any node, matching pre-ticket behavior for preview-only tasks.
4. The `task_header.full_body_classes_delivered` field accurately enumerates the classes for which full bodies were delivered.

### Invariants

1. Default `delivery_mode: 'full'` keeps `body_preview` populated; `summary_only` keeps omitting `body_preview`; `full_body` is sometimes populated and is sourced from the same canonical indexed body (no drift).
2. The packet token budget is respected — promoted full bodies count against `task_header.token_budget.allocated`.
3. Backwards-compatible: callers reading only `body_preview` continue to work unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (new) — full-body class delivery, tight-budget downgrade behavior, `other` preview-only behavior.
2. `tools/world-mcp/tests/context-packet/character-generation-completeness.test.ts` (modified) — canon-addition governing context now includes atomic invariant and Mystery Reserve full bodies.
3. `tools/world-mcp/tests/context-packet/packet-delivery-mode.test.ts` (modified) — size-ratio proof now uses a task type without a `full_body` policy so it still isolates delivery-mode behavior.

### Commands

1. From `tools/world-mcp`: `npm run build`.
2. From `tools/world-mcp`: `node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/character-generation-completeness.test.js dist/tests/context-packet/shape-conformance.test.js dist/tests/context-packet/packet-truncation-summary.test.js`.
3. From `tools/world-mcp`: `npm test`.
4. Package-local handler or compiled test proof substitutes for direct `mcp__worldloom__get_context_packet(...)` unless the rebuilt MCP server is exposed in-session; verify invariant and MR full bodies present, SEC bodies still preview-only where the policy says so.
5. Manual review of `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` — verify the documented shape matches the implementation.

## Outcome

Completion date: 2026-05-01.

Implemented task-aware `full_body` delivery for `get_context_packet` without changing the public input schema. The packet now:

1. Adds `task_header.full_body_classes_delivered`.
2. Adds optional per-node `full_body`.
3. Adds optional `truncation_summary.full_body_downgrades` when a high-value full body cannot fit.
4. Delivers eligible full bodies only after the normal preview/summary packet fits, so `full_body` promotion cannot force additional layer drops.
5. Promotes only `local_authority`, `governing_world_context`, and `exact_record_links`; `scoped_local_context` and `impact_surfaces` remain preview/summary-first.

The governing context now includes atomic governing records for the task types that need them (`canon_addition`, `diegetic_artifact_generation`, `propose_new_canon_facts`, `propose_new_characters`, and `canon_facts_from_diegetic_artifacts`) so the full-body policy has real governing nodes to deliver.

## Verification Result

Completed from `tools/world-mcp`:

1. `npm run build` — passed.
2. `node --test dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/character-generation-completeness.test.js dist/tests/context-packet/shape-conformance.test.js dist/tests/context-packet/packet-truncation-summary.test.js` — passed.
3. `node --test dist/tests/context-packet/packet-delivery-mode.test.js dist/tests/context-packet/full-body-delivery.test.js dist/tests/context-packet/character-generation-completeness.test.js` — passed after correcting the delivery-mode test to isolate a no-`full_body` task type.
4. `npm test` — passed.
5. `git diff --check` — passed.
6. Manual review of `docs/CONTEXT-PACKET-CONTRACT.md`, `tools/world-mcp/README.md`, and `docs/MACHINE-FACING-LAYER.md` confirmed the documented response shape matches the implementation.
7. Ignored package artifacts under `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` were classified as pre-existing/expected ignored package state for this proof lane, not tracked ticket output.

## Deviations

1. The drafted root `pnpm --filter @worldloom/world-mcp test` proof was replaced with package-local `npm` proof because this checkout does not expose a truthful root workspace command for `tools/world-mcp`.
2. The drafted direct MCP dry-run was replaced with package-local compiled tests; a direct `mcp__worldloom__get_context_packet(...)` call would require a rebuilt/restarted MCP session, while the package-local tests exercise the landed source and compiled artifacts directly.
3. The drafted node-class aliases were corrected to live `NodeType` values: `invariant`, `open_question_entry`, and `section`.
4. Downgrades are recorded in `truncation_summary.full_body_downgrades` rather than overloading `dropped_layers`, because layer drops and per-node full-body downgrades are distinct packet events.
