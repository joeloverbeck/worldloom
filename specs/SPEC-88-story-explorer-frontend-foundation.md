# SPEC-88 — Story Explorer Frontend Foundation & Page Reading Surface

**Status**: draft
**Depends on**: SPEC-87 (backend foundation; landed and archived at `archive/specs/SPEC-87-story-explorer-backend-foundation.md`)
**Related**: SPEC-89 (state x-ray), SPEC-90 (branch map & search), `specs/IMPLEMENTATION-ORDER.md`
**Companion triage**: `docs/triage/2026-05-25-website-proposal-triage.md`

**Implementation note (2026-05-26)**: `SPEC88STOEXPFRO-003` landed the backend integration slice: package-root build/test now chains the web bundle and backend compile, `@fastify/static` serves `web/dist/` when present, and the read-only fence permits only `GET`/`HEAD` route methods while rejecting mutation methods. Remaining §10 bullets are historical plan context until their tickets land.

**Implementation note (2026-05-26)**: `SPEC88STOEXPFRO-010` landed the under-prose choice navigation and terminal-card slice: `ChoiceCard`, `ChildOutcomeVariant`, and `TerminalCard` now render committed child-page navigation, multi-outcome variants, non-navigable CHC filtering, and the no-continuation terminal state. Remaining §6/§7 bullets are historical plan context unless they name later SPEC-89/SPEC-90 surfaces.

---

## 1. Purpose

Deliver the visible product surface of the Story Explorer: framework scaffolding, world/story/page navigation, the page-reading experience (prose panel + choice cards), and the accessibility baseline that subsequent specs build on. The frontend consumes SPEC-87's HTTP API and renders a **literary reading surface with visual-novel rhythm**, not an admin dashboard. State X-Ray detail (SPEC-89), branch map drawer, and search (SPEC-90) attach to the chrome SPEC-88 lays down.

## 2. Scope

### In scope

- React + Vite scaffolding under `tools/story-explorer/web/` (sub-tree of the backend package; served by Vite in dev mode with `/api/*` proxied to the backend, and by the backend in production mode as static assets from `web/dist/`).
- Top-level routing: `World Picker → Story Picker → Page Entry Choice → Reading Page`.
- Page chrome: cinematic-but-compact header (story title, current page ID, branch chip, turn index, parent/back, branch-map button placeholder, page-jump placeholder, integrity chip).
- Prose panel: literary typography, generous reading column, sanitized markdown rendering, optional small page-status strip.
- Missing-prose placeholder: designed polished placeholder per source proposal §5/§6 ("Rendered prose not attached yet."), with secondary link to view the page plan in the X-Ray area (SPEC-89 wires the actual scroll target).
- Choice cards under prose: surface label, player-visible intent, subtle grounded-in indicator, multi-outcome variants per choice when multiple committed child PGs match.
- Existing-child-only navigation: a CHC only appears as a navigable card when at least one committed child PG has `parent_page_id === currentPage.id` AND `input.choice_id === choice.id`. Orphaned/uncontinued CHCs are NOT shown here (SPEC-89 surfaces them in X-Ray).
- Terminal / branch-pause pages: shown when no navigable children exist. Polished card with "No committed continuation from this page." The frontend never offers a "continue story" action.
- Parent/back navigation, lightweight breadcrumb (`World / Story / Branch BR-x / PG-y`).
- Stale/missing/empty-index handling: surfaced from `_envelope.worldIndexStatus` on every response; world/story pickers render badges; story-bundle pages may render a "stale index" banner with the remedy string from SPEC-87.
- Accessibility baseline (WCAG AA): keyboard-reachable Tab order following visual flow, focus states, ARIA disclosure pattern for any collapsible region, semantic headings (`<h1>` page/story, `<h2>` prose / choices / x-ray, `<h3>` x-ray groups in SPEC-89), reduced-motion respect (`prefers-reduced-motion`), text contrast (4.5:1 normal, 3:1 large).
- Responsive layout: single-column on mobile (header → prose → choices → compact summary → x-ray groups); no horizontal scrolling except for raw YAML / code blocks.
- Client preferences in browser local storage only (last-viewed page, theme) — never written to repo files.

### Out of scope

- Record cards / record groups / x-ray tabs / deterministic summary rendering (SPEC-89).
- Branch map drawer interaction + page search (SPEC-90).
- Static export / shareable bundle (Future Enhancements).
- Reader-safe spoiler mode (Future Enhancements; explicitly out per proposal §4).
- Packaged desktop app (Future Enhancements).

## 3. Frontend package layout

The frontend lives inside the backend package as a sub-tree. The backend's `tools/story-explorer/package.json` `build` and `test` scripts (currently `tsc -p tsconfig.json` and the existing `node --test` runner per landed SPEC-87) are extended by this spec to chain the web sub-tree build/test ahead of the backend build (see §10 deliverables) so a single `npm install` followed by `npm run build` from the package root produces both halves. The web sub-tree has its own `package.json` (`@worldloom/story-explorer-web`, private) so a sub-tree-only build remains possible during development via `npm --prefix web run build`.

```
tools/story-explorer/
├── web/
│   ├── package.json                # name: @worldloom/story-explorer-web, private, side-built by backend
│   ├── vite.config.ts              # dev proxy to localhost:5174 (backend)
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app.tsx                 # router shell
│   │   ├── routes/
│   │   │   ├── worlds.tsx          # World Picker
│   │   │   ├── stories.tsx         # Story Picker
│   │   │   ├── page-entry.tsx     # PG-1 / Latest Leaf / Choose Page
│   │   │   └── page-read.tsx       # primary Reading Page
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx   # route-wrapping React error boundary; renders polished fallback on subtree throw
│   │   │   ├── RouteLoading.tsx    # Suspense fallback while PageDetail / list fetches resolve
│   │   │   ├── PageHeader.tsx
│   │   │   ├── ProsePanel.tsx
│   │   │   ├── ProseMissingPlaceholder.tsx
│   │   │   ├── ChoiceCard.tsx
│   │   │   ├── ChildOutcomeVariant.tsx
│   │   │   ├── TerminalCard.tsx
│   │   │   ├── Breadcrumb.tsx
│   │   │   ├── IntegrityChip.tsx
│   │   │   ├── IndexStatusBanner.tsx
│   │   │   ├── BranchChip.tsx
│   │   │   └── disclosure/         # accessible disclosure primitive used here + in SPEC-89/90
│   │   ├── api/
│   │   │   └── client.ts           # typed fetch client over SPEC-87 routes
│   │   ├── prefs/
│   │   │   └── local-storage.ts   # last-viewed page, theme
│   │   ├── styles/
│   │   │   ├── tokens.css          # design tokens (color, type scale, spacing)
│   │   │   ├── prose.css           # literary typography
│   │   │   └── app.css
│   │   └── lib/
│   │       ├── sanitize-markdown.ts
│   │       └── format.ts
│   └── public/
│       └── (static assets)
└── (backend src/ per SPEC-87)
```

The backend's HTTP server serves `web/dist/` at `/` in production mode. In dev mode, the Vite dev server proxies `/api/*` to the backend port.

## 4. Navigation flow

### 4.1 World Picker

Route: `/`. Lists all worlds under `worlds/`. Each card shows:

- world slug + display name
- status badge: `Indexed` / `Stale index` / `Missing index` / `Empty world` / `Error`
- story count
- click → `/worlds/:slug/stories`

The picker does NOT require an index; it falls back to filesystem enumeration.

### 4.2 Story Picker

Route: `/worlds/:slug/stories`. Lists story bundles under `worlds/<slug>/stories/`. Each card shows:

- story slug + title from `STORY_KERNEL.md` frontmatter (when readable)
- PG count, leaf-page count, rendered-prose count, latest indexed turn/page
- index freshness state
- whether `PG-1` exists (warn if not)
- click → `/worlds/:slug/stories/:storySlug/entry`

### 4.3 Page Entry

Route: `/worlds/:slug/stories/:storySlug/entry`. Per proposal §5 "Page Entry Choice", default action opens `PG-1`. Secondary options on the same screen:

- "Start at root" (PG-1)
- "Open latest leaf"
- "Choose page" (links into SPEC-90's search/jump when that lands; until then, plain input box)
- "Open last viewed" — only when `prefs/local-storage.ts` has a record for this story slug

Default click moves to `/worlds/:slug/stories/:storySlug/pages/PG-1`.

### 4.4 Reading Page

Route: `/worlds/:slug/stories/:storySlug/pages/:pageId`. Loads `GET /api/.../pages/:pageId` and renders:

1. `<PageHeader>` — story title, page ID, branch chip, turn index, parent/back, branch-map button (placeholder until SPEC-90), page-jump placeholder, integrity chip.
2. `<Breadcrumb>` — `World / Story / Branch BR-x / PG-y`, with parent page link when present.
3. `<ProsePanel>` OR `<ProseMissingPlaceholder>` based on `proseStatus`.
4. `<ChoiceCard>` list (one card per choice from `choiceNavigation` where `isNavigable === true`).
5. `<TerminalCard>` when no navigable children (per `isLeaf`/`isTerminalOrPaused` from `PageSummary`).
6. State X-Ray section (slot — SPEC-89 fills).
7. Right-rail summary on desktop (slot — SPEC-89 fills); inline summary bar above x-ray on mobile (slot — SPEC-89 fills).

Every route is wrapped in `<ErrorBoundary>` rendering a polished fallback (API failure, sub-tree throw, unexpected exception) — distinct from the §9 Empty / degraded states table, which covers backend-reported degraded states. Initial page-fetch and list-fetch latency is covered by `<RouteLoading>` (a Suspense fallback) so route transitions never render a blank screen.

## 5. Prose panel

`<ProsePanel>` receives a sanitized markdown body and renders with:

- Generous reading column (proposal §6: "roughly book-like").
- Strong typography. CSS tokens for font-family (literary serif default), font-size (≥18px on desktop, fluid down to 16px on mobile), line-height (≥1.6).
- No record panels beside it on mobile.
- No YAML or debug UI above or inside it.
- Optional page-status strip below: `PG-12 · Branch BR-3 · Turn 7` — single line, muted.
- Markdown sanitization (no embedded HTML; safe link handling — links to other PG/CHC/SE IDs are detected and routed; external links are external).

Fetch pattern: `<ProsePanel>` reads the prose body eagerly from `PageDetail.prose` when `proseStatus === 'present'` and the body is included in the initial PageDetail payload from `GET /api/.../pages/:pageId`. When the backend omits the body (large prose deferred) or when `proseStatus !== 'present'` (placeholder doesn't need the body), the panel uses the separate `GET /api/.../prose/:pageId` route per SPEC-87 §5. This composition keeps initial PageDetail responses bounded while supporting incremental render for large pages.

When `proseStatus !== 'present'`:

- `proseStatus === 'missing'` → `<ProseMissingPlaceholder>` with "Rendered prose not attached yet." and the secondary "This page's state, choices, event delta, and records are available below." subtitle (per source proposal §6 "designed placeholder, not a file-not-found dump"). Includes "View page plan in State X-Ray" anchor (target lands in SPEC-89).
- `proseStatus === 'unreadable'` → placeholder with "Prose file present but unreadable. See Validation & Integrity in State X-Ray." (target lands in SPEC-89).
- `proseStatus === 'hash_mismatch'` → placeholder with "Prose receipt indicates hash mismatch. See Validation & Integrity." (SPEC-89 surfaces detail).

The prose panel NEVER renders `pages-prose-plans/PG-<n>.md` as a substitute for missing prose. The plan only ever appears in the X-Ray Plan & Prose tab (SPEC-89).

## 6. Choice navigation

For each `ChoiceNavigation` where `isNavigable === true`:

- `<ChoiceCard>` renders surface label (primary text), player-visible intent (secondary line), pressure chips (when present), and a subtle grounded-in count.
- If `childOutcomeVariants.length === 1`: clicking the card navigates to that child PG.
- If `childOutcomeVariants.length > 1`: the card expands inline to show `<ChildOutcomeVariant>` rows beneath it. Each row shows `PG-<n> · BR-<n> · <outcomeRoute|resolutionPreview>` and is individually clickable.

CHCs with `isNavigable === false` (no committed child PG yet) are NOT shown in the choice list. They appear in SPEC-89's X-Ray as emitted-but-uncontinued, with appropriate chips.

## 7. Terminal / branch-pause handling

When `pageSummary.isLeaf === true` AND `choiceNavigation.every(c => !c.isNavigable)`:

- Render `<TerminalCard>` beneath the prose panel with copy:
  - Header: "No committed continuation from this page."
  - Body sub-line that adapts to context: "All emitted choices currently have no continued child page." OR "Branch has reached a paused state per PG metadata." OR "Terminal page per PG metadata." (SPEC-87 surfaces the discriminator on `PageSummary.isTerminalOrPaused` + reason if available.)
- Never offer a "continue story" or "generate next page" action.

## 8. Accessibility baseline (WCAG AA)

| Requirement | Implementation |
|---|---|
| Keyboard Tab order follows visual order | header → prose controls → choice cards → x-ray tabs (when SPEC-89 lands) |
| Choice cards are buttons or links with clear focus rings | `<button>` for inline expansion, `<a>` for navigation |
| Parent/back, branch-map (when SPEC-90 lands), search (SPEC-90), x-ray tabs (SPEC-89) reachable by keyboard | semantic native elements |
| Disclosure pattern for collapsible regions | `aria-expanded`, Enter/Space toggles, `aria-controls` where helpful — primitive shipped here, reused by SPEC-89/90 |
| Branch-map drawer focus trap | SPEC-90 (chrome lays the disclosure primitive here) |
| Color contrast | tokens enforce 4.5:1 body text, 3:1 large text; tested with axe-core in the package test suite (alongside React Testing Library; per §10) |
| Responsive | single-column on mobile, no two-dim scrolling for prose/cards |
| Reduced motion | all transitions gated on `prefers-reduced-motion: no-preference`; no motion-only state change signals |
| Semantic headings | one `<h1>` for story/page, `<h2>` for Prose / Choices / State X-Ray, `<h3>` for x-ray groups (SPEC-89) |
| No global single-letter shortcuts | only scoped-to-focused-widget shortcuts (if any); proposal §11 explicitly disallows globals |

## 9. Empty / degraded states

| State | Rendered |
|---|---|
| World list empty | "No worlds found in this repository." with link to docs |
| Story list empty | "No story bundles under this world." with hint about `branching-story-bootstrap` skill |
| `indexStatus.kind === 'missing'` | Banner: "Index not built. Run `world-index build <world-slug>` to enable indexed reads." World/story listings fall back to filesystem-only mode where possible. |
| `indexStatus.kind === 'stale'` | Banner with drifted file count + "Run `world-index sync <world-slug>` to refresh." Story list and page detail continue to function in degraded direct-read mode where SPEC-87 enables it. |
| `indexStatus.kind === 'empty'` | Banner: "Index built but contains no records." |
| `indexStatus.kind === 'version_mismatch'` | Banner with expected/found versions + "Run `world-index build <world-slug>` to rebuild." Read attempts are blocked. |
| `indexStatus.kind === 'open_failed'` | Polished error banner: "Index could not be opened." showing the backend's `error` string (from the `IndexStatus.open_failed` variant per SPEC-87 §4); world/story listings degrade to filesystem-only mode where possible. |
| Page not found (404) | Polished 404 with link to story root |
| Backend unreachable | Polished error with retry button |

## 10. Build & test

- `npm --prefix web run build` (from the `tools/story-explorer/` package root) builds the frontend bundle into `web/dist/`.
- Modify `tools/story-explorer/package.json`: replace `build` with a chained script that builds the web sub-tree first then the backend (e.g. `npm --prefix web run build && tsc -p tsconfig.json`); chain `test` to run the web vitest suite alongside the existing `node --test` backend suite. This extends landed SPEC-87 backend code as new SPEC-88 work — not a SPEC-87 amendment, since SPEC-87 is COMPLETED+archived and this spec authors the integration explicitly.
- Add `@fastify/static` as a `tools/story-explorer/package.json` dependency; register a read-only `web/dist/` static-serve in `tools/story-explorer/src/server/http.ts` for production mode (guarded by build-presence check; falls back gracefully when `web/dist/` is absent, e.g. backend-only test runs). This preserves SPEC-87 §6 four-layer read-only fence — static-serve is read-only by construction and adds no write surface. A new test (`test/static-serve-readonly.test.ts`) asserts the static-serve handler responds only to `GET`/`HEAD` and that no `POST`/`PUT`/`PATCH`/`DELETE` registration is introduced under the `web/dist/` route.
- Frontend tests via vitest + React Testing Library (declared in `web/package.json` devDependencies): render tests per route, accessibility tests via axe-core, missing-prose placeholder visual snapshot, choice-card multi-variant rendering, breadcrumb anchor correctness.
- Manual smoke test in `dev` mode against the `worlds/erotica-world/stories/red-bunny/` bundle (one prose page, one plan, one receipt confirmed present per pre-spec audit).

## 11. FOUNDATIONS alignment

| Principle | Stance | Rationale (with surface) |
|---|---|---|
| §Story Bundles §4a — Plan-Authority Boundary (PG authority; prose optional artifact) | aligns @ UI render model | Missing prose is rendered as a designed polished state (not error); page plan never substitutes for prose; PG is the addressable entity for navigation. |
| §Story Bundles §9 — Prose Length Discipline (no word quotas) | aligns @ UI typography | Prose is rendered at the content-defined length; no word-count chrome / progress bar / per-page word indicator in the UI. |
| §Tooling Recommendation — agents never operate on prose alone | N/A @ this surface | The frontend is a human-facing reader, not an LLM agent surface. (Defensive disclosure: principle is in the canon-reading cluster.) |
| §Story Bundles §6b — Information / Observer Firewall | N/A @ this surface | Firewall enforcement happens at story-pipeline authoring time, not at viewer time. The explorer is explicitly an author-x-ray surface (proposal §4 / §7); spoiler protection is out of scope for v1 per Named Assumption D. Defensive disclosure: an adjacent reader might expect spoiler masking; this row records the deliberate non-engagement. |
