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

Keep the manifest prose + tables. Do **not** embed a ` ```yaml ` fence for the Phase-1 coverage diagnosis — record coverage as inline prose (count + ids of pool coverage, gaps addressed). The Phase-1 `coverage_diagnosis` YAML shape is working-memory diagnosis, not verbatim manifest content. (The world-index parser now exempts `storylet-batches/` manifests from the canonical-ledger `unexpected_yaml_section` scan, so an embedded fence no longer produces a spurious info-warning; prose remains the preferred form for readability.)
