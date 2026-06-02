# SPEC109MANSTOSTU-008: CurrentStatePanel + Dashboard wire-up

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds `web/src/components/CurrentStatePanel.tsx`; modifies `web/src/pages/Dashboard.tsx` to mount the panel at the top and de-emphasize the existing importance-bucketed records panel.
**Deps**: archive/tickets/SPEC109MANSTOSTU-005.md

## Problem

The Dashboard is currently a list of summaries (cast, segments, high-importance records); per SPEC-109 §1 motivation it does not render the cockpit's "current state glance." When current-context.yaml is present, the dashboard should surface current location, POV holder, current cast (chips), active pressure clocks (chips), active secrets (chips), and the current handoff summary paragraph; when absent, it should render a "Set current context" affordance routing to the Edit Current Context page (010). The high-importance records panel — useful but secondary — is de-emphasized so the new Current State panel becomes the dashboard's primary surface. This is the load-bearing UX deliverable that unblocks SPEC-111's cockpit pieces.

## Assumption Reassessment (2026-06-01)

1. **Codebase**: `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (line 17) declares `HIGH_IMPORTANCE = new Set(["high", "central"])`; lines 129-146 produce the top-20 high-importance records memo; the `<section aria-label="high-importance">` is the panel under de-emphasis. `web/src/components/` already hosts sibling display components (`RecordCard.tsx`, `LintBadge.tsx`, `HealthBanner.tsx`, etc.); `CurrentStatePanel.tsx` does not exist (no name collision). The dashboard's React Router context provides `worldSlug` + `msSlug` via `useParams`.
2. **Spec**: SPEC-109 §2 item 8 specifies the Current State panel's content (location, POV, current cast chips, active pressure clocks chips, active secrets chips, current_handoff_summary paragraph). SPEC-109 §4 modify list calls for Dashboard to "mount `<CurrentStatePanel />` at the top; remove or de-emphasize the importance-bucketed records panel since the current-state panel is now primary."
3. **Cross-skill boundary**: The panel consumes `fetchCurrentContext(worldSlug, msSlug)` from `web/src/api/current-context.ts` (005); the dashboard composes it with existing data-loading hooks. When current-context is absent (API returns `null`), the panel renders the "Set current context" affordance routing to `/worlds/<world>/manual-stories/<ms>/current-context/edit` (the route owned by 010).

## Architecture Check

1. A standalone `CurrentStatePanel` component keeps the dashboard a thin composition surface rather than embedding panel logic inline; the panel is independently testable and can be reused by SPEC-111's future cockpit layouts.
2. De-emphasizing rather than removing the high-importance panel preserves a useful secondary surface for stories without current-context, avoiding a hard regression for existing users; "de-emphasize" here means moving the panel below the Current State panel and reducing its visual weight (smaller heading, collapsed by default if the surrounding design permits).
3. No backwards-compatibility shims: the new panel is additive; the dashboard reflow is a single-file edit.

## Verification Layers

1. CurrentStatePanel renders the 6 named content blocks when payload is present → manual verification per AC #9 + (recommended) a component-level RTL test if the package's test infrastructure supports it.
2. CurrentStatePanel renders "Set current context" affordance when payload is `null` → manual verification.
3. Dashboard mounts `<CurrentStatePanel />` at the top → manual verification (visual inspection); web tsc-only test confirms component is imported and referenced.
4. Dashboard's existing high-importance panel still renders (de-emphasized, not removed) → manual verification.
5. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) → AC #12.

## Landed Changes

### 1. New component at `web/src/components/CurrentStatePanel.tsx`

Added `CurrentStatePanel` with props `{ ctx: CurrentContext | null; worldSlug: string; msSlug: string }`.

- When `ctx === null`, the panel renders the "Current State" empty state plus a "Set current context" link to `/worlds/<worldSlug>/manual-stories/<msSlug>/current-context/edit`.
- When context is present, the panel renders current location, POV holder, current cast chips, active pressure clock chips, active secrets/questions chips, and the current handoff summary paragraph.

### 2. Dashboard wire-up at `web/src/pages/Dashboard.tsx`

- Imported `fetchCurrentContext` from `web/src/api/current-context.ts` and loads current context in the existing dashboard data-loading effect alongside the other dashboard surfaces.
- Imported and mounted `CurrentStatePanel` near the top of the dashboard, before the story contract and high-importance records sections.
- Added a current-context load error alert with the dashboard's existing retry pattern.
- De-emphasized the high-importance records section by demoting the heading from `<h2>` to a smaller `<h3>` while preserving the existing high-importance data flow.

## Files to Touch

- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (new)
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)

## Out of Scope

- Edit Current Context page (the target of the "Set current context" affordance) — owned by 010.
- Backend API surfaces for current-context — owned by 005.
- MomentComposer seeding — owned by 009.
- Mark-state-reviewed button — owned by 011.
- Full UX cockpit consolidation (left rail / right rail / keyboard shortcuts) — SPEC-111 scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (tsc --noEmit) — confirms type-correctness of new component and Dashboard wire-up.
2. AC #9 — Dashboard renders the CurrentStatePanel from current-context when present; renders a "Set current context" affordance when absent. (manual verification)

### Invariants

1. The Dashboard's existing per-section data flows (cast, segments, manuscript, records-by-class) remain functional; current-context loading is additive, not replacing.
2. The high-importance panel is de-emphasized but still present — no regression for stories without current-context.

## Test Plan

### New/Modified Tests

1. `None — UI-only ticket; verification is the web tsc command (AC #12) and manual verification of AC #9. Pipeline-level test coverage lives in 005's route-integration test (server-side) and 007's compose test (composer behavior).`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `cd tools/manual-story-studio && npm test` (full pipeline includes web tsc).

## Outcome

Implemented the dashboard current-state glance for SPEC-109. The web UI now fetches current-context data, renders a primary Current State panel with the required context fields when present, and offers the future Edit Current Context route when the context file is absent. The existing high-importance records panel remains available below the primary current-state surface with reduced heading weight.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — PASS (`tsc -p tsconfig.json --noEmit`).
2. `cd tools/manual-story-studio && npm test` — PASS (427 backend tests plus web `tsc --noEmit`).
3. `git diff --check -- archive/tickets/SPEC109MANSTOSTU-008.md tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx tools/manual-story-studio/web/src/pages/Dashboard.tsx` — PASS.

## Deviations

The panel renders IDs directly as chips for cast, pressure clocks, and secrets/questions. Title resolution is not part of this ticket's owned seam and can remain a future UI enhancement.
