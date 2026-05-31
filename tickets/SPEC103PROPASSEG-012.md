# SPEC103PROPASSEG-012: StateUpdateChecklist component (modal)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — adds `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (the post-save modal component rendering ticket 005's typed checklist payload).
**Deps**: archive/tickets/SPEC103PROPASSEG-001.md

## Problem

SPEC-103 §2 item 6 specifies the State Update Checklist UI: appears as a modal after Save Segment, lists 12 record classes the author should review (statuses, emotions, beliefs, relationships, objects, plans, clocks, secrets, questions, consequences, obligations, threads), each class has a "Review N records" button that opens the Records screen filtered to that class with the involved cast pre-filtered, plus a "Skip review" action that closes the modal. The lead text reads "Review these categories manually. Manual Story Studio has not changed any records." — the literal SPEC-required disclaimer per ticket 005's `CHECKLIST_DISCLAIMER` constant. The checklist NEVER asserts that any record changed; the LLM cannot have changed Manual Studio state by definition (per FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary).

## Assumption Reassessment (2026-05-31)

1. Existing frontend component convention (`tools/manual-story-studio/web/src/components/RecordCard.tsx`, `RecordForm.tsx`, `RefList.tsx`, `LintBadge.tsx`) uses functional React components with typed props and minimal local state. The Records screen at `tools/manual-story-studio/web/src/pages/Records.tsx` is the navigation target for the "Review N records" buttons; the navigation URL pattern is `?class=<className>&cast=<castIds-comma-separated>` (verify exact query-parameter contract at implementation time by reading the existing Records.tsx — the filter contract may already exist or may need a small extension; if extension is needed it's a sub-deliverable of this ticket since the filter is the consumer surface this component triggers).
2. SPEC-103 §2 item 6 (modal post-save + 12 review classes + per-class "Review N records" button opening Records screen filtered + Skip review action + lead disclaimer), §3 Key decisions item 4 (12-class exclusion rationale), §7 AC#6 ("State Update Checklist appears post-save, lists 12 review classes, never asserts state changed").
3. Cross-skill boundary: this component consumes ticket 005's `StateUpdateChecklistPayload` typed shape via `web/src/types/manual-story.ts` (ticket 001 web mirror — verify the checklist payload type is included in the mirror; if not, extend the mirror in this ticket as a small additive extension). The component is consumed by ticket 011's PasteProse page (rendered as a modal after save). Navigation to the Records screen targets the existing SPEC-101-landed `Records.tsx` page.

## Architecture Check

1. Pure presentational component with typed `payload: StateUpdateChecklistPayload` and `onClose: () => void` props — no local state beyond modal visibility, no API calls (the payload is pre-computed by the backend per ticket 005). Keeps the component's responsibility narrow: render the checklist + dispatch navigation on per-class button click.
2. No backwards-compatibility aliasing — net-new component.

## Verification Layers

1. Component renders all 12 entries from `payload.entries` (no entry is silently skipped) → component test (if web test framework exists)
2. Lead text is exactly `payload.disclaimer` (the literal `CHECKLIST_DISCLAIMER` from ticket 005); component does NOT override the disclaimer locally → component test
3. "Review N records" button per class navigates to Records screen with `?class=<entry.record_class>&cast=<payload.involved_cast.join(',')>` → component test (router navigation mock)
4. "Skip review" action triggers `onClose()` without navigation → component test

## What to Change

### 1. Create web/src/components/StateUpdateChecklist.tsx

In `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx`, implement:

```typescript
import { Link, useNavigate, useParams } from "react-router-dom";
import type { StateUpdateChecklistPayload } from "../types/manual-story.js";

export interface StateUpdateChecklistProps {
  payload: StateUpdateChecklistPayload;
  onClose: () => void;
}

export function StateUpdateChecklist(props: StateUpdateChecklistProps) {
  const { worldSlug, msSlug } = useParams<{ worldSlug: string; msSlug: string }>();
  const navigate = useNavigate();
  const { payload, onClose } = props;

  const handleReview = (recordClass: string) => {
    const castParam = payload.involved_cast.join(",");
    navigate(
      `/worlds/${worldSlug}/manual-stories/${msSlug}/records?class=${recordClass}&cast=${castParam}`,
    );
  };

  return (
    <div role="dialog" aria-label="state-update-checklist" className="modal">
      <h2>Review record categories after this segment</h2>
      <p>{payload.disclaimer}</p>
      <ul>
        {payload.entries.map((entry) => (
          <li key={entry.record_class}>
            <span>{entry.record_class}</span>
            <span>
              {entry.cast_referencing_count} referencing involved cast (
              {entry.total_records} total)
            </span>
            <button onClick={() => handleReview(entry.record_class)}>
              Review {entry.cast_referencing_count} records
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onClose}>Skip review</button>
    </div>
  );
}
```

### 2. Verify / extend web type mirror for StateUpdateChecklistPayload

If `web/src/types/manual-story.ts` does not yet mirror `StateUpdateChecklistPayload` + `StateUpdateChecklistEntry` (added in ticket 005 backend; should have been mirrored to web in ticket 001 if the operator caught it, but may not be), extend the mirror in this ticket as a small additive extension (parallel to the SegmentSidecar mirror added in ticket 001). The component cannot compile without the typed payload shape.

### 3. (Optional, scope-dependent) Verify Records screen filter contract

Read `tools/manual-story-studio/web/src/pages/Records.tsx` to confirm it accepts `?class=<className>&cast=<castIds>` query parameters as filter inputs. If the `cast` filter doesn't yet exist (only `class` and possibly `id` are wired per SPEC-101), this ticket's "Review N records" button must either (a) drop the `cast` query param and rely on class-only filter (degraded UX), or (b) extend Records.tsx to honor the new `cast` filter as a small sub-deliverable (preferred — confirm at implementation time and decide). The spec's §2 item 6 wording ("opens the Records screen filtered to that class with the involved cast pre-filtered") implies the cast filter is in scope; document the decision in the ticket's implementation notes.

## Files to Touch

- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (new)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify, only if `StateUpdateChecklistPayload` mirror is missing from ticket 001's modify — verify at implementation time)
- `tools/manual-story-studio/web/src/pages/Records.tsx` (modify, only if the `cast` query-parameter filter needs extension per §3 above)

## Out of Scope

- The State Update Checklist payload computation itself (covered by ticket 005)
- The save flow that produces the payload (covered by `archive/tickets/SPEC103PROPASSEG-004.md`)
- The HTTP route returning the payload (covered by ticket 008)
- The PasteProse page rendering this modal (covered by ticket 011 — imports this component)
- Persistent log of which classes the author actually reviewed (M6 deferral per SPEC-103 §2 Out of scope)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm --prefix web install --no-audit --no-fund && npm --prefix web run build` — web bundle builds with the new component
2. `cd tools/manual-story-studio && npm test` — full suite green (web component coverage exercised under `npm --prefix web test`)
3. Manual smoke check after ticket 011 + 015 land: trigger Save in PasteProse → modal renders with 12 entries + lead disclaimer + per-class buttons + Skip review button

### Invariants

1. Component renders exactly `payload.entries.length` entries (= 12 per ticket 005's `CHECKLIST_REVIEW_CLASSES.length`); no entry is hardcoded or silently skipped.
2. Lead text equals `payload.disclaimer` verbatim — component does not override or modify the disclaimer locally. The literal text is "Review these categories manually. Manual Story Studio has not changed any records." per ticket 005's `CHECKLIST_DISCLAIMER` constant and SPEC-103 §2 item 6.
3. "Review N records" button per class triggers navigation to the Records screen with `?class=<entry.record_class>&cast=<involved_cast>` query parameters; no other side effect.
4. "Skip review" triggers `onClose()` without any navigation or API call.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` — component test (if web test framework is set up per the package's existing convention) covering all four verification layers above. If no web component test framework exists, defer to ticket 016 capstone for end-to-end coverage.

### Commands

1. `cd tools/manual-story-studio && npm --prefix web run build` — web bundle build (TypeScript type-check)
2. `cd tools/manual-story-studio && npm test` — full pipeline verification (includes web build + any web component tests)
