# EROTICA-001: Repair erotica-world CH-0006 change-log schema/indexing drift

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — narrow patch-engine/world-mcp maintenance op for skipped change-log record repair, plus local `erotica-world` world-content repair through the approved validate/sign/submit path.
**Deps**: `archive/tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md`; `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md`; `archive/tickets/SPEC22SCECOM-014.md`

## Problem

At intake, `BSBOOT-031` had completed the `red-bunny` PG-1 hash repair, but its patch-engine submit refreshed `worlds/erotica-world/_index/` and emitted a pre-existing skipped-record warning:

```text
Warning: skipped schema-failed record _source/change-log/CH-0006.yaml node_type=change_log_entry id=<missing> expected=^CH-[0-9]+$ reason=missing_id_field
```

Before this ticket, `worlds/erotica-world/_source/change-log/CH-0006.yaml` started with `id: CH-0006`, while `tools/validators/src/schemas/change-log-entry.schema.json` and `tools/world-index/src/parse/atomic.ts` expected `change_id: CH-<integer>` for change-log entries. The skipped record therefore did not participate in index-backed retrieval as a normal `change_log_entry`.

## Assumption Reassessment (2026-05-13)

1. `worlds/erotica-world/_source/change-log/CH-0006.yaml` exists in the current checkout and is gitignored by `.gitignore:144` via `worlds/*`; direct tracked git status is not exhaustive proof for this file.
2. `tools/validators/src/schemas/change-log-entry.schema.json` requires `change_id`, `date`, `change_type`, and `affected_fact_ids`, with `change_id` matching `^CH-[0-9]+$`.
3. Cross-artifact boundary: the repair must make the world-content CH record, `world-index` atomic parser, and validator schema agree so future index rebuilds stop skipping `CH-0006`.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` §Canonical Storage Layer and `docs/HARD-GATE-DISCIPLINE.md` require `_source/change-log/*.yaml` mutations to preserve engine-routed canon-write discipline. Direct editing `CH-0006.yaml` as a shortcut is out of scope.
5. Prior evidence: `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md` and `archive/tickets/SPEC22SCECOM-014.md` both recorded the same `CH-0006` skipped-record warning as pre-existing, but no active ticket currently owns the repair.
6. Reassessment risk: because `CH-0006` is skipped by the current index, ordinary `update_record_field` may not be able to target it by id. Implementation must first prove whether a live engine-routed recovery path exists; if not, use or extend an engine-preserving fallback rather than direct-editing `_source`.
7. Live patch-engine correction: `update_record_field` and `remove_ch_affected_cf_ids` both resolve existing records through indexed `node_id`, while `create_ch_record` refuses to overwrite an existing file. Because `CH-0006` is not indexed, this ticket owns a narrow `repair_skipped_change_log_entry` maintenance op that reads the existing `_source/change-log/CH-0006.yaml` by explicit target file, stages a replacement through patch-engine commit, and exposes the op through the same `validate_patch_plan` / approval-token / `submit_patch_plan` CLI route.
8. Baseline proof before repair: `node tools/world-index/dist/src/cli.js build erotica-world` exits 0 but emits `_source/change-log/CH-0006.yaml ... missing_id_field`; `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural` exits 0 with 6 run / 3 skipped because the malformed CH record is skipped before schema validation.

## Architecture Check

1. Repairing the malformed CH record keeps the index source and validator contract aligned instead of accepting a permanent skipped-record warning in every `erotica-world` rebuild/sync.
2. No backwards-compatibility aliasing is introduced. The target state is canonical `change_id`, not teaching validators or indexers to accept `id` as a change-log alias.

## Verification Layers

1. CH schema alignment -> schema validation or focused validator proof that repaired `CH-0006.yaml` satisfies `change-log-entry.schema.json`.
2. Index inclusion -> `world-index build` or `sync` proof that no skipped-record warning remains for `_source/change-log/CH-0006.yaml`.
3. Write discipline -> manual review of the applied path proving the `_source` mutation used patch-engine submit or an explicitly approved engine-preserving fallback.
4. No PG regression -> not exercised; `archive/tickets/SPEC22SCECOM-014.md` deleted the `red-bunny` bundle before this ticket, so the archived `BSBOOT-031` PG hash surface was no longer present in the reviewed checkout.

## Landed Changes

### 1. Reassessed the CH-0006 record shape

Read `worlds/erotica-world/_source/change-log/CH-0006.yaml`, `tools/validators/src/schemas/change-log-entry.schema.json`, and `tools/world-index/src/parse/atomic.ts`. The minimal repair was replacing the noncanonical `id`/`title`/`authority` record shape with the canonical `change_id`/`change_type`/`affected_fact_ids` change-log schema while preserving the manual correction's meaning in `summary`, `change_summary`, `reason`, `downstream_updates`, `impact_on_existing_texts`, and `notes`.

### 2. Added the narrow skipped-CH maintenance op

Added `repair_skipped_change_log_entry` to the patch-engine operation set, world-mcp envelope schema description, and validator pre-apply overlay. The op is limited to `_source/change-log/CH-<integer>.yaml`, requires the replacement record's `change_id` to match the target id, and exists for schema-maintenance recovery of skipped change-log entries that cannot be addressed by indexed-record operations.

### 3. Applied the repair through an approved engine-preserving path

Submitted `/tmp/erotica-001-repair-ch-0006.json` with `repair_skipped_change_log_entry` through `node tools/world-mcp/dist/src/cli/validate-patch-plan.js`, explicit user approval, `node tools/world-mcp/dist/src/cli/sign-approval-token.js`, and `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/erotica-001-repair-ch-0006.json /tmp/erotica-001-token.txt`. The `_source/change-log/CH-0006.yaml` file was not direct-edited.

### 4. Rebuilt derived index state

Refreshed `worlds/erotica-world/_index/` through `node tools/world-index/dist/src/cli.js build erotica-world`. The rebuilt index contains `CH-0006` as a `change_log_entry`, has no validation row for `missing_id_field`, and no current `world.db.skipped_records.log` file remains.

## Files to Touch

- `tools/patch-engine/src/envelope/schema.ts` (modify)
- `tools/patch-engine/src/commit/order.ts` (modify)
- `tools/patch-engine/src/commit/temp-file.ts` (modify)
- `tools/patch-engine/src/ops/repair-skipped-change-log-entry.ts` (new)
- `tools/patch-engine/tests/ops/repair-skipped-change-log-entry.test.ts` (new)
- `tools/world-mcp/src/tools/describe-envelope-schema.ts` (modify)
- `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` (modify)
- `tools/validators/src/_helpers/index-access.ts` (modify)
- `worlds/erotica-world/_source/change-log/CH-0006.yaml` (modified through patch engine)
- `worlds/erotica-world/_index/` (derived ignored artifact refresh)
- `tickets/EROTICA-001-repair-ch-0006-change-log-schema.md` (modify for closeout)

## Out of Scope

- Changing `tools/validators/src/schemas/change-log-entry.schema.json`.
- Teaching `world-index` to accept `id` as a change-log alias.
- Rewriting the semantic content of the CH-0006 manual correction beyond schema/indexing compliance.
- Repairing unrelated skipped records in other worlds or story bundles.

## Acceptance Criteria

### Tests That Must Pass

1. A focused pre-apply or validator proof confirms repaired `CH-0006.yaml` satisfies `change-log-entry.schema.json`.
2. `world-index build` or `world-index sync` for `erotica-world` exits successfully and does not report `_source/change-log/CH-0006.yaml` as skipped.
3. Manual review confirms the source mutation did not bypass the documented `_source` write gate.
4. Patch-engine/world-mcp focused tests prove `repair_skipped_change_log_entry` is exposed, validates its target-file/id boundary, and stages through patch-engine commit semantics.

### Invariants

1. `CH-0006` remains the same historical/manual correction record semantically; the repair is schema/indexing compliance, not a new canon claim.
2. Change-log records use canonical `change_id`, not a compatibility alias.

## Test Plan

### New/Modified Tests

1. `tools/patch-engine/tests/ops/repair-skipped-change-log-entry.test.ts` — proves the narrow maintenance op can repair a skipped CH file by explicit target file and rejects mismatched ids/paths.
2. `tools/world-mcp/tests/tools/describe-envelope-schema.test.ts` — extends the envelope-schema introspection expectation for the new op.

### Commands

1. `(cd tools/patch-engine && npm run build && node --test dist/tests/ops/repair-skipped-change-log-entry.test.js)`
2. `(cd tools/world-mcp && npm run build && node --test dist/tests/tools/describe-envelope-schema.test.js)`
3. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/erotica-001-repair-ch-0006.json`
4. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/erotica-001-repair-ch-0006.json /tmp/erotica-001-token.txt`
5. `node tools/world-index/dist/src/cli.js build erotica-world`
6. Direct SQLite check against `worlds/erotica-world/_index/world.db` confirms `nodes` contains `CH-0006` as `change_log_entry` and `validation_results` contains no `missing_id_field` row for `_source/change-log/CH-0006.yaml`.
7. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural`

The patch-plan validate/submit commands must be recorded in closeout with the exact generated plan/token paths used by the implementation run.

## Outcome

Completed on 2026-05-13.

`worlds/erotica-world/_source/change-log/CH-0006.yaml` now uses canonical change-log schema fields, including `change_id: CH-0006`, `change_type: scope_retcon`, and `affected_fact_ids: [CF-0006]`. The semantic content remains the same manual correction: CF-0006 carries the user-directed perpetrator-cohort attribution at world-canon level, CF-0007 remains under the M-6 cross-population firewall, and M-6 is narrowed to CF-0007 scope.

The repair was applied through patch-engine submit after explicit approval, using the new `repair_skipped_change_log_entry` maintenance op. `world-index build erotica-world` now indexes `CH-0006` as a normal `change_log_entry`.

## Verification Result

1. `npm run build` in `tools/patch-engine/` — passed after adding the maintenance op.
2. `node --test dist/tests/ops/repair-skipped-change-log-entry.test.js` in `tools/patch-engine/` — passed; 2 tests prove target-file repair and rejection of mismatched ids, wrong paths, and hash drift.
3. `npm run build` in `tools/validators/` — passed after adding the pre-apply overlay projection for `repair_skipped_change_log_entry`.
4. `npm run build` in `tools/world-mcp/` — passed after exposing the new op through envelope-schema introspection.
5. `node --test dist/tests/tools/describe-envelope-schema.test.js` in `tools/world-mcp/` — passed; 5 tests, including the new op schema witness.
6. `node tools/world-mcp/dist/src/cli/validate-patch-plan.js /tmp/erotica-001-repair-ch-0006.json` — passed before approval/submission; `record_schema_compliance`, Rule 6, Rule 7, and `id_allocation_race` all passed with no verdicts.
7. `node tools/world-mcp/dist/src/cli/submit-patch-plan.js /tmp/erotica-001-repair-ch-0006.json /tmp/erotica-001-token.txt` — passed after explicit user approval; receipt wrote only `worlds/erotica-world/_source/change-log/CH-0006.yaml` with prior hash `8be037b60128c051852978a6fbfdf2f90a283a308f247641eb067caa05bcc24a` and new hash `b8f7f70b4f1c984a36958d638949058080e6216f4fe782a2ce9c9817e4ebc8be`.
8. `node tools/world-index/dist/src/cli.js build erotica-world` — passed after repair and emitted no skipped-record warning.
9. Direct SQLite check against `worlds/erotica-world/_index/world.db` — passed; `nodes` contains `CH-0006` with `node_type='change_log_entry'` and `file_path='_source/change-log/CH-0006.yaml'`, while `validation_results` has no `missing_id_field` row for that path.
10. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural` — passed; 6 validators run, 3 skipped, 0 fail / 0 warn / 0 info.

## Deviations

- The original drafted proof used `rg -n 'CH-0006|missing_id_field' worlds/erotica-world/_index/world.db.skipped_records.log`. After the successful rebuild, that skipped-record log file no longer exists, so the final proof uses the stronger direct SQLite check against `nodes` and `validation_results`.
- The ticket widened from local world-content repair to a narrow patch-engine/world-mcp maintenance operation because the live indexed-record operations could not target a skipped record and `create_ch_record` cannot overwrite an existing file. This stayed inside the same engine-preserving repair seam and avoided direct `_source` editing or schema aliasing.
- The optional no-PG-regression verification layer was not exercised because `archive/tickets/SPEC22SCECOM-014.md` had already deleted the `red-bunny` bundle in the reviewed checkout; the owned invariant was the world-level `CH-0006` schema/index repair.
