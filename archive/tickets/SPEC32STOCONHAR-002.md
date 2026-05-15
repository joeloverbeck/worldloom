# SPEC32STOCONHAR-002: Post-write plan-hash verification

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — shared story-state contract §10 (new step 5a), `branching-story-bootstrap` Phase 10, `branching-story-turn-cycle` Phase 10, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (test extension), `archive/specs/SPEC-32-story-contract-hardening-iv.md` (D4 implementation note)
**Deps**: None

## Problem

At intake, the PG record's `plan.plan_hash` was computed over the future page-plan bytes during Phase 9 (validation) using `tools/world-mcp/src/cli/compute-pg-hashes.ts`, and committed when the patch plan was accepted in Phase 10. The page-plan markdown was then directly written to `pages-prose-plans/PG-<integer>.md`. The shared write order at `.claude/skills/_shared-templates/story-state-contract.md` §10 specified steps 1–6 with no re-hash between the markdown write (step 5) and the `INDEX.md` update (step 6). If a formatting glitch, encoding anomaly, editor auto-format, or file-write error changed the page-plan bytes after step 4 (when the PG record committed with its hash), the committed `PG.plan.plan_hash` no longer proved the renderer prompt that was actually stored.

`branching-story-prose-attach` caught the drift reactively (at prose attach time, via `branching-story-prose-attach/SKILL.md:157-166`), but by then the bundle `INDEX.md` had already advertised the page as healthy and any sibling page-cycle that forked from this page would trust the committed `plan_hash` as proof of the disk state. This ticket added a post-write re-hash verification step before `INDEX.md` updates, using the existing `compute-pg-hashes` CLI (no `--verify` subcommand needed) to recompute the hash from the just-written file bytes and compare against the committed `PG.plan.plan_hash`. A mismatch routes to direct-artifact partial-failure handling per HARD-GATE discipline.

Affected sites:
- `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10.
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10.
- `.claude/skills/_shared-templates/story-state-contract.md` §10.

## Assumption Reassessment (2026-05-16)

1. At intake, Bootstrap Phase 10 write order was verified at `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10; turn-cycle Phase 10 was verified at `.claude/skills/branching-story-turn-cycle/SKILL.md`; contract §10 write order was verified at `.claude/skills/_shared-templates/story-state-contract.md`. Each surface lacked an explicit re-hash step between the markdown write and the `INDEX.md` update.
2. Compute-pg-hashes CLI usage verified at `tools/world-mcp/src/cli/compute-pg-hashes.ts`: the documented invocation is `compute-pg-hashes --plan <plan-md-path> --pg <pg-record-path>` — the PG-record argument flag is `--pg`, not `--state`. SPEC-32 §D4 step 2 wrote `--state`; this ticket uses `--pg` (per Step 2 Issue 1 disposition: codebase truth wins over spec drift, no spec edit).
3. Cross-skill / cross-artifact boundary: the shared story-state contract §10 is the canonical write-order spec; bootstrap Phase 10 and turn-cycle Phase 10 must remain in sync with it. This ticket edits all three surfaces in one batch to keep them consistent.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — line 590-594: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan."* The post-write re-hash discipline protects this boundary by ensuring the committed `PG.plan.plan_hash` continues to prove the disk state; if the disk drifts, the PG record remains authoritative and the disk is reconciled to it (never the other way around). Also FOUNDATIONS §HARD-GATE discipline (`docs/FOUNDATIONS.md:524` Tooling Recommendation cross-references `docs/HARD-GATE-DISCIPLINE.md`) — direct-artifact partial-failure handling routes the mismatch through the same authority-cited PASS/FAIL surface used elsewhere in the pipeline.
5. This ticket touches HARD-GATE-adjacent semantics: it classifies a new failure mode (post-write hash mismatch) as a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`, blocks the bundle `INDEX.md` update on detection, and routes recovery through file repair to the already-approved bytes (not through PG re-submission, which would require a fresh approval token). Mystery Reserve firewall is unaffected — gate 3 of the eight hard gates already fired at Phase 9; this ticket adds a structural check, not a content gate.
6. Active SPEC-32 D4 still drafted validator fixture directories as the proof surface. Live reassessment and implementation used the existing `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` integration point instead, so `archive/specs/SPEC-32-story-contract-hardening-iv.md` now carries a dated D4 implementation note identifying the landed proof surface and preserving the validator-fixture paragraphs as historical intake context.

## Architecture Check

1. Cleaner than introducing a `--verify` subcommand to `compute-pg-hashes.ts` because the existing CLI already emits the canonical hash; the skill prose simply invokes the CLI on the just-written file and compares the emitted `plan_hash` to the committed `PG.plan.plan_hash`. A `--verify` subcommand would duplicate that comparison inside the CLI without changing the load-bearing surface. The CLI flag deferral is explicitly documented as a future option per SPEC-32 §D4 Optional follow-up and §Risks & Open Questions; this ticket lands the minimum-blast-radius shape now.
2. No backwards-compatibility shims. The new step 5a is additive — existing PG records and bundles are unaffected because their hashes already match (they were written with matching bytes at the time). New page writes will run the verification; failure surfaces immediately, before `INDEX.md` advertises the new page.

## Verification Layers

1. Contract §10 step 5a is inserted between step 5 (markdown write) and step 6 (`INDEX.md` update) → codebase grep-proof (`grep -n "5a\\. Post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md`).
2. Bootstrap Phase 10 invokes the post-write verification before the `INDEX.md` update → codebase grep-proof (bootstrap SKILL.md contains the `compute-pg-hashes` invocation with `--pg`).
3. Turn-cycle Phase 10 invokes the post-write verification before the `INDEX.md` update → codebase grep-proof (turn-cycle SKILL.md contains the parallel invocation).
4. compute-pg-hashes.test.ts CLI test extension demonstrates that a corrupted plan file produces a different hash than the committed one → schema validation + integration test (the test asserts hash B from the corrupted plan ≠ hash A from the clean plan, exercised through `runComputePgHashesCli`).
5. HARD-GATE discipline routing on mismatch → manual review against `docs/HARD-GATE-DISCIPLINE.md` direct-artifact partial-failure pattern; the skill prose names the routing explicitly.

## Landed Changes

### 1. Contract §10 — inserted step 5a after step 5

In `.claude/skills/_shared-templates/story-state-contract.md` §10 ("Shared Write Order"), a new step 5a now sits between the existing step 5 (direct-markdown artifact write) and step 6 (bundle `INDEX.md` update):

```
5a. Post-write plan-hash verification. Immediately re-read the bytes of `pages-prose-plans/PG-<integer>.md` and recompute its `plan_hash` using the canonical helper at `tools/world-mcp/src/cli/compute-pg-hashes.ts` (CLI: `compute-pg-hashes --plan <plan-md-path> --pg <pg-record-path>`). The recomputed `plan_hash` MUST equal the committed `PG.plan.plan_hash` (the value the patch plan accepted in step 4) before step 6 runs. If the values differ, this is a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`: do not update `INDEX.md`; surface the mismatch with both the committed and recomputed hashes; repair the file to the already-approved bytes or re-run approval with the corrected bytes. The step 4 patch plan and its committed PG record are unchanged; the disk state is being reconciled to them.
```

### 2. Bootstrap Phase 10 — inserted verification step before `INDEX.md` update

In `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10, after the `pages-prose-plans/PG-1.md` write and before the bundle `INDEX.md` update, the workflow now runs:

```
- Post-write plan-hash verification (shared contract §10 step 5a). Run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-1.md --pg <PG-1 record file>` and confirm the emitted `plan_hash` equals the committed `PG-1.plan.plan_hash`. If they differ: do not update `INDEX.md`; surface the mismatch and both hashes (committed vs recomputed); treat as a direct-artifact partial failure per HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
```

### 3. Turn-cycle Phase 10 — inserted verification step before `INDEX.md` update

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10, the parallel insertion now runs with `PG-<integer>` substituted:

```
- Post-write plan-hash verification (shared contract §10 step 5a). Run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-<integer>.md --pg <PG record file>` and confirm the emitted `plan_hash` equals the committed `PG-<integer>.plan.plan_hash`. If they differ: do not update `INDEX.md`; surface the mismatch and both hashes; treat as a direct-artifact partial failure per HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
```

### 4. compute-pg-hashes.test.ts — added post-write mismatch scenario

`tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` now includes `cli-compute-pg-hashes: post-write re-hash detects plan-file drift`. The test constructs a valid PG draft matching existing test conventions, computes the committed plan hash from clean plan bytes, mutates the same plan file, recomputes the hash through `runComputePgHashesCli(["--plan", planPath, "--pg", pgPath])`, and asserts the recomputed hash differs from the committed value.

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §10 step 5a insertion, after existing step 5)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 10 insertion before `INDEX.md` update)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 10 insertion before `INDEX.md` update)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify — append the post-write-mismatch test case)
- `archive/specs/SPEC-32-story-contract-hardening-iv.md` (modify — D4 implementation note truthing the proof surface)

## Out of Scope

- `compute-pg-hashes.ts` CLI extension with `--verify` subcommand — deferred per SPEC-32 §D4 Optional follow-up and §Risks & Open Questions; the existing CLI suffices.
- New validator-fixture directories under `tools/validators/tests/fixtures/branching-story-bootstrap/` or `tools/validators/tests/fixtures/branching-story-turn-cycle/` — the codebase's `tools/validators/tests/fixtures/` is flat (no per-skill subdirectories exist); the integration point for this test is `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`, not a new fixture surface. Per Step 2 Issue 2 disposition (expand-scope-in-place: codebase-aligned integration surface).
- Migration of existing test fixtures with already-committed pages — no migration is needed; existing pages were written with matching hashes.
- Patch-engine changes — no op or schema change.
- MCP retrieval surface changes — none required.

## Acceptance Criteria

### Tests That Must Pass

1. `npm --prefix tools/world-mcp test` runs the existing `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` suite plus the new post-write-mismatch test case; all pass.
2. `grep -n "5a\\. Post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md` returns a match.
3. `grep -n "post-write plan-hash verification" .claude/skills/branching-story-bootstrap/SKILL.md` returns a match in Phase 10.
4. `grep -n "post-write plan-hash verification" .claude/skills/branching-story-turn-cycle/SKILL.md` returns a match in Phase 10.
5. `grep -nE "compute-pg-hashes\\.js --plan [^ ]+ --pg" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` returns matches with `--pg` flag (not `--state`).

### Invariants

1. The committed `PG.plan.plan_hash` continues to prove the disk state at `pages-prose-plans/PG-<integer>.md`; any drift between commit time and `INDEX.md` update blocks the index update and surfaces a direct-artifact partial failure.
2. The PG record itself is never mutated as a result of a post-write mismatch — the disk artifact is reconciled to the record, not the record to the disk (FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary).
3. The patch plan is not re-submitted on mismatch — only the file is corrected. The approval token from step 3 remains bound to the original payload.
4. Existing pre-Phase-10 hash semantics (`compute-pg-hashes` invoked during Phase 9) are unchanged; the new step 5a is additive.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` — append a `post-write re-hash detects plan-file drift` test case that exercises hash-A-vs-hash-B equality on clean and drifted plan files.

### Commands

1. `npm --prefix tools/world-mcp test` — runs the world-mcp test suite including the new post-write-mismatch case.
2. `grep -nEi "post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — confirms the discipline language landed at all three surfaces.
3. `grep -nE "compute-pg-hashes\\.js --plan [^ ]+ --pg" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — confirms the CLI invocation uses the correct `--pg` flag (not `--state`).

## Outcome

Completed: 2026-05-16

What changed:
- `.claude/skills/_shared-templates/story-state-contract.md` §10 now has step 5a between direct-markdown artifact writes and `INDEX.md` updates.
- `branching-story-bootstrap` Phase 10 and `branching-story-turn-cycle` Phase 10 now write the page-plan markdown, re-run `compute-pg-hashes` with `--pg`, compare the emitted `plan_hash` to the committed `PG.plan.plan_hash`, and block `INDEX.md` updates on mismatch.
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` now includes a post-write drift test that computes hash A, mutates the plan file bytes, recomputes hash B, and asserts the hashes differ.
- `archive/specs/SPEC-32-story-contract-hardening-iv.md` D4 now has a dated implementation note identifying the landed proof surface and preserving the earlier validator-fixture text as historical intake context.

## Verification Result

Commands run:
- `npm --prefix tools/world-mcp test` before edits: passed, 70/70 compiled test files.
- `npm --prefix tools/world-mcp test` after edits: passed, 70/70 compiled test files.
- `node --test dist/tests/cli/compute-pg-hashes.test.js` from `tools/world-mcp`: passed, 6/6 subtests including `cli-compute-pg-hashes: post-write re-hash detects plan-file drift`.
- `grep -nEi "post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md`: matched all three surfaces.
- `grep -n "5a\\. Post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md`: matched shared contract §10 step 5a.
- `grep -nE "compute-pg-hashes\\.js --plan [^ ]+ --pg" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md`: matched both Phase 10 post-write verification commands and existing Phase 9 hash-computation commands.
- `git diff --check -- .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md tools/world-mcp/tests/cli/compute-pg-hashes.test.ts archive/tickets/SPEC32STOCONHAR-002.md archive/specs/SPEC-32-story-contract-hardening-iv.md`: passed.

Manual review:
- `docs/HARD-GATE-DISCIPLINE.md` confirms story-bundle direct markdown artifacts remain direct-write surfaces, and direct-artifact write failures after successful patch submission must be surfaced rather than silently retried.
- FOUNDATIONS §Story Bundles §4a Plan-Authority Boundary remains preserved: the PG record remains authoritative, and a disk mismatch is repaired to the already-approved bytes rather than by mutating PG state.

## Deviations

- SPEC-32 D4 drafted validator fixture directories under `tools/validators/tests/fixtures/branching-story-bootstrap/` and `tools/validators/tests/fixtures/branching-story-turn-cycle/`. Live reassessment found the codebase-aligned executable integration point is `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts`, because the existing CLI already owns the hash computation and there is no validator fixture harness for this skill-prose step.
- The post-write verification command uses `--pg`, not the stale `--state` flag drafted in one SPEC-32 D4 snippet. The live CLI documents and accepts `--pg`.
