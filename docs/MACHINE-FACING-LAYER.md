# Machine-Facing Layer

Worldloom's human-facing contract lives in markdown and YAML under `worlds/<slug>/`. The machine-facing layer is the retrieval, mutation, validation, and enforcement stack that lets skills operate on that world state structurally instead of by loading or editing prose directly.

This doc is the operational overview. The design details still live in the numbered specs and the tool package READMEs.

## Layers

1. **World index (`tools/world-index/`, SPEC-01)**  
   Builds `worlds/<slug>/_index/world.db`, a deterministic SQLite artifact containing parsed nodes, typed edges, anchor checksums, and search surfaces.
2. **Retrieval MCP (`tools/world-mcp/`, SPEC-02)**  
   Exposes the index as `mcp__worldloom__*` tools such as `search_nodes`, `get_node`, `get_neighbors`, and `get_context_packet`.
3. **Patch engine (`tools/patch-engine/`, SPEC-03)**  
   Applies typed patch plans with anchor-based targeting, append-only vocabulary, two-phase commit, and engine-controlled write ordering.
4. **Validators (`tools/validators/`, SPEC-04)**  
   Turn the mechanized FOUNDATIONS Validation Rules (1-7, 11, and 12) and structural invariants into executable checks, exposed through `world-validate` and the engine pre-apply gate. Rules 8, 9, 10, and 13 are not validator selectors; the numbering gap is documented in `docs/FOUNDATIONS.md` §Validation Rules. On the validation path, `validate_patch_plan` reports validator-run telemetry via `validators_run[]`; on the patch-engine submission path, the same shape is reported via `PatchReceipt.validators_run[]` (success) or `EngineError.validators_run[]` (failure). Each entry carries `validator_name`, `status` (`pass` / `fail` / `skipped`), `duration_ms`, and an optional `detail` populated when status is not `pass`. Consumers that don't read `validators_run` are unaffected by its presence.
5. **Hooks (`tools/hooks/`, SPEC-05)**  
   Make retrieval and mutation discipline structural in Claude Code by blocking oversized reads, blocking direct writes to engine-only surfaces, bootstrapping subagents, and auto-running validation.

## How The Layers Compose

```text
world markdown/YAML
  -> world-index init/build/sync
  -> _index/world.db
  -> world-mcp retrieval tools
  -> context packet or localized node reads
  -> skill analysis
  -> patch plan
  -> validators + patch engine
  -> working tree writes
  -> index refresh / follow-up validation
```

Read-side work can stop after the retrieval layer. Write-side work adds validators, approval-token discipline, and patch-engine submission.

## Phase Boundaries

- **Phase 1 live surface**: `world-index` is implemented; the docs now reserve the retrieval and hook contract that SPEC-02, SPEC-05 Part A, and SPEC-06 Part A target.
- **Phase 1.5 canonical storage layer**: on machine-layer-enabled worlds, `_source/` atomic YAML is the sole source-of-truth for atomized CF / CH / INV / M / OQ / ENT / SEC records. The retired root-level files (`CANON_LEDGER.md`, `INVARIANTS.md`, `MYSTERY_RESERVE.md`, `OPEN_QUESTIONS.md`, `TIMELINE.md`, `EVERYDAY_LIFE.md`, `INSTITUTIONS.md`, `MAGIC_OR_TECH_SYSTEMS.md`, `GEOGRAPHY.md`, `ECONOMY_AND_RESOURCES.md`, and `PEOPLES_AND_SPECIES.md`) do not exist on those worlds. Merged markdown views are human-facing, read-only, and not persisted; story-bundle records can be rendered with `world-index render <world-slug> --story <story-slug>`, while world-canon `--file <class>` rendering remains a future human-UX surface. LLM agents consume atomic world records via `mcp__worldloom__get_record` / `get_context_packet` instead. See SPEC-13 and `docs/FOUNDATIONS.md` §Canonical Storage Layer for the full contract.
- **Phase 2 live surface**: patch-engine writes, validator gating, and engine-only mutation guards become active.

The docs describe the intended steady-state contract, but any workflow should still be read against the phase it is actually running in.

## Which Layer To Reach For

| Need | Reach for |
|---|---|
| Bootstrap, rebuild, or refresh machine-readable world state | `world-index init <world>`, `world-index build <world>`, or `world-index sync <world>`; inspect `_index/world.db.skipped_records.log` when sync reports schema-failed skipped records |
| Render indexed story-bundle records for human inspection | `world-index render <world> --story <story-slug>` |
| Inspect indexed structure or diagnose retrieval misses | `world-index stats`, `world-index inspect`, or retrieval MCP tools |
| Gather a skill-sized input bundle | `mcp__worldloom__get_context_packet` |
| Localize specific nodes, records, persisted-packet slices, record fields, entities, or neighborhoods | `search_nodes`, `get_node`, `get_record`, `get_records`, `get_records_field`, `get_persisted_packet_slice`, `list_records`, `get_record_field`, `get_neighbors`, `find_named_entities` |
| Localize source-local names that are not world-level canonical entities | `find_named_entities.scoped_matches`, `get_node.scoped_references`, and `search_nodes` with `reference_name` or `include_scoped_references` |
| Estimate downstream impact before a write | `find_impacted_fragments`, then validators |
| Validate a patch plan envelope without mutating world content | `validate_patch_plan`, which returns `status: "pass"`, `status: "fail"` with validator verdicts, or `status: "skipped"` with a reason when the envelope cannot be validated. `pass` and `fail` responses include `validators_run[]`; `skipped` responses include `validators_run: []`. For envelopes too large for MCP transport, or for a temporary stale-validator-bundle workaround when restart is not immediately available, use the equivalent CLI path from the project root or active git worktree root: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>`. The CLI/engine path resolves world state from `process.cwd()`, so an invocation from another cwd can report `Index missing for world '<slug>'`. |
| Apply world-level changes on machine-layer-enabled worlds | `submit_patch_plan` via the patch engine |
| Inspect the patch-plan envelope and per-op payload contract before assembly | `describe_envelope_schema`, optionally filtered by `op_kind` |
| Prove structural integrity | `world-validate <world> --structural` |

## Retrieval Tool Scope

| Tool | Reads |
|---|---|
| `search_nodes` | FTS5 lexical node content plus structured filters such as node type, file path, canonical entity name, scoped-reference name, and `story_slug`. Default mode is capped and ranked. Use `exhaustive: true` for Rule 6 audit scans that need presence/absence confirmation across prose bodies; exhaustive results are sorted by `node_id` and include `match_locations[]`. When `story_slug` is omitted, search stays in the world-canon / hybrid retrieval scope; supplying `story_slug` limits results to one indexed story bundle. |
| `get_node` | One indexed node plus its structured links, mentions, scoped references, and file metadata. |
| `get_record` | The full parsed record for a structured id such as CF / CH / M / OQ / SEC / PA / DA / CHAR. Story-bundle ids such as PG / SE / SF / OBL / CNSQ / THR / SREL / STINT / STENT / STSTAT / STLOC / STOBJ / BR / CHC / SLT / ARCTRACE / SLB / SAU / SP / RSP require `story_slug` because authored story ids are unique only within `(world_slug, story_slug)`. Use this after context-packet previews before citing record content. Optional `section_path` projects parsed atomic/story records by dotted path, such as `effect_evidence` or `semantic_critic_verdict.status`; for hybrid PA / DA / CHAR records it can project `frontmatter`, `body`, `frontmatter.<key>`, or `body.<section>`. If an unprojected hybrid response would exceed the effective inline ceiling, the bounded response is `delivery_status: "oversize_with_projection_suggestions"` with `persisted_output_path`, `total_chars`, `response_cap_chars`, and `suggested_section_paths`; retry with one of the suggested `section_path` values for structured slice retrieval. When the suggestion list itself must be shortened to keep the recovery response under the cap, `suggested_section_paths_omitted_count` reports how many valid paths were omitted from the inline hint. |
| `get_records` | Multiple full parsed records by structured id in one ordered call. Optional `story_slug` scopes bundle-scoped story ids. Use when a packet, claim map, dossier trace, or audit step already has a known id set and would otherwise issue N independent `get_record` calls. Inline responses carry `delivery_status: "inline"` and preserve request order. If the ordered batch would exceed the effective inline ceiling, the tool persists the full inline-shaped JSON and returns `delivery_status: "persisted_with_summary"` with `persisted_output_path`, per-record summary metadata, and slice hints such as `records[0].record.record`. |
| `get_records_field` | One field from multiple parsed atomic or story-bundle records in one ordered call. Optional `story_slug` scopes bundle-scoped story ids. Use when a packet, claim map, dossier trace, or audit step already has a known id set but only one small field is needed across all records. `field_path` uses the same `(string \| number)[]` segment contract as `get_record_field`; each response entry either carries `field_value` plus provenance or a per-id error without aborting the batch. |
| `get_persisted_packet_slice` | A structured slice from package-persisted JSON emitted by `get_context_packet`, `get_records`, or `describe_envelope_schema` when they return `delivery_status: 'persisted_with_summary'`. Dot paths address object fields, array indexes such as `records[0]`, and node id selection such as `local_authority.nodes[id=entity:donostia]`. |
| `list_records` | Indexed records for one supported atomic, hybrid, or story-bundle record type. Story-bundle record types require `story_slug` and include `story_entity_record`, `story_status_record`, `story_fact_record`, `story_event_record`, `obligation_record`, `consequence_record`, `thread_record`, `relationship_record_story`, `intention_record`, `story_location_record`, `story_object_record`, `branch_record`, `page_record`, `choice_record`, `storylet_record`, `story_diegetic_artifact_record`, `audit_record_story`, `promotion_record`, `storylet_batch_manifest`, and `remediation_storylet_proposal_card`. Optional `filters` narrow rows before projection/full-body wrapping by parsed body field path. Filter values are scalars for exact match or arrays for any-of membership; dotted paths address nested fields, such as `{ move_family: ["investigation", "disclosure"], "scope.visibility": "global_author_pool", "exit_options.action_family": ["investigate", "communicate"] }`. Array-valued record fields match when any record value is present in the filter set. Atomic default/projection mode validates `fields` against top-level parsed-record keys; `record_id` is always included in projected records. Hybrid default/projection mode returns compact metadata (`record_id`, `record_kind`, `title`, `content_hash`, `file_path`) for `character_record`, `diegetic_artifact_record`, and `adjudication_record`; `fields` is validated against those response-shape top-level keys, and unknown entries return `invalid_input` instead of being silently dropped. Hybrid filters can address frontmatter fields directly or through `frontmatter.<key>`. `include_full_body: true` returns `{ record_id, content_hash, file_path, body }` per record and ignores `fields`; hybrid `body` is `{ record_kind, frontmatter, body_sections }`. Use full-body mode for deliberate whole-class sweeps such as every invariant, every Mystery Reserve firewall block, continuity-audit cross-check, or structured hybrid registry enumeration; for large storylet pools or other predictable hard-filter loads, apply `filters` before falling back to persisted-output recovery. |
| `get_record_field` | A single field of a parsed atomic or story-bundle record. Use when the field is small and the record body is large, such as `touched_by_cf` on a large SEC record. Reuses `get_record`'s record-resolution path. |
| `get_record_schema` | JSON Schema for a record node type plus transitively referenced schemas, required fields, and validator-sourced conditional block requirements, including story-bundle schemas such as `belief_record` and `story_status_record`. Use to discover field constraints, regex patterns, enum values, required/optional fields, and CF taxonomy rules such as when `epistemic_profile` or `exception_governance` is required before authoring a record draft. For `canon_fact_record`, the current CF `status` enum is `hard_canon`, `derived_canon`, `soft_canon`, and `contested_canon`; Mystery Reserve entries are separate `M-<integer>` records, not CF status values. |
| `describe_envelope_schema` | JSON Schema for the `validate_patch_plan` / `submit_patch_plan` envelope plus per-op payload wrappers. Use before assembling patch plans so required transport fields such as `approval_token`, `patches[].target_file`, `expected_id_allocations`, and typed payload keys are machine-readable instead of copied from prose. Pass `op_kind` for one operation when possible; unfiltered responses may return `delivery_status: "persisted_with_summary"` with `summary.available_op_kinds` and schema slice hints. |
| `get_neighbors` | Graph edges from the indexed node/record graph. Use for ontology and locality expansion. Story-bundle authored ids require `story_slug`. |
| `get_context_packet` | Ranked packet of Kernel, Invariants, relevant records, neighbors, section context, and story-bundle context for story-pipeline task types. `story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`, `branching_story_health_audit`, and `story_fact_promotion_to_canon` require `story_slug`. For `story_bootstrap`, the slug is the target bundle slug and `story_bundle_context` is `null` because the bundle does not yet exist; for the other story-pipeline task types, `story_bundle_context` is populated from indexed story-bundle records plus `STORY_KERNEL.md` frontmatter. World-canon task types return `story_bundle_context: null`. Body previews are generally truncated and full text requires `get_record`; selected task-critical classes in `local_authority`, `governing_world_context`, and `exact_record_links` may carry additive `full_body`, with delivered classes reported in `task_header.full_body_classes_delivered` and budget downgrades reported in `truncation_summary.full_body_downgrades`. `character_generation`, `diegetic_artifact_generation`, `story_bootstrap`, `story_turn_cycle`, `commitment_block_authoring`, `branching_story_health_audit`, and `story_fact_promotion_to_canon` reserve governing-context invariant and Mystery Reserve full bodies before opportunistic layers; `task_header.governing_full_body_priority` reports that policy, and insufficient budget/ceiling for those required governing bodies returns `packet_incomplete_required_classes` instead of silent downgrades. Task-specific governing nodes may also carry parsed `record` projections, such as `character_generation` invariant records and Mystery Reserve firewall fields. Omitted budgets use per-task defaults (`story_bootstrap`, `story_turn_cycle`, and `commitment_block_authoring` currently 18000; `canon_addition` currently 16000; `propose_new_canon_facts`, `propose_new_characters`, and `emergent_pressure_events` 15000; `propose_new_worlds_from_preferences`, `canon_facts_from_diegetic_artifacts`, and `branching_story_health_audit` 12000; `story_fact_promotion_to_canon` and remaining task types 8000), and incomplete-packet errors include `retry_with.token_budget`. Successful packets expose `task_header.delivery_status`, `task_header.harness_ceiling_chars` (default 60000; server override `WORLDLOOM_MCP_HARNESS_CEILING_CHARS`), `task_header.envelope_overhead_reserve_chars` (default 4000), and `task_header.estimator_version`; inline packet bodies are kept under `harness_ceiling_chars - envelope_overhead_reserve_chars`, and when the fully assembled packet would exceed that effective ceiling, `delivery_status: 'persisted_with_summary'` returns `governing_summary` inline plus `task_header.persisted_output_path` for structured slice recovery. Optional `delivery_mode: 'full' \| 'summary_only'` (default `'full'`) selects per-node payload shape — `summary_only` replaces every node's `body_preview` with a ≤100-char `summary` for "what's relevant" index passes while preserving eligible `full_body` delivery (see `docs/CONTEXT-PACKET-CONTRACT.md` §Fast-Summary Inline Delivery, §Task-Aware Full-Body Delivery, and §Delivery Modes). |
| `find_impacted_fragments` | Records and fragments likely affected by proposed changes to named nodes or CFs. Use before write assembly to catch incomplete downstream-update lists. Story-bundle authored ids require `story_slug`. |
| `find_sections_touched_by` | SEC records whose `touched_by_cf[]` currently cites a candidate CF. Use for modification-history axis-(c) judgments. |
| `find_named_entities` | Canonical entity names, entity aliases, scoped-reference display names, and scoped-reference aliases. This is exact-match resolution, not full-text search. Optional `story_slug` adds `story_local_matches[]` from indexed story-bundle records alongside world-canon matches. Optional `node_type_filter` restricts canonical matches to entities with mention groups in the requested node types. Region descriptors (`drylands`, `canal-heartland`) and era descriptors (`Charter-Era`, `Incident Wave`) that appear only as parts of compound tokens may return empty with `hints[]`; each hint carries `matching_record_ids[]` with up to 10 source record ids for direct `get_record` retrieval. Use `search_nodes(query=...)` when `record_count` exceeds the capped id list or the hint has no usable ids. Pair with `search_nodes(exhaustive: true)` for lexical-only Rule 6 evidence. |
| `get_canonical_vocabulary` | Canonical enum values for skill reasoning before patch-plan submission. Current classes are `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `mystery_reserve_effect`, `revision_difficulty`, and `cf_type`. `mystery_reserve_effect` is sourced from the change-log-entry schema. The `cf_type` response includes conditional-block coupling metadata for `epistemic_profile` and `exception_governance`. |
| `describe_capabilities` | Read-only server introspection. Returns server-start build metadata plus registered tool names and enum-valued input contracts, so skills can compare their assumed `task_type`, `id_class`, or `record_type` values against the deployed MCP server instead of only against source. |

`record_type` and `node_type` are related but not interchangeable vocabulary layers. `list_records.record_type` is the operator-facing retrieval vocabulary. `get_record_schema.node_type` exposes only current validator-backed schema files, including `belief_record` for BEL story records and `story_status_record` for STSTAT story records.

**Recommended composition**: packet first (locality survey via `get_context_packet`), then `get_record` / `get_records` / `get_record_field` / `get_records_field` for full bodies or field projections of load-bearing nodes the packet cites unless a task-specific governing node already carries the required parsed `record` projection. Use `get_persisted_packet_slice` when `get_context_packet`, `get_records`, or `describe_envelope_schema` returns `delivery_status: "persisted_with_summary"`; use `get_records` when the needed ids are already known as a set and full records are needed, and `get_records_field` when the same known set only needs one field. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern.

**Persisted tool results**: `get_context_packet` overflow, unprojected hybrid `get_record` overflow, oversized `get_records`, and oversized `describe_envelope_schema` use the same package-owned results directory. Set `WORLDLOOM_MCP_TOOL_RESULTS_DIR` to override it; otherwise the default is `/tmp/worldloom-mcp-tool-results/`. These persisted JSON files are recovery artifacts for the current local agent session, not canon or durable project outputs.

## Schema Currency Verification

When source adds a new MCP enum value or tool, the running server may still be older than the checkout if `tools/world-mcp/dist/` was not rebuilt or the MCP server/client session was not restarted. Use `mcp__worldloom__describe_capabilities()` to inspect the deployed server's build metadata and enum-valued input contracts. If the deployed contract is stale, run `cd tools/world-mcp && npm run build`, then restart the MCP server/client session so it loads `tools/world-mcp/dist/src/server.js`.

For patch-plan assembly, use `mcp__worldloom__describe_envelope_schema(op_kind?)` to retrieve the current deployed envelope and operation-payload shapes for `validate_patch_plan` and `submit_patch_plan`. This is the machine-readable path for fields that previously lived only in skill prose, such as `patch_plan.approval_token`, `patches[].target_file`, and `payload.cf_record`.

## Trust tiers

Retrieval now distinguishes four trust tiers instead of flattening everything into either canonical entities or lexical hits:

1. **Canonical entity** — world-level ontology or other declared canonical authority.
2. **Exact structured record edge** — deliberate record-to-record linkage already present in structured ids or fields.
3. **Scoped reference** — explicit source-local retrieval anchor declared on an authority-bearing record without promoting it to world-level ontology.
4. **Lexical evidence** — unresolved phrase evidence used for recall and debugging, not authority.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Retrieval tools report missing nodes or persistent `stale_index` | `_index/world.db` is absent, incompatible, or still stale after the retrieval layer's one-shot auto-sync recovery | Run `world-index init <world>` for an empty bootstrap, or `world-index build <world>` / `world-index sync <world>` for populated world state. If a successful retrieval response includes `freshness_audit.pre_call_index_was_stale: true`, auto-sync already recovered the stale index and no manual retry is needed. |
| A record exists under `_source/` or `stories/<story>/_source/` but is missing from retrieval/index queries | The record's extracted id failed the registered schema pattern, so `world-index build` / `sync` skipped it instead of inserting an invalid node | Inspect `worlds/<slug>/_index/world.db.skipped_records.log` for the file path, node type, extracted id, skip reason, and expected pattern. Legacy suffixed STINT ids such as `STINT-1-<char>` are preserved on disk but skipped by the current bare-numeric `STINT-<integer>` index contract. |
| A tool rejects an enum value that exists in source, such as a new `task_type` or `id_class` | The running MCP server is older than the source checkout, or `tools/world-mcp/dist/` was not rebuilt after the source change | Run `mcp__worldloom__describe_capabilities()` to inspect the deployed enum contract. If it is stale, run `cd tools/world-mcp && npm run build`, then restart the MCP server/client session so it loads `tools/world-mcp/dist/src/server.js`. This is the schema currency verification path introduced after the MCPENH-005 / ENGINESYNC-002 friction case. |
| A tool's pre-apply validators reject a patch plan with verdicts inconsistent with the just-rebuilt validators source | The running MCP server still holds the pre-rebuild `@worldloom/validators` compiled bundle in memory. `describe_capabilities()` cannot detect this because the validators bundle version is not part of the world-mcp tool or enum contract surface. | Principled fix: run `cd tools/validators && npm run build`, then restart the MCP server/client session so the world-mcp process re-imports the rebuilt validators bundle. Temporary workaround when session restart is not immediately available: invoke the pre-apply validators through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` and the patch engine through `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>`. Both CLI scripts spawn fresh Node processes that load the just-rebuilt validators bundle, bypassing the running server's startup-time cache. The CLI paths are functionally equivalent to the MCP tools: same engine wiring, same `PatchReceipt` output, same failure-mode codes. |
| A skill still wants giant raw reads | Retrieval integration is incomplete for that skill or phase | Use the current skill contract, but treat the context-packet path as the target state |
| Direct Edit/Write is blocked on protected paths | Hook 3 sees an engine-only surface | Route the change through a patch plan instead of direct file editing |
| Validation fails after a write | Rule or structural invariant violation | Fix the underlying world state and rerun validation; do not bypass the validator surface |

The `tools/world-mcp/dist/src/cli/` scripts serve two distinct escape-valve purposes: transport-size escape for patch-plan envelopes that exceed the MCP transport's practical threshold, and fresh-process escape for cases where the running MCP server holds stale dependency code in memory and a full session restart is not immediately available. Operators should default to the principled fix, which is rebuild plus session restart, and reserve the CLI workaround for the in-session mid-flow case. This applies to `validate-patch-plan.js`, `submit-patch-plan.js`, `sign-approval-token.js`, and the `compute-pg-hashes.js` helper introduced by MCPENH-045.

## Where Details Live

- `docs/FOUNDATIONS.md` — authoritative contract
- [docs/CONTEXT-PACKET-CONTRACT.md](/home/joeloverbeck/projects/worldloom/docs/CONTEXT-PACKET-CONTRACT.md) — formal packet shape
- `tools/README.md` — package map
- `tools/world-index/README.md` — index CLI and artifact contract
- `tools/world-mcp/README.md` — retrieval tool inventory and approval-token notes
- `tools/patch-engine/README.md` — op vocabulary, atomicity, write order
- `tools/validators/README.md` — validator inventory and CLI
- `tools/hooks/README.md` — hook inventory and rollout phases

## Rollback Posture

The machine-facing layer is deliberately degradable:

- Removing `_index/` only removes the derived index; human-facing world files remain authoritative.
- If hooks are not configured, Claude continues to run; enforcement falls back to skill and operator discipline.
- If the patch engine is not yet live for a workflow, the existing skill-side write path remains the current behavior.

That degradation path is a migration feature, not a license to bypass the machine-facing contract once a world or workflow has been moved onto it.
