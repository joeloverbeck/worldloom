# Phase 5: Author the Batch Manifest

Draft the batch manifest content in working memory (the disk write happens at Phase 6 step 6 after the HARD-GATE approval; per the HARD-GATE block, no SLB write to disk occurs in Phase 5). The manifest content target shape for `worlds/<world_slug>/stories/<story_slug>/storylet-batches/SLB-<integer>.md` is:

```markdown
# SLB-<integer>: <mode> batch

**Mode**: direct_batch | audit_repair
**Source**: <focus hint, if direct_batch> | <audit_id + finding_ids, if audit_repair>
**Created**: <iso8601 date>
**Records**: <count> SLT records

## Moment signature (direct_batch only)

(Inline prose, not embedded YAML. Summarize the moment context from pre-flight step 4(iii) and Phase 1 Pass B output. Omit this entire section for audit_repair mode. When pre-flight step 4(iii) skipped computation, surface the skip reason instead of the signature contents.)

- **Source moment**: PG-<integer> (parent_event SE-<integer>, kind=<turn_resolution|...>, resolution=<player_action|player_write_in|npc_action|...>)
- **Supersession set** (within <window_pages>-page window): <prose enumeration of supersession transitions, each as `<old_id> → <new_id> @ PG-<integer> (axis: <inferred-axis>)`>. When supersession_set is empty (e.g., bundle has only PG-1), write "none within window".
- **Active high-salience configuration**: <prose summary of the active_high_salience_records counts by class — threads (urgency >= high), obligations (urgency >= medium), consequences (urgency >= high), clocks (salience >= high), secrets (salience >= high AND status == hidden), story_questions (salience >= high AND status == open), relationships (value >= high), beliefs (currently-authoritative)>.
- **Forward affordance fingerprint**: dominant action families <[family, family]>; outlier action families <[family, family, ...]>; from parent-page choices <[CHC-N, CHC-N+1, ...]>.
- **Cast-role engagement at moment**: <prose summary of which STENT roles the present configuration is exercising — pressure_source, opposing_actor, authority, dependent, information_source — naming the STENT ids per role>.
- **Moment-fit lanes addressed by this batch**: <prose enumeration of moment_fit_lanes from Pass B whose addressed_by_blocks intersect this batch's SLT ids, each as `<lane_id> (source: <supersession_set|forward_affordance+active_high_salience|cast_role_engagement|move_family_under_represented_at_moment>) — addressed by SLT-<N>, SLT-<M>`>. When Pass B emitted no lanes (pool fit to moment; batch is depth-fill per operator override of `target_count` or `focus`), write "none — pool fit to moment; this batch is depth-fill per operator override".

(When `moment_signature_skipped: true` from pre-flight step 4(iii) — e.g., no committed PG yet because the bundle is post-bootstrap before PG-2 — replace the bullets above with a single line: "Moment signature skipped: <reason from pre-flight, e.g., 'no committed PG (post-bootstrap)'>".)

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

Keep the manifest prose + tables. Do **not** embed a ` ```yaml ` fence for either the Phase-1 coverage diagnosis OR the Moment signature section — record coverage and moment-signature contents as inline prose (count + ids of pool coverage and gaps addressed; per-bullet narrative for moment signature). The Phase-1 `coverage_diagnosis` and the pre-flight `moment_signature` working-memory shapes are diagnosis / pre-flight artifacts, not verbatim manifest content. (The world-index parser exempts `storylet-batches/` manifests from the canonical-ledger `unexpected_yaml_section` scan, so an embedded fence would not produce a spurious info-warning; prose remains the preferred form for readability.)
