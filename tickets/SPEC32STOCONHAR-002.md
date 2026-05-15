# SPEC32STOCONHAR-002: Post-write plan-hash verification

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — shared story-state contract §10 (new step 5a), `branching-story-bootstrap` Phase 10, `branching-story-turn-cycle` Phase 10, `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (test extension)
**Deps**: None

## Problem

The PG record's `plan.plan_hash` is computed over the future page-plan bytes during Phase 9 (validation) using `tools/world-mcp/src/cli/compute-pg-hashes.ts`, and committed when the patch plan is accepted in Phase 10. The page-plan markdown is then directly written to `pages-prose-plans/PG-<integer>.md`. The shared write order at `.claude/skills/_shared-templates/story-state-contract.md` §10 specifies steps 1–6 with no re-hash between the markdown write (step 5) and the `INDEX.md` update (step 6). If a formatting glitch, encoding anomaly, editor auto-format, or file-write error changes the page-plan bytes after step 4 (when the PG record committed with its hash), the committed `PG.plan.plan_hash` no longer proves the renderer prompt that was actually stored.

`branching-story-prose-attach` catches the drift reactively (at prose attach time, via `branching-story-prose-attach/SKILL.md:157-166`), but by then the bundle `INDEX.md` has already advertised the page as healthy and any sibling page-cycle that forks from this page will trust the committed `plan_hash` as proof of the disk state. Add a post-write re-hash verification step before `INDEX.md` updates, using the existing `compute-pg-hashes` CLI (no `--verify` subcommand needed) to recompute the hash from the just-written file bytes and compare against the committed `PG.plan.plan_hash`. A mismatch routes to direct-artifact partial-failure handling per HARD-GATE discipline.

Affected sites:
- `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10 — Phase 10 final write at line 370.
- `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10 — Phase 10 write at line 460.
- `.claude/skills/_shared-templates/story-state-contract.md` §10 — shared write order at line 829.

## Assumption Reassessment (2026-05-16)

1. Bootstrap Phase 10 write order verified at `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10; turn-cycle Phase 10 verified at `.claude/skills/branching-story-turn-cycle/SKILL.md:460`. Contract §10 write order verified at `.claude/skills/_shared-templates/story-state-contract.md:829`. Each surface currently lacks an explicit re-hash step between the markdown write and the `INDEX.md` update.
2. Compute-pg-hashes CLI usage verified at `tools/world-mcp/src/cli/compute-pg-hashes.ts`: the documented invocation is `compute-pg-hashes --plan <plan-md-path> --pg <pg-record-path>` — the PG-record argument flag is `--pg`, not `--state`. SPEC-32 §D4 step 2 wrote `--state`; this ticket uses `--pg` (per Step 2 Issue 1 disposition: codebase truth wins over spec drift, no spec edit).
3. Cross-skill / cross-artifact boundary: the shared story-state contract §10 is the canonical write-order spec; bootstrap Phase 10 and turn-cycle Phase 10 must remain in sync with it. This ticket edits all three surfaces in one batch to keep them consistent.
4. FOUNDATIONS §Story Bundles §4a (Plan-Authority Boundary) — line 590-594: *"Story state is authoritative at page-plan commit. Rendered prose is a rendering of that state, not a second state engine. A `PG` record is real the moment the patch engine accepts the page-cycle plan."* The post-write re-hash discipline protects this boundary by ensuring the committed `PG.plan.plan_hash` continues to prove the disk state; if the disk drifts, the PG record remains authoritative and the disk is reconciled to it (never the other way around). Also FOUNDATIONS §HARD-GATE discipline (`docs/FOUNDATIONS.md:524` Tooling Recommendation cross-references `docs/HARD-GATE-DISCIPLINE.md`) — direct-artifact partial-failure handling routes the mismatch through the same authority-cited PASS/FAIL surface used elsewhere in the pipeline.
5. This ticket touches HARD-GATE-adjacent semantics: it classifies a new failure mode (post-write hash mismatch) as a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`, blocks the bundle `INDEX.md` update on detection, and routes recovery through file repair to the already-approved bytes (not through PG re-submission, which would require a fresh approval token). Mystery Reserve firewall is unaffected — gate 3 of the eight hard gates already fired at Phase 9; this ticket adds a structural check, not a content gate.

## Architecture Check

1. Cleaner than introducing a `--verify` subcommand to `compute-pg-hashes.ts` because the existing CLI already emits the canonical hash; the skill prose simply invokes the CLI on the just-written file and compares the emitted `plan_hash` to the committed `PG.plan.plan_hash`. A `--verify` subcommand would duplicate that comparison inside the CLI without changing the load-bearing surface. The CLI flag deferral is explicitly documented as a future option per SPEC-32 §D4 Optional follow-up and §Risks & Open Questions; this ticket lands the minimum-blast-radius shape now.
2. No backwards-compatibility shims. The new step 5a is additive — existing PG records and bundles are unaffected because their hashes already match (they were written with matching bytes at the time). New page writes will run the verification; failure surfaces immediately, before `INDEX.md` advertises the new page.

## Verification Layers

1. Contract §10 step 5a is inserted between step 5 (markdown write) and step 6 (`INDEX.md` update) → codebase grep-proof (`grep -n "5a\\. Post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md`).
2. Bootstrap Phase 10 invokes the post-write verification before the `INDEX.md` update → codebase grep-proof (bootstrap SKILL.md contains the `compute-pg-hashes` invocation with `--pg`).
3. Turn-cycle Phase 10 invokes the post-write verification before the `INDEX.md` update → codebase grep-proof (turn-cycle SKILL.md contains the parallel invocation).
4. compute-pg-hashes.test.ts CLI test extension demonstrates that a corrupted plan file produces a different hash than the committed one → schema validation + integration test (the test asserts hash B from the corrupted plan ≠ hash A from the clean plan, exercised through `runComputePgHashesCli`).
5. HARD-GATE discipline routing on mismatch → manual review against `docs/HARD-GATE-DISCIPLINE.md` direct-artifact partial-failure pattern; the skill prose names the routing explicitly.

## What to Change

### 1. Contract §10 — insert step 5a after step 5

In `.claude/skills/_shared-templates/story-state-contract.md` §10 ("Shared Write Order", starting at line 829), insert a new step 5a between the existing step 5 (direct-markdown artifact write) and step 6 (bundle `INDEX.md` update):

```
5a. Post-write plan-hash verification. Immediately re-read the bytes of `pages-prose-plans/PG-<integer>.md` and recompute its `plan_hash` using the canonical helper at `tools/world-mcp/src/cli/compute-pg-hashes.ts` (CLI: `compute-pg-hashes --plan <plan-md-path> --pg <pg-record-path>`). The recomputed `plan_hash` MUST equal the committed `PG.plan.plan_hash` (the value the patch plan accepted in step 4) before step 6 runs. If the values differ, this is a direct-artifact partial failure per `docs/HARD-GATE-DISCIPLINE.md`: do not update `INDEX.md`; surface the mismatch with both the committed and recomputed hashes; repair the file to the already-approved bytes or re-run approval with the corrected bytes. The step 4 patch plan and its committed PG record are unchanged; the disk state is being reconciled to them.
```

### 2. Bootstrap Phase 10 — insert verification step before `INDEX.md` update

In `.claude/skills/branching-story-bootstrap/SKILL.md` Phase 10, after the existing `pages-prose-plans/PG-1.md` write and before the bundle `INDEX.md` update, insert:

```
- Post-write plan-hash verification (shared contract §10 step 5a). Run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-1.md --pg <PG-1 record file>` and confirm the emitted `plan_hash` equals the committed `PG-1.plan.plan_hash`. If they differ: do not update `INDEX.md`; surface the mismatch and both hashes (committed vs recomputed); treat as a direct-artifact partial failure per HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
```

### 3. Turn-cycle Phase 10 — insert verification step before `INDEX.md` update

In `.claude/skills/branching-story-turn-cycle/SKILL.md` Phase 10 (line 460 region), apply the parallel insertion with `PG-<integer>` substituted:

```
- Post-write plan-hash verification (shared contract §10 step 5a). Run `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan pages-prose-plans/PG-<integer>.md --pg <PG record file>` and confirm the emitted `plan_hash` equals the committed `PG-<integer>.plan.plan_hash`. If they differ: do not update `INDEX.md`; surface the mismatch and both hashes; treat as a direct-artifact partial failure per HARD-GATE discipline (see `docs/HARD-GATE-DISCIPLINE.md`). The patch plan is not re-submitted; only the disk artifact is reconciled to the already-approved bytes.
```

### 4. compute-pg-hashes.test.ts — add post-write mismatch scenario

Extend `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` with a new test case:

```ts
test("cli-compute-pg-hashes: post-write re-hash detects plan-file drift", async () => {
  const tmpDir = makeTmpDir();
  const planPath = writeText(tmpDir, "plan.md", "# Plan body — clean\n");
  const pgPath = writeText(tmpDir, "pg.yaml", "id: PG-1\n# (minimal valid PG draft)\n");

  // Hash A: compute against the clean plan file.
  const clean = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
  assert.equal(clean.exitCode, 0);
  const hashA = JSON.parse(clean.stdout).plan_hash;

  // Simulate a post-write drift: overwrite the plan file with different bytes.
  writeFileSync(planPath, "# Plan body — drifted\n", "utf8");

  // Hash B: recompute against the modified file.
  const drifted = await runComputePgHashesCli(["--plan", planPath, "--pg", pgPath]);
  assert.equal(drifted.exitCode, 0);
  const hashB = JSON.parse(drifted.stdout).plan_hash;

  assert.notEqual(hashA, hashB, "post-write drift must produce a different plan_hash");

  rmSync(tmpDir, { recursive: true, force: true });
});
```

(The PG record fixture above is a minimal placeholder; the actual test must construct a valid PG record draft that the CLI accepts. Match the conventions of existing tests in the same file.)

## Files to Touch

- `.claude/skills/_shared-templates/story-state-contract.md` (modify — §10 step 5a insertion, after existing step 5)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — Phase 10 insertion before `INDEX.md` update)
- `.claude/skills/branching-story-turn-cycle/SKILL.md` (modify — Phase 10 insertion before `INDEX.md` update at line 460 region)
- `tools/world-mcp/tests/cli/compute-pg-hashes.test.ts` (modify — append the post-write-mismatch test case)

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
2. `grep -nE "post-write plan-hash verification" .claude/skills/_shared-templates/story-state-contract.md .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — confirms the discipline language landed at all three surfaces.
3. `grep -nE "compute-pg-hashes\\.js --plan [^ ]+ --pg" .claude/skills/branching-story-bootstrap/SKILL.md .claude/skills/branching-story-turn-cycle/SKILL.md` — confirms the CLI invocation uses the correct `--pg` flag (not `--state`).
