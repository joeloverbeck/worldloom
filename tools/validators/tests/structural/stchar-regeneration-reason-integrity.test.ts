import assert from "node:assert/strict";
import test from "node:test";

import type { PatchPlanEnvelope } from "../../src/framework/types.js";
import { stcharRegenerationReasonIntegrity } from "../../src/structural/stchar-regeneration-reason-integrity.js";
import { context, record } from "./helpers.js";

const STORY = "test-story";
const FILE_PATH = `stories/${STORY}/story-characters/STCHAR-2.md`;

test("stchar_regeneration_reason_integrity accepts durable branch transformation evidence", async () => {
  const verdicts = await run({
    regeneration_reason_class: "durable_branch_transformation",
    story_local_inputs_used: ["SE-9", "SREL-4", "STEMO-7"],
    validation_audit_anchors: "Durable branch transformation consolidated from SE-9, SREL-4, and STEMO-7."
  });

  assert.deepEqual(verdicts, []);
});

test("stchar_regeneration_reason_integrity accepts profile fidelity failure evidence", async () => {
  const verdicts = await run({
    regeneration_reason_class: "profile_fidelity_failure",
    story_local_inputs_used: ["PG-3"],
    validation_audit_anchors: "Profile fidelity failure documented by page-plan PG-3 and prose-receipt review."
  });

  assert.deepEqual(verdicts, []);
});

test("stchar_regeneration_reason_integrity accepts stable source material omission repair evidence", async () => {
  const verdicts = await run({
    regeneration_reason_class: "stable_source_material_omission_repair",
    story_local_inputs_used: ["PG-1"],
    validation_audit_anchors: "Stable Source Material Inventory shows omitted capability coverage failure."
  });

  assert.deepEqual(verdicts, []);
});

test("stchar_regeneration_reason_integrity rejects missing reason class", async () => {
  const verdicts = await run({ regeneration_reason_class: undefined });

  assert.equal(verdicts[0]?.code, "stchar_regeneration_reason_integrity.missing_or_invalid_reason_class");
});

test("stchar_regeneration_reason_integrity rejects null reason class with supersedes", async () => {
  const verdicts = await run({ regeneration_reason_class: null });

  assert.equal(verdicts[0]?.code, "stchar_regeneration_reason_integrity.missing_or_invalid_reason_class");
});

test("stchar_regeneration_reason_integrity rejects durable branch transformation without evidence", async () => {
  const verdicts = await run({
    regeneration_reason_class: "durable_branch_transformation",
    story_local_inputs_used: [],
    validation_audit_anchors: ""
  });

  assert.equal(
    verdicts[0]?.code,
    "stchar_regeneration_reason_integrity.durable_branch_transformation_missing_story_local_evidence"
  );
});

test("stchar_regeneration_reason_integrity rejects source-world reason without source_char_id", async () => {
  const verdicts = await run({
    regeneration_reason_class: "source_world_char_material_change",
    source_char_id: null,
    validation_audit_anchors: "Durable world CHAR material change."
  });

  assert.equal(
    verdicts[0]?.code,
    "stchar_regeneration_reason_integrity.source_world_char_material_change_missing_source_char_id"
  );
});

test("stchar_regeneration_reason_integrity rejects ordinary active-state-only evidence", async () => {
  const verdicts = await run({
    regeneration_reason_class: "durable_branch_transformation",
    story_local_inputs_used: ["STEMO-1", "BEL-2"],
    validation_audit_anchors: ""
  });

  assert.ok(verdicts.some((verdict) =>
    verdict.code === "stchar_regeneration_reason_integrity.ordinary_state_not_regeneration_reason"
  ));
});

test("stchar_regeneration_reason_integrity ignores non-regenerated STCHAR records", async () => {
  const stchar = stcharRecord({
    source_kind: "world_char",
    supersedes: null,
    regeneration_reason_class: null,
    story_local_inputs_used: []
  });
  const verdicts = await stcharRegenerationReasonIntegrity.run(undefined, context([stchar], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  }));

  assert.deepEqual(verdicts, []);
});

test("stchar_regeneration_reason_integrity runs for STCHAR pre-apply plans", async () => {
  assert.equal(stcharRegenerationReasonIntegrity.applies_to(context([], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  })), true);
});

async function run(overrides: Record<string, unknown>) {
  const stchar = stcharRecord(overrides);
  return stcharRegenerationReasonIntegrity.run(undefined, context([stchar], {
    run_mode: "pre-apply",
    patch_plan: stcharPatchPlan()
  }));
}

function stcharRecord(overrides: Record<string, unknown> = {}) {
  const parsed = {
    id: "STCHAR-2",
    story_id: "STORY-1",
    story_slug: STORY,
    world_slug: "test",
    source_kind: "regenerated",
    source_char_id: "CHAR-1",
    source_char_sections_used: ["Overview"],
    source_operational_fact_map: [],
    regeneration_reason_class: "durable_branch_transformation",
    story_local_inputs_used: ["SE-9"],
    generated_at_page: "PG-2",
    created_by_skill: "story-character-profile",
    supersedes: "STCHAR-1",
    superseded_by: null,
    status: "active",
    bound_stent_ids: ["STENT-1"],
    profile_revision: 2,
    body_schema_version: "stchar.v1",
    validation_audit_anchors: "Durable branch transformation evidence from SE-9.",
    ...overrides
  };

  for (const [key, value] of Object.entries(parsed)) {
    if (value === undefined) {
      delete (parsed as Record<string, unknown>)[key];
    }
  }

  return {
    ...record("story_character_authority_record", `${STORY}:STCHAR-2`, FILE_PATH, parsed),
    story_slug: STORY
  };
}

function stcharPatchPlan(): PatchPlanEnvelope {
  return {
    plan_id: "plan-stchar-regeneration-reason",
    target_world: "test",
    approval_token: "token",
    verdict: "ACCEPT",
    originating_skill: "test",
    expected_id_allocations: { stchar_ids: ["STCHAR-2"] },
    patches: [{
      op: "append_story_character_authority_record",
      target_world: "test",
      payload: {
        story_slug: STORY,
        record: { id: "STCHAR-2" },
        body_markdown: "## Profile\n\nBody."
      }
    }]
  } as PatchPlanEnvelope;
}
