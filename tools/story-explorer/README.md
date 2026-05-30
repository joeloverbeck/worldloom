# Story Explorer

`@worldloom/story-explorer` is the local read-only backend for the Worldloom Story Explorer web UI. It serves deterministic, scene-first view models for story bundles from repository files and the `world-index` read model — overview, timeline, scene-detail, unscened-run, and state-tick x-ray routes built on the `scene_coverage` read model rather than a page-prose surface.

## Usage

### Browse the Built App

```bash
npm install
npm run build
node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom
```

Open `http://127.0.0.1:5174` in a browser.

The package also exposes the built CLI as `story-explorer`.

Use `--repo-root <path>` to point the server at a specific Worldloom checkout. When omitted, the CLI resolves the nearest repository root from the current working directory.

`npm run build` builds both the `web/` Vite bundle and the backend. When `web/dist/index.html` is present under the resolved repo root, the backend serves the bundle at `/` and keeps `/api/*` routes enveloped for frontend API calls. When the bundle is absent, the backend still starts and serves only the API routes.

### Frontend Dev Mode

Run the backend API in one terminal:

```bash
cd /home/joeloverbeck/projects/worldloom/tools/story-explorer
npm install
npm run build
node dist/src/cli.js --port 5174 --repo-root /home/joeloverbeck/projects/worldloom
```

Run the Vite dev server in a second terminal:

```bash
cd /home/joeloverbeck/projects/worldloom/tools/story-explorer/web
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in a browser. Vite proxies `/api/*` requests to the backend on port `5174`.

## Read-Only Contract

- No `POST`, `PUT`, `PATCH`, or `DELETE` routes are registered.
- `GET` and `HEAD` are the only allowed read-route methods.
- No dependency on `@worldloom/patch-engine`.
- No dependency on `@worldloom/world-mcp`.
- No repository writes through `fs.writeFile`, `fs.appendFile`, `fs.mkdir`, or equivalents.
- No in-process or subprocess invocation of `world-index build` or `world-index sync`.

Index freshness is reported as data for the frontend to display. Users refresh indexes from the CLI outside this backend.

### Refreshing Stale Indexes

If the UI reports stale indexed reads, refresh the world index from the repository root with the Story Explorer package-local `world-index` bin:

```bash
npm exec --prefix tools/story-explorer -- world-index sync <world-slug> --quiet
```

For example:

```bash
npm exec --prefix tools/story-explorer -- world-index sync erotica-world --quiet
```

The shorter `world-index sync <world-slug>` form only works when the `world-index` package bin is already linked into the shell `PATH`.

If the UI reports a missing, empty, or incompatible index, rebuild it from the repository root with:

```bash
npm exec --prefix tools/story-explorer -- world-index build <world-slug>
```

## Related Specs

The Story Explorer is scene-first as of SPEC-96..98. The page-centric branch-map/search spec (SPEC-90) was removed; its live contract is carried by SPEC-98. The foundational and scene-first specs are archived:

- `archive/specs/SPEC-87-story-explorer-backend-foundation.md`
- `archive/specs/SPEC-88-story-explorer-frontend-foundation.md`
- `archive/specs/SPEC-89-story-explorer-state-xray-layer.md`
- `archive/specs/SPEC-96-story-explorer-scene-backend-api.md`
- `archive/specs/SPEC-97-story-explorer-scene-first-frontend.md`
- `archive/specs/SPEC-98-story-explorer-scene-search-and-branch-map.md`
