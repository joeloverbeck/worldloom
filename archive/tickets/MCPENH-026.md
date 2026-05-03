# MCPENH-026: Extend MCP retrieval surface (list_records, get_record, get_neighbors, find_named_entities, search_nodes) to story-bundle record types

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends `tools/world-mcp/src/tools/list-records.ts`, `get-record.ts`, `get-records.ts`, `get-record-field.ts`, `get-records-field.ts`, `get-neighbors.ts`, `find-named-entities.ts`, `find-impacted-fragments.ts`, and `search-nodes.ts` to accept story-bundle record types and a `story_slug` parameter. No skill changes; story-pipeline skills can adopt the new surface as a follow-up.
**Deps**: `archive/tickets/FOUNDATIONS-001.md`, `archive/tickets/MCPENH-025.md`

## Problem

At intake, the MCP retrieval tools supported only world-canon record types:

- `list_records` `record_type` enum: `canon_fact | change_log_entry | invariant_record | mystery_record | open_question_record | named_entity_record | section_record | character_record | diegetic_artifact_record | adjudication_record` — 10 world-level types, no story-bundle types.
- `get_record` accepts any record_id by id-resolution, but only resolves world-canon and hybrid-record IDs (CF / CH / INV / M / OQ / ENT / SEC / CHAR / DA / PA).
- `get_neighbors`, `find_named_entities`, `search_nodes` are similarly scoped to world-canon nodes.

During the storylet-pool-authoring session (this conversation), this surface gap forced ~33 individual file reads at Pre-flight to assemble the story-bundle context (current pool / open OBLs / active THRs / recent page metadata). With story-bundle indexing landed via MCPENH-025, the index had the data — but no MCP retrieval tool could query it.

This ticket exposes the indexed story-bundle records through the MCP retrieval surface, completing the round-trip from `world-index build` (writes story-bundle nodes) → MCP query (reads story-bundle nodes).

## Assumption Reassessment (2026-05-03)

1. **MCP retrieval tools are concentrated under `tools/world-mcp/src/tools/`** — verified by listing the directory: 21 tool files (allocate-next-id, describe-capabilities, describe-envelope-schema, find-edit-anchors, find-impacted-fragments, find-named-entities, find-sections-touched-by, get-canonical-vocabulary, get-context-packet, get-firewall-content, get-neighbors, get-node, get-persisted-packet-slice, get-record-field, get-record-schema, get-record, get-records-field, get-records, list-records, search-nodes, submit-patch-plan, validate-patch-plan).
2. **`mcp__worldloom__allocate_next_id` already supports story-bundle ID classes** — verified by inspecting its `id_class` enum: includes `STORY, PG, SE, SF, OBL, CNSQ, THR, SREL, STINT, SLT, SLB, STLOC, STOBJ, BR, CHC, STENT, SAU, SP, RSP` alongside world-canon classes. The retrieval surface is asymmetrically narrower than the allocation surface — this ticket closes the asymmetry.
3. **FOUNDATIONS principle under audit** — FOUNDATIONS §Tooling Recommendation commits that "LLM agents should never operate on prose alone" and names the context-packet API + targeted retrieval (`get_record`, `get_records`, `get_record_field`, `get_records_field`, `get_persisted_packet_slice`) as the machine-facing mechanism. Per `docs/FOUNDATIONS.md` §Story Bundles, this commitment extends to story-bundle records — but the targeted-retrieval tools currently can't reach them.
4. **Cross-skill shared boundary under audit** — the boundary is the MCP tool envelope schema in `tools/world-mcp/src/tools/_shared.ts`, `tools/world-mcp/src/server.ts`, and per-tool input schemas. Each story-capable retrieval tool's input adds `story_slug?: string` (optional; required when querying a story-bundle `record_type` or when the requested operation is story-bundle-scoped). The output envelope structure is unchanged.
5. **No CF Record schema extension** — story-bundle records have their own per-class schemas; CF Record schema in FOUNDATIONS unchanged.
6. **No Mystery Reserve firewall weakening** — retrieval is read-only; cannot mutate any record. Mystery Reserve firewall enforcement remains at skill (Phase 4 gates) and validator (VALENH-001) layers.
7. **No HARD-GATE semantics change** — read tools don't carry HARD-GATE semantics; HARD-GATE applies to mutation tools (`submit_patch_plan`) and to skill workflows.
8. **Adjacent contradictions** — `get_record` currently resolves IDs from `nodes.node_id`, while MCPENH-025 stores story-bundle records with DB node ids of `<story_slug>:<record_id>` and preserves the authored ID in the YAML body. With story-bundle records, the lookup needs `(world_slug, story_slug, record_id)` resolution by composing the story-scoped DB node id. The `story_slug` is needed because story-bundle IDs (PG-NNNN, SLT-NNNN) reset per bundle — `PG-0001` exists in every bundle. Without `story_slug`, `get_record(PG-0001)` is ambiguous. This is a required scope item, not a bug.
9. **`describe_capabilities` is the discovery surface** — `tools/world-mcp/src/tools/describe-capabilities.ts` returns the registered tool metadata assembled in `tools/world-mcp/src/server.ts`; this ticket updates that registered metadata so callers can discover the new capabilities.
10. **Record-type vocabulary corrected to the live producer contract** — `archive/tickets/MCPENH-025.md` and `tools/world-index/src/schema/types.ts` define the story node-type vocabulary as `story_fact_record` and `story_event_record`, not the drafted `fact_record_story` / `event_record_story` names. This ticket uses the live `world-index` node-type names for `list_records.record_type` values so MCP retrieval matches the indexed artifact without aliases.
11. **Verification command shape corrected to the live package** — this checkout has no root `pnpm --filter world-mcp` workspace command. The truthful proof lane is package-local `npm run build` / `npm test` from `tools/world-mcp`, plus package-local compiled handler or in-memory MCP server/client tests. Direct external `mcp__worldloom__...` calls are not exposed in this Codex session, so post-change proof uses package-local tests and dispatch smoke rather than claiming a live external MCP connector call.

## Architecture Check

1. **Single optional `story_slug` parameter is cleaner than per-tool boolean toggles** — every tool that touches story-bundle data accepts an optional `story_slug` parameter. When present, the query is scoped to that story bundle's records. When absent on a story-bundle-typed query, the tool returns an error (`story_slug required for record_type=storylet_record`); when absent on a world-canon-typed query, behavior is unchanged. This pattern parallels how `allocate_next_id` already handles story-bundle classes.
2. **No backwards-compatibility shims** — existing callers (skills using `list_records(record_type='canon_fact')`, `get_record('CF-0004')`, etc.) continue to work without modification. Story-bundle support is additive.
3. **`get_record` ID-resolution policy** — when `story_slug` is supplied for a story-bundle authored id, `get_record(record_id, world_slug, story_slug)` composes the MCPENH-025 DB node id `<story_slug>:<record_id>` and resolves that indexed row. When `story_slug` is omitted and the record_id matches a story-bundle pattern (PG-NNNN, SE-NNNN, etc.), the tool returns an error naming the missing parameter. This is strict but safe: ambiguity is surfaced rather than silently resolved to a wrong record.

## Verification Layers

1. `list_records(world_slug, record_type='storylet_record', story_slug=<slug>)` returns every SLT in the bundle → schema validation: count matches `worlds/<slug>/stories/<story-slug>/_source/storylets/*.yaml` file count.
2. `list_records` without `story_slug` for a story-bundle record_type returns an error → input schema validation: zod refusal at the tool boundary, not at the SQL layer.
3. `get_record(record_id='SLT-0021', world_slug=<slug>, story_slug=<story-slug>)` returns the parsed YAML body → manual review of returned shape vs. raw file.
4. `get_record(record_id='SLT-0021', world_slug=<slug>)` (no story_slug) returns an error naming the ambiguity → input schema validation.
5. `find_named_entities(world_slug, names=[...], story_slug=<slug>)` surfaces story-local entity mentions alongside world-canon entities → schema validation: the response includes a new `story_local_matches` array (or extends the existing `surface_matches` with a `story_slug` discriminator field).
6. `get_neighbors(node_id='PG-0001', world_slug=<slug>, story_slug=<story-slug>)` resolves the authored story id to the story-scoped DB node and returns indexed story-bundle neighbors for MCPENH-025 edge types such as `created_at_page`, `parent_page`, `opens_obligation`, and `thread_obligation` → schema validation.
7. `search_nodes(world_slug, query='loft', story_slug=<slug>)` returns story-bundle FTS matches → schema validation: results include the new story-bundle node types.
8. `describe_capabilities` enumerates the new story-bundle record types and the `story_slug` parameter → manual review of the discovery surface.
9. FOUNDATIONS §Tooling Recommendation alignment — the commitment that "LLM agents should never operate on prose alone" now holds for story-bundle records via the new retrieval surface → FOUNDATIONS alignment check.

## Landed Changes

### 1. Extended `record_type` enum across retrieval tools

Added the following enum values to `list_records.ts`'s `record_type` parameter, matching the closed live `world-index` enum from MCPENH-025:

- `storylet_record` (SLT)
- `obligation_record` (OBL — story-bundle, not world-OBL — there is no world-OBL class; the namespace is unambiguous but the type label disambiguates from any future world-level OBL)
- `thread_record` (THR)
- `story_fact_record` (SF)
- `story_event_record` (SE)
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
- `story_diegetic_artifact_record` (story-local DA)

The `story_` prefix or `_story` suffix on `story_fact_record`, `story_event_record`, `relationship_record_story`, and `audit_record_story` disambiguates from any future world-level record class with the same conceptual name (defensive future-proofing).

### 2. Added `story_slug` parameter to retrieval tools

Added an optional `story_slug: string` (kebab-case `[a-z0-9-]+`) parameter to:

- `list_records.ts` (required when `record_type` is a story-bundle type; ignored otherwise).
- `get_record.ts` (required when the record_id matches a story-bundle ID pattern; optional otherwise).
- `get_records.ts` (same logic as `get_record`).
- `get_record_field.ts` / `get_records_field.ts` (same).
- `get_neighbors.ts` (required when the record_id is story-bundle).
- `find_named_entities.ts` (optional; when supplied, the response includes story-local entity matches alongside world-canon).
- `search_nodes.ts` (optional; when supplied, the FTS scope is limited to that bundle).
- `find_impacted_fragments.ts` (required when impact target is a story-bundle CF reference — e.g., a story-bundle SF whose `derived_from_cf` is the impact target).

### 3. Updated ID-resolution policy in `get-record.ts`

Story-bundle IDs (PG, SE, SF, OBL, CNSQ, SREL, STINT, STENT, STLOC, STOBJ, BR, CHC, SLT, SLB, SAU, SP, RSP) are bundle-scoped: `PG-0001` exists in every bundle that has at least one rendered page. Resolution policy:

- If `story_slug` is supplied: compose the story-scoped DB node id `<story_slug>:<record_id>` and resolve that row from `nodes`.
- If `story_slug` is absent AND record_id pattern matches a story-bundle class: return error `story_slug required for record_id=<id>; bundle-scoped IDs are not unique across bundles within a world`.
- If `story_slug` is absent AND record_id pattern matches a world-canon or hybrid class (CF/CH/INV/M/OQ/ENT/SEC/CHAR/DA/PA/STORY): resolve as today (single namespace per world).

### 4. Updated `find_named_entities.ts` to surface story-local entity matches

When `story_slug` is supplied, the response includes a new `story_local_matches` array containing matches from story-bundle records (parallel to the existing `canonical_matches`, `scoped_matches`, `surface_matches`, `hints` arrays). Each story-local match carries `story_slug`, `node_id`, `node_type`, `matched_text`, `match_kind`.

### 5. Updated `describe_capabilities` / registered metadata to enumerate the new surface

The discovery tool now receives the extended `list_records.record_type` enum from the registered server capability metadata. Registered tool descriptions also document the `story_slug` parameter and story-bundle ambiguity rule.

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
- `tools/world-mcp/src/tools/find-impacted-fragments.ts` (modify — story-bundle authored id resolution)
- `tools/world-mcp/src/server.ts` (modify — input schemas and registered tool descriptions)
- `tools/world-mcp/src/tools/_shared.ts` (modify — shared story-bundle node types, ID helpers, and `story_slug` filtering)
- `tools/world-mcp/README.md` (modify — story-bundle retrieval docs)
- `docs/FOUNDATIONS.md` (modify during post-ticket review — read-discipline wording for targeted story-bundle retrieval)
- `docs/MACHINE-FACING-LAYER.md` (modify — retrieval scope docs)
- `tools/world-mcp/tests/fixtures/build-fixture.ts` (modify — current-schema empty fixture setup)
- `tools/world-mcp/tests/tools/_shared.ts` (modify — current-schema + story_slug fixture seeding)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (new — shared story-bundle fixture)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (new)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (new)
- `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` (new)
- `tools/world-mcp/tests/tools/find-named-entities.story-local.test.ts` (new)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (new)
- `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` (new)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — enum coverage)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — enum coverage)

## Out of Scope

- Story-bundle context layer in `get_context_packet` (covered by MCPENH-027).
- Story-bundle write routing (covered by PEENH-001).
- Story-bundle predicate-DSL parsability validator (covered by VALENH-001).
- Updating the five story-pipeline skills' SKILL.md to use the new retrieval surface (follow-up; can be a separate maintenance ticket once this lands).

## Acceptance Criteria

### Tests That Passed

1. `npm run build` and `npm test` passed from `tools/world-mcp`; new tests cover story-bundle retrieval per Verification Layers.
2. Package-local `listRecords({ world_slug: "seeded", record_type: "storylet_record", story_slug: "opening-bells" })` returned fixture SLT records matching the seeded bundle count.
3. Package-local `getRecord({ record_id: "SLT-0021", world_slug: "seeded", story_slug: "opening-bells" })` returned the parsed YAML body.
4. Package-local `getRecord({ record_id: "SLT-0021", world_slug: "seeded" })` returned an error naming the missing `story_slug`.
5. Package-local `getNeighbors({ node_id: "PG-0001", world_slug: "seeded", story_slug: "opening-bells" })` resolved the authored PG id to the story-scoped DB node and returned story-bundle neighbors.
6. Package-local `findNamedEntities({ world_slug: "seeded", names: ["Marla Kern"], story_slug: "opening-bells" })` returned the world-canon canonical match and story-local matches for the seeded STENT / SLT records.

### Invariants

1. World-canon retrieval (`list_records`, `get_record`, `get_neighbors`, `find_named_entities`, `search_nodes`) without `story_slug` returns identical results pre- and post-implementation — story-bundle support is additive.
2. Story-bundle retrieval requires `story_slug` for type-typed (list_records) or pattern-detected (get_record) story-bundle queries — ambiguity is surfaced as error, not silently resolved.
3. `describe_capabilities` accurately enumerates the new surface; no undocumented capabilities.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — assert story-bundle `list_records` returns expected counts for fixture bundle.
2. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` — assert resolution policy (`story_slug` required for bundle-scoped IDs) for singular, batch, and field retrieval.
3. `tools/world-mcp/tests/tools/get-neighbors.story-bundle.test.ts` — assert typed-edge traversal returns expected neighbors from authored story IDs.
4. `tools/world-mcp/tests/tools/find-named-entities.story-local.test.ts` — assert `story_local_matches` array is populated alongside `canonical_matches`.
5. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` — assert FTS scoping limits results to the named bundle.
6. `tools/world-mcp/tests/server/dispatch.test.ts` and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — assert MCP schema/dispatch metadata exposes `story_slug`-capable descriptions and the extended `list_records.record_type` enum.
7. `tools/world-mcp/tests/tools/find-impacted-fragments.story-bundle.test.ts` — assert story-bundle authored input IDs require and use `story_slug`.

### Commands

1. `npm run build` from `tools/world-mcp`.
2. `npm test` from `tools/world-mcp`.

## Outcome

Completion date: 2026-05-03.

Completed. `world-mcp` retrieval now supports story-bundle records through the indexed `nodes.story_slug` surface. Story-bundle `list_records` values require `story_slug`; authored story IDs such as `SLT-0021` and `PG-0001` are resolved by composing the MCPENH-025 DB node id `<story_slug>:<record_id>`; `get_records`, field projection, neighbors, impacted-fragment lookup, story-local entity matching, and FTS search all have story-scope coverage. Registered MCP descriptions, package docs, machine-facing docs, and capability enum tests were updated.

## Verification Result

Passed:

1. `npm run build` from `tools/world-mcp`.
2. `node --test dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-record.story-bundle.test.js dist/tests/tools/get-neighbors.story-bundle.test.js dist/tests/tools/find-named-entities.story-local.test.js dist/tests/tools/search-nodes.story-bundle.test.js dist/tests/tools/find-impacted-fragments.story-bundle.test.js` from `tools/world-mcp`.
3. `npm run build` from `tools/world-index`.
4. `node tools/world-index/dist/src/cli.js build erotica-world` from repo root, to refresh the gitignored live `worlds/erotica-world/_index/world.db` from index schema version 3 to 4 before the package-wide `world-mcp` suite.
5. `npm test` from `tools/world-mcp` — 311 tests passed.
6. Manual closeout review of `tools/world-mcp/README.md`, `docs/FOUNDATIONS.md`, `docs/MACHINE-FACING-LAYER.md`, `tools/world-mcp/src/server.ts`, and `describe_capabilities` enum coverage for same-seam discovery wording.

## Deviations

The drafted story record-type names `fact_record_story` / `event_record_story` were corrected to the live MCPENH-025 / `world-index` names `story_fact_record` / `story_event_record`; no aliases were added. The drafted neighbor proof named edge concepts (`emitted_choices`, `applied_event_ops`, `storylet_realized`) that are not current `world-index` edge types, so tests prove the live MCPENH-025 edge vocabulary (`created_at_page`, `parent_page`, `opens_obligation`, `thread_obligation`). Direct external `mcp__worldloom__...` calls were not exposed in this Codex session, so package-local handler and in-memory MCP dispatch tests are the accepted proof. The first broad `npm test` run failed only because the local gitignored `erotica-world` index was still schema version 3; after rebuilding that derived artifact to version 4, the full package suite passed.
