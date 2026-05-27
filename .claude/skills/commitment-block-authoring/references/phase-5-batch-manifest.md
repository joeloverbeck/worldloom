# Phase 5: Author the Batch Manifest

Draft the batch manifest content in working memory (the disk write happens at Phase 6 step 6 after the HARD-GATE approval; per the HARD-GATE block, no SLB write to disk occurs in Phase 5). The manifest content target shape for `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-<integer>.md` is:

```markdown
# SLB-<integer>: <mode> batch

**Mode**: direct_batch | audit_repair
**Source**: <focus hint, if direct_batch> | <audit_id + finding_ids, if audit_repair>
**Created**: <iso8601 date>
**Records**: <count> SLT records

## Blocks

| SLT id | move_family | scope | source RSP (if audit_repair) | validation |
|---|---|---|---|---|
| SLT-<integer> | <move_family> | global_author_pool | RSP-<integer> | PASS (6/6 gates) |
| ... | | | | |

## Skipped RSP cards (audit_repair only)

| RSP id | repair_kind | recommended sibling | skip reason |
|---|---|---|---|

## Per-block validation traces

(One section per surviving block; per-gate one-line PASS rationale.)

## Per-block rejection traces (if any)

(One section per rejected block; per-gate failure summary.)
```

The SLB file is a markdown direct-write manifest, not an atomic YAML record. No `create_slb_record` patch op exists; the file is direct-write per shared contract §10.
