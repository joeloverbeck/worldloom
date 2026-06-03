# MANSTOSTUFIX-002: Fail loud at boot when the Manual Story Studio repo root has no worlds

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/manual-story-studio` backend (`src/cli.ts`, `src/server/preflight.ts`)
**Deps**: None (composes with archived `archive/tickets/MANSTOSTUFIX-001.md`; this ticket consumes its typed resolution error)

## Problem

Before this ticket, when the Manual Story Studio backend was pointed at a directory that was not the worldloom repo root, it started successfully and served `{"worlds":[]}` (and empty canon facts, characters, manual stories, etc.) with no signal that anything was wrong. `src/read/worlds.ts` returns `ok([])` for a missing `worlds/` directory, so a misconfigured launch was indistinguishable from a genuinely empty repo. The operator saw "no worlds available" in the UI and had no fast way to tell that the *root* was wrong rather than the *data* being absent.

This was the exact failure mode observed in the field: the backend launched from `tools/manual-story-studio/` (no `--repo-root`) silently served an empty world list while two real worlds existed at the repo root.

This ticket added a boot-time guard so a bad root surfaces immediately, with the resolved path printed, instead of masquerading as empty data. This is the diagnostic complement to MANSTOSTUFIX-001's auto-detection: detection removes the common case; the guard makes any *remaining* misconfiguration loud before the server listens.

## Assumption Reassessment (2026-06-03)

1. After MANSTOSTUFIX-001, `src/cli.ts` resolved `repoRoot` through `resolveRepoRoot()`, then called `createServer`, then `server.listen`, then printed the fixed banner (`console.error("Manual Story Studio" ...)`). There was no validation of `repoRoot` before `listen`. The guard now runs between root resolution and `createServer`.
2. `src/read/worlds.ts` `enumerateWorlds` still treats a missing `worlds/` directory as a non-error empty result (`ok([])`). That behavior is correct for the read API (a genuinely empty repo is valid); the misconfiguration signal therefore lives at boot, not inside the read path.
3. The startup banner already writes to `console.error`, so surfacing a prominent diagnostic through the existing `main().catch` failure path is consistent with existing output conventions and does not require new logging infrastructure.
4. Decision — hard-fail vs warn: a missing `worlds/` directory under the resolved root is almost always a launch mistake, so the default is **hard-fail** (non-zero exit, `process.exitCode = 1`) with the resolved root path in the message, matching the existing `main().catch` failure convention. A `worlds/` directory that exists but contains zero world bundles is a legitimate empty repo and does **not** fail.
5. No FOUNDATIONS enforcement surface, HARD-GATE, canon-write ordering, or Mystery Reserve surface is touched. This is a read-only non-canon authoring tool (`No LLM, no MCP, no patch engine`).
6. Adjacent contradiction classification: the silent-empty behavior is the bug this ticket fixes; MANSTOSTUFIX-001 (auto-detection) is the separate, complementary fix. Neither subsumes the other — auto-detection narrows the failure surface, the guard reports whatever surface remains.

## Architecture Check

1. A single boot preflight that checks the resolved root for `worlds/` is cleaner than scattering "is the root sane?" checks across read routes: it fails once, early, with the resolved path, instead of N routes each returning ambiguous empties. Keeping the read-path `ok([])` semantics intact preserves the legitimate empty-repo case while moving the misconfiguration signal to the one place that has the launch context (the resolved root + how it was resolved).
2. No backwards-compatibility aliasing/shims: this adds a guard; it does not alter the read API contract or the `--repo-root` flag.

## Verification Layers

1. Boot against a root with no `worlds/` directory hard-fails with the resolved path in the message -> preflight unit test plus compiled CLI expected-failure smoke.
2. Boot against a valid repo root (has `worlds/` with ≥1 bundle) starts normally -> preflight unit test asserting no thrown error.
3. Boot against a root whose `worlds/` exists but is empty starts normally (legitimate empty repo) -> preflight unit test asserting no thrown error.
4. Read-path empty semantics are unchanged -> codebase grep-proof that `enumerateWorlds` still returns `ok([])` for a missing/empty `worlds/` (no error path added there).

## Landed Changes

### 1. Boot preflight in the backend

Added `src/server/preflight.ts` and invoked it from `src/cli.ts` after `resolveRepoRoot()` succeeds and before `createServer` / `server.listen`. Given the resolved `repoRoot`:

- If `resolveRepoRoot` returns a typed error, `formatStartupReadError()` includes the error code, repair hint, root probe path, and candidate paths before the existing `main().catch` sets a non-zero exit.
- If `path.join(repoRoot, "worlds")` does not exist, `assertRepoRootBootPreflight()` hard-fails with the resolved `repoRoot`, the missing `worlds/` path, and the `--repo-root` remediation.
- If `worlds/` exists but enumerates zero bundles, startup proceeds normally.

### 2. Banner ordering

The diagnostic/fail path runs before `createServer` and before `server.listen`, so a misconfigured launch never reaches the "Listening on ..." banner.

## Files to Touch

- `tools/manual-story-studio/src/cli.ts` (modify)
- `tools/manual-story-studio/src/server/preflight.ts` (new)
- `tools/manual-story-studio/test/server/preflight.test.ts` (new)
- `tools/manual-story-studio/README.md` (modify — document the boot guard and its message)

## Out of Scope

- Auto-detecting the repo root (MANSTOSTUFIX-001).
- Changing `enumerateWorlds` empty-result semantics (`ok([])` stays for the read API).
- Any UI/frontend change to render the diagnostic (this ticket is backend boot-time only).

## Acceptance Criteria

### Tests That Must Pass

1. Boot with a resolved root lacking a `worlds/` directory fails with a non-zero exit and a message containing the resolved root path.
2. Boot with a valid repo root (worlds present) starts and listens normally.
3. Boot with an existing-but-empty `worlds/` directory starts normally and does not hard-fail.
4. `enumerateWorlds` retains `ok([])` for missing/empty `worlds/` (no new error path in the read layer).

### Invariants

1. A misconfigured root never silently serves an empty world list — it either auto-corrects (via MANSTOSTUFIX-001) or fails loudly at boot.
2. A legitimately empty repo still boots successfully.

## Test Plan

### New/Modified Tests

1. `tools/manual-story-studio/test/server/preflight.test.ts` — covers the three boot outcomes (missing `worlds/` → fail; valid root → success; empty `worlds/` → success) using temp directories.

### Commands

1. `cd tools/manual-story-studio && npm run test:backend`
2. `cd tools/manual-story-studio && npm test`
3. Backend-only command is the correct boundary: the guard is backend boot logic with no `web/` surface; full `npm test` is run once as a regression gate.

## Outcome

Completed: 2026-06-03.

Manual Story Studio startup now fails before listening when the resolved repo root lacks `worlds/`. The diagnostic names the resolved root, the missing `worlds/` path, and the `--repo-root` remediation. Typed resolver failures now also include the probe path and candidate roots. `enumerateWorlds` remains unchanged, so route-level reads still return `ok([])` for missing `worlds/`, and an existing but empty `worlds/` directory remains a valid boot state.

No deviations from the implementation plan.

## Verification Result

1. `cd tools/manual-story-studio && npm run test:backend` — passed; 89 backend test files passed, including `dist/test/server/preflight.test.js`.
2. `cd tools/manual-story-studio && node dist/src/cli.js --repo-root /tmp/manual-story-studio-no-worlds-codex --port 5999` — failed as expected with exit code 1 and printed the resolved root `/tmp/manual-story-studio-no-worlds-codex`, missing path `/tmp/manual-story-studio-no-worlds-codex/worlds`, and `--repo-root` remediation before listening.
3. `cd tools/manual-story-studio && npm test` — passed; backend build/tests passed and the web TypeScript test sub-run completed.
4. `rg -n 'worldsDir|ok\(\[\]\)|existsSync\(worldsDir\)' tools/manual-story-studio/src/read/worlds.ts` — confirmed `enumerateWorlds` still returns `ok([])` when the read-layer `worlds/` directory is missing.
