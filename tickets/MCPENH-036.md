# MCPENH-036: Document `submit-patch-plan` / `validate-patch-plan` CLI cwd-anchoring requirement

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — docs-drift fix at three doc surfaces (`tools/world-mcp/README.md`, `docs/HARD-GATE-DISCIPLINE.md`, `.claude/skills/create-base-world/references/engine-envelope-shape.md`). No engine code is modified.
**Deps**: none

## Problem

The CLI submit-path and validate-path documented at `tools/world-mcp/README.md:57-66` (§"Patch-plan CLIs"), `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 (validate/submit path selection by envelope size), and `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan does NOT mention that `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` and `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` MUST be invoked from the project root (or the active git worktree root). The patch engine's `worldRoot` resolution at `tools/world-index/src/index/open.ts`'s `indexDirectoryForWorld(path.resolve(worldRoot, "worlds", worldSlug, "_index"))` derives `worldRoot` from `process.cwd()`. Invocation from any other cwd produces the cryptic error `"Index missing for world '<slug>'"` even when the index file exists at the expected absolute path under the project root.

Surface evidence of the gap was a session-time event during the storylet-pool-authoring submit (2026-05-04): invocation from `tools/validators` cwd (after running `npm run build` in that package) produced `"Index missing for world 'erotica-world'"`; recovery required prepending `cd /home/joeloverbeck/projects/worldloom &&` to the CLI invocation. The error message does not name `cwd` or hint at the resolution mechanism — diagnosis required reading `tools/world-index/src/index/open.ts`.

## Assumption Reassessment (2026-05-04)

1. The cwd-anchoring requirement is genuinely undocumented at HEAD. Greps for `cwd | working directory | project root | invoke from | worldRoot` returned zero hits in `.claude/skills/create-base-world/references/engine-envelope-shape.md`, `docs/HARD-GATE-DISCIPLINE.md`, and `tools/world-mcp/README.md` (which documents the CLI invocations at §"Patch-plan CLIs" lines 57-66 — including `validate-patch-plan.js <plan-path>` and `submit-patch-plan.js <plan-path> <token-path>` — but is silent on cwd resolution). Verified at HEAD via `grep -niE "cwd|working directory|project root|invoke from|worldRoot"` against all three files.
2. The MCP-served `mcp__worldloom__submit_patch_plan` and `mcp__worldloom__validate_patch_plan` tool paths are unaffected by this gap — their `worldRoot` resolution happens server-side in the MCP host's process context (the worldloom MCP server's spawn cwd) and does not depend on the caller's cwd. The gap is specific to the CLI submit/validate-paths used for oversize envelopes (per `engine-envelope-shape.md` §5: "larger envelopes use the CLI submit path … to bypass MCP transport size constraints") and for direct CLI workflows.
3. Cross-artifact ticket: this ticket touches the boundary between three docs surfaces (`tools/world-mcp/README.md`, `docs/HARD-GATE-DISCIPLINE.md`, `create-base-world/references/engine-envelope-shape.md`) that are all referenced by story-pipeline skills' Phase-7-equivalent submission prose (the storylet-pool-authoring SKILL.md Phase 7 §Submit-path convention block, just landed in this session, cross-references the engine-envelope-shape.md reference; sibling skills cross-reference the same). The shared boundary is the CLI invocation contract documented across these three surfaces.
4. FOUNDATIONS §Tooling Recommendation alignment: the §"non-negotiable" requirement for LLM agents to receive context "directly or via the documented context-packet + targeted-retrieval pattern" implies that the CLI-as-documented-fallback path must itself be reliably documented. A cryptic error mode that requires source-code archaeology to diagnose is a documentation-pattern violation against the spirit of §Tooling Recommendation, even though no specific FOUNDATIONS clause names CLI cwd discipline directly.

## Architecture Check

1. The cleanest fix is a docs-only change at the three doc surfaces cited above. No engine code change is warranted: the cwd-derived `worldRoot` is the correct resolution mechanism (it makes the CLI work transparently inside both the main repo and any git worktree the user may be in without an environment-variable or absolute-path dependency the project does not currently export). Adding a clear documented note at every docs surface where the CLI invocation is named is the lowest-risk fix. Alternative — adding a `--world-root <path>` CLI flag — would be a non-trivial engine change and would not eliminate the silent failure mode for users who don't pass the flag.
2. No backwards-compatibility shims or alias paths are introduced — the cwd-anchoring behavior is preserved unchanged; only the documentation is added.

## Verification Layers

1. The cwd-anchoring requirement is named at every doc surface where the CLI is invoked -> codebase grep-proof for the new phrase across `tools/world-mcp/README.md`, `docs/HARD-GATE-DISCIPLINE.md`, and `.claude/skills/create-base-world/references/engine-envelope-shape.md`.
2. The error-mode mapping (`"Index missing for world '<slug>'"` -> diagnose cwd) is documented at the failure-modes section of `engine-envelope-shape.md` §6 -> codebase grep-proof for the literal error phrase plus the cwd-diagnosis phrasing.
3. No unrelated docs surface drifts -> manual review (`docs/MACHINE-FACING-LAYER.md` and `docs/CONTEXT-PACKET-CONTRACT.md` aren't affected because they describe MCP-mediated retrieval, not the CLI submit-path).

## What to Change

### 1. `tools/world-mcp/README.md` §"Patch-plan CLIs"

Add a brief note immediately after the CLI invocation lines (currently at lines 57-66) stating that `submit-patch-plan.js` and `validate-patch-plan.js` MUST be invoked from the project root (the directory containing `worlds/`, `tools/`, `docs/`) — or the active git worktree root if the user is inside one — because both CLIs resolve `worldRoot` from `process.cwd()` to find the world index at `worlds/<slug>/_index/world.db`. Cite the resolution code at `tools/world-index/src/index/open.ts`'s `indexDirectoryForWorld`. Name the expected error mode when the requirement is violated: `Index missing for world '<slug>'`.

### 2. `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan

Add the same cwd-anchoring note in §Submitting the plan so skills referencing this doc (per FOUNDATIONS §Tooling Recommendation handoff and per the storylet-pool-authoring Phase 7 cross-reference to `engine-envelope-shape.md` §5 — itself rooted in HARD-GATE-DISCIPLINE) propagate the discipline transparently.

### 3. `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 + §6

Section §5 ("Validate/submit path selection by envelope size") — add the cwd-anchoring requirement to the CLI submit-path bullet. Section §6 ("Common failure-mode response codes") — add an entry for the `"Index missing for world '<slug>'"` error mode, mapping it to "invoked from the wrong cwd; re-invoke from the project root or active worktree root" diagnosis.

## Files to Touch

- `tools/world-mcp/README.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify)

## Out of Scope

- Changing the CLI's cwd-resolution behavior. The current behavior is correct — it transparently supports both main-repo and worktree invocation without forcing an environment variable or absolute-path argument.
- Adding a `--world-root <path>` flag to override cwd-derived resolution. If such a flag is desired in the future, that's a separate engine-change ticket.
- Updating per-skill prose (`storylet-pool-authoring/SKILL.md`, `branching-story-bootstrap/SKILL.md`, `branching-story-page-cycle/SKILL.md`, etc.) to reference the cwd discipline — those skills cross-reference `engine-envelope-shape.md`, so the documentation propagates by reference. Skill-prose updates are out of scope and route to `/skill-audit` if the cross-reference's discoverability turns out to be insufficient at a downstream session.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -niE "cwd|working directory|project root|invoke from" tools/world-mcp/README.md` returns at least one match in or adjacent to the §"Patch-plan CLIs" section.
2. `grep -niE "cwd|working directory|project root|invoke from" docs/HARD-GATE-DISCIPLINE.md` returns at least one match in §Submitting the plan.
3. `grep -niE "cwd|working directory|project root|invoke from" .claude/skills/create-base-world/references/engine-envelope-shape.md` returns matches in both §5 and §6.
4. The §6 failure-mode listing in `engine-envelope-shape.md` names `Index missing for world '<slug>'` and maps it to a cwd-diagnosis recovery path.

### Invariants

1. Every doc surface that names the CLI invocation also names the cwd requirement (no surface drifts where the CLI is documented but cwd is silently assumed).
2. The patch-engine code's cwd-derived `worldRoot` resolution at `tools/world-index/src/index/open.ts` remains unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -niE "cwd|working directory|project root|invoke from" tools/world-mcp/README.md docs/HARD-GATE-DISCIPLINE.md .claude/skills/create-base-world/references/engine-envelope-shape.md` — confirms all three docs surfaces document the requirement after the edit.
2. `grep -nE "Index missing for world" .claude/skills/create-base-world/references/engine-envelope-shape.md` — confirms the §6 failure-mode entry names the literal error string.
3. The targeted greps at commands 1 and 2 ARE the correct verification boundary — running the full pipeline test suite would not surface a docs gap; the docs-drift signal lives entirely in the text content of the three named files.
