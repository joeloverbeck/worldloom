# PEENH-008: Truth story-local DA patch-op contract for promotion closeout

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: Yes — skill-facing patch-plan guidance and focused `tools/world-mcp` validation coverage; no patch-engine source change required
**Deps**: None. `archive/tickets/PEENH-001.md` already landed the story-local DA op as `append_story_diegetic_artifact_record` with `expected_id_allocations.story_da_ids`; `archive/tickets/PEENH-007-add-create-bel-record-op-and-drop-create-arctrace-record.md` is only adjacent precedent for story-bundle op parity.

## Problem

At intake, the rebuilt story skills had a stale op-name contract for story-local `DA-NNNN.yaml` writes. `story-promotion-closeout` and `branching-story-bootstrap` referred to a nonexistent `create_da_record` operation for records under `worlds/<slug>/stories/<story-slug>/_source/artifacts/DA-NNNN.yaml`.

The live patch-engine contract already supports this write path, but under the existing operation name `append_story_diegetic_artifact_record`. Adding `create_da_record` would create a duplicate alias for the same story-local DA surface and would contradict the established operation vocabulary in `docs/FOUNDATIONS.md`, `tools/patch-engine/README.md`, and `archive/tickets/PEENH-001.md`.

## Assumption Reassessment (2026-05-13)

1. **Patch-engine op enumeration verified.** `tools/patch-engine/src/envelope/schema.ts` already includes `append_story_diegetic_artifact_record` and `expected_id_allocations.story_da_ids`; `create_da_record` is absent.
2. **Write implementation verified.** `tools/patch-engine/src/ops/create-story-record.ts` maps `append_story_diegetic_artifact_record` to `worlds/<world_slug>/stories/<story_slug>/_source/artifacts/DA-NNNN.yaml` with node type `story_diegetic_artifact_record`.
3. **Cross-artifact contract boundary.** The shared boundary is the patch-engine operation vocabulary consumed by `validate_patch_plan`, `describe_envelope_schema`, and story skills. The current authoritative DA operation is `append_story_diegetic_artifact_record`, not a new `create_da_record` alias.
4. **FOUNDATIONS principle.** `docs/FOUNDATIONS.md` §Story Bundles names story-bundle writes through ops such as `create_slt_record`, `create_pg_record`, and `append_story_diegetic_artifact_record`; it also preserves the distinction between story-local truth and world canon.
5. **HARD-GATE / validation-signal impact.** This ticket does not weaken HARD-GATE behavior. It removes stale caller prose that would assemble an unknown op and adds focused pre-apply validation coverage for the existing DA op.
6. **Schema extension impact.** No schema extension or alias operation was added. The existing `story-diegetic-artifact.schema.json` remains additive/open beyond required `id` and `story_id`, so closeout metadata such as `supersedes` and `linked_world_da` is accepted by the current schema.
7. **Mismatch correction.** The drafted ticket claimed `create_da_record` needed to be added. Live evidence shows the right fix is to update story-skill patch-plan guidance to use `append_story_diegetic_artifact_record` and prove `validatePatchPlan` accepts that operation.
8. **Adjacent contradictions.** `branching-story-bootstrap` had the same stale `create_da_record` op in its write phase. That is same-seam caller fallout and was corrected here. Other unrelated untracked story-skill/brainstorming work remains outside this ticket.

## Architecture Check

1. **No alias operation.** Reusing `append_story_diegetic_artifact_record` preserves the existing operation manifest, allocation key, schema-discovery surface, and PEENH-001 precedent.
2. **No backwards-compatibility shim.** `create_da_record` is not introduced as an alternate spelling.

## Verification Layers

1. **Story-local DA op applies to artifacts path** -> existing patch-engine op test in `tools/patch-engine/tests/ops/create-story-record.test.ts`.
2. **Validator dry-run coverage** -> new focused `tools/world-mcp` test proves `validatePatchPlan` accepts `append_story_diegetic_artifact_record` with `story_da_ids`.
3. **Skill caller contract** -> grep/manual review proves story-skill current write phases no longer mention `create_da_record`.

## Landed Changes

### 1. Corrected story-skill patch-plan guidance

`story-promotion-closeout` now instructs DA supersessions to use `append_story_diegetic_artifact_record` with `expected_id_allocations.story_da_ids`, and its known-debt note no longer claims a missing PEENH-008 engine op.

`branching-story-bootstrap` now uses the same story-local DA operation name for optional initial DA records.

### 2. Added focused validate-plan coverage

`tools/world-mcp/tests/tools/validate-patch-plan.test.ts` now includes a plan containing `append_story_diegetic_artifact_record`, a `DA-NNNN` story-local record payload, and `expected_id_allocations.story_da_ids`.

## Files to Touch

- `.claude/skills/story-promotion-closeout/SKILL.md` (modify — replace stale `create_da_record` guidance)
- `.claude/skills/branching-story-bootstrap/SKILL.md` (modify — replace stale optional DA op)
- `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` (modify — focused validation coverage)
- `tickets/PEENH-008-add-create-da-record-patch-op.md` (modify — truth closeout)

## Out of Scope

- Adding a `create_da_record` alias operation.
- Changing the existing patch-engine staging implementation for story-local DA records.
- Changing world-level DA hybrid-file writes through `append_diegetic_artifact_record`.
- Full executable dry-run of `story-promotion-closeout`; the skill has no standalone runner in this repo.

## Acceptance Criteria

### Tests That Must Pass

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js`
3. `cd tools/patch-engine && npm test`
4. `rg -n 'create_da_record' .claude/skills/story-promotion-closeout .claude/skills/branching-story-bootstrap` returns no matches.

### Invariants

1. Story-local DA records write only to `worlds/<world_slug>/stories/<story_slug>/_source/artifacts/DA-NNNN.yaml`.
2. Story-local DA allocation uses `expected_id_allocations.story_da_ids`, not world-level `da_ids`.
3. No duplicate `create_da_record` operation is added.

## Test Plan

### New/Modified Tests

1. `tools/world-mcp/tests/tools/validate-patch-plan.test.ts` — adds validate-plan coverage for `append_story_diegetic_artifact_record`.

### Commands

1. `cd tools/world-mcp && npm run build`
2. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js`
3. `cd tools/patch-engine && npm test`
4. `rg -n 'create_da_record' .claude/skills/story-promotion-closeout .claude/skills/branching-story-bootstrap`

## Outcome

Completed: 2026-05-13.

PEENH-008 landed as a contract-truthing fix rather than a new engine op. The live story-local DA patch operation remains `append_story_diegetic_artifact_record`; affected story skills now use that operation, and the world-mcp validate-plan test suite has focused coverage proving the operation dry-runs successfully.

## Verification Result

1. `cd tools/world-mcp && npm run build` — passed.
2. `cd tools/world-mcp && node --test dist/tests/tools/validate-patch-plan.test.js` — passed.
3. `cd tools/patch-engine && npm test` — passed.
4. `rg -n 'create_da_record' .claude/skills/story-promotion-closeout .claude/skills/branching-story-bootstrap` — no matches.
5. `git diff --check -- .claude/skills/story-promotion-closeout/SKILL.md .claude/skills/branching-story-bootstrap/SKILL.md tools/world-mcp/tests/tools/validate-patch-plan.test.ts tickets/PEENH-008-add-create-da-record-patch-op.md` — passed.

## Deviations

- The drafted implementation plan requested a new `create_da_record` operation. Reassessment rejected that as an alias because PEENH-001 already landed the story-local DA write path as `append_story_diegetic_artifact_record`.
- No full `story-promotion-closeout` dry-run was executed because prose skills in this repo do not have a standalone executable runner. The accepted proof is package-level validate-plan coverage plus skill-prose stale-anchor review.
