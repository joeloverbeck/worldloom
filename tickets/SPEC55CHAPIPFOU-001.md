# SPEC55CHAPIPFOU-001: Actionable hybrid-record error for field-projection MCP tools

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp` (`get_record_field`, `get_records_field` error path); no behavior change for atomic/story-bundle field reads
**Deps**: None

## Problem

`get_record_field` / `get_records_field` are atomic / story-bundle field readers. When handed a hybrid record id (`CHAR`, `DA`, `PA`, `NCP`, `NCB`) they fall through `parseRecordBody` and return the generic error `"Node 'NCP-0001' is not an atomic record node."` (`tools/world-mcp/src/tools/get-record.ts:290-297`, reached via `get-record-field.ts`). The message gives the caller no route forward — it does not say that hybrid records are projected through `get_record(record_id, section_path='frontmatter.<field>'|'body.<section>')`. SPEC-55 Phase 1 (audit Medium #4) requires the error to point the operator at the correct tool.

## Assumption Reassessment (2026-05-20)

1. Codebase: `tools/world-mcp/src/tools/get-record-field.ts` calls `parseRecordBody(resolved.row)` without first checking whether the id is hybrid; `parseRecordBody` (in `get-record.ts`, ~lines 290-297) returns the generic "is not an atomic record node" error for hybrid node types. `get-records-field.ts` delegates to `getRecordField`, so it inherits whatever error `get-record-field.ts` produces. The hybrid id family is already recognized in `get-record.ts` as `HYBRID_RECORD_ID_PATTERN = /^(?:CHAR|DA|PA|NCP|NCB)-\d+$/` (~line 118) — reuse the same family, do not invent a new pattern.
2. Spec: SPEC-55 §Phase 1 names the two files and the required actionable message; §Out of Scope confirms no body-section validation or schema change is in scope here.
3. Cross-skill boundary under audit: the MCP retrieval tool contract — the documented split where atomic/story records use `get_record_field` and hybrid records (`CHAR`/`DA`/`PA`/`NCP`/`NCB`) use `get_record(section_path=…)` per FOUNDATIONS §Canonical Storage Layer (Read discipline). This ticket sharpens the error at that boundary; it does not move the boundary.
4. FOUNDATIONS principle motivating this ticket: §Machine-Facing Layer item 2 (Retrieval MCP Server — typed retrieval with actionable failures). The change makes a dead-end error self-correcting; it does not alter what data any tool returns.

## Architecture Check

1. Detecting the hybrid id family at the top of `get-record-field.ts` and returning a targeted error is cleaner than letting the call fall through to `parseRecordBody`'s generic atomic-only message: the failure is named at the surface the caller invoked, with the remedy inline. `get-records-field.ts` needs no separate logic — it delegates, so the per-id error propagates through its batch entries automatically.
2. No backwards-compatibility shim: the generic error is replaced for the hybrid-id family only; atomic and story-bundle ids keep their existing code path and messages unchanged.

## Verification Layers

1. Hybrid id yields actionable error → codebase grep-proof + `get-record-field.test.ts` assertion (error message names `get_record(section_path=…)` for each of CHAR/DA/PA/NCP/NCB).
2. Atomic/story field reads unchanged → existing `get-record-field.test.ts` / `get-records-field.test.ts` cases continue to pass (no regression).
3. Batch path surfaces the actionable error per-id → `get-records-field.test.ts` mixed atomic+hybrid assertion.

## What to Change

### 1. `get-record-field.ts` — detect hybrid ids before atomic parse

Before calling `parseRecordBody`, test the resolved record id against the hybrid family (`^(?:CHAR|DA|PA|NCP|NCB)-\d+$`, reusing/importing the existing `HYBRID_RECORD_ID_PATTERN` rather than redefining it). When it matches, return an error whose message states that hybrid records are projected through `get_record(record_id, section_path='frontmatter.<field>')` or `get_record(record_id, section_path='body.<section>')`, not via `get_record_field`.

### 2. `get-records-field.ts` — inherit + assert

No new logic; confirm the delegation surfaces the per-id actionable error in each batch entry. Add the batch-path assertion in the test (below).

## Files to Touch

- `tools/world-mcp/src/tools/get-record-field.ts` (modify)
- `tools/world-mcp/src/tools/get-records-field.ts` (modify — only if a small re-export/import is needed; otherwise no source change, test-only)
- `tools/world-mcp/tests/tools/get-record-field.test.ts` (modify — add hybrid-id actionable-error cases)
- `tools/world-mcp/tests/tools/get-records-field.test.ts` (modify — add mixed atomic+hybrid batch case)

## Out of Scope

- Making `get_record_field` actually project hybrid sections (the documented design is that hybrid projection lives in `get_record`; this ticket only improves the rejection message).
- Any NCP body-section validation, schema change, or anti-flattening work (rejected in SPEC-55 §Out of Scope).
- The story-pipeline seed guard (SPEC55CHAPIPFOU-002) and schema-doc/regression-test work (SPEC55CHAPIPFOU-003).

## Acceptance Criteria

### Tests That Must Pass

1. `get_record_field({ record_id: "NCP-0001", field: "…" })` returns an error whose message names `get_record(section_path='frontmatter.<field>'|'body.<section>')`, asserted for each of `CHAR`, `DA`, `PA`, `NCP`, `NCB`.
2. `get_records_field` over a mix of atomic and hybrid ids returns the actionable error in the hybrid entries and normal results in the atomic entries.
3. `npm test --prefix tools/world-mcp` passes (no regression in atomic/story field reads).

### Invariants

1. Atomic-record and story-bundle field reads keep their existing code path and output (the new branch fires only for the hybrid id family).
2. The hybrid id family used here is exactly the one `get-record.ts` already recognizes — no second, drifting definition.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/get-record-field.test.ts` — add per-prefix (CHAR/DA/PA/NCP/NCB) actionable-error assertions.
2. `tools/world-mcp/tests/tools/get-records-field.test.ts` — add a mixed atomic+hybrid batch case asserting per-id error/result.

### Commands

1. `npm test --prefix tools/world-mcp`
2. `npm run build --prefix tools/world-mcp` (typecheck — the build script runs `tsc`)
3. Narrower boundary: the change is confined to `tools/world-mcp`, so the package test+build is the correct verification scope; no cross-package run is required.
