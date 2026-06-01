# SPEC108MANSTOSTU-007: RepairSegments page + App route binding

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/web/src/pages/RepairSegments.tsx` (new repair-mode UI surface) and modifies `tools/manual-story-studio/web/src/App.tsx` (adds the `/repair` route binding to `<RepairSegments />`).
**Deps**: SPEC108MANSTOSTU-003

## Problem

SPEC-108 §2 item 6 introduces a dedicated repair-mode UI surface — a page at `/worlds/:worldSlug/manual-stories/:msSlug/repair` that lists all segments with per-row affordances calling `editSegment(..., {mode: "repair"})` ("Replace prose") and `deleteSegment(..., {mode: "repair"})` ("Discard segment"). The page carries a persistent warning banner: "Repair mode bypasses the cockpit's append-only discipline; use only for corrupted or accidentally-saved segments." A small "Repair" link from the Dashboard (ticket 006) and per-segment "Repair this segment" links from the Manuscript (ticket 005) route here.

This is the only surface from which the gated `editSegment` / `deleteSegment` routes are reachable post-SPEC-108. The page consumes ticket 003's extended API wrappers (mode + force_replace params).

## Assumption Reassessment (2026-06-01)

1. `tools/manual-story-studio/web/src/App.tsx` exists at HEAD with routes declared at lines 41-91 inside `<Routes>`. The pages directory `tools/manual-story-studio/web/src/pages/` exists; the new `RepairSegments.tsx` file slot is unused (verified via reassessment).
2. SPEC-108 §2 item 6 names the page's URL, behavior, warning banner text, and per-row affordances. SPEC-108 §4 Files to Touch lists both `web/src/pages/RepairSegments.tsx (new)` and `web/src/App.tsx (modify)`.
3. Cross-skill boundary: the page imports ticket 003's extended API wrappers `editSegment(worldSlug, msSlug, segmentId, request, { mode: "repair", force_replace: true })` and `deleteSegment(worldSlug, msSlug, segmentId, { mode: "repair", force: true })` from `../api/segments.js`. The page also imports `listSegments` (unchanged) to enumerate segments. The shared boundary is the API wrapper signatures.
4. FOUNDATIONS Rule 6 (No Silent Retcons): the repair page is the ONLY surface from which `editSegment` / `deleteSegment` can be invoked post-SPEC-108. Its persistent warning banner makes the destructive nature of repair-mode visible at every action; its URL `/repair` makes the mode change URL-visible (the user sees they have left the primary flow); the route is intentionally NOT in the top nav per ticket 006's framing.

## Architecture Check

1. The page is a single React component that fetches the segment list on mount, renders each segment as a row with a "Replace prose" button (navigates to a per-segment edit form inline in the page OR opens a textarea) and a "Discard segment" button (calls `deleteSegment` with `{mode: "repair", force: true}` after a confirmation prompt). The persistent warning banner is rendered above the segment list, styled to be visually obvious (red/orange tint, bold weight).
2. Pre-selection: when the page URL carries `?segment_id=SEG-N` (Manuscript's per-segment link does this), the corresponding segment is scrolled into view and visually highlighted on mount. When no query param is supplied (Dashboard's un-prefiltered link), the page renders all segments at default scroll.
3. The page uses confirmation prompts (`window.confirm`) before invoking destructive actions — replacing prose discards the current prose; deleting a segment is irreversible at the file level. The confirmation flows are simple and consistent with the existing Manuscript delete confirmation pattern at HEAD (pre-strip — see Manuscript.tsx:123 `window.confirm` for the precedent).
4. The `force_replace` sub-flag is exposed as a checkbox in the replace-prose form, shown only when the target segment is NOT the latest segment. When the latest-segment check passes, the checkbox is hidden (force_replace is irrelevant). When the user attempts to replace a non-latest segment without checking the box, the route returns `422` with `repair-replace-non-latest-blocked`, which the page renders as an inline error prompting the user to either pick the latest segment or check the force_replace box.
5. No backwards-compatibility shims — greenfield page.

## Verification Layers

1. New page file exists -> codebase grep-proof (`test -f tools/manual-story-studio/web/src/pages/RepairSegments.tsx`).
2. Route binding present in App.tsx -> codebase grep-proof (`grep -n "RepairSegments\|/repair" tools/manual-story-studio/web/src/App.tsx` returns ≥2 matches: import + route element).
3. Warning banner present -> codebase grep-proof (`grep -n "Repair mode bypasses\|append-only discipline" tools/manual-story-studio/web/src/pages/RepairSegments.tsx` returns ≥1 match).
4. Replace + Discard handlers wire to mode-flagged API calls -> codebase grep-proof (`grep -n "mode: \"repair\"" tools/manual-story-studio/web/src/pages/RepairSegments.tsx` returns ≥2 matches).
5. Pre-selection on `?segment_id=` -> codebase grep-proof (`grep -n "segment_id\|useSearchParams" tools/manual-story-studio/web/src/pages/RepairSegments.tsx` returns ≥1 match).
6. Frontend bundle typechecks -> `npm --prefix tools/manual-story-studio/web test` passes.

## What to Change

### 1. Create `tools/manual-story-studio/web/src/pages/RepairSegments.tsx`

The page is a single React component. Sketch (implementation may vary in styling, error-rendering, and inline-form layout — the load-bearing constraints are the warning banner text, the mode-flagged API calls, the pre-selection behavior, and the force_replace checkbox):

```tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  deleteSegment,
  editSegment,
  listSegments,
  readSegment,
  type SegmentListEntry,
} from "../api/segments.js";

const WARNING_BANNER_TEXT =
  "Repair mode bypasses the cockpit's append-only discipline; use only for corrupted or accidentally-saved segments.";

export function RepairSegments() {
  const { worldSlug, msSlug } = useParams<{ worldSlug: string; msSlug: string }>();
  const [searchParams] = useSearchParams();
  const preSelectedId = searchParams.get("segment_id");

  const [segments, setSegments] = useState<SegmentListEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeEdit, setActiveEdit] = useState<{
    segmentId: string;
    prose: string;
    forceReplace: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!worldSlug || !msSlug) return;
    listSegments(worldSlug, msSlug)
      .then(setSegments)
      .catch((e) => setError(e instanceof Error ? e.message : "segment_list_failed"));
  }, [worldSlug, msSlug]);

  const latestSegmentId = useMemo(
    () => (segments.length === 0 ? null : segments[segments.length - 1]!.id),
    [segments],
  );

  async function openReplace(segmentId: string): Promise<void> {
    if (!worldSlug || !msSlug) return;
    const segment = await readSegment(worldSlug, msSlug, segmentId);
    if (!segment) {
      setError(`Segment ${segmentId} could not be loaded.`);
      return;
    }
    setActiveEdit({
      segmentId,
      prose: segment.body,
      forceReplace: false,
    });
  }

  async function submitReplace(): Promise<void> {
    if (!worldSlug || !msSlug || !activeEdit) return;
    setBusy(true);
    setError(null);
    try {
      await editSegment(
        worldSlug,
        msSlug,
        activeEdit.segmentId,
        { prose: activeEdit.prose },
        {
          mode: "repair",
          force_replace: activeEdit.forceReplace || undefined,
        },
      );
      setActiveEdit(null);
      // refresh list
      const next = await listSegments(worldSlug, msSlug);
      setSegments(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_replace_failed");
    } finally {
      setBusy(false);
    }
  }

  async function discardSegment(segmentId: string): Promise<void> {
    if (!worldSlug || !msSlug) return;
    if (!window.confirm(`Discard segment ${segmentId}? Files will be removed.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSegment(worldSlug, msSlug, segmentId, {
        mode: "repair",
        force: true,
      });
      const next = await listSegments(worldSlug, msSlug);
      setSegments(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "segment_discard_failed");
    } finally {
      setBusy(false);
    }
  }

  if (!worldSlug || !msSlug) {
    return <p role="alert">Missing world or manual story slug.</p>;
  }

  return (
    <section aria-labelledby="repair-heading" style={{ display: "grid", gap: 16 }}>
      <header>
        <h2 id="repair-heading">Repair segments</h2>
        <p
          role="alert"
          style={{
            background: "#fbeaea",
            border: "1px solid #c33",
            color: "#900",
            padding: 12,
            fontWeight: 600,
          }}
        >
          {WARNING_BANNER_TEXT}
        </p>
      </header>

      {error ? (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      ) : null}

      <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {segments.map((segment) => {
          const isLatest = segment.id === latestSegmentId;
          const isPreSelected = segment.id === preSelectedId;
          return (
            <li
              key={segment.id}
              id={segment.id}
              style={{
                border: isPreSelected ? "2px solid #36c" : "1px solid #ccc",
                padding: 12,
              }}
            >
              <strong>{segment.title || segment.id}</strong>
              <span style={{ display: "block", color: "#666" }}>
                {segment.id} {isLatest ? "(latest)" : "(earlier — replace requires force)"}
              </span>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void openReplace(segment.id)}
                  disabled={busy}
                >
                  Replace prose
                </button>
                <button
                  type="button"
                  onClick={() => void discardSegment(segment.id)}
                  disabled={busy}
                  style={{ color: "crimson" }}
                >
                  Discard segment
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {activeEdit ? (
        <section
          aria-label="replace-prose-form"
          style={{ border: "1px solid #ccc", padding: 12 }}
        >
          <h3>Replace prose for {activeEdit.segmentId}</h3>
          <textarea
            rows={16}
            value={activeEdit.prose}
            onChange={(e) =>
              setActiveEdit({ ...activeEdit, prose: e.target.value })
            }
            style={{ width: "100%" }}
          />
          {activeEdit.segmentId !== latestSegmentId ? (
            <label style={{ display: "block", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={activeEdit.forceReplace}
                onChange={(e) =>
                  setActiveEdit({ ...activeEdit, forceReplace: e.target.checked })
                }
              />{" "}
              force_replace (this segment is not the latest)
            </label>
          ) : null}
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setActiveEdit(null)} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitReplace()}
              disabled={busy || activeEdit.prose.trim().length === 0}
            >
              {busy ? "Replacing..." : "Replace"}
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
```

### 2. Add route binding in App.tsx

In `tools/manual-story-studio/web/src/App.tsx`:

- Import the new page: `import { RepairSegments } from "./pages/RepairSegments.js";` (alongside the other page imports at lines 4-16).
- Add a `<Route>` element inside the `<Routes>` block (after the existing routes at lines 41-91):

```tsx
<Route
  path="/worlds/:worldSlug/manual-stories/:msSlug/repair"
  element={<RepairSegments />}
/>
```

## Files to Touch

- `tools/manual-story-studio/web/src/pages/RepairSegments.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- Backend route changes (ticket 002).
- Frontend API wrapper changes (ticket 003).
- Dashboard link (ticket 006).
- Manuscript Edit/Delete removal (ticket 005).
- A bulk-repair operation — each repair acts on one segment at a time.
- The state-review precondition for force_replace — deferred to SPEC-109 per the spec; this ticket's force_replace checkbox only addresses the no-later-segment precondition.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm test` (which is `tsc --noEmit`) succeeds.
2. `test -f tools/manual-story-studio/web/src/pages/RepairSegments.tsx` succeeds.
3. `grep -n "RepairSegments" tools/manual-story-studio/web/src/App.tsx` returns ≥2 matches (import + Route element).
4. `grep -n "/repair" tools/manual-story-studio/web/src/App.tsx` returns ≥1 match (the new Route path).
5. `grep -n "Repair mode bypasses" tools/manual-story-studio/web/src/pages/RepairSegments.tsx` returns 1 match (the warning banner text).

### Invariants

1. The page is the only frontend surface that invokes `editSegment` or `deleteSegment` with `mode: "repair"`. No other page passes the mode flag.
2. The warning banner is rendered on every page load, not gated on any state — the destructive nature is visible immediately.
3. The page's URL is `/worlds/:worldSlug/manual-stories/:msSlug/repair` with optional `?segment_id=SEG-N` query parameter for pre-selection.
4. `force_replace` is offered only when the active edit target is NOT the latest segment; for the latest segment, no force_replace UI is rendered.

## Test Plan

### New/Modified Tests

1. `None — frontend page introduction; automated coverage is the typecheck pass plus the grep-proofs above. Manual verification of the warning banner + repair flows + pre-selection is named in SPEC-108 §6 Build & test.`

### Commands

1. `cd tools/manual-story-studio/web && npm test` — TypeScript typecheck.
2. `cd tools/manual-story-studio && npm test` — full backend + frontend test suite (after all SPEC-108 tickets land).
