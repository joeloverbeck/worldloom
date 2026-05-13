# BSBOOT-031: Repair red-bunny PG-1 hash placeholders after validator tightening

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-bundle world-content repair through patch-engine record updates plus direct receipt artifact truthing.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`; `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`

## Problem

At intake, `VALENH-016` had made placeholder PG hashes structurally invalid, and the local gitignored story bundle still contained those placeholders in `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml`:

- `plan.plan_hash: PLACEHOLDER_TO_BE_COMPUTED`
- `state_hash: PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE`

The prose receipt at `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` also recorded `state_hash_at_plan_time: PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE` and noted the placeholder drift. This ticket owned repairing that local content using the canonical writer-side hash procedure defined by `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`.

## Assumption Reassessment (2026-05-13)

1. `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` exists in the current checkout and is gitignored by `.gitignore:144` via `worlds/*`. Direct `git status` is not exhaustive proof for this file.
2. At intake, the PG record contained the two placeholder hash strings named above. `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` contained a computed `plan_hash` but still recorded placeholder state hash evidence.
3. `docs/FOUNDATIONS.md` §Story Bundles §4 says story-bundle `_source/<class>/*.yaml` writes route through patch-engine story-bundle record ops, not direct edits. The receipt file is a direct-write artifact, not an atomic `_source/*.yaml` record.
4. Cross-artifact boundary: the PG record and its prose receipt must agree on the final plan/state hashes so `branching-story-prose-attach` drift evidence does not keep reporting a resolved bootstrap placeholder as current drift.
5. Dependency boundary: `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md` now defines the canonical byte/serialization procedure this repair must use rather than inventing one ad hoc.
6. Reassessment correction: the receipt's pre-existing `plan_hash` (`aa612646f6050f5fccaeeb65218273c52a74e71bd27bce7bc310d2d7ec3d4aae`) did not match the current `pages-prose-plans/PG-1.md` bytes. This ticket therefore also owns aligning the receipt `plan_hash` to the recomputed BSBOOT-030 value.

## Architecture Check

1. Repairing the existing content through the patch-engine record-update path preserves the story-bundle write discipline while allowing the validator-tightened schema to expose old bad data honestly.
2. No compatibility shim is introduced. The existing PG record is brought to the new contract rather than teaching validators to accept the old placeholders.

## Verification Layers

1. Placeholder removal -> grep-proof over the exact PG record and receipt paths for `PLACEHOLDER_TO_BE_COMPUTED`.
2. PG schema compliance -> run the validators structural proof or a focused `validate_patch_plan`/record-schema-compliance check that exercises `story-page.schema.json` against the repaired PG record.
3. Receipt consistency -> manual review that `pages-prose-receipts/PG-1.yaml` records the same final plan/state hash values or clearly historicalizes prior drift notes.
4. Write discipline -> manual review that `_source/pages/PG-1.yaml` was changed through patch-engine story-bundle record update operations, not direct editing.

## Landed Changes

### 1. Computed canonical hashes using BSBOOT-030's procedure

Computed the final `plan_hash` from the exact UTF-8 bytes of `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md`:

- `c58469f6a87562fb9fcd8b8a5f31e62c03b599c3761c7ed8f2ebbf9564e7f5ce`

Computed the final `state_hash` from the deterministic canonical JSON PG state payload, after setting `plan.plan_hash` and excluding only `state_hash` and `rendered_prose`:

- `d5acd5708675880e96d56b52a137f945d2681c913a82bed06f3c18a324b639ae`

### 2. Updated the PG record through the engine route

Submitted `/tmp/bsboot-031-red-bunny-pg1-hash-repair.json` through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js`, `node tools/world-mcp/dist/src/cli/sign-approval-token.js`, and `node tools/world-mcp/dist/src/cli/submit-patch-plan.js` after explicit user approval. The patch-engine receipt wrote `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` with:

- `plan.plan_hash: c58469f6a87562fb9fcd8b8a5f31e62c03b599c3761c7ed8f2ebbf9564e7f5ce`
- `state_hash: d5acd5708675880e96d56b52a137f945d2681c913a82bed06f3c18a324b639ae`

The `_source` record was not direct-edited.

### 3. Truthed the prose receipt artifact

Direct-edited `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` after the patch-engine submit to record the same `plan_hash` / `state_hash_at_plan_time` values and historicalize the placeholder-drift notes. The receipt's unrelated prose-quality warnings remain as current receipt evidence.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` (modify through patch engine)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` (modify)

## Out of Scope

- Changing validators; completed by `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`.
- Defining the canonical hash algorithm; owned by `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`.
- Re-bootstrap of the entire `red-bunny` story bundle unless reassessment proves field-level repair cannot be made truthful.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "PLACEHOLDER_TO_BE_COMPUTED" worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` returns no matches.
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` confirms repaired `PG-1.yaml` satisfies `story-page.schema.json` for `plan.plan_hash` and `state_hash`.
3. Manual review confirms the `_source` record update used the patch-engine route required by `docs/FOUNDATIONS.md` §Story Bundles §4.

### Invariants

1. No story-bundle `_source` YAML is direct-edited.
2. The repaired PG hash values are deterministic outputs of the BSBOOT-030 procedure.

## Test Plan

### New/Modified Tests

1. `None — local gitignored world-content repair; verification is command/manual-review based.`

### Commands

1. `rg -n "PLACEHOLDER_TO_BE_COMPUTED" worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`
2. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/bsboot-031-red-bunny-pg1-hash-repair.json`
3. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/bsboot-031-red-bunny-pg1-hash-repair.json /tmp/bsboot-031-token.txt`
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`

## Outcome

Completed: 2026-05-13.

`worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` now carries deterministic BSBOOT-030 hash values for `plan.plan_hash` and `state_hash`. The record was updated through the patch-engine submit path after explicit approval, not by direct edit. `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` now records matching final hash values and treats the old placeholder drift as historical repair evidence.

## Verification Result

1. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/bsboot-031-red-bunny-pg1-hash-repair.json` — passed before approval/submission; `record_schema_compliance`, `rule6_no_silent_retcons`, `rule7_mystery_reserve_preservation`, and `id_allocation_race` all passed.
2. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/bsboot-031-red-bunny-pg1-hash-repair.json /tmp/bsboot-031-token.txt` — passed after explicit user approval; patch receipt wrote `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` with prior hash `4f35faba3db0861f12b35c975adc599461991784346e7ae5564382dcb7ec59f7` and new hash `a27ab891ebe2051ef9f08ecddefb8182b0a30217d94ef9b536f22d826b76227e`.
3. `rg -n "PLACEHOLDER_TO_BE_COMPUTED" worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` — returned no matches.
4. Direct hash recomputation probe — passed; `PG.plan.plan_hash` matches the sha256 of `pages-prose-plans/PG-1.md`, and `PG.state_hash` matches the deterministic canonical JSON state payload hash.
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural --story red-bunny` — passed; 6 validators run, 3 skipped, 0 fail / 0 warn / 0 info.
6. Manual review against `docs/FOUNDATIONS.md` §Story Bundles and `docs/HARD-GATE-DISCIPLINE.md` — passed; `_source/pages/PG-1.yaml` was mutated through patch-engine submit, while `pages-prose-receipts/PG-1.yaml` remained a direct-write receipt artifact.

## Deviations

- The drafted `cd tools/validators && npm run build` producer step was not rerun because no validator source changed and the needed compiled CLI artifact already existed. The accepted structural proof used the existing `tools/validators/dist/src/cli/world-validate.js` artifact.
- Patch-engine submit refreshed `worlds/erotica-world/_index/` and emitted a pre-existing skipped-record warning for `_source/change-log/CH-0006.yaml` (`missing_id_field`). The submitted PG repair validators still passed with zero verdicts. Post-ticket review created `tickets/EROTICA-001-repair-ch-0006-change-log-schema.md` for that separate world-content schema/indexing repair.
