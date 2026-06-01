# SPEC105MANSTOSTU-011: Frontend health-banner + `useStoryHealth` hook + `api/health` wrapper + `App.tsx` per-story mount

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/web/src/components/HealthBanner.tsx`, `web/src/hooks/useStoryHealth.ts`, `web/src/api/health.ts`. Modifies `web/src/App.tsx` to mount the banner above the `<Routes>` outlet with per-story URL conditional rendering. No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-010.md

## Problem

SPEC-105 §2 item 5 specifies the frontend health-banner component: rendered persistently when status is `degraded` or `blocked`, hidden when status is `ok`, hidden entirely when not on a per-story route. The banner shows per-finding rows (severity badge, code, file path, message, repair hint), is hydrated by a `useStoryHealth(worldSlug, msSlug)` hook polling `/health` on initial page load + after any successful write, and is mounted in `App.tsx` above the `<Routes>` outlet. The frontend is what makes the integrity contract user-visible — without the banner, integrity findings are invisible until the author opens the specific page that reads the corrupt resource. The spec §9 Risks notes that SPEC-105 owns this mounting (SPEC-111 reframes ownership; per §9 Risks the actual ownership is SPEC-105 + SPEC-111 is purely additive on top).

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/web/src/components/`, `web/src/api/`, and `web/src/types/` paths exist at HEAD; `web/src/hooks/` does not exist yet and is created by this ticket. The new files (`HealthBanner.tsx`, `useStoryHealth.ts`, `api/health.ts`, `types/health.ts`) do not collide with existing siblings.
2. SPEC-105 §2 item 5 + spec §9 Risks resolve the SPEC-111 ownership overlap: SPEC-105 owns the route-aware persistent mounting; SPEC-111 reframes this as "scaffold only" but the actual ownership is established here. The mounting renders the banner above the `<Routes>` outlet conditionally on the URL matching `/worlds/:worldSlug/manual-stories/:msSlug/*`. When not on a per-story route (Worlds list, Manual Stories list, Create form), the banner is hidden entirely (no fetch, no DOM mount).
3. Cross-skill boundary: this is purely frontend; the backend contract is the `/health` route from archive/tickets/SPEC105MANSTOSTU-010.md. The hook fetches via `api/health.ts`, returns the structured report, and the banner renders findings as a persistent strip at the top of every per-story page.
4. Rule 6 retcon attribution: the migration adds a NEW component + hook + api wrapper (no existing surface is renamed/removed) AND modifies App.tsx to insert the banner mount. The existing App.tsx Banner (the `<Banner />` greeting at lines 17–27, which says "Write root: worlds/.../manual-stories/.../") is preserved; the new HealthBanner is a separate component mounted between the existing nav and the `<Routes>` outlet on per-story routes only.
5. App.tsx route-aware mounting pattern: `HealthBanner` uses React Router's `useLocation()` and parses the per-story URL prefix (`/worlds/:worldSlug/manual-stories/:msSlug/...`) before calling `useStoryHealth(worldSlug, msSlug)`. A banner mounted above `<Routes>` is inside the router but outside a route match, so `useParams()` would not receive the page route params there. When `worldSlug` or `msSlug` are absent (top-level routes like Worlds), the hook returns `null` and HealthBanner renders nothing.

## Architecture Check

1. The hook-internal conditional fetch (hook returns `null` when slugs absent; banner renders nothing) is cleaner than a wrapper component that conditionally mounts the banner — it eliminates a layer of routing logic in App.tsx and keeps the "am I on a per-story route?" question inside the banner. Because the App-level mount is outside `<Routes>`, the banner derives slugs from `useLocation()` rather than `useParams()`.
2. The fetch in `api/health.ts` uses standard fetch with the route's URL pattern from archive/tickets/SPEC105MANSTOSTU-010.md. No error swallowing — if the fetch fails (network error, 404), the hook returns a synthetic `HealthReport` with a single `info`-severity finding indicating the fetch failure. This is the frontend's mirror of the backend's fail-fast principle.
3. Polling triggers: initial page load + after any successful write. The "after any successful write" trigger is implemented via a manual `refetch()` exposed by the hook; the post-write call sites in Dashboard / MomentComposer / RecordForm / EditContract invoke `refetch()` after a successful API write returns. This is a frontend-internal coordination; the hook does not auto-poll on a timer.
4. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Banner DOM structure → React component snapshot test (or, given the `tsc --noEmit`-only web-test baseline, a static assertion that the banner's render output includes the `<aside role="alert">` element + per-finding rows when given a non-ok HealthReport).
2. Hook conditionally fetches → unit test asserting `useStoryHealth(undefined, undefined)` returns `null` and does not call fetch.
3. App.tsx mounting integrates → static type-check via `tsc --noEmit` passes; manual verification in §6 Build & test (start the dev server, open a per-story dashboard with corrupt metadata, observe the banner renders).

## Landed Changes

### 1. Created `tools/manual-story-studio/web/src/types/health.ts`

Added the local web mirror of `HealthStatus`, `HealthSeverity`, `HealthFinding`, `BlockedAction`, and `HealthReport`. This matches the existing web pattern in `web/src/types/manual-story.ts`: the frontend does not import backend Node-module source directly.

### 2. Created `tools/manual-story-studio/web/src/api/health.ts`

Added `fetchStoryHealth(worldSlug, msSlug)`, which calls `/api/worlds/:world/manual-stories/:story/health`. Non-OK HTTP responses and network failures return a degraded synthetic `HealthReport` with `code: "health-fetch-failed"` rather than silently dropping the problem.

### 3. Created `tools/manual-story-studio/web/src/hooks/useStoryHealth.ts`

Added an initial-load fetch hook plus a manual `refetch()` function. When slugs are absent, the hook returns `report: null` and performs no fetch. There is no timer or daemon-style polling.

### 4. Created `tools/manual-story-studio/web/src/components/HealthBanner.tsx`

Added the persistent banner component. It parses `worldSlug` / `msSlug` from the current URL via `useLocation()`, calls `useStoryHealth`, renders nothing for non-story routes or `status: "ok"`, and renders a `role="alert"` strip for degraded/blocked reports with finding code, path, message, and repair hint.

### 5. Modified `tools/manual-story-studio/web/src/App.tsx`

Mounted `<HealthBanner />` between the existing top navigation and `<main>`, preserving all existing routes.

### 6. Modified `tools/manual-story-studio/web/src/index.css`

Added banner styling, scoped the existing generic `[role="alert"]` rule away from `.health-banner`, and added a mobile one-column layout so long paths/messages do not collide.

### 7. Updated `specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md`

Added a dated implementation note for the landed frontend health banner slice.

## Files to Touch

- `tools/manual-story-studio/web/src/api/health.ts` (new)
- `tools/manual-story-studio/web/src/hooks/useStoryHealth.ts` (new)
- `tools/manual-story-studio/web/src/components/HealthBanner.tsx` (new)
- `tools/manual-story-studio/web/src/types/health.ts` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)
- `tools/manual-story-studio/web/src/index.css` (modify)
- `specs/SPEC-105-manual-story-studio-fail-fast-state-integrity.md` (modify — implementation note)

## Out of Scope

- The `/health` HTTP route + compute pass — archive/tickets/SPEC105MANSTOSTU-009.md + archive/tickets/SPEC105MANSTOSTU-010.md.
- Removing the existing 7 `.catch(() => {})` silent swallowers in Dashboard.tsx / MomentComposer.tsx — SPEC105MANSTOSTU-012.
- Browser-like component tests for the banner — deferred per spec §2 item 8's *"extending it to component tests is SPEC-111's concern"*; the web subpackage's `tsc --noEmit`-only baseline is preserved.
- The post-write `refetch()` integration in Dashboard / MomentComposer / RecordForm / EditContract — those changes land in SPEC105MANSTOSTU-012 (catch removal) + the existing forms' write-handler bodies; this ticket only ships the hook + API surface for refetch.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` runs (which includes web subpackage `tsc --noEmit`) and passes — the new files compile cleanly.
2. Manual verification per SPEC-105 §6 cold-start: launch dev server on a fixture world with corrupted `manual-story.yaml`, navigate to the corrupted story's dashboard, confirm the banner renders with the `metadata-yaml-parse-failed` finding.
3. `grep -nE "HealthBanner|useStoryHealth" tools/manual-story-studio/web/src/App.tsx tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/hooks/useStoryHealth.ts` returns the App import/mount plus hook usage/export sites.

### Invariants

1. The banner renders nothing when not on a per-story route (worldSlug or msSlug missing) — no DOM mount, no fetch.
2. The banner renders nothing when health status is `ok` — present in the React tree, returns `null` from render.
3. The hook's `refetch()` is the only mutation surface — there is no auto-polling timer (per SPEC-105 §3 Key decisions: on-demand, not daemon).

## Test Plan

### New/Modified Tests

1. Frontend component tests are out of scope per spec §2 item 8 web baseline; the `tsc --noEmit` check is the only automated verification at the type level.
2. `tools/manual-story-studio/web/src/types/health.ts` (new — if cross-package type import isn't supported, this is the local type duplication).

### Commands

1. `cd tools/manual-story-studio/web && tsc --noEmit` — web subpackage type check.
2. `cd tools/manual-story-studio && npm test` — full package test (includes web subpackage typecheck).
3. `grep -nE "HealthBanner|useStoryHealth" tools/manual-story-studio/web/src/App.tsx tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/hooks/useStoryHealth.ts` — static integration proof for mount + hook wiring.

## Outcome

Completed on 2026-06-01.

This ticket added the frontend health contract surface: local web health types, `/health` fetch wrapper, `useStoryHealth`, `HealthBanner`, the App-level mount, and banner CSS. A corrupt-metadata browser smoke confirmed the banner renders the backend finding from `/health`.

## Verification Result

Commands run:

1. `cd tools/manual-story-studio/web && npm test` — passed; `tsc --noEmit`.
2. `cd tools/manual-story-studio && npm test` — passed; backend reported 377 tests passing and web `tsc --noEmit` passed.
3. `grep -nE "HealthBanner|useStoryHealth" tools/manual-story-studio/web/src/App.tsx tools/manual-story-studio/web/src/components/HealthBanner.tsx tools/manual-story-studio/web/src/hooks/useStoryHealth.ts` — passed; returned App import/mount, banner hook import/use, and hook export.
4. `grep -nE "useLocation|parseStoryPath|manual-stories" tools/manual-story-studio/web/src/components/HealthBanner.tsx` — passed; confirmed App-level route parsing seam.
5. Browser smoke via backend `node dist/src/cli.js --port 5175 --repo-root /tmp/mss-health-xZuzYJ`, Vite `npm run dev -- --host 127.0.0.1`, and Playwright against `/worlds/fixture-world/manual-stories/fixture-story/dashboard` — passed; `/health` returned 200 and page text contained `Story health: blocked` plus `metadata-yaml-parse-failed`.
6. `git diff --check` — passed.

## Deviations

- The ticket draft suggested `useParams()` inside `HealthBanner`; the live App-level mount is outside matched route elements, so `HealthBanner` uses `useLocation()` and parses the route prefix instead.
- The web package does not import backend Node-module types directly. `HealthReport` is mirrored locally in `web/src/types/health.ts`, matching the existing frontend type-mirror pattern.
