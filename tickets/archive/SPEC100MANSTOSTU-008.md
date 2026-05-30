# SPEC100MANSTOSTU-008: Web frontend shell — Vite + React with world picker, manual-story list, create UI, frontend banner

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — introduces `tools/manual-story-studio/web/` (Vite + React shell). No impact on existing tools; the backend (ticket 006) serves `web/dist/` when present.
**Deps**: SPEC100MANSTOSTU-001

## Problem

SPEC-100 §2 in-scope item 6 (world picker + manual story list/create UI shell) + item 7 (frontend startup banner) require a Vite + React frontend at `tools/manual-story-studio/web/` mirroring Story Explorer's frontend setup. The shell implements ONLY world enumeration (consumes `GET /api/worlds` from ticket 006), manual-story list per world (consumes `GET /api/worlds/:slug/manual-stories` from ticket 007), a "Create Manual Story" form (POSTs to `/api/worlds/:slug/manual-stories` from ticket 007), and an "Open" navigation stub. No record CRUD, no prompt generation, no prose paste — those land in SPEC-101 / SPEC-102 / SPEC-103. The frontend dashboard displays the same 5-line banner the backend logs, per SPEC-100 §2 item 7 + §8 Risks (web dev mode pairing: Vite port 5176 proxies `/api/*` to backend port 5175).

## Assumption Reassessment (2026-05-30)

1. `tools/story-explorer/web/` (confirmed at HEAD: directory contains `package.json`, `vite.config.ts`, `index.html`, `src/`, `public/`, `tsconfig.json`) is the structural template. Story Explorer's `vite.config.ts` uses port 5173 with a proxy block routing `/api/*` to localhost:5174; Manual Studio mirrors with port 5176 → localhost:5175 per SPEC-100 §8 Risks. The frontend uses Vite's React plugin (`@vitejs/plugin-react`), TypeScript, and React Router (consistent with Story Explorer's routing layout where `App.tsx` defines client-side routes for world picker → story list → story detail).
2. SPEC-100 §4 Files to touch line 76 enumerates the web files: `web/package.json`, `web/vite.config.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/pages/Worlds.tsx`, `web/src/pages/ManualStories.tsx`, `web/src/pages/CreateManualStory.tsx`. None exist at HEAD (`tools/manual-story-studio/` doesn't exist yet; created in ticket 001).
3. **Cross-skill / cross-artifact boundary**: the frontend consumes backend routes via `fetch('/api/...')` calls; the contract is the JSON shape returned by `GET /api/worlds`, `GET /api/worlds/:slug/manual-stories`, and `POST /api/worlds/:slug/manual-stories`. The shared boundary is the route contract — frontend and backend must agree on the JSON shape. The CSS / visual tokens / disclosure components from Story Explorer's `web/` MAY be **copied** (not imported) per SPEC-100 §3 Key decisions + §8 Risks; this ticket is the place where any such copies land if needed. A future shared package (`tools/worldloom-ui-shared/` or `tools/world-read/`) is explicitly out of scope per §8 Risks.

## Architecture Check

1. **Mirror Story Explorer's structure, no shared import**: per SPEC-100 §8 Risks, Manual Studio's `web/` duplicates visual tokens / disclosure components / route-error UI from Story Explorer's `web/` (where needed) rather than depending on a shared package. The MVP shell uses minimal styling; copy-as-needed is the pattern, not import-from-sibling.
2. **Dev-mode proxy lets the frontend talk to the backend on different ports**: Vite dev server on 5176 + Fastify backend on 5175 + proxy block routing `/api/*` to backend means the developer runs both with a single `npm test` chain (per ticket 001's `package.json` scripts: `npm test` runs backend tests + `npm --prefix web test`). Mirror Story Explorer's 5173/5174 split.
3. **Frontend banner in App.tsx, not in main.tsx**: the banner is a UI element (rendered in the dashboard's chrome), not a startup log. Place it in App.tsx's top-level layout so every route below it inherits the boundary statement. SPEC-100 §2 item 7 banner contents go in a `<div role="banner">` or `<aside>` element inside the layout.
4. No backwards-compatibility aliasing/shims introduced — all files are new.

## Verification Layers

1. `npm --prefix web run build` succeeds → codebase grep-proof: after the ticket lands, `cd tools/manual-story-studio && npm --prefix web run build` exits 0 and produces `web/dist/index.html`.
2. World picker calls `GET /api/worlds` and renders the response → manual review: the rendered page lists worlds from the backend.
3. Manual-story list calls `GET /api/worlds/:slug/manual-stories` and renders the response → manual review (covered by capstone 009).
4. Create Manual Story form POSTs to `/api/worlds/:slug/manual-stories` and navigates to the list view on 201 → manual review (covered by capstone 009).
5. Frontend banner contains the 5-line boundary statement → codebase grep-proof: `grep -E "Write root:|World canon: read-only|Normal story bundles: read-only|External LLM: not connected" tools/manual-story-studio/web/src/App.tsx` shows the banner content.

## What to Change

### 1. Create `tools/manual-story-studio/web/package.json`

Mirror Story Explorer's `web/package.json` shape (the frontend deps are the React + Vite stack; mirror the exact versions used by Story Explorer for consistency). Required scripts:

- `build` — `vite build`
- `test` — typecheck + smoke test (whatever Story Explorer uses)
- `dev` — `vite` (dev server)

Sample (verify against Story Explorer's actual file at implementation time):

```json
{
  "name": "@worldloom/manual-story-studio-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "react": "<version-mirror-story-explorer>",
    "react-dom": "<version-mirror-story-explorer>",
    "react-router-dom": "<version-mirror-story-explorer>"
  },
  "devDependencies": {
    "@types/react": "<version-mirror>",
    "@types/react-dom": "<version-mirror>",
    "@vitejs/plugin-react": "<version-mirror>",
    "typescript": "<version-mirror>",
    "vite": "<version-mirror>"
  }
}
```

### 2. Create `tools/manual-story-studio/web/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      "/api": "http://127.0.0.1:5175",
    },
  },
  build: {
    outDir: "dist",
  },
});
```

### 3. Create `tools/manual-story-studio/web/index.html`

Minimal HTML shell with `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`.

### 4. Create `tools/manual-story-studio/web/src/main.tsx`

```typescript
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";

const container = document.getElementById("root");
if (!container) throw new Error("root element not found");
createRoot(container).render(<React.StrictMode><App /></React.StrictMode>);
```

### 5. Create `tools/manual-story-studio/web/src/App.tsx`

Layout with banner + react-router routes:

```typescript
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Worlds from "./pages/Worlds.js";
import ManualStories from "./pages/ManualStories.js";
import CreateManualStory from "./pages/CreateManualStory.js";

function Banner() {
  return (
    <aside role="banner" className="manual-studio-banner">
      <h1>Manual Story Studio</h1>
      <p>Write root: worlds/&lt;world&gt;/manual-stories/&lt;story&gt;/</p>
      <p>World canon: read-only</p>
      <p>Normal story bundles: read-only</p>
      <p>External LLM: not connected</p>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Banner />
      <nav><Link to="/">Worlds</Link></nav>
      <Routes>
        <Route path="/" element={<Worlds />} />
        <Route path="/worlds/:worldSlug/manual-stories" element={<ManualStories />} />
        <Route path="/worlds/:worldSlug/manual-stories/new" element={<CreateManualStory />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 6. Create `tools/manual-story-studio/web/src/pages/Worlds.tsx`

Fetches `/api/worlds` on mount, displays the list with links to `/worlds/:worldSlug/manual-stories`.

### 7. Create `tools/manual-story-studio/web/src/pages/ManualStories.tsx`

Reads `worldSlug` from route params, fetches `/api/worlds/:slug/manual-stories`, displays the list + a "Create Manual Story" link to `/worlds/:worldSlug/manual-stories/new`.

### 8. Create `tools/manual-story-studio/web/src/pages/CreateManualStory.tsx`

Reads `worldSlug` from route params. Renders a form with `slug` + `title` inputs. On submit, POSTs to `/api/worlds/:slug/manual-stories` and navigates back to the list view on 201. Surfaces 400 / 403 / 409 errors inline.

### 9. Create `tools/manual-story-studio/web/tsconfig.json`

Mirror Story Explorer's `web/tsconfig.json`. Targets ESNext, JSX `react-jsx`, includes `src/**/*`.

## Files to Touch

- `tools/manual-story-studio/web/package.json` (new)
- `tools/manual-story-studio/web/vite.config.ts` (new)
- `tools/manual-story-studio/web/index.html` (new)
- `tools/manual-story-studio/web/tsconfig.json` (new)
- `tools/manual-story-studio/web/src/main.tsx` (new)
- `tools/manual-story-studio/web/src/App.tsx` (new)
- `tools/manual-story-studio/web/src/pages/Worlds.tsx` (new)
- `tools/manual-story-studio/web/src/pages/ManualStories.tsx` (new)
- `tools/manual-story-studio/web/src/pages/CreateManualStory.tsx` (new)

## Out of Scope

- Record CRUD UI (Cast & Profiles, Records, Moment Composer, Prompt Preview, Paste Prose, State Update Checklist, Manuscript, Prompt History) — SPEC-101..SPEC-104 deliverables.
- Copying Story Explorer visual tokens / disclosure components into Manual Studio's web/ — keep MVP styling minimal; copy lands when actually needed (later specs).
- Frontend test infrastructure beyond a typecheck smoke (`tsc --noEmit`) — minimal smoke is sufficient for the shell; richer testing (vitest, React Testing Library) lands when actual component logic appears.
- Story Explorer modifications — out of scope per SPEC-100 §4 No modification list.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/manual-story-studio/web && npm install --no-audit --no-fund && npm run build` — Vite build succeeds, produces `web/dist/index.html`.
2. `cd tools/manual-story-studio/web && npm test` — typecheck (`tsc -p tsconfig.json --noEmit`) succeeds.
3. `grep -E "Write root:|World canon: read-only|Normal story bundles: read-only|External LLM: not connected" tools/manual-story-studio/web/src/App.tsx | wc -l` returns 4 (banner lines).
4. `grep -E "port: 5176" tools/manual-story-studio/web/vite.config.ts && grep -E "127.0.0.1:5175" tools/manual-story-studio/web/vite.config.ts` — proxy correctly configured.

### Invariants

1. The frontend never POSTs to any path that isn't an `/api/...` path. (Architectural invariant — frontend → backend communication goes through the proxy; no direct filesystem access.)
2. The frontend's banner contents match SPEC-100 §2 item 7 verbatim. (Data-contract invariant — both backend log and frontend display the same boundary statement.)

## Test Plan

### New/Modified Tests

1. `None — frontend shell ticket; verification is build-based (`npm run build` + `npm test` typecheck) and grep-proofs. Functional end-to-end exercise lands in ticket 009 capstone.`

### Commands

1. `cd tools/manual-story-studio/web && npm install --no-audit --no-fund && npm run build` — targeted build check.
2. `cd tools/manual-story-studio && npm test` — full chain (chains `npm --prefix web test` per ticket 001's package.json).
3. Manual smoke (deferred to ticket 009 capstone): `cd tools/manual-story-studio/web && npm run dev` + backend running on port 5175 → open `http://127.0.0.1:5176`, verify world picker lists worlds, create a manual story, return to list view.
