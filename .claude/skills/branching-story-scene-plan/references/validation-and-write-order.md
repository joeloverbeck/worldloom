# Validation And Write Order

Use this reference during Phases 5-7 of `branching-story-scene-plan`.

## Candidate Validation

Validate the exact `SCN` patch plan and the exact scene-plan bytes before approval. The live bundle path must remain untouched until the HARD-GATE is approved.

Required zero-FAIL validators:

- `record_schema_compliance`
- `scene_range_integrity`
- `scene_plan_structural`
- `scene_plan_verbatim_section_integrity`
- `scene_plan_body_engine_vocabulary_cleanliness`
- `scn_no_narrative_shape_language`

`scene_range_integrity` runs from the `SCN` patch plan and indexed page records. Scene-plan validators need the candidate markdown bytes under a logical path shaped as `stories/<story_slug>/scene-prose-plans/SCN-<integer>.md`.

If the MCP or CLI validate wrapper only accepts page-plan draft paths, use one of these safe alternatives:

1. Run the validator package directly from a small local probe that imports `@worldloom/validators` / `tools/validators/dist/src/public/index.js` and passes the candidate scene plan as an explicit file input with the logical `stories/<story_slug>/scene-prose-plans/SCN-<integer>.md` path.
2. Validate in a temporary copied world root where the candidate scene plan exists, then discard the copy.

Do not write the live bundle scene-plan path before approval just to make validation discover it.

## Approval Summary

The approval summary must include:

- SCN patch op kind
- SCN id and supersession target
- ordered `pg_ids`
- branch id
- previous scene id
- choice surface page and emitted choices
- `scene_descriptor`
- `boundary_rationale`
- scene-plan section preview
- validator results
- direct-write file list

The user must explicitly approve this summary. Invocation alone is not approval.

## Write Order

After approval:

1. Sign and submit the SCN patch plan.
2. Stop if the patch fails.
3. Create direct-write directories.
4. Write `scene-prose-plans/SCN-<integer>.md` using the validated bytes.
5. Update `INDEX.md`.
6. Run post-write validation over the live SCN and scene plan.

If the patch succeeds but the direct write fails, surface a partial-failure report. Do not resubmit the SCN patch.
