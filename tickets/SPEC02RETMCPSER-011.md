# SPEC02RETMCPSER-011: MCP server entry + tool registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/world-mcp/src/server.ts` wiring all 10 `mcp__worldloom__*` tools into the `@modelcontextprotocol/sdk` framework.
**Deps**: SPEC02RETMCPSER-005, SPEC02RETMCPSER-006, SPEC02RETMCPSER-007, SPEC02RETMCPSER-008, SPEC02RETMCPSER-009, SPEC02RETMCPSER-010

## Problem

Tickets -005 through -010 land every `mcp__worldloom__*` tool's implementation, but none of them are reachable by Claude Code until an `@modelcontextprotocol/sdk` server wraps them in the MCP protocol (tool registration, stdio transport, schema declarations for each tool's inputs). This ticket is the **transitive-head** — every prior implementation ticket funnels through `src/server.ts`, and every later ticket (-012) depends on the composed server actually running end-to-end.

## Assumption Reassessment (2026-04-23)

1. Every upstream tool is implemented and compiles independently:
   - `src/tools/search-nodes.ts`, `src/tools/get-node.ts`, `src/tools/get-neighbors.ts` (from -005)
   - `src/tools/find-impacted-fragments.ts`, `src/tools/find-named-entities.ts`, `src/tools/find-edit-anchors.ts` (from -006)
   - `src/tools/get-context-packet.ts` (from -007)
   - `src/tools/allocate-next-id.ts` (from -008)
   - `src/approval/token.ts` (from -009)
   - `src/tools/validate-patch-plan.ts`, `src/tools/submit-patch-plan.ts` (from -010)
   - `tools/world-mcp/package.json` declares `@modelcontextprotocol/sdk ^1.x` (from -001).
2. `specs/SPEC-02-retrieval-mcp-server.md` §Package location line 32 names `src/server.ts` as the entry point; §`.mcp.json` (example) (lines 283–292) shows the `node tools/world-mcp/dist/server.js` command shape.
3. Cross-artifact boundary under audit: the MCP protocol contract (tool schemas, request/response envelopes, stdio transport). Each registered tool must declare its input schema (JSON Schema style) so the MCP client can validate before dispatching. Drift between the TypeScript function signature and the registered JSON schema is the failure mode.

## Architecture Check

1. A single `server.ts` that registers all 10 tools is cleaner than a multi-entry-point server because every tool shares the same DB-access and error-taxonomy surface; separating servers would mean duplicating the lifecycle checks.
2. Tool registration uses the SDK's declarative tool-registry API (`server.setRequestHandler` or equivalent) — cleaner than hand-rolling request dispatch.
3. No backwards-compatibility shims.

## Verification Layers

1. All 10 tools registered → unit test launches the server in-process and calls `listTools`; asserts exactly 10 tools returned with the expected names (`mcp__worldloom__search_nodes`, ..., `mcp__worldloom__allocate_next_id`).
2. Each tool's input schema matches its TypeScript signature → unit test per tool: call with a well-formed input, get a non-error response; call with missing required field, get an MCP-protocol-level validation error (not a tool-level error).
3. Stdio transport round-trip → integration test spawns the server as a child process and sends a `search_nodes` request over stdio; asserts response is valid MCP-protocol JSON.
4. Phase 1 stub routing → integration test dispatches `submit_patch_plan`; asserts the response carries `{code: 'phase1_stub'}` (routed through -010's stub).

## What to Change

### 1. `tools/world-mcp/src/server.ts`

1. Import the SDK's `Server` class (or the equivalent from `@modelcontextprotocol/sdk`; check the package's actual API at implementation time since the SDK is pinned at `^1.x`).
2. Construct a new server with metadata `{name: 'worldloom', version: '0.1.0'}` from `package.json`.
3. Register all 10 tools using `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)` (or the SDK's preferred registration API).
4. Each tool registration includes:
   - Name: `mcp__worldloom__<tool_name>` (e.g., `mcp__worldloom__search_nodes`)
   - Description: short, taken from spec §Tool surface prose
   - Input schema: JSON Schema matching the tool's TypeScript argument type
   - Handler: calls the imported tool implementation; wraps `McpError` returns into MCP-protocol error responses
5. Transport: stdio (`new StdioServerTransport()`). No HTTP/WebSocket in Phase 1.
6. `server.connect(transport)` + graceful shutdown on `SIGINT` / `SIGTERM`.

### 2. Tool-name constants

A single `src/tool-names.ts` exports all 10 tool names as typed constants so registration and tests agree.

### 3. Input-schema JSON generation

Each tool's input schema is hand-authored as a JSON Schema object in `src/server.ts` (or extracted to `src/schemas/*.json` if the list grows). TypeScript-to-JSON-Schema generators are out of scope for Phase 1; manual schemas are acceptable and small.

### 4. Tests

- `tests/server/list-tools.test.ts`
- `tests/server/dispatch.test.ts`
- `tests/integration/server-stdio.test.ts`

## Files to Touch

- `tools/world-mcp/src/server.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (new)
- `tools/world-mcp/tests/integration/server-stdio.test.ts` (new)

## Out of Scope

- HTTP / WebSocket transports — stdio only in Phase 1.
- Tool-level authentication (beyond approval_token for submit_patch_plan) — relies on Claude Code's local-only trust model per spec §Out of Scope line 331.
- Live tool addition/removal — tool set is static per server start.
- Auto-generated JSON schemas from TypeScript types — manual schemas are fine for 10 tools.
- Actual Claude Code integration testing — the spec-integration capstone (-012) handles end-to-end.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` — all server and integration tests pass.
2. `list_tools` returns exactly 10 tools with the names documented in spec §Tool surface.
3. Dispatch test: calling each tool with well-formed input produces a well-formed response (success shape or documented error shape).
4. Stdio integration test: server runs as child process; at least one round-trip request-response succeeds.

### Invariants

1. Tool count is exactly 10; adding or removing a tool is a spec-level concern, not a server-side change.
2. Every tool registered declares an input schema; tools without schemas are rejected at server startup (fail fast).
3. The server's `name` field matches `worldloom` — `.mcp.json.example` in -001 hardcodes this name; drift would break user setups.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/list-tools.test.ts` — tool-inventory assertion.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — per-tool dispatch happy + error path.
3. `tools/world-mcp/tests/integration/server-stdio.test.ts` — child-process + stdio round-trip.

### Commands

1. `cd tools/world-mcp && npm run build && node --test dist/tests/server/*.test.js dist/tests/integration/server-stdio.test.js`
2. Tool-count grep-proof: `grep -oE "mcp__worldloom__[a-z_]+" tools/world-mcp/src/server.ts | sort -u | wc -l` returns 10.
3. End-to-end smoke: `cd tools/world-mcp && node dist/src/server.js < <(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}')` returns a response with 10 tools. (Path is `dist/src/server.js`, not `dist/server.js` — the tsconfig layout compiles `src/server.ts` → `dist/src/server.js` per SPEC02RETMCPSER-001's COMPLETED correction.)
