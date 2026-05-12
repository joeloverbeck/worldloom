# VALENH-009: Validators recognize plan-commit-vs-finalize field-stamping authority

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — `tools/validators/src/structural/snapshot-replay-equality.ts` (modify), `tools/validators/src/rules/narrative_point_classification.ts` (modify); unit and integration coverage under `tools/validators/tests/`; skill-prose link from `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md`
**Deps**: `archive/tickets/PROSESPLIT-005.md` (finalize stamps `arc_trace_emitted` / `arc_trace_id`), `archive/tickets/PROSESPLIT-007.md` (page-cycle plan-commit always emits `prose_status: pending`, `arc_trace_emitted: false`), `archive/tickets/VALENH-003-snapshot-replay-equality-structural-validator.md` (snapshot-replay validator that this ticket extends)

## Problem

At intake, `branching-story-page-cycle` Phase 11 commits hit a three-validator deadlock that had no resolution from the skill side. The failure was reproduced on `--world_slug erotica-world --story_slug red-bunny --parent_page_id PG-0001 --chosen_choice_id CHC-0002`:

- `snapshot_replay_equality` (`tools/validators/src/structural/snapshot-replay-equality.ts`) flagged `applied_effect_variant`, `arc_trace_emitted`, and `arc_trace_id` as `snapshot_drift` because `tools/validators/src/_helpers/state-snapshot-replay.ts`'s op_type switch has no op for stamping those three fields. Replay therefore copies the parent's `null/false/null` forward unchanged; any non-null value on the new PG drifts.
- `effect_model_replay_safety` (`tools/validators/src/rules/effect_model_replay_safety.ts:76-84`) required `state_snapshot.applied_effect_variant` to be a non-empty string for any non-PG-0001 page, since it cross-checks the variant id against the realized arc's `effect_model.variants[].id`.
- `narrative_point_classification` (`tools/validators/src/rules/narrative_point_classification.ts:88-99`) required an `ARC_TRACE` record to exist for every non-PG-0001 page whose classification is `NATURAL_COMMITMENT_HINGE` / `INTERRUPT_HINGE` / `CONTINUE_ONLY_PAUSE`, with only PG-0001 special-cased.

Before this ticket, no PG state_snapshot configuration satisfied all three: populating the three fields failed `snapshot_replay_equality`; nulling them failed `effect_model_replay_safety`. Emitting an ARC_TRACE at plan-commit to pass `narrative_point_classification` collided with the `archive/tickets/PROSESPLIT-005.md` contract that finalize is the only ARCTRACE emitter, and re-introduced the first two failures via the populated `arc_trace_id` field.

The fixed gap was in the validators' coverage of the post-SPEC-23 plan+finalize pipeline shape that `docs/FOUNDATIONS.md` §Story Bundles "Pipeline shape: plan + finalize" commits. The validators were authored before that split (VALENH-003 landed `snapshot_replay_equality` in the pre-PROSESPLIT pipeline) and did not model:

1. That `applied_effect_variant` is stamped by `branching-story-page-cycle` Phase 4b on PG state_snapshot, not by replay-traceable SE.ops.
2. That `arc_trace_emitted` and `arc_trace_id` are stamped by `branching-story-page-prose-finalize` Phase 7 (per PROSESPLIT-005), not at page-cycle plan-commit, where their value is always `false` / `null` per PROSESPLIT-007 line 188.
3. That a PG with `prose_status: "pending"` has not yet reached the finalize phase that emits its ARC_TRACE, so the `narrative_point_classification.missing_arc_trace` check is premature for pending-prose PGs.

The in-session workaround patched both validators in the working tree and rebuilt `dist/` so the page-cycle commit could land. This ticket brought that work into the source/test surface with documentation.

## Assumption Reassessment (2026-05-11)

1. **Codebase reassessment** — The requested shorthand path `tickets/VALENH-009.md` resolved to the live untracked ticket file `tickets/VALENH-009-validators-recognize-plan-finalize-stamped-fields.md`. Initial worktree state already contained same-seam in-session edits to `tools/validators/src/structural/snapshot-replay-equality.ts` and `tools/validators/src/rules/narrative_point_classification.ts`; this ticket preserved those shapes, tightened the `POST_REPLAY_STAMPED_FIELDS` comment to cite PROSESPLIT-005 and FOUNDATIONS, and added tests plus a package-local pre-apply proof. `tools/validators/src/rules/effect_model_replay_safety.ts` retains the requirement that `applied_effect_variant` is a non-empty string for non-root pages.
2. **Doc reassessment** — `docs/FOUNDATIONS.md` §Story Bundles, §4 Write Discipline, "Pipeline shape: plan + finalize" explicitly commits the finalize-emits-ARC_TRACE rule. The page-cycle skill's `references/phase-7-6-arc-trace-extraction.md` and the bootstrap skill's `references/phase-7-root-page-plan.md` carry the same contract. PROSESPLIT-005 (finalize implementation) and PROSESPLIT-007 (page-cycle plan-commit contract) ratify it at ticket scope. The validator layer now recognizes the contract.
3. **Cross-skill boundary** — the shared boundary is `PG.state_snapshot`'s post-replay-stamped-field set + `PG.prose_status` lifecycle. The validators must agree with `branching-story-page-cycle` Phase 4b (variant stamp) and `branching-story-page-prose-finalize` Phase 7 (arc-trace stamp) on which fields are workflow-stamped vs replay-derived. The set is currently three fields (`applied_effect_variant`, `arc_trace_emitted`, `arc_trace_id`); extending the set in the future requires updating `POST_REPLAY_STAMPED_FIELDS` in lockstep.
4. **FOUNDATIONS principle** — FOUNDATIONS §Story Bundles "Pipeline shape: plan + finalize" is the principle under audit. The validators must not reject a state_snapshot configuration that is the documented intermediate state of the pipeline. Before this fix, the FOUNDATIONS contract was unenforceable in practice because the pre-finalize PG could not pass validate-time without contradicting itself.
5. **Schema extension** — the `state_snapshot` shape on `PG` records is extended at the validator-contract level by formalizing which keys are post-replay-stamped (workflow authority) vs replay-derived (engine authority). Consumers of this distinction: `snapshot_replay_equality` (this ticket), `effect_model_replay_safety` (already requires `applied_effect_variant` populated; compatible), `state_snapshot_integrity` (no key-set assumption to revise; compatible). Extension is additive — no existing validator behavior changes for rendered pages or for fields outside `POST_REPLAY_STAMPED_FIELDS`.
6. **Proof boundary correction** — The drafted standalone `node tools/world-mcp/dist/src/cli/validate-patch-plan.js <synthetic-page-cycle-plan>` smoke was replaced by `tools/validators/tests/integration/validate-patch-plan.test.ts` coverage. That test calls the same `validatePatchPlan` handler the CLI delegates to, temp-seeds its own index, and avoids depending on the current gitignored `worlds/erotica-world` state where the originally reproduced PG-0002 is already committed and would make a create-plan collide on id uniqueness.

## Architecture Check

1. **Why this approach is cleaner than alternatives.** The plan+finalize split is FOUNDATIONS canon and the PROSESPLIT-005/006/007 work landed the skill-side contracts. The cleanest engine-side adjustment is to teach the two validators about the contract they did not model, rather than (a) reverting the plan+finalize split — would break PROSESPLIT-005's finalize phase and contradict FOUNDATIONS; (b) extending `state-snapshot-replay.ts` to stamp the three fields from SE record metadata — would require new replay machinery and a new SE field convention for "post-replay stamps," when the simpler exclusion list captures the same invariant; (c) emitting ARC_TRACE with placeholder evidence_spans at page-cycle plan-commit — was tried in-session, passed `narrative_point_classification` but kept failing `snapshot_replay_equality` on `arc_trace_id`, and would collide with finalize's own ARC_TRACE emission per PROSESPLIT-005. The exclusion-list + pending-prose-skip pair is the minimal change that aligns the validator layer with the documented contract.
2. **No backwards-compatibility aliasing/shims introduced.** The change adds a constant exclusion set and a single conditional return; no field aliases, no deprecated paths, no legacy-mode flags. Page records committed before this validator landed continue to validate exactly as before — `applied_effect_variant` / `arc_trace_emitted` / `arc_trace_id` were already populated on already-committed PG records (e.g., PG-0001 has `arc_trace_emitted: false`), and the new behavior simply skips comparing those three keys without changing any other validator logic.

## Verification Layers

1. **Three-validator pipeline allows a `prose_status: "pending"` PG with `applied_effect_variant` populated, `arc_trace_emitted: false`, `arc_trace_id: null`, and no ARC_TRACE record at plan-commit** → unit test in `tools/validators/tests/structural/snapshot-replay-equality.test.ts` exercising the deadlock state from the worked session example, plus package-local pre-apply proof via `node --test dist/tests/integration/validate-patch-plan.test.js`.
2. **A PG that flips `prose_status: "rendered"` without an ARC_TRACE record fails `narrative_point_classification.missing_arc_trace`** → unit test in `tools/validators/tests/rules/narrative_point_classification.test.ts` covering both the pending-skip path and the rendered-without-trace failure path. The pending-skip must not become a hole that lets rendered pages slip through.
3. **A page whose `applied_effect_variant` does not name a real variant on the realized SLT still fails `effect_model_replay_safety.unknown_variant`** → no change to that validator; existing test coverage preserved. Verified by codebase grep-proof on `tools/validators/src/rules/effect_model_replay_safety.ts` and the matching test file.
4. **FOUNDATIONS alignment** → cross-check against `docs/FOUNDATIONS.md` §Story Bundles "Pipeline shape: plan + finalize" via a fresh read.

## Landed Changes

### 1. `snapshot_replay_equality` exclusion list (lands the in-session patch)

`tools/validators/src/structural/snapshot-replay-equality.ts` now has a module-level `POST_REPLAY_STAMPED_FIELDS` (`ReadonlySet<string>`) with members `applied_effect_variant`, `arc_trace_emitted`, `arc_trace_id`. The `snapshotDrifts` helper filters the key list against this set before the JSON comparison, so workflow-stamped fields are not flagged as drift. The comment cites FOUNDATIONS §Story Bundles "Pipeline shape: plan + finalize", PROSESPLIT-005 / finalize Phase 7, and page-cycle Phase 4b.

### 2. `narrative_point_classification` pending-prose skip (lands the in-session patch)

`tools/validators/src/rules/narrative_point_classification.ts` now returns early when `parsedPage.prose_status === "pending"` after enum validation and before ARC_TRACE lookup. The comment cites FOUNDATIONS §Story Bundles "Pipeline shape: plan + finalize" so the skip is anchored to the documented finalize-emission rule. Rendered-status PGs continue to require an ARC_TRACE and fail with `missing_arc_trace` if absent.

### 3. Test coverage

`tools/validators/tests/structural/snapshot-replay-equality.test.ts` now covers the workflow-stamped field exclusion, non-excluded drift preservation, and the sibling `effect_model_replay_safety.missing_applied_effect_variant` guard. `tools/validators/tests/rules/narrative_point_classification.test.ts` now covers pending-prose skip, rendered-without-trace failure, rendered-with-trace pass, and rendered category mismatch failure. `tools/validators/tests/integration/validate-patch-plan.test.ts` now includes a synthetic pending page-cycle pre-apply plan that passes `effect_model_replay_safety`, `narrative_point_classification`, and `snapshot_replay_equality` through the package handler.

### 4. Skill-prose link

`.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` now notes the VALENH-009 drift exclusion under `snapshot_replay_equality` and the pending-prose ARC_TRACE lookup skip under `narrative_point_classification`.

## Files to Touch

- `tools/validators/src/structural/snapshot-replay-equality.ts` (modify; in-session patch already in working tree)
- `tools/validators/src/rules/narrative_point_classification.ts` (modify; in-session patch already in working tree)
- `tools/validators/tests/structural/snapshot-replay-equality.test.ts` (modify)
- `tools/validators/tests/rules/narrative_point_classification.test.ts` (modify)
- `tools/validators/tests/integration/validate-patch-plan.test.ts` (modify)
- `.claude/skills/branching-story-page-cycle/references/phase-9-validation-gates.md` (modify)
- `tickets/VALENH-009-validators-recognize-plan-finalize-stamped-fields.md` (modify)

## Out of Scope

- Extending `state-snapshot-replay.ts` to add new op_types for the three stamped fields. The exclusion-list approach is the documented pipeline shape; reintroducing replayability for workflow-stamped fields would re-couple page-cycle and finalize at the replay layer and contradict PROSESPLIT-005.
- Modifying `effect_model_replay_safety.ts`. Its requirement that `applied_effect_variant` be populated is correct under the new contract — page-cycle Phase 4b stamps it; the exclusion list ensures `snapshot_replay_equality` does not fight that stamp.
- Promoting `narrative_point_classification` from `prose_status: "pending"` to `prose_status: "rendered"` automatically when the ARC_TRACE lands. Finalize Phase 7 already flips `prose_status` to `rendered` and stamps `arc_trace_emitted: true` / `arc_trace_id: ARCTRACE-NNNN` in the same update. The validator does not need to track the transition independently.
- Changes to `branching-story-page-cycle/SKILL.md` Phase 10 deliverable summary or Phase 11 envelope construction. The skill already emits the correct field shapes at plan-commit per PROSESPLIT-007.
- Changes to `branching-story-page-prose-finalize/SKILL.md` Phase 7. Finalize's ARC_TRACE emission and field-flip logic are already correct per PROSESPLIT-005.

## Acceptance Criteria

### Tests That Must Pass

1. `node --test tools/validators/dist/tests/structural/snapshot-replay-equality.test.js` covers the three new cases enumerated under §3.
2. `node --test tools/validators/dist/tests/rules/narrative_point_classification.test.js` covers the four new cases enumerated under §3.
3. `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` includes the synthetic pending page-cycle plan and proves the package handler returns pass executions for `effect_model_replay_safety`, `narrative_point_classification`, and `snapshot_replay_equality` with no fail verdicts.

### Invariants

1. Any PG whose `prose_status: "rendered"` and whose classification ∈ `{NATURAL_COMMITMENT_HINGE, INTERRUPT_HINGE, CONTINUE_ONLY_PAUSE}` continues to require an ARC_TRACE record (either via `state_snapshot.arc_trace_id` lookup or via `tracesByPage` lookup by `created_at_page`). The pending-prose skip MUST NOT become a hole that lets rendered pages bypass the consistency check.
2. Any non-PG-0001 PG whose `state_snapshot.applied_effect_variant` is `null` or a non-existent variant id continues to fail `effect_model_replay_safety`. The exclusion in `snapshot_replay_equality` MUST NOT weaken the variant-required gate.
3. `POST_REPLAY_STAMPED_FIELDS` is the single source of truth for the workflow-stamped-field set; any future field that joins (e.g., a Layer-3 critic verdict stamp at finalize) must be added to the constant explicitly, with a comment-cited reason.
4. The validator behavior is identical to HEAD for every committed PG record predating this change — pre-PROSESPLIT pages have `applied_effect_variant: null` / `arc_trace_emitted: false` / `arc_trace_id: null` matching parent (typically root) which is the pre-exclusion behavior; the exclusion is a no-op on those pages.

## Test Plan

### New/Modified Tests

1. `tools/validators/tests/structural/snapshot-replay-equality.test.ts` — covers (a) deadlock-state pass, (b) non-excluded field drift still detected, (c) `applied_effect_variant` mismatch still caught by sibling validator. Rationale: pins the contract that the exclusion list is exactly three fields and only those three.
2. `tools/validators/tests/rules/narrative_point_classification.test.ts` — covers (a) pending-prose skip, (b) rendered-without-trace fail, (c) rendered-with-correct-trace pass, (d) rendered-with-mismatched-category fail. Rationale: pins that the pending skip does not leak into rendered-status enforcement.
3. `tools/validators/tests/integration/validate-patch-plan.test.ts` — covers the synthetic pending page-cycle pre-apply shape through `validatePatchPlan`.

### Commands

1. `(cd tools/validators && npm run build && npm test)` — package-local build + unit-test suite (rebuilds `dist/` symlinked into `tools/world-mcp/node_modules/@worldloom/validators`, then runs `node --test dist/tests/**/*.test.js`).
2. `node --test dist/tests/integration/validate-patch-plan.test.js` from `tools/validators` — package-local pre-apply integration confirming the three validators pass together on the documented intermediate state without depending on the current live `erotica-world` index.

## Outcome

Completed. The validators package now recognizes the plan-commit vs finalize split: `snapshot_replay_equality` ignores the three workflow-stamped `state_snapshot` fields, while `narrative_point_classification` defers ARC_TRACE lookup only for `prose_status: pending` pages. Rendered pages still require ARC_TRACE evidence, and `effect_model_replay_safety` still rejects missing or invalid `applied_effect_variant` values.

The page-cycle Phase 9 gate prose now points operators at the VALENH-009 behavior for both affected gates. Tests cover the focused validator branches and the synthetic pre-apply package handler surface.

## Verification Result

1. `cd tools/validators && npm run build` — passed.
2. `cd tools/validators && node --test dist/tests/structural/snapshot-replay-equality.test.js dist/tests/rules/narrative_point_classification.test.js dist/tests/rules/effect_model_replay_safety.test.js` — passed, 20/20 tests.
3. `cd tools/validators && node --test dist/tests/integration/validate-patch-plan.test.js dist/tests/structural/snapshot-replay-equality.test.js dist/tests/rules/narrative_point_classification.test.js dist/tests/rules/effect_model_replay_safety.test.js` — passed, 35/35 tests.
4. `cd tools/validators && npm test` — passed, 202/202 tests. Non-fatal output included the standard `git init` default-branch hint from CLI tests.
5. `git add -N tickets/VALENH-009-validators-recognize-plan-finalize-stamped-fields.md && git diff --check -- <owned paths>` — passed; `git reset -- tickets/VALENH-009-validators-recognize-plan-finalize-stamped-fields.md` cleared the hygiene-only intent-to-add entry.

## Deviations

- The originally drafted standalone world-mcp CLI smoke was not used as the final acceptance surface. The live reproduced PG-0002 is already committed in `worlds/erotica-world`, so a create-plan derived from it would now collide on id uniqueness. The replacement proof is the package-local `validatePatchPlan` integration test, which exercises the same validation handler through a temp-seeded index and is portable across checkouts.
