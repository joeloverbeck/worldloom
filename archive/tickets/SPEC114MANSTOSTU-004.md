# SPEC114MANSTOSTU-004: Beat-template delete parity

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` beat-template surfaces (`web/src/pages/BeatTemplates.tsx`, `web/src/api/beat-templates.ts`, `src/server/routes/beat-templates.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: archive/tickets/SPEC114MANSTOSTU-001.md, archive/tickets/SPEC114MANSTOSTU-002.md, archive/tickets/SPEC114MANSTOSTU-003.md

## Problem

`deleteRecord` is the shared backend for the `beat-templates` class — `src/server/routes/beat-templates.ts:287` calls `deleteRecord(root, "beat-templates", …)` and `beat-templates` ∈ `MANUAL_RECORD_CLASSES`. So archive/tickets/SPEC114MANSTOSTU-002.md's rework changes beat-template delete behavior automatically, but the beat-template frontend still branches on the now-removed `inactive_default` outcome (`web/src/pages/BeatTemplates.tsx:306`, `web/src/api/beat-templates.ts:29`) — dead branches that would never fire and would mis-handle the new `blocked` outcome. SPEC-114 §2 item 5 requires bringing the beat-template UX into line: hard-delete-or-block with referrer cards. Because templates are referenced via segment sidecars' `selected_template` and prompt-run sidecars' `included_template_path` (not record `refs`), the referrer pass extended in archive/tickets/SPEC114MANSTOSTU-001.md is what makes block-on-referrer correct for templates.

## Assumption Reassessment (2026-06-02)

1. `web/src/api/beat-templates.ts` declares its OWN `BeatTemplateDeleteResult` type (line 28) carrying `inactive_default` (line 29) — independent of the records `DeleteResult`. `BeatTemplates.tsx` consumes it (lines 10, 21) and branches on `outcome === "inactive_default"` (line 306). The backend delete route for templates is `src/server/routes/beat-templates.ts:287` (`deleteRecord(root, "beat-templates", …)` with a `force` option). After archive/tickets/SPEC114MANSTOSTU-002.md, the shared `deleteRecord` returns `blocked` for referenced templates and appends to `repair-log.yaml` on force; after archive/tickets/SPEC114MANSTOSTU-001.md, segment `selected_template` and prompt-run `included_template_path` sidecar referrers are discoverable.
2. SPEC-114 §2 item 5 + §7 AC 7 (beat-template delete follows the same lifecycle; a template referenced by a segment sidecar's `selected_template` is blocked, not hard-deleted). The spec's §5 marks canon principles N/A (canon-fenced); the cited tooling-layer alignment is Rule 6 (per AR item 4).
3. **Cross-artifact shared boundary under audit**: `BeatTemplateDeleteResult` (`web/src/api/beat-templates.ts`) ↔ `BeatTemplates.tsx` branching ↔ the shared backend `deleteRecord` via `src/server/routes/beat-templates.ts`. The template delete route's force handling must match the records route's repair-flag confinement (archive/tickets/SPEC114MANSTOSTU-002.md §2) for parity.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)** motivates this ticket: it changes the delete behavior of the landed SPEC-104 beat-template surface. Dropping `inactive_default` and adopting block-on-referrer is an attributed behavior change (this ticket + SPEC-114 §8), not a silent edit; no production consumer depends on the old `inactive_default` template outcome.

## Architecture Check

1. Mirroring the Records-page block dialog (archive/tickets/SPEC114MANSTOSTU-003.md) for templates keeps one delete-lifecycle mental model across both surfaces and prevents the split-surface bug where a shared backend returns an outcome the template UI cannot handle — cleaner than carving `beat-templates` out of the shared `deleteRecord` to preserve the rejected `inactive_default` behavior (which would re-fork the lifecycle).
2. No backwards-compatibility shim: `inactive_default` is removed from `BeatTemplateDeleteResult` outright; the template route's force handling is tightened to the repair flag, not aliased.

## Verification Layers

1. Template delete with no referrers hard-deletes → web `tsc --noEmit` + the shared backend `delete-lifecycle` coverage (002) applied to class `beat-templates`.
2. Template referenced by a segment `selected_template` is blocked (not hard-deleted) → backend assertion (relies on 001's sidecar scan) exercised through the template route.
3. `BeatTemplates.tsx` no longer references `inactive_default` → grep-proof zero matches.

## Landed Changes

### 1. Updated `BeatTemplateDeleteResult` (`web/src/api/beat-templates.ts`)

Removed `inactive_default` from the outcome union and added the `blocked` member carrying `referrers: Array<{recordClass, summary}>` mirroring the records client (archive/tickets/SPEC114MANSTOSTU-003.md §1). The client force path now sends `?force=true&mode=repair`.

### 2. Reworked the template delete UX (`web/src/pages/BeatTemplates.tsx`)

Replaced the `inactive_default` branch with the block-dialog + referrer-card pattern from `Records.tsx` (archive/tickets/SPEC114MANSTOSTU-003.md §2). Referrer cards open the corresponding Records route with `class` and `id` query params. "Force delete anyway" now lives inside a collapsed repair disclosure.

### 3. Confined force in the template route (`src/server/routes/beat-templates.ts`)

The template delete route now requires the explicit repair flag for force-delete (matching archive/tickets/SPEC114MANSTOSTU-002.md §2), rejects plain `?force=true` with `405 repair-mode-required`, and passes the structured `blocked` result through.

### 4. Added route and source-level regression coverage

- `test/server/beat-templates-routes.test.ts` now asserts a template referenced by a segment sidecar's `selected_template` blocks normal delete, plain force is rejected, repair-mode force deletes, and `repair-log.yaml` records `beat-templates/mtemplate-1`.
- `test/web/beat-template-delete-ux.test.ts` now asserts the beat-template API/page no longer reference `inactive_default`, the page renders `RecordCard` referrers, and the force action is inside the blocked repair disclosure.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/web/src/api/beat-templates.ts` (modify)
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify)

## Out of Scope

- Backend `deleteRecord` rework and `repair-log.yaml` (archive/tickets/SPEC114MANSTOSTU-002.md) and the archived referrer-scan extension (archive/tickets/SPEC114MANSTOSTU-001.md) — consumed here, not re-implemented.
- Records-page UX (archive/tickets/SPEC114MANSTOSTU-003.md).
- Beat-template create/edit/list behavior — only delete is in scope.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` — web `tsc --noEmit` passes; no `inactive_default` references remain in the beat-template surfaces.
2. A `beat-templates` record referenced by a segment sidecar's `selected_template` is blocked (not hard-deleted) when deleted via the template route (backend assertion in 001/002 coverage applied to class `beat-templates`).

### Invariants

1. The beat-template delete lifecycle is identical to the records lifecycle (shared `deleteRecord`): hard-delete-or-block, no `inactive_default`.
2. Force-delete on a template is unreachable without the explicit repair flag and is recorded in `repair-log.yaml`.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/web` `tsc --noEmit` (via `npm test`) — type-level proof the `BeatTemplateDeleteResult` change is consumed coherently.
2. Backend template-referrer blocking for `beat-templates` is covered by archive/tickets/SPEC114MANSTOSTU-001.md's `test/read/referrers.test.ts` (`mtemplate-*` sidecar case) + 002's `delete-lifecycle.test.ts`; if a template-route integration assertion is added, it lives under `test/`.

### Commands

1. `cd tools/manual-story-studio && npm test`
2. `grep -rn "inactive_default" tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/web/src/api/beat-templates.ts` → expect zero matches.
3. Full `npm test` is the correct boundary — beat-template parity spans the web `tsc --noEmit` (frontend) and the shared backend lifecycle, both run by `npm test`.

## Outcome

Completed on 2026-06-02.

Beat-template deletion now follows the records lifecycle: unreferenced templates hard-delete, referenced templates return `blocked` with referrer summaries, the template UI shows referrer cards instead of archive messaging, and repair-mode force-delete is gated by `mode=repair` and persists the shared `repair-log.yaml` audit entry.

## Verification Result

- `cd tools/manual-story-studio && npm run test` — PASS: 472 backend/static tests passed, followed by web `tsc -p tsconfig.json --noEmit`.
- `rg -n "inactive_default" tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/web/src/api/beat-templates.ts` — PASS: no matches.
- `rg -n 'repair-mode-required|selected_template|Force delete anyway|<details|deleteOutcome\.outcome === "blocked"|<RecordCard' tools/manual-story-studio/src/server/routes/beat-templates.ts tools/manual-story-studio/test/server/beat-templates-routes.test.ts tools/manual-story-studio/web/src/pages/BeatTemplates.tsx tools/manual-story-studio/test/web/beat-template-delete-ux.test.ts` — PASS: route gate, selected-template route fixture, block branch, referrer-card render, collapsed repair disclosure, and force action are present.
- `git diff --check` — PASS.

## Deviations

- The template block-card UI navigates referrer cards to the Records route (`/records?class=...&id=...`) because BeatTemplates cannot locally select arbitrary referrer classes. This preserves the edit-link affordance without widening the template page into a records editor.
