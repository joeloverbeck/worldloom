# SPEC39TOOESMMIG-004: world-mcp ESM convert

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Large
**Engine Changes**: Yes — `tools/world-mcp` package.json `type` field adds `"module"`; 239 relative imports in `src/` and `tests/` gain `.js` suffix; 7 source files replace `__dirname` with `import.meta.dirname`.
**Deps**: None (independent per SPEC-39's per-package self-contained migration; runtime-recommended order suggests landing after patch-engine + validators have migrated, but each package's PR stands alone)

## Problem

`tools/world-mcp` is already authored for the modern Node16/Node16 module form (tsconfig uses `module: "Node16"` + `moduleResolution: "Node16"`) but the actual migration scope is materially larger than SPEC-39's deliverable table implied. Three surfaces need work: (a) `package.json` has no `"type"` declaration, so Node defaults to CJS; (b) 239 relative imports across `src/` and `tests/` are extensionless (the spec called world-mcp "smallest" in its recommended order, but world-mcp has the most extensionless imports of any package in the batch — verified via grep); (c) 7 source files use `__dirname` for path resolution (server.ts, build-info.ts, db/path.ts, tools/validate-patch-plan.ts, tools/get-record-schema.ts, tools/describe-envelope-schema.ts, tools/get-canonical-vocabulary.ts) — `__dirname` is undefined in ESM.

The expanded scope is documented at item 5 of Assumption Reassessment below; the spec's intent (full ESM convert of world-mcp) is preserved, but the ticket is sized against the actual implementation surface.

## Assumption Reassessment (2026-05-17)

1. **Codebase**: `tools/world-mcp/package.json` currently has no `"type"` field. `tools/world-mcp/tsconfig.json` already uses `module: "Node16"` + `moduleResolution: "Node16"`. Relative imports: 239 extensionless across `src/` and `tests/` (verified via grep); 0 `.js`-suffixed. `__dirname` usage: 7 files — `src/server.ts`, `src/build-info.ts`, `src/db/path.ts`, `src/tools/validate-patch-plan.ts`, `src/tools/get-record-schema.ts`, `src/tools/describe-envelope-schema.ts`, `src/tools/get-canonical-vocabulary.ts` (all for `path.resolve(__dirname, ...)` or `findRepoRootFrom(__dirname)` patterns). 2 CLI scripts have `#!/usr/bin/env node` shebangs: `src/cli/validate-patch-plan.ts`, `src/cli/compute-pg-hashes.ts` (per the package.json bin field). Dependencies: `better-sqlite3` (CJS-friendly under Node 22 ESM's CJS-from-ESM interop) plus file-dependencies on `@worldloom/world-index`, `@worldloom/patch-engine`, `@worldloom/validators`. `engines.node` is `>=22` so `import.meta.dirname` is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/world-mcp` is *"None (already Node16/Node16) | Add `"type": "module"` | Add `.js` suffix to relative imports across `src/` + `tests/` | Smallest source surface"*. SPEC-39 also placed world-mcp first in the "Recommended order: world-mcp (smallest)..." sequence. Codebase reality at decomposition time: world-mcp has the largest extensionless-import count (239) of any package in the batch. Documented at item 5.
3. **Cross-artifact boundary**: world-mcp consumes `@worldloom/world-index`, `@worldloom/patch-engine`, and `@worldloom/validators` via file-dependencies. The runtime order recommendation in SPEC-39 (consumers first) means world-mcp may land while world-index is still CJS — ESM-from-CJS imports work in Node 22 via default-export interop and named-export support, so the transition is functional. world-mcp is consumed by no downstream package (it is the deepest consumer in the tools/ chain); its migration cannot break sibling builds, only its own CI workflow (ci-world-mcp).
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 2 names `tools/world-mcp` as the "structured read API over the world index" that "replaces ad hoc raw-file loading with typed retrieval and context-packet assembly" — non-negotiable infrastructure for the canon-retrieval surface every canon-mutating and canon-reading skill consumes. Aligning its module system with the modern Node ESM trajectory completes the §Machine-Facing Layer's transition to a unified ESM surface across all five tools/ packages.
5. **Mismatch + correction**: SPEC-39 mis-sized world-mcp in two places — (a) the §Deliverables row called source-edit scope "smallest"; actual extensionless-import count is 239 (largest in batch). (b) SPEC-39's Risks section item 2 mentioned `__dirname` mitigation only for `src/cli.ts` in world-index; world-mcp has 7 `__dirname` sites that the spec did not enumerate. Both corrections are sized into this ticket's What to Change. The replacement uses `import.meta.dirname` (Node 22+ native), functionally equivalent to `__dirname` for the path-resolution patterns these sites implement. Neither correction changes SPEC-39's intent; both size the ticket against the actual implementation surface.

## Architecture Check

1. Landing all three surfaces in one ticket keeps world-mcp's migration co-located and reviewable as one diff. The `.js`-suffix work and the `__dirname` work could theoretically split, but they share a single build/test verification cycle and would force two PR-review rounds without architectural benefit. The 239-import count is large but the per-import edit is purely mechanical (append `.js`); reviewers can spot-check a sample and trust the grep-based verification at acceptance.
2. No backwards-compatibility shims introduced. `import.meta.dirname` matches `engines.node: >=22`. The `.js` suffix discipline matches the convention `tools/patch-engine` and `tools/validators` already use. CLI scripts (`src/cli/validate-patch-plan.ts`, `src/cli/compute-pg-hashes.ts`) retain their shebangs; Node 22+ treats `.js` files in `"type": "module"` packages as ESM transparently, so the shebang interface is unchanged.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/world-mcp run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns empty.
2. **All existing tests pass under the new module emission + suffix discipline + `__dirname` shim** → command-execution proof: `npm --prefix tools/world-mcp test` exits 0 with all existing tests passing.
3. **No residual extensionless relative imports** → codebase grep-proof: `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/world-mcp/src tools/world-mcp/tests` returns 0.
4. **No residual `__dirname` usage in world-mcp source** → codebase grep-proof: `grep -rE "__dirname|__filename" tools/world-mcp/src` returns empty.
5. **CLI binaries still execute** → command-execution proof: `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --help` (or analogous smoke) returns usage text without `Cannot use import statement outside a module` errors.

## What to Change

### 1. `tools/world-mcp/package.json`: add `type` field

Add `"type": "module"` to the top-level fields of `package.json`. No other fields change.

### 2. Add `.js` suffix to every relative import in `src/` and `tests/`

For every relative import in `tools/world-mcp/src/**/*.ts` and `tools/world-mcp/tests/**/*.ts`, append `.js` to the import specifier. Examples (illustrative; the actual edits cover all 239 sites):

- `import type { ToolCapability } from "./tools/describe-capabilities";` → `import type { ToolCapability } from "./tools/describe-capabilities.js";`
- `export { openIndexDb } from "./open";` → `export { openIndexDb } from "./open.js";`
- `} from "./path";` → `} from "./path.js";`

Type-only imports, re-exports, and barrel exports all follow the same rule — the `.js` suffix is required for ESM resolution regardless of import kind.

### 3. Replace `__dirname` with `import.meta.dirname` in 7 source files

In each of the following files, replace `__dirname` (and `__filename`, if any) usage with `import.meta.dirname` (or `import.meta.filename` for `__filename` sites). The patterns are localized:

- `tools/world-mcp/src/server.ts` (`path.join(__dirname, ...)`)
- `tools/world-mcp/src/build-info.ts` (`process.cwd()` start-array, `path.resolve(__dirname, ...)`)
- `tools/world-mcp/src/db/path.ts` (`findRepoRootFrom(__dirname)`)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (`path.resolve(__dirname, ...)`)
- `tools/world-mcp/src/tools/get-record-schema.ts` (start-array `__dirname` + `path.resolve(__dirname, ...)`)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (start-array `__dirname`)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (verify exact usage at edit time; pattern is path-resolution)

For each file: locate every `__dirname` reference (typically inside `path.resolve(__dirname, ...)`, `path.join(__dirname, ...)`, or `findRepoRootFrom(__dirname)` calls), replace `__dirname` with `import.meta.dirname`. No surrounding logic changes; the resolved path semantics are byte-identical.

### 4. Rebuild and re-verify

Run `npm --prefix tools/world-mcp run clean && npm --prefix tools/world-mcp run build` to regenerate `dist/`. Then `npm --prefix tools/world-mcp test` to confirm all tests pass. Smoke the CLI binaries via `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --help` and `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help` to confirm the shebang + ESM interaction works.

## Files to Touch

- `tools/world-mcp/package.json` (modify — add `"type": "module"`)
- `tools/world-mcp/src/server.ts` (modify — `__dirname` → `import.meta.dirname`)
- `tools/world-mcp/src/build-info.ts` (modify — same)
- `tools/world-mcp/src/db/path.ts` (modify — same)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — same)
- `tools/world-mcp/src/tools/get-record-schema.ts` (modify — same)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify — same)
- `tools/world-mcp/src/tools/get-canonical-vocabulary.ts` (modify — same)
- `tools/world-mcp/src/**/*.ts` (modify — append `.js` to every relative import; sites included in the 239 count)
- `tools/world-mcp/tests/**/*.ts` (modify — same as above; sites included in the 239 count)

## Out of Scope

- Upgrading `typescript`, `@types/node`, `better-sqlite3`, or any MCP server dependency past current pins. Dependabot bumps handled separately.
- Changing any MCP tool's input/output schema, handler logic, retrieval semantics, or context-packet shape. This ticket preserves runtime behavior byte-identically.
- Modifying CLI binary names, `bin` field entries, or the package.json `exports` surface. The two existing CLI binaries (`validate-patch-plan`, `compute-pg-hashes`) keep their existing paths and argv interfaces.
- Adding new MCP tools or removing existing ones.
- Replacing `import.meta.dirname` with `fileURLToPath(import.meta.url)` + `path.dirname(...)`. Node 22+ native is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/world-mcp run clean && npm --prefix tools/world-mcp run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. `npm --prefix tools/world-mcp test` exits 0 with all existing tests passing.
3. `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/world-mcp/src tools/world-mcp/tests` returns 0 (no extensionless relative imports remain).
4. `grep -rE "__dirname|__filename" tools/world-mcp/src` returns empty (no residual CJS-only globals).
5. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --help` and `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help` both output usage text without `Cannot use import statement outside a module` or `require is not defined` errors.

### Invariants

1. No runtime behavior change: MCP tool responses (records returned, schemas served, packets assembled, retrieval results) byte-identical pre/post-migration on identical inputs.
2. No public API change: the package's `exports` field, MCP tool registry, CLI binary names, and consumed-by-others surface remain unchanged.
3. `package.json` `"type"` field is `"module"` after the change.
4. Every relative import in `src/` and `tests/` carries the `.js` suffix.
5. No source file under `tools/world-mcp/src/` references `__dirname` or `__filename`.

## Test Plan

### New/Modified Tests

1. `None — config-and-suffix-and-shim ticket; verification is command-based against the existing world-mcp test suite, which already exercises every MCP tool and the modified path-resolution sites.`

### Commands

1. `npm --prefix tools/world-mcp run clean && npm --prefix tools/world-mcp run build && npm --prefix tools/world-mcp test` (targeted package verification)
2. `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/world-mcp/src tools/world-mcp/tests` (must return 0)
3. `grep -rE "__dirname|__filename" tools/world-mcp/src` (must return empty)
4. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js --help && node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --help` (CLI binary ESM smoke)
