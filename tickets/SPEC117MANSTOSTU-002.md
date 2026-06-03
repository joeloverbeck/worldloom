# SPEC117MANSTOSTU-002: Delete the checklist surface (end-to-end)

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` (removes `state-update-checklist.ts`, `StateUpdateChecklist.tsx`, `checklist_payload` from the segment-save response, the modal render in PasteProse). No impact on world canon (package is canon-fenced per SPEC-100).
**Deps**: None

## Problem

The post-segment checklist modal is backwards: it presents a category-count "Review N records" modal built on a narrow `refs.characters`-only scan, frames maintenance as compliance debt, and sits between acceptance and maintenance. SPEC-117 removes it from the default save path. This ticket deletes the checklist mechanism end-to-end so the save path no longer produces or renders it; the Post-Segment Workbench (SPEC117MANSTOSTU-003/-004) and the PasteProse routing (SPEC117MANSTOSTU-005) replace the post-save UX.

## Assumption Reassessment (2026-06-03)

1. The checklist surface spans: `src/state-update-checklist.ts` (`buildStateUpdateChecklist`, `recordReferencesAnyCast`, `StateUpdateChecklistPayload`, `CHECKLIST_DISCLAIMER`); `src/write/segments.ts` (import :20, return-type field :59, build calls :140/:145/:146 and :209/:214/:220); `src/server/routes/segments.ts` (response field :216, :271); `web/src/components/StateUpdateChecklist.tsx`; `web/src/types/manual-story.ts` (`StateUpdateChecklistEntry` :134, `StateUpdateChecklistPayload` :140-144); `web/src/api/segments.ts` (import :3, type :39); `web/src/pages/PasteProse.tsx` (import :5-6, state :25-26, set :42, render :148-153); `test/state-update-checklist.test.ts` + segment route/write tests asserting `checklist_payload`. Confirmed by grep at reassessment time.
2. Per the spec (SPEC-117 §2 item 1 + item 5 + §6 AC1/AC6), the checklist is removed from the default save path and the surface deleted; the honest one-liner + workbench replace it (later tickets).
3. **Shared boundary under audit**: the segment-save response contract (`write/segments.ts` return shape consumed by `routes/segments.ts` → `web/src/api/segments.ts` → `PasteProse.tsx`). Removing `checklist_payload` is a breaking change to that response shape, applied atomically across producer and all consumers in this ticket.
4. **FOUNDATIONS principle** (§Tooling Recommendation — least mechanism): deleting the checklist removes a compliance mechanism that added review-debt without knowing what changed — the spec's FND alignment row for the removed checklist.
5. **Removal blast radius** (was template item 7): `state-update-checklist.ts` (whole file), `StateUpdateChecklist.tsx` (whole file), `recordReferencesAnyCast`, `checklist_payload`, the `StateUpdateChecklist*` web types, and the PasteProse modal import/state/render. The PasteProse modal render is removed here (atomic with the component deletion — leaving the import would break the build); the post-save navigation to the workbench is added separately in SPEC117MANSTOSTU-005.

## Architecture Check

1. Deleting the producer (`buildStateUpdateChecklist`), the response field (`checklist_payload`), the consumer types, and the rendering component in one ticket keeps the segment-save response contract internally consistent — no path returns or expects a field another path dropped. The narrow `recordReferencesAnyCast` scan is deleted rather than reused; the broad `scanReferences` already exists for the workbench (SPEC117MANSTOSTU-003).
2. No backwards-compatibility alias/shim: the `checklist_payload` field is removed outright from the response, not deprecated-but-retained.

## Verification Layers

1. Checklist files deleted → codebase grep-proof (`state-update-checklist.ts` and `StateUpdateChecklist.tsx` absent; `git status` shows deletions).
2. `checklist_payload` removed from the segment-save response → codebase grep-proof on `src/write/segments.ts` + `src/server/routes/segments.ts` + `web/src/api/segments.ts` (zero matches).
3. No remaining import/render of `StateUpdateChecklist` → codebase grep-proof on `web/src/` (zero matches, per AC1).
4. Single-layer note N/A — this ticket spans backend write/route + web component/type/page; each is mapped above to its own grep surface.

## What to Change

### 1. Backend: delete the checklist builder + remove from segment-save

Delete `src/state-update-checklist.ts`. In `src/write/segments.ts`, remove the `state-update-checklist` import, the `checklist_payload` return-type field, the `buildStateUpdateChecklist` calls, and the `checklist_payload` from both return objects. In `src/server/routes/segments.ts`, remove `checklist_payload` from both response objects (:216, :271).

### 2. Web: delete the component + remove the response type + remove the modal render

Delete `web/src/components/StateUpdateChecklist.tsx`. Remove `StateUpdateChecklistEntry` / `StateUpdateChecklistPayload` from `web/src/types/manual-story.ts` and the `checklist_payload` type from `web/src/api/segments.ts`. In `web/src/pages/PasteProse.tsx`, remove the `StateUpdateChecklist` import, the `StateUpdateChecklistPayload` import, the `checklistPayload` state, the `setChecklistPayload(response.checklist_payload)` call, and the `{checklistPayload ? <StateUpdateChecklist …/> : null}` render block.

### 3. Tests

Delete `test/state-update-checklist.test.ts`. Update segment route/write tests that assert `checklist_payload` in the save response.

## Files to Touch

- `tools/manual-story-studio/src/state-update-checklist.ts` (delete)
- `tools/manual-story-studio/src/write/segments.ts` (modify)
- `tools/manual-story-studio/src/server/routes/segments.ts` (modify)
- `tools/manual-story-studio/web/src/components/StateUpdateChecklist.tsx` (delete)
- `tools/manual-story-studio/web/src/types/manual-story.ts` (modify)
- `tools/manual-story-studio/web/src/api/segments.ts` (modify)
- `tools/manual-story-studio/web/src/pages/PasteProse.tsx` (modify)
- `tools/manual-story-studio/test/state-update-checklist.test.ts` (delete)
- `tools/manual-story-studio/test/server/segments-routes.test.ts` / `test/write/segments.test.ts` — drop `checklist_payload` assertions (modify)

## Out of Scope

- Removing `last_reviewed_after_segment` — SPEC117MANSTOSTU-001 (note: `StateUpdateChecklist.tsx:60` writes it; deleting the component here removes that writer).
- The Post-Segment Workbench route/page — SPEC117MANSTOSTU-003 / -004.
- Adding the post-save navigation to the workbench — SPEC117MANSTOSTU-005 (this ticket only removes the modal render; PasteProse saves silently until -005 lands).

## Acceptance Criteria

### Tests That Must Pass

1. `grep -rn "StateUpdateChecklist\|checklist_payload\|state-update-checklist\|recordReferencesAnyCast" tools/manual-story-studio/src tools/manual-story-studio/web/src` returns zero matches.
2. No remaining import of `StateUpdateChecklist` in `web/src/` (AC1: removal sweep clean).
3. `cd tools/manual-story-studio && npm test` is green (segment save returns no `checklist_payload`; backend + web typecheck pass).

### Invariants

1. The segment-save response no longer carries `checklist_payload`; producer and all consumers agree on the reduced shape.
2. Accepted-prose saving still succeeds (segment written + sidecar written) without the checklist step.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/state-update-checklist.test.ts` — deleted (surface removed).
2. `tools/manual-story-studio/test/server/segments-routes.test.ts` / `test/write/segments.test.ts` — assert the save response has no `checklist_payload`.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. `npm --prefix web test` (run from `tools/manual-story-studio`; web typecheck)
