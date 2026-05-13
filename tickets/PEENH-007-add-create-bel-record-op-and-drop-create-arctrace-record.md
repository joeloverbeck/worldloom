# PEENH-007: Add `create_bel_record` patch-engine op; drop `create_arctrace_record` if present

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/patch-engine/src/envelope/schema.ts` and patch-application code paths
**Deps**: `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` (allocator's `BEL` id-class registration landed first so allocated `BEL-NNNN` ids resolve before the patch op writes the record)

## Problem

The rebuilt story-skill family introduces a first-class `BEL` (Belief) record class for story-bundle records (per `docs/plans/2026-05-13-streamlined-story-skills-greenfield-plan.md` §C.0 + §F.3). `branching-story-bootstrap` Phase 10 sub-step 1 builds patch plans that include `create_bel_record` operations for the initial belief state authored in Phase 3. Future siblings (`branching-story-turn-cycle`, `commitment-block-authoring` audit-repair mode) also write `BEL` records via the same operation.

The patch engine at `tools/patch-engine/src/envelope/schema.ts` currently enumerates `create_*_record` operations for STENT, STINT, SF, SE, OBL, CNSQ, THR, SREL, STLOC, STOBJ, BR, PG, CHC, SLT (verified by `grep "create_.*_record" tools/patch-engine/src/envelope/schema.ts`). The `create_bel_record` operation is absent; without it, the patch engine rejects any plan containing BEL creation as an unknown op.

The greenfield plan also deletes the `ARCTRACE` record class. If `create_arctrace_record` is present in the schema, this ticket removes it.

## Assumption Reassessment (2026-05-13)

1. **Patch-engine op enumeration verified.** `tools/patch-engine/src/envelope/schema.ts` is the authoritative op union; current entries include `create_stent_record`, `create_sf_record`, `create_se_record`, `create_obl_record`, `create_cnsq_record`, `create_thr_record`, `create_srel_record`, `create_stint_record`, `create_stloc_record`, `create_stobj_record`, `create_br_record`, `create_pg_record`, `create_chc_record`, `create_slt_record` (per grep at gap-filler time).
2. **`StoryRecordPayload` shape parity.** `create_bel_record` uses the same `StoryRecordPayload` shape as sibling story-bundle creates (per `OperationBase<"create_stent_record", StoryRecordPayload>` pattern in the existing schema). No new payload type needed.
3. **Cross-skill schema parity.** The `BEL` record schema lives in `.claude/skills/_shared-templates/story-state-contract.md` §4.1 (12 fields total). The patch-engine writer must respect this schema; the `record_schema_compliance` validator (VALENH-011) enforces it.
4. **FOUNDATIONS principle.** Realizes FOUNDATIONS §Story Bundles §6 (rebuilt-family record-class inventory adds `BEL` per the greenfield plan's §F.1 stale-reference cleanup of FOUNDATIONS §Story Bundles §6); the patch op is the write-path execution of that doctrine.
5. **HARD-GATE / canon-write impact.** None. The patch engine targets story-bundle scope (`worlds/<slug>/stories/<story-slug>/_source/beliefs/BEL-NNNN.yaml`), not world canon scope. Hook 3 enforces story-bundle YAML writes through the engine (per FOUNDATIONS §Canonical Storage Layer + CLAUDE.md non-negotiables).
6. **Schema extension impact.** Adding `create_bel_record` to the op union is additive. Dropping `create_arctrace_record` (if present) is removal — verify the op is not exercised by any production world before merging; per the greenfield plan §B and the legacy-removal pass, no live ARCTRACE records exist.
7. **Rename / removal blast radius.** `grep -rn "create_arctrace_record\|create_arc_trace_record" tools/` identifies removal sites: the schema op union, any test fixture, any apply-handler dispatch table. Validator references (VALENH-011 ticket scope) handled separately.
8. **Adjacent contradictions.** `tools/world-mcp/src/tools/validate-patch-plan.ts` likely contains the pre-apply validation shape for each op; ensure the validator coverage extends to `create_bel_record` parity with sibling ops (BEL is a new branch in the dispatch).

## Architecture Check

1. **Additive op registration** is the minimal change. The existing schema is enumerated explicitly; abstraction into a generic "create story-bundle record" op was considered and rejected because per-class type-safety is the load-bearing property of the current shape — collapsing into a generic op would break TypeScript's exhaustiveness checks on the dispatch table.
2. **No backwards-compatibility shim** for `create_arctrace_record`. The greenfield plan deletes the class; no consumer remains.

## Verification Layers

1. **`create_bel_record` op accepted**: a patch plan containing one `create_bel_record` op with a valid `BEL-NNNN` id and conformant `StoryRecordPayload` validates and applies successfully. → patch-engine integration test.
2. **`create_arctrace_record` op rejected**: a patch plan containing `create_arctrace_record` returns a clear "unknown op" error rather than silently applying. → patch-engine integration test.
3. **End-to-end `branching-story-bootstrap` write path**: bootstrap Phase 10 patch submission succeeds when the bundle includes BEL records. → skill dry-run after this ticket and `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` both land.

## What to Change

### 1. Add `create_bel_record` to the op union

In `tools/patch-engine/src/envelope/schema.ts`:

```diff
 "create_stent_record",
 "create_sf_record",
+"create_bel_record",
 "create_se_record",
 ...
```

And the corresponding typed operation entry:

```diff
 | OperationBase<"create_stent_record", StoryRecordPayload>
 | OperationBase<"create_sf_record", StoryRecordPayload>
+| OperationBase<"create_bel_record", StoryRecordPayload>
 | OperationBase<"create_se_record", StoryRecordPayload>
```

### 2. Wire `create_bel_record` through the apply-handler dispatch

Wherever the patch engine dispatches op kinds to apply-handler functions (likely a switch / map keyed on op name), add the `create_bel_record` branch using the same shape as sibling story-bundle creates. Output path: `worlds/<world_slug>/stories/<story_slug>/_source/beliefs/BEL-NNNN.yaml`.

### 3. Drop `create_arctrace_record` if present

`grep -n "arctrace\|arc_trace" tools/patch-engine/src/envelope/schema.ts` to identify any ARCTRACE entries; remove them. The op union and the dispatch table both lose the entry.

### 4. Update `tools/world-mcp/src/tools/validate-patch-plan.ts` for op-shape coverage

The MCP-side pre-apply validator must recognize `create_bel_record` to dry-run-validate plans before submission. Add the new op shape to the validator's known-ops list.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify — add `create_bel_record`, drop `create_arctrace_record` if present)
- `tools/patch-engine/src/**/apply-*.ts` OR equivalent dispatch site (modify — wire BEL write path)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — extend dry-run validator coverage)
- `tools/patch-engine/tests/**` (modify — add BEL test cases; drop ARC_TRACE if present)
- `tools/world-mcp/tests/**` (modify — extend validator tests for BEL)

## Out of Scope

- The validator's `record_schema_compliance` check for BEL field structure — that's VALENH-011.
- BEL retrieval profiles in `tools/world-mcp/src/context-packet/shared.ts` for `story_bootstrap` task type — separate retrieval-tuning concern.
- Renaming legacy `story_page_cycle` / `storylet_pool_authoring` task types to match the rebuilt family — separate MCPENH-NNN ticket (flagged in `archive/tickets/MCPENH-040-register-bel-id-class-and-drop-arctrace.md` §Assumption Reassessment item 9).

## Acceptance Criteria

### Tests That Must Pass

1. A patch plan containing `create_bel_record` with a valid `BEL-0001` id and a `StoryRecordPayload` conforming to the shared contract §4.1 schema dry-runs and applies successfully.
2. A patch plan containing `create_arctrace_record` returns a clear unknown-op error.
3. Full `tools/patch-engine` + `tools/world-mcp` test suites pass.

### Invariants

1. The `create_bel_record` op always writes to `worlds/<world_slug>/stories/<story_slug>/_source/beliefs/BEL-NNNN.yaml` and nowhere else.
2. No silent `create_arctrace_record` accepts occur anywhere in the patch-engine code path.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/integration/create-bel-record.test.ts` (new) — happy path: create-and-read-back a BEL record via patch envelope.
2. `tools/patch-engine/tests/integration/unknown-op-rejection.test.ts` (modify or add) — assert `create_arctrace_record` is rejected.
3. `tools/world-mcp/tests/integration/validate-patch-plan.test.ts` (modify) — extend with `create_bel_record` validation coverage.

### Commands

1. `cd tools/patch-engine && npm test` — patch-engine suite passes.
2. `cd tools/world-mcp && npm test` — MCP suite passes.
3. `grep -rn "create_arctrace_record\|create_arc_trace_record" tools/patch-engine/src/` — returns zero matches.
