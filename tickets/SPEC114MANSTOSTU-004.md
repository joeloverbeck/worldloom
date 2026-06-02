# SPEC114MANSTOSTU-004: Beat-template delete parity

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/manual-story-studio` beat-template surfaces (`web/src/pages/BeatTemplates.tsx`, `web/src/api/beat-templates.ts`, `src/server/routes/beat-templates.ts`); no impact on world canon or story-bundle pipeline (canon-fenced package).
**Deps**: archive/tickets/SPEC114MANSTOSTU-001.md, archive/tickets/SPEC114MANSTOSTU-002.md

## Problem

`deleteRecord` is the shared backend for the `beat-templates` class — `src/server/routes/beat-templates.ts:287` calls `deleteRecord(root, "beat-templates", …)` and `beat-templates` ∈ `MANUAL_RECORD_CLASSES`. So archive/tickets/SPEC114MANSTOSTU-002.md's rework changes beat-template delete behavior automatically, but the beat-template frontend still branches on the now-removed `inactive_default` outcome (`web/src/pages/BeatTemplates.tsx:306`, `web/src/api/beat-templates.ts:29`) — dead branches that would never fire and would mis-handle the new `blocked` outcome. SPEC-114 §2 item 5 requires bringing the beat-template UX into line: hard-delete-or-block with referrer cards. Because templates are referenced via segment sidecars' `selected_template` and prompt-run sidecars' `included_template_path` (not record `refs`), the referrer pass extended in archive/tickets/SPEC114MANSTOSTU-001.md is what makes block-on-referrer correct for templates.

## Assumption Reassessment (2026-06-02)

1. `web/src/api/beat-templates.ts` declares its OWN `BeatTemplateDeleteResult` type (line 28) carrying `inactive_default` (line 29) — independent of the records `DeleteResult`. `BeatTemplates.tsx` consumes it (lines 10, 21) and branches on `outcome === "inactive_default"` (line 306). The backend delete route for templates is `src/server/routes/beat-templates.ts:287` (`deleteRecord(root, "beat-templates", …)` with a `force` option). After archive/tickets/SPEC114MANSTOSTU-002.md, the shared `deleteRecord` returns `blocked` for referenced templates and appends to `repair-log.yaml` on force; after archive/tickets/SPEC114MANSTOSTU-001.md, segment `selected_template` and prompt-run `included_template_path` sidecar referrers are discoverable.
2. SPEC-114 §2 item 5 + §7 AC 7 (beat-template delete follows the same lifecycle; a template referenced by a segment sidecar's `selected_template` is blocked, not hard-deleted). The spec's §5 marks canon principles N/A (canon-fenced); the cited tooling-layer alignment is Rule 6 (per AR item 4).
3. **Cross-artifact shared boundary under audit**: `BeatTemplateDeleteResult` (`web/src/api/beat-templates.ts`) ↔ `BeatTemplates.tsx` branching ↔ the shared backend `deleteRecord` via `src/server/routes/beat-templates.ts`. The template delete route's force handling must match the records route's repair-flag confinement (archive/tickets/SPEC114MANSTOSTU-002.md §2) for parity.
4. **FOUNDATIONS Rule 6 (No Silent Retcons)** motivates this ticket: it changes the delete behavior of the landed SPEC-104 beat-template surface. Dropping `inactive_default` and adopting block-on-referrer is an attributed behavior change (this ticket + SPEC-114 §8), not a silent edit; no production consumer depends on the old `inactive_default` template outcome.

## Architecture Check

1. Mirroring the Records-page block dialog (SPEC114MANSTOSTU-003) for templates keeps one delete-lifecycle mental model across both surfaces and prevents the split-surface bug where a shared backend returns an outcome the template UI cannot handle — cleaner than carving `beat-templates` out of the shared `deleteRecord` to preserve the rejected `inactive_default` behavior (which would re-fork the lifecycle).
2. No backwards-compatibility shim: `inactive_default` is removed from `BeatTemplateDeleteResult` outright; the template route's force handling is tightened to the repair flag, not aliased.

## Verification Layers

1. Template delete with no referrers hard-deletes → web `tsc --noEmit` + the shared backend `delete-lifecycle` coverage (002) applied to class `beat-templates`.
2. Template referenced by a segment `selected_template` is blocked (not hard-deleted) → backend assertion (relies on 001's sidecar scan) exercised through the template route.
3. `BeatTemplates.tsx` no longer references `inactive_default` → grep-proof zero matches.

## What to Change

### 1. Update `BeatTemplateDeleteResult` (`web/src/api/beat-templates.ts`)

Remove `inactive_default` from the outcome union; add the `blocked` member carrying `referrers: Array<{recordClass, summary}>` mirroring the records client (SPEC114MANSTOSTU-003 §1).

### 2. Rework the template delete UX (`web/src/pages/BeatTemplates.tsx`)

Replace the `inactive_default` branch with the block-dialog + referrer-card pattern from `Records.tsx` (SPEC114MANSTOSTU-003 §2); move any force affordance behind the same warning-gated repair disclosure.

### 3. Confine force in the template route (`src/server/routes/beat-templates.ts`)

Require the explicit repair flag for force-delete (matching archive/tickets/SPEC114MANSTOSTU-002.md §2), and pass the structured `blocked` result through.

## Files to Touch

- `tools/manual-story-studio/web/src/pages/BeatTemplates.tsx` (modify)
- `tools/manual-story-studio/web/src/api/beat-templates.ts` (modify)
- `tools/manual-story-studio/src/server/routes/beat-templates.ts` (modify)

## Out of Scope

- Backend `deleteRecord` rework and `repair-log.yaml` (archive/tickets/SPEC114MANSTOSTU-002.md) and the archived referrer-scan extension (archive/tickets/SPEC114MANSTOSTU-001.md) — consumed here, not re-implemented.
- Records-page UX (SPEC114MANSTOSTU-003).
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
