import assert from "node:assert/strict";
import test from "node:test";

import { nonPropagationTagShape } from "../../src/structural/non-propagation-tag-shape.js";
import { context, record } from "./helpers.js";

test("non_propagation_tag_shape accepts valid non-propagation tags", async () => {
  const verdicts = await nonPropagationTagShape.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale:
          "The witness group is covered by non_propagation:evidence_concealed(group=public, records=[BEL-12])."
      })
    ])
  );

  assert.deepEqual(verdicts, []);
});

test("non_propagation_tag_shape rejects legacy reason prose without a tag", async () => {
  const verdicts = await nonPropagationTagShape.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale: "The public group receives no update because evidence_concealed applies."
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "expected_witness_tag_missing"));
});

test("non_propagation_tag_shape warns on malformed non-propagation tags", async () => {
  const verdicts = await nonPropagationTagShape.run(
    undefined,
    context([
      storyEvent("SE-1", {
        world_logic_rationale: "The group is covered by non_propagation:evidence_concealed group=public)."
      })
    ])
  );

  assert.ok(verdicts.some((verdict) => verdict.code === "expected_witness_tag_malformed"));
  assert.ok(!verdicts.some((verdict) => verdict.code === "expected_witness_tag_missing"));
});

test("non_propagation_tag_shape is pre-apply scoped to create_se_record plans", () => {
  assert.equal(nonPropagationTagShape.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_pg_record") })), false);
  assert.equal(nonPropagationTagShape.applies_to(context([], { run_mode: "pre-apply", patch_plan: patchPlan("create_se_record") })), true);
});

function storyEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...record("story_event_record", `test-story:${id}`, `stories/test-story/_source/events/${id}.yaml`, {
      id,
      story_id: "STORY-1",
      created_at_page: "PG-1",
      parent_page_id: "PG-1",
      event_kind: "selected_choice",
      actor: "STENT-1",
      commitment: {
        selected_slt_id: "SLT-1",
        selection_source: "emitted_choice",
        alias_bindings: {}
      },
      outcome_route: "accept",
      world_logic_rationale: "The selected event follows from branch state.",
      state_delta: {
        create: [],
        supersede: [],
        close: []
      },
      promotion_claims: [],
      ...overrides
    }),
    story_slug: "test-story"
  };
}

function patchPlan(op: "create_pg_record" | "create_se_record") {
  return {
    plan_id: "plan-expected-witness",
    target_world: "test",
    approval_token: "placeholder",
    verdict: "story_audit",
    originating_skill: "test",
    expected_id_allocations: {},
    patches: [{ op, target_world: "test", payload: { story_slug: "test-story", record: { id: "SE-1" } } }]
  };
}
