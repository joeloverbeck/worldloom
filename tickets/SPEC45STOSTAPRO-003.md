# SPEC45STOSTAPRO-003: get_story_state_provenance MCP tool

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new MCP tool `mcp__worldloom__get_story_state_provenance` at `tools/world-mcp/src/tools/get-story-state-provenance.ts`; new entry in `tools/world-mcp/src/tool-names.ts` `MCP_TOOL_NAMES` and `MCP_TOOL_ORDER`; new `registerToolWithCapability` call in `tools/world-mcp/src/server.ts`; new tool tests.
**Deps**: SPEC45STOSTAPRO-002

## Problem

Per SPEC-45 §Approach Phase 2, the world-mcp package needs a new retrieval tool that exposes the story-state provenance edges added by SPEC45STOSTAPRO-002 in a form the Tier 1 consumer (story-fact-promotion-to-canon Phase 1, wired by SPEC45STOSTAPRO-004) can call as a single MCP request instead of scanning SE YAML files via filesystem-walk. The tool takes a record id + story slug and returns the record's creating SE id, the list of SE ids that superseded the record, and the list of evidence records cited in the record's intro-tag introduction.

## Assumption Reassessment (2026-05-18)

1. `tools/world-mcp/src/server.ts:297-358` registers tools via `server.registerTool(...)` and `registerToolWithCapability(...)` calls with the pattern `(name, description, handler)`. `tools/world-mcp/src/tool-names.ts` exports `MCP_TOOL_NAMES` (const object mapping short keys to fully-qualified `mcp__worldloom__*` names) and `MCP_TOOL_ORDER` (array preserving registration order). Existing story-bundle-scoped tools (`get_record`, `get_records`, `list_records`) accept an optional `story_slug` parameter for story-bundle id resolution per the convention named at `get_record.ts:34, 231-236`. `tools/world-mcp/src/tools/describe-capabilities.ts` exposes a `describeCapabilities` function that takes a `tools: readonly ToolCapability[]` array — the tool inventory is built from the registration list, not enumerated manually in `describe-capabilities.ts`. Verified via Read. **Mechanical-drift note**: SPEC-45 §Deliverables D8 names `tools/world-mcp/src/tools/_shared.ts (or registry equivalent)` as the registration target; `_shared.ts` is helpers (`SearchNodeFilters`, ranking imports, etc.), NOT a tool registry. The correct registration targets are `server.ts` (for the `registerToolWithCapability` call) and `tool-names.ts` (for `MCP_TOOL_NAMES` + `MCP_TOOL_ORDER` entries).
2. SPEC-45 §Approach Phase 2 D7 specifies the new MCP tool at `tools/world-mcp/src/tools/get-story-state-provenance.ts` with the return shape `{ record_id, record_class, creating_se_id, modifying_se_ids, evidence_records }`; D8 specifies registration; D9 specifies optional update to `describe-capabilities.ts` (likely a no-op since the inventory is derived from registration); D10 specifies tool tests at `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts`. Tool-tests directory exists; tool path is new.
3. Cross-skill / cross-package boundary under audit: this tool reads edges produced by world-index (SPEC45STOSTAPRO-002); it is consumed by `.claude/skills/story-fact-promotion-to-canon/SKILL.md` Phase 1 (wired by SPEC45STOSTAPRO-004). The edge-type string contract (`state_delta_create`, `state_delta_supersede`, `creation_evidence`) must match exactly between SPEC45STOSTAPRO-002's emitter and this ticket's consumer SQL queries.
4. FOUNDATIONS principle under audit: §Tooling Recommendation (the new MCP tool extends the existing `mcp__worldloom__*` surface following established conventions — `story_slug` parameter, JSON return shape, story-bundle id resolution) AND §Story Bundles §6b (Observer Firewall) — the tool exposes creation provenance and supersession lineage, neither of which is viewer-restricted information. Firewall-sensitive edges (`affordance_available_to` and related) were deliberately excluded from SPEC-45's edge set per §Out of Scope, so this tool's surface is firewall-safe by construction.

## Architecture Check

1. **Tool follows existing MCP tool conventions**: the implementation matches `tools/world-mcp/src/tools/get-record.ts`'s shape (typed args, `McpError` for failures, story-bundle id resolution requiring `story_slug` for bundle-scoped ids). No new conventions introduced; new tool plugs into existing registration / capability-description infrastructure.
2. **No backwards-compatibility shims introduced**: the tool is purely additive — no existing tool's signature or behavior changes. Pre-spec callers see no impact; post-spec callers can opt in by invoking the new tool.

## Verification Layers

1. **Tool registered correctly** → codebase grep-proof: `grep -n "get_story_state_provenance" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` returns matches in both files at the expected positions (alphabetical / order-preserving placement matching existing convention).
2. **Tool returns correct shape on happy path** → schema validation: tool test asserts `{ record_id, record_class, creating_se_id, modifying_se_ids, evidence_records }` exact field set, correct types per field.
3. **Tool handles null creating_se_id correctly** → schema validation: legacy record with no `state_delta_create` in-edge returns `creating_se_id: null` (not undefined, not omitted).
4. **`describe_capabilities` reflects the new tool** → schema validation: `mcp__worldloom__describe_capabilities` call response includes a `tools` array entry with `name: "mcp__worldloom__get_story_state_provenance"`.

## What to Change

### 1. Implement get_story_state_provenance tool

Create `tools/world-mcp/src/tools/get-story-state-provenance.ts` exporting the tool's argument-validation, handler, and capability-description shapes per existing tool conventions. The handler:

1. Validates `record_id` (string matching the story-bundle id-pattern `^[A-Z]+-(0|[1-9][0-9]*)$`) and `story_slug` (string).
2. Resolves the record's class from the id prefix (e.g., `CLK-1` → `CLK`).
3. Queries the edges table for the three edge types and returns the assembled response:

   ```typescript
   {
     record_id: string;
     record_class: string;
     creating_se_id: string | null;
     modifying_se_ids: string[];
     evidence_records: string[];
   }
   ```

4. Returns appropriate `McpError` instances on validation failures or unknown record id.

SQL queries (3 total):

- `SELECT src FROM edges WHERE tgt = ? AND edge_type = 'state_delta_create'` → `creating_se_id` (expect 0 or 1 row; if 0, return `null`).
- `SELECT src FROM edges WHERE tgt = ? AND edge_type = 'state_delta_supersede'` → `modifying_se_ids[]`.
- `SELECT tgt FROM edges WHERE src = ? AND edge_type = 'creation_evidence'` → `evidence_records[]`.

### 2. Register the new tool

In `tools/world-mcp/src/tool-names.ts`, add a new entry to `MCP_TOOL_NAMES`:

```typescript
get_story_state_provenance: "mcp__worldloom__get_story_state_provenance",
```

Add the entry to `MCP_TOOL_ORDER` at an appropriate position (likely near other `get_*` tools — operator judgment).

In `tools/world-mcp/src/server.ts`, add a `registerToolWithCapability(...)` call matching the existing convention. Tool description text should describe the tool's purpose, the `record_id` + `story_slug` arguments, and the return shape's fields concisely (parallel to `get_record`'s description style at line 348).

### 3. Update describe-capabilities (if needed)

`tools/world-mcp/src/tools/describe-capabilities.ts` builds the capabilities list from the registered tools (per the `tools: readonly ToolCapability[]` interface). No manual enumeration update should be required — verify post-implementation that the new tool appears in `describe_capabilities` output.

### 4. Tool tests

Create `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts` covering:

- Happy path: record with creating_se + 2 modifying_se ids + 3 evidence records returns the correct response shape with exact ids.
- Null creating_se_id: legacy record (not created by any indexed SE) returns `creating_se_id: null, modifying_se_ids: [], evidence_records: []`.
- Non-empty modifying_se_ids: record superseded by 2 newer revisions returns 2-element `modifying_se_ids` array.
- Non-empty evidence_records: record with intro tag citing 3 evidence ids returns 3-element `evidence_records` array.
- Unknown record id: tool returns `McpError` per existing tool conventions.
- Missing story_slug: tool returns `McpError` (story-bundle id resolution requires `story_slug`).

Use the existing `tools/world-mcp/tests/tools/` test harness setup (in-memory or fixture SQLite).

## Files to Touch

- `tools/world-mcp/src/tools/get-story-state-provenance.ts` (new) — tool implementation.
- `tools/world-mcp/src/tool-names.ts` (modify) — add `get_story_state_provenance` entry to `MCP_TOOL_NAMES` and `MCP_TOOL_ORDER`.
- `tools/world-mcp/src/server.ts` (modify) — add `registerToolWithCapability(...)` call with description and handler wiring.
- `tools/world-mcp/src/tools/describe-capabilities.ts` (modify — only if manual enumeration is required; default expectation is automatic via registration).
- `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts` (new) — tool tests.

## Out of Scope

- `get_record_lineage` MCP helper — SPEC-45 §Out of Scope (deferred to follow-up).
- `get_active_story_state` MCP helper — SPEC-45 §Out of Scope (deferred to follow-up).
- `recent_structured_introductions` context-packet surface — SPEC-45 §Out of Scope.
- Batch form of the tool (list of record_ids) — SPEC-45 §Risks names single-id form for this iteration; batch form may be added later without breaking compatibility.
- Consumer skill update — SPEC45STOSTAPRO-004.

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build --prefix tools/world-mcp` passes after the new tool registration and implementation.
2. New tool tests pass: `npm test --prefix tools/world-mcp` (running the new `get-story-state-provenance.test.ts` plus existing tool tests for regression).
3. `mcp__worldloom__describe_capabilities` call response includes the new tool in its `tools` array.

### Invariants

1. The tool's return shape matches the SPEC-45 contract: `{ record_id, record_class, creating_se_id, modifying_se_ids, evidence_records }` exactly — no extra fields, no missing fields, correct types.
2. `creating_se_id` is `null` (not omitted, not undefined) when no `state_delta_create` in-edge exists for the record.
3. `modifying_se_ids` and `evidence_records` are arrays (possibly empty); never `null` and never omitted.
4. The tool requires `story_slug` for story-bundle id resolution per existing `get_record` / `get_records` / `list_records` convention.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-story-state-provenance.test.ts` (new) — covers happy path, null creating_se_id, non-empty modifying/evidence, error cases (unknown id, missing story_slug).

### Commands

1. `npm run build --prefix tools/world-mcp` — type-checking + compilation.
2. `npm test --prefix tools/world-mcp` — full world-mcp test suite.
3. Manual `describe_capabilities` query against a running server instance (or test-harness equivalent) confirms the new tool appears in the inventory.
