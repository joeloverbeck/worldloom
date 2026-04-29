# ENGINESYNC-001: Detect stale-index condition during pre-apply validation and emit `index_stale` error

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — `tools/patch-engine/src/apply.ts` pre-apply validator path now compares on-disk hybrid-file content hashes against `file_versions.content_hash` before invoking injected validators; `index_stale` is present in the engine error-code surface; `tools/world-mcp/src/tools/submit-patch-plan.ts` and `tools/world-mcp/src/cli/submit-patch-plan.ts` were verified as generic pass-through surfaces and did not require source edits; skill-side prose updates in `character-generation` document the new failure mode and recommend `world-index sync` as the canonical recovery. COMMITGUIDE-001 remains the sibling-skill propagation owner.
**Deps**: COMMITGUIDE-001 should land in the same release as the engine change so sibling skills' commit guidance is updated alongside the new error code (engine change is the producer; skill prose is the consumer). MCPENH-003 and MCPENH-004 are independent.

## Problem

During the 2026-04-28 CHAR-0004 (Rill) character-generation run, the engine submit path failed twice with an identical-looking `validator_failed` error before succeeding. The first failure was a real pre-existing schema violation in `worlds/animalia/diegetic-artifacts/namahan-at-the-third-gate.md` (DA-0003, `canon_facts_accessible` field encoded as a free-form string instead of the schema's `array | null`). The user authorized a direct-Edit to fix the unrelated file. The second failure on resubmit was IDENTICAL — same field, same path, same three verdicts. The on-disk file was now schema-conformant, but the engine's pre-apply `record_schema_compliance` validator runs against the indexed world state, not on-disk content. The world index was stale because the direct-Edit had not been followed by `node tools/world-index/dist/src/cli.js sync animalia`. After running the sync command manually, the resubmit succeeded.

The friction has three parts:

1. **Discovery cost**: I had to figure out that the engine validates against the index, not the disk. The skill's commit step did not document this (the recent character-generation audit added the index-sync requirement, but the engine itself emitted no signal that the index was the source of disagreement).
2. **Misleading error**: The second `validator_failed` returned exactly the same verdicts as the first. A reasonable interpretation of identical errors is "your fix didn't work" — leading the operator to either re-edit the file (introducing further drift) or escalate back to the user when the actual fix had landed and only the index was stale.
3. **Manual recovery**: `world-index sync <world-slug>` is a one-liner, but the engine could detect the stale-index condition cheaply (compare on-disk file mtime/content_hash against indexed content_hash before running file-content-dependent validators) and either auto-sync or fail-loud with a distinct error code.

This ticket commits to fail-loud with a distinct `index_stale` error code rather than auto-sync. Auto-sync hides the staleness from the operator and the audit trail; fail-loud makes the index's role as canonical state explicit.

## Assumption Reassessment (2026-04-29)

1. The pre-apply validation pipeline runs through `tools/patch-engine/src/apply.ts::submitPatchPlanImpl`. `tools/world-mcp/src/tools/submit-patch-plan.ts` injects the validator callback by calling `@worldloom/validators::validatePatchPlan`, whose `tools/validators/src/_helpers/index-access.ts::buildPreApplyReadSurface` reads indexed rows and overlays the submitted patch plan. The stale-index guard therefore belongs in patch-engine before the injected validator runs.
2. The world index is built by `tools/world-index/dist/src/cli.js` (`build` for full rebuild; `sync` for incremental sync). The sync command updates indexed records to match on-disk content. Verified by running `node tools/world-index/dist/src/cli.js sync animalia` during the Rill session and observing the resubmit succeed against an unchanged disk state.
3. Each indexed disk-backed file row in `_index/world.db` carries a `file_versions.content_hash`; hybrid markdown files use the raw file hash emitted by `tools/world-index/src/commands/shared.ts::parseWorldFile`. The landed guard compares that row against `@worldloom/world-index/hash/content::sha256Hex(readFileSync(...))` for schema-validated hybrid files under `characters/`, `diegetic-artifacts/`, and `adjudications/`.
4. The engine response shape is documented at `tools/patch-engine/src/envelope/schema.ts` and surfaced by `tools/patch-engine/src/apply.ts::EngineError`. The current failure modes (per `docs/HARD-GATE-DISCIPLINE.md` and the engine's actual return shapes during the Rill run) include `approval_expired`, `approval_replayed`, `validator_failed`, `id_allocation_race`, `envelope_shape_invalid`, `invalid_input`. Adding `index_stale` is an additive new error code; existing callers that match on the existing codes continue to work.
5. Cross-tool boundary under audit: the contract between the world-index `file_versions` table (indexer side), the patch engine (pre-apply gate), and validator consumers of indexed state. Shared mutable state: the indexed `world.db`. Pre-fix, when on-disk hybrid files diverged from the index because of a direct-Edit not followed by sync, the engine's validators could report the indexed content's violations as if they were on-disk violations — a category-of-truth confusion the operator had to untangle manually.
6. FOUNDATIONS principle motivating this ticket: §Tooling Recommendation. The world index is the canonical retrieval surface; the engine's pre-apply validation against the index is the correct architectural choice. The fix preserves that — does NOT pivot to disk-based validation — and instead surfaces the index-canonical-state discipline explicitly when on-disk content has diverged. FOUNDATIONS Rule 6 (No Silent Retcons) is adjacent: silent stale-index recoveries (auto-sync) would technically work but would obscure the operator's mental model of when the index is authoritative.
7. HARD-GATE / canon-write ordering: not weakened. The fail-loud `index_stale` response halts the submit before any write; the operator must explicitly re-sync the index and resubmit. This is the same discipline as `approval_expired` (the operator must re-sign and resubmit). No HARD-GATE bypass is introduced; no Mystery Reserve firewall is touched.
8. Schema extension: additive new peer error code on the existing engine error response. Existing callers parsing the error response continue to work; new callers can match on `index_stale` to surface the recovery instruction without re-running the full validator.
9. Adjacent contradiction surfaced during reassessment: the recent character-generation audit added skill-side guidance (`SKILL.md` Phase 9 step 1) recommending manual `world-index sync` after direct-Edits to schema-validated hybrid frontmatter. After this ticket lands, that skill prose remains valid as a discipline (the operator should still expect to run the sync command), but the engine response will now signal `index_stale` explicitly when the operator forgets — making the skill prose the canonical happy-path documentation and the engine signal the safety net. COMMITGUIDE-001 propagates the same skill prose to sibling engine-submitting skills. The two tickets are complementary — engine-side detection + skill-side discipline — and should land in the same release.
10. Pipeline-wide grep for current `validator_failed` consumers showed hits in the engine's error-response definition, in `docs/HARD-GATE-DISCIPLINE.md`, and in `.claude/skills/character-generation/SKILL.md` (after the recent audit). The active ticket updated the engine/doc/character-generation surfaces. `tools/world-mcp/src/tools/submit-patch-plan.ts` and `tools/world-mcp/src/cli/submit-patch-plan.ts` already pass through any engine object carrying a `code` field; the `cd tools/world-mcp && npm test` proof exercised those generic pass-through paths without requiring source edits.
11. Scope correction: the draft mentioned patch-plan files plus validator-read files. The live validator read surface is the indexed world plus patch-plan overlay, but the actual stale-index confusion came from schema-validated hybrid frontmatter. The landed guard therefore checks every indexed hybrid file under `characters/`, `diegetic-artifacts/`, and `adjudications/` before validators run. It does not check atomic `_source/*.yaml` rows, because those rows use parser/canonicalized hashes and are already protected by direct-edit gate discipline plus op-level expected content hashes.

## Architecture Check

1. Fail-loud (`index_stale` error code) is cleaner than auto-sync because it preserves the operator's mental model: the world index IS canonical state for validation, and divergence between on-disk and indexed content is an explicit operator-visible event, not a silent recovery. Auto-sync would also race with the locked write-lock the engine takes during submission — it is implementable but introduces ordering questions that are absent from the fail-loud path.
2. Per-file content_hash comparison before invoking file-content-dependent validators is the smallest possible signal-correctness improvement. Other file metadata (mtime, size) are heuristics that can drift; content_hash is exact. The world index already stores content_hash per row; computing the on-disk content_hash on the validation path adds one file-read + one hash-compute per file in the validation scope. This is cheap relative to the validator pass itself.
3. No backwards-compatibility shims. The new error code is additive. Callers that don't match on it continue to see the existing `validator_failed` codepath when the index is fresh.

## Verification Layers

1. The engine emits `index_stale` when on-disk hybrid-file content_hash diverges from indexed `file_versions.content_hash`, and emits `validator_failed` (not `index_stale`) when index and disk agree → `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` covers both branches.
2. The `index_stale` error response carries the divergent file paths and the recovery instruction (`run 'node tools/world-index/dist/src/cli.js sync <world-slug>' before resubmitting`) → schema validation in test.
3. Existing `validator_failed` consumers (skills, CLI submit path, MCP submit tool) continue to work unchanged when the index is fresh → patch-engine regression test confirms fresh-index validation still returns `validator_failed`; `cd tools/world-mcp && npm test` confirms MCP and CLI submit-path error pass-through remains unchanged.
4. The character-generation skill's Phase 9 commit step references the new `index_stale` error code alongside the existing `validator_failed` / `approval_expired` / `approval_replayed` failure modes → manual review of `.claude/skills/character-generation/SKILL.md`. COMMITGUIDE-001 remains the sibling-skill propagation owner.
5. FOUNDATIONS alignment — preserves the world index as canonical validation state; surfaces stale-index condition explicitly rather than silently auto-recovering → FOUNDATIONS alignment check (Tooling Recommendation; Rule 6 No Silent Retcons adjacency).

## What to Change

### 1. Pre-validation content_hash comparison

In the patch engine's pre-apply validation entry point, `tools/patch-engine/src/apply.ts::submitPatchPlanImpl`:

- Before invoking injected pre-apply validators, iterate the indexed schema-validated hybrid files under `characters/`, `diegetic-artifacts/`, and `adjudications/`.
- For each file, compute the on-disk content_hash using `@worldloom/world-index/hash/content::sha256Hex`.
- Compare against the indexed `file_versions.content_hash` row.
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

In `tools/patch-engine/src/envelope/schema.ts`, add `index_stale` to the engine error-code union consumed by `tools/patch-engine/src/apply.ts`.

### 3. Surface the new error code in the MCP and CLI submit paths

In `tools/world-mcp/src/tools/submit-patch-plan.ts` and `tools/world-mcp/src/cli/submit-patch-plan.ts`, the `index_stale` error response is passed through unchanged by the existing generic engine-error path — no swallowing, no transformation. The error message's recovery instruction (`run 'node tools/world-index/dist/src/cli.js sync <world-slug>'`) is the canonical recovery; the MCP and CLI surfaces do not rewrite it.

### 4. Add unit-test coverage for both branches

Add tests under `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts`:

- `index_stale` branch: fixture world, direct-Edit a hybrid file (write to disk without updating `file_versions`), submit a patch plan, assert engine returns `code: "index_stale"` with the divergent file in `detail.divergent_files`, and assert validators did not run.
- `validator_failed` branch (unchanged): fixture world, indexed and on-disk in sync, submit a patch plan whose injected validator fails, assert engine returns `code: "validator_failed"` (not `index_stale`).
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

- `tools/patch-engine/src/apply.ts` (modify — content_hash comparison before injected pre-apply validators run)
- `tools/patch-engine/src/envelope/schema.ts` (modify — add `index_stale` to error-code union)
- `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` (new — coverage for stale, fresh validator-failed, and fresh success branches)
- `tools/world-mcp/src/tools/submit-patch-plan.ts` (verified pass-through; no source edit required)
- `tools/world-mcp/src/cli/submit-patch-plan.ts` (verified pass-through; no source edit required)
- `.claude/skills/character-generation/SKILL.md` (modify — Phase 9 step 1 failure-mode discussion adds `index_stale`)
- `docs/HARD-GATE-DISCIPLINE.md` (modify — failure-mode list adds `index_stale`)

The COMMITGUIDE-001 ticket handles propagation to canon-addition / create-base-world / diegetic-artifact-generation skill prose; this ticket's §Files to Touch is the engine + character-generation skill. The two tickets should be released together when the sibling-skill propagation lands.

## Out of Scope

- Auto-sync on stale-index detection. This ticket commits to fail-loud, not auto-recovery. Auto-sync introduces lock-ordering questions (the engine's per-world write lock vs the indexer's write lock) and obscures the operator's mental model of canonical state. A future ticket can add auto-sync as an opt-in flag if operator demand surfaces.
- Detecting stale-index conditions outside the patch engine (e.g., in `get_record`, `get_context_packet`, other read tools). Read tools serve from the index by design; if the index is stale, reads return stale content but no validation is at stake. The fail-loud signal belongs at the validation gate.
- Computing on-disk content_hash for every file in the world on every submit. The landed check is scoped to schema-validated hybrid files that can create the observed `record_schema_compliance` truth-confusion. World-wide divergence detection remains the indexer's `verify` command (`tools/world-index/dist/src/cli.js verify <world-slug>`).
- Repairing `validator_failed`'s pre-existing under-specification of which file carries the violation. The current validator response already names `detail.verdicts[].location.file`; this ticket builds on that schema.

## Acceptance Criteria

### Tests That Must Pass

1. New unit test confirms `index_stale` is returned when on-disk hybrid-file content_hash diverges from the indexed `file_versions.content_hash` before validators run.
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

1. `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts` — three branches: stale-index returns `index_stale`; fresh-index with injected validator failure returns `validator_failed`; fresh-index clean returns success.
2. None for skill-prose update (documentation-only; verification is grep below).

### Commands

1. `cd tools/patch-engine && npm test` — engine-side proof.
2. `cd tools/world-mcp && npm test` — MCP / CLI submit-path regression proof.
3. `rg -n "index_stale" tools/patch-engine/src tools/world-mcp/src docs/HARD-GATE-DISCIPLINE.md .claude/skills/character-generation/SKILL.md` — confirms the new code lands in all required surfaces.
4. Manual operational verification is represented by the temp-world unit test: edit a hybrid file directly, submit a patch plan, observe `index_stale`; with a fresh index, observe validator failure and success branches.

## Outcome

Completed: 2026-04-29.

Implemented fail-loud stale-index detection in `tools/patch-engine/src/apply.ts` before injected pre-apply validators run. The guard checks indexed schema-validated hybrid markdown files (`characters/`, `diegetic-artifacts/`, `adjudications/`) against on-disk content and returns `code: "index_stale"` with `detail.divergent_files[]` and the canonical `world-index sync` recovery instruction before any validator or write runs.

Added `index_stale` to the engine error-code surface in `tools/patch-engine/src/envelope/schema.ts`, added focused branch coverage in `tools/patch-engine/tests/receipt/index-stale-preapply.test.ts`, updated `docs/HARD-GATE-DISCIPLINE.md`, and updated `.claude/skills/character-generation/SKILL.md` Phase 9 failure-mode prose. `tools/world-mcp` required no source edits because the MCP tool and CLI already pass through engine error objects by `code`.

## Verification Result

1. `cd tools/patch-engine && npm test` — passed, 50/50 tests.
2. `cd tools/world-mcp && npm test` — passed, 206/206 tests.
3. `rg -n "index_stale|detectStaleIndex|World index is stale|sync <world-slug>|validator_failed" tools/patch-engine/src tools/patch-engine/tests tools/world-mcp/src tools/world-mcp/README.md tools/patch-engine/README.md docs/HARD-GATE-DISCIPLINE.md .claude/skills/character-generation/SKILL.md` — confirmed the new code/docs/test surface and no required world-mcp source edit.

## Deviations

1. The landed stale check scopes to schema-validated hybrid files rather than all indexed files. Atomic `_source/*.yaml` rows use parser/canonicalized hashes and are protected by direct-edit gate discipline plus op-level expected content hashes; checking them with raw file hashes would create false stale positives.
2. `tools/world-mcp/src/tools/submit-patch-plan.ts` and `tools/world-mcp/src/cli/submit-patch-plan.ts` were not edited. Their existing generic pass-through behavior already carries `index_stale` unchanged, and the world-mcp package suite verified that submit-path contract.
