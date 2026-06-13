# NODE24CI-002: Make story-explorer's web test suite Node-24-compatible, then add it to the CI matrix

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — fixes the `tools/story-explorer/web` Vitest/jsdom setup for Node 24 and edits `.github/workflows/ci-story-explorer.yml` to add the `node-version: ['22', '24']` matrix. No canon/MCP/patch-engine/validator/hook/skill surface is touched; story-explorer is a read-only inspector and its web suite is a test harness.
**Deps**: Pairs with `archive/tickets/NODE24CI-001-add-node24-matrix-clean-packages.md` (same Node-24 CI rollout). No hard code dependency; NODE24CI-001 deliberately left `ci-story-explorer.yml` pinned to Node 22 until this ticket made the full story-explorer suite green on both Node 22 and Node 24.

## Problem

`ci-story-explorer.yml` runs `npm test`, which is `npm run build && node --test "dist/test/**/*.test.js" && npm --prefix web test`. The backend `node --test` segment is already Node-24-green (127 passing on v24.16.0). At intake, the trailing `npm --prefix web test` (Vitest over the `web/` React app) was **not**: on Node 24 it reported **38 failed / 255 passed (exit 1)**; on Node 22 it was **293 passed / 0 failed (exit 0)**. Reassessment on Node 24 v24.16.0 reproduced the same count and isolated the root cause to a test-environment realm mismatch: jsdom supplies `AbortController` / `AbortSignal`, React Router's data-router uses that signal, and Node 24's native `Request` rejects the jsdom signal with `RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal`. This ticket fixed that test setup incompatibility so the suite passes on Node 24 without regressing Node 22, and then added story-explorer to the Node-24 CI matrix.

This is the regression the NODE24CI-001 matrix surfaced: development happens on Node 24, but the frontend test suite never actually ran clean there — backend-only local runs (and a masking `better-sqlite3` stale-binding failure) had hidden it.

## Assumption Reassessment (2026-06-07)

1. `tools/story-explorer/web/package.json` devDependencies under audit: `vitest ^2.1.4` (installed `2.1.9`), `jsdom ^25.0.1`, `vite ^5.4.10`, `@testing-library/react ^16.0.1`, with `react`/`react-dom` `^18.3.1` and `react-router-dom ^6.27.0`. `web/vite.config.ts` sets `test.environment: 'jsdom'` and `test.setupFiles: ['./src/test-setup.ts']`. The installed `vitest@2.1.9` `engines` is `^18.0.0 || >=20.0.0` — Node 24 is **not** hard-blocked.
2. Failure profile (reproduced locally, Node 24 v24.16.0): 38 failed across 15 test files, dominated by `TestingLibraryElementError: Unable to find role=...` async-render misses, with 39 unhandled `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal` diagnostics from React Router's `createClientSideRequest`. A direct probe reproduced the same Node 24 failure with `new globalThis.Request('http://x', { signal: new jsdom.window.AbortController().signal })`. The route suites use `createMemoryRouter`; the loaders do not render because React Router builds a Node-native `Request` with a jsdom-realm signal before the mocked loaders can settle. The targeted fix is therefore in `web/src/test-setup.ts`, not assertion weakening or route behavior changes.
3. Cross-artifact boundary under audit — the **`ci-story-explorer.yml` `test` job runs BOTH segments** (backend `node --test`, already Node-24-green; and `npm --prefix web test`, the failing segment) in one `npm test`. Adding `node-version: ['22','24']` runs the whole `npm test` on both legs, so the Node-24 leg cannot go green until the web segment does. Do **not** silently split backend-vs-web across Node versions to force green — if the toolchain upgrade proves intractable, surface that as an explicit finding and decision (fallback named in Out of Scope), do not bury it.
4. FOUNDATIONS alignment: **tooling-adjacent**. story-explorer is a read-only canon/story inspector; its `web/` Vitest suite is a UI test harness that touches no `_source/` record, no skill, no HARD-GATE, no Canon Safety Check, and no Mystery Reserve firewall surface. `docs/FOUNDATIONS.md` §Tooling Recommendation governs the machine-facing canon layer (retrieval/patch/validators); a frontend test-toolchain upgrade sits beneath that contract and does not alter it. No Validation Rule or schema is engaged.
5. Mismatch + correction — **the matrix/upgrade interaction the requester asked about**: NODE24CI-001 adds the Node-24 matrix to the five backend-clean workflows independently and immediately. This ticket gates story-explorer's matrix addition on its own web suite first going Node-24-green. The `ci-story-explorer.yml` matrix edit therefore lands **inside this ticket, after** the toolchain fix is verified green on both 22 and 24 — never before, and never in NODE24CI-001. That ordering is the whole reason the two are separate tickets.

## Architecture Check

1. Fixing the jsdom/Node `Request` signal mismatch in the shared Vitest setup keeps the declared `engines.node >=22` honest for the package developers actually use, and keeps the full `npm test` meaningful on both CI legs. Pinning-to-22 or excluding-web would be a silent capability reduction.
2. No backwards-compatibility shim or version-skew alias is introduced. The compatibility patch is scoped to Vitest's jsdom test environment and preserves the production runtime and all route assertions.

## Verification Layers

1. Web suite green on Node 24 -> command-proof: `cd tools/story-explorer/web && npm install && npm test` under Node 24 exits 0 with 0 failures.
2. Web suite still green on Node 22 (no regression) -> same command under Node 22 exits 0 with ≥293 passing.
3. Backend segment still green on both -> the backend segment inside `npm test` from `tools/story-explorer` passes on Node 22 and Node 24.
4. CI matrix valid -> `ci-story-explorer.yml` parses with `jobs.test.strategy.matrix.node-version == ['22','24']`; live GitHub Actions leg results remain external follow-up proof.

## Landed Changes

### 1. Diagnose the Node-24 failing layer

Reproduced the Node 24 failure with `npm test` in `tools/story-explorer/web`: 38 failed / 255 passed. A direct jsdom probe showed the same root cause as the Vitest route failures: Node 24's native `Request` rejects a jsdom-realm `AbortSignal`, which React Router passes while building data-router loader requests.

### 2. Upgrade / fix the web test toolchain

Added a guarded `Request` constructor wrapper in `web/src/test-setup.ts` that retries without the incompatible jsdom signal only for the exact `Expected signal ... instance of AbortSignal` diagnostic. No dependency upgrade was required.

### 3. Add the `['22', '24']` matrix to `ci-story-explorer.yml`

After the Node 22 and Node 24 package proofs passed, added `strategy.fail-fast: false` + `matrix.node-version: ['22', '24']` to `jobs.test` and switched `node-version: '22'` to `node-version: ${{ matrix.node-version }}`.

## Files to Touch

- `tools/story-explorer/web/src/test-setup.ts` (modify — Node 24 jsdom/native `Request` compatibility)
- `.github/workflows/ci-story-explorer.yml` (modify — add the matrix, step 3)

## Out of Scope

- The five other `ci-*.yml` workflows — completed in `archive/tickets/NODE24CI-001-add-node24-matrix-clean-packages.md`.
- Any non-test change to story-explorer frontend behavior or UX; this ticket only makes the existing tests pass on Node 24, it does not alter what they assert (no assertion weakening, no `skip`/`only` to paper over failures).
- Fallback if the upgrade proves intractable: splitting the web Vitest segment to a Node-22-only step while the backend runs on `['22','24']`. This is a **deliberate, surfaced** decision — if reached, stop and present it; do not implement it silently to force a green check.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` exits 0 with 0 failures on Node 24 (was 38 failed / 255 passed).
2. `cd tools/story-explorer/web && npm test` exits 0 with ≥293 passing on Node 22 (no regression).
3. `npm test` from `tools/story-explorer` passes on both Node 22 and Node 24, covering build, backend tests, and web tests.
4. `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci-story-explorer.yml')); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24']"` — matrix present and parses; live GitHub Actions leg results remain external follow-up proof.

### Invariants

1. The web suite's assertions are unchanged in intent — the fix is toolchain/environment-level; no test is weakened, skipped, or marked `only` to obtain green.
2. story-explorer's `engines.node` stays `">=22"` and is now genuinely satisfied on Node 24 by a passing full `npm test`.

## Test Plan

### New/Modified Tests

1. `None — no assertions changed and no tests were skipped. The existing web suite is the proof surface; `tools/story-explorer/web/src/test-setup.ts` was updated so the existing data-router tests run under Node 24's stricter native Request implementation.`

### Commands

1. `cd tools/story-explorer/web && npm test` under Node 24 and under Node 22.
2. `npm test` from `tools/story-explorer` under Node 24 and under Node 22 — the exact command CI runs after each matrix leg installs dependencies.
3. Narrower-command rationale: the failing surface is the `web/` Vitest suite specifically, so `npm --prefix .../web test` is the tight diagnostic loop; the full `npm --prefix tools/story-explorer test` is the CI-faithful boundary that also proves the backend segment and the build still pass.

## Outcome

Completion date: 2026-06-13.

Implemented the Node 24 web-test compatibility fix in `tools/story-explorer/web/src/test-setup.ts` and added the Node 22/24 matrix to `.github/workflows/ci-story-explorer.yml`.

The fix is test-environment-only: it preserves all existing route assertions and production code, and it only catches the Node 24 native `Request` / jsdom `AbortSignal` mismatch observed during reassessment.

## Verification Result

1. `npm test` in `tools/story-explorer/web` on Node 24.16.0 — PASS; 101 test files / 293 tests passed after the fix. The pre-fix baseline in the same session was 15 failed / 86 passed files and 38 failed / 255 passed tests with 39 `Expected signal ... instance of AbortSignal` unhandled errors.
2. `npm test` in `tools/story-explorer` on Node 24.16.0 — PASS; build succeeded, backend `node --test "dist/test/**/*.test.js"` passed 127 tests, and web Vitest passed 101 files / 293 tests. The run emitted npm `allow-scripts` warnings for install-script approval, but exited 0.
3. `PATH=/home/joeloverbeck/.nvm/versions/node/v22.22.3/bin:$PATH npm test` in `tools/story-explorer/web` — PASS; 101 test files / 293 tests passed.
4. `PATH=/home/joeloverbeck/.nvm/versions/node/v22.22.3/bin:$PATH npm test` in `tools/story-explorer` — PASS after rebuilding local `better-sqlite3` bindings for Node 22; backend compiled tests passed 24 compiled files / 127 tests, and web Vitest passed 101 files / 293 tests.
5. `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci-story-explorer.yml')); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24']; assert d['jobs']['test']['strategy']['fail-fast'] is False; print(d['jobs']['test']['strategy'])"` — PASS; the workflow parses with `{'fail-fast': False, 'matrix': {'node-version': ['22', '24']}}`.
6. Manual package public-surface review: `tools/story-explorer/README.md` has no same-seam Node-version, CI-matrix, or web-test-toolchain instructions requiring update.

## Deviations

- The drafted likely path expected a dependency upgrade. Reassessment proved the live root cause was the Node 24 native `Request` / jsdom `AbortSignal` realm mismatch, so the implementation stayed in `web/src/test-setup.ts` and did not touch `package.json` or lockfiles.
- Local Node 22 full-package proof initially failed because existing `better-sqlite3` native bindings had been built for Node 24 (`NODE_MODULE_VERSION 137` vs Node 22's `127`). `npm install` left the stale binding in place, so `npm rebuild better-sqlite3` was run in both `tools/world-index` and `tools/story-explorer` under Node 22 before rerunning the proof. The bindings were rebuilt back under Node 24 before final Node 24 proof so the checkout matches the current shell. These are ignored local artifacts, not tracked source changes.
- Live GitHub Actions matrix leg results (`test (22)` / `test (24)`) were not available from the local checkout; local Node 22 and Node 24 package proofs plus workflow YAML parsing are the current verification.
