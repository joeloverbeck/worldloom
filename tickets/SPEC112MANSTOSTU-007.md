# SPEC112MANSTOSTU-007: Mount RecordPicker in MomentComposer

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web page `MomentComposer.tsx`; replaces the ID-toggle cast checkbox list and the +Pin/−Unpin record toggles with `<RecordPicker>` (multi-select); the compose API call is unchanged.
**Deps**: archive/tickets/SPEC112MANSTOSTU-003.md

## Problem

`MomentComposer.tsx` selects records by id: a checkbox list for involved cast and +Pin/−Unpin buttons (keyed by id) for relevant records (SPEC-112 §1). SPEC-112 §2 item 6 replaces both with `<RecordPicker>` multi-select, so the author selects cast and records from searchable cards; the composer continues to pass the same id arrays to the compose API.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` builds `includedCast` (a `string[]` toggled by a checkbox list over `allCast`, line ~280-294) and `pinnedRecordIds` (a `string[]` toggled by +Pin/−Unpin over `suggested`/`pinned`, line ~310-339); it fetches all classes client-side via `listRecords` (line ~120-146) — the pattern the picker generalizes. `onGenerate` passes `included_cast` + `included_records` (the id arrays) to `previewPrompt` (line ~204-212).
2. SPEC-112 §2 item 6 and §4 (MomentComposer modify) define this ticket; the reassessment confirmed the compose call shape is unchanged (id arrays in, prompt out).
3. Cross-artifact boundary under audit: this page consumes the `RecordPicker` prop contract from `archive/tickets/SPEC112MANSTOSTU-003.md` (multi-select mode for both cast and records). The picker writes the same `includedCast` / `pinnedRecordIds` arrays the page already passes to the compose API.
4. FOUNDATIONS §Tooling Recommendation (ID-free entry, SPEC-112 §5): the composer's cast/record selection is the last normal-flow surface keyed by id-toggle; after this ticket selection is card-based.

## Architecture Check

1. Replacing two bespoke toggle UIs (checkbox list + pin buttons) with the one shared picker unifies selection UX and reuses the card presentation; the compose contract is untouched, so prompt composition is unaffected.
2. No backwards-compatibility shim: the checkbox list and pin/unpin toggles are replaced outright; no parallel id-toggle path is kept. The beat-template `<select>` is intentionally untouched (SPEC-112 §2 Out of scope — template picker deferred; it already shows titles).

## Verification Layers

1. Cast + record selection render `<RecordPicker>` (multi-select), not the checkbox/pin toggles → source-structure assertion in SPEC112MANSTOSTU-008 + manual review.
2. The compose call still passes `included_cast` + `included_records` id arrays unchanged → `grep` `previewPrompt` call shape; web `tsc --noEmit`.
3. The beat-template `<select>` is unchanged (out of scope) → `grep` confirms it remains.

## What to Change

### 1. Replace the involved-cast checkbox list

Mount a multi-select `<RecordPicker>` class-filtered to `cast`, bound to `includedCast` (same `string[]`, same `toggleCast`/setter semantics).

### 2. Replace the +Pin/−Unpin record selection

Mount a multi-select `<RecordPicker>` (any class, or the relevant record classes) bound to `pinnedRecordIds`, replacing the suggested/pinned +Pin/−Unpin lists. Keep the `onGenerate` → `previewPrompt` call passing the same `included_cast` + `included_records` arrays.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)

## Out of Scope

- The picker component (`archive/tickets/SPEC112MANSTOSTU-003.md`).
- The beat-template `<select>` / template picker (SPEC-112 §2 Out of scope — deferred; not id-typed).
- Any change to the compose API contract or `previewPrompt` call shape.

## Acceptance Criteria

### Tests That Must Pass

1. Cast and record selection use `<RecordPicker>` (multi-select), not the checkbox/pin toggles — asserted structurally by SPEC112MANSTOSTU-008.
2. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green.
3. `(cd tools/manual-story-studio && npm run build)` — web build succeeds.

### Invariants

1. `onGenerate` passes the identical `included_cast` + `included_records` id arrays to `previewPrompt` — compose contract unchanged.
2. The beat-template selection surface is untouched (out of scope).

## Test Plan

### New/Modified Tests

1. `None — the selection-surface swap is asserted structurally by SPEC112MANSTOSTU-008; type coverage is web tsc --noEmit.`

### Commands

1. `grep -n "RecordPicker\|previewPrompt\|toggleCast" tools/manual-story-studio/web/src/pages/MomentComposer.tsx`
2. `(cd tools/manual-story-studio && npm --prefix web test)`
3. The grep confirms the picker mounts and the unchanged compose call; `tsc --noEmit` covers the wiring. No DOM harness exists (SPEC-112 §8).
