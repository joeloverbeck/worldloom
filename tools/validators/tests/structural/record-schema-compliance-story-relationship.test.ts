import assert from "node:assert/strict";
import test from "node:test";

import { RELATIONSHIP_AXES } from "../../src/rules/_shared/predicate-dsl-grammar.js";
import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/relationships/SREL-1.yaml";

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

test("record_schema_compliance accepts structured SREL direction variants", async () => {
  const cases: Record<string, unknown>[] = [
    {
      direction: {
        kind: "directed",
        from: "STENT-1",
        to: "STENT-2"
      }
    },
    {
      direction: {
        kind: "bidirectional",
        from: null,
        to: null
      }
    }
  ];

  for (const overrides of cases) {
    const result = await recordSchemaCompliance.run({}, context([
      relationshipRecord(validRelationship(overrides))
    ]));

    assert.deepEqual(result, [], JSON.stringify(overrides));
  }
});

test("record_schema_compliance rejects illegal structured SREL direction variants", async () => {
  const cases: Record<string, unknown>[] = [
    {
      direction: {
        kind: "directed",
        from: null,
        to: "STENT-2"
      }
    },
    {
      direction: {
        kind: "directed",
        from: "STENT-1",
        to: null
      }
    },
    {
      direction: {
        kind: "bidirectional",
        from: "STENT-1",
        to: null
      }
    },
    {
      direction: {
        kind: "bidirectional",
        from: null,
        to: "STENT-2"
      }
    }
  ];

  for (const overrides of cases) {
    const result = await recordSchemaCompliance.run({}, context([
      relationshipRecord(validRelationship(overrides))
    ]));

    assert.ok(
      result.some((verdict) =>
        verdict.code === "record_schema_compliance.type" &&
        verdict.message.includes("/direction")
      ),
      JSON.stringify({ overrides, result })
    );
  }
});

function relationshipRecord(parsed: Record<string, unknown>) {
  return {
    ...record("relationship_record_story", "test-story:SREL-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validRelationship(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "SREL-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    axis: "trust",
    participants: ["STENT-1", "STENT-2"],
    direction: {
      kind: "bidirectional",
      from: null,
      to: null
    },
    value: "medium",
    valence: "bidirectional",
    description: "They trust each other enough to act.",
    ...overrides
  };
}
