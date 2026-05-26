# SPEC89STOEXPSTA-007: Validation & Integrity tab — validation trace + hash + broken refs

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — extends the Story Explorer page-detail integrity view-model and modifies the `tabs/ValidationIntegrityTab.tsx` stub created by SPEC89STOEXPSTA-001 to render the validation trace, hash status surfaces, index state, and broken-reference listings
**Deps**: archive/tickets/SPEC89STOEXPSTA-001.md, archive/tickets/SPEC89STOEXPSTA-002.md

## Problem

SPEC-89 §4.4 defines Validation & Integrity as the X-Ray's integrity audit surface. It surfaces (1) the PG `validation_trace` (full structured trace), (2) prose receipt presence (present / missing / unreadable), (3) state-hash status (match / mismatch / not-checked), (4) plan-hash status (match / mismatch / not-checked), (5) stale/missing index state (passed through from the SPEC-87 envelope), (6) malformed YAML warnings (any record that failed to parse), (7) skipped-records log summary if available, and (8) broken references (record IDs cited by the current page's active records that resolve to missing files). This tab never auto-fixes anything — per SPEC-87 §6 four-layer read-only fence — it is the diagnostic display surface only.

## Assumption Reassessment (2026-05-26)

1. `tabs/ValidationIntegrityTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency). Live SPEC-87 `PageDetail.validationIntegrity` exists per `tools/story-explorer/src/view-models/page-detail.ts`, but at intake it only exposed `validationTrace`, `receiptVerdict`, and `proseStatus`; it did not yet expose hash status rows, skipped/malformed-record summaries, or broken references. This ticket therefore owns the same-seam additive view-model extension in `tools/story-explorer/src/read/page-detail.ts`, `tools/story-explorer/src/view-models/page-detail.ts`, and the frontend mirror in `tools/story-explorer/web/src/api/client.ts`.
2. SPEC-89 §4.4 (Validation & Integrity tab specification). SPEC-87 §6 Layer 2 (route registrar — no POST/PUT/PATCH/DELETE routes); this tab honors the read-only fence by never offering remediation buttons that would mutate state.
3. Cross-skill boundary: SPEC-87's `PageDetail` view-model exposes `validationIntegrity` for direct display; this tab consumes it without re-running validators client-side. Broken references are computed server-side from active-record linked IDs during page-detail assembly; the X-Ray displays the result. The integrity chip in SPEC-88's `<PageHeader>` is a top-of-page summary indicator; the Validation & Integrity tab is the detailed audit surface those chip clicks navigate into.
4. `_envelope.worldIndexStatus` is not part of `PageDetail`; it is carried by the page-detail response envelope and is available in `routes/page-read.tsx` as `pageDetailEnvelope`. This ticket passes that value through `XRayPanel` to `ValidationIntegrityTab` rather than copying envelope state into the page-detail payload.

## Architecture Check

1. Pure display surface — the tab renders `pageDetail.validationIntegrity` plus the response envelope's `worldIndexStatus` directly without re-running any validation client-side. SPEC-87 owns the integrity computation; SPEC-89 displays it. The alternative (client-side re-validation) would duplicate the validators' logic and risk drift.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; no "graceful degradation" path that fabricates validation status when the server-side data is missing (a missing field renders an explicit "not available" message).

## Verification Layers

1. The validation_trace renders as a structured list (each entry naming the check + verdict) → render test with a fixture trace → vitest + RTL.
2. Hash status rows render the right chip per state (match / mismatch / not-checked) → snapshot test with three fixtures.
3. At this ticket's closeout, broken references rendered as plain text chips with class `record-chip--broken`; `archive/tickets/SPEC89STOEXPSTA-008.md` later replaced that interim rendering with `<BrokenReferenceChip>`.
4. The tab MUST NOT register any mutation route or button → grep-proof on the rendered DOM for absence of `<button onClick={...mutation}>`.

## Landed Changes

### 1. Extend the page-detail integrity summary

Added additive `ValidationIntegritySummary` fields for receipt presence, state-hash status, plan-hash status, malformed YAML warnings, skipped records, and broken references. `getPageDetail` now computes these fields server-side during page-detail assembly. Broken references are discovered by reading active records, extracting supported story-record ID references, and checking whether each linked story record resolves.

### 2. Pass index status to the X-Ray panel

`routes/page-read.tsx` now passes `pageDetailEnvelope.worldIndexStatus` to `<XRayPanel>`, and `XRayPanel` passes it only to `<ValidationIntegrityTab>`. The page-detail payload is not widened to duplicate envelope metadata.

### 3. Replace the Validation & Integrity tab stub

`ValidationIntegrityTab.tsx` now renders:

- validation trace rows with check, verdict, and notes
- receipt presence, receipt verdict, prose status, state-hash status, and plan-hash status chips
- response-envelope index status, including remedies and stale file lists
- malformed YAML warnings, skipped records, and broken references
- explicit "All checks passed." empty states for clean sections

No mutation controls, client-side validation reruns, or fetch calls were added.

### 4. Add focused tests

Added `ValidationIntegrityTab.test.tsx` for clean, failing, and stale-index fixtures. Extended `page-detail.test.ts` to assert additive integrity-summary fields and server-side broken-reference discovery.

## Files to Touch

- `tools/story-explorer/src/view-models/page-detail.ts` (modify — additive integrity summary fields)
- `tools/story-explorer/src/read/page-detail.ts` (modify — compute integrity summary fields and broken-reference list)
- `tools/story-explorer/test/page-detail.test.ts` (modify — backend integrity-summary coverage)
- `tools/story-explorer/web/src/api/client.ts` (modify — frontend mirror of additive integrity fields)
- `tools/story-explorer/web/src/routes/page-read.tsx` (modify — pass response-envelope index status to X-Ray)
- `tools/story-explorer/web/src/components/xray/XRayPanel.tsx` (modify — pass index status to validation tab)
- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` (new)

## Out of Scope

- Re-running validators client-side (the server-side `validation_trace` is authoritative).
- Auto-remediation buttons (read-only fence per SPEC-87 §6 forbids this).
- Cross-event validation diff (Future Enhancements per spec §Out of scope).
- Linked-record navigation behavior — `archive/tickets/SPEC89STOEXPSTA-008.md` later routed broken refs through `<BrokenReferenceChip>`; this ticket rendered them as plain text in the interim.
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- ValidationIntegrityTab.test` — clean + failing + stale-index fixtures all pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. `cd tools/story-explorer && npm test` — package suite passes.

### Invariants

1. The tab NEVER mounts a mutation button or POST/PUT/PATCH/DELETE request (SPEC-87 §6 four-layer read-only fence).
2. The validation_trace display is fully determined by `pageDetail.validationIntegrity`; this tab does not synthesize trace entries.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` — three-case fixture-driven render tests.
2. `tools/story-explorer/test/page-detail.test.ts` — extends page-detail assembly coverage for additive integrity-summary fields.

### Commands

1. `cd tools/story-explorer/web && npm test -- ValidationIntegrityTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.

## Outcome

Completed 2026-05-26.

- Replaced the Validation & Integrity placeholder with the real diagnostic display surface.
- Added server-side page-detail integrity summary fields for receipt/hash statuses, malformed/skipped active records, and broken story-record references.
- Threaded the existing page-detail response-envelope `worldIndexStatus` into the X-Ray panel for the index-state row without copying envelope state into `PageDetail`.
- Added focused frontend and backend tests for the new display and data-shape behavior.

## Verification Result

- `cd tools/story-explorer/web && npm test -- ValidationIntegrityTab.test` — PASS, 1 file / 3 tests.
- `cd tools/story-explorer && npm run build:backend && node --test dist/test/page-detail.test.js` — PASS, compiled backend page-detail test file passed.
- `cd tools/story-explorer && npm run build` — PASS, chained web/backend build succeeded.
- `cd tools/story-explorer && npm test` — PASS, backend 74/74 node tests and web 53 files / 144 tests. The web suite emitted existing React Router future-flag warnings and intentional ErrorBoundary test stderr; no failures.
- `rg -n 'POST|PUT|PATCH|DELETE|<button|onClick|fetch\(' tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` — expected no-match result, proving this tab introduced no mutation buttons, handlers, or client fetches.

## Deviations

- The original ticket assumed `PageDetail.validationIntegrity` already included hash statuses and broken references. Live reassessment showed only `validationTrace`, `receiptVerdict`, and `proseStatus`; this ticket therefore added the missing integrity fields at the page-detail view-model boundary before rendering them.
- The original ticket described `BrokenReferenceChip` as the future final rendering. `archive/tickets/SPEC89STOEXPSTA-008.md` now owns that primitive; this ticket rendered broken refs as `record-chip--broken` text chips until -008 landed.
- The original ticket listed a manual visual smoke. The accepted closeout used focused frontend/backend tests plus the full package suite instead, because the diagnostic surface is fixture-proven and no dev-server-only behavior was added.
