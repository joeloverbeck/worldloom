# SPEC47STPSTE-004: Wire STPLAN+STEMO into patch-engine (IdAllocations, ops, allocator, envelope-schema)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends patch-engine `IdAllocations`, `OPERATION_KINDS`, `PatchOperation`, `STORY_RECORD_SPECS`, receipt metadata, ordering, staging, and allocation-race checks; extends MCP `allocate_next_id` allocator + `describe_envelope_schema` capability; adds focused package tests
**Deps**: `archive/tickets/SPEC47STPSTE-003.md`

## Problem

Before this ticket, SPEC-47's two new record classes had executable JSON schemas (`archive/tickets/SPEC47STPSTE-003.md`) but no engine-routed write paths. This ticket makes the patch engine recognize `create_stplan_record` and `create_stemo_record` op kinds, registers the classes in `STORY_RECORD_SPECS` so the commit phase writes `_source/plans/STPLAN-<integer>.yaml` and `_source/emotions/STEMO-<integer>.yaml`, allocates STPLAN-N / STEMO-N IDs per the FOUNDATIONS-002 unpadded natural-integer convention, and surfaces both ops through the MCP `describe_envelope_schema` capability.

## Assumption Reassessment (2026-05-19)

<!-- Items 1-3 always required. Items 4+ are a menu; include only those matching this ticket's scope and renumber surviving items sequentially starting from 4. Lists like 1, 2, 3, 14 are malformed output. -->

1. Verified `tools/patch-engine/src/ops/create-story-record.ts` is the central file containing `STORY_RECORD_SPECS` (a `Readonly<Record<StoryRecordOperationKind, StoryRecordSpec>>`). The file aggregates all story-record op kinds (`create_stent_record`, `create_ststat_record`, `create_clk_record`, etc.); STPLAN/STEMO ops landed alongside them. Corrected stale draft path: `IdAllocations`, `OPERATION_KINDS`, and `PatchOperation` live in `tools/patch-engine/src/envelope/schema.ts`, while `tools/patch-engine/src/envelope/validate.ts` consumes `OPERATION_KINDS` for envelope shape validation. Verified `tools/world-mcp/src/tools/allocate-next-id.ts` exists (MCP allocator) and `tools/world-mcp/src/tools/describe-envelope-schema.ts` exists (capability description tool).
2. Verified SPEC-47 §Approach §A deliverables D-A6 (patch-engine `IdAllocations` + `OPERATION_KINDS` + `PatchOperation` + `STORY_RECORD_SPECS` extensions; new ops `create_stplan_record` + `create_stemo_record`); D-A7 (allocator recognized class list); D-A8 (`describe_envelope_schema` enumerates 2 new op kinds). Verified source-directory layout: `_source/plans/STPLAN-<integer>.yaml` and `_source/emotions/STEMO-<integer>.yaml` per SPEC-47 §Approach §A.
3. Cross-skill boundary under audit: the patch engine's op vocabulary is consumed by every skill that submits patch plans (story-pipeline skills, world-canon-mutating skills, audit-routing skills). Adding two new op kinds extends the closed `OPERATION_KINDS` enum that downstream skills use to construct patch plans. The MCP `allocate_next_id` and `describe_envelope_schema` tools are the discovery surfaces story-pipeline skills query at pre-flight to learn the op vocabulary.
4. FOUNDATIONS Rule 6 (No Silent Retcons) — the patch engine's append-only write discipline at `_source/<class>/*.yaml` is preserved per-file (no in-place mutation of prior records; supersession by writing a new record citing `supersedes`). The new ops follow this discipline; the corresponding source subdirs `_source/plans/` and `_source/emotions/` are append-only at the filesystem level.
5. STPLAN/STEMO op wiring touches `tools/patch-engine/src/` (per the §Step 6.2(c) per-ticket-type granularity rule for item 5: patch-engine op wiring is a Canon Safety surface — the engine gates story-bundle record writes at pre-apply time; modifying the op vocabulary directly affects what records can be written via `submit_patch_plan`). HARD-GATE discipline preserved: the new ops route through the same approval-token + envelope-validation path as existing ops; no canon-safety bypass introduced.

## Architecture Check

1. The patch-engine op vocabulary is the single point of truth for what writes the engine accepts; adding STPLAN/STEMO as new ops (rather than as field extensions to existing ops) preserves the per-class isolation that lets the validator chain reject mis-targeted writes (a `create_stent_record` op cannot mistakenly land a STPLAN body). Following the CLK/STSEC/STQ precedent from SPEC-42 keeps the engine's structure orthogonal.
2. No backwards-compatibility aliasing/shims introduced — both ops are net-new. The allocator's class-list extension is additive; existing allocations are unchanged.

## Verification Layers

1. `STORY_RECORD_SPECS` contains entries for STPLAN and STEMO with correct `prefix`, `nodeType`, and source-subdir mapping → codebase grep-proof + schema test
2. `OPERATION_KINDS` enum includes `create_stplan_record` and `create_stemo_record` → codebase grep-proof
3. `IdAllocations` recognizes STPLAN and STEMO as story-bundle-scoped allocation classes → schema validation against ID allocation tests
4. MCP `allocate_next_id` returns next STPLAN-N / STEMO-N when called with the new class names → package-local allocator tests using the handler behind `mcp__worldloom__allocate_next_id`
5. MCP `describe_envelope_schema` enumerates `create_stplan_record` + `create_stemo_record` in its emitted schema description → package-local schema-discovery tests using the handler behind `mcp__worldloom__describe_envelope_schema`

## Landed Changes

### 1. Extended patch-engine story-record operation surfaces

Added `create_stplan_record` and `create_stemo_record` to `IdAllocations`, `OPERATION_KINDS`, `PatchOperation`, `StoryRecordOperationKind`, `STORY_RECORD_OPERATION_KINDS`, and `STORY_RECORD_SPECS` following the existing CLK/STSEC/STQ pattern:

```typescript
create_stplan_record: {
  prefix: "STPLAN",
  nodeType: "story_plan_record",
  sourceDir: "plans",
  allocationKey: "stplan_ids",
},
create_stemo_record: {
  allocationKey: "stemo_ids",
  prefix: "STEMO",
  nodeType: "story_emotion_record",
  sourceDir: "emotions",
},
```

Also extended commit-tier ordering, `stageAllOps`/receipt metadata dispatch, story-bundle ID recognition used by staged metadata, and the submit-time `id_allocation_race` pre-apply check.

### 2. Extended world-mcp allocator and schema discovery

Added `STPLAN` and `STEMO` to `ID_CLASS_FORMATS`, story-scoped directory routing, the MCP `ID_CLASSES` enum, `describe_envelope_schema` allocation-key properties, record-schema mapping, and operation schema switch.

### 3. Added focused tests

Added patch-engine staging and submit-path tests plus world-mcp allocator, `describe_envelope_schema`, and `validatePatchPlan` tests that exercise both new operation kinds against the existing schema-compliance and ID-allocation surfaces.

## Files to Touch

- `tools/patch-engine/src/ops/create-story-record.ts` (modify)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify)
- `tools/world-mcp/src/tools/allocate-next-id.ts` (modify)
- `tools/world-mcp/src/server.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify)
- `tools/patch-engine/tests/integration/create-bel-record.test.ts` (modify)
- `tools/world-mcp/tests/tools/allocate-next-id.test.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify)

## Out of Scope

- JSON schema content for STPLAN and STEMO — covered by `archive/tickets/SPEC47STPSTE-003.md` (this ticket only references the schema paths).
- Validator framework registration of per-class deterministic validators — covered by tickets 005 (STPLAN) and 006 (STEMO).
- Hook 3 path-blocking is automatic via the generic `**/stories/<slug>/_source/**/*.yaml` pattern at `tools/hooks/src/hook3-guard-direct-edit.ts:30-55` (verified during reassess-spec); no Hook 3 code change required (covered by ticket 017's integration-test verification per SPEC-47 D-A9).
- Story-record source-directory creation at runtime — handled by patch-engine commit-phase file-write logic (which creates parent dirs lazily); no separate ticket needed.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n 'create_stplan_record|create_stemo_record' tools/patch-engine/src/ops/create-story-record.ts tools/patch-engine/src/envelope/schema.ts tools/patch-engine/src/apply.ts` returns op kind, spec, union, and receipt metadata matches.
2. `rg -n 'STPLAN|STEMO' tools/world-mcp/src/tools/allocate-next-id.ts tools/world-mcp/src/server.ts` returns allocator format/directory and MCP input enum matches.
3. A representative patch plan that includes `create_stplan_record` and `create_stemo_record` validates through `validatePatchPlan` against fixture world state.
4. A representative signed patch plan that includes `create_stplan_record` and `create_stemo_record` submits through `submitPatchPlan` against a fixture world and writes `_source/plans/STPLAN-1.yaml` + `_source/emotions/STEMO-1.yaml`.
5. `describeEnvelopeSchema({ op_kind: "create_stplan_record" })` and `describeEnvelopeSchema({ op_kind: "create_stemo_record" })` emit both op kinds with schema references to `story-plan.schema.json` and `story-emotion.schema.json`.

### Invariants

1. Existing patch-engine op kinds (create_stent_record, create_ststat_record, create_clk_record, ...) remain unchanged in behavior.
2. The append-only file-write discipline at `_source/<class>/*.yaml` is preserved for the new subdirs — no in-place mutation; supersession by writing a new record with `supersedes`.
3. Hook 3's generic `**/stories/<slug>/_source/**/*.yaml` pattern covers `_source/plans/` and `_source/emotions/` without code change (verified at ticket 017 integration test).

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-story-record.test.ts` — added STPLAN/STEMO staging cases that verify `_source/plans/` and `_source/emotions/` target paths.
2. `tools/patch-engine/tests/integration/create-bel-record.test.ts` — added signed submit-path case that verifies STPLAN/STEMO files are written, allocation keys are consumed, and receipt `new_nodes` includes `story_plan_record` / `story_emotion_record`.
3. `tools/world-mcp/tests/tools/allocate-next-id.test.ts` — added STPLAN/STEMO story-scoped ID allocation and input-enum/format coverage.
4. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — added STPLAN/STEMO wrapper-schema and schema-reference assertions.
5. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — added pre-apply validation case for a patch plan containing both new op kinds.

### Commands

1. From `tools/patch-engine`: `npm test`
2. From `tools/world-mcp`: `npm test`
3. Focused diagnostics used during implementation:
   - From `tools/patch-engine`: `node --test dist/tests/ops/create-story-record.test.js`
   - From `tools/patch-engine`: `node --test dist/tests/integration/create-bel-record.test.js`
   - From `tools/world-mcp`: `node --test dist/tests/tools/allocate-next-id.test.js dist/tests/tools/describe-envelope-schema.test.js`
   - From `tools/world-mcp`: `node --test dist/tests/tools/validate-patch-plan.test.js`

## Outcome

Completed: 2026-05-19.

- Added STPLAN/STEMO patch-engine operation kinds, `PatchOperation` union entries, allocation keys, `STORY_RECORD_SPECS` entries, commit-tier/staging dispatch, submit-time allocation-race checks, and receipt `new_nodes` metadata.
- Added STPLAN/STEMO story-scoped allocator support in world-mcp (`ID_CLASS_FORMATS`, directory routing, and MCP input enum).
- Added STPLAN/STEMO `describe_envelope_schema` support with schema references to `story-plan.schema.json` and `story-emotion.schema.json`.
- Added focused tests for staging, signed submit, allocator behavior, schema discovery, and pre-apply validation.

## Verification Result

Commands run:

1. From `tools/patch-engine`: `npm test` — passed; 85 tests passed.
2. From `tools/world-mcp`: `npm test` — passed; 407 tests passed.
3. From `tools/patch-engine`: `node --test dist/tests/integration/create-bel-record.test.js` — initially exposed a same-seam receipt omission (`PatchReceipt.new_nodes` did not include STPLAN/STEMO); fixed `tools/patch-engine/src/apply.ts`, reran successfully with 2 tests passed.
4. From `tools/world-mcp`: `node --test dist/tests/tools/validate-patch-plan.test.js` — passed; 10 tests passed, including the STPLAN/STEMO pre-apply validation case.

## Deviations

- The active Codex session does not expose direct `mcp__worldloom__validate_patch_plan`, `mcp__worldloom__submit_patch_plan`, or `mcp__worldloom__describe_envelope_schema` tools. Verification used the package-local handler and signed `submitPatchPlan` tests instead, which exercise the same local operation schema, schema-compliance, ID-allocation, and apply paths without requiring an external MCP session restart.
- The `tools/world-mcp` package consumes `@worldloom/patch-engine` through a symlinked local dependency, so building `tools/patch-engine` before the world-mcp proof was sufficient to refresh the consumer artifact.
