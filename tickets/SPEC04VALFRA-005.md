# SPEC04VALFRA-005: `world-validate` CLI

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — adds `tools/validators/src/cli/world-validate.ts` (new CLI entry point declared in ticket 001's `package.json` `bin` mapping). Consumes `structuralValidators` + `ruleValidators` from `tools/validators/src/public/registry.ts` (tickets 003–004). Persists per-verdict rows to the `validation_results` table in `worlds/<slug>/_index/world.db`. No modifications to existing world-index / world-mcp / patch-engine code.
**Deps**: archive/tickets/SPEC04VALFRA-003.md, SPEC04VALFRA-004

## Problem

The reassessed SPEC-04 §CLI usage section specifies `world-validate <world-slug>` with flags `--rules=<list>`, `--structural`, `--json`, `--file <path>`, `--since <commit>`, `--help`, `--version`, and exit codes `0` (all pass), `1` (any fail), `2` (invalid world slug), `3` (index missing). The CLI is the Phase 1 shippable surface — structural validators activate via this CLI before the engine's pre-apply gate (ticket 006) unblocks. Phase 2 Tier 1 acceptance (per `specs/IMPLEMENTATION-ORDER.md`) requires `world-validate animalia` to run end-to-end as the Bootstrap audit prerequisite.

The CLI operates in `full-world` run mode (per the reassessed spec's §Per-run-mode applicability matrix); Rule 5 auto-skips because `ctx.patch_plan` is absent. All other validators (12 out of 13 mechanized) run.

`--since <commit>` is scoped to the git repository containing the given `<world-slug>` per reassessment Improvement M4 — cross-repo diff is out of scope; the Out-of-Scope section here restates that explicitly.

## Assumption Reassessment (2026-04-25)

1. The `bin` mapping `"world-validate": "dist/src/cli/world-validate.js"` was declared in ticket 001's `tools/validators/package.json` (see `archive/tickets/SPEC04VALFRA-001.md` §1). The compiled output lives at that path after `npm run build`; `npm link` or `npm install -g .` exposes the command globally. This ticket creates the source file that populates that mapping.
2. The `validation_results` SQL table at `tools/world-index/src/schema/migrations/001_initial.sql:124-136` has the columns `result_id, world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at`. The CLI inserts one row per emitted verdict, setting `created_at` to the CLI run's wall-clock start. No schema changes — this ticket uses the existing table shape (confirmed via reassessment Improvement M2).
3. Shared boundary: the CLI accesses `worlds/<slug>/_index/world.db` via `better-sqlite3` directly, wrapped by `tools/validators/src/_helpers/index-access.ts` (owned jointly by this ticket and ticket 006). The `WorldIndexReadSurface` type is defined locally inside `tools/validators/src/framework/types.ts` (per ticket 001's reassessment correction — no `WorldIndexReadSurface` public type exists in `@worldloom/world-index/public/types` today). The CLI does NOT reach into world-index parser internals (`tools/world-index/src/parse/*`) or index writers (`tools/world-index/src/index/*`) per the package-boundary rule. The `better-sqlite3` dependency is declared at ticket 001's package.json.
4. FOUNDATIONS principle under audit: **§Tooling Recommendation** — the CLI is a batch-mode machine-facing surface; it consumes the world-index's typed query surface rather than reading atomic YAML files directly (except where a validator explicitly needs the raw file, e.g., `yaml_parse_integrity`). No Validation Rule is weakened.
5. Package-command drift: the CLI uses Node's built-in `node:util.parseArgs` (ES2022+; available in Node 18+) for flag parsing — no external `commander`/`yargs`/`minimist` dependency. Matches the zero-runtime-dep posture of sibling tool packages.
6. Exit-code convention matches the codebase validation sub-check §3.3A: `0` success, `1` generic failure, `2` invalid input, `3` missing mandatory file, (`4` reserved for parse failure above threshold per SPEC-01 but not used here — this CLI's `0/1/2/3` mapping matches the spec's explicit mapping). No collisions.
7. Schema extension posture: **additive-only**. The CLI reads from `validation_results` (for the `--since` commit-diff workflow's cache path) and writes to it (per-run verdict persistence). No column additions; no row-shape changes.
8. Adjacent-contradiction classification: `--since <commit>` implementation needs git history. The simplest approach is `git log --since=<commit> --name-only -- worlds/<slug>/_source/ worlds/<slug>/adjudications/` to derive the touched-file set, then run only validators whose `applies_to` matches the touched set. Cross-repo diff (when worlds/ lives in a separate repo) is explicitly out of scope.
9. Post-ticket-003 handoff correction: structural validators from `archive/tickets/SPEC04VALFRA-003.md` run over `ctx.index` plus explicit file/world-root inputs for raw YAML/frontmatter/Discovery parsing. The CLI must pass a real `world_root` or explicit `files` input to `runValidators`; invoking the runner with only `{ world_slug }` leaves raw-file structural validators without a truthful file surface when the CLI is launched from arbitrary directories.

## Architecture Check

1. Using Node's built-in `parseArgs` over a third-party flag library preserves the zero-runtime-dep posture and matches sibling tools. Flag definitions live in a single `const options = {...}` block; help text is generated from the same source.
2. The CLI runs in `full-world` mode by default; `--file <path>` narrows the scope to a single file (still full-world mode, just a restricted input set); `--since <commit>` narrows to a git-diff subset. Neither flag switches to `incremental` mode — incremental mode is exclusively Hook 5's surface (SPEC-05 Part B), not the CLI's.
3. `--rules=<list>` filter works by validator `name` prefix matching: `--rules=1,2,6` selects validators whose name starts with `rule1_`, `rule2_`, or `rule6_`. `--structural` selects the `structuralValidators` list directly. The two flags are mutually exclusive; setting both exits with code `2`.
4. `--json` output is a single JSON document: `{world_slug, started_at, finished_at, verdicts: Verdict[], summary: {fail_count, warn_count, info_count, validators_run, validators_skipped}}` — matching the `ValidatorRun` interface from ticket 001 (runtime-only shape; the CLI marshals and prints it, nothing persists the runtime `ValidatorRun` per reassessment M2).
5. Persistence: before emitting verdicts, the CLI clears existing `validation_results` rows for this world slug (or for the touched-file subset when `--since` / `--file` narrows scope) then inserts one row per new verdict. This matches the "only most-recent run persisted" posture from the reassessed spec's §Out of Scope.
6. No backwards-compatibility aliasing/shims introduced. No legacy `world-validate` form exists to shim against.

## Verification Layers

1. CLI entry compiles and is executable → build-proof (`cd tools/validators && npm run build && test -x dist/src/cli/world-validate.js`).
2. `--help` output lists all documented flags → command test (`./dist/src/cli/world-validate.js --help` output matches `grep -c "^\s*--\(rules\|structural\|json\|file\|since\|help\|version\)" <stdout>` ≥7).
3. `--version` matches package.json version → command test (`./dist/src/cli/world-validate.js --version` prints `0.1.0` matching `package.json`).
4. Exit code `2` for invalid slug → command test (`./dist/src/cli/world-validate.js nonexistent-world; echo $?` prints `2`).
5. Exit code `3` for missing index → command test (a world with `_source/` but no `_index/world.db`; exit `3`).
6. Exit code `0` for clean animalia → command test (assumes Bootstrap audit in ticket 007 has resolved pre-existing defects; if defects remain, ticket 007's grandfather path downgrades them to `info` so ticket 005's `world-validate animalia` exits 0).
7. Exit code `1` for deliberate violation → command test (authors a temporary MR record with missing `disallowed_cheap_answers`, runs `--file <path>`, asserts exit `1`).
8. `--json` output parses as valid JSON → pipe test (`./dist/src/cli/world-validate.js animalia --json | jq .summary.fail_count`).
9. `validation_results` persistence → SQL check (`sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM validation_results WHERE world_slug = 'animalia'"` returns a non-zero count after a run; returns an EXACTLY-matching count across two consecutive runs — previous rows cleared, new rows inserted).
10. `--rules=<list>` and `--structural` mutual exclusion → command test (`./dist/src/cli/world-validate.js animalia --rules=1 --structural; echo $?` prints `2` with a clear stderr message).

## What to Change

### 1. Create `tools/validators/src/cli/world-validate.ts`

Single-file CLI entrypoint. Structure:

```typescript
#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
// import the validator surface (package-internal registry)
// import the framework runner
// import the world-index public read surface

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    options: {
      rules: { type: "string" },
      structural: { type: "boolean" },
      json: { type: "boolean" },
      file: { type: "string" },
      since: { type: "string" },
      help: { type: "boolean" },
      version: { type: "boolean" },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) { printHelp(); return 0; }
  if (values.version) { console.log(readFileSync(resolve(__dirname, "../../../package.json"), "utf8").match(/"version":\s*"([^"]+)"/)?.[1] ?? "unknown"); return 0; }

  if (values.rules && values.structural) {
    console.error("--rules and --structural are mutually exclusive");
    return 2;
  }

  const worldSlug = positionals[0];
  if (!worldSlug) { console.error("missing world slug"); return 2; }

  // path resolution: worlds/<slug>/
  const worldRoot = resolve(process.cwd(), "worlds", worldSlug);
  if (!statSync(worldRoot, { throwIfNoEntry: false })) {
    console.error(`world '${worldSlug}' not found at ${worldRoot}`);
    return 2;
  }

  const indexPath = join(worldRoot, "_index", "world.db");
  if (!statSync(indexPath, { throwIfNoEntry: false })) {
    console.error(`index missing at ${indexPath}; run 'world-index build ${worldSlug}' first`);
    return 3;
  }

  // derive touched files from --since or --file, else full-world
  const touchedFiles = await deriveTouchedFiles(worldRoot, values);

  // select validator set
  const allValidators = [...structuralValidators, ...ruleValidators];
  const selected = selectValidators(allValidators, values);

  // open index; build Context
  const db = new Database(indexPath, { readonly: false });
  const ctx: Context = {
    run_mode: "full-world",
    world_slug: worldSlug,
    index: buildReadSurface(db),
    touched_files: touchedFiles,
    // patch_plan absent in full-world mode; Rule 5 auto-skips via applies_to
  };

  // run validators, persist verdicts, emit output
  const run = await runValidators(selected, { world_slug: worldSlug, world_root: worldRoot }, ctx);
  persistVerdicts(db, worldSlug, run.verdicts, touchedFiles);
  db.close();

  if (values.json) { process.stdout.write(JSON.stringify(run, null, 2) + "\n"); }
  else { printHuman(run); }

  return run.summary.fail_count > 0 ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((err) => { console.error(err); process.exit(1); });
```

Helper functions (`printHelp`, `deriveTouchedFiles`, `selectValidators`, `buildReadSurface`, `persistVerdicts`, `printHuman`) defined inline or in sibling helper files under `src/cli/`. `worldRoot` is the resolved `worlds/<slug>` directory for the selected world and is passed into validators so structural raw-file checks can read the same world tree the index represents.

### 2. `deriveTouchedFiles` helper

- If `values.file` is set, return `[values.file]` (resolved against the world root).
- If `values.since` is set, shell out to `git log --since=<commit> --name-only -- worlds/<slug>/_source/ worlds/<slug>/adjudications/` (scoped to the repo containing the world slug — detect via `git rev-parse --show-toplevel` run from the world's directory), parse output, return the deduped file list.
- Else, return `[]` (full-world scope — the empty array is the signal; validators' `applies_to` predicates apply a different filter for full-world vs incremental).

### 3. `selectValidators` helper

- If `values.structural`, return `structuralValidators`.
- If `values.rules`, parse the comma-list (`"1,2,6"`) into rule numbers, then filter `[...structuralValidators, ...ruleValidators]` to validators whose `name` starts with `rule<N>_` for each number in the list. Note: structural validators are NOT selected by `--rules`; `--structural` is the dedicated flag for them.
- Else return `[...structuralValidators, ...ruleValidators]` (all validators; Rule 5 auto-skips via `applies_to` in full-world mode).

### 4. `persistVerdicts` helper

SQL:
```sql
BEGIN;
DELETE FROM validation_results WHERE world_slug = ? AND (? IS NULL OR file_path = ? OR file_path IN (<placeholders>));
INSERT INTO validation_results (world_slug, validator_name, severity, code, message, node_id, file_path, line_range_start, line_range_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
-- repeat insert per verdict
COMMIT;
```

The `DELETE` scope follows the run scope: full-world deletes all rows for the world; `--file` / `--since` delete only rows whose `file_path` is in the touched set.

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
- `tools/validators/package.json` (modify only if ticket 001's `bin` entry needs adjustment; expected unchanged)

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
5. `dist/src/cli/world-validate.js animalia --rules=1 --structural; echo $?` prints `2` (mutual exclusion).
6. `dist/src/cli/world-validate.js animalia --json` output parses as valid JSON and contains `summary.fail_count`.
7. `sqlite3 worlds/animalia/_index/world.db "SELECT COUNT(*) FROM validation_results WHERE world_slug='animalia'"` returns a non-zero count after a full-world run; returns the same count across two back-to-back runs.
8. `dist/src/cli/world-validate.js animalia --file worlds/animalia/_source/canon/CF-0001.yaml` runs only validators whose `applies_to` accepts a CF-scope touched-files array.
9. `dist/src/cli/world-validate.js animalia --since HEAD~1` exits cleanly (zero or one fail based on recent changes).

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
   - `--rules=1` selects only Rule 1; `--structural` selects all 7 structural.
   - Persistence: row count before/after a run; row count consistency across repeated runs.
2. `tools/validators/tests/cli/persistence.test.ts` — dedicated transaction-boundary test: inject a simulated mid-run failure, assert `validation_results` rolls back to pre-run state.

### Commands

1. `cd tools/validators && npm run build && npm run test` (targeted).
2. `cd tools/validators && npm link && world-validate animalia` (end-to-end; requires `npm link` to expose the `bin` entry globally, then invoked with animalia as the live corpus). This command's output feeds into ticket 007's Bootstrap audit disposition.
3. `sqlite3 worlds/animalia/_index/world.db ".schema validation_results"` prints the expected schema (read-only — verification that the CLI's persistence target matches the existing migration).
