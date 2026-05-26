# STOEXPFIX-006: Remove dead record-card chip view-model surface

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Medium
**Engine Changes**: Yes — story-explorer backend view-model, generated web API type mirror, and X-Ray renderer/test fixtures
**Deps**: archive/tickets/STOEXPFIX-005-remove-duplicate-metadata-chip-render-on-record-card.md

## Problem

At intake, `STOEXPFIX-005` had removed the only compact-card render path for `recordCard.chips[]`, but the `RecordChip` view-model surface still existed in the story-explorer contract:

- `tools/story-explorer/src/view-models/record-card.ts` exported `RecordChip` and included `chips: RecordChip[]` on `RecordCard`.
- `tools/story-explorer/src/read/record-card.ts` imported `RecordChip`, defined `chips(body, rule)`, and populated `chips: chips(parsedBody, rule)` from the same scalar metadata fields now rendered directly by `RecordCardCompact`.
- `tools/story-explorer/web/src/api/client.ts` mirrored `RecordChip` and `RecordCard.chips`.
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` imported `RecordChip`, defined `chipValue`, and queried `recordCard.chips` for `create`, `supersede`, and `close` labels the backend populator did not emit.
- Web fixtures and renderer tests seeded `chips`, even though the production compact-card UI no longer consumed them.

Leaving that field in the public view-model created a dead, misleading information path for record-card metadata and invited future duplicate rendering bugs.

## Assumption Reassessment (2026-05-26)

1. `archive/tickets/STOEXPFIX-005-remove-duplicate-metadata-chip-render-on-record-card.md` completed the visible duplicate-chip fix by deleting `recordCard.chips.map` from `RecordCardCompact`, but explicitly deferred removing the backend/API `chips` surface as wider cleanup.
2. At intake, live grep confirmed the remaining current-contract hits were limited to story-explorer backend/view-model code, the web API type mirror, `RecordCardRenderers` fallback logic, and web test fixtures. Other `RecordChip` names in `WhatChangedHereTab.tsx` are local UI helpers for event-delta record-id lists and are not the `RecordCard.chips` view-model field.
3. The shared boundary under audit is the `RecordCard` view-model shape passed from `tools/story-explorer/src/read/record-card.ts` to the web API client and X-Ray components. This is a forward-only contract cleanup, not a canon storage or validation change.
4. No FOUNDATIONS principle or Validation Rule is directly engaged. The story-explorer is a read-only inspection surface, and this ticket does not mutate `_source/`, patch plans, hard gates, or validation signals.
5. The cleanup was breaking for in-repo story-explorer consumers, and no compatibility alias or empty `chips: []` shim was added. The clean end state is one canonical metadata path: scalar fields (`status`, `visibility`, `confidence`, `urgency`) plus primary/secondary fields for renderer summaries.

## Architecture Check

1. Removing the dead field is cleaner than preserving an empty compatibility surface because `chips[]` no longer has a lawful renderer and duplicates scalar metadata already carried on `RecordCard`.
2. No backwards-compatibility aliasing/shims introduced; update the backend view-model, web API mirror, renderer logic, and fixtures together.

## Verification Layers

1. `RecordCard` no longer exposes `chips` or `RecordChip` in backend and web API types -> codebase grep-proof over `tools/story-explorer/src`, `tools/story-explorer/web/src/api/client.ts`, and X-Ray component/test fixtures.
2. Delta summaries still render from primary/secondary fields or existing link/count helpers after removing `chipValue` fallbacks -> `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx`.
3. Compact and expanded record-card tests remain green without `chips` fixture data -> `npm --prefix tools/story-explorer/web test`.
4. Backend and web type surfaces compile without the removed field -> `npm --prefix tools/story-explorer test`.

## Landed Changes

### 1. Remove backend `RecordChip` and `RecordCard.chips`

Deleted `RecordChip`, the `chips` field on `RecordCard`, the `chips(body, rule)` helper, the `RecordChip` import, and the `chips: chips(parsedBody, rule)` assignment from the backend story-explorer record-card read path.

### 2. Remove web API and renderer consumers

Deleted the mirrored `RecordChip` interface and `RecordCard.chips` field from `tools/story-explorer/web/src/api/client.ts`. In `RecordCardRenderers.tsx`, removed the `RecordChip` import, `chipValue` helper, and `recordCard.chips` fallback reads for delta summaries.

### 3. Truth fixtures and tests

Removed `chips` fixture values from X-Ray web tests. Updated the backend record-card test to keep coverage on participants, links, and provenance after deleting the dead chip projection.

## Files to Touch

- `tools/story-explorer/src/view-models/record-card.ts` (modify)
- `tools/story-explorer/src/read/record-card.ts` (modify)
- `tools/story-explorer/web/src/api/client.ts` (modify)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/fixtures.ts` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/WhatChangedHereTab.test.tsx` (modify fixture shape only)
- `tools/story-explorer/test/record-card.test.ts` (modify)
- `archive/tickets/STOEXPFIX-006-remove-dead-record-card-chip-view-model-surface.md` (modify)

## Out of Scope

- Changing compact-card chip styling, label casing, or the `Status` / `Visibility` / `Confidence` / `Urgency` scalar render path fixed by `STOEXPFIX-005`.
- Renaming local UI helpers in `WhatChangedHereTab.tsx` that use the `RecordChip` name for event-delta record-id chips but do not consume `RecordCard.chips`.
- Changing story record summary rules beyond removing the dead `chips[]` projection.

## Acceptance Criteria

### Tests That Must Pass

1. No current-contract references to `RecordCard.chips`, backend/API `RecordChip`, `chips(body, rule)`, or `chipValue(recordCard.chips` remain in story-explorer backend/view-model/API/X-Ray record-card surfaces. The unrelated `WhatChangedHereTab.tsx` event-delta `RecordChipList` helper remains intentionally unchanged.
2. `npm --prefix tools/story-explorer/web test` passes.
3. `npm --prefix tools/story-explorer test` passes.

### Invariants

1. Record-card metadata has one canonical transport path: scalar fields and primary/secondary fields, not a parallel `chips[]` list.
2. `RecordCardCompact` continues to render Title-Case metadata chips from scalar fields only.
3. Event-delta UI chips in `WhatChangedHereTab.tsx` remain unaffected.

## Test Plan

### New/Modified Tests

1. Existing story-explorer web renderer and record-card tests — updated fixtures/expectations to remove the dead `chips` field.
2. No new test file required; existing backend record-card and web X-Ray renderer tests cover the remaining scalar, primary/secondary field, provenance, link, and delta-summary paths.

### Commands

1. `npm --prefix tools/story-explorer/web test`
2. `npm --prefix tools/story-explorer test`
3. `rg -n 'RecordChip|recordCard\\.chips|chips\\(body|chipValue\\(' tools/story-explorer/src tools/story-explorer/test tools/story-explorer/web/src/api/client.ts tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx tools/story-explorer/web/src/components/xray/__tests__/fixtures.ts tools/story-explorer/web/src/components/xray/__tests__/RecordCardRenderers.test.tsx tools/story-explorer/web/src/components/xray/tabs/__tests__/WhatChangedHereTab.test.tsx`

## Outcome

Completion date: 2026-05-26.

The `RecordCard` view-model no longer carries the dead `chips[]` transport path. Backend construction now emits scalar metadata plus primary/secondary fields only, the frontend API mirror matches that shape, and X-Ray compact-line rendering no longer queries impossible `create` / `supersede` / `close` chip labels. Web fixtures and backend tests were truthed to the removed field.

## Verification Result

1. Pre-edit baseline: `npm --prefix tools/story-explorer/web test` passed with 76 files / 184 tests.
2. Pre-edit baseline: `npm --prefix tools/story-explorer test` passed after build with 15 backend compiled test files and 76 web test files.
3. Post-edit proof: `npm --prefix tools/story-explorer test` passed after build with 15 backend compiled test files and 76 web test files / 184 web tests.
4. Post-closeout web proof: `npm --prefix tools/story-explorer/web test` passed with 76 files / 184 tests.
5. Current-contract grep proof passed with no matches for the scoped command listed in Test Plan command 3.
6. Package user-facing docs/examples were inspected via `tools/story-explorer/README.md` and `rg --files tools/story-explorer`; the README documents package usage/read-only behavior, not the record-card chip view-model.
7. Generated/ignored artifacts refreshed: `tools/story-explorer/dist/` and `tools/story-explorer/web/dist/` were refreshed by `npm --prefix tools/story-explorer test`; `tools/story-explorer/node_modules/` and `tools/story-explorer/web/node_modules/` were pre-existing ignored package artifacts.

## Deviations

- The drafted broad grep over all of `tools/story-explorer/web/src` would intentionally find `WhatChangedHereTab.tsx` local event-delta helpers named `RecordChipList` / `formatRecordChip`. The accepted grep is scoped to the backend/API/X-Ray record-card contract surfaces and the affected fixtures/tests, while the unrelated event-delta helper remains out of scope.
- The final package proof emitted existing React Router future-flag warnings and the intentional `ErrorBoundary.a11y.test.tsx` thrown-child stderr; all tests passed.
