# SPEC61PROSURSCH-002: World-index node types + directory enumeration for pressure/world-proposal surfaces

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (NODE_TYPES, directory enumeration, prose parse mapping); no impact on existing node types or enumerated directories.
**Deps**: None

## Problem

For the proposal/audit/pressure surfaces to be structurally validated (SPEC61PROSURSCH-003) and for the approval-semantics validator (SPEC61PROSURSCH-004) to see them, the world-index must parse them as typed records. The `proposals/`, `audits/`, and `audits/AU-*/retcon-proposals/` directories are **already** enumerated and their node types (`proposal_card`, `proposal_batch`, `retcon_proposal_card`, `audit_record`) already exist; the `pressure-events/` and `world-proposals/` surfaces are not yet enumerated and need new node types.

## Assumption Reassessment (2026-05-21)

1. Verified against the codebase (this session): `tools/world-index/src/schema/types.ts` NODE_TYPES already contains `proposal_card`, `proposal_batch`, `retcon_proposal_card`, `audit_record` (lines ~21–26). `tools/world-index/src/enumerate.ts` already walks `proposals/`, `proposals/batches/`, `audits/`, and `audits/AU-*/retcon-proposals/` (lines ~181–198). The genuinely-new work is therefore narrower than SPEC-61 §2.2's full directory list implies: add the four **new** node types (`pressure_event_card`, `pressure_event_sidecar_proposal`, `world_proposal_card`, `world_proposal_batch`) and enumerate only `pressure-events/`, `pressure-events/batches/`, `world-proposals/`, and `world-proposals/batches/`.
2. Verified against the spec: SPEC-61 §2.2 explicitly notes the four pre-existing node types are reused and the four new ones are added; §2.2's mapping clarification states `pressure-events/batches/` reuses the `proposal_batch` node type + `proposal-batch.schema.json` (so nine §1 surfaces map to eight node types) unless §6's frontmatter-alignment check splits the EPE batch into a ninth type.
3. Cross-artifact boundary under audit: the world-index parse contract (`enumerate.ts` directory walk → `parse/prose.ts` dir→node_type assignment). Before adding new mappings, confirm in `parse/prose.ts` how `proposals/` and `audits/` files are currently assigned node types (the `character-proposals` precedent lives at `prose.ts` lines ~16/24/119/123) so the new `pressure-events/`/`world-proposals/` mappings follow the same shape.

## Architecture Check

1. Mirroring the established `character-proposals` enumeration + parse-mapping precedent keeps the new surfaces consistent with how every other hybrid proposal surface is parsed, so no novel parse path is introduced.
2. No backwards-compatibility shims — only additive NODE_TYPES entries + additive directory-walk arms; existing enumeration is untouched.

## Verification Layers

1. The four new node types appear in NODE_TYPES -> codebase grep-proof (`grep pressure_event_card tools/world-index/src/schema/types.ts`).
2. Files under `pressure-events/` and `world-proposals/` parse to their assigned node types -> skill-dry-run equivalent: `world-index build <fixture-world>` over a fixture containing those surfaces, then inspect the index for the new node types.
3. `pressure-events/batches/` files parse to `proposal_batch` (per §2.2 mapping) unless §6 split applies -> codebase grep-proof + index inspection.

## What to Change

### 1. Add four node types

In `tools/world-index/src/schema/types.ts` NODE_TYPES, add `pressure_event_card`, `pressure_event_sidecar_proposal`, `world_proposal_card`, `world_proposal_batch`.

### 2. Enumerate the new directories

In `tools/world-index/src/enumerate.ts`, add directory-walk arms for `pressure-events/`, `pressure-events/batches/`, `world-proposals/`, `world-proposals/batches/`, mirroring the existing `proposals/` + `proposals/batches/` arms.

### 3. Add prose parse mappings

In `tools/world-index/src/parse/prose.ts`, map each new directory + filename pattern to its node type: `pressure-events/EPE-*.md` → `pressure_event_card`; `pressure-events/EPE-*.proposal.md` → `pressure_event_sidecar_proposal`; `pressure-events/batches/BATCH-*.md` → `proposal_batch` (per §2.2 mapping); `world-proposals/NWP-*.md` → `world_proposal_card`; `world-proposals/batches/NWB-*.md` → `world_proposal_batch`.

## Files to Touch

- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/enumerate.ts` (modify)
- `tools/world-index/src/parse/prose.ts` (modify)

## Out of Scope

- `RECORD_TYPE_TO_SCHEMA` wiring + the eight schema files (SPEC61PROSURSCH-001 / -003).
- Adding these surfaces to `list_records` / `get_record_schema` retrieval — EPE non-indexing-for-retrieval is deliberate (SPEC-61 §2.2 blockquote); this ticket adds parse-side node typing for validator coverage only, not a retrieval surface.
- The approval-semantics validator (SPEC61PROSURSCH-004).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/world-index run build` succeeds.
2. `npm --prefix tools/world-index test` passes (existing world-index tests + any new enumeration test).
3. `world-index build` over a fixture world containing `pressure-events/` and `world-proposals/` surfaces produces nodes typed `pressure_event_card` / `pressure_event_sidecar_proposal` / `world_proposal_card` / `world_proposal_batch`.

### Invariants

1. EPE base cards remain allocator-tracked but absent from `list_records` / `get_record_schema` (retrieval surface unchanged).
2. Pre-existing enumeration of `proposals/`, `audits/`, `retcon-proposals/` is unchanged (no regression to existing node typing).

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/` — add an enumeration test asserting the four new directory patterns parse to the four new node types. — covers What to Change §2/§3.

### Commands

1. `npm --prefix tools/world-index test`
2. `npm --prefix tools/world-index run build`
