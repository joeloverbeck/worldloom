import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/entities/STENT-1.yaml";

test("record_schema_compliance accepts STENT role_in_story contract values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity({ role_in_story: ["viewpoint", "primary_actor"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance accepts background STENT with null STCHAR binding", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity({ bound_stchar_id: null, role_in_story: ["background"] }))
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects non-background STENT with null STCHAR binding", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(validEntity({ bound_stchar_id: null, role_in_story: ["witness"] }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.type" &&
    verdict.message.includes("/bound_stchar_id")
  ));
});

test("record_schema_compliance rejects retired STENT bound_char_id", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    entityRecord({
      ...validEntity(),
      bound_char_id: "CHAR-1"
    })
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.additionalProperties"
  ));
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

test("record_schema_compliance requires STENT role_in_story", async () => {
  const parsed = validEntity();
  delete parsed.role_in_story;

  const result = await recordSchemaCompliance.run({}, context([
    entityRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'role_in_story'")
  ));
});

function entityRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_entity_record", "test-story:STENT-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validEntity(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STENT-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    display_name: "Mara",
    bound_stchar_id: "STCHAR-1",
    role_in_story: ["primary_actor"],
    ...overrides
  };
}
