# SPEC97STOEXPSCE-002: X-ray infra rebind to StateTickXray + StateTickDrawer

**Status**: DONE
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — `tools/story-explorer/web` x-ray component tree (`components/xray/*`) rebound from the `PageDetail` view model to `StateTickXray`; new `StateTickDrawer` component; `PlanProseTab` removed.
**Deps**: 001

## Problem

The x-ray panel infrastructure (`XRayPanel`, `MobileSummaryBar`, `StickyRail`, the `CurrentStateTab`/`ValidationIntegrityTab`/`WhatChangedHereTab` tabs, `groupActiveRecords.ts` grouping, `RecordCard*` rendering) is sound but is currently bound to the page-first `PageDetail` view model. SPEC-97 §3 keeps this infra and rebinds it to the scene-first `StateTickXray` payload (SPEC-96's `/state-ticks/:pgId/xray`), surfacing it as a drawer rather than a page region. The page-scoped `PlanProseTab` (Plan & Prose tab) is dropped — plan/prose/receipt move to the scene-scoped panels in SPEC97STOEXPSCE-006, and `StateTickXray` carries no plan/prose payload. A new `StateTickDrawer` wraps the rebound `XRayPanel` as a deep-linkable drawer (`timeline?focus=PG-12`), never a page-reader view.

## Assumption Reassessment (2026-05-29)

1. The x-ray tree consuming `PageDetail` is, per reassessment-session grep: `components/xray/XRayPanel.tsx`, `MobileSummaryBar.tsx`, `StickyRail.tsx`, `tabs/CurrentStateTab.tsx`, `tabs/ValidationIntegrityTab.tsx`, `tabs/WhatChangedHereTab.tsx`, and `tabs/PlanProseTab.tsx`. `XRayPanel.tsx:40` signature is `XRayPanel({ pageDetail, storySlug, worldIndexStatus, worldSlug })` — `pageDetail` is the prop to rebind. `components/xray/groupActiveRecords.ts` exports `CURRENT_STATE_GROUPS` / `GROUP_BY_CLASS_PREFIX` / `groupForRecordId` / `groupAnchorId` / `countRecordIdsByGroup` (the record-grouping logic, reused unchanged — there is no function literally named `groupActiveRecords`). `RecordCardCompact`/`RecordCardExpanded`/`RecordCardRenderers` render records and are reused unchanged.
2. SPEC-97 §3 (Key decisions, "Reuse the x-ray infra") and §2.4: rebind `XRayPanel`/tabs/grouping/RecordCard from `PageDetail` to `StateTickXray`; §2.1 deletes "page-level 'Plan & Prose' tab semantics"; §2.8 names the `StateTickDrawer`. `StateTickXray` (from SPEC97STOEXPSCE-001) carries active-records-by-class, state-snapshot summary, validation trace, event delta, emitted choices, raw PG YAML — everything the retained tabs need — but NO plan/prose/receipt (those are scene-scoped in 006), which is why `PlanProseTab` is removed rather than rebound.
3. Cross-artifact boundary under audit: the `StateTickXray` payload contract (SPEC-96 `/state-ticks/:pgId/xray`, typed in 001). The rebind must map the retained tabs' field reads from `PageDetail.*` to `StateTickXray.*`; `groupActiveRecords.ts` consumes the active-records-by-class shape, which `StateTickXray` provides.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary): rendered prose is non-authoritative; `PG` state is authoritative at record commit. The x-ray surfaces committed state (active records, deltas, validation, raw YAML) as the inspection truth, never prose — consistent with the principle. Dropping `PlanProseTab` removes the last page-prose coupling from the x-ray surface.
5. (was template item 7 — rename/remove blast radius) Rebinding `XRayPanel`'s `pageDetail` prop to `StateTickXray` and removing `PlanProseTab` changes a component interface consumed across the xray tree. Blast radius (reassessment grep, all under `tools/story-explorer/web/src/components/xray/`): `XRayPanel.tsx`, `MobileSummaryBar.tsx`, `StickyRail.tsx`, `tabs/CurrentStateTab.tsx`, `tabs/ValidationIntegrityTab.tsx`, `tabs/WhatChangedHereTab.tsx` (rebind), `tabs/PlanProseTab.tsx` (remove). No consumers outside the xray tree (the page-route consumers are removed in 008). `XRayPanel`'s new caller is `StateTickDrawer` (this ticket).

## Architecture Check

1. Rebinding the existing, working x-ray infra to the new payload preserves the sound record-grouping + rendering logic rather than rewriting it — the only change is the source view model (`PageDetail` → `StateTickXray`). Wrapping it in `StateTickDrawer` makes PG inspection a drawer reachable via query-state focus, decoupling it from any route segment.
2. No backwards-compatibility shims — `XRayPanel` takes `StateTickXray` directly; no adapter from `PageDetail` to `StateTickXray` is introduced (`PageDetail` is being removed entirely in 008).

## Verification Layers

1. Rebound tabs read `StateTickXray` fields → `tsc` typecheck (no residual `PageDetail` references in the xray tree) + component tests rendering each tab against a `StateTickXray` fixture.
2. `PlanProseTab` removed → grep-proof `tabs/PlanProseTab.tsx` absent and no import references it.
3. `StateTickDrawer` opens on a `pgId`, deep-linkable, never a page route → component + a11y test asserting drawer open/close + focus query binding.
4. Record grouping unchanged → `groupActiveRecords.ts` test suite still passes against the active-records shape `StateTickXray` provides.

## What to Change

### 1. Rebind the x-ray tree to `StateTickXray`

Change `XRayPanel`'s prop from `pageDetail: PageDetail` to `tick: StateTickXray` (or equivalent), and update `MobileSummaryBar`, `StickyRail`, `CurrentStateTab`, `ValidationIntegrityTab`, `WhatChangedHereTab` to read their fields from `StateTickXray` (active records by class, state-snapshot summary, validation trace, event delta, created/superseded/closed records, emitted choices, raw PG YAML). `groupActiveRecords.ts` and `RecordCard*` are unchanged.

### 2. Remove `PlanProseTab`

Delete `components/xray/tabs/PlanProseTab.tsx` + its tests, and remove it from the tab registry/`XRayTabs`. Plan/prose/receipt are scene-scoped (SPEC97STOEXPSCE-006), not PG-x-ray content.

### 3. Add `StateTickDrawer`

New `components/StateTickDrawer.tsx` wrapping the rebound `XRayPanel`: opens for a given `pgId` (fetches via `getStateTickXray` from 001), deep-linkable via `?focus=PG-N`, dismissible. Plus a11y test.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/MobileSummaryBar.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/StickyRail.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/WhatChangedHereTab.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/XRayTabs.tsx` (modify — drop PlanProseTab from tab set)
- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (delete)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.test.tsx` (delete)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/PlanProseTab.a11y.test.tsx` (delete)
- `tools/story-explorer/web/src/components/StateTickDrawer.tsx` (new)
- `tools/story-explorer/web/src/components/StateTickDrawer.test.tsx` (new)
- `tools/story-explorer/web/src/components/StateTickDrawer.a11y.test.tsx` (new)
- existing rebound-tab `__tests__/*` under `components/xray/` (modify — repoint fixtures to `StateTickXray`)

## Out of Scope

- Scene-scoped plan/prose/receipt panels (`ScenePlanPanel`/`SceneProsePanel`/`SceneReceiptPanel`) — owned by SPEC97STOEXPSCE-006.
- Timeline route + PG-tick click that opens the drawer — owned by SPEC97STOEXPSCE-004 (this ticket provides the drawer; 004 wires the tick→drawer interaction).
- Removing `PageDetail` from `client.ts` — owned by SPEC97STOEXPSCE-008.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` — rebound xray tab tests + `StateTickDrawer` tests + a11y tests pass.
2. `cd tools/story-explorer/web && npm run build` — `tsc` confirms no residual `PageDetail` references in `components/xray/`.
3. `grep -rn "PlanProseTab" tools/story-explorer/web/src` — zero matches (removed cleanly).

### Invariants

1. The x-ray surface renders only committed `PG` state (active records, deltas, validation, raw YAML), never rendered prose — §Story Bundles §4a Plan-Authority Boundary preserved.
2. `StateTickDrawer` is a drawer reached via query-state focus, never a route segment — no `/pages/:pageId`-style reader route is reintroduced.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/StateTickDrawer.test.tsx` + `.a11y.test.tsx` — drawer open/close, focus binding, a11y.
2. `tools/story-explorer/web/src/components/xray/**/__tests__/*` — repoint existing tab/panel fixtures from `PageDetail` to `StateTickXray`.

### Commands

1. `cd tools/story-explorer/web && npm test`
2. `cd tools/story-explorer/web && npm run build`
