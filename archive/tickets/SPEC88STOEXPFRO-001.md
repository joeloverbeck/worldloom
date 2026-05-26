# SPEC88STOEXPFRO-001: Web sub-tree scaffold + vitest config + design tokens

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — introduces `tools/story-explorer/web/` sub-package (`@worldloom/story-explorer-web`, private); no impact on landed `tools/story-explorer/` backend src/ (T003 covers the backend's package.json script chaining and static-serve registration).
**Deps**: None

## Problem

SPEC-88's frontend lives as a sub-tree at `tools/story-explorer/web/` inside the existing backend package. At intake, the scaffold still needed a complete Vite + React + TypeScript build config, a single root entry, a router shell, and the design-token CSS layer that the prose panel (T009), choice cards (T010), and chrome (T008) all consume. Vitest config also belonged here so every subsequent ticket can ship tests as it lands rather than back-filling at T012.

## Assumption Reassessment (2026-05-26)

1. Historical draft evidence said `tools/story-explorer/web/` did not exist at HEAD in the main worktree. In this worktree's intake state, `tools/story-explorer/web/` already existed as a pre-existing untracked partial scaffold. There is still no tracked name collision with landed SPEC-87 backend src/.
2. SPEC-88 §3 (post-reassessment) names the sub-tree layout: `web/{package.json (name: @worldloom/story-explorer-web, private), vite.config.ts (dev proxy to localhost:5174), tsconfig.json, index.html, src/{main.tsx, app.tsx, routes/, components/, api/, prefs/, styles/, lib/}, public/}`. SPEC-88 §3 (post-reassessment) clarifies the integration model: Vite serves the frontend in dev mode (proxying `/api/*` to the backend); the backend serves `web/dist/` in production mode (T003 wires the static-serve). This ticket lays the scaffold; T003 ties it to the backend.
3. Cross-skill boundary: the web sub-tree must NOT import from the backend's `tools/story-explorer/src/`; it consumes the backend only through HTTP (typed view-models surface in T002). The Vite config's proxy target (`localhost:5174`) is the only cross-boundary coupling at runtime.
4. Implementation intake found a pre-existing untracked partial `tools/story-explorer/web/` directory containing `package.json`, `vite.config.ts`, `tsconfig.json`, and `index.html`. Those files match this ticket's same-seam scaffold boundary and were included as pre-existing untracked same-seam state; this run added the missing `src/`, styles, test setup, package lockfile, `public/.gitkeep`, and local `.gitignore`.

## Architecture Check

1. **Vite + React + TypeScript** chosen per IMPLEMENTATION-ORDER Named Assumption B (low friction with existing TypeScript/Node tooling; mature a11y tooling via axe-core; React Flow available for SPEC-90's branch-map drawer). Substitution to another framework is a single-spec change.
2. **No backwards-compatibility aliasing/shims introduced** — greenfield sub-package; nothing to shim against.
3. **Design tokens as CSS custom properties** rather than runtime JavaScript theming. Tokens load once via `tokens.css`; component styles consume via `var(--token-name)`. Avoids runtime theme-provider context and keeps SSR/static-build options open.
4. **Vitest + React Testing Library + jsdom** for unit tests; axe-core integration added by T012. Configured here so subsequent tickets ship tests immediately rather than back-filling.

## Verification Layers

1. **Build succeeds end-to-end** → `npm install` from `web/` completes; `npm run build` emits `web/dist/index.html` + assets bundle. Verified by command in Acceptance Criteria.
2. **Vitest finds and runs a smoke test** → `web/src/main.test.ts` (a one-line `expect(true).toBe(true)`) executes via `npm test` from `web/`. Confirms vitest config is wired before any real component tests land.
3. **Design tokens load** → `web/dist/assets/*.css` contains `--color-`, `--font-`, `--space-` token declarations. Verified by grep against the bundled CSS.
4. **No imports from backend src/** → `grep -r "from.*\\.\\./\\.\\./src" web/src/` returns zero matches. Confirms the sub-tree boundary is respected (the backend has its own `tools/story-explorer/src/`; `web/src/` is independent).

## Landed Changes

### 1. Land `tools/story-explorer/web/package.json`

```json
{
  "name": "@worldloom/story-explorer-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist node_modules/.vite"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.10",
    "vitest": "^2.1.4"
  }
}
```

The landed dependency ranges use the current stable package versions resolved by `npm install`.

### 2. Land `tools/story-explorer/web/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5174',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: false,
  },
});
```

### 3. Land `tools/story-explorer/web/tsconfig.json`

Strict TypeScript config targeting ES2022, JSX preserved for Vite, `strict: true`, `noUncheckedIndexedAccess: true` (catches the `array[i]` undefined gotcha worldloom backend tsconfigs use elsewhere), module resolution `bundler`, paths-base `./src`.

### 4. Land `tools/story-explorer/web/index.html`

Minimal HTML5 shell with `<div id="root"></div>`, `<script type="module" src="/src/main.tsx"></script>`, `<title>Worldloom Story Explorer</title>`, and a viewport meta for mobile.

### 5. Land `tools/story-explorer/web/src/main.tsx`

React entry. Mounts `<App />` (router shell from §6 below) into `#root`. Imports `./styles/app.css` (which imports tokens.css + prose.css).

### 6. Land `tools/story-explorer/web/src/app.tsx`

Router shell using `react-router-dom@6` `createBrowserRouter`. Routes register placeholders (T005-T008 fill in route bodies; this ticket lands the empty shell so the routing surface exists). Routes declared (each renders a single `<p>Route: /...</p>` placeholder for now):
- `/` → World Picker (T005)
- `/worlds/:slug/stories` → Story Picker (T006)
- `/worlds/:slug/stories/:storySlug/entry` → Page Entry (T007)
- `/worlds/:slug/stories/:storySlug/pages/:pageId` → Reading Page (T008)

### 7. Land `tools/story-explorer/web/src/styles/tokens.css`

Design tokens as CSS custom properties on `:root`. Required token sets:
- `--color-*` — body text, secondary text, surface, surface-elevated, accent, error, warning, success (contrast-checked: 4.5:1 body, 3:1 large per §8 WCAG AA)
- `--font-family-prose` — literary serif (e.g., `"Source Serif Pro", Georgia, serif`)
- `--font-family-ui` — neutral sans (e.g., `"Inter", system-ui, sans-serif`)
- `--font-size-*` — scale from `--font-size-sm` (14px) through `--font-size-prose` (≥18px desktop, fluid down to 16px mobile) up to `--font-size-h1`
- `--line-height-prose` (≥1.6), `--line-height-ui` (1.4)
- `--space-*` — 4/8/12/16/24/32/48/64 spacing scale
- `--radius-*` — corner radius scale
- `--max-width-prose` — reading column width (~65ch — "roughly book-like" per source proposal §6)
- `--reduced-motion-duration` — `0ms` when `prefers-reduced-motion: reduce` (gated via CSS `@media (prefers-reduced-motion: no-preference)` blocks in app.css)

### 8. Land `tools/story-explorer/web/src/styles/app.css`

Imports tokens.css and prose.css. Global resets, body typography (uses `--font-family-ui` + `--font-size-ui`), CSS reset baseline, focus-ring discipline (visible 3px outline using `--color-accent` on `:focus-visible`).

### 9. Land `tools/story-explorer/web/src/styles/prose.css`

Literary typography for the `<ProsePanel>` (T009 wires the component). Selectors target `.prose` class: applies `--font-family-prose`, `--font-size-prose`, `--line-height-prose`, `max-width: var(--max-width-prose)`, `margin: 0 auto`. Heading scale, list spacing, code-block monospace, blockquote treatment.

### 10. Land `tools/story-explorer/web/src/test-setup.ts`

Vitest setup file. Imports `@testing-library/jest-dom` for assertion extensions (e.g., `toBeInTheDocument`). T012 will extend this with axe-core integration.

### 11. Land `tools/story-explorer/web/src/main.test.ts`

Smoke test: `it('vitest config wired', () => { expect(true).toBe(true); });`. Confirms the test runner picks up tests before any real test lands.

## Files to Touch

- `tools/story-explorer/web/package.json` (new)
- `tools/story-explorer/web/package-lock.json` (new) — created by `npm install` to pin the web sub-package dependency graph
- `tools/story-explorer/web/vite.config.ts` (new)
- `tools/story-explorer/web/tsconfig.json` (new)
- `tools/story-explorer/web/index.html` (new)
- `tools/story-explorer/web/src/main.tsx` (new)
- `tools/story-explorer/web/src/app.tsx` (new)
- `tools/story-explorer/web/src/styles/tokens.css` (new)
- `tools/story-explorer/web/src/styles/app.css` (new)
- `tools/story-explorer/web/src/styles/prose.css` (new)
- `tools/story-explorer/web/src/test-setup.ts` (new)
- `tools/story-explorer/web/src/main.test.ts` (new)
- `tools/story-explorer/web/public/.gitkeep` (new) — placeholder so the `public/` dir is tracked
- `tools/story-explorer/web/.gitignore` (new) — ignores `dist/`, `node_modules/`

## Out of Scope

- Backend integration (T003 chains `tools/story-explorer/package.json` scripts and adds static-serve middleware).
- API client (T002).
- Cross-cutting components ErrorBoundary / RouteLoading / IndexStatusBanner / disclosure primitive (T004).
- Any route bodies — routes ship as `<p>Route: /...</p>` placeholders that T005-T008 replace.
- Any actual UI components beyond the router shell — T004-T011 land components.
- axe-core integration (T012).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm install && npm run build` — succeeds; emits `web/dist/index.html` and asset bundle.
2. `cd tools/story-explorer/web && npm test` — runs vitest; smoke test in `main.test.ts` passes.
3. `cd tools/story-explorer/web && npm run dev` — starts Vite dev server on port 5173; `curl http://localhost:5173/` returns the index HTML (manual verification — not automated in test suite).

### Invariants

1. The `web/` sub-tree must not import from `tools/story-explorer/src/` (the backend). Verified by `grep -r "from.*\\.\\./\\.\\./src" tools/story-explorer/web/src/` → zero matches.
2. The Vite dev-server proxy target (`localhost:5174`) matches SPEC-87's documented backend port — drift here breaks the entire dev workflow.
3. Design tokens load via `tokens.css` and are referenced via `var(--token-name)` in component styles; no hex colors or px font sizes appear directly in component CSS.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/main.test.ts` (new) — smoke test confirming vitest config is wired; replaced by real component tests as subsequent tickets land.

### Commands

1. `cd tools/story-explorer/web && npm install && npm run build` — build verification.
2. `cd tools/story-explorer/web && npm test` — vitest run.
3. `grep -r "from.*\\.\\./\\.\\./src" tools/story-explorer/web/src/` — sub-tree boundary verification (expect zero matches).

## Verification Result

Completed on 2026-05-26.

1. `npm install` from `tools/story-explorer/web/` succeeded and created `package-lock.json`; npm reported 5 moderate audit findings, left as dependency hygiene outside this scaffold ticket.
2. `npm run build` from `tools/story-explorer/web/` passed; Vite emitted `dist/index.html`, CSS, JS, and sourcemap assets.
3. `npm test` from `tools/story-explorer/web/` passed: 1 test file, 1 test.
4. `grep -r "from.*\\.\\./\\.\\./src" tools/story-explorer/web/src/` returned no matches, proving the scaffold does not import from backend `src/`.
5. `grep -R -- "--color-\\|--font-\\|--space-" tools/story-explorer/web/dist/assets/*.css` found the bundled token declarations.
6. `npm run dev -- --host 127.0.0.1` started Vite on `http://127.0.0.1:5173/`; sandboxed `curl` could not reach the local listener, then escalated local `curl -sS http://127.0.0.1:5173/` returned the index HTML.

## Outcome

Completed on 2026-05-26.

The web sub-tree scaffold now exists under `tools/story-explorer/web/`: package manifest and lockfile, Vite config, strict TypeScript config, HTML shell, React router shell with route placeholders, design-token/prose/global CSS, vitest setup and smoke test, local ignore rules, and a tracked `public/` placeholder.

Deviations from the original plan: implementation started from a pre-existing untracked partial scaffold instead of an empty directory, and the local dev-server curl check required escalation because the sandboxed curl could not reach the local Vite listener. No backend integration, API client, route bodies, real UI components, or axe-core work was pulled forward.
