# MANSTOSTUFIX-001: Auto-detect repo root in Manual Story Studio backend

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` backend (`src/cli.ts`, new `src/repo-root.ts`)
**Deps**: None (complemented by MANSTOSTUFIX-002, which can land independently)

## Problem

Before this ticket, the Manual Story Studio backend resolved every repository read — worlds, world canon facts (`world-source.ts`), world-level records/characters (`records.ts`), manual stories, beat templates, segments, prompts, manuscript, health — against `repoRoot`. `src/cli.ts` defaulted `repoRoot = process.cwd()` and only overrode it when `--repo-root` was passed explicitly.

When the backend was launched from the package directory (`tools/manual-story-studio/`) instead of the repo root and without `--repo-root`, `repoRoot` became the package dir. `worlds/` did not exist there, so `enumerateWorlds` returned `ok([])`. The UI reported "no worlds available" even though real worlds existed; **every** repo-read surface silently degraded to empty because they shared the same wrong `repoRoot`.

This was observed live: backend PID launched as `node dist/src/cli.js --port 5175` with cwd `tools/manual-story-studio` returned `{"worlds":[]}` while `worlds/animalia` and `worlds/erotica-world` (both with `WORLD_KERNEL.md`) existed at the repo root.

At intake, the README documented "run from the repo root… or pass `--repo-root`", so the old default was a known foot-gun rather than an intended behavior. This ticket made the default robust so launch-cwd no longer determines correctness.

## Assumption Reassessment (2026-06-03)

1. At intake, `src/cli.ts` `parseArgs` set `repoRoot = process.cwd()` and overrode only on `--repo-root`; `main()` passed the resolved `repoRoot` straight into `createServer`. Confirmed no other repo-root resolution existed before this ticket.
2. `src/server/http.ts` threads `options.repoRoot` into all read/write route registrations; it additionally resolves the static web bundle as `path.resolve(repoRoot, "tools/manual-story-studio/web/dist")` — so `repoRoot` must be the repo root for production static serving too, not only for reads.
3. The compiled entry point lives at `tools/manual-story-studio/dist/src/cli.js`; from `import.meta.url` the repo root is a fixed number of parent levels up (`dist/src` → `dist` → `manual-story-studio` → `tools` → repo root), independent of cwd. This is the reliable binary-relative anchor.
4. Repo-root marker: an ancestor directory containing both `worlds/` and `docs/FOUNDATIONS.md` uniquely identifies the worldloom repo root (a bare `worlds/` check alone could false-positive on an unrelated tree). Verified both markers exist at `/home/joeloverbeck/projects/worldloom`.
5. No backwards-compat shim is introduced: explicit `--repo-root` keeps exactly its current meaning and precedence; only the *unset* path changes.
6. No FOUNDATIONS enforcement surface, canon-write ordering, HARD-GATE, or Mystery Reserve surface is touched — this is read-root resolution in a non-canon authoring tool (`No LLM, no MCP, no patch engine`).

## Architecture Check

1. Extracting resolution into a pure `resolveRepoRoot()` function (new `src/repo-root.ts`) keeps `cli.ts` thin and makes the precedence logic unit-testable with temp dirs, instead of burying heuristics in `parseArgs`. Precedence is explicit and total: explicit flag → nearest marker-bearing ancestor of `process.cwd()` → binary-relative ancestor of the compiled entry point → typed failure. This is cleaner than a single cwd-or-flag branch because it removes the launch-cwd dependency entirely while preserving the explicit-override escape hatch.
2. No backwards-compatibility aliasing/shims: `--repo-root` semantics are unchanged; the change is additive on the previously-fragile default path.

## Verification Layers

1. Explicit `--repo-root` still wins over auto-detection -> unit test (`resolveRepoRoot` with flag set returns the flag value regardless of cwd).
2. Launch from package subdir resolves to the true repo root -> unit test (cwd = a nested temp subdir under a fake repo containing `worlds/` + `docs/FOUNDATIONS.md` returns the fake repo root).
3. Launch from outside any repo falls back to the binary-relative root -> unit test driving the binary-relative branch via injected entry-point path.
4. Resolution is a single canonical path consumed by all routes -> codebase grep-proof that `createServer` is called only with the `resolveRepoRoot()` result and no route re-derives a root.

## Landed Changes

### 1. New `src/repo-root.ts`

Added `resolveRepoRoot(opts: { explicit?: string; cwd: string; entryPointUrl: string }): ReadResult<string>` using the existing `ReadResult`/`ok`/`err` pattern from `src/read/result.ts`. Precedence:

1. If `explicit` is set and non-empty → `path.resolve(explicit)`.
2. Else walk up from `cwd`; return the first ancestor that contains both `worlds/` and `docs/FOUNDATIONS.md`.
3. Else derive the repo root from `entryPointUrl` (`fileURLToPath`, then ascend the known fixed depth from `dist/src/cli.js`) and verify it carries the same markers.
4. Else return a typed `repo_root_not_found` error with candidate and marker details in `cause`.

### 2. `src/cli.ts`

Replaced the `repoRoot = process.cwd()` default and inline `--repo-root` resolution so that, after arg parsing, `main()` calls `resolveRepoRoot()` with the explicit flag when present, the launch cwd, and `import.meta.url`. `--port` parsing is unchanged. Resolution errors now surface through the existing `main().catch` failure path rather than silently serving an empty repo.

## Files to Touch

- `tools/manual-story-studio/src/repo-root.ts` (new)
- `tools/manual-story-studio/src/cli.ts` (modify)
- `tools/manual-story-studio/test/repo-root.test.ts` (new)
- `tools/manual-story-studio/README.md` (modify — note that the backend now auto-detects the repo root; `--repo-root` remains the explicit override)

## Out of Scope

- Changing `--repo-root` flag semantics or its precedence.
- The boot-time fail-loud guard when no valid root is found (that is MANSTOSTUFIX-002; this ticket only returns the typed error for it to consume).
- Frontend/Vite changes (the proxy in `web/vite.config.ts` is unaffected).

## Acceptance Criteria

### Tests That Must Pass

1. `resolveRepoRoot` returns the explicit value when `--repo-root` is provided, ignoring cwd.
2. `resolveRepoRoot` returns the marker-bearing repo root when invoked from a nested subdirectory of that repo with no explicit flag.
3. `resolveRepoRoot` falls back to the binary-relative root when cwd is outside any repo, and returns a typed error when no markers are found on any path.
4. `cd tools/manual-story-studio && npm run test:backend` passes.

### Invariants

1. The repo root consumed by `createServer` is independent of the process launch cwd whenever the binary lives inside the worldloom checkout.
2. Explicit `--repo-root` always takes precedence over auto-detection.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/repo-root.test.ts` — covers the four-branch precedence (explicit / cwd-walk-up / binary-relative / not-found) using temp directories.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. Backend-only command is the correct boundary: this ticket touches no `web/` code, so the web test sub-run is not required to prove the resolution behavior (full `npm test` still run once as a regression gate).

## Outcome

Completed: 2026-06-03.

The backend now resolves the repo root independently of launch cwd when no `--repo-root` override is supplied. The resolver first honors an explicit override, then walks upward from `cwd` for the `worlds/` and `docs/FOUNDATIONS.md` markers, then falls back to the compiled CLI's repo-relative location. `src/cli.ts` consumes the resolved value once before `createServer`, so routes continue to share a single canonical root. The README now documents auto-detection and the explicit override.

No deviations from the implementation plan.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — passed after the `exactOptionalPropertyTypes` call-shape fix; 88 backend test files passed, including `dist/test/repo-root.test.js`.
2. `cd tools/manual-story-studio && npm test` — passed; backend build/tests passed and the web TypeScript test sub-run completed.
3. `rg -n 'createServer\(' tools/manual-story-studio/src/cli.ts tools/manual-story-studio/src` — confirmed the CLI calls `createServer({ repoRoot, port })` only after `resolveRepoRoot()` returns the canonical root; route registration remains centralized in `src/server/http.ts`.
