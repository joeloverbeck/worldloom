# MCPENH-026: Extend MCP retrieval surface (list_records, get_record, get_neighbors, find_named_entities, search_nodes) to story-bundle record types

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/list-records.ts`, `get-record.ts`, `get-neighbors.ts`, `find-named-entities.ts`, `search-nodes.ts` to accept story-bundle record types and a `story_slug` parameter. No skill changes; story-pipeline skills can adopt the new surface as a follow-up.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`

## Problem

The MCP retrieval tools currently support only world-canon record types:

- `list_records` `record_type` enum: `canon_fact | change_log_entry | invariant_record | mystery_record | open_question_record | named_entity_record | section_record | character_record | diegetic_artifact_record | adjudication_record` — 10 world-level types, no story-bundle types.
- `get_record` accepts any record_id by id-resolution, but only resolves world-canon and hybrid-record IDs (CF / CH / INV / M / OQ / ENT / SEC / CHAR / DA / PA).
- `get_neighbors`, `find_named_entities`, `search_nodes` are similarly scoped to world-canon nodes.

During the storylet-pool-authoring session (this conversation), this surface gap forced ~33 individual file reads at Pre-flight to assemble the story-bundle context (current pool / open OBLs / active THRs / recent page metadata). With story-bundle indexing landed via MCPENH-025, the index has the data — but no MCP tool can query it.

This ticket exposes the indexed story-bundle records through the MCP retrieval surface, completing the round-trip from `world-index build` (writes story-bundle nodes) → MCP query (reads story-bundle nodes).

## Assumption Reassessment (2026-05-03)

1. **MCP retrieval tools are concentrated under `tools/world-mcp/src/tools/`** — verified by listing the directory: 21 tool files (allocate-next-id, describe-capabilities, describe-envelope-schema, find-edit-anchors, find-impacted-fragments, find-named-entities, find-sections-touched-by, get-canonical-vocabulary, get-context-packet, get-firewall-content, get-neighbors, get-node, get-persisted-packet-slice, get-record-field, get-record-schema, get-record, get-records-field, get-records, list-records, search-nodes, submit-patch-plan, validate-patch-plan).
2. **`mcp__worldloom__allocate_next_id` already supports story-bundle ID classes** — verified by inspecting its `id_class` enum: includes `STORY, PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, SLT, SLB, STLOC, STOBJ, BR, CHC, STENT, SAU, SP, RSP` alongside world-canon classes. The retrieval surface is asymmetrically narrower than the allocation surface — this ticket closes the asymmetry.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Tooling Recommendation commits that "LLM agents should never operate on prose alone" and names the context-packet API + targeted retrieval (`get_record`, `get_records`, `get_record_field`, `get_records_field`, `get_persisted_packet_slice`) as the machine-facing mechanism. Per `docs/FOUNDATIONS.md` §Story Bundles, this commitment extends to story-bundle records — but the targeted-retrieval tools currently can't reach them.
4. **Cross-skill shared boundary under audit** — the boundary is the MCP tool envelope schema in `tools/world-mcp/src/tools/_shared.ts` and per-tool input schemas. Each tool's input adds `story_slug?: string` (optional; required when querying a story-bundle record_type or when the requested operation is story-bundle-scoped). The output envelope structure is unchanged.
5. **No CF Record schema extension** — story-bundle records have their own per-class schemas; CF Record schema in FOUNDATIONS unchanged.
6. **No Mystery Reserve firewall weakening** — retrieval is read-only; cannot mutate any record. Mystery Reserve firewall enforcement remains at skill (Phase 4 gates) and validator (VALENH-001) layers.
7. **No HARD-GATE semantics change** — read tools don't carry HARD-GATE semantics; HARD-GATE applies to mutation tools (`submit_patch_plan`) and to skill workflows.
8. **Adjacent contradictions** — `get_record` currently resolves IDs by scanning a per-world record-type-to-directory map. With story-bundle records, the map needs (world_slug, story_slug?, id) → file_path resolution. The `story_slug` is needed because story-bundle IDs (PG-NNNN, SLT-NNNN) reset per bundle — `PG-0001` exists in every bundle. Without story_slug, `get_record(PG-0001)` is ambiguous. This is a required scope item, not a bug.
9. **`describe_capabilities` is the discovery surface** — `tools/world-mcp/src/tools/describe-capabilities.ts` enumerates supported record types and parameters; this ticket updates that surface so callers can discover the new capabilities.

## Architecture Check

1. **Single optional `story_slug` parameter is cleaner than per-tool boolean toggles** — every tool that touches story-bundle data accepts an optional `story_slug` parameter. When present, the query is scoped to that story bundle's records. When absent on a story-bundle-typed query, the tool returns an error (`story_slug required for record_type=storylet_record`); when absent on a world-canon-typed query, behavior is unchanged. This pattern parallels how `allocate_next_id` already handles story-bundle classes.
2. **No backwards-compatibility shims** — existing callers (skills using `list_records(record_type='canon_fact')`, `get_record('CF-0004')`, etc.) continue to work without modification. Story-bundle support is additive.
3. **`get_record` ID-resolution policy** — when `story_slug` is supplied, `get_record(record_id, world_slug, story_slug)` first tries the bundle's record directory, then falls back to world-canon. When `story_slug` is omitted and the record_id matches a story-bundle pattern (PG-NNNN, SE-NNNN, etc.), the tool returns an error naming the missing parameter. This is strict but safe: ambiguity is surfaced rather than silently resolved to a wrong record.

## Verification Layers

1. `list_records(world_slug, record_type='storylet_record', story_slug=<slug>)` returns every SLT in the bundle → schema validation: count matches `worlds/<slug>/stories/<story-slug>/_source/storylets/*.yaml` file count.
2. `list_records` without `story_slug` for a story-bundle record_type returns an error → input schema validation: zod refusal at the tool boundary, not at the SQL layer.
3. `get_record(record_id='SLT-0021', world_slug=<slug>, story_slug=<story-slug>)` returns the parsed YAML body → manual review of returned shape vs. raw file.
4. `get_record(record_id='SLT-0021', world_slug=<slug>)` (no story_slug) returns an error naming the ambiguity → input schema validation.
5. `find_named_entities(world_slug, names=[...], story_slug=<slug>)` surfaces story-local entity mentions alongside world-canon entities → schema validation: the response includes a new `story_local_matches` array (or extends the existing `surface_matches` with a `story_slug` discriminator field).
6. `get_neighbors(record_id='PG-0001', world_slug=<slug>, story_slug=<story-slug>)` returns the parent_page, child_pages, emitted_choices, applied_event_ops, storylet_realized → schema validation against the typed edges captured by MCPENH-025 §item 3.
7. `search_nodes(world_slug, query='loft', story_slug=<slug>)` returns story-bundle FTS matches → schema validation: results include the new story-bundle node types.
8. `describe_capabilities` enumerates the new story-bundle record types and the `story_slug` parameter → manual review of the discovery surface.
9. FOUNDATIONS §Tooling Recommendation alignment — the commitment that "LLM agents should never operate on prose alone" now holds for story-bundle records via the new retrieval surface → FOUNDATIONS alignment check.

## What to Change

### 1. Extend `record_type` enum across retrieval tools

Add the following enum values to `list_records.ts`'s `record_type` parameter (cite the closed enum from MCPENH-025 §Architecture Check item 3):

- `storylet_record` (SLT)
- `obligation_record` (OBL — story-bundle, not world-OBL — there is no world-OBL class; the namespace is unambiguous but the type label disambiguates from any future world-level OBL)
- `thread_record` (THR)
- `fact_record_story` (SF)
- `event_record_story` (SE)
- `consequence_record` (CNSQ)
- `relationship_record_story` (SREL)
- `intention_record` (STINT)
- `story_entity_record` (STENT)
- `story_location_record` (STLOC)
- `story_object_record` (STOBJ)
- `branch_record` (BR)
- `page_record` (PG)
- `choice_record` (CHC)
- `audit_record_story` (SAU)
- `promotion_record` (SP)
- `storylet_batch_manifest` (SLB — markdown manifest, not atomic-YAML; treated as a hybrid-record-like surface)
- `remediation_storylet_proposal_card` (RSP — markdown card; same)

The `_story` suffix on `fact_record_story`, `event_record_story`, `relationship_record_story`, `audit_record_story` disambiguates from any future world-level record class with the same conceptual name (defensive future-proofing).

### 2. Add `story_slug` parameter to retrieval tools

Add an optional `story_slug: string` (kebab-case `[a-z0-9-]+`) parameter to:

- `list_records.ts` (required when `record_type` is a story-bundle type; ignored otherwise).
- `get_record.ts` (required when the record_id matches a story-bundle ID pattern; optional otherwise).
- `get_records.ts` (same logic as `get_record`).
- `get_record_field.ts` / `get_records_field.ts` (same).
- `get_neighbors.ts` (required when the record_id is story-bundle).
- `find_named_entities.ts` (optional; when supplied, the response includes story-local entity matches alongside world-canon).
- `search_nodes.ts` (optional; when supplied, the FTS scope is limited to that bundle).
- `find_impacted_fragments.ts` (required when impact target is a story-bundle CF reference — e.g., a story-bundle SF whose `derived_from_cf` is the impact target).

### 3. Update ID-resolution policy in `get-record.ts`

Story-bundle IDs (PG, SE, SF, OBL, CNSQ, SREL, STINT, STENT, STLOC, STOBJ, BR, CHC, SLT, SLB, SAU, SP, RSP) are bundle-scoped: `PG-0001` exists in every bundle that has at least one rendered page. Resolution policy:

- If `story_slug` is supplied: try the bundle's record directory; if not found, error.
- If `story_slug` is absent AND record_id pattern matches a story-bundle class: return error `story_slug required for record_id=<id>; bundle-scoped IDs are not unique across bundles within a world`.
- If `story_slug` is absent AND record_id pattern matches a world-canon or hybrid class (CF/CH/INV/M/OQ/ENT/SEC/CHAR/DA/PA/STORY): resolve as today (single namespace per world).

### 4. Update `find_named_entities.ts` to surface story-local entity matches

When `story_slug` is supplied, the response includes a new `story_local_matches` array containing matches from story-bundle records (parallel to the existing `canonical_matches`, `scoped_matches`, `surface_matches`, `hints` arrays). Each story-local match carries `story_slug`, `node_id`, `node_type`, `matched_text`, `match_kind`.

### 5. Update `describe_capabilities.ts` to enumerate the new surface

The discovery tool already lists supported record types and parameters; extend its output to include the story-bundle types and the `story_slug` parameter, with a brief note: `"Story-bundle record types require story_slug parameter; bundle-scoped IDs are unique within (world_slug, story_slug)."`

### 6. No changes to `submit_patch_plan` / `validate_patch_plan`

Mutation routing for story-bundle records is out of scope — that's PEENH-001. This ticket is read-only retrieval surface only.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify — extended enum + story_slug parameter)
- `tools/world-mcp/src/tools/get-record.ts` (modify — story-bundle resolution + story_slug parameter)
- `tools/world-mcp/src/tools/get-records.ts` (modify — same)
- `tools/world-mcp/src/tools/get-record-field.ts` (modify — same)
- `tools/world-mcp/src/tools/get-records-field.ts` (modify — same)
- `tools/world-mcp/src/tools/get-neighbors.ts` (modify — same)
- `tools/world-mcp/src/tools/find-named-entities.ts` (modify — story_local_matches array)
- `tools/world-mcp/src/tools/search-nodes.ts` (modify — story_slug FTS scoping)
- `tools/world-mcp/src/tools/find-impacted-fragments.ts` (modify — story-bundle SF impact propagation)
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify — enumerate new surface)
- `tools/world-mcp/src/tools/_shared.ts` (modify — shared `story_slug` validator)
- `tools/world-mcp/src/db/` (modify — query-builder helpers for story-bundle node types and `story_slug` filtering)
- `tools/world-mcp/src/tool-names.ts` (no change expected; tool names unchanged)
- `tools/world-mcp/tests/` (new test files — story-bundle retrieval coverage per Verification Layers)

## Out of Scope

- Story-bundle context layer in `get_context_packet` (covered by MCPENH-027).
- Story-bundle write routing (covered by PEENH-001).
- Story-bundle predicate-DSL parsability validator (covered by VALENH-001).
- Updating the five story-pipeline skills' SKILL.md to use the new retrieval surface (follow-up; can be a separate maintenance ticket once this lands).

## Acceptance Criteria

### Tests That Must Pass

1. `pnpm --filter world-mcp test` passes; new tests cover story-bundle retrieval per Verification Layers.
2. `mcp__worldloom__list_records(world_slug='erotica-world', record_type='storylet_record', story_slug='marla-kern-seduction')` returns 35 records (matching the post-SLB-0001 pool size).
3. `mcp__worldloom__get_record(record_id='SLT-0021', world_slug='erotica-world', story_slug='marla-kern-seduction')` returns the parsed YAML body.
4. `mcp__worldloom__get_record(record_id='SLT-0021', world_slug='erotica-world')` (no story_slug) returns an error naming the missing parameter.
5. `mcp__worldloom__get_neighbors(record_id='PG-0001', world_slug='erotica-world', story_slug='marla-kern-seduction')` returns the storylet_realized SLT, the emitted_choices CHCs, the applied_event_ops SE, and the (null) parent_page.
6. `mcp__worldloom__find_named_entities(world_slug='erotica-world', names=['Marla Kern'], story_slug='marla-kern-seduction')` returns the world-canon canonical_match (entity:marla-kern) AND a story_local_match for STENT-0002.

### Invariants

1. World-canon retrieval (`list_records`, `get_record`, `get_neighbors`, `find_named_entities`, `search_nodes`) without `story_slug` returns identical results pre- and post-implementation — story-bundle support is additive.
2. Story-bundle retrieval requires `story_slug` for type-typed (list_records) or pattern-detected (get_record) story-bundle queries — ambiguity is surfaced as error, not silently resolved.
3. `describe_capabilities` accurately enumerates the new surface; no undocumented capabilities.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/list-records.story-bundle.test.ts` — assert story-bundle list_records returns expected counts for fixture bundle.
2. `tools/world-mcp/tests/get-record.story-bundle.test.ts` — assert resolution policy (story_slug required for bundle-scoped IDs).
3. `tools/world-mcp/tests/get-neighbors.story-bundle.test.ts` — assert typed-edge traversal returns expected neighbors.
4. `tools/world-mcp/tests/find-named-entities.story-local.test.ts` — assert story_local_matches array populated alongside canonical_matches.
5. `tools/world-mcp/tests/search-nodes.story-bundle.test.ts` — assert FTS scoping limits results to the named bundle.

### Commands

1. `pnpm --filter world-mcp lint && pnpm --filter world-mcp typecheck && pnpm --filter world-mcp test` (targeted pipeline verification).
2. `cd tools/world-mcp && pnpm build && node dist/cli/server.js < <(echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"mcp__worldloom__list_records","arguments":{"world_slug":"erotica-world","record_type":"storylet_record","story_slug":"marla-kern-seduction"}},"id":1}')` (full-pipeline integration check after `archive/tickets/MCPENH-025.md` has landed and the index is rebuilt).
