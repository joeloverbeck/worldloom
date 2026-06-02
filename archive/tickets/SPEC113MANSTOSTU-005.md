# SPEC113MANSTOSTU-005: UI relabel "Current State" → "Prompt Working Set"

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web (3 user-facing label sites). No behavior change; display strings only. No canon-pipeline impact.
**Deps**: None

## Problem

SPEC-113 §2 item 4 reframes the working-set surface as a *selection lens, not state*: replace the user-facing "Current State" / "Current Context" labels with "Prompt Working Set". The on-disk `current-context.yaml` filename and the `current-context/edit` route path are deliberately unchanged (the file rename is declined per §3) — only display text changes.

## Assumption Reassessment (2026-06-02)

1. The user-facing label appears at exactly 3 sites (grep-confirmed across `tools/manual-story-studio/web/src`): `CurrentStatePanel.tsx:86` and `:99` (`<h2>Current State</h2>` ×2), `StoryPageNav.tsx:7` (`{ label: "Current State", path: "current-context/edit" }`), and `EditCurrentContext.tsx` heading ("Edit Current Context"). `Dashboard.tsx:230` renders `CurrentStatePanel`, so the dashboard panel is relabelled transitively (no separate Dashboard label). The route path `current-context/edit` and the on-disk `current-context.yaml` are NOT renamed.
2. SPEC-113 §2 item 4 + §4 + §3 "Decline the file rename; relabel the UI" + AC#7 fix the contract.
3. Cross-artifact boundary under audit: the "Prompt Working Set" label string is shared across 3 UI components; label consistency is the contract — all 3 must read the same new label, and the `current-context/edit` route path must stay byte-identical so navigation is unaffected.

## Architecture Check

1. Pure display-string change at 3 enumerated sites — no symbol rename, no route change, no schema touch, so the blast radius is exactly these 3 files (the §(e) spot-check confirmed no other label sites). `EditCurrentContext.tsx` is also edited by 001 (the `excluded_records` picker); the two edits land on different lines (heading text vs form body) and do not conflict — no `Deps` relationship is required.
2. No backwards-compat shim: a label string is replaced in place.

## Verification Layers

1. No "Current State" user-facing label remains -> codebase grep-proof (`grep -rn "Current State" tools/manual-story-studio/web/src` returns only the unchanged route-path token, if any, not a display label).
2. Route path + filename unchanged -> grep-proof (`current-context/edit` still present in `StoryPageNav.tsx`; AC#7).
3. Type-clean after edits -> `cd tools/manual-story-studio/web && npm test` (tsc --noEmit).

## What to Change

### 1. `CurrentStatePanel.tsx`

Both `<h2>Current State</h2>` occurrences (lines 86, 99) → `<h2>Prompt Working Set</h2>`.

### 2. `StoryPageNav.tsx`

The nav entry `label: "Current State"` (line 7) → `label: "Prompt Working Set"`; the `path: "current-context/edit"` value is unchanged.

### 3. `EditCurrentContext.tsx`

The page heading "Edit Current Context" → "Edit Prompt Working Set".

## Files to Touch

- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (modify)
- `tools/manual-story-studio/web/src/components/StoryPageNav.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` (modify — shared with 001's picker edit, different lines)

## Out of Scope

- Renaming `current-context.yaml` on disk or the `current-context/edit` route path (declined per §3).
- The `excluded_records` picker (001).
- The ledger (002/003) and inspector (004).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` — tsc --noEmit clean after the label edits.
2. `grep -rn "Current State" tools/manual-story-studio/web/src` — no user-facing display-label matches remain (AC#7).

### Invariants

1. No "Current State" user-facing label remains; the `current-context/edit` route path and the on-disk `current-context.yaml` filename are unchanged (AC#7).

## Test Plan

### New/Modified Tests

1. `None — label-only change; verification is command/grep-based (web tsc --noEmit + grep-proof). Existing `routes-current-context.test.ts` coverage of the unchanged route path is named in Assumption Reassessment.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -rn "Current State\|Current Context" tools/manual-story-studio/web/src`

## Outcome

Completed: 2026-06-02

What changed:
- Relabelled the Manual Story Studio current-context surface to "Prompt Working Set" in the dashboard panel, story navigation, edit page heading, and save button.
- Preserved the `current-context/edit` route path and did not rename `current-context.yaml`.
- Updated the empty-panel link/prose and aria label to use prompt-working-set wording.

Deviations from original plan:
- Also changed the visible save-button label from "Save Current Context" to "Save Prompt Working Set"; live grep showed it would otherwise fail the ticket's `Current Context` acceptance sweep.

Verification results:
- PASS: `rg "Current State|Current Context" tools/manual-story-studio/web/src -n` — no matches.
- PASS: `rg "current-context/edit" tools/manual-story-studio/web/src/components/StoryPageNav.tsx tools/manual-story-studio/web/src/App.tsx -n` — route path remains present in nav and router.
- PASS: `cd tools/manual-story-studio/web && npm test` — web `tsc --noEmit` passed.
- PASS: `git diff --check -- tickets/SPEC113MANSTOSTU-005.md tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx tools/manual-story-studio/web/src/components/StoryPageNav.tsx tools/manual-story-studio/web/src/pages/EditCurrentContext.tsx` — no whitespace errors.
