# SPEC92SCERANPRO-003: create_scn_record patch-engine op + supersession

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine` (new op `create_scn_record` + SCN supersession; op-spec, envelope, commit-order, apply dispatch).
**Deps**: SPEC92SCERANPRO-002

## Problem

SCN records are engine-routed — Shape B story-bundle writes route through the patch engine (FOUNDATIONS §Story Bundles §4). The patch engine needs a `create_scn_record` op (and the standard supersession path for SCN range/status changes) modeled on the existing `create_pg_record` / `create_slt_record` ops.

## Assumption Reassessment (2026-05-28)

1. Existing `create_*_record` ops span `tools/patch-engine/src/ops/story-record-specs.ts`, `envelope/schema.ts`, `commit/order.ts`, and `apply.ts` (verified via grep for `create_pg_record` / `create_slt_record`). `create_scn_record` follows the same pattern. The op writes to `worlds/<slug>/stories/<slug>/_source/scenes/SCN-<n>.yaml`.
2. SPEC-92 §3 defines the SCN record the op writes (engine-routed; append-only with supersession for range/status). It depends on the `story-scene.schema.json` landed in -002 for record-shape validation.
3. Cross-artifact boundary under audit: the op produces records validated by `story-scene.schema.json` (-002, the Dep); the op is consumed by `branching-story-scene-plan` (-008, which submits it) and surfaced through world-mcp dispatch (-004).
4. FOUNDATIONS §Story Bundles §4 / §4a: SCN is a non-authoritative render-membership record — the op writes membership / status / paths, NOT causal state. The op must not be wired into any causal-state-delta path; SCN is not a PG or SE.
5. HARD-GATE / canon-write-ordering surface: the op touches patch-engine commit ordering (`commit/order.ts`) and the op-kind envelope. Confirm it preserves append-only discipline and does NOT write world-canon `_source/` or touch the Mystery Reserve firewall — SCN is story-bundle scope; there is no MR interaction.

## Architecture Check

1. Reusing the `create_*_record` op pattern keeps SCN writes inside the established story-bundle Shape B path; no new write mechanism. Supersession (not in-place edit) for range/status changes preserves append-only discipline.
2. No shims: `create_scn_record` is a new op-kind enum member + op-spec entry, not a special case inside existing ops.

## Verification Layers

1. `create_scn_record` writes a schema-valid SCN record -> patch-engine apply test + schema validation.
2. SCN supersession produces a new record superseding the prior (append-only) -> patch-engine test.
3. Malformed op-kind rejected -> compile-reject test.
4. Op writes only story-bundle `_source/scenes/`, never world-canon -> codebase grep-proof + FOUNDATIONS §4 alignment check.

## What to Change

### 1. ops/story-record-specs.ts (modify)

Add the `create_scn_record` op spec (record class SCN, target subdir `scenes`, schema `story-scene.schema.json`, required fields) + the SCN supersession spec.

### 2. envelope/schema.ts (modify)

Add `create_scn_record` to the op-kind enum.

### 3. commit/order.ts (modify)

Place SCN writes in the commit order after the PGs they reference (SCN membership references already-committed PGs).

### 4. apply.ts (modify)

Dispatch `create_scn_record`.

## Files to Touch

- `tools/patch-engine/src/ops/story-record-specs.ts` (modify)
- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/patch-engine/tests/ops/create-scn-record.test.ts` (new)

## Out of Scope

- world-mcp dispatch + allocator (-004).
- world-index parsing (-005).
- The scene-plan skill that submits the op (-008).

## Acceptance Criteria

### Tests That Must Pass

1. `create_scn_record` applies and writes a schema-valid SCN record to `_source/scenes/`.
2. SCN supersession appends a superseding record (no in-place mutation).
3. `cd tools/patch-engine && npm run build && npm test && npm run test:integration` green; compile-reject test passes.

### Invariants

1. SCN writes are append-only; range/status changes go through supersession.
2. The op never writes world-canon `_source/` and never touches the MR firewall.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/create-scn-record.test.ts` — new; apply + supersession + schema validity.

### Commands

1. `cd tools/patch-engine && npm run build && npm test`
2. `cd tools/patch-engine && npm run test:integration && npm run test:compile-reject`
