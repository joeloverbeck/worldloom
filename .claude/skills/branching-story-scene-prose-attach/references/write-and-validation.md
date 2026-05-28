# Write And Validation

Use this reference during Phases 6-7 of `branching-story-scene-prose-attach`.

## Receipt Shape

Write `scene-prose-receipts/SCN-<integer>.yaml` with the shared schema:

```yaml
scene_id: SCN-<integer>
story_id: STORY-<integer>
branch_id: BR-<integer>
plan_path: scene-prose-plans/SCN-<integer>.md
prose_path: scene-prose/SCN-<integer>.md
checked_at: <iso8601>
strict: true | false
verdict: PASS | WARN | FAIL
included_pages:
  - page_id: PG-<integer>
    state_hash_at_attach: <PG.state_hash>
checks:
  included_pg_events_rendered: PASS | WARN | FAIL
  final_scene_choice_surface_visibility: PASS | WARN | FAIL
  scene_range_entity_status_consistency: PASS | WARN | FAIL
  scene_range_invented_structural_fact: PASS | WARN | FAIL
  scene_range_forbidden_mystery_resolution: PASS | FAIL
  scene_prose_stchar_fidelity: PASS | WARN | FAIL
  engine_jargon_leak: PASS | WARN | FAIL
  canon_claim_without_authority: PASS | FAIL
notes: []
repair_recommendation: none | revise_scene_prose | revise_scene_plan | run_turn_cycle_repair | run_story_fact_promotion_to_canon
```

`included_pages[].state_hash_at_attach` is advisory freshness evidence copied from the committed PG records at attach time. It is not written back into PG or SCN.

## Write Order

After explicit approval:

1. Create `scene-prose-receipts/` if absent.
2. Write the receipt.
3. Update `INDEX.md` with scene prose status and receipt path.
4. Stop. Do not submit a patch plan and do not write any `_source` story record.

If the receipt write succeeds and the INDEX update fails, report a partial direct-write failure. Do not rewrite or mutate state records to compensate.

## Validation

Prefer the compiled validator CLI after `tools/validators` has been built:

```bash
node tools/validators/dist/src/cli/world-validate.js <world_slug> --structural --file worlds/<world_slug>/stories/<story_slug>/scene-prose-receipts/SCN-<integer>.yaml --json
```

Expected validator coverage:

- `scene_prose_receipt_schema_compliance`
- `scene_prose_receipt_content`

If validation reports FAIL, leave the receipt truthful and route the repair using `repair_recommendation`; do not mutate story state from this skill.

## No-state Audit

Before final handoff, inspect the write surface:

- receipt exists at `scene-prose-receipts/SCN-<integer>.yaml`
- `INDEX.md` contains the intended receipt/verdict marker
- no `_source/pages/`, `_source/scenes/`, `_source/events/`, or other story `_source/` file changed
- no patch plan was submitted
- no `SE` was emitted by default
