# PPLAN-008: Repair red-bunny PG-2 page-plan validator drift

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — story-bundle page-plan content repair plus any required PG plan-hash bridge restamp through the existing patch-engine path.
**Deps**: `archive/tickets/STEMOAGENCY-002.md`

## Problem

Post-review of `archive/tickets/STEMOAGENCY-002.md` confirmed the STEMO agency-effect cleanup is complete, but the same `world-validate erotica-world` lane still reports 18 unrelated red-bunny PG-2 page-plan failures:

- 6 `page_plan_stchar_packet_integrity.stale_current_state_reference` failures in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`
- 1 `page_plan_active_pressure_table_missing` failure for the missing §7a Active-pressure disposition table
- 7 `high_urgency_active_record_unhandled` failures for `STEMO-1`, `STEMO-2`, `STEMO-3`, `STEMO-4`, `STSEC-1`, `THR-1`, and `THR-2`
- 4 `active_pressure_deferred_without_expiry` failures for `THR-2`, `THR-3`, `CNSQ-1`, and `OBL-1`

These failures are not part of the STEMO agency-effect repair, but they leave the red-bunny PG-2 page-plan contract red under the current validators.

## Assumption Reassessment (2026-05-25)

1. The current failing surface is `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`; `node tools/validators/dist/src/cli/world-validate.js erotica-world` reports 18 failures after `STEMOAGENCY-002` lands, and none are `stemo_agency_effect_compatibility.unexplained_constraining_effect`.
2. `docs/FOUNDATIONS.md` keeps story-bundle execution state in story-bundle records and artifacts, not upstream world canon. This ticket is scoped to story-bundle page-plan repair and must not mutate world-level canon.
3. Cross-artifact boundary: the page-plan body must agree with `PG-2.yaml` / parent `PG-1.yaml` active-record snapshots and with the `page_plan_stchar_packet_integrity`, `page_plan_turn_driver_consistency`, and `active_pressure_handling_discipline` validators.
4. `archive/tickets/STEMOAGENCY-002.md` is the completed reviewed ticket; this follow-up depends on that archive record because the review exposed the current failure count.
5. If editing `PG-2.md` changes its hash, the `PG-2.yaml` `plan.plan_hash` bridge must be recomputed and updated through a lawful engine-routed repair path. Do not leave page-plan text and stamped PG hash drifted.
6. Adjacent contradiction classification: the page-plan failures are separate story-bundle content drift, not unfinished work in `STEMOAGENCY-002`; this ticket owns only the PG-2 page-plan / hash-bridge cleanup.

## Architecture Check

1. Repairing the page-plan body and any resulting plan-hash bridge keeps the validator contract intact instead of weakening `page_plan_stchar_packet_integrity` or active-pressure validators.
2. No backwards-compatibility aliasing, validator relaxation, or synthetic story turn is introduced.

## Verification Layers

1. PG-2 page-plan packet freshness -> `world-validate erotica-world` reports no `page_plan_stchar_packet_integrity.stale_current_state_reference` failures for `PG-2.md`.
2. PG-2 active-pressure handling complete -> `world-validate erotica-world` reports no `page_plan_active_pressure_table_missing`, `high_urgency_active_record_unhandled`, or `active_pressure_deferred_without_expiry` failures for `PG-2.md`.
3. Plan hash bridge preserved -> direct hash check with `compute-pg-hashes` shows `PG-2.yaml` `plan.plan_hash` matches the repaired `PG-2.md`, or the implementation records why no hash-bearing file changed.
4. No STEMO regression -> the STEMO agency-effect no-match proof remains clean.

## What to Change

### 1. Repair PG-2 §16a current-state references

Update the PG-2 STCHAR packet current-state citations so every cited current-state record resolves in the bundle and is active in the correct PG-2 snapshot. Remove stale `PG-1` references from active §16a current-state fields unless they are explicitly historical context rather than current-state grounding.

### 2. Add or repair PG-2 §7a active-pressure disposition

Add the missing Active-pressure disposition table for the high-urgency parent-active records the validators report, with explicit dispositions and expiry/condition text where pressure is deferred.

### 3. Preserve the plan-hash bridge

After editing `PG-2.md`, recompute the PG hash and update `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` through the existing patch-engine field-repair path if the stamped hash must change. Sync or rebuild the world index as required by the submit path.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` (engine-routed modify only if the plan hash changes)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed when the engine/index path runs)

## Out of Scope

- Changing `page_plan_stchar_packet_integrity`, `page_plan_turn_driver_consistency`, or `active_pressure_handling_discipline` semantics.
- Rewriting red-bunny fiction beyond the minimum page-plan text needed to satisfy current-state and active-pressure validator contracts.
- Changing `STEMOAGENCY-002` or its `SREL-4` repair.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry'` returns no matches.
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` reports a `plan_hash` matching `PG-2.yaml`.
3. `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi` exits `0`.

### Invariants

1. Page-plan text remains a story-bundle artifact and does not claim world-canon authority.
2. `_source/pages/PG-2.yaml` is not direct-edited when a hash restamp is required; use the patch-engine path.
3. The repair does not create a new story turn.

## Test Plan

### New/Modified Tests

1. None — live story-bundle page-plan repair; verification is validator-command and hash-command based.

### Commands

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry'`
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml`
3. `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi`
