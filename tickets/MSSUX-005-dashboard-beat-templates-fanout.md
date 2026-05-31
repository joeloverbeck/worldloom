# MSSUX-005: Exclude beat-templates from Dashboard MANUAL_RECORD_CLASSES fan-out

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

`Dashboard.tsx` produces a spurious HTTP 404 on every mount by
fetching `/api/worlds/:slug/manual-stories/:msSlug/records?class=beat-templates`.

`web/src/pages/Dashboard.tsx` lines 87-100 iterates the full
`MANUAL_RECORD_CLASSES` array (defined in
`web/src/types/manual-story.ts` lines 194-214) and calls
`apiList(worldSlug, msSlug, cls)` for each class. The generic
`/records?class=` route in
`tools/manual-story-studio/src/server/routes/records.ts` lines 44-49
deliberately 404s the `beat-templates` class:

```ts
if (cls === "beat-templates") {
  return reply.code(404).send({
    error: "wrong_url_space",
    message: "beat-templates is served by /beat-templates URL space; the generic /records endpoint does not handle this class",
  });
}
```

This is correct backend behavior — SPEC-104 split beat-templates into
their own URL space (see header comment in
`tools/manual-story-studio/src/server/routes/beat-templates.ts` lines
2-3 and `routes/records.ts` lines 36-37). The bug is on the frontend:
the Dashboard fans out a class the backend explicitly does not serve at
that endpoint.

The Dashboard's `.catch(() => {})` swallows the failure so the UI does
not break, but every dashboard load produces a visible 404 in DevTools
Network panel (doubled by React StrictMode in development), which the
author reads as "the dashboard is broken." Confirmed empirically
during diagnosis: `puppeteer` capture of one re-mount cycle produced
two `wrong_url_space` 404 entries (one per StrictMode pass) and zero
JS errors / unhandled rejections.

## Assumption Reassessment (2026-05-31)

1. `Dashboard.tsx:87-100` fans out across `MANUAL_RECORD_CLASSES`.
   Verified: `Promise.all(MANUAL_RECORD_CLASSES.map((cls) => apiList(worldSlug, msSlug, cls).then(...)))`.
2. `MANUAL_RECORD_CLASSES` in `web/src/types/manual-story.ts:194-214`
   includes `"beat-templates"`. Verified.
3. Backend `routes/records.ts:44-49` rejects `class=beat-templates` with
   404 `wrong_url_space`. Verified by `curl` against the running dev
   server: `Status: 404` body `{"error":"wrong_url_space",...}`.
4. The Dashboard's `byClass` state object (lines 36-58) seeds
   `"beat-templates": []` and `highImportance` (lines 107-124) iterates
   `MANUAL_RECORD_CLASSES`, so the high-importance roll-up DOES touch
   the beat-templates bucket. Excluding beat-templates from the fan-out
   leaves `byClass["beat-templates"]` as the seed `[]`, which is the
   right behavior — beat-templates do not have `importance` semantics
   and the high-importance roll-up should never have included them.
5. No `importance` field exists on `BeatTemplate`
   (`web/src/types/manual-story.ts:443-454`); only records carrying
   `RecordCommonFields.importance` participate in the high-importance
   list. Excluding beat-templates from the fan-out has zero observable
   effect on the high-importance section.
6. Inline fix is already applied in the working tree as part of this
   triage hand-off. This ticket records the change for audit.

## Architecture Check

1. The fix is the minimal change that aligns the frontend with the
   backend's URL-space split. Filtering out `"beat-templates"` at the
   call site mirrors the backend's gate, with no schema or contract
   change.
2. No backwards-compatibility aliasing/shims introduced. The
   beat-templates URL space remains the sole owner of beat-template
   reads; the Dashboard simply stops asking the wrong endpoint.

## Verification Layers

1. Spurious 404 on dashboard mount is eliminated → manual review via
   `puppeteer` Network capture on
   `/worlds/erotica-world/manual-stories/red-bunny/dashboard`.
2. Dashboard's `byClass` state still seeds `beat-templates: []` so the
   high-importance roll-up does not throw → codebase grep-proof:
   `byClass["beat-templates"]` reads still resolve to a defined array.
3. tsc passes after the change → schema validation surface (the web
   bundle's `npm test` runs `tsc -p tsconfig.json --noEmit`).

## What to Change

### 1. `Dashboard.tsx` — exclude beat-templates from the records fan-out

In the `useEffect` at lines 87-100, change:

```tsx
Promise.all(
  MANUAL_RECORD_CLASSES.map((cls) =>
    apiList(worldSlug, msSlug, cls).then(
      (records) => [cls, records] as const,
    ),
  ),
)
```

to:

```tsx
Promise.all(
  MANUAL_RECORD_CLASSES
    .filter((cls) => cls !== "beat-templates")
    .map((cls) =>
      apiList(worldSlug, msSlug, cls).then(
        (records) => [cls, records] as const,
      ),
    ),
)
```

The seed value `"beat-templates": []` in the `byClass` initial state
(lines 36-58) remains; the high-importance roll-up at lines 107-124
will iterate over an empty array for the beat-templates entry, which
is a no-op.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)

## Out of Scope

- Removing `"beat-templates"` from `MANUAL_RECORD_CLASSES` — that
  array is used elsewhere (Records page class rail at
  `Records.tsx:228-253`) and IS the correct value set for the records
  generic surface in places where the beat-templates exclusion is
  the wrong default.
- Routing the Dashboard to the dedicated `/beat-templates` endpoint —
  the dashboard does not currently display beat-template counts and
  does not need to fetch them for any visible UI. If a future spec
  adds a "Beat templates: N" line to the Dashboard, that spec will
  introduce the proper read through the dedicated endpoint.

## Acceptance Criteria

### Tests That Must Pass

1. After the change, navigating to a dashboard URL produces zero
   `wrong_url_space` 404 entries in the Network panel (verifiable via
   `puppeteer` capture or DevTools).
2. The Dashboard's high-importance section continues to render
   correctly (manual review; the `byClass["beat-templates"]` array
   remains `[]` and the iteration is a no-op).
3. `npm --prefix tools/manual-story-studio/web test` passes
   (tsc --noEmit).

### Invariants

1. `MANUAL_RECORD_CLASSES` remains the canonical record-class enum;
   no class is removed.
2. The beat-templates URL space (`/api/.../beat-templates`) remains
   the sole owner of beat-template reads. The generic
   `/records?class=` route remains unchanged.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.`
   (The fix is mechanical and the web bundle's test surface is tsc-only
   today.)

### Commands

1. `npm --prefix tools/manual-story-studio/web test` — typecheck only.
2. Manual: navigate the dev server to
   `/worlds/erotica-world/manual-stories/red-bunny/dashboard` and
   confirm the Network panel shows no `wrong_url_space` 404 entries.
