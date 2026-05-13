# PEENH-007: Add `create_bel_record` patch-engine op; drop `create_arctrace_record` if present

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/envelope/schema.ts` and patch-application code paths
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (allocator's `BEL` id-class registration landed first so allocated `BEL-NNNN` ids resolve before the patch op writes the record)

## Problem

The rebuilt story-skill family introduces a first-class `BEL` (Belief) record class for story-bundle records (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.0 + §F.3). `branching-story-bootstrap` Phase 10 sub-step 1 builds patch plans that include `create_bel_record` operations for the initial belief state authored in Phase 3. Future siblings (`branching-story-turn-cycle`, `commitment-block-authoring` audit-repair mode) also write `BEL` records via the same operation.

At intake, the patch engine at `tools/patch-engine/src/envelope/schema.ts` enumerated `create_*_record` operations for STENT, STINT, SF, SE, OBL, CNSQ, THR, SREL, STLOC, STOBJ, BR, PG, CHC, SLT, and stale `create_arc_trace_record`. The `create_bel_record` operation was absent; without it, the patch engine rejected any plan containing BEL creation as an unknown op.

The greenfield plan also deletes the `ARCTRACE` record class. This ticket removed the stale `create_arc_trace_record` write operation from the patch-engine op surface while leaving broader ARC_TRACE retrieval/index/history support to separate cleanup.

## Assumption Reassessment (2026-05-13)

1. **Patch-engine op enumeration verified.** At intake, `tools/patch-engine/src/envelope/schema.ts` was the authoritative op union and included `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, `create_slt_record`, and stale `create_arc_trace_record`; `create_bel_record` was absent.
2. **`StoryRecordPayload` and allocation-shape parity.** `create_bel_record` uses the same `StoryRecordPayload` shape as sibling story-bundle creates (per `OperationBase<"create_stent_record", StoryRecordPayload>` pattern in the existing schema), but it also needs `expected_id_allocations.bel_ids` parity in the patch-engine allocation type and id-race check. No new payload wrapper type is needed.
3. **Cross-skill schema parity.** The `BEL` record schema lives in `.claude/skills/_shared-templates/story-state-contract.md` §4.1 (12 fields total). This ticket only wires the engine operation and pre-apply materialization path; the `record_schema_compliance` validator (VALENH-011) remains responsible for field-level BEL schema validation.
4. **FOUNDATIONS principle.** Realizes FOUNDATIONS §Story Bundles §6 (rebuilt-family record-class inventory adds `BEL` per the greenfield plan's §F.1 stale-reference cleanup of FOUNDATIONS §Story Bundles §6); the patch op is the write-path execution of that doctrine.
5. **HARD-GATE / canon-write impact.** None. The patch engine targets story-bundle scope (`worlds/<slug>/stories/<story-slug>/_source/beliefs/BEL-NNNN.yaml`), not world canon scope. Hook 3 enforces story-bundle YAML writes through the engine (per FOUNDATIONS §Canonical Storage Layer + CLAUDE.md non-negotiables).
6. **Schema extension impact.** Adding `create_bel_record` to the op union is additive. Dropping `create_arc_trace_record` is removal at the patch-engine write-op boundary; broader historical ARC_TRACE read/index surfaces remain intentionally outside this ticket.
7. **Rename / removal blast radius.** `rg -n "create_arctrace_record|create_arc_trace_record|arc_trace_ids" tools/patch-engine/src tools/patch-engine/tests tools/world-mcp/src tools/world-mcp/tests tools/validators/src tools/validators/tests` identifies owned stale op-shape sites in the patch-engine op union, apply/order/staging paths, id-allocation race check, `describe_envelope_schema`, pre-apply overlay helpers, and tests. Broader ARC_TRACE retrieval/index docs remain outside this engine-op ticket.
8. **Adjacent contradictions.** `tools/world-mcp/src/tools/validate-patch-plan.ts` delegates envelope shape through `tools/world-mcp/src/tools/_shared.ts` and the patch-engine exported `OPERATION_KINDS`, while `describe_envelope_schema` has an explicit per-op schema switch. Both are same-seam consumers of the new operation list and must be updated/proved with the engine change.

## Architecture Check

1. **Additive op registration** is the minimal change. The existing schema is enumerated explicitly; abstraction into a generic "create story-bundle record" op was considered and rejected because per-class type-safety is the load-bearing property of the current shape — collapsing into a generic op would break TypeScript's exhaustiveness checks on the dispatch table.
2. **No backwards-compatibility shim** for `create_arc_trace_record`. The greenfield plan deletes the write class; no patch-engine create-op consumer remains in the owned runtime path.

## Verification Layers

1. **`create_bel_record` op accepted**: a patch plan containing one `create_bel_record` op with a valid `BEL-NNNN` id and `StoryRecordPayload` validates and applies successfully. → patch-engine integration test.
2. **`create_arc_trace_record` op rejected**: a patch plan containing `create_arc_trace_record` returns a clear unsupported-operation/envelope-shape error rather than silently applying. → patch-engine envelope validation / world-mcp validation test.
3. **Pre-apply validation and schema discovery parity**: `validate_patch_plan` and `describe_envelope_schema` recognize `create_bel_record`, project `bel_ids`, and do not advertise `create_arc_trace_record`. → focused world-mcp tests.

## Landed Changes

### 1. Added `create_bel_record` to the op union and story-record writer

`tools/patch-engine/src/envelope/schema.ts` now exposes `create_bel_record` and `expected_id_allocations.bel_ids`. `tools/patch-engine/src/ops/create-story-record.ts` writes BEL records to `worlds/<world_slug>/stories/<story_slug>/_source/beliefs/BEL-NNNN.yaml` with `belief_record` receipt metadata.

### 2. Wired BEL through apply/order/id-race paths

`tools/patch-engine/src/apply.ts`, `tools/patch-engine/src/commit/order.ts`, `tools/patch-engine/src/commit/temp-file.ts`, and `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` now treat `create_bel_record` like other story-bundle create operations and validate sequential BEL allocation overlays.

### 3. Removed patch-engine `create_arc_trace_record` support

`create_arc_trace_record` and `arc_trace_ids` no longer appear in the patch-engine runtime op schema, ordering, staging, submit receipt collection, or id-allocation race path. Focused tests assert the retired op is rejected before write.

### 4. Updated MCP/validator pre-apply consumers for op-shape coverage

`tools/world-mcp/src/tools/describe-envelope-schema.ts` exposes `create_bel_record` and `bel_ids` and no longer advertises `arc_trace_ids`. `tools/world-mcp/src/tools/validate-patch-plan.ts` rejects retired operation kinds before validator delegation. `tools/validators/src/_helpers/index-access.ts` can materialize BEL pre-apply records, and ARC_TRACE validators no longer trigger from a retired create op.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify — add `create_bel_record`, drop `create_arctrace_record` if present)
- `tools/patch-engine/src/ops/create-story-record.ts`, `tools/patch-engine/src/commit/order.ts`, `tools/patch-engine/src/commit/temp-file.ts`, `tools/patch-engine/src/apply.ts`, `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify — wire BEL write path and remove ARC_TRACE op support)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts`, `tools/world-mcp/src/tools/validate-patch-plan.ts`, `tools/world-mcp/tests/tools/validate-patch-plan.test.ts`, `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts`, `tools/world-mcp/tests/integration/spec22-capstone.test.ts` (modify — extend dry-run/schema coverage and retire the old SPEC-22 ARC_TRACE create-op smoke)
- `tools/validators/src/_helpers/index-access.ts`, `tools/validators/src/rules/arc_envelope_conformance.ts`, `tools/validators/src/rules/arc_trace_evidence_alignment.ts`, `tools/validators/src/rules/narrative_point_classification.ts`, and `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify — pre-apply materialized read surface no longer creates ARC_TRACE records and can materialize BEL records)
- `tools/patch-engine/tests/**` (modify — add BEL test cases; drop ARC_TRACE if present)
- `tools/world-mcp/tests/**` (modify — extend validator/schema tests for BEL)

## Out of Scope

- The validator's `record_schema_compliance` field-level check for BEL structure — that's VALENH-011.
- BEL retrieval profiles in `tools/world-mcp/src/context-packet/shared.ts` for `story_bootstrap` task type — separate retrieval-tuning concern.
- Renaming legacy `story_page_cycle` / `storylet_pool_authoring` task types to match the rebuilt family — separate MCPENH-NNN ticket (flagged in `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` §Assumption Reassessment item 9).
- Removing broader ARC_TRACE retrieval/index support (`arc_trace_node`, `get_record`, `list_records`, historical validator rules) outside the patch-engine op and pre-apply overlay path.

## Acceptance Criteria

### Tests That Must Pass

1. A patch plan containing `create_bel_record` with a valid `BEL-0001` id and a `StoryRecordPayload` dry-runs and applies successfully. Completed via patch-engine integration and world-mcp validate-patch-plan tests.
2. A patch plan containing `create_arc_trace_record` returns a clear unsupported-operation/envelope-shape error. Completed via patch-engine envelope validation and world-mcp validate-patch-plan tests.
3. Focused `tools/patch-engine`, `tools/world-mcp`, and pre-apply overlay tests pass. Broad `tools/world-mcp` was run and fails only on unrelated missing SPEC-22 skill-reference files; see `## Deviations`.

### Invariants

1. The `create_bel_record` op always writes to `worlds/<world_slug>/stories/<story_slug>/_source/beliefs/BEL-NNNN.yaml` and nowhere else.
2. No silent `create_arc_trace_record` accepts occur anywhere in the patch-engine code path.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/integration/create-bel-record.test.ts` — happy path: create-and-read-back a BEL record via patch envelope; rejection path for `create_arc_trace_record`.
2. `tools/patch-engine/tests/ops/create-story-record.test.ts` and `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` — BEL path and allocation-race coverage.
3. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` and `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — pre-apply validation and schema-discovery coverage for BEL plus retired ARC_TRACE op rejection.
4. `tools/world-mcp/tests/integration/spec22-capstone.test.ts` and `tools/validators/tests/integration/validate-patch-plan.test.ts` — remove old ARC_TRACE create-op pre-apply expectations while preserving broader historical ARC_TRACE retrieval/index validator coverage outside this ticket.

### Commands

1. `cd tools/patch-engine && npm test` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/tools/validate-patch-plan.test.js` — passed after `npm test` built fresh artifacts.
3. `cd tools/validators && npm test` — passed.
4. `cd tools/world-mcp && npm test` — build passed; broad test run failed on two unrelated missing SPEC-22 skill-reference files. See `## Deviations`.
5. `rg -n 'create_arctrace_record|create_arc_trace_record|arc_trace_ids' tools/patch-engine/src tools/world-mcp/src/tools/describe-envelope-schema.ts tools/validators/src/_helpers/index-access.ts` — no matches.

## Outcome

Completed: 2026-05-13.

Implemented the patch-engine BEL write operation and retired the stale ARC_TRACE create operation at the patch-engine/pre-apply boundary. BEL records now write to story-bundle `_source/beliefs/`, consume `bel_ids`, appear in envelope schema discovery, and validate through the MCP pre-apply path. Retired `create_arc_trace_record` plans are rejected before validation or write.

## Verification Result

1. `cd tools/patch-engine && npm test` — passed after cleaning stale generated `dist/` from the test-file rename.
2. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/tools/validate-patch-plan.test.js` — passed.
3. `cd tools/validators && npm test` — passed.
4. `cd tools/world-mcp && npm test` — build passed; broad tests failed only in `dist/tests/integration/spec22-capstone.test.js` on missing `.claude/skills/branching-story-bootstrap/references/phase-9-validation-gates.md` and `.claude/skills/branching-story-bootstrap/references/phase-6-storylet-pool-seed.md`.
5. `rg -n 'create_arctrace_record|create_arc_trace_record|arc_trace_ids' tools/patch-engine/src tools/world-mcp/src/tools/describe-envelope-schema.ts tools/validators/src/_helpers/index-access.ts` — no matches.

## Deviations

- The BEL operation's full field-level JSON Schema is intentionally not added here; VALENH-011 owns `record_schema_compliance` for the 12-field BEL schema. `describe_envelope_schema` exposes the BEL operation wrapper and `BEL-NNNN` id pattern without pretending that full BEL field validation has landed.
- Broader ARC_TRACE retrieval/index support remains present in historical validators, `get_record`, `list_records`, and world-index surfaces. This ticket only retires the patch-engine create op and pre-apply overlay path.
- Full `tools/world-mcp` is not green in this checkout because SPEC-22 capstone tests reference two missing branching-story-bootstrap reference files outside this ticket's op/schema seam. Focused world-mcp schema/validation tests and the validators suite passed.
