# SPEC89STOEXPSTA-004: Current State tab + virtualization threshold

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — modifies the `tabs/CurrentStateTab.tsx` stub created by SPEC89STOEXPSTA-001 to implement the 8-group taxonomy assembly with virtualization for ≥50-record groups
**Deps**: SPEC89STOEXPSTA-001, SPEC89STOEXPSTA-002, SPEC89STOEXPSTA-003

## Problem

SPEC-89 §4.1 defines Current State as the default X-Ray tab: it reads `PG.state_snapshot.active_records[]` (passed through SPEC-87's `PageDetail.currentStateRecordIds`) and renders each active record's compact card grouped by SPEC-89 §3's 8-group taxonomy with the §4.1-prescribed group ordering. SPEC-89 §10 prescribes a virtualization threshold for very-large groups (≥50 active records). This ticket implements the tab content — group assembly, group ordering, lazy-fetch per active-record body via `/records/:recordId`, virtualization wiring for huge groups, and integration of the §3 taxonomy that the 2026-05-26 reassessment extended (BR → Cast & Status, CHC → Event Delta).

## Assumption Reassessment (2026-05-26)

1. `tabs/CurrentStateTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency; this ticket modifies it). SPEC-87 `PageDetail.currentStateRecordIds: string[]` exists per `tools/story-explorer/src/view-models/page-detail.ts` (verified via SPEC-87 §4). The `/api/.../records/:recordId` route exists per SPEC-87 §5 + `tools/story-explorer/src/server/routes/records.ts:73-102` (verified). `PG.state_snapshot.visible_affordances` exists on the PG schema per `tools/validators/src/schemas/story-page.schema.json:111` (verified during 2026-05-26 reassessment).
2. SPEC-89 §3 (group taxonomy table, updated 2026-05-26 to include BR in Cast & Status + CHC in Event Delta), §4.1 (Current State tab specification with group ordering), and §10 (≥50-record virtualization threshold). The group ordering per §4.1: Cast & Status → Scene & Affordances → Knowledge & Truth → Plans & Emotion → Relationships & Debts → Pressure & Open Loops → Validation & Integrity (Event Delta lives in tab 4.2).
3. Cross-skill boundary: SPEC-87's `PageDetail.currentStateRecordIds` is the data source; SPEC-87's `/records/:recordId` route returns parsed body + `recordCard` view-model per ticket SPEC89STOEXPSTA-002's contract. This ticket composes XRayGroup (from -002) + RecordCardCompact (from -002, dispatching via -003's renderers) into the 8-group display. Virtualization uses a generic virtualization library (e.g., `@tanstack/react-virtual`) added as a web-tree dependency.

## Architecture Check

1. Eager group-membership classification by class label (one pass over `currentStateRecordIds`) keeps the group assembly O(N) with no per-render reclassification. The alternative (per-render filtering inside each group component) would re-walk the active-records list at every render; pre-classifying once on tab open is cheaper.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; virtualization is gated on a count threshold rather than always-on.

## Verification Layers

1. CurrentStateTab renders 8 groups in the §4.1-prescribed order → render test with fixture `currentStateRecordIds` spanning all 8 groups → vitest + RTL.
2. Each group's header shows the deterministic chip composition (count + hidden + low-confidence) → assertion against rendered chip text.
3. Virtualization activates above the 50-record threshold (mockable via stub fixture) → test renders 60 records into one group, asserts only the visible window is DOM-mounted.
4. `visible_affordances` from `PG.state_snapshot` renders in the Scene & Affordances group → fixture test with affordances populated.

## What to Change

### 1. Modify `tabs/CurrentStateTab.tsx`

Replace the placeholder with the real implementation:

- Accept `pageDetail: PageDetail` as a prop.
- On mount, classify `pageDetail.currentStateRecordIds` into 8 groups by record-class prefix:
  - **Cast & Status**: STENT, STCHAR, STSTAT, BR
  - **Scene & Affordances**: STLOC, STOBJ, DA, plus `pageDetail.page.state_snapshot.visible_affordances`
  - **Knowledge & Truth**: BEL, SF, STSEC, STQ
  - **Plans & Emotion**: STPLAN, STEMO, STINT
  - **Relationships & Debts**: SREL, OBL
  - **Pressure & Open Loops**: CNSQ, THR, CLK, SLT
  - **Event Delta**: SE, CHC (uncontinued — emitted-but-no-committed-child-PG; per SPEC-88 §6)
  - **Validation & Integrity**: rendered as a separate header even though its content lives in tab 4.4 (this group surfaces validation chips only)
- Render groups in the §4.1 order, each as `<XRayGroup title={...} recordIds={...}>` containing `<RecordCardCompact>` items.
- Active-record body fetches are lazy: a `<RecordCardCompact>` mounts without fetching the parsed body; on expand (handled by `<RecordCardExpanded>`), the body is fetched via `/records/:recordId`. This honors SPEC-89 §10's lazy-expand rule.
- Virtualization: when a group's record count is ≥50, wrap the card list in `useVirtualizer` (from `@tanstack/react-virtual` or equivalent). The threshold is configurable via a module-level constant for tunability per SPEC-89 §16 Risk 1.
- For visible_affordances, render an inline list inside the Scene & Affordances group rather than as records (they're affordance keys, not records).

### 2. Add `@tanstack/react-virtual` to `tools/story-explorer/web/package.json` dependencies

Append to the dependencies block.

### 3. Add `tabs/__tests__/CurrentStateTab.test.tsx`

Render test with fixture `currentStateRecordIds` spanning all 8 groups + a 60-record fixture exercising the virtualization threshold.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/tabs/CurrentStateTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/CurrentStateTab.test.tsx` (new)
- `tools/story-explorer/web/package.json` (modify — add `@tanstack/react-virtual` dep)

## Out of Scope

- Per-tab content for What Changed Here, Plan & Prose, Validation & Integrity (their own tickets: 005-007).
- Linked-record navigation behavior — that's SPEC89STOEXPSTA-008.
- Sticky rail counts that mirror this tab's group counts (SPEC89STOEXPSTA-011).
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- CurrentStateTab.test` — group assembly + ordering + virtualization-threshold tests pass.
2. `cd tools/story-explorer && npm run build` — build succeeds with new dep.
3. Visual smoke in dev mode against the red-bunny fixture (or a temp-seeded equivalent): Current State tab shows the 8 groups; clicking each group toggles expansion; clicking a compact card mounts the expanded view.

### Invariants

1. Group classification is by class-prefix only — no semantic re-classification per record content. A record's group is determined by its ID prefix at all times.
2. Virtualization fires only above the 50-record threshold; below the threshold, the full record list is DOM-mounted for a11y traversal continuity.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/CurrentStateTab.test.tsx` — fixture-driven render + virtualization tests.

### Commands

1. `cd tools/story-explorer/web && npm test -- CurrentStateTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build with new dep.
