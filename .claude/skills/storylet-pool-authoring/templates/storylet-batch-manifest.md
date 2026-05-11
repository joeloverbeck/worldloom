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

| SLT | Title | Commitment class | Arc archetype | Value delta axes | Intensity | Engages | Mystery | Visibility |
|---|---|---|---|---|---|---|---|---|
| SLT-NNNN | `<title>` | `<commitment_class>` | `<arc_archetype>` | `<value_delta_target.axes[]>` | `<intensity>` | OBL-NNNN (opens), OBL-NNNN (complicates) | M-NNNN (touched) \| none | `<scope>` |

## Diversity summary

- **Commitment class distribution**: `<commitment_class>: <count>; ...` (max axis: <X>%; rule ≤30% for established/top-up batches; documented small-batch relaxation allowed — PASS)
- **Arc archetype distribution**: `<arc_archetype>: <count>; ...` (max axis: <X>%; rule ≤25% — PASS)
- **Tone distribution**: `<tone>: <count>; ...` (max axis: <X>%; rule ≤40% — PASS)
- **Content intensity distribution**: `tame: X | mature: Y | explicit: Z` (matches `<baseline>` baseline target distribution — PASS)
- **OBL coverage**: `<engaged>/<total open>` open OBLs engaged (rule ≥60% in seed mode; or every `source_obligations` id hit in focus mode — PASS)
- **Theme distribution**: `<theme>: <count>; ...` (max axis: <X>%; rule ≤50% — PASS)
- **Cast usage**: every protagonist/major engaged at least once — PASS
- **Dramatic-unit coverage**: `<strong_axis>: <arc-count>; ...` (source: `beat_plan.beats[].state_significance`; each axis appears on ≥30% of arcs — PASS)
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
- `<count>` arc-envelope-conformance rejects
- `<count>` stop-policy-parsability rejects
- `<count>` effect-model-legality rejects
- `<count>` exit-portfolio-completeness rejects
- `<count>` Rule 11 spectator-caste leverage rejects

## Dropped at HARD-GATE

| Dropped SLT | Reason |
|---|---|
| SLT-NNNN | `<user reason at HARD-GATE; permanent allocation gap>` |

(Empty when ACCEPT BATCH was chosen; populated when ACCEPT WITH SELECTIONS dropped specific ids.)

## Validation verdicts

- **Phase 4 per-storylet (14 gates × N storylets)**: PASS — `<one-line rationale>`
- **Phase 5 diversity audit (mode-appropriate axes)**: PASS — `<one-line rationale>`
- **Phase 5 batch-level branch-contamination**: PASS — `<one-line rationale>`

## Authoring warnings

`<authoring_warnings[] entries from Pre-flight, one per line; empty when no warnings fired>`

Example entries:
- `storylet_pool_authoring_warning: zero rendered pages available along longest active branch_path; falling back to STORY_KERNEL.md only. Authored storylets may benefit from re-evaluation once early pages are finalized.`

(Empty section recorded as "No authoring warnings this batch." — never silently omitted; absence and "0 warnings" are different epistemic states.)

## Notes

`<free-form rationale for this batch's selection — what gap it filled, what tradeoffs were made, what was deferred to a future invocation>`
