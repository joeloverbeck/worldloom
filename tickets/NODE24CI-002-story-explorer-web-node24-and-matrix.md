# NODE24CI-002: Make story-explorer's web test suite Node-24-compatible, then add it to the CI matrix

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — upgrades/fixes the `tools/story-explorer/web` test toolchain (dev dependencies, and whatever test-setup/test code the upgrade requires) and then edits `.github/workflows/ci-story-explorer.yml` to add the `node-version: ['22', '24']` matrix. No canon/MCP/patch-engine/validator/hook/skill surface is touched; story-explorer is a read-only inspector and its web suite is a test harness.
**Deps**: Pairs with `archive/tickets/NODE24CI-001-add-node24-matrix-clean-packages.md` (same Node-24 CI rollout). No hard code dependency, but the matrix edit in this ticket **must not land until** the web suite is green on both Node 22 and Node 24 — adding story-explorer to the matrix before the fix would put a known-red `test (24)` leg on `main`.

## Problem

`ci-story-explorer.yml` runs `npm test`, which is `npm run build && node --test "dist/test/**/*.test.js" && npm --prefix web test`. The backend `node --test` segment is already Node-24-green (127 passing on v24.16.0). The trailing `npm --prefix web test` (Vitest over the `web/` React app) is **not**: on Node 24 it reports **38 failed / 255 passed (exit 1)**; on Node 22 it is **293 passed / 0 failed (exit 0)**. The failures are a runtime incompatibility, not an `engines` gate — the installed `vitest@2.1.9` declares `engines: ^18.0.0 || >=20.0.0`, which nominally admits Node 24. This ticket diagnoses the failing layer, upgrades/fixes the web test toolchain so the suite passes on Node 24 without regressing Node 22, and only then adds story-explorer to the Node-24 CI matrix.

This is the regression the NODE24CI-001 matrix surfaced: development happens on Node 24, but the frontend test suite never actually ran clean there — backend-only local runs (and a masking `better-sqlite3` stale-binding failure) had hidden it.

## Assumption Reassessment (2026-06-07)

1. `tools/story-explorer/web/package.json` devDependencies under audit: `vitest ^2.1.4` (installed `2.1.9`), `jsdom ^25.0.1`, `vite ^5.4.10`, `@testing-library/react ^16.0.1`, with `react`/`react-dom` `^18.3.1` and `react-router-dom ^6.27.0`. `web/vite.config.ts` sets `test.environment: 'jsdom'` and `test.setupFiles: ['./src/test-setup.ts']`. The installed `vitest@2.1.9` `engines` is `^18.0.0 || >=20.0.0` — Node 24 is **not** hard-blocked, so the 38 failures are a behavioral/runtime incompatibility (the implementer must isolate the layer before choosing the upgrade — primary suspects are `jsdom@25` under Node 24's V8 and Vitest/Vite async scheduling; do not assume a specific dependency without reproducing the narrowed failure).
2. Failure profile (reproduced locally, Node 24 v24.16.0): 38 failed across 15 test files, dominated by ~48 `TestingLibraryElementError: Unable to find role=...` async-render misses plus ~5 hard timeouts (e.g. `unscened.test.tsx` 8 tests/5 failed in ~5s — vitest default-timeout shape). The route suites (`stories`, `unscened`, `scenes`, `worlds`, and their `.a11y` variants) use `createMemoryRouter` data-router loaders mocked via `vi.mock('../api/client', …)`; the "Unable to find" pattern indicates loader-driven async renders not settling under Node 24, pointing at the jsdom/timer/microtask layer rather than the assertions themselves. Node 22 is fully green (293/293), confirming the break is Node-24-specific, not a pre-existing test defect.
3. Cross-artifact boundary under audit — the **`ci-story-explorer.yml` `test` job runs BOTH segments** (backend `node --test`, already Node-24-green; and `npm --prefix web test`, the failing segment) in one `npm test`. Adding `node-version: ['22','24']` runs the whole `npm test` on both legs, so the Node-24 leg cannot go green until the web segment does. Do **not** silently split backend-vs-web across Node versions to force green — if the toolchain upgrade proves intractable, surface that as an explicit finding and decision (fallback named in Out of Scope), do not bury it.
4. FOUNDATIONS alignment: **tooling-adjacent**. story-explorer is a read-only canon/story inspector; its `web/` Vitest suite is a UI test harness that touches no `_source/` record, no skill, no HARD-GATE, no Canon Safety Check, and no Mystery Reserve firewall surface. `docs/FOUNDATIONS.md` §Tooling Recommendation governs the machine-facing canon layer (retrieval/patch/validators); a frontend test-toolchain upgrade sits beneath that contract and does not alter it. No Validation Rule or schema is engaged.
5. Mismatch + correction — **the matrix/upgrade interaction the requester asked about**: NODE24CI-001 adds the Node-24 matrix to the five backend-clean workflows independently and immediately. This ticket gates story-explorer's matrix addition on its own web suite first going Node-24-green. The `ci-story-explorer.yml` matrix edit therefore lands **inside this ticket, after** the toolchain fix is verified green on both 22 and 24 — never before, and never in NODE24CI-001. That ordering is the whole reason the two are separate tickets.

## Architecture Check

1. Upgrading the web test toolchain to a Node-24-supported set (rather than pinning story-explorer's CI to Node 22 forever, or excluding the web tests from coverage) keeps the declared `engines.node >=22` honest for the package developers actually use, and keeps the full `npm test` meaningful on both legs. Pinning-to-22 or excluding-web would be a silent capability reduction.
2. No backwards-compatibility shim or version-skew alias is introduced. If a dependency major bump (e.g. Vitest 2→3, Vite 5→6, jsdom 25→26) is required, both the bump and any consequent test-setup/test adjustments land together so the suite is internally consistent — no pinned-old/pinned-new straddle.

## Verification Layers

1. Web suite green on Node 24 -> command-proof: `cd tools/story-explorer/web && npm install && npm test` under Node 24 exits 0 with 0 failures.
2. Web suite still green on Node 22 (no regression) -> same command under Node 22 exits 0 with ≥293 passing.
3. Backend segment still green on both -> `npm --prefix tools/story-explorer run test:backend` passes on Node 22 and Node 24.
4. CI matrix valid and both legs green -> `ci-story-explorer.yml` parses with `jobs.test.strategy.matrix.node-version == ['22','24']`, and the live run reports green `test (22)` and `test (24)`.

## What to Change

### 1. Diagnose the Node-24 failing layer

Reproduce on Node 24, narrow to the responsible layer (isolate a single failing route test; determine whether the loader promise never resolves, a timer/microtask stalls, or jsdom throws). Record the root cause in the implementation notes so the upgrade is targeted, not speculative.

### 2. Upgrade / fix the web test toolchain

Apply the minimal dependency upgrade(s) and consequent code/setup adjustments that make the suite pass on Node 24 (candidate set to evaluate against the diagnosis: `vitest`, `vite`, `jsdom`, `@testing-library/*`). Update `web/package.json` + `web/package-lock.json`, and any `web/vite.config.ts`, `web/src/test-setup.ts`, or individual test files the upgrade requires.

### 3. Add the `['22', '24']` matrix to `ci-story-explorer.yml`

Only after steps 1–2 verify green on both Node versions, mirror NODE24CI-001's pattern: add `strategy.fail-fast: false` + `matrix.node-version: ['22', '24']` to `jobs.test` and switch `node-version: '22'` → `node-version: ${{ matrix.node-version }}`.

## Files to Touch

- `tools/story-explorer/web/package.json` (modify)
- `tools/story-explorer/web/package-lock.json` (modify)
- `tools/story-explorer/web/vite.config.ts` (modify — only if the upgrade requires)
- `tools/story-explorer/web/src/test-setup.ts` (modify — only if the upgrade requires)
- `tools/story-explorer/web/src/**/*.test.tsx` (modify — only the tests the upgrade forces to adapt; no behavior weakening)
- `.github/workflows/ci-story-explorer.yml` (modify — add the matrix, step 3)

## Out of Scope

- The five other `ci-*.yml` workflows — completed in `archive/tickets/NODE24CI-001-add-node24-matrix-clean-packages.md`.
- Any non-test change to story-explorer frontend behavior or UX; this ticket only makes the existing tests pass on Node 24, it does not alter what they assert (no assertion weakening, no `skip`/`only` to paper over failures).
- Fallback if the upgrade proves intractable: splitting the web Vitest segment to a Node-22-only step while the backend runs on `['22','24']`. This is a **deliberate, surfaced** decision — if reached, stop and present it; do not implement it silently to force a green check.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/story-explorer/web && npm test` exits 0 with 0 failures on Node 24 (was 38 failed / 255 passed).
2. `cd tools/story-explorer/web && npm test` exits 0 with ≥293 passing on Node 22 (no regression).
3. `npm --prefix tools/story-explorer run test:backend` passes on both Node 22 and Node 24.
4. `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci-story-explorer.yml')); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24']"` — matrix present and parses; the live run shows two green legs.

### Invariants

1. The web suite's assertions are unchanged in intent — the fix is toolchain/environment-level; no test is weakened, skipped, or marked `only` to obtain green.
2. story-explorer's `engines.node` stays `">=22"` and is now genuinely satisfied on Node 24 by a passing full `npm test`.

## Test Plan

### New/Modified Tests

1. `tools/story-explorer/web/src/**/*.test.tsx` — only the subset the toolchain upgrade forces to adapt (e.g. API changes in `@testing-library`/Vitest); each adaptation preserves the original assertion intent. No net-new test is required — the deliverable is the existing 293+ suite passing on Node 24.

### Commands

1. `cd tools/story-explorer/web && npm install && npm test` (run once under Node 24, once under Node 22 via `nvm exec`).
2. `npm --prefix tools/story-explorer test` (full `build + backend + web`) green on both Node versions — the exact command CI runs.
3. Narrower-command rationale: the failing surface is the `web/` Vitest suite specifically, so `npm --prefix .../web test` is the tight diagnostic loop; the full `npm --prefix tools/story-explorer test` is the CI-faithful boundary that also proves the backend segment and the build still pass.
