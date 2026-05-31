# SPEC103PROPASSEG-012: StateUpdateChecklist component (modal)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (the post-save modal component rendering ticket 005's typed checklist payload), extends the web type mirror with the checklist payload shape, and teaches the Records page to honor the checklist-origin `?cast=` prefilter.
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md

## Problem

SPEC-103 §2 item 6 specifies the State Update Checklist UI: appears as a modal after Save Segment, lists 12 record classes the author should review (statuses, emotions, beliefs, relationships, objects, plans, clocks, secrets, questions, consequences, obligations, threads), each class has a "Review N records" button that opens the Records screen filtered to that class with the involved cast pre-filtered, plus a "Skip review" action that closes the modal. The lead text reads "Review these categories manually. Manual Story Studio has not changed any records." — the literal SPEC-required disclaimer per ticket 005's `CHECKLIST_DISCLAIMER` constant. The checklist NEVER asserts that any record changed; the LLM cannot have changed Manual Studio state by definition (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary).

## Assumption Reassessment (2026-05-31)

1. Existing frontend component convention (`tools/manual-story-studio/web/src/components/RecordCard.tsx`, `RecordForm.tsx`, `RefList.tsx`, `LintBadge.tsx`) uses functional React components with typed props and minimal local state. At intake, `tools/manual-story-studio/web/src/pages/Records.tsx` honored `?class=` and `?id=` but did not honor `?cast=`. Because SPEC-103 requires the checklist review buttons to open Records with the involved cast pre-filtered, this ticket owns the small Records consumer extension.
2. SPEC-103 §2 item 6 (modal post-save + 12 review classes + per-class "Review N records" button opening Records screen filtered + Skip review action + lead disclaimer), §3 Key decisions item 4 (12-class exclusion rationale), §7 AC#6 ("State Update Checklist appears post-save, lists 12 review classes, never asserts state changed").
3. Cross-artifact boundary: this component consumes ticket 005's `StateUpdateChecklistPayload` shape. The web mirror did not yet include `StateUpdateChecklistPayload` or `StateUpdateChecklistEntry`, so this ticket extends `tools/manual-story-studio/web/src/types/manual-story.ts` additively. The component is consumed by ticket 011's PasteProse page (rendered as a modal after save). Navigation to the Records screen targets the existing SPEC-101-landed `Records.tsx` page with `?class=<record_class>&cast=<involved_cast>`.

## Architecture Check

1. Pure presentational component with typed `payload: StateUpdateChecklistPayload` and `onClose: () => void` props — no local state beyond modal visibility, no API calls (the payload is pre-computed by the backend per ticket 005). Keeps the component's responsibility narrow: render the checklist + dispatch navigation on per-class button click.
2. No backwards-compatibility aliasing — net-new component.

## Verification Layers

1. Component renders all entries from `payload.entries` (ticket 005 currently returns 12 entries) with no hardcoded class list in the component → TypeScript build + manual source review.
2. Lead text is exactly `payload.disclaimer` (the literal `CHECKLIST_DISCLAIMER` from ticket 005); component does NOT override the disclaimer locally → TypeScript build + manual source review.
3. "Review N records" button per class navigates to Records screen with `?class=<entry.record_class>&cast=<payload.involved_cast.join(',')>` → TypeScript build + manual source review of `StateUpdateChecklist.tsx` and `Records.tsx`.
4. "Skip review" action triggers `onClose()` without navigation → TypeScript build + manual source review.

## Landed Changes

### 1. Created web/src/components/StateUpdateChecklist.tsx

`tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` now exports `StateUpdateChecklist` and `StateUpdateChecklistProps`. The modal renders `payload.disclaimer`, maps every `payload.entries` item into a row, navigates review buttons to Records with class and cast query parameters, and calls `onClose` from the Skip review button.

### 2. Extended web type mirror for StateUpdateChecklistPayload

`tools/manual-story-studio/web/src/types/manual-story.ts` now mirrors `StateUpdateChecklistPayload` and `StateUpdateChecklistEntry`, using the existing `ManualRecordClass` union for `record_class`.

### 3. Extended Records screen cast filter contract

`tools/manual-story-studio/web/src/pages/Records.tsx` now reads `?cast=mchar-1,mchar-2`, loads record details for the active class, and filters the visible summaries to records whose `refs.characters` intersects the involved cast. The page preserves the `cast` query while syncing `class` / `id` URL state and displays the active cast filter.

## Files to Touch

- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (new)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify — added checklist payload mirror)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify — added `cast` query-parameter prefilter)

## Out of Scope

- The State Update Checklist payload computation itself (covered by ticket 005)
- The save flow that produces the payload (covered by `archive/tickets/SPEC103PROPASSEG-004.md`)
- The HTTP route returning the payload (covered by ticket 008)
- The PasteProse page rendering this modal (covered by ticket 011 — imports this component)
- Persistent log of which classes the author actually reviewed (M6 deferral per SPEC-103 §2 Out of scope)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle builds with the new component and Records filter extension
2. `cd tools/manual-story-studio && npm test` — full suite green
3. Manual smoke check after ticket 011 + 015 land: trigger Save in PasteProse → modal renders with 12 entries + lead disclaimer + per-class buttons + Skip review button

### Invariants

1. Component renders exactly `payload.entries.length` entries (= 12 per ticket 005's `CHECKLIST_REVIEW_CLASSES.length`); no entry is hardcoded or silently skipped.
2. Lead text equals `payload.disclaimer` verbatim — component does not override or modify the disclaimer locally. The literal text is "Review these categories manually. Manual Story Studio has not changed any records." per ticket 005's `CHECKLIST_DISCLAIMER` constant and SPEC-103 §2 item 6.
3. "Review N records" button per class triggers navigation to the Records screen with `?class=<entry.record_class>&cast=<involved_cast>` query parameters; no other side effect.
4. "Skip review" triggers `onClose()` without any navigation or API call.

## Test Plan

### New/Modified Tests

1. None added in this ticket. The web package has no component test framework; current web verification is TypeScript/Vite build. End-to-end modal behavior remains covered by ticket 016 capstone after tickets 011 and 015 wire the page and route.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (backend build + backend tests + web TypeScript check)

## Outcome

Completed 2026-05-31. Added the State Update Checklist modal component, the missing web payload mirror, and the Records page cast prefilter needed by the modal's review buttons. The implementation keeps the checklist payload as the single source of truth: rows come from `payload.entries`, the disclaimer comes from `payload.disclaimer`, and the component performs no record mutation or API call.

## Verification Result

1. `npm --prefix web run build` from `tools/manual-story-studio` — PASS; TypeScript and Vite build completed with the new component and Records filter.
2. `npm test` from `tools/manual-story-studio` — PASS; backend build, 269 backend tests, and web TypeScript check completed successfully.
3. Manual source review — PASS; `StateUpdateChecklist` renders all `payload.entries`, uses `payload.disclaimer` verbatim, navigates review buttons to Records with `class` and `cast` query params, and wires Skip review to `onClose`.

## Deviations

- No web component test file was added because the current web package exposes only `build` and `test` as TypeScript/Vite checks; there is no component test framework in the package. Ticket 016 remains the capstone owner for end-to-end modal behavior after PasteProse and routes are wired.
