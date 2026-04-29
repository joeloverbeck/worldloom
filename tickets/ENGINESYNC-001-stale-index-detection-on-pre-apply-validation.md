# ENGINESYNC-001: Detect stale-index condition during pre-apply validation and emit `index_stale` error

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine/src/` pre-apply validator path (compare on-disk file content_hash against indexed content_hash before invoking `record_schema_compliance` and other file-content-dependent validators); new `index_stale` error code in the engine response shape; `tools/world-mcp/src/tools/submit-patch-plan.ts` and the CLI submit path (carry the new error code through to the caller); skill-side prose updates in `character-generation` (and via COMMITGUIDE-001, the three sibling engine-submitting skills) to document the new failure mode and recommend `world-index sync` as the canonical recovery
**Deps**: COMMITGUIDE-001 should land in the same release as the engine change so sibling skills' commit guidance is updated alongside the new error code (engine change is the producer; skill prose is the consumer). MCPENH-003 and MCPENH-004 are independent.

## Problem

During the 2026-04-28 CHAR-0004 (Rill) character-generation run, the engine submit path failed twice with an identical-looking `validator_failed` error before succeeding. The first failure was a real pre-existing schema violation in `worlds/animalia/diegetic-artifacts/namahan-at-the-third-gate.md` (DA-0003, `canon_facts_accessible` field encoded as a free-form string instead of the schema's `array | null`). The user authorized a direct-Edit to fix the unrelated file. The second failure on resubmit was IDENTICAL — same field, same path, same three verdicts. The on-disk file was now schema-conformant, but the engine's pre-apply `record_schema_compliance` validator runs against the indexed world state, not on-disk content. The world index was stale because the direct-Edit had not been followed by `node tools/world-index/dist/src/cli.js sync animalia`. After running the sync command manually, the resubmit succeeded.

The friction has three parts:

1. **Discovery cost**: I had to figure out that the engine validates against the index, not the disk. The skill's commit step did not document this (the recent character-generation audit added the index-sync requirement, but the engine itself emitted no signal that the index was the source of disagreement).
2. **Misleading error**: The second `validator_failed` returned exactly the same verdicts as the first. A reasonable interpretation of identical errors is "your fix didn't work" — leading the operator to either re-edit the file (introducing further drift) or escalate back to the user when the actual fix had landed and only the index was stale.
3. **Manual recovery**: `world-index sync <world-slug>` is a one-liner, but the engine could detect the stale-index condition cheaply (compare on-disk file mtime/content_hash against indexed content_hash before running file-content-dependent validators) and either auto-sync or fail-loud with a distinct error code.

This ticket commits to fail-loud with a distinct `index_stale` error code rather than auto-sync. Auto-sync hides the staleness from the operator and the audit trail; fail-loud makes the index's role as canonical state explicit.

## Assumption Reassessment (2026-04-29)

1. The pre-apply validation pipeline runs in `tools/patch-engine/src/`. Confirm exact entry-point file during implementation; the validators directory layout includes `tools/validators/src/structural/record-schema-compliance.ts` (consumed by the patch engine) and the engine-side orchestration in `tools/patch-engine/src/`. The engine reads validation input from the world index, not from on-disk files, for `record_schema_compliance` and similar structural validators that expect indexed-record canonical form.
2. The world index is built by `tools/world-index/dist/src/cli.js` (`build` for full rebuild; `sync` for incremental sync). The sync command updates indexed records to match on-disk content. Verified by running `node tools/world-index/dist/src/cli.js sync animalia` during the Rill session and observing the resubmit succeed against an unchanged disk state.
3. Each indexed file row in `_index/world.db` carries a `content_hash` (verified by reading `tools/world-index/src/schema/types.ts:331` — `NodeRow.content_hash: string`). The on-disk file's content_hash can be computed by the same hashing function the indexer uses. Comparing the two cheaply detects stale-index conditions per file.
4. The engine response shape is documented at `tools/patch-engine/src/envelope/schema.ts`. The current failure modes (per `docs/HARD-GATE-DISCIPLINE.md` and the engine's actual return shapes during the Rill run) include `approval_expired`, `approval_replayed`, `validator_failed`, `id_allocation_race`, `envelope_shape_invalid`, `invalid_input`. Adding `index_stale` is an additive new error code; existing callers that match on the existing codes continue to work.
5. Cross-tool boundary under audit: the contract between the world-index (indexer side) and the patch engine (consumer of indexed state for validation). Shared mutable state: the indexed world.db. Pre-fix, when on-disk files diverge from the index (because of a direct-Edit not followed by sync), the engine's validators report the indexed content's violations as if they were on-disk violations — a category-of-truth confusion the operator must untangle manually.
6. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation. The world index is the canonical retrieval surface; the engine's pre-apply validation against the index is the correct architectural choice. The fix preserves that — does NOT pivot to disk-based validation — and instead surfaces the index-canonical-state discipline explicitly when on-disk content has diverged. FOUNDATIONS Rule 6 (No Silent Retcons) is adjacent: silent stale-index recoveries (auto-sync) would technically work but would obscure the operator's mental model of when the index is authoritative.
7. HARD-GATE / canon-write ordering: not weakened. The fail-loud `index_stale` response halts the submit before any write; the operator must explicitly re-sync the index and resubmit. This is the same discipline as `approval_expired` (the operator must re-sign and resubmit). No HARD-GATE bypass is introduced; no Mystery Reserve firewall is touched.
8. Schema extension: additive new error code on the existing `validator_failed`-shape response (or a peer error code). Existing callers parsing the error response continue to work; new callers can match on `index_stale` to trigger an auto-sync or surface the recovery instruction without re-running the full validator.
9. Adjacent contradiction surfaced during reassessment: the recent character-generation audit added skill-side guidance (`SKILL.md` Phase 9 step 1) recommending manual `world-index sync` after direct-Edits to schema-validated hybrid frontmatter. After this ticket lands, that skill prose remains valid as a discipline (the operator should still expect to run the sync command), but the engine response will now signal `index_stale` explicitly when the operator forgets — making the skill prose the canonical happy-path documentation and the engine signal the safety net. COMMITGUIDE-001 propagates the same skill prose to sibling engine-submitting skills. The two tickets are complementary — engine-side detection + skill-side discipline — and should land in the same release.
10. Pipeline-wide grep for current `validator_failed` consumers: `rg -n "validator_failed" tools/ docs/ .claude/skills/` returns hits in the engine's error-response definition, in `docs/HARD-GATE-DISCIPLINE.md`, and in `.claude/skills/character-generation/SKILL.md` (after the recent audit). All three need to acknowledge the new `index_stale` peer error code in this ticket's §Files to Touch.

## Architecture Check

1. Fail-loud (`index_stale` error code) is cleaner than auto-sync because it preserves the operator's mental model: the world index IS canonical state for validation, and divergence between on-disk and indexed content is an explicit operator-visible event, not a silent recovery. Auto-sync would also race with the locked write-lock the engine takes during submission — it is implementable but introduces ordering questions that are absent from the fail-loud path.
2. Per-file content_hash comparison before invoking file-content-dependent validators is the smallest possible signal-correctness improvement. Other file metadata (mtime, size) are heuristics that can drift; content_hash is exact. The world index already stores content_hash per row; computing the on-disk content_hash on the validation path adds one file-read + one hash-compute per file in the validation scope. This is cheap relative to the validator pass itself.
3. No backwards-compatibility shims. The new error code is additive. Callers that don't match on it continue to see the existing `validator_failed` codepath when the index is fresh.

## Verification Layers

1. The engine emits `index_stale` when on-disk file content_hash diverges from indexed content_hash for any file in the validation scope, and emits `validator_failed` (not `index_stale`) when index and disk agree → unit test in `tools/patch-engine/tests/` (or sibling test path; confirm during implementation) covers both branches.
2. The `index_stale` error response carries the divergent file paths and the recovery instruction (`run 'node tools/world-index/dist/src/cli.js sync <world-slug>' before resubmitting`) → schema validation in test.
3. Existing `validator_failed` consumers (skills, CLI submit path, MCP submit tool) continue to work unchanged when the index is fresh → grep-proof that callers match on the existing code; regression test that fresh-index validation still returns `validator_failed` for genuine schema violations.
4. The character-generation skill's Phase 9 commit step references the new `index_stale` error code alongside the existing `validator_failed` / `approval_expired` / `approval_replayed` failure modes → manual review after COMMITGUIDE-001 propagates the prose update.
5. FOUNDATIONS alignment — preserves the world index as canonical validation state; surfaces stale-index condition explicitly rather than silently auto-recovering → FOUNDATIONS alignment check (Tooling Recommendation; Rule 6 No Silent Retcons adjacency).

## What to Change

### 1. Pre-validation content_hash comparison

In the patch engine's pre-apply validation entry point (verify exact file during implementation; likely `tools/patch-engine/src/validators/preflight.ts` or `tools/patch-engine/src/commit/apply.ts`):

- Before invoking `record_schema_compliance` (and any other validator that reads from the world index expecting it to match on-disk content), iterate the files in scope (the files the patch plan will touch + the files the validator will check against the index).
- For each file, compute the on-disk content_hash using the indexer's hashing function (verify exact symbol during implementation; look in `tools/world-index/src/`).
- Compare against the indexed `NodeRow.content_hash` for the file's primary node.
- If any file diverges, halt validation and return:

```ts
{
  ok: false,
  code: "index_stale",
  message: "World index is stale relative to on-disk content. Run 'node tools/world-index/dist/src/cli.js sync <world-slug>' before resubmitting.",
  detail: {
    divergent_files: [
      { file_path: "<path>", on_disk_content_hash: "<hash>", indexed_content_hash: "<hash>" }
    ]
  }
}
```

The `index_stale` code is a peer of `validator_failed`, not a sub-case. Callers can match on either.

### 2. Add `index_stale` to the engine response error-code enum

In `tools/patch-engine/src/envelope/schema.ts` (or wherever the response error-code union is declared), add `index_stale` to the union. Verify exact symbol path during implementation.

### 3. Surface the new error code in the MCP and CLI submit paths

In `tools/world-mcp/src/tools/submit-patch-plan.ts` and `tools/world-mcp/src/cli/submit-patch-plan.js` (verify exact paths during implementation; the CLI's compiled-JS path is what skills invoke directly), confirm the `index_stale` error response is passed through unchanged to the caller — no swallowing, no transformation. The error message's recovery instruction (`run 'node tools/world-index/dist/src/cli.js sync <world-slug>'`) is the canonical recovery; the MCP and CLI surfaces should not rewrite it.

### 4. Add unit-test coverage for both branches

Add tests under `tools/patch-engine/tests/` (verify exact path):

- `index_stale` branch: fixture world, direct-Edit a hybrid file (write to disk without running the indexer), submit a patch plan, assert engine returns `code: "index_stale"` with the divergent file in `detail.divergent_files`.
- `validator_failed` branch (unchanged): fixture world, indexed and on-disk in sync, submit a patch plan referencing a file with a real schema violation in the indexed content, assert engine returns `code: "validator_failed"` (not `index_stale`).
- Fresh-index passing branch: fixture world, indexed and on-disk in sync, submit a clean patch plan, assert engine returns success.

### 5. Update skill prose to acknowledge the new error code

In `.claude/skills/character-generation/SKILL.md` Phase 9 step 1's failure-mode discussion (added during the recent audit), add a clause for `index_stale`:

```
On `index_stale`, the engine has detected that the world index has diverged from on-disk content (typically because a direct-Edit to a hybrid-file frontmatter was not followed by an index sync). The error response's `detail.divergent_files[].file_path` names the divergent files. Run `node tools/world-index/dist/src/cli.js sync <world-slug>` to refresh the index, then resubmit the patch plan with the same approval token (no re-sign required as long as the token has not expired).
```

The same prose update propagates to canon-addition, create-base-world, and diegetic-artifact-generation via COMMITGUIDE-001.

### 6. Update HARD-GATE-DISCIPLINE.md

In `docs/HARD-GATE-DISCIPLINE.md`, add `index_stale` to the documented failure-mode list alongside `approval_expired`, `approval_replayed`, `validator_failed`. Note its semantics (index has diverged from disk; `world-index sync` is the recovery; the approval token remains valid because the patch plan content has not changed).

## Files to Touch

- `tools/patch-engine/src/<validation-entry>` (modify — content_hash comparison; verify exact file path during implementation)
- `tools/patch-engine/src/envelope/schema.ts` (modify — add `index_stale` to error-code union)
- `tools/patch-engine/tests/<validation-test>` (modify or new — coverage for both branches; verify exact test path)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (modify if response shape changes; verify pass-through is correct)
- `tools/world-mcp/src/cli/submit-patch-plan.js` (verify pass-through; modify if necessary)
- `.claude/skills/character-generation/SKILL.md` (modify — Phase 9 step 1 failure-mode discussion adds `index_stale`)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — failure-mode list adds `index_stale`)

The COMMITGUIDE-001 ticket handles propagation to canon-addition / create-base-world / diegetic-artifact-generation skill prose; this ticket's §Files to Touch is the engine + character-generation skill. The two tickets are co-released.

## Out of Scope

- Auto-sync on stale-index detection. This ticket commits to fail-loud, not auto-recovery. Auto-sync introduces lock-ordering questions (the engine's per-world write lock vs the indexer's write lock) and obscures the operator's mental model of canonical state. A future ticket can add auto-sync as an opt-in flag if operator demand surfaces.
- Detecting stale-index conditions outside the patch engine (e.g., in `get_record`, `get_context_packet`, other read tools). Read tools serve from the index by design; if the index is stale, reads return stale content but no validation is at stake. The fail-loud signal belongs at the validation gate.
- Computing on-disk content_hash for every file in the world on every submit. The check is scoped to files referenced by the patch plan + files the validators read from. World-wide divergence detection is the indexer's `verify` command (`tools/world-index/dist/src/cli.js verify <world-slug>`); this ticket reuses the per-file primitive, not the world-wide scan.
- Repairing `validator_failed`'s pre-existing under-specification of which file carries the violation. The current validator response already names `detail.verdicts[].location.file`; this ticket builds on that schema.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test confirms `index_stale` is returned when on-disk file content_hash diverges from the indexed content_hash for a file in the validation scope.
2. New unit test confirms `validator_failed` (not `index_stale`) is returned when on-disk and indexed content match and the validation legitimately fails.
3. New unit test confirms a fresh-index passing case returns success.
4. `cd tools/patch-engine && npm test` passes the full suite.
5. `cd tools/world-mcp && npm test` passes the full suite (no regression in MCP submit-path pass-through).
6. The character-generation Phase 9 commit-step prose includes `index_stale` in the failure-mode discussion.

### Invariants

1. The world index remains the canonical state for pre-apply validation. On-disk content is consulted only to detect divergence, not as an alternative validation source.
2. The fail-loud signal (`index_stale`) does not silently auto-recover. The operator must explicitly run `world-index sync` before resubmission.
3. Existing `validator_failed` callers continue to work — `index_stale` is a peer code, not a replacement.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/<engine-validation-test>` — three branches: stale-index returns `index_stale`; fresh-index with real violation returns `validator_failed`; fresh-index clean returns success.
2. None for skill-prose update (documentation-only; verification is grep below).

### Commands

1. `cd tools/patch-engine && npm test` — engine-side proof.
2. `cd tools/world-mcp && npm test` — MCP / CLI submit-path regression proof.
3. `rg -n "index_stale" tools/patch-engine/src tools/world-mcp/src docs/HARD-GATE-DISCIPLINE.md .claude/skills/character-generation/SKILL.md` — confirms the new code lands in all required surfaces.
4. Manual operational verification: in a test world, edit a hybrid file directly, submit a patch plan, observe `index_stale` error; run `node tools/world-index/dist/src/cli.js sync <world-slug>`; resubmit, observe success.
