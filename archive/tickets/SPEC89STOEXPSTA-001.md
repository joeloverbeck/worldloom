# SPEC89STOEXPSTA-001: X-Ray shell — XRayPanel + XRayTabs + page-read slot wiring

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — new `tools/story-explorer/web/src/components/xray/` subdirectory; modifies `tools/story-explorer/web/src/routes/page-read.tsx`, route tests, and app CSS to replace the X-Ray slot placeholder
**Deps**: None

## Problem

At intake, SPEC-88 left an explicit X-Ray slot at `tools/story-explorer/web/src/routes/page-read.tsx` (`<p>State X-Ray slot (SPEC-89 fills)</p>`). SPEC-89 §4 prescribes a four-tab structure (Current State / What Changed Here / Plan & Prose / Validation & Integrity) with WAI-ARIA tablist semantics, and §11 prescribes arrow-key navigation between tabs. This ticket establishes the X-Ray panel's chrome — the panel component, the tab list primitive, and four placeholder tab stubs that subsequent tickets (004-007) replace with real content. The slot in page-read.tsx is rewired to mount `<XRayPanel pageDetail={pageDetail} />`.

## Assumption Reassessment (2026-05-26)

1. At intake, `tools/story-explorer/web/src/routes/page-read.tsx` existed with the X-Ray placeholder slot. `tools/story-explorer/web/src/components/disclosure/` exists per SPEC-88 §3 layout (verified). No prior `xray/` subdirectory existed under `web/src/components/` at intake (verified — namespace clear for the new sub-tree).
2. SPEC-89 §4 (Tabs) and §11 (Accessibility) name the four-tab structure and WAI-ARIA tablist contract; §14 (Frontend component layout) prescribes `XRayPanel.tsx`, `XRayTabs.tsx`, and `tabs/<TabName>.tsx` files under `tools/story-explorer/web/src/components/xray/`. The SPEC-89 spec file is at `specs/SPEC-89-story-explorer-state-xray-layer.md`.
3. Cross-skill boundary: SPEC-88's `routes/page-read.tsx` ships an X-Ray slot expecting SPEC-89 to fill it. This ticket modifies that landed SPEC-88 surface — extends landed SPEC-88 frontend code as new SPEC-89 work, not a SPEC-88 amendment, since SPEC-88 is COMPLETED+archived. The integrity chip in `<PageHeader>` and the four-tab structure together set the page-level shell SPEC-89's per-tab tickets (004-007) populate.
4. Live package tooling uses Vitest and React Testing Library but does not include `@testing-library/user-event`; the keyboard proof uses `fireEvent.keyDown` instead of adding a new dependency.
5. The `tools/story-explorer` chained build requires `@worldloom/world-index` built artifacts. Verification refreshed ignored dependency/build artifacts under `tools/world-index/` and `tools/story-explorer/`, but no package source or manifest changes were needed.

## Architecture Check

1. The tab-stub pattern (T001 creates the 4 tab placeholder files; T004-T007 each modify their assigned tab) keeps the panel-to-tab wiring stable across the implementation series: every tab file's path is known the moment T001 lands, so T004-T007 don't have to coordinate with one another about file-creation order. The alternative (T01 imports tabs lazily and each later ticket creates its own tab file) would force tab-component path naming into T01's contract before the tabs are designed; the stub pattern decouples that.
2. No backwards-compatibility aliasing or shims introduced — the X-Ray subdirectory is greenfield; the page-read.tsx slot replacement is a direct text swap (not an alias / re-export / feature flag).

## Verification Layers

1. `<XRayPanel>` renders 4 tabs with the correct WAI-ARIA roles → render test with `getByRole('tablist')` + `getAllByRole('tab')` returning 4 → codebase grep-proof on tab labels.
2. Arrow-key navigation between tabs updates `aria-selected` → keyboard interaction test asserting selected-tab cycling → Vitest + RTL `fireEvent.keyDown`.
3. `routes/page-read.tsx` slot replacement preserves SPEC-88's reading-section semantics → manual review (visual inspection in dev mode) + render test asserting `<XRayPanel>` mounts inside `<section className="reading-section xray-section">`.

## Landed Changes

### 1. Create `tools/story-explorer/web/src/components/xray/XRayPanel.tsx`

Top-level X-Ray slot. Owns the four-tab state machine (which tab is currently active). Accepts `pageDetail: PageDetail` as a prop (the SPEC-87 PageDetail view-model). Renders `<XRayTabs>` plus the active tab's body. Tab dispatch by string key (`"current-state"` / `"what-changed"` / `"plan-prose"` / `"validation"`), with `<CurrentStateTab>`, `<WhatChangedHereTab>`, `<PlanProseTab>`, `<ValidationIntegrityTab>` as the four tab body components.

Default active tab: `"current-state"` (per SPEC-89 §4.1).

### 2. Create `tools/story-explorer/web/src/components/xray/XRayTabs.tsx`

WAI-ARIA tablist primitive. Renders `<div role="tablist">` containing four `<button role="tab">` elements with `aria-selected`, `aria-controls`, and `tabIndex` properly set per the WAI-ARIA APG tabs pattern. Arrow-key navigation: ArrowRight / ArrowLeft cycle through tabs; Home / End jump to first / last. Tab labels: "Current State", "What Changed Here", "Plan & Prose", "Validation & Integrity".

### 3. Create four placeholder tab files

Each is a minimal stub component that renders the tab name + a "to be filled" placeholder. T004-T007 replace these with real content:

- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` — placeholder for SPEC89STOEXPSTA-004
- `tools/story-explorer/web/src/components/xray/tabs/WhatChangedHereTab.tsx` — placeholder for SPEC89STOEXPSTA-005
- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` — placeholder for SPEC89STOEXPSTA-006
- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` — placeholder for SPEC89STOEXPSTA-007

Each accepts `pageDetail: PageDetail` as a prop and renders a `<section>` with the tab name as `<h3>` plus a "Tab content to be filled by SPEC89STOEXPSTA-NNN" paragraph.

### 4. Modify `tools/story-explorer/web/src/routes/page-read.tsx`

Replace the slot placeholder at lines 115-117:

```tsx
<section className="reading-section xray-section" aria-labelledby="xray-section-title">
  <h2 id="xray-section-title">State X-Ray</h2>
  <p>State X-Ray slot (SPEC-89 fills)</p>
</section>
```

with the X-Ray panel mount:

```tsx
<section className="reading-section xray-section" aria-labelledby="xray-section-title">
  <h2 id="xray-section-title">State X-Ray</h2>
  <XRayPanel pageDetail={pageDetail} />
</section>
```

Add the `import { XRayPanel } from "../components/xray/XRayPanel";` at the top.

### 5. Add render test and shell styling

`tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` covers panel rendering + tab cycling + initial tab default using Vitest + React Testing Library per the SPEC-88-established pattern. `page-read.test.tsx` now asserts the X-Ray tablist is mounted in the reading route. `app.css` adds the minimal shell styles needed for a usable tab row and placeholder panel.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (new)
- `tools/story-explorer/web/src/components/xray/XRayTabs.tsx` (new)
- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (new — placeholder)
- `tools/story-explorer/web/src/components/xray/tabs/WhatChangedHereTab.tsx` (new — placeholder)
- `tools/story-explorer/web/src/components/xray/tabs/PlanProseTab.tsx` (new — placeholder)
- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` (new — placeholder)
- `tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` (new)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify)
- `tools/story-explorer/web/src/routes/page-read.test.tsx` (modify)
- `tools/story-explorer/web/src/styles/app.css` (modify)

## Out of Scope

- Implementing actual tab content (covered by SPEC89STOEXPSTA-004 through -007).
- Record-card primitives (XRayGroup, RecordCardCompact, etc. — covered by SPEC89STOEXPSTA-002).
- Sticky rail / mobile summary bar (SPEC89STOEXPSTA-011).
- Accessibility tests (SPEC89STOEXPSTA-012 consolidates a11y across the X-Ray surface).
- Full visual styling beyond the minimal shell tab/panel CSS landed here.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- XRayPanel.test` — XRayPanel renders 4 tabs, Current State is default-active, arrow-key navigation cycles.
2. `cd tools/story-explorer && npm run build` — chained backend + web build succeeds; new `xray/` subdirectory compiles cleanly.
3. Visual smoke against a local served reading page: X-Ray section displays the four tabs below the choice list; clicking each tab shows the placeholder body.

### Invariants

1. `<XRayPanel>` is the only mount point for the X-Ray content; the reading-page section structure (header / breadcrumb / prose / choices / terminal / X-Ray / right-rail per SPEC-88 §4.4) remains unchanged in layout order.
2. The WAI-ARIA tablist contract (`role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`) is established once in T001 and reused by all future tabs.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` — render test + tab-cycling test.
2. `tools/story-explorer/web/src/routes/page-read.test.tsx` — route composition assertion updated to require the mounted X-Ray tablist.

### Commands

1. `cd tools/story-explorer/web && npm test -- XRayPanel.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package test suite (backend + web).
3. `cd tools/story-explorer && npm run build` — chained build proof.

## Outcome

Completed 2026-05-26.

- Added the X-Ray shell under `tools/story-explorer/web/src/components/xray/`: `XRayPanel`, `XRayTabs`, and four placeholder tab body components.
- Replaced the reading-page X-Ray placeholder with `<XRayPanel pageDetail={pageDetail} />`.
- Added minimal tab/panel styling and focused tests for initial selection, tab count, and keyboard tab selection.

## Verification Result

- `cd tools/story-explorer/web && npm test -- XRayPanel.test` — PASS, 1 file / 2 tests.
- `cd tools/story-explorer && npm run build` — PASS after refreshing ignored `tools/world-index/dist/` artifacts required by the existing `@worldloom/world-index` file dependency.
- `cd tools/story-explorer && npm test` — PASS, backend 74/74 node tests and web 45/45 files / 105 tests. The web lane emits existing React Router future-flag warnings and the expected ErrorBoundary test stderr, but all tests pass.
- Visual smoke: seeded a temporary repo under `/tmp/story-explorer-xray-smoke-*`, served the built Story Explorer on `127.0.0.1:5189`, and used Chrome DevTools to open `/worlds/erotica-world/stories/red-bunny/pages/PG-1`. The reading page rendered the State X-Ray section below Choices with four tabs; clicking What Changed Here, Plan & Prose, and Validation & Integrity showed their placeholder bodies; network requests were 200 and the browser console had no errors.

## Deviations

- The drafted keyboard test mentioned `userEvent.keyboard`, but the live web package does not include `@testing-library/user-event`; `fireEvent.keyDown` proves the same WAI-ARIA tab selection behavior without adding a dependency.
- The first `npm test -- XRayPanel.test` attempt failed before running tests because `tools/story-explorer/web/node_modules/` was absent; `npm install --no-audit --no-fund` restored package-local dependencies and the rerun passed.
- The first chained `npm run build` attempt failed before exercising the new X-Ray code because root story-explorer dependencies and sibling `@worldloom/world-index` build artifacts were absent. After `npm install --no-audit --no-fund` in `tools/story-explorer`, `npm install --no-audit --no-fund` plus `npm run build` in `tools/world-index`, the chained story-explorer build passed.
- The Playwright CLI wrapper hung under `npx`; the visual smoke used the available Chrome DevTools connector instead. The hung process was stopped before closeout.
