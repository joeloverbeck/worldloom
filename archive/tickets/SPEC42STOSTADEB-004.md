# SPEC42STOSTADEB-004: MCP retrieval surface — CLK/STSEC/STQ

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — extends the MCP retrieval surface (`tools/world-mcp/src/tools/`) to recognize three new story-bundle record types (`pressure_clock_record`, `story_secret_record`, `story_question_record`) across the standard query tools and the context-packet assembly; no new MCP tools introduced; no impact on existing record-type handling
**Deps**: archive/tickets/SPEC42STOSTADEB-001.md, archive/tickets/SPEC42STOSTADEB-002.md, archive/tickets/SPEC42STOSTADEB-003.md

## Problem

At intake, CLK, STSEC, and STQ class foundations had landed (SPEC42STOSTADEB-001/002/003), and the records existed on disk under `_source/clocks/`, `_source/secrets/`, and `_source/story-questions/`, but the MCP retrieval surface did not fully recognize them. Skills that need to read these records (`branching-story-turn-cycle` per SPEC42STOSTADEB-009, `branching-story-bootstrap` per -010, `branching-story-health-audit` per -012, etc.) needed standard `get_record` / `get_records` / `list_records` / `get_context_packet` access. This ticket landed the cross-class MCP surface as one cohesive extension while preserving the existing tool list.

## Assumption Reassessment (2026-05-17)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Codebase verified at Step 2 codebase validation (2026-05-17): all MCP tool files exist (`tools/world-mcp/src/tools/get-record.ts`, `get-records.ts`, `list-records.ts`, `get-context-packet.ts`, `describe-envelope-schema.ts`, `get-record-schema.ts`). The `story_slug` parameter handling pattern is established at `get-record.ts:34` (verified in brainstorm agent reports). Existing story-bundle record-type handlers in these tools enumerate the 17 current classes; this ticket extends each tool's class-enumeration to include the 3 new classes.
2. Spec verified at `specs/SPEC-42-story-state-debt-secret-clock-records.md` §Deliverables MCP retrieval section: "`get_record` / `get_records` / `list_records` extended to recognize `record_type: pressure_clock_record | story_secret_record | story_question_record` with `story_slug` scoping (parallel to existing story-bundle record-type handling at the get-record.ts:34 / get-records.ts story_slug param). `get_context_packet` story-pipeline task-type templates extended to include CLK / STSEC / STQ in the story-bundle context layer." §Verification MCP-level section enumerates the per-tool acceptance bullets.
3. Cross-skill / cross-tool shared boundary: the MCP retrieval surface is the **canonical read API** for all worldloom skills (per FOUNDATIONS §Tooling Recommendation and §Story Bundles §3 Read Discipline). Every skill that consumes CLK/STSEC/STQ records depends on this ticket's extensions being in place. The contract: `record_type` enum membership across the four query tools must match the class-prefix registrations from SPEC42STOSTADEB-001/002/003; the context-packet story-pipeline templates must enumerate the three new classes in the story-bundle context layer.
4. FOUNDATIONS §Tooling Recommendation motivates this ticket: *"LLM agents should never operate on prose alone. They should always receive — directly or via the documented context-packet + targeted-retrieval pattern — current World Kernel, Invariants, relevant canon fact records, affected domain files, unresolved contradictions list, mystery reserve entries touching the same domain. This is non-negotiable."* The MCP retrieval surface (`get_record` / `get_records` / `list_records` / `get_context_packet`) IS the structured-retrieval mechanism this principle mandates. Adding three new story-bundle classes without extending the retrieval surface to recognize them would mean the new records exist on disk but cannot be loaded by skills via the canonical retrieval API — forcing skills to either skip the new classes or fall back to raw-file reads (which Hook 2 redirects to MCP retrieval). This ticket preserves the principle by extending the retrieval surface in lockstep with the class-foundation additions.
5. MCP schema-discovery surfaces: `describe-envelope-schema.ts` and `get-record-schema.ts` were surfaced by the §Step 2 New-class parity scan as machine-layer files the spec §Deliverables did not enumerate (under-enumeration of obvious schema-paired files; propagated per §Step 2 routing). Both must register the new schemas and op kinds so MCP clients can discover them — `describe-envelope-schema.ts` enumerates patch-engine ops (must include the new 4+5+4 = 13 ops from SPEC42STOSTADEB-001/002/003); `get-record-schema.ts` exposes per-class JSON schemas (must include `pressure_clock_record`, `story_secret_record`, `story_question_record`).
6. Live reassessment found `describe-envelope-schema.ts` already had the SPEC-42 operation introspection and allocation-key parity from the completed foundation tickets. This ticket therefore did not edit that source file; it preserved that already-landed coverage and added/verified tests for the operation manifest. The remaining live delta was retrieval/schema node-type coverage in `_shared.ts`, `get-record.ts`, `list-records.ts`, `get-record-schema.ts`, `get-context-packet.ts`, and the story-bundle context projection.

## Architecture Check

1. **Cross-class MCP extension as one cohesive ticket**: each MCP tool's extension is a near-identical pattern (add 3 enum entries; route to the new class subdirectory). Bundling them keeps the MCP-tool review surface unified — reviewers see all 6 tool extensions in one diff and verify consistency. Splitting per-class would force 18 MCP-tool edits across 3 tickets (6 × 3), with high cross-PR drift risk.
2. **No new MCP tools introduced**: this ticket extends existing tools only. The MCP surface contract is unchanged at the tool-list level; clients calling existing tools simply get expanded record-type coverage.
3. **Mirrors existing story-bundle record-type pattern**: SLT, STENT, STINT, etc. are already enumerated in each MCP tool's class registry. Adding CLK/STSEC/STQ follows the established pattern; no new code paths are introduced.

## Verification Layers

1. `get_record(record_id="CLK-1", story_slug=...)` returns the CLK record with full body → MCP retrieval test via `npm test --prefix tools/world-mcp`
2. `get_records(record_ids=["CLK-1", "STSEC-1", "STQ-1"], story_slug=...)` returns the requested records in order → MCP batch retrieval test
3. `list_records(record_type="story_secret_record", story_slug=...)` enumerates STSEC records → MCP retrieval test
4. `get_context_packet(task_type="branching_story_turn_cycle", story_slug=...)` includes CLK/STSEC/STQ in the story-bundle context layer → context-packet assembly test
5. `describe_envelope_schema` enumerates the 13 new patch-engine ops → MCP schema-discovery test
6. `get_record_schema(node_type="pressure_clock_record")` returns the CLK JSON Schema (parallel for STSEC and STQ) → MCP schema-discovery test

## Landed Changes

### 1. `get-record.ts` extension

`tools/world-mcp/src/tools/_shared.ts` now includes `pressure_clock_record`, `story_secret_record`, and `story_question_record` in the story-bundle node-type set, and `CLK`, `STSEC`, and `STQ` in the story-bundle ID-prefix set. `tools/world-mcp/src/tools/get-record.ts` now reports those prefixes in its supported-ID diagnostic. The existing `get_record` implementation uses the shared prefix and node-type registries, so no separate per-class branch was needed.

### 2. `get-records.ts` extension

`tools/world-mcp/src/tools/get-records.ts` required no source edit because batch retrieval delegates through `get_record`; the story-bundle ID-prefix update makes `get_records(record_ids=["CLK-1", "STSEC-1", "STQ-1"], story_slug=...)` work through the existing path.

### 3. `list-records.ts` extension

`tools/world-mcp/src/tools/list-records.ts` accepts `pressure_clock_record`, `story_secret_record`, and `story_question_record` as `record_type` values and maps them to their indexed node types.

### 4. `get-context-packet.ts` extension

`tools/world-mcp/src/tools/get-context-packet.ts` treats CLK/STSEC/STQ IDs as story-local seeds for story-pipeline tasks. `tools/world-mcp/src/context-packet/story-bundle-context.ts` and `shared.ts` now surface active clocks, hidden/partially revealed secrets, and open/inherited story questions in `story_bundle_context`, plus compact IDs in persisted `story_bundle_context_summary`.

### 5. `describe-envelope-schema.ts` extension

No source edit was needed in `tools/world-mcp/src/tools/describe-envelope-schema.ts`; the 13 new patch-engine operation kinds introduced by SPEC42STOSTADEB-001/002/003 were already registered at reassessment:
- CLK: `create_clk_record`, `supersede_clk_record`, `tick_pressure_clock`, `resolve_pressure_clock`
- STSEC: `create_stsec_record`, `supersede_stsec_record`, `append_secret_clue_carrier`, `mark_secret_clue_discovered`, `reveal_story_secret`
- STQ: `create_stq_record`, `supersede_stq_record`, `answer_story_question`, `abandon_story_question`

The existing `describe-envelope-schema` tests verify those operation schemas remain discoverable.

### 6. `get-record-schema.ts` extension

`tools/world-mcp/src/tools/get-record-schema.ts` now registers the three new node-types (`pressure_clock_record`, `story_secret_record`, `story_question_record`) so MCP clients can discover the JSON schemas via this tool.

## Files to Touch

- `tools/world-mcp/src/tools/get-record.ts` (modify — class routing extension)
- `tools/world-mcp/src/tools/_shared.ts` (modify — story-bundle node-type and ID-prefix registry extension)
- `tools/world-mcp/src/tools/list-records.ts` (modify — class enumeration extension)
- `tools/world-mcp/src/tools/get-context-packet.ts` (modify — story-pipeline task-type templates extended)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify — register 3 new node-types)
- `tools/world-mcp/src/context-packet/shared.ts` (modify — story-bundle context and summary shape extension)
- `tools/world-mcp/src/context-packet/story-bundle-context.ts` (modify — active CLK/STSEC/STQ context projection)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify — fixture records for CLK/STSEC/STQ)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify — get_record/get_records coverage)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify — list_records coverage)
- `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modify — schema discovery coverage)
- `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modify — story-local seed filtering coverage)
- `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` (modify — story_bundle_context coverage)
- `tools/world-mcp/tests/context-packet/story-bundle-budget.test.ts` (modify — persisted summary coverage)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify — fixture inventory assertion)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (existing — covers already-landed op introspection; no source or test edit needed)

## Out of Scope

- CLK/STSEC/STQ class foundations (schemas, ops, parser, allocator, commit-pipeline) — owned by SPEC42STOSTADEB-001 / -002 / -003
- Validators and predicates — owned by SPEC42STOSTADEB-005 / -006 / -007
- Shared validator extensions — owned by SPEC42STOSTADEB-008
- Skill integrations — owned by SPEC42STOSTADEB-009 through -013
- New MCP tools — none introduced; this ticket extends existing tools only

## Acceptance Criteria

### Tests That Must Pass

1. `npm test --prefix tools/world-mcp` — `get_record(record_id="CLK-1", story_slug=...)` returns the CLK record; `get_records(record_ids=["CLK-1", "STSEC-1", "STQ-1"], story_slug=...)` returns requested records in order; `list_records(record_type="story_secret_record", story_slug=...)` enumerates STSEC records; `get_context_packet(task_type="branching_story_turn_cycle", story_slug=...)` includes new classes in `story_bundle_context`; `describe_envelope_schema` enumerates the 13 new ops; `get_record_schema(node_type="pressure_clock_record")` returns the JSON Schema (and parallel for STSEC/STQ)
2. `npm test --prefix tools/validators` (regression — confirm no MCP-tool extension broke existing record-type handling)
3. `npm test --prefix tools/patch-engine` (regression — confirm no MCP-tool extension broke existing op handling)

### Invariants

1. The MCP retrieval surface contract is unchanged at the tool-list level — no new tools, no removed tools; existing tool signatures are preserved
2. All three new classes are reachable via every standard retrieval tool with `story_slug` scoping
3. Schema-discovery (`describe_envelope_schema` + `get_record_schema`) exposes the new ops and node-types so MCP clients can self-configure
4. Context-packet assembly for story-pipeline task types includes the new classes in `story_bundle_context` when the packet's `task_type` warrants it

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modified) — covers `get_record` for CLK/STSEC/STQ and `get_records` batch retrieval through `story_slug`.
2. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modified) — covers `pressure_clock_record`, `story_secret_record`, and `story_question_record` enumeration/projection.
3. `tools/world-mcp/tests/tools/get-record-schema.test.ts` (modified) — verifies new node-types return validator JSON Schemas.
4. `tools/world-mcp/tests/tools/get-context-packet.story-pipeline.test.ts` (modified) — verifies CLK/STSEC/STQ seeds are classified as story-local for story-pipeline packets.
5. `tools/world-mcp/tests/context-packet/story-bundle-context.test.ts` and `story-bundle-budget.test.ts` (modified) — verify inline and persisted story-bundle context exposes active clocks, hidden secrets, and open story questions.
6. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modified) — truthens the shared fixture inventory now that the fixture includes the new records.
7. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (existing) — verifies the 13 new ops are enumerated by the already-landed schema-discovery implementation.

### Commands

1. `npm test --prefix tools/world-mcp` — full MCP test pass with new class coverage
2. `npm test --prefix tools/validators` — regression
3. `npm test --prefix tools/patch-engine` — regression
4. The full-pipeline verification command lands in SPEC42STOSTADEB-015 capstone

## Outcome

Completed: 2026-05-17

The MCP retrieval surface now recognizes CLK, STSEC, and STQ records through the shared story-bundle node-type and ID-prefix registries, `get_record`, `get_records`, `list_records`, `get_record_schema`, story-pipeline seed filtering, and story-bundle context assembly. `story_bundle_context` now includes compact active-state projections for active clocks, hidden/partially revealed secrets, and open/inherited story questions, and persisted packet summaries carry their IDs.

`describe_envelope_schema` source was already current from the completed foundation tickets; this ticket preserved and verified that existing operation-introspection coverage rather than re-editing it.

## Verification Result

- `npm run build` from `tools/world-mcp` — pass.
- Focused compiled MCP proof from `tools/world-mcp`: `node --test dist/tests/tools/get-record.story-bundle.test.js dist/tests/tools/list-records.story-bundle.test.js dist/tests/tools/get-record-schema.test.js dist/tests/tools/get-context-packet.story-pipeline.test.js dist/tests/context-packet/story-bundle-context.test.js dist/tests/context-packet/story-bundle-budget.test.js dist/tests/tools/describe-envelope-schema.test.js` — pass, 45 tests.
- `npm test` from `tools/world-mcp` — pass, 395 tests.
- `npm test --prefix tools/validators` — pass, 380 tests.
- `npm test --prefix tools/patch-engine` — pass, 95 tests.

## Deviations

- `get-records.ts` required no source edit because it delegates to `get_record`; the new ID-prefix registry coverage is what makes CLK/STSEC/STQ batch retrieval work.
- `describe-envelope-schema.ts` required no source edit because the 13 SPEC-42 operation schemas and allocation keys were already present from the foundation-ticket seam; existing tests confirmed the introspection surface.
- Test coverage landed in the existing story-bundle test files rather than the draft's generic `get-record.test.ts`, `list-records.test.ts`, and `get-context-packet.test.ts` paths because those files are the live fixture-backed proof surfaces for story-scoped records.
