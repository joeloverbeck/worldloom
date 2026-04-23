# world-mcp

MCP retrieval server exposing the world index (`tools/world-index/`) as a structured API. Skills consume `mcp__worldloom__*` tools instead of reading raw markdown.

**Design**: `archive/specs/SPEC-02-retrieval-mcp-server.md`
**Phase**: 1 (read side; `submit_patch_plan` stubbed until Phase 2)
**Status**: Phase 1 read-side server landed; stdio MCP entrypoint registers all 10 tools in `src/server.ts`

## Tools

- `mcp__worldloom__search_nodes(query, filters)`
- `mcp__worldloom__get_node(node_id)`
- `mcp__worldloom__get_neighbors(node_id, edge_types, depth)`
- `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`
- `mcp__worldloom__find_impacted_fragments(node_ids)`
- `mcp__worldloom__find_named_entities(names)`
- `mcp__worldloom__find_edit_anchors(targets)`
- `mcp__worldloom__validate_patch_plan(patch_plan)` *(Phase 1: returns `validator_unavailable` until SPEC-04 lands)*
- `mcp__worldloom__submit_patch_plan(patch_plan, approval_token)` *(Phase 1: returns `phase1_stub` until SPEC-03 lands)*
- `mcp__worldloom__allocate_next_id(world_slug, id_class)`

## Retrieval policy

Exact id > exact entity > heading-path > backlink expansion > FTS5 lexical > semantic (future fallback). Per-task-type ranking profiles in `src/ranking/profiles/`.

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
