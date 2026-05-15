# SPEC29LEGTOOVOC-002: Retire `arc_trace_record` from world-mcp MCP surface + delete spec22-capstone integration test

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records` drops `arc_trace_record` from supported record types; `tools/world-mcp/src/tools/_shared` drops `arc_trace_node` from the shared node-type array; eight world-mcp test files lose ARCTRACE references (seven surgical edits + one file deletion of the SPEC-22 capstone integration test).
**Deps**: None

## Problem

The MCP-side read surface for `arc_trace_record` — `tools/world-mcp/src/tools/list-records.ts:47` (in `SUPPORTED_LIST_RECORD_TYPES`) and `tools/world-mcp/src/tools/list-records.ts:135` (in the `arc_trace_record: "arc_trace_node"` mapping) — exposes a record class no skill consumes. Eight world-mcp test files exercise the surface or assert against it: three positive tests produce/read ARCTRACE-0001 records (get-record / search-nodes / list-records story-bundle tests), three sentinel tests assert ARCTRACE rejection (dispatch / allocate-next-id / describe-capabilities), one tests legacy `create_arc_trace_record` envelope rejection (validate-patch-plan), and `spec22-capstone.test.ts` is the SPEC-22 capstone integration test that asserted the greenfield rebuild rejects the legacy ARC system.

Per SPEC-29 §"Key design decisions": the legacy-rejection sentinel tests are retired because the JSON schemas' `additionalProperties: false` posture structurally rejects unknown fields generically; named-token rejection tests are reverse coupling to a vocabulary the cleanup is trying to forget. The positive tests producing ARCTRACE records are retired because once the world-mcp surface no longer maps `arc_trace_record`, the tests cannot exercise the path meaningfully.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality**: `list-records.ts:47` carries `"arc_trace_record"` in `SUPPORTED_LIST_RECORD_TYPES`; `list-records.ts:135` maps `arc_trace_record: "arc_trace_node"`; `_shared.ts:95` carries `"arc_trace_node"` in a shared node-type array (the `isStoryBundleNodeType` evaluation path). The 9 test files affected: `list-records.story-bundle.test.ts:128-151` (positive listRecords block), `get-record.story-bundle.test.ts:51-169` (positive getRecord and get_records cases — confirmed multiple ARCTRACE-0001 references at L62, L69, L77, L88-90, L138/146/169), `search-nodes.story-bundle.test.ts:38` (positive search-fixture row), `validate-patch-plan.test.ts:310-319` (legacy op-kind rejection test), `describe-capabilities.test.ts:52` (ARCTRACE-not-in-id_class sentinel), `dispatch.test.ts:523` (ARCTRACE in unsupported-id_class loop), `allocate-next-id.test.ts:836-840` (ARCTRACE rejection sentinel), and `spec22-capstone.test.ts` (entire file — three tests).
2. **Spec/docs reality**: SPEC-29 §2 names only `list-records.ts` for D2 and §3 names four world-mcp test files for D3 (`get-canonical-vocabulary.test.ts`, `get-record-schema.test.ts`, `list-records.story-bundle.test.ts`, `validate-patch-plan.test.ts`); §4 names `spec22-capstone.test.ts` for D4. Issue 2 from /spec-to-tickets Step 2 (codebase validation, 2026-05-15) surfaced the additional `_shared.ts` source file + 5 unmentioned test files (`get-record.story-bundle.test.ts`, `search-nodes.story-bundle.test.ts`, `describe-capabilities.test.ts`, `dispatch.test.ts`, `allocate-next-id.test.ts`) and dispositioned **expand-scope-in-place** — the spec's intent (mechanical cleanup, no behavior change to live flows) is preserved; the codebase requires the full world-mcp test surface to land in lockstep with the mapping removal.
3. **Shared boundary under audit**: `tools/world-mcp/src/tools/list-records` ↔ `tools/world-index` parsed-record graph. After this ticket, world-mcp exposes no read surface for `arc_trace_record`, but world-index continues to parse + index arc_trace_node rows (those are retired in SPEC29LEGTOOVOC-004). Mid-flow state between this ticket and SPEC29LEGTOOVOC-004: world.db rows for arc_trace_node persist as dead state but are unreachable through MCP — self-consistent. The reverse order (world-index retired first, MCP surface second) is **not** self-consistent because `list-records.story-bundle.test.ts:128-151` would fail when the indexer stops emitting ARCTRACE rows but the MCP mapping still expects them; this dictates the Deps direction in SPEC29LEGTOOVOC-004.
4. **Schema retcon (per Rule 6 — No Silent Retcons)**: the MCP `record_type` enum loses `arc_trace_record`. The change is breaking by definition (the type literally goes away), but worldloom is single-user pre-production with no external MCP consumers (SPEC-29 §Risks point 1); no deprecation cycle is required. The retcon attribution: the SPEC-22 ARC vocabulary surface was retired at the skill layer in the 2026-05-13 greenfield story-skills rebuild (`archive/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`); this ticket completes the tools-layer migration that did not land in lockstep.
5. **Removal blast radius (per /spec-to-tickets §New-class / new-op / new-id-class / new-field parity scan applied in reverse for removal)**: pipeline-wide grep for `arc_trace_record` / `arc_trace_node` / `ARCTRACE` in `tools/world-mcp/` confirms exactly the 10 files this ticket touches; remaining `arc_trace_record` / `arc_trace_node` hits land in world-index (SPEC29LEGTOOVOC-004), validators (SPEC29LEGTOOVOC-003), patch-engine (SPEC29LEGTOOVOC-003), hooks (SPEC29LEGTOOVOC-003), and docs (SPEC29LEGTOOVOC-005).

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the world-mcp surface for `arc_trace_record` plus all tests that exercise it in one diff produces a self-consistent mid-flow state — no test asserts against a surface that no longer exists, no surface exposes a record class no test exercises. The alternative — leaving sentinel tests as forward guards — re-couples the cleanup to the vocabulary it's trying to forget; once the type is gone, asserting "type is rejected" becomes asserting "the empty set is empty."
2. **No backwards-compatibility shims**: no `arc_trace_record` alias under a new name, no `// @deprecated`-tagged mapping, no fallback path in the `_shared.ts` story-bundle filter.

## Verification Layers

1. **Invariant: `arc_trace_record` is structurally unreachable from MCP** → `grep -nE "arc_trace_record|arc_trace_node" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/tools/_shared.ts` returns no hits.
2. **Invariant: world-mcp test lane passes without ARCTRACE coverage** → `cd tools/world-mcp && npm test`. The remaining tests in the 7 surgically-edited files and the surviving integration tests exercise the non-ARCTRACE surfaces.
3. **Invariant: no orphan ARCTRACE references survive in world-mcp** → `grep -rnE "arc_trace_record|arc_trace_node|ARCTRACE" tools/world-mcp/` returns no hits (excluding `dist/`, which is rebuilt by `npm run build`).
4. **Invariant: §5b Schema-Minimalism preserved at the MCP record_type surface** → FOUNDATIONS §5b alignment check by inspection of remaining `SUPPORTED_LIST_RECORD_TYPES` entries: every remaining type must be load-bearing (consumed by at least one skill or tools/src file). The 30 remaining record types are unchanged and remain load-bearing.

## What to Change

### 1. Drop `arc_trace_record` from world-mcp's record-type surface

`tools/world-mcp/src/tools/list-records.ts`:
- Remove `"arc_trace_record"` from `SUPPORTED_LIST_RECORD_TYPES` at L47.
- Remove `arc_trace_record: "arc_trace_node"` from the record-type-to-node-type mapping at L135.

`tools/world-mcp/src/tools/_shared.ts`:
- Remove `"arc_trace_node"` from the shared node-type array at L95 (the array consumed by `isStoryBundleNodeType` or equivalent predicate — confirm function name at implementation time). The remaining array entries cover the surviving story-bundle node types.

### 2. Delete `spec22-capstone.test.ts` and the legacy ARC envelope sub-test

`tools/world-mcp/tests/integration/spec22-capstone.test.ts`:
- Delete the entire file. The three tests (greenfield rejection of `create_arc_trace_record`, schema-discovery omission of `arc_trace_node`, deleted-legacy-skill assertions) become moot once `arc_trace_record` is gone from `list-records.ts` and the retired schemas are gone from `get-record-schema`. The local helper `buildArcTraceEnvelope` (L75) has no external consumer (verified at codebase validation 2026-05-15), so deletion is safe.

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts`:
- Remove the `validatePatchPlan rejects retired create_arc_trace_record before validator delegation` test at L310-319 (the entire `test(...)` block + any local helpers exclusive to it). Surrounding tests for the surviving op kinds stay.

### 3. Drop ARCTRACE-positive test coverage

`tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`:
- Remove the `listRecords returns ARC_TRACE records through arc_trace_record` test block at L128-151 (the entire `test(...)` block). Surrounding tests for other story-bundle record types stay.

`tools/world-mcp/tests/tools/get-record.story-bundle.test.ts`:
- Remove the ARCTRACE-0001 test cases at L51-90 (the test block asserting `getRecord({record_id: "ARCTRACE-0001", ...})` returns ARC_TRACE records; specific references at L62, L69, L77, L88-90). At L138-169 (`get_records` returning bundle including ARCTRACE-0001) drop `"ARCTRACE-0001"` from the `record_ids` arrays at L138/146 and from the asserted ordering at L169 — the bundle reduces to `["SLT-0021", "PG-0001"]`. Surrounding tests for non-ARCTRACE record IDs stay.

`tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`:
- Remove the `opening-bells:ARCTRACE-0001` fixture row at L38 (one array entry in the test-fixture seed). Surrounding fixture rows stay.

### 4. Drop ARCTRACE sentinel tests

`tools/world-mcp/tests/tools/describe-capabilities.test.ts`:
- Remove the L52 assertion `assert.ok(!byName.get(MCP_TOOL_NAMES.allocate_next_id)?.input_schema_enums.id_class?.includes("ARCTRACE"));` — once `ARCTRACE` is not a recognized id_class anywhere, asserting its absence is asserting the absence of a non-thing.

`tools/world-mcp/tests/server/dispatch.test.ts`:
- Remove `"ARCTRACE"` from the unsupported-id_class loop at L523 (the array `["NOT_A_CLASS", "ARCTRACE"]` reduces to `["NOT_A_CLASS"]`). The remaining `"NOT_A_CLASS"` entry preserves the generic-rejection coverage.

`tools/world-mcp/tests/tools/allocate-next-id.test.ts`:
- Remove the ARCTRACE-specific rejection test at L836-840 (the entire `test(...)` block + its `Unsupported id_class 'ARCTRACE'` regex assertion). Generic id_class rejection coverage is preserved by surrounding tests for other unsupported names.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (delete)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)

## Out of Scope

- `tools/world-index/src/schema/types.ts`, `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`, `tools/world-index/src/index/nodes.ts`, `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/commands/render.ts`, `tools/world-index/src/cli.ts`, `tools/world-index/tests/schema.test.ts`, `tools/world-index/tests/arc-trace-indexing.test.ts` — routed to SPEC29LEGTOOVOC-004.
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts`, `tools/validators/tests/fixtures/story-storylet-complete.yaml`, `tools/patch-engine/src/ops/update-record-field.ts`, `tools/patch-engine/tests/integration/create-bel-record.test.ts`, `tools/hooks/tests/hook3-guard-direct-edit.test.ts` — routed to SPEC29LEGTOOVOC-003.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Pre-existing `world.db` files (`worlds/animalia/_index/world.db`, `worlds/erotica-world/_index/world.db`) — these were built by an earlier migration chain that included migration 005; the `arc_trace_node` tables persist but are unreachable through MCP after this ticket and will be structurally absent in any new world.db built after SPEC29LEGTOOVOC-004 ships.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes; the 30 remaining record types in `SUPPORTED_LIST_RECORD_TYPES` are exercised by the surviving tests.
2. `grep -nE "arc_trace_record|arc_trace_node" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/tools/_shared.ts` returns no hits.
3. `grep -rnE "arc_trace_record|arc_trace_node|ARCTRACE" tools/world-mcp/` returns no hits (excluding `dist/`, which is rebuilt by `npm run build`).
4. `test -e tools/world-mcp/tests/integration/spec22-capstone.test.ts` returns false.

### Invariants

1. `SUPPORTED_LIST_RECORD_TYPES` carries exactly 30 entries: `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`, `character_record`, `diegetic_artifact_record`, `adjudication_record`, plus the 20 story-bundle types except `arc_trace_record`.
2. No MCP test surface produces or asserts against an ARCTRACE record; the world-mcp test lane is structurally decoupled from the SPEC-22 ARC vocabulary.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — delete; its three tests become moot.
2. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — modify per Change 2; surviving op-kind tests stay.
3. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — modify per Change 3; surviving record-type tests stay.
4. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` — modify per Change 3; surviving record-id tests stay.
5. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` — modify per Change 3; the fixture seed loses one row.
6. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — modify per Change 4; surrounding capability assertions stay.
7. `tools/world-mcp/tests/server/dispatch.test.ts` — modify per Change 4; `"NOT_A_CLASS"` preserves the generic-rejection path.
8. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — modify per Change 4; surrounding tests cover other unsupported id_class names.

### Commands

1. `cd tools/world-mcp && npm test`
2. `cd tools/world-mcp && npm run build` (confirms TypeScript compile cleanly after the import changes; `npm test` runs `npm run build` as a prerequisite per `tools/world-mcp/package.json`, but `npm run build` in isolation is useful for partial-edit verification).
