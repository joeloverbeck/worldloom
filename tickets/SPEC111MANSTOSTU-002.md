# SPEC111MANSTOSTU-002: Dashboard cockpit reshape — CurrentStatePanel-first, ID hiding, nav removal

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web `Dashboard` page + `index.css`. No backend, no canon-pipeline impact.
**Deps**: archive/tickets/SPEC111MANSTOSTU-001.md

## Problem

Per SPEC-111 §1 / §2 item 6: the Dashboard is a summary list, not a cockpit; it surfaces internal IDs as primary labels; and it carries the MSSUX-006 Dashboard-local nav now superseded by the App-level `StoryPageNav` (001). Reshape the Dashboard so `CurrentStatePanel` (SPEC-109) is the primary surface, add Recent Segments / Active Prompt Artifacts / Contract Status panels, move the importance-bucketed records into a disclosure, hide cast/record IDs from primary labels, and remove the local nav.

## Assumption Reassessment (2026-06-02)

1. Codebase: `tools/manual-story-studio/web/src/pages/Dashboard.tsx` — the MSSUX-006 `<nav aria-label="story-pages">` block is at lines 184–210 (6 links); `CurrentStatePanel` is already imported (line 11) and rendered (line 212); cast renders `{c.id}` (line 299); the high-importance link text is `{cls}/{record.id}` (lines 322–328); latest-segment shows `{latestSegment.id}` (line 391); `directiveDraft` is local-only state (line 38) with no save handler; the page currently has 8 sections.
2. Specs/docs: SPEC-111 §2 item 6 + §2 item 3 (Dashboard portion; the other-pages portion → 003) + reassessment I1 (nav removal) + M4 (directive draft NOT wrapped in `useUnsavedChanges`).
3. Cross-artifact boundary under audit: Dashboard ↔ `StoryPageNav` (archive/tickets/SPEC111MANSTOSTU-001.md). Removing the Dashboard-local nav requires the App-level `StoryPageNav` to exist first (Deps: archive/tickets/SPEC111MANSTOSTU-001.md), otherwise the Dashboard has no nav transiently. `CurrentStatePanel` (SPEC-109) is consumed as-is.
4. FOUNDATIONS §Tooling Recommendation (least-privilege LLM packets): hiding internal IDs from the cockpit's primary surface reduces the chance the author copies an ID into the directive — defense-in-depth against the prompt-leakage surface (SPEC-111 §5).
5. (was template item 7 — removal blast radius): the Dashboard-local `<nav aria-label="story-pages">` (lines 184–210) is removed. Grep-confirmed Dashboard is the sole page carrying a local sibling nav, so removal has no other consumer; `StoryPageNav` (001) supersedes it.

## Architecture Check

1. The reshape rewrites the cast/record panels, so folding Dashboard's ID-hiding into the same ticket avoids a second ticket re-editing the very same panels (which would conflict). One owner for all Dashboard edits.
2. No backwards-compatibility shims: the importance-records panel moves to a disclosure (not deleted, not aliased); the local nav is removed outright.

## Verification Layers

1. `CurrentStatePanel` renders first → manual review + `tsc --noEmit`.
2. No primary-label IDs in Dashboard → grep-proof (`{c.id}` / `{cls}/{record.id}` / `{latestSegment.id}` appear only inside subscript/disclosure markup) + manual scenario 3.
3. Local nav removed → grep-proof (`aria-label="story-pages"` absent from `Dashboard.tsx`).
4. Directive draft not guarded → grep-proof (no `useUnsavedChanges` import in `Dashboard.tsx`).

## What to Change

### 1. Remove the Dashboard-local nav

Delete the `<nav aria-label="story-pages">` block (`Dashboard.tsx:184–210`); the App-level `StoryPageNav` (archive/tickets/SPEC111MANSTOSTU-001.md) supersedes it.

### 2. Promote CurrentStatePanel

Move `<CurrentStatePanel />` to the top of the page.

### 3. Add cockpit panels

Add: Recent Segments (last 3 by id + title + word count + timestamp); Active Prompt Artifacts (last 3 prompts linking to Prompt Preview / Prompt History); Contract Status (Edit Contract link + premise/tone/content-policy summary chip).

### 4. Importance records → disclosure

Move the importance-bucketed records panel into a disclosure-style section ("Browse records by importance"). Do not delete it.

### 5. Hide cast/record IDs

Render `title` as the primary label across the cast panel, high-importance panel, and latest-segment; the ID becomes a small grey subscript (hover / "Show details" disclosure).

### 6. Styles

`index.css`: ID-disclosure subscript treatment (coordinate the class name with 003, which owns the shared `.id-subscript` definition) + Dashboard panel layout.

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

1. `None — web test step is tsc --noEmit only; verification is grep-proof + manual scenarios.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -nE "aria-label=\"story-pages\"|\{cls\}/\{record\.id\}" tools/manual-story-studio/web/src/pages/Dashboard.tsx` — expect the nav absent and IDs only inside subscript/disclosure markup.
