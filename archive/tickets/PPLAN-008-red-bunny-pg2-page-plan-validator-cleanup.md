# PPLAN-008: Repair red-bunny PG-2 page-plan validator drift

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None — story-bundle page-plan content repair plus required PG plan/state hash bridge restamp through the existing patch-engine path.
**Deps**: `archive/tickets/STEMOAGENCY-002.md`

## Problem

At intake, post-review of `archive/tickets/STEMOAGENCY-002.md` confirmed the STEMO agency-effect cleanup was complete, but the same `world-validate erotica-world` lane still reported 18 unrelated red-bunny PG-2 page-plan failures:

- 6 `page_plan_stchar_packet_integrity.stale_current_state_reference` failures in `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`
- 1 `page_plan_active_pressure_table_missing` failure for the missing §7a Active-pressure disposition table
- 7 `high_urgency_active_record_unhandled` failures for `STEMO-1`, `STEMO-2`, `STEMO-3`, `STEMO-4`, `STSEC-1`, `THR-1`, and `THR-2`
- 4 `active_pressure_deferred_without_expiry` failures for `THR-2`, `THR-3`, `CNSQ-1`, and `OBL-1`

These failures were not part of the STEMO agency-effect repair, but they left the red-bunny PG-2 page-plan contract red under the current validators before this ticket.

## Assumption Reassessment (2026-05-25)

1. At intake, the failing surface was `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md`; `node tools/validators/dist/src/cli/world-validate.js erotica-world` reported 18 failures after `STEMOAGENCY-002` landed, and none were `stemo_agency_effect_compatibility.unexplained_constraining_effect`.
2. `docs/FOUNDATIONS.md` keeps story-bundle execution state in story-bundle records and artifacts, not upstream world canon. This ticket is scoped to story-bundle page-plan repair and must not mutate world-level canon.
3. Cross-artifact boundary: the page-plan body must agree with `PG-2.yaml` / parent `PG-1.yaml` active-record snapshots and with the `page_plan_stchar_packet_integrity`, `page_plan_turn_driver_consistency`, and `active_pressure_handling_discipline` validators.
4. `archive/tickets/STEMOAGENCY-002.md` is the completed reviewed ticket; this follow-up depends on that archive record because the review exposed the current failure count.
5. Live reassessment reproduced the 18 failures after rebuilding `tools/validators` and `tools/world-mcp`. The §7a active-pressure rows are present in human prose, but the heading is bolded as `**Active-pressure disposition at PG-1.**`, which does not match the parser's `^Active-pressure` heading contract; deferred rows also need explicit `when` / `until` / PG expiry conditions.
6. If editing `PG-2.md` changes its hash, `PG-2.yaml` must be recomputed and updated through a lawful engine-routed repair path for both `plan.plan_hash` and the dependent `state_hash`. Do not leave page-plan text and stamped PG hashes drifted.
7. Adjacent contradiction classification: the page-plan failures are separate story-bundle content drift, not unfinished work in `STEMOAGENCY-002`; this ticket owns only the PG-2 page-plan / hash-bridge cleanup.

## Architecture Check

1. Repairing the page-plan body and any resulting plan-hash bridge keeps the validator contract intact instead of weakening `page_plan_stchar_packet_integrity` or active-pressure validators.
2. No backwards-compatibility aliasing, validator relaxation, or synthetic story turn is introduced.

## Verification Layers

1. PG-2 page-plan packet freshness -> `world-validate erotica-world` reports no `page_plan_stchar_packet_integrity.stale_current_state_reference` failures for `PG-2.md`.
2. PG-2 active-pressure handling complete -> `world-validate erotica-world` reports no `page_plan_active_pressure_table_missing`, `high_urgency_active_record_unhandled`, or `active_pressure_deferred_without_expiry` failures for `PG-2.md`.
3. Plan/state hash bridge preserved -> direct hash check with `compute-pg-hashes` shows `PG-2.yaml` `plan.plan_hash` and `state_hash` match the repaired `PG-2.md`, or the implementation records why no hash-bearing file changed.
4. No STEMO regression -> the STEMO agency-effect no-match proof remains clean.

## Landed Changes

### 1. Repaired PG-2 §16a current-state references

Updated the PG-2 STCHAR packet prose so validator-scanned active current-state fields no longer cite stale parent `PG-1` references. Historical parent-page discussion remains outside the active §16a packet current-state fields.

### 2. Repaired PG-2 §7a active-pressure disposition

Made the existing Active-pressure disposition table parser-visible, changed record cells to bare record ids, added the missing `STSEC-1` row, and added explicit expiry/condition language for deferred rows.

### 3. Preserved the plan/state hash bridge

After editing `PG-2.md`, recomputed the PG hashes and updated `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` through the patch-engine CLI fallback path for `plan.plan_hash` and `state_hash`. The submit receipt synced the world index.

## Files to Touch

- `worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md` (modify)
- `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` (engine-routed modify because the plan/state hashes changed)
- `worlds/erotica-world/_index/world.db` (ignored derived artifact refreshed when the engine/index path runs)

## Out of Scope

- Changing `page_plan_stchar_packet_integrity`, `page_plan_turn_driver_consistency`, or `active_pressure_handling_discipline` semantics.
- Rewriting red-bunny fiction beyond the minimum page-plan text needed to satisfy current-state and active-pressure validator contracts.
- Changing `STEMOAGENCY-002` or its `SREL-4` repair.

## Acceptance Criteria

### Tests That Must Pass

1. `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry'` returns no matches.
2. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` reports `plan_hash` and `state_hash` matching `PG-2.yaml`.
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

## Outcome

Completed on 2026-05-25. `PG-2.md` now satisfies the page-plan current-state and active-pressure validator contract, and `PG-2.yaml` has been engine-routed to the recomputed `plan.plan_hash` and `state_hash` values.

No validator semantics changed. No new story turn was created. No world-level canon was changed.

## Verification Result

1. `npm run build` in `tools/validators` — passed before live validator probes.
2. `npm run build` in `tools/world-mcp` — passed before hash / patch-plan CLI probes.
3. Intake reproduction: `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry|stemo_agency_effect_compatibility.unexplained_constraining_effect'` — reproduced the 18 PG-2 failures and no STEMO agency-effect failures.
4. Pre-submit page-plan proof: `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry|snapshot_replay_equality|state_hash|plan_hash'` — returned no matches for the page-plan failures after the prose repair; the command exited `1` because `rg` found no matches, which is the expected proof signal for this negative grep.
5. `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` — computed `plan_hash: b646bff37324ffecc22aacbc4e7b144e23564193fbaa3b50e4fa661b39f6f922` and `state_hash: 01e01fe4c131958a0c0047e68fea2688c16fcfbfee91662753d60492d7c95480`.
6. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/PPLAN-008-pg2-hash-restamp.json` — passed with `status: "pass"` and no verdicts.
7. User approval: `approved` — received before signing/submitting the plan.
8. `node tools/world-mcp/dist/src/cli/sign-approval-token.js /tmp/PPLAN-008-pg2-hash-restamp.json` — signed the exact validated plan.
9. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/PPLAN-008-pg2-hash-restamp.json /tmp/PPLAN-008-pg2-hash-restamp-token.txt` — passed. Receipt wrote `worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` and synced the index in 715 ms.
10. Post-submit hash proof: `node tools/world-mcp/dist/src/cli/compute-pg-hashes.js --plan worlds/erotica-world/stories/red-bunny/pages-prose-plans/PG-2.md --pg worlds/erotica-world/stories/red-bunny/_source/pages/PG-2.yaml` — reported the same `plan_hash` and `state_hash` now stamped in `PG-2.yaml`.
11. Post-submit targeted proof: `node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | rg 'page_plan_stchar_packet_integrity.stale_current_state_reference|page_plan_active_pressure_table_missing|high_urgency_active_record_unhandled|active_pressure_deferred_without_expiry'` — returned no matches; the command exited `1` because `rg` found no matches, which is the expected proof signal.
12. STEMO regression guard: `if node tools/validators/dist/src/cli/world-validate.js erotica-world 2>&1 | grep 'stemo_agency_effect_compatibility.unexplained_constraining_effect'; then exit 1; fi` — passed with no output.

## Deviations

1. The drafted ticket described the §7a Active-pressure table as missing. Live reassessment found the rows already existed in human prose, but the bolded heading and descriptive record cells made the table invisible to the validator parser; the repair kept the existing table and made it machine-readable.
2. Editing `PG-2.md` required restamping both `plan.plan_hash` and `state_hash`, not only `plan.plan_hash`.
3. The direct MCP submit tool was unavailable in this Codex session, so the documented CLI fallback path was used. The path preserved validate, explicit user approval, token signing, patch-engine submit, and index sync.
4. The post-submit tracked `git status` shows only the active ticket because `worlds/erotica-world/` is ignored in this pipeline checkout. The story-bundle page-plan, PG record, and index were verified directly by file reads and CLI probes.
