# EROTICA-001: Repair erotica-world CH-0006 change-log schema/indexing drift

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — local `erotica-world` world-content repair through an approved engine-preserving path; possible patch-engine recovery fallback if skipped records cannot be targeted by `update_record_field`.
**Deps**: `archive/tickets/BSBOOT-031-repair-red-bunny-pg-hash-placeholders.md`; `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md`; `archive/tickets/SPEC22SCECOM-014.md`

## Problem

`BSBOOT-031` completed the `red-bunny` PG-1 hash repair, but its patch-engine submit refreshed `worlds/erotica-world/_index/` and emitted a pre-existing skipped-record warning:

```text
Warning: skipped schema-failed record _source/change-log/CH-0006.yaml node_type=change_log_entry id=<missing> expected=^CH-[0-9]+$ reason=missing_id_field
```

The live file `worlds/erotica-world/_source/change-log/CH-0006.yaml` starts with `id: CH-0006`, while `tools/validators/src/schemas/change-log-entry.schema.json` and `tools/world-index/src/parse/atomic.ts` expect `change_id: CH-<integer>` for change-log entries. The skipped record therefore does not participate in index-backed retrieval as a normal `change_log_entry`.

## Assumption Reassessment (2026-05-13)

1. `worlds/erotica-world/_source/change-log/CH-0006.yaml` exists in the current checkout and is gitignored by `.gitignore:144` via `worlds/*`; direct tracked git status is not exhaustive proof for this file.
2. `tools/validators/src/schemas/change-log-entry.schema.json` requires `change_id`, `date`, `change_type`, and `affected_fact_ids`, with `change_id` matching `^CH-[0-9]+$`.
3. Cross-artifact boundary: the repair must make the world-content CH record, `world-index` atomic parser, and validator schema agree so future index rebuilds stop skipping `CH-0006`.
4. FOUNDATIONS alignment: `docs/FOUNDATIONS.md` §Canonical Storage Layer and `docs/HARD-GATE-DISCIPLINE.md` require `_source/change-log/*.yaml` mutations to preserve engine-routed canon-write discipline. Direct editing `CH-0006.yaml` as a shortcut is out of scope.
5. Prior evidence: `archive/tickets/MCPENH-037-extend-world-index-inventory-with-story-bundle-markdown-paths.md` and `archive/tickets/SPEC22SCECOM-014.md` both recorded the same `CH-0006` skipped-record warning as pre-existing, but no active ticket currently owns the repair.
6. Reassessment risk: because `CH-0006` is skipped by the current index, ordinary `update_record_field` may not be able to target it by id. Implementation must first prove whether a live engine-routed recovery path exists; if not, use or extend an engine-preserving fallback rather than direct-editing `_source`.

## Architecture Check

1. Repairing the malformed CH record keeps the index source and validator contract aligned instead of accepting a permanent skipped-record warning in every `erotica-world` rebuild/sync.
2. No backwards-compatibility aliasing is introduced. The target state is canonical `change_id`, not teaching validators or indexers to accept `id` as a change-log alias.

## Verification Layers

1. CH schema alignment -> schema validation or focused validator proof that repaired `CH-0006.yaml` satisfies `change-log-entry.schema.json`.
2. Index inclusion -> `world-index build` or `sync` proof that no skipped-record warning remains for `_source/change-log/CH-0006.yaml`.
3. Write discipline -> manual review of the applied path proving the `_source` mutation used patch-engine submit or an explicitly approved engine-preserving fallback.
4. No PG regression -> optional grep/validator confirmation that the archived `BSBOOT-031` `red-bunny` PG hash repair remains intact if the same derived index is refreshed.

## What to Change

### 1. Reassess the CH-0006 record shape

Read `worlds/erotica-world/_source/change-log/CH-0006.yaml`, the change-log schema, and the world-index atomic parser. Determine the minimal canonical record shape needed to stop the skip without changing the semantic meaning of the manual correction.

### 2. Apply the repair through an approved engine-preserving path

Prefer a normal patch-engine submit if the record can be addressed. If the skipped record cannot be targeted through current index-backed `update_record_field`, use the repository's documented fallback rules for engine-only `_source` repairs and record why the path preserves canon-write discipline.

### 3. Rebuild or sync derived index state

Refresh `worlds/erotica-world/_index/` through the appropriate `world-index` command and confirm the skipped-record log no longer names `CH-0006`.

## Files to Touch

- `worlds/erotica-world/_source/change-log/CH-0006.yaml` (modify through patch engine or approved engine-preserving fallback)
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

### Invariants

1. `CH-0006` remains the same historical/manual correction record semantically; the repair is schema/indexing compliance, not a new canon claim.
2. Change-log records use canonical `change_id`, not a compatibility alias.

## Test Plan

### New/Modified Tests

1. `None — local gitignored world-content repair; verification is command/manual-review based.`

### Commands

1. `node tools/world-index/dist/src/cli.js build erotica-world`
2. `rg -n 'CH-0006|missing_id_field' worlds/erotica-world/_index/world.db.skipped_records.log`
3. `node tools/validators/dist/src/cli/world-validate.js erotica-world --structural`

The patch-plan validate/submit commands must be recorded in closeout with the exact generated plan/token paths used by the implementation run.
