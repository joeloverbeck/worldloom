# SPEC105MANSTOSTU-012: Frontend silent-catch removal in Dashboard + MomentComposer

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (4 `.catch(() => {})` removals at lines 67, 72, 77, 101) and `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (3 `.catch(() => {})` removals at lines 66, 71, 89). Replaces silent swallowing with the `useStoryHealth → banner` pattern from archive/tickets/SPEC105MANSTOSTU-011.md. No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-011.md

## Problem

SPEC-105 §1 Context flags 7 `.catch(() => {})` occurrences across the live frontend tree that swallow backend integrity failures behind empty/loading states (verified at Dashboard.tsx:67/72/77/101 and MomentComposer.tsx:66/71/89). Each silently swallows a backend API failure for a health-relevant read (metadata, records list, segments list, per-class records). Per SPEC-105 §2 item 6, the removals replace silent swallowing with one of two patterns: (a) for health-relevant reads, surface via `useStoryHealth → banner` (the page itself renders an error state in the affected panel); (b) for genuinely-optional reads, explicit handling distinguishing absent from failed. All 7 catches are health-relevant.

## Assumption Reassessment (2026-06-01)

1. The 7 `.catch(() => {})` occurrences are verified at the exact line numbers spec'd via `grep -nE "\.catch\(\(\) => \{\}\)" tools/manual-story-studio/web/src/pages/Dashboard.tsx tools/manual-story-studio/web/src/pages/MomentComposer.tsx`:
   - Dashboard.tsx line 67 (after `apiReadMetadata`); line 72 (after `apiList "cast"`); line 77 (after `listSegments`); line 101 (after `Promise.all(...records)`).
   - MomentComposer.tsx line 66 (after `readMetadata`); line 71 (after `listRecords "cast"`); line 89 (after `Promise.all(...records)`).
   The Dashboard.tsx line 84–86 `.catch(() => { if (!cancelled) setManuscriptMissing(true); })` is a DIFFERENT pattern (typed empty-vs-failed handling) that's preserved unchanged — it's the absent-vs-failed handling per spec §2 item 6 pattern (b).
2. SPEC-105 §2 item 6 + §7 AC#7 specify the verification: `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/` returns zero matches after the removal.
3. Cross-skill boundary: this ticket consumes `useStoryHealth` from archive/tickets/SPEC105MANSTOSTU-011.md. The replacement pattern is: instead of `.catch(() => {})`, surface the failure to the banner via the natural HTTP error path (the backend route returns 409 with HealthReport when corrupt; the frontend API wrapper returns a rejected promise; the page's `.catch` either (a) calls `refetch()` on the health hook to surface the banner OR (b) sets a panel-level error state if the read is genuinely panel-local).
4. The Dashboard/MomentComposer pages' existing `.then(...).catch(...)` chains run inside `useEffect` cleanup blocks — preserving the `cancelled` ref pattern is important for race-condition safety. The replacement removes the catch's silent-no-op but preserves the early-return-on-cancelled guard.

## Architecture Check

1. The replacement pattern is consistent across all 7 sites: silent `.catch(() => {})` → explicit panel-level error state (e.g., `setCastError(true)`) that the panel's render path checks. The health banner is hydrated separately via `useStoryHealth` from ticket 011; when a per-page read fails, the banner's poll-on-next-mount surfaces the structural reason. Page-level error states are panel-bound, not banner-bound — the banner reflects backend integrity, the panel reflects the current fetch's outcome.
2. No backwards-compatibility aliasing/shims.

## Verification Layers

1. The 7 silent catches removed → codebase grep-proof: `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/pages/Dashboard.tsx tools/manual-story-studio/web/src/pages/MomentComposer.tsx` returns zero matches (per SPEC-105 §7 AC#7).
2. The pages still compile under `tsc --noEmit` → web subpackage typecheck passes.
3. Manual verification per SPEC-105 §6: open a dashboard for a story with corrupt metadata; confirm the health banner renders (from ticket 011) AND the metadata-driven panels render an error state.

## What to Change

### 1. `tools/manual-story-studio/web/src/pages/Dashboard.tsx`

For each of lines 67 / 72 / 77 / 101:

- Replace `.catch(() => {})` with `.catch((e) => { if (!cancelled) setPanelError(e.message); })` where `setPanelError` is a new state setter on the page that the affected panel's render path checks.
- Add a small `panel-error` state per panel (cast / segments / records-by-class / metadata).
- In the panel render, when `panelError` is set, render a small inline "Failed to load" with the error message and a retry button that resets the error state and re-fetches.

The line 84–86 catch (manuscript present-vs-missing) is PRESERVED unchanged — it already distinguishes the typed empty-vs-failed case per spec §2 item 6 pattern (b).

### 2. `tools/manual-story-studio/web/src/pages/MomentComposer.tsx`

For each of lines 66 / 71 / 89: same shape as Dashboard — replace silent `.catch(() => {})` with explicit panel error state + retry.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` (modify — implementation note)

## Out of Scope

- Other `.catch` patterns elsewhere in `web/src/` (e.g., `.catch(() => ({}))` inside fetch error JSON parsing — those are valid defensive idioms, not silent integrity swallowing).
- The frontend health-banner component / hook / api — archive/tickets/SPEC105MANSTOSTU-011.md.
- Removing `.catch` from form-submission paths (record save / contract edit / prompt save) — those have their own error-display surfaces in the calling form, and aren't on the 7 silent-swallow list.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` runs and the web subpackage `tsc --noEmit` step passes.
2. `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/` returns zero matches (per SPEC-105 §7 AC#7).
3. Manual verification per SPEC-105 §6: open a dashboard for a corrupt-metadata fixture story; confirm (a) the health banner renders via ticket 011's useStoryHealth, AND (b) the affected panels render their own error state instead of staying in `Loading...` indefinitely.

### Invariants

1. No `.catch(() => {})` silent-swallow pattern remains in `web/src/pages/`.
2. Each affected panel has an explicit error state (panel-level) distinct from the page's global "loading metadata" indicator.
3. The Dashboard manuscript present-vs-missing pattern at line 84–86 is preserved — it's the typed-empty-vs-failed handling spec §2 item 6 pattern (b) calls for.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `cd tools/manual-story-studio && npm test` — full package test (includes web subpackage typecheck).
2. `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/` — verify zero matches.
3. Cold-start manual verification per SPEC-105 §6 (corrupt-metadata banner + panel error state).

## Outcome

Completed on 2026-06-01.

This ticket removed all seven `.catch(() => {})` silent-swallow patterns from `Dashboard.tsx` and `MomentComposer.tsx`. Each affected read now records an explicit panel-level error and exposes a retry button. The Dashboard manuscript optional-read handler was preserved unchanged because it distinguishes "not compiled yet" from the page's other health-relevant reads.

## Verification Result

Commands run:

1. `cd tools/manual-story-studio/web && npm test` — passed; `tsc --noEmit`.
2. `cd tools/manual-story-studio && npm test` — passed; backend reported 377 tests passing and web `tsc --noEmit` passed.
3. `grep -rn "\.catch(() => {})" tools/manual-story-studio/web/src/` — passed; returned no matches (exit 1 expected for zero matches).
4. `grep -n "setManuscriptMissing(true)" tools/manual-story-studio/web/src/pages/Dashboard.tsx` — passed; confirmed the preserved manuscript optional-read handler remains.
5. Browser smoke via backend `node dist/src/cli.js --port 5175 --repo-root /tmp/mss-health-xZuzYJ`, Vite `npm run dev -- --host 127.0.0.1`, and Playwright against `/worlds/fixture-world/manual-stories/fixture-story/dashboard` — passed; page text contained `Story health: blocked`, `metadata-yaml-parse-failed`, and `Failed to load metadata: readMetadata → 409 Retry`.
6. `git diff --check` — passed.

## Deviations

- The implementation uses one retry trigger per page rather than separate retry functions per panel. Each retry re-runs the page's read batch, which is simpler and keeps panel errors synchronized after a repair.
