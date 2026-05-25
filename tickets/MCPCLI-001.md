# MCPCLI-001: Add `--world-root` flag (with auto-discovery fallback) to MCP CLI tools

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/cli/submit-patch-plan.ts`, `tools/world-mcp/src/cli/validate-patch-plan.ts`, `tools/world-mcp/src/cli/sign-approval-token.ts`, `tools/world-mcp/src/cli/compute-pg-hashes.ts`, a shared `tools/world-mcp/src/cli/_resolve-world-root.ts` helper module, plus their test files; `docs/MACHINE-FACING-LAYER.md` and the relevant skill SKILL.md CLI-invocation paragraphs. No validator change, no patch-engine change, no schema change. No backwards-compat shim path.
**Deps**: None.

## Problem

`submit-patch-plan`, `validate-patch-plan`, `sign-approval-token`, and `compute-pg-hashes` CLIs all resolve the world-root path implicitly from `process.cwd()`. There is no explicit `--world-root` flag; there is no documented auto-discovery from a marker file. When an operator runs the CLI from a non-project-root cwd (a common case: `cd tools/world-mcp && npm run build` leaves cwd in that subdirectory), the CLI fails with `{"ok": false, "code": "patch_engine_error", "message": "Index missing for world 'erotica-world'."}` — a misdirection that points at the world-index when the actual failure is path resolution.

Observed in the 2026-05-25 red-bunny PG-2 turn-cycle session: after rebuilding the validators + world-mcp packages from `tools/world-mcp/`, the operator ran `submit-patch-plan` from that subdirectory and hit the "Index missing" error. The world.db file existed at `/home/joeloverbeck/projects/worldloom/worlds/erotica-world/_index/world.db`, but the CLI looked for it at `tools/world-mcp/worlds/erotica-world/_index/world.db` (process.cwd() + relative resolve). The fix was to `cd /home/joeloverbeck/projects/worldloom` and re-invoke — but the error message did not point at the cwd-dependency.

Two compounding problems:

1. **Implicit cwd-dependency is fragile.** The CLI is documented as "run from project root" in the SKILL.md prose, but the binding is invisible to the operator until a misleading error fires. Any workflow that requires running a build (`npm run build` in a subdirectory) followed by a CLI invocation is at risk.

2. **No auto-discovery.** The repo has a clear marker — the `worlds/` directory at the project root, or `package.json` with `"name": "@worldloom/..."` at any tools-package root, or the `docs/FOUNDATIONS.md` file at the repo root. None of these are used to locate the world-root when cwd is wrong.

The FOUNDATIONS-aligned principle: §Tooling Recommendation requires deterministic behavior from machine-facing tooling. A CLI that silently resolves a path against cwd, and fails with a misdirecting error when cwd is wrong, is non-deterministic from the operator's standpoint.

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/cli/submit-patch-plan.ts` and the other three CLIs do not parse a `--world-root` flag. The world-root is implicitly `process.cwd()` because `openExistingIndex(worldRoot, worldSlug)` in `tools/world-index/src/index/open.ts:163-169` is called with `process.cwd()` as `worldRoot` (verified via `grep -n "process.cwd" tools/world-mcp/src/`). The CLIs share this binding through the `tools/world-mcp/src/tools/` handlers.

2. `docs/MACHINE-FACING-LAYER.md` documents the CLIs as run from the project root but does not name the failure mode if cwd is wrong. `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token and §Validating and submitting the plan paragraphs reference the CLIs by absolute path (`node tools/world-mcp/dist/src/cli/...`) but don't enforce cwd.

3. Cross-skill boundary under audit: the four CLIs share the world-root resolution surface. The shared boundary is a new helper `tools/world-mcp/src/cli/_resolve-world-root.ts` that all four CLIs consume. The contract: precedence is explicit `--world-root` flag > `WORLDLOOM_ROOT` env var > auto-discovery via walking up from cwd looking for a `worlds/` directory + `docs/FOUNDATIONS.md` marker > clear error naming the resolution failure.

4. FOUNDATIONS §Tooling Recommendation principle: machine-facing tools must be deterministic. The new resolver enforces this — every invocation explicitly answers "where is the world-root and why" via an emitted resolution-trace at the start of the CLI's stderr stream (visible at `--verbose` or when verbose-by-default).

5. Schema-extension audit: no schema field is added or removed. The CLI flag surface gains one optional flag (`--world-root`) and one env var read (`WORLDLOOM_ROOT`); both are additive. The error-message surface narrows from "Index missing for world '<slug>'" (misleading) to "World root resolution failed: <traceback>" when the misdirection class applies.

6. Adjacent contradictions exposed during reassessment: `compute-pg-hashes` does not actually need the world-root (it reads only `--plan` and `--pg` paths and computes hashes locally). It still gets the flag for consistency but uses it only when an optional future feature (load the engine's canonical-JSON serializer from a world-pinned package version) might consume it. Track that as out-of-scope here; for now `compute-pg-hashes` accepts but ignores `--world-root`. Or omit the flag from that CLI and document why. *Decision: omit from `compute-pg-hashes`; document the exclusion.*

## Architecture Check

1. **Why this is cleaner than alternatives.** Three alternatives considered:

   - *Hard-code `process.cwd()` and document loudly.* Doesn't help operator-error recovery; the misleading error persists.
   - *Auto-discover via walking up only (no flag).* Auto-discovery is convenient but invisible; an operator who genuinely wants to point at a non-default world-root has no escape hatch. Adding the flag with auto-discovery as the fallback gives both.
   - *Read from a config file (`worldloom.config.json`).* Adds a new top-level config surface; over-engineered for this scope.

   The chosen design — explicit flag > env var > auto-discovery via marker — is the standard CLI-resolution pattern, gives operators a clear escape hatch, and emits a resolution-trace to stderr so any future ambiguity is visible.

2. **No backwards-compatibility shims.** When neither the flag nor the env var is set AND auto-discovery succeeds, the CLI's behavior is equivalent to today's `process.cwd()` (because today's "correct" cwd is the project root, which is exactly what auto-discovery will find). When today's "wrong cwd" case occurs, the CLI now succeeds via auto-discovery instead of failing with a misleading message. No shim path; the legacy implicit-cwd behavior is replaced cleanly.

## Verification Layers

1. CLI flag parsed correctly → unit-test grep-proof (`grep -n "world-root" tools/world-mcp/src/cli/submit-patch-plan.ts tools/world-mcp/src/cli/validate-patch-plan.ts tools/world-mcp/src/cli/sign-approval-token.ts` returns the flag definitions; `grep -n "WORLDLOOM_ROOT" tools/world-mcp/src/cli/_resolve-world-root.ts` returns the env-var read).
2. Resolution precedence verified → unit-test invariants in `tools/world-mcp/tests/cli/_resolve-world-root.test.ts`: (a) explicit flag wins over env var; (b) env var wins over auto-discovery; (c) auto-discovery walks up from cwd looking for `worlds/` + `docs/FOUNDATIONS.md`; (d) all three failed produces a clear error naming each attempted resolution path; (e) the resolved world-root passes through to `openExistingIndex` unchanged.
3. Auto-discovery scopes verified → integration test (`tools/world-mcp/tests/integration/auto-discovery.test.ts`): the test runs the CLI from a nested subdirectory (`tools/world-mcp/dist/`) and confirms auto-discovery finds the project root.
4. Misleading-error class closed → integration test asserts the "Index missing" message is no longer emitted when the root is auto-discoverable; instead, the CLI succeeds. When auto-discovery genuinely fails (no `worlds/` found anywhere up the tree), the new "World root resolution failed" message is emitted and names the attempted paths.
5. Existing-bundle regression → skill dry-run (running `submit-patch-plan` against a synthetic envelope from `cd tools/world-mcp` succeeds with auto-discovery; from arbitrary other directories succeeds too).
6. Full-suite regression → codebase verification command (`cd tools/world-mcp && npm test`; `bash scripts/check-all.sh`).

## What to Change

### 1. New shared helper `tools/world-mcp/src/cli/_resolve-world-root.ts`

```ts
import { existsSync } from "node:fs";
import path from "node:path";

export interface WorldRootResolution {
  worldRoot: string;
  source: "explicit_flag" | "env_var" | "auto_discovery";
  attempted: string[];
}

export interface WorldRootResolutionError {
  message: string;
  attempted: string[];
}

const MARKERS = ["docs/FOUNDATIONS.md", "worlds"];

export function resolveWorldRoot(opts: {
  flag?: string;
  envVar?: string;
  cwd: string;
}): WorldRootResolution | WorldRootResolutionError {
  const attempted: string[] = [];

  if (opts.flag !== undefined && opts.flag.length > 0) {
    const resolved = path.resolve(opts.flag);
    attempted.push(`--world-root=${resolved}`);
    if (isWorldRoot(resolved)) return { worldRoot: resolved, source: "explicit_flag", attempted };
    return { message: `--world-root=${resolved} is not a valid worldloom project root (must contain ${MARKERS.join(" + ")}).`, attempted };
  }

  if (opts.envVar !== undefined && opts.envVar.length > 0) {
    const resolved = path.resolve(opts.envVar);
    attempted.push(`WORLDLOOM_ROOT=${resolved}`);
    if (isWorldRoot(resolved)) return { worldRoot: resolved, source: "env_var", attempted };
    return { message: `WORLDLOOM_ROOT=${resolved} is not a valid worldloom project root (must contain ${MARKERS.join(" + ")}).`, attempted };
  }

  let cursor = path.resolve(opts.cwd);
  while (true) {
    attempted.push(`auto-discovery: ${cursor}`);
    if (isWorldRoot(cursor)) return { worldRoot: cursor, source: "auto_discovery", attempted };
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return {
    message: `World root resolution failed. Provide --world-root <path>, set WORLDLOOM_ROOT, or run from a directory inside a worldloom project (auto-discovery walks up looking for ${MARKERS.join(" + ")}).`,
    attempted
  };
}

function isWorldRoot(dir: string): boolean {
  return MARKERS.every((m) => existsSync(path.join(dir, m)));
}
```

### 2. Wire the helper into three CLIs

In `tools/world-mcp/src/cli/submit-patch-plan.ts`, `validate-patch-plan.ts`, and `sign-approval-token.ts`:

- Add `worldRoot: { type: "string" }` to `parseArgs` options.
- Call `resolveWorldRoot({flag, envVar: process.env.WORLDLOOM_ROOT, cwd: process.cwd()})` early in `main()`.
- If resolution fails, exit code 2 with the resolution error message on stderr and the attempted-paths list.
- If resolution succeeds, log to stderr: `[world-root] <worldRoot> (source: <source>)` so the operator sees which path won.
- Pass the resolved `worldRoot` into the engine handlers (currently they receive `process.cwd()` implicitly; thread the resolved value through).

`compute-pg-hashes` is excluded from this change (it doesn't consume the world-root). Document this in the CLI's `HELP_TEXT`: "This CLI reads only the `--plan` and `--pg` files and does not require a worldloom project root; the other MCP CLIs do."

### 3. Update `docs/MACHINE-FACING-LAYER.md`

Add a §"World root resolution" subsection naming the precedence (flag > env var > auto-discovery), the marker files (`docs/FOUNDATIONS.md` + `worlds/`), and the resolution-trace stderr line. Cite this ticket.

### 4. Update SKILL.md workflow notes

In `.claude/skills/branching-story-bootstrap/SKILL.md`, `.claude/skills/branching-story-turn-cycle/SKILL.md`, and `.claude/skills/branching-story-prose-attach/SKILL.md` (and any other skill that invokes the CLIs), replace any "run from project root" prose with: "The MCP CLIs auto-discover the worldloom project root by walking up from the current working directory looking for `docs/FOUNDATIONS.md` + `worlds/`. If the CLI must target a non-default world-root, pass `--world-root <path>` or set `WORLDLOOM_ROOT`."

## Files to Touch

- `tools/world-mcp/src/cli/_resolve-world-root.ts` (new)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/src/cli/sign-approval-token.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/tests/cli/_resolve-world-root.test.ts` (new — unit tests for the resolver)
- `tools/world-mcp/tests/integration/cli-auto-discovery.test.ts` (new — integration tests run the CLIs from various cwds)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify HELP_TEXT only — document the exclusion)
- `docs/MACHINE-FACING-LAYER.md` (modify — §World root resolution subsection)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/branching-story-prose-attach/SKILL.md` (modify — CLI-invocation note)

## Out of Scope

- Adding `--world-root` to `compute-pg-hashes` (it doesn't consume the world-root; HELP_TEXT documents the exclusion).
- Adding a config file surface (`worldloom.config.json`). Auto-discovery + env var + flag is sufficient; a config file is over-engineered.
- Changing how the world-mcp server (long-running process) resolves the world-root. The server has its own bootstrap path (it's started from the project root by convention); this ticket is CLI-only.
- Updating `tools/world-index/src/cli/` (e.g., `world-index build`) — those CLIs follow the same cwd pattern but are not in the immediate failure-mode scope of this ticket. Track as MCPCLI-002 follow-up if desired.

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent 2>&1 | tail -5` reports all tests passing including `_resolve-world-root.test.ts` and `cli-auto-discovery.test.ts`.
2. `grep -n "resolveWorldRoot" tools/world-mcp/src/cli/submit-patch-plan.ts tools/world-mcp/src/cli/validate-patch-plan.ts tools/world-mcp/src/cli/sign-approval-token.ts` returns three call sites (one per CLI).
3. `grep -n "world-root\\|world_root\\|worldRoot" tools/world-mcp/src/cli/compute-pg-hashes.ts | grep -v HELP_TEXT` returns no flag-parsing or resolver-call lines (exclusion confirmed).
4. Auto-discovery from subdirectory: `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && node dist/src/cli/validate-patch-plan.js <test-envelope.json>` succeeds with `[world-root] /home/joeloverbeck/projects/worldloom (source: auto_discovery)` on stderr.
5. Explicit flag wins: `cd /tmp && WORLDLOOM_ROOT=/some/other/path node /home/joeloverbeck/projects/worldloom/tools/world-mcp/dist/src/cli/validate-patch-plan.js --world-root /home/joeloverbeck/projects/worldloom <test-envelope.json>` resolves to the flag value (env var is overridden).
6. Resolution-failure error message: `cd /tmp && unset WORLDLOOM_ROOT && node /home/joeloverbeck/projects/worldloom/tools/world-mcp/dist/src/cli/validate-patch-plan.js <test-envelope.json>` fails with the new "World root resolution failed" message naming the attempted paths.
7. Red-bunny regression: running `submit-patch-plan` against a fresh synthetic envelope from `cd tools/world-mcp` succeeds (no `cd ..` required).

### Invariants

1. The three CLIs (`submit`, `validate`, `sign`) accept an optional `--world-root <path>` flag and read `WORLDLOOM_ROOT` env var; resolution precedence is flag > env > auto-discovery > fail.
2. `compute-pg-hashes` does not accept `--world-root` (documented exclusion in HELP_TEXT).
3. Auto-discovery walks up from cwd looking for a directory containing BOTH `docs/FOUNDATIONS.md` and `worlds/` (combined marker; reduces false-positives from unrelated `worlds/`-named directories).
4. Resolution-trace is emitted to stderr at every CLI invocation as `[world-root] <path> (source: <flag|env|auto>)`.
5. Resolution failure produces exit code 2 (CLI-argument-class failure) with the new "World root resolution failed" message and the attempted-paths list — never the misleading "Index missing for world '<slug>'" error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/_resolve-world-root.test.ts` — 8+ test cases: explicit flag wins, env var wins when no flag, auto-discovery walks up correctly, auto-discovery stops at root, all-resolutions-failed produces clear error, invalid flag path produces clear error, invalid env var path produces clear error, marker-check requires both `docs/FOUNDATIONS.md` and `worlds/` (not just one).
2. `tools/world-mcp/tests/integration/cli-auto-discovery.test.ts` — spawns the actual CLI binaries from various cwds (project root, `tools/`, `tools/world-mcp/`, `tools/world-mcp/dist/`, `/tmp`); asserts the resolution outcome and stderr resolution-trace.
3. Existing CLI test files — verify no regression in `submit-patch-plan`, `validate-patch-plan`, `sign-approval-token` test suites under the new resolver indirection.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent 2>&1 | tail -10` (targeted package test).
2. `cd /home/joeloverbeck/projects/worldloom && bash scripts/check-all.sh` (full-pipeline regression).
3. Manual verification: from `cd tools/world-mcp`, run `node dist/src/cli/validate-patch-plan.js <existing-envelope.json>` (should succeed with auto-discovery trace on stderr). From `cd /tmp`, run with `--world-root /home/joeloverbeck/projects/worldloom` (should succeed with explicit-flag trace). From `cd /tmp` with no flag and no env, should fail with resolution-failed message.
4. The narrower verification boundary is the world-mcp package test suite + one end-to-end manual auto-discovery check; full validator regression is not required (no validator semantic changes).
