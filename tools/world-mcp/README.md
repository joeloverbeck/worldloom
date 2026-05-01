# world-mcp

MCP retrieval server exposing the world index (`tools/world-index/`) as a structured API. Skills consume `mcp__worldloom__*` tools instead of reading raw markdown.

**Design**: `archive/specs/SPEC-02-retrieval-mcp-server.md`
**Phase**: 2 (read side plus SPEC-03 patch-engine delegation)
**Status**: Stdio MCP entrypoint registers 21 tools in `src/server.ts`; `validate_patch_plan` delegates to `@worldloom/validators` and returns an explicit validation status; `submit_patch_plan` delegates to `@worldloom/patch-engine`; `describe_capabilities` exposes server-start build metadata plus the deployed tool/enum contract for schema-currency checks; `get_record_schema` exposes authored-record JSON schemas plus validator-sourced conditional block requirements; `describe_envelope_schema` exposes the patch-plan envelope and per-op payload schema contract for envelope assembly.

Explicit-world retrieval calls auto-sync and retry once when `openIndexDb()` detects `stale_index`. Recovered responses include `freshness_audit.pre_call_index_was_stale: true`; persistent staleness still returns `stale_index` with recovery details. Patch-plan submit-time `index_stale` remains a separate fail-closed engine result.

## Tools

- `mcp__worldloom__search_nodes(query, filters, exhaustive?)` — searches FTS5 lexical node content. Default mode preserves capped, ranked retrieval. Use `exhaustive: true` for Rule 6 presence/absence scans across prose bodies; exhaustive mode returns every match sorted by `node_id` and adds `match_locations: ('body' | 'heading_path' | 'summary')[]` per row.
- `mcp__worldloom__get_node(node_id)`
- `mcp__worldloom__get_record(record_id)`
- `mcp__worldloom__get_records(record_ids, world_slug?)` — retrieves multiple structured records in one ordered response. Each entry is `{ record_id, found: true, record, content_hash, file_path }` where `record` is the same successful response shape as `get_record`, or `{ record_id, found: false, error }` for a missing/invalid id. Use when a packet, claim map, audit window, or dossier trace already produced a known id set and whole-class `list_records` would be too broad.
- `mcp__worldloom__get_persisted_packet_slice(persisted_path, slice_path)` — retrieves a structured slice from a full packet persisted by `get_context_packet` when `task_header.delivery_status === 'persisted_with_summary'`. `slice_path` is a dot path such as `governing_world_context.nodes` and supports id selection such as `local_authority.nodes[id=entity:donostia]`.
- `mcp__worldloom__list_records(world_slug, record_type, fields?, include_full_body?)` — returns every parsed atomic record for one supported record type. Default/projection mode preserves the existing top-level parsed-record shape and optional field projection; `record_id` is always included in projected records. Set `include_full_body: true` for full-body mode, which ignores `fields` and returns `{ record_id, content_hash, file_path, body }` per record, matching `get_record` metadata at whole-class scale. Use full-body mode for deliberate bulk sweeps such as EPE Phase 6 invariant / Mystery Reserve firewall checks and continuity-audit cross-checks.
- `mcp__worldloom__get_record_field(record_id, field_path, world_slug?)` — returns a single field from a parsed record without loading the full body. `field_path` is `(string | number)[]`: numeric segments index arrays, string segments address object keys. Examples: `get_record_field("SEC-ELF-001", ["touched_by_cf"])` for a CF list, or `get_record_field("CF-0042", ["extensions", 0, "body"])` for one extension body.
- `mcp__worldloom__get_record_schema(node_type)` — returns the JSON Schema for a record class plus `node_type`, `source_path`, `referenced_schemas` keyed by `$id` URL, `required_fields`, and `conditional_blocks` for validator rules that are not expressible in the schema itself. Supported `node_type` values: `canon_fact_record`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, `adjudication_record`, `extension_entry`. For `canon_fact_record`, `conditional_blocks` reports the `epistemic_profile` and `exception_governance` type taxonomies enforced by `record_schema_compliance`.
- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`
- `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget, delivery_mode?)` — assembles the ranked retrieval packet. When `token_budget` is omitted, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` uses `canon_addition: 16000`, `propose_new_canon_facts: 15000`, `propose_new_characters: 15000`, `emergent_pressure_events: 15000`, `propose_new_worlds_from_preferences: 12000`, `canon_facts_from_diegetic_artifacts: 12000`, and `8000` for remaining task types. Packet fitting also enforces the configured serialized-response ceiling (`task_header.harness_ceiling_chars`, default `80000`, override with `WORLDLOOM_MCP_HARNESS_CEILING_CHARS`) so successful inline responses stay below the MCP harness limit. If the fully assembled packet would exceed that ceiling, the server writes the full packet under its tool-results directory (`WORLDLOOM_MCP_TOOL_RESULTS_DIR` override) and returns `task_header.delivery_status: 'persisted_with_summary'` plus `governing_summary` inline. `packet_incomplete_required_classes` errors include `retry_with: { token_budget }` for a single explicit retry with the computed minimum. Optional `delivery_mode: 'full' | 'summary_only'` (default `'full'`) selects per-node payload shape — `summary_only` omits `body_preview` and emits a ≤100-char `summary` field per node, useful when only a "what's relevant" index is needed. Task-critical classes may additionally carry `full_body` in `local_authority`, `governing_world_context`, or `exact_record_links`; `task_header.full_body_classes_delivered` reports which live node classes were delivered, and `truncation_summary.full_body_downgrades` reports budget downgrades. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern, §Fast-Summary Inline Delivery, §Task-Aware Full-Body Delivery, and §Delivery Modes for the documented retrieval pattern that complements packet assembly.
- `mcp__worldloom__find_impacted_fragments(node_ids)`
- `mcp__worldloom__find_sections_touched_by(cf_id)`
- `mcp__worldloom__find_named_entities(names)` — searches the entity registry's `canonical_name`, `entity_aliases.alias_text`, `scoped_references.display_name`, and `scoped_reference_aliases.alias_text` surfaces against the world index. It does not perform a lexical scan over prose body content such as section bodies, diegetic-artifact bodies, character dossiers, or adjudication prose. For Rule 6 pre-figuring scans where a string may exist only in prose, pair this with `mcp__worldloom__search_nodes(query, exhaustive: true)` to cover the FTS5 lexical layer exhaustively. Region/era descriptors and compound tokens that do not match an indexed entity exactly may return optional `hints[]` entries pointing to `search_nodes(...)` for content lookup. Returns `canonical_matches[]`, `scoped_matches[]`, `surface_matches[]`, and optional `hints[]`.
- `mcp__worldloom__find_edit_anchors(targets)`
- `mcp__worldloom__get_canonical_vocabulary(class)` *(returns shared canonical enum values for `domain`, `verdict`, `mystery_status`, `mystery_resolution_safety`, `invariant_category`, `entity_kind`, `sec_file_class`, `change_type`, `revision_difficulty`, and `cf_type`; `cf_type` includes conditional-block coupling metadata for `epistemic_profile` and `exception_governance`)*
- `mcp__worldloom__validate_patch_plan(patch_plan)` *(runs `@worldloom/validators` in pre-apply mode and returns `{ status: "pass" | "fail" | "skipped", verdicts, reason?, details? }`; malformed envelopes with multiple shape errors include `details.additional_errors[]`)*
- `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)` *(delegates to SPEC-03 `@worldloom/patch-engine`)*
- `mcp__worldloom__allocate_next_id(world_slug, id_class)` — allocates append-only world-scoped IDs. Most world-scoped classes allocate from the world's index; `EPE` scans `worlds/<slug>/pressure-events/EPE-*.md` directly because pressure-event cards are hybrid, pre-canon files. Pipeline-scoped proposal IDs use `world_slug: "__pipeline__"` with `id_class: "NWB"` for `world-proposals/batches/NWB-*.md` and `id_class: "NWP"` for `world-proposals/NWP-*.md`.
- `mcp__worldloom__describe_capabilities()` — returns the running server's `build_info` (`git_commit_hash`, server-start `build_timestamp`, `source_schema_hash`) plus registered tool names, descriptions, and enum-valued input contracts such as `get_context_packet.task_type`, `allocate_next_id.id_class`, and `list_records.record_type`. Use this when a skill or ticket needs to verify the deployed MCP server accepts a newly added enum value after source changes.
- `mcp__worldloom__describe_envelope_schema(op_kind?)` — returns the patch-plan envelope JSON Schema plus per-operation payload schemas for `validate_patch_plan` / `submit_patch_plan`. Pass an `op_kind` such as `create_cf_record` to limit the response to one operation; omit it to retrieve every current patch operation. The response cites the source contract paths and includes referenced record schemas for payload keys such as `cf_record`, `adjudication_frontmatter`, `char_record`, and `da_record`.

## Retrieval policy

Exact id > exact canonical entity > exact structured record edge > exact scoped reference > weighted lexical. Lexical-only candidates can still be nudged by locality bonuses (authority-bearing node types plus `references_record` / `references_scoped_name` edges), but those bonuses never outrank a higher trust-tier band. Per-task-type ranking profiles live in `src/ranking/profiles/`.

## Approval token

HMAC-signed; single-use; default 20-minute expiry (configurable). Secret at `tools/world-mcp/.secret` (gitignored, generated on first signer invocation if absent).

Skills issue tokens via the canonical CLI:

```bash
node dist/src/cli/sign-approval-token.js <plan-path> [--expiry-minutes <n>]
```

The CLI reads a JSON patch-plan envelope, computes `canonicalOpHash` for every `patches[]` entry, and emits the base64 token to stdout. The token binds `plan_id + world_slug + patch_hashes + issued_at + expires_at`. See `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token for the full skill-side flow.

`--expiry-minutes` defaults to 20, accommodating the 50KB+ envelopes typical of full canon-addition submissions; the engine's verifier only checks `expires_at <= now` and accepts longer windows. Override via flag or `WORLD_MCP_TOKEN_EXPIRY_MIN` env var.

## Patch-plan CLIs

Large patch-plan envelopes can bypass MCP transport while still using the same handler code as the MCP tools:

```bash
node dist/src/cli/validate-patch-plan.js <plan-path>
node dist/src/cli/submit-patch-plan.js <plan-path> <token-path>
```

`validate-patch-plan` prints the same status object as `mcp__worldloom__validate_patch_plan`: `pass` exits 0 on stdout; `fail` and `skipped` exit 1 on stderr. When a malformed envelope has multiple shape errors, `skipped.details.field` names the first offending path and `skipped.details.additional_errors[]` lists the remaining invalid-input errors. `submit-patch-plan` prints the same `PatchReceipt` / error family as `mcp__worldloom__submit_patch_plan`; it requires a signed approval token file.

## Configuration

Registered via `.mcp.json`. See `archive/specs/SPEC-02-retrieval-mcp-server.md` §`.mcp.json` (example).

The built stdio entrypoint is `dist/src/server.js`, so a local MCP config uses:

```json
{
  "mcpServers": {
    "worldloom": {
      "command": "node",
      "args": ["tools/world-mcp/dist/src/server.js"],
      "env": {}
    }
  }
}
```
