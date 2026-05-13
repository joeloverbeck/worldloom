import assert from "node:assert/strict";
import test from "node:test";

import { RELATIONSHIP_AXES } from "../../src/rules/_shared/predicate-dsl-grammar.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/relationships/SREL-0001.yaml";

test("record_schema_compliance accepts every contract SREL axis value", async () => {
  for (const axis of RELATIONSHIP_AXES) {
    const result = await recordSchemaCompliance.run({}, context([
      relationshipRecord(validRelationship({ axis }))
    ]));

    assert.deepEqual(result, [], axis);
  }
});

test("record_schema_compliance rejects non-canonical SREL axis values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    relationshipRecord(validRelationship({ axis: "love" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/axis")
  ));
});

test("record_schema_compliance keeps SREL axis optional", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    relationshipRecord(validRelationship())
  ]));

  assert.deepEqual(result, []);
});

function relationshipRecord(parsed: Record<string, unknown>) {
  return {
    ...record("relationship_record_story", "test-story:SREL-0001", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validRelationship(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SREL-0001",
    story_id: "STORY-001",
    ...overrides
  };
}
