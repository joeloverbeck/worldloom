import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import yaml from "js-yaml";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

test("record_schema_compliance rejects legacy v2 scene-commitment storylets", async () => {
  const result = await recordSchemaCompliance.run({}, context([storyletRecord(completeStorylet())]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "SLT-0001" &&
    verdict.code === "record_schema_compliance.additionalProperties"
  )));
});

test("record_schema_compliance rejects legacy storylets before checking retired arc blocks", async () => {
  const parsed = completeStorylet();
  delete parsed.arc_contract;

  const result = await recordSchemaCompliance.run({}, context([storyletRecord(parsed)]));

  assert.ok(result.some((verdict) => (
    verdict.location.node_id === "SLT-0001" &&
    verdict.code === "record_schema_compliance.additionalProperties"
  )));
});

test("record_schema_compliance accepts contract-canonical choices without COMTAX fields", async () => {
  const result = await recordSchemaCompliance.run({}, context([choiceRecord(completeChoice())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts choices carrying legacy COMTAX overlay fields", async () => {
  const result = await recordSchemaCompliance.run({}, context([choiceRecord(legacyComtaxChoice())]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects choices missing universal required fields", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    rawChoiceRecord({ id: "CHC-0002", surface_label: "Wait" }, "CHC-0002"),
    rawChoiceRecord({ story_id: "STORY-1", surface_label: "Wait" }, "CHC-0003")
  ]));

  assert.equal(result.filter((verdict) => verdict.code === "record_schema_compliance.required").length, 2);
});

function completeStorylet(): Record<string, unknown> {
  return yaml.load(readFixture("story-storylet-complete.yaml"), { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
}

function completeChoice(): Record<string, unknown> {
  return {
    id: "CHC-1",
    story_id: "STORY-1",
    surface_label: "Offer careful help",
    player_visible_intent: "Approach without pressure and offer practical help.",
    target_or_action_family: "communicate",
    likely_state_pressure: "trust and obligation",
    associated_commitment_block: "SLT-1"
  };
}

function legacyComtaxChoice(): Record<string, unknown> {
  return {
    ...completeChoice(),
    record_version: 2,
    choice_kind: "scene_commitment",
    commitment_family: "care_help_protection",
    commitment_class: "offer_practical_help",
    commitment_detail: "offer_gate_repair",
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
  return rawChoiceRecord({ ...parsed, id }, id);
}

function rawChoiceRecord(parsed: Record<string, unknown>, id: string) {
  return record("choice_record", id, `stories/red-bunny/_source/choices/${id}.yaml`, {
    ...parsed
  });
}

function readFixture(filename: string): string {
  return readFileSync(path.resolve(process.cwd(), "tests", "fixtures", filename), "utf8");
}
