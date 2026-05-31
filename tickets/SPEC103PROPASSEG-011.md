# SPEC103PROPASSEG-011: PasteProse page + segments API client + edit-mode pre-population

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (the paste-and-save editor screen) + `tools/manual-story-studio/web/src/api/segments.ts` (typed frontend client for the segments HTTP routes).
**Deps**: archive/tickets/SPEC103PROPASSEG-008.md, archive/tickets/SPEC103PROPASSEG-012.md

## Problem

SPEC-103 §2 item 1 specifies the Paste Prose editor screen: large monospace editor for pasted prose, optional segment title input (defaults to truncated first sentence if blank at save), optional author note input, optional reference to the prompt that produced this prose (auto-set from navigation context if author arrived from Prompt Preview; otherwise selectable from saved prompts), live word count, Save Segment primary action, Discard action. §3 Key decisions item 7 adds the edit-mode behavior: editing an existing segment re-opens the same Paste Prose editor pre-populated with the existing prose; on save, the segment is updated in place (same id, same sidecar except `updated_at` and `word_count`); the manuscript recompiles. §7 AC#1, #7, #11 specify the behaviors. After save, the PasteProse page renders `archive/tickets/SPEC103PROPASSEG-012.md`'s StateUpdateChecklist component as a modal using the `checklist_payload` returned by the save HTTP response.

## Assumption Reassessment (2026-05-31)

1. Existing frontend convention (`tools/manual-story-studio/web/src/pages/MomentComposer.tsx` from SPEC-102; `tools/manual-story-studio/web/src/pages/Records.tsx` from SPEC-101) uses functional React components with `useParams` + `useState` + `useEffect` + `fetch`-based API helpers in `web/src/api/*.ts`. The existing `web/src/api/prompts.ts` is the closest pattern for `web/src/api/segments.ts`. App.tsx routes (modified in ticket 015) will register `/worlds/:worldSlug/manual-stories/:msSlug/paste-prose` for create mode and the same route with `?edit=SEG-<n>` query parameter for edit mode.
2. SPEC-103 §2 item 1 (PasteProse editor surface + title/note/prompt-ref/word-count/Save/Discard actions), §3 Key decisions item 7 (segment edit re-opens the same editor pre-populated), §7 AC#1 ("Author can paste prose into the editor, fill in optional title/note, and save a segment"), AC#7 ("Segment edit (in-place update) preserves the sidecar's id and created_at, updates word_count, and triggers manuscript recompile"), AC#11 ("Discarded prose (paste-then-navigate-away) is not persisted anywhere").
3. Cross-skill boundary: PasteProse imports `archive/tickets/SPEC103PROPASSEG-012.md`'s `StateUpdateChecklist` component (rendered as a modal after save). PasteProse consumes ticket 008's segments routes via `web/src/api/segments.ts` (this ticket's API client — POST save / GET single for edit-mode pre-population / PUT edit / DELETE optional from the editor). PasteProse's typed segment sidecar comes from `web/src/types/manual-story.ts` (ticket 001 web mirror). Navigation from the Prompt Preview screen (existing SPEC-102 `PromptPreview.tsx`) passes the `prompt_id` via React Router state or a query parameter — verify the existing PromptPreview navigation surface at implementation time to know whether the contract is state-passing or query-parameter-passing.
4. FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary: PasteProse is the entry point for paste-as-publication-not-state. The page's contract is "collect prose + metadata, send to backend save endpoint, render the returned checklist modal" — it never directly mutates any record, never infers state from prose, never branches into engine logic. The save flow's no-record-mutation invariant (`archive/tickets/SPEC103PROPASSEG-004.md`) is the backend enforcement; PasteProse's no-state-inference invariant is the frontend enforcement. Combined they realize the §4a discipline at the paste-segment surface.

## Architecture Check

1. PasteProse as a single page with two modes (create-new via URL with no query param; edit-existing via `?edit=SEG-<n>` query param) keeps the editor's UI surface unified — the user sees the same controls in both modes, just pre-populated in edit mode. The alternative (separate Edit page) would duplicate the editor controls + Save/Discard actions and create two UI surfaces to maintain.
2. No backwards-compatibility aliasing — net-new page and net-new API client; no prior PasteProse or segments API code exists.

## Verification Layers

1. PasteProse renders in create mode (no `?edit` param): empty editor, empty title/note, prompt selector defaults from navigation state or empty → manual smoke check + component test (if test framework set up)
2. PasteProse renders in edit mode (`?edit=SEG-<n>`): editor pre-populated from `GET /segments/:id` body; sidecar fields (title, author_note, prompt_id) pre-populated → manual smoke check
3. Save Segment in create mode: POST /segments → backend returns 201 + `{ segment_id, sidecar, checklist_payload }` → PasteProse renders `archive/tickets/SPEC103PROPASSEG-012.md`'s StateUpdateChecklist as modal with `payload` prop → component test
4. Save Segment in edit mode: PUT /segments/:id → backend returns 200 + `{ segment_id, sidecar, checklist_payload }` → same modal render → component test
5. Discard action: navigates away without calling backend → no segment file is written (PasteProse's no-state-mutation invariant) → manual smoke check + observed via filesystem state after Discard

## What to Change

### 1. Create web/src/api/segments.ts

In `tools/manual-story-studio/web/src/api/segments.ts`, implement the typed client per the existing `web/src/api/prompts.ts` pattern:

```typescript
import type {
  SegmentSidecar,
  StateUpdateChecklistPayload, // from ticket 005 web type mirror — verify mirror added in ticket 001 or extend it here
} from "../types/manual-story.js";

export interface SaveSegmentRequest {
  prose_body: string;
  title?: string;
  author_note?: string;
  prompt_id?: string | null;
}

export interface SaveSegmentResponse {
  segment_id: string;
  sidecar: SegmentSidecar;
  checklist_payload: StateUpdateChecklistPayload;
}

export async function saveSegment(
  worldSlug: string,
  msSlug: string,
  request: SaveSegmentRequest,
): Promise<SaveSegmentResponse> { /* POST /segments */ }

export async function readSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
): Promise<{ body: string; sidecar: SegmentSidecar }> { /* GET /segments/:id */ }

export async function editSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  request: SaveSegmentRequest,
): Promise<SaveSegmentResponse> { /* PUT /segments/:id */ }

export interface DeleteSegmentResponse {
  outcome: "hard_deleted" | "segment_order_removed_files_preserved" | "force_deleted";
  referrers: string[];
  warning?: string;
}

export async function deleteSegment(
  worldSlug: string,
  msSlug: string,
  segmentId: string,
  options?: { force?: boolean },
): Promise<DeleteSegmentResponse> { /* DELETE /segments/:id?force=true */ }
```

(If the `StateUpdateChecklistPayload` type isn't yet mirrored to web in ticket 001's modify, add the mirror here as a small additive extension to `web/src/types/manual-story.ts` — verify at implementation time.)

### 2. Create web/src/pages/PasteProse.tsx

Implement the page per SPEC-103 §2 item 1's surface enumeration:

- React functional component using `useParams<{ worldSlug; msSlug }>()` and `useSearchParams()` to detect edit mode via `?edit=SEG-<n>`
- State: `proseBody`, `title`, `authorNote`, `promptId`, `wordCount` (derived from `proseBody`), `checklistPayload` (set after save), `saveError`
- Effect: if edit mode, call `readSegment` to pre-populate state; otherwise leave empty
- Effect: if navigated from PromptPreview with a `prompt_id` in router state, pre-set `promptId`
- Live word count: re-computed on every `proseBody` change (split on whitespace)
- Save handler: in create mode call `saveSegment`; in edit mode call `editSegment`; on success render `<StateUpdateChecklist payload={checklistPayload} onClose={...} />` modal
- Discard handler: navigate to dashboard or manuscript view without any backend call
- Layout: large monospace `<textarea>` for prose, smaller text inputs for title + note, dropdown or text input for prompt selection, prominent Save button, secondary Discard button

### 3. Wire StateUpdateChecklist modal

Import `StateUpdateChecklist` from `web/src/components/StateUpdateChecklist.tsx`, landed by `archive/tickets/SPEC103PROPASSEG-012.md`. Render conditionally when `checklistPayload != null`.

## Files to Touch

- `tools/manual-story-studio/web/src/api/segments.ts` (new)
- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (new)

## Out of Scope

- The segments HTTP routes themselves (covered by ticket 008)
- The StateUpdateChecklist component implementation (covered by `archive/tickets/SPEC103PROPASSEG-012.md`; this ticket imports it)
- App.tsx route registration for `/paste-prose` (covered by ticket 015)
- The Manuscript view's per-segment Edit button navigation (covered by ticket 013; navigates to this page with `?edit=SEG-<n>`)
- The Prompt Preview screen's "Use this prompt" navigation to PasteProse (existing SPEC-102 surface; this ticket consumes the navigation state but doesn't modify Prompt Preview)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle builds with PasteProse + segments API client
2. `cd tools/manual-story-studio && npm test` — full suite green (frontend test coverage exercised under `npm --prefix web test`); existing pages unaffected
3. Manual smoke check after ticket 015 lands: navigate to `/worlds/<slug>/manual-stories/<msSlug>/paste-prose`, paste prose, click Save → backend creates SEG-1.md + SEG-1.yaml, manuscript recompiles, StateUpdateChecklist modal renders with 12 review classes

### Invariants

1. PasteProse never directly mutates any record file under `<manualStoryRoot>/records/` — it only POST/PUT/DELETE-s to `/segments` endpoints (which are governed by `archive/tickets/SPEC103PROPASSEG-004.md`'s no-record-mutation invariant).
2. The StateUpdateChecklist modal rendered after save NEVER asserts state changed — its `disclaimer` prop is the literal SPEC-required text from ticket 005, which is "Review these categories manually. Manual Story Studio has not changed any records." (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary).
3. Discard action: in-memory editor state is lost; no backend call is made; per AC#11 "Discarded prose (paste-then-navigate-away) is not persisted anywhere".
4. Edit mode preserves `id` and `created_at` (read from backend's pre-edit sidecar; not modified by PasteProse); `updated_at` and `word_count` are refreshed by the backend on PUT response.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/pages/PasteProse.tsx` — component test (if web test framework is set up under the package's existing convention) covering create vs edit mode, save handler, discard handler, modal render after save. If no web component test framework exists at this package's existing convention, defer to ticket 016 capstone for end-to-end coverage.
2. `tools/manual-story-studio/web/src/api/segments.ts` — typed API client; behavioral coverage via PasteProse component test + ticket 016 capstone.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes web build + any web component tests + backend tests)
