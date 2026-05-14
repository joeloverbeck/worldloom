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

test("record_schema_compliance requires SREL axis", async () => {
  const parsed = validRelationship();
  delete parsed.axis;

  const result = await recordSchemaCompliance.run({}, context([
    relationshipRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'axis'")
  ));
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
    created_at_page: "PG-0001",
    axis: "trust",
    participants: ["STENT-0001", "STENT-0002"],
    direction: "bidirectional",
    value: "medium",
    valence: "bidirectional",
    description: "They trust each other enough to act.",
    ...overrides
  };
}
