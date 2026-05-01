# ENGINESYNC-004: Operation-kind runtime manifest parity

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine` runtime exports and `tools/world-mcp` envelope schema introspection
**Deps**: `archive/tickets/ENGINESYNC-003-envelope-and-per-op-schema-introspection.md`

## Problem

ENGINESYNC-003 added `mcp__worldloom__describe_envelope_schema` so agents can retrieve the deployed patch-plan envelope and per-operation payload shapes. That implementation currently carries a local `OPERATION_KINDS` tuple in `tools/world-mcp/src/tools/describe-envelope-schema.ts`, while the patch engine owns the canonical `OperationKind` union in `tools/patch-engine/src/envelope/schema.ts`.

Type-only exports erase at runtime, so a future patch-engine operation can be added to `PatchOperation` and `OperationKind` without forcing the MCP schema-introspection manifest to update. The machine-facing schema path should not rely on a manually mirrored operation vocabulary.

## Assumption Reassessment (2026-05-01)

1. `tools/world-mcp/src/tools/describe-envelope-schema.ts` defines a runtime `OPERATION_KINDS` tuple and derives its local `OperationKind` type from that tuple.
2. `tools/patch-engine/src/envelope/schema.ts` currently owns the `OperationKind` type union and `PatchOperation` union, but does not expose a runtime operation-kind tuple.
3. The shared boundary under audit is patch-engine operation vocabulary -> world-mcp envelope schema introspection.
4. `docs/FOUNDATIONS.md` Tooling Recommendation requires agents to use machine-readable interfaces rather than prose-only contracts; a drift-prone manual manifest weakens that contract.
5. This ticket does not change canon-write ordering, approval-token verification, HARD-GATE semantics, Mystery Reserve handling, or any world-level canon file.
6. `tickets/PATCHENG-001-converge-inv-ids-verifier-and-per-op-check.md` and `tickets/PATCHENG-002-validate-patch-plan-cli-parity.md` mention schema introspection as out of scope, but they do not own operation-kind runtime manifest parity.
7. Adjacent contradiction classified as future cleanup: ENGINESYNC-003 is complete and archive-ready, but the new introspection surface exposed that operation-kind vocabulary should have one runtime authority.

## Architecture Check

1. Centralizing the runtime operation-kind tuple in `tools/patch-engine` keeps the operation vocabulary with the engine that validates and applies those operations, then lets `tools/world-mcp` render the deployed manifest from that single source.
2. No backwards-compatibility aliasing/shims are introduced; remove the local world-mcp duplicate or reduce it to a direct re-export of the patch-engine-owned tuple.

## Verification Layers

1. Patch-engine operation vocabulary has one source of truth -> codebase grep-proof that `OPERATION_KINDS` is defined in `tools/patch-engine` and not manually duplicated in `tools/world-mcp`.
2. `OperationKind` stays aligned with the runtime tuple -> TypeScript build/typecheck for `tools/patch-engine`.
3. `describe_envelope_schema` uses the patch-engine runtime tuple -> focused world-mcp unit test for full manifest and filtered `op_kind`.
4. Server registration and dispatch still expose the tool correctly -> existing world-mcp list-tools and dispatch tests.

## What to Change

### 1. Patch-engine operation-kind manifest

Add or centralize an exported `OPERATION_KINDS` runtime tuple in `tools/patch-engine/src/envelope/schema.ts`, and derive `OperationKind` from that tuple so runtime and type-level vocabulary cannot drift inside the package.

### 2. Package export surface

Export the runtime tuple from the patch-engine package entry point used by consumers, currently `tools/patch-engine/src/apply.ts`, alongside the existing type exports.

### 3. MCP schema introspection consumer

Update `tools/world-mcp/src/tools/describe-envelope-schema.ts` to import the patch-engine-owned `OPERATION_KINDS` tuple, remove the local manual duplicate, and continue exporting any local helper type needed by the server.

### 4. Regression coverage

Update or add tests proving the schema manifest still includes every operation kind, filtered lookups still work, and no world-mcp-local manual tuple remains.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/apply.ts` (modify)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/world-mcp/tests/server/dispatch.test.ts` (modify if imports or expected names change)
- `tools/world-mcp/tests/server/list-tools.test.ts` (modify only if inventory assertions require refresh)

## Out of Scope

- Adding, renaming, or removing patch operation kinds.
- Changing patch operation payload semantics.
- Changing approval-token verification, pre-apply validation, submit behavior, or write ordering.
- Adding compatibility aliases for old operation names.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js`

### Invariants

1. The operation-kind runtime manifest is owned by `tools/patch-engine`, not manually mirrored by `tools/world-mcp`.
2. `describe_envelope_schema` reports the same operation vocabulary that the patch engine validates and applies.
3. The change is read-only/schema-surface work and does not weaken canon mutation gates.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — verify the manifest and filtered schema path consume the patch-engine-owned operation-kind tuple.
2. `tools/world-mcp/tests/server/dispatch.test.ts` — keep dispatch coverage for the introspection tool if import or export shape changes.
3. `None in world content — this is package-runtime manifest work and does not touch canon records.`

### Commands

1. `cd tools/patch-engine && npm test`
2. `cd tools/world-mcp && npm run build`
3. `cd tools/world-mcp && node --test dist/tests/tools/describe-envelope-schema.test.js dist/tests/server/dispatch.test.js dist/tests/server/list-tools.test.js`
