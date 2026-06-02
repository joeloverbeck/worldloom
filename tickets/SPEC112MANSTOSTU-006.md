# SPEC112MANSTOSTU-006: Title-bearing display in CurrentStatePanel

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web component `CurrentStatePanel.tsx`; replaces raw-ID display with title-bearing display and adds a per-class summary fetch to resolve titles.
**Deps**: 003

## Problem

`CurrentStatePanel.tsx` displays the current selection as raw IDs: the `chipList` helper renders `current_cast` / `active_pressure_clocks` / `active_secrets_questions` as raw-ID chips, and `current_location` / `pov_holder` render as raw `<dd>` text. SPEC-112 §2 item 5 / AC#5 require the panel to show titles, not IDs, across **all** displayed references — so the displayed current selection reads as titles.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` defines a local `chipList` (line ~12) rendering raw IDs for three fields; `current_location` (line ~57) and `pov_holder` (line ~59) render as raw `<dd>` text. The component receives only `ctx` (`CurrentContext`, id arrays) + `worldSlug`/`msSlug` — it has no record summaries today, so it cannot resolve titles without fetching them.
2. SPEC-112 §2 item 5 and §8 (CurrentStatePanel gains a data dependency) define this ticket; the reassessment surfaced that `chipList` covers only three of the five displayed reference fields and that title resolution needs a summary fetch.
3. Cross-artifact boundary under audit: this component reuses the client-side multi-class fetch helper added to `web/src/api/records.ts` by SPEC112MANSTOSTU-003 to build an id→title map. Titles are present on `ManualRecordSummary` today (no dependency on the `archive/tickets/SPEC112MANSTOSTU-001.md` involved-cast field); the helper is the only cross-ticket import.
4. FOUNDATIONS §Tooling Recommendation (ID-free surface, SPEC-112 §5): the panel is the *display* counterpart to the picker's *entry* surface — after this ticket the author neither types nor reads a raw id in the normal flow.

## Architecture Check

1. Resolving titles via the existing per-class summary feed (reusing 003's helper) keeps the no-index, client-side-filter model; the panel builds an id→title map from data it already has access to, with no new aggregate endpoint (SPEC-112 §8).
2. No backwards-compatibility shim: `chipList`'s raw-ID rendering is replaced; the `<dd>` raw-text for location/pov is replaced with title resolution. No parallel raw-ID path is kept.

## Verification Layers

1. All five displayed reference surfaces show titles → manual review + the panel renders from the id→title map for `current_cast` / clocks / secrets-questions / `current_location` / `pov_holder`.
2. The panel resolves titles from the shared summary fetch helper (003) → `grep` the import of the helper from `api/records.ts`; web `tsc --noEmit`.
3. Graceful fallback when an id has no summary (archived/missing) → manual review (display the id as a last resort, never crash).

## What to Change

### 1. Fetch per-class summaries and build an id→title map

On mount (with `worldSlug`/`msSlug`), call the multi-class fetch helper (SPEC112MANSTOSTU-003) for the classes the panel displays, and build an `id → title` lookup.

### 2. Render titles for all five reference surfaces

Replace `chipList`'s raw-ID chips (current_cast, active_pressure_clocks, active_secrets_questions) with title-bearing chips, and replace the raw `<dd>` text for `current_location` and `pov_holder` with their resolved titles. Fall back to the id when no summary resolves.

## Files to Touch

- `tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx` (modify)

## Out of Scope

- The picker component and the api fetch helper (SPEC112MANSTOSTU-003).
- A new aggregate/title-resolution backend endpoint (SPEC-112 §8 — reuse the existing read path).
- Involved-cast display (the panel shows titles, not the card's involved-cast field).

## Acceptance Criteria

### Tests That Must Pass

1. `CurrentStatePanel` displays selected references as titles for all five reference surfaces (SPEC-112 AC#5) — manual review against the rendered panel.
2. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green.
3. `(cd tools/manual-story-studio && npm run build)` — web build succeeds.

### Invariants

1. The panel reads `ctx` id arrays unchanged; only the rendering resolves them to titles.
2. No new backend endpoint; title resolution reuses the existing per-class summary feed via 003's helper.

## Test Plan

### New/Modified Tests

1. `None — presentational title resolution; verification is web tsc --noEmit + manual review of the rendered panel. No DOM harness exists (SPEC-112 §8).`

### Commands

1. `grep -n "chipList\|title" tools/manual-story-studio/web/src/components/CurrentStatePanel.tsx`
2. `(cd tools/manual-story-studio && npm --prefix web test)`
3. The grep confirms the raw-ID `chipList` rendering is replaced; `tsc --noEmit` covers the fetch-helper wiring. Runtime rendering is a manual review item.
