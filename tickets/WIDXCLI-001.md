# WIDXCLI-001: Add explicit world-root resolution to `world-index` CLI

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/cli.ts`, likely a shared CLI world-root helper/test surface under `tools/world-index/src/`, `tools/world-index/tests/`, `tools/world-index/README.md`, and `docs/MACHINE-FACING-LAYER.md`.
**Deps**: `archive/tickets/MCPCLI-001.md`.

## Problem

`archive/tickets/MCPCLI-001.md` removed cwd-fragile world-root behavior from the MCP patch-plan CLIs and signer, but the directly adjacent `world-index` CLI still derives every command's `worldRoot` from `process.cwd()`. Running `node dist/src/cli.js build <world>` or `world-index sync <world>` from `tools/world-index/` can therefore target `tools/world-index/worlds/...` instead of the repository root and fail with misleading world-not-found/index-path errors.

The active source evidence is `tools/world-index/src/cli.ts`: `main()` sets `const worldRoot = process.cwd()` and passes it into `build`, `init`, `sync`, `inspect`, `render`, `stats`, and `verify`. `tools/world-index/README.md` lists the commands but does not document a root flag, env var, auto-discovery, or cwd requirement.

## Assumption Reassessment (2026-05-25)

1. `tools/world-index/src/cli.ts` owns command-line argument parsing for the package and currently has no `--world-root` option; the live root source is `process.cwd()`.
2. The command implementations already accept an explicit `worldRoot` parameter (`tools/world-index/src/commands/build.ts`, `init.ts`, `sync.ts`, `inspect.ts`, `render.ts`, `stats.ts`, `verify.ts`), so this ticket should not require command-level API changes.
3. Shared boundary under audit: the `world-index` CLI root-resolution contract used by operators, docs, tests, and downstream proof commands. It should align with the MCP CLI contract landed in `archive/tickets/MCPCLI-001.md`: explicit flag > `WORLDLOOM_ROOT` > marker auto-discovery > clear failure.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` treats the world index as derived machine-facing state under `worlds/<slug>/_index/`; deterministic tooling should not silently point at a package-local pseudo-root.
5. HARD-GATE semantics are not changed directly, but `world-index sync/build` are part of recovery and proof workflows named by HARD-GATE docs. This ticket must not weaken approval-token, submit, validator, or patch-engine behavior.
6. Adjacent contradiction classified as future cleanup now made concrete: `archive/tickets/MCPCLI-001.md` explicitly left `tools/world-index/src/cli/` out of scope while noting it follows the same cwd pattern.

## Architecture Check

1. Reusing the MCPCLI precedence model is cleaner than writing louder cwd docs because it fixes the failure mode and gives operators an escape hatch for non-default checkouts.
2. No backwards-compatibility aliasing/shims: the default no-flag behavior becomes auto-discovery from cwd, which preserves repo-root invocations and repairs package-subdirectory invocations when markers are present.

## Verification Layers

1. CLI flag/env/auto precedence -> unit tests for the world-index root resolver.
2. All world-index subcommands consume the resolved root -> codebase grep-proof plus CLI-level tests for at least one world-scoped command from a package-subdirectory cwd.
3. Docs reflect the new contract -> grep-proof over `tools/world-index/README.md` and `docs/MACHINE-FACING-LAYER.md`.
4. Existing package behavior preserved -> `cd tools/world-index && npm run build && npm test`.

## What to Change

### 1. Add world-root resolution to the CLI

Add `--world-root <path>` parsing to `tools/world-index/src/cli.ts`, read `WORLDLOOM_ROOT`, and auto-discover by walking upward from cwd looking for both `docs/FOUNDATIONS.md` and `worlds/`. On success, emit `[world-root] <path> (source: <source>)` to stderr for commands that open or mutate world-index state. On failure, exit 2 and list attempted paths before dispatching to command implementations.

### 2. Cover command dispatch

Thread the resolved root into `build`, `init`, `sync`, `inspect`, `render`, `stats`, and `verify`. Preserve `--help`, `--version`, and argument validation behavior without requiring a world root when no command execution needs one.

### 3. Update docs

Update `tools/world-index/README.md` and `docs/MACHINE-FACING-LAYER.md` so world-index commands name the flag/env/auto-discovery contract and no longer rely on hidden cwd knowledge.

## Files to Touch

- `tools/world-index/src/cli.ts` (modify)
- `tools/world-index/src/cli-world-root.ts` or equivalent helper (new, if useful)
- `tools/world-index/tests/cli-world-root.test.ts` or equivalent (new)
- `tools/world-index/tests/cli.test.ts` or equivalent compiled CLI dispatch coverage (new/modify, if existing coverage is absent)
- `tools/world-index/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)

## Out of Scope

- Changing world-index command implementation semantics beyond passing the resolved root.
- Changing MCP patch-plan CLIs; owned by `archive/tickets/MCPCLI-001.md`.
- Changing patch-engine, validators, or world content.

## Acceptance Criteria

### Tests That Must Pass

1. Resolver tests prove flag > env > auto-discovery > clear failure, including invalid explicit flag failing without fallback.
2. A CLI-level test proves a world-index command invoked from a package subdirectory resolves the repository root and reaches the intended world/index path.
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build && npm test` passes.

### Invariants

1. `--help` and `--version` do not require a world root.
2. World-scoped commands never silently use a package directory as world root when the repository root is discoverable above cwd.
3. Resolution traces go to stderr so command stdout remains machine-readable where applicable.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/cli-world-root.test.ts` — resolver precedence and failure-shape coverage.
2. CLI dispatch coverage — command invocation from nested cwd uses the discovered repo root.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build`.
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && node --test dist/tests/cli-world-root.test.js`.
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm test`.
