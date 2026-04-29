# COMMITGUIDE-001: Propagate Phase 9 commit failure-mode discipline to sibling engine-submitting skills

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No engine code; documentation propagation across `.claude/skills/canon-addition/`, `.claude/skills/create-base-world/`, `.claude/skills/diegetic-artifact-generation/` — three skill prose files plus their relevant references covering: (a) `validator_failed` engine response and unrelated-state escalation rule; (b) `world-index sync <world-slug>` requirement after direct-Edit to schema-validated hybrid frontmatter; (c) submit-path-by-envelope-size selection (MCP path vs CLI path); (d) `index_stale` engine response handling now that ENGINESYNC-001 has landed.
**Deps**: Pairs with `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md` — ENGINESYNC-001 landed the `index_stale` engine error code and character-generation source prose, so this ticket must include `index_stale` alongside `validator_failed` in each sibling skill's failure-mode discussion. Recommended implementation: land the sibling-skill propagation before release so the engine and skill prose ship together.

## Problem

A character-generation skill audit (this session, 2026-04-28) added documentation to its Phase 9 commit step covering three operational gaps surfaced during the CHAR-0004 (Rill) generation run:

1. **`validator_failed` failure-mode response**: The engine's pre-apply validator runs against the indexed world state; failures can name files unrelated to the new artifact being submitted. The skill now documents the response: if the cited file is the new artifact, fix and resubmit; if the cited file is unrelated existing world state, pause and escalate to the user — the canon-reading skill must not silently modify other canon-adjacent files.
2. **`world-index sync <world-slug>` after direct-Edit to hybrid frontmatter**: After any user-authorized direct-Edit to a schema-validated hybrid frontmatter file (`worlds/<slug>/characters/`, `diegetic-artifacts/`, `adjudications/`), the world index must be re-synced before resubmitting; otherwise the validator returns the identical-looking error against the stale index.
3. **Submit-path-by-envelope-size selection**: For envelopes >50KB (typical of full-prose dossiers), the CLI submit path (`node tools/world-mcp/dist/src/cli/submit-patch-plan.js`) bypasses MCP transport size constraints. Functionally equivalent to the MCP path; same engine code, same `PatchReceipt`, same failure-mode codes.

These same gaps exist in three sibling engine-submitting skills: `canon-addition`, `create-base-world`, `diegetic-artifact-generation`. All three submit patch plans via `mcp__worldloom__submit_patch_plan` and would experience the same friction on (a) unrelated-state validator failures (especially canon-addition, which writes multiple `_source/` records and is the most likely to hit pre-existing schema violations elsewhere in the world); (b) post-direct-Edit index staleness (any audit-flow that modifies a non-engine surface to fix a blocking issue); (c) large-envelope submissions (canon-addition's accept-path can produce 50-100KB envelopes; create-base-world's genesis multi-record set is also large).

This ticket propagates the character-generation guidance to the three siblings as documentation-only edits.

## Assumption Reassessment (2026-04-29)

1. The source of the propagation is `.claude/skills/character-generation/SKILL.md` Phase 9 step 1, last edited during the recent character-generation audit-implementation pass. Verified by grep: `rg -n "Submit-path selection by envelope size|validator_failed|world-index sync" .claude/skills/character-generation/SKILL.md` returns hits in Phase 9 step 1's failure-mode discussion.
2. The three sibling engine-submitting skills are: `canon-addition` (submits CF / CH / INV / M / OQ / ENT / SEC creation + extension append plans); `create-base-world` (submits genesis multi-record world-bundle plans); `diegetic-artifact-generation` (submits `append_diegetic_artifact_record` plans, structurally identical to character-generation's `append_character_record` plans). Verified by grep: `rg -n "submit_patch_plan" .claude/skills/` returns hits in each of these four skills.
3. Each sibling skill's commit step lives in a slightly different location:
   - `canon-addition`: per `.claude/skills/canon-addition/SKILL.md` and the references it loads (likely `references/accept-path.md` for the accept-outcome submit path; verify exact file during implementation by listing `.claude/skills/canon-addition/references/`).
   - `create-base-world`: per `.claude/skills/create-base-world/SKILL.md` (likely a single-file skill or with templates; verify during implementation).
   - `diegetic-artifact-generation`: per `.claude/skills/diegetic-artifact-generation/SKILL.md` and its references; the structure mirrors character-generation.
4. Cross-skill boundary under audit: the operational contract between the four engine-submitting skills (consumers of the patch engine's submit response) and the engine response shape (provider). Pre-fix, only character-generation documents the full failure-mode response; the three siblings rely on `docs/HARD-GATE-DISCIPLINE.md` for the canonical reference. The `HARD-GATE-DISCIPLINE.md` doc covers approval_token discipline + sign-and-submit but not the validator_failed unrelated-state escalation rule, the index-sync requirement, or the CLI path size threshold.
5. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation + §Change Control Policy. Engine-submitting skills are the canonical write surface for canon mutations; their commit step is the operator's main interaction with the engine's safety mechanisms. Documenting failure modes consistently across the four skills lets operators rely on the same recovery flow regardless of which skill they are running.
6. HARD-GATE / canon-write ordering: not weakened. The propagated prose adds operational guidance for failure modes; it does not change the HARD-GATE structural enforcement (Hook 3 blocks raw `Edit`/`Write` on `_source/<subdir>/*.yaml`; the engine validates and writes atomically; user approval gates the submit). The new `index_stale` error code (from ENGINESYNC-001) is a fail-loud safety net, not a HARD-GATE bypass.
7. Schema impact: documentation only. No engine code changes; no skill output schema changes; no consumer-skill schema migration. Pure prose propagation.
8. Adjacent contradictions exposed by reassessment: each sibling skill may already have its own Phase-N or step-N commit guidance with partially-overlapping content. The propagation must not duplicate existing guidance — read each sibling's existing commit-step prose during implementation, identify what is already covered, and add only the missing pieces. For example, if canon-addition's accept-path.md already documents the `world-index sync` requirement (because canon-addition was the first skill to write `_source/` records and may have inherited the discipline), this ticket should not double-document.
9. Pipeline-wide grep for current coverage: `rg -n "validator_failed|world-index sync|submit-path selection|index_stale" .claude/skills/` shows the current state per skill. After implementation, all four engine-submitting skills should match on these tokens with consistent operational prose.
10. Coordination with ENGINESYNC-001: `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md` landed the `index_stale` error code, `docs/HARD-GATE-DISCIPLINE.md` update, and character-generation source prose. This ticket should now propagate all four topics, including `index_stale`, to the three sibling engine-submitting skills before release.

## Architecture Check

1. Documentation propagation across the four sibling engine-submitting skills produces consistent operator experience and reduces per-skill drift. The alternative (let each skill rediscover the failure modes when its first audit fires) leaves three skills under-documented for the same operational scenarios character-generation has already audited and documented.
2. The propagated prose lives in each sibling skill's commit step (or the references file the commit step loads). Centralizing in `docs/HARD-GATE-DISCIPLINE.md` and pointing each skill at it would also work — but the current pattern (skill-prose carries the operational discipline; HARD-GATE-DISCIPLINE.md carries the canonical reference) matches the recently-audited character-generation discipline. Maintain the pattern.
3. No backwards-compatibility shims. Pure additive prose. Existing skills' commit-step prose is extended, not rewritten.

## Verification Layers

1. Each of the three sibling skills' commit-step prose includes the four documented topics (validator_failed unrelated-state escalation; index-sync after direct-Edit; CLI path size selection; `index_stale`) → grep-proof: `rg -n "validator_failed|world-index sync|<path>/cli/submit-patch-plan.js|index_stale" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` returns hits in each skill.
2. The propagated prose is operator-runnable — file paths, command strings, and engine response codes match the actual engine + indexer + CLI submission paths in `tools/patch-engine/`, `tools/world-index/`, `tools/world-mcp/` → manual review during implementation against the same paths character-generation cites.
3. Each sibling skill's prose does NOT duplicate guidance that already exists in that skill (no double-documentation) → manual review during implementation.
4. No engine behavior changes; pure documentation → no test coverage required, but `cd tools/world-mcp && npm test` and `cd tools/patch-engine && npm test` should still pass (regression baseline; documentation-only ticket).
5. FOUNDATIONS alignment — preserves §Tooling Recommendation by making engine-side discipline visible at the skill-prose level for every engine-submitting skill → FOUNDATIONS alignment check.

## What to Change

### 1. Identify each sibling skill's commit step

Before propagating, for each of `canon-addition`, `create-base-world`, `diegetic-artifact-generation`:

- List the skill directory (`.claude/skills/<skill>/`) and locate the commit-step prose. Likely candidates:
  - `canon-addition`: `references/accept-path.md` for the accept-outcome submit; possibly `SKILL.md` Phase N for general submit-path guidance.
  - `create-base-world`: `SKILL.md` (single-file or near-single-file skill).
  - `diegetic-artifact-generation`: `SKILL.md` Phase N; structurally mirrors character-generation, so the commit-step location is likely a Phase 9-equivalent.
- Read the existing commit-step prose; identify which of the four topics are already covered.
- Compose the per-skill addition that adds only the missing topics.

### 2. Propagate `validator_failed` unrelated-state escalation rule

For each sibling skill missing this guidance, add to the commit-step prose:

> **Failure-mode response**. On `validator_failed`, inspect `detail.verdicts[].location.file`: if the cited file is the new artifact (the file this skill is writing), the schema violation is in this skill's output — fix and resubmit; **if the cited file is unrelated existing world state (any path other than the new artifact), pause and escalate to the user — this skill must not silently modify other canon-adjacent files. Hook 3 does not block hybrid-file frontmatter edits, so the discipline is prescriptive.**

For `canon-addition` specifically, the new-artifact set is wider (CF / CH / INV / M / OQ / ENT / SEC records being created or extended). Adapt the "new artifact" wording accordingly: "if the cited file is one of the records this patch plan is creating or extending (per the plan's `expected_id_allocations` or extension targets), fix and resubmit; otherwise, pause and escalate".

### 3. Propagate `world-index sync` requirement after direct-Edit

For each sibling skill missing this guidance, add:

> After any user-authorized direct-`Edit` to a hybrid-file frontmatter under `worlds/<slug>/characters/`, `diegetic-artifacts/`, or `adjudications/` (the surfaces under `record_schema_compliance` validator scope), run `node tools/world-index/dist/src/cli.js sync <world-slug>` before resubmitting — the validator runs against the indexed world state, not against on-disk content, and a stale index will return the identical-looking error on the resubmit. INDEX.md edits do not require sync (not under validator scope).

### 4. Propagate submit-path-by-envelope-size selection

For each sibling skill missing this guidance, add:

> **Submit-path selection by envelope size**: for envelopes >50KB (typical of full-prose artifacts; canon-addition accept-paths and diegetic-artifact-generation submit-paths frequently exceed this; create-base-world genesis bundles routinely exceed it), submit via the CLI path instead: `node tools/world-mcp/dist/src/cli/submit-patch-plan.js <plan-path> <token-path>` (persist the signed token to a text file first). The CLI path is functionally equivalent — same engine code, same `PatchReceipt`, same failure-mode codes — but bypasses MCP transport size constraints; see `docs/HARD-GATE-DISCIPLINE.md` §Submitting the plan: MCP path (default) and CLI path (size-constrained bypass) for full equivalence guarantees.

### 5. Add `index_stale` clause

Because ENGINESYNC-001 has shipped the new error code, add to each sibling skill's commit-step prose:

> On `index_stale`, the engine has detected that the world index has diverged from on-disk content (typically because a direct-Edit to a hybrid-file frontmatter was not followed by an index sync). The error response's `detail.divergent_files[].file_path` names the divergent files. Run `node tools/world-index/dist/src/cli.js sync <world-slug>` to refresh the index, then resubmit the patch plan with the same approval token (no re-sign required as long as the token has not expired).

### 6. Verify cross-skill consistency

After all three sibling skills' propagation lands, grep for the four topics across all four engine-submitting skills (`character-generation`, `canon-addition`, `create-base-world`, `diegetic-artifact-generation`) and confirm consistent operational prose. The four skills should describe the same failure modes with the same recovery commands; only the artifact-set definition (CF records vs hybrid dossiers vs genesis bundles vs character dossiers) differs per skill.

## Files to Touch

- `.claude/skills/canon-addition/SKILL.md` (modify — commit-step prose; verify exact location during implementation)
- `.claude/skills/canon-addition/references/accept-path.md` (modify — accept-outcome submit-path commit step; verify exact file during implementation by listing `references/`)
- `.claude/skills/create-base-world/SKILL.md` (modify — commit-step prose)
- `.claude/skills/diegetic-artifact-generation/SKILL.md` (modify — commit-step prose; structurally mirrors character-generation Phase 9)
- `.claude/skills/diegetic-artifact-generation/references/<commit-step>.md` (modify if the commit-step lives in a reference file; verify during implementation)

The character-generation skill is the SOURCE of the propagation, not a target — its prose was added during the recent audit and the `index_stale` clause landed with `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md`. Do not duplicate that character-generation edit here.

## Out of Scope

- Engine code changes. This is a documentation-propagation ticket. Engine-side improvements (the `index_stale` error code, content_hash divergence detection) live in `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md`.
- Centralizing the operational guidance into `docs/HARD-GATE-DISCIPLINE.md` instead of skill prose. The current pattern (skill prose carries discipline; HARD-GATE-DISCIPLINE.md carries the canonical reference) matches the character-generation audit; this ticket preserves the pattern for consistency. A future consolidation ticket can revisit if the per-skill prose drifts.
- Adding new failure-mode codes beyond `validator_failed` / `index_stale` / `approval_expired` / `approval_replayed`. The current set is documented in `docs/HARD-GATE-DISCIPLINE.md`; this ticket propagates them, not invents new ones.
- Updating `docs/HARD-GATE-DISCIPLINE.md` itself. The character-generation audit already pointed at HARD-GATE-DISCIPLINE.md as the canonical reference; this ticket adds skill-prose pointers to that doc, not the doc itself. `archive/tickets/ENGINESYNC-001-stale-index-detection-on-pre-apply-validation.md` owns the HARD-GATE-DISCIPLINE.md update that added `index_stale` to the failure-mode list.
- Auditing the three sibling skills for unrelated improvements. This is a focused propagation ticket; broader sibling audits remain separate skill-audit invocations.

## Acceptance Criteria

### Tests That Must Pass

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment item 9 (regression baseline: `cd tools/world-mcp && npm test`, `cd tools/patch-engine && npm test`).
2. Grep-proof: `rg -n "validator_failed" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` returns hits in each skill.
3. Grep-proof: `rg -n "world-index sync|tools/world-index/dist/src/cli.js sync" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` returns hits in each skill.
4. Grep-proof: `rg -n "submit-patch-plan.js|CLI path" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` returns hits in each skill.
5. Grep-proof: `rg -n "index_stale" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` returns hits in each skill.

### Invariants

1. The four engine-submitting skills (`character-generation`, `canon-addition`, `create-base-world`, `diegetic-artifact-generation`) describe the same operational failure modes with the same recovery commands. Per-skill divergence is limited to the artifact-set definition (which files this skill writes) and the per-skill phase numbering / step naming.
2. No skill's commit-step prose duplicates guidance already covered in another section of the same skill (avoid double-documentation).
3. Pure additive change. No existing prose is removed or contradicted.

## Test Plan

### New/Modified Tests

1. None — documentation-only ticket; verification is command-based and existing pipeline coverage is named in Assumption Reassessment.

### Commands

1. `rg -n "validator_failed|world-index sync|submit-patch-plan.js|index_stale" .claude/skills/canon-addition .claude/skills/create-base-world .claude/skills/diegetic-artifact-generation` — confirms the four topics land in each sibling skill.
2. `rg -n "validator_failed|world-index sync|submit-patch-plan.js|index_stale" .claude/skills/character-generation` — confirms the source skill remains the canonical pattern (regression baseline; should be unchanged unless ENGINESYNC-001 adds `index_stale` here in the same release).
3. `cd tools/world-mcp && npm test` and `cd tools/patch-engine && npm test` — regression baseline; this ticket does not touch engine code, so both should pass without changes.
