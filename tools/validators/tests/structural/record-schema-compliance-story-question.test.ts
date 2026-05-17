import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/story-questions/STQ-1.yaml";

test("record_schema_compliance accepts complete STQ records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    questionRecord(validQuestion())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STQ payoff links", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    questionRecord(validQuestion({ payoff_of: "STQ-1", status: "paid_off", answer_event: "SE-3", answer_records: ["SF-2"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects invalid STQ enum values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    questionRecord(validQuestion({ setup_kind: "moral_question", status: "solved" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/setup_kind")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/status")
  ));
  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.stq_prohibited_moral_question"
  ));
});

test("record_schema_compliance hard-rejects STQ prohibited fields", async () => {
  const prohibitedFields = [
    "expected_payoff_mode",
    "act_position",
    "midpoint",
    "climax",
    "dramatic_curve_position",
    "tension_arc",
    "expected_chapter",
    "scene_sequence",
    "holders"
  ];

  for (const field of prohibitedFields) {
    const result = await recordSchemaCompliance.run({}, context([
      questionRecord(validQuestion({ [field]: field === "holders" ? ["STENT-1"] : "bad" }))
    ]));

    assert.ok(
      result.some((verdict) => verdict.code === `record_schema_compliance.stq_prohibited_${field}`),
      `missing hard-reject verdict for ${field}`
    );
  }
});

test("record_schema_compliance rejects malformed STQ source records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    questionRecord(validQuestion({ source_records: ["M-1"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/source_records/0")
  ));
});

function questionRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_question_record", "test-story:STQ-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validQuestion(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STQ-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    setup_kind: "setup",
    question_or_setup: "The wax-sealed ledger remains unopened.",
    salience: "high",
    audience_visibility: "explicit",
    source_event: "SE-1",
    source_records: ["DA-1", "THR-1"],
    status: "open",
    answer_records: [],
    ...overrides
  };
}
