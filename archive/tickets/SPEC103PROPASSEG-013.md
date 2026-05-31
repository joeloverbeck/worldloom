# SPEC103PROPASSEG-013: Manuscript page + SegmentListItem component + manuscript API client

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/pages/Manuscript.tsx` (the full compiled-manuscript view with segment list sidebar and per-segment actions), `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` (the sidebar list-item component), and `tools/manual-story-studio/web/src/api/manuscript.ts` (typed frontend client for the manuscript HTTP routes).
**Deps**: archive/tickets/SPEC103PROPASSEG-009.md, archive/tickets/SPEC103PROPASSEG-011.md

## Problem

SPEC-103 §2 item 7 specifies the Manuscript view: full compiled `manuscript.md` rendered as Markdown (read-only display), segment list sidebar (linked from `manual-story.yaml` `segment_order`), per-segment actions (Edit opening Paste Prose pre-populated, Delete via the hybrid policy, Reorder gated by `manuscript.allow_reorder` defaulting to `false` for MVP), Rebuild Manuscript button, word count summary (per-segment + total), "Open in Editor" hint showing the file path of `manuscript.md`. §7 AC#9 covers the view's contract. The page consumes ticket 009's manuscript HTTP routes (GET manuscript, POST rebuild) via `web/src/api/manuscript.ts` (this ticket) and ticket 011's `web/src/api/segments.ts` (for Delete action — DELETE /segments/:id; reused by importing from 011's API client surface).

## Assumption Reassessment (2026-05-31)

1. Existing frontend convention (`tools/manual-story-studio/web/src/pages/Records.tsx`, `MomentComposer.tsx`, `PromptPreview.tsx`) uses functional React components with `useParams` + `useState` + `useEffect` + `fetch`-based API helpers. The existing `web/src/api/prompts.ts` is the closest pattern for `web/src/api/manuscript.ts`. The existing `RecordCard.tsx` / `RecordForm.tsx` / `RefList.tsx` are the closest patterns for `SegmentListItem.tsx` (typed-props pure presentational component). The page imports ticket 011's `web/src/api/segments.ts` for the Delete action; ticket 011 must land first.
2. SPEC-103 §2 item 7 (Manuscript view surface enumeration: full manuscript + segment list + per-segment Edit/Delete/Reorder + Rebuild button + word count summary + "Open in Editor" hint), §7 AC#9 ("Manuscript view shows full compiled manuscript with segment list and word count summary").
3. Cross-skill boundary: this page consumes ticket 009's manuscript HTTP routes (GET, POST rebuild) via this ticket's new `web/src/api/manuscript.ts` client; consumes `archive/tickets/SPEC103PROPASSEG-011.md`'s `web/src/api/segments.ts` for Delete (DELETE /segments/:id); consumes ticket 007's `listSegments` shape via the GET /segments endpoint (already wired through ticket 008's segments-routes); navigates to `archive/tickets/SPEC103PROPASSEG-011.md`'s PasteProse page via `?edit=SEG-<n>` query param for the Edit button. The `manuscript.allow_reorder` gate (from ticket 001's schema extension; defaults to `false` per ticket 001's metadata-writer default) controls Reorder UI visibility — when `false` (MVP default), the Reorder UI is hidden entirely; M6 deferral per SPEC-103 §2 Out of scope.

## Architecture Check

1. Manuscript page as a single component composing the segment-list sidebar + manuscript body + per-segment-action handlers keeps the view's surface unified (sidebar selection + body display + actions live in one place). SegmentListItem extracted to a separate component to keep the sidebar's per-item rendering testable independently and to prepare for the M6 Reorder UI (which will need drag-and-drop affordances on the list item).
2. No backwards-compatibility aliasing — net-new page and component; net-new API client; no prior Manuscript view code.

## Verification Layers

1. Manuscript page fetches manuscript body via `GET /manuscript` on mount; renders empty state when 404 returned → web TypeScript build + manual review
2. Segment list sidebar renders entries from `listSegments` in order; each entry shows title + word count → web TypeScript build + manual review
3. Per-segment Edit button navigates to `/paste-prose?edit=SEG-<n>` → web TypeScript build + manual review
4. Per-segment Delete button calls DELETE /segments/:id via ticket 011's API client; on confirmation prompt for referenced segments (per `archive/tickets/SPEC103PROPASSEG-004.md`'s hybrid response with non-empty `referrers`), surface the warning and offer `?force=true` retry → web TypeScript build + manual review
5. Rebuild Manuscript button calls POST /manuscript/rebuild; on success, re-fetches manuscript body → web TypeScript build + manual review
6. `manuscript.allow_reorder: false` (MVP default per ticket 001): Reorder UI is hidden — no drag handles, no reorder buttons → web TypeScript build + manual review
7. Word count summary shows per-segment word counts (from sidecars via `listSegments`) + total (sum of per-segment counts) → web TypeScript build + manual review

## Landed Changes

### 1. Created web/src/api/manuscript.ts

`tools/manual-story-studio/web/src/api/manuscript.ts` now implements the typed client per the existing `web/src/api/prompts.ts` pattern:

```typescript
export interface ManuscriptResponse {
  manuscript_path: string;
  body: string;
  byte_count: number;
  word_count: number;
}

export async function readManuscript(
  worldSlug: string,
  msSlug: string,
): Promise<ManuscriptResponse | null> { /* GET /manuscript; returns null on 404 */ }

export interface RebuildManuscriptResponse {
  manuscript_path: string;
  segments_compiled: number;
  byte_count: number;
}

export async function rebuildManuscript(
  worldSlug: string,
  msSlug: string,
): Promise<RebuildManuscriptResponse> { /* POST /manuscript/rebuild */ }
```

### 2. Created web/src/components/SegmentListItem.tsx

`tools/manual-story-studio/web/src/components/SegmentListItem.tsx` is a typed-props presentational component:

```typescript
export interface SegmentListItemProps {
  segmentId: string;
  title: string;
  wordCount: number;
  selected?: boolean;
  onSelect?: (segmentId: string) => void;
  onEdit: (segmentId: string) => void;
  onDelete: (segmentId: string) => void;
}

export function SegmentListItem(props: SegmentListItemProps) {
  // Renders title, SEG id, word count, Edit, and Delete.
}
```

### 3. Created web/src/pages/Manuscript.tsx

`tools/manual-story-studio/web/src/pages/Manuscript.tsx` implements SPEC-103 §2 item 7's surface enumeration:

- React functional component using `useParams<{ worldSlug; msSlug }>()` + `useState` for manuscript body / segment list / metadata (`allow_reorder`) + `useEffect` to fetch all three on mount.
- Layout: sidebar with `SegmentListItem` entries and main area rendering the compiled manuscript body in a `<pre>` block. The package has no Markdown renderer dependency, so the MVP fallback path from reassessment is the landed implementation.
- Edit handler: navigate to `/worlds/${worldSlug}/manual-stories/${msSlug}/paste-prose?edit=${segmentId}`
- Delete handler: call ticket 011's `deleteSegment(worldSlug, msSlug, segmentId)`; if response `outcome === "segment_order_removed_files_preserved"`, surface warning + prompt for force-delete via `deleteSegment(..., { force: true })`
- Rebuild handler: call `rebuildManuscript`, then re-call `readManuscript` to refresh the body
- Word count summary: per-segment (from sidebar entries' `wordCount`) + total (sum)
- "Open in Editor" hint: render the manuscript_path as a copyable display string
- Reorder UI: hidden when `metadata.manuscript.allow_reorder === false` (MVP default per ticket 001); full reorder controls remain M6 scope.

## Files to Touch

- `tools/manual-story-studio/web/src/api/manuscript.ts` (new)
- `tools/manual-story-studio/web/src/components/SegmentListItem.tsx` (new)
- `tools/manual-story-studio/web/src/pages/Manuscript.tsx` (new)

## Out of Scope

- The manuscript HTTP routes themselves (covered by ticket 009)
- The segments DELETE route (covered by ticket 008; this ticket consumes it via ticket 011's API client)
- App.tsx route registration for `/manuscript` (covered by ticket 015)
- Reorder UI implementation (M6 deferral per SPEC-103 §2 Out of scope; this ticket honors the `allow_reorder: false` gate by hiding the UI)
- Diff view between two segments (M6 deferral)
- Export-to-other-format (PDF, EPUB) (M6 deferral)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle builds with the new page + component + API client.
2. `cd tools/manual-story-studio && npm test` — full suite green (frontend type-check exercised under `npm --prefix web test`).
3. Manual smoke check after ticket 015 lands: navigate to `/worlds/<slug>/manual-stories/<msSlug>/manuscript` after saving ≥1 segment → page renders compiled manuscript body + segment list sidebar + per-segment Edit/Delete buttons + Rebuild button + word count summary.

### Invariants

1. Reorder UI is hidden when `manuscript.allow_reorder === false` (MVP default per ticket 001); this ticket implements the gate, the M6 UI lands separately.
2. Delete button surfaces the `archive/tickets/SPEC103PROPASSEG-004.md` hybrid response: when `outcome === "segment_order_removed_files_preserved"` (referenced segment), the user is informed before any force-delete; the warning enumeration of unresolved `caused_by_segment` referrers is shown.
3. Rebuild button is idempotent (inherited from ticket 006 compiler determinism); repeated clicks produce byte-identical `manuscript.md`.

## Test Plan

### New/Modified Tests

1. None — this package currently has no React component test harness. `SegmentListItem`, `Manuscript`, and the manuscript API client are covered by TypeScript web build now and ticket 016's capstone after route registration.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (backend tests + web TypeScript check)

## Outcome

Completed 2026-05-31. Added the manuscript frontend API client, the `SegmentListItem` component, and the `Manuscript` page. The page loads manuscript data, metadata, and ordered segments; renders the compiled manuscript body, path, byte count, segment sidebar, word-count summary, Edit/Delete actions, and Rebuild button; navigates Edit to PasteProse with `?edit=SEG-<n>`; handles the segment hybrid-delete response with an explicit force-delete confirmation; and refreshes after delete/rebuild.

## Verification Result

1. `cd tools/manual-story-studio && npm --prefix web run build` — PASS; TypeScript and Vite production build completed successfully.
2. `cd tools/manual-story-studio && npm test` — PASS; backend build, 269 backend tests, and `npm --prefix web test` completed successfully.
3. Manual review — PASS; the page consumes only existing HTTP clients, does not mutate records directly, hides reorder controls when `metadata.manuscript.allow_reorder === false`, and leaves route registration/manual navigation smoke to ticket 015.

## Deviations

1. The page renders manuscript Markdown in a `<pre>` block because `tools/manual-story-studio/web/package.json` has no Markdown renderer dependency. This follows the ticket's MVP fallback and avoids adding an unrequested dependency.
2. No React component tests were added because the package currently has only a TypeScript web test command, not a component-test framework. Ticket 016 owns the end-to-end capstone coverage after App.tsx registers the route.
