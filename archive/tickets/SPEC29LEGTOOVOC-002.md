# SPEC29LEGTOOVOC-002: Retire `arc_trace_record` from world-mcp MCP surface + delete spec22-capstone integration test

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/world-mcp/src/tools/list-records` dropped `arc_trace_record` from supported record types; `tools/world-mcp/src/tools/_shared` dropped `arc_trace_node` / `ARCTRACE` from the shared story-bundle helpers; package metadata/docs dropped the retired ARCTRACE surface; world-mcp tests/fixtures lost ARCTRACE references (surgical edits plus deletion of the SPEC-22 capstone integration test); SPEC-29 received a same-seam implementation note.
**Deps**: None

## Problem

At intake, the MCP-side read surface for `arc_trace_record` — `tools/world-mcp/src/tools/list-records.ts` (in `SUPPORTED_LIST_RECORD_TYPES` and the `arc_trace_record: "arc_trace_node"` mapping) — exposed a record class no skill consumes. World-mcp tests, fixtures, package metadata, and package docs also exercised or advertised ARCTRACE / `arc_trace_node`. The SPEC-22 capstone integration test asserted the greenfield rebuild rejects the legacy ARC system, which became redundant once the named ARC surface was retired from world-mcp.

Per SPEC-29 §"Key design decisions": the legacy-rejection sentinel tests are retired because the JSON schemas' `additionalProperties: false` posture structurally rejects unknown fields generically; named-token rejection tests are reverse coupling to a vocabulary the cleanup is trying to forget. The positive tests producing ARCTRACE records are retired because once the world-mcp surface no longer maps `arc_trace_record`, the tests cannot exercise the path meaningfully.

## Assumption Reassessment (2026-05-15)

1. **Codebase reality at intake**: `list-records.ts` carried `"arc_trace_record"` in `SUPPORTED_LIST_RECORD_TYPES` and mapped `arc_trace_record: "arc_trace_node"`; `_shared.ts` carried `"arc_trace_node"` in the shared story-bundle node-type array and `"ARCTRACE"` in the story-bundle ID prefix array. Reassessment also found same-package public-surface drift beyond the draft: `src/server.ts` described `get_record` examples using `ARCTRACE`; `tools/world-mcp/README.md` documented `ARCTRACE`, `arc_trace_record`, and ARC_TRACE audit loads; `package.json` had a stale `test:spec22-capstone` script; `tests/tools/story-bundle-fixture.ts` seeded an ARCTRACE row; `tests/tools/_shared.ts` applied the arc-trace migration only to support that row.
2. **Spec/docs reality**: SPEC-29 §2 names only `list-records.ts` for D2 and §3 names four world-mcp test files for D3 (`get-canonical-vocabulary.test.ts`, `get-record-schema.test.ts`, `list-records.story-bundle.test.ts`, `validate-patch-plan.test.ts`); §4 names `spec22-capstone.test.ts` for D4. Issue 2 from /spec-to-tickets Step 2 (codebase validation, 2026-05-15) surfaced the additional `_shared.ts` source file + 5 unmentioned test files (`get-record.story-bundle.test.ts`, `search-nodes.story-bundle.test.ts`, `describe-capabilities.test.ts`, `dispatch.test.ts`, `allocate-next-id.test.ts`). Implementation reassessment added package-local docs/metadata/script and shared fixture/helper fallout. The disposition remains **expand-scope-in-place** — the spec's intent (mechanical cleanup, no behavior change to live flows) is preserved; the codebase requires the full world-mcp package surface to land in lockstep with the mapping removal.
3. **Shared boundary under audit**: `tools/world-mcp/src/tools/list-records` ↔ `tools/world-index` parsed-record graph. After this ticket, world-mcp exposes no read surface for `arc_trace_record`, but world-index continues to parse + index arc_trace_node rows (those are retired in SPEC29LEGTOOVOC-004). Mid-flow state between this ticket and SPEC29LEGTOOVOC-004: world.db rows for arc_trace_node persist as dead state but are unreachable through MCP — self-consistent. The reverse order (world-index retired first, MCP surface second) is **not** self-consistent because `list-records.story-bundle.test.ts:128-151` would fail when the indexer stops emitting ARCTRACE rows but the MCP mapping still expects them; this dictates the Deps direction in SPEC29LEGTOOVOC-004.
4. **Schema retcon (per Rule 6 — No Silent Retcons)**: the MCP `record_type` enum loses `arc_trace_record`. The change is breaking by definition (the type literally goes away), but worldloom is single-user pre-production with no external MCP consumers (SPEC-29 §Risks point 1); no deprecation cycle is required. The retcon attribution: the SPEC-22 ARC vocabulary surface was retired at the skill layer in the 2026-05-13 greenfield story-skills rebuild (`archive/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md`); this ticket completes the tools-layer migration that did not land in lockstep.
5. **Removal blast radius (per /spec-to-tickets §New-class / new-op / new-id-class / new-field parity scan applied in reverse for removal)**: package-wide grep for `arc_trace_record` / `arc_trace_node` / `ARCTRACE` in `tools/world-mcp/` confirms the active world-mcp hits are all package-owned by this ticket: source mappings/helpers, registered metadata, package README, package script, shared fixture/helper, targeted tests, and the SPEC-22 capstone file. Remaining non-world-mcp hits land in world-index (SPEC29LEGTOOVOC-004), validators (SPEC29LEGTOOVOC-003), patch-engine (SPEC29LEGTOOVOC-003), hooks (SPEC29LEGTOOVOC-003), and broader docs (SPEC29LEGTOOVOC-005).

## Architecture Check

1. **Why this is cleaner than alternatives**: removing the world-mcp surface for `arc_trace_record` plus all tests that exercise it in one diff produces a self-consistent mid-flow state — no test asserts against a surface that no longer exists, no surface exposes a record class no test exercises. The alternative — leaving sentinel tests as forward guards — re-couples the cleanup to the vocabulary it's trying to forget; once the type is gone, asserting "type is rejected" becomes asserting "the empty set is empty."
2. **No backwards-compatibility shims**: no `arc_trace_record` alias under a new name, no `// @deprecated`-tagged mapping, no fallback path in the `_shared.ts` story-bundle filter.

## Verification Layers

1. **Invariant: `arc_trace_record` is structurally unreachable from MCP** → `rg -n "arc_trace_record|arc_trace_node" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/tools/_shared.ts` returns no hits.
2. **Invariant: world-mcp test lane passes without ARCTRACE coverage** → `cd tools/world-mcp && npm test`. The remaining tests in the 7 surgically-edited files and the surviving integration tests exercise the non-ARCTRACE surfaces.
3. **Invariant: no orphan ARCTRACE references survive in world-mcp tracked source/docs/tests** → `rg -n "arc_trace_record|arc_trace_node|ARCTRACE" tools/world-mcp --glob '!node_modules/**' --glob '!.secret'` returns no hits.
4. **Invariant: §5b Schema-Minimalism preserved at the MCP record_type surface** → FOUNDATIONS §5b alignment check by inspection of remaining `SUPPORTED_LIST_RECORD_TYPES` entries: every remaining type must be load-bearing (consumed by at least one skill or tools/src file). The 30 remaining record types are unchanged and remain load-bearing.

## Landed Changes

### 1. Drop `arc_trace_record` from world-mcp's record-type surface

`tools/world-mcp/src/tools/list-records.ts`:
- Removed `"arc_trace_record"` from `SUPPORTED_LIST_RECORD_TYPES`.
- Removed `arc_trace_record: "arc_trace_node"` from the record-type-to-node-type mapping.

`tools/world-mcp/src/tools/_shared.ts`:
- Removed `"arc_trace_node"` from the shared node-type array and `"ARCTRACE"` from the story-bundle ID prefix array. The remaining entries cover the surviving story-bundle node types and ID classes.

`tools/world-mcp/src/server.ts` and `tools/world-mcp/README.md`:
- Removed ARCTRACE examples and `arc_trace_record` documentation from the package-local public surface so `describe_capabilities` and package docs do not advertise the retired class.

`tools/world-mcp/package.json`:
- Removed the stale `test:spec22-capstone` script because the target compiled test file is gone.

### 2. Delete `spec22-capstone.test.ts` and the legacy ARC envelope sub-test

`tools/world-mcp/tests/integration/spec22-capstone.test.ts`:
- Deleted the entire file. The three tests became moot once `arc_trace_record` was gone from `list-records.ts` and the retired schemas were gone from `get-record-schema`. The local helper `buildArcTraceEnvelope` had no external consumer.

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts`:
- Removed the `validatePatchPlan rejects retired create_arc_trace_record before validator delegation` test. Surrounding tests for the surviving op kinds stayed.

### 3. Drop ARCTRACE-positive test coverage

`tools/world-mcp/tests/tools/list-records.story-bundle.test.ts`:
- Removed the `listRecords returns ARC_TRACE records through arc_trace_record` test block. Surrounding tests for other story-bundle record types stayed.

`tools/world-mcp/tests/tools/get-record.story-bundle.test.ts`:
- Removed the ARCTRACE-0001 positive `getRecord` block and narrowed the batch field assertions to `["SLT-0021", "PG-0001"]`. Surrounding tests for non-ARCTRACE record IDs stayed.

`tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts`:
- Removed the `opening-bells:ARCTRACE-0001` expected row. Surrounding fixture rows stayed.

`tools/world-mcp/tests/tools/story-bundle-fixture.ts` and `tools/world-mcp/tests/tools/_shared.ts`:
- Removed the seeded ARCTRACE fixture row and the now-unneeded explicit application of `005_arc_trace_nodes.sql` in the package-local seeded test DB helper.

### 4. Drop ARCTRACE sentinel tests

`tools/world-mcp/tests/tools/describe-capabilities.test.ts`:
- Removed the ARCTRACE-specific negative enum assertion.

`tools/world-mcp/tests/server/dispatch.test.ts`:
- Removed `"ARCTRACE"` from the unsupported-id_class loop. The remaining `"NOT_A_CLASS"` entry preserves the generic-rejection coverage.

`tools/world-mcp/tests/tools/allocate-next-id.test.ts`:
- Removed the ARCTRACE-specific rejection assertion. Generic id_class rejection coverage is preserved by the remaining unsupported-name assertion.

## Files to Touch

- `tools/world-mcp/src/tools/list-records.ts` (modify)
- `tools/world-mcp/src/tools/_shared.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/package.json` (modify)
- `tools/world-mcp/README.md` (modify)
- `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (delete)
- `tools/world-mcp/tests/tools/_shared.ts` (modify)
- `tools/world-mcp/tests/tools/story-bundle-fixture.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)
- `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-capabilities.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `archive/specs/SPEC-29-legacy-tools-vocabulary-cleanup.md` (modify same-seam implementation note)

## Out of Scope

- `tools/world-index/src/schema/types.ts`, `tools/world-index/src/schema/migrations/005_arc_trace_nodes.sql`, `tools/world-index/src/index/nodes.ts`, `tools/world-index/src/parse/atomic.ts`, `tools/world-index/src/commands/render.ts`, `tools/world-index/src/cli.ts`, `tools/world-index/tests/schema.test.ts`, `tools/world-index/tests/arc-trace-indexing.test.ts` — routed to SPEC29LEGTOOVOC-004.
- `tools/validators/tests/structural/record-schema-compliance-arc.test.ts`, `tools/validators/tests/fixtures/story-storylet-complete.yaml`, `tools/patch-engine/src/ops/update-record-field.ts`, `tools/patch-engine/tests/integration/create-bel-record.test.ts`, `tools/hooks/tests/hook3-guard-direct-edit.test.ts` — routed to SPEC29LEGTOOVOC-003.
- Vocabulary classes (`commitment_family` et al.) — routed to `archive/tickets/SPEC29LEGTOOVOC-001.md`.
- Documentation surfaces — routed to SPEC29LEGTOOVOC-005.
- Pre-existing `world.db` files (`worlds/animalia/_index/world.db`, `worlds/erotica-world/_index/world.db`) — these were built by an earlier migration chain that included migration 005; the `arc_trace_node` tables persist but are unreachable through MCP after this ticket and will be structurally absent in any new world.db built after SPEC29LEGTOOVOC-004 ships.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm test` passes; the 30 remaining record types in `SUPPORTED_LIST_RECORD_TYPES` are exercised by the surviving tests.
2. `rg -n "arc_trace_record|arc_trace_node" tools/world-mcp/src/tools/list-records.ts tools/world-mcp/src/tools/_shared.ts` returns no hits.
3. `rg -n "arc_trace_record|arc_trace_node|ARCTRACE" tools/world-mcp --glob '!node_modules/**' --glob '!.secret'` returns no hits.
4. `test -e tools/world-mcp/tests/integration/spec22-capstone.test.ts` returns false.

### Invariants

1. `SUPPORTED_LIST_RECORD_TYPES` carries exactly 30 entries: `canon_fact`, `change_log_entry`, `invariant_record`, `mystery_record`, `open_question_record`, `named_entity_record`, `section_record`, `character_record`, `diegetic_artifact_record`, `adjudication_record`, plus the 20 story-bundle types except `arc_trace_record`.
2. No MCP test surface produces or asserts against an ARCTRACE record; the world-mcp test lane is structurally decoupled from the SPEC-22 ARC vocabulary.
3. Package-local public docs and registered capability descriptions do not advertise ARCTRACE or `arc_trace_record`.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` — delete; its three tests become moot.
2. `tools/world-mcp/tests/tools/_shared.ts` — modify per Change 3; the seeded DB no longer applies the arc-trace-only migration.
3. `tools/world-mcp/tests/tools/story-bundle-fixture.ts` — modify per Change 3; the shared fixture seed loses the ARCTRACE row.
4. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — modify per Change 2; surviving op-kind tests stay.
5. `tools/world-mcp/tests/tools/list-records.story-bundle.test.ts` — modify per Change 3; surviving record-type tests stay.
6. `tools/world-mcp/tests/tools/get-record.story-bundle.test.ts` — modify per Change 3; surviving record-id tests stay.
7. `tools/world-mcp/tests/tools/search-nodes.story-bundle.test.ts` — modify per Change 3; the fixture assertion loses one row.
8. `tools/world-mcp/tests/tools/describe-capabilities.test.ts` — modify per Change 4; surrounding capability assertions stay.
9. `tools/world-mcp/tests/server/dispatch.test.ts` — modify per Change 4; `"NOT_A_CLASS"` preserves the generic-rejection path.
10. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — modify per Change 4; surrounding tests cover other unsupported id_class names.

### Commands

1. `cd tools/world-mcp && npm test`
2. `cd tools/world-mcp && npm run build` (confirms TypeScript compile cleanly after the import changes; `npm test` runs `npm run build` as a prerequisite per `tools/world-mcp/package.json`, but `npm run build` in isolation is useful for partial-edit verification).

## Outcome

Completed. World-mcp no longer exposes, documents, seeds, or tests `arc_trace_record` / `arc_trace_node` / `ARCTRACE`. `SUPPORTED_LIST_RECORD_TYPES` now contains 30 entries, the stale `test:spec22-capstone` script is gone, the SPEC-22 capstone integration test is deleted, and SPEC-29 has a dated implementation note recording that D2 landed with package-local fallout.

## Verification Result

1. `cd tools/world-mcp && npm run clean` — passed; removed stale compiled output before broad proof so the deleted compiled capstone test could not remain in `dist/`.
2. `cd tools/world-mcp && npm test` — passed; 356 tests passed after `npm run build`.
3. `cd tools/world-mcp && npm run build` — passed.
4. `rg -n "arc_trace_record|arc_trace_node|ARCTRACE" tools/world-mcp --glob '!node_modules/**' --glob '!.secret'` — no hits, including rebuilt `dist/`.
5. `node -e 'const mod = require("./dist/src/tools/list-records.js"); console.log(mod.SUPPORTED_LIST_RECORD_TYPES.length); console.log(mod.SUPPORTED_LIST_RECORD_TYPES.join("\n"));'` from `tools/world-mcp` — printed `30` and the surviving supported list-record types, with no `arc_trace_record`.
6. FOUNDATIONS §5b alignment checked by inspection: the removed surface was not load-bearing, and the remaining story-bundle read types are the current story-record types.
7. `test ! -e tools/world-mcp/tests/integration/spec22-capstone.test.ts` — passed.

## Deviations

1. Scope expanded within the same world-mcp package seam from the drafted source/test-only list to include `src/server.ts`, `tools/world-mcp/README.md`, `package.json`, shared test fixtures/helpers, and the SPEC-29 implementation note. These were same-seam required fallout because the package public surface and compiled-test script otherwise still advertised or executed the retired ARC surface.
2. Verification used `rg` rather than `grep` for stale-anchor proofs. The proof invariant is unchanged; `rg` is the repo-preferred search tool and returned no hits.
3. Ignored package artifacts were refreshed by verification: `tools/world-mcp/dist/` was cleaned and rebuilt; pre-existing ignored `tools/world-mcp/.secret` and `tools/world-mcp/node_modules/` were left in place.
