# MCPENH-039: Document ARC_TRACE `record_type` versus `node_type` vocabulary split

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — documentation-only update to machine-facing retrieval docs
**Deps**: `archive/tickets/VALENH-010-validator-framework-arc-trace-record-to-arc-trace-node-translation.md`

## Problem

At intake, VALENH-010 had fixed the validator framework so callers can use the canonical operator-facing `record_type='arc_trace_record'` while SQL queries bind the world-index storage-facing `node_type='arc_trace_node'`. The same split already existed in MCP retrieval: `list_records` accepts `arc_trace_record`, while `get_record_schema` exposes the schema-backed node type `arc_trace_node`.

Before this ticket, the live docs listed both values without explaining the boundary:

- `docs/MACHINE-FACING-LAYER.md` lists `list_records` story-bundle `record_type` values including `arc_trace_record`, and separately says `get_record_schema` includes story-bundle schemas such as `arc_trace_node`.
- `tools/world-mcp/README.md` lists `mcp__worldloom__list_records(... record_type ...)` with `arc_trace_record`, and separately lists `mcp__worldloom__get_record_schema(node_type)` with `arc_trace_node`.

That was accurate but easy to misread as an inconsistency. This ticket made the vocabulary boundary explicit so future validators, MCP docs, and package fixtures do not recreate the VALENH-010 failure mode.

## Assumption Reassessment (2026-05-12)

1. `archive/tickets/VALENH-010-validator-framework-arc-trace-record-to-arc-trace-node-translation.md` completed the validators package translation at both pre-apply and full-world read surfaces. This ticket does not own any validator code.
2. `docs/FOUNDATIONS.md` §Tooling Recommendation and §Machine-Facing Layer require machine-facing retrieval and validation surfaces to remain explicit and truthful. A documented vocabulary split supports that contract without changing behavior.
3. The shared boundary under audit is documentation for MCP/operator-facing `record_type` values versus world-index/schema-facing `node_type` values. The implementation already translates at the relevant package boundaries; this ticket only documents the convention.
4. This is documentation-only and does not touch HARD-GATE behavior, approval tokens, canon-write ordering, Mystery Reserve enforcement, or pre-apply validation semantics.
5. No active ticket currently owns this docs gap. Existing archived MCPENH tickets document adjacent retrieval enhancements, but none covers the ARC_TRACE `record_type` / `node_type` naming split exposed by VALENH-010.

## Architecture Check

1. Documenting the boundary is cleaner than renaming either vocabulary. `arc_trace_record` is the operator-facing record type used by `list_records` and validator callers; `arc_trace_node` is the schema/index node type emitted by `world-index` and consumed by `get_record_schema`.
2. No backwards-compatibility aliasing or new behavior is introduced. The docs describe the existing one-way translation rather than adding alternate names.

## Verification Layers

1. **Operator docs explain the split** -> manual review of `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md`.
2. **No behavior change** -> `git diff --check` over the edited docs.
3. **Docs still name the correct values** -> grep-proof for both `arc_trace_record` and `arc_trace_node` in the edited documentation.

## Landed Changes

### 1. Clarify `docs/MACHINE-FACING-LAYER.md`

Added a short note after the retrieval tool scope table explaining that `record_type` is the operator-facing retrieval vocabulary and `node_type` is the schema/index vocabulary. ARC_TRACE is the concrete example: callers use `arc_trace_record` for `list_records`, while `get_record_schema` and the index storage use `arc_trace_node`.

### 2. Clarify `tools/world-mcp/README.md`

Added the same convention after the tool inventory so package users understand why the two tool signatures name different values for ARC_TRACE.

## Files to Touch

- `docs/MACHINE-FACING-LAYER.md` (modify)
- `tools/world-mcp/README.md` (modify)
- `tickets/MCPENH-039-document-arc-trace-record-type-vocabulary-split.md` (modified for closeout)

## Out of Scope

- Renaming `arc_trace_record` or `arc_trace_node`.
- Changing MCP tool behavior, validator behavior, world-index parser output, or JSON Schemas.
- Adding compatibility aliases.

## Acceptance Criteria

### Tests That Must Pass

1. Manual review confirms both docs explain `record_type='arc_trace_record'` versus `node_type='arc_trace_node'`.
2. `rg -n 'arc_trace_record|arc_trace_node' docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md` shows both values in the clarified docs.
3. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tickets/MCPENH-039-document-arc-trace-record-type-vocabulary-split.md`

### Invariants

1. Documentation must not imply `arc_trace_node` is a valid `list_records.record_type`.
2. Documentation must not imply `arc_trace_record` is the storage/index `node_type`.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is manual review plus grep/whitespace checks.

### Commands

1. `rg -n 'arc_trace_record|arc_trace_node' docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md`
2. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tickets/MCPENH-039-document-arc-trace-record-type-vocabulary-split.md`

## Outcome

Completed on 2026-05-12. `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md` now explicitly document the ARC_TRACE vocabulary split: `list_records.record_type` uses operator-facing `arc_trace_record`, while `get_record_schema.node_type` and world-index storage use schema/index-facing `arc_trace_node`.

## Verification Result

1. Manual review completed for `docs/MACHINE-FACING-LAYER.md` and `tools/world-mcp/README.md`; neither doc implies `arc_trace_node` is a valid `list_records.record_type` or that `arc_trace_record` is the storage/index `node_type`.
2. `rg -n 'arc_trace_record|arc_trace_node' docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md` — passed; both values are present in the clarified docs.
3. `git diff --check -- docs/MACHINE-FACING-LAYER.md tools/world-mcp/README.md tickets/MCPENH-039-document-arc-trace-record-type-vocabulary-split.md` — passed.

## Deviations

- None.
