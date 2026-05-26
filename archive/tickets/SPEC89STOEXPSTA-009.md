# SPEC89STOEXPSTA-009: Provenance trail — N+1 SE→PG.created_at_page lookup

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — new `ProvenanceTrail.tsx` component that fetches the SPEC-87 provenance route, resolves the SE → PG attribution chain via per-SE record fetches, and wires provenance chips through the existing X-Ray record-link dispatcher
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

## Landed Changes

### 1. Created `ProvenanceTrail.tsx`

Accepts `recordId: string`, `storyContext: { worldSlug, storySlug }`, and an optional `onRecordLinkClick` callback. On mount, fires `/api/worlds/:worldSlug/stories/:storySlug/provenance/:recordId`. After the response resolves, it fetches the creating SE and all modifying SE records in parallel via `Promise.all` to resolve each SE's `created_at_page`.

Rendering:
- **Created by**: `{creatingSeId}` at `{creatingSe.created_at_page}` as a linked-record button per `archive/tickets/SPEC89STOEXPSTA-008.md` navigation rules.
- **Modified by**: per modifying SE: `{seId}` at `{se.created_at_page}` as linked-record buttons.
- **Evidence records**: list of `evidenceRecords[]` as linked-record buttons.

When the provenance response is loading, renders a status line. When an individual SE fetch fails, renders `{seId} at <unknown>` with a warning chip rather than blocking the whole panel.

### 2. Integrated with `RecordCardExpanded`

`<RecordCardExpanded>` (from `archive/tickets/SPEC89STOEXPSTA-002.md`) now renders `<ProvenanceTrail recordId={...} storyContext={...} />` in the expanded-card provenance section. The component mounts only after the record disclosure opens, so the provenance route and per-SE N+1 lookups are lazy relative to collapsed active-record lists.

### 3. Typed the frontend provenance API

`tools/story-explorer/web/src/api/client.ts` now mirrors the SPEC-87 provenance route response shape as `RecordProvenance` instead of returning `unknown` from `getProvenance`.

### 4. Added `__tests__/ProvenanceTrail.test.tsx`

Render tests cover: (a) full provenance fixture (creating SE + 3 modifying SEs + 2 evidence records); (b) bootstrap-only fixture (creatingSeId: null, modifyingSeIds: []); (c) one-modifying-SE-fetch-fails fixture (partial render with warning); (d) record-link callback wiring for SE/evidence chips; and (e) lazy integration with `RecordCardExpanded`.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/ProvenanceTrail.tsx` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardExpanded.tsx` (modify — lazy provenance integration and callback passthrough)
- `tools/story-explorer/web/src/api/client.ts` (modify — typed provenance response)
- `tools/story-explorer/web/src/styles/app.css` (modify — provenance chip layout)
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
3. `cd tools/story-explorer && npm test` — full backend + web package suite passes.

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

## Outcome

Completed on 2026-05-26.

- Added the expanded-card provenance trail for SPEC-89, consuming SPEC-87's read-only `/provenance/:recordId` and `/records/:recordId` routes.
- Resolved creating/modifying SE ids to `created_at_page` values through parallel per-SE record fetches, with bootstrap and partial-failure rendering.
- Wired created-by, modified-by, and evidence-record chips through the existing X-Ray linked-record navigation callback.
- Kept the provenance route lazy relative to collapsed record cards by mounting `ProvenanceTrail` only after `RecordCardExpanded` opens.

## Verification Result

1. `cd tools/story-explorer/web && npm test -- ProvenanceTrail.test RecordCard.test` — PASS after final navigation-callback wiring; 2 files / 7 tests passed.
2. `cd tools/story-explorer && npm run build` — PASS; web TypeScript compile, Vite bundle, and backend TypeScript compile succeeded.
3. `cd tools/story-explorer && npm test` — PASS; backend node tests passed 74/74 and web Vitest passed 57 files / 157 tests. The suite still emits existing React Router v7 future-flag warnings and intentional ErrorBoundary stderr; no failures.

## Deviations

- The landed file set includes `RecordCardExpanded.tsx`, `api/client.ts`, and `styles/app.css` in addition to the new component/test because the provenance component needs lazy expanded-card mounting, typed route access, and chip layout.
- The drafted dev-mode visual smoke was not claimed. The accepted proof is focused component/callback coverage, the chained build, and the full package suite.
