# patch-engine

Deterministic patch applier. Consumes a JSON patch plan via `mcp__worldloom__submit_patch_plan` (SPEC-02) and writes files atomically (two-phase commit with temp-file rename). Writes via `fs.writeFile` — bypasses Claude's Edit/Write tools so SPEC-05 Hook 3 does not fire on engine writes.

**Design**: `specs/SPEC-03-patch-engine.md`
**Phase**: 2
**Status**: not yet implemented

## Op vocabulary (13)

Generic structural: `insert_before_node`, `insert_after_node`, `replace_node`, `insert_under_heading`

YAML-record: `replace_yaml_field`, `append_list_item`, `append_modification_history_entry`, `append_cf_record`

Markdown prose: `append_bullet_cluster`, `append_heading_section`, `insert_attribution_comment`

Cross-file: `append_change_log_entry`, `append_adjudication_record`

**Append-only vocabulary**: no `replace_cf_record`, no `delete_*`, no `move_*`.

## Write-order discipline (engine-enforced)

1. All domain-file ops
2. `append_adjudication_record`
3. `CANON_LEDGER.md` in sub-order:
   a. In-place CF qualifications (`replace_yaml_field` + `append_modification_history_entry`)
   b. `append_cf_record`
   c. `append_change_log_entry`

Skill patch-list order is ignored; engine reorders internally.

## Atomicity

Phase A — validate (no writes); Phase B — temp-write + fsync + rename. Any op failure aborts the plan; disk unchanged.

## Attribution auto-stamping

`<!-- added by CF-NNNN -->`, `<!-- clarified by CH-NNNN -->`, notes-field `Modified YYYY-MM-DD by CH-NNNN (CF-NNNN): ...` lines are all engine-generated from the `attribution` field of each op. Skills never hand-format.
