# SPEC105MANSTOSTU-011: Frontend health-banner + `useStoryHealth` hook + `api/health` wrapper + `App.tsx` per-story mount

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/manual-story-studio/web/src/components/HealthBanner.tsx`, `web/src/hooks/useStoryHealth.ts`, `web/src/api/health.ts`. Modifies `web/src/App.tsx` to mount the banner above the `<Routes>` outlet with per-story URL conditional rendering. No impact on canon-pipeline surfaces.
**Deps**: archive/tickets/SPEC105MANSTOSTU-010.md

## Problem

SPEC-105 §2 item 5 specifies the frontend health-banner component: rendered persistently when status is `degraded` or `blocked`, hidden when status is `ok`, hidden entirely when not on a per-story route. The banner shows per-finding rows (severity badge, code, file path, message, repair hint), is hydrated by a `useStoryHealth(worldSlug, msSlug)` hook polling `/health` on initial page load + after any successful write, and is mounted in `App.tsx` above the `<Routes>` outlet. The frontend is what makes the integrity contract user-visible — without the banner, integrity findings are invisible until the author opens the specific page that reads the corrupt resource. The spec §9 Risks notes that SPEC-105 owns this mounting (SPEC-111 reframes ownership; per §9 Risks the actual ownership is SPEC-105 + SPEC-111 is purely additive on top).

## Assumption Reassessment (2026-06-01)

1. The `tools/manual-story-studio/web/src/components/`, `web/src/hooks/`, and `web/src/api/` paths exist at HEAD (verified by `ls tools/manual-story-studio/web/src/` showing `App.tsx`, `api/`, `components/`, `index.css`, `main.tsx`, `pages/`, `types/`). The new files (`HealthBanner.tsx`, `useStoryHealth.ts`, `health.ts`) do not collide with existing siblings.
2. SPEC-105 §2 item 5 + spec §9 Risks resolve the SPEC-111 ownership overlap: SPEC-105 owns the route-aware persistent mounting; SPEC-111 reframes this as "scaffold only" but the actual ownership is established here. The mounting renders the banner above the `<Routes>` outlet conditionally on the URL matching `/worlds/:worldSlug/manual-stories/:msSlug/*`. When not on a per-story route (Worlds list, Manual Stories list, Create form), the banner is hidden entirely (no fetch, no DOM mount).
3. Cross-skill boundary: this is purely frontend; the backend contract is the `/health` route from archive/tickets/SPEC105MANSTOSTU-010.md. The hook fetches via `api/health.ts`, returns the structured report, and the banner renders findings as a persistent strip at the top of every per-story page.
4. Rule 6 retcon attribution: the migration adds a NEW component + hook + api wrapper (no existing surface is renamed/removed) AND modifies App.tsx to insert the banner mount. The existing App.tsx Banner (the `<Banner />` greeting at lines 17–27, which says "Write root: worlds/.../manual-stories/.../") is preserved; the new HealthBanner is a separate component mounted between the existing nav and the `<Routes>` outlet on per-story routes only.
5. App.tsx route-aware mounting pattern: use a `<RouterRouteGuard>` wrapper component (or React Router's `useLocation` hook inside HealthBanner itself) to determine the current URL. The simpler implementation: HealthBanner internally calls `useStoryHealth(worldSlug, msSlug)` where worldSlug/msSlug come from `useParams()`. When `worldSlug` or `msSlug` are absent (top-level routes like Worlds), the hook returns `null` and HealthBanner renders nothing. Mount HealthBanner unconditionally; the conditional rendering happens inside the component.

## Architecture Check

1. The hook-internal conditional fetch (hook returns `null` when slugs absent; banner renders nothing) is cleaner than a wrapper component that conditionally mounts the banner — it eliminates a layer of routing logic in App.tsx and pushes the "am I on a per-story route?" question to the closest possible site (the hook itself, which has access to `useParams()`). The banner is always in the React tree on per-story routes; whether it renders depends on the health state.
2. The fetch in `api/health.ts` uses standard fetch with the route's URL pattern from archive/tickets/SPEC105MANSTOSTU-010.md. No error swallowing — if the fetch fails (network error, 404), the hook returns a synthetic `HealthReport` with a single `info`-severity finding indicating the fetch failure. This is the frontend's mirror of the backend's fail-fast principle.
3. Polling triggers: initial page load + after any successful write. The "after any successful write" trigger is implemented via a manual `refetch()` exposed by the hook; the post-write call sites in Dashboard / MomentComposer / RecordForm / EditContract invoke `refetch()` after a successful API write returns. This is a frontend-internal coordination; the hook does not auto-poll on a timer.
4. No backwards-compatibility aliasing/shims.

## Verification Layers

1. Banner DOM structure → React component snapshot test (or, given the `tsc --noEmit`-only web-test baseline, a static assertion that the banner's render output includes the `<aside role="alert">` element + per-finding rows when given a non-ok HealthReport).
2. Hook conditionally fetches → unit test asserting `useStoryHealth(undefined, undefined)` returns `null` and does not call fetch.
3. App.tsx mounting integrates → static type-check via `tsc --noEmit` passes; manual verification in §6 Build & test (start the dev server, open a per-story dashboard with corrupt metadata, observe the banner renders).

## What to Change

### 1. Create `tools/manual-story-studio/web/src/api/health.ts`

```ts
import type { HealthReport } from "../../../src/health/types.js"; // shared between backend + frontend

export async function fetchStoryHealth(
  worldSlug: string,
  msSlug: string,
): Promise<HealthReport> {
  const response = await fetch(
    `/api/worlds/${encodeURIComponent(worldSlug)}/manual-stories/${encodeURIComponent(msSlug)}/health`,
  );
  if (!response.ok) {
    // synthesize a single-finding HealthReport for the fetch failure itself
    return {
      status: "degraded",
      findings: [{
        severity: "warn",
        code: "health-fetch-failed",
        path: response.url,
        message: `Failed to fetch health (${response.status})`,
        repair_hint: "Check backend connectivity and reload.",
      }],
      blocked_actions: [],
    };
  }
  return (await response.json()) as HealthReport;
}
```

Note: the import path `../../../src/health/types.js` assumes the web subpackage's tsconfig includes the parent src/ types as a path alias OR the types are duplicated. If the web subpackage's tsconfig doesn't currently support cross-package import, the implementation duplicates the HealthReport type locally in `web/src/types/health.ts` and points the import there. The decision lands at implementation time per the actual tsconfig setup; the spec doesn't prescribe the path-alias mechanism.

### 2. Create `tools/manual-story-studio/web/src/hooks/useStoryHealth.ts`

```ts
import { useEffect, useState, useCallback } from "react";
import { fetchStoryHealth } from "../api/health.js";
import type { HealthReport } from "../types/health.js";

export function useStoryHealth(
  worldSlug: string | undefined,
  msSlug: string | undefined,
): { report: HealthReport | null; refetch: () => void } {
  const [report, setReport] = useState<HealthReport | null>(null);

  const refetch = useCallback(() => {
    if (!worldSlug || !msSlug) {
      setReport(null);
      return;
    }
    fetchStoryHealth(worldSlug, msSlug).then(setReport);
  }, [worldSlug, msSlug]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { report, refetch };
}
```

### 3. Create `tools/manual-story-studio/web/src/components/HealthBanner.tsx`

```tsx
import { useParams } from "react-router-dom";
import { useStoryHealth } from "../hooks/useStoryHealth.js";

export function HealthBanner() {
  const { worldSlug, msSlug } = useParams<{ worldSlug?: string; msSlug?: string }>();
  const { report } = useStoryHealth(worldSlug, msSlug);

  if (!report || report.status === "ok") return null;

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="manual-studio-health-banner"
      style={{
        background: report.status === "blocked" ? "#7a1f1f" : "#5a4a1f",
        color: "white",
        padding: 12,
        marginBottom: 12,
      }}
    >
      <strong>Story health: {report.status}</strong>
      {report.blocked_actions.length > 0 ? (
        <p>Blocked operations: {report.blocked_actions.join(", ")}</p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {report.findings.map((f, i) => (
          <li key={i}>
            <span style={{ fontWeight: 600 }}>[{f.severity}]</span> <code>{f.code}</code>{" "}
            <span style={{ fontFamily: "monospace" }}>{f.path}</span>: {f.message} — <em>{f.repair_hint}</em>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

### 4. Modify `tools/manual-story-studio/web/src/App.tsx`

Insert the `<HealthBanner />` between the existing `<nav>` and `<main><Routes>...` (around line 38). The component renders `null` when not on a per-story route, so this single mount point covers all cases:

```tsx
import { HealthBanner } from "./components/HealthBanner.js";
// ...
<BrowserRouter ...>
  <Banner />
  <nav>...</nav>
  <HealthBanner />
  <main>
    <Routes>...</Routes>
  </main>
</BrowserRouter>
```

## Files to Touch

- `tools/manual-story-studio/web/src/api/health.ts` (new)
- `tools/manual-story-studio/web/src/hooks/useStoryHealth.ts` (new)
- `tools/manual-story-studio/web/src/components/HealthBanner.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (modify)

## Out of Scope

- The `/health` HTTP route + compute pass — archive/tickets/SPEC105MANSTOSTU-009.md + archive/tickets/SPEC105MANSTOSTU-010.md.
- Removing the existing 7 `.catch(() => {})` silent swallowers in Dashboard.tsx / MomentComposer.tsx — SPEC105MANSTOSTU-012.
- Browser-like component tests for the banner — deferred per spec §2 item 8's *"extending it to component tests is SPEC-111's concern"*; the web subpackage's `tsc --noEmit`-only baseline is preserved.
- The post-write `refetch()` integration in Dashboard / MomentComposer / RecordForm / EditContract — those changes land in SPEC105MANSTOSTU-012 (catch removal) + the existing forms' write-handler bodies; this ticket only ships the hook + API surface for refetch.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio && npm test` runs (which includes web subpackage `tsc --noEmit`) and passes — the new files compile cleanly.
2. Manual verification per SPEC-105 §6 cold-start: launch dev server on a fixture world with corrupted `manual-story.yaml`, navigate to the corrupted story's dashboard, confirm the banner renders with the `metadata-yaml-parse-failed` finding.
3. `grep -nE "HealthBanner|useStoryHealth" tools/manual-story-studio/web/src/App.tsx` returns the import + mount sites.

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
3. Cold-start manual verification per SPEC-105 §6 (corrupted-metadata banner render).
