# SPEC104BEATEMDET-011: Beat Templates CRUD UI — page, form, App.tsx route

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new frontend pages `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` and `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`; modifies `tools/manual-story-studio/web/src/App.tsx` (adds `/worlds/:worldSlug/manual-stories/:msSlug/beat-templates` route)
**Deps**: 010, 006

## Problem

SPEC-104 §2.4 mandates a Beat Template CRUD UI: list view (active/archived toggle, filter by move_family), per-template card (title, move_family badge, tags, beat count, last-used segment), detail view (full schema renderer), create/edit form (per-section editors for classification, role_slots, requires, excludes, beat_guidance, forbidden_inventions, author_notes), and delete following the SPEC-101 hybrid policy. The UI consumes the typed client from ticket 010 (which calls the backend CRUD routes from ticket 006). Without this ticket, authors have no way to create or edit beat templates in the cockpit.

## Assumption Reassessment (2026-05-31)

1. Codebase: `tools/manual-story-studio/web/src/App.tsx` (existing per SPEC-100/101/102/103) registers routes at the full prefix `/worlds/:worldSlug/manual-stories/:msSlug/...` (verified at App.tsx:34-61 per SPEC-103); existing record-CRUD UI lives at `tools/manual-story-studio/web/src/pages/Records.tsx` + `tools/manual-story-studio/web/src/components/RecordForm.tsx` per SPEC-101 §4 — these serve as the structural model for beat-template CRUD. The typed client from ticket 010 (`tools/manual-story-studio/web/src/api/beat-templates.ts`) exposes `listBeatTemplates / getBeatTemplate / createBeatTemplate / updateBeatTemplate / deleteBeatTemplate` functions; the web types mirror from ticket 010 exposes `BeatTemplate` + nested types.
2. Spec: SPEC-104 §2.4 enumerates the UI affordances (list view filters, per-template card content, detail view, create/edit form sections, delete per SPEC-101 hybrid policy). §3 key decisions documents the SPEC-101 hybrid policy applies to beat-templates. The form's per-section editors map to the schema's nested blocks (classification, role_slots, requires, excludes, beat_guidance, forbidden_inventions, author_notes — each a separate form section).
3. Cross-skill boundary: this ticket creates two new frontend modules (page + form) that consume the typed client from ticket 010 (which calls ticket 006's CRUD routes). The App.tsx route registration follows the established SPEC-100/101/102/103 full-prefix pattern. The form is the only non-trivial UI piece — the nested-block schema (classification, role_slots, requires, excludes, beat_guidance, forbidden_inventions, author_notes) requires per-section editors with closed-enum selects (move_family/tone_fit/relationship_axes) and array editors (tags/role_slots/beat_guidance).

## Architecture Check

1. The CRUD UI follows the established SPEC-101 pattern (Records.tsx + RecordForm.tsx) — a three-pane or list+detail layout, per-section form editors, typed API client. The dedicated `BeatTemplates.tsx` page (rather than threading through `Records.tsx`) follows from the dedicated `routes/beat-templates.ts` backend pattern (ticket 006) — both surfaces are dedicated because the schema is richer than the other 18 SPEC-101 MVP classes. Alternative considered and rejected: extend `Records.tsx` to handle beat-templates inline — rejected because the form schema is substantially different (nested blocks, closed enums) and would force per-class branching throughout the records UI.
2. No backwards-compatibility aliasing or shims introduced. Greenfield pages following the established pattern.

## Verification Layers

1. The page renders with no data and shows an empty-state message → frontend component test (the existing SPEC-101 component-test pattern at `web/src/pages/Records.tsx`-style tests).
2. The page renders a list of beat-templates with per-template cards showing title, move_family badge, tags, beat count → component test against fixture data.
3. The create form validates closed enums (move_family, tone_fit, relationship_axes, beat_guidance.function) and the 1-5 beat_guidance count constraint → component test.
4. The edit form pre-populates with an existing beat-template's data → component test.
5. The delete action follows the hybrid policy (archive when referenced; hard-delete with confirmation when unreferenced) → component test.
6. The active/archived toggle filters the list correctly → component test.
7. The move_family filter filters the list correctly → component test.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx`

- List view: active/archived toggle (default active); filter by `move_family` (dropdown of the 17 closed-enum values + "all").
- Per-template card: title + move_family badge + tags chips + beat count (`beat_guidance.length`) + last-used-segment hint (when available via candidate-card data from ticket 012's surface; for the CRUD page, this is a lightweight read).
- "New Template" button → opens BeatTemplateForm in create mode.
- Card click → opens detail view (read-only schema renderer with all fields).
- Edit button → opens BeatTemplateForm in edit mode pre-populated.
- Delete button → hybrid-delete confirmation flow per SPEC-101 §3:
  - If unreferenced → confirm hard delete.
  - If referenced → confirm archive (set `active: false`); show reference list.
  - Force-delete option with explicit "I understand this destroys audit trail" confirmation.

### 2. Create `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx`

Per-section form editors mapped to the schema's nested blocks:

- **Classification section**: move_family (select, 17 values), tags (chip input, free-form), intensity (select, 3 values), tone_fit (multi-select, 11 values).
- **Role slots section**: dynamic key-value list — each row has a slot-name input (free-form) + compatible_roles multi-select (11 values from `ManualStoryRole`).
- **Requires section**: record_classes_any (multi-select of MANUAL_RECORD_CLASSES values), record_tags_any (chip input), relationship_axes_any (multi-select, 6 values), location_tags_any (chip input).
- **Excludes section**: record_tags_any (chip input), forbidden_if_secret_tags (chip input).
- **Beat guidance section**: dynamic 1-5 ordered rows — each row has a function select (5 values) + instruction textarea. Validation: count must be 1-5; submit disabled outside that range.
- **Forbidden inventions section**: chip-style list of free-form strings (one per line).
- **Author notes section**: free-form textarea.

On save: typed client call to `createBeatTemplate` or `updateBeatTemplate`; backend validation errors (per ticket 002's `validateBeatTemplate`) render as inline field-level violations.

### 3. Modify `tools/manual-story-studio/web/src/App.tsx`

Add the route `/worlds/:worldSlug/manual-stories/:msSlug/beat-templates` → `<BeatTemplates />`, matching the existing route shape (per App.tsx:34-61).

## Files to Touch

- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (new)
- `tools/manual-story-studio/web/src/components/BeatTemplateForm.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- The BeatTemplateCandidates component (used in MomentComposer) — ticket 012.
- The PromptHistory.tsx tweak to display template per prompt — ticket 012.
- The typed client + types mirror — ticket 010.
- The backend CRUD routes — ticket 006.

## Acceptance Criteria

### Tests That Must Pass

1. The page renders with an empty beat-template list and shows an empty-state message.
2. The page renders a fixture list with per-template cards displaying title, move_family badge, tags, beat count.
3. The create form validates the 1-5 beat_guidance count constraint and rejects submission outside that range.
4. The create form's move_family select shows the 17 closed-enum values.
5. The edit form pre-populates with an existing beat-template fixture's data.
6. The delete flow:
   - Unreferenced template → confirmation → hard-delete API call.
   - Referenced template → archive confirmation → PUT with `active: false`.
   - Force-delete → explicit confirmation → hard-delete with audit-trail.
7. The active/archived toggle filters the list correctly.
8. The move_family filter filters the list correctly.
9. `cd tools/manual-story-studio && npm --prefix web test` succeeds (TypeScript + component tests).

### Invariants

1. The page uses the typed client from ticket 010 (no inline `fetch` calls; no parallel typedefs).
2. The form's closed-enum selects use the enum values from the web types mirror (no parallel hardcoded enum lists).
3. The hybrid-delete flow matches SPEC-101 §3 exactly (no new delete policy introduced).
4. The route registration follows the established `/worlds/:worldSlug/manual-stories/:msSlug/` prefix pattern.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/pages/BeatTemplates.test.tsx` (new) — covers the page-level acceptance criteria (list rendering, filters, delete flow).
2. `tools/manual-story-studio/web/src/components/BeatTemplateForm.test.tsx` (new) — covers the form-level acceptance criteria (validation, pre-population, closed-enum selects).

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (targeted verification — runs the web TypeScript check + component tests).
2. `cd tools/manual-story-studio && npm test` (full-pipeline verification — runs backend build + tests + web TypeScript check).
3. The targeted command above is the correct verification boundary because this ticket's deliverables are frontend pages + form; backend integration is exercised by ticket 006's tests and end-to-end flow by ticket 014's capstone.
