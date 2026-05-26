# SPEC89STOEXPSTA-002: Group + record-card primitives + raw disclosure

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — new primitive components under `tools/story-explorer/web/src/components/xray/`: XRayGroup, RecordCardCompact, RecordCardExpanded, RawRecordDisclosure, plus a stub RecordCardRenderers module that SPEC89STOEXPSTA-003 fills with per-class dispatch; typed frontend API helpers and component styles were extended to support the raw-record route
**Deps**: archive/tickets/SPEC89STOEXPSTA-001.md

## Problem

SPEC-89 §3 defines an 8-group record-card taxonomy and §5 defines the compact / expanded card pattern. All four X-Ray tabs (Current State, What Changed Here, Plan & Prose, Validation & Integrity) consume the same primitives: a collapsible group header (with deterministic summary chips per §3), a compact record-card view that consumes SPEC-87's server-side-built `recordCard` view-model, an expanded record-card view with deterministic field grouping plus slots for provenance and raw disclosure, and a "View raw record" disclosure panel using SPEC-87's `/raw` endpoint per §5.2. This ticket establishes those primitives so each tab ticket (004-007) can compose them.

Per SPEC-89 §4.1 — corrected during the 2026-05-26 reassessment — the X-Ray consumes the backend's existing `recordCard` field (built server-side per SPEC-87 §8 by `tools/story-explorer/src/read/record-card.ts`) rather than re-assembling client-side. The primitives here render its fields as JSX; SPEC89STOEXPSTA-003 implements the per-class dispatch.

## Assumption Reassessment (2026-05-26)

1. SPEC-87 `tools/story-explorer/src/server/routes/records.ts:87-93` returns `{ record, recordCard }` from the `/records/:recordId` route (verified). SPEC-87 `tools/story-explorer/src/read/record-card.ts` builds the RecordCard view-model server-side per SPEC-87 §8 (verified). SPEC-87 `tools/story-explorer/src/server/routes/records.ts:104-129` exposes the `/records/:recordId/raw` route returning `{ body, sourcePath, contentHash }` (verified).
2. SPEC-89 §3 (Record group taxonomy), §5.1 (Compact card), §5.2 (Expanded card), and §14 (Frontend component layout) prescribe the primitive set. SPEC-88's `disclosure/` primitive at `tools/story-explorer/web/src/components/disclosure/` is the canonical disclosure pattern this ticket reuses.
3. Cross-skill boundary: SPEC-87's `RecordCard` interface (`tools/story-explorer/src/view-models/record-card.ts` per SPEC-87 §3) is the data contract this ticket consumes; SPEC-89 §4.1 explicitly confirms the X-Ray does not rebuild RecordCard client-side. Field semantics for compact-card rendering live in SPEC-89 §7's per-class table — SPEC89STOEXPSTA-003 implements that dispatch; this ticket creates the dispatch surface as a stub returning `record-id + class` fallback.
4. Live implementation required two same-seam additions not listed in the draft file set: `tools/story-explorer/web/src/api/client.ts` now mirrors the `{ record, recordCard }` and raw-source response shapes, and `tools/story-explorer/web/src/styles/app.css` now carries the primitive class styles. These are frontend-consumer support surfaces, not new backend behavior.

## Architecture Check

1. Server-side-built `recordCard` consumption (DRY against SPEC-87's data path) — the alternative (client-side card rebuild from `record` parsed body) would duplicate SPEC-87 §8's deterministic-summary logic and introduce drift risk; SPEC-89's §4.1 explicitly chose the reuse path.
2. No backwards-compatibility aliasing or shims — primitives are greenfield; RawRecordDisclosure consumes the existing `/raw` endpoint without any client-side fallback to the parsed `record` body.

## Verification Layers

1. `<RecordCardCompact>` renders the recordCard's compact line via the renderer dispatch → render test with a sample recordCard fixture exercising the stub fallback → vitest + RTL.
2. `<RecordCardExpanded>` reveals expanded fields on click; the disclosure follows SPEC-88's `aria-expanded` contract → keyboard-interaction test → vitest + RTL.
3. `<RawRecordDisclosure>` fetches `/raw` on first open and caches the result; the panel never makes the record editable → mock-fetch test + visual review.
4. `<XRayGroup>` collapses + expands with deterministic chips in the header (e.g., "Knowledge & Truth · 8 active · 2 hidden") → render test of the chip string composition logic.

## Landed Changes

### 1. Create `XRayGroup.tsx`

Created a collapsible group header with deterministic summary chips per §3. Header renders inside `<h3>` with a `<button>` controlling the disclosure. Chip composition is `{group name} · {count} active · {N hidden} · {M low-confidence}` with conditional hidden and low-confidence chips.

### 2. Create `RecordCardCompact.tsx`

Created the compact card surface for the recordCard's single-line summary per SPEC-89 §5.1: record ID + class chip + server-provided summary line + status/visibility/confidence/urgency chips + created-at-page chip + related-record count. Dispatches per-class rendering to `RecordCardRenderers.tsx`'s class dispatch, which remains the intended stub for SPEC89STOEXPSTA-003.

### 3. Create `RecordCardExpanded.tsx`

Created the expanded card per SPEC-89 §5.2: deterministic primary/secondary fields grouped by human labels, related-record chips, a provenance slot for SPEC89STOEXPSTA-009, and a lazy-mounted "View raw record" disclosure. Link navigation remained visual chip rendering only until `archive/tickets/SPEC89STOEXPSTA-008.md` landed active-page scroll / peek behavior.

### 4. Create `RawRecordDisclosure.tsx`

Created a disclosure panel using SPEC-88's `useDisclosure` primitive. It renders source path, content hash, and the raw markdown/YAML body inside `<pre><code>` with a language class. It includes a copy-to-clipboard button and no editable controls, preserving the read-only fence per SPEC-87 §6 Layer 2.

Fetches `/api/worlds/:slug/stories/:storySlug/records/:recordId/raw` on first open and caches the response shape `{ body, sourcePath, contentHash }`.

### 5. Create `RecordCardRenderers.tsx` (stub for SPEC89STOEXPSTA-003)

Created the stub module exporting `renderCompactLine(recordCard: RecordCard): JSX.Element`. The stub returns `{recordCard.recordId} · {recordCard.recordClass}` fallback for every class. SPEC89STOEXPSTA-003 modifies this file to implement the 22-class dispatch per SPEC-89 §7.

### 6. Add tests

- `__tests__/XRayGroup.test.tsx` covers disclosure + chip composition.
- `__tests__/RecordCard.test.tsx` covers compact + expanded rendering with a sample fixture and provenance/raw slots.
- `__tests__/RawRecordDisclosure.test.tsx` covers fetch mocking, first-open caching, and the read-only contract.

## Files to Touch

- `tools/story-explorer/web/src/components/xray/XRayGroup.tsx` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardCompact.tsx` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardExpanded.tsx` (new)
- `tools/story-explorer/web/src/components/xray/RawRecordDisclosure.tsx` (new)
- `tools/story-explorer/web/src/components/xray/RecordCardRenderers.tsx` (new — stub for SPEC89STOEXPSTA-003)
- `tools/story-explorer/web/src/api/client.ts` (modify — typed `/records/:recordId` and `/records/:recordId/raw` response helpers)
- `tools/story-explorer/web/src/styles/app.css` (modify — primitive styles)
- `tools/story-explorer/web/src/components/xray/__tests__/XRayGroup.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/RawRecordDisclosure.test.tsx` (new)
- `tools/story-explorer/web/src/components/xray/__tests__/fixtures.ts` (new)

## Out of Scope

- Per-class rendering logic for the 22 record classes (SPEC89STOEXPSTA-003).
- Tab-specific assembly of these primitives (SPEC89STOEXPSTA-004 through -007).
- Provenance trail content (SPEC89STOEXPSTA-009 fills the slot).
- Linked-record navigation behavior (`archive/tickets/SPEC89STOEXPSTA-008.md`).
- Hybrid-record body parsing (completed at `archive/tickets/SPEC89STOEXPSTA-010.md`; this expanded-card ticket rendered raw body until that parser landed).
- Accessibility tests (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/story-explorer/web test -- XRayGroup.test RecordCard.test RawRecordDisclosure.test` — all three primitive test files pass.
2. `npm --prefix tools/story-explorer run build` — chained build succeeds.
3. The compact card renders a recognizable single-line summary for the sample fixture using the stub renderer's fallback; full per-class compact-line coverage belongs to SPEC89STOEXPSTA-003.

### Invariants

1. The X-Ray never re-builds the RecordCard view-model client-side; SPEC-87's server-side `recordCard` field is the canonical input per SPEC-89 §4.1.
2. `<RawRecordDisclosure>` is read-only by construction (no `contentEditable`, no input element, no PUT/PATCH/DELETE fetch).

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/__tests__/XRayGroup.test.tsx` — disclosure ARIA + chip composition with mocked counts.
2. `tools/story-explorer/web/src/components/xray/__tests__/RecordCard.test.tsx` — compact + expanded with fixtures.
3. `tools/story-explorer/web/src/components/xray/__tests__/RawRecordDisclosure.test.tsx` — fetch mocking; assert no PUT/PATCH/DELETE.

### Commands

1. `npm --prefix tools/story-explorer/web test -- XRayGroup.test RecordCard.test RawRecordDisclosure.test` — primitive group, card, and raw-disclosure tests.
2. `npm --prefix tools/story-explorer run build` — chained frontend/backend build.
3. `npm --prefix tools/story-explorer test` — full package suite proves no regressions.

## Outcome

Completed on 2026-05-26.

- Added the X-Ray primitive layer under `tools/story-explorer/web/src/components/xray/`: `XRayGroup`, `RecordCardCompact`, `RecordCardExpanded`, `RawRecordDisclosure`, and the stub `RecordCardRenderers` dispatch module.
- Added typed frontend client mirrors for the record-detail and raw-record response shapes so the primitives consume SPEC-87's server-built `recordCard` and `/raw` route without rebuilding the view-model client-side.
- Added component styles and focused fixtures/tests for disclosure chips, compact/expanded cards, raw-source fetching, first-open caching, and read-only rendering.

## Verification Result

- `npm --prefix tools/story-explorer/web test -- XRayPanel.test` — PASS before edits; existing SPEC89STOEXPSTA-001 shell remained green.
- `npm --prefix tools/story-explorer/web test -- XRayGroup.test RecordCard.test RawRecordDisclosure.test` — PASS after fixing the raw-disclosure effect cancellation; 3 files / 4 tests passed.
- `npm --prefix tools/story-explorer run build` — PASS; web TypeScript + Vite build and backend TypeScript build succeeded.
- `npm --prefix tools/story-explorer test` — PASS; backend compiled node tests passed 13/13 and frontend Vitest passed 48 files / 109 tests. The suite emitted existing React Router v7 future-flag warnings and intentional ErrorBoundary stderr from the existing a11y test; no failures.

## Deviations

- The landed file set includes `tools/story-explorer/web/src/api/client.ts`, `tools/story-explorer/web/src/styles/app.css`, and a shared test fixture because the primitive components need typed raw-route access, local styling, and stable fixture data. These are same-seam support surfaces.
- At this ticket's closeout, `RecordCardExpanded` rendered related records as chips only. The active/peek/broken navigation behavior later landed in `archive/tickets/SPEC89STOEXPSTA-008.md`.
