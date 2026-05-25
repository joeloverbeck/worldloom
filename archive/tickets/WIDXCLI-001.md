# WIDXCLI-001: Add explicit world-root resolution to `world-index` CLI

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — `tools/world-index/src/cli.ts`, a shared CLI world-root helper/test surface under `tools/world-index/src/`, `tools/world-index/tests/`, `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md`.
**Deps**: `archive/tickets/MCPCLI-001.md`.

## Problem

At intake, `archive/tickets/MCPCLI-001.md` had removed cwd-fragile world-root behavior from the MCP patch-plan CLIs and signer, but the directly adjacent `world-index` CLI still derived every command's `worldRoot` from `process.cwd()`. Running `node dist/src/cli.js build <world>` or `world-index sync <world>` from `tools/world-index/` could therefore target `tools/world-index/worlds/...` instead of the repository root and fail with misleading world-not-found/index-path errors.

The pre-ticket source evidence was `tools/world-index/src/cli.ts`: `main()` set `const worldRoot = process.cwd()` and passed it into `build`, `init`, `sync`, `inspect`, `render`, `stats`, and `verify`. `tools/world-index/README.md` listed the commands but did not document a root flag, env var, auto-discovery, or cwd requirement.

## Assumption Reassessment (2026-05-25)

1. At intake, `tools/world-index/src/cli.ts` owned command-line argument parsing for the package but had no `--world-root` option; the live root source was `process.cwd()`.
2. The command implementations already accept an explicit `worldRoot` parameter (`tools/world-index/src/commands/build.ts`, `init.ts`, `sync.ts`, `inspect.ts`, `render.ts`, `stats.ts`, `verify.ts`), so this ticket should not require command-level API changes.
3. Shared boundary under audit: the `world-index` CLI root-resolution contract used by operators, docs, tests, and downstream proof commands. It should align with the MCP CLI contract landed in `archive/tickets/MCPCLI-001.md`: explicit flag > `WORLDLOOM_ROOT` > marker auto-discovery > clear failure.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` treats the world index as derived machine-facing state under `worlds/<slug>/_index/`; deterministic tooling should not silently point at a package-local pseudo-root.
5. HARD-GATE semantics are not changed directly, but `world-index sync/build` are part of recovery and proof workflows named by HARD-GATE docs. This ticket must not weaken approval-token, submit, validator, or patch-engine behavior.
6. Adjacent contradiction classified as future cleanup now made concrete: `archive/tickets/MCPCLI-001.md` explicitly left `tools/world-index/src/cli/` out of scope while noting it follows the same cwd pattern.
7. Pre-edit package baseline passed from `tools/world-index`: `npm run build` and `npm test` both passed before source edits, so later package failures are attributable to this ticket unless proven otherwise.
8. Same-seam docs widening: `docs/WORKFLOWS.md` is a quick-reference surface for `world-index` commands, so it must move with `tools/world-index/README.md` and `docs/MACHINE-FACING-LAYER.md`.
9. Post-ticket review found one remaining same-seam CLI help drift: `renderHelp()` returned exit code text that still described code 2 only as invalid world slug even though root-resolution failure also exits 2. The resumed implementation owns that help/test correction.

## Architecture Check

1. Reusing the MCPCLI precedence model is cleaner than writing louder cwd docs because it fixes the failure mode and gives operators an escape hatch for non-default checkouts.
2. No backwards-compatibility aliasing/shims: the default no-flag behavior becomes auto-discovery from cwd, which preserves repo-root invocations and repairs package-subdirectory invocations when markers are present.

## Verification Layers

1. CLI flag/env/auto precedence -> unit tests for the world-index root resolver.
2. All world-index subcommands consume the resolved root -> codebase grep-proof plus CLI-level tests for at least one world-scoped command from a package-subdirectory cwd.
3. Docs reflect the new contract -> grep-proof over `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md`.
4. Existing package behavior preserved -> `cd tools/world-index && npm run build && npm test`.

## Landed Changes

### 1. Added world-root resolution to the CLI

Added `--world-root <path>` parsing to `tools/world-index/src/cli.ts`, `WORLDLOOM_ROOT` support, and upward auto-discovery from cwd looking for both `docs/FOUNDATIONS.md` and `worlds/`. On success, world-scoped commands emit `[world-root] <path> (source: <source>)` to stderr before opening or mutating world-index state. On failure, the CLI exits 2 and lists attempted paths before dispatching to command implementations.

### 2. Covered command dispatch

Threaded the resolved root into `build`, `init`, `sync`, `inspect`, `render`, `stats`, and `verify`. Preserved `--help`, `--version`, unknown-command, and missing-argument behavior without requiring a world root when no command execution needs one.

### 3. Truthed CLI help and docs

Updated `tools/world-index/src/cli.ts` help text, `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md` so world-index commands name the flag/env/auto-discovery contract and no longer rely on hidden cwd knowledge. The `--help` exit-code table now documents that code 2 covers invalid world slugs and world-root resolution failure.

## Files to Touch

- `tools/world-index/src/cli.ts` (modify)
- `tools/world-index/src/cli-world-root.ts` (new)
- `tools/world-index/tests/cli-world-root.test.ts` (new)
- `tools/world-index/tests/cli-smoke.test.ts` (modify)
- `tools/world-index/tests/cli-init.test.ts` (modify)
- `tools/world-index/tests/helpers/atomic-fixture.ts` (modify)
- `tools/world-index/README.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `docs/WORKFLOWS.md` (modify)

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
2. `tools/world-index/tests/cli-smoke.test.ts` — command invocation from nested cwd uses the discovered repo root and explicit flag precedence beats env/cwd.
3. `tools/world-index/tests/cli-init.test.ts` / `tools/world-index/tests/helpers/atomic-fixture.ts` — fixture roots include the root-resolution markers and existing CLI tests accept the stderr trace.
4. `tools/world-index/tests/cli-smoke.test.ts` — `--help` coverage asserts the exit-code text includes world-root resolution failure.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build`.
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-smoke.test.js dist/tests/cli-init.test.js`.
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm test`.

## Outcome

Completed on 2026-05-25.

`world-index` now resolves the worldloom project root deterministically for every world-scoped CLI command:

- `--world-root <path>` wins over `WORLDLOOM_ROOT`, which wins over upward auto-discovery from cwd.
- Auto-discovery requires both `docs/FOUNDATIONS.md` and `worlds/`.
- Successful world-scoped commands emit `[world-root] <path> (source: explicit_flag|env_var|auto_discovery)` to stderr.
- Resolution failures exit 2 with attempted paths, before command dispatch can open a wrong package-local `_index`.
- `--help`, `--version`, unknown-command, and missing-argument paths do not require root resolution.

Docs now describe the same contract in `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md`.

Outcome amended: 2026-05-25. A post-ticket review blocker found that `world-index --help` still described exit code 2 only as invalid world slug. The resumed implementation updated the help text to `invalid world slug or world-root resolution failure` and added focused help coverage in `tools/world-index/tests/cli-smoke.test.ts`.

## Verification Result

1. Pre-edit baseline: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build` — passed.
2. Pre-edit baseline: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm test` — passed, 132 tests.
3. Final build: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build` — passed.
4. Focused compiled CLI proof: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-smoke.test.js dist/tests/cli-init.test.js` — passed, 14 tests.
5. Final package suite: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm test` — passed, 139 tests.
6. CLI dispatch sweep: `rg -n "resolveWorldRoot|formatWorldRootTrace|formatWorldRootFailure|process\\.cwd\\(\\)" tools/world-index/src/cli.ts tools/world-index/src/cli-world-root.ts` — confirmed `cli.ts` calls the resolver and only passes `process.cwd()` into root discovery.
7. Docs contract sweep: `rg -n "world-index.*--world-root|WORLDLOOM_ROOT|auto-discovery|\\[world-root\\]" tools/world-index/README.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md archive/tickets/WIDXCLI-001.md` — confirmed the new contract is documented on the package README, machine-facing docs, workflow quick-reference, and closeout ticket.
8. Post-review final build: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm run build` — passed.
9. Post-review focused compiled CLI proof: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && node --test dist/tests/cli-world-root.test.js dist/tests/cli-smoke.test.js dist/tests/cli-init.test.js` — passed, 14 tests.
10. Post-review final package suite: `cd /home/joeloverbeck/projects/worldloom/tools/world-index && npm test` — passed, 139 tests.
11. Help-text contract sweep: `rg -n 'invalid world slug|world-root resolution failure' tools/world-index/src/cli.ts tools/world-index/tests/cli-smoke.test.ts archive/tickets/WIDXCLI-001.md` — confirmed source help text and focused test both include the root-resolution failure wording.

## Deviations

- Same-seam docs widened from the draft to include `docs/WORKFLOWS.md`, because it is an operator quick-reference for `world-index` commands.
- Existing CLI tests now accept the root-resolution trace on stderr for world-scoped commands; stdout remains reserved for command output.

## Post-Ticket Review Blocker Resolution (2026-05-25)

Resolved. Review found a remaining same-seam user-facing CLI contract drift in `tools/world-index/src/cli.ts`: root-resolution failure exits 2, but `renderHelp()` still documented exit code 2 only as `invalid world slug`. The resumed implementation updated the help text and focused CLI smoke coverage, then reran build, focused compiled CLI tests, and the full package suite successfully.

Completed follow-up action:

1. Updated the `world-index --help` exit-code text so exit code 2 covers invalid world slug and world-root resolution failure.
2. Updated focused CLI help coverage so the documented exit-code meaning is asserted.
3. Rebuilt `tools/world-index`, reran the focused CLI tests and package suite, and restored `Status: COMPLETED`.
