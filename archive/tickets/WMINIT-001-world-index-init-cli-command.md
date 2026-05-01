# WMINIT-001: Replace `@worldloom/world-index/index/open` package-import bootstrap with a `world-index init <slug>` CLI subcommand

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — added `init` subcommand to `tools/world-index/src/cli.ts` and `tools/world-index/src/commands/init.ts` (with regenerated ignored `dist/`); tests in `tools/world-index/tests/cli-init.test.ts`; defensive ripple to `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 plus CLI docs in `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md`.
**Deps**: None (CLI extension to an existing package).

## Problem

At intake, `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 (post-2026-05-01 audit) prescribed:

```
node -e "const {openIndex} = require('./tools/world-index/dist/src/index/open.js'); openIndex(process.cwd(), '<world-slug>').close();"
```

This direct-path form was the operational fix landed by the create-base-world skill audit on 2026-05-01 after the original prescribed form failed:

```
node -e "require('@worldloom/world-index/index/open').openIndex(process.cwd(), '<world-slug>').close()"
```

The original form fails because the worldloom repo has no root-level `package.json` registering `@worldloom/*` as a workspace, and no `node_modules/@worldloom/world-index/` symlink resolving the alias. The `tools/world-index/package.json` exports `./index/open` but the resolver lookup for `@worldloom/world-index/index/open` traverses the working directory's node_modules tree, which does not contain the package.

The direct-path fix landed by the audit worked from project root but had fragility:
1. **Layout-coupled** — references the explicit path `./tools/world-index/dist/src/index/open.js`. Any future repo restructure (pnpm workspace introduction, monorepo layout change, dist-output-path change) breaks the bootstrap.
2. **Hidden-as-Node-eval** — the bootstrap is a one-off `node -e "..."` script invocation, not a discoverable CLI command. Operators reading `tools/world-index/dist/src/cli.js --help` see `sync`, `build`, `render`, etc. but not `init` — bootstrapping a new world is invisible to the CLI's documented surface.
3. **Worktree-fragile** — when invoked inside a git worktree, the relative `./tools/world-index/dist/...` path resolves against the worktree root; if the dist/ build is stale (or the worktree was created without running the build), the bootstrap silently uses a stale binary.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: the original package-import form failed with `Cannot find module '@worldloom/world-index/index/open'`. Recovery cost: ~10 minutes of Node module-resolution debugging + repo-layout grepping + workaround discovery. The audit (Issue 1) documented the direct-path form, but the audit also flagged "Or, if a CLI exists for index initialization, prefer that" — and at intake no CLI command existed.

The clean fix is to add `world-index init <slug>` as a first-class CLI subcommand parallel to the existing `world-index sync`, `world-index build`, etc.

After this ticket, the skill prescribes:

```
node tools/world-index/dist/src/cli.js init <world-slug>
```

This is:
- **Layout-independent** — the CLI delegates to internal modules through TypeScript's normal import resolution; no external workspace alias dependency.
- **Discoverable** — operators see `init` alongside `sync`, `build` in `world-index --help`.
- **Worktree-safe** — the same risk applies (stale dist/ in a fresh worktree) but the CLI surface makes it obvious that `npm run build` is a prerequisite rather than burying the dependency in a Node-eval one-liner.

## Assumption Reassessment (2026-05-01)

1. `tools/world-index/dist/src/cli.js` exists and is the canonical CLI entry point per `tools/world-index/package.json` `bin: { "world-index": "dist/src/cli.js" }`. Confirmed via direct ls.
2. `tools/world-index/dist/src/index/open.js` exports `openIndex(repoRoot, worldSlug)` returning a `Database` instance with `.close()`. Confirmed via direct grep on 2026-05-01 (`exports.openIndex = openIndex`).
3. The `openIndex` call creates `worlds/<slug>/_index/world.db` with the schema applied and zero nodes if the database does not yet exist; otherwise opens the existing database. This is the empty-bootstrap behavior `create-base-world` Phase 11 step 3 depends on.
4. Cross-skill / cross-tool boundary under audit: the contract between (a) the `world-index` package's bootstrap pathway and (b) the `create-base-world` skill's Phase 11 step 3 prerequisite (`submit_patch_plan` requires the index to exist before its post-apply `world-index sync`). The shared contract is "an empty `worlds/<slug>/_index/world.db` exists with schema applied"; the failure mode is the brittle bootstrap pathway documented above. Other consumers of empty-index-bootstrap currently exist only in `create-base-world`; future genesis-style operations (e.g., a hypothetical re-build flow) would inherit the same fragility until the CLI command is canonical.
5. **FOUNDATIONS principle motivating this ticket**: §Machine-Facing Layer §1 World Index — "SQLite + FTS5 index of parsed nodes ... derived, deterministic, and regenerable from markdown." The index is a derived artifact that should have a first-class CLI initialization pathway alongside the existing CLI surfaces (`sync`, `build`, `render`); a Node-eval one-liner is not the right operational fit for the same package's first-class user-facing operations. Per `tickets/README.md` §Mandatory Pre-Implementation Checks item 1 (dependency references) + item 4 (scope does not duplicate already-delivered architecture): no existing CLI subcommand initializes an empty world.db; this ticket adds the missing canonical surface.
6. Schema extension: NO schema changes. The CLI command wraps the existing `openIndex` function. The new command's input is `<slug>` (positional argument); output is the file `worlds/<slug>/_index/world.db` (newly created with schema applied) and a confirmation message on stdout.
7. Pipeline-wide grep for current Node-eval bootstrap callers: only `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 (post-2026-05-01 audit). The references file `.claude/skills/create-base-world/references/engine-envelope-shape.md` does NOT document the bootstrap step (it covers envelope shape only); the skill's Phase 11 step 3 was the only Node-eval cleanup site.
8. Same-seam CLI documentation consumers checked during reassessment: `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md` all describe the world-index command surface. `tools/world-index/README.md` still says "Planned CLI" even though `tools/world-index/src/cli.ts` is live; this ticket owns truthing that heading while adding `init`.
9. Adjacent contradiction surfaced during reassessment: a workspace-package-json approach (registering `@worldloom/world-index` as a resolvable package via root-level `package.json` with `workspaces`) was an alternative considered but rejected — it changes the repo's package layout in a more invasive way than adding a CLI subcommand, and the layout decision (no root package.json) was deliberate per the existing repo structure. CLI subcommand is the minimal-blast-radius fix.

## Architecture Check

1. Adding `world-index init <slug>` aligns with the existing CLI surface conventions (`world-index sync <slug>`, `world-index build`, etc.) — uniform CLI shape, uniform argument convention, uniform error handling.
2. No backwards-compatibility shims. The Node-eval bootstrap can be removed from skill prose in the same change. The brittle direct-path form goes away.
3. The CLI internally calls `openIndex` (the same underlying function the Node-eval form invokes), so behavior is identical — only the invocation shape changes.
4. Worktree safety: same as other CLI subcommands. The CLI pattern surfaces the `cwd` argument explicitly via `process.cwd()` (matching the existing `openIndex` API) so worktree-resolved paths Just Work.

## Verification Layers

1. `node tools/world-index/dist/src/cli.js init test-world-slug` creates `worlds/test-world-slug/_index/world.db` with schema applied and zero nodes -> CLI integration test (`tools/world-index/tests/cli-init.test.ts`) and temp-root CLI smoke.
2. Re-running `init` on an existing world returns `world_index_already_exists` with exit code 1, parallel to how `create-base-world`'s skill-side HARD-GATE refuses to overwrite an existing world directory -> same test file.
3. Skill prose at `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 cites the new CLI command -> grep-proof: `rg -n 'world-index init' .claude/skills/create-base-world/SKILL.md` returns the Phase 11 hit; `rg -n "@worldloom/world-index/index/open|require\('./tools/world-index|dist/src/index/open|node -e" .claude/skills/create-base-world tools/world-index/README.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md` returns no hits.
4. CLI help (`world-index --help`) shows the new subcommand -> CLI test plus direct help smoke.

## What to Change

### 1. Add `init` subcommand to the CLI

In `tools/world-index/src/cli.ts` and `tools/world-index/src/commands/init.ts`:
- Added an `init` subcommand handler that:
  - accepts `<slug>` as a positional argument
  - validates lowercase kebab-case slugs
  - computes the target path `worlds/<slug>/_index/world.db`
  - rejects existing `world.db` with `world_index_already_exists` and exit code 1
  - calls `openIndex(process.cwd(), slug)` and immediately closes the result
  - emits `Initialized empty world index at worlds/<slug>/_index/world.db`

### 2. Build output

`npm run build` regenerates `tools/world-index/dist/src/cli.js` with the new subcommand registered.

### 3. Tests

`tools/world-index/tests/cli-init.test.ts` covers:
- Happy-path: `init test-slug` on a fresh test repo creates `worlds/test-slug/_index/world.db` with schema applied. The test verifies `world.db` exists, has the `nodes` table, and has zero rows.
- Idempotency-rejection: `init test-slug` twice in a row returns `world_index_already_exists` on the second call.
- Slug validation: `init Invalid_Slug` returns slug-validation error.
- CLI help: `world-index --help` includes the `init` subcommand description.

### 4. Skill prose update

`.claude/skills/create-base-world/SKILL.md` Phase 11 step 3:

Replaced the previous direct-path Node-eval form:

```
node -e "const {openIndex} = require('./tools/world-index/dist/src/index/open.js'); openIndex(process.cwd(), '<world-slug>').close();"
```

with the new CLI command:

```
node tools/world-index/dist/src/cli.js init <world-slug>
```

Updated the surrounding parenthetical to: "(`world-index init` is the canonical bootstrap command per WMINIT-001; the prior direct-path Node-eval form has been retired.)"

### 5. Documentation

`tools/world-index/README.md`:
- Added `init` to the CLI command list with a brief description and renamed the stale "Planned CLI" heading to "CLI".

`docs/MACHINE-FACING-LAYER.md`:
- Added `init` alongside `sync` and `build` in the machine-facing layer overview, layer chooser, and troubleshooting table.

`docs/WORKFLOWS.md`:
- Added `world-index init <world-slug>` to the machine-facing CLI quick reference so the user-facing workflow inventory matches the package README and CLI help.

## Files to Touch

- `tools/world-index/src/cli.ts` (modify — add `init` subcommand)
- `tools/world-index/src/commands/init.ts` (new — init command implementation)
- `tools/world-index/tests/cli-init.test.ts` (new)
- `.claude/skills/create-base-world/SKILL.md` (modify — Phase 11 step 3)
- `tools/world-index/README.md` (modify — CLI command list; create if absent)
- `docs/MACHINE-FACING-LAYER.md` (modify — §World Index CLI list; verify current content)
- `docs/WORKFLOWS.md` (modify — machine-facing CLI quick reference)

## Out of Scope

- Adding root-level `package.json` with workspaces (alternative approach, rejected per Architecture Check item 1).
- Re-init / idempotency-allow policy (rejected; the CLI explicitly errors on existing world to mirror `create-base-world`'s refuse-overwrite discipline).
- Other world-index CLI subcommands not currently affected (e.g., `init` does not change `sync` / `build` / `render`).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` passes including new init-CLI tests.
2. `node tools/world-index/dist/src/cli.js init test-erotica-world` creates `worlds/test-erotica-world/_index/world.db` from a fresh state.
3. Re-init on existing world rejects cleanly with `world_index_already_exists`.
4. `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 uses the new CLI command, with no same-seam fallback to the retired Node-eval or package-import bootstrap.

### Invariants

1. The `world-index` package's CLI surface is the canonical operator entry point for index operations; Node-eval one-liners are not the bootstrap path.
2. Skill prose at `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 cites only the CLI command — no fallback to `@worldloom/...` package import or direct-path Node-eval.
3. The CLI command is layout-independent — repo restructures (pnpm workspaces, monorepo layout changes) do not break the bootstrap as long as the package's TypeScript imports continue to resolve.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/cli-init.test.ts` — new init-CLI tests.

### Commands

1. `cd tools/world-index && npm test` — package-local pass.
2. Manual: from a temp root, invoke `node /home/joeloverbeck/projects/worldloom/tools/world-index/dist/src/cli.js init test-erotica-world`, confirm `_index/world.db` is created with schema applied and `nodes` count is `0`.
3. Grep proof: confirm `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 uses `world-index init` and no same-seam docs retain the retired Node-eval or package-import bootstrap.

## Outcome

Implemented `world-index init <world-slug>` as a first-class CLI subcommand.

- `tools/world-index/src/commands/init.ts` validates lowercase kebab-case world slugs, rejects an existing `worlds/<slug>/_index/world.db` with `world_index_already_exists`, calls `openIndex(...)`, closes the database, and prints the initialized path.
- `tools/world-index/src/cli.ts` registers `init` in help and dispatch.
- `tools/world-index/tests/cli-init.test.ts` covers empty-index creation, schema presence, zero-node bootstrap, existing-index rejection, invalid-slug rejection, and help output.
- `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 now uses `node tools/world-index/dist/src/cli.js init <world-slug>`.
- `tools/world-index/README.md`, `docs/MACHINE-FACING-LAYER.md`, and `docs/WORKFLOWS.md` now list the `init` command in their command surfaces.

## Verification Result

Completed on 2026-05-01:

1. `cd tools/world-index && npm run build` -> passed.
2. `cd tools/world-index && npm test` -> passed, 71 tests.
3. `node /home/joeloverbeck/projects/worldloom/tools/world-index/dist/src/cli.js --help` from `/tmp` -> help lists `init <world-slug>`.
4. `node /home/joeloverbeck/projects/worldloom/tools/world-index/dist/src/cli.js init test-erotica-world` from `/tmp/worldloom-wminit-smoke` -> created `worlds/test-erotica-world/_index/world.db`.
5. Direct DB probe of `/tmp/worldloom-wminit-smoke/worlds/test-erotica-world/_index/world.db` -> `{"nodes":0,"version":"3"}`.
6. `rg -n 'world-index init' .claude/skills/create-base-world/SKILL.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md tools/world-index/README.md tools/world-index/src/cli.ts tools/world-index/tests/cli-init.test.ts` -> expected hits in the skill, docs, CLI, README, and tests.
7. `rg -n "@worldloom/world-index/index/open|require\('./tools/world-index|dist/src/index/open|node -e" .claude/skills/create-base-world tools/world-index/README.md docs/MACHINE-FACING-LAYER.md docs/WORKFLOWS.md` -> no hits.

Ignored/generated state: `tools/world-index/dist/` and `tools/world-index/node_modules/` were already ignored package artifacts; `npm run build` refreshed ignored `dist/`.

## Deviations

- The drafted `create-base-world` end-to-end dry-run was replaced with grep/manual-review proof of the Phase 11 command replacement plus compiled CLI integration tests. Running the full skill would enter a canon-mutating HARD-GATE flow and is broader than this package/tool ticket's owned seam.
- `tools/world-index/README.md` had a stale "Planned CLI" heading even though the CLI is implemented; this ticket truthfully renamed it to "CLI" while adding `init`.
