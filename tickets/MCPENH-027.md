# MCPENH-027: Add story-bundle context layer to get_context_packet for story-pipeline task_types

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-context-packet.ts` and `tools/world-mcp/src/context-packet/*.ts` to assemble a `story_bundle_context` layer for story-pipeline task_types. Requires `story_slug` parameter when task_type is story-pipeline-scoped.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`, MCPENH-026

## Problem

`get_context_packet`'s `task_type` enum already includes story-pipeline task_types (`storylet_pool_authoring`, `story_bootstrap`, `story_page_cycle`, `branching_story_health_audit`, `story_fact_promotion_to_canon`). But the packet body it assembles for these task_types is identical to the world-canon-task packet body — five layers (local_authority, exact_record_links, scoped_local_context, governing_world_context, impact_surfaces) all scoped to world canon.

During the storylet-pool-authoring session (this conversation), this surfaced concretely:

- `mcp__worldloom__get_context_packet(world_slug='erotica-world', task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)` returned only world-canon governing context (10 INVs, 4 M records, CF-0004 as seed-relevant).
- Story-bundle context (current pool / open OBLs / active THRs / longest-active-branch recent page metadata) had to be assembled separately via direct file reads (~33 reads for the marla-kern-seduction bundle).
- The packet's `task_type='storylet_pool_authoring'` enum membership was load-bearing for surfacing the right world-canon layer (the governing-world-context picked CF-0004 because of the storylet-pool-authoring task-type weights), but it did not unlock any story-bundle context — that was a structural gap in the packet schema.

The five story-pipeline skills' Pre-flight rules ALL describe the same shape: "load world canon via context_packet AND load story-bundle state via direct reads". This ticket converges those two loads into a single packet call, with the story-bundle layer assembled by the MCP server using the index landed in MCPENH-025 and the retrieval surface landed in MCPENH-026.

## Assumption Reassessment (2026-05-03)

1. **Context packet task_type enum already lists story-pipeline tasks** — verified by inspecting the get_context_packet input schema in this session: `task_type` enum contains `storylet_pool_authoring`, `story_bootstrap`, `story_page_cycle`, `branching_story_health_audit`, `story_fact_promotion_to_canon`. The enum membership is committed; the packet body for these tasks is currently incomplete (returns only world-canon layers).
2. **Context-packet assembly is layered** — verified by inspecting `tools/world-mcp/src/context-packet/*.ts`: the assembly is split across five files (local-authority, exact-record-links, scoped-local-context, governing-world-context, impact-surfaces) plus assemble.ts orchestrator and shared.ts helpers. Adding a sixth layer (story_bundle_context) is a clean schema extension.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Tooling Recommendation §"non-negotiable" commits that LLM agents always receive (directly or via the documented context-packet + targeted-retrieval pattern) the current World Kernel + Invariants + relevant CF records + affected domain files + unresolved contradictions list + mystery reserve entries. Per `docs/FOUNDATIONS.md` §Story Bundles, story-pipeline skills additionally need current pool / open OBLs / active THRs / recent branch metadata. The packet-completeness commitment extends to the story-bundle layer for story-pipeline task_types.
4. **Cross-skill shared boundary under audit** — the boundary is the context-packet response envelope schema (`task_header`, `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `impact_surfaces`, `truncation_summary`, `governing_summary`). The new layer (`story_bundle_context`) sits between `governing_world_context` and `impact_surfaces` semantically — it is governing for story-pipeline tasks. Schema extension is additive; existing fields unchanged.
5. **Token-budget arithmetic** — the packet enforces a token budget. Adding a story_bundle_context layer means the budget arithmetic must apportion across six layers (was five). Story-pipeline tasks should default to a higher token budget (24000 vs the current 18000 default) to accommodate story-bundle state without crowding out world-canon governing context — alternative: keep 18000 as default but document that callers can request higher for story-pipeline tasks.
6. **No HARD-GATE semantics change** — read tool; no HARD-GATE.
7. **No Mystery Reserve firewall weakening** — story_bundle_context layer must include the bundle's `mysteries_in_play[]` declarations from STORY_KERNEL.md (which cite the world-canon M records by ID with `status` + `future_resolution_safety` + `domain_overlap`); this preserves the firewall's Phase 4 gate 1 enforcement surface (storylet-pool-authoring's gate 1 reads M records via list_records; the packet's mysteries-in-play layer is a complementary cross-reference, not a replacement).
8. **Adjacent contradictions** — `find_named_entities` (extended in MCPENH-026) returns story_local_matches; the packet's pre-call entity resolution should consult that surface when assembling story-bundle context. This is a coordination requirement, not a contradiction; this ticket cites MCPENH-026 as a hard dep.
9. **Packet-too-large fallback already documented** — `delivery_status='persisted_with_summary'` plus `governing_summary` plus `truncation_summary.dropped_layers` are all existing fallback mechanisms. The new layer participates in the same fallback system: if the story_bundle_context exceeds budget, it can be dropped to summary form (with `governing_summary` extended to include a story-bundle-context-summary sub-block).

## Architecture Check

1. **Story-bundle layer parallel to governing_world_context is cleaner than overloading existing layers** — the packet's existing five layers are world-canon-shaped. Forcing story-bundle records into `local_authority` or `scoped_local_context` would conflate world-level and story-level scope at the layer level, breaking the read-discipline contract. A dedicated `story_bundle_context` layer keeps scope explicit.
2. **Story-pipeline task_types route through the new layer; non-story task_types skip it** — the packet assembler checks `task_type` and only assembles `story_bundle_context` when task_type is story-pipeline-scoped AND `story_slug` is supplied. World-canon task_types (canon_addition, character_generation, etc.) get an empty/null story_bundle_context — additive at the schema level, opt-in at the assembly level.
3. **No backwards-compatibility shims** — existing callers (canon_addition, character_generation, etc.) see an unchanged response envelope. Story-pipeline callers see a new layer they can choose to consume; if they ignore it, the existing world-canon layers are still populated as before.

## Verification Layers

1. `get_context_packet(world_slug, task_type='storylet_pool_authoring', story_slug=<slug>, seed_nodes=[...], token_budget=18000)` returns a non-empty `story_bundle_context` object → schema validation: response shape conforms to the extended packet schema.
2. `get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)` (no story_slug) returns an error naming the missing parameter → input schema validation.
3. `get_context_packet(world_slug, task_type='canon_addition', seed_nodes=[...], token_budget=18000)` returns a response with `story_bundle_context: null` (or absent — implementation choice; the field's nullability is documented) → schema validation: world-canon-task callers are unaffected.
4. `story_bundle_context.storylet_pool_summary` lists every visibility-filtered SLT visible to the bundle's longest-active-branch (matching the storylet-pool-authoring §Mandatory Current Storylet Pool aggregation) → schema validation against the indexed SLT records.
5. `story_bundle_context.open_obligations` lists every OBL in `_source/obligations/` with `status: open` → schema validation.
6. `story_bundle_context.active_threads` lists every THR with `status` ∈ {`active`, `pressured`, `critical`, `dormant`} → schema validation.
7. `story_bundle_context.longest_active_branch_path` is the branch_path array of the longest non-terminal branch in `_source/pages/`, with ties broken by most-recent created_at → schema validation.
8. `story_bundle_context.recent_pages_along_longest_active_branch` is the last ~10 PG records along the longest-active-branch (in branch_path order; most-recent last), with content_intensity / chosen_choice_id / storylet_realized fields surfaced → schema validation.
9. `story_bundle_context.mysteries_in_play` is the bundle's STORY_KERNEL.mysteries_in_play[] declarations (each with M id + status + future_resolution_safety + domain_overlap) → schema validation: parsed from STORY_KERNEL.md frontmatter at packet-assembly time.
10. `story_bundle_context.cast_bind_list` is the STORY_KERNEL.cast_bind_list with each entry's STENT.role_in_story enum value populated → schema validation.
11. Token-budget compliance: when story_bundle_context exceeds available budget, it falls back to `delivery_status='persisted_with_summary'` and `governing_summary.story_bundle_context_summary` carries the trimmed view → schema validation.
12. FOUNDATIONS §Tooling Recommendation alignment: the packet now delivers world-canon AND story-bundle governing context for story-pipeline tasks → FOUNDATIONS alignment check.

## What to Change

### 1. Add `story_slug?: string` parameter to `get_context_packet`

Optional kebab-case `[a-z0-9-]+`. REQUIRED when task_type is story-pipeline-scoped (`storylet_pool_authoring | story_bootstrap | story_page_cycle | branching_story_health_audit | story_fact_promotion_to_canon`). Ignored otherwise.

### 2. Add `story_bundle_context` layer to the response envelope

New layer between `governing_world_context` and `impact_surfaces`. Schema:

```typescript
story_bundle_context: {
  story_slug: string;
  storylet_pool_summary: {
    total: number;
    visibility_filtered_count: number;            // visible to longest-active-branch
    by_shape: Record<SLTShape, number>;
    by_content_intensity: Record<ContentIntensity, number>;
    visible_records: Array<{                      // capped to N (e.g., 50) by token budget; full bodies via get_record
      id: string;
      title: string;
      shape: string;
      content_intensity: string;
      visibility_scope: string;
    }>;
  };
  open_obligations: Array<{
    id: string; type: string; owner: string | null; subjects: string[];
    salience: number; urgency: number; possible_payoff_modes: string[];
    coverage_cache_compatible_storylets: string[];
  }>;
  active_threads: Array<{
    id: string; type: string; status: string; current_pressure: number;
    desired_cadence: number; obligations: string[];
  }>;
  longest_active_branch_path: string[];           // [PG-NNNN, ...]
  recent_pages_along_longest_active_branch: Array<{
    id: string; storylet_realized: string; chosen_choice_id: string | null;
    content_intensity: string; created_at: string;
    summary?: string;                              // first 200 chars of pages-prose/PG-NNNN.md
  }>;
  mysteries_in_play: Array<{
    m_id: string; status: string; future_resolution_safety: string; domain_overlap: string;
  }>;
  cast_bind_list: Array<{
    char_id: string | null; stent_id: string; role_in_story: string;
  }>;
  invariants_acknowledged: string[];              // INV ids declared in STORY_KERNEL
} | null;                                          // null when task_type is world-canon-scoped
```

### 3. Implement assembly in a new file `tools/world-mcp/src/context-packet/story-bundle-context.ts`

Parallel to the existing five layer-files. Reads from the indexed story-bundle records (per MCPENH-025) and the bundle's STORY_KERNEL.md (direct read of the markdown frontmatter — STORY_KERNEL.md is primary-authored, not atomic-YAML; per `docs/FOUNDATIONS.md` §Story Bundles, the parallel to WORLD_KERNEL.md).

### 4. Update `tools/world-mcp/src/context-packet/assemble.ts` to invoke the new layer

Conditional on task_type being story-pipeline-scoped AND story_slug present. Token-budget arithmetic apportions across six layers when story-pipeline-scoped, five layers otherwise.

### 5. Update `tools/world-mcp/src/context-packet/persistence.ts` to handle the new layer

When packet exceeds token budget, persist the full body to `/tmp/worldloom-mcp-tool-results/` (existing behavior); add `story_bundle_context_summary` to the inline `governing_summary` block as the trimmed view.

### 6. Update `describe_capabilities.ts` to enumerate the new layer

Adds the layer's schema and the story-pipeline task_type → story_bundle_context delivery commitment to the discovery surface.

### 7. Documentation

Update `docs/CONTEXT-PACKET-CONTRACT.md` (the documented context-packet contract referenced from FOUNDATIONS §Tooling Recommendation) to describe the six-layer shape for story-pipeline task_types and the new layer's contents. The contract document is the cross-skill reference for what the packet promises; this ticket lands the contract change alongside the implementation.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — story_slug parameter + invocation routing)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — six-layer routing for story-pipeline tasks)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new — layer assembly)
- `tools/world-mcp/src/context-packet/persistence.ts` (modify — story_bundle_context_summary in governing_summary fallback)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — shared types/helpers for the new layer)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify — enumerate new layer)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — six-layer shape for story-pipeline tasks)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (new — layer assembly assertions)
- `tools/world-mcp/tests/get-context-packet.story-pipeline.test.ts` (new — end-to-end packet shape for story-pipeline task_types)

## Out of Scope

- Updating story-pipeline skills' Pre-flight rules to use the new layer (follow-up; can be a separate maintenance ticket once this lands and operators have confirmed the layer's data shape matches the skills' needs).
- Adding a story-bundle-aware variant of `get_persisted_packet_slice` (the existing tool resolves slices by node ID; with story-bundle indexing landed, slice resolution Just Works for story-bundle records — but a future ticket could add story-bundle-specific slice helpers).
- Adding cross-bundle context (a packet covering multiple bundles in the same world simultaneously) — out of scope by design; one bundle per packet preserves the read-discipline contract.

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter world-mcp test` passes; new tests cover the story_bundle_context layer per Verification Layers.
2. `mcp__worldloom__get_context_packet(world_slug='erotica-world', task_type='storylet_pool_authoring', story_slug='marla-kern-seduction', seed_nodes=['entity:marla-kern','entity:iker-aguirre'], token_budget=24000)` returns a packet whose `story_bundle_context.storylet_pool_summary.total` equals 35 (post-SLB-0001 pool size) and whose `story_bundle_context.open_obligations` lists OBL-0001 through OBL-0006.
3. `get_context_packet` with story-pipeline task_type and missing story_slug returns an error.
4. `get_context_packet` with world-canon task_type returns `story_bundle_context: null` (or omits the field per implementation).
5. Token-budget overflow falls back to `delivery_status='persisted_with_summary'` with `governing_summary.story_bundle_context_summary` populated.

### Invariants

1. World-canon-task packets are byte-identical pre- and post-implementation when called with the same inputs (story-bundle-context support is additive; world-canon task callers must see no behavioral change).
2. Story-pipeline-task packets without `story_slug` fail with a clear error rather than silently degrading to the world-canon layers.
3. The new layer's data is sourced from the indexed story-bundle records (MCPENH-025) plus the bundle's STORY_KERNEL.md; no direct walks of `_source/` directories at packet-assembly time.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — fixture story bundle; assert each sub-field of `story_bundle_context` populates correctly.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — fixture with large pool; assert token-budget overflow triggers the persisted_with_summary fallback with story_bundle_context_summary.
3. `tools/world-mcp/tests/get-context-packet.story-pipeline.test.ts` — assert end-to-end packet shape for each story-pipeline task_type.
4. `tools/world-mcp/tests/get-context-packet.world-canon-unaffected.test.ts` — assert world-canon-task packets remain byte-identical to pre-implementation behavior.

### Commands

1. `pnpm --filter world-mcp lint && pnpm --filter world-mcp typecheck && pnpm --filter world-mcp test` (targeted pipeline verification).
2. `cd tools/world-mcp && pnpm build && node dist/cli/server.js` running locally; invoke `mcp__worldloom__get_context_packet` with the marla-kern-seduction bundle as the integration check after `archive/tickets/MCPENH-025.md` and MCPENH-026 land and the index is rebuilt.
