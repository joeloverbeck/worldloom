# SPEC04VALFRA-005: `world-validate` CLI

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — added `tools/validators/src/cli/world-validate.ts` and `tools/validators/src/cli/_helpers.ts`. The CLI consumes `structuralValidators` + `ruleValidators` from `tools/validators/src/public/registry.ts`, reads `worlds/<slug>/_index/world.db`, persists per-verdict rows to `validation_results`, and keeps the existing world-index / world-mcp / patch-engine code unchanged. `tools/validators/package.json` now declares the direct SQLite runtime dependency used by the CLI and makes the built CLI executable during `npm run build`.
**Deps**: archive/tickets/SPEC04VALFRA-003.md, archive/tickets/SPEC04VALFRA-004.md

## Problem

The reassessed SPEC-04 §CLI usage section specifies `world-validate <world-slug>` with flags `--rules=<list>`, `--structural`, `--json`, `--file <path>`, `--since <commit>`, `--help`, `--version`, and exit codes `0` (all pass), `1` (any fail), `2` (invalid world slug), `3` (index missing). The CLI is the Phase 1 shippable surface — structural validators activate via this CLI before the engine's pre-apply gate (ticket 006) unblocks. Phase 2 Tier 1 acceptance (per `specs/IMPLEMENTATION-ORDER.md`) requires `world-validate animalia` to run end-to-end as the Bootstrap audit prerequisite.

The CLI operates in `full-world` run mode (per the reassessed spec's §Per-run-mode applicability matrix); Rule 5 auto-skips because `ctx.patch_plan` is absent. All other validators (12 out of 13 mechanized) run.

`--since <commit>` is scoped to the git repository containing the given `<world-slug>` per reassessment Improvement M4 — cross-repo diff is out of scope; the Out-of-Scope section here restates that explicitly.

## Assumption Reassessment (2026-04-25)

1. The `bin` mapping `"world-validate": "dist/src/cli/world-validate.js"` was declared in ticket 001's `tools/validators/package.json` (see `archive/tickets/SPEC04VALFRA-001.md` §1). The compiled output lives at that path after `npm run build`; `npm link` or `npm install -g .` exposes the command globally. This ticket created the source file that populates that mapping and changed `npm run build` to `tsc -p tsconfig.json && chmod +x dist/src/cli/world-validate.js` because the drafted direct-execution proof requires the emitted CLI to be executable.
2. The `validation_results` SQL table at `tools/world-index/src/schema/migrations/001_initial.sql:124-136` has the columns `result_id, world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at`. The CLI inserts one row per emitted verdict, setting `created_at` to the CLI run's wall-clock start. No schema changes — this ticket uses the existing table shape (confirmed via reassessment Improvement M2).
3. Shared boundary: the CLI accesses `worlds/<slug>/_index/world.db` via `better-sqlite3` directly, wrapped by `tools/validators/src/cli/_helpers.ts`. The `WorldIndexReadSurface` type is defined locally inside `tools/validators/src/framework/types.ts` (per ticket 001's reassessment correction — no `WorldIndexReadSurface` public type exists in `@worldloom/world-index/public/types` today). The CLI does NOT reach into world-index parser internals (`tools/world-index/src/parse/*`) or index writers (`tools/world-index/src/index/*`) per the package-boundary rule. Reassessment corrected the stale package claim: `better-sqlite3` existed in `tools/validators/package-lock.json` only through the linked `@worldloom/world-index` dependency, so this ticket added direct `better-sqlite3` and `@types/better-sqlite3` entries to `tools/validators/package.json` and refreshed `tools/validators/package-lock.json`.
4. FOUNDATIONS principle under audit: **§Tooling Recommendation** — the CLI is a batch-mode machine-facing surface; it consumes the world-index's typed query surface rather than reading atomic YAML files directly (except where a validator explicitly needs the raw file, e.g., `yaml_parse_integrity`). No Validation Rule is weakened.
5. Package-command drift: the CLI uses Node's built-in `node:util.parseArgs` (ES2022+; available in Node 18+) for flag parsing — no external `commander`/`yargs`/`minimist` dependency. Matches the zero-runtime-dep posture of sibling tool packages.
6. Exit-code convention matches the codebase validation sub-check §3.3A: `0` success, `1` generic failure, `2` invalid input, `3` missing mandatory file, (`4` reserved for parse failure above threshold per SPEC-01 but not used here — this CLI's `0/1/2/3` mapping matches the spec's explicit mapping). No collisions.
7. Schema extension posture: **additive-only**. The CLI reads from `validation_results` (for the `--since` commit-diff workflow's cache path) and writes to it (per-run verdict persistence). No column additions; no row-shape changes.
8. Adjacent-contradiction classification: `--since <commit>` implementation needs git history. The landed CLI uses `git rev-parse --show-toplevel` from the world directory, then `git diff --name-only <commit>..HEAD -- worlds/<slug>/_source worlds/<slug>/adjudications` to derive the touched-file set and run only validators whose `applies_to` accepts that touched set under an incremental applicability probe. The reported `ValidatorRun.run_mode` remains `full-world`; cross-repo diff (when worlds/ lives in a separate repo) is explicitly out of scope.
9. Post-ticket-003 handoff correction: structural validators from `archive/tickets/SPEC04VALFRA-003.md` run over `ctx.index` plus explicit file/world-root inputs for raw YAML/frontmatter/Discovery parsing. The CLI must pass a real `world_root` or explicit `files` input to `runValidators`; invoking the runner with only `{ world_slug }` leaves raw-file structural validators without a truthful file surface when the CLI is launched from arbitrary directories.
10. Persistence proof correction: the drafted `validation_results` acceptance text claimed a clean run must leave a non-zero row count. The live validator framework only persists emitted verdicts; a truly clean fixture can truthfully leave zero rows. The owned invariant is stable scoped cleanup plus insertion of emitted verdicts, so the tests prove stable row counts for a clean repeated run and non-zero persisted rows for a deliberate failing run.
11. Same-package documentation correction: `tools/validators/README.md` still described the CLI as planned in ticket 005. This ticket updated that package-local user-facing surface to state that `world-validate` is present and to describe its DB, `full-world`, selector, and persistence behavior.

## Architecture Check

1. Using Node's built-in `parseArgs` over a third-party flag library preserves the zero-runtime-dep posture and matches sibling tools. Flag definitions live in a single `const options = {...}` block; help text is generated from the same source.
2. The CLI runs in `full-world` mode by default; `--file <path>` narrows the scope to a single file (still full-world mode, just a restricted input set); `--since <commit>` narrows to a git-diff subset. Neither flag switches to `incremental` mode — incremental mode is exclusively Hook 5's surface (SPEC-05 Part B), not the CLI's.
3. `--rules=<list>` filter works by validator `name` prefix matching: `--rules=1,2,6` selects validators whose name starts with `rule1_`, `rule2_`, or `rule6_`. `--structural` selects the `structuralValidators` list directly. The two flags are mutually exclusive; setting both exits with code `2`. Rule 3 is rejected as invalid CLI input because it remains skill-judgment only and has no mechanized validator.
4. `--json` output is a single JSON document: `{world_slug, started_at, finished_at, verdicts: Verdict[], summary: {fail_count, warn_count, info_count, validators_run, validators_skipped}}` — matching the `ValidatorRun` interface from ticket 001 (runtime-only shape; the CLI marshals and prints it, nothing persists the runtime `ValidatorRun` per reassessment M2).
5. Persistence: before emitting verdicts, the CLI clears existing `validation_results` rows for this world slug (or for the touched-file subset when `--since` / `--file` narrows scope) then inserts one row per new verdict. This matches the "only most-recent run persisted" posture from the reassessed spec's §Out of Scope.
6. No backwards-compatibility aliasing/shims introduced. No legacy `world-validate` form exists to shim against.

## Verification Layers

1. CLI entry compiles and is executable → build-proof (`cd tools/validators && npm run build && test -x dist/src/cli/world-validate.js`).
2. `--help` output lists all documented flags → command test (`./dist/src/cli/world-validate.js --help` output matches `grep -c "^\s*--\(rules\|structural\|json\|file\|since\|help\|version\)" <stdout>` ≥7).
3. `--version` matches package.json version → command test (`./dist/src/cli/world-validate.js --version` prints `0.1.0` matching `package.json`).
4. Exit code `2` for invalid slug → command test (`./dist/src/cli/world-validate.js nonexistent-world; echo $?` prints `2`).
5. Exit code `3` for missing index → command test (a world with `_source/` but no `_index/world.db`; exit `3`).
6. Exit code `0` for a clean indexed fixture world → command test in `tools/validators/tests/cli/world-validate.test.ts`.
7. Exit code `1` for deliberate violation → command test in `tools/validators/tests/cli/world-validate.test.ts` creates an MR record with empty `disallowed_cheap_answers`, runs `--file <path>`, and asserts exit `1`.
8. `--json` output parses as valid JSON → command test in `tools/validators/tests/cli/world-validate.test.ts`.
9. `validation_results` persistence → command test in `tools/validators/tests/cli/world-validate.test.ts` asserts repeated clean runs keep row counts stable and a failing run persists at least one row.
10. `--rules=<list>` and `--structural` mutual exclusion, plus rejection of skill-judgment Rule 3 → command test in `tools/validators/tests/cli/world-validate.test.ts` prints exit `2` with a clear stderr message.

## What to Change

### 1. Create `tools/validators/src/cli/world-validate.ts`

Implemented. The CLI parses the documented flags with `node:util.parseArgs`, validates the world slug and index path from the invocation cwd, constructs a `Context` with `run_mode: "full-world"`, runs the selected validators, persists emitted verdicts, and returns exit codes `0/1/2/3`.

The CLI passes `world_root` plus explicit touched file inputs into `runValidators` so raw-file structural validators can read the same world tree represented by the index.

### 2. `deriveTouchedFiles` helper

- If `values.file` is set, return `[values.file]` resolved relative to the world root, plus that file's content for raw-file validators.
- If `values.since` is set, shell out to `git diff --name-only <commit>..HEAD -- worlds/<slug>/_source worlds/<slug>/adjudications` (scoped to the repo containing the world slug — detect via `git rev-parse --show-toplevel` run from the world's directory), parse output, return the deduped file list and file contents.
- Else, return `[]` (full-world scope — the empty array is the signal; validators' `applies_to` predicates apply a different filter for full-world vs incremental).

### 3. `selectValidators` helper

- If `values.structural`, return `structuralValidators`.
- If `values.rules`, parse the comma-list (`"1,2,6"`) into rule numbers, then filter `[...structuralValidators, ...ruleValidators]` to validators whose `name` starts with `rule<N>_` for each number in the list. Note: structural validators are NOT selected by `--rules`; `--structural` is the dedicated flag for them.
- Else return `[...structuralValidators, ...ruleValidators]` (all validators; Rule 5 auto-skips via `applies_to` in full-world mode).
- When `--file` or `--since` supplies touched files, the helper performs a selector-only incremental applicability probe so only validators whose `applies_to` accepts the touched file class run. The actual runtime context still reports `run_mode: "full-world"`.

### 4. `persistVerdicts` helper

SQL:
```sql
BEGIN;
DELETE FROM validation_results WHERE world_slug = ? AND (? IS NULL OR file_path = ? OR file_path IN (<placeholders>));
INSERT INTO validation_results (world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
-- repeat insert per verdict
COMMIT;
```

The `DELETE` scope follows the run scope: full-world deletes all rows for the world; `--file` / `--since` delete only rows whose `file_path` is in the touched set. The helper uses a `better-sqlite3` transaction; clean runs may persist zero rows because only emitted verdicts are stored.

### 5. `printHuman` helper

Human-readable output: header with world slug + run duration + validator run/skip counts; per-verdict lines `<severity> [<code>] <message> (<file>:<line_range>)`; trailer with summary counts and overall verdict.

### 6. `printHelp` helper

```
world-validate <world-slug> [options]

Run the SPEC-04 validator framework against a world's atomic-source tree.

Options:
  --rules=<list>        Comma-separated rule numbers (1,2,4,5,6,7). Mutually exclusive with --structural.
  --structural          Run structural validators only. Mutually exclusive with --rules.
  --json                Emit machine-readable JSON output.
  --file <path>         Narrow scope to a single file within worlds/<slug>/.
  --since <commit>      Narrow scope to files changed since <commit> in the world's git repo.
  --help                Show this help text.
  --version             Print the validator framework version.

Exit codes:
  0  All pass.
  1  One or more validators emitted a fail verdict.
  2  Invalid input (unknown slug, mutually-exclusive flags, etc.).
  3  Index missing at worlds/<slug>/_index/world.db.
```

## Files to Touch

- `tools/validators/src/cli/world-validate.ts` (new)
- `tools/validators/src/cli/_helpers.ts` (new; houses `deriveTouchedFiles`, `selectValidators`, `persistVerdicts`, `printHuman`, `printHelp`)
- `tools/validators/tests/cli/world-validate.test.ts` (new — exercises exit codes, flag parsing, JSON output shape, persistence)
- `tools/validators/package.json` (modified — direct SQLite dependency and executable build proof)
- `tools/validators/package-lock.json` (modified — dependency lock refresh)
- `tools/validators/README.md` (modified — package-local CLI status and behavior)

## Out of Scope

- Integration with the patch engine's pre-apply hook — ticket 006.
- Integration with Hook 5 (SPEC-05 Part B PostToolUse auto-validate) — owned by SPEC-05 decomposition.
- Bootstrap audit of animalia (grandfathering latent `info`-severity findings) — ticket 007.
- Cross-repo `--since` diff — scoped to the repo containing the world slug per reassessment M4. A world kept in a separate private-world repo invokes the CLI from within that repo; cross-repo git integration is not attempted.
- Incremental mode from the CLI — the CLI operates in `full-world` mode; incremental is Hook 5's surface.
- Persisting run-level metadata (ValidatorRun started_at/finished_at/summary) — per reassessment M2, run-level shape is runtime-only; only per-verdict rows persist.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/validators && npm run build && npm run test` exits 0; CLI test suite passes all named scenarios.
2. `dist/src/cli/world-validate.js --help` prints help text naming all 7 documented flags.
3. `dist/src/cli/world-validate.js --version` prints `0.1.0` matching `package.json`.
4. `dist/src/cli/world-validate.js nonexistent-slug; echo $?` prints `2`.
5. `dist/src/cli/world-validate.js <fixture> --rules=1 --structural; echo $?` prints `2` (mutual exclusion).
6. `dist/src/cli/world-validate.js <fixture> --json` output parses as valid JSON and contains `summary.fail_count`.
7. Repeated clean fixture runs keep `validation_results` row counts stable; deliberate failing fixture runs persist at least one verdict row.
8. `dist/src/cli/world-validate.js <fixture> --file worlds/<fixture>/_source/mystery-reserve/M-1.yaml` runs only validators whose `applies_to` accepts an MR-scope touched-files array and exits `1` for the deliberate violation.
9. `dist/src/cli/world-validate.js <fixture> --since <base-commit>` narrows validator selection to the changed `_source/` / `adjudications/` files in the world's git repo.

### Invariants

1. The CLI's `run_mode` is always `full-world` — no flag switches it to `incremental` or `pre-apply`. The per-run-mode applicability matrix is enforced at the validator level via `applies_to`; CLI's job is to pass the right `Context`.
2. Exit code mapping is strictly `0/1/2/3` per reassessed spec's §CLI usage. No other exit codes (`4`+) appear in the CLI.
3. Persistence clears rows in scope before inserting new ones; two consecutive runs with the same scope result in EQUAL row counts, not double-counted rows. A run that fails mid-way must NOT leave the table in a partial state — the `BEGIN;...COMMIT;` transaction boundary is load-bearing.
4. `--structural` and `--rules` never overlap: `--structural` selects `structuralValidators` only; `--rules` selects from both lists filtered by `rule<N>_` prefix (which matches rule-derived validators only by construction).
5. The CLI does NOT modify atomic records or hybrid-file content under `worlds/<slug>/` — it only reads them and writes to `_index/world.db`.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/cli/world-validate.test.ts` — exercises:
   - `--help`, `--version` output shape.
   - Exit codes 2 (invalid slug, mutual exclusion), 3 (missing index), 0 (clean run against a fixture world), 1 (deliberate-violation fixture).
   - `--json` output parses; shape matches `ValidatorRun`.
   - `--file <path>` narrows scope.
   - `--since <commit>` narrows scope (via a fixture git repo created by the test).
   - `--rules=1` selects only Rule 1; `--rules=3` is rejected because Rule 3 is skill-judgment only; `--structural` selects all 7 structural.
   - Persistence: row count before/after a run; row count consistency across repeated runs.
2. No separate `persistence.test.ts` was added. Persistence is covered in `tools/validators/tests/cli/world-validate.test.ts` by repeated clean-run row-count stability and failing-run row insertion; a simulated mid-run failure hook would require adding production-only fault injection that this ticket intentionally avoids.

### Commands

1. `cd tools/validators && npm run build && npm run test` (targeted).
2. `cd tools/validators && test -x dist/src/cli/world-validate.js`
3. `cd tools/validators && ./dist/src/cli/world-validate.js --help`
4. `cd tools/validators && ./dist/src/cli/world-validate.js --version`

## Outcome

Implemented the `world-validate` CLI and helper layer. The command now supports `--rules`, `--structural`, `--json`, `--file`, `--since`, `--help`, and `--version`; opens the existing world index; adapts DB rows into `WorldIndexReadSurface`; passes raw file inputs to structural validators; persists verdict rows transactionally; and returns the documented exit codes.

Package-local closeout also updated `tools/validators/README.md`, added the direct SQLite runtime/type dependencies, and made the emitted CLI executable during build.

## Verification Result

Passed:

1. `cd tools/validators && npm run build`
2. `cd tools/validators && npm run test` — 33 tests passed.
3. `cd tools/validators && test -x dist/src/cli/world-validate.js`
4. `cd tools/validators && ./dist/src/cli/world-validate.js --help`
5. `cd tools/validators && ./dist/src/cli/world-validate.js --version` — printed `0.1.0`.

`npm install` emitted one deprecated-package warning for `prebuild-install`, 11 funding notices, and 2 moderate vulnerabilities. Dependency remediation is outside this ticket.

## Deviations

- The live package did not directly declare `better-sqlite3` despite the ticket claiming it did. This ticket added the direct dependency because the CLI imports it directly.
- The clean-run persistence acceptance text was corrected: a clean validator run can emit zero verdicts and therefore persist zero rows. The proof now checks stable row counts for repeated clean runs and non-zero rows for a deliberate failing run.
- The live CLI proof uses direct `dist/src/cli/world-validate.js` execution rather than `npm link`. Global-link smoke remains unnecessary for this implementation-only ticket because the package `bin` mapping already points at the same emitted file and the direct executable proof passed.
- Repo-level quick-reference docs still contain pre-landing wording for the CLI in `docs/WORKFLOWS.md`; post-ticket review routes that bounded documentation cleanup to `tickets/SPEC07DOCUPD-001.md` rather than widening this implementation ticket after proof.
