<!-- spec-drafting-rules.md not present; using default structure: Problem Statement, Approach, Deliverables, FOUNDATIONS Alignment, Verification, Out of Scope, Risks & Open Questions. -->

# SPEC-39: tools/ Packages ESM Migration

**Phase**: Single phase, per-package execution
**Depends on**: None (independent build-system migration)
**Blocks**: None (no skill or canon work waits on this; this is infrastructural hygiene)
**Status**: PROPOSED

## Problem Statement

Dependabot bumped `tools/hooks` and `tools/world-index` from TypeScript 5.9.3 → 6.0.3 in PRs #46 and #49. TS 6 emits `error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0` because both packages used the legacy `module: "commonjs"` + `moduleResolution: "node"` combination. The dependabot-PR fix was to add `"ignoreDeprecations": "6.0"` to both tsconfigs — a workaround that silences the warning until TS 7 lands.

The three other tools/ packages (`patch-engine`, `validators`, `world-mcp`) already use the modern `Node16/Node16` tsconfig form and stayed on TS 5.9.3; when dependabot eventually bumps them, they will hit the same deprecation and would either need the same workaround or a real migration.

**Hooks migration already landed** as part of the brainstorm that produced this spec: `tools/hooks/tsconfig.json` now uses `Node16/Node16` and removed `ignoreDeprecations` (commit `<pending>`). Hooks had no ESM-only dependencies, so the migration was a 3-line tsconfig change with no source edits. The remaining four packages need real ESM work, primarily driven by `tools/world-index`'s consumption of pure-ESM packages (`unified`, `remark-parse`, `remark-gfm`, `mdast-util-from-markdown`).

**Why ESM convert rather than the workaround**: per `docs/FOUNDATIONS.md` §Machine-Facing Layer, the five tools/ packages are non-negotiable infrastructure for canon retrieval (World Index, Retrieval MCP Server, Patch Engine, Validator Framework, Hooks). Aligning their module system with the modern Node ESM trajectory — already inhabited by the unifiedjs ecosystem and by Node 22+ itself — is infrastructural hygiene appropriate to a layer FOUNDATIONS treats as load-bearing. The `ignoreDeprecations` workaround defers the same work under more pressure when TS 7 ships.

**Why not swap markdown libraries**: the `unified` / `remark-*` / `mdast` stack is the modern, type-safe, well-maintained markdown processing ecosystem in JS/TS — all packages current and actively maintained (unified v11.0.5, remark-parse v11.0.0, remark-gfm v4.0.1, mdast-util-from-markdown v2.0.3, @types/mdast v4.0.4). Replacing it with `markdown-it` or `marked` for tooling-ergonomic reasons would lose type richness and AST fidelity for no architectural gain.

**Why not dynamic-import + async parseMarkdown**: `tools/world-index` is fully synchronous by design (uses `readFileSync` + `better-sqlite3` which is sync-only). There is no `async`/`await` anywhere in `src/commands/*.ts`. Making `parseMarkdown` async forces a sync→async cascade through the entire command pipeline against the codebase's intentional sync coherence.

## Approach

Convert all five `tools/` packages to ESM in a single coordinated migration:

1. **Package metadata**: add `"type": "module"` to each `package.json`.
2. **tsconfig.json**: each package uses `module: "Node16"` + `moduleResolution: "Node16"`; remove any `ignoreDeprecations: "6.0"`.
3. **Source imports**: add `.js` suffix to every relative import in `src/` and `tests/`. Existing imports in `tools/patch-engine` and `tools/validators` already use `.js` suffixes — they require no source changes. `tools/world-index`, `tools/world-mcp`, and `tools/hooks` need `.js` suffix discipline applied.
4. **Cross-package boundaries**: when an ESM package is `require()`d from another (or expected as such by a test runner), update the consumer to use `import` or `await import()`. world-index `dist/` is consumed by `patch-engine`, `validators`, and `world-mcp` as a file dependency (`npm install ../world-index`); their `import` statements work as-is since they already use Node16 resolution.
5. **CLI entry points**: shebang lines and `bin` field paths remain; ensure `dist/src/cli.js` is executable. Node treats `.js` files in a `"type": "module"` package as ESM, so CLI scripts switch from CJS to ESM transparently.
6. **Test runners**: `node --test dist/tests/*.test.js` works for both CJS and ESM in Node ≥22; no test-runner changes required.
7. **better-sqlite3 interop**: `better-sqlite3` is CJS; under Node 22+ ESM `import Database from "better-sqlite3"` works via Node's CJS-from-ESM interop, which is fully supported (not the experimental `require(esm)` direction). No code change needed.

The migration is per-package self-contained: each package's PR can land independently in any order. Recommended order: `world-mcp` (smallest), `validators`, `patch-engine`, `hooks` (already partially done — just needs `"type": "module"`), `world-index` (largest at ~158 relative imports).

## Deliverables

### Per-package change inventory

| Package | tsconfig change | package.json change | Source edits | Notes |
|---|---|---|---|---|
| `tools/hooks` | DONE (Node16/Node16, no `ignoreDeprecations`) | Add `"type": "module"` | Add `.js` suffix to 23 relative imports across `src/` + `tests/` | tsconfig already migrated in commit `<pending>`; 22/22 tests pass |
| `tools/world-mcp` | None (already Node16/Node16) | Add `"type": "module"` | Add `.js` suffix to relative imports across `src/` + `tests/`; replace CJS globals; add ESM-safe runtime interop while sibling packages remain CJS | Largest live import surface by grep; first consumer migration in corrected dependency order |
| `tools/validators` | None (already Node16/Node16) | Change `"type": "commonjs"` → `"type": "module"` | None (`.js` suffixes already used) | Already authored for ESM-shape; flip the package.json flag |
| `tools/patch-engine` | None (already Node16/Node16) | Change `"type": "commonjs"` → `"type": "module"` | None (`.js` suffixes already used) | Same as validators |
| `tools/world-index` | Change `module: "commonjs"` → `"Node16"`, `moduleResolution: "node"` → `"Node16"`, remove `ignoreDeprecations: "6.0"` | Add `"type": "module"` | Add `.js` suffix to ~158 relative imports across `src/` + `tests/` | Largest surface; mdast-consuming files (`parse/atomic.ts`, `parse/canonical.ts`, `parse/entities.ts`, `parse/markdown.ts`, `parse/prose.ts`, `parse/scoped.ts`, `parse/semantic.ts`, `parse/structured-edges.ts`) remain unchanged at the type-import level |

### Verification artifacts per package

Each package's PR must include:

1. `npm run clean && npm test` passes from a clean `node_modules` (run `npm ci` if `package-lock.json` is canonical).
2. `tsc --noEmit` passes with no warnings (deprecation errors gone, no ESM/CJS interop warnings).
3. For packages with bin entries (`world-index`), the compiled CLI runs (`./dist/src/cli.js --help` or equivalent smoke test).
4. For packages consumed as file dependencies, downstream consumer build still passes (e.g., world-index migration includes a smoke build of patch-engine + validators against the new world-index `dist/`).

### Cross-package integration smoke

After all five packages migrate, run the existing CI workflows in `.github/workflows/`:

- `ci-hooks.yml`
- `ci-world-index.yml`
- `ci-patch-engine.yml` (depends on world-index)
- `ci-validators.yml` (depends on world-index)
- `ci-world-mcp.yml`

All must pass. The integration test in `tools/world-index/tests/integration/build-animalia.test.ts` is the load-bearing end-to-end check.

## FOUNDATIONS Alignment

| Principle | Stance | Rationale |
|---|---|---|
| §Machine-Facing Layer (item 1: World Index) | aligns | World Index is non-negotiable infrastructure per FOUNDATIONS; aligning its module system with the modern Node ESM trajectory keeps the machine-facing layer's foundation forward-compatible |
| §Machine-Facing Layer (items 2-5: MCP server, patch engine, validators, hooks) | aligns | All four downstream tools/ packages migrate together; the machine-facing layer remains a coherent shape rather than a CJS/ESM split |
| §Tooling Recommendation | N/A | Governs context-packet delivery to LLM agents, not package format choices |
| §Canonical Storage Layer | N/A | Canonical world data is atomic YAML; the ESM/CJS distinction does not change canon storage shape or read/write discipline |
| §Validation Rules 1-7, 11, 12 | N/A | Govern content discipline, not build tooling |

This spec touches only build configuration and import syntax — it does not change runtime behavior, public APIs, or canon-handling semantics. Existing validators, hooks, MCP tools, and patch operations continue to behave identically.

## Verification

### Tests that must pass after each per-package migration

| Verification | Surface | Pass criterion |
|---|---|---|
| Per-package build | `npm run build` in the migrated package | tsc exit 0; no deprecation warnings; no TS1479 ESM/CJS interop errors |
| Per-package tests | `npm test` in the migrated package | All existing tests pass (no behavior changes expected) |
| Downstream consumer build | Where the migrated package is a file dependency: rebuild the consumer | tsc exit 0 in the consumer |
| Integration smoke | `tools/world-index/tests/integration/build-animalia.test.ts` (after world-index migration) | Test passes |
| CI workflow | The matching `.github/workflows/ci-<package>.yml` on PR | Workflow green |

### Invariants

1. No runtime behavior change: existing CLI outputs (`world-index --help`, `world-validate`, etc.) byte-equal pre- and post-migration on identical inputs.
2. No public API surface change: package `exports` fields and module shapes remain identical; downstream consumers' import statements work without source changes.
3. No new dependencies: the migration is pure configuration + import-syntax edits.
4. The `ignoreDeprecations: "6.0"` workaround is removed from every tsconfig in `tools/`.

## Out of Scope

- Upgrading `unified`, `remark-*`, `mdast-util-*`, or any other dependency beyond what TS 6.0.3 + ESM convert requires.
- Swapping markdown libraries (the unifiedjs ecosystem is the modern, well-maintained choice).
- Converting `better-sqlite3` to an async API (it is sync-only by design; this spec does not change world-index's sync coherence).
- Migrating `tools/` packages to a monorepo / workspace tool (npm workspaces, pnpm, turbo). Each package retains its independent `package.json` + `npm install` flow.
- Bumping TypeScript past 6.0.3.
- Adding new test infrastructure or test coverage. Existing tests are the verification surface.

## Risks & Open Questions

### Risks

1. **Cross-package `require()` boundaries**: world-index `dist/` is consumed by patch-engine, validators, and world-mcp as a file dependency. Under ESM, the consumers' `import` statements work, but any place a consumer uses `require()` (e.g., a CommonJS test helper, a script) breaks. *Mitigation*: per-package CI runs cover this; smoke any non-CI dev scripts (e.g., `tools/world-mcp/scripts/*`) before merging the world-index PR. (pragmatic — would be revisited if a CJS consumer surface is discovered that the test suite doesn't cover)
2. **CLI scripts and shebangs**: `world-index` has `bin: "dist/src/cli.js"`. Node treats `.js` in `"type": "module"` packages as ESM; the shebang `#!/usr/bin/env node` still works, but `process.argv` and dynamic stdin handling must not rely on CJS-specific globals (`__dirname`, `__filename`, `require`). *Mitigation*: grep for `__dirname` / `__filename` / `require(` in `src/cli.ts` before migrating world-index; replace with `import.meta.url` + `fileURLToPath` if used.
3. **better-sqlite3 ESM interop**: `import Database from "better-sqlite3"` under Node 22+ ESM works via Node's CJS-from-ESM interop. *Mitigation*: integration smoke (build-animalia.test.ts) is the canonical proof.
4. **TS 6 + `verbatimModuleSyntax`**: not currently enabled in any package, but if a future change enables it, type-only imports may need explicit `import type` syntax. *Mitigation*: out of scope for this migration; flag as a follow-up if enabled.

### Open questions

1. **Order of per-package landings**: independent per-package PRs in any order, or one bundled PR? Bundled keeps the CI-greenness atomic; independent PRs reduce review surface. Recommendation: independent PRs, smallest-to-largest order (`world-mcp` → `validators` → `patch-engine` → finish `hooks` → `world-index`).
2. **CI runner Node version pinning**: `.github/workflows/ci-*.yml` all use `node-version: '22'`. Should that pin to `22.12` or higher to guarantee `require(esm)` availability for transitional cases? The downstream consumers `import` world-index, so `require(esm)` is not exercised — but pinning is cheap insurance. Recommendation: leave at `'22'` (consistent with current spec); revisit only if a real `require(esm)` boundary surfaces.
3. **`@types/node` major bump**: hooks and world-index already on `@types/node 25.8.0`; patch-engine, validators, world-mcp may lag. Not required for ESM migration but worth aligning during the PRs to reduce dependabot churn. Recommendation: align in each per-package PR opportunistically.
