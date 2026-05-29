# SPEC97STOEXPSCE-007: Unscened range route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/story-explorer/web` new route `/worlds/:slug/stories/:storySlug/unscened` (unscened range authoring view); one route-array entry added to `app.tsx`.
**Deps**: 001, 004

## Problem

SPEC-97 §2.6 makes an unscened range a normal authoring state, not an error: it shows the PG range, branch path, state progression summary, event deltas, emitted choices at the final PG, and validation traces — with no reader/prose affordance beyond "no scene plan/prose yet". This is where the author works for many turns before rendering. There is no unscened route today; the current frontend would treat an unrendered PG run as a not-found/empty state.

## Assumption Reassessment (2026-05-29)

1. `routes/unscened.tsx` is absent (verified `test -e` → absent). `app.tsx` has no unscened route (reassessment grep). `getUnscenedRanges`/`UnscenedRange`/`ChoiceSurface`/`EventDeltaSummary` are delivered by SPEC97STOEXPSCE-001; `UnscenedRunCard` is delivered (exported) by SPEC97STOEXPSCE-004 and reused here. Route loader + `ErrorBoundary` scaffolding reusable.
2. SPEC-97 §2.6 (unscened range = normal authoring state, no reader/prose affordance beyond "no scene plan/prose yet"). SPEC-96 `/unscened-ranges?branchId=BR-N` returns contiguous committed PG ranges not covered by an active SCN, each with start/end PG, count, final `ChoiceSurface`, event-delta summary, active-record delta summary, validation status, and a suggested default range label (NOT an automatic scene-boundary verdict).
3. Cross-artifact boundary under audit: the `UnscenedRange` payload (SPEC-96 `/unscened-ranges`, typed in 001) and the `UnscenedRunCard` component contract (exported from SPEC97STOEXPSCE-004). The view reads `UnscenedRange[]` and renders each via the shared `UnscenedRunCard` plus the range's state-progression/event-delta/choice/validation surfaces.
4. FOUNDATIONS author-x-ray-first / unscened-ranges-as-first-class (SPEC-97 §5, report §16/§18): unscened ranges are first-class authoring views, not error states. The view exposes the causal state (deltas, choices, validation) of an unrendered PG run with no prose affordance beyond the "not attached yet" note — enacting the author-tool framing rather than a reader-only "missing scene" error.

## Architecture Check

1. Reusing `UnscenedRunCard` (from 004) keeps the unscened representation consistent between the timeline's `unscened_run` segments and the dedicated unscened view — one component, two surfaces. The route composes the existing loader pattern over `getUnscenedRanges`.
2. No backwards-compatibility shims — new route; the unscened view does not reuse any page-reader not-found framing (whose page-reader labels are reworked in 008).

## Verification Layers

1. Unscened ranges render as a normal authoring view (PG range, branch path, state progression, deltas, final choices, validation) → component test against an `UnscenedRange[]` fixture.
2. No reader/prose affordance beyond "no scene plan/prose yet" → component test asserting the absence of any prose-reader control and presence of the not-attached note.
3. Route resolves at `/worlds/:slug/stories/:storySlug/unscened` → route test (app.tsx wiring).
4. Shared `UnscenedRunCard` renders identically here and in the timeline → reuse confirmed by importing the same component (grep-proof of single definition in `components/UnscenedRunCard.tsx`).

## What to Change

### 1. Add the unscened route

New `routes/unscened.tsx` with a loader calling `getUnscenedRanges(slug, storySlug, { branchId })`; render the unscened authoring view: per-range `UnscenedRunCard` (reused from 004) + state-progression summary + event deltas + final-PG `ChoiceSurface` + validation traces + the "no scene plan/prose yet" note. Add one route-array entry `/worlds/:slug/stories/:storySlug/unscened` to `app.tsx`. Plus a11y test.

## Files to Touch

- `tools/story-explorer/web/src/app.tsx` (modify — add the unscened route entry; pre-existing shared file, coordinate route-array placement with 003/004/005/006/008)
- `tools/story-explorer/web/src/routes/unscened.tsx` (new)
- `tools/story-explorer/web/src/routes/unscened.test.tsx` (new)
- `tools/story-explorer/web/src/routes/unscened.a11y.test.tsx` (new)

## Out of Scope

- The `UnscenedRunCard` component definition — delivered by SPEC97STOEXPSCE-004 (this ticket reuses it).
- Any scene planning/rendering trigger — SPEC-96 §Out-of-scope keeps the explorer read-only; this view shows coverage/queue state only.
- Branch-map / search — deferred to SPEC-98.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — unscened route + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — typechecks against `UnscenedRange` from 001 and imports `UnscenedRunCard` from 004.
3. Component test asserts no reader/prose affordance beyond the "no scene plan/prose yet" note.

### Invariants

1. An unscened range renders as a normal authoring view, never as an error/not-found state — author-x-ray-first / unscened-first-class.
2. The view is read-only: it surfaces coverage + causal state but triggers no scene planning/rendering workflow.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/routes/unscened.test.tsx` + `.a11y.test.tsx` — loader, render, no-prose-affordance assertion, `UnscenedRunCard` reuse.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
