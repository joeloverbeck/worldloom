# SPEC39TOOESMMIG-003: hooks ESM convert (complete partial migration)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/hooks` package.json `type` field adds `"module"`; relative imports in `src/` and `tests/` gain `.js` suffixes; `src/lib/pathing.ts` and `tests/_shared.ts` replace `__dirname` with `import.meta.dirname`; `src/lib/hook-io.ts` resumes stdin after registering listeners so spawned compiled hook tests consume input reliably.
**Deps**: None (independent of all other SPEC-39 tickets; hooks is consumed by neither tools/* nor downstream packages)

## Problem

At intake, `tools/hooks` already had its tsconfig migrated to `module: "Node16"` + `moduleResolution: "Node16"`. This ticket completed the partial migration by addressing the remaining surfaces: (a) `package.json` had no `"type"` declaration, so Node defaulted to CJS even though tsconfig said Node16; (b) relative imports across `src/` and `tests/` were extensionless (e.g., `import { resolveRepoRoot } from "./lib/pathing"`) and needed `.js` suffixes for ESM resolution; (c) source/test repo-root helpers used `__dirname`, which is undefined in ESM and needed `import.meta.dirname`; and (d) the compiled child-process proof required `readHookInput` to resume stdin after registering listeners.

Hooks is independent of every other tools/ package — it's invoked by Claude Code at hook-trigger time and has no file-dependency consumers in `tools/`. The migration is structurally isolated; only its own CI workflow (ci-hooks) needs to stay green.

## Assumption Reassessment (2026-05-17)

1. **Codebase**: At intake, `tools/hooks/package.json` had no `"type"` field. `tools/hooks/tsconfig.json` already used `module: "Node16"` + `moduleResolution: "Node16"` and no longer carried `ignoreDeprecations: "6.0"`. Relative imports across `src/` and `tests/` were extensionless. `__dirname` usage existed in `src/lib/pathing.ts` and, on live proof, also in `tests/_shared.ts`; both break under ESM and now use `import.meta.dirname`. Dependencies remain only `better-sqlite3` and `node:*` builtins, and `engines.node` is `>=22` so `import.meta.dirname` is available.
2. **Spec/docs**: SPEC-39 §Deliverables row for `tools/hooks` is *"DONE (Node16/Node16, no `ignoreDeprecations`) | Add `"type": "module"` | Add `.js` suffix to 23 relative imports across `src/` + `tests/` | tsconfig already migrated in commit `<pending>`; 22/22 tests pass"*. This ticket implements the package.json + source-suffix work; the spec's import count was approximately right (spec said "23", actual is 26 — minor variance covered by the per-package grep at item 5). The `__dirname` site at `src/lib/pathing.ts` is scope expansion the spec didn't anticipate; documented at item 5.
3. **Cross-artifact boundary**: hooks has no file-dependency consumers in `tools/`. It is invoked at runtime by Claude Code per `.claude/settings.json.example` declarations against the hook script paths under `dist/`. The migration cannot break downstream package builds (there are no downstream packages); the only end-to-end check is `npm test` (which runs all hook unit tests) and the ci-hooks workflow's runtime.
4. **FOUNDATIONS principle restatement**: `docs/FOUNDATIONS.md` §Machine-Facing Layer item 5 names `tools/hooks` as "Claude Code enforcement points for context preface injection, large-read guards, engine-only mutation guards, subagent bootstrap, and post-write validation" — non-negotiable infrastructure for canon-handling discipline (Hook 2 redirects oversized `_source/` reads, Hook 3 blocks direct `Edit`/`Write` on canon records, Hook 5 runs post-apply validators). Aligning hooks' module system with the modern Node ESM trajectory completes the §Machine-Facing Layer's transition to a unified ESM surface across all five tools/ packages.
5. **Mismatch + correction**: SPEC-39's Risks section item 2 mentioned `__dirname` mitigation only for `src/cli.ts` in world-index. Codebase grep at decomposition time revealed `src/lib/pathing.ts` in hooks also used `__dirname`; implementation proof then exposed `tests/_shared.ts` as the same-seam compiled-test helper equivalent. Both now use `import.meta.dirname`, which is functionally equivalent for their repo-root path-resolution patterns. Additionally, the spec stated 23 relative imports for hooks; the live source/test surface was larger. These refinements do not change SPEC-39's intent.
6. **Proof-surface correction**: The sandboxed `npm --prefix tools/hooks test` lane failed because the compiled tests spawn hook child processes and the sandbox blocks `spawnSync /usr/local/bin/node` with `EPERM`. The same command passed when rerun with escalation. During proof, `readHookInput` also required a same-seam hardening: registering stdin listeners inside the returned promise and calling `process.stdin.resume()` makes spawned compiled hooks reliably consume JSON input, preserving the hook contract while making the package's accepted proof lane truthful.

## Architecture Check

1. Completing the partial hooks migration in a single ticket keeps the package's three remaining surfaces (`type` field, import suffixes, `__dirname` shim) co-located and reviewable as one diff. Splitting them would scatter related work without architectural benefit — the package.json flip alone breaks the existing build until the source-suffix work lands, and vice versa.
2. No backwards-compatibility shims introduced. `import.meta.dirname` is Node 22+ native and matches `engines.node: >=22`. The `.js` suffix discipline matches the convention `tools/patch-engine` and `tools/validators` already use. The hooks public surface (the 5 hook executables consumed by Claude Code via `.claude/settings.json.example`) remains byte-identical at the `dist/` shebang and CLI argv interface.

## Verification Layers

1. **Build produces no deprecation warnings or interop errors** → codebase grep-proof: `npm --prefix tools/hooks run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` returns no matches.
2. **All 22 existing tests pass under the new module emission + suffix discipline + directory-global/input handling shims** → command-execution proof: `npm --prefix tools/hooks test` exits 0 with all 22 tests passing; the Codex sandboxed run required escalation because child-process spawn returned `EPERM`.
3. **No residual extensionless relative imports** → codebase grep-proof: `rg -n "from ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/hooks/src tools/hooks/tests --pcre2` returns no matches.
4. **No residual `__dirname` usage in hooks source or tests** → codebase grep-proof: `rg -n "__dirname|__filename" tools/hooks/src tools/hooks/tests` returns no matches.

## Landed Changes

### 1. `tools/hooks/package.json`: add `type` field

Added `"type": "module"` to the top-level fields of `package.json`.

### 2. Add `.js` suffix to every relative import in `src/` and `tests/`

Every relative import in `tools/hooks/src/**/*.ts` and `tools/hooks/tests/**/*.ts` now carries a `.js` import specifier. Examples:

- `import { resolveRepoRoot } from "./lib/pathing";` → `import { resolveRepoRoot } from "./lib/pathing.js";`
- `import { logDecision } from "../lib/logging";` → `import { logDecision } from "../lib/logging.js";`
- `import { emitAdditionalContext, readHookInput, type SubagentStartInput } from "./lib/hook-io";` → `import { ... } from "./lib/hook-io.js";`

Type-only imports (`import type { ... }`) and barrel imports follow the same rule — the `.js` suffix is required for ESM resolution regardless of whether the import is type-only at compile time.

### 3. Replace CJS directory globals with `import.meta.dirname`

`tools/hooks/src/lib/pathing.ts` and `tools/hooks/tests/_shared.ts` now use `import.meta.dirname` for repo-root path resolution. No surrounding path-walk logic changed.

### 4. Harden hook stdin input for spawned proof

`tools/hooks/src/lib/hook-io.ts` now registers stdin listeners inside the returned promise and calls `process.stdin.resume()`, so compiled hook child processes spawned by the tests reliably consume the JSON input passed on stdin.

## Files to Touch

- `tools/hooks/package.json` (modify — add `"type": "module"`)
- `tools/hooks/src/lib/pathing.ts` (modify — `__dirname` → `import.meta.dirname` at line 48)
- `tools/hooks/src/lib/hook-io.ts` (modify — resume stdin after registering hook-input listeners)
- `tools/hooks/src/**/*.ts` (modify — append `.js` to relative imports)
- `tools/hooks/tests/_shared.ts` (modify — `__dirname` → `import.meta.dirname` for compiled-test repo-root resolution)
- `tools/hooks/tests/**/*.ts` (modify — append `.js` to relative imports)
- `specs/SPEC-39-tools-esm-migration.md` (modify — dated implementation note for the hooks row)

## Out of Scope

- Upgrading `typescript`, `@types/node`, or `better-sqlite3` past their current pins. Dependabot handles version bumps separately.
- Changing any hook's decision logic, system-reminder format, or hook-input/output schema. This ticket preserves runtime behavior byte-identically.
- Modifying `.claude/settings.json.example` or the hook registration shapes. The hooks' compiled `dist/src/hookN-*.js` paths and CLI argv interface remain unchanged.
- Adding new hooks or removing existing ones. The 5-hook inventory (Hook 1–5) is preserved.
- Replacing `import.meta.dirname` with `fileURLToPath(import.meta.url)` + `path.dirname(...)`. Node 22+ native `import.meta.dirname` is sufficient.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/hooks run clean && npm --prefix tools/hooks run build` exits 0 with no TypeScript deprecation warnings (no TS5107) and no ESM/CJS interop errors (no TS1479).
2. `npm --prefix tools/hooks test` exits 0 with all 22 existing tests passing. In this Codex session, the command required escalation because the sandbox blocked compiled-test child process spawns with `EPERM`.
3. `rg -n "from ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/hooks/src tools/hooks/tests --pcre2` returns no matches (no extensionless relative imports remain).
4. `rg -n "__dirname|__filename" tools/hooks/src tools/hooks/tests` returns no matches (no residual CJS-only globals remain in source or compiled-test helpers).

### Invariants

1. No runtime behavior change: hook decisions (allow/deny/rewrite outputs, system-reminder text, log entries) byte-identical pre/post-migration on identical inputs.
2. No public API change: hook entry-point paths under `dist/src/` and their CLI argv interface remain unchanged; `.claude/settings.json.example` hook declarations do not need editing.
3. `package.json` `"type"` field is `"module"` after the change.
4. Every relative import in `src/` and `tests/` carries the `.js` suffix.
5. No source or test file under `tools/hooks/src/` or `tools/hooks/tests/` references `__dirname` or `__filename`.

## Test Plan

### New/Modified Tests

1. `None — config-and-suffix-and-shim ticket; verification is command-based against the existing hooks test suite (22 tests), which already exercises every hook entry point, the modified pathing module, and hook stdin input handling.`

### Commands

1. `npm --prefix tools/hooks run clean && npm --prefix tools/hooks run build` (targeted package build; passed)
2. `npm --prefix tools/hooks test` (targeted package verification; passed with 22/22 tests when rerun with escalation because sandboxed child-process spawn returned `EPERM`)
3. `npm --prefix tools/hooks run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` (expected no matches; returned no matches)
4. `rg -n "from ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/hooks/src tools/hooks/tests --pcre2` (must return no matches)
5. `rg -n "__dirname|__filename" tools/hooks/src tools/hooks/tests` (must return no matches)

## Outcome

Completed on 2026-05-17. `tools/hooks` now declares ESM package mode, all relative source/test imports use `.js` suffixes, source and compiled-test repo-root path helpers use `import.meta.dirname`, and hook JSON input handling is robust for spawned compiled-hook tests. SPEC-39 has a dated hooks implementation note.

## Verification Result

- `npm --prefix tools/hooks run clean` — passed.
- `npm --prefix tools/hooks run build` — passed.
- `npm --prefix tools/hooks test` — sandboxed run failed because child-process spawn returned `EPERM`; escalated rerun passed with 22/22 tests.
- `npm --prefix tools/hooks run build 2>&1 | grep -E "deprecat|TS1479|TS5107"` — returned no matches.
- `rg -n "from ['\"]\\.\\.?/[^'\"]*(?<!\\.js)['\"]" tools/hooks/src tools/hooks/tests --pcre2` — returned no matches.
- `rg -n "__dirname|__filename" tools/hooks/src tools/hooks/tests` — returned no matches.

## Deviations

- The ticket's original `__dirname` scope named only `src/lib/pathing.ts`; live ESM proof also required `tests/_shared.ts`.
- `src/lib/hook-io.ts` moved with the migration because the accepted compiled-hook test lane exposed a same-seam stdin consumption bug under spawned child-process proof.
