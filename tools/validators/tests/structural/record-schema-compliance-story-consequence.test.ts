import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/consequences/CNSQ-1.yaml";

test("record_schema_compliance accepts complete CNSQ records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    consequenceRecord(validConsequence())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STCHAR in CNSQ derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    consequenceRecord(validConsequence({ derived_from: ["STCHAR-1", "SE-1", "STPLAN-1"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance still rejects unknown classes in CNSQ derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    consequenceRecord(validConsequence({ derived_from: ["NOPE-1"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/derived_from/0")
  ));
});

function consequenceRecord(parsed: Record<string, unknown>) {
  return {
    ...record("consequence_record", "test-story:CNSQ-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validConsequence(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "CNSQ-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    status: "pending",
    consequence_kind: "social_pressure",
    description: "Ane's help creates a visible debt that changes the next approach.",
    urgency: "medium",
    resolves_when: "The debt is acknowledged, refused, or transformed by later action.",
    ...overrides
  };
}
