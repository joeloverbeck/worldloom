# ENGINESYNC-002: MCP server schema introspection + deployed-vs-source schema currency detection

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-mcp/src/tools/describe-capabilities.ts` (new tool); `tools/world-mcp/src/server.ts` (tool registration + Zod schema for the new tool); `tools/world-mcp/src/build-info.ts` (new module exposing build metadata: git commit hash, build timestamp, source schema hash); `tools/world-mcp/tests/tools/describe-capabilities.test.ts` and `tools/world-mcp/tests/server/dispatch.test.ts` (package-local proof); `tools/world-mcp/README.md` (tool documentation); `docs/MACHINE-FACING-LAYER.md` (operational note about server reload + schema currency); skill prose updates in skills that reference task_type or id_class enums in their forward-notes (defensive skills should call `describe_capabilities` at Pre-flight to verify their assumed contract).
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

1. The MCP server source at `tools/world-mcp/src/server.ts` registers tools via `server.tool(name, schema, handler)` calls. Build output lands in `tools/world-mcp/dist/`. At intake (2026-04-30), `tools/world-mcp/dist/` exists but my `ls` of it returned only `src` and `tests` subdirectories — the `dist/server.js` file (the built MCP server entry point) was not present, suggesting either an incomplete build or a non-standard build layout. Either way, the operator-facing recovery path ("rebuild dist/ + restart MCP server") is not currently surfaced as a machine-readable signal — it's tacit operational knowledge.
2. The `TASK_TYPES` tuple at `tools/world-mcp/src/ranking/profiles/index.ts:14–25` currently enumerates 10 values (the 9 pre-MCPENH-005 set plus `emergent_pressure_events` at line 23). The deployed MCP server schema in my session enumerated 9 values (the pre-MCPENH-005 set). Source-vs-deployed delta confirmed.
3. The `ID_CLASSES` tuple at `tools/world-mcp/src/server.ts:164–193` currently enumerates 27 values. The deployed MCP server schema in my session also enumerated 27 values — matching source. So the deployed-vs-source gap is enum-specific and time-of-build-specific, not uniform across the server.
4. Cross-tool boundary under audit: the contract between (a) the deployed MCP server (Zod schema enforcement on every tool call) and (b) every consumer skill that depends on a specific enum value being accepted (`emergent-pressure-events` for `task_type='emergent_pressure_events'`; future consumers of `id_class='EPE'` per MCPENH-006; any future enum extension). The shared contract is the runtime Zod schema; the failure mode is silent staleness — schema enforcement returns a generic enum-validation error that does not distinguish "value never registered" from "value registered in source but not yet deployed".
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation — "LLM agents should never operate on prose alone … the context-packet API is the machine-facing mechanism for delivering this set with completeness guarantees." The MCP's schema enforcement is part of the same machine-facing contract; without introspection, every consumer skill operates on prose-driven assumptions (reading skill text + reading source) about what the server accepts. An introspection endpoint makes the deployed contract first-class machine-readable.
6. Additionally relevant: FOUNDATIONS §Machine-Facing Layer — "Once the retrieval surface is active, every 'skills should always receive X' item above is delivered by `mcp__worldloom__get_context_packet(task_type, seed_nodes, token_budget)`." This ticket extends the same principle to the meta-level: skills should be able to ask the server "what tools and enum values do you currently accept?" rather than inferring from source code.
7. Not applicable — this ticket does not touch HARD-GATE semantics, canon-write ordering, or Canon Safety Check enforcement. The change is purely on the introspection surface; no canon mutation path is altered.
8. Schema extension: additive — `describe_capabilities` is a new tool; existing tools and their schemas are unchanged. The new tool's response schema is documented in the tool's own description and the README.
9. Adjacent contradiction surfaced during reassessment: skills that currently carry forward-notes about deferred MCP enum extensions (e.g., the EPE skill's pre-prior-audit Phase 3 forward-note about `id_class='EPE'`; any future skill with similar deferred-MCPENH guardrails) could call `describe_capabilities` at Pre-flight to programmatically verify whether the assumed enum value is currently accepted. After this ticket lands, that verification step becomes an option for defensive skill discipline; whether to adopt it is a per-skill operator judgment, not mandated by this ticket.
10. The deployed-vs-source gap may be transient (resolved by rebuild + restart) or persistent (a release-management concern). This ticket addresses the OBSERVABILITY of the gap — making it machine-readable rather than requiring source inspection. It does NOT mandate a build/deploy cadence change; that's a separate operational concern.
11. Pipeline-wide grep for current MCP introspection patterns: no `describe_capabilities` or equivalent introspection tool exists in `tools/world-mcp/src/tools/`. The closest analog is the OpenAPI-style schema returned by `ToolSearch` from the calling Claude environment, which reflects the deployed server's schema but does not include build metadata or a source/deployed delta.

## Architecture Check

1. Adding a `describe_capabilities` tool is the minimal change preserving the MCP's invariants (typed retrieval, Zod schema enforcement, additive tool registration). The alternative (embedding build metadata in every tool's response, or adding a special `_meta` field to all responses) violates response-shape locality — `describe_capabilities` is the dedicated introspection surface and other tools stay focused on their domain operations.
2. No backwards-compatibility shims — the new tool is additive. Existing tools and their consumers are unaffected.
3. The tool's response shape includes: server build metadata (git commit hash, build timestamp, source schema hash if computable), the list of registered tool names, and per-tool the accepted enum values for parameters that are Zod enums. Optional: per-tool the input/output schema as a serialized Zod-to-JSON-Schema rendering, parallel to what `ToolSearch` already returns from the calling environment.

## Verification Layers

1. `mcp__worldloom__describe_capabilities()` returns a manifest including `build_info.git_commit_hash`, `build_info.build_timestamp`, `tools[*].name`, and `tools[*].input_schema.enums[*]` for each tool with enum-typed parameters → package-local direct handler test in `tools/world-mcp/tests/tools/describe-capabilities.test.ts`.
2. The manifest's `tools` list includes (at minimum): `allocate_next_id`, `get_context_packet`, `search_nodes`, `get_record`, `get_neighbors`, `find_named_entities`, `list_records`, `submit_patch_plan`, `find_edit_anchors`, `find_impacted_fragments`, `find_named_entities`, `find_sections_touched_by`, `get_canonical_vocabulary`, `get_firewall_content`, `get_node`, `get_record_field`, `get_record_schema`, `validate_patch_plan`, plus this new `describe_capabilities` tool itself → same test file.
3. The manifest's `tools[name='allocate_next_id'].input_schema.enums.id_class` matches the current `ID_CLASSES` tuple in source — confirming source-deployed parity for that enum at test time → same test file.
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
      build_timestamp: string,  // ISO-8601
      source_schema_hash: string  // sha256 over the tool registration block at server.ts startup
    },
    tools: Array<{
      name: string,
      description: string,
      input_schema_enums: Record<string, string[]>  // per-parameter enum values where applicable
    }>
  }
  ```
- Implementation: the build metadata fields are populated at server startup from a generated `build-info.ts` module (see §2 below). The `tools` list is iterated from the registered tool registry; for each tool, the input schema is introspected and enum-typed parameters are extracted.

### 2. Add a build-info module

Create `tools/world-mcp/src/build-info.ts`:
- Exports a `BUILD_INFO` constant populated at build time by a small build-step script that reads `git rev-parse HEAD` and `Date.now()`.
- The `source_schema_hash` is computed at server startup over the concatenated string representation of all tool input schemas (using Zod's `.toString()` or a stable JSON serialization). This gives a content-addressable identifier for the deployed schema set.

### 3. Register the tool in the MCP server

In `tools/world-mcp/src/server.ts`:
- Import the new tool's input/output schemas and handler.
- Add a `server.tool('describe_capabilities', ...)` registration block alongside the existing tool registrations.
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
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (new)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify — add `describe_capabilities` schema-acceptance coverage)
- `tools/world-mcp/README.md` (modify — `describe_capabilities` documentation)
- `docs/MACHINE-FACING-LAYER.md` (modify — Schema currency verification subsection)
- `.claude/skills/emergent-pressure-events/SKILL.md` (modify — Phase 3 forward-note + relevant guardrails reference `describe_capabilities` as a Pre-flight verification option)
- Build script extension (e.g., `tools/world-mcp/package.json` `scripts.build` or a dedicated `prebuild` step) to generate `build-info.ts` with the current git commit hash and timestamp at every build.

## Out of Scope

- Mandating that all skills call `describe_capabilities` at Pre-flight. This is operator/skill-author judgment; some skills don't depend on enum-value-specific contracts and don't need the verification overhead.
- Auto-rebuild + auto-restart on source change. That's a release-management concern outside this ticket's scope. The introspection tool surfaces the gap; closing the gap is operational discipline.
- Versioning the MCP server's API (e.g., adding an `api_version` field to every response). Build hash + source schema hash are sufficient for the observability concern this ticket addresses; full API versioning is a larger architectural decision.
- Backwards-compatibility shims for old enum values. Source-driven enum changes are additive (per existing MCPENH precedent); no removal or rename happens, so no compatibility window is needed.
- Cross-skill propagation of `describe_capabilities` calls. Only `emergent-pressure-events` carries a deferred-MCPENH-style forward-note today; other skills can adopt the verification pattern at their own audit cadence.

## Acceptance Criteria

### Tests That Must Pass

1. `mcp__worldloom__describe_capabilities()` returns a manifest with `build_info.git_commit_hash` (40-char hex), `build_info.build_timestamp` (ISO-8601), `build_info.source_schema_hash` (sha256 hex), and a `tools[]` array whose names match the registered tools.
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

1. `cd tools/world-mcp && npm run build` — rebuild dist/ including the new build-info generation step.
2. `cd tools/world-mcp && npm test` — runs the full package test suite including the new `describe-capabilities` assertions.
3. `mcp__worldloom__describe_capabilities()` invoked against the live MCP server (after rebuild + restart) — returns the structured manifest.
4. `rg -n "describe_capabilities" tools/world-mcp/src/ docs/ .claude/skills/emergent-pressure-events/` — confirms the tool registration, documentation, and skill-side reference all landed.
5. Comparison check (manual or scripted): given the source-side `TASK_TYPES` tuple at `tools/world-mcp/src/ranking/profiles/index.ts:14–25` and the deployed-schema response from `describe_capabilities()`, assert they are equal — confirming source-deployed parity at test time, and providing a direct verification path if the parity ever breaks.
