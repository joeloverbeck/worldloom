# SPEC112MANSTOSTU-002: Extend RecordCard for picker use (class, prompt-visibility, involved-cast)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` web component `RecordCard.tsx`; additive props only, no impact on existing `RecordCard` consumers (`CastAndProfiles.tsx`, `Records.tsx`).
**Deps**: 001

## Problem

SPEC-112's picker renders results as record cards showing title, class, one-line summary, active/inactive, tags, involved cast, and current prompt-visibility (§2 item 1). A card component already exists — `RecordCard.tsx` (consumed by `CastAndProfiles.tsx` + `Records.tsx`) — rendering title, importance, id-subscript, summary, and tags. The reassessment (2026-06-02, Q3) decided to **extend** this card rather than create a near-name `RecordCardMini` duplicate. This ticket adds the missing card fields and makes the card embeddable inside the picker popup.

## Assumption Reassessment (2026-06-02)

1. `tools/manual-story-studio/web/src/components/RecordCard.tsx` exists and renders title / importance badge / id-subscript / summary / tags from a `ManualRecordSummary` prop (`RecordCardProps = { summary, onOpen }`); it uses inline styles and `className="manual-record-card"`. It is consumed by `web/src/pages/CastAndProfiles.tsx` and `web/src/pages/Records.tsx`.
2. SPEC-112 §4 changes the original `RecordCardMini` Create into "extend `RecordCard.tsx`" (reassessment Q3); §2 item 1 lists the card field set. Involved-cast on the card depends on SPEC112MANSTOSTU-001's summary field.
3. Cross-artifact boundary under audit: `RecordCardProps` is consumed by two existing pages (`CastAndProfiles.tsx`, `Records.tsx`) and will be consumed by the new picker (SPEC112MANSTOSTU-003). New props MUST be optional so the two existing call sites compile unchanged; the picker passes the new props.

## Architecture Check

1. Extending the existing card (vs. a parallel `RecordCardMini`) keeps a single card presentation across the Records page, the cast page, the picker, and (later) SPEC-113/-114 — the reassessment's §3.1 near-name-duplicate concern. One component, many mounts.
2. No backwards-compatibility shim: new display props are optional additions to `RecordCardProps`; the two existing consumers are untouched. No second card type, no alias.

## Verification Layers

1. New fields render when provided → web `tsc --noEmit` + the source-structure assertion in SPEC112MANSTOSTU-008 (card embeds in picker).
2. Existing consumers compile unchanged (additive props) → web `tsc --noEmit` over `CastAndProfiles.tsx` + `Records.tsx`.
3. Single-layer note: this is a presentational component with no canon/schema surface; type-check + the 008 structural assertion are the proof surfaces.

## What to Change

### 1. Add the missing card fields

In `RecordCard.tsx`, render class label, current prompt-visibility, and involved-cast (from the `involved_cast` field added by SPEC112MANSTOSTU-001) alongside the existing title / summary / tags / active styling. Keep the ID in the existing id-subscript disclosure only.

### 2. Make the card picker-embeddable

Add optional props so the picker can mount the card as a selectable option: e.g., an optional `recordClass` (for the class label), an optional `onSelect`/`selected` pair, and a `compact`/`embedded` flag if the picker popup needs tighter chrome. All new props optional; `onOpen` and the existing render path stay the default.

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
