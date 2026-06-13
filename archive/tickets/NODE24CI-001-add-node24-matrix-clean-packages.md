# NODE24CI-001: Add Node 24 to the CI matrix for the five Node-24-clean package workflows

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — edits five `.github/workflows/ci-*.yml` GitHub Actions workflows to run their existing job under a `node-version: ['22', '24']` matrix. No `tools/<package>` code, no canon/MCP/patch-engine/validator/hook/skill surface is touched.
**Deps**: None. `ci-story-explorer.yml` is deliberately excluded and handled by NODE24CI-002 (its web suite is not yet Node-24-green); the two tickets together complete the Node-24 CI rollout.

## Problem

At intake, every `tools/<package>` declared `engines.node` `">=22"`, and development happened on Node 24 (`node -v` → v24.16.0), but CI pinned every package workflow to `node-version: '22'` only — so the declared `>=22` support range was never actually proven on the version developers use. The five backend-only package suites were verified green on Node 24 locally; this ticket adds Node 24 as a second matrix leg so CI proves the supported range and catches genuine Node-24 regressions early (this is exactly how the regression in NODE24CI-002 was found).

This work also closes out a related diagnosis: a local `better-sqlite3` `ERR_DLOPEN_FAILED` / "Module did not self-register" failure was a **stale native binding** left over from a Node-major upgrade (the `.node` was built for an older ABI), not a code or CI defect — CI fresh-installs on every run and so always compiles the binding against its pinned Node. A matrix run on a fresh runner therefore has no ABI concern. (Local remedy, already applied: `npm rebuild better-sqlite3` / `npm ci`.)

## Assumption Reassessment (2026-06-07; refreshed 2026-06-13)

1. At intake, all six `ci-*.yml` workflows hardcoded `node-version: '22'` in a single `actions/setup-node@v6` step inside one `test` job (`runs-on: ubuntu-latest`). On 2026-06-13, the five owned workflows — `ci-world-index.yml`, `ci-patch-engine.yml`, `ci-validators.yml`, `ci-hooks.yml`, `ci-world-mcp.yml` — were updated to `strategy.fail-fast: false` with `matrix.node-version: ['22', '24']`; `ci-story-explorer.yml` intentionally remains pinned to `node-version: '22'` for NODE24CI-002.
2. The five owned workflows run backend package lanes only. The historical Node 24 proof remains the intake reproduction: `bash scripts/check-all.sh` on v24.16.0 passed for world-index 137+4+5+5, patch-engine 117, validators 1072, hooks 22, world-mcp 539 — all 0 fail. This closeout reran the workflow-configuration proof rather than rerunning the full package sweep.
3. `engines.node` is `">=22"` in all six `tools/*/package.json` (so Node 24 is already a declared-supported target). `better-sqlite3` is a transitive dependency of all six packages; on a fresh CI `npm install` it compiles/loads against the runner's pinned Node, so the local stale-binding failure cannot occur on CI. No `tools/<package>` source changes were needed for these five workflows.
4. Cross-artifact boundary under audit — **GitHub branch-protection required-check names**: introducing a matrix renames each workflow's single check from `test` to two legs, `test (22)` and `test (24)`. Any branch-protection rule that requires the old single-name check (configured in the GitHub UI, outside this repo) will read as "expected" and never resolve until updated to the new matrix-leg names. This is the same external-settings boundary flagged when the MSS CI workflow was deleted (archive/tickets/MSSREMOVE-002).
5. FOUNDATIONS alignment: this is **tooling-adjacent** (brainstorm taxonomy) — CI substrate below the machine-facing layer. It touches no Canon Layer, no `_source` record, no skill, no HARD-GATE, no Canon Safety Check, and no Mystery Reserve firewall surface. `docs/FOUNDATIONS.md` §Tooling Recommendation governs the machine-facing canon layer (MCP retrieval / patch engine / validators); the CI runner configuration sits beneath that contract and is unaffected. No Validation Rule or Canon Fact Record schema constrains this change.
6. Mismatch + correction: `ci-story-explorer.yml` **cannot** be matrixed here. Its `test` job runs `npm test`, which is `npm run build && node --test "dist/test/**/*.test.js" && npm --prefix web test` — the trailing `npm --prefix web test` (vitest 2.1.9 / jsdom 25) fails on Node 24 with 38 failures (255 pass / 38 fail, exit 1) versus 293/293 on Node 22. story-explorer is therefore carved out to NODE24CI-002, which first makes its web suite Node-24-green and then adds its matrix leg.

## Architecture Check

1. A `strategy.matrix.node-version` on the existing single job is the canonical GitHub Actions pattern for multi-version coverage — strictly cleaner than duplicating each workflow file per Node version (which would double the maintenance surface and drift). `fail-fast: false` is the correct setting for a compatibility matrix so a failure on one Node version still reports the other leg's result instead of cancelling it.
2. No backwards-compatibility shim or alias is introduced; the change is purely additive (a second Node version) and the Node 22 leg is byte-for-byte the prior behavior.

## Verification Layers

1. Both legs are scheduled per workflow -> YAML parse-proof: `python3 -c "import yaml; d=yaml.safe_load(open(f)); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24']"` for each of the five files.
2. Node 24 is actually green for these five packages -> historical intake reproduction: `bash scripts/check-all.sh` on Node 24 passed for world-index/patch-engine/validators/hooks/world-mcp (story-explorer excluded from this claim).
3. No leftover hardcoded version -> codebase grep-proof: `grep -rn "node-version: '22'" .github/workflows/` returns nothing for the five edited files (only `ci-story-explorer.yml` retains a hardcoded value until NODE24CI-002).

## Landed Changes

### 1. Added a `['22', '24']` matrix to the five Node-24-clean workflows

In each of `ci-world-index.yml`, `ci-patch-engine.yml`, `ci-validators.yml`, `ci-hooks.yml`, `ci-world-mcp.yml`, inserted under `jobs.test` (after `runs-on: ubuntu-latest`, before `steps:`):

```yaml
    strategy:
      fail-fast: false
      matrix:
        node-version: ['22', '24']
```

and changed the `setup-node` step's `node-version: '22'` to `node-version: ${{ matrix.node-version }}`.

## Files to Touch

- `.github/workflows/ci-world-index.yml` (modify)
- `.github/workflows/ci-patch-engine.yml` (modify)
- `.github/workflows/ci-validators.yml` (modify)
- `.github/workflows/ci-hooks.yml` (modify)
- `.github/workflows/ci-world-mcp.yml` (modify)

## Out of Scope

- `.github/workflows/ci-story-explorer.yml` — NODE24CI-002 (frontend toolchain must go Node-24-green first).
- `.github/workflows/codeql.yml` — security scanner, not a Node test job; no matrix needed.
- GitHub branch-protection required-check renames — external UI settings; flag to the maintainer per Assumption 4.
- The local `better-sqlite3` rebuild — already applied; the durable fix is CI's fresh install plus standard `npm ci` after a local Node-major upgrade. No repo change required.

## Acceptance Criteria

### Tests That Must Pass

1. `if grep -rn "node-version: '22'" .github/workflows/ci-world-index.yml .github/workflows/ci-patch-engine.yml .github/workflows/ci-validators.yml .github/workflows/ci-hooks.yml .github/workflows/ci-world-mcp.yml; then exit 1; else echo OK; fi` — no hardcoded version remains in the five edited files.
2. `for f in ci-world-index ci-patch-engine ci-validators ci-hooks ci-world-mcp; do python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/$f.yml')); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24'], '$f'"; done && echo OK` — all five carry the `['22','24']` matrix and parse.
3. External post-merge/PR verification: on the next CI run, each of the five workflows should report two green legs (`test (22)` and `test (24)`).

### Invariants

1. The Node 22 leg behavior is unchanged from before this ticket (additive change only).
2. No `tools/<package>` source, lockfile, or `engines` field is modified by this ticket — it is workflow-YAML-only.

## Test Plan

### New/Modified Tests

1. `None — CI-configuration-only ticket; verification is YAML-parse + grep proof; the live CI matrix run is an external follow-up proof.`

### Commands

1. `for f in ci-world-index ci-patch-engine ci-validators ci-hooks ci-world-mcp; do python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/$f.yml')); print('$f', d['jobs']['test']['strategy']['matrix']['node-version'])"; done`
2. `if grep -rn "node-version: '22'" .github/workflows/ci-world-index.yml .github/workflows/ci-patch-engine.yml .github/workflows/ci-validators.yml .github/workflows/ci-hooks.yml .github/workflows/ci-world-mcp.yml; then exit 1; else echo OK; fi`
3. `bash scripts/check-all.sh` run under Node 24 locally (story-explorer's web leg is the only failing segment; the five packages owned by this ticket pass) — historical intake reproduction that justifies the matrix; not rerun during 2026-06-13 closeout.
4. Narrower-command rationale: there is no unit test for a workflow file; YAML-parse + grep + the live matrix run are the correct verification boundary.

## Outcome

Completion date: 2026-06-13.

Implemented the Node 22/24 matrix in the five Node-24-clean backend workflows:

- `.github/workflows/ci-world-index.yml`
- `.github/workflows/ci-patch-engine.yml`
- `.github/workflows/ci-validators.yml`
- `.github/workflows/ci-hooks.yml`
- `.github/workflows/ci-world-mcp.yml`

Each owned workflow now has `strategy.fail-fast: false`, `matrix.node-version: ['22', '24']`, and `actions/setup-node@v6` reads `node-version` from the matrix. `ci-story-explorer.yml` remains Node-22-only for NODE24CI-002.

## Verification Result

1. `for f in ci-world-index ci-patch-engine ci-validators ci-hooks ci-world-mcp; do python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/$f.yml')); assert d['jobs']['test']['strategy']['matrix']['node-version']==['22','24'], '$f'; assert d['jobs']['test']['strategy']['fail-fast'] is False, '$f'; print('$f', d['jobs']['test']['strategy']['matrix']['node-version'])"; done` — PASS; all five workflows parse with `['22', '24']` and `fail-fast: false`.
2. `if grep -rn "node-version: '22'" .github/workflows/ci-world-index.yml .github/workflows/ci-patch-engine.yml .github/workflows/ci-validators.yml .github/workflows/ci-hooks.yml .github/workflows/ci-world-mcp.yml; then exit 1; else echo OK; fi` — PASS; no hardcoded Node 22 value remains in the five edited workflows.
3. Manual review of `.github/workflows/ci-story-explorer.yml` — PASS; it remains pinned to `node-version: '22'` as the explicit NODE24CI-002 boundary.

## Deviations

- The live GitHub Actions matrix run was not available from the local checkout, so `test (22)` / `test (24)` green-leg proof remains an external follow-up verification item.
- The historical `bash scripts/check-all.sh` Node 24 package sweep was not rerun during this closeout; the current-run proof is workflow-YAML structure plus hardcoded-version removal, which is the owned implementation surface for this ticket.
