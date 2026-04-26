<!-- spec-drafting-rules.md not present; using default structure + Deliverables + Risks & Open Questions. -->

# SPEC-16: MCP Retrieval-Surface Refinements

**Phase**: 2.7 (post-pilot retrieval refinements; independent of SPEC-09 canon-safety expansion)
**Depends on**: SPEC-02 (Retrieval MCP Server, archived), SPEC-02-PHASE2 (retrieval-MCP Phase 2 tooling, archived), SPEC-12 (Skill-Reliable Retrieval, archived), SPEC-13 (Atomic-Source Migration, archived)
**Blocks**: SPEC-17 §C2 deliverable (FOUNDATIONS prose softening) is conditional on this spec's C3 + C5 landing first

## Problem Statement

The 2026-04-26 first-live canon-addition run against the post-Phase-2 atomic-source pipeline (animalia world, PR-0015 corner-share register, accepted as CF-0048 / CH-0021 / PA-0018) was end-to-end successful but exposed four MCP retrieval-surface frictions that were not visible in any prior dry-run, fixture test, or static-validation pass. They surface only when an LLM agent reasons end-to-end through a real canon-addition flow against a real world index and a real submit path. None block any current workflow — workarounds exist for each — but each adds round-trips, guess-and-check cycles, or out-of-band source reading that should be eliminated as the pipeline matures past pilot.

The four findings, each independently observed and reproducible:

1. **No field-slice retrieval.** `mcp__worldloom__get_record(record_id)` returns the full parsed record. For records >50KB (animalia: SEC-ELF-001 ≈ 76KB), the response exceeds the agent's context budget and the agent has to dispatch a subagent with `jq` queries against the file directly. There is no MCP tool to retrieve a specific field of a record without retrieving the whole thing — even when the agent only needs `touched_by_cf` or `extensions[]`.

2. **No record-shape discovery.** `mcp__worldloom__get_canonical_vocabulary({class})` returns enum values for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`. There is no parallel tool for record-shape contracts: field names, types, optional/required, regex patterns. A skill author who wants to know "what fields can a CF have? what regex constrains `pre_figured_by`?" must read TypeScript source (`tools/world-index/src/schema/types.ts`), JSON Schema files (`tools/validators/src/schemas/canon-fact-record.schema.json`), or submit a draft and parse the validation failure messages. Live evidence: the 2026-04-26 PR-0015 run hit a `record_schema_compliance.pattern` failure for `pre_figured_by/0` precisely because the field's regex constraint was undiscoverable via MCP.

3. **Context-packet budget guess-and-check.** `get_context_packet(..., token_budget=10000)` failed with `packet_incomplete_required_classes` and reported `minimum_required_budget: 12485`. Bumped to 14000 — failed again, reported `minimum_required_budget: 14322`. Bumped to 16000 — succeeded. Three round-trips for a result the tool already knew on the first call. The current default `token_budget` (8000 in `tools/world-mcp/src/tools/get-context-packet.ts:39`) is well below the empirical minimum for `task_type='canon_addition'` against animalia at current state.

4. **No prose-body lexical scan in `find_named_entities`.** `mcp__worldloom__find_named_entities(names)` queries the entity registry's canonical_name + alias + scoped_reference fields. It does NOT lexically scan prose body content (section bodies, diegetic-artifact bodies, character-dossier bodies). For Rule 6 audit-trail / pre-figuring scans where the target string may appear ONLY in prose (e.g., a name mentioned in a diegetic artifact's body but never registered as a canonical entity), the current tool returns zero matches and the agent has to trust the proposal's self-claim or open the file directly. `mcp__worldloom__search_nodes(query)` runs FTS5 lexical search but ranks by relevance and caps at 20 results — useful for "find the most relevant" but not for "exhaustively confirm presence/absence."

These are the kinds of finding that emerge only from running the live pipeline against a non-trivial envelope. They were not visible during SPEC-02 / SPEC-12 implementation because nothing exercised the full submit path with a real proposal until 2026-04-26.

## Approach

Four additive MCP tooling changes, all independent of each other, none changing FOUNDATIONS or storage contracts. Each ships under its own ticket; they parallelize freely.

**Track C3 — `get_record_field` slice tool.** New MCP tool `mcp__worldloom__get_record_field(record_id, field_path)` returning a single field's value without the rest of the record. `field_path` is a `(string | number)[]` array (e.g., `["touched_by_cf"]`, `["extensions"]`, `["modification_history"]`, `["extensions", 0, "body"]`). Reuses the existing `get-record.ts` resolution path (record-id pattern, world-resolution, YAML parsing); diverges only in projecting to the requested field after parse. Reduces the cost of structural inspection on large records from "load 76KB body" to "load the field of interest."

**Track C4 — `get_record_schema` discovery tool.** New MCP tool `mcp__worldloom__get_record_schema(node_type)` returning the JSON Schema for the requested record class, sourced from `tools/validators/src/schemas/*.json`. Supported `node_type` values mirror the existing `NodeType` enum in `tools/world-index/src/schema/types.ts` (so a skill author who already knows the NodeType discriminator passes that value verbatim): `canon_fact_record`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, `adjudication_record`. The tool maps these `node_type` values internally to schema filenames (three of the ten — character / diegetic-artifact / adjudication — resolve to `*-frontmatter.schema.json` because their schema validates the record's frontmatter; see the mapping table under Deliverables). Returns the static structural schema plus a `referenced_schemas` map (see Deliverables for the exact response shape) — no merging with rule-level constraints (deferred per YAGNI; SPEC-09's conditionally-mandatory Rule 11/12 fields can be exposed in a follow-on if a skill needs them).

**Track C5 — Context-packet auto-budget UX.** Two coordinated changes to `get_context_packet`:
- **Per-task-type defaults.** Replace the hardcoded `token_budget ?? 8000` fallback in `tools/world-mcp/src/tools/get-context-packet.ts:39` with a per-`task_type` default lookup table. Initial defaults: `canon_addition: 16000`, `character_generation: 8000`, `diegetic_artifact_generation: 8000`, `continuity_audit: 8000`, `other: 8000`. Empirically grounded by the 2026-04-26 pilot (`canon_addition` minimum was ~14.3K against animalia at current state); other task types retain the existing default until live evidence demands otherwise — the `retry_with` error surface auto-corrects upward when actual minimums exceed the default.
- **Improved error response.** Augment the existing `packet_incomplete_required_classes` error (`tools/world-mcp/src/context-packet/assemble.ts:286-302`) with a structured `retry_with: { token_budget: <minimum_required_budget> }` field. The agent retries with the suggested budget on a single round-trip rather than parsing the error message and re-invoking. Preserves explicit-retry semantics (no implicit override of the requested budget cap).

**Track C6 — Exhaustive lexical scan via `search_nodes`.** Extend `mcp__worldloom__search_nodes` with an `exhaustive: true` mode (default `false` preserves current behavior). When `exhaustive: true`, the tool:
- Uses the same FTS5 lexical query path
- Returns ALL matches (not capped at 20)
- Skips relevance ranking (returns matches in node-id order for deterministic output)
- Includes a `match_locations[]` array per result indicating which FTS5-indexed columns contained the match. The enum is `'body' | 'heading_path' | 'summary'` — these are the three indexed columns of the `fts_nodes` virtual table (`tools/world-index/src/schema/migrations/001_initial.sql:88-95`). Omitting `summary` would silently lose attribution for the case where a query matches only the `summary` column.

The `exhaustive` mode is the right surface for Rule 6 audit-trail / pre-figuring scans — "does this string appear ANYWHERE in the world?" Distinct from `find_named_entities`, which is the canonical-registry surface; mixing concerns by parameterizing `find_named_entities` with `include_prose_body: true` would conflate "registered entity lookup" with "lexical presence check" — they are different audit questions and should remain different tools.

## Deliverables

### Track C3: `get_record_field` slice tool

**`tools/world-mcp/src/tools/get-record-field.ts`** — new tool. Signature: `getRecordField({ record_id, field_path, world_slug? }) → { value, content_hash, file_path }` or `McpError`. Reuses `validateRecordId`, `resolveRecordRow`, and `parseRecordBody` from `get-record.ts` (extract to `_shared.ts` if cleaner, or keep duplicated — implementer's call). After parsing, walks `field_path` against the parsed record; returns `record_field_not_found` McpError if any path segment is absent.

**`tools/world-mcp/src/tool-names.ts`** — add `get_record_field: "mcp__worldloom__get_record_field"` to `MCP_TOOL_NAMES` and to `MCP_TOOL_ORDER`.

**`tools/world-mcp/src/server.ts`** — declare a Zod input schema near `getRecordInputSchema` (server.ts:83): `getRecordFieldInputSchema = z.object({ record_id: z.string().min(1), field_path: z.array(z.union([z.string(), z.number().int()])).min(1), world_slug: z.string().min(1).optional() })`. The `(string | number)` element type pins the array-index-vs-object-key resolution at the schema layer (numeric segments index arrays; string segments index object keys). Then register the new tool via `registerWrappedTool` (follow the pattern of `get_record` at server.ts:213-219).

**`tools/world-mcp/tests/tools/get-record-field.test.ts`** — test cases:
- Valid record + valid scalar field path → returns the value
- Valid record + valid nested-array field path (e.g., `["extensions", 0, "body"]`) → returns the value
- Valid record + invalid field path → `record_field_not_found`
- Invalid record_id → reuses `get_record`'s `invalid_input` error
- Missing record → reuses `get_record`'s `record_not_found` error

### Track C4: `get_record_schema` discovery tool

**`tools/world-mcp/src/tools/get-record-schema.ts`** — new tool. Signature: `getRecordSchema({ node_type }) → { schema: JSONSchema, source_path: string, referenced_schemas: Record<string, JSONSchema> }` or `McpError`. Loads the schema file from `tools/validators/src/schemas/<mapped-stem>.schema.json` at startup or on-demand; returns:
- `schema` — the parsed JSON Schema as-is, including any `$ref` URLs (provenance preserved).
- `source_path` — relative path to the schema file so callers can verify provenance.
- `referenced_schemas` — map keyed by `$id` URL (e.g., `"https://worldloom.local/schemas/extension-entry.schema.json"`) containing every transitively-referenced schema reachable via `$ref` from the requested schema (currently `extension-entry.schema.json`, referenced by several record schemas that expose `extensions[]`). Empty map when the requested schema has no `$ref` sites. The implementer walks `$ref` URLs from the loaded schema, resolves each against `tools/validators/src/schemas/_shared/` (and any other co-located schema directories), and includes the parsed JSON in the map. This lets a skill author dereference field constraints (e.g., `extensions[]` shape) without an additional MCP call.

**Schema-name mapping** — `node_type` mirrors the existing `NodeType` enum (`tools/world-index/src/schema/types.ts:6`). The tool maps `node_type` to schema filenames; three values resolve to a `-frontmatter.schema.json` stem because the schema validates the record's YAML frontmatter (the prose body has no structural schema). Mapping table:
| `node_type` | schema file |
|---|---|
| `canon_fact_record` | `canon-fact-record.schema.json` |
| `change_log_entry` | `change-log-entry.schema.json` |
| `invariant` | `invariant.schema.json` |
| `mystery_reserve_entry` | `mystery-reserve.schema.json` |
| `open_question_entry` | `open-question.schema.json` |
| `named_entity` | `entity.schema.json` |
| `section` | `section.schema.json` |
| `character_record` | `character-frontmatter.schema.json` |
| `diegetic_artifact_record` | `diegetic-artifact-frontmatter.schema.json` |
| `adjudication_record` | `adjudication-frontmatter.schema.json` |

Unknown `node_type` → `invalid_input` McpError listing the supported set.

**`tools/world-mcp/src/tool-names.ts`** — add `get_record_schema: "mcp__worldloom__get_record_schema"` to `MCP_TOOL_NAMES` and to `MCP_TOOL_ORDER`.

**`tools/world-mcp/src/server.ts`** — declare a Zod input schema near `getRecordInputSchema` (server.ts:83): `getRecordSchemaInputSchema = z.object({ node_type: z.enum([...]) })` enumerating the ten supported `node_type` values verbatim from the mapping table above. Then register the new tool via `registerWrappedTool` (follow the pattern of `get_record` at server.ts:213-219).

**`tools/world-mcp/tests/tools/get-record-schema.test.ts`** — test cases for each `node_type` (asserts the returned schema's `$id` matches the expected file); CF-record and section requests return a `referenced_schemas` map containing the extension-entry schema keyed by its `$id` URL; unknown `node_type` returns `invalid_input` with the supported list.

### Track C5: Context-packet auto-budget UX

**`tools/world-mcp/src/tools/get-context-packet.ts`** — replace the hardcoded `args.token_budget ?? 8000` fallback with a per-`task_type` default lookup. Add a const `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number>`:
```ts
const DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE: Record<TaskType, number> = {
  canon_addition: 16000,
  character_generation: 8000,
  diegetic_artifact_generation: 8000,
  continuity_audit: 8000,
  other: 8000
};
```

**`tools/world-mcp/src/context-packet/assemble.ts`** — augment the `packet_incomplete_required_classes` error payload (lines 296-301) to include `retry_with: { token_budget: insufficiency.minimumRequiredBudget }`. The existing `minimum_required_budget` field stays for backward compatibility; `retry_with` is the structured retry-hint surface.

**`tools/world-mcp/tests/tools/get-context-packet.test.ts`** and **`tools/world-mcp/tests/context-packet/budget-handling.test.ts`** — test cases:
- `task_type='canon_addition'` with `token_budget` omitted → uses 16000 default
- `task_type='character_generation'` with `token_budget` omitted → uses 8000 default
- Insufficient explicit budget → error includes `retry_with.token_budget` matching `minimum_required_budget`
- Successful retry using `retry_with.token_budget` → returns a complete packet

### Track C6: `search_nodes` exhaustive mode

**`tools/world-mcp/src/tools/_shared.ts`** — extend `SearchNodesArgs` with optional `exhaustive?: boolean` (default `false`).

**`tools/world-mcp/src/tools/search-nodes.ts`** — when `exhaustive === true`:
- Skip the `.slice(0, 20)` cap in the final `rankSearchRows(...).slice(0, 20)` default-mode result path
- Replace the ranking-profile sort with a deterministic node-id sort
- For each returned `SearchNodeResult`, populate a new `match_locations: ('body' | 'heading_path' | 'summary')[]` field by checking which source columns satisfied the lexical match. The `fts_nodes` virtual table indexes all three of `body`, `heading_path`, and `summary` (`tools/world-index/src/schema/migrations/001_initial.sql:88-95`); the per-row attribution can be computed by re-checking the `query` against each column post-fetch.

**`tools/world-mcp/tests/tools/search-nodes.test.ts`** — test cases:
- `exhaustive: false` (default) → existing behavior preserved (capped at 20, ranked)
- `exhaustive: true` against a corpus where the query matches >20 nodes → returns all matches, sorted by `node_id`
- `exhaustive: true` → each result includes `match_locations[]` populated per-row
- `exhaustive: true` against a node whose match falls only in the `summary` column → result's `match_locations` is `['summary']` (covers the third FTS-indexed column the previous draft omitted)
- `exhaustive: true` with no matches → empty `nodes[]` array (not an error)

### Cross-track: skill-side documentation

**`tools/world-mcp/README.md`** — document each new surface and update the Status line:
- At intake, the status line at README.md:7 still read "registers 13 tools"; update to "registers 15 tools" after C3 + C4 land.
- §Tools — add bullets for each new surface:
  - `get_record_field`: parameters, return shape, example invocations (one for `touched_by_cf` slice, one for `extensions[N].body` slice).
  - `get_record_schema`: parameters, the supported `node_type` set (matches `NodeType`), the `referenced_schemas` map, example invocation.
  - `get_context_packet`: note the per-task-type default table; document the `retry_with` error surface.
  - `search_nodes`: document the `exhaustive` parameter and the `match_locations` response field (`'body' | 'heading_path' | 'summary'`).

**`docs/MACHINE-FACING-LAYER.md`** — extend the "scope of each retrieval tool" subsection (added by SPEC-15 Track B3) to include the four new surfaces and clarify when to reach for each (e.g., "use `get_record_field` when the field of interest is small and the record body is large; use `get_record_schema` to discover field constraints before authoring; use `search_nodes` with `exhaustive: true` for Rule-6 audit scans").

**`.claude/skills/canon-addition/references/retrieval-tool-tree.md`** (created by SPEC15PILFIX-002; verify path) — extend the per-phase tool map:
- Phase 0 (pre-flight): mention `get_record_schema` as a one-time discovery call when the agent is unfamiliar with a record class
- Phase 6b (Rule 6 audit-trail scan): swap the recommendation from "trust proposal self-claim" to "call `search_nodes(query, exhaustive: true)` to confirm presence/absence in prose bodies"
- Phase 12a (touched_by_cf inspection on large SEC records): mention `get_record_field(SEC-id, ["touched_by_cf"])` as the lightweight alternative to `get_record(SEC-id)` when only the CF list is needed

**Backwards compatibility**: all four tracks are additive. No existing tool signatures change. Existing skills continue to work; they opt into the new surfaces as their authors update them.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Tooling Recommendation ("agents should always receive...") | aligns | C5's per-task-type defaults make first-call delivery of the required packet more reliable; C3 + C6 reduce the cost of the follow-up retrieval pattern that delivers full content. |
| §Canonical Storage Layer (atomic YAML; engine-only writes) | N/A | All four tracks are read-side. No write-path changes; engine-only mutation discipline preserved. |
| §Machine-Facing Layer (read API replaces ad hoc raw-file loading) | aligns | C4's schema discovery removes the last "read TypeScript source to author records" tax, completing the read-API surface. |
| Rule 6 (No Silent Retcons) | aligns | C6's `exhaustive: true` mode is the surface a Rule-6 audit-trail scan actually needs; current `search_nodes` ranking + 20-cap is suited to "find the most relevant," not "confirm absence." |

**No FOUNDATIONS amendments required.** All four tracks operate within the existing §Tooling Recommendation and §Machine-Facing Layer contracts; they extend the read-API surface without changing what FOUNDATIONS endorses.

## Verification

### Track C3

- `cd tools/world-mcp && npm test` passes after `get-record-field.test.ts` is added.
- Manual smoke: invoke `mcp__worldloom__get_record_field("SEC-ELF-001", ["touched_by_cf"])` against animalia; response is the `touched_by_cf` array only, not the full ~76KB body.
- Existing `get_record` tests continue to pass (no shared-helper regressions).

### Track C4

- `cd tools/world-mcp && npm test` passes after `get-record-schema.test.ts` is added.
- Manual smoke: invoke `mcp__worldloom__get_record_schema("canon_fact_record")` and confirm the response contains a `properties.pre_figured_by.items.pattern` matching `^CF-[0-9]{4}$`, AND that `referenced_schemas` includes the `extension-entry` schema keyed by `https://worldloom.local/schemas/extension-entry.schema.json`.
- Each of the 10 supported `node_type` values returns a schema whose `$id` matches the expected file.
- `grep -nE "character_record|diegetic_artifact_record|adjudication_record" tools/world-mcp/src/tools/get-record-schema.ts` confirms the C4 tool accepts the canonical `NodeType` values for the three frontmatter-schema cases (catches future drift if `NodeType` is renamed without updating C4's mapping table).

### Track C5

- `cd tools/world-mcp && npm test` passes after the new test cases are added.
- Package-local handler proof: `task_type='canon_addition'` with no `token_budget` requests a 16000 budget, while `task_type='character_generation'` retains the 8000 default.
- Assembler retry proof: an insufficient budget returns `retry_with.token_budget` equal to `minimum_required_budget`, and a second assembler call using that value succeeds. A direct external MCP smoke can be added when the `mcp__worldloom__get_context_packet` tool is available in the active session.

### Track C6

- `cd tools/world-mcp && npm test` passes after the new test cases are added.
- Manual smoke: invoke `mcp__worldloom__search_nodes(query='corner-share', exhaustive=true, filters={world_slug: 'animalia'})`; response includes prose-body matches in DA-0001 with `match_locations` populated; total result count exceeds 20 if the corpus has more than 20 mentions.

### Cross-track

- `tools/world-mcp/README.md` §Tools documents all four new surfaces (`grep -E "get_record_field|get_record_schema|exhaustive|DEFAULT_TOKEN_BUDGET" tools/world-mcp/README.md` returns matches).
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` references the new surfaces at the appropriate phases.
- A subsequent canon-addition run uses at least one of the new surfaces successfully (informal pilot evidence; not a gating criterion).

## Out of Scope

- **Multi-field-path retrieval in one call** (e.g., `get_record_fields(record_id, [["touched_by_cf"], ["extensions"]])`). YAGNI; defer until a skill needs it.
- **Computed-effective-schema mode for `get_record_schema`** (merging structural validators + rule-level constraints from FOUNDATIONS Rules 11/12). YAGNI until SPEC-09 lands and a skill needs the merged view.
- **Streaming context-packet responses** for >50KB packets. Out of scope; the per-task-type defaults plus `retry_with` retry hint cover the observed pilot pain. If post-SPEC-09 corpus growth pushes packets past comfortable single-response sizes, a separate spec can address streaming.
- **Replacing `find_named_entities` with `search_nodes` exhaustive-mode**. The two tools serve different audit questions (registry lookup vs lexical-presence scan); both stay.
- **C1 mod_history ↔ notes synchronization decision** and **C2 packet richness vs FOUNDATIONS softening**. Scoped to SPEC-17.
- **Hook 3 / engine / validator changes**. None; this spec is read-side only.

## Risks & Open Questions

- **Risk: per-task-type defaults drift from empirical reality.** The initial `canon_addition: 16000` default and retained `8000` defaults for the other task types are grounded in 2026-04-26 pilot data for one world (animalia) at one point in its growth. As worlds grow, the canon-addition minimum will rise. Mitigation: the `retry_with` error surface auto-corrects; defaults are a first-call optimization, not a contract. Re-tune defaults via a follow-up if pilot evidence on a second world (or post-SPEC-09 animalia) shows systematic mismatch.
- **Risk: `exhaustive: true` performance on large worlds.** FTS5 queries are fast but uncapped result sets may surprise callers. Mitigation: tests assert determinism (node-id sort), not bounded size; if a future world produces multi-thousand-match results, callers can filter via existing `filters` parameter or the spec can add an explicit `max_results` cap.
- **Risk: `get_record_field` field-path ambiguity for arrays.** Numeric path segments (`["extensions", 0, "body"]`) need clear semantics — array index vs object key. Resolution: the Zod input schema for C3 declares `field_path: z.array(z.union([z.string(), z.number().int()]))` — numeric segments are array indices when the parent is an array; string segments are object keys. Document in the README.
- **Open question: should `get_record_schema` cache schema files in memory?** The schemas change rarely (only via SPEC-04 ticket-driven updates). Initial implementation may load on-demand; if profiling shows hot-path cost, add a startup-time cache. Not a release blocker.
- **Ticket prefix.** Tickets under this spec use prefix `SPEC16MCPRETSUR-NNN` (MCP RETRieval SURface), matching the active ticket family in `tickets/`.

## Implementation order

Within SPEC-16 (four code sub-tracks plus one cross-track documentation ticket):

1. **SPEC16MCPRETSUR-001** — Track C3 (`get_record_field` tool + tests).
2. **SPEC16MCPRETSUR-002** — Track C4 (`get_record_schema` tool + tests).
3. **SPEC16MCPRETSUR-003** — Track C5 (per-task-type defaults + `retry_with` error surface + tests).
4. **SPEC16MCPRETSUR-004** — Track C6 (`search_nodes` exhaustive mode + tests).
5. **SPEC16MCPRETSUR-005** — cross-track docs (`tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and the canon-addition retrieval-tool-tree reference) after the four code surfaces exist.

All four code tickets may proceed in parallel; no inter-ticket dependencies. Suggested sub-order if serialized: C5 (smallest, smoothes pilot UX immediately) → C3 + C4 (additive tools, similar test scaffolding) → C6 (largest test surface), followed by the cross-track documentation ticket.

SPEC-16 should land before SPEC-17's C2 deliverable (FOUNDATIONS prose softening) because the FOUNDATIONS amendment relies on C3 + C5 being available for the index + follow-up-call pattern to be ergonomic.

## Outcome

Completed and archived on 2026-04-26.

- `SPEC16MCPRETSUR-001` landed `get_record_field`.
- `SPEC16MCPRETSUR-002` landed `get_record_schema`.
- `SPEC16MCPRETSUR-003` landed per-task-type `get_context_packet` defaults plus `retry_with`.
- `SPEC16MCPRETSUR-004` landed `search_nodes(exhaustive: true)` plus `match_locations`.
- `SPEC16MCPRETSUR-005` synchronized `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` with the landed retrieval surface.

SPEC-17's C2 deliverable is unblocked on the SPEC-16 side. A subsequent canon-addition pilot using one of the new surfaces remains useful informal evidence, but it is not a gating criterion for this spec's implementation closeout.
