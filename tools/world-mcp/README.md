# world-mcp

MCP retrieval server exposing the world index (`tools/world-index/`) as a structured API. Skills consume `mcp__worldloom__*` tools instead of reading raw markdown.

**Design**: `archive/specs/SPEC-02-retrieval-mcp-server.md`
**Phase**: 2 (read side plus SPEC-03 patch-engine delegation)
**Status**: Stdio MCP entrypoint registers 16 tools in `src/server.ts`; `validate_patch_plan` delegates to `@worldloom/validators` and returns an explicit validation status; `submit_patch_plan` delegates to `@worldloom/patch-engine`

## Tools

- `mcp__worldloom__search_nodes(query, filters, exhaustive?)` — searches FTS5 lexical node content. Default mode preserves capped, ranked retrieval. Use `exhaustive: true` for Rule 6 presence/absence scans across prose bodies; exhaustive mode returns every match sorted by `node_id` and adds `match_locations: ('body' | 'heading_path' | 'summary')[]` per row.
- `mcp__worldloom__get_node(node_id)`
- `mcp__worldloom__get_record(record_id)`
- `mcp__worldloom__list_records(world_slug, record_type, fields?)` — returns every parsed atomic record for one supported record type, with optional top-level field projection. `record_id` is always included in projected records. Use for bulk sweeps such as every invariant or every Mystery Reserve firewall block.
- `mcp__worldloom__get_record_field(record_id, field_path, world_slug?)` — returns a single field from a parsed record without loading the full body. `field_path` is `(string | number)[]`: numeric segments index arrays, string segments address object keys. Examples: `get_record_field("SEC-ELF-001", ["touched_by_cf"])` for a CF list, or `get_record_field("CF-0042", ["extensions", 0, "body"])` for one extension body.
- `mcp__worldloom__get_record_schema(node_type)` — returns the JSON Schema for a record class plus `source_path` and `referenced_schemas`, a map of transitively referenced schemas keyed by `$id` URL. Supported `node_type` values: `canon_fact_record`, `change_log_entry`, `invariant`, `mystery_reserve_entry`, `open_question_entry`, `named_entity`, `section`, `character_record`, `diegetic_artifact_record`, `adjudication_record`.
- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`
- `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget, delivery_mode?)` — assembles the ranked retrieval packet. When `token_budget` is omitted, `DEFAULT_TOKEN_BUDGET_BY_TASK_TYPE` uses `canon_addition: 16000`, `propose_new_canon_facts: 15000`, `propose_new_characters: 15000`, `propose_new_worlds_from_preferences: 12000`, `canon_facts_from_diegetic_artifacts: 12000`, and `8000` for remaining task types. `packet_incomplete_required_classes` errors include `retry_with: { token_budget }` for a single explicit retry with the computed minimum. Optional `delivery_mode: 'full' | 'summary_only'` (default `'full'`) selects per-node payload shape — `summary_only` omits `body_preview` and emits a ≤100-char `summary` field per node, useful when only a "what's relevant" index is needed. See `docs/CONTEXT-PACKET-CONTRACT.md` §Index + Follow-Up Retrieval Pattern and §Delivery Modes for the documented retrieval pattern that complements packet assembly.
- `mcp__worldloom__find_impacted_fragments(node_ids)`
- `mcp__worldloom__find_sections_touched_by(cf_id)`
- `mcp__worldloom__find_named_entities(names)` — searches the entity registry's `canonical_name`, `entity_aliases.alias_text`, `scoped_references.display_name`, and `scoped_reference_aliases.alias_text` surfaces against the world index. It does not perform a lexical scan over prose body content such as section bodies, diegetic-artifact bodies, character dossiers, or adjudication prose. For Rule 6 pre-figuring scans where a string may exist only in prose, pair this with `mcp__worldloom__search_nodes(query, exhaustive: true)` to cover the FTS5 lexical layer exhaustively. Region/era descriptors and compound tokens that do not match an indexed entity exactly may return optional `hints[]` entries pointing to `search_nodes(...)` for content lookup. Returns `canonical_matches[]`, `scoped_matches[]`, `surface_matches[]`, and optional `hints[]`.
- `mcp__worldloom__find_edit_anchors(targets)`
- `mcp__worldloom__get_canonical_vocabulary(class)` *(returns shared canonical enum values for `domain`, `verdict`, `mystery_status`, and `mystery_resolution_safety`)*
- `mcp__worldloom__validate_patch_plan(patch_plan)` *(runs `@worldloom/validators` in pre-apply mode and returns `{ status: "pass" | "fail" | "skipped", verdicts, reason? }`)*
- `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)` *(delegates to SPEC-03 `@worldloom/patch-engine`)*
- `mcp__worldloom__allocate_next_id(world_slug, id_class)` — allocates append-only world-scoped IDs from a world's index. Pipeline-scoped proposal IDs use `world_slug: "__pipeline__"` with `id_class: "NWB"` for `world-proposals/batches/NWB-*.md` and `id_class: "NWP"` for `world-proposals/NWP-*.md`.

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
