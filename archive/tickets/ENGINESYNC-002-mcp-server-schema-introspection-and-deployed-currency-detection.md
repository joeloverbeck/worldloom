# ENGINESYNC-002: MCP server schema introspection + deployed-vs-source schema currency detection

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/describe-capabilities.ts` (new read-only tool); `tools/world-mcp/src/build-info.ts` (new startup metadata/hash helper); `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/src/server.ts` (tool inventory, registration, Zod schema, enum manifest wiring); `tools/world-mcp/tests/tools/describe-capabilities.test.ts`, `tools/world-mcp/tests/server/dispatch.test.ts`, and `tools/world-mcp/tests/server/list-tools.test.ts` (package-local proof); `tools/world-mcp/README.md` (tool documentation); `docs/MACHINE-FACING-LAYER.md` (operational note about server reload + schema currency); `.claude/skills/emergent-pressure-events/SKILL.md` (defensive Pre-flight use of `describe_capabilities` when available).
**Deps**: MCPENH-005 (registered the `emergent_pressure_events` task_type and surfaced the deployed-vs-source schema gap that motivated this ticket); `archive/tickets/MCPENH-006-add-epe-to-id-class-enum.md` (registers `EPE` id_class — same shape of source-vs-deployed gap risk).

## Problem

When MCPENH-005 registered `task_type='emergent_pressure_events'` in the source code at `tools/world-mcp/src/ranking/profiles/index.ts:23` (committed 2026-04-30), the source-level enum extension was structurally complete: `npm test` passed, ranking-profile registration landed, governing-world-context metadata was added. But during the BATCH-0004 emergent-pressure-events run on the same date, the deployed MCP server my session communicated with returned a `task_type` schema that enumerated only the pre-MCPENH-005 set (9 task_types: `canon_addition`, `character_generation`, `diegetic_artifact_generation`, `continuity_audit`, `propose_new_canon_facts`, `propose_new_characters`, `propose_new_worlds_from_preferences`, `canon_facts_from_diegetic_artifacts`, `other`) — `emergent_pressure_events` was missing.

The cause is the build/deploy gap: `tools/world-mcp/dist/` was not rebuilt after MCPENH-005's source edits, OR a long-running MCP server process loaded the older binary and was not restarted. From the calling skill's perspective, this is indistinguishable from "the source-level implementation was never landed" — the schema-validation error is the same shape (`Invalid input: emergent_pressure_events is not a valid enum value`) regardless of root cause.

This created concrete friction in the BATCH-0004 run:
1. The skill prose said to use `task_type='emergent_pressure_events'` per MCPENH-005's expected end-state.
2. The MCP server schema rejected the value.
3. The operator (me) had to read source code (`tools/world-mcp/src/ranking/profiles/index.ts`) to disambiguate "implementation missing" from "deployment stale" — a five-minute investigation that should have been a single MCP introspection call.
4. The fallback (`task_type='other'`) was used, and the skill prose was reverted in a follow-up audit to document the manual fallback as the active path.

This pattern will recur every time an enum or schema is extended in source: source ships, dist/ is not rebuilt, MCP server is not restarted, deployed schema lags. The operator has no machine-readable way to verify "what does the deployed server actually accept right now?" The friction surface is the gap between the documented contract (in skill prose, in tickets, in READMEs) and the deployed contract (whatever the running MCP server's Zod schemas enforce).

The fix is to add a server-side introspection tool — `mcp__worldloom__describe_capabilities()` — that returns a structured manifest of the server's current build metadata and accepted enum values, plus operational documentation about the rebuild + restart cadence. This lets skills verify their assumed contract at Pre-flight (or at a friction point) rather than reading source.

## Assumption Reassessment (2026-04-30)

1. The MCP server source at `tools/world-mcp/src/server.ts` registers tools via `server.registerTool(name, { description, inputSchema }, handler)` calls, with the current tool inventory centralized in `tools/world-mcp/src/tool-names.ts`. Build output lands under `tools/world-mcp/dist/src/`; the package README confirms the built stdio entrypoint is `tools/world-mcp/dist/src/server.js`, not `dist/server.js`. The operator-facing recovery path ("rebuild dist/ + restart MCP server") is still not surfaced as a machine-readable signal — it is tacit operational knowledge.
2. The `TASK_TYPES` tuple at `tools/world-mcp/src/ranking/profiles/index.ts:14–25` currently enumerates 10 values (the 9 pre-MCPENH-005 set plus `emergent_pressure_events` at line 23). The deployed MCP server schema in my session enumerated 9 values (the pre-MCPENH-005 set). Source-vs-deployed delta confirmed.
3. The `ID_CLASSES` tuple at `tools/world-mcp/src/server.ts:164–193` currently enumerates 27 values. The deployed MCP server schema in my session also enumerated 27 values — matching source. So the deployed-vs-source gap is enum-specific and time-of-build-specific, not uniform across the server.
4. Cross-tool boundary under audit: the contract between (a) the deployed MCP server (Zod schema enforcement on every tool call) and (b) every consumer skill that depends on a specific enum value being accepted (`emergent-pressure-events` for `task_type='emergent_pressure_events'`; future consumers of `id_class='EPE'` per MCPENH-006; any future enum extension). The shared contract is the runtime Zod schema; the failure mode is silent staleness — schema enforcement returns a generic enum-validation error that does not distinguish "value never registered" from "value registered in source but not yet deployed".
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone … the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The MCP's schema enforcement is part of the same machine-facing contract; without introspection, every consumer skill operates on prose-driven assumptions (reading skill text + reading source) about what the server accepts. An introspection endpoint makes the deployed contract first-class machine-readable.
6. Additionally relevant: FOUNDATIONS §Machine-Facing Layer — "Once the retrieval surface is active, every 'skills should always receive X' item above is delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`." This ticket extends the same principle to the meta-level: skills should be able to ask the server "what tools and enum values do you currently accept?" rather than inferring from source code.
7. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check enforcement. The change is purely on the introspection surface; no canon mutation path is altered.
8. Schema extension: additive — `describe_capabilities` is a new tool; existing tools and their schemas are unchanged. The live package also requires adding the tool to `tools/world-mcp/src/tool-names.ts` and `tools/world-mcp/tests/server/list-tools.test.ts`, because current registration/listing tests derive from the centralized inventory rather than grepping `server.ts` only.
9. Adjacent contradiction surfaced during reassessment: skills that currently carry forward-notes about deferred MCP enum extensions (e.g., the EPE skill's pre-prior-audit Phase 3 forward-note about `id_class='EPE'`; any future skill with similar deferred-MCPENH guardrails) could call `describe_capabilities` at Pre-flight to programmatically verify whether the assumed enum value is currently accepted. After this ticket lands, that verification step becomes an option for defensive skill discipline; whether to adopt it is a per-skill operator judgment, not mandated by this ticket.
10. The deployed-vs-source gap may be transient (resolved by rebuild + restart) or persistent (a release-management concern). This ticket addresses the OBSERVABILITY of the gap — making it machine-readable rather than requiring source inspection. It does NOT mandate a build/deploy cadence change; that's a separate operational concern.
11. Pipeline-wide grep for current MCP introspection patterns: no `describe_capabilities` or equivalent introspection tool exists in `tools/world-mcp/src/tools/`. The closest analog is the OpenAPI-style schema returned by `ToolSearch` from the calling environment, which reflects the deployed server's schema but does not include build metadata or a source/deployed delta.
12. The active Codex toolset does not expose a live `mcp__worldloom__describe_capabilities` call before this ticket lands and the external MCP server is rebuilt/restarted. Package-local proof must therefore use a direct handler test and an in-memory MCP client/server dispatch test. A direct external MCP call remains a post-restart operational smoke check, not a final acceptance command for this implementation session.
13. Build metadata can be captured once when `createServer()` initializes instead of generating and overwriting a tracked source file on every build. This preserves the ticket invariant that repeated calls return the same `build_info` until server restart, avoids tracked generated-file churn, and still reports the git commit, server-start timestamp, and source schema hash for the deployed process.

## Architecture Check

1. Adding a `describe_capabilities` tool is the minimal change preserving the MCP's invariants (typed retrieval, Zod schema enforcement, additive tool registration). The alternative (embedding build metadata in every tool's response, or adding a special `_meta` field to all responses) violates response-shape locality — `describe_capabilities` is the dedicated introspection surface and other tools stay focused on their domain operations.
2. No backwards-compatibility shims — the new tool is additive. Existing tools and their consumers are unaffected.
3. The tool's response shape includes: server build metadata (git commit hash, build timestamp, source schema hash if computable), the list of registered tool names, and per-tool the accepted enum values for parameters that are Zod enums. Optional: per-tool the input/output schema as a serialized Zod-to-JSON-Schema rendering, parallel to what `ToolSearch` already returns from the calling environment.

## Verification Layers

1. `mcp__worldloom__describe_capabilities()` returns a manifest including `build_info.git_commit_hash`, `build_info.build_timestamp`, `tools[*].name`, and `tools[*].input_schema_enums` for each tool with enum-typed parameters → package-local direct handler test in `tools/world-mcp/tests/tools/describe-capabilities.test.ts`.
2. The manifest's `tools` list includes (at minimum): `allocate_next_id`, `get_context_packet`, `search_nodes`, `get_record`, `get_neighbors`, `find_named_entities`, `list_records`, `submit_patch_plan`, `find_edit_anchors`, `find_impacted_fragments`, `find_named_entities`, `find_sections_touched_by`, `get_canonical_vocabulary`, `get_firewall_content`, `get_node`, `get_record_field`, `get_record_schema`, `validate_patch_plan`, plus this new `describe_capabilities` tool itself → same test file.
3. The manifest's `tools[name='allocate_next_id'].input_schema_enums.id_class` matches the current `ID_CLASSES` tuple in source — confirming source-deployed parity for that enum at test time → same test file.
4. The MCP server's wrapped Zod input schema accepts `describe_capabilities()` with no arguments and returns the structured manifest → in-memory MCP server dispatch test in `tools/world-mcp/tests/server/dispatch.test.ts`.
5. Operational documentation: `docs/MACHINE-FACING-LAYER.md` includes a "Schema currency verification" subsection naming the recovery path (rebuild dist/ + restart MCP server) and citing `describe_capabilities` as the introspection tool → grep-proof: `rg -n "describe_capabilities|Schema currency" docs/MACHINE-FACING-LAYER.md` returns hits.

## What to Change

### 1. Add the `describe_capabilities` tool

Create `tools/world-mcp/src/tools/describe-capabilities.ts`:
- Input: empty object (no parameters).
- Output: structured manifest with the following shape:
  ```ts
  {
    build_info: {
      git_commit_hash: string,
      build_timestamp: string,  // ISO-8601 server-start timestamp
      source_schema_hash: string  // sha256 over the tool registration block at server.ts startup
    },
    tools: Array<{
      name: string,
      description: string,
      input_schema_enums: Record<string, string[]>  // per-parameter enum values where applicable
    }>
  }
  ```
- Implementation: the build metadata fields are populated once at server startup by `build-info.ts` (see §2 below). The `tools` list is assembled from the same registered tool metadata used by `server.ts`; enum-typed parameters are derived from the source tuples (`ID_CLASSES`, `TASK_TYPES`, `SUPPORTED_LIST_RECORD_TYPES`, etc.) so new enum values propagate through the manifest when those tuples change.

### 2. Add a build-info module

Create `tools/world-mcp/src/build-info.ts`:
- Exports a helper that captures `git rev-parse HEAD` and an ISO-8601 server-start timestamp once per `createServer()` call.
- The `source_schema_hash` is computed at server startup over a stable JSON serialization of the registered tool names, descriptions, and enum metadata. This gives a content-addressable identifier for the deployed schema set without rewriting tracked source during every build.

### 3. Register the tool in the MCP server

In `tools/world-mcp/src/server.ts`:
- Import the new tool's input/output schemas and handler.
- Add a `server.registerTool('describe_capabilities', ...)` registration block alongside the existing tool registrations.
- The Zod input schema is `z.object({}).strict()` — empty object only.

### 4. Add tests

- `tools/world-mcp/tests/tools/describe-capabilities.test.ts`:
  - Manifest shape assertion (build_info present, tools array non-empty).
  - Tool list completeness assertion (all current tool names present).
  - Per-tool enum-extraction assertion (allocate_next_id.input_schema_enums.id_class matches the current ID_CLASSES tuple).
  - Build metadata assertion (git_commit_hash is a 40-char hex string; build_timestamp parses as a valid ISO-8601 date).
- `tools/world-mcp/tests/server/dispatch.test.ts`:
  - Add an MCP-server-boundary test asserting `describe_capabilities()` is accepted with no arguments and returns the expected response shape.

### 5. Update operational documentation

In `docs/MACHINE-FACING-LAYER.md`:
- Add a "Schema currency verification" subsection describing:
  - The deployed MCP server may lag source after a build that wasn't followed by `tools/world-mcp/dist/` rebuild and server restart.
  - The recovery path: `cd tools/world-mcp && npm run build && <restart command>`.
  - The introspection tool: `mcp__worldloom__describe_capabilities()` returns the deployed contract (build metadata + tool list + enum values) so skills can verify their assumptions against the deployed schema.
- Cross-reference this ticket and MCPENH-005 (the originating friction case).

In `tools/world-mcp/README.md`:
- Add a brief entry for the `describe_capabilities` tool alongside the existing tool documentation.

### 6. Skill prose updates (defensive)

For skills that carry forward-notes about deferred MCP enum extensions (currently: `emergent-pressure-events` Phase 3 forward-note for `id_class='EPE'`; any future skill with similar deferred-MCPENH guardrails), document that `describe_capabilities` is the recommended Pre-flight verification path before relying on the assumed enum value:

In `.claude/skills/emergent-pressure-events/SKILL.md`:
- Update the Phase 3 forward-note (line ~183 in the post-prior-audit version) or the relevant guardrail to mention `describe_capabilities` as a verification path. Defer the exact prose to the skill author at implementation time.

## Files to Touch

- `tools/world-mcp/src/tools/describe-capabilities.ts` (new)
- `tools/world-mcp/src/build-info.ts` (new)
- `tools/world-mcp/src/server.ts` (modify — tool registration)
- `tools/world-mcp/src/tool-names.ts` (modify — tool inventory/order)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add `describe_capabilities` schema-acceptance coverage)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify — expected inventory count)
- `tools/world-mcp/README.md` (modify — `describe_capabilities` documentation)
- `docs/MACHINE-FACING-LAYER.md` (modify — Schema currency verification subsection)
- `.claude/skills/emergent-pressure-events/SKILL.md` (modify — Phase 3 forward-note + relevant guardrails reference `describe_capabilities` as a Pre-flight verification option)

## Out of Scope

- Mandating that all skills call `describe_capabilities` at Pre-flight. This is operator/skill-author judgment; some skills don't depend on enum-value-specific contracts and don't need the verification overhead.
- Auto-rebuild + auto-restart on source change. That's a release-management concern outside this ticket's scope. The introspection tool surfaces the gap; closing the gap is operational discipline.
- Versioning the MCP server's API (e.g., adding an `api_version` field to every response). Build hash + source schema hash are sufficient for the observability concern this ticket addresses; full API versioning is a larger architectural decision.
- Backwards-compatibility shims for old enum values. Source-driven enum changes are additive (per existing MCPENH precedent); no removal or rename happens, so no compatibility window is needed.
- Cross-skill propagation of `describe_capabilities` calls. Only `emergent-pressure-events` carries a deferred-MCPENH-style forward-note today; other skills can adopt the verification pattern at their own audit cadence.

## Acceptance Criteria

### Tests That Must Pass

1. Package-local direct handler and in-memory MCP dispatch proof show `mcp__worldloom__describe_capabilities()` returns a manifest with `build_info.git_commit_hash` (40-char hex or `unknown` only outside a git checkout), `build_info.build_timestamp` (ISO-8601 server-start timestamp), `build_info.source_schema_hash` (sha256 hex), and a `tools[]` array whose names match the registered tools.
2. `describe_capabilities().tools.find(t => t.name === 'allocate_next_id').input_schema_enums.id_class` matches the current `ID_CLASSES` tuple — confirming source-deployed parity at the time of the test.
3. `describe_capabilities().tools.find(t => t.name === 'get_context_packet').input_schema_enums.task_type` matches the current `TASK_TYPES` tuple.
4. `describe_capabilities().tools.find(t => t.name === 'list_records').input_schema_enums.record_type` matches the current `record_type` enum.
5. The MCP server's wrapped Zod input schema accepts `describe_capabilities()` with no arguments without raising "missing required parameter" errors.
6. After §What to Change §5 lands, `rg -n "describe_capabilities|Schema currency" docs/MACHINE-FACING-LAYER.md` returns hits.

### Invariants

1. `describe_capabilities` is read-only: it never mutates server state and never invokes any other tool's handler logic.
2. The build metadata is populated at server startup, not at every call — so calling `describe_capabilities()` repeatedly returns the same `build_info` until the server is restarted with a new build.
3. The introspection tool itself appears in its own `tools[]` list (recursive consistency).
4. Adding a new enum value to any existing tool in source automatically propagates to `describe_capabilities()`'s response after rebuild + restart, with no separate registration step required.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — manifest shape, tool list completeness, per-enum extraction, build metadata format.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — MCP-server-boundary test for `describe_capabilities` schema acceptance.
3. Integration test (optional): assert that a known-recent enum addition (e.g., the `emergent_pressure_events` task_type registered by MCPENH-005) appears in the manifest's `get_context_packet.input_schema_enums.task_type` — verifying the introspection accurately reflects the deployed schema.

### Commands

1. `cd tools/world-mcp && npm run build` — rebuild dist/ including the new introspection tool.
2. `cd tools/world-mcp && npm test` — runs the full package test suite including the new `describe-capabilities` assertions.
3. In-memory MCP dispatch invokes `mcp__worldloom__describe_capabilities` against `createServer()` after `npm run build` — returns the structured manifest. A direct external MCP call remains post-restart operational smoke because this session cannot expose a newly registered tool until the external server/client is rebuilt and restarted.
4. `rg -n "describe_capabilities" tools/world-mcp/src/ docs/ .claude/skills/emergent-pressure-events/` — confirms the tool registration, documentation, and skill-side reference all landed.
5. Comparison check (manual or scripted): given the source-side `TASK_TYPES` tuple at `tools/world-mcp/src/ranking/profiles/index.ts:14–25` and the deployed-schema response from `describe_capabilities()`, assert they are equal — confirming source-deployed parity at test time, and providing a direct verification path if the parity ever breaks.

## Outcome

Completed on 2026-05-01.

- Added `mcp__worldloom__describe_capabilities` as a read-only MCP tool. It returns startup `build_info` (`git_commit_hash`, ISO `build_timestamp`, and `source_schema_hash`) plus registered tool names, descriptions, and enum-valued input contracts.
- Wired the new tool through `tool-names.ts`, `server.ts`, in-memory MCP dispatch coverage, and list-tools inventory coverage.
- Added startup build/schema metadata without a generated tracked source file. `createServer()` captures the timestamp and schema hash once, so repeated calls from the same server instance return stable build metadata.
- Documented schema-currency recovery in `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md`, including the rebuild + MCP server restart path.
- Updated `emergent-pressure-events` Pre-flight/Phase 3 prose so it can use `describe_capabilities` defensively when checking whether deployed enum contracts include `task_type='emergent_pressure_events'` and `id_class='EPE'`.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/describe-capabilities.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js` — passed; 3 compiled test files passed.
3. `cd tools/world-mcp && npm test` — passed; package build plus 214 tests passed with 0 failures.
4. `rg -n "describe_capabilities|Schema currency" tools/world-mcp/src tools/world-mcp/tests docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md .claude/skills/emergent-pressure-events/SKILL.md` — returned hits in the new tool registration, tests, docs, and EPE skill defensive prose.
5. `git diff --check` — passed.

## Deviations

- The draft's generated `build-info.ts` build step was replaced with a startup-captured helper to avoid rewriting tracked source on every build while preserving stable per-server `build_info`.
- A direct external `mcp__worldloom__describe_capabilities()` smoke call was not run in this Codex session because the newly registered tool will not exist on the already-running external MCP server/client until the package is rebuilt and that server/client is restarted. The accepted proof is the package-local direct handler test plus in-memory MCP dispatch test.
- `tools/world-mcp/.secret`, `tools/world-mcp/dist/`, and `tools/world-mcp/node_modules/` are ignored package artifacts present after verification. `dist/` is expected generated output from build/test; `.secret` and `node_modules/` were already present in the initial package ignored-status snapshot and are not ticket-owned source edits.
