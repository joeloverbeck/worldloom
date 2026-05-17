# SPEC39TOOESMMIG-005: world-index ESM convert (capstone)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `tools/world-index` tsconfig migrated from `module: "commonjs"` + `moduleResolution: "node"` + `ignoreDeprecations: "6.0"` to `module: "Node16"` + `moduleResolution: "Node16"` (workaround removed); package.json now declares `"type": "module"`; all relative imports in `src/` and `tests/` carry `.js` suffixes; source/test CJS path globals were replaced with `import.meta.dirname`; ESM test-runtime probes were repaired; the spec10 verification script now uses the tracked Animalia fixture instead of gitignored local world state; CLI binary verified to execute under ESM.
**Deps**: None (independent per SPEC-39's per-package self-contained migration; recommended to land LAST in the batch so the cross-package CI chain — ci-patch-engine, ci-validators, ci-world-mcp, all triggered by world-index changes — runs against an end-state where every consumer is already ESM)

## Problem

At intake, `tools/world-index` carried the `ignoreDeprecations: "6.0"` workaround that the prior brainstorm session diagnosed as the dependabot-PR-merged stopgap for TS 6.0.3's `moduleResolution: "node10"` deprecation. world-index was also the only package in the SPEC-39 batch whose tsconfig still used the legacy `module: "commonjs"` + `moduleResolution: "node"` combination — every other package in `tools/` had already migrated to `module: "Node16"` + `moduleResolution: "Node16"`. Additionally, world-index used pure-ESM dependencies (`unified`, `remark-parse`, `remark-gfm`, `mdast-util-from-markdown`) that the legacy resolver didn't enforce ESM/CJS interop against; under Node16 resolution, TS emitted TS1479 errors at `src/parse/markdown.ts:1-3` (correctly diagnosing that ESM-only packages cannot be `require`'d from CJS). The landed fix is full ESM conversion: tsconfig migration, package.json `type` flip, `.js` suffix discipline across relative imports, CJS path-global replacement, and ESM-safe test-runtime probes. world-index is the spec's capstone because (a) it is the largest source surface in the batch and (b) it triggers the cross-package CI chain when modified (ci-patch-engine, ci-validators, ci-world-mcp all declare `paths: 'tools/world-index/**'` in their workflows), so its CI run is the natural end-state verification for the whole SPEC-39 batch.

## Assumption Reassessment (2026-05-17)

1. **Codebase intake evidence**: Before this ticket, `tools/world-index/package.json` had no `"type"` field. `tools/world-index/tsconfig.json` declared `module: "commonjs"`, `moduleResolution: "node"`, and `ignoreDeprecations: "6.0"` (the workaround the prior brainstorm session diagnosed). Relative imports had extensionless source/test specifiers, and source/test code used CJS path globals that are undefined under ESM. CLI binary: `bin: "dist/src/cli.js"` per package.json; the source `src/cli.ts` carries `#!/usr/bin/env node` shebang. Dependencies that motivate the migration's TS1479 errors under Node16: `unified` (v11.0.5 — `"type": "module"`), `remark-parse` (v11.0.0 — `"type": "module"`), `remark-gfm` (v4.0.1 — `"type": "module"`), all consumed via `import` from `src/parse/markdown.ts`. Integration test: `tools/world-index/tests/integration/build-animalia.test.ts` exists and is the load-bearing end-to-end check per SPEC-39 §Deliverables. `engines.node` is `>=22` so `import.meta.dirname` is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/world-index` is *"Change `module: "commonjs"` → `"Node16"`, `moduleResolution: "node"` → `"Node16"`, remove `ignoreDeprecations: "6.0"` | Add `"type": "module"` | Add `.js` suffix to ~158 relative imports across `src/` + `tests/` | Largest surface; mdast-consuming files ... remain unchanged at the type-import level"*. SPEC-39's import count was approximate; the final proof uses a zero-hit extensionless-import sweep rather than preserving that brittle count. The `__dirname` site at `src/index/open.ts` and test-runtime path sites were scope expansions the spec didn't enumerate; documented at item 5. world-index's role as the spec's capstone (last to migrate; triggers cross-package CI chain) is preserved.
3. **Cross-artifact boundary**: world-index's `dist/` is a file dependency consumed by `tools/patch-engine`, `tools/validators`, and `tools/world-mcp` (all three declare `"@worldloom/world-index": "file:../world-index"`). When world-index migrates to ESM and tickets 001/002/004 (patch-engine/validators/world-mcp) have already landed, all consumers are ESM importing from ESM world-index — the cleanest end state. If consumers haven't migrated yet, ESM-from-CJS interop in Node 22 still works (consumers `require(esm)` world-index via Node 22.12+'s native support). The cross-package CI chain (ci-patch-engine.yml, ci-validators.yml, ci-world-mcp.yml all declare `paths: 'tools/world-index/**'`) automatically triggers all four CI workflows on any world-index change; world-index's PR is therefore the natural end-state verification for the whole SPEC-39 batch.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 1 names `tools/world-index/` as the "SQLite + FTS5 index of parsed nodes, typed edges, entity mentions, and anchor checksums ... derived, deterministic, and regenerable from markdown" — the foundational machine-facing layer that every MCP retrieval and every canon-mutating skill depends on. Aligning its module system with the modern Node ESM trajectory completes the §Machine-Facing Layer's transition to a unified ESM surface across all five tools/ packages and removes the TS-7 deprecation cliff that the `ignoreDeprecations: "6.0"` workaround was kicking down the road.
5. **Mismatch + correction**: SPEC-39 stated 158 relative imports for world-index; the exact count varied by grep shape, but the landed invariant is stronger and simpler: no extensionless relative `from` / re-export specifiers remain in `tools/world-index/src` or `tools/world-index/tests`. SPEC-39's Risks section item 2 named only `src/cli.ts` for `__dirname` mitigation in world-index; the second source site at `src/index/open.ts` and test-runtime path sites needed the same `import.meta.dirname` replacement. These refinements stay inside the ESM migration seam.
6. **Proof-surface correction**: `npm run test:spec10-verification` first failed in the sandbox when it tried to mutate gitignored `worlds/animalia/_index/world.db`, then failed after escalation because the checkout-local private `worlds/animalia` state no longer matched the script's old fixture expectations. The tracked package already has a checked Animalia fixture at `tests/fixtures/animalia`, so this ticket repaired the script to copy that fixture into a temp repo before running `world-index build` / `verify`, and refreshed the stale fixture assertions. The rerun passed.

## Architecture Check

1. Landing all four surfaces (tsconfig migration, package.json type flip, `.js` suffix discipline, and ESM path/runtime probe repairs) in one ticket keeps world-index's migration co-located and reviewable as one diff. The tsconfig change alone breaks the build (TS1479 errors fire immediately under Node16 against ESM-only dependencies) until the `.js`-suffix work and `type` flip land; splitting would force interleaved partially-broken states. The world-index capstone role also means a single PR provides the cleanest cross-package CI integration check: ci-patch-engine, ci-validators, ci-world-mcp, and ci-world-index all run, exercising the post-migration end state in one CI cycle.
2. No backwards-compatibility shims introduced. The `ignoreDeprecations: "6.0"` workaround is removed (the migration eliminates the deprecation, not just the warning). `import.meta.dirname` matches `engines.node: >=22`. The `.js` suffix discipline matches the convention `tools/patch-engine` and `tools/validators` already use. The CLI binary at `dist/src/cli.js` retains its shebang; Node 22+ treats `.js` files in `"type": "module"` packages as ESM transparently. The package's public `exports` field, CLI argv interface, and SQLite schema surface remain byte-identical.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/world-index run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns empty (post-migration; the TS1479 errors at `src/parse/markdown.ts` against pure-ESM dependencies disappear under `"type": "module"`).
2. **All existing tests pass under the new module emission + suffix discipline + `__dirname` shim** → command-execution proof: `npm --prefix tools/world-index test` exits 0 with all existing tests passing.
3. **No residual extensionless relative imports** → codebase grep-proof: `if rg --pcre2 "(from|export .* from) ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/world-index/src tools/world-index/tests; then exit 1; fi` exits 0.
4. **No residual `__dirname` usage in world-index source** → codebase grep-proof: `grep -rE "__dirname|__filename" tools/world-index/src` returns empty.
5. **CLI binary executes** → command-execution proof: `node tools/world-index/dist/src/cli.js --help` (or `./tools/world-index/dist/src/cli.js --help` if chmod'd) returns usage text without ESM-runtime errors.
6. **Integration test passes** → command-execution proof: `npm --prefix tools/world-index run test:spec10-verification` succeeds and the build-animalia integration test (the load-bearing end-to-end check per SPEC-39) exits 0.
7. **`ignoreDeprecations` workaround removed** → codebase grep-proof: `grep ignoreDeprecations tools/world-index/tsconfig.json` returns empty.
8. **Cross-package downstream consumer builds still pass** → command-execution proof: `npm --prefix tools/patch-engine run build`, `npm --prefix tools/validators run build`, `npm --prefix tools/world-mcp run build`, `npm --prefix tools/hooks run build` all succeed against the new world-index `dist/`.

## Landed Changes

### 1. `tools/world-index/tsconfig.json`: migrate module system

Changed three compiler options:
- `"module": "commonjs"` → `"module": "Node16"`
- `"moduleResolution": "node"` → `"moduleResolution": "Node16"`
- Remove `"ignoreDeprecations": "6.0"` entirely

No other tsconfig fields change.

### 2. `tools/world-index/package.json`: add `type` field

Added `"type": "module"` to the top-level fields of `package.json`. No other fields changed.

### 3. Add `.js` suffix to every relative import in `src/` and `tests/`

Every relative import and re-export in `tools/world-index/src/**/*.ts` and `tools/world-index/tests/**/*.ts` now carries the `.js` suffix. Examples:

- `import { openExistingWorldIndex } from "./shared";` → `import { openExistingWorldIndex } from "./shared.js";`
- `import { databasePathForWorld, openIndex } from "../index/open";` → `import { ... } from "../index/open.js";`
- `import type { ParsedFileResult } from "../commands/shared";` → `import type { ... } from "../commands/shared.js";`

Type-only imports, re-exports, and barrel exports all follow the same rule.

### 4. Replace CJS path globals and ESM-sensitive test probes

- `tools/world-index/src/cli.ts` and `tools/world-index/src/index/open.ts` now use `import.meta.dirname`.
- Tests that resolve fixtures or compiled CLI paths now use `import.meta.dirname`.
- The canonical hash child-process probe now runs as ESM via `--input-type=module` and dynamic imports.
- The public-types self-import test uses `createRequire(import.meta.url)` so the ESM test module can still exercise the package `require` export surface.

### 5. Rebuild and re-verify

`npm run clean`, `npm run build`, `npm test`, `npm run test:spec10-verification`, static ESM greps, and `node tools/world-index/dist/src/cli.js --help` all passed after the migration.

### 6. Cross-package downstream consumer smoke

Rebuild every downstream consumer that file-depends on world-index against the new `dist/`:
- `npm --prefix tools/patch-engine run build`
- `npm --prefix tools/validators run build`
- `npm --prefix tools/world-mcp run build`
- `npm --prefix tools/hooks run build`

All succeeded against the new world-index `dist/`.

## Files to Touch

- `tools/world-index/tsconfig.json` (modify — migrate module / moduleResolution; remove ignoreDeprecations)
- `tools/world-index/package.json` (modify — add `"type": "module"`)
- `tools/world-index/src/cli.ts` (modify — `__dirname` → `import.meta.dirname` at line 17)
- `tools/world-index/src/index/open.ts` (modify — `__dirname` → `import.meta.dirname` at line 8)
- `tools/world-index/src/**/*.ts` (modify — append `.js` to every extensionless relative import/re-export)
- `tools/world-index/tests/**/*.ts` (modify — same as above)
- `tools/world-index/tests/integration/spec10-verification.sh` (modify — use a temp copy of the tracked Animalia fixture and refresh stale fixture assertions)
- `specs/SPEC-39-tools-esm-migration.md` (modify — dated implementation note for the world-index capstone row)

## Out of Scope

- Upgrading `typescript`, `@types/node`, `unified`, `remark-*`, `mdast-util-*`, `better-sqlite3`, or any other dependency past current pins. Dependabot handles version bumps separately.
- Swapping markdown libraries (the unifiedjs ecosystem is the modern, well-maintained choice; the spec's brainstorm explicitly rejected lib-swap as architecturally regressive).
- Converting `better-sqlite3` to an async API (it is sync-only by design; world-index's sync coherence is preserved).
- Changing any world-index command, parser, schema, retrieval result shape, or CLI argv interface. This ticket preserves runtime behavior byte-identically.
- Modifying the SQLite schema, migrations, FTS5 indexes, or any persisted data layout.
- Adding new commands or removing existing ones; the `world-index` CLI subcommand inventory (build, init, sync, render, inspect, stats, verify) is preserved.
- Replacing `import.meta.dirname` with `fileURLToPath(import.meta.url)` + `path.dirname(...)`. Node 22+ native is sufficient.
- Pinning the CI workflows' `node-version` to `22.12+` for `require(esm)` guarantees; SPEC-39 §Risks open question 2 explicitly defers this.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/world-index run clean && npm --prefix tools/world-index run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479) — the migration eliminates both classes of error.
2. `npm --prefix tools/world-index test` exits 0 with all existing tests passing, including the build-animalia integration test at `tests/integration/build-animalia.test.ts`.
3. `npm --prefix tools/world-index run test:spec10-verification` exits 0.
4. `if rg --pcre2 "(from|export .* from) ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/world-index/src tools/world-index/tests; then exit 1; fi` exits 0 (no extensionless relative imports or re-exports remain).
5. `grep -rE "__dirname|__filename" tools/world-index/src` returns empty.
6. `grep ignoreDeprecations tools/world-index/tsconfig.json` returns empty (workaround removed).
7. `node tools/world-index/dist/src/cli.js --help` outputs usage text without `Cannot use import statement outside a module` or `require is not defined` errors.
8. `npm --prefix tools/patch-engine run build && npm --prefix tools/validators run build && npm --prefix tools/world-mcp run build && npm --prefix tools/hooks run build` all succeed against the new world-index `dist/`.

### Invariants

1. No runtime behavior change: world-index CLI outputs (`world-index --help`, `build`, `init`, `sync`, `render`, etc.) byte-identical pre/post-migration on identical inputs.
2. No public API change: the package's `exports` field, SQLite schema, FTS5 index shape, CLI argv interface, and consumed-by-others surface remain unchanged.
3. `package.json` `"type"` field is `"module"` after the change.
4. `tsconfig.json` `module` and `moduleResolution` are both `"Node16"`; `ignoreDeprecations` is absent.
5. Every relative import in `src/` and `tests/` carries the `.js` suffix.
6. No source file under `tools/world-index/src/` references `__dirname` or `__filename`.
7. The four downstream consumer packages (patch-engine, validators, world-mcp, hooks) continue to build and pass their tests against the migrated world-index `dist/`.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/integration/spec10-verification.sh` — now copies the tracked Animalia fixture into a temp repo before running `world-index build` / `verify`, avoiding private `worlds/animalia` state and keeping the proof portable.

### Commands

1. `npm --prefix tools/world-index run clean && npm --prefix tools/world-index run build && npm --prefix tools/world-index test` (targeted package verification including build-animalia integration)
2. `npm --prefix tools/world-index run test:spec10-verification` (extended verification script)
3. `if rg --pcre2 "(from|export .* from) ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/world-index/src tools/world-index/tests; then exit 1; fi` (must exit 0)
4. `grep -rE "__dirname|__filename" tools/world-index/src` (must return empty)
5. `grep ignoreDeprecations tools/world-index/tsconfig.json` (must return empty)
6. `node tools/world-index/dist/src/cli.js --help` (CLI binary ESM smoke)
7. `npm --prefix tools/patch-engine run build && npm --prefix tools/validators run build && npm --prefix tools/world-mcp run build && npm --prefix tools/hooks run build` (cross-package downstream consumer integration smoke — this is the SPEC-39 batch's end-state verification)

## Outcome

Completed on 2026-05-17. `tools/world-index` now declares ESM package mode, uses TypeScript `Node16` module/resolution settings without `ignoreDeprecations`, and has `.js` suffixes on all relative source/test imports and re-exports. Source and test path-resolution code is ESM-safe, package self-import and child-process probes still exercise the intended public surfaces, and the compiled CLI runs under ESM.

The spec10 verification script was repaired as same-seam proof fallout: it now builds a temp copy of the tracked `tests/fixtures/animalia` fixture instead of mutating gitignored local `worlds/animalia` state, and its assertions match that checked fixture's current index output.

SPEC-39 has a dated implementation note recording the world-index capstone. This completes the SPEC-39 tools package ESM migration family.

## Verification Result

- `npm run clean` in `tools/world-index` — passed.
- `npm run build` in `tools/world-index` — passed with no TS5107 / TS1479 output.
- `npm test` in `tools/world-index` — passed, 87/87 tests.
- `npm run test:spec10-verification` in `tools/world-index` — initially failed on sandbox-local `worlds/animalia` mutation and stale private-world expectations; after repairing the script to use the tracked fixture, passed with `"failures": []`.
- `node tools/world-index/dist/src/cli.js --help` from repo root — passed and printed usage text.
- `if rg --pcre2 "(from|export .* from) ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/world-index/src tools/world-index/tests; then exit 1; fi` — passed, no extensionless relative import/re-export specifiers.
- `if rg -n "__dirname|__filename" tools/world-index/src; then exit 1; fi` — passed, no source CJS path globals.
- `if rg -n "ignoreDeprecations" tools/world-index/tsconfig.json; then exit 1; fi` — passed.
- Downstream builds all passed: `npm run build` in `tools/patch-engine`, `tools/validators`, `tools/world-mcp`, and `tools/hooks`.

## Deviations

- The ticket's draft counted 138 extensionless imports and 4 already-suffixed imports. The final acceptance uses a stronger zero-hit grep for extensionless relative import/re-export specifiers instead of preserving the brittle count.
- Test files also needed ESM path-global repairs, and two ESM-sensitive test probes needed runtime interop changes. This was same-seam fallout required for the package test suite to run under `"type": "module"`.
- The first `npm run test:spec10-verification` attempt failed with `EROFS` while trying to mutate gitignored local `worlds/animalia/_index/world.db`; the escalated retry proved the script also depended on stale private-world fixture expectations. The landed script now uses checked fixture data in a temp repo, so the accepted proof no longer depends on private world state.
