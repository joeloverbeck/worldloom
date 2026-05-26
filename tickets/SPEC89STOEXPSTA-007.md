# SPEC89STOEXPSTA-007: Validation & Integrity tab — validation trace + hash + broken refs

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — modifies the `tabs/ValidationIntegrityTab.tsx` stub created by SPEC89STOEXPSTA-001 to render the validation trace, hash status surfaces, and broken-reference listings
**Deps**: archive/tickets/SPEC89STOEXPSTA-001.md, SPEC89STOEXPSTA-002

## Problem

SPEC-89 §4.4 defines Validation & Integrity as the X-Ray's integrity audit surface. It surfaces (1) the PG `validation_trace` (full structured trace), (2) prose receipt presence (present / missing / unreadable), (3) state-hash status (match / mismatch / not-checked), (4) plan-hash status (match / mismatch / not-checked), (5) stale/missing index state (passed through from the SPEC-87 envelope), (6) malformed YAML warnings (any record that failed to parse), (7) skipped-records log summary if available, and (8) broken references (record IDs cited by the current page's active records that resolve to missing files). This tab never auto-fixes anything — per SPEC-87 §6 four-layer read-only fence — it is the diagnostic display surface only.

## Assumption Reassessment (2026-05-26)

1. `tabs/ValidationIntegrityTab.tsx` exists as a stub after SPEC89STOEXPSTA-001 lands (intra-batch dependency). SPEC-87 `PageDetail.validationIntegrity` view-model exists per `tools/story-explorer/src/view-models/page-detail.ts` and surfaces a `ValidationIntegritySummary` (validation_trace, hash statuses, broken_refs). `_envelope.worldIndexStatus` on every SPEC-87 response per SPEC-87 §5 (`requestId`, `serverVersion`, `worldIndexStatus`).
2. SPEC-89 §4.4 (Validation & Integrity tab specification). SPEC-87 §6 Layer 2 (route registrar — no POST/PUT/PATCH/DELETE routes); this tab honors the read-only fence by never offering remediation buttons that would mutate state.
3. Cross-skill boundary: SPEC-87's `PageDetail` view-model exposes `validationIntegrity` for direct display; this tab consumes it without re-running validators client-side. Broken references are computed server-side per SPEC-87's edge walks; the X-Ray displays the result. The integrity chip in SPEC-88's `<PageHeader>` is a top-of-page summary indicator; the Validation & Integrity tab is the detailed audit surface those chip clicks navigate into.

## Architecture Check

1. Pure display surface — the tab renders `pageDetail.validationIntegrity` directly without re-running any validation client-side. SPEC-87 owns the integrity computation; SPEC-89 displays it. The alternative (client-side re-validation) would duplicate the validators' logic and risk drift.
2. No backwards-compatibility aliasing or shims — modifies the SPEC89STOEXPSTA-001 stub in place; no "graceful degradation" path that fabricates validation status when the server-side data is missing (a missing field renders an explicit "not available" message).

## Verification Layers

1. The validation_trace renders as a structured list (each entry naming the check + verdict) → render test with a fixture trace → vitest + RTL.
2. Hash status rows render the right chip per state (match / mismatch / not-checked) → snapshot test with three fixtures.
3. Broken references render as `<BrokenReferenceChip>` (from SPEC89STOEXPSTA-008 when that lands; before that, as plain text with class `broken-ref`) → fixture test with a sample broken-ref list.
4. The tab MUST NOT register any mutation route or button → grep-proof on the rendered DOM for absence of `<button onClick={...mutation}>`.

## What to Change

### 1. Modify `tabs/ValidationIntegrityTab.tsx`

Replace the placeholder with the real implementation:

- Accept `pageDetail: PageDetail` as a prop. Source data is `pageDetail.validationIntegrity` (already populated by SPEC-87's page-detail assembly).
- Render sections in order:
  - **Validation trace**: structured display of `validation_trace` entries (check name + verdict + notes).
  - **Prose receipt presence**: `present | missing | unreadable` chip.
  - **State-hash status**: `match | mismatch | not-checked` chip.
  - **Plan-hash status**: `match | mismatch | not-checked` chip.
  - **Index state**: `_envelope.worldIndexStatus.kind` chip (fresh / stale / missing / version_mismatch / empty / open_failed); when non-fresh, show the `remedy` string from SPEC-87's IndexStatus.
  - **Malformed YAML warnings**: list of record IDs that failed to parse (if any).
  - **Skipped-records log**: summary count + per-record list (if available from the envelope).
  - **Broken references**: list of cited-but-unresolved record IDs as `<BrokenReferenceChip>` (or plain text if -008 hasn't landed).

When a section's data is empty/clean, render "All checks passed" rather than omitting the section, so the audit surface always shows the full diagnostic picture.

### 2. Add `tabs/__tests__/ValidationIntegrityTab.test.tsx`

Render tests with: (a) all-clean fixture (every section shows "All checks passed"); (b) failing fixture (hash mismatch + broken refs + malformed YAML); (c) stale-index fixture (non-fresh worldIndexStatus rendering remedy string).

## Files to Touch

- `tools/story-explorer/web/src/components/xray/tabs/ValidationIntegrityTab.tsx` (modify — replace stub from SPEC89STOEXPSTA-001)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` (new)

## Out of Scope

- Re-running validators client-side (the server-side `validation_trace` is authoritative).
- Auto-remediation buttons (read-only fence per SPEC-87 §6 forbids this).
- Cross-event validation diff (Future Enhancements per spec §Out of scope).
- Linked-record navigation behavior — when SPEC89STOEXPSTA-008 lands, broken refs will route through `<BrokenReferenceChip>`; this ticket can render them as plain text in the interim.
- Accessibility verification (SPEC89STOEXPSTA-012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test -- ValidationIntegrityTab.test` — clean + failing + stale-index fixtures all pass.
2. `cd tools/story-explorer && npm run build` — build succeeds.
3. Visual smoke in dev mode: open a page with a deliberately-broken reference; the Validation & Integrity tab lists it.

### Invariants

1. The tab NEVER mounts a mutation button or POST/PUT/PATCH/DELETE request (SPEC-87 §6 four-layer read-only fence).
2. The validation_trace display is fully determined by `pageDetail.validationIntegrity`; this tab does not synthesize trace entries.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` — three-case fixture-driven render tests.

### Commands

1. `cd tools/story-explorer/web && npm test -- ValidationIntegrityTab.test` — targeted.
2. `cd tools/story-explorer && npm test` — full package suite.
3. `cd tools/story-explorer && npm run build` — chained build.
