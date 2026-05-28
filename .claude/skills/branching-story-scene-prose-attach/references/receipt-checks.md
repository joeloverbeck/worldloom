# Receipt Checks

Use this reference during Phase 3 of `branching-story-scene-prose-attach`.

All checks inspect the full `SCN.pg_ids` range. Do not collapse the scene to the end page except for final choice-surface checks.

## Required Checks

1. `included_pg_events_rendered` (`PASS | WARN | FAIL`)
   - PASS when every included PG's load-bearing committed event, consequence, and required beat is rendered or intentionally compressed without loss.
   - WARN when a load-bearing event is present but easy to miss.
   - FAIL when a PG's required event/effect is omitted or contradicted.
   - Cite the included PG ids and the scene prose passages or beat summaries used as evidence.

2. `final_scene_choice_surface_visibility` (`PASS | WARN | FAIL`)
   - PASS when the scene ending exposes exactly the choices from `SCN.emitted_choice_ids` / end `PG.emitted_choices`.
   - WARN when the choices are present but hard to recognize.
   - FAIL when choices are missing, extra, or contradicted.
   - Intermediate historical choices in the scene are allowed but must not read as currently playable.

3. `scene_range_entity_status_consistency` (`PASS | WARN | FAIL`)
   - Compare prose against included PG snapshots and active STSTAT/STLOC/STOBJ/STENT carriers.
   - FAIL hard contradictions such as dead characters acting, located actors appearing elsewhere without transition, or agency outside the Player Agency Contract.
   - WARN soft tension that may be repairable as prose nuance.

4. `scene_range_invented_structural_fact` (`PASS | WARN | FAIL`)
   - FAIL structural facts not grounded in included PGs, active story records, or scene-plan canon excerpts.
   - WARN decorative inventions or low-load-bearing details that should be reviewed.
   - Route load-bearing artifact inventions through `revise_scene_prose` or `run_turn_cycle_repair`; do not canonize them from this skill.

5. `scene_range_forbidden_mystery_resolution` (`PASS | FAIL`)
   - Preserve FOUNDATIONS Rule 7.
   - FAIL when prose resolves, cheapens, or directly names a forbidden Mystery Reserve item or a protected unknown included in the scene plan / retrieved firewall content.
   - Do not downgrade a forbidden-resolution hit to WARN.

6. `scene_prose_stchar_fidelity` (`PASS | WARN | FAIL`)
   - Compare viewpoint, speaker, major actor, emotionally salient, and behavior-shaping characters against active STCHAR/STENT authority packets.
   - PASS when the prose respects voice and behavior constraints.
   - WARN when a voice drift is mild or ambiguous.
   - FAIL when prose contradicts a required character packet or grants authority from world-level CHAR directly.

7. `engine_jargon_leak` (`PASS | WARN | FAIL`)
   - Scan rendered scene prose for record ids, schema fields, validator names, patch-engine terms, lifecycle terms, and raw state vocabulary.
   - WARN isolated low-impact slips only when the reader-facing prose remains natural.
   - FAIL pervasive or load-bearing engine language.

8. `canon_claim_without_authority` (`PASS | FAIL`)
   - FAIL when prose asserts world-canon authority absent from the included PGs, scene plan canon excerpts, or approved promotion evidence.
   - Route potential canon-worthy claims to `run_story_fact_promotion_to_canon`.

## Receipt Roll-up

- Any FAIL produces receipt `verdict: FAIL`.
- Otherwise any WARN produces `verdict: WARN`.
- Otherwise the receipt is `PASS`.

Every PASS in the deliverable summary needs a one-line rationale with a cited authority. A bare PASS is invalid.
