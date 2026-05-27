# STOEXPFIX-005: Remove duplicate metadata-chip render on compact record card

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — frontend-only change to `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx`
**Deps**: None

## Problem

At intake, any page-detail X-Ray panel that surfaced record cards (e.g., `/worlds/erotica-world/stories/red-bunny/pages/PG-5`) could render the same compact record-card metadata twice with different casing. For a BEL record with `visibility=shared` and `confidence=certain`, the chip container read:

```
Visibility: shared  ·  Confidence: certain  ·  Created at PG-5  ·  9 related  ·  visibility: shared  ·  confidence: certain
```

For a THR record with `status=active` and `urgency=high`, it read:

```
Status: active  ·  Urgency: high  ·  Created at PG-5  ·  9 related  ·  status: active  ·  urgency: high
```

Root cause: before this ticket, `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx` emitted chips along two parallel paths from the same backend data.

- The typed scalar path rendered four fields with Title-Case labels: `Status: {recordCard.status}`, `Visibility: {recordCard.visibility}`, `Confidence: {recordCard.confidence}`, `Urgency: {recordCard.urgency}`.
- The removed duplicate path iterated `recordCard.chips.map((chip) => <span>{chip.label}: {chip.value}</span>)`, emitting the same four labels in lowercase (`status`, `visibility`, `confidence`, `urgency`).

The backend `chips()` function at `tools/story-explorer/src/read/record-card.ts` populates `recordCard.chips[]` by iterating exactly the four scalar fields the frontend already renders — same source, same data, different surface form. Historical intake evidence from the live dev server showed the `record-card__chips` container for BEL-14 holding six `<span class="record-chip">` elements, with the last two restating the first two in lowercase.

## Assumption Reassessment (2026-05-26)

1. `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx` is the only render site for the `record-card__chips` container on the compact record card (verified by grep across `tools/story-explorer/web/src/`). Before this ticket, the typed scalar path and `chips[]` iteration path both fed into the same `<div className="record-card__chips">` parent.
2. `tools/story-explorer/src/read/record-card.ts` defines `chips(body, rule)`, which iterates `[['status', rule.statusField], ['visibility', rule.visibilityField], ['confidence', rule.confidenceField], ['urgency', rule.urgencyField]]` and emits `RecordChip { label, value }` for each present field — lowercase labels exactly matching the four scalar fields the frontend already renders Title-Case. The production backend does not emit any other chip label.
3. The only other live consumer of `recordCard.chips` outside `RecordCardCompact.tsx` is `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx`: `chipValue(recordCard.chips, 'create')` / `'supersede'` / `'close'`. Because the backend `chips()` function never emits those three labels (per #2), `chipValue` for those labels falls through to `fieldValue`; removing the `chips.map` render in `RecordCardCompact.tsx` does not affect the delta-summary code path.
4. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx` now keeps the existing Title-Case assertions for `Visibility: hidden` and `Confidence: low` and adds negative assertions that the lowercase duplicate forms are absent.
5. No FOUNDATIONS principle or Validation Rule is engaged. The story-explorer is a read-only human surface over `_source/`; record-card chip rendering is presentation, not canon storage or validation. The thirteen concerns and the seven validation rules are silent on UI chip surfaces.
6. The fix is purely subtractive on the frontend — no new dependency, no new CSS, no new view-model field. The backend `chips: RecordChip[]` field and its populator stay in place for now (they become dead surface; see Out of Scope for the follow-up cleanup).

## Architecture Check

1. The cleanest cut is to remove the redundant render at the frontend rather than at the backend, because (a) the Title-Case scalar render path is asserted by existing tests and matches the visual convention used elsewhere in the X-Ray (Title-Case chip labels), and (b) the `recordCard.chips[]` field is partially queried in `RecordCardRenderers.tsx:129-131` for labels the backend doesn't currently emit, so the field is effectively dead surface and removing it cleanly is a wider scope better handled as a separate cleanup ticket.
2. No backwards-compatibility shim. The change is a five-line deletion.
3. No new abstraction. We are not introducing a chip-deduplication helper or unifying chip surfaces — that would be over-scope for a single visible duplication.

## Verification Layers

1. Compact record card for a record with `visibility` and `confidence` populated renders each metadata field in Title-Case and omits the lowercase duplicate forms -> `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx`.
2. Compact card provenance and related-count chips still render from their dedicated source fields -> `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx`.
3. The removed `recordCard.chips.map` path cannot render duplicate lowercase `status`, `visibility`, `confidence`, or `urgency` chips -> source review of `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx`.
4. The web package test suite remains green -> `npm --prefix tools/story-explorer/web test`.
5. The web package typecheck/build gate remains green -> `npm --prefix tools/story-explorer/web run build`; the package has no standalone `typecheck` script and this checkout has no root `pnpm` workspace.

## Landed Changes

### 1. Deleted the duplicate `recordCard.chips.map` render in `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx`

Removed the `{recordCard.chips.map(...)}` block:

```tsx
{recordCard.chips.map((chip) => (
  <span className="record-chip" key={`${chip.label}:${chip.value}`}>
    {chip.label}: {chip.value}
  </span>
))}
```

The four typed scalar render lines remain as the canonical chip surface. The `Created at` and `N related` chips are unaffected because they come from `recordCard.provenance.createdAtPage` and `recordCard.links.length`, not from `chips[]`.

### 2. Added a guard test in `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx`

After the existing Title-Case assertions, the test now asserts that the chips container does not contain the lowercase forms:

```tsx
expect(screen.getByLabelText('BEL-1 summary chips')).not.toHaveTextContent(/\bvisibility: hidden\b/);
expect(screen.getByLabelText('BEL-1 summary chips')).not.toHaveTextContent(/\bconfidence: low\b/);
```

## Files to Touch

- `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx` (modify)
- `archive/tickets/STOEXPFIX-005-remove-duplicate-metadata-chip-render-on-record-card.md` (modify)

## Out of Scope

- Removing the `chips: RecordChip[]` field from the `RecordCard` view-model at `tools/story-explorer/src/view-models/record-card.ts:35`, its populator at `tools/story-explorer/src/read/record-card.ts:313-328`, and the now-dead `chipValue(recordCard.chips, 'create' | 'supersede' | 'close')` calls at `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx:129-131`. This is a cleaner architectural cleanup but it is a wider blast radius (view-model contract change, additional read-side tests to update); deferring to a follow-up ticket keeps the present bug-fix surgical and reversible.
- Any change to `record-card.ts` summary rules, chip label casing conventions, or the chip-rendering CSS at `tools/story-explorer/web/src/styles/app.css:942-950`.
- The expanded record card (`RecordCardExpanded.tsx`) and other chip surfaces (`ValidationIntegrityTab.tsx`, `WhatChangedHereTab.tsx`, `PlanProseTab.tsx`) — those each render their own dedicated chip containers and were not observed to duplicate.

## Acceptance Criteria

### Tests That Must Pass

1. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx` — the existing assertions for `Visibility: hidden` and `Confidence: low` pass, and the new negative assertions for the lowercase forms pass.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` continues to pass, covering the compact card's Title-Case metadata chips, provenance chip, and related-count chip.
3. `npm --prefix tools/story-explorer/web test` passes.
4. `npm --prefix tools/story-explorer/web run build` passes.

### Invariants

1. The compact record card's `record-card__chips` container never holds two chips whose `(label.toLowerCase(), value)` pair is identical.
2. The Title-Case metadata chip labels (`Status:`, `Visibility:`, `Confidence:`, `Urgency:`) remain the only metadata-chip label form rendered by `RecordCardCompact`.
3. The `Created at <PG>` chip and the `N related` chip continue to render when their source data is present.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.a11y.test.tsx` — added negative assertions that lowercase forms (`visibility:`, `confidence:`) are absent from the chips container, complementing the existing Title-Case positive assertions.

### Commands

1. `npm --prefix tools/story-explorer/web test`
2. `npm --prefix tools/story-explorer/web run build`

## Outcome

Completion date: 2026-05-26.

`RecordCardCompact` now renders only the typed scalar metadata chips (`Status`, `Visibility`, `Confidence`, `Urgency`) plus the existing provenance and related-count chips. The duplicate lowercase `recordCard.chips[]` render path was removed, and the a11y test now guards against the observed lowercase duplicate `visibility` / `confidence` regression.

## Verification Result

1. Pre-edit baseline: `npm --prefix tools/story-explorer/web test` passed with 76 files / 184 tests before implementation.
2. `npm --prefix tools/story-explorer/web test` passed after implementation with 76 files / 184 tests. The run emitted existing React Router future-flag warnings and the intentional `ErrorBoundary.a11y.test.tsx` thrown-child stderr, but all tests passed.
3. `npm --prefix tools/story-explorer/web run build` passed after implementation; `tsc -p tsconfig.json` and `vite build` completed successfully.
4. Package user-facing docs/examples were inspected via `rg --files tools/story-explorer/web`; the web package has `package.json`, `tsconfig.json`, and `vite.config.ts` but no README/example/config surface that documents compact record-card chip rendering.
5. Generated/ignored artifacts refreshed: `tools/story-explorer/web/dist/` was refreshed by the build; `tools/story-explorer/web/node_modules/` was pre-existing.

## Deviations

- The drafted proof used `pnpm --filter @worldloom/story-explorer-web test` and `pnpm --filter @worldloom/story-explorer-web typecheck`, but this checkout has no root `package.json` / `pnpm-workspace.yaml`, and the web package has no `typecheck` script. The truthful proof surface is `npm --prefix tools/story-explorer/web test` plus `npm --prefix tools/story-explorer/web run build`.
- The drafted render-shape test path `tools/story-explorer/web/src/components/xray/__tests__/RecordCardCompact.test.tsx` does not exist. The live render-shape test is `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx`.
- The drafted manual dev-server visual check was not run. The accepted verification is the package DOM/a11y test plus the package build gate; no live-world or canon artifact was touched.
