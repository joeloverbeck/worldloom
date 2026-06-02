# SPEC112MANSTOSTU-002: Extend RecordCard for picker use (class, prompt-visibility, involved-cast)

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web component `RecordCard.tsx`; additive props only, no impact on existing `RecordCard` consumers (`CastAndProfiles.tsx`, `Records.tsx`).
**Deps**: archive/tickets/SPEC112MANSTOSTU-001.md

## Problem

SPEC-112's picker renders results as record cards showing title, class, one-line summary, active/inactive, tags, involved cast, and current prompt-visibility (§2 item 1). At intake, `RecordCard.tsx` already existed and was consumed by `CastAndProfiles.tsx` + `Records.tsx`, but it rendered only title, importance, id-subscript, summary, and tags. The reassessment (2026-06-02, Q3) decided to **extend** this card rather than create a near-name `RecordCardMini` duplicate. This ticket added the missing card fields and made the card embeddable inside the picker popup.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/components/RecordCard.tsx` exists and renders title / importance badge / id-subscript / summary / tags from a `ManualRecordSummary` prop (`RecordCardProps = { summary, onOpen }`); it uses inline styles and `className="manual-record-card"`. It is consumed by `web/src/pages/CastAndProfiles.tsx` and `web/src/pages/Records.tsx`.
2. SPEC-112 §4 changes the original `RecordCardMini` Create into "extend `RecordCard.tsx`" (reassessment Q3); §2 item 1 lists the card field set. Involved-cast on the card depends on the summary field landed by `archive/tickets/SPEC112MANSTOSTU-001.md`.
3. Cross-artifact boundary under audit: `RecordCardProps` is consumed by two existing pages (`CastAndProfiles.tsx`, `Records.tsx`) and will be consumed by the new picker (SPEC112MANSTOSTU-003). New props MUST be optional so the two existing call sites compile unchanged; the picker passes the new props.

## Architecture Check

1. Extending the existing card (vs. a parallel `RecordCardMini`) keeps a single card presentation across the Records page, the cast page, the picker, and (later) SPEC-113/-114 — the reassessment's §3.1 near-name-duplicate concern. One component, many mounts.
2. No backwards-compatibility shim: new display props are optional additions to `RecordCardProps`; the two existing consumers are untouched. No second card type, no alias.

## Verification Layers

1. New fields render when provided → web `tsc --noEmit` + the source-structure assertion in SPEC112MANSTOSTU-008 (card embeds in picker).
2. Existing consumers compile unchanged (additive props) → web `tsc --noEmit` over `CastAndProfiles.tsx` + `Records.tsx`.
3. Single-layer note: this is a presentational component with no canon/schema surface; type-check + the 008 structural assertion are the proof surfaces.

## Landed Changes

### 1. Added the missing card fields

In `RecordCard.tsx`, the card now renders an optional class label, current prompt-visibility, and involved-cast ids from the `involved_cast` field added by `archive/tickets/SPEC112MANSTOSTU-001.md`. It keeps the ID in the existing id-subscript disclosure line, not as the primary label.

### 2. Made the card picker-embeddable

Added optional `recordClass`, `selected`, `compact`, `onSelect`, and `interactionRole` props. Existing callers still pass only `summary` and `onOpen`; when `onSelect` is absent, click/keyboard activation still calls `onOpen(summary.id)`. Picker consumers can use compact selected cards with `role="option"` without changing the existing Records/Cast pages.

## Files to Touch

- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (modify)

## Out of Scope

- The picker component itself (SPEC112MANSTOSTU-003).
- `index.css` popup styling (SPEC112MANSTOSTU-003; this card keeps inline styles like the existing component).
- Referenced-by count and working-set-status fields (deferred per SPEC-112 §2 Out of scope / §3).
- Changing the two existing `RecordCard` call sites' behavior.

## Acceptance Criteria

### Tests That Must Pass

1. `(cd tools/manual-story-studio && npm --prefix web test)` — web `tsc --noEmit` green; `CastAndProfiles.tsx` and `Records.tsx` compile unchanged.
2. `(cd tools/manual-story-studio && npm run build)` — web build succeeds.

### Invariants

1. All new `RecordCardProps` fields are optional; the two existing consumers are behaviorally unchanged.
2. The ID appears only in the disclosure subscript, never as the card's primary label (SPEC-112 §2 item 1).

## Test Plan

### New/Modified Tests

1. `None — type-checked component; behavioral coverage of the card-in-picker is asserted structurally by SPEC112MANSTOSTU-008. Existing pipeline coverage: web tsc --noEmit named in Assumption Reassessment.`

### Commands

1. `(cd tools/manual-story-studio && npm --prefix web test)`
2. `(cd tools/manual-story-studio && npm run build)`
3. Web `tsc --noEmit` is the correct boundary for an additive presentational prop change; runtime rendering is exercised by the picker mount tickets.

## Outcome

Completed: 2026-06-02

`RecordCard.tsx` now has the missing picker-ready display metadata and optional selection/embedding props. The existing `CastAndProfiles.tsx` and `Records.tsx` call sites were left unchanged and continue to compile against the default open-card behavior. No new card component, alias, storage change, or route change was introduced.

## Verification Result

1. Pre-edit baseline: `npm --prefix web test` from `tools/manual-story-studio` — passed before source edits.
2. `npm --prefix web test` from `tools/manual-story-studio` — passed after implementation; web `tsc -p tsconfig.json --noEmit` accepted the optional prop extension and unchanged existing call sites.
3. `npm run build` from `tools/manual-story-studio` — passed; web install check, web production build, and backend build succeeded.
4. `npm test` from `tools/manual-story-studio` — passed; backend build plus 454 compiled backend tests plus web type check.
5. Ignored artifact check: verification refreshed existing ignored package artifacts under `tools/manual-story-studio/dist/`, `tools/manual-story-studio/web/dist/`, `tools/manual-story-studio/node_modules/`, and `tools/manual-story-studio/web/node_modules/`; these are expected verification artifacts, not tracked ticket output.

## Deviations

None. The implementation used the drafted optional-prop approach and left existing `RecordCard` consumers behaviorally unchanged.
