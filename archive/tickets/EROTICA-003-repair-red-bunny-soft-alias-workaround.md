# EROTICA-003: Repair red-bunny SE-7 soft-alias workaround after STVALIDATOR-001

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — engine-routed local story-bundle content repair for `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml`, `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml`, and refreshed derived index state.
**Deps**: `archive/tickets/STVALIDATOR-001.md`

## Problem

`archive/tickets/STVALIDATOR-001.md` fixed `chc_slt_selected_commitment_trace.alias_binding_missing` so an unmatched soft existential precondition no longer requires a semantically false `SE.commitment.alias_bindings` entry unless the alias is referenced downstream by `bound:<alias>`.

At intake, the local `red-bunny` story bundle still carried the old workaround:

- `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` binds `attention_edge: SREL-7`.
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml` `validation_trace.plan_grounding` and `validation_trace.turn_driver_lawfulness` both explain that `attention_edge` was bound to SREL-7 only to satisfy the former alias-binding completeness behavior, even though the soft axis filter did not match.

After STVALIDATOR-001, that binding and rationale were no longer required and preserved a known-false audit trail. This ticket removed the workaround while preserving the real selected hard bindings and the rest of PG-7's validation trace.

## Assumption Reassessment (2026-05-27)

1. Codebase: `tools/validators/src/structural/chc-slt-selected-commitment-trace.ts` now exempts missing soft existential aliases when the alias is not referenced downstream; `tools/validators/tests/structural/chc-slt-selected-commitment-trace.test.ts` includes the SLT-42-shaped regression fixture.
2. Docs/contract: `.claude/skills/_shared-templates/story-state-contract.md` §5 now states that unmatched soft preconditions do not require `commitment.alias_bindings` unless an effect or exit-preview `bound:<alias>` reference depends on the binding.
3. Shared boundary under audit: this is local story-bundle content repair exposed by a validator package change. STVALIDATOR-001 owns validator behavior; this ticket owns only normalizing the local `red-bunny` records and derived index state.
4. FOUNDATIONS / HARD-GATE principle: story-bundle `_source/<class>/*.yaml` records are engine-only surfaces per `AGENTS.md` and `docs/HARD-GATE-DISCIPLINE.md`; this repair used patch-engine validation/submission after explicit user approval.
5. Intake evidence: targeted MCP record review found `attention_edge: SREL-7` in `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` and obsolete validator-workaround rationale in PG-7 `validation_trace.plan_grounding` / `validation_trace.turn_driver_lawfulness`.
6. Patch-engine reassessment: the first submitted plan was rejected with `retcon_attestation_required` for `SE-7.commitment.alias_bindings`. The final approved plan added Type A story-event retcon attestations with `originating_se: SE-7` on all three `update_record_field` ops, then validated and submitted successfully.
7. Verification boundary: the broad `world-validate` command runs `chc_slt_selected_commitment_trace` successfully and emits no `alias_binding_missing` verdicts, but exits nonzero because of pre-existing `page_plan_body_engine_vocabulary_cleanliness` failures in older `pages-prose-plans/PG-1.md` through `PG-5.md` plus a PG-6 warning. Those page-plan prose cleanup findings are outside this ticket's SE-7/PG-7 record-repair seam.

## Architecture Check

1. Cleaner than alternatives: remove the now-obsolete binding and update the validation trace through the same story-bundle content route, rather than weakening the validator or preserving a false SREL match as historical convenience.
2. No backwards-compatibility aliasing/shims introduced. The bundle is brought forward to the current alias-binding contract.

## Verification Layers

1. `SE-7.commitment.alias_bindings` no longer includes `attention_edge` -> direct post-repair record review.
2. PG-7 validation trace no longer claims `attention_edge=SREL-7` was needed for `chc_slt_selected_commitment_trace` -> direct post-repair record review.
3. `chc_slt_selected_commitment_trace` accepts the cleaned local bundle under the current validator -> `world-validate` structural/full-world proof after index refresh.
4. Story-bundle write discipline is preserved -> patch-engine receipt or explicit user override recorded in closeout.

## Landed Changes

### 1. Remove the stale SE-7 alias binding

Through the patch engine, updated `SE-7.commitment.alias_bindings` so it retains the real matched hard aliases and removes `attention_edge`.

### 2. Truth PG-7 validation trace prose

Through the patch engine, updated PG-7 `validation_trace.plan_grounding` and `validation_trace.turn_driver_lawfulness` to stop claiming that `attention_edge=SREL-7` was a required alias-binding completeness workaround. Both fields now state that `attention_edge` is an unmet advisory-only soft alias with no downstream `bound:attention_edge` dependency.

### 3. Refresh derived index state

`submit_patch_plan` refreshed the derived `erotica-world` index during apply (`index_sync_duration_ms: 942`), so MCP record reads and validator proof used the repaired records.

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
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` runs `chc_slt_selected_commitment_trace` with status `pass` and emits no `alias_binding_missing` verdicts. The command may still exit nonzero for unrelated pre-existing page-plan vocabulary failures recorded in `## Deviations`.

### Invariants

1. Story-bundle `_source` records are repaired through patch-engine validation/submission unless the user explicitly records a direct-edit override.
2. The repaired bundle does not invent a replacement binding for an unmatched advisory-only soft predicate.

## Test Plan

### New/Modified Tests

1. `None — local story-bundle content repair; verification is command/manual-review based and validator behavior is already covered by STVALIDATOR-001.`

### Commands

1. `mcp__worldloom__validate_patch_plan` for `EROTICA-003-red-bunny-soft-alias-repair-v3`.
2. `mcp__worldloom__submit_patch_plan` for `EROTICA-003-red-bunny-soft-alias-repair-v3`.
3. MCP direct field reads for `SE-7.commitment.alias_bindings`, `PG-7.validation_trace.plan_grounding`, and `PG-7.validation_trace.turn_driver_lawfulness`.
4. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json`

## Outcome

Implemented. The engine applied patch plan `EROTICA-003-red-bunny-soft-alias-repair-v3` after explicit user approval.

`SE-7.commitment.alias_bindings` now contains only `pending_offer: STQ-5`, `response_charge: STEMO-15`, and `response_intent: STINT-10`. `attention_edge: SREL-7` was removed.

PG-7 `validation_trace.plan_grounding` and `validation_trace.turn_driver_lawfulness` now describe the current contract: `attention_edge` is an unmet advisory-only soft alias, and no binding is required because no downstream `bound:attention_edge` reference depends on it.

## Verification Result

1. `mcp__worldloom__validate_patch_plan` for `EROTICA-003-red-bunny-soft-alias-repair-v3` returned `status: pass`; core validators including `yaml_parse_integrity`, `cross_file_reference`, `record_schema_compliance`, `approval_semantics`, `index_disk_consistency`, Rules 1/2/4/5/6/7, and `id_allocation_race` passed.
2. `mcp__worldloom__submit_patch_plan` applied the plan at `2026-05-27T18:06:47.904Z`, wrote `worlds/erotica-world/stories/red-bunny/_source/events/SE-7.yaml` (`144983f894e60cbbb6c9d284a2e4f7b04baab8f669523afad04e253a65e85666`) and `worlds/erotica-world/stories/red-bunny/_source/pages/PG-7.yaml` (`1a5deae11914cc1dc4e6e9d5d809f8b91952142a1466eda54cbee03ad82064c7`), and synced the index.
3. MCP direct field read confirmed `SE-7.commitment.alias_bindings` omits `attention_edge` and preserves `pending_offer`, `response_charge`, and `response_intent`.
4. MCP direct field reads confirmed both PG-7 validation-trace fields no longer claim the obsolete `attention_edge=SREL-7` workaround.
5. `node tools/validators/dist/src/cli/world-validate.js erotica-world --story red-bunny --structural --json` ran `chc_slt_selected_commitment_trace` with status `pass` and emitted zero `alias_binding_missing` verdicts.

## Deviations

1. The first approved patch plan was rejected by the submit path with `retcon_attestation_required`. The final submitted plan added Type A `retcon_attestation` metadata with `originating_se: SE-7` and received a second explicit approval before submission.
2. The broad `world-validate` command still exits nonzero because of pre-existing `page_plan_body_engine_vocabulary_cleanliness` failures in older page-plan prose files (`PG-1.md` through `PG-5.md`) plus a PG-6 warning. The owned validator invariant passed: `chc_slt_selected_commitment_trace` status is `pass` and no `alias_binding_missing` verdicts remain.
