# world-mcp

MCP retrieval server exposing the world index (`tools/world-index/`) as a structured API. Skills consume `mcp__worldloom__*` tools instead of reading raw markdown.

**Design**: `archive/specs/SPEC-02-retrieval-mcp-server.md`
**Phase**: 2 (read side plus SPEC-03 patch-engine delegation)
**Status**: Stdio MCP entrypoint registers 13 tools in `src/server.ts`; `validate_patch_plan` delegates to `@worldloom/validators`; `submit_patch_plan` delegates to `@worldloom/patch-engine`

## Tools

- `mcp__worldloom__search_nodes(query, filters)`
- `mcp__worldloom__get_node(node_id)`
- `mcp__worldloom__get_record(record_id)`
- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`
- `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`
- `mcp__worldloom__find_impacted_fragments(node_ids)`
- `mcp__worldloom__find_sections_touched_by(cf_id)`
- `mcp__worldloom__find_named_entities(names)`
- `mcp__worldloom__find_edit_anchors(targets)`
- `mcp__worldloom__get_canonical_vocabulary(class)` *(returns shared canonical enum values for `domain`, `verdict`, `mystery_status`, and `mystery_resolution_safety`)*
- `mcp__worldloom__validate_patch_plan(patch_plan)` *(runs `@worldloom/validators` in pre-apply mode and returns `{ verdicts }`)*
- `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)` *(delegates to SPEC-03 `@worldloom/patch-engine`)*
- `mcp__worldloom__allocate_next_id(world_slug, id_class)`

## Retrieval policy

Exact id > exact canonical entity > exact structured record edge > exact scoped reference > weighted lexical. Lexical-only candidates can still be nudged by locality bonuses (authority-bearing node types plus `references_record` / `references_scoped_name` edges), but those bonuses never outrank a higher trust-tier band. Per-task-type ranking profiles live in `src/ranking/profiles/`.

## Approval token

HMAC-signed; single-use; 5-minute expiry. Secret at `tools/world-mcp/.secret` (gitignored).

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
