# WMINIT-001: Replace `@worldloom/world-index/index/open` package-import bootstrap with a `world-index init <slug>` CLI subcommand

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — add `init` subcommand to `tools/world-index/src/cli.ts` (and `dist/`); tests in `tools/world-index/tests/`; defensive ripple to `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 (replace the brittle Node-eval bootstrap form with the new CLI command).
**Deps**: None (CLI extension to an existing package).

## Problem

`.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 (post-2026-05-01 audit) prescribes:

```
node -e "const {openIndex} = require('./tools/world-index/dist/src/index/open.js'); openIndex(process.cwd(), '<world-slug>').close();"
```

This direct-path form was the operational fix landed by the create-base-world skill audit on 2026-05-01 after the original prescribed form failed:

```
node -e "require('@worldloom/world-index/index/open').openIndex(process.cwd(), '<world-slug>').close()"
```

The original form fails because the worldloom repo has no root-level `package.json` registering `@worldloom/*` as a workspace, and no `node_modules/@worldloom/world-index/` symlink resolving the alias. The `tools/world-index/package.json` exports `./index/open` but the resolver lookup for `@worldloom/world-index/index/open` traverses the working directory's node_modules tree, which does not contain the package.

The direct-path fix landed by the audit works from project root but has fragility:
1. **Layout-coupled** — references the explicit path `./tools/world-index/dist/src/index/open.js`. Any future repo restructure (pnpm workspace introduction, monorepo layout change, dist-output-path change) breaks the bootstrap.
2. **Hidden-as-Node-eval** — the bootstrap is a one-off `node -e "..."` script invocation, not a discoverable CLI command. Operators reading `tools/world-index/dist/src/cli.js --help` see `sync`, `build`, `render`, etc. but not `init` — bootstrapping a new world is invisible to the CLI's documented surface.
3. **Worktree-fragile** — when invoked inside a git worktree, the relative `./tools/world-index/dist/...` path resolves against the worktree root; if the dist/ build is stale (or the worktree was created without running the build), the bootstrap silently uses a stale binary.

**Session evidence (2026-05-01 create-base-world genesis run for `worlds/erotica-world/`)**: the original package-import form failed with `Cannot find module '@worldloom/world-index/index/open'`. Recovery cost: ~10 minutes of Node module-resolution debugging + repo-layout grepping + workaround discovery. The audit (Issue 1) documented the direct-path form, but the audit also flagged "Or, if a CLI exists for index initialization, prefer that" — and no CLI command exists today.

The clean fix is to add `world-index init <slug>` as a first-class CLI subcommand parallel to the existing `world-index sync`, `world-index build`, etc.

After the fix, the skill prescribes:

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
7. Pipeline-wide grep for current Node-eval bootstrap callers: only `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 (post-2026-05-01 audit). The references file `.claude/skills/create-base-world/references/engine-envelope-shape.md` does NOT currently document the bootstrap step (it covers envelope shape only); after this ticket lands, the skill's Phase 11 step 3 should be the only update site.
8. Adjacent contradiction surfaced during reassessment: a workspace-package-json approach (registering `@worldloom/world-index` as a resolvable package via root-level `package.json` with `workspaces`) was an alternative considered but rejected — it changes the repo's package layout in a more invasive way than adding a CLI subcommand, and the layout decision (no root package.json) was deliberate per the existing repo structure. CLI subcommand is the minimal-blast-radius fix.

## Architecture Check

1. Adding `world-index init <slug>` aligns with the existing CLI surface conventions (`world-index sync <slug>`, `world-index build`, etc.) — uniform CLI shape, uniform argument convention, uniform error handling.
2. No backwards-compatibility shims. The Node-eval bootstrap can be removed from skill prose in the same change. The brittle direct-path form goes away.
3. The CLI internally calls `openIndex` (the same underlying function the Node-eval form invokes), so behavior is identical — only the invocation shape changes.
4. Worktree safety: same as other CLI subcommands. The CLI pattern surfaces the `cwd` argument explicitly via `process.cwd()` (matching the existing `openIndex` API) so worktree-resolved paths Just Work.

## Verification Layers

1. After fix: `node tools/world-index/dist/src/cli.js init test-world-slug` creates `worlds/test-world-slug/_index/world.db` with schema applied and zero nodes → CLI integration test (`tools/world-index/tests/cli-init.test.ts`).
2. After fix: re-running `init` on an existing world is idempotent (does not corrupt the existing index) OR returns an explicit error indicating the world already exists — pick one and document. Recommendation: error with `world_index_already_exists` and an exit code, parallel to how `create-base-world`'s skill-side HARD-GATE refuses to overwrite an existing world directory → same test file.
3. After fix: skill prose at `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 cites the new CLI command → grep-proof: `rg -n "world-index init" .claude/skills/create-base-world/SKILL.md` returns hits; `rg -n "@worldloom/world-index/index/open|require\('./tools/world-index" .claude/skills/create-base-world/` returns no hits.
4. After fix: CLI help (`world-index --help` or `world-index init --help`) shows the new subcommand → CLI test.

## What to Change

### 1. Add `init` subcommand to the CLI

In `tools/world-index/src/cli.ts`:
- Add an `init` subcommand handler that:
  - Accepts `<slug>` as a positional argument.
  - Validates the slug (kebab-case lowercase per CLAUDE.md ID Allocation Conventions).
  - Computes the target path `worlds/<slug>/_index/world.db`.
  - Calls `openIndex(process.cwd(), slug)` and immediately `.close()`s the result.
  - Emits a confirmation: `Initialized empty world index at worlds/<slug>/_index/world.db`.
  - On error (slug invalid, file already exists if idempotency rule rejects, etc.), exits 1 with a clear stderr message.

Idempotency policy decision (recommendation: REJECT re-init of an existing world):
```ts
if (await fs.exists(targetPath)) {
  console.error(`world_index_already_exists: worlds/${slug}/_index/world.db already exists. Use 'world-index sync <slug>' to refresh, or remove the file first.`);
  process.exit(1);
}
```

### 2. Build output

Ensure `tools/world-index/dist/src/cli.js` is regenerated on `npm run build` with the new subcommand registered.

### 3. Tests

`tools/world-index/tests/cli-init.test.ts` (or extend existing CLI test):
- Happy-path: `init test-slug` on a fresh test repo creates `worlds/test-slug/_index/world.db` with schema applied. Verify `world.db` exists, has the expected schema (e.g., `nodes` table present), has zero rows.
- Idempotency-rejection: `init test-slug` twice in a row returns `world_index_already_exists` on the second call.
- Slug validation: `init Invalid_Slug` returns slug-validation error.
- CLI help: `world-index --help` includes the `init` subcommand description.

### 4. Skill prose update

`.claude/skills/create-base-world/SKILL.md` Phase 11 step 3:

Replace the current direct-path Node-eval form:

```
node -e "const {openIndex} = require('./tools/world-index/dist/src/index/open.js'); openIndex(process.cwd(), '<world-slug>').close();"
```

with the new CLI command:

```
node tools/world-index/dist/src/cli.js init <world-slug>
```

Or, if a `world-index` binary is available globally (post-`npm install -g`):

```
world-index init <world-slug>
```

Update the surrounding parenthetical (currently "(The package-import form … requires a node_modules-resolvable workspace context that the worldloom repo does not currently provide; the direct-path form above works from any project-root invocation.)") to: "(`world-index init` is the canonical bootstrap command per WMINIT-001; the prior direct-path Node-eval form has been retired.)"

### 5. Documentation

`tools/world-index/README.md` (verify exists; if not, this ticket creates it):
- Add `init` to the CLI command list with a brief description.

`docs/MACHINE-FACING-LAYER.md`:
- Verify the §World Index subsection mentions `init` alongside `sync`, `build`, `render`. If missing, add.

## Files to Touch

- `tools/world-index/src/cli.ts` (modify — add `init` subcommand)
- `tools/world-index/tests/cli-init.test.ts` (new) OR extend existing CLI test
- `.claude/skills/create-base-world/SKILL.md` (modify — Phase 11 step 3)
- `tools/world-index/README.md` (modify — CLI command list; create if absent)
- `docs/MACHINE-FACING-LAYER.md` (modify — §World Index CLI list; verify current content)

## Out of Scope

- Adding root-level `package.json` with workspaces (alternative approach, rejected per Architecture Check item 1).
- Re-init / idempotency-allow policy (rejected; the CLI explicitly errors on existing world to mirror `create-base-world`'s refuse-overwrite discipline).
- Other world-index CLI subcommands not currently affected (e.g., `init` does not change `sync` / `build` / `render`).

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-index && npm test` passes including new init-CLI tests.
2. `node tools/world-index/dist/src/cli.js init test-erotica-world` creates `worlds/test-erotica-world/_index/world.db` from a fresh state.
3. Re-init on existing world rejects cleanly with `world_index_already_exists`.
4. `create-base-world` end-to-end dry-run uses the new CLI command in Phase 11 step 3 and succeeds.

### Invariants

1. The `world-index` package's CLI surface is the canonical operator entry point for index operations; Node-eval one-liners are not the bootstrap path.
2. Skill prose at `.claude/skills/create-base-world/SKILL.md` Phase 11 step 3 cites only the CLI command — no fallback to `@worldloom/...` package import or direct-path Node-eval.
3. The CLI command is layout-independent — repo restructures (pnpm workspaces, monorepo layout changes) do not break the bootstrap as long as the package's TypeScript imports continue to resolve.

## Test Plan

### New/Modified Tests

1. `tools/world-index/tests/cli-init.test.ts` — new init-CLI tests.

### Commands

1. `cd tools/world-index && npm test` — package-local pass.
2. Manual: invoke `node tools/world-index/dist/src/cli.js init test-erotica-world`, confirm `worlds/test-erotica-world/_index/world.db` is created with schema applied.
3. Manual: invoke a `create-base-world` dry-run on a fresh test world after this ticket lands; verify Phase 11 step 3 succeeds without falling back to Node-eval.
