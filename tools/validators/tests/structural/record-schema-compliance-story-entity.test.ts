import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/entities/STENT-0001.yaml";

test("record_schema_compliance accepts STENT role_in_story contract values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity({ role_in_story: ["viewpoint", "primary_actor"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects non-canonical STENT role_in_story values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity({ role_in_story: ["protagonist"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/role_in_story/0")
  ));
});

test("record_schema_compliance keeps STENT role_in_story optional", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity())
  ]));

  assert.deepEqual(result, []);
});

function entityRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_entity_record", "test-story:STENT-0001", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STENT-0001",
    story_id: "STORY-001",
    ...overrides
  };
}
