# SPEC111MANSTOSTU-002: Dashboard cockpit reshape — CurrentStatePanel-first, ID hiding, nav removal

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web `Dashboard` page + `index.css`. No backend, no canon-pipeline impact.
**Deps**: archive/tickets/SPEC111MANSTOSTU-001.md

## Problem

At intake, per SPEC-111 §1 / §2 item 6, the Dashboard was a summary list rather than a cockpit; it surfaced internal IDs as primary labels; and it carried the MSSUX-006 Dashboard-local nav now superseded by the App-level `StoryPageNav` from archive/tickets/SPEC111MANSTOSTU-001.md. This ticket reshaped the Dashboard so `CurrentStatePanel` (SPEC-109) is the primary surface, added Recent Segments / Active Prompt Artifacts / Story Contract Status panels, moved the importance-bucketed records into a disclosure, hid cast/record IDs from primary labels, and removed the local nav.

## Assumption Reassessment (2026-06-02)

1. Codebase at intake: `tools/manual-story-studio/web/src/pages/Dashboard.tsx` carried the MSSUX-006 `<nav aria-label="story-pages">` block; `CurrentStatePanel` was already imported and rendered below the local nav; cast rendered `{c.id}` as an adjacent visible label; the high-importance link text was `{cls}/{record.id}`; latest-segment showed `{latestSegment.id}`; `directiveDraft` was local-only state with no save handler; the page had eight summary sections.
2. Specs/docs: SPEC-111 §2 item 6 + §2 item 3 (Dashboard portion; the other-pages portion → 003) + reassessment I1 (nav removal) + M4 (directive draft NOT wrapped in `useUnsavedChanges`).
3. Cross-artifact boundary under audit: Dashboard ↔ `StoryPageNav` (archive/tickets/SPEC111MANSTOSTU-001.md). Removing the Dashboard-local nav requires the App-level `StoryPageNav` to exist first (Deps: archive/tickets/SPEC111MANSTOSTU-001.md), otherwise the Dashboard has no nav transiently. `CurrentStatePanel` (SPEC-109) is consumed as-is.
4. FOUNDATIONS §Tooling Recommendation (least-privilege LLM packets): hiding internal IDs from the cockpit's primary surface reduces the chance the author copies an ID into the directive — defense-in-depth against the prompt-leakage surface (SPEC-111 §5).
5. (was template item 7 — removal blast radius): the Dashboard-local `<nav aria-label="story-pages">` was removed. Grep-confirmed Dashboard was the sole page carrying a local sibling nav, so removal has no other consumer; `StoryPageNav` from archive/tickets/SPEC111MANSTOSTU-001.md supersedes it.

## Architecture Check

1. The reshape rewrites the cast/record panels, so folding Dashboard's ID-hiding into the same ticket avoids a second ticket re-editing the very same panels (which would conflict). One owner for all Dashboard edits.
2. No backwards-compatibility shims: the importance-records panel moves to a disclosure (not deleted, not aliased); the local nav is removed outright.

## Verification Layers

1. `CurrentStatePanel` renders first → manual review + `tsc --noEmit`.
2. No primary-label IDs in Dashboard → grep-proof (`{c.id}` / `{cls}/{record.id}` / `{latestSegment.id}` appear only inside subscript/disclosure markup) + manual scenario 3.
3. Local nav removed → grep-proof (`aria-label="story-pages"` absent from `Dashboard.tsx`).
4. Directive draft not guarded → grep-proof (no `useUnsavedChanges` import in `Dashboard.tsx`).

## Landed Changes

### 1. Removed the Dashboard-local nav

Deleted the `<nav aria-label="story-pages">` block; the App-level `StoryPageNav` from archive/tickets/SPEC111MANSTOSTU-001.md supersedes it.

### 2. Promoted CurrentStatePanel

Moved `<CurrentStatePanel />` to the top of the page.

### 3. Added cockpit panels

Added Recent Segments (last 3 by title + word count + timestamp), Active Prompt Artifacts (last 3 prompts with Prompt Preview / Prompt History links), and Story Contract Status (Edit Contract link plus premise/tone/content-policy chips).

### 4. Moved importance records into disclosure

Moved the importance-bucketed records panel into a disclosure-style section ("Browse records by importance"). The panel is preserved, not deleted.

### 5. Hid cast/record IDs from primary labels

Rendered `title` as the primary label across the cast panel, high-importance panel, and recent-segment list; IDs are small grey `.id-subscript` text or URL/key values, not primary labels.

### 6. Styles

`index.css`: added `.id-subscript`, Dashboard cockpit grid, compact list metadata, status chip, and importance disclosure styles.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- Directive-draft persistence/save (no save exists) and `useUnsavedChanges` on the directive (excluded per M4).
- Other pages' ID hiding (→ SPEC111MANSTOSTU-003).
- `StoryPageNav` itself (→ archive/tickets/SPEC111MANSTOSTU-001.md).
- Backend; new record fields.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` is green.
2. Grep: `aria-label="story-pages"` absent in `Dashboard.tsx`; `{c.id}` / `{cls}/{record.id}` / `{latestSegment.id}` no longer primary labels; `CurrentStatePanel` rendered before the other panels.
3. Manual scenario 3 (ID hiding) + SPEC-111 AC#7 (panel order: Current State, Recent Segments, Active Prompt Artifacts, Contract Status; importance records in a disclosure).

### Invariants

1. `CurrentStatePanel` is the first panel; importance-records live in a disclosure (preserved, not deleted).
2. No record/cast ID renders as a primary label in the Dashboard.

## Test Plan

### New/Modified Tests

1. `None — web test step is tsc --noEmit only; verification is grep-proof + a local Vite/Playwright smoke.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -nE "aria-label=\"story-pages\"|\{cls\}/\{record\.id\}" tools/manual-story-studio/web/src/pages/Dashboard.tsx` — expect the nav absent and IDs only inside subscript/disclosure markup.

## Outcome

Completed: 2026-06-02

The Dashboard now starts with `CurrentStatePanel`, followed by a cockpit grid containing Recent Segments, Active Prompt Artifacts, and Story Contract Status. The previous Dashboard-local sibling nav is gone. The importance-bucketed records section is now collapsed under `Browse records by importance`. Dashboard primary labels now use titles/snippets; cast, segment, and high-importance record IDs appear only through `.id-subscript`, URL targets, or React keys. The directive draft remains intentionally unguarded because it has no save handler.

No backend, canon, HARD-GATE, or `_source/` surfaces changed.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — passed (`tsc -p tsconfig.json --noEmit`).
2. `rg -n 'aria-label="story-pages"|\{c\.id\}|\{cls\}/\{record\.id\}|latestSegment|useUnsavedChanges' tools/manual-story-studio/web/src/pages/Dashboard.tsx` — no local nav, no `{cls}/{record.id}`, no `latestSegment`, and no `useUnsavedChanges`; remaining `c.id` hit is inside `<IdSubscript id={c.id} />`.
3. `nl -ba tools/manual-story-studio/web/src/pages/Dashboard.tsx | sed -n '220,340p'` — confirmed `<CurrentStatePanel />` renders before Recent Segments, Active Prompt Artifacts, and Story Contract Status.
4. `git diff --check -- tools/manual-story-studio/web/src/pages/Dashboard.tsx tools/manual-story-studio/web/src/index.css` — passed.
5. Vite/Playwright smoke at `/worlds/demo/manual-stories/story-one/dashboard` — confirmed app-level `Story pages` nav remains, Dashboard-local `story-pages` nav is absent, Current State appears first, followed by Recent Segments, Active Prompt Artifacts, Story Contract Status, and collapsed `Browse records by importance`.

## Deviations

1. Manual browser verification was performed as a local Vite/Playwright smoke rather than a committed browser test harness. Running Vite without the backend produced expected API 500/404 console noise; the rendered Dashboard structure still proved the owned layout invariant.
