# SPEC41FUP-004: Add hook-deployment-currency CI check (src-vs-dist content-hash parity)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — introduces a new CI/local check script under `tools/hooks/scripts/`, adds a package-local npm script, and extends `.github/workflows/ci-hooks.yml` with a new CI gate. No hook source modification.
**Deps**: None

## Problem

D4 of SPEC-41 (originating from SPEC-40 §Risks & Open Questions F4, scope-path-A selected). `tools/world-mcp/tests/integration/server-capabilities-hash-parity.test.ts` (from SPEC-40 D4 / SPEC40STOPIPELE-004) verifies the deployed MCP server's `dist/` matches source at runtime via spawned-process hash parity. No analogous check covers `tools/hooks/dist/`. Hooks are invoked freshly per Claude Code tool event from `tools/hooks/dist/src/hookN.js`; a stale local `dist/` executes directly against the wrong source. The MCP-server pattern uses spawned-process tests because the server is persistent; hooks are one-shot CLI invocations, so the parallel pattern is a build-time content-hash check rather than a runtime spawn — compare the current runtime `dist/` to what `npm run build` produces when `dist/` exists, and build a fresh `dist/` when it does not. A mismatch fails with a corrective rebuild message.

## Assumption Reassessment (2026-05-17)

1. Codebase: `tools/hooks/` package verified to have `src/hook1-..hook6-*.ts` source files + `package.json` with `build` / `test` / `clean` scripts; `.github/workflows/ci-hooks.yml` exists (per pre-spec verification). No existing dist-currency check (grep returned zero matches for `hook.*dist.*parity` or `spawn.*hook` across `tools/hooks/tests/` and `tools/world-mcp/tests/`). The SPEC-40 D4 spawned-process pattern at `server-capabilities-hash-parity.test.ts` is the analog for the MCP server but its spawn cost (~250ms per process) isn't justified for hooks because each hook is short-lived.
2. Spec: SPEC-41 §D4 selected scope-path-A (src-vs-dist content-hash CI check) over scope-path-B (spawned-process per hook); the §Key design decisions in SPEC-41 documents the structural rationale.
3. Cross-skill boundary: the check runs against the hooks package at build time. The shared contract under audit is the local runtime-output discipline — the current ignored `tools/hooks/dist/` used by `.claude/settings.json` must equal `npm run build` output when that directory exists; if it does not exist, the check must create it through the normal build command. This is parallel to SPEC-40 D4's MCP-server check but at build time instead of runtime.
4. Reassessment correction: `tools/hooks/dist/` is intentionally gitignored by `.gitignore` (`tools/*/dist/`), and `git ls-files tools/hooks/dist` returns no tracked files. Therefore the draft "committed dist" acceptance wording was false. The accepted D4 boundary is a local/CI dist-currency script that compares existing ignored runtime output against a temp rebuild without polluting the working tree; in fresh CI checkouts with no `dist/`, it builds the package and passes if the build succeeds.

## Architecture Check

1. A CI/local check that compares an existing ignored runtime `dist/` to `npm run build` output is structurally cleaner than a runtime spawn pattern for hooks — hooks are one-shot CLI invocations rather than persistent processes, so build-time parity is the right discipline boundary. Alternatives (per-hook spawned-process tests mirroring SPEC-40 D4) would add wall-clock cost to CI without proportional value because the failure mode they catch (deployed-process stale-hash) does not apply to short-lived hooks.
2. No backwards-compatibility aliasing or shims introduced — the check is net-new; the existing `npm run build` workflow continues unchanged. The check just adds a verification step after build.

## Verification Layers

1. Check script correctness → manual drift-test: modify a hook source file without rebuilding; run the script; assert non-zero exit with the divergent manifest entry named. Rebuild; run the script; assert zero exit.
2. CI integration → workflow file check: `grep -n 'check:dist-currency\|Verify hooks dist currency' .github/workflows/ci-hooks.yml` returns the new step.
3. False-positive avoidance → manual review: run the check on the current repo state (after a clean rebuild); confirm zero false-positives and no unexpected tracked working-tree pollution.

## What to Change

### 1. New CI check script

Create `tools/hooks/scripts/check-dist-currency.sh`:

- If `dist/` does not exist, run `npm run build` and exit zero on build success.
- Capture the current ignored runtime `dist/` manifest: relative path + SHA-256 for every file under `dist/`.
- Save the original `dist/` to a temp location.
- Run `npm run build` (which rebuilds dist).
- Capture the rebuilt `dist/` manifest via the same hash logic.
- Compare. If manifests differ, the local runtime dist was stale; print the manifest diff and exit non-zero with a clear error message instructing the implementer to run `cd tools/hooks && npm run build`.
- Restore the original `dist/` before exit when the directory existed at script start, so the check itself does not pollute local ignored runtime output.
- Use POSIX-compatible flags. Shebang `#!/usr/bin/env bash`; `set -euo pipefail`.

### 2. CI workflow integration

Extend `.github/workflows/ci-hooks.yml`:

- Add a new step invoking the dist-currency check, after `npm install` and before the existing test step.
- Step name: `Verify hooks dist currency`.
- Failure messaging: when the check fails, CI output names the divergent manifest entries + the corrective command (`cd tools/hooks && npm run build`).

### 3. Optional — path-filtered trigger

If CI wall-clock budget pressure surfaces (per SPEC-41 §Risks & Open Questions), consider gating the new step behind a path filter (`paths: tools/hooks/src/**`) so it only runs on PRs touching hook source. Default: run on every CI invocation; the check is fast (~5-15s) and catches all drift, not just same-PR drift.

## Files to Touch

- `tools/hooks/scripts/check-dist-currency.sh` (new)
- `tools/hooks/package.json` (modify) — add `check:dist-currency`.
- `tools/hooks/README.md` (modify) — document the local dist-currency check.
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
2. Modifying a hook source file in a way that changes emitted JavaScript (for example, adding a temporary top-level constant to `tools/hooks/src/hook6-guard-story-markdown-hash.ts`) without rebuilding, then running the new check script, exits non-zero with a clear error message naming the divergent dist manifest entry and the corrective command.
3. CI workflow `ci-hooks.yml` runs the new step on PRs and fails CI if an existing runtime dist diverges from source-produced dist; on fresh CI checkouts with no ignored `dist/`, the step builds the package and passes on build success.
4. The check script does not pollute the tracked working tree, and when `dist/` existed at script start it restores the original ignored dist before exit.

### Invariants

1. Existing local `tools/hooks/dist/` content matches `npm run build` output whenever the runtime dist is present; any drift fails the check.
2. The check completes in under 30 seconds on standard CI runners.
3. The check has zero false-positives when the dist is fresh.

## Test Plan

### New/Modified Tests

1. `None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.` — the check script's correctness is verified via direct invocation against a known-current-then-known-stale dist (see Acceptance Criteria above), not via a sibling test file.

### Commands

1. `cd tools/hooks && npm run build && bash scripts/check-dist-currency.sh` — direct script invocation; expected exit code 0 on current repo state after a clean build.
2. `cd tools/hooks && npm run build && tmp=$(mktemp) && cp src/hook6-guard-story-markdown-hash.ts "$tmp" && printf '\nconst DIST_CURRENCY_NEGATIVE_TEST_MARKER = "temporary";\n' >> src/hook6-guard-story-markdown-hash.ts && bash scripts/check-dist-currency.sh; status=$?; cp "$tmp" src/hook6-guard-story-markdown-hash.ts; rm -f "$tmp"; exit "$status"` — manual negative test confirming non-zero exit on source-vs-dist drift, then restores the test edit.
3. `grep -n 'check:dist-currency\|Verify hooks dist currency' .github/workflows/ci-hooks.yml` — confirms the workflow step is wired.

## Outcome

Completed 2026-05-17.

Landed a hooks dist-currency check at `tools/hooks/scripts/check-dist-currency.sh`. The script compares an existing ignored `tools/hooks/dist/` manifest against a fresh `npm run build` manifest, reports manifest diffs on drift, restores the original ignored `dist/` before exiting when it existed at start, and builds `dist/` when it is absent. Added `npm run check:dist-currency`, documented it in `tools/hooks/README.md`, and wired `.github/workflows/ci-hooks.yml` to run `Verify hooks dist currency` before the existing hooks test lane.

## Verification Result

Commands run 2026-05-17:

1. `cd tools/hooks && npm run build && npm run check:dist-currency` — passed; `tools/hooks/dist matches npm run build output.`
2. Negative drift probe with a temporary emitted constant in `tools/hooks/src/hook6-guard-story-markdown-hash.ts`, followed by `cd tools/hooks && npm run check:dist-currency` — failed as expected with a manifest diff for `src/hook6-guard-story-markdown-hash.js` and the corrective command `cd tools/hooks && npm run build`; the temporary source edit was removed afterward.
3. `grep -n 'check:dist-currency\|Verify hooks dist currency' .github/workflows/ci-hooks.yml` — passed; found the workflow step and package command invocation.
4. `cd tools/hooks && npm test` — passed; 28/28 hook tests passed.

## Deviations

- Reassessment corrected the draft "committed dist" premise. `tools/hooks/dist/` is ignored by `.gitignore` (`tools/*/dist/`) and has no tracked files, so the landed check enforces ignored local runtime-output currency rather than committed-artifact parity.
- The first negative probe used a comment-only source edit, which TypeScript did not emit and therefore did not create dist drift. The accepted negative proof used a temporary top-level constant so the emitted JavaScript changed.
