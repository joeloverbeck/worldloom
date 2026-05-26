# SPEC89STOEXPSTA-005: What Changed Here tab — SE rendering with state delta

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies the `tabs/WhatChangedHereTab.tsx` stub created by SPEC89STOEXPSTA-001 to render the SE that caused the current page, with its state delta and related fields
**Deps**: archive/tickets/SPEC89STOEXPSTA-001.md, archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

SPEC-89 §4.2 defines What Changed Here as the tab that answers "What caused this page to exist?" — sourced from `PG.input.resolved_event_id` → the SE record. The tab must render the selected SE, the actor → targets routing, the turn driver, the outcome route, the selected storylet (when `commitment.selected_slt_id` is non-null), the world-logic rationale, the state delta (create / supersede / close lists with links to each affected record), record introductions, creation evidence, state relations, non-propagation facts, and promotion claims (with link to the story-promotion record when present). This must be visually distinct from Current State — Current State answers "What is true now?"; What Changed Here answers "What caused this page?".

## Assumption Reassessment (2026-05-26)

1. `tabs/WhatChangedHereTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency). SE schema fields cited in §4.2 — `actor`, `targets`, `driver.kind` (turn driver), `outcome_route`, `commitment.selected_slt_id`, `world_logic_rationale`, `state_delta.{create,supersede,close}`, `record_introductions`, `state_relations`, `non_propagation_facts`, `promotion_claims` — all verified on `tools/validators/src/schemas/story-event.schema.json` during the 2026-05-26 reassessment. `PG.input.resolved_event_id` exists on the PG schema per `tools/validators/src/schemas/story-page.schema.json:40` (verified).
2. SPEC-89 §4.2 (What Changed Here tab specification). SPEC-87 `/records/:recordId` route returns the parsed SE body + recordCard view-model; this tab fetches the SE corresponding to `PG.input.resolved_event_id`.
3. Cross-skill boundary: SPEC-87's `/records/:recordId` route is the data source for the SE; SPEC-87 §5 confirms the route signature. This tab uses RecordCardCompact (from SPEC89STOEXPSTA-002) for the SE summary line at the top, then renders the structured fields below per §4.2's bullets. Cross-record links in the state-delta lists are rendered as chips that trigger the linked-record navigation primitives from SPEC89STOEXPSTA-008 (when those primitives land).

## Architecture Check

1. Tab-local fetch on tab open (rather than eager fetch when the parent panel mounts) defers the per-page-detail SE fetch until the user actually opens the tab. The alternative (eager fetch from XRayPanel) would force every page-load to additionally fetch the SE even when the user never opens the tab; lazy is cheaper.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; no fallback rendering for missing SE (when `PG.input.resolved_event_id` is null — e.g., the root PG-1 page — render a "No causal event for this page (root page or driver_records=[])" message rather than aliasing to a placeholder SE).

## Verification Layers

1. Tab renders the SE summary + structured field sections → render test with a fixture SE → vitest + RTL.
2. State-delta lists render `create[]`, `supersede[]`, `close[]` as labeled groups with chip-links to affected records → fixture test with a state_delta containing entries in all three categories.
3. When `commitment.selected_slt_id` is null, the SLT row is omitted → fixture test with `commitment.selected_slt_id: null`.
4. When `PG.input.resolved_event_id` is null (root page), the tab renders the "no causal event" message rather than fetching → mock-fetch test asserts no fetch happens.

## What to Change

### 1. Modify `tabs/WhatChangedHereTab.tsx`

Replace the placeholder with the real implementation:

- Accept `pageDetail: PageDetail` as a prop.
- On mount: if `pageDetail.page.input.resolved_event_id` is null, render the "no causal event for this page" message and exit. Otherwise fetch `/api/.../records/{resolved_event_id}` via the SPEC-88 API client; render the response.
- Top section: `<RecordCardCompact recordCard={seResponse.recordCard}>` followed by the structured field display.
- Structured field display:
  - **Selected event**: `{se.id} · {se.event_kind}`
  - **Actor → Targets**: `{se.actor} → {se.targets.join(", ")}`
  - **Turn driver**: `{se.driver.kind} · initiator {se.driver.initiator} · POV {se.driver.pov_visibility}`
  - **Outcome route**: `{se.outcome_route}` + when non-accept: `· resolution: {se.resolution}`
  - **Selected storylet**: when `se.commitment.selected_slt_id` is non-null, render `<RecordCardCompact recordCard={sltRecordCard}>` for the SLT (fetched in parallel with the SE).
  - **World-logic rationale**: `{se.world_logic_rationale}` (prose paragraph).
  - **State delta**:
    - **Created**: list of records from `se.state_delta.create[]` as compact chips (`{record_id} - {recordClass}`), each clickable per SPEC89STOEXPSTA-008.
    - **Superseded**: list of pre→post supersession pairs from `se.state_delta.supersede[]`.
    - **Closed**: list of records from `se.state_delta.close[]`.
  - **Record introductions**: list from `se.record_introductions[]`.
  - **State relations**: list from `se.state_relations[]`.
  - **Non-propagation facts**: list from `se.non_propagation_facts[]`.
  - **Promotion claims**: list from `se.promotion_claims[]`, each with a link to the story-promotion record when present.

### 2. Visual styling

Apply a section/border treatment that distinguishes What Changed Here from Current State (per SPEC-89 §4.2's "must be visually distinct" rule). Reuse tokens.css from SPEC-88; the distinction can be a left-border accent or a tinted background.

### 3. Add `tabs/__tests__/WhatChangedHereTab.test.tsx`

Render tests with: (a) full-featured SE fixture (all fields populated, all state_delta categories non-empty); (b) null-resolved-event-id fixture (root page); (c) null-SLT fixture (write-in event).

## Files to Touch

- `tools/story-explorer/web/src/components/xray/tabs/WhatChangedHereTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/WhatChangedHereTab.test.tsx` (new)

## Out of Scope

- Linked-record navigation behavior (SPEC89STOEXPSTA-008 wires the chip clicks to peek panels / page navigation).
- The "Created by SE / Modified by SE" provenance trail on individual records — that's SPEC89STOEXPSTA-009 inside the expanded card, not this tab.
- Cross-event diff (Future Enhancements per spec §Out of scope).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- WhatChangedHereTab.test` — full-featured + null-event + null-SLT cases pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Visual smoke in dev mode against the red-bunny fixture: What Changed Here tab on PG-2 renders the SE-2 causal event with non-empty state_delta lists.

### Invariants

1. The tab NEVER renders a placeholder SE when `PG.input.resolved_event_id` is null; it renders the explicit "no causal event" message.
2. The state-delta section presents create / supersede / close as three distinct labeled lists, never collapsed into a single "changed records" list.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/WhatChangedHereTab.test.tsx` — fixture-driven render tests covering the three primary cases.

### Commands

1. `cd tools/story-explorer/web && npm test -- WhatChangedHereTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
