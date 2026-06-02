# SPEC-108 — Manual Story Studio: Segment Lifecycle Append-Only by Default

**Status:** COMPLETED
**Date:** 2026-06-01
**Classification:** tooling-adjacent (segment write surface under `worlds/<slug>/manual-stories/<slug>/segments/`; no canon-pipeline integration).
**Depends on:** archive/specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md (typed-error reads from `src/read/segments.ts` — the new lifecycle gates rely on `ReadResult<T>` for atomic precondition checks).
**Blocks:** —
**Related:** `tools/manual-story-studio/src/write/segments.ts`, `tools/manual-story-studio/src/server/routes/segments.ts`, `tools/manual-story-studio/web/src/pages/PasteProse.tsx`, `tools/manual-story-studio/web/src/pages/Manuscript.tsx`; `archive/specs/SPEC-109-manual-story-studio-current-context-layer.md` (state-review precondition for `force_replace` landed through the current-context state-review surface).
**Source:** critical triage of `reports/manual-story-studio-second-iteration.md` §§5 / 15 / 19 / 31 Stage 4 (ChatGPT-Pro, 2026-06-01). Accepted with modification: the report's "remove ordinary delete/reorder" instinct is right; the modification is to *gate* the existing edit/delete code paths behind an explicit `repair_mode` flag rather than delete them outright, so existing tests and code paths remain reachable for genuine repair scenarios while the primary UX presents append-only semantics.

---

## 1. Context & Motivation

The current segment lifecycle is too broad for a writer's cockpit. Verified in `tools/manual-story-studio/src/write/segments.ts`:

- `saveSegment` — appends a new segment with auto-allocated ID. Correct.
- `editSegment` — rewrites prose and sidecar of an existing segment in place. Reached from the primary "Paste Prose" UI via a `?edit=SEG-N` URL parameter (set by the Manuscript page's per-segment Edit button), not a visible button on the Paste Prose page itself.
- `deleteSegment` — three distinct outcomes depending on referrers and force flag:
  - `hard_deleted`: no referrers; files unlinked.
  - `force_deleted`: referrers exist but caller passed `force: true`; files unlinked anyway, warning returned.
  - `segment_order_removed_files_preserved`: referrers exist, no force; segment removed from `manuscript.md` order while files survive.

This is admin-shaped: the *editor* of a saved manuscript reorders and deletes; the *writer* of the next beat does not. The report §15 names the intended discipline: "if the latest prose is bad, do not preserve it as a segment. Adjust the directive/state/template and run the external model again." The current UX leaks editor-mode actions into the writing loop, which is the wrong mental model for the cockpit.

But removing the code paths outright would (a) break the existing tests that cover them, (b) eliminate the legitimate repair path where a saved segment turns out to be corrupted on disk (e.g., a `.md` file truncated by an editor crash, an out-of-band edit that broke YAML), and (c) preclude a "replace latest accepted segment" workflow the report §15 acknowledges as legitimate when no later segment exists.

This spec keeps the lifecycle code paths intact and gates them behind explicit modes. The primary UX is append-only-by-default; `editSegment` and `deleteSegment` remain reachable only via a dedicated "repair mode" affordance. A new `discardBeforeSave` path handles the "the prose was bad, scrap it" case without writing a segment at all.

## 2. Scope

### In scope

1. **Append-only primary UX.** The Paste Prose page submits prose via a single backend route, `POST /api/.../segments` (existing). The route handler permits only the `saveSegment` operation by default; the prose is accepted as the next segment with an auto-allocated ID. No `editSegment` or `deleteSegment` is reachable from this page's UI in the primary mode.

2. **`discardBeforeSave` path.** Before pressing the "Save as next segment" button, the author may press a "Discard" button that clears the paste buffer client-side without making any backend call. Already-saved segments are unaffected. The Paste Prose page distinguishes "unsaved draft" (clearable without backend) from "saved segment" (append-only, not editable from this UI).

3. **`repair_mode` flag on `editSegment` and `deleteSegment` routes.** Both routes accept an explicit query string `?mode=repair` or request-body `mode: "repair"` flag. Routes without the flag return `405 Method Not Allowed` with a body explaining the operation requires repair mode and pointing to the affordance. Routes with the flag proceed with the existing implementation.

4. **`editSegment` repair-mode preconditions.** When `mode=repair` is set, `editSegment` validates: (a) the target segment exists, (b) the target is the *latest* segment in `segment_order`, OR the `force_replace` sub-flag is set. Replacing a non-latest segment without `force_replace` returns `422` with finding `repair-replace-non-latest-blocked`. This honors the report §15 condition "replace latest accepted segment only if no later accepted segment exists."

5. **`deleteSegment` repair-mode preconditions.** When `mode=repair` is set, `deleteSegment` keeps its three existing outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) — these are the genuine repair-shaped cases. Without `mode=repair`, the route returns `405`.

6. **New repair-mode UI surface.** A new page at `/worlds/:worldSlug/manual-stories/:msSlug/repair` lists all segments with per-row affordances: "Replace prose" (calls `editSegment` with `mode=repair`), "Discard segment" (calls `deleteSegment` with `mode=repair`). The page carries a persistent warning banner: "Repair mode bypasses the cockpit's append-only discipline; use only for corrupted or accidentally-saved segments." The page is accessible from a small "Repair this manuscript" link rendered inside the Dashboard's `§Latest segment` section (lines 345-366 of the current `Dashboard.tsx`), alongside the existing manuscript link — not from the primary navigation.

7. **Backend constants for the mode.** New `src/write/segment-modes.ts` exporting `SEGMENT_REPAIR_MODE_FLAG = "repair"` and a `SegmentMode` type. Routes consume the constant; tests assert against it.

8. **Acceptance tests for the new mode-gate behavior**, under `tools/manual-story-studio/test/segments/`:
   - `POST /api/.../segments` (no mode flag) accepts a save; segment appended.
   - `PUT /api/.../segments/SEG-3` (no mode flag) returns `405` with `repair-mode-required` finding.
   - `PUT /api/.../segments/SEG-3?mode=repair` succeeds when SEG-3 is the latest segment.
   - `PUT /api/.../segments/SEG-2?mode=repair` returns `422` with `repair-replace-non-latest-blocked` when SEG-3 exists after it; succeeds when `force_replace: true` is also set.
   - `DELETE /api/.../segments/SEG-3` (no mode flag) returns `405`.
   - `DELETE /api/.../segments/SEG-3?mode=repair` proceeds; outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`) unchanged from current behavior.

   The existing route-level PUT / DELETE tests in `tools/manual-story-studio/test/server/segments-routes.test.ts` (PUT edit at line 270, DELETE hard at line 302, DELETE preserved/force around lines 333-380) currently call the routes without a mode flag and expect `200`; under the new gating they would receive `405`. Update each in place to thread `?mode=repair` so they continue to validate the legacy outcomes under repair mode. The new file at `test/segments/segment-lifecycle.test.ts` owns the mode-gate enforcement assertions; the existing file remains the canonical home for HTTP-level segment route behavior.

9. **PasteProse UI changes.** Strip the page of its existing edit-mode plumbing — the `?edit=SEG-N` URL parameter handling (`useSearchParams` + `editSegmentId` + `isEditMode`), the `readSegment` useEffect that pre-fills the form when edit-mode is active, the `editSegment` branch inside `handleSave`, and the `editSegment` / `readSegment` imports from `../api/segments.js`. After the rewrite the Save button submits unconditionally via the append-only `saveSegment` path. Repurpose the existing Discard button: today it navigates to the dashboard; rewire it to a client-side React-state reset (`setProse("")` + `setTitle("")` + `setAuthorNote("")` + `setPromptId("")`) so unsaved drafts can be cleared without leaving the page.

10. **Manuscript page changes.** The Manuscript page (`web/src/pages/Manuscript.tsx`) loses its per-segment Edit and Delete affordances. Remove the `handleEdit` / `handleDelete` handlers and the `deleteSegment` import. The `SegmentListItem` component (`web/src/components/SegmentListItem.tsx`) must also change: drop the `onEdit` and `onDelete` props from `SegmentListItemProps` and remove the toolbar `<div role="toolbar">` block (currently lines 51-62) that renders the Edit / Delete buttons; segments render as immutable manuscript text with the selection affordance only. A small "Repair this segment" disclosure-style link in `Manuscript.tsx` routes to the repair page with the segment pre-selected.

### Out of scope

- Removing the lifecycle code paths outright — explicitly preserved per §3 Key decisions.
- Adding a "reorder segments" UI — not introducing the affordance; `segment_order` is append-only in the primary UX and append/delete-only in repair mode.
- Adding "retire segment" as a fourth lifecycle mode (the report §15 mentions it as "rare explicit repair mode, never silent deletion") — the existing `segment_order_removed_files_preserved` outcome already covers this case in repair mode; no new mode needed.
- Lowercase ID rename (`seg-1` instead of `SEG-1`) — explicitly rejected per the triage; uppercase IDs preserved.
- Same-basename sidecar collapse (`prompts/` + `prompt-runs/` merge) — explicitly rejected per the triage.
- Manuscript-vs-segment-order byte-content validation (source report §15: *"manuscript.md should be derived and rebuildable. Persist it for convenience, but validate it against segment order."*) — `defer→spec-bundle`. The Manuscript page already supports a "Rebuild Manuscript" affordance (`Manuscript.tsx:174`), satisfying the "derived and rebuildable" portion. The byte-content validation portion is integrity-shaped but not health-shaped (SPEC-105's `/health` surface is per-file integrity, not manuscript-vs-order reconciliation); no sibling spec in the SPEC-105..SPEC-111 bundle explicitly owns it. Recorded here per §3.12 bundle-deferred discipline so the audit trail is honest about non-adoption.
- Health endpoint and read-error typing — **SPEC-105** (prerequisite).
- Prompt-leakage hard-tier promotion — **SPEC-106**.
- Current-context layer — **SPEC-109**.
- Single-cockpit-page UX consolidation — **SPEC-111**.

## 3. Key decisions

- **Gate, don't delete.** Removing `editSegment` and `deleteSegment` would (a) regress existing tests, (b) eliminate the legitimate corrupted-file repair path, and (c) force a future spec to re-introduce some form of repair affordance under pressure. Gating behind `mode=repair` achieves the report's intent (append-only primary UX) while preserving the necessary escape valve.

- **`405 Method Not Allowed`, not `403 Forbidden`.** The methods are structurally allowed on the resource (segment URL); the request is rejected because the mode flag is absent. `405` with an `Allow` header and a body explaining the mode requirement is the right semantic — the route accepts PUT/DELETE only with the `?mode=repair` qualifier.

- **`force_replace` is the gate for non-latest replacement.** The report §15 framing — "replace latest accepted segment only if no later accepted segment exists and no state-review record has been marked complete" — names two preconditions. The "no later segment" check is straightforward; the "no state-review record marked complete" check requires the state-review tracking surface (which **SPEC-109** introduces). This spec implements the "no later segment" precondition now; the state-review precondition lands when **SPEC-109** ships, as a follow-up edit to this same route. Adding `force_replace` lets the repair-mode user override the "no later segment" check explicitly when truly needed.

- **Repair page is a distinct route, not a modal.** A dedicated `/repair` page makes the mode change *visible* in the URL; the persistent warning banner makes it visible in the UI; the small entry point keeps it out of the primary flow.

- **No code path is silently disabled.** Each gated affordance returns a structured response naming the mode requirement. A test or future contributor calling the route from a script gets a clear error, not a confusing `404`.

- **`PasteProse` and `Manuscript` lose write affordances; gain no replacement.** The intent is fewer affordances, not relocated affordances. Authors who want repair go to the repair page; authors who want to discard go through the Discard-before-save client buffer.

## 4. Files to touch

**Create:**

- `tools/manual-story-studio/src/write/segment-modes.ts` — `SEGMENT_REPAIR_MODE_FLAG`, `SegmentMode` type.
- `tools/manual-story-studio/web/src/pages/RepairSegments.tsx` — repair-mode UI per §2 item 6.
- `tools/manual-story-studio/test/segments/segment-lifecycle.test.ts` — route-level mode-gate tests per §2 item 8.

**Modify:**

- `tools/manual-story-studio/src/server/routes/segments.ts`:
  - `POST /api/.../segments` — no behavior change; documents append-only intent in a route-level comment.
  - `PUT /api/.../segments/:segmentId` — accept and validate `mode` query param; `405` without `mode=repair`; enforce latest-segment precondition; honor `force_replace` sub-flag.
  - `DELETE /api/.../segments/:segmentId` — accept and validate `mode` query param; `405` without `mode=repair`; current three-outcome behavior under `mode=repair`.
- `tools/manual-story-studio/src/write/segments.ts`:
  - `editSegment` — add a `preconditions: { require_latest: boolean }` option to its input; honor at the gate.
  - No behavior change to `deleteSegment`; the gating happens at the route layer.
- `tools/manual-story-studio/web/src/App.tsx` — add `/worlds/:worldSlug/manual-stories/:msSlug/repair` route binding to `<RepairSegments />`.
- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` — remove the `?edit=SEG-N` URL parameter handling (`useSearchParams` + `editSegmentId` + `isEditMode`), the `readSegment` useEffect, the `editSegment` branch of `handleSave`, and the `editSegment` / `readSegment` imports; Save submits unconditionally via `saveSegment`. Rewire the existing Discard button from navigate-to-dashboard to a client-side state reset (clear `prose` / `title` / `authorNote` / `promptId`).
- `tools/manual-story-studio/web/src/pages/Manuscript.tsx` — remove the `handleEdit` / `handleDelete` handlers and the `deleteSegment` import; segments render as immutable manuscript text. Add a "Repair this segment" disclosure link routing to the repair page with the segment pre-selected.
- `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` — drop `onEdit` and `onDelete` from `SegmentListItemProps` and remove the `<div role="toolbar">` Edit / Delete buttons block (currently lines 51-62). The component keeps only the selection rendering.
- `tools/manual-story-studio/web/src/pages/Dashboard.tsx` — add a small "Repair this manuscript" link inside the `§Latest segment` section (lines 345-366), alongside the existing manuscript link, routing to the repair page.
- `tools/manual-story-studio/web/src/api/segments.ts` — extend `editSegment`/`deleteSegment` API wrappers with the `mode` and `force_replace` parameters.
- `tools/manual-story-studio/test/server/segments-routes.test.ts` — update the existing PUT-edit test (line 270) and DELETE tests (line 302 hard-delete; lines 333-380 preserved + force) to pass `?mode=repair` so their legacy-outcome assertions continue to hold under the new gating. New mode-gate enforcement assertions (405 without flag, 422 for non-latest replace, etc.) live in `test/segments/segment-lifecycle.test.ts`.

**No modification to:**

- `tools/manual-story-studio/src/manuscript/compile.ts` — compile path is unchanged.
- `tools/manual-story-studio/src/write/segment-id-allocator.ts` — allocator path is unchanged.
- The `SegmentSidecar` schema or sidecar write logic — schema unchanged.
- Any other route or page.

## 5. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
| --- | --- | --- |
| §Story Bundles §4 Write Discipline (deterministic write surface) | aligns by analogy @ append-only primary UX | Manual Studio is not a story bundle, but the discipline of an append-only primary write surface (with explicit repair-mode gates for the destructive operations) mirrors the deterministic write discipline FOUNDATIONS expects. |
| §Story Bundles §4a Plan-Authority Boundary (rendered prose is non-authoritative) | aligns @ append-only segments | Accepted prose is durable manuscript; the append-only discipline reinforces "prose is evidence, not authority" by removing the silent rewrite path. |
| Rule 6 No Silent Retcons | aligns @ repair-mode gate | The repair-mode gate prevents *silent* edits of accepted manuscript text; any rewrite passes through a route-visible mode flag and a UI-visible warning banner. |
| §Tooling Recommendation (least-privilege LLM packets) | N/A @ unrelated | This spec does not touch the prompt boundary. |
| Rule 1 No Floating Facts | N/A @ tooling-adjacent | No canon facts engaged. |
| §Canonical Storage Layer | N/A @ tooling-adjacent | No `_source/` interaction. |

## 6. Build & test

`tools/manual-story-studio`: `npm test`. The new route-level tests in `test/segments/segment-lifecycle.test.ts` cover the mode-gate behavior (405 without flag, 422 for non-latest replace, gated outcomes). Existing function-level tests under `test/write/segments.test.ts` (which call `editSegment` / `deleteSegment` directly, not via HTTP) continue to cover the underlying implementations unchanged. The existing HTTP route tests in `test/server/segments-routes.test.ts` are updated in place to thread `?mode=repair` so their legacy-outcome assertions continue to validate that repair-mode behavior is unchanged from the pre-spec behavior.

Manual verification: open Paste Prose, paste prose, observe Save and Discard buttons; saving creates a new segment, discarding clears the buffer without backend call. Open Manuscript page; the per-segment Edit/Delete affordances are absent; the "Repair this segment" link routes to the repair page. Open the repair page; the warning banner is visible; replacing a non-latest segment without `force_replace` returns the structured `422` error.

## 7. Acceptance criteria

1. `POST /api/.../segments` continues to accept saves and append to `segment_order`. (no regression)
2. `PUT /api/.../segments/:segmentId` without `?mode=repair` returns `405 Method Not Allowed` with a body containing `repair-mode-required`. (acceptance test)
3. `PUT /api/.../segments/SEG-N?mode=repair` succeeds when SEG-N is the last entry in `segment_order`. (acceptance test)
4. `PUT /api/.../segments/SEG-N?mode=repair` returns `422` with `repair-replace-non-latest-blocked` when a later segment exists; succeeds when `force_replace: true` is set alongside. (acceptance test)
5. `DELETE /api/.../segments/:segmentId` without `?mode=repair` returns `405`. (acceptance test)
6. `DELETE /api/.../segments/SEG-N?mode=repair` preserves the existing three outcomes (`hard_deleted` / `force_deleted` / `segment_order_removed_files_preserved`). (acceptance test, ported from existing delete tests)
7. Paste Prose page has no UI affordance for `editSegment` or `deleteSegment`; its only mutation paths are Save (append) and Discard (client-side buffer clear). (verified by grep against the JSX source)
8. Manuscript page has no per-segment Edit/Delete affordances. (verified by grep)
9. A new page exists at `/worlds/:worldSlug/manual-stories/:msSlug/repair` with the warning banner and per-segment affordances. (acceptance test or manual verification)
10. The `web/` `tsc --noEmit` step remains green.

## 8. Assumption reassessment

- **Assumption:** No external tool or CI step currently posts to `editSegment` or `deleteSegment` without a mode flag. → Verify via `grep -rn "editSegment\|deleteSegment" .` from repo root, excluding `tools/manual-story-studio/`. If a tool exists (unlikely), update it as part of this spec's diff.
- **Assumption:** The existing `editSegment` test (`test/write/edit-segment.test.ts` or similar) calls the function directly, not via the HTTP route. → Verify; if it calls via HTTP, update the test to include `mode=repair`. If it calls directly, the function-level test remains unaffected (the mode gate is at the route layer).
- **Assumption:** The `compile_on_segment_save: true` metadata default (per the report §3) still applies to the append-only save path. → Yes — the `saveSegment` implementation already calls `maybeCompile`; unchanged.
- **Assumption:** The "no state-review record marked complete" precondition the report §15 names is deferred to SPEC-109's state-review surface. → Yes — this spec implements the "no later segment" precondition only; the state-review precondition lands when SPEC-109 introduces the tracking surface.

## 9. Outcome

Completed on 2026-06-01 via:

- `archive/tickets/SPEC108MANSTOSTU-001.md`
- `archive/tickets/SPEC108MANSTOSTU-002.md`
- `archive/tickets/SPEC108MANSTOSTU-003.md`
- `archive/tickets/SPEC108MANSTOSTU-004.md`
- `archive/tickets/SPEC108MANSTOSTU-005.md`
- `archive/tickets/SPEC108MANSTOSTU-006.md`
- `archive/tickets/SPEC108MANSTOSTU-007.md`
- `archive/tickets/SPEC108MANSTOSTU-008.md`

Manual Story Studio's segment lifecycle is now append-only in the primary UX and repair-gated at destructive routes. The backend rejects segment PUT/DELETE without `mode=repair`, enforces the latest-segment replacement precondition unless `force_replace` is explicit, and preserves existing repair-mode delete outcomes. The frontend API wrappers support the repair flags, Paste Prose only appends or clears an unsaved buffer, Manuscript no longer exposes Edit/Delete buttons, Dashboard adds a subordinate repair entry point, and `/repair` provides the dedicated warning-gated repair surface.

Verification completed:

- `cd tools/manual-story-studio && npm test` — passed: backend build, 398 backend tests, and web `tsc --noEmit`.
- Ticket-level grep witnesses passed for repair-mode constants, route gates, wrapper signatures, RepairSegments route/warning/calls, PasteProse edit-mode removal, Manuscript/SegmentListItem write-affordance removal, and Dashboard repair-link placement.

Deviation: the state-review precondition for `force_replace` remains deferred to SPEC-109 as planned; this spec implements the no-later-segment precondition and explicit `force_replace` override only.
