# EROTICA-003: Repair red-bunny SE-7 soft-alias workaround after STVALIDATOR-001

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — engine-routed local story-bundle content repair for `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml`, `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml`, and refreshed derived index state.
**Deps**: `archive/tickets/STVALIDATOR-001.md`

## Problem

`archive/tickets/STVALIDATOR-001.md` fixed `chc_slt_selected_commitment_trace.alias_binding_missing` so an unmatched soft existential precondition no longer requires a semantically false `SE.commitment.alias_bindings` entry unless the alias is referenced downstream by `bound:<alias>`.

The local `red-bunny` story bundle still carries the old workaround:

- `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` binds `attention_edge: SREL-7`.
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml` `validation_trace.plan_grounding` and `validation_trace.turn_driver_lawfulness` both explain that `attention_edge` was bound to SREL-7 only to satisfy the former alias-binding completeness behavior, even though the soft axis filter did not match.

After STVALIDATOR-001, that binding and rationale are no longer required and now preserve a known-false audit trail. The repair should remove the workaround while preserving the real selected hard bindings and the rest of PG-7's validation trace.

## Assumption Reassessment (2026-05-27)

1. Codebase: `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` now exempts missing soft existential aliases when the alias is not referenced downstream; `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` includes the SLT-42-shaped regression fixture.
2. Docs/contract: `.claude/skills/_shared-templates/story-state-contract.md` §5 now states that unmatched soft preconditions do not require `commitment.alias_bindings` unless an effect or exit-preview `bound:<alias>` reference depends on the binding.
3. Shared boundary under audit: this is local story-bundle content repair exposed by a validator package change. STVALIDATOR-001 owns validator behavior; this ticket owns only normalizing the local `red-bunny` records and derived index state.
4. FOUNDATIONS / HARD-GATE principle: story-bundle `_source/<class>/*.yaml` records are engine-only surfaces per `AGENTS.md` and `docs/HARD-GATE-DISCIPLINE.md`; this repair must use patch-engine validation/submission or an explicitly documented user override.
5. Live evidence: targeted review grep found `attention_edge: SREL-7` in `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` and obsolete validator-workaround rationale in PG-7 `validation_trace.plan_grounding` / `validation_trace.turn_driver_lawfulness`.
6. Adjacent contradiction: none in validator code. Remaining work is data normalization plus derived index refresh after the engine-routed repair.

## Architecture Check

1. Cleaner than alternatives: remove the now-obsolete binding and update the validation trace through the same story-bundle content route, rather than weakening the validator or preserving a false SREL match as historical convenience.
2. No backwards-compatibility aliasing/shims introduced. The bundle is brought forward to the current alias-binding contract.

## Verification Layers

1. `SE-7.commitment.alias_bindings` no longer includes `attention_edge` -> direct post-repair record review.
2. PG-7 validation trace no longer claims `attention_edge=SREL-7` was needed for `chc_slt_selected_commitment_trace` -> direct post-repair record review.
3. `chc_slt_selected_commitment_trace` accepts the cleaned local bundle under the current validator -> `world-validate` structural/full-world proof after index refresh.
4. Story-bundle write discipline is preserved -> patch-engine receipt or explicit user override recorded in closeout.

## What to Change

### 1. Remove the stale SE-7 alias binding

Through the patch engine, update `SE-7.commitment.alias_bindings` so it retains the real matched hard aliases and removes `attention_edge`.

### 2. Truth PG-7 validation trace prose

Through the patch engine, update PG-7 `validation_trace.plan_grounding` and `validation_trace.turn_driver_lawfulness` to stop claiming that `attention_edge=SREL-7` was a required alias-binding completeness workaround. Preserve the rest of each rationale.

### 3. Refresh derived index state

After the engine writes land, sync or rebuild the derived `erotica-world` index so validators read the repaired records.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` (engine-routed modify)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml` (engine-routed modify)
- `worlds/erotica-world/_index/` (refresh derived ignored artifact)

## Out of Scope

- Validator code, tests, schemas, and shared contract prose; completed by `archive/tickets/STVALIDATOR-001.md`.
- Rewriting the fiction or changing SE-7 state deltas beyond removing the obsolete soft-alias workaround.
- Direct `_source` edits unless the user explicitly chooses and records a deviation from patch-engine discipline.

## Acceptance Criteria

### Tests That Must Pass

1. Direct review confirms `SE-7.commitment.alias_bindings` omits `attention_edge` while preserving the real selected hard aliases.
2. Direct review confirms PG-7 validation trace prose no longer states or implies `attention_edge=SREL-7` was required to satisfy alias-binding completeness.
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` exits with no `chc_slt_selected_commitment_trace.alias_binding_missing` failure for SE-7.

### Invariants

1. Story-bundle `_source` records are repaired through patch-engine validation/submission unless the user explicitly records a direct-edit override.
2. The repaired bundle does not invent a replacement binding for an unmatched advisory-only soft predicate.

## Test Plan

### New/Modified Tests

1. `None — local story-bundle content repair; verification is command/manual-review based and validator behavior is already covered by STVALIDATOR-001.`

### Commands

1. `node tools/world-index/dist/src/cli.js sync erotica-world`
2. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json`
