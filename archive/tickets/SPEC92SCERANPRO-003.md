# SPEC92SCERANPRO-003: create_scn_record patch-engine op + supersession

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine` (new ops `create_scn_record` + `supersede_scn_record`; op-spec, envelope/allocation schema, commit-order, stage/apply/receipt dispatch) plus same-seam SCN `supersedes` contract/schema repair.
**Deps**: archive/tickets/SPEC92SCERANPRO-002.md

## Problem

At intake, SCN records were specified as engine-routed Shape B story-bundle writes (FOUNDATIONS §Story Bundles §4), but the patch engine had no `create_scn_record` op or standard supersession path for SCN range/status changes.

## Assumption Reassessment (2026-05-28)

1. Existing `create_*_record` ops span `tools/patch-engine/src/ops/story-record-specs.ts`, `envelope/schema.ts`, `commit/order.ts`, `commit/temp-file.ts`, `apply.ts`, and `pre-apply-checks/id-allocation-race.ts` (verified via grep for `create_pg_record` / `create_slt_record`). `create_scn_record` and `supersede_scn_record` follow the same generic story-record pattern. The ops write to `worlds/<slug>/stories/<slug>/_source/scenes/SCN-<n>.yaml`.
2. SPEC-92 §3 defines the SCN record the op writes (engine-routed; append-only with supersession for range/status). It depends on the `story-scene.schema.json` landed in -002 for record-shape validation.
3. Cross-artifact boundary under audit: the ops produce records validated by `story-scene.schema.json` (-002, the Dep); they are consumed by `branching-story-scene-plan` (-008, which submits them) and surfaced through world-mcp dispatch (-004).
4. FOUNDATIONS §Story Bundles §4 / §4a: SCN is a non-authoritative render-membership record — the op writes membership / status / paths, NOT causal state. The op must not be wired into any causal-state-delta path; SCN is not a PG or SE.
5. HARD-GATE / canon-write-ordering surface: the ops touch patch-engine commit ordering (`commit/order.ts`), staging dispatch (`commit/temp-file.ts`), id-allocation race checks, receipt metadata (`apply.ts`), and the op-kind envelope. Confirm they preserve append-only discipline and do NOT write world-canon `_source/` or touch the Mystery Reserve firewall — SCN is story-bundle scope; there is no MR interaction.
6. Baseline before source edits: `cd tools/patch-engine && npm run build` passed, and `cd tools/patch-engine && npm test` passed 99 tests. Pre-existing ignored package artifacts were `tools/patch-engine/dist/` and `tools/patch-engine/node_modules/`.
7. Same-seam schema mismatch found during implementation: `story-scene.schema.json` and the shared template did not include `supersedes`, so a standard supersession record would be rejected by `record_schema_compliance` even though SPEC-92 and this ticket require SCN range/status supersession. The active ticket absorbs the minimal contract/schema repair: add optional `supersedes: SCN-* | null` to the SCN schema/template and validator tests; do not alter other SCN fields.

## Architecture Check

1. Reusing the `create_*_record` op pattern keeps SCN writes inside the established story-bundle Shape B path; no new write mechanism. Supersession (not in-place edit) for range/status changes preserves append-only discipline.
2. No shims: `create_scn_record` is a new op-kind enum member + op-spec entry, not a special case inside existing ops.

## Verification Layers

1. `create_scn_record` writes a schema-valid SCN record -> patch-engine apply test + validators schema validation.
2. SCN supersession produces a new schema-valid record superseding the prior (append-only) -> patch-engine test + validators schema validation.
3. Malformed op-kind rejected -> compile-reject test.
4. Op writes only story-bundle `_source/scenes/`, never world-canon -> codebase grep-proof + FOUNDATIONS §4 alignment check.

## Landed Changes

### 1. ops/story-record-specs.ts (modify)

Added the `create_scn_record` op spec (record class SCN, target subdir `scenes`) and the `supersede_scn_record` spec.

### 2. envelope/schema.ts (modify)

Added `scn_ids` to `IdAllocations`, and added `create_scn_record` / `supersede_scn_record` to the op-kind enum and `PatchOperation` union.

### 3. commit/order.ts (modify)

Placed SCN writes in the story-bundle create tier after PG writes so same-plan create ordering cannot stage an SCN before a PG.

### 4. commit/temp-file.ts + apply.ts (modify)

Dispatched both SCN ops through the generic story-record staging path and exposed SCN receipt metadata in `collectNewNodes`.

### 5. pre-apply-checks/id-allocation-race.ts (modify)

Added `scn_ids` to story-scoped allocation-race checking.

### 6. SCN schema/template supersession repair (modify)

Added optional `supersedes: SCN-<integer> | null` to the SCN shared template and JSON schema so `supersede_scn_record` emits a record that remains valid under pre-apply `record_schema_compliance`.

## Files to Touch

- `tools/patch-engine/src/ops/story-record-specs.ts` (modify)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/src/pre-apply-checks/id-allocation-race.ts` (modify)
- `tools/patch-engine/tests/ops/create-scn-record.test.ts` (new)
- `tools/patch-engine/tests/integration/create-scn-record.test.ts` (new)
- `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` (modify)
- `tools/validators/src/schemas/story-scene.schema.json` (modify)
- `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` (modify)
- `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` (modify)
- `.claude/skills/_shared-templates/story-record-schemas.md` (modify)
- `specs/SPEC-92-scene-range-prose-rendering-layer.md` (modify)
- `archive/tickets/SPEC92SCERANPRO-001.md` (modify)
- `archive/tickets/SPEC92SCERANPRO-002.md` (modify)

## Out of Scope

- world-mcp dispatch + allocator (-004).
- world-index parsing (-005).
- The scene-plan skill that submits the op (-008).

## Acceptance Criteria

### Tests That Must Pass

1. `create_scn_record` applies and writes a schema-valid SCN record to `_source/scenes/`.
2. `supersede_scn_record` appends a superseding record (no in-place mutation).
3. `cd tools/patch-engine && npm run build && npm test && npm run test:integration` green; compile-reject test passes.
4. `cd tools/validators && npm run build && npm test` green for the same-seam SCN schema repair.

### Invariants

1. SCN writes are append-only; range/status changes go through supersession.
2. The op never writes world-canon `_source/` and never touches the MR firewall.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-scn-record.test.ts` — new; staging path + supersession path.
2. `tools/patch-engine/tests/integration/create-scn-record.test.ts` — new; envelope validation + submit/apply receipt path.
3. `tools/patch-engine/tests/pre-apply-checks/id-allocation-race.test.ts` — modified; story-scoped `scn_ids` allocation race proof.
4. `tools/validators/tests/structural/record-schema-compliance-story-scene.test.ts` — modified; SCN `supersedes` is schema-valid.
5. `tools/validators/tests/structural/contract-schema-roundtrip.test.ts` — modified; schema field inventory includes `supersedes`.

### Commands

1. `cd tools/patch-engine && npm run build && npm test`
2. `cd tools/patch-engine && npm run test:integration && npm run test:compile-reject`
3. `cd tools/validators && npm run build && npm test`

## Outcome

Completed: 2026-05-28

The patch engine now recognizes `create_scn_record` and `supersede_scn_record` as story-bundle record operations. Both route through the generic story-record staging path, write `SCN-*.yaml` under `stories/<story>/_source/scenes/`, participate in deterministic create-tier ordering after PG creates, report `scene_record` receipt metadata, and use story-scoped `scn_ids` allocation-race checks.

The same-seam schema repair added optional `supersedes: SCN-* | null` to the SCN shared template and JSON schema so SCN supersession records remain valid under `record_schema_compliance`.

The active SPEC-92 field list and archived dependency outcomes were amended to keep the handoff truthful for downstream tickets that consume the SCN contract.

## Verification Result

1. `cd tools/patch-engine && npm run build` passed.
2. `cd tools/patch-engine && node --test dist/tests/ops/create-scn-record.test.js dist/tests/integration/create-scn-record.test.js dist/tests/pre-apply-checks/id-allocation-race.test.js dist/tests/commit/order.test.js` passed 13 focused tests.
3. `cd tools/validators && node --test dist/tests/structural/record-schema-compliance-story-scene.test.js dist/tests/structural/contract-schema-roundtrip.test.js` passed 9 focused tests.
4. `cd tools/patch-engine && npm test` passed: 106 tests, 106 pass, 0 fail.
5. `cd tools/patch-engine && npm run test:integration` passed: 3 tests, 3 pass, 0 fail.
6. `cd tools/patch-engine && npm run test:compile-reject` passed by producing the expected TypeScript errors for unsupported non-append operations.
7. `cd tools/validators && npm test` passed: 1109 tests, 1109 pass, 0 fail.

## Deviations

The drafted ticket only named `tools/patch-engine`, but implementation exposed a same-seam contract mismatch from the completed dependency: SCN supersession could not be schema-valid without a `supersedes` field. The ticket absorbed the minimal shared-template / validator-schema repair and corresponding validator tests. The patch-engine op still does not add world-mcp dispatch or allocator UI; those remain owned by SPEC92SCERANPRO-004.
