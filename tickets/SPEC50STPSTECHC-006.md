# SPEC50STPSTECHC-006: World-index page + event-completion edges

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser + edge-type registry).
**Deps**: None

## Problem

`tools/world-index/src/parse/atomic.ts` has no `edgesForPage` function and incomplete event-edge extraction. `PG.state_snapshot.active_records`, `PG.visible_affordances[].grounded_in`, and `PG.emitted_choices` are never indexed; `SE.state_delta.close` is not extracted (only `create`/`supersede` are, at `atomic.ts:987-993`); `SE.state_relations[]`, `SE.commitment.alias_bindings`, and `SE.record_introductions[].record_id` (as an introduction edge to the created record) are un-indexed. Page-state → choice/page-plan trace and event-effect queries therefore require raw `_source/` sweeps.

## Assumption Reassessment (2026-05-19)

1. Codebase: `atomic.ts:987-993` extracts `state_delta_create` / `state_delta_supersede` only; `record_introductions` is read at `atomic.ts:995-1003` but the created record id is not emitted as an introduction edge; no `edgesForPage` function exists. Verified this session.
2. Specs/contract: SPEC-50 §C.3/§C.4; edge names follow the existing one-edge-per-resolved-reference pattern.
3. Cross-artifact boundary: parser (`atomic.ts`) + edge-type registry (`schema/types.ts` + `index/edges.ts`) must register the new page/event edge types.

## Architecture Check

1. Mechanical extraction additions mirroring the existing `state_delta_create`/`state_delta_supersede` pattern; grouping page + event-completion edges (the "completion" set) in one ticket keeps it a coherent reviewable diff distinct from the archived CHC/SLT exploitation core (`archive/tickets/SPEC50STPSTECHC-005.md`).
2. No shim — purely additive edge extraction.

## Verification Layers

1. `page_active_record` / `page_visible_affordance_record` / `page_emitted_choice` edges emit -> parser test on a PG fixture.
2. `event_state_delta_close` / `event_state_relation_target` / `event_alias_binding` / `event_introduces_record` edges emit -> parser test on an SE fixture.

## What to Change

### 1. edgesForPage (C.3)

`page_active_record` (one per `PG.state_snapshot.active_records.<class>[]`), `page_visible_affordance_record` (one per `PG.visible_affordances[].grounded_in`), `page_emitted_choice` (one per `PG.emitted_choices[]`).

### 2. Event-edge completion (C.4)

`event_state_delta_close` (one per `SE.state_delta.close[]`, mirroring the create/supersede extraction at `atomic.ts:987-993`), `event_state_relation_target` (one per `SE.state_relations[].target_record`), `event_alias_binding` (one per `SE.commitment.alias_bindings` value), `event_introduces_record` (one per `SE.record_introductions[].record_id`).

### 3. Edge-type registry

Register the new edge-type names in `tools/world-index/src/schema/types.ts` + `tools/world-index/src/index/edges.ts`.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/src/index/edges.ts` (modify)
- `tools/world-index/tests/` page + event edge fixtures (new or modify)

## Out of Scope

- Choice + storylet exploitation edges + legacy obligation removal (`archive/tickets/SPEC50STPSTECHC-005.md`).
- The edge-parity test (SPEC50STPSTECHC-007).

## Acceptance Criteria

### Tests That Must Pass

1. PG fixture produces `page_active_record` / `page_visible_affordance_record` / `page_emitted_choice` edges.
2. SE fixture produces `event_state_delta_close` / `event_state_relation_target` / `event_alias_binding` / `event_introduces_record` edges.
3. `npm test --prefix tools/world-index` green.

### Invariants

1. `SE.state_delta.close` is indexed with the same one-edge-per-reference discipline as `create`/`supersede`.
2. Every new edge is one-per-resolved-reference; no novel edge semantics introduced.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/` — page + event edge extraction fixtures.

### Commands

1. `npm run build --prefix tools/world-index`
2. `npm test --prefix tools/world-index`
