# SPEC89STOEXPSTA-004: Current State tab + virtualization threshold

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modified `tabs/CurrentStateTab.tsx`, route/X-Ray slug plumbing, web package dependency metadata, styles, and focused frontend tests to implement Current State grouping and virtualization
**Deps**: archive/tickets/SPEC89STOEXPSTA-001.md, archive/tickets/SPEC89STOEXPSTA-002.md, archive/tickets/SPEC89STOEXPSTA-003.md

## Problem

At intake, SPEC-89 §4.1 defined Current State as the default X-Ray tab but the live frontend still rendered the placeholder stub from SPEC89STOEXPSTA-001. This ticket implemented the tab content: active-record card fetches through SPEC-87's `/records/:recordId` route, group assembly, group ordering, visible-affordance chips, and virtualization for ≥50-record groups.

## Assumption Reassessment (2026-05-26)

1. `tabs/CurrentStateTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency; this ticket modifies it). SPEC-87 `PageDetail.currentStateRecordIds: string[]` exists per `tools/story-explorer/src/view-models/page-detail.ts` (verified via SPEC-87 §4). The `/api/.../records/:recordId` route exists per SPEC-87 §5 + `tools/story-explorer/src/server/routes/records.ts:73-102` (verified). `PG.state_snapshot.visible_affordances` exists on the PG schema per `tools/validators/src/schemas/story-page.schema.json:111` (verified during 2026-05-26 reassessment).
2. SPEC-89 §3 (group taxonomy table, updated 2026-05-26 to include BR in Cast & Status + CHC in Event Delta), §4.1 (Current State tab specification with group ordering), and §10 (≥50-record virtualization threshold). The group ordering per §4.1: Cast & Status → Scene & Affordances → Knowledge & Truth → Plans & Emotion → Relationships & Debts → Pressure & Open Loops → Validation & Integrity (Event Delta lives in tab 4.2).
3. Cross-skill boundary: SPEC-87's `PageDetail.currentStateRecordIds` is the data source; SPEC-87's `/records/:recordId` route returns parsed body + `recordCard` view-model per ticket SPEC89STOEXPSTA-002's contract. This ticket composes XRayGroup (from -002) + RecordCardCompact (from -002, dispatching via -003's renderers) into the 8-group display. Virtualization uses a generic virtualization library (e.g., `@tanstack/react-virtual`) added as a web-tree dependency.
4. Live implementation also required passing `worldSlug` and `storySlug` from `page-read.tsx` into `XRayPanel` / `CurrentStateTab`; without those route params the tab could not call the existing record route. This is same-seam slug plumbing, not new backend behavior.
5. `@tanstack/react-virtual` was added to `tools/story-explorer/web/package.json` and `package-lock.json`; the local `node_modules` install was refreshed for verification only and remains ignored.

## Architecture Check

1. Eager group-membership classification by class label (one pass over `currentStateRecordIds`) keeps the group assembly O(N) with no per-render reclassification. The alternative (per-render filtering inside each group component) would re-walk the active-records list at every render; pre-classifying once on tab open is cheaper.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; virtualization is gated on a count threshold rather than always-on.

## Verification Layers

1. CurrentStateTab renders 8 groups in the §4.1-prescribed order → render test with fixture `currentStateRecordIds` spanning all 8 groups → vitest + RTL.
2. Each group's header shows the deterministic chip composition (count + hidden + low-confidence) → assertion against rendered chip text.
3. Virtualization activates above the 50-record threshold (mockable via stub fixture) → test renders 60 records into one group, asserts only the visible window is DOM-mounted.
4. `visible_affordances` from `PG.state_snapshot` renders in the Scene & Affordances group → fixture test with affordances populated.

## Landed Changes

### 1. Modify `tabs/CurrentStateTab.tsx`

Replaced the placeholder with the real implementation:

- Accepts `pageDetail`, `worldSlug`, and `storySlug` as props.
- On mount, fetches each active record through `getRecord(worldSlug, storySlug, recordId)` and consumes the returned server-side `recordCard` view-model.
- Classifies loaded records into 8 groups by record-class prefix:
  - **Cast & Status**: STENT, STCHAR, STSTAT, BR
  - **Scene & Affordances**: STLOC, STOBJ, DA, plus `pageDetail.page.state_snapshot.visible_affordances`
  - **Knowledge & Truth**: BEL, SF, STSEC, STQ
  - **Plans & Emotion**: STPLAN, STEMO, STINT
  - **Relationships & Debts**: SREL, OBL
  - **Pressure & Open Loops**: CNSQ, THR, CLK, SLT
  - **Event Delta**: SE, CHC (uncontinued — emitted-but-no-committed-child-PG; per SPEC-88 §6)
  - **Validation & Integrity**: rendered as a separate header even though its content lives in tab 4.4 (this group surfaces validation chips only)
- Renders groups in the §4.1 order, each as `<XRayGroup>` with record-card children.
- Below the threshold, renders `<RecordCardExpanded>` for each loaded card so the existing expanded-card disclosure and raw-record lazy fetch remain the expansion path.
- At the ≥50 threshold, uses `useVirtualizer` to mount a compact-card window inside a bounded scroll region.
- Renders `PG.state_snapshot.visible_affordances` as inline chips inside the Scene & Affordances group rather than as records.
- Reports loading and per-record fetch failures with status/alert text.

### 2. Add `@tanstack/react-virtual` to `tools/story-explorer/web/package.json` dependencies

Added `@tanstack/react-virtual` to the dependencies block and lockfile.

### 3. Add `tabs/__tests__/CurrentStateTab.test.tsx`

Added render tests with fixture `currentStateRecordIds` spanning all 8 groups plus a 60-record fixture exercising the virtualization threshold.

### 4. Wire route slugs into X-Ray

Updated `XRayPanel` and `page-read.tsx` so Current State has the route context required to fetch records. Updated affected shell/route tests and the page-read a11y fixture so existing route tests do not accidentally call the real record API.

### 5. Add styles

Added Current State group, affordance-chip, and virtualized-list styles to `tools/story-explorer/web/src/styles/app.css`.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/CurrentStateTab.test.tsx` (new)
- `tools/story-explorer/web/package.json` (modify — add `@tanstack/react-virtual` dep)
- `tools/story-explorer/web/package-lock.json` (modify — lock `@tanstack/react-virtual` and `@tanstack/virtual-core`)
- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (modify — pass story/world slugs into Current State)
- `tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` (modify — pass story/world slugs and update placeholder assertion)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — pass route slugs into X-Ray)
- `tools/story-explorer/web/src/routes/page-read.test.tsx` (modify — keep route fixture from invoking record fetches outside this ticket's focused test)
- `tools/story-explorer/web/src/routes/page-read.a11y.test.tsx` (modify — keep a11y fixture from invoking record fetches outside this ticket's focused test)
- `tools/story-explorer/web/src/styles/app.css` (modify — Current State group/list styles)

## Out of Scope

- Per-tab content for What Changed Here, Plan & Prose, Validation & Integrity (their own tickets: 005-007).
- Linked-record navigation behavior — that's `archive/tickets/SPEC89STOEXPSTA-008.md`.
- Sticky rail counts that mirror this tab's group counts (SPEC89STOEXPSTA-011).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- CurrentStateTab.test` — group assembly + ordering + virtualization-threshold tests pass.
2. `cd tools/story-explorer/web && npm test -- XRayPanel.test page-read.test page-read.a11y.test` — shell and route integration remain green.
3. `cd tools/story-explorer && npm run build` — build succeeds with new dependency.
4. `cd tools/story-explorer && npm test` — full package suite passes.

### Invariants

1. Group classification is by class-prefix only — no semantic re-classification per record content. A record's group is determined by its ID prefix at all times.
2. Virtualization fires only above the 50-record threshold; below the threshold, the full record list is DOM-mounted for a11y traversal continuity.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/CurrentStateTab.test.tsx` — fixture-driven render + virtualization tests.
2. `tools/story-explorer/web/src/components/xray/__tests__/XRayPanel.test.tsx` — updated for the new slug props and Current State placeholder removal.
3. `tools/story-explorer/web/src/routes/page-read.test.tsx` and `tools/story-explorer/web/src/routes/page-read.a11y.test.tsx` — updated route fixtures for the new X-Ray record-fetch boundary.

### Commands

1. `cd tools/story-explorer/web && npm test -- CurrentStateTab.test` — targeted.
2. `cd tools/story-explorer/web && npm test -- XRayPanel.test page-read.test` — adjacent shell/route tests.
3. `cd tools/story-explorer/web && npm test -- page-read.a11y.test` — route a11y fixture check after removing unintended async record fetch noise.
4. `cd tools/story-explorer && npm run build` — chained build with new dependency.
5. `cd tools/story-explorer && npm test` — full package suite.

## Outcome

Completed on 2026-05-26.

Current State now fetches active record cards from the SPEC-87 record route, groups them into the SPEC-89 taxonomy, renders visible affordances in Scene & Affordances, and virtualizes groups at the ≥50-record threshold. The page-read route now passes story/world slugs into `XRayPanel` so the tab can resolve records without client-side RecordCard rebuilding. `@tanstack/react-virtual` was added to the web package dependency set.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- CurrentStateTab.test` — PASS, 2 tests.
2. `cd tools/story-explorer/web && npm test -- XRayPanel.test page-read.test` — PASS, 6 tests; emitted the existing React Router v7 future-flag warning.
3. `cd tools/story-explorer/web && npm test -- page-read.a11y.test` — PASS, 2 tests; emitted the existing React Router v7 future-flag warning.
4. `cd tools/story-explorer && npm run build` — PASS; web TypeScript + Vite build and backend TypeScript build succeeded.
5. `cd tools/story-explorer && npm test` — PASS; backend node tests passed 74/74 and web Vitest passed 50 files / 135 tests. The suite emitted existing React Router v7 future-flag warnings and the intentional ErrorBoundary stderr from the existing a11y test.

## Deviations

- The drafted "visual smoke in dev mode" was covered by automated render/route/a11y tests instead of a separate dev-server manual run. `CurrentStateTab.test.tsx` proves the 8 groups, affordance chips, and virtualization threshold; existing `XRayGroup` and `RecordCard` tests cover disclosure toggling and expanded-card behavior.
- `XRayPanel`, `page-read.tsx`, route tests, and app styles were added to the file set as same-seam support surfaces because the Current State tab needs route slugs, fixture isolation, and list styling to function truthfully.
