# SPEC89STOEXPSTA-009: Provenance trail — N+1 SE→PG.created_at_page lookup

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `ProvenanceTrail.tsx` component that fetches the SPEC-87 provenance route and resolves the SE → PG attribution chain via per-SE record fetches
**Deps**: archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

SPEC-89 §5.2 prescribes the provenance trail inside the expanded record card: "Created by SE-N at PG-M", "Modified by SE-X (PG-Y), SE-Z (PG-W)", "Evidence records: [chips]". SPEC-87's `/provenance/:recordId` route returns `{creatingSeId, modifyingSeIds[], evidenceRecords[]}` — SE ids only, no PG attribution. The frontend must fetch each provenance SE via `/records/:recordId` to derive `SE.created_at_page` for the "at PG-M" attribution. This is an N+1 fetch pattern; per SPEC-89 §5.2 + §10's parallel-fetch budget, `modifyingSeIds` typically contains < 5 entries, keeping the N+1 footprint bounded.

## Assumption Reassessment (2026-05-26)

1. SPEC-87 `/provenance/:recordId` route exists and returns `{creatingSeId, modifyingSeIds[], evidenceRecords[]}` per `tools/story-explorer/src/read/provenance.ts:5-9` (verified during 2026-05-26 reassessment). SPEC-87 `/records/:recordId` returns parsed SE body containing `SE.created_at_page` per the SE schema at `tools/validators/src/schemas/story-event.schema.json` (verified). SPEC-89 §5.2's three lines ("Created by SE-N at PG-M", "Modified by SE-X (PG-Y)", "Evidence records") were clarified during the reassessment to explicitly note the N+1 lookup pattern.
2. SPEC-89 §5.2 (Expanded card provenance trail) and §10 (Performance — N+1 fetches use the browser parallel-fetch budget).
3. Cross-skill boundary: SPEC-87's two routes are the data sources. The provenance route returns SE ids; the record route resolves each SE's created_at_page. Both routes are GET-only per SPEC-87 §6 four-layer fence; this ticket honors that fence by issuing only GET fetches.

## Architecture Check

1. Parallel fetch of all modifyingSeIds (via `Promise.all`) keeps the N+1 wall-clock bounded at one round-trip latency rather than N — the alternative (sequential per-SE fetch) would multiply the latency. The browser's HTTP/1.1 6-per-origin parallel-fetch budget + HTTP keep-alive amortize the overhead.
2. No backwards-compatibility aliasing or shims — fetches the existing routes without a fallback to a non-existent batch endpoint (SPEC-89 §10 was clarified during reassessment to explicitly drop the batch-endpoint claim).

## Verification Layers

1. ProvenanceTrail fetches `/provenance/:recordId` on first mount → mock-fetch test asserting one fetch fires.
2. The component then fetches `/records/:recordId` for the creating SE and each modifying SE in parallel → mock-fetch test asserting N+1 fetches with `Promise.all` parallelism.
3. Renders "Created by SE-N at PG-M" + per-modifying-SE rows + evidence records → render test with a multi-SE fixture.
4. When `creatingSeId` is null (a story-bundle record created at bootstrap with no per-SE provenance), render "Bootstrap provenance" rather than fabricating an SE attribution.

## What to Change

### 1. Create `ProvenanceTrail.tsx`

Accepts `recordId: string` and `storyContext: { worldSlug, storySlug }` as props. On mount, fires `/api/worlds/:worldSlug/stories/:storySlug/provenance/:recordId`. After the response resolves, fires per-SE record fetches in parallel via `Promise.all` to resolve each SE's `created_at_page`.

Rendering:
- **Created by**: `{creatingSeId}` at `{creatingSe.created_at_page}` — both clickable per `archive/tickets/SPEC89STOEXPSTA-008.md` navigation rules.
- **Modified by**: per modifying SE: `{seId}` at `{se.created_at_page}` — comma-separated list of N entries.
- **Evidence records**: list of `evidenceRecords[]` as clickable chips.

When the creating SE response is loading, render a brief skeleton; when an individual modifying-SE fetch fails (e.g., the SE was deleted out-of-band), render `{seId} at <unknown>` with a small warning indicator rather than blocking the whole panel.

### 2. Integration with RecordCardExpanded

`<RecordCardExpanded>` (from SPEC89STOEXPSTA-002) renders `<ProvenanceTrail recordId={...} storyContext={...} />` in its provenance slot. The slot exists in -002's contract; this ticket fills it.

### 3. Add `__tests__/ProvenanceTrail.test.tsx`

Render tests covering: (a) full provenance fixture (creating SE + 3 modifying SEs + 2 evidence records); (b) bootstrap-only fixture (creatingSeId: null, modifyingSeIds: []); (c) one-modifying-SE-fetch-fails fixture (partial render with warning).

## Files to Touch

- `tools/story-explorer/web/src/components/xray/ProvenanceTrail.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/ProvenanceTrail.test.tsx` (new)

## Out of Scope

- Extending SPEC-87's provenance route to include PG attribution server-side — that's a SPEC-87 amendment, out of scope here; the N+1 approach is the chosen path per the 2026-05-26 reassessment Q decision.
- A batched `/records?ids=...` endpoint to amortize the per-SE fetches — same reason (SPEC-87 amendment, dropped at reassessment).
- The "View raw record" disclosure — SPEC89STOEXPSTA-002 owns that.
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- ProvenanceTrail.test` — full + bootstrap + partial-fail fixtures all pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Visual smoke in dev mode: expand a record with multiple modifying SEs; the provenance trail renders Created-by + Modified-by lines with PG attributions.

### Invariants

1. The provenance trail issues only GET fetches — no PUT/POST/PATCH/DELETE.
2. When an individual modifying-SE fetch fails, the panel degrades gracefully (shows the failed SE with "<unknown>" PG) rather than blocking the entire trail's render.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/ProvenanceTrail.test.tsx` — fixture-driven tests covering the three scenarios.

### Commands

1. `cd tools/story-explorer/web && npm test -- ProvenanceTrail.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
