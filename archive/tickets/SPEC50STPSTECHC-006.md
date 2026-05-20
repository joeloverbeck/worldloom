# SPEC50STPSTECHC-006: World-index page + event-completion edges

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index` (parser + edge-type registry), machine-facing edge docs.
**Deps**: None

## Problem

At intake, `tools/world-index/src/parse/atomic.ts` had no `edgesForPage` function and incomplete event-edge extraction. `PG.state_snapshot.active_records`, `PG.visible_affordances[].grounded_in`, and `PG.emitted_choices` were not indexed; `SE.state_delta.close`, `SE.state_relations[]`, `SE.commitment.alias_bindings`, and `SE.record_introductions[].record_id` were also un-indexed. This ticket closes those page-state -> choice/page-plan trace and event-effect query gaps.

## Assumption Reassessment (2026-05-20)

1. Codebase at intake: `tools/world-index/src/parse/atomic.ts` extracted `state_delta_create` / `state_delta_supersede` only; `record_introductions` was read for `creation_evidence` but the created record id was not emitted as an introduction edge; no `edgesForPage` function existed. Verified this session after SPEC50STPSTECHC-005.
2. Specs/contract: SPEC-50 §C.3/§C.4; edge names follow the existing one-edge-per-resolved-reference pattern.
3. Cross-artifact boundary: parser (`atomic.ts`) + edge-type registry (`schema/types.ts`) must register the new page/event edge types. `tools/world-index/src/index/edges.ts` persists free-text edge values and has no registry list, so it is not an owned edit for this ticket.
4. Package proof baseline: `npm run build` in `tools/world-index` passed before source edits. Existing ignored package artifacts `tools/world-index/dist/` and `tools/world-index/node_modules/` were already present.

## Architecture Check

1. Mechanical extraction additions mirroring the existing `state_delta_create`/`state_delta_supersede` pattern; grouping page + event-completion edges (the "completion" set) in one ticket keeps it a coherent reviewable diff distinct from the archived CHC/SLT exploitation core (`archive/tickets/SPEC50STPSTECHC-005.md`).
2. No shim — purely additive edge extraction.

## Verification Layers

1. `page_active_record` / `page_visible_affordance_record` / `page_emitted_choice` edges emit -> parser test on a PG fixture.
2. `event_state_delta_close` / `event_state_relation_target` / `event_alias_binding` / `event_introduces_record` edges emit -> parser test on an SE fixture.

## Landed Changes

### 1. edgesForPage (C.3)

`page_active_record` (one per `PG.state_snapshot.active_records.<class>[]`), `page_visible_affordance_record` (one per `PG.visible_affordances[].grounded_in`), `page_emitted_choice` (one per `PG.emitted_choices[]`).

### 2. Event-edge completion (C.4)

`event_state_delta_close` (one per `SE.state_delta.close[]`, mirroring the create/supersede extraction at `atomic.ts:987-993`), `event_state_relation_target` (one per `SE.state_relations[].target_record`), `event_alias_binding` (one per `SE.commitment.alias_bindings` value), `event_introduces_record` (one per `SE.record_introductions[].record_id`).

### 3. Edge-type registry

Registered the new edge-type names in `tools/world-index/src/schema/types.ts`. `tools/world-index/src/index/edges.ts` did not need an edit because it stores `edge_type` as free text.

## Files to Touch

- `tools/world-index/src/parse/atomic.ts` (modify)
- `tools/world-index/src/schema/types.ts` (modify)
- `tools/world-index/tests/parse/atomic-edges-for-page-and-event.test.ts` (new)
- `tools/world-index/tests/types.test.ts` (modify)
- `tools/world-index/tests/integration/spec46-story-bundle-edges-integration.test.ts` (modify)
- `tools/world-index/tests/integration/spec47-stplan-stemo-edges-integration.test.ts` (modify)
- `tools/world-index/tests/story-bundle-edges.test.ts` (modify)
- `tools/world-index/tests/structured-edges.test.ts` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

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

## Outcome

Completed: 2026-05-20

- Added `edgesForPage` extraction for `page_active_record`, `page_visible_affordance_record`, and `page_emitted_choice`.
- Completed `SE` edge extraction with `state_delta_close`, `event_state_relation_target`, `event_alias_binding`, and `event_introduces_record`.
- Registered the new edge types in `tools/world-index/src/schema/types.ts`, raising the story-bundle edge registry from 58 to 65 entries.
- Added focused parser coverage for the new PG and SE edge surfaces.
- Updated same-seam registry/count tests, existing event-edge expectations, SPEC-46/SPEC-47 integration count assertions, and `docs/MACHINE-FACING-LAYER.md` to the 65-edge story-bundle contract.

## Verification Result

- `npm run build` in `tools/world-index` before source edits — PASS.
- `npm run build` in `tools/world-index` after implementation — PASS.
- `node --test dist/tests/parse/atomic-edges-for-page-and-event.test.js` in `tools/world-index` — PASS, 2 tests.
- `npm test` in `tools/world-index` initially exposed same-seam stale proof expectations: old 58-edge assertions in SPEC-46/SPEC-47 integration tests and old event-edge expected rows in `story-bundle-edges.test.ts` / `structured-edges.test.ts`.
- `node --test dist/tests/parse/atomic-edges-for-page-and-event.test.js dist/tests/integration/spec46-story-bundle-edges-integration.test.js dist/tests/integration/spec47-stplan-stemo-edges-integration.test.js dist/tests/story-bundle-edges.test.js dist/tests/structured-edges.test.js dist/tests/types.test.js` in `tools/world-index` — PASS, 31 tests.
- `npm test` in `tools/world-index` after proof-surface truthing — PASS, 123 tests.

## Deviations

- `tools/world-index/src/index/edges.ts` was not edited because live reassessment confirmed it persists free-text edge values and has no edge-type registry.
- `docs/MACHINE-FACING-LAYER.md` was added to the landed file set because the public edge inventory is a same-seam consumer of the story-bundle edge registry.
