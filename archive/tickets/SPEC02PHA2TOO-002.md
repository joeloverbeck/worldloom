# SPEC02PHA2TOO-002: `find_sections_touched_by` MCP tool — reverse CF→SEC lookup

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — introduces `tools/world-mcp/src/tools/find-sections-touched-by.ts` (new); extends `tools/world-mcp/src/tool-names.ts` (adds `find_sections_touched_by` to `MCP_TOOL_NAMES` + `MCP_TOOL_ORDER`); extends `tools/world-mcp/src/server.ts` (registers the tool + Zod input schema); adds focused tests and updates the package README tool inventory. No impact on existing tools.
**Deps**: None

## Problem

SPEC-02-PHASE2 §Deliverable 2 commits `mcp__worldloom__find_sections_touched_by(cf_id)` — a reverse-index lookup returning every SEC record whose `touched_by_cf[]` array contains the given CF ID OR whose `extensions[].originating_cf` matches. At intake, the world-mcp surface had no inverse of `touched_by_cf[]`: a caller given a CF could only find the SECs it touched by either loading every SEC and filtering, or reading the CF's `required_world_updates` (which is a file-class hint, not a per-SEC mapping). Both workarounds were brittle.

Consumers named in the spec: SPEC-04 `touched_by_cf_completeness` validator (defined at `specs/SPEC-04-validator-framework.md:89`) — verifies for each CF that `required_world_updates` ↔ SEC `touched_by_cf[]` and `extensions[].originating_cf` agree in both directions. SPEC-03 ticket SPEC03PATENG-009 integration capstone also exercises this tool in its post-apply sync assertion.

## Assumption Reassessment (2026-04-25)

1. SEC records at `worlds/animalia/_source/<file-class>/SEC-*.yaml` carry a `touched_by_cf` array field (confirmed at `worlds/animalia/_source/geography/SEC-GEO-001.yaml:14-36`). The world-index parser reads this field at `tools/world-index/src/parse/atomic.ts:288` (`stringArrayField(record, "touched_by_cf")`) and represents it on `SectionRecord` at `tools/world-index/src/schema/types.ts:269` as `touched_by_cf: string[]`.
2. `ExtensionEntry.originating_cf` is the attribution field that `touched_by_cf_completeness` uses for its "OR in an extensions[].originating_cf" clause (per `specs/SPEC-04-validator-framework.md:89`). The field is parsed at `tools/world-index/src/parse/atomic.ts:275` and is represented on the record types at `tools/world-index/src/schema/types.ts:125, 199, 257`.
3. Shared boundary: the reverse-lookup contract. The tool must return BOTH `touched_by_cf` matches AND `extensions[].originating_cf` matches in a single response so the validator (and downstream SPEC-03 assertions) can verify completeness without making two calls. The response shape distinguishes the two sources via `match_type: 'touched_by_cf' | 'extension'`.
4. FOUNDATIONS principle under audit: Rule 6 (No Silent Retcons). `find_sections_touched_by` exposes the CF↔SEC structural mapping that makes Rule 6 machine-queryable. A CF that was used to justify a SEC edit must leave a discoverable trail; this tool is the query surface for that trail. Weakening the tool (e.g., returning only `touched_by_cf` hits without `extensions[].originating_cf` hits) would leave extension-attributed changes invisible to the validator — a silent-retcon opening.
5. Package-local closeout check found `tools/world-mcp/README.md` still reported 11 registered tools and omitted `find_sections_touched_by`; that README is a same-package user-facing contract and was updated with the 12-tool inventory.

## Architecture Check

1. A dedicated reverse-lookup tool is cleaner than forcing callers to iterate `find_impacted_fragments` or to load every SEC record and filter client-side. The query is structural — reverse index against two fields — and SQLite can execute it in a single `SELECT` over the existing `nodes` table joined with `_source`-parsed fields.
2. Returning a tagged-union `match_type` discriminant per result keeps the two match sources (array membership vs extension attribution) distinguishable downstream. Collapsing into a single `sec_ids[]` would lose the information the validator needs to flag an attribution mismatch vs a `touched_by_cf[]` gap.
3. No backwards-compatibility aliasing/shims introduced. The tool is net-new; `find_impacted_fragments` remains as the broader impact-analysis surface and is not affected.

## Verification Layers

1. Tool registers in MCP_TOOL_NAMES / MCP_TOOL_ORDER → codebase grep-proof (`grep -n "find_sections_touched_by" tools/world-mcp/src/tool-names.ts` returns ≥2 matches).
2. Tool registers with MCP server → codebase grep-proof (`grep -n "find_sections_touched_by" tools/world-mcp/src/server.ts` returns ≥2 matches).
3. Live package proof uses the existing `tools/world-mcp/tests/tools/_shared.ts` temp-index harness, not a checked-in animalia fixture copy. `touched_by_cf[]` match returns correct SEC set → unit test: temp seeded world with CF-X listed in SEC-GEO-001.touched_by_cf; tool returns SEC-GEO-001 with `match_type: 'touched_by_cf'`.
4. `extensions[].originating_cf` match returns correct SEC set → unit test: temp seeded world with SEC-INS-005 carrying `extensions: [{originating_cf: CF-Y, ...}]`; tool called with CF-Y returns SEC-INS-005 with `match_type: 'extension'`.
5. Empty result for unreferenced CF → unit test: `findSectionsTouchedBy({ cf_id: "CF-9999" })` against a temp seeded world where CF-9999 has no touches returns `{sections: [], total_count: 0}` — not an error, per SPEC-02-PHASE2 §Deliverable 2 contract.
6. Rule 6 alignment check → FOUNDATIONS alignment check: `docs/FOUNDATIONS.md` §Rule 6 + the CF↔SEC mapping described by SPEC-04 `touched_by_cf_completeness` both remain discoverable through this tool after the ticket lands.

## What to Change

### 1. Create `tools/world-mcp/src/tools/find-sections-touched-by.ts` (new)

Export:

```typescript
import YAML from "yaml";

import { openIndexDb } from "../db";
import { createMcpError, type McpError } from "../errors";

export interface FindSectionsTouchedByArgs {
  cf_id: string;
  world_slug: string;
}

export interface SectionMatch {
  sec_id: string;
  file_path: string;
  match_type: "touched_by_cf" | "extension";
}

export interface FindSectionsTouchedByResponse {
  sections: SectionMatch[];
  total_count: number;
}

export async function findSectionsTouchedBy(
  args: FindSectionsTouchedByArgs
): Promise<FindSectionsTouchedByResponse | McpError>;
```

Implementation:
- Validate `cf_id` matches `/^CF-\d{4}$/`. Mismatch → `createMcpError("invalid_input", ..., { field: "cf_id" })`.
- Open world-index DB.
- Query SEC nodes whose body references the CF, then re-parse the YAML to classify each hit as `touched_by_cf` match or `extension` match. Concretely: `SELECT node_id, file_path, body FROM nodes WHERE world_slug = ? AND node_type = 'section' AND body LIKE '%' || ? || '%'`, then for each candidate parse `body` as YAML and check `parsed.touched_by_cf?.includes(cf_id)` → `match_type: 'touched_by_cf'`; check `parsed.extensions?.some(e => e.originating_cf === cf_id)` → `match_type: 'extension'`. A SEC matching both is returned twice (once per match type) so the validator sees both signals; the caller can de-duplicate if it only cares about any-match.
- Return `{sections: [...], total_count: sections.length}`.

### 2. Register in `tools/world-mcp/src/tool-names.ts` (modify)

Insert `find_sections_touched_by: "mcp__worldloom__find_sections_touched_by"` in `MCP_TOOL_NAMES` immediately after `find_impacted_fragments`. Insert `MCP_TOOL_NAMES.find_sections_touched_by` in `MCP_TOOL_ORDER` immediately after `MCP_TOOL_NAMES.find_impacted_fragments`.

### 3. Register in `tools/world-mcp/src/server.ts` (modify)

Add import `import { findSectionsTouchedBy } from "./tools/find-sections-touched-by";`.

Add the Zod input schema near `findImpactedFragmentsInputSchema`:

```typescript
const findSectionsTouchedByInputSchema = z.object({
  cf_id: z.string().regex(/^CF-\d{4}$/),
  world_slug: z.string().min(1)
});
```

Add `registerWrappedTool` call inside `createServer()` immediately after the `find_impacted_fragments` registration block:

```typescript
registerWrappedTool(
  server,
  "find_sections_touched_by",
  "mcp__worldloom__find_sections_touched_by: Reverse-index CF to SEC lookup across touched_by_cf and extension attribution.",
  findSectionsTouchedByInputSchema,
  async (args) => findSectionsTouchedBy(args as unknown as Parameters<typeof findSectionsTouchedBy>[0])
);
```

## Files to Touch

- `tools/world-mcp/src/tools/find-sections-touched-by.ts` (new)
- `tools/world-mcp/src/tool-names.ts` (modify — add registry entries)
- `tools/world-mcp/src/server.ts` (modify — add import, Zod schema, registration call)
- `tools/world-mcp/tests/tools/find-sections-touched-by.test.ts` (new — reverse lookup contract tests)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — registered tool count)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — dispatch coverage)
- `tools/world-mcp/README.md` (modify — same-package tool inventory)

## Out of Scope

- Caching the reverse index server-side — each call re-queries SQLite. Performance tuning deferred to a follow-up if animalia-scale worlds show slowness.
- Forward lookup (SEC → CFs) — that's already available via `getRecord(sec_id).touched_by_cf` and via `get_node`'s edges.
- Merging `match_type` values when a SEC matches both ways — the caller's job (de-dupe by `sec_id`).
- Cross-world queries — `world_slug` is required.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build` exits 0 with `dist/src/tools/find-sections-touched-by.js` present.
2. `grep -c "find_sections_touched_by" tools/world-mcp/src/tool-names.ts` returns ≥2.
3. `grep -c "find_sections_touched_by" tools/world-mcp/src/server.ts` returns ≥2.
4. Unit test: temp seeded world with CF-0001 listed in `SEC-GEO-001.touched_by_cf[]`; `findSectionsTouchedBy({ cf_id: "CF-0001", world_slug: "seeded" })` returns a response whose `sections[]` contains `{sec_id: "SEC-GEO-001", file_path: "_source/geography/SEC-GEO-001.yaml", match_type: "touched_by_cf"}`.
5. Unit test: temp seeded world where SEC-INS-005 has `extensions: [{originating_cf: "CF-0002", ...}]`; tool called with `cf_id: "CF-0002"` returns the SEC with `match_type: "extension"`.
6. Unit test: `findSectionsTouchedBy({ cf_id: "CF-9999" })` against a temp seeded world with no CF-9999 references returns `{sections: [], total_count: 0}` — NOT an error.
7. Unit test: `findSectionsTouchedBy({ cf_id: "NOT-A-CF" })` returns `McpError` with code `invalid_input`.

### Invariants

1. Result shape includes `match_type` discriminant for every SEC — never a bare `sec_id`. The validator downstream (SPEC-04 `touched_by_cf_completeness`) depends on this distinction.
2. Empty result set is not an error — `total_count: 0` is a valid response.
3. A SEC that matches both via `touched_by_cf[]` AND via `extensions[].originating_cf` is returned twice (once per match type) — downstream de-duplication is the caller's responsibility.
4. No existing tool is modified beyond registry additions — `find_impacted_fragments`, `get_node`, etc., unchanged.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/find-sections-touched-by.test.ts` (new) — temp-index harness suite covering `touched_by_cf` match, `extensions[].originating_cf` match, both-match double-return, empty result, and `invalid_input` error. Rationale: the tool is net-new; the suite anchors the reverse-index contract the SPEC-04 validator and SPEC-03 capstone depend on without depending on live-world generated state.

### Commands

1. `cd tools/world-mcp && npm run build` (targeted — tsc compile).
2. `cd tools/world-mcp && npm run test` (full package suite — ensures existing tool tests still pass alongside the new find-sections-touched-by tests).
3. `grep -n "find_sections_touched_by" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` — expect ≥4 total matches confirming registration.

## Outcome

Implemented `mcp__worldloom__find_sections_touched_by` as a read-only reverse CF→SEC lookup over indexed section YAML bodies. The tool validates `cf_id`, opens the requested world's index through the existing lifecycle checks, returns tagged `touched_by_cf` and `extension` matches, preserves double-return behavior when both signals exist, and returns an empty success payload for unreferenced CF IDs.

The MCP registry, server registration, dispatch/list-tools tests, focused tool tests, and package README inventory now all include the new tool.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed; `tools/world-mcp/dist/src/tools/find-sections-touched-by.js` exists.
2. `cd tools/world-mcp && node --test dist/tests/tools/find-sections-touched-by.test.js` — passed.
3. `cd tools/world-mcp && npm run test` — passed; 114 tests passed.
4. `grep -n "find_sections_touched_by" tools/world-mcp/src/tool-names.ts tools/world-mcp/src/server.ts` — passed; 4 matches across registry and server.

## Deviations

The test proof uses the existing temp-index harness in `tools/world-mcp/tests/tools/_shared.ts` rather than a live animalia fixture copy. This keeps the proof independent of gitignored world generated state while still exercising the real indexed `nodes` table contract.
