# SPEC87STOEXPBAC-001: Package skeleton + build orchestration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — new `tools/story-explorer/` package; `scripts/build-all.sh` + `scripts/check-all.sh` extended; no impact on existing tools.
**Deps**: None

## Problem

SPEC-87 introduces a new tool package `tools/story-explorer/` that hosts the local read-only backend serving the Worldloom Story Explorer web app. Before any read primitives, view models, or HTTP routes can land, the package shell must exist with the right dependency declarations, TypeScript configuration, and integration with the repo's dependency-ordered build/check orchestration. Subsequent tickets in this batch all depend on this skeleton's directory tree and `package.json`.

## Assumption Reassessment (2026-05-25)

1. The existing tool-package convention is independent ESM packages under `tools/<name>/` with their own `package.json`, `tsconfig.json`, `src/`, `dist/` (gitignored) per `tools/README.md` and verified at brainstorm time across `tools/world-index/`, `tools/world-mcp/`, `tools/patch-engine/`, `tools/validators/`, `tools/hooks/`. SPEC-87 §3 / §9 follow this convention.
2. `docs/FOUNDATIONS.md` §Canonical Storage Layer and SPEC-87 §6 Layer 1 both require this package's dependency declarations to NOT include `@worldloom/patch-engine` or `@worldloom/world-mcp` (transitive mutation surface). `@worldloom/world-index` is the canonical DB-connection acquisition surface per the SPEC-87 §6 Layer 1 clarification (`openExistingIndex()` is the canonical opening surface; direct `better-sqlite3` use limited to type references and read-only query primitives).
3. Cross-skill boundary: the package-deps contract is the shared boundary under audit between this ticket and ticket 002 (read-only fencing). Layer 1's package.json declarations are the structural prevention; Layer 2's route registrar (002) is the runtime prevention; both must agree on the same dependency exclusion set. This ticket establishes the deps; 002 enforces them.

## Assumption Reassessment (2026-05-26)

1. Live repo convention uses per-package `tsconfig.json` with `module: "Node16"`, `moduleResolution: "Node16"`, and `rootDir: "."` so emitted entrypoints land under `dist/src/`. The draft's `NodeNext` / `rootDir: "./src"` wording was corrected to match the existing `tools/world-index/`, `tools/validators/`, and `tools/hooks/` convention and to satisfy the stated CLI acceptance path `dist/src/cli.js`.
2. Live repo convention uses Node's built-in test runner from compiled `dist/tests/**/*.test.js`, not Vitest, across the existing tool packages. This skeleton keeps `npm test` on that repo-standard command with zero tests until ticket 002 adds the first behavioral tests.
3. `.gitignore` already contains `tools/*/dist/` and `tools/*/node_modules/`, verified with `git check-ignore -v tools/story-explorer/dist`; no package-specific ignore lines were needed.
4. `npm install` generated `tools/story-explorer/package-lock.json`, which is same-seam package manifest state and belongs in this ticket's landed file set. Existing tool-package installs were used only to restore dependency availability for `scripts/build-all.sh`; incidental existing lockfile metadata churn was removed before closeout.

## Architecture Check

1. Package skeleton is foundational, with no behavioral logic — keeps the diff easily reviewable. Dependency declarations are the load-bearing surface (Layer 1 fence per SPEC-87 §6).
2. No backwards-compatibility shims; the package is wholly new. The README documents the read-only fencing contract so downstream package consumers understand the design constraint without reading the spec.

## Verification Layers

1. Package skeleton structurally complete → codebase grep-proof (`ls tools/story-explorer/` shows `package.json`, `tsconfig.json`, `README.md`, `src/`, `test/`, `.gitignore` patterns)
2. Build orchestration wired → codebase grep-proof (`grep -n "story-explorer" scripts/build-all.sh scripts/check-all.sh` returns matches)
3. Dependency contract correct → codebase grep-proof on `tools/story-explorer/package.json` (`dependencies` includes `@worldloom/world-index` + `better-sqlite3` + `fastify` or equivalent HTTP server; does NOT include `@worldloom/patch-engine` or `@worldloom/world-mcp`)
4. Single-layer ticket: this scope is structural-foundation only. Behavioral verification belongs to subsequent tickets (002 read-only fencing tests, 010 capstone).

## What to Change

### 1. Landed `tools/story-explorer/` directory tree

- `tools/story-explorer/package.json` — name `@worldloom/story-explorer`, private, ESM (`"type": "module"`), Node `>=22`, `bin: { "story-explorer": "dist/src/cli.js" }`. Dependencies: `@worldloom/world-index` (`file:../world-index`), `better-sqlite3`, and `fastify`. Dev dependencies: `@types/node`, `typescript`, and `@types/better-sqlite3`. Scripts: `build` (tsc), `test` (build plus compiled Node test glob), `clean`.
- `tools/story-explorer/package-lock.json` — generated by `npm install` for the new package.
- `tools/story-explorer/tsconfig.json` — follows repo convention; `outDir: "./dist"`, `rootDir: "."`, `target: "ES2022"`, `module: "Node16"`, `moduleResolution: "Node16"`, `strict: true`, `declaration: true`.
- `tools/story-explorer/README.md` — package-purpose summary (local read-only backend serving a web frontend), dev/prod startup instructions, the §6 read-only fencing contract restated (no POST/PUT/PATCH/DELETE, no patch-engine dep, no world-mcp dep, no fs.write, no index-refresh subprocess invocation), pointers to SPEC-87/88/89/90.
- `tools/story-explorer/src/cli.ts` — minimal stub: parses args (default port `5174`), prints `story-explorer v0.1 - server scaffold not yet wired (lands in ticket 007); default port <port>`, exits 0.
- `tools/story-explorer/test/fixtures/.gitkeep` — placeholder for fixture story bundles (per §3 layout; first smoke-test target is a trimmed copy of `worlds/erotica-world/stories/red-bunny/` per §M5 in SPEC-87 reassessment).

### 2. Wired build/check orchestration

- `scripts/build-all.sh` — appends `tools/story-explorer/` to the dependency-ordered build list, after `tools/world-mcp/` (order: `world-index -> patch-engine -> validators -> hooks -> world-mcp -> story-explorer`).
- `scripts/check-all.sh` — appends the story-explorer build/test invocation after `tools/world-mcp/`'s entry, following the existing pattern.

### 3. Confirm repo-root `.gitignore`

- Existing `tools/*/dist/` and `tools/*/node_modules/` rules already cover the new package; no `.gitignore` edit was needed.

## Files to Touch

- `tools/story-explorer/package.json` (new)
- `tools/story-explorer/package-lock.json` (new)
- `tools/story-explorer/tsconfig.json` (new)
- `tools/story-explorer/README.md` (new)
- `tools/story-explorer/src/cli.ts` (new)
- `tools/story-explorer/test/fixtures/.gitkeep` (new)
- `scripts/build-all.sh` (modify)
- `scripts/check-all.sh` (modify)

## Out of Scope

- HTTP server wiring (ticket 007)
- Read-only fencing tests (ticket 002)
- Any read primitives, view models, or routes (tickets 003-009)
- Smoke test against red-bunny fixture (ticket 010)

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer && npm install` succeeds with the declared deps resolving (workspace `file:../world-index` link works).
2. `cd tools/story-explorer && npm run build` succeeds; `dist/src/cli.js` exists.
3. `node tools/story-explorer/dist/src/cli.js` prints the version stub and exits 0.
4. `scripts/build-all.sh` invokes story-explorer's build after world-mcp's.

### Invariants

1. `tools/story-explorer/package.json` MUST NOT declare `@worldloom/patch-engine` or `@worldloom/world-mcp` as dependencies (Layer 1 fence per SPEC-87 §6).
2. `tools/story-explorer/` follows the same per-package conventions as sibling tools (ESM, Node ≥22, `dist/` gitignored).

## Test Plan

### New/Modified Tests

1. `None — package-skeleton ticket; behavioral tests land in subsequent tickets (002 fencing, 003 IndexStatus, 004 enumeration, 005 page read, 006 record card, 010 capstone smoke).`

### Commands

1. `cd tools/story-explorer && npm install` (verifies workspace-file deps resolve)
2. `cd tools/story-explorer && npm run build` (verifies tsconfig + tsc emit `dist/src/cli.js`)
3. `bash scripts/build-all.sh` (verifies orchestration order; runs world-index → patch-engine → validators → hooks → world-mcp → story-explorer)

## Outcome

Completed: 2026-05-26

The new `tools/story-explorer/` package skeleton landed with package metadata, lockfile, TypeScript config, README, CLI scaffold, and fixture placeholder. The dependency-ordered `scripts/build-all.sh` and `scripts/check-all.sh` package arrays now include `story-explorer` after `world-mcp`. The dependency contract is in place: the package depends on `@worldloom/world-index`, `better-sqlite3`, and `fastify`; it does not depend on `@worldloom/patch-engine` or `@worldloom/world-mcp`.

Deviations from draft:

1. `tsconfig.json` uses the live repo's `Node16` / `rootDir: "."` convention so the CLI emits to `dist/src/cli.js`.
2. `npm test` uses the existing package convention (`npm run build && node --test "dist/tests/**/*.test.js"`) and currently reports zero tests until ticket 002 adds the first fence tests.
3. `.gitignore` was not modified because existing `tools/*/dist/` and `tools/*/node_modules/` rules already cover the new package.
4. `tools/story-explorer/package-lock.json` was added as generated package state from `npm install`.

## Verification Result

1. `cd tools/story-explorer && npm install` passed; npm reported one high-severity audit item in the new package dependency tree.
2. `cd tools/story-explorer && npm run build` passed and emitted `dist/src/cli.js`.
3. `node tools/story-explorer/dist/src/cli.js` passed and printed the scaffold message with default port `5174`.
4. `cd tools/story-explorer && npm test` passed with `1..0` because no tests exist yet.
5. `bash scripts/build-all.sh` initially failed at `world-index` because existing package dependencies were not installed in this worktree (`Cannot find type definition file for 'node'`). After installing existing tool-package dependencies, rerunning `bash scripts/build-all.sh` passed through `world-index -> patch-engine -> validators -> hooks -> world-mcp -> story-explorer`.
6. `rg -n "@worldloom/(patch-engine|world-mcp)|patch-engine|world-mcp" tools/story-explorer/package.json tools/story-explorer/package-lock.json tools/story-explorer/README.md` returned only README prohibition lines, confirming the package manifest and lockfile do not declare mutation-surface dependencies.
7. `git check-ignore -v tools/story-explorer/dist` confirmed the existing root `.gitignore` rule covers generated output.
