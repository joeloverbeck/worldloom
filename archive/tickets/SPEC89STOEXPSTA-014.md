# SPEC89STOEXPSTA-014: Show runnable world-index remedy commands in Story Explorer

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/story-explorer` UI/read-model remedy text
**Deps**: `archive/specs/SPEC-89-story-explorer-state-xray-layer.md`; `archive/tickets/SPEC89STOEXPSTA-013.md`

## Problem

At intake, Story Explorer stale-index banners told users to run `world-index sync <world-slug>`, but a plain Worldloom checkout does not expose the bare `world-index` bin on the top-level shell `PATH`. The command exists through the package-local dependency link, so the UI now displays copy-paste runnable package-local commands for the checkout-local setup.

## Assumption Reassessment (2026-05-26)

1. Current Story Explorer remedy text is assembled in `tools/story-explorer/src/read/index-status.ts` by `missingRemedy`, `rebuildRemedy`, and `staleRemedy`; `staleRemedy` emits the bare `world-index sync <worldSlug>` form.
2. The current frontend banner renders the backend-provided `status.remedy` verbatim in `tools/story-explorer/web/src/components/IndexStatusBanner.tsx`, so the backend remedy string is the narrowest correction point.
3. The shared boundary under audit is the `IndexStatus.remedy` string in `tools/story-explorer/src/view-models/index-status.ts` and `tools/story-explorer/web/src/api/client.ts`.
4. `tools/story-explorer/package.json` depends on `@worldloom/world-index` via `file:../world-index`; npm creates `tools/story-explorer/node_modules/.bin/world-index`, so `npm exec --prefix tools/story-explorer -- world-index ...` is runnable from the repository root.
5. `tools/story-explorer/README.md` documents that the backend must not invoke `world-index build` or `world-index sync` in process; this ticket only changes displayed operator guidance and must preserve the read-only contract.
6. Pre-edit package baseline: `npm test` from `tools/story-explorer/` passed before implementation (backend `node:test` 78/78; web Vitest 76 files / 184 tests), with existing React Router future-flag warnings and the intentional ErrorBoundary test error trace.
7. Pre-existing same-seam README drift: `tools/story-explorer/README.md` was already dirty at intake with package-local stale-index guidance. This ticket may truth the same README command guidance, but the earlier browse/dev-mode README edits remain pre-existing and outside this ticket.
8. Mismatch + correction: existing UI wording assumes a globally available `world-index` bin. Correct scope is changing remedy text and tests to use the package-local command form, not adding auto-sync behavior to Story Explorer.

## Architecture Check

1. Updating the backend-generated remedy keeps all Story Explorer surfaces consistent because web routes, xray panels, and banners already consume the same `IndexStatus.remedy` field.
2. No backwards-compatibility aliasing or command shims are introduced.

## Verification Layers

1. Stale-index remedy is copy-paste runnable from the repo root -> unit test coverage for `resolveIndexStatus` or the route/view model path that exposes stale index status.
2. Frontend displays the remedy verbatim without reformatting loss -> update existing banner/xray tests that assert stale remedy text.
3. Read-only contract remains intact -> grep-proof that `tools/story-explorer/src` still does not spawn or invoke `world-index` commands.

## Landed Changes

### 1. Backend remedy text

Updated `tools/story-explorer/src/read/index-status.ts` so stale-index remedies use:

```bash
npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet
```

Missing/rebuild remedies also use the package-local `world-index build` form for consistency, without `--quiet` because `quiet` is sync-specific operator noise control.

### 2. Test expectations

Updated backend `resolveIndexStatus` expectations and web banner, xray, route, and a11y fixtures that assert displayed remedy strings.

### 3. User-facing command docs

Updated Story Explorer README and repo workflow guidance so plain-checkout users see the same package-local build/sync commands that the UI now displays.

## Files to Touch

- `tools/story-explorer/src/read/index-status.ts` (modify)
- `tools/story-explorer/test/index-status.test.ts` (modify, if this covers remedy text)
- `tools/story-explorer/web/src/components/IndexStatusBanner.test.tsx` (modify)
- `tools/story-explorer/web/src/components/IndexStatusBanner.a11y.test.tsx` (modify)
- `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` (modify)
- `tools/story-explorer/web/src/routes/*.test.tsx` (modify only where stale remedy text is asserted)
- `tools/story-explorer/README.md` (modify same-seam command guidance; file had pre-existing unrelated README edits at intake)
- `docs/WORKFLOWS.md` (modify same-seam plain-checkout command guidance; file had pre-existing same-seam edit at intake)

## Out of Scope

- Adding automatic index build/sync behavior to Story Explorer.
- Creating a top-level `world-index` shim or changing shell PATH setup.
- Changing the world-index CLI command surface.

## Acceptance Criteria

### Tests That Must Pass

1. Story Explorer stale-index surfaces display a package-local `npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet` remedy.
2. Story Explorer missing/empty/version-mismatch surfaces display a package-local `npm exec --prefix tools/story-explorer -- world-index build <world-slug>` remedy.
3. Story Explorer remains read-only and does not invoke `world-index` subprocesses.
4. Package-local Story Explorer tests pass.

### Invariants

1. `IndexStatus.remedy` remains plain display text supplied by the backend API.
2. Story Explorer reports freshness and remedies only; it does not mutate `_index/world.db`.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/test/index-status.test.ts` — asserts missing, rebuild, and stale backend remedy generation.
2. `tools/story-explorer/web/src/components/IndexStatusBanner.test.tsx` and `tools/story-explorer/web/src/components/IndexStatusBanner.a11y.test.tsx` — assert rendered degraded-index banners keep package-local remedy text visible and accessible.
3. `tools/story-explorer/web/src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx` — asserts the xray validation tab shows the same stale remedy.
4. `tools/story-explorer/web/src/routes/page-entry.test.tsx`, `tools/story-explorer/web/src/routes/page-read.test.tsx`, `tools/story-explorer/web/src/routes/stories.test.tsx`, and `tools/story-explorer/web/src/routes/worlds.test.tsx` — fixture and banner pass-through coverage for the package-local remedy strings.

### Commands

Run from `tools/story-explorer/`:

1. `npm run build`
2. `node --test dist/test/index-status.test.js dist/test/routes.test.js`
3. `npm --prefix web test -- src/components/IndexStatusBanner.test.tsx src/components/IndexStatusBanner.a11y.test.tsx src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx src/routes/page-entry.test.tsx src/routes/page-read.test.tsx src/routes/stories.test.tsx src/routes/worlds.test.tsx`
4. `npm test`

## Outcome

Completed: 2026-05-26

- Backend index-status remedies now generate package-local `npm exec --prefix tools/story-explorer -- world-index ...` commands.
- Stale sync remedies include `--quiet`; build/rebuild remedies use the package-local build command without `--quiet`.
- Story Explorer frontend fixtures and same-seam command docs now reflect the runnable checkout-local command form.
- Story Explorer still reports remedies only; no subprocess or in-process `world-index` execution was added.

## Verification Result

- `npm test` from `tools/story-explorer/` before edits — PASS (backend `node:test` 78/78; web Vitest 76 files / 184 tests), establishing a green baseline.
- `npm exec --prefix tools/story-explorer -- world-index --help` from repo root — PASS; confirmed the package-local bin resolves in a plain checkout.
- `npm exec --prefix tools/story-explorer -- world-index sync --help` from repo root — PASS; confirmed the same package-local entrypoint exposes sync help including `--quiet`.
- `npm run build` from `tools/story-explorer/` — PASS; refreshed backend and web compiled artifacts before compiled-output proof.
- `node --test dist/test/index-status.test.js` from `tools/story-explorer/` — PASS (9/9).
- `node --test dist/test/index-status.test.js dist/test/routes.test.js` from `tools/story-explorer/` — PASS (12/12).
- `npm --prefix web test -- src/components/IndexStatusBanner.test.tsx src/components/IndexStatusBanner.a11y.test.tsx src/components/xray/tabs/__tests__/ValidationIntegrityTab.test.tsx src/routes/page-entry.test.tsx src/routes/page-read.test.tsx src/routes/stories.test.tsx src/routes/worlds.test.tsx` from `tools/story-explorer/` — PASS (7 files, 34 tests). The focused web run emitted existing React Router future-flag warnings while remaining green.
- `rg -n 'spawn|execFile|exec\(|world-index (build|sync)' tools/story-explorer/src` — PASS; only regex `.exec(...)` parser calls matched, with no subprocess invocation and no source `world-index build` / `sync` command execution.
- `npm test` from `tools/story-explorer/` after edits — PASS (backend `node:test` 78/78; web Vitest 76 files / 184 tests). The suite emitted existing React Router future-flag warnings and the intentional ErrorBoundary a11y test error trace while remaining green.

## Deviations

- Scope widened within the same package/read-model seam from stale `sync` text only to all backend-generated index remedies, because missing, empty, and version-mismatch remedies had the same plain-checkout PATH problem.
- Same-seam docs were included during closeout: `tools/story-explorer/README.md` and `docs/WORKFLOWS.md` already had pre-existing command-guidance edits at intake, and this ticket added only the package-local build/sync remedy guidance needed to keep those user-facing surfaces truthful.
- Generated/ignored artifacts under `tools/story-explorer/dist/`, `tools/story-explorer/web/dist/`, `tools/story-explorer/node_modules/`, and `tools/story-explorer/web/node_modules/` were present before this run and were refreshed/read by build/test proof; they are verification artifacts, not tracked owned edits.
