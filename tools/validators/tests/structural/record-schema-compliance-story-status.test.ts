import assert from "node:assert/strict";
import test from "node:test";

import { recordSchemaCompliance } from "../../src/structural/record-schema-compliance.js";
import { context, record } from "./helpers.js";

const FILE_PATH = "stories/test-story/_source/status/STSTAT-1.yaml";

test("record_schema_compliance accepts complete STSTAT records", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    statusRecord(validStatus())
  ]));

  assert.deepEqual(result, []);
});

test("record_schema_compliance rejects STSTAT records with unknown fields", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    statusRecord(validStatus({ display_name: "Mara" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.additionalProperties" &&
    verdict.message.includes("must NOT have additional properties")
  ));
});

test("record_schema_compliance requires STSTAT status fields", async () => {
  const parsed = validStatus();
  delete parsed.life;

  const result = await recordSchemaCompliance.run({}, context([
    statusRecord(parsed)
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.required" &&
    verdict.message.includes("'life'")
  ));
});

test("record_schema_compliance rejects invalid STSTAT enum values", async () => {
  const result = await recordSchemaCompliance.run({}, context([
    statusRecord(validStatus({ agency: "plot_locked" }))
  ]));

  assert.ok(result.some((verdict) =>
    verdict.code === "record_schema_compliance.enum" &&
    verdict.message.includes("/agency")
  ));
});

function statusRecord(parsed: Record<string, unknown>) {
  return {
    ...record("story_status_record", "test-story:STSTAT-1", FILE_PATH, parsed),
    story_slug: "test-story"
  };
}

function validStatus(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "STSTAT-1",
    story_id: "STORY-1",
    created_at_page: "PG-1",
    entity: "STENT-1",
    life: "alive",
    agency: "free",
    location: "STLOC-1",
    derived_from: ["SE-1"],
    ...overrides
  };
}
