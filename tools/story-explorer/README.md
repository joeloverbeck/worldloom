# Story Explorer

`@worldloom/story-explorer` is the local read-only backend for the Worldloom Story Explorer web UI. It serves deterministic view models for story bundles from repository files and the `world-index` read model.

## Usage

```bash
npm install
npm run build
node dist/src/cli.js --port 5174
```

The package also exposes the built CLI as `story-explorer`.

## Read-Only Contract

- No `POST`, `PUT`, `PATCH`, or `DELETE` routes are registered.
- No dependency on `@worldloom/patch-engine`.
- No dependency on `@worldloom/world-mcp`.
- No repository writes through `fs.writeFile`, `fs.appendFile`, `fs.mkdir`, or equivalents.
- No in-process or subprocess invocation of `world-index build` or `world-index sync`.

Index freshness is reported as data for the frontend to display. Users refresh indexes from the CLI outside this backend.

## Related Specs

- `specs/SPEC-87-story-explorer-backend-foundation.md`
- `specs/SPEC-88-story-explorer-frontend-foundation.md`
- `specs/SPEC-89-story-explorer-state-xray-layer.md`
- `specs/SPEC-90-story-explorer-branch-map-and-search.md`
