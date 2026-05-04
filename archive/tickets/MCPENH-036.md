# MCPENH-036: Document `submit-patch-plan` / `validate-patch-plan` CLI cwd-anchoring requirement

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None — docs-drift fix at same-seam CLI contract docs/references. No engine code is modified.
**Deps**: none

## Problem

At intake, the CLI submit-path and validate-path documented at `tools/world-mcp/README.md` (§"Patch-plan CLIs"), `.claude/skills/create-base-world/references/engine-envelope-shape.md` §5 (validate/submit path selection by envelope size), and `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan did not mention that `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` and `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <plan-path>` MUST be invoked from the project root (or the active git worktree root). The patch engine's `worldRoot` resolution at `tools/world-index/src/index/open.ts`'s `indexDirectoryForWorld(path.resolve(worldRoot, "worlds", worldSlug, "_index"))` derives `worldRoot` from `process.cwd()`. Invocation from any other cwd produces the cryptic error `"Index missing for world '<slug>'"` even when the index file exists at the expected absolute path under the project root.

Surface evidence of the gap was a session-time event during the storylet-pool-authoring submit (2026-05-04): invocation from `tools/validators` cwd (after running `npm run build` in that package) produced `"Index missing for world 'erotica-world'"`; recovery required prepending `cd /home/joeloverbeck/projects/worldloom &&` to the CLI invocation. The error message does not name `cwd` or hint at the resolution mechanism — diagnosis required reading `tools/world-index/src/index/open.ts`.

## Assumption Reassessment (2026-05-04)

1. The cwd-anchoring requirement was genuinely undocumented at intake. Greps for `cwd | working directory | project root | invoke from | worldRoot` returned zero hits in the original three drafted surfaces (`.claude/skills/create-base-world/references/engine-envelope-shape.md`, `docs/HARD-GATE-DISCIPLINE.md`, and `tools/world-mcp/README.md`). Reassessment also found same-seam CLI references in `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`; those compact docs/references were absorbed so the published CLI contract does not split.
2. The MCP-served `mcp__worldloom__submit_patch_plan` and `mcp__worldloom__validate_patch_plan` tool paths are unaffected by this gap — their `worldRoot` resolution happens server-side in the MCP host's process context (the worldloom MCP server's spawn cwd) and does not depend on the caller's cwd. The gap is specific to the CLI submit/validate-paths used for oversize envelopes (per `engine-envelope-shape.md` §5: "larger envelopes use the CLI submit path … to bypass MCP transport size constraints") and for direct CLI workflows.
3. Cross-artifact ticket: this ticket touches the shared CLI invocation contract documented across repo-level docs, package README prose, and skill-local envelope-shape references. Per-skill phase prose remains out of scope where it already points readers to these references for the full path contract.
4. FOUNDATIONS §Tooling Recommendation alignment: the §"non-negotiable" requirement for LLM agents to receive context "directly or via the documented context-packet + targeted-retrieval pattern" implies that the CLI-as-documented-fallback path must itself be reliably documented. A cryptic error mode that requires source-code archaeology to diagnose is a documentation-pattern violation against the spirit of §Tooling Recommendation, even though no specific FOUNDATIONS clause names CLI cwd discipline directly.

## Architecture Check

1. The cleanest fix is docs-only propagation across the same-seam CLI contract docs/references. No engine code change is warranted: the cwd-derived `worldRoot` is the correct resolution mechanism (it makes the CLI work transparently inside both the main repo and any git worktree the user may be in without an environment-variable or absolute-path dependency the project does not currently export). Adding a clear documented note at the compact CLI contract surfaces is the lowest-risk fix. Alternative — adding a `--world-root <path>` CLI flag — would be a non-trivial engine change and would not eliminate the silent failure mode for users who don't pass the flag.
2. No backwards-compatibility shims or alias paths are introduced — the cwd-anchoring behavior is preserved unchanged; only the documentation is added.

## Verification Layers

1. The cwd-anchoring requirement is named at same-seam CLI contract docs/references -> codebase grep-proof for the new phrase across `tools/world-mcp/README.md`, `docs/HARD-GATE-DISCIPLINE.md`, `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/create-base-world/references/engine-envelope-shape.md`, `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`.
2. The error-mode mapping (`"Index missing for world '<slug>'"` -> diagnose cwd) is documented at the failure-modes section of `engine-envelope-shape.md` §6 -> codebase grep-proof for the literal error phrase plus the cwd-diagnosis phrasing.
3. No unrelated docs surface drifts -> manual review kept `docs/CONTEXT-PACKET-CONTRACT.md` out of scope because it describes MCP-mediated retrieval rather than the validate/submit CLI fallback. `docs/MACHINE-FACING-LAYER.md` was absorbed because it names the validate CLI fallback directly.

## Landed Changes

### 1. `tools/world-mcp/README.md` §"Patch-plan CLIs"

Updated the patch-plan CLI examples to repo-root command paths and added a note immediately after the CLI invocation lines stating that `submit-patch-plan.js` and `validate-patch-plan.js` must be invoked from the project root (the directory containing `worlds/`, `tools/`, `docs/`) or the active git worktree root. The note explains that the CLI/engine path resolves world state from `process.cwd()` to find the world index at `worlds/<slug>/_index/world.db`, cites `tools/world-index/src/index/open.ts`'s `indexDirectoryForWorld`, and names the expected wrong-cwd error mode: `Index missing for world '<slug>'`.

### 2. `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan

Added the same cwd-anchoring note in §Submitting the plan so skills referencing this doc propagate the discipline transparently.

### 3. Envelope-shape references and compact retrieval reference

In `.claude/skills/create-base-world/references/engine-envelope-shape.md`, `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, and `.claude/skills/canon-addition/references/engine-envelope-shape.md`, added the cwd-anchoring requirement to §5 and added a §6 failure-mode entry for `"Index missing for world '<slug>'"`, mapping it to wrong-cwd diagnosis and recovery from the project root or active worktree root.

In `docs/MACHINE-FACING-LAYER.md` and `.claude/skills/canon-addition/references/retrieval-tool-tree.md`, added the same concise cwd note beside the validate/submit CLI fallback references.

## Files to Touch

- `tools/world-mcp/README.md` (modify)
- `docs/HARD-GATE-DISCIPLINE.md` (modify)
- `docs/MACHINE-FACING-LAYER.md` (modify)
- `.claude/skills/create-base-world/references/engine-envelope-shape.md` (modify)
- `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md` (modify)
- `.claude/skills/canon-addition/references/engine-envelope-shape.md` (modify)
- `.claude/skills/canon-addition/references/retrieval-tool-tree.md` (modify)

## Out of Scope

- Changing the CLI's cwd-resolution behavior. The current behavior is correct — it transparently supports both main-repo and worktree invocation without forcing an environment variable or absolute-path argument.
- Adding a `--world-root <path>` flag to override cwd-derived resolution. If such a flag is desired in the future, that's a separate engine-change ticket.
- Updating per-skill phase prose (`storylet-pool-authoring/SKILL.md`, `branching-story-bootstrap/SKILL.md`, `branching-story-page-cycle/SKILL.md`, etc.) to duplicate the cwd discipline — those skills cross-reference the edited references/docs, so the documentation propagates by reference. Skill-prose updates are out of scope and route to `/skill-audit` if the cross-reference's discoverability turns out to be insufficient at a downstream session.

## Acceptance Criteria

### Tests That Must Pass

1. `grep -niE "cwd|working directory|project root|invoke from" tools/world-mcp/README.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/canon-addition/references/retrieval-tool-tree.md` returns matches across every edited CLI contract surface.
2. `grep -nE "Index missing for world" .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md` confirms the §6 failure-mode entries name the literal error string.
3. The §6 failure-mode listings in the envelope-shape references map `Index missing for world '<slug>'` to a cwd-diagnosis recovery path.

### Invariants

1. Every edited same-seam CLI contract doc/reference names the cwd requirement; per-skill phase prose may continue to point to those references rather than duplicating the note.
2. The patch-engine code's cwd-derived `worldRoot` resolution at `tools/world-index/src/index/open.ts` remains unchanged.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `grep -niE "cwd|working directory|project root|invoke from" tools/world-mcp/README.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/canon-addition/references/retrieval-tool-tree.md` — confirms all edited docs/reference surfaces document the requirement after the edit.
2. `grep -nE "Index missing for world" .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md` — confirms the §6 failure-mode entries name the literal error string.
3. The targeted greps at commands 1 and 2 ARE the correct verification boundary — running the full pipeline test suite would not surface a docs gap; the docs-drift signal lives entirely in the text content of the edited docs/reference files.

## Outcome

Completion date: 2026-05-04.

Completed as a docs-only cross-artifact contract fix. The validate/submit patch-plan CLI cwd requirement is now documented at the repo-level HARD-GATE discipline, the `tools/world-mcp` README, the machine-facing layer tool inventory, and the affected skill-local envelope/retrieval references. The `tools/world-mcp` README patch-plan CLI examples now use repo-root command paths.

## Verification Result

1. `grep -niE "cwd|working directory|project root|invoke from" tools/world-mcp/README.md docs/HARD-GATE-DISCIPLINE.md docs/MACHINE-FACING-LAYER.md .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md .claude/skills/canon-addition/references/retrieval-tool-tree.md` — passed; every edited CLI contract surface now names the cwd requirement.
2. `grep -nE "Index missing for world" .claude/skills/create-base-world/references/engine-envelope-shape.md .claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md .claude/skills/canon-addition/references/engine-envelope-shape.md` — passed; every edited envelope-shape failure-mode table names the literal error string and cwd recovery.

## Deviations

Reassessment widened the docs/reference file set from the drafted three surfaces to seven same-seam surfaces because `docs/MACHINE-FACING-LAYER.md`, `.claude/skills/branching-story-bootstrap/references/engine-envelope-shape.md`, `.claude/skills/canon-addition/references/engine-envelope-shape.md`, and `.claude/skills/canon-addition/references/retrieval-tool-tree.md` also publish the CLI fallback contract. Per-skill phase prose remains out of scope because those skill sections already point to the edited references/docs for the full submit-path contract.
