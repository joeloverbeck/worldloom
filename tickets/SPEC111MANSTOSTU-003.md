# SPEC111MANSTOSTU-003: Hide internal IDs on the remaining per-story pages

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — manual-story-studio web pages (MomentComposer, Records, CastAndProfiles, BeatTemplates, PromptHistory) + `index.css`. No backend, no canon-pipeline impact.
**Deps**: None

## Problem

Per SPEC-111 §2 item 3: internal record IDs (`mchar-3`-style) leak as primary user-facing labels across the per-story pages. They are file-management surface, not authoring surface, and the leakage raises the chance the author copies an ID into the directive (prompt-leakage discipline). Audit each page: render `title` as the primary label, the ID as a disclosure subscript; keep IDs visible in form fields (the `RefList` typed-references editor) and where a page IS the artifact-management surface (PromptHistory). The Dashboard portion of this deliverable is owned by SPEC111MANSTOSTU-002.

## Assumption Reassessment (2026-06-02)

1. Codebase: pages under `tools/manual-story-studio/web/src/pages/` — `MomentComposer.tsx`, `Records.tsx`, `CastAndProfiles.tsx`, `BeatTemplates.tsx`, `PromptHistory.tsx` all exist; the `RefList` component is the typed-references editor where IDs stay visible (form-field rule, SPEC-111 §2 item 3); `MomentComposer.tsx` is also modified by SPEC111MANSTOSTU-004 (unsaved-change) — the two edits are distinct (ID labels here vs. form-state hook there).
2. Specs/docs: SPEC-111 §2 item 3 (non-Dashboard portion) + §3 second key decision (hide IDs from primary labels; keep them in form fields, which are the authoring artifact).
3. Cross-artifact boundary under audit: the shared `.id-subscript` CSS treatment (this ticket owns its definition; 002 reuses the same class name) and `MomentComposer.tsx` shared with 004 (mechanical — different code regions, no semantic overlap; coordinate at merge).
4. FOUNDATIONS §Tooling Recommendation (least-privilege LLM packets): ID hiding reduces the prompt-leakage surface (SPEC-111 §5).

## Architecture Check

1. A focused per-page audit pass; each page's row-label change is independent and small. IDs are kept where they are the authoring artifact (`RefList` form fields) or the management surface (PromptHistory artifact IDs), so the change is surgical rather than a blanket strip.
2. No backwards-compatibility shims; IDs move to subscript/disclosure markup, not aliased.

## Verification Layers

1. Primary labels render `title`, not ID, on each of the 5 pages → grep-proof + manual scenario 3.
2. Form-field IDs (`RefList`) preserved → grep-proof (`RefList` unchanged) / manual review.
3. PromptHistory artifact IDs not duplicated in non-disclosure labels → manual review.

## What to Change

### 1. MomentComposer.tsx

Record-selection panels render `title` primarily; ID as subscript. Leave directive/selection form state to 004.

### 2. Records.tsx

Row labels render `title`; ID as a disclosure subscript.

### 3. CastAndProfiles.tsx

Cast row labels render the character name (`title`); ID as subscript.

### 4. BeatTemplates.tsx

Template row labels render `title`; ID as a disclosure subscript.

### 5. PromptHistory.tsx

Prompt IDs may remain visible (this page IS the artifact-management surface) but must not be duplicated in non-disclosure labels.

### 6. Styles

`index.css`: the shared `.id-subscript` treatment (small grey, hover/disclosure) — this ticket owns the definition.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/MomentComposer.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/web/src/pages/PromptHistory.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)

## Out of Scope

- Dashboard ID hiding (→ SPEC111MANSTOSTU-002).
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

1. `None — web test step is tsc --noEmit only; verification is grep + manual scenarios.`

### Commands

1. `cd tools/manual-story-studio/web && npm test`
2. `grep -rnE "\{[a-z]+\.id\}" tools/manual-story-studio/web/src/pages/MomentComposer.tsx tools/manual-story-studio/web/src/pages/Records.tsx tools/manual-story-studio/web/src/pages/CastAndProfiles.tsx tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/web/src/pages/PromptHistory.tsx` — review each hit: must be inside subscript/disclosure markup, not a primary label.
