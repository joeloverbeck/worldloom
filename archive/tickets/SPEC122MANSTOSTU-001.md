# SPEC122MANSTOSTU-001: Remove post-segment prose-seeding; add copy-selected-prose-into-notes

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` web frontend (`PostSegmentWorkbench.tsx`); no backend or schema change.
**Deps**: None

## Problem

When the author creates a new record in the post-segment workbench, the new-record form is pre-populated from the segment prose: `initialRecordForSegment()` sets `summary` from the segment's last paragraph and `details` from the full segment body (`PostSegmentWorkbench.tsx:104-105`). This crosses Manual Story Studio's hardest product invariant — the prose/state boundary: the app must never infer record content from prose. It trains the wrong mental model (that the app derives record meaning from prose), pollutes the record store with narrator-voice text, and forces the author to delete pasted prose chunks. The legitimate "I want to quote this line" workflow is preserved by an explicit, opt-in affordance that writes the author's live text selection into the free-text `notes` field only.

## Assumption Reassessment (2026-06-03)

1. `initialRecordForSegment()` at `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx:95-108` sets `summary: payload?.segment.last_paragraph ?? ""` (`:104`) and `details: payload?.segment.body ?? ""` (`:105`), and the deterministic `tags: [segment:<id>]` (`:106`) plus `refs` from `included_record_summary` (`:99-103`). The `notes` field exists on the record schema (`tools/manual-story-studio/src/schema/manual-story.ts:83,157`) and is wired in the form (`web/src/components/RecordForm.tsx:643-644`). The rendered body is available client-side as `payload.segment.body` (consumed by `RenderedProse` at `:348`).
2. Spec SPEC-122 §2 item 1 + §3 specify: empty `title`/`summary`/`details`; keep the `segment:<id>` tag; `refs` only on explicit link action; an explicit live-selection "Copy selected prose into notes" affordance. The reassessment (M1) confirmed `last_paragraph` is RETAINED in the payload for the segment-meta display row (`:330-332`) — this ticket changes only the seeding use at `:104-105`, not the backend field.
3. Cross-artifact boundary under audit: the frontend → records write API (`apiCreate`/`apiUpdate` in `web/src/api/records.js`). The new-record default object and the copy-into-notes affordance must write only `notes` (free-text), never `summary`/`details`/`title`, preserving the prose/state boundary at the write surface.
4. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation least-agency posture — the deterministic layer must never extract record meaning from prose. Manual Studio has no LLM, but the same posture forbids prose→record inference in its UI. Removing the seeding restores that discipline.
5. Implementation reassessment found that `refs` were also still prefilled by default in `initialRecordForSegment()`. The final implementation corrects that same ticket-owned boundary: new records start with empty `refs.characters` and `refs.related_records` unless the author explicitly checks the prompt-link option in the new-record drawer.

## Architecture Check

1. Empty defaults plus opt-in provenance (the `segment:<id>` tag and author-chosen `refs`) is the correct post-segment default: provenance that costs nothing and asserts nothing about prose meaning is fine; copying prose text into structured fields is the violation. An explicit copy-into-notes button preserves the quote workflow without ever auto-seeding.
2. No backwards-compatibility shim: the seeding lines are removed outright, not gated behind a flag. The copy affordance is additive UI.

## Verification Layers

1. New records carry no prose-derived `summary`/`details` -> codebase grep-proof (`initialRecordForSegment` returns empty `summary`/`details`) + frontend test asserting the new-record initial values contain no segment-prose text.
2. Copy-into-notes writes only `notes` -> codebase grep-proof (the affordance handler targets `notes`, never `summary`/`details`/`title`) + manual review of the rendered control.
3. Prose/state boundary preserved -> FOUNDATIONS alignment check (§Tooling Recommendation least-agency).

## What to Change

### 1. Empty new-record defaults

In `initialRecordForSegment()` (`PostSegmentWorkbench.tsx:95-108`), return empty `summary` and `details` (remove the `last_paragraph`/`body` seeding at `:104-105`). Keep the deterministic `tags: [segment:<id>]` provenance and the `refs` prefill ONLY on an explicit author link action (not by default). `title` starts empty.

### 2. "Copy selected prose into notes" affordance

Add an explicit control to the rendered-prose surface that, when the author has a live non-empty text selection (`window.getSelection()`) over the rendered segment prose, inserts the selected text into the record form's `notes` field. The control is enabled only when a non-empty selection exists. It reads from the already-available `payload.segment.body` render; it never writes `summary`/`details`/`title` and never performs an automatic whole-body or last-paragraph copy.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (modify)
- `tools/manual-story-studio/web/src/components/RecordForm.tsx` (modify)
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` (modify)

## Out of Scope

- Any backend / payload change — `last_paragraph` and `body` stay in the payload (retained for the segment-meta display row + prose render; reassessment M1).
- The `touched_records` → `linked_record_candidates` rename and reason-line/cardify work (archive/tickets/SPEC122MANSTOSTU-002.md / archive/tickets/SPEC122MANSTOSTU-003.md).
- Any inference of record changes from prose (the app must continue to do none).

## Acceptance Criteria

### Tests That Must Pass

1. A test asserting the new-record form's initial values (or `initialRecordForSegment()` output) contain no segment-prose text in `summary` or `details` (both empty).
2. The deterministic `segment:<id>` tag still prefills on new records.
3. `cd tools/manual-story-studio && npm test` is green (full pipeline).

### Invariants

1. The post-segment workbench never seeds structured record fields (`summary`/`details`/`title`) from prose.
2. The copy-selected-prose affordance writes only to `notes`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/post-segment-workbench.test.ts` — add an assertion that new-record defaults carry no prose-derived `summary`/`details`.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck — the web package's `test` script is `tsc --noEmit`)
2. `cd tools/manual-story-studio && npm test` (full pipeline)

## Outcome

Completed: 2026-06-03

Changed `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` so new post-segment records no longer seed `summary` from `last_paragraph`, no longer seed `details` from the full segment body, and no longer prefill prompt cast/record refs by default. The deterministic `segment:<id>` tag remains. Prompt cast/record refs are now behind an explicit new-record drawer checkbox, preserving the author-chosen provenance path without making it automatic.

Added an explicit `Copy selected prose into notes` button on the accepted-prose surface. It reads the author's live browser selection only when the selection is inside the rendered accepted prose, is enabled only while a record form is open, scopes the insertion to the current form, and routes the selected text through `RecordForm` into `notes` only. `RecordForm` gained a narrow `noteInsertion` prop for that notes-only append path.

Added `tools/manual-story-studio/test/post-segment-workbench.test.ts` coverage that source-checks the new-record defaults, blocks the old `summary: payload?.segment.last_paragraph` / `details: payload?.segment.body` seeding expressions, verifies the explicit prompt-link option, and checks the note insertion effect writes to `notes` without touching `summary`, `details`, or `title`.

Verification:

1. `rg -n "summary:\\s*payload\\?\\.segment\\.last_paragraph|details:\\s*payload\\?\\.segment\\.body" tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` returned no matches.
2. `rg -n "last_paragraph" tools/manual-story-studio/web/src tools/manual-story-studio/src` showed only allowed non-seeding consumers: the Workbench type/display row, backend payload field, and unrelated prompt recent-segment prompt context.
3. `cd tools/manual-story-studio && npm run test:backend` passed.
4. `cd tools/manual-story-studio && npm --prefix web test` passed.
5. `cd tools/manual-story-studio && npm test` passed: backend build, 490 backend tests, and web typecheck all green.
6. `git diff --check -- tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx tools/manual-story-studio/web/src/components/RecordForm.tsx tools/manual-story-studio/test/post-segment-workbench.test.ts archive/tickets/SPEC122MANSTOSTU-001.md` passed.

Deviations:

- The original `Files to Touch` list omitted `RecordForm.tsx`; implementation needed a narrow optional notes-insertion prop there so the explicit copy affordance could write into the existing form state without adding any summary/details/title path.
