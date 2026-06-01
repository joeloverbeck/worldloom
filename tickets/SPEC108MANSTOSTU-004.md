# SPEC108MANSTOSTU-004: PasteProse strip edit-mode + Discard buffer-clear

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies `tools/manual-story-studio/web/src/pages/PasteProse.tsx` to remove the `?edit=SEG-N` URL parameter handling, the `readSegment` useEffect, the `editSegment` branch of `handleSave`, and the `editSegment` / `readSegment` imports. Repurposes the existing Discard button from navigate-to-dashboard to a client-side state reset.
**Deps**: None

## Problem

SPEC-108 makes PasteProse strictly append-only: the page accepts pasted prose and submits it via the `saveSegment` route, with no path to overwrite an existing segment. The current implementation supports an edit-mode reachable via `?edit=SEG-N` (set by the Manuscript page's Edit button — removed by ticket 005); in edit-mode, the page pre-fills the form from `readSegment` and the Save button calls `editSegment` instead of `saveSegment`. This entire edit-mode path must be stripped. Additionally, the existing Discard button currently navigates to the dashboard (losing the unsaved draft as a side effect of navigation); SPEC-108 §2 item 2 repurposes it as a client-side buffer-clear so the author can scrap an unsaved draft without leaving the page.

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/web/src/pages/PasteProse.tsx` exists at HEAD with edit-mode handling at lines 9-13 (imports), 31-37 (URL param + nav-state parsing), 50-51 (`editSegmentId` / `isEditMode` derivation), 53-83 (`readSegment` useEffect that pre-fills the form), 96-99 (`editSegment` branch of `handleSave`), 108-111 (Discard navigates to dashboard). All target lines are accounted for.
2. SPEC-108 §2 item 9 and §4 PasteProse bullet describe these specific code paths to remove. The reassessment-applied wording explicitly names the imports, the useEffect, the `handleSave` branch, and the URL param handling.
3. Cross-skill boundary: PasteProse currently imports `editSegment` and `readSegment` from `../api/segments.js` (ticket 003 modifies those API wrappers' signatures but leaves them backward-compatible; this ticket removes the imports entirely). After this ticket lands, PasteProse only imports `saveSegment` from that module. The shared boundary is the import surface — removing imports must not break any other consumer (it cannot, since each page's imports are independent).
4. FOUNDATIONS Rule 6 (No Silent Retcons): the edit-mode removal is a visible regression of capability from the Paste Prose page's surface — the change is greppable in the source diff and the URL parameter `?edit=SEG-N` no longer triggers any rendering branch. Users who previously bookmarked an edit-mode URL now reach the standard Paste Prose page (the URL param is silently ignored, which is the correct fall-through behavior for a removed capability).
5. (was template item 7 — PasteProse `?edit=SEG-N` URL handling removed; edit-mode rendering path eliminated): pipeline-wide grep for `?edit=` URL construction confirms the URL parameter is constructed only at one site — `Manuscript.tsx:104-107` via `handleEdit` — which ticket 005 removes alongside the Edit button. After ticket 004 + ticket 005 both land, no consumer constructs the `?edit=` URL and no consumer reads it. The edit-mode path is fully removed.

## Architecture Check

1. The strip is a pure removal — no new code added except the Discard button's new onClick handler (a 4-line state-reset block). The page's structure (heading, title input, prompt-id input, author-note input, prose textarea, button toolbar) is preserved. Alternatives considered: (a) leave edit-mode behind a feature flag (rejected — SPEC-108 §3 Key decisions explicitly preserves the lifecycle code paths at the WRITE layer but removes the UI affordances; flag indirection contradicts the spec's "fewer affordances, not relocated affordances" framing); (b) navigate Discard to a confirmation modal first (rejected — buffer-clear is a client-only state reset, no destructive action needs confirmation; the user can simply re-paste if they change their mind).
2. The Discard button's new behavior is "clear the form to its initial empty state" — `setProse("")`, `setTitle("")`, `setAuthorNote("")`, `setPromptId("")`. The `checklistPayload` state (set after a successful save) is independent and is cleared by its own Close handler, not by Discard.
3. No backwards-compatibility shims — the `?edit=` URL parameter is no longer read; the handler does nothing with it (browsers ignore unknown query params).

## Verification Layers

1. Edit-mode imports removed -> codebase grep-proof (`grep -n "editSegment\|readSegment" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches).
2. URL-param handling removed -> codebase grep-proof (`grep -n "useSearchParams\|editSegmentId\|isEditMode\|?edit=" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches).
3. `handleSave` calls only `saveSegment` -> codebase grep-proof (`grep -n "saveSegment\|editSegment" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns ≥1 `saveSegment` match and 0 `editSegment` matches).
4. Discard button is state-reset, not navigation -> codebase grep-proof (`grep -n "handleDiscard\|navigate" tools/manual-story-studio/web/src/pages/PasteProse.tsx` shows `handleDiscard` resets state; `navigate` import remains used elsewhere only if needed — likely removed entirely since the only `navigate` call was in the old `handleDiscard`).
5. Frontend bundle typechecks -> `npm --prefix tools/manual-story-studio/web test` passes.

## What to Change

### 1. Remove edit-mode imports and infrastructure

In `tools/manual-story-studio/web/src/pages/PasteProse.tsx`:

- Remove `editSegment` and `readSegment` from the `../api/segments.js` import (keep only `saveSegment`).
- Remove `useSearchParams` from the `react-router-dom` import (the page no longer reads query params). The `useLocation` import is also unused after the strip (nav-state was only used for `prompt_id` pre-fill via the edit path); remove it as well. Keep `useNavigate` only if any other site in the file still uses it; otherwise remove it.
- Remove the `PasteProseNavState` interface (lines 17-19), the `searchParams` / `navigate` / `location` / `navState` variable declarations (lines 31-34), the `editSegmentId` / `initialPromptId` derivations (lines 36-38), and the `isEditMode` derivation (line 51).
- Remove the entire `useEffect` block at lines 53-83 (the `readSegment` pre-fill).

### 2. Simplify `handleSave`

In the same file, `handleSave` (currently lines 85-106) now calls `saveSegment` unconditionally:

```ts
async function handleSave(): Promise<void> {
  if (!worldSlug || !msSlug) return;
  setSaving(true);
  setError(null);
  try {
    const request = {
      prose,
      title,
      author_note: authorNote,
      prompt_id: promptId.trim().length > 0 ? promptId.trim() : null,
    };
    const response = await saveSegment(worldSlug, msSlug, request);
    setChecklistPayload(response.checklist_payload);
  } catch (e) {
    setError(e instanceof Error ? e.message : "segment_save_failed");
  } finally {
    setSaving(false);
  }
}
```

### 3. Repurpose Discard button

Replace `handleDiscard` (currently lines 108-111) with a client-side state reset:

```ts
function handleDiscard(): void {
  setProse("");
  setTitle("");
  setAuthorNote("");
  setPromptId("");
  setError(null);
}
```

### 4. Simplify header rendering

The header at lines 122-129 currently conditionally renders "Edit Segment" vs "Paste Prose" plus an edit-segment-id caption. Replace with a fixed header:

```tsx
<header>
  <h2 id="paste-prose-heading">Paste Prose</h2>
</header>
```

Remove the `loading` state usage at line 131 (`{loading ? <p>Loading segment...</p> : null}`) since the page never loads an existing segment now. Remove the `loading` state declaration itself (line 44) and the disabled-button check (`disabled={saving || loading || prose.trim().length === 0}` becomes `disabled={saving || prose.trim().length === 0}` at line 197).

## Files to Touch

- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (modify)

## Out of Scope

- Removing the Edit/Delete buttons from Manuscript (ticket 005).
- Adding the Repair page (ticket 007).
- Backend route changes (ticket 002).
- The `prompt_id` field — kept as-is; authors still associate a saved segment with a prompt at save time.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (which is `tsc --noEmit`) succeeds.
2. `grep -n "editSegment\|readSegment" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches.
3. `grep -n "useSearchParams\|editSegmentId\|isEditMode" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches.
4. `grep -n "useEffect" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches (the only useEffect was the edit-mode pre-fill).
5. `grep -n "Edit Segment" tools/manual-story-studio/web/src/pages/PasteProse.tsx` returns 0 matches (the conditional header text is gone).

### Invariants

1. The page renders a single workflow: paste prose → Save (calls `saveSegment` → appends new segment) OR Discard (clears the local form). No URL parameter triggers a different rendering branch.
2. After a successful Save, the `checklistPayload` state renders the `<StateUpdateChecklist>` per existing behavior — unchanged.
3. The Discard button never makes a backend request; it only resets React state.

## Test Plan

### New/Modified Tests

1. `None — frontend page strip; verification is the typecheck pass plus the grep-proofs above. Acceptance-test coverage for the full append-only UX lands in ticket 008's manual-verification subsection of the spec's §6 Build & test.`

### Commands

1. `cd tools/manual-story-studio/web && npm test` — TypeScript typecheck.
2. `cd tools/manual-story-studio && npm test` — full backend + frontend test suite (run after all SPEC-108 tickets land to verify no cross-ticket regression).
