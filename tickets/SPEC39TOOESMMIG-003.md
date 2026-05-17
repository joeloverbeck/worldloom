# SPEC39TOOESMMIG-003: hooks ESM convert (complete partial migration)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/hooks` package.json `type` field adds `"module"`; 26 relative imports in `src/` and `tests/` gain `.js` suffix; 1 source file (`src/lib/pathing.ts`) replaces `__dirname` with `import.meta.dirname`.
**Deps**: None (independent of all other SPEC-39 tickets; hooks is consumed by neither tools/* nor downstream packages)

## Problem

`tools/hooks` already has its tsconfig migrated to `module: "Node16"` + `moduleResolution: "Node16"` (the prior brainstorm session that produced SPEC-39 landed that change in the working tree). This ticket completes the partial migration by addressing the three remaining surfaces: (a) `package.json` has no `"type"` declaration, so Node defaults to CJS even though tsconfig says Node16; (b) the 26 relative imports across `src/` and `tests/` are extensionless (e.g., `import { resolveRepoRoot } from "./lib/pathing"`) and need `.js` suffixes for ESM resolution to work; (c) `src/lib/pathing.ts` uses `__dirname`, which is undefined in ESM and must be replaced with `import.meta.dirname` (Node 22+ native; the package's `engines.node` already requires `>=22`).

Hooks is independent of every other tools/ package — it's invoked by Claude Code at hook-trigger time and has no file-dependency consumers in `tools/`. The migration is structurally isolated; only its own CI workflow (ci-hooks) needs to stay green.

## Assumption Reassessment (2026-05-17)

1. **Codebase**: `tools/hooks/package.json` currently has no `"type"` field. `tools/hooks/tsconfig.json` already uses `module: "Node16"` + `moduleResolution: "Node16"` and no longer carries `ignoreDeprecations: "6.0"` (verified via direct read — landed in the prior brainstorm session, currently uncommitted in working tree). Relative imports: 26 extensionless across `src/` and `tests/` (verified via grep); 0 `.js`-suffixed. `__dirname` usage: 1 file at `src/lib/pathing.ts:48` (`findRepoRootFrom(__dirname)`). Dependencies: only `better-sqlite3` (CJS-friendly under Node 22 ESM's CJS-from-ESM interop) and `node:*` builtins. `engines.node` is `>=22` so `import.meta.dirname` is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/hooks` is *"DONE (Node16/Node16, no `ignoreDeprecations`) | Add `"type": "module"` | Add `.js` suffix to 23 relative imports across `src/` + `tests/` | tsconfig already migrated in commit `<pending>`; 22/22 tests pass"*. This ticket implements the package.json + source-suffix work; the spec's import count was approximately right (spec said "23", actual is 26 — minor variance covered by the per-package grep at item 5). The `__dirname` site at `src/lib/pathing.ts` is scope expansion the spec didn't anticipate; documented at item 5.
3. **Cross-artifact boundary**: hooks has no file-dependency consumers in `tools/`. It is invoked at runtime by Claude Code per `.claude/settings.json.example` declarations against the hook script paths under `dist/`. The migration cannot break downstream package builds (there are no downstream packages); the only end-to-end check is `npm test` (which runs all hook unit tests) and the ci-hooks workflow's runtime.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 5 names `tools/hooks` as "Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation" — non-negotiable infrastructure for canon-handling discipline (Hook 2 redirects oversized `_source/` reads, Hook 3 blocks direct `Edit`/`Write` on canon records, Hook 5 runs post-apply validators). Aligning hooks' module system with the modern Node ESM trajectory completes the §Machine-Facing Layer's transition to a unified ESM surface across all five tools/ packages.
5. **Mismatch + correction**: SPEC-39's Risks section item 2 mentioned `__dirname` mitigation only for `src/cli.ts` in world-index. Codebase grep at decomposition time revealed `src/lib/pathing.ts` in hooks also uses `__dirname` (1 site, line 48). The replacement uses `import.meta.dirname` (Node 22+ native), which is functionally equivalent for the `findRepoRootFrom(__dirname)` pattern (the function walks upward from the given start directory looking for a repo marker). This expansion does not change SPEC-39's intent. Additionally, the spec stated 23 relative imports for hooks; actual count is 26 (verified via `grep -rEc`). Both refinements are sized into this ticket's What to Change.

## Architecture Check

1. Completing the partial hooks migration in a single ticket keeps the package's three remaining surfaces (`type` field, import suffixes, `__dirname` shim) co-located and reviewable as one diff. Splitting them would scatter related work without architectural benefit — the package.json flip alone breaks the existing build until the source-suffix work lands, and vice versa.
2. No backwards-compatibility shims introduced. `import.meta.dirname` is Node 22+ native and matches `engines.node: >=22`. The `.js` suffix discipline matches the convention `tools/patch-engine` and `tools/validators` already use. The hooks public surface (the 5 hook executables consumed by Claude Code via `.claude/settings.json.example`) remains byte-identical at the `dist/` shebang and CLI argv interface.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/hooks run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns empty.
2. **All 22 existing tests pass under the new module emission + suffix discipline + `__dirname` shim** → command-execution proof: `npm --prefix tools/hooks test` exits 0 with all 22 tests passing (the prior brainstorm session confirmed 22/22 baseline; this ticket preserves that count).
3. **No residual extensionless relative imports** → codebase grep-proof: `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/hooks/src tools/hooks/tests` returns 0.
4. **No residual `__dirname` usage in hooks source** → codebase grep-proof: `grep -rE "__dirname|__filename" tools/hooks/src` returns empty.

## What to Change

### 1. `tools/hooks/package.json`: add `type` field

Add `"type": "module"` to the top-level fields of `package.json`. No other fields change.

### 2. Add `.js` suffix to every relative import in `src/` and `tests/`

For every relative import in `tools/hooks/src/**/*.ts` and `tools/hooks/tests/**/*.ts`, append `.js` to the import specifier. Examples (illustrative; the actual edits cover all 26 sites):

- `import { resolveRepoRoot } from "./lib/pathing";` → `import { resolveRepoRoot } from "./lib/pathing.js";`
- `import { logDecision } from "../lib/logging";` → `import { logDecision } from "../lib/logging.js";`
- `import { emitAdditionalContext, readHookInput, type SubagentStartInput } from "./lib/hook-io";` → `import { ... } from "./lib/hook-io.js";`

Type-only imports (`import type { ... }`) and barrel imports follow the same rule — the `.js` suffix is required for ESM resolution regardless of whether the import is type-only at compile time.

### 3. Replace `__dirname` with `import.meta.dirname` in `src/lib/pathing.ts`

At `tools/hooks/src/lib/pathing.ts:48`, the line `const moduleRoot = findRepoRootFrom(__dirname);` becomes `const moduleRoot = findRepoRootFrom(import.meta.dirname);`. No surrounding logic changes; `import.meta.dirname` returns the same directory-path string `__dirname` returned under CJS.

### 4. Rebuild and re-verify

Run `npm --prefix tools/hooks run clean && npm --prefix tools/hooks run build` to regenerate `dist/`. Then `npm --prefix tools/hooks test` to confirm all 22 tests pass.

## Files to Touch

- `tools/hooks/package.json` (modify — add `"type": "module"`)
- `tools/hooks/src/lib/pathing.ts` (modify — `__dirname` → `import.meta.dirname` at line 48)
- `tools/hooks/src/**/*.ts` (modify — append `.js` to every relative import; 26 sites total across src/ and tests/)
- `tools/hooks/tests/**/*.ts` (modify — same as above; sites included in the 26 count)

## Out of Scope

- Upgrading `typescript`, `@types/node`, or `better-sqlite3` past their current pins. Dependabot handles version bumps separately.
- Changing any hook's decision logic, system-reminder format, or hook-input/output schema. This ticket preserves runtime behavior byte-identically.
- Modifying `.claude/settings.json.example` or the hook registration shapes. The hooks' compiled `dist/src/hookN-*.js` paths and CLI argv interface remain unchanged.
- Adding new hooks or removing existing ones. The 5-hook inventory (Hook 1–5) is preserved.
- Replacing `import.meta.dirname` with `fileURLToPath(import.meta.url)` + `path.dirname(...)`. Node 22+ native `import.meta.dirname` is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/hooks run clean && npm --prefix tools/hooks run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. `npm --prefix tools/hooks test` exits 0 with all 22 existing tests passing (matching the 22/22 baseline from the prior brainstorm session).
3. `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/hooks/src tools/hooks/tests` returns 0 (no extensionless relative imports remain).
4. `grep -rE "__dirname|__filename" tools/hooks/src` returns empty (no residual CJS-only globals).

### Invariants

1. No runtime behavior change: hook decisions (allow/deny/rewrite outputs, system-reminder text, log entries) byte-identical pre/post-migration on identical inputs.
2. No public API change: hook entry-point paths under `dist/src/` and their CLI argv interface remain unchanged; `.claude/settings.json.example` hook declarations do not need editing.
3. `package.json` `"type"` field is `"module"` after the change.
4. Every relative import in `src/` and `tests/` carries the `.js` suffix.
5. No source file under `tools/hooks/src/` references `__dirname` or `__filename`.

## Test Plan

### New/Modified Tests

1. `None — config-and-suffix ticket; verification is command-based against the existing hooks test suite (22 tests), which already exercises every hook entry point and the modified pathing module.`

### Commands

1. `npm --prefix tools/hooks run clean && npm --prefix tools/hooks run build && npm --prefix tools/hooks test` (targeted package verification; expect 22/22 tests pass)
2. `grep -rEc "from ['\"]\\.\\.?/[^.'\"]*['\"]" tools/hooks/src tools/hooks/tests` (must return 0)
3. `grep -rE "__dirname|__filename" tools/hooks/src` (must return empty)
