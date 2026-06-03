# SPEC122MANSTOSTU-003: Cardify segment-meta cast/records (backend ID→summary enrichment) + humanize reason lines

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` backend route (payload enrichment) + web frontend (card rendering + reason phrasing). No schema/canon change.
**Deps**: archive/tickets/SPEC122MANSTOSTU-002.md

## Problem

The segment-meta "Included cast" / "Included records" lists render as raw comma-joined IDs (`PostSegmentWorkbench.tsx:334-346`, `.join(", ")`) rather than author-legible cards — inconsistent with the cardified inspector SPEC-119 shipped. Cardifying them requires data the current payload does not carry: the segment-meta included cast/records are bare ID strings (`included_record_summary` = `{ characters: string[]; records: string[] }`, `web/src/types/manual-story.ts:114-117`), with no titles. `RecordCard` itself is already imported and used in this file (the candidate rail, `:360`) — the blocker is data, not the component. The backend route must resolve those IDs to summaries (id + title + active) so the frontend has titles to render. The same enrichment supports the candidate reason lines, which currently render the raw `fields -> target_ids` form (`reasonForCandidate`, `:91-93`) and should read as human phrasing ("Linked through holder → Mira", "Referenced by included record").

## Assumption Reassessment (2026-06-03)

1. The segment-meta lists render raw IDs via `.join(", ")` at `PostSegmentWorkbench.tsx:334-346` (`included_record_summary.characters`/`.records`). `RecordCard` is imported (`:12`) and used for the candidate rail (`:360`); its props take a `ManualRecordSummary` (`web/src/components/RecordCard.tsx`). The backend route already resolves referrer titles via `readRecord` inside `buildCandidates` (`post-segment-workbench.ts:126-149`) — the same helper resolves included cast/records. `included_record_summary` carries bare IDs only (`web/src/types/manual-story.ts:114-117`). `reasonForCandidate` is at `PostSegmentWorkbench.tsx:91-93`.
2. Spec SPEC-122 §2 item 3 (cardify) + §2 item 2 (reason lines) + §3 + §4 backend enrichment bullet + §8 Risk #3 specify resolving IDs to summaries server-side (reuse `readRecord`, do not add a second resolver) and rendering `RecordCard`s; the SPEC-119 inspector cards from backend-resolved ledger records, so there is no client-side raw-ID→card resolver to reuse.
3. Cross-artifact boundary under audit: the client↔server payload contract. This ticket extends the (already-renamed by -002) payload with resolved summaries for included cast/records, then renders them in the frontend. The reason-line "→ Mira" target name also requires resolving the candidate `target_ids` to titles via the same enrichment.
4. FOUNDATIONS principle motivating this ticket: the prose/state boundary — the reason line must say what the computation actually is (link-derived: "Linked through holder"), reinforcing that the candidate set is link-derived, not prose-derived. Card legibility consistency with the SPEC-119 inspector is the secondary motivation.

## Architecture Check

1. Resolve IDs to summaries server-side (reusing the route's existing `readRecord` helper, as `buildCandidates` already does) rather than adding a second resolver on the frontend or a parallel raw-ID rendering — one resolution path, consistent with the candidate-rail data shape.
2. No backwards-compatibility shim: the raw `.join(", ")` rendering is replaced outright by `RecordCard` rendering from the enriched summaries.

## Verification Layers

1. Segment-meta cast/records render as cards, not raw IDs -> codebase grep-proof: no `.join(", ")` over raw ID arrays at the segment-meta block; `RecordCard` is rendered from resolved summaries.
2. Payload carries resolved summaries (id + title + active) for included cast/records -> backend test asserting the enriched payload field carries titles + `cd tools/manual-story-studio && npm run test:backend`.
3. Reason lines render human phrasing -> manual review + frontend test/typecheck (`reasonForCandidate` returns humanized field-name phrasing; target names resolved from the enriched summaries).

## What to Change

### 1. Backend: enrich the payload with resolved summaries

In `post-segment-workbench.ts`, resolve the segment's included cast/records (and, to support the "→ Mira" reason form, the candidates' `target_ids`) to summaries (id + title + active, at minimum) using the existing `readRecord` helper that `buildCandidates` already calls (`:126-149`). Ride the resolved summaries in the payload alongside `linked_record_candidates` (renamed in -002). Do not add a second resolver.

### 2. Frontend: cardify segment-meta + humanize reason lines

In `PostSegmentWorkbench.tsx`: replace the raw `.join(", ")` ID lists at `:334-346` with `RecordCard` rendering driven by the backend-resolved summaries (`RecordCard` already imported at `:12`). Rewrite `reasonForCandidate` (`:91-93`) to render human field-name phrasing (e.g. "holder" → "Linked through holder"; "between[0]" → "Referenced by relationship") and resolve target names from the enriched summaries (or, if a target title is unavailable, humanize the field name and keep/drop the raw target ID).

## Files to Touch

- `tools/manual-story-studio/src/server/routes/post-segment-workbench.ts` (modify)
- `tools/manual-story-studio/web/src/pages/PostSegmentWorkbench.tsx` (modify)
- `tools/manual-story-studio/test/post-segment-workbench.test.ts` (modify)

## Out of Scope

- The candidate scanning logic (`:71-82`, `:182-189`) — unchanged.
- The payload-key rename and heading reword (archive/tickets/SPEC122MANSTOSTU-002.md — this ticket depends on it).
- The R1 prose-seeding removal (archive/tickets/SPEC122MANSTOSTU-001.md).
- Introducing any second/frontend on-disk ID→card resolver.

## Acceptance Criteria

### Tests That Must Pass

1. The enriched payload carries resolved summaries (id + title + active) for included cast/records — backend test assertion.
2. Included cast/records in segment meta render as `RecordCard`s, not raw comma-joined IDs (no `.join(", ")` over raw ID arrays at the segment-meta block).
3. `cd tools/manual-story-studio && npm test` is green.

### Invariants

1. IDs are resolved to summaries in exactly one place (the backend route's `readRecord` path); no second resolver is introduced.
2. The candidate scan behavior is unchanged; only presentation + payload enrichment change.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/post-segment-workbench.test.ts` — assert the enriched payload carries resolved titles for included cast/records.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend` (payload enrichment)
2. `cd tools/manual-story-studio && npm --prefix web test` (web typecheck — card rendering + reason phrasing)
3. `cd tools/manual-story-studio && npm test` (full pipeline)
