# SPEC02RETMCPSER-011: MCP server entry + tool registration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — replaces the scaffold `tools/world-mcp/src/server.ts` with the live MCP server, adds typed tool-name constants and server-facing tests, truths `tools/world-mcp/README.md`, and enables package-local SDK test imports via `tools/world-mcp/tsconfig.json`.
**Deps**: SPEC02RETMCPSER-005, SPEC02RETMCPSER-006, SPEC02RETMCPSER-007, SPEC02RETMCPSER-008, SPEC02RETMCPSER-009, SPEC02RETMCPSER-010

## Problem

Tickets -005 through -010 land every `mcp__worldloom__*` tool's implementation, but none of them are reachable by Claude Code until an `@modelcontextprotocol/sdk` server wraps them in the MCP protocol (tool registration, stdio transport, schema declarations for each tool's inputs). This ticket is the **transitive-head** — every prior implementation ticket funnels through `src/server.ts`, and every later ticket (-012) depends on the composed server actually running end-to-end.

## Assumption Reassessment (2026-04-24)

1. Every upstream tool is implemented and compiles independently:
   - `src/tools/search-nodes.ts`, `src/tools/get-node.ts`, `src/tools/get-neighbors.ts` (from -005)
   - `src/tools/find-impacted-fragments.ts`, `src/tools/find-named-entities.ts`, `src/tools/find-edit-anchors.ts` (from -006)
   - `src/tools/get-context-packet.ts` (from -007)
   - `src/tools/allocate-next-id.ts` (from -008)
   - `src/approval/token.ts` (from -009)
   - `src/tools/validate-patch-plan.ts`, `src/tools/submit-patch-plan.ts` (from -010)
   - `tools/world-mcp/package.json` declares `@modelcontextprotocol/sdk ^1.x` (from -001).
2. `specs/SPEC-02-retrieval-mcp-server.md` §Package location still names `src/server.ts` as the entry point, but the live file at `tools/world-mcp/src/server.ts` is only the scaffold placeholder from SPEC02RETMCPSER-001. The real delta is replacing that placeholder with the MCP server implementation, not creating a missing file.
3. Cross-artifact boundary under audit: the MCP protocol contract (tool schemas, request/response envelopes, stdio transport). Drift between each TypeScript tool signature and the registered MCP input schema is the primary failure mode.
4. `tools/world-mcp/README.md` still says "Phase 1 scaffold landed; tool implementations land in subsequent tickets" even though the tool modules now exist. README truthing is same-seam consequence fallout for this ticket.
5. The SDK's stdio client transport is not a truthful acceptance surface in this environment: the SDK's own bundled stdio example closes or hangs before a client round-trip here. The honest boundary for this ticket is MCP request/response proof over the in-process client/server seam plus a real child-process stdio lifecycle smoke for the built entrypoint.

## Architecture Check

1. A single `server.ts` that registers all 10 tools is cleaner than a multi-entry-point server because every tool shares the same DB-access and error-taxonomy surface; separating servers would mean duplicating the lifecycle checks.
2. Tool registration uses the SDK's high-level declarative tool-registry API (`McpServer.registerTool`) plus a single wrapper that normalizes success/error payloads — cleaner than hand-rolling request dispatch per tool.
3. No backwards-compatibility shims.

## Verification Layers

1. All 10 tools registered → unit test launches the server in-process and calls `listTools`; asserts exactly 10 tools returned with the expected names (`mcp__worldloom__search_nodes`, ..., `mcp__worldloom__allocate_next_id`).
2. Each tool's input schema matches its TypeScript signature → unit test per tool: call with a well-formed input, get a non-error response; call with missing required field, get an MCP-protocol-level validation error (not a tool-level error).
3. Stdio entrypoint lifecycle → integration test spawns the built server as a child process over stdio, asserts it stays alive without stderr crash output, then terminates cleanly on signal.
4. Phase 1 stub routing → dispatch test calls `submit_patch_plan`; asserts the response carries `{code: 'phase1_stub'}` (routed through -010's stub).

## What to Change

### 1. `tools/world-mcp/src/server.ts`

1. Replace the scaffold placeholder with the live MCP server entrypoint using the SDK's current high-level server API.
2. Construct a new server with metadata `{name: 'worldloom', version: '0.1.0'}` from `package.json`.
3. Register all 10 tools using the SDK's preferred tool-registration API with explicit input schemas and stdio transport.
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

### 5. Package docs

- Update `tools/world-mcp/README.md` so package status and configuration text match the live server surface instead of the earlier scaffold-only state.

### 6. Package compile gate

- Update `tools/world-mcp/tsconfig.json` so the package's existing `npm test` lane remains truthful when server tests import SDK client types.

## Files to Touch

- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tool-names.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (new)
- `tools/world-mcp/tests/integration/server-stdio.test.ts` (new)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/tsconfig.json` (modify)

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
4. Stdio integration test: server runs as a child process over stdio, stays alive without startup stderr noise, and shuts down cleanly on signal.

### Invariants

1. Tool count is exactly 10; adding or removing a tool is a spec-level concern, not a server-side change.
2. Every tool registered declares an input schema; tools without schemas are rejected at server startup (fail fast).
3. The server's `name` field matches `worldloom` — `.mcp.json.example` in -001 hardcodes this name; drift would break user setups.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/server/list-tools.test.ts` — tool-inventory assertion.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — per-tool dispatch happy + error path.
3. `tools/world-mcp/tests/integration/server-stdio.test.ts` — child-process stdio lifecycle smoke for the built entrypoint.

### Commands

1. `cd tools/world-mcp && npm test`
2. Tool-count proof: `cd tools/world-mcp && node -e "const { getRegisteredToolNames } = require('./dist/src/server.js'); console.log(getRegisteredToolNames().length)"` returns `10`.
3. Narrower proof boundary note: MCP request/response proof runs through the in-process client/server tests because the SDK stdio client transport is not a truthful acceptance surface in this environment; stdio proof is the child-process lifecycle smoke above.

## Outcome

Completion date: 2026-04-24

Implemented the real MCP server entrypoint in `tools/world-mcp/src/server.ts` using `McpServer.registerTool`, hand-authored input schemas, typed tool-name constants, and a shared wrapper that turns structured `McpError` values into MCP tool-error payloads while preserving successful structured responses.

Added server-facing tests for tool inventory, dispatch, and protocol-level argument validation, plus a child-process stdio lifecycle smoke for the built entrypoint. Also truthed `tools/world-mcp/README.md` to the live server surface and added `skipLibCheck` in `tools/world-mcp/tsconfig.json` so the package's test lane can import the SDK's client typings without failing on upstream declaration noise.

## Verification Result

1. `cd tools/world-mcp && npm test`
   Result: pass (`68` tests, `0` failures).

## Deviations

The original drafted stdio round-trip acceptance lane was not truthful in this environment: the SDK's own bundled stdio example did not provide a stable client round-trip here. The landed proof keeps MCP request/response verification on the in-process client/server seam and narrows stdio verification to a real child-process lifecycle smoke for `dist/src/server.js`.
