# Phase 7: Commit Root Event and Root Page Snapshot

Covers original §Phase 7 (Commit root event and root page snapshot).

In working memory, draft `SE-1`:

```yaml
id: SE-1
event_kind: story_start
actor: system
outcome_route: accept
world_logic_rationale: >
  <how each cast member's opening location, intention, and belief state
   arises from the premise + world canon>
state_delta:
  create: [<every STCHAR / STENT / STSTAT / STINT / SF / BEL / OBL / CNSQ / THR / SREL /
           STLOC / STOBJ / optional CLK / STSEC / STQ / STPLAN / STEMO / DA id created in earlier drafting phases>]
```

Draft `PG-1` per shared contract §4.2:

- `parent_page_id: null`, `state_hash_parent: null`, `turn_index: 0`
- `branch_path: ["PG-1"]` — the ordered list of pages in this branch from root to here; for the root page the list contains exactly the root id. Required by §4.2 of the shared contract; §4.4 documents the cross-reference into `SLT.scope.visible_branch_path_prefix` and the `recursive_reference_closure` validator's authorization rule. Subsequent pages emitted by `branching-story-turn-cycle` extend the parent's `branch_path` by appending the new PG id.
- `input.choice_id: null`, `input.manual_action_text: null`, `input.resolved_event_id: SE-1`
  - This both-null input pair is lawful for PG-1 because `SE-1.event_kind: story_start`; per shared contract §4.2 input legality, later `turn_resolution` pages name exactly one player source action for player drivers, or use both-null input when a non-player `turn_driver.kind` drives `advance_initiative`.
- Full `state_snapshot` (active_records including the STCHAR, BEL, and STSTAT keys plus CLK / STSEC / STQ keys when optional seed records exist; `entity_status` derived from active `STSTAT` records, one entry per active `STENT`; visible_affordances with ordinal indices, where each entry's `grounded_in[]` accepts only `STLOC` and `STOBJ` ids per the shared contract's `$defs.PageAffordance.grounded_in.items.pattern` `^(STLOC|STOBJ)-[0-9]+$` — STENT actors go in `available_to`; STEMO / STPLAN / CLK / STSEC / STQ are interior or temporal state and belong in CHC grounding or page-plan §10b prose, not in `visible_affordances.grounded_in`; unresolved_mystery_claims; continuation status)
- `plan.plan_hash: <final sha256 computed per shared contract §4.2a after the page plan bytes are finalized>`
- `prose_plan_path: pages-prose-plans/PG-1.md` (canonical top-level plan address; see `mcp__worldloom__describe_envelope_schema(op_kind='create_pg_record')` for the current machine-readable op shape).
- `state_hash`: final sha256 computed per shared contract §4.2a after `plan.plan_hash` and `validation_trace` are finalized.
- `validation_trace`: populated in the validation phase
