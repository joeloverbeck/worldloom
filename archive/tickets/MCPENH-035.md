# MCPENH-035: Extend `get_record_schema` to story-bundle record types

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/tools/get-record-schema.ts` (enum + mapping extension), `tools/world-mcp/tests/tools/get-record-schema.test.ts` and `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (coverage), `tools/world-mcp/README.md` (public enum inventory); rebuilt `tools/world-mcp/dist/` via `npm run build`.
**Deps**: none

## Problem

At intake, the `mcp__worldloom__get_record_schema(node_type)` MCP tool supported only world-canon and hybrid record types (`canon_fact_record | change_log_entry | invariant | mystery_reserve_entry | open_question_entry | named_entity | section | character_record | diegetic_artifact_record | adjudication_record | extension_entry`). When a story-pipeline skill (storylet-pool-authoring, branching-story-bootstrap, branching-story-page-cycle, branching-story-health-audit, story-fact-promotion-to-canon) needed to verify a story-bundle record's authoritative schema — for example, to confirm whether `provenance.origin` enforces a closed enum, whether `mystery_safety` requires sub-fields, or whether `cast_requirements[].predicates[]` accepts a given DSL form — it had to direct-`Read` the JSON-Schema file under `tools/validators/src/schemas/story-*.schema.json`. That broke the FOUNDATIONS §Tooling Recommendation pattern (MCP-mediated retrieval over direct file reads) for the story-bundle surface that FOUNDATIONS §Story Bundles §3 already declares as MCP-retrieval-eligible (story-bundle records are direct-readable but typed retrieval via `list_records`, `get_record`, etc. is the canonical API surface; schema discovery should follow the same pattern).

Surface evidence of the gap was a session-time event during the storylet-pool-authoring audit's Issue 3 verification (2026-05-04): the operator needed to confirm `provenance.origin` openness on the storylet schema and fell back to direct `Read` of `tools/validators/src/schemas/story-storylet.schema.json` because no `node_type='storylet_record'` was accepted. The 15 current story-bundle JSON-Schema files all ship at `tools/validators/src/schemas/` (`story-branch.schema.json` ... `story-thread.schema.json`) — they are present in the codebase but unaddressable via MCP.

## Assumption Reassessment (2026-05-04)

1. `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` is defined at `tools/world-mcp/src/tools/get-record-schema.ts:14-26` as 11 world-canon types. The MCP server registers `get_record_schema` at `tools/world-mcp/src/server.ts:373-376` consuming this enum via `getRecordSchemaInputSchema` at line 148. `NODE_TYPE_TO_SCHEMA_FILE` mapping at `get-record-schema.ts:43-55` covers the same 11 types.
2. `tools/validators/src/schemas/` ships 15 story-bundle schema files (`story-*.schema.json`) — confirmed at reassessment via `find tools/validators/src/schemas -maxdepth 1 -name 'story-*.schema.json'`. The `story-storylet.schema.json` is the JSON-Schema source consumed by the patch engine via `referenced_schemas` in the envelope-shape response (per the `mcp__worldloom__describe_envelope_schema(op_kind='create_slt_record')` response observed in the storylet-pool-authoring session). Note that `list_records`'s `record_type` enum at the MCP layer accepts the broader set of story-bundle record types (`storylet_record`, `story_fact_record`, `page_record`, etc.); `get_record_schema`'s enum lags behind.
3. Cross-skill or cross-artifact ticket: this ticket touches the boundary between `tools/world-mcp/` (MCP retrieval surface) and `tools/validators/src/schemas/` (story-bundle schema files). The shared boundary is the schema-discovery contract between story-pipeline skills and the MCP retrieval layer.
4. FOUNDATIONS §Tooling Recommendation states "LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern —: ..." — extending `get_record_schema` to story-bundle types implements §Tooling Recommendation parity for the story-bundle surface. FOUNDATIONS §Story Bundles §3 (Read Discipline) names typed retrieval (`get_record`, `get_records`, `list_records`, `get_neighbors`, `search_nodes`, `find_named_entities`, `find_impacted_fragments`) as the canonical story-bundle API surface; schema discovery is the parallel shape and should follow the same pattern.
5. Schema extension scope: the `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` enum extension is additive-only (adding new enum values; no existing values renamed or removed). The `NODE_TYPE_TO_SCHEMA_FILE` mapping is additive-only (new key→path entries). Existing callers that pass world-canon node types are unaffected.
6. Draft drift: the ticket's "16 files" count was stale; the live schema-backed story-bundle node types are 15: `story_entity_record`, `story_fact_record`, `story_event_record`, `obligation_record`, `consequence_record`, `thread_record`, `relationship_record_story`, `intention_record`, `story_location_record`, `story_object_record`, `branch_record`, `page_record`, `choice_record`, `storylet_record`, and `story_diegetic_artifact_record`.
7. The external `mcp__worldloom__get_record_schema` tool is not exposed in this Codex session, so direct post-edit MCP smoke is not an available proof surface. The truthful substitute is package-local handler coverage plus in-memory server/dispatch capability tests after `tools/world-mcp` is rebuilt.
8. Same-seam public surface: `tools/world-mcp/README.md` currently lists only the 11 world-canon/hybrid `get_record_schema` `node_type` values, so the README is included as package-local docs fallout. `docs/MACHINE-FACING-LAYER.md` describes `get_record_schema` generically and does not carry the stale enum list.

## Architecture Check

1. The cleanest implementation extends the existing `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` enum with the story-bundle types and adds matching `NODE_TYPE_TO_SCHEMA_FILE` entries. This reuses the existing schema-loading machinery (file read, cache, conditional-blocks resolution) without introducing a parallel "story-bundle schema" code path. Story-bundle schemas live at the same `tools/validators/src/schemas/` root, so the relative-path-resolution logic in `get-record-schema.ts` continues to work without modification. Alternative — adding a separate `get_story_record_schema` MCP tool — was rejected because it would fork the schema-discovery API surface and force every consumer to branch on world-canon-vs-story-bundle at the call site.
2. No backwards-compatibility shims or alias paths are introduced — existing callers passing the 11 world-canon node types continue to work unchanged; new callers can pass any story-bundle type.

## Verification Layers

1. `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` contains all 26 schema-backed record types (11 world-canon/hybrid + 15 story-bundle) -> codebase grep-proof against `tools/world-mcp/src/tools/get-record-schema.ts` after the edit.
2. `getRecordSchema({ node_type: 'storylet_record' })` returns the parsed `story-storylet.schema.json` content -> targeted package-local handler proof.
3. Each new story-bundle node type resolves to a real schema file under `tools/validators/src/schemas/` -> codebase grep-proof against `NODE_TYPE_TO_SCHEMA_FILE`.
4. FOUNDATIONS §Tooling Recommendation alignment for story-bundle schema discovery -> FOUNDATIONS alignment check (the §Story Bundles §3 read discipline references typed retrieval; schema discovery is its parallel API surface).

## Landed Changes

### 1. Extend `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` in `get-record-schema.ts`

Added story-bundle entries to the const tuple in `tools/world-mcp/src/tools/get-record-schema.ts`. The landed list intersects `list_records` story-bundle record types with the actual schema-file inventory at `tools/validators/src/schemas/story-*.schema.json`. Verified file inventory at reassessment (15 files): `story-branch.schema.json`, `story-choice.schema.json`, `story-consequence.schema.json`, `story-diegetic-artifact.schema.json`, `story-entity.schema.json`, `story-event.schema.json`, `story-fact.schema.json`, `story-intention.schema.json`, `story-location.schema.json`, `story-object.schema.json`, `story-obligation.schema.json`, `story-page.schema.json`, `story-relationship.schema.json`, `story-storylet.schema.json`, `story-thread.schema.json`.

### 2. Extend `NODE_TYPE_TO_SCHEMA_FILE` mapping

Added entries pairing each new enum value to its schema file path relative to `tools/validators/src/schemas/`. Per-bundle hybrid record types whose JSON-Schema files do not ship (`audit_record_story`, `promotion_record`, `storylet_batch_manifest`, `remediation_storylet_proposal_card`) are scope-excluded and documented in §Out of Scope.

### 3. Verify the input-schema validation at `server.ts`

Verified `getRecordSchemaInputSchema` imports `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` and picked up the extended enum automatically. No `server.ts` edit was required.

### 4. Verify `describe_capabilities` auto-projection

Verified the capability listing's `input_schema_enums` projection is driven by the registered enum. No `describe-capabilities.ts` edit was required; coverage was added to `tools/world-mcp/tests/tools/describe-capabilities.test.ts`.

### 5. Tests

Extended `tools/world-mcp/tests/tools/get-record-schema.test.ts` to cover all schema-backed story-bundle node types through the generated expectation maps and focused assertions for `storylet_record`, `story_fact_record`, `page_record`, and `branch_record`.

### 6. Package README

Updated `tools/world-mcp/README.md` so the public `get_record_schema(node_type)` inventory includes the new schema-backed story-bundle values and explicitly scopes out story-bundle record types without JSON-Schema sources.

## Files to Touch

- `tools/world-mcp/src/tools/get-record-schema.ts` (modify — enum + mapping extension)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — coverage extension)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify — enum projection coverage)
- `tools/world-mcp/README.md` (modify — public enum inventory)
- `tools/world-mcp/dist/` (rebuilt via `npm run build`; gitignored)

## Out of Scope

- Adding new schema files for story-bundle hybrid record types that don't yet ship one (`audit_record_story`, `promotion_record`, `storylet_batch_manifest`, `remediation_storylet_proposal_card`) — these lack JSON-Schema files in the current `tools/validators/src/schemas/story-*.schema.json` inventory and remain excluded. A follow-up ticket can ship them.
- Any extension of the patch-engine's per-op `referenced_schemas` projection — that surface already projects the story-storylet schema via `describe_envelope_schema`; this ticket extends the SCHEMA-DISCOVERY surface, not the envelope-discovery surface.
- Adding new MCP tools for story-bundle-specific schema queries — extending the existing `get_record_schema` enum is sufficient and avoids API surface bloat.
- Updating skill prose (storylet-pool-authoring/SKILL.md, branching-story-bootstrap/SKILL.md, etc.) to reference the extended enum — the schema-discovery surface propagates by reference; skill-prose updates are out of scope and route to `/skill-audit` if needed.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local `getRecordSchema({ node_type: 'storylet_record' })` returns the parsed `story-storylet.schema.json` content, including `additionalProperties: true` and the `pattern: ^SLT-[0-9]{4}$` constraint on the `id` field.
2. Package-local describe-capabilities and server dispatch tests return `get_record_schema`'s `input_schema_enums.node_type` containing all 26 schema-backed values (11 world-canon/hybrid + 15 story-bundle).
3. Each new story-bundle node type resolves to a real schema file under `tools/validators/src/schemas/`.
4. Existing callers passing one of the 11 world-canon node types continue to receive identical responses (no regression on world-canon discovery).
5. `cd tools/world-mcp && npm run build` passes.
6. Tests at `tools/world-mcp/tests/tools/get-record-schema.test.ts` cover all schema-backed story-bundle node types, with focused assertions for `storylet_record`, `story_fact_record`, `page_record`, and `branch_record`.

### Invariants

1. `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` is the single source of truth for the schema-discovery enum — no parallel enum exists in `server.ts` or `describe-capabilities.ts`.
2. `NODE_TYPE_TO_SCHEMA_FILE` entries point to files that exist at HEAD (verified during reassessment and by package-local tests).

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-schema.test.ts` — extend coverage to include all schema-backed story-bundle node types, with focused assertions for `storylet_record`, `story_fact_record`, `page_record`, and `branch_record`.

### Commands

1. `cd tools/world-mcp && npm run build` — confirms the TS compilation succeeds with the extended enum.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — proves handler resolution plus registered enum projection through compiled package artifacts.
3. `cd tools/world-mcp && npm test` — runs the full package suite.
4. Direct `mcp__worldloom__get_record_schema` smoke is unavailable in this Codex session; the compiled handler and in-memory server/dispatch proofs are the correct substitute for this run.

## Outcome

Completion date: 2026-05-04.

`get_record_schema` now accepts the 15 schema-backed story-bundle node types and resolves each one to its validator JSON-Schema file. Existing world-canon/hybrid schema discovery remains on the same tuple/mapping path. `describe_capabilities` and server dispatch continue to project `SUPPORTED_RECORD_SCHEMA_NODE_TYPES` as the single enum source of truth.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed after tightening one strict test assertion.
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record-schema.test.js dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js` — passed; 3 compiled test-file wrappers passed.
3. `cd tools/world-mcp && npm test` — passed; 337 tests passed after rebuilding.

## Deviations

- Direct external `mcp__worldloom__get_record_schema(node_type='storylet_record')` smoke was not available in this Codex session. The accepted proof is the compiled handler plus in-memory server/dispatch test lane, which exercises the same source enum and registration boundary.
- The drafted "16 story-bundle schema files" count was corrected to 15 live JSON-Schema files. The four story-bundle record types without schema files remain out of scope.
- Skill prose updates remained out of scope. The existing dirty `.claude/skills/mcp-integration-audit/SKILL.md` still contains historical gap-detection wording about story-bundle schema-discovery absence; that pre-existing skill edit was left untouched for the skill/audit owner.
