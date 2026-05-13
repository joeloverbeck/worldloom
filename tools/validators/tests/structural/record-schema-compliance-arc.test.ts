import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

test("record_schema_compliance accepts v2 scene-commitment storylets", async () => {
  const result = await recordSchemaCompliance.run({}, context([storyletRecord(completeStorylet())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects v2 scene-commitment storylets missing structural arc blocks", async () => {
  for (const field of [
    "arc_contract",
    "dramatic_unit",
    "beat_plan",
    "execution_envelope",
    "stop_policy",
    "effect_model",
    "exit_portfolio"
  ] as const) {
    const parsed = completeStorylet();
    delete parsed[field];

    const result = await recordSchemaCompliance.run({}, context([storyletRecord(parsed)]));

    assert.ok(result.some((verdict) => (
      verdict.code === "record_schema_compliance.required" &&
      verdict.message.includes(`must have required property '${field}'`)
    )));
  }
});

test("record_schema_compliance accepts v2 scene-commitment choices with populated worthiness", async () => {
  const result = await recordSchemaCompliance.run({}, context([choiceRecord(completeChoice())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts explicit commitment route fields", async () => {
  const storylet = completeStorylet();
  (storylet.arc_contract as Record<string, unknown>).commitment_family = "care_help_protection";
  (storylet.arc_contract as Record<string, unknown>).commitment_detail = "repair_the_gate_without_pressure";
  const nativeSeed = ((storylet.exit_portfolio as Record<string, unknown>).native_seeds as Record<string, unknown>[])[0]!;
  nativeSeed.commitment_family = "inquiry_discovery";
  nativeSeed.commitment_detail = "ask_how_the_gate_broke";

  const choice = completeChoice();
  choice.commitment_family = "care_help_protection";
  choice.commitment_detail = "offer_gate_repair";

  const result = await recordSchemaCompliance.run({}, context([
    storyletRecord(storylet),
    choiceRecord(choice)
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects mismatched explicit commitment families", async () => {
  const storylet = completeStorylet();
  (storylet.arc_contract as Record<string, unknown>).commitment_family = "inquiry_discovery";
  const nativeSeed = ((storylet.exit_portfolio as Record<string, unknown>).native_seeds as Record<string, unknown>[])[0]!;
  nativeSeed.commitment_family = "care_help_protection";

  const choice = completeChoice();
  choice.commitment_family = "inquiry_discovery";

  const result = await recordSchemaCompliance.run({}, context([
    storyletRecord(storylet),
    choiceRecord(choice)
  ]));

  assert.equal(result.filter((verdict) => verdict.code === "record_schema_compliance.commitment_family_mismatch").length, 3);
});

test("record_schema_compliance rejects commitment classes outside the closed taxonomy", async () => {
  const choice = completeChoice();
  choice.commitment_class = "repair_the_gate_without_pressure";

  const result = await recordSchemaCompliance.run({}, context([choiceRecord(choice)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "CHC-0001" &&
    verdict.code === "record_schema_compliance.unknown_commitment_class"
  )));
});

test("record_schema_compliance rejects empty commitment detail when present", async () => {
  const choice = completeChoice();
  choice.commitment_detail = "";

  const result = await recordSchemaCompliance.run({}, context([choiceRecord(choice)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "CHC-0001" &&
    verdict.code === "record_schema_compliance.minLength" &&
    verdict.message.includes("/commitment_detail")
  )));
});

test("record_schema_compliance rejects scene-commitment choices with empty likely effects", async () => {
  const parsed = completeChoice();
  parsed.likely_effects = [];

  const result = await recordSchemaCompliance.run({}, context([choiceRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "CHC-0001" &&
    verdict.code === "record_schema_compliance.minItems" &&
    verdict.message.includes("/likely_effects")
  )));
});

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFixture("story-storylet-complete.yaml"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

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

function storyletRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "SLT-0001")) {
  return record("storylet_record", id, `stories/red-bunny/_source/storylets/${id}.yaml`, {
    ...parsed,
    id
  });
}

function choiceRecord(parsed: Record<string, unknown>, id = String(parsed.id ?? "CHC-0001")) {
  return record("choice_record", id, `stories/red-bunny/_source/choices/${id}.yaml`, {
    ...parsed,
    id
  });
}

function readFixture(filename: string): string {
  return readFileSync(path.resolve(process.cwd(), "tests", "fixtures", filename), "utf8");
}
