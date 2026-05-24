# SPEC81INDSTOCAN-002: New MCP tool `select_storylet_candidates` + docs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new MCP tool in `tools/world-mcp/`; new registration site in `server.ts`; documentation updates in `tools/world-mcp/README.md` and `docs/MACHINE-FACING-LAYER.md`. No impact on existing MCP tools.
**Deps**: archive/tickets/SPEC81INDSTOCAN-001.md

## Problem

With SPEC81INDSTOCAN-001's projection columns and edges in place, consumers need a read-only MCP tool that runs the symbolic pre-filter pipeline server-side and returns a compact shortlist (≤24 entries by default) plus a filter trace, rather than every consumer re-implementing the pipeline against `list_records(include_full_body=true)`. The new `select_storylet_candidates` tool exposes the indexed retrieval surface as a typed MCP read API. Per SPEC-81 §4.5, the tool NEVER returns full SLT bodies — consumers fetch full bodies via `get_records` on the shortlist, guaranteeing ≤`max_candidates` full-body reads per call even for a 10,000-SLT pool.

## Assumption Reassessment (2026-05-24)

1. `tools/world-mcp/src/tool-names.ts` defines `MCP_TOOL_NAMES` (with 24 existing tools) and `MCP_TOOL_ORDER` (the registration order). `tools/world-mcp/src/server.ts` registers each tool with the MCP server (latent registration site surfaced by SPEC-81 reassessment session's spot-check (g); the spec's §10 file list did not enumerate it, but it is the canonical site for tool discovery — sibling `list_records` has its registration there). `tools/world-mcp/README.md` §Tools enumerates each MCP tool with a per-tool bullet. `docs/MACHINE-FACING-LAYER.md` line 53 has a "Localize specific nodes..." table row that names sibling retrieval tools.
2. SPEC-81 §4.1-§4.5: tool name `mcp__worldloom__select_storylet_candidates`; story-bundle-scoped (`world_slug` + `story_slug` required); input shape including `parent_page_id`, `turn_driver`, `intent_signature`, `max_candidates` (default 24), `include_rejection_summary`; output shape with `filter_trace`, `shortlisted_candidate_ids`, `shortlisted_projection_records`, `requires_full_body_ids` (NEVER full bodies); 11-step filter pipeline; mystery-policy filter per-value mapping (per the reassessment's M2 extension to step 8); source-record-id filter combining static branch-leak prevention with optional `intent_signature.grounding_record_ids` intersection (per the reassessment's M3 extension to step 7); branch-prefix matching as PG-array-prefix (per the reassessment's M4 clarification to step 2).
3. Cross-skill boundary under audit: MCP retrieval surface (`tools/world-mcp/`) ↔ world-index public API (`tools/world-index/`'s post-001 projection columns + new edge types). The new tool reads only the indexed projection surface; it does NOT reach into world-index parser internals (per the `tools/world-mcp` may not reach into `world-index/src/parse/` internals package-boundary rule). Source-record-id filtering should use the existing `storylet_predicate_ref` literal-record edge surface from SPEC-50; SPEC81INDSTOCAN-001 added four new coarse projection edges but did not add a fifth source-record edge.
4. FOUNDATIONS §Tooling Recommendation (the canonical *context-packet + targeted-retrieval pattern* applied to SLT pools that exceed the packet's full-body envelope) + §Story Bundles §6b (Information / Observer Firewall — the new tool operates over fully-derived indexed columns and does NOT introspect hidden state; full predicate evaluation including the firewall remains in the existing turn-cycle Phase 2 evaluator running on the shortlist).
5. HARD-GATE: MCP retrieval surface + Mystery Reserve firewall preservation. The mystery-policy filter (§4.4 step 8) is a coarse pre-filter using projected `mystery_policy.allowed_authority`; full MR firewall enforcement (forbidden-mystery prevention) continues in the existing turn-cycle Phase 2 evaluator on the shortlist. The tool's response payload contains no canon-write authority; it is purely a read.
6. Adds new MCP tool name `mcp__worldloom__select_storylet_candidates` to `MCP_TOOL_NAMES` and `MCP_TOOL_ORDER`; the addition is additive to the existing 24-tool registry.

## Architecture Check

1. The new MCP tool sits between world-index's indexed projection surface and the consumer skills, exposing the symbolic pre-filter pipeline as a typed RPC. This is cleaner than embedding the pipeline in each consumer because: (a) the pipeline lives in one canonical location with one verification surface; (b) the projection-driven pre-filter runs server-side in one SQL transaction; (c) consumers' full-body read count is structurally bounded by `max_candidates`, eliminating the linear-scan failure mode. Alternative: expose individual `find_*` retrieval tools (one per filter dimension) and require consumers to compose them — rejected because composability does not bound the consumer's full-body read count; a naive composition could still issue thousands of `get_records` calls.
2. No backwards-compatibility aliasing/shims introduced. The existing `list_records(record_type='storylet_record', include_full_body=true)` path remains untouched and continues to work (per SPEC §9.6 backward compatibility test). Consumers opt into the new path explicitly in SPEC81INDSTOCAN-003/004/005.

## Verification Layers

1. New tool registered in `MCP_TOOL_NAMES`, `MCP_TOOL_ORDER`, and `server.ts` → codebase grep-proof (`grep -n select_storylet_candidates tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` returns ≥3 hits).
2. Tool's 11-step filter pipeline produces exact filter-trace counts on hand-crafted fixtures → schema validation + unit tests covering §9.3 (filter-trace counts match hand-counted values for a 100-SLT bundle).
3. Tool's response shape never contains full SLT bodies → codebase grep-proof (`grep -n 'body\|full_body\|record.body' tools/world-mcp/src/tools/select-storylet-candidates.ts` shows no production code path emits a body field; only `requires_full_body_ids[]` for consumer-side retrieval).
4. Observer firewall preservation → FOUNDATIONS alignment check (§Story Bundles §6b — confirm the tool's documentation explicitly states the firewall is preserved at the shortlist evaluator and that the pre-filter operates over derived columns).
5. Docs surfaces updated → codebase grep-proof (`grep -n select_storylet_candidates tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` returns ≥2 hits).

## What to Change

### 1. New implementation file: `tools/world-mcp/src/tools/select-storylet-candidates.ts`

Implement the tool per SPEC-81 §4. The module exports a single tool handler conforming to the existing MCP tool conventions (see sibling `tools/world-mcp/src/tools/list-records.ts` for the pattern). The handler:

- Accepts input shape from §4.2: `world_slug`, `story_slug`, `parent_page_id`, `turn_driver` (kind / initiator / driver_records), `intent_signature` (action_families / grounding_record_classes / grounding_record_ids), `max_candidates` (default 24), `include_rejection_summary` (default true).
- Runs the 11-step pipeline from §4.4 against the world-index projection columns and edges (post-001). Pipeline includes: story-scope SQL `WHERE`; branch-visibility filter using PG-array-prefix semantics for `branch_prefix_scoped`; driver-kind filter via `storylet_compatible_driver` edges; action-family filter via `storylet_action_family` edges; predicate-shape filter via `storylet_predicate_pred` edges (the cheap structural check that a `pred` value could succeed against active records of some class); predicate-class filter via `storylet_predicate_class` edges; source-record-id filter via existing `storylet_predicate_ref` literal-record edges, combining static branch-leak prevention AND optional `intent_signature.grounding_record_ids` intersection; mystery-policy filter using the four-value `allowed_authority` enum per §4.4 step 8's per-value semantics; cooldown filter against recent-use history; salience + diversity ranking; emit shortlist + projection records + filter trace.
- Returns output shape from §4.3: `candidate_projection_hash`, `filter_trace`, `shortlisted_candidate_ids[]`, `shortlisted_projection_records[]` (compact projection rows; NEVER full bodies), `requires_full_body_ids[]`.

### 2. Register the tool in `tool-names.ts`

In `tools/world-mcp/src/tool-names.ts`, append to `MCP_TOOL_NAMES` (after `describe_envelope_schema`):

```
select_storylet_candidates: "mcp__worldloom__select_storylet_candidates",
```

Append the same key to `MCP_TOOL_ORDER` at the end of the array.

### 3. Register the tool with the MCP server in `server.ts`

In `tools/world-mcp/src/server.ts`, follow the existing per-tool registration pattern (sibling `list_records` registration is the canonical reference). The tool's input schema follows the §4.2 shape; the output schema follows §4.3.

### 4. Update `tools/world-mcp/README.md` §Tools

In `tools/world-mcp/README.md` (currently lists 24 tools under `## Tools`), add a new bullet near `list_records`:

```
- `mcp__worldloom__select_storylet_candidates(world_slug, story_slug, parent_page_id, turn_driver, intent_signature?, max_candidates?, include_rejection_summary?)` — returns a symbolic-prefilter shortlist (≤`max_candidates`, default 24) of storylet candidates for a story-bundle's turn-cycle or commitment-block-authoring pipeline, plus a `filter_trace` recording per-stage counts. NEVER returns full SLT bodies; consumers fetch full bodies via `get_records(record_ids=requires_full_body_ids, story_slug=...)`. Pre-filter operates over indexed projection columns + new edges (per SPEC-81); full predicate evaluation with alias substitution remains in the consumer-side turn-cycle Phase 2 evaluator running on the shortlist.
```

### 5. Update `docs/MACHINE-FACING-LAYER.md`

In `docs/MACHINE-FACING-LAYER.md` line 53 (the "Localize specific nodes..." table row), append `select_storylet_candidates` to the comma-separated tool list at the end of that row's right column (the row enumerates `search_nodes`, `get_node`, `get_record`, `get_records`, `get_records_field`, `get_story_state_provenance`, `get_persisted_packet_slice`, `list_records`, `get_record_field`, `get_neighbors`, `find_named_entities` — append `select_storylet_candidates`).

### 6. New tests: `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts`

Cover unit-level behaviors:
- Input-shape validation (rejects missing `world_slug` / `story_slug` / `parent_page_id` / `turn_driver`; rejects `max_candidates` < 1).
- Each pipeline step's count semantics (compose hand-crafted bundles where each filter stage has a known reject count; assert `filter_trace.after_<stage>` values).
- Mystery-policy filter per-value mapping (assert `none` SLT passes regardless of `unresolved_mystery_claims`; assert `apparent` / `branch_local_counterfactual` / `canon_candidate` SLT requires matching active claim).
- Source-record-id filter intersection with `intent_signature.grounding_record_ids` when supplied; static branch-leak check when omitted.
- No full SLT body in the response (assert response shape has only projection records).

Integration-level §9.3 filter-trace count test on a 100-SLT bundle moves to the capstone (006).

## Files to Touch

- `tools/world-mcp/src/tools/select-storylet-candidates.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (new)

## Out of Scope

- Consumer wiring in `branching-story-turn-cycle` / `commitment-block-authoring` / `story_bundle_context` — landed in SPEC81INDSTOCAN-003/004/005.
- Server-side predicate evaluation (full alias-binding + comparator evaluation) — per SPEC-81 §7 Out of Scope, this remains in the consumer-side turn-cycle Phase 2 evaluator.
- Embedding-similarity surface — per SPEC-81 §7 Out of Scope.
- Capstone integration tests (§9.2-§9.7) — landed in SPEC81INDSTOCAN-006.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all existing tests pass; new `select-storylet-candidates.test.ts` passes.
2. `grep -n select_storylet_candidates tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` returns ≥2 hits (one in tool-names, one in server registration).
3. `grep -n select_storylet_candidates tools/world-mcp/README.md docs/MACHINE-FACING-LAYER.md` returns ≥2 hits (one per docs surface).
4. `describe_capabilities()` invoked on the running server lists `mcp__worldloom__select_storylet_candidates` in the returned tool registry.

### Invariants

1. The tool NEVER returns full SLT bodies in `shortlisted_projection_records[]` — only projection rows. The `requires_full_body_ids[]` array is the consumer's contract for full-body retrieval, not a server-side optimization.
2. The 11-step pipeline runs in declared order (story scope → branch visibility → driver kind → action family → predicate shape → predicate class → source record id → mystery policy → cooldown → salience+diversity → emit). Reordering invalidates the filter-trace counts and breaks SPEC §9.3.
3. The tool reads only world-index projection columns and edge types defined by SPEC81INDSTOCAN-001; it does NOT reach into world-index parser internals (`tools/world-index/src/parse/`).
4. Full predicate evaluation (alias-binding substitution, comparator evaluation, Observer Firewall enforcement) remains in the consumer-side turn-cycle Phase 2 evaluator running on the shortlist; the server-side pipeline is symbolic only.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/select-storylet-candidates.test.ts` (new) — covers input-shape validation, per-stage filter-trace counts on hand-crafted small bundles, mystery-policy per-value semantics, source-record-id filter combination, response-shape invariants (no full bodies).

### Commands

1. `cd tools/world-mcp && npm test` — runs all world-mcp tests including the new tool's unit tests.
2. `cd tools/world-mcp && npm run build` — confirms TypeScript compiles cleanly with the new tool registration.
