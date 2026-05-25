# MCPCLI-001: Add `--world-root` flag (with auto-discovery fallback) to MCP CLI tools

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — `tools/world-mcp/src/cli/submit-patch-plan.ts`, `tools/world-mcp/src/cli/validate-patch-plan.ts`, `tools/world-mcp/src/cli/sign-approval-token.ts`, `tools/world-mcp/src/cli/compute-pg-hashes.ts`, `tools/world-mcp/src/cli/_resolve-world-root.ts`, `tools/world-mcp/src/tools/submit-patch-plan.ts`, `tools/world-mcp/src/tools/validate-patch-plan.ts`, `tools/world-mcp/src/approval/token.ts`, `tools/validators/src/public/index.ts`, package tests, package README, machine/HARD-GATE docs, and CLI-invocation skill prose. No patch-engine change, no schema change. No backwards-compat shim path.
**Deps**: None.

## Problem

At intake, the patch-plan CLIs had no explicit `--world-root` flag and the docs still told operators to run them from the project root. `submit-patch-plan` was the real fragile path because `tools/patch-engine/src/apply.ts` defaults `worldRoot` to `process.cwd()`. `validate-patch-plan` and `sign-approval-token` already had partial package-root discovery in lower helpers, but no explicit flag/env contract or operator-visible trace. `compute-pg-hashes` never needed world-root resolution because it reads only `--plan` and `--pg` files.

Observed in the 2026-05-25 red-bunny PG-2 turn-cycle session: after rebuilding the validators + world-mcp packages from `tools/world-mcp/`, the operator ran `submit-patch-plan` from that subdirectory and hit the "Index missing" error. The world.db file existed at `/home/joeloverbeck/projects/worldloom/worlds/erotica-world/_index/world.db`, but the CLI looked for it at `tools/world-mcp/worlds/erotica-world/_index/world.db` (process.cwd() + relative resolve). The fix was to `cd /home/joeloverbeck/projects/worldloom` and re-invoke — but the error message did not point at the cwd-dependency.

Two compounding problems:

1. **Implicit cwd-dependency is fragile.** The CLI is documented as "run from project root" in the SKILL.md prose, but the binding is invisible to the operator until a misleading error fires. Any workflow that requires running a build (`npm run build` in a subdirectory) followed by a CLI invocation is at risk.

2. **No auto-discovery.** The repo has a clear marker — the `worlds/` directory at the project root, or `package.json` with `"name": "@worldloom/..."` at any tools-package root, or the `docs/FOUNDATIONS.md` file at the repo root. None of these are used to locate the world-root when cwd is wrong.

The FOUNDATIONS-aligned principle: §Tooling Recommendation requires deterministic behavior from machine-facing tooling. A CLI that silently resolves a path against cwd, and fails with a misdirecting error when cwd is wrong, is non-deterministic from the operator's standpoint.

## Assumption Reassessment (2026-05-25)

1. `tools/world-mcp/src/cli/submit-patch-plan.ts`, `validate-patch-plan.ts`, and `sign-approval-token.ts` did not parse a `--world-root` flag. Live code narrowed the original premise: `submit-patch-plan` delegated to `submitPatchPlan()` without `opts.worldRoot`, so patch-engine writes and secret lookup could still fall back to `process.cwd()`. `validate-patch-plan` used lower helper discovery for some paths but still needed an explicit CLI contract and an internal `worldRoot` thread for the validator pre-apply read.

2. `docs/MACHINE-FACING-LAYER.md` documents the CLIs as run from the project root but does not name the failure mode if cwd is wrong. `docs/HARD-GATE-DISCIPLINE.md` §Issuing a token and §Validating and submitting the plan paragraphs reference the CLIs by absolute path (`node tools/world-mcp/dist/src/cli/...`) but don't enforce cwd.

3. Cross-skill boundary under audit: the patch-plan CLIs and signer share the world-root resolution surface. The shared boundary is a new helper `tools/world-mcp/src/cli/_resolve-world-root.ts` consumed by `submit-patch-plan`, `validate-patch-plan`, and `sign-approval-token`. The contract: precedence is explicit `--world-root` flag > `WORLDLOOM_ROOT` env var > auto-discovery via walking up from cwd looking for `worlds/` + `docs/FOUNDATIONS.md` markers > clear error naming attempted paths.

4. FOUNDATIONS §Tooling Recommendation principle: machine-facing tools must be deterministic. The new resolver enforces this — every successful invocation explicitly answers "where is the world-root and why" via an emitted resolution-trace at the start of the CLI's stderr stream.

5. Schema-extension audit: no schema field is added or removed. The CLI flag surface gains one optional flag (`--world-root`) and one env var read (`WORLDLOOM_ROOT`); both are additive. `tools/validators/src/public/index.ts` gains an additive optional `worldRoot` argument so CLI validation can honor the resolved root instead of relying on ambient cwd or package-location fallback.

6. Adjacent contradictions exposed during reassessment: `compute-pg-hashes` does not actually need the world-root (it reads only `--plan` and `--pg` paths and computes hashes locally). Decision preserved: omit `--world-root` from `compute-pg-hashes` and document the exclusion in its help text and docs.

7. HARD-GATE-facing boundary: this changes validate/sign/submit invocation mechanics, not approval semantics, validator verdict semantics, token binding, or patch-engine write order. `docs/HARD-GATE-DISCIPLINE.md` was read and updated so HARD-GATE workflows now describe the new resolution trace and flag/env/auto-discovery precedence.

## Architecture Check

1. **Why this is cleaner than alternatives.** Three alternatives considered:

   - *Hard-code `process.cwd()` and document loudly.* Doesn't help operator-error recovery; the misleading error persists.
   - *Auto-discover via walking up only (no flag).* Auto-discovery is convenient but invisible; an operator who genuinely wants to point at a non-default world-root has no escape hatch. Adding the flag with auto-discovery as the fallback gives both.
   - *Read from a config file (`worldloom.config.json`).* Adds a new top-level config surface; over-engineered for this scope.

   The chosen design — explicit flag > env var > auto-discovery via marker — is the standard CLI-resolution pattern, gives operators a clear escape hatch, and emits a resolution-trace to stderr so any future ambiguity is visible.

2. **No backwards-compatibility shims.** When neither the flag nor the env var is set AND auto-discovery succeeds, the CLI's behavior is equivalent to the former correct `process.cwd()` case (because the former "correct" cwd was the project root, which is exactly what auto-discovery finds). When the former "wrong cwd" case occurs, the CLI now succeeds via auto-discovery instead of failing with a misleading message. No shim path; the legacy implicit-cwd behavior is replaced cleanly.

## Verification Layers

1. CLI flag parsed correctly → unit-test grep-proof (`grep -n "world-root" tools/world-mcp/src/cli/submit-patch-plan.ts tools/world-mcp/src/cli/validate-patch-plan.ts tools/world-mcp/src/cli/sign-approval-token.ts` returns the flag definitions; `grep -n "WORLDLOOM_ROOT" tools/world-mcp/src/cli/_resolve-world-root.ts` returns the env-var read).
2. Resolution precedence verified → unit-test invariants in `tools/world-mcp/tests/cli/_resolve-world-root.test.ts`: explicit flag wins over env var/cwd, env var wins over auto-discovery, auto-discovery walks up from cwd looking for `worlds/` + `docs/FOUNDATIONS.md`, invalid explicit flag fails without fallback, and no-marker discovery failure lists attempted paths.
3. Public CLI trace and signer root behavior verified → `tools/world-mcp/tests/cli/sign-approval-token.test.ts`, existing submit/validate CLI tests updated for the `[world-root]` stderr trace, and package build/test coverage.
4. Misleading-error class closed → resolver failure exits 2 before engine/index opening when no valid root exists; auto-discoverable cwd no longer needs the operator to `cd` to repo root first.
5. Full-suite regression → codebase verification command (`cd tools/world-mcp && npm test --silent`), plus `tools/validators` and `tools/world-mcp` builds.

## Landed Changes

### 1. New shared helper `tools/world-mcp/src/cli/_resolve-world-root.ts`

Added `resolveWorldRoot()` plus stderr formatting helpers for success and failure. The resolver validates candidate roots by requiring both `docs/FOUNDATIONS.md` and `worlds/`, records every attempted path, returns an explicit success/error union, and preserves the precedence `--world-root` > `WORLDLOOM_ROOT` > upward auto-discovery from cwd.

### 2. Wire the helper into three CLIs and internal handlers

In `tools/world-mcp/src/cli/submit-patch-plan.ts`, `validate-patch-plan.ts`, and `sign-approval-token.ts`:

- Add `"world-root": { type: "string" }` to `parseArgs` options.
- Call `resolveWorldRoot({flag, envVar: process.env.WORLDLOOM_ROOT, cwd: process.cwd()})` early in `main()`.
- If resolution fails, exit code 2 with the resolution error message on stderr and the attempted-paths list.
- If resolution succeeds, log to stderr: `[world-root] <worldRoot> (source: <source>)` so the operator sees which path won.
- Pass the resolved `worldRoot` into the engine handlers so they no longer receive `process.cwd()` implicitly.
- Thread the internal `worldRoot` through `handleSubmitPatchPlanTool`, `validatePatchPlan`, approval-token secret lookup, patch-engine `submitPatchPlan(..., { worldRoot })`, and validator pre-apply reads via an additive optional `tools/validators/src/public/index.ts` argument.

`compute-pg-hashes` is excluded from this change (it doesn't consume the world-root). Document this in the CLI's `HELP_TEXT`: "This CLI reads only the `--plan` and `--pg` files and does not require a worldloom project root; the other MCP CLIs do."

### 3. Updated `docs/MACHINE-FACING-LAYER.md`

Added a §"World Root Resolution For MCP CLIs" subsection naming the precedence (flag > env var > auto-discovery), the marker files (`docs/FOUNDATIONS.md` + `worlds/`), the resolution-trace stderr line, and the `compute-pg-hashes` exclusion.

### 4. Update CLI invocation docs and workflow notes

Updated `docs/HARD-GATE-DISCIPLINE.md`, `tools/world-mcp/README.md`, `docs/MACHINE-FACING-LAYER.md`, and the active skills/references that invoke validate/sign/submit CLIs. Stale project-root-only guidance now states that the MCP CLIs auto-discover the worldloom project root by walking up from the current working directory looking for `docs/FOUNDATIONS.md` + `worlds/`, and that operators can pass `--world-root <path>` or set `WORLDLOOM_ROOT` when targeting a non-default root.

## Files to Touch

- `tools/world-mcp/src/cli/_resolve-world-root.ts` (new)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/src/cli/validate-patch-plan.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/src/cli/sign-approval-token.ts` (modify — flag + resolver wiring)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify — internal worldRoot passthrough)
- `tools/world-mcp/src/tools/validate-patch-plan.ts` (modify — internal worldRoot passthrough)
- `tools/world-mcp/src/approval/token.ts` (modify — signer secret lookup can use resolved root)
- `tools/validators/src/public/index.ts` (modify — additive optional worldRoot for pre-apply reads)
- `tools/world-mcp/tests/cli/_resolve-world-root.test.ts` (new — unit tests for the resolver)
- `tools/world-mcp/tests/cli/sign-approval-token.test.ts` (new — signer uses explicit world-root and emits trace)
- `tools/world-mcp/tests/cli/submit-patch-plan.test.ts` (modify — stderr trace handling)
- `tools/world-mcp/tests/cli/validate-patch-plan.test.ts` (modify — stderr trace handling)
- `tools/world-mcp/tests/tools/_shared.ts` (modify — temp roots include the `docs/FOUNDATIONS.md` marker)
- `tools/world-mcp/src/cli/compute-pg-hashes.ts` (modify HELP_TEXT only — document the exclusion)
- `tools/world-mcp/README.md` (modify — CLI invocation/root-resolution contract)
- `docs/MACHINE-FACING-LAYER.md` (modify — §World root resolution subsection)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — signer/validate/submit CLI contract)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/commitment-block-authoring/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/canon-addition/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify — CLI-invocation note)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify — CLI-invocation note)
- `.claude/skills/create-base-world/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify — CLI-invocation note)
- `.claude/skills/character-generation/SKILL.md` (modify — CLI-invocation note)
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify — CLI-invocation note)

## Out of Scope

- Adding `--world-root` to `compute-pg-hashes` (it doesn't consume the world-root; HELP_TEXT documents the exclusion).
- Adding a config file surface (`worldloom.config.json`). Auto-discovery + env var + flag is sufficient; a config file is over-engineered.
- Changing how the world-mcp server (long-running process) resolves the world-root. The server has its own bootstrap path (it's started from the project root by convention); this ticket is CLI-only.
- Updating `tools/world-index/src/cli/` (e.g., `world-index build`) — those CLIs follow the same cwd pattern but are not in the immediate failure-mode scope of this ticket. Post-ticket review created `tickets/WIDXCLI-001.md` for that separate `world-index` CLI boundary.

## Acceptance Criteria

### Tests That Must Pass

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm run build` passes.
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build && npm test --silent` reports all tests passing including `_resolve-world-root.test.ts` and `sign-approval-token.test.ts`.
3. `grep -n "resolveWorldRoot" tools/world-mcp/src/cli/submit-patch-plan.ts tools/world-mcp/src/cli/validate-patch-plan.ts tools/world-mcp/src/cli/sign-approval-token.ts` returns three call sites (one per CLI).
4. `grep -n "world-root\\|world_root\\|worldRoot" tools/world-mcp/src/cli/compute-pg-hashes.ts | grep -v "World root:" | grep -v "worldloom project root" | grep -v "patch-plan CLIs" | grep -v "compute-pg-hashes intentionally"` returns no flag-parsing or resolver-call lines (exclusion confirmed).
5. Auto-discovery and explicit flag precedence are covered by `tools/world-mcp/tests/cli/_resolve-world-root.test.ts`; signer CLI explicit-flag trace is covered by `tools/world-mcp/tests/cli/sign-approval-token.test.ts`.

### Invariants

1. The three CLIs (`submit`, `validate`, `sign`) accept an optional `--world-root <path>` flag and read `WORLDLOOM_ROOT` env var; resolution precedence is flag > env > auto-discovery > fail.
2. `compute-pg-hashes` does not accept `--world-root` (documented exclusion in HELP_TEXT).
3. Auto-discovery walks up from cwd looking for a directory containing BOTH `docs/FOUNDATIONS.md` and `worlds/` (combined marker; reduces false-positives from unrelated `worlds/`-named directories).
4. Resolution-trace is emitted to stderr at every CLI invocation as `[world-root] <path> (source: <flag|env|auto>)`.
5. Resolution failure produces exit code 2 (CLI-argument-class failure) with the new "World root resolution failed" message and the attempted-paths list — never the misleading "Index missing for world '<slug>'" error.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/_resolve-world-root.test.ts` — explicit flag wins, env var wins when no flag, auto-discovery walks up correctly, invalid explicit flag fails without fallback, all-resolutions-failed produces clear error, marker-check requires both `docs/FOUNDATIONS.md` and `worlds/`.
2. `tools/world-mcp/tests/cli/sign-approval-token.test.ts` — signer accepts explicit `--world-root`, emits the trace, and creates a parseable token.
3. Existing submit/validate CLI test files — verify no regression under the new stderr trace and resolver indirection.

### Commands

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm run build`.
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build`.
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && node --test dist/tests/cli/_resolve-world-root.test.js dist/tests/cli/sign-approval-token.test.js dist/tests/cli/validate-patch-plan.test.js dist/tests/cli/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan-args.test.js`.
4. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm test --silent`.
5. Grep proofs for resolver call sites, compute-pg-hashes exclusion, and stale project-root-only guidance.

## Outcome

Completion date: 2026-05-25.

Implemented deterministic world-root resolution for the MCP patch-plan CLIs and signer:

- `validate-patch-plan`, `submit-patch-plan`, and `sign-approval-token` now accept `--world-root <path>`, read `WORLDLOOM_ROOT`, auto-discover by walking upward for `docs/FOUNDATIONS.md` + `worlds/`, emit a `[world-root] ...` stderr trace, and fail with exit code 2 plus attempted paths when no valid root resolves.
- `submit-patch-plan` passes the resolved root into patch-engine submit options; `validate-patch-plan` passes it into validator pre-apply reads and id-allocation checks; `sign-approval-token` uses it for the HMAC secret path.
- `compute-pg-hashes` intentionally remains rootless and documents that exclusion in help text.
- Package README, machine-facing docs, HARD-GATE docs, and active CLI-invoking skill prose now describe the new flag/env/auto-discovery contract.

## Verification Result

1. `cd /home/joeloverbeck/projects/worldloom/tools/validators && npm run build` — passed.
2. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm run build` — passed.
3. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && node --test dist/tests/cli/_resolve-world-root.test.js dist/tests/cli/sign-approval-token.test.js dist/tests/cli/validate-patch-plan.test.js dist/tests/cli/submit-patch-plan.test.js dist/tests/cli/submit-patch-plan-args.test.js` — passed, 25 tests.
4. `cd /home/joeloverbeck/projects/worldloom/tools/world-mcp && npm test --silent` — passed, 469 tests.
5. `grep -n "resolveWorldRoot" tools/world-mcp/src/cli/submit-patch-plan.ts tools/world-mcp/src/cli/validate-patch-plan.ts tools/world-mcp/src/cli/sign-approval-token.ts` — confirmed resolver imports/call sites in all three CLIs.
6. `grep -n "world-root\\|world_root\\|worldRoot" tools/world-mcp/src/cli/compute-pg-hashes.ts` — found only HELP_TEXT exclusion prose, no flag parsing or resolver call.
7. `rg -n "from the project root or active git worktree root|process\\.cwd\\(\\).*Index missing|validate-patch-plan\\.js <plan-path>|submit-patch-plan\\.js <plan-path>|sign-approval-token\\.js <plan-path>" docs .claude/skills tools/world-mcp/README.md` — no stale validate/submit project-root-only guidance remains; remaining signer examples in `docs/HARD-GATE-DISCIPLINE.md` are valid short-form examples covered by the new root-resolution paragraph.

## Deviations

- The original ticket said "no validator change"; reassessment showed the explicit root must reach validator pre-apply reads for `validate-patch-plan` to be genuinely root-explicit. The landed validator change is additive only: `validatePatchPlan(envelope, { worldRoot })`.
- The drafted integration test path `tools/world-mcp/tests/integration/cli-auto-discovery.test.ts` was not added. The same invariant is covered by focused resolver unit tests plus compiled CLI tests, and the broad `world-mcp` suite exercises those tests through compiled `dist/`.
- `compute-pg-hashes` did not receive `--world-root`; it remains explicitly out of scope because it does not open world-root-relative state.
