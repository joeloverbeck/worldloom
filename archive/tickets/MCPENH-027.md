# MCPENH-027: Add story-bundle context layer to get_context_packet for story-pipeline task_types

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/get-context-packet.ts`, `tools/world-mcp/src/server.ts`, and `tools/world-mcp/src/context-packet/*.ts` to assemble a `story_bundle_context` layer for story-pipeline task_types. Requires `story_slug` parameter when task_type is story-pipeline-scoped.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`, `archive/tickets/MCPENH-026.md`

## Problem

At intake, `get_context_packet`'s `task_type` enum already included story-pipeline task_types (`storylet_pool_authoring`, `story_bootstrap`, `story_page_cycle`, `branching_story_health_audit`, `story_fact_promotion_to_canon`). But the packet body it assembled for these task_types was identical to the world-canon-task packet body — five layers (local_authority, exact_record_links, scoped_local_context, governing_world_context, impact_surfaces) all scoped to world canon.

During the storylet-pool-authoring session (this conversation), this surfaced concretely:

- `mcp__worldloom__get_context_packet(world_slug='erotica-world', task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)` returned only world-canon governing context (10 INVs, 4 M records, CF-0004 as seed-relevant).
- Story-bundle context (current pool / open OBLs / active THRs / longest-active-branch recent page metadata) had to be assembled separately via direct file reads (~33 reads for the marla-kern-seduction bundle).
- The packet's `task_type='storylet_pool_authoring'` enum membership was load-bearing for surfacing the right world-canon layer (the governing-world-context picked CF-0004 because of the storylet-pool-authoring task-type weights), but it did not unlock any story-bundle context — that was a structural gap in the packet schema.

The five story-pipeline skills' Pre-flight rules ALL describe the same shape: "load world canon via context_packet AND load story-bundle state via direct reads". This ticket converges those two loads into a single packet call, with the story-bundle layer assembled by the MCP server using the index landed in MCPENH-025 and the retrieval surface landed in `archive/tickets/MCPENH-026.md`.

## Assumption Reassessment (2026-05-03)

1. **Context packet task_type enum already lists story-pipeline tasks** — verified against `tools/world-mcp/src/ranking/profiles/index.ts` and the `get_context_packet` input schema in `tools/world-mcp/src/server.ts`: `task_type` enum contains `storylet_pool_authoring`, `story_bootstrap`, `story_page_cycle`, `branching_story_health_audit`, `story_fact_promotion_to_canon`. The enum membership was already committed; the packet body for these tasks was incomplete at intake because it returned only world-canon layers.
2. **Context-packet assembly is layered** — verified by inspecting `tools/world-mcp/src/context-packet/*.ts`: the assembly is split across five files (local-authority, exact-record-links, scoped-local-context, governing-world-context, impact-surfaces) plus assemble.ts orchestrator and shared.ts helpers. Adding a sixth layer (story_bundle_context) is a clean schema extension.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Tooling Recommendation §"non-negotiable" commits that LLM agents always receive (directly or via the documented context-packet + targeted-retrieval pattern) the current World Kernel + Invariants + relevant CF records + affected domain files + unresolved contradictions list + mystery reserve entries. Per `docs/FOUNDATIONS.md` §Story Bundles, story-pipeline skills additionally need current pool / open OBLs / active THRs / recent branch metadata. The packet-completeness commitment extends to the story-bundle layer for story-pipeline task_types.
4. **Cross-skill shared boundary under audit** — the boundary is the context-packet response envelope schema (`task_header`, `local_authority`, `exact_record_links`, `scoped_local_context`, `governing_world_context`, `story_bundle_context`, `impact_surfaces`, `truncation_summary`, `governing_summary`). The new layer sits between `governing_world_context` and `impact_surfaces` semantically — it is governing for story-pipeline tasks. Schema extension is additive; existing fields are otherwise unchanged.
5. **Token-budget and default-budget correction** — the live package enforces both token budget and serialized harness ceiling in `tools/world-mcp/src/context-packet/assemble.ts`. This ticket adds `story_bundle_context` to packet sizing and the persisted summary path. It does not change the live default story-pipeline budgets in `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE`; callers can still supply a higher explicit budget such as 24000 when a mature bundle needs it.
6. **No HARD-GATE semantics change** — read tool; no HARD-GATE.
7. **No Mystery Reserve firewall weakening** — story_bundle_context layer must include the bundle's `mysteries_in_play[]` declarations from STORY_KERNEL.md (which cite the world-canon M records by ID with `status` + `future_resolution_safety` + `domain_overlap`); this preserves the firewall's Phase 4 gate 1 enforcement surface (storylet-pool-authoring's gate 1 reads M records via list_records; the packet's mysteries-in-play layer is a complementary cross-reference, not a replacement).
8. **MCPENH-025 / MCPENH-026 deps are live** — `archive/tickets/MCPENH-025.md` completed story-bundle indexing with `nodes.story_slug` and story-scoped DB node ids, and `archive/tickets/MCPENH-026.md` completed story-bundle retrieval with the live story node-type vocabulary. `story_bundle_context` must read indexed story-bundle rows by `(world_slug, story_slug)` and direct-read only `STORY_KERNEL.md` frontmatter, which is primary-authored rather than an atomic YAML node.
9. **Packet-too-large fallback already documented** — `delivery_status='persisted_with_summary'` plus `governing_summary` plus `truncation_summary.dropped_layers` are all existing fallback mechanisms. The new layer participates in the same serialized-response fallback system: when the full packet exceeds the effective harness ceiling, the full packet is persisted and the inline `governing_summary` carries `story_bundle_context_summary`.
10. **Verification command shape corrected to the live package** — this checkout has no root `package.json` or `pnpm --filter world-mcp` workspace lane. The truthful proof commands are package-local `npm run build` / `npm test` from `tools/world-mcp`, plus compiled `node --test dist/...` tests after build. Direct external `mcp__worldloom__get_context_packet` calls are not exposed in this Codex session, so package-local handler and in-memory MCP dispatch tests are the accepted post-change proof.
11. **Same-seam contract docs were stale at intake** — `docs/CONTEXT-PACKET-CONTRACT.md` still stated that story-pipeline profiles are world-canon-only and story-bundle records remain direct-Read by the skill. This ticket owns truthing that contract document alongside implementation and conformance tests.

## Architecture Check

1. **Story-bundle layer parallel to governing_world_context is cleaner than overloading existing layers** — the packet's existing five layers are world-canon-shaped. Forcing story-bundle records into `local_authority` or `scoped_local_context` would conflate world-level and story-level scope at the layer level, breaking the read-discipline contract. A dedicated `story_bundle_context` layer keeps scope explicit.
2. **Story-pipeline task_types route through the new layer; non-story task_types skip it** — the packet assembler checks `task_type` and only assembles `story_bundle_context` when task_type is story-pipeline-scoped AND `story_slug` is supplied. World-canon task_types (canon_addition, character_generation, etc.) get an empty/null story_bundle_context — additive at the schema level, opt-in at the assembly level.
3. **No backwards-compatibility shims** — existing callers (canon_addition, character_generation, etc.) see an unchanged response envelope. Story-pipeline callers see a new layer they can choose to consume; if they ignore it, the existing world-canon layers are still populated as before.

## Verification Layers

1. `get_context_packet(world_slug, task_type='storylet_pool_authoring', story_slug=<slug>, seed_nodes=[...], token_budget=18000)` returns a non-empty `story_bundle_context` object → schema validation: response shape conforms to the extended packet schema.
2. `get_context_packet(world_slug, task_type='storylet_pool_authoring', seed_nodes=[...], token_budget=18000)` (no story_slug) returns an error naming the missing parameter → input schema validation.
3. `get_context_packet(world_slug, task_type='canon_addition', seed_nodes=[...], token_budget=18000)` returns a response with `story_bundle_context: null` and `task_header.story_slug: null` → schema validation: world-canon-task callers are unaffected except for documented additive nullable fields.
4. `story_bundle_context.storylet_pool_summary` lists every visibility-filtered SLT visible to the bundle's longest-active-branch (matching the storylet-pool-authoring §Mandatory Current Storylet Pool aggregation) → schema validation against the indexed SLT records.
5. `story_bundle_context.open_obligations` lists every OBL in `_source/obligations/` with `status: open` → schema validation.
6. `story_bundle_context.active_threads` lists every THR with `status` ∈ {`active`, `pressured`, `critical`, `dormant`} → schema validation.
7. `story_bundle_context.longest_active_branch_path` is the branch_path array of the longest non-terminal branch in `_source/pages/`, with ties broken by most-recent created_at → schema validation.
8. `story_bundle_context.recent_pages_along_longest_active_branch` is the last ~10 PG records along the longest-active-branch (in branch_path order; most-recent last), with content_intensity / chosen_choice_id / storylet_realized fields surfaced → schema validation.
9. `story_bundle_context.mysteries_in_play` is the bundle's STORY_KERNEL.mysteries_in_play[] declarations (each with M id + status + future_resolution_safety + domain_overlap) → schema validation: parsed from STORY_KERNEL.md frontmatter at packet-assembly time.
10. `story_bundle_context.cast_bind_list` is the STORY_KERNEL.cast_bind_list with each entry's STENT.role_in_story enum value populated → schema validation.
11. Token-budget / harness-ceiling compliance: story_bundle_context participates in packet sizing, and when full inline delivery exceeds the effective harness ceiling, it falls back to `delivery_status='persisted_with_summary'` with `governing_summary.story_bundle_context_summary` populated → schema validation.
12. FOUNDATIONS §Tooling Recommendation alignment: the packet now delivers world-canon AND story-bundle governing context for story-pipeline tasks → FOUNDATIONS alignment check.

## Landed Changes

### 1. Added `story_slug?: string` parameter to `get_context_packet`

Optional kebab-case `[a-z0-9-]+`. REQUIRED when task_type is story-pipeline-scoped (`storylet_pool_authoring | story_bootstrap | story_page_cycle | branching_story_health_audit | story_fact_promotion_to_canon`). Ignored otherwise.

### 2. Added `story_bundle_context` layer to the response envelope

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

### 3. Implemented assembly in a new file `tools/world-mcp/src/context-packet/story-bundle-context.ts`

Parallel to the existing five layer-files. Reads from the indexed story-bundle records (per MCPENH-025) and the bundle's STORY_KERNEL.md (direct read of the markdown frontmatter — STORY_KERNEL.md is primary-authored, not atomic-YAML; per `docs/FOUNDATIONS.md` §Story Bundles, the parallel to WORLD_KERNEL.md).

### 4. Updated `tools/world-mcp/src/context-packet/assemble.ts` to invoke the new layer

Conditional on task_type being story-pipeline-scoped AND story_slug present. Packet sizing now includes `story_bundle_context`; the live default story-pipeline token budgets remain unchanged.

### 5. Updated persisted-summary handling for the new layer

When packet exceeds the effective serialized-response ceiling, the existing persisted packet path stores the full body under `/tmp/worldloom-mcp-tool-results/`; the inline `governing_summary` now includes `story_bundle_context_summary` as the trimmed view. This landed in `assemble.ts` / `shared.ts`; `persistence.ts` did not require a source edit.

### 6. Updated registered capability metadata to enumerate the new layer

The registered `get_context_packet` description in `tools/world-mcp/src/server.ts` now states that story-pipeline task types require `story_slug` and return `story_bundle_context`. `describe_capabilities.ts` did not require a source edit because it reflects registered metadata generically.

### 7. Documentation

Updated `docs/CONTEXT-PACKET-CONTRACT.md` (the documented context-packet contract referenced from FOUNDATIONS §Tooling Recommendation) to describe the story-pipeline packet shape and the new layer's contents. Also truthed `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, and `tools/world-mcp/README.md` where they describe this machine-facing surface.

## Files to Touch

- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — story_slug parameter + invocation routing)
- `tools/world-mcp/src/server.ts` (modify — input schema and registered capability description)
- `tools/world-mcp/src/context-packet/assemble.ts` (modify — story layer routing, sizing, persisted summary)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (new — layer assembly)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — shared types/helpers for the new layer)
- `docs/CONTEXT-PACKET-CONTRACT.md` (modify — packet shape and story-pipeline profile docs)
- `docs/FOUNDATIONS.md` (modify — Tooling Recommendation / Story Bundles references)
- `docs/MACHINE-FACING-LAYER.md` (modify — get_context_packet inventory row)
- `tools/world-mcp/README.md` (modify — get_context_packet usage docs)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (new — layer assembly assertions)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (new — persisted summary / sizing assertions)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (new — end-to-end packet shape for story-pipeline task_types)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — shared story bundle fixture fields)
- `tools/world-mcp/tests/context-packet/budget-handling.test.ts` (modify — budget split contract includes story layer key)
- `tools/world-mcp/tests/context-packet/full-body-delivery.test.ts` (modify — story task fixtures include story_slug)
- `tools/world-mcp/tests/context-packet/packet-class-filter.test.ts` (modify — packet-shape wording)
- `tools/world-mcp/tests/context-packet/packet-delivery-mode.test.ts` (modify — packet-layer wording)
- `tools/world-mcp/tests/tools/get-context-packet.test.ts` (modify — story task fixtures include story_slug)

## Out of Scope

- Updating story-pipeline skills' Pre-flight rules to use the new layer (follow-up; can be a separate maintenance ticket once this lands and operators have confirmed the layer's data shape matches the skills' needs).
- Adding a story-bundle-aware variant of `get_persisted_packet_slice` (the existing tool resolves slices by node ID; with story-bundle indexing landed, slice resolution Just Works for story-bundle records — but a future ticket could add story-bundle-specific slice helpers).
- Adding cross-bundle context (a packet covering multiple bundles in the same world simultaneously) — out of scope by design; one bundle per packet preserves the read-discipline contract.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` and `npm test` pass from `tools/world-mcp`; new tests cover the story_bundle_context layer per Verification Layers.
2. Package-local `getContextPacket({ world_slug: 'seeded', task_type: 'storylet_pool_authoring', story_slug: 'opening-bells', seed_nodes: ['entity:marla-kern'], token_budget: 18000 })` returns a packet whose `story_bundle_context` contains indexed storylets, open obligations, active threads, recent pages, and STORY_KERNEL.md frontmatter declarations.
3. `get_context_packet` with story-pipeline task_type and missing story_slug returns an error.
4. `get_context_packet` with world-canon task_type returns `story_bundle_context: null` (or omits the field per implementation).
5. Serialized-response overflow falls back to `delivery_status='persisted_with_summary'` with `governing_summary.story_bundle_context_summary` populated.

### Invariants

1. World-canon-task behavior remains unchanged except for additive nullable packet fields (`task_header.story_slug: null`, `story_bundle_context: null`) documented in the response envelope.
2. Story-pipeline-task packets without `story_slug` fail with a clear error rather than silently degrading to the world-canon layers.
3. The new layer's data is sourced from the indexed story-bundle records (MCPENH-025) plus the bundle's STORY_KERNEL.md; no direct walks of `_source/` directories at packet-assembly time.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` — fixture story bundle; assert each sub-field of `story_bundle_context` populates correctly.
2. `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` — fixture with large pool; assert serialized-response overflow triggers the persisted_with_summary fallback with story_bundle_context_summary.
3. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` — assert end-to-end packet shape for each story-pipeline task_type.
4. Existing `tools/world-mcp/tests/context-packet/shape-conformance.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and `tools/world-mcp/tests/tools/get-context-packet.test.ts` were updated or re-run to prove the documented envelope, registered schema, default budgets, and story-task change-log coverage remain truthful.

### Commands

1. `npm run build` from `tools/world-mcp`.
2. `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js` from `tools/world-mcp`.
3. `npm test` from `tools/world-mcp`.

## Outcome

Completion date: 2026-05-03.

Completed. `get_context_packet` now requires `story_slug` for story-pipeline task types and returns `story_bundle_context` assembled from indexed story-bundle records plus `STORY_KERNEL.md` frontmatter. World-canon task packets expose the additive nullable fields `task_header.story_slug: null` and `story_bundle_context: null`. Persisted packet summaries include `governing_summary.story_bundle_context_summary` for story-pipeline packets, and registered MCP metadata plus repo/package docs now describe the new contract.

## Verification Result

Passed:

1. `npm run build` from `tools/world-mcp`.
2. `node --test dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/context-packet/shape-conformance.test.js` from `tools/world-mcp`.
3. `node --test dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` from `tools/world-mcp`.
4. `node --test dist/tests/context-packet/full-body-delivery.test.js` from `tools/world-mcp`.
5. `node --test dist/tests/tools/get-context-packet.test.js` from `tools/world-mcp`.
6. `npm test` from `tools/world-mcp` — 316 tests passed.
7. `npm run build && node --test dist/tests/context-packet/packet-class-filter.test.js dist/tests/context-packet/packet-delivery-mode.test.js` from `tools/world-mcp`, after final stale test-description cleanup.
8. Manual closeout review of `docs/CONTEXT-PACKET-CONTRACT.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/README.md`, registered `get_context_packet` metadata in `tools/world-mcp/src/server.ts`, and stale-anchor grep for old five-layer / deferred-MCPENH-027 wording.

## Deviations

The live checkout has no root `package.json` or `pnpm --filter world-mcp` workspace lane, so verification used package-local `npm` commands. Direct external `mcp__worldloom__get_context_packet` calls were not exposed in this Codex session, so package-local handler, compiled context-packet tests, and registered in-memory server dispatch tests are the accepted proof. `persistence.ts` and `describe-capabilities.ts` did not need direct edits because persisted summaries are assembled in `assemble.ts` / `shared.ts`, and `describe_capabilities` reflects the registered `server.ts` metadata generically. The originally drafted byte-identical invariant was corrected to an additive-nullable-field invariant because the documented response envelope now always includes `task_header.story_slug` and `story_bundle_context`.
