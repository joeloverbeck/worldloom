import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/facts/SF-1.yaml";

test("record_schema_compliance accepts complete SF records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    storyFactRecord(validStoryFact())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts STCHAR in SF derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    storyFactRecord(validStoryFact({ derived_from: ["STCHAR-1", "BEL-1", "CF-1"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance still rejects unknown classes in SF derived_from", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    storyFactRecord(validStoryFact({ derived_from: ["NOPE-1"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.pattern" &&
    verdict.message.includes("/derived_from/0")
  ));
});

function storyFactRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_fact_record", "test-story:SF-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validStoryFact(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SF-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    statement: "Ane frames help as a probe-test rather than a simple favor.",
    authority: "branch_local",
    ...overrides
  };
}
