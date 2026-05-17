# SPEC41FUP-004: Add hook-deployment-currency CI check (src-vs-dist content-hash parity)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces new CI check script under `tools/hooks/scripts/` and extends `.github/workflows/ci-hooks.yml` with a new CI gate. No source modification.
**Deps**: None

## Problem

D4 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F4, scope-path-A selected). `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (from SPEC-40 D4 / SPEC40STOPIPELE-004) verifies the deployed MCP server's `dist/` matches source at runtime via spawned-process hash parity. No analogous check covers `tools/hooks/dist/`. Hooks are invoked freshly per Claude Code tool event from `tools/hooks/dist/src/hookN.js`; a stale dist on disk executes directly against the wrong source. The MCP-server pattern uses spawned-process tests because the server is persistent; hooks are one-shot CLI invocations, so the parallel pattern is a build-time content-hash check rather than a runtime spawn — verify `dist/` matches what `npm run build` produces at CI time, mismatch fails CI.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/hooks/` package verified to have `src/hook1-..hook6-*.ts` source files + `package.json` with `build` / `test` / `clean` scripts; `.github/workflows/ci-hooks.yml` exists (per pre-spec verification). No existing dist-currency check (grep returned zero matches for `hook.*dist.*parity` or `spawn.*hook` across `tools/hooks/tests/` and `tools/world-mcp/tests/`). The SPEC-40 D4 spawned-process pattern at `server-capabilities-hash-parity.test.ts` is the analog for the MCP server but its spawn cost (~250ms per process) isn't justified for hooks because each hook is short-lived.
2. Spec: SPEC-41 §D4 selected scope-path-A (src-vs-dist content-hash CI check) over scope-path-B (spawned-process per hook); the §Key design decisions in SPEC-41 documents the structural rationale.
3. Cross-skill boundary: the CI check runs against the hooks package at build time. The shared contract under audit is the build-output discipline — committed `dist/` must equal `npm run build` output; any drift means a developer modified source without rebuilding (or modified dist without rebuilding source). The check enforces this at PR time so stale dist cannot land. Parallel to SPEC-40 D4's MCP-server check but at build time instead of runtime.

## Architecture Check

1. A CI check that compares committed `dist/` to `npm run build` output is structurally cleaner than a runtime spawn pattern for hooks — hooks are one-shot CLI invocations rather than persistent processes, so build-time parity is the right discipline boundary. Alternatives (per-hook spawned-process tests mirroring SPEC-40 D4) would add wall-clock cost to CI without proportional value because the failure mode they catch (deployed-process stale-hash) doesn't apply to short-lived hooks.
2. No backwards-compatibility aliasing or shims introduced — the check is net-new; the existing `npm run build` workflow continues unchanged. The check just adds a verification step after build.

## Verification Layers

1. Check script correctness → manual drift-test: modify a hook source file without rebuilding; run the script; assert non-zero exit with the offending dist file named. Rebuild; run the script; assert zero exit.
2. CI integration → workflow file check: `grep -n 'check-dist-currency\|hook-deployment-currency' .github/workflows/ci-hooks.yml` returns the new step.
3. False-positive avoidance → manual review: run the check on the current repo state (after a clean rebuild); confirm zero false-positives.

## What to Change

### 1. New CI check script

Create `tools/hooks/scripts/check-dist-currency.sh` (or equivalent path under `tools/hooks/`):

- Capture the current committed `dist/` content hash: SHA-256 over sorted file content of `dist/**/*.js` (use `find` + `sort` + `xargs cat` + `sha256sum` or equivalent).
- Save the original `dist/` to a temp location: `cp -r dist/ /tmp/hooks-dist-original/`.
- Run `npm run build` (which rebuilds dist).
- Capture the rebuilt `dist/` content hash via the same SHA-256 logic.
- Compare. If hashes differ, the dist was stale; print a diff of which files changed and exit non-zero with a clear error message instructing the implementer to commit the rebuilt `dist/`.
- Restore the original `dist/` to keep the working tree clean: `rm -rf dist/ && cp -r /tmp/hooks-dist-original/ dist/` (or leave the rebuild in place if CI doesn't care about working-tree state).
- Use POSIX-compatible flags. Shebang `#!/usr/bin/env bash`; `set -euo pipefail`.

### 2. CI workflow integration

Extend `.github/workflows/ci-hooks.yml`:

- Add a new step invoking the dist-currency check, ideally after `npm install` and before the existing test step.
- Step name: `Verify hooks dist currency`.
- Failure messaging: when the check fails, CI output names the divergent dist files + the corrective command (`cd tools/hooks && npm run build && git add dist/`).

### 3. Optional — path-filtered trigger

If CI wall-clock budget pressure surfaces (per SPEC-41 §Risks & Open Questions), consider gating the new step behind a path filter (`paths: tools/hooks/src/**`) so it only runs on PRs touching hook source. Default: run on every CI invocation; the check is fast (~5-15s) and catches all drift, not just same-PR drift.

## Files to Touch

- `tools/hooks/scripts/check-dist-currency.sh` (new)
- `.github/workflows/ci-hooks.yml` (modify) — add a new step invoking the new check script.

## Out of Scope

- No spawned-process tests per hook (scope-path-B from SPEC-41 §Key design decisions) — explicitly deferred; scope-path-A covers the failure mode at lower cost.
- No source-side modification of any hook (`tools/hooks/src/hookN-*.ts` files are unchanged).
- No analogous check for `tools/world-mcp/dist/` — that's covered by SPEC-40 D4 / SPEC40STOPIPELE-004's spawned-process pattern; the MCP server is persistent so spawning is the right pattern there.
- No analogous check for `tools/validators/dist/` or `tools/world-index/dist/` — those packages are not consumed at runtime by Claude Code directly; their dist-currency discipline can be added in a future iteration if drift becomes documented.
- No build-output caching or optimization — the check accepts the ~5-15s rebuild cost per CI invocation for the safety it provides.

## Acceptance Criteria

### Tests That Must Pass

1. Running the new check script after a clean `npm run build` in `tools/hooks/` exits zero — confirms baseline parity.
2. Modifying a hook source file (e.g., adding a comment to `tools/hooks/src/hook6-guard-story-markdown-hash.ts`) without rebuilding, then running the new check script, exits non-zero with a clear error message naming the divergent dist file and the corrective command.
3. CI workflow `ci-hooks.yml` runs the new step on PRs and fails CI when committed dist diverges from source-produced dist.
4. The check script does not pollute the working tree — after running, `git status` shows no unexpected changes (either restore the original dist or leave the freshly-built dist in place per the script's chosen strategy).

### Invariants

1. Committed `tools/hooks/dist/` content matches `npm run build` output at every CI invocation; any drift fails the check.
2. The check completes in under 30 seconds on standard CI runners.
3. The check has zero false-positives when the dist is fresh.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` — the check script's correctness is verified via direct invocation against a known-current-then-known-stale dist (see Acceptance Criteria above), not via a sibling test file.

### Commands

1. `cd tools/hooks && bash scripts/check-dist-currency.sh` — direct script invocation; expected exit code 0 on current repo state (after a clean build).
2. `cd tools/hooks && echo "// drift marker" >> src/hook6-guard-story-markdown-hash.ts && bash scripts/check-dist-currency.sh; echo "exit=$?"; git checkout src/hook6-guard-story-markdown-hash.ts` — manual negative test confirming non-zero exit on source-vs-dist drift; reverts the test edit.
3. `grep -n 'check-dist-currency' .github/workflows/ci-hooks.yml` — confirms the workflow step is wired.
