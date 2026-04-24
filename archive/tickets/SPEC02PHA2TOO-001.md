# SPEC02PHA2TOO-001: `get_record` MCP tool — typed parsed-YAML retrieval across all atomic record classes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/get-record.ts` (new); extends `tools/world-mcp/src/tool-names.ts` (adds `get_record` to `MCP_TOOL_NAMES` + `MCP_TOOL_ORDER`); extends `tools/world-mcp/src/server.ts` (registers the tool + Zod input schema); extends the MCP error taxonomy with additive `record_not_found`; adds the direct `yaml` package dependency needed by `@worldloom/world-mcp`.
**Deps**: None

## Problem

SPEC-02-PHASE2 §Deliverable 1 commits `mcp__worldloom__get_record(record_id)` — a tool that returns the **parsed YAML record** (field-structured object typed per the record's class) plus `content_hash` and `file_path` for any atomic record (CF / CH / INV / M / OQ / ENT / SEC). Today the retrieval server exposes `get_node` (returning a `NodeDetail` whose `body` is the raw YAML source string) and `get_context_packet` (returning a bounded multi-record packet), but no tool returns a single record's structured, parsed form. Callers composing patch plans, asserting on structural fields, or extracting typed field values currently must either use `get_node` and re-parse the body string themselves, or use `get_context_packet` with a single seed (wasteful). `get_record` is the record-centric typed view that replaces both workarounds.

Consumers named in the spec: SPEC-03 ticket SPEC03PATENG-009 (integration capstone's post-apply sync assertion — calls `get_record(<new-cf-id>)` and verifies the returned record matches the written atomic YAML). Also referenced by `docs/FOUNDATIONS.md:454` §Canonical Storage Layer as the authoritative read path: "Skills read atomic records via `mcp__worldloom__get_record(record_id)` or `get_context_packet`."

## Assumption Reassessment (2026-04-25)

1. Classification: `tool or script implementation` with a same-package shared-contract addition. The ticket changes `tools/world-mcp` code, tests, registration, README/tool inventory, and the package manifest/lockfile because the new implementation imports a YAML parser directly.
2. `tools/world-mcp/src/tools/get-node.ts:79-284` implements `getNode(args)` returning `NodeDetail` with `body: string` at line 56 (and the raw YAML source is stored at `tools/world-index/src/parse/atomic.ts:131` as `body: source`). `get_record` is distinct from `get_node` — it returns a parsed structured object, not a body string. Confirmed via the reassessment pre-apply verification table (M1 row: `get_record` vs `get_node` clarification).
3. `tools/world-mcp/src/tool-names.ts:1-28` defines `MCP_TOOL_NAMES` (10 entries) and `MCP_TOOL_ORDER` (10 entries). `tools/world-mcp/src/server.ts:162-240` registers all 10 tools via `registerWrappedTool`. Adding `get_record` extends both the names registry and the registration block. Per SPEC-02-PHASE2 §Approach "Tool registration order": `get_record` registers after `get_node` (ID-addressed retrieval group).
4. FOUNDATIONS principle under audit: §Tooling Recommendation — "LLM agents should never operate on prose alone." Returning parsed YAML rather than a raw body string preserves this contract; callers receive structured records they can assert on without prose-level parsing. Dropping back to `get_node.body.toString()` would be the anti-pattern.
5. Shared boundary: `tools/world-index`'s public schema types (`CanonFactRecord`, `ChangeLogEntry`, `InvariantRecord`, `MysteryRecord`, `OpenQuestionRecord`, `NamedEntityRecord`, `SectionRecord`) defined at `tools/world-index/src/schema/types.ts:125-272` — `get_record` returns a discriminated union over these types keyed by `node_type`. Existing re-export path: `@worldloom/world-index/public/types` (used by `get-node.ts:1`). Reassessment correction: the live exported type is `MysteryRecord`, not `MysteryReserveEntry`.
6. Extension shape: `get_record` is a net-new tool. No existing output schema is modified; the new tool returns typed records whose shape is already defined in `tools/world-index/src/schema/types.ts`. Extension is additive-only (new tool, no existing consumer impact).
7. Error-taxonomy mismatch: SPEC-02-PHASE2 and this ticket require `record_not_found`, but `tools/world-mcp/src/errors.ts` and `tools/world-mcp/tests/errors.test.ts` currently know only `node_not_found`. Adding `record_not_found` is required same-seam fallout so `get_record` can distinguish "valid atomic record id absent" from graph-node lookup errors without changing existing tools.
8. Package dependency mismatch: `tools/world-index` depends on `yaml`, but `@worldloom/world-mcp` does not declare `yaml` directly in `tools/world-mcp/package.json`; TypeScript/runtime resolution for a direct `import YAML from "yaml"` must be owned by the consuming package. The package-lock already contains `yaml@2.8.3` via the sibling package, so adding it as a direct dependency preserves parser-version parity without introducing a new external package version.

## Architecture Check

1. Separating parsed-record retrieval (`get_record`) from graph-neighbor-aware retrieval (`get_node`) keeps each tool's return type tight. A callers of `get_record` wants the record's fields; a caller of `get_node` wants the graph context (edges, mentions, scoped references). Overloading one tool with both contracts would inflate the response shape and push parsing cost onto every caller.
2. The tool is a read-side passthrough: open world-index DB handle → SELECT node row by `node_id` → parse `body` as YAML via direct `yaml@2.8.3`, matching `@worldloom/world-index`'s parser dependency. The manifest update is package-contract fallout, not a parser substitution.
3. No backwards-compatibility aliasing/shims introduced. `get_node` remains as the generic node-graph retrieval; `get_record` is a new peer, not a replacement.

## Verification Layers

1. Tool registers in MCP_TOOL_NAMES / MCP_TOOL_ORDER → codebase grep-proof (`grep -n "get_record" tools/world-mcp/src/tool-names.ts` returns ≥2 matches: one in `MCP_TOOL_NAMES`, one in `MCP_TOOL_ORDER`).
2. Tool registers with MCP server → codebase grep-proof (`grep -n "get_record" tools/world-mcp/src/server.ts` returns ≥2 matches: registration key + tool description).
3. Parsed-record return shape correct per record class → unit test with fixture atomic records for each class (CF / CH / INV / M / OQ / ENT / SEC), asserting the returned object's type discriminant and field values match the YAML source.
4. Unknown / malformed `record_id` → unit test: `McpError` with code `record_not_found` (no matching node) or `invalid_input` (ID doesn't match any known pattern).
5. Additive shared error code remains registered → unit test updates `MCP_ERROR_CODES` to include `record_not_found`.

## What to Change

### 1. Create `tools/world-mcp/src/tools/get-record.ts` (new)

Export:

```typescript
import type {
  CanonFactRecord,
  ChangeLogEntry,
  InvariantRecord,
  MysteryRecord,
  OpenQuestionEntry,
  NamedEntityRecord,
  SectionRecord
} from "@worldloom/world-index/public/types";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

export interface GetRecordArgs {
  record_id: string;
  world_slug?: string;
}

export type ParsedRecord =
  | ({ record_kind: "canon_fact" } & CanonFactRecord)
  | ({ record_kind: "change_log" } & ChangeLogEntry)
  | ({ record_kind: "invariant" } & InvariantRecord)
  | ({ record_kind: "mystery_reserve" } & MysteryRecord)
  | ({ record_kind: "open_question" } & OpenQuestionEntry)
  | ({ record_kind: "named_entity" } & NamedEntityRecord)
  | ({ record_kind: "section" } & SectionRecord);

export interface GetRecordResponse {
  record: ParsedRecord;
  content_hash: string;
  file_path: string;
}

export async function getRecord(args: GetRecordArgs): Promise<GetRecordResponse | McpError>;
```

Implementation:
- Validate `record_id` matches `/^(CF|CH|M|OQ|ENT)-\d+$/` OR `/^(ONT|CAU|DIS|SOC|AES)-\d+$/` OR `/^SEC-(ELF|INS|MTS|GEO|ECR|PAS|TML)-\d+$/`. Mismatch → `createMcpError("invalid_input", ..., { field: "record_id" })`.
- Open world index DB (reusing `openIndexDb` from `../db`).
- SELECT `node_id`, `node_type`, `file_path`, `body`, `content_hash` FROM `nodes` WHERE `node_id = ?`. No match → `createMcpError("record_not_found", ...)`.
- Parse `body` as YAML via the `yaml` package (`YAML.parse`, imported from the shared dependency).
- Map `node_type` → `record_kind` discriminant (`canon_fact_record` → `canon_fact`, `section` → `section`, etc.).
- Return `{record: {record_kind, ...parsedFields}, content_hash, file_path}`.

### 2. Register in `tools/world-mcp/src/tool-names.ts` (modify)

Insert `get_record: "mcp__worldloom__get_record"` in `MCP_TOOL_NAMES` immediately after `get_node`. Insert `MCP_TOOL_NAMES.get_record` in `MCP_TOOL_ORDER` immediately after `MCP_TOOL_NAMES.get_node`.

### 3. Register in `tools/world-mcp/src/server.ts` (modify)

Add import `import { getRecord } from "./tools/get-record";` in the existing import block.

Add the Zod input schema near `getNodeInputSchema`:

```typescript
const getRecordInputSchema = z.object({
  record_id: z.string().min(1),
  world_slug: z.string().min(1).optional()
});
```

Add `registerWrappedTool` call inside `createServer()` immediately after the `get_node` registration block:

```typescript
registerWrappedTool(
  server,
  "get_record",
  "get_record: Fetch an atomic record's parsed YAML content with content_hash and file_path.",
  getRecordInputSchema,
  async (args) => getRecord(args as unknown as Parameters<typeof getRecord>[0])
);
```

### 4. Extend same-package contract surfaces

- Add `record_not_found` to `tools/world-mcp/src/errors.ts` and update `tools/world-mcp/tests/errors.test.ts`.
- Add `yaml@2.8.3` as a direct dependency in `tools/world-mcp/package.json` / `package-lock.json`.
- Update `tools/world-mcp/README.md` tool inventory and status count to include `get_record`.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — add registry entries)
- `tools/world-mcp/src/server.ts` (modify — add import, Zod schema, registration call)
- `tools/world-mcp/src/errors.ts` (modify — additive `record_not_found`)
- `tools/world-mcp/tests/tools/get-record.test.ts` (new)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — 11 registered tools)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — dispatch and validation coverage for `get_record`)
- `tools/world-mcp/tests/errors.test.ts` (modify — additive error code)
- `tools/world-mcp/package.json` / `tools/world-mcp/package-lock.json` (modify — direct `yaml@2.8.3`)
- `tools/world-mcp/README.md` (modify — tool inventory/status)

## Out of Scope

- Performance tuning for very large records (animalia-sized records parse in <10ms; optimization deferred).
- Graph-neighbor context on the return value — that's `get_node`'s job. `get_record` intentionally returns structure only.
- Structured-link or scoped-reference resolution on the returned record — use `get_node` for those.
- Write-side semantics — this is a read-only tool.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` exits 0 with `dist/src/tools/get-record.js` present.
2. `grep -c "get_record" tools/world-mcp/src/tool-names.ts` returns ≥2 (one in `MCP_TOOL_NAMES`, one in `MCP_TOOL_ORDER`).
3. `grep -c "get_record" tools/world-mcp/src/server.ts` returns ≥2 (registration key + tool description).
4. Unit test on the package's temp seeded fixture world: `getRecord({ record_id: "CF-0001", world_slug: "seeded" })` returns `{record: {record_kind: "canon_fact", id: "CF-0001", title: ..., statement: ..., ...}, content_hash: "...", file_path: "_source/canon/CF-0001.yaml"}`. Record shape field-matches `tools/world-index/src/schema/types.ts:CanonFactRecord`.
5. Unit test per atomic record class: `getRecord` returns correctly-typed `ParsedRecord` for a CH, INV (all 5 sub-classes), M, OQ, ENT, SEC (all 7 sub-classes).
6. `getRecord({ record_id: "INVALID-FORMAT" })` returns `McpError` with code `invalid_input`.
7. `getRecord({ record_id: "CF-9999" })` against a fixture world where `CF-9999` doesn't exist returns `McpError` with code `record_not_found`.
8. MCP server list/dispatch tests include `mcp__worldloom__get_record`.

### Invariants

1. Return shape for a given record class is deterministic — `record_kind` discriminant + the record-class fields from `tools/world-index/src/schema/types.ts`. No conditional field drops.
2. `content_hash` and `file_path` are taken directly from the world index's `nodes` table — no re-derivation, no normalization.
3. YAML parsing uses the same `yaml` package version as `tools/world-index/src/parse/atomic.ts:3` to prevent parser-version drift between write-side and read-side.
4. `get_node` is unchanged; this ticket does not touch `tools/world-mcp/src/tools/get-node.ts`.
5. `yaml` parser version matches `@worldloom/world-index` (`2.8.3`) and is declared directly by `@worldloom/world-mcp`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.test.ts` (new) — fixture-based unit suite covering all 7 atomic record classes + invalid-input + record-not-found error cases. Rationale: `get_record` is new; the suite anchors type-discriminant correctness and the two structured error paths.
2. `tools/world-mcp/tests/server/list-tools.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (modified) — server-level registration, dispatch, and input-validation coverage for the new MCP tool.
3. `tools/world-mcp/tests/errors.test.ts` (modified) — additive error taxonomy coverage for `record_not_found`.

### Commands

1. `cd tools/world-mcp && npm run build` (targeted — type-check via tsc; no separate typecheck script exists per `tools/world-mcp/package.json:7-9`).
2. `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js dist/tests/errors.test.js dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js` (targeted compiled package suite for the new tool, error taxonomy, list-tools registration, and dispatch/validation paths).
3. `grep -n "get_record" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` — expect ≥4 total matches confirming registration.

## Outcome

Completed: 2026-04-25.

Implemented `mcp__worldloom__get_record(record_id, world_slug?)` as a read-only parsed-YAML atomic-record retrieval tool. The tool validates supported atomic record IDs, resolves explicit or scanned indexed worlds, reads the `nodes` table, parses the stored YAML body with `yaml@2.8.3`, and returns `{record, content_hash, file_path}` with a `record_kind` discriminant for CF / CH / INV / M / OQ / ENT / SEC records.

The MCP server now registers `get_record` immediately after `get_node`, `MCP_TOOL_ORDER` exposes the same insertion point, and `tools/world-mcp/README.md` documents the 11-tool inventory. The same-package error taxonomy now includes additive `record_not_found`, and `@worldloom/world-mcp` declares `yaml@2.8.3` directly so the parser import is package-owned.

## Verification Result

Passed:

1. `cd tools/world-mcp && npm install` — lockfile refreshed; output reported 38 packages looking for funding and 0 vulnerabilities.
2. `cd tools/world-mcp && npm run build` — exits 0 and emits `dist/src/tools/get-record.js`.
3. `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js` — exits 0.
4. `cd tools/world-mcp && node --test dist/tests/tools/get-record.test.js dist/tests/errors.test.js dist/tests/server/list-tools.test.js dist/tests/server/dispatch.test.js` — exits 0.
5. `grep -c "get_record" tools/world-mcp/src/tool-names.ts` — returns `2`.
6. `grep -c "get_record" tools/world-mcp/src/server.ts` — returns `2`.
7. `ls tools/world-mcp/dist/src/tools/get-record.js tools/world-mcp/dist/tests/tools/get-record.test.js` — both emitted files are present.

Attempted broader package lane:

1. `cd tools/world-mcp && npm run test` — build succeeds and 104 tests pass, but the existing aggregate lane fails in `dist/tests/integration/spec12-live-corpus.test.js` with live animalia `stale_index`/SPEC-12 assertions. The failing test exercises `findNamedEntities`, `getNeighbors`, and `getContextPacket` against a copied live corpus and does not call `get_record`; the owned `get_record` seam and impacted registration/error tests are green.

## Deviations

- Reassessment corrected the drafted `MysteryReserveEntry` type name to the live exported `MysteryRecord`.
- Reassessment added same-seam package fallout: direct `yaml@2.8.3` dependency, `record_not_found` in the MCP error taxonomy, server list/dispatch tests, and README tool inventory truthing.
- Acceptance narrowed from `npm run test` as a must-pass gate to the targeted compiled proof listed above because the current aggregate package lane is red for unrelated live-corpus SPEC-12 drift.
