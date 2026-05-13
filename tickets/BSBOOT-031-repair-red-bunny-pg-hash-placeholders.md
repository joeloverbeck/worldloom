# BSBOOT-031: Repair red-bunny PG-1 hash placeholders after validator tightening

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — story-bundle world-content repair through patch-engine record updates plus direct receipt artifact truthing if still applicable.
**Deps**: `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`; `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`

## Problem

`VALENH-016` made placeholder PG hashes structurally invalid. The local gitignored story bundle still contains those placeholders in `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml`:

- `plan.plan_hash: PLACEHOLDER_TO_BE_COMPUTED`
- `state_hash: PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE`

The prose receipt at `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` also records `state_hash_at_plan_time: PLACEHOLDER_TO_BE_COMPUTED_BY_ENGINE` and notes the placeholder drift. This ticket owns repairing that local content using the canonical writer-side hash procedure defined by `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`.

## Assumption Reassessment (2026-05-13)

1. `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` exists in the current checkout and is gitignored by `.gitignore:144` via `worlds/*`. Direct `git status` is not exhaustive proof for this file.
2. The PG record contains the two placeholder hash strings named above. `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` contains a computed `plan_hash` but still records placeholder state hash evidence.
3. `docs/FOUNDATIONS.md` §Story Bundles §4 says story-bundle `_source/<class>/*.yaml` writes route through patch-engine story-bundle record ops, not direct edits. The receipt file is a direct-write artifact, not an atomic `_source/*.yaml` record.
4. Cross-artifact boundary: the PG record and its prose receipt must agree on the final plan/state hashes so `branching-story-prose-attach` drift evidence does not keep reporting a resolved bootstrap placeholder as current drift.
5. Dependency boundary: `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md` now defines the canonical byte/serialization procedure this repair must use rather than inventing one ad hoc.

## Architecture Check

1. Repairing the existing content through the patch-engine record-update path preserves the story-bundle write discipline while allowing the validator-tightened schema to expose old bad data honestly.
2. No compatibility shim is introduced. The existing PG record is brought to the new contract rather than teaching validators to accept the old placeholders.

## Verification Layers

1. Placeholder removal -> grep-proof over the exact PG record and receipt paths for `PLACEHOLDER_TO_BE_COMPUTED`.
2. PG schema compliance -> run the validators structural proof or a focused `validate_patch_plan`/record-schema-compliance check that exercises `story-page.schema.json` against the repaired PG record.
3. Receipt consistency -> manual review that `pages-prose-receipts/PG-1.yaml` records the same final plan/state hash values or clearly historicalizes prior drift notes.
4. Write discipline -> manual review that `_source/pages/PG-1.yaml` was changed through patch-engine story-bundle record update operations, not direct editing.

## What to Change

### 1. Compute canonical hashes using BSBOOT-030's procedure

Compute the final `plan_hash` from `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-1.md` and the final `state_hash` from the canonical PG state payload using the procedure landed by `BSBOOT-030`.

### 2. Update the PG record through the engine route

Use the patch-engine story-bundle record update path to update:

- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` `plan.plan_hash`
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` `state_hash`

Do not direct-edit this `_source` record.

### 3. Truth the prose receipt artifact if needed

If `pages-prose-receipts/PG-1.yaml` still carries placeholder drift as current evidence after the PG record is repaired, direct-edit the receipt artifact to record the final state hash and historicalize or remove placeholder-drift notes as appropriate.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml` (modify through patch engine)
- `worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` (modify if receipt truthing is still needed)

## Out of Scope

- Changing validators; completed by `archive/tickets/VALENH-016-enforce-pg-plan-hash-and-state-hash-sha256.md`.
- Defining the canonical hash algorithm; owned by `archive/tickets/BSBOOT-030-define-pg-hash-computation-contract.md`.
- Re-bootstrap of the entire `red-bunny` story bundle unless reassessment proves field-level repair cannot be made truthful.

## Acceptance Criteria

### Tests That Must Pass

1. `rg -n "PLACEHOLDER_TO_BE_COMPUTED" worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml` returns no current placeholder evidence, or only explicitly historicalized receipt notes if those are intentionally preserved.
2. A focused schema-validation proof confirms repaired `PG-1.yaml` satisfies `story-page.schema.json` for `plan.plan_hash` and `state_hash`.
3. Manual review confirms the `_source` record update used the patch-engine route required by `docs/FOUNDATIONS.md` §Story Bundles §4.

### Invariants

1. No story-bundle `_source` YAML is direct-edited.
2. The repaired PG hash values are deterministic outputs of the BSBOOT-030 procedure.

## Test Plan

### New/Modified Tests

1. `None — local gitignored world-content repair; verification is command/manual-review based.`

### Commands

1. `rg -n "PLACEHOLDER_TO_BE_COMPUTED" worlds/erotica-world/stories/red-bunny/_source/pages/PG-1.yaml worlds/erotica-world/stories/red-bunny/pages-prose-receipts/PG-1.yaml`
2. `cd tools/validators && npm run build`
3. `cd tools/validators && node dist/src/cli/world-validate.js erotica-world --structural --story red-bunny`
