# Storylet Batch SLB-NNNN

**Story**: `<story-slug>` in `<world-slug>`
**Mode**: `seed | focus | audit`
**Focus area**: `<focus_area>`
**Source obligations**: `[OBL-NNNN, ...]`
**Source threads**: `[THR-NNNN, ...]`
**Source audit**: `<SAU-NNNN if mode=audit, else "n/a">`
**Date**: `<iso8601>`
**Allocated SLT range**: `SLT-NNNN..SLT-NNNN`

## Approved storylets

| SLT | Title | Shape | Intensity | Engages | Mystery | Visibility |
|---|---|---|---|---|---|---|
| SLT-NNNN | `<title>` | `<shape>` | `<intensity>` | OBL-NNNN (opens), OBL-NNNN (complicates) | M-NNNN (touched) \| none | `<scope>` |

## Diversity summary

- **Shape distribution**: `<shape>: <count>; ...` (max axis: <X>%; rule ≤40% — PASS)
- **Tone distribution**: `<tone>: <count>; ...` (max axis: <X>%; rule ≤40% — PASS)
- **Content intensity distribution**: `tame: X | mature: Y | explicit: Z` (matches `<baseline>` baseline target distribution — PASS)
- **OBL coverage**: `<engaged>/<total open>` open OBLs engaged (rule ≥60% in seed mode; or every `source_obligations` id hit in focus mode — PASS)
- **Theme distribution**: `<theme>: <count>; ...` (max axis: <X>%; rule ≤50% — PASS)
- **Cast usage**: every protagonist/major engaged at least once — PASS
- **Batch-level branch-contamination audit**: no `global_author_pool` storylet references branch-local record ids — PASS

## Rejected candidates

- `<count>` mystery-firewall rejects (forbidden M resolution attempted)
- `<count>` resolution-authority rejects (canon_candidate on author-pool storylet)
- `<count>` invariant-compatibility rejects
- `<count>` consequence-capacity rejects
- `<count>` dedup rejects
- `<count>` content-intensity rejects
- `<count>` predicate-DSL rejects
- `<count>` branch-contamination rejects
- `<count>` schema-completeness drops (after 2 revise retries)

## Dropped at HARD-GATE

| Dropped SLT | Reason |
|---|---|
| SLT-NNNN | `<user reason at HARD-GATE; permanent allocation gap>` |

(Empty when ACCEPT BATCH was chosen; populated when ACCEPT WITH SELECTIONS dropped specific ids.)

## Validation verdicts

- **Phase 4 per-storylet (9 gates × N storylets)**: PASS — `<one-line rationale>`
- **Phase 5 diversity audit (6 axes)**: PASS — `<one-line rationale>`
- **Phase 5 batch-level branch-contamination**: PASS — `<one-line rationale>`

## Notes

`<free-form rationale for this batch's selection — what gap it filled, what tradeoffs were made, what was deferred to a future invocation>`
