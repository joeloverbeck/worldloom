# SPEC111MANSTOSTU-003: Hide internal IDs on the remaining per-story pages

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web `MomentComposer`, `BeatTemplates`, and shared `RecordCard`. `Records`, `CastAndProfiles`, and `PromptHistory` were audited unchanged. No backend, no canon-pipeline impact.
**Deps**: None

## Problem

At intake, per SPEC-111 §2 item 3, internal record IDs (`mchar-3`-style) leaked or risked leaking as primary user-facing labels across the per-story pages. They are file-management surface, not authoring surface, and the leakage raises the chance the author copies an ID into the directive (prompt-leakage discipline). This ticket audited each remaining page: render `title` as the primary label, the ID as a disclosure subscript; keep IDs visible in form fields (the `RefList` typed-references editor) and where a page IS the artifact-management surface (PromptHistory). The Dashboard portion of this deliverable is owned by archive/tickets/SPEC111MANSTOSTU-002.md.

## Assumption Reassessment (2026-06-02)

1. Codebase: pages under `tools/manual-story-studio/web/src/pages/` — `MomentComposer.tsx`, `Records.tsx`, `CastAndProfiles.tsx`, `BeatTemplates.tsx`, `PromptHistory.tsx` all exist; the `RefList` component is the typed-references editor where IDs stay visible (form-field rule, SPEC-111 §2 item 3); `MomentComposer.tsx` is also modified by SPEC111MANSTOSTU-004 (unsaved-change) — the two edits are distinct (ID labels here vs. form-state hook there).
2. Specs/docs: SPEC-111 §2 item 3 (non-Dashboard portion) + §3 second key decision (hide IDs from primary labels; keep them in form fields, which are the authoring artifact).
3. Cross-artifact boundary under audit: the shared `.id-subscript` CSS treatment already landed with archive/tickets/SPEC111MANSTOSTU-002.md, so this ticket consumes/extends that class rather than owning its initial definition. `MomentComposer.tsx` is shared with 004 (mechanical — ID labels here vs. form-state hook there, no semantic overlap; coordinate at merge). `RecordCard` is a shared row-label component used by both `Records.tsx` and `CastAndProfiles.tsx`, so it is same-seam fallout for this ticket.
4. FOUNDATIONS §Tooling Recommendation (least-privilege LLM packets): ID hiding reduces the prompt-leakage surface (SPEC-111 §5).

## Architecture Check

1. A focused per-page audit pass; each page's row-label change is independent and small. IDs are kept where they are the authoring artifact (`RefList` form fields) or the management surface (PromptHistory artifact IDs), so the change is surgical rather than a blanket strip.
2. No backwards-compatibility shims; IDs move to subscript/disclosure markup, not aliased.

## Verification Layers

1. Primary labels render `title`, not ID, on each of the 5 pages → grep-proof + manual scenario 3.
2. Form-field IDs (`RefList`) preserved → grep-proof (`RefList` unchanged) / manual review.
3. PromptHistory artifact IDs not duplicated in non-disclosure labels → manual review.

## Landed Changes

### 1. MomentComposer.tsx

Record-selection panels render `title` primarily; IDs are `.id-subscript`. Directive/selection form state remains for 004.

### 2. Records.tsx

Audited unchanged directly. `Records.tsx` uses shared `RecordCard`, and `RecordCard` now renders `summary.title` as the primary label with the ID as `.id-subscript`.

### 3. CastAndProfiles.tsx

Audited unchanged directly. `CastAndProfiles.tsx` uses shared `RecordCard`, and `RecordCard` now renders `summary.title` as the primary label with the ID as `.id-subscript`.

### 4. BeatTemplates.tsx

Template row labels render `title` or "Untitled template" as the primary label; IDs are `.id-subscript`.

### 5. PromptHistory.tsx

Audited unchanged. Prompt IDs remain visible because this page is the artifact-management surface; no extra non-disclosure duplicate labels were added.

### 6. Styles

No style edit was needed. This ticket reuses the shared `.id-subscript` treatment introduced by archive/tickets/SPEC111MANSTOSTU-002.md.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (audited unchanged; uses modified `RecordCard`)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (audited unchanged; uses modified `RecordCard`)
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (audited unchanged)
- `tools/manual-story-studio/web/src/components/RecordCard.tsx` (modify)

## Out of Scope

- Dashboard ID hiding (→ archive/tickets/SPEC111MANSTOSTU-002.md).
- `RefList` form-field IDs (kept visible by design — editor surface).
- Unsaved-change handling (→ SPEC111MANSTOSTU-004).
- Backend; record schema.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` is green.
2. Grep across the 5 pages: no `{<var>.id}` renders as a primary label (IDs only inside subscript/disclosure markup or `RefList` form fields).
3. Manual scenario 3 (MomentComposer record/cast picker shows names, not IDs).

### Invariants

1. No record/cast/template ID renders as a primary label on the 5 pages.
2. `RefList` form-field IDs remain visible (editor surface preserved).

## Test Plan

### New/Modified Tests

1. `None — web test step is tsc --noEmit only; verification is grep/manual review.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -rnE "\{[a-z]+\.id\}" tools/manual-story-studio/web/src/pages/MomentComposer.tsx tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/web/src/pages/PromptHistory.tsx` — review each hit: must be inside subscript/disclosure markup, not a primary label.

## Outcome

Completed: 2026-06-02

Moment Composer now renders cast and record picker labels title-first with IDs in `.id-subscript`. Beat Templates no longer falls back to a template ID as the visible primary title; it uses "Untitled template" plus `.id-subscript`. Shared `RecordCard` now renders `summary.title` as the card title and moves `summary.id` into `.id-subscript`, which covers Records and Cast row cards. PromptHistory was audited unchanged because prompt IDs are intentional artifact-management labels there.

No backend, canon, HARD-GATE, or `_source/` surfaces changed.

## Verification Result

1. `cd tools/manual-story-studio/web && npm test` — passed (`tsc -p tsconfig.json --noEmit`).
2. `rg -n '\{[A-Za-z0-9_]+\.id\}|\.id\}' tools/manual-story-studio/web/src/pages/MomentComposer.tsx tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/web/src/pages/PromptHistory.tsx tools/manual-story-studio/web/src/components/RecordCard.tsx` — reviewed every hit: remaining IDs are React keys, `.id-subscript` values, URL/state/action identifiers, or intentional PromptHistory artifact-management labels.
3. `git diff --check -- archive/tickets/SPEC111MANSTOSTU-003.md tools/manual-story-studio/web/src/components/RecordCard.tsx tools/manual-story-studio/web/src/pages/MomentComposer.tsx tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` — passed.

## Deviations

1. `index.css` did not change because `.id-subscript` already landed in archive/tickets/SPEC111MANSTOSTU-002.md. This ticket reused that class rather than duplicating style ownership.
2. `Records.tsx` and `CastAndProfiles.tsx` did not need direct edits because their row labels route through shared `RecordCard`.
