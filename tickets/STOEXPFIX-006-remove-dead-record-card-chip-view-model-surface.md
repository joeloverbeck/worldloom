# STOEXPFIX-006: Remove dead record-card chip view-model surface

**Status**: PENDING
**Priority**: LOW
**Effort**: Medium
**Engine Changes**: Yes — story-explorer backend view-model, generated web API type mirror, and X-Ray renderer/test fixtures
**Deps**: archive/tickets/STOEXPFIX-005-remove-duplicate-metadata-chip-render-on-record-card.md

## Problem

`STOEXPFIX-005` removed the only compact-card render path for `recordCard.chips[]`, but the `RecordChip` view-model surface still exists in the story-explorer contract:

- `tools/story-explorer/src/view-models/record-card.ts` exports `RecordChip` and includes `chips: RecordChip[]` on `RecordCard`.
- `tools/story-explorer/src/read/record-card.ts` imports `RecordChip`, defines `chips(body, rule)`, and populates `chips: chips(parsedBody, rule)` from the same scalar metadata fields now rendered directly by `RecordCardCompact`.
- `tools/story-explorer/web/src/api/client.ts` mirrors `RecordChip` and `RecordCard.chips`.
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` still imports `RecordChip`, defines `chipValue`, and queries `recordCard.chips` for `create`, `supersede`, and `close` labels the backend populator does not emit.
- Web fixtures and renderer tests still seed `chips`, even though the production compact-card UI no longer consumes them.

Leaving this field in the public view-model creates a dead, misleading information path for record-card metadata and invites future duplicate rendering bugs.

## Assumption Reassessment (2026-05-26)

1. `archive/tickets/STOEXPFIX-005-remove-duplicate-metadata-chip-render-on-record-card.md` completed the visible duplicate-chip fix by deleting `recordCard.chips.map` from `RecordCardCompact`, but explicitly deferred removing the backend/API `chips` surface as wider cleanup.
2. Live grep confirms the remaining current-contract hits are limited to story-explorer backend/view-model code, the web API type mirror, `RecordCardRenderers` fallback logic, and web test fixtures. Other `RecordChip` names in `WhatChangedHereTab.tsx` are local UI helpers for event-delta record-id lists and are not the `RecordCard.chips` view-model field.
3. The shared boundary under audit is the `RecordCard` view-model shape passed from `tools/story-explorer/src/read/record-card.ts` to the web API client and X-Ray components. This is a forward-only contract cleanup, not a canon storage or validation change.
4. No FOUNDATIONS principle or Validation Rule is directly engaged. The story-explorer is a read-only inspection surface, and this ticket does not mutate `_source/`, patch plans, hard gates, or validation signals.
5. The cleanup is breaking for in-repo story-explorer consumers but should not add a compatibility alias or empty `chips: []` shim. The clean end state is one canonical metadata path: scalar fields (`status`, `visibility`, `confidence`, `urgency`) plus primary/secondary fields for renderer summaries.

## Architecture Check

1. Removing the dead field is cleaner than preserving an empty compatibility surface because `chips[]` no longer has a lawful renderer and duplicates scalar metadata already carried on `RecordCard`.
2. No backwards-compatibility aliasing/shims introduced; update the backend view-model, web API mirror, renderer logic, and fixtures together.

## Verification Layers

1. `RecordCard` no longer exposes `chips` or `RecordChip` in backend and web API types -> codebase grep-proof over `tools/story-explorer/src`, `tools/story-explorer/web/src/api/client.ts`, and X-Ray component/test fixtures.
2. Delta summaries still render from primary/secondary fields or existing link/count helpers after removing `chipValue` fallbacks -> `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx`.
3. Compact and expanded record-card tests remain green without `chips` fixture data -> `npm --prefix tools/story-explorer/web test`.
4. Backend and web type surfaces compile without the removed field -> `npm --prefix tools/story-explorer test`.

## What to Change

### 1. Remove backend `RecordChip` and `RecordCard.chips`

Delete `RecordChip`, the `chips` field on `RecordCard`, the `chips(body, rule)` helper, the `RecordChip` import, and the `chips: chips(parsedBody, rule)` assignment from the backend story-explorer record-card read path.

### 2. Remove web API and renderer consumers

Delete the mirrored `RecordChip` interface and `RecordCard.chips` field from `tools/story-explorer/web/src/api/client.ts`. In `RecordCardRenderers.tsx`, remove the `RecordChip` import, `chipValue` helper, and `recordCard.chips` fallback reads for delta summaries.

### 3. Truth fixtures and tests

Remove `chips` fixture values from X-Ray web tests and adjust any renderer expectations that relied on a synthetic chip fallback rather than production-emitted fields.

## Files to Touch

- `tools/story-explorer/src/view-models/record-card.ts` (modify)
- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/web/src/api/client.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/fixtures.ts` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` (modify if assertions use chip fallbacks)
- `tickets/STOEXPFIX-006-remove-dead-record-card-chip-view-model-surface.md` (modify)

## Out of Scope

- Changing compact-card chip styling, label casing, or the `Status` / `Visibility` / `Confidence` / `Urgency` scalar render path fixed by `STOEXPFIX-005`.
- Renaming local UI helpers in `WhatChangedHereTab.tsx` that use the `RecordChip` name for event-delta record-id chips but do not consume `RecordCard.chips`.
- Changing story record summary rules beyond removing the dead `chips[]` projection.

## Acceptance Criteria

### Tests That Must Pass

1. No current-contract references to `RecordCard.chips`, `RecordChip`, `chips(body, rule)`, or `chipValue(recordCard.chips` remain in story-explorer backend/view-model/API/X-Ray surfaces.
2. `npm --prefix tools/story-explorer/web test` passes.
3. `npm --prefix tools/story-explorer test` passes.

### Invariants

1. Record-card metadata has one canonical transport path: scalar fields and primary/secondary fields, not a parallel `chips[]` list.
2. `RecordCardCompact` continues to render Title-Case metadata chips from scalar fields only.
3. Event-delta UI chips in `WhatChangedHereTab.tsx` remain unaffected.

## Test Plan

### New/Modified Tests

1. Existing story-explorer web renderer and record-card tests — update fixtures/expectations to remove the dead `chips` field.
2. No new test file required unless removing the fallback exposes an untested delta-summary case that should be covered through primary/secondary fields.

### Commands

1. `npm --prefix tools/story-explorer/web test`
2. `npm --prefix tools/story-explorer test`
3. `rg -n 'RecordChip|recordCard\\.chips|chips\\(body|chipValue\\(' tools/story-explorer/src tools/story-explorer/web/src`
