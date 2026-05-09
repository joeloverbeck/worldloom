import assert from "node:assert/strict";
import test from "node:test";

import { choiceWorthinessCompleteness } from "../../src/rules/choice_worthiness_completeness.js";
import { context, record } from "../structural/helpers.js";

test("choice_worthiness_completeness accepts populated scene-commitment choices", async () => {
  const result = await choiceWorthinessCompleteness.run({}, context([choiceRecord(completeChoice())]));

  assert.deepEqual(result, []);
});

test("choice_worthiness_completeness rejects empty likely effects", async () => {
  const parsed = completeChoice();
  parsed.likely_effects = [];

  const result = await choiceWorthinessCompleteness.run({}, context([choiceRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "choice_worthiness_completeness.empty_likely_effects"));
});

test("choice_worthiness_completeness rejects empty strong axes", async () => {
  const parsed = completeChoice();
  (parsed.choice_worthiness as Record<string, unknown>).strong_axes = [];

  const result = await choiceWorthinessCompleteness.run({}, context([choiceRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.code === "choice_worthiness_completeness.empty_field" &&
    verdict.message.includes("choice_worthiness.strong_axes")
  )));
});

test("choice_worthiness_completeness rejects non-canonical strong axes", async () => {
  const parsed = completeChoice();
  (parsed.choice_worthiness as Record<string, unknown>).strong_axes = ["mood"];

  const result = await choiceWorthinessCompleteness.run({}, context([choiceRecord(parsed)]));

  assert.ok(result.some((verdict) => verdict.code === "choice_worthiness_completeness.invalid_strong_axis"));
});

function completeChoice(): Record<string, unknown> {
  return {
    id: "CHC-0001",
    story_id: "STORY-001",
    record_version: 2,
    choice_kind: "scene_commitment",
    commitment_class: "offer_practical_help",
    strategy_cluster: "careful-help",
    choice_contract: {
      user_intent: "Offer practical help.",
      guaranteed_action: "The offer is made.",
      success_policy: "contested",
      allowed_outcome_band: ["partially_succeeds"],
      forbidden_outcomes: [],
      minimum_state_change: ["relationship_trajectory"]
    },
    likely_effects: [
      {
        type: "relationship_axis_shift",
        axis: "trust",
        direction: "increase_small"
      }
    ],
    continuation_capacity: {
      post_choice_delta: {},
      valid_seed_storylets: ["SLT-0001"],
      jit_shape_spec: null
    },
    choice_worthiness: {
      strategic_question_answered: "Can help be offered without pressure?",
      strong_axes: ["relationship_trajectory"],
      expected_state_delta: {
        relationship: { possible: ["trust increases"], magnitude: "small" }
      },
      why_not_microbeat: "The choice changes the relationship's pressure state.",
      foreseeable_difference: "Accepting help creates a distinct next arc."
    }
  };
}

function choiceRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "CHC-0001")) {
  return record("choice_record", id, `stories/red-bunny/_source/choices/${id}.yaml`, {
    ...parsed,
    id
  });
}
