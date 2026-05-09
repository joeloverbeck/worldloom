# SPEC22SCECOM-001: Add `create_arc_trace_record` patch-engine op + envelope schema + pre-apply check

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — extends patch-engine story-record op registration, envelope schema, pre-apply ID allocation race coverage, staging/order/receipt dispatch, focused patch-engine tests, and hook3 explicit ARC_TRACE guard coverage. No impact on existing ops.
**Deps**: None

## Problem

At intake, SPEC-22 §Track 1 required the patch engine to emit ARC_TRACE records via the same `submit_patch_plan` flow that emits PG / SLT / CHC / SE records. Before this ticket, there was no `create_arc_trace_record` op-kind, `ARCTRACE-NNNN` ids could not be allocated through `expected_id_allocations`, and Hook 3 had only generic story-bundle `_source/...` coverage rather than an explicit ARC_TRACE regression. This ticket lands the engine surface that downstream SPEC-22 tracks consume.

## Assumption Reassessment (2026-05-08)

1. `tools/patch-engine/src/ops/create-story-record.ts` exists and carries the unified `STORY_RECORD_SPECS` registry. Each entry maps an op-kind name (e.g., `create_pg_record`, `create_slt_record`, `create_se_record`) to a source directory + id pattern + allocation key. SPEC-22's reassessment confirmed the new op extends this registry rather than landing as a standalone per-op file (post-SPEC-13 convention).
2. `tools/patch-engine/src/envelope/schema.ts` carries the `IdAllocations` interface and the `PatchOperation` discriminated union. At intake, neither listed `arc_trace_ids` nor `create_arc_trace_record`; both extensions were net-new.
3. **Cross-skill boundary under audit**: this ticket creates the engine surface that branching-story-page-cycle (archived SPEC-20 §C Phase 5) consumes via `mcp__worldloom__submit_patch_plan`. ARC_TRACE record YAML lands at `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`. Hook 3 (`tools/hooks/src/hook3-guard-direct-edit.ts`) covers this path via the existing `worlds/<slug>/stories/<slug>/_source/...` regex; this ticket added an explicit regression assertion without changing hook config.
4. **FOUNDATIONS §Story Bundles §4 (Write Discipline)** restated: "Story-bundle `_source/<class>/*.yaml` writes use Shape B: they route through `mcp__worldloom__submit_patch_plan` with story-bundle record ops." The new op preserves this discipline; no direct-Edit/Write path on `_source/arc-traces/`.
5. (HARD-GATE / canon-write ordering): N/A — story-bundle records are story-local, not world-level canon. World-canon mutation continues to route through `canon-addition` only; the `arc_effect_promotion` source_kind in 012 preserves that handoff.
6. **Schema extension** is additive: `IdAllocations.arc_trace_ids?: string[]` is a new optional field with no default fallback path needed. The `PatchOperation` discriminated union extension adds a new arm (no existing arm renamed).
7. Reassessment correction: the op-kind must be threaded through every live story-record-op enumeration, not only the three drafted files. The landed set also updates `tools/patch-engine/src/apply.ts`, `tools/patch-engine/src/commit/order.ts`, and `tools/patch-engine/src/commit/temp-file.ts`, because receipt metadata, commit tiering, and staging dispatch are explicit switch/set surfaces.
8. Verification fallout: `tools/hooks/tests/hook3-guard-direct-edit.test.ts` already proved generic story-bundle `_source` blocking. This ticket adds an explicit `arc-traces/ARCTRACE-0001.yaml` assertion. Hook tests spawn compiled hook subprocesses, so the focused and full hooks tests were run with approved child-process escalation after a sandboxed attempt was blocked.

## Architecture Check

1. Extending `STORY_RECORD_SPECS` is the canonical post-SPEC-13 codebase convention — every existing story-bundle op (PG, SLT, CHC, SF, SE, OBL, etc.) lives in the unified registry rather than as a standalone per-op file. The earlier "one file per op" pattern is no longer active. SPEC-22's reassessment confirmed this convention before decomposition.
2. No backwards-compatibility aliasing/shims introduced — `arc_trace_ids` is a new optional field; v1 patch plans without it continue to validate.

## Verification Layers

1. New op kind exists in registry → codebase grep-proof: `grep -nE 'create_arc_trace_record' tools/patch-engine/src/`
2. `arc_trace_ids` allocation key registered → grep `arc_trace_ids` in `tools/patch-engine/src/envelope/schema.ts`
3. Pre-apply check covers ARCTRACE id allocation → grep `ARCTRACE\|arc_trace` in `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`
4. End-to-end round-trip → integration test: build a patch plan with one `create_arc_trace_record` op → `submit_patch_plan` succeeds → file appears at `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` → `Read` returns the original record content.
5. FOUNDATIONS alignment check: §Story Bundles §4 (Write Discipline) + §Canonical Storage Layer ("one record per file") — preserved by routing through the registry's existing path-resolution helpers.

## Landed Changes

### 1. Extend `STORY_RECORD_SPECS` registry

In `tools/patch-engine/src/ops/create-story-record.ts`, added a new registry entry:

- op-kind: `create_arc_trace_record`
- `sourceDir: "arc-traces"`
- id pattern: `/^ARCTRACE-(\d{4})$/`
- allocation key: `arc_trace_ids`

`StoryRecordOperationKind` also gained the new literal.

### 2. Extend envelope schema

In `tools/patch-engine/src/envelope/schema.ts`:

- `IdAllocations` interface gained `arc_trace_ids?: string[]`
- `PatchOperation` discriminated union gained `OperationBase<"create_arc_trace_record", StoryRecordPayload>`.

### 3. Extend pre-apply check

In `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts`, the story-scoped allocation table now enumerates `arc_trace_ids` with `ARCTRACE-NNNN` ids.

### 4. Extend explicit dispatch surfaces

`tools/patch-engine/src/apply.ts`, `tools/patch-engine/src/commit/order.ts`, and `tools/patch-engine/src/commit/temp-file.ts` now include `create_arc_trace_record` in receipt metadata, tier-one ordering, staged metadata, and staging dispatch.

### 5. Add focused proof coverage

Patch-engine tests now cover ARC_TRACE staging, envelope validation + submit round-trip, and duplicate allocation rejection. Hook tests now include an explicit ARC_TRACE direct-write denial case.

## Files to Touch

- `tools/patch-engine/src/ops/create-story-record.ts` (modify — add `STORY_RECORD_SPECS` entry)
- `tools/patch-engine/src/envelope/schema.ts` (modify — `IdAllocations` + `PatchOperation`)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify — extend coverage)
- `tools/patch-engine/src/apply.ts` (modify — receipt metadata dispatch)
- `tools/patch-engine/src/commit/order.ts` (modify — tier-one ordering)
- `tools/patch-engine/src/commit/temp-file.ts` (modify — staged metadata + staging dispatch)
- `tools/patch-engine/tests/integration/create-arc-trace-record.test.ts` (new — round-trip test)
- `tools/patch-engine/tests/ops/create-story-record.test.ts` (modify — staging test)
- `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` (modify — duplicate allocation test)
- `tools/hooks/tests/hook3-guard-direct-edit.test.ts` (modify — explicit ARC_TRACE path assertion)

## Out of Scope

- Schema definitions for SLT v2 / CHC v2 / ARC_TRACE record shape (owned by archived SPEC-19; encoded as JSON Schema in 002)
- Runtime page-cycle wiring of the new op (owned by archived SPEC-20)
- Authoring-skill rewrite (owned by archived SPEC-21)
- JIT arc promotion to author-pool, render-packet caching, arc archetype library expansion beyond initial 20, constrained decoding, empirical token-cost telemetry (deferred per SPEC-22 §Out of Scope)

## Acceptance Criteria

### Tests That Must Pass

1. A patch plan with `op: create_arc_trace_record, payload: {story_slug, record}` validates against the envelope schema (no envelope-schema rejection).
2. `submit_patch_plan` with the new op produces a YAML file at `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`; `Read` of the file returns the original record content (round-trip).
3. The pre-apply `id_allocation_race` check rejects a patch plan with two `create_arc_trace_record` ops sharing the same `record.id`.
4. Hook 3 blocks a direct `Edit` or `Write` on `worlds/<slug>/stories/<slug>/_source/arc-traces/ARCTRACE-NNNN.yaml` (existing pattern coverage; verified by `tools/hooks/tests/hook3-guard-direct-edit.test.ts`).

### Invariants

1. `STORY_RECORD_SPECS` remains the single source of truth for story-bundle op routing — no parallel file-creation paths for ARC_TRACE.
2. `arc_trace_ids` follows existing allocation-key naming convention (`<class>_ids` lowercase, plural).
3. Hook 3's `worlds/<slug>/stories/<slug>/_source/...` block pattern continues to cover `arc-traces/` automatically (no hook config change).

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/integration/create-arc-trace-record.test.ts` (new) — round-trip integration test.
2. `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` (modified) — ARCTRACE-NNNN duplicate-detection case.
3. `tools/patch-engine/tests/ops/create-story-record.test.ts` (modified) — ARC_TRACE staging path test.
4. `tools/hooks/tests/hook3-guard-direct-edit.test.ts` (modified) — explicit ARC_TRACE direct-write denial.

### Commands

1. `cd tools/patch-engine && npm run build` — typecheck via `tsc -p tsconfig.json`.
2. `cd tools/patch-engine && npm test` — full unit + integration suite.
3. `cd tools/hooks && npm test` — full hooks suite; requires child-process execution outside the sandbox.

## Outcome

Completed: 2026-05-08.

Implemented `create_arc_trace_record` as a first-class story-record patch-engine op. ARC_TRACE records now route to `worlds/<slug>/stories/<story-slug>/_source/arc-traces/ARCTRACE-NNNN.yaml`, consume `expected_id_allocations.arc_trace_ids`, appear in new-node receipts as `arc_trace_record`, and participate in tier-one staging/commit ordering with the other story-bundle create ops.

## Verification Result

1. `cd tools/patch-engine && npm run build` — passed.
2. `cd tools/patch-engine && node --test dist/tests/ops/create-story-record.test.js` — passed.
3. `cd tools/patch-engine && node --test dist/tests/pre-apply-checks/id-allocation-race.test.js` — passed.
4. `cd tools/patch-engine && node --test dist/tests/integration/create-arc-trace-record.test.js` — passed.
5. `cd tools/patch-engine && npm test` — passed, 65 tests.
6. `cd tools/hooks && node --test dist/tests/hook3-guard-direct-edit.test.js` — passed with approved child-process escalation.
7. `cd tools/hooks && npm test` — passed with approved child-process escalation, 18 tests.
8. Manual FOUNDATIONS alignment check: preserves `docs/FOUNDATIONS.md` §Story Bundles §4 Write Discipline by routing story-bundle `_source/arc-traces/*.yaml` writes through `submit_patch_plan`; Hook 3 still blocks direct `Edit` / `Write` to story-bundle `_source/*.yaml`.

## Deviations

- The drafted file set named only the registry, envelope schema, and ID race checker. Live code also required explicit switch/set updates in `apply.ts`, `commit/order.ts`, and `commit/temp-file.ts`.
- The drafted test path `tools/patch-engine/tests/unit/id-allocation-race.test.ts` does not exist; the live test is `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts`.
- The hooks tests need child-process execution. A sandboxed `node --test dist/tests/hook3-guard-direct-edit.test.js` failed because nested hook subprocess execution was blocked; the escalated focused hook3 test and full hooks suite passed.
